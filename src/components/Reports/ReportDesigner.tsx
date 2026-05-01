import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, FileText, Layout, Settings2, Trash2, X, Type, Table as TableIcon, BarChart3, Image as ImageIcon } from 'lucide-react';
import { Report, useReportStore, ReportElement } from '../../store/reportStore';
import { cn } from '../../lib/utils';

interface ReportDesignerProps {
    report: Report;
    onClose: () => void;
}

export const ReportDesigner = ({ report, onClose }: ReportDesignerProps) => {
    const { updateReport } = useReportStore();
    const [editingElementId, setEditingElementId] = useState<string | null>(null);

    const handleAddElement = (type: ReportElement['type']) => {
        const newElement: ReportElement = {
            id: `el_${Date.now()}`,
            type,
            content: type === 'text' ? 'New text element' : {},
            layout: { x: 0, y: report.elements.length * 100, w: 100, h: 100 }
        };
        updateReport(report.id, { elements: [...report.elements, newElement] });
        setEditingElementId(newElement.id);
    };

    const handleDeleteElement = (id: string) => {
        updateReport(report.id, { elements: report.elements.filter(e => e.id !== id) });
        if (editingElementId === id) setEditingElementId(null);
    };

    const editingElement = report.elements.find(e => e.id === editingElementId);

    return (
        <div className="flex-1 flex flex-col h-full bg-neutral-100 dark:bg-[#050505] overflow-hidden">
            <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0A0A0A] flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
                    <input 
                        value={report.name}
                        onChange={(e) => updateReport(report.id, { name: e.target.value })}
                        className="text-lg font-black text-neutral-900 dark:text-white bg-transparent outline-none w-64 uppercase tracking-tighter"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        {(['text', 'table', 'chart', 'image'] as const).map(type => (
                            <button 
                                key={type} 
                                onClick={() => handleAddElement(type)}
                                className="p-2 rounded-lg hover:bg-white dark:hover:bg-black text-neutral-400 hover:text-primary-600 transition-all active:scale-90"
                                title={`Add ${type} element`}
                            >
                                {type === 'text' && <Type className="w-4 h-4" />}
                                {type === 'table' && <TableIcon className="w-4 h-4" />}
                                {type === 'chart' && <BarChart3 className="w-4 h-4" />}
                                {type === 'image' && <ImageIcon className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                    <div className="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-2"></div>
                    <button className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 dark:shadow-none active:scale-95">
                        <Save className="w-4 h-4" />
                        Finish Report
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto p-20 bg-neutral-200/50 dark:bg-black relative pattern-grid dark:pattern-grid-dark">
                    <div className="bg-white dark:bg-[#121212] min-h-[1100px] w-full max-w-[850px] mx-auto shadow-2xl rounded-sm p-16 border border-neutral-300 dark:border-neutral-800 relative">
                        {report.elements.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 py-40">
                                <FileText className="w-20 h-20 text-neutral-300 mb-4" />
                                <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">A4 Document Canvas</p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {report.elements.map(element => (
                                    <div 
                                        key={element.id}
                                        onClick={() => setEditingElementId(element.id)}
                                        className={cn(
                                            "relative group p-6 border rounded-xl transition-all",
                                            editingElementId === element.id ? "border-primary-600 ring-4 ring-primary-100 dark:ring-primary-900/20" : "border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 cursor-pointer"
                                        )}
                                    >
                                        {element.type === 'text' && (
                                            <div className="text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed whitespace-pre-wrap">
                                                {typeof element.content === 'string' ? element.content : 'Text element content'}
                                            </div>
                                        )}
                                        {element.type === 'table' && (
                                            <div className="py-4 border-t border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-center text-neutral-400 font-bold uppercase text-[10px] tracking-widest bg-neutral-50 dark:bg-black/20 rounded-lg">
                                                <TableIcon className="w-4 h-4 mr-2" /> Data Grid Placeholder
                                            </div>
                                        )}
                                        {element.type === 'chart' && (
                                            <div className="h-40 bg-neutral-50 dark:bg-black/20 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-center text-neutral-400 font-bold uppercase text-[10px] tracking-widest">
                                                <BarChart3 className="w-6 h-6 mr-2" /> Visualization Placeholder
                                            </div>
                                        )}

                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteElement(element.id);
                                            }}
                                            className="absolute -top-3 -right-3 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                <aside className={cn(
                    "w-80 bg-white dark:bg-[#0A0A0A] border-l border-neutral-200 dark:border-neutral-800 transition-all duration-300 overflow-hidden shrink-0",
                    !editingElement ? "translate-x-full" : "translate-x-0"
                )}>
                    {editingElement && (
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-primary-600 font-black" />
                                    <h3 className="font-extrabold text-neutral-900 dark:text-white uppercase text-[10px] tracking-widest">Element Options</h3>
                                </div>
                                <button onClick={() => setEditingElementId(null)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md">
                                    <X className="w-4 h-4 text-neutral-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {editingElement.type === 'text' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Content</label>
                                        <textarea 
                                            value={typeof editingElement.content === 'string' ? editingElement.content : ''}
                                            onChange={(e) => {
                                                const newElements = report.elements.map(el => el.id === editingElement.id ? { ...el, content: e.target.value } : el);
                                                updateReport(report.id, { elements: newElements });
                                            }}
                                            className="w-full h-40 p-4 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none dark:text-white"
                                            placeholder="Enter report text here..."
                                        />
                                    </div>
                                )}

                                {editingElement.type !== 'text' && (
                                    <p className="text-xs text-neutral-500 font-medium italic">Advanced configuration for this element type coming soon.</p>
                                )}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};
