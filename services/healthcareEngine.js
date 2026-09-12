import { SERVICES, addBooking, getBookings, updateBookingStatus, addEmergencyAlert, CONVERSATION_STATES } from '../data/mockDatabase.js';

/**
 * ============================================================================
 * AMPLR HEALTH - Master Healthcare Chatbot Engine
 * Slogan: "Brings Hospital Care to Your Home"
 * Helpline: 7997888448
 * Full End-to-End Bilingual Engine (English & Telugu)
 * ============================================================================
 */

const HELPLINE = '7997888448';

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
    const text = rawText.toLowerCase();

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

            if (serviceNames[text]) {
                state.data.selectedService = serviceNames[text];

                // Specialty sub-menus
                if (text === '6') {
                    state.step = 'SELECT_DOCTOR_SPECIALTY';
                    return getDoctorSpecialtiesMenu(isTelugu);
                } else if (text === '2') {
                    state.step = 'SELECT_NURSING_PROCEDURE';
                    return getNursingProceduresMenu(isTelugu);
                } else if (text === '7') {
                    state.step = 'SELECT_AMBULANCE_TYPE';
                    return getAmbulanceMenu(isTelugu);
                } else if (text === '9') {
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
                        ? `🩺 *ఎంపిక చేసిన సేవ*: *${serviceNames[text]}*\n----------------------------------------\n📝 *దశ 1/3: రోగి పేరు మరియు వయస్సు*\n\nదయచేసి రోగి పేరు మరియు వయస్సు నమోదు చేయండి (ఉదా: *రమేష్, 45*):`
                        : `🩺 *Selected Service*: *${serviceNames[text]}*\n----------------------------------------\n📝 *STEP 1 OF 3: PATIENT DETAILS*\n\nPlease enter the **Patient Name and Age** (e.g. *Rahul Sharma, 52*):`
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
            if (text === '0') {
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

            if (doctorTypes[text]) {
                state.data.selectedSubService = doctorTypes[text];
                state.step = 'CAPTURE_PATIENT_NAME';
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `👨‍⚕️ *ఎంపిక చేసిన కన్సల్టేషన్*: *${doctorTypes[text]}*\n----------------------------------------\n📝 *దశ 1/3: రోగి వివరాలు*\n\nదయచేసి రోగి పేరు మరియు వయస్సు నమోదు చేయండి (ఉదా: *సురేష్, 40*):`
                        : `👨‍⚕️ *Selected Specialty*: *${doctorTypes[text]}*\n----------------------------------------\n📝 *STEP 1 OF 3: PATIENT DETAILS*\n\nPlease enter the **Patient Name and Age** (e.g. *Amit Verma, 45*):`
                };
            }
            return getDoctorSpecialtiesMenu(isTelugu);
        }

        // --- NURSING PROCEDURE SELECTION ---
        case 'SELECT_NURSING_PROCEDURE': {
            if (text === '0') {
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

            if (nursingTypes[text]) {
                state.data.selectedSubService = nursingTypes[text];
                state.step = 'CAPTURE_PATIENT_NAME';
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `👩‍⚕️ *ఎంపిక చేసిన నర్సింగ్ సేవ*: *${nursingTypes[text]}*\n----------------------------------------\n📝 *దశ 1/3: రోగి వివరాలు*\n\nదయచేసి రోగి పేరు మరియు వయస్సు నమోదు చేయండి:`
                        : `👩‍⚕️ *Selected Nursing Service*: *${nursingTypes[text]}*\n----------------------------------------\n📝 *STEP 1 OF 3: PATIENT DETAILS*\n\nPlease enter the **Patient Name and Age**:`
                };
            }
            return getNursingProceduresMenu(isTelugu);
        }

        // --- AMBULANCE TYPE SELECTION ---
        case 'SELECT_AMBULANCE_TYPE': {
            if (text === '0') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }
            state.data.selectedSubService = text === '1' ? 'Toofan / Omni A/C Ambulance' : 'Tempo Traveller A/C Ambulance';
            state.step = 'CAPTURE_PATIENT_NAME';
            return {
                type: 'TEXT',
                text: `🚑 *Selected*: *${state.data.selectedSubService}*\n----------------------------------------\n📝 *STEP 1 OF 3: PATIENT DETAILS*\n\nPlease enter the **Patient Name and Pickup Address**:`
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
                type: 'TEXT',
                text: isTelugu
                    ? `👤 *రోగి*: *${state.data.patientName}*\n🩺 *సేవ*: *${serviceBooked}*\n----------------------------------------\n📅 *దశ 2/5: అపాయింట్‌మెంట్ తేదీ*\n\n1️⃣ ఈరోజు (${getISTDateString(0)})\n2️⃣ రేపు (${getISTDateString(1)})\n3️⃣ ఎల్లుండి (${getISTDateString(2)})\n----------------------------------------\n📲 *తేదీ ఎంపిక కోసం 1, 2, లేదా 3 రిప్లై ఇవ్వండి (లేదా DD/MM/YYYY)*`
                    : `👤 *Patient*: *${state.data.patientName}*\n🩺 *Service*: *${serviceBooked}*\n----------------------------------------\n📅 *STEP 2 OF 5: APPOINTMENT DATE*\n\n1️⃣ Today (${getISTDateString(0)})\n2️⃣ Tomorrow (${getISTDateString(1)})\n3️⃣ Day After Tomorrow (${getISTDateString(2)})\n----------------------------------------\n📲 *Reply 1, 2, or 3, or enter DD/MM/YYYY*`
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
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ *దయచేసి సరైన తేదీని ఎంచుకోండి:*\nఈరోజు కోసం *1*, రేపు కోసం *2*, ఎల్లుండి కోసం *3* లేదా DD/MM/YYYY నమోదు చేయండి.`
                        : `❌ *Please select a valid date:*\nReply *1* for Today, *2* for Tomorrow, *3* for Day After Tomorrow, or enter *DD/MM/YYYY*.`
                };
            }

            state.step = 'SELECT_TIME_SLOT';
            return {
                type: 'TEXT',
                text: isTelugu
                    ? `📅 *ఎంపిక చేసిన తేదీ*: *${state.data.appointmentDate}*\n----------------------------------------\n⏰ *దశ 3/5: సమయ స్లాట్ (IST) ఎంచుకోండి*\n\n1️⃣ 🌅 *ఉదయం స్లాట్* (08:00 AM – 10:00 AM IST)\n2️⃣ ☀️ *మధ్యాహ్నం స్లాట్* (11:00 AM – 01:00 PM IST)\n3️⃣ 🌤️ *అపరాహ్నం స్లాట్* (02:00 PM – 04:00 PM IST)\n4️⃣ 🌆 *సాయంత్రం స్లాట్* (05:00 PM – 07:00 PM IST)\n5️⃣ 🌙 *రాత్రి స్లాట్* (08:00 PM – 10:00 PM IST)\n----------------------------------------\n📲 *స్లాట్ ఎంపిక కోసం 1 నుండి 5 రిప్లై ఇవ్వండి*`
                    : `📅 *Selected Date*: *${state.data.appointmentDate}*\n----------------------------------------\n⏰ *STEP 3 OF 5: PREFERRED TIME SLOT (IST)*\n\nPlease select your convenient Indian Standard Time slot:\n\n1️⃣ 🌅 *Morning* (08:00 AM – 10:00 AM IST)\n2️⃣ ☀️ *Midday* (11:00 AM – 01:00 PM IST)\n3️⃣ 🌤️ *Afternoon* (02:00 PM – 04:00 PM IST)\n4️⃣ 🌆 *Evening* (05:00 PM – 07:00 PM IST)\n5️⃣ 🌙 *Night Care* (08:00 PM – 10:00 PM IST)\n----------------------------------------\n📲 *Reply with number (1 to 5)*`
            };
        }

        // --- SELECT TIME SLOT ---
        case 'SELECT_TIME_SLOT': {
            if (text === '0') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }

            const slotObj = TIME_SLOT_OPTIONS[text];
            if (!slotObj) {
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ *దయచేసి సరైన సమయ స్లాట్‌ను (1 నుండి 5) ఎంచుకోండి:*`
                        : `❌ *Invalid Option!* Please select a valid time slot number (*1 to 5*):`
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
                    type: 'TEXT',
                    text: isTelugu
                        ? `📋 *AMPLR HEALTH - రిపీట్ బుకింగ్ సమీక్ష*\n----------------------------------------\n🩺 *సేవ*: ${serviceBooked}\n💵 *అంచనా రుసుము*: ₹${fee}\n👤 *రోగి*: ${state.data.patientName}\n📅 *తేదీ*: ${state.data.appointmentDate}\n⏰ *సమయం*: ${state.data.timeSlotLabel}\n🏠 *చిరునామా*: ${state.data.houseAddress}\n📍 *ల్యాండ్‌మార్క్*: ${state.data.landmark}\n📮 *పిన్‌కోడ్*: ${state.data.pincode}\n----------------------------------------\n1️⃣ ✅ *బుకింగ్ నిర్ధారించండి (Confirm)*\n0️⃣ ❌ *రద్దు చేయండి (Cancel)*\n\n📲 *నిర్ధారించడానికి 1 రిప్లై ఇవ్వండి*`
                        : `📋 *AMPLR HEALTH - REPEAT BOOKING CONFIRMATION*\n----------------------------------------\n🩺 *Service*: ${serviceBooked}\n💵 *Estimated Fee*: ₹${fee}\n👤 *Patient*: ${state.data.patientName}\n📅 *Date*: ${state.data.appointmentDate}\n⏰ *Time Slot*: ${state.data.timeSlotLabel}\n🏠 *Address*: ${state.data.houseAddress}\n📍 *Landmark*: ${state.data.landmark}\n📮 *Pincode*: ${state.data.pincode}\n----------------------------------------\n1️⃣ ✅ *Confirm Re-Booking Now*\n0️⃣ ❌ *Cancel*\n\n📲 *Reply 1 to Confirm or 0 to Cancel*`
                };
            }

            state.step = 'CAPTURE_HOUSE_ADDRESS';
            return {
                type: 'TEXT',
                text: isTelugu
                    ? `⏰ *సమయం*: *${state.data.timeSlot}*\n----------------------------------------\n🏠 *దశ 4/5: ఇంటి చిరునామా*\n\nదయచేసి మీ ఇంటి నంబర్, అపార్ట్‌మెంట్ పేరు & వీధి/ప్రాంతం నమోదు చేయండి:\n(ఉదా: *Flat 204, Royal Palms, Banjara Hills*)`
                    : `⏰ *Time Slot*: *${state.data.timeSlot}*\n----------------------------------------\n🏠 *STEP 4 OF 5: HOME / FLAT ADDRESS*\n\nPlease enter House/Flat No., Building Name & Street/Area:\n(e.g. *Flat 204, Royal Palms Apartment, Jubilee Hills*)`
            };
        }

        // --- CAPTURE HOUSE ADDRESS ---
        case 'CAPTURE_HOUSE_ADDRESS': {
            if (rawText.trim().length < 4) {
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `❌ *దయచేసి పూర్తి చిరునామా నమోదు చేయండి (కనీసం 4 అక్షరాలు):*`
                        : `❌ *Please provide a complete house/street address (e.g. Flat 302, Sunrise Apts, MG Road):*`
                };
            }

            state.data.houseAddress = rawText.trim();
            state.step = 'CAPTURE_LANDMARK';
            return {
                type: 'TEXT',
                text: isTelugu
                    ? `🏠 *చిరునామా*: *${state.data.houseAddress}*\n----------------------------------------\n📍 *ల్యాండ్‌మార్క్ (గుర్తు)*\n\nమా సిబ్బంది మీ ఇంటిని త్వరగా చేరుకోవడానికి సమీప ల్యాండ్‌మార్క్ నమోదు చేయండి:\n(ఉదా: *Near Metro Station* లేదా *Opp. Apollo Pharmacy*)`
                    : `🏠 *Address*: *${state.data.houseAddress}*\n----------------------------------------\n📍 *NEARBY LANDMARK*\n\nPlease enter a nearby landmark so our staff can locate your home quickly:\n(e.g. *Opposite Apollo Pharmacy* or *Near Metro Station Gate 2*)`
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
                type: 'TEXT',
                text: isTelugu
                    ? `📋 *AMPLR HEALTH - బుకింగ్ వివరాల సమీక్ష*\n----------------------------------------\n🩺 *సేవ*: ${serviceBooked}\n💵 *అంచనా రుసుము*: ₹${fee}\n👤 *రోగి*: ${state.data.patientName}\n📅 *తేదీ*: ${state.data.appointmentDate}\n⏰ *సమయం*: ${state.data.timeSlotLabel}\n🏠 *చిరునామా*: ${state.data.houseAddress}\n📍 *ల్యాండ్‌మార్క్*: ${state.data.landmark}\n📮 *పిన్‌కోడ్*: ${state.data.pincode}\n----------------------------------------\n1️⃣ ✅ *బుకింగ్ నిర్ధారించండి (Confirm)*\n0️⃣ ❌ *రద్దు చేయండి (Cancel)*\n\n📲 *నిర్ధారించడానికి 1 రిప్లై ఇవ్వండి*`
                    : `📋 *AMPLR HEALTH - BOOKING REVIEW & CONFIRMATION*\n----------------------------------------\n🩺 *Service*: ${serviceBooked}\n💵 *Estimated Fee*: ₹${fee}\n👤 *Patient*: ${state.data.patientName}\n📅 *Date*: ${state.data.appointmentDate}\n⏰ *Time Slot*: ${state.data.timeSlotLabel}\n🏠 *Address*: ${state.data.houseAddress}\n📍 *Landmark*: ${state.data.landmark}\n📮 *Pincode*: ${state.data.pincode}\n----------------------------------------\n1️⃣ ✅ *Confirm Booking Now*\n0️⃣ ❌ *Cancel Booking*\n\n📲 *Reply 1 to Confirm or 0 to Cancel*`
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
                    serviceName: serviceBooked,
                    date: state.data.appointmentDate,
                    slot: state.data.timeSlot,
                    dateTime: `${state.data.appointmentDate} (${state.data.timeSlot})`,
                    address: state.data.houseAddress,
                    landmark: state.data.landmark,
                    pincode: state.data.pincode,
                    location: fullLocation,
                    amount: state.data.fee,
                    phone: userPhone,
                    status: 'Pending Assignment'
                });

                const savedPatient = state.data.patientName;
                const savedDate = state.data.appointmentDate;
                const savedSlot = state.data.timeSlot;
                const savedFee = state.data.fee;

                delete CONVERSATION_STATES[phoneKey];

                return {
                    type: 'TEXT',
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

            const partnerObj = PARTNER_FORMS[text];
            if (partnerObj) {
                return {
                    type: 'TEXT',
                    text: `🤝 *AMPLR HEALTH PARTNER ONBOARDING*\n----------------------------------------\nCategory: *${partnerObj.name}*\n\nThank you for choosing to become a valued partner with AMPLR HEALTH! 🏥\n\nPlease complete the official registration form below to begin your verification and onboarding process:\n\n👉 **Complete Partner Registration Form**:\n${partnerObj.url}\n\nOur onboarding team will review your details and contact you shortly for activation.\n----------------------------------------\n📞 Partner Support: *${HELPLINE}*\n↩️ Reply *0* for Main Menu.`
                };
            }

            return getPartnerProfessionMenu();
        }

        // --- PRICING CATALOG VIEW ---
        case 'SELECT_PRICING_CATEGORY': {
            if (text === '1') {
                state.data.selectedService = 'Doctor Consultation';
                state.step = 'SELECT_DOCTOR_SPECIALTY';
                return getDoctorSpecialtiesMenu(isTelugu);
            }
            if (text === '2') {
                state.data.selectedService = 'Nursing Services at Home';
                state.step = 'SELECT_NURSING_PROCEDURE';
                return getNursingProceduresMenu(isTelugu);
            }
            if (text === '3') {
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
        type: 'TEXT',
        text: isTelugu
            ? `⚠️ *బుకింగ్ రద్దు నిర్ధారణ*\n----------------------------------------\nమీరు మీ బుకింగ్ *${myBooking.id}* (${myBooking.serviceName}) ను ఖచ్చితంగా రద్దు చేయాలనుకుంటున్నారా?\n\n1️⃣ ✅ *అవును, రద్దు చేయండి*\n2️⃣ ❌ *వద్దు, బుకింగ్ అలాగే ఉంచండి*\n----------------------------------------\n📲 *1 లేదా 2 రిప్లై ఇవ్వండి*`
            : `⚠️ *CONFIRM CANCELLATION*\n----------------------------------------\nAre you sure you want to cancel booking *${myBooking.id}* for *${myBooking.serviceName}* on ${myBooking.date}?\n\n1️⃣ ✅ *Yes, Cancel My Booking*\n2️⃣ ❌ *No, Keep My Appointment*\n----------------------------------------\n📲 *Reply with 1 or 2*`
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
        type: 'TEXT',
        text: `🏥 *AMPLR HEALTH*\n_Brings Hospital Care to Your Home_\n----------------------------------------\nWelcome! Please select your preferred language:\nదయచేసి మీ భాషను ఎంచుకోండి:\n\n1️⃣  *English*\n2️⃣  *తెలుగు (Telugu)*\n----------------------------------------\n📲 *Reply with 1 or 2 to continue*`
    };
}

function getMainMenuEnglish() {
    return {
        type: 'TEXT',
        text: `👋 *Welcome to AMPLR HEALTH*\n_Brings Hospital Care to Your Home_\n----------------------------------------\nHow can we assist you today?\n\n1️⃣ 🩺 *Book Health Service*\n2️⃣ 📋 *Our Services & Pricing Menu*\n3️⃣ 🔍 *Check Booking Status / Cancel*\n4️⃣ 🔁 *Re-book Last Service (Repeat)*\n5️⃣ 📞 *Contact Us & Support*\n6️⃣ 🤝 *Become a Partner*\n----------------------------------------\n📲 *Reply with number (1 to 6) of your choice*`
    };
}

function getMainMenuTelugu() {
    return {
        type: 'TEXT',
        text: `👋 *AMPLR HEALTH కు స్వాగతం*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n----------------------------------------\nఈ రోజు మీకు ఎలా సహాయం చేయగలము?\n\n1️⃣ 🩺 *ఆరోగ్య సేవను బుక్ చేయండి*\n2️⃣ 📋 *మా సేవలు & ధరల జాబితా*\n3️⃣ 🔍 *బుకింగ్ స్థితి / రద్దు చేయండి*\n4️⃣ 🔁 *మునుపటి సేవను మళ్లీ బుక్ చేయండి*\n5️⃣ 📞 *మమ్మల్ని సంప్రదించండి*\n6️⃣ 🤝 *మాతో భాగస్వామ్యం అవ్వండి*\n----------------------------------------\n📲 *మీ ఎంపిక కోసం 1 నుండి 6 సంఖ్యను రిప్లై ఇవ్వండి*`
    };
}

function getServicesMenuEnglish() {
    return {
        type: 'TEXT',
        text: `🩺 *AMPLR HEALTH - SERVICES*\n----------------------------------------\nPlease select the healthcare service you require:\n\n1️⃣ 🩸 *Lab - Blood Collection at Home*\n2️⃣ 👩‍⚕️ *Nursing Services at Home*\n3️⃣ 🧓 *Caregiver / Caretaker*\n4️⃣ 🏃‍♂️ *Physiotherapy at Home*\n5️⃣ 💓 *ECG at Home*\n6️⃣ 👨‍⚕️ *Doctor Consultation (Specialist)*\n7️⃣ 🚑 *Ambulance Services (24/7)*\n8️⃣ 🏥 *Hospital / Clinic Referral*\n9️⃣ 💊 *Medicine Delivery at Home*\n----------------------------------------\n📲 *Reply with number (1 to 9) to book, or 0 for Main Menu*`
    };
}

function getServicesMenuTelugu() {
    return {
        type: 'TEXT',
        text: `🩺 *AMPLR HEALTH - సేవలు*\n----------------------------------------\nమీకు అవసరమైన ఆరోగ్య సేవను ఎంచుకోండి:\n\n1️⃣ 🩸 *ల్యాబ్ - రక్త నమూనా సేకరణ*\n2️⃣ 👩‍⚕️ *నర్సింగ్ సేవలు (ఇంటి వద్ద)*\n3️⃣ 🧓 *సంరక్షకులు / కేర్‌టేకర్‌*\n4️⃣ 🏃‍♂️ *ఫిజియోథెరపీ*\n5️⃣ 💓 *ఇంటి వద్ద ECG*\n6️⃣ 👨‍⚕️ *డాక్టర్ కన్సల్టేషన్*\n7️⃣ 🚑 *అంబులెన్స్ సేవలు (24/7)*\n8️⃣ 🏥 *ఆసుపత్రి / క్లినిక్ సేవలు*\n9️⃣ 💊 *మందుల పంపిణీ (ఇంటి వద్ద)*\n----------------------------------------\n📲 *బుక్ చేయడానికి 1 నుండి 9 రిప్లై ఇవ్వండి, లేదా 0 మెనూ కోసం*`
    };
}

function getPricingMenuEnglish() {
    return {
        type: 'TEXT',
        text: `💰 *AMPLR HEALTH - SERVICE PRICING TARIFF*\n----------------------------------------\nSelect a category to view detailed rate cards:\n\n1️⃣ 👨‍⚕️ *Doctor Consultation Rates* (₹299 - ₹799)\n2️⃣ 👩‍⚕️ *Home Nursing Procedures* (₹200 - ₹2,600)\n3️⃣ 🚑 *Ambulance Transport Slabs* (From ₹1,400)\n----------------------------------------\n📲 *Reply 1, 2, or 3, or reply 0 for Main Menu*`
    };
}

function getPricingMenuTelugu() {
    return {
        type: 'TEXT',
        text: `💰 *AMPLR HEALTH - సేవల ధరల వివరాలు*\n----------------------------------------\nవివరమైన ధరల జాబితాను చూడటానికి ఎంచుకోండి:\n\n1️⃣ 👨‍⚕️ *డాక్టర్ కన్సల్టేషన్ ఛార్జీలు* (₹299 - ₹799)\n2️⃣ 👩‍⚕️ *నర్సింగ్ సేవల ఛార్జీలు* (₹200 - ₹2,600)\n3️⃣ 🚑 *అంబులెన్స్ ఛార్జీలు* (₹1,400 నుండి)\n----------------------------------------\n📲 *1, 2, లేదా 3 రిప్లై ఇవ్వండి, లేదా 0 మెనూ కోసం*`
    };
}

function getDoctorSpecialtiesMenu(isTelugu) {
    return {
        type: 'TEXT',
        text: `👨‍⚕️ *AMPLR HEALTH - DOCTOR CONSULTATION TARIFF*\n----------------------------------------\n1️⃣ *DERM / ORTHO / PSY / ENT* ── *₹399*\n2️⃣ *PULMO / MS.SURG / URO / IVF* ── *₹599*\n3️⃣ *GASTRO / CARDIO / ENDO / NEURO* ── *₹599*\n4️⃣ *ONCO (Oncology)* ── *₹799*\n5️⃣ *AYUR / PANCHA / HOMEO* ── *₹299*\n6️⃣ *UNANI / SIDDHA / YOGA / NATURO* ── *₹299*\n7️⃣ *FERTILITY / CHRONIC* ── *₹499*\n8️⃣ *NUTRITIONIST / DIETITIAN* ── *₹299*\n----------------------------------------\n📲 *Reply with number (1 to 8) to book your doctor, or 0 for Menu*`
    };
}

function getNursingProceduresMenu(isTelugu) {
    return {
        type: 'TEXT',
        text: `👩‍⚕️ *AMPLR HEALTH - NURSING CHARGES AT HOME*\n----------------------------------------\n1️⃣ *Injection / IV Push / Cannulation* (Visit) ── *₹300*\n2️⃣ *IV Fluid Administration* (Visit) ── *₹500*\n3️⃣ *Dressing / Wound Care / Catheter* (Visit) ── *₹700*\n4️⃣ *Vasculitis Dressing* (Visit) ── *₹900*\n5️⃣ *BP / Sugar / Vitals Check* (Visit) ── *₹200*\n6️⃣ *Bedridden Patient Care* (Visit) ── *₹700*\n7️⃣ *Nursing Care (1 to 3 Hours)* ── *₹700*\n8️⃣ *Nursing Care (1 to 6 Hours)* ── *₹1,400*\n9️⃣ *Nursing Care (1 to 12 Hours)* ── *₹2,600*\n----------------------------------------\n📲 *Reply with number (1 to 9) to book nursing service, or 0 for Menu*`
    };
}

function getAmbulanceMenu(isTelugu) {
    return {
        type: 'TEXT',
        text: `🚑 *AMPLR HEALTH - AMBULANCE RATE CARD*\n----------------------------------------\n1️⃣ *TOOFAN / OMNI (Patient Transport A/C)*\n    • 1-10 km: ₹1,400  |  1-50 km: ₹4,000\n    • 1-100 km: ₹6,000 |  1-200 km: ₹10,500\n    • >300 km: ₹25 / KM | Waiting: ₹300/hr\n\n2️⃣ *TEMPO TRAVELLER (Patient Transport A/C)*\n    • 1-10 km: ₹1,800  |  1-50 km: ₹5,500\n    • 1-100 km: ₹9,500 |  1-200 km: ₹16,000\n    • >300 km: ₹30 / KM | Waiting: ₹300/hr\n\n➕ *Optional Add-ons*: Paramedic (₹1,500-₹1,700) • Oxygen (₹1,500) • Ventilator (₹4,000-₹5,000)\n----------------------------------------\n📲 *Reply 1 for Toofan/Omni or 2 for Tempo Traveller to book*`
    };
}

function getPartnerProfessionMenu() {
    return {
        type: 'TEXT',
        text: `🤝 *WELCOME TO AMPLR HEALTH PARTNER NETWORK*\n_Brings Hospital Care to Your Home_\n----------------------------------------\nGrow your healthcare services with AMPLR HEALTH.\nPlease select your profession / service category:\n\n1️⃣ 🩸 *Lab Technician (Phlebotomist)*\n2️⃣ 👩‍⚕️ *Nursing Professional*\n3️⃣ 🧓 *Caregiver / Caretaker*\n4️⃣ 🏃‍♂️ *Physiotherapist*\n5️⃣ 💓 *ECG Technician*\n6️⃣ 🚑 *Ambulance Partner*\n7️⃣ 👨‍⚕️ *Doctor*\n8️⃣ 🏥 *Hospital / Clinic*\n----------------------------------------\n📲 *Reply with number (1 to 8) to get registration form, or 0 for Menu*`
    };
}
