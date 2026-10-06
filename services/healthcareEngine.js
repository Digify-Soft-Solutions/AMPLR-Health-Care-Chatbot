import { addEmergencyAlert, CONVERSATION_STATES } from '../data/mockDatabase.js';

/**
 * ============================================================================
 * AMPLR HEALTH - Master Healthcare Chatbot Engine
 * Slogan: "Brings Hospital Care to Your Home"
 * Official Website: https://amplrhealth.com/
 * 24/7 Helpline: 9849649049
 *
 * Core Flows:
 *   1. Pricing & Tariff (Doctor, Nursing, Ambulance, Lab, Physio, Caregiver, ECG)
 *   2. Become a Healthcare Partner (Google Forms Onboarding Links)
 * Bilingual: English & Telugu
 * ============================================================================
 */

const HELPLINE = process.env.BOT_PHONE_NUMBER || process.env.ADMIN_PHONE || '9849649049';
const WEBSITE_URL = 'https://amplrhealth.com/';

export const PARTNER_FORMS = {
    '1': { id: '1', name: 'Lab-Blood Collection (Phlebotomist)', short: 'Lab Technician / Phlebotomist', url: 'https://forms.gle/LXC4gU5E7wFVEAvcA' },
    '2': { id: '2', name: 'Nursing Professional (GNM / B.Sc)', short: 'Nursing Professional', url: 'https://forms.gle/wYAu8YUGAnjuHFwD6' },
    '3': { id: '3', name: 'Caregiver / Bedside Attendant', short: 'Caregiver / Caretaker', url: 'https://forms.gle/9kRGgy3CJr2ZXaRD8' },
    '4': { id: '4', name: 'Physiotherapist (BPT / MPT)', short: 'Physiotherapist', url: 'https://forms.gle/QB2kwRWH8gpNnz1K8' },
    '5': { id: '5', name: 'ECG Clinical Technician', short: 'ECG Technician', url: 'https://forms.gle/ihAB8nruwNo9JJjC6' },
    '6': { id: '6', name: 'Ambulance Partner / Driver', short: 'Ambulance Fleet Partner', url: 'https://forms.gle/bScLWDSmhg6RDQwh6' },
    '7': { id: '7', name: 'Doctor Consultation Specialist', short: 'Doctor Specialist', url: 'https://forms.gle/pob6vRt5reBS7YMq5' },
    '8': { id: '8', name: 'Hospital / Clinic Partnership', short: 'Hospital / Clinic Tie-up', url: 'https://forms.gle/iUWhwpiWwyGA176Q6' }
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

    // Convert digit emojis like 1️⃣ to '1'
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
            text: `🚨 *URGENT CLINICAL NOTICE*\n━━━━━━━━━━━━━━━━━━━━\nIf the patient is experiencing a life-threatening medical emergency:\n\n1️⃣ Please dial *108 Emergency Ambulance* immediately.\n2️⃣ Our Clinical Escalation Team has been notified.\n\n📞 *24/7 Support Line*: *${HELPLINE}*\n🌐 *Official Portal*: ${WEBSITE_URL}\n━━━━━━━━━━━━━━━━━━━━\n_AMPLR HEALTH provides planned home healthcare services._`
        };
    }

    // ── 2. GLOBAL MENU SHORTCUT (0 or menu returns to Main Menu) ─────────────
    if (text === '0' || text === 'menu' || text === 'main menu') {
        const currentLang = CONVERSATION_STATES[phoneKey]?.lang || 'en';
        CONVERSATION_STATES[phoneKey] = { step: 'MAIN_MENU', lang: currentLang, data: {} };
        return currentLang === 'te' ? getMainMenuTelugu() : getMainMenuEnglish();
    }

    // ── 3. INSTANT LANGUAGE SWITCH SHORTCUTS ─────────────────────────────────
    if (text === 'english' || text === 'eng' || text === 'en') {
        CONVERSATION_STATES[phoneKey] = { step: 'MAIN_MENU', lang: 'en', data: {} };
        return getMainMenuEnglish();
    }
    if (text === 'telugu' || text === 'తెలుగు' || text === 'te') {
        CONVERSATION_STATES[phoneKey] = { step: 'MAIN_MENU', lang: 'te', data: {} };
        return getMainMenuTelugu();
    }

    // ── 4. GREETINGS — RESET TO LANGUAGE SELECTION ───────────────────────────
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

    // ── 5. DIRECT KEYWORD SHORTCUTS ──────────────────────────────────────────
    // Pricing shortcuts
    if (text === 'pricing' || text === 'tariff' || text === 'rates' || text === 'price' || text === 'ధరలు') {
        const currentLang = CONVERSATION_STATES[phoneKey]?.lang || 'en';
        CONVERSATION_STATES[phoneKey] = { step: 'SELECT_PRICING_CATEGORY', lang: currentLang, data: {} };
        return currentLang === 'te' ? getPricingMenuTelugu() : getPricingMenuEnglish();
    }

    // Partner shortcuts
    const PARTNER_KEYWORDS = ['partner', 'partnership', 'join', 'become a partner', 'భాగస్వామ్యం', 'doctor join', 'nurse join', 'form', 'forms'];
    if (PARTNER_KEYWORDS.some(kw => text === kw || text.includes(kw))) {
        const currentLang = CONVERSATION_STATES[phoneKey]?.lang || 'en';
        CONVERSATION_STATES[phoneKey] = { step: 'PARTNER_SELECT_PROFESSION', lang: currentLang, data: {} };
        return currentLang === 'te' ? getPartnerProfessionMenuTelugu() : getPartnerProfessionMenu();
    }

    // Support shortcut
    if (text.includes('helpline') || text.includes('support') || text.includes('contact') || text.includes('call') || text.includes('సంప్రదించండి')) {
        const currentLang = CONVERSATION_STATES[phoneKey]?.lang || 'en';
        return getHelplineResponse(currentLang === 'te');
    }

    // ── 6. INITIAL STATE FALLBACK ────────────────────────────────────────────
    if (!CONVERSATION_STATES[phoneKey]) {
        CONVERSATION_STATES[phoneKey] = { step: 'SELECT_LANGUAGE', data: {} };
        return getLanguageMenu();
    }

    const state = CONVERSATION_STATES[phoneKey];
    const isTelugu = state.lang === 'te';

    // ── 7. CONVERSATION STATE MACHINE ─────────────────────────────────────────
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
                    text: `💬 *Please select your language by tapping a button below:*\nదయచేసి కొనసాగడానికి మీ భాషను ఎంచుకోండి:\n━━━━━━━━━━━━━━━━━━━━\n🌐 Official Website: ${WEBSITE_URL}`,
                    buttons: [
                        { id: '1', text: '🇬🇧 English' },
                        { id: '2', text: '🇮🇳 తెలుగు' }
                    ]
                };
            }
        }

        // --- STEP 2: MAIN MENU (Strictly 2 Choices: Pricing or Partner) ---
        case 'MAIN_MENU': {
            // Choice 1: Pricing & Tariff
            if (text === '1' || text.includes('pricing') || text.includes('tariff') || text.includes('rate') || text.includes('ధరలు')) {
                state.step = 'SELECT_PRICING_CATEGORY';
                return isTelugu ? getPricingMenuTelugu() : getPricingMenuEnglish();
            }
            // Choice 2: Become a Partner
            else if (text === '2' || text.includes('partner') || text.includes('భాగస్వామ్యం') || text.includes('form') || text.includes('join')) {
                state.step = 'PARTNER_SELECT_PROFESSION';
                return isTelugu ? getPartnerProfessionMenuTelugu() : getPartnerProfessionMenu();
            }
            // Freeform / unrecognized input fallback guidance
            else {
                return getPredefinedRepliesNotice(isTelugu);
            }
        }

        // --- STEP 3: PRICING CATEGORY DETAILS ---
        case 'SELECT_PRICING_CATEGORY': {
            // 1: Doctor Consultation Rates
            if (text === '1' || text.includes('doctor') || text.includes('డాక్టర్')) {
                return getDoctorPricingDetails(isTelugu);
            }
            // 2: Home Nursing Procedures & Shifts
            if (text === '2' || text.includes('nursing') || text.includes('nurse') || text.includes('నర్సింగ్')) {
                return getNursingPricingDetails(isTelugu);
            }
            // 3: 24/7 Ambulance Fleet Slabs
            if (text === '3' || text.includes('ambulance') || text.includes('అంబులెన్స్')) {
                return getAmbulancePricingDetails(isTelugu);
            }
            // 4: Lab & Blood Tests at Home
            if (text === '4' || text.includes('lab') || text.includes('blood') || text.includes('ల్యాబ్')) {
                return getLabPricingDetails(isTelugu);
            }
            // 5: Caregiver & Bedside Attendant
            if (text === '5' || text.includes('care') || text.includes('కేర్‌టేకర్')) {
                return getCaregiverPricingDetails(isTelugu);
            }
            // 6: Physiotherapy & Doorstep ECG
            if (text === '6' || text.includes('physio') || text.includes('ecg') || text.includes('ఫిజియో')) {
                return getPhysioEcgPricingDetails(isTelugu);
            }
            // 7: Master Complete Tariff Overview
            if (text === '7' || text.includes('all') || text.includes('overview') || text.includes('మొత్తం')) {
                return getCompletePricingOverview(isTelugu);
            }

            // Freeform / unrecognized input fallback
            return getPredefinedRepliesNotice(isTelugu);
        }

        // --- STEP 4: PARTNER PROFESSION FORM DELIVERY ---
        case 'PARTNER_SELECT_PROFESSION': {
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
                        ? `🤝 *AMPLR HEALTH భాగస్వామ్య నమోదు*\n━━━━━━━━━━━━━━━━━━━━\n🩺 *విభాగం*: *${partnerObj.name}*\n🔖 *రిఫరెన్స్ ID*: *${partnerRefId}*\n\nAMPLR HEALTH నెట్‌వర్క్‌లో చేరడానికి ఆసక్తి చూపినందుకు ధన్యవాదాలు! 🏥\n\n👉 *అధికారిక భాగస్వామ్య దరఖాస్తు ఫారమ్*:\n${partnerObj.url}\n\n📌 *సూచనలు*:\n1. దయచేసి పై Google Form లింక్‌ను ఓపెన్ చేయండి.\n2. మీ విద్యార్హతలు మరియు వివరాలను సమర్పించండి.\n3. మా ఆన్‌బోర్డింగ్ బృందం 24 గంటల్లో మిమ్మల్ని సంప్రదిస్తుంది.\n━━━━━━━━━━━━━━━━━━━━\n🌐 *అధికారిక వెబ్‌సైట్*: ${WEBSITE_URL}\n📞 *హెల్ప్‌లైన్ డెస్క్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* లేదా *Hi* రిప్లై ఇవ్వండి_`
                        : `🤝 *AMPLR HEALTH PARTNER ONBOARDING*\n_Join Our Clinical Provider Network_\n━━━━━━━━━━━━━━━━━━━━\n📋 *Category*: *${partnerObj.name}*\n🔖 *Application Reference*: *${partnerRefId}*\n\nThank you for choosing to partner with AMPLR Health! 🏥\n\n👉 *Official Application Form Link*:\n${partnerObj.url}\n\n📌 *Next Steps*:\n1. Tap the Google Form link above.\n2. Submit your credentials, experience, and contact details.\n3. Our Provider Empanelment Team will contact you within 24 hours.\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Official Portal*: ${WEBSITE_URL}\n📞 *Partner Support Desk*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* or *Hi* for Main Menu_`
                };
            }

            // Freeform / unrecognized input fallback
            return getPredefinedRepliesNotice(isTelugu);
        }

        default: {
            CONVERSATION_STATES[phoneKey] = { step: 'MAIN_MENU', lang: state.lang || 'en', data: {} };
            return state.lang === 'te' ? getMainMenuTelugu() : getMainMenuEnglish();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-DEFINED GUIDANCE / FALLBACK NOTICE
// ─────────────────────────────────────────────────────────────────────────────

function getPredefinedRepliesNotice(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `💬 *దయచేసి పై ఎంపికలను ఉపయోగించండి*\n━━━━━━━━━━━━━━━━━━━━\nమా ఆటోమేటెడ్ హెల్త్‌కేర్ అసిస్టెంట్ మీ ప్రశ్నను ఖచ్చితంగా అర్థం చేసుకోవడానికి మరియు సహాయం చేయడానికి, దయచేసి పై బటన్లను నొక్కండి లేదా నంబర్లను (*1* లేదా *2*) రిప్లై ఇవ్వండి.\n\n🌐 *ఆన్‌లైన్ బుకింగ్ & లైవ్ వివరాలు*:\n${WEBSITE_URL}\n\n📞 *24/7 సహాయ హెల్ప్‌లైన్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* లేదా *Hi* రిప్లై ఇవ్వండి_`
            : `💬 *Please Use Pre-Defined Options*\n━━━━━━━━━━━━━━━━━━━━\nPlease use our pre-defined replies or tap the buttons above so that we can accurately understand and process your query.\n\n🌐 *Official Website & Online Booking*:\n${WEBSITE_URL}\n\n📞 *24/7 Care Helpline*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* or *Hi* for Main Menu_`
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MENUS & LANGUAGE TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

function getLanguageMenu() {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `🏥 *AMPLR HEALTH*\n_Brings Hospital Care to Your Home_\n━━━━━━━━━━━━━━━━━━━━\nWelcome! Please select your preferred language to proceed:\nస్వాగతం! దయచేసి కొనసాగడానికి మీ భాషను ఎంచుకోండి:\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Official Portal*: ${WEBSITE_URL}`,
        buttons: [
            { id: '1', text: '🇬🇧 English' },
            { id: '2', text: '🇮🇳 తెలుగు' }
        ]
    };
}

function getMainMenuEnglish() {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `🏥 *AMPLR HEALTH*\n_Brings Hospital Care to Your Home_\n━━━━━━━━━━━━━━━━━━━━\nWelcome to AMPLR Health! How can our healthcare team assist you today?\n\n1️⃣ 💰 *Pricing & Tariff Guide*\n   _View official charges for Doctors, Nursing, Ambulance & Diagnostics_\n\n2️⃣ 🤝 *Become a Healthcare Partner*\n   _Apply to join our clinical network (Form Links)_\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Instant Online Booking & Live Rates*:\n${WEBSITE_URL}\n\n📞 *24/7 Care Helpline*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n👇 *Please tap an option below or reply 1 or 2:*`,
        buttons: [
            { id: '1', text: '💰 Pricing & Tariff' },
            { id: '2', text: '🤝 Become a Partner' }
        ]
    };
}

function getMainMenuTelugu() {
    return {
        type: 'INTERACTIVE_BUTTONS',
        text: `🏥 *AMPLR HEALTH*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n━━━━━━━━━━━━━━━━━━━━\nAMPLR Health కు స్వాగతం! మా వైద్య బృందం ఈ రోజు మీకు ఎలా సహాయం చేయగలదు?\n\n1️⃣ 💰 *సేవల ధరల జాబితా (Pricing & Tariff)*\n   _డాక్టర్, నర్సింగ్, అంబులెన్స్, ల్యాబ్ సేవల అధికారిక రేట్లు_\n\n2️⃣ 🤝 *హెల్త్‌కేర్ భాగస్వామి అవ్వండి (Partner)*\n   _మా నెట్‌వర్క్‌లో చేరండి (దరఖాస్తు ఫారమ్ లింకులు)_\n━━━━━━━━━━━━━━━━━━━━\n🌐 *ఆన్‌లైన్ బుకింగ్ & లైవ్ రేట్ల కోసం వెబ్‌సైట్*:\n${WEBSITE_URL}\n\n📞 *24/7 సహాయ హెల్ప్‌లైన్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n👇 *క్రింది బటన్ నొక్కండి లేదా 1 లేదా 2 రిప్లై ఇవ్వండి:*`,
        buttons: [
            { id: '1', text: '💰 ధరల వివరాలు' },
            { id: '2', text: '🤝 భాగస్వామ్యం' }
        ]
    };
}

function getHelplineResponse(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🏥 *AMPLR HEALTH • 24/7 హెల్ప్‌లైన్ & మద్దతు*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n━━━━━━━━━━━━━━━━━━━━\n📞 *అధికారిక హెల్ప్‌లైన్*: *${HELPLINE}*\n⏰ *సేవ సమయం*: 24/7 అందుబాటులో ఉంది\n\n🌐 *ఆన్‌లైన్ బుకింగ్ పోర్టల్*:\n${WEBSITE_URL}\n\n💬 ఏదైనా సేవ బుకింగ్, అత్యవసర అభ్యర్థన లేదా సమాచారం కోసం మా కేర్ కోఆర్డినేటర్‌ను నేరుగా సంప్రదించండి.\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* లేదా *Hi* రిప్లై ఇవ్వండి_`
            : `🏥 *AMPLR HEALTH • 24/7 HELPLINE & SUPPORT*\n_Brings Hospital Care to Your Home_\n━━━━━━━━━━━━━━━━━━━━\n📞 *Official Helpline*: *${HELPLINE}*\n⏰ *Support Hours*: 24/7 Dedicated Care\n\n🌐 *Instant Online Booking Portal*:\n${WEBSITE_URL}\n\n💬 For immediate booking assistance, doctor consultations, or questions, our team is available 24/7.\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* or *Hi* for Main Menu_`
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING MENUS & DETAILED TARIFF BREAKDOWNS
// ─────────────────────────────────────────────────────────────────────────────

function getPricingMenuEnglish() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `💰 *AMPLR HEALTH • SERVICE TARIFF GUIDE*\n━━━━━━━━━━━━━━━━━━━━\nStandardized clinical rates for home health visits & tele-consults.\n\nPlease select a category below to view detailed pricing:\n\n1️⃣ 👨‍⚕️ *Doctor Tele-Consultations* (₹299 – ₹799)\n2️⃣ 👩‍⚕️ *Home Nursing Procedures* (₹200 – ₹2,600)\n3️⃣ 🚑 *24/7 Emergency Ambulance* (From ₹1,400)\n4️⃣ 🩸 *Diagnostic Lab Tests at Home* (From ₹200)\n5️⃣ 🧓 *Elderly Bedside Caregiver* (₹1,200 / ₹2,000)\n6️⃣ 🏃‍♂️ *Physiotherapy & Doorstep ECG* (₹900 / ₹1,100)\n7️⃣ 📋 *Complete Tariff Overview* (Master Summary)\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Direct Booking & Real-Time Rates*:\n${WEBSITE_URL}\n━━━━━━━━━━━━━━━━━━━━\n👇 *Tap 'View Rates' below or reply 1 to 7:*`,
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
        text: `💰 *AMPLR HEALTH • సేవల ధరల వివరాలు (Tariff)*\n━━━━━━━━━━━━━━━━━━━━\nఇంటి వద్ద వైద్య సేవలకు ప్రామాణిక రేట్లు.\n\nధరల వివరాలను చూడటానికి క్రింది విభాగాన్ని ఎంచుకోండి:\n\n1️⃣ 👨‍⚕️ *డాక్టర్ సంప్రదింపుల ధరలు* (₹299 – ₹799)\n2️⃣ 👩‍⚕️ *నర్సింగ్ సేవల ధరలు* (₹200 – ₹2,600)\n3️⃣ 🚑 *24/7 అంబులెన్స్ ఛార్జీలు* (₹1,400 నుండి)\n4️⃣ 🩸 *ల్యాబ్ రక్త పరీక్షలు* (₹200 నుండి)\n5️⃣ 🧓 *సంరక్షకులు / కేర్‌టేకర్* (₹1,200 / ₹2,000)\n6️⃣ 🏃‍♂️ *ఫిజియోథెరపీ & ECG* (₹900 / ₹1,100)\n7️⃣ 📋 *మొత్తం సేవల ధరల సారాంశం*\n━━━━━━━━━━━━━━━━━━━━\n🌐 *ప్రత్యక్ష ఆన్‌లైన్ బుకింగ్ & లైవ్ రేట్లు*:\n${WEBSITE_URL}\n━━━━━━━━━━━━━━━━━━━━\n👇 *క్రింది 'ధరలు చూడండి' నొక్కండి లేదా 1-7 రిప్లై ఇవ్వండి:*`,
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
            ? `👨‍⚕️ *డాక్టర్ సంప్రదింపుల ధరల జాబితా*\n_AMPLR Health స్పెషలిస్ట్ ప్యానెల్_\n━━━━━━━━━━━━━━━━━━━━\nస్పెషాలిటీ టెలి-కన్సల్టేషన్ ఫీజులు:\n\n• *ఆయుష్ & న్యూట్రిషన్* — *₹299*\n  _ఆయుర్వేదం, హోమియోపతి, యునాని, డైట్ & పోషకాహారం_\n\n• *జనరల్ స్పెషాలిటీస్* — *₹399*\n  _డెర్మటాలజీ, ఆర్థోపెడిక్స్, ENT, సైకియాట్రీ_\n\n• *ఫెర్టిలిటీ & దీర్ఘకాలిక సంరక్షణ* — *₹499*\n  _ఫెర్టిలిటీ కన్సల్టేషన్ & క్రానిక్ డిసీజ్ కేర్_\n\n• *సూపర్ స్పెషాలిటీస్* — *₹599*\n  _కార్డియాలజీ, న్యూరాలజీ, పల్మోనాలజీ, గ్యాస్ట్రో, యూరాలజీ, IVF_\n\n• *ఆంకాలజీ (క్యాన్సర్ నిపుణులు)* — *₹799*\n  _సమగ్ర క్యాన్సర్ కేర్ కన్సల్టేషన్_\n━━━━━━━━━━━━━━━━━━━━\n🌐 *ఆన్‌లైన్ బుకింగ్*: ${WEBSITE_URL}\n📞 *24/7 హెల్ప్‌లైన్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి_`
            : `👨‍⚕️ *DOCTOR TELE-CONSULTATION TARIFF*\n_AMPLR Health Specialist Panel_\n━━━━━━━━━━━━━━━━━━━━\nSpecialty Consultation Fees:\n\n• *AYUSH & Nutrition* — *₹299*\n  _Ayurveda, Homeopathy, Unani, Clinical Diet & Nutrition_\n\n• *General Specialties* — *₹399*\n  _Dermatology, Orthopedics, ENT, Psychiatry_\n\n• *Fertility & Chronic Care* — *₹499*\n  _Reproductive Health & Chronic Disease Management_\n\n• *Super Specialties* — *₹599*\n  _Cardiology, Neurology, Pulmonology, Gastroenterology, Urology, IVF_\n\n• *Oncology (Cancer Specialist)* — *₹799*\n  _Expert Oncologist Clinical Tele-Consultation_\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Book Consultation Online*:\n${WEBSITE_URL}\n\n📞 *24/7 Doctor Desk*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* for Main Menu_`
    };
}

function getNursingPricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `👩‍⚕️ *నర్సింగ్ సేవల ధరల జాబితా*\n_ఇంటి వద్ద సర్టిఫైడ్ నర్సింగ్ కేర్_\n━━━━━━━━━━━━━━━━━━━━\nక్లినికల్ విజిట్ ప్రొసీజర్స్:\n• *బీపీ & బ్లడ్ షుగర్ మానిటరింగ్* — *₹200*\n• *IM / IV ఇంజెక్షన్ & క్యాన్యులేషన్* — *₹300*\n• *IV ఫ్లూయిడ్ / సెలైన్ డ్రిప్* — *₹500*\n• *గాయం డ్రెస్సింగ్ & క్యాథెటర్ కేర్* — *₹700*\n• *వాస్కులైటిస్ & కాంప్లెక్స్ అల్సర్ కేర్* — *₹900*\n• *మంచంపై ఉన్న రోగుల పరిశుభ్రత & ట్యూబ్ కేర్* — *₹700*\n\nడెడికేటెడ్ అవర్లీ నర్స్ షిఫ్ట్‌లు:\n• *షార్ట్ విజిట్ (1 నుండి 3 గంటలు)* — *₹700*\n• *హాఫ్-డే షిఫ్ట్ (1 నుండి 6 గంటలు)* — *₹1,400*\n• *ఫుల్-డే డే/నైట్ షిఫ్ట్ (1 నుండి 12 గంటలు)* — *₹2,600*\n━━━━━━━━━━━━━━━━━━━━\n🌐 *ఆన్‌లైన్ నర్సింగ్ బుకింగ్*: ${WEBSITE_URL}\n📞 *24/7 నర్సింగ్ డెస్క్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి_`
            : `👩‍⚕️ *HOME NURSING PROCEDURES & SHIFTS*\n_Certified Doorstep Nursing Care_\n━━━━━━━━━━━━━━━━━━━━\nClinical Visit Procedures:\n• *BP & Blood Sugar Monitoring* — *₹200*\n• *IM / IV Injection & Cannulation* — *₹300*\n• *IV Fluid / Saline Infusion* — *₹500*\n• *Wound Dressing & Foley Catheter* — *₹700*\n• *Vasculitis & Complex Ulcer Care* — *₹900*\n• *Bedridden Hygiene & Ryle's Tube* — *₹700*\n\nDedicated Hourly Nursing Shifts:\n• *Short Visit (1 to 3 Hours)* — *₹700*\n• *Half-Day Shift (1 to 6 Hours)* — *₹1,400*\n• *Full-Day Shift (1 to 12 Hours)* — *₹2,600*\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Book Home Nurse Online*:\n${WEBSITE_URL}\n\n📞 *24/7 Nursing Desk*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* for Main Menu_`
    };
}

function getAmbulancePricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🚑 *24/7 ఎమర్జెన్సీ అంబులెన్స్ ఛార్జీలు*\n_వేగవంతమైన డిస్పాచ్ & ICU అంబులెన్స్ ఫ్లీట్_\n━━━━━━━━━━━━━━━━━━━━\n1️⃣ *తూఫాన్ / ఓమ్ని A/C (రోగి రవాణా)*\n• 1 – 10 కి.మీ: *₹1,400*\n• 1 – 50 కి.మీ: *₹4,000*\n• 1 – 100 కి.మీ: *₹6,000*\n• 1 – 200 కి.మీ: *₹10,500*\n\n2️⃣ *టెంపో ట్రావెలర్ A/C (విశాలమైన ఫ్లీట్)*\n• 1 – 10 కి.మీ: *₹1,800*\n• 1 – 50 కి.మీ: *₹5,500*\n• 1 – 100 కి.మీ: *₹9,500*\n• 1 – 200 కి.మీ: *₹16,000*\n\n➕ *మెడికల్ లైఫ్-సపోర్ట్ పరికరాలు*:\n• పారామెడిక్ సిబ్బంది: *+₹1,500*\n• ఆక్సిజన్ సపోర్ట్: *+₹1,500*\n• అడ్వాన్స్డ్ ICU వెంటిలేటర్: *+₹4,500*\n━━━━━━━━━━━━━━━━━━━━\n🌐 *ఆన్‌లైన్ బుకింగ్*: ${WEBSITE_URL}\n📞 *24/7 అత్యవసర డిస్పాచ్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి_`
            : `🚑 *24/7 EMERGENCY AMBULANCE TARIFF*\n_Rapid Dispatch Transport & ICU Fleet_\n━━━━━━━━━━━━━━━━━━━━\n1️⃣ *Toofan / Omni A/C (Patient Transport)*\n• 1 – 10 km: *₹1,400*\n• 1 – 50 km: *₹4,000*\n• 1 – 100 km: *₹6,000*\n• 1 – 200 km: *₹10,500*\n\n2️⃣ *Tempo Traveller A/C (Spacious Fleet)*\n• 1 – 10 km: *₹1,800*\n• 1 – 50 km: *₹5,500*\n• 1 – 100 km: *₹9,500*\n• 1 – 200 km: *₹16,000*\n\n➕ *Medical Life-Support Add-ons*:\n• Paramedic Attendant: *+₹1,500*\n• Oxygen Support: *+₹1,500*\n• Advanced ICU Ventilator: *+₹4,500*\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Book Transport Online*:\n${WEBSITE_URL}\n\n📞 *Immediate 24/7 Dispatch*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* for Main Menu_`
    };
}

function getLabPricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🩸 *ల్యాబ్ & రక్త పరీక్షల ధరలు (ఇంటి వద్ద)*\n_NABL గుర్తింపు పొందిన ల్యాబ్‌లు • హోమ్ కలెక్షన్_\n━━━━━━━━━━━━━━━━━━━━\nసాధారణ రక్త పరీక్షలు:\n• *బ్లడ్ షుగర్ (Fasting / PP)* — *₹200*\n• *కంప్లీట్ బ్లడ్ పిక్చర్ (CBC)* — *₹350*\n• *లిపిడ్ ప్రొఫైల్ (కొలెస్ట్రాల్)* — *₹550*\n• *థైరాయిడ్ ప్రొఫైల్ (T3, T4, TSH)* — *₹500*\n• *HbA1c (3 నెలల షుగర్)* — *₹500*\n• *లివర్ ఫంక్షన్ టెస్ట్ (LFT)* — *₹650*\n• *కిడ్నీ ఫంక్షన్ టెస్ట్ (KFT)* — *₹650*\n\nప్రివెంటివ్ హెల్త్ చెకప్ ప్యాకేజీలు:\n• *కంప్లీట్ ఫుల్ బాడీ చెకప్* — *₹1,299 నుండి*\n_✨ ₹800 పైబడిన ఆర్డర్లపై ఉచిత హోమ్ కలెక్షన్_\n━━━━━━━━━━━━━━━━━━━━\n🌐 *ఆన్‌లైన్ టెస్ట్ షెడ్యూల్*: ${WEBSITE_URL}\n📞 *24/7 డయాగ్నోస్టిక్స్ డెస్క్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి_`
            : `🩸 *DIAGNOSTIC & BLOOD TESTS AT HOME*\n_NABL Accredited Labs • Doorstep Collection_\n━━━━━━━━━━━━━━━━━━━━\nRoutine Diagnostic Tests:\n• *Blood Sugar (Fasting / PP)* — *₹200*\n• *Complete Blood Picture (CBC)* — *₹350*\n• *Lipid Profile (Cholesterol)* — *₹550*\n• *Thyroid Profile (T3, T4, TSH)* — *₹500*\n• *HbA1c (3-Month Sugar)* — *₹500*\n• *Liver Function Test (LFT)* — *₹650*\n• *Kidney Function Test (KFT)* — *₹650*\n\nComprehensive Preventive Health Packages:\n• *Full Body Wellness Package* — From *₹1,299*\n_✨ Complimentary home collection on orders above ₹800_\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Schedule Test Online*:\n${WEBSITE_URL}\n\n📞 *24/7 Diagnostics Line*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* for Main Menu_`
    };
}

function getCaregiverPricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🧓 *వృద్ధుల సంరక్షకులు & బెడ్‌సైడ్ అటెండెంట్*\n_అంకితభావంతో కూడిన పేషెంట్ హోమ్ కేర్_\n━━━━━━━━━━━━━━━━━━━━\nకేర్‌టేకర్ షిఫ్ట్ ప్లాన్లు:\n• *12 గంటల షిఫ్ట్ (డే లేదా నైట్)* — *₹1,200 / రోజుకు*\n• *24 గంటల లైవ్-ఇన్ కేర్‌టేకర్* — *₹2,000 / రోజుకు*\n• *మంత్లీ ప్లాన్లు* — *ప్రత్యేక తగ్గింపు ధరలు*\n\nసేవల పరిధి:\n• వ్యక్తిగత పరిశుభ్రత, స్నానం & గ్రూమింగ్\n• పేషెంట్ మొబిలిటీ & మూవ్‌మెంట్ మద్దతు\n• సకాలంలో మందుల రిమైండర్లు\n• వైటల్ సైన్స్ మానిటరింగ్ & ఆహారం తినిపించడం\n━━━━━━━━━━━━━━━━━━━━\n🌐 *ఆన్‌లైన్ బుకింగ్*: ${WEBSITE_URL}\n📞 *24/7 కేర్ కోఆర్డినేటర్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి_`
            : `🧓 *ELDERLY & BEDSIDE CAREGIVER CARE*\n_Compassionate In-Home Patient Support_\n━━━━━━━━━━━━━━━━━━━━\nAttendant Shift Plans:\n• *12-Hour Shift (Day or Night)* — *₹1,200 / day*\n• *24-Hour Live-in Caregiver* — *₹2,000 / day*\n• *Monthly Long-Term Care* — *Customized Discounted Plans*\n\nService Inclusions:\n• Personal Hygiene, Bathing & Grooming\n• Mobility & Transfer Assistance\n• Timely Medication Reminders\n• Vital Signs Monitoring & Nutrition Feeding\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Request Caregiver Online*:\n${WEBSITE_URL}\n\n📞 *24/7 Care Coordinator*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* for Main Menu_`
    };
}

function getPhysioEcgPricingDetails(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `🏃‍♂️ *ఫిజియోథెరపీ & 💓 12-లీడ్ డోర్‌స్టెప్ ECG*\n_మీ ఇంటి వద్దకే నిపుణుల వైద్య సేవలు_\n━━━━━━━━━━━━━━━━━━━━\n• 🏃‍♂️ *ఫిజియోథెరపీ హోమ్ సెషన్* — *₹900*\n  _సమయం: 45 నిమిషాలు_\n  _పక్షవాతం, ఆపరేషన్ తర్వాత రికవరీ, కీళ్లు/వెన్నెముక నొప్పుల పునరావాస చికిత్స._\n\n• 💓 *12-లీడ్ డిజిటల్ డోర్‌స్టెప్ ECG* — *₹1,100*\n  _సర్టిఫైడ్ క్లినికల్ టెక్నీషియన్ ద్వారా ఇంటి వద్ద తక్షణ పరీక్ష మరియు కార్డియాలజిస్ట్ వెరిఫైడ్ డిజిటల్ రిపోర్ట్._\n━━━━━━━━━━━━━━━━━━━━\n🌐 *ఆన్‌లైన్ బుకింగ్*: ${WEBSITE_URL}\n📞 *24/7 అపాయింట్‌మెంట్ డెస్క్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి_`
            : `🏃‍♂️ *PHYSIOTHERAPY & 💓 12-LEAD ECG*\n_Expert Clinical Care at Your Doorstep_\n━━━━━━━━━━━━━━━━━━━━\n• 🏃‍♂️ *Physiotherapy Home Session* — *₹900*\n  _Duration: 45 Minutes_\n  _Post-stroke rehab, paralysis care, joint/spine pain therapy, post-surgical mobility recovery._\n\n• 💓 *12-Lead Digital Doorstep ECG* — *₹1,100*\n  _Performed at home by trained clinical technician with instant cardiologist-verified digital report._\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Book Session Online*:\n${WEBSITE_URL}\n\n📞 *24/7 Scheduling Desk*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* for Main Menu_`
    };
}

function getCompletePricingOverview(isTelugu) {
    return {
        type: 'TEXT',
        text: isTelugu
            ? `📋 *AMPLR HEALTH • సేవల ధరల పూర్తి సారాంశం*\n_ఆసుపత్రి సేవలను మీ ఇంటికే అందిస్తుంది_\n━━━━━━━━━━━━━━━━━━━━\nసేవల రేట్ల సారాంశం:\n• 👨‍⚕️ *డాక్టర్ సంప్రదింపులు* — *₹299 నుండి ₹799*\n• 👩‍⚕️ *నర్సింగ్ సేవలు* — *₹200 నుండి ₹900* (షిఫ్ట్‌లు: *₹700 నుండి ₹2,600*)\n• 🚑 *24/7 అంబులెన్స్* — *₹1,400 నుండి* (O2 & ICU వెంటిలేటర్)\n• 🩸 *ల్యాబ్ రక్త పరీక్షలు* — *₹200 నుండి* (ప్యాకేజీలు *₹1,299*)\n• 🧓 *సంరక్షకులు / అటెండెంట్* — *₹1,200* (12h) | *₹2,000* (24h)\n• 🏃‍♂️ *ఫిజియోథెరపీ* — *₹900* / సెషన్\n• 💓 *12-లీడ్ డోర్‌స్టెప్ ECG* — *₹1,100* / టెస్ట్\n━━━━━━━━━━━━━━━━━━━━\n🌐 *ప్రత్యక్ష ఆన్‌లైన్ బుకింగ్ & లైవ్ ప్యాకేజీలు*:\n${WEBSITE_URL}\n\n📞 *అధికారిక 24/7 హెల్ప్‌లైన్*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _ప్రధాన మెనూ కోసం *0* రిప్లై ఇవ్వండి_`
            : `📋 *AMPLR HEALTH • MASTER TARIFF OVERVIEW*\n_Hospital Care Brought to Your Home_\n━━━━━━━━━━━━━━━━━━━━\nService Rate Summary:\n• 👨‍⚕️ *Doctor Consultations* — *₹299 to ₹799*\n• 👩‍⚕️ *Nursing Procedures* — *₹200 to ₹900* (Shifts: *₹700 to ₹2,600*)\n• 🚑 *24/7 Ambulance* — From *₹1,400* (O2 & ICU available)\n• 🩸 *Lab Diagnostics* — From *₹200* (Packages from *₹1,299*)\n• 🧓 *Bedside Caregiver* — *₹1,200* (12h) | *₹2,000* (24h)\n• 🏃‍♂️ *Physiotherapy* — *₹900* / session\n• 💓 *12-Lead ECG* — *₹1,100* / test\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Direct Online Booking & Live Packages*:\n${WEBSITE_URL}\n\n📞 *Official 24/7 Helpline*: *${HELPLINE}*\n━━━━━━━━━━━━━━━━━━━━\n↩️ _Reply *0* for Main Menu_`
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER NETWORK CATEGORY MENUS
// ─────────────────────────────────────────────────────────────────────────────

function getPartnerProfessionMenu() {
    return {
        type: 'INTERACTIVE_LIST',
        text: `🤝 *AMPLR HEALTH PARTNER NETWORK*\n_Grow Your Practice With Our Clinical Network_\n━━━━━━━━━━━━━━━━━━━━\nPlease select your profession below to receive your official registration link:\n\n1️⃣ 🩸 *Lab-Blood Collection (Phlebotomist)*\n2️⃣ 👩‍⚕️ *Nursing Professional (GNM / B.Sc)*\n3️⃣ 🧓 *Caregiver / Bedside Attendant*\n4️⃣ 🏃‍♂️ *Physiotherapist (BPT / MPT)*\n5️⃣ 💓 *ECG Clinical Technician*\n6️⃣ 🚑 *Ambulance Fleet Partner*\n7️⃣ 👨‍⚕️ *Doctor Specialist*\n8️⃣ 🏥 *Hospital / Clinic Partnership*\n━━━━━━━━━━━━━━━━━━━━\n🌐 *Official Portal*: ${WEBSITE_URL}\n━━━━━━━━━━━━━━━━━━━━\n👇 *Tap 'Select Profession' below or reply 1 to 8:*`,
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
        text: `🤝 *AMPLR HEALTH భాగస్వామ్య నెట్‌వర్క్*\n_మా క్లినికల్ నెట్‌వర్క్‌లో చేరండి_\n━━━━━━━━━━━━━━━━━━━━\nఅధికారిక రిజిస్ట్రేషన్ ఫారమ్ లింక్ కోసం మీ విభాగాన్ని ఎంచుకోండి:\n\n1️⃣ 🩸 *ల్యాబ్ రక్త సేకరణ (ఫ్లెబోటోమిస్ట్)*\n2️⃣ 👩‍⚕️ *నర్సింగ్ ప్రొఫెషనల్ (GNM / B.Sc)*\n3️⃣ 🧓 *కేర్‌టేకర్ / బెడ్‌సైడ్ అటెండెంట్*\n4️⃣ 🏃‍♂️ *ఫిజియోథెరపిస్ట్ (BPT / MPT)*\n5️⃣ 💓 *ECG క్లినికల్ టెక్నీషియన్*\n6️⃣ 🚑 *అంబులెన్స్ భాగస్వామి / ఫ్లీట్*\n7️⃣ 👨‍⚕️ *డాక్టర్ స్పెషలిస్ట్*\n8️⃣ 🏥 *హాస్పిటల్ / క్లినిక్ భాగస్వామ్యం*\n━━━━━━━━━━━━━━━━━━━━\n🌐 *అధికారిక వెబ్‌సైట్*: ${WEBSITE_URL}\n━━━━━━━━━━━━━━━━━━━━\n👇 *క్రింది 'ఎంచుకోండి' నొక్కండి లేదా 1-8 రిప్లై ఇవ్వండి:*`,
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
