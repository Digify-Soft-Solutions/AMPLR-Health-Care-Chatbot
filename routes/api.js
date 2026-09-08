import express from 'express';
import axios from 'axios';
import { getBookings, updateBookingStatus, STAFF_POOL, EMERGENCY_ALERTS, SERVICES, getLiveMessages, addLiveWhatsAppMessage, CONVERSATION_STATES } from '../data/mockDatabase.js';
import { processHealthcareMessage } from '../services/healthcareEngine.js';
import { generateBookingPDF } from '../services/pdfGenerator.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

const router = express.Router();
const RENDER_LIVE_URL = process.env.RENDER_EXTERNAL_URL || 'https://health-care-chat-bot-4yki.onrender.com';

// Helper to check if running in Render environment
const isRender = !!process.env.RENDER;

// Get all bookings (always fetch live from Render if running locally)
router.get('/bookings', async (req, res) => {
    let localBookings = getBookings();
    if (!isRender) {
        try {
            const remoteRes = await axios.get(`${RENDER_LIVE_URL}/api/bookings`, { timeout: 4000 });
            if (remoteRes.data && Array.isArray(remoteRes.data.bookings)) {
                // Combine remote live bookings with local bookings (deduplicating by ID)
                const map = new Map();
                remoteRes.data.bookings.forEach(b => map.set(b.id, b));
                localBookings.forEach(b => map.set(b.id, b));
                return res.json({ bookings: Array.from(map.values()) });
            }
        } catch (e) {
            console.error('[Live Sync Bookings Error]:', e.message);
        }
    }
    res.json({ bookings: localBookings });
});

// Get live WhatsApp message feed (always fetch live from Render if running locally)
router.get('/messages', async (req, res) => {
    let localMessages = getLiveMessages();
    if (!isRender) {
        try {
            const remoteRes = await axios.get(`${RENDER_LIVE_URL}/api/messages`, { timeout: 4000 });
            if (remoteRes.data && Array.isArray(remoteRes.data.messages)) {
                // Combine remote live messages with local messages (deduplicating by ID)
                const map = new Map();
                remoteRes.data.messages.forEach(m => map.set(m.id, m));
                localMessages.forEach(m => map.set(m.id, m));
                return res.json({ messages: Array.from(map.values()) });
            }
        } catch (e) {
            console.error('[Live Sync Messages Error]:', e.message);
        }
    }
    res.json({ messages: localMessages });
});

// Update booking status / staff
router.put('/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { status, staffId } = req.body;
    const updated = updateBookingStatus(id, status, staffId);

    if (!isRender) {
        try {
            await axios.put(`${RENDER_LIVE_URL}/api/bookings/${id}`, { status, staffId }, { timeout: 4000 });
        } catch (e) {}
    }

    if (updated) {
        return res.json({ success: true, booking: updated });
    }
    return res.status(404).json({ error: 'Booking not found' });
});

// Get staff pool
router.get('/staff', (req, res) => {
    res.json({ staff: STAFF_POOL });
});

// Get services list
router.get('/services', (req, res) => {
    res.json({ services: SERVICES });
});

// Get emergency alerts (always fetch live from Render if running locally)
router.get('/emergency', async (req, res) => {
    let localAlerts = EMERGENCY_ALERTS;
    if (!isRender) {
        try {
            const remoteRes = await axios.get(`${RENDER_LIVE_URL}/api/emergency`, { timeout: 4000 });
            if (remoteRes.data && Array.isArray(remoteRes.data.alerts)) {
                const map = new Map();
                remoteRes.data.alerts.forEach(a => map.set(a.id, a));
                localAlerts.forEach(a => map.set(a.id, a));
                return res.json({ alerts: Array.from(map.values()) });
            }
        } catch (e) {}
    }
    res.json({ alerts: localAlerts });
});

// Get Dashboard KPI Metrics (always fetch live from Render if running locally)
router.get('/stats', async (req, res) => {
    let localMessages = getLiveMessages();
    let localBookings = getBookings();

    if (!isRender) {
        try {
            const remoteRes = await axios.get(`${RENDER_LIVE_URL}/api/stats`, { timeout: 4000 });
            if (remoteRes.data && remoteRes.data.stats) {
                return res.json({ stats: remoteRes.data.stats });
            }
        } catch (e) {}
    }

    const stats = {
        totalEnquiries: localMessages.length,
        todaysBookings: localBookings.length,
        pendingAssignment: localBookings.filter(b => b.status === 'Pending Assignment').length,
        assigned: localBookings.filter(b => b.status === 'Assigned').length,
        onTheWay: localBookings.filter(b => b.status === 'On the way').length,
        completed: localBookings.filter(b => b.status === 'Completed').length,
        totalRevenue: localBookings.reduce((sum, b) => sum + (b.amount || 0), 0),
        emergencyAlertsCount: EMERGENCY_ALERTS.length
    };
    res.json({ stats });
});

// Download PDF Invoice / Receipt
router.get('/bookings/:id/invoice', async (req, res) => {
    const { id } = req.params;
    const bookings = getBookings();
    const booking = bookings.find(b => b.id === id) || bookings[0];

    try {
        const pdfBuffer = await generateBookingPDF(booking);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Invoice_${booking.id}.pdf"`);
        res.send(pdfBuffer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate PDF invoice', details: err.message });
    }
});

// Simulated WhatsApp Chat trigger for testing from dashboard
router.post('/simulate-chat', async (req, res) => {
    const { phone, message, payload } = req.body;
    const userPhone = phone || '918233816674';

    const botReply = processHealthcareMessage(userPhone, message, payload);
    const newMsg = addLiveWhatsAppMessage(userPhone, message, botReply.text, 'Patient (Test)');

    if (!isRender) {
        try {
            await axios.post(`${RENDER_LIVE_URL}/api/simulate-chat`, {
                phone: userPhone,
                message,
                payload
            }, { timeout: 4000 });
        } catch (e) {}
    }

    res.json({
        success: true,
        userMessage: message,
        botReply
    });
});

// Get current slot booking info for webview
router.get('/slot-info', (req, res) => {
    let phone = (req.query.phone || '').toString().replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const state = CONVERSATION_STATES[phone];

    if (!state || !state.data) {
        return res.json({
            patientName: 'Valued Patient',
            serviceName: 'Healthcare Service',
            fee: 800
        });
    }

    const serviceName = state.data.selectedSubService || state.data.selectedService || 'Home Healthcare Service';
    res.json({
        patientName: state.data.patientName || 'Patient',
        serviceName: serviceName,
        fee: state.data.fee || 800,
        lang: state.lang || 'en'
    });
});

// Confirm appointment slot from Interactive Calendar & Clock Webview
router.post('/confirm-slot', async (req, res) => {
    let { phone, date, timeSlot } = req.body;
    let cleanPhone = (phone || '').toString().replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    if (!cleanPhone || !date || !timeSlot) {
        return res.status(400).json({ error: 'Missing phone, date, or timeSlot' });
    }

    if (!CONVERSATION_STATES[cleanPhone]) {
        CONVERSATION_STATES[cleanPhone] = { step: 'CAPTURE_HOUSE_ADDRESS', lang: 'en', data: {} };
    }

    const state = CONVERSATION_STATES[cleanPhone];
    state.data.appointmentDate = date;
    state.data.timeSlot = timeSlot;
    state.data.timeSlotLabel = timeSlot;
    state.step = 'CAPTURE_HOUSE_ADDRESS';

    // Outbound WhatsApp confirmation message
    const isTelugu = state.lang === 'te';
    const whatsappText = isTelugu
        ? `✅ *క్యాలెండర్ ద్వారా స్లాట్ నిర్ధారించబడింది!*\n----------------------------------------\n📅 *తేదీ*: *${date}*\n⏰ *సమయం*: *${timeSlot} (IST)*\n----------------------------------------\n🏠 *దశ 4/5: ఇంటి చిరునామా*\n\nదయచేసి మీ ఇంటి నంబర్, అపార్ట్‌మెంట్ పేరు & వీధి/ప్రాంతం నమోదు చేయండి:\n(ఉదా: *Flat 204, Royal Palms, Banjara Hills*)`
        : `✅ *APPOINTMENT SLOT CONFIRMED VIA CALENDAR!*\n----------------------------------------\n📅 *Date*: *${date}*\n⏰ *Time*: *${timeSlot} (IST)*\n----------------------------------------\n🏠 *STEP 4 OF 5: HOME / FLAT ADDRESS*\n\nPlease enter House/Flat No., Building Name & Street/Area:\n(e.g. *Flat 204, Royal Palms Apartment, Tonk Road*)`;

    // Also sync to Render if local
    if (!isRender) {
        try {
            await axios.post(`${RENDER_LIVE_URL}/api/confirm-slot`, { phone: cleanPhone, date, timeSlot }, { timeout: 4000 });
        } catch (e) {}
    }

    try {
        await sendWhatsAppMessage(cleanPhone, { type: 'TEXT', text: whatsappText });
    } catch (e) {
        console.error('[Confirm Slot WhatsApp Notification Error]:', e.message);
    }

    res.json({
        success: true,
        date,
        timeSlot,
        nextStep: 'CAPTURE_HOUSE_ADDRESS'
    });
});

export default router;
