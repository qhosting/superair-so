
import { GoogleGenAI, Type } from "@google/genai";

// --- CONFIGURACIÓN ---
const WAHA_URL = process.env.WAHA_URL || 'http://waha:3000'; 
const CHATWOOT_URL = process.env.CHATWOOT_URL || 'https://app.chatwoot.com';
const CHATWOOT_TOKEN = process.env.CHATWOOT_TOKEN || '';
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';
const CHATWOOT_INBOX_ID = process.env.CHATWOOT_INBOX_ID || '1';

// Helper for timeouts
const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

/**
 * Envía un mensaje de WhatsApp usando WAHA (WhatsApp HTTP API)
 */
export const sendWhatsApp = async (phone, message) => {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const chatId = `${cleanPhone}@c.us`;

    console.log(`📱 Enviando WhatsApp a ${chatId} vía WAHA...`);

    const response = await fetchWithTimeout(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: 'default',
        chatId: chatId,
        text: message
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`WAHA Error: ${err}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error.message);
    throw error;
  }
};

/**
 * Crea una conversación y mensaje en Chatwoot
 */
export const sendChatwootMessage = async (email, name, message) => {
  try {
    console.log(`💬 Enviando mensaje a Chatwoot para ${email}...`);

    if (!CHATWOOT_TOKEN) throw new Error("Chatwoot Token no configurado");

    const headers = { 
        'api_access_token': CHATWOOT_TOKEN,
        'Content-Type': 'application/json'
    };

    let contactId;
    const searchRes = await fetchWithTimeout(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${email}`, { headers });
    const searchData = await searchRes.json();

    if (searchData.payload && searchData.payload.length > 0) {
        contactId = searchData.payload[0].id;
    } else {
        const createRes = await fetchWithTimeout(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ email, name })
        });
        const createData = await createRes.json();
        contactId = createData.payload.contact.id;
    }

    const convRes = await fetchWithTimeout(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source_id: contactId, inbox_id: CHATWOOT_INBOX_ID })
    });
    const convData = await convRes.json();
    const conversationId = convData.id;

    const msgRes = await fetchWithTimeout(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: message, message_type: 'incoming' })
    });

    return await msgRes.json();

  } catch (error) {
    console.error('❌ Error enviando a Chatwoot:', error.message);
    throw error;
  }
};

/**
 * Analiza un mensaje entrante de WhatsApp para determinar si es un Lead de Venta
 */
export const analyzeLeadIntent = async (message) => {
    try {
        if (!process.env.API_KEY) {
            console.warn("⚠️ API KEY no configurada.");
            return { isLead: false, summary: message };
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            Analiza el siguiente mensaje de WhatsApp entrante para "SuperAir".
            Mensaje: "${message}"

            Determina la intención:
            - SALES: Si pide precio, cotización, información de producto, instalación o mantenimiento.
            - SUPPORT: Si reporta una falla, garantía o queja.
            - OTHER: Saludos, spam, u otros.

            Responde estrictamente con un JSON válido.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: { type: Type.STRING, enum: ["SALES", "SUPPORT", "OTHER"] },
                        name: { type: Type.STRING, description: "Probable name of the person if mentioned" },
                        serviceInterest: { type: Type.STRING, description: "Short summary of what they want" },
                        summary: { type: Type.STRING, description: "One sentence summary for CRM notes" }
                    },
                    required: ["intent", "summary"]
                }
            }
        });

        if (response.text) {
            const rawText = response.text;
            // Extracción segura de JSON
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const data = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
            
            return {
                isLead: data.intent === 'SALES',
                intent: data.intent,
                name: data.name,
                service: data.serviceInterest,
                summary: data.summary
            };
        }
    } catch (e) {
        console.error("AI Analysis Error:", e);
    }
    return { isLead: false, summary: message };
};
