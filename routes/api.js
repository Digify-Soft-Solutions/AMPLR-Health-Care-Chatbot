import express from 'express';
import { 
    getServicesFromDB, 
    updateServiceInDB, 
    addServiceToDB, 
    deleteServiceFromDB,
    getStaffFromDB,
    getInquiriesFromDB,
    getBookingsFromDB,
    addBookingToDB,
    updateBookingInDB,
    deleteBookingFromDB,
    getDashboardStatsFromDB
} from '../services/supabaseService.js';
import { processHealthcareMessage } from '../services/healthcareEngine.js';
import { generateBookingPDF } from '../services/pdfGenerator.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { CONVERSATION_STATES, EMERGENCY_ALERTS, clearEmergencyAlert } from '../data/mockDatabase.js';
import { checkAndSendAppointmentReminders, triggerManualReminder } from '../services/reminderService.js';

const router = express.Router();

// ── BOOKINGS PIPELINE ────────────────────────────────────────────────────────
router.get('/bookings', async (req, res) => {
    try {
        const bookings = await getBookingsFromDB();
        res.json({ bookings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { status, staffId } = req.body;
    try {
        const updated = await updateBookingInDB(id, status, staffId);
        if (updated) {
            const patientPhone = updated.patientPhone || updated.phone;

            // 1. Staff Assigned Alert
            if (staffId && updated.assignedStaff && patientPhone) {
                const staffAlert = `🏥 *AMPLR HEALTH - Specialist Assigned!* 👩‍⚕️\n----------------------------------------\nHello *${updated.patientName || 'Patient'}*,\n\nYour healthcare specialist has been successfully allocated:\n\n👤 *Specialist*: *${updated.assignedStaff.name}*\n📞 *Direct Phone*: *${updated.assignedStaff.phone}*\n🩺 *Service*: ${updated.serviceName}\n📅 *Appointment*: ${updated.date} (${updated.slot})\n\nOur team member will contact you shortly and arrive at your scheduled time. For queries, call our 24/7 Helpline: *7997888448*.\n----------------------------------------\n_AMPLR HEALTH – Brings Hospital Care to Your Home_`;
                console.log(`[Staff Assigned Alert] 📲 Sending WhatsApp alert to ${patientPhone} for ${updated.assignedStaff.name}...`);
                sendWhatsAppMessage(patientPhone, staffAlert).then(() => {
                    console.log(`[Staff Assigned Alert] ✅ Delivered successfully to ${patientPhone}`);
                }).catch(e => console.warn('[Staff Alert Error]:', e.message));
            }

            // 2. On The Way Alert
            if (status === 'On the way' && patientPhone) {
                const staffName = updated.assignedStaff ? updated.assignedStaff.name : 'Healthcare Specialist';
                const staffPhone = updated.assignedStaff ? updated.assignedStaff.phone : '7997888448';
                const onTheWayAlert = `🚗 *AMPLR HEALTH - Specialist is On The Way!* 👩‍⚕️\n----------------------------------------\nHello *${updated.patientName || 'Patient'}*,\n\nYour assigned specialist *${staffName}* has departed and is now on the way to your doorstep for *${updated.serviceName}*.\n\n📞 Specialist Phone: *${staffPhone}*\n⏰ Appointment Slot: *${updated.slot || 'Scheduled'}*\n\nPlease be available at your location.\n----------------------------------------\n_AMPLR HEALTH – Brings Hospital Care to Your Home_`;
                console.log(`[On The Way Alert] 📲 Sending WhatsApp alert to ${patientPhone}...`);
                sendWhatsAppMessage(patientPhone, onTheWayAlert).catch(e => console.warn('[On The Way Alert Error]:', e.message));
            }

            // 3. Post-Service Feedback Loop Trigger
            if (status === 'Completed' && patientPhone) {
                const staffName = updated.assignedStaff ? updated.assignedStaff.name : 'our specialist';
                const feedbackPrompt = `🏥 *AMPLR HEALTH - Service Completed* ✅\n----------------------------------------\nHello *${updated.patientName || 'Patient'}*,\n\nYour appointment for *${updated.serviceName}* has been completed!\n\nHow was your experience with *${staffName}* today?\n\n1️⃣ 😊 *Happy* – Great service, highly satisfied!\n2️⃣ 🙁 *Unhappy* – Need improvement / feedback\n\n----------------------------------------\n📲 *Reply with 1 or 2 to share your feedback.*`;
                console.log(`[Service Completed Alert] 📲 Sending feedback survey to ${patientPhone}...`);
                sendWhatsAppMessage(patientPhone, feedbackPrompt).catch(e => console.warn('[Feedback Prompt Error]:', e.message));

                const cleanPhone = (patientPhone || '').toString().replace(/\D/g, '');
                CONVERSATION_STATES[cleanPhone] = {
                    step: 'POST_SERVICE_FEEDBACK',
                    bookingId: id,
                    patientName: updated.patientName,
                    staffName: staffName
                };
            }

            return res.json({ success: true, booking: updated });
        }
        return res.status(404).json({ error: 'Booking not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/bookings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await deleteBookingFromDB(id);
        res.json({ success: true, message: `Booking ${id} deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── INQUIRIES & LIVE MESSAGES ────────────────────────────────────────────────
router.get('/messages', async (req, res) => {
    try {
        const inquiries = await getInquiriesFromDB();
        const formatted = inquiries.map(inq => {
            const msg = (inq.user_message || '').toLowerCase();
            const status = (inq.status || '').toLowerCase();
            const name = (inq.sender_name || '').toLowerCase();
            const isPartner = (inq.id && inq.id.startsWith('PTR-')) ||
                status.includes('partner') ||
                status.includes('ptr-') ||
                name.includes('[partner]') ||
                name.includes('partner') ||
                msg.startsWith('partner application') ||
                msg.includes('partner onboarding') ||
                msg.includes('partner registration') ||
                msg.includes('partner');

            return {
                id: inq.id,
                phone: inq.phone,
                senderName: inq.sender_name,
                userMessage: inq.user_message,
                botReplyText: inq.bot_reply_text,
                timestamp: new Date(inq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: inq.status || 'Auto Replied',
                leadType: isPartner ? 'PARTNER' : 'CUSTOMER'
            };
        });
        res.json({ messages: formatted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── STAFF DIRECTORY ──────────────────────────────────────────────────────────
router.get('/staff', async (req, res) => {
    try {
        const staff = await getStaffFromDB();
        res.json({ staff });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── SERVICES & PRICING TARIFF ────────────────────────────────────────────────
router.get('/services', async (req, res) => {
    try {
        const services = await getServicesFromDB();
        res.json({ services });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/services/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const updated = await updateServiceInDB(id, req.body);
        if (updated) {
            return res.json({ success: true, service: updated });
        }
        return res.status(404).json({ error: 'Service not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/services', async (req, res) => {
    try {
        const created = await addServiceToDB(req.body);
        if (created) {
            return res.status(201).json({ success: true, service: created });
        }
        return res.status(400).json({ error: 'Failed to create service' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/services/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await deleteServiceFromDB(id);
        if (deleted) {
            return res.json({ success: true, service: deleted });
        }
        return res.status(404).json({ error: 'Service not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── EMERGENCY ESCALATIONS ────────────────────────────────────────────────────
router.get('/emergency', (req, res) => {
    res.json({ alerts: EMERGENCY_ALERTS });
});

router.post('/emergency/clear', (req, res) => {
    const { id } = req.body || {};
    clearEmergencyAlert(id || 'all');
    res.json({ success: true, alerts: EMERGENCY_ALERTS });
});

router.delete('/emergency/:id', (req, res) => {
    const { id } = req.params;
    clearEmergencyAlert(id);
    res.json({ success: true, alerts: EMERGENCY_ALERTS });
});

// ── AUTOMATED REMINDERS PIPELINE ─────────────────────────────────────────────
router.post('/reminders/check', async (req, res) => {
    try {
        await checkAndSendAppointmentReminders();
        res.json({ success: true, message: 'Automated reminder runner executed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/bookings/:id/remind', async (req, res) => {
    const { id } = req.params;
    const { type } = req.body || {};
    try {
        const ok = await triggerManualReminder(id, type || '24h');
        res.json({ success: ok, reminderType: type || '24h' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DASHBOARD KPI METRICS (Clean Live Supabase Data) ─────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const stats = await getDashboardStatsFromDB();
        res.json({ stats });
    } catch (err) {
        res.status(500).json({ 
            stats: {
                totalEnquiries: 0,
                todaysBookings: 0,
                pendingAssignment: 0,
                assigned: 0,
                onTheWay: 0,
                completed: 0,
                totalRevenue: 0,
                emergencyAlertsCount: 0
            }
        });
    }
});

// ── DOWNLOAD PDF INVOICE / RECEIPT ──────────────────────────────────────────
router.get('/bookings/:id/invoice', async (req, res) => {
    const { id } = req.params;
    try {
        const bookings = await getBookingsFromDB();
        const booking = bookings.find(b => b.id === id) || bookings[0];

        if (!booking) {
            return res.status(404).json({ error: 'No booking found to generate invoice' });
        }

        const pdfBuffer = await generateBookingPDF(booking);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Invoice_${booking.id}.pdf"`);
        res.send(pdfBuffer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate PDF invoice', details: err.message });
    }
});

// ── SIMULATED WHATSAPP CHAT TRIGGER ──────────────────────────────────────────
router.post('/simulate-chat', async (req, res) => {
    const { phone, message, payload } = req.body;
    const testPhone = phone || '919876543210';
    const testMessage = message || 'Hi';

    try {
        const botResponse = processHealthcareMessage(testPhone, testMessage, payload);
        res.json({
            success: true,
            userMessage: testMessage,
            botReply: botResponse,
            state: CONVERSATION_STATES[testPhone] || null
        });
    } catch (err) {
        res.status(500).json({ error: 'Simulation failed', details: err.message });
    }
});

export default router;
