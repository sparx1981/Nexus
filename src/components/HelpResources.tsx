import React, { useState } from 'react';
import { HelpCircle, History, X, Search, ChevronRight, Copy, Check,
  BookOpen, Link2, Code, Table, MousePointerClick, Zap, Globe, Database, Lightbulb, ArrowRight, Cpu, AlertTriangle, Sparkles, MessageSquare, Wand2
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Release Notes ────────────────────────────────────────────────────────────
const RELEASE_NOTES = [
  {
    date: '2026-05-03',
    version: 'v0.7',
    changes: [
      'Field Mapping for App Navigation: Button and Row Button "Go To Application" now supports explicit field mapping — choose which fields to pass and whether they come from the current form/row or a static value. Key fields (amber) are highlighted for easy identification.',
      'Multi-select on canvas fully fixed: rubber-band marquee now correctly selects any number of components. Resolved React state-updater side-effect bug that capped selection at two items.',
      'User Documentation moved into Support Center: all documentation is now available in the Help → User Documentation tab. Removed separate Documentation sidebar entry.',
      'Developer Suite removed from Support Center.',
      'Release Notes updated to reflect actual shipped features.',
    ]
  },
  {
    date: '2026-05-02',
    version: 'v0.6',
    changes: [
      'Parameter passing between applications: clicking a row button navigates to a target app with row data passed as URL query parameters. Target app inputs pre-fill automatically.',
      'Published app URL structure: apps now publish to /{workspaceSlug}/{appId} format. Published apps render completely outside the Nexus builder — no login screen for public apps.',
      'Require Sign-In toggle in Project Settings: controls whether published app URLs are public or require a Nexus account.',
      'Image component: upload or URL input, object-fit control, and live preview in Properties Panel.',
      'Badge component: full config — tags, variant (solid/soft/outline), size, colours, live preview.',
      'Components now drop where you drag them on the canvas (fixed top-left placement bug).',
      'Context menu for multi-select: right-click any selected component to align or delete. Fixed close-timing so button clicks always register.',
    ]
  },
  {
    date: '2026-05-01',
    version: 'v0.5',
    changes: [
      'Workflow Logs panel: real-time log streaming in the designer. Each execution shows per-step status and messages.',
      'Workflow activation toggle: workflows can be switched between Draft and Active directly from the card list or designer header.',
      'Received Email trigger: poll a connected Gmail account for new emails with From / Subject / CC / Has Attachment filters. Email fields available as {{email.from}}, {{email.subject}}, {{email.body}} etc. in downstream nodes.',
      'Google OAuth for Send Email: connect a Gmail account to send emails directly from workflows. Shared Google Client ID setup panel in both Send Email and Received Email nodes.',
      'Fixed: Google Chat node not firing when disconnected from trigger chain.',
      'Fixed: Email node firing even when not connected to the workflow.',
      'After Action in Application Settings: choose what happens after Submit — Do Nothing, Go To Application, Go To URL, or Trigger Workflow.',
      'Row Button actions: each row button can independently navigate to an app, open a URL (with {{row.field}} tokens), or trigger a workflow.',
    ]
  },
  {
    date: '2026-04-30',
    version: 'v0.4',
    changes: [
      'Published app snapshots: publishing now saves a frozen copy (publishedComponents). Live edits do not affect the published version until you republish.',
      'Published app routing now bypasses auth — /workspaceSlug/appId renders the standalone app without requiring login.',
      'Inline node delete button on workflow nodes (× in header, visible on hover/select).',
      'Send Email node: controlled inputs — Recipient, CC, Subject, Body all properly stored in node data.',
      'Save workflow sanitises undefined values before writing to Firestore (fixed Google Chat "Save Failed").',
    ]
  },
  {
    date: '2026-04-29',
    version: 'v0.3',
    changes: [
      'Workflows: trigger workflows on record creation. dataService.addRecord now calls triggerWorkflows with BFS graph traversal — only nodes reachable from the trigger via edges execute.',
      'Workflow node types: Send Email, Update Record, Create Record, Post To API, Google Chat, Advanced HTTP, AI Generate, Condition, Delay.',
      'Multi-select components: Shift+click or Ctrl+click adds to selection. Right-click opens context menu with Align Left/Right/Top/Bottom and Delete.',
      'App Builder canvas: rubber-band drag to multi-select. Components drop at pointer position rather than top-left.',
    ]
  },
  {
    date: '2026-04-28',
    version: 'v0.2',
    changes: [
      'Application Settings: configure name, header, background colour, data connectivity, operation mode, key fields.',
      'Component Properties Panel: full configuration for all component types.',
      'Data Table: visible fields, filters, row buttons.',
      'Publish flow: generates shareable URL, saves component snapshot.',
      'Project Settings: manage members, roles, access control.',
    ]
  },
  {
    date: '2026-04-27',
    version: 'v0.1',
    changes: [
      'Initial release: App Builder with drag-and-drop canvas, palette of components, preview mode.',
      'Data Studio: create tables, define schemas, import CSV.',
      'Workflow Designer: visual node-based editor with ReactFlow.',
      'Multi-project support with workspace switching.',
    ]
  },
];

// ─── Documentation content ────────────────────────────────────────────────────
function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group/code my-2">
      <pre className="bg-neutral-900 text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">{children}</pre>
      <button onClick={() => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-1.5 right-1.5 p-1 bg-neutral-700 hover:bg-neutral-600 rounded opacity-0 group-hover/code:opacity-100 transition-all">
        {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-neutral-300" />}
      </button>
    </div>
  );
}
const Ic = ({ children }: any) => <code className="bg-neutral-100 text-primary-700 px-1 py-0.5 rounded text-[11px] font-mono">{children}</code>;
const Note = ({ children, color='blue' }: { children: React.ReactNode; color?: 'blue'|'amber'|'emerald'|'violet' }) => {
  const c = { blue:'bg-blue-50 border-blue-200 text-blue-800', amber:'bg-amber-50 border-amber-200 text-amber-800', emerald:'bg-emerald-50 border-emerald-200 text-emerald-800', violet:'bg-violet-50 border-violet-200 text-violet-800' }[color];
  return <div className={`flex gap-2 p-3 rounded-xl border my-3 text-xs leading-relaxed ${c}`}><Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5"/><span>{children}</span></div>;
};
const Li2 = ({ children }: any) => <li className="flex gap-1.5 text-xs text-neutral-600 leading-relaxed mb-1"><ChevronRight className="w-3 h-3 text-primary-500 shrink-0 mt-0.5"/><span>{children}</span></li>;
const H = ({ children }: any) => <h3 className="text-sm font-black text-neutral-800 mt-5 mb-2 uppercase tracking-tight">{children}</h3>;

const DOC_SECTIONS = [
  { id: 'overview',       label: 'Overview',                  icon: <BookOpen className="w-3 h-3"/> },
  { id: 'getting-started',label: 'Getting Started',           icon: <BookOpen className="w-3 h-3"/> },
  { id: 'data-tables-gs', label: 'Data Studio — Tables',      icon: <Database className="w-3 h-3"/> },
  { id: 'appbuilder-gs',  label: 'App Builder — Start',       icon: <Globe className="w-3 h-3"/> },
  { id: 'components-ref', label: 'Component Reference',       icon: <Table className="w-3 h-3"/> },
  { id: 'app-settings',   label: 'Application Settings',      icon: <MousePointerClick className="w-3 h-3"/> },
  { id: 'params',         label: 'Passing Parameters',        icon: <Link2 className="w-3 h-3"/> },
  { id: 'tokens',         label: 'Token Reference',           icon: <Code className="w-3 h-3"/> },
  { id: 'datatables',     label: 'Data Tables & Row Buttons', icon: <Table className="w-3 h-3"/> },
  { id: 'afteraction',    label: 'After Action',              icon: <MousePointerClick className="w-3 h-3"/> },
  { id: 'workflows',      label: 'Workflows',                 icon: <Zap className="w-3 h-3"/> },
  { id: 'publishing',     label: 'Publishing Apps',           icon: <Globe className="w-3 h-3"/> },
  { id: 'keyfields',      label: 'Key Fields',                icon: <Database className="w-3 h-3"/> },
  { id: 'ai-assist',      label: 'Nexus AI Assist',           icon: <Cpu className="w-3 h-3"/> },
];

function DocContent({ id }: { id: string }) {
  switch (id) {
    case 'overview': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Nexus — Platform Overview</h2>
        <p className="text-xs text-neutral-500 mb-4">Build, connect and publish applications without writing code.</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {DOC_SECTIONS.slice(1).map(s => (
            <div key={s.id} className="flex items-center gap-2 p-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600">
              <span className="text-primary-500">{s.icon}</span>{s.label}
            </div>
          ))}
        </div>
        <H>Core concepts</H>
        <ul><Li2><strong>Applications</strong> — drag-and-drop UI builder with live data binding.</Li2>
        <Li2><strong>Data Studio</strong> — create and manage database tables. Define schemas, import CSV.</Li2>
        <Li2><strong>Workflows</strong> — visual automation. Triggers fire actions when events occur.</Li2>
        <Li2><strong>Publishing</strong> — snapshot your app to a shareable URL. Public or sign-in protected.</Li2></ul>
      </div>
    );
    case 'params': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Passing Parameters Between Applications</h2>
        <p className="text-xs text-neutral-500 mb-3">Pass data from one application to another using URL parameters.</p>
        <Note>The most common pattern is <strong>list → detail</strong>: a Data Table shows records; a row button opens a second app pre-filled with that row's data.</Note>
        <H>Step 1 — Configure a Row Button or Button action</H>
        <p className="text-xs text-neutral-600 mb-2">Set the action to <strong>Go To Application</strong> and pick the target app. A <strong>Field Mapping</strong> table appears showing all fields on the target app.</p>
        <H>Step 2 — Map fields</H>
        <p className="text-xs text-neutral-600 mb-2">For each target field, either:</p>
        <ul><Li2>Choose a <strong>source field</strong> from the current app's form or data row (dropdown)</Li2>
        <Li2>Enter a <strong>static value</strong> (click the T icon to switch modes)</Li2>
        <Li2>Leave blank — the field will not be included in the URL parameters</Li2></ul>
        <H>Step 3 — The URL is built automatically</H>
        <CodeBlock>{"/my-workspace/edit-customer?name=Alice&email=alice@co.com&_rowId=abc123"}</CodeBlock>
        <p className="text-xs text-neutral-600 mb-2">Two special parameters are always available from row buttons:</p>
        <ul><Li2><Ic>_rowId</Ic> — Firestore document ID of the source row (use as Key Field for reliable matching)</Li2>
        <Li2><Ic>_sourceTable</Ic> — ID of the table the row came from</Li2></ul>
        <H>Step 4 — Target app auto-fills</H>
        <p className="text-xs text-neutral-600 mb-2">Any Input on the target app whose <strong>Field Mapping</strong> matches a URL parameter name is automatically pre-filled. Set <strong>Key Fields</strong> in Application Settings to enable update/delete matching.</p>
        <Note color="emerald">Published apps support parameters identically — parameters are visible in the browser URL bar.</Note>
      </div>
    );
    case 'tokens': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Token Reference</h2>
        <p className="text-xs text-neutral-500 mb-3">Tokens are replaced with real values at runtime using <Ic>{'{{scope.field}}'}</Ic> syntax.</p>
        <H>Row tokens — in "Go To URL" fields</H>
        <CodeBlock>{"https://crm.example.com/contact?id={{row.id}}&name={{row.name}}"}</CodeBlock>
        <H>Record tokens — in Workflow nodes</H>
        <CodeBlock>{"Hello {{record.name}},\nYour order {{record.orderId}} has been received."}</CodeBlock>
        <H>Email tokens — after Received Email trigger</H>
        <CodeBlock>{"From: {{email.from}}\nSubject: {{email.subject}}\n\n{{email.body}}"}</CodeBlock>
        <H>Full reference</H>
        <div className="rounded-xl border border-neutral-200 overflow-hidden text-[10px]">
          <table className="w-full"><thead><tr className="bg-neutral-50 border-b"><th className="px-3 py-1.5 text-left font-black text-neutral-400 uppercase tracking-wider">Token</th><th className="px-3 py-1.5 text-left font-black text-neutral-400 uppercase tracking-wider">Resolves to</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {[['{{row.fieldName}}','Column value in the clicked row (row button URL)'],['{{record.fieldName}}','Field from the triggering record or form submission (workflow nodes)'],['{{email.from}}','Sender address (Received Email trigger)'],['{{email.subject}}','Email subject'],['{{email.body}}','Email plain-text body'],['{{email.date}}','Date received'],['{{email.attachmentName}}','First attachment filename'],['{{email.attachmentData}}','Base64 attachment data (when Download Attachment is on)']].map(([t,d])=>(
              <tr key={t} className="hover:bg-neutral-50"><td className="px-3 py-1.5 font-mono text-primary-600 whitespace-nowrap">{t}</td><td className="px-3 py-1.5 text-neutral-500">{d}</td></tr>
            ))}
          </tbody></table>
        </div>
      </div>
    );
    case 'datatables': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Data Tables & Row Buttons</h2>
        <H>Connecting a data source</H>
        <p className="text-xs text-neutral-600 mb-2">Select the Data Table on the canvas → Properties Panel → pick a table under <strong>Data Source</strong>. Add more tables via <em>Application Settings → Data Connectivity</em>.</p>
        <H>Visible columns</H>
        <p className="text-xs text-neutral-600 mb-2">Tick fields under <strong>Visible Fields</strong> to control which columns are displayed. Unticking hides a column but does not delete data.</p>
        <H>Row Buttons</H>
        <p className="text-xs text-neutral-600 mb-2">Each button supports:</p>
        <ul><Li2><strong>Label, position (Start/End), colour</strong></Li2>
        <Li2><strong>Do Nothing</strong> — renders but takes no action</Li2>
        <Li2><strong>Go To Application</strong> — navigates with mapped field parameters</Li2>
        <Li2><strong>Go To URL</strong> — opens a URL with <Ic>{'{{row.field}}'}</Ic> tokens</Li2>
        <Li2><strong>Trigger Workflow</strong> — fires a workflow with the row's data as context</Li2></ul>
        <Note>When using Go To Application without explicit mappings, all row fields plus <Ic>_rowId</Ic> and <Ic>_sourceTable</Ic> are passed automatically.</Note>
      </div>
    );
    case 'afteraction': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">After Action</h2>
        <p className="text-xs text-neutral-500 mb-3">Configured in <em>Application Settings → After Action</em>. Controls what happens when Submit is clicked.</p>
        <ul><Li2><strong>Do Nothing</strong> — shows a success alert, stays on the same app</Li2>
        <Li2><strong>Go To Application</strong> — navigates to another app, passing form values as mapped parameters</Li2>
        <Li2><strong>Go To URL</strong> — opens a URL in a new tab</Li2>
        <Li2><strong>Trigger Workflow</strong> — fires the selected workflow with submitted record fields as <Ic>{'{{record.field}}'}</Ic> context</Li2></ul>
        <H>Combined with Key Fields</H>
        <p className="text-xs text-neutral-600">Use After Action "Go To Application" together with Key Fields on the target app to create a seamless Add → Edit flow: the Add app submits a record, then navigates to the Edit app pre-filled with the new record's data.</p>
      </div>
    );
    case 'workflows': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Workflows</h2>
        <Note color="amber">A workflow must be <strong>Active</strong> to fire. Toggle Draft/Active from the card list or designer header.</Note>
        <Note>Only nodes connected to the trigger by edges will execute. Disconnected nodes are silently skipped.</Note>
        <H>Triggers</H>
        <ul><Li2><strong>Record Created / Updated</strong> — fires when rows change in a chosen table</Li2>
        <Li2><strong>Scheduled</strong> — fires on a cron schedule (24/7 requires backend worker)</Li2>
        <Li2><strong>Webhook Received</strong> — fires on an incoming HTTP POST</Li2>
        <Li2><strong>Received Email</strong> — polls Gmail for new matching emails on a configurable interval</Li2></ul>
        <H>Received Email fields</H>
        <CodeBlock>{"{{email.from}}  {{email.to}}  {{email.cc}}\n{{email.subject}}  {{email.body}}  {{email.snippet}}\n{{email.date}}  {{email.attachmentName}}  {{email.attachmentData}}"}</CodeBlock>
        <H>Logs</H>
        <p className="text-xs text-neutral-600">Click <strong>Logs</strong> in the designer to open the real-time log panel. Each execution shows per-step status and messages.</p>
      </div>
    );
    case 'publishing': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Publishing Applications</h2>
        <p className="text-xs text-neutral-500 mb-3">Publishing creates a frozen snapshot of your app at a shareable URL — completely outside the Nexus builder.</p>
        <H>Published URL format</H>
        <CodeBlock>{"https://your-domain.run.app/workspace-name/app-slug"}</CodeBlock>
        <Note color="amber">Editing an app in the builder does <strong>not</strong> update the published version. Click <strong>Publish</strong> again to push changes live.</Note>
        <H>Access control</H>
        <p className="text-xs text-neutral-600 mb-2">Published apps are public by default. Go to <em>Project Settings → Published App Access → Require Sign-In</em> to restrict to project members only.</p>
        <H>Linking published apps</H>
        <p className="text-xs text-neutral-600">Row buttons and After Actions work identically in published mode. All apps in a navigation chain must be published — linking to an unpublished app shows an error.</p>
      </div>
    );
    case 'keyfields': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Key Fields</h2>
        <p className="text-xs text-neutral-500 mb-3">Key Fields tell Nexus which columns uniquely identify a record. Used for <em>Update Records</em> and <em>Delete Records</em> operation modes.</p>
        <H>Using _rowId (recommended)</H>
        <ul><Li2>Source app row button → "Go To Application" → map <Ic>_rowId</Ic> to the target field <Ic>_rowId</Ic></Li2>
        <Li2>Target app: add an Input with Field Mapping = <Ic>_rowId</Ic> (pre-filled from URL automatically)</Li2>
        <Li2>In Application Settings → Key Fields, tick <Ic>_rowId</Ic></Li2>
        <Li2>Set Operation Mode to Update Records or Delete Records</Li2></ul>
        <H>Using a business key</H>
        <p className="text-xs text-neutral-600 mb-2">Use any unique column (e.g. <Ic>email</Ic> or <Ic>orderId</Ic>) as a key. Ensure the corresponding input is on the form and the value is passed via URL params.</p>
        <Note color="violet">Multiple Key Fields are combined with AND logic — all must match for a record to be affected.</Note>
      </div>
    );
    case 'getting-started': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Getting Started with Nexus</h2>
        <p className="text-xs text-neutral-500 mb-4">What is Nexus? A no-code platform for building data-driven applications, automations, and dashboards.</p>
        <H>1. Create a Project</H>
        <p className="text-xs text-neutral-600 mb-2">When you first sign in, you'll be taken to the Project Picker. Click <strong>+ New Project</strong>, enter a name, and click Create. A project is your workspace — it contains all your apps, tables, and workflows.</p>
        <H>2. Understand the Sidebar</H>
        <ul><Li2><strong>Applications</strong> — Build and manage user-facing apps</Li2>
        <Li2><strong>Workflows</strong> — Automate actions when events occur</Li2>
        <Li2><strong>Project Setup → Data Studio</strong> — Create and manage data tables</Li2>
        <Li2><strong>Insight → Dashboards / Reports</strong> — Visualise your data</Li2>
        <Li2><strong>Project Setup → Project Settings</strong> — Manage members and access</Li2></ul>
        <H>3. Recommended first steps</H>
        <ul><Li2>Go to <strong>Data Studio</strong> and create your first table (e.g., "Customers")</Li2>
        <Li2>Add a few fields (Name, Email, Status)</Li2>
        <Li2>Go to <strong>Applications</strong>, create a new app, and connect it to that table</Li2>
        <Li2>Drag a <strong>Data Table</strong> component onto the canvas</Li2>
        <Li2>Click <strong>Publish</strong> to share the app at a public URL</Li2></ul>
        <Note color="blue">The fastest path to value: Data Studio → create table → Applications → create app → connect table → publish.</Note>
      </div>
    );
    case 'data-tables-gs': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Data Studio — Tables &amp; Fields</h2>
        <H>Creating a table</H>
        <ul><Li2>Navigate to <strong>Data Studio</strong> in the sidebar</Li2>
        <Li2>Click <strong>+ New Table</strong></Li2>
        <Li2>Choose <strong>Internal Table</strong> (blank) or <strong>Import CSV/Excel</strong></Li2>
        <Li2>Enter a name and click Create</Li2></ul>
        <H>Field types</H>
        <div className="rounded-xl border border-neutral-200 overflow-hidden text-[11px] mt-2 mb-3">
          <table className="w-full">
            <thead><tr className="bg-neutral-50 border-b"><th className="px-3 py-1.5 text-left font-black text-neutral-400 uppercase tracking-wider">Type</th><th className="px-3 py-1.5 text-left font-black text-neutral-400 uppercase tracking-wider">Use for</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {[['Text','Names, descriptions, emails, free text'],['Number','Prices, quantities, scores'],['Boolean','Yes/No, active/inactive flags'],['Date','Timestamps, due dates, birthdays'],['Relationship','Link rows to another table (foreign key)'],['Calculated','Formulas derived from other fields']].map(([t,d])=>(<tr key={t}><td className="px-3 py-1.5 font-mono text-primary-600 font-bold">{t}</td><td className="px-3 py-1.5 text-neutral-500">{d}</td></tr>))}
            </tbody>
          </table>
        </div>
        <H>Importing CSV</H>
        <ul><Li2>Click <strong>+ New Table → Import CSV/Excel</strong></Li2>
        <Li2>Drop your file — Nexus auto-detects column names and types</Li2>
        <Li2>Review the schema and click Import</Li2></ul>
        <Note color="amber">Table IDs are internal references (e.g. <Ic>table_177...</Ic>). The human-readable name is what you entered on creation. Always use table names in the UI — IDs are for internal use only.</Note>
      </div>
    );
    case 'appbuilder-gs': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">App Builder — Getting Started</h2>
        <H>Opening the builder</H>
        <ul><Li2>Go to <strong>Applications</strong> and click <strong>+ New Application</strong></Li2>
        <Li2>Enter a name, choose an operation mode, and select a primary data source</Li2>
        <Li2>Click the application card to open the canvas builder</Li2></ul>
        <H>The canvas</H>
        <ul><Li2>The white area is the <strong>canvas</strong> — this is what your end users will see</Li2>
        <Li2>The left panel is the <strong>Component Palette</strong> — drag items onto the canvas</Li2>
        <Li2>The right panel is the <strong>Properties Panel</strong> — configure the selected component</Li2></ul>
        <H>Placing components</H>
        <ul><Li2>Drag any component from the left palette onto the canvas — it drops where you release</Li2>
        <Li2>Click to select, then drag the <strong>grip handle</strong> (appears above on hover) to reposition</Li2>
        <Li2>Drag the <strong>resize handle</strong> (bottom-right corner) to resize</Li2></ul>
        <H>Keyboard shortcuts</H>
        <CodeBlock>{"Ctrl + Z           Undo\nCtrl + Shift + Z   Redo\nCtrl + S           Save to cloud\nDelete / Backspace Delete selected\nEscape             Clear selection\n?                  Toggle shortcut guide"}</CodeBlock>
        <H>Saving vs Publishing</H>
        <ul><Li2><strong>Save</strong> — persists your work to the cloud. Changes are only visible in the builder.</Li2>
        <Li2><strong>Publish</strong> — creates a frozen snapshot available at a public URL. Re-publish to push updates live.</Li2></ul>
      </div>
    );
    case 'components-ref': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Component Reference</h2>
        <p className="text-xs text-neutral-500 mb-3">Every component available in the App Builder palette.</p>
        {[
          { name: 'Text Input', cat: 'Inputs', desc: 'Single-line text field. Set Field Mapping to bind to a table column. Use as a form field for Add/Update operations.' },
          { name: 'Select / Dropdown', cat: 'Inputs', desc: 'Pick from a fixed list of options. Configure options in Properties → Options. Field Mapping binds the selected value to a column.' },
          { name: 'Toggle', cat: 'Inputs', desc: 'On/Off or custom two-state switch. Configure option labels and bind to a Boolean field.' },
          { name: 'Date Picker', cat: 'Inputs', desc: 'Date/time input. Binds to a Date field via Field Mapping.' },
          { name: 'Button', cat: 'Inputs', desc: 'Triggers an action: Submit Form, Navigate to App, Open URL, or Cancel. Configure action type in Properties → Action tab.' },
          { name: 'Data Table', cat: 'Display', desc: 'Displays live rows from a data source. Configure visible columns, filters, and row buttons. Supports real-time updates.' },
          { name: 'Heading', cat: 'Display', desc: 'Static text label in H1/H2/H3 size. No data binding.' },
          { name: 'Paragraph', cat: 'Display', desc: 'Static multi-line text block. No data binding.' },
          { name: 'Image', cat: 'Display', desc: 'Display an image via URL or file upload. Set object-fit for cover/contain/fill.' },
          { name: 'Badge/Tag', cat: 'Display', desc: 'Pill-shaped labels. Configure tags, colours, size, and variant (solid/soft/outline) in Properties.' },
          { name: 'Bar/Line/Pie Chart', cat: 'Display', desc: 'Connect to a data source and map X and Y axes. Charts update in real-time as data changes.' },
        ].map(c => (
          <div key={c.name} className="py-2.5 border-b border-neutral-100 last:border-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-neutral-800">{c.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-neutral-100 text-neutral-400 rounded font-bold uppercase">{c.cat}</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    );
    case 'app-settings': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Application Settings</h2>
        <p className="text-xs text-neutral-500 mb-3">Click <strong>Settings</strong> in the builder toolbar to open Application Settings.</p>
        <H>Data Connectivity</H>
        <ul><Li2><strong>Primary Data Source</strong> — the default table components bind to. This is what buttons submit to and tables display from.</Li2>
        <Li2>Add additional sources for components that need data from other tables</Li2></ul>
        <H>Operation Mode</H>
        <ul><Li2><strong>View Only</strong> — read-only, no form submission</Li2>
        <Li2><strong>Add Records</strong> — form submits create new rows in the primary source</Li2>
        <Li2><strong>Update Records</strong> — submitting updates matching rows (uses Key Fields)</Li2>
        <Li2><strong>Delete Records</strong> — submitting deletes matching rows (uses Key Fields)</Li2></ul>
        <H>Key Fields</H>
        <p className="text-[11px] text-neutral-600 mb-2">Used in Update and Delete modes. Nexus queries for rows where all Key Field values match the form input values. See <strong>Key Fields</strong> documentation for full detail.</p>
        <H>After Action</H>
        <p className="text-[11px] text-neutral-600 mb-2">What happens after the user clicks Submit. Options: Do Nothing, Go To Application, Go To URL, Trigger Workflow.</p>
        <H>Header &amp; Appearance</H>
        <ul><Li2>Set a header text and colour for your published app</Li2>
        <Li2>Set a background colour for the canvas area</Li2></ul>
      </div>
    );
    case 'ai-assist': return (
      <div>
        <h2 className="text-lg font-black text-neutral-900 mb-1">Nexus AI Assist</h2>
        <p className="text-xs text-neutral-500 mb-4">An intelligent assistant that can query your project, answer questions about your data and configuration, and build entire project structures from a description.</p>

        <Note color="blue">Nexus AI Assist is available from the <strong>AI</strong> button in the top navigation bar. It opens as a side panel and maintains context throughout your session.</Note>

        <H>Querying Data</H>
        <p className="text-xs text-neutral-600 mb-2">Ask the assistant questions about the data held within your project's datasources in plain English. It understands your table structure and field names.</p>
        <ul>
          <Li2>Ask how many records meet a specific criteria — <em>"How many open support tickets were created this month?"</em></Li2>
          <Li2>Find the most recent event across a table — <em>"When was the last time a Google Chat notification was sent?"</em></Li2>
          <Li2>Request aggregated summaries — <em>"What is the total order value for customer Acme Corp?"</em></Li2>
          <Li2>Filter and search records — <em>"Show me all contacts in the London region with a status of Active"</em></Li2>
        </ul>

        <H>Querying Application Configuration</H>
        <p className="text-xs text-neutral-600 mb-2">The assistant has full visibility of the applications in your project and how they are configured.</p>
        <ul>
          <Li2>Find which applications reference a specific table or field — <em>"Which apps use the Invoices table?"</em></Li2>
          <Li2>Understand the navigation structure — <em>"Which apps link to the Customer Detail app?"</em></Li2>
          <Li2>Review component setup — <em>"What fields are visible in the Orders data table on the Dashboard app?"</em></Li2>
        </ul>

        <H>Querying Workflows & Logs</H>
        <p className="text-xs text-neutral-600 mb-2">Ask the assistant to check the health and history of your automation workflows.</p>
        <ul>
          <Li2><em>"Are all my workflows running correctly?"</em> — returns a status summary across all active workflows</Li2>
          <Li2><em>"When did the Invoice Reminder workflow last run?"</em></Li2>
          <Li2><em>"Show me any failed workflow executions in the last 7 days"</em></Li2>
          <Li2><em>"Why did the New Order workflow fail on 2 May?"</em> — the assistant will read the execution log for that run</Li2>
        </ul>

        <H>Setting Up Database Tables & Fields</H>
        <p className="text-xs text-neutral-600 mb-2">Ask the assistant to create or modify your data structure. It can generate tables with appropriate fields based on a description of your needs.</p>
        <ul>
          <Li2><em>"Add a table called Suppliers with fields for name, contact email, phone, and country"</em></Li2>
          <Li2><em>"Add a Status field to the Projects table with options: Active, On Hold, Completed"</em></Li2>
          <Li2><em>"Create a junction table to link Employees and Projects"</em></Li2>
        </ul>
        <Note color="amber">Table and field creation requires you to confirm the proposed structure before changes are applied. The assistant will show you what it plans to create and ask for your approval.</Note>

        <H>Setting Up Applications</H>
        <p className="text-xs text-neutral-600 mb-2">Ask the assistant to scaffold new applications. Describe what the application should do and it will create a draft with appropriate components.</p>
        <ul>
          <Li2><em>"Create a form to add new Customer records"</em></Li2>
          <Li2><em>"Build an app that lists all Projects and lets users click through to see the details"</em></Li2>
          <Li2><em>"Set up a read-only dashboard showing a table of this month's invoices"</em></Li2>
        </ul>

        <H>Setting Up Workflows</H>
        <p className="text-xs text-neutral-600 mb-2">Describe the automation you need and the assistant will create a workflow with appropriate trigger and action nodes.</p>
        <ul>
          <Li2><em>"Create a workflow that sends a confirmation email when a new Order is created"</em></Li2>
          <Li2><em>"Set up a daily scheduled workflow that checks for overdue tasks"</em></Li2>
          <Li2><em>"Build a workflow that fires a Google Chat notification when a Project status changes to Completed"</em></Li2>
        </ul>

        <H>AI Project Generation</H>
        <p className="text-xs text-neutral-600 mb-2">When creating a <strong>new project</strong>, you can opt for AI to build the entire project for you from a high-level description. To start:</p>
        <ul>
          <Li2>Click <strong>+ New Project</strong> and choose <strong>Generate with AI</strong></Li2>
          <Li2>Tell the assistant what type of project you need — e.g. <em>"A CRM for managing customer relationships and sales pipeline"</em> or <em>"A website CMS with pages, posts, and media"</em></Li2>
          <Li2>The assistant will ask clarifying questions to ensure it understands your requirements before building</Li2>
          <Li2>Once confirmed, it will automatically create: the full database schema (tables and fields), all core applications with data bindings, navigation links and buttons between applications, and recommended workflows for common automations</Li2>
        </ul>
        <Note color="emerald">The generated project is a starting point — you can freely modify any tables, apps, or workflows after generation. Nothing is locked.</Note>

        <H>Limitations</H>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mt-2 mb-4">
          <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-3 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5"/>Current Limitations</p>
          <ul className="space-y-2">
            <Li2><strong>No real-time data execution:</strong> The assistant reasons about your data structure and configuration but does not execute live queries against your Firestore database directly. Data query answers are derived from the schema context provided to it, not from reading live record values.</Li2>
            <Li2><strong>Schema context window:</strong> In very large projects with many tables and fields, the full schema may exceed what the AI can hold in context simultaneously. For very large schemas, focus your questions on specific tables for the most accurate responses.</Li2>
            <Li2><strong>Workflow log reading:</strong> The assistant can access workflow execution metadata but may not be able to read the detailed content of individual log payloads for very large or high-volume logs.</Li2>
            <Li2><strong>Confirmation required for writes:</strong> The assistant will always present a summary of any changes to your project (tables, apps, workflows) and require your explicit confirmation before applying them. It cannot apply changes silently.</Li2>
            <Li2><strong>No cross-project access:</strong> AI Assist operates within the currently selected project only. It cannot query or modify other projects in your workspace.</Li2>
            <Li2><strong>AI generation quality depends on description clarity:</strong> The more specific and detailed your project description, the better the generated structure. Generic descriptions (e.g. "build me a CRM") will produce a basic scaffold. Providing business context (team size, key processes, terminology) improves output significantly.</Li2>
            <Li2><strong>Generated projects require review:</strong> AI-generated applications and workflows should always be reviewed before publishing. Field types, validation rules, and workflow logic should be verified against your actual business requirements.</Li2>
            <Li2><strong>Rate limits:</strong> The assistant is subject to API rate limits. If you receive a rate limit message, wait 60 seconds before continuing. Complex project generation requests consume more capacity than simple queries.</Li2>
          </ul>
        </div>
      </div>
    );
    default: return null;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const HelpResources = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'release' | 'shortcuts'>('docs');
  const [docSection, setDocSection] = useState('overview');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredSections = DOC_SECTIONS.filter(s =>
    !search || s.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[640px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg text-white"><HelpCircle className="w-5 h-5" /></div>
            <div>
              <h2 className="font-bold text-neutral-900 uppercase tracking-tight">Support Center</h2>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-0.5">Docs & Updates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 bg-white shrink-0">
          {[{id:'docs',label:'User Documentation'},{id:'shortcuts',label:'Keyboard Shortcuts'},{id:'release',label:'Release Notes'}].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={cn('flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2',
                activeTab === t.id ? 'text-primary-600 border-primary-600 bg-primary-50/20' : 'text-neutral-500 border-transparent hover:text-neutral-900')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex bg-white">
          {activeTab === 'docs' && (
            <>
              {/* Sidebar */}
              <aside className="w-52 border-r border-neutral-200 flex flex-col shrink-0 bg-neutral-50">
                <div className="p-3 border-b border-neutral-200">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input type="text" placeholder="Search docs…" value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg outline-none" />
                  </div>
                </div>
                <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {filteredSections.map(s => (
                    <button key={s.id} onClick={() => setDocSection(s.id)}
                      className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all text-left',
                        docSection === s.id ? 'bg-primary-600 text-white' : 'text-neutral-500 hover:bg-white hover:text-neutral-900')}>
                      {s.icon}{s.label}
                    </button>
                  ))}
                </nav>
              </aside>
              {/* Doc content */}
              <main className="flex-1 overflow-y-auto p-7">
                <DocContent id={docSection} />
              </main>
            </>
          )}

          {activeTab === 'shortcuts' && (
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="max-w-lg mx-auto space-y-8">
                <div>
                  <h2 className="text-lg font-black text-neutral-900 mb-1">Keyboard Shortcuts</h2>
                  <p className="text-xs text-neutral-500">Speed up your workflow in the Application Builder with these shortcuts.</p>
                </div>
                {[
                  { group: 'Editing', shortcuts: [
                    ['Ctrl + Z', 'Undo'],
                    ['Ctrl + Shift + Z', 'Redo'],
                    ['Ctrl + S', 'Save to cloud'],
                    ['Delete / Backspace', 'Delete selected component'],
                    ['Escape', 'Clear selection'],
                  ]},
                  { group: 'Selection', shortcuts: [
                    ['Click', 'Select component'],
                    ['Ctrl + Click', 'Add to multi-select'],
                    ['Drag on empty canvas', 'Rubber-band multi-select'],
                  ]},
                  { group: 'Canvas', shortcuts: [
                    ['Right-click selection', 'Align / Front / Back / Delete menu'],
                  ]},
                ].map(section => (
                  <div key={section.group}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">{section.group}</p>
                    <div className="rounded-xl border border-neutral-200 overflow-hidden">
                      {section.shortcuts.map(([key, action], i) => (
                        <div key={key} className={cn('flex items-center justify-between gap-4 px-4 py-3', i < section.shortcuts.length - 1 && 'border-b border-neutral-100')}>
                          <span className="text-xs text-neutral-600 font-medium">{action}</span>
                          <kbd className="px-2.5 py-1 bg-neutral-100 text-neutral-700 text-[10px] font-mono font-bold rounded-lg border border-neutral-200 whitespace-nowrap">{key}</kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'release' && (
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="max-w-2xl mx-auto space-y-10">
                {RELEASE_NOTES.map((note, idx) => (
                  <section key={note.date} className="relative pl-8">
                    {idx !== RELEASE_NOTES.length - 1 && (
                      <div className="absolute left-3 top-3 bottom-[-40px] w-[1px] bg-neutral-200" />
                    )}
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary-50 border-2 border-primary-600 flex items-center justify-center">
                      <History className="w-3 h-3 text-primary-600" />
                    </div>
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-base font-bold text-neutral-900 uppercase tracking-tight">{note.date}</h3>
                      <span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded text-[10px] font-black uppercase">{note.version}</span>
                    </div>
                    <ul className="space-y-2">
                      {note.changes.map((c, i) => (
                        <li key={i} className="text-xs text-neutral-600 leading-relaxed flex gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-1.5 shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
