import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    ChevronRight,
    ChevronLeft,
    ToggleLeft,
    Calendar,
    Upload,
    Heading,
    Image as ImageIcon,
    Table as TableIcon,
    BarChart,
    TrendingUp,
    Tag as TagIcon,
    Square,
    Database,
    Globe,
    GripHorizontal,
    PieChart as PieChartIcon,
    PanelRightClose,
    PanelRightOpen,
    Maximize,
    Rows,
    AlignJustify,
    RotateCcw
} from 'lucide-react';
import { useProjectSettingsStore } from '../../store/projectSettingsStore';
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
import { motion } from 'motion/react';
import { useBuilderStore } from '../../store/builderStore';
import { useAuthStore } from '../../store/authStore';
import { dataService } from '../../services/dataService';
import { handleFirestoreError, OperationType } from '../../services/dataService';
import { db } from '../../lib/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { useSchemaStore } from '../../store/schemaStore';
import { ComponentConfig } from '../../types';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ApplicationsView } from './ApplicationsView';

const COMPONENT_TYPES = {
    LAYOUT: [
        { type: 'container', label: 'Container', icon: <Square className="w-4 h-4" /> },
        { type: 'section', label: 'Section', icon: <Layers className="w-4 h-4" /> },
        { type: 'row', label: 'Row', icon: <Columns2 className="w-4 h-4" /> },
        { type: 'accordion', label: 'Accordion', icon: <AlignJustify className="w-4 h-4" /> },
        { type: 'tabs', label: 'Tabs', icon: <Rows className="w-4 h-4" /> },
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
        { type: 'pie_chart', label: 'Chart (Pie)', icon: <PieChartIcon className="w-4 h-4" /> },
        { type: 'badge', label: 'Badge/Tag', icon: <TagIcon className="w-4 h-4" /> },
    ]
};

const CHART_DATA = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
];

export function AppBuilder({ onEditingAppChange }: { onEditingAppChange?: (id: string | null) => void }) {
    const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile' | 'custom'>('desktop');
    const [customWidth, setCustomWidth] = useState(1200);
    const [activeDragItem, setActiveDragItem] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showPublish, setShowPublish] = useState(false);
    const [showAppSettings, setShowAppSettings] = useState(false);
    const [showManageDatasources, setShowManageDatasources] = useState(false);
    const [publishStatus, setPublishStatus] = useState<'idle' | 'deploying' | 'success'>('idle');
    const [toast, setToast] = useState<string | null>(null);
    const [currentAppData, setCurrentAppData] = useState<any>(null);
    const [formState, setFormState] = useState<Record<string, any>>({});
    const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);

    const { selectedProjectId } = useAuthStore();
    const { 
        components, 
        selectedId, 
        currentAppId,
        addComponent, 
        updateComponent, 
        deleteComponent, 
        selectComponent,
        setCurrentAppId,
        undo,
        redo,
        setComponents,
        moveComponent,
        updateComponentSize,
        setComponentParent
    } = useBuilderStore();

    useEffect(() => {
        if (onEditingAppChange) onEditingAppChange(currentAppId);
    }, [currentAppId, onEditingAppChange]);

    const { tables, restApiConnectors } = useSchemaStore();

    // Unified Datasources helper
    const unifiedDatasources = useMemo(() => {
      return [
        ...tables.map(t => ({ id: t.id, name: t.name, type: 'table' as const })),
        ...restApiConnectors.map(c => ({ id: c.id, name: `${c.name} (API)`, type: 'api' as const }))
      ];
    }, [tables, restApiConnectors]);

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 5 }
    }));

    const showToast = useCallback((message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Derive unique datasources from components
    const usedDatasources = useMemo(() => {
        const ids = new Set<string>();
        components.forEach(c => {
            if (c.properties.dataSource) ids.add(c.properties.dataSource);
        });
        if (currentAppData?.dataSourceId) ids.add(currentAppData.dataSourceId);
        return Array.from(ids).map(id => unifiedDatasources.find(t => t.id === id)).filter(Boolean);
    }, [components, currentAppData, unifiedDatasources]);

    const handleSave = async () => {
        if (!selectedProjectId || !currentAppId) return;
        try {
            await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', currentAppId), {
                id: currentAppId,
                projectId: selectedProjectId,
                components,
                updatedAt: serverTimestamp()
            }, { merge: true });
            showToast('Application saved to cloud');
        } catch (e) {
            console.error(e);
            showToast('Save failed');
        }
    };

    useEffect(() => {
        if (!selectedProjectId || !currentAppId) {
            setComponents([]);
            setCurrentAppData(null);
            return;
        }

        const unsub = onSnapshot(doc(db, 'workspaces', selectedProjectId, 'apps', currentAppId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setComponents(data.components || []);
                setCurrentAppData(data);
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, `workspaces/${selectedProjectId}/apps/${currentAppId}`);
        });
        return () => unsub();
    }, [selectedProjectId, currentAppId, setComponents]);

    const handleUpdateAppSettings = async (updates: any) => {
        if (!selectedProjectId || !currentAppId) return;
        await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', currentAppId), updates, { merge: true });
        showToast('Settings updated');
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
    }, [selectedId, undo, redo, deleteComponent, selectComponent, showToast]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveDragItem(active.data.current);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const overId = String(over.id);
        // Drop onto main canvas
        const isMainCanvas = overId === 'canvas-dropzone';
        // Drop into a container slot: over.id = "slot:PARENTID:SLOTKEY"
        const isSlotDrop = overId.startsWith('slot:');

        if (isMainCanvas || isSlotDrop) {
            const data = active.data.current;
            const type = data?.type;

            if (type) {
                const newComponent: ComponentConfig = {
                    id: `${type}_${Math.random().toString(36).substr(2, 9)}`,
                    type,
                    label: data.label,
                    properties: getDefaultProperties(type),
                    position: isMainCanvas ? { x: 20, y: 20 } : { x: 0, y: 0 },
                    size: {
                        width: type === 'table' || type === 'bar_chart' || type === 'line_chart' || type === 'pie_chart' ? 500 : 280,
                        height: type === 'table' || type === 'bar_chart' || type === 'line_chart' || type === 'pie_chart' ? 300 : 80
                    },
                    parentId: isSlotDrop ? overId.split(':')[1] : null,
                    slotKey: isSlotDrop ? overId.split(':')[2] : null,
                };
                addComponent(newComponent);
            }
        }
    };

    const getDefaultProperties = (type: string) => {
        switch (type) {
            case 'heading': return { text: 'Heading', size: 'h1' };
            case 'text': return { text: 'Paragraph text content...' };
            case 'button': return { label: 'Click Me', style: 'primary', actionType: 'submit' };
            case 'input': return { label: 'Field Label', placeholder: 'Enter value...', required: false };
            case 'select': return { label: 'Dropdown', options: [{ value: '1', label: 'Option 1' }, { value: '2', label: 'Option 2' }] };
            case 'toggle': return { label: 'Toggle', options: ['On', 'Off'] };
            case 'table': return { dataSource: '' };
            default: return {};
        }
    };

    if (!currentAppId) {
        return <ApplicationsView onSelectApp={(id) => setCurrentAppId(id)} />;
    }

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
                <aside className="w-64 border-r flex flex-col shrink-0 transition-colors duration-300" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                    <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Components</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <PaletteSection title="Layout" items={COMPONENT_TYPES.LAYOUT} />
                        <PaletteSection title="Inputs" items={COMPONENT_TYPES.INPUTS} />
                        <PaletteSection title="Display" items={COMPONENT_TYPES.DISPLAY} />
                    </div>
                </aside>

                {/* Canvas Area */}
                <div className="flex-1 flex flex-col overflow-hidden transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
                    {/* Toolbar */}
                    <div className="h-12 border-b flex items-center px-4 justify-between shrink-0 transition-colors duration-300" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setCurrentAppId(null)}
                                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg text-neutral-400 group transition-colors"
                                title="Back to All Applications"
                            >
                                <X className="w-5 h-5 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                            </button>
                            <div className="h-6 w-[1px] bg-neutral-200 dark:bg-slate-800"></div>
                            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg">
                                <ViewToggle active={viewMode === 'desktop'} onClick={() => setViewMode('desktop')} icon={<Monitor className="w-4 h-4" />} title="Desktop (Responsive)" />
                                <ViewToggle active={viewMode === 'tablet'} onClick={() => setViewMode('tablet')} icon={<Tablet className="w-4 h-4" />} title="Tablet (768px)" />
                                <ViewToggle active={viewMode === 'mobile'} onClick={() => setViewMode('mobile')} icon={<Smartphone className="w-4 h-4" />} title="Mobile (375px)" />
                                <ViewToggle active={viewMode === 'custom'} onClick={() => setViewMode('custom')} icon={<Maximize className="w-4 h-4" />} title="Custom Size" />
                            </div>
                            {viewMode === 'custom' && (
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-neutral-400 font-bold">W:</span>
                                    <input
                                        type="number"
                                        value={customWidth}
                                        onChange={(e) => setCustomWidth(Math.max(200, Number(e.target.value)))}
                                        className="w-16 px-2 py-1 text-xs font-mono border border-neutral-200 rounded-md outline-none"
                                        style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <span className="text-[10px] text-neutral-400">px</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => setShowAppSettings(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-md transition-all group"
                            >
                                <Settings2 className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Settings
                            </button>
                             <button 
                                onClick={handleSave}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            >
                                <Layout className="w-4 h-4" /> Save
                            </button>
                            <button 
                                onClick={() => setShowPreview(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-md transition-colors"
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
                        <Canvas viewMode={viewMode} appData={currentAppData} customWidth={customWidth} />
                    </div>
                </div>

                {/* Right Properties Panel */}
                <aside className={cn(
                  "border-l flex flex-col shrink-0 transition-all duration-300",
                  propertiesPanelOpen ? "w-72" : "w-12"
                )} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                    {propertiesPanelOpen && (
                      <PropertiesPanel dataSourceId={currentAppData?.dataSourceId} unifiedDatasources={unifiedDatasources} />
                    )}
                    {/* Collapse button at bottom, matching left sidebar style */}
                    <div className="mt-auto p-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900"
                            title={propertiesPanelOpen ? 'Collapse panel' : 'Expand panel'}
                        >
                            {propertiesPanelOpen ? <PanelRightClose className="w-4 h-4 shrink-0" /> : <PanelRightOpen className="w-4 h-4 shrink-0" />}
                            {propertiesPanelOpen && <span className="text-xs font-bold">Collapse</span>}
                        </button>
                    </div>
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
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden border border-neutral-200 dark:border-slate-800 transition-colors duration-300">
                        <div className="h-14 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 bg-neutral-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-neutral-900 dark:text-white">Application Preview</h3>
                            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-neutral-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-8 transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
                             <div className="shadow-xl min-h-full max-w-6xl mx-auto rounded-lg border overflow-hidden" style={{ background: currentAppData?.bgColor || 'var(--bg-surface)', borderColor: 'var(--border-color)', minHeight: 800 }}>
                                 {currentAppData?.headerText && (
                                     <div className="w-full px-6 py-3 flex items-center shrink-0"
                                          style={{ background: currentAppData?.headerColor || 'var(--color-primary)' }}>
                                         <span className="font-bold text-white text-sm">{currentAppData.headerText}</span>
                                     </div>
                                 )}
                                 {components.length === 0 ? (
                                     <div className="flex items-center justify-center py-20">
                                         <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Preview is empty. Add components to the canvas.</p>
                                     </div>
                                 ) : (
                                     <div className="relative w-full" style={{ minHeight: 800 }}>
                                         {components.filter(c => !c.parentId).map(c => (
                                             <div
                                                key={c.id}
                                                style={{
                                                    position: 'absolute',
                                                    left: c.position?.x || 0,
                                                    top: c.position?.y || 0,
                                                    width: c.size?.width || 'auto',
                                                    height: c.size?.height || 'auto',
                                                }}
                                             >
                                                 <RenderComponent 
                                                    component={c} 
                                                    preview 
                                                    formState={formState}
                                                    onFormUpdate={(field, val) => setFormState(prev => ({...prev, [field]: val}))}
                                                    appContext={currentAppData}
                                                 />
                                             </div>
                                         ))}
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
                                    <div className="w-16 h-16 bg-success-50 dark:bg-emerald-950/30 text-success-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Application Published Successfully</h3>
                                    <p className="text-neutral-500 dark:text-slate-400 mb-6 font-medium">Your app is now live and ready for production.</p>
                                    
                                    <div className="bg-neutral-50 dark:bg-slate-800 p-4 rounded-xl border border-neutral-200 dark:border-slate-700 mb-8 flex items-center justify-between">
                                        <span className="text-sm font-mono text-neutral-600 dark:text-slate-300">https://nexus.app/my-crm-app</span>
                                        <button onClick={() => showToast('URL copied')} className="text-primary-600 dark:text-primary-400 text-xs font-bold hover:underline">Copy URL</button>
                                    </div>

                                    <button 
                                        onClick={() => setShowPublish(false)}
                                        className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary-200 dark:shadow-primary-900/20 hover:bg-primary-700 transition-all"
                                    >
                                        Done
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showAppSettings && (() => {
                const { settings: ps } = useProjectSettingsStore.getState();
                const hasCustomBg = currentAppData?.bgColor && currentAppData.bgColor !== ps.applicationBackgroundColour;
                const hasCustomHeader = currentAppData?.headerText && currentAppData.headerText !== ps.headingText;
                const hasCustomHeaderColor = currentAppData?.headerColor && currentAppData.headerColor !== ps.headingBackgroundColour;

                return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm shadow-2xl" onClick={() => setShowAppSettings(false)}></div>
                    <div className="relative bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
                                    <Settings2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-neutral-900 dark:text-white">Application Settings</h3>
                                    <p className="text-xs text-neutral-500">Configure this application — overrides inherit from Project Settings.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAppSettings(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>

                        <div className="p-8 max-h-[75vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-8">
                                {/* ── Column 1 ── */}
                                <div className="space-y-5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 border-b border-neutral-100 dark:border-neutral-800 pb-2">Identity & Appearance</p>

                                    {/* Application Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Application Name</label>
                                        <input type="text" value={currentAppData?.name || ''}
                                            onChange={(e) => handleUpdateAppSettings({ name: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-[#0F172A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white transition-all" />
                                    </div>

                                    {/* App Header Text */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">App Header Text</label>
                                            {hasCustomHeader && (
                                                <button onClick={() => handleUpdateAppSettings({ headerText: ps.headingText })} className="text-[9px] font-bold flex items-center gap-0.5 text-amber-500 hover:text-amber-600">
                                                    <RotateCcw className="w-2.5 h-2.5" /> Reset
                                                </button>
                                            )}
                                        </div>
                                        <input type="text" value={currentAppData?.headerText || ''}
                                            onChange={(e) => handleUpdateAppSettings({ headerText: e.target.value })}
                                            placeholder={ps.headingText || 'Leave blank to hide header'}
                                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-[#0F172A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white transition-all" />
                                    </div>

                                    {/* Background Colour */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Background Colour</label>
                                            {hasCustomBg && (
                                                <button onClick={() => handleUpdateAppSettings({ bgColor: ps.applicationBackgroundColour })} className="text-[9px] font-bold flex items-center gap-0.5 text-amber-500 hover:text-amber-600">
                                                    <RotateCcw className="w-2.5 h-2.5" /> Reset
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={currentAppData?.bgColor || ps.applicationBackgroundColour}
                                                onChange={(e) => handleUpdateAppSettings({ bgColor: e.target.value })}
                                                className="w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer p-0.5 bg-transparent" />
                                            <input type="text" value={currentAppData?.bgColor || ''}
                                                onChange={(e) => handleUpdateAppSettings({ bgColor: e.target.value })}
                                                placeholder={ps.applicationBackgroundColour}
                                                className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-[#0F172A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white" />
                                        </div>
                                        {!hasCustomBg && <p className="text-[9px] text-neutral-400 italic">Using Project Setting default</p>}
                                    </div>

                                    {/* Header Background Colour */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Header Background Colour</label>
                                            {hasCustomHeaderColor && (
                                                <button onClick={() => handleUpdateAppSettings({ headerColor: ps.headingBackgroundColour })} className="text-[9px] font-bold flex items-center gap-0.5 text-amber-500 hover:text-amber-600">
                                                    <RotateCcw className="w-2.5 h-2.5" /> Reset
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={currentAppData?.headerColor || ps.headingBackgroundColour}
                                                onChange={(e) => handleUpdateAppSettings({ headerColor: e.target.value })}
                                                className="w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer p-0.5 bg-transparent" />
                                            <input type="text" value={currentAppData?.headerColor || ''}
                                                onChange={(e) => handleUpdateAppSettings({ headerColor: e.target.value })}
                                                placeholder={ps.headingBackgroundColour}
                                                className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-[#0F172A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white" />
                                        </div>
                                        {!hasCustomHeaderColor && <p className="text-[9px] text-neutral-400 italic">Using Project Setting default</p>}
                                    </div>
                                </div>

                                {/* ── Column 2 ── */}
                                <div className="space-y-5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 border-b border-neutral-100 dark:border-neutral-800 pb-2">Data & Operation</p>

                                    {/* Data Connectivity */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Data Connectivity</label>
                                        <button onClick={() => setShowManageDatasources(true)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-[#0F172A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold hover:border-primary-600 transition-all dark:text-white group text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white dark:bg-[#1E293B] rounded-lg shadow-sm border border-neutral-100 dark:border-neutral-800 group-hover:scale-110 transition-transform">
                                                    <Database className="w-4 h-4 text-primary-600" />
                                                </div>
                                                <div>
                                                    <div className="text-xs">Manage Application Datasources</div>
                                                    <div className="text-[10px] text-neutral-400 font-medium">Using {usedDatasources.length} table{usedDatasources.length !== 1 ? 's' : ''}</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-neutral-300" />
                                        </button>
                                    </div>

                                    {/* Operation Mode */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Operation Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'view_only', label: 'View Only' },
                                                { id: 'add', label: 'Add Records' },
                                                { id: 'update', label: 'Update Records' },
                                                { id: 'delete', label: 'Delete Records' },
                                            ].map(mode => (
                                                <button key={mode.id} type="button" onClick={() => handleUpdateAppSettings({ mode: mode.id })}
                                                    className={cn("p-2.5 rounded-xl border-2 text-[10px] font-bold transition-all",
                                                        currentAppData?.mode === mode.id
                                                            ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-200/50"
                                                            : "bg-white dark:bg-[#0F172A] border-neutral-100 dark:border-neutral-800 text-neutral-400")}>
                                                    {mode.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Key Fields */}
                                    {currentAppData?.dataSourceId && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Key Fields (for matching)</label>
                                            <div className="flex flex-wrap gap-2">
                                                {tables.find(t => t.id === currentAppData.dataSourceId)?.fields.map(f => (
                                                    <button key={f.id} type="button"
                                                        onClick={() => {
                                                            const keys = currentAppData.keyFields || [];
                                                            handleUpdateAppSettings({ keyFields: keys.includes(f.id) ? keys.filter((id: string) => id !== f.id) : [...keys, f.id] });
                                                        }}
                                                        className={cn("px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all",
                                                            (currentAppData.keyFields || []).includes(f.id)
                                                                ? "bg-primary-600 border-primary-600 text-white"
                                                                : "bg-neutral-50 dark:bg-[#0F172A] border-neutral-200 dark:border-neutral-800 text-neutral-500")}>
                                                        {f.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 mt-6 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                                <button onClick={() => setShowAppSettings(false)}
                                    className="px-10 py-3 bg-neutral-900 dark:bg-primary-600 text-white font-bold rounded-2xl hover:bg-neutral-800 dark:hover:bg-primary-500 transition-all active:scale-95 shadow-lg">
                                    Save & Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            {showManageDatasources && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md" onClick={() => setShowManageDatasources(false)}></div>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-[#0F172A]/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-600">
                                    <Database className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-neutral-900 dark:text-white">Active Datasources</h3>
                                    <p className="text-[10px] font-bold text-neutral-500 tracking-tight uppercase">Connected tables for this app</p>
                                </div>
                            </div>
                            <button onClick={() => setShowManageDatasources(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            {tables.length === 0 ? (
                                <div className="text-center py-12">
                                    <Database className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                                    <p className="text-sm text-neutral-400 italic font-medium">No datasources found in project.</p>
                                </div>
                            ) : (
                                tables.map(table => (
                                    <div key={table?.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-[#0F172A] rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-primary-600 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1E293B] shadow-sm flex items-center justify-center text-primary-600 border border-neutral-100 dark:border-neutral-800">
                                                {unifiedDatasources.find(t => t.id === table.id)?.type === 'api' ? <Globe className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-neutral-900 dark:text-white">
                                                    {table?.name}
                                                    {unifiedDatasources.find(t => t.id === table.id)?.type === 'api' && <span className="ml-2 text-[8px] bg-primary-100 text-primary-600 p-0.5 rounded font-black uppercase tracking-tight">API</span>}
                                                </div>
                                                <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                                                    {table?.fields?.length || 0} Fields • {table?.id === currentAppData?.dataSourceId ? 'Primary Source' : (usedDatasources.some(u => u?.id === table.id) ? 'Linked Source' : 'Available Source')}
                                                </div>
                                            </div>
                                        </div>
                                        {table?.id !== currentAppData?.dataSourceId && (
                                            <button 
                                                onClick={() => handleUpdateAppSettings({ dataSourceId: table?.id })}
                                                className="text-[10px] font-black text-primary-600 uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                            >Set as Primary</button>
                                        )}
                                    </div>
                                ))
                            )}

                            <button 
                                onClick={() => setShowManageDatasources(false)}
                                className="w-full py-4 mt-6 bg-neutral-900 dark:bg-[#0F172A] text-white font-bold rounded-2xl hover:bg-neutral-800 dark:hover:bg-neutral-800 transition-all active:scale-95"
                            >Close</button>
                        </div>
                    </motion.div>
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

// ──────────────────────────────────────────────────────
// SlotDropZone — a droppable area inside container components
// ──────────────────────────────────────────────────────
function SlotDropZone({ parentId, slotKey, label }: { parentId: string; slotKey: string; label?: string }) {
    const { isOver, setNodeRef } = useDroppable({ id: `slot:${parentId}:${slotKey}` });
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[60px] w-full rounded-lg border-2 border-dashed transition-colors flex items-center justify-center text-[10px] font-bold uppercase tracking-widest",
                isOver ? "border-primary-400 bg-primary-50/30" : "border-neutral-200 bg-neutral-50/20"
            )}
            style={{ color: isOver ? 'var(--color-primary)' : 'var(--text-secondary)' }}
        >
            {isOver ? '↓ Drop here' : (label || 'Drag component here')}
        </div>
    );
}

// ──────────────────────────────────────────────────────
// ChildComponentsRenderer — renders child components of a container
// ──────────────────────────────────────────────────────
function ChildComponentsRenderer({
    parentId,
    slotKey,
    preview,
    formState,
    onFormUpdate,
    appContext,
}: {
    parentId: string;
    slotKey: string;
    preview?: boolean;
    formState?: Record<string, any>;
    onFormUpdate?: (field: string, val: any) => void;
    appContext?: any;
}) {
    const { components, selectedId, selectComponent, moveComponent, updateComponentSize } = useBuilderStore();
    const children = components.filter(c => c.parentId === parentId && c.slotKey === slotKey);

    if (children.length === 0) {
        if (preview) return null;
        return <SlotDropZone parentId={parentId} slotKey={slotKey} />;
    }

    return (
        <div className="relative" style={{ minHeight: 60 }}>
            {!preview && <SlotDropZone parentId={parentId} slotKey={slotKey} label="+ Drop more" />}
            <div className="space-y-2 mt-1">
                {children.map(child => (
                    <div
                        key={child.id}
                        className={cn(
                            "relative rounded border transition-all",
                            !preview && (selectedId === child.id ? "border-primary-400 ring-1 ring-primary-400" : "border-transparent hover:border-neutral-300")
                        )}
                        style={{ height: child.size?.height || 'auto', minHeight: 40 }}
                        onMouseDown={preview ? undefined : (e) => { e.stopPropagation(); selectComponent(child.id); }}
                    >
                        <RenderComponent
                            component={child}
                            preview={preview}
                            formState={formState}
                            onFormUpdate={onFormUpdate}
                            appContext={appContext}
                        />
                        {!preview && selectedId === child.id && (
                            <div className="absolute -top-5 left-0 bg-primary-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                {child.label}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
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
                "flex flex-col items-center gap-2 p-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-100 dark:border-slate-700 rounded-xl hover:border-primary-600 dark:hover:border-primary-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group",
                isDragging && "opacity-0"
            )}
        >
            <div className="text-neutral-400 dark:text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {icon}
            </div>
            <span className="text-[10px] font-medium text-neutral-600 dark:text-slate-400 truncate w-full text-center">{label}</span>
        </div>
    );
}

function Canvas({ viewMode, appData, customWidth }: { viewMode: string, appData?: any, customWidth?: number }) {
    const { components, selectedId, selectComponent, moveComponent, updateComponentSize } = useBuilderStore();
    const { isOver, setNodeRef } = useDroppable({
        id: 'canvas-dropzone'
    });

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });

    const [resizingId, setResizingId] = useState<string | null>(null);
    const [initialSize, setInitialSize] = useState({ w: 0, h: 0 });

    const handleMouseMove = useCallback((e: MouseEvent) => {
      if (draggingId) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        moveComponent(draggingId, Math.max(0, initialPos.x + dx), Math.max(0, initialPos.y + dy));
      }
      if (resizingId) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        updateComponentSize(resizingId, Math.max(50, initialSize.w + dx), Math.max(30, initialSize.h + dy));
      }
    }, [draggingId, resizingId, dragStart, initialPos, initialSize, moveComponent, updateComponentSize]);

    const handleMouseUp = useCallback(() => {
      setDraggingId(null);
      setResizingId(null);
    }, []);

    useEffect(() => {
      if (draggingId || resizingId) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      }
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [draggingId, resizingId, handleMouseMove, handleMouseUp]);

    return (
        <div 
            ref={setNodeRef}
            className={cn(
                "shadow-2xl transition-all duration-300 min-h-[800px] border relative overflow-hidden",
                viewMode === 'desktop' && "w-full",
                viewMode === 'tablet' && "w-[768px]",
                viewMode === 'mobile' && "w-[375px]",
                viewMode === 'custom' ? "" : "",
                isOver ? "border-primary-600" : ""
            )}
            style={{
                background: isOver ? undefined : (appData?.bgColor || 'var(--bg-surface)'),
                borderColor: isOver ? undefined : 'var(--border-color)',
                ...(viewMode === 'custom' ? { width: customWidth } : {}),
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) selectComponent(null);
            }}
        >
            {/* App Header band */}
            {appData?.headerText && (
                <div
                    className="w-full px-6 py-3 flex items-center shrink-0 select-none"
                    style={{ background: appData?.headerColor || 'var(--color-primary)' }}
                >
                    <span className="font-bold text-white text-sm">{appData.headerText}</span>
                </div>
            )}

            {/* Canvas meta bar */}
            <div className="absolute -top-10 left-0 text-[10px] font-bold text-neutral-500 dark:text-slate-500 uppercase tracking-widest flex gap-4 items-center">
                <span className="bg-neutral-200 dark:bg-slate-800 px-2 py-0.5 rounded text-neutral-700 dark:text-slate-300">Free Layout Canvas</span>
                <span className="text-neutral-300 dark:text-slate-700">•</span>
                <span>{components.length} Components</span>
                {selectedId && <span className="text-blue-400">• Drag the <GripHorizontal className="w-3 h-3 inline" /> handle to reposition</span>}
            </div>

            <div className="p-8">
            {components.filter(c => !c.parentId).length === 0 && components.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="text-center opacity-40">
                         <div className="w-16 h-16 bg-neutral-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-neutral-200 dark:border-slate-700">
                             <Plus className="w-8 h-8 text-neutral-400 dark:text-slate-500" />
                         </div>
                         <p className="text-neutral-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Drop zone</p>
                         <p className="text-[10px] text-neutral-400 mt-2">Drag components from the palette to start building</p>
                     </div>
                </div>
            ) : (
                <div className="relative w-full h-full">
                    {components.filter(c => !c.parentId).map(c => (
                        <div 
                            key={c.id} 
                            style={{
                              position: 'absolute',
                              left: c.position?.x || 0,
                              top: c.position?.y || 0,
                              width: c.size?.width || 'auto',
                              height: c.size?.height || 'auto',
                              zIndex: selectedId === c.id ? 50 : 10
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                selectComponent(c.id);
                            }}
                            className={cn(
                                "group cursor-default transition-shadow rounded-md",
                                selectedId === c.id ? "ring-2 ring-primary-600 ring-offset-4 shadow-xl" : "hover:ring-2 hover:ring-neutral-200 hover:ring-offset-4"
                            )}
                        >
                            {/* Dedicated drag handle — always visible when hovered/selected */}
                            <div
                                title="Drag to reposition"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    selectComponent(c.id);
                                    setDraggingId(c.id);
                                    setDragStart({ x: e.clientX, y: e.clientY });
                                    setInitialPos({ x: c.position?.x || 0, y: c.position?.y || 0 });
                                }}
                                className={cn(
                                    "absolute -top-6 left-1/2 -translate-x-1/2 h-5 px-2 bg-neutral-700 dark:bg-slate-600 rounded-full flex items-center gap-1 cursor-move z-20 select-none transition-all",
                                    "opacity-0 group-hover:opacity-100",
                                    selectedId === c.id && "opacity-100 bg-primary-600"
                                )}
                            >
                                <GripHorizontal className="w-3 h-3 text-white" />
                            </div>

                            <RenderComponent component={c} />
                            
                            {selectedId === c.id && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary-600 text-white px-2 py-1 rounded shadow-lg text-[10px] font-bold pointer-events-none z-10 whitespace-nowrap">
                                    {c.label}
                                    <div className="w-2 h-2 bg-primary-600 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                </div>
                            )}

                            {/* Resize handle */}
                            {selectedId === c.id && (
                                <div 
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setResizingId(c.id);
                                    setDragStart({ x: e.clientX, y: e.clientY });
                                    setInitialSize({ w: c.size?.width || 200, h: c.size?.height || 80 });
                                  }}
                                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border-2 border-primary-600 rounded-full cursor-nwse-resize z-10 hover:scale-125 transition-transform shadow-sm flex items-center justify-center"
                                  title="Drag to resize"
                                ></div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            </div>{/* /p-8 */}
        </div>
    );
}

function RenderComponent({ 
    component, 
    preview, 
    formState, 
    onFormUpdate, 
    appContext 
}: { 
    component: ComponentConfig, 
    preview?: boolean, 
    formState?: Record<string, any>,
    onFormUpdate?: (field: string, val: any) => void,
    appContext?: any,
    key?: string
}) {
    const { type, properties, size } = component;
    const { selectedProjectId } = useAuthStore();

    switch (type) {
        case 'heading':
            const HeadingTag = (properties.size || 'h1') as any;
            return <HeadingTag className={cn(
                "font-bold text-neutral-900 dark:text-white tracking-tight leading-tight",
                properties.size === 'h1' && "text-4xl",
                properties.size === 'h2' && "text-3xl",
                properties.size === 'h3' && "text-2xl",
            )}>{properties.text || 'Heading'}</HeadingTag>;
        
        case 'text':
            return <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm">{properties.text || 'Paragraph text content...'}</p>;

        case 'button':
            const handleClick = async () => {
                if (!preview) return;
                
                if (properties.actionType === 'url' && properties.url) {
                    window.open(properties.url, '_blank');
                } else if (properties.actionType === 'application' && properties.targetAppId) {
                    useBuilderStore.getState().setCurrentAppId(properties.targetAppId);
                } else if (properties.actionType === 'cancel') {
                    useBuilderStore.getState().setCurrentAppId(null);
                } else if (properties.actionType === 'submit') {
                    if (!appContext || !appContext.dataSourceId || !selectedProjectId) {
                        alert('Application not fully configured for data operations');
                        return;
                    }
                    
                    const tableId = appContext.dataSourceId;
                    const mode = appContext.mode || 'view_only';
                    const keyFields = appContext.keyFields || [];

                    try {
                        if (mode === 'add') {
                            await dataService.addRecord(selectedProjectId, tableId, formState || {});
                            alert('Record added successfully');
                        } else if (mode === 'update') {
                            if (keyFields.length === 0) {
                                alert('No key fields defined for update mode');
                                return;
                            }
                            const missingKeys = keyFields.filter(kf => formState?.[kf] === undefined || formState?.[kf] === '');
                            if (missingKeys.length > 0) {
                                alert(`Please fill in required key field(s): ${missingKeys.join(', ')}`);
                                return;
                            }
                            const q = query(
                                collection(db, 'workspaces', selectedProjectId, 'tableData', tableId, 'rows'),
                                ...keyFields.map(kf => where(kf, '==', formState![kf]))
                            );
                            const snap = await getDocs(q);
                            if (snap.empty) {
                                alert('No matching record found to update');
                            } else {
                                for (const docRef of snap.docs) {
                                    await dataService.updateRecord(selectedProjectId, tableId, docRef.id, formState || {});
                                }
                                alert(`Updated ${snap.size} record(s)`);
                            }
                        } else if (mode === 'delete') {
                            if (keyFields.length === 0) {
                                alert('No key fields defined for delete mode');
                                return;
                            }
                            const missingKeys = keyFields.filter(kf => formState?.[kf] === undefined || formState?.[kf] === '');
                            if (missingKeys.length > 0) {
                                alert(`Please fill in required key field(s): ${missingKeys.join(', ')}`);
                                return;
                            }
                             const q = query(
                                collection(db, 'workspaces', selectedProjectId, 'tableData', tableId, 'rows'),
                                ...keyFields.map(kf => where(kf, '==', formState![kf]))
                            );
                            const snap = await getDocs(q);
                            if (snap.empty) {
                                alert('No matching record found to delete');
                            } else {
                                for (const docRef of snap.docs) {
                                    await dataService.deleteRecord(selectedProjectId, tableId, docRef.id);
                                }
                                alert(`Deleted ${snap.size} record(s)`);
                            }
                        } else {
                            alert('Application is in view-only mode');
                        }
                    } catch (e) {
                        console.error(e);
                        alert('Operation failed');
                    }
                }
            };
            return (
                <button 
                    onClick={handleClick}
                    style={properties.style === 'custom' ? {
                        width: '100%', height: '100%',
                        backgroundColor: properties.customBg || '#334155',
                        color: properties.customText || '#ffffff',
                        '--btn-hover-bg': properties.customHoverBg || properties.customBg || '#1e293b',
                        '--btn-active-bg': properties.customActiveBg || properties.customBg || '#0f172a',
                    } as any : { width: '100%', height: '100%' }}
                    onMouseEnter={(e) => { if (properties.style === 'custom' && properties.customHoverBg) (e.currentTarget as HTMLElement).style.backgroundColor = properties.customHoverBg; }}
                    onMouseLeave={(e) => { if (properties.style === 'custom') (e.currentTarget as HTMLElement).style.backgroundColor = properties.customBg || '#334155'; }}
                    onMouseDown={(e) => { if (properties.style === 'custom' && properties.customActiveBg) (e.currentTarget as HTMLElement).style.backgroundColor = properties.customActiveBg; }}
                    onMouseUp={(e) => { if (properties.style === 'custom') (e.currentTarget as HTMLElement).style.backgroundColor = properties.customBg || '#334155'; }}
                    className={cn(
                        "rounded-xl font-bold transition-all shadow-md active:scale-95",
                        properties.style === 'primary' ? "bg-primary-600 text-white hover:bg-primary-700 shadow-primary-200" :
                        properties.style === 'secondary' ? "bg-white border-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-neutral-100 dark:bg-[#1A1A1A] dark:border-neutral-800 dark:text-neutral-300" :
                        properties.style === 'custom' ? "" :
                        "bg-error-600 text-white hover:bg-error-700 shadow-error-200"
                    )}
                >
                    <div className="flex items-center justify-center gap-2">
                        {properties.label || 'Button'}
                        {!preview && properties.actionType && (
                            <span className="text-[8px] opacity-50 uppercase bg-black/10 px-1 rounded">{properties.actionType}</span>
                        )}
                    </div>
                </button>
            );

        case 'toggle':
            const toggleOptions = properties.options || ['Off', 'On'];
            // Use fieldMapping if set, else fall back to component id so toggle state is always tracked
            const toggleKey = properties.fieldMapping || component.id;
            const currentToggleVal = formState?.[toggleKey] ?? toggleOptions[0];
            
            return (
                <div className="space-y-1.5 w-full h-full">
                    <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{properties.label || 'Toggle'}</label>
                    <div className="flex bg-neutral-100 dark:bg-[#1E293B] p-1 rounded-xl w-full">
                        {toggleOptions.map((opt: string, idx: number) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    if (preview) {
                                        onFormUpdate?.(toggleKey, opt);
                                    }
                                }}
                                className={cn(
                                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                    currentToggleVal === opt ? "bg-white dark:bg-[#334155] shadow-sm text-primary-600 dark:text-primary-400" : "text-neutral-400"
                                )}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            );

        case 'date':
            return (
                <div className="space-y-1.5 w-full h-full flex flex-col">
                    <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        {properties.label || 'Date'}
                        {properties.required && <span className="text-error-500">*</span>}
                    </label>
                    <input
                        type="date"
                        value={properties.fieldMapping && formState ? (formState[properties.fieldMapping] || '') : (formState?.[component.id] || '')}
                        onChange={(e) => {
                            if (preview) {
                                const key = properties.fieldMapping || component.id;
                                onFormUpdate?.(key, e.target.value);
                            }
                        }}
                        disabled={!preview}
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none transition-all dark:text-white cursor-pointer"
                    />
                </div>
            );

        case 'file':
            return (
                <div className="space-y-1.5 w-full h-full flex flex-col">
                    <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                        {properties.label || 'File Upload'}
                    </label>
                    <label className={cn(
                        "flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl transition-all cursor-pointer text-center px-4 py-4",
                        preview
                            ? "border-neutral-300 dark:border-neutral-700 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 cursor-pointer"
                            : "border-neutral-200 dark:border-neutral-800 cursor-default opacity-60"
                    )}>
                        <Upload className="w-6 h-6 text-neutral-400" />
                        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                            {formState?.[component.id]
                                ? (formState[component.id] as File).name
                                : 'Click to browse or drag a file here'}
                        </span>
                        {properties.accept && (
                            <span className="text-[10px] text-neutral-400">{properties.accept}</span>
                        )}
                        <input
                            type="file"
                            accept={properties.accept || undefined}
                            disabled={!preview}
                            className="hidden"
                            onChange={(e) => {
                                if (preview && e.target.files?.[0]) {
                                    onFormUpdate?.(component.id, e.target.files[0]);
                                }
                            }}
                        />
                    </label>
                </div>
            );

        case 'select':
            const selectOptions = properties.options || [{ value: '1', label: 'Option 1' }];
            return (
                <div className="space-y-1.5 w-full h-full flex flex-col">
                    <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{properties.label || 'Dropdown'}</label>
                    <div className="relative flex-1">
                        <select 
                            value={formState ? (formState[properties.fieldMapping || component.id] ?? '') : ''}
                            onChange={(e) => { if (preview) onFormUpdate?.(properties.fieldMapping || component.id, e.target.value); }}
                            className="w-full h-full px-4 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none appearance-none dark:text-white"
                            disabled={!preview}
                        >
                            <option value="">Select option...</option>
                            {selectOptions.map((opt: any, idx: number) => (
                                <option key={idx} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    </div>
                </div>
            );

        case 'input':
            return (
                <div className="space-y-1.5 w-full h-full flex flex-col">
                    <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                            {properties.label || 'Input Label'}
                            {properties.required && <span className="text-error-500">*</span>}
                        </div>
                    </label>
                    <input 
                        type="text" 
                        value={formState ? (formState[properties.fieldMapping || component.id] ?? '') : ''}
                        onChange={(e) => { if (preview) onFormUpdate?.(properties.fieldMapping || component.id, e.target.value); }}
                        placeholder={properties.placeholder || 'Enter value...'}
                        className="w-full h-full px-4 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none transition-all dark:text-white"
                        disabled={!preview}
                    />
                </div>
            );

        case 'container':
            return (
                <div className="w-full h-full border-2 border-dashed rounded-xl p-3 flex flex-col gap-2" style={{ borderColor: 'var(--color-primary)', background: 'var(--bg-primary)', opacity: 0.9 }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-secondary)' }}>{properties.label || 'Container'}</p>
                    <div className="flex-1">
                        <ChildComponentsRenderer
                            parentId={component.id} slotKey="main"
                            preview={preview} formState={formState}
                            onFormUpdate={onFormUpdate} appContext={appContext}
                        />
                    </div>
                </div>
            );

        case 'section':
            return (
                <div className="w-full h-full border-2 rounded-xl p-3 flex flex-col gap-2" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest shrink-0 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <Layers className="w-3 h-3" /> {properties.label || 'Section'}
                    </p>
                    <div className="flex-1">
                        <ChildComponentsRenderer
                            parentId={component.id} slotKey="main"
                            preview={preview} formState={formState}
                            onFormUpdate={onFormUpdate} appContext={appContext}
                        />
                    </div>
                </div>
            );

        case 'table': {
            return <DataTableComponent component={component} properties={properties} appContext={appContext} preview={preview} />;
        }

        case 'bar_chart': {
            const barColor = properties.chartColor || '#1A56DB';
            const bgColor = properties.chartBg || undefined;
            return (
                <div className="w-full h-full border rounded-xl p-4 shadow-sm flex flex-col" style={{ background: bgColor || 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                     <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 shrink-0" style={{ color: 'var(--text-secondary)' }}>Bar Chart{properties.dataSource ? ` · ${properties.dataSource}` : ''}</h4>
                     <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={CHART_DATA}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                              <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                              <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} barSize={15} />
                          </RechartsBarChart>
                      </ResponsiveContainer>
                     </div>
                </div>
            );
        }

        case 'line_chart': {
            const lineColor = properties.chartColor || '#1A56DB';
            const lbg = properties.chartBg || undefined;
            return (
                <div className="w-full h-full border rounded-xl p-4 shadow-sm flex flex-col" style={{ background: lbg || 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                     <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 shrink-0" style={{ color: 'var(--text-secondary)' }}>Line Chart{properties.dataSource ? ` · ${properties.dataSource}` : ''}</h4>
                     <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={CHART_DATA}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                              <XAxis dataKey="name" hide />
                              <YAxis hide />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                              <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} dot={{ fill: lineColor, r: 3 }} />
                          </LineChart>
                      </ResponsiveContainer>
                     </div>
                </div>
            );
        }

        case 'pie_chart': {
            const pieColors = properties.chartColors ? properties.chartColors.split(',').map((c: string) => c.trim()) : ['#1A56DB','#0EA5E9','#34D399','#F59E0B','#EF4444'];
            const pbg = properties.chartBg || undefined;
            return (
                <div className="w-full h-full border rounded-xl p-4 shadow-sm flex flex-col" style={{ background: pbg || 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                     <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 shrink-0" style={{ color: 'var(--text-secondary)' }}>Pie Chart{properties.dataSource ? ` · ${properties.dataSource}` : ''}</h4>
                     <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={CHART_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name }) => name}>
                                  {CHART_DATA.map((_, idx) => <Cell key={idx} fill={pieColors[idx % pieColors.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          </PieChart>
                      </ResponsiveContainer>
                     </div>
                </div>
            );
        }

        case 'accordion': {
            const [openIdx, setOpenIdx] = (React as any).useState(0);
            const sections = properties.sections || [{ title: 'Section 1' }, { title: 'Section 2' }];
            return (
                <div className="w-full h-full flex flex-col gap-1 overflow-auto">
                    {sections.map((sec: any, idx: number) => (
                        <div key={idx} className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                            <button
                                className="w-full flex items-center justify-between px-4 py-3 text-left font-bold text-sm"
                                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                onClick={() => (preview || !preview) && setOpenIdx(openIdx === idx ? -1 : idx)}
                            >
                                {sec.title}
                                <ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", openIdx === idx && "rotate-180")} style={{ color: 'var(--color-primary)' }} />
                            </button>
                            {(openIdx === idx || !preview) && (
                                <div className="px-3 py-3 space-y-2" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)', minHeight: preview ? undefined : 60 }}>
                                    <ChildComponentsRenderer
                                        parentId={component.id} slotKey={`section-${idx}`}
                                        preview={preview} formState={formState}
                                        onFormUpdate={onFormUpdate} appContext={appContext}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        case 'tabs': {
            const [activeTab, setActiveTab] = (React as any).useState(0);
            const tabList = properties.tabs || [{ label: 'Tab 1' }, { label: 'Tab 2' }];
            return (
                <div className="w-full h-full flex flex-col overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex border-b shrink-0 overflow-x-auto" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                        {tabList.map((tab: any, idx: number) => (
                            <button
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                className={cn("px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0", activeTab === idx ? "border-current" : "border-transparent")}
                                style={{ color: activeTab === idx ? 'var(--color-primary)' : 'var(--text-secondary)' }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-3 overflow-auto" style={{ background: 'var(--bg-surface)', minHeight: 80 }}>
                        <ChildComponentsRenderer
                            parentId={component.id} slotKey={`tab-${activeTab}`}
                            preview={preview} formState={formState}
                            onFormUpdate={onFormUpdate} appContext={appContext}
                        />
                    </div>
                </div>
            );
        }

        default:
            return (
                <div className="p-4 rounded-lg text-xs italic" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                    {type} component
                </div>
            );
    }
}

// ─── Live Data Table Component ───────────────────────────────────────────────
function DataTableComponent({ component, properties, appContext, preview }: { component: any; properties: any; appContext?: any; preview?: boolean }) {
    const { tables } = useSchemaStore();
    const { selectedProjectId } = useAuthStore();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});

    // Determine the data source: component-level override or app-level
    const dataSourceId = properties.dataSource || appContext?.dataSourceId || '';
    const sourceTable = tables.find(t => t.id === dataSourceId);

    // Visible fields: filtered selection or all table fields
    const allFields = sourceTable?.fields || [];
    const visibleFieldIds: string[] = properties.visibleFields?.length ? properties.visibleFields : allFields.map((f: any) => f.id);
    const visibleFields = allFields.filter((f: any) => visibleFieldIds.includes(f.id));

    // Component-level filter rules
    const filterRules: { field: string; op: string; value: string }[] = properties.tableFilters || [];

    useEffect(() => {
        if (!dataSourceId || !selectedProjectId) return;
        setLoading(true);
        const unsubFn = onSnapshot(
            query(collection(db, 'workspaces', selectedProjectId, 'tableData', dataSourceId, 'rows')),
            (snap: any) => {
                setRows(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            () => setLoading(false)
        );
        return () => unsubFn();
    }, [dataSourceId, selectedProjectId]);

    // Apply filters
    const filteredRows = rows.filter((row: any) => {
        // Component-level static filters
        const passStatic = filterRules.every((r: any) => {
            if (!r.field || !r.value) return true;
            const cell = String(row[r.field] ?? '');
            if (r.op === '==') return cell === r.value;
            if (r.op === 'contains') return cell.toLowerCase().includes(String(r.value).toLowerCase());
            if (r.op === '>') return parseFloat(cell) > parseFloat(r.value);
            if (r.op === '<') return parseFloat(cell) < parseFloat(r.value);
            return true;
        });
        // Runtime search filters
        const passRuntime = Object.entries(filterValues).every(([field, val]) =>
            !val || String(row[field] ?? '').toLowerCase().includes(String(val).toLowerCase())
        );
        return passStatic && passRuntime;
    });

    const tableButtons: any[] = properties.rowButtons || [];
    const startBtns = tableButtons.filter((b: any) => b.position === 'start');
    const endBtns = tableButtons.filter((b: any) => b.position === 'end');

    if (!dataSourceId || !sourceTable) {
        return (
            <div className="w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-center p-4" style={{ borderColor: 'var(--border-color)' }}>
                <Database className="w-8 h-8 opacity-20" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>No Data Source Selected</p>
                <p className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>Set a datasource in App Settings</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full border rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="border-b px-4 py-2 flex items-center justify-between shrink-0 gap-2" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <span className="text-[10px] font-black uppercase flex items-center gap-1.5 shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    <Database className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
                    {sourceTable.name}
                    <span className="font-normal opacity-60">({filteredRows.length} rows)</span>
                </span>
                {/* Runtime search per visible field */}
                {preview && properties.enableSearch && (
                    <input
                        placeholder="Search…"
                        onChange={(e) => {
                            const v = e.target.value;
                            const m: Record<string, string> = {};
                            visibleFields.forEach((f: any) => { m[f.name] = v; });
                            setFilterValues(m);
                        }}
                        className="text-[11px] px-2 py-1 rounded-lg border outline-none max-w-[160px]"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    />
                )}
            </div>
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-20 gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium">Loading…</span>
                    </div>
                ) : (
                    <table className="w-full text-[11px]">
                        <thead className="sticky top-0" style={{ background: 'var(--bg-primary)' }}>
                            <tr>
                                {startBtns.length > 0 && <th className="px-3 py-2 w-px" />}
                                {visibleFields.map((f: any) => (
                                    <th key={f.id} className="px-4 py-2 text-left font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{f.name}</th>
                                ))}
                                {endBtns.length > 0 && <th className="px-3 py-2 w-px" />}
                            </tr>
                        </thead>
                        <tbody className="divide-y font-medium" style={{ borderColor: 'var(--border-color)' }}>
                            {filteredRows.length === 0 ? (
                                <tr><td colSpan={visibleFields.length + startBtns.length + endBtns.length} className="px-4 py-8 text-center text-[10px] uppercase tracking-widest font-bold opacity-40" style={{ color: 'var(--text-secondary)' }}>No records found</td></tr>
                            ) : filteredRows.map((row, i) => (
                                <tr key={row.id || i} className="hover:opacity-80 transition-opacity">
                                    {startBtns.length > 0 && (
                                        <td className="px-2 py-1.5">
                                            <div className="flex gap-1">
                                                {startBtns.map((btn: any, bi: number) => (
                                                    <button key={bi} className="px-2 py-1 text-[10px] font-bold rounded text-white whitespace-nowrap"
                                                        style={{ background: btn.color || 'var(--color-primary)' }}>{btn.label || 'Action'}</button>
                                                ))}
                                            </div>
                                        </td>
                                    )}
                                    {visibleFields.map((f: any) => (
                                        <td key={f.id} className="px-4 py-2 max-w-[180px] truncate" style={{ color: 'var(--text-primary)' }}>
                                            {String(row[f.name] ?? '')}
                                        </td>
                                    ))}
                                    {endBtns.length > 0 && (
                                        <td className="px-2 py-1.5">
                                            <div className="flex gap-1 justify-end">
                                                {endBtns.map((btn: any, bi: number) => (
                                                    <button key={bi} className="px-2 py-1 text-[10px] font-bold rounded text-white whitespace-nowrap"
                                                        style={{ background: btn.color || 'var(--color-primary)' }}>{btn.label || 'Action'}</button>
                                                ))}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function PropertiesPanel({ dataSourceId, unifiedDatasources }: { dataSourceId?: string, unifiedDatasources: any[] }) {
    const { selectedId, components, updateComponent, deleteComponent, currentAppId } = useBuilderStore();
    const { tables, restApiConnectors } = useSchemaStore();
    const { selectedProjectId } = useAuthStore();
    const [allApps, setAllApps] = useState<any[]>([]);
    
    useEffect(() => {
        if (!selectedProjectId) return;
        const q = query(collection(db, 'workspaces', selectedProjectId, 'apps'));
        const unsub = onSnapshot(q, (snapshot) => {
            setAllApps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, `workspaces/${selectedProjectId}/apps`);
        });
        return () => unsub();
    }, [selectedProjectId]);

    const selectedComponent = components.find(c => c.id === selectedId);
    
    // Support for both table fields and API schema
    const availableFields = useMemo(() => {
      if (!dataSourceId) return [];
      const table = tables.find(t => t.id === dataSourceId);
      if (table) return table.fields;
      
      const api = restApiConnectors.find(c => c.id === dataSourceId);
      if (api && api.schema) {
        try {
            const schemaObj = typeof api.schema === 'string' ? JSON.parse(api.schema) : api.schema;
            return schemaObj.fields || [];
        } catch (e) {
            return [];
        }
      }
      return [];
    }, [dataSourceId, tables, restApiConnectors]);

    if (!selectedComponent) {
        return (
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Properties</h3>
                    <Settings2 className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="flex-1 flex items-center justify-center p-8 text-center bg-neutral-50/30">
                    <div>
                        <div className="inline-flex p-3 bg-white border border-neutral-100 rounded-2xl shadow-sm mb-4">
                            <MousePointer2 className="w-6 h-6 text-neutral-300" />
                        </div>
                        <p className="text-[11px] font-medium text-neutral-400 px-4 leading-relaxed">Select an element on the canvas to configure its layout, data bindings, and interaction rules.</p>
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
                     
                     {/* Data Binding - New Section */}
                     {['input', 'select', 'toggle', 'date'].includes(type) && (
                         <div className="space-y-4 p-3 bg-primary-50 rounded-xl border border-primary-100 animate-in fade-in slide-in-from-top-2 duration-200">
                             <div className="flex items-center gap-2 mb-1">
                                 <Database className="w-3 h-3 text-primary-600" />
                                 <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Field Mapping</label>
                             </div>
                             <div className="space-y-1.5">
                                 <select 
                                     value={properties.fieldMapping || ''}
                                     onChange={(e) => {
                                         const field = availableFields.find(f => f.name === e.target.value);
                                         updateComponent(selectedId!, {
                                             properties: { 
                                                 ...properties, 
                                                 fieldMapping: e.target.value,
                                                 label: field ? field.name : properties.label 
                                             }
                                         });
                                     }}
                                     className="w-full px-3 py-2 bg-white border border-primary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none font-bold text-primary-900"
                                 >
                                     <option value="">Manual Input</option>
                                     {availableFields.map(f => (
                                         <option key={f.id} value={f.name}>
                                             {f.name} ({f.type})
                                         </option>
                                     ))}
                                 </select>
                                 <p className="text-[9px] text-primary-400 font-medium italic">
                                     {dataSourceId ? `Connected to ${unifiedDatasources.find(s => s.id === dataSourceId)?.name || 'Source'}` : 'No datasource connected to this app'}
                                 </p>
                             </div>
                         </div>
                     )}

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
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Action</label>
                                 <select 
                                     value={properties.actionType || 'submit'}
                                     onChange={(e) => handleUpdate('actionType', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none font-bold"
                                 >
                                     <option value="url">External URL</option>
                                     <option value="application">Navigate to App</option>
                                     <option value="submit">Submit Form</option>
                                     <option value="cancel">Cancel/Close</option>
                                 </select>
                             </div>
                             
                             {properties.actionType === 'url' && (
                                 <div className="space-y-1.5 p-2 bg-neutral-50 rounded-lg border border-neutral-200 animate-in slide-in-from-top-2">
                                     <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Target URL</label>
                                     <input 
                                         type="text" 
                                         placeholder="https://example.com"
                                         value={properties.url || ''}
                                         onChange={(e) => handleUpdate('url', e.target.value)}
                                         className="w-full px-2 py-1.5 text-xs bg-white border border-neutral-200 rounded outline-none"
                                     />
                                 </div>
                             )}

                             {properties.actionType === 'application' && (
                                 <div className="space-y-1.5 p-2 bg-neutral-50 rounded-lg border border-neutral-200 animate-in slide-in-from-top-2">
                                     <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Application</label>
                                     <select 
                                         value={properties.targetAppId || ''}
                                         onChange={(e) => handleUpdate('targetAppId', e.target.value)}
                                         className="w-full px-2 py-1.5 text-xs bg-white border border-neutral-200 rounded outline-none"
                                     >
                                         <option value="">Choose application...</option>
                                         {allApps.filter(app => app.id !== currentAppId).map(app => (
                                             <option key={app.id} value={app.id}>{app.name}</option>
                                         ))}
                                     </select>
                                 </div>
                             )}

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
                                     <option value="custom">Custom Colours</option>
                                 </select>
                             </div>
                             {properties.style === 'custom' && (
                                 <div className="space-y-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 animate-in slide-in-from-top-2">
                                     <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Custom Colour States</p>
                                     {[
                                         { key: 'customBg', label: 'Default Background' },
                                         { key: 'customText', label: 'Default Text' },
                                         { key: 'customHoverBg', label: 'Hover Background' },
                                         { key: 'customActiveBg', label: 'Clicked / Active' },
                                     ].map(({ key, label }) => (
                                         <div key={key} className="flex items-center justify-between gap-2">
                                             <label className="text-[10px] font-bold text-neutral-500 min-w-0 flex-1 truncate">{label}</label>
                                             <div className="flex items-center gap-1.5 shrink-0">
                                                 <input
                                                     type="color"
                                                     value={properties[key] || '#000000'}
                                                     onChange={(e) => handleUpdate(key, e.target.value)}
                                                     className="w-7 h-7 rounded cursor-pointer border border-neutral-200 p-0.5 bg-transparent"
                                                 />
                                                 <input
                                                     type="text"
                                                     value={properties[key] || ''}
                                                     onChange={(e) => handleUpdate(key, e.target.value)}
                                                     placeholder="#000000"
                                                     className="w-20 px-1.5 py-1 text-[10px] font-mono bg-white border border-neutral-200 rounded outline-none"
                                                 />
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
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

                     {type === 'table' && (() => {
                         const selectedDataSourceId = properties.dataSource || dataSourceId || '';
                         const sourceTable = tables.find(t => t.id === selectedDataSourceId);
                         const tableFields = sourceTable?.fields || [];
                         const visibleFieldIds: string[] = properties.visibleFields?.length ? properties.visibleFields : tableFields.map((f: any) => f.id);
                         const tableFilters: any[] = properties.tableFilters || [];

                         return (
                         <div className="space-y-4">
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Data Source</label>
                                 <select 
                                     value={properties.dataSource || ''}
                                     onChange={(e) => handleUpdate('dataSource', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-600/20 outline-none dark:text-white"
                                 >
                                     <option value="">Select a datasource...</option>
                                     {tables.length > 0 && <optgroup label="Tables">{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                                     {restApiConnectors.length > 0 && <optgroup label="REST APIs">{restApiConnectors.map(c => <option key={c.id} value={c.id}>{c.name} (API)</option>)}</optgroup>}
                                 </select>
                             </div>

                             {/* Field Visibility */}
                             {tableFields.length > 0 && (
                                 <div className="space-y-2">
                                     <div className="flex items-center justify-between">
                                         <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Visible Fields</label>
                                         <div className="flex gap-2">
                                             <button onClick={() => handleUpdate('visibleFields', tableFields.map((f: any) => f.id))} className="text-[9px] font-bold uppercase tracking-wider hover:underline" style={{ color: 'var(--color-primary)' }}>All</button>
                                             <span className="text-[9px] text-neutral-400">/</span>
                                             <button onClick={() => handleUpdate('visibleFields', [])} className="text-[9px] font-bold uppercase tracking-wider hover:underline text-neutral-400">None</button>
                                         </div>
                                     </div>
                                     <div className="space-y-1 max-h-36 overflow-y-auto rounded-lg border border-neutral-200 dark:border-slate-700">
                                         {tableFields.map((f: any) => {
                                             const isVisible = visibleFieldIds.includes(f.id);
                                             return (
                                                 <label key={f.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800">
                                                     <input
                                                         type="checkbox"
                                                         checked={isVisible}
                                                         onChange={() => {
                                                             const next = isVisible
                                                                 ? visibleFieldIds.filter((id: string) => id !== f.id)
                                                                 : [...visibleFieldIds, f.id];
                                                             handleUpdate('visibleFields', next);
                                                         }}
                                                         className="w-3.5 h-3.5 rounded"
                                                         style={{ accentColor: 'var(--color-primary)' }}
                                                     />
                                                     <span className="text-xs font-medium dark:text-slate-300 truncate">{f.name}</span>
                                                 </label>
                                             );
                                         })}
                                     </div>
                                 </div>
                             )}

                             {/* Column Filters */}
                             {tableFields.length > 0 && (
                                 <div className="space-y-2">
                                     <div className="flex items-center justify-between">
                                         <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Filters</label>
                                         <button
                                             onClick={() => handleUpdate('tableFilters', [...tableFilters, { field: '', op: 'contains', value: '' }])}
                                             className="text-[10px] font-bold hover:underline"
                                             style={{ color: 'var(--color-primary)' }}
                                         >+ Add Filter</button>
                                     </div>
                                     {tableFilters.map((flt: any, fi: number) => (
                                         <div key={fi} className="p-2 border border-neutral-200 dark:border-slate-700 rounded-lg space-y-1.5 bg-neutral-50 dark:bg-slate-800 relative">
                                             <button
                                                 onClick={() => handleUpdate('tableFilters', tableFilters.filter((_: any, i: number) => i !== fi))}
                                                 className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] leading-none"
                                             >✕</button>
                                             <select value={flt.field} onChange={(e) => { const nf = [...tableFilters]; nf[fi] = { ...nf[fi], field: e.target.value }; handleUpdate('tableFilters', nf); }}
                                                 className="w-full px-2 py-1 text-xs rounded border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none dark:text-white">
                                                 <option value="">Field…</option>
                                                 {tableFields.map((f: any) => <option key={f.id} value={f.name}>{f.name}</option>)}
                                             </select>
                                             <div className="flex gap-1">
                                                 <select value={flt.op} onChange={(e) => { const nf = [...tableFilters]; nf[fi] = { ...nf[fi], op: e.target.value }; handleUpdate('tableFilters', nf); }}
                                                     className="flex-1 px-1 py-1 text-xs rounded border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none dark:text-white">
                                                     <option value="==">equals</option>
                                                     <option value="contains">contains</option>
                                                     <option value=">">greater than</option>
                                                     <option value="<">less than</option>
                                                 </select>
                                                 <input value={flt.value} onChange={(e) => { const nf = [...tableFilters]; nf[fi] = { ...nf[fi], value: e.target.value }; handleUpdate('tableFilters', nf); }}
                                                     placeholder="value" className="flex-1 px-2 py-1 text-xs rounded border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none dark:text-white" />
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}

                             {/* Enable Search */}
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="checkbox" checked={!!properties.enableSearch} onChange={(e) => handleUpdate('enableSearch', e.target.checked)}
                                     className="w-3.5 h-3.5 rounded" style={{ accentColor: 'var(--color-primary)' }} />
                                 <span className="text-xs font-medium dark:text-slate-300">Enable Search Bar</span>
                             </label>

                             {/* Row Buttons */}
                             <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                     <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Row Buttons</label>
                                     <button
                                         onClick={() => handleUpdate('rowButtons', [...(properties.rowButtons || []), { label: 'Action', position: 'end', color: '#1A56DB' }])}
                                         className="text-[10px] font-bold hover:underline" style={{ color: 'var(--color-primary)' }}
                                     >+ Add Button</button>
                                 </div>
                                 {(properties.rowButtons || []).map((btn: any, bi: number) => (
                                     <div key={bi} className="p-2 border border-neutral-200 dark:border-slate-700 rounded-lg space-y-2 bg-neutral-50 dark:bg-slate-800">
                                         <div className="flex gap-1">
                                             <input placeholder="Label" value={btn.label || ''}
                                                 onChange={(e) => { const nb = [...(properties.rowButtons || [])]; nb[bi] = { ...nb[bi], label: e.target.value }; handleUpdate('rowButtons', nb); }}
                                                 className="flex-1 px-2 py-1 text-xs border border-neutral-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 outline-none dark:text-white" />
                                             <select value={btn.position || 'end'}
                                                 onChange={(e) => { const nb = [...(properties.rowButtons || [])]; nb[bi] = { ...nb[bi], position: e.target.value }; handleUpdate('rowButtons', nb); }}
                                                 className="px-1 py-1 text-xs border border-neutral-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 outline-none dark:text-white">
                                                 <option value="start">Start</option>
                                                 <option value="end">End</option>
                                             </select>
                                             <input type="color" value={btn.color || '#1A56DB'}
                                                 onChange={(e) => { const nb = [...(properties.rowButtons || [])]; nb[bi] = { ...nb[bi], color: e.target.value }; handleUpdate('rowButtons', nb); }}
                                                 className="w-7 h-7 rounded cursor-pointer border border-neutral-200 p-0.5 bg-transparent" />
                                             <button onClick={() => handleUpdate('rowButtons', (properties.rowButtons || []).filter((_: any, i: number) => i !== bi))} className="text-rose-400 hover:text-rose-600">
                                                 <Minus className="w-3 h-3" />
                                             </button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         );
                     })()}

                     {['bar_chart', 'line_chart', 'pie_chart'].includes(type) && (
                         <div className="space-y-3">
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Data Source</label>
                                 <select value={properties.dataSource || ''} onChange={(e) => handleUpdate('dataSource', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none">
                                     <option value="">Select a datasource...</option>
                                     {tables.length > 0 && <optgroup label="Tables">{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                                     {restApiConnectors.filter(c => c.method === 'GET').length > 0 && <optgroup label="REST APIs (GET)">{restApiConnectors.filter(c => c.method === 'GET').map(c => <option key={c.id} value={c.id}>{c.name} (API)</option>)}</optgroup>}
                                 </select>
                             </div>
                             {type !== 'pie_chart' ? (
                                 <>
                                     <div className="space-y-1.5">
                                         <label className="text-[11px] font-bold text-neutral-700 uppercase">Chart Colour</label>
                                         <div className="flex items-center gap-2">
                                             <input type="color" value={properties.chartColor || '#1A56DB'} onChange={(e) => handleUpdate('chartColor', e.target.value)}
                                                 className="w-8 h-8 rounded cursor-pointer border border-neutral-200 p-0.5 bg-transparent" />
                                             <input type="text" value={properties.chartColor || ''} onChange={(e) => handleUpdate('chartColor', e.target.value)}
                                                 placeholder="#1A56DB" className="flex-1 px-2 py-1.5 text-xs font-mono bg-neutral-50 border border-neutral-200 rounded outline-none" />
                                         </div>
                                     </div>
                                 </>
                             ) : (
                                 <div className="space-y-1.5">
                                     <label className="text-[11px] font-bold text-neutral-700 uppercase">Pie Colours (comma-separated)</label>
                                     <input type="text" value={properties.chartColors || '#1A56DB,#0EA5E9,#34D399,#F59E0B,#EF4444'}
                                         onChange={(e) => handleUpdate('chartColors', e.target.value)}
                                         placeholder="#1A56DB,#0EA5E9,..." className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-200 rounded-lg outline-none" />
                                 </div>
                             )}
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Chart Background</label>
                                 <div className="flex items-center gap-2">
                                     <input type="color" value={properties.chartBg || '#ffffff'} onChange={(e) => handleUpdate('chartBg', e.target.value)}
                                         className="w-8 h-8 rounded cursor-pointer border border-neutral-200 p-0.5 bg-transparent" />
                                     <input type="text" value={properties.chartBg || ''} onChange={(e) => handleUpdate('chartBg', e.target.value)}
                                         placeholder="transparent" className="flex-1 px-2 py-1.5 text-xs font-mono bg-neutral-50 border border-neutral-200 rounded outline-none" />
                                     {properties.chartBg && <button onClick={() => handleUpdate('chartBg', '')} className="text-neutral-300 hover:text-rose-500 text-xs">✕</button>}
                                 </div>
                             </div>
                         </div>
                     )}

                     {type === 'accordion' && (
                         <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Sections</label>
                                 <button onClick={() => handleUpdate('sections', [...(properties.sections || []), { title: `Section ${(properties.sections?.length || 0) + 1}`, content: 'Content...' }])}
                                     className="text-[10px] font-bold text-primary-600 hover:underline">+ Add</button>
                             </div>
                             {(properties.sections || [{ title: 'Section 1', content: 'Content...' }]).map((sec: any, si: number) => (
                                 <div key={si} className="p-2 border border-neutral-200 rounded-lg space-y-1.5 bg-neutral-50">
                                     <div className="flex gap-1 items-center">
                                         <input value={sec.title} placeholder="Title"
                                             onChange={(e) => { const ns = [...(properties.sections || [])]; ns[si] = { ...ns[si], title: e.target.value }; handleUpdate('sections', ns); }}
                                             className="flex-1 px-2 py-1 text-xs border border-neutral-200 rounded bg-white outline-none font-bold" />
                                         <button onClick={() => handleUpdate('sections', (properties.sections || []).filter((_: any, i: number) => i !== si))} className="text-rose-400 hover:text-rose-600"><Minus className="w-3 h-3" /></button>
                                     </div>
                                     <textarea value={sec.content} placeholder="Content"
                                         onChange={(e) => { const ns = [...(properties.sections || [])]; ns[si] = { ...ns[si], content: e.target.value }; handleUpdate('sections', ns); }}
                                         className="w-full px-2 py-1 text-xs border border-neutral-200 rounded bg-white outline-none resize-none h-14" />
                                 </div>
                             ))}
                         </div>
                     )}

                     {type === 'tabs' && (
                         <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Tabs</label>
                                 <button onClick={() => handleUpdate('tabs', [...(properties.tabs || []), { label: `Tab ${(properties.tabs?.length || 0) + 1}`, content: 'Content...' }])}
                                     className="text-[10px] font-bold text-primary-600 hover:underline">+ Add</button>
                             </div>
                             {(properties.tabs || [{ label: 'Tab 1', content: 'Content' }]).map((tab: any, ti: number) => (
                                 <div key={ti} className="p-2 border border-neutral-200 rounded-lg space-y-1.5 bg-neutral-50">
                                     <div className="flex gap-1 items-center">
                                         <input value={tab.label} placeholder="Tab Label"
                                             onChange={(e) => { const nt = [...(properties.tabs || [])]; nt[ti] = { ...nt[ti], label: e.target.value }; handleUpdate('tabs', nt); }}
                                             className="flex-1 px-2 py-1 text-xs border border-neutral-200 rounded bg-white outline-none font-bold" />
                                         <button onClick={() => handleUpdate('tabs', (properties.tabs || []).filter((_: any, i: number) => i !== ti))} className="text-rose-400 hover:text-rose-600"><Minus className="w-3 h-3" /></button>
                                     </div>
                                     <textarea value={tab.content} placeholder="Content"
                                         onChange={(e) => { const nt = [...(properties.tabs || [])]; nt[ti] = { ...nt[ti], content: e.target.value }; handleUpdate('tabs', nt); }}
                                         className="w-full px-2 py-1 text-xs border border-neutral-200 rounded bg-white outline-none resize-none h-14" />
                                 </div>
                             ))}
                         </div>
                     )}

                     {type === 'toggle' && (
                         <div className="space-y-4">
                              <div className="space-y-1.5">
                                 <label className="text-[11px] font-bold text-neutral-700 uppercase">Options (comma separated)</label>
                                 <input 
                                     type="text" 
                                     placeholder="Option 1, Option 2, Option 3"
                                     value={(properties.options || []).join(', ')}
                                     onChange={(e) => handleUpdate('options', e.target.value.split(',').map(s => s.trim()))}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none"
                                 />
                                 <p className="text-[9px] text-neutral-500 italic">If &gt; 2 options, this will render as a segmented control.</p>
                              </div>
                         </div>
                     )}

                     {type === 'select' && (
                         <div className="space-y-4">
                              <label className="text-[11px] font-bold text-neutral-700 uppercase">Dropdown Options</label>
                              <div className="space-y-2">
                                  {(properties.options || []).map((opt: any, idx: number) => (
                                      <div key={idx} className="flex gap-1">
                                          <input 
                                              placeholder="Label"
                                              value={opt.label || ''}
                                              onChange={(e) => {
                                                  const newOpts = [...(properties.options || [])];
                                                  newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                                                  handleUpdate('options', newOpts);
                                              }}
                                              className="flex-[2] px-2 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded outline-none"
                                          />
                                          <input 
                                              placeholder="Value"
                                              value={opt.value || ''}
                                              onChange={(e) => {
                                                  const newOpts = [...(properties.options || [])];
                                                  newOpts[idx] = { ...newOpts[idx], value: e.target.value };
                                                  handleUpdate('options', newOpts);
                                              }}
                                              className="flex-1 px-2 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded outline-none"
                                          />
                                          <button 
                                              onClick={() => {
                                                  const newOpts = (properties.options || []).filter((_: any, i: number) => i !== idx);
                                                  handleUpdate('options', newOpts);
                                              }}
                                              className="p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                                          >
                                              <Minus className="w-3 h-3" />
                                          </button>
                                      </div>
                                  ))}
                                  <button 
                                      onClick={() => {
                                          const newOpts = [...(properties.options || []), { label: '', value: '' }];
                                          handleUpdate('options', newOpts);
                                      }}
                                      className="w-full py-1.5 text-[10px] font-bold text-primary-600 border border-dashed border-primary-200 rounded-lg hover:bg-primary-50 transition-colors uppercase tracking-widest"
                                  >Add Option</button>
                              </div>
                         </div>
                     )}
                </section>
            </div>
        </div>
    );
}

function ViewToggle({ active, onClick, icon, title }: { active: boolean; onClick: () => void; icon: React.ReactNode; title?: string }) {
    return (
        <button 
            onClick={onClick}
            title={title}
            className={cn(
                "p-2 rounded-md transition-all",
                active ? "bg-white text-primary-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
            )}
        >
            {icon}
        </button>
    );
}
