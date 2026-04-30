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
