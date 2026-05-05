import React, { useState, useEffect, useRef } from 'react';
import { 
  UserPlus, Trash2, Shield, Mail, X, Check, SlidersHorizontal, Palette, RotateCcw, Settings2, ChevronRight, Upload, Type, ImageIcon, Menu, AlignLeft, AlignRight, GripVertical, ListOrdered
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../services/dataService';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { useProjectSettingsStore, DEFAULT_PROJECT_SETTINGS, FONT_OPTIONS } from '../../store/projectSettingsStore';

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer p-0.5 bg-transparent shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white"
        />
      </div>
    </div>
  );
}

function FontSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white"
        style={{ fontFamily: value }}
      >
        {FONT_OPTIONS.map(f => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
        ))}
      </select>
      <p className="text-xs text-neutral-500 dark:text-slate-500 px-1" style={{ fontFamily: value }}>
        The quick brown fox jumps over the lazy dog
      </p>
    </div>
  );
}

type SettingsTab = 'appearance' | 'members' | 'access';

// ── Collapsible section wrapper ───────────────────────────────────────────────
function Section({ title, icon, defaultOpen = true, children }: { title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center gap-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-slate-800/50"
        style={{ background: 'var(--bg-primary)', borderBottom: open ? '1px solid var(--border-color)' : 'none' }}
      >
        <span className="text-neutral-400">{icon}</span>
        <span className="font-bold text-sm text-neutral-900 dark:text-white flex-1">{title}</span>
        <ChevronRight className={cn("w-4 h-4 text-neutral-400 transition-transform", open && "rotate-90")} />
      </button>
      {open && <div className="p-5 space-y-5">{children}</div>}
    </div>
  );
}

// ── Appearance Panel ──────────────────────────────────────────────────────────
function AppearancePanel({ settings, setSettings, logoInputRef, allApps }: {
  settings: any;
  setSettings: (v: any) => void;
  logoInputRef: React.RefObject<HTMLInputElement>;
  allApps: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-6 min-h-0">
      {/* Header + reset */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Appearance</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Control the visual style of all applications in this project.</p>
        </div>
        <button
          onClick={() => setSettings(DEFAULT_PROJECT_SETTINGS)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset defaults
        </button>
      </div>

      {/* ── Sticky preview ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
        <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Live Preview</span>
        </div>
        <div className="p-4" style={{ background: settings.applicationBackgroundColour }}>
          {settings.enableApplicationHeadings && (
            <div
              className="rounded-xl mb-4 flex items-center gap-3 px-4 text-white text-sm font-bold overflow-hidden"
              style={{ background: settings.headingBackgroundColour, height: settings.headingHeight, fontFamily: settings.headingFontFamily }}
            >
              {settings.menuEnabled && (settings.menuType === 'burger-left' || settings.menuType === 'slide-left') && (
                <div className="flex flex-col gap-[3px] shrink-0 opacity-80">
                  <div className="w-3.5 h-0.5 bg-white rounded" /><div className="w-3.5 h-0.5 bg-white rounded" /><div className="w-3.5 h-0.5 bg-white rounded" />
                </div>
              )}
              {settings.headingLogoUrl && <img src={settings.headingLogoUrl} alt="Logo" className="h-6 w-auto object-contain shrink-0" />}
              <span className="truncate flex-1">{settings.headingText || 'Application Name'}</span>
              {settings.menuEnabled && settings.menuType === 'burger-right' && (
                <div className="flex flex-col gap-[3px] shrink-0 opacity-80">
                  <div className="w-3.5 h-0.5 bg-white rounded" /><div className="w-3.5 h-0.5 bg-white rounded" /><div className="w-3.5 h-0.5 bg-white rounded" />
                </div>
              )}
            </div>
          )}
          <div className="rounded-xl border p-3 mb-3" style={{ background: 'rgba(255,255,255,0.6)', borderColor: 'rgba(0,0,0,0.08)' }}>
            <label className="block text-xs font-semibold mb-1.5 text-neutral-600" style={{ fontFamily: settings.labelFontFamily }}>Field Label</label>
            <div className="px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-500 bg-white" style={{ fontFamily: settings.textFontFamily }}>Sample input text…</div>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <button className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm" style={{ background: settings.buttonColourStandard, fontFamily: settings.textFontFamily }}>Primary</button>
            <button className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm" style={{ background: settings.buttonColourHover, fontFamily: settings.textFontFamily }}>Hover</button>
            <button className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm" style={{ background: settings.buttonColourClicked, fontFamily: settings.textFontFamily }}>Active</button>
          </div>
        </div>
      </div>

      {/* ── Collapsible sections ────────────────────────────────────────── */}

      {/* Header */}
      <Section title="Application Header" icon={<Settings2 className="w-4 h-4" />} defaultOpen={false}>
        {/* Enable */}
        <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-white">Show Header Bar</p>
            <p className="text-xs text-neutral-400 mt-0.5">Display a header at the top of published apps</p>
          </div>
          <button onClick={() => setSettings({ enableApplicationHeadings: !settings.enableApplicationHeadings })}
            className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors", settings.enableApplicationHeadings ? "bg-primary-600" : "bg-neutral-200 dark:bg-neutral-700")}>
            <span className={cn("pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform", settings.enableApplicationHeadings ? "translate-x-5" : "translate-x-0")} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Heading Text</label>
            <input type="text" value={settings.headingText} onChange={e => setSettings({ headingText: e.target.value })}
              placeholder="Application heading text…"
              className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Height (px)</label>
            <input type="number" value={settings.headingHeight} onChange={e => setSettings({ headingHeight: parseInt(e.target.value) || 48 })}
              className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600/20 dark:text-white" />
          </div>
        </div>
        <ColorField label="Background Colour" value={settings.headingBackgroundColour} onChange={v => setSettings({ headingBackgroundColour: v })} />
        {/* Logo */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Logo</label>
          <div className="flex items-center gap-3">
            {settings.headingLogoUrl ? (
              <div className="relative w-14 h-10 rounded-lg border border-neutral-200 dark:border-slate-700 overflow-hidden bg-neutral-50 flex items-center justify-center shrink-0">
                <img src={settings.headingLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                <button onClick={() => setSettings({ headingLogoUrl: '' })} className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white hover:bg-rose-600"><X className="w-2.5 h-2.5" /></button>
              </div>
            ) : (
              <div className="w-14 h-10 rounded-lg border-2 border-dashed border-neutral-200 dark:border-slate-700 flex items-center justify-center shrink-0"><ImageIcon className="w-5 h-5 text-neutral-300" /></div>
            )}
            <div className="flex-1 min-w-0">
              <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-all" style={{ color: 'var(--text-secondary)' }}>
                <Upload className="w-3.5 h-3.5" />{settings.headingLogoUrl ? 'Replace' : 'Upload logo'}
              </button>
              <p className="text-[10px] text-neutral-400 mt-1">PNG, JPG, SVG — max 500 KB</p>
            </div>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={e => {
              const file = e.target.files?.[0]; if (!file) return;
              if (file.size > 512_000) { alert('Please choose an image under 500 KB.'); return; }
              const reader = new FileReader();
              reader.onload = ev => { setSettings({ headingLogoUrl: ev.target?.result as string }); };
              reader.readAsDataURL(file); e.target.value = '';
            }} />
          </div>
        </div>
        <FontSelect label="Header Font" value={settings.headingFontFamily} onChange={v => setSettings({ headingFontFamily: v })} />
      </Section>

      {/* Colours */}
      <Section title="Colours" icon={<Palette className="w-4 h-4" />} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-5">
          <ColorField label="Application Background" value={settings.applicationBackgroundColour} onChange={v => setSettings({ applicationBackgroundColour: v })} />
          <ColorField label="Component Primary" value={settings.componentPrimaryColour} onChange={v => setSettings({ componentPrimaryColour: v })} />
          <ColorField label="Component Secondary" value={settings.componentSecondaryColour} onChange={v => setSettings({ componentSecondaryColour: v })} />
          <ColorField label="Text Colour" value={settings.textColour || '#111827'} onChange={v => setSettings({ textColour: v })} />
        </div>

        {/* Menu Colour — with "Same as header" default */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Menu Colour</label>
            <button
              onClick={() => setSettings({ menuColour: settings.menuColour ? null : settings.headingBackgroundColour })}
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all",
                !settings.menuColour
                  ? "bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-900/40 text-primary-600 dark:text-primary-400"
                  : "border-neutral-200 dark:border-slate-700 text-neutral-400 hover:border-neutral-300"
              )}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: settings.menuColour ? settings.menuColour : settings.headingBackgroundColour }} />
              Same as header
            </button>
          </div>
          {settings.menuColour && (
            <ColorField label="Custom menu colour" value={settings.menuColour} onChange={v => setSettings({ menuColour: v })} />
          )}
          {!settings.menuColour && (
            <p className="text-[10px] text-neutral-400 italic px-1">Menu will use the same colour as the application header. Click "Same as header" above to set a custom colour.</p>
          )}
        </div>
      </Section>

      {/* Button Colours */}
      <Section title="Button Colours" icon={<SlidersHorizontal className="w-4 h-4" />} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-5">
          <ColorField label="Standard" value={settings.buttonColourStandard} onChange={v => setSettings({ buttonColourStandard: v })} />
          <ColorField label="Hover" value={settings.buttonColourHover} onChange={v => setSettings({ buttonColourHover: v })} />
          <ColorField label="Clicked / Active" value={settings.buttonColourClicked} onChange={v => setSettings({ buttonColourClicked: v })} />
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography" icon={<Type className="w-4 h-4" />} defaultOpen={false}>
        <FontSelect label="Label Font (field labels, headings in components)" value={settings.labelFontFamily} onChange={v => setSettings({ labelFontFamily: v })} />
        <FontSelect label="Text Font (input text, body content)" value={settings.textFontFamily} onChange={v => setSettings({ textFontFamily: v })} />
      </Section>

      {/* Navigation Menu */}
      <Section title="Navigation Menu" icon={<Menu className="w-4 h-4" />} defaultOpen={false}>
        <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-white">Enable Navigation Menu</p>
            <p className="text-xs text-neutral-400 mt-0.5">Allow users to navigate between apps from the header</p>
          </div>
          <button onClick={() => setSettings({ menuEnabled: !settings.menuEnabled })}
            className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors", settings.menuEnabled ? "bg-primary-600" : "bg-neutral-200 dark:bg-neutral-700")}>
            <span className={cn("pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform", settings.menuEnabled ? "translate-x-5" : "translate-x-0")} />
          </button>
        </div>
        {settings.menuEnabled && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Menu Style</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'burger-left',  label: 'Burger — Left',  icon: <AlignLeft className="w-5 h-5" /> },
                  { value: 'burger-right', label: 'Burger — Right', icon: <AlignRight className="w-5 h-5" /> },
                  { value: 'slide-left',   label: 'Slide-out Left', icon: <Menu className="w-5 h-5" /> },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => setSettings({ menuType: opt.value })}
                    className={cn("p-3 rounded-xl border text-left transition-all flex flex-col items-center gap-1.5",
                      settings.menuType === opt.value
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-950/20 text-primary-700 ring-2 ring-primary-500/20"
                        : "border-neutral-200 dark:border-slate-700 text-neutral-500 hover:border-neutral-300")}>
                    {opt.icon}
                    <span className="text-[10px] font-bold text-center leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Applications in Menu</label>
                <span className="text-[10px] text-neutral-400">{settings.menuAppIds.length} selected</span>
              </div>
              {allApps.length === 0 ? (
                <p className="text-xs text-neutral-400 italic px-1">No applications yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-xl border p-2" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
                  {allApps.map(app => {
                    const checked = settings.menuAppIds.includes(app.id);
                    const idx = settings.menuAppIds.indexOf(app.id);
                    return (
                      <div key={app.id}
                        className={cn("flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all", checked ? "bg-primary-50 dark:bg-primary-950/20" : "hover:bg-neutral-50 dark:hover:bg-slate-800")}
                        onClick={() => setSettings({ menuAppIds: checked ? settings.menuAppIds.filter((id: string) => id !== app.id) : [...settings.menuAppIds, app.id] })}>
                        <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all", checked ? "border-primary-500 bg-primary-500" : "border-neutral-300 dark:border-slate-600")}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-sm font-medium text-neutral-700 dark:text-slate-300 flex-1">{app.name}</span>
                        {checked && <span className="text-[10px] font-black text-primary-500 bg-primary-50 dark:bg-primary-950/30 px-1.5 py-0.5 rounded-full">#{idx + 1}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}



export function ProjectSettings() {
  const { user, selectedProjectId } = useAuthStore();
  const [projectData, setProjectData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<string | null>(null);
  const { settings, setSettings } = useProjectSettingsStore();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [allApps, setAllApps] = useState<{ id: string; name: string }[]>([]);

  // Load available apps for menu configuration
  useEffect(() => {
    if (!selectedProjectId) return;
    const unsub = onSnapshot(query(collection(db, 'workspaces', selectedProjectId, 'apps')), snap => {
      setAllApps(snap.docs.map(d => ({ id: d.id, name: d.data().name || d.id })).sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsub();
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    const unsub = onSnapshot(doc(db, 'workspaces', selectedProjectId), (snap) => {
      if (snap.exists()) setProjectData(snap.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `workspaces/${selectedProjectId}`);
    });
    return () => unsub();
  }, [selectedProjectId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'workspaces', selectedProjectId!), {
        memberships: arrayUnion({ email: inviteEmail.toLowerCase(), role: inviteRole, invitedAt: new Date().toISOString(), status: 'pending' })
      });
      setInviteEmail(''); setShowInviteModal(false);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const confirmRemoveMember = async () => {
    if (!removeMemberTarget || !projectData) return;
    const member = projectData.memberships.find((m: any) => m.email === removeMemberTarget);
    if (member && selectedProjectId) {
      await updateDoc(doc(db, 'workspaces', selectedProjectId), { memberships: arrayRemove(member) });
    }
    setRemoveMemberTarget(null);
  };

  if (!projectData) return null;
  const isOwner = projectData.ownerId === user?.id;
  const isAdmin = isOwner || projectData.memberships?.find((m: any) => m.email === user?.email)?.role === 'admin';

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'members', label: 'Members', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'access', label: 'App Access', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-full" style={{ color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <nav className="w-52 border-r shrink-0 p-4 space-y-1" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-3 mb-3">Settings</p>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
              activeTab === tab.id
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                : "text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800"
            )}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-auto" />}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8" style={{ maxWidth: activeTab === 'appearance' ? '720px' : '768px' }}>

        {/* ── Appearance tab ──────────────────────────────────────────── */}
        {activeTab === 'appearance' && (
          <AppearancePanel
            settings={settings}
            setSettings={setSettings}
            logoInputRef={logoInputRef}
            allApps={allApps}
          />
        )}

        {/* ── Members tab ──────────────────────────────────────────────── */}
        {activeTab === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Project Members</h2>
                <p className="text-sm text-neutral-500 mt-0.5">Manage who has access to this workspace.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95"
                >
                  <UserPlus className="w-4 h-4" /> Share Access
                </button>
              )}
            </div>

            <div className="rounded-2xl shadow-sm overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <table className="w-full text-left">
                <thead className="border-b" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Member</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm ring-2 ring-white dark:ring-neutral-800">
                          {projectData.ownerEmail?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">{projectData.ownerEmail}</p>
                          <p className="text-[10px] text-neutral-400 font-medium">Workspace Owner</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="px-2.5 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-wider rounded-full">Owner</span></td>
                    <td className="px-6 py-4"><span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wider"><Check className="w-3 h-3" /> Active</span></td>
                    <td className="px-6 py-4 text-right"></td>
                  </tr>
                  {projectData.memberships?.map((member: any, i: number) => (
                    <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 text-sm ring-2 ring-white dark:ring-neutral-800">
                            {member.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900 dark:text-white">{member.email}</p>
                            <p className="text-[10px] text-neutral-400 font-medium italic">Shared Access</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          member.role === 'admin' ? "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400")}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                          member.status === 'active' ? "text-emerald-600" : "text-amber-500")}>
                          <Check className="w-3 h-3" /> {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin && member.role !== 'admin' && (
                          <button onClick={() => setRemoveMemberTarget(member.email)}
                            className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Access tab ───────────────────────────────────────────────── */}
        {activeTab === 'access' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Published App Access</h2>
              <p className="text-sm text-neutral-500 mt-0.5">Control who can access published app URLs for this project.</p>
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white mb-0.5">Require Sign-In</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      When <strong>enabled</strong>, users must log into Nexus before accessing published app URLs.
                      When <strong>disabled</strong>, published apps are fully public.
                    </p>
                  </div>
                  <button
                    onClick={() => setSettings({ requireSignIn: !settings.requireSignIn })}
                    className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none mt-1",
                      settings.requireSignIn ? "bg-primary-600" : "bg-neutral-200 dark:bg-neutral-700")}
                  >
                    <span className={cn("pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                      settings.requireSignIn ? "translate-x-5" : "translate-x-0")} />
                  </button>
                </div>
                <div className={cn("flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium",
                  settings.requireSignIn
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400")}>
                  <div className={cn("w-2 h-2 rounded-full shrink-0", settings.requireSignIn ? "bg-amber-500" : "bg-emerald-500")} />
                  {settings.requireSignIn ? "Sign-in required — only project members can access published apps" : "Public access — anyone with the URL can use published apps"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}></div>
          <div className="relative bg-white dark:bg-[#121212] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 dark:text-white">Share Workspace Access</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input autoFocus type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 outline-none dark:text-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['member', 'admin'] as const).map(role => (
                    <button key={role} type="button" onClick={() => setInviteRole(role)}
                      className={cn("p-3 rounded-xl border text-left transition-all",
                        inviteRole === role ? "border-primary-600 bg-primary-50/50 text-primary-600 ring-2 ring-primary-600/10" : "border-neutral-200 dark:border-neutral-800 text-neutral-400")}>
                      <span className="block text-xs font-bold mb-0.5 capitalize">{role}</span>
                      <span className="text-[10px] opacity-70">{role === 'member' ? 'View and edit data' : 'Full workspace control'}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={loading || !inviteEmail} className="flex-1 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50">
                  {loading ? 'Sending…' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removeMemberTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-neutral-200 dark:border-slate-700">
            <h3 className="font-bold text-neutral-900 dark:text-white mb-1">Remove access</h3>
            <p className="text-sm text-neutral-500 mb-6">Remove <span className="font-semibold text-neutral-700 dark:text-neutral-200">{removeMemberTarget}</span>? They will lose all access immediately.</p>
            <div className="flex gap-3">
              <button onClick={confirmRemoveMember} className="flex-1 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 active:scale-95 transition-all">Remove</button>
              <button onClick={() => setRemoveMemberTarget(null)} className="flex-1 py-2.5 text-neutral-600 dark:text-neutral-400 text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
