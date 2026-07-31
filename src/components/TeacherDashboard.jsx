import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Route, Grid, AlertTriangle, Brain, Trophy, Users, Lightbulb, TrendingUp, AlertCircle, Sparkles, CheckCircle, XCircle, Circle, Medal, Star, Database, Download, Power, PowerOff } from 'lucide-react';
import { fetchTeacherMetrics, toggleStudentStatus } from '../core/TeacherEngine';
import { AIClient } from '../core/AIClient';
import QuestionManager from './QuestionManager';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar } from 'recharts';
import * as XLSX from 'xlsx';
import questionsData from '../data/questions.json';
import { supabase } from '../core/SupabaseClient';
import './TeacherDashboard.css';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realAiInsight, setRealAiInsight] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState(null);
  
  const [heatmapSort, setHeatmapSort] = useState('asc');
  const [heatmapStatusFilter, setHeatmapStatusFilter] = useState('all');
  const [heatmapSearch, setHeatmapSearch] = useState('');
  const [selectedQuestionModal, setSelectedQuestionModal] = useState(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportSortBy, setReportSortBy] = useState('score_desc');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');

  useEffect(() => {
    const sessionStr = localStorage.getItem('teacherSession');
    if (!sessionStr) {
      navigate('/teacher/login');
      return;
    }
    const sessionData = JSON.parse(sessionStr);
    fetchTeacherMetrics(sessionData.class_code).then(data => {
      setMetrics(data);
      setLoading(false);

      const cachedAiStr = localStorage.getItem(`cq_ai_insight_${sessionData.class_code}`);
      if (cachedAiStr) {
        try {
          const cachedAi = JSON.parse(cachedAiStr);
          setRealAiInsight(cachedAi.data);
        } catch(e) {
          console.error('Failed to parse cached AI insight', e);
        }
      }
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('teacherSession');
    navigate('/teacher/login');
  };

  const handleToggleStatus = (nis, currentStatus) => {
    setModalConfig({
      isOpen: true,
      title: currentStatus ? 'Nonaktifkan Murid?' : 'Aktifkan Murid?',
      message: currentStatus 
        ? 'Yakin ingin menonaktifkan murid ini? Mereka tidak akan bisa masuk ke dalam game sementara waktu.' 
        : 'Yakin ingin mengaktifkan kembali murid ini sehingga bisa bermain kembali?',
      onConfirm: async () => {
        setModalConfig(null);
        const success = await toggleStudentStatus(nis, currentStatus);
        if (success) {
          const sessionStr = localStorage.getItem('teacherSession');
          if (sessionStr) {
            const sessionData = JSON.parse(sessionStr);
            fetchTeacherMetrics(sessionData.class_code).then(setMetrics);
          }
        } else {
          alert('Gagal merubah status murid. Silakan coba lagi.');
        }
      },
      onCancel: () => setModalConfig(null)
    });
  };

  const handleGenerateAI = async () => {
    if (!metrics) return;
    setIsAiLoading(true);
    try {
      // Kita kirimkan heatmap dan misconceptions ke AI
      const classData = {
        heatmap: metrics.heatmap,
        misconceptions: metrics.misconceptions
      };
      const result = await AIClient.generateDashboardInsights(classData);
      setRealAiInsight(result);
      
      const sessionStr = localStorage.getItem('teacherSession');
      if (sessionStr) {
        const sessionData = JSON.parse(sessionStr);
        localStorage.setItem(`cq_ai_insight_${sessionData.class_code}`, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyusun AI insight.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadXLSX = () => {
    if (!metrics || !metrics.studentsList) return;
    const dataToExport = metrics.studentsList.map(s => {
      const baseData = {
        'Nama Lengkap': s.name,
        'NIS': s.nis,
        'Total XP': s.score,
        'Episode Selesai': s.episodesCompleted,
        'Total Waktu (Menit)': Math.round(s.timeSec / 60) || 0,
        'Total Bantuan Hint': s.hintsUsed,
        'Total Remedial': s.remedials,
        'Status Aktif': s.isActive ? 'Aktif' : 'Menunggu'
      };

      if (s.questions) {
        Object.keys(s.questions).forEach(q => {
          let val = s.questions[q];
          if (val === 'correct') val = 'Benar';
          else if (val === 'incorrect') val = 'Salah';
          else if (val === 'hint') val = 'Benar dgn Hint';
          baseData[`Soal ${q}`] = val;
        });
      }
      return baseData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan murid");
    XLSX.writeFile(workbook, "Laporan_murid_ChemQuest.xlsx");
  };

  const handleViewQuestion = async (qId) => {
    setIsLoadingQuestion(true);
    setSelectedQuestionModal({ id: qId, loading: true });
    
    let qData = questionsData.find(q => q.id === qId);
    if (!qData && supabase) {
      try {
        const { data } = await supabase.from('questions').select('*').eq('id', qId).single();
        if (data) qData = data;
      } catch(e) {
        console.error(e);
      }
    }

    if (qData) {
      setSelectedQuestionModal({ id: qId, data: qData, loading: false });
    } else {
      setSelectedQuestionModal({ id: qId, error: 'Soal tidak ditemukan.', loading: false });
    }
    setIsLoadingQuestion(false);
  };

  const scoreDistributionData = useMemo(() => {
    if (!metrics || !metrics.studentsList) return [];
    const dist = { '0-499': 0, '500-999': 0, '1000-1499': 0, '1500+': 0 };
    metrics.studentsList.forEach(s => {
      if (s.score < 500) dist['0-499']++;
      else if (s.score < 1000) dist['500-999']++;
      else if (s.score < 1500) dist['1000-1499']++;
      else dist['1500+']++;
    });
    return [
      { range: '0-499', count: dist['0-499'] },
      { range: '500-999', count: dist['500-999'] },
      { range: '1000-1499', count: dist['1000-1499'] },
      { range: '1500+', count: dist['1500+'] }
    ];
  }, [metrics]);

  if (loading) return <div className="td-empty-state">Menganalisis data kelas...</div>;
  if (!metrics) return <div className="td-empty-state">Gagal memuat data.</div>;

  return (
    <div className="td-container">
      {/* HEADER */}
      <header className="td-header">
        <div className="td-header-left">
          <Brain className="td-logo-icon" size={28} />
          <div>
            <h1 className="td-title">ChemQuest Teacher Portal</h1>
            <p className="td-subtitle">{metrics.overview.className} • {metrics.overview.totalStudents} murid</p>
          </div>
        </div>
        <button className="td-btn-logout" onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      <div className="td-layout">
        {/* SIDEBAR */}
        <aside className="td-sidebar">
          <NavBtn id="overview" icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab} set={setActiveTab} />
          <NavBtn id="heatmap" icon={<Grid size={18} />} label="Class Heatmap" active={activeTab} set={setActiveTab} />
          <NavBtn id="diagnosis" icon={<AlertTriangle size={18} />} label="Diagnosis & Misconceptions" active={activeTab} set={setActiveTab} />
          <NavBtn id="reports" icon={<Users size={18} />} label="Laporan murid" active={activeTab} set={setActiveTab} />
          <NavBtn id="questions" icon={<Database size={18} />} label="Bank Soal" active={activeTab} set={setActiveTab} />
          <NavBtn id="ai" icon={<Brain size={18} />} label="Asisten Pintar & Adaptif" active={activeTab} set={setActiveTab} />
        </aside>

        {/* CONTENT AREA */}
        <div className={`td-content ${activeTab === 'heatmap' ? 'heatmap-no-padding' : ''}`}>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="td-fade-in">
              <div className="td-stats-grid">
                <StatCard label="Class Progress" value={`${metrics.overview.classProgressPct}%`} icon={<TrendingUp />} color="var(--primary)" />
                <StatCard label="Average XP" value={metrics.overview.averageScore} icon={<Trophy />} color="var(--success)" />
                <StatCard label="Episode Completion" value={`${metrics.overview.episodeCompletionPct}%`} icon={<CheckCircle />} color="var(--info)" />
                <StatCard label="Need Intervention" value={metrics.overview.studentsNeedIntervention} icon={<AlertCircle />} color="var(--danger)" />
              </div>

              <div className="td-grid-2">
                <div className="td-card">
                  <h3 className="td-card-title">Progress Peta Episode</h3>
                  <div className="td-episode-progress">
                    {metrics.episodeProgress.map(ep => (
                      <div key={ep.id} className="td-ep-row">
                        <div className="td-ep-label"><Circle size={12} style={{ marginRight: '6px' }} /> {ep.title}</div>
                        <div className="td-ep-bar-wrap">
                          <div className="td-ep-bar" style={{ width: `${ep.pct}%` }}></div>
                        </div>
                        <div className="td-ep-pct">{ep.pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="td-card ai-insight-card">
                  <h3 className="td-card-title"><Sparkles size={18} color="#f59e0b" /> Asisten Guru Pintar</h3>

                  {!realAiInsight ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p style={{ color: '#6b5a4a', marginBottom: '16px' }}>Klik tombol di bawah untuk meminta DeepSeek v4 Pro menganalisis data heatmap dan miskonsepsi kelas Anda saat ini.</p>
                      <button
                        onClick={handleGenerateAI}
                        disabled={isAiLoading}
                        style={{ padding: '10px 20px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', cursor: isAiLoading ? 'wait' : 'pointer', fontWeight: 'bold' }}
                      >
                        {isAiLoading ? 'Sedang Menganalisis...' : 'Hasilkan Analisis Pintar'}
                      </button>
                    </div>
                  ) : (
                    <div className="ai-insight-content">
                      <div style={{ marginBottom: '16px' }}>
                        <strong style={{ display: 'block', color: '#2a6f8f', marginBottom: '4px' }}>Analisis Sentimen Kelas:</strong>
                        <p>{realAiInsight.sentiment}</p>
                      </div>
                      <div className="ai-rec-box" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                        <strong style={{ display: 'block', color: '#b45309', marginBottom: '4px' }}>Rekomendasi Adaptif Guru:</strong>
                        <p style={{ margin: 0, color: '#92400e' }}>{realAiInsight.adaptive}</p>
                      </div>
                      <div className="ai-intervention" style={{ marginTop: '16px' }}>
                        <strong>murid Butuh Perhatian: </strong>
                        {metrics.overview.studentsNeedIntervention > 0 ? `${metrics.overview.studentsNeedIntervention} murid (Lihat Heatmap)` : 'Tidak Ada'}
                      </div>
                      <div style={{ marginTop: '16px', textAlign: 'right' }}>
                        <button
                          onClick={handleGenerateAI}
                          disabled={isAiLoading}
                          style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: '8px', cursor: isAiLoading ? 'wait' : 'pointer', fontWeight: 'bold' }}
                        >
                          {isAiLoading ? 'Memperbarui...' : 'Perbarui Analisis'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DISTRIBUSI & PERHATIAN */}
              <div className="td-grid-2" style={{ marginTop: '24px' }}>
                <div className="td-card">
                  <h3 className="td-card-title">Distribusi Skor Mastery</h3>
                  <div style={{ height: '220px', width: '100%', marginTop: '16px' }}>
                    <ResponsiveContainer>
                      <BarChart data={scoreDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#6b5a4a' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#6b5a4a' }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(42,111,143,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="count" fill="#2a6f8f" radius={[6, 6, 0, 0]} name="Jumlah Siswa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="td-card">
                  <h3 className="td-card-title">Siswa Butuh Perhatian (Skor &lt; 70)</h3>
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '220px', overflowY: 'auto', paddingRight: '8px' }}>
                    {(() => {
                      const needsAttention = metrics.studentsList.filter(s => s.score < 70).sort((a,b) => a.score - b.score);
                      if (needsAttention.length > 0) {
                        return needsAttention.map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'rgba(220,53,69,0.05)', borderRadius: '8px', border: '1px solid rgba(220,53,69,0.1)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 'bold', color: '#dc3545', fontSize: '0.95rem' }}>{s.name}</span>
                              <span style={{ fontSize: '0.8rem', color: '#6b5a4a' }}>NIS: {s.nis}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#dc3545' }}>{s.score}</span>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: '#dc3545' }}>Total XP</span>
                            </div>
                          </div>
                        ));
                      } else {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b5a4a' }}>
                            <CheckCircle size={32} color="#2a6f3f" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                            <p style={{ margin: 0, fontSize: '0.95rem' }}>Bagus! Tidak ada siswa yang butuh intervensi.</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="td-fade-in heatmap-full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="td-section-title">Heatmap Kelas</h2>
                  <p className="td-section-subtitle">Matriks jawaban murid per pertanyaan untuk identifikasi cepat.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="Cari murid..." 
                    value={heatmapSearch}
                    onChange={(e) => setHeatmapSearch(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '150px' }}
                  />
                  <select value={heatmapSort} onChange={(e) => setHeatmapSort(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="asc">Nama (A-Z)</option>
                    <option value="desc">Nama (Z-A)</option>
                  </select>
                  <select value={heatmapStatusFilter} onChange={(e) => setHeatmapStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif Saja</option>
                    <option value="inactive">Nonaktif Saja</option>
                  </select>
                </div>
              </div>

              <div className="heatmap-legend">
                <span className="legend-item"><div className="hm-box correct"></div> Benar</span>
                <span className="legend-item"><div className="hm-box hint"></div> Benar + Hint</span>
                <span className="legend-item"><div className="hm-box incorrect"></div> Salah</span>
                <span className="legend-item"><div className="hm-box empty"></div> Belum Dikerjakan</span>
              </div>

              <div className="heatmap-table-wrap">
                <table className="heatmap-table">
                  <thead>
                    <tr>
                      <th>murid</th>
                      {metrics.heatmap.length > 0 && Object.keys(metrics.heatmap[0])
                        .filter(k => k !== 'name' && k !== 'isActive')
                        .map(q => (
                          <th 
                            key={q} 
                            style={{ cursor: 'pointer', color: '#2a6f8f', textDecoration: 'underline' }} 
                            onClick={() => handleViewQuestion(q)}
                            title="Klik untuk melihat detail soal"
                          >
                            {q}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let displayedHeatmap = [...metrics.heatmap];
                      if (heatmapStatusFilter === 'active') {
                        displayedHeatmap = displayedHeatmap.filter(r => r.isActive);
                      } else if (heatmapStatusFilter === 'inactive') {
                        displayedHeatmap = displayedHeatmap.filter(r => !r.isActive);
                      }
                      if (heatmapSearch.trim() !== '') {
                        displayedHeatmap = displayedHeatmap.filter(r => 
                          r.name.toLowerCase().includes(heatmapSearch.toLowerCase())
                        );
                      }
                    
                      displayedHeatmap.sort((a, b) => {
                        if (heatmapSort === 'asc') return a.name.localeCompare(b.name);
                        return b.name.localeCompare(a.name);
                      });

                      return displayedHeatmap.map((row, i) => (
                        <tr key={i}>
                          <td className="hm-name">{row.name}</td>
                          {Object.keys(row)
                            .filter(k => k !== 'name' && k !== 'isActive')
                            .map(q => (
                              <td key={q}><div className={`hm-cell ${row[q]}`}></div></td>
                            ))}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DIAGNOSIS */}
          {activeTab === 'diagnosis' && (
            <div className="td-fade-in td-grid-2">
              <div className="td-card" style={{ gridColumn: '1 / -1' }}>
                <h3 className="td-card-title">Misconception Analytics</h3>
                <div className="misc-list">
                  {metrics.misconceptions.map((m, i) => (
                    <div key={i} className="misc-item">
                      <div className="misc-header">
                        <span className="misc-tag" style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ffeeba' }}>
                          {m.tag} - {m.title}
                        </span>
                        <span className="misc-count" style={{ fontWeight: 'bold' }}>
                          {m.count} kejadian ({m.affected.length} murid)
                        </span>
                      </div>
                      <div className="misc-bar-bg" style={{ marginTop: '10px' }}>
                        <div className="misc-bar" style={{ width: `${Math.min((m.count / 20) * 100, 100)}%` }}></div>
                      </div>
                      <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '10px', borderLeft: '4px solid #dc3545' }}>
                        <p className="misc-desc" style={{ margin: 0, color: '#333' }}>
                          <strong>Analisis Kognitif:</strong> {m.description}
                        </p>
                      </div>
                      <div className="misc-affected" style={{ marginTop: '10px' }}>
                        <strong>murid Terdampak: </strong> {m.affected.length > 0 ? m.affected.join(', ') : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="td-card">
                <h3 className="td-card-title">Confidence vs Correctness</h3>
                <p className="chart-sub">Scatter plot 4 Kuadran Diagnosis</p>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="correctness" type="number" domain={[0, 100]} name="Benar (%)" unit="%" />
                      <YAxis dataKey="confidence" type="number" domain={[0, 100]} name="Yakin (%)" unit="%" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Soal" data={metrics.confidenceData} fill="#8884d8" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="td-card">
                <h3 className="td-card-title">Bloom Taxonomy Performance</h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metrics.bloomData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Kelas" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* AI & ADAPTIVE */}
          {activeTab === 'ai' && (
            <div className="td-fade-in td-grid-2">
              <div className="td-card ai-insight-card" style={{ gridColumn: '1 / -1' }}>
                <h3 className="td-card-title"><Brain size={20} color="#f59e0b" style={{ marginRight: 8 }} /> Diagnosis Lengkap</h3>
                <div className="ai-insight-content large">
                  <p><strong>Analisis Sentimen Kelas:</strong> {metrics.aiInsightFull?.sentiment || "Sedang menganalisis sentimen..."}</p>
                  <p><strong>Rekomendasi Adaptif:</strong> {metrics.aiInsightFull?.adaptive || "Sedang menyiapkan rekomendasi..."}</p>
                </div>
              </div>

              <div className="td-card">
                <h3 className="td-card-title">Adaptive Learning Flow</h3>
                <div className="adaptive-flow-box">
                  <FlowItem label="Langsung Naik Level" val={metrics.adaptiveStats.fastTrack} color="var(--success)" />
                  <FlowItem label="Mendapat Hint" val={metrics.adaptiveStats.hint} color="var(--warning)" />
                  <FlowItem label="Masuk Remedial" val={metrics.adaptiveStats.remedial} color="var(--danger)" />
                  <FlowItem label="Mengulang Mission" val={metrics.adaptiveStats.replay} color="var(--info)" />
                </div>
              </div>

              <div className="td-card">
                <h3 className="td-card-title">Reflection Quality</h3>
                <div className="reflection-bars">
                  <RefBar label="Excellent" val={metrics.reflectionStats.excellent} />
                  <RefBar label="Good" val={metrics.reflectionStats.good} />
                  <RefBar label="Fair" val={metrics.reflectionStats.fair} />
                  <RefBar label="Poor" val={metrics.reflectionStats.poor} />
                </div>
                <div className="reflection-summary" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2d3b3' }}>
                  <strong>Ringkasan Pintar:</strong> {metrics.reflectionStats.summary}
                </div>
              </div>
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="td-fade-in td-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 className="td-section-title">Laporan Lengkap murid</h2>
                  <p className="td-section-subtitle">Daftar roster kelas beserta metrik kinerja individu.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    placeholder="Cari nama atau NIS..." 
                    value={reportSearchTerm} 
                    onChange={(e) => setReportSearchTerm(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '200px' }}
                  />
                  <select value={reportSortBy} onChange={(e) => setReportSortBy(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="score_desc">Skor (Tertinggi)</option>
                    <option value="score_asc">Skor (Terendah)</option>
                    <option value="name_asc">Nama (A-Z)</option>
                    <option value="name_desc">Nama (Z-A)</option>
                  </select>
                  <select value={reportStatusFilter} onChange={(e) => setReportStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                  <button
                    onClick={handleDownloadXLSX}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#2a6f3f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    <Download size={18} /> Export
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid #e2d3b3' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(59,42,26,0.05)', color: '#3b2a1a' }}>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Nama Lengkap</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>NIS</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Total XP</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Progress (Episode)</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Bantuan Hint</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Remedial</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Status</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      if (!metrics.studentsList) return null;
                      let displayedReports = [...metrics.studentsList];
                      
                      // Search
                      if (reportSearchTerm) {
                        const term = reportSearchTerm.toLowerCase();
                        displayedReports = displayedReports.filter(s => 
                          s.name.toLowerCase().includes(term) || String(s.nis).toLowerCase().includes(term)
                        );
                      }
                      
                      // Filter
                      if (reportStatusFilter === 'active') {
                        displayedReports = displayedReports.filter(s => s.isActive);
                      } else if (reportStatusFilter === 'inactive') {
                        displayedReports = displayedReports.filter(s => !s.isActive);
                      }
                      
                      // Sort
                      displayedReports.sort((a, b) => {
                        if (reportSortBy === 'score_desc') return b.score - a.score;
                        if (reportSortBy === 'score_asc') return a.score - b.score;
                        if (reportSortBy === 'name_asc') return a.name.localeCompare(b.name);
                        if (reportSortBy === 'name_desc') return b.name.localeCompare(a.name);
                        return 0;
                      });

                      if (displayedReports.length === 0) {
                        return (
                          <tr>
                            <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#6b5a4a' }}>Data murid tidak ditemukan</td>
                          </tr>
                        );
                      }

                      return displayedReports.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2d3b3' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#2a6f8f' }}>{s.name}</td>
                          <td style={{ padding: '12px 16px' }}>{s.nis}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ backgroundColor: s.score > 500 ? 'rgba(42,111,63,0.1)' : 'rgba(220,53,69,0.1)', color: s.score > 500 ? '#2a6f3f' : '#dc3545', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                              {s.score}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>{s.episodesCompleted} Ep</td>
                          <td style={{ padding: '12px 16px' }}>{s.hintsUsed} kali</td>
                          <td style={{ padding: '12px 16px' }}>{s.remedials} kali</td>
                          <td style={{ padding: '12px 16px' }}>{s.isActive ? 'Aktif' : 'Nonaktif'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleToggleStatus(s.nis, s.isActive)}
                              style={{
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                background: s.isActive ? 'rgba(220,53,69,0.1)' : 'rgba(42,111,63,0.1)',
                                color: s.isActive ? '#dc3545' : '#2a6f3f',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.8rem'
                              }}
                            >
                              {s.isActive ? <><PowerOff size={14} /> Nonaktifkan</> : <><Power size={14} /> Aktifkan</>}
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QUESTIONS BANK */}
          {activeTab === 'questions' && (
            <div className="td-fade-in td-card">
              <h2 className="td-section-title">Manajemen Bank Soal</h2>
              <p className="td-section-subtitle">Pusat pengelolaan soal dari database.</p>
              <QuestionManager />
            </div>
          )}

        </main>
      </div>

      {modalConfig && modalConfig.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#3b2a1a', fontSize: '1.2rem', fontFamily: "'Cinzel Decorative', serif" }}>{modalConfig.title}</h3>
            <p style={{ color: '#6b5a4a', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5' }}>{modalConfig.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={modalConfig.onCancel} 
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#666' }}
              >
                Batal
              </button>
              <button 
                onClick={modalConfig.onConfirm} 
                style={{ padding: '8px 16px', background: '#2a6f8f', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedQuestionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '600px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#3b2a1a', fontSize: '1.2rem', fontFamily: "'Cinzel Decorative', serif", borderBottom: '1px solid #e2d3b3', paddingBottom: '12px' }}>
              Detail Soal: {selectedQuestionModal.id}
            </h3>
            
            {selectedQuestionModal.loading ? (
              <p>Memuat soal...</p>
            ) : selectedQuestionModal.error ? (
              <p style={{ color: '#dc3545' }}>{selectedQuestionModal.error}</p>
            ) : (
              <div>
                <p style={{ fontSize: '1rem', color: '#3b2a1a', lineHeight: '1.6', marginBottom: '20px' }}>
                  {selectedQuestionModal.data.stem || selectedQuestionModal.data.q}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedQuestionModal.data.options?.map((opt, i) => {
                    const isObj = typeof opt === 'object';
                    const text = isObj ? opt.text : opt;
                    const isCorrect = isObj ? opt.isCorrect : (opt === selectedQuestionModal.data.answer || opt === selectedQuestionModal.data.correct_option);
                    return (
                      <div key={i} style={{ padding: '12px', borderRadius: '8px', border: isCorrect ? '2px solid #2a6f3f' : '1px solid #ccc', backgroundColor: isCorrect ? 'rgba(42,111,63,0.1)' : 'transparent', fontWeight: isCorrect ? 'bold' : 'normal' }}>
                        {isObj && opt.label ? `${opt.label}. ` : ''}{text}
                        {isCorrect && <span style={{ marginLeft: '8px', color: '#2a6f3f' }}>✓ (Benar)</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button 
                onClick={() => setSelectedQuestionModal(null)} 
                style={{ padding: '8px 16px', background: '#2a6f8f', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* HELPER COMPONENTS */
function NavBtn({ id, icon, label, active, set }) {
  return (
    <button className={`td-nav-btn ${active === id ? 'active' : ''}`} onClick={() => set(id)}>
      {icon} {label}
    </button>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="td-stat-card">
      <div className="stat-icon" style={{ color: color, backgroundColor: `${color}20` }}>{icon}</div>
      <div className="stat-info">
        <span className="td-stat-value">{value}</span>
        <span className="td-stat-label">{label}</span>
      </div>
    </div>
  );
}

function FlowItem({ label, val, color }) {
  return (
    <div className="flow-item">
      <div className="flow-bar" style={{ width: `${Math.min(val * 4, 100)}%`, backgroundColor: color }}></div>
      <div className="flow-text"><strong>{val} students</strong> - {label}</div>
    </div>
  );
}

function RefBar({ label, val }) {
  return (
    <div className="ref-row">
      <span className="ref-label">{label}</span>
      <div className="ref-bar-wrap">
        <div className="ref-bar" style={{ width: `${val}%` }}></div>
      </div>
      <span className="ref-val">{val}%</span>
    </div>
  );
}

function AwardCard({ title, icon, student, detail }) {
  let renderedIcon = icon;
  if (typeof icon === 'string') {
    if (icon === 'gold') renderedIcon = <Trophy size={32} color="#f59e0b" />;
    else if (icon === 'silver') renderedIcon = <Medal size={32} color="#9ca3af" />;
    else if (icon === 'bronze') renderedIcon = <Medal size={32} color="#cd7f32" />;
    else renderedIcon = <Star size={32} color="#2a6f8f" />;
  }

  return (
    <div className="award-card">
      <div className="award-icon">{renderedIcon}</div>
      <div className="award-title">{title}</div>
      <div className="award-student">{student}</div>
      <div className="award-detail">{detail}</div>
    </div>
  );
}
