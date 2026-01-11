// Node.js 18+ has native fetch, so we don't need to import it.
// import fetch from 'node-fetch'; 

// --- CONFIGURACIÓN ---
// En producción, estas variables vienen de process.env
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
    // Formatear teléfono: eliminar caracteres no numéricos y asegurar sufijo @c.us
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
    console.error('❌ Error enviando WhatsApp (Timeout o Red):', error.message);
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

    // 1. Buscar o Crear Contacto
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

    // 2. Crear Conversación
    const convRes = await fetchWithTimeout(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source_id: contactId, inbox_id: CHATWOOT_INBOX_ID })
    });
    const convData = await convRes.json();
    const conversationId = convData.id;

    // 3. Enviar Mensaje
    const msgRes = await fetchWithTimeout(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: message, message_type: 'incoming' }) // incoming simula que el cliente lo envió
    });

    return await msgRes.json();

  } catch (error) {
    console.error('❌ Error enviando a Chatwoot (Timeout o Red):', error.message);
    throw error;
  }
};