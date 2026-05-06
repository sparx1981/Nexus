import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { Loader2, AlertCircle, X, Maximize2 } from 'lucide-react';
import { Dashboard, DashboardCard as ICard } from '../../types/dashboard';
import { DashboardCard } from './DashboardCard';
import { cn } from '../../lib/utils';
import { useSchemaStore } from '../../store/schemaStore';

export function PublishedDashboardRunner({ dashboardId, workspaceId }: { dashboardId: string; workspaceId: string }) {
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const { setTables } = useSchemaStore();

    useEffect(() => {
        // Load schemas for headers fallback
        const fetchSchemas = async () => {
            try {
                const snap = await getDocs(collection(db, 'workspaces', workspaceId, 'tables'));
                const tablesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                setTables(tablesData);
            } catch (e) {
                console.error("Failed to load schemas for dashboard:", e);
            }
        };
        fetchSchemas();
    }, [workspaceId]);

    useEffect(() => {
        const fetchDash = async () => {
            try {
                const ref = doc(db, 'workspaces', workspaceId, 'dashboards', dashboardId);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    setError('Dashboard not found.');
                    return;
                }
                const data = snap.data() as Dashboard;
                if (!data.isPublished || !data.publishedVersion) {
                    setError('This dashboard has not been published or is private.');
                    return;
                }
                
                // Use the published version for rendering
                const publishedDash = {
                    ...data,
                    id: snap.id,
                    name: data.publishedVersion.name,
                    description: data.publishedVersion.description,
                    cards: data.publishedVersion.cards
                };
                
                setDashboard(publishedDash);
            } catch (e) {
                console.error(e);
                setError('Failed to load dashboard.');
            } finally {
                setLoading(false);
            }
        };
        fetchDash();
    }, [dashboardId, workspaceId]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#050505]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Loading Dashboard</p>
            </div>
        </div>
    );

    if (error || !dashboard) return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#050505]">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight">Dashboard Unavailable</h2>
                <p className="text-sm text-neutral-500 font-medium">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] flex flex-col font-sans">
            <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0A0A0A] flex items-center px-8 shrink-0">
                <h1 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight">{dashboard.name}</h1>
                {dashboard.description && (
                    <>
                        <div className="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-4" />
                        <p className="text-xs font-medium text-neutral-400 truncate">{dashboard.description}</p>
                    </>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-8 md:p-12 pattern-dots dark:pattern-dots-dark">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {dashboard.cards.map((card) => (
                        <div 
                            key={card.id}
                            onClick={() => setExpandedCardId(card.id)}
                            className="relative group cursor-pointer transition-all h-[260px] hover:ring-2 hover:ring-primary-600 hover:ring-offset-4 dark:hover:ring-offset-black rounded-2xl overflow-hidden"
                        >
                            <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm h-full overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-black text-neutral-900 dark:text-white uppercase text-[10px] tracking-widest truncate">{card.title}</h4>
                                </div>
                                <div className="flex-1 min-h-0 relative">
                                    <DashboardCard card={card} />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 dark:bg-white/5 rounded-xl pointer-events-none">
                                        <div className="bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700">
                                            <Maximize2 className="w-4 h-4 text-primary-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Expand Modal */}
            {expandedCardId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setExpandedCardId(null)}></div>
                    <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-5xl h-full max-h-[80vh] flex flex-col relative animate-in zoom-in-95 duration-200 overflow-hidden">
                        <header className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-neutral-900 dark:text-white uppercase text-xs tracking-widest">
                                    {dashboard.cards.find(c => c.id === expandedCardId)?.title}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setExpandedCardId(null)}
                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6 text-neutral-400" />
                            </button>
                        </header>
                        <div className="flex-1 p-8 min-h-0 overflow-auto">
                            {expandedCardId && <DashboardCard card={dashboard.cards.find(c => c.id === expandedCardId)!} isExpanded={true} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
