import React from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { getNextDifficulty } from '../core/AdaptiveEngine';

export default function GateScreen({ context }) {
  // In a real app, this result would be passed in payload or state.
  // For the shell, we'll grab it from the event bus history or recalculate.
  // Since we transition to GATE_CHECK with payload, we assume the wrapper passed it or we recalculate.
  // To keep it simple, we'll just read from FSM context if we stored it, or recalculate.
  
  // Let's assume fsm context doesn't have the full payload easily accessible here without a context provider.
  // So we'll use a hack for the minimal shell: read from window or rely on parent.
  // Actually, let's just make the parent pass the fsm state payload? No, we didn't save it.
  // I will just mock the UI for the gate for now.
  
  const handleProceed = () => {
    // Mock logic: assume we passed and go to next difficulty or reflection
    if (context.currentDifficulty === 'Hard') {
      fsm.transition(STATES.EPISODE_REFLECTION);
    } else {
      const nextDiff = context.currentDifficulty === 'Easy' ? 'Medium' : 'Hard';
      // Hacky state update for context in minimal shell
      fsm.context.currentDifficulty = nextDiff;
      fsm.context.gateQuestionCount = 0;
      fsm.transition(STATES.QUESTION_START);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', minHeight: '100dvh', background: '#f4e4c1', padding: '24px 20px', fontFamily: "'EB Garamond', serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      <div style={{ backgroundImage: 'url(/img/panel_wood.png)', backgroundSize: '100% 100%', backgroundPosition: 'center', padding: '40px 30px', width: '100%', maxWidth: '400px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
        
        <img src="/img/face4.png" alt="" style={{ width: '80px', marginBottom: '-10px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />

        <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.4rem', color: '#ffd700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', margin: 0 }}>
          Evaluasi Level
        </h2>
        
        <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <strong style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.2rem', color: '#ffd700', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {context.currentDifficulty}
          </strong>
        </div>
        
        <p style={{ fontSize: '1.1rem', color: '#f4e4c1', lineHeight: '1.5', marginBottom: '10px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          Sistem sedang mengevaluasi penguasaanmu di level ini...
        </p>

        <button 
          onClick={handleProceed}
          style={{ width: '100%', padding: '14px 24px', backgroundColor: '#2a6f8f', color: '#f4e4c1', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'all 0.2s ease' }}
        >
          Lanjutkan Misi
        </button>
      </div>

    </div>
  );
}
