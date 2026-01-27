import { GoogleGenAI, SchemaType } from "@google/genai";

const WAHA_URL = process.env.WAHA_URL || 'http://waha:3000';
const CHATWOOT_URL = process.env.CHATWOOT_URL || 'https://app.chatwoot.com';
const CHATWOOT_TOKEN = process.env.CHATWOOT_TOKEN || '';
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';
const CHATWOOT_INBOX_ID = process.env.CHATWOOT_INBOX_ID || '1';

const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export const sendWhatsApp = async (phone, message) => {
    try {
        const cleanPhone = phone.replace(/\D/g, '');
        const chatId = `${cleanPhone}@c.us`;
        console.log(`📱 Sending WhatsApp to ${chatId}...`);

        const response = await fetchWithTimeout(`${WAHA_URL}/api/sendText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: 'default', chatId, text: message })
        });

        if (!response.ok) throw new Error(`WAHA Error: ${await response.text()}`);
        return await response.json();
    } catch (error) {
        console.error('❌ WhatsApp Error:', error.message);
        // Don't throw, just log, so main flow isn't interrupted
        return { error: error.message };
    }
};

export const sendChatwootMessage = async (email, name, message) => {
    // Placeholder implementation for Chatwoot integration
    console.log(`💬 Chatwoot message to ${email}: ${message}`);
    return { success: true };
};

export const analyzeLeadIntent = async (message) => {
    try {
        if (!process.env.API_KEY) return { isLead: false, summary: message };

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analyze this WhatsApp message: "${message}". Classify intent as SALES, SUPPORT, or OTHER. Extract name and summary. JSON format.`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt
        });

        const text = response.text;
        // Simple heuristic extraction if JSON parsing fails or model chatters
        const isSales = text.toUpperCase().includes('SALES');
        return { isLead: isSales, summary: message, intent: isSales ? 'SALES' : 'OTHER' };
    } catch (e) {
        console.error("AI Analysis Error:", e);
        return { isLead: false, summary: message };
    }
};
