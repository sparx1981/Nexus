import React, { useState } from 'react';
import { 
    Cloud, 
    Folder, 
    File, 
    MessageSquare, 
    RefreshCcw, 
    ExternalLink, 
    Lock, 
    ChevronRight, 
    CheckCircle2, 
    AlertCircle,
    Info,
    MoreVertical,
    Clock,
    Settings,
    Link as LinkIcon,
    Database,
    ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { dataService } from '../../services/dataService';
import { FieldType } from '../../types';

const PROJECTS_DATA = {
    'southside': {
        name: 'Southside Medical Center',
        filesCount: '1.2k',
        topicsCount: '94',
        nodesCount: '28',
        topics: [
            { id: 'ISSUE-001', title: 'Clash detected in HVAC layout - Floor 2', priority: 'High', assignee: 'Sarah Jenkins', date: '2h ago' },
            { id: 'ISSUE-002', title: 'Missing fire safety documentation', priority: 'Medium', assignee: 'Mark Thompson', date: '5h ago' }
        ]
    },
    'terminal': {
        name: 'North Terminal Expansion',
        filesCount: '3.5k',
        topicsCount: '412',
        nodesCount: '156',
        topics: [
            { id: 'ISSUE-504', title: 'Steel truss alignment check needed', priority: 'Critical', assignee: 'Alex Rivera', date: '12m ago' },
            { id: 'ISSUE-505', title: 'Runway B electrical conduit plan', priority: 'Low', assignee: 'Sarah Jenkins', date: '1d ago' }
        ]
    }
};

export function TrimbleConnectView() {
    const [selectedTrimbleProject, setSelectedTrimbleProject] = useState<keyof typeof PROJECTS_DATA>('southside');
    const [activeNavItem, setActiveNavItem] = useState<'files' | 'topics' | 'nodes' | 'props'>('topics');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isMapping, setIsMapping] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'info' | 'success' } | null>(null);
    const { selectedProjectId } = useAuthStore();

    const project = PROJECTS_DATA[selectedTrimbleProject];

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            showToast('Project data synced from Trimble Cloud', 'info');
        }, 1200);
    };

    const showToast = (message: string, type: 'info' | 'success' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleMapToNexus = async () => {
        if (!selectedProjectId) return;
        setIsMapping(true);
        
        try {
            // Create a table for Trimble Topics
            const tableId = `trimble_topics_${selectedTrimbleProject}`;
            await dataService.createTable(selectedProjectId, {
                id: tableId,
                name: `Trimble Topics: ${project.name}`,
                fields: [
                    { id: 'id', name: 'Issue ID', type: FieldType.TEXT, required: true },
                    { id: 'title', name: 'Title', type: FieldType.TEXT, required: true },
                    { id: 'priority', name: 'Priority', type: FieldType.TEXT, required: true },
                    { id: 'assignee', name: 'Assignee', type: FieldType.TEXT, required: true },
                    { id: 'date', name: 'Last Updated', type: FieldType.TEXT, required: true },
                ]
            });

            // Seed some records
            for (const topic of project.topics) {
                await dataService.addRecord(selectedProjectId, tableId, {
                    'Issue ID': topic.id,
                    'Title': topic.title,
                    'Priority': topic.priority,
                    'Assignee': topic.assignee,
                    'Last Updated': topic.date
                });
            }

            showToast('Successfully mapped Topics to Nexus Data Table', 'success');
        } catch (error) {
            console.error('Mapping failed:', error);
            showToast('Failed to map data. Table may already exist.', 'info');
        } finally {
            setIsMapping(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-neutral-50 dark:bg-[#0A0A0A] overflow-hidden relative">
            {/* Header */}
            <div className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-[#0052CC] rounded flex items-center justify-center">
                            <Cloud className="text-white w-4 h-4" />
                         </div>
                         <span className="font-bold text-neutral-900 dark:text-white">Trimble Connect</span>
                    </div>
                    <div className="h-4 w-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-success-600 animate-pulse"></div>
                        <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Enterprise Active</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all",
                            isRefreshing && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <RefreshCcw className={cn("w-4 h-4", isRefreshing && "animate-spin")} /> 
                        {isRefreshing ? 'Syncing...' : 'Sync Data'}
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all group">
                        <Settings className="w-4 h-4 text-neutral-400 group-hover:text-primary-600 transition-colors" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Project Sidebar */}
                <aside className="w-72 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col shrink-0">
                     <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                         <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Project Context</label>
                         <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                <Cloud className="w-4 h-4" />
                            </div>
                            <select 
                                value={selectedTrimbleProject}
                                onChange={(e) => setSelectedTrimbleProject(e.target.value as any)}
                                className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white"
                            >
                                <option value="southside">Southside Medical</option>
                                <option value="terminal">North Terminal Exp</option>
                            </select>
                         </div>
                     </div>
                     <nav className="flex-1 overflow-y-auto pt-2">
                        <ProjectNavItem 
                            onClick={() => setActiveNavItem('files')}
                            icon={<Folder className="w-4 h-4" />} 
                            label="Project Files" 
                            count={project.filesCount} 
                            active={activeNavItem === 'files'}
                        />
                        <ProjectNavItem 
                            onClick={() => setActiveNavItem('topics')}
                            icon={<MessageSquare className="w-4 h-4" />} 
                            label="Topics (BCF Issues)" 
                            count={project.topicsCount} 
                            active={activeNavItem === 'topics'}
                        />
                        <ProjectNavItem 
                            onClick={() => setActiveNavItem('nodes')}
                            icon={<Lock className="w-4 h-4" />} 
                            label="Organizer Nodes" 
                            count={project.nodesCount} 
                            active={activeNavItem === 'nodes'}
                        />
                        <ProjectNavItem 
                            onClick={() => setActiveNavItem('props')}
                            icon={<Info className="w-4 h-4" />} 
                            label="Property Sets" 
                            count="5"
                            active={activeNavItem === 'props'}
                        />
                     </nav>
                     <div className="p-6 bg-neutral-50 dark:bg-neutral-950/50 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-600/10 flex items-center justify-center text-primary-600">
                                <LinkIcon className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tighter text-neutral-400">Integration Link</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed font-medium">
                            Synced with project <span className="text-neutral-900 dark:text-white font-bold">{project.name}</span> in the Trimble Enterprise Cloud.
                        </p>
                        <button className="w-full py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-[10px] font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-sm">
                            Open in Web <ExternalLink className="w-3 h-3" />
                        </button>
                     </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 bg-neutral-50 dark:bg-[#080808]">
                    {activeNavItem === 'topics' ? (
                        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">{project.name}</h2>
                                    <p className="text-sm text-neutral-500 font-bold italic dark:text-neutral-400">Viewing real-time coordination topics from Trimble Connect</p>
                                </div>
                                <button 
                                    onClick={handleMapToNexus}
                                    disabled={isMapping}
                                    className={cn(
                                        "bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 dark:shadow-none transition-all flex items-center gap-2",
                                        isMapping && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                     {isMapping ? (
                                        <>Mapping... <RefreshCcw className="w-4 h-4 animate-spin" /></>
                                     ) : (
                                        <>Map to Nexus Table <Database className="w-4 h-4" /></>
                                     )}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <StatusCard label="Open Issues" count={project.topicsCount} color="bg-error-500" />
                                 <StatusCard label="Active Users" count="18" color="bg-primary-500" />
                                 <StatusCard label="Avg. Response" count="4.2h" color="bg-emerald-500" />
                            </div>

                            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl shadow-neutral-200/40 dark:shadow-none overflow-hidden">
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {project.topics.map(topic => (
                                        <TopicListItem key={topic.id} {...topic} />
                                    ))}
                                </div>
                                <div className="p-4 bg-neutral-50/50 dark:bg-neutral-800/30 text-center">
                                    <button className="text-primary-600 dark:text-primary-400 font-bold text-[10px] uppercase tracking-widest hover:underline flex items-center gap-2 mx-auto">
                                        View all {project.topicsCount} topics in Connect <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-40">
                             <div className="w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center mb-6">
                                 <Lock className="w-10 h-10 text-neutral-400" />
                             </div>
                             <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{activeNavItem.charAt(0).toUpperCase() + activeNavItem.slice(1)} View</h3>
                             <p className="text-neutral-500 dark:text-neutral-400 max-w-sm font-medium">This module is part of the Enterprise Connector pack. Your workspace has permission to view but not edit these nodes.</p>
                        </div>
                    )}
                </main>
            </div>

            {toast && (
                <div className={cn(
                    "fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 font-bold text-xs uppercase tracking-widest",
                    toast.type === 'success' ? "bg-success-600 text-white" : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                )}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}

function ProjectNavItem({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count: string; active?: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between px-6 py-3.5 transition-all group relative",
                active ? "text-primary-600 bg-primary-50/50 dark:bg-primary-900/10" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
            )}
        >
            {active && <div className="absolute left-0 top-1 bottom-1 w-1 bg-primary-600 rounded-r-full"></div>}
            <div className="flex items-center gap-3">
                <div className={cn("transition-colors", active ? "text-primary-600" : "text-neutral-400 group-hover:text-primary-600")}>{icon}</div>
                <span className="text-sm font-bold tracking-tight">{label}</span>
            </div>
            <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full transition-all",
                active ? "bg-primary-600 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700"
            )}>{count}</span>
        </button>
    );
}

function StatusCard({ label, count, color }: { label: string; count: string; color: string }) {
    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-lg dark:hover:border-neutral-700 transition-all group flex items-center gap-5">
            <div className={cn("w-1.5 h-10 rounded-full", color)}></div>
            <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">{count}</p>
            </div>
        </div>
    );
}

function TopicListItem({ id, title, priority, assignee, date }: { id: string; title: string; priority: string; assignee: string; date: string }) {
    return (
        <div className="px-6 py-5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group cursor-pointer border-l-4 border-transparent hover:border-primary-600">
            <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-neutral-400 group-hover:bg-white dark:group-hover:bg-neutral-700 group-hover:shadow-sm group-hover:text-primary-600 transition-all shrink-0">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-bold text-neutral-400 font-mono tracking-tighter dark:text-neutral-500">{id}</span>
                        <span className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                            priority === 'Critical' ? "bg-error-600 text-white" : 
                            priority === 'High' ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" : "bg-warning-50 text-warning-600 dark:bg-warning-900/20 dark:text-warning-400"
                        )}>{priority}</span>
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">{title}</h4>
                </div>
            </div>
            <div className="flex items-center gap-8 shrink-0 ml-4">
                <div className="flex flex-col items-end text-right">
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{assignee}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium">
                        <Clock className="w-3 h-3" /> {date}
                    </div>
                </div>
                <button className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-neutral-400">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
