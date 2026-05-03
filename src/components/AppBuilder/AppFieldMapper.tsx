import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSchemaStore } from '../../store/schemaStore';
import { ChevronDown, Link2, Type, Minus } from 'lucide-react';

/**
 * AppFieldMapper — shown when a button action is "Go To Application".
 *
 * Props:
 *   targetAppId        — ID of the destination app
 *   workspaceId        — current workspace/project ID
 *   sourceComponents   — components on the CURRENT app canvas (source of mappable fields)
 *   sourceAppData      — current app's metadata (dataSourceId etc.)
 *   mappings           — saved mapping array: { targetField, sourceField?, staticValue? }[]
 *   onChange           — called when mappings change
 */
export function AppFieldMapper({
  targetAppId,
  workspaceId,
  sourceComponents,
  sourceAppData,
  mappings = [],
  onChange,
}: {
  targetAppId: string;
  workspaceId: string;
  sourceComponents: any[];
  sourceAppData: any;
  mappings: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
}) {
  const { tables } = useSchemaStore();
  const [targetApp, setTargetApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetAppId || !workspaceId) return;
    setLoading(true);
    getDoc(doc(db, 'workspaces', workspaceId, 'apps', targetAppId))
      .then(snap => { if (snap.exists()) setTargetApp({ id: snap.id, ...snap.data() }); })
      .finally(() => setLoading(false));
  }, [targetAppId, workspaceId]);

  if (!targetAppId) return null;
  if (loading) return <div className="text-[10px] text-neutral-400 italic py-2 text-center">Loading target app fields…</div>;
  if (!targetApp) return <div className="text-[10px] text-rose-400 italic py-2">Could not load target application.</div>;

  // ── Fields on the TARGET app ─────────────────────────────────────────────
  // Inputs + fields from the target app's data source table, plus Key Fields
  const targetComps = (targetApp.components || []).filter((c: any) =>
    ['input', 'select', 'toggle', 'date'].includes(c.type)
  );
  const targetTableId = targetApp.dataSourceId;
  const targetTable   = tables.find(t => t.id === targetTableId);
  const targetKeyFields: string[] = targetApp.keyFields || [];

  // Build a deduplicated list of "receivable" parameter names on the target app
  const targetFields: { name: string; label: string; isKey: boolean; fromInput: boolean }[] = [];
  const seen = new Set<string>();

  // From input components (field mapping)
  targetComps.forEach((c: any) => {
    const fm = c.properties?.fieldMapping || c.id;
    if (!seen.has(fm)) {
      seen.add(fm);
      targetFields.push({ name: fm, label: c.properties?.label || c.label || fm, isKey: targetKeyFields.includes(fm), fromInput: true });
    }
  });

  // From key fields (if not already from a component)
  targetKeyFields.forEach(kf => {
    if (!seen.has(kf)) {
      seen.add(kf);
      const tableField = targetTable?.fields.find((f: any) => f.id === kf || f.name === kf);
      targetFields.push({ name: kf, label: tableField?.name || kf, isKey: true, fromInput: false });
    }
  });

  // Special always-available params
  ['_rowId', '_sourceTable'].forEach(sp => {
    if (!seen.has(sp)) targetFields.push({ name: sp, label: sp, isKey: false, fromInput: false });
  });

  // ── Fields available on the SOURCE app ──────────────────────────────────
  const sourceFields: { value: string; label: string }[] = [{ value: '', label: '— pick a source field —' }];
  sourceComponents.filter((c: any) => ['input', 'select', 'toggle', 'date'].includes(c.type)).forEach((c: any) => {
    const fm = c.properties?.fieldMapping || c.id;
    sourceFields.push({ value: fm, label: c.properties?.label || c.label || fm });
  });
  // Also offer table fields from source app
  const sourceTable = tables.find(t => t.id === sourceAppData?.dataSourceId);
  (sourceTable?.fields || []).forEach((f: any) => {
    if (!sourceFields.find(sf => sf.value === f.name)) {
      sourceFields.push({ value: f.name, label: `${f.name} (table)` });
    }
  });
  // Special params that may be in the current URL
  ['_rowId', '_sourceTable'].forEach(sp => {
    if (!sourceFields.find(sf => sf.value === sp)) sourceFields.push({ value: sp, label: sp });
  });

  // ── Mapping helpers ──────────────────────────────────────────────────────
  const getMapping = (targetField: string): FieldMapping =>
    mappings.find(m => m.targetField === targetField) || { targetField, sourceField: '', staticValue: '' };

  const updateMapping = (targetField: string, patch: Partial<FieldMapping>) => {
    const existing = getMapping(targetField);
    const updated  = { ...existing, ...patch };
    const next = mappings.filter(m => m.targetField !== targetField);
    // Only include if something is actually mapped
    if (updated.sourceField || updated.staticValue) next.push(updated);
    onChange(next);
  };

  if (targetFields.length === 0) {
    return (
      <div className="text-[10px] text-neutral-400 italic py-2 text-center">
        The target app has no input fields or key fields configured yet.
      </div>
    );
  }

  return (
    <div className="space-y-1 mt-1">
      <div className="grid grid-cols-[1fr_10px_1fr] gap-x-1 items-center mb-1 px-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Target Field</span>
        <span />
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Source / Value</span>
      </div>
      {targetFields.map(tf => {
        const m = getMapping(tf.name);
        const mode = m.staticValue ? 'static' : 'source';
        return (
          <div key={tf.name} className="grid grid-cols-[1fr_10px_1fr] gap-x-1 items-center">
            {/* Target field label */}
            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold truncate border ${
              tf.isKey
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300'
            }`}>
              {tf.isKey && <span className="text-[8px] bg-amber-500 text-white px-1 rounded uppercase font-black shrink-0">key</span>}
              {tf.label}
            </div>

            {/* Arrow */}
            <Link2 className="w-2.5 h-2.5 text-neutral-300 mx-auto" />

            {/* Source selector + mode toggle */}
            <div className="flex gap-1">
              {mode === 'source' ? (
                <select
                  value={m.sourceField || ''}
                  onChange={e => updateMapping(tf.name, { sourceField: e.target.value, staticValue: '' })}
                  className="flex-1 px-1.5 py-1 text-[10px] bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg outline-none dark:text-white truncate"
                >
                  {sourceFields.map(sf => <option key={sf.value} value={sf.value}>{sf.label}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Static value…"
                  value={m.staticValue || ''}
                  onChange={e => updateMapping(tf.name, { staticValue: e.target.value, sourceField: '' })}
                  className="flex-1 px-1.5 py-1 text-[10px] bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg outline-none dark:text-white"
                />
              )}
              <button
                title={mode === 'source' ? 'Switch to static value' : 'Switch to source field'}
                onClick={() => updateMapping(tf.name, mode === 'source' ? { staticValue: ' ', sourceField: '' } : { sourceField: '', staticValue: '' })}
                className="p-1 rounded-md border border-neutral-200 dark:border-slate-700 hover:border-primary-400 text-neutral-400 hover:text-primary-600 transition-all bg-white dark:bg-slate-800 shrink-0"
              >
                {mode === 'source' ? <Type className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>
              {(m.sourceField || m.staticValue) && (
                <button
                  title="Clear mapping"
                  onClick={() => updateMapping(tf.name, { sourceField: '', staticValue: '' })}
                  className="p-1 rounded-md text-rose-300 hover:text-rose-500 transition-colors shrink-0"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-[9px] text-neutral-400 italic mt-2 leading-relaxed">
        Fields left blank will not be passed as URL parameters. Key fields (amber) are used for update/delete matching.
        Toggle <Type className="w-2.5 h-2.5 inline" /> to enter a static value instead of a source field.
      </p>
    </div>
  );
}

export interface FieldMapping {
  targetField: string;
  sourceField?: string;
  staticValue?: string;
}

/** Build a URLSearchParams string from mappings + current form/row state */
export function buildParamUrl(
  baseUrl: string,
  mappings: FieldMapping[],
  formOrRowData: Record<string, any>
): string {
  const params = new URLSearchParams();
  mappings.forEach(m => {
    const value = m.sourceField
      ? String(formOrRowData[m.sourceField] ?? '')
      : (m.staticValue || '');
    if (value !== '') params.set(m.targetField, value);
  });
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}
