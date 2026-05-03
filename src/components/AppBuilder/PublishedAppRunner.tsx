import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, doc, getDoc, onSnapshot, getDocs, query, where } from 'firebase/firestore';
import { Loader2, AlertCircle, Lock } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { cn } from '../../lib/utils';

/**
 * PublishedAppRunner — renders a PUBLISHED Nexus app at /{workspaceSlug}/{appId}.
 *
 * Key rules:
 *  - Uses `publishedComponents` (snapshot at publish time), NOT live `components`.
 *  - Respects the workspace `requireSignIn` project setting.
 *  - No Nexus builder UI — renders the end-user app only.
 */
export function PublishedAppRunner({ appId, workspaceId }: { appId: string; workspaceId: string }) {
  const [appData, setAppData]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  // Read URL query params (row data passed from previous app)
  const [urlParams] = useState<Record<string, string>>(() => {
    const p: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => { p[k] = v; });
    return p;
  });
  const [formState, setFormState] = useState<Record<string, any>>(() => {
    // Pre-populate form from URL params
    const p: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => { p[k] = v; });
    return p;
  });
  const [requireSignIn, setRequireSignIn] = useState<boolean | null>(null);
  const [toast, setToast]   = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);
  const showToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  const [isAuthorised, setIsAuthorised]   = useState<boolean | null>(null);

  // ── 1. Load project settings (requireSignIn) ──────────────────────────────
  useEffect(() => {
    getDoc(doc(db, 'workspaces', workspaceId, 'config', 'projectSettings')).then(snap => {
      const req = snap.exists() ? (snap.data()?.requireSignIn ?? false) : false;
      setRequireSignIn(req);
      if (!req) { setIsAuthorised(true); return; }
      // Check if the current user is authenticated and a member of this workspace
      import('firebase/auth').then(({ getAuth }) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) { setIsAuthorised(false); return; }
        // Check workspace memberships
        getDoc(doc(db, 'workspaces', workspaceId)).then(wsSnap => {
          if (!wsSnap.exists()) { setIsAuthorised(false); return; }
          const data = wsSnap.data();
          const email = user.email?.toLowerCase() || '';
          const isMember = data.ownerId === user.uid ||
            (data.memberships || []).some((m: any) => m.email?.toLowerCase() === email && m.status !== 'revoked');
          setIsAuthorised(isMember);
        }).catch(() => setIsAuthorised(false));
      });
    }).catch(() => { setRequireSignIn(false); setIsAuthorised(true); });
  }, [workspaceId]);

  // ── 2. Load app definition ────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthorised === null) return; // wait for auth check
    setLoading(true);
    setError(null);
    getDoc(doc(db, 'workspaces', workspaceId, 'apps', appId)).then(snap => {
      if (!snap.exists()) { setError('Application not found.'); setLoading(false); return; }
      const data = snap.data();
      if (!data.published) { setError('This application has not been published yet.'); setLoading(false); return; }
      // Use publishedComponents (frozen snapshot) — NOT the live components array
      if (!data.publishedComponents?.length) {
        setError('No published version available. Please publish the app from the Nexus builder first.');
        setLoading(false);
        return;
      }
      setAppData(data);
      setLoading(false);
    }).catch(() => { setError('Failed to load application.'); setLoading(false); });
  }, [workspaceId, appId, isAuthorised]);

  // ── 3. Subscribe to table data for datasources ───────────────────────────
  useEffect(() => {
    if (!appData) return;
    const comps = appData.publishedComponents || [];
    const tableIds = [...new Set(comps.map((c: any) => c.properties?.dataSource).filter(Boolean))] as string[];
    if (appData.dataSourceId) tableIds.push(appData.dataSourceId);
    const unique = [...new Set(tableIds)];
    const unsubs: (() => void)[] = [];
    unique.forEach(tid => {
      const unsub = onSnapshot(
        collection(db, 'workspaces', workspaceId, 'tableData', tid, 'rows'),
        snap => setTableData(prev => ({ ...prev, [tid]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }))
      );
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u());
  }, [appData, workspaceId]);

  // ── 4. Auth gate ─────────────────────────────────────────────────────────
  if (requireSignIn === null || isAuthorised === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"/>
          <p className="text-sm text-neutral-400">Checking access…</p>
        </div>
      </div>
    );
  }

  if (requireSignIn && !isAuthorised) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Sign-In Required</h2>
          <p className="text-sm text-neutral-500">
            This application requires a valid account. Please sign in to Nexus with an account that has access to this project.
          </p>
          <a
            href="/"
            className="mt-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
          >
            Sign In to Nexus
          </a>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-neutral-500">Loading application…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Application Error</h2>
        <p className="text-sm text-neutral-500">{error}</p>
      </div>
    </div>
  );

  // ── 5. Render the published app ──────────────────────────────────────────
  // Use publishedComponents — the frozen snapshot taken at publish time.
  const components = appData?.publishedComponents || [];
  const bgColor    = appData?.bgColor || '#f8fafc';
  const headerText  = appData?.headerText;
  const headerColor = appData?.headerColor || '#1A56DB';

  const handleFormUpdate = (field: string, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleButtonClick = async (properties: any) => {
    if (properties.actionType === 'url' && properties.url) {
      window.open(properties.url, '_blank');
    } else if (properties.actionType === 'application' && properties.targetAppId) {
      // Build URL params from explicit field mappings if present; fall back to full formState
      const params = new URLSearchParams();
      const mappings: any[] = properties.paramMappings || [];
      if (mappings.length > 0) {
        mappings.forEach((m: any) => {
          const v = m.sourceField ? String((formState as any)[m.sourceField] ?? '') : (m.staticValue || '');
          if (v !== '') params.set(m.targetField, v);
        });
      } else {
        // No explicit mappings — pass entire form state
        Object.entries(formState || {}).forEach(([k, v]) => params.set(k, String(v ?? '')));
      }
      window.location.href = `/${appData.workspaceSlug || workspaceId}/${properties.targetAppId}?${params.toString()}`;
    } else if (properties.actionType === 'submit') {
      const tid = appData.dataSourceId;
      const mode = appData.mode || 'view_only';
      if (!tid) { showToast('No datasource configured for this application.', 'error'); return; }
      try {
        if (mode === 'add') {
          await dataService.addRecord(workspaceId, tid, formState);
          showToast('Record submitted successfully!', 'success');
          setFormState({});
        } else {
          showToast('Action completed.', 'info');
        }
      } catch { showToast('Operation failed. Please try again.', 'error'); }
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      {/* App header */}
      {headerText && (
        <div className="w-full px-6 py-3 flex items-center" style={{ backgroundColor: headerColor }}>
          <span className="font-bold text-white text-sm">{headerText}</span>
        </div>
      )}

      {/* Canvas — padded outer container for comfortable default margins */}
      <div className="w-full px-4 sm:px-8 lg:px-12 py-8">
      <div className="relative mx-auto" style={{ minHeight: 800, maxWidth: (appData?.fullWidth ? '100%' : '1280px') }}>
        {components.filter((c: any) => !c.parentId).map((c: any) => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left:   c.position?.x || 0,
              top:    c.position?.y || 0,
              width:  c.size?.width  || 'auto',
              height: c.size?.height || 'auto',
            }}
          >
            <RunnerComponent
              component={c}
              allComponents={components}
              tableData={tableData}
              formState={formState}
              onFormUpdate={handleFormUpdate}
              onButtonClick={handleButtonClick}
              appData={appData}
              workspaceId={workspaceId}
              urlParams={urlParams}
            />
          </div>
        ))}
      </div>
      </div> {/* end padded outer */}

      {/* Non-blocking toast notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl text-sm font-bold text-white animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-neutral-900'
        }`}>
          {toast.type === 'success' && <span>✓</span>}
          {toast.type === 'error'   && <span>✕</span>}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Component renderer for published apps ─────────────────────────────────
function RunnerComponent({ component, allComponents, tableData, formState, onFormUpdate, onButtonClick, appData, workspaceId, urlParams = {} }: any) {
  const { type, properties, size, id } = component;

  const children = allComponents.filter((c: any) => c.parentId === id);
  const renderChildren = (slotKey?: string) =>
    children
      .filter((c: any) => !slotKey || c.slotKey === slotKey)
      .map((c: any) => (
        <RunnerComponent
          key={c.id}
          component={c}
          allComponents={allComponents}
          tableData={tableData}
          formState={formState}
          onFormUpdate={onFormUpdate}
          onButtonClick={onButtonClick}
          appData={appData}
          workspaceId={workspaceId}
          urlParams={urlParams}
        />
      ));

  switch (type) {
    case 'heading': {
      const Tag = (properties.size || 'h1') as any;
      const cls = cn('font-bold text-neutral-900 tracking-tight',
        properties.size === 'h1' && 'text-4xl',
        properties.size === 'h2' && 'text-3xl',
        properties.size === 'h3' && 'text-2xl');
      return <Tag className={cls}>{properties.text || 'Heading'}</Tag>;
    }
    case 'text':
      return <p className="text-neutral-600 text-sm leading-relaxed">{properties.text || 'Text'}</p>;

    case 'button':
      return (
        <button
          onClick={() => onButtonClick(properties)}
          style={{ width: '100%', height: '100%',
            ...(properties.style === 'custom' ? { backgroundColor: properties.customBg || '#334155', color: properties.customText || '#fff' } : {}) }}
          className={cn('rounded-xl font-bold transition-all shadow-md active:scale-95',
            properties.style === 'primary'   ? 'bg-blue-600 text-white hover:bg-blue-700' :
            properties.style === 'secondary' ? 'bg-white border-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50' :
            properties.style === 'custom'    ? '' : 'bg-red-600 text-white hover:bg-red-700')}
        >
          {properties.label || 'Button'}
        </button>
      );

    case 'input':
      return (
        <div className="space-y-1.5 w-full h-full flex flex-col">
          <label className="text-sm font-bold text-neutral-700">{properties.label || 'Field'}</label>
          <input
            type="text"
            placeholder={properties.placeholder || ''}
            value={formState[properties.fieldMapping || id] ?? urlParams[properties.fieldMapping || id] ?? ''}
            onChange={e => onFormUpdate(properties.fieldMapping || id, e.target.value)}
            className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
          />
        </div>
      );

    case 'select': {
      const opts = properties.options || [];
      return (
        <div className="space-y-1.5 w-full h-full flex flex-col">
          <label className="text-sm font-bold text-neutral-700">{properties.label || 'Dropdown'}</label>
          <select
            value={formState[properties.fieldMapping || id] ?? urlParams[properties.fieldMapping || id] ?? ''}
            onChange={e => onFormUpdate(properties.fieldMapping || id, e.target.value)}
            className="flex-1 px-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none"
          >
            <option value="">Select option…</option>
            {opts.map((o: any, i: number) => <option key={i} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }

    case 'toggle': {
      const opts = properties.options || ['On', 'Off'];
      const val  = formState[properties.fieldMapping || id] ?? opts[0];
      return (
        <div className="space-y-1.5 w-full h-full">
          <label className="text-sm font-bold text-neutral-700">{properties.label || 'Toggle'}</label>
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            {opts.map((o: string, i: number) => (
              <button key={i} onClick={() => onFormUpdate(properties.fieldMapping || id, o)}
                className={cn('flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
                  val === o ? 'bg-white shadow-sm text-blue-600' : 'text-neutral-400')}>
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'table': {
      const rows = tableData[properties.dataSource || appData?.dataSourceId] || [];
      const cols = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'id' && !k.startsWith('_')) : [];
      const vis  = properties.visibleFields?.length > 0 ? cols.filter((c: string) => properties.visibleFields.includes(c)) : cols;
      const tableButtons: any[] = properties.rowButtons || [];
      const startBtns = tableButtons.filter((b: any) => b.position === 'start');
      const endBtns   = tableButtons.filter((b: any) => b.position !== 'start');

      const fireRowBtn = (btn: any, row: any) => {
        if (btn.action === 'app' && btn.targetAppId) {
          const params = new URLSearchParams();
          Object.entries(row).forEach(([k, v]) => { if (k !== 'id') params.set(k, String(v ?? '')); });
          params.set('_rowId', row.id || '');
          params.set('_sourceTable', properties.dataSource || '');
          window.location.href = `/${appData.workspaceSlug || workspaceId}/${btn.targetAppId}?${params.toString()}`;
        } else if (btn.action === 'url' && btn.targetUrl) {
          const url = btn.targetUrl.replace(/\{\{row\.(\w+)\}\}/g, (_: any, f: string) => String(row[f] ?? ''));
          window.open(url, '_blank');
        }
      };

      return (
        <div className="w-full h-full overflow-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {startBtns.length > 0 && <th className="px-3 py-2 w-px" />}
                {vis.map((col: string) => (
                  <th key={col} className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">{col}</th>
                ))}
                {endBtns.length > 0 && <th className="px-3 py-2 w-px" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  {startBtns.length > 0 && (
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1">
                        {startBtns.map((btn: any, bi: number) => (
                          <button key={bi} onClick={() => fireRowBtn(btn, row)}
                            className="px-2 py-1 text-[10px] font-bold rounded text-white whitespace-nowrap hover:opacity-80"
                            style={{ background: btn.color || '#1A56DB' }}>{btn.label || 'Action'}</button>
                        ))}
                      </div>
                    </td>
                  )}
                  {vis.map((col: string) => (
                    <td key={col} className="px-4 py-2 text-neutral-700 text-xs">{String(row[col] ?? '')}</td>
                  ))}
                  {endBtns.length > 0 && (
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1 justify-end">
                        {endBtns.map((btn: any, bi: number) => (
                          <button key={bi} onClick={() => fireRowBtn(btn, row)}
                            className="px-2 py-1 text-[10px] font-bold rounded text-white whitespace-nowrap hover:opacity-80"
                            style={{ background: btn.color || '#1A56DB' }}>{btn.label || 'Action'}</button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-8 text-center text-neutral-400 text-xs">No data</div>}
        </div>
      );
    }

    case 'image':
      return (
        <div className="w-full h-full rounded-xl overflow-hidden bg-neutral-100">
          {properties.src
            ? <img src={properties.src} alt={properties.alt || ''} style={{ width: '100%', height: '100%', objectFit: properties.fit || 'cover' }} />
            : <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">No image</div>}
        </div>
      );

    case 'badge': {
      const v  = properties.variant || 'solid';
      const c  = properties.color || '#1A56DB';
      const tc = v === 'solid' ? (properties.textColor || '#fff') : c;
      const bg = v === 'solid' ? c : `${c}20`;
      const bd = v === 'outline' ? `1.5px solid ${c}` : 'none';
      const sz = properties.size || 'md';
      const szCls = sz === 'sm' ? 'text-[9px] px-2 py-0.5' : sz === 'lg' ? 'text-sm px-4 py-1.5' : 'text-xs px-3 py-1';
      return (
        <div className="flex flex-wrap gap-1.5 items-center w-full h-full">
          {(properties.tags || [{ label: properties.label || 'Badge' }]).map((tag: any, i: number) => (
            <span key={i} className={`inline-flex items-center font-bold rounded-full ${szCls}`} style={{ background: bg, color: tc, border: bd }}>
              {tag.label || tag}
            </span>
          ))}
        </div>
      );
    }

    case 'container':
    case 'section':
      return (
        <div className="w-full h-full rounded-xl border border-neutral-200 p-3 relative">
          {properties.label && <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">{properties.label}</p>}
          <div className="relative" style={{ minHeight: 40 }}>{renderChildren('main')}</div>
        </div>
      );

    default:
      return <div className="w-full h-full bg-neutral-100 rounded-xl flex items-center justify-center text-xs text-neutral-400">{type}</div>;
  }
}
