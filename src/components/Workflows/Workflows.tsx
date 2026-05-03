import React, { useState, useEffect } from 'react';
import {
  Plus, GitBranch, Search, Trash2, Clock, Zap,
  ToggleLeft, ToggleRight, LayoutGrid, List, Copy, ChevronRight, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { handleFirestoreError, OperationType } from '../../services/dataService';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { WorkflowDesigner } from './WorkflowDesigner';

export function Workflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [deleteConfirmWf, setDeleteConfirmWf] = useState<{ id: string; name: string } | null>(null);

  const { selectedProjectId } = useAuthStore();

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    const q = query(collection(db, 'workspaces', selectedProjectId, 'workflows'));
    const unsub = onSnapshot(q, (snapshot) => {
      setWorkflows(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `workspaces/${selectedProjectId}/workflows`));
    return () => unsub();
  }, [selectedProjectId]);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName || !selectedProjectId) return;
    const id = newWorkflowName.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', id), {
      id, name: newWorkflowName, status: 'draft',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), nodes: [], edges: []
    });
    setNewWorkflowName(''); setShowAddModal(false); setSelectedWorkflowId(id);
  };

  const handleDuplicate = async (e: React.MouseEvent, wf: any) => {
    e.stopPropagation();
    if (!selectedProjectId) return;
    const snap = await getDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', wf.id));
    if (!snap.exists()) return;
    const data = snap.data();
    const newId = (wf.name + '_copy').toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', newId), {
      ...data, id: newId, name: data.name + ' (Copy)', status: 'draft',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  };

  const handleDeleteWorkflow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const wf = workflows.find(w => w.id === id);
    setDeleteConfirmWf({ id, name: wf?.name || 'this workflow' });
  };

  const confirmDeleteWorkflow = async () => {
    if (!selectedProjectId || !deleteConfirmWf) return;
    await deleteDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', deleteConfirmWf.id));
    setDeleteConfirmWf(null);
  };

  const handleToggleStatus = async (e: React.MouseEvent, id: string, currentStatus: string) => {
    e.stopPropagation();
    if (!selectedProjectId) return;
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    await updateDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', id), { status: newStatus });
  };

  if (selectedWorkflowId) {
    return (
      <div className="flex-1 flex flex-col h-full transition-colors duration-300" style={{ background: 'var(--bg-surface)' }}>
        <WorkflowDesigner workflowId={selectedWorkflowId} onBack={() => setSelectedWorkflowId(null)} />
      </div>
    );
  }

  const filtered = workflows.filter(w => w.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const formatDate = (ts: any) => {
    if (!ts?.seconds) return '—';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <div className="h-14 border-b px-6 flex items-center gap-3 shrink-0" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
          <input type="text" placeholder="Search workflows..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-slate-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-600/20 outline-none dark:text-slate-200" />
        </div>
        {/* View toggle */}
        <div className="flex items-center bg-neutral-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
          <button onClick={() => setViewMode('card')} title="Card view"
            className={cn('p-1.5 rounded-lg transition-all', viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} title="List view"
            className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600')}>
            <List className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowAddModal(true)}
          className="text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 hover:opacity-90 shrink-0"
          style={{ background: 'var(--color-primary)', boxShadow: '0 4px 14px 0 var(--color-primary-light)' }}>
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl border border-neutral-200 dark:border-slate-800 animate-pulse bg-white dark:bg-slate-900" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-white/50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-neutral-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-neutral-300 dark:text-slate-600" />
            </div>
            <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Workflows Found</h4>
            <p className="text-neutral-500 dark:text-slate-400 max-w-xs mx-auto mb-6">Create automated sequences to handle business logic and data synchronization.</p>
            <button onClick={() => setShowAddModal(true)} className="text-white px-6 py-2 rounded-xl font-bold transition-all active:scale-95 hover:opacity-90" style={{ background: 'var(--color-primary)' }}>
              Create First Workflow
            </button>
          </div>
        ) : viewMode === 'card' ? (
          /* ── Card view ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(w => (
              <div key={w.id} onClick={() => setSelectedWorkflowId(w.id)}
                className="rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative cursor-pointer border"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-amber-500/10">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={e => handleToggleStatus(e, w.id, w.status)}
                      title={w.status === 'active' ? 'Deactivate' : 'Activate'}
                      className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all',
                        w.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 hover:bg-emerald-100' : 'bg-neutral-100 text-neutral-400 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600')}>
                      {w.status === 'active' ? <><ToggleRight className="w-3 h-3" /> Active</> : <><ToggleLeft className="w-3 h-3" /> Draft</>}
                    </button>
                    {/* Action buttons */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => handleDuplicate(e, w)} title="Duplicate"
                        className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => handleDeleteWorkflow(e, w.id)} title="Delete"
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors tracking-tight text-sm">{w.name}</h3>
                <div className="flex items-center gap-3 pt-4 border-t border-neutral-50 dark:border-slate-800/50 mt-4">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-slate-500">
                      {w.nodes?.filter((n: any) => n.data?.category === 'trigger').length || 0} trigger
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-slate-500">{formatDate(w.createdAt)}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-primary-400 transition-colors ml-auto" />
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
                  {['Workflow', 'Status', 'Steps', 'Created', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {filtered.map(w => (
                  <tr key={w.id} onClick={() => setSelectedWorkflowId(w.id)}
                    className="cursor-pointer hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <GitBranch className="w-4 h-4" />
                        </div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 transition-colors">{w.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={e => handleToggleStatus(e, w.id, w.status)}
                        className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all',
                          w.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 hover:bg-emerald-100' : 'bg-neutral-100 text-neutral-400 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600')}>
                        {w.status === 'active' ? <><ToggleRight className="w-3 h-3" /> Active</> : <><ToggleLeft className="w-3 h-3" /> Draft</>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-neutral-500 dark:text-slate-400 font-medium">{w.nodes?.length || 0} nodes</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-neutral-400 dark:text-slate-500">{formatDate(w.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={e => handleDuplicate(e, w)} title="Duplicate"
                          className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => handleDeleteWorkflow(e, w.id)} title="Delete"
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-neutral-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between bg-neutral-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-neutral-900 dark:text-white">New Workflow</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkflow} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Workflow Name</label>
                <input autoFocus type="text" value={newWorkflowName}
                  onChange={e => setNewWorkflowName(e.target.value)}
                  placeholder="e.g. Lead Rotation, Inventory Alert"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 outline-none text-neutral-900 dark:text-white" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-neutral-600 dark:text-slate-400 font-bold hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 text-white font-bold rounded-xl transition-all active:scale-95 hover:opacity-90"
                  style={{ background: 'var(--color-primary)', boxShadow: '0 4px 14px 0 var(--color-primary-light)' }}>Create & Open</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteConfirmWf && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-neutral-200 dark:border-slate-700">
            <div className="p-6">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white text-center mb-2">Delete Workflow</h3>
              <p className="text-sm text-neutral-500 dark:text-slate-400 text-center">
                Delete <strong className="text-neutral-900 dark:text-white">"{deleteConfirmWf.name}"</strong>? This cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setDeleteConfirmWf(null)} className="flex-1 py-2.5 text-sm font-bold text-neutral-600 dark:text-slate-300 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={confirmDeleteWorkflow} className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-lg shadow-rose-100 dark:shadow-none">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
