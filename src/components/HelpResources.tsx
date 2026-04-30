import React, { useState } from 'react';
import { HelpCircle, Book, History, X, Search, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';

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
    date: '2026-04-30',
    changes: [
      'Interactive Sales/Operations Dashboards: Real-time Recharts monitoring with multi-dashboard filtering.',
      'Data Studio Module: Full Entity-Relationship modeling, Table management, and Query Builder.',
      'Trimble Connect Integration: Seamless syncing of BCF topics, project navigation, and data mapping.',
      'Visual Workflow Designer: Drag-and-drop workspace using React Flow for orchestrating business logic.',
      'Reports Engine: Structured tabular reports with advanced filtering, sorting, and CSV export capabilities.',
      'AI Developer Assistant: Context-aware Gemini 1.5 Assistant that understands schema metadata.'
    ]
  },
  {
    date: '2026-04-15',
    changes: [
      'Core Platform Shell: Established navigation, auth state modeling, and NDL design system.',
      'App Builder Prototype: Established initial drag-and-drop component palette.'
    ]
  }
];

const USER_DOCS: UserDoc[] = [
  {
    id: 'intro',
    category: 'Getting Started',
    title: 'Introduction to Nexus',
    content: 'Nexus is a cloud-native low-code platform. Use the sidebar to navigate between Applications, Data Studio, and Workflows. The platform is built on an AI-first architecture to help you move from idea to production in minutes.'
  },
  {
    id: 'data-studio',
    category: 'Data Layer',
    title: 'Building your Schema',
    content: 'In the Data Studio, you can create tables and define relationships. Drag nodes to organize your data universe. You can also connect external sources like Snowflake or BigQuery to your Nexus tables.'
  },
  {
    id: 'workflows',
    category: 'Automation',
    title: 'Workflow Orchestration',
    content: 'Use the Workflow Designer to build logic. Triggers respond to data changes (e.g., Record Created), Actions execute tasks (e.g., Send Email), and Logic nodes handle conditional branching.'
  },
  {
    id: 'dashboards',
    category: 'Analytics',
    title: 'Custom Dashboards',
    content: 'Dashboards provide real-time visibility into your data. You can switch between Sales and Operations contexts and filter data by date range or specific KPIs.'
  },
  {
    id: 'trimble',
    category: 'Integrations',
    title: 'Trimble Connect Sync',
    content: 'Connect to your Trimble Connect AEC projects. You can browse files, manage BCF topics, and map project metadata directly to your Nexus applications for site-to-office automation.'
  }
];

export const HelpResources = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'release'>('docs');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg text-white">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900">Help & Resources</h2>
              <p className="text-xs text-neutral-500">Platform documentation and updates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          <button 
            onClick={() => setActiveTab('docs')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === 'docs' ? "text-primary-600 border-primary-600" : "text-neutral-500 border-transparent hover:text-neutral-700"
            )}
          >
            User Documentation
          </button>
          <button 
            onClick={() => setActiveTab('release')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === 'release' ? "text-primary-600 border-primary-600" : "text-neutral-500 border-transparent hover:text-neutral-700"
            )}
          >
            Release Notes
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'docs' ? (
            <DocsTab />
          ) : (
            <ReleaseNotesTab />
          )}
        </div>
      </div>
    </div>
  );
};

const DocsTab = () => {
    const [selectedDoc, setSelectedDoc] = useState<UserDoc | null>(USER_DOCS[0]);

    return (
        <div className="flex w-full h-full">
            <aside className="w-64 border-r border-neutral-200 overflow-y-auto p-4 bg-neutral-50">
                <div className="relative mb-4">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                        type="text" 
                        placeholder="Search docs..."
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-600"
                    />
                </div>
                <div className="space-y-4">
                    {Array.from(new Set(USER_DOCS.map(d => d.category))).map(cat => (
                        <div key={cat}>
                            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-2">{cat}</h4>
                            <div className="space-y-1">
                                {USER_DOCS.filter(d => d.category === cat).map(doc => (
                                    <button 
                                        key={doc.id}
                                        onClick={() => setSelectedDoc(doc)}
                                        className={cn(
                                            "w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors truncate",
                                            selectedDoc?.id === doc.id ? "bg-primary-50 text-primary-600 font-medium" : "text-neutral-600 hover:bg-neutral-100"
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
            <main className="flex-1 overflow-y-auto p-8">
                {selectedDoc ? (
                    <article className="max-w-2xl mx-auto">
                        <h1 className="text-2xl font-bold text-neutral-900 mb-6">{selectedDoc.title}</h1>
                        <div className="prose prose-sm text-neutral-600">
                            {selectedDoc.content}
                        </div>
                    </article>
                ) : (
                    <div className="h-full flex items-center justify-center text-neutral-400 italic">Select a document to begin</div>
                )}
            </main>
        </div>
    )
}

const ReleaseNotesTab = () => (
    <div className="flex-1 overflow-y-auto p-8 bg-white">
        <div className="max-w-2xl mx-auto space-y-10">
            {RELEASE_NOTES.map((note, idx) => (
                <section key={note.date} className="relative pl-8">
                    {/* Timeline bar */}
                    {idx !== RELEASE_NOTES.length - 1 && (
                        <div className="absolute left-3 top-3 bottom-[-40px] w-[1px] bg-neutral-200"></div>
                    )}
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary-50 border-2 border-primary-600 flex items-center justify-center">
                        <History className="w-3 h-3 text-primary-600" />
                    </div>
                    
                    <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-lg font-bold text-neutral-900">{note.date}</h3>
                        <span className="px-2 py-0.5 bg-neutral-100 rounded text-[10px] font-bold text-neutral-500 uppercase">Version 0.1</span>
                    </div>
                    <ul className="space-y-3">
                        {note.changes.map((change, cIdx) => (
                            <li key={cIdx} className="text-sm text-neutral-600 leading-relaxed flex gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-2 shrink-0"></div>
                                {change}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    </div>
)
