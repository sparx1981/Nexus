import React, { useState, useMemo, useCallback } from 'react';
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
            "bg-white border-2 rounded-2xl shadow-xl min-w-[180px] overflow-hidden transition-all",
            selected ? "border-primary-600 ring-4 ring-primary-600/10" : "border-neutral-200"
        )}>
            <div className={cn("px-3 py-2 flex items-center gap-2 text-white", config.color)}>
                {config.icon}
                <span className="font-bold text-[11px] uppercase tracking-wider">{data.category}</span>
            </div>
            <div className="p-4">
                <span className="text-sm font-bold text-neutral-900 block mb-1">{config.label}</span>
                <p className="text-[10px] text-neutral-400 font-medium truncate italic">{data.description || 'Configured'}</p>
            </div>
            
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-neutral-300 !border-white" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-neutral-300 !border-white" />
        </div>
    );
};

const nodeTypes = {
    workflow: WorkflowNode,
};

export function WorkflowDesigner() {
    const { tables } = useSchemaStore();
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [workflowName, setWorkflowName] = useState('Customer Onboarding Flow');
    const [toast, setToast] = useState<string | null>(null);

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

    const onConnect = (params: Connection) => {
        setEdges((eds) => addEdge({
            ...params,
            animated: true,
            style: { stroke: '#1A56DB', strokeWidth: 3 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#1A56DB' },
        }, eds));
    };

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-50 text-neutral-900">
            {/* Toolbar */}
            <div className="h-14 border-b border-neutral-200 bg-white flex items-center px-6 justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <GitBranch className="w-6 h-6" />
                    </div>
                    <input 
                        type="text" 
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        className="text-lg font-bold text-neutral-900 bg-transparent border-none outline-none focus:ring-0 w-64"
                        placeholder="Workflow Name..."
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => showToast('Workflow results: All stages passed ✓')}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all"
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
                <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-neutral-200">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input 
                                type="text" 
                                placeholder="Search steps..."
                                className="w-full pl-9 pr-3 py-1.5 bg-neutral-100 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-600/20"
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
                <div className="flex-1 relative pattern-grid">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                        onPaneClick={() => setSelectedNodeId(null)}
                        fitView
                    >
                        <Background />
                        <Controls />
                        <Panel position="bottom-right" className="bg-white p-2 rounded-xl border border-neutral-200 shadow-xl mb-4 mr-4">
                             <div className="flex items-center gap-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Trigger</span>
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-600"></div> Action</span>
                                 <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Logic</span>
                             </div>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties Panel */}
                <aside className="w-72 bg-white border-l border-neutral-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                        <h3 className="font-bold text-neutral-900 text-sm">Step Config</h3>
                        <Settings2 className="w-4 h-4 text-neutral-400" />
                    </div>
                    {selectedNode ? (
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                                <div className={cn("p-2 rounded-lg text-white", (NODE_TYPES_CONFIG as any)[selectedNode.data.category][selectedNode.data.type].color)}>
                                    {(NODE_TYPES_CONFIG as any)[selectedNode.data.category][selectedNode.data.type].icon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-neutral-900 text-sm">{(NODE_TYPES_CONFIG as any)[selectedNode.data.category][selectedNode.data.type].label}</h4>
                                    <p className="text-[10px] text-neutral-400 uppercase font-bold">{selectedNode.data.category}</p>
                                </div>
                            </div>

                            {selectedNode.data.type === 'record_created' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Target Table</label>
                                    <select className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium outline-none">
                                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {selectedNode.data.type === 'send_email' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Recipient</label>
                                        <input className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium outline-none" placeholder="email@example.com" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Subject</label>
                                        <input className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium outline-none" placeholder="Welcome aboard!" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Body</label>
                                        <textarea className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium outline-none h-32 resize-none" placeholder="Hello there..." />
                                    </div>
                                </>
                            )}

                            {selectedNode.data.type === 'condition' && (
                                <>
                                     <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Condition Field</label>
                                        <select className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium outline-none">
                                            <option value="status">status</option>
                                            <option value="amount">amount</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <select className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium outline-none">
                                            <option value="eq">Equals</option>
                                            <option value="gt">Greater Than</option>
                                        </select>
                                        <input className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium outline-none" placeholder="Value" />
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
                            <PlusCircle className="w-12 h-12 text-neutral-300 mb-4" />
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Select a node to configure its behavior</p>
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
    return (
        <section>
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">{title}</h4>
            <div className="space-y-2">
                {Object.entries(items).map(([type, config]: [string, any]) => (
                    <div 
                        key={type}
                        className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-100 rounded-xl hover:border-primary-600 hover:bg-white hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
                    >
                        <div className={cn("p-1.5 rounded-lg text-white", config.color)}>
                            {config.icon}
                        </div>
                        <span className="text-[11px] font-bold text-neutral-700">{config.label}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}


