import React, { useState, useEffect } from 'react';
import { fsm, STATES } from './core/FSMEngine';
import { eventBus, EVENTS } from './core/EventBus';
import { playerModel } from './core/PlayerModel';
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

    return () => {
      unsubFSM();
      unsubMastery();
      unsubXP();
      unsubBadge();
      unsubDataLoad();
      unsubEpComplete();
    };
  }, []);

  const renderScreen = () => {
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
