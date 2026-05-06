import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Send, Cpu, Sparkles, User, Loader2, Database, Zap, Globe,
  CheckCircle2, XCircle, ChevronDown, ChevronRight, AlertTriangle,
  Table2, FolderPlus, Search, Clock, RotateCcw, Copy, Check,
  PenSquare, Maximize2, Minimize2, BarChart3, FileText, Undo2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { streamNexusAssistantResponse, getNexusAssistantResponse, NexusAction, isApiKeyConfigured, buildCompactContext } from '../services/geminiService';
import { useSchemaStore } from '../store/schemaStore';
import { useAuthStore } from '../store/authStore';
import { useProjectSettingsStore } from '../store/projectSettingsStore';
import { db } from '../lib/firebase';
import {
  collection, query, orderBy, limit, getDocs,
  doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, where
} from 'firebase/firestore';
import { FieldType } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: NexusAction;
  actionState?: 'pending' | 'confirmed' | 'cancelled' | 'executing' | 'done' | 'error';
  actionResult?: string;
  executionProgress?: { total: number; current: number; steps: { description: string; status: 'pending' | 'running' | 'done' | 'error' }[] };
  queryResults?: any[];
  isThinking?: boolean;
  streamingRaw?: string;
  undoKey?: string;
}

interface ProjectContext {
  schema: any[];
  applications: any[];
  workflows: any[];
  recentLogs: any[];
}

interface UndoEntry {
  ids: string[];
  collection: string;
  label: string;
  expiry: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (type === 'create_dashboard') return <BarChart3 className="w-4 h-4" />;
  if (type === 'create_report') return <FileText className="w-4 h-4" />;
  if (type === 'multi_action') return <FolderPlus className="w-4 h-4" />;
  if (type === 'query_data') return <Search className="w-4 h-4" />;
  return <Sparkles className="w-4 h-4" />;
}

function actionColour(type: string) {
  if (type === 'create_table' || type === 'add_field') return 'bg-blue-600';
  if (type === 'create_app') return 'bg-violet-600';
  if (type === 'create_workflow') return 'bg-amber-500';
  if (type === 'create_dashboard') return 'bg-teal-600';
  if (type === 'create_report') return 'bg-indigo-600';
  if (type === 'multi_action') return 'bg-primary-600';
  if (type === 'query_data') return 'bg-emerald-600';
  return 'bg-neutral-500';
}

// ── AI-I02: Enhanced markdown renderer ───────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0, k = 0;

  const inline = (s: string): React.ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((p, pi) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={pi}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={pi} className="px-1 py-0.5 bg-neutral-200 dark:bg-slate-700 rounded text-[10px] font-mono">{p.slice(1, -1)}</code>;
      if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={pi}>{p.slice(1, -1)}</em>;
      return p;
    });

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) { nodes.push(<p key={k++} className="font-bold text-[11px] text-neutral-700 dark:text-slate-200 mt-2 mb-0.5">{inline(line.slice(3))}</p>); i++; continue; }
    if (line.startsWith('# '))  { nodes.push(<p key={k++} className="font-black text-xs text-neutral-800 dark:text-slate-100 mt-2 mb-0.5">{inline(line.slice(2))}</p>); i++; continue; }
    if (line.match(/^[-*] /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(<li key={i}>{inline(lines[i].slice(2))}</li>); i++; }
      nodes.push(<ul key={k++} className="list-disc pl-4 space-y-0.5 my-1">{items}</ul>); continue;
    }
    if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(<li key={i}>{inline(lines[i].replace(/^\d+\. /, ''))}</li>); i++; }
      nodes.push(<ol key={k++} className="list-decimal pl-4 space-y-0.5 my-1">{items}</ol>); continue;
    }
    if (line.startsWith('```')) {
      const code: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; } i++;
      nodes.push(<pre key={k++} className="bg-neutral-800 text-emerald-300 rounded-lg p-2 text-[10px] font-mono overflow-x-auto my-1">{code.join('\n')}</pre>); continue;
    }
    if (line.trim() === '') { nodes.push(<br key={k++} />); i++; continue; }
    nodes.push(<span key={k++}>{inline(line)}{'\n'}</span>); i++;
  }
  return <>{nodes}</>;
}

// ── AI-I03: Pre-flight validation ─────────────────────────────────────────────

function validateAction(action: NexusAction, tables: any[]): { warnings: string[]; errors: string[] } {
  const { type, payload } = action;
  const warnings: string[] = [], errors: string[] = [];
  if (type === 'create_table') {
    if (tables.some(t => t.name.toLowerCase() === (payload.name || '').toLowerCase()))
      warnings.push(`Table "${payload.name}" already exists — fields will be added to it.`);
    if (!payload.fields?.length) warnings.push('No fields defined — table will be empty.');
  }
  if (type === 'create_app' && !payload.dataSourceId) errors.push('No data source specified for this app.');
  if (type === 'multi_action' && !(payload.steps?.length)) errors.push('No steps in plan.');
  return { warnings, errors };
}

// ── Copy Button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button title="Copy" onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="absolute top-1 right-1 opacity-0 group-hover/bubble:opacity-100 p-1 rounded-md bg-neutral-200/60 hover:bg-neutral-300 dark:bg-slate-700 transition-all">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-neutral-400" />}
    </button>
  );
}

// ── Action Plan Card ──────────────────────────────────────────────────────────

function ActionPlanCard({ action, state, result, executionProgress, undoEntry, onConfirm, onCancel, onUndo }: {
  action: NexusAction; state: Message['actionState']; result?: string;
  executionProgress?: Message['executionProgress']; undoEntry?: UndoEntry | null;
  onConfirm: () => void; onCancel: () => void; onUndo?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = state === 'pending', isExecuting = state === 'executing';
  const isDone = state === 'done', isError = state === 'error', isCancelled = state === 'cancelled';
  if (action.type === 'query_data') return null;

  const stepList = action.type === 'multi_action'
    ? (action.payload?.steps || []).map((s: any) => ({ type: s.type, description: s.description }))
    : [{ type: action.type, description: action.description }];

  return (
    <div className={cn("mt-2 rounded-2xl border overflow-hidden text-xs transition-all",
      isPending ? "border-primary-200 bg-primary-50/60 dark:bg-primary-950/20 dark:border-primary-900/40"
        : isDone ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/40"
        : isError ? "border-rose-200 bg-rose-50/60" : "border-neutral-200 bg-neutral-50/60")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={cn("p-1.5 rounded-lg text-white shrink-0", actionColour(action.type))}>{actionIcon(action.type)}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-neutral-900 dark:text-white truncate">{action.description}</p>
          {action.type === 'multi_action' && <p className="text-neutral-400 text-[10px]">{stepList.length} steps</p>}
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

      {/* AI-N02: Step-by-step progress during execution */}
      {isExecuting && executionProgress && (
        <div className="px-3 pb-2 border-t border-neutral-200/60 pt-2 space-y-1.5">
          {executionProgress.steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              {s.status === 'done'    && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              {s.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500 shrink-0" />}
              {s.status === 'error'   && <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              {s.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 shrink-0" />}
              <span className={cn("font-medium", s.status === 'done' ? "text-neutral-400 line-through" : s.status === 'running' ? "text-neutral-800 dark:text-white" : "text-neutral-400")}>{s.description}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && !isExecuting && stepList.length > 0 && (
        <div className="px-3 pb-2 space-y-1 border-t border-neutral-200/60 pt-2">
          {stepList.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="w-4 h-4 rounded-full bg-neutral-200 flex items-center justify-center font-black text-[9px] shrink-0">{i + 1}</span>
              <span className="font-medium">{s.description}</span>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className={cn("px-3 pb-2 pt-1 text-[11px] font-medium border-t border-neutral-200/60",
          isDone ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600")}>{result}</div>
      )}

      {isPending && (
        <div className="flex gap-2 px-3 pb-3 pt-1">
          <button onClick={onConfirm} className="flex-1 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors text-[11px]">Confirm</button>
          <button onClick={onCancel} className="flex-1 py-1.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-slate-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-colors text-[11px]">Cancel</button>
        </div>
      )}
      {isExecuting && !executionProgress && (
        <div className="flex items-center gap-2 px-3 pb-3 pt-1 text-[11px] text-neutral-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Applying…
        </div>
      )}

      {/* AI-I04: Undo button after success (30s window) */}
      {isDone && undoEntry && onUndo && (
        <div className="px-3 pb-3 pt-1">
          <button onClick={onUndo} className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition-all">
            <Undo2 className="w-3 h-3" /> Undo {undoEntry.label}
          </button>
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
    <div className="mt-2 rounded-2xl border border-neutral-200 bg-neutral-50/60 px-3 py-2.5 text-xs text-neutral-500">No records found.</div>
  );
  const keys = Object.keys(results[0]).filter(k => k !== '_rowId' && k !== '_id').slice(0, 5);
  return (
    <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40 overflow-hidden text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-200/60">
        <Table2 className="w-3.5 h-3.5 text-emerald-600" />
        <span className="font-bold text-emerald-800 dark:text-emerald-300">{results.length} record{results.length !== 1 ? 's' : ''}</span>
        <span className="text-emerald-600/70 text-[10px] ml-1">— {description}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead><tr className="bg-emerald-100/60 text-emerald-700">{keys.map(k => <th key={k} className="px-2 py-1 text-left font-black uppercase tracking-wider">{k}</th>)}</tr></thead>
          <tbody>{display.map((row, i) => (
            <tr key={i} className="border-t border-emerald-100/60 hover:bg-emerald-50/50">
              {keys.map(k => <td key={k} className="px-2 py-1 text-neutral-700 max-w-[120px] truncate">{String(row[k] ?? '')}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {results.length > 5 && (
        <button onClick={() => setShowAll(v => !v)} className="w-full py-1.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100/40 transition-colors">
          {showAll ? 'Show less' : `Show all ${results.length}`}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function generateGreeting(ctx: ProjectContext): string {
  // AI-N05: Dynamic greeting
  if (ctx.schema.length === 0 && ctx.applications.length === 0)
    return "Hi, I'm Nexus AI. I can build your entire project from a description — tell me what you're building and I'll design the tables, apps, workflows, and dashboards.";
  return `Hi, I'm Nexus AI. You have ${ctx.schema.length} table${ctx.schema.length !== 1 ? 's' : ''} and ${ctx.applications.length} app${ctx.applications.length !== 1 ? 's' : ''}. I can query data, build new apps, create dashboards, or set up automations — what would you like to work on?`;
}

export const AIAssistant = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: "Hello! I'm Nexus AI. How can I help you today?" }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryState, setRetryState] = useState<{ attempt: number; countdown: number; total: number } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('Thinking…');
  const [pendingRetryMessage, setPendingRetryMessage] = useState<string | null>(null);
  const [context, setContext] = useState<ProjectContext>({ schema: [], applications: [], workflows: [], recentLogs: [] });
  const [contextReady, setContextReady] = useState(false);
  const [greetingSet, setGreetingSet] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => parseInt(localStorage.getItem('nexus-ai-panel-width') || '340'));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const undoStackRef = useRef<Map<string, UndoEntry>>(new Map());
  const [undoKeys, setUndoKeys] = useState<Set<string>>(new Set());
  const isResizingRef = useRef(false);
  const msgCountRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!retryState || retryState.countdown <= 0) return;
    const t = setTimeout(() => setRetryState(p => p ? { ...p, countdown: p.countdown - 1 } : null), 1000);
    return () => clearTimeout(t);
  }, [retryState]);

  const tables = useSchemaStore(s => s.tables);
  const { addTable, addField } = useSchemaStore();
  const selectedProjectId = useAuthStore(s => s.selectedProjectId);
  const { setSettings: setProjectSettings } = useProjectSettingsStore();

  // Context loading
  useEffect(() => {
    if (!selectedProjectId) return;
    let r = { apps: false, wf: false, logs: false };
    const check = () => { if (r.apps && r.wf && r.logs) setContextReady(true); };
    const a = onSnapshot(query(collection(db, 'workspaces', selectedProjectId, 'apps')), snap => { setContext(p => ({ ...p, applications: snap.docs.map(d => ({ id: d.id, ...d.data() })) })); r.apps = true; check(); });
    const b = onSnapshot(query(collection(db, 'workspaces', selectedProjectId, 'workflows')), snap => { setContext(p => ({ ...p, workflows: snap.docs.map(d => ({ id: d.id, ...d.data() })) })); r.wf = true; check(); });
    const c = onSnapshot(query(collection(db, 'workspaces', selectedProjectId, 'workflowLogs'), orderBy('triggeredAt', 'desc'), limit(20)), snap => { setContext(p => ({ ...p, recentLogs: snap.docs.map(d => { const x = d.data(); return { workflowName: x.workflowName, status: x.status, triggeredAt: x.triggeredAt?.toDate?.()?.toISOString?.() ?? '', error: x.error }; }) })); r.logs = true; check(); });
    return () => { a(); b(); c(); };
  }, [selectedProjectId]);

  useEffect(() => { setContext(p => ({ ...p, schema: tables.map(t => ({ id: t.id, name: t.name, fieldCount: t.fields.length, fields: t.fields.map(f => ({ id: f.id, name: f.name, type: f.type })) })) })); }, [tables]);

  // AI-N05: Update greeting after context loads
  useEffect(() => {
    if (contextReady && !greetingSet && messages.length === 1) {
      setMessages([{ role: 'assistant', content: generateGreeting(context) }]);
      setGreetingSet(true);
    }
  }, [contextReady, greetingSet, context, messages.length]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  // AI-I05: Resize
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const sx = e.clientX, sw = panelWidth;
    const move = (me: MouseEvent) => { if (!isResizingRef.current) return; setPanelWidth(Math.max(300, Math.min(700, sw + sx - me.clientX))); };
    const up = () => { isResizingRef.current = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); localStorage.setItem('nexus-ai-panel-width', String(panelWidth)); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [panelWidth]);

  // ── Executors ─────────────────────────────────────────────────────────────

  const queryTableData = useCallback(async (payload: any): Promise<any[]> => {
    if (!selectedProjectId) return [];
    try {
      const constraints: any[] = [];
      if (payload.filters?.length) payload.filters.forEach((f: any) => { try { constraints.push(where(f.field, f.operator || '==', f.value)); } catch {} });
      if (payload.orderByField) constraints.push(orderBy(payload.orderByField, payload.orderDirection === 'asc' ? 'asc' : 'desc'));
      constraints.push(limit(payload.limit || 50));
      const snap = await getDocs(query(collection(db, 'workspaces', selectedProjectId, 'tableData', payload.tableId, 'rows'), ...constraints));
      return snap.docs.map(d => ({ _rowId: d.id, ...d.data() }));
    } catch {
      const snap = await getDocs(query(collection(db, 'workspaces', selectedProjectId, 'tableData', payload.tableId, 'rows'), limit(50)));
      return snap.docs.map(d => ({ _rowId: d.id, ...d.data() }));
    }
  }, [selectedProjectId]);

  const executeCreateTable = useCallback(async (p: any) => {
    const id = generateId('tbl');
    await addTable({ id, name: p.name, description: p.description || '', fields: (p.fields || []).map((f: any) => ({ id: generateId('fld'), name: f.name, type: fieldTypeFromString(f.type), required: f.required || false, ...(f.options ? { options: f.options } : {}) })), type: 'internal' });
    return { result: `Table "${p.name}" created.`, id };
  }, [addTable]);

  const executeAddField = useCallback(async (p: any) => { await addField(p.tableId, { id: generateId('fld'), name: p.field.name, type: fieldTypeFromString(p.field.type), required: p.field.required || false }); return `Field "${p.field.name}" added.`; }, [addField]);

  const executeCreateApp = useCallback(async (p: any) => {
    if (!selectedProjectId) throw new Error('No project');
    const id = (p.name || 'app').toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', id), { id, name: p.name, description: p.description || '', dataSourceId: p.dataSourceId || '', mode: p.mode || 'add', keyFields: p.keyFields || [], components: (p.components || []).map((c: any, i: number) => ({ id: generateId('cmp'), type: c.type || 'input', label: c.label || '', position: { x: 32, y: 32 + i * 80 }, size: { width: c.width || 320, height: c.height || 48 }, properties: { label: c.label || '', fieldMapping: c.fieldMapping || '' }, parentId: null, slotKey: null })), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { result: `App "${p.name}" created.`, id };
  }, [selectedProjectId]);

  const executeCreateWorkflow = useCallback(async (p: any) => {
    if (!selectedProjectId) throw new Error('No project');
    const id = generateId('wf'), tid = 'node_trigger';
    const nodes = [{ id: tid, type: 'workflow', position: { x: 250, y: 50 }, data: { category: 'trigger', type: p.triggerType || 'record_created', description: p.triggerDescription || '', ...(p.triggerTableId ? { tableId: p.triggerTableId } : {}) } }, ...(p.actions || []).map((a: any, i: number) => ({ id: `node_action_${i}`, type: 'workflow', position: { x: 250, y: 200 + i * 180 }, data: { category: 'action', type: a.type || 'send_email', description: a.label || '' } }))];
    const edges = (p.actions || []).map((_: any, i: number) => ({ id: `edge_${i}`, source: i === 0 ? tid : `node_action_${i - 1}`, target: `node_action_${i}`, type: 'smoothstep' }));
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', id), { id, name: p.name, status: 'draft', nodes, edges, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { result: `Workflow "${p.name}" created (draft).`, id };
  }, [selectedProjectId]);

  // AI-M02: Dashboard executor
  const executeCreateDashboard = useCallback(async (p: any) => {
    if (!selectedProjectId) throw new Error('No project');
    const id = generateId('dash');
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'dashboards', id), { id, workspaceId: selectedProjectId, name: p.name, cards: (p.cards || []).map((c: any, i: number) => ({ id: generateId('card'), ...c, position: i })), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { result: `Dashboard "${p.name}" created.`, id };
  }, [selectedProjectId]);

  // AI-M02: Report executor
  const executeCreateReport = useCallback(async (p: any) => {
    if (!selectedProjectId) throw new Error('No project');
    const id = generateId('rpt');
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'reports', id), { id, workspaceId: selectedProjectId, name: p.name, elements: (p.sections || []).map((s: any, i: number) => ({ id: generateId('el'), ...s, order: i })), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { result: `Report "${p.name}" created.`, id };
  }, [selectedProjectId]);

  const executeMultiAction = useCallback(async (payload: any, onProgress: (p: Message['executionProgress']) => void): Promise<string> => {
    const steps: any[] = payload.steps || [];
    const results: string[] = [];
    const nameToId: Record<string, string> = {};
    tables.forEach(t => { nameToId[t.name.toLowerCase()] = t.id; });
    const progressSteps: { description: string; status: 'pending' | 'running' | 'done' | 'error' }[] = steps.map(s => ({ description: s.description, status: 'pending' as const }));

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      progressSteps[i] = { ...progressSteps[i], status: 'running' };
      onProgress({ total: steps.length, current: i + 1, steps: [...progressSteps] });
      try {
        let r = '';
        if (step.type === 'create_table') { const { result, id } = await executeCreateTable(step.payload); nameToId[step.payload.name.toLowerCase()] = id; r = `✓ ${result}`; }
        else if (step.type === 'create_app') { const p = { ...step.payload }; if (p.dataSourceId && nameToId[p.dataSourceId.toLowerCase()]) p.dataSourceId = nameToId[p.dataSourceId.toLowerCase()]; else if (!p.dataSourceId) { const found = Object.keys(nameToId).find(n => (p.name || '').toLowerCase().includes(n)); if (found) p.dataSourceId = nameToId[found]; } const { result } = await executeCreateApp(p); r = `✓ ${result}`; }
        else if (step.type === 'create_workflow') { const p = { ...step.payload }; if (p.triggerTableId && nameToId[p.triggerTableId.toLowerCase()]) p.triggerTableId = nameToId[p.triggerTableId.toLowerCase()]; const { result } = await executeCreateWorkflow(p); r = `✓ ${result}`; }
        else if (step.type === 'create_dashboard') { const { result } = await executeCreateDashboard(step.payload); r = `✓ ${result}`; }
        else if (step.type === 'create_report') { const { result } = await executeCreateReport(step.payload); r = `✓ ${result}`; }
        else if (step.type === 'set_project_settings') { await setProjectSettings(step.payload || {}); r = '✓ Theme applied'; }
        progressSteps[i] = { ...progressSteps[i], status: 'done' };
        results.push(r);
      } catch (e: any) { progressSteps[i] = { ...progressSteps[i], status: 'error' }; results.push(`✗ Step ${i + 1}: ${e.message}`); }
      onProgress({ total: steps.length, current: i + 1, steps: [...progressSteps] });
    }
    return results.join('\n');
  }, [tables, executeCreateTable, executeCreateApp, executeCreateWorkflow, executeCreateDashboard, executeCreateReport, setProjectSettings]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const buildFullContext = useCallback(() => ({ ...context, schema: tables.map(t => ({ id: t.id, name: t.name, fields: t.fields.map(f => ({ id: f.id, name: f.name, type: f.type })) })) }), [context, tables]);

  const addMsg = (msg: Partial<Message>) => setMessages(p => [...p, { role: 'assistant', content: '', ...msg }]);
  const updateLast = (u: Partial<Message>) => setMessages(p => { const n = [...p]; n[n.length - 1] = { ...n[n.length - 1], ...u }; return n; });
  const updateAt = (i: number, u: Partial<Message>) => setMessages(p => { const n = [...p]; n[i] = { ...n[i], ...u }; return n; });

  // AI-I04: Undo registration
  const registerUndo = (msgIdx: number, label: string, ids: string[], coll: string) => {
    const key = `u_${msgIdx}_${Date.now()}`;
    const entry: UndoEntry = { ids, collection: coll, label, expiry: Date.now() + 30_000 };
    undoStackRef.current.set(key, entry);
    setUndoKeys(p => new Set([...p, key]));
    setTimeout(() => { undoStackRef.current.delete(key); setUndoKeys(p => { const n = new Set(p); n.delete(key); return n; }); }, 30_000);
    updateAt(msgIdx, { undoKey: key });
  };

  const handleUndo = async (key: string, msgIdx: number) => {
    const entry = undoStackRef.current.get(key);
    if (!entry || !selectedProjectId) return;
    for (const id of entry.ids) { try { await deleteDoc(doc(db, 'workspaces', selectedProjectId, entry.collection, id)); } catch {} }
    undoStackRef.current.delete(key);
    setUndoKeys(p => { const n = new Set(p); n.delete(key); return n; });
    updateAt(msgIdx, { undoKey: undefined });
    addMsg({ content: `Undone — "${entry.label}" removed.` });
  };

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isLoading) return;
    const userMsg: Message = { role: 'user', content: text };

    const confirmRx = /^(yes|yeah|go ahead|confirm|ok|okay|do it|build it|create it|sure|please do|make them|build these|create them|yes please|yep|absolutely|proceed)\b/i;
    const lastPendIdx = [...messages].reverse().findIndex(m => m.actionState === 'pending');
    const pendIdx = lastPendIdx !== -1 ? messages.length - 1 - lastPendIdx : -1;
    if (pendIdx !== -1 && confirmRx.test(text)) { setMessages(p => [...p, userMsg]); setInput(''); handleConfirm(pendIdx); return; }

    setMessages(p => [...p, userMsg]);
    setInput('');
    setIsLoading(true);
    setRetryState(null);
    setLoadingStatus('Thinking…');
    setPendingRetryMessage(null);
    setShowCommandMenu(false);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    msgCountRef.current++;

    // AI-M06: Compact context on follow-up turns
    const ctx = msgCountRef.current <= 1 ? buildFullContext() : buildCompactContext(buildFullContext());

    // AI-M01: Streaming — add placeholder and stream into it
    addMsg({ content: '', streamingRaw: '' });

    try {
      const response = await streamNexusAssistantResponse(
        history, ctx,
        (chunk) => setMessages(p => { const n = [...p]; const last = n[n.length - 1]; n[n.length - 1] = { ...last, streamingRaw: (last.streamingRaw || '') + chunk }; return n; }),
        (attempt, ms) => { const s = Math.round(ms / 1000); setLoadingStatus(`Rate limit — retrying in ${s}s…`); setRetryState({ attempt, countdown: s, total: s }); }
      );

      setRetryState(null);

      if (response.action?.type === 'query_data') {
        updateLast({ content: response.message, streamingRaw: undefined, isThinking: true });
        let rows: any[] = [];
        try { rows = await queryTableData(response.action.payload); } catch {}
        updateLast({ isThinking: false });
        const sumHistory = [...history, { role: 'assistant' as const, content: response.message }, { role: 'user' as const, content: `Query returned ${rows.length} records: ${JSON.stringify(rows.slice(0, 20))}. Summarise naturally.` }];
        const sum = await getNexusAssistantResponse(sumHistory, buildFullContext());
        updateLast({ content: sum.message || response.message, isThinking: false, queryResults: rows, action: response.action, streamingRaw: undefined });
      } else if (response.action && response.action.type !== 'none') {
        updateLast({ content: response.message, action: response.action, actionState: 'pending', streamingRaw: undefined });
      } else {
        updateLast({ content: response.message, streamingRaw: undefined });
      }
    } catch (e: any) {
      setRetryState(null);
      if (e.message === 'RATE_LIMIT') { setPendingRetryMessage(text); updateLast({ content: "The AI service is busy. Tap **Retry** to try again.", streamingRaw: undefined }); }
      else if (e.message === 'NO_API_KEY') updateLast({ content: "⚠️ No API key configured. Add `VITE_GEMINI_API_KEY` to `.env`.", streamingRaw: undefined });
      else updateLast({ content: `Something went wrong: ${e.message}`, streamingRaw: undefined });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg?.action) return;
    const { errors } = validateAction(msg.action, tables);
    if (errors.length) { updateAt(msgIdx, { actionState: 'error', actionResult: errors.join(' | ') }); return; }
    updateAt(msgIdx, { actionState: 'executing' });
    try {
      let result = '', createdId: string | undefined, coll = '';
      const t = msg.action.type;
      if (t === 'create_table') { const r = await executeCreateTable(msg.action.payload); result = r.result; createdId = r.id; coll = 'tables'; }
      else if (t === 'add_field') result = await executeAddField(msg.action.payload);
      else if (t === 'create_app') { const r = await executeCreateApp(msg.action.payload); result = r.result; createdId = r.id; coll = 'apps'; }
      else if (t === 'create_workflow') { const r = await executeCreateWorkflow(msg.action.payload); result = r.result; createdId = r.id; coll = 'workflows'; }
      else if (t === 'create_dashboard') { const r = await executeCreateDashboard(msg.action.payload); result = r.result; createdId = r.id; coll = 'dashboards'; }
      else if (t === 'create_report') { const r = await executeCreateReport(msg.action.payload); result = r.result; createdId = r.id; coll = 'reports'; }
      else if (t === 'multi_action') result = await executeMultiAction(msg.action.payload, (p) => updateAt(msgIdx, { actionState: 'executing', executionProgress: p }));
      else if (t === 'set_project_settings') { await setProjectSettings(msg.action.payload || {}); result = 'Settings updated.'; }
      updateAt(msgIdx, { actionState: 'done', actionResult: result });
      if (createdId && coll) registerUndo(msgIdx, msg.action.description || t, [createdId], coll);
      setTimeout(() => addMsg({ content: `Done! ${result} What else can I help you with?` }), 300);
    } catch (e: any) { updateAt(msgIdx, { actionState: 'error', actionResult: e.message }); }
  };

  const handleCancel = (idx: number) => { updateAt(idx, { actionState: 'cancelled' }); setTimeout(() => addMsg({ content: "No problem — changes were not applied." }), 200); };

  // AI-N03: New chat
  const handleNewChat = () => {
    if (isLoading) return;
    if (messages.length > 2 && !window.confirm('Start a new chat? Current conversation will be cleared.')) return;
    setMessages([{ role: 'assistant', content: generateGreeting(context) }]);
    setInput(''); setShowCommandMenu(false); msgCountRef.current = 0;
  };

  // AI-I01: Dynamic suggestions from live context — must be before any conditional return (Rules of Hooks)
  const suggestions = useMemo(() => {
    const s: { icon: React.ReactNode; text: string }[] = [];
    const failLog = context.recentLogs.find(l => l.status === 'error');
    if (failLog) s.push({ icon: <AlertTriangle className="w-3 h-3" />, text: `Why did "${failLog.workflowName}" fail?` });
    const draftWf = context.workflows.find((w: any) => w.status === 'draft');
    if (draftWf) s.push({ icon: <Zap className="w-3 h-3" />, text: `Activate my "${(draftWf as any).name}" workflow` });
    if (context.schema.length === 0) s.push({ icon: <Database className="w-3 h-3" />, text: "Build a complete CRM for my team" });
    else s.push({ icon: <Search className="w-3 h-3" />, text: `How many records are in my ${context.schema[0]?.name} table?` });
    if (context.applications.length === 0 && context.schema.length > 0) s.push({ icon: <Globe className="w-3 h-3" />, text: `Build an app for ${context.schema[0]?.name}` });
    else s.push({ icon: <Clock className="w-3 h-3" />, text: "When did my last workflow run?" });
    return s.slice(0, 4);
  }, [context]);

  if (!isOpen) return null;

  const hasContent = messages.length > 1;

  const SLASH_CMDS = [
    { label: 'Create table', template: 'Create a table called ' },
    { label: 'Build app', template: 'Build an app for my ' },
    { label: 'Create workflow', template: 'Create a workflow that ' },
    { label: 'Create dashboard', template: 'Create a dashboard with ' },
    { label: 'Query data', template: 'Show me records from ' },
    { label: 'Analyse logs', template: 'Show me my recent workflow logs' },
  ];

  const panelStyle: React.CSSProperties = isFullscreen
    ? { position: 'fixed', inset: 0, width: '100%', zIndex: 500 }
    : { width: panelWidth };

  return (
    <div className="fixed top-14 right-0 bottom-0 flex flex-col z-40 bg-white dark:bg-[#0D1117] border-l border-neutral-200 dark:border-slate-800 shadow-2xl" style={panelStyle}>
      {/* AI-I05: Resize handle */}
      {!isFullscreen && <div className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-400 transition-colors z-50" onMouseDown={startResize} />}

      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-[#0D1117] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shadow-md shadow-primary-200/40"><Cpu className="text-white w-4 h-4" /></div>
          <div>
            <h3 className="font-black text-neutral-900 dark:text-white text-sm leading-none">Nexus AI</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", contextReady ? "bg-emerald-500 animate-pulse" : "bg-amber-400")} />
              <span className="text-[10px] text-neutral-400 font-medium">{contextReady ? 'Ready' : 'Loading…'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* AI-N03 */}
          <button onClick={handleNewChat} title="New chat" className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><PenSquare className="w-4 h-4 text-neutral-400" /></button>
          {/* AI-I05 */}
          <button onClick={() => setIsFullscreen(v => !v)} title={isFullscreen ? 'Restore' : 'Fullscreen'} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-neutral-400" /> : <Maximize2 className="w-4 h-4 text-neutral-400" />}
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4 text-neutral-400" /></button>
        </div>
      </div>

      {/* AI-N04: Clickable context stats */}
      {contextReady && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-neutral-50 dark:bg-slate-900/50 border-b border-neutral-100 dark:border-slate-800 shrink-0">
          {[
            { icon: <Database className="w-2.5 h-2.5" />, val: context.schema.length, label: 'tables', q: "What are my current tables and their fields?" },
            { icon: <Globe className="w-2.5 h-2.5" />, val: context.applications.length, label: 'apps', q: "Which apps are published?" },
            { icon: <Zap className="w-2.5 h-2.5" />, val: context.workflows.length, label: 'workflows', q: "Show me my workflow statuses" },
          ].map(({ icon, val, label, q }) => (
            <button key={label} onClick={() => { setInput(q); inputRef.current?.focus(); }} className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-primary-600 transition-colors px-1.5 py-0.5 rounded-md hover:bg-primary-50">
              {icon}<span className="font-bold text-neutral-600 dark:text-slate-300">{val}</span><span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {!isApiKeyConfigured() && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 shrink-0">
          <div className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><p className="text-[10px] text-amber-700 leading-relaxed">Add <code className="bg-amber-100 px-1 rounded font-mono">VITE_GEMINI_API_KEY=…</code> to <code className="bg-amber-100 px-1 rounded font-mono">.env</code> and restart.</p></div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {/* AI-I01: Dynamic suggestions */}
        {!hasContent && (
          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Try asking…</p>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-slate-900 hover:bg-primary-50 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs text-neutral-600 dark:text-slate-300 font-medium transition-all text-left">
                <span className="text-primary-500">{s.icon}</span>{s.text}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2.5 group/msg", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              msg.role === 'assistant' ? "bg-primary-50 dark:bg-primary-950 text-primary-600" : "bg-neutral-100 dark:bg-slate-800 text-neutral-600")}>
              {msg.role === 'assistant' ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </div>

            <div className={cn("flex flex-col max-w-[84%]", msg.role === 'user' ? "items-end" : "items-start")}>
              {(msg.content || msg.streamingRaw !== undefined) && (() => {
                const isStreaming = msg.streamingRaw !== undefined;
                let display = isStreaming ? (msg.streamingRaw || '') : msg.content;
                let rescuedAction = msg.action;

                // Rescue JSON that leaked into content
                if (!msg.action && msg.role === 'assistant' && !isStreaming && display.trimStart().startsWith('{')) {
                  try {
                    const fb = display.indexOf('{'); let depth = 0, end = -1;
                    for (let ci = fb; ci < display.length; ci++) { if (display[ci] === '{') depth++; else if (display[ci] === '}') { depth--; if (depth === 0) { end = ci; break; } } }
                    if (end !== -1) { const p = JSON.parse(display.substring(fb, end + 1)); if (typeof p?.message === 'string') { display = p.message; if (p.action?.type !== 'none') rescuedAction = p.action; } }
                  } catch {}
                }

                return (
                  <div className="relative group/bubble">
                    <div className={cn("px-3 py-2 rounded-2xl text-xs leading-relaxed",
                      msg.role === 'assistant' ? "bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 rounded-tl-sm" : "bg-primary-600 text-white rounded-tr-sm shadow-sm")}>
                      {msg.role === 'assistant' ? renderMarkdown(display) : display}
                      {isStreaming && <span className="inline-block w-1.5 h-3 bg-current animate-pulse ml-0.5 align-middle opacity-70" />}
                      {msg.isThinking && <Loader2 className="w-3 h-3 animate-spin inline ml-1.5 opacity-60" />}
                    </div>

                    {/* AI-I06: Copy for assistant */}
                    {msg.role === 'assistant' && !isStreaming && <CopyButton text={display} />}

                    {/* AI-I06: Edit for user */}
                    {msg.role === 'user' && (
                      <button title="Edit" onClick={() => { setInput(msg.content); setMessages(p => p.filter((_, idx) => idx < i)); inputRef.current?.focus(); }}
                        className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 p-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-all">
                        <PenSquare className="w-3 h-3 text-neutral-400" />
                      </button>
                    )}

                    {rescuedAction && rescuedAction !== msg.action && rescuedAction.type !== 'query_data' && (
                      <ActionPlanCard action={rescuedAction} state="pending" onConfirm={() => { updateAt(i, { action: rescuedAction, actionState: 'pending', content: display }); setTimeout(() => handleConfirm(i), 50); }} onCancel={() => handleCancel(i)} />
                    )}
                  </div>
                );
              })()}

              {msg.action && msg.actionState && msg.action.type !== 'query_data' && (
                <ActionPlanCard
                  action={msg.action} state={msg.actionState} result={msg.actionResult}
                  executionProgress={msg.executionProgress}
                  undoEntry={msg.undoKey && undoKeys.has(msg.undoKey) ? (undoStackRef.current.get(msg.undoKey) ?? null) : null}
                  onConfirm={() => handleConfirm(i)} onCancel={() => handleCancel(i)}
                  onUndo={msg.undoKey ? () => handleUndo(msg.undoKey!, i) : undefined}
                />
              )}
              {msg.queryResults && msg.role === 'assistant' && <QueryResultsCard results={msg.queryResults} description={msg.action?.payload?.description || ''} />}
            </div>
          </div>
        ))}

        {isLoading && !messages[messages.length - 1]?.streamingRaw && messages[messages.length - 1]?.streamingRaw !== '' && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5" /></div>
            <div className="bg-neutral-100 dark:bg-slate-800 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2 max-w-xs">
              {retryState ? (
                <><div className="relative w-5 h-5 shrink-0"><svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5"/><circle cx="10" cy="10" r="8" fill="none" stroke="#1A56DB" strokeWidth="2.5" strokeDasharray={`${2*Math.PI*8}`} strokeDashoffset={`${2*Math.PI*8*(1-retryState.countdown/retryState.total)}`} strokeLinecap="round" style={{transition:'stroke-dashoffset 1s linear'}}/></svg><span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-primary-600">{retryState.countdown}</span></div><div><p className="text-xs font-semibold text-neutral-700 leading-tight">Rate limit — retrying</p><p className="text-[10px] text-neutral-400">Attempt {retryState.attempt}/4</p></div></>
              ) : (
                <><Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400 shrink-0" /><span className="text-xs text-neutral-400">{loadingStatus}</span></>
              )}
            </div>
          </div>
        )}

        {!isLoading && pendingRetryMessage && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><AlertTriangle className="w-3.5 h-3.5" /></div>
            <div className="bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-2xl max-w-xs space-y-2">
              <p className="text-xs font-semibold text-amber-800">AI service busy</p>
              <button onClick={() => { const m = pendingRetryMessage; setPendingRetryMessage(null); handleSend(m); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95">
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/60 shrink-0">
        <div className="flex items-start gap-1.5 text-[10px] text-neutral-400">
          <AlertTriangle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
          <span>Write operations require confirmation. Queries reflect live Firestore data.</span>
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-[#0D1117] shrink-0 relative">
        {/* AI-N01: Slash command menu */}
        {showCommandMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50">
            <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100">Commands</p>
            {SLASH_CMDS.map((cmd, idx) => (
              <button key={idx} onClick={() => { setInput(cmd.template); setShowCommandMenu(false); inputRef.current?.focus(); }}
                className="w-full text-left px-3 py-2 text-xs text-neutral-700 dark:text-slate-300 hover:bg-primary-50 transition-colors font-medium">
                {cmd.label} <span className="text-neutral-400 font-normal ml-1">{cmd.template}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-neutral-100 dark:bg-slate-800 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-primary-500 transition-all">
          <textarea ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); setShowCommandMenu(e.target.value === '/'); }}
            onKeyDown={e => { if (e.key === 'Escape') setShowCommandMenu(false); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask anything… (/ for commands)"
            rows={1}
            className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 resize-none leading-relaxed"
            style={{ maxHeight: 96, overflowY: 'auto' }}
          />
          <button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
            className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl disabled:opacity-40 disabled:bg-neutral-400 transition-all active:scale-95 shrink-0 mb-0.5">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-neutral-300 dark:text-slate-600 text-center mt-1.5">Enter · Shift+Enter for new line · / for commands</p>
      </div>
    </div>
  );
};
