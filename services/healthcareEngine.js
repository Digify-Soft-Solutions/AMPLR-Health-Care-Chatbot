import { SERVICES, addBooking, getBookings, updateBookingStatus, addEmergencyAlert, CONVERSATION_STATES } from '../data/mockDatabase.js';

/**
 * ============================================================================
 * AMPLR HEALTH - Master Healthcare Chatbot Engine
 * Slogan: "Brings Hospital Care to Your Home"
 * Helpline: 9849649049
 * Full End-to-End Bilingual Engine (English & Telugu)
 * ============================================================================
 */

const HELPLINE = process.env.BOT_PHONE_NUMBER || process.env.ADMIN_PHONE || '9849649049';

const PARTNER_FORMS = {
    '1': { name: 'Lab-Blood Collection (Phlebotomist)', url: 'https://forms.gle/LXC4gU5E7wFVEAvcA' },
    '2': { name: 'Nursing Professional', url: 'https://forms.gle/wYAu8YUGAnjuHFwD6' },
    '3': { name: 'Caregiver / Caretaker', url: 'https://forms.gle/9kRGgy3CJr2ZXaRD8' },
    '4': { name: 'Physiotherapist', url: 'https://forms.gle/QB2kwRWH8gpNnz1K8' },
    '5': { name: 'ECG Technician', url: 'https://forms.gle/ihAB8nruwNo9JJjC6' },
    '6': { name: 'Ambulance Partner', url: 'https://forms.gle/bScLWDSmhg6RDQwh6' },
    '7': { name: 'Doctor Consultation', url: 'https://forms.gle/pob6vRt5reBS7YMq5' },
    '8': { name: 'Hospital / Clinic Partnership', url: 'https://forms.gle/iUWhwpiWwyGA176Q6' }
};

const EMERGENCY_KEYWORDS = [
    'chest pain', 'breathing difficulty', 'unconscious', 'emergency',
    'heavy bleeding', 'stroke', 'heart attack', 'severe pain', '108'
];

export const TIME_SLOT_OPTIONS = {
    '1': { label: '🌅 Morning Slot (08:00 AM – 10:00 AM IST)', short: '08:00 AM - 10:00 AM', te: '🌅 ఉదయం స్లాట్ (08:00 AM – 10:00 AM IST)' },
    '2': { label: '☀️ Midday Slot (11:00 AM – 01:00 PM IST)', short: '11:00 AM - 01:00 PM', te: '☀️ మధ్యాహ్నం స్లాట్ (11:00 AM – 01:00 PM IST)' },
    '3': { label: '🌤️ Afternoon Slot (02:00 PM – 04:00 PM IST)', short: '02:00 PM - 04:00 PM', te: '🌤️ అపరాహ్నం స్లాట్ (02:00 PM – 04:00 PM IST)' },
    '4': { label: '🌆 Evening Slot (05:00 PM – 07:00 PM IST)', short: '05:00 PM - 07:00 PM', te: '🌆 సాయంత్రం స్లాట్ (05:00 PM – 07:00 PM IST)' },
    '5': { label: '🌙 Night Care Slot (08:00 PM – 10:00 PM IST)', short: '08:00 PM - 10:00 PM', te: '🌙 రాత్రి స్లాట్ (08:00 PM – 10:00 PM IST)' }
};

export function getISTDateString(offsetDays = 0) {
    const d = new Date(Date.now() + (offsetDays * 86400000));
    return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

export function extractServiceFee(serviceStr) {
    if (!serviceStr) return 800;
    const match = serviceStr.match(/₹([0-9,]+)/);
    if (match) {
        return parseInt(match[1].replace(/,/g, ''), 10);
    }
    const lower = serviceStr.toLowerCase();
    const matchedService = SERVICES.find(s => 
        lower.includes(s.name.toLowerCase()) || 
        (s.code && lower.includes(s.code.toLowerCase())) ||
        (s.category && lower.includes(s.category.toLowerCase()))
    );
    if (matchedService && matchedService.basePrice !== undefined) {
        return matchedService.basePrice;
    }
    if (serviceStr.includes('Medicine') || serviceStr.includes('Pharmacy')) return 0;
    if (serviceStr.includes('Lab')) return 500;
    if (serviceStr.includes('Physio')) return 900;
    if (serviceStr.includes('ECG')) return 1100;
    if (serviceStr.includes('Caregiver') || serviceStr.includes('Caretaker')) return 1200;
    if (serviceStr.includes('Ambulance')) return 1400;
    if (serviceStr.includes('Doctor')) return 499;
    return 800;
}

export function processHealthcareMessage(userPhone, messageText, payloadData = null) {
    let cleanUserPhone = (userPhone || '').toString().replace(/\D/g, '');
    if (cleanUserPhone.length === 10) cleanUserPhone = '91' + cleanUserPhone;
    const phoneKey = cleanUserPhone || userPhone;

    const rawText = (messageText || '').trim();
    let effectiveInput = (payloadData || rawText).trim();

    // Map digit emojis like 1️⃣ to '1'
    const emojiMap = { '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4', '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9', '0️⃣': '0' };
    for (const [emoji, digit] of Object.entries(emojiMap)) {
        if (effectiveInput.includes(emoji)) {
            effectiveInput = effectiveInput.replace(emoji, digit).trim();
            break;
        }
    }

    const text = effectiveInput.toLowerCase();

    // ── 1. EMERGENCY ESCALATION ──────────────────────────────────────────────
    const isEmergency = EMERGENCY_KEYWORDS.some(kw => text.includes(kw));
    if (isEmergency) {
        addEmergencyAlert({ phone: userPhone, triggerKeyword: text });
        return {
            type: 'TEXT',
            text: `🚨 *URGENT CLINICAL NOTICE* 🚨\n----------------------------------------\nIf the patient is experiencing a life-threatening medical emergency:\n\n1️⃣ Please dial **108 Emergency Ambulance** immediately.\n2️⃣ Our Clinical Escalation Team has been notified.\n\n📞 Support Line: *${HELPLINE}*\n----------------------------------------\n_AMPLR HEALTH provides planned home healthcare services._`
        };
    }

    // ── 2. POST-SERVICE FEEDBACK (Happy / Unhappy Survey Response) ────────────
    const currentState = CONVERSATION_STATES[phoneKey];
    if (currentState && currentState.step === 'POST_SERVICE_FEEDBACK') {
        if (text === '1' || text.includes('happy') || text.includes('good') || text.includes('బాగుంది') || text.includes('yes')) {
            delete CONVERSATION_STATES[phoneKey];
            return {
                type: 'TEXT',
                text: `🌟 *Thank You For Your 5-Star Feedback!* 😊\n----------------------------------------\nWe are delighted that you had a wonderful healthcare experience with AMPLR HEALTH.\n\n🎁 *Referral Reward*:\nShare AMPLR Health with friends and family — they get *₹100 OFF* on their first home visit!\n\nTo book another healthcare appointment anytime, simply reply *Hi*.\n----------------------------------------\n_AMPLR HEALTH – Brings Hospital Care to Your Home._`
            };
        } else if (text === '2' || text.includes('unhappy') || text.includes('bad') || text.includes('బాగాలేదు') || text.includes('no')) {
            addEmergencyAlert({ phone: userPhone, triggerKeyword: 'UNHAPPY_FEEDBACK_ESCALATION' });
            delete CONVERSATION_STATES[phoneKey];
            return {
                type: 'TEXT',
                text: `😔 *We Sincerely Apologize For Your Experience.*\n----------------------------------------\nPatient care and safety are our highest priorities at AMPLR HEALTH.\n\n🚨 Your feedback has been escalated with **High Priority** to our Clinical Operations Lead. Our care supervisor will call you within 15 minutes.\n\n📞 Direct Support Line: *${HELPLINE}*\n----------------------------------------\n_AMPLR HEALTH – Brings Hospital Care to Your Home._`
            };
        }
    }

    // ── 3. GLOBAL STATUS CHECK KEYWORD TRIGGER ────────────────────────────────
    const STATUS_KEYWORDS = ['status', 'my booking', 'booking status', 'check status', 'appointment', 'స్టేటస్', 'నా బుకింగ్'];
    if (STATUS_KEYWORDS.some(kw => text === kw || text.includes(kw))) {
        return handleBookingStatus(phoneKey, currentState?.lang === 'te');
    }

    // ── 4. GLOBAL CANCEL KEYWORD TRIGGER ─────────────────────────────────────
    const CANCEL_KEYWORDS = ['cancel booking', 'రద్దు చేయండి', 'రద్దు'];
    if (CANCEL_KEYWORDS.some(kw => text === kw || text.includes(kw)) || text === 'cancel') {
        return handleCancelBooking(phoneKey, currentState?.lang === 'te');
    }

    // ── 5. GLOBAL REPEAT / BOOK AGAIN KEYWORD TRIGGER ─────────────────────────
    const REPEAT_KEYWORDS = ['repeat', 'book again', 'rebook', 'మళ్లీ బుక్', 'రీపీట్'];
    if (REPEAT_KEYWORDS.some(kw => text === kw || text.includes(kw))) {
        return handleRepeatBooking(phoneKey, currentState?.lang === 'te');
    }

    // ── 6. GREETING — PRIORITY RESET ─────────────────────────────────────────
    // Greetings ALWAYS reset state → fresh language selection menu
    const GREETINGS = [
        'hi', 'hii', 'hiii', 'hiee', 'hie', 'hai', 'hey',
        'hello', 'helo', 'namaste', 'namaskar', 'start', 'menu',
        'restart', '0', 'నమస్తే', 'నమస్కారం'
    ];
    const isGreeting = GREETINGS.some(g =>
        text === g ||
        text.startsWith(g + ' ') ||
        text.startsWith(g + '!') ||
        text.startsWith(g + ',')
    );
    if (isGreeting) {
        CONVERSATION_STATES[phoneKey] = { step: 'SELECT_LANGUAGE', data: {} };
        return getLanguageMenu();
    }

    // ── 7. PARTNER ONBOARDING FLOW TRIGGER ───────────────────────────────────
    // Checked BEFORE no-state fallback so "join"/"partner" works for new users too
    const PARTNER_KEYWORDS = ['partner', 'partnership', 'join', 'become a partner', 'భాగస్వామ్యం', 'doctor join', 'nurse join'];
    if (PARTNER_KEYWORDS.some(kw => text === kw || text.includes(kw))) {
        CONVERSATION_STATES[phoneKey] = { step: 'PARTNER_SELECT_PROFESSION', lang: 'en', data: {} };
        return getPartnerProfessionMenu();
    }

    // ── 8. NO STATE — SHOW LANGUAGE MENU ─────────────────────────────────────
    if (!CONVERSATION_STATES[phoneKey]) {
        CONVERSATION_STATES[phoneKey] = { step: 'SELECT_LANGUAGE', data: {} };
        return getLanguageMenu();
    }


    const state = CONVERSATION_STATES[phoneKey];
    const isTelugu = state.lang === 'te';

    // ── 8. CONVERSATION STATE MACHINE ─────────────────────────────────────────
    switch (state.step) {

        // --- STEP 1: LANGUAGE SELECTION ---
        case 'SELECT_LANGUAGE': {
            if (text === '1' || text.includes('english') || text === 'en') {
                state.lang = 'en';
                state.step = 'MAIN_MENU';
                return getMainMenuEnglish();
            } else if (text === '2' || text.includes('telugu') || text.includes('తెలుగు') || text === 'te') {
                state.lang = 'te';
                state.step = 'MAIN_MENU';
                return getMainMenuTelugu();
            } else {
                return {
                    type: 'TEXT',
                    text: `Please select your preferred language:\n\n1️⃣ English\n2️⃣ తెలుగు (Telugu)\n\n_Reply with 1 or 2_`
                };
            }
        }

        // --- STEP 2: MAIN MENU ---
        case 'MAIN_MENU': {
            // Option 1: Book Health Service
            if (text === '1' || text.includes('book') || text.includes('బుక్')) {
                state.step = 'SELECT_SERVICE_CATEGORY';
                return isTelugu ? getServicesMenuTelugu() : getServicesMenuEnglish();
            }
            // Option 2: Our Services & Pricing
            else if (text === '2' || text.includes('service') || text.includes('pricing') || text.includes('ధరలు')) {
                state.step = 'SELECT_PRICING_CATEGORY';
                return isTelugu ? getPricingMenuTelugu() : getPricingMenuEnglish();
            }
            // Option 3: Check Booking Status / Cancel
            else if (text === '3' || text.includes('status') || text.includes('స్టేటస్')) {
                return handleBookingStatus(phoneKey, isTelugu);
            }
            // Option 4: Repeat Last Booking
            else if (text === '4' || text.includes('repeat') || text.includes('మళ్లీ')) {
                return handleRepeatBooking(phoneKey, isTelugu);
            }
            // Option 5: Contact Us & Support
            else if (text === '5' || text.includes('contact') || text.includes('support') || text.includes('సంప్రదించండి')) {
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `🏥 *AMPLR HEALTH - మమ్మల్ని సంప్రదించండి*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n----------------------------------------\n📞 హెల్ప్‌లైన్: *${HELPLINE}*\n⏰ సేవ సమయం: 24/7 అందుబాటులో ఉంది\n\n💬 మీకు ఏవైనా సహాయం కావాలంటే నేరుగా కాల్ చేయండి.\n----------------------------------------\n↩️ ప్రధాన మెనూ కోసం *0* టైప్ చేయండి.`
                        : `🏥 *AMPLR HEALTH - Contact Us & Support*\n_Brings Hospital Care to Your Home_\n----------------------------------------\n📞 **Official Helpline**: *${HELPLINE}*\n⏰ **Service Hours**: 24/7 Available\n\n💬 For immediate booking assistance or queries, feel free to call our support team.\n----------------------------------------\n↩️ Reply *0* for Main Menu.`
                };
            }
            // Option 6: Become a Partner
            else if (text === '6' || text.includes('partner') || text.includes('భాగస్వామ్యం')) {
                state.step = 'PARTNER_SELECT_PROFESSION';
                return getPartnerProfessionMenu();
            } else {
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }
        }

        // --- STEP 3: SELECT SERVICE CATEGORY TO BOOK ---
        case 'SELECT_SERVICE_CATEGORY': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }

            const serviceNames = {
                '1': 'Lab-Blood Collection',
                '2': 'Nursing Services at Home',
                '3': 'Caregiver / Caretaker',
                '4': 'Physiotherapy at Home',
                '5': 'ECG at Home',
                '6': 'Doctor Consultation',
                '7': 'Ambulance Services',
                '8': 'Hospital / Clinic Referral',
                '9': 'Medicine Delivery at Home'
            };

            let chosenKey = null;
            if (serviceNames[text]) chosenKey = text;
            else {
                const m = text.match(/^[1-9]/);
                if (m && serviceNames[m[0]]) chosenKey = m[0];
                else if (text.includes('lab') || text.includes('blood') || text.includes('phlebo') || text.includes('రక్త')) chosenKey = '1';
                else if (text.includes('nurs') || text.includes('నర్సింగ్')) chosenKey = '2';
                else if (text.includes('care') || text.includes('కేర్‌టేకర్')) chosenKey = '3';
                else if (text.includes('physio') || text.includes('ఫిజియో')) chosenKey = '4';
                else if (text.includes('ecg') || text.includes('ఈసీజీ')) chosenKey = '5';
                else if (text.includes('doctor') || text.includes('consult') || text.includes('డాక్టర్')) chosenKey = '6';
                else if (text.includes('ambulance') || text.includes('slab') || text.includes('అంబులెన్స్')) chosenKey = '7';
                else if (text.includes('hospital') || text.includes('clinic') || text.includes('హాస్పిటల్')) chosenKey = '8';
                else if (text.includes('medicine') || text.includes('pharmacy') || text.includes('మందులు')) chosenKey = '9';
            }

            if (chosenKey) {
                state.data.selectedService = serviceNames[chosenKey];

                // Specialty sub-menus
                if (chosenKey === '6') {
                    state.step = 'SELECT_DOCTOR_SPECIALTY';
                    return getDoctorSpecialtiesMenu(isTelugu);
                } else if (chosenKey === '2') {
                    state.step = 'SELECT_NURSING_PROCEDURE';
                    return getNursingProceduresMenu(isTelugu);
                } else if (chosenKey === '7') {
                    state.step = 'SELECT_AMBULANCE_TYPE';
                    return getAmbulanceMenu(isTelugu);
                } else if (chosenKey === '9') {
                    state.step = 'CAPTURE_MEDICINE_LIST';
                    return {
                        type: 'TEXT',
                        text: isTelugu
                            ? `💊 *మందుల పంపిణీ (ఇంటి వద్ద)*\n----------------------------------------\n📝 *దశ 1/4: మందుల వివరాలు*\n\nదయచేసి అవసరమైన మందుల పేర్లను టైప్ చేయండి లేదా డాక్టర్ ప్రిస్క్రిప్షన్ వివరాలు పంపండి:`
                            : `💊 *Medicine Delivery at Home*\n----------------------------------------\n📝 *STEP 1 OF 4: MEDICINE DETAILS*\n\nPlease type the names of the required medicines or doctor's prescription details:`
                    };
                }

                state.step = 'CAPTURE_PATIENT_NAME';
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `🩺 *ఎంపిక చేసిన సేవ*: *${serviceNames[chosenKey]}*\n----------------------------------------\n📝 *దశ 1/3: రోగి పేరు మరియు వయస్సు*\n\nదయచేసి రోగి పేరు మరియు వయస్సు నమోదు చేయండి (ఉదా: *రమేష్, 45*):`
                        : `🩺 *Selected Service*: *${serviceNames[chosenKey]}*\n----------------------------------------\n📝 *STEP 1 OF 3: PATIENT DETAILS*\n\nPlease enter the **Patient Name and Age** (e.g. *Rahul Sharma, 52*):`
                };
            }

            return {
                type: 'TEXT',
                text: isTelugu
                    ? `❌ దయచేసి సరైన సంఖ్యను (1 నుండి 9) ఎంచుకోండి, లేదా ప్రధాన మెనూ కోసం *0* టైప్ చేయండి.`
                    : `❌ Please reply with a valid service number (*1 to 9*), or *0* for Main Menu.`
            };
        }

        // --- MEDICINE LIST CAPTURE ---
        case 'CAPTURE_MEDICINE_LIST': {
            if (rawText.trim().length < 2) {
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ దయచేసి మందుల వివరాలను నమోదు చేయండి:`
                        : `❌ Please provide your required medicine names or prescription:`
                };
            }
            state.data.medicineDetails = rawText.trim();
            state.data.selectedSubService = `Medicine Delivery: ${rawText.trim().slice(0, 40)}`;
            state.step = 'CAPTURE_PATIENT_NAME';
            return {
                type: 'TEXT',
                text: isTelugu
                    ? `👤 *దశ 2/4: రోగి పేరు మరియు వయస్సు*\n\nదయచేసి రోగి పేరు మరియు వయస్సు నమోదు చేయండి:`
                    : `👤 *STEP 2 OF 4: PATIENT DETAILS*\n\nPlease enter the Patient Name and Age:`
            };
        }

        // --- DOCTOR CONSULTATION SPECIALTY SELECTION ---
        case 'SELECT_DOCTOR_SPECIALTY': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }
            const doctorTypes = {
                '1': 'DERM / ORTHO / PSY / ENT (₹399)',
                '2': 'PULMO / MS.SURG / URO / IVF (₹599)',
                '3': 'GASTRO / CARDIO / ENDO / NEURO (₹599)',
                '4': 'ONCO - Oncology (₹799)',
                '5': 'AYUR / PANCHA / HOMEO (₹299)',
                '6': 'UNANI / SIDDHA / YOGA / NATURO (₹299)',
                '7': 'FERTILITY / CHRONIC (₹499)',
                '8': 'NUTRITIONIST / DIETITIAN (₹299)'
            };

            let chosenDocKey = null;
            if (doctorTypes[text]) chosenDocKey = text;
            else {
                const m = text.match(/^[1-8]/);
                if (m && doctorTypes[m[0]]) chosenDocKey = m[0];
                else if (text.includes('derm') || text.includes('ortho') || text.includes('psy') || text.includes('ent')) chosenDocKey = '1';
                else if (text.includes('pulmo') || text.includes('surg') || text.includes('uro') || text.includes('ivf')) chosenDocKey = '2';
                else if (text.includes('gastro') || text.includes('cardio') || text.includes('endo') || text.includes('neuro')) chosenDocKey = '3';
                else if (text.includes('onco') || text.includes('cancer')) chosenDocKey = '4';
                else if (text.includes('ayur') || text.includes('pancha') || text.includes('homeo')) chosenDocKey = '5';
                else if (text.includes('unani') || text.includes('siddha') || text.includes('yoga') || text.includes('naturo')) chosenDocKey = '6';
                else if (text.includes('fertility') || text.includes('chronic')) chosenDocKey = '7';
                else if (text.includes('nutrition') || text.includes('diet')) chosenDocKey = '8';
            }

            if (chosenDocKey) {
                state.data.selectedSubService = doctorTypes[chosenDocKey];
                state.step = 'CAPTURE_PATIENT_NAME';
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `👨‍⚕️ *ఎంపిక చేసిన కన్సల్టేషన్*: *${doctorTypes[chosenDocKey]}*\n----------------------------------------\n📝 *దశ 1/3: రోగి వివరాలు*\n\nదయచేసి రోగి పేరు మరియు వయస్సు నమోదు చేయండి (ఉదా: *సురేష్, 40*):`
                        : `👨‍⚕️ *Selected Specialty*: *${doctorTypes[chosenDocKey]}*\n----------------------------------------\n📝 *STEP 1 OF 3: PATIENT DETAILS*\n\nPlease enter the **Patient Name and Age** (e.g. *Amit Verma, 45*):`
                };
            }
            return getDoctorSpecialtiesMenu(isTelugu);
        }

        // --- NURSING PROCEDURE SELECTION ---
        case 'SELECT_NURSING_PROCEDURE': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }
            const nursingTypes = {
                '1': 'Injection / IV Push / IV Cannulation (₹300)',
                '2': 'IV Fluid Administration (₹500)',
                '3': 'Dressing / Wound Care / Catheter Insertion (₹700)',
                '4': 'Vasculitis Dressing (₹900)',
                '5': 'BP / Sugar / Vitals Check (₹200)',
                '6': 'Bedridden Patient Care (₹700)',
                '7': 'Nursing Care (1-3 Hours) (₹700)',
                '8': 'Nursing Care (1-6 Hours) (₹1,400)',
                '9': 'Nursing Care (1-12 Hours) (₹2,600)'
            };

            let chosenNurseKey = null;
            if (nursingTypes[text]) chosenNurseKey = text;
            else {
                const m = text.match(/^[1-9]/);
                if (m && nursingTypes[m[0]]) chosenNurseKey = m[0];
                else if (text.includes('injection') || text.includes('push') || text.includes('cannula')) chosenNurseKey = '1';
                else if (text.includes('iv fluid') || text.includes('infusion') || text.includes('drip') || text.includes('saline')) chosenNurseKey = '2';
                else if (text.includes('dress') || text.includes('wound') || text.includes('catheter')) chosenNurseKey = '3';
                else if (text.includes('vasculitis')) chosenNurseKey = '4';
                else if (text.includes('bp') || text.includes('sugar') || text.includes('vital')) chosenNurseKey = '5';
                else if (text.includes('bedridden') || text.includes('bath')) chosenNurseKey = '6';
                else if (text.includes('1 to 3') || text.includes('1-3') || text.includes('3 hour')) chosenNurseKey = '7';
                else if (text.includes('1 to 6') || text.includes('1-6') || text.includes('6 hour')) chosenNurseKey = '8';
                else if (text.includes('1 to 12') || text.includes('1-12') || text.includes('12 hour')) chosenNurseKey = '9';
            }

            if (chosenNurseKey) {
                state.data.selectedSubService = nursingTypes[chosenNurseKey];
                state.step = 'CAPTURE_PATIENT_NAME';
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `👩‍⚕️ *ఎంపిక చేసిన నర్సింగ్ సేవ*: *${nursingTypes[chosenNurseKey]}*\n----------------------------------------\n📝 *దశ 1/3: రోగి వివరాలు*\n\nదయచేసి రోగి పేరు మరియు వయస్సు నమోదు చేయండి:`
                        : `👩‍⚕️ *Selected Nursing Service*: *${nursingTypes[chosenNurseKey]}*\n----------------------------------------\n📝 *STEP 1 OF 3: PATIENT DETAILS*\n\nPlease enter the **Patient Name and Age**:`
                };
            }
            return getNursingProceduresMenu(isTelugu);
        }

        // --- AMBULANCE TYPE SELECTION ---
        case 'SELECT_AMBULANCE_TYPE': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }
            const isToofan = (text === '1' || text.includes('toofan') || text.includes('omni'));
            const isTempo = (text === '2' || text.includes('tempo') || text.includes('traveller'));
            if (!isToofan && !isTempo) {
                return getAmbulanceMenu(isTelugu);
            }
            const vehicle = isToofan ? 'Toofan / Omni A/C' : 'Tempo Traveller A/C';
            const baseFare = isToofan ? 1400 : 1800;
            state.data.ambulanceVehicle = vehicle;
            state.data.ambulanceBaseFare = baseFare;
            state.step = 'SELECT_AMBULANCE_ADDON';
            return getAmbulanceAddonMenu(vehicle, baseFare, isTelugu);
        }

        // --- AMBULANCE ADD-ON CONFIGURATION ---
        case 'SELECT_AMBULANCE_ADDON': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }
            const vehicle = state.data.ambulanceVehicle || 'Ambulance';
            const baseFare = state.data.ambulanceBaseFare || 1400;
            let configName = '';
            let totalFare = baseFare;

            const m = text.match(/^[1-4]/);
            const digit = m ? m[0] : null;

            if (digit === '1' || text.includes('alone') || text.includes('standard') || text.includes('vehicle')) {
                configName = `${vehicle} (Standard Transport)`;
                totalFare = baseFare;
            } else if (digit === '2' || text.includes('paramedic')) {
                configName = `${vehicle} with Paramedic Staff`;
                totalFare = baseFare + 1500;
            } else if (digit === '3' || text.includes('oxygen') || text.includes('o2')) {
                configName = `${vehicle} with Oxygen Support`;
                totalFare = baseFare + 1500;
            } else if (digit === '4' || text.includes('ventilator') || text.includes('icu')) {
                configName = `${vehicle} with ICU Ventilator`;
                totalFare = baseFare + 4500;
            } else {
                return getAmbulanceAddonMenu(vehicle, baseFare, isTelugu);
            }

            state.data.selectedSubService = `${configName} (₹${totalFare})`;
            state.data.fee = totalFare;
            state.step = 'CAPTURE_PATIENT_NAME';

            return {
                type: 'TEXT',
                text: isTelugu
                    ? `🚑 *అంబులెన్స్ సిద్ధమైంది*: *${state.data.selectedSubService}*\n----------------------------------------\n📝 *దశ 1/3: రోగి వివరాలు*\n\nదయచేసి రోగి పేరు మరియు వయస్సు నమోదు చేయండి (ఉదా: *రమేష్ శర్మ, 52*):`
                    : `🚑 *Ambulance Configured*: *${state.data.selectedSubService}*\n----------------------------------------\n📝 *STEP 1 OF 3: PATIENT DETAILS*\n\nPlease enter the **Patient Name and Age** (e.g. *Rahul Sharma, 52*):`
            };
        }

        // --- CAPTURE PATIENT NAME & AGE ---
        case 'CAPTURE_PATIENT_NAME': {
            const hasLetters = /[a-zA-Z\u0C00-\u0C7F]{2,}/.test(rawText);
            if (!hasLetters) {
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ *చెల్లని పేరు!* దయచేసి సరైన రోగి పేరు మరియు వయస్సు నమోదు చేయండి (ఉదా: *రమేష్ శర్మ, 45*):`
                        : `❌ *Invalid Patient Name!* Please enter a valid patient name and age (e.g. *Rahul Sharma, 45*):`
                };
            }

            state.data.patientName = rawText.trim();
            state.step = 'SELECT_APPOINTMENT_DATE';
            const serviceBooked = state.data.selectedSubService || state.data.selectedService || 'Healthcare Service';

            return {
                type: 'INTERACTIVE_BUTTONS',
                text: isTelugu
                    ? `👤 *రోగి*: *${state.data.patientName}*\n🩺 *సేవ*: *${serviceBooked}*\n----------------------------------------\n📅 *దశ 2/5: అపాయింట్‌మెంట్ తేదీ*\nదయచేసి క్రింది బటన్ నొక్కండి లేదా DD/MM/YYYY నమోదు చేయండి:`
                    : `👤 *Patient*: *${state.data.patientName}*\n🩺 *Service*: *${serviceBooked}*\n----------------------------------------\n📅 *STEP 2 OF 5: APPOINTMENT DATE*\nPlease tap a button below or enter DD/MM/YYYY:`,
                buttons: [
                    { id: '1', text: `📅 Today` },
                    { id: '2', text: `📅 Tomorrow` },
                    { id: '3', text: `📅 Day After` }
                ]
            };
        }

        // --- SELECT APPOINTMENT DATE ---
        case 'SELECT_APPOINTMENT_DATE': {
            if (text === '0') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }

            if (text === '1' || text.includes('today') || text.includes('ఈరోజు')) {
                state.data.appointmentDate = getISTDateString(0);
            } else if (text === '2' || text.includes('tomorrow') || text.includes('రేపు')) {
                state.data.appointmentDate = getISTDateString(1);
            } else if (text === '3' || text.includes('day after') || text.includes('ఎల్లుండి')) {
                state.data.appointmentDate = getISTDateString(2);
            } else if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.test(rawText.trim())) {
                state.data.appointmentDate = rawText.trim();
            } else {
                return {
                    type: 'INTERACTIVE_BUTTONS',
                    text: isTelugu
                        ? `❌ *దయచేసి సరైన తేదీని ఎంచుకోండి:*\nక్రింది బటన్ నొక్కండి లేదా DD/MM/YYYY నమోదు చేయండి.`
                        : `❌ *Please select a valid date:*\nTap a button below or enter DD/MM/YYYY:`,
                    buttons: [
                        { id: '1', text: `📅 Today` },
                        { id: '2', text: `📅 Tomorrow` },
                        { id: '3', text: `📅 Day After` }
                    ]
                };
            }

            state.step = 'SELECT_TIME_SLOT';
            return {
                type: 'INTERACTIVE_LIST',
                text: isTelugu
                    ? `📅 *ఎంపిక చేసిన తేదీ*: *${state.data.appointmentDate}*\n----------------------------------------\n⏰ *దశ 3/5: సమయ స్లాట్ (IST) ఎంచుకోండి*`
                    : `📅 *Selected Date*: *${state.data.appointmentDate}*\n----------------------------------------\n⏰ *STEP 3 OF 5: PREFERRED TIME SLOT (IST)*\nPlease choose your convenient time slot:`,
                listTitle: '⏰ Select Slot',
                sections: [
                    {
                        title: 'IST Time Slots',
                        rows: [
                            { id: '1', title: '1️⃣ Morning Slot', description: '08:00 AM – 10:00 AM IST' },
                            { id: '2', title: '2️⃣ Midday Slot', description: '11:00 AM – 01:00 PM IST' },
                            { id: '3', title: '3️⃣ Afternoon Slot', description: '02:00 PM – 04:00 PM IST' },
                            { id: '4', title: '4️⃣ Evening Slot', description: '05:00 PM – 07:00 PM IST' },
                            { id: '5', title: '5️⃣ Night Care Slot', description: '08:00 PM – 10:00 PM IST' }
                        ]
                    }
                ]
            };
        }

        // --- SELECT TIME SLOT ---
        case 'SELECT_TIME_SLOT': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }

            let chosenSlotKey = null;
            if (TIME_SLOT_OPTIONS[text]) chosenSlotKey = text;
            else {
                const m = text.match(/^[1-5]/);
                if (m && TIME_SLOT_OPTIONS[m[0]]) chosenSlotKey = m[0];
                else if (text.includes('morning') || text.includes('ఉదయం') || text.includes('08:00')) chosenSlotKey = '1';
                else if (text.includes('midday') || text.includes('మధ్యాహ్నం') || text.includes('11:00')) chosenSlotKey = '2';
                else if (text.includes('afternoon') || text.includes('అపరాహ్నం') || text.includes('02:00')) chosenSlotKey = '3';
                else if (text.includes('evening') || text.includes('సాయంత్రం') || text.includes('05:00')) chosenSlotKey = '4';
                else if (text.includes('night') || text.includes('రాత్రి') || text.includes('10:00')) chosenSlotKey = '5';
            }

            const slotObj = chosenSlotKey ? TIME_SLOT_OPTIONS[chosenSlotKey] : null;
            if (!slotObj) {
                return {
                    type: 'INTERACTIVE_LIST',
                    text: isTelugu
                        ? `❌ *దయచేసి సరైన సమయ స్లాట్‌ను ఎంచుకోండి:*`
                        : `❌ *Please choose your convenient time slot:*`,
                    listTitle: '⏰ Select Slot',
                    sections: [
                        {
                            title: 'IST Time Slots',
                            rows: [
                                { id: '1', title: '1️⃣ Morning Slot', description: '08:00 AM – 10:00 AM IST' },
                                { id: '2', title: '2️⃣ Midday Slot', description: '11:00 AM – 01:00 PM IST' },
                                { id: '3', title: '3️⃣ Afternoon Slot', description: '02:00 PM – 04:00 PM IST' },
                                { id: '4', title: '4️⃣ Evening Slot', description: '05:00 PM – 07:00 PM IST' },
                                { id: '5', title: '5️⃣ Night Care Slot', description: '08:00 PM – 10:00 PM IST' }
                            ]
                        }
                    ]
                };
            }

            state.data.timeSlot = slotObj.short;
            state.data.timeSlotLabel = isTelugu ? slotObj.te : slotObj.label;

            // If coming from REPEAT BOOKING flow, skip address capture and jump to review!
            if (state.isRepeatBooking) {
                const serviceBooked = state.data.selectedSubService || state.data.selectedService;
                const fee = extractServiceFee(serviceBooked);
                state.data.fee = fee;
                state.step = 'REVIEW_AND_CONFIRM';

                return {
                    type: 'INTERACTIVE_BUTTONS',
                    text: isTelugu
                        ? `📋 *AMPLR HEALTH - రిపీట్ బుకింగ్ సమీక్ష*\n----------------------------------------\n🩺 *సేవ*: ${serviceBooked}\n💵 *అంచనా రుసుము*: ₹${fee}\n👤 *రోగి*: ${state.data.patientName}\n📅 *తేదీ*: ${state.data.appointmentDate}\n⏰ *సమయం*: ${state.data.timeSlotLabel}\n🏠 *చిరునామా*: ${state.data.houseAddress}\n📍 *ల్యాండ్‌మార్క్*: ${state.data.landmark}\n📮 *పిన్‌కోడ్*: ${state.data.pincode}\n----------------------------------------\n👇 *నిర్ధారించడానికి బటన్ నొక్కండి:*`
                        : `📋 *AMPLR HEALTH - REPEAT BOOKING CONFIRMATION*\n----------------------------------------\n🩺 *Service*: ${serviceBooked}\n💵 *Estimated Fee*: ₹${fee}\n👤 *Patient*: ${state.data.patientName}\n📅 *Date*: ${state.data.appointmentDate}\n⏰ *Time Slot*: ${state.data.timeSlotLabel}\n🏠 *Address*: ${state.data.houseAddress}\n📍 *Landmark*: ${state.data.landmark}\n📮 *Pincode*: ${state.data.pincode}\n----------------------------------------\n👇 *Tap a button below to confirm or cancel:*`,
                    buttons: [
                        { id: '1', text: '✅ Confirm Re-Booking' },
                        { id: '0', text: '❌ Cancel' }
                    ]
                };
            }

            state.step = 'CAPTURE_HOUSE_ADDRESS';
            return {
                type: 'TEXT',
                text: isTelugu
                    ? `⏰ *సమయం*: *${state.data.timeSlot}*\n----------------------------------------\n🏠 *దశ 4/5: ఇంటి చిరునామా & లొకేషన్*\n\nదయచేసి మీ ఇంటి నంబర్, అపార్ట్‌మెంట్ పేరు & వీధి/ప్రాంతం నమోదు చేయండి:\n(ఉదా: *Flat 204, Royal Palms, Banjara Hills*)\n\n📍 *సూచన*: WhatsApp లొకేషన్ పంపడానికి, 📎 Attach ➔ 📍 Location ➔ *"Send your current location"* ఎంచుకోండి!`
                    : `⏰ *Time Slot*: *${state.data.timeSlot}*\n----------------------------------------\n🏠 *STEP 4 OF 5: HOME ADDRESS & LOCATION*\n\nPlease enter House/Flat No., Building Name & Street/Area:\n(e.g. *Flat 204, Royal Palms Apartment, Jubilee Hills*)\n\n📍 *Tip*: To share your GPS Pin via WhatsApp, tap 📎 Attach ➔ 📍 Location ➔ select *"Send your current location"*!`
            };
        }

        // --- CAPTURE HOUSE ADDRESS ---
        case 'CAPTURE_HOUSE_ADDRESS': {
            const isLocationMsg = rawText.includes('[LOCATION MESSAGE]') || 
                                  rawText.includes('Location Pin') || 
                                  rawText.includes('GPS Location') ||
                                  rawText.includes('maps.google.com') ||
                                  rawText.toLowerCase().includes('location');

            if (rawText.trim().length < 4 && !isLocationMsg) {
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ *దయచేసి పూర్తి చిరునామా నమోదు చేయండి (కనీసం 4 అక్షరాలు):*`
                        : `❌ *Please provide a complete house/street address (e.g. Flat 302, Sunrise Apts, MG Road):*`
                };
            }

            let savedAddress = rawText.trim();
            if (savedAddress.includes('[LOCATION MESSAGE]') || savedAddress === '📍 Shared WhatsApp Location Pin' || isLocationMsg) {
                savedAddress = savedAddress.includes('http') ? savedAddress : '📍 WhatsApp Live Location Pin';
            }
            state.data.houseAddress = savedAddress;
            state.step = 'CAPTURE_LANDMARK';
            return {
                type: 'TEXT',
                text: isTelugu
                    ? `📍 *లొకేషన్ / చిరునామా స్వీకరించబడింది:* *${state.data.houseAddress}*\n----------------------------------------\n📍 *ల్యాండ్‌మార్క్ లేదా అపార్ట్‌మెంట్ వివరాలు*\n\nమా హెల్త్‌కేర్ సిబ్బంది మీ ఇంటిని సులభంగా చేరుకోవడానికి సమీప ల్యాండ్‌మార్క్ లేదా ఫ్లాట్ నంబర్ నమోదు చేయండి:\n(ఉదా: *Flat 204, Opp. Apollo Pharmacy* లేదా *Near Bsk School*)`
                    : `📍 *Location/Address Received:* *${state.data.houseAddress}*\n----------------------------------------\n📍 *NEARBY LANDMARK & APARTMENT DETAILS*\n\nPlease enter House/Flat No. or a nearby landmark so our staff can locate your home quickly:\n(e.g. *Flat 204, Opp. Apollo Pharmacy* or *Near Bsk School*)`
            };
        }

        // --- CAPTURE LANDMARK ---
        case 'CAPTURE_LANDMARK': {
            if (rawText.trim().length < 2) {
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ *దయచేసి సమీప ల్యాండ్‌మార్క్ నమోదు చేయండి:*`
                        : `❌ *Please enter a nearby landmark (e.g. Opp. City Hospital, Near Temple, etc.):*`
                };
            }

            state.data.landmark = rawText.trim();
            state.step = 'CAPTURE_PINCODE';
            return {
                type: 'TEXT',
                text: isTelugu
                    ? `📍 *ల్యాండ్‌మార్క్*: *${state.data.landmark}*\n----------------------------------------\n📮 *దశ 5/5: 6-అంకెల పిన్‌కోడ్ (PINCODE)*\n\nదయచేసి మీ ప్రాంతం యొక్క **6-అంకెల పిన్‌కోడ్** నమోదు చేయండి:\n(ఉదా: *500081* లేదా *302001*)`
                    : `📍 *Landmark*: *${state.data.landmark}*\n----------------------------------------\n📮 *STEP 5 OF 5: 6-DIGIT POSTAL PINCODE*\n\nPlease enter your **6-digit area PINCODE**:\n(e.g. *500081* or *302001*)`
            };
        }

        // --- CAPTURE PINCODE & REVIEW ---
        case 'CAPTURE_PINCODE': {
            const cleanPin = rawText.replace(/\D/g, '');
            if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ *చెల్లని పిన్‌కోడ్!* భారతీయ పోస్టల్ పిన్‌కోడ్ సరిగ్గా 6 అంకెలు ఉండాలి (ఉదా: *500081*). దయచేసి మళ్లీ నమోదు చేయండి:`
                        : `❌ *Invalid Pincode!* Indian postal pincode must be exactly 6 digits starting with 1-9 (e.g. *500081*). Please enter again:`
                };
            }

            state.data.pincode = cleanPin;
            const serviceBooked = state.data.selectedSubService || state.data.selectedService;
            const fee = extractServiceFee(serviceBooked);
            state.data.fee = fee;
            state.step = 'REVIEW_AND_CONFIRM';

            return {
                type: 'INTERACTIVE_BUTTONS',
                text: isTelugu
                    ? `📋 *AMPLR HEALTH - బుకింగ్ వివరాల సమీక్ష*\n----------------------------------------\n🩺 *సేవ*: ${serviceBooked}\n💵 *అంచనా రుసుము*: ₹${fee}\n👤 *రోగి*: ${state.data.patientName}\n📅 *తేదీ*: ${state.data.appointmentDate}\n⏰ *సమయం*: ${state.data.timeSlotLabel}\n🏠 *చిరునామా*: ${state.data.houseAddress}\n📍 *ల్యాండ్‌మార్క్*: ${state.data.landmark}\n📮 *పిన్‌కోడ్*: ${state.data.pincode}\n----------------------------------------\n👇 *నిర్ధారించడానికి బటన్ నొక్కండి:*`
                    : `📋 *AMPLR HEALTH - BOOKING REVIEW & CONFIRMATION*\n----------------------------------------\n🩺 *Service*: ${serviceBooked}\n💵 *Estimated Fee*: ₹${fee}\n👤 *Patient*: ${state.data.patientName}\n📅 *Date*: ${state.data.appointmentDate}\n⏰ *Time Slot*: ${state.data.timeSlotLabel}\n🏠 *Address*: ${state.data.houseAddress}\n📍 *Landmark*: ${state.data.landmark}\n📮 *Pincode*: ${state.data.pincode}\n----------------------------------------\n👇 *Tap a button below to confirm or cancel:*`,
                buttons: [
                    { id: '1', text: '✅ Confirm Booking' },
                    { id: '0', text: '❌ Cancel Booking' }
                ]
            };
        }

        // --- REVIEW AND CONFIRM ---
        case 'REVIEW_AND_CONFIRM': {
            if (text === '1' || text.includes('confirm') || text.includes('yes') || text.includes('సరే')) {
                const bookingId = 'AMPLR-' + Math.floor(10000 + Math.random() * 90000);
                const serviceBooked = state.data.selectedSubService || state.data.selectedService;
                const fullLocation = `${state.data.houseAddress}, Landmark: ${state.data.landmark}, PIN: ${state.data.pincode}`;

                addBooking({
                    id: bookingId,
                    patientName: state.data.patientName,
                    patientPhone: userPhone,
                    phone: userPhone,
                    serviceName: serviceBooked,
                    date: state.data.appointmentDate,
                    slot: state.data.timeSlot,
                    dateTime: `${state.data.appointmentDate} (${state.data.timeSlot})`,
                    address: fullLocation,
                    houseAddress: state.data.houseAddress,
                    landmark: state.data.landmark,
                    pincode: state.data.pincode,
                    location: fullLocation,
                    amount: state.data.fee,
                    status: 'Pending Assignment'
                });

                const savedPatient = state.data.patientName;
                const savedDate = state.data.appointmentDate;
                const savedSlot = state.data.timeSlot;
                const savedFee = state.data.fee;

                delete CONVERSATION_STATES[phoneKey];

                return {
                    type: 'TEXT',
                    category: 'CUSTOMER_BOOKING',
                    bookingId: bookingId,
                    status: `Booking Confirmed: ${bookingId}`,
                    customUserMessage: `Booked: ${serviceBooked} [ID: ${bookingId}]`,
                    text: isTelugu
                        ? `✅ *బుకింగ్ విజయవంతంగా నిర్ధారించబడింది!*\n----------------------------------------\n🔖 *బుకింగ్ ID*: *${bookingId}*\n🩺 *సేవ*: ${serviceBooked}\n💵 *రుసుము*: ₹${savedFee}\n👤 *రోగి*: ${savedPatient}\n📅 *సమయం*: ${savedDate} (${savedSlot})\n📍 *చిరునామా*: ${fullLocation}\n\n👨‍⚕️ మా హెల్త్‌కేర్ ప్రొఫెషనల్ త్వరలో మిమ్మల్ని సంప్రదిస్తారు.\n📞 అత్యవసర సహాయం: *${HELPLINE}*\n----------------------------------------\n_AMPLR HEALTH – ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది._`
                        : `✅ *BOOKING CONFIRMED SUCCESSFULLY!*\n----------------------------------------\n🔖 *Booking ID*: *${bookingId}*\n🩺 *Service*: ${serviceBooked}\n💵 *Amount*: ₹${savedFee}\n👤 *Patient*: ${savedPatient}\n📅 *Schedule*: ${savedDate} (${savedSlot})\n📍 *Location*: ${fullLocation}\n\n👨‍⚕️ Our healthcare staff is being assigned and will contact you shortly.\n📞 Official 24/7 Helpline: *${HELPLINE}*\n----------------------------------------\n_AMPLR HEALTH – Brings Hospital Care to Your Home._`
                };
            }

            if (text === '0' || text.includes('cancel')) {
                delete CONVERSATION_STATES[phoneKey];
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ *బుకింగ్ రద్దు చేయబడింది.* ప్రధాన మెనూ కోసం *0* లేదా *Hi* టైప్ చేయండి.`
                        : `❌ *Booking Cancelled.* Reply *0* or *Hi* for Main Menu.`
                };
            }

            return {
                type: 'TEXT',
                text: isTelugu
                    ? `దయచేసి నిర్ధారించడానికి *1* లేదా రద్దు చేయడానికి *0* రిప్లై ఇవ్వండి.`
                    : `Please reply with *1* to Confirm Booking ✅ or *0* to Cancel ❌.`
            };
        }

        // --- CONFIRM CANCEL BOOKING ---
        case 'CONFIRM_CANCEL_BOOKING': {
            if (text === '1' || text.includes('yes') || text.includes('అవును')) {
                const cancelId = state.cancelBookingId;
                if (cancelId) {
                    updateBookingStatus(cancelId, 'Cancelled');
                }
                delete CONVERSATION_STATES[phoneKey];
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ *బుకింగ్ విజయవంతంగా రద్దు చేయబడింది.*\n----------------------------------------\nమీ అపాయింట్‌మెంట్ *${cancelId || ''}* రద్దు చేయబడింది.\n\nఏవైనా సహాయం కావాలంటే మా 24/7 హెల్ప్‌లైన్ కు కాల్ చేయండి: *${HELPLINE}*.\n----------------------------------------\n↩️ ప్రధాన మెనూ కోసం *Hi* లేదా *0* రిప్లై ఇవ్వండి.`
                        : `❌ *BOOKING CANCELLED SUCCESSFULLY*\n----------------------------------------\nYour booking *${cancelId || ''}* has been cancelled.\n\nNeed assistance or want to reschedule? Call our 24/7 Helpline: *${HELPLINE}*.\n----------------------------------------\n↩️ Reply *Hi* or *0* for Main Menu.`
                };
            } else if (text === '2' || text.includes('no') || text.includes('వద్దు')) {
                delete CONVERSATION_STATES[phoneKey];
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `✅ *మీ బుకింగ్ సక్రియంగా ఉంచబడింది!*\nప్రధాన మెనూ కోసం *0* లేదా *Hi* రిప్లై ఇవ్వండి.`
                        : `✅ *Booking Kept Active!*\nYour appointment remains confirmed. Reply *0* or *Hi* for Main Menu.`
                };
            }
            return {
                type: 'TEXT',
                text: `Reply *1* to Confirm Cancellation, or *2* to Keep Appointment.`
            };
        }

        // --- PARTNER PROFESSION SELECTION ---
        case 'PARTNER_SELECT_PROFESSION': {
            if (text === '0' || text === '9' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }

            let chosenPartnerKey = null;
            if (PARTNER_FORMS[text]) chosenPartnerKey = text;
            else {
                const m = text.match(/^[1-8]/);
                if (m && PARTNER_FORMS[m[0]]) chosenPartnerKey = m[0];
                else if (text.includes('lab') || text.includes('phlebo') || text.includes('blood')) chosenPartnerKey = '1';
                else if (text.includes('nurs')) chosenPartnerKey = '2';
                else if (text.includes('care')) chosenPartnerKey = '3';
                else if (text.includes('physio')) chosenPartnerKey = '4';
                else if (text.includes('ecg')) chosenPartnerKey = '5';
                else if (text.includes('ambulance')) chosenPartnerKey = '6';
                else if (text.includes('doctor')) chosenPartnerKey = '7';
                else if (text.includes('hospital') || text.includes('clinic')) chosenPartnerKey = '8';
            }

            const partnerObj = chosenPartnerKey ? PARTNER_FORMS[chosenPartnerKey] : null;
            if (partnerObj) {
                const partnerRefId = 'PTR-' + Math.floor(10000 + Math.random() * 90000);
                delete CONVERSATION_STATES[phoneKey];
                return {
                    type: 'TEXT',
                    category: 'PARTNER_APPLICATION',
                    partnerRefId: partnerRefId,
                    profession: partnerObj.name,
                    status: `Partner Lead: ${partnerRefId} (${partnerObj.name})`,
                    customUserMessage: `Partner Application: ${partnerObj.name} [ID: ${partnerRefId}]`,
                    text: `🤝 *AMPLR HEALTH - PARTNER ONBOARDING*\n----------------------------------------\n🔖 *Application ID*: *${partnerRefId}*\n🩺 *Profession*: *${partnerObj.name}*\n\nThank you for choosing to become an AMPLR HEALTH healthcare partner! 🏥\n\n👉 *Official Partner Application Form*:\n${partnerObj.url}\n\n📝 *Note*: Please save this Application ID (*${partnerRefId}*) for verification or enter it in the form if asked.\n\nOur onboarding team will review your application and contact you for onboarding within 24 hours.\n----------------------------------------\n📞 Partner Desk: *${HELPLINE}*\n↩️ Reply *0* or *Hi* for Main Menu.`
                };
            }

            return getPartnerProfessionMenu();
        }

        // --- PRICING CATALOG VIEW ---
        case 'SELECT_PRICING_CATEGORY': {
            if (text === '1' || text.includes('doctor') || text.includes('డాక్టర్')) {
                state.data.selectedService = 'Doctor Consultation';
                state.step = 'SELECT_DOCTOR_SPECIALTY';
                return getDoctorSpecialtiesMenu(isTelugu);
            }
            if (text === '2' || text.includes('nursing') || text.includes('nurse') || text.includes('నర్సింగ్')) {
                state.data.selectedService = 'Nursing Services at Home';
                state.step = 'SELECT_NURSING_PROCEDURE';
                return getNursingProceduresMenu(isTelugu);
            }
            if (text === '3' || text.includes('ambulance') || text.includes('slab') || text.includes('అంబులెన్స్')) {
                state.data.selectedService = 'Ambulance Services';
                state.step = 'SELECT_AMBULANCE_TYPE';
                return getAmbulanceMenu(isTelugu);
            }
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }
            return isTelugu ? getPricingMenuTelugu() : getPricingMenuEnglish();
        }

        // --- PARTNER ONBOARDING FLOW ---
        case 'PARTNER_SELECT_PROFESSION': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }

            const professionMap = {
                '1': 'Lab Technician / Phlebotomist',
                '2': 'Nursing Professional (GNM/B.Sc)',
                '3': 'Caregiver / Caretaker',
                '4': 'Physiotherapist (BPT/MPT)',
                '5': 'ECG Technician',
                '6': 'Ambulance Partner / Driver',
                '7': 'Doctor Consultation Specialist',
                '8': 'Hospital / Clinic Institutional Partner'
            };

            const selectedProf = professionMap[text] || text;
            state.data.partnerProfession = selectedProf;
            state.step = 'PARTNER_CAPTURE_DETAILS';

            return {
                type: 'TEXT',
                text: `🤝 *AMPLR HEALTH - PARTNER REGISTRATION*\n----------------------------------------\nCategory: *${selectedProf}*\n\nPlease reply with your details in this format:\n\n*Full Name, Years of Experience, City/Area*\n(e.g., *Dr. Rajesh Kumar, 6 Years, Jubilee Hills Hyderabad*)`
            };
        }

        case 'PARTNER_CAPTURE_DETAILS': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }

            const partnerId = `PTR-${Math.floor(10000 + Math.random() * 90000)}`;
            const details = rawText;
            const profession = state.data.partnerProfession || 'Healthcare Specialist';

            state.step = 'MAIN_MENU';
            return {
                type: 'TEXT',
                status: `🤝 Partner Application: ${profession}`,
                customUserMessage: `Partner Application: ${profession} (${details})`,
                category: 'PARTNER_APPLICATION',
                text: `✅ *APPLICATION SUBMITTED SUCCESSFULLY!* 🎉\n----------------------------------------\n📋 *Partner ID*: *${partnerId}*\n🩺 *Profession*: ${profession}\n📝 *Details*: ${details}\n📞 *Registered Phone*: +${phoneKey}\n\nOur Provider Onboarding Team will review your credentials and contact you within 24 hours for document verification and platform onboarding.\n\nHelpline: *${HELPLINE}*\n----------------------------------------\n↩️ Reply *0* for Main Menu.`
            };
        }

        default: {
            CONVERSATION_STATES[phoneKey] = { step: 'MAIN_MENU', lang: state.lang || 'en', data: {} };
            return state.lang === 'te' ? getMainMenuTelugu() : getMainMenuEnglish();
        }
    }
}

// ── STATUS CHECK HANDLER ─────────────────────────────────────────────────────
function handleBookingStatus(phoneKey, isTelugu) {
    const bookings = getBookings();
    const clean = (phoneKey || '').replace(/\D/g, '');
    const myBooking = bookings.find(b => {
        const p = (b.phone || b.patientPhone || '').replace(/\D/g, '');
        return p && (clean.includes(p) || p.includes(clean));
    });

    if (!myBooking) {
        return {
            type: 'TEXT',
            text: isTelugu
                ? `🔍 *యాక్టివ్ బుకింగ్‌లు ఏవీ లేవు*\n----------------------------------------\nఈ నంబర్‌తో ప్రస్తుతం ఎలాంటి బుకింగ్ కనుగొనబడలేదు.\n\nకొత్త సేవను బుక్ చేయడానికి *1* లేదా ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
                : `🔍 *No Active Bookings Found*\n----------------------------------------\nWe could not find any active booking for phone number *${phoneKey}*.\n\nReply *1* to Book a Health Service, or *0* for Main Menu.`
        };
    }

    const staffText = myBooking.assignedStaff 
        ? `👤 *${myBooking.assignedStaff.name}* (Ph: *${myBooking.assignedStaff.phone}*)`
        : (isTelugu ? '⏳ కేటాయింపు ప్రక్రియలో ఉంది' : '⏳ Allocation in progress');

    return {
        type: 'TEXT',
        text: isTelugu
            ? `📋 *AMPLR HEALTH - బుకింగ్ స్థితి*\n----------------------------------------\n🔖 *బుకింగ్ ID*: *${myBooking.id}*\n🩺 *సేవ*: *${myBooking.serviceName}*\n👤 *రోగి*: *${myBooking.patientName}*\n📅 *షెడ్యూల్*: ${myBooking.date} (${myBooking.slot})\n📍 *చిరునామా*: ${myBooking.address || 'ఇంటి చిరునామా'}\n💵 *రుసుము*: ₹${myBooking.amount} (${myBooking.paymentStatus || 'Pending'})\n🚦 *స్థితి*: *${myBooking.status}*\n👨‍⚕️ *కేటాయించిన సిబ్బంది*: ${staffText}\n----------------------------------------\n↩️ మెనూ కోసం *0*, బుకింగ్ రద్దు కోసం *Cancel* అని టైప్ చేయండి.`
            : `📋 *AMPLR HEALTH - BOOKING STATUS*\n----------------------------------------\n🔖 *Booking ID*: *${myBooking.id}*\n🩺 *Service*: *${myBooking.serviceName}*\n👤 *Patient*: *${myBooking.patientName}*\n📅 *Schedule*: ${myBooking.date} (${myBooking.slot})\n📍 *Location*: ${myBooking.address || 'Home Visit'}\n💵 *Amount*: ₹${myBooking.amount} (${myBooking.paymentStatus || 'Pending'})\n🚦 *Status*: *${myBooking.status}*\n👨‍⚕️ *Assigned Staff*: ${staffText}\n----------------------------------------\n↩️ Reply *0* for Main Menu, or reply *Cancel* to cancel booking.`
    };
}

// ── CANCEL BOOKING HANDLER ───────────────────────────────────────────────────
function handleCancelBooking(phoneKey, isTelugu) {
    const bookings = getBookings();
    const clean = (phoneKey || '').replace(/\D/g, '');
    const myBooking = bookings.find(b => {
        const p = (b.phone || b.patientPhone || '').replace(/\D/g, '');
        const isActive = b.status !== 'Cancelled' && b.status !== 'Completed';
        return p && (clean.includes(p) || p.includes(clean)) && isActive;
    });

    if (!myBooking) {
        return {
            type: 'TEXT',
            text: isTelugu
                ? `🔍 రద్దు చేయడానికి క్రియాశీల బుకింగ్‌లు ఏవీ లేవు. ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
                : `🔍 No active bookings found to cancel. Reply *0* for Main Menu.`
        };
    }

    CONVERSATION_STATES[phoneKey] = {
        step: 'CONFIRM_CANCEL_BOOKING',
        lang: isTelugu ? 'te' : 'en',
        cancelBookingId: myBooking.id,
        data: {}
    };

    return {
        type: 'INTERACTIVE_BUTTONS',
        text: isTelugu
            ? `⚠️ *బుకింగ్ రద్దు నిర్ధారణ*\n----------------------------------------\nమీరు మీ బుకింగ్ *${myBooking.id}* (${myBooking.serviceName}) ను ఖచ్చితంగా రద్దు చేయాలనుకుంటున్నారా?`
            : `⚠️ *CONFIRM CANCELLATION*\n----------------------------------------\nAre you sure you want to cancel booking *${myBooking.id}* for *${myBooking.serviceName}* on ${myBooking.date}?`,
        buttons: [
            { id: '1', text: '❌ Yes, Cancel' },
            { id: '2', text: '✅ Keep Active' }
        ]
    };
}

// ── REPEAT / BOOK AGAIN HANDLER ──────────────────────────────────────────────
function handleRepeatBooking(phoneKey, isTelugu) {
    const bookings = getBookings();
    const clean = (phoneKey || '').replace(/\D/g, '');
    const prev = bookings.find(b => {
        const p = (b.phone || b.patientPhone || '').replace(/\D/g, '');
        return p && (clean.includes(p) || p.includes(clean));
    });

    if (!prev) {
        return {
            type: 'TEXT',
            text: isTelugu
                ? `🔍 మునుపటి బుకింగ్ రికార్డులు ఏవీ కనుగొనబడలేదు. కొత్త సేవను బుక్ చేయడానికి *1* లేదా ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
                : `🔍 No previous booking history found for this number.\n\nReply *1* to Book a New Health Service, or *0* for Main Menu.`
        };
    }

    CONVERSATION_STATES[phoneKey] = {
        step: 'SELECT_APPOINTMENT_DATE',
        isRepeatBooking: true,
        lang: isTelugu ? 'te' : 'en',
        data: {
            patientName: prev.patientName,
            selectedService: prev.serviceName,
            selectedSubService: prev.serviceName,
            houseAddress: prev.address,
            landmark: prev.landmark || 'Same Landmark',
            pincode: prev.pincode || '500081',
            fee: prev.amount
        }
    };

    return {
        type: 'TEXT',
        text: isTelugu
            ? `🔁 *మునుపటి సేవను మళ్లీ బుక్ చేయండి*\n----------------------------------------\nస్వాగతం *${prev.patientName}* గారు! 👋\n\nమీ మునుపటి సేవను మళ్లీ బుక్ చేయాలనుకుంటున్నారా:\n🩺 *సేవ*: *${prev.serviceName}*\n🏠 *చిరునామా*: ${prev.address || 'సేవ్ చేయబడిన చిరునామా'}\n\n📅 *తేదీని ఎంచుకోండి:*\n1️⃣ ఈరోజు (${getISTDateString(0)})\n2️⃣ రేపు (${getISTDateString(1)})\n3️⃣ ఎల్లుండి (${getISTDateString(2)})\n----------------------------------------\n📲 *1, 2, లేదా 3 రిప్లై ఇవ్వండి, లేదా మెనూ కోసం 0*`
            : `🔁 *REPEAT BOOKING - WELCOME BACK!*\n----------------------------------------\nHello *${prev.patientName}*! 👋\n\nWould you like to repeat your previous service:\n🩺 *Service*: *${prev.serviceName}*\n🏠 *Address*: ${prev.address || 'Saved Home Address'}\n\n📅 *Select Appointment Date:*\n1️⃣ Today (${getISTDateString(0)})\n2️⃣ Tomorrow (${getISTDateString(1)})\n3️⃣ Day After Tomorrow (${getISTDateString(2)})\n----------------------------------------\n📲 *Reply 1, 2, or 3, or enter DD/MM/YYYY*`
    };
}

// ── TEMPLATE MENUS ───────────────────────────────────────────────────────────

function getLanguageMenu() {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `🏥 *AMPLR HEALTH*\n_Brings Hospital Care to Your Home_\n----------------------------------------\nWelcome to AMPLR HEALTH! 👋\nPlease select your preferred language:\nదయచేసి మీ భాషను ఎంచుకోండి:`,
        buttons: [
            { id: '1', text: '🇬🇧 English' },
            { id: '2', text: '🇮🇳 తెలుగు' }
        ]
    };
}

function getMainMenuEnglish() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `👋 *Welcome to AMPLR HEALTH*\n_Brings Hospital Care to Your Home_\n----------------------------------------\nHow can our healthcare team assist you today?\n\n1️⃣ 🩺 *Book Health Service*\n2️⃣ 💰 *Pricing & Tariff Menu*\n3️⃣ 🔍 *Check Booking Status / Cancel*\n4️⃣ 🔁 *Re-book Last Service*\n5️⃣ 📞 *24/7 Helpline & Support*\n6️⃣ 🤝 *Become a Healthcare Partner*\n----------------------------------------\n👇 *Tap 'View Menu' below or reply 1 to 6:*`,
        listTitle: '📋 View Menu',
        sections: [
            {
                title: 'AMPLR Healthcare',
                rows: [
                    { id: '1', title: '1️⃣ Book Service', description: 'Nursing, Physio, Lab, ECG at Home' },
                    { id: '2', title: '2️⃣ Pricing & Tariff', description: 'Doctors, Nursing & Ambulance Slabs' },
                    { id: '3', title: '3️⃣ Check Status', description: 'Track or cancel your active booking' },
                    { id: '4', title: '4️⃣ Repeat Booking', description: 'Re-order past home healthcare visit' },
                    { id: '5', title: '5️⃣ 24/7 Helpline', description: 'Call care coordinator: 9849649049' },
                    { id: '6', title: '6️⃣ Become a Partner', description: 'Doctor, Nurse, Lab, Driver onboarding' }
                ]
            }
        ]
    };
}

function getMainMenuTelugu() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `👋 *AMPLR HEALTH కు స్వాగతం*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n----------------------------------------\nఈ రోజు మీకు ఎలా సహాయం చేయగలము?\n\n1️⃣ 🩺 *ఆరోగ్య సేవను బుక్ చేయండి*\n2️⃣ 💰 *సేవలు & ధరల జాబితా*\n3️⃣ 🔍 *బుకింగ్ స్థితి / రద్దు చేయండి*\n4️⃣ 🔁 *మునుపటి సేవను మళ్లీ బుక్ చేయండి*\n5️⃣ 📞 *24/7 హెల్ప్‌లైన్*\n6️⃣ 🤝 *మాతో భాగస్వామ్యం అవ్వండి*\n----------------------------------------\n👇 *క్రింది 'ప్రధాన మెనూ' నొక్కండి లేదా 1-6 రిప్లై ఇవ్వండి:*`,
        listTitle: '📋 ప్రధాన మెనూ',
        sections: [
            {
                title: 'సేవల జాబితా',
                rows: [
                    { id: '1', title: '1️⃣ సేవను బుక్ చేయండి', description: 'నర్సింగ్, ఫిజియో, ల్యాబ్, ECG' },
                    { id: '2', title: '2️⃣ ధరల జాబితా', description: 'డాక్టర్లు, నర్సింగ్, అంబులెన్స్ రేట్లు' },
                    { id: '3', title: '3️⃣ బుకింగ్ స్థితి', description: 'మీ బుకింగ్ స్థితిని తనిఖీ చేయండి' },
                    { id: '4', title: '4️⃣ రిపీట్ బుకింగ్', description: 'గత సేవను త్వరగా మళ్లీ బుక్ చేయండి' },
                    { id: '5', title: '5️⃣ 24/7 హెల్ప్‌లైన్', description: 'సహాయం కోసం కాల్ చేయండి: 9849649049' },
                    { id: '6', title: '6️⃣ భాగస్వామి అవ్వండి', description: 'హెల్త్‌కేర్ నెట్‌వర్క్‌లో చేరండి' }
                ]
            }
        ]
    };
}

function getServicesMenuEnglish() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `🩺 *AMPLR HEALTH - SERVICES*\n----------------------------------------\nPlease select the healthcare service you require at home:\n\n1️⃣ 🩸 *Lab - Blood Collection* (from ₹500)\n2️⃣ 👩‍⚕️ *Nursing Services at Home* (₹800)\n3️⃣ 🧓 *Caregiver / Caretaker* (₹1,200)\n4️⃣ 🏃‍♂️ *Physiotherapy at Home* (₹900)\n5️⃣ 💓 *ECG at Home* (₹1,100)\n6️⃣ 👨‍⚕️ *Doctor Consultation* (₹299-₹799)\n7️⃣ 🚑 *Ambulance Services (24/7)*\n8️⃣ 🏥 *Hospital / Clinic Referral*\n9️⃣ 💊 *Medicine Delivery at Home*\n----------------------------------------\n👇 *Tap 'Select Service' below or reply 1 to 9:*`,
        listTitle: '🩺 Select Service',
        sections: [
            {
                title: 'Home Care & Diagnostics',
                rows: [
                    { id: '1', title: '1️⃣ Lab Blood Tests', description: 'CBC, Sugar, Thyroid home collection' },
                    { id: '2', title: '2️⃣ Nursing at Home', description: 'Dressing, Injections, IV Infusion' },
                    { id: '3', title: '3️⃣ Caregiver Care', description: '12h / 24h elderly & bedside assistance' },
                    { id: '4', title: '4️⃣ Physiotherapy', description: 'Post-op, paralysis & pain rehab' },
                    { id: '5', title: '5️⃣ ECG at Home', description: 'Instant 12-lead test & report' }
                ]
            },
            {
                title: 'Specialist & Transport',
                rows: [
                    { id: '6', title: '6️⃣ Doctor Consult', description: 'Specialist tele-consult from ₹299' },
                    { id: '7', title: '7️⃣ 24/7 Ambulance', description: 'Toofan / Tempo with O2 & Ventilator' },
                    { id: '8', title: '8️⃣ Hospital Referral', description: 'Priority OPD & IPD admission support' },
                    { id: '9', title: '9️⃣ Medicine Delivery', description: 'Prescription medicine doorstep delivery' }
                ]
            }
        ]
    };
}

function getServicesMenuTelugu() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `🩺 *AMPLR HEALTH - సేవలు*\n----------------------------------------\nమీకు అవసరమైన ఆరోగ్య సేవను ఎంచుకోండి:\n\n1️⃣ 🩸 *ల్యాబ్ - రక్త నమూనా సేకరణ*\n2️⃣ 👩‍⚕️ *నర్సింగ్ సేవలు (ఇంటి వద్ద)*\n3️⃣ 🧓 *సంరక్షకులు / కేర్‌టేకర్‌*\n4️⃣ 🏃‍♂️ *ఫిజియోథెరపీ*\n5️⃣ 💓 *ఇంటి వద్ద ECG*\n6️⃣ 👨‍⚕️ *డాక్టర్ కన్సల్టేషన్*\n7️⃣ 🚑 *అంబులెన్స్ సేవలు (24/7)*\n8️⃣ 🏥 *ఆసుపత్రి / క్లినిక్ సేవలు*\n9️⃣ 💊 *మందుల పంపిణీ (ఇంటి వద్ద)*\n----------------------------------------\n👇 *క్రింది 'సేవను ఎంచుకోండి' నొక్కండి లేదా 1-9 రిప్లై ఇవ్వండి:*`,
        listTitle: '🩺 సేవను ఎంచుకోండి',
        sections: [
            {
                title: 'ఇంటి వద్ద ఆరోగ్య సేవలు',
                rows: [
                    { id: '1', title: '1️⃣ ల్యాబ్ రక్త పరీక్షలు', description: 'రక్త నమూనా సేకరణ' },
                    { id: '2', title: '2️⃣ నర్సింగ్ సేవలు', description: 'డ్రెస్సింగ్, ఇంజెక్షన్లు, సెలైన్' },
                    { id: '3', title: '3️⃣ సంరక్షకులు', description: 'వృద్ధుల సంరక్షణ మరియు సహాయం' },
                    { id: '4', title: '4️⃣ ఫిజియోథెరపీ', description: 'నొప్పులు మరియు పునరావాసం' },
                    { id: '5', title: '5️⃣ ECG సేవలు', description: 'తక్షణ 12-లీడ్ ECG పరీక్ష' }
                ]
            },
            {
                title: 'స్పెషలిస్ట్ & అంబులెన్స్',
                rows: [
                    { id: '6', title: '6️⃣ డాక్టర్ సంప్రదింపులు', description: 'నిపుణుల టెలి-కన్సల్టేషన్' },
                    { id: '7', title: '7️⃣ 24/7 అంబులెన్స్', description: 'ఆక్సిజన్ & వెంటిలేటర్ సదుపాయం' },
                    { id: '8', title: '8️⃣ ఆసుపత్రి రిఫరల్', description: 'ఆసుపత్రి అడ్మిషన్ సహాయం' },
                    { id: '9', title: '9️⃣ మందుల పంపిణీ', description: 'ఇంటి వద్దకే మందుల డెలివరీ' }
                ]
            }
        ]
    };
}

function getPricingMenuEnglish() {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `💰 *AMPLR HEALTH - SERVICE PRICING TARIFF*\n----------------------------------------\nSelect a healthcare category to view rates & book:\n\n1️⃣ 👨‍⚕️ *Doctor Consultation Rates* (₹299 - ₹799)\n2️⃣ 👩‍⚕️ *Home Nursing Procedures* (₹200 - ₹2,600)\n3️⃣ 🚑 *Ambulance Transport Slabs* (From ₹1,400)\n----------------------------------------\n👇 *Tap a button below or reply 1, 2, 3:*`,
        buttons: [
            { id: '1', text: '👨‍⚕️ Doctor Rates' },
            { id: '2', text: '👩‍⚕️ Nursing Rates' },
            { id: '3', text: '🚑 Ambulance Slabs' }
        ]
    };
}

function getPricingMenuTelugu() {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `💰 *AMPLR HEALTH - సేవల ధరల వివరాలు*\n----------------------------------------\nవివరమైన ధరల జాబితాను చూడటానికి ఎంచుకోండి:\n\n1️⃣ 👨‍⚕️ *డాక్టర్ కన్సల్టేషన్ ఛార్జీలు* (₹299 - ₹799)\n2️⃣ 👩‍⚕️ *నర్సింగ్ సేవల ఛార్జీలు* (₹200 - ₹2,600)\n3️⃣ 🚑 *అంబులెన్స్ ఛార్జీలు* (₹1,400 నుండి)\n----------------------------------------\n👇 *క్రింది బటన్ నొక్కండి లేదా 1, 2, 3 రిప్లై ఇవ్వండి:*`,
        buttons: [
            { id: '1', text: '👨‍⚕️ డాక్టర్ రేట్లు' },
            { id: '2', text: '👩‍⚕️ నర్సింగ్ రేట్లు' },
            { id: '3', text: '🚑 అంబులెన్స్ రేట్లు' }
        ]
    };
}

function getDoctorSpecialtiesMenu(isTelugu) {
    return {
        type: 'INTERACTIVE_LIST',
        text: `👨‍⚕️ *AMPLR HEALTH - DOCTOR CONSULTATION TARIFF*\n----------------------------------------\nPlease select a specialty to book your doctor consult:`,
        listTitle: '👨‍⚕️ Select Specialty',
        sections: [
            {
                title: 'Clinical Specialties',
                rows: [
                    { id: '1', title: '1️⃣ DERM / ORTHO / ENT', description: 'Skin, Bone & ENT Specialists (₹399)' },
                    { id: '2', title: '2️⃣ PULMO / URO / IVF', description: 'Chest, Urology & Surgery (₹599)' },
                    { id: '3', title: '3️⃣ GASTRO / CARDIO / NEURO', description: 'Stomach, Heart & Neuro (₹599)' },
                    { id: '4', title: '4️⃣ ONCO (Oncology)', description: 'Cancer Specialist Consult (₹799)' }
                ]
            },
            {
                title: 'AYUSH & Nutrition',
                rows: [
                    { id: '5', title: '5️⃣ AYUR / HOMEO', description: 'Ayurveda & Homeopathy (₹299)' },
                    { id: '6', title: '6️⃣ UNANI / NATUROPATHY', description: 'Siddha, Yoga & Naturopathy (₹299)' },
                    { id: '7', title: '7️⃣ FERTILITY / CHRONIC', description: 'Reproductive & Chronic Care (₹499)' },
                    { id: '8', title: '8️⃣ NUTRITIONIST / DIET', description: 'Personalized Clinical Diet (₹299)' }
                ]
            }
        ]
    };
}

function getNursingProceduresMenu(isTelugu) {
    return {
        type: 'INTERACTIVE_LIST',
        text: `👩‍⚕️ *AMPLR HEALTH - HOME NURSING PROCEDURES*\n----------------------------------------\nPlease select the nursing care procedure you need:`,
        listTitle: '👩‍⚕️ Select Procedure',
        sections: [
            {
                title: 'Clinical Procedures (Visit)',
                rows: [
                    { id: '1', title: '1️⃣ Injection / IV Push', description: 'Cannulation, IM/IV injection (₹300)' },
                    { id: '2', title: '2️⃣ IV Fluid Infusion', description: 'Saline / IV drip administration (₹500)' },
                    { id: '3', title: '3️⃣ Dressing & Catheter', description: 'Wound care, Foley catheter (₹700)' },
                    { id: '4', title: '4️⃣ Vasculitis Dressing', description: 'Specialized chronic ulcer care (₹900)' },
                    { id: '5', title: '5️⃣ BP & Sugar Check', description: 'Vitals & blood glucose testing (₹200)' },
                    { id: '6', title: '6️⃣ Bedridden Care', description: 'Ryle tube, bed bath & hygiene (₹700)' }
                ]
            },
            {
                title: 'Hourly Dedicated Shifts',
                rows: [
                    { id: '7', title: '7️⃣ 1 to 3 Hours Shift', description: 'Short medical supervision (₹700)' },
                    { id: '8', title: '8️⃣ 1 to 6 Hours Shift', description: 'Half-day dedicated nurse (₹1,400)' },
                    { id: '9', title: '9️⃣ 1 to 12 Hours Shift', description: 'Full 12-hour day/night shift (₹2,600)' }
                ]
            }
        ]
    };
}

function getAmbulanceMenu(isTelugu) {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `🚑 *AMPLR HEALTH - 24/7 AMBULANCE SERVICES*\n----------------------------------------\nPlease select your preferred ambulance vehicle type:\n\n1️⃣ *TOOFAN / OMNI (Patient Transport A/C)*\n    • 1-10 km: ₹1,400  |  1-50 km: ₹4,000\n    • 1-100 km: ₹6,000 |  1-200 km: ₹10,500\n\n2️⃣ *TEMPO TRAVELLER (Patient Transport A/C)*\n    • 1-10 km: ₹1,800  |  1-50 km: ₹5,500\n    • 1-100 km: ₹9,500 |  1-200 km: ₹16,000\n----------------------------------------\n👇 *Tap a button below or reply 1 or 2:*`,
        buttons: [
            { id: '1', text: '🚙 Toofan / Omni A/C' },
            { id: '2', text: '🚐 Tempo Traveller A/C' }
        ]
    };
}

function getAmbulanceAddonMenu(vehicleName, baseFare, isTelugu) {
    return {
        type: 'INTERACTIVE_LIST',
        text: `🚑 *AMPLR HEALTH - ${vehicleName.toUpperCase()}*\n----------------------------------------\nBase Fare (1-10 km): *₹${baseFare}*\n\nPlease choose your required medical setup / equipment:`,
        listTitle: '➕ Select Add-on',
        sections: [
            {
                title: 'Medical Configurations',
                rows: [
                    { id: '1', title: '1️⃣ Vehicle Alone', description: `Standard Patient Transport (₹${baseFare})` },
                    { id: '2', title: '2️⃣ With Paramedic', description: `Trained medical staff (+₹1,500 = ₹${baseFare + 1500})` },
                    { id: '3', title: '3️⃣ With Oxygen Support', description: `Continuous O2 cylinder (+₹1,500 = ₹${baseFare + 1500})` },
                    { id: '4', title: '4️⃣ With ICU Ventilator', description: `Critical life-support (+₹4,500 = ₹${baseFare + 4500})` }
                ]
            }
        ]
    };
}

function getPartnerProfessionMenu() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `🤝 *WELCOME TO AMPLR HEALTH PARTNER NETWORK*\n_Brings Hospital Care to Your Home_\n----------------------------------------\nGrow your healthcare services with AMPLR HEALTH.\nPlease select your profession / service category:`,
        listTitle: '🤝 Select Profession',
        sections: [
            {
                title: 'Healthcare Categories',
                rows: [
                    { id: '1', title: '🩸 Lab Technician', description: 'Phlebotomist & home sample collection' },
                    { id: '2', title: '👩‍⚕️ Nursing Professional', description: 'GNM / B.Sc Nurse for home procedures' },
                    { id: '3', title: '🧓 Caregiver / Caretaker', description: 'Elderly care & bedside assistance' },
                    { id: '4', title: '🏃‍♂️ Physiotherapist', description: 'BPT / MPT home rehabilitation' },
                    { id: '5', title: '💓 ECG Technician', description: 'Home ECG testing & cardiac screening' },
                    { id: '6', title: '🚑 Ambulance Partner', description: 'Transport, BLS & ACLS fleet' },
                    { id: '7', title: '👨‍⚕️ Doctor Consultation', description: 'General & Specialist Tele-consult' },
                    { id: '8', title: '🏥 Hospital / Clinic', description: 'Institutional healthcare tie-up' }
                ]
            }
        ]
    };
}
