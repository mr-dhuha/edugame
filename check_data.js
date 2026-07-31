import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: evts, error: errE } = await supabase.from('analytics_events').select('id, student_id, event_type');
  console.log("Events count:", evts ? evts.length : 0);
  if (errE) console.error(errE);

  const { data: logs, error: errM } = await supabase.from('mastery_logs').select('id, student_id');
  console.log("Mastery Logs count:", logs ? logs.length : 0);
  if (errM) console.error(errM);
}
check();
