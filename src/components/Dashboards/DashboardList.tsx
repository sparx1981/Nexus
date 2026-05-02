import React from 'react';
import { Plus, LayoutGrid, ChevronRight, Clock, BarChart3, Trash2 } from 'lucide-react';
import { Dashboard } from '../../types/dashboard';
import { cn } from '../../lib/utils';

interface DashboardListProps {
    dashboards: Dashboard[];
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
}

export const DashboardList = ({ dashboards, onSelect, onCreate, onDelete }: DashboardListProps) => {
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Dashboards</h2>
                        <p className="text-sm text-neutral-500 font-medium">Manage and view your project insights.</p>
                    </div>
                    <button 
                        onClick={onCreate}
                        className="flex items-center gap-2 px-6 py-2.5 text-neutral-500 dark:text-white rounded-xl font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary-200/20"
                        style={{ background: 'var(--project-btn-standard)' }}
                    >
                        <Plus className="w-5 h-5" />
                        Create Dashboard
                    </button>
                </div>

                {dashboards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
                        <div className="w-16 h-16 bg-neutral-50 flex items-center justify-center rounded-2xl mb-4">
                            <BarChart3 className="w-8 h-8 text-neutral-300" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-1">No dashboards found</h3>
                        <p className="text-sm text-neutral-500 mb-6">Create your first dashboard to start analyzing data.</p>
                        <button 
                            onClick={onCreate}
                            className="text-primary-600 font-bold hover:underline"
                        >
                            Build your first insight panel
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dashboards.map(dashboard => (
                            <div 
                                key={dashboard.id}
                                className="group relative rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer border" style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}
                                onClick={() => onSelect(dashboard.id)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                                        <LayoutGrid className="w-6 h-6" />
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(dashboard.id);
                                        }}
                                        className="p-2 text-neutral-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <h4 className="text-lg font-bold text-neutral-900 mb-1 group-hover:text-primary-600 transition-colors">
                                    {dashboard.name}
                                </h4>
                                <p className="text-sm text-neutral-400 font-medium mb-6 line-clamp-2">
                                    {dashboard.description || 'No description provided.'}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        Updated recently
                                    </div>
                                    <div className="text-xs font-bold text-primary-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Open Dashboard <ChevronRight className="w-4 h-4" />
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
