import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    GripVertical,
    PieChart as PieChartIcon,
    PanelRightClose,
    PanelRightOpen,
    Maximize,
    Rows,
    AlignJustify,
    Search,
    RotateCcw,
    ArrowLeft,
    RotateCw,
    Cloud,
    Keyboard,
    AlertTriangle,
    ChevronsUp,
    ChevronsDown,
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
import { AppFieldMapper, buildParamUrl } from './AppFieldMapper';
import { useWorkspaceStore } from '../../store/workspaceStore';
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
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const isInitialLoad = useRef(true);
    const justSaved = useRef(false);
    const [previewFormState, setPreviewFormState] = useState<Record<string, any>>({});
    const [showPublish, setShowPublish] = useState(false);
    const [showAppSettings, setShowAppSettings] = useState(false);
    const [showManageDatasources, setShowManageDatasources] = useState(false);
    const [publishStatus, setPublishStatus] = useState<'idle' | 'deploying' | 'success'>('idle');
    const [toast, setToast] = useState<string | null>(null);
    const [currentAppData, setCurrentAppData] = useState<any>(null);
    const [allApps, setAllApps] = useState<any[]>([]);
    const [formState, setFormState] = useState<Record<string, any>>({});
    const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);

    const { selectedProjectId } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { settings: ps } = useProjectSettingsStore();

    const workspaceSlug = React.useMemo(() => {
        const name = currentWorkspace?.name || selectedProjectId || 'workspace';
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }, [currentWorkspace, selectedProjectId]);
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
        history,
        historyIndex,
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

    const showToast = useCallback((message: string, _type?: string) => {
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
            setIsDirty(false);
            justSaved.current = true;
            setTimeout(() => { justSaved.current = false; }, 500);
            showToast('Application saved to cloud');
        } catch (e) {
            console.error(e);
            showToast('Save failed');
        }
    };

    // Track unsaved changes when components mutate
    useEffect(() => {
        if (isInitialLoad.current || justSaved.current) return;
        if (currentAppId) setIsDirty(true);
    }, [components]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!selectedProjectId || !currentAppId) {
            setComponents([]);
            setCurrentAppData(null);
            return;
        }

        const unsub = onSnapshot(doc(db, 'workspaces', selectedProjectId, 'apps', currentAppId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                isInitialLoad.current = true;
                if (justSaved.current) {
                    justSaved.current = false;
                    isInitialLoad.current = false;
                    setComponents(data.components || []);
                    isInitialLoad.current = false;
                    return;
                }
                setComponents(data.components || []);
                setCurrentAppData(data);
                // Defer clearing the flag so the dirty useEffect sees it
                setTimeout(() => { isInitialLoad.current = false; }, 0);
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
    // Listen for toast events from nested components (e.g. RenderComponent submit handler)
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.msg) showToast(detail.msg, detail.type || 'info');
        };
        window.addEventListener('nexus-toast', handler);
        return () => window.removeEventListener('nexus-toast', handler);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                if (e.shiftKey) redo();
                else undo();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
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
                // Compute drop position relative to the canvas inner area (p-8 = 32px padding)
                let dropX = 20, dropY = 20;
                if (isMainCanvas) {
                    const canvasEl = (window as any).__nexusCanvasRef as HTMLDivElement | null;
                    if (canvasEl && (event as any).activatorEvent) {
                        const rect = canvasEl.getBoundingClientRect();
                        const ae = (event as any).activatorEvent as PointerEvent;
                        const delta = (event as any).delta as { x: number; y: number };
                        const pointerX = ae.clientX + (delta?.x || 0);
                        const pointerY = ae.clientY + (delta?.y || 0);
                        // Subtract canvas origin and the 32px (p-8) inner padding
                        dropX = Math.max(0, Math.round(pointerX - rect.left - 32));
                        dropY = Math.max(0, Math.round(pointerY - rect.top - 32));
                    }
                }
                const newComponent: ComponentConfig = {
                    id: `${type}_${Math.random().toString(36).substr(2, 9)}`,
                    type,
                    label: data.label,
                    properties: getDefaultProperties(type),
                    position: isMainCanvas ? { x: dropX, y: dropY } : { x: 0, y: 0 },
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
            case 'image': return { src: '', alt: '', fit: 'cover' };
            case 'badge': return { label: 'Badge', tags: [{ label: 'New' }, { label: 'Active' }], variant: 'solid', color: '#1A56DB', textColor: '#ffffff', size: 'md' };
            default: return {};
        }
    };

    if (!currentAppId) {
        return <ApplicationsView onSelectApp={(id) => setCurrentAppId(id)} />;
    }

    const handlePublish = async () => {
        setShowPublish(true);
        setPublishStatus('deploying');
        if (selectedProjectId && currentAppId) {
            try {
                // Always save latest components first so publishedComponents matches current state
                await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', currentAppId), {
                    id: currentAppId,
                    projectId: selectedProjectId,
                    components,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                // Save the workspace slug so URL lookups work
                await setDoc(doc(db, 'workspaces', selectedProjectId), { slug: workspaceSlug }, { merge: true });
                // Publish the app — snapshot components at this moment
                await setDoc(doc(db, 'workspaces', selectedProjectId, 'apps', currentAppId), {
                    published: true,
                    publishedUrl: `/${workspaceSlug}/${currentAppId}`,
                    workspaceSlug,
                    publishedAt: serverTimestamp(),
                    publishedComponents: JSON.parse(JSON.stringify(components)),
                    updatedAt: serverTimestamp()
                }, { merge: true });
                setIsDirty(false);
                setPublishStatus('success');
            } catch(e) {
                console.error('Publish error', e);
                setPublishStatus('idle');
                setShowPublish(false);
                showToast('Publish failed — please try again');
            }
        } else {
            setPublishStatus('idle');
            setShowPublish(false);
        }
    };

    return (
        <DndContext 
            sensors={sensors} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
        >
            <div className="flex-1 flex overflow-hidden">
                {/* Left Palette */}
                <LeftPalette />

                {/* Canvas Area */}
                <div className="flex-1 flex flex-col overflow-hidden transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
                    {/* Toolbar */}
                    <div className="h-12 border-b flex items-center px-4 justify-between shrink-0 transition-colors duration-300" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => isDirty ? setShowUnsavedWarning(true) : setCurrentAppId(null)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                title="Back to Applications list"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Applications</span>
                            </button>
                            <div className="h-6 w-[1px] bg-neutral-200 dark:bg-slate-800"></div>
                            {/* Undo / Redo */}
                            <button onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)"
                                className={cn("p-1.5 rounded-lg transition-colors", historyIndex > 0 ? "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:text-neutral-900" : "text-neutral-200 dark:text-slate-700 cursor-not-allowed")}>
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Shift+Z)"
                                className={cn("p-1.5 rounded-lg transition-colors", historyIndex < history.length - 1 ? "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:text-neutral-900" : "text-neutral-200 dark:text-slate-700 cursor-not-allowed")}>
                                <RotateCw className="w-4 h-4" />
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
                                <Settings2 className="w-4 h-4 group-hover:rotate-90 transition-transform" /> App Settings
                            </button>
                             <button 
                                onClick={handleSave}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            >
                                <Cloud className="w-4 h-4" /> Save
                            </button>
                            {/* I-02: Persistent save-state indicator */}
                            {isDirty ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 select-none" title="You have unsaved changes">
                                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Unsaved changes
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 select-none">
                                <Cloud className="w-3 h-3" /> Saved
                              </span>
                            )}
                            <button 
                                onClick={() => setShowPreview(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            >
                                <Play className="w-4 h-4" /> Preview
                            </button>
                            <button 
                                onClick={handlePublish}
                                className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white rounded-xl active:scale-95 hover:opacity-90 transition-all"
                                style={{ background: 'var(--color-primary)', boxShadow: '0 4px 14px 0 var(--color-primary-light)' }}
                            >
                                <Zap className="w-4 h-4" /> Publish
                            </button>
                        </div>
                    </div>

                    {/* The Virtual Canvas */}
                    <div className="flex-1 overflow-auto p-12 flex justify-center items-start pattern-grid" style={{ background: '#E5E7EB' }}>
                        <Canvas viewMode={viewMode} appData={currentAppData} customWidth={customWidth} onCanvasRef={el => { (window as any).__nexusCanvasRef = el; }} />
                    </div>
                </div>

                {/* Right Properties Panel */}
                <aside className={cn(
                  "border-l flex flex-col shrink-0 transition-all duration-300 h-full overflow-hidden",
                  propertiesPanelOpen ? "w-72" : "w-12"
                )} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                    {propertiesPanelOpen && (
                      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <PropertiesPanel dataSourceId={currentAppData?.dataSourceId} unifiedDatasources={unifiedDatasources} currentAppData={currentAppData} />
                      </div>
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

            {/* Unsaved Changes Warning Modal */}
            {showUnsavedWarning && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-neutral-200 dark:border-slate-700">
                        <div className="px-6 pt-6 pb-5 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-neutral-900 dark:text-white text-sm mb-1">Unsaved changes</h3>
                                    <p className="text-xs text-neutral-500 dark:text-slate-400">You have unsaved changes. Save before leaving?</p>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={async () => { await handleSave(); setShowUnsavedWarning(false); setCurrentAppId(null); }}
                                    className="flex-1 px-3 py-2 text-xs font-bold text-white rounded-lg transition-colors"
                                    style={{ background: 'var(--color-primary)' }}>
                                    Save &amp; Leave
                                </button>
                                <button onClick={() => { setIsDirty(false); setShowUnsavedWarning(false); setCurrentAppId(null); }}
                                    className="flex-1 px-3 py-2 text-xs font-bold text-neutral-600 dark:text-slate-300 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 rounded-lg transition-colors">
                                    Discard
                                </button>
                                <button onClick={() => setShowUnsavedWarning(false)}
                                    className="px-3 py-2 text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-neutral-900 dark:text-white">Application Preview</h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary-50 text-primary-600 border border-primary-200">
                                    {currentAppData?.mode?.replace('_',' ') || 'view only'}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-neutral-100 dark:bg-slate-800 text-neutral-500 dark:text-slate-400 border border-neutral-200 dark:border-slate-700">
                                    {viewMode === 'desktop' ? '🖥 Desktop' : viewMode === 'tablet' ? '📱 Tablet 768px' : viewMode === 'mobile' ? '📱 Mobile 375px' : `Custom ${customWidth}px`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPreviewFormState({})} title="Reset form fields"
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
                                    <RotateCcw className="w-3.5 h-3.5"/> Reset Form
                                </button>
                                <div className="h-5 w-[1px] bg-neutral-200"/>
                                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-neutral-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-neutral-500 dark:text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-8 transition-colors duration-300" style={{ background: '#E5E7EB' }}>
                             <div className="shadow-xl min-h-full max-w-6xl mx-auto rounded-lg border overflow-hidden" style={{ background: currentAppData?.bgColor || '#FFFFFF', borderColor: 'var(--border-color)', minHeight: 800 }}>
                                 {ps.enableApplicationHeadings && (
                                     <div className="w-full px-4 flex items-center shrink-0 relative"
                                          style={{ background: currentAppData?.headerColor || ps.headingBackgroundColour || 'var(--color-primary)', height: ps.headingHeight || 48, fontFamily: ps.headingFontFamily }}>
                                         {ps.menuEnabled && (ps.menuType === 'burger-left' || ps.menuType === 'slide-left') && (
                                             <button className="mr-3 p-1.5 rounded-md hover:bg-white/20 transition-colors text-white shrink-0">
                                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                     <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                                                 </svg>
                                             </button>
                                         )}
                                         {ps.headingLogoUrl && <img src={ps.headingLogoUrl} alt="Logo" className="h-7 w-auto object-contain shrink-0 mr-3" />}
                                         <span className="font-bold text-white text-sm flex-1 truncate">{currentAppData?.headerText || ps.headingText || ''}</span>
                                         {ps.menuEnabled && ps.menuType === 'burger-right' && (
                                             <button className="ml-3 p-1.5 rounded-md hover:bg-white/20 transition-colors text-white shrink-0">
                                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                     <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                                                 </svg>
                                             </button>
                                         )}
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
                                        <span className="text-sm font-mono text-neutral-600 dark:text-slate-300 truncate flex-1 mr-3">
                                            {window.location.origin}/{workspaceSlug}/{currentAppId}
                                        </span>
                                        <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/${workspaceSlug}/${currentAppId}`); showToast('URL copied!'); }} className="text-primary-600 dark:text-primary-400 text-xs font-bold hover:underline shrink-0">Copy URL</button>
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

                            <div className="pt-6 mt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
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
    const { components, selectedId, selectedIds, selectComponent, toggleSelectComponent, clearSelection, moveComponent, updateComponentSize, deleteSelected, alignSelected } = useBuilderStore();
    const [contextMenu, setContextMenu] = useState<{x:number; y:number} | null>(null);
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

function LeftPalette() {
    const [collapsed, setCollapsed] = React.useState(() => {
        try { return localStorage.getItem('nexus-palette-collapsed') === 'true'; } catch { return false; }
    });
    const [search, setSearch] = React.useState('');

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        try { localStorage.setItem('nexus-palette-collapsed', String(next)); } catch {}
    };

    const allItems = [
        ...COMPONENT_TYPES.LAYOUT.map((i: any) => ({ ...i, category: 'Layout' })),
        ...COMPONENT_TYPES.INPUTS.map((i: any) => ({ ...i, category: 'Inputs' })),
        ...COMPONENT_TYPES.DISPLAY.map((i: any) => ({ ...i, category: 'Display' })),
    ];

    const filtered = search.trim()
        ? allItems.filter((i: any) => i.label.toLowerCase().includes(search.toLowerCase()))
        : null;

    return (
        <aside className={cn('border-r flex flex-col shrink-0 transition-all duration-200', collapsed ? 'w-12' : 'w-64')} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            {collapsed ? (
                <div className="flex flex-col items-center h-full py-4 gap-3">
                    <button onClick={toggle} title="Expand Components panel"
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-[9px] font-black uppercase tracking-widest select-none" style={{ writingMode: 'vertical-rl', color: 'var(--text-secondary)' }}>Components</span>
                </div>
            ) : (
                <>
                    <div className="p-4 border-b space-y-2" style={{ borderColor: 'var(--border-color)' }}>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Components</h3>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search components…"
                                className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg border outline-none transition-all"
                                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {filtered ? (
                            filtered.length > 0 ? (
                                <section>
                                    <div className="grid grid-cols-2 gap-2">
                                        {filtered.map((item: any) => <PaletteItem key={item.type} {...item} />)}
                                    </div>
                                </section>
                            ) : (
                                <p className="text-[10px] text-neutral-400 text-center py-6">No components match "{search}"</p>
                            )
                        ) : (
                            <>
                                <PaletteSection title="Layout" items={COMPONENT_TYPES.LAYOUT} />
                                <PaletteSection title="Inputs" items={COMPONENT_TYPES.INPUTS} />
                                <PaletteSection title="Display" items={COMPONENT_TYPES.DISPLAY} />
                            </>
                        )}
                    </div>
                    <div className="p-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <button onClick={toggle} title="Collapse Components panel"
                            className="w-full flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                            style={{ color: 'var(--text-secondary)' }}>
                            <ChevronLeft className="w-3.5 h-3.5" /> Collapse
                        </button>
                    </div>
                </>
            )}
        </aside>
    );
}

function PaletteSection({ title, items }: { title: string, items: any[] }) {
    return (
        <section>
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{title}</h4>
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
                "flex flex-col items-center gap-2 p-3 bg-neutral-50 dark:bg-slate-800 border border-neutral-100 dark:border-slate-700 rounded-xl hover:border-primary-600 dark:hover:border-primary-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group relative",
                isDragging && "opacity-0"
            )}
        >
            <GripVertical className="w-3 h-3 text-neutral-300 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-neutral-400 dark:text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {icon}
            </div>
            <span className="text-[10px] font-medium text-neutral-600 dark:text-slate-400 truncate w-full text-center">{label}</span>
        </div>
    );
}

function Canvas({ viewMode, appData, customWidth, onCanvasRef }: { viewMode: string, appData?: any, customWidth?: number, onCanvasRef?: (el: HTMLDivElement | null) => void }) {
    const { components, selectedId, selectedIds, selectComponent, toggleSelectComponent, clearSelection, moveComponent, updateComponentSize, deleteSelected, deleteComponent, alignSelected, bringToFront, sendToBack } = useBuilderStore();
    const { settings: ps } = useProjectSettingsStore();
    const [contextMenu, setContextMenu] = useState<{x:number; y:number} | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const canvasInnerRef = React.useRef<HTMLDivElement>(null);
    const { isOver, setNodeRef } = useDroppable({ id: 'canvas-dropzone' });
    const setRefs = (el: HTMLDivElement | null) => {
        setNodeRef(el);
        (canvasInnerRef as any).current = el;
        onCanvasRef?.(el);
    };

    // ── All transient pointer state lives in a single ref so handlers are
    //    always fresh without stale-closure problems. ─────────────────────────
    const ptr = React.useRef<{
        mode: 'idle' | 'drag' | 'resize' | 'marquee';
        id: string | null;
        startX: number; startY: number;          // client coords at pointer-down
        canvasStartX: number; canvasStartY: number; // canvas-relative at pointer-down
        initX: number; initY: number;            // component position at start
        initW: number; initH: number;            // component size at start
    }>({ mode: 'idle', id: null, startX: 0, startY: 0, canvasStartX: 0, canvasStartY: 0,
         initX: 0, initY: 0, initW: 0, initH: 0 });

    // Marquee display state (React state for re-render) + ref for side-effect-safe access in onUp
    const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const marqueeRef = React.useRef<{ x: number; y: number; w: number; h: number } | null>(null);

    // Dynamic canvas height — grows as components are placed further down the canvas
    const canvasMinHeight = useMemo(() => {
        if (components.filter(c => !c.parentId).length === 0) return 800;
        const maxY = Math.max(...components.filter(c => !c.parentId).map(c =>
            (c.position?.y || 0) + (c.size?.height || 100)
        ));
        return Math.max(800, maxY + 200); // 200px buffer below lowest component
    }, [components]);

    // Close context menu: defer by one tick so the right-click onContextMenu
    // handler fires BEFORE we check for outside clicks.
    useEffect(() => {
        if (!contextMenu) return;
        let tid: ReturnType<typeof setTimeout>;
        const handler = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('[data-nexus-ctx-menu]')) return;
            setContextMenu(null);
        };
        tid = setTimeout(() => window.addEventListener('mousedown', handler), 0);
        return () => { clearTimeout(tid); window.removeEventListener('mousedown', handler); };
    }, [contextMenu]);

    // Single always-active global pointer listener (handles drag, resize, marquee)
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const p = ptr.current;
            if (p.mode === 'drag' && p.id) {
                const dx = e.clientX - p.startX;
                const dy = e.clientY - p.startY;
                moveComponent(p.id, Math.max(0, p.initX + dx), Math.max(0, p.initY + dy));
            } else if (p.mode === 'resize' && p.id) {
                const dx = e.clientX - p.startX;
                const dy = e.clientY - p.startY;
                updateComponentSize(p.id, Math.max(50, p.initW + dx), Math.max(30, p.initH + dy));
            } else if (p.mode === 'marquee') {
                const dx = e.clientX - p.startX;
                const dy = e.clientY - p.startY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    const mq = {
                        x: Math.min(p.canvasStartX, p.canvasStartX + dx),
                        y: Math.min(p.canvasStartY, p.canvasStartY + dy),
                        w: Math.abs(dx), h: Math.abs(dy),
                    };
                    marqueeRef.current = mq;
                    setMarquee(mq);
                }
            }
        };
        const onUp = (_e: MouseEvent) => {
            const p = ptr.current;
            if (p.mode === 'marquee') {
                // Read current marquee from React state via a ref snapshot
                // We must NOT call side-effects inside setMarquee() updater.
                // Instead: read marqueeRef, compute hits, batch-select them,
                // THEN clear the display state.
                const currentMarquee = marqueeRef.current;
                if (currentMarquee) {
                    const PADDING = 32;
                    const mx = currentMarquee.x - PADDING;
                    const my = currentMarquee.y - PADDING;
                    const mr = mx + currentMarquee.w;
                    const mb = my + currentMarquee.h;
                    const store = useBuilderStore.getState();
                    const hit = store.components.filter(c => {
                        if (c.parentId) return false;
                        const cx2 = (c.position?.x || 0) + (c.size?.width  || 200) / 2;
                        const cy2 = (c.position?.y || 0) + (c.size?.height || 80 ) / 2;
                        return cx2 >= mx && cx2 <= mr && cy2 >= my && cy2 <= mb;
                    });
                    // Batch-select: call toggleSelectComponent once per hit component.
                    // Each call reads fresh state via get() so they stack correctly.
                    hit.forEach(c => store.toggleSelectComponent(c.id));
                }
                setMarquee(null);
                marqueeRef.current = null;
            }
            ptr.current.mode = 'idle';
            ptr.current.id   = null;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
        };
    }, [moveComponent, updateComponentSize]); // stable deps — handlers read ptr.current

    return (
        <div 
            ref={setRefs}
            className={cn(
                "shadow-2xl transition-all duration-300 border relative",
                viewMode === 'desktop' && "w-full",
                viewMode === 'tablet' && "w-[768px]",
                viewMode === 'mobile' && "w-[375px]",
                viewMode === 'custom' ? "" : "",
                isOver ? "border-primary-600" : ""
            )}
            style={{
                background: isOver ? undefined : (appData?.bgColor || ps.applicationBackgroundColour || '#FFFFFF'),
                borderColor: isOver ? undefined : 'var(--border-color)',
                minHeight: canvasMinHeight,
                fontFamily: ps.textFontFamily || 'inherit',
                ...(viewMode === 'custom' ? { width: customWidth } : {}),
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) clearSelection();
            }}
            onContextMenu={(e) => {
                // Right-click on empty canvas clears selection
                if (e.target === e.currentTarget) { e.preventDefault(); clearSelection(); }
            }}
            onMouseDown={(e) => {
                const el = e.target as HTMLElement;
                const isCanvas = el === e.currentTarget
                    || el.classList.contains('nexus-canvas-inner')
                    || el.classList.contains('nexus-canvas-bg')
                    || el.closest('.nexus-canvas-inner') === el.parentElement;
                if (!isCanvas || e.button !== 0) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) clearSelection();
                ptr.current = { ...ptr.current, mode: 'marquee', id: null,
                    startX: e.clientX, startY: e.clientY,
                    canvasStartX: cx, canvasStartY: cy,
                    initX: 0, initY: 0, initW: 0, initH: 0 };
                setMarquee(null);
            }}
        >
            {/* App Header band */}
            {ps.enableApplicationHeadings && (
                <div
                    className="w-full px-4 flex items-center shrink-0 select-none relative"
                    style={{ background: appData?.headerColor || ps.headingBackgroundColour || 'var(--color-primary)', height: ps.headingHeight || 48, fontFamily: ps.headingFontFamily }}
                >
                    {/* Burger Left or Slide-left trigger */}
                    {ps.menuEnabled && (ps.menuType === 'burger-left' || ps.menuType === 'slide-left') && (
                        <button
                            onClick={() => setMenuOpen(o => !o)}
                            className="mr-3 p-1.5 rounded-md hover:bg-white/20 transition-colors text-white shrink-0"
                            title="Navigation menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        </button>
                    )}

                    {/* Logo */}
                    {ps.headingLogoUrl && (
                        <img src={ps.headingLogoUrl} alt="Logo" className="h-7 w-auto object-contain shrink-0 mr-3" />
                    )}

                    <span className="font-bold text-white text-sm flex-1 truncate">{appData?.headerText || ps.headingText || ''}</span>

                    {/* Burger Right */}
                    {ps.menuEnabled && ps.menuType === 'burger-right' && (
                        <button
                            onClick={() => setMenuOpen(o => !o)}
                            className="ml-3 p-1.5 rounded-md hover:bg-white/20 transition-colors text-white shrink-0"
                            title="Navigation menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {/* Navigation menu overlay */}
            {ps.menuEnabled && menuOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
                        onClick={() => setMenuOpen(false)}
                    />
                    {/* Panel — slide left for slide-left (full height), or compact dropdown for burger */}
                    <div className={cn(
                        "absolute z-50 flex flex-col shadow-2xl overflow-hidden",
                        ps.menuType === 'slide-left'
                            ? "left-0 top-0 h-full w-56 rounded-r-2xl"
                            : ps.menuType === 'burger-left'
                                ? "left-0 top-[48px] w-56 rounded-b-2xl rounded-tr-2xl max-h-[70%] overflow-y-auto"
                                : "right-0 top-[48px] w-56 rounded-b-2xl rounded-tl-2xl max-h-[70%] overflow-y-auto"
                    )} style={{ background: ps.menuColour || appData?.headerColor || ps.headingBackgroundColour || 'var(--color-primary)' }}>
                        <div className="px-4 py-4 border-b border-white/20 flex items-center justify-between">
                            <span className="text-white font-bold text-sm">Menu</span>
                            <button onClick={() => setMenuOpen(false)} className="p-1 rounded-md hover:bg-white/20 text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <nav className="flex-1 overflow-y-auto py-2">
                            {ps.menuAppIds.length === 0 ? (
                                <p className="text-white/60 text-xs px-4 py-3 italic">No apps added to menu yet.<br/>Configure in Settings → Appearance.</p>
                            ) : (
                                ps.menuAppIds.map((appId, idx) => {
                                    const menuApp = { id: appId, name: appId }; // name resolved from context when live
                                    return (
                                        <button key={appId}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/15 transition-colors text-white text-sm font-medium"
                                        >
                                            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</span>
                                            <span className="truncate">{menuApp.name}</span>
                                        </button>
                                    );
                                })
                            )}
                        </nav>
                    </div>
                </>
            )}


            <div className="p-8 nexus-canvas-inner">
            {components.filter(c => !c.parentId).length === 0 && components.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center nexus-canvas-bg">
                     <div className="text-center max-w-sm">
                         <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-neutral-200 shadow-sm">
                             <Plus className="w-8 h-8 text-neutral-300" />
                         </div>
                         <p className="text-neutral-600 font-bold text-sm mb-1">Your canvas is empty</p>
                         <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400 font-medium mb-6">
                             <span className="animate-bounce">←</span>
                             <span>Drag any component from the left panel to begin</span>
                         </div>
                         <p className="text-[9px] text-neutral-300 font-black uppercase tracking-widest mb-3">Quick start</p>
                         <div className="flex gap-2 justify-center flex-wrap pointer-events-auto">
                             {[
                                 { type: 'table', label: '📋 Data Table', desc: 'Display live data' },
                                 { type: 'input', label: '✏️ Input Form', desc: 'Collect data' },
                                 { type: 'button', label: '🔘 Button', desc: 'Trigger actions' },
                             ].map(({ type, label, desc }) => (
                                 <button key={type}
                                     onClick={() => {
                                         const defProps: Record<string,any> = {
                                             table: { dataSource: '' },
                                             input: { label: 'Input Field', placeholder: 'Enter value…' },
                                             button: { label: 'Click Me', style: 'primary', actionType: 'submit' },
                                         };
                                         const n = useBuilderStore.getState().components.length;
                                         const newComp = {
                                             id: `${type}_${Math.random().toString(36).substr(2,9)}`,
                                             type,
                                             label,
                                             properties: defProps[type] || {},
                                             position: { x: 80 + (n * 20), y: 60 + (n * 100) },
                                             size: { width: type === 'table' ? 500 : 280, height: type === 'table' ? 300 : 80 }
                                         };
                                         useBuilderStore.getState().addComponent(newComp as any);
                                     }}
                                     className="flex flex-col items-center gap-1 px-4 py-3 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:bg-primary-50/30 transition-all shadow-sm text-left group"
                                 >
                                     <span className="text-xs font-bold text-neutral-700 group-hover:text-primary-700">{label}</span>
                                     <span className="text-[9px] text-neutral-400">{desc}</span>
                                 </button>
                             ))}
                         </div>
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
                                if (e.button === 2) return; // right-click → let onContextMenu handle it
                                e.stopPropagation();
                                if (e.shiftKey || e.ctrlKey || e.metaKey) toggleSelectComponent(c.id);
                                else if (!selectedIds.has(c.id)) selectComponent(c.id);
                                // if already selected and no modifier, keep multiselect intact for potential drag
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!selectedIds.has(c.id)) selectComponent(c.id);
                                setContextMenu({ x: e.clientX, y: e.clientY });
                            }}
                            className={cn(
                                "group cursor-default transition-shadow rounded-md",
                                selectedIds.has(c.id) ? "ring-2 ring-primary-600 ring-offset-4 shadow-xl" : "hover:ring-2 hover:ring-neutral-200 hover:ring-offset-4"
                            )}
                        >
                            {/* Dedicated drag handle — hidden for locked components */}
                            <div
                                title={c.properties?.locked ? "Component is locked — unlock in Properties to move" : "Drag to reposition"}
                                onMouseDown={(e) => {
                                    if (c.properties?.locked) return;
                                    e.stopPropagation();
                                    if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !selectedIds.has(c.id)) selectComponent(c.id);
                                    ptr.current = { ...ptr.current, mode: 'drag', id: c.id,
                                        startX: e.clientX, startY: e.clientY,
                                        initX: c.position?.x || 0, initY: c.position?.y || 0,
                                        initW: 0, initH: 0 };
                                }}
                                className={cn(
                                    "absolute -top-6 left-1/2 -translate-x-1/2 h-5 px-2 bg-neutral-700 dark:bg-slate-600 rounded-full flex items-center gap-1 cursor-move z-20 select-none transition-all",
                                    "opacity-0 group-hover:opacity-100",
                                    selectedId === c.id && "opacity-100 bg-primary-600"
                                )}
                            >
                                <GripHorizontal className="w-3 h-3 text-white" />
                            </div>

                            {/* Lock indicator */}
                            {c.properties?.locked && (
                                <div className="absolute top-1 right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center z-20 shadow-sm" title="Locked">
                                    <span className="text-[9px]">🔒</span>
                                </div>
                            )}

                            {/* Delete badge — visible on hover or selection, matches ReportDesigner pattern */}
                            {!c.properties?.locked && (
                                <button
                                    title="Delete component"
                                    aria-label="Delete component"
                                    onClick={(e) => { e.stopPropagation(); deleteComponent(c.id); }}
                                    className="absolute -top-3 -right-3 w-6 h-6 bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center z-30 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                >
                                    <Trash2 className="w-3 h-3 text-white" />
                                </button>
                            )}

                            <RenderComponent component={c} />
                            
                            {selectedIds.has(c.id) && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary-600 text-white px-2 py-1 rounded shadow-lg text-[10px] font-bold pointer-events-none z-10 whitespace-nowrap">
                                    {c.label}
                                    <div className="w-2 h-2 bg-primary-600 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                </div>
                            )}

                            {/* Resize handle */}
                            {selectedId === c.id && selectedIds.size === 1 && (
                                <div 
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    ptr.current = { ...ptr.current, mode: 'resize', id: c.id,
                                        startX: e.clientX, startY: e.clientY,
                                        initW: c.size?.width || 200, initH: c.size?.height || 80,
                                        initX: 0, initY: 0 };
                                  }}
                                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border-2 border-primary-600 rounded-full cursor-nwse-resize z-10 hover:scale-125 transition-all duration-150 shadow-sm flex items-center justify-center opacity-0 animate-in fade-in"
                                  title="Drag to resize"
                                ></div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            </div>{/* /p-8 */}

            {/* Rubber-band selection overlay */}
            {marquee && (
                <div
                    className="pointer-events-none absolute border-2 border-primary-500 bg-primary-500/10"
                    style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, zIndex: 200 }}
                />
            )}

            {/* Selection hint */}
            {!marquee && selectedIds.size === 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-neutral-400 font-medium pointer-events-none select-none">
                    Drag on empty canvas to multi-select · Ctrl+click to add/remove
                </div>
            )}

            {/* Multi-select context menu */}
            {contextMenu && (
                <div
                    data-nexus-ctx-menu
                    className="fixed z-[300] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: Math.min(contextMenu.x, window.innerWidth - 210), top: Math.min(contextMenu.y, window.innerHeight - 250) }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    {/* Header showing selection count */}
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                            {selectedIds.size > 1 ? `${selectedIds.size} items selected` : '1 item selected'}
                        </span>
                        <span className="text-[9px] text-neutral-300">Right-click menu</span>
                    </div>
                    {selectedIds.size >= 2 && (
                        <>
                            <div className="px-3 py-1.5 text-[9px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-slate-800 mb-1">
                                Align {selectedIds.size} items
                            </div>
                            {(['left','right','top','bottom'] as const).map(dir => (
                                <button key={dir} onClick={() => { alignSelected(dir); setContextMenu(null); }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors text-left">
                                    <span className="w-4 h-4 flex items-center justify-center text-neutral-400">
                                        {dir === 'left' && '⊢'}{dir === 'right' && '⊣'}{dir === 'top' && '⊤'}{dir === 'bottom' && '⊥'}
                                    </span>
                                    Align {dir.charAt(0).toUpperCase() + dir.slice(1)}
                                </button>
                            ))}
                            <div className="border-t border-neutral-100 dark:border-slate-800 my-1"/>
                        </>
                    )}
                    {selectedIds.size === 1 && selectedId && (
                        <>
                            <button onClick={() => { bringToFront(selectedId); setContextMenu(null); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors text-left">
                                <span className="w-4 h-4 flex items-center justify-center text-neutral-400">↑</span>
                                Bring to Front
                            </button>
                            <button onClick={() => { sendToBack(selectedId); setContextMenu(null); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors text-left">
                                <span className="w-4 h-4 flex items-center justify-center text-neutral-400">↓</span>
                                Send to Back
                            </button>
                            <div className="border-t border-neutral-100 dark:border-slate-800 my-1"/>
                        </>
                    )}
                    <button onClick={() => { deleteSelected(); setContextMenu(null); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left">
                        <span className="w-4 h-4 flex items-center justify-center">✕</span>
                        Delete{selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}
                    </button>
                </div>
            )}
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
    const { settings: ps } = useProjectSettingsStore();

    switch (type) {
        case 'heading':
            const HeadingTag = (properties.size || 'h1') as any;
            return <HeadingTag className={cn(
                "font-bold tracking-tight leading-tight",
                properties.size === 'h1' && "text-4xl",
                properties.size === 'h2' && "text-3xl",
                properties.size === 'h3' && "text-2xl",
            )} style={{ color: properties.textColor || ps.textColour || '#111827' }}>{properties.text || 'Heading'}</HeadingTag>;
        
        case 'text':
            return <p className="leading-relaxed text-sm" style={{ color: properties.textColor || ps.textColour || '#4B5563' }}>{properties.text || 'Paragraph text content...'}</p>;

        case 'button':
            const handleClick = async () => {
                if (!preview) return;
                
                if (properties.actionType === 'url' && properties.url) {
                    window.open(properties.url, '_blank');
                } else if (properties.actionType === 'application' && properties.targetAppId) {
                    // Apply field mappings to pass params to the target app
                    const mappings = properties.paramMappings || [];
                    const params: Record<string,any> = {};
                    mappings.forEach((m: any) => {
                        const v = m.sourceField ? String((formState||{})[m.sourceField] ?? '') : (m.staticValue || '');
                        if (v !== '') params[m.targetField] = v;
                    });
                    (window as any).__nexusParams = params;
                    useBuilderStore.getState().setCurrentAppId(properties.targetAppId);
                } else if (properties.actionType === 'cancel') {
                    useBuilderStore.getState().setCurrentAppId(null);
                } else if (properties.actionType === 'submit') {
                    if (!appContext || !appContext.dataSourceId || !selectedProjectId) {
                        window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: 'Application not fully configured for data operations', type: 'error' } }));
                        return;
                    }
                    
                    const tableId = appContext.dataSourceId;
                    const mode = appContext.mode || 'view_only';
                    const keyFields = appContext.keyFields || [];

                    try {
                        if (mode === 'add') {
                            await dataService.addRecord(selectedProjectId, tableId, formState || {});
                            window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: 'Record added successfully', type: 'success' } }));
                        } else if (mode === 'update') {
                            if (keyFields.length === 0) {
                                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: 'No key fields defined — set Key Fields in Application Settings', type: 'error' } }));
                                return;
                            }
                            const missingKeys = keyFields.filter(kf => formState?.[kf] === undefined || formState?.[kf] === '');
                            if (missingKeys.length > 0) {
                                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: `Please fill in required field(s): ${missingKeys.join(', ')}`, type: 'error' } }));
                                return;
                            }
                            const q = query(
                                collection(db, 'workspaces', selectedProjectId, 'tableData', tableId, 'rows'),
                                ...keyFields.map(kf => where(kf, '==', formState![kf]))
                            );
                            const snap = await getDocs(q);
                            if (snap.empty) {
                                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: 'No matching record found to update', type: 'error' } }));
                            } else {
                                for (const docRef of snap.docs) {
                                    await dataService.updateRecord(selectedProjectId, tableId, docRef.id, formState || {});
                                }
                                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: `Updated ${snap.size} record(s)`, type: 'success' } }));
                            }
                        } else if (mode === 'delete') {
                            if (keyFields.length === 0) {
                                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: 'No key fields defined — set Key Fields in Application Settings', type: 'error' } }));
                                return;
                            }
                            const missingKeys = keyFields.filter(kf => formState?.[kf] === undefined || formState?.[kf] === '');
                            if (missingKeys.length > 0) {
                                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: `Please fill in required field(s): ${missingKeys.join(', ')}`, type: 'error' } }));
                                return;
                            }
                             const q = query(
                                collection(db, 'workspaces', selectedProjectId, 'tableData', tableId, 'rows'),
                                ...keyFields.map(kf => where(kf, '==', formState![kf]))
                            );
                            const snap = await getDocs(q);
                            if (snap.empty) {
                                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: 'No matching record found to delete', type: 'error' } }));
                            } else {
                                for (const docRef of snap.docs) {
                                    await dataService.deleteRecord(selectedProjectId, tableId, docRef.id);
                                }
                                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: `Deleted ${snap.size} record(s)`, type: 'success' } }));
                            }
                        } else {
                            window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: 'Application is in view-only mode', type: 'info' } }));
                        }
                    } catch (e) {
                        console.error(e);
                        window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { msg: 'Operation failed', type: 'error' } }));
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
                    } as any : properties.style === 'primary' ? {
                        width: '100%', height: '100%',
                        background: 'var(--project-btn-standard, var(--color-primary))',
                        color: '#ffffff',
                    } as any : { width: '100%', height: '100%' }}
                    onMouseEnter={(e) => { 
                        if (properties.style === 'custom' && properties.customHoverBg) (e.currentTarget as HTMLElement).style.backgroundColor = properties.customHoverBg;
                        if (properties.style === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--project-btn-hover, var(--color-primary))';
                    }}
                    onMouseLeave={(e) => { 
                        if (properties.style === 'custom') (e.currentTarget as HTMLElement).style.backgroundColor = properties.customBg || '#334155';
                        if (properties.style === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--project-btn-standard, var(--color-primary))';
                    }}
                    onMouseDown={(e) => { 
                        if (properties.style === 'custom' && properties.customActiveBg) (e.currentTarget as HTMLElement).style.backgroundColor = properties.customActiveBg;
                        if (properties.style === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--project-btn-clicked, var(--color-primary))';
                    }}
                    onMouseUp={(e) => { 
                        if (properties.style === 'custom') (e.currentTarget as HTMLElement).style.backgroundColor = properties.customBg || '#334155';
                        if (properties.style === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--project-btn-hover, var(--color-primary))';
                    }}
                    className={cn(
                        "rounded-xl font-bold transition-all shadow-md active:scale-95",
                        properties.style === 'primary' ? "text-white" :
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
                    <label className="text-sm font-bold" style={{ color: ps.textColour || '#374151' }}>{properties.label || 'Toggle'}</label>
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
                    <label className="text-sm font-bold flex items-center gap-1" style={{ color: ps.textColour || '#374151' }}>
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
                    <label className="text-sm font-bold" style={{ color: ps.textColour || '#374151' }}>{properties.label || 'Dropdown'}</label>
                    <div className="relative flex-1">
                        <select 
                            value={formState ? (formState[properties.fieldMapping || component.id] ?? '') : ''}
                            onChange={(e) => { if (preview) onFormUpdate?.(properties.fieldMapping || component.id, e.target.value); }}
                            className="w-full h-full px-4 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none appearance-none dark:text-white"
                            style={{ backgroundColor: ps.componentPrimaryColour ? `${ps.componentPrimaryColour}18` : '#F9FAFB' }}
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
                    <label className="text-sm font-bold flex items-center justify-between gap-1" style={{ color: ps.textColour || '#374151' }}>
                        <div className="flex items-center gap-1">
                            {properties.label || 'Input Label'}
                            {properties.required && <span className="text-error-500">*</span>}
                        </div>
                        {properties.readOnly && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">Read Only</span>
                        )}
                    </label>
                    <input 
                        type="text" 
                        value={formState ? (formState[properties.fieldMapping || component.id] ?? appContext?.urlParams?.[properties.fieldMapping || ''] ?? '') : ''}
                        onChange={(e) => { if (preview && !properties.readOnly) onFormUpdate?.(properties.fieldMapping || component.id, e.target.value); }}
                        placeholder={properties.readOnly ? '' : (properties.placeholder || 'Enter value...')}
                        readOnly={!!properties.readOnly}
                        className={cn(
                            "w-full h-full px-4 border rounded-xl text-sm outline-none transition-all dark:text-white",
                            properties.readOnly
                                ? "border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-default select-none"
                                : "border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                        )}
                        style={{ backgroundColor: ps.componentPrimaryColour ? `${ps.componentPrimaryColour}18` : undefined }}
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

        case 'image':
            return (
                <div className="w-full h-full flex items-center justify-center rounded-xl overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                    {properties.src ? (
                        <img
                            src={properties.src}
                            alt={properties.alt || ''}
                            style={{ width: '100%', height: '100%', objectFit: (properties.fit as any) || 'cover' }}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-neutral-300">
                            <ImageIcon className="w-10 h-10" />
                            <span className="text-xs font-medium">Image component</span>
                            <span className="text-[10px] text-neutral-400">Configure an image in the properties panel</span>
                        </div>
                    )}
                </div>
            );

        case 'badge': {
            const variant = properties.variant || 'solid';
            const color = properties.color || '#1A56DB';
            const textColor = variant === 'solid' ? (properties.textColor || '#ffffff') : color;
            const bg = variant === 'solid' ? color : `${color}20`;
            const border = variant === 'outline' ? `1.5px solid ${color}` : 'none';
            const size = properties.size || 'md';
            const sizeClass = size === 'sm' ? 'text-[9px] px-2 py-0.5' : size === 'lg' ? 'text-sm px-4 py-1.5' : 'text-xs px-3 py-1';
            return (
                <div className="w-full h-full flex items-center gap-1.5 flex-wrap">
                    {(properties.tags || [{ label: properties.label || 'Badge', value: '' }]).map((tag: any, i: number) => (
                        <span
                            key={i}
                            className={`inline-flex items-center font-bold rounded-full select-none ${sizeClass}`}
                            style={{ background: bg, color: textColor, border }}
                        >
                            {tag.label || tag}
                        </span>
                    ))}
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
    const { settings: ps } = useProjectSettingsStore();
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
                        <thead className="sticky top-0" style={{ background: ps.componentPrimaryColour || 'var(--bg-primary)' }}>
                            <tr>
                                {startBtns.length > 0 && <th className="px-3 py-2 w-px" />}
                                {visibleFields.map((f: any) => (
                                    <th key={f.id} className="px-4 py-2 text-left font-bold uppercase tracking-wider whitespace-nowrap text-white opacity-90">{f.name}</th>
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
                                                    <button key={bi}
                                                        onClick={() => {
                                                            if (!preview) return;
                                                            if (btn.action === 'app' && btn.targetAppId) {
                                                                // Build params from explicit mappings if configured,
                                                                // otherwise fall back to passing all row fields
                                                                const rowWithMeta = { ...row, _rowId: row.id || '', _sourceTable: properties.dataSource || '' };
                                                                const paramMappings: any[] = btn.paramMappings || [];
                                                                const params: Record<string,any> = {};
                                                                if (paramMappings.length > 0) {
                                                                    paramMappings.forEach((m: any) => {
                                                                        const v = m.sourceField ? String(rowWithMeta[m.sourceField] ?? '') : (m.staticValue || '');
                                                                        if (v !== '') params[m.targetField] = v;
                                                                    });
                                                                } else {
                                                                    // No mappings configured — pass everything
                                                                    Object.entries(rowWithMeta).forEach(([k,v]) => { if (k !== 'id') params[k] = String(v ?? ''); });
                                                                }
                                                                useBuilderStore.getState().setCurrentAppId(btn.targetAppId);
                                                                (window as any).__nexusParams = params;
                                                            } else if (btn.action === 'url' && btn.targetUrl) {
                                                                const url = btn.targetUrl.replace(/\{\{row\.(\w+)\}\}/g, (_: any, f: string) => String(row[f] ?? ''));
                                                                window.open(url, '_blank');
                                                            } else if (btn.action === 'workflow' && btn.workflowId && appContext?.selectedProjectId) {
                                                                import('../../services/workflowService').then(({ triggerWorkflows }) => {
                                                                    triggerWorkflows({ wsId: appContext.selectedProjectId, triggerType: 'record_created', tableId: properties.dataSource || '', tableName: '', recordId: row.id || '', recordData: row }).catch(console.error);
                                                                });
                                                            }
                                                        }}
                                                        className="px-2 py-1 text-[10px] font-bold rounded text-white whitespace-nowrap hover:opacity-80 transition-opacity"
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
                                                    <button key={bi}
                                                        onClick={() => {
                                                            if (!preview) return;
                                                            if (btn.action === 'app' && btn.targetAppId) {
                                                                // Build params from explicit mappings if configured,
                                                                // otherwise fall back to passing all row fields
                                                                const rowWithMeta = { ...row, _rowId: row.id || '', _sourceTable: properties.dataSource || '' };
                                                                const paramMappings: any[] = btn.paramMappings || [];
                                                                const params: Record<string,any> = {};
                                                                if (paramMappings.length > 0) {
                                                                    paramMappings.forEach((m: any) => {
                                                                        const v = m.sourceField ? String(rowWithMeta[m.sourceField] ?? '') : (m.staticValue || '');
                                                                        if (v !== '') params[m.targetField] = v;
                                                                    });
                                                                } else {
                                                                    // No mappings configured — pass everything
                                                                    Object.entries(rowWithMeta).forEach(([k,v]) => { if (k !== 'id') params[k] = String(v ?? ''); });
                                                                }
                                                                useBuilderStore.getState().setCurrentAppId(btn.targetAppId);
                                                                (window as any).__nexusParams = params;
                                                            } else if (btn.action === 'url' && btn.targetUrl) {
                                                                const url = btn.targetUrl.replace(/\{\{row\.(\w+)\}\}/g, (_: any, f: string) => String(row[f] ?? ''));
                                                                window.open(url, '_blank');
                                                            } else if (btn.action === 'workflow' && btn.workflowId && appContext?.selectedProjectId) {
                                                                import('../../services/workflowService').then(({ triggerWorkflows }) => {
                                                                    triggerWorkflows({ wsId: appContext.selectedProjectId, triggerType: 'record_created', tableId: properties.dataSource || '', tableName: '', recordId: row.id || '', recordData: row }).catch(console.error);
                                                                });
                                                            }
                                                        }}
                                                        className="px-2 py-1 text-[10px] font-bold rounded text-white whitespace-nowrap hover:opacity-80 transition-opacity"
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

function PropertiesPanel({ dataSourceId, unifiedDatasources, currentAppData }: { dataSourceId?: string, unifiedDatasources: any[]; currentAppData?: any }) {
    const { selectedId, components, updateComponent, deleteComponent, currentAppId, bringToFront, sendToBack } = useBuilderStore();
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
    const [btnTab, setBtnTab] = useState<'general'|'action'|'style'>('general');
    const [tblTab, setTblTab] = useState<'data'|'columns'|'buttons'>('data');
    
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
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="p-3 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                            {COMPONENT_TYPES.LAYOUT.find(t => t.type === type)?.icon || 
                             COMPONENT_TYPES.INPUTS.find(t => t.type === type)?.icon ||
                             COMPONENT_TYPES.DISPLAY.find(t => t.type === type)?.icon || 
                             <Square className="w-3.5 h-3.5" />}
                        </div>
                        <h3 className="font-bold text-neutral-900 text-xs" title={`ID: ${selectedId}`}>{label}</h3>
                    </div>
                    <button 
                        onClick={() => deleteComponent(selectedId!)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                        title="Delete component"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
                {/* I-06: Z-order controls  |  I-04: Lock toggle */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => bringToFront(selectedId!)}
                        title="Bring to front"
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-all"
                    >
                        <ChevronsUp className="w-3.5 h-3.5" /> Front
                    </button>
                    <button
                        onClick={() => sendToBack(selectedId!)}
                        title="Send to back"
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-all"
                    >
                        <ChevronsDown className="w-3.5 h-3.5" /> Back
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={() => updateComponent(selectedId!, { properties: { ...properties, locked: !properties?.locked } })}
                        title={properties?.locked ? 'Unlock component' : 'Lock component position'}
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all",
                            properties?.locked
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                        )}
                    >
                        {properties?.locked ? '🔒 Locked' : '🔓 Lock'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* General Settings */}
                <section className="space-y-4">
                     <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-2">General</h4>
                     
                     <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-neutral-600">Label</label>
                        <input 
                            type="text" 
                            value={properties.label || ''}
                            onChange={(e) => handleUpdate('label', e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                        />
                     </div>

                     <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-neutral-600">Visibility</label>
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
                                                 label: field ? (field.description?.trim() || field.name) : properties.label 
                                             }
                                         });
                                     }}
                                     className="w-full px-3 py-2 bg-white border border-primary-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none font-bold text-primary-900"
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
                                 <label className="text-[11px] font-semibold text-neutral-600">Text</label>
                                 <input 
                                     type="text" 
                                     value={properties.text || ''}
                                     onChange={(e) => handleUpdate('text', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                                 />
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Size</label>
                                 <select 
                                     value={properties.size || 'h1'}
                                     onChange={(e) => handleUpdate('size', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                                 >
                                     <option value="h1">H1 - Large</option>
                                     <option value="h2">H2 - Medium</option>
                                     <option value="h3">H3 - Small</option>
                                 </select>
                             </div>
                             {/* I-01: Per-instance colour override */}
                             <div className="space-y-1.5">
                                 <div className="flex items-center justify-between">
                                     <label className="text-[11px] font-semibold text-neutral-600">Text Colour</label>
                                     {properties.textColor && (
                                         <button onClick={() => handleUpdate('textColor', '')} className="text-[10px] text-primary-500 hover:underline">↩ Project default</button>
                                     )}
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <input type="color" value={properties.textColor || '#111827'}
                                         onChange={(e) => handleUpdate('textColor', e.target.value)}
                                         className="w-8 h-8 rounded-lg border border-neutral-200 cursor-pointer p-0.5" />
                                     <span className="text-xs text-neutral-500 font-mono">{properties.textColor || 'Project default'}</span>
                                 </div>
                             </div>
                         </>
                     )}

                     {/* I-01: Paragraph text colour override */}
                     {type === 'text' && (
                         <div className="space-y-3">
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Content</label>
                                 <textarea value={properties.text || ''}
                                     onChange={(e) => handleUpdate('text', e.target.value)}
                                     rows={3}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none resize-none" />
                             </div>
                             <div className="space-y-1.5">
                                 <div className="flex items-center justify-between">
                                     <label className="text-[11px] font-semibold text-neutral-600">Text Colour</label>
                                     {properties.textColor && (
                                         <button onClick={() => handleUpdate('textColor', '')} className="text-[10px] text-primary-500 hover:underline">↩ Project default</button>
                                     )}
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <input type="color" value={properties.textColor || '#4B5563'}
                                         onChange={(e) => handleUpdate('textColor', e.target.value)}
                                         className="w-8 h-8 rounded-lg border border-neutral-200 cursor-pointer p-0.5" />
                                     <span className="text-xs text-neutral-500 font-mono">{properties.textColor || 'Project default'}</span>
                                 </div>
                             </div>
                         </div>
                     )}

                     {type === 'button' && (
                         <>
                             {/* Tab strip */}
                             <div className="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg gap-0.5">
                                 {(['general','action','style'] as const).map(t => (
                                     <button key={t} onClick={() => setBtnTab(t)}
                                         className={cn('flex-1 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all',
                                             btnTab === t ? 'bg-white dark:bg-slate-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600')}>
                                         {t}
                                     </button>
                                 ))}
                             </div>

                             {btnTab === 'general' && (
                                 <div className="space-y-3">
                                     <div className="space-y-1.5">
                                         <label className="text-[11px] font-semibold text-neutral-600">Button Text</label>
                                         <input type="text" value={properties.label || ''}
                                             onChange={(e) => handleUpdate('label', e.target.value)}
                                             className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none" />
                                     </div>
                                     <div className="flex items-center justify-between">
                                         <label className="text-[11px] font-semibold text-neutral-600">Visible</label>
                                         <button onClick={() => handleUpdate('visible', properties.visible === false ? true : false)}
                                             className={cn('relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors', properties.visible !== false ? 'bg-primary-600' : 'bg-neutral-200')}>
                                             <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', properties.visible !== false ? 'translate-x-4' : 'translate-x-0')} />
                                         </button>
                                     </div>
                                 </div>
                             )}

                             {btnTab === 'action' && (
                                 <div className="space-y-3">
                                     <div className="space-y-1.5">
                                         <label className="text-[11px] font-semibold text-neutral-600">Action</label>
                                         <select value={properties.actionType || 'submit'}
                                             onChange={(e) => handleUpdate('actionType', e.target.value)}
                                             className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none font-bold">
                                             <option value="url">External URL</option>
                                             <option value="application">Navigate to App</option>
                                             <option value="submit">Submit Form</option>
                                             <option value="cancel">Cancel/Close</option>
                                         </select>
                                     </div>
                             
                                     {properties.actionType === 'url' && (
                                         <div className="space-y-1.5 p-2 bg-neutral-50 rounded-lg border border-neutral-200 animate-in slide-in-from-top-2">
                                             <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Target URL</label>
                                             <input type="text" placeholder="https://example.com"
                                                 value={properties.url || ''}
                                                 onChange={(e) => handleUpdate('url', e.target.value)}
                                                 className="w-full px-2 py-1.5 text-xs bg-white border border-neutral-200 rounded outline-none" />
                                         </div>
                                     )}

                                     {properties.actionType === 'application' && (
                                         <div className="space-y-2 p-2 bg-neutral-50 dark:bg-slate-800/50 rounded-xl border border-neutral-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                                             <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Target Application</label>
                                     <select
                                         value={properties.targetAppId || ''}
                                         onChange={(e) => handleUpdate('targetAppId', e.target.value)}
                                         className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-lg outline-none dark:text-white font-bold"
                                     >
                                         <option value="">Choose application…</option>
                                         {allApps.filter(app => app.id !== currentAppId).map(app => (
                                             <option key={app.id} value={app.id}>{app.name}</option>
                                         ))}
                                     </select>
                                     {properties.targetAppId && (
                                         <>
                                             <div className="border-t border-neutral-200 dark:border-slate-700 pt-2 mt-1">
                                                 <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2">Field Mapping</p>
                                                 <AppFieldMapper
                                                     targetAppId={properties.targetAppId}
                                                     workspaceId={selectedProjectId || ''}
                                                     sourceComponents={components}
                                                     sourceAppData={currentAppData}
                                                     mappings={properties.paramMappings || []}
                                                     onChange={(m) => handleUpdate('paramMappings', m)}
                                                 />
                                             </div>
                                         </>
                                         )}
                                         </div>
                                     )}

                                     {/* After Action — only shown when Submit Form is selected */}
                                     {(properties.actionType === 'submit' || !properties.actionType) && (
                                         <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 animate-in slide-in-from-top-2">
                                             <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">After Submit</label>
                                             <div className="grid grid-cols-2 gap-1.5">
                                                 {[
                                                     { id: 'nothing',  label: 'Do Nothing'   },
                                                     { id: 'app',      label: 'Go To App'     },
                                                     { id: 'url',      label: 'Go To URL'     },
                                                     { id: 'workflow', label: 'Trigger Workflow' },
                                                 ].map(opt => (
                                                     <button key={opt.id} type="button"
                                                         onClick={() => handleUpdate('afterAction', opt.id)}
                                                         className={cn("p-2 rounded-lg border text-[9px] font-black transition-all text-left",
                                                             (properties.afterAction || 'nothing') === opt.id
                                                                 ? "bg-primary-600 border-primary-600 text-white"
                                                                 : "bg-neutral-50 dark:bg-[#0F172A] border-neutral-200 dark:border-neutral-800 text-neutral-400")}>
                                                         {opt.label}
                                                     </button>
                                                 ))}
                                             </div>
                                             {(properties.afterAction === 'app') && (
                                                 <div className="space-y-1">
                                                     <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Target Application</label>
                                                     <select
                                                         value={properties.afterActionAppId || ''}
                                                         onChange={(e) => handleUpdate('afterActionAppId', e.target.value)}
                                                         className="w-full px-2 py-1.5 bg-neutral-50 dark:bg-[#0F172A] border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs outline-none dark:text-white">
                                                         <option value="">Select application…</option>
                                                         {allApps.filter((a: any) => a.id !== currentAppId).map((a: any) => (
                                                             <option key={a.id} value={a.id}>{a.name}</option>
                                                         ))}
                                                     </select>
                                                 </div>
                                             )}
                                             {(properties.afterAction === 'url') && (
                                                 <div className="space-y-1">
                                                     <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Destination URL</label>
                                                     <input type="url" placeholder="https://example.com/thank-you"
                                                         value={properties.afterActionUrl || ''}
                                                         onChange={(e) => handleUpdate('afterActionUrl', e.target.value)}
                                                         className="w-full px-2 py-1.5 bg-neutral-50 dark:bg-[#0F172A] border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-mono outline-none dark:text-white" />
                                                 </div>
                                             )}
                                             {(properties.afterAction === 'workflow') && (
                                                 <div className="space-y-1">
                                                     <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Workflow to Trigger</label>
                                                     <AfterActionWorkflowPicker
                                                         value={properties.afterActionWorkflowId || ''}
                                                         onChange={(id) => handleUpdate('afterActionWorkflowId', id)}
                                                         selectedProjectId={selectedProjectId}
                                                     />
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             )}

                             {btnTab === 'style' && (
                             <div className="space-y-3">
                                 <div className="space-y-1.5">
                                     <label className="text-[11px] font-semibold text-neutral-600">Style</label>
                                     <select 
                                         value={properties.style || 'primary'}
                                         onChange={(e) => handleUpdate('style', e.target.value)}
                                         className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
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
                             </div>
                             )}
                         </>
                     )}

                     {type === 'input' && (
                         <>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Placeholder</label>
                                 <input 
                                     type="text" 
                                     value={properties.placeholder || ''}
                                     onChange={(e) => handleUpdate('placeholder', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none"
                                 />
                             </div>
                             <div className="flex items-center justify-between">
                                 <label className="text-[11px] font-semibold text-neutral-600">Required</label>
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
                             <div className="flex items-center justify-between">
                                 <div>
                                     <label className="text-[11px] font-semibold text-neutral-600">Read Only</label>
                                     <p className="text-[9px] text-neutral-400 mt-0.5">Display field value — user cannot edit</p>
                                 </div>
                                 <button 
                                     onClick={() => handleUpdate('readOnly', !properties.readOnly)}
                                     className={cn(
                                         "w-10 h-5 rounded-full transition-all relative p-1 shrink-0",
                                         properties.readOnly ? "bg-amber-500" : "bg-neutral-200"
                                     )}
                                 >
                                     <div className={cn(
                                         "w-3 h-3 bg-white rounded-full transition-all",
                                         properties.readOnly ? "ml-5" : "ml-0"
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
                         <div className="space-y-3">
                             {/* Tab strip */}
                             <div className="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg gap-0.5">
                                 {(['data', 'columns', 'buttons'] as const).map(t => (
                                     <button key={t} onClick={() => setTblTab(t)}
                                         className={cn('flex-1 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all',
                                             tblTab === t ? 'bg-white dark:bg-slate-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-400 hover:text-neutral-600')}>
                                         {t}
                                     </button>
                                 ))}
                             </div>

                             {/* Data tab */}
                             {tblTab === 'data' && (
                                 <div className="space-y-3">
                                     <div className="space-y-1.5">
                                         <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Data Source</label>
                                         <select value={properties.dataSource || ''}
                                             onChange={(e) => handleUpdate('dataSource', e.target.value)}
                                             className="w-full px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-600/20 outline-none dark:text-white">
                                             <option value="">Select a datasource...</option>
                                             {tables.length > 0 && <optgroup label="Tables">{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                                             {restApiConnectors.length > 0 && <optgroup label="REST APIs">{restApiConnectors.map(c => <option key={c.id} value={c.id}>{c.name} (API)</option>)}</optgroup>}
                                         </select>
                                     </div>
                                     <label className="flex items-center justify-between cursor-pointer py-1">
                                         <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Enable Search Bar</span>
                                         <button onClick={() => handleUpdate('enableSearch', !properties.enableSearch)}
                                             className={cn('w-10 h-5 rounded-full transition-all relative p-1', properties.enableSearch ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-slate-700')}>
                                             <div className={cn('w-3 h-3 bg-white rounded-full transition-all', properties.enableSearch ? 'ml-5' : 'ml-0')} />
                                         </button>
                                     </label>
                                     {tableFields.length > 0 && (
                                         <div className="space-y-2">
                                             <div className="flex items-center justify-between">
                                                 <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Filters</label>
                                                 <button onClick={() => handleUpdate('tableFilters', [...tableFilters, { field: '', op: 'contains', value: '' }])}
                                                     className="text-[10px] font-bold hover:underline" style={{ color: 'var(--color-primary)' }}>+ Add Filter</button>
                                             </div>
                                             {tableFilters.map((flt: any, fi: number) => (
                                                 <div key={fi} className="p-2 border border-neutral-200 dark:border-slate-700 rounded-lg space-y-1.5 bg-neutral-50 dark:bg-slate-800 relative">
                                                     <button onClick={() => handleUpdate('tableFilters', tableFilters.filter((_: any, i: number) => i !== fi))}
                                                         className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px]">✕</button>
                                                     <select value={flt.field} onChange={(e) => { const nf = [...tableFilters]; nf[fi] = { ...nf[fi], field: e.target.value }; handleUpdate('tableFilters', nf); }}
                                                         className="w-full px-2 py-1 text-xs rounded border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none dark:text-white">
                                                         <option value="">Field…</option>
                                                         {tableFields.map((f: any) => <option key={f.id} value={f.name}>{f.name}</option>)}
                                                     </select>
                                                     <div className="flex gap-1">
                                                         <select value={flt.op} onChange={(e) => { const nf = [...tableFilters]; nf[fi] = { ...nf[fi], op: e.target.value }; handleUpdate('tableFilters', nf); }}
                                                             className="flex-1 px-1 py-1 text-xs rounded border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none dark:text-white">
                                                             <option value="==">Equals</option>
                                                             <option value="contains">Contains</option>
                                                             <option value=">">Greater than</option>
                                                             <option value="<">Less than</option>
                                                         </select>
                                                         <input value={flt.value} onChange={(e) => { const nf = [...tableFilters]; nf[fi] = { ...nf[fi], value: e.target.value }; handleUpdate('tableFilters', nf); }}
                                                             placeholder="value" className="flex-1 px-2 py-1 text-xs rounded border border-neutral-200 dark:border-slate-600 bg-white dark:bg-slate-700 outline-none dark:text-white" />
                                                     </div>
                                                 </div>
                                             ))}
                                             {tableFilters.length === 0 && <p className="text-[10px] text-neutral-400 dark:text-slate-500 italic">No filters — all records shown.</p>}
                                         </div>
                                     )}
                                 </div>
                             )}

                             {/* Columns tab */}
                             {tblTab === 'columns' && (
                                 <div className="space-y-2">
                                     {tableFields.length === 0 ? (
                                         <p className="text-[11px] text-neutral-400 dark:text-slate-500 italic py-2">Select a data source first to configure columns.</p>
                                     ) : (
                                         <>
                                             <div className="flex items-center justify-between mb-1">
                                                 <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Visible Fields</label>
                                                 <div className="flex gap-2">
                                                     <button onClick={() => handleUpdate('visibleFields', tableFields.map((f: any) => f.id))} className="text-[9px] font-bold uppercase tracking-wider hover:underline" style={{ color: 'var(--color-primary)' }}>All</button>
                                                     <span className="text-[9px] text-neutral-400">/</span>
                                                     <button onClick={() => handleUpdate('visibleFields', [])} className="text-[9px] font-bold uppercase tracking-wider hover:underline text-neutral-400">None</button>
                                                 </div>
                                             </div>
                                             <div className="rounded-lg border border-neutral-200 dark:border-slate-700 overflow-hidden">
                                                 {tableFields.map((f: any) => {
                                                     const isVisible = visibleFieldIds.includes(f.id);
                                                     return (
                                                         <label key={f.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-800 border-b border-neutral-100 dark:border-slate-700/50 last:border-0 transition-colors">
                                                             <input type="checkbox" checked={isVisible}
                                                                 onChange={() => {
                                                                     const next = isVisible ? visibleFieldIds.filter((id: string) => id !== f.id) : [...visibleFieldIds, f.id];
                                                                     handleUpdate('visibleFields', next);
                                                                 }}
                                                                 className="w-3.5 h-3.5 rounded" style={{ accentColor: 'var(--color-primary)' }} />
                                                             <div className="flex-1 min-w-0">
                                                                 <span className="text-xs font-medium dark:text-slate-300 truncate block">{f.name}</span>
                                                                 <span className="text-[9px] text-neutral-400 font-mono">{f.type}</span>
                                                             </div>
                                                             {isVisible && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />}
                                                         </label>
                                                     );
                                                 })}
                                             </div>
                                         </>
                                     )}
                                 </div>
                             )}

                             {/* Buttons tab */}
                             {tblTab === 'buttons' && (
                                 <div className="space-y-3">
                                     <div className="flex items-center justify-between">
                                         <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">Row Buttons</label>
                                         <button onClick={() => handleUpdate('rowButtons', [...(properties.rowButtons || []), { label: 'View', position: 'end', color: '#1A56DB', action: 'nothing' }])}
                                             className="text-[10px] font-bold hover:underline" style={{ color: 'var(--color-primary)' }}>+ Add Button</button>
                                     </div>
                                     {(properties.rowButtons || []).length === 0 && <p className="text-[10px] text-neutral-400 dark:text-slate-500 italic">No row buttons configured.</p>}
                                     {(properties.rowButtons || []).map((btn: any, bi: number) => {
                                         const updateBtn = (patch: any) => {
                                             const nb = [...(properties.rowButtons || [])];
                                             nb[bi] = { ...nb[bi], ...patch };
                                             handleUpdate('rowButtons', nb);
                                         };
                                         return (
                                         <div key={bi} className="p-3 border border-neutral-200 dark:border-slate-700 rounded-xl space-y-2.5 bg-neutral-50 dark:bg-slate-800">
                                             {/* Line 1: label + delete */}
                                             <div className="flex gap-1 items-center">
                                                 <input placeholder="Label" value={btn.label || ''} onChange={(e) => updateBtn({ label: e.target.value })}
                                                     className="flex-1 px-2 py-1.5 text-xs border border-neutral-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none dark:text-white font-bold" />
                                                 <button onClick={() => handleUpdate('rowButtons', (properties.rowButtons || []).filter((_: any, i: number) => i !== bi))} className="text-rose-400 hover:text-rose-600 shrink-0">
                                                     <Minus className="w-3 h-3" />
                                                 </button>
                                             </div>
                                             {/* Line 2: position + colour */}
                                             <div className="flex gap-2 items-center">
                                                 <select value={btn.position || 'end'} onChange={(e) => updateBtn({ position: e.target.value })}
                                                     className="flex-1 px-1 py-1.5 text-xs border border-neutral-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none dark:text-white">
                                                     <option value="start">Start</option>
                                                     <option value="end">End</option>
                                                 </select>
                                                 <div className="flex items-center gap-1.5">
                                                     <label className="text-[10px] font-semibold text-neutral-500">Colour</label>
                                                     <input type="color" value={btn.color || '#1A56DB'} onChange={(e) => updateBtn({ color: e.target.value })}
                                                         className="w-7 h-7 rounded cursor-pointer border border-neutral-200 p-0.5 bg-transparent shrink-0" />
                                                 </div>
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Button Action</label>
                                                 <select value={btn.action || 'nothing'} onChange={(e) => updateBtn({ action: e.target.value })}
                                                     className="w-full px-2 py-1.5 text-xs border border-neutral-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none dark:text-white">
                                                     <option value="nothing">Do Nothing</option>
                                                     <option value="app">Go To Application</option>
                                                     <option value="url">Go To URL</option>
                                                     <option value="workflow">Trigger Workflow</option>
                                                 </select>
                                             </div>
                                             {btn.action === 'app' && (
                                                 <div className="space-y-2">
                                                     <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Target Application</label>
                                                     <select value={btn.targetAppId || ''} onChange={(e) => updateBtn({ targetAppId: e.target.value, paramMappings: [] })}
                                                         className="w-full px-2 py-1.5 text-xs border border-neutral-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none dark:text-white">
                                                         <option value="">Select application…</option>
                                                         {allApps.filter(a => a.id !== currentAppId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                     </select>
                                                     {btn.targetAppId && (
                                                         <div className="border-t border-neutral-200 dark:border-slate-700 pt-2">
                                                             <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">Field Mapping</p>
                                                             <AppFieldMapper targetAppId={btn.targetAppId} workspaceId={selectedProjectId || ''}
                                                                 sourceComponents={components} sourceAppData={currentAppData}
                                                                 mappings={btn.paramMappings || []} onChange={(m) => updateBtn({ paramMappings: m })} />
                                                         </div>
                                                     )}
                                                 </div>
                                             )}
                                             {btn.action === 'url' && (
                                                 <div className="space-y-1">
                                                     <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">URL</label>
                                                     <input type="url" placeholder="https://example.com?id={{row.id}}" value={btn.targetUrl || ''} onChange={(e) => updateBtn({ targetUrl: e.target.value })}
                                                         className="w-full px-2 py-1.5 text-xs border border-neutral-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none font-mono dark:text-white" />
                                                     <p className="text-[9px] text-neutral-400 italic">Use <code>{"{{row.fieldName}}"}</code> to insert row values.</p>
                                                 </div>
                                             )}
                                             {btn.action === 'workflow' && (
                                                 <div className="space-y-1">
                                                     <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Workflow</label>
                                                     <AfterActionWorkflowPicker value={btn.workflowId || ''} onChange={(id) => updateBtn({ workflowId: id })} selectedProjectId={selectedProjectId} />
                                                     <p className="text-[9px] text-neutral-400 italic">Workflow fires with the row's data as context payload.</p>
                                                 </div>
                                             )}
                                         </div>
                                         );
                                     })}
                                 </div>
                             )}
                         </div>
                         );
                     })()}

                     {['bar_chart', 'line_chart', 'pie_chart'].includes(type) && (
                         <div className="space-y-3">
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Data Source</label>
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
                                         <label className="text-[11px] font-semibold text-neutral-600">Chart Colour</label>
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
                                     <label className="text-[11px] font-semibold text-neutral-600">Pie Colours (comma-separated)</label>
                                     <input type="text" value={properties.chartColors || '#1A56DB,#0EA5E9,#34D399,#F59E0B,#EF4444'}
                                         onChange={(e) => handleUpdate('chartColors', e.target.value)}
                                         placeholder="#1A56DB,#0EA5E9,..." className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 border border-neutral-200 rounded-lg outline-none" />
                                 </div>
                             )}
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Chart Background</label>
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
                                 <label className="text-[11px] font-semibold text-neutral-600">Sections</label>
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
                                 <label className="text-[11px] font-semibold text-neutral-600">Tabs</label>
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

                     {type === 'image' && (
                         <div className="space-y-4">
                             {/* Upload */}
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Upload Image</label>
                                 <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-200 rounded-xl p-4 cursor-pointer hover:border-primary-400 hover:bg-primary-50/20 transition-all">
                                     <Upload className="w-5 h-5 text-neutral-400" />
                                     <span className="text-xs text-neutral-500 font-medium">
                                         {properties.src ? 'Image set — click to change' : 'Click to upload an image'}
                                     </span>
                                     <input
                                         type="file"
                                         accept="image/*"
                                         className="hidden"
                                         onChange={(e) => {
                                             const file = e.target.files?.[0];
                                             if (!file) return;
                                             const reader = new FileReader();
                                             reader.onload = (ev) => handleUpdate('src', ev.target?.result as string);
                                             reader.readAsDataURL(file);
                                         }}
                                     />
                                 </label>
                             </div>
                             {/* URL fallback */}
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">— or — Image URL</label>
                                 <input
                                     type="url"
                                     placeholder="https://example.com/image.png"
                                     value={properties.src?.startsWith('data:') ? '' : (properties.src || '')}
                                     onChange={(e) => handleUpdate('src', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs outline-none font-mono"
                                 />
                             </div>
                             {properties.src && (
                                 <div className="rounded-xl overflow-hidden border border-neutral-200" style={{ height: 100 }}>
                                     <img src={properties.src} alt="" className="w-full h-full object-cover" />
                                 </div>
                             )}
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Alt Text</label>
                                 <input
                                     placeholder="Descriptive alt text"
                                     value={properties.alt || ''}
                                     onChange={(e) => handleUpdate('alt', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none"
                                 />
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Object Fit</label>
                                 <select
                                     value={properties.fit || 'cover'}
                                     onChange={(e) => handleUpdate('fit', e.target.value)}
                                     className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none"
                                 >
                                     <option value="cover">Cover (fill, crop)</option>
                                     <option value="contain">Contain (letterbox)</option>
                                     <option value="fill">Stretch</option>
                                     <option value="none">None (original size)</option>
                                 </select>
                             </div>
                             {properties.src && (
                                 <button
                                     onClick={() => handleUpdate('src', '')}
                                     className="text-xs text-rose-500 hover:underline font-bold"
                                 >
                                     Remove image
                                 </button>
                             )}
                         </div>
                     )}

                     {type === 'badge' && (
                         <div className="space-y-4">
                             {/* Tags */}
                             <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                     <label className="text-[11px] font-semibold text-neutral-600">Tags</label>
                                     <button
                                         onClick={() => handleUpdate('tags', [...(properties.tags || []), { label: 'New Tag' }])}
                                         className="text-[10px] font-bold text-primary-600 hover:underline"
                                     >+ Add</button>
                                 </div>
                                 {(properties.tags || []).map((tag: any, ti: number) => (
                                     <div key={ti} className="flex gap-1 items-center">
                                         <input
                                             value={tag.label || ''}
                                             placeholder="Tag label"
                                             onChange={(e) => {
                                                 const t = [...(properties.tags || [])];
                                                 t[ti] = { ...t[ti], label: e.target.value };
                                                 handleUpdate('tags', t);
                                             }}
                                             className="flex-1 px-2 py-1.5 text-xs border border-neutral-200 rounded-lg bg-neutral-50 outline-none"
                                         />
                                         <button
                                             onClick={() => handleUpdate('tags', (properties.tags || []).filter((_: any, i: number) => i !== ti))}
                                             className="p-1 text-rose-400 hover:text-rose-600"
                                         ><Minus className="w-3 h-3" /></button>
                                     </div>
                                 ))}
                             </div>
                             {/* Style */}
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Variant</label>
                                 <div className="flex gap-2">
                                     {['solid', 'soft', 'outline'].map(v => (
                                         <button
                                             key={v}
                                             onClick={() => handleUpdate('variant', v)}
                                             className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all capitalize ${properties.variant === v ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}
                                         >{v}</button>
                                     ))}
                                 </div>
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Size</label>
                                 <div className="flex gap-2">
                                     {['sm','md','lg'].map(s => (
                                         <button
                                             key={s}
                                             onClick={() => handleUpdate('size', s)}
                                             className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all uppercase ${properties.size === s ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}
                                         >{s}</button>
                                     ))}
                                 </div>
                             </div>
                             <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Badge Colour</label>
                                 <div className="flex gap-2 items-center">
                                     <input type="color" value={properties.color || '#1A56DB'} onChange={(e) => handleUpdate('color', e.target.value)} className="w-9 h-9 rounded-lg border border-neutral-200 cursor-pointer p-0.5 bg-transparent" />
                                     <input value={properties.color || '#1A56DB'} onChange={(e) => handleUpdate('color', e.target.value)} className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-mono outline-none" />
                                 </div>
                             </div>
                             {properties.variant === 'solid' && (
                                 <div className="space-y-1.5">
                                     <label className="text-[11px] font-semibold text-neutral-600">Text Colour</label>
                                     <div className="flex gap-2 items-center">
                                         <input type="color" value={properties.textColor || '#ffffff'} onChange={(e) => handleUpdate('textColor', e.target.value)} className="w-9 h-9 rounded-lg border border-neutral-200 cursor-pointer p-0.5 bg-transparent" />
                                         <input value={properties.textColor || '#ffffff'} onChange={(e) => handleUpdate('textColor', e.target.value)} className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-mono outline-none" />
                                     </div>
                                 </div>
                             )}
                             {/* Preview */}
                             <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                                 <p className="text-[9px] text-neutral-400 uppercase font-bold mb-2 tracking-widest">Preview</p>
                                 <div className="flex gap-1.5 flex-wrap">
                                     {(properties.tags || [{ label: properties.label || 'Badge' }]).map((tag: any, i: number) => {
                                         const v = properties.variant || 'solid';
                                         const c = properties.color || '#1A56DB';
                                         const tc = v === 'solid' ? (properties.textColor || '#fff') : c;
                                         const bg = v === 'solid' ? c : `${c}20`;
                                         const bd = v === 'outline' ? `1.5px solid ${c}` : 'none';
                                         return <span key={i} className="inline-flex items-center font-bold rounded-full text-xs px-3 py-1" style={{ background: bg, color: tc, border: bd }}>{tag.label || tag}</span>;
                                     })}
                                 </div>
                             </div>
                         </div>
                     )}

                     {type === 'toggle' && (
                         <div className="space-y-4">
                              <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-neutral-600">Options (comma separated)</label>
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
                         <div className="space-y-3">
                             <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 gap-0.5">
                                 {(['manual', 'table'] as const).map(mode => (
                                     <button key={mode} type="button"
                                         onClick={() => handleUpdate('optionsMode', mode)}
                                         className={cn('flex-1 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all',
                                             (properties.optionsMode || 'manual') === mode
                                                 ? 'bg-white dark:bg-slate-700 shadow-sm text-neutral-900 dark:text-white'
                                                 : 'text-neutral-400 hover:text-neutral-600')}>
                                         {mode === 'manual' ? 'Manual' : 'Table Data'}
                                     </button>
                                 ))}
                             </div>

                             {(properties.optionsMode || 'manual') === 'manual' && (
                                 <div className="space-y-2">
                                     <label className="text-[11px] font-semibold text-neutral-600">Options</label>
                                     <div className="space-y-1.5">
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

                             {properties.optionsMode === 'table' && (
                                 <div className="space-y-2 p-3 bg-neutral-50 dark:bg-slate-800/50 border border-neutral-200 dark:border-slate-700 rounded-xl animate-in slide-in-from-top-2">
                                     <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Table Data Source</label>
                                     <select
                                         value={properties.optionsTableId || ''}
                                         onChange={(e) => handleUpdate('optionsTableId', e.target.value)}
                                         className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-lg text-xs outline-none dark:text-white"
                                     >
                                         <option value="">Select table…</option>
                                         {availableFields && currentAppData?.dataSourceId
                                             ? [{ id: currentAppData.dataSourceId, name: 'Current Table' }].concat(
                                                 (window as any).__nexusTables?.filter((t: any) => t.id !== currentAppData.dataSourceId) || []
                                               ).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)
                                             : null}
                                     </select>
                                     {properties.optionsTableId && (
                                         <>
                                             <div className="grid grid-cols-2 gap-2 mt-1">
                                                 <div>
                                                     <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Label Field</label>
                                                     <select
                                                         value={properties.optionsLabelField || ''}
                                                         onChange={(e) => handleUpdate('optionsLabelField', e.target.value)}
                                                         className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded text-xs outline-none dark:text-white"
                                                     >
                                                         <option value="">Select field…</option>
                                                         {availableFields.map((f: any) => <option key={f.id} value={f.name}>{f.name}</option>)}
                                                     </select>
                                                 </div>
                                                 <div>
                                                     <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-1">Value Field</label>
                                                     <select
                                                         value={properties.optionsValueField || ''}
                                                         onChange={(e) => handleUpdate('optionsValueField', e.target.value)}
                                                         className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded text-xs outline-none dark:text-white"
                                                     >
                                                         <option value="">Select field…</option>
                                                         {availableFields.map((f: any) => <option key={f.id} value={f.name}>{f.name}</option>)}
                                                     </select>
                                                 </div>
                                             </div>
                                             <p className="text-[9px] text-neutral-400 italic mt-1">Unique label/value pairs from this table will populate the dropdown at runtime.</p>
                                         </>
                                     )}
                                 </div>
                             )}
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

// ── AfterActionWorkflowPicker ─────────────────────────────────────────────────
// Loads active workflows from Firestore and presents them in a select
function AfterActionWorkflowPicker({ value, onChange, selectedProjectId }: { value: string; onChange: (id: string) => void; selectedProjectId: string | null }) {
    const [workflows, setWorkflows] = useState<any[]>([]);
    useEffect(() => {
        if (!selectedProjectId) return;
        const q = query(collection(db, 'workspaces', selectedProjectId, 'workflows'));
        const unsub = onSnapshot(q, snap => {
            setWorkflows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, () => {});
        return () => unsub();
    }, [selectedProjectId]);

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-neutral-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none dark:text-white"
        >
            <option value="">Select workflow…</option>
            {workflows.map(wf => (
                <option key={wf.id} value={wf.id}>{wf.name || 'Untitled Workflow'} {wf.status === 'active' ? '✓' : '(draft)'}</option>
            ))}
        </select>
    );
}
