import React, { useState, useEffect } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { getNextDifficulty } from '../core/AdaptiveEngine';
import { playerModel } from '../core/PlayerModel';
import { AIClient } from '../core/AIClient';
import { audioEngine } from '../core/AudioEngine';

// --- Komponen Typewriter Sederhana ---
const TypewriterText = ({ text, speed = 30 }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    
    let i = 0;
    const typingAudio = audioEngine.playSFX('typing');
    const chars = Array.from(text);
    const interval = setInterval(() => {
      i++;
      setDisplayed(chars.slice(0, i).join(''));
      if (i >= chars.length) {
        clearInterval(interval);
        if (typingAudio) typingAudio.pause();
      }
    }, speed);
    return () => {
      clearInterval(interval);
      if (typingAudio) typingAudio.pause();
    };
  }, [text, speed]);
  return <span>{displayed}</span>;
};

export default function GateScreen({ context }) {
  // In a real app, this result would be passed in payload or state.
  // For the shell, we'll grab it from the event bus history or recalculate.
  // Since we transition to GATE_CHECK with payload, we assume the wrapper passed it or we recalculate.
  // To keep it simple, we'll just read from FSM context if we stored it, or recalculate.
  
  const gateResult = context.gateResult || {};
  const action = gateResult.action || 'REMEDIATION';
  const isFailed = action === 'REMEDIATION';
  const isConditional = action === 'CONDITIONAL_PASS';
  
  const [aiMessage, setAiMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Akurasi simulasi karena tidak selalu dikalkulasi dari gateResult di shell ini
    const accuracy = gateResult.accuracy || (isFailed ? 33 : 100); 
    const mistakes = gateResult.mistakes || '';
    
    AIClient.evaluateGate(context.currentDifficulty, isFailed, accuracy, mistakes)
      .then(msg => setAiMessage(msg))
      .catch((e) => {
        console.error("AI Gate Error:", e);
        setAiMessage(isFailed 
          ? "Kamu butuh penguatan ulang pada konsep ini, tapi jangan menyerah!"
          : "Kerja bagus! Sistem mencatat penguasaanmu di level ini.");
      })
      .finally(() => setIsLoading(false));
  }, [context.currentDifficulty, isFailed, gateResult.accuracy]);

  const handleProceed = () => {
    if (action === 'REMEDIATION') {
      // Jika Remedial (Coba Soal Setara), kembalikan hitungan soal ke 0 tapi tetap di difficulty yang sama
      fsm.context.gateQuestionCount = 0;
      fsm.transition(STATES.QUESTION_START);
    } else if (context.currentDifficulty === 'Hard') {
      fsm.transition(STATES.EPISODE_REFLECTION);
    } else {
      const nextDiff = context.currentDifficulty === 'Easy' ? 'Medium' : 'Hard';
      fsm.context.currentDifficulty = nextDiff;
      fsm.context.gateQuestionCount = 0;
      fsm.transition(STATES.QUESTION_START);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', minHeight: '100dvh', background: '#f4e4c1', padding: '24px 20px', fontFamily: "'EB Garamond', serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '40px 32px', width: '100%', maxWidth: '500px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', boxShadow: '0 20px 40px rgba(42,111,143,0.15)', border: '2px solid rgba(42,111,143,0.1)' }}>
        
        <img src="/img/face4.png" alt="" style={{ width: '80px', marginBottom: '-10px', filter: 'drop-shadow(0 4px 8px rgba(42,111,143,0.2))' }} />

        <h2 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.6rem', color: '#2a6f8f', margin: 0 }}>
          {action === 'REMEDIATION' ? 'Penguatan Ulang' : action === 'CONDITIONAL_PASS' ? 'Lanjut Bersyarat' : 'Lanjut Langsung'}
        </h2>
        
        <div style={{ backgroundColor: 'rgba(42,111,143,0.1)', padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(42,111,143,0.2)' }}>
          <strong style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.2rem', color: '#2a6f8f', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Level {context.currentDifficulty}
          </strong>
        </div>

        {/* Adaptive UI Sections based on Table */}
        {action === 'REMEDIATION' && (
          <div style={{ width: '100%', textAlign: 'left', background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)', padding: '20px', borderRadius: '12px', border: '1px solid #ffcc80' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#e65100', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', textTransform: 'uppercase' }}>Kartu Konsep & Contoh Terselesaikan</h4>
            <div style={{ fontSize: '1rem', color: '#5d4037', lineHeight: '1.5' }}>
              {isLoading ? <span style={{ fontStyle: 'italic' }}>Menyusun kartu konsep...</span> : <TypewriterText text={aiMessage} speed={20} />}
            </div>
            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#e65100', fontWeight: 'bold' }}>
              * Selesaikan kartu konsep ini sebelum mencoba soal setara.
            </div>
          </div>
        )}

        {action === 'CONDITIONAL_PASS' && (
          <div style={{ width: '100%', textAlign: 'left', background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)', padding: '20px', borderRadius: '12px', border: '1px solid #90caf9' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1565c0', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', textTransform: 'uppercase' }}>Petunjuk Kontekstual</h4>
            <div style={{ fontSize: '1rem', color: '#0d47a1', lineHeight: '1.5' }}>
              {isLoading ? <span style={{ fontStyle: 'italic' }}>Menyiapkan petunjuk visual...</span> : <TypewriterText text={aiMessage} speed={20} />}
            </div>
          </div>
        )}

        {action === 'DIRECT_PASS' && (
          <div style={{ width: '100%', textAlign: 'center', background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', padding: '20px', borderRadius: '12px', border: '1px solid #a5d6a7' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#2e7d32', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', textTransform: 'uppercase' }}>Penguasaan Sempurna</h4>
            <div style={{ fontSize: '1rem', color: '#1b5e20', lineHeight: '1.5' }}>
              {isLoading ? <span style={{ fontStyle: 'italic' }}>Mengevaluasi...</span> : <TypewriterText text={aiMessage} speed={20} />}
            </div>
          </div>
        )}

        <button 
          onClick={handleProceed}
          style={{ width: '100%', padding: '14px 24px', backgroundColor: '#2a6f8f', color: '#f4e4c1', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'all 0.2s ease', marginTop: '10px' }}
        >
          {action === 'REMEDIATION' ? 'Coba Soal Setara' : context.currentDifficulty === 'Hard' ? "Lanjut ke Refleksi" : "Lanjut Level Berikutnya"}
        </button>
      </div>

    </div>
  );
}
