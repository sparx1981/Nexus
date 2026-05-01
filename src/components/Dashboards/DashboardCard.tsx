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
import { TrendingUp, Users, DollarSign, Target, Database, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { DashboardCard as ICard } from '../../types/dashboard';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';

const COLORS = ['#1A56DB', '#059669', '#D97706', '#DC2626', '#7C3AED'];

export const DashboardCard = ({ card, onEdit, onDelete }: { card: ICard, onEdit?: () => void, onDelete?: () => void }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { selectedProjectId } = useAuthStore();

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedProjectId || !card.dataSourceId) {
                setLoading(false);
                return;
            }

            try {
                const q = query(
                    collection(db, 'workspaces', selectedProjectId, 'datasources', card.dataSourceId, 'records'),
                    limit(50)
                );
                const snap = await getDocs(q);
                const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Simple transformation logic: count by fieldX if needed, or just use raw for now
                // REAL implementation would likely aggregate based on card.config.operation
                setData(records);
            } catch (e) {
                console.error('Error fetching dashboard card data:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedProjectId, card.dataSourceId]);

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
            case 'kpi':
                const kpiValue = card.config.kpiField ? (data[0]?.[card.config.kpiField] || '0') : data.length;
                return (
                    <div className="h-full flex flex-col justify-center">
                        <h4 className="text-3xl font-black text-neutral-900 tracking-tight tabular-nums">{kpiValue}</h4>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                            <TrendingUp className="w-3 h-3" />
                            Live Data
                        </div>
                    </div>
                );

            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.slice(0, 10)}>
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
                        <LineChart data={data.slice(0, 15)}>
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
                                data={pieData.slice(0, 5)}
                                innerRadius={40}
                                outerRadius={60}
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

            case 'table':
                const fields = card.config.tableFields || (data[0] ? Object.keys(data[0]).filter(k => !k.startsWith('_')).slice(0, 4) : []);
                return (
                    <div className="h-full overflow-auto text-[11px]">
                         <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white border-b border-neutral-100">
                                <tr>
                                    {fields.map(f => (
                                        <th key={f} className="py-2 font-black text-neutral-400 uppercase tracking-widest">{f}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {data.slice(0, 10).map((row, i) => (
                                    <tr key={i}>
                                        {fields.map(f => (
                                            <td key={f} className="py-2 text-neutral-600 font-medium">{row[f]?.toString() || '-'}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col min-h-[280px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-50 text-neutral-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-all rounded-lg">
                        {card.type === 'kpi' && <Target className="w-4 h-4" />}
                        {card.type === 'bar' && <BarChart className="w-4 h-4" />}
                        {card.type === 'line' && <TrendingUp className="w-4 h-4" />}
                        {card.type === 'pie' && <Database className="w-4 h-4" />}
                        {card.type === 'table' && <Users className="w-4 h-4" />}
                    </div>
                    <div>
                        <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Insight View</h5>
                        <h3 className="text-sm font-black text-neutral-900 leading-tight">{card.title}</h3>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <button onClick={onEdit} className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-md">
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={onDelete} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1">
                {renderChart()}
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-50 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[9px] font-bold text-neutral-400 uppercase tracking-tight">
                    <Database className="w-3 h-3" />
                    Source: {card.dataSourceId || 'None'}
                </div>
            </div>
        </div>
    );
};
