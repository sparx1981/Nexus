/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Database, 
  LayoutTemplate, 
  GitBranch, 
  FileText, 
  Settings, 
  Search, 
  Bell, 
  User, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Box,
  Layers,
  Cpu,
  HelpCircle,
  ExternalLink,
  Sparkles,
  X,
  Play,
  ChevronDown,
  Moon,
  Sun,
  LayoutGrid
} from 'lucide-react';
import { cn } from './lib/utils';
import { DataStudio } from './components/DataStudio/DataStudio';
import { HelpResources } from './components/HelpResources';
import { AppBuilder } from './components/AppBuilder/AppBuilder';
import { AIAssistant } from './components/AIAssistant';
import { DashboardSection } from './components/Dashboards/DashboardSection';
import { useSyncDashboards } from './hooks/useSyncDashboards';
import { useSyncReports } from './hooks/useSyncReports';
import { TrimbleConnectView } from './components/Integrations/TrimbleConnectView';
import { Workflows } from './components/Workflows/Workflows';
import { ProjectSettings } from './components/Settings/ProjectSettings';
import { useSchemaStore } from './store/schemaStore';
import { useAuthStore } from './store/authStore';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LoginPage } from './components/Auth/LoginPage';
import { ProjectPicker } from './components/ProjectPicker';
import { useSyncData } from './hooks/useSyncData';
import { useWorkspaceStore } from './store/workspaceStore';
import { handleFirestoreError, OperationType } from './services/dataService';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

const SidebarItem = ({ icon, label, active, onClick, collapsed }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 group",
      active 
        ? "bg-primary-50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400 shadow-sm" 
        : "text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800/50"
    )}
  >
    <div className={cn("transition-colors", active ? "text-primary-600 dark:text-primary-400" : "group-hover:text-neutral-900 dark:group-hover:text-slate-200")}>
      {icon}
    </div>
    {!collapsed && <span className="font-bold text-sm tracking-tight">{label}</span>}
  </button>
);

const SectionLabel = ({ label, collapsed }: { label: string; collapsed?: boolean }) => (
  !collapsed && (
    <div className="px-3 mt-6 mb-2 text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-slate-600">
      {label}
    </div>
  )
);

const NOTIFICATIONS = [
  { id: 1, title: 'Build Success', message: 'Nexus Core deployment completed successfully.', time: '2m ago', read: false, type: 'success' },
  { id: 2, title: 'Workflow Alert', message: 'Lead Rotation workflow failed for 3 records.', time: '1h ago', read: false, type: 'error' },
  { id: 3, title: 'Schema Change', message: 'Sarah modified the "Contacts" table schema.', time: '4h ago', read: true, type: 'info' },
];

const SEARCH_RESULTS = [
  { id: '1', title: 'Sales Dashboard', category: 'Dashboards', tab: 'dashboards' },
  { id: '2', title: 'Inventory Schema', category: 'Data Studio', tab: 'data' },
  { id: '3', title: 'Lead Rotation', category: 'Workflows', tab: 'workflows' },
];

import { ReportSection } from './components/Reports/ReportSection';

export default function App() {
  const [activeTab, setActiveTab] = useState('apps');
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [currentAppName, setCurrentAppName] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('nexus-theme') !== 'light');
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('nexus-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('nexus-theme', 'light');
    }
  }, [isDarkMode]);

  const { user, isAuthenticated, setUser, logout, selectedProjectId, setSelectedProjectId, setTrimbleAuth } = useAuthStore();
  const { fetchWorkspace } = useWorkspaceStore();
  const { loadTables } = useSchemaStore();
  
  useEffect(() => {
    if (editingAppId && selectedProjectId) {
      const appRef = doc(db, 'workspaces', selectedProjectId, 'apps', editingAppId);
      getDoc(appRef).then(snap => {
        if (snap.exists()) {
          setCurrentAppName(snap.data().name);
        }
      });
    } else {
      setCurrentAppName(null);
    }
  }, [editingAppId, selectedProjectId]);

  
  useEffect(() => {
    if (isAuthenticated) {
      if (!selectedProjectId) {
        setSelectedProjectId('default');
      } else {
        fetchWorkspace(selectedProjectId);
        const unsubscribe = loadTables();
        return () => unsubscribe();
      }
    }
  }, [isAuthenticated, selectedProjectId, fetchWorkspace, setSelectedProjectId, loadTables]);
  
  useSyncData();
  useSyncDashboards();
  useSyncReports();

  // Handle Trimble Callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('trimble_token');
    const userId = params.get('trimble_user');
    
    if (token && userId) {
      setTrimbleAuth(token, userId);
      // Clean up URL
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [setTrimbleAuth]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Try to get existing profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        let userData = {};
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            userData = userDoc.data() || {};
          } else {
            // Create a basic profile if it doesn't exist
            const newProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
              lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
              createdAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'User'}&background=random`
            };
            
            await setDoc(userDocRef, newProfile);
            userData = newProfile;
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }

        // Stability: Map to UI user
        const uiUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: (userData as any).firstName || firebaseUser.displayName?.split(' ')[0] || 'User',
          lastName: (userData as any).lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          avatar: firebaseUser.photoURL || (userData as any).avatar,
          ...userData
        };
        
        setUser(uiUser as any);
      } else {
        setUser(null);
      }
    });

    return () => unsub();
  }, [setUser]);

  const filteredResults = searchQuery.length > 1 
    ? SEARCH_RESULTS.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!selectedProjectId) {
    return <ProjectPicker />;
  }

  return (
    <div className={cn(
      "flex h-screen overflow-hidden font-sans transition-colors duration-300",
      "bg-white dark:bg-slate-950 text-neutral-900 dark:text-slate-100"
    )}>
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-neutral-200 dark:border-slate-800 transition-all duration-200 flex flex-col z-30 shadow-sm",
          sidebarCollapsed ? "w-16" : "w-60 shadow-xl shadow-neutral-200/50 dark:shadow-none"
        )}
      >
        {/* Brand */}
        <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 gap-3 overflow-hidden shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary-200 dark:shadow-none">
            <Box className="text-white w-5 h-5" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-lg text-neutral-900 dark:text-white tracking-tight uppercase">Nexus</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <SidebarItem 
            icon={<Layers className="w-5 h-5" />} 
            label="Applications" 
            active={activeTab === 'apps'} 
            onClick={() => setActiveTab('apps')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem 
            icon={<Database className="w-5 h-5" />} 
            label="Data Studio" 
            active={activeTab === 'data'} 
            onClick={() => setActiveTab('data')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem 
            icon={<GitBranch className="w-5 h-5" />} 
            label="Workflows" 
            active={activeTab === 'workflows'} 
            onClick={() => setActiveTab('workflows')}
            collapsed={sidebarCollapsed}
          />
          
          <SectionLabel label="Insight" collapsed={sidebarCollapsed} />
          <SidebarItem 
            icon={<BarChart3 className="w-5 h-5" />} 
            label="Dashboards" 
            active={activeTab === 'dashboards'} 
            onClick={() => setActiveTab('dashboards')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem 
            icon={<FileText className="w-5 h-5" />} 
            label="Reports" 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')}
            collapsed={sidebarCollapsed}
          />

          <SectionLabel label="Integrations" collapsed={sidebarCollapsed} />
          <SidebarItem 
            icon={<Plus className="w-5 h-5" />} 
            label="Connectors" 
            active={activeTab === 'connectors'} 
            onClick={() => setActiveTab('connectors')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem 
            icon={<ExternalLink className="w-5 h-5" />} 
            label="Trimble Connect" 
            active={activeTab === 'trimble'} 
            onClick={() => setActiveTab('trimble')}
            collapsed={sidebarCollapsed}
          />
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 mt-auto">
          <SidebarItem 
            icon={<Settings className="w-5 h-5" />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            collapsed={sidebarCollapsed}
          />
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!sidebarCollapsed && <span className="text-sm font-bold">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 relative">
        {/* Top Header */}
        <header className="h-14 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 bg-white dark:bg-slate-900 z-20">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white min-w-[120px]">
              {activeTab === 'apps' && (editingAppId && currentAppName ? `Applications  ›  ${currentAppName}` : "Applications")}
              {activeTab === 'data' && "Data Studio"}
              {activeTab === 'workflows' && "Workflows"}
              {activeTab === 'dashboards' && "Dashboards"}
              {activeTab === 'connectors' && "Connectors"}
              {activeTab === 'trimble' && "Trimble Connect"}
              {activeTab === 'settings' && "Settings"}
            </h1>
            
            {/* Global Search */}
            <div className="hidden md:flex relative max-w-sm flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-1.5 bg-neutral-100 dark:bg-slate-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-600/20 transition-all outline-none text-neutral-900 dark:text-neutral-200 shadow-inner"
              />

              {showSearch && searchQuery.length > 1 && (
                  <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSearch(false)}></div>
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="px-4 py-2 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800">
                              <span className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest leading-none">Search Results</span>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                              {filteredResults.length > 0 ? filteredResults.map(r => (
                                  <button 
                                    key={r.id}
                                    onClick={() => {
                                        setActiveTab(r.tab);
                                        setSearchQuery('');
                                        setShowSearch(false);
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-950/20 text-left group transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                                  >
                                      <div>
                                          <div className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-primary-600">{r.title}</div>
                                          <div className="text-[10px] font-medium text-neutral-400 text-neutral-400">{r.category}</div>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-primary-600" />
                                  </button>
                              )) : (
                                  <div className="p-8 text-center text-neutral-400">
                                      <p className="text-xs font-bold uppercase tracking-widest">No results found</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
                <button 
                    onClick={() => {
                        setNotifOpen(!notifOpen);
                        setUserMenuOpen(false);
                    }}
                    className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all relative group active:scale-90"
                >
                  <Bell className="w-5 h-5 group-hover:text-primary-600" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-600 rounded-full border-2 border-white animate-pulse"></span>
                </button>

                {notifOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)}></div>
                        <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                             <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
                                 <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Notifications</h4>
                                 <button className="text-[10px] font-bold text-primary-600 uppercase tracking-widest hover:underline text-right">Mark all read</button>
                             </div>
                             <div className="max-h-[400px] overflow-y-auto">
                                 {NOTIFICATIONS.map(n => (
                                     <div key={n.id} className={cn(
                                         "p-4 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer group",
                                         !n.read && "bg-primary-50/20 dark:bg-primary-950/10"
                                     )}>
                                         <div className="flex items-center justify-between mb-1">
                                             <span className={cn(
                                                 "text-[10px] font-bold uppercase tracking-wider",
                                                 n.type === 'success' ? "text-emerald-600" : n.type === 'error' ? "text-rose-600" : "text-primary-600"
                                             )}>{n.title}</span>
                                             <span className="text-[10px] text-neutral-400 font-medium">{n.time}</span>
                                         </div>
                                         <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed">{n.message}</p>
                                     </div>
                                 ))}
                             </div>
                             <div className="p-3 bg-neutral-50 dark:bg-neutral-900 text-center border-t border-neutral-100 dark:border-neutral-800">
                                 <button className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest hover:text-neutral-900 dark:hover:text-white">View All Notifications</button>
                             </div>
                        </div>
                    </>
                )}
            </div>

            <button 
                onClick={() => {
                    setHelpOpen(true);
                    setNotifOpen(false);
                    setUserMenuOpen(false);
                }}
                className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all group active:scale-90"
            >
              <HelpCircle className="w-5 h-5 group-hover:text-primary-600" />
            </button>

            <div className="h-4 w-[1px] bg-neutral-200 mx-2"></div>

            {/* Profile Menu */}
            <div className="relative">
              <button 
                onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setNotifOpen(false);
                }}
                className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-neutral-100 rounded-full transition-all active:scale-95"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ring-1 ring-neutral-200">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.firstName} className="w-full h-8 object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-primary-700 text-xs font-black">{user?.firstName.charAt(0)}</span>
                  )}
                </div>
                <span className="text-sm font-bold text-neutral-700 pr-1">{user?.firstName}</span>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="px-4 py-3 border-b border-neutral-100 mb-2">
                      <p className="text-sm font-bold text-neutral-900">{user?.firstName} {user?.lastName}</p>
                      <p className="text-[10px] font-medium text-neutral-400 truncate">{user?.email}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedProjectId(null)}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 flex items-center gap-3"
                    >
                        <LayoutGrid className="w-4 h-4 text-neutral-400" /> Switch Project
                    </button>
                    <button className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 flex items-center gap-3">
                        <User className="w-4 h-4 text-neutral-400" /> Profile Settings
                    </button>
                    <button className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 flex items-center gap-3">
                        <Database className="w-4 h-4 text-neutral-400" /> Workspace Data
                    </button>
                    <div className="h-[1px] bg-neutral-100 my-2"></div>
                    <button 
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 flex items-center gap-3"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="flex-1 relative overflow-hidden flex flex-col pt-0">
          {activeTab === 'apps' && <AppBuilder onEditingAppChange={setEditingAppId} />}
          {activeTab === 'data' && <DataStudio />}
          {activeTab === 'workflows' && <Workflows />}
          {activeTab === 'dashboards' && <DashboardSection />}
          {activeTab === 'reports' && <ReportSection />}
          {activeTab === 'connectors' && <DataStudio defaultTab="sources" />}
          {activeTab === 'trimble' && <TrimbleConnectView onBack={() => setActiveTab('apps')} onConnect={() => setActiveTab('apps')} />}
          {activeTab === 'settings' && <ProjectSettings />}
        </div>

        <HelpResources isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        <AIAssistant isOpen={aiOpen} onClose={() => setAiOpen(false)} />
      </main>

      {/* AI Assistant FAB */}
      <button 
        onClick={() => setAiOpen(!aiOpen)}
        className={cn(
            "fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-2xl shadow-primary-200 flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 group",
            aiOpen && "scale-0 opacity-0"
        )}
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
      </button>
    </div>
  );
}

function PlaceholderModule({ name, description }: { name: string; description: string }) {
  return (
    <div className="max-w-medium">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mb-4 dark:bg-primary-900/30 dark:text-primary-400">
        <Box className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-2 dark:text-white">{name}</h2>
      <p className="text-neutral-600 mb-6 dark:text-neutral-400 font-medium">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="flex flex-col items-start p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-primary-600 hover:shadow-sm transition-all text-left group">
          <Plus className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 mb-2" />
          <span className="font-semibold text-neutral-900 dark:text-white">Create New</span>
          <span className="text-sm text-neutral-500">Start from a blank canvas</span>
        </button>
        <button className="flex flex-col items-start p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-primary-600 hover:shadow-sm transition-all text-left group">
          <LayoutTemplate className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 mb-2" />
          <span className="font-semibold text-neutral-900 dark:text-white">Use Template</span>
          <span className="text-sm text-neutral-500">Pick from pre-built models</span>
        </button>
      </div>
    </div>
  );
}
