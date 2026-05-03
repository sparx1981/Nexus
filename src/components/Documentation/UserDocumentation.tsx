import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import {
  BookOpen, ChevronRight, Link2, Database, ArrowRight,
  Code, Lightbulb, Table, MousePointerClick, Zap, Globe, Copy, Check, Cpu, AlertTriangle
} from 'lucide-react';

function CodeSnippet({ children, block = false }: { children: string; block?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  if (!block) return <code className="bg-neutral-100 dark:bg-slate-800 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded text-[12px] font-mono">{children}</code>;
  return (
    <div className="relative group/code mt-2 mb-3">
      <pre className="bg-neutral-900 dark:bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">{children}</pre>
      <button onClick={copy} className="absolute top-2 right-2 p-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg opacity-0 group-hover/code:opacity-100 transition-all">
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-300" />}
      </button>
    </div>
  );
}

function Note({ icon, title, children, color = 'blue' }: { icon: React.ReactNode; title: string; children: React.ReactNode; color?: 'blue' | 'amber' | 'emerald' | 'violet' }) {
  const colors = { blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300', amber: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300', emerald: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300', violet: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/40 text-violet-800 dark:text-violet-300' };
  return (<div className={`flex gap-3 p-4 rounded-xl border my-4 ${colors[color]}`}><div className="shrink-0 mt-0.5">{icon}</div><div><p className="font-bold text-sm mb-1">{title}</p><div className="text-sm leading-relaxed opacity-90">{children}</div></div></div>);
}
const H2 = ({ children }: any) => <h2 className="text-xl font-black text-neutral-900 dark:text-white mt-10 mb-4 pb-2 border-b border-neutral-200 dark:border-slate-800 flex items-center gap-2">{children}</h2>;
const H3 = ({ children }: any) => <h3 className="text-base font-bold text-neutral-800 dark:text-slate-200 mt-6 mb-2">{children}</h3>;
const P  = ({ children }: any) => <p className="text-sm text-neutral-600 dark:text-slate-400 leading-relaxed mb-3">{children}</p>;
const Li = ({ children }: any) => <li className="text-sm text-neutral-600 dark:text-slate-400 leading-relaxed mb-1.5 flex gap-2"><ChevronRight className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" /><span>{children}</span></li>;

const SECTIONS = [
  { id: 'overview',    label: 'Overview',                  icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'params',      label: 'Passing Parameters',        icon: <Link2 className="w-3.5 h-3.5" /> },
  { id: 'tokens',      label: 'Token Reference',           icon: <Code className="w-3.5 h-3.5" /> },
  { id: 'datatables',  label: 'Data Tables & Row Buttons', icon: <Table className="w-3.5 h-3.5" /> },
  { id: 'afteraction', label: 'After Action',              icon: <MousePointerClick className="w-3.5 h-3.5" /> },
  { id: 'workflows',   label: 'Workflows',                 icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'publishing',  label: 'Publishing Apps',           icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'keyfields',   label: 'Key Fields',                icon: <Database className="w-3.5 h-3.5" /> },
  { id: 'ai-assist',   label: 'Nexus AI Assist',           icon: <Cpu className="w-3.5 h-3.5" /> },
];

export function UserDocumentation() {
  const [active, setActive] = useState('overview');
  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <nav className="w-56 shrink-0 border-r overflow-y-auto py-6 px-3 space-y-0.5" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 px-3 mb-3">Documentation</p>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)} className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left', active === s.id ? 'bg-primary-600 text-white' : 'text-neutral-500 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800')}>{s.icon}{s.label}</button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-10 max-w-3xl">

        {active === 'overview' && <><h1 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">Nexus Documentation</h1><p className="text-neutral-500 dark:text-slate-400 text-sm mb-8">Build, connect and publish applications without code.</p><div className="grid grid-cols-2 gap-4">{SECTIONS.slice(1).map(s => (<button key={s.id} onClick={() => setActive(s.id)} className="flex items-center gap-3 p-4 border border-neutral-200 dark:border-slate-700 rounded-xl hover:border-primary-500 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all text-left group"><div className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-lg group-hover:scale-110 transition-transform">{s.icon}</div><p className="font-bold text-sm text-neutral-800 dark:text-slate-200 flex-1">{s.label}</p><ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-primary-500 transition-colors" /></button>))}</div></>}

        {active === 'params' && <>
          <H2><Link2 className="w-5 h-5 text-primary-600" />Passing Parameters Between Applications</H2>
          <P>Parameters let one application pass data to another. The most common pattern is <strong>list → detail</strong>: a Data Table shows records; clicking a row button opens a second app pre-filled with that row's data so the user can view, edit, or delete it.</P>
          <Note icon={<Lightbulb className="w-4 h-4"/>} title="How it works" color="blue">When a row button (or After Action) navigates to another app, every field from the current row or form is automatically appended to the destination URL as query parameters. The target application reads those parameters on load and pre-fills matching input fields.</Note>
          <H3>Step 1 — Add a Row Button to your Data Table</H3>
          <P>Select a Data Table on the canvas. In the Properties Panel under <strong>Row Buttons</strong>, click <strong>+ Add Button</strong>. Set the action to <strong>Go To Application</strong> and choose the target app.</P>
          <H3>Step 2 — Nexus builds the parameter URL automatically</H3>
          <P>When the user clicks the row button, Nexus constructs a URL like:</P>
          <CodeSnippet block>{"/my-workspace/edit-customer?name=Alice&email=alice@co.com&_rowId=abc123&_sourceTable=customers"}</CodeSnippet>
          <P>Every column value from that row is included. Two special parameters are always added:</P>
          <ul className="mb-4 space-y-1"><Li><CodeSnippet>_rowId</CodeSnippet> — the Firestore document ID of the source record. Use this as a Key Field for reliable update/delete matching.</Li><Li><CodeSnippet>_sourceTable</CodeSnippet> — the table ID the row came from.</Li></ul>
          <H3>Step 3 — Target app receives the parameters</H3>
          <P>In the target application, add Input components. Set each input's <strong>Field Mapping</strong> to the same column name as the parameter you want to pre-fill. Nexus automatically populates any input whose Field Mapping matches a URL parameter name.</P>
          <H3>Step 4 — Perform update or delete on the source record</H3>
          <P>Set the target app's <strong>Operation Mode</strong> to <em>Update Records</em> or <em>Delete Records</em>. In <em>Application Settings → Key Fields</em>, tick the field(s) that uniquely identify the record — typically <CodeSnippet>_rowId</CodeSnippet>. When Submit is clicked, Nexus finds matching records and applies the operation.</P>
          <Note icon={<Zap className="w-4 h-4"/>} title="Published apps also support parameters" color="emerald">The parameter system works identically on published URLs. Parameters are passed as visible query strings in the browser address bar.</Note>
        </>}

        {active === 'tokens' && <>
          <H2><Code className="w-5 h-5 text-primary-600"/>Token Reference</H2>
          <P>Tokens are placeholder expressions replaced with real values at runtime. They always use double curly-brace syntax: <CodeSnippet>{'{{scope.fieldName}}'}</CodeSnippet>.</P>
          <H3>Row tokens — inside row button "Go To URL" fields</H3>
          <CodeSnippet block>{"https://crm.example.com/contact?id={{row.id}}&name={{row.name}}&email={{row.email}}"}</CodeSnippet>
          <P>Every column of the clicked row is available as <CodeSnippet>{'{{row.columnName}}'}</CodeSnippet>.</P>
          <H3>Record tokens — inside Workflow action nodes</H3>
          <CodeSnippet block>{"Hello {{record.name}},\nYour order {{record.orderId}} has been received on {{record.date}}."}</CodeSnippet>
          <P>When a workflow is triggered by a record event or After Action submit, every field of the submitted/created record is available as <CodeSnippet>{'{{record.fieldName}}'}</CodeSnippet>.</P>
          <H3>Email tokens — after a Received Email trigger</H3>
          <CodeSnippet block>{"New email from {{email.from}}\nSubject: {{email.subject}}\n\n{{email.body}}"}</CodeSnippet>
          <H3>Full token reference</H3>
          <div className="rounded-xl border border-neutral-200 dark:border-slate-700 overflow-hidden mt-3">
            <table className="w-full text-xs">
              <thead><tr className="bg-neutral-50 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700"><th className="px-4 py-2 text-left font-black uppercase tracking-wider text-neutral-400">Token</th><th className="px-4 py-2 text-left font-black uppercase tracking-wider text-neutral-400">Where</th><th className="px-4 py-2 text-left font-black uppercase tracking-wider text-neutral-400">Resolves to</th></tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                {[['{{row.fieldName}}','Row button "Go To URL"','Column value in the clicked row'],['{{record.fieldName}}','Workflow email/chat body','Field from the triggering record or form submission'],['{{email.from}}','After Received Email trigger','Sender email address'],['{{email.subject}}','After Received Email trigger','Email subject line'],['{{email.body}}','After Received Email trigger','Plain-text email body'],['{{email.snippet}}','After Received Email trigger','Short preview snippet'],['{{email.date}}','After Received Email trigger','Date the email was received'],['{{email.attachmentName}}','After Received Email trigger','Filename of the first attachment'],['{{email.attachmentData}}','When Download Attachment is on','Base64-encoded file data']].map(([t,w,r])=>(<tr key={t} className="hover:bg-neutral-50 dark:hover:bg-slate-800/50"><td className="px-4 py-2 font-mono text-primary-600 dark:text-primary-400 whitespace-nowrap">{t}</td><td className="px-4 py-2 text-neutral-500 dark:text-slate-400">{w}</td><td className="px-4 py-2 text-neutral-600 dark:text-slate-300">{r}</td></tr>))}
              </tbody>
            </table>
          </div>
        </>}

        {active === 'datatables' && <>
          <H2><Table className="w-5 h-5 text-primary-600"/>Data Tables &amp; Row Buttons</H2>
          <P>A <strong>Data Table</strong> component displays live rows from a connected data source and supports per-row actions.</P>
          <H3>Connecting a data source</H3>
          <P>Select the Data Table, then in the Properties Panel pick the table under <em>Data Source</em>. Only tables already connected to the application appear — add more via <em>Application Settings → Data Connectivity</em>.</P>
          <H3>Visible columns</H3>
          <P>Tick the columns you want to display under <em>Visible Fields</em>. Unticking hides a column from users but does not delete data.</P>
          <H3>Row Buttons — configuration</H3>
          <P>Click <strong>+ Add Button</strong> to attach a button to every row. Configure each button with:</P>
          <ul className="mb-4 space-y-1">
            <Li><strong>Label</strong> — the button text shown to users</Li>
            <Li><strong>Position</strong> — <em>Start</em> (first column) or <em>End</em> (last column)</Li>
            <Li><strong>Colour</strong> — background colour of the button</Li>
            <Li><strong>Action</strong> — what happens when clicked (see below)</Li>
          </ul>
          <H3>Button actions</H3>
          <ul className="mb-4 space-y-1">
            <Li><strong>Do Nothing</strong> — button renders but performs no action</Li>
            <Li><strong>Go To Application</strong> — navigates to another app in this project, passing all row fields as URL params so the target app can be pre-filled or perform update/delete</Li>
            <Li><strong>Go To URL</strong> — opens an external URL with <CodeSnippet>{'{{row.field}}'}</CodeSnippet> token support to embed row values</Li>
            <Li><strong>Trigger Workflow</strong> — fires a selected workflow with the row's full data as context</Li>
          </ul>
          <Note icon={<Lightbulb className="w-4 h-4"/>} title="Row data passed automatically" color="blue">When using Go To Application, every column in the clicked row (including <CodeSnippet>_rowId</CodeSnippet>) is appended to the destination URL automatically. You do not need to configure this manually.</Note>
        </>}

        {active === 'afteraction' && <>
          <H2><MousePointerClick className="w-5 h-5 text-primary-600"/>After Action</H2>
          <P>After Action controls what happens when a user clicks the Submit button on an application. Configure it in <em>Application Settings → After Action</em>.</P>
          <H3>Do Nothing (default)</H3>
          <P>Submit completes and a success alert is shown. The user stays on the current application.</P>
          <H3>Go To Application</H3>
          <P>After a successful submit, the user is taken to another app. The current form values are passed as URL parameters, enabling the target app to pre-fill inputs or use Key Fields for matching.</P>
          <CodeSnippet block>{"User fills in Add Customer form → clicks Submit → record saved\n→ navigated to /workspace/customer-detail?name=Alice&email=alice@co.com"}</CodeSnippet>
          <H3>Go To URL</H3>
          <P>Opens an external URL in a new tab after a successful submit. Useful for confirmation pages or external systems.</P>
          <H3>Trigger Workflow</H3>
          <P>Fires the selected workflow after a successful submit. The submitted record fields are available in workflow nodes as <CodeSnippet>{'{{record.fieldName}}'}</CodeSnippet> tokens. This is the recommended way to send confirmation emails.</P>
        </>}

        {active === 'workflows' && <>
          <H2><Zap className="w-5 h-5 text-primary-600"/>Workflows</H2>
          <P>Workflows automate actions when events occur. Build them visually by dragging trigger and action nodes onto the canvas and connecting them with edges.</P>
          <Note icon={<Lightbulb className="w-4 h-4"/>} title="Workflows must be Active to fire" color="amber">A workflow in Draft status will never execute regardless of events. Click the Draft/Active toggle in the workflow list or designer header to activate it.</Note>
          <H3>Only connected nodes execute</H3>
          <P>Nodes that are not connected to the trigger by an edge will <strong>never</strong> execute, even if they are on the canvas. Always draw edges from your trigger to each action node.</P>
          <H3>Triggers</H3>
          <ul className="mb-4 space-y-1"><Li><strong>Record Created</strong> — fires when a new row is added to the chosen table</Li><Li><strong>Record Updated</strong> — fires when a row in the chosen table changes</Li><Li><strong>Scheduled</strong> — fires on a schedule (requires backend for 24/7)</Li><Li><strong>Webhook Received</strong> — fires on an incoming HTTP POST</Li><Li><strong>Received Email</strong> — polls a connected Gmail account on a configurable interval</Li></ul>
          <H3>Received Email trigger fields</H3>
          <CodeSnippet block>{"{{email.from}}   {{email.to}}   {{email.cc}}\n{{email.subject}}   {{email.body}}   {{email.snippet}}\n{{email.date}}   {{email.attachmentName}}   {{email.attachmentData}}"}</CodeSnippet>
          <H3>Workflow Logs</H3>
          <P>Click <strong>Logs</strong> in the designer toolbar to open the live log panel. Each execution shows status (Success/Error) and a per-step breakdown with the exact message from each node.</P>
        </>}

        {active === 'publishing' && <>
          <H2><Globe className="w-5 h-5 text-primary-600"/>Publishing Applications</H2>
          <P>Publishing makes a frozen snapshot of your application available at a public URL, completely separate from the Nexus builder interface.</P>
          <H3>How to publish</H3>
          <P>Open an application and click <strong>Publish</strong> in the toolbar. Nexus saves a snapshot and generates a URL:</P>
          <CodeSnippet block>{"https://your-nexus-domain.run.app/workspace-name/app-slug"}</CodeSnippet>
          <Note icon={<Lightbulb className="w-4 h-4"/>} title="Changes require a re-publish" color="amber">Editing an application in the builder does not update the published version. Click Publish again to push your changes live. This protects users from seeing work-in-progress.</Note>
          <H3>Access control</H3>
          <P>Published apps are public by default. To restrict access, go to <em>Project Settings → Published App Access</em> and enable <strong>Require Sign-In</strong>. Users will need a Nexus account linked to your project.</P>
          <H3>Linking published apps with parameters</H3>
          <P>Row buttons and After Actions that navigate to another application work identically in published mode. All apps in a navigation chain must be published. Unpublished apps in a chain will display an error page.</P>
        </>}

        {active === 'keyfields' && <>
          <H2><Database className="w-5 h-5 text-primary-600"/>Key Fields</H2>
          <P>Key Fields define which column(s) uniquely identify a record. They are used by Nexus to find the record to update or delete when an application's Operation Mode is <em>Update Records</em> or <em>Delete Records</em>.</P>
          <H3>How matching works</H3>
          <P>On submit, Nexus queries the data source for rows where <em>all</em> Key Field values match the values entered in the corresponding input fields. Matching rows are updated or deleted.</P>
          <H3>Using _rowId (recommended)</H3>
          <P>The most reliable Key Field is <CodeSnippet>_rowId</CodeSnippet> — the internal document ID added automatically to every parameter URL by row buttons.</P>
          <ul className="mb-4 space-y-1"><Li>In the source app's row button, set action to <em>Go To Application</em> pointing to your edit app</Li><Li>In the edit app, add an Input with <strong>Field Mapping</strong> set to <CodeSnippet>_rowId</CodeSnippet> — it will be pre-filled from the URL automatically</Li><Li>In <em>Application Settings → Key Fields</em>, tick <CodeSnippet>_rowId</CodeSnippet></Li><Li>Set the Operation Mode to <em>Update Records</em> or <em>Delete Records</em></Li></ul>
          <H3>Using a business key</H3>
          <P>If your table has a natural unique key (e.g. <CodeSnippet>email</CodeSnippet> or <CodeSnippet>orderId</CodeSnippet>), you can use that instead. Ensure the input mapped to that field is visible in the form and that the value is passed via URL params from the source application.</P>
          <Note icon={<Lightbulb className="w-4 h-4"/>} title="Multiple Key Fields" color="violet">You can select more than one Key Field. Nexus queries for rows matching all selected keys simultaneously (AND logic). Useful for composite keys like <CodeSnippet>customerId</CodeSnippet> + <CodeSnippet>productId</CodeSnippet>.</Note>
        </>}

        {active === 'ai-assist' && <>
          <H2><Cpu className="w-5 h-5 text-primary-600" />Nexus AI Assist</H2>
          <P>Nexus AI Assist is an intelligent assistant built into the platform. It can answer questions about your project's data, applications, and workflows in plain English — and can build entire project structures from a description. Access it via the <strong>AI</strong> button in the top navigation bar.</P>

          <H3>Querying Your Data</H3>
          <P>Ask questions about records in your project datasources without needing to write queries. The assistant understands your table and field names from context.</P>
          <ul className="mb-4 space-y-1">
            <Li>Count records meeting criteria — <em>"How many support tickets are open and unassigned?"</em></Li>
            <Li>Find the most recent event — <em>"When was the last time a Google Chat notification was sent?"</em></Li>
            <Li>Request summaries — <em>"What is the total order value for Acme Corp this quarter?"</em></Li>
            <Li>Filter records — <em>"Show me all contacts in the London region with status Active"</em></Li>
          </ul>

          <H3>Querying Application Configuration</H3>
          <P>The assistant has full visibility of how your applications are built and connected.</P>
          <ul className="mb-4 space-y-1">
            <Li>Find which apps reference a table or field — <em>"Which applications use the Invoices table?"</em></Li>
            <Li>Understand navigation structure — <em>"Which apps link to Customer Detail?"</em></Li>
            <Li>Inspect component setup — <em>"What fields are visible in the Orders data table on the Dashboard app?"</em></Li>
          </ul>

          <H3>Querying Workflows & Logs</H3>
          <P>Check the health and history of your automation workflows without navigating into each one individually.</P>
          <ul className="mb-4 space-y-1">
            <Li><em>"Are all my workflows running correctly?"</em> — returns a status summary across all active workflows</Li>
            <Li><em>"When did the Invoice Reminder workflow last run?"</em></Li>
            <Li><em>"Show me any failed executions in the last 7 days"</em></Li>
            <Li><em>"Why did the New Order workflow fail on 2 May?"</em> — reads the log for that specific execution</Li>
          </ul>

          <H3>Creating Database Tables & Fields</H3>
          <P>Describe the data structure you need and the assistant will propose and create it for you.</P>
          <ul className="mb-4 space-y-1">
            <Li><em>"Add a Suppliers table with fields for name, email, phone, and country"</em></Li>
            <Li><em>"Add a Status field to the Projects table with options: Active, On Hold, Completed"</em></Li>
            <Li><em>"Create a junction table linking Employees to Projects"</em></Li>
          </ul>
          <Note icon={<Lightbulb className="w-4 h-4"/>} title="Confirmation required" color="amber">The assistant will always show you the proposed structure and ask for confirmation before making any changes to your project. No changes are applied silently.</Note>

          <H3>Creating Applications</H3>
          <P>Describe what an application should do and the assistant will scaffold it with appropriate components, data bindings, and settings.</P>
          <ul className="mb-4 space-y-1">
            <Li><em>"Create a form to add new Customer records"</em></Li>
            <Li><em>"Build an app that lists all Projects and links through to a detail view"</em></Li>
            <Li><em>"Set up a read-only dashboard showing this month's invoices"</em></Li>
          </ul>

          <H3>Creating Workflows</H3>
          <P>Describe the automation you need and the assistant will build a workflow with appropriate trigger and action nodes.</P>
          <ul className="mb-4 space-y-1">
            <Li><em>"Create a workflow that sends a confirmation email when a new Order is created"</em></Li>
            <Li><em>"Set up a daily scheduled workflow that checks for overdue tasks"</em></Li>
            <Li><em>"Build a workflow that sends a Google Chat notification when a Project is marked Completed"</em></Li>
          </ul>

          <H3>AI Project Generation (New Projects)</H3>
          <P>When creating a new project, you can opt for AI to generate the entire structure — database, applications, links, and workflows — from a plain-English description.</P>
          <ul className="mb-4 space-y-1">
            <Li>Click <strong>+ New Project</strong> and select <strong>Generate with AI</strong></Li>
            <Li>Describe your project type — e.g. <em>"A CRM for managing customer relationships and sales pipeline"</em> or <em>"An ERP for tracking inventory, purchases, and supplier invoices"</em></Li>
            <Li>The assistant will ask clarifying questions to confirm it understands your requirements before building anything</Li>
            <Li>Once you confirm, it automatically generates: the full database schema, core applications with data bindings, navigation buttons and links between apps, and recommended workflows for common automations</Li>
          </ul>
          <Note icon={<Lightbulb className="w-4 h-4"/>} title="Generated projects are fully editable" color="emerald">Everything the AI generates is a starting point. You can freely modify any table, application, or workflow after generation. Nothing is locked.</Note>

          <H3>Limitations</H3>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mt-3 mb-4">
            <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />Current Limitations
            </p>
            <ul className="space-y-2">
              <Li><strong>No live database query execution.</strong> The assistant reasons about your schema and data structure from context. It does not execute real-time queries directly against your Firestore database — answers about live record counts or values are based on schema awareness, not live data reads.</Li>
              <Li><strong>Schema context window.</strong> In very large projects, the full schema may exceed the AI's context capacity. For best results, focus questions on specific tables rather than querying the entire schema at once.</Li>
              <Li><strong>Workflow log detail.</strong> The assistant can access execution metadata (status, timestamps) but may not read the full payload of individual log entries in very high-volume workflows.</Li>
              <Li><strong>Write operations always require confirmation.</strong> Any action that creates or modifies tables, applications, or workflows will be presented for your review before being applied.</Li>
              <Li><strong>Single-project scope.</strong> AI Assist operates within the currently active project only. It cannot query or modify other projects in your workspace.</Li>
              <Li><strong>Generation quality depends on description detail.</strong> A brief description like <em>"build me a CRM"</em> produces a basic scaffold. Providing business context — key processes, specific terminology, team size — significantly improves output quality.</Li>
              <Li><strong>Generated output requires review before publishing.</strong> Always verify AI-generated applications and workflows against your business requirements before making them live.</Li>
              <Li><strong>Rate limits apply.</strong> The assistant is subject to API rate limits. If you see a rate limit message, wait approximately 60 seconds before continuing. Complex project generation requests consume more capacity than simple queries.</Li>
            </ul>
          </div>
        </>}

      </div>
    </div>
  );
}
