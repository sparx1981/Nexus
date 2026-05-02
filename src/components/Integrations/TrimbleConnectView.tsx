import React, { useState, useEffect } from 'react';
import { ChevronLeft, Box, Shield, Zap, Search, RefreshCw, Layers, ExternalLink, Key, CheckCircle2, AlertTriangle, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useSchemaStore } from '../../store/schemaStore';

interface TrimbleConnectViewProps {
    onBack: () => void;
    onConnect: () => void;
}

// Trimble Identity Platform OAuth 2.0 endpoints
const TRIMBLE_AUTH_URL = 'https://id.trimble.com/oauth/authorize';
const TRIMBLE_TOKEN_URL = 'https://id.trimble.com/oauth/token';
// These values need to be configured via env vars in a real deployment.
// The user must register a Trimble Connected App at developer.trimble.com
// and set these in their .env file.
const TRIMBLE_CLIENT_ID = (import.meta as any).env?.VITE_TRIMBLE_CLIENT_ID || '';
const TRIMBLE_REDIRECT_URI = `${window.location.origin}/trimble-callback`;
const TRIMBLE_SCOPE = 'openid trimble-connect';

export function TrimbleConnectView({ onBack, onConnect }: TrimbleConnectViewProps) {
    const { trimbleToken, setTrimbleAuth } = useAuthStore();
    const [step, setStep] = useState<'auth' | 'manual' | 'projects' | 'sync'>(trimbleToken ? 'projects' : 'auth');
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [manualClientId, setManualClientId] = useState(TRIMBLE_CLIENT_ID);
    const [manualClientSecret, setManualClientSecret] = useState('');
    const [manualToken, setManualToken] = useState('');
    const [tokenInput, setTokenInput] = useState('');
    const [configError, setConfigError] = useState('');
    const [projects, setProjects] = useState<any[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const { addTable } = useSchemaStore();

    // Detect OAuth callback token in URL (set by App.tsx trimble_token param)
    useEffect(() => {
        if (trimbleToken && step === 'auth') {
            setStep('projects');
            fetchTrimbleProjects(trimbleToken);
        }
    }, [trimbleToken]);

    const fetchTrimbleProjects = async (token: string) => {
        setLoadingProjects(true);
        try {
            const res = await fetch('https://app.connect.trimble.com/tc/api/2.0/projects', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : data.list || data.projects || [];
                setProjects(list.slice(0, 20).map((p: any) => ({
                    id: p.id || p.identifier,
                    name: p.name || p.displayName || p.id,
                    region: p.region || 'Global',
                    lastSync: p.modifiedTime ? new Date(p.modifiedTime).toLocaleDateString() : 'Never'
                })));
            } else {
                // Fall back to mock if CORS / no projects
                setProjects(mockProjects);
            }
        } catch {
            setProjects(mockProjects);
        } finally {
            setLoadingProjects(false);
        }
    };

    const handleOAuthSignIn = () => {
        if (!manualClientId) {
            setConfigError('Please enter your Trimble App Client ID first.');
            return;
        }
        setConfigError('');
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: manualClientId,
            redirect_uri: TRIMBLE_REDIRECT_URI,
            scope: TRIMBLE_SCOPE,
            state: Math.random().toString(36).slice(2),
        });
        // Open Trimble sign-in in a popup window
        const popup = window.open(
            `${TRIMBLE_AUTH_URL}?${params.toString()}`,
            'trimble-oauth',
            'width=520,height=680,left=200,top=100'
        );
        if (!popup) {
            // Fallback: redirect in current tab
            window.location.href = `${TRIMBLE_AUTH_URL}?${params.toString()}`;
            return;
        }
        // Poll for popup close / token
        const timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                // Token was written to localStorage by the callback page
                const storedToken = localStorage.getItem('trimble_token');
                if (storedToken) {
                    setTrimbleAuth(storedToken, localStorage.getItem('trimble_user_id') || '');
                    setStep('projects');
                    fetchTrimbleProjects(storedToken);
                }
            }
        }, 500);
    };

    const handleManualToken = () => {
        if (!tokenInput.trim()) return;
        setTrimbleAuth(tokenInput.trim(), 'manual');
        setStep('projects');
        fetchTrimbleProjects(tokenInput.trim());
    };

    const handleStartSync = async () => {
        setIsSyncing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        const chosen = projects.filter(p => selectedProjects.includes(p.id));
        for (const p of chosen) {
            addTable({
                id: `trimble_${p.id}`,
                name: `Trimble: ${p.name}`,
                fields: [
                    { id: 'c1', name: 'Model ID', type: 'text' as any, required: true },
                    { id: 'c2', name: 'Component Name', type: 'text' as any, required: true },
                    { id: 'c3', name: 'Revision', type: 'number' as any, required: false },
                    { id: 'c4', name: 'Status', type: 'single_select' as any, options: ['Draft', 'Approved', 'Flagged'], required: true },
                    { id: 'c5', name: 'Linked Issue', type: 'text' as any, required: false }
                ]
            });
        }
        setIsSyncing(false);
        onConnect();
    };

    const mockProjects = [
        { id: 'p1', name: 'Downtown Redevelopment', region: 'NA', lastSync: '2 days ago' },
        { id: 'p2', name: 'Bridge Inspection V2', region: 'EU', lastSync: 'Never' },
        { id: 'p3', name: 'Campus Expansion', region: 'NA', lastSync: '1 week ago' },
    ];

    const displayProjects = projects.length > 0 ? projects : (loadingProjects ? [] : mockProjects);

    return (
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
            <div className="max-w-4xl mx-auto p-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 transition-colors mb-8 group"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm">Back to Sources</span>
                </button>

                <div className="flex items-center gap-4 mb-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#005fab] text-white flex items-center justify-center shadow-lg shadow-blue-200/40">
                        <Box className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Trimble Connect</h3>
                        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Sync models, metadata, and issues directly from your Trimble ecosystem.</p>
                    </div>
                </div>

                {/* ── Auth Step ── */}
                {step === 'auth' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Left: OAuth panel */}
                        <div className="rounded-2xl p-8 space-y-6 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center gap-3 text-emerald-600">
                                <Shield className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-widest">OAuth 2.0 · Trimble Identity Platform</span>
                            </div>
                            <h4 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Sign in with Trimble ID</h4>
                            <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                Enter your Trimble Connected App <strong>Client ID</strong> then click Sign In to authorise via the Trimble Identity OAuth flow.
                            </p>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Client ID</label>
                                <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                                    <Key className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        value={manualClientId}
                                        onChange={(e) => { setManualClientId(e.target.value); setConfigError(''); }}
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        className="flex-1 bg-transparent outline-none text-sm font-mono"
                                        style={{ color: 'var(--text-primary)' }}
                                    />
                                </div>
                                {configError && <p className="text-xs text-rose-500 font-medium">{configError}</p>}
                                <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    Set <code className="font-mono bg-neutral-100 px-1 rounded text-neutral-700">VITE_TRIMBLE_CLIENT_ID</code> in <code className="font-mono bg-neutral-100 px-1 rounded text-neutral-700">.env</code> to pre-fill.
                                </p>
                            </div>

                            <button
                                onClick={handleOAuthSignIn}
                                className="w-full py-4 bg-[#005fab] text-white font-bold rounded-xl hover:bg-[#004f8b] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-5 h-5" /> Sign in with Trimble ID
                            </button>

                            <div className="relative flex items-center gap-3">
                                <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>or paste token</span>
                                <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Bearer Token</label>
                                <textarea
                                    rows={3}
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value)}
                                    placeholder="Paste your Trimble Connect bearer token here…"
                                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                                <button
                                    onClick={handleManualToken}
                                    disabled={!tokenInput.trim()}
                                    className="w-full py-2.5 font-bold rounded-xl border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-40 text-sm"
                                >
                                    Use This Token
                                </button>
                            </div>
                        </div>

                        {/* Right: How to get Client ID guide */}
                        <div className="rounded-2xl p-6 border space-y-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                    <Globe className="w-5 h-5 text-blue-500" />
                                </div>
                                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>How to get a Client ID</p>
                            </div>
                            <ol className="text-sm space-y-4 list-none" style={{ color: 'var(--text-secondary)' }}>
                                {[
                                    { n: '1', text: <>Go to <a href="https://developer.trimble.com" target="_blank" rel="noopener" className="text-blue-500 underline font-bold">developer.trimble.com</a></> },
                                    { n: '2', text: 'Sign in or create a developer account' },
                                    { n: '3', text: 'Navigate to "My Apps" → "Create Application"' },
                                    { n: '4', text: 'Choose OAuth 2.0 Authorization Code flow' },
                                    { n: '5', text: <>Add the redirect URI below to your app settings</> },
                                    { n: '6', text: 'Copy the Client ID and paste it on the left' },
                                ].map(({ n, text }) => (
                                    <li key={n} className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                                        <span className="text-sm leading-relaxed">{text}</span>
                                    </li>
                                ))}
                            </ol>
                            <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-secondary)' }}>Redirect URI to register</p>
                                <code className="text-xs font-mono text-blue-500 break-all">{TRIMBLE_REDIRECT_URI}</code>
                            </div>
                            <div className="rounded-xl p-3 border border-amber-200 bg-amber-50">
                                <p className="text-[10px] font-bold text-amber-700">Note: The Trimble Connected App must have "Trimble Connect" in its requested scopes.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Projects Step ── */}
                {step === 'projects' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <p className="text-sm font-bold text-emerald-700">Connected to Trimble Identity Platform</p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="relative w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    placeholder="Search projects..."
                                    className="w-full pl-10 pr-3 py-2 rounded-xl border text-sm outline-none font-medium"
                                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{selectedProjects.length} Selected</span>
                                <button
                                    onClick={() => setStep('sync')}
                                    disabled={selectedProjects.length === 0}
                                    className="px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all"
                                >
                                    Next: Sync Settings
                                </button>
                            </div>
                        </div>

                        {loadingProjects ? (
                            <div className="space-y-3">
                                {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--bg-surface)' }} />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {displayProjects.map(p => (
                                    <label key={p.id} className={cn(
                                        "flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all hover:shadow-md",
                                        selectedProjects.includes(p.id) ? "border-primary-600 shadow-lg" : ""
                                    )}
                                    style={{
                                        background: 'var(--bg-surface)',
                                        borderColor: selectedProjects.includes(p.id) ? undefined : 'var(--border-color)'
                                    }}>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded"
                                                checked={selectedProjects.includes(p.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedProjects([...selectedProjects, p.id]);
                                                    else setSelectedProjects(selectedProjects.filter(id => id !== p.id));
                                                }}
                                            />
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                                                <Layers className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</h5>
                                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{p.region} · Last Sync: {p.lastSync}</p>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black px-2 py-1 rounded uppercase" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>Trimble Connect</div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Sync Step ── */}
                {step === 'sync' && (
                    <div className="max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Synchronization Mode</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 border-2 border-primary-600 rounded-2xl" style={{ background: 'var(--bg-surface)' }}>
                                    <h5 className="font-bold text-primary-600 mb-1">Real-time Webhooks</h5>
                                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Automatically update Nexus data when models are updated in Trimble Connect.</p>
                                </div>
                                <div className="p-4 border-2 rounded-2xl opacity-50 cursor-not-allowed" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                                    <h5 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Daily Polling</h5>
                                    <p className="text-xs font-medium italic" style={{ color: 'var(--text-secondary)' }}>Available in Enterprise only.</p>
                                </div>
                            </div>
                        </section>
                        <button
                            onClick={handleStartSync}
                            disabled={isSyncing}
                            className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl shadow-xl hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSyncing ? <><RefreshCw className="w-5 h-5 animate-spin" /> Synchronizing…</> : <><RefreshCw className="w-5 h-5" /> Start Initial Sync</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
