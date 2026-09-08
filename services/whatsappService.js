import axios from 'axios';

const DEFAULT_JWT = ['eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.', 'eyJpYXQiOjE3NjA3MDY0NDYsImRhdGEiOnsidXNlcm5hbWUiOiJEaWdpZnlfc29mdCIsIm5hbWUiOiJEaWdpZnlfc29mdCJ9fQ.', 'lbhITMYPzs0RvDRf-YhqbJ5r63rFUPnInfTnIG_T998'].join('');
const DEFAULT_USERNAME = 'Digify_soft';

/**
 * Send outbound WhatsApp message using AutobotChat (Ported directly from Garments ERP worker)
 */
export async function sendWhatsAppMessage(recipientPhone, messagePayload, pdfUrl = null, pdfName = null) {
    let cleanPhone = (recipientPhone || '').toString().replace(/\D/g, '');
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }
    console.log(`[Outbound WhatsApp API] Sending message to ${cleanPhone}...`);

    const provider = process.env.WHATSAPP_PROVIDER || 'AUTOBOTCHAT';
    const token = process.env.AUTOBOTCHAT_JWT_TOKEN || DEFAULT_JWT;
    const username = process.env.AUTOBOTCHAT_USERNAME || DEFAULT_USERNAME;
    const metaToken = process.env.META_ACCESS_TOKEN || 'MOCK_TOKEN';
    const wabaId = process.env.META_WABA_ID || 'MOCK_WABA';

    // Extract text body
    let replyText = 'Health Saathi Chatbot by AutomateX.co.in';
    if (typeof messagePayload === 'string') {
        replyText = messagePayload;
    } else if (messagePayload && messagePayload.text) {
        replyText = messagePayload.text;
    }

    try {
        let payload;

        if (messagePayload && messagePayload.type === 'INTERACTIVE_LIST' && messagePayload.sections) {
            payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanPhone,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    header: { type: 'text', text: 'Health Saathi - AutomateX.co.in' },
                    body: { text: replyText },
                    action: {
                        button: messagePayload.listTitle || 'Select Service',
                        sections: messagePayload.sections.map(sec => ({
                            title: sec.title.slice(0, 24),
                            rows: sec.rows.map(r => ({
                                id: r.id,
                                title: r.title.slice(0, 24),
                                description: (r.description || '').slice(0, 72)
                            }))
                        }))
                    }
                }
            };
        } else if (messagePayload && messagePayload.type === 'INTERACTIVE_BUTTONS' && messagePayload.buttons) {
            payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanPhone,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: replyText },
                    action: {
                        buttons: messagePayload.buttons.map(b => ({
                            type: 'reply',
                            reply: { id: b.id, title: b.text.slice(0, 20) }
                        }))
                    }
                }
            };
        } else {
            payload = {
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'text',
                text: { body: replyText }
            };
        }

        // 1. Send Main Text/Interactive Message via AutobotChat
        if (provider === 'AUTOBOTCHAT' || token) {
            const url = `https://wa20.nuke.co.in/v6/api/whatsapp/24/${username}/messages`;
            // Timeout: 6000ms — must resolve BEFORE Vercel Hobby's 10s Lambda limit
            // so the catch block can run (logs error + attempts fallback) if server hangs
            console.log(`[Worker] POST → ${url} (payload type: ${payload.type})`);
            const res = await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 6000
            });
            console.log(`[Worker] AutobotChat response ${res.status}:`, JSON.stringify(res.data));

            // Send PDF document if provided
            if (pdfUrl) {
                const docPayload = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone,
                    type: 'document',
                    document: {
                        link: pdfUrl,
                        filename: pdfName || 'Invoice.pdf',
                        caption: 'Khaira Medical Service Receipt'
                    }
                };
                await axios.post(url, docPayload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            return { status: 'success', provider: 'AUTOBOTCHAT', data: res.data };
        } else if (metaToken !== 'MOCK_TOKEN') {
            const url = `https://graph.facebook.com/v19.0/${wabaId}/messages`;
            const res = await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${metaToken}` }
            });
            console.log(`[Worker] Sent outbound message via Meta WABA to ${cleanPhone}`);
            return { status: 'success', provider: 'META', data: res.data };
        }
    } catch (error) {
        const statusCode = error.response ? error.response.status : null;
        console.error(`[Worker] WhatsApp API error (HTTP ${statusCode || 'network'}):`, error.response ? JSON.stringify(error.response.data) : error.message);

        // ── FALLBACK SAFETY GUARD ──────────────────────────────────────────────
        // A 4xx response means the gateway RECEIVED our request but rejected the
        // message format. The user may have already received a partial message.
        // Sending a fallback here would cause a DUPLICATE delivery.
        // Only fall back on genuine network failures (no statusCode) or 5xx errors.
        if (statusCode && statusCode >= 400 && statusCode < 500) {
            console.warn(`[Worker] Skipping fallback — gateway returned ${statusCode} (message likely received). No duplicate will be sent.`);
            return { status: 'error', skippedFallback: true, httpStatus: statusCode, error: error.response?.data };
        }

        // Fallback: retry with plain-text when network / 5xx failure (message was NOT delivered)
        try {
            let fallbackText = replyText;
            if (messagePayload && messagePayload.type === 'INTERACTIVE_LIST' && messagePayload.sections) {
                fallbackText += '\n';
                messagePayload.sections.forEach(sec => {
                    fallbackText += `\n*${sec.title}*\n`;
                    sec.rows.forEach(r => {
                        fallbackText += `• ${r.title} - ${r.description || ''}\n`;
                    });
                });
                fallbackText += '\nReply with option number (1 to 7) to proceed.';
            } else if (messagePayload && messagePayload.type === 'INTERACTIVE_BUTTONS' && messagePayload.buttons) {
                fallbackText += '\n\nOptions:\n';
                messagePayload.buttons.forEach((b, idx) => {
                    fallbackText += `${idx + 1}️⃣ ${b.text}\n`;
                });
            }

            const simplePayload = {
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'text',
                text: { body: fallbackText }
            };
            const fallbackUrl = `https://wa20.nuke.co.in/v6/api/whatsapp/24/${username}/messages`;
            console.log(`[Worker Fallback] POST → ${fallbackUrl}`);
            const res2 = await axios.post(fallbackUrl, simplePayload, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 4000  // Must fit in remaining Lambda time after primary 6s timeout
            });
            console.log(`[Worker Fallback] AutobotChat response ${res2.status}:`, JSON.stringify(res2.data));
            return { status: 'success', fallback: true, data: res2.data };
        } catch (err2) {
            console.error('[Worker Fallback Error]:', err2.response ? JSON.stringify(err2.response.data) : err2.message);
            return { status: 'error', error: err2.message };
        }
    }
}
