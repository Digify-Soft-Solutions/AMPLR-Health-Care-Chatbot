import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

// Supabase direct connection
// Project ref: wvjtuhodbxjpfbngqlbu
// Host options:
// 1. Direct: db.wvjtuhodbxjpfbngqlbu.supabase.co (port 5432)
// 2. Pooler: aws-0-ap-northeast-1.pooler.supabase.com (port 6543)
const password = process.env.SUPABASE_DB_PASSWORD || 'rz5Blq2RwL6a2hDv';

const connectionStrings = [
    `postgresql://postgres.wvjtuhodbxjpfbngqlbu:${encodeURIComponent(password)}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.wvjtuhodbxjpfbngqlbu:${encodeURIComponent(password)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${encodeURIComponent(password)}@db.wvjtuhodbxjpfbngqlbu.supabase.co:5432/postgres`
];

const SCHEMA_SQL = `
-- 1. Create Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    code TEXT NOT NULL,
    icon TEXT DEFAULT 'Activity',
    base_price NUMERIC NOT NULL DEFAULT 500,
    price_description TEXT,
    slots JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    category TEXT NOT NULL,
    phone TEXT NOT NULL,
    rating NUMERIC DEFAULT 4.8,
    available BOOLEAN DEFAULT true,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Inquiries Table (Live WhatsApp messages)
CREATE TABLE IF NOT EXISTS public.inquiries (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    sender_name TEXT,
    user_message TEXT NOT NULL,
    bot_reply_text TEXT,
    status TEXT DEFAULT 'Auto Replied (WhatsApp Cloud API)',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Bookings Table (Patient Bookings Pipeline)
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    patient_name TEXT,
    patient_phone TEXT,
    service_id TEXT,
    service_name TEXT,
    service_code TEXT,
    date TEXT,
    slot TEXT,
    address TEXT,
    amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'Pending',
    status TEXT DEFAULT 'Pending Assignment',
    assigned_staff JSONB,
    invoice_url TEXT,
    invoice_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Emergency Alerts Table
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    patient_phone TEXT,
    status TEXT DEFAULT 'Urgent Clinical Escalation',
    details JSONB,
    resolved BOOLEAN DEFAULT false
);

-- 6. Disable Row Level Security (RLS) for complete read/write access
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts DISABLE ROW LEVEL SECURITY;

-- 7. Seed Services Catalog (AMPLR Health Official Catalog)
INSERT INTO public.services (id, name, category, code, icon, base_price, price_description, slots, description, active)
VALUES 
    ('1', 'Nursing Services at Home', 'nursing', 'NURSE', 'Stethoscope', 800, '₹800 per visit / ₹1,500 for 12-hour shift', '["09:00 AM", "11:00 AM", "02:00 PM", "05:00 PM", "08:00 PM"]'::jsonb, 'Dressing, Injections, IV Infusion, Wound Care, Post-surgery Nursing.', true),
    ('2', 'Caregiver / Caretaker at Home', 'caretaker', 'CARE', 'UserCheck', 1200, '₹1,200 / day (12 Hours) / ₹2,000 (24 Hours)', '["08:00 AM Start", "08:00 PM Start (Night)", "24 Hours Shift"]'::jsonb, 'Elderly assistance, Hygiene care, Feeding support, Mobility aid.', true),
    ('3', 'Physiotherapy at Home', 'physio', 'PHYSIO', 'Activity', 900, '₹900 per 45-min session', '["09:00 AM", "11:00 AM", "03:00 PM", "06:00 PM"]'::jsonb, 'Stroke rehab, Joint pain, Post-fracture therapy, Back pain relief.', true),
    ('4', 'Lab - Blood Collection at Home', 'lab', 'LAB', 'FlaskConical', 500, 'Starting from ₹500 (Free home collection above ₹800)', '["07:00 AM (Fasting)", "08:30 AM", "10:00 AM", "04:00 PM"]'::jsonb, 'CBC, Diabetes Profile, Thyroid, Lipid, Blood Sugar, Full Body Checkup.', true),
    ('5', 'ECG at Home', 'ecg', 'ECG', 'HeartPulse', 1100, '₹1,100 per test with instant report', '["08:00 AM", "10:30 AM", "02:00 PM", "05:30 PM"]'::jsonb, '12-Lead Digital ECG conducted at your doorstep by trained technician.', true),
    ('6', 'Doctor Consultation (Specialist)', 'doctor', 'DOC', 'Stethoscope', 499, '₹299 to ₹799 based on medical specialty', '["10:00 AM", "01:00 PM", "04:00 PM", "07:00 PM"]'::jsonb, 'Dermatology, Cardiology, Orthopedics, Oncology, General Medicine.', true),
    ('7', 'Ambulance Services (24/7)', 'ambulance', 'AMB', 'Truck', 1400, 'Starting from ₹1,400 (Omni/Toofan) to ₹1,800 (Tempo)', '["24/7 Immediate Dispatch", "Scheduled Patient Transport"]'::jsonb, 'Basic Life Support (BLS) & Advance Cardiac Life Support (ACLS) Ambulances.', true),
    ('8', 'Hospital / Clinic Referral', 'hospital', 'HOSP', 'Activity', 0, 'Free Consultation & Admission Assistance', '["24/7 Support"]'::jsonb, 'Direct partner hospital beds, cashless admission help, OPD booking.', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    code = EXCLUDED.code,
    base_price = EXCLUDED.base_price,
    price_description = EXCLUDED.price_description,
    slots = EXCLUDED.slots,
    description = EXCLUDED.description;

-- 8. Seed Verified Staff
INSERT INTO public.staff (id, name, role, category, phone, rating, available, location)
VALUES
    ('STF-101', 'Sister Anitha Sharma', 'Senior Staff Nurse', 'nursing', '+91 98765 43210', 4.9, true, '302001'),
    ('STF-102', 'Dr. Rahul Verma (PT)', 'Senior Physiotherapist', 'physio', '+91 98765 43211', 4.8, true, '302012'),
    ('STF-103', 'Ramesh Choudhary', 'Certified Caretaker', 'caretaker', '+91 98765 43212', 4.7, true, '302015'),
    ('STF-104', 'Suresh Kumar', 'Lab Phlebotomist', 'lab', '+91 98765 43213', 4.9, true, '302004'),
    ('STF-105', 'Priya Nair', 'ECG Specialist', 'ecg', '+91 98765 43214', 4.8, true, '302018')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;

-- Note: inquiries and bookings tables are kept 100% EMPTY for clean testing!
`;

async function runMigration() {
    let connected = false;
    for (const connStr of connectionStrings) {
        console.log(`Attempting connection: ${connStr.replace(/:[^:@]+@/, ':****@')}`);
        const client = new Client({
            connectionString: connStr,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log('✅ Connected to Supabase PostgreSQL successfully!');
            await client.query(SCHEMA_SQL);
            console.log('🎉 Schema migration and seed completed successfully!');
            await client.end();
            connected = true;
            break;
        } catch (err) {
            console.warn(`⚠️ Connection attempt failed: ${err.message}`);
            try { await client.end(); } catch (_) {}
        }
    }

    if (!connected) {
        console.error('❌ Could not connect directly via pg pooler. Please run the SQL in Supabase SQL Editor.');
        process.exit(1);
    }
}

runMigration();
