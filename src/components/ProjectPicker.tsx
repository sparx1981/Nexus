import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, 
  Search, 
  ChevronRight, 
  LogOut, 
  Box,
  Plus,
  Users,
  Settings
} from 'lucide-react';
import { db, auth, logout } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function ProjectPicker() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const { user, setSelectedProjectId } = useAuthStore();

  useEffect(() => {
    async function fetchProjects() {
      if (!user?.id) {
        console.log('ProjectPicker: No user found, skipping fetch');
        return;
      }
      
      try {
        setLoading(true);
        console.log('ProjectPicker: Fetching workspaces for user', user.id);
        // Query workspaces where user is owner
        const qOwner = query(collection(db, 'workspaces'), where('ownerId', '==', user.id));
        
        const ownerSnap = await getDocs(qOwner);
        const ownerProjects = ownerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Also check if they are members (simplified)
        // In a real app we'd use a more complex query or collection group
        
        console.log('ProjectPicker: Fetched', ownerProjects.length, 'workspaces');
        setProjects(ownerProjects);
      } catch (error: any) {
        console.error('Error fetching workspaces:', error);
        
        // Detailed error handling
        const errInfo = {
          error: error.message || String(error),
          operationType: 'list',
          path: 'workspaces',
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified
          }
        };
        console.error('Firestore Error Payload:', JSON.stringify(errInfo));
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [user?.id]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !user) return;

    try {
      const projectsRef = collection(db, 'workspaces');
      const newProjectDoc = doc(projectsRef);
      const projectId = newProjectDoc.id;

      const projectData = {
        id: projectId,
        name: newProjectName,
        ownerId: user.id,
        ownerEmail: user.email,
        memberships: [{ userId: user.id, email: user.email, role: 'owner', status: 'active' }],
        createdAt: new Date().toISOString()
      };

      console.log('ProjectPicker: Creating workspace', projectData);
      await setDoc(newProjectDoc, projectData);
      
      const newProject = { 
        id: projectId, 
        name: newProjectName, 
        ownerId: user.id,
        memberships: projectData.memberships
      };
      
      setProjects([newProject, ...projects]);
      setSelectedProjectId(projectId);
      setShowCreate(false);
    } catch (error: any) {
      console.error('Error creating project:', error);
      
      const errInfo = {
        error: error.message || String(error),
        operationType: 'write',
        path: `projects`,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified
        }
      };
      console.error('Firestore Error Payload:', JSON.stringify(errInfo));
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-neutral-200/50 overflow-hidden border border-neutral-200">
          <header className="px-8 py-8 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-200 shrink-0">
                    <Box className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Welcome back, {user?.firstName}</h1>
                    <p className="text-neutral-500 font-medium">Select a project to continue building.</p>
                </div>
            </div>
            <button 
                onClick={() => logout()}
                className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                title="Sign Out"
            >
                <LogOut className="w-6 h-6" />
            </button>
          </header>

          <div className="p-8">
            <div className="flex gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 transition-all outline-none"
                />
              </div>
              <button 
                onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 active:scale-95 shrink-0"
              >
                <FolderPlus className="w-5 h-5" />
                New Project
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-neutral-50 rounded-2xl animate-pulse" />
                ))
              ) : filteredProjects.length > 0 ? (
                filteredProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className="w-full flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-2xl hover:border-primary-600 hover:bg-primary-50/30 transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                            <FolderPlus className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-neutral-900 group-hover:text-primary-600 transition-colors">{project.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-neutral-400">
                                    <Users className="w-3 h-3" /> {project.memberships?.length || 1} Member
                                </span>
                                <span className="text-neutral-300">•</span>
                                <span className="text-[10px] uppercase font-bold text-neutral-400">
                                    Last active: Just now
                                </span>
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="text-neutral-300 group-hover:text-primary-600 transition-colors" />
                  </button>
                ))
              ) : (
                <div className="py-20 text-center text-neutral-400">
                   <Box className="w-16 h-16 mx-auto mb-4 opacity-20" />
                   <p className="font-bold uppercase tracking-widest text-xs">No projects found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Create New Project</h2>
              <p className="text-neutral-500 text-sm mb-6 font-medium">Projects help you organize applications and data sources.</p>
              
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Project Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Acme Q3 Transformation"
                    className="w-full px-5 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-6 py-3 text-neutral-600 font-bold hover:bg-neutral-100 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newProjectName}
                    className="flex-1 px-6 py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
