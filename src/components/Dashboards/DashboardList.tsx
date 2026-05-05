import React from 'react';
import { Plus, LayoutGrid, ChevronRight, Clock, Trash2, Globe } from 'lucide-react';
import { Dashboard } from '../../types/dashboard';
import { cn } from '../../lib/utils';
import { useDashboardStore } from '../../store/dashboardStore';

interface DashboardListProps {
    dashboards: Dashboard[];
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
}

export const DashboardList = ({ dashboards, onSelect, onCreate, onDelete }: DashboardListProps) => {
    const { updateDashboard } = useDashboardStore();

    const handlePublish = async (e: React.MouseEvent, dashboard: Dashboard) => {
        e.stopPropagation();
        await updateDashboard(dashboard.id, { published: !(dashboard as any).published } as any);
    };

    return (
        <div className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Dashboards</h2>
                        <p className="text-sm text-neutral-500 font-medium">Manage and view your project insights.</p>
                    </div>
                    <button
                        onClick={onCreate}
                        className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold transition-all active:scale-95 hover:brightness-110 hover:-translate-y-px hover:shadow-md"
                        style={{ background: 'var(--color-primary)', boxShadow: '0 4px 14px 0 var(--color-primary-light)' }}
                    >
                        <Plus className="w-5 h-5" />
                        Create Dashboard
                    </button>
                </div>

                {dashboards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl text-center" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <svg viewBox="0 0 160 120" className="w-40 mb-5 opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="10" y="60" width="28" height="40" rx="4" fill="var(--color-primary,#1A56DB)" opacity="0.7"/>
                          <rect x="46" y="40" width="28" height="60" rx="4" fill="var(--color-primary,#1A56DB)" opacity="0.5"/>
                          <rect x="82" y="50" width="28" height="50" rx="4" fill="var(--color-primary,#1A56DB)" opacity="0.35"/>
                          <rect x="118" y="30" width="28" height="70" rx="4" fill="var(--color-primary,#1A56DB)" opacity="0.6"/>
                          <path d="M24 58l36-17 36 12 36-28" stroke="var(--color-primary,#1A56DB)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
                        </svg>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">No dashboards yet</h3>
                        <p className="text-sm text-neutral-500 dark:text-slate-400 max-w-xs mx-auto mb-6">Build your first dashboard to start visualising data insights.</p>
                        <button onClick={onCreate} className="text-white px-6 py-2 rounded-xl font-bold transition-all active:scale-95 hover:brightness-110" style={{ background: 'var(--color-primary)' }}>
                            Create your first Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dashboards.map(dashboard => (
                            <div
                                key={dashboard.id}
                                className="group relative rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer border"
                                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                                onClick={() => onSelect(dashboard.id)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-xl">
                                            <LayoutGrid className="w-6 h-6" />
                                        </div>
                                        {(dashboard as any).published
                                            ? <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900/30 rounded-full text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</span>
                                            : <span className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-slate-800 text-neutral-400 rounded-full text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />Draft</span>}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(dashboard.id); }}
                                        className="p-2 text-neutral-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <h4 className="text-sm font-black text-neutral-900 dark:text-white mb-1 group-hover:text-teal-600 transition-colors uppercase tracking-widest">
                                    {dashboard.name}
                                </h4>
                                <p className="text-xs text-neutral-400 font-medium mb-5 line-clamp-2 min-h-[32px]">
                                    {dashboard.description || 'No description provided.'}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800/50">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        {(dashboard.cards || []).length} widget{(dashboard.cards || []).length !== 1 ? 's' : ''}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handlePublish(e, dashboard)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border active:scale-95",
                                                (dashboard as any).published
                                                    ? "border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                                    : "border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                            )}
                                        >
                                            <Globe className="w-3 h-3" />
                                            {(dashboard as any).published ? 'Unpublish' : 'Publish'}
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-teal-400 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
