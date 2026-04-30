import React from 'react';
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
import { TrendingUp, Users, DollarSign, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const data = [
  { name: 'Jan', revenue: 4000, target: 2400 },
  { name: 'Feb', revenue: 3000, target: 1398 },
  { name: 'Mar', revenue: 2000, target: 9800 },
  { name: 'Apr', revenue: 2780, target: 3908 },
  { name: 'May', revenue: 1890, target: 4800 },
  { name: 'Jun', revenue: 2390, target: 3800 },
];

const pieData = [
  { name: 'Enterprise', value: 400 },
  { name: 'SME', value: 300 },
  { name: 'Public Sector', value: 300 },
];

const COLORS = ['#1A56DB', '#059669', '#D97706'];

export function SalesDashboard() {
    return (
        <div className="p-8 space-y-8 overflow-y-auto h-full">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                    title="Total Revenue" 
                    value="$128,430" 
                    trend="+12.5%" 
                    trendUp={true} 
                    icon={<DollarSign className="w-5 h-5" />} 
                />
                <KPICard 
                    title="Active Deals" 
                    value="42" 
                    trend="+4" 
                    trendUp={true} 
                    icon={<Target className="w-5 h-5" />} 
                />
                <KPICard 
                    title="New Customers" 
                    value="12" 
                    trend="-2" 
                    trendUp={false} 
                    icon={<Users className="w-5 h-5" />} 
                />
                <KPICard 
                    title="Pipeline Value" 
                    value="$1.2M" 
                    trend="+18%" 
                    trendUp={true} 
                    icon={<TrendingUp className="w-5 h-5" />} 
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-neutral-900">Revenue vs Target</h3>
                        <div className="flex items-center gap-4 text-xs font-medium text-neutral-500">
                             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary-600"></div> Revenue</div>
                             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-neutral-200"></div> Target</div>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                                />
                                <Bar dataKey="revenue" fill="#1A56DB" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="target" fill="#f3f4f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <h3 className="font-bold text-neutral-900 mb-6">Segment Distribution</h3>
                    <div className="h-[200px] mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                        {pieData.map((item, idx) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                                    <span className="text-xs text-neutral-600">{item.name}</span>
                                </div>
                                <span className="text-xs font-bold text-neutral-900">{((item.value / 1000) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200">
                    <h3 className="font-bold text-neutral-900">Recent Deals</h3>
                </div>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-neutral-50 text-neutral-400 font-bold uppercase text-[10px] tracking-widest">
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Value</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Probability</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        <tr className="hover:bg-neutral-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-neutral-900">Acme Corp</td>
                            <td className="px-6 py-4 text-neutral-600">$45,000</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-success-600/10 text-success-600 rounded-full text-[10px] font-bold uppercase">Closed Won</span></td>
                            <td className="px-6 py-4 text-right font-mono text-xs text-neutral-500">100%</td>
                        </tr>
                        <tr className="hover:bg-neutral-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-neutral-900">Globex Inc</td>
                            <td className="px-6 py-4 text-neutral-600">$12,400</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-warning-500/10 text-warning-500 rounded-full text-[10px] font-bold uppercase">Negotiation</span></td>
                            <td className="px-6 py-4 text-right font-mono text-xs text-neutral-500">65%</td>
                        </tr>
                        <tr className="hover:bg-neutral-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-neutral-900">Stark Industries</td>
                            <td className="px-6 py-4 text-neutral-600">$89,000</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 bg-primary-600/10 text-primary-600 rounded-full text-[10px] font-bold uppercase">Proposal</span></td>
                            <td className="px-6 py-4 text-right font-mono text-xs text-neutral-500">40%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function KPICard({ title, value, trend, trendUp, icon }: { title: string; value: string; trend: string; trendUp: boolean; icon: React.ReactNode }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-neutral-50 text-neutral-400 group-hover:text-primary-600 transition-colors rounded-xl">
                    {icon}
                </div>
                <div className={cn(
                    "flex items-center gap-1 text-xs font-bold",
                    trendUp ? "text-success-600" : "text-error-600"
                )}>
                    {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trend}
                </div>
            </div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-1">{title}</p>
            <h4 className="text-2xl font-bold text-neutral-900">{value}</h4>
        </div>
    );
}
