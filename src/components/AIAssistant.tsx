import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Cpu, Sparkles, User, Loader2, Database, Zap, Globe,
  CheckCircle2, XCircle, ChevronDown, ChevronRight, AlertTriangle,
  Table2, FolderPlus, Search, Clock, RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getNexusAssistantResponse, NexusAction, isApiKeyConfigured } from '../services/geminiService';
import { useSchemaStore } from '../store/schemaStore';
import { useAuthStore } from '../store/authStore';
import { useProjectSettingsStore } from '../store/projectSettingsStore';
import { db } from '../lib/firebase';
import {
  collection, query, orderBy, limit, getDocs,
  doc, setDoc, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { FieldType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: NexusAction;
  actionState?: 'pending' | 'confirmed' | 'cancelled' | 'executing' | 'done' | 'error';
  actionResult?: string;
  queryResults?: any[];
  isThinking?: boolean;
}

interface ProjectContext {
  schema: any[];
  applications: any[];
  workflows: any[];
  recentLogs: any[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fieldTypeFromString(t: string): FieldType {
  const map: Record<string, FieldType> = {
    text: FieldType.TEXT, long_text: FieldType.LONG_TEXT, number: FieldType.NUMBER,
    currency: FieldType.CURRENCY, date: FieldType.DATE, datetime: FieldType.DATE_TIME,
    boolean: FieldType.BOOLEAN, single_select: FieldType.SINGLE_SELECT,
    multi_select: FieldType.MULTI_SELECT, email: FieldType.EMAIL, phone: FieldType.PHONE,
    url: FieldType.URL, percentage: FieldType.PERCENTAGE,
  };
  return map[t] || FieldType.TEXT;
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function actionIcon(type: string) {
  if (type === 'create_table' || type === 'add_field') return <Database className="w-4 h-4" />;
  if (type === 'create_app') return <Globe className="w-4 h-4" />;
  if (type === 'create_workflow') return <Zap className="w-4 h-4" />;
  if (type === 'multi_action') return <FolderPlus className="w-4 h-4" />;
  if (type === 'query_data') return <Search className="w-4 h-4" />;
  return <Sparkles className="w-4 h-4" />;
}

function actionColour(type: string) {
  if (type === 'create_table' || type === 'add_field') return 'bg-blue-600';
  if (type === 'create_app') return 'bg-violet-600';
  if (type === 'create_workflow') return 'bg-amber-500';
  if (type === 'multi_action') return 'bg-primary-600';
  if (type === 'query_data') return 'bg-emerald-600';
  return 'bg-neutral-500';
}

// ── Action Plan Summary ───────────────────────────────────────────────────────

function ActionPlanCard({
  action,
  state,
  result,
  queryResults,
  onConfirm,
  onCancel,
}: {
  action: NexusAction;
  state: Message['actionState'];
  result?: string;
  queryResults?: any[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = state === 'pending';
  const isExecuting = state === 'executing';
  const isDone = state === 'done';
  const isError = state === 'error';
  const isCancelled = state === 'cancelled';

  if (action.type === 'query_data') return null; // Handled inline

  const stepList: { type: string; description: string }[] =
    action.type === 'multi_action'
      ? (action.payload?.steps || []).map((s: any) => ({ type: s.type, description: s.description }))
      : [{ type: action.type, description: action.description }];

  return (
    <div className={cn(
      "mt-2 rounded-2xl border overflow-hidden text-xs transition-all",
      isPending ? "border-primary-200 bg-primary-50/60 dark:bg-primary-950/20 dark:border-primary-900/40"
        : isDone ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/40"
        : isError ? "border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-900/40"
        : isCancelled ? "border-neutral-200 bg-neutral-50/60 dark:bg-neutral-900/30"
        : "border-neutral-200 bg-neutral-50/60"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={cn("p-1.5 rounded-lg text-white shrink-0", actionColour(action.type))}>
          {actionIcon(action.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-neutral-900 dark:text-white truncate">{action.description}</p>
          {action.type === 'multi_action' && (
            <p className="text-neutral-400 text-[10px]">{stepList.length} steps</p>
          )}
        </div>
        {(isPending || isExecuting) && (
          <button onClick={() => setExpanded(v => !v)} className="p-1 rounded-lg hover:bg-neutral-200/60 transition-colors shrink-0">
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
          </button>
        )}
        {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
        {isError && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
        {isCancelled && <XCircle className="w-4 h-4 text-neutral-400 shrink-0" />}
      </div>

      {/* Step list */}
      {expanded && stepList.length > 0 && (
        <div className="px-3 pb-2 space-y-1 border-t border-neutral-200/60 dark:border-neutral-800/60 pt-2">
          {stepList.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-slate-400">
              <span className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-slate-700 flex items-center justify-center font-black text-[9px] shrink-0">{i + 1}</span>
              <span className="font-medium">{s.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Result message */}
      {result && (
        <div className={cn("px-3 pb-2 pt-1 text-[11px] font-medium border-t border-neutral-200/60 dark:border-neutral-800/60",
          isDone ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
        )}>{result}</div>
      )}

      {/* Action buttons */}
      {isPending && (
        <div className="flex gap-2 px-3 pb-3 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors text-[11px]"
          >Confirm</button>
          <button
            onClick={onCancel}
            className="flex-1 py-1.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-neutral-700 dark:text-white font-bold rounded-xl transition-colors text-[11px]"
          >Cancel</button>
        </div>
      )}
      {isExecuting && (
        <div className="flex items-center gap-2 px-3 pb-3 pt-1 text-[11px] text-neutral-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Applying changes…
        </div>
      )}
    </div>
  );
}

// ── Query Results Card ────────────────────────────────────────────────────────

function QueryResultsCard({ results, description }: { results: any[]; description: string }) {
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? results : results.slice(0, 5);
  if (!results.length) return (
    <div className="mt-2 rounded-2xl border border-neutral-200 bg-neutral-50/60 dark:bg-neutral-900/30 px-3 py-2.5 text-xs text-neutral-500">
      No records found matching the query.
    </div>
  );
  const keys = Object.keys(results[0]).filter(k => k !== '_rowId' && k !== '_id').slice(0, 5);
  return (
    <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40 overflow-hidden text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-200/60 dark:border-emerald-900/40">
        <Table2 className="w-3.5 h-3.5 text-emerald-600" />
        <span className="font-bold text-emerald-800 dark:text-emerald-300">{results.length} record{results.length !== 1 ? 's' : ''} found</span>
        <span className="text-emerald-600/70 dark:text-emerald-500 text-[10px] ml-1">— {description}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead><tr className="bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
            {keys.map(k => <th key={k} className="px-2 py-1 text-left font-black uppercase tracking-wider">{k}</th>)}
          </tr></thead>
          <tbody>{display.map((row, i) => (
            <tr key={i} className="border-t border-emerald-100/60 dark:border-emerald-900/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
              {keys.map(k => <td key={k} className="px-2 py-1 text-neutral-700 dark:text-slate-300 max-w-[120px] truncate">{String(row[k] ?? '')}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {results.length > 5 && (
        <button onClick={() => setShowAll(v => !v)} className="w-full py-1.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100/40 dark:hover:bg-emerald-950/30 transition-colors">
          {showAll ? 'Show less' : `Show all ${results.length} records`}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export const AIAssistant = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Hello! I'm Nexus AI Assist. I can query your data, inspect your apps and workflows, and build new tables, applications, and automations for you. What would you like to do?"
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryState, setRetryState] = useState<{ attempt: number; countdown: number; total: number } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('Thinking…');
  const [pendingRetryMessage, setPendingRetryMessage] = useState<string | null>(null);
  const [context, setContext] = useState<ProjectContext>({ schema: [], applications: [], workflows: [], recentLogs: [] });
  const [contextReady, setContextReady] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Countdown ticker for rate-limit retry display
  useEffect(() => {
    if (!retryState || retryState.countdown <= 0) return;
    const t = setTimeout(() => {
      setRetryState(prev => prev ? { ...prev, countdown: prev.countdown - 1 } : null);
    }, 1000);
    return () => clearTimeout(t);
  }, [retryState]);

  const tables = useSchemaStore(state => state.tables);
  const { addTable, addField } = useSchemaStore();
  const selectedProjectId = useAuthStore(state => state.selectedProjectId);
  const { setSettings: setProjectSettings } = useProjectSettingsStore();

  // ── Load live project context from Firestore ──────────────────────────────

  useEffect(() => {
    if (!selectedProjectId) return;
    let ready = { apps: false, wf: false, logs: false };

    const checkReady = () => {
      if (ready.apps && ready.wf && ready.logs) setContextReady(true);
    };

    const appsUnsub = onSnapshot(
      query(collection(db, 'workspaces', selectedProjectId, 'apps')),
      snap => {
        const apps = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            description: data.description,
            dataSourceId: data.dataSourceId,
            mode: data.mode,
            afterAction: data.afterAction,
            afterActionAppId: data.afterActionAppId,
            keyFields: data.keyFields,
            componentTypes: (data.components || []).map((c: any) => ({ type: c.type, label: c.label, fieldMapping: c.properties?.fieldMapping }))
          };
        });
        setContext(prev => ({ ...prev, applications: apps }));
        ready.apps = true;
        checkReady();
      }
    );

    const wfUnsub = onSnapshot(
      query(collection(db, 'workspaces', selectedProjectId, 'workflows')),
      snap => {
        const wfs = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            status: data.status,
            triggerType: data.nodes?.find((n: any) => n.data?.category === 'trigger')?.data?.type,
            triggerDescription: data.nodes?.find((n: any) => n.data?.category === 'trigger')?.data?.description,
            actionCount: (data.nodes || []).filter((n: any) => n.data?.category === 'action').length,
          };
        });
        setContext(prev => ({ ...prev, workflows: wfs }));
        ready.wf = true;
        checkReady();
      }
    );

    const logsUnsub = onSnapshot(
      query(collection(db, 'workspaces', selectedProjectId, 'workflowLogs'), orderBy('triggeredAt', 'desc'), limit(30)),
      snap => {
        const logs = snap.docs.map(d => {
          const data = d.data();
          return {
            workflowName: data.workflowName,
            status: data.status,
            trigger: data.trigger,
            triggeredAt: data.triggeredAt?.toDate?.()?.toISOString?.() ?? 'unknown',
            error: data.error,
            stepCount: (data.steps || []).length,
            steps: (data.steps || []).map((s: any) => ({ label: s.nodeLabel, status: s.status, message: s.message }))
          };
        });
        setContext(prev => ({ ...prev, recentLogs: logs }));
        ready.logs = true;
        checkReady();
      }
    );

    return () => { appsUnsub(); wfUnsub(); logsUnsub(); };
  }, [selectedProjectId]);

  // Update schema portion of context whenever tables change
  useEffect(() => {
    setContext(prev => ({
      ...prev,
      schema: tables.map(t => ({
        id: t.id,
        name: t.name,
        fieldCount: t.fields.length,
        fields: t.fields.map(f => ({ id: f.id, name: f.name, type: f.type, options: f.options }))
      }))
    }));
  }, [tables]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // ── Firestore Executors ───────────────────────────────────────────────────

  const queryTableData = useCallback(async (payload: any): Promise<any[]> => {
    if (!selectedProjectId) return [];
    const { tableId, limit: lim = 50, orderByField, orderDirection } = payload;
    let q: any = collection(db, 'workspaces', selectedProjectId, 'tableData', tableId, 'rows');
    try {
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection === 'asc' ? 'asc' : 'desc'), limit(lim));
      } else {
        q = query(q, limit(lim));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ _rowId: d.id, ...d.data() }));
    } catch {
      // Retry without orderBy if index error
      const snap = await getDocs(query(collection(db, 'workspaces', selectedProjectId, 'tableData', tableId, 'rows'), limit(lim)));
      return snap.docs.map(d => ({ _rowId: d.id, ...d.data() }));
    }
  }, [selectedProjectId]);

  const executeCreateTable = useCallback(async (payload: any) => {
    const tableId = generateId('tbl');
    const fields = (payload.fields || []).map((f: any, idx: number) => ({
      id: generateId('fld'),
      name: f.name,
      type: fieldTypeFromString(f.type),
      required: f.required || false,
      ...(f.options ? { options: f.options } : {}),
    }));
    await addTable({ id: tableId, name: payload.name, description: payload.description || '', fields, type: 'internal' });
    return `Table "${payload.name}" created with ${fields.length} field${fields.length !== 1 ? 's' : ''}.`;
  }, [addTable]);

  const executeAddField = useCallback(async (payload: any) => {
    const { tableId, field } = payload;
    const newField = {
      id: generateId('fld'),
      name: field.name,
      type: fieldTypeFromString(field.type),
      required: field.required || false,
      ...(field.options ? { options: field.options } : {}),
    };
    await addField(tableId, newField);
    return `Field "${field.name}" added to "${payload.tableName}".`;
  }, [addField]);

  const executeCreateApp = useCallback(async (payload: any) => {
    if (!selectedProjectId) throw new Error('No project selected');
    const appId = (payload.name || 'app').toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
    const components = (payload.components || []).map((c: any, idx: number) => ({
      id: generateId('cmp'),
      type: c.type || 'input',
      label: c.label || '',
      position: { x: 32, y: 32 + idx * 80 },
      size: { width: c.width || 320, height: c.height || 48 },
      properties: {
        label: c.label || '',
        fieldMapping: c.fieldMapping || '',
        ...(c.type === 'select' && c.options ? { options: c.options } : {}),
      },
      parentId: null,
      slotKey: null,
    }));
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', appId), {
      id: appId,
      name: payload.name,
      description: payload.description || '',
      dataSourceId: payload.dataSourceId || '',
      mode: payload.mode || 'add',
      keyFields: payload.keyFields || [],
      components,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return `Application "${payload.name}" created.`;
  }, [selectedProjectId]);

  const executeCreateWorkflow = useCallback(async (payload: any) => {
    if (!selectedProjectId) throw new Error('No project selected');
    const triggerId = 'node_trigger';
    const nodes: any[] = [
      {
        id: triggerId,
        type: 'workflow',
        position: { x: 250, y: 50 },
        data: {
          category: 'trigger',
          type: payload.triggerType || 'record_created',
          description: payload.triggerDescription || '',
          ...(payload.triggerTableId ? { tableId: payload.triggerTableId } : {}),
        },
      },
    ];
    const edges: any[] = [];
    (payload.actions || []).forEach((action: any, idx: number) => {
      const nodeId = `node_action_${idx}`;
      nodes.push({
        id: nodeId,
        type: 'workflow',
        position: { x: 250, y: 200 + idx * 180 },
        data: {
          category: 'action',
          type: action.type || 'send_email',
          description: action.label || '',
          ...(action.config || {}),
        },
      });
      edges.push({
        id: `edge_${idx}`,
        source: idx === 0 ? triggerId : `node_action_${idx - 1}`,
        target: nodeId,
        type: 'smoothstep',
      });
    });
    const wfId = generateId('wf');
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', wfId), {
      id: wfId,
      name: payload.name,
      status: 'draft',
      nodes,
      edges,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return `Workflow "${payload.name}" created in draft mode. Activate it in the Workflows tab to enable it.`;
  }, [selectedProjectId]);

  const executeMultiAction = useCallback(async (
    payload: any,
    onProgress: (msg: string) => void
  ): Promise<string> => {
    const steps: any[] = payload.steps || [];
    const results: string[] = [];
    // Track table ID remapping (AI uses placeholder names, we need real IDs)
    const tableNameToId: Record<string, string> = {};
    // Seed with existing tables
    tables.forEach(t => { tableNameToId[t.name.toLowerCase()] = t.id; });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      onProgress(`Step ${i + 1}/${steps.length}: ${step.description}…`);
      try {
        let result = '';
        if (step.type === 'create_table') {
          // Create table and record the new ID
          const tableId = generateId('tbl');
          const fields = (step.payload.fields || []).map((f: any) => ({
            id: generateId('fld'),
            name: f.name,
            type: fieldTypeFromString(f.type),
            required: f.required || false,
            ...(f.options ? { options: f.options } : {}),
          }));
          await addTable({ id: tableId, name: step.payload.name, description: step.payload.description || '', fields, type: 'internal' });
          tableNameToId[step.payload.name.toLowerCase()] = tableId;
          result = `✓ Table "${step.payload.name}"`;
        } else if (step.type === 'create_app') {
          // Resolve dataSourceId — try explicit name first, then infer from app name
          const p = { ...step.payload };
          if (p.dataSourceId && tableNameToId[p.dataSourceId.toLowerCase()]) {
            // AI provided a table name / ID — resolve it
            p.dataSourceId = tableNameToId[p.dataSourceId.toLowerCase()];
          } else if (!p.dataSourceId) {
            // dataSourceId is empty — infer table from app name
            // e.g. "Lessons App" → try "lessons", "Bookings Manager" → try "bookings"
            const appNameLower = (p.name || '').toLowerCase();
            const inferredTable = Object.keys(tableNameToId).find(tableName =>
              appNameLower.includes(tableName) || tableName.includes(appNameLower.replace(/\s*(app|manager|view|form)$/i, '').trim())
            );
            if (inferredTable) p.dataSourceId = tableNameToId[inferredTable];
          }
          result = `✓ ${await executeCreateApp(p)}`;
        } else if (step.type === 'set_project_settings') {
          // Apply colour theme and other visual settings from the AI
          try {
            await setProjectSettings(step.payload || {});
            result = `✓ Project theme applied`;
          } catch (e: any) {
            result = `✗ Theme: ${e.message}`;
          }
        } else if (step.type === 'create_workflow') {
          const p = { ...step.payload };
          if (p.triggerTableId && tableNameToId[p.triggerTableId.toLowerCase()]) {
            p.triggerTableId = tableNameToId[p.triggerTableId.toLowerCase()];
          }
          result = `✓ ${await executeCreateWorkflow(p)}`;
        }
        results.push(result);
      } catch (e: any) {
        results.push(`✗ Step ${i + 1} failed: ${e.message}`);
      }
    }
    return results.join('\n');
  }, [tables, addTable, executeCreateApp, executeCreateWorkflow]);

  // ── Message handling ──────────────────────────────────────────────────────

  const buildFullContext = useCallback(() => ({
    ...context,
    schema: tables.map(t => ({
      id: t.id,
      name: t.name,
      fields: t.fields.map(f => ({ id: f.id, name: f.name, type: f.type, options: f.options }))
    }))
  }), [context, tables]);

  const addAssistantMessage = (msg: Partial<Message>) => {
    setMessages(prev => [...prev, { role: 'assistant', content: '', ...msg }]);
  };

  const updateLastMessage = (updates: Partial<Message>) => {
    setMessages(prev => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], ...updates };
      return next;
    });
  };

  const updateMessageAt = (index: number, updates: Partial<Message>) => {
    setMessages(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', content: input.trim() };

    // ── Auto-confirm: if user types a yes/go-ahead phrase and there's a pending action ──
    const confirmPhrases = /^(yes|yeah|go ahead|confirm|ok|okay|do it|build it|create it|sure|please do|make them|build these|create them|yes please|yep|absolutely|proceed)\b/i;
    const lastPendingIdx = [...messages].reverse().findIndex(m => m.actionState === 'pending');
    const pendingIdx = lastPendingIdx !== -1 ? messages.length - 1 - lastPendingIdx : -1;
    if (pendingIdx !== -1 && confirmPhrases.test(input.trim())) {
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      handleConfirm(pendingIdx);
      return;
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setRetryState(null);
    setLoadingStatus('Thinking…');
    setPendingRetryMessage(null);

    // Build conversation history for AI (text only, no UI state)
    const historyForAI = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.role === 'assistant' ? m.content : m.content
    }));

    const handleRetryCallback = (attempt: number, delayMs: number) => {
      const secs = Math.round(delayMs / 1000);
      setLoadingStatus(`Rate limit hit — retrying in ${secs}s (attempt ${attempt} of 4)…`);
      setRetryState({ attempt, countdown: secs, total: secs });
    };

    try {
      const response = await getNexusAssistantResponse(historyForAI, buildFullContext(), handleRetryCallback);
      setRetryState(null);
      setLoadingStatus('Thinking…');

      // If AI wants to query data, execute the query and call AI again with results
      if (response.action?.type === 'query_data') {
        const qPayload = response.action.payload;
        addAssistantMessage({ content: response.message, isThinking: true });
        let rows: any[] = [];
        try {
          rows = await queryTableData(qPayload);
        } catch (e: any) {
          rows = [];
        }
        updateLastMessage({ isThinking: false });

        // Feed results back to AI for a natural language summary
        const resultsContext = {
          ...buildFullContext(),
          queryResults: {
            table: qPayload.tableName,
            description: qPayload.description,
            count: rows.length,
            records: rows.slice(0, 20)
          }
        };
        const summaryHistory = [
          ...historyForAI,
          { role: 'assistant' as const, content: response.message },
          { role: 'user' as const, content: `Here are the query results (${rows.length} records from "${qPayload.tableName}"): ${JSON.stringify(rows.slice(0, 20))}. Please summarise this for the user in plain English based on their original question.` }
        ];
        const summaryResponse = await getNexusAssistantResponse(summaryHistory, resultsContext);
        updateLastMessage({
          content: summaryResponse.message || response.message,
          isThinking: false,
          queryResults: rows,
          action: response.action,
        });
      } else if (response.action && response.action.type !== 'none') {
        // Write action — show confirmation
        addAssistantMessage({
          content: response.message,
          action: response.action,
          actionState: 'pending',
        });
      } else {
        // Plain text response
        addAssistantMessage({ content: response.message });
      }
    } catch (e: any) {
      setRetryState(null);
      setLoadingStatus('Thinking…');
      if (e.message === 'RATE_LIMIT') {
        // Store the message text so the user can retry with one click
        setPendingRetryMessage(userMessage.content);
        addAssistantMessage({
          content: "The AI service is currently busy and couldn't respond after several retries. Your message has been saved — tap **Retry** below to try again, or wait a moment and re-send.",
          isRateLimit: true,
        } as any);
      } else if (e.message === 'NO_API_KEY') {
        addAssistantMessage({
          content: "⚠️ No Gemini API key is configured. Add `VITE_GEMINI_API_KEY=your_key` to your `.env` file, then restart the dev server. You can get a free key at [aistudio.google.com](https://aistudio.google.com).",
        });
      } else {
        addAssistantMessage({ content: `Something went wrong: ${e.message}` });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg?.action) return;
    updateMessageAt(msgIndex, { actionState: 'executing' });

    try {
      let result = '';
      if (msg.action.type === 'create_table') {
        result = await executeCreateTable(msg.action.payload);
      } else if (msg.action.type === 'add_field') {
        result = await executeAddField(msg.action.payload);
      } else if (msg.action.type === 'create_app') {
        result = await executeCreateApp(msg.action.payload);
      } else if (msg.action.type === 'create_workflow') {
        result = await executeCreateWorkflow(msg.action.payload);
      } else if (msg.action.type === 'multi_action') {
        result = await executeMultiAction(
          msg.action.payload,
          (progressMsg) => updateMessageAt(msgIndex, { actionState: 'executing', actionResult: progressMsg })
        );
      }
      updateMessageAt(msgIndex, { actionState: 'done', actionResult: result });

      // Add a follow-up assistant message
      setTimeout(() => {
        // If tables were created (create_table or multi_action with table steps), suggest creating apps
        const createdTables = msg.action.type === 'create_table'
          || (msg.action.type === 'multi_action' && (msg.action.payload?.steps || []).some((s: any) => s.type === 'create_table')
              && !(msg.action.payload?.steps || []).some((s: any) => s.type === 'create_app'));

        if (createdTables) {
          addAssistantMessage({
            content: `Done! ${result}\n\nWould you like me to create applications for these tables? I can build add, update, and view interfaces linked to each table automatically.`,
            action: {
              type: 'multi_action',
              description: 'Create applications for the newly created tables',
              payload: {
                projectSummary: 'Create apps for new tables',
                steps: (msg.action.type === 'create_table'
                  ? [msg.action.payload]
                  : (msg.action.payload?.steps || []).filter((s: any) => s.type === 'create_table').map((s: any) => s.payload)
                ).map((tbl: any) => ({
                  type: 'create_app',
                  description: `App for ${tbl.name || 'table'}`,
                  payload: {
                    name: `${tbl.name || 'Table'} App`,
                    description: `Manage ${tbl.name || 'records'}`,
                    dataSourceId: tbl.name || '',
                    mode: 'add',
                    components: (tbl.fields || []).slice(0, 6).map((f: any) => ({
                      type: ['single_select', 'multi_select', 'boolean'].includes(f.type) ? 'select' : 'input',
                      label: f.name,
                      fieldMapping: f.name,
                      width: 320,
                      height: 48,
                    })),
                  }
                }))
              }
            },
            actionState: 'pending',
          });
        } else {
          addAssistantMessage({ content: `Done! ${result} What else can I help you with?` });
        }
      }, 300);
    } catch (e: any) {
      updateMessageAt(msgIndex, { actionState: 'error', actionResult: e.message });
    }
  };

  const handleCancel = (msgIndex: number) => {
    updateMessageAt(msgIndex, { actionState: 'cancelled' });
    setTimeout(() => {
      addAssistantMessage({ content: "No problem — the changes were not applied. Let me know if you'd like to try something different." });
    }, 200);
  };

  if (!isOpen) return null;

  // ── Suggested prompts ─────────────────────────────────────────────────────

  const hasContent = messages.length > 1;
  const suggestions = [
    { icon: <Clock className="w-3 h-3" />, text: "When did my last workflow run?" },
    { icon: <Search className="w-3 h-3" />, text: "How many records are in my database?" },
    { icon: <Database className="w-3 h-3" />, text: "Are all workflows running correctly?" },
    { icon: <Globe className="w-3 h-3" />, text: "Which apps use which tables?" },
  ];

  return (
    <div className={cn(
      "fixed top-14 right-0 bottom-0 w-[340px] flex flex-col z-40 transition-all duration-300",
      "bg-white dark:bg-[#0D1117] border-l border-neutral-200 dark:border-slate-800 shadow-2xl"
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-[#0D1117] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shadow-md shadow-primary-200/40">
            <Cpu className="text-white w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-neutral-900 dark:text-white text-sm leading-none">Nexus AI Assist</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", contextReady ? "bg-emerald-500 animate-pulse" : "bg-amber-400")} />
              <span className="text-[10px] text-neutral-400 font-medium">{contextReady ? 'Project loaded' : 'Loading context…'}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      {/* Context stats bar */}
      {contextReady && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-neutral-50 dark:bg-slate-900/50 border-b border-neutral-100 dark:border-slate-800 shrink-0">
          {[
            { icon: <Database className="w-2.5 h-2.5" />, val: context.schema.length, label: 'tables' },
            { icon: <Globe className="w-2.5 h-2.5" />, val: context.applications.length, label: 'apps' },
            { icon: <Zap className="w-2.5 h-2.5" />, val: context.workflows.length, label: 'workflows' },
          ].map(({ icon, val, label }) => (
            <div key={label} className="flex items-center gap-1 text-[10px] text-neutral-400">
              {icon}<span className="font-bold text-neutral-600 dark:text-slate-300">{val}</span><span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── No API key warning ──────────────────────────────────────────── */}
      {!isApiKeyConfigured() && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 shrink-0">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-tight">Gemini API key not configured</p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                Add <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded font-mono">VITE_GEMINI_API_KEY=…</code> to your <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded font-mono">.env</code> file and restart the server.
                Get a free key at <a href="https://aistudio.google.com" target="_blank" rel="noopener" className="underline font-semibold">aistudio.google.com</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">

        {/* Suggestions — shown only before first user message */}
        {!hasContent && (
          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Try asking…</p>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-slate-900 hover:bg-primary-50 dark:hover:bg-primary-950/30 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs text-neutral-600 dark:text-slate-300 font-medium transition-all text-left">
                <span className="text-primary-500">{s.icon}</span>{s.text}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2.5", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
            {/* Avatar */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              msg.role === 'assistant' ? "bg-primary-50 dark:bg-primary-950 text-primary-600" : "bg-neutral-100 dark:bg-slate-800 text-neutral-600"
            )}>
              {msg.role === 'assistant' ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble + cards */}
            <div className={cn("flex flex-col max-w-[84%]", msg.role === 'user' ? "items-end" : "items-start")}>
              {msg.content && (() => {
                // Second-chance parse: if content looks like a full JSON response object,
                // extract just the human-readable message and rescue any embedded action.
                let displayContent = msg.content;
                let rescuedAction = msg.action;
                if (!msg.action && msg.role === 'assistant' && msg.content.trimStart().startsWith('{')) {
                  try {
                    const firstBrace = msg.content.indexOf('{');
                    let depth = 0, end = -1;
                    for (let ci = firstBrace; ci < msg.content.length; ci++) {
                      if (msg.content[ci] === '{') depth++;
                      else if (msg.content[ci] === '}') { depth--; if (depth === 0) { end = ci; break; } }
                    }
                    if (end !== -1) {
                      const parsed = JSON.parse(msg.content.substring(firstBrace, end + 1));
                      if (typeof parsed?.message === 'string') {
                        displayContent = parsed.message;
                        if (parsed.action && parsed.action.type !== 'none') rescuedAction = parsed.action;
                      }
                    }
                  } catch { /* keep original */ }
                }

                // Render simple **bold** markdown
                const renderMarkdown = (text: string) => {
                  const parts = text.split(/(\*\*[^*]+\*\*)/g);
                  return parts.map((part, pi) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={pi}>{part.slice(2, -2)}</strong>
                      : part
                  );
                };

                return (
                  <>
                    <div className={cn(
                      "px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap",
                      msg.role === 'assistant'
                        ? "bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 rounded-tl-sm"
                        : "bg-primary-600 text-white rounded-tr-sm shadow-sm"
                    )}>
                      {renderMarkdown(displayContent)}
                      {msg.isThinking && <Loader2 className="w-3 h-3 animate-spin inline ml-1.5 opacity-60" />}
                    </div>

                    {/* Rescued action card — shown when JSON leaked into content */}
                    {rescuedAction && rescuedAction !== msg.action && rescuedAction.type !== 'query_data' && (
                      <ActionPlanCard
                        action={rescuedAction}
                        state="pending"
                        result={undefined}
                        onConfirm={() => {
                          // Inject the rescued action into the message then confirm
                          updateMessageAt(i, { action: rescuedAction, actionState: 'pending', content: displayContent });
                          setTimeout(() => handleConfirm(i), 50);
                        }}
                        onCancel={() => handleCancel(i)}
                      />
                    )}
                  </>
                );
              })()}

              {/* Action confirmation card */}
              {msg.action && msg.actionState && msg.action.type !== 'query_data' && (
                <ActionPlanCard
                  action={msg.action}
                  state={msg.actionState}
                  result={msg.actionResult}
                  onConfirm={() => handleConfirm(i)}
                  onCancel={() => handleCancel(i)}
                />
              )}

              {/* Query results table */}
              {msg.queryResults && msg.role === 'assistant' && (
                <QueryResultsCard
                  results={msg.queryResults}
                  description={msg.action?.payload?.description || ''}
                />
              )}
            </div>
          </div>
        ))}

        {/* Typing / retry indicator */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="bg-neutral-100 dark:bg-slate-800 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2 max-w-xs">
              {retryState ? (
                <>
                  {/* Animated ring for countdown */}
                  <div className="relative w-5 h-5 shrink-0">
                    <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5"/>
                      <circle
                        cx="10" cy="10" r="8" fill="none"
                        stroke="#1A56DB" strokeWidth="2.5"
                        strokeDasharray={`${2 * Math.PI * 8}`}
                        strokeDashoffset={`${2 * Math.PI * 8 * (1 - retryState.countdown / retryState.total)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-primary-600">{retryState.countdown}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-700 dark:text-slate-300 leading-tight">Rate limit — retrying</p>
                    <p className="text-[10px] text-neutral-400">Attempt {retryState.attempt} of 4</p>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400 shrink-0" />
                  <span className="text-xs text-neutral-400">{loadingStatus}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Retry button — shown after final rate-limit failure */}
        {!isLoading && pendingRetryMessage && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5 rounded-2xl rounded-tl-sm max-w-xs space-y-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">AI service is busy</p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">Your message was saved. Tap retry to try again.</p>
              <button
                onClick={() => {
                  const msg = pendingRetryMessage;
                  setPendingRetryMessage(null);
                  setInput(msg);
                  // Use setTimeout so input state is set before handleSend reads it
                  setTimeout(() => {
                    setMessages(prev => [...prev, { role: 'user', content: msg }]);
                    setInput('');
                    setIsLoading(true);
                    setRetryState(null);
                    setLoadingStatus('Thinking…');
                    const historyForAI = [...messages, { role: 'user' as const, content: msg }].map(m => ({ role: m.role, content: m.content }));
                    getNexusAssistantResponse(historyForAI, buildFullContext(), (attempt, delayMs) => {
                      const secs = Math.round(delayMs / 1000);
                      setLoadingStatus(`Rate limit hit — retrying in ${secs}s (attempt ${attempt} of 4)…`);
                      setRetryState({ attempt, countdown: secs, total: secs });
                    }).then(response => {
                      setRetryState(null);
                      setLoadingStatus('Thinking…');
                      if (response.action && response.action.type !== 'none') {
                        addAssistantMessage({ content: response.message, action: response.action, actionState: 'pending' });
                      } else {
                        addAssistantMessage({ content: response.message });
                      }
                    }).catch(err => {
                      setRetryState(null);
                      if (err.message === 'RATE_LIMIT') {
                        setPendingRetryMessage(msg);
                        addAssistantMessage({ content: "Still busy — your message is saved. Please try again in a minute.", isRateLimit: true } as any);
                      } else {
                        addAssistantMessage({ content: `Something went wrong: ${err.message}` });
                      }
                    }).finally(() => setIsLoading(false));
                  }, 50);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
              >
                <RotateCcw className="w-3 h-3" /> Retry now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Limitation note */}
      <div className="px-3 py-1.5 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/60 dark:bg-slate-900/30 shrink-0">
        <div className="flex items-start gap-1.5 text-[10px] text-neutral-400">
          <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
          <span>Write operations require your confirmation. Data queries reflect live Firestore records.</span>
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-[#0D1117] shrink-0">
        <div className="flex items-end gap-2 bg-neutral-100 dark:bg-slate-800 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-primary-500 transition-all">
          <textarea
            ref={inputRef as any}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask anything or give an instruction…"
            rows={1}
            className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 resize-none leading-relaxed"
            style={{ maxHeight: 96, overflowY: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl disabled:opacity-40 disabled:bg-neutral-400 transition-all active:scale-95 shrink-0 mb-0.5"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-neutral-300 dark:text-slate-600 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};
