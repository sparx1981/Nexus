import React, { useState } from 'react';
import { HelpCircle, Terminal, Blocks, ChevronRight, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Field } from '../../types';

interface CalculatedFieldEditorProps {
    onChange: (expr: string) => void;
    availableFields: Field[];
}

export const CalculatedFieldEditor = ({ onChange, availableFields }: CalculatedFieldEditorProps) => {
    const [tab, setTab] = useState<'basic' | 'advanced'>('basic');
    const [showHelp, setShowHelp] = useState(false);
    
    // Basic Builder State
    const [sourceField, setSourceField] = useState('');
    const [aggregation, setAggregation] = useState('NONE');
    const [filterField, setFilterField] = useState('');
    const [filterOp, setFilterOp] = useState('==');
    const [filterVal, setFilterVal] = useState('');

    const generateExpression = () => {
        let expr = '';
        if (aggregation === 'NONE') {
            expr = `row.${sourceField}`;
        } else {
            expr = `${aggregation.toLowerCase()}(query('${sourceField}')`;
            if (filterField && filterVal) {
                expr += `.where('${filterField}', '${filterOp}', '${filterVal}')`;
            }
            expr += ')';
        }
        onChange(expr);
    };

    return (
        <div className="space-y-4 bg-neutral-900/5 dark:bg-neutral-900/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 relative">
            <div className="flex items-center justify-between gap-4">
                <div className="flex bg-white dark:bg-black p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <button 
                        onClick={() => setTab('basic')}
                        className={cn(
                            "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-2",
                            tab === 'basic' ? "bg-primary-600 text-white shadow-md shadow-primary-200/20" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                        )}
                    >
                        <Blocks className="w-3 h-3" /> Basic Builder
                    </button>
                    <button 
                        onClick={() => setTab('advanced')}
                        className={cn(
                            "px-3 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-2",
                            tab === 'advanced' ? "bg-primary-600 text-white shadow-md shadow-primary-200/20" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                        )}
                    >
                        <Terminal className="w-3 h-3" /> Advanced Code
                    </button>
                </div>
                
                <button 
                    onClick={() => setShowHelp(!showHelp)}
                    className={cn(
                        "p-2 rounded-full transition-all",
                        showHelp ? "bg-primary-50 text-primary-600 rotate-12" : "text-neutral-400 hover:bg-neutral-100"
                    )}
                >
                    <HelpCircle className="w-4 h-4" />
                </button>
            </div>

            {tab === 'basic' ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Source Field</label>
                            <select 
                                value={sourceField} 
                                onChange={(e) => setSourceField(e.target.value)}
                                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded outline-none"
                            >
                                <option value="">Select...</option>
                                {availableFields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Aggregation</label>
                            <select 
                                value={aggregation} 
                                onChange={(e) => setAggregation(e.target.value)}
                                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded outline-none"
                            >
                                <option value="NONE">None (Formula)</option>
                                <option value="SUM">SUM</option>
                                <option value="AVG">AVG</option>
                                <option value="COUNT">COUNT</option>
                                <option value="MIN">MIN</option>
                                <option value="MAX">MAX</option>
                            </select>
                        </div>
                    </div>

                    {aggregation !== 'NONE' && (
                        <div className="p-3 bg-white dark:bg-black/40 rounded-lg border border-primary-100 dark:border-primary-900/30 space-y-2">
                             <div className="flex items-center gap-2 text-[9px] font-bold text-primary-600 uppercase tracking-widest mb-1">
                                <Info className="w-3 h-3" /> Optional Filter
                             </div>
                             <div className="grid grid-cols-3 gap-2">
                                <select value={filterField} onChange={(e) => setFilterField(e.target.value)} className="text-[10px] bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded px-1 py-1">
                                    <option value="">Field...</option>
                                    {availableFields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                                </select>
                                <select value={filterOp} onChange={(e) => setFilterOp(e.target.value)} className="text-[10px] bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded px-1 py-1">
                                    <option value="==">==</option>
                                    <option value="!=">!=</option>
                                    <option value=">">&gt;</option>
                                    <option value="<">&lt;</option>
                                </select>
                                <input 
                                    type="text" 
                                    placeholder="Value"
                                    value={filterVal}
                                    onChange={(e) => setFilterVal(e.target.value)}
                                    className="text-[10px] bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded px-1.5 py-1"
                                />
                             </div>
                        </div>
                    )}

                    <button 
                        onClick={generateExpression}
                        className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                        Generate Expression <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <textarea 
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="where('status', '==', 'active')"
                        className="w-full h-24 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-xs font-mono outline-none focus:ring-1 focus:ring-primary-600/20 shadow-inner"
                    />
                </div>
            )}

            {showHelp && (
                <div className="absolute top-0 right-[-240px] w-[220px] bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-4 z-50 animate-in slide-in-from-left-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded bg-primary-100 flex items-center justify-center text-primary-600">
                            <Info className="w-3 h-3" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-900 dark:text-white">Firestore Reference</h4>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Basic equality</p>
                            <code className="text-[9px] block bg-neutral-50 dark:bg-black p-1.5 rounded text-primary-600">where("status", "==", "active")</code>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Range filter</p>
                            <code className="text-[9px] block bg-neutral-50 dark:bg-black p-1.5 rounded text-primary-600">where("age", "&gt;=", 18)</code>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Array contains</p>
                            <code className="text-[9px] block bg-neutral-50 dark:bg-black p-1.5 rounded text-primary-600">where("tags", "array-contains", "featured")</code>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Order and Limit</p>
                            <code className="text-[9px] block bg-neutral-50 dark:bg-black p-1.5 rounded text-primary-600">orderBy("createdAt", "desc"), limit(10)</code>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Aggregations</p>
                            <code className="text-[9px] block bg-neutral-50 dark:bg-black p-1.5 rounded text-primary-600 italic">Supported via Builder tab</code>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
