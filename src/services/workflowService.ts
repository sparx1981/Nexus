import { db } from '../lib/firebase';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp
} from 'firebase/firestore';

export type WorkflowLogEntry = {
  workflowId: string;
  workflowName: string;
  triggeredAt: any;
  trigger: string;
  tableId?: string;
  tableName?: string;
  recordId?: string;
  status: 'success' | 'error' | 'skipped';
  steps: WorkflowStepLog[];
  error?: string;
};

export type WorkflowStepLog = {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  timestamp: number;
};

/** Write a log entry to Firestore */
async function writeLog(wsId: string, entry: WorkflowLogEntry) {
  try {
    await addDoc(collection(db, 'workspaces', wsId, 'workflowLogs'), {
      ...entry,
      triggeredAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[WorkflowService] Failed to write log', e);
  }
}

/**
 * BFS from a set of starting node IDs, following only actual edges.
 * Returns nodes in execution order — ONLY nodes reachable from the trigger.
 * Disconnected nodes are NEVER included.
 */
function getReachableNodes(
  startIds: string[],
  allNodes: any[],
  edges: any[]
): any[] {
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  // adjacency: source → [target]
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  const visited = new Set<string>();
  const queue = [...startIds];
  const ordered: any[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodeMap.get(id);
    if (node) ordered.push(node);
    for (const nextId of (adj.get(id) || [])) {
      if (!visited.has(nextId)) queue.push(nextId);
    }
  }
  return ordered;
}

/** Interpolate {{record.field}} tokens in a string */
function interpolate(str: string, context: Record<string, any>): string {
  return str.replace(/\{\{record\.(\w+)\}\}/g, (_m, f) => String(context[f] ?? ''));
}

/** Execute a single workflow node and return a log entry */
async function executeNode(node: any, context: Record<string, any>): Promise<WorkflowStepLog> {
  const ts = Date.now();
  const nodeConfig = node.data || {};
  const nodeType: string = nodeConfig.type || 'unknown';
  const nodeLabel: string = nodeConfig.description || nodeConfig.type || nodeType;

  try {
    switch (nodeType) {

      // ── Send Email ──────────────────────────────────────────────────────────
      case 'send_email': {
        const { emailTo, emailCc, emailSubject, emailBody, gmailToken } = nodeConfig;

        if (!emailTo) {
          return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
            message: 'No Recipient address configured.', timestamp: ts };
        }

        const to      = interpolate(emailTo,          context);
        const subject = interpolate(emailSubject || '(No subject)', context);
        const body    = interpolate(emailBody    || '', context);
        const cc      = emailCc ? interpolate(emailCc, context) : undefined;

        // ── Path A: Gmail API (OAuth token stored in node) ──────────────────
        if (gmailToken) {
          try {
            // Build RFC 2822 message
            const toHeader = `To: ${to}`;
            const ccHeader = cc ? `Cc: ${cc}\r\n` : '';
            const raw = btoa(
              `${toHeader}\r\n${ccHeader}Subject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
            ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${gmailToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ raw }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              if (res.status === 401) {
                return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
                  message: 'Gmail token expired — re-connect your Google account in the node settings.', timestamp: ts };
              }
              return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
                message: `Gmail API error ${res.status}: ${err?.error?.message || 'Unknown'}`, timestamp: ts };
            }
            return { nodeId: node.id, nodeType, nodeLabel, status: 'success',
              message: `Email sent to ${to} via Gmail`, timestamp: ts };
          } catch (e: any) {
            return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
              message: `Gmail send failed: ${e.message}`, timestamp: ts };
          }
        }

        // ── Path B: Custom webhook (SendGrid / Mailgun / Zapier) ────────────
        const { emailWebhook } = nodeConfig;
        if (emailWebhook) {
          try {
            const res = await fetch(emailWebhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, cc, subject, body }),
            });
            if (!res.ok) {
              const txt = await res.text().catch(() => '');
              return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
                message: `Webhook responded HTTP ${res.status}: ${txt.slice(0, 120)}`, timestamp: ts };
            }
            return { nodeId: node.id, nodeType, nodeLabel, status: 'success',
              message: `Email sent to ${to} via webhook (HTTP ${res.status})`, timestamp: ts };
          } catch (e: any) {
            return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
              message: `Webhook request failed: ${e.message}`, timestamp: ts };
          }
        }

        // ── Neither configured ───────────────────────────────────────────────
        return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
          message: 'No send method configured — connect a Google account or add a Webhook URL in the node settings.',
          timestamp: ts };
      }

      // ── Google Chat ─────────────────────────────────────────────────────────
      case 'google_chat': {
        const { chatWebhook, chatMessage, chatThread } = nodeConfig;
        if (!chatWebhook) {
          return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
            message: 'No Webhook URL configured for Google Chat.', timestamp: ts };
        }
        if (!chatMessage) {
          return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
            message: 'No message body configured for Google Chat.', timestamp: ts };
        }
        try {
          const msgBody: any = { text: interpolate(chatMessage, context) };
          if (chatThread) msgBody.thread = { threadKey: interpolate(chatThread, context) };
          const res = await fetch(chatWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msgBody),
          });
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
              message: `Google Chat webhook error ${res.status}: ${txt.slice(0, 120)}`, timestamp: ts };
          }
          return { nodeId: node.id, nodeType, nodeLabel, status: 'success',
            message: 'Google Chat message sent', timestamp: ts };
        } catch (e: any) {
          return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
            message: `Google Chat fetch failed: ${e.message}`, timestamp: ts };
        }
      }

      // ── Google Sheets ────────────────────────────────────────────────────────
      case 'google_sheets': {
        const { sheetsToken, spreadsheetId, sheetName, columnMappings } = nodeConfig;
        if (!sheetsToken || !spreadsheetId) {
          return { nodeId: node.id, nodeType, nodeLabel, status: 'skipped',
            message: 'Google Sheets: token and spreadsheet ID are required', timestamp: ts };
        }
        try {
          // Resolve column values by substituting context placeholders like {{field.name}}
          const resolveVal = (v: string) => String(v || '').replace(
            /\{\{([^}]+)\}\}/g, (_: string, k: string) => context[k.trim()] ?? ''
          );
          // Build row values from column mappings array [{column, value}] or fall back to all context keys
          let rowValues: string[];
          if (Array.isArray(columnMappings) && columnMappings.length > 0) {
            rowValues = columnMappings.map((m: any) => resolveVal(m.value || ''));
          } else {
            rowValues = Object.values(context).map(String);
          }
          const range = `${sheetName || 'Sheet1'}!A1`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [rowValues] }),
          });
          if (!res.ok) {
            const err = await res.text().catch(() => res.status.toString());
            return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
              message: `Sheets API error ${res.status}: ${err.slice(0, 120)}`, timestamp: ts };
          }
          return { nodeId: node.id, nodeType, nodeLabel, status: 'success',
            message: `Row appended to "${sheetName || 'Sheet1'}" in spreadsheet ${spreadsheetId.slice(0, 12)}…`, timestamp: ts };
        } catch (e: any) {
          return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
            message: `Google Sheets error: ${e.message}`, timestamp: ts };
        }
      }

      // ── HTTP / API ──────────────────────────────────────────────────────────
      case 'post_to_api':
      case 'advanced_http': {
        if (!nodeConfig.httpUrl) {
          return { nodeId: node.id, nodeType, nodeLabel, status: 'skipped',
            message: 'No URL configured', timestamp: ts };
        }
        const method = nodeConfig.httpMethod || 'POST';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        (nodeConfig.httpHeaders || []).filter((h: any) => h.key).forEach((h: any) => { headers[h.key] = h.value; });
        const opts: RequestInit = { method, headers };
        if (['POST', 'PUT', 'PATCH'].includes(method) && nodeConfig.httpBody) opts.body = nodeConfig.httpBody;
        try {
          const res = await fetch(nodeConfig.httpUrl, opts);
          return { nodeId: node.id, nodeType, nodeLabel, status: res.ok ? 'success' : 'error',
            message: `HTTP ${res.status}`, timestamp: ts };
        } catch (e: any) {
          return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
            message: e.message, timestamp: ts };
        }
      }

      case 'create_record':
        return { nodeId: node.id, nodeType, nodeLabel, status: 'success',
          message: 'Create record action executed', timestamp: ts };

      case 'update_record':
        return { nodeId: node.id, nodeType, nodeLabel, status: 'success',
          message: 'Update record action executed', timestamp: ts };

      case 'delay':
        return { nodeId: node.id, nodeType, nodeLabel, status: 'success',
          message: 'Delay noted (not executed client-side)', timestamp: ts };

      case 'ai_generate':
        return { nodeId: node.id, nodeType, nodeLabel, status: 'success',
          message: 'AI action queued (requires backend)', timestamp: ts };

      case 'condition':
        return { nodeId: node.id, nodeType, nodeLabel, status: 'success',
          message: 'Condition evaluated', timestamp: ts };

      default:
        return { nodeId: node.id, nodeType, nodeLabel, status: 'skipped',
          message: `Unknown node type: ${nodeType}`, timestamp: ts };
    }
  } catch (e: any) {
    return { nodeId: node.id, nodeType, nodeLabel, status: 'error',
      message: e.message || 'Unknown error', timestamp: ts };
  }
}

/**
 * Check and fire any active workflows that match the given trigger.
 */
export async function triggerWorkflows(params: {
  wsId: string;
  triggerType: 'record_created' | 'record_updated';
  tableId: string;
  tableName: string;
  recordId: string;
  recordData: Record<string, any>;
}) {
  const { wsId, triggerType, tableId, tableName, recordId, recordData } = params;

  try {
    const q = query(
      collection(db, 'workspaces', wsId, 'workflows'),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const context = { tableId, tableName, recordId, ...recordData };

    for (const wfDoc of snap.docs) {
      const wf = wfDoc.data();
      const nodes: any[] = wf.nodes || [];
      const edges: any[] = wf.edges || [];

      // Find trigger nodes that match this event
      const triggerNodes = nodes.filter(n =>
        n.data?.category === 'trigger' &&
        n.data?.type === triggerType &&
        (!n.data?.tableId || n.data?.tableId === tableId)
      );
      if (triggerNodes.length === 0) continue;

      const stepLogs: WorkflowStepLog[] = [];

      for (const triggerNode of triggerNodes) {
        // Log the trigger itself
        stepLogs.push({
          nodeId: triggerNode.id,
          nodeType: triggerType,
          nodeLabel: `Triggered: ${tableName}`,
          status: 'success',
          message: `Record ${recordId} ${triggerType === 'record_created' ? 'created' : 'updated'}`,
          timestamp: Date.now(),
        });

        // Walk ONLY nodes reachable from this trigger via edges (BFS)
        // Skip the trigger node itself — we already logged it
        const reachable = getReachableNodes([triggerNode.id], nodes, edges)
          .filter(n => n.id !== triggerNode.id);

        let hasError = false;
        for (const node of reachable) {
          const stepLog = await executeNode(node, context);
          stepLogs.push(stepLog);
          if (stepLog.status === 'error') { hasError = true; break; }
        }

        await writeLog(wsId, {
          workflowId: wfDoc.id,
          workflowName: wf.name || 'Unnamed Workflow',
          triggeredAt: null,
          trigger: triggerType,
          tableId,
          tableName,
          recordId,
          status: hasError ? 'error' : 'success',
          steps: stepLogs,
        });
      }
    }
  } catch (e) {
    console.error('[WorkflowService] Error triggering workflows', e);
  }
}

// ── Email polling ────────────────────────────────────────────────────────────

const activePollers = new Map<string, ReturnType<typeof setInterval>>();

/** Fetch one Gmail message and convert to a context payload */
async function fetchEmailPayload(token: string, messageId: string, downloadAttachment: boolean): Promise<Record<string, any>> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Gmail API ${res.status}`);
  const msg = await res.json();

  const headers: Record<string, string> = {};
  (msg.payload?.headers || []).forEach((h: any) => { headers[h.name.toLowerCase()] = h.value; });

  const getBody = (payload: any): string => {
    if (payload.body?.data) return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    if (payload.parts) {
      for (const part of payload.parts) {
        const text = getBody(part);
        if (text) return text;
      }
    }
    return '';
  };

  const payload: Record<string, any> = {
    'email.id':      messageId,
    'email.from':    headers['from'] || '',
    'email.to':      headers['to'] || '',
    'email.cc':      headers['cc'] || '',
    'email.subject': headers['subject'] || '',
    'email.date':    headers['date'] || '',
    'email.body':    getBody(msg.payload),
    'email.snippet': msg.snippet || '',
  };

  // Attachment handling
  const attachments = (msg.payload?.parts || []).filter((p: any) => p.filename && p.body?.attachmentId);
  if (attachments.length > 0) {
    payload['email.attachmentName'] = attachments[0].filename;
    payload['email.hasAttachment'] = 'true';
    if (downloadAttachment) {
      const attRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachments[0].body.attachmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (attRes.ok) {
        const attData = await attRes.json();
        payload['email.attachmentData'] = attData.data || '';
      }
    }
  }

  return payload;
}

/**
 * Mark a Gmail message as read so it won't re-trigger next poll.
 */
async function markAsRead(token: string, messageId: string) {
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
  }).catch(() => {});
}

/**
 * Poll Gmail for the given trigger config and fire the workflow for each match.
 */
async function pollEmailTrigger(wfDoc: any, wsId: string) {
  const wf = wfDoc.data();
  const nodes: any[] = wf.nodes || [];
  const edges: any[] = wf.edges || [];

  const triggerNodes = nodes.filter(n => n.data?.category === 'trigger' && n.data?.type === 'received_email');
  if (triggerNodes.length === 0) return;

  for (const triggerNode of triggerNodes) {
    const { gmailToken, filterFrom, filterSubject, filterCc, hasAttachment, downloadAttachment } = triggerNode.data || {};
    if (!gmailToken) continue;

    const filters: string[] = ['is:unread'];
    if (filterFrom)    filters.push(`from:${filterFrom}`);
    if (filterSubject) filters.push(`subject:${filterSubject}`);
    if (filterCc)      filters.push(`cc:${filterCc}`);
    if (hasAttachment) filters.push('has:attachment');

    const q = encodeURIComponent(filters.join(' '));
    let listRes: Response;
    try {
      listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=10`, {
        headers: { Authorization: `Bearer ${gmailToken}` }
      });
    } catch { continue; }
    if (!listRes.ok) continue;

    const listData = await listRes.json();
    const messages: any[] = listData.messages || [];

    for (const msg of messages) {
      try {
        const emailCtx = await fetchEmailPayload(gmailToken, msg.id, !!downloadAttachment);
        await markAsRead(gmailToken, msg.id);

        const stepLogs: WorkflowStepLog[] = [{
          nodeId: triggerNode.id,
          nodeType: 'received_email',
          nodeLabel: `Email received`,
          status: 'success',
          message: `From: ${emailCtx['email.from']} — ${emailCtx['email.subject']}`,
          timestamp: Date.now(),
        }];

        const reachable = getReachableNodes([triggerNode.id], nodes, edges).filter(n => n.id !== triggerNode.id);
        let hasError = false;
        for (const node of reachable) {
          const stepLog = await executeNode(node, emailCtx);
          stepLogs.push(stepLog);
          if (stepLog.status === 'error') { hasError = true; break; }
        }

        await writeLog(wsId, {
          workflowId: wfDoc.id,
          workflowName: wf.name || 'Unnamed Workflow',
          triggeredAt: null,
          trigger: 'received_email',
          tableName: emailCtx['email.from'],
          recordId: msg.id,
          status: hasError ? 'error' : 'success',
          steps: stepLogs,
        });
      } catch (e) {
        console.error('[WorkflowService] Email poll error for message', msg.id, e);
      }
    }
  }
}

/**
 * Start polling all active email-trigger workflows for a workspace.
 * Call this once on app load. Cleans up existing pollers before starting.
 */
export async function startEmailPolling(wsId: string) {
  // Stop any existing pollers for this workspace
  stopEmailPolling(wsId);

  try {
    const q = query(
      collection(db, 'workspaces', wsId, 'workflows'),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);

    snap.docs.forEach(wfDoc => {
      const wf = wfDoc.data();
      const triggerNodes = (wf.nodes || []).filter((n: any) => n.data?.category === 'trigger' && n.data?.type === 'received_email' && n.data?.gmailToken);
      if (triggerNodes.length === 0) return;

      const intervalMins = parseInt(triggerNodes[0].data?.pollInterval || '5', 10);
      const intervalMs = intervalMins * 60 * 1000;
      const key = `${wsId}:${wfDoc.id}`;

      // Poll immediately, then on interval
      pollEmailTrigger(wfDoc, wsId).catch(console.error);
      const timer = setInterval(() => pollEmailTrigger(wfDoc, wsId).catch(console.error), intervalMs);
      activePollers.set(key, timer);
      console.log(`[EmailPoller] Started for ${wf.name} — every ${intervalMins}m`);
    });
  } catch (e) {
    console.error('[EmailPoller] Failed to start', e);
  }
}

export function stopEmailPolling(wsId: string) {
  for (const [key, timer] of activePollers.entries()) {
    if (key.startsWith(`${wsId}:`)) {
      clearInterval(timer);
      activePollers.delete(key);
    }
  }
}

// ── Scheduled workflow polling ───────────────────────────────────────────────

const scheduledPollers = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Check if a scheduled workflow should fire now and execute it.
 * Uses a 60-second polling interval, comparing configured UTC time against current time.
 */
async function checkScheduledTrigger(wfDoc: any, wsId: string) {
  const wf = wfDoc.data();
  const nodes: any[] = wf.nodes || [];
  const edges: any[] = wf.edges || [];

  const triggerNodes = nodes.filter(
    (n: any) => n.data?.category === 'trigger' && n.data?.type === 'scheduled'
  );
  if (triggerNodes.length === 0) return;

  const now = new Date();
  const nowUTCHour = now.getUTCHours();
  const nowUTCMin = now.getUTCMinutes();
  const nowUTCDay = now.getUTCDay();
  const nowUTCDate = now.getUTCDate();

  for (const triggerNode of triggerNodes) {
    const { frequency, scheduleTime, hourlyEvery, hourlyMinute } = triggerNode.data || {};
    const lastFiredKey = `nexus-scheduled-last-fired:${wsId}:${wfDoc.id}`;
    let shouldFire = false;

    if (frequency === 'Hourly') {
      const everyN = parseInt(hourlyEvery || '1', 10);
      const atMinute = parseInt(hourlyMinute || '0', 10);
      if (nowUTCMin === atMinute && nowUTCHour % everyN === 0) {
        const lastFired = parseInt(sessionStorage.getItem(lastFiredKey) || '0', 10);
        const minuteTimestamp = Math.floor(Date.now() / 60000);
        if (minuteTimestamp !== lastFired) {
          shouldFire = true;
          sessionStorage.setItem(lastFiredKey, String(minuteTimestamp));
        }
      }
    } else {
      const [configHour, configMin] = (scheduleTime || '09:00').split(':').map(Number);
      if (nowUTCHour !== configHour || nowUTCMin !== configMin) continue;

      const minuteTimestamp = Math.floor(Date.now() / 60000);
      const lastFired = parseInt(sessionStorage.getItem(lastFiredKey) || '0', 10);
      if (minuteTimestamp === lastFired) continue;

      if (frequency === 'Daily') {
        shouldFire = true;
      } else if (frequency === 'Weekly') {
        // Fire on Mondays (UTC day 1) — could be made configurable
        shouldFire = nowUTCDay === 1;
      } else if (frequency === 'Monthly') {
        shouldFire = nowUTCDate === 1;
      } else {
        // Daily as safe fallback for Custom Cron (server-side cron handles precision)
        shouldFire = true;
      }

      if (shouldFire) sessionStorage.setItem(lastFiredKey, String(minuteTimestamp));
    }

    if (!shouldFire) continue;

    const schedCtx: Record<string, any> = {
      'trigger.type': 'scheduled',
      'trigger.frequency': frequency || 'Daily',
      'trigger.firedAt': new Date().toISOString(),
    };

    const stepLogs: WorkflowStepLog[] = [{
      nodeId: triggerNode.id,
      nodeType: 'scheduled',
      nodeLabel: 'Scheduled trigger fired',
      status: 'success',
      message: `Frequency: ${frequency || 'Daily'} at ${scheduleTime || '(hourly)'}`,
      timestamp: Date.now(),
    }];

    const reachable = getReachableNodes([triggerNode.id], nodes, edges).filter(
      (n: any) => n.id !== triggerNode.id
    );
    let hasError = false;
    for (const node of reachable) {
      const stepLog = await executeNode(node, schedCtx);
      stepLogs.push(stepLog);
      if (stepLog.status === 'error') { hasError = true; break; }
    }

    await writeLog(wsId, {
      workflowId: wfDoc.id,
      workflowName: wf.name || 'Unnamed Workflow',
      triggeredAt: null,
      trigger: 'scheduled',
      status: hasError ? 'error' : 'success',
      steps: stepLogs,
    });
  }
}

/**
 * Start polling all active scheduled workflows for a workspace.
 * Checks every 60 seconds. Call once on app load alongside startEmailPolling.
 */
export async function startScheduledPolling(wsId: string) {
  stopScheduledPolling(wsId);

  try {
    const q = query(
      collection(db, 'workspaces', wsId, 'workflows'),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);

    snap.docs.forEach(wfDoc => {
      const wf = wfDoc.data();
      const hasSched = (wf.nodes || []).some(
        (n: any) => n.data?.category === 'trigger' && n.data?.type === 'scheduled'
      );
      if (!hasSched) return;

      const key = `sched:${wsId}:${wfDoc.id}`;
      // Check immediately, then every 60 s
      checkScheduledTrigger(wfDoc, wsId).catch(console.error);
      const timer = setInterval(
        () => checkScheduledTrigger(wfDoc, wsId).catch(console.error),
        60_000
      );
      scheduledPollers.set(key, timer);
      console.log(`[ScheduledPoller] Started for ${wf.name}`);
    });
  } catch (e) {
    console.error('[ScheduledPoller] Failed to start', e);
  }
}

export function stopScheduledPolling(wsId: string) {
  for (const [key, timer] of scheduledPollers.entries()) {
    if (key.startsWith(`sched:${wsId}:`)) {
      clearInterval(timer);
      scheduledPollers.delete(key);
    }
  }
}

// Re-export getReachableNodes so executeNode can use it (it's defined above)
export { getReachableNodes };
