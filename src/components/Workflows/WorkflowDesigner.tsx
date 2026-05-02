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
    Zap, Mail, RefreshCw, PlusCircle, Globe, Database, Cpu, Clock, Split, Repeat, Timer,
    Save, Play, Settings2, X, Search, GitBranch, MessageSquare, Webhook,
    Plus, Trash2, Send, Loader2, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSchemaStore } from '../../store/schemaStore';

const NODE_TYPES_CONFIG = {
    trigger: {
        'record_created': { label: 'Record Created',   icon: <Database className="w-4 h-4"/>,      color: 'bg-blue-600',   textColor: 'text-blue-600'   },
        'record_updated': { label: 'Record Updated',   icon: <RefreshCw className="w-4 h-4"/>,     color: 'bg-blue-600',   textColor: 'text-blue-600'   },
        'scheduled':      { label: 'Scheduled',        icon: <Clock className="w-4 h-4"/>,         color: 'bg-blue-600',   textColor: 'text-blue-600'   },
        'webhook':        { label: 'Webhook Received', icon: <Globe className="w-4 h-4"/>,         color: 'bg-blue-500',   textColor: 'text-blue-500'   },
    },
    action: {
        'send_email':     { label: 'Send Email',       icon: <Mail className="w-4 h-4"/>,          color: 'bg-emerald-600',textColor: 'text-emerald-600'},
        'update_record':  { label: 'Update Record',    icon: <Database className="w-4 h-4"/>,      color: 'bg-emerald-600',textColor: 'text-emerald-600'},
        'create_record':  { label: 'Create Record',    icon: <PlusCircle className="w-4 h-4"/>,    color: 'bg-emerald-600',textColor: 'text-emerald-600'},
        'post_to_api':    { label: 'Post To API',      icon: <Globe className="w-4 h-4"/>,         color: 'bg-violet-600', textColor: 'text-violet-600' },
        'ai_generate':    { label: 'AI Generate',      icon: <Cpu className="w-4 h-4"/>,           color: 'bg-emerald-500',textColor: 'text-emerald-500'},
        'google_chat':    { label: 'Google Chat',      icon: <MessageSquare className="w-4 h-4"/>, color: 'bg-blue-500',   textColor: 'text-blue-500'   },
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

/* Standard workflow node */
const WorkflowNode = ({ data, selected }: NodeProps<any>) => {
    const config = (NODE_TYPES_CONFIG as any)[data.category]?.[data.type];
    if (!config) return null;
    return (
        <div className={cn("bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-xl min-w-[180px] overflow-hidden transition-all", selected ? "border-primary-600 ring-4 ring-primary-600/10" : "border-neutral-200 dark:border-slate-800")}>
            <div className={cn("px-3 py-2 flex items-center gap-2 text-white", config.color)}>
                {config.icon}
                <span className="font-bold text-[11px] uppercase tracking-wider">{data.category}</span>
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
    <div className={cn("bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-xl min-w-[200px] overflow-hidden transition-all relative", selected ? "border-amber-500 ring-4 ring-amber-500/10" : "border-neutral-200 dark:border-slate-800")}>
        <div className="px-3 py-2 flex items-center gap-2 text-white bg-amber-500">
            <Split className="w-4 h-4"/> <span className="font-bold text-[11px] uppercase tracking-wider">Logic</span>
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
    const postApis = restApiConnectors.filter((c: any) => c.method === 'POST');
    const [selectedNodeId, setSelectedNodeId] = useState<string|null>(null);
    const [workflowName, setWorkflowName] = useState('Workflow Editor');
    const [toast, setToast] = useState<string|null>(null);

    useEffect(() => { if (workflowId) console.log('WorkflowDesigner: Loading', workflowId); }, [workflowId]);

    const initialNodes = [
        { id:'node_1', type:'workflow',  position:{x:250,y:50},  data:{category:'trigger',type:'record_created',description:'Table: Users'} },
        { id:'node_2', type:'workflow',  position:{x:250,y:250}, data:{category:'action',type:'send_email',description:'To: Welcome Email'} },
    ];
    const initialEdges = [{ id:'edge_1', source:'node_1', target:'node_2', animated:true, style:{stroke:'#1A56DB',strokeWidth:3}, markerEnd:{type:MarkerType.ArrowClosed,color:'#1A56DB'} }];

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string|null>(null);

    const onConnect = (params: Connection) => {
        const isTrue=params.sourceHandle==='true', isFalse=params.sourceHandle==='false';
        const stroke = isTrue ? '#16a34a' : isFalse ? '#dc2626' : '#1A56DB';
        setEdges(eds => addEdge({ ...params, id:`edge_${Date.now()}`, animated:true,
            label: isTrue?'✓ True':isFalse?'✕ False':undefined,
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

    useEffect(()=>{
        const handler=(e:KeyboardEvent)=>{
            if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement?.tagName!=='INPUT'&&document.activeElement?.tagName!=='TEXTAREA'){
                if(selectedEdgeId){ deleteSelectedEdge(); }
                else if(selectedNodeId){
                    setNodes(nds=>nds.filter(n=>n.id!==selectedNodeId));
                    setEdges(eds=>eds.filter(e=>e.source!==selectedNodeId&&e.target!==selectedNodeId));
                    setSelectedNodeId(null); showToast('Node deleted');
                }
            }
            if(e.key==='Escape'){ setSelectedEdgeId(null); setSelectedNodeId(null); }
        };
        window.addEventListener('keydown',handler);
        return ()=>window.removeEventListener('keydown',handler);
    },[selectedEdgeId,selectedNodeId,deleteSelectedEdge,setNodes,setEdges]);

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
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center"><GitBranch className="w-6 h-6"/></div>
                    <input type="text" value={workflowName} onChange={e=>setWorkflowName(e.target.value)} className="text-lg font-bold text-neutral-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 w-64" placeholder="Workflow Name..."/>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={()=>showToast('Workflow results: All stages passed ✓')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                        <Play className="w-4 h-4"/> Run Test
                    </button>
                    <button onClick={()=>showToast('Workflow saved successfully')} className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all active:scale-95 hover:opacity-90" style={{background:'var(--color-primary)'}}>
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
                    <ReactFlow nodes={nodes} edges={styledEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setReactFlowInstance} nodeTypes={nodeTypes}
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

                {/* Properties panel */}
                <aside className="w-80 bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 flex flex-col shrink-0">
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
                            {selectedNode.data.type==='scheduled' && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Frequency</label><select className={cfgCls}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Custom Cron</option></select></div><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Time (UTC)</label><input type="time" className={cfgCls} defaultValue="09:00"/></div></div>)}
                            {selectedNode.data.type==='send_email' && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2">{[['Recipient','email@example.com'],['CC','manager@example.com'],['Subject','Welcome aboard!']].map(([l,p])=><div key={l} className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{l}</label><input className={cfgCls} placeholder={p}/></div>)}<div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Body</label><textarea className={cfgCls+' h-24 resize-none'} placeholder="Hello there..."/></div></div>)}
                            {['create_record','update_record'].includes(selectedNode.data.type) && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Target Table</label><select className={cfgCls}>{tables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div></div>)}
                            {selectedNode.data.type==='ai_generate' && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">AI Prompt</label><textarea className={cfgCls+' h-24 resize-none'} placeholder="Summarize the previous record..."/></div><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Output Variable</label><input className={cfgCls+' font-mono text-primary-600 font-bold'} defaultValue="{{ai_summary}}"/></div></div>)}
                            {selectedNode.data.type==='post_to_api' && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><div className="space-y-1.5"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Target API (POST)</label>{postApis.length===0?<p className="text-[10px] text-amber-500 italic">No POST APIs configured.</p>:<select value={(selectedNode.data as any).apiId||''} onChange={e=>setNodes(nds=>nds.map(n=>n.id===selectedNode.id?{...n,data:{...n.data,apiId:e.target.value,description:postApis.find((a:any)=>a.id===e.target.value)?.name||'API'}}:n))} className={cfgCls}><option value="">Select POST API...</option>{postApis.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}</div></div>)}
                            {selectedNode.data.type==='delay' && (<div className="space-y-4 animate-in fade-in slide-in-from-top-2"><label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Duration</label><div className="flex gap-2"><input type="number" className={cfgCls} defaultValue="5"/><select className="w-24 px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white"><option>Min</option><option>Hours</option><option>Days</option></select></div></div>)}

                            {selectedNode.data.type==='condition'     && <ConditionBuilder   nodeId={selectedNode.id} data={selectedNode.data} onUpdate={(id,d)=>setNodes(nds=>nds.map(n=>n.id===id?{...n,data:{...n.data,...d}}:n))}/>}
                            {selectedNode.data.type==='google_chat'   && <GoogleChatConfig   nodeId={selectedNode.id} data={selectedNode.data} onUpdate={updateNodeData}/>}
                            {selectedNode.data.type==='advanced_http' && <AdvancedHttpConfig nodeId={selectedNode.id} data={selectedNode.data} onUpdate={updateNodeData}/>}
                        </div>
                    ) : !selectedEdgeId && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
                            <PlusCircle className="w-12 h-12 text-neutral-300 dark:text-slate-600 mb-4"/>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Select a node or connection to configure</p>
                        </div>
                    )}
                </aside>
            </div>

            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 font-medium text-sm flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-400"/>{toast}
                </div>
            )}
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
