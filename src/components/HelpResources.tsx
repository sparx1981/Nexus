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
    date: '2026-05-02',
    changes: [
      'UI Refinement: Fixed button text readability on light backgrounds for "New Application", "New Workflow", and "New Table" across the platform.',
      'Stacking Context Fix: Isolated color palette and project settings modals to ensure they always appear on top of other elements.',
      'Workflow Canvas Polish: Standardized action button styles and improved visual feedback on node interactions.',
      'Workflow Designer v2: Implemented recursive, multi-level condition builder for complex automation logic.',
      'New Action Nodes: Added "Google Chat" (webhook messages) and "Advanced HTTP" (custom method/headers/body) nodes.',
      'Project Settings & Global Theming: Implemented project-wide settings for application headings, colors, and button styles. Changes apply automatically to all apps.',
      'Project Navigation: Added active project name to the sidebar with a quick-switch action leading back to the Project Picker.',
      'Enhanced Security: Integrated "Require Sign-In" project enforcement to ensure sensitive applications remain protected.',
      'UX Polishing: Removed redundant "Integrations" and "Connectors" menu items to streamline the orchestration interface.'
    ]
  },
  {
    date: '2026-05-01',
    changes: [
      'Advanced Query Builder: Implemented real-time Firestore query execution with CSV export functionality.',
      'Workflow Designer DnD: Enabled drag-and-drop orchestration for adding new stages to automation canvases.',
      'Send Email Action+: Added CC support and file attachment capability for data-driven automations.',
      'CSV Import Engine: New batch-processing modal supporting "Import to New Table" with auto-schema detection.',
      'Trimble Connect integration: Full OAuth support and project synchronization view with dedicated SDK bridge example.',
      'Visual Consistency: Standardized dark/light mode tokens across all builder components.'
    ]
  },
  {
    date: '2026-04-30',
    changes: [
      'Visual Refresh: Implemented ultra-clean Light Mode with a focus on white and soft grey scales (#F8FAFC).',
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
    id: 'google-chat-workflow',
    category: 'Workflows',
    title: 'Google Chat Action',
    content: '1. In Workflow Designer, add a "Google Chat" node.\n2. In the configuration panel, paste your Google Chat Space Webhook URL.\n3. Compose your message. You can use dynamic tokens (e.g., {{name}}) from previous steps.\n4. (Optional) Provide a Thread Key to group messages.\n5. Click "Send Test Message" to verify connectivity.'
  },
  {
    id: 'http-advanced-workflow',
    category: 'Workflows',
    title: 'HTTP Request (Advanced)',
    content: '1. Add the "Advanced HTTP" node to your workflow.\n2. Choose an HTTP Method (GET, POST, PUT, PATCH, DELETE).\n3. Enter the endpoint URL.\n4. Define custom headers (e.g., Authorization: Bearer ...).\n5. For non-GET requests, provide the JSON Body payload. Tokens are supported.\n6. Use "Test Request" to preview the response structure.'
  },
  {
    id: 'condition-builder-v2',
    category: 'Workflows',
    title: 'Advanced Condition Builder',
    content: '1. Select a Condition node.\n2. Use "Add Condition" for simple checks.\n3. Use "Add Group" to create nested logic (AND/OR blocks).\n4. The workflow will follow the "True" handle if the logic passes, or the "False" handle if it fails.\n5. If the False handle is not connected, the execution terminates gracefully.'
  },
  {
    id: 'project-settings-guide',
    category: 'Project Setup',
    title: 'Global Project Settings',
    content: '1. Expand "Project Setup" in the sidebar.\n2. Click "Project Settings".\n3. Configure color schemes for headings, backgrounds, and buttons.\n4. Toggle "Enable Application Headings" to apply a standard header to all apps.\n5. Click "Save & Close" to push changes to all existing and new applications.'
  },
  {
    id: 'project-switcher',
    category: 'Navigation',
    title: 'Switching Projects',
    content: '1. Look for the "Active Project" card at the top of the sidebar.\n2. Click the project name or the rotate icon.\n3. You will be taken back to the Project Picker to select or create a different workspace.'
  },
  {
    id: 'auth-enforcement',
    category: 'Security',
    title: 'Enforcing Sign-In',
    content: '1. In Project Settings, scroll to the bottom.\n2. Enable "Require Sign-In".\n3. All applications within this project will now verify authentication before displaying any content, even in Preview mode.'
  },
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
    id: 'workflow-dnd',
    category: 'Workflows',
    title: 'Workflow Drag-and-Drop',
    content: '1. Navigate to the Workflows section. 2. Drag a trigger or action from the left palette. 3. Drop it onto the canvas at your desired location. 4. Connect nodes by dragging edges between handles.'
  },
  {
    id: 'email-config',
    category: 'Workflows',
    title: 'Enhanced Email Step',
    content: '1. Select a Send Email node in your workflow. 2. In the properties panel, you can now add CC recipients and select file attachments from your Project Data studio directly.'
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
  },
  {
    id: 'rest-api-config',
    category: 'Integrations',
    title: 'REST API Setup',
    content: '1. Navigate to Data Studio > Sources.\n2. Click "Configure Connection" on REST API.\n3. Enter your endpoint URL and choose a method (GET/POST).\n4. Add any required headers or authentication tokens.\n5. Click "Test Connection" to verify. Once successful, data will be mapped to a virtual table.'
  },
  {
    id: 'trimble-connect-sync',
    category: 'Integrations',
    title: 'Trimble Connect Sync',
    content: '1. In Data Studio > Sources, select Trimble Connect.\n2. Sign in with your Trimble ID via the secure popup.\n3. Selected the projects you wish to synchronize.\n4. Choose a Sync Mode (Real-time or Manual batch).\n5. Click "Start Sync" to pull project metadata and issue tracking logs into your Project Workspace.'
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
        console.log('%c Nexus API Try It ', 'background: #2563eb; color: white; border-radius: 4px; padding: 2px 6px; font-weight: bold;');
        console.log(code);
        navigator.clipboard.writeText(code);
        alert('Code snippet copied to clipboard and logged to console!');
    };

    return (
        <div className="flex w-full h-full">
            <aside className="w-64 border-r border-neutral-200 dark:border-slate-800 overflow-y-auto p-4 bg-neutral-50 dark:bg-slate-900">
                <div className="space-y-6">
                    <div>
                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 px-2">Current API</h4>
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
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 px-2">Depricated</h4>
                        <div className="space-y-1">
                            {DEPRECATED_EXAMPLES.map(doc => (
                                <button 
                                    key={doc.id}
                                    onClick={() => setSelectedSnippet(doc)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all truncate opacity-50 grayscale hover:grayscale-0 hover:opacity-100",
                                        selectedSnippet.id === doc.id ? "bg-neutral-100 dark:bg-slate-700 text-neutral-600 dark:text-slate-300" : "text-neutral-400 dark:text-slate-500"
                                    )}
                                >
                                    {doc.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-950">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">{selectedSnippet.title}</h2>
                        {DEPRECATED_EXAMPLES.find(d => d.id === selectedSnippet.id) && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded uppercase tracking-widest">Depricated</span>
                        )}
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6 font-medium">{selectedSnippet.description}</p>
                    
                    <div className="relative group">
                        <pre className="bg-neutral-900 dark:bg-slate-900/50 text-neutral-100 p-6 rounded-2xl overflow-x-auto text-[13px] font-mono leading-relaxed border border-neutral-800 dark:border-slate-800">
                            <code className="text-emerald-400">{selectedSnippet.code}</code>
                        </pre>
                        <button 
                            onClick={() => handleTryIt(selectedSnippet.code)}
                            className="absolute top-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-primary-700 active:scale-95"
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
        id: 'project-settings-store',
        title: 'Project Settings API',
        description: 'Consume global project-level design tokens and security settings.',
        code: `const { settings } = useProjectSettingsStore();
console.log('Heading Color:', settings.headingBackgroundColour);
console.log('Sign-in Required:', settings.requireSignIn);`
    },
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
    },
    {
        id: 'query-builder',
        title: 'Firestore Query Builder',
        description: 'Execute filtered queries against your workspace tables.',
        code: `const q = query(
  collection(db, 'workspaces', wsId, 'tableData', tableId, 'rows'),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc'),
  limit(50)
);
const snap = await getDocs(q);`
    },
    {
        id: 'trimble-api',
        title: 'Trimble SDK Bridge',
        description: 'Directly access Trimble Connect project data via the Nexus bridge.',
        code: `// Access Trimble Projects via Internal Bridge
const projects = await nexus.integrations.trimble.getProjects();
console.log('Project Count:', projects.length);
const model = await projects[0].getLatestModel();`
    }
];

const DEPRECATED_EXAMPLES = [
    {
        id: 'legacy-sync',
        title: 'Legacy Sync Pattern',
        description: 'Insecure client-side filtering (Deprecated 2026-04-20)',
        code: `// DEPRECATED: Do not use client-side filtering
const all = await getDocs(col);
const filtered = all.docs.filter(d => d.data().type === 'test');`
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
