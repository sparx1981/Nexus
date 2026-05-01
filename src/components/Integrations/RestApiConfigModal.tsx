import React, { useState, useEffect } from 'react';
import { ChevronLeft, Globe, Play, Save, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSchemaStore } from '../../store/schemaStore';
import { useAuthStore } from '../../store/authStore';
import { RestApiConnector } from '../../types';

interface RestApiConfigModalProps {
    onBack: () => void;
    onConnect?: () => void;
    editingConnector?: RestApiConnector | null;
}

export function RestApiConfigModal({ onBack, onConnect, editingConnector }: RestApiConfigModalProps) {
    const { addRestApiConnector, updateRestApiConnector } = useSchemaStore();
    const { selectedProjectId } = useAuthStore();
    
    const [config, setConfig] = useState<Omit<RestApiConnector, 'id'>>({
        name: '',
        baseUrl: '',
        method: 'GET',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        params: [],
        authType: 'none',
        authConfig: {
          addTo: 'header'
        },
        status: 'pending'
    });

    useEffect(() => {
      if (editingConnector) {
        setConfig({
          name: editingConnector.name,
          baseUrl: editingConnector.baseUrl || '',
          method: editingConnector.method,
          headers: editingConnector.headers || [],
          params: editingConnector.params || [],
          authType: editingConnector.authType,
          authConfig: editingConnector.authConfig || { addTo: 'header' },
          status: editingConnector.status,
          lastTested: editingConnector.lastTested,
          schema: editingConnector.schema
        });
      }
    }, [editingConnector]);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    const handleTest = async () => {
        if (!config.baseUrl) {
            setTestResult({ status: 'ERROR', data: { error: 'Please enter an endpoint URL first.' } });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const url = new URL(config.baseUrl);
            (config.params || []).forEach(p => {
                if (p.key) url.searchParams.set(p.key, p.value);
            });
            const headers: Record<string, string> = {};
            config.headers.forEach(h => {
                if (h.key) headers[h.key] = h.value;
            });
            const fetchOptions: RequestInit = { method: config.method, headers };
            const response = await fetch(url.toString(), fetchOptions);
            const status = response.status;
            let data: any;
            const contentType = response.headers.get('content-type') || '';
            try {
                if (contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    try { data = JSON.parse(text); } catch { data = text; }
                }
            } catch {
                data = `(no response body)`;
            }
            setTestResult({ status, data });
        } catch (err: any) {
            setTestResult({ status: 'ERROR', data: { error: err.message || 'Failed to reach endpoint. Check the URL and CORS policy.' } });
        } finally {
            setTesting(false);
        }
    };

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

                <div className="flex items-start justify-between mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center">
                            <Globe className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-neutral-900 dark:text-white">REST API Connector</h3>
                            <p className="text-neutral-500 font-medium">Create a dynamic data source from any JSON API.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <section className="space-y-4">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">General Configuration</h4>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Source Name</label>
                                    <input 
                                        value={config.name}
                                        onChange={(e) => setConfig({...config, name: e.target.value})}
                                        className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-600/20" 
                                        placeholder="e.g. Weather Service"
                                    />
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-1 space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Method</label>
                                        <select 
                                            value={config.method}
                                            onChange={(e) => setConfig({...config, method: e.target.value as any})}
                                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none text-neutral-900 dark:text-white"
                                        >
                                            <option value="GET">GET</option>
                                            <option value="POST">POST</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3 space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest">Endpoint URL</label>
                                        <input 
                                            value={config.baseUrl}
                                            onChange={(e) => setConfig({...config, baseUrl: e.target.value})}
                                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-xl text-sm font-medium outline-none text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-600/20" 
                                            placeholder="https://api.example.com/v1/data"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">URL Parameters</h4>
                                <button 
                                    onClick={() => setConfig({...config, params: [...(config.params || []), { key: '', value: '' }]})}
                                    className="p-1 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(config.params || []).map((h, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input 
                                            className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs font-medium outline-none text-neutral-900 dark:text-white" 
                                            placeholder="Key" 
                                            value={h.key}
                                            onChange={(e) => {
                                                const newParams = [...(config.params || [])];
                                                newParams[i].key = e.target.value;
                                                setConfig({...config, params: newParams});
                                            }}
                                        />
                                        <input 
                                            className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs font-medium outline-none text-neutral-900 dark:text-white" 
                                            placeholder="Value" 
                                            value={h.value}
                                            onChange={(e) => {
                                                const newParams = [...(config.params || [])];
                                                newParams[i].value = e.target.value;
                                                setConfig({...config, params: newParams});
                                            }}
                                        />
                                        <button 
                                            onClick={() => setConfig({...config, params: (config.params || []).filter((_, idx) => idx !== i)})}
                                            className="p-2 text-neutral-400 hover:text-rose-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Headers</h4>
                                <button 
                                    onClick={() => setConfig({...config, headers: [...config.headers, { key: '', value: '' }]})}
                                    className="p-1 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {config.headers.map((h, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input 
                                            className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs font-medium outline-none text-neutral-900 dark:text-white" 
                                            placeholder="Key" 
                                            value={h.key}
                                            onChange={(e) => {
                                                const newHeaders = [...config.headers];
                                                newHeaders[i].key = e.target.value;
                                                setConfig({...config, headers: newHeaders});
                                            }}
                                        />
                                        <input 
                                            className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg text-xs font-medium outline-none text-neutral-900 dark:text-white" 
                                            placeholder="Value" 
                                            value={h.value}
                                            onChange={(e) => {
                                                const newHeaders = [...config.headers];
                                                newHeaders[i].value = e.target.value;
                                                setConfig({...config, headers: newHeaders});
                                            }}
                                        />
                                        <button 
                                            onClick={() => setConfig({...config, headers: config.headers.filter((_, idx) => idx !== i)})}
                                            className="p-2 text-neutral-400 hover:text-rose-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="space-y-8">
                        <section className="space-y-4">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Test & Save</h4>
                            <div className="bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                                <button 
                                    onClick={handleTest}
                                    disabled={testing}
                                    className="w-full py-3 px-4 bg-white dark:bg-slate-800 border-2 border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-bold text-neutral-700 dark:text-white hover:bg-neutral-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                >
                                    {testing ? <Loader2 className="w-5 h-5 animate-spin text-primary-600" /> : <Play className="w-5 h-5 text-emerald-600" />}
                                    {testing ? 'Testing Endpoint...' : 'Send Test Request'}
                                </button>

                                {testResult && (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase text-neutral-400">Response Body</span>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase flex items-center gap-1",
                                                testResult.status === 'ERROR' || (typeof testResult.status === 'number' && testResult.status >= 400)
                                                    ? "text-rose-500"
                                                    : "text-emerald-600"
                                            )}>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    testResult.status === 'ERROR' || (typeof testResult.status === 'number' && testResult.status >= 400)
                                                        ? "bg-rose-500"
                                                        : "bg-emerald-600"
                                                )}></div>
                                                Status {testResult.status}
                                            </span>
                                        </div>
                                        <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-48">
                                            {typeof testResult.data === 'string' ? testResult.data : JSON.stringify(testResult.data, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                <button 
                                    onClick={async () => {
                                        if (editingConnector) {
                                            await updateRestApiConnector(editingConnector.id, { ...config, status: 'active' });
                                        } else {
                                            await addRestApiConnector({
                                                ...config,
                                                id: `api_${Date.now()}`,
                                                status: 'active'
                                            } as any);
                                        }
                                        if (onConnect) onConnect();
                                        onBack();
                                    }}
                                    className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl shadow-xl shadow-primary-200 hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" /> {editingConnector ? 'Update Connector' : 'Save Connector'}
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
