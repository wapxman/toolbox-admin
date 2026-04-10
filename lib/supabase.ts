import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zwzmcihwtwgjajjjsbms.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
