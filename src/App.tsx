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
  ExternalLink
} from 'lucide-react';
import { cn } from './lib/utils';
import { SchemaView } from './components/DataStudio/SchemaView';
import { HelpResources } from './components/HelpResources';
import { AppBuilder } from './components/AppBuilder/AppBuilder';
import { AIAssistant } from './components/AIAssistant';
import { SalesDashboard } from './components/Dashboards/SalesDashboard';
import { TrimbleConnectView } from './components/Integrations/TrimbleConnectView';
import { ReportViewer } from './components/Reports/ReportViewer';
import { useSchemaStore } from './store/schemaStore';
import { FieldType } from './types';

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

export default function App() {
  const [activeTab, setActiveTab] = useState('apps');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  
  const { tables, addTable } = useSchemaStore();

  // Populate sample data for initial demo
  useEffect(() => {
    if (tables.length === 0) {
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
  }, []);

  return (
    <div className="flex h-screen bg-neutral-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-neutral-200 transition-all duration-200 flex flex-col",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Brand */}
        <div className="h-14 border-b border-neutral-200 flex items-center px-4 gap-2 overflow-hidden shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
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
            {!sidebarCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Header */}
        <header className="h-14 border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-lg font-semibold text-neutral-900">
              {activeTab === 'apps' && "Applications"}
              {activeTab === 'data' && "Data Studio"}
              {activeTab === 'workflows' && "Workflows"}
              {activeTab === 'reports' && "Reports"}
              {activeTab === 'dashboards' && "Dashboards"}
              {activeTab === 'connectors' && "Connectors"}
              {activeTab === 'trimble' && "Trimble Connect"}
              {activeTab === 'settings' && "Settings"}
            </h1>
            <div className="hidden md:flex relative max-w-sm flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-1.5 bg-neutral-100 border-none rounded-full text-sm focus:ring-2 focus:ring-primary-600 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-error-600 rounded-full border-2 border-white"></span>
            </button>
            <button 
                onClick={() => setHelpOpen(true)}
                className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <div className="h-8 w-[1px] bg-neutral-200 mx-2"></div>
            <button className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-neutral-100 rounded-full transition-colors">
              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                <User className="text-neutral-400 w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-neutral-700 pr-1">Alex Miller</span>
            </button>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {/* Module-specific viewports will be rendered here */}
          {activeTab === 'apps' && <AppBuilder />}
          {activeTab === 'data' && <DataStudioView />}
          {activeTab === 'workflows' && <div className="p-8"><PlaceholderModule name="Workflow Designer" description="Automate business logic with trigger-based flows." /></div>}
          {activeTab === 'reports' && <ReportViewer />}
          {activeTab === 'dashboards' && <SalesDashboard />}
          {activeTab === 'connectors' && <div className="p-8"><PlaceholderModule name="Connectors" description="Connect to Snowflake, BigQuery, and REST APIs." /></div>}
          {activeTab === 'trimble' && <TrimbleConnectView />}
          {activeTab === 'settings' && <div className="p-8"><PlaceholderModule name="Settings" description="Workspace configuration and member management." /></div>}
        </div>

        <HelpResources isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        <AIAssistant isOpen={aiOpen} onClose={() => setAiOpen(false)} />
      </main>

      {/* AI Assistant FAB / Panel Trigger */}
      <button 
        onClick={() => setAiOpen(!aiOpen)}
        className={cn(
            "fixed bottom-6 right-6 w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50",
            aiOpen && "scale-0"
        )}
      >
        <Cpu className="w-6 h-6" />
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
  return (
    <div className="flex-1 flex flex-col">
      {/* Module Navbar */}
      <div className="h-12 border-b border-neutral-200 bg-white flex items-center px-6 gap-6 shrink-0">
        <button className="text-sm font-semibold text-primary-600 border-b-2 border-primary-600 h-full px-2">Schema View</button>
        <button className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors h-full px-2">Table View</button>
        <button className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors h-full px-2">Query Builder</button>
        <button className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors h-full px-2">Sources</button>
        <div className="flex-1"></div>
        <button className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-opacity-90 shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Add Table
        </button>
      </div>

      <SchemaView />
    </div>
  );
}
