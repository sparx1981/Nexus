import React, { useState } from 'react';
import { Field, FieldType } from '../../types';
import { cn } from '../../lib/utils';
import { HelpCircle, ChevronRight, Calculator, Code, FileCode, CheckCircle2 } from 'lucide-react';

interface CalculatedFieldEditorProps {
  availableFields: Field[];
  onChange: (expression: string) => void;
}

export const CalculatedFieldEditor: React.FC<CalculatedFieldEditorProps> = ({ availableFields, onChange }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [showDocs, setShowDocs] = useState(false);
  
  // Basic Builder States
  const [sourceField, setSourceField] = useState('');
  const [aggregation, setAggregation] = useState('NONE');
  const [filterField, setFilterField] = useState('');
  const [filterOp, setFilterOp] = useState('==');
  const [filterValue, setFilterValue] = useState('');
  
  const [advancedExpr, setAdvancedExpr] = useState('');

  const handleGenerate = () => {
    let expr = '';
    if (aggregation === 'NONE') {
      expr = sourceField;
    } else {
      expr = `${aggregation.toLowerCase()}(${sourceField})`;
    }
    
    if (filterField && filterValue) {
      expr += `.where("${filterField}", "${filterOp}", "${filterValue}")`;
    }
    
    setAdvancedExpr(expr);
    onChange(expr);
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl gap-1">
        <button 
          onClick={() => setActiveTab('basic')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold rounded-lg transition-all",
            activeTab === 'basic' ? "bg-white dark:bg-neutral-700 text-primary-600 shadow-sm" : "text-neutral-500"
          )}
        >
          <Calculator className="w-3 h-3" /> Basic Builder
        </button>
        <button 
          onClick={() => setActiveTab('advanced')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold rounded-lg transition-all",
            activeTab === 'advanced' ? "bg-white dark:bg-neutral-700 text-primary-600 shadow-sm" : "text-neutral-500"
          )}
        >
          <Code className="w-3 h-3" /> Advanced Code
        </button>
      </div>

      {activeTab === 'basic' ? (
        <div className="space-y-3 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Source Field</label>
            <select 
              value={sourceField}
              onChange={(e) => setSourceField(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded outline-none dark:text-white"
            >
              <option value="">Select a field...</option>
              {availableFields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Aggregation</label>
            <select 
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded outline-none dark:text-white"
            >
              <option value="NONE">None (Direct Value)</option>
              <option value="SUM">Sum</option>
              <option value="AVG">Average</option>
              <option value="COUNT">Count</option>
              <option value="MIN">Minimum</option>
              <option value="MAX">Maximum</option>
            </select>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Filter (Optional)</label>
            <div className="grid grid-cols-2 gap-2">
               <select 
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="px-2 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded outline-none dark:text-white"
               >
                 <option value="">Field...</option>
                 {availableFields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
               </select>
               <select 
                value={filterOp}
                onChange={(e) => setFilterOp(e.target.value)}
                className="px-2 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded outline-none dark:text-white"
               >
                 <option value="==">Is</option>
                 <option value="!=">Is Not</option>
                 <option value=">">Greater Than</option>
                 <option value="<">Less Than</option>
               </select>
            </div>
            <input 
              type="text"
              placeholder="Value..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded outline-none dark:text-white"
            />
          </div>

          <button 
            type="button"
            onClick={handleGenerate}
            className="w-full py-2 bg-primary-50 text-primary-600 rounded-lg text-[10px] font-bold hover:bg-primary-100 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-3 h-3" /> Generate Expression
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea 
            value={advancedExpr}
            onChange={(e) => {
              setAdvancedExpr(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="e.g. sum(amount).where('status', '==', 'paid')"
            className="w-full h-32 px-3 py-2 text-xs font-mono bg-neutral-900 text-emerald-400 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-primary-600/50 outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 font-medium italic">Firestore-compatible expression</span>
            <button 
              type="button"
              onClick={() => setShowDocs(!showDocs)}
              className="flex items-center gap-1 text-[10px] font-bold text-primary-600 hover:underline"
            >
              <HelpCircle className="w-3 h-3" /> Syntax Guide
            </button>
          </div>
        </div>
      )}

      {showDocs && (
        <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-[300] animate-in slide-in-from-right duration-300 flex flex-col">
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary-600" /> Reference Guide
            </h4>
            <button onClick={() => setShowDocs(false)} className="text-neutral-400 hover:text-neutral-900 transition-colors">
               <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Filters</h5>
              <div className="space-y-2">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-[10px] font-bold text-neutral-500 mb-1">Basic equality</p>
                  <code className="text-[10px] text-primary-600">where("status", "==", "active")</code>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-[10px] font-bold text-neutral-500 mb-1">Range filter</p>
                  <code className="text-[10px] text-primary-600">where("age", "{'>'}=", 18)</code>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-[10px] font-bold text-neutral-500 mb-1">Array contains</p>
                  <code className="text-[10px] text-primary-600">where("tags", "array-contains", "featured")</code>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Aggregations</h5>
              <div className="space-y-2">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-[10px] font-bold text-neutral-500 mb-1">Count documents</p>
                  <code className="text-[10px] text-primary-600">getCountFromServer(query)</code>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-[10px] font-bold text-neutral-500 mb-1">Sum field</p>
                  <code className="text-[10px] text-primary-600">getAggregateFromServer(query, &#123; total: sum("amount") &#125;)</code>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] text-neutral-400 font-medium italic">Calculated fields are derived in real-time from server aggregates or record properties.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
