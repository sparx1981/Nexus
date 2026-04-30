import React, { useState } from 'react';
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
    Move
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function AppBuilder() {
    const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    
    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Left Palette */}
            <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-neutral-200">
                    <h3 className="font-bold text-neutral-900 text-sm">Components</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <section>
                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Layout</h4>
                        <div className="grid grid-cols-2 gap-2">
                             <PaletteItem icon={<Layout className="w-4 h-4" />} label="Container" />
                             <PaletteItem icon={<Layers className="w-4 h-4" />} label="Section" />
                        </div>
                    </section>
                    <section>
                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Inputs</h4>
                        <div className="grid grid-cols-2 gap-2">
                             <PaletteItem icon={<Type className="w-4 h-4" />} label="Input" />
                             <PaletteItem icon={<MousePointer2 className="w-4 h-4" />} label="Button" />
                        </div>
                    </section>
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
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors">
                            <Play className="w-4 h-4" /> Preview
                        </button>
                        <button className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-md hover:bg-opacity-90 shadow-sm transition-all">
                            <Zap className="w-4 h-4" /> Publish
                        </button>
                    </div>
                </div>

                {/* The Virtual Canvas */}
                <div className="flex-1 overflow-auto p-12 flex justify-center items-start pattern-grid">
                    <div 
                        className={cn(
                            "bg-white shadow-2xl transition-all duration-300 min-h-[600px] border border-neutral-200 relative",
                            viewMode === 'desktop' && "w-full max-w-5xl",
                            viewMode === 'tablet' && "w-[768px]",
                            viewMode === 'mobile' && "w-[375px]"
                        )}
                    >
                        {/* Canvas Header/Status Bar */}
                        <div className="absolute -top-8 left-0 text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex gap-4">
                            <span>Main Screen</span>
                            <span>•</span>
                            <span>7 Components</span>
                        </div>

                        {/* Empty State / Drop Zone */}
                        <div className="absolute inset-0 flex items-center justify-center border-4 border-dashed border-neutral-100 m-8">
                             <div className="text-center">
                                 <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-200">
                                     <Plus className="w-6 h-6 text-neutral-300" />
                                 </div>
                                 <p className="text-neutral-400 text-sm">Drag components here to build your UI</p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Properties Panel */}
            <aside className="w-72 bg-white border-l border-neutral-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                    <h3 className="font-bold text-neutral-900 text-sm">Properties</h3>
                    <Settings2 className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="p-8 text-center">
                    <div className="inline-flex p-3 bg-neutral-50 rounded-full mb-4">
                        <MousePointer2 className="w-6 h-6 text-neutral-300" />
                    </div>
                    <p className="text-xs text-neutral-500">Select an element on the canvas to edit its properties and data bindings.</p>
                </div>
            </aside>
        </div>
    );
}

function PaletteItem({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex flex-col items-center gap-2 p-3 bg-neutral-50 border border-neutral-100 rounded-xl hover:border-primary-600 hover:bg-white hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group">
            <div className="text-neutral-400 group-hover:text-primary-600 transition-colors">
                {icon}
            </div>
            <span className="text-[10px] font-medium text-neutral-600">{label}</span>
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
