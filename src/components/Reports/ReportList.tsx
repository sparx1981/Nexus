import React from 'react';
import { Plus, FileText, ChevronRight, Clock, MoreVertical, Trash2 } from 'lucide-react';
import { Report } from '../../store/reportStore';

interface ReportListProps {
    reports: Report[];
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
}

export const ReportList = ({ reports, onSelect, onCreate, onDelete }: ReportListProps) => {
    return (
        <div className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Reports & Audits</h2>
                        <p className="text-sm text-neutral-500 font-medium">Export and share detailed data snapshots.</p>
                    </div>
                    <button 
                        onClick={onCreate}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-200 dark:shadow-none hover:bg-primary-700 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Create Report
                    </button>
                </div>

                {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl text-center" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <div className="w-12 h-12 bg-neutral-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                            <FileText className="w-6 h-6 text-neutral-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">No reports yet</h3>
                        <p className="text-sm text-neutral-500 dark:text-slate-400 max-w-xs mx-auto mb-6">Generate your first audit or data summary report.</p>
                        <button 
                            onClick={onCreate}
                            className="text-white px-6 py-2 rounded-xl font-bold transition-all active:scale-95 hover:opacity-90"
                            style={{ background: 'var(--color-primary)' }}
                        >
                            Create your first Report
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reports.map(report => (
                            <div 
                                key={report.id}
                                className="group rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer relative border"
                                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                                onClick={() => onSelect(report.id)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-neutral-50 dark:bg-black text-neutral-400 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(report.id);
                                        }}
                                        className="p-2 text-neutral-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <h4 className="text-lg font-black text-neutral-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors uppercase text-xs tracking-widest">
                                    {report.name}
                                </h4>
                                <p className="text-xs text-neutral-400 font-medium mb-6 line-clamp-2">
                                    {report.description || 'No description provided.'}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-neutral-50 dark:border-neutral-900">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        Created {new Date(report.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-[10px] font-black text-primary-600 flex items-center gap-1 group-hover:gap-2 transition-all uppercase tracking-widest">
                                        Review <ChevronRight className="w-4 h-4" />
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
