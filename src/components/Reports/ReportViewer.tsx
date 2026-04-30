import React, { useState } from 'react';
import { 
    FileText, 
    Download, 
    Filter, 
    Printer, 
    Share2, 
    ChevronDown, 
    Search,
    MoreHorizontal,
    Table as TableIcon,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { cn } from '../../lib/utils';

const reportData = [
    { id: 1, date: '2026-04-28', customer: 'Acme Corp', status: 'Paid', amount: 45000, region: 'North America' },
    { id: 2, date: '2026-04-27', customer: 'Globex Inc', status: 'Pending', amount: 12400, region: 'Europe' },
    { id: 3, date: '2026-04-26', customer: 'Stark Industries', status: 'Paid', amount: 89000, region: 'North America' },
    { id: 4, date: '2026-04-25', customer: 'Initech', status: 'Overdue', amount: 3500, region: 'Europe' },
    { id: 5, date: '2026-04-24', customer: 'Umbrella Corp', status: 'Paid', amount: 15600, region: 'Asia' },
    { id: 6, date: '2026-04-23', customer: 'Wayne Ent', status: 'Declined', amount: 22000, region: 'North America' },
];

export function ReportViewer() {
    const [sortField, setSortField] = useState('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Toolbar */}
            <div className="h-14 border-b border-neutral-200 px-6 flex items-center justify-between shrink-0 bg-neutral-50/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary-600" />
                        <h2 className="font-bold text-neutral-900">Monthly Revenue Report</h2>
                    </div>
                    <div className="h-4 w-[1px] bg-neutral-200"></div>
                    <span className="text-xs font-medium text-neutral-500 italic">Generated 2m ago • All Regions</span>
                </div>
                <div className="flex items-center gap-2">
                    <ActionButton icon={<Download className="w-4 h-4" />} label="Export" />
                    <ActionButton icon={<Printer className="w-4 h-4" />} label="Print" />
                    <ActionButton icon={<Share2 className="w-4 h-4" />} label="Share" />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="px-6 py-4 border-b border-neutral-200 bg-white flex items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                         <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                         <input 
                            type="text" 
                            placeholder="Find in report..."
                            className="w-full pl-10 pr-4 py-1.5 bg-neutral-100 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-600 transition-all font-medium"
                         />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
                        <Filter className="w-4 h-4" /> Add Filter
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
                        <TableIcon className="w-4 h-4" /> Group by: Region
                    </button>
                </div>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Showing 124 of 1,240 records
                </div>
            </div>

            {/* Report Data Table */}
            <div className="flex-1 overflow-auto bg-neutral-50 p-6">
                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-neutral-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200">
                            <tr>
                                <TableHeader label="Date" sortable active sorted={sortOrder} />
                                <TableHeader label="Customer / Organization" sortable />
                                <TableHeader label="Region" />
                                <TableHeader label="Status" />
                                <TableHeader label="Amount" sortable />
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {reportData.map((row) => (
                                <tr key={row.id} className="hover:bg-neutral-50 transition-colors group">
                                    <td className="px-6 py-4 text-neutral-500 font-mono text-xs">{row.date}</td>
                                    <td className="px-6 py-4 font-semibold text-neutral-900">{row.customer}</td>
                                    <td className="px-6 py-4 text-neutral-600 font-medium">{row.region}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                            row.status === 'Paid' ? "bg-success-600/10 text-success-600" :
                                            row.status === 'Pending' ? "bg-warning-500/10 text-warning-500" : "bg-error-600/10 text-error-600"
                                        )}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-neutral-900 tabular-nums">
                                        ${row.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1 hover:bg-neutral-200 rounded opacity-0 group-hover:opacity-100 transition-all text-neutral-400">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {/* Footer Subtotals */}
                        <tfoot className="bg-neutral-50 font-bold border-t border-neutral-200">
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-neutral-400 text-xs uppercase tracking-widest text-right">Subtotal Revenue</td>
                                <td className="px-6 py-4 text-lg text-neutral-900 tabular-nums">$187,500.00</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

function TableHeader({ label, sortable, active, sorted }: { label: string; sortable?: boolean; active?: boolean; sorted?: 'asc' | 'desc' }) {
    return (
        <th className="px-6 py-4">
            <button className={cn(
                "flex items-center gap-2 group",
                sortable ? "cursor-pointer" : "cursor-default"
            )}>
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    active ? "text-primary-600 font-extrabold" : "text-neutral-400 group-hover:text-neutral-600"
                )}>{label}</span>
                {sortable && (
                    <div className="flex flex-col text-neutral-400 group-hover:text-primary-600 transition-colors">
                        {sorted === 'asc' ? <ArrowUp className="w-3 h-3" /> : (sorted === 'desc' ? <ArrowDown className="w-3 h-3" /> : <div className="w-3 h-3 border border-current rounded-sm opacity-20"></div>)}
                    </div>
                )}
            </button>
        </th>
    );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors border border-neutral-200">
            {icon} {label}
        </button>
    );
}
