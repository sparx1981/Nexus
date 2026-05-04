import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateAppScaffold(prompt: string, schemaContext: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const fullPrompt = `You are the Nexus AI App Builder. Generate a structured JSON application configuration.
DATA SCHEMA: ${schemaContext}
USER PROMPT: "${prompt}"
Output only a JSON object matching the Nexus Component Configuration format.`;
    try {
        const result = await model.generateContent(fullPrompt);
        return result.response.text();
    } catch (error: any) {
        if (error.message?.includes('429')) throw new Error('AI Generation rate limit reached. Please wait 60 seconds.');
        throw new Error('AI App Scaffolding failed. Please check your prompt or try again.');
    }
}

export async function getChatResponse(messages: { role: 'user' | 'assistant', content: string }[], schemaContext: string) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: `You are the Nexus Developer Assistant. You help users build cloud-native low-code apps.
You have access to the current data schema: ${schemaContext}
Your tone is professional, technical, and helpful. Keep responses concise and actionable.`,
    });
    const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));
    const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 1000 } });
    const lastMessage = messages[messages.length - 1].content;
    try {
        const result = await chat.sendMessage(lastMessage);
        return result.response.text();
    } catch (error: any) {
        if (error.message?.includes('429')) throw new Error('Rate exceeded. Please wait a moment and try again.');
        throw new Error('AI Assistant is temporarily unavailable. Please try again later.');
    }
}

// ── Nexus AI Assist ──────────────────────────────────────────────────────────

export interface NexusAction {
  type: 'query_data' | 'create_table' | 'add_field' | 'create_app' | 'create_workflow' | 'multi_action' | 'none';
  description: string;
  payload: any;
}

export interface NexusAssistantResponse {
  message: string;
  action?: NexusAction;
}

// Static system instruction — describes capabilities, response format, payload schemas.
// This never changes between requests so it belongs at the model level.
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

RESPONSE FORMAT — always one of these two shapes:

{ "message": "Your conversational answer", "action": null }

{ "message": "Explanation of what you plan to do", "action": { "type": "...", "description": "One-line summary", "payload": { ... } } }

PAYLOAD SCHEMAS:

query_data:
{ "tableId": "string", "tableName": "string", "description": "what we are looking for", "limit": 50, "orderByField": "fieldName or null", "orderDirection": "desc" }

create_table:
{ "name": "TableName", "description": "optional", "fields": [{ "name": "Field Name", "type": "text|long_text|number|currency|date|datetime|boolean|single_select|multi_select|email|phone|url", "required": false, "options": ["for select types only"] }] }

add_field:
{ "tableId": "string", "tableName": "string", "field": { "name": "Field Name", "type": "text|number|boolean|single_select|multi_select|email|date|datetime|currency|url|phone", "required": false, "options": [] } }

create_app:
{ "name": "App Name", "description": "optional", "dataSourceId": "tableId or empty string", "mode": "view_only|add|update|delete", "components": [{ "type": "input|select|table|button", "label": "Label", "fieldMapping": "fieldName", "width": 320, "height": 48 }] }

create_workflow:
{ "name": "Workflow Name", "triggerType": "record_created|record_updated|scheduled|webhook|received_email", "triggerTableId": "tableId or null", "triggerDescription": "e.g. Table: Orders", "actions": [{ "type": "send_email|google_chat|create_record|update_record|ai_generate", "label": "Action label", "config": {} }] }

multi_action — for generating a full project (tables first, then apps, then workflows):
{ "projectSummary": "What is being built", "steps": [{ "type": "create_table|create_app|create_workflow", "description": "Step description", "payload": { ...same schemas as above... } }] }

RULES:
- Always answer directly from the project context in the message before proposing any action.
- For write operations (create/add), explain the plan in "message" — the user must confirm before it executes.
- For data questions use query_data — the system will fetch real Firestore records and call you again to summarise.
- For project generation use multi_action — steps must be ordered: tables first, then apps (reference real tableIds), then workflows.
- Use actual table IDs and names from the context, never make them up.
- For workflow/log questions always check recentLogs in the context first before resorting to query_data.
- message must always be conversational and informative — never just "Done", "OK", or an empty string.`;

export async function getNexusAssistantResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  projectContext: object
): Promise<NexusAssistantResponse> {

  // systemInstruction is static — set it at the model level (correct SDK pattern).
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: NEXUS_SYSTEM_INSTRUCTION,
  });

  // Build conversation history from prior turns.
  // Gemini requires history to start with a 'user' turn, so strip any
  // leading assistant-only messages (e.g. the greeting shown in the UI).
  const priorMessages = messages.slice(0, -1).filter(m => m.content.trim() !== '');
  const firstUserIdx  = priorMessages.findIndex(m => m.role === 'user');
  const trimmedHistory = firstUserIdx === -1 ? [] : priorMessages.slice(firstUserIdx);

  const history = trimmedHistory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 2500 } });

  // The current user message. We prepend the live project context so the model
  // always has up-to-date data without bloating the static system instruction.
  const userQuestion = messages[messages.length - 1].content;
  const userTurn = `CURRENT PROJECT CONTEXT:\n${JSON.stringify(projectContext, null, 2)}\n\nUSER: ${userQuestion}`;

  try {
    const result = await chat.sendMessage(userTurn);
    const raw   = result.response.text().trim();
    // Strip any markdown fences the model may have added despite instructions
    const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    try {
      return JSON.parse(clean) as NexusAssistantResponse;
    } catch {
      // If JSON parse fails, return the raw text as a plain message
      return { message: clean };
    }
  } catch (error: any) {
    // Surface the real error in the console for debugging, then throw a user-friendly version
    console.error('[Nexus AI Assist] API error:', error?.message ?? error);
    if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
      throw new Error('Gemini API key is missing or invalid. Set GEMINI_API_KEY in your .env file.');
    }
    if (error.message?.includes('429')) {
      throw new Error('Rate limit reached. Please wait 60 seconds and try again.');
    }
    // Throw with the real message so AIAssistant.tsx can display it
    throw new Error(error?.message ?? 'AI Assistant is temporarily unavailable. Please try again.');
  }
}
