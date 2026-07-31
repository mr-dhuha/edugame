import React, { useEffect, useState } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { eventBus, EVENTS } from '../core/EventBus';
import { playerModel } from '../core/PlayerModel';
import episodesData from '../data/episodes.json';
import { Sparkles, Trophy, ArrowRight } from 'lucide-react';

export default function EpisodeCompleteScreen({ context, playerState }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Notify system that episode is completely done
    const epStats = playerState.episodeStats[context.currentEpisodeId];
    if (epStats) {
      setStats(epStats);
    }
    eventBus.emit(EVENTS.EPISODE_COMPLETED, { episodeId: context.currentEpisodeId });
  }, [context.currentEpisodeId, playerState.episodeStats]);

  const handleReturn = () => {
    fsm.transition(STATES.DASHBOARD);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', minHeight: '100dvh', background: '#f4e4c1', padding: '24px 20px', fontFamily: "'EB Garamond', serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      <div style={{ backgroundColor: '#2a6f8f', padding: '20px 40px', borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.2)', marginBottom: '32px', border: '3px solid #f4e4c1', transform: 'rotate(-2deg)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-15px', left: '-15px' }}><Sparkles size={32} color="#ffd700" fill="#ffd700" /></div>
        <div style={{ position: 'absolute', bottom: '-15px', right: '-15px' }}><Trophy size={32} color="#ffd700" fill="#ffd700" /></div>
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif", color: '#ffd700', fontSize: '2.2rem', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.4)', textAlign: 'center', letterSpacing: '2px' }}>
          EPISODE SELESAI!
        </h1>
      </div>
      
      <p style={{ fontSize: '1.2rem', color: '#3b2a1a', textAlign: 'center', marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.5)', padding: '10px 20px', borderRadius: '20px', border: '1px solid rgba(59,42,26,0.1)' }}>
        Kamu telah berhasil menyelesaikan semua misi dan memulihkan data!
      </p>

      {stats && (
        <div style={{ backgroundImage: 'url(/img/panel_wood.png)', backgroundSize: '100% 100%', backgroundPosition: 'center', padding: '30px 24px', width: '100%', maxWidth: '400px', marginBottom: '32px', color: '#3b2a1a' }}>
          <h4 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.2rem', margin: '0 0 16px 0', textAlign: 'center', color: '#8b4513', textShadow: '1px 1px 1px rgba(255,255,255,0.7)' }}>Statistik Misi</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '1.05rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(59,42,26,0.2)', paddingBottom: '4px' }}>
              <span>Total Pertanyaan:</span> <strong>{stats.totalCount}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(59,42,26,0.2)', paddingBottom: '4px' }}>
              <span>Jawaban Benar:</span> <strong>{stats.correctCount}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(59,42,26,0.2)', paddingBottom: '4px' }}>
              <span>Akurasi:</span> <strong style={{ color: '#2e7d32' }}>{Math.round((stats.correctCount / stats.totalCount) * 100)}%</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(59,42,26,0.2)', paddingBottom: '4px' }}>
              <span>Waktu Total:</span> <strong>{Math.round(stats.totalTimeSec)} dtk</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Petunjuk Dipakai:</span> <strong style={{ color: '#c62828' }}>{stats.hintsUsed}</strong>
            </li>
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          onClick={handleReturn}
          style={{ padding: '16px 32px', backgroundColor: '#f4e4c1', color: '#2a6f8f', border: '2px solid #2a6f8f', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
        >
          Kembali ke Dashboard
        </button>
        
        {context.currentEpisodeId < episodesData.length && (
          <button 
            onClick={() => fsm.transition(STATES.EPISODE_INTRO, { episodeId: context.currentEpisodeId + 1 })}
            style={{ padding: '16px 32px', backgroundColor: '#2a6f8f', color: '#f4e4c1', border: '2px solid rgba(59,42,26,0.2)', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}
          >
            Lanjut ke Episode {context.currentEpisodeId + 1} <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
