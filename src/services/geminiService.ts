import { GoogleGenerativeAI } from "@google/generative-ai";

// ── API key resolution ────────────────────────────────────────────────────────
// Vite injects GEMINI_API_KEY via vite.config define block (from either
// GEMINI_API_KEY or VITE_GEMINI_API_KEY in .env).  As a belt-and-braces
// fallback we also read import.meta.env directly so the key works in both
// dev (HMR) and production builds.
function resolveApiKey(): string {
  // 1. Vite define-injected (works after build)
  try {
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  } catch { /* process may not exist in some bundler configs */ }

  // 2. import.meta.env (always available in Vite)
  const meta = (import.meta as any).env ?? {};
  return meta.VITE_GEMINI_API_KEY || meta.GEMINI_API_KEY || '';
}

// ── Model preference order ────────────────────────────────────────────────────
// Try the newest model first; fall back through stable alternatives.
// A 403 usually means the key tier doesn't have access to a given model.
const MODEL_PRIORITY = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

export async function generateAppScaffold(prompt: string, schemaContext: string) {
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const fullPrompt = `You are the Nexus AI App Builder. Generate a structured JSON application configuration.\nDATA SCHEMA: ${schemaContext}\nUSER PROMPT: "${prompt}"\nOutput only a JSON object matching the Nexus Component Configuration format.`;

  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (error: any) {
      const code = extractHttpCode(error);
      if (code === 429) throw new Error('RATE_LIMIT');
      if (code === 403 || code === 404) continue; // try next model
      throw new Error('AI App Scaffolding failed. Please try again.');
    }
  }
  throw new Error('No available Gemini model found for this API key.');
}

export async function getChatResponse(messages: { role: 'user' | 'assistant'; content: string }[], schemaContext: string) {
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const lastMessage = messages[messages.length - 1].content;

  for (const modelName of MODEL_PRIORITY) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: `You are the Nexus Developer Assistant. You help users build cloud-native low-code apps.\nData schema: ${schemaContext}\nBe concise and actionable.`,
      });
      const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 1000 } });
      const result = await chat.sendMessage(lastMessage);
      return result.response.text();
    } catch (error: any) {
      const code = extractHttpCode(error);
      if (code === 429) throw new Error('RATE_LIMIT');
      if (code === 403 || code === 404) continue;
      throw new Error('AI Assistant is temporarily unavailable. Please try again.');
    }
  }
  throw new Error('No available Gemini model found for this API key.');
}

// ── Nexus AI Assist ───────────────────────────────────────────────────────────

export interface NexusAction {
  type: 'query_data' | 'create_table' | 'add_field' | 'create_app' | 'create_workflow' | 'create_dashboard' | 'create_report' | 'multi_action' | 'set_project_settings' | 'none';
  description: string;
  payload: any;
}

export interface NexusAssistantResponse {
  message: string;
  action?: NexusAction;
}

const NEXUS_SYSTEM_INSTRUCTION = `You are Nexus AI Assist, an intelligent assistant embedded in the Nexus no-code platform.
You answer questions about the user's project and can take actions to build and modify it.

YOUR CAPABILITIES:
1. Answer questions about data, apps, workflows, and logs using the project context provided in each message
2. Query live database records (action: "query_data")
3. Create new database tables (action: "create_table")
4. Add fields to existing tables (action: "add_field")
5. Create new applications (action: "create_app")
6. Create new workflows (action: "create_workflow")
7. Generate a full project from a description (action: "multi_action")

CRITICAL: Respond ONLY with a valid JSON object. No markdown fences, no backticks, no text outside the JSON.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT GENERATION WORKFLOW — follow this EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When a user asks you to build a project, system, or set of apps, do NOT jump straight to multi_action.
Follow this multi-turn conversation:

STEP 1 — TABLE CONFIRMATION (first reply)
  Propose the tables and their key fields in "message" text. Do NOT emit any action yet.
  List each table with its proposed fields, types, and which are required.
  End your message by asking: "Do these tables look right? Are there any additional tables or fields you would like to add before I create them?"
  Set action to null.

STEP 2 — APPLICATION APPROACH (after user confirms tables)
  Once the user approves the table design, ask ONE clarifying question:
  "Would you like me to create basic add/view applications for each table that you can customise afterwards, or would you prefer to describe what each application should do so I can build them with the right connections and functionality?"
  Set action to null.

STEP 3 — BUILD (after user answers Step 2)
  Now emit the full multi_action with all create_table steps, then create_app steps (correctly linked), then set_project_settings if colour/theme was mentioned.

SHORTCUT: If the user explicitly says "just build it", "create everything now", "yes go ahead and create", "basic apps are fine", "just do it", you may skip to Step 3 immediately.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APP LINKING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When designing applications, think about the user journey:
- A "Bookings" or "Orders" app that references other entities (Customers, Lessons, Products) should be aware of those tables. The components for those fields should be select/lookup types rather than plain inputs.
- Always propose a View/List app alongside an Add/Edit app for any central entity (e.g. "Customers List" + "Add Customer").
- Where fields reference other tables (e.g. Bookings.Customer, Bookings.Lesson), use type "select" for those components, not "input".
- If asked what applications should do, suggest logical cross-app navigation (e.g. from Bookings, link to Customer details).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always one of these two shapes:

{ "message": "Your conversational answer", "action": null }

{ "message": "Explanation of what you plan to do", "action": { "type": "...", "description": "One-line summary", "payload": { ... } } }

PAYLOAD SCHEMAS:

query_data:
{ "tableId": "string", "tableName": "string", "description": "what we are looking for", "limit": 50, "orderByField": "fieldName or null", "orderDirection": "desc", "filters": [{ "field": "fieldName", "operator": "==|>|<|>=|<=|!=", "value": "any" }] }

create_dashboard:
{ "name": "Dashboard Name", "cards": [{ "type": "kpi|bar|line|pie|table", "title": "Card title", "dataSourceId": "table name", "field": "fieldName", "aggregation": "count|sum|avg" }] }

create_report:
{ "name": "Report Name", "sections": [{ "type": "table|chart|text", "title": "Section title", "dataSourceId": "table name", "columns": ["field1","field2"] }] }

create_table:
{ "name": "TableName", "description": "optional", "fields": [{ "name": "Field Name", "type": "text|long_text|number|currency|date|datetime|boolean|single_select|multi_select|email|phone|url", "required": false, "options": ["for select types only"] }] }

add_field:
{ "tableId": "string", "tableName": "string", "field": { "name": "Field Name", "type": "text|number|boolean|single_select|multi_select|email|date|datetime|currency|url|phone", "required": false, "options": [] } }

create_app:
{ "name": "App Name", "description": "optional", "dataSourceId": "EXACT table name — NEVER empty inside multi_action", "mode": "view_only|add|update|delete", "components": [{ "type": "input|select|table|button", "label": "Label", "fieldMapping": "fieldName", "width": 320, "height": 48 }] }

set_project_settings:
{ "headingBackgroundColour": "#hex", "applicationBackgroundColour": "#hex", "componentPrimaryColour": "#hex", "componentSecondaryColour": "#hex", "buttonColourStandard": "#hex", "buttonColourHover": "#hex", "buttonColourClicked": "#hex", "headingText": "optional text" }

multi_action:
{ "projectSummary": "What is being built", "steps": [{ "type": "create_table|create_app|create_workflow|create_dashboard|create_report|set_project_settings", "description": "Step description", "payload": { ...same schemas as above... } }] }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Always answer from the project context before proposing any action.
- For write operations explain the plan first — the user must confirm.
- For data questions use query_data.
- ALWAYS follow the multi-turn workflow above UNLESS the user explicitly says to build immediately.
- CRITICAL: dataSourceId in every create_app step MUST be the EXACT table name, never empty.
- Use actual IDs and names from context — never invent them.
- Check recentLogs first for workflow/log questions.
- "message" must be conversational — never "Done", "OK", or empty.
- CRITICAL: "message" must contain ONLY natural language text, never JSON or code.
- If the user confirms ("yes", "go ahead", "ok", "do it", "sure"), re-propose the action cleanly.
- When the user mentions colours or an aesthetic, ALWAYS add set_project_settings at the END with a genuinely matching palette.`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract and parse a NexusAssistantResponse from raw model output.
 *
 * Gemini sometimes prepends preamble text ("Here's the plan:\n"), wraps the
 * JSON in markdown fences, or appends trailing commentary.  This function
 * locates the outermost JSON object in the response regardless of surrounding
 * text, using a brace-depth counter so nested objects are handled correctly.
 */
function robustParseResponse(raw: string): NexusAssistantResponse {
  // 1. Strip common markdown fences (``` or ```json) anywhere in the string
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // 2. Find the first '{' — everything before it is preamble
  const start = text.indexOf('{');
  if (start === -1) {
    // No JSON object at all — return as a plain message
    return { message: text || 'Sorry, I didn\'t understand that. Please try again.' };
  }

  // 3. Walk forward from 'start' tracking brace depth to find the matching '}'
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) {
    // Truncated JSON — the model hit the token limit mid-object.
    // Return an informative message so the user can retry.
    console.warn('[Nexus AI Assist] Response was truncated (unbalanced braces)');
    return {
      message: 'My response was cut off because the request was very large. Please try breaking it into smaller steps — for example, ask me to create the tables first, then the applications separately.',
    };
  }

  const jsonStr = text.substring(start, end + 1);
  try {
    const parsed = JSON.parse(jsonStr) as NexusAssistantResponse;
    // Sanity-check: make sure we got the expected shape
    if (typeof parsed.message === 'string') return parsed;
    // Unexpected shape — wrap it
    return { message: jsonStr };
  } catch (e) {
    console.error('[Nexus AI Assist] JSON.parse failed even after extraction:', e);
    // Last resort — return the plain text before the JSON as the message
    const preamble = text.substring(0, start).trim();
    return { message: preamble || 'Sorry, I couldn\'t parse my response. Please try again.' };
  }
}

function extractHttpCode(error: any): number | null {
  if (typeof error?.status === 'number') return error.status;
  const msg: string = error?.message ?? '';
  const m = msg.match(/\[(\d{3})\s*\]/);
  if (m) return parseInt(m[1]);
  if (msg.includes('429')) return 429;
  if (msg.includes('403')) return 403;
  if (msg.includes('404')) return 404;
  return null;
}

/** Trim project context to avoid sending huge payloads to the model.
 *  Keeps full table schema but caps record previews and logs. */
function trimContext(ctx: object): object {
  const c = ctx as any;
  return {
    ...c,
    // Cap recent logs to 10
    recentLogs: Array.isArray(c.recentLogs) ? c.recentLogs.slice(0, 10) : [],
    // Strip raw data rows from schema (keep field definitions only)
    schema: Array.isArray(c.schema)
      ? c.schema.map((t: any) => ({ id: t.id, name: t.name, fields: t.fields }))
      : c.schema,
  };
}

/** AI-M06: Build a compact project summary (counts only) for follow-up messages.
 *  Reduces token usage by ~70% on non-first messages. */
export function buildCompactContext(ctx: any): object {
  return {
    tableCount: (ctx.schema || []).length,
    appCount: (ctx.applications || []).length,
    workflowCount: (ctx.workflows || []).length,
    recentLogSummary: (ctx.recentLogs || []).slice(0, 3).map((l: any) => ({
      name: l.workflowName, status: l.status, at: l.triggeredAt
    })),
  };
}

// ── Streaming variant (AI-M01) ────────────────────────────────────────────────

/**
 * Streaming version of getNexusAssistantResponse.
 * Calls onChunk with each text fragment as it arrives, then resolves with
 * the fully-parsed NexusAssistantResponse once the stream is complete.
 */
export async function streamNexusAssistantResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  projectContext: object,
  onChunk: (text: string) => void,
  onRetry?: (attempt: number, delayMs: number) => void
): Promise<NexusAssistantResponse> {
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const MAX_ATTEMPTS = 4;
  const BACKOFF_MS = [0, 8_000, 20_000, 45_000];
  const trimmedContext = trimContext(projectContext);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      const delay = BACKOFF_MS[attempt - 1];
      onRetry?.(attempt, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    for (const modelName of MODEL_PRIORITY) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: NEXUS_SYSTEM_INSTRUCTION,
        });

        const priorMessages = messages.slice(0, -1).filter(m => m.content.trim() !== '');
        const firstUserIdx = priorMessages.findIndex(m => m.role === 'user');
        const trimmedHistory = firstUserIdx === -1 ? [] : priorMessages.slice(firstUserIdx);
        const history = trimmedHistory.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 6000 } });

        const userQuestion = messages[messages.length - 1].content;
        const userTurn = `CURRENT PROJECT CONTEXT:\n${JSON.stringify(trimmedContext)}\n\nUSER: ${userQuestion}`;

        // AI-M01: Use sendMessageStream for real-time chunk delivery
        const streamResult = await chat.sendMessageStream(userTurn);
        let fullText = '';
        for await (const chunk of streamResult.stream) {
          const text = chunk.text();
          if (text) {
            fullText += text;
            onChunk(text);
          }
        }

        console.log(`[Nexus AI Stream] Success with model: ${modelName}`);
        return robustParseResponse(fullText);
      } catch (error: any) {
        const code = extractHttpCode(error);
        if (code === 403 || code === 404) continue;
        if (code === 429) {
          if (attempt < MAX_ATTEMPTS) break;
          throw new Error('RATE_LIMIT');
        }
        throw new Error(error?.message ?? 'AI Assistant is temporarily unavailable.');
      }
    }
  }
  throw new Error('RATE_LIMIT');
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getNexusAssistantResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  projectContext: object,
  onRetry?: (attempt: number, delayMs: number) => void
): Promise<NexusAssistantResponse> {

  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);

  const MAX_ATTEMPTS = 4;
  const BACKOFF_MS = [0, 8_000, 20_000, 45_000];

  const trimmedContext = trimContext(projectContext);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      const delay = BACKOFF_MS[attempt - 1];
      onRetry?.(attempt, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // On first attempt try the preferred model; on retries after a 403/404,
    // we cycle through the fallback list inside the inner loop.
    for (const modelName of MODEL_PRIORITY) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: NEXUS_SYSTEM_INSTRUCTION,
        });

        const priorMessages = messages.slice(0, -1).filter(m => m.content.trim() !== '');
        const firstUserIdx = priorMessages.findIndex(m => m.role === 'user');
        const trimmedHistory = firstUserIdx === -1 ? [] : priorMessages.slice(firstUserIdx);

        const history = trimmedHistory.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 6000 } });

        const userQuestion = messages[messages.length - 1].content;
        const userTurn = `CURRENT PROJECT CONTEXT:\n${JSON.stringify(trimmedContext)}\n\nUSER: ${userQuestion}`;

        const result = await chat.sendMessage(userTurn);
        const raw = result.response.text().trim();

        console.log(`[Nexus AI Assist] Success with model: ${modelName}`);
        return robustParseResponse(raw);
      } catch (error: any) {
        const code = extractHttpCode(error);
        console.error(`[Nexus AI Assist] Attempt ${attempt}, model ${modelName}: HTTP ${code ?? '?'} — ${error?.message}`);

        if (code === 403 || code === 404) {
          // This model isn't available for this key — try the next model in the list
          continue;
        }

        if (code === 429) {
          // Rate limited — break inner model loop and use backoff retry
          if (attempt < MAX_ATTEMPTS) break;
          throw new Error('RATE_LIMIT');
        }

        // Any other error (500, network, etc.) — don't retry across models, bubble up
        throw new Error(error?.message ?? 'AI Assistant is temporarily unavailable. Please try again.');
      }
    }
    // If we exhausted all models on a 403/404 cycle, throw a clear message
    // (only reached if every model returned 403/404 on this attempt)
  }

  throw new Error('RATE_LIMIT');
}

/** Exported so the UI can check whether a key is configured at all */
export function isApiKeyConfigured(): boolean {
  return resolveApiKey().length > 0;
}
