import React, { useState, useEffect } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { evaluateGate, getNextDifficulty } from '../core/AdaptiveEngine';
import misconceptionsData from '../data/misconceptions.json';
import { eventBus, EVENTS } from '../core/EventBus';
import { playerModel } from '../core/PlayerModel';
import Explainer3D from './3d/Explainer3D';
import { Star, Lightbulb, AlertTriangle } from 'lucide-react';

import { AIClient } from '../core/AIClient';

// --- Komponen Typewriter Sederhana ---
const TypewriterText = ({ text, speed = 30 }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    
    let i = 0;
    const chars = Array.from(text);
    const interval = setInterval(() => {
      i++;
      setDisplayed(chars.slice(0, i).join(''));
      if (i >= chars.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return <span>{displayed}</span>;
};

export default function FeedbackScreen({ context }) {
  const adaptiveAction = context.pendingAdaptiveAction;
  const isCorrect = adaptiveAction.isCorrect;
  const [aiHint, setAiHint] = useState('');
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [loadingText, setLoadingText] = useState('Tutor sedang membaca jawabanmu...');

  // Efek Rotasi Teks Loading
  useEffect(() => {
    if (!isLoadingHint) return;
    const messages = [
      'Tutor sedang membaca jawabanmu...',
      'Menganalisis konsep...',
      'Menyusun petunjuk pintar...',
      'Sedikit lagi...'
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingText(messages[i]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isLoadingHint]);

  useEffect(() => {
    if (!isCorrect && !adaptiveAction.isTimeout && adaptiveAction.wrongAnswer) {
      setIsLoadingHint(true);
      AIClient.generateAdaptiveHint(adaptiveAction.questionText, adaptiveAction.wrongAnswer)
        .then(hint => setAiHint(hint))
        .catch(e => console.error("AI Hint Error:", e))
        .finally(() => setIsLoadingHint(false));
    }
  }, [isCorrect, adaptiveAction]);

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

        <div style={{ fontFamily: "'Cambria Math', 'Times New Roman', serif", fontWeight: '500', fontSize: '1.15rem', lineHeight: '1.8', color: '#3b2a1a', flex: 1, letterSpacing: '0.3px' }}>
          
          {(!isCorrect && isLoadingHint) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontStyle: 'italic', color: '#6b5a4a', padding: '16px', background: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
              <img src="/img/robot1.png" alt="" style={{ width: '28px', animation: 'pulse 1.5s infinite' }} /> {loadingText}
            </div>
          ) : (!isCorrect && aiHint) ? (
            <div style={{ padding: '16px', background: 'rgba(42,111,143,0.05)', borderRadius: '12px', borderLeft: '4px solid #2a6f8f' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.95rem', color: '#2a6f8f', fontWeight: 'bold' }}>
                <img src="/img/robot1.png" alt="" style={{ width: '28px' }} /> Tutor Pendamping
              </div>
              <TypewriterText text={aiHint} speed={15} />
            </div>
          ) : (
            adaptiveAction.feedback
          )}

          <img 
            src={`/img/hints/${adaptiveAction.questionId}.jpg`} 
            onError={(e) => e.target.style.display = 'none'} 
            alt="Ilustrasi Pendukung" 
            style={{ width: '100%', borderRadius: '12px', marginTop: '16px', objectFit: 'contain' }}
          />
        </div>




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
