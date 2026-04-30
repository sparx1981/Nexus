import React, { useState, useMemo } from 'react';
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

const ALL_REPORTS = {
    'revenue': {
        name: 'Monthly Revenue Report',
        columns: ['date', 'customer', 'region', 'status', 'amount'],
        data: [
            { id: 1, date: '2026-04-28', customer: 'Acme Corp', status: 'Paid', amount: 45000, region: 'North America' },
            { id: 2, date: '2026-04-27', customer: 'Globex Inc', status: 'Pending', amount: 12400, region: 'Europe' },
            { id: 3, date: '2026-04-26', customer: 'Stark Industries', status: 'Paid', amount: 89000, region: 'North America' },
            { id: 4, date: '2026-04-25', customer: 'Initech', status: 'Overdue', amount: 3500, region: 'Europe' },
            { id: 5, date: '2026-04-24', customer: 'Umbrella Corp', status: 'Paid', amount: 15600, region: 'Asia' },
            { id: 6, date: '2026-04-23', customer: 'Wayne Ent', status: 'Declined', amount: 22000, region: 'North America' },
            { id: 7, date: '2026-04-22', customer: 'Oscorp', status: 'Paid', amount: 31000, region: 'Asia' },
            { id: 8, date: '2026-04-21', customer: 'Hooli', status: 'Pending', amount: 8900, region: 'North America' },
        ]
    },
    'inventory': {
        name: 'Stock Utilization Report',
        columns: ['sku', 'product', 'category', 'stock', 'value'],
        data: [
            { id: 1, sku: 'SKU-001', product: 'MacBook Pro', category: 'Laptops', stock: 45, value: 90000 },
            { id: 2, sku: 'SKU-002', product: 'iPhone 15', category: 'Phones', stock: 120, value: 120000 },
            { id: 3, sku: 'SKU-003', product: 'iPad Air', category: 'Tablets', stock: 30, value: 18000 },
            { id: 4, sku: 'SKU-004', product: 'Monitor 4K', category: 'Accessories', stock: 15, value: 7500 },
            { id: 5, sku: 'SKU-005', product: 'Keyboard Mech', category: 'Accessories', stock: 80, value: 12000 },
        ]
    },
    'compliance': {
        name: 'System Audit Logs',
        columns: ['timestamp', 'user', 'action', 'resource', 'result'],
        data: [
            { id: 1, timestamp: '2026-04-30 09:12', user: 'admin@nexus.com', action: 'Update Schema', resource: 'Orders Table', result: 'Success' },
            { id: 2, timestamp: '2026-04-30 08:45', user: 'jane@nexus.com', action: 'Delete Record', resource: 'Users Table', result: 'Failed' },
            { id: 3, timestamp: '2026-04-30 07:22', user: 'system', action: 'Scheduled Sync', resource: 'Snowflake', result: 'Success' },
            { id: 4, timestamp: '2026-04-29 23:10', user: 'mike@acme.com', action: 'Export Data', resource: 'Revenue Report', result: 'Success' },
        ]
    }
};

export function ReportViewer() {
    const [activeReportId, setActiveReportId] = useState<keyof typeof ALL_REPORTS>('revenue');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [groupBy, setGroupBy] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const activeReport = ALL_REPORTS[activeReportId];

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const handleExport = (format: string) => {
        if (format === 'csv') {
            const headers = activeReport.columns.join(',');
            const rows = activeReport.data.map(row => activeReport.columns.map(col => (row as any)[col]).join(',')).join('\n');
            const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `${activeReportId}_report.csv`);
            document.body.appendChild(link);
            link.click();
            showToast('CSV Exported successfully');
        } else {
            showToast(`${format.toUpperCase()} export started...`);
        }
    };

    const processedData = useMemo(() => {
        let items = [...activeReport.data];

        // Search
        if (searchTerm) {
            items = items.filter(item => 
                Object.values(item).some(val => 
                    val.toString().toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Filter
        if (filterStatus !== 'all') {
            items = items.filter(item => (item as any).status === filterStatus || (item as any).result === filterStatus);
        }

        // Sort
        items.sort((a, b) => {
            const valA = (a as any)[sortField];
            const valB = (b as any)[sortField];
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return items;
    }, [activeReport, searchTerm, sortField, sortOrder, filterStatus]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            {/* Toolbar */}
            <div className="h-14 border-b border-neutral-200 px-6 flex items-center justify-between shrink-0 bg-neutral-50/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <select 
                            value={activeReportId}
                            onChange={(e) => setActiveReportId(e.target.value as any)}
                            className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary-600/20"
                        >
                            {Object.entries(ALL_REPORTS).map(([id, r]) => (
                                <option key={id} value={id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="h-4 w-[1px] bg-neutral-200"></div>
                    <span className="text-xs font-medium text-neutral-500 italic">Generated just now • Dynamic Dataset</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group/export">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-sm">
                            <Download className="w-4 h-4" /> Export
                        </button>
                        <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden hidden group-hover/export:block z-50 min-w-[120px]">
                            <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-xs font-bold text-neutral-600">CSV</button>
                            <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-xs font-bold text-neutral-600">Excel</button>
                            <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-xs font-bold text-neutral-600">PDF</button>
                        </div>
                    </div>
                    <ActionButton onClick={() => window.print()} icon={<Printer className="w-4 h-4" />} label="Print" />
                    <ActionButton onClick={() => showToast('Sharing links generated')} icon={<Share2 className="w-4 h-4" />} label="Share" />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="px-6 py-4 border-b border-neutral-200 bg-white flex items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                         <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                         <input 
                            type="text" 
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-1.5 bg-neutral-100 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-600 transition-all font-medium"
                         />
                    </div>
                    <div className="flex items-center gap-2">
                         <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="flex items-center gap-2 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-bold text-neutral-600 hover:bg-neutral-50 outline-none"
                         >
                            <option value="all">All Status</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Success">Success</option>
                            <option value="Failed">Failed</option>
                         </select>
                    </div>
                    <button 
                        onClick={() => setGroupBy(groupBy ? null : 'region')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all",
                            groupBy ? "bg-primary-50 border-primary-200 text-primary-600" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                        )}
                    >
                        <TableIcon className="w-4 h-4" /> Group by: Region
                    </button>
                </div>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Showing {processedData.length} records
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto bg-neutral-50 p-6">
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap overflow-hidden">
                        <thead className="bg-neutral-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200">
                            <tr>
                                {activeReport.columns.map(col => (
                                    <TableHeader 
                                        key={col}
                                        label={col.replace('_', ' ')} 
                                        sortable 
                                        active={sortField === col} 
                                        sorted={sortField === col ? sortOrder : undefined}
                                        onClick={() => handleSort(col)}
                                    />
                                ))}
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-medium">
                            {processedData.length > 0 ? processedData.map((row) => (
                                <tr key={row.id} className="hover:bg-neutral-50 transition-colors group">
                                    {activeReport.columns.map(col => (
                                        <td key={col} className="px-6 py-4">
                                            {col === 'status' || col === 'result' ? (
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                    (row as any)[col] === 'Paid' || (row as any)[col] === 'Success' ? "bg-emerald-50 text-emerald-600" :
                                                    (row as any)[col] === 'Pending' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                                )}>
                                                    {(row as any)[col]}
                                                </span>
                                            ) : col === 'amount' || col === 'value' ? (
                                                <span className="font-bold text-neutral-900 tabular-nums">
                                                    ${(row as any)[col].toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-neutral-600">{(row as any)[col]}</span>
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1 hover:bg-neutral-200 rounded opacity-0 group-hover:opacity-100 transition-all text-neutral-400">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={activeReport.columns.length + 1} className="px-6 py-12 text-center text-neutral-400 italic">
                                        No matching records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {activeReportId === 'revenue' && processedData.length > 0 && (
                            <tfoot className="bg-neutral-50 font-bold border-t border-neutral-200">
                                <tr>
                                    <td colSpan={activeReport.columns.indexOf('amount')} className="px-6 py-4 text-neutral-400 text-[10px] uppercase tracking-widest text-right">Total Revenue</td>
                                    <td className="px-6 py-4 text-lg text-primary-600 tabular-nums">
                                        ${processedData.reduce((acc, curr) => acc + (curr as any).amount, 0).toLocaleString()}
                                    </td>
                                    <td colSpan={activeReport.columns.length - activeReport.columns.indexOf('amount')}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 font-bold text-xs uppercase tracking-widest">
                    {toast}
                </div>
            )}
        </div>
    );
}

function TableHeader({ label, sortable, active, sorted, onClick }: { label: string; sortable?: boolean; active?: boolean; sorted?: 'asc' | 'desc', onClick?: () => void, key?: any }) {
    return (
        <th className="px-6 py-4">
            <button 
                onClick={onClick}
                className={cn(
                    "flex items-center gap-2 group",
                    sortable ? "cursor-pointer" : "cursor-default"
                )}
            >
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    active ? "text-primary-600 font-extrabold" : "text-neutral-400 group-hover:text-neutral-600"
                )}>{label}</span>
                {sortable && (
                    <div className="flex flex-col text-neutral-400 group-hover:text-primary-600 transition-colors">
                        {sorted === 'asc' ? <ArrowUp className="w-3 h-3 text-primary-600" /> : (sorted === 'desc' ? <ArrowDown className="w-3 h-3 text-primary-600" /> : <div className="w-3 h-3 border border-current rounded-sm opacity-20 group-hover:opacity-100"></div>)}
                    </div>
                )}
            </button>
        </th>
    );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string, onClick?: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-neutral-200"
        >
            {icon} {label}
        </button>
    );
}
