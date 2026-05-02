import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
    Background, 
    Controls, 
    Connection, 
    Edge, 
    addEdge, 
    Node,
    Handle,
    Position,
    Panel,
    useNodesState,
    useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
    Save, 
    Play, 
    Database, 
    Zap, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Settings2, 
    X,
    Plus,
    GripVertical,
    Trash2,
    Search,
    ChevronDown,
    ArrowRight,
    Activity,
    Mail,
    Bell,
    Share2,
    Calendar,
    Globe,
    Code,
    Layout
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useProjectSettingsStore } from '../../store/projectSettingsStore';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';

// ─── Custom Node Components ──────────────────────────────────────────────────

const TriggerNode = ({ data, selected }: { data: any, selected?: boolean }) => (
    <div className={cn(
        "px-4 py-3 rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-xl transition-all w-64",
        selected ? "border-amber-500 ring-4 ring-amber-500/10" : "border-neutral-100 dark:border-slate-800"
    )}>
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Trigger</p>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{data.label}</h4>
            </div>
        </div>
        <p className="text-[10px] text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">{data.description || 'Starts the workflow sequence.'}</p>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500 border-2 border-white dark:border-slate-900" />
    </div>
);

const ActionNode = ({ data, selected }: { data: any, selected?: boolean }) => (
    <div className={cn(
        "px-4 py-3 rounded-2xl border-2 bg-white dark:bg-slate-900 shadow-xl transition-all w-64",
        selected ? "border-primary-600 ring-4 ring-primary-600/10" : "border-neutral-100 dark:border-slate-800"
    )}>
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary-600 border-2 border-white dark:border-slate-900" />
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                {data.icon || <Activity className="w-5 h-5 text-primary-600" />}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Action</p>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{data.label}</h4>
            </div>
        </div>
        <p className="text-[10px] text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">{data.description || 'Applies logic or updates data.'}</p>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary-600 border-2 border-white dark:border-slate-900" />
    </div>
);

const ConditionNode = ({ data, selected }: { data: any, selected?: boolean }) => (
    <div className={cn(
        "px-4 py-4 rounded-3xl border-2 bg-white dark:bg-slate-900 shadow-xl transition-all w-72",
        selected ? "border-indigo-500 ring-4 ring-indigo-500/10" : "border-neutral-100 dark:border-slate-800"
    )}>
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-500 border-2 border-white dark:border-slate-900" />
        <div className="text-center">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Condition</p>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 italic px-4">"Is {data.condition || 'Status Active'}?"</h4>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="relative pt-2">
                    <span className="text-[9px] font-black uppercase text-emerald-600 mb-1 block">TRUE</span>
                    <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900" style={{ left: '25%' }} />
                </div>
                <div className="relative pt-2">
                    <span className="text-[9px] font-black uppercase text-rose-600 mb-1 block">FALSE</span>
                    <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 bg-rose-500 border-2 border-white dark:border-slate-900" style={{ left: '75%' }} />
                </div>
            </div>
        </div>
    </div>
);

const nodeTypes = {
    triggerNode: TriggerNode,
    actionNode: ActionNode,
    conditionNode: ConditionNode,
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorkflowDesigner({ workflowId, onBack }: { workflowId: string, onBack: () => void }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [workflow, setWorkflow] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showProperties, setShowProperties] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const { selectedProjectId } = useAuthStore();
    const { settings: ps } = useProjectSettingsStore();

    // Load workflow from Firestore
    useEffect(() => {
        if (!selectedProjectId || !workflowId) return;

        const unsub = onSnapshot(doc(db, 'workspaces', selectedProjectId, 'workflows', workflowId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setWorkflow(data);
                if (data.nodes) setNodes(data.nodes);
                if (data.edges) setEdges(data.edges);
            }
        });

        return () => unsub();
    }, [selectedProjectId, workflowId, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { strokeWidth: 2, stroke: '#6366f1' } }, eds)),
        [setEdges]
    );

    const saveWorkflow = async () => {
        if (!selectedProjectId || !workflowId) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', workflowId), {
                nodes,
                edges,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setIsSaving(false), 800);
        }
    };

    const addNode = (type: keyof typeof nodeTypes, label: string) => {
        const newNode: Node = {
            id: `${type}_${Math.random().toString(36).substr(2, 4)}`,
            type,
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { label, description: 'Double click to edit properties.' },
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const deleteNode = () => {
        if (!selectedNodeId) return;
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
        setSelectedNodeId(null);
        setShowProperties(false);
    };

    const onNodeClick = (_: any, node: Node) => {
        setSelectedNodeId(node.id);
        setShowProperties(true);
    };

    const onPaneClick = () => {
        setSelectedNodeId(null);
        setShowProperties(false);
    };

    return (
        <div className="flex-1 flex overflow-hidden h-full relative">
            {/* Left Toolbar */}
            <aside className="w-64 border-r flex flex-col shrink-0 bg-white dark:bg-slate-900 border-neutral-100 dark:border-slate-800 transition-colors duration-300">
                <div className="p-4 border-b border-neutral-100 dark:border-slate-800">
                    <h3 className="font-bold text-neutral-900 dark:text-white text-sm">Node Palette</h3>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Drag components to canvas</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <PaletteSection title="Triggers">
                        <PaletteItem 
                            label="On New Record" 
                            icon={<Plus className="w-4 h-4 text-amber-600" />} 
                            onClick={() => addNode('triggerNode', 'On New Record')}
                        />
                        <PaletteItem 
                            label="On Update" 
                            icon={<Clock className="w-4 h-4 text-emerald-600" />} 
                            onClick={() => addNode('triggerNode', 'On Update')}
                        />
                        <PaletteItem 
                            label="Scheduled" 
                            icon={<Calendar className="w-4 h-4 text-indigo-600" />} 
                            onClick={() => addNode('triggerNode', 'Daily Check')}
                        />
                    </PaletteSection>

                    <PaletteSection title="Actions">
                        <PaletteItem 
                            label="Send Email" 
                            icon={<Mail className="w-4 h-4 text-sky-600" />} 
                            onClick={() => addNode('actionNode', 'Send Welcome Email')}
                        />
                        <PaletteItem 
                            label="Send Notification" 
                            icon={<Bell className="w-4 h-4 text-rose-600" />} 
                            onClick={() => addNode('actionNode', 'Notify Admin')}
                        />
                        <PaletteItem 
                            label="Update Record" 
                            icon={<Database className="w-4 h-4 text-primary-600" />} 
                            onClick={() => addNode('actionNode', 'Update Status')}
                        />
                        <PaletteItem 
                            label="External Webhook" 
                            icon={<Globe className="w-4 h-4 text-neutral-600" />} 
                            onClick={() => addNode('actionNode', 'Trigger Hook')}
                        />
                        <PaletteItem 
                            label="Execute Script" 
                            icon={<Code className="w-4 h-4 text-violet-600" />} 
                            onClick={() => addNode('actionNode', 'JS Script')}
                        />
                    </PaletteSection>

                    <PaletteSection title="Logic">
                        <PaletteItem 
                            label="Exclusive Gate" 
                            icon={<CheckCircle2 className="w-4 h-4 text-indigo-600" />} 
                            onClick={() => addNode('conditionNode', 'Check Credit')}
                        />
                    </PaletteSection>
                </div>

                <div className="p-4 border-t border-neutral-100 dark:border-slate-800">
                    <button 
                        onClick={onBack}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                        <ArrowRight className="w-4 h-4 rotate-180" /> Back to List
                    </button>
                </div>
            </aside>

            {/* Canvas */}
            <div className="flex-1 relative transition-colors duration-300" style={{ background: "var(--bg-primary)" }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    fitView
                    className="workflow-canvas"
                >
                    <Background color="#cbd5e1" gap={20} size={1} />
                    <Controls className="bg-white dark:bg-slate-900 border-neutral-100 dark:border-slate-800 rounded-xl shadow-xl" />
                    
                    <Panel position="top-right" className="flex items-center gap-2">
                         <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-2xl border border-neutral-100 dark:border-slate-800">
                             <div className="flex items-center gap-4 px-2">
                                 <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                     <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Draft</span>
                                 </div>
                                 <div className="h-4 w-[1px] bg-neutral-200 dark:bg-slate-800"></div>
                                 <p className="text-xs font-bold text-neutral-900 dark:text-white whitespace-nowrap">{workflow?.name || 'Loading Workflow...'}</p>
                             </div>
                             <div className="flex items-center gap-1">
                                <button 
                                    onClick={saveWorkflow}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-4 py-2 text-neutral-500 dark:text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shadow-md"
                                    style={{ background: 'var(--project-btn-standard)' }}
                                >
                                    {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isSaving ? 'Saving...' : 'Save Workflow'}
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all active:scale-95 shadow-md">
                                    <Play className="w-4 h-4" /> Run Test
                                </button>
                             </div>
                         </div>
                    </Panel>
                </ReactFlow>

                {/* Properties Overlay */}
                {showProperties && selectedNodeId && (
                    <div className="absolute top-4 left-4 z-40 animate-in slide-in-from-left-4 duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-slate-800 w-72 overflow-hidden">
                            <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="font-bold text-neutral-900 dark:text-white">Node Properties</h3>
                                <button onClick={() => setShowProperties(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg text-neutral-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Label</label>
                                    <input 
                                        type="text" 
                                        value={nodes.find(n => n.id === selectedNodeId)?.data.label || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, label: val } } : n));
                                        }}
                                        className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600/20 text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Description</label>
                                    <textarea 
                                        rows={3}
                                        value={nodes.find(n => n.id === selectedNodeId)?.data.description || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, description: val } } : n));
                                        }}
                                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary-600/20 text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div className="pt-4 border-t border-neutral-100 dark:border-slate-800">
                                    <button 
                                        onClick={deleteNode}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all border border-rose-100 dark:border-rose-900/30 shadow-sm"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Node
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Internal Sub-components ─────────────────────────────────────────────────

function PaletteSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{title}</h4>
            <div className="space-y-1">
                {children}
            </div>
        </div>
    );
}

function PaletteItem({ label, icon, onClick }: { label: string, icon: React.ReactNode, onClick: () => void }) {
    return (
        <button 
            draggable
            onClick={onClick}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-neutral-100 dark:hover:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-all group text-left shadow-sm hover:shadow-md"
        >
            <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-neutral-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{label}</span>
            <ArrowRight className="w-3 h-3 text-neutral-300 ml-auto opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
        </button>
    );
}
