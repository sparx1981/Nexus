import React, { useState } from 'react';
import { ChevronLeft, Box, Shield, Zap, Search, RefreshCw, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrimbleConnectViewProps {
    onBack: () => void;
    onConnect: () => void;
}

export function TrimbleConnectView({ onBack, onConnect }: TrimbleConnectViewProps) {
    const [step, setStep] = useState<'auth' | 'projects' | 'sync'>('auth');
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

    const mockProjects = [
        { id: 'p1', name: 'Downtown Redevelopment', region: 'NA', lastSync: '2 days ago' },
        { id: 'p2', name: 'Bridge Inspection V2', region: 'EU', lastSync: 'Never' },
        { id: 'p3', name: 'Campus Expansion', region: 'NA', lastSync: '1 week ago' },
    ];

    return (
        <div className="flex-1 bg-white dark:bg-[#0A0A0A] overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-8 group"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm">Back to Sources</span>
                </button>

                <div className="flex items-center gap-4 mb-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#005fab] text-white flex items-center justify-center">
                        <Box className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-neutral-900 dark:text-white leading-tight">Trimble Connect</h3>
                        <p className="text-neutral-500 font-medium tracking-tight">Sync models, metadata, and issues directly from your Trimble ecosystem.</p>
                    </div>
                </div>

                {step === 'auth' && (
                    <div className="max-w-lg">
                        <div className="bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-8 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-emerald-600">
                                    <Shield className="w-5 h-5" />
                                    <span className="text-xs font-black uppercase tracking-widest">Enterprise Security Active</span>
                                </div>
                                <h4 className="text-xl font-bold text-neutral-900 dark:text-white">Authorization Required</h4>
                                <p className="text-sm text-neutral-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Nexus Platform requires access to your Trimble ID to pull project directories. We only request read access for Data Studio synchronization.
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                <button 
                                    onClick={() => setStep('projects')}
                                    className="w-full py-4 bg-[#005fab] text-white font-bold rounded-xl shadow-xl shadow-blue-100 hover:bg-[#004f8b] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-5 h-5" /> Sign in with Trimble ID
                                </button>
                                <p className="text-[10px] text-center text-neutral-400 font-medium">By connecting, you agree to the Nexus Platform Data Policy.</p>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'projects' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <div className="relative w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input placeholder="Search projects..." className="w-full pl-10 pr-3 py-2 bg-neutral-100 dark:bg-slate-900 border-none rounded-xl text-sm outline-none font-medium" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{selectedProjects.length} Selected</span>
                                <button 
                                    onClick={() => setStep('sync')}
                                    disabled={selectedProjects.length === 0}
                                    className="px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all"
                                >
                                    Next: Sync Settings
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {mockProjects.map(p => (
                                <label key={p.id} className={cn(
                                    "flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-2 rounded-2xl cursor-pointer transition-all hover:shadow-md",
                                    selectedProjects.includes(p.id) ? "border-primary-600 shadow-lg shadow-primary-50" : "border-neutral-100 dark:border-slate-800"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-600/20"
                                            checked={selectedProjects.includes(p.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedProjects([...selectedProjects, p.id]);
                                                else setSelectedProjects(selectedProjects.filter(id => id !== p.id));
                                            }}
                                        />
                                        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-neutral-400">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-neutral-900 dark:text-white text-sm">{p.name}</h5>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{p.region} • Last Sync: {p.lastSync}</p>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black bg-neutral-100 dark:bg-slate-800 px-2 py-1 rounded text-neutral-500 uppercase">Trimble Connect V2</div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'sync' && (
                    <div className="max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section className="space-y-4">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Synchronization Mode</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 border-2 border-primary-600 bg-primary-50/20 rounded-2xl">
                                    <h5 className="font-bold text-primary-600 mb-1">Real-time Webhooks</h5>
                                    <p className="text-xs text-neutral-500 dark:text-slate-400 font-medium">Automatically update Nexus data when models are updated in Trimble Connect.</p>
                                </div>
                                <div className="p-4 border-2 border-neutral-100 dark:border-slate-800 rounded-2xl opacity-50 cursor-not-allowed">
                                    <h5 className="font-bold text-neutral-900 dark:text-white mb-1">Daily Polling</h5>
                                    <p className="text-xs text-neutral-500 dark:text-slate-400 font-medium italic">Available in Enterprise only.</p>
                                </div>
                            </div>
                        </section>

                        <button 
                            onClick={onConnect}
                            className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl shadow-xl shadow-primary-100 hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" /> Start Initial Sync
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
