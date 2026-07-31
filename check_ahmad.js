import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: students } = await supabase.from('cq_students').select('*').eq('name', 'Ahmad Dhuha Habibullah');
  const nis = students[0].nis;
  console.log("Ahmad's NIS:", nis);
  
  const { data: evts } = await supabase.from('analytics_events').select('*').eq('student_id', nis);
  console.log("Ahmad's Events count:", evts.length);
  
  const { data: masteries } = await supabase.from('mastery_logs').select('*').eq('student_id', nis);
  console.log("Ahmad's Mastery logs count:", masteries.length);
  
  if (masteries.length > 0) {
      console.log("Last mastery:", masteries[masteries.length - 1]);
  }
}
check();
