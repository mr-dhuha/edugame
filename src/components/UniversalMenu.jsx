import React, { useState } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { playerModel } from '../core/PlayerModel';
import { supabase } from '../core/SupabaseClient';
import { Settings, User, Star, TrendingUp, Trophy, Medal, Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../core';
import './UniversalMenu.css';

export default function UniversalMenu({ fsmState }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Modal States
  const [modalType, setModalType] = useState(null); // 'profile' | 'password'
  const [modalData, setModalData] = useState({ name: '', oldPassword: '', newPassword: '', confirmPassword: '' });
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Audio State
  const [bgmVol, setBgmVol] = useState(audioEngine.bgmVolume);
  const [sfxVol, setSfxVol] = useState(audioEngine.sfxVolume);

  const handleBgmChange = (e) => {
    const val = parseFloat(e.target.value);
    setBgmVol(val);
    audioEngine.setBgmVolume(val);
  };

  const handleSfxChange = (e) => {
    const val = parseFloat(e.target.value);
    setSfxVol(val);
    audioEngine.setSfxVolume(val);
  };

  // Don't show menu on Login or Init
  if (fsmState === STATES.INIT || fsmState === STATES.LOGIN) return null;

  const playerState = playerModel.exportState();

  const handleToggle = () => setIsOpen(!isOpen);

  const handleResume = () => setIsOpen(false);

  const openProfileModal = () => {
    setModalType('profile');
    setModalData({ ...modalData, name: playerState.profile.name });
    setModalError('');
  };

  const openPasswordModal = () => {
    setModalType('password');
    setModalData({ ...modalData, oldPassword: '', newPassword: '', confirmPassword: '' });
    setModalError('');
  };

  const closeModals = () => {
    setModalType(null);
  };

  const submitProfile = async () => {
    if (!supabase) return setModalError('Koneksi database tidak tersedia.');
    if (!modalData.name.trim()) return setModalError('Nama tidak boleh kosong.');

    setModalLoading(true);
    setModalError('');
    try {
      const { error } = await supabase
        .from('cq_students')
        .update({ name: modalData.name })
        .eq('nis', playerState.profile.studentId);

      if (error) throw error;

      playerModel.setProfile(playerState.profile.studentId, modalData.name);
      setModalLoading(false);
      closeModals();
      setIsOpen(false);
      alert('Profil berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      setModalError('Gagal memperbarui profil: ' + err.message);
      setModalLoading(false);
    }
  };

  const submitPassword = async () => {
    if (!supabase) return setModalError('Koneksi database tidak tersedia.');
    if (!modalData.oldPassword || !modalData.newPassword) return setModalError('Harap isi semua kolom.');
    if (modalData.newPassword !== modalData.confirmPassword) return setModalError('Kata sandi baru dan konfirmasi tidak cocok.');

    setModalLoading(true);
    setModalError('');
    try {
      // Verifikasi kata sandi lama secara aman (tidak di-return di inspector response)
      const { data: verifyData, error: verifyError } = await supabase
        .from('cq_students')
        .select('id')
        .eq('nis', playerState.profile.studentId)
        .eq('password', modalData.oldPassword)
        .single();

      if (verifyError || !verifyData) {
        setModalLoading(false);
        return setModalError('Kata sandi lama salah!');
      }

      // Update ke kata sandi baru
      const { error: updateError } = await supabase
        .from('cq_students')
        .update({ password: modalData.newPassword })
        .eq('nis', playerState.profile.studentId);

      if (updateError) throw updateError;

      setModalLoading(false);
      closeModals();
      alert('Kata sandi berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      setModalError('Gagal memperbarui kata sandi: ' + err.message);
      setModalLoading(false);
    }
  };

  const handleDashboard = () => {
    setIsOpen(false);
    fsm.transition(STATES.DASHBOARD);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('chemquest_fsm');
    localStorage.removeItem('chemquest_player');
    window.location.reload();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Helper to map badge IDs to more professional labels instead of raw IDs
  const formatBadgeName = (badgeId) => {
    const professionalNames = {
      'penjelajah-teori': 'Analis Teori',
      'spesialis-ph': 'Spesialis pH',
      'detektif-indikator': 'Pakar Indikator',
      'ahli-titrasi': 'Ahli Titrasi',
      'tanpa-petunjuk': 'Mandiri Akurat',
      'jawaban-cepat': 'Respon Sigap',
      'master-keyakinan': 'Akurasi Presisi'
    };
    return (professionalNames[badgeId] || badgeId.replace(/-/g, ' ')).toUpperCase();
  };

  return (
    <>
      <button className="um-toggle-btn" onClick={handleToggle}>
        <Settings size={28} />
      </button>

      {isOpen && (
        <div className="um-overlay">
          <div className="um-modal">
            {!showStats ? (
              <>
                <h2 className="um-title">Menu Utama</h2>
                <div className="um-btn-group">
                  <button className="um-btn primary" onClick={handleResume}>Lanjutkan Main</button>
                  <button className="um-btn" onClick={() => setShowStats(true)}>Status Pencapaian</button>
                  {fsmState !== STATES.DASHBOARD && (
                    <button className="um-btn warning" onClick={handleDashboard}>Kembali ke Peta</button>
                  )}
                  <button className="um-btn danger" onClick={handleLogout}>Keluar (Logout)</button>
                </div>

                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', border: '1px solid rgba(59,42,26,0.1)' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#3b2a1a', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>Pengaturan Audio</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b5a4a', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '4px' }}>
                        <span><Volume2 size={16} style={{ verticalAlign: 'text-bottom' }}/> Musik Latar</span>
                        <span>{Math.round(bgmVol * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={bgmVol} onChange={handleBgmChange} 
                        style={{ width: '100%', cursor: 'pointer' }} 
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b5a4a', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '4px' }}>
                        <span><Volume2 size={16} style={{ verticalAlign: 'text-bottom' }}/> Efek Suara</span>
                        <span>{Math.round(sfxVol * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={sfxVol} onChange={handleSfxChange} 
                        style={{ width: '100%', cursor: 'pointer' }} 
                      />
                    </div>
                  </div>
                </div>

                {showLogoutConfirm && (
                  <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,200,200,0.2)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: '12px' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#a34040', fontWeight: 'bold' }}>Yakin ingin keluar?</p>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#6b5a4a' }}>Semua progres akan terhapus jika belum tersinkronisasi.</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={confirmLogout} style={{ flex: 1, padding: '8px', background: '#a34040', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Ya, Keluar</button>
                      <button onClick={cancelLogout} style={{ flex: 1, padding: '8px', background: '#e0e0e0', color: '#3b2a1a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Batal</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="um-title">Pencapaian murid</h2>
                <div className="um-stats-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>

                  {/* Profile Header */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(59,42,26,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#2a6f8f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '3px solid #f4e4c1', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                        <User size={32} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', color: '#6b5a4a', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'Inter', sans-serif" }}>Pelajar</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3b2a1a', fontFamily: "'Cinzel Decorative', serif" }}>{playerState.profile.name}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={openProfileModal} style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: 'rgba(59,42,26,0.1)', color: '#3b2a1a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ubah Profil</button>
                      <button onClick={openPasswordModal} style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: 'rgba(59,42,26,0.1)', color: '#3b2a1a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ubah Password</button>
                    </div>
                    <button
                      onClick={() => {
                        fsm.transition(STATES.CERTIFICATE);
                        setIsOpen(false);
                      }}
                      style={{ width: '100%', padding: '10px', fontSize: '0.9rem', background: '#d4af37', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.3)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                    >
                      Unduh Sertifikat
                    </button>
                  </div>

                  {/* Stats Row */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, background: 'linear-gradient(135deg, #c9a84c, #b38b22)', padding: '16px 8px', borderRadius: '12px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(201,168,76,0.3)', border: '2px solid rgba(255,255,255,0.4)' }}>
                      <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, fontFamily: "'Inter', sans-serif" }}>Total XP</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: '900', fontFamily: "'Inter', sans-serif", marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Star size={24} fill="#fff" /> {playerState.xp}</div>
                    </div>

                    <div style={{ flex: 1, background: 'linear-gradient(135deg, #2a6f3f, #1e522e)', padding: '16px 8px', borderRadius: '12px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(42,111,63,0.3)', border: '2px solid rgba(255,255,255,0.4)' }}>
                      <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, fontFamily: "'Inter', sans-serif" }}>Mastery</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: '900', fontFamily: "'Inter', sans-serif", marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><TrendingUp size={24} /> {Math.round(playerState.mastery)}%</div>
                    </div>
                  </div>


                </div>
                <button className="um-btn primary" onClick={() => setShowStats(false)} style={{ marginTop: '20px', width: '100%' }}>Kembali</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Modals */}
      {modalType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#3b2a1a' }}>{modalType === 'profile' ? 'Ubah Profil' : 'Ubah Kata Sandi'}</h3>

            {modalError && <div style={{ color: 'red', marginBottom: '12px', fontSize: '0.9rem' }}>{modalError}</div>}

            {modalType === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.9rem', color: '#666' }}>Nama Lengkap</label>
                <input
                  type="text"
                  value={modalData.name}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>
            )}

            {modalType === 'password' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.9rem', color: '#666' }}>Kata Sandi Lama</label>
                <input
                  type="password"
                  value={modalData.oldPassword}
                  onChange={(e) => setModalData({ ...modalData, oldPassword: e.target.value })}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                />

                <label style={{ fontSize: '0.9rem', color: '#666' }}>Kata Sandi Baru</label>
                <input
                  type="password"
                  value={modalData.newPassword}
                  onChange={(e) => setModalData({ ...modalData, newPassword: e.target.value })}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                />

                <label style={{ fontSize: '0.9rem', color: '#666' }}>Konfirmasi Kata Sandi Baru</label>
                <input
                  type="password"
                  value={modalData.confirmPassword}
                  onChange={(e) => setModalData({ ...modalData, confirmPassword: e.target.value })}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={closeModals}
                style={{ flex: 1, padding: '10px', border: 'none', background: '#ccc', borderRadius: '6px', cursor: 'pointer' }}
                disabled={modalLoading}
              >
                Batal
              </button>
              <button
                onClick={modalType === 'profile' ? submitProfile : submitPassword}
                style={{ flex: 1, padding: '10px', border: 'none', background: '#28a745', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}
                disabled={modalLoading}
              >
                {modalLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
