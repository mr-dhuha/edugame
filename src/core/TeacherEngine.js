import { supabase } from './SupabaseClient';

export async function fetchTeacherMetrics(class_code = null) {
  if (!supabase) return getEmptyData();

  try {
    let studentQuery = supabase.from('cq_students').select('*').eq('is_active', true);
    if (class_code) studentQuery = studentQuery.eq('class_code', class_code);
    const { data: students, error: errS } = await studentQuery;

    if (errS) throw errS;
    if (!students || students.length === 0) return getEmptyData();

    const studentIds = students.map(s => s.nis);

    const { data: events, error: errE } = await supabase
      .from('analytics_events')
      .select('*')
      .in('student_id', studentIds)
      .order('timestamp', { ascending: true });

    const { data: masteryLogs, error: errM } = await supabase
      .from('mastery_logs')
      .select('*')
      .in('student_id', studentIds)
      .order('timestamp', { ascending: true });

    if (errE || errM) throw new Error("Gagal mengambil data event");

    // Initialize Metrics
    const metrics = getEmptyData();
    metrics.overview.className = class_code || "Semua Kelas";
    metrics.overview.totalStudents = students.length;

    const studentMap = new Map();
    students.forEach(s => {
      studentMap.set(s.nis, {
        name: s.name,
        episodesCompleted: new Set(),
        mastery: 0,
        timeSec: 0,
        missions: {},
        questions: {},
        hints: 0,
        remedials: 0,
        replays: 0
      });
    });

    // 1. Mastery Aggregation
    let totalMastery = 0;
    masteryLogs?.forEach(log => {
      if (studentMap.has(log.student_id)) {
        studentMap.get(log.student_id).mastery = log.new_score;
      }
    });
    studentMap.forEach(s => totalMastery += s.mastery);
    metrics.overview.averageScore = Math.round(totalMastery / students.length) || 0;

    let studentsBelow70 = 0;
    let studentsAbove90 = 0;
    studentMap.forEach(s => {
      if (s.mastery < 70) studentsBelow70++;
      if (s.mastery >= 90) studentsAbove90++;
    });
    metrics.overview.studentsNeedIntervention = studentsBelow70;
    metrics.overview.highPerformers = studentsAbove90;

    // 2. Events Aggregation
    const miscMap = {};
    const bloomMap = { 'C1': { t: 0, c: 0 }, 'C2': { t: 0, c: 0 }, 'C3': { t: 0, c: 0 }, 'C4': { t: 0, c: 0 }, 'C5': { t: 0, c: 0 }, 'C6': { t: 0, c: 0 } };
    const confScatter = [];
    const reflectionScores = { excellent: 0, good: 0, fair: 0, poor: 0 };
    let totalEpsCompleted = 0;

    events?.forEach(ev => {
      const s = studentMap.get(ev.student_id);
      if (!s) return;

      if (ev.response_time_ms) s.timeSec += ev.response_time_ms / 1000;

      if (ev.event_type === 'EPISODE_COMPLETED') {
        s.episodesCompleted.add(ev.episode_id);
      }

      if (ev.event_type === 'HINT_USED') s.hints++;
      if (ev.event_type === 'REMEDIAL_TRIGGERED') s.remedials++;

      if (ev.episode_id && ev.mission_id) {
        if (!s.missions[ev.episode_id]) s.missions[ev.episode_id] = [];
        const md = ev.metadata || {};

        if (ev.event_type === 'QUESTION_ANSWERED') {
          s.missions[ev.episode_id].push({ label: `Q:${ev.mission_id}`, status: md.isCorrect ? 'pass' : 'fail' });
          s.questions[ev.mission_id] = md.isCorrect ? 'correct' : 'incorrect';

          if (md.confidence_level) {
            let c = md.confidence_level === 'High' ? 90 : (md.confidence_level === 'Medium' ? 50 : 20);
            let corr = md.isCorrect ? 100 : 10;
            confScatter.push({
              name: ev.mission_id,
              confidence: c,
              correctness: corr,
              label: md.isCorrect ? 'Benar' : 'Salah'
            });
          }

          const bl = md.bloom_level || 'C1';
          if (bloomMap[bl]) {
            bloomMap[bl].t++;
            if (md.isCorrect) bloomMap[bl].c++;
          }
        }
        if (ev.event_type === 'HINT_USED') {
          s.missions[ev.episode_id].push({ label: 'Hint', status: 'hint' });
          if (s.questions[ev.mission_id] === 'correct') s.questions[ev.mission_id] = 'hint';
        }
        if (ev.event_type === 'REMEDIAL_TRIGGERED') {
          s.missions[ev.episode_id].push({ label: 'Remedial', status: 'remedial' });
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
    studentMap.forEach((s) => {
      Object.keys(s.questions).forEach(q => heatQs.add(q));
      totalEpsCompleted += s.episodesCompleted.size;

      const eps = [];
      for (let ep in s.missions) {
        eps.push({ id: ep, missions: s.missions[ep].slice(-6) }); // Ambil 6 log terakhir per episode
      }
      if (eps.length > 0) metrics.learningJourney.push({ name: s.name, episodes: eps });

      metrics.adaptiveStats.hint += s.hints;
      metrics.adaptiveStats.remedial += s.remedials;
      if (s.hints === 0 && s.remedials === 0 && s.mastery > 0) metrics.adaptiveStats.fastTrack++;
    });

    // Heatmap formatting
    const allQ = Array.from(heatQs).slice(0, 10);
    if (allQ.length === 0) allQ.push('Q1');
    metrics.heatmap = [];
    studentMap.forEach((s) => {
      const hmRow = { name: s.name.split(' ')[0] };
      allQ.forEach(q => {
        hmRow[q] = s.questions[q] || 'empty';
      });
      metrics.heatmap.push(hmRow);
    });

    metrics.overview.episodeCompletionPct = Math.round((totalEpsCompleted / (students.length * 4)) * 100) || 0;
    metrics.overview.classProgressPct = metrics.overview.episodeCompletionPct;

    // Misconceptions
    const miscDictionary = {
      'M-ARR-01': { title: 'Kekeliruan Identifikasi Arrhenius', desc: 'Siswa mengira semua senyawa yang memiliki atom Hidrogen otomatis adalah asam (seperti CH4 atau NH3).' },
      'M-ARR-02': { title: 'Miskonsepsi Syarat Pelarut', desc: 'Siswa lupa bahwa teori Arrhenius mutlak membutuhkan air sebagai pelarut agar ionisasi terjadi.' },
      'M-BL-01': { title: 'Kebingungan Transfer Proton', desc: 'Kesulitan mengidentifikasi spesi mana yang bertindak sebagai donor dan akseptor proton dalam persamaan kesetimbangan.' },
      'M-LEW-01': { title: 'Keterbalikan Konsep Lewis', desc: 'Siswa sering terbalik mendefinisikan Asam Lewis (akseptor pasangan elektron) menjadi donor elektron karena terpaku pada proton (H+).' },
      'M-PH-01': { title: 'Skala Logaritmik vs Linier', desc: 'Pemahaman yang salah bahwa selisih 1 unit pH setara dengan selisih konsentrasi 1x lipat, bukan eksponensial basis 10.' },
      'M-KONJ-01': { title: 'Sifat Asam-Basa Konjugasi', desc: 'Asumsi intuitif yang keliru bahwa asam yang kuat akan menghasilkan basa konjugasi yang juga kuat (seharusnya sangat lemah).' },
      'M-TEORI-02': { title: 'Keterbatasan Teori', desc: 'Siswa menganggap hanya ada satu kebenaran mutlak; mereka kebingungan saat suatu spesi (seperti NH3) tidak bisa dijelaskan dengan Arrhenius tapi bisa dengan Brønsted-Lowry.' },
      'M-CAKUP-01': { title: 'Cakupan Universalitas Teori', desc: 'Kurangnya pemahaman hierarki teori; siswa tidak menyadari bahwa semua asam-basa Brønsted-Lowry pasti merupakan asam-basa Lewis, tetapi tidak sebaliknya.' }
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

    // Bloom Radar
    metrics.bloomData = [
      { subject: 'C1', A: Math.round((bloomMap['C1'].c / (bloomMap['C1'].t || 1)) * 100), fullMark: 100 },
      { subject: 'C2', A: Math.round((bloomMap['C2'].c / (bloomMap['C2'].t || 1)) * 100), fullMark: 100 },
      { subject: 'C3', A: Math.round((bloomMap['C3'].c / (bloomMap['C3'].t || 1)) * 100), fullMark: 100 },
      { subject: 'C4', A: Math.round((bloomMap['C4'].c / (bloomMap['C4'].t || 1)) * 100), fullMark: 100 },
      { subject: 'C5/C6', A: Math.round(((bloomMap['C5'].c + bloomMap['C6'].c) / ((bloomMap['C5'].t + bloomMap['C6'].t) || 1)) * 100), fullMark: 100 }
    ];

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
        sentiment: `Ditemukan pola miskonsepsi "${topM.tag}". Siswa seperti ${topM.affected.join(', ')} kesulitan membedakan konsep dasarnya.`,
        adaptive: "Sistem mengaktifkan rekomendasi adaptif: Memprioritaskan soal pendukung dan menyediakan scaffolding tambahan pada topik ini."
      };
      metrics.aiInsight = {
        headline: `Fokus pada Miskonsepsi ${topM.tag}`,
        detail: `Terdapat ${topM.count} kejadian salah paham pada konsep tersebut.`,
        recommendations: ["Jelaskan ulang konsep", "Gunakan alat peraga"],
        interventions: topM.affected.slice(0, 3)
      };
    } else {
      metrics.aiInsightFull = { sentiment: "Data belum cukup atau kinerja siswa sangat baik.", adaptive: "Rekomendasi belum diperlukan." };
      metrics.aiInsight = { headline: "Semua Normal", detail: "Pemahaman kelas stabil", recommendations: ["Lanjutkan misi"], interventions: [] };
    }

    const sorted = Array.from(studentMap.values()).sort((a, b) => b.mastery - a.mastery);

    metrics.studentsList = sorted.map(s => ({
      name: s.name,
      nis: s.nis,
      score: Math.round(s.mastery),
      episodesCompleted: s.episodesCompleted.size,
      hintsUsed: s.hints,
      remedials: s.remedials,
      isActive: s.is_active
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
    heatmap: [{ name: '-', q1: 'empty' }],
    misconceptions: [],
    confidenceData: [],
    bloomData: [
      { subject: 'C1', A: 0, fullMark: 100 }, { subject: 'C2', A: 0, fullMark: 100 }, { subject: 'C3', A: 0, fullMark: 100 }, { subject: 'C4', A: 0, fullMark: 100 }, { subject: 'C5/C6', A: 0, fullMark: 100 }
    ],
    adaptiveStats: { fastTrack: 0, hint: 0, remedial: 0, replay: 0 },
    reflectionStats: { excellent: 0, good: 0, fair: 0, poor: 0, summary: "Belum ada data refleksi." },
    leaderboard: {
      topExplorer: { name: '-', detail: 'Tertinggi', icon: 'gold' },
      fastLearner: { name: '-', detail: 'Tercepat', icon: 'silver' },
      mostImproved: { name: '-', detail: 'Kenaikan', icon: 'bronze' },
      criticalThinker: { name: '-', detail: 'HOTS', icon: 'gold' },
      mostPersistent: { name: '-', detail: 'Pantang Menyerah', icon: 'silver' }
    },
    aiInsightFull: { sentiment: "Belum ada data analitik dari database.", adaptive: "Sistem menunggu siswa menyelesaikan kuis." },
    aiInsight: { headline: "Menunggu Data", detail: "Siswa belum aktif.", recommendations: [], interventions: [] }
  };
}

export async function approveStudent(nis) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('cq_students').update({ is_active: true }).eq('nis', nis);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Gagal menyetujui siswa:', error);
    return false;
  }
}
