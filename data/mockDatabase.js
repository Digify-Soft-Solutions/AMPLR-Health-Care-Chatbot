import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../services/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = process.env.VERCEL ? '/tmp/live_db.json' : path.join(__dirname, 'live_db.json');

export const DEFAULT_SERVICES = [
    {
        id: '1',
        name: 'Nursing Services at Home',
        category: 'nursing',
        code: 'NURSE',
        icon: 'Stethoscope',
        basePrice: 800,
        priceDescription: '₹800 per visit / ₹1,500 for 12-hour shift',
        slots: ['09:00 AM', '11:00 AM', '02:00 PM', '05:00 PM', '08:00 PM'],
        description: 'Dressing, Injections, IV Infusion, Wound Care, Post-surgery Nursing.',
        active: true
    },
    {
        id: '2',
        name: 'Caregiver / Caretaker at Home',
        category: 'caretaker',
        code: 'CARE',
        icon: 'UserCheck',
        basePrice: 1200,
        priceDescription: '₹1,200 / day (12 Hours) / ₹2,000 (24 Hours)',
        slots: ['08:00 AM Start', '08:00 PM Start (Night)', '24 Hours Shift'],
        description: 'Elderly assistance, Hygiene care, Feeding support, Mobility aid.',
        active: true
    },
    {
        id: '3',
        name: 'Physiotherapy at Home',
        category: 'physio',
        code: 'PHYSIO',
        icon: 'Activity',
        basePrice: 900,
        priceDescription: '₹900 per 45-min session',
        slots: ['09:00 AM', '11:00 AM', '03:00 PM', '06:00 PM'],
        description: 'Stroke rehab, Joint pain, Post-fracture therapy, Back pain relief.',
        active: true
    },
    {
        id: '4',
        name: 'Lab - Blood Collection at Home',
        category: 'lab',
        code: 'LAB',
        icon: 'FlaskConical',
        basePrice: 500,
        priceDescription: 'Starting from ₹500 (Free home collection above ₹800)',
        slots: ['07:00 AM (Fasting)', '08:30 AM', '10:00 AM', '04:00 PM'],
        description: 'CBC, Diabetes Profile, Thyroid, Lipid, Blood Sugar, Full Body Checkup.',
        active: true
    },
    {
        id: '5',
        name: 'ECG at Home',
        category: 'ecg',
        code: 'ECG',
        icon: 'HeartPulse',
        basePrice: 1100,
        priceDescription: '₹1,100 per test with instant report',
        slots: ['08:00 AM', '10:30 AM', '02:00 PM', '05:30 PM'],
        description: '12-Lead Digital ECG conducted at your doorstep by trained technician.',
        active: true
    },
    {
        id: '6',
        name: 'Doctor Consultation (Specialist)',
        category: 'doctor',
        code: 'DOC',
        icon: 'Stethoscope',
        basePrice: 499,
        priceDescription: '₹299 to ₹799 based on medical specialty',
        slots: ['10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM'],
        description: 'Dermatology, Cardiology, Orthopedics, Oncology, General Medicine.',
        active: true
    },
    {
        id: '7',
        name: 'Ambulance Services (24/7)',
        category: 'ambulance',
        code: 'AMB',
        icon: 'Truck',
        basePrice: 1400,
        priceDescription: 'Starting from ₹1,400 (Omni/Toofan) to ₹1,800 (Tempo)',
        slots: ['24/7 Immediate Dispatch', 'Scheduled Patient Transport'],
        description: 'Basic Life Support (BLS) & Advance Cardiac Life Support (ACLS) Ambulances.',
        active: true
    },
    {
        id: '8',
        name: 'Hospital / Clinic Referral',
        category: 'hospital',
        code: 'HOSP',
        icon: 'Activity',
        basePrice: 0,
        priceDescription: 'Free Consultation & Admission Assistance',
        slots: ['24/7 Support'],
        description: 'Direct partner hospital beds, cashless admission help, OPD booking.',
        active: true
    },
    {
        id: '9',
        name: 'Medicine Delivery at Home',
        category: 'pharmacy',
        code: 'MED',
        icon: 'Pill',
        basePrice: 0,
        priceDescription: 'Free Prescription Upload & Doorstep Delivery',
        slots: ['Express Delivery (2-4 Hrs)', 'Same Day Delivery', 'Scheduled Morning'],
        description: 'Doorstep delivery of genuine prescribed medicines, surgical items, and healthcare consumables.',
        active: true
    }
];

export const STAFF_POOL = [
    { id: 'STF-101', name: 'Sister Anitha Sharma', role: 'Senior Staff Nurse', category: 'nursing', phone: '+91 98765 43210', rating: 4.9, available: true, location: '302001' },
    { id: 'STF-102', name: 'Dr. Rahul Verma (PT)', role: 'Senior Physiotherapist', category: 'physio', phone: '+91 98765 43211', rating: 4.8, available: true, location: '302012' },
    { id: 'STF-103', name: 'Ramesh Choudhary', role: 'Certified Caretaker', category: 'caretaker', phone: '+91 98765 43212', rating: 4.7, available: true, location: '302015' },
    { id: 'STF-104', name: 'Suresh Kumar', role: 'Lab Phlebotomist', category: 'lab', phone: '+91 98765 43213', rating: 4.9, available: true, location: '302004' },
    { id: 'STF-105', name: 'Priya Nair', role: 'ECG Specialist', category: 'ecg', phone: '+91 98765 43214', rating: 4.8, available: true, location: '302018' },
];

function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            const data = JSON.parse(raw);
            return {
                bookings: Array.isArray(data.bookings) ? data.bookings : [],
                emergencyAlerts: Array.isArray(data.emergencyAlerts) ? data.emergencyAlerts : [],
                liveMessages: Array.isArray(data.liveMessages) ? data.liveMessages : [],
                services: Array.isArray(data.services) && data.services.length > 0 ? data.services : DEFAULT_SERVICES
            };
        }
    } catch (e) {
        console.error('[DB Load Error]:', e.message);
    }
    return { bookings: [], emergencyAlerts: [], liveMessages: [], services: DEFAULT_SERVICES };
}

export function saveDB() {
    try {
        const data = {
            bookings: BOOKINGS,
            emergencyAlerts: EMERGENCY_ALERTS,
            liveMessages: LIVE_WHATSAPP_MESSAGES,
            services: SERVICES
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('[DB Save Error]:', e.message);
    }
}

const initialDB = loadDB();
export let BOOKINGS = initialDB.bookings;
export let EMERGENCY_ALERTS = initialDB.emergencyAlerts;
export let LIVE_WHATSAPP_MESSAGES = initialDB.liveMessages;
export let SERVICES = initialDB.services;

export const CONVERSATION_STATES = {};

export function getBookings() {
    return BOOKINGS;
}

export function getLiveMessages() {
    return LIVE_WHATSAPP_MESSAGES;
}

export function getServices() {
    return SERVICES;
}

export function updateService(id, updatedFields) {
    const idx = SERVICES.findIndex(s => s.id === id.toString());
    if (idx !== -1) {
        SERVICES[idx] = { 
            ...SERVICES[idx], 
            ...updatedFields,
            basePrice: updatedFields.basePrice !== undefined ? Number(updatedFields.basePrice) : SERVICES[idx].basePrice
        };
        saveDB();
        return SERVICES[idx];
    }
    return null;
}

export function addService(newService) {
    const service = {
        id: (SERVICES.length + 1).toString(),
        name: newService.name || 'New Health Service',
        category: newService.category || 'general',
        code: (newService.name || 'SERV').substring(0, 5).toUpperCase(),
        icon: newService.icon || 'Activity',
        basePrice: Number(newService.basePrice) || 500,
        priceDescription: newService.priceDescription || `₹${newService.basePrice || 500} per visit`,
        slots: newService.slots || ['09:00 AM', '11:00 AM', '02:00 PM', '05:00 PM'],
        description: newService.description || '',
        active: newService.active !== false
    };
    SERVICES.push(service);
    saveDB();
    return service;
}

export function deleteService(id) {
    const idx = SERVICES.findIndex(s => s.id === id.toString());
    if (idx !== -1) {
        const deleted = SERVICES.splice(idx, 1)[0];
        saveDB();
        return deleted;
    }
    return null;
}

export function addLiveWhatsAppMessage(phone, userMessage, botReplyText, displayName = null, customStatus = null) {
    const rawDigits = (phone || '').toString().replace(/\D/g, '');
    const cleanPhone = rawDigits.length === 10 ? '91' + rawDigits : (rawDigits || phone || '').toString();
    const formattedName = displayName ? `${displayName} (${cleanPhone})` : `Patient (${cleanPhone || 'WhatsApp User'})`;
    const replyText = typeof botReplyText === 'string' ? botReplyText : (botReplyText ? botReplyText.text : 'Automated Reply Sent');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Check if inquiry already exists for this phone number in local memory
    const existingIndex = LIVE_WHATSAPP_MESSAGES.findIndex(m => {
        const p1 = (m.phone || '').toString().replace(/\D/g, '');
        return p1 && cleanPhone && (p1 === cleanPhone || p1.endsWith(cleanPhone) || cleanPhone.endsWith(p1));
    });

    let msgRecord;
    if (existingIndex !== -1) {
        // Update existing record with the latest conversation message
        msgRecord = LIVE_WHATSAPP_MESSAGES[existingIndex];
        msgRecord.userMessage = userMessage || msgRecord.userMessage;
        msgRecord.botReplyText = replyText;
        msgRecord.timestamp = timeStr;
        if (customStatus) msgRecord.status = customStatus;
        if (displayName) msgRecord.senderName = formattedName;
        // Move to top of the list as the most recent conversation
        LIVE_WHATSAPP_MESSAGES.splice(existingIndex, 1);
        LIVE_WHATSAPP_MESSAGES.unshift(msgRecord);
    } else {
        msgRecord = {
            id: `INQ-${cleanPhone || Math.floor(1000 + Math.random() * 9000)}`,
            phone: cleanPhone || '+91 WhatsApp Patient',
            senderName: formattedName,
            userMessage: userMessage || 'Message received',
            botReplyText: replyText,
            timestamp: timeStr,
            status: customStatus || 'Auto Replied (WhatsApp Cloud API)'
        };
        LIVE_WHATSAPP_MESSAGES.unshift(msgRecord);
        if (LIVE_WHATSAPP_MESSAGES.length > 100) {
            LIVE_WHATSAPP_MESSAGES.pop();
        }
    }
    saveDB();

    // Async sync to Supabase inquiries table (Strict 1 Inquiry per User/Phone)
    (async () => {
        try {
            const { data: existing, error: findError } = await supabase
                .from('inquiries')
                .select('id, phone')
                .or(`phone.eq.${cleanPhone},phone.eq.${rawDigits}`)
                .limit(1);

            if (existing && existing.length > 0) {
                // Update existing inquiry row for this user
                const { error: updateError } = await supabase
                    .from('inquiries')
                    .update({
                        sender_name: formattedName,
                        user_message: msgRecord.userMessage,
                        bot_reply_text: msgRecord.botReplyText,
                        status: msgRecord.status,
                        created_at: new Date().toISOString()
                    })
                    .eq('id', existing[0].id);

                if (updateError) console.warn('[Supabase Inquiry Update Warning]:', updateError.message);
                else console.log(`[Supabase Inquiry Updated]: ${existing[0].id} for ${cleanPhone}`);
            } else {
                // Insert new unique inquiry record
                const newId = `INQ-${cleanPhone || Date.now()}`;
                const { error: insertError } = await supabase
                    .from('inquiries')
                    .insert([{
                        id: newId,
                        phone: cleanPhone,
                        sender_name: formattedName,
                        user_message: msgRecord.userMessage,
                        bot_reply_text: msgRecord.botReplyText,
                        status: msgRecord.status,
                        created_at: new Date().toISOString()
                    }]);

                if (insertError) console.warn('[Supabase Inquiry Insert Warning]:', insertError.message);
                else console.log(`[Supabase Inquiry Created]: ${newId} for ${cleanPhone}`);
            }
        } catch (e) {
            console.warn('[Supabase Inquiry Sync Skip]:', e.message);
        }
    })();

    return msgRecord;
}

export function addBooking(bookingData) {
    const prefixMap = { '1': 'NS', '2': 'CT', '3': 'PH', '4': 'LB', '5': 'EC' };
    const prefix = prefixMap[bookingData.serviceId] || 'BK';
    const randomId = `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newBooking = {
        id: bookingData.id || randomId,
        ...bookingData,
        amount: bookingData.amount || 900,
        paymentStatus: bookingData.paymentStatus || 'Pending',
        status: bookingData.status || 'Pending Assignment',
        assignedStaff: null,
        createdAt: new Date().toISOString()
    };

    BOOKINGS.unshift(newBooking);
    saveDB();

    // Async sync to Supabase bookings table
    supabase.from('bookings').insert([{
        id: newBooking.id,
        patient_name: newBooking.patientName || newBooking.name || 'WhatsApp Patient',
        patient_phone: newBooking.phone || newBooking.patientPhone,
        service_id: (newBooking.serviceId || '1').toString(),
        service_name: newBooking.serviceName || 'Healthcare Consultation',
        service_code: newBooking.serviceCode || 'SERV',
        date: newBooking.date || new Date().toISOString().split('T')[0],
        slot: newBooking.slot || 'Morning Slot',
        address: newBooking.location || newBooking.address || '',
        amount: Number(newBooking.amount || 800),
        payment_status: newBooking.paymentStatus || 'Pending',
        status: newBooking.status || 'Pending Assignment',
        assigned_staff: null,
        created_at: newBooking.createdAt || new Date().toISOString()
    }]).then(({ error }) => {
        if (error) console.warn('[Supabase Booking Sync]:', error.message);
        else console.log(`[Supabase Booking Synced]: ${newBooking.id} (${newBooking.patientName})`);
    }).catch(e => console.warn('[Supabase Booking Error]:', e.message));

    return newBooking;
}

export function updateBookingStatus(id, newStatus, staffId = null) {
    const booking = BOOKINGS.find(b => b.id === id);
    if (booking) {
        if (newStatus) {
            booking.status = newStatus;
        }
        if (staffId) {
            const staff = STAFF_POOL.find(s => s.id === staffId);
            if (staff) {
                booking.assignedStaff = { id: staff.id, name: staff.name, phone: staff.phone };
            }
        }
        saveDB();

        // Async sync update to Supabase
        const updatePayload = {};
        if (newStatus) updatePayload.status = newStatus;
        if (booking.assignedStaff) updatePayload.assigned_staff = booking.assignedStaff;

        supabase.from('bookings').update(updatePayload).eq('id', id).then(({ error }) => {
            if (error) console.warn('[Supabase Booking Update]:', error.message);
        }).catch(e => {});

        return booking;
    }
    return null;
}

export function addEmergencyAlert(alert) {
    const newAlert = {
        id: `EMG-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        status: 'Urgent Clinical Escalation',
        ...alert
    };
    EMERGENCY_ALERTS.unshift(newAlert);
    saveDB();
    return newAlert;
}

export function clearEmergencyAlert(id = null) {
    if (!id || id === 'all') {
        EMERGENCY_ALERTS.length = 0;
    } else {
        const idx = EMERGENCY_ALERTS.findIndex(a => a.id === id);
        if (idx !== -1) EMERGENCY_ALERTS.splice(idx, 1);
    }
    saveDB();
    return true;
}

export function deleteBooking(id) {
    const idx = BOOKINGS.findIndex(b => b.id === id);
    if (idx !== -1) {
        BOOKINGS.splice(idx, 1);
        saveDB();
        return true;
    }
    return false;
}
