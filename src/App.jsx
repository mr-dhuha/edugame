import React from 'react';
import { GameProvider, useGame, STATES } from './core/GameEngine';
import { PlayerProvider } from './core/PlayerModel';
import './styles/main.css';

// Import Screens (to be implemented)
import BootScreen from './components/BootScreen';
import LoginScreen from './components/LoginScreen';
import MainMenu from './components/MainMenu';
import EpisodeSelect from './components/EpisodeSelect';
import MissionIntro from './components/MissionIntro';
import QuestionScreen from './components/QuestionScreen';
import ConfidenceCheck from './components/ConfidenceCheck';
import FeedbackScreen from './components/FeedbackScreen';
import RemediationScreen from './components/RemediationScreen';

function GameRouter() {
  const { state } = useGame();
  
  const renderScreen = () => {
    switch (state.currentState) {
      case STATES.BOOT: return <BootScreen />;
      case STATES.LOGIN: return <LoginScreen />;
      case STATES.MAIN_MENU: return <MainMenu />;
      case STATES.EPISODE_SELECT: return <EpisodeSelect />;
      case STATES.MISSION_INTRO: return <MissionIntro />;
      case STATES.QUESTION: return <QuestionScreen />;
      case STATES.CONFIDENCE_CHECK: return <ConfidenceCheck />;
      case STATES.FEEDBACK: return <FeedbackScreen />;
      case STATES.ADAPTIVE_DECISION: return <RemediationScreen />;
      // Add more as needed
      default: return <div className="screen-centered"><h2>Unknown State: {state.currentState}</h2></div>;
    }
  };

  return (
    <div className="app-container">
      {renderScreen()}
    </div>
  );
}

function App() {
  return (
    <PlayerProvider>
      <GameProvider>
        <GameRouter />
      </GameProvider>
    </PlayerProvider>
  );
}

export default App;
