import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from the project root (one level up from scripts/)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') }); // fallback

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Gagal menemukan variabel VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STUDENTS = [
  {
    nis: 'BOT-001',
    name: 'Bot Siswa Pintar',
    password: '123',
    class_code: 'KIMIA-11A',
    profile: 'SMART'
  },
  {
    nis: 'BOT-002',
    name: 'Bot Siswa Sedang',
    password: '123',
    class_code: 'KIMIA-11A',
    profile: 'AVERAGE'
  },
  {
    nis: 'BOT-003',
    name: 'Bot Siswa Kurang',
    password: '123',
    class_code: 'KIMIA-11A',
    profile: 'STRUGGLING'
  }
];

// Simulasi Pertanyaan Episode 1 (9 Soal)
const QUESTIONS = [
  { id: 'E1-E-01', level: 'Easy' }, { id: 'E1-E-02', level: 'Easy' }, { id: 'E1-E-03', level: 'Easy' },
  { id: 'E1-M-04', level: 'Medium' }, { id: 'E1-M-05', level: 'Medium' }, { id: 'E1-M-06', level: 'Medium' },
  { id: 'E1-H-07', level: 'Hard' }, { id: 'E1-H-08', level: 'Hard' }, { id: 'E1-H-09', level: 'Hard' }
];

const MISCONCEPTIONS = ['M-ARR-01', 'M-BL-01', 'M-ARR-02'];

async function runSimulation() {
  console.log("🚀 Memulai Simulasi Bot Siswa...");

  // 1. Register Students
  for (const s of STUDENTS) {
    const { data } = await supabase.from('cq_students').select('nis').eq('nis', s.nis).single();
    if (!data) {
      await supabase.from('cq_students').insert([{
        nis: s.nis, name: s.name, password: s.password, class_code: s.class_code
      }]);
      console.log(`✅ Didaftarkan: ${s.name}`);
    } else {
      console.log(`ℹ️ Sudah terdaftar: ${s.name}`);
    }
  }

  // 2. Generate Data per Student
  for (const s of STUDENTS) {
    console.log(`\n🤖 Menjalankan bot untuk: ${s.name} (${s.profile})`);
    const sessionId = crypto.randomUUID();
    let currentMastery = 50;

    for (let episodeId = 1; episodeId <= 4; episodeId++) {
      for (let i = 0; i < QUESTIONS.length; i++) {
        const q = QUESTIONS[i];
        let isCorrect = true;
        let confidence = 'tinggi';
        let responseTime = 20000;
        let hints = 0;
        let misconception = null;

        // Logic Profile
        if (s.profile === 'SMART') {
          isCorrect = Math.random() > 0.1; // 90% benar
          confidence = isCorrect ? 'tinggi' : 'sedang';
          responseTime = 15000 + Math.random() * 10000; // 15-25s
        } else if (s.profile === 'AVERAGE') {
          isCorrect = Math.random() > 0.4; // 60% benar
          confidence = isCorrect ? 'sedang' : 'sedang';
          responseTime = 30000 + Math.random() * 20000; // 30-50s
          hints = 1;
        } else if (s.profile === 'STRUGGLING') {
          isCorrect = Math.random() > 0.7; // 30% benar
          // Jika salah, seringkali dia yakin tinggi (terkena miskonsepsi)
          confidence = !isCorrect && Math.random() > 0.5 ? 'tinggi' : 'rendah';
          responseTime = 45000 + Math.random() * 30000; // 45-75s
          hints = 2;
          if (!isCorrect && confidence === 'tinggi') {
            misconception = MISCONCEPTIONS[Math.floor(Math.random() * MISCONCEPTIONS.length)];
          }
        }

        // Mastery Math (Simplified Simulation)
        let oldMastery = currentMastery;
        let delta = 0;
        if (isCorrect) {
          delta = confidence === 'tinggi' ? 5 : (confidence === 'sedang' ? 3 : 1);
        } else {
          delta = confidence === 'tinggi' ? -5 : (confidence === 'sedang' ? -3 : -1);
        }
        currentMastery = Math.min(100, Math.max(0, currentMastery + delta));

        // 1. Insert Analytics
        await supabase.from('analytics_events').insert([{
          student_id: s.nis,
          session_id: sessionId,
          event_type: 'QUESTION_ANSWERED',
          episode_id: episodeId,
          question_id: q.id,
          difficulty_level: q.level,
          is_correct: isCorrect,
          confidence_level: confidence,
          response_time_ms: Math.round(responseTime),
          hints_used: hints,
          misconception_tag: misconception
        }]);

        // 2. Insert Mastery
        await supabase.from('mastery_logs').insert([{
          student_id: s.nis,
          concept: 'Konsep Kimia Umum', // Sample concept
          old_score: oldMastery,
          new_score: currentMastery,
          delta: delta
        }]);
      }
      
      console.log(`   ✅ Selesai jawab soal Episode ${episodeId}, Mastery=${currentMastery}`);

      // Episode Complete Event
      await supabase.from('analytics_events').insert([{
        student_id: s.nis,
        session_id: sessionId,
        event_type: 'EPISODE_COMPLETED',
        episode_id: episodeId,
        metadata: { isPerfect: s.profile === 'SMART', score: currentMastery }
      }]);

      // Reflection
      let refScore = s.profile === 'SMART' ? 3 : (s.profile === 'AVERAGE' ? 2 : 1);
      let refKeywords = s.profile === 'SMART' ? ['asam', 'basa', 'proton'] : ['asam'];
      
      await supabase.from('analytics_events').insert([{
        student_id: s.nis,
        session_id: sessionId,
        event_type: 'REFLECTION_SUBMITTED',
        episode_id: episodeId,
        metadata: { score: refScore, matchedKeywords: refKeywords, responseText: `Simulasi refleksi ep ${episodeId} dari ${s.name}` }
      }]);

      // Badge - beri badge untuk smart & average
      if (s.profile === 'SMART' || s.profile === 'AVERAGE') {
         const badges = ['b-arrhenius', 'b-ph', 'b-indicator', 'b-titration'];
         await supabase.from('analytics_events').insert([{
            student_id: s.nis,
            session_id: sessionId,
            event_type: 'BADGE_UNLOCKED',
            episode_id: episodeId,
            metadata: { badgeId: badges[episodeId - 1] }
         }]);
      }

      console.log(`   🎉 Episode ${episodeId} Selesai. Refleksi Skor: ${refScore}`);
    }
  }

  console.log("\n✅ Simulasi Selesai! Silakan cek Dashboard Guru.");
}

runSimulation();
