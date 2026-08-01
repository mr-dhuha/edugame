import { supabase } from './SupabaseClient';
import questionsData from '../data/questions.json';

export async function fetchTeacherMetrics(class_code = null) {
  if (!supabase) return getEmptyData();

  try {
    let studentQuery = supabase.from('cq_students').select('*');
    if (class_code) studentQuery = studentQuery.eq('class_code', class_code);
    const { data: rawStudents, error: errS } = await studentQuery;

    if (errS) throw errS;
    if (!rawStudents || rawStudents.length === 0) return getEmptyData();

    const students = rawStudents;
    if (students.length === 0) return getEmptyData();

    const studentIds = students.map(s => s.nis);

    let events = [];
    let fetchMore = true;
    let page = 0;
    while (fetchMore) {
      const { data: pageData, error: errE } = await supabase
        .from('analytics_events')
        .select('*')
        .in('student_id', studentIds)
        .order('timestamp', { ascending: true })
        .range(page * 1000, (page + 1) * 1000 - 1);
      
      if (errE) {
        console.error("TeacherEngine Event Fetch Error:", errE);
        break;
      }
      
      if (pageData && pageData.length > 0) {
        events = events.concat(pageData);
        page++;
        if (pageData.length < 1000) fetchMore = false; // Last page
      } else {
        fetchMore = false;
      }
    }

    // Initialize Metrics
    const metrics = getEmptyData();
    metrics.overview.className = class_code || "Semua Kelas";
    metrics.overview.totalStudents = students.length;

    const studentMap = new Map();
    students.forEach(s => {
      studentMap.set(s.nis, {
        nis: s.nis,
        name: s.name,
        isActive: s.is_active !== false,
        episodesCompleted: new Set(),
        totalXP: 0, // dipertahankan untuk backward compatibility, tapi kita akan pakai score100
        score100: 0,
        timeSec: 0,
        missions: {},
        questions: {},
        hints: 0,
        remedials: 0,
        replays: 0
      });
    });

    // 2. Events Aggregation
    const miscMap = {};
    const confScatter = [];
    const reflectionScores = { excellent: 0, good: 0, fair: 0, poor: 0 };
    let totalEpsCompleted = 0;

    events?.forEach(ev => {
      const s = studentMap.get(ev.student_id);
      if (!s) return;

      if (ev.response_time_ms) s.timeSec += ev.response_time_ms / 1000;

      if (ev.event_type === 'episode_completed') {
        if (s.episodesCompleted.has(ev.episode_id)) {
          s.replays++;
        }
        s.episodesCompleted.add(ev.episode_id);
      }

      if (ev.event_type === 'remedial_triggered') {
        s.remedials++;
        if (ev.episode_id) {
          if (!s.missions[ev.episode_id]) s.missions[ev.episode_id] = [];
          s.missions[ev.episode_id].push({ label: 'Remedial', status: 'remedial' });
        }
      }

      if (ev.event_type === 'question_attempt') {
        const h = ev.hints_used || (ev.metadata && ev.metadata.hints_used) || 0;
        s.hints += h;

        if (ev.episode_id && ev.question_id) {
          if (!s.missions[ev.episode_id]) s.missions[ev.episode_id] = [];

          s.missions[ev.episode_id].push({ label: `Q:${ev.question_id}`, status: ev.is_correct ? 'pass' : 'fail' });
          s.questions[ev.question_id] = ev.is_correct ? 'correct' : 'incorrect';

          if (ev.is_correct) {
            const diff = ev.difficulty_level || 'Easy';
            if (diff === 'Easy') s.totalXP += 100;
            else if (diff === 'Medium') s.totalXP += 150;
            else if (diff === 'Hard') s.totalXP += 200;
          }

          if (h > 0) {
            s.missions[ev.episode_id].push({ label: 'Hint', status: 'hint' });
            if (s.questions[ev.question_id] === 'correct') s.questions[ev.question_id] = 'hint';
          }

          if (ev.confidence_level) {
            const cl = ev.confidence_level.toLowerCase();
            let c = cl === 'tinggi' ? 90 : (cl === 'sedang' ? 50 : 20);
            let corr = ev.is_correct ? 100 : 10;
            confScatter.push({
              name: ev.question_id,
              confidence: c,
              correctness: corr,
              label: ev.is_correct ? 'Benar' : 'Salah'
            });
          }
        }
      }

      if (ev.misconception_tag) {
        if (!miscMap[ev.misconception_tag]) miscMap[ev.misconception_tag] = { count: 0, affected: new Set() };
        miscMap[ev.misconception_tag].count++;
        miscMap[ev.misconception_tag].affected.add(s.name);
      }

      if (ev.event_type === 'REFLECTION_SUBMITTED' || ev.event_type === 'reflection_submitted') {
        const score = ev.metadata?.score || 0;
        if (score >= 4) reflectionScores.excellent++;
        else if (score === 3) reflectionScores.good++;
        else if (score === 2) reflectionScores.fair++;
        else reflectionScores.poor++;
      }
    });

    // 3. Finalize Data Formats for UI
    const heatQs = new Set();
    const bloomMap = {};
    questionsData.forEach(q => {
      if (q.id && q.bloom) bloomMap[q.id] = q.bloom;
    });
    const bloomCounts = { C1: { total: 0, correct: 0 }, C2: { total: 0, correct: 0 }, C3: { total: 0, correct: 0 }, C4: { total: 0, correct: 0 }, C5: { total: 0, correct: 0 }, C6: { total: 0, correct: 0 } };

    let totalXPAll = 0;
    let studentsBelow70 = 0;
    let studentsAbove90 = 0;
    studentMap.forEach((s) => {
      Object.keys(s.questions).forEach(q => heatQs.add(q));
      totalEpsCompleted += s.episodesCompleted.size;

      const eps = [];
      for (let ep in s.missions) {
        eps.push({ id: ep, missions: s.missions[ep].slice(-6) }); // Ambil 6 log terakhir per episode
      }
      if (eps.length > 0) metrics.learningJourney.push({ name: s.name, episodes: eps });

      // Menghitung Skor 0-100 berdasarkan unique questions
      let points = 0;
      let totalQs = 0;
      Object.entries(s.questions).forEach(([qId, status]) => {
        totalQs++;
        if (status === 'correct') points += 1;
        else if (status === 'hint') points += 0.5;

        // Agregasi Bloom
        const b = bloomMap[qId];
        if (b && bloomCounts[b]) {
          bloomCounts[b].total++;
          if (status === 'correct' || status === 'hint') bloomCounts[b].correct++;
        }
      });
      s.score100 = totalQs > 0 ? Math.round((points / totalQs) * 100) : 0;

      // Update intervention logic: Siswa dianggap butuh intervensi jika sudah menjawab soal (totalQs > 0) namun skor akhir di bawah 60, atau butuh banyak hint/remedial.
      const isStruggling = (s.remedials >= 1 || s.hints >= 3 || (totalQs > 0 && s.score100 < 60));
      s.needsIntervention = isStruggling;
      if (isStruggling) {
        studentsBelow70++;
      }
      if (s.score100 >= 85) {
        studentsAbove90++;
      }

      totalXPAll += s.score100;

      if (s.hints > 0) metrics.adaptiveStats.hint++;
      if (s.remedials > 0) metrics.adaptiveStats.remedial++;
      if (s.replays > 0) metrics.adaptiveStats.replay++;
      if (s.episodesCompleted.size === 4) metrics.adaptiveStats.completionRate++;
      if (s.remedials > 0) metrics.adaptiveStats.struggling++;
      if (s.hints === 0 && s.remedials === 0 && s.score100 > 0 && s.replays === 0) metrics.adaptiveStats.fastTrack++;
    });

    metrics.overview.averageScore = Math.round(totalXPAll / students.length) || 0;
    metrics.overview.studentsNeedIntervention = studentsBelow70;
    metrics.overview.highPerformers = studentsAbove90;
    metrics.adaptiveStats.completionRate = Math.round((metrics.adaptiveStats.completionRate / students.length) * 100) || 0;

    // Heatmap formatting
    const allQ = Array.from(heatQs);
    if (allQ.length === 0) allQ.push('Q1');
    metrics.heatmap = [];
    studentMap.forEach((s) => {
      const hmRow = { name: s.name, isActive: s.isActive };
      allQ.forEach(q => {
        hmRow[q] = s.questions[q] || 'empty';
      });
      metrics.heatmap.push(hmRow);
    });

    // Formatting Bloom Data
    const bloomLabels = { C1: 'C1 Mengingat', C2: 'C2 Memahami', C3: 'C3 Mengaplikasikan', C4: 'C4 Menganalisis', C5: 'C5 Mengevaluasi', C6: 'C6 Mencipta' };
    metrics.bloomData = Object.keys(bloomCounts).map(lvl => {
      const b = bloomCounts[lvl];
      const rate = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
      return { subject: bloomLabels[lvl], A: rate };
    });

    metrics.overview.episodeCompletionPct = Math.round((totalEpsCompleted / (students.length * 4)) * 100) || 0;
    metrics.overview.classProgressPct = metrics.overview.episodeCompletionPct;

    // Misconceptions
    const miscDictionary = {
      'M-ARR-01': { title: 'Kekeliruan Identifikasi Arrhenius', desc: 'murid mengira semua senyawa yang memiliki atom Hidrogen otomatis adalah asam (seperti CH4 atau NH3).' },
      'M-ARR-02': { title: 'Miskonsepsi Syarat Pelarut', desc: 'murid lupa bahwa teori Arrhenius mutlak membutuhkan air sebagai pelarut agar ionisasi terjadi.' },
      'M-BL-01': { title: 'Kebingungan Transfer Proton', desc: 'Kesulitan mengidentifikasi spesi mana yang bertindak sebagai donor dan akseptor proton dalam persamaan kesetimbangan.' },
      'M-LEW-01': { title: 'Keterbalikan Konsep Lewis', desc: 'murid sering terbalik mendefinisikan Asam Lewis (akseptor pasangan elektron) menjadi donor elektron karena terpaku pada proton (H+).' },
      'M-PH-01': { title: 'Skala Logaritmik vs Linier', desc: 'Pemahaman yang salah bahwa selisih 1 unit pH setara dengan selisih konsentrasi 1x lipat, bukan eksponensial basis 10.' },
      'M-KONJ-01': { title: 'Sifat Asam-Basa Konjugasi', desc: 'Asumsi intuitif yang keliru bahwa asam yang kuat akan menghasilkan basa konjugasi yang juga kuat (seharusnya sangat lemah).' },
      'M-TEORI-02': { title: 'Keterbatasan Teori', desc: 'murid menganggap hanya ada satu kebenaran mutlak; mereka kebingungan saat suatu spesi (seperti NH3) tidak bisa dijelaskan dengan Arrhenius tapi bisa dengan Brønsted-Lowry.' },
      'M-CAKUP-01': { title: 'Cakupan Universalitas Teori', desc: 'Kurangnya pemahaman hierarki teori; murid tidak menyadari bahwa semua asam-basa Brønsted-Lowry pasti merupakan asam-basa Lewis, tetapi tidak sebaliknya.' }
    };

    for (let tag in miscMap) {
      const dict = miscDictionary[tag] || { title: `Miskonsepsi ${tag}`, desc: 'Miskonsepsi umum terkait topik ini. Butuh intervensi guru untuk meluruskan pemahaman dasar.' };
      metrics.misconceptions.push({
        tag: tag,
        title: dict.title,
        count: miscMap[tag].count,
        description: dict.desc,
        affected: Array.from(miscMap[tag].affected)
      });
    }
    metrics.misconceptions.sort((a, b) => b.count - a.count);

    metrics.confidenceData = confScatter;

    let totalRef = reflectionScores.excellent + reflectionScores.good + reflectionScores.fair + reflectionScores.poor;
    if (totalRef > 0) {
      metrics.reflectionStats = {
        excellent: Math.round((reflectionScores.excellent / totalRef) * 100),
        good: Math.round((reflectionScores.good / totalRef) * 100),
        fair: Math.round((reflectionScores.fair / totalRef) * 100),
        poor: Math.round((reflectionScores.poor / totalRef) * 100),
        summary: "Kualitas refleksi kelas telah dihitung berdasarkan evaluasi AI pada riwayat jurnal."
      };
    }

    if (metrics.misconceptions.length > 0) {
      const topM = metrics.misconceptions[0];
      metrics.aiInsightFull = {
        sentiment: `Ditemukan pola miskonsepsi "${topM.tag}". Murid seperti ${topM.affected.join(', ')} kesulitan membedakan konsep dasarnya.`,
        adaptive: "Sistem mengaktifkan rekomendasi adaptif: Memprioritaskan soal pendukung dan menyediakan scaffolding tambahan pada topik ini."
      };
      metrics.aiInsight = {
        headline: `Fokus pada Miskonsepsi ${topM.tag}`,
        detail: `Terdapat ${topM.count} kejadian salah paham pada konsep tersebut.`,
        recommendations: ["Jelaskan ulang konsep", "Gunakan alat peraga"],
        interventions: topM.affected.slice(0, 3)
      };
    } else {
      metrics.aiInsightFull = { sentiment: "Data belum cukup atau kinerja murid sangat baik.", adaptive: "Rekomendasi belum diperlukan." };
      metrics.aiInsight = { headline: "Semua Normal", detail: "Pemahaman kelas stabil", recommendations: ["Lanjutkan misi"], interventions: [] };
    }

    const sorted = Array.from(studentMap.values()).sort((a, b) => b.score100 - a.score100);

    metrics.studentsList = sorted.map(s => ({
      name: s.name,
      nis: s.nis,
      score: s.score100,
      progress: s.episodesCompleted.size * 25,
      episodesCompleted: s.episodesCompleted.size,
      hintsUsed: s.hints,
      remedials: s.remedials,
      isActive: s.isActive,
      timeSec: s.timeSec,
      questions: s.questions,
      needsIntervention: s.needsIntervention || false
    }));

    if (sorted.length > 0) {
      metrics.leaderboard.topExplorer.name = sorted[0].name;
      metrics.leaderboard.fastLearner.name = sorted[0].name;
      if (sorted.length > 1) metrics.leaderboard.mostImproved.name = sorted[1].name;
    }

    metrics.episodeProgress = [
      { id: 1, title: 'Episode 1', pct: metrics.overview.episodeCompletionPct },
      { id: 2, title: 'Episode 2', pct: Math.floor(metrics.overview.episodeCompletionPct / 2) },
      { id: 3, title: 'Episode 3', pct: 0 },
      { id: 4, title: 'Episode 4', pct: 0 }
    ];

    return metrics;
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return getEmptyData();
  }
}

function getEmptyData() {
  return {
    overview: { className: "-", totalStudents: 0, classProgressPct: 0, averageScore: 0, episodeCompletionPct: 0, studentsNeedIntervention: 0, highPerformers: 0 },
    studentsList: [],
    episodeProgress: [{ id: 1, title: 'Episode 1', pct: 0 }],
    learningJourney: [],
    heatmap: [],
    bloomData: [
      { subject: 'C1 Mengingat', A: 0 },
      { subject: 'C2 Memahami', A: 0 },
      { subject: 'C3 Mengaplikasikan', A: 0 },
      { subject: 'C4 Menganalisis', A: 0 },
      { subject: 'C5 Mengevaluasi', A: 0 },
      { subject: 'C6 Mencipta', A: 0 }
    ],
    misconceptions: [],
    confidenceData: [],
    adaptiveStats: { fastTrack: 0, hint: 0, remedial: 0, replay: 0 },
    reflectionStats: { excellent: 0, good: 0, fair: 0, poor: 0, summary: "Belum ada data refleksi." },
    leaderboard: {
      topExplorer: { name: '-', detail: 'Tertinggi', icon: 'gold' },
      fastLearner: { name: '-', detail: 'Tercepat', icon: 'silver' },
      mostImproved: { name: '-', detail: 'Kenaikan', icon: 'bronze' },
      criticalThinker: { name: '-', detail: 'HOTS', icon: 'gold' },
      mostPersistent: { name: '-', detail: 'Pantang Menyerah', icon: 'silver' }
    },
    aiInsightFull: { sentiment: "Belum ada data analitik dari database.", adaptive: "Sistem menunggu murid menyelesaikan kuis." },
    aiInsight: { headline: "Menunggu Data", detail: "murid belum aktif.", recommendations: [], interventions: [] }
  };
}

export async function toggleStudentStatus(nis, currentStatus) {
  if (!supabase) return false;
  try {
    const newStatus = !currentStatus;
    const { error } = await supabase.from('cq_students').update({ is_active: newStatus }).eq('nis', nis);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Gagal merubah status murid:', error);
    return false;
  }
}
