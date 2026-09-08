import express from 'express';
import { processHealthcareMessage } from '../services/healthcareEngine.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { addLiveWhatsAppMessage } from '../data/mockDatabase.js';

const router = express.Router();
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'automatex_copilot_token';

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION STORE
// Key design: use raw WhatsApp message ID (msgId) as the primary dedup key.
// It is globally unique per message and stable across all retries.
// Secondary key: phone+text hash for cases where msgId is absent.
// TTL: 30 seconds — sufficient to absorb all WhatsApp / AutobotChat retry windows.
// ─────────────────────────────────────────────────────────────────────────────
const PROCESSED = new Map(); // key → timestamp (ms)
const DEDUP_TTL_MS = 30_000; // 30 seconds

function isDuplicate(key) {
    const now = Date.now();
    // Purge expired keys to prevent memory leak (run occasionally)
    if (PROCESSED.size > 500) {
        for (const [k, ts] of PROCESSED) {
            if (now - ts > DEDUP_TTL_MS) PROCESSED.delete(k);
        }
    }
    if (PROCESSED.has(key) && now - PROCESSED.get(key) < DEDUP_TTL_MS) {
        return true;
    }
    // Mark as processed immediately — before any async work starts
    PROCESSED.set(key, now);
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bot phone numbers (digits only) — used to detect echo/outbound events
// ─────────────────────────────────────────────────────────────────────────────
const BOT_NUMBERS = new Set(['917425016636', '7425016636']);

/**
 * GET Webhook Verification endpoint for Meta WhatsApp Cloud API & AutobotChat
 */
router.get('/', (req, res) => {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
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
 * POST Webhook message receiver
 *
 * CRITICAL: We return HTTP 200 IMMEDIATELY so WhatsApp / AutobotChat never
 * declares a timeout and fires a duplicate retry. All processing happens in
 * a fire-and-forget async block after the response is sent.
 */
router.post('/', (req, res) => {
    // ── STEP 1: Return 200 immediately ────────────────────────────────────────
    // This MUST happen before any await. WhatsApp expects acknowledgement
    // within ~2 seconds. Failure = automatic retry = duplicate reply.
    res.status(200).send('EVENT_RECEIVED');

    // ── STEP 2: Process asynchronously (fire-and-forget) ──────────────────────
    setImmediate(async () => {
        try {
            const rawBody = req.body || {};
            console.log('[Incoming Webhook Payload]:', JSON.stringify(rawBody));

            // ── GUARD A: Ignore pure status/receipt events ─────────────────────
            // These event types carry no user message and must never trigger a reply.
            const eventType = (rawBody.event || '').toUpperCase();
            const IGNORED_EVENTS = ['DELIVERY', 'READ', 'SENT', 'OUTBOUND', 'ACK', 'ECHO'];
            if (IGNORED_EVENTS.includes(eventType)) {
                console.log(`[Webhook] Ignored status event: ${eventType}`);
                return;
            }

            // ── GUARD B: Meta Cloud API — skip statuses-only payloads ───────────
            // Meta sends {statuses:[...]} updates with no messages array
            if (rawBody.entry) {
                const changes = rawBody.entry[0]?.changes?.[0]?.value;
                if (changes && changes.statuses && !changes.messages) {
                    console.log('[Webhook] Ignored Meta statuses-only payload.');
                    return;
                }
                // Also skip message_echoes (messages the bot itself sent)
                const firstMsg = changes?.messages?.[0];
                if (firstMsg && firstMsg.from_me === true) {
                    console.log('[Webhook] Ignored Meta message echo (from_me=true).');
                    return;
                }
            }

            // ── GUARD C: AutobotChat outbound echo detection ────────────────────
            // AutobotChat sometimes re-POSTs outbound messages back to the webhook.
            // These typically carry event = SENT / OUTBOUND or have no user text.
            const target = rawBody.data || rawBody.payload || rawBody.result || rawBody;
            const isStatusPayload = (
                (rawBody.statuses || target.statuses) &&
                !rawBody.text && !rawBody.message && !rawBody.entry &&
                !target.text && !target.message && !target.interactive && !target.body
            );
            if (isStatusPayload) {
                console.log('[Webhook] Ignored status-only payload (no message content).');
                return;
            }

            // ── PARSE: Extract phone number and message text ────────────────────
            let senderPhone = null;
            let messageText = null;
            let payloadData = null;
            let rawMsgId    = null;

            if (rawBody.entry && rawBody.entry[0]?.changes?.[0]?.value?.messages) {
                // Meta Cloud API payload
                const message = rawBody.entry[0].changes[0].value.messages[0];
                rawMsgId    = message.id; // e.g. "wamid.Abc123..."
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

            } else {
                // AutobotChat / Goshort payload
                rawMsgId = target.id || target.whts_ref_id || rawBody.id ||
                    (target.context ? target.context.id : null);

                let rawPhone = (
                    target.customer_phone || target.from_user || target.wa_id ||
                    target.mobile || target.from || target.sender_id ||
                    target.receiver || rawBody.from || rawBody.receiver
                );
                let cleanDigits = (rawPhone || '').toString().replace(/\D/g, '');

                // If the extracted phone is the bot itself, read the patient's number
                // from the receiver / to field instead
                const botWabaDigits = (rawBody.wabaNumber || '').replace(/\D/g, '');
                if (BOT_NUMBERS.has(cleanDigits) || (botWabaDigits && cleanDigits === botWabaDigits)) {
                    rawPhone    = target.receiver || rawBody.receiver || target.to || rawBody.to;
                    cleanDigits = (rawPhone || '').toString().replace(/\D/g, '');
                }

                senderPhone = cleanDigits || rawPhone;

                // ── GUARD D: If resolved sender is still the bot, this is an echo ─
                if (BOT_NUMBERS.has((senderPhone || '').toString().replace(/\D/g, ''))) {
                    console.log('[Webhook] Ignored outbound echo — resolved sender is bot number.');
                    return;
                }

                // Interactive reply handling
                const interactiveObj = target.interactive || rawBody.interactive;
                if (interactiveObj) {
                    const listReply   = interactiveObj.list_reply   || (interactiveObj.type === 'list_reply'   ? interactiveObj : null);
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
                        messageText = target.body || target.msg || target.query ||
                            rawBody.text || rawBody.message || rawBody.body || '';
                    }
                }
            }

            console.log(`[Parsed Webhook Message] From: ${senderPhone} | Message: "${messageText}" | PayloadData: ${payloadData} | MsgId: ${rawMsgId}`);

            // ── VALIDATE: Must have a phone and some content ────────────────────
            if (!senderPhone || (!messageText && !payloadData)) {
                console.log('[Webhook] Missing senderPhone or message content — skipped.');
                return;
            }

            senderPhone = senderPhone.toString().trim();

            // ── DEDUPLICATION ───────────────────────────────────────────────────
            // Priority 1: Use the raw WhatsApp message ID — it is stable and unique
            //             across all retries of the exact same message.
            // Priority 2: Fall back to phone+content composite key.
            const contentKey = `${senderPhone.replace(/\D/g, '')}_${(messageText || payloadData || '').trim().toLowerCase()}`;
            const dedupKey   = rawMsgId || contentKey;

            if (isDuplicate(dedupKey)) {
                console.log(`[Webhook Duplicate Dropped] key="${dedupKey}" from ${senderPhone}`);
                return;
            }
            // If we used msgId as primary key, also register the content key
            // so that retries without a msgId header are also caught
            if (rawMsgId && !isDuplicate(contentKey)) {
                // isDuplicate already stored it, nothing extra needed
            }

            // ── PROCESS ─────────────────────────────────────────────────────────
            const displayName = rawBody.display_name || target.display_name ||
                rawBody.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ||
                target.name || target.pushname || null;

            const botResponse = processHealthcareMessage(senderPhone, messageText, payloadData);

            addLiveWhatsAppMessage(
                senderPhone,
                messageText || payloadData || 'Selection',
                botResponse.text,
                displayName
            );

            // ── DISPATCH ────────────────────────────────────────────────────────
            const result = await sendWhatsAppMessage(senderPhone, botResponse);
            console.log(`[Webhook Dispatch Result]:`, result);

        } catch (error) {
            console.error('[Webhook Async Processing Error]:', error.message || error);
        }
    });
});


export default router;
