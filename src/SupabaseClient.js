import { createClient } from '@supabase/supabase-js';

// TODO: Replace these strings with the actual keys you copied from your Supabase dashboard
const supabaseUrl = 'https://tuoidmihzpuhjtmujuzi.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_8ry-4kAPphSVZN9AYO9d7Q_GM4cMMaO';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);