import express from 'express';
import { processHealthcareMessage } from '../services/healthcareEngine.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { addLiveWhatsAppMessage } from '../data/mockDatabase.js';

import fs from 'fs';
import path from 'path';

const router = express.Router();
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'automatex_copilot_token';

// Robust cross-instance deduplication cache for Serverless
const MEMORY_PROCESSED_KEYS = new Map();
const LOCK_FILE = '/tmp/recent_processed_msgs.json';

function isDuplicateServerlessMessage(phone, text, rawMsgId) {
    const now = Date.now();
    const cleanKey = `${(phone || '').replace(/\D/g, '')}_${(text || '').trim().toLowerCase()}`;

    // 1. Check in-memory map
    if (MEMORY_PROCESSED_KEYS.has(cleanKey)) {
        const lastTime = MEMORY_PROCESSED_KEYS.get(cleanKey);
        if (now - lastTime < 3000) { // 3 second debounce
            return true;
        }
    }
    if (rawMsgId && MEMORY_PROCESSED_KEYS.has(rawMsgId)) {
        return true;
    }

    // 2. Check /tmp lock file for cross-lambda instances
    try {
        let locks = {};
        if (fs.existsSync(LOCK_FILE)) {
            const raw = fs.readFileSync(LOCK_FILE, 'utf8');
            locks = JSON.parse(raw || '{}');
        }

        // Clean up old locks older than 15 seconds
        for (const k in locks) {
            if (now - locks[k] > 15000) delete locks[k];
        }

        if (locks[cleanKey] && (now - locks[cleanKey] < 3000)) {
            return true;
        }
        if (rawMsgId && locks[rawMsgId]) {
            return true;
        }

        // Record new lock
        locks[cleanKey] = now;
        if (rawMsgId) locks[rawMsgId] = now;
        fs.writeFileSync(LOCK_FILE, JSON.stringify(locks), 'utf8');
    } catch (e) {
        // Fallback to in-memory
    }

    MEMORY_PROCESSED_KEYS.set(cleanKey, now);
    if (rawMsgId) MEMORY_PROCESSED_KEYS.set(rawMsgId, now);

    // Clean up memory map
    if (MEMORY_PROCESSED_KEYS.size > 200) {
        const entries = Array.from(MEMORY_PROCESSED_KEYS.entries());
        for (const [k, v] of entries) {
            if (now - v > 30000) MEMORY_PROCESSED_KEYS.delete(k);
        }
    }

    return false;
}


/**
 * GET Webhook Verification endpoint for Meta WhatsApp Cloud API & AutobotChat
 */
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && (token === VERIFY_TOKEN || token === 'automatex_copilot_token')) {
            console.log('[Webhook Verification] Webhook verified successfully.');
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }
    res.status(200).send('Health Saathi Webhook Listener Ready (AutomateX.co.in)');
});

/**
 * POST Webhook message receiver endpoint
 * Receives real incoming WhatsApp messages from Meta Cloud API or AutobotChat / Goshort
 */
router.post('/', async (req, res) => {
    console.log('[Incoming Webhook Payload]:', JSON.stringify(req.body));

    try {
        const body = req.body || {};

        // Extract nested payload if AutobotChat wraps payload in `data` or `payload` or `result`
        const target = body.data || body.payload || body.result || body;

        // 1. Strictly ignore if this is an empty status update (delivery/read receipt without any message body)
        const isExplicitDeliveryWithoutText = (
            (body.event === 'DELIVERY' || body.event === 'READ' || body.event === 'SENT' || body.statuses || target.statuses) &&
            !body.text && !body.message && !body.entry && !target.text && !target.message && !target.interactive && !target.body
        );

        if (isExplicitDeliveryWithoutText) {
            console.log('[Webhook] Empty status report / delivery receipt ignored.');
            return res.status(200).json({ status: 'ignored' });
        }



        let senderPhone = null;
        let messageText = null;
        let payloadData = null;

        // 1. Structure check for Meta Cloud API message payload
        if (body.entry && body.entry[0]?.changes && body.entry[0].changes[0]?.value?.messages) {
            const message = body.entry[0].changes[0].value.messages[0];
            senderPhone = message.from;

            if (message.type === 'interactive' && message.interactive) {
                if (message.interactive.type === 'list_reply') {
                    payloadData = message.interactive.list_reply.id;
                    messageText = message.interactive.list_reply.title;
                } else if (message.interactive.type === 'button_reply') {
                    payloadData = message.interactive.button_reply.id;
                    messageText = message.interactive.button_reply.title;
                }
            } else {
                messageText = message.text ? message.text.body : '';
            }
        } 
        // 2. AutobotChat / Goshort webhook payload format (receiver / sender_id / from / wa_id)
        else {
            const BOT_NUMBERS = ['917425016636', '7425016636'];

            let rawPhone = target.customer_phone || target.from_user || target.wa_id || target.mobile || target.from || target.sender_id || target.receiver || body.from || body.receiver;
            let cleanPhoneDigits = (rawPhone || '').toString().replace(/\D/g, '');

            // In AutobotChat webhooks, if extracted phone equals the bot number, the patient phone is in receiver/to field
            if (BOT_NUMBERS.includes(cleanPhoneDigits) || cleanPhoneDigits === (body.wabaNumber || '').replace(/\D/g, '')) {
                rawPhone = target.receiver || body.receiver || target.customer_phone || target.to || body.to || target.from || body.from;
                cleanPhoneDigits = (rawPhone || '').toString().replace(/\D/g, '');
            }

            senderPhone = cleanPhoneDigits || rawPhone;



            // Interactive response handling
            const interactiveObj = target.interactive || body.interactive;
            if (interactiveObj) {
                const listReply = interactiveObj.list_reply || (interactiveObj.type === 'list_reply' ? interactiveObj : null);
                const buttonReply = interactiveObj.button_reply || (interactiveObj.type === 'button_reply' ? interactiveObj : null);

                if (listReply) {
                    payloadData = listReply.id;
                    messageText = listReply.title || listReply.id;
                } else if (buttonReply) {
                    payloadData = buttonReply.id;
                    messageText = buttonReply.title || buttonReply.id;
                }
            }

            if (!messageText) {
                if (typeof target.text === 'object' && target.text !== null) {
                    messageText = target.text.body || target.text.text || '';
                } else if (typeof target.text === 'string') {
                    messageText = target.text;
                } else if (typeof target.message === 'object' && target.message !== null) {
                    messageText = target.message.text || target.message.body || '';
                } else if (typeof target.message === 'string') {
                    messageText = target.message;
                } else {
                    messageText = target.body || target.msg || target.query || body.text || body.message || body.body || '';
                }
            }
        }

        console.log(`[Parsed Webhook Message] From: ${senderPhone} | Message: "${messageText}" | PayloadData: ${payloadData}`);

        if (!senderPhone || (!messageText && !payloadData)) {
            console.log('[Webhook] Missing senderPhone or message content in payload.');
            return res.status(200).json({ status: 'missing_data' });
        }

        // Clean phone number format
        senderPhone = senderPhone.toString().trim();

        // 3. Strict Phone + Content Serverless Deduplication (Prevents double dispatch)
        const msgId = body.id || target.id || target.whts_ref_id || (target.context ? target.context.id : null);
        if (isDuplicateServerlessMessage(senderPhone, messageText || payloadData, msgId)) {
            console.log(`[Webhook Duplicate Dropped] Ignored duplicate message for ${senderPhone}: "${messageText || payloadData}"`);
            return res.status(200).json({ status: 'duplicate_dropped' });
        }



        // Extract patient display name if provided by WhatsApp webhook
        const displayName = body.display_name || target.display_name ||
            body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ||
            target.name || target.pushname || null;

        // Process message through Healthcare Engine
        const botResponse = processHealthcareMessage(senderPhone, messageText, payloadData);

        // Save to Live WhatsApp Messages log for Admin Dashboard
        addLiveWhatsAppMessage(senderPhone, messageText || payloadData || 'Selection', botResponse.text, displayName);

        // Dispatch Outbound WhatsApp message back to patient's real phone!
        const result = await sendWhatsAppMessage(senderPhone, botResponse);
        console.log(`[Webhook Response Dispatch Result]:`, result);

        return res.status(200).json({ status: 'success', result });

    } catch (error) {
        console.error('[Webhook Processing Error]:', error);
        return res.status(200).json({ status: 'error', message: error.message });
    }
});


export default router;

