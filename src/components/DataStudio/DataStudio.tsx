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
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Table as TableIcon,
  Download,
  Calendar,
  Type,
  Hash,
  Trash2,
  Upload as UploadIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSchemaStore } from '../../store/schemaStore';
import { useAuthStore } from '../../store/authStore';
import { SchemaView } from './SchemaView';
import { RestApiConfigModal } from '../Integrations/RestApiConfigModal';
import { TrimbleConnectView } from '../Integrations/TrimbleConnectView';
import { dataService } from '../../services/dataService';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, getDocs, where, limit, orderBy } from 'firebase/firestore';
import Papa from 'papaparse';
import axios from 'axios';
import { FieldType, RestApiConnector } from '../../types';


import { handleFirestoreError, OperationType } from '../../services/dataService';

// Cell Input component to prevent uncontrolled/controlled warnings
function CellInput({ 
    value, 
    onBlur, 
    readOnly, 
    type 
}: { 
    value: any, 
    onBlur: (v: string) => void, 
    readOnly?: boolean, 
    type?: string 
}) {
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    return (
        <input
            readOnly={readOnly}
            type={type || 'text'}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => onBlur(localValue)}
            className={cn(
                "w-full bg-transparent outline-none border-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-primary-600/20 rounded px-1 -mx-1 text-neutral-900 dark:text-slate-300 transition-all font-medium",
                readOnly && "cursor-default text-primary-700 dark:text-primary-400"
            )}
        />
    );
}

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
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableType, setNewTableType] = useState<'internal' | 'csv' | 'api' | 'trimble'>('internal');
  
  const { tables, selectedTableId, addTable } = useSchemaStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (selectedTableId && activeSubTab === 'sources') {
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
      <div className="h-12 border-b flex items-center px-6 gap-6 shrink-0 z-20" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        {[
          { id: 'schema', label: 'Schema View' },
          { id: 'table', label: 'Table View' },
          { id: 'csv', label: 'Import CSV' },
          { id: 'query', label: 'Query Builder' },
          { id: 'sources', label: 'Sources' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => {
              if (tab.id === 'csv') {
                setShowCSVImport(true);
              } else {
                setActiveSubTab(tab.id as any);
              }
            }}
            className={cn(
                "text-sm font-medium transition-all h-full px-2 border-b-2",
                activeSubTab === tab.id ? "text-primary-600 border-primary-600 font-black" : "text-neutral-500 hover:text-neutral-900 border-transparent dark:text-slate-400 dark:hover:text-slate-100"
            )}
          >{tab.label}</button>
        ))}
        <div className="flex-1"></div>
        <button 
            onClick={() => setShowAddTable(true)}
            className="px-3 py-1.5 text-neutral-500 dark:text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-sm transition-all shadow-primary-200/20"
            style={{ background: 'var(--project-btn-standard)' }}
        >
          <Plus className="w-4 h-4" /> New Table
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
        {activeSubTab === 'schema' && <SchemaView />}
        {activeSubTab === 'table' && <DataTableView />}
        {activeSubTab === 'query' && <QueryBuilderView />}
        {activeSubTab === 'sources' && <SourcesView onNavigate={(tab) => setActiveSubTab(tab)} />}
      </div>

      {showCSVImport && <CSVImportModal onFinish={() => setShowCSVImport(false)} onCancel={() => setShowCSVImport(false)} />}

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

function CSVImportModal({ onFinish, onCancel }: { onFinish: () => void; onCancel: () => void }) {
    const [stage, setStage] = useState<'choose' | 'new' | 'existing'>('choose');
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { addTable, tables } = useSchemaStore();
    const { selectedProjectId } = useAuthStore();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        
        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvData(results.data);
                if (results.data.length > 0) {
                    setHeaders(Object.keys(results.data[0]));
                }
            }
        });
    };

    const handleImportNew = async () => {
        if (!selectedProjectId || csvData.length === 0) return;
        setLoading(true);

        try {
            const tableId = `table_${Date.now()}`;
            const fields = headers.map(h => {
                // Heuristic type mapping
                const sample = csvData[0][h];
                let type = FieldType.TEXT;
                if (!isNaN(parseFloat(sample)) && isFinite(sample)) {
                    type = FieldType.NUMBER;
                } else if (!isNaN(Date.parse(sample))) {
                    type = FieldType.DATE;
                }
                return { id: Math.random().toString(36).substr(2, 9), name: h, type };
            });

            await addTable({ id: tableId, name: file?.name.replace('.csv', '') || 'Imported Table', fields });

            // Batch write rows
            const { writeBatch, doc, collection } = await import('firebase/firestore');
            const batchSize = 500;
            for (let i = 0; i < csvData.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = csvData.slice(i, i + batchSize);
                chunk.forEach(row => {
                    const docRef = doc(collection(db, 'workspaces', selectedProjectId, 'tableData', tableId, 'rows'));
                    batch.set(docRef, row);
                });
                await batch.commit();
            }
            onFinish();
        } catch (error) {
            console.error('Import failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={onCancel}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col border border-neutral-200 dark:border-slate-800 transition-all duration-300">
                <div className="px-8 py-6 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                             <UploadIcon className="w-5 h-5 text-primary-600" /> CSV Data Import
                        </h3>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
                            {stage === 'choose' ? 'Choose import destination' : stage === 'new' ? 'Configure New Table' : 'Map to Existing Table'}
                        </p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-neutral-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {stage === 'choose' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button 
                                onClick={() => setStage('new')}
                                className="group p-8 border-2 border-neutral-100 dark:border-slate-800 rounded-3xl hover:border-primary-600 hover:bg-primary-50/30 transition-all text-left"
                            >
                                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                    <Plus className="w-7 h-7" />
                                </div>
                                <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Create New Table</h4>
                                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">System will automatically detect fields and schema from your CSV file.</p>
                            </button>
                            <button 
                                onClick={() => setStage('existing')}
                                className="group p-8 border-2 border-neutral-100 dark:border-slate-800 rounded-3xl hover:border-primary-600 hover:bg-primary-50/30 transition-all text-left"
                            >
                                <div className="w-14 h-14 bg-neutral-100 dark:bg-slate-800 text-neutral-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                    <Database className="w-7 h-7" />
                                </div>
                                <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Import to Existing</h4>
                                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">Map your CSV columns to an already established table in your workspace.</p>
                            </button>
                        </div>
                    )}

                    {stage === 'new' && (
                        <div className="space-y-6">
                            <div className="p-12 border-2 border-dashed border-neutral-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center bg-neutral-50/50 dark:bg-slate-900/20 group hover:border-primary-600 transition-colors">
                                <UploadIcon className="w-12 h-12 text-neutral-300 mb-4 group-hover:text-primary-600 transition-colors" />
                                <p className="font-bold text-neutral-600 dark:text-slate-400">
                                    {file ? file.name : "Drop CSV file here or click to browse"}
                                </p>
                                <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={handleFileSelect} />
                                <label htmlFor="csv-upload" className="mt-4 px-6 py-2 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all cursor-pointer">Choose File</label>
                            </div>

                            {csvData.length > 0 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Schema Preview</h5>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{csvData.length} Records Detected</span>
                                    </div>
                                    <div className="border border-neutral-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                        <table className="w-full text-xs">
                                            <thead className="bg-neutral-50 dark:bg-slate-800">
                                                <tr>
                                                    <th className="px-6 py-3 text-left font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-tight">Field Name</th>
                                                    <th className="px-6 py-3 text-left font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-tight">Detected Type</th>
                                                    <th className="px-6 py-3 text-left font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-tight">Sample Data</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                                                {headers.map(h => (
                                                    <tr key={h}>
                                                        <td className="px-6 py-3 font-bold text-neutral-900 dark:text-white capitalize">{h}</td>
                                                        <td className="px-6 py-3">
                                                            <span className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg font-black text-[10px] uppercase tracking-tighter">
                                                                {!isNaN(parseFloat(csvData[0][h])) ? 'Number' : 'Text'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-neutral-500 italic max-w-[200px] truncate">{csvData[0][h]}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button onClick={() => setStage('choose')} className="px-6 py-2.5 font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-xl transition-all">Back</button>
                                        <button 
                                            disabled={loading}
                                            onClick={handleImportNew}
                                            className="px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-xl shadow-primary-200 hover:bg-primary-700 active:scale-95 disabled:bg-neutral-300 disabled:shadow-none transition-all flex items-center gap-2"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Import"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {stage === 'existing' && (
                        <div className="text-center py-12">
                            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Import to Existing Table</h4>
                            <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6 font-medium">Select a table to begin column mapping.</p>
                            <div className="max-w-xs mx-auto space-y-4">
                                <select className="w-full px-4 py-3 bg-neutral-50 dark:bg-slate-800 border-2 border-neutral-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-primary-600 transition-all dark:text-white">
                                    <option value="">Select a table...</option>
                                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => setStage('choose')} className="w-full py-2.5 font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-xl transition-all">Back</button>
                                    <button className="w-full py-3 bg-neutral-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-neutral-800 transition-all">Load Column Mapping</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { Loader2 } from 'lucide-react';

function DataTableView() {
    const { isAuthenticated, selectedProjectId } = useAuthStore();
    const { tables, selectedTableId, setSelectedTableId, addField, updateTable, deleteTable } = useSchemaStore();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [affectedApps, setAffectedApps] = useState<any[]>([]);
    const [showAddField, setShowAddField] = useState(false);
    const [newField, setNewField] = useState({
        name: '',
        description: '',
        type: FieldType.TEXT,
        size: 255,
        precision: 10,
        scale: 2,
        dateFormat: 'YYYY-MM-DD',
        autoIncrement: false,
    });
    
    const table = tables.find(t => t.id === selectedTableId) || tables[0];

    useEffect(() => {
      if (!selectedTableId && tables.length > 0) {
        setSelectedTableId(tables[0].id);
      }
    }, [tables, selectedTableId, setSelectedTableId]);

    const handleDeleteTableClick = async () => {
        if (!selectedTableId || !selectedProjectId) return;
        try {
            const appsSnap = await getDocs(collection(db, 'workspaces', selectedProjectId, 'apps'));
            const affected = appsSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((app: any) => app.dataSourceId === selectedTableId);
            setAffectedApps(affected);
        } catch (e) {
            setAffectedApps([]);
        }
        setShowDeleteConfirm(true);
    };

    const handleDeleteTableConfirm = async () => {
        if (!selectedTableId) return;
        await deleteTable(selectedTableId);
        setSelectedTableId(tables.length > 1 ? tables.find(t => t.id !== selectedTableId)?.id || null : null);
        setShowDeleteConfirm(false);
    };

    const handleAddFieldSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newField.name || !selectedTableId) return;

        const fieldId = Math.random().toString(36).substr(2, 9);
        const newFieldData = { id: fieldId, ...newField };

        // Store now handles Firestore
        await addField(selectedTableId, newFieldData);

        setShowAddField(false);
        setNewField({ name: '', description: '', type: FieldType.TEXT, size: 255, precision: 10, scale: 2, dateFormat: 'YYYY-MM-DD', autoIncrement: false });
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
        <div className="flex-1 flex flex-col h-full transition-colors duration-300" style={{ background: 'var(--bg-surface)' }}>
            <div className="h-14 border-b px-6 flex items-center gap-4" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
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
                    onClick={handleDeleteTableClick}
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
                        if (selectedTableId && selectedProjectId && table) {
                            const autoData: any = {};
                            table.fields.forEach(f => {
                                if (f.type === FieldType.AUTO_NUMBER || (f as any).autoIncrement) {
                                    const maxVal = records.reduce((max, r) => {
                                        const v = parseInt(r[f.name] || '0');
                                        return isNaN(v) ? max : Math.max(max, v);
                                    }, 0);
                                    autoData[f.name] = maxVal + 1;
                                }
                            });
                            await dataService.addRecord(selectedProjectId, selectedTableId, autoData);
                        }
                    }}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-2 transition-colors"
                  >
                      <Plus className="w-4 h-4" /> Add Row
                  </button>
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-neutral-200 dark:border-slate-800">
                        <div className="px-6 py-5 border-b border-neutral-100 dark:border-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-neutral-900 dark:text-white">Delete Table</h3>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium mb-4">
                                Are you sure you want to delete <strong>"{table?.name}"</strong>? All data in this table will be permanently removed.
                            </p>
                            {affectedApps.length > 0 && (
                                <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        {affectedApps.length} Application{affectedApps.length > 1 ? 's' : ''} will be affected
                                    </p>
                                    <ul className="space-y-1">
                                        {affectedApps.map((app: any) => (
                                            <li key={app.id} className="text-xs font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                                                {app.name || 'Unnamed Application'}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 font-medium">These applications will lose their data connection.</p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all">Cancel</button>
                                <button onClick={handleDeleteTableConfirm} className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all active:scale-95">Delete Table</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                        {[
                                            { value: FieldType.TEXT, label: 'Short Text' },
                                            { value: FieldType.LONG_TEXT, label: 'Long Text / Description' },
                                            { value: FieldType.NUMBER, label: 'Number (Integer/Decimal)' },
                                            { value: FieldType.DATE, label: 'Date / Calendar' },
                                            { value: FieldType.SINGLE_SELECT, label: 'Select (Options)' },
                                            { value: FieldType.BOOLEAN, label: 'Checkbox (Boolean)' },
                                            { value: FieldType.FORMULA, label: 'Formula (Calculated)' },
                                            { value: FieldType.RELATION, label: 'Relationship (Linked Record)' },
                                        ].map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-nowrap">
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

                            {newField.type === (FieldType.DATE as any) && (
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

                            {newField.type === FieldType.FORMULA && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Formula Expression</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. amount * 0.15"
                                        onChange={(e) => (newField as any).formula = e.target.value}
                                        className="w-full px-3 py-2 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none dark:text-white"
                                    />
                                </div>
                            )}

                            {(newField.type === FieldType.NUMBER || newField.type === FieldType.AUTO_NUMBER || newField.type === FieldType.TEXT) && (
                                <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-black/10 animate-in slide-in-from-top-2 duration-200">
                                    <div>
                                        <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Auto Increment</p>
                                        <p className="text-[10px] text-neutral-400">Automatically assign the next value when a row is added</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setNewField({...newField, autoIncrement: !newField.autoIncrement})}
                                        className="relative w-10 h-5 rounded-full transition-all shrink-0"
                                        style={{ background: newField.autoIncrement ? 'var(--color-primary)' : '#D1D5DB' }}
                                    >
                                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${newField.autoIncrement ? 'left-5' : 'left-0.5'}`} />
                                    </button>
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
                                    const isCalculated = f.type === FieldType.CALCULATED || f.type === FieldType.FORMULA;
                                    const val = isCalculated ? evaluateExpression((f as any).formula || f.calculatedExpression || '', row, records) : row[f.name] || '';
                                    
                                    return (
                                        <td key={f.id} className={cn(
                                            "px-6 py-3 border-r border-neutral-100 last:border-r-0 dark:border-slate-800",
                                            isCalculated && "bg-primary-50/20 dark:bg-primary-900/10 font-mono italic"
                                        )}>
                                            <CellInput 
                                                type={f.type === FieldType.NUMBER ? 'number' : 'text'} 
                                                value={val}
                                                readOnly={isCalculated}
                                                onBlur={(v) => !isCalculated && handleCellChange(row.id, f.name, v)}
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
    const { tables, restApiConnectors } = useSchemaStore();
    const { selectedProjectId } = useAuthStore();
    const getApis = restApiConnectors.filter((c: any) => c.method === 'GET');

    const [selectedTable, setSelectedTable] = useState(tables[0]?.id || '');
    const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});
    const [filters, setFilters] = useState<{ field: string; operator: string; value: string }[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [rawJson, setRawJson] = useState<any>(null);
    const [running, setRunning] = useState(false);
    const [rowLimit, setRowLimit] = useState(25);
    const [resultView, setResultView] = useState<'table' | 'json'>('table');
    const [apiFields, setApiFields] = useState<string[]>([]);

    const selectedApi = getApis.find((c: any) => c.id === selectedTable);
    const currentTable = selectedApi ? null : tables.find(t => t.id === selectedTable);

    // All available field names for the current source
    const allFieldNames: string[] = selectedApi
        ? apiFields
        : (currentTable?.fields.map(f => f.name) || []);

    // Initialise enabled map when source or fields change
    useEffect(() => {
        const initial: Record<string, boolean> = {};
        allFieldNames.forEach(name => { initial[name] = true; });
        setEnabledFields(initial);
        setFilters([]);
        setResults([]);
        setRawJson(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTable, apiFields.join(','), allFieldNames.join(',')]);

    // Pull schema fields from stored schema when API selected
    useEffect(() => {
        if (selectedApi) {
            try {
                const schema = typeof selectedApi.schema === 'string'
                    ? JSON.parse(selectedApi.schema) : selectedApi.schema;
                setApiFields(schema?.fields?.map((f: any) => f.name) || []);
            } catch { setApiFields([]); }
        } else {
            setApiFields([]);
        }
    }, [selectedApi]);

    // Which fields are currently enabled
    const activeFields = allFieldNames.filter(n => enabledFields[n] !== false);

    // Only keep filters whose field is still enabled
    const validFilters = filters.filter(f => !f.field || enabledFields[f.field] !== false);

    const applyClientFilters = (rows: any[]) => {
        return rows.filter(row => validFilters.every(f => {
            if (!f.field || !f.value) return true;
            const cell = String(row[f.field] ?? '');
            const val = f.value;
            switch (f.operator) {
                case '==': return cell === val;
                case '!=': return cell !== val;
                case '>': return parseFloat(cell) > parseFloat(val);
                case '<': return parseFloat(cell) < parseFloat(val);
                case 'contains': return cell.toLowerCase().includes(val.toLowerCase());
                default: return true;
            }
        }));
    };

    const projectFields = (row: any) => {
        if (activeFields.length === 0) return row;
        const out: any = {};
        activeFields.forEach(f => { if (f in row) out[f] = row[f]; });
        return out;
    };

    const handleRunQuery = async () => {
        if (!selectedTable) return;
        setRunning(true);
        setResults([]);
        setRawJson(null);

        try {
            if (selectedApi) {
                const url = new URL(selectedApi.baseUrl);
                (selectedApi.params || []).forEach((p: any) => { if (p.key) url.searchParams.set(p.key, p.value); });
                const headers: Record<string, string> = {};
                (selectedApi.headers || []).forEach((h: any) => { if (h.key) headers[h.key] = h.value; });

                const res = await fetch(url.toString(), { method: 'GET', headers });
                const contentType = res.headers.get('content-type') || '';
                let data: any;
                if (contentType.includes('application/json')) {
                    data = await res.json();
                } else {
                    const text = await res.text();
                    try { data = JSON.parse(text); } catch { data = text; }
                }

                setRawJson(data);
                let arr = Array.isArray(data)
                    ? data
                    : (data?.data || data?.results || data?.items || data?.records || []);

                if (Array.isArray(arr) && arr.length > 0) {
                    // Auto-detect fields from first row if not yet known
                    if (apiFields.length === 0) {
                        const detected = Object.keys(arr[0]);
                        setApiFields(detected);
                        const init: Record<string, boolean> = {};
                        detected.forEach(n => { init[n] = true; });
                        setEnabledFields(init);
                        // Apply client-side after state propagates
                        const filtered = rowLimit === 0 ? applyClientFilters(arr) : applyClientFilters(arr).slice(0, rowLimit);
                        setResults(filtered.map(projectFields));
                        return;
                    }
                    const filtered = rowLimit === 0 ? applyClientFilters(arr) : applyClientFilters(arr).slice(0, rowLimit);
                    setResults(filtered.map(projectFields));
                } else if (typeof data === 'object' && data !== null) {
                    setResults([projectFields(data)]);
                }
            } else if (selectedProjectId && selectedTable) {
                const constraints: any[] = [];
                // Only push filters that map to Firestore for table sources
                validFilters.forEach(f => {
                    if (f.field && f.value) {
                        constraints.push(where(f.field, f.operator as any, f.value));
                    }
                });
                const q = rowLimit === 0
                    ? query(
                        collection(db, 'workspaces', selectedProjectId, 'tableData', selectedTable, 'rows'),
                        ...constraints
                      )
                    : query(
                        collection(db, 'workspaces', selectedProjectId, 'tableData', selectedTable, 'rows'),
                        ...constraints,
                        limit(rowLimit)
                      );
                const snap = await getDocs(q);
                const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const projected = rows.map(projectFields);
                setResults(projected);
                setRawJson(rows);
            }
        } catch (error: any) {
            setRawJson({ error: error.message || 'Request failed' });
        } finally {
            setRunning(false);
        }
    };

    const handleExportCSV = () => {
        const csv = Papa.unparse(results);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'query_results.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const addFilter = (fieldName?: string) => {
        setFilters(prev => [...prev, { field: fieldName || '', operator: '==', value: '' }]);
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* ── Left sidebar ── */}
            <aside className="w-80 border-r overflow-y-auto" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                <div className="p-5 space-y-6">

                    {/* Datasource */}
                    <section className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Datasource</label>
                        <select
                            value={selectedTable}
                            onChange={(e) => setSelectedTable(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl text-sm font-bold outline-none"
                            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        >
                            {tables.length > 0 && <optgroup label="Tables">{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                            {getApis.length > 0 && <optgroup label="REST APIs (GET)">{getApis.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                        </select>
                        {selectedApi && (
                            <p className="text-[10px] font-mono truncate px-1" style={{ color: 'var(--color-primary)' }}>{selectedApi.baseUrl}</p>
                        )}
                    </section>

                    {/* Fields — with individual filter buttons */}
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                                Fields {allFieldNames.length > 0 && <span className="ml-1 opacity-60">({activeFields.length}/{allFieldNames.length})</span>}
                            </label>
                            {allFieldNames.length > 0 && (
                                <div className="flex gap-1">
                                    <button onClick={() => { const m: Record<string,boolean>={}; allFieldNames.forEach(n=>m[n]=true); setEnabledFields(m); }} className="text-[9px] font-bold uppercase tracking-wider hover:underline" style={{ color: 'var(--color-primary)' }}>All</button>
                                    <span style={{ color: 'var(--text-secondary)' }} className="text-[9px]">/</span>
                                    <button onClick={() => { const m: Record<string,boolean>={}; allFieldNames.forEach(n=>m[n]=false); setEnabledFields(m); }} className="text-[9px] font-bold uppercase tracking-wider hover:underline" style={{ color: 'var(--text-secondary)' }}>None</button>
                                </div>
                            )}
                        </div>

                        {allFieldNames.length === 0 ? (
                            <p className="text-[10px] italic px-1" style={{ color: 'var(--text-secondary)' }}>
                                {selectedApi ? 'Run query to detect fields' : 'No fields found'}
                            </p>
                        ) : (
                            <div className="space-y-0.5 max-h-56 overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
                                {allFieldNames.map(fieldName => {
                                    const isOn = enabledFields[fieldName] !== false;
                                    const hasFilter = filters.some(f => f.field === fieldName);
                                    return (
                                        <div key={fieldName} className={cn("flex items-center gap-2 px-3 py-2 text-xs transition-colors", isOn ? "" : "opacity-40")}
                                            style={{ background: isOn ? 'var(--bg-surface)' : 'var(--bg-primary)' }}>
                                            <input
                                                type="checkbox"
                                                checked={isOn}
                                                onChange={() => setEnabledFields(prev => ({ ...prev, [fieldName]: !isOn }))}
                                                className="w-3.5 h-3.5 rounded shrink-0 cursor-pointer"
                                                style={{ accentColor: 'var(--color-primary)' }}
                                            />
                                            <span className="flex-1 font-medium truncate" style={{ color: 'var(--text-primary)' }}>{fieldName}</span>
                                            {isOn && (
                                                <button
                                                    onClick={() => hasFilter
                                                        ? setFilters(prev => prev.filter(f => f.field !== fieldName))
                                                        : addFilter(fieldName)
                                                    }
                                                    title={hasFilter ? 'Remove filter' : 'Add filter'}
                                                    className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded transition-colors shrink-0", hasFilter ? "text-white" : "border")}
                                                    style={hasFilter
                                                        ? { background: 'var(--color-primary)', color: '#fff' }
                                                        : { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
                                                    }
                                                >
                                                    {hasFilter ? '− Filter' : '+ Filter'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Filters */}
                    {filters.length > 0 && (
                        <section className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Filters</label>
                                <button onClick={() => addFilter()} className="text-[10px] font-bold" style={{ color: 'var(--color-primary)' }}>
                                    + Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {filters.map((f, i) => (
                                    <div key={i} className="rounded-xl border p-2.5 space-y-2 relative" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                                        <button onClick={() => setFilters(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm text-rose-400 hover:text-rose-600 border"
                                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                                            <X className="w-3 h-3" />
                                        </button>
                                        {/* Field select — only shows enabled fields */}
                                        <select value={f.field}
                                            onChange={(e) => setFilters(prev => prev.map((fi, ii) => ii === i ? { ...fi, field: e.target.value } : fi))}
                                            className="w-full px-2 py-1.5 rounded text-xs font-bold outline-none border"
                                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                                            <option value="">Choose field…</option>
                                            {activeFields.map(name => <option key={name} value={name}>{name}</option>)}
                                        </select>
                                        <div className="flex gap-1.5">
                                            <select value={f.operator}
                                                onChange={(e) => setFilters(prev => prev.map((fi, ii) => ii === i ? { ...fi, operator: e.target.value } : fi))}
                                                className="flex-[2] px-2 py-1.5 rounded text-xs outline-none border"
                                                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                                                <option value="==">equals</option>
                                                <option value="!=">not equals</option>
                                                <option value=">">greater than</option>
                                                <option value="<">less than</option>
                                                <option value="contains">contains</option>
                                            </select>
                                            <input placeholder="value" value={f.value}
                                                onChange={(e) => setFilters(prev => prev.map((fi, ii) => ii === i ? { ...fi, value: e.target.value } : fi))}
                                                className="flex-[3] px-2 py-1.5 rounded text-xs outline-none border"
                                                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Row limit + Run */}
                    <div className="flex items-center gap-2">
                        <select value={rowLimit} onChange={(e) => setRowLimit(Number(e.target.value))}
                            className="text-[10px] font-black uppercase border rounded-lg px-2 py-1.5 outline-none flex-1"
                            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                            <option value={25}>25 rows</option>
                            <option value={50}>50 rows</option>
                            <option value={100}>100 rows</option>
                            <option value={500}>500 rows</option>
                            <option value={0}>All Records</option>
                        </select>
                        <button onClick={handleRunQuery} disabled={running}
                            className={cn("flex-[2] py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm",
                                running ? "cursor-not-allowed opacity-50" : "text-white")}
                            style={!running ? { background: 'var(--color-primary)' } : { background: 'var(--border-color)' }}>
                            <Play className="w-4 h-4" /> {running ? 'Running…' : 'Run Query'}
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Results pane ── */}
            <main className="flex-1 overflow-y-auto flex flex-col" style={{ background: 'var(--bg-primary)' }}>
                {(results.length > 0 || rawJson !== null) ? (
                    <div className="flex-1 flex flex-col rounded-2xl border shadow-xl overflow-hidden m-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        {/* Header with JSON/Table toggle */}
                        <div className="px-5 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
                            <div className="flex items-center gap-3">
                                <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Query Results</h4>
                                <div className="flex items-center gap-0.5 p-0.5 rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                                    {(['table', 'json'] as const).map(mode => (
                                        <button key={mode} onClick={() => setResultView(mode)}
                                            className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all"
                                            style={resultView === mode
                                                ? { background: 'var(--color-primary)', color: '#fff' }
                                                : { color: 'var(--text-secondary)' }}>
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                                {results.length > 0 && (
                                    <button onClick={handleExportCSV} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 border"
                                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                )}
                            </div>
                            <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                                {results.length} rows · {activeFields.length} fields
                            </span>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-auto">
                            {resultView === 'json' ? (
                                <pre className="p-6 text-xs font-mono text-emerald-400 bg-slate-900 min-h-full overflow-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(rawJson, null, 2)}
                                </pre>
                            ) : results.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0" style={{ background: 'var(--bg-primary)' }}>
                                        <tr>
                                            {Object.keys(results[0] || {}).map(k => (
                                                <th key={k} className="px-5 py-2.5 font-bold uppercase text-[10px] tracking-widest text-left whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{k}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y font-mono text-xs" style={{ borderColor: 'var(--border-color)' }}>
                                        {results.map((r, i) => (
                                            <tr key={i} className="transition-colors" style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-primary)' }}>
                                                {Object.values(r).map((v: any, j) => (
                                                    <td key={j} className="px-5 py-2.5 max-w-[200px] truncate" style={{ color: 'var(--text-primary)' }}>
                                                        {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    No rows matched — switch to JSON view to inspect the raw payload.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                        <Search className="w-16 h-16 text-neutral-300 mb-4" />
                        <p className="text-neutral-500 font-bold uppercase tracking-widest text-sm">No results yet</p>
                        <p className="text-neutral-400 text-xs mt-1">Select a datasource and click Run Query</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function SourcesView({ onNavigate }: { onNavigate?: (tab: any) => void }) {
    const { restApiConnectors, deleteRestApiConnector } = useSchemaStore();
    const { selectedProjectId } = useAuthStore();
    const [view, setView] = useState<'list' | 'api' | 'trimble'>('list');
    const [editingConnector, setEditingConnector] = useState<RestApiConnector | null>(null);

    const connectors = [
        { id: 'internal', name: 'Internal Tables', type: 'system', status: 'connected', icon: <Database className="w-6 h-6" />, description: 'Manage local database tables and structures.' },
        { id: 'rest_api', name: 'REST API', type: 'api', status: restApiConnectors.length > 0 ? 'connected' : 'disconnected', icon: <Globe className="w-6 h-6" />, description: 'Connect to external JSON APIs for dynamic data.' },
        { id: 'trimble', name: 'Trimble Connect', type: 'external', status: 'disconnected', icon: <Box className="w-6 h-6" />, description: 'Sync 3D models and project data from Trimble.' },
    ];

    if (view === 'api') return (
        <RestApiConfigModal 
            onBack={() => { setView('list'); setEditingConnector(null); }} 
            editingConnector={editingConnector}
        />
    );
    
    if (view === 'trimble') return <TrimbleConnectView onBack={() => setView('list')} onConnect={() => {
        setView('list');
    }} />;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-12">
            <header>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2 dark:text-white">Data Sources</h3>
                <p className="text-neutral-500 mb-8 dark:text-neutral-400 font-medium text-sm">Manage your workspace's connection to external and internal data origins.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connectors.map(c => (
                    <div key={c.id} className="rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
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
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">{c.description}</p>
                        
                        <button 
                            onClick={() => {
                                if (c.id === 'internal' && onNavigate) onNavigate('table');
                                else if (c.id === 'rest_api') setView('api');
                                else if (c.id === 'trimble') setView('trimble');
                            }}
                            className={cn(
                                "w-full py-2.5 rounded-xl text-xs font-bold transition-all",
                                (c.status === 'connected' && c.id === 'trimble')
                                    ? "bg-neutral-50 text-neutral-400 cursor-default dark:bg-neutral-800" 
                                    : "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-100 active:scale-95"
                            )}
                        >
                            {c.id === 'internal' ? 'View Tables' : (c.id === 'rest_api' && restApiConnectors.length > 0 ? '+ Add Another API' : 'Configure Connection')}
                        </button>
                    </div>
                ))}
            </div>

            {restApiConnectors.length > 0 && (
              <section className="space-y-6 pt-8 border-t border-neutral-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400">Active REST Connections</h4>
                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">{restApiConnectors.length} Connections</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {restApiConnectors.map(connector => (
                    <div key={connector.id} className="rounded-2xl p-5 flex items-center justify-between group/card hover:border-primary-600 transition-all border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-neutral-900 dark:text-white">{connector.name}</h5>
                          <p className="text-[10px] font-mono text-neutral-400 truncate max-w-[200px]">{connector.baseUrl}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingConnector(connector);
                            setView('api');
                          }}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-400 hover:text-primary-600 rounded-lg transition-all"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this connection?') && selectedProjectId) {
                              await deleteRestApiConnector(connector.id);
                            }
                          }}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-neutral-300 hover:text-rose-600 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
        </div>
    );
}
