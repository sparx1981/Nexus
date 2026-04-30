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
    Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function TrimbleConnectView() {
    const [status] = useState<'connected' | 'disconnected'>('connected');
    
    return (
        <div className="flex-1 flex flex-col bg-neutral-50 overflow-hidden">
            {/* Header / Connection Status */}
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
                        <span className="text-xs font-medium text-neutral-600">Enterprise Workspace Active</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors">
                        <RefreshCcw className="w-4 h-4" /> Re-sync
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors">
                        <Settings2 className="w-4 h-4" /> Manage Connection
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Project Sidebar */}
                <aside className="w-72 border-r border-neutral-200 bg-white flex flex-col shrink-0">
                     <div className="p-4 border-b border-neutral-200">
                         <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                <Cloud className="w-4 h-4" />
                            </div>
                            <select className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-primary-600">
                                <option>Southside Medical Center</option>
                                <option>North Terminal Expansion</option>
                                <option>Riverpoint Bridge Project</option>
                            </select>
                         </div>
                     </div>
                     <nav className="flex-1 overflow-y-auto">
                        <ProjectNavItem icon={<Folder className="w-4 h-4" />} label="Project Files" count="1.2k" />
                        <ProjectNavItem icon={<MessageSquare className="w-4 h-4" />} label="Topics (BCF Issues)" count="142" active />
                        <ProjectNavItem icon={<Lock className="w-4 h-4" />} label="Organizer Nodes" count="28" />
                        <ProjectNavItem icon={<Info className="w-4 h-4" />} label="Property Sets" count="5" />
                     </nav>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">BCF Topics (Issues)</h2>
                            <p className="text-sm text-neutral-500">Live project coordination data from Trimble Connect</p>
                        </div>
                        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 shadow-sm transition-all flex items-center gap-2">
                             Map to Nexus Table
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                         <StatusCard label="Open Issues" count="94" color="bg-error-600" />
                         <StatusCard label="In Progress" count="32" color="bg-warning-500" />
                         <StatusCard label="Closed" count="16" color="bg-success-600" />
                    </div>

                    {/* Content List */}
                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                        <div className="divide-y divide-neutral-100">
                            <TopicListItem 
                                id="ISSUE-001" 
                                title="Clash detected in HVAC layout - Floor 2" 
                                priority="High" 
                                assignee="Sarah Jenkins" 
                                date="2h ago" 
                            />
                            <TopicListItem 
                                id="ISSUE-002" 
                                title="Missing fire safety documentation for Stairwell B" 
                                priority="Medium" 
                                assignee="Mark Thompson" 
                                date="5h ago" 
                            />
                            <TopicListItem 
                                id="ISSUE-003" 
                                title="Railing height non-compliant with local code" 
                                priority="Critical" 
                                assignee="David Lopez" 
                                date="1d ago" 
                            />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function ProjectNavItem({ icon, label, count, active }: { icon: React.ReactNode; label: string; count: string; active?: boolean }) {
    return (
        <button className={cn(
            "w-full flex items-center justify-between px-6 py-3 transition-colors group",
            active ? "bg-primary-50 text-primary-600" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
        )}>
            <div className="flex items-center gap-3">
                <div className={cn(active ? "text-primary-600" : "text-neutral-400 group-hover:text-neutral-600")}>{icon}</div>
                <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-[10px] font-bold bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded-full">{count}</span>
        </button>
    );
}

function StatusCard({ label, count, color }: { label: string; count: string; color: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-neutral-200 flex items-center gap-4">
            <div className={cn("w-1 h-8 rounded-full", color)}></div>
            <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-xl font-bold text-neutral-900">{count}</p>
            </div>
        </div>
    );
}

function TopicListItem({ id, title, priority, assignee, date }: { id: string; title: string; priority: string; assignee: string; date: string }) {
    return (
        <div className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors group">
            <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 text-neutral-400 group-hover:text-primary-600 transition-colors">
                    <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 font-mono">{id}</span>
                        <span className={cn(
                            "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                            priority === 'Critical' ? "bg-error-600 text-white" : 
                            priority === 'High' ? "bg-error-100 text-error-600" : "bg-warning-100 text-warning-500"
                        )}>{priority}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-neutral-900 truncate">{title}</h4>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end text-right">
                    <span className="text-xs font-medium text-neutral-700">{assignee}</span>
                    <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <Clock className="w-3 h-3" /> {date}
                    </div>
                </div>
                <button className="p-1 hover:bg-neutral-200 rounded text-neutral-400">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function Settings2({ className }: { className?: string }) {
    return <Settings className={className} />;
}

import { Settings } from 'lucide-react';
