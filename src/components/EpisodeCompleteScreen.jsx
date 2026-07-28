import React, { useEffect, useState } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { eventBus, EVENTS } from '../core/EventBus';

export default function EpisodeCompleteScreen({ context, playerState }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Notify system that episode is completely done
    eventBus.emit(EVENTS.EPISODE_COMPLETED, { episodeId: context.currentEpisodeId });
    
    // Get stats to show
    const epStats = playerState.episodeStats[context.currentEpisodeId];
    if (epStats) {
      setStats(epStats);
    }
  }, [context.currentEpisodeId, playerState.episodeStats]);

  const handleReturn = () => {
    fsm.transition(STATES.DASHBOARD);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', minHeight: '100dvh', background: '#f4e4c1', padding: '24px 20px', fontFamily: "'EB Garamond', serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      <img src="/img/you_win.png" alt="Misi Selesai!" style={{ width: '100%', maxWidth: '300px', marginBottom: '20px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }} />
      
      <p style={{ fontSize: '1.2rem', color: '#3b2a1a', textAlign: 'center', marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.5)', padding: '10px 20px', borderRadius: '20px', border: '1px solid rgba(59,42,26,0.1)' }}>
        Kamu telah berhasil memulihkan data!
      </p>

      {stats && (
        <div style={{ backgroundImage: 'url(/img/panel_wood.png)', backgroundSize: '100% 100%', backgroundPosition: 'center', padding: '30px 24px', width: '100%', maxWidth: '400px', marginBottom: '32px', color: '#f4e4c1' }}>
          <h4 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.2rem', margin: '0 0 16px 0', textAlign: 'center', color: '#ffd700', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Statistik Misi</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '1.05rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>
              <span>Total Pertanyaan:</span> <strong>{stats.totalCount}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>
              <span>Jawaban Benar:</span> <strong>{stats.correctCount}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>
              <span>Akurasi:</span> <strong style={{ color: '#90ee90' }}>{Math.round((stats.correctCount / stats.totalCount) * 100)}%</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>
              <span>Waktu Total:</span> <strong>{Math.round(stats.totalTimeSec)} dtk</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Petunjuk Dipakai:</span> <strong style={{ color: '#ffb6c1' }}>{stats.hintsUsed}</strong>
            </li>
          </ul>
        </div>
      )}

      <button 
        onClick={handleReturn}
        style={{ padding: '16px 32px', backgroundColor: '#2a6f8f', color: '#f4e4c1', border: '2px solid rgba(59,42,26,0.2)', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}
      >
        Kembali ke Dashboard
      </button>
    </div>
  );
}
