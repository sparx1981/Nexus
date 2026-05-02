import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
    Zap, 
    Mail, 
    RefreshCw, 
    PlusCircle, 
    Globe, 
    Database, 
    Cpu, 
    Clock, 
    Split, 
    Repeat, 
    Timer,
    Save,
    Play,
    Settings2,
    X,
    ChevronRight,
    Search,
    GitBranch
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSchemaStore } from '../../store/schemaStore';

const NODE_TYPES_CONFIG = {
    trigger: {
        'record_created': { label: 'Record Created', icon: <Database className="w-4 h-4" />, color: 'bg-blue-600', textColor: 'text-blue-600' },
        'record_updated': { label: 'Record Updated', icon: <RefreshCw className="w-4 h-4" />, color: 'bg-blue-600', textColor: 'text-blue-600' },
        'scheduled': { label: 'Scheduled', icon: <Clock className="w-4 h-4" />, color: 'bg-blue-600', textColor: 'text-blue-600' },
        'webhook': { label: 'Webhook Received', icon: <Globe className="w-4 h-4" />, color: 'bg-blue-500', textColor: 'text-blue-500' },
    },
    action: {
        'send_email': { label: 'Send Email', icon: <Mail className="w-4 h-4" />, color: 'bg-emerald-600', textColor: 'text-emerald-600' },
        'update_record': { label: 'Update Record', icon: <Database className="w-4 h-4" />, color: 'bg-emerald-600', textColor: 'text-emerald-600' },
        'create_record': { label: 'Create Record', icon: <PlusCircle className="w-4 h-4" />, color: 'bg-emerald-600', textColor: 'text-emerald-600' },
        'post_to_api': { label: 'Post To API', icon: <Globe className="w-4 h-4" />, color: 'bg-violet-600', textColor: 'text-violet-600' },
        'ai_generate': { label: 'AI Generate', icon: <Cpu className="w-4 h-4" />, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
    },
    logic: {
        'condition': { label: 'Condition', icon: <Split className="w-4 h-4" />, color: 'bg-amber-500', textColor: 'text-amber-500' },
        'loop': { label: 'Loop', icon: <Repeat className="w-4 h-4" />, color: 'bg-amber-500', textColor: 'text-amber-500' },
        'delay': { label: 'Delay', icon: <Timer className="w-4 h-4" />, color: 'bg-amber-500', textColor: 'text-amber-500' },
    }
};

const WorkflowNode = ({ data, selected }: NodeProps<any>) => {
    const config = (NODE_TYPES_CONFIG as any)[data.category][data.type];
    
    return (
        <div className={cn(
            "bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-xl min-w-[180px] overflow-hidden transition-all",
            selected ? "border-primary-600 ring-4 ring-primary-600/10 dark:ring-primary-400/20" : "border-neutral-200 dark:border-slate-800"
        )}>
            <div className={cn("px-3 py-2 flex items-center gap-2 text-white", config.color)}>
                {config.icon}
                <span className="font-bold text-[11px] uppercase tracking-wider">{data.category}</span>
            </div>
            <div className="p-4">
                <span className="text-sm font-bold text-neutral-900 dark:text-white block mb-1">{config.label}</span>
                <p className="text-[10px] text-neutral-400 dark:text-slate-500 font-medium truncate italic">{data.description || 'Configured'}</p>
            </div>
            
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-neutral-300 dark:!bg-slate-600 !border-white dark:!border-slate-900" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-neutral-300 dark:!bg-slate-600 !border-white dark:!border-slate-900" />
        </div>
    );
};

const nodeTypes = {
    workflow: WorkflowNode,
};

interface WorkflowDesignerProps {
    workflowId: string;
    onBack: () => void;
}

export function WorkflowDesigner({ workflowId, onBack }: WorkflowDesignerProps) {
    const { tables, restApiConnectors } = useSchemaStore();
    const postApis = restApiConnectors.filter((c: any) => c.method === 'POST');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [workflowName, setWorkflowName] = useState('Workflow Editor');
    const [toast, setToast] = useState<string | null>(null);

    // In a real app, we would fetch nodes/edges based on workflowId
    // For this demo, we'll use it to set the name prefix
    useEffect(() => {
        if (workflowId) {
            console.log('WorkflowDesigner: Loading workflow', workflowId);
        }
    }, [workflowId]);

    const initialNodes = [
        {
            id: 'node_1',
            type: 'workflow',
            position: { x: 250, y: 50 },
            data: { category: 'trigger', type: 'record_created', description: 'Table: Users' },
        },
        {
            id: 'node_2',
            type: 'workflow',
            position: { x: 250, y: 250 },
            data: { category: 'action', type: 'send_email', description: 'To: Welcome Email' },
        },
    ];

    const initialEdges = [
        {
            id: 'edge_1',
            source: 'node_1',
            target: 'node_2',
            animated: true,
            style: { stroke: '#1A56DB', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#1A56DB' },
        },
    ];

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

    const onConnect = (params: Connection) => {
        setEdges((eds) => addEdge({
            ...params,
            id: `edge_${Date.now()}`,
            animated: true,
            style: { stroke: '#1A56DB', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#1A56DB' },
        }, eds));
        showToast('Connection created');
    };

    const onEdgeClick = useCallback((_: any, edge: any) => {
        setSelectedEdgeId(edge.id);
        setSelectedNodeId(null);
    }, []);

    const deleteSelectedEdge = useCallback(() => {
        if (selectedEdgeId) {
            setEdges(eds => eds.filter(e => e.id !== selectedEdgeId));
            setSelectedEdgeId(null);
            showToast('Connection deleted');
        }
    }, [selectedEdgeId, setEdges]);

    // Colour selected edge differently
    const styledEdges = edges.map(e => ({
        ...e,
        style: {
            ...e.style,
            stroke: e.id === selectedEdgeId ? '#ef4444' : '#1A56DB',
            strokeWidth: e.id === selectedEdgeId ? 4 : 3,
        },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color: e.id === selectedEdgeId ? '#ef4444' : '#1A56DB',
        },
        label: e.id === selectedEdgeId ? '✕ click to delete' : undefined,
        labelStyle: { fontSize: 9, fill: '#ef4444', fontWeight: 700 },
        labelBgStyle: { fill: '#fff1f1', fillOpacity: 0.9 },
    }));

    // Keyboard delete for selected edge or node
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                if (selectedEdgeId) {
                    deleteSelectedEdge();
                } else if (selectedNodeId) {
                    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
                    // also remove connected edges
                    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
                    setSelectedNodeId(null);
                    showToast('Node deleted');
                }
            }
            if (e.key === 'Escape') {
                setSelectedEdgeId(null);
                setSelectedNodeId(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedEdgeId, selectedNodeId, deleteSelectedEdge, setNodes, setEdges]);

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: any) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow/type');
            const category = event.dataTransfer.getData('application/reactflow/category');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: `node_${Date.now()}`,
                type: 'workflow',
                position,
                data: { 
                    category, 
                    type, 
                    description: (NODE_TYPES_CONFIG as any)[category][type].label 
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-50 dark:bg-slate-950 text-neutral-900 dark:text-slate-100 transition-colors duration-300">
            {/* Toolbar */}
            <div className="h-14 border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-6 justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <GitBranch className="w-6 h-6" />
                    </div>
                    <input 
                        type="text" 
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        className="text-lg font-bold text-neutral-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 w-64"
                        placeholder="Workflow Name..."
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => showToast('Workflow results: All stages passed ✓')}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    >
                        <Play className="w-4 h-4" /> Run Test
                    </button>
                    <button 
                        onClick={() => showToast('Workflow saved successfully')}
                        className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-primary-600 text-white rounded-lg hover:bg-opacity-90 shadow-lg shadow-primary-200 transition-all font-sans"
                    >
                        <Save className="w-4 h-4" /> Save Workflow
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Palette */}
                <aside className="w-64 bg-white dark:bg-slate-900 border-r border-neutral-200 dark:border-slate-800 flex flex-col shrink-0">
                    <div className="p-4 border-b border-neutral-200 dark:border-slate-800">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Search steps..."
                                className="w-full pl-9 pr-3 py-1.5 bg-neutral-100 dark:bg-slate-800 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-600/20 text-neutral-900 dark:text-slate-200"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <PaletteCategory title="Triggers" category="trigger" />
                        <PaletteCategory title="Actions" category="action" />
                        <PaletteCategory title="Logic" category="logic" />
                    </div>
                </aside>

                {/* React Flow Canvas */}
                <div className="flex-1 relative pattern-grid dark:bg-slate-950" onDrop={onDrop} onDragOver={onDragOver}>
                    <ReactFlow
                        nodes={nodes}
                        edges={styledEdges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        nodeTypes={nodeTypes}
                        onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null); }}
                        onEdgeClick={onEdgeClick}
                        onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
                        deleteKeyCode={null}
                        fitView
                        connectionLineStyle={{ stroke: '#1A56DB', strokeWidth: 2, strokeDasharray: '6 3' }}
                    >
                        <Background color={document.documentElement.classList.contains('dark') ? '#334155' : '#cbd5e1'} />
                        <Controls className="dark:bg-slate-800 dark:border-slate-700 dark:fill-slate-400" />
                        <Panel position="bottom-right" className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-xl mb-4 mr-4 space-y-2">
                             <div className="flex items-center gap-4 text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Trigger</span>
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-600"></div> Action</span>
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Logic</span>
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-600"></div> API</span>
                             </div>
                             <div className="border-t border-neutral-100 dark:border-slate-800 pt-2 text-[9px] text-neutral-400 dark:text-slate-600 space-y-0.5">
                                 <p>• Drag from a node handle to create a connection</p>
                                 <p>• Click a connection to select it (turns red)</p>
                                 <p>• Press <kbd className="bg-neutral-100 dark:bg-slate-800 px-1 rounded text-[8px]">Delete</kbd> to remove selected connection or node</p>
                             </div>
                             {selectedEdgeId && (
                                 <button
                                     onClick={deleteSelectedEdge}
                                     className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                                 >
                                     <X className="w-3 h-3" /> Delete Connection
                                 </button>
                             )}
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties Panel */}
                <aside className="w-72 bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 flex flex-col shrink-0">
                    <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-neutral-900 dark:text-white text-sm">
                            {selectedEdgeId ? 'Connection' : 'Step Config'}
                        </h3>
                        <Settings2 className="w-4 h-4 text-neutral-400 dark:text-slate-500" />
                    </div>

                    {/* Edge selected — show connection info */}
                    {selectedEdgeId && !selectedNode && (
                        <div className="p-6 space-y-4">
                            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/30">
                                <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">Connection Selected</p>
                                <p className="text-[10px] text-rose-500 font-medium">
                                    {edges.find(e => e.id === selectedEdgeId) && (() => {
                                        const e = edges.find(ed => ed.id === selectedEdgeId)!;
                                        const srcNode = nodes.find(n => n.id === e.source);
                                        const tgtNode = nodes.find(n => n.id === e.target);
                                        const srcLabel = srcNode ? (NODE_TYPES_CONFIG as any)[srcNode.data.category]?.[srcNode.data.type]?.label : e.source;
                                        const tgtLabel = tgtNode ? (NODE_TYPES_CONFIG as any)[tgtNode.data.category]?.[tgtNode.data.type]?.label : e.target;
                                        return `${srcLabel} → ${tgtLabel}`;
                                    })()}
                                </p>
                            </div>
                            <button
                                onClick={deleteSelectedEdge}
                                className="w-full py-2.5 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-colors"
                            >
                                <X className="w-4 h-4" /> Delete Connection
                            </button>
                            <p className="text-[10px] text-neutral-400 dark:text-slate-600 text-center">
                                Or press <kbd className="bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px]">Delete</kbd>
                            </p>
                        </div>
                    )}

                    {selectedNode ? (
                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
                                <div className={cn("p-2 rounded-lg text-white", (NODE_TYPES_CONFIG as any)[selectedNode.data.category][selectedNode.data.type].color)}>
                                    {(NODE_TYPES_CONFIG as any)[selectedNode.data.category][selectedNode.data.type].icon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{(NODE_TYPES_CONFIG as any)[selectedNode.data.category][selectedNode.data.type].label}</h4>
                                    <p className="text-[10px] text-neutral-400 dark:text-slate-500 uppercase font-bold">{(NODE_TYPES_CONFIG as any)[selectedNode.data.category][selectedNode.data.type].category || selectedNode.data.category}</p>
                                </div>
                            </div>

                            {selectedNode.data.type === 'record_created' && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 block">Target Table</label>
                                    <select 
                                        value={(selectedNode.data as any).tableId || ''}
                                        onChange={(e) => {
                                            setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, tableId: e.target.value, description: `Table: ${tables.find(t => t.id === e.target.value)?.name || e.target.value}` } } : n));
                                        }}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white"
                                    >
                                        <option value="">Select table...</option>
                                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {selectedNode.data.type === 'webhook' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 block">Webhook ID</label>
                                        <input className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white" value={selectedNode.id} readOnly />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 block">Secret Key</label>
                                        <input className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white font-mono" type="password" value="sk_test_12345" />
                                    </div>
                                </div>
                            )}

                            {selectedNode.data.type === 'scheduled' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 block">Frequency</label>
                                        <select className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white">
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="custom">Custom Cron</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 block">Time (UTC)</label>
                                        <input type="time" className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white" defaultValue="09:00" />
                                    </div>
                                </div>
                            )}

                            {selectedNode.data.type === 'send_email' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Recipient</label>
                                        <input className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white" placeholder="email@example.com" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">CC</label>
                                        <input className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white" placeholder="manager@example.com" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Subject</label>
                                        <input className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white" placeholder="Welcome aboard!" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Body</label>
                                        <textarea className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none h-24 resize-none text-neutral-900 dark:text-white" placeholder="Hello there..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Attachment</label>
                                        <select className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white">
                                            <option value="">None</option>
                                            <option value="report">Weekly_Report.pdf</option>
                                            <option value="invoice">Invoice_Draft.pdf</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {['create_record', 'update_record'].includes(selectedNode.data.type) && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Target Table</label>
                                        <select className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white">
                                            {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Field Values</label>
                                        <div className="p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-100 dark:border-slate-700 space-y-3">
                                            <div className="flex gap-2 items-center">
                                                <select className="flex-1 bg-transparent border-none text-[11px] font-bold text-neutral-600 dark:text-slate-400 outline-none">
                                                    <option>Status</option>
                                                    <option>Priority</option>
                                                </select>
                                                <span className="text-neutral-300">→</span>
                                                <input className="flex-1 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-neutral-200 dark:border-slate-700 text-xs" placeholder="Value" />
                                            </div>
                                            <button className="w-full py-1 text-[9px] font-bold text-primary-600 border border-dashed border-primary-200 rounded-lg hover:bg-white transition-colors">ADD FIELD</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedNode.data.type === 'ai_generate' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 block">AI Prompt</label>
                                        <textarea className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none h-24 resize-none text-neutral-900 dark:text-white" placeholder="Summarize the previous record..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 block">Output Variable</label>
                                        <input className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none text-primary-600 font-bold" defaultValue="{{ai_summary}}" />
                                    </div>
                                </div>
                            )}

                            {selectedNode.data.type === 'post_to_api' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none block">Target API (POST)</label>
                                        {postApis.length === 0 ? (
                                            <p className="text-[10px] text-amber-500 italic font-medium">No POST APIs configured. Add one in Data Studio → Sources.</p>
                                        ) : (
                                            <select
                                                value={(selectedNode.data as any).apiId || ''}
                                                onChange={(e) => setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, apiId: e.target.value, description: postApis.find((a: any) => a.id === e.target.value)?.name || 'API' } } : n))}
                                                className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white"
                                            >
                                                <option value="">Select POST API...</option>
                                                {postApis.map((api: any) => (
                                                    <option key={api.id} value={api.id}>{api.name} — {api.baseUrl}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    {(selectedNode.data as any).apiId && (() => {
                                        const api = postApis.find((a: any) => a.id === (selectedNode.data as any).apiId);
                                        const apiFields = (() => { try { const s = typeof api?.schema === 'string' ? JSON.parse(api.schema) : api?.schema; return s?.fields || []; } catch { return []; } })();
                                        return (
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none block">Field Mapping</label>
                                                <p className="text-[10px] text-neutral-400 italic">Map workflow data to API fields</p>
                                                <div className="space-y-2">
                                                    {apiFields.length === 0 ? (
                                                        <p className="text-[10px] text-neutral-400 italic">No schema fields found. Run a test request in Sources to populate.</p>
                                                    ) : apiFields.map((f: any) => (
                                                        <div key={f.id || f.name} className="flex gap-2 items-center">
                                                            <span className="text-[10px] font-bold text-neutral-500 w-24 truncate">{f.name}</span>
                                                            <span className="text-neutral-300">→</span>
                                                            <input
                                                                placeholder={`{{${f.name}}}`}
                                                                className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded text-xs font-mono outline-none text-neutral-900 dark:text-white"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <button className="w-full py-1 text-[9px] font-bold text-violet-600 border border-dashed border-violet-200 rounded-lg hover:bg-violet-50 transition-colors">+ ADD MANUAL FIELD</button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {selectedNode.data.type === 'condition' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                     <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Condition Field</label>
                                        <select className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white">
                                            <option value="status">status</option>
                                            <option value="amount">amount</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <select className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white">
                                            <option value="eq">Equals</option>
                                            <option value="gt">Greater Than</option>
                                        </select>
                                        <input className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white" placeholder="Value" />
                                    </div>
                                </div>
                            )}

                            {selectedNode.data.type === 'delay' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 block">Duration</label>
                                        <div className="flex gap-2">
                                            <input type="number" className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white" defaultValue="5" />
                                            <select className="w-24 px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white">
                                                <option>Min</option>
                                                <option>Hours</option>
                                                <option>Days</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
                            <PlusCircle className="w-12 h-12 text-neutral-300 dark:text-slate-600 mb-4" />
                            <p className="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-widest">Select a node or connection to configure</p>
                        </div>
                    )}
                </aside>
            </div>

            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 font-medium text-sm flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    {toast}
                </div>
            )}
        </div>
    );
}

function PaletteCategory({ title, category }: { title: string, category: string }) {
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
                    <div 
                        key={type}
                        draggable
                        onDragStart={(event) => onDragStart(event, type, category)}
                        className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-100 dark:border-slate-700 rounded-xl hover:border-primary-600 dark:hover:border-primary-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
                    >
                        <div className={cn("p-1.5 rounded-lg text-white", config.color)}>
                            {config.icon}
                        </div>
                        <span className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">{config.label}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}


