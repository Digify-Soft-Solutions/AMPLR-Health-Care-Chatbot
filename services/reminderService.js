import { getBookingsFromDB } from './supabaseService.js';
import { sendWhatsAppMessage } from './whatsappService.js';
import { BOOKINGS, saveDB } from '../data/mockDatabase.js';
import { supabase } from './supabaseClient.js';

const HELPLINE = process.env.BOT_PHONE_NUMBER || process.env.ADMIN_PHONE || '9849649049';

/**
 * Parse appointment date and time slot into a JavaScript Date object in IST
 */
export function parseAppointmentTime(dateStr, slotStr) {
    let year, month, day;
    const now = new Date();

    if (!dateStr || dateStr.toLowerCase().includes('today') || dateStr.includes('ఈరోజు')) {
        year = now.getFullYear();
        month = now.getMonth();
        day = now.getDate();
    } else if (dateStr.toLowerCase().includes('tomorrow') || dateStr.includes('రేపు')) {
        const t = new Date(Date.now() + 86400000);
        year = t.getFullYear();
        month = t.getMonth();
        day = t.getDate();
    } else {
        const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        const yyyymmdd = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (ddmmyyyy) {
            day = parseInt(ddmmyyyy[1], 10);
            month = parseInt(ddmmyyyy[2], 10) - 1;
            year = parseInt(ddmmyyyy[3], 10);
        } else if (yyyymmdd) {
            year = parseInt(yyyymmdd[1], 10);
            month = parseInt(yyyymmdd[2], 10) - 1;
            day = parseInt(yyyymmdd[3], 10);
        } else {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
                year = parsed.getFullYear();
                month = parsed.getMonth();
                day = parsed.getDate();
            } else {
                year = now.getFullYear();
                month = now.getMonth();
                day = now.getDate();
            }
        }
    }

    let hour = 9, minute = 0;
    const timeMatch = (slotStr || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
        hour = parseInt(timeMatch[1], 10);
        minute = parseInt(timeMatch[2], 10);
        const ampm = (timeMatch[3] || '').toUpperCase();
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
    } else if (/midday|11/i.test(slotStr)) {
        hour = 11;
    } else if (/afternoon|02|2/i.test(slotStr)) {
        hour = 14;
    } else if (/evening|05|5/i.test(slotStr)) {
        hour = 17;
    } else if (/night|08|8/i.test(slotStr)) {
        hour = 20;
    }

    return new Date(year, month, day, hour, minute);
}

/**
 * Mark a reminder as dispatched in both local cache and Supabase
 */
export async function markReminderSent(bookingId, reminderType) {
    const local = BOOKINGS.find(b => b.id === bookingId);
    if (local) {
        if (reminderType === '24h') local.reminder_24h_sent = true;
        if (reminderType === '2h') local.reminder_2h_sent = true;
        saveDB();
    }

    try {
        const { data } = await supabase.from('bookings').select('assigned_staff').eq('id', bookingId).single();
        const existingStaff = data?.assigned_staff || {};
        const updatedStaff = {
            ...existingStaff,
            ...(reminderType === '24h' ? { reminder_24h_sent: true } : {}),
            ...(reminderType === '2h' ? { reminder_2h_sent: true } : {})
        };
        await supabase.from('bookings').update({ assigned_staff: updatedStaff }).eq('id', bookingId);
    } catch (err) {
        console.warn(`[Reminder Sync Error] Could not update Supabase for ${bookingId}:`, err.message);
    }
}

/**
 * Send 24-Hour WhatsApp Reminder to patient
 */
export async function send24HourReminder(booking) {
    const phone = booking.patientPhone || booking.phone;
    if (!phone) return false;

    const staffText = booking.assignedStaff
        ? `👩‍⚕️ *Assigned Specialist*: *${booking.assignedStaff.name}* (📞 +${booking.assignedStaff.phone})`
        : `👩‍⚕️ *Specialist*: Healthcare professional is being assigned to your locality`;

    const message = `⏰ *AMPLR HEALTH - 24-Hour Appointment Reminder* 🏥\n----------------------------------------\nHello *${booking.patientName || 'Patient'}*,\n\nThis is a gentle reminder that your home healthcare visit is scheduled for *tomorrow*:\n\n🩺 *Service*: ${booking.serviceName}\n📅 *Date*: ${booking.date || 'Tomorrow'}\n⏰ *Time Slot*: ${booking.slot || 'Scheduled Slot'}\n📍 *Address*: ${booking.address || 'Your Registered Location'}\n${staffText}\n\nOur specialist will arrive promptly during your designated slot.\n📞 24/7 Helpline & Support: *${HELPLINE}*\n----------------------------------------\n_AMPLR HEALTH – Brings Hospital Care to Your Home_`;

    console.log(`[Reminder Service] 📲 Dispatching 24-Hour Reminder to ${phone} for booking ${booking.id}...`);
    try {
        await sendWhatsAppMessage(phone, message);
        await markReminderSent(booking.id, '24h');
        console.log(`[Reminder Service] ✅ 24-Hour Reminder dispatched successfully to ${phone}`);
        return true;
    } catch (err) {
        console.error(`[Reminder Service Error] Failed to send 24h reminder to ${phone}:`, err.message);
        return false;
    }
}

/**
 * Send 2-Hour WhatsApp Reminder to patient
 */
export async function send2HourReminder(booking) {
    const phone = booking.patientPhone || booking.phone;
    if (!phone) return false;

    const staffText = booking.assignedStaff
        ? `👩‍⚕️ *Specialist*: *${booking.assignedStaff.name}*\n📞 *Direct Phone*: *+${booking.assignedStaff.phone}*`
        : `👩‍⚕️ *Specialist*: On schedule to arrive`;

    const message = `⏰ *AMPLR HEALTH - 2-Hour Arrival Notice* 🚗\n----------------------------------------\nHello *${booking.patientName || 'Patient'}*,\n\nYour healthcare visit is coming up in approximately *2 hours*:\n\n🩺 *Service*: ${booking.serviceName}\n⏰ *Appointment Slot*: ${booking.slot || 'Upcoming Slot'}\n📍 *Address*: ${booking.address || 'Your Location'}\n${staffText}\n\nPlease ensure you or a caregiver are available at the premise.\n📞 Helpline: *${HELPLINE}*\n----------------------------------------\n_AMPLR HEALTH – Brings Hospital Care to Your Home_`;

    console.log(`[Reminder Service] 📲 Dispatching 2-Hour Reminder to ${phone} for booking ${booking.id}...`);
    try {
        await sendWhatsAppMessage(phone, message);
        await markReminderSent(booking.id, '2h');
        console.log(`[Reminder Service] ✅ 2-Hour Reminder dispatched successfully to ${phone}`);
        return true;
    } catch (err) {
        console.error(`[Reminder Service Error] Failed to send 2h reminder to ${phone}:`, err.message);
        return false;
    }
}

/**
 * Background Engine: Scans all active bookings and dispatches due reminders
 */
export async function checkAndSendAppointmentReminders() {
    try {
        const bookings = await getBookingsFromDB();
        const now = Date.now();
        let sent24Count = 0;
        let sent2Count = 0;

        for (const b of bookings) {
            // Only process active bookings
            if (b.status === 'Completed' || b.status === 'Cancelled') continue;

            const is24Sent = b.reminder24hSent || b.reminder_24h_sent || b.assignedStaff?.reminder_24h_sent;
            const is2Sent = b.reminder2hSent || b.reminder_2h_sent || b.assignedStaff?.reminder_2h_sent;

            const apptDate = parseAppointmentTime(b.date, b.slot);
            const diffMs = apptDate.getTime() - now;
            const diffHours = diffMs / (1000 * 60 * 60);

            // 1. Check 24-Hour window (18 to 26 hours prior)
            if (!is24Sent && diffHours <= 26 && diffHours >= 18) {
                const ok = await send24HourReminder(b);
                if (ok) sent24Count++;
            }

            // 2. Check 2-Hour window (0.1 to 2.5 hours prior)
            if (!is2Sent && diffHours <= 2.5 && diffHours >= 0.1) {
                const ok = await send2HourReminder(b);
                if (ok) sent2Count++;
            }
        }

        if (sent24Count > 0 || sent2Count > 0) {
            console.log(`[Reminder Runner] 📊 Reminders summary: ${sent24Count} 24h sent, ${sent2Count} 2h sent.`);
        }
    } catch (err) {
        console.error('[Reminder Runner Error]:', err.message);
    }
}

/**
 * Manual Trigger for Admin Dashboard
 */
export async function triggerManualReminder(bookingId, type = '24h') {
    const bookings = await getBookingsFromDB();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
    }

    if (type === '2h') {
        return await send2HourReminder(booking);
    } else {
        return await send24HourReminder(booking);
    }
}
