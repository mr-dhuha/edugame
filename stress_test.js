import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

// Muat variabel lingkungan
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const CONCURRENT_USERS = 100;
const TEST_PREFIX = 'TEST_STRESS_';
const MAX_QUESTIONS_PER_EPISODE = 12; // Mencegah infinite loop bagi siswa dengan kognitif sangat rendah
const MOCK_SESSION_ID = '00000000-0000-0000-0000-000000000000';

// Muat data soal
const questionsData = JSON.parse(fs.readFileSync(path.resolve('./src/data/questions.json'), 'utf8'));
const episode1Questions = questionsData.filter(q => q.episode === 1);
const qsByDiff = {
  Easy: episode1Questions.filter(q => q.level === 'Easy'),
  Medium: episode1Questions.filter(q => q.level === 'Medium'),
  Hard: episode1Questions.filter(q => q.level === 'Hard'),
};

// Fungsi distribusi normal (Box-Muller)
// Menghasilkan nilai antara 0 - 100 dengan rata-rata 50 dan standar deviasi 15
function generateCognitiveScore() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate ke 0 - 1
  let res = Math.max(0, Math.min(100, Math.round(num * 100 * 15 / 15 + 50 - 50 * 15 / 15)));
  // res sebenarnya di atas hanya rumit, ini versi lebih sederhana:
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(10, Math.min(100, Math.round(50 + z * 20))); // Rata-rata 50, StdDev 20
}

// Simulasi probabilitas menjawab benar berdasarkan teori Item Response (IRT)
function attemptQuestion(cognitiveScore, difficulty) {
  let diffReq = { 'Easy': 30, 'Medium': 50, 'Hard': 75 }[difficulty];
  // P(correct) = 1 / (1 + e^(-k(cognitive - difficulty)))
  let pCorrect = 1 / (1 + Math.exp(-0.08 * (cognitiveScore - diffReq)));
  let isCorrect = Math.random() < pCorrect;
  
  // Waktu dan keyakinan
  let responseTime = Math.round(isCorrect ? Math.random() * 5000 + 2000 : Math.random() * 10000 + 5000);
  let confidence = (pCorrect > 0.7) ? 'tinggi' : (pCorrect < 0.4 ? 'rendah' : 'sedang');
  
  return { isCorrect, responseTime, confidence };
}

async function simulateStudentJourney(userId) {
  const startTime = performance.now();
  const cognitiveScore = generateCognitiveScore();
  let currentDifficulty = 'Easy';
  let masteryScore = 50;
  
  console.log(`[${userId}] Kognitif: ${cognitiveScore} | Memulai Episode 1...`);

  try {
    let totalQuestionsAnsweredAllEpisodes = 0;
    let finalDifficulty = 'Easy';

    // Loop Episode 1 sampai 4
    for (let currentEpisode = 1; currentEpisode <= 4; currentEpisode++) {
      let episodeFinished = false;
      let totalQuestionsAnswered = 0;
      let currentDifficulty = finalDifficulty;
      
      const epQuestions = questionsData.filter(q => q.episode === currentEpisode);
      const qsByDiff = {
        Easy: epQuestions.filter(q => q.level === 'Easy'),
        Medium: epQuestions.filter(q => q.level === 'Medium'),
        Hard: epQuestions.filter(q => q.level === 'Hard'),
      };
      
      // Jika soal untuk episode ini kosong, lewati
      if (epQuestions.length === 0) continue;

      // Loop Adaptive (FSM Simulation)
      while (!episodeFinished && totalQuestionsAnswered < MAX_QUESTIONS_PER_EPISODE) {
        let gateCorrectCount = 0;
        let questionsToAsk = qsByDiff[currentDifficulty].sort(() => 0.5 - Math.random()).slice(0, 3);
        
        // Siswa menjawab 3 soal untuk Gate ini
        for (const q of questionsToAsk) {
          if (totalQuestionsAnswered >= MAX_QUESTIONS_PER_EPISODE) break;
          
          let attempt = attemptQuestion(cognitiveScore, currentDifficulty);
          if (attempt.isCorrect) gateCorrectCount++;
          totalQuestionsAnswered++;
          totalQuestionsAnsweredAllEpisodes++;
          
          // Log ke analytics_events
          const { error: attemptError } = await supabase.from('analytics_events').insert({
            student_id: userId,
            session_id: MOCK_SESSION_ID,
            event_type: 'question_attempt',
            episode_id: currentEpisode,
            question_id: q.id,
            difficulty_level: currentDifficulty,
            is_correct: attempt.isCorrect,
            confidence_level: attempt.confidence,
            response_time_ms: attempt.responseTime,
            metadata: { cognitiveScore }
          });
          if (attemptError) throw attemptError;

          // Log ke mastery_logs (simulasi perubahan mastery)
          let delta = attempt.isCorrect ? 5 : -2;
          let newScore = Math.max(0, Math.min(100, masteryScore + delta));
          await supabase.from('mastery_logs').insert({
            student_id: userId,
            concept: q.concept,
            old_score: masteryScore,
            new_score: newScore,
            delta: delta,
            factors_json: { test_sim: 1 }
          });
          masteryScore = newScore;
        }
        
        // Evaluasi Gate
        if (gateCorrectCount >= 2) {
          // Lulus Gate
          if (currentDifficulty === 'Hard') {
            episodeFinished = true; // Selesai Episode
          } else if (currentDifficulty === 'Medium') {
            currentDifficulty = 'Hard';
          } else {
            currentDifficulty = 'Medium';
          }
        } else {
          // Gagal Gate
          if (currentDifficulty === 'Easy') {
            // Remedial / Selesai paksa (agar tidak loop forever)
            episodeFinished = true;
          } else if (currentDifficulty === 'Medium') {
            currentDifficulty = 'Easy';
          } else {
            currentDifficulty = 'Medium';
          }
        }
      }

      finalDifficulty = currentDifficulty;

      // Log episode_completed
      await supabase.from('analytics_events').insert({
        student_id: userId,
        session_id: MOCK_SESSION_ID,
        event_type: 'episode_completed',
        episode_id: currentEpisode,
        metadata: { finalMastery: masteryScore, totalQuestionsAnswered }
      });
    }

    // Akhir dari seluruh episode, submit refleksi (Hanya 1 kali per siswa)
    const reflectionText = `Saya merasa pelajaran ini ${cognitiveScore > 60 ? 'cukup mudah dipahami, asam basa Arrhenius sangat jelas.' : 'agak membingungkan terutama saat membedakan asam dan basa kuat.'} [ID: ${userId}]`;
    
    const { error: aiError } = await supabase.functions.invoke('ai-tutor', {
      body: { feature: 'grade_reflection', data: reflectionText }
    });
    
    if (aiError) throw new Error(`AI Error: ${aiError.message}`);

    const endTime = performance.now();
    console.log(`✅ [${userId}] SELESAI | Waktu: ${((endTime - startTime)/1000).toFixed(1)}s | Jawab ${totalQuestionsAnsweredAllEpisodes} soal | Akhir: ${finalDifficulty}`);
    return true;

  } catch (err) {
    const endTime = performance.now();
    console.log(`❌ [${userId}] GAGAL | Waktu: ${((endTime - startTime)/1000).toFixed(1)}s | Error: ${err.message}`);
    return false;
  }
}

async function runStressTest() {
  console.log(`🚀 Memulai Stress Test (Simulasi Dinamis Distribusi Normal Kognitif) untuk ${CONCURRENT_USERS} Siswa...`);
  const promises = [];
  
  const globalStart = performance.now();
  console.log('Mendaftarkan profil siswa simulasi ke database...');
  const setupPromises = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    const paddedId = String(i).padStart(3, '0');
    const userId = `${TEST_PREFIX}${paddedId}`;
    setupPromises.push(
      supabase.from('cq_students').upsert({
        nis: userId,
        name: `Siswa Simulasi ${paddedId}`,
        password: 'testpassword123',
        class_code: 'TEST_CLASS',
        is_active: true
      }, { onConflict: 'nis' })
    );
  }
  await Promise.all(setupPromises);

  console.log('Memulai simulasi game secara serentak (concurrent)...');
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    const paddedId = String(i).padStart(3, '0');
    const userId = `${TEST_PREFIX}${paddedId}`;
    promises.push(simulateStudentJourney(userId));
  }

  await Promise.all(promises);
  
  const globalEnd = performance.now();
  console.log(`\n🎉 SIMULASI SELESAI dalam ${((globalEnd - globalStart) / 1000).toFixed(2)} detik.`);
  console.log(`Cek grafik di Dashboard Guru, Anda akan melihat data statistik yang sangat realistis!`);
}

runStressTest();
