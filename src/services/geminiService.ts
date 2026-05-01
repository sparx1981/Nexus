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
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        
        if (error.message?.includes('429')) {
          throw new Error('AI Generation rate limit reached. Please wait 60 seconds.');
        }
        
        throw new Error('AI App Scaffolding failed. Please check your prompt or try again.');
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
    try {
        const result = await chat.sendMessage([
            { text: systemContext },
            { text: lastMessage }
        ]);
        
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("AI Assistant Error:", error);
        
        if (error.message?.includes('429') || error.message?.includes('finishReason: RECITATION')) {
            throw new Error('Rate exceeded for AI Assistant. Please wait a moment and try again.');
        }
        
        if (error.message?.includes('finishReason: SAFETY')) {
            throw new Error('I apologize, but I cannot process that request due to safety guidelines.');
        }

        throw new Error('AI Assistant is temporarily unavailable. Please try again later.');
    }
}
