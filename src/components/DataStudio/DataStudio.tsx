import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Database, 
  Layers, 
  Search, 
  ChevronDown, 
  X, 
  Play, 
  CloudUpload, 
  Settings, 
  Globe, 
  Box,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Table as TableIcon,
  Download,
  Calendar,
  Type,
  Hash,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSchemaStore } from '../../store/schemaStore';
import { useAuthStore } from '../../store/authStore';
import { SchemaView } from './SchemaView';
import { dataService } from '../../services/dataService';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import Papa from 'papaparse';
import axios from 'axios';
import { FieldType } from '../../types';


import { handleFirestoreError, OperationType } from '../../services/dataService';

// Advanced expression evaluator for calculated fields
function evaluateExpression(expr: string, record: any, allRecords: any[]) {
    if (!expr) return '';
    try {
        const context = {
            ...record,
            row: record,
            all: allRecords,
            sum: (f: string) => allRecords.reduce((acc, r) => acc + (Number(r[f]) || 0), 0),
            avg: (f: string) => {
                const s = allRecords.reduce((acc, r) => acc + (Number(r[f]) || 0), 0);
                return allRecords.length ? s / allRecords.length : 0;
            },
            count: () => allRecords.length,
            Math, Number, String, Date
        };
        const keys = Object.keys(context);
        const values = Object.values(context);
        const fn = new Function(...keys, `return ${expr}`);
        const result = fn(...values);
        return typeof result === 'number' ? result.toFixed(2) : result;
    } catch (e) {
        return 'Eval Error';
    }
}

export function DataStudio({ defaultTab }: { defaultTab?: 'schema' | 'table' | 'query' | 'sources' }) {
  const [activeSubTab, setActiveSubTab] = useState<'schema' | 'table' | 'query' | 'sources'>(defaultTab || 'schema');
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableType, setNewTableType] = useState<'internal' | 'csv' | 'api' | 'trimble'>('internal');
  
  const { tables, selectedTableId, addTable } = useSchemaStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (selectedTableId) {
      setActiveSubTab('table');
    }
  }, [selectedTableId]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName) return;
    
    const tableId = `table_${Date.now()}`;
    await addTable({
        id: tableId,
        name: newTableName,
        type: newTableType,
        fields: [{ id: '1', name: 'id', type: FieldType.AUTO_NUMBER, required: true }]
    });

    setNewTableName('');
    setShowAddTable(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Module Navbar */}
      <div className="h-12 border-b border-neutral-200 bg-white flex items-center px-6 gap-6 shrink-0 z-20 dark:bg-slate-900 dark:border-slate-800">
        {[
          { id: 'schema', label: 'Schema View' },
          { id: 'table', label: 'Table View' },
          { id: 'query', label: 'Query Builder' },
          { id: 'sources', label: 'Sources' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
                "text-sm font-medium transition-all h-full px-2 border-b-2",
                activeSubTab === tab.id ? "text-primary-600 border-primary-600 font-black" : "text-neutral-500 hover:text-neutral-900 border-transparent dark:text-slate-400 dark:hover:text-slate-100"
            )}
          >{tab.label}</button>
        ))}
        <div className="flex-1"></div>
        <button 
            onClick={() => setShowAddTable(true)}
            className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-opacity-90 shadow-sm transition-all shadow-primary-200/20"
        >
          <Plus className="w-4 h-4" /> New Table
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300">
        {activeSubTab === 'schema' && <SchemaView />}
        {activeSubTab === 'table' && <DataTableView />}
        {activeSubTab === 'query' && <QueryBuilderView />}
        {activeSubTab === 'sources' && <SourcesView />}
      </div>

      {showAddTable && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddTable(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 dark:bg-[#121212] dark:border dark:border-neutral-800">
                  <h3 className="text-xl font-bold text-neutral-900 mb-2 dark:text-white">Create New Table</h3>
                  <p className="text-neutral-500 text-sm mb-6 dark:text-neutral-400 font-medium">Define a new entity or connect an external data source.</p>
                  
                  <form onSubmit={handleAddTable} className="space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Table Name</label>
                          <input 
                              autoFocus
                              type="text" 
                              value={newTableName}
                              onChange={(e) => setNewTableName(e.target.value)}
                              placeholder="e.g. Orders, Tasks, Inventory"
                              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none transition-all dark:bg-[#1A1A1A] dark:border-neutral-800 dark:text-white"
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'internal', label: 'Internal', icon: <Database className="w-4 h-4" /> },
                          { id: 'csv', label: 'CSV/Excel', icon: <FileSpreadsheet className="w-4 h-4" /> },
                          { id: 'api', label: 'REST API', icon: <Globe className="w-4 h-4" /> },
                          { id: 'trimble', label: 'Trimble', icon: <Box className="w-4 h-4" /> },
                        ].map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setNewTableType(type.id as any)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                              newTableType === type.id 
                                ? "border-primary-600 bg-primary-50 text-primary-600 dark:bg-primary-950 dark:border-primary-600" 
                                : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              newTableType === type.id ? "bg-primary-100 text-primary-600 dark:bg-primary-900" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                            )}>{type.icon}</div>
                            <span className="text-xs font-bold">{type.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-3 pt-6">
                          <button 
                            type="button"
                            onClick={() => setShowAddTable(false)}
                            className="flex-1 px-4 py-2.5 text-neutral-600 font-bold hover:bg-neutral-100 rounded-xl transition-all dark:text-neutral-400 dark:hover:bg-neutral-800"
                          >Cancel</button>
                          <button 
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all active:scale-95"
                          >Create Table</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

function DataTableView() {
    const { tables, selectedTableId, setSelectedTableId, addField, updateTable, deleteTable } = useSchemaStore();
    const { isAuthenticated, selectedProjectId } = useAuthStore();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Field Modal State
    const [showAddField, setShowAddField] = useState(false);
    const [newField, setNewField] = useState({
        name: '',
        description: '',
        type: FieldType.TEXT,
        size: 255,
        precision: 10,
        scale: 2,
        dateFormat: 'YYYY-MM-DD'
    });
    
    const table = tables.find(t => t.id === selectedTableId) || tables[0];

    useEffect(() => {
      if (!selectedTableId && tables.length > 0) {
        setSelectedTableId(tables[0].id);
      }
    }, [tables, selectedTableId, setSelectedTableId]);

    const handleAddFieldSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newField.name || !selectedTableId) return;

        const fieldId = Math.random().toString(36).substr(2, 9);
        const newFieldData = { id: fieldId, ...newField };

        // Store now handles Firestore
        await addField(selectedTableId, newFieldData);

        setShowAddField(false);
        setNewField({ name: '', description: '', type: FieldType.TEXT, size: 255, precision: 10, scale: 2, dateFormat: 'YYYY-MM-DD' });
    };

    useEffect(() => {
      if (!selectedTableId || !selectedProjectId) return;

      setLoading(true);
      const q = query(collection(db, 'workspaces', selectedProjectId, 'tableData', selectedTableId, 'rows'));
      const unsub = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecords(docs);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `workspaces/${selectedProjectId}/tableData/${selectedTableId}/rows`);
      });

      return () => unsub();
    }, [selectedTableId, selectedProjectId]);

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedTableId) return;

      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          for (const row of results.data) {
            if (Object.keys(row as any).length > 0 && selectedProjectId) {
              await dataService.addRecord(selectedProjectId, selectedTableId, row);
            }
          }
        }
      });
    };

    const handleExportCSV = () => {
        const csv = Papa.unparse(records);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${table?.name || 'export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportJSON = () => {
        const json = JSON.stringify(records, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${table?.name || 'export'}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCellChange = async (recordId: string, fieldName: string, value: any) => {
        if (!selectedProjectId) return;
        await dataService.updateRecord(selectedProjectId, selectedTableId!, recordId, { [fieldName]: value });
    };

    if (tables.length === 0) return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600">
        <TableIcon className="w-16 h-16 mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-xs">No tables found</p>
      </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 transition-colors duration-300">
            <div className="h-14 border-b border-neutral-200 dark:border-slate-800 px-6 flex items-center gap-4 bg-neutral-50/50 dark:bg-slate-900/50">
                <select 
                    value={selectedTableId || ''}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 dark:text-white rounded-lg px-3 py-1.5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary-600/20"
                >
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <div className="h-6 w-[1px] bg-neutral-200 dark:bg-slate-800"></div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowAddField(true)}
                    className="text-xs font-bold text-neutral-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 group transition-colors"
                  >
                      <Plus className="w-4 h-4" /> Add Field
                  </button>
                  
                  <button 
                    onClick={async () => {
                        if (selectedTableId && confirm('Delete this table and all its data?')) {
                            await deleteTable(selectedTableId);
                            setSelectedTableId(tables.length > 1 ? tables.find(t => t.id !== selectedTableId)?.id || null : null);
                        }
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-2 group transition-colors"
                  >
                      <Trash2 className="w-4 h-4" /> Delete Table
                  </button>
                  
                  <label className="text-xs font-bold text-neutral-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 cursor-pointer transition-colors">
                      <CloudUpload className="w-4 h-4" /> Import CSV
                      <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                  </label>

                  <div className="relative group/export">
                    <button className="text-xs font-bold text-neutral-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 transition-colors">
                        <Download className="w-4 h-4" /> Export Data
                    </button>
                    <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all z-50 overflow-hidden">
                        <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-slate-800 dark:text-slate-200">Export CSV</button>
                        <button onClick={handleExportJSON} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-slate-800 dark:text-slate-200">Export JSON</button>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                        if (selectedTableId && selectedProjectId) {
                            await dataService.addRecord(selectedProjectId, selectedTableId, {});
                        }
                    }}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-2 transition-colors"
                  >
                      <Plus className="w-4 h-4" /> Add Row
                  </button>
                </div>
            </div>

            {showAddField && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm shadow-2xl" onClick={() => setShowAddField(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-neutral-200 dark:border-slate-800">
                        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-neutral-900 dark:text-white">Add New Field</h3>
                            <button onClick={() => setShowAddField(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-neutral-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddFieldSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Field Name</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={newField.name}
                                    onChange={(e) => setNewField({...newField, name: e.target.value})}
                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 outline-none text-neutral-900 dark:text-white transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Description</label>
                                <input 
                                    type="text" 
                                    value={newField.description}
                                    onChange={(e) => setNewField({...newField, description: e.target.value})}
                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Field Type</label>
                                    <select 
                                        value={newField.type}
                                        onChange={(e) => setNewField({...newField, type: e.target.value as FieldType})}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none dark:text-white"
                                    >
                                        {Object.values(FieldType).map(type => (
                                            <option key={type} value={type}>{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                        {newField.type === FieldType.NUMBER ? 'Digits' : 'Field Size'}
                                    </label>
                                    <input 
                                        type="number" 
                                        value={newField.type === FieldType.NUMBER ? newField.precision : newField.size}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (newField.type === FieldType.NUMBER) {
                                                setNewField({...newField, precision: val});
                                            } else {
                                                setNewField({...newField, size: val});
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none dark:text-white"
                                    />
                                </div>
                            </div>

                            {newField.type === FieldType.NUMBER && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Decimal Places</label>
                                    <input 
                                        type="number" 
                                        value={newField.scale}
                                        onChange={(e) => setNewField({...newField, scale: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none dark:text-white"
                                    />
                                    <p className="text-[10px] text-neutral-400 mt-1 italic">Configure the number of digits after the decimal point.</p>
                                </div>
                            )}

                            {newField.type === FieldType.DATE && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Date Format</label>
                                    <select 
                                        value={newField.dateFormat}
                                        onChange={(e) => setNewField({...newField, dateFormat: e.target.value})}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none dark:text-white"
                                    >
                                        <option value="YYYY-MM-DD">YYYY-MM-DD (2024-05-01)</option>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY (01/05/2024)</option>
                                        <option value="MMMM D, YYYY">MMMM D, YYYY (May 1, 2024)</option>
                                        <option value="MMM D, YYYY">MMM D, YYYY (May 1, 2024)</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddField(false)}
                                    className="flex-1 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl"
                                >Cancel</button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-100 hover:bg-primary-700 active:scale-95 transition-all"
                                >Add Field</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse text-left">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-neutral-50 border-b border-neutral-200 dark:bg-slate-900 dark:border-slate-800">
                            <th className="w-10 px-4 py-3 border-r border-neutral-200 dark:border-slate-800"></th>
                            {table?.fields.map(f => (
                                <th key={f.id} className="px-6 py-3 font-bold text-neutral-600 uppercase text-[10px] tracking-widest border-r border-neutral-200 last:border-r-0 dark:text-slate-400 dark:border-slate-800 group/th">
                                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                                        <div className="flex items-center gap-2 cursor-pointer group/label overflow-hidden">
                                            {f.type === FieldType.CALCULATED && <span className="text-[9px] font-black bg-primary-100 text-primary-600 px-1 rounded truncate">fx</span>}
                                            <span className="truncate">{f.name}</span>
                                            <ChevronDown className="w-3 h-3 text-neutral-300 group-hover/label:text-neutral-900 dark:group-hover/label:text-white transition-colors shrink-0" />
                                        </div>
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (confirm(`Delete field "${f.name}"?`)) {
                                                    const updatedFields = table.fields.filter(field => field.id !== f.id);
                                                    await updateTable(selectedTableId!, { fields: updatedFields });
                                                }
                                            }}
                                            className="opacity-0 group-hover/th:opacity-100 p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-neutral-300 hover:text-rose-600 rounded transition-all shrink-0"
                                            title="Delete Field"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                        {loading ? (
                          Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                              <td className="px-4 py-4 border-r border-neutral-100 dark:border-slate-800"></td>
                              {table?.fields.map(f => (
                                <td key={f.id} className="px-6 py-4"><div className="h-4 bg-neutral-100 dark:bg-slate-800 rounded w-full" /></td>
                              ))}
                            </tr>
                          ))
                        ) : records.map((row, rid) => (
                            <tr key={rid} className="hover:bg-neutral-50 dark:hover:bg-slate-900/50 transition-colors group">
                                <td className="px-4 py-3 border-r border-neutral-100 dark:border-slate-800 flex items-center justify-center">
                                    <button 
                                        onClick={async () => {
                                            if (confirm('Delete record?') && selectedProjectId) {
                                                await dataService.deleteRecord(selectedProjectId, selectedTableId!, row.id);
                                            }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </td>
                                {table?.fields.map(f => {
                                    const isCalculated = f.type === FieldType.CALCULATED;
                                    const val = isCalculated ? evaluateExpression(f.calculatedExpression || '', row, records) : row[f.name] || '';
                                    
                                    return (
                                        <td key={f.id} className={cn(
                                            "px-6 py-3 border-r border-neutral-100 last:border-r-0 dark:border-slate-800",
                                            isCalculated && "bg-primary-50/20 dark:bg-primary-900/10 font-mono italic"
                                        )}>
                                            <input 
                                                type={f.type === FieldType.NUMBER ? 'number' : 'text'} 
                                                defaultValue={val}
                                                readOnly={isCalculated}
                                                onBlur={(e) => !isCalculated && handleCellChange(row.id, f.name, e.target.value)}
                                                className={cn(
                                                    "w-full bg-transparent outline-none border-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary-600/20 rounded px-1 -mx-1 text-neutral-900 dark:text-slate-300 transition-all font-medium",
                                                    isCalculated && "cursor-default text-primary-700 dark:text-primary-400"
                                                )}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


function QueryBuilderView() {
    const { tables } = useSchemaStore();
    const [selectedTable, setSelectedTable] = useState(tables[0]?.id || '');
    const currentTable = tables.find(t => t.id === selectedTable);
    const [filters, setFilters] = useState([{ field: '', operator: 'is', value: '' }]);
    const [results, setResults] = useState<any[]>([]);
    const [running, setRunning] = useState(false);

    const handleRunQuery = () => {
        setRunning(true);
        setTimeout(() => {
            setResults(Array.from({ length: 5 }).map((_, i) => ({ id: i + 1, name: 'Result ' + (i + 1), value: Math.random() * 1000 })));
            setRunning(false);
        }, 800);
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            <aside className="w-80 bg-white dark:bg-[#121212] border-r border-neutral-200 dark:border-neutral-800 p-6 overflow-y-auto space-y-8">
                <section className="space-y-4">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Table</label>
                    <select 
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white"
                    >
                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </section>

                <section className="space-y-4">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Fields</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {currentTable?.fields.map(f => (
                            <label key={f.id} className="flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600/20" defaultChecked />
                                <span className="text-sm text-neutral-700 font-medium group-hover:text-primary-600 transition-colors dark:text-neutral-400">{f.name}</span>
                            </label>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Filters</label>
                        <button 
                            onClick={() => setFilters([...filters, { field: '', operator: 'is', value: '' }])}
                            className="text-primary-600 hover:text-primary-700 p-1"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {filters.map((f, i) => (
                            <div key={i} className="space-y-2 p-3 bg-neutral-50 dark:bg-[#1A1A1A] rounded-xl border border-neutral-200 dark:border-neutral-800 relative">
                                <button 
                                    onClick={() => setFilters(filters.filter((_, idx) => idx !== i))}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full flex items-center justify-center text-neutral-400 hover:text-rose-600 shadow-sm"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <select className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs outline-none dark:text-neutral-300">
                                    <option value="">Choose field...</option>
                                    {currentTable?.fields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <select className="flex-1 px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs outline-none dark:text-neutral-300">
                                        <option value="is">Is</option>
                                        <option value="is_not">Is Not</option>
                                        <option value="contains">Contains</option>
                                    </select>
                                    <input placeholder="Value" className="flex-1 px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs outline-none dark:text-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <button 
                   onClick={handleRunQuery}
                   disabled={running}
                   className={cn(
                       "w-full py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2",
                       running ? "bg-neutral-100 text-neutral-400 cursor-not-allowed dark:bg-neutral-800" : "bg-primary-600 text-white hover:bg-primary-700 shadow-primary-100"
                   )}
                >
                    <Play className="w-4 h-4" /> {running ? 'Running...' : 'Run Query'}
                </button>
            </aside>

            <main className="flex-1 bg-neutral-50 dark:bg-[#0A0A0A] p-8 overflow-y-auto">
                {results.length > 0 ? (
                    <div className="bg-white dark:bg-[#121212] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                            <h4 className="font-bold text-neutral-900 dark:text-white">Query Results</h4>
                            <span className="text-xs font-bold text-neutral-400 uppercase">{results.length} Rows</span>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50/50 dark:bg-[#1A1A1A]">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-widest px-1">ID</th>
                                    <th className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-widest px-1">Resource Name</th>
                                    <th className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-widest px-1">Metric</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium font-mono text-xs">
                                {results.map(r => (
                                    <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-[#1A1A1A] transition-colors">
                                        <td className="px-6 py-4 text-neutral-400">#{r.id}</td>
                                        <td className="px-6 py-4 text-neutral-900 dark:text-neutral-300">{r.name}</td>
                                        <td className="px-6 py-4 text-primary-600">{r.value.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                         <Search className="w-16 h-16 text-neutral-300 mb-4" />
                         <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm">No results to display</p>
                         <p className="text-neutral-400 text-xs mt-1">Configure and run a query to see data here.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function SourcesView() {
    const [connectors, setConnectors] = useState([
        { id: 'internal', name: 'Internal Tables', type: 'system', status: 'connected', icon: <Database className="w-6 h-6" /> },
        { id: 'rest_api', name: 'REST API', type: 'api', status: 'disconnected', icon: <Globe className="w-6 h-6" /> },
        { id: 'trimble', name: 'Trimble Connect', type: 'external', status: 'disconnected', icon: <Box className="w-6 h-6" /> },
    ]);
    const [connecting, setConnecting] = useState<string | null>(null);

    const handleConnect = (id: string) => {
        setConnecting(id);
        setTimeout(() => {
            setConnectors(connectors.map(c => c.id === id ? { ...c, status: 'connected' } : c));
            setConnecting(null);
        }, 1500);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-neutral-900 mb-2 dark:text-white">Data Sources</h3>
            <p className="text-neutral-500 mb-8 dark:text-neutral-400 font-medium">Manage your workspace's connection to external and internal data origins.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connectors.map(c => (
                    <div key={c.id} className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                {c.icon}
                            </div>
                            <div className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                c.status === 'connected' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                            )}>
                                {c.status}
                            </div>
                        </div>
                        <h4 className="font-bold text-neutral-900 dark:text-white mb-2">{c.name}</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">Connect and sync data from {c.name} directly into your Nexus applications.</p>
                        
                        <button 
                            disabled={c.status === 'connected' || !!connecting}
                            onClick={() => handleConnect(c.id)}
                            className={cn(
                                "w-full py-2.5 rounded-xl text-xs font-bold transition-all",
                                c.status === 'connected' 
                                    ? "bg-neutral-50 text-neutral-400 cursor-default dark:bg-neutral-800" 
                                    : "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-100 active:scale-95"
                            )}
                        >
                            {connecting === c.id ? 'Connecting...' : c.status === 'connected' ? 'Connected' : 'Configure Connection'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
