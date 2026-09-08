import express from 'express';
import fs from 'fs';
import { processHealthcareMessage } from '../services/healthcareEngine.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { addLiveWhatsAppMessage } from '../data/mockDatabase.js';

const router = express.Router();
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'automatex_copilot_token';

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — In-memory dedup (same Lambda instance)
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

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — Atomic /tmp file lock (cross-Lambda, race-condition-free)
//
// GoShort fires 2 webhook events SIMULTANEOUSLY for each incoming message.
// They hit different Vercel Lambda instances with separate in-memory Maps.
//
// Fix: fs.openSync(path, 'wx') = POSIX O_EXCL exclusive create.
// This is ATOMIC on Linux filesystems. If two Lambdas race:
//   Lambda A: openSync → success (gets the lock) → processes
//   Lambda B: openSync → throws EEXIST              → dropped as duplicate
//
// Lock file is cleaned up after TTL or immediately on drop.
// ─────────────────────────────────────────────────────────────────────────────
const TMP_LOCK_TTL_MS = 20_000;

function acquireTmpLock(key) {
    // Sanitise key to a safe filename
    const safeName = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const lockPath = `/tmp/wa_lock_${safeName}`;

    try {
        // O_EXCL: fails with EEXIST if file already exists — fully atomic
        const fd = fs.openSync(lockPath, 'wx');
        fs.closeSync(fd);

        // Auto-delete after TTL so stale locks don't block future messages
        setTimeout(() => { try { fs.unlinkSync(lockPath); } catch (_) {} }, TMP_LOCK_TTL_MS);

        return true;  // lock acquired → first one here → NOT duplicate
    } catch (e) {
        if (e.code === 'EEXIST') return false; // already locked → IS duplicate
        return true;  // unexpected error → allow through (fail-open)
    }
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
 * POST — Incoming WhatsApp message handler
 *
 * ARCHITECTURE (Vercel Hobby compatible):
 *
 * The handler is async. We send HTTP 200 EARLY (before the outbound dispatch)
 * so GoShort receives acknowledgement in <100ms and NEVER fires a retry.
 * Crucially, we remain inside the SAME async handler function after res.json() —
 * Vercel keeps the Lambda alive until the handler's own Promise resolves,
 * which only happens after `await sendWhatsAppMessage()` completes.
 *
 * This is the key difference from the IIFE approach (which started a NEW
 * detached Promise that Vercel ignored) — here the handler Promise itself
 * is still pending while the dispatch runs.
 *
 * DEDUP (2 layers, handles GoShort's dual-webhook behaviour):
 *   Layer 1: in-memory Map  — zero-cost, catches same-Lambda duplicates
 *   Layer 2: atomic /tmp lock — race-free O_EXCL, catches cross-Lambda concurrent duplicates
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

    // ── GUARD C: AutobotChat status-only (no text) ────────────────────────────
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
        // CRITICAL: target.id = CONTACT ID (same for all messages from same user)
        // whts_ref_id = real per-message wamid — always unique per message
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

        // GUARD D: sender resolved to bot number → outbound echo
        if (BOT_NUMBERS.has((senderPhone || '').toString().replace(/\D/g, ''))) {
            console.log('[Webhook] Ignored outbound echo — sender is bot number.');
            return res.status(200).json({ status: 'ignored' });
        }

        // Interactive replies
        const interactiveObj = target.interactive || rawBody.interactive;
        if (interactiveObj) {
            const listReply   = interactiveObj.list_reply   || (interactiveObj.type === 'list_reply'   ? interactiveObj : null);
            const buttonReply = interactiveObj.button_reply || (interactiveObj.type === 'button_reply' ? interactiveObj : null);
            if (listReply)   { payloadData = listReply.id;   messageText = listReply.title   || listReply.id; }
            if (buttonReply) { payloadData = buttonReply.id; messageText = buttonReply.title || buttonReply.id; }
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
        console.log('[Webhook] Missing senderPhone or message content — skipped.');
        return res.status(200).json({ status: 'missing_data' });
    }

    senderPhone = senderPhone.toString().trim();

    // ── DEDUP (must happen BEFORE res.json so GoShort is ack'd quickly) ───────
    const contentKey = `${senderPhone.replace(/\D/g, '')}_${(messageText || payloadData || '').trim().toLowerCase()}`;
    const dedupKey   = rawMsgId || contentKey;

    // Layer 1: in-memory Map
    if (isDuplicate(dedupKey)) {
        console.log(`[Webhook Duplicate Dropped - Memory] key="${dedupKey}"`);
        return res.status(200).json({ status: 'duplicate_dropped' });
    }
    // Layer 2: atomic /tmp lock (cross-Lambda race-free)
    if (!acquireTmpLock(dedupKey)) {
        console.log(`[Webhook Duplicate Dropped - TmpLock] key="${dedupKey}"`);
        isDuplicate(dedupKey); // sync memory map with /tmp result
        return res.status(200).json({ status: 'duplicate_dropped' });
    }
    if (rawMsgId) { isDuplicate(contentKey); acquireTmpLock(contentKey); }

    // ── PROCESS ───────────────────────────────────────────────────────────────
    const displayName = rawBody.display_name || target.display_name ||
        rawBody.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ||
        target.name || target.pushname || null;

    const botResponse = processHealthcareMessage(senderPhone, messageText, payloadData);
    addLiveWhatsAppMessage(senderPhone, messageText || payloadData || 'Selection', botResponse.text, displayName);

    // ── SEND 200 EARLY — before dispatch ──────────────────────────────────────
    // GoShort gets acknowledged in <100ms → will NOT fire a retry webhook.
    // We remain inside this async handler function after res.json(), so Vercel
    // keeps the Lambda alive until the handler's Promise resolves (after dispatch).
    res.status(200).json({ status: 'accepted' });

    // ── DISPATCH — handler still running, Lambda stays alive ─────────────────
    try {
        console.log(`[Webhook] Dispatching reply to ${senderPhone}...`);
        const result = await sendWhatsAppMessage(senderPhone, botResponse);
        console.log(`[Webhook Dispatch Result]:`, JSON.stringify(result));
    } catch (err) {
        console.error('[Webhook Dispatch Error]:', err.message);
    }
    // Handler returns here → Lambda terminates cleanly
});

export default router;
