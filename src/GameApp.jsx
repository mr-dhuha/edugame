import React, { useState, useEffect } from 'react';
import { fsm, STATES } from './core/FSMEngine';
import { eventBus, EVENTS } from './core/EventBus';
import { playerModel } from './core/PlayerModel';
import { audioEngine } from './core/AudioEngine';
import { supabase } from './core/SupabaseClient';
import './core'; // Initialize index.js to hook up analytics

// Import components
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import EpisodeIntroScreen from './components/EpisodeIntroScreen';
import QuestionScreen from './components/QuestionScreen';
import FeedbackScreen from './components/FeedbackScreen';
import GateScreen from './components/GateScreen';
import ReflectionScreen from './components/ReflectionScreen';
import EpisodeCompleteScreen from './components/EpisodeCompleteScreen';
import UniversalMenu from './components/UniversalMenu';
import CertificateGenerator from './components/CertificateGenerator';
import gameRules from './data/gameRules.json';

export default function GameApp() {
  const [fsmState, setFsmState] = useState(fsm.getState());
  const [context, setContext] = useState(fsm.getContext());
  const [playerState, setPlayerState] = useState(playerModel.exportState());
  const [blockedMessage, setBlockedMessage] = useState('');

  useEffect(() => {
    // 1. Try to load saved state from localStorage
    try {
      const savedPlayer = localStorage.getItem('chemquest_player');
      if (savedPlayer) {
        playerModel.deserialize(savedPlayer);
        setPlayerState(playerModel.exportState());
      }
      
      const savedFsm = localStorage.getItem('chemquest_fsm');
      if (savedFsm) {
        const { state, context } = JSON.parse(savedFsm);
        fsm.loadState(state, context);
        setFsmState(fsm.getState());
        setContext(fsm.getContext());
      }
    } catch (e) {
      console.error("Failed to load saved state", e);
    }

    // 2. Subscribe to FSM changes (MUST BE BEFORE ANY TRANSITIONS)
    const unsubFSM = eventBus.on(EVENTS.STATE_CHANGED, ({ state, context }) => {
      setFsmState(state);
      setContext(context);
      
      // Auto-save FSM state
      if (state !== STATES.INIT && state !== STATES.LOGIN) {
        localStorage.setItem('chemquest_fsm', JSON.stringify({ state, context }));
      }

      // Audio BGM Controller
      if (state === STATES.TEACHER_DASHBOARD || state === STATES.INIT) {
        audioEngine.stopBGM();
      } else {
        audioEngine.playBGM();
      }
    });

    // Initial transition to LOGIN if no save data
    if (fsm.getState() === STATES.INIT) {
      fsm.transition(STATES.LOGIN);
    }

    // 3. Subscribe to Player changes
    const updatePlayerState = () => {
      setPlayerState(playerModel.exportState());
      // Auto-save Player state
      if (fsm.getState() !== STATES.INIT && fsm.getState() !== STATES.LOGIN) {
        localStorage.setItem('chemquest_player', playerModel.serialize());
      }
    };
    
    const unsubMastery = eventBus.on(EVENTS.MASTERY_UPDATED, updatePlayerState);
    const unsubXP = eventBus.on(EVENTS.XP_AWARDED, updatePlayerState);
    const unsubBadge = eventBus.on(EVENTS.BADGE_UNLOCKED, updatePlayerState);
    const unsubDataLoad = eventBus.on(EVENTS.DATA_LOADED, updatePlayerState);
    const unsubEpComplete = eventBus.on(EVENTS.EPISODE_COMPLETED, updatePlayerState);

    // 4. Realtime subscription to enforce inactive block
    let statusSubscription = null;
    const profile = playerModel.getProfile();
    if (profile && profile.studentId && supabase) {
      // Check immediately on load
      supabase.from('cq_students').select('is_active').eq('nis', profile.studentId).single()
        .then(({ data }) => {
          if (data && data.is_active === false) {
             setBlockedMessage('Akun Anda telah dinonaktifkan oleh Guru.');
          }
        });

      // Subscribe to live updates
      statusSubscription = supabase.channel(`student-status-${profile.studentId}`)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'cq_students', 
            filter: `nis=eq.${profile.studentId}` 
        }, (payload) => {
           if (payload.new && payload.new.is_active === false) {
             setBlockedMessage('Akun Anda baru saja dinonaktifkan oleh Guru.');
           }
        })
        .subscribe();
    }

    return () => {
      unsubFSM();
      unsubMastery();
      unsubXP();
      unsubBadge();
      unsubDataLoad();
      unsubEpComplete();
      if (statusSubscription) supabase.removeChannel(statusSubscription);
    };
  }, []);

  const renderScreen = () => {
    // RENDER BLOCKED MODAL
    if (blockedMessage) {
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px' }}>
              <span style={{ color: '#ef4444', fontSize: '32px', fontWeight: 'bold' }}>!</span>
            </div>
            <h2 style={{ margin: '0 0 16px 0', color: '#1f2937', fontFamily: "'Cinzel Decorative', serif" }}>Akses Diblokir</h2>
            <p style={{ color: '#4b5563', marginBottom: '24px', lineHeight: '1.5' }}>{blockedMessage}</p>
            <button 
              onClick={() => {
                localStorage.removeItem('chemquest_player');
                localStorage.removeItem('chemquest_fsm');
                window.location.reload();
              }}
              style={{ width: '100%', padding: '12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      );
    }

    // RENDER CURRENT STATE
    switch (fsmState) {
      case STATES.LOGIN:
        return <LoginScreen />;
      case STATES.DASHBOARD:
        return <DashboardScreen playerState={playerState} />;
      case STATES.EPISODE_INTRO:
        return <EpisodeIntroScreen context={context} />;
      case STATES.QUESTION_START:
      case STATES.AWAIT_ANSWER:
      case STATES.AWAIT_CONFIDENCE:
        return <QuestionScreen context={context} fsmState={fsmState} />;
      case STATES.FEEDBACK:
      case STATES.REMEDIATION:
        return <FeedbackScreen context={context} fsmState={fsmState} />;
      case STATES.GATE_CHECK:
        return <GateScreen context={context} />;
      case STATES.EPISODE_REFLECTION:
        return <ReflectionScreen context={context} />;
      case STATES.EPISODE_COMPLETE:
        return <EpisodeCompleteScreen context={context} playerState={playerState} />;
      case STATES.CERTIFICATE:
        return <CertificateGenerator playerState={playerState} gameRules={gameRules} />;
      default:
        return <div>Unknown state: {fsmState}</div>;
    }
  };

  return (
    <>
      <UniversalMenu fsmState={fsmState} />
      {renderScreen()}
    </>
  );
}
