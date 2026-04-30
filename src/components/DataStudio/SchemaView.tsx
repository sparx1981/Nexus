import React, { useMemo } from 'react';
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
  return (
    <div className="bg-white border-2 border-neutral-200 rounded-xl shadow-lg min-w-[200px] overflow-hidden group hover:border-primary-600 transition-colors">
      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary-600" />
          <span className="font-bold text-sm text-neutral-900">{data.name}</span>
        </div>
        <button className="p-1 hover:bg-neutral-200 rounded transition-colors text-neutral-400">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      <div className="px-3 py-2 space-y-2">
        {data.fields.map((field) => (
          <div key={field.id} className="flex items-center justify-between gap-4 py-0.5 relative">
            <div className="flex items-center gap-2 overflow-hidden">
               <span className="text-xs font-medium text-neutral-700 truncate">{field.name}</span>
            </div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter shrink-0">{field.type}</span>
            
            {field.type === FieldType.RELATION && (
                <>
                    <Handle 
                        type="source" 
                        position={Position.Right} 
                        id={field.id}
                        className="!w-2 !h-2 !bg-primary-600 !border-white"
                    />
                    <Handle 
                        type="target" 
                        position={Position.Left} 
                        id={field.id}
                        className="!w-2 !h-2 !bg-primary-600 !border-white"
                    />
                </>
            )}
          </div>
        ))}
        <button className="w-full flex items-center justify-center gap-2 py-1 mt-2 text-[10px] font-bold text-neutral-400 uppercase hover:bg-neutral-50 transition-colors border border-dashed border-neutral-200 rounded-md">
            <Plus className="w-3 h-3" /> Add Field
        </button>
      </div>
    </div>
  );
};

const nodeTypes = {
  table: TableNode,
};

export function SchemaView() {
  const { tables, relationships, addRelationship } = useSchemaStore();

  const initialNodes = useMemo(() => tables.map((t, idx) => ({
    id: t.id,
    type: 'table',
    position: { x: 100 + (idx * 250), y: 100 },
    data: t,
  })), [tables]);

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
