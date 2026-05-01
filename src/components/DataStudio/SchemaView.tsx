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
import { Database, Plus, MoreHorizontal, Eye, Download, FileJson, Calendar, Hash, Trash2 } from 'lucide-react';
import { useSchemaStore } from '../../store/schemaStore';
import { Table, FieldType } from '../../types';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { dataService } from '../../services/dataService';
import Papa from 'papaparse';

import { CalculatedFieldEditor } from './CalculatedFieldEditor';

const TableNode = ({ data }: NodeProps<Table>) => {
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>(FieldType.TEXT);
  const [calculatedExpr, setCalculatedExpr] = useState('');
  const [precision, setPrecision] = useState(10);
  const [scale, setScale] = useState(2);
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [menuOpen, setMenuOpen] = useState(false);
  
  const { addTable, addField, updateTable, deleteTable, setSelectedTableId, tables } = useSchemaStore();
  const { selectedProjectId } = useAuthStore();

  const handleAddField = async () => {
    if (!newFieldName) return;
    
    const fieldId = Math.random().toString(36).substr(2, 9);
    const newField = {
        id: fieldId,
        name: newFieldName,
        type: newFieldType,
        required: false,
        precision: newFieldType === FieldType.NUMBER ? precision : undefined,
        scale: newFieldType === FieldType.NUMBER ? scale : undefined,
        dateFormat: newFieldType === FieldType.DATE ? dateFormat : undefined,
        calculatedExpression: newFieldType === FieldType.CALCULATED ? calculatedExpr : undefined
    };

    // Add to store (which now handles Firestore)
    await addField(data.id, newField);

    setNewFieldName('');
    setCalculatedExpr('');
    setShowAddField(false);
  };

  const handleRename = async () => {
    const newName = prompt('Enter new table name:', data.name);
    if (newName && newName !== data.name) {
      await updateTable(data.id, { name: newName });
    }
    setMenuOpen(false);
  };

  const handleAddDescription = async () => {
    const desc = prompt('Enter table description:', data.description || '');
    if (desc !== null) {
      await updateTable(data.id, { description: desc });
    }
    setMenuOpen(false);
  };

  const handleDuplicate = async () => {
    const newId = `table_${Date.now()}`;
    await addTable({
      ...data,
      id: newId,
      name: `${data.name} (Copy)`
    });
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this table?')) {
      await deleteTable(data.id);
    }
    setMenuOpen(false);
  };

  const exportToCSV = () => {
    const dummyData = [
      data.fields.reduce((acc: any, f) => {
        acc[f.name] = f.type === FieldType.NUMBER ? 0 : f.type === FieldType.DATE ? new Date().toISOString() : 'Value';
        return acc;
      }, {})
    ];
    const csv = Papa.unparse(dummyData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name}_export.csv`;
    a.click();
  };

  const exportToJSON = () => {
    const dummyData = [
        data.fields.reduce((acc: any, f) => {
          acc[f.name] = f.type === FieldType.NUMBER ? 0 : f.type === FieldType.DATE ? new Date().toISOString() : 'Value';
          return acc;
        }, {})
      ];
    const blob = new Blob([JSON.stringify(dummyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name}_export.json`;
    a.click();
  };

  return (
    <div className="bg-white dark:bg-[#121212] border-2 border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg min-w-[220px] overflow-hidden group hover:border-primary-600 transition-colors">
      <div className="px-3 py-2 bg-neutral-50 dark:bg-[#0A0A0A] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary-600" />
          <span className="font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-tight">{data.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setSelectedTableId(data.id)}
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors text-neutral-400 group/btn relative"
            title="View Data"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {/* Table Context Menu */}
          <div className="relative">
            <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                    "p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors text-neutral-400",
                    menuOpen && "bg-neutral-200 dark:bg-neutral-800 text-primary-600"
                )}
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-200">
                        <button onClick={handleRename} className="w-full text-left px-3 py-2 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2">
                            <FileJson className="w-3 h-3" /> Rename Table
                        </button>
                        <button onClick={handleAddDescription} className="w-full text-left px-3 py-2 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2">
                            <Plus className="w-3 h-3" /> Edit Description
                        </button>
                        <button onClick={handleDuplicate} className="w-full text-left px-3 py-2 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2">
                            <Plus className="w-3 h-3" /> Duplicate Table
                        </button>
                        <div className="h-[1px] bg-neutral-100 dark:bg-neutral-800 my-1"></div>
                        <button onClick={exportToCSV} className="w-full text-left px-3 py-2 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2">
                            <Download className="w-3 h-3" /> Export CSV
                        </button>
                        <button onClick={exportToJSON} className="w-full text-left px-3 py-2 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2">
                            <FileJson className="w-3 h-3" /> Export JSON
                        </button>
                        <div className="h-[1px] bg-neutral-100 dark:bg-neutral-800 my-1"></div>
                        <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2">
                            <Trash2 className="w-3 h-3" /> Delete Table
                        </button>
                    </div>
                </>
            )}
          </div>
        </div>
      </div>
      <div className="px-3 py-2 space-y-1">
        {data.fields.map((field) => (
          <div key={field.id} className="flex items-center justify-between gap-4 py-1 relative group/field">
            <div className="flex items-center gap-2 overflow-hidden">
               <button 
                  onClick={async () => {
                      if (confirm(`Delete field "${field.name}"?`)) {
                          const updatedFields = data.fields.filter(f => f.id !== field.id);
                          await updateTable(data.id, { fields: updatedFields });
                      }
                  }}
                  className="opacity-0 group-hover/field:opacity-100 p-0.5 hover:bg-rose-50 text-neutral-300 hover:text-rose-600 rounded transition-all shrink-0"
               >
                  <Trash2 className="w-2.5 h-2.5" />
               </button>
               <div className="flex items-center gap-1.5 min-w-0">
                   {field.type === FieldType.CALCULATED && (
                       <span className="shrink-0 text-[8px] font-black bg-primary-100 text-primary-600 px-1 rounded uppercase tracking-tighter">fx</span>
                   )}
                   <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{field.name}</span>
               </div>
            </div>
            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter shrink-0 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded transition-colors group-hover/field:bg-primary-50 group-hover/field:text-primary-600">
                {field.type === FieldType.CALCULATED ? 'Calc' : field.type}
            </span>
            
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
            <div className="mt-3 p-3 bg-neutral-50 dark:bg-[#1A1A1A] rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Field Name</label>
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="e.g. email, price, date_of_birth"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded outline-none focus:ring-1 focus:ring-primary-600/20 focus:border-primary-600 dark:text-white transition-all font-bold"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Type</label>
                    <select 
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded outline-none focus:ring-1 focus:ring-primary-600/20 focus:border-primary-600 dark:text-white transition-all"
                    >
                        {Object.values(FieldType).map(type => (
                            <option key={type} value={type}>{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                        ))}
                    </select>
                </div>

                {newFieldType === FieldType.CALCULATED && (
                    <CalculatedFieldEditor 
                        availableFields={data.fields}
                        onChange={(expr) => setCalculatedExpr(expr)}
                    />
                )}

                {newFieldType === FieldType.NUMBER && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Digits</label>
                            <input 
                                type="number" 
                                value={precision}
                                onChange={(e) => setPrecision(parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded outline-none dark:text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Scale</label>
                            <input 
                                type="number" 
                                value={scale}
                                onChange={(e) => setScale(parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded outline-none dark:text-white"
                            />
                        </div>
                    </div>
                )}

                {newFieldType === FieldType.DATE && (
                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Display Format</label>
                        <select 
                            value={dateFormat}
                            onChange={(e) => setDateFormat(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-neutral-800 rounded outline-none dark:text-white"
                        >
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MMMM D, YYYY">Full Date</option>
                        </select>
                    </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    <button 
                        onClick={() => setShowAddField(false)}
                        className="flex-1 py-1.5 text-[10px] font-bold text-neutral-400 hover:text-rose-600 transition-colors"
                    >Cancel</button>
                    <button 
                        onClick={handleAddField}
                        className="flex-1 py-1.5 bg-primary-600 text-white rounded-lg font-bold text-[10px] hover:bg-primary-700 shadow-lg shadow-primary-200/20 active:scale-95 transition-all text-center"
                    >Add Field</button>
                </div>
            </div>
        ) : (
            <button 
                onClick={() => setShowAddField(true)}
                className="w-full flex items-center justify-center gap-2 py-1.5 mt-2 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-dashed border-neutral-200 dark:border-neutral-800 rounded-md"
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

  // Sync nodes when tables change
  React.useEffect(() => {
    const newNodes = tables.map((t) => ({
      id: t.id,
      type: 'table',
      position: nodePositions[t.id] || { x: Math.random() * 500, y: Math.random() * 300 },
      data: t,
    }));
    setNodes(newNodes);
  }, [tables, nodePositions, setNodes]);

  // Sync edges when relationships change
  React.useEffect(() => {
    const newEdges = relationships.map((r) => ({
      id: r.id,
      source: r.sourceTableId,
      target: r.targetTableId,
      animated: true,
      style: { stroke: '#1A56DB', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#1A56DB' }
    }));
    setEdges(newEdges);
  }, [relationships, setEdges]);

  const onConnect = (params: Connection) => {
    if (params.source && params.target) {
      addRelationship({ 
          id: `rel_${Date.now()}`, 
          sourceTableId: params.source, 
          targetTableId: params.target, 
          type: 'one-to-many' 
      });
      // Persistence is handled by the subscription or explicit save
    }
  };

  const onNodeDragStop = (_: any, node: any) => {
    updateNodePosition(node.id, node.position);
  };

  return (
    <div className="flex-1 bg-neutral-50 dark:bg-[#0A0A0A] relative overflow-hidden pattern-dots text-neutral-200 dark:text-neutral-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
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
