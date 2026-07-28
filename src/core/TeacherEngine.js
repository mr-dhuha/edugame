import { supabase } from './SupabaseClient';

export async function fetchTeacherMetrics(class_code = null) {
  if (!supabase) return mockData();

  const metrics = {
    students: [],
    pendingStudents: [],
    misconceptions: [],
    classAverages: {
      mastery: 0,
      totalTimeSec: 0,
    },
    reflections: []
  };

  try {
    // Fetch all logs (in a real app, filter by student_id linked to this class)
    const { data: analytics, error: aErr } = await supabase.from('analytics_events').select('*');
    const { data: masteryLogs, error: mErr } = await supabase.from('mastery_logs').select('*').order('timestamp', { ascending: true });
    
    // Fetch students in this class
    let studentQuery = supabase.from('cq_students').select('nis, name, is_active');
    if (class_code) {
      studentQuery = studentQuery.eq('class_code', class_code);
    }
    const { data: studentList, error: sErr } = await studentQuery;

    if (aErr || mErr || sErr) throw new Error('Gagal mengambil data dari Supabase');

    // Separate active and pending students
    studentList.forEach(s => {
      if (s.is_active) {
        metrics.students.push({ nis: s.nis, name: s.name, currentMastery: 50, badges: 0, completedEpisodes: new Set(), totalTimeSec: 0 });
      } else {
        metrics.pendingStudents.push(s);
      }
    });

    const studentMap = new Map();
    metrics.students.forEach(s => studentMap.set(s.nis, s));

    // Process Mastery Logs (get latest mastery per student per concept, sum them up)
    // Actually, mastery is overall score per student, not per concept in our simple prototype
    masteryLogs.forEach(log => {
      if (!studentMap.has(log.student_id)) {
        studentMap.set(log.student_id, { nis: log.student_id, name: log.student_id, currentMastery: 50, badges: 0, completedEpisodes: new Set(), totalTimeSec: 0 });
      }
      studentMap.get(log.student_id).currentMastery = log.new_score; // Latest score overwrites
    });

    const misconceptionCounts = {};
    let totalClassTime = 0;
    let studentCount = 0;

    analytics.forEach(log => {
      const sId = log.student_id;
      if (!studentMap.has(sId)) {
         studentMap.set(sId, { nis: sId, name: sId, currentMastery: 50, badges: 0, completedEpisodes: new Set(), totalTimeSec: 0 });
      }
      const s = studentMap.get(sId);

      // Track time
      if (log.response_time_ms) {
        const timeSec = log.response_time_ms / 1000;
        s.totalTimeSec += timeSec;
        totalClassTime += timeSec;
      }

      // Track completed episodes
      if (log.event_type === 'EPISODE_COMPLETED') {
        s.completedEpisodes.add(log.episode_id);
      }

      // Track badges
      if (log.event_type === 'BADGE_UNLOCKED') {
        s.badges += 1;
      }

      // Track misconceptions
      if (log.misconception_tag) {
        if (!misconceptionCounts[log.misconception_tag]) {
          misconceptionCounts[log.misconception_tag] = 0;
        }
        misconceptionCounts[log.misconception_tag]++;
      }

      // Track reflections
      if (log.event_type === 'REFLECTION_SUBMITTED') {
        metrics.reflections.push({
          studentName: studentMap.get(sId).name,
          episodeId: log.episode_id,
          score: log.metadata?.score || 0,
          text: log.metadata?.responseText || '',
          keywords: log.metadata?.matchedKeywords || []
        });
      }
    });

    // Format students array
    let totalMastery = 0;
    studentMap.forEach(s => {
      metrics.students.push({
        ...s,
        completedEpisodes: s.completedEpisodes.size
      });
      totalMastery += s.currentMastery;
      studentCount++;
    });

    // Format averages
    if (studentCount > 0) {
      metrics.classAverages.mastery = totalMastery / studentCount;
      metrics.classAverages.totalTimeSec = totalClassTime / studentCount;
    }

    // Format misconceptions
    for (const [tag, count] of Object.entries(misconceptionCounts)) {
      metrics.misconceptions.push({ tag, count });
    }
    metrics.misconceptions.sort((a, b) => b.count - a.count);

    return metrics;
  } catch (error) {
    console.error(error);
    return mockData(); // Fallback
  }
}

function mockData() {
  return {
    students: [
      { nis: '123', name: 'Andi Pratama (Mock)', completedEpisodes: 4, currentMastery: 92, badges: 5, totalTimeSec: 1500 },
      { nis: '124', name: 'Budi Santoso (Mock)', completedEpisodes: 2, currentMastery: 65, badges: 2, totalTimeSec: 800 }
    ],
    misconceptions: [
      { tag: 'M-ARR-01', count: 12 },
      { tag: 'M-PH-02', count: 8 },
      { tag: 'M-TIT-01', count: 5 }
    ],
    classAverages: {
      mastery: 78.5,
      totalTimeSec: 1150
    },
    reflections: [
      { studentName: 'Andi Pratama (Mock)', episodeId: 1, score: 3, text: 'Asam arrhenius butuh air, sedangkan brønsted lowry itu transfer proton.', keywords: ['arrhenius', 'air', 'proton'] },
      { studentName: 'Budi Santoso (Mock)', episodeId: 1, score: 1, text: 'Pokoknya arrhenius pakai air.', keywords: ['arrhenius', 'air'] }
    ]
  };
}

export async function approveStudent(nis) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('cq_students')
      .update({ is_active: true })
      .eq('nis', nis);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Gagal menyetujui siswa:', error);
    return false;
  }
}
