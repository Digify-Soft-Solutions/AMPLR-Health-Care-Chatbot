import express from 'express';
import fs from 'fs';
import { processHealthcareMessage } from '../services/healthcareEngine.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { addLiveWhatsAppMessage } from '../data/mockDatabase.js';

const router = express.Router();
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'automatex_copilot_token';

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION STORE
// Key: real WhatsApp message wamid (whts_ref_id) — unique per message.
// Fallback: phone+text composite key when wamid is absent.
// TTL: 30s — absorbs all GoShort/AutobotChat retry windows.
//
// NOTE: On Vercel Serverless, warm Lambda instances share this Map.
// Back-to-back retries (within ms) always hit the same warm instance → caught.
// Cold-start concurrent hits are very rare for session-based bots.
// ─────────────────────────────────────────────────────────────────────────────
const PROCESSED = new Map();
const DEDUP_TTL_MS = 30_000;

function isDuplicate(key) {
    const now = Date.now();
    if (PROCESSED.size > 500) {
        for (const [k, ts] of PROCESSED) {
            if (now - ts > DEDUP_TTL_MS) PROCESSED.delete(k);
        }
    }
    if (PROCESSED.has(key) && now - PROCESSED.get(key) < DEDUP_TTL_MS) {
        return true;
    }
    PROCESSED.set(key, now);
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// /tmp FILE-BASED CROSS-LAMBDA DEDUP
// GoShort fires 2 webhook events per incoming message. These often hit
// different Vercel Lambda instances (each with its own empty in-memory Map).
// /tmp is shared between Lambda instances on the SAME physical container,
// so this second layer catches the concurrent duplicate the Map misses.
// ─────────────────────────────────────────────────────────────────────────────
const TMP_DEDUP_FILE = '/tmp/wa_dedup.json';
const TMP_TTL_MS = 15_000; // 15 seconds window for /tmp layer

function isTmpDuplicate(key) {
    const now = Date.now();
    let locks = {};
    try {
        if (fs.existsSync(TMP_DEDUP_FILE)) {
            locks = JSON.parse(fs.readFileSync(TMP_DEDUP_FILE, 'utf8') || '{}');
        }
        // Clean expired keys
        for (const k in locks) {
            if (now - locks[k] > TMP_TTL_MS) delete locks[k];
        }
        if (locks[key] && (now - locks[key] < TMP_TTL_MS)) {
            return true; // duplicate detected via /tmp
        }
        // Mark key in /tmp
        locks[key] = now;
        fs.writeFileSync(TMP_DEDUP_FILE, JSON.stringify(locks), 'utf8');
    } catch (e) {
        // /tmp unavailable — fall back to in-memory only (safe to ignore)
    }
    return false;
}

const BOT_NUMBERS = new Set(['917425016636', '7425016636']);

/**
 * GET — Webhook verification (Meta / AutobotChat)
 */
router.get('/', (req, res) => {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && (token === VERIFY_TOKEN || token === 'automatex_copilot_token')) {
            console.log('[Webhook Verification] Verified successfully.');
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }
    res.status(200).send('Health Saathi Webhook Listener Ready (AutomateX.co.in)');
});

/**
 * POST — Incoming WhatsApp message handler (FULLY SYNCHRONOUS)
 *
 * WHY SYNCHRONOUS on Vercel:
 * Vercel Hobby Serverless stops CPU allocation immediately after res.send().
 * Any fire-and-forget / async IIFE code after res.send() gets no CPU time
 * and the outbound axios call silently dies (confirmed by logs showing
 * [Worker] POST → ... with zero response/error following it).
 *
 * The correct approach on Vercel:
 *   1. await the outbound dispatch BEFORE res.send()
 *   2. Use a strict axios timeout (3s) so the total Lambda time stays ~3.5s
 *   3. GoShort/WhatsApp retry window is ≥5s, so we respond before any retry
 *   4. Our wamid-based dedup catches the rare retry that arrives on same Lambda
 */
router.post('/', async (req, res) => {
    const rawBody = req.body || {};
    console.log('[Incoming Webhook Payload]:', JSON.stringify(rawBody));

    try {
        // ── GUARD A: Ignore status/delivery/echo events ────────────────────────
        const eventType = (rawBody.event || '').toUpperCase();
        const IGNORED_EVENTS = ['DELIVERY', 'READ', 'SENT', 'OUTBOUND', 'ACK', 'ECHO'];
        if (IGNORED_EVENTS.includes(eventType)) {
            console.log(`[Webhook] Ignored status event: ${eventType}`);
            return res.status(200).json({ status: 'ignored' });
        }

        // ── GUARD B: Meta Cloud API statuses-only / echo ───────────────────────
        if (rawBody.entry) {
            const changes = rawBody.entry[0]?.changes?.[0]?.value;
            if (changes && changes.statuses && !changes.messages) {
                console.log('[Webhook] Ignored Meta statuses-only payload.');
                return res.status(200).json({ status: 'ignored' });
            }
            const firstMsg = changes?.messages?.[0];
            if (firstMsg && firstMsg.from_me === true) {
                console.log('[Webhook] Ignored Meta message echo (from_me=true).');
                return res.status(200).json({ status: 'ignored' });
            }
        }

        // ── GUARD C: AutobotChat status-only payload (no text content) ─────────
        const target = rawBody.data || rawBody.payload || rawBody.result || rawBody;
        const isStatusPayload = (
            (rawBody.statuses || target.statuses) &&
            !rawBody.text && !rawBody.message && !rawBody.entry &&
            !target.text && !target.message && !target.interactive && !target.body
        );
        if (isStatusPayload) {
            console.log('[Webhook] Ignored status-only payload (no message content).');
            return res.status(200).json({ status: 'ignored' });
        }

        // ── PARSE: Extract phone, message text, message ID ─────────────────────
        let senderPhone = null;
        let messageText = null;
        let payloadData = null;
        let rawMsgId    = null;

        if (rawBody.entry && rawBody.entry[0]?.changes?.[0]?.value?.messages) {
            // Meta Cloud API
            const message = rawBody.entry[0].changes[0].value.messages[0];
            rawMsgId    = message.id;
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
            // AutobotChat / GoShort
            // CRITICAL: target.id = AutobotChat CONTACT ID (same for all messages
            // from same contact). whts_ref_id = real per-message wamid (unique).
            rawMsgId = target.whts_ref_id ||
                (target.context ? target.context.id : null) ||
                rawBody.whts_ref_id ||
                target.id; // ← contact ID, last resort only

            let rawPhone = (
                target.customer_phone || target.from_user || target.wa_id ||
                target.mobile || target.from || target.sender_id ||
                target.receiver || rawBody.from || rawBody.receiver
            );
            let cleanDigits = (rawPhone || '').toString().replace(/\D/g, '');

            const botWabaDigits = (rawBody.wabaNumber || '').replace(/\D/g, '');
            if (BOT_NUMBERS.has(cleanDigits) || (botWabaDigits && cleanDigits === botWabaDigits)) {
                rawPhone    = target.receiver || rawBody.receiver || target.to || rawBody.to;
                cleanDigits = (rawPhone || '').toString().replace(/\D/g, '');
            }

            senderPhone = cleanDigits || rawPhone;

            // GUARD D: If sender is still the bot number → outbound echo
            if (BOT_NUMBERS.has((senderPhone || '').toString().replace(/\D/g, ''))) {
                console.log('[Webhook] Ignored outbound echo — sender is bot number.');
                return res.status(200).json({ status: 'ignored' });
            }

            // Interactive
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

        console.log(`[Parsed] From: ${senderPhone} | Msg: "${messageText}" | MsgId: ${rawMsgId}`);

        // ── VALIDATE ───────────────────────────────────────────────────────────
        if (!senderPhone || (!messageText && !payloadData)) {
            console.log('[Webhook] Missing senderPhone or message content — skipped.');
            return res.status(200).json({ status: 'missing_data' });
        }

        senderPhone = senderPhone.toString().trim();

        // ── DEDUPLICATION ──────────────────────────────────────────────────────
        const contentKey = `${senderPhone.replace(/\D/g, '')}_${(messageText || payloadData || '').trim().toLowerCase()}`;
        const dedupKey   = rawMsgId || contentKey;

        // Layer 1: in-memory Map (catches same-Lambda duplicates instantly)
        if (isDuplicate(dedupKey)) {
            console.log(`[Webhook Duplicate Dropped - Memory] key="${dedupKey}" from ${senderPhone}`);
            return res.status(200).json({ status: 'duplicate_dropped' });
        }
        // Layer 2: /tmp file (catches cross-Lambda concurrent duplicates)
        if (isTmpDuplicate(dedupKey)) {
            console.log(`[Webhook Duplicate Dropped - TmpFile] key="${dedupKey}" from ${senderPhone}`);
            return res.status(200).json({ status: 'duplicate_dropped' });
        }
        // Also register content key
        if (rawMsgId) isDuplicate(contentKey);
        if (rawMsgId) isTmpDuplicate(contentKey);

        // ── PROCESS ────────────────────────────────────────────────────────────
        const displayName = rawBody.display_name || target.display_name ||
            rawBody.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ||
            target.name || target.pushname || null;

        const botResponse = processHealthcareMessage(senderPhone, messageText, payloadData);
        addLiveWhatsAppMessage(senderPhone, messageText || payloadData || 'Selection', botResponse.text, displayName);

        // ── DISPATCH (synchronous await — Lambda stays alive) ──────────────────
        // axios timeout in whatsappService is 3s. Total Lambda time ~3.5s.
        // GoShort retry window is ≥5s, so we always respond before any retry.
        console.log(`[Webhook] Dispatching reply to ${senderPhone}...`);
        const result = await sendWhatsAppMessage(senderPhone, botResponse);
        console.log(`[Webhook Dispatch Result]:`, JSON.stringify(result));

        return res.status(200).json({ status: 'success', result });

    } catch (error) {
        console.error('[Webhook Error]:', error.message || error);
        return res.status(200).json({ status: 'error', message: error.message });
    }
});

export default router;
