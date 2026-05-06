import React, { useState, useEffect } from 'react';
import {
  Plus, Layout, Settings, Trash2, ExternalLink, Database,
  Search, X, PlusCircle, Layers, Copy, LayoutGrid, List,
  Globe, ChevronRight, Clock, Info, Star
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSchemaStore } from '../../store/schemaStore';
import { handleFirestoreError, OperationType } from '../../services/dataService';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';

const MODE_LABELS: Record<string, { label: string; colour: string }> = {
  view_only: { label: 'View Only', colour: 'bg-neutral-100 text-neutral-500 dark:bg-slate-800 dark:text-slate-400' },
  add:       { label: 'Add Records', colour: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' },
  update:    { label: 'Update Records', colour: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' },
  delete:    { label: 'Delete Records', colour: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' },
};

export function ApplicationsView({ onSelectApp }: { onSelectApp: (id: string) => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [addStep, setAddStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [favouriteFilter, setFavouriteFilter] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const [newApp, setNewApp] = useState({
    name: '', description: '', dataSourceId: '', mode: 'view_only',
    keyFields: [] as string[], joins: [] as any[]
  });

  const { selectedProjectId } = useAuthStore();
  const { tables } = useSchemaStore();

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    const q = query(collection(db, 'workspaces', selectedProjectId, 'apps'));
    const unsub = onSnapshot(q, (snapshot) => {
      setApps(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `workspaces/${selectedProjectId}/apps`));
    return () => unsub();
  }, [selectedProjectId]);

  const handleAddApp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newApp.name || !selectedProjectId) return;
    if (editingAppId) {
      await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', editingAppId), {
        name: newApp.name, description: newApp.description,
        dataSourceId: newApp.dataSourceId, mode: newApp.mode,
        keyFields: newApp.keyFields, updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      const appId = newApp.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
      await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', appId), {
        id: appId, name: newApp.name, description: newApp.description,
        dataSourceId: newApp.dataSourceId, mode: newApp.mode,
        keyFields: newApp.keyFields, createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(), components: []
      });
      onSelectApp(appId);
    }
    setNewApp({ name: '', description: '', dataSourceId: '', mode: 'view_only', keyFields: [], joins: [] });
    setShowAddModal(false); setEditingAppId(null); setAddStep(1);
  };

  const handleEditClick = (e: React.MouseEvent, app: any) => {
    e.stopPropagation();
    setNewApp({ name: app.name, description: app.description || '', dataSourceId: app.dataSourceId || '',
      mode: app.mode || 'view_only', keyFields: app.keyFields || [], joins: app.joins || [] });
    setEditingAppId(app.id); setShowAddModal(true); setAddStep(1);
  };

  const handleDuplicate = async (e: React.MouseEvent, app: any) => {
    e.stopPropagation();
    if (!selectedProjectId) return;
    const snap = await getDoc(doc(db, 'workspaces', selectedProjectId, 'apps', app.id));
    if (!snap.exists()) return;
    const data = snap.data();
    const newId = (app.name + '_copy').toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', newId), {
      ...data, id: newId, name: data.name + ' (Copy)',
      published: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  };

  const handleDeleteApp = async (id: string) => {
    if (!selectedProjectId || !deleteConfirm) return;
    await deleteDoc(doc(db, 'workspaces', selectedProjectId, 'apps', id));
    setDeleteConfirm(null);
  };

  const handleToggleFavourite = async (e: React.MouseEvent, app: any) => {
    e.stopPropagation();
    if (!selectedProjectId) return;
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', app.id), { favourite: !app.favourite }, { merge: true });
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = !favouriteFilter || app.favourite;
    return matchesSearch && matchesFav;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <div className="h-14 border-b px-6 flex items-center gap-3 shrink-0" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input type="text" placeholder="Search applications..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-600/20 outline-none dark:text-neutral-200" />
        </div>
        {/* View toggle */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 gap-0.5">
          <button onClick={() => setViewMode('card')} title="Card view"
            className={cn('p-1.5 rounded-lg transition-all', viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} title="List view"
            className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600')}>
            <List className="w-4 h-4" />
          </button>
        </div>
        {/* Favourites filter */}
        <button
          onClick={() => setFavouriteFilter(f => !f)}
          title={favouriteFilter ? 'Show all applications' : 'Show favourites only'}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
            favouriteFilter
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-600'
              : 'bg-neutral-100 dark:bg-neutral-800 border-transparent text-neutral-400 hover:text-amber-500')}>
          <Star className={cn('w-3.5 h-3.5', favouriteFilter && 'fill-amber-400 text-amber-400')} />
          {favouriteFilter ? 'Favourites' : 'All'}
        </button>
        <div className="flex-1" />
        <button onClick={() => setShowAddModal(true)}
          className="text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 hover:brightness-110 hover:-translate-y-px hover:shadow-md shrink-0"
          style={{ background: 'var(--color-primary)', boxShadow: '0 4px 14px 0 var(--color-primary-light)' }}>
          <Plus className="w-4 h-4" /> New Application
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl border border-neutral-200 dark:border-neutral-800 animate-pulse bg-white dark:bg-neutral-900" />)}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-white/50 dark:bg-neutral-900/20 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
            {/* G-10: Illustrated empty state */}
            <svg viewBox="0 0 160 120" className="w-40 h-30 mb-5 opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="30" width="120" height="70" rx="12" fill="var(--color-primary-light,#EBF5FF)" stroke="var(--color-primary,#1A56DB)" strokeWidth="1.5" strokeDasharray="4 3"/>
              <rect x="36" y="48" width="36" height="26" rx="6" fill="var(--color-primary,#1A56DB)" opacity="0.15"/>
              <rect x="80" y="48" width="44" height="8" rx="4" fill="var(--color-primary,#1A56DB)" opacity="0.2"/>
              <rect x="80" y="62" width="30" height="8" rx="4" fill="var(--color-primary,#1A56DB)" opacity="0.12"/>
              <circle cx="54" cy="61" r="10" fill="var(--color-primary,#1A56DB)" opacity="0.25"/>
              <path d="M49 61l3.5 3.5L59 57" stroke="var(--color-primary,#1A56DB)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
              <circle cx="80" cy="20" r="12" fill="var(--color-primary,#1A56DB)" opacity="0.9"/>
              <path d="M74 20h4l4 6V20h4" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Applications Yet</h4>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-6">Build your first app by connecting it to a data table and adding components.</p>
            <button onClick={() => setShowAddModal(true)}
              className="text-white px-6 py-2 rounded-xl font-bold transition-all active:scale-95 hover:brightness-110 hover:-translate-y-px hover:shadow-md" style={{ background: 'var(--color-primary)' }}>
              Create First App
            </button>
          </div>
        ) : viewMode === 'card' ? (
          /* ── Card view ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredApps.map(app => (
              <div key={app.id}
                className="rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative cursor-pointer border"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                onClick={() => onSelectApp(app.id)}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                    {/* G-11: Letter avatar derived from app name */}
                    {(() => {
                      const name = app.name || 'A';
                      const letter = name.charAt(0).toUpperCase();
                      const hue = name.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) % 360;
                      const bg = `hsl(${hue},55%,88%)`;
                      const fg = `hsl(${hue},55%,35%)`;
                      return (
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform" style={{ background: bg, color: fg }}>
                          {letter}
                        </div>
                      );
                    })()}
                    {app.published
                      ? <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900/30 rounded-full text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</span>
                      : <span className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-slate-800 text-neutral-400 rounded-full text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />Draft</span>}
                  </div>
                  {/* Action buttons — star always visible if active, others on hover */}
                  <div className="flex items-center gap-1">
                    <button onClick={e => handleToggleFavourite(e, app)} title={app.favourite ? 'Remove from favourites' : 'Add to favourites'}
                      className={cn(
                        'p-1.5 rounded-lg transition-all transition-opacity duration-200',
                        app.favourite ? 'text-amber-400 opacity-100' : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                      )}>
                      <Star className={cn('w-4 h-4', app.favourite && 'fill-amber-400')} />
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => handleDuplicate(e, app)} title="Duplicate"
                        className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={e => handleEditClick(e, app)} title="Settings"
                        className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: app.id, name: app.name }); }} title="Delete"
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 transition-colors text-sm">{app.name}</h3>
                  {app.mode && (
                    <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest', MODE_LABELS[app.mode]?.colour || 'bg-neutral-100 text-neutral-500')}>
                      {MODE_LABELS[app.mode]?.label || app.mode}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5 line-clamp-2 min-h-[32px]">{app.description || 'No description.'}</p>
                <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800/50">
                  <div className="flex items-center gap-2">
                    <Database className="w-3 h-3 text-neutral-400" />
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      {tables.find(t => t.id === app.dataSourceId)?.name || 'No Source'}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-primary-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── List view ── */
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <table className="w-full text-left">
              <thead style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  {['Application', 'Mode', 'Data Source', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {filteredApps.map(app => (
                  <tr key={app.id}
                    onClick={() => onSelectApp(app.id)}
                    className="cursor-pointer hover:bg-primary-50/30 dark:hover:bg-primary-950/10 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/30 text-primary-600 flex items-center justify-center shrink-0">
                          <Layout className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 transition-colors">{app.name}</p>
                          {app.description && <p className="text-[10px] text-neutral-400 truncate max-w-[200px]">{app.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest', MODE_LABELS[app.mode]?.colour || 'bg-neutral-100 text-neutral-500')}>
                        {MODE_LABELS[app.mode]?.label || app.mode || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-slate-400">
                        <Database className="w-3 h-3 text-neutral-400" />
                        {tables.find(t => t.id === app.dataSourceId)?.name || <span className="italic">No source</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {app.published
                        ? <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600"><Globe className="w-3 h-3" />Published</span>
                        : <span className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400"><span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />Draft</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={e => handleToggleFavourite(e, app)} title={app.favourite ? 'Remove from favourites' : 'Add to favourites'}
                          className={cn(
                            'p-1.5 rounded-lg transition-all transition-opacity duration-200',
                            app.favourite ? 'text-amber-400 opacity-100' : 'text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                          )}>
                          <Star className={cn('w-3.5 h-3.5', app.favourite && 'fill-amber-400')} />
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => handleDuplicate(e, app)} title="Duplicate"
                            className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => handleEditClick(e, app)} title="Settings"
                            className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: app.id, name: app.name }); }} title="Delete"
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditingAppId(null); }} />
          <div className="relative rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="px-8 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white">
                  {editingAppId ? 'Application Settings' : (addStep === 1 ? 'New Application' : addStep === 2 ? 'Configure Data Source' : 'Operational Mode')}
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  {editingAppId ? 'Update application configuration' : `Step ${addStep} of 3`}
                </p>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingAppId(null); }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <div className="p-8">
              {addStep === 1 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Application Name</label>
                    <input autoFocus type="text" value={newApp.name}
                      onChange={e => setNewApp({ ...newApp, name: e.target.value })}
                      placeholder="e.g. Sales CRM, HR Portal"
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 outline-none dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Description</label>
                    <textarea rows={3} value={newApp.description}
                      onChange={e => setNewApp({ ...newApp, description: e.target.value })}
                      placeholder="What is the purpose of this application?"
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-medium outline-none dark:text-white resize-none" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowAddModal(false)}
                      className="flex-1 py-3 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-all">Cancel</button>
                    <button type="button" onClick={() => newApp.name && setAddStep(2)} disabled={!newApp.name}
                      className="flex-1 py-3 text-white font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: 'var(--color-primary)' }}>Continue to Data</button>
                  </div>
                </div>
              )}
              {addStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Primary Datasource</label>
                    <p className="text-[11px] text-neutral-500 leading-relaxed bg-neutral-50 dark:bg-slate-800/50 border border-neutral-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
                      Setting a datasource here links the <strong>whole application</strong> to a table — useful for form submissions or record lookups that span multiple components. Individual components like Data Tables and Charts can also connect to their own datasource independently via their properties.
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      <button type="button" onClick={() => setNewApp({ ...newApp, dataSourceId: '' })}
                        className={cn('p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3', !newApp.dataSourceId ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20' : 'border-neutral-100 dark:border-neutral-800')}>
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center opacity-50"><X className="w-3.5 h-3.5 text-neutral-400" /></div>
                        <span className="text-xs font-bold text-neutral-500">No Primary Source</span>
                      </button>
                      {tables.map(t => (
                        <button key={t.id} type="button" onClick={() => setNewApp({ ...newApp, dataSourceId: t.id })}
                          className={cn('p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3', newApp.dataSourceId === t.id ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20' : 'border-neutral-100 dark:border-neutral-800')}>
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', newApp.dataSourceId === t.id ? 'bg-primary-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400')}>
                            <Database className="w-3.5 h-3.5" />
                          </div>
                          <span className={cn('text-xs font-bold truncate', newApp.dataSourceId === t.id ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-600 dark:text-neutral-300')}>{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setAddStep(1)} className="flex-1 py-3 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-all">Back</button>
                    <button type="button" onClick={() => setAddStep(3)} className="flex-1 py-3 text-white font-bold rounded-2xl active:scale-95 transition-all" style={{ background: 'var(--color-primary)' }}>Continue to Mode</button>
                  </div>
                </div>
              )}
              {addStep === 3 && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Application Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'view_only', label: 'View Only', desc: 'Read-only access to records' },
                        { id: 'add', label: 'Add Records', desc: 'Create new entries in table' },
                        { id: 'update', label: 'Update Records', desc: 'Modify existing entries' },
                        { id: 'delete', label: 'Delete Records', desc: 'Remove entries from source' },
                      ].map(mode => (
                        <button key={mode.id} type="button" onClick={() => setNewApp({ ...newApp, mode: mode.id as any })}
                          className={cn('p-3 rounded-xl border-2 text-left transition-all', newApp.mode === mode.id ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/20' : 'border-neutral-100 dark:border-neutral-800')}>
                          <div className="text-xs font-bold mb-0.5 dark:text-white">{mode.label}</div>
                          <div className="text-[9px] text-neutral-400">{mode.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {newApp.dataSourceId && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                        Key Fields (for matching)
                        <span className="relative group/tip cursor-default">
                          <Info className="w-3 h-3 text-neutral-400 hover:text-primary-600 transition-colors" />
                          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-neutral-900 text-white text-[10px] font-medium leading-relaxed rounded-xl px-3 py-2.5 opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                            Key fields uniquely identify a record. They are used in <strong>Update</strong> and <strong>Delete</strong> modes to find the exact row to modify. Choose fields like ID or email that are guaranteed to be unique.
                            <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900" />
                          </span>
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {tables.find(t => t.id === newApp.dataSourceId)?.fields.map(f => (
                          <button key={f.id} type="button"
                            onClick={() => setNewApp({ ...newApp, keyFields: newApp.keyFields.includes(f.id) ? newApp.keyFields.filter(id => id !== f.id) : [...newApp.keyFields, f.id] })}
                            className={cn('px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all', newApp.keyFields.includes(f.id) ? 'bg-primary-600 border-primary-600 text-white' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500')}>
                            {f.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setAddStep(2)} className="flex-1 py-3 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-all">Back</button>
                    <button type="button" onClick={() => handleAddApp()} className="flex-1 py-3 text-white font-bold rounded-2xl active:scale-95 transition-all" style={{ background: 'var(--color-primary)' }}>
                      {editingAppId ? 'Update Application' : 'Build Application'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-neutral-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white text-center mb-2">Delete Application</h3>
              <p className="text-sm text-neutral-500 dark:text-slate-400 text-center">
                Delete <strong className="text-neutral-900 dark:text-white">"{deleteConfirm.name}"</strong>? This cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 text-sm font-bold text-neutral-600 dark:text-slate-300 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={() => handleDeleteApp(deleteConfirm.id)} className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-lg shadow-rose-100 dark:shadow-none">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
