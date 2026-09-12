import { supabase } from './supabaseClient.js';
import { DEFAULT_SERVICES, STAFF_POOL, getBookings, getLiveMessages, BOOKINGS, LIVE_WHATSAPP_MESSAGES } from '../data/mockDatabase.js';

/**
 * 🏥 AMPLR Health - Supabase Realtime Database Service
 * Directly handles CRUD for Services, Staff, Bookings, and WhatsApp Inquiries
 */

// ── SERVICES ─────────────────────────────────────────────────────────────────
export async function getServicesFromDB() {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) throw error;
        if (data && data.length > 0) {
            return data.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                code: s.code,
                icon: s.icon,
                basePrice: Number(s.base_price),
                priceDescription: s.price_description,
                slots: Array.isArray(s.slots) ? s.slots : JSON.parse(s.slots || '[]'),
                description: s.description,
                active: s.active
            }));
        }
    } catch (err) {
        console.warn('[Supabase getServices error, using fallback]:', err.message);
    }
    return DEFAULT_SERVICES;
}

export async function updateServiceInDB(id, updatedFields) {
    try {
        const dbPayload = {};
        if (updatedFields.name !== undefined) dbPayload.name = updatedFields.name;
        if (updatedFields.category !== undefined) dbPayload.category = updatedFields.category;
        if (updatedFields.basePrice !== undefined) dbPayload.base_price = Number(updatedFields.basePrice);
        if (updatedFields.priceDescription !== undefined) dbPayload.price_description = updatedFields.priceDescription;
        if (updatedFields.description !== undefined) dbPayload.description = updatedFields.description;
        if (updatedFields.slots !== undefined) dbPayload.slots = updatedFields.slots;
        if (updatedFields.active !== undefined) dbPayload.active = updatedFields.active;

        const { data, error } = await supabase
            .from('services')
            .update(dbPayload)
            .eq('id', id.toString())
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            category: data.category,
            code: data.code,
            icon: data.icon,
            basePrice: Number(data.base_price),
            priceDescription: data.price_description,
            slots: Array.isArray(data.slots) ? data.slots : JSON.parse(data.slots || '[]'),
            description: data.description,
            active: data.active
        };
    } catch (err) {
        console.error('[Supabase updateService error]:', err.message);
        return null;
    }
}

export async function addServiceToDB(newService) {
    try {
        const id = Date.now().toString();
        const dbPayload = {
            id,
            name: newService.name || 'New Health Service',
            category: newService.category || 'general',
            code: (newService.name || 'SERV').substring(0, 5).toUpperCase(),
            icon: newService.icon || 'Activity',
            base_price: Number(newService.basePrice) || 500,
            price_description: newService.priceDescription || `₹${newService.basePrice || 500} per visit`,
            slots: newService.slots || ['09:00 AM', '11:00 AM', '02:00 PM', '05:00 PM'],
            description: newService.description || '',
            active: newService.active !== false
        };

        const { data, error } = await supabase
            .from('services')
            .insert([dbPayload])
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            category: data.category,
            code: data.code,
            icon: data.icon,
            basePrice: Number(data.base_price),
            priceDescription: data.price_description,
            slots: data.slots,
            description: data.description,
            active: data.active
        };
    } catch (err) {
        console.error('[Supabase addService error]:', err.message);
        return null;
    }
}

export async function deleteServiceFromDB(id) {
    try {
        const { data, error } = await supabase
            .from('services')
            .delete()
            .eq('id', id.toString())
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('[Supabase deleteService error]:', err.message);
        return null;
    }
}

// ── STAFF ────────────────────────────────────────────────────────────────────
export async function getStaffFromDB() {
    try {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) return data;
    } catch (err) {
        console.warn('[Supabase getStaff error, using fallback]:', err.message);
    }
    return STAFF_POOL;
}

// ── INQUIRIES (WhatsApp live inbound messages) ──────────────────────────────
export async function getInquiriesFromDB() {
    try {
        const { data, error } = await supabase
            .from('inquiries')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        if (Array.isArray(data)) return data;
    } catch (err) {
        console.warn('[Supabase getInquiries error, using fallback]:', err.message);
        return getLiveMessages();
    }
    return [];
}

export async function addInquiryToDB(phone, userMessage, botReplyText, senderName = null) {
    try {
        const cleanPhone = (phone || '').toString();
        const id = `INQ-${Date.now()}`;
        const row = {
            id,
            phone: cleanPhone || '+91 WhatsApp Patient',
            sender_name: senderName ? `${senderName} (${cleanPhone})` : `Patient (${cleanPhone})`,
            user_message: userMessage || 'Message received',
            bot_reply_text: typeof botReplyText === 'string' ? botReplyText : (botReplyText ? botReplyText.text : 'Automated Reply Sent'),
            status: 'NEW_LEAD',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('inquiries')
            .insert([row])
            .select();

        if (error) throw error;
        console.log(`[Supabase Inquiry Saved] ID: ${id} for ${cleanPhone}`);
        return data ? data[0] : row;
    } catch (err) {
        console.error('[Supabase addInquiry error]:', err.message);
        return null;
    }
}

// ── BOOKINGS (Patient Bookings Pipeline) ────────────────────────────────────
export async function getBookingsFromDB() {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (Array.isArray(data)) {
            return data.map(b => ({
                id: b.id,
                patientName: b.patient_name,
                patientPhone: b.patient_phone,
                serviceId: b.service_id,
                serviceName: b.service_name,
                serviceCode: b.service_code,
                date: b.date,
                slot: b.slot,
                address: b.address,
                amount: Number(b.amount || 0),
                paymentStatus: b.payment_status || 'Pending',
                status: b.status || 'Pending Assignment',
                assignedStaff: b.assigned_staff,
                invoiceUrl: b.invoice_url,
                invoiceId: b.invoice_id,
                createdAt: b.created_at
            }));
        }
    } catch (err) {
        console.warn('[Supabase getBookings error, using fallback]:', err.message);
        return getBookings();
    }
    return [];
}

export async function addBookingToDB(bookingData) {
    try {
        const prefixMap = { '1': 'NS', '2': 'CT', '3': 'PH', '4': 'LB', '5': 'EC' };
        const prefix = prefixMap[bookingData.serviceId] || 'BK';
        const id = `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;

        const row = {
            id,
            patient_name: bookingData.patientName || bookingData.name || 'WhatsApp Patient',
            patient_phone: bookingData.patientPhone || bookingData.phone,
            service_id: (bookingData.serviceId || '1').toString(),
            service_name: bookingData.serviceName || 'Healthcare Consultation',
            service_code: bookingData.serviceCode || 'SERV',
            date: bookingData.date || new Date().toISOString().split('T')[0],
            slot: bookingData.slot || 'Morning Slot',
            address: bookingData.address || '',
            amount: Number(bookingData.amount || 800),
            payment_status: bookingData.paymentStatus || 'Pending',
            status: 'Pending Assignment',
            assigned_staff: null,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('bookings')
            .insert([row])
            .select()
            .single();

        if (error) throw error;
        console.log(`[Supabase Booking Saved] ID: ${id}`);
        return {
            id: data.id,
            patientName: data.patient_name,
            patientPhone: data.patient_phone,
            serviceId: data.service_id,
            serviceName: data.service_name,
            serviceCode: data.service_code,
            date: data.date,
            slot: data.slot,
            address: data.address,
            amount: Number(data.amount),
            paymentStatus: data.payment_status,
            status: data.status,
            assignedStaff: data.assigned_staff,
            createdAt: data.created_at
        };
    } catch (err) {
        console.error('[Supabase addBooking error]:', err.message);
        return null;
    }
}

export async function updateBookingInDB(id, newStatus, staffId = null) {
    try {
        const updatePayload = {};
        if (newStatus) updatePayload.status = newStatus;

        if (staffId) {
            const staffList = await getStaffFromDB();
            const staff = staffList.find(s => s.id === staffId);
            if (staff) {
                updatePayload.assigned_staff = { id: staff.id, name: staff.name, phone: staff.phone };
            }
        }

        const { data, error } = await supabase
            .from('bookings')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            patientName: data.patient_name,
            patientPhone: data.patient_phone,
            serviceId: data.service_id,
            serviceName: data.service_name,
            serviceCode: data.service_code,
            date: data.date,
            slot: data.slot,
            address: data.address,
            amount: Number(data.amount),
            paymentStatus: data.payment_status,
            status: data.status,
            assignedStaff: data.assigned_staff,
            createdAt: data.created_at
        };
    } catch (err) {
        console.error('[Supabase updateBooking error]:', err.message);
        return null;
    }
}

// ── KPI STATS ────────────────────────────────────────────────────────────────
export async function getDashboardStatsFromDB() {
    try {
        const inquiries = await getInquiriesFromDB();
        const bookings = await getBookingsFromDB();

        return {
            totalEnquiries: inquiries.length,
            todaysBookings: bookings.length,
            pendingAssignment: bookings.filter(b => b.status === 'Pending Assignment' || b.status === 'PENDING_ASSIGNMENT').length,
            assigned: bookings.filter(b => b.status === 'Assigned' || b.status === 'ASSIGNED').length,
            onTheWay: bookings.filter(b => b.status === 'On the way' || b.status === 'ON_THE_WAY').length,
            completed: bookings.filter(b => b.status === 'Completed' || b.status === 'COMPLETED').length,
            totalRevenue: bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
            emergencyAlertsCount: 0
        };
    } catch (err) {
        console.error('[Supabase getDashboardStats error]:', err.message);
        return {
            totalEnquiries: 0,
            todaysBookings: 0,
            pendingAssignment: 0,
            assigned: 0,
            onTheWay: 0,
            completed: 0,
            totalRevenue: 0,
            emergencyAlertsCount: 0
        };
    }
}
