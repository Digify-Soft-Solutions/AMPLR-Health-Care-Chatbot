import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://wvjtuhodbxjpfbngqlbu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
    || process.env.SUPABASE_ANON_KEY 
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createSafeFallbackClient() {
    const handler = {
        get(target, prop) {
            if (prop === 'then') {
                return (resolve) => resolve({ data: null, error: new Error('Supabase credentials not configured in environment variables') });
            }
            if (typeof prop === 'string') {
                return () => new Proxy({}, handler);
            }
            return undefined;
        }
    };
    return {
        from: () => new Proxy({}, handler)
    };
}

export const supabase = supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    })
    : createSafeFallbackClient();

if (!supabaseKey) {
    console.warn('⚠️ [Supabase Warning]: SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY is not set in environment variables. Safe fallback client active.');
}

export default supabase;
