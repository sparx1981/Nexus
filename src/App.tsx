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
  ChevronDown
} from 'lucide-react';
import { cn } from './lib/utils';
import { SchemaView } from './components/DataStudio/SchemaView';
import { HelpResources } from './components/HelpResources';
import { AppBuilder } from './components/AppBuilder/AppBuilder';
import { AIAssistant } from './components/AIAssistant';
import { SalesDashboard } from './components/Dashboards/SalesDashboard';
import { TrimbleConnectView } from './components/Integrations/TrimbleConnectView';
import { ReportViewer } from './components/Reports/ReportViewer';
import { WorkflowDesigner } from './components/Workflows/WorkflowDesigner';
import { useSchemaStore } from './store/schemaStore';
import { useAuthStore } from './store/authStore';
import { FieldType } from './types';
import { LoginPage } from './components/Auth/LoginPage';

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
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group",
      active 
        ? "bg-primary-50 text-primary-600 shadow-sm" 
        : "text-neutral-600 hover:bg-neutral-100"
    )}
  >
    <div className={cn("transition-colors", active ? "text-primary-600" : "group-hover:text-neutral-900")}>
      {icon}
    </div>
    {!collapsed && <span className="font-medium text-sm">{label}</span>}
  </button>
);

const SectionLabel = ({ label, collapsed }: { label: string; collapsed?: boolean }) => (
  !collapsed && (
    <div className="px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
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
  { id: '4', title: 'Revenue Report', category: 'Reports', tab: 'reports' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('apps');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const { tables, addTable } = useSchemaStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const filteredResults = searchQuery.length > 1 
    ? SEARCH_RESULTS.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Populate sample data for initial demo
  useEffect(() => {
    if (isAuthenticated && tables.length === 0) {
        addTable({
            id: 'contacts',
            name: 'Contacts',
            fields: [
                { id: '1', name: 'id', type: FieldType.AUTO_NUMBER },
                { id: '2', name: 'first_name', type: FieldType.TEXT },
                { id: '3', name: 'last_name', type: FieldType.TEXT },
                { id: '4', name: 'email', type: FieldType.EMAIL },
                { id: '5', name: 'company_id', type: FieldType.RELATION }
            ]
        });
        addTable({
            id: 'companies',
            name: 'Companies',
            fields: [
                { id: '6', name: 'id', type: FieldType.AUTO_NUMBER },
                { id: '7', name: 'name', type: FieldType.TEXT },
                { id: '8', name: 'website', type: FieldType.URL }
            ]
        });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-neutral-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-neutral-200 transition-all duration-200 flex flex-col z-30",
          sidebarCollapsed ? "w-16" : "w-60 shadow-xl shadow-neutral-200/50"
        )}
      >
        {/* Brand */}
        <div className="h-14 border-b border-neutral-200 flex items-center px-4 gap-3 overflow-hidden shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary-200">
            <Box className="text-white w-5 h-5" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-lg text-neutral-900 tracking-tight">Nexus</span>
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
            icon={<FileText className="w-5 h-5" />} 
            label="Reports" 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem 
            icon={<BarChart3 className="w-5 h-5" />} 
            label="Dashboards" 
            active={activeTab === 'dashboards'} 
            onClick={() => setActiveTab('dashboards')}
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
        <div className="p-3 border-t border-neutral-200 mt-auto">
          <SidebarItem 
            icon={<Settings className="w-5 h-5" />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            collapsed={sidebarCollapsed}
          />
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!sidebarCollapsed && <span className="text-sm font-bold">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Top Header */}
        <header className="h-14 border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 bg-white z-20">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-bold text-neutral-900 min-w-[120px]">
              {activeTab === 'apps' && "Applications"}
              {activeTab === 'data' && "Data Studio"}
              {activeTab === 'workflows' && "Workflows"}
              {activeTab === 'reports' && "Reports"}
              {activeTab === 'dashboards' && "Dashboards"}
              {activeTab === 'connectors' && "Connectors"}
              {activeTab === 'trimble' && "Trimble Connect"}
              {activeTab === 'settings' && "Settings"}
            </h1>
            
            {/* Global Search */}
            <div className="hidden md:flex relative max-w-sm flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-1.5 bg-neutral-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-600/20 transition-all outline-none"
              />

              {showSearch && searchQuery.length > 1 && (
                  <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSearch(false)}></div>
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50/50">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Search Results</span>
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
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-50 text-left group transition-colors border-b border-neutral-100 last:border-0"
                                  >
                                      <div>
                                          <div className="text-sm font-bold text-neutral-900 group-hover:text-primary-600">{r.title}</div>
                                          <div className="text-[10px] font-medium text-neutral-400">{r.category}</div>
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
                        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                             <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                                 <h4 className="font-bold text-sm text-neutral-900">Notifications</h4>
                                 <button className="text-[10px] font-bold text-primary-600 uppercase tracking-widest hover:underline text-right">Mark all read</button>
                             </div>
                             <div className="max-h-[400px] overflow-y-auto">
                                 {NOTIFICATIONS.map(n => (
                                     <div key={n.id} className={cn(
                                         "p-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer group",
                                         !n.read && "bg-primary-50/20"
                                     )}>
                                         <div className="flex items-center justify-between mb-1">
                                             <span className={cn(
                                                 "text-[10px] font-bold uppercase tracking-wider",
                                                 n.type === 'success' ? "text-emerald-600" : n.type === 'error' ? "text-rose-600" : "text-primary-600"
                                             )}>{n.title}</span>
                                             <span className="text-[10px] text-neutral-400 font-medium">{n.time}</span>
                                         </div>
                                         <p className="text-xs text-neutral-600 font-medium leading-relaxed">{n.message}</p>
                                     </div>
                                 ))}
                             </div>
                             <div className="p-3 bg-neutral-50 text-center border-t border-neutral-100">
                                 <button className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest hover:text-neutral-900">View All Notifications</button>
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
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {activeTab === 'apps' && <AppBuilder />}
          {activeTab === 'data' && <DataStudioView />}
          {activeTab === 'workflows' && <WorkflowDesigner />}
          {activeTab === 'reports' && <ReportViewer />}
          {activeTab === 'dashboards' && <SalesDashboard />}
          {activeTab === 'connectors' && (
            <div className="flex-1 overflow-y-auto p-8"><SourcesView /></div>
          )}
          {activeTab === 'trimble' && <TrimbleConnectView />}
          {activeTab === 'settings' && <div className="p-8"><PlaceholderModule name="Settings" description="Workspace configuration and member management." /></div>}
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
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mb-4">
        <Box className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-2">{name}</h2>
      <p className="text-neutral-600 mb-6">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="flex flex-col items-start p-4 border border-neutral-200 rounded-xl hover:border-primary-600 hover:shadow-sm transition-all text-left group">
          <Plus className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 mb-2" />
          <span className="font-semibold text-neutral-900">Create New</span>
          <span className="text-sm text-neutral-500">Start from a blank canvas</span>
        </button>
        <button className="flex flex-col items-start p-4 border border-neutral-200 rounded-xl hover:border-primary-600 hover:shadow-sm transition-all text-left group">
          <LayoutTemplate className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 mb-2" />
          <span className="font-semibold text-neutral-900">Use Template</span>
          <span className="text-sm text-neutral-500">Pick from pre-built models</span>
        </button>
      </div>
    </div>
  );
}

function DataStudioView() {
  const [activeSubTab, setActiveSubTab] = useState<'schema' | 'table' | 'query' | 'sources'>('schema');
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const addTable = useSchemaStore(state => state.addTable);

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName) return;
    
    addTable({
        id: newTableName.toLowerCase().replace(/\s+/g, '_'),
        name: newTableName,
        fields: [{ id: '1', name: 'id', type: FieldType.AUTO_NUMBER, required: true }]
    });
    setNewTableName('');
    setShowAddTable(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Module Navbar */}
      <div className="h-12 border-b border-neutral-200 bg-white flex items-center px-6 gap-6 shrink-0 z-20">
        <button 
            onClick={() => setActiveSubTab('schema')}
            className={cn(
                "text-sm font-medium transition-all h-full px-2 border-b-2",
                activeSubTab === 'schema' ? "text-primary-600 border-primary-600 font-bold" : "text-neutral-500 hover:text-neutral-900 border-transparent"
            )}
        >Schema View</button>
        <button 
            onClick={() => setActiveSubTab('table')}
            className={cn(
                "text-sm font-medium transition-all h-full px-2 border-b-2",
                activeSubTab === 'table' ? "text-primary-600 border-primary-600 font-bold" : "text-neutral-500 hover:text-neutral-900 border-transparent"
            )}
        >Table View</button>
        <button 
            onClick={() => setActiveSubTab('query')}
            className={cn(
                "text-sm font-medium transition-all h-full px-2 border-b-2",
                activeSubTab === 'query' ? "text-primary-600 border-primary-600 font-bold" : "text-neutral-500 hover:text-neutral-900 border-transparent"
            )}
        >Query Builder</button>
        <button 
            onClick={() => setActiveSubTab('sources')}
            className={cn(
                "text-sm font-medium transition-all h-full px-2 border-b-2",
                activeSubTab === 'sources' ? "text-primary-600 border-primary-600 font-bold" : "text-neutral-500 hover:text-neutral-900 border-transparent"
            )}
        >Sources</button>
        <div className="flex-1"></div>
        <button 
            onClick={() => setShowAddTable(true)}
            className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-opacity-90 shadow-sm transition-all shadow-primary-100"
        >
          <Plus className="w-4 h-4" /> Add Table
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {activeSubTab === 'schema' && <SchemaView />}
        {activeSubTab === 'table' && <TableView />}
        {activeSubTab === 'query' && <QueryBuilderView />}
        {activeSubTab === 'sources' && <SourcesView />}
      </div>

      {showAddTable && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddTable(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Create New Table</h3>
                  <p className="text-neutral-500 text-sm mb-6">Define a new entity for your application database.</p>
                  
                  <form onSubmit={handleAddTable} className="space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider text-[10px]">Table Name</label>
                          <input 
                              autoFocus
                              type="text" 
                              value={newTableName}
                              onChange={(e) => setNewTableName(e.target.value)}
                              placeholder="e.g. Orders, Tasks, Inventory"
                              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none transition-all"
                          />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-sm font-bold text-neutral-700 uppercase tracking-wider text-[10px]">Description</label>
                          <textarea 
                              placeholder="What kind of data will this table store?"
                              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none transition-all h-24 resize-none"
                          />
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                           <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
                               <Layers className="w-3 h-3" /> Default Fields
                           </div>
                           <div className="flex items-center justify-between text-sm py-1 border-b border-neutral-100 last:border-0 text-neutral-400">
                               <span>id</span>
                               <span className="text-[10px] uppercase font-bold">Auto Number</span>
                           </div>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button 
                            type="button"
                            onClick={() => setShowAddTable(false)}
                            className="flex-1 px-4 py-2.5 text-neutral-600 font-bold hover:bg-neutral-100 rounded-xl transition-all"
                          >Cancel</button>
                          <button 
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all"
                          >Create Table</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

function TableView() {
    const { tables } = useSchemaStore();
    const [selectedTableId, setSelectedTableId] = useState(tables[0]?.id || '');
    const table = tables.find(t => t.id === selectedTableId);
    
    // Mock data for table view
    const [data, setData] = useState(() => Array.from({ length: 15 }).map((_, i) => ({
        id: i + 1,
        first_name: ['John', 'Jane', 'Robert', 'Sarah', 'Michael', 'Emma'][i % 6],
        last_name: ['Smith', 'Doe', 'Wilson', 'Brown', 'Taylor', 'Miller'][i % 6],
        email: `user${i+1}@example.com`,
        name: ['Acme Corp', 'Globex', 'Soylent Corp', 'Initech', 'Umbrella Co'][i % 5],
        website: 'www.example.com'
    })));

    if (tables.length === 0) return <div className="p-8 text-neutral-500 italic">No tables created yet.</div>;

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            <div className="h-14 border-b border-neutral-200 px-6 flex items-center gap-4 bg-neutral-50/50">
                <select 
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary-600/20"
                >
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <div className="h-6 w-[1px] bg-neutral-200"></div>
                <button className="text-xs font-bold text-neutral-600 hover:text-primary-600 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Row
                </button>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse text-left">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-neutral-50 border-b border-neutral-200">
                            {table?.fields.map(f => (
                                <th key={f.id} className="px-6 py-3 font-bold text-neutral-600 uppercase text-[10px] tracking-widest border-r border-neutral-200 last:border-r-0">
                                    <div className="flex items-center gap-2 cursor-pointer group">
                                        {f.name}
                                        <ChevronDown className="w-3 h-3 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {data.map((row, rid) => (
                            <tr key={rid} className="hover:bg-neutral-50 transition-colors group">
                                {table?.fields.map(f => (
                                    <td key={f.id} className="px-6 py-3 border-r border-neutral-100 last:border-r-0">
                                        <input 
                                            type="text" 
                                            defaultValue={(row as any)[f.name] || ''}
                                            className="w-full bg-transparent outline-none border-none focus:bg-white focus:ring-2 focus:ring-primary-600/20 rounded px-1 -mx-1"
                                        />
                                    </td>
                                ))}
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
            <aside className="w-80 bg-white border-r border-neutral-200 p-6 overflow-y-auto space-y-8">
                <section className="space-y-4">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Table</label>
                    <select 
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600/20"
                    >
                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </section>

                <section className="space-y-4">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Fields</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {currentTable?.fields.map(f => (
                            <label key={f.id} className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600/20" defaultChecked />
                                <span className="text-sm text-neutral-700 font-medium group-hover:text-primary-600 transition-colors">{f.name}</span>
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
                            <div key={i} className="space-y-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200 relative">
                                <button 
                                    onClick={() => setFilters(filters.filter((_, idx) => idx !== i))}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 hover:text-error-600 shadow-sm"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <select className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded text-xs outline-none">
                                    <option value="">Choose field...</option>
                                    {currentTable?.fields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <select className="flex-1 px-2 py-1.5 bg-white border border-neutral-200 rounded text-xs outline-none">
                                        <option value="is">Is</option>
                                        <option value="is_not">Is Not</option>
                                        <option value="contains">Contains</option>
                                    </select>
                                    <input placeholder="Value" className="flex-1 px-2 py-1.5 bg-white border border-neutral-200 rounded text-xs outline-none" />
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
                       running ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : "bg-primary-600 text-white hover:bg-primary-700 shadow-primary-100"
                   )}
                >
                    <Play className="w-4 h-4" /> {running ? 'Running...' : 'Run Query'}
                </button>
            </aside>

            <main className="flex-1 bg-neutral-50 p-8 overflow-y-auto">
                {results.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                            <h4 className="font-bold text-neutral-900">Query Results</h4>
                            <span className="text-xs font-bold text-neutral-400 uppercase">{results.length} Rows</span>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50/50">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-widest">ID</th>
                                    <th className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-widest">Resource Name</th>
                                    <th className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-widest">Metric</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 font-medium">
                                {results.map(r => (
                                    <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-6 py-4 text-neutral-400">#{r.id}</td>
                                        <td className="px-6 py-4 text-neutral-900">{r.name}</td>
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
        { id: 'snowflake', name: 'Snowflake', type: 'external', status: 'disconnected', icon: <Box className="w-6 h-6" /> },
        { id: 'bigquery', name: 'BigQuery', type: 'external', status: 'disconnected', icon: <Layers className="w-6 h-6" /> },
        { id: 'rest_api', name: 'REST API', type: 'api', status: 'disconnected', icon: <Cpu className="w-6 h-6" /> },
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
            <h3 className="text-2xl font-bold text-neutral-900 mb-2">Data Sources</h3>
            <p className="text-neutral-500 mb-8">Manage connections to external databases and APIs.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {connectors.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl border border-neutral-200 p-6 flex items-start gap-4 hover:border-primary-600 transition-all shadow-sm hover:shadow-md">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                            c.status === 'connected' ? "bg-success-50 text-success-600" : "bg-neutral-100 text-neutral-400"
                        )}>
                            {c.icon}
                        </div>
                        <div className="flex-1">
                             <div className="flex items-center justify-between mb-1">
                                 <h4 className="font-bold text-neutral-900">{c.name}</h4>
                                 <div className="flex items-center gap-1.5">
                                      <div className={cn("w-2 h-2 rounded-full", c.status === 'connected' ? "bg-success-600" : "bg-neutral-300")}></div>
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{c.status}</span>
                                 </div>
                             </div>
                             <p className="text-sm text-neutral-500 mb-4">Connect and sync your {c.name} data to build apps.</p>
                             {c.status === 'disconnected' ? (
                                 <button 
                                    onClick={() => handleConnect(c.id)}
                                    disabled={connecting === c.id}
                                    className="text-primary-600 font-bold text-sm hover:underline flex items-center gap-2"
                                 >
                                     {connecting === c.id ? (
                                         <span className="flex items-center gap-2 italic text-neutral-400 font-medium">Connecting...</span>
                                     ) : (
                                         <>Connect <ChevronRight className="w-4 h-4" /></>
                                     )}
                                 </button>
                             ) : (
                                 <button className="text-neutral-400 font-bold text-sm hover:text-neutral-900 flex items-center gap-2 transition-colors">
                                     Configure <Settings className="w-4 h-4" />
                                 </button>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
