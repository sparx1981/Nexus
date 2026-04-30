import React, { useMemo, useState } from 'react';
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
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database, Plus, MoreHorizontal } from 'lucide-react';
import { useSchemaStore } from '../../store/schemaStore';
import { Table, FieldType } from '../../types';
import { cn } from '../../lib/utils';

const TableNode = ({ data }: NodeProps<Table>) => {
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>(FieldType.TEXT);
  const addField = useSchemaStore(state => state.addField);

  const handleAddField = () => {
    if (!newFieldName) return;
    addField(data.id, {
        id: Math.random().toString(36).substr(2, 9),
        name: newFieldName,
        type: newFieldType,
        required: false
    });
    setNewFieldName('');
    setShowAddField(false);
  };

  return (
    <div className="bg-white border-2 border-neutral-200 rounded-xl shadow-lg min-w-[220px] overflow-hidden group hover:border-primary-600 transition-colors">
      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary-600" />
          <span className="font-bold text-sm text-neutral-900">{data.name}</span>
        </div>
        <button className="p-1 hover:bg-neutral-200 rounded transition-colors text-neutral-400">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      <div className="px-3 py-2 space-y-1">
        {data.fields.map((field) => (
          <div key={field.id} className="flex items-center justify-between gap-4 py-1 relative group/field">
            <div className="flex items-center gap-2 overflow-hidden">
               <span className="text-xs font-medium text-neutral-700 truncate">{field.name}</span>
            </div>
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter shrink-0 bg-neutral-100 px-1.5 py-0.5 rounded">{field.type}</span>
            
            {field.type === FieldType.RELATION && (
                <>
                    <Handle 
                        type="source" 
                        position={Position.Right} 
                        id={field.id}
                        className="!w-2 !h-2 !bg-primary-600 !border-white !-right-4"
                    />
                    <Handle 
                        type="target" 
                        position={Position.Left} 
                        id={field.id}
                        className="!w-2 !h-2 !bg-primary-600 !border-white !-left-4"
                    />
                </>
            )}
          </div>
        ))}
        
        {showAddField ? (
            <div className="mt-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <input 
                    autoFocus
                    type="text" 
                    placeholder="Field name..."
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded outline-none focus:ring-1 focus:ring-primary-600/20 focus:border-primary-600"
                />
                <select 
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                    className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded outline-none focus:ring-1 focus:ring-primary-600/20 focus:border-primary-600"
                >
                    {Object.values(FieldType).map(type => (
                        <option key={type} value={type}>{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowAddField(false)}
                        className="flex-1 py-1 text-[10px] font-bold text-neutral-400 hover:text-neutral-600"
                    >Cancel</button>
                    <button 
                        onClick={handleAddField}
                        className="flex-1 py-1 bg-primary-600 text-white rounded font-bold text-[10px] hover:bg-primary-700 transition-colors"
                    >Add</button>
                </div>
            </div>
        ) : (
            <button 
                onClick={() => setShowAddField(true)}
                className="w-full flex items-center justify-center gap-2 py-1.5 mt-2 text-[10px] font-bold text-neutral-400 uppercase hover:bg-neutral-50 transition-colors border border-dashed border-neutral-200 rounded-md"
            >
                <Plus className="w-3 h-3" /> Add Field
            </button>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  table: TableNode,
};

export function SchemaView() {
  const { tables, relationships, addRelationship, nodePositions, updateNodePosition } = useSchemaStore();

  const initialNodes = useMemo(() => tables.map((t) => ({
    id: t.id,
    type: 'table',
    position: nodePositions[t.id] || { x: Math.random() * 400, y: Math.random() * 400 },
    data: t,
  })), [tables, nodePositions]);

  const initialEdges = useMemo(() => relationships.map((r) => ({
    id: r.id,
    source: r.sourceTableId,
    target: r.targetTableId,
    animated: true,
    style: { stroke: '#1A56DB', strokeWidth: 2 },
    markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#1A56DB',
    }
  })), [relationships]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = (params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
    // In a real app, we'd also update the schemaStore here
  };

  return (
    <div className="flex-1 bg-neutral-50 relative overflow-hidden pattern-dots text-neutral-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Manual Add Table button overlay in Schema View */}
      <div className="absolute top-4 left-4">
          {/* This is a visual aid for the demo */}
      </div>
    </div>
  );
}
