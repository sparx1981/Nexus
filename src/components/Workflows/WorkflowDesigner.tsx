import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  NodeProps, 
  Handle, 
  Position,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
    Zap, Mail, RefreshCw, PlusCircle, Globe, Database, Cpu, Clock, Split, Repeat, Timer, Inbox, KeyRound, Eye, EyeOff, Paperclip, ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, RotateCw,
    Save, Play, Settings2, X, Search, GitBranch, MessageSquare, Webhook, ScrollText, ToggleLeft, ToggleRight,
    Plus, Trash2, Send, Loader2, AlertCircle, CheckCircle2, XCircle, Table2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSchemaStore } from '../../store/schemaStore';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { startEmailPolling, startScheduledPolling } from '../../services/workflowService';

const NODE_TYPES_CONFIG = {
    trigger: {
        'record_created':  { label: 'Record Created',   icon: <Database className="w-4 h-4"/>,      color: 'bg-blue-600',   textColor: 'text-blue-600'   },
        'record_updated':  { label: 'Record Updated',   icon: <RefreshCw className="w-4 h-4"/>,     color: 'bg-blue-600',   textColor: 'text-blue-600'   },
        'scheduled':       { label: 'Scheduled',        icon: <Clock className="w-4 h-4"/>,         color: 'bg-blue-600',   textColor: 'text-blue-600'   },
        'webhook':         { label: 'Webhook Received', icon: <Globe className="w-4 h-4"/>,         color: 'bg-blue-500',   textColor: 'text-blue-500'   },
        'received_email':  { label: 'Received Email',   icon: <Inbox className="w-4 h-4"/>,         color: 'bg-violet-600', textColor: 'text-violet-600' },
    },
    action: {
        'send_email':     { label: 'Send Email',       icon: <Mail className="w-4 h-4"/>,          color: 'bg-emerald-600',textColor: 'text-emerald-600'},
        'update_record':  { label: 'Update Record',    icon: <Database className="w-4 h-4"/>,      color: 'bg-emerald-600',textColor: 'text-emerald-600'},
        'create_record':  { label: 'Create Record',    icon: <PlusCircle className="w-4 h-4"/>,    color: 'bg-emerald-600',textColor: 'text-emerald-600'},
        'post_to_api':    { label: 'Post To API',      icon: <Globe className="w-4 h-4"/>,         color: 'bg-violet-600', textColor: 'text-violet-600' },
        'ai_generate':    { label: 'AI Generate',      icon: <Cpu className="w-4 h-4"/>,           color: 'bg-emerald-500',textColor: 'text-emerald-500'},
        'google_chat':    { label: 'Google Chat',      icon: <MessageSquare className="w-4 h-4"/>, color: 'bg-blue-500',   textColor: 'text-blue-500'   },
        'google_sheets':  { label: 'Google Sheets',    icon: <Table2 className="w-4 h-4"/>,        color: 'bg-emerald-600',textColor: 'text-emerald-600'},
        'advanced_http':  { label: 'Advanced HTTP',    icon: <Webhook className="w-4 h-4"/>,       color: 'bg-indigo-600', textColor: 'text-indigo-600' },
    },
    logic: {
        'condition':      { label: 'Condition',        icon: <Split className="w-4 h-4"/>,         color: 'bg-amber-500',  textColor: 'text-amber-500'  },
        'loop':           { label: 'Loop',             icon: <Repeat className="w-4 h-4"/>,        color: 'bg-amber-500',  textColor: 'text-amber-500'  },
        'delay':          { label: 'Delay',            icon: <Timer className="w-4 h-4"/>,         color: 'bg-amber-500',  textColor: 'text-amber-500'  },
    }
} as const;

type ConditionRow   = { id: string; field: string; operator: string; value: string; logic?: 'AND'|'OR' };
type ConditionGroup = { id: string; conditions: ConditionRow[]; logic?: 'AND'|'OR' };
type HttpHeader     = { id: string; key: string; value: string };

/* G-08: Map node categories to CSS variables so they respect the active colour scheme */
const NODE_HEADER_STYLE: Record<string, React.CSSProperties> = {
    trigger:  { background: 'var(--color-primary)' },
    action:   { background: 'var(--color-primary)', filter: 'brightness(0.85)' },
    logic:    { background: 'var(--color-accent, #d97706)' },
};

/* Standard workflow node */
const WorkflowNode = ({ data, selected }: NodeProps<any>) => {
    const config = (NODE_TYPES_CONFIG as any)[data.category]?.[data.type];
    if (!config) return null;
    return (
        <div className={cn("bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-xl min-w-[180px] overflow-hidden transition-all group/node relative", selected ? "border-primary-600 ring-4 ring-primary-600/10" : "border-neutral-200 dark:border-slate-800")}>
            <div className="px-3 py-2 flex items-center justify-between gap-2 text-white" style={NODE_HEADER_STYLE[data.category] ?? { background: 'var(--color-primary)' }}>
                <div className="flex items-center gap-2">
                    {config.icon}
                    <span className="font-bold text-[11px] uppercase tracking-wider">{data.category}</span>
                </div>
                {/* Delete button — visible on hover or when selected */}
                {data.onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onDelete(data._nodeId); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Delete node"
                        className={cn(
                            "w-5 h-5 rounded-full bg-white/20 hover:bg-rose-500 flex items-center justify-center transition-all shrink-0",
                            selected ? "opacity-100" : "opacity-0 group-hover/node:opacity-100"
                        )}
                    >
                        <X className="w-3 h-3 text-white" />
                    </button>
                )}
            </div>
            <div className="p-4">
                <span className="text-sm font-bold text-neutral-900 dark:text-white block mb-1">{config.label}</span>
                <p className="text-[10px] text-neutral-400 dark:text-slate-500 font-medium truncate italic">{data.description || 'Configured'}</p>
            </div>
            <Handle type="target" position={Position.Top}    className="!w-2 !h-2 !bg-neutral-300 dark:!bg-slate-600 !border-white"/>
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-neutral-300 dark:!bg-slate-600 !border-white"/>
        </div>
    );
};

/* Condition node — dual output handles */
const ConditionNode = ({ data, selected }: NodeProps<any>) => (
    <div className={cn("bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-xl min-w-[200px] overflow-hidden transition-all relative group/node", selected ? "border-amber-500 ring-4 ring-amber-500/10" : "border-neutral-200 dark:border-slate-800")}>
        <div className="px-3 py-2 flex items-center justify-between gap-2 text-white" style={{ background: 'var(--color-accent, #d97706)' }}>
            <div className="flex items-center gap-2"><Split className="w-4 h-4"/> <span className="font-bold text-[11px] uppercase tracking-wider">Logic</span></div>
            {data.onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); data.onDelete(data._nodeId); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Delete node"
                    className={cn("w-5 h-5 rounded-full bg-white/20 hover:bg-rose-500 flex items-center justify-center transition-all shrink-0", selected ? "opacity-100" : "opacity-0 group-hover/node:opacity-100")}
                ><X className="w-3 h-3 text-white" /></button>
            )}
        </div>
        <div className="p-4 pb-7">
            <span className="text-sm font-bold text-neutral-900 dark:text-white block mb-1">Condition</span>
            <p className="text-[10px] text-neutral-400 dark:text-slate-500 font-medium italic">{data.description || 'If / Else branch'}</p>
        </div>
        <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-neutral-300 dark:!bg-slate-600 !border-white"/>
        <Handle type="source" position={Position.Bottom} id="true"  style={{ left:'30%', background:'#16a34a', borderColor:'#fff', width:10, height:10 }} className="!border-2"/>
        <Handle type="source" position={Position.Bottom} id="false" style={{ left:'70%', background:'#dc2626', borderColor:'#fff', width:10, height:10 }} className="!border-2"/>
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-around px-3 pointer-events-none">
            <span className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5"/>True</span>
            <span className="text-[9px] font-black text-rose-600 flex items-center gap-0.5"><XCircle className="w-2.5 h-2.5"/>False</span>
        </div>
    </div>
);

const nodeTypes = { workflow: WorkflowNode, condition: ConditionNode };


/* ConditionBuilder */
function ConditionBuilder({ nodeId, data, onUpdate }: { nodeId: string; data: any; onUpdate: (id: string, d: any) => void }) {
    const [groups, setGroups] = useState<ConditionGroup[]>(data.conditionGroups || [
        { id: 'g1', conditions: [{ id: 'c1', field: '', operator: 'eq', value: '' }] }
    ]);
    const save = (g: ConditionGroup[]) => { setGroups(g); onUpdate(nodeId, { ...data, conditionGroups: g, description: describe(g) }); };
    const describe = (g: ConditionGroup[]) => { const s = g.map((gr,i)=>{const r=gr.conditions.map((c,j)=>`${j>0?c.logic+' ':''}${c.field} ${c.operator} "${c.value}"`).join(' '); return `${i>0?gr.logic+' ':''}${gr.conditions.length>1?`(${r})`:r}`; }).join(' '); return s.substring(0,60)+(s.length>60?'…':''); };
    const addGroup   = () => save([...groups, { id:`g${Date.now()}`, logic:'AND', conditions:[{ id:`c${Date.now()}`, field:'', operator:'eq', value:'', logic:'AND' }] }]);
    const removeGroup= (gid:string) => save(groups.filter(g=>g.id!==gid));
    const setGLogic  = (gid:string, l:'AND'|'OR') => save(groups.map(g=>g.id===gid?{...g,logic:l}:g));
    const addRow     = (gid:string) => save(groups.map(g=>g.id===gid?{...g,conditions:[...g.conditions,{id:`c${Date.now()}`,field:'',operator:'eq',value:'',logic:'AND' as const}]}:g));
    const removeRow  = (gid:string, cid:string) => save(groups.map(g=>g.id===gid?{...g,conditions:g.conditions.filter(c=>c.id!==cid)}:g));
    const updateRow  = (gid:string, cid:string, p:Partial<ConditionRow>) => save(groups.map(g=>g.id===gid?{...g,conditions:g.conditions.map(c=>c.id===cid?{...c,...p}:c)}:g));
    const OPS = [['eq','= Equals'],['neq','≠ Not Equals'],['gt','> Greater'],['gte','≥ Greater/Eq'],['lt','< Less'],['lte','≤ Less/Eq'],['contains','⊃ Contains'],['empty','∅ Empty'],['not_empty','✓ Not Empty']];
    const inp = "w-full px-2 py-1.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none text-neutral-900 dark:text-white";
    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            {groups.map((group, gi) => (
                <React.Fragment key={group.id}>
                    {gi > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-neutral-200 dark:bg-slate-700"/>
                            <select value={group.logic} onChange={e=>setGLogic(group.id,e.target.value as 'AND'|'OR')} className="text-[10px] font-black px-2 py-0.5 rounded-md border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-600 dark:text-slate-400 outline-none">
                                <option>AND</option><option>OR</option>
                            </select>
                            <div className="flex-1 h-px bg-neutral-200 dark:bg-slate-700"/>
                        </div>
                    )}
                    <div className="rounded-xl border-2 border-dashed border-neutral-200 dark:border-slate-700 bg-neutral-50/60 dark:bg-slate-800/40 p-3 space-y-2 relative">
                        {groups.length > 1 && <button onClick={()=>removeGroup(group.id)} className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600"><X className="w-3 h-3"/></button>}
                        <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">{group.conditions.length > 1 ? 'Group (parenthesized)' : 'Group'}</p>
                        {group.conditions.map((row, ri) => (
                            <React.Fragment key={row.id}>
                                {ri > 0 && (
                                    <div className="flex justify-center">
                                        <select value={row.logic} onChange={e=>updateRow(group.id,row.id,{logic:e.target.value as 'AND'|'OR'})} className="text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 outline-none">
                                            <option>AND</option><option>OR</option>
                                        </select>
                                    </div>
                                )}
                                <div className="flex gap-1.5 items-start">
                                    <div className="flex-1 grid grid-cols-3 gap-1">
                                        <input value={row.field}    onChange={e=>updateRow(group.id,row.id,{field:e.target.value})}    placeholder="field"  className={inp}/>
                                        <select value={row.operator} onChange={e=>updateRow(group.id,row.id,{operator:e.target.value})} className={inp}>{OPS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
                                        <input value={row.value}    onChange={e=>updateRow(group.id,row.id,{value:e.target.value})}    placeholder="value" className={cn(inp,(row.operator==='empty'||row.operator==='not_empty')&&'opacity-30 pointer-events-none')}/>
                                    </div>
                                    {group.conditions.length > 1 && <button onClick={()=>removeRow(group.id,row.id)} className="mt-1 text-neutral-300 hover:text-rose-500 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>}
                                </div>
                            </React.Fragment>
                        ))}
                        <button onClick={()=>addRow(group.id)} className="w-full py-1 text-[9px] font-bold text-amber-600 border border-dashed border-amber-300 rounded-lg hover:bg-amber-50 transition-colors">+ Add Row</button>
                    </div>
                </React.Fragment>
            ))}
            <button onClick={addGroup} className="w-full py-1.5 text-[9px] font-bold text-violet-600 border border-dashed border-violet-300 rounded-lg hover:bg-violet-50 transition-colors flex items-center justify-center gap-1"><Plus className="w-3 h-3"/> Add Group (parentheses)</button>
            <div className="rounded-xl border border-neutral-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 space-y-1.5">
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Branch Behaviour</p>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"/><span className="text-[10px] font-medium text-neutral-600 dark:text-slate-400"><strong className="text-emerald-600">True</strong> handle — continues workflow</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"/><span className="text-[10px] font-medium text-neutral-600 dark:text-slate-400"><strong className="text-rose-600">False</strong> handle — terminates if unconnected</span></div>
            </div>
        </div>
    );
}


/* GoogleSheetsConfig — MAJ-03 */
function GoogleSheetsConfig({ nodeId, data, onUpdate }: { nodeId: string; data: any; onUpdate: (id: string, d: any) => void }) {
    const inp = 'w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none text-neutral-900 dark:text-white';
    const [fieldMappings, setFieldMappings] = React.useState<{id:string;column:string;value:string}[]>(
        data.sheetFieldMappings || [{ id: 'fm_0', column: '', value: '' }]
    );
    const updateMappings = (mappings: typeof fieldMappings) => {
        setFieldMappings(mappings);
        onUpdate(nodeId, { ...data, sheetFieldMappings: mappings });
    };
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-700 dark:text-amber-300">
                Authenticate via your Google account. The workflow will append a new row when triggered.
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">OAuth Token</label>
                <input value={data.sheetsToken||''} onChange={e=>onUpdate(nodeId,{...data,sheetsToken:e.target.value})} placeholder="ya29...." className={inp+' font-mono'} type="password"/>
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Spreadsheet ID</label>
                <input value={data.spreadsheetId||''} onChange={e=>onUpdate(nodeId,{...data,spreadsheetId:e.target.value})} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" className={inp+' font-mono'}/>
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Sheet Name / Tab</label>
                <input value={data.sheetName||''} onChange={e=>onUpdate(nodeId,{...data,sheetName:e.target.value})} placeholder="Sheet1" className={inp}/>
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Column → Value mapping</label>
                    <button onClick={() => updateMappings([...fieldMappings, { id:`fm_${Date.now()}`, column:'', value:'' }])}
                        className="text-[10px] font-bold text-primary-600 hover:underline">+ Add</button>
                </div>
                {fieldMappings.map((fm,i) => (
                    <div key={fm.id} className="flex gap-2 items-center">
                        <input value={fm.column} onChange={e => updateMappings(fieldMappings.map((m,j)=>j===i?{...m,column:e.target.value}:m))} placeholder="Column name" className={inp+' flex-1'}/>
                        <span className="text-neutral-300 text-xs">→</span>
                        <input value={fm.value} onChange={e => updateMappings(fieldMappings.map((m,j)=>j===i?{...m,value:e.target.value}:m))} placeholder="{{record.name}}" className={inp+' flex-1 font-mono'}/>
                        {fieldMappings.length > 1 && (
                            <button onClick={() => updateMappings(fieldMappings.filter((_,j)=>j!==i))} className="text-rose-400 hover:text-rose-600">
                                <X className="w-3.5 h-3.5"/>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}


/* GoogleChatConfig */
function GoogleChatConfig({ nodeId, data, onUpdate }: { nodeId: string; data: any; onUpdate: (id: string, d: any) => void }) {
    const TOKENS = ['{{record.name}}','{{record.id}}','{{record.status}}','{{trigger.user}}','{{workflow.name}}','{{timestamp}}'];
    const msgRef = useRef<HTMLTextAreaElement>(null);
    const insertToken = (t: string) => {
        const el = msgRef.current; if (!el) return;
        const s = el.selectionStart ?? el.value.length;
        const v = el.value.slice(0,s)+t+el.value.slice(el.selectionEnd ?? s);
        onUpdate(nodeId, { ...data, chatMessage: v });
        setTimeout(()=>{ el.focus(); el.setSelectionRange(s+t.length,s+t.length); },0);
    };
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Webhook URL</label>
                <input value={data.chatWebhook||''} onChange={e=>onUpdate(nodeId,{...data,chatWebhook:e.target.value})} placeholder="https://chat.googleapis.com/v1/spaces/..." className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none text-neutral-900 dark:text-white"/>
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Thread Key (optional)</label>
                <input value={data.chatThread||''} onChange={e=>onUpdate(nodeId,{...data,chatThread:e.target.value})} placeholder="my-thread or {{record.id}}" className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none text-neutral-900 dark:text-white"/>
                <p className="text-[9px] text-neutral-400 italic">Same key groups messages into one thread.</p>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Message Body</label>
                <div className="flex flex-wrap gap-1.5">{TOKENS.map(t=><button key={t} onClick={()=>insertToken(t)} className="px-2 py-0.5 text-[9px] font-bold rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">{t}</button>)}</div>
                <textarea ref={msgRef} value={data.chatMessage||''} onChange={e=>onUpdate(nodeId,{...data,chatMessage:e.target.value})} placeholder="🔔 New record: {{record.name}} by {{trigger.user}}" className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none h-24 resize-none text-neutral-900 dark:text-white"/>
                <p className="text-[9px] text-neutral-400 italic">Click a token to insert at cursor position.</p>
            </div>
        </div>
    );
}

/* AdvancedHttpConfig */
function AdvancedHttpConfig({ nodeId, data, onUpdate }: { nodeId: string; data: any; onUpdate: (id: string, d: any) => void }) {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{status:number;body:string}|null>(null);
    const [testError, setTestError] = useState<string|null>(null);
    const headers: HttpHeader[] = data.httpHeaders || [];
    const method = data.httpMethod || 'GET';
    const url    = data.httpUrl    || '';
    const body   = data.httpBody   || '';
    const addH   = () => onUpdate(nodeId,{...data,httpHeaders:[...headers,{id:`h${Date.now()}`,key:'',value:''}]});
    const delH   = (id:string) => onUpdate(nodeId,{...data,httpHeaders:headers.filter(h=>h.id!==id)});
    const updH   = (id:string, p:Partial<HttpHeader>) => onUpdate(nodeId,{...data,httpHeaders:headers.map(h=>h.id===id?{...h,...p}:h)});
    const runTest = async () => {
        if (!url) { setTestError('URL is required'); return; }
        setTesting(true); setTestResult(null); setTestError(null);
        try {
            const hdrs: Record<string,string> = {'Content-Type':'application/json'};
            headers.filter(h=>h.key).forEach(h=>{ hdrs[h.key]=h.value; });
            const opts: RequestInit = { method, headers: hdrs };
            if (['POST','PUT','PATCH'].includes(method) && body) opts.body = body;
            const res = await fetch(url, opts);
            const text = await res.text();
            setTestResult({ status: res.status, body: text.substring(0,500) });
        } catch (e: any) { setTestError(e.message||'Request failed'); }
        finally { setTesting(false); }
    };
    const inp = "w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none text-neutral-900 dark:text-white";
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-2">
                <div className="w-28">
                    <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Method</label>
                    <select value={method} onChange={e=>onUpdate(nodeId,{...data,httpMethod:e.target.value})} className={inp}>
                        {['GET','POST','PUT','DELETE','PATCH'].map(m=><option key={m}>{m}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest block mb-1">URL</label>
                    <input value={url} onChange={e=>onUpdate(nodeId,{...data,httpUrl:e.target.value})} placeholder="https://api.example.com/endpoint" className={inp+' font-mono'}/>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Headers</label>
                    <button onClick={addH} className="text-[9px] font-bold text-primary-600 hover:underline">+ Add</button>
                </div>
                {headers.length===0 && <p className="text-[10px] text-neutral-400 italic">No custom headers.</p>}
                {headers.map(h=>(
                    <div key={h.id} className="flex gap-1.5 items-center">
                        <input value={h.key}   onChange={e=>updH(h.id,{key:e.target.value})}   placeholder="Key"   className="flex-1 px-2 py-1.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none text-neutral-900 dark:text-white"/>
                        <span className="text-neutral-300 text-xs">:</span>
                        <input value={h.value} onChange={e=>updH(h.id,{value:e.target.value})} placeholder="Value" className="flex-1 px-2 py-1.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none text-neutral-900 dark:text-white"/>
                        <button onClick={()=>delH(h.id)} className="text-neutral-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                ))}
            </div>
            {['POST','PUT','PATCH'].includes(method) && (
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Body (JSON)</label>
                    <textarea value={body} onChange={e=>onUpdate(nodeId,{...data,httpBody:e.target.value})} placeholder={'{\n  "key": "{{record.name}}"\n}'} className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none h-28 resize-none text-neutral-900 dark:text-white"/>
                </div>
            )}
            <button onClick={runTest} disabled={testing||!url} className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl font-bold text-xs transition-all active:scale-95 hover:opacity-90 disabled:opacity-50 text-white" style={{background:'var(--color-primary)'}}>
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
                {testing ? 'Sending…' : 'Test Request'}
            </button>
            {testResult && (
                <div className={cn("rounded-xl p-3 text-[10px] font-mono space-y-1 border", testResult.status>=200&&testResult.status<300 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30" : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30")}>
                    <p className={cn("font-black text-xs", testResult.status>=200&&testResult.status<300 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>HTTP {testResult.status}</p>
                    <pre className="text-neutral-600 dark:text-slate-400 whitespace-pre-wrap break-all leading-relaxed max-h-24 overflow-y-auto">{testResult.body}</pre>
                </div>
            )}
            {testError && (
                <div className="rounded-xl p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5"/>
                    <p className="text-[10px] font-medium text-rose-700 dark:text-rose-400">{testError}</p>
                </div>
            )}
        </div>
    );
}


/* Main WorkflowDesigner */
interface WorkflowDesignerProps { workflowId: string; onBack: () => void; }

export function WorkflowDesigner({ workflowId, onBack }: WorkflowDesignerProps) {
    const { tables, restApiConnectors } = useSchemaStore();
    const { selectedProjectId } = useAuthStore();
    const postApis = restApiConnectors.filter((c: any) => c.method === 'POST');
    const [selectedNodeId, setSelectedNodeId] = useState<string|null>(null);
    const [workflowName, setWorkflowName] = useState('Workflow Editor');
    const [workflowStatus, setWorkflowStatus] = useState<'draft'|'active'>('draft');
    const [toast, setToast] = useState<string|null>(null);
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [configPanelOpen, setConfigPanelOpen] = useState(true);

    // Undo/redo history for nodes/edges
    const wfHistory = React.useRef<{ nodes: any[]; edges: any[] }[]>([]);
    const wfHistoryIdx = React.useRef(-1);
    const isUndoRedoing = React.useRef(false);

    const pushHistory = React.useCallback((n: any[], e: any[]) => {
        if (isUndoRedoing.current) return;
        // Trim forward history
        wfHistory.current = wfHistory.current.slice(0, wfHistoryIdx.current + 1);
        wfHistory.current.push({ nodes: JSON.parse(JSON.stringify(n)), edges: JSON.parse(JSON.stringify(e)) });
        if (wfHistory.current.length > 50) wfHistory.current.shift();
        wfHistoryIdx.current = wfHistory.current.length - 1;
    }, []);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const wfUndo = React.useCallback(() => {
        if (wfHistoryIdx.current <= 0) return;
        isUndoRedoing.current = true;
        wfHistoryIdx.current -= 1;
        const snap = wfHistory.current[wfHistoryIdx.current];
        setNodes(snap.nodes); setEdges(snap.edges);
        setTimeout(() => { isUndoRedoing.current = false; }, 0);
    }, [setNodes, setEdges]);

    const wfRedo = React.useCallback(() => {
        if (wfHistoryIdx.current >= wfHistory.current.length - 1) return;
        isUndoRedoing.current = true;
        wfHistoryIdx.current += 1;
        const snap = wfHistory.current[wfHistoryIdx.current];
        setNodes(snap.nodes); setEdges(snap.edges);
        setTimeout(() => { isUndoRedoing.current = false; }, 0);
    }, [setNodes, setEdges]);

    // Load workflow data from Firestore
    useEffect(() => {
        if (!workflowId || !selectedProjectId) return;
        getDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', workflowId)).then(snap => {
            if (snap.exists()) {
                const data = snap.data();
                setWorkflowName(data.name || 'Workflow Editor');
                setWorkflowStatus(data.status || 'draft');
                if (data.nodes?.length > 0) {
                    setNodes(data.nodes);
                    setTimeout(() => pushHistory(data.nodes, data.edges || []), 0);
                } else setNodes([
                    { id:'node_1', type:'workflow', position:{x:300,y:120}, data:{category:'trigger',type:'record_created',description:'Choose a trigger…'} },
                ]);
                if (data.edges?.length > 0) setEdges(data.edges);
                else setEdges([]);
            }
        });
    }, [workflowId, selectedProjectId]);

    // Load logs when log panel opens
    useEffect(() => {
        if (!showLogs || !selectedProjectId || !workflowId) return;
        setLoadingLogs(true);
        const q = query(
            collection(db, 'workspaces', selectedProjectId, 'workflowLogs'),
            orderBy('triggeredAt', 'desc'),
            limit(50)
        );
        const unsub = onSnapshot(q, snap => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setLogs(all.filter((l: any) => l.workflowId === workflowId));
            setLoadingLogs(false);
        });
        return () => unsub();
    }, [showLogs, selectedProjectId, workflowId]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string|null>(null);

    const onConnect = (params: Connection) => {
        const isTrue=params.sourceHandle==='true', isFalse=params.sourceHandle==='false';
        const stroke = isTrue ? '#16a34a' : isFalse ? '#dc2626' : '#1A56DB';
        setEdges(eds => addEdge({ ...params, id:`edge_${Date.now()}`, animated:true,
            label: isTrue?'✓ True':isFalse?'✕ False':null,
            labelStyle:{fontSize:9,fontWeight:700,fill:stroke},
            labelBgStyle:{fill:isTrue?'#f0fdf4':isFalse?'#fef2f2':'#eff6ff',fillOpacity:0.9},
            style:{stroke,strokeWidth:3}, markerEnd:{type:MarkerType.ArrowClosed,color:stroke} }, eds));
        showToast('Connection created');
    };

    const onEdgeClick = useCallback((_:any, edge:any)=>{ setSelectedEdgeId(edge.id); setSelectedNodeId(null); },[]);
    const deleteSelectedEdge = useCallback(()=>{ if(selectedEdgeId){ setEdges(eds=>eds.filter(e=>e.id!==selectedEdgeId)); setSelectedEdgeId(null); showToast('Connection deleted'); } },[selectedEdgeId,setEdges]);

    const styledEdges = edges.map(e=>({
        ...e,
        style:{...e.style, stroke:e.id===selectedEdgeId?'#ef4444':e.style?.stroke, strokeWidth:e.id===selectedEdgeId?4:3},
        markerEnd:{type:MarkerType.ArrowClosed, color:e.id===selectedEdgeId?'#ef4444':(e.markerEnd as any)?.color},
        label:e.id===selectedEdgeId?'✕ click to delete':e.label,
        labelStyle:e.id===selectedEdgeId?{fontSize:9,fill:'#ef4444',fontWeight:700}:e.labelStyle,
        labelBgStyle:e.id===selectedEdgeId?{fill:'#fff1f1',fillOpacity:0.9}:e.labelBgStyle,
    }));

    // Auto-expand/collapse config panel
    useEffect(() => {
        if (selectedNodeId || selectedEdgeId) setConfigPanelOpen(true);
        else setConfigPanelOpen(false);
    }, [selectedNodeId, selectedEdgeId]);

    useEffect(()=>{
        const handler=(e:KeyboardEvent)=>{
            if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement?.tagName!=='INPUT'&&document.activeElement?.tagName!=='TEXTAREA'){
                if(selectedEdgeId){ deleteSelectedEdge(); }
                else if(selectedNodeId){
                    // Push history before deletion
                    pushHistory(nodes, edges);
                    setNodes(nds=>nds.filter(n=>n.id!==selectedNodeId));
                    setEdges(eds=>eds.filter(e=>e.source!==selectedNodeId&&e.target!==selectedNodeId));
                    setSelectedNodeId(null); showToast('Node deleted');
                }
            }
            if(e.key==='Escape'){ setSelectedEdgeId(null); setSelectedNodeId(null); }
            // Undo/Redo
            if((e.metaKey||e.ctrlKey)&&e.key==='z'&&!e.shiftKey){ e.preventDefault(); wfUndo(); }
            if((e.metaKey||e.ctrlKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){ e.preventDefault(); wfRedo(); }
        };
        window.addEventListener('keydown',handler);
        return ()=>window.removeEventListener('keydown',handler);
    },[selectedEdgeId,selectedNodeId,deleteSelectedEdge,setNodes,setEdges,wfUndo,wfRedo,pushHistory,nodes,edges]);

    const onDragOver = useCallback((e:any)=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; },[]);
    const onDrop = useCallback((event:any)=>{
        event.preventDefault();
        const type=event.dataTransfer.getData('application/reactflow/type');
        const category=event.dataTransfer.getData('application/reactflow/category');
        if(!type) return;
        const position=reactFlowInstance.screenToFlowPosition({x:event.clientX,y:event.clientY});
        setNodes(nds=>nds.concat({ id:`node_${Date.now()}`, type:type==='condition'?'condition':'workflow', position, data:{category,type,description:(NODE_TYPES_CONFIG as any)[category][type].label} }));
    },[reactFlowInstance,setNodes]);

    const showToast=(msg:string)=>{ setToast(msg); setTimeout(()=>setToast(null),3000); };
    const selectedNode = nodes.find(n=>n.id===selectedNodeId);
    const updateNodeData=(id:string,d:any)=>setNodes(nds=>nds.map(n=>n.id===id?{...n,data:{...n.data,...d}}:n));

    const cfgCls = "w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white";

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-50 dark:bg-slate-950 text-neutral-900 dark:text-slate-100 transition-colors duration-300">
            <div className="h-14 border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-6 justify-between shrink-0 z-20">
                <div className="flex items-center gap-3">
                    {/* Back to Workflows */}
                    <button onClick={onBack}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Back to Workflows list"
                    >
                        <ArrowLeft className="w-3.5 h-3.5"/>
                        <span className="hidden sm:inline">Workflows</span>
                    </button>
                    <div className="h-5 w-px bg-neutral-200 dark:bg-slate-700"/>
                    {/* Undo / Redo */}
                    <button onClick={wfUndo} disabled={wfHistoryIdx.current <= 0} title="Undo (Ctrl+Z)"
                        className={cn("p-1.5 rounded-lg transition-colors", wfHistoryIdx.current > 0 ? "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800" : "text-neutral-200 dark:text-slate-700 cursor-not-allowed")}>
                        <RotateCcw className="w-4 h-4"/>
                    </button>
                    <button onClick={wfRedo} disabled={wfHistoryIdx.current >= wfHistory.current.length - 1} title="Redo (Ctrl+Shift+Z)"
                        className={cn("p-1.5 rounded-lg transition-colors", wfHistoryIdx.current < wfHistory.current.length - 1 ? "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800" : "text-neutral-200 dark:text-slate-700 cursor-not-allowed")}>
                        <RotateCw className="w-4 h-4"/>
                    </button>
                    <div className="h-5 w-px bg-neutral-200 dark:bg-slate-700"/>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center"><GitBranch className="w-6 h-6"/></div>
                    <input type="text" value={workflowName} onChange={e=>setWorkflowName(e.target.value)} className="text-lg font-bold text-neutral-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 w-48" placeholder="Workflow Name..."/>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={()=>showToast('Workflow results: All stages passed ✓')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                        <Play className="w-4 h-4"/> Run Test
                    </button>
                    {/* Activate/Deactivate toggle */}
                    <button
                        onClick={async()=>{
                            if(!selectedProjectId||!workflowId) return;
                            const ns = workflowStatus==='active'?'draft':'active';
                            await setDoc(doc(db,'workspaces',selectedProjectId,'workflows',workflowId),{status:ns},{merge:true});
                            setWorkflowStatus(ns);
                            // Restart pollers so draft workflows immediately stop and active ones start
                            startEmailPolling(selectedProjectId).catch(console.error);
                            startScheduledPolling(selectedProjectId).catch(console.error);
                            showToast(ns==='active'?'Workflow activated — will now trigger on events':'Workflow set to draft — will no longer run');
                        }}
                        className={cn("flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border",
                            workflowStatus==='active'?"border-emerald-300 text-emerald-600 bg-emerald-50 hover:bg-emerald-100":"border-neutral-300 text-neutral-500 bg-white hover:bg-neutral-50"
                        )}
                    >
                        {workflowStatus==='active'?<ToggleRight className="w-4 h-4"/>:<ToggleLeft className="w-4 h-4"/>}
                        {workflowStatus==='active'?'Active':'Draft'}
                    </button>
                    <button
                        onClick={()=>setShowLogs(s=>!s)}
                        className={cn("flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border",
                            showLogs?"border-violet-300 text-violet-600 bg-violet-50":"border-neutral-200 text-neutral-500 bg-white hover:bg-neutral-50"
                        )}
                    >
                        <ScrollText className="w-4 h-4"/> Logs
                    </button>
                    <button onClick={async()=>{
                        if(!selectedProjectId||!workflowId) return;
                        try {
                            // Sanitize: Firestore rejects undefined values — replace with null
                            const sanitize = (v: any): any => {
                                if (v === undefined) return null;
                                if (v === null || typeof v !== 'object') return v;
                                if (Array.isArray(v)) return v.map(sanitize);
                                return Object.fromEntries(
                                    Object.entries(v)
                                        .filter(([k]) => !['__rf','positionAbsolute','selected','dragging'].includes(k))
                                        .map(([k,val]) => [k, sanitize(val)])
                                );
                            };
                            await setDoc(doc(db,'workspaces',selectedProjectId,'workflows',workflowId),{
                                name:workflowName,
                                nodes: sanitize(nodes),
                                edges: sanitize(edges),
                                updatedAt:serverTimestamp()
                            },{merge:true});
                            showToast('Workflow saved successfully');
                        } catch(e:any){ console.error('Save error',e); showToast('Save failed: '+e.message); }
                    }} className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all active:scale-95 hover:opacity-90" style={{background:'var(--color-primary)'}}>
                        <Save className="w-4 h-4"/> Save Workflow
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar palette */}
                <aside className="w-64 bg-white dark:bg-slate-900 border-r border-neutral-200 dark:border-slate-800 flex flex-col shrink-0">
                    <div className="p-4 border-b border-neutral-200 dark:border-slate-800">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/>
                            <input type="text" placeholder="Search steps..." className="w-full pl-9 pr-3 py-1.5 bg-neutral-100 dark:bg-slate-800 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-600/20 text-neutral-900 dark:text-slate-200"/>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <PaletteCategory title="Triggers" category="trigger"/>
                        <PaletteCategory title="Actions"  category="action"/>
                        <PaletteCategory title="Logic"    category="logic"/>
                    </div>
                </aside>

                {/* Canvas */}
                <div className="flex-1 relative dark:bg-slate-950" onDrop={onDrop} onDragOver={onDragOver}>
                    <ReactFlow nodes={nodes.map(n => ({
                        ...n,
                        data: {
                            ...n.data,
                            _nodeId: n.id,
                            onDelete: (id: string) => {
                                setNodes(nds => nds.filter(nd => nd.id !== id));
                                setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
                                setSelectedNodeId(null);
                                showToast('Node deleted');
                            }
                        }
                    }))} edges={styledEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setReactFlowInstance} nodeTypes={nodeTypes}
                        onNodeClick={(_,node)=>{ setSelectedNodeId(node.id); setSelectedEdgeId(null); }}
                        onEdgeClick={onEdgeClick} onPaneClick={()=>{ setSelectedNodeId(null); setSelectedEdgeId(null); }}
                        deleteKeyCode={null} fitView connectionLineStyle={{stroke:'#1A56DB',strokeWidth:2,strokeDasharray:'6 3'}}>
                        <Background color={document.documentElement.classList.contains('dark')?'#334155':'#cbd5e1'}/>
                        <Controls className="dark:bg-slate-800 dark:border-slate-700"/>
                        <Panel position="bottom-right" className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-xl mb-4 mr-4 space-y-2">
                            <div className="flex items-center gap-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600"/> Trigger</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-600"/> Action</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"/> Logic</span>
                            </div>
                            <div className="border-t border-neutral-100 dark:border-slate-800 pt-2 text-[9px] text-neutral-400 space-y-0.5">
                                <p>• Condition: <span className="text-emerald-600 font-bold">True</span> (left) / <span className="text-rose-600 font-bold">False</span> (right) handles</p>
                                <p>• Press <kbd className="bg-neutral-100 px-1 rounded text-[8px]">Delete</kbd> to remove selection</p>
                            </div>
                            {selectedEdgeId && <button onClick={deleteSelectedEdge} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase transition-colors"><X className="w-3 h-3"/> Delete Connection</button>}
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties panel — collapsible */}
                <aside className={cn("bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-300 relative",
                    configPanelOpen ? "w-80" : "w-10"
                )}>
                    {/* Collapse toggle */}
                    <button
                        onClick={() => setConfigPanelOpen(p => !p)}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-full flex items-center justify-center z-10 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                        title={configPanelOpen ? 'Collapse panel' : 'Expand panel'}
                    >
                        {configPanelOpen ? <ChevronRight className="w-3 h-3 text-neutral-400"/> : <ChevronLeft className="w-3 h-3 text-neutral-400"/>}
                    </button>
                    {configPanelOpen && (<>
                    <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-neutral-900 dark:text-white text-sm">{selectedEdgeId?'Connection':'Step Config'}</h3>
                        <Settings2 className="w-4 h-4 text-neutral-400"/>
                    </div>

                    {selectedEdgeId && !selectedNode && (
                        <div className="p-6 space-y-4">
                            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20">
                                <p className="text-xs font-bold text-rose-700 mb-1">Connection Selected</p>
                                <p className="text-[10px] text-rose-500 font-medium">{(()=>{const e=edges.find(ed=>ed.id===selectedEdgeId);if(!e) return '';const s=nodes.find(n=>n.id===e.source),t=nodes.find(n=>n.id===e.target);const sl=s?(NODE_TYPES_CONFIG as any)[s.data.category]?.[s.data.type]?.label:e.source,tl=t?(NODE_TYPES_CONFIG as any)[t.data.category]?.[t.data.type]?.label:e.target;return `${sl} → ${tl}`;})()}</p>
                            </div>
                            <button onClick={deleteSelectedEdge} className="w-full py-2.5 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-colors"><X className="w-4 h-4"/> Delete Connection</button>
                        </div>
                    )}

                    {selectedNode ? (
                        <div className="p-5 space-y-5 overflow-y-auto flex-1">
                            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
                                <div className={cn("p-2 rounded-lg text-white",(NODE_TYPES_CONFIG as any)[selectedNode.data.category]?.[selectedNode.data.type]?.color)}>{(NODE_TYPES_CONFIG as any)[selectedNode.data.category]?.[selectedNode.data.type]?.icon}</div>
                                <div><h4 className="font-bold text-neutral-900 dark:text-white text-sm">{(NODE_TYPES_CONFIG as any)[selectedNode.data.category]?.[selectedNode.data.type]?.label}</h4><p className="text-[10px] text-neutral-400 uppercase font-bold">{selectedNode.data.category}</p></div>
                            </div>

                            {selectedNode.data.type==='record_created' && (<div className="space-y-1.5 animate-in fade-in slide-in-from-top-2"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Target Table</label><select value={(selectedNode.data as any).tableId||''} onChange={e=>setNodes(nds=>nds.map(n=>n.id===selectedNode.id?{...n,data:{...n.data,tableId:e.target.value,description:`Table: ${tables.find(t=>t.id===e.target.value)?.name||e.target.value}`}}:n))} className={cfgCls}><option value="">Select table...</option>{tables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>)}
                            {selectedNode.data.type==='webhook' && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Webhook ID</label><input className={cfgCls} value={selectedNode.id} readOnly/></div><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Secret Key</label><input className={cfgCls+' font-mono'} type="password" defaultValue="sk_test_12345"/></div></div>)}
                            {selectedNode.data.type==='scheduled' && (() => {
                                const freq = (selectedNode.data as any).frequency || 'Daily';
                                const time = (selectedNode.data as any).scheduleTime || '09:00';
                                const hourlyEvery = (selectedNode.data as any).hourlyEvery || '1';
                                const hourlyMinute = (selectedNode.data as any).hourlyMinute || '00';
                                const updateSched = (patch: Record<string,string>) => setNodes((nds: any[]) => nds.map((n: any) => n.id === selectedNode.id ? { ...n, data: { ...n.data, ...patch } } : n));
                                return (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Frequency</label>
                                            <select value={freq} onChange={e => updateSched({ frequency: e.target.value })} className={cfgCls}>
                                                <option>Hourly</option>
                                                <option>Daily</option>
                                                <option>Weekly</option>
                                                <option>Monthly</option>
                                                <option>Custom Cron</option>
                                            </select>
                                        </div>
                                        {freq === 'Hourly' ? (
                                            <div className="flex gap-3">
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Every N hours</label>
                                                    <input type="number" min="1" max="23" value={hourlyEvery} onChange={e => updateSched({ hourlyEvery: e.target.value })} className={cfgCls} />
                                                </div>
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Starting at minute</label>
                                                    <select value={hourlyMinute} onChange={e => updateSched({ hourlyMinute: e.target.value })} className={cfgCls}>
                                                        <option value="00">:00</option>
                                                        <option value="15">:15</option>
                                                        <option value="30">:30</option>
                                                        <option value="45">:45</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Time (UTC)</label>
                                                <input type="time" value={time} onChange={e => updateSched({ scheduleTime: e.target.value })} className={cfgCls} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            {selectedNode.data.type==='send_email' && <EmailNodeConfig nodeId={selectedNode.id} data={selectedNode.data} setNodes={setNodes} cfgCls={cfgCls} />}
                            {['create_record','update_record'].includes(selectedNode.data.type) && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Target Table</label><select className={cfgCls}>{tables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div></div>)}
                            {selectedNode.data.type==='ai_generate' && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">AI Prompt</label><textarea className={cfgCls+' h-24 resize-none'} placeholder="Summarize the previous record..."/></div><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Output Variable</label><input className={cfgCls+' font-mono text-primary-600 font-bold'} defaultValue="{{ai_summary}}"/></div></div>)}
                            {selectedNode.data.type==='post_to_api' && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Target API (POST)</label>{postApis.length===0?<p className="text-[10px] text-amber-500 italic">No POST APIs configured.</p>:<select value={(selectedNode.data as any).apiId||''} onChange={e=>setNodes(nds=>nds.map(n=>n.id===selectedNode.id?{...n,data:{...n.data,apiId:e.target.value,description:postApis.find((a:any)=>a.id===e.target.value)?.name||'API'}}:n))} className={cfgCls}><option value="">Select POST API...</option>{postApis.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}</div></div>)}
                            {selectedNode.data.type==='delay' && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Duration</label><div className="flex gap-2"><input type="number" className={cfgCls} defaultValue="5"/><select className="w-24 px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white"><option>Min</option><option>Hours</option><option>Days</option></select></div></div>)}

                            {selectedNode.data.type==='condition'     && <ConditionBuilder   nodeId={selectedNode.id} data={selectedNode.data} onUpdate={(id,d)=>setNodes(nds=>nds.map(n=>n.id===id?{...n,data:{...n.data,...d}}:n))}/>}
                            {selectedNode.data.type==='google_chat'    && <GoogleChatConfig     nodeId={selectedNode.id} data={selectedNode.data} onUpdate={updateNodeData}/>}
                            {selectedNode.data.type==='google_sheets'  && <GoogleSheetsConfig   nodeId={selectedNode.id} data={selectedNode.data} onUpdate={updateNodeData}/>}
                            {selectedNode.data.type==='received_email'  && <ReceivedEmailConfig  nodeId={selectedNode.id} data={selectedNode.data} setNodes={setNodes} cfgCls={cfgCls}/>}
                            {selectedNode.data.type==='advanced_http' && <AdvancedHttpConfig nodeId={selectedNode.id} data={selectedNode.data} onUpdate={updateNodeData}/>}
                        </div>
                    ) : !selectedEdgeId && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
                            <PlusCircle className="w-12 h-12 text-neutral-300 dark:text-slate-600 mb-4"/>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Select a node or connection to configure</p>
                        </div>
                    )}
                    </>)}
                </aside>
            </div>

            {/* Logs panel */}
            {showLogs && (
                <div className="fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 z-[150] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
                    <div className="px-5 py-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ScrollText className="w-5 h-5 text-violet-500"/>
                            <h3 className="font-bold text-neutral-900 dark:text-white text-sm">Workflow Logs</h3>
                            <span className="px-2 py-0.5 text-[9px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-full uppercase">{logs.length} entries</span>
                        </div>
                        <button onClick={()=>setShowLogs(false)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4 text-neutral-400"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loadingLogs && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-300"/></div>}
                        {!loadingLogs && logs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                                <ScrollText className="w-10 h-10 text-neutral-300 mb-3"/>
                                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">No logs yet</p>
                                <p className="text-[10px] text-neutral-400 mt-1">Logs appear here when the workflow is triggered</p>
                            </div>
                        )}
                        {logs.map((log:any)=>(
                            <div key={log.id} className={cn("rounded-xl border overflow-hidden",
                                log.status==='success'?"border-emerald-200 dark:border-emerald-900/30":"border-rose-200 dark:border-rose-900/30"
                            )}>
                                <div className={cn("px-4 py-2.5 flex items-center justify-between",
                                    log.status==='success'?"bg-emerald-50 dark:bg-emerald-950/20":"bg-rose-50 dark:bg-rose-950/20"
                                )}>
                                    <div className="flex items-center gap-2">
                                        {log.status==='success'
                                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/>
                                            : <AlertCircle className="w-3.5 h-3.5 text-rose-600"/>}
                                        <span className={cn("text-xs font-bold",log.status==='success'?"text-emerald-700":"text-rose-700")}>
                                            {log.status==='success'?'Success':'Error'}
                                        </span>
                                        <span className="text-[10px] text-neutral-400 font-mono">{log.tableName || log.tableId}</span>
                                    </div>
                                    <span className="text-[9px] text-neutral-400 font-mono">
                                        {log.triggeredAt?.toDate ? log.triggeredAt.toDate().toLocaleString() : '—'}
                                    </span>
                                </div>
                                <div className="p-3 space-y-1.5 bg-white dark:bg-slate-900">
                                    {(log.steps||[]).map((step:any, si:number)=>(
                                        <div key={si} className="flex items-start gap-2 text-[10px]">
                                            <span className={cn("mt-0.5 w-1.5 h-1.5 rounded-full shrink-0",
                                                step.status==='success'?"bg-emerald-500":step.status==='error'?"bg-rose-500":"bg-neutral-300"
                                            )}/>
                                            <span className="font-bold text-neutral-600 dark:text-slate-400 w-28 shrink-0 truncate">{step.nodeLabel}</span>
                                            <span className="text-neutral-400 dark:text-slate-500 font-mono flex-1">{step.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 font-medium text-sm flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-400"/>{toast}
                </div>
            )}
        </div>
    );
}


/* EmailNodeConfig — Gmail OAuth + webhook fallback */
function EmailNodeConfig({ nodeId, data, setNodes, cfgCls }: { nodeId: string; data: any; setNodes: any; cfgCls: string }) {
    const [connecting, setConnecting] = React.useState(false);

    const updateData = (updates: Record<string, any>) => {
        setNodes((nds: any[]) => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n));
    };

    const oauthHook = useGoogleClientId();
    const handleGmailConnect = () => {
        if (!oauthHook.clientId) return;
        setConnecting(true);
        openGmailOAuthPopup(
            oauthHook.clientId,
            (token, email) => { updateData({ gmailToken: token, gmailEmail: email, emailWebhook: '' }); setConnecting(false); },
            (_err) => setConnecting(false)
        );
    };

    const handleDisconnect = () => updateData({ gmailToken: null, gmailEmail: null });

    const inp = cfgCls;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            {/* ── Google Account ── */}
            <div className="rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-neutral-50 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Send From (Google Account)</p>
                </div>
                <div className="p-3">
                    {data.gmailToken ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-neutral-900 dark:text-white">Connected</p>
                                    {data.gmailEmail && <p className="text-[10px] text-neutral-400 dark:text-slate-500 font-mono">{data.gmailEmail}</p>}
                                </div>
                            </div>
                            <button onClick={handleDisconnect} className="text-[10px] font-bold text-rose-500 hover:underline">Disconnect</button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Google Client ID setup — shown when not configured */}
                            <div className="mb-2"><GoogleClientIdSetup {...oauthHook} /></div>
                            <button
                                onClick={handleGmailConnect}
                                disabled={connecting || !oauthHook.clientId}
                                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-neutral-200 dark:border-slate-600 rounded-xl text-sm font-bold text-neutral-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-40 shadow-sm"
                            >
                                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                )}
                                {connecting ? 'Connecting…' : 'Connect Google Account'}
                            </button>
                            <p className="text-[9px] text-neutral-400 dark:text-slate-500 italic text-center">
                                Sends emails from your Gmail account. Or use a webhook below.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Fallback: Webhook ── */}
            {!data.gmailToken && (
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                        — or — Webhook URL
                    </label>
                    <input
                        className={inp+' font-mono text-xs'}
                        placeholder="https://your-email-api.com/send  (SendGrid, Mailgun, Zapier…)"
                        value={data.emailWebhook||''}
                        onChange={e=>updateData({ emailWebhook: e.target.value })}
                    />
                    <p className="text-[9px] text-neutral-400 dark:text-slate-500 italic leading-relaxed">
                        POSTs {"{"}"to", "subject", "body", "cc"{"}"} JSON to your endpoint.
                    </p>
                </div>
            )}

            {/* ── Email fields ── */}
            {[['emailTo','Recipient *','user@example.com'],['emailCc','CC (optional)','manager@example.com'],['emailSubject','Subject','Welcome aboard!']].map(([field,label,ph])=>(
                <div key={field} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{label}</label>
                    <input
                        className={inp}
                        placeholder={ph}
                        value={data[field]||''}
                        onChange={e=>updateData({ [field]: e.target.value, ...(field==='emailTo'?{description:`To: ${e.target.value}`}:{}) })}
                    />
                </div>
            ))}
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Body</label>
                <textarea
                    className={inp+' h-24 resize-none'}
                    placeholder={"Hello {{record.name}}! A new record was created…"}
                    value={data.emailBody||''}
                    onChange={e=>updateData({ emailBody: e.target.value })}
                />
                <p className="text-[9px] text-neutral-400 dark:text-slate-500 italic">Use {"{{record.fieldName}}"} to insert record values.</p>
            </div>
        </div>
    );
}


/* ── Shared Google OAuth helper ──────────────────────────────────────────── */
/* Reads client ID from Firestore workspace settings → local storage fallback */
async function loadGoogleClientId(selectedProjectId: string | null): Promise<string> {
    if (!selectedProjectId) return '';
    try {
        const { getDoc, doc: fsDoc } = await import('firebase/firestore');
        const snap = await getDoc(fsDoc(db, 'workspaces', selectedProjectId, 'settings', 'oauth'));
        if (snap.exists()) return snap.data()?.googleClientId || '';
    } catch (_) {}
    return '';
}

async function saveGoogleClientId(selectedProjectId: string | null, clientId: string) {
    if (!selectedProjectId) return;
    const { setDoc, doc: fsDoc } = await import('firebase/firestore');
    await setDoc(fsDoc(db, 'workspaces', selectedProjectId, 'settings', 'oauth'),
        { googleClientId: clientId }, { merge: true });
}

function useGoogleClientId() {
    const { selectedProjectId } = useAuthStore();
    const [clientId, setClientId] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState('');

    React.useEffect(() => {
        loadGoogleClientId(selectedProjectId).then(id => { setClientId(id); setDraft(id); });
    }, [selectedProjectId]);

    const save = async () => {
        setSaving(true);
        await saveGoogleClientId(selectedProjectId, draft);
        setClientId(draft);
        setSaving(false);
        setEditing(false);
    };

    return { clientId, draft, setDraft, editing, setEditing, saving, save };
}

/* ── Shared Gmail OAuth popup ────────────────────────────────────────────── */
function openGmailOAuthPopup(clientId: string, onSuccess: (token: string, email: string) => void, onError: (msg: string) => void) {
    if (!clientId) {
        onError('NO_CLIENT_ID');
        return;
    }
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${window.location.origin}/oauth/google/callback`,
        response_type: 'token',
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send email profile',
        include_granted_scopes: 'true',
    });
    const popup = window.open(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 'GoogleOAuth', 'width=520,height=620,top=100,left=200');
    if (!popup) { onError('Popup blocked — please allow popups for this site.'); return; }
    const poll = setInterval(() => {
        try {
            if (!popup || popup.closed) { clearInterval(poll); return; }
            const url = popup.location.href;
            if (url.includes('access_token')) {
                const hash = new URLSearchParams(popup.location.hash.slice(1));
                const token = hash.get('access_token') || '';
                const email = hash.get('email') || '';
                if (token) { popup.close(); clearInterval(poll); onSuccess(token, email); }
            }
        } catch (_) { /* cross-origin — keep polling */ }
    }, 300);
}

/* ── Google Client ID Setup widget ──────────────────────────────────────── */
function GoogleClientIdSetup({ clientId, draft, setDraft, editing, setEditing, saving, save }: ReturnType<typeof useGoogleClientId>) {
    const [show, setShow] = React.useState(false);
    if (clientId && !editing) return (
        <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
            <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0"/>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Google OAuth configured</span>
            </div>
            <button onClick={()=>{ setDraft(clientId); setEditing(true); }} className="text-[10px] text-neutral-400 hover:text-neutral-600 font-bold">Change</button>
        </div>
    );
    return (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 overflow-hidden">
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0"/>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Google OAuth Client ID required</p>
            </div>
            <div className="p-3 space-y-2">
                <p className="text-[9px] text-neutral-500 dark:text-slate-400 leading-relaxed">
                    <strong>One-time setup:</strong> In <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-500 underline">Google Cloud Console</a>, create an <em>OAuth 2.0 Client ID</em> (Web application type). Add <code className="bg-neutral-100 dark:bg-slate-700 px-1 rounded text-[9px]">{window.location.origin}</code> as an authorised JavaScript origin and <code className="bg-neutral-100 dark:bg-slate-700 px-1 rounded text-[9px]">{window.location.origin}/oauth/google/callback</code> as a redirect URI. Enable the Gmail API in your project.
                </p>
                <div className="flex gap-2">
                    <input
                        type={show?'text':'password'}
                        placeholder="Paste Client ID here…"
                        value={draft}
                        onChange={e=>setDraft(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg text-[10px] font-mono outline-none"
                    />
                    <button onClick={()=>setShow(s=>!s)} className="p-1.5 text-neutral-400 hover:text-neutral-600">
                        {show?<EyeOff className="w-3.5 h-3.5"/>:<Eye className="w-3.5 h-3.5"/>}
                    </button>
                    <button onClick={save} disabled={!draft||saving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold disabled:opacity-50">
                        {saving?'…':'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}


/* ── ReceivedEmailConfig ─────────────────────────────────────────────────── */
function ReceivedEmailConfig({ nodeId, data, setNodes, cfgCls }: { nodeId: string; data: any; setNodes: any; cfgCls: string }) {
    const { selectedProjectId } = useAuthStore();
    const oauthHook = useGoogleClientId();
    const [connecting, setConnecting] = React.useState(false);
    const [testResult, setTestResult] = React.useState<string|null>(null);

    const update = (updates: Record<string, any>) =>
        setNodes((nds: any[]) => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n));

    const handleConnect = () => {
        if (!oauthHook.clientId) return;
        setConnecting(true);
        openGmailOAuthPopup(
            oauthHook.clientId,
            (token, email) => { update({ gmailToken: token, gmailEmail: email }); setConnecting(false); },
            (err) => { setConnecting(false); console.error(err); }
        );
    };

    const handleTest = async () => {
        if (!data.gmailToken) return;
        setTestResult('Checking inbox…');
        try {
            const filters: string[] = ['is:unread'];
            if (data.filterFrom)    filters.push(`from:${data.filterFrom}`);
            if (data.filterCc)      filters.push(`cc:${data.filterCc}`);
            if (data.hasAttachment) filters.push('has:attachment');
            const q = encodeURIComponent(filters.join(' '));
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=5`, {
                headers: { Authorization: `Bearer ${data.gmailToken}` }
            });
            if (res.status === 401) { setTestResult('Token expired — please reconnect.'); return; }
            const json = await res.json();
            const count = json.messages?.length || 0;
            setTestResult(count > 0 ? `✓ Found ${count} matching email(s) in inbox` : '✓ Connected — no matching emails yet');
        } catch (e: any) {
            setTestResult(`Error: ${e.message}`);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">

            {/* ── How it works ── */}
            <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-900/30 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-400">How it works</p>
                <p className="text-[9px] text-violet-600 dark:text-violet-300 leading-relaxed">
                    When this workflow is <strong>Active</strong>, Nexus polls your Gmail inbox on the configured schedule. Matching emails are converted to a JSON payload — use <code className="bg-violet-100 dark:bg-violet-900/40 px-1 rounded">{"{{email.from}}"}</code>, <code className="bg-violet-100 dark:bg-violet-900/40 px-1 rounded">{"{{email.subject}}"}</code>, <code className="bg-violet-100 dark:bg-violet-900/40 px-1 rounded">{"{{email.body}}"}</code>, <code className="bg-violet-100 dark:bg-violet-900/40 px-1 rounded">{"{{email.date}}"}</code> in downstream nodes.
                </p>
            </div>

            {/* ── Google Client ID setup ── */}
            <GoogleClientIdSetup {...oauthHook} />

            {/* ── Gmail account connection ── */}
            <div className="rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-neutral-50 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Monitor Gmail Account</p>
                </div>
                <div className="p-3">
                    {data.gmailToken ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-neutral-900 dark:text-white">Connected</p>
                                        {data.gmailEmail && <p className="text-[10px] font-mono text-neutral-400">{data.gmailEmail}</p>}
                                    </div>
                                </div>
                                <button onClick={()=>update({ gmailToken: null, gmailEmail: null })} className="text-[10px] font-bold text-rose-500 hover:underline">Disconnect</button>
                            </div>
                            <button onClick={handleTest} className="w-full py-1.5 text-[10px] font-bold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors">
                                Test connection
                            </button>
                            {testResult && <p className="text-[9px] text-neutral-500 font-mono">{testResult}</p>}
                        </div>
                    ) : (
                        <button
                            onClick={handleConnect}
                            disabled={connecting || !oauthHook.clientId}
                            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-neutral-200 dark:border-slate-600 rounded-xl text-sm font-bold text-neutral-700 dark:text-slate-200 hover:border-violet-500 hover:text-violet-600 transition-all disabled:opacity-40 shadow-sm"
                        >
                            {connecting ? <Loader2 className="w-4 h-4 animate-spin"/> : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            )}
                            {connecting ? 'Connecting…' : 'Connect Google Account'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Email Filters</p>
                {[
                    ['filterFrom','From (filter)','sender@example.com'],
                    ['filterSubject','Subject contains','Invoice'],
                    ['filterCc','CC includes','team@example.com'],
                ] .map(([field, label, ph]) => (
                    <div key={field} className="space-y-1">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{label}</label>
                        <input className={cfgCls} placeholder={ph} value={data[field]||''} onChange={e=>update({ [field]: e.target.value })}/>
                    </div>
                ))}
            </div>

            {/* ── Attachment options ── */}
            <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Attachments</p>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div onClick={()=>update({ hasAttachment: !data.hasAttachment })}
                        className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${data.hasAttachment?'bg-violet-600':'bg-neutral-200 dark:bg-slate-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${data.hasAttachment?'translate-x-4':'translate-x-0'}`}/>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-neutral-700 dark:text-slate-200">Must have attachment</p>
                        <p className="text-[9px] text-neutral-400">Only trigger when email has file(s) attached</p>
                    </div>
                </label>
                {data.hasAttachment && (
                    <label className="flex items-center gap-3 cursor-pointer select-none ml-1">
                        <div onClick={()=>update({ downloadAttachment: !data.downloadAttachment })}
                            className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${data.downloadAttachment?'bg-violet-600':'bg-neutral-200 dark:bg-slate-700'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${data.downloadAttachment?'translate-x-4':'translate-x-0'}`}/>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-neutral-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Paperclip className="w-3 h-3 text-violet-500"/> Download attachment
                            </p>
                            <p className="text-[9px] text-neutral-400">Fetches attachment as base64 → <code>{"{{email.attachmentData}}"}</code></p>
                        </div>
                    </label>
                )}
            </div>

            {/* ── Poll interval ── */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">Poll Interval</label>
                <select
                    value={data.pollInterval||'5'}
                    onChange={e=>update({ pollInterval: e.target.value })}
                    className={cfgCls}
                >
                    <option value="1">Every 1 minute</option>
                    <option value="5">Every 5 minutes</option>
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every hour</option>
                </select>
                <p className="text-[9px] text-neutral-400 italic">Polling runs while this browser tab is open. For 24/7 polling, deploy a Nexus backend worker.</p>
            </div>

        </div>
    );
}

/* PaletteCategory */
function PaletteCategory({ title, category }: { title: string; category: string }) {
    const items = (NODE_TYPES_CONFIG as any)[category];
    const onDragStart = (event: any, nodeType: string, nodeCategory: string) => {
        event.dataTransfer.setData('application/reactflow/type', nodeType);
        event.dataTransfer.setData('application/reactflow/category', nodeCategory);
        event.dataTransfer.effectAllowed = 'move';
    };
    return (
        <section>
            <h4 className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest mb-3">{title}</h4>
            <div className="space-y-2">
                {Object.entries(items).map(([type, config]: [string, any]) => (
                    <div key={type} draggable onDragStart={e=>onDragStart(e,type,category)}
                        className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-100 dark:border-slate-700 rounded-xl hover:border-primary-600 dark:hover:border-primary-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group">
                        <div className={cn("p-1.5 rounded-lg text-white", config.color)}>{config.icon}</div>
                        <span className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">{config.label}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
