import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../core/SupabaseClient';
import { Brain, User, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function TeacherLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (supabase) {
        const { data: teacher, error: fetchError } = await supabase
          .from('cq_teachers')
          .select('*')
          .eq('username', username)
          .single();

        if (fetchError || !teacher) {
          throw new Error('Username tidak ditemukan');
        }

        if (teacher.password !== password) {
          throw new Error('Password salah');
        }

        localStorage.setItem('teacherSession', JSON.stringify({ 
          username: teacher.username,
          class_code: teacher.class_code 
        }));
        navigate('/teacher');
      } else {
        if (username === 'admin_guru' && password === 'guru123') {
          localStorage.setItem('teacherSession', JSON.stringify({ username }));
          navigate('/teacher');
        } else {
          throw new Error('Kredensial lokal salah');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Image Layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'url(/map_bg.png) center center / cover no-repeat fixed', zIndex: 0 }} />
      {/* Overlay with Frosted Glass Effect */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 1 }} />
      
      {/* Dynamic Background Elements */}
      <div style={styles.bgCircle1}></div>
      <div style={styles.bgCircle2}></div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrapper}>
            <Brain size={32} color="#ffffff" />
          </div>
          <h2 style={styles.title}>Teacher Portal</h2>
          <p style={styles.subtitle}>ChemQuest Analytics & Diagnosis</p>
        </div>
        
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrapper}>
              <User size={18} color="#64748b" style={styles.inputIcon} />
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                required
                style={styles.input}
                placeholder="Masukkan username"
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required
                style={styles.input}
                placeholder="Masukkan password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
          >
            {loading ? 'Memeriksa...' : (
              <>
                <LogIn size={18} /> Masuk ke Dashboard
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          &copy; 2026 ChemQuest EduGame
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif"
  },
  bgCircle1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, rgba(248,250,252,0) 70%)',
    zIndex: 2
  },
  bgCircle2: {
    position: 'absolute',
    bottom: '-20%',
    right: '-10%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(248,250,252,0) 70%)',
    zIndex: 2
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: '24px',
    padding: '48px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    zIndex: 3,
    position: 'relative',
    border: '1px solid #f1f5f9'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px'
  },
  logoWrapper: {
    backgroundColor: '#2563eb',
    padding: '16px',
    borderRadius: '16px',
    marginBottom: '16px',
    boxShadow: '0 10px 15px -3px rgba(37,99,235,0.3)'
  },
  title: {
    margin: 0,
    color: '#0f172a',
    fontSize: '1.75rem',
    fontWeight: '800',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#64748b',
    fontSize: '0.95rem',
    fontWeight: '500'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '24px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#334155'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '14px'
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '0.95rem',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s',
    outline: 'none'
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2), 0 2px 4px -2px rgba(37,99,235,0.2)',
    transition: 'all 0.2s',
    marginTop: '8px'
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    boxShadow: 'none',
    cursor: 'not-allowed'
  },
  footer: {
    textAlign: 'center',
    marginTop: '32px',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: '500'
  }
};
