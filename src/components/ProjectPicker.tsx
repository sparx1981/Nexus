import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Search,
  ChevronRight,
  LogOut,
  Box,
  Plus,
  Users,
  Clock,
  Layers,
  GitBranch,
  Database,
  BarChart3,
  Trash2,
  MoreHorizontal,
  X
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

const PROJECT_COLORS = [
  '#1A56DB', '#D3045D', '#34542C', '#0C287B', '#D41414',
  '#0C8EF4', '#E85D04', '#0D7A5F', '#7C3AED', '#C4214A',
];

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ProjectPicker() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { user, setSelectedProjectId, logout } = useAuthStore();

  useEffect(() => {
    fetchProjects();
  }, [user?.id]);

  async function fetchProjects() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'workspaces'), where('ownerId', '==', user.id));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by most recently updated/created
      data.sort((a: any, b: any) => {
        const ta = a.updatedAt || a.createdAt || '';
        const tb = b.updatedAt || b.createdAt || '';
        return tb.localeCompare(ta);
      });
      setProjects(data);
    } catch (e) {
      console.error('Error fetching workspaces:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !user) return;
    setCreating(true);
    try {
      const projectsRef = collection(db, 'workspaces');
      const newDoc = doc(projectsRef);
      const colorIdx = projects.length % PROJECT_COLORS.length;
      const projectData = {
        id: newDoc.id,
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        ownerId: user.id,
        ownerEmail: user.email,
        color: PROJECT_COLORS[colorIdx],
        memberships: [{ userId: user.id, email: user.email, role: 'owner', status: 'active' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(newDoc, projectData);
      setSelectedProjectId(newDoc.id);
    } catch (e) {
      console.error('Error creating project:', e);
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteDoc(doc(db, 'workspaces', projectId));
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (e) {
      console.error('Error deleting project:', e);
    }
    setConfirmDeleteId(null);
    setMenuOpenId(null);
  };

  const filtered = projects.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="min-h-screen w-screen flex flex-col font-sans"
      style={{ background: 'var(--bg-primary)' }}
      onClick={() => setMenuOpenId(null)}
    >
      {/* Top Bar */}
      <header
        className="h-14 flex items-center justify-between px-8 shrink-0 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'var(--color-primary)' }}>
            <Box className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-lg tracking-tight uppercase" style={{ color: 'var(--text-primary)' }}>Nexus</span>
        </div>
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.firstName} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              {user?.firstName?.charAt(0)}
            </div>
          )}
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{user?.firstName} {user?.lastName}</span>
          <div className="h-4 w-px mx-1" style={{ background: 'var(--border-color)' }} />
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:bg-rose-50 text-neutral-500 hover:text-rose-600"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-start pt-12 px-6 pb-16">
        <div className="w-full max-w-4xl">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
              Your Projects
            </h1>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Select a project to open it, or create a new one.
            </p>
          </div>

          {/* Search + Create */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search projects…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm font-medium outline-none border transition-all"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 text-white transition-all active:scale-95 shadow-lg"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>

          {/* Project Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: 'var(--bg-surface)' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
                <FolderOpen className="w-10 h-10 opacity-20" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="text-center">
                <p className="font-bold uppercase tracking-widest text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {searchQuery ? 'No matching projects' : 'No projects yet'}
                </p>
                {!searchQuery && (
                  <button onClick={() => setShowCreate(true)} className="mt-1 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all active:scale-95 hover:opacity-90" style={{ background: 'var(--color-primary)' }}>
                    + New Project
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((project: any) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => setSelectedProjectId(project.id)}
                  onDelete={() => setConfirmDeleteId(project.id)}
                  menuOpen={menuOpenId === project.id}
                  onMenuOpen={(e) => { e.stopPropagation(); setMenuOpenId(project.id); }}
                  onMenuClose={() => setMenuOpenId(null)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div
            className="relative rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Create New Project</h2>
                <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Projects contain applications, data, workflows and reports.
                </p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-secondary)' }}>Project Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Acme Corp Operations"
                  className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none border transition-all"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <input
                  type="text"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Optional description…"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition-all"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* What's included */}
              <div className="rounded-xl p-4 border mt-2" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>Each project includes</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: <Layers className="w-3 h-3" />, label: 'Applications' },
                    { icon: <Database className="w-3 h-3" />, label: 'Data Studio' },
                    { icon: <GitBranch className="w-3 h-3" />, label: 'Workflows' },
                    { icon: <BarChart3 className="w-3 h-3" />, label: 'Dashboards & Reports' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--color-primary)' }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 font-bold rounded-xl transition-all text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={!newProjectName.trim() || creating}
                  className="flex-1 py-2.5 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm shadow-lg"
                  style={{ background: 'var(--color-primary)' }}>
                  {creating ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Delete Project?</h3>
            <p className="text-sm mb-5 font-medium" style={{ color: 'var(--text-secondary)' }}>
              This will permanently delete the project "<strong>{projects.find(p => p.id === confirmDeleteId)?.name}</strong>" and all its data.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2.5 font-bold rounded-xl text-sm transition-all" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={() => handleDeleteProject(confirmDeleteId)} className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-sm hover:bg-rose-700 active:scale-95 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onOpen, onDelete, menuOpen, onMenuOpen, onMenuClose }: {
  project: any; onOpen: () => void; onDelete: () => void;
  menuOpen: boolean; onMenuOpen: (e: React.MouseEvent) => void; onMenuClose: () => void;
}) {
  const color = project.color || '#1A56DB';
  const initials = project.name?.slice(0, 2).toUpperCase() || 'P';

  return (
    <div
      className="group rounded-2xl border p-5 flex flex-col gap-4 cursor-pointer hover:shadow-lg transition-all duration-200 relative"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      onClick={onOpen}
    >
      {/* Card header */}
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0"
          style={{ background: color }}>
          {initials}
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMenuOpen}
            className={cn(
              "p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100",
              menuOpen && "opacity-100 bg-neutral-100 dark:bg-neutral-800"
            )}
            style={{ color: 'var(--text-secondary)' }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-36 rounded-xl shadow-xl border overflow-hidden z-20"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <button onClick={onOpen} className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
                <FolderOpen className="w-3.5 h-3.5" /> Open
              </button>
              <button onClick={(e) => { e.stopPropagation(); onMenuClose(); onDelete(); }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 flex items-center gap-2 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project info */}
      <div className="flex-1">
        <h3 className="font-black text-base tracking-tight leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          {project.name}
        </h3>
        {project.description && (
          <p className="text-xs leading-relaxed line-clamp-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
            {project.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          <Users className="w-3 h-3" />
          {project.memberships?.length || 1} member{(project.memberships?.length || 1) !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>
          <Clock className="w-3 h-3" />
          {timeAgo(project.updatedAt || project.createdAt)}
        </div>
      </div>

      {/* Open arrow */}
      <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0">
        <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
      </div>
    </div>
  );
}
