import React, { useState } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { eventBus, EVENTS } from '../core/EventBus';
import { AIClient } from '../core/AIClient';
import { scoreReflection } from '../core/AdaptiveEngine';
import episodesData from '../data/episodes.json';
import reflectionsData from '../data/reflections.json';

export default function ReflectionScreen({ context }) {
  const [response, setResponse] = useState('');
  const [result, setResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatTurns, setChatTurns] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const reflection = reflectionsData.find(r => r.episode === context.currentEpisodeId);
  const episodeData = episodesData.find(e => e.id === context.currentEpisodeId);

  const handleSubmit = async () => {
    if (!response.trim()) return;

    setIsEvaluating(true);
    try {
      const difficultyContext = context.currentDifficulty ? `Tingkat Kesulitan Terakhir: ${context.currentDifficulty}` : '';
      const evalResult = await AIClient.gradeReflection(response, difficultyContext);

      const localEval = scoreReflection(response, reflection?.keyPoints || []);
      evalResult.matchedKeywords = localEval.matchedKeywords;

      setResult(evalResult);
      setChatHistory([
        { role: 'user', content: response },
        { role: 'assistant', content: evalResult.feedback }
      ]);

      eventBus.emit(EVENTS.REFLECTION_SUBMITTED, {
        episodeId: context.currentEpisodeId,
        responseText: response,
        score: evalResult.score,
        matchedKeywords: evalResult.matchedKeywords || []
      });
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi AI. Coba lagi.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || chatTurns >= 3) return;

    const newHistory = [...chatHistory, { role: 'user', content: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    setIsChatting(true);

    try {
      const isFinalTurn = chatTurns === 2;
      const aiReply = await AIClient.chatReflection(newHistory, isFinalTurn);
      setChatHistory([...newHistory, { role: 'assistant', content: aiReply }]);
      setChatTurns(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi AI.');
    } finally {
      setIsChatting(false);
    }
  };

  const handleFinish = () => {
    fsm.transition(STATES.EPISODE_COMPLETE);
  };

  if (!reflection) return <div style={{ width: '100%', minHeight: '100vh', background: '#f4e4c1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'EB Garamond', serif", color: '#3b2a1a' }}>Data refleksi tidak ditemukan.</div>;

  return (
    <div style={{ width: '100%', minHeight: '100vh', minHeight: '100dvh', background: '#f4e4c1', padding: '24px 20px', fontFamily: "'EB Garamond', serif", display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', justifyContent: 'center' }}>
        <img src="/img/face5.png" alt="" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
        <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.4rem', color: '#2a6f8f', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
          Jurnal murid
        </h2>
      </div>

      <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '20px', border: '1.5px solid rgba(59,42,26,0.15)', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
        <strong style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#2a6f8f', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>
          Topik: {reflection.title}
        </strong>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#3b2a1a', margin: 0 }}>
          {reflection.prompt}
        </p>
      </div>

      {!result ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' }}>
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            rows={6}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px',
              border: '1.5px solid rgba(59,42,26,0.2)', backgroundColor: '#fff',
              fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: '#3b2a1a',
              resize: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
            }}
            placeholder="Tuliskan catatan refleksimu di sini..."
          />
          <button
            onClick={handleSubmit}
            disabled={isEvaluating}
            style={{
              width: '100%', padding: '16px',
              backgroundColor: isEvaluating ? '#8c7a6b' : '#2a6f8f',
              color: '#f4e4c1', border: 'none', borderRadius: '12px', cursor: isEvaluating ? 'not-allowed' : 'pointer',
              fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: 'auto', transition: 'all 0.2s ease', letterSpacing: '1px'
            }}
          >
            {isEvaluating ? 'Menganalisis...' : 'Kirim Refleksi'}
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', padding: '24px', border: '2px dashed rgba(42,111,143,0.4)', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h4 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', color: '#2a6f8f', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/img/robot1.png" alt="" style={{ width: '32px' }} />
              Sesi Private Tutor
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(59,42,26,0.1)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f4e4c1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', border: '3px solid #2a6f8f', color: '#2a6f8f', fontWeight: 'bold' }}>
                {result.score}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', color: '#6b5a4a', lineHeight: '1.4' }}>
                <strong style={{ color: '#3b2a1a' }}>Skor Kedalaman</strong><br />
                Skala (1-3)
              </div>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {chatHistory.slice(1).map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? '#e2f0d9' : 'rgba(255,255,255,0.8)', border: msg.role === 'user' ? 'none' : '1px solid #ccc', padding: '10px 14px', borderRadius: '12px', maxWidth: '85%', fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', color: '#3b2a1a', lineHeight: '1.5' }}>
                  {msg.content}
                </div>
              ))}
              {isChatting && (
                <div style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.8)', border: '1px solid #ccc', padding: '10px 14px', borderRadius: '12px', fontStyle: 'italic', fontSize: '0.9rem', color: '#888' }}>
                  Mengetik...
                </div>
              )}
            </div>

            {chatTurns < 3 ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={`Sisa kesempatan bertanya: ${3 - chatTurns}/3...`}
                  disabled={isChatting}
                  onKeyDown={e => e.key === 'Enter' && handleChatSubmit()}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: "'Inter', sans-serif" }}
                />
                <button onClick={handleChatSubmit} disabled={isChatting || !chatInput.trim()} style={{ padding: '12px 20px', borderRadius: '8px', backgroundColor: '#2a6f8f', color: '#fff', border: 'none', cursor: (isChatting || !chatInput.trim()) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Kirim</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '20px' }}>
                Sesi diskusi telah berakhir.
              </div>
            )}

            {result.matchedKeywords && result.matchedKeywords.length > 0 && (
              <div style={{ backgroundColor: 'rgba(42,111,143,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(42,111,143,0.1)' }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#2a6f8f', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Konsep Ditemukan:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.matchedKeywords.map((k, i) => (
                    <span key={i} style={{ backgroundColor: '#2a6f8f', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" }}>{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleFinish}
            disabled={isChatting}
            style={{
              width: '100%', padding: '16px',
              backgroundColor: chatTurns < 3 ? '#b0a69b' : '#2a6f8f',
              color: '#fff',
              border: 'none', borderRadius: '12px', cursor: isChatting ? 'not-allowed' : 'pointer',
              fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: 'auto', letterSpacing: '1px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          >
            {isChatting ? 'Menunggu Tutor...' : (chatTurns < 3 ? 'Akhiri Diskusi & Lanjut ke Peta' : 'Selesai & Lanjut ke Peta')}
          </button>
        </div>
      )}
    </div>
  );
}
