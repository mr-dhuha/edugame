import React, { useState, useEffect } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { evaluateGate, getNextDifficulty } from '../core/AdaptiveEngine';
import misconceptionsData from '../data/misconceptions.json';
import { eventBus, EVENTS } from '../core/EventBus';
import { playerModel } from '../core/PlayerModel';
import Explainer3D from './3d/Explainer3D';
import { Star, Lightbulb, AlertTriangle } from 'lucide-react';

export default function FeedbackScreen({ context }) {
  const adaptiveAction = context.pendingAdaptiveAction;
  const isCorrect = adaptiveAction.isCorrect;

  const handleContinue = () => {
    // Check if we hit the gate (3 questions)
    if (context.gateQuestionCount >= 3) {

      // We need to fetch the last 3 results for this episode from the player model
      // In a real app we'd fetch these cleanly. Here we just grab the last 3 from history.
      const epStats = playerModel.state.episodeStats[context.currentEpisodeId];
      const recentResults = epStats ? epStats.results.slice(-3) : [];

      const gateResult = evaluateGate(recentResults);
      fsm.transition(STATES.GATE_CHECK, { gateResult });

    } else {
      // Go to next question
      fsm.transition(STATES.QUESTION_START);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', minHeight: '100dvh', background: '#f4e4c1', padding: '24px 20px', fontFamily: "'EB Garamond', serif", display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <img src={isCorrect ? "/img/face8.png" : "/img/face3.png"} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.4rem', color: isCorrect ? '#2a6f3f' : '#a34040', margin: 0 }}>
          {isCorrect ? 'Tepat Sekali!' : 'Belum Tepat'}
        </h2>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1.5px solid rgba(59,42,26,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(59,42,26,0.1)' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isCorrect ? <Star size={28} color="#2a6f3f" fill="#2a6f3f" /> : <Lightbulb size={28} color="#2a6f8f" fill="rgba(42,111,143,0.2)" />}
          </span>
          <strong style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px', color: isCorrect ? '#2a6f3f' : '#2a6f8f' }}>
            {isCorrect ? 'Poin Penting' : 'Petunjuk Konsep'}
          </strong>
        </div>

        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: '500', fontSize: '1.05rem', lineHeight: '1.6', color: '#3b2a1a', flex: 1 }}>
          {adaptiveAction.feedback}
          <img 
            src={`/img/hints/${adaptiveAction.questionId}.jpg`} 
            onError={(e) => e.target.style.display = 'none'} 
            alt="Ilustrasi Pendukung" 
            style={{ width: '100%', borderRadius: '12px', marginTop: '16px', objectFit: 'contain' }}
          />
        </div>

        {adaptiveAction.showMisconception && adaptiveAction.misconceptionTag && (
          <div style={{ padding: '16px', borderLeft: '4px solid #c9a84c', background: 'rgba(201,168,76,0.15)', borderRadius: '0 12px 12px 0', marginTop: '24px', borderTop: '1px solid rgba(201,168,76,0.3)', borderRight: '1px solid rgba(201,168,76,0.3)', borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
            <strong style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#8a6d25', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} color="#8a6d25" /> Mari Luruskan Pemahaman
            </strong>
            <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: '500', color: '#3b2a1a', marginTop: '8px', lineHeight: '1.5', fontSize: '0.95rem' }}>{misconceptionsData[adaptiveAction.misconceptionTag]?.description}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleContinue}
        style={{ width: '100%', padding: '16px', backgroundColor: '#2a6f8f', color: '#f4e4c1', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', fontWeight: '700', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        Lanjut
      </button>
    </div>
  );
}
