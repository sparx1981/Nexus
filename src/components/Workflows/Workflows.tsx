import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  GitBranch, 
  Search, 
  Trash2, 
  Play, 
  Clock, 
  Settings2,
  MoreVertical,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { handleFirestoreError, OperationType } from '../../services/dataService';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { WorkflowDesigner } from './WorkflowDesigner';

export function Workflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { selectedProjectId } = useAuthStore();

  useEffect(() => {
    if (!selectedProjectId) return;

    setLoading(true);
    const q = query(collection(db, 'workspaces', selectedProjectId, 'workflows'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkflows(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `workspaces/${selectedProjectId}/workflows`);
    });

    return () => unsub();
  }, [selectedProjectId]);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName || !selectedProjectId) return;

    const id = newWorkflowName.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
    await setDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', id), {
      id,
      name: newWorkflowName,
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      nodes: [],
      edges: []
    });

    setNewWorkflowName('');
    setShowAddModal(false);
    setSelectedWorkflowId(id);
  };

  const handleDeleteWorkflow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedProjectId) return;
    if (confirm('Delete this workflow?')) {
      await deleteDoc(doc(db, 'workspaces', selectedProjectId, 'workflows', id));
    }
  };

  if (selectedWorkflowId) {
    return (
      <div className="flex-1 flex flex-col h-full relative transition-colors duration-300" style={{ background: "var(--bg-surface)" }}>
        <button 
          onClick={() => setSelectedWorkflowId(null)}
          className="absolute top-4 left-4 z-[30] p-2 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg text-neutral-400 group transition-colors"
          title="Back to Workflows"
        >
          <XIcon className="w-5 h-5 dark:group-hover:text-white" />
        </button>
        {/* We need to pass the workflow ID to designer to load/save its nodes */}
        <WorkflowDesigner workflowId={selectedWorkflowId} onBack={() => setSelectedWorkflowId(null)} />
      </div>
    );
  }

  const filtered = workflows.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="h-14 border-b px-8 flex items-center justify-between shrink-0" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
        <div className="relative w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-600/20 outline-none dark:bg-slate-800 dark:text-slate-200 transition-colors"
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-neutral-500 dark:text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary-100 dark:shadow-primary-900/20"
          style={{ background: 'var(--project-btn-standard)' }}
        >
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse dark:bg-slate-900 border border-neutral-200 dark:border-slate-800" />)}
           </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(w => (
              <div 
                key={w.id}
                onClick={() => setSelectedWorkflowId(w.id)}
                className="rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative cursor-pointer border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/10">
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      w.status === 'active' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 font-black" : "bg-neutral-100 text-neutral-400 dark:bg-slate-800"
                    )}>
                      {w.status}
                    </div>
                    <button 
                      onClick={(e) => handleDeleteWorkflow(w.id, e)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-neutral-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors uppercase tracking-tight text-sm">{w.name}</h3>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mb-6 font-medium italic leading-relaxed">Automation sequence for dynamic resource management.</p>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-50 dark:border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-bold text-neutral-400 dark:text-slate-500">Triggered</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                      <span className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 italic">Created {new Date(w.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-neutral-300 dark:text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-white/50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-neutral-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-neutral-300 dark:text-slate-600" />
            </div>
            <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Workflows Found</h4>
            <p className="text-neutral-500 dark:text-slate-400 max-w-xs mx-auto mb-6">Create automated sequences to handle business logic and data synchronization.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 text-neutral-500 dark:text-white rounded-xl font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary-100 dark:shadow-primary-900/20"
              style={{ background: 'var(--project-btn-standard)' }}
            >Create First Workflow</button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-neutral-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between bg-neutral-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-neutral-900 dark:text-white">New Workflow</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <XIcon className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkflow} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none">Workflow Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder="e.g. Lead Rotation, Inventory Alert"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 outline-none text-neutral-900 dark:text-white transition-all"
                />
              </div>
              <div className="flex gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-neutral-600 dark:text-slate-400 font-bold hover:bg-neutral-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >Cancel</button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 text-neutral-500 dark:text-white font-bold rounded-xl shadow-lg shadow-primary-100 dark:shadow-primary-900/20 hover:opacity-90 active:scale-95 transition-all"
                  style={{ background: 'var(--project-btn-standard)' }}
                >Create & Open</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function XIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  );
}
