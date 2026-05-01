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
    const { tables } = useSchemaStore();
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

    const onConnect = (params: Connection) => {
        setEdges((eds) => addEdge({
            ...params,
            animated: true,
            style: { stroke: '#1A56DB', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#1A56DB' },
        }, eds));
    };

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
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        nodeTypes={nodeTypes}
                        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                        onPaneClick={() => setSelectedNodeId(null)}
                        fitView
                    >
                        <Background color={document.documentElement.classList.contains('dark') ? '#334155' : '#cbd5e1'} />
                        <Controls className="dark:bg-slate-800 dark:border-slate-700 dark:fill-slate-400" />
                        <Panel position="bottom-right" className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-neutral-200 dark:border-slate-800 shadow-xl mb-4 mr-4">
                             <div className="flex items-center gap-4 text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest px-2">
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Trigger</span>
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-600"></div> Action</span>
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Logic</span>
                             </div>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties Panel */}
                <aside className="w-72 bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-slate-800 flex flex-col shrink-0">
                    <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-neutral-900 dark:text-white text-sm">Step Config</h3>
                        <Settings2 className="w-4 h-4 text-neutral-400 dark:text-slate-500" />
                    </div>
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
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Target Table</label>
                                    <select className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white">
                                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}                             {selectedNode.data.type === 'send_email' && (
                                <>
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
                                </>
                            )}

                            {selectedNode.data.type === 'condition' && (
                                <>
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
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
                            <PlusCircle className="w-12 h-12 text-neutral-300 dark:text-slate-600 mb-4" />
                            <p className="text-xs font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-widest">Select a node to configure its behavior</p>
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


