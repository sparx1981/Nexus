import React, { useState, useEffect, useCallback } from 'react';
import { 
    Layout, 
    Type, 
    MousePointer2, 
    Plus, 
    Settings2, 
    Layers, 
    Smartphone, 
    Tablet, 
    Monitor,
    Play,
    Zap,
    X,
    Trash2,
    Columns2,
    Minus,
    Type as TextIcon,
    ChevronDown,
    ToggleLeft,
    Calendar,
    Upload,
    Heading,
    Image as ImageIcon,
    Table as TableIcon,
    BarChart,
    TrendingUp,
    Tag as TagIcon,
    Square
} from 'lucide-react';
import { 
    DndContext, 
    DragOverlay, 
    useDraggable, 
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { cn } from '../../lib/utils';
import { useBuilderStore } from '../../store/builderStore';
import { useSchemaStore } from '../../store/schemaStore';
import { ComponentConfig } from '../../types';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const COMPONENT_TYPES = {
    LAYOUT: [
        { type: 'container', label: 'Container', icon: <Square className="w-4 h-4" /> },
        { type: 'section', label: 'Section', icon: <Layers className="w-4 h-4" /> },
        { type: 'row', label: 'Row', icon: <Columns2 className="w-4 h-4" /> },
    ],
    INPUTS: [
        { type: 'input', label: 'Text Input', icon: <Type className="w-4 h-4" /> },
        { type: 'button', label: 'Button', icon: <MousePointer2 className="w-4 h-4" /> },
        { type: 'select', label: 'Dropdown', icon: <ChevronDown className="w-4 h-4" /> },
        { type: 'toggle', label: 'Toggle', icon: <ToggleLeft className="w-4 h-4" /> },
        { type: 'date', label: 'Date Picker', icon: <Calendar className="w-4 h-4" /> },
        { type: 'file', label: 'File Upload', icon: <Upload className="w-4 h-4" /> },
    ],
    DISPLAY: [
        { type: 'heading', label: 'Heading', icon: <Heading className="w-4 h-4" /> },
        { type: 'text', label: 'Paragraph', icon: <TextIcon className="w-4 h-4" /> },
        { type: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
        { type: 'table', label: 'Data Table', icon: <TableIcon className="w-4 h-4" /> },
        { type: 'bar_chart', label: 'Chart (Bar)', icon: <BarChart className="w-4 h-4" /> },
        { type: 'line_chart', label: 'Chart (Line)', icon: <TrendingUp className="w-4 h-4" /> },
        { type: 'badge', label: 'Badge/Tag', icon: <TagIcon className="w-4 h-4" /> },
    ]
};

const CHART_DATA = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
];

export function AppBuilder() {
    const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [activeDragItem, setActiveDragItem] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showPublish, setShowPublish] = useState(false);
    const [publishStatus, setPublishStatus] = useState<'idle' | 'deploying' | 'success'>('idle');
    const [toast, setToast] = useState<string | null>(null);

    const { 
        components, 
        selectedId, 
        addComponent, 
        updateComponent, 
        deleteComponent, 
        selectComponent,
        undo,
        redo
    } = useBuilderStore();

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 5 }
    }));

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveDragItem(active.data.current);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (over && over.id === 'canvas-dropzone') {
            const type = active.data.current?.type;
            const label = active.data.current?.label;
            
            if (type) {
                const newComponent: ComponentConfig = {
                    id: Math.random().toString(36).substr(2, 9),
                    type,
                    label,
                    properties: getDefaultProperties(type),
                    position: { x: 0, y: 0 }
                };
                addComponent(newComponent);
            }
        }
    };

    const getDefaultProperties = (type: string) => {
        switch (type) {
            case 'heading': return { text: 'New Heading', size: 'h1' };
            case 'text': return { text: 'Start typing here...' };
            case 'button': return { label: 'Click Me', style: 'primary' };
            case 'input': return { label: 'Label', placeholder: 'Enter value...', required: false };
            case 'table': return { dataSource: 'contacts' };
            default: return { label: type.charAt(0).toUpperCase() + type.slice(1), visibility: true };
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                if (e.shiftKey) redo();
                else undo();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                showToast('Changes saved locally');
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId && (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
                    deleteComponent(selectedId);
                }
            }
            if (e.key === 'Escape') {
                setShowPreview(false);
                setShowPublish(false);
                selectComponent(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, undo, redo, deleteComponent, selectComponent]);

    const handlePublish = () => {
        setShowPublish(true);
        setPublishStatus('deploying');
        setTimeout(() => {
            setPublishStatus('success');
        }, 2000);
    };

    return (
        <DndContext 
            sensors={sensors} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
        >
            <div className="flex-1 flex overflow-hidden">
                {/* Left Palette */}
                <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-neutral-200">
                        <h3 className="font-bold text-neutral-900 text-sm">Components</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <PaletteSection title="Layout" items={COMPONENT_TYPES.LAYOUT} />
                        <PaletteSection title="Inputs" items={COMPONENT_TYPES.INPUTS} />
                        <PaletteSection title="Display" items={COMPONENT_TYPES.DISPLAY} />
                    </div>
                </aside>

                {/* Canvas Area */}
                <div className="flex-1 flex flex-col bg-neutral-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="h-12 border-b border-neutral-200 bg-white flex items-center px-4 justify-between shrink-0">
                        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
                            <ViewToggle active={viewMode === 'desktop'} onClick={() => setViewMode('desktop')} icon={<Monitor className="w-4 h-4" />} />
                            <ViewToggle active={viewMode === 'tablet'} onClick={() => setViewMode('tablet')} icon={<Tablet className="w-4 h-4" />} />
                            <ViewToggle active={viewMode === 'mobile'} onClick={() => setViewMode('mobile')} icon={<Smartphone className="w-4 h-4" />} />
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowPreview(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
                            >
                                <Play className="w-4 h-4" /> Preview
                            </button>
                            <button 
                                onClick={handlePublish}
                                className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-md hover:bg-opacity-90 shadow-sm transition-all"
                            >
                                <Zap className="w-4 h-4" /> Publish
                            </button>
                        </div>
                    </div>

                    {/* The Virtual Canvas */}
                    <div className="flex-1 overflow-auto p-12 flex justify-center items-start pattern-grid">
                        <Canvas viewMode={viewMode} />
                    </div>
                </div>

                {/* Right Properties Panel */}
                <aside className="w-72 bg-white border-l border-neutral-200 flex flex-col shrink-0">
                    <PropertiesPanel />
                </aside>
            </div>

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: '0.5',
                        },
                    },
                }),
            }}>
                {activeDragItem ? (
                    <div className="flex flex-col items-center gap-2 p-3 bg-white border-2 border-primary-600 rounded-xl shadow-xl w-24">
                        <div className="text-primary-600">
                            {activeDragItem.icon}
                        </div>
                        <span className="text-[10px] font-bold text-primary-600">{activeDragItem.label}</span>
                    </div>
                ) : null}
            </DragOverlay>

            {/* Modal Overlays */}
            {showPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPreview(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden">
                        <div className="h-14 border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 bg-neutral-50">
                            <h3 className="font-bold text-neutral-900">Application Preview</h3>
                            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-8 bg-neutral-100">
                             <div className="bg-white shadow-xl min-h-full p-12 max-w-4xl mx-auto rounded-lg">
                                 {components.length === 0 ? (
                                     <div className="text-center py-20">
                                         <p className="text-neutral-400">Preview is empty. Add components to the canvas.</p>
                                     </div>
                                 ) : (
                                     <div className="space-y-4">
                                         {components.map(c => <RenderComponent key={c.id} component={c} preview />)}
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {showPublish && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPublish(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                        <button onClick={() => setShowPublish(false)} className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-neutral-500" />
                        </button>

                        <div className="text-center">
                            {publishStatus === 'deploying' ? (
                                <>
                                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
                                    <h3 className="text-xl font-bold text-neutral-900 mb-2">Deploying Application...</h3>
                                    <p className="text-neutral-500 mb-4">Building assets and provisioning infrastructure.</p>
                                    <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-primary-600 h-full w-2/3 animate-[progress_2s_ease-in-out]"></div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-success-50 text-success-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-neutral-900 mb-2">Application Published Successfully</h3>
                                    <p className="text-neutral-500 mb-6 font-medium">Your app is now live and ready for production.</p>
                                    
                                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 mb-8 flex items-center justify-between">
                                        <span className="text-sm font-mono text-neutral-600">https://nexus.app/my-crm-app</span>
                                        <button onClick={() => showToast('URL copied')} className="text-primary-600 text-xs font-bold hover:underline">Copy URL</button>
                                    </div>

                                    <button 
                                        onClick={() => setShowPublish(false)}
                                        className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all"
                                    >
                                        Done
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-6 py-3 rounded-full shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 font-medium text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary-400" />
                    {toast}
                </div>
            )}
        </DndContext>
    );
}

function PaletteSection({ title, items }: { title: string, items: any[] }) {
    return (
        <section>
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">{title}</h4>
            <div className="grid grid-cols-2 gap-2">
                 {items.map(item => <PaletteItem key={item.type} {...item} />)}
            </div>
        </section>
    );
}

function PaletteItem({ type, label, icon }: { type: string, label: string, icon: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `palette-${type}`,
        data: { type, label, icon }
    });

    return (
        <div 
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "flex flex-col items-center gap-2 p-3 bg-neutral-50 border border-neutral-100 rounded-xl hover:border-primary-600 hover:bg-white hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group",
                isDragging && "opacity-0"
            )}
        >
            <div className="text-neutral-400 group-hover:text-primary-600 transition-colors">
                {icon}
            </div>
            <span className="text-[10px] font-medium text-neutral-600 truncate w-full text-center">{label}</span>
        </div>
    );
}

function Canvas({ viewMode }: { viewMode: string }) {
    const { components, selectedId, selectComponent } = useBuilderStore();
    const { isOver, setNodeRef } = useDroppable({
        id: 'canvas-dropzone'
    });

    return (
        <div 
            ref={setNodeRef}
            className={cn(
                "bg-white shadow-2xl transition-all duration-300 min-h-[600px] border relative p-8",
                viewMode === 'desktop' && "w-full max-w-5xl",
                viewMode === 'tablet' && "w-[768px]",
                viewMode === 'mobile' && "w-[375px]",
                isOver ? "border-primary-600 bg-primary-50/10" : "border-neutral-200"
            )}
            onClick={(e) => {
                if (e.target === e.currentTarget) selectComponent(null);
            }}
        >
            {/* Canvas Header/Status Bar */}
            <div className="absolute -top-10 left-0 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex gap-4 items-center">
                <span className="bg-neutral-200 px-2 py-0.5 rounded text-neutral-700">Main Screen</span>
                <span className="text-neutral-300">•</span>
                <span>{components.length} Components</span>
            </div>

            {components.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="text-center opacity-40">
                         <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-neutral-200">
                             <Plus className="w-8 h-8 text-neutral-400" />
                         </div>
                         <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Drop zone</p>
                     </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {components.map(c => (
                        <div 
                            key={c.id} 
                            onClick={(e) => {
                                e.stopPropagation();
                                selectComponent(c.id);
                            }}
                            className={cn(
                                "relative group cursor-pointer transition-all rounded-md",
                                selectedId === c.id ? "ring-2 ring-primary-600 ring-offset-4" : "hover:ring-2 hover:ring-neutral-200 hover:ring-offset-4"
                            )}
                        >
                            <RenderComponent component={c} />
                            
                            {selectedId === c.id && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary-600 text-white px-2 py-1 rounded shadow-lg text-[10px] font-bold pointer-events-none z-10 whitespace-nowrap">
                                    {c.label}
                                    <div className="w-2 h-2 bg-primary-600 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                </div>
                            )}

                            {/* Resize handles - Visual only as requested */}
                            {selectedId === c.id && (
                                <>
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-primary-600 rounded-full cursor-nwse-resize z-10"></div>
                                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-primary-600 rounded-full cursor-nesw-resize z-10"></div>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-primary-600 rounded-full cursor-nesw-resize z-10"></div>
                                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-primary-600 rounded-full cursor-nwse-resize z-10"></div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function RenderComponent({ component, preview }: { component: ComponentConfig, preview?: boolean, key?: any }) {
    const { type, properties } = component;

    switch (type) {
        case 'heading':
            const HeadingTag = (properties.size || 'h1') as any;
            return <HeadingTag className={cn(
                "font-bold text-neutral-900 tracking-tight",
                properties.size === 'h1' && "text-4xl",
                properties.size === 'h2' && "text-3xl",
                properties.size === 'h3' && "text-2xl",
            )}>{properties.text || 'Heading'}</HeadingTag>;
        
        case 'text':
            return <p className="text-neutral-600 leading-relaxed">{properties.text || 'Paragraph text content...'}</p>;

        case 'button':
            return (
                <button className={cn(
                    "px-6 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95",
                    properties.style === 'primary' ? "bg-primary-600 text-white hover:bg-primary-700 shadow-primary-200" :
                    properties.style === 'secondary' ? "bg-white border-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-neutral-100" :
                    "bg-error-600 text-white hover:bg-error-700 shadow-error-200"
                )}>
                    {properties.label || 'Button'}
                </button>
            );

        case 'input':
            return (
                <div className="space-y-1.5 w-full">
                    <label className="text-sm font-bold text-neutral-700 flex items-center gap-1">
                        {properties.label || 'Input Label'}
                        {properties.required && <span className="text-error-500">*</span>}
                    </label>
                    <input 
                        type="text" 
                        placeholder={properties.placeholder || 'Enter value...'}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none transition-all"
                        disabled={!preview}
                    />
                </div>
            );

        case 'container':
            return (
                <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 bg-neutral-50/50 flex flex-col items-center justify-center text-center">
                    <Square className="w-8 h-8 text-neutral-300 mb-2" />
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{properties.label || 'Container'}</p>
                </div>
            );

        case 'section':
            return (
                <div className="border-t-2 border-b-2 border-neutral-100 py-12 px-8 flex flex-col items-center justify-center text-center bg-white">
                     <Layers className="w-8 h-8 text-neutral-300 mb-2" />
                     <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Section Wrapper</p>
                </div>
            );

        case 'table':
            return (
                <div className="w-full bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-neutral-700">Data Source: {properties.dataSource || 'None'}</span>
                        <TableIcon className="w-4 h-4 text-neutral-400" />
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50/50">
                            <tr>
                                <th className="px-4 py-2 text-left font-bold text-neutral-500 uppercase text-[10px] tracking-wider">Name</th>
                                <th className="px-4 py-2 text-left font-bold text-neutral-500 uppercase text-[10px] tracking-wider">Email</th>
                                <th className="px-4 py-2 text-left font-bold text-neutral-500 uppercase text-[10px] tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-medium">
                            {[1, 2, 3].map(i => (
                                <tr key={i}>
                                    <td className="px-4 py-3 text-neutral-400 italic">Placeholder row {i}...</td>
                                    <td className="px-4 py-3 text-neutral-400 italic">...</td>
                                    <td className="px-4 py-3 text-neutral-400 italic">...</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

        case 'bar_chart':
            return (
                <div className="w-full h-48 bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
                     <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Sample Data Chart</h4>
                     <ResponsiveContainer width="100%" height="80%">
                        <RechartsBarChart data={CHART_DATA}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" hide />
                            <YAxis hide />
                            <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="value" fill="#1A56DB" radius={[4, 4, 0, 0]} barSize={20} />
                        </RechartsBarChart>
                     </ResponsiveContainer>
                </div>
            );

        default:
            return (
                <div className="p-4 bg-neutral-100 rounded-lg text-neutral-400 text-xs italic">
                    Rendering for {type} component...
                </div>
            );
    }
}

function PropertiesPanel() {
    const { selectedId, components, updateComponent, deleteComponent } = useBuilderStore();
    const { tables } = useSchemaStore();
    
    const selectedComponent = components.find(c => c.id === selectedId);

    if (!selectedComponent) {
        return (
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                    <h3 className="font-bold text-neutral-900 text-sm">Properties</h3>
                    <Settings2 className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <div>
                        <div className="inline-flex p-3 bg-neutral-50 rounded-full mb-4">
                            <MousePointer2 className="w-6 h-6 text-neutral-300" />
                        </div>
                        <p className="text-xs text-neutral-500 px-4">Select an element on the canvas to edit its properties and data bindings.</p>
                    </div>
                </div>
            </div>
        );
    }

    const { type, properties, label } = selectedComponent;

    const handleUpdate = (key: string, value: any) => {
        updateComponent(selectedId!, {
            properties: { ...properties, [key]: value }
        });
    };

    return (
        <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                        {COMPONENT_TYPES.LAYOUT.find(t => t.type === type)?.icon || 
                         COMPONENT_TYPES.INPUTS.find(t => t.type === type)?.icon ||
                         COMPONENT_TYPES.DISPLAY.find(t => t.type === type)?.icon || 
                         <Square className="w-4 h-4" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-neutral-900 text-xs">{label}</h3>
                        <p className="text-[10px] text-neutral-400 font-mono">ID: {selectedId}</p>
                    </div>
                </div>
                <button 
                    onClick={() => deleteComponent(selectedId!)}
                    className="p-1.5 text-neutral-400 hover:text-error-600 hover:bg-error-50 rounded-md transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* General Settings */}
                <section className="space-y-4">
                     <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-2">General</h4>
                     
                     <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-neutral-700 uppercase">Label</label>
                        <input 
                            type="text" 
                            value={properties.label || ''}
                            onChange={(e) => handleUpdate('label', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                        />
                     </div>

                     <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-neutral-700 uppercase leading-none">Visibility</label>
                        <button 
                            onClick={() => handleUpdate('visibility', !properties.visibility)}
                            className={cn(
                                "w-10 h-5 rounded-full transition-all relative p-1",
                                properties.visibility !== false ? "bg-primary-600" : "bg-neutral-200"
                            )}
                        >
                            <div className={cn(
                                "w-3 h-3 bg-white rounded-full transition-all",
                                properties.visibility !== false ? "ml-5" : "ml-0"
                            )}></div>
                        </button>
                     </div>
                </section>

                {/* Component-Specific Settings */}
                <section className="space-y-4">
                     <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-2">Configuration</h4>
                     
                     {type === 'heading' && (
                         <>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Text</label>
                                 <input 
                                     type="text" 
                                     value={properties.text || ''}
                                     onChange={(e) => handleUpdate('text', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                                 />
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Size</label>
                                 <select 
                                     value={properties.size || 'h1'}
                                     onChange={(e) => handleUpdate('size', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                                 >
                                     <option value="h1">H1 - Large</option>
                                     <option value="h2">H2 - Medium</option>
                                     <option value="h3">H3 - Small</option>
                                 </select>
                             </div>
                         </>
                     )}

                     {type === 'button' && (
                         <>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Button Text</label>
                                 <input 
                                     type="text" 
                                     value={properties.label || ''}
                                     onChange={(e) => handleUpdate('label', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                                 />
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Style</label>
                                 <select 
                                     value={properties.style || 'primary'}
                                     onChange={(e) => handleUpdate('style', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                                 >
                                     <option value="primary">Primary</option>
                                     <option value="secondary">Secondary</option>
                                     <option value="danger">Danger</option>
                                 </select>
                             </div>
                         </>
                     )}

                     {type === 'input' && (
                         <>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Placeholder</label>
                                 <input 
                                     type="text" 
                                     value={properties.placeholder || ''}
                                     onChange={(e) => handleUpdate('placeholder', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                                 />
                             </div>
                             <div className="flex items-center justify-between">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Required</label>
                                 <button 
                                     onClick={() => handleUpdate('required', !properties.required)}
                                     className={cn(
                                         "w-10 h-5 rounded-full transition-all relative p-1",
                                         properties.required ? "bg-primary-600" : "bg-neutral-200"
                                     )}
                                 >
                                     <div className={cn(
                                         "w-3 h-3 bg-white rounded-full transition-all",
                                         properties.required ? "ml-5" : "ml-0"
                                     )}></div>
                                 </button>
                             </div>
                         </>
                     )}

                     {type === 'table' && (
                         <div className="space-y-1.5">
                             <label className="text-[11px] font-bold text-neutral-700 uppercase">Data Source</label>
                             <select 
                                 value={properties.dataSource || ''}
                                 onChange={(e) => handleUpdate('dataSource', e.target.value)}
                                 className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                             >
                                 <option value="">Select a table...</option>
                                 {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                             </select>
                         </div>
                     )}
                </section>
            </div>
        </div>
    );
}

function ViewToggle({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "p-2 rounded-md transition-all",
                active ? "bg-white text-primary-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
            )}
        >
            {icon}
        </button>
    );
}
