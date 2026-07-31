import React, { useState, useEffect } from 'react';
import { supabase } from '../core/SupabaseClient';
import { Edit2, Trash2, Plus, Save, X, RefreshCw } from 'lucide-react';

export default function QuestionManager() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err.message);
      // alert('Gagal memuat soal dari Supabase');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (q) => {
    setEditingId(q.id);
    let normalizedOptions = [];
    if (q.options && q.options.length > 0) {
      if (typeof q.options[0] === 'string') {
        normalizedOptions = q.options.map((opt, idx) => ({
          label: String.fromCharCode(65 + idx),
          text: opt,
          isCorrect: q.answer ? opt === q.answer : (q.correct_option ? opt === q.correct_option : false)
        }));
      } else {
        normalizedOptions = [...q.options];
      }
    }
    // Pastikan selalu ada 5 opsi
    while (normalizedOptions.length < 5) {
      normalizedOptions.push({ label: String.fromCharCode(65 + normalizedOptions.length), text: '', isCorrect: false });
    }

    setFormData({ ...q, options: normalizedOptions });
    setIsAdding(false);
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingId('NEW');
    setFormData({
      q: '',
      options: [
        { label: 'A', text: '', isCorrect: true },
        { label: 'B', text: '', isCorrect: false },
        { label: 'C', text: '', isCorrect: false },
        { label: 'D', text: '', isCorrect: false },
        { label: 'E', text: '', isCorrect: false }
      ],
      answer: '',
      episode: 1,
      level: 'Easy',
      mission_title: '',
      category: '',
      bloom: 'C1',
      feedback_correct: '',
      hint_wrong: '',
      misconception_tag: '',
      points: 100,
      time_sec: 60
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (idx, field, value) => {
    setFormData(prev => {
      const newOpts = [...(prev.options || [])];
      if (!newOpts[idx]) newOpts[idx] = {};
      newOpts[idx][field] = value;
      return { ...prev, options: newOpts };
    });
  };

  const handleSave = async () => {
    try {
      if (isAdding) {
        const { error } = await supabase.from('questions').insert([formData]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('questions').update(formData).eq('id', editingId);
        if (error) throw error;
      }
      setEditingId(null);
      setIsAdding(false);
      fetchQuestions();
    } catch (err) {
      console.error('Error saving question:', err.message);
      alert('Gagal menyimpan soal.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus soal ini?')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      fetchQuestions();
    } catch (err) {
      console.error('Error deleting question:', err.message);
      alert('Gagal menghapus soal.');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#6b5a4a' }}>Memuat bank soal ... </div>;
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2d3b3', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#2a6f8f' }}>Total: {questions.length} Soal</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchQuestions} style={{ padding: '8px 12px', backgroundColor: '#e2d3b3', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={handleAddNew} style={{ padding: '8px 12px', backgroundColor: '#2a6f3f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Tambah Soal
          </button>
        </div>
      </div>

      {editingId && (
        <div style={{ padding: '20px', backgroundColor: 'rgba(42,111,143,0.05)', borderRadius: '12px', marginBottom: '20px', border: '1px solid #2a6f8f' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#2a6f8f' }}>{isAdding ? 'Tambah Soal Baru' : 'Edit Soal'}</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 'bold' }}>Episode</label>
              <select value={formData.episode || 1} onChange={(e) => handleChange('episode', parseInt(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value={1}>Episode 1 (Konsep Asam Basa)</option>
                <option value={2}>Episode 2 (Kekuatan Asam Basa)</option>
                <option value={3}>Episode 3 (Perhitungan pH Kuat)</option>
                <option value={4}>Episode 4 (Perhitungan pH Lemah)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 'bold' }}>Tingkat Kesulitan</label>
              <select value={formData.level || 'Easy'} onChange={(e) => handleChange('level', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 'bold' }}>Pertanyaan (Stem)</label>
            <textarea value={formData.q || ''} onChange={(e) => handleChange('q', e.target.value)} rows="3" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }}></textarea>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>Pilihan Ganda (Opsi)</label>
            {(formData.options || []).map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', width: '20px' }}>{opt.label || String.fromCharCode(65 + idx)}</span>
                <input type="text" value={opt.text || ''} onChange={(e) => handleOptionChange(idx, 'text', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} placeholder="Teks opsi..." />
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="radio" name="correctOption" checked={opt.isCorrect || false} onChange={() => {
                    const newOpts = [...formData.options].map((o, i) => ({ ...o, isCorrect: i === idx }));
                    handleChange('options', newOpts);
                    handleChange('answer', opt.text);
                  }} />
                  Jawaban Benar
                </label>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 'bold' }}>Miskonsepsi Tag (Jika ada)</label>
              <input type="text" value={formData.misconception_tag || ''} onChange={(e) => handleChange('misconception_tag', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} placeholder="Contoh: M-ARR-01" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 'bold' }}>Topik / Konsep</label>
              <input type="text" value={formData.category || ''} onChange={(e) => handleChange('category', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 'bold' }}>Feedback Benar</label>
            <textarea value={formData.feedback_correct || ''} onChange={(e) => handleChange('feedback_correct', e.target.value)} rows="2" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}></textarea>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 'bold' }}>Hint / Pesan Salah</label>
            <textarea value={formData.hint_wrong || ''} onChange={(e) => handleChange('hint_wrong', e.target.value)} rows="2" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}></textarea>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={handleCancel} style={{ padding: '10px 16px', backgroundColor: '#e2d3b3', color: '#3b2a1a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <X size={16} /> Batal
            </button>
            <button onClick={handleSave} style={{ padding: '10px 16px', backgroundColor: '#2a6f8f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> Simpan Soal
            </button>
          </div>
        </div>
      )}

      {!editingId && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(59,42,26,0.05)', color: '#3b2a1a' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2d3b3' }}>Episode</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2d3b3' }}>Level</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2d3b3', width: '40%' }}>Pertanyaan</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2d3b3' }}>Kunci</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #e2d3b3', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Belum ada soal. Tambahkan atau Import!</td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #e2d3b3' }}>
                    <td style={{ padding: '12px' }}>Ep {q.episode}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: q.level === 'Hard' ? '#fecaca' : q.level === 'Medium' ? '#fef08a' : '#bbf7d0', color: '#333' }}>
                        {q.level}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9rem' }}>{q.q}</td>
                    <td style={{ padding: '12px', fontSize: '0.9rem', color: '#2a6f3f', fontWeight: 'bold' }}>{q.answer}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => handleEdit(q)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2a6f8f', marginRight: '8px' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
