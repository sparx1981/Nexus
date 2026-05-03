import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export async function generateAppScaffold(prompt: string, schemaContext: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));
    const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 1000 } });
    const lastMessage = messages[messages.length - 1].content;
    try {
        const result = await chat.sendMessage([
            { text: `You are the Nexus Developer Assistant. Schema: ${schemaContext}. Be concise and helpful.` },
            { text: lastMessage }
        ]);
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

export async function getNexusAssistantResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  projectContext: object
): Promise<NexusAssistantResponse> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Gemini requires history to start with a 'user' turn.
  // Slice off the last message (the current user prompt), then drop any
  // leading assistant messages so the first history entry is always 'user'.
  const priorMessages = messages.slice(0, -1).filter(m => m.content.trim() !== '');
  const firstUserIdx = priorMessages.findIndex(m => m.role === 'user');
  const trimmedHistory = firstUserIdx === -1 ? [] : priorMessages.slice(firstUserIdx);

  const history = trimmedHistory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 2500 } });

  const systemPrompt = `You are Nexus AI Assist, an intelligent assistant embedded in the Nexus no-code platform.
You answer questions about the project and take actions to build and modify it.

CURRENT PROJECT CONTEXT:
${JSON.stringify(projectContext, null, 2)}

CAPABILITIES:
1. Answer questions about data, apps, workflows, logs using context above
2. Query live database records (action: "query_data")
3. Create new database tables (action: "create_table")
4. Add fields to existing tables (action: "add_field")
5. Create new applications (action: "create_app")
6. Create new workflows (action: "create_workflow")
7. Generate a full project from a description (action: "multi_action")

CRITICAL: Respond ONLY with valid JSON. No markdown, no backticks, nothing outside the JSON object.

RESPONSE FORMAT:
{ "message": "Conversational response", "action": null }

OR with action:
{ "message": "Clear explanation of plan or findings", "action": { "type": "...", "description": "One-line summary", "payload": { ... } } }

PAYLOAD SCHEMAS:

query_data: { "tableId": "string", "tableName": "string", "description": "what we are searching for", "limit": 50, "orderByField": "fieldName_or_null", "orderDirection": "desc" }

create_table: { "name": "TableName", "description": "optional", "fields": [{ "name": "Field Name", "type": "text|long_text|number|currency|date|datetime|boolean|single_select|multi_select|email|phone|url", "required": false, "options": ["for selects only"] }] }

add_field: { "tableId": "string", "tableName": "string", "field": { "name": "Field Name", "type": "text|number|boolean|single_select|multi_select|email|date|...", "required": false, "options": [] } }

create_app: { "name": "App Name", "description": "optional", "dataSourceId": "tableId_or_empty", "mode": "view_only|add|update|delete", "components": [{ "type": "input|select|table|button", "label": "Label", "fieldMapping": "fieldName", "width": 320, "height": 48 }] }

create_workflow: { "name": "Workflow Name", "triggerType": "record_created|record_updated|scheduled|webhook|received_email", "triggerTableId": "tableId_or_null", "triggerDescription": "e.g. Table: Orders", "actions": [{ "type": "send_email|google_chat|create_record|update_record|ai_generate", "label": "Action label", "config": {} }] }

multi_action: { "projectSummary": "What is being built", "steps": [{ "type": "create_table|create_app|create_workflow", "description": "Step description", "payload": { ... } }] }

RULES:
- For write operations, describe the plan in "message" before execution.
- For data questions, use query_data — system fetches real Firestore data then calls you again to summarise.
- For project generation, use multi_action with tables first, then apps (referencing tableIds), then workflows.
- Always use actual table IDs and names from context when they exist.
- Check recentLogs in context before querying for workflow/log questions.
- For select fields, include an "options" array with sensible values.
- message must be conversational and useful — never just "Done" or "OK".`;

  const lastMessage = messages[messages.length - 1].content;
  try {
    const result = await chat.sendMessage([{ text: systemPrompt }, { text: lastMessage }]);
    const raw = result.response.text().trim();
    const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    try {
      return JSON.parse(clean) as NexusAssistantResponse;
    } catch {
      return { message: clean };
    }
  } catch (error: any) {
    console.error('Nexus Assistant Error:', error);
    if (error.message?.includes('429')) throw new Error('Rate limit reached. Please wait 60 seconds and try again.');
    throw new Error('AI Assistant is temporarily unavailable. Please try again.');
  }
}
