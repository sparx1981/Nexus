import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Layout, 
  Smartphone, 
  Settings, 
  Trash2, 
  ExternalLink, 
  Database,
  Search,
  Calendar,
  X,
  PlusCircle,
  MoreVertical,
  Layers
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBuilderStore } from '../../store/builderStore';
import { useSchemaStore } from '../../store/schemaStore';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';

export function ApplicationsView({ onSelectApp }: { onSelectApp: (id: string) => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [addStep, setAddStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newApp, setNewApp] = useState({
    name: '',
    description: '',
    dataSourceId: '',
    mode: 'view_only',
    keyFields: [] as string[],
    joins: [] as any[]
  });

  const { selectedProjectId } = useAuthStore();
  const { tables } = useSchemaStore();

  useEffect(() => {
    if (!selectedProjectId) return;

    setLoading(true);
    const q = query(collection(db, 'projects', selectedProjectId, 'apps'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApps(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProjectId]);

  const handleAddApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApp.name || !selectedProjectId) return;

    if (editingAppId) {
      await setDoc(doc(db, 'projects', selectedProjectId, 'apps', editingAppId), {
        name: newApp.name,
        description: newApp.description,
        dataSourceId: newApp.dataSourceId,
        mode: newApp.mode,
        keyFields: newApp.keyFields,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      const appId = newApp.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
      
      await setDoc(doc(db, 'projects', selectedProjectId, 'apps', appId), {
        id: appId,
        name: newApp.name,
        description: newApp.description,
        dataSourceId: newApp.dataSourceId,
        mode: newApp.mode,
        keyFields: newApp.keyFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        components: []
      });
      onSelectApp(appId);
    }

    setNewApp({ name: '', description: '', dataSourceId: '', mode: 'view_only', keyFields: [], joins: [] });
    setShowAddModal(false);
    setEditingAppId(null);
    setAddStep(1);
  };

  const handleEditClick = (e: React.MouseEvent, app: any) => {
    e.stopPropagation();
    setNewApp({
      name: app.name,
      description: app.description || '',
      dataSourceId: app.dataSourceId || '',
      mode: app.mode || 'view_only',
      keyFields: app.keyFields || [],
      joins: app.joins || []
    });
    setEditingAppId(app.id);
    setShowAddModal(true);
    setAddStep(1);
  };

  const handleNextStep = () => {
    if (addStep === 1 && newApp.name) {
        setAddStep(2);
    } else if (addStep === 2) {
        setAddStep(3);
    }
  };

  const handleBackStep = () => {
    if (addStep === 2) setAddStep(1);
    if (addStep === 3) setAddStep(2);
  };

  const handleDeleteApp = async (id: string) => {
    if (!selectedProjectId) return;
    if (confirm('Are you sure you want to delete this application?')) {
        await deleteDoc(doc(db, 'projects', selectedProjectId, 'apps', id));
    }
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-[#0A0A0A] overflow-hidden">
      {/* Search Header */}
      <div className="h-14 border-b border-neutral-200 bg-white px-8 flex items-center justify-between shrink-0 dark:bg-[#121212] dark:border-neutral-800">
        <div className="relative w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-600/20 outline-none dark:bg-neutral-800 dark:text-neutral-200"
          />
        </div>
        <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> New Application
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-neutral-200 h-48 animate-pulse dark:bg-neutral-900 dark:border-neutral-800"></div>
                ))}
            </div>
        ) : filteredApps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredApps.map(app => (
                    <div 
                        key={app.id} 
                        className="bg-white border border-neutral-200 dark:bg-[#121212] dark:border-neutral-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative cursor-pointer"
                        onClick={() => onSelectApp(app.id)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/30 text-primary-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleEditClick(e, app)}
                                    className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteApp(app.id);
                                    }}
                                    className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="font-bold text-neutral-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors">
                            <div className="flex items-center gap-2">
                                {app.name}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                    app.mode === 'view_only' ? "bg-neutral-100 text-neutral-500" : "bg-primary-50 text-primary-600"
                                )}>
                                    {app.mode?.replace('_', ' ')}
                                </span>
                            </div>
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 line-clamp-2 min-h-[32px]">{app.description || 'No description provided.'}</p>

                        <div className="flex items-center justify-between pt-4 border-t border-neutral-50 dark:border-neutral-800/50">
                             <div className="flex items-center gap-2">
                                <Database className="w-3 w-3 text-neutral-400" />
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{app.dataSourceId || 'No Source'}</span>
                             </div>
                             <div className="flex items-center gap-3">
                                <Smartphone className="w-3 h-3 text-neutral-300" />
                                <Layers className="w-3 h-3 text-neutral-300" />
                             </div>
                        </div>

                        <div className="absolute inset-0 ring-2 ring-primary-600 ring-offset-4 rounded-2xl opacity-0 group-hover:opacity-10 focus-within:opacity-10 pointer-events-none transition-opacity"></div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-white/50 dark:bg-neutral-900/20 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mb-4">
                    <PlusCircle className="w-8 h-8 text-neutral-300" />
                </div>
                <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Applications Found</h4>
                <p className="text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-6">Start by creating your first business application to streamline your workflows.</p>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 transition-all active:scale-95"
                >Get Started</button>
            </div>
        )}
      </div>

      {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm shadow-2xl" onClick={() => setShowAddModal(false)}></div>
              <div className="relative bg-white dark:bg-[#121212] rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50">
                      <div>
                        <h3 className="font-bold text-neutral-900 dark:text-white">
                          {editingAppId ? 'Application Settings' : (addStep === 1 ? 'New Application' : addStep === 2 ? 'Configure Data Source' : 'Operational Mode')}
                        </h3>
                        <p className="text-xs text-neutral-500 font-medium">
                          {editingAppId ? 'Update application configuration' : (addStep === 1 ? 'Step 1: General Information' : addStep === 2 ? 'Step 2: Connect your data' : 'Step 3: Define operations')}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setShowAddModal(false);
                          setEditingAppId(null);
                        }} 
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                      >
                          <X className="w-5 h-5 text-neutral-500" />
                      </button>
                  </div>
                  
                  <div className="p-8">
                      {addStep === 1 ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Application Name</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={newApp.name}
                                    onChange={(e) => setNewApp({...newApp, name: e.target.value})}
                                    placeholder="e.g. Sales CRM, HR Portal"
                                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 outline-none dark:text-white transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Description</label>
                                <textarea 
                                    rows={4}
                                    value={newApp.description}
                                    onChange={(e) => setNewApp({...newApp, description: e.target.value})}
                                    placeholder="What is the purpose of this application?"
                                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-medium outline-none dark:text-white resize-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-all"
                                >Cancel</button>
                                <button 
                                    type="button"
                                    onClick={handleNextStep}
                                    disabled={!newApp.name}
                                    className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-xl shadow-primary-200 hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
                                >Continue to Data</button>
                            </div>
                        </div>
                      ) : addStep === 2 ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Select Primary Datasource</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {tables.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setNewApp({...newApp, dataSourceId: t.id})}
                                            className={cn(
                                                "p-4 rounded-2xl border-2 text-left transition-all relative group",
                                                newApp.dataSourceId === t.id 
                                                    ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/20 shadow-lg shadow-primary-200/10" 
                                                    : "border-neutral-100 dark:border-neutral-800 hover:border-neutral-300"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                                    newApp.dataSourceId === t.id ? "bg-primary-600 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                                                )}>
                                                    <Database className="w-4 h-4" />
                                                </div>
                                                <span className={cn("text-xs font-bold", newApp.dataSourceId === t.id ? "text-primary-700 dark:text-primary-400" : "text-neutral-600 dark:text-neutral-300")}>
                                                    {t.name}
                                                </span>
                                            </div>
                                            {newApp.dataSourceId === t.id && (
                                                <div className="absolute top-2 right-2 w-2 h-2 bg-primary-600 rounded-full"></div>
                                            )}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setNewApp({...newApp, dataSourceId: ''})}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 text-left transition-all",
                                            !newApp.dataSourceId 
                                                ? "border-primary-600 bg-primary-50/50 dark:bg-primary-950/20" 
                                                : "border-neutral-100 dark:border-neutral-800"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 opacity-50">
                                            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                                <X className="w-4 h-4 text-neutral-400" />
                                            </div>
                                            <span className="text-xs font-bold">No Primary Source</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Joins & Relationships</label>
                                    <button type="button" className="text-[10px] font-bold text-primary-600 hover:underline uppercase tracking-tight flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> Add Join
                                    </button>
                                </div>
                                <div className="bg-neutral-50 dark:bg-[#1A1A1A] p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-center py-8">
                                    <Layers className="w-8 h-8 text-neutral-200 dark:text-neutral-700 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">No joins configured yet</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={handleBackStep}
                                    className="flex-1 py-3 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-all"
                                >Back</button>
                                <button 
                                    type="button"
                                    onClick={handleNextStep}
                                    className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-xl shadow-primary-200 hover:bg-primary-700 active:scale-95 transition-all"
                                >Continue to Mode</button>
                            </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Application Mode</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'view_only', label: 'View Only', desc: 'Read-only access to records' },
                                        { id: 'add', label: 'Add Records', desc: 'Create new entries in table' },
                                        { id: 'update', label: 'Update Records', desc: 'Modify existing entries' },
                                        { id: 'delete', label: 'Delete Records', desc: 'Remove entries from source' },
                                    ].map(mode => (
                                        <button
                                            key={mode.id}
                                            type="button"
                                            onClick={() => setNewApp({...newApp, mode: mode.id as any})}
                                            className={cn(
                                                "p-3 rounded-xl border-2 text-left transition-all",
                                                newApp.mode === mode.id ? "border-primary-600 bg-primary-50 dark:bg-primary-950/20" : "border-neutral-100 dark:border-neutral-800"
                                            )}
                                        >
                                            <div className="text-xs font-bold mb-1 dark:text-white">{mode.label}</div>
                                            <div className="text-[9px] text-neutral-400 font-medium">{mode.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newApp.dataSourceId && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Key Fields (for matching)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {tables.find(t => t.id === newApp.dataSourceId)?.fields.map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => {
                                                    const keys = newApp.keyFields.includes(f.id) 
                                                        ? newApp.keyFields.filter(id => id !== f.id)
                                                        : [...newApp.keyFields, f.id];
                                                    setNewApp({...newApp, keyFields: keys});
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all",
                                                    newApp.keyFields.includes(f.id)
                                                        ? "bg-primary-600 border-primary-600 text-white"
                                                        : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500"
                                                )}
                                            >
                                                {f.name}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-neutral-400 italic">Nexus will use these fields to identify unique records during update/delete operations.</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={handleBackStep}
                                    className="flex-1 py-3 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-all"
                                >Back</button>
                                <button 
                                    type="button"
                                    onClick={handleAddApp}
                                    className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-xl shadow-primary-200 hover:bg-primary-700 active:scale-95 transition-all"
                                >{editingAppId ? 'Update Application' : 'Build Application'}</button>
                            </div>
                        </div>
                      ) }
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
