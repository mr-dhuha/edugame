import React, { useState } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { playerModel } from '../core/PlayerModel';
import { supabase } from '../core/SupabaseClient';

export default function LoginScreen() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [nis, setNis] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nis.trim() || !password.trim()) {
      setError('Harap isi NISN dan Password');
      return;
    }
    if (!isLoginMode && !name.trim()) {
      setError('Harap isi Nama Lengkap untuk pendaftaran');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (supabase) {
        if (isLoginMode) {
          // ALUR LOGIN
          const { data: existingStudent, error: fetchError } = await supabase
            .from('cq_students')
            .select('*')
            .eq('nis', nis)
            .single();

          if (fetchError || !existingStudent) {
            setError('Akun tidak ditemukan. Pastikan NISN benar atau silakan mendaftar terlebih dahulu.');
            setLoading(false);
            return;
          }

          if (existingStudent.password !== password) {
            setError('Password salah!');
            setLoading(false);
            return;
          }

          if (existingStudent.is_active === false) {
            setError('Akun Anda sedang dinonaktifkan oleh Guru. Silakan hubungi Guru Anda.');
            setLoading(false);
            return;
          }

          // Login berhasil
          playerModel.setProfile(existingStudent.nis, existingStudent.name);
          await playerModel.syncFromSupabase(existingStudent.nis, supabase);
        } else {
          // ALUR REGISTER (Mendaftar)
          // Cek dulu apakah NISN sudah ada
          const { data: checkExist } = await supabase
            .from('cq_students')
            .select('nis')
            .eq('nis', nis)
            .single();

          if (checkExist) {
            setError('NISN ini sudah didaftarkan! 1 NISN hanya untuk 1 akun. Silakan Masuk (Login).');
            setLoading(false);
            return;
          }

          const { error: insertError } = await supabase
            .from('cq_students')
            .insert([{ nis, name, password, class_code: classCode, is_active: true }]);

          if (insertError) throw insertError;

          playerModel.setProfile(nis, name);
          // Akun baru, belum ada riwayat, tidak perlu sync
        }
      } else {
        // Fallback local jika Supabase tidak jalan
        playerModel.setProfile(nis, isLoginMode ? 'murid Tamu' : name);
      }

      fsm.transition(STATES.DASHBOARD);
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', minHeight: '100dvh', background: 'url(/map_bg.png) center center / cover no-repeat fixed', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 20px', position: 'relative' }}>

      {/* Overlay to ensure readability */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '400px', margin: '0 auto', width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/img/logo.png" alt="ChemQuest" style={{ width: '100%', maxWidth: '280px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }} />
        </div>

        <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '2px solid rgba(59,42,26,0.15)' }}>
          <button
            onClick={() => { setIsLoginMode(true); setError(''); }}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: isLoginMode ? '3px solid #2a6f8f' : 'none', fontWeight: isLoginMode ? 'bold' : 'normal', color: isLoginMode ? '#2a6f8f' : '#6b5a4a', cursor: 'pointer', fontSize: '1rem', fontFamily: "'EB Garamond', serif" }}
          >
            Masuk
          </button>
          <button
            onClick={() => { setIsLoginMode(false); setError(''); }}
            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: !isLoginMode ? '3px solid #2a6f8f' : 'none', fontWeight: !isLoginMode ? 'bold' : 'normal', color: !isLoginMode ? '#2a6f8f' : '#6b5a4a', cursor: 'pointer', fontSize: '1rem', fontFamily: "'EB Garamond', serif" }}
          >
            Daftar Baru
          </button>
        </div>

        <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.8rem', color: '#ffd700', textAlign: 'center', marginBottom: '8px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          {isLoginMode ? 'Selamat Datang Kembali' : 'Buat Akun murid'}
        </h2>

        {error && <div style={{ color: '#c0392b', marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(192,57,43,0.1)', borderLeft: '4px solid #c0392b', borderRadius: '0 8px 8px 0', fontSize: '0.9rem', fontFamily: "'EB Garamond', serif" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '24px', borderRadius: '16px', border: '1.5px solid rgba(59,42,26,0.1)', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#6b5a4a', fontSize: '0.8rem', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>NISN / ID murid</label>
            <input
              type="text"
              value={nis}
              onChange={e => setNis(e.target.value)}
              required
              style={{ width: '100%', padding: '14px', border: '1.5px solid rgba(59,42,26,0.2)', borderRadius: '8px', background: '#fff', fontSize: '1rem', color: '#3b2a1a', outline: 'none' }}
              placeholder="Masukkan NISN Anda"
            />
          </div>

          {!isLoginMode && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#6b5a4a', fontSize: '0.8rem', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required={!isLoginMode}
                style={{ width: '100%', padding: '14px', border: '1.5px solid rgba(59,42,26,0.2)', borderRadius: '8px', background: '#fff', fontSize: '1rem', color: '#3b2a1a', outline: 'none' }}
                placeholder="Contoh: Budi Santoso"
              />
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#6b5a4a', fontSize: '0.8rem', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '14px', border: '1.5px solid rgba(59,42,26,0.2)', borderRadius: '8px', background: '#fff', fontSize: '1rem', color: '#3b2a1a', outline: 'none' }}
              placeholder="Masukkan password"
            />
          </div>

          {!isLoginMode && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#6b5a4a', fontSize: '0.8rem', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kode Kelas (Opsional)</label>
              <input
                type="text"
                value={classCode}
                onChange={e => setClassCode(e.target.value)}
                style={{ width: '100%', padding: '14px', border: '1.5px solid rgba(59,42,26,0.2)', borderRadius: '8px', background: '#fff', fontSize: '1rem', color: '#3b2a1a', outline: 'none' }}
                placeholder="Contoh: KIMIA-11A"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '16px', backgroundColor: '#2a6f8f', color: '#f4e4c1', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: "'Cinzel Decorative', serif", letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? 'Memproses...' : (isLoginMode ? 'Masuk ke Lab' : 'Daftar Sekarang')}
            {!loading && <img src="/img/btn_circle_play.png" alt="" style={{ width: '24px' }} />}
          </button>
        </form>

        {/* Footer Supported By */}
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <p style={{ color: '#3b2a1a', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '600', textShadow: '0 1px 1px rgba(255,255,255,0.8)', fontFamily: "'Inter', sans-serif" }}>
            Supported by LPPM UNRI
          </p>
          <img src="/img/Logo UNRI.png" alt="Logo UNRI" style={{ height: '50px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
        </div>
      </div>
    </div>
  );
}
