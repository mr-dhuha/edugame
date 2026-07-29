import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Trophy, LogOut, Users, BarChart3, MessageSquare, Download } from 'lucide-react';
import { fetchTeacherMetrics, approveStudent } from '../core/TeacherEngine';
import misconceptionsData from '../data/misconceptions.json';
import './TeacherDashboard.css';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cek Sesi
    const sessionStr = localStorage.getItem('teacherSession');
    if (!sessionStr) {
      navigate('/teacher/login');
      return;
    }

    const sessionData = JSON.parse(sessionStr);

    // Load data
    fetchTeacherMetrics(sessionData.class_code).then(data => {
      setMetrics(data);
      setLoading(false);
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('teacherSession');
    navigate('/teacher/login');
  };

  const handleApprove = async (nis, name) => {
    if (!window.confirm(`Setujui aktivasi akun siswa ${name}?`)) return;
    
    setLoading(true);
    const success = await approveStudent(nis);
    if (success) {
      alert(`Siswa ${name} berhasil diaktifkan!`);
      // Refresh data
      const sessionStr = localStorage.getItem('teacherSession');
      const sessionData = JSON.parse(sessionStr);
      fetchTeacherMetrics(sessionData.class_code).then(data => {
        setMetrics(data);
        setLoading(false);
      });
    } else {
      alert('Gagal menyetujui siswa. Silakan coba lagi.');
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!metrics || !metrics.students) return;
    const headers = ['Nama', 'NIS', 'Episode Selesai', 'Mastery', 'Badge'];
    const rows = metrics.students.map(s => [
      s.name, 
      s.nis, 
      s.completedEpisodes, 
      Math.round(s.currentMastery), 
      s.badges
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'data_siswa_chemquest.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="td-empty-state" style={{ margin: '40px auto', maxWidth: '600px' }}>Memuat data kelas analitik...</div>;
  if (!metrics) return <div className="td-empty-state" style={{ margin: '40px auto', maxWidth: '600px' }}>Gagal memuat data.</div>;

  // Sorting misconceptions by count (descending)
  const sortedMisconceptions = [...metrics.misconceptions].sort((a, b) => b.count - a.count);

  return (
    <div className="td-container">
      {/* HEADER */}
      <header className="td-header">
        <h1 className="td-title"><BarChart3 size={24} color="#2563eb" /> ChemQuest Analytics Dashboard</h1>
        <button className="td-btn-logout" onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      <div className="td-layout">
        {/* SIDEBAR */}
        <aside className="td-sidebar">
          <button 
            className={`td-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 size={18} /> Overview
          </button>
          <button 
            className={`td-nav-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <Users size={18} /> Daftar Siswa
          </button>
          <button 
            className={`td-nav-btn ${activeTab === 'approval' ? 'active' : ''}`}
            onClick={() => setActiveTab('approval')}
          >
            <CheckCircle size={18} /> Persetujuan
            {metrics?.pendingStudents?.length > 0 && (
              <span className="td-badge">{metrics.pendingStudents.length}</span>
            )}
          </button>
          <button 
            className={`td-nav-btn ${activeTab === 'reflections' ? 'active' : ''}`}
            onClick={() => setActiveTab('reflections')}
          >
            <MessageSquare size={18} /> Refleksi AI
          </button>
        </aside>

        {/* CONTENT AREA */}
        <main className="td-content">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <section>
              <h2 className="td-section-title">Overview Kelas</h2>
              <p className="td-section-subtitle">Ringkasan performa kelas Anda hari ini.</p>
              
              <div className="td-stats-grid">
                <div className="td-stat-card">
                  <span className="td-stat-label">Total Siswa Aktif</span>
                  <span className="td-stat-value" style={{ color: '#2563eb' }}>{metrics.students.length}</span>
                </div>
                <div className="td-stat-card">
                  <span className="td-stat-label">Rata-Rata Mastery Kelas</span>
                  <span className="td-stat-value" style={{ color: '#10b981' }}>{Math.round(metrics.classAverages.mastery)}</span>
                </div>
                <div className="td-stat-card">
                  <span className="td-stat-label">Rata-Rata Waktu Bermain</span>
                  <span className="td-stat-value" style={{ color: '#8b5cf6' }}>{Math.round(metrics.classAverages.totalTimeSec / 60)} mnt</span>
                </div>
              </div>

              <h2 className="td-section-title">Actionable Insights</h2>
              <p className="td-section-subtitle">Prioritas miskonsepsi terbanyak yang harus dibahas di kelas.</p>
              
              {sortedMisconceptions.length === 0 ? (
                <div className="td-empty-state">Belum ada miskonsepsi signifikan yang terdeteksi. Kinerja kelas sangat baik!</div>
              ) : (
                <div className="td-action-list">
                  {sortedMisconceptions.map((m, i) => {
                    const info = misconceptionsData[m.tag];
                    const isHighPriority = m.count >= 3 || i === 0; // Highlight top or frequent ones
                    return (
                      <div key={i} className={`td-action-item ${isHighPriority ? '' : 'warning'}`}>
                        <div style={{ flex: 1 }}>
                          <div className="td-action-header">
                            <span className="td-action-title">{m.tag}</span>
                            <span className={`td-action-badge ${isHighPriority ? '' : 'warning'}`}>
                              Terjadi {m.count} kali
                            </span>
                          </div>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                            {info ? info.description : 'Deskripsi tidak ditemukan'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 className="td-section-title">Daftar Siswa</h2>
                  <p className="td-section-subtitle">Pantau progres individu dan tingkat penguasaan (Mastery).</p>
                </div>
                <button className="td-btn-primary" onClick={exportToCSV}>
                  <Download size={18} /> Ekspor Data (CSV)
                </button>
              </div>

              <div className="td-table-wrapper">
                <table className="td-table">
                  <thead>
                    <tr>
                      <th>Nama Siswa</th>
                      <th>NIS</th>
                      <th style={{ textAlign: 'center' }}>Ep Selesai</th>
                      <th>Mastery</th>
                      <th style={{ textAlign: 'center' }}>Badge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.students.map((s, i) => {
                      const masteryVal = Math.round(s.currentMastery);
                      const barColor = masteryVal >= 75 ? 'var(--td-success)' : (masteryVal < 50 ? 'var(--td-danger)' : 'var(--td-warning)');
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: '500' }}>{s.name}</td>
                          <td style={{ color: 'var(--td-text-muted)' }}>{s.nis}</td>
                          <td style={{ textAlign: 'center', fontWeight: '500' }}>{s.completedEpisodes} / 4</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontWeight: 'bold', width: '32px', color: barColor }}>{masteryVal}</span>
                              <div className="td-progress-container" style={{ flex: 1, maxWidth: '120px' }}>
                                <div className="td-progress-bar" style={{ width: `${Math.min(masteryVal, 100)}%`, backgroundColor: barColor }}></div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600' }}>
                              <Trophy size={16} color="#d4af37" /> {s.badges}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {metrics.students.length === 0 && (
                      <tr><td colSpan="5" className="td-empty-state" style={{ border: 'none' }}>Belum ada data siswa.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* APPROVAL TAB */}
          {activeTab === 'approval' && (
            <section>
              <h2 className="td-section-title">Persetujuan Aktivasi Siswa</h2>
              <p className="td-section-subtitle">Siswa di bawah ini telah mendaftar menggunakan Kode Kelas Anda. Setujui untuk mengaktifkan akun mereka.</p>
              
              <div className="td-action-list" style={{ marginTop: '24px' }}>
                {metrics.pendingStudents && metrics.pendingStudents.map((s, i) => (
                  <div key={i} className="td-action-item" style={{ borderLeftColor: 'var(--td-primary)', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>{s.name}</strong>
                      <span style={{ color: 'var(--td-text-muted)', fontSize: '0.9rem' }}>NIS: {s.nis}</span>
                    </div>
                    <button 
                      className="td-btn-success"
                      onClick={() => handleApprove(s.nis, s.name)} 
                    >
                      <CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }}/> Setujui Aktivasi
                    </button>
                  </div>
                ))}
                
                {(!metrics.pendingStudents || metrics.pendingStudents.length === 0) && (
                  <div className="td-empty-state">
                    Semua siswa telah disetujui. Tidak ada antrean baru.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* REFLECTIONS TAB */}
          {activeTab === 'reflections' && (
            <section>
              <h2 className="td-section-title">Laporan Refleksi AI</h2>
              <p className="td-section-subtitle">Hasil penilaian otomatis dari jurnal pemahaman siswa di akhir episode.</p>
              
              <div style={{ marginTop: '24px' }}>
                {metrics.reflections.map((r, i) => (
                  <div key={i} className="td-reflection-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--td-text-main)' }}>{r.studentName} <span style={{ color: 'var(--td-text-muted)', fontWeight: 'normal', fontSize: '0.9rem' }}>- Episode {r.episodeId}</span></strong>
                      <span className="td-action-badge" style={{ backgroundColor: r.score >= 2 ? 'var(--td-success)' : 'var(--td-danger)', color: 'white' }}>
                        Skor AI: {r.score} / 3
                      </span>
                    </div>
                    <div className="td-reflection-quote">
                      "{r.text}"
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--td-text-muted)' }}>
                      <strong>Kata kunci terdeteksi: </strong> 
                      <span style={{ color: 'var(--td-primary)' }}>{r.keywords.length > 0 ? r.keywords.join(', ') : 'Tidak ada'}</span>
                    </div>
                  </div>
                ))}
                
                {metrics.reflections.length === 0 && (
                  <div className="td-empty-state">
                    Belum ada jurnal refleksi yang dikumpulkan.
                  </div>
                )}
              </div>
            </section>
          )}

        </main>
      </div>
    </div>
  );
}
