import express from 'express';
import { processHealthcareMessage } from '../services/healthcareEngine.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { addLiveWhatsAppMessage } from '../data/mockDatabase.js';

const router = express.Router();
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'automatex_copilot_token';

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION — In-memory Map (works perfectly on Render persistent server)
//
// On Render: single long-running Node.js process → ONE shared Map for ALL
// requests. No Lambda cold-starts, no cross-instance issues. GoShort's dual
// webhook events always hit the same process → second one caught instantly.
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
    if (PROCESSED.has(key) && now - PROCESSED.get(key) < DEDUP_TTL_MS) return true;
    PROCESSED.set(key, now);
    return false;
}

const BOT_NUMBERS = new Set(['917425016636', '7425016636']);

/**
 * GET — Webhook verification
 */
router.get('/', (req, res) => {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && (token === VERIFY_TOKEN || token === 'automatex_copilot_token')) {
            console.log('[Webhook] Verified successfully.');
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }
    res.status(200).send('AMPLR Health WhatsApp Webhook Ready');
});

/**
 * POST — Incoming WhatsApp message handler
 *
 * On Render (persistent Node.js server):
 *  - Send HTTP 200 IMMEDIATELY → GoShort never retries
 *  - Process and dispatch AFTER res.json() in the same async handler
 *  - Express/Node.js keeps the event loop alive — no Lambda termination
 *  - In-memory Map dedup works perfectly (same process = same Map always)
 */
router.post('/', async (req, res) => {
    const rawBody = req.body || {};
    console.log('[Incoming Webhook Payload]:', JSON.stringify(rawBody));

    // ── GUARD A: Status/echo events ───────────────────────────────────────────
    const eventType = (rawBody.event || '').toUpperCase();
    if (['DELIVERY', 'READ', 'SENT', 'OUTBOUND', 'ACK', 'ECHO'].includes(eventType)) {
        console.log(`[Webhook] Ignored status event: ${eventType}`);
        return res.status(200).json({ status: 'ignored' });
    }

    // ── GUARD B: Meta statuses-only / echo ────────────────────────────────────
    if (rawBody.entry) {
        const changes = rawBody.entry[0]?.changes?.[0]?.value;
        if (changes && changes.statuses && !changes.messages) {
            console.log('[Webhook] Ignored Meta statuses-only payload.');
            return res.status(200).json({ status: 'ignored' });
        }
        if (changes?.messages?.[0]?.from_me === true) {
            console.log('[Webhook] Ignored Meta echo (from_me=true).');
            return res.status(200).json({ status: 'ignored' });
        }
    }

    // ── GUARD C: AutobotChat status-only payload ──────────────────────────────
    const target = rawBody.data || rawBody.payload || rawBody.result || rawBody;
    const isStatusOnly = (
        (rawBody.statuses || target.statuses) &&
        !rawBody.text && !rawBody.message && !rawBody.entry &&
        !target.text && !target.message && !target.interactive && !target.body
    );
    if (isStatusOnly) {
        console.log('[Webhook] Ignored status-only payload.');
        return res.status(200).json({ status: 'ignored' });
    }

    // ── PARSE ─────────────────────────────────────────────────────────────────
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
            messageText = message.text?.body || '';
        }
    } else {
        // AutobotChat / GoShort
        rawMsgId = target.whts_ref_id ||
            (target.context ? target.context.id : null) ||
            rawBody.whts_ref_id ||
            target.id;

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

        if (BOT_NUMBERS.has((senderPhone || '').toString().replace(/\D/g, ''))) {
            console.log('[Webhook] Ignored outbound echo — sender is bot number.');
            return res.status(200).json({ status: 'ignored' });
        }

        const interactiveObj = target.interactive || rawBody.interactive;
        if (interactiveObj) {
            const lr = interactiveObj.list_reply   || (interactiveObj.type === 'list_reply'   ? interactiveObj : null);
            const br = interactiveObj.button_reply || (interactiveObj.type === 'button_reply' ? interactiveObj : null);
            if (lr) { payloadData = lr.id; messageText = lr.title || lr.id; }
            if (br) { payloadData = br.id; messageText = br.title || br.id; }
        }

        if (!messageText) {
            if      (typeof target.text    === 'object' && target.text)    messageText = target.text.body    || target.text.text || '';
            else if (typeof target.text    === 'string')                   messageText = target.text;
            else if (typeof target.message === 'object' && target.message) messageText = target.message.text || target.message.body || '';
            else if (typeof target.message === 'string')                   messageText = target.message;
            else messageText = target.body || target.msg || target.query || rawBody.text || rawBody.message || rawBody.body || '';
        }
    }

    console.log(`[Parsed] From: ${senderPhone} | Msg: "${messageText}" | MsgId: ${rawMsgId}`);

    // ── VALIDATE ──────────────────────────────────────────────────────────────
    if (!senderPhone || (!messageText && !payloadData)) {
        console.log('[Webhook] Missing senderPhone or content — skipped.');
        return res.status(200).json({ status: 'missing_data' });
    }

    senderPhone = senderPhone.toString().trim();

    // ── DEDUP ─────────────────────────────────────────────────────────────────
    const contentKey = `${senderPhone.replace(/\D/g, '')}_${(messageText || payloadData || '').trim().toLowerCase()}`;
    const dedupKey   = rawMsgId || contentKey;

    if (isDuplicate(dedupKey)) {
        console.log(`[Webhook Duplicate Dropped] key="${dedupKey}" from ${senderPhone}`);
        return res.status(200).json({ status: 'duplicate_dropped' });
    }
    if (rawMsgId) isDuplicate(contentKey);

    // ── PROCESS ───────────────────────────────────────────────────────────────
    const displayName = rawBody.display_name || target.display_name ||
        rawBody.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ||
        target.name || target.pushname || null;

    const botResponse = processHealthcareMessage(senderPhone, messageText, payloadData);
    addLiveWhatsAppMessage(senderPhone, messageText || payloadData || 'Selection', botResponse.text, displayName);

    // ── SEND 200 FIRST — Render stays alive after this, unlike Vercel ─────────
    res.status(200).json({ status: 'accepted' });

    // ── DISPATCH ──────────────────────────────────────────────────────────────
    try {
        console.log(`[Webhook] Dispatching reply to ${senderPhone}...`);
        const result = await sendWhatsAppMessage(senderPhone, botResponse);
        console.log(`[Webhook Dispatch Result]:`, JSON.stringify(result));
    } catch (err) {
        console.error('[Webhook Dispatch Error]:', err.message);
    }
});

export default router;
