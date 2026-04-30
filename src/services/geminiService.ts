import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateAppScaffold(prompt: string, schemaContext: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const fullPrompt = `
        You are the Nexus AI App Builder. 
        Your task is to generate a structured JSON application configuration based on a user prompt.
        
        DATA SCHEMA CONTEXT:
        ${schemaContext}
        
        USER PROMPT:
        "${prompt}"
        
        Output only a JSON object matching the Nexus Component Configuration format.
        Include components for layouts, charts, and data tables with appropriate data bindings.
    `;

    try {
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
}

export async function getChatResponse(messages: { role: 'user' | 'assistant', content: string }[], schemaContext: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    const chat = model.startChat({
        history: history,
        generationConfig: {
            maxOutputTokens: 1000,
        },
    });

    const systemContext = `
        You are the Nexus Developer Assistant. You help users build cloud-native low-code apps.
        You have access to the current data schema:
        ${schemaContext}
        
        Your tone is professional, technical, and helpful. 
        When users ask about building features, refer to their actual table and field names.
        Keep responses concise and actionable. Use markdown for tables or code snippets if needed.
    `;

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage([
        { text: systemContext },
        { text: lastMessage }
    ]);
    
    const response = await result.response;
    return response.text();
}
