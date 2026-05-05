import React, { useState } from 'react';
import { 
    X, 
    Plus, 
    Save, 
    Settings2, 
    LayoutGrid, 
    BarChart3, 
    TrendingUp, 
    Database, 
    Type,
    ArrowLeft,
    PieChart as PieIcon,
    Table as TableIcon,
    Hash,
    Image as ImageIcon
} from 'lucide-react';
import { Dashboard, DashboardCard, DashboardCardType } from '../../types/dashboard';
import { cn } from '../../lib/utils';
import { useSchemaStore } from '../../store/schemaStore';

import { useDashboardStore } from '../../store/dashboardStore';
import { FieldType } from '../../types';

interface DashboardDesignerProps {
    dashboard: Dashboard;
    onClose: () => void;
}

export const DashboardDesigner = ({ dashboard, onClose }: DashboardDesignerProps) => {
    const { updateDashboard, addCard, updateCard, deleteCard } = useDashboardStore();
    const { tables, restApiConnectors } = useSchemaStore();
    const getApis = restApiConnectors.filter((c: any) => c.method === 'GET');
    const [editingCardId, setEditingCardId] = useState<string | null>(null);

    const handleAddCard = async (type: any) => {
        const id = `card_${Date.now()}`;
        const newCard: DashboardCard = {
            id,
            type,
            title: `New ${type.toUpperCase()}`,
            dataSourceId: '',
            config: {}
        };
        await addCard(dashboard.id, newCard);
        setEditingCardId(id);
    };

    const editingCard = dashboard.cards.find(c => c.id === editingCardId);

    return (
        <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-[#050505] overflow-hidden relative">
            <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0A0A0A] flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
                    <div>
                        <input 
                            value={dashboard.name}
                            onChange={(e) => updateDashboard(dashboard.id, { name: e.target.value })}
                            className="text-lg font-black text-neutral-900 dark:text-white bg-transparent outline-none w-64"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 gap-1">
                        {([
                            { type: 'kpi',   icon: <Hash className="w-3.5 h-3.5" />,      label: 'KPI'    },
                            { type: 'bar',   icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Bar'    },
                            { type: 'line',  icon: <TrendingUp className="w-3.5 h-3.5" />,label: 'Line'   },
                            { type: 'pie',   icon: <PieIcon className="w-3.5 h-3.5" />,   label: 'Pie'    },
                            { type: 'table', icon: <TableIcon className="w-3.5 h-3.5" />, label: 'Table'  },
                        ] as const).map(({ type, icon, label }) => (
                            <button
                                key={type}
                                onClick={() => handleAddCard(type)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white dark:hover:bg-black text-neutral-400 hover:text-primary-600 transition-all active:scale-90 text-[10px] font-black uppercase tracking-wider"
                                title={`Add ${label} widget`}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto p-12 relative pattern-dots dark:pattern-dots-dark">
                    {dashboard.cards.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <Plus className="w-12 h-12 text-neutral-300 mb-4" />
                            <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Add widgets from the toolbar</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                            {dashboard.cards.map(card => (
                                <div 
                                    key={card.id}
                                    onClick={() => setEditingCardId(card.id)}
                                    className={cn(
                                        "relative group cursor-pointer transition-all",
                                        editingCardId === card.id ? "ring-2 ring-primary-600 ring-offset-4 dark:ring-offset-black rounded-2xl" : "hover:ring-2 hover:ring-neutral-200 dark:hover:ring-neutral-800 hover:ring-offset-4 dark:hover:ring-offset-black rounded-2xl"
                                    )}
                                >
                                    <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm min-h-[240px] flex flex-col justify-center items-center text-center">
                                        <div className="p-4 bg-neutral-50 dark:bg-black rounded-2xl text-neutral-300 mb-4 border border-neutral-100 dark:border-neutral-800">
                                             {card.type === 'kpi' && <Hash className="w-8 h-8" />}
                                             {card.type === 'bar' && <BarChart3 className="w-8 h-8" />}
                                             {card.type === 'line' && <TrendingUp className="w-8 h-8" />}
                                             {card.type === 'pie' && <PieIcon className="w-8 h-8" />}
                                             {card.type === 'table' && <TableIcon className="w-8 h-8" />}
                                        </div>
                                        <h4 className="font-black text-neutral-900 dark:text-white mb-1 uppercase text-xs tracking-widest">{card.title}</h4>
                                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">
                                            {card.dataSourceId ? `Connected to ${tables.find(t => t.id === card.dataSourceId)?.name}` : 'No Data Source'}
                                        </p>
                                    </div>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteCard(dashboard.id, card.id);
                                        }}
                                        className="absolute -top-3 -right-3 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                <aside className={cn(
                    "w-80 bg-white dark:bg-[#0A0A0A] border-l border-neutral-200 dark:border-neutral-800 transition-all duration-300 overflow-hidden shrink-0",
                    !editingCard ? "translate-x-full" : "translate-x-0"
                )}>
                    {editingCard && (
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-black/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-primary-600 font-black" />
                                    <h3 className="font-extrabold text-neutral-900 dark:text-white uppercase text-[10px] tracking-widest">Configuration</h3>
                                </div>
                                <button onClick={() => setEditingCardId(null)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md">
                                    <X className="w-4 h-4 text-neutral-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <div className="space-y-4">
                                     <h4 className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] border-b border-neutral-50 dark:border-neutral-900 pb-2">Properties</h4>
                                     <div className="space-y-2">
                                         <label className="text-[10px] font-bold text-neutral-500 uppercase">Widget Name</label>
                                         <input 
                                             value={editingCard.title}
                                             onChange={(e) => updateCard(dashboard.id, editingCard.id, { title: e.target.value })}
                                             className="w-full px-4 py-2 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary-100 outline-none dark:text-white"
                                         />
                                     </div>
                                </div>

                                <div className="space-y-4">
                                     <h4 className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] border-b border-neutral-50 dark:border-neutral-900 pb-2">Data Origin</h4>
                                     <div className="space-y-2">
                                         <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-2">
                                             <Database className="w-3 h-3" /> Select Source
                                         </label>
                                         <select 
                                             value={editingCard.dataSourceId}
                                             onChange={(e) => updateCard(dashboard.id, editingCard.id, { dataSourceId: e.target.value })}
                                             className="w-full px-4 py-2 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold outline-none dark:text-white"
                                         >
                                             <option value="">Choose data source...</option>
                                             {tables.length > 0 && <optgroup label="Tables">{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                                             {getApis.length > 0 && <optgroup label="REST APIs (GET)">{getApis.map((c: any) => <option key={c.id} value={c.id}>{c.name} (API)</option>)}</optgroup>}
                                         </select>
                                     </div>

                                     {editingCard.dataSourceId && (
                                         <div className="p-4 bg-primary-50/30 dark:bg-primary-950/20 rounded-2xl border border-primary-100 dark:border-primary-900/30 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Dimension (X-Axis)</label>
                                                <select 
                                                    value={editingCard.config?.fieldX}
                                                    onChange={(e) => updateCard(dashboard.id, editingCard.id, { config: { ...editingCard.config, fieldX: e.target.value } })}
                                                    className="w-full px-4 py-2 bg-white dark:bg-black border border-primary-100 dark:border-primary-900/30 rounded-xl text-xs font-bold outline-none dark:text-white"
                                                >
                                                    <option value="">Select dimension...</option>
                                                    {tables.find(t => t.id === editingCard.dataSourceId)?.fields.map(f => (
                                                        <option key={f.id} value={f.name}>{f.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {editingCard.type !== 'table' && editingCard.type !== 'kpi' && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Measure (Y-Axis)</label>
                                                    <select 
                                                        value={editingCard.config?.fieldY}
                                                        onChange={(e) => updateCard(dashboard.id, editingCard.id, { config: { ...editingCard.config, fieldY: e.target.value } })}
                                                        className="w-full px-4 py-2 bg-white dark:bg-black border border-primary-100 dark:border-primary-900/30 rounded-xl text-xs font-bold outline-none dark:text-white"
                                                    >
                                                        <option value="">Select measure...</option>
                                                        {tables.find(t => t.id === editingCard.dataSourceId)?.fields.map(f => (
                                                            <option key={f.id} value={f.name}>{f.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {editingCard.type === 'kpi' && (
                                                 <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">Metric</label>
                                                    <select 
                                                        value={editingCard.config?.kpiField}
                                                        onChange={(e) => updateCard(dashboard.id, editingCard.id, { config: { ...editingCard.config, kpiField: e.target.value } })}
                                                        className="w-full px-4 py-2 bg-white dark:bg-black border border-primary-100 dark:border-primary-900/30 rounded-xl text-xs font-bold outline-none dark:text-white"
                                                    >
                                                        <option value="">Record Count</option>
                                                        {tables.find(t => t.id === editingCard.dataSourceId)?.fields.filter(f => f.type === FieldType.NUMBER).map(f => (
                                                            <option key={f.id} value={f.name}>Sum of {f.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                         </div>
                                     )}
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

