import React, { useState, useEffect, useRef } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import { eventBus, EVENTS } from '../core/EventBus';
import questionsData from '../data/questions.json';
import { shuffleOptions, evaluateQuestionOutcome } from '../core/AdaptiveEngine';
import Explainer3D from './3d/Explainer3D';

export default function QuestionScreen({ context, fsmState }) {
  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  
  const startTimeRef = useRef(Date.now());
  const hintsUsedRef = useRef(0);

  useEffect(() => {
    // Find the next question for this episode and difficulty
    // In a real implementation, we'd track which questions have been answered.
    // For this minimal shell, we just pick a random one that matches criteria.
    const available = questionsData.filter(q => 
      q.episode === context.currentEpisodeId && 
      q.level === context.currentDifficulty
    );
    
    // Simplistic random pick for demonstration
    const q = available[Math.floor(Math.random() * available.length)];
    
    if (q) {
      setQuestion(q);
      setOptions(q.randomizeOptions ? shuffleOptions(q.options) : q.options);
      setTimeLeft(q.timeSec || 60);
      startTimeRef.current = Date.now();
      hintsUsedRef.current = 0;
      eventBus.emit(EVENTS.QUESTION_STARTED, { questionId: q.id });
    }
  }, [context.currentEpisodeId, context.currentDifficulty]);

  useEffect(() => {
    if (timeLeft > 0 && fsmState === STATES.QUESTION_START) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, fsmState]);

  const handleTimeout = () => {
    // If timeout, auto-submit as wrong with low confidence
    handleConfidenceSubmit('rendah', true);
  };

  const handleAnswerSubmit = () => {
    if (!selectedOption) return;
    fsm.transition(STATES.AWAIT_CONFIDENCE);
  };

  const handleConfidenceSubmit = (confLevel, isTimeout = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setConfidence(confLevel);
    
    const responseTimeMs = Date.now() - startTimeRef.current;
    const isCorrect = isTimeout ? false : (selectedOption ? selectedOption.isCorrect : false);
    
    // 1. Evaluate adaptive logic (4-quadrant)
    const adaptiveOutcome = evaluateQuestionOutcome({
      isCorrect,
      confidence: confLevel,
      misconceptionTag: question.misconceptionTag,
      feedbackCorrect: question.feedbackCorrect,
      hintWrong: isTimeout ? "Waktu Habis! Harap lebih cepat dan teliti di pertanyaan berikutnya." : question.hintWrong
    });

    // 2. Fire events
    if (adaptiveOutcome.showMisconception) {
      eventBus.emit(EVENTS.MISCONCEPTION_DETECTED, {
        questionId: question.id,
        misconceptionTag: question.misconceptionTag,
        episode: question.episode
      });
    }

    eventBus.emit(EVENTS.QUESTION_ANSWERED, {
      questionId: question.id,
      episode: question.episode,
      level: question.level,
      isCorrect,
      confidence: confLevel,
      responseTimeMs,
      timeLimitSec: question.timeSec,
      hintLevel: hintsUsedRef.current,
      hasMisconception: adaptiveOutcome.showMisconception,
      concept: question.concept,
      selectedOption: selectedOption ? selectedOption.label : 'TIMEOUT',
      points: question.points // Pass the points for XPEngine
    });

    // 3. Transition to feedback
    fsm.transition(STATES.FEEDBACK, { adaptiveAction: { ...adaptiveOutcome, questionId: question.id, isTimeout } });
  };

  if (!question) return <div style={{ width: '100%', minHeight: '100vh', background: '#f4e4c1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'EB Garamond', serif", color: '#3b2a1a' }}>Mencari data pertanyaan...</div>;

  return (
    <div style={{ width: '100%', minHeight: '100vh', minHeight: '100dvh', background: '#f4e4c1', padding: '24px 20px', fontFamily: "'EB Garamond', serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingRight: '10px', fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#6b5a4a', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(59,42,26,0.1)', paddingBottom: '12px' }}>
        <span>Level: <b style={{ color: '#2a6f8f', fontWeight: '700' }}>{question.level}</b></span>
        
        {fsmState === STATES.QUESTION_START && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', 
            background: timeLeft <= 10 ? 'rgba(220,53,69,0.1)' : 'rgba(42,111,143,0.1)', 
            padding: '4px 12px', borderRadius: '12px',
            color: timeLeft <= 10 ? '#dc3545' : '#2a6f8f',
            fontWeight: 'bold', fontSize: '1rem',
            animation: timeLeft <= 10 ? 'pulse 1s infinite' : 'none'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {timeLeft}s
          </div>
        )}

        <span>Pertanyaan <b style={{ color: '#2a6f8f', fontWeight: '700' }}>{context.gateQuestionCount + 1}/3</b></span>
      </div>

      <h3 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.2rem', color: '#2a6f8f', marginBottom: '16px', lineHeight: '1.4' }}>{question.missionTitle}</h3>
      <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#3b2a1a', marginBottom: '32px' }}>{question.stem}</p>

      {fsmState === STATES.QUESTION_START && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {options.map((opt, i) => (
              <div 
                key={i}
                onClick={() => setSelectedOption(opt)}
                style={{
                  padding: '16px',
                  border: selectedOption === opt ? '2px solid #2a6f8f' : '1.5px solid rgba(59,42,26,0.15)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: selectedOption === opt ? 'rgba(42,111,143,0.08)' : 'rgba(255,255,255,0.6)',
                  fontSize: '1rem',
                  color: '#3b2a1a',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedOption === opt ? '0 4px 12px rgba(42,111,143,0.15)' : '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <strong style={{ fontFamily: "'Inter', sans-serif", marginRight: '8px', color: selectedOption === opt ? '#2a6f8f' : '#6b5a4a' }}>{opt.label}.</strong> {opt.text}
              </div>
            ))}
          </div>
          
          {selectedOption ? (
            <div style={{ marginTop: 'auto', padding: '20px', backgroundColor: 'rgba(255,255,255,0.8)', border: '2px dashed rgba(42,111,143,0.4)', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', animation: 'fadeIn 0.3s ease' }}>
              <h4 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', color: '#2a6f8f', marginBottom: '8px', textAlign: 'center' }}>Tingkat Keyakinan</h4>
              <p style={{ color: '#6b5a4a', fontSize: '0.9rem', marginBottom: '16px', fontFamily: "'Inter', sans-serif", textAlign: 'center', lineHeight: '1.4' }}>Seberapa yakin kamu dengan jawaban <strong style={{ color: '#3b2a1a', fontSize: '1.1rem', margin: '0 4px' }}>{selectedOption.label}</strong>?</p>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  onClick={() => handleConfidenceSubmit('rendah')} 
                  style={{ flex: 1, padding: '12px 4px', border: '2px solid #dc3545', borderRadius: '12px', background: 'rgba(255,255,255,0.9)', color: '#dc3545', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#dc3545'; e.target.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.9)'; e.target.style.color = '#dc3545'; }}
                >
                  Rendah
                </button>
                <button 
                  onClick={() => handleConfidenceSubmit('sedang')} 
                  style={{ flex: 1, padding: '12px 4px', border: '2px solid #ffc107', borderRadius: '12px', background: 'rgba(255,255,255,0.9)', color: '#b38600', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#ffc107'; e.target.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.9)'; e.target.style.color = '#b38600'; }}
                >
                  Sedang
                </button>
                <button 
                  onClick={() => handleConfidenceSubmit('tinggi')} 
                  style={{ flex: 1, padding: '12px 4px', border: '2px solid #28a745', borderRadius: '12px', background: 'rgba(255,255,255,0.9)', color: '#28a745', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.target.style.background = '#28a745'; e.target.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.9)'; e.target.style.color = '#28a745'; }}
                >
                  Tinggi
                </button>
              </div>
            </div>
          ) : (
            <button 
              disabled={true}
              style={{ width: '100%', padding: '16px', marginTop: 'auto', backgroundColor: 'rgba(59,42,26,0.1)', color: '#8c7a6b', border: 'none', borderRadius: '12px', fontSize: '1rem', fontFamily: "'Cinzel Decorative', serif", fontWeight: '700', letterSpacing: '1px', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Pilih Opsi Terlebih Dahulu
            </button>
          )}
        </div>
      )}
    </div>
  );
}

