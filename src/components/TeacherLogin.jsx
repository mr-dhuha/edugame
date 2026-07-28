import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../core/SupabaseClient';

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

        // Login sukses, simpan sesi ke localStorage
        localStorage.setItem('teacherSession', JSON.stringify({ 
          username: teacher.username,
          class_code: teacher.class_code 
        }));
        navigate('/teacher');
      } else {
        // Fallback jika tanpa Supabase
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
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fdfdfd' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>Dashboard Guru</h2>
      
      {error && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>{error}</div>}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Memeriksa...' : 'Masuk sebagai Guru'}
        </button>
      </form>
    </div>
  );
}
