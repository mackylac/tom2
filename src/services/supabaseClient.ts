import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://gqtvlwbhxtohzkpnaase.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxdHZsd2JoeHRvaHprcG5hYXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MTk5MDUsImV4cCI6MjExMDM5NTkwNX0.E9Ub7oHpsBj-TwzTafsgiwRR4yfteL1h6wH18VuF7Pw';

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_ANON_KEY;

export const PORTFOLIO_STORAGE_BUCKET = 'portfolio-images';
export const PORTFOLIO_STORE_TABLE = 'portfolio_store';
export const PORTFOLIO_STORE_ROW_ID = 'main';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
