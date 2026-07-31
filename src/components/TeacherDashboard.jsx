import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Route, Grid, AlertTriangle, Brain, Trophy, Users, Lightbulb, TrendingUp, AlertCircle, Sparkles, CheckCircle, XCircle, Circle, Medal, Star, Database, Download } from 'lucide-react';
import { fetchTeacherMetrics, approveStudent } from '../core/TeacherEngine';
import { AIClient } from '../core/AIClient';
import QuestionManager from './QuestionManager';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import * as XLSX from 'xlsx';
import './TeacherDashboard.css';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realAiInsight, setRealAiInsight] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

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
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('teacherSession');
    navigate('/teacher/login');
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
    } catch (err) {
      console.error(err);
      alert('Gagal menyusun AI insight.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadXLSX = () => {
    if (!metrics || !metrics.studentsList) return;
    const dataToExport = metrics.studentsList.map(s => ({
      'Nama Lengkap': s.name,
      'NIS': s.nis,
      'Skor Mastery': s.score,
      'Episode Selesai': s.episodesCompleted,
      'Bantuan Hint': s.hintsUsed,
      'Remedial': s.remedials,
      'Status Aktif': s.isActive ? 'Aktif' : 'Menunggu'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan murid");
    XLSX.writeFile(workbook, "Laporan_murid_ChemQuest.xlsx");
  };

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
          <NavBtn id="journey" icon={<Route size={18} />} label="Learning Journey" active={activeTab} set={setActiveTab} />
          <NavBtn id="heatmap" icon={<Grid size={18} />} label="Class Heatmap" active={activeTab} set={setActiveTab} />
          <NavBtn id="diagnosis" icon={<AlertTriangle size={18} />} label="Diagnosis & Misconceptions" active={activeTab} set={setActiveTab} />
          <NavBtn id="reports" icon={<Users size={18} />} label="Laporan murid" active={activeTab} set={setActiveTab} />
          <NavBtn id="questions" icon={<Database size={18} />} label="Bank Soal" active={activeTab} set={setActiveTab} />
          <NavBtn id="ai" icon={<Brain size={18} />} label="Asisten Pintar & Adaptif" active={activeTab} set={setActiveTab} />
          <NavBtn id="awards" icon={<Trophy size={18} />} label="Reflections & Leaderboard" active={activeTab} set={setActiveTab} />
        </aside>

        {/* CONTENT AREA */}
        <main className="td-content">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="td-fade-in">
              <div className="td-stats-grid">
                <StatCard label="Class Progress" value={`${metrics.overview.classProgressPct}%`} icon={<TrendingUp />} color="var(--primary)" />
                <StatCard label="Average Score" value={metrics.overview.averageScore} icon={<Trophy />} color="var(--success)" />
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LEARNING JOURNEY */}
          {activeTab === 'journey' && (
            <div className="td-fade-in td-card">
              <h2 className="td-section-title">Student Learning Journey</h2>
              <p className="td-section-subtitle">Timeline perjalanan per murid di setiap episode.</p>

              <div className="td-journey-list">
                {metrics.learningJourney.map((student, i) => (
                  <div key={i} className="td-journey-student">
                    <h4 className="journey-name">{student.name}</h4>
                    {student.episodes.map(ep => (
                      <div key={ep.id} className="journey-episode">
                        <div className="journey-ep-title">Episode {ep.id}</div>
                        <div className="journey-timeline">
                          {ep.missions.map((m, idx) => (
                            <React.Fragment key={idx}>
                              <div className={`journey-node ${m.status}`} title={m.label}>
                                {m.status === 'pass' && <CheckCircle size={14} color="#fff" />}
                                {m.status === 'complete' && <Trophy size={14} color="#fff" />}
                                {m.status === 'fail' && <XCircle size={14} color="#fff" />}
                                {m.status === 'hint' && <Lightbulb size={12} color="#fff" />}
                                {m.status === 'remedial' && <AlertTriangle size={14} color="#fff" />}
                              </div>
                              {idx < ep.missions.length - 1 && <div className="journey-line"></div>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="td-fade-in td-card">
              <h2 className="td-section-title">Heatmap Kelas</h2>
              <p className="td-section-subtitle">Matriks jawaban murid per pertanyaan untuk identifikasi cepat.</p>

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
                        .filter(k => k !== 'name')
                        .map(q => <th key={q}>{q.toUpperCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.heatmap.map((row, i) => (
                      <tr key={i}>
                        <td className="hm-name">{row.name}</td>
                        {Object.keys(row)
                          .filter(k => k !== 'name')
                          .map(q => (
                            <td key={q}><div className={`hm-cell ${row[q]}`}></div></td>
                          ))}
                      </tr>
                    ))}
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
                <h3 className="td-card-title"><Brain size={20} color="#f59e0b" style={{ marginRight: 8 }} /> Diagnosis Pintar Penuh</h3>
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

          {/* AWARDS */}
          {activeTab === 'awards' && (
            <div className="td-fade-in td-card">
              <h2 className="td-section-title">Student Leaderboard</h2>
              <p className="td-section-subtitle">Apresiasi berdasarkan pencapaian unik, bukan sekadar nilai tertinggi.</p>

              <div className="awards-grid">
                <AwardCard title="Top Explorer" icon={metrics.leaderboard.topExplorer.icon} student={metrics.leaderboard.topExplorer.name} detail={metrics.leaderboard.topExplorer.detail} />
                <AwardCard title="Fast Learner" icon={metrics.leaderboard.fastLearner.icon} student={metrics.leaderboard.fastLearner.name} detail={metrics.leaderboard.fastLearner.detail} />
                <AwardCard title="Most Improved" icon={metrics.leaderboard.mostImproved.icon} student={metrics.leaderboard.mostImproved.name} detail={metrics.leaderboard.mostImproved.detail} />
                <AwardCard title="Critical Thinker" icon={metrics.leaderboard.criticalThinker.icon} student={metrics.leaderboard.criticalThinker.name} detail={metrics.leaderboard.criticalThinker.detail} />
                <AwardCard title="Most Persistent" icon={metrics.leaderboard.mostPersistent.icon} student={metrics.leaderboard.mostPersistent.name} detail={metrics.leaderboard.mostPersistent.detail} />
              </div>
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="td-fade-in td-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 className="td-section-title">Laporan Lengkap murid</h2>
                  <p className="td-section-subtitle">Daftar roster kelas beserta metrik kinerja individu.</p>
                </div>
                <button
                  onClick={handleDownloadXLSX}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#2a6f3f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  <Download size={18} /> Export XLSX
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid #e2d3b3' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(59,42,26,0.05)', color: '#3b2a1a' }}>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Nama Lengkap</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>NIS</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Skor Mastery</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Progress (Episode)</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Bantuan Hint</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Remedial</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2d3b3' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.studentsList && metrics.studentsList.length > 0 ? (
                      metrics.studentsList.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2d3b3' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#2a6f8f' }}>{s.name}</td>
                          <td style={{ padding: '12px 16px' }}>{s.nis}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ backgroundColor: s.score > 70 ? 'rgba(42,111,63,0.1)' : 'rgba(220,53,69,0.1)', color: s.score > 70 ? '#2a6f3f' : '#dc3545', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                              {s.score}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>{s.episodesCompleted} Ep</td>
                          <td style={{ padding: '12px 16px' }}>{s.hintsUsed} kali</td>
                          <td style={{ padding: '12px 16px' }}>{s.remedials} kali</td>
                          <td style={{ padding: '12px 16px' }}>{s.isActive ? 'Aktif' : 'Menunggu'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#6b5a4a' }}>Belum ada data murid</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QUESTIONS BANK */}
          {activeTab === 'questions' && (
            <div className="td-fade-in td-card">
              <h2 className="td-section-title">Manajemen Bank Soal</h2>
              <p className="td-section-subtitle">Pusat pengelolaan soal dari database Supabase.</p>
              <QuestionManager />
            </div>
          )}

        </main>
      </div>
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
