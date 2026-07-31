import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Menghapus data siswa selain Ahmad Dhuha Habibullah...");

  // Ambil ID siswa yang mau dihapus terlebih dahulu jika ingin memastikan
  const { data: students, error: fetchErr } = await supabase
    .from('cq_students')
    .select('id, name')
    .neq('name', 'Ahmad Dhuha Habibullah');

  if (fetchErr) {
    console.error("Gagal fetch:", fetchErr);
    return;
  }

  console.log(`Ditemukan ${students.length} siswa untuk dihapus.`);

  if (students.length > 0) {
    const { error: delErr } = await supabase
      .from('cq_students')
      .delete()
      .neq('name', 'Ahmad Dhuha Habibullah');

    if (delErr) {
      console.error("Gagal menghapus:", delErr);
    } else {
      console.log("Berhasil menghapus siswa!");
    }
  }
}

run();
