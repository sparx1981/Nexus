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
    Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';

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
    const [selectedProjectId, setSelectedProjectId] = useState<keyof typeof PROJECTS_DATA>('southside');
    const [activeNavItem, setActiveNavItem] = useState<'files' | 'topics' | 'nodes' | 'props'>('topics');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const project = PROJECTS_DATA[selectedProjectId];

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            setToast('Project data synced');
            setTimeout(() => setToast(null), 3000);
        }, 1200);
    };

    return (
        <div className="flex-1 flex flex-col bg-neutral-50 overflow-hidden relative">
            {/* Header */}
            <div className="h-14 border-b border-neutral-200 bg-white px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-[#0052CC] rounded flex items-center justify-center">
                            <Cloud className="text-white w-4 h-4" />
                         </div>
                         <span className="font-bold text-neutral-900">Trimble Connect</span>
                    </div>
                    <div className="h-4 w-[1px] bg-neutral-200"></div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-success-600"></div>
                        <span className="text-xs font-medium text-neutral-600 underline decoration-success-600/30">Enterprise Active</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleRefresh}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all",
                            isRefreshing && "animate-spin text-primary-600"
                        )}
                    >
                        <RefreshCcw className="w-4 h-4" /> Sync
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all group">
                        <Settings2 className="w-4 h-4 text-neutral-400 group-hover:text-primary-600" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Project Sidebar */}
                <aside className="w-72 border-r border-neutral-200 bg-white flex flex-col shrink-0">
                     <div className="p-4 border-b border-neutral-200">
                         <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Project Context</label>
                         <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                <Cloud className="w-4 h-4" />
                            </div>
                            <select 
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value as any)}
                                className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary-600/20"
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
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 bg-neutral-50">
                    {activeNavItem === 'topics' ? (
                        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-neutral-900">{project.name}</h2>
                                    <p className="text-sm text-neutral-500 font-medium italic">Viewing live coordination topics from Trimble Connect</p>
                                </div>
                                <button 
                                    onClick={() => setToast('Mapping schema to Nexus tables...')}
                                    className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all flex items-center gap-2"
                                >
                                     Map to Nexus Table
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <StatusCard label="Open Issues" count={project.topicsCount} color="bg-error-500" />
                                 <StatusCard label="Active Users" count="18" color="bg-primary-500" />
                                 <StatusCard label="Avg. Response" count="4.2h" color="bg-emerald-500" />
                            </div>

                            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-200/40 overflow-hidden">
                                <div className="divide-y divide-neutral-100">
                                    {project.topics.map(topic => (
                                        <TopicListItem key={topic.id} {...topic} />
                                    ))}
                                </div>
                                <div className="p-4 bg-neutral-50/50 text-center">
                                    <button className="text-primary-600 font-bold text-xs uppercase tracking-widest hover:underline">View all {project.topicsCount} topics in Connect</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-40">
                             <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center mb-6">
                                 <Lock className="w-10 h-10 text-neutral-400" />
                             </div>
                             <h3 className="text-xl font-bold text-neutral-900 mb-2">{activeNavItem.charAt(0).toUpperCase() + activeNavItem.slice(1)} View</h3>
                             <p className="text-neutral-500 max-w-sm">This module is part of the Enterprise Connector pack. Your workspace has permission to view but not edit these nodes.</p>
                        </div>
                    )}
                </main>
            </div>

            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-6 py-3 rounded-full shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 font-bold text-xs uppercase tracking-widest">
                    {toast}
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
                active ? "text-primary-600 bg-primary-50/50" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
            )}
        >
            {active && <div className="absolute left-0 top-1 bottom-1 w-1 bg-primary-600 rounded-r-full"></div>}
            <div className="flex items-center gap-3">
                <div className={cn("transition-colors", active ? "text-primary-600" : "text-neutral-400 group-hover:text-primary-600")}>{icon}</div>
                <span className="text-sm font-bold tracking-tight">{label}</span>
            </div>
            <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full transition-all",
                active ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200"
            )}>{count}</span>
        </button>
    );
}

function StatusCard({ label, count, color }: { label: string; count: string; color: string }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-all group flex items-center gap-5">
            <div className={cn("w-1.5 h-10 rounded-full", color)}></div>
            <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
                <p className="text-2xl font-black text-neutral-900 tabular-nums">{count}</p>
            </div>
        </div>
    );
}

function TopicListItem({ id, title, priority, assignee, date }: { id: string; title: string; priority: string; assignee: string; date: string }) {
    return (
        <div className="px-6 py-5 flex items-center justify-between hover:bg-neutral-50 transition-colors group cursor-pointer">
            <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-50 text-neutral-400 group-hover:bg-white group-hover:shadow-sm group-hover:text-primary-600 transition-all shrink-0">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-bold text-neutral-400 font-mono tracking-tighter">{id}</span>
                        <span className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                            priority === 'Critical' ? "bg-error-600 text-white" : 
                            priority === 'High' ? "bg-rose-50 text-rose-600" : "bg-warning-50 text-warning-600"
                        )}>{priority}</span>
                    </div>
                    <h4 className="text-sm font-bold text-neutral-900 truncate group-hover:text-primary-600 transition-colors">{title}</h4>
                </div>
            </div>
            <div className="flex items-center gap-8 shrink-0 ml-4">
                <div className="flex flex-col items-end text-right">
                    <span className="text-xs font-bold text-neutral-700">{assignee}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium">
                        <Clock className="w-3 h-3" /> {date}
                    </div>
                </div>
                <button className="p-2 hover:bg-neutral-200 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-neutral-400">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function Settings2({ className }: { className?: string }) {
    return <Settings className={className} />;
}
