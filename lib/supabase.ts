import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zwzmcihwtwgjajjjsbms.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3em1jaWh3dHdnamFqampzYm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTQ0MzksImV4cCI6MjA5MTA3MDQzOX0.X4UnLTta5Pm70sOwZkwJgvA8EkQtJPDmsn-2dMlkqjA';

export const supabase = createClient(supabaseUrl, supabaseKey);
