import React, { useState } from 'react';
import { Target, PlayCircle } from 'lucide-react';
import { fsm, STATES } from '../core/FSMEngine';
import { eventBus, EVENTS } from '../core/EventBus';
import episodesData from '../data/episodes.json';
import storyDialogs from '../data/storyDialogs.json';
import AnimatedDialog from './AnimatedDialog';

export default function EpisodeIntroScreen({ context }) {
  const [dialogComplete, setDialogComplete] = useState(false);
  const episode = episodesData.find(e => e.id === context.currentEpisodeId);
  const dialogs = storyDialogs.dialogs[context.currentEpisodeId]?.intro || [];

  const handleStart = () => {
    eventBus.emit(EVENTS.EPISODE_STARTED, { episodeId: episode.id });
    fsm.transition(STATES.QUESTION_START);
  };

  const handleDialogComplete = () => {
    setDialogComplete(true);
  };

  if (!episode) return <div style={{ width: '100%', minHeight: '100vh', background: '#f4e4c1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'EB Garamond', serif", color: '#3b2a1a' }}>Gagal memuat episode.</div>;

  return (
    <div style={{ width: '100%', minHeight: '100vh', minHeight: '100dvh', background: 'url(/map_bg.png) center center / cover no-repeat fixed', padding: '24px 20px', fontFamily: "'EB Garamond', serif", display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Overlay to ensure readability */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header */}
        <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.2rem', color: '#3b2a1a', marginBottom: '8px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {episode.subtitle}
        </h2>
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.8rem', color: '#2a6f8f', marginBottom: '24px', textAlign: 'center', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
          {episode.title}
        </h1>
        
        {/* Misi Card */}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', padding: '20px', border: '1.5px solid rgba(59,42,26,0.15)', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '35vh', overflowY: 'auto' }}>
          <strong style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#2a6f8f', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(42,111,143,0.2)', paddingBottom: '8px' }}>
            <Target size={18} />
            Misi Utama
          </strong>
          <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#3b2a1a', margin: 0, textAlign: 'justify' }}>{episode.storyline}</p>
        </div>

        {/* Animated Dialog Section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginBottom: '24px' }}>
          {!dialogComplete ? (
            <AnimatedDialog dialogs={dialogs} onComplete={handleDialogComplete} />
          ) : (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <button 
                onClick={handleStart}
                style={{ width: '100%', padding: '16px', backgroundColor: '#2a6f8f', color: '#f4e4c1', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', fontWeight: '700', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(42,111,143,0.3)', transition: 'all 0.2s ease' }}
              >
                <PlayCircle size={24} />
                Mulai Evaluasi Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
