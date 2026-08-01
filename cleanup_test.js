import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Muat variabel lingkungan dari .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan di .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const TEST_PREFIX = 'TEST_STRESS_';

async function cleanup() {
  console.log(`🧹 Memulai pembersihan data dengan prefix '${TEST_PREFIX}...'`);
  
  try {
    // 1. Hapus dari analytics_events
    console.log(`Menghapus dari tabel analytics_events...`);
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('analytics_events')
      .delete()
      .like('student_id', `${TEST_PREFIX}%`);
      
    if (analyticsError) throw new Error(`Error menghapus analytics_events: ${analyticsError.message}`);
    console.log(`✅ Berhasil membersihkan analytics_events`);

    // 2. Hapus dari mastery_logs
    console.log(`Menghapus dari tabel mastery_logs...`);
    const { error: masteryError } = await supabase
      .from('mastery_logs')
      .delete()
      .like('student_id', `${TEST_PREFIX}%`);
    if (masteryError) throw new Error(`Error menghapus mastery_logs: ${masteryError.message}`);
    console.log(`✅ Berhasil membersihkan mastery_logs`);

    // 3. Hapus profil dari cq_students
    console.log(`Menghapus profil testing dari cq_students...`);
    const { error: studentsError } = await supabase
      .from('cq_students')
      .delete()
      .like('nis', `${TEST_PREFIX}%`);
    if (studentsError) throw new Error(`Error menghapus cq_students: ${studentsError.message}`);
    console.log(`✅ Berhasil membersihkan cq_students`);

    console.log(`\n🎉 PEMBERSIHAN SELESAI! Semua data testing telah dihapus dari database.`);
  } catch (err) {
    console.error(`\n❌ GAGAL: ${err.message}`);
  }
}

cleanup();
