import React, { useState, useEffect } from 'react';
import storyDialogs from '../data/storyDialogs.json';
import './AnimatedDialog.css';

export default function AnimatedDialog({ dialogs, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');

  const currentDialog = dialogs[currentIndex];
  const char = currentDialog ? storyDialogs.characters[currentDialog.speaker] : null;
  const avatarSrc = currentDialog ? (currentDialog.speaker === 'meranti' ? '/img/scientist2.png' : '/img/robot2.png') : '';

  useEffect(() => {
    if (!currentDialog) return;
    
    setDisplayedText('');
    let i = 0;
    const text = currentDialog.text;
    
    // Typewriter effect
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, [currentIndex, currentDialog]);

  const handleNext = () => {
    if (displayedText.length < currentDialog.text.length) {
      // If clicking while typing, finish immediately
      setDisplayedText(currentDialog.text);
    } else {
      if (currentIndex < dialogs.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onComplete();
      }
    }
  };

  const handleSkip = (e) => {
    e.stopPropagation();
    onComplete();
  };

  if (!currentDialog) return null;

  return (
    <div className="anim-dialog-container" onClick={handleNext}>
      <div className="anim-avatar-container">
        <img src={avatarSrc} alt={char.name} className={`anim-avatar ${currentDialog.speaker}`} />
      </div>
      
      <div className="anim-dialog-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <h4 className="anim-speaker-name" style={{ margin: 0 }}>{char.name}</h4>
          <button 
            onClick={handleSkip}
            style={{ background: 'rgba(59,42,26,0.1)', border: 'none', padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem', color: '#3b2a1a', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: 'bold' }}
          >
            Lewati
          </button>
        </div>
        
        <p className="anim-text">{displayedText}</p>
        
        {displayedText.length === currentDialog.text.length && (
          <div className="anim-next-indicator">
            <span className="anim-blink">▼</span> Lanjut
          </div>
        )}
      </div>
    </div>
  );
}
