import React, { useState, useEffect } from 'react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    LineChart, 
    Line, 
    PieChart, 
    Pie, 
    Cell 
} from 'recharts';
import { TrendingUp, Users, DollarSign, Target, Database, MoreVertical, Trash2, Edit2, PieChart as PieChartIcon, Table as TableIcon } from 'lucide-react';
import { DashboardCard as ICard } from '../../types/dashboard';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { useSchemaStore } from '../../store/schemaStore';

const COLORS = ['#1A56DB', '#059669', '#D97706', '#DC2626', '#7C3AED'];

export const DashboardCard = ({ card, onEdit, onDelete, isExpanded }: { card: ICard, onEdit?: () => void, onDelete?: () => void, isExpanded?: boolean }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { selectedProjectId } = useAuthStore();
    const { tables } = useSchemaStore();

    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedProjectId || !card.dataSourceId) {
                setLoading(false);
                return;
            }

            try {
                // Internal tables use 'tableData/{id}/rows'
                const q = query(
                    collection(db, 'workspaces', selectedProjectId, 'tableData', card.dataSourceId, 'rows'),
                    limit(200)
                );
                const snap = await getDocs(q);
                let records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // If no records found in tableData, check if it's in datasources (legacy or specifically configured)
                if (records.length === 0) {
                    const altQ = query(
                        collection(db, 'workspaces', selectedProjectId, 'datasources', card.dataSourceId, 'records'),
                        limit(200)
                    );
                    const altSnap = await getDocs(altQ);
                    records = altSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }
                
                setData(records);
            } catch (e) {
                console.error('Error fetching dashboard card data:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        setPage(0); // Reset page when config change or data source changes
    }, [selectedProjectId, card.dataSourceId, JSON.stringify(card.config)]);

    const renderChart = () => {
        if (loading) return (
            <div className="h-full flex flex-col gap-2 justify-center animate-pulse">
                <div className="h-4 bg-neutral-100 rounded w-1/3 mx-auto"></div>
                <div className="h-24 bg-neutral-50 rounded-xl"></div>
            </div>
        );

        if (data.length === 0) return (
            <div className="h-full flex items-center justify-center text-neutral-400 text-xs italic">
                No data available for this chart.
            </div>
        );

        switch (card.type) {
            case 'kpi': {
                const op = card.config.kpiOperation || 'count';
                const field = card.config.kpiField;
                let kpiValue: any = '-';

                if (op === 'count') {
                    kpiValue = data.length;
                } else if (field) {
                    const values = data.map(d => d[field]).filter(v => v !== undefined && v !== null);
                    if (values.length > 0) {
                        switch (op) {
                            case 'sum':
                                kpiValue = values.reduce((a, b) => Number(a) + Number(b), 0);
                                break;
                            case 'avg':
                                kpiValue = (values.reduce((a, b) => Number(a) + Number(b), 0) / values.length).toFixed(1);
                                break;
                            case 'max':
                                kpiValue = Math.max(...values.map(v => Number(v)));
                                break;
                            case 'min':
                                kpiValue = Math.min(...values.map(v => Number(v)));
                                break;
                            case 'days_since': {
                                const lastDate = new Date(values.sort().reverse()[0]);
                                if (!isNaN(lastDate.getTime())) {
                                    const diff = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                                    kpiValue = diff;
                                }
                                break;
                            }
                            case 'days_between': {
                                const fieldB = card.config.fieldB;
                                if (fieldB) {
                                    const differences = data.map(d => {
                                        const start = new Date(d[field]);
                                        const end = new Date(d[fieldB]);
                                        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
                                        return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                    }).filter(v => v !== null) as number[];

                                    if (differences.length > 0) {
                                        kpiValue = (differences.reduce((a, b) => a + b, 0) / differences.length).toFixed(0);
                                    }
                                } else {
                                    // Fallback to range of one field if fieldB not set
                                    const sorted = values.map(v => new Date(v).getTime()).filter(t => !isNaN(t)).sort();
                                    if (sorted.length >= 2) {
                                        const diff = Math.floor((sorted[sorted.length - 1] - sorted[0]) / (1000 * 60 * 60 * 24));
                                        kpiValue = diff;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }

                return (
                    <div className={cn("h-full flex flex-col justify-center transition-all duration-300", isExpanded ? "items-center" : "")}>
                        <h4 className={cn("font-black text-neutral-900 dark:text-white tracking-tight tabular-nums transition-all", isExpanded ? "text-8xl" : "text-3xl")}>{kpiValue}</h4>
                        <div className={cn("flex items-center gap-1.5 mt-2 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 w-fit px-2 py-0.5 rounded-full", isExpanded ? "text-base px-4 py-1.5 mt-8" : "text-[10px]")}>
                            <TrendingUp className="w-3 h-3" />
                            {op.toUpperCase()} {field && `(${field})`}
                        </div>
                    </div>
                );
            }

            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.slice(0, 50)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis 
                                dataKey={card.config.fieldX || 'id'} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fill: '#9CA3AF' }} 
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey={card.config.fieldY || 'value'} fill={card.config.color || '#1A56DB'} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.slice(0, 50)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis 
                                dataKey={card.config.fieldX || 'id'} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fill: '#9CA3AF' }} 
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Line type="monotone" dataKey={card.config.fieldY || 'value'} stroke={card.config.color || '#1A56DB'} strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                // Simple grouping for pie
                const pieData = data.reduce((acc: any[], item) => {
                    const key = card.config.fieldX ? item[card.config.fieldX] : 'Default';
                    const existing = acc.find(a => a.name === key);
                    if (existing) existing.value++;
                    else acc.push({ name: key, value: 1 });
                    return acc;
                }, []);

                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData.slice(0, 10)}
                                innerRadius="40%"
                                outerRadius="80%"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case 'table': {
                const table = tables.find(t => t.id === card.dataSourceId);
                const fields = card.config.tableFields?.length 
                    ? card.config.tableFields 
                    : (data[0] ? Object.keys(data[0]).filter(k => !k.startsWith('_')).slice(0, 4) : []);
                
                const paginatedData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
                const totalPages = Math.ceil(data.length / PAGE_SIZE);
                const headerBg = card.config.headerBg || '#1A56DB';

                return (
                    <div className="h-full flex flex-col min-h-0">
                        <div className="flex-1 overflow-auto text-[11px] scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
                             <table className="w-full text-left">
                                <thead className="sticky top-0 border-b border-neutral-100 dark:border-neutral-800 z-10 transition-colors" style={{ backgroundColor: headerBg }}>
                                    <tr>
                                        {fields.map(f => {
                                            const fieldDef = table?.fields.find(fd => fd.name === f);
                                            const header = fieldDef?.description || f;
                                            return (
                                                <th key={f} className="py-2.5 font-black uppercase tracking-widest px-2 whitespace-nowrap text-white opacity-90">{header}</th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-50 dark:divide-neutral-900">
                                    {paginatedData.map((row, i) => (
                                        <tr key={i} className="hover:bg-neutral-50/50 dark:hover:bg-white/5 transition-colors">
                                            {fields.map(f => (
                                                <td key={f} className="py-2.5 text-neutral-600 dark:text-neutral-300 font-medium px-2 truncate max-w-[150px]" title={row[f]?.toString()}>
                                                    {row[f]?.toString() || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                        
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pb-2 border-t border-neutral-50 dark:border-neutral-900 pt-4 px-2">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
                                    Page {page + 1} of {totalPages} ({data.length} records)
                                </p>
                                <div className="flex gap-2">
                                    <button 
                                        disabled={page === 0}
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        className="p-1 px-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-30 hover:text-primary-600 transition-colors"
                                    >
                                        Prev
                                    </button>
                                    <button 
                                        disabled={page >= totalPages - 1}
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        className="p-1 px-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-30 hover:text-primary-600 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full min-h-0">
            {renderChart()}
        </div>
    );
};
