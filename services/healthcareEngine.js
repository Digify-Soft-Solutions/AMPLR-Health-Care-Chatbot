import { addEmergencyAlert, CONVERSATION_STATES } from '../data/mockDatabase.js';

/**
 * ============================================================================
 * AMPLR HEALTH - Master Healthcare Chatbot Engine
 * Slogan: "Brings Hospital Care to Your Home"
 * Helpline: 9849649049
 * Simplified 2-Flow Engine:
 *   1. Pricing & Tariff (Doctor, Nursing, Ambulance, Lab, Physio, Caregiver, ECG)
 *   2. Become a Healthcare Partner (Google Forms Onboarding Links)
 *   3. 24/7 Helpline & Support
 * Full Bilingual Support (English & Telugu)
 * ============================================================================
 */

const HELPLINE = process.env.BOT_PHONE_NUMBER || process.env.ADMIN_PHONE || '9849649049';

export const PARTNER_FORMS = {
    '1': { id: '1', name: 'Lab-Blood Collection (Phlebotomist)', short: 'Lab Technician / Phlebotomist', url: 'https://forms.gle/LXC4gU5E7wFVEAvcA' },
    '2': { id: '2', name: 'Nursing Professional (GNM/B.Sc)', short: 'Nursing Staff', url: 'https://forms.gle/wYAu8YUGAnjuHFwD6' },
    '3': { id: '3', name: 'Caregiver / Caretaker', short: 'Caregiver / Attendant', url: 'https://forms.gle/9kRGgy3CJr2ZXaRD8' },
    '4': { id: '4', name: 'Physiotherapist (BPT/MPT)', short: 'Physiotherapist', url: 'https://forms.gle/QB2kwRWH8gpNnz1K8' },
    '5': { id: '5', name: 'ECG Technician', short: 'ECG Technician', url: 'https://forms.gle/ihAB8nruwNo9JJjC6' },
    '6': { id: '6', name: 'Ambulance Partner / Driver', short: 'Ambulance Fleet Partner', url: 'https://forms.gle/bScLWDSmhg6RDQwh6' },
    '7': { id: '7', name: 'Doctor Consultation Specialist', short: 'Doctor (Specialist/General)', url: 'https://forms.gle/pob6vRt5reBS7YMq5' },
    '8': { id: '8', name: 'Hospital / Clinic Partnership', short: 'Hospital / Clinic Institutional Tie-up', url: 'https://forms.gle/iUWhwpiWwyGA176Q6' }
};

const EMERGENCY_KEYWORDS = [
    'chest pain', 'breathing difficulty', 'unconscious', 'emergency',
    'heavy bleeding', 'stroke', 'heart attack', 'severe pain', '108'
];

/**
 * Main Message Processor
 */
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

    // ── 2. MENU SHORTCUT (0 or menu returns to Main Menu of current language) ──
    if (text === '0' || text === 'menu') {
        const currentLang = CONVERSATION_STATES[phoneKey]?.lang || 'en';
        CONVERSATION_STATES[phoneKey] = { step: 'MAIN_MENU', lang: currentLang, data: {} };
        return currentLang === 'te' ? getMainMenuTelugu() : getMainMenuEnglish();
    }

    // ── 3. GREETINGS & LANGUAGE SELECTION RESET ───────────────────────────────
    const GREETINGS = [
        'hi', 'hii', 'hiii', 'hiee', 'hie', 'hai', 'hey',
        'hello', 'helo', 'namaste', 'namaskar', 'start',
        'restart', 'నమస్తే', 'నమస్కారం'
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

    // ── 3. DIRECT KEYWORD SHORTCUTS ──────────────────────────────────────────
    // Pricing shortcuts
    if (text.includes('price') || text.includes('tariff') || text.includes('rate') || text.includes('cost') || text.includes('ధరలు')) {
        CONVERSATION_STATES[phoneKey] = { step: 'SELECT_PRICING_CATEGORY', lang: 'en', data: {} };
        return getPricingMenuEnglish();
    }

    // Partner shortcuts
    const PARTNER_KEYWORDS = ['partner', 'partnership', 'join', 'become a partner', 'భాగస్వామ్యం', 'doctor join', 'nurse join', 'form'];
    if (PARTNER_KEYWORDS.some(kw => text === kw || text.includes(kw))) {
        CONVERSATION_STATES[phoneKey] = { step: 'PARTNER_SELECT_PROFESSION', lang: 'en', data: {} };
        return getPartnerProfessionMenu();
    }

    // Support shortcut
    if (text.includes('helpline') || text.includes('support') || text.includes('call') || text.includes('contact') || text.includes('సంప్రదించండి')) {
        return getHelplineResponse(false);
    }

    // ── 4. INITIAL STATE FALLBACK ────────────────────────────────────────────
    if (!CONVERSATION_STATES[phoneKey]) {
        CONVERSATION_STATES[phoneKey] = { step: 'SELECT_LANGUAGE', data: {} };
        return getLanguageMenu();
    }

    const state = CONVERSATION_STATES[phoneKey];
    const isTelugu = state.lang === 'te';

    // ── 5. STATE MACHINE ─────────────────────────────────────────────────────
    switch (state.step) {

        // --- STEP 1: SELECT LANGUAGE ---
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
                    type: 'INTERACTIVE_BUTTONS',
                    text: `Please select your preferred language:\nదయచేసి మీ భాషను ఎంచుకోండి:`,
                    buttons: [
                        { id: '1', text: '🇬🇧 English' },
                        { id: '2', text: '🇮🇳 తెలుగు' }
                    ]
                };
            }
        }

        // --- STEP 2: MAIN MENU (3 Options: Pricing, Partner, Helpline) ---
        case 'MAIN_MENU': {
            // Option 1: Pricing & Tariff
            if (text === '1' || text.includes('pricing') || text.includes('tariff') || text.includes('rate') || text.includes('ధరలు')) {
                state.step = 'SELECT_PRICING_CATEGORY';
                return isTelugu ? getPricingMenuTelugu() : getPricingMenuEnglish();
            }
            // Option 2: Become a Partner
            else if (text === '2' || text.includes('partner') || text.includes('భాగస్వామ్యం') || text.includes('form')) {
                state.step = 'PARTNER_SELECT_PROFESSION';
                return isTelugu ? getPartnerProfessionMenuTelugu() : getPartnerProfessionMenu();
            }
            // Option 3: 24/7 Helpline & Support
            else if (text === '3' || text.includes('helpline') || text.includes('support') || text.includes('contact') || text.includes('కాల్')) {
                return getHelplineResponse(isTelugu);
            } else {
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }
        }

        // --- STEP 3: PRICING & TARIFF CATEGORIES ---
        case 'SELECT_PRICING_CATEGORY': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }

            // Category 1: Doctor Consultation
            if (text === '1' || text.includes('doctor') || text.includes('డాక్టర్')) {
                return getDoctorPricingDetails(isTelugu);
            }
            // Category 2: Home Nursing
            if (text === '2' || text.includes('nursing') || text.includes('nurse') || text.includes('నర్సింగ్')) {
                return getNursingPricingDetails(isTelugu);
            }
            // Category 3: Ambulance
            if (text === '3' || text.includes('ambulance') || text.includes('అంబులెన్స్')) {
                return getAmbulancePricingDetails(isTelugu);
            }
            // Category 4: Lab & Blood Tests
            if (text === '4' || text.includes('lab') || text.includes('blood') || text.includes('ల్యాబ్')) {
                return getLabPricingDetails(isTelugu);
            }
            // Category 5: Caregiver / Caretaker
            if (text === '5' || text.includes('care') || text.includes('కేర్‌టేకర్')) {
                return getCaregiverPricingDetails(isTelugu);
            }
            // Category 6: Physiotherapy & ECG
            if (text === '6' || text.includes('physio') || text.includes('ecg') || text.includes('ఫిజియో')) {
                return getPhysioEcgPricingDetails(isTelugu);
            }
            // Category 7: Complete Overview
            if (text === '7' || text.includes('all') || text.includes('full') || text.includes('overview') || text.includes('మొత్తం')) {
                return getCompletePricingOverview(isTelugu);
            }

            return isTelugu ? getPricingMenuTelugu() : getPricingMenuEnglish();
        }

        // --- STEP 4: PARTNER SELECTION & FORM LINK DELIVERY ---
        case 'PARTNER_SELECT_PROFESSION': {
            if (text === '0' || text === 'menu') {
                state.step = 'MAIN_MENU';
                return isTelugu ? getMainMenuTelugu() : getMainMenuEnglish();
            }

            let chosenKey = null;
            if (PARTNER_FORMS[text]) chosenKey = text;
            else {
                const m = text.match(/^[1-8]/);
                if (m && PARTNER_FORMS[m[0]]) chosenKey = m[0];
                else if (text.includes('lab') || text.includes('phlebo') || text.includes('blood') || text.includes('ల్యాబ్')) chosenKey = '1';
                else if (text.includes('nurs') || text.includes('నర్సింగ్')) chosenKey = '2';
                else if (text.includes('care') || text.includes('కేర్‌టేకర్')) chosenKey = '3';
                else if (text.includes('physio') || text.includes('ఫిజియో')) chosenKey = '4';
                else if (text.includes('ecg') || text.includes('ఈసీజీ')) chosenKey = '5';
                else if (text.includes('ambulance') || text.includes('driver') || text.includes('అంబులెన్స్')) chosenKey = '6';
                else if (text.includes('doctor') || text.includes('డాక్టర్')) chosenKey = '7';
                else if (text.includes('hospital') || text.includes('clinic') || text.includes('హాస్పిటల్')) chosenKey = '8';
            }

            const partnerObj = chosenKey ? PARTNER_FORMS[chosenKey] : null;
            if (partnerObj) {
                const partnerRefId = 'PTR-' + Math.floor(10000 + Math.random() * 90000);
                return {
                    type: 'TEXT',
                    text: isTelugu
                        ? `🤝 *AMPLR HEALTH - భాగస్వామ్య నమోదు*\n----------------------------------------\n🩺 *విభాగం*: *${partnerObj.name}*\n🔖 *రిఫరెన్స్ ID*: *${partnerRefId}*\n\nAMPLR HEALTH నెట్‌వర్క్‌లో చేరడానికి ఆసక్తి చూపినందుకు ధన్యవాదాలు! 🏥\n\n👉 *అధికారిక భాగస్వామ్య దరఖాస్తు ఫారమ్*:\n${partnerObj.url}\n\n📝 *గమనిక*: దయచేసి పై లింక్ ఓపెన్ చేసి వివరాలు నమోదు చేయండి. మా ఆన్‌బోర్డింగ్ బృందం 24 గంటల్లో మిమ్మల్ని సంప్రదిస్తుంది.\n----------------------------------------\n📞 హెల్ప్‌లైన్: *${HELPLINE}*\n↩️ ప్రధాన మెనూ కోసం *0* లేదా *Hi* టైప్ చేయండి.`
                        : `🤝 *AMPLR HEALTH - PARTNER ONBOARDING*\n----------------------------------------\n🩺 *Category*: *${partnerObj.name}*\n🔖 *Reference ID*: *${partnerRefId}*\n\nThank you for choosing to partner with AMPLR HEALTH! 🏥\n\n👉 *Official Partner Application Form*:\n${partnerObj.url}\n\n📝 *Note*: Please click the Google Form link above and submit your credentials. Our onboarding team will contact you within 24 hours.\n----------------------------------------\n📞 Partner Desk: *${HELPLINE}*\n↩️ Reply *0* or *Hi* for Main Menu.`
                };
            }

            return isTelugu ? getPartnerProfessionMenuTelugu() : getPartnerProfessionMenu();
        }

        default: {
            CONVERSATION_STATES[phoneKey] = { step: 'MAIN_MENU', lang: state.lang || 'en', data: {} };
            return state.lang === 'te' ? getMainMenuTelugu() : getMainMenuEnglish();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MENUS & TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

function getLanguageMenu() {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `🏥 *Welcome to AMPLR HEALTH*\n_Brings Hospital Care to Your Home_\n----------------------------------------\nPlease choose your preferred language:\nదయచేసి మీ భాషను ఎంచుకోండి:`,
        buttons: [
            { id: '1', text: '🇬🇧 English' },
            { id: '2', text: '🇮🇳 తెలుగు' }
        ]
    };
}

function getMainMenuEnglish() {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `🏥 *Welcome to AMPLR HEALTH*\n_Brings Hospital Care to Your Home_\n----------------------------------------\nHow can our healthcare team assist you today?\n\n1️⃣ 💰 *Pricing & Tariff* (View rates for Doctor, Nursing, Ambulance, Lab & more)\n2️⃣ 🤝 *Become a Healthcare Partner* (Join our clinical network - Form Links)\n3️⃣ 📞 *24/7 Helpline & Support* (Speak to Care Coordinator)\n----------------------------------------\n👇 *Tap a button below or reply 1, 2, 3:*`,
        buttons: [
            { id: '1', text: '💰 Pricing & Tariff' },
            { id: '2', text: '🤝 Become a Partner' },
            { id: '3', text: '📞 24/7 Helpline' }
        ]
    };
}

function getMainMenuTelugu() {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `🏥 *AMPLR HEALTH కు స్వాగతం*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n----------------------------------------\nఈ రోజు మీకు ఎలా సహాయం చేయగలము?\n\n1️⃣ 💰 *ధరల జాబితా (Pricing & Tariff)*\n2️⃣ 🤝 *భాగస్వామి అవ్వండి (Become a Partner)*\n3️⃣ 📞 *24/7 హెల్ప్‌లైన్ (Helpline & Support)*\n----------------------------------------\n👇 *క్రింది బటన్ నొక్కండి లేదా 1, 2, 3 రిప్లై ఇవ్వండి:*`,
        buttons: [
            { id: '1', text: '💰 ధరల వివరాలు' },
            { id: '2', text: '🤝 భాగస్వామ్యం' },
            { id: '3', text: '📞 హెల్ప్‌లైన్' }
        ]
    };
}

function getHelplineResponse(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🏥 *AMPLR HEALTH - 24/7 హెల్ప్‌లైన్ & మద్దతు*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n----------------------------------------\n📞 అధికారిక హెల్ప్‌లైన్: *${HELPLINE}*\n⏰ సేవ సమయం: 24/7 అందుబాటులో ఉంది\n\n💬 ఏదైనా సేవ బుకింగ్ లేదా సమాచారం కోసం మా కేర్ కోఆర్డినేటర్‌ను సంప్రదించండి.\n----------------------------------------\n↩️ ప్రధాన మెనూ కోసం *0* లేదా *Hi* రిప్లై ఇవ్వండి.`
            : `🏥 *AMPLR HEALTH - 24/7 HELPLINE & SUPPORT*\n_Brings Hospital Care to Your Home_\n----------------------------------------\n📞 **Official Helpline**: *${HELPLINE}*\n⏰ **Service Hours**: 24/7 Available\n\n💬 For inquiries, home care service requests, or direct coordination, our support team is available 24/7.\n----------------------------------------\n↩️ Reply *0* or *Hi* for Main Menu.`
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING MENUS & DETAILS
// ─────────────────────────────────────────────────────────────────────────────

function getPricingMenuEnglish() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `💰 *AMPLR HEALTH - SERVICE PRICING & TARIFF*\n----------------------------------------\nPlease select a healthcare category to view official rates:\n\n1️⃣ 👨‍⚕️ *Doctor Consultation Rates* (₹299 – ₹799)\n2️⃣ 👩‍⚕️ *Home Nursing Procedures* (₹200 – ₹2,600)\n3️⃣ 🚑 *Ambulance Transport Slabs* (From ₹1,400)\n4️⃣ 🩸 *Lab & Blood Tests at Home* (From ₹200)\n5️⃣ 🧓 *Caregiver / Attendant* (₹1,200 / ₹2,000)\n6️⃣ 🏃‍♂️ *Physiotherapy & ECG at Home* (₹900 / ₹1,100)\n7️⃣ 📋 *Complete Tariff Overview* (All Services)\n----------------------------------------\n👇 *Tap 'View Rates' below or reply 1 to 7:*`,
        listTitle: '💰 View Rates',
        sections: [
            {
                title: 'Healthcare Pricing',
                rows: [
                    { id: '1', title: '1️⃣ Doctor Rates', description: 'Tele-consult by specialty (₹299 - ₹799)' },
                    { id: '2', title: '2️⃣ Nursing Procedures', description: 'Injections, IV drip, dressing & shifts' },
                    { id: '3', title: '3️⃣ Ambulance Slabs', description: 'Toofan / Tempo with O2 & Ventilator' },
                    { id: '4', title: '4️⃣ Lab & Blood Tests', description: 'Doorstep tests & health checkups' },
                    { id: '5', title: '5️⃣ Caregiver Care', description: '12-Hour / 24-Hour elderly bedside care' },
                    { id: '6', title: '6️⃣ Physio & ECG', description: 'Physiotherapy & 12-lead doorstep ECG' },
                    { id: '7', title: '7️⃣ Complete Overview', description: 'Full price list of all AMPLR services' }
                ]
            }
        ]
    };
}

function getPricingMenuTelugu() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `💰 *AMPLR HEALTH - సేవల ధరల వివరాలు (Tariff)*\n----------------------------------------\nవివరమైన ధరల జాబితాను చూడటానికి ఒక విభాగాన్ని ఎంచుకోండి:\n\n1️⃣ 👨‍⚕️ *డాక్టర్ కన్సల్టేషన్ ఛార్జీలు* (₹299 – ₹799)\n2️⃣ 👩‍⚕️ *నర్సింగ్ సేవల ఛార్జీలు* (₹200 – ₹2,600)\n3️⃣ 🚑 *అంబులెన్స్ రేట్లు* (₹1,400 నుండి)\n4️⃣ 🩸 *ల్యాబ్ & రక్త పరీక్షలు* (₹200 నుండి)\n5️⃣ 🧓 *కేర్‌టేకర్ / సంరక్షకులు* (₹1,200 / ₹2,000)\n6️⃣ 🏃‍♂️ *ఫిజియోథెరపీ & ECG* (₹900 / ₹1,100)\n7️⃣ 📋 *మొత్తం సేవల ధరల సారాంశం*\n----------------------------------------\n👇 *క్రింది 'ధరలు చూడండి' నొక్కండి లేదా 1-7 రిప్లై ఇవ్వండి:*`,
        listTitle: '💰 ధరలు చూడండి',
        sections: [
            {
                title: 'సేవల ధరల జాబితా',
                rows: [
                    { id: '1', title: '1️⃣ డాక్టర్ రేట్లు', description: 'స్పెషలిస్ట్ కన్సల్టేషన్ (₹299 - ₹799)' },
                    { id: '2', title: '2️⃣ నర్సింగ్ సేవలు', description: 'ఇంజెక్షన్లు, డ్రెస్సింగ్, సెలైన్, షిఫ్ట్‌లు' },
                    { id: '3', title: '3️⃣ అంబులెన్స్ రేట్లు', description: 'ఆక్సిజన్ & వెంటిలేటర్ సదుపాయం' },
                    { id: '4', title: '4️⃣ ల్యాబ్ రక్త పరీక్షలు', description: 'ఇంటి వద్దకే రక్త నమూనా సేకరణ' },
                    { id: '5', title: '5️⃣ కేర్‌టేకర్ సేవలు', description: '12 / 24 గంటల వృద్ధుల సంరక్షణ' },
                    { id: '6', title: '6️⃣ ఫిజియో & ECG', description: 'ఫిజియోథెరపీ & 12-లీడ్ ECG పరీక్ష' },
                    { id: '7', title: '7️⃣ మొత్తం ధరలు', description: 'అన్ని సేవల ధరల పూర్తి వివరాలు' }
                ]
            }
        ]
    };
}

function getDoctorPricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `👨‍⚕️ *AMPLR HEALTH - డాక్టర్ సంప్రదింపుల ధరలు*\n----------------------------------------\nనిపుణుల టెలి-కన్సల్టేషన్ రేట్లు:\n\n• *డెర్మటాలజీ / ఆర్థోపెడిక్స్ / ENT / సైకియాట్రీ*: ₹399\n• *పల్మోనాలజీ / యూరాలజీ / జనరల్ సర్జరీ / IVF*: ₹599\n• *గ్యాస్ట్రో / కార్డియాలజీ / న్యూరాలజీ / ఎండోక్రైన్*: ₹599\n• *ఆంకాలజీ (క్యాన్సర్ నిపుణులు)*: ₹799\n• *ఆయుర్వేదం / హోమియోపతి*: ₹299\n• *యునాని / సిద్ధ / యోగా & నేచురోపతి*: ₹299\n• *ఫెర్టిలిటీ & క్రానిక్ కేర్*: ₹499\n• *న్యూట్రిషనిస్ట్ & క్లినికల్ డైట్*: ₹299\n----------------------------------------\n📞 అపాయింట్‌మెంట్ కోసం హెల్ప్‌లైన్‌కు కాల్ చేయండి: *${HELPLINE}*\n↩️ ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
            : `👨‍⚕️ *AMPLR HEALTH - DOCTOR CONSULTATION TARIFF*\n----------------------------------------\nOfficial Tele-Consultation Specialty Rates:\n\n• *DERM / ORTHO / PSY / ENT*: ₹399\n• *PULMO / MS.SURG / URO / IVF*: ₹599\n• *GASTRO / CARDIO / ENDO / NEURO*: ₹599\n• *ONCO (Oncology / Cancer Specialist)*: ₹799\n• *AYUR / PANCHA / HOMEO*: ₹299\n• *UNANI / SIDDHA / YOGA / NATUROPATHY*: ₹299\n• *FERTILITY / CHRONIC CARE*: ₹499\n• *NUTRITIONIST / CLINICAL DIET*: ₹299\n----------------------------------------\n📞 To consult or book, call 24/7: *${HELPLINE}*\n↩️ Reply *0* for Main Menu.`
    };
}

function getNursingPricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `👩‍⚕️ *AMPLR HEALTH - నర్సింగ్ సేవల ధరలు*\n----------------------------------------\nఇంటి వద్ద క్లినికల్ ప్రొసీజర్స్:\n• బీపీ & బ్లడ్ షుగర్ చెకప్: ₹200\n• ఇంజెక్షన్ / IV పుష్ (క్యాన్యులా): ₹300\n• IV ఫ్లూయిడ్ / సెలైన్ డ్రిప్: ₹500\n• గాయం డ్రెస్సింగ్ & క్యాథెటర్ కేర్: ₹700\n• వాస్కులైటిస్ & క్లిష్టమైన అల్సర్ కేర్: ₹900\n• మంచంపై ఉన్న రోగుల సంరక్షణ: ₹700\n\nనర్సింగ్ డెడికేటెడ్ షిఫ్ట్‌లు:\n• 1 నుండి 3 గంటల షిఫ్ట్: ₹700\n• 1 నుండి 6 గంటల షిఫ్ట్: ₹1,400\n• 1 నుండి 12 గంటల డే/నైట్ షిఫ్ట్: ₹2,600\n----------------------------------------\n📞 నర్సింగ్ సేవల కోసం కాల్ చేయండి: *${HELPLINE}*\n↩️ ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
            : `👩‍⚕️ *AMPLR HEALTH - HOME NURSING PROCEDURES & TARIFF*\n----------------------------------------\nClinical Visit Procedures:\n• BP & Blood Sugar Check: ₹200\n• Injection / IV Push (Cannula): ₹300\n• IV Fluid / Saline Infusion: ₹500\n• Wound Dressing & Foley Catheter: ₹700\n• Vasculitis & Complex Ulcer Care: ₹900\n• Bedridden Patient Hygiene & Care: ₹700\n\nDedicated Hourly Nurse Shifts:\n• 1 to 3 Hours Shift: ₹700\n• 1 to 6 Hours Shift: ₹1,400\n• 1 to 12 Hours Day/Night Shift: ₹2,600\n----------------------------------------\n📞 To schedule a nurse, call 24/7: *${HELPLINE}*\n↩️ Reply *0* for Main Menu.`
    };
}

function getAmbulancePricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🚑 *AMPLR HEALTH - 24/7 అంబులెన్స్ ఛార్జీలు*\n----------------------------------------\n1️⃣ *తూఫాన్ / ఓమ్ని A/C (రోగి రవాణా)*:\n• 1-10 కి.మీ: ₹1,400\n• 1-50 కి.మీ: ₹4,000\n• 1-100 కి.మీ: ₹6,000\n• 1-200 కి.మీ: ₹10,500\n\n2️⃣ *టెంపో ట్రావెలర్ A/C*:\n• 1-10 కి.మీ: ₹1,800\n• 1-50 కి.మీ: ₹5,500\n• 1-100 కి.మీ: ₹9,500\n• 1-200 కి.మీ: ₹16,000\n\n➕ *మెడికల్ పరికరాల అదనపు ఛార్జీలు*:\n• పారామెడిక్ సిబ్బంది: +₹1,500\n• ఆక్సిజన్ సపోర్ట్: +₹1,500\n• ICU వెంటిలేటర్ సదుపాయం: +₹4,500\n----------------------------------------\n📞 అత్యవసర అంబులెన్స్ కోసం కాల్ చేయండి: *${HELPLINE}*\n↩️ ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
            : `🚑 *AMPLR HEALTH - 24/7 AMBULANCE TARIFF*\n----------------------------------------\n1️⃣ *Toofan / Omni A/C (Patient Transport)*:\n• 1-10 km: ₹1,400\n• 1-50 km: ₹4,000\n• 1-100 km: ₹6,000\n• 1-200 km: ₹10,500\n\n2️⃣ *Tempo Traveller A/C*:\n• 1-10 km: ₹1,800\n• 1-50 km: ₹5,500\n• 1-100 km: ₹9,500\n• 1-200 km: ₹16,000\n\n➕ *Medical Configurations*:\n• Paramedic Staff: +₹1,500\n• Oxygen Support: +₹1,500\n• ICU Ventilator: +₹4,500\n----------------------------------------\n📞 24/7 Ambulance Dispatch: *${HELPLINE}*\n↩️ Reply *0* for Main Menu.`
    };
}

function getLabPricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🩸 *AMPLR HEALTH - ల్యాబ్ రక్త పరీక్షలు*\n----------------------------------------\nసర్టిఫైడ్ ఫ్లెబోటోమిస్ట్ ద్వారా ఇంటి వద్ద నమూనా సేకరణ:\n\n• బ్లడ్ షుగర్ (Fasting / PP): ₹200\n• కంప్లీట్ బ్లడ్ పిక్చర్ (CBC): ₹350\n• లిపిడ్ ప్రొఫైల్ (కొలెస్ట్రాల్): ₹550\n• థైరాయిడ్ ప్రొఫైల్ (T3, T4, TSH): ₹500\n• లివర్ ఫంక్షన్ టెస్ట్ (LFT): ₹650\n• కిడ్నీ ఫంక్షన్ టెస్ట్ (KFT): ₹650\n• HbA1c (3 నెలల షుగర్ టెస్ట్): ₹500\n• సంపూర్ణ బాడీ చెకప్ ప్యాకేజీ: ₹1,299 నుండి ప్రారంభం\n_(₹800 పైన ఉచిత హోమ్ కలెక్షన్)_\n----------------------------------------\n📞 రక్త పరీక్ష బుకింగ్ కోసం కాల్ చేయండి: *${HELPLINE}*\n↩️ ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
            : `🩸 *AMPLR HEALTH - LAB BLOOD COLLECTION AT HOME*\n----------------------------------------\nDoorstep sample collection by certified phlebotomists:\n\n• Blood Sugar (Fasting / PP): ₹200\n• Complete Blood Picture (CBC): ₹350\n• Lipid Profile (Cholesterol): ₹550\n• Thyroid Profile (T3, T4, TSH): ₹500\n• Liver Function Test (LFT): ₹650\n• Kidney Function Test (KFT): ₹650\n• HbA1c (3-Month Average Sugar): ₹500\n• Full Body Health Checkup Package: From ₹1,299\n_(Free doorstep collection on orders above ₹800)_\n----------------------------------------\n📞 To schedule lab test, call 24/7: *${HELPLINE}*\n↩️ Reply *0* for Main Menu.`
    };
}

function getCaregiverPricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🧓 *AMPLR HEALTH - సంరక్షకులు / కేర్‌టేకర్ సేవలు*\n----------------------------------------\nవృద్ధులు మరియు మంచంపై ఉన్న రోగులకు నిరంతర సహాయం:\n\n• 12 గంటల డే లేదా నైట్ షిఫ్ట్: రోజుకు ₹1,200\n• 24 గంటల లైవ్-ఇన్ సంరక్షణ: రోజుకు ₹2,000\n• నెలవారీ ప్యాకేజీలు: ప్రత్యేక తగ్గింపుతో అందుబాటులో ఉన్నాయి\n\nసేవలు: వ్యక్తిగత పరిశుభ్రత, మొబిలిటీ మద్దతు, ఆహారం తినిపించడం, మందుల రిమైండర్లు.\n----------------------------------------\n📞 కేర్‌టేకర్ సేవల కోసం కాల్ చేయండి: *${HELPLINE}*\n↩️ ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
            : `🧓 *AMPLR HEALTH - CAREGIVER & BEDSIDE ATTENDANT*\n----------------------------------------\nDedicated home care for elderly & recovering patients:\n\n• 12-Hour Day / Night Shift: ₹1,200 per day\n• 24-Hour Live-in Care: ₹2,000 per day\n• Monthly Long-Term Plans: Custom discounted rates\n\nIncludes: Personal hygiene, mobility assistance, feeding support, medication reminders, vital monitoring.\n----------------------------------------\n📞 To request a caregiver, call 24/7: *${HELPLINE}*\n↩️ Reply *0* for Main Menu.`
    };
}

function getPhysioEcgPricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🏃‍♂️ *ఫిజియోథెరపీ & 💓 ఇంటి వద్ద ECG పరీక్ష*\n----------------------------------------\n• 🏃‍♂️ *ఫిజియోథెరపీ సెషన్*: ₹900 / 45 నిమిషాల విజిట్\n  (పక్షవాతం, ఆపరేషన్ తర్వాత రికవరీ, నడుము/కీళ్ల నొప్పుల చికిత్స)\n\n• 💓 *12-లీడ్ డిజిటల్ ECG*: ₹1,100 / టెస్ట్\n  (ఇంటి వద్దే తక్షణ పరీక్ష మరియు కార్డియాలజిస్ట్ వెరిఫైడ్ రిపోర్ట్)\n----------------------------------------\n📞 బుకింగ్ కోసం కాల్ చేయండి: *${HELPLINE}*\n↩️ ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
            : `🏃‍♂️ *PHYSIOTHERAPY & 💓 ECG AT HOME*\n----------------------------------------\n• 🏃‍♂️ *Physiotherapy Session*: ₹900 per 45-min visit\n  (Stroke rehab, post-surgery recovery, paralysis, chronic joint/back pain)\n\n• 💓 *12-Lead Digital ECG*: ₹1,100 per test\n  (Conducted at your doorstep with instant cardiologist-verified digital report)\n----------------------------------------\n📞 To schedule a visit, call 24/7: *${HELPLINE}*\n↩️ Reply *0* for Main Menu.`
    };
}

function getCompletePricingOverview(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `📋 *AMPLR HEALTH - సేవల ధరల పూర్తి సారాంశం*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n----------------------------------------\n• 👨‍⚕️ *డాక్టర్ సంప్రదింపులు*: ₹299 – ₹799\n• 👩‍⚕️ *నర్సింగ్ సేవలు*: ₹200 – ₹900 (షిఫ్ట్‌లు: ₹700 – ₹2,600)\n• 🚑 *అంబులెన్స్ సేవలు*: ₹1,400 నుండి (O2/ICU అందుబాటులో ఉంది)\n• 🩸 *ల్యాబ్ రక్త పరీక్షలు*: ₹200 నుండి (హెల్త్ ప్యాకేజీలు ₹1,299)\n• 🧓 *సంరక్షకులు / కేర్‌టేకర్*: ₹1,200 (12 గంటలు) / ₹2,000 (24 గంటలు)\n• 🏃‍♂️ *ఫిజియోథెరపీ*: ₹900 / సెషన్\n• 💓 *ఇంటి వద్ద ECG*: ₹1,100 / టెస్ట్\n----------------------------------------\n📞 ఏదైనా సేవ బుకింగ్ కోసం కాల్ చేయండి: *${HELPLINE}*\n↩️ ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి.`
            : `📋 *AMPLR HEALTH - COMPLETE TARIFF OVERVIEW*\n_Brings Hospital Care to Your Home_\n----------------------------------------\n• 👨‍⚕️ *Doctor Tele-Consult*: ₹299 – ₹799 (by specialty)\n• 👩‍⚕️ *Nursing Procedures*: ₹200 – ₹900 (Shifts: ₹700 – ₹2,600)\n• 🚑 *24/7 Ambulance*: From ₹1,400 (O2 & ICU Ventilator options)\n• 🩸 *Lab Blood Tests*: From ₹200 (Checkups from ₹1,299)\n• 🧓 *Caregiver / Attendant*: ₹1,200 (12h) / ₹2,000 (24h)\n• 🏃‍♂️ *Physiotherapy at Home*: ₹900 / session\n• 💓 *12-Lead Doorstep ECG*: ₹1,100 / test\n----------------------------------------\n📞 To book any service, call 24/7: *${HELPLINE}*\n↩️ Reply *0* for Main Menu.`
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER NETWORK MENUS
// ─────────────────────────────────────────────────────────────────────────────

function getPartnerProfessionMenu() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `🤝 *AMPLR HEALTH PARTNER NETWORK*\n_Brings Hospital Care to Your Home_\n----------------------------------------\nPartner with us to provide healthcare services across the region.\nPlease select your profession to receive the application form link:\n\n1️⃣ 🩸 *Lab-Blood Collection (Phlebotomist)*\n2️⃣ 👩‍⚕️ *Nursing Professional (GNM/B.Sc)*\n3️⃣ 🧓 *Caregiver / Caretaker*\n4️⃣ 🏃‍♂️ *Physiotherapist (BPT/MPT)*\n5️⃣ 💓 *ECG Technician*\n6️⃣ 🚑 *Ambulance Fleet Partner*\n7️⃣ 👨‍⚕️ *Doctor Consultation Specialist*\n8️⃣ 🏥 *Hospital / Clinic Partnership*\n----------------------------------------\n👇 *Tap 'Select Profession' below or reply 1 to 8:*`,
        listTitle: '🤝 Select Category',
        sections: [
            {
                title: 'Healthcare Categories',
                rows: [
                    { id: '1', title: '1️⃣ Lab Phlebotomist', description: 'Home blood & sample collection' },
                    { id: '2', title: '2️⃣ Nursing Professional', description: 'GNM / B.Sc Nurse for home procedures' },
                    { id: '3', title: '3️⃣ Caregiver Caretaker', description: 'Elderly care & bedside assistance' },
                    { id: '4', title: '4️⃣ Physiotherapist', description: 'BPT / MPT home rehabilitation' },
                    { id: '5', title: '5️⃣ ECG Technician', description: 'Home ECG testing & cardiac screening' },
                    { id: '6', title: '6️⃣ Ambulance Partner', description: 'Transport, BLS & ACLS fleet' },
                    { id: '7', title: '7️⃣ Doctor Specialist', description: 'General & Specialist Tele-consult' },
                    { id: '8', title: '8️⃣ Hospital / Clinic', description: 'Institutional healthcare tie-up' }
                ]
            }
        ]
    };
}

function getPartnerProfessionMenuTelugu() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `🤝 *AMPLR HEALTH భాగస్వామ్య నెట్‌వర్క్*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n----------------------------------------\nమా ఆరోగ్య సంరక్షణ నెట్‌వర్క్‌లో చేరడానికి దరఖాస్తు ఫారమ్ లింక్ కోసం మీ విభాగాన్ని ఎంచుకోండి:\n\n1️⃣ 🩸 *ల్యాబ్ రక్త సేకరణ (ఫ్లెబోటోమిస్ట్)*\n2️⃣ 👩‍⚕️ *నర్సింగ్ ప్రొఫెషనల్*\n3️⃣ 🧓 *కేర్‌టేకర్ / సంరక్షకులు*\n4️⃣ 🏃‍♂️ *ఫిజియోథెరపిస్ట్*\n5️⃣ 💓 *ECG టెక్నీషియన్*\n6️⃣ 🚑 *అంబులెన్స్ భాగస్వామి / డ్రైవర్*\n7️⃣ 👨‍⚕️ *డాక్టర్ సంప్రదింపులు*\n8️⃣ 🏥 *హాస్పిటల్ / క్లినిక్ భాగస్వామ్యం*\n----------------------------------------\n👇 *క్రింది 'ఎంచుకోండి' నొక్కండి లేదా 1-8 రిప్లై ఇవ్వండి:*`,
        listTitle: '🤝 ఎంచుకోండి',
        sections: [
            {
                title: 'భాగస్వామ్య విభాగాలు',
                rows: [
                    { id: '1', title: '1️⃣ ల్యాబ్ ఫ్లెబోటోమిస్ట్', description: 'ఇంటి వద్ద రక్త నమూనా సేకరణ' },
                    { id: '2', title: '2️⃣ నర్సింగ్ ప్రొఫెషనల్', description: 'ఇంటి వద్ద నర్సింగ్ సేవలు' },
                    { id: '3', title: '3️⃣ కేర్‌టేకర్ సేవలు', description: 'వృద్ధుల సంరక్షణ మరియు సహాయం' },
                    { id: '4', title: '4️⃣ ఫిజియోథెరపిస్ట్', description: 'ఇంటి వద్ద ఫిజియోథెరపీ' },
                    { id: '5', title: '5️⃣ ECG టెక్నీషియన్', description: 'ఇంటి వద్ద ECG పరీక్ష' },
                    { id: '6', title: '6️⃣ అంబులెన్స్ భాగస్వామి', description: 'అంబులెన్స్ సర్వీస్ పార్టనర్' },
                    { id: '7', title: '7️⃣ డాక్టర్ స్పెషలిస్ట్', description: 'టెలి-కన్సల్టేషన్ పార్టనర్' },
                    { id: '8', title: '8️⃣ ఆసుపత్రి / క్లినిక్', description: 'సంస్థాగత టై-అప్' }
                ]
            }
        ]
    };
}
