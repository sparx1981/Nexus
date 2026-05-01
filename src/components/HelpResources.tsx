import React, { useState } from 'react';
import { HelpCircle, Book, History, X, Search, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ReleaseNote {
  date: string;
  changes: string[];
}

export interface UserDoc {
  id: string;
  title: string;
  content: string;
  category: string;
}

const RELEASE_NOTES: ReleaseNote[] = [
  {
    date: '2026-05-01',
    changes: [
      'Multi-Workspace Support: Fully decoupled the architecture to support isolated multi-tenant projects. Users can now switch between different workspaces seamlessly.',
      'Hardened Security Framework: Refactored Firestore Security Rules with "Master Gate" patterns and admin-level bypass for seamless maintenance.',
      'Standardized Error Handling: Integrated `handleFirestoreError` across all modules to provide detailed diagnostic payloads for permission failures.',
      'Auto-Provisioning: Enhanced workspace store to automatically provision secure default environments for new users.',
    ]
  },
  {
    date: '2026-04-30',
    changes: [
      'Visual Refresh: Implemented ultra-clean Light Mode with a focus on white and soft grey scales (#F8FAFC).',
    ]
  },
  {
    date: '2026-04-30',
    changes: [
      'Datasource Management: Replaced "Primary Datasource" dropdown with a new "Manage Application Datasources" portal that detects all linked tables.',
      'Input Logic: Fixed Toggle and Select components in Preview Mode to ensure form state updates correctly.',
      'Component Resilience: Improved sidebar and header responsiveness under new theme tokens.',
    ]
  },
  {
    date: '2026-04-29',
    changes: [
      'App Builder Enhancements: Added deep field binding for inputs and data-connected tables.',
      'Applications Management: Complete CRUD for business applications with persistent settings.',
      'UI/UX Polishing: Integrated global dark mode persistence and removed legacy Reports module.',
    ]
  },
];

const USER_DOCS: UserDoc[] = [
  {
    id: 'intro',
    category: 'Getting Started',
    title: 'Introduction to Nexus',
    content: 'Nexus is a cloud-native low-code platform. Use the sidebar to navigate between Applications, Data Studio, and Workflows. The platform is built on an AI-first architecture to help you move from idea to production in minutes.'
  },
  {
    id: 'dashboards-guide',
    category: 'Insight',
    title: 'Creating Dashboards',
    content: '1. Navigate to the Dashboards section via the sidebar.\n2. Click "New Dashboard" to start creating a new view.\n3. Use the "Add Card" menu to insert KPI widgets, charts, or data tables.\n4. Configure each card by selecting a datasource and mapping fields for X/Y axes or metric counts.\n5. Click Save to persist your layout.'
  },
  {
    id: 'datasource-config',
    category: 'Data Layer',
    title: 'Configuring Data Sources',
    content: 'When creating an application or configuring a dashboard card, you can now select from all tables defined in your Project. The "Configure Data Source" popup provides a comprehensive list of available project schemas.'
  },
  {
    id: 'interface-update',
    category: 'Interface',
    title: 'Focus on Light Mode',
    content: 'Nexus now prioritizes a high-fidelity Light Mode to ensure professional clarity and consistency. The theme toggle has been removed to streamline the design system across all builder modules.'
  },
  {
    id: 'manage-datasources',
    category: 'Data Layer',
    title: 'Managing Application Sources',
    content: '1. Open Application Settings from the App Builder top bar.\n2. Click "Manage Application Datasources".\n3. View all available tables in your project.\n4. Set the Primary Source for default component field mappings.'
  },
  {
    id: 'app-binding',
    category: 'App Builder',
    title: 'Binding Inputs to Fields',
    content: '1. Select an input or toggle component on the canvas. 2. In the Properties panel, look for the Field Mapping section. 3. Select a field from your connected table. 4. The label and value will now tether to that specific data entity.'
  },
  {
    id: 'workspaces-guide',
    category: 'Collaboration',
    title: 'Managing Workspaces',
    content: '1. Click your profile avatar in the top right.\n2. Select "Switch Project" to see all accessible workspaces.\n3. Use the Project Picker to create a new workspace or jump into an existing one.\n4. Use Project Settings to invite members and manage permissions.'
  },
  {
    id: 'calculated-fields',
    category: 'Data Studio',
    title: 'Advanced Calculated Fields',
    content: '1. In Data Studio, select a table and go to Schema View.\n2. Add a field and set type to "Calculated".\n3. Click "Edit Formula" to open the logic editor.\n4. You can write JavaScript logic or simple formulas. Access the current row data via the "row" object (e.g., row.price * row.quantity).\n5. Use aggregate functions like sum(allRecords, "price") for collection-level metrics.'
  }
];

export const HelpResources = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'release' | 'dev'>('docs');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between bg-neutral-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg text-white">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-white uppercase tracking-tight">Support Center</h2>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-0.5">Docs & Updates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {[
            { id: 'docs', label: 'User Documentation' },
            { id: 'dev', label: 'Developer Suite' },
            { id: 'release', label: 'Release Notes' },
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                activeTab === t.id 
                  ? "text-primary-600 border-primary-600 bg-primary-50/20 dark:bg-primary-900/10" 
                  : "text-neutral-500 border-transparent hover:text-neutral-900 dark:hover:text-slate-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex bg-white dark:bg-slate-950 transition-colors">
          {activeTab === 'docs' && <DocsTab />}
          {activeTab === 'dev' && <DevSuiteTab />}
          {activeTab === 'release' && <ReleaseNotesTab />}
        </div>
      </div>
    </div>
  );
};

const DevSuiteTab = () => {
    const [selectedSnippet, setSelectedSnippet] = useState(DEV_DOCS[0]);

    const handleTryIt = (code: string) => {
        console.log('Nexus API Try It:', code);
        navigator.clipboard.writeText(code);
    };

    return (
        <div className="flex w-full h-full">
            <aside className="w-64 border-r border-neutral-200 dark:border-slate-800 overflow-y-auto p-4 bg-neutral-50 dark:bg-slate-900">
                <div className="space-y-1">
                    {DEV_DOCS.map(doc => (
                        <button 
                            key={doc.id}
                            onClick={() => setSelectedSnippet(doc)}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all truncate",
                                selectedSnippet.id === doc.id 
                                    ? "bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm border border-neutral-200 dark:border-slate-700" 
                                    : "text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            {doc.title}
                        </button>
                    ))}
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-950">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-2">{selectedSnippet.title}</h2>
                    <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6">{selectedSnippet.description}</p>
                    
                    <div className="relative group">
                        <pre className="bg-neutral-900 dark:bg-slate-900/50 text-neutral-100 p-6 rounded-2xl overflow-x-auto text-[13px] font-mono leading-relaxed border border-neutral-800 dark:border-slate-800">
                            <code>{selectedSnippet.code}</code>
                        </pre>
                        <button 
                            onClick={() => handleTryIt(selectedSnippet.code)}
                            className="absolute top-4 right-4 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-700"
                        >
                            Try It
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

const DEV_DOCS = [
    {
        id: 'auth',
        title: 'User Context API',
        description: 'Access the currently authenticated user session data.',
        code: `const { user } = useAuthStore();
console.log('User Name:', user.firstName);
console.log('Admin Status:', user.isAdmin);`
    },
    {
        id: 'schema',
        title: 'Schema Operations',
        description: 'Programmatically interact with project tables and fields.',
        code: `const { tables, addField } = useSchemaStore();
const tableId = tables[0].id;
addField(tableId, {
  name: 'NewAttribute',
  type: 'text',
  size: 100
});`
    },
    {
        id: 'export',
        title: 'Data Export Service',
        description: 'Trigger programmatic data exports to different formats.',
        code: `// Nexus Data Service
const data = await fetchTableData(tableId);
const csv = nexus.utils.toCSV(data);
nexus.io.download(csv, 'export.csv');`
    },
    {
        id: 'binding-api',
        title: 'Component Binding API',
        description: 'Programmatically bind UI components to schema attributes.',
        code: `// Bind a field to a component
updateComponent(selectedId, {
  properties: {
    fieldMapping: 'field_id_123',
    label: 'Dynamic Label'
  }
});`
    },
    {
        id: 'dashboard-api',
        title: 'Dashboard Orchestration',
        description: 'Manage dashboards and visual card configurations.',
        code: `const { createDashboard } = dataService;
const dashboardId = await createDashboard(projectId, {
  name: 'Sales Overview',
  cards: [
    { 
       id: 'card_1', 
       type: 'bar', 
       title: 'Revenue', 
       dataSourceId: 'orders',
       config: { fieldX: 'date', fieldY: 'total' }
    }
  ]
});`
    },
    {
        id: 'error-handling',
        title: 'Diagnostic Error Handling',
        description: 'Standardized error wrapping for security and permission debugging.',
        code: `import { handleFirestoreError, OperationType } from './services/dataService';

try {
  await setDoc(doc(db, 'path', 'id'), data);
} catch (e) {
  handleFirestoreError(e, OperationType.WRITE, 'path/id');
}`
    }
];

const DocsTab = () => {
    const [selectedDoc, setSelectedDoc] = useState<UserDoc | null>(USER_DOCS[0]);

    return (
        <div className="flex w-full h-full">
            <aside className="w-64 border-r border-neutral-200 dark:border-slate-800 overflow-y-auto p-4 bg-neutral-50 dark:bg-slate-900">
                <div className="relative mb-4">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search docs..."
                        className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-600 text-neutral-900 dark:text-white"
                    />
                </div>
                <div className="space-y-4">
                    {Array.from(new Set(USER_DOCS.map(d => d.category))).map(cat => (
                        <div key={cat}>
                            <h4 className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-2">{cat}</h4>
                            <div className="space-y-1">
                                {USER_DOCS.filter(d => d.category === cat).map(doc => (
                                    <button 
                                        key={doc.id}
                                        onClick={() => setSelectedDoc(doc)}
                                        className={cn(
                                            "w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors truncate",
                                            selectedDoc?.id === doc.id 
                                                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium" 
                                                : "text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        {doc.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-950">
                {selectedDoc ? (
                    <article className="max-w-2xl mx-auto">
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 uppercase tracking-tight">{selectedDoc.title}</h1>
                        <div className="text-neutral-600 dark:text-slate-400 leading-relaxed font-medium space-y-4">
                            {selectedDoc.content.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </article>
                ) : (
                    <div className="h-full flex items-center justify-center text-neutral-400 dark:text-slate-600 italic">Select a document to begin</div>
                )}
            </main>
        </div>
    )
}

const ReleaseNotesTab = () => (
    <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-950">
        <div className="max-w-2xl mx-auto space-y-10">
            {RELEASE_NOTES.map((note, idx) => (
                <section key={note.date} className="relative pl-8">
                    {/* Timeline bar */}
                    {idx !== RELEASE_NOTES.length - 1 && (
                        <div className="absolute left-3 top-3 bottom-[-40px] w-[1px] bg-neutral-200 dark:bg-slate-800"></div>
                    )}
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-600 dark:border-primary-500 flex items-center justify-center">
                        <History className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                    </div>
                    
                    <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-tight">{note.date}</h3>
                        <span className="px-2 py-0.5 bg-neutral-100 dark:bg-slate-800 rounded text-[10px] font-bold text-neutral-500 dark:text-slate-400 uppercase">Version 0.1</span>
                    </div>
                    <ul className="space-y-3">
                        {note.changes.map((change, cIdx) => (
                            <li key={cIdx} className="text-sm text-neutral-600 dark:text-slate-400 leading-relaxed flex gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-slate-700 mt-2 shrink-0 transition-colors"></div>
                                {change}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    </div>
)
