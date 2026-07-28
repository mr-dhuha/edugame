import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Trophy } from 'lucide-react';
import { fetchTeacherMetrics, approveStudent } from '../core/TeacherEngine';
import misconceptionsData from '../data/misconceptions.json';

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

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Memuat data kelas...</div>;
  if (!metrics) return <div>Gagal memuat data.</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #2c3e50', paddingBottom: '15px', marginBottom: '20px' }}>
        <h1 style={{ color: '#2c3e50', margin: 0 }}>ChemQuest Teacher Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* SIDEBAR */}
        <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={() => setActiveTab('overview')}
            style={{ padding: '10px', textAlign: 'left', backgroundColor: activeTab === 'overview' ? '#007bff' : '#f8f9fa', color: activeTab === 'overview' ? 'white' : 'black', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }}
          >
            📊 Overview
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            style={{ padding: '10px', textAlign: 'left', backgroundColor: activeTab === 'students' ? '#007bff' : '#f8f9fa', color: activeTab === 'students' ? 'white' : 'black', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }}
          >
            👥 Daftar Siswa
          </button>
          <button 
            onClick={() => setActiveTab('approval')}
            style={{ padding: '10px', textAlign: 'left', backgroundColor: activeTab === 'approval' ? '#007bff' : '#f8f9fa', color: activeTab === 'approval' ? 'white' : 'black', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', position: 'relative' }}
          >
            <CheckCircle size={18} style={{ marginRight: '8px' }} /> Persetujuan Siswa
            {metrics?.pendingStudents?.length > 0 && (
              <span style={{ position: 'absolute', right: '10px', background: '#dc3545', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '12px', fontWeight: 'bold' }}>
                {metrics.pendingStudents.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('reflections')}
            style={{ padding: '10px', textAlign: 'left', backgroundColor: activeTab === 'reflections' ? '#007bff' : '#f8f9fa', color: activeTab === 'reflections' ? 'white' : 'black', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }}
          >
            📝 Laporan Refleksi
          </button>
        </div>

        {/* CONTENT AREA */}
        <div style={{ flex: 1, backgroundColor: '#fdfdfd', padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div>
              <h2>Overview Kelas</h2>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#666' }}>Rata-Rata Mastery Kelas</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#28a745' }}>{Math.round(metrics.classAverages.mastery)}</div>
                </div>
                <div style={{ flex: 1, padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#666' }}>Rata-Rata Waktu Bermain</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#17a2b8' }}>{Math.round(metrics.classAverages.totalTimeSec / 60)} mnt</div>
                </div>
              </div>

              <h3>Peringatan Miskonsepsi Terbanyak</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>Materi berikut disarankan untuk dibahas kembali di pertemuan kelas besok:</p>
              
              {metrics.misconceptions.length === 0 ? (
                <div style={{ padding: '15px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px' }}>Belum ada miskonsepsi signifikan yang terdeteksi.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {metrics.misconceptions.map((m, i) => {
                    const info = misconceptionsData[m.tag];
                    return (
                      <div key={i} style={{ padding: '15px', borderLeft: '5px solid #dc3545', backgroundColor: '#fff', border: '1px solid #dee2e6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{m.tag} (Terjadi {m.count} kali)</strong>
                          <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Prioritas Tinggi</span>
                        </div>
                        <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>{info ? info.description : 'Deskripsi tidak ditemukan'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div>
              <h2>Daftar Siswa</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Nama Siswa</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>NIS</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Ep Selesai</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Mastery</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.students.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px' }}>{s.name}</td>
                      <td style={{ padding: '12px', color: '#666' }}>{s.nis}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{s.completedEpisodes} / 4</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: s.currentMastery > 75 ? '#28a745' : (s.currentMastery < 50 ? '#dc3545' : '#fd7e14') }}>
                        {Math.round(s.currentMastery)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Trophy size={16} color="#d4af37" /> {s.badges}</td>
                    </tr>
                  ))}
                  {metrics.students.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Belum ada data siswa.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* APPROVAL TAB */}
          {activeTab === 'approval' && (
            <div>
              <h2>Persetujuan Aktivasi Siswa</h2>
              <p style={{ color: '#666', fontSize: '14px' }}>Siswa di bawah ini telah mendaftar menggunakan Kode Kelas Anda. Setujui untuk mengaktifkan akun mereka.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                {metrics.pendingStudents && metrics.pendingStudents.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ fontSize: '16px' }}>{s.name}</strong>
                      <div style={{ fontSize: '14px', color: '#666' }}>NIS: {s.nis}</div>
                    </div>
                    <div>
                      <button 
                        onClick={() => handleApprove(s.nis, s.name)} 
                        style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Setujui Aktivasi
                      </button>
                    </div>
                  </div>
                ))}
                
                {(!metrics.pendingStudents || metrics.pendingStudents.length === 0) && (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '6px', color: '#666' }}>
                    Tidak ada siswa yang menunggu persetujuan.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REFLECTIONS TAB */}
          {activeTab === 'reflections' && (
            <div>
              <h2>Laporan Refleksi AI</h2>
              <p style={{ color: '#666', fontSize: '14px' }}>Hasil penilaian otomatis dari refleksi akhir episode siswa.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                {metrics.reflections.map((r, i) => (
                  <div key={i} style={{ padding: '15px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>{r.studentName} (Episode {r.episodeId})</strong>
                      <span style={{ padding: '4px 8px', backgroundColor: r.score >= 2 ? '#d4edda' : '#f8d7da', color: r.score >= 2 ? '#155724' : '#721c24', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                        Skor AI: {r.score} / 3
                      </span>
                    </div>
                    <p style={{ fontStyle: 'italic', color: '#555', margin: '0 0 10px 0', padding: '10px', backgroundColor: '#f8f9fa', borderLeft: '3px solid #ccc' }}>
                      "{r.text}"
                    </p>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <strong>Kata kunci terdeteksi: </strong> 
                      {r.keywords.length > 0 ? r.keywords.join(', ') : 'Tidak ada'}
                    </div>
                  </div>
                ))}
                {metrics.reflections.length === 0 && (
                  <div style={{ padding: '15px', backgroundColor: '#f8f9fa', textAlign: 'center', color: '#666' }}>
                    Belum ada refleksi yang dikumpulkan.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
