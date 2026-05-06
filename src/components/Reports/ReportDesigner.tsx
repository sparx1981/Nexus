import React, { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Plus, FileText, Settings2, Trash2, X, Type, Table as TableIcon, BarChart3, Image as ImageIcon, Download, GripHorizontal, Maximize2, Database, TrendingUp, PieChart as PieIcon, Hash } from 'lucide-react';
import { Report, useReportStore, ReportElement } from '../../store/reportStore';
import { cn } from '../../lib/utils';
import { useSchemaStore } from '../../store/schemaStore';
import { DashboardCard } from '../Dashboards/DashboardCard';
import { DashboardCard as ICard } from '../../types/dashboard';

interface ReportDesignerProps {
    report: Report;
    onClose: () => void;
}

function useDragResize(
    elementId: string,
    layout: { x: number; y: number; w: number; h: number },
    onLayoutChange: (id: string, layout: { x: number; y: number; w: number; h: number }) => void
) {
    const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

    const onDragMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        dragState.current = { startX: e.clientX, startY: e.clientY, origX: layout.x, origY: layout.y };
        const onMove = (ev: MouseEvent) => {
            if (!dragState.current) return;
            const dx = ev.clientX - dragState.current.startX;
            const dy = ev.clientY - dragState.current.startY;
            onLayoutChange(elementId, { ...layout, x: Math.max(0, dragState.current.origX + dx), y: Math.max(0, dragState.current.origY + dy) });
        };
        const onUp = () => { dragState.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [elementId, layout, onLayoutChange]);

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        resizeState.current = { startX: e.clientX, startY: e.clientY, origW: layout.w, origH: layout.h };
        const onMove = (ev: MouseEvent) => {
            if (!resizeState.current) return;
            const dx = ev.clientX - resizeState.current.startX;
            const dy = ev.clientY - resizeState.current.startY;
            onLayoutChange(elementId, { ...layout, w: Math.max(120, resizeState.current.origW + dx), h: Math.max(60, resizeState.current.origH + dy) });
        };
        const onUp = () => { resizeState.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [elementId, layout, onLayoutChange]);

    return { onDragMouseDown, onResizeMouseDown };
}

function ReportElementWrapper({ element, isSelected, onSelect, onDelete, onLayoutChange, children }: {
    element: ReportElement; isSelected: boolean; onSelect: () => void; onDelete: () => void;
    onLayoutChange: (id: string, layout: { x: number; y: number; w: number; h: number }) => void;
    children: React.ReactNode;
}) {
    const layout = element.layout || { x: 0, y: 0, w: 500, h: 120 };
    const { onDragMouseDown, onResizeMouseDown } = useDragResize(element.id, layout, onLayoutChange);
    return (
        <div
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={cn('absolute group transition-shadow', isSelected ? 'ring-2 ring-primary-500 ring-offset-2 shadow-lg' : 'hover:ring-1 hover:ring-neutral-300')}
            style={{ left: layout.x, top: layout.y, width: layout.w, height: layout.h }}
        >
            <div onMouseDown={onDragMouseDown}
                className={cn('absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-t-lg flex items-center gap-1 cursor-grab active:cursor-grabbing transition-opacity text-[9px] font-bold uppercase tracking-wider select-none',
                    isSelected ? 'opacity-100 bg-primary-600 text-white' : 'opacity-0 group-hover:opacity-100 bg-neutral-600 text-white')}>
                <GripHorizontal className="w-3 h-3" /> {element.type}
            </div>
            <div className="w-full h-full overflow-auto">{children}</div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete component"
                aria-label="Delete component"
                className={cn('absolute -top-3 -right-3 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg transition-opacity',
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                <X className="w-3 h-3" />
            </button>
            <div onMouseDown={onResizeMouseDown}
                className={cn('absolute -bottom-1 -right-1 w-5 h-5 bg-white border-2 border-primary-600 rounded-full flex items-center justify-center cursor-nwse-resize transition-opacity shadow-sm',
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} title="Drag to resize">
                <Maximize2 className="w-2.5 h-2.5 text-primary-600" />
            </div>
        </div>
    );
}

function ElementContent({ element, onChange }: { element: ReportElement; onChange: (c: any) => void }) {
    const [editing, setEditing] = useState(false);
    if (element.type === 'text') {
        const style = element.content.style || {};
        const textStyle = {
            fontSize: style.fontSize ? `${style.fontSize}px` : '14px',
            fontStyle: style.fontStyle === 'italic' ? 'italic' : 'normal',
            fontWeight: style.fontStyle === 'bold' ? '900' : '500',
            color: style.fontColor || 'inherit',
        };

        return editing ? (
            <textarea autoFocus value={typeof element.content === 'string' ? element.content : (element.content.text || '')}
                onChange={(e) => onChange(typeof element.content === 'string' ? e.target.value : { ...element.content, text: e.target.value })} 
                onBlur={() => setEditing(false)}
                style={textStyle}
                className="w-full h-full p-4 leading-relaxed bg-transparent outline-none resize-none border-none dark:text-neutral-300" />
        ) : (
            <div onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
                style={textStyle}
                className="w-full h-full p-4 leading-relaxed whitespace-pre-wrap cursor-text select-text"
                title="Double-click to edit">
                {typeof element.content === 'string' ? element.content : (element.content.text || 'Text element — double-click to edit')}
            </div>
        );
    }
    if (element.type === 'table' || element.type === 'chart') {
        const card: ICard = {
            id: element.id,
            type: element.type === 'table' ? 'table' : (element.content.type || 'bar'),
            title: element.content.title || '',
            dataSourceId: element.content.dataSourceId || '',
            config: element.content.config || {}
        };
        
        if (!card.dataSourceId) {
            return (
                <div className="w-full h-full rounded-lg border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center text-neutral-400 font-bold uppercase text-[10px] tracking-widest bg-neutral-50/50 dark:bg-black/20 gap-2">
                    {element.type === 'table' ? <TableIcon className="w-6 h-6 opacity-40" /> : <BarChart3 className="w-6 h-6 opacity-40" />}
                    <span>Select Data Source</span>
                </div>
            );
        }

        return (
            <div className="w-full h-full bg-white dark:bg-black p-2 rounded-lg overflow-hidden">
                <DashboardCard card={card} />
            </div>
        );
    }
    if (element.type === 'image') return (
        <div className="w-full h-full rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center text-neutral-400 font-bold uppercase text-[10px] tracking-widest gap-2">
            <ImageIcon className="w-6 h-6 opacity-40" /><span>Image Placeholder</span>
        </div>
    );
    return null;
}

export const ReportDesigner = ({ report, onClose }: ReportDesignerProps) => {
    const { updateReport } = useReportStore();
    const { tables, restApiConnectors } = useSchemaStore();
    const getApis = restApiConnectors.filter((c: any) => c.method === 'GET');
    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [exportingPdf, setExportingPdf] = useState(false);

    const canvasHeight = Math.max(1100, ...report.elements.map(el => (el.layout?.y || 0) + (el.layout?.h || 120) + 80));

    const handleAddElement = (type: ReportElement['type']) => {
        const n = report.elements.length;
        const el: ReportElement = {
            id: `el_${Date.now()}`, type,
            content: type === 'text' 
                ? { text: 'Double-click to edit this text element.', style: { fontSize: 14, fontStyle: 'normal', fontColor: '#111827' } } 
                : (type === 'table' || type === 'chart' ? { dataSourceId: '', config: {}, title: `New ${type}`, type: type === 'chart' ? 'bar' : 'table' } : {}),
            layout: { x: 20 + (n % 3) * 10, y: 20 + n * 30, w: type === 'text' ? 500 : type === 'table' ? 680 : 460, h: type === 'text' ? 80 : type === 'table' ? 200 : 180 }
        };
        updateReport(report.id, { elements: [...report.elements, el] });
        setEditingElementId(el.id);
    };

    const handleDeleteElement = (id: string) => {
        updateReport(report.id, { elements: report.elements.filter(e => e.id !== id) });
        if (editingElementId === id) setEditingElementId(null);
    };

    const handleUpdateElementContent = (id: string, updates: any) => {
        updateReport(report.id, { elements: report.elements.map(el => el.id === id ? { ...el, content: { ...el.content, ...updates } } : el) });
    };

    const handleLayoutChange = useCallback((id: string, layout: { x: number; y: number; w: number; h: number }) => {
        updateReport(report.id, { elements: report.elements.map(el => el.id === id ? { ...el, layout } : el) });
    }, [report.elements, report.id, updateReport]);

    const handleExportPDF = async () => {
        setExportingPdf(true);
        try {
            const pw = window.open('', '_blank');
            if (!pw) return;
            const elemHtml = report.elements.map(el => {
                const l = el.layout || { x: 0, y: 0, w: 500, h: 120 };
                const s = `position:absolute;left:${l.x}px;top:${l.y}px;width:${l.w}px;min-height:${l.h}px;`;
                if (el.type === 'text') return `<div style="${s}font-family:sans-serif;font-size:13px;line-height:1.6;padding:8px;white-space:pre-wrap;">${typeof el.content === 'string' ? el.content.replace(/</g,'&lt;') : ''}</div>`;
                if (el.type === 'table') return `<div style="${s}border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:11px;color:#64748b;font-weight:bold;text-transform:uppercase;">📊 Data Table</div>`;
                if (el.type === 'chart') return `<div style="${s}border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:11px;color:#64748b;font-weight:bold;text-transform:uppercase;">📈 Chart</div>`;
                return '';
            }).join('');
            pw.document.write(`<!DOCTYPE html><html><head><title>${report.name}</title><style>@page{margin:15mm;size:A4;}body{margin:0;font-family:sans-serif;}.page{width:210mm;min-height:297mm;position:relative;}.title{font-size:22px;font-weight:900;text-transform:uppercase;padding:24px 20px 8px;color:#0f172a;border-bottom:2px solid #e2e8f0;margin-bottom:20px;}.canvas{position:relative;min-height:${canvasHeight}px;}</style></head><body><div class="page"><div class="title">${report.name}</div><div class="canvas">${elemHtml}</div></div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}</script></body></html>`);
            pw.document.close();
        } finally {
            setExportingPdf(false);
        }
    };

    const editingElement = report.elements.find(e => e.id === editingElementId);

    return (
        <div className="flex-1 flex flex-col h-full bg-neutral-100 dark:bg-[#050505] overflow-hidden">
            <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0A0A0A] flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
                    <input value={report.name} onChange={(e) => updateReport(report.id, { name: e.target.value })}
                        className="text-lg font-black text-neutral-900 dark:text-white bg-transparent outline-none w-64 uppercase tracking-tighter" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 gap-0.5">
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest px-2">Add</span>
                        {([
                            { type: 'text',  icon: <Type className="w-3.5 h-3.5" />,     label: 'Text'  },
                            { type: 'table', icon: <TableIcon className="w-3.5 h-3.5" />, label: 'Table' },
                            { type: 'chart', icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Chart' },
                            { type: 'image', icon: <ImageIcon className="w-3.5 h-3.5" />, label: 'Image' },
                        ] as const).map(({ type, icon, label }) => (
                            <button key={type} onClick={() => handleAddElement(type)} title={`Add ${label}`}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white dark:hover:bg-black text-neutral-500 hover:text-primary-600 transition-all active:scale-90 text-[11px] font-bold">
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                    <div className="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-1"></div>
                    <button onClick={handleExportPDF} disabled={exportingPdf}
                        className="flex items-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl font-bold text-xs hover:border-neutral-400 transition-all disabled:opacity-50">
                        <Download className="w-4 h-4" />{exportingPdf ? 'Generating…' : 'Export PDF'}
                    </button>
                    <button onClick={onClose}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 dark:shadow-none active:scale-95">
                        <Save className="w-4 h-4" />Close Editor
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-auto p-12 bg-neutral-200/50 dark:bg-black relative" onClick={() => setEditingElementId(null)}>
                    <div className="bg-white dark:bg-[#121212] mx-auto shadow-2xl rounded-sm border border-neutral-300 dark:border-neutral-800 relative"
                        style={{ width: 850, minHeight: canvasHeight }}>
                        {report.elements.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
                                <FileText className="w-20 h-20 text-neutral-300 mb-4" />
                                <p className="text-sm font-black text-neutral-400 uppercase tracking-widest">Free-form Report Canvas</p>
                                <p className="text-xs text-neutral-400 mt-1">Add elements from the toolbar, then drag to position them</p>
                            </div>
                        ) : report.elements.map(element => (
                            <ReportElementWrapper key={element.id} element={element} isSelected={editingElementId === element.id}
                                onSelect={() => setEditingElementId(element.id)}
                                onDelete={() => handleDeleteElement(element.id)}
                                onLayoutChange={handleLayoutChange}>
                                <ElementContent element={element}
                                    onChange={(content) => updateReport(report.id, { elements: report.elements.map(el => el.id === element.id ? { ...el, content } : el) })} />
                            </ReportElementWrapper>
                        ))}
                    </div>
                </main>

                <aside className={cn("bg-white dark:bg-[#0A0A0A] border-l border-neutral-200 dark:border-neutral-800 transition-all duration-300 overflow-hidden shrink-0", !editingElement ? "w-0" : "w-80")}>
                    {editingElement && (
                        <div className="flex flex-col h-full w-80">
                            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-primary-600" />
                                    <h3 className="font-extrabold text-neutral-900 dark:text-white uppercase text-[10px] tracking-widest">Element Options</h3>
                                </div>
                                <button onClick={() => setEditingElementId(null)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"><X className="w-4 h-4 text-neutral-400" /></button>
                            </div>
                            <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                                {(editingElement.type === 'table' || editingElement.type === 'chart') && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Data Source</label>
                                            <select 
                                                value={editingElement.content.dataSourceId || ''}
                                                onChange={(e) => handleUpdateElementContent(editingElement.id, { dataSourceId: e.target.value })}
                                                className="w-full px-4 py-2 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold outline-none dark:text-white"
                                            >
                                                <option value="">Choose data source...</option>
                                                {tables.length > 0 && <optgroup label="Tables">{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                                                {getApis.length > 0 && <optgroup label="REST APIs (GET)">{getApis.map((c: any) => <option key={c.id} value={c.id}>{c.name} (API)</option>)}</optgroup>}
                                            </select>
                                        </div>

                                        {editingElement.type === 'chart' && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase">Chart Type</label>
                                                <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 gap-1">
                                                    {[
                                                        { type: 'bar', icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Bar' },
                                                        { type: 'line', icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Line' },
                                                        { type: 'pie', icon: <PieIcon className="w-3.5 h-3.5" />, label: 'Pie' },
                                                        { type: 'kpi', icon: <Hash className="w-3.5 h-3.5" />, label: 'KPI' },
                                                    ].map((t) => (
                                                        <button
                                                            key={t.type}
                                                            onClick={() => handleUpdateElementContent(editingElement.id, { type: t.type })}
                                                            className={cn(
                                                                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                                                editingElement.content.type === t.type ? "bg-white dark:bg-black text-primary-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                                                            )}
                                                        >
                                                            {t.icon}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {editingElement.content.dataSourceId && (
                                            <div className="p-4 bg-primary-50/30 dark:bg-primary-950/20 rounded-2xl border border-primary-100 dark:border-primary-900/30 space-y-4">
                                                 {editingElement.content.type !== 'table' && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Dimension (X-Axis)</label>
                                                        <select 
                                                            value={editingElement.content.config?.fieldX || ''}
                                                            onChange={(e) => handleUpdateElementContent(editingElement.id, { config: { ...editingElement.content.config, fieldX: e.target.value } })}
                                                            className="w-full px-3 py-2 bg-white dark:bg-black border border-primary-100 dark:border-primary-900/30 rounded-xl text-[10px] font-bold outline-none dark:text-white"
                                                        >
                                                            <option value="">Select dimension...</option>
                                                            {tables.find(t => t.id === editingElement.content.dataSourceId)?.fields.map(f => (
                                                                <option key={f.id} value={f.name}>{f.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {editingElement.content.type === 'table' && (
                                                    <div className="space-y-4 pt-2">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Header Colour</label>
                                                            <div className="flex gap-1.5 flex-wrap">
                                                                {['#1A56DB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#000000'].map(c => (
                                                                    <button 
                                                                        key={c}
                                                                        onClick={() => handleUpdateElementContent(editingElement.id, { config: { ...editingElement.content.config, headerBg: c } })}
                                                                        className={cn(
                                                                            "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                                                            editingElement.content.config?.headerBg === c ? "border-primary-500 scale-110" : "border-transparent"
                                                                        )}
                                                                        style={{ backgroundColor: c }}
                                                                    />
                                                                ))}
                                                                <input 
                                                                    type="color" 
                                                                    value={editingElement.content.config?.headerBg || '#1A56DB'}
                                                                    onChange={(e) => handleUpdateElementContent(editingElement.id, { config: { ...editingElement.content.config, headerBg: e.target.value } })}
                                                                    className="w-6 h-6 rounded-full border-none p-0 bg-transparent cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Show Fields</label>
                                                            <div className="space-y-1 max-h-40 overflow-y-auto p-2 bg-white dark:bg-black border border-primary-100 dark:border-primary-900/30 rounded-xl">
                                                                {tables.find(t => t.id === editingElement.content.dataSourceId)?.fields.map(f => {
                                                                    const isChecked = editingElement.content.config?.tableFields?.includes(f.name);
                                                                    return (
                                                                        <label key={f.id} className="flex items-center gap-2 px-1 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded cursor-pointer transition-colors">
                                                                            <input 
                                                                                type="checkbox"
                                                                                checked={!!isChecked}
                                                                                onChange={(e) => {
                                                                                    const currentFields = editingElement.content.config?.tableFields || [];
                                                                                    const nextFields = e.target.checked 
                                                                                        ? [...currentFields, f.name]
                                                                                        : currentFields.filter((cf: string) => cf !== f.name);
                                                                                    handleUpdateElementContent(editingElement.id, { config: { ...editingElement.content.config, tableFields: nextFields } });
                                                                                }}
                                                                                className="w-3 h-3 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                                                            />
                                                                            <span className="text-[9px] font-bold text-neutral-600 dark:text-neutral-400">{f.name}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {editingElement.content.type !== 'table' && editingElement.content.type !== 'kpi' && editingElement.content.type !== 'pie' && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Measure (Y-Axis)</label>
                                                        <select 
                                                            value={editingElement.content.config?.fieldY || ''}
                                                            onChange={(e) => handleUpdateElementContent(editingElement.id, { config: { ...editingElement.content.config, fieldY: e.target.value } })}
                                                            className="w-full px-3 py-2 bg-white dark:bg-black border border-primary-100 dark:border-primary-900/30 rounded-xl text-[10px] font-bold outline-none dark:text-white"
                                                        >
                                                            <option value="">Select measure...</option>
                                                            {tables.find(t => t.id === editingElement.content.dataSourceId)?.fields.map(f => (
                                                                <option key={f.id} value={f.name}>{f.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {editingElement.content.type === 'kpi' && (
                                                     <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Aggregation</label>
                                                            <select 
                                                                value={editingElement.content.config?.kpiOperation || 'count'}
                                                                onChange={(e) => handleUpdateElementContent(editingElement.id, { config: { ...editingElement.content.config, kpiOperation: e.target.value as any } })}
                                                                className="w-full px-3 py-2 bg-white dark:bg-black border border-primary-100 dark:border-primary-900/30 rounded-xl text-[10px] font-bold outline-none dark:text-white"
                                                            >
                                                                <option value="count">COUNT</option>
                                                                <option value="sum">SUM</option>
                                                                <option value="avg">AVERAGE</option>
                                                                <option value="max">MAX</option>
                                                                <option value="min">MIN</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Value Field</label>
                                                            <select 
                                                                value={editingElement.content.config?.kpiField || ''}
                                                                onChange={(e) => handleUpdateElementContent(editingElement.id, { config: { ...editingElement.content.config, kpiField: e.target.value } })}
                                                                className="w-full px-3 py-2 bg-white dark:bg-black border border-primary-100 dark:border-primary-900/30 rounded-xl text-[10px] font-bold outline-none dark:text-white"
                                                            >
                                                                <option value="">No field (Count records)</option>
                                                                {tables.find(t => t.id === editingElement.content.dataSourceId)?.fields.map(f => (
                                                                    <option key={f.id} value={f.name}>{f.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                     </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-neutral-900">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Position & Size</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['x', 'y', 'w', 'h'] as const).map(prop => (
                                            <div key={prop} className="space-y-0.5">
                                                <label className="text-[9px] font-bold text-neutral-400 uppercase">{prop === 'x' ? 'Left' : prop === 'y' ? 'Top' : prop === 'w' ? 'Width' : 'Height'}</label>
                                                <input type="number" value={editingElement.layout?.[prop] || 0}
                                                    onChange={(e) => handleLayoutChange(editingElement.id, { ...(editingElement.layout || { x: 0, y: 0, w: 400, h: 120 }), [prop]: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg outline-none dark:text-white font-mono" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {editingElement.type === 'text' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Typography</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-neutral-400 uppercase">Size (px)</label>
                                                    <input type="number" 
                                                        value={editingElement.content.style?.fontSize || 14}
                                                        onChange={(e) => handleUpdateElementContent(editingElement.id, { style: { ...(editingElement.content.style || {}), fontSize: parseInt(e.target.value) || 14 } })}
                                                        className="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg outline-none font-mono" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-neutral-400 uppercase">Style</label>
                                                    <select 
                                                        value={editingElement.content.style?.fontStyle || 'normal'}
                                                        onChange={(e) => handleUpdateElementContent(editingElement.id, { style: { ...(editingElement.content.style || {}), fontStyle: e.target.value } })}
                                                        className="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg outline-none font-bold">
                                                        <option value="normal">Normal</option>
                                                        <option value="bold">Bold</option>
                                                        <option value="italic">Italic</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-neutral-400 uppercase">Colour</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" 
                                                        value={editingElement.content.style?.fontColor || '#111827'}
                                                        onChange={(e) => handleUpdateElementContent(editingElement.id, { style: { ...(editingElement.content.style || {}), fontColor: e.target.value } })}
                                                        className="w-8 h-8 rounded-lg border-2 border-neutral-200 dark:border-neutral-800 bg-transparent p-0 cursor-pointer overflow-hidden" />
                                                    <input type="text" 
                                                        value={editingElement.content.style?.fontColor || '#111827'}
                                                        onChange={(e) => handleUpdateElementContent(editingElement.id, { style: { ...(editingElement.content.style || {}), fontColor: e.target.value } })}
                                                        className="flex-1 px-2 py-1.5 text-xs bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg outline-none font-mono uppercase" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Text Content</label>
                                            <textarea value={typeof editingElement.content === 'string' ? editingElement.content : (editingElement.content.text || '')}
                                                onChange={(e) => {
                                                    const val = typeof editingElement.content === 'string' ? e.target.value : { ...editingElement.content, text: e.target.value };
                                                    updateReport(report.id, { elements: report.elements.map(el => el.id === editingElement.id ? { ...el, content: val } : el) });
                                                }}
                                                className="w-full h-40 p-3 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none dark:text-white resize-none font-medium"
                                                placeholder="Enter report text here..." />
                                        </div>
                                    </div>
                                )}
                                {editingElement.type !== 'text' && (
                                    <p className="text-xs text-neutral-500 font-medium italic">Drag the handle to move this element. Use the resize handle (↘ corner) to change its size.</p>
                                )}
                                <button onClick={() => handleDeleteElement(editingElement.id)}
                                    className="w-full py-2.5 rounded-xl border-2 border-rose-200 dark:border-rose-900/40 text-rose-600 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all flex items-center justify-center gap-2">
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Element
                                </button>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};
