import React, { useState, useEffect } from 'react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    LineChart, 
    Line, 
    PieChart, 
    Pie, 
    Cell 
} from 'recharts';
import { TrendingUp, Users, DollarSign, Target, ArrowUpRight, ArrowDownRight, Cpu, Zap, RefreshCw, XCircle, GitBranch, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const DASHBOARDS = {
    sales: {
        title: 'Sales Performance',
        description: 'Tracking revenue, deals, and pipeline progress.',
        kpis: [
            { id: 1, title: 'Total Revenue', value: '$128,430', trend: '+12.5%', trendUp: true, icon: <DollarSign className="w-5 h-5" /> },
            { id: 2, title: 'Active Deals', value: '42', trend: '+4', trendUp: true, icon: <Target className="w-5 h-5" /> },
            { id: 3, title: 'New Customers', value: '12', trend: '-2', trendUp: false, icon: <Users className="w-5 h-5" /> },
            { id: 4, title: 'Pipeline Value', value: '$1.2M', trend: '+18%', trendUp: true, icon: <TrendingUp className="w-5 h-5" /> },
        ],
        deals: [
            { id: 1, customer: 'Acme Corp', value: '$45,000', status: 'Closed Won', prob: '100%', color: 'success' },
            { id: 2, customer: 'Globex Inc', value: '$12,400', status: 'Negotiation', prob: '65%', color: 'warning' },
            { id: 3, customer: 'Stark Industries', value: '$89,000', status: 'Proposal', prob: '40%', color: 'primary' },
        ]
    },
    ops: {
        title: 'Operations Overview',
        description: 'Uptime, deployment velocity, and infrastructure health.',
        kpis: [
            { id: 1, title: 'System Uptime', value: '99.98%', trend: '+0.01%', trendUp: true, icon: <Cpu className="w-5 h-5" /> },
            { id: 2, title: 'Avg Latency', value: '142ms', trend: '-12ms', trendUp: true, icon: <Zap className="w-5 h-5" /> },
            { id: 3, title: 'Deployments', value: '28', trend: '+5', trendUp: true, icon: <RefreshCw className="w-5 h-5" /> },
            { id: 4, title: 'Error Rate', value: '0.04%', trend: '+0.01%', trendUp: false, icon: <XCircle className="w-5 h-5" /> },
        ],
        deals: [
            { id: 1, customer: 'Internal DB', value: '8.4 GB', status: 'Healthy', prob: '99%', color: 'success' },
            { id: 2, customer: 'API Gateway', value: '450 req/s', status: 'Warning', prob: '82%', color: 'warning' },
            { id: 3, customer: 'Storage Bucket', value: '1.2 TB', status: 'Healthy', prob: '95%', color: 'success' },
        ]
    }
};

const CHART_DATA = [
  { name: 'Jan', revenue: 4000, target: 2400, uptime: 99.9, error: 0.1 },
  { name: 'Feb', revenue: 3000, target: 1398, uptime: 99.8, error: 0.2 },
  { name: 'Mar', revenue: 2000, target: 9800, uptime: 99.9, error: 0.05 },
  { name: 'Apr', revenue: 2780, target: 3908, uptime: 99.7, error: 0.3 },
  { name: 'May', revenue: 1890, target: 4800, uptime: 99.9, error: 0.1 },
  { name: 'Jun', revenue: 2390, target: 3800, uptime: 99.5, error: 0.5 },
];

const PIE_DATA = [
  { name: 'Enterprise', value: 400 },
  { name: 'SME', value: 300 },
  { name: 'Public Sector', value: 300 },
];

const COLORS = ['#1A56DB', '#059669', '#D97706'];

export function SalesDashboard() {
    const [activeTab, setActiveTab] = useState<keyof typeof DASHBOARDS>('sales');
    const [dateRange, setDateRange] = useState('Last 30 Days');
    const [refreshing, setRefreshing] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const currentDashboard = DASHBOARDS[activeTab];

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
            setToast('Dashboard data updated');
            setTimeout(() => setToast(null), 3000);
        }, 1000);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-neutral-50 overflow-hidden relative">
            {/* Header / Sub-Nav */}
            <div className="h-14 border-b border-neutral-200 bg-white flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <select 
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value as any)}
                            className="text-lg font-bold text-neutral-900 bg-white border-none outline-none focus:ring-0 cursor-pointer"
                        >
                            <option value="sales">Sales Performance</option>
                            <option value="ops">Operations Overview</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-neutral-100 p-1 rounded-xl">
                        {['Day', 'Week', 'Month'].map(p => (
                            <button key={p} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:text-neutral-900 hover:bg-white transition-all text-neutral-400">
                                {p}
                            </button>
                        ))}
                    </div>
                    <div className="h-4 w-[1px] bg-neutral-200"></div>
                    <button 
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={cn(
                            "p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-all",
                            refreshing && "animate-spin text-primary-600"
                        )}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button className="bg-white border border-neutral-200 px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition-all shadow-sm">
                        Export PDF
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto space-y-8 pb-20">
                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {currentDashboard.kpis.map(kpi => (
                        <KPICard key={kpi.id} {...kpi} />
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-200/40">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-bold text-neutral-900">{activeTab === 'sales' ? 'Revenue vs Target' : 'System Availability'}</h3>
                                <p className="text-xs text-neutral-400 font-medium">{dateRange}</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                                     <div className="w-3 h-3 rounded-full bg-primary-600"></div> {activeTab === 'sales' ? 'Revenue' : 'Uptime'}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                                     <div className="w-3 h-3 rounded-full bg-neutral-100"></div> {activeTab === 'sales' ? 'Target' : 'Error Rate'}
                                </div>
                            </div>
                        </div>
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                {activeTab === 'sales' ? (
                                    <BarChart data={CHART_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
                                        <Tooltip 
                                            cursor={{ fill: '#f9fafb' }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '12px' }} 
                                        />
                                        <Bar dataKey="revenue" fill="#1A56DB" radius={[6, 6, 0, 0]} barSize={32} />
                                        <Bar dataKey="target" fill="#f3f4f6" radius={[6, 6, 0, 0]} barSize={32} />
                                    </BarChart>
                                ) : (
                                    <LineChart data={CHART_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
                                        <YAxis axisLine={false} tickLine={false} domain={[99, 100]} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '12px' }} 
                                        />
                                        <Line type="monotone" dataKey="uptime" stroke="#1A56DB" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                                        <Line type="monotone" dataKey="error" stroke="#f3f4f6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-200/40">
                        <h3 className="font-bold text-neutral-900 mb-2">Segment Distribution</h3>
                        <p className="text-xs text-neutral-400 font-medium mb-8">Share of total enterprise portfolio.</p>
                        
                        <div className="h-[220px] mb-8 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={PIE_DATA}
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {PIE_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-neutral-900">1.2k</span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Total Entities</span>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {PIE_DATA.map((item, idx) => (
                                <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 transition-colors group cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                                        <span className="text-xs font-bold text-neutral-600">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-extrabold text-neutral-900">{((item.value / 1000) * 100).toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-200/40 overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0">
                            <h3 className="font-bold text-neutral-900">{activeTab === 'sales' ? 'Top Recent Deals' : 'Active Infrastructure'}</h3>
                            <button className="text-primary-600 font-bold text-xs uppercase tracking-widest">View All</button>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50/50">
                                <tr className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">
                                    <th className="px-6 py-3">Resource</th>
                                    <th className="px-6 py-3">Value</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 font-medium">
                                {currentDashboard.deals.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-neutral-50 transition-colors group pointer-events-auto">
                                        <td className="px-6 py-4 text-neutral-900">{deal.customer}</td>
                                        <td className="px-6 py-4 text-neutral-500 tabular-nums">{deal.value}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                deal.color === 'success' ? "bg-emerald-50 text-emerald-600" :
                                                deal.color === 'warning' ? "bg-amber-50 text-amber-600" : "bg-primary-50 text-primary-600"
                                            )}>
                                                {deal.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs text-neutral-400">{deal.prob}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-200/40">
                         <div className="flex items-center justify-between mb-8">
                             <h3 className="font-bold text-neutral-900">Trend Analysis</h3>
                             <button className="text-neutral-400 hover:text-neutral-900"><GitBranch className="w-4 h-4" /></button>
                         </div>
                         <div className="space-y-6">
                             {[
                                 { label: 'Customer Retention', progress: 94, color: 'bg-primary-600' },
                                 { label: 'Market Penetration', progress: 62, color: 'bg-emerald-500' },
                                 { label: 'System Efficiency', progress: 88, color: 'bg-amber-500' },
                                 { label: 'Conversion Velocity', progress: 45, color: 'bg-primary-400' },
                             ].map(item => (
                                 <div key={item.label} className="space-y-2">
                                     <div className="flex justify-between text-xs font-bold">
                                         <span className="text-neutral-600">{item.label}</span>
                                         <span className="text-neutral-900">{item.progress}%</span>
                                     </div>
                                     <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                         <div 
                                            className={cn("h-full rounded-full transition-all duration-1000", item.color)}
                                            style={{ width: refreshing ? '0%' : `${item.progress}%` }}
                                         ></div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 font-bold text-xs uppercase tracking-widest flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {toast}
                </div>
            )}
        </div>
    );
}

function KPICard({ title, value, trend, trendUp, icon }: { title: string; value: string; trend: string; trendUp: boolean; icon: React.ReactNode }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xl shadow-neutral-200/40 hover:shadow-2xl transition-all group hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
                <div className="p-2.5 bg-neutral-50 text-neutral-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all rounded-xl">
                    {icon}
                </div>
                <div className={cn(
                    "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                    trendUp ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                )}>
                    {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trend}
                </div>
            </div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{title}</p>
            <h4 className="text-2xl font-black text-neutral-900 tabular-nums tracking-tight">{value}</h4>
        </div>
    );
}
