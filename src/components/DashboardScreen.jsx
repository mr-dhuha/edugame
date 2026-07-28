import React, { useState } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import episodesData from '../data/episodes.json';
import gameRules from '../data/gameRules.json';
import { isEpisodeUnlocked } from '../core/AdaptiveEngine';
import './DashboardScreen.css';

/*
  4 episode nodes placed on islands across an ocean map.
  Using a variety of assets from level_map
*/
const NODES = [
  { x: 50, y: 78, island: '/img/island 1.png', w: 160, deco: '/img/coconut1.png', decoW: '25%', decoX: '65%', decoY: '42%' },
  { x: 28, y: 58, island: '/img/island 2.png', w: 140, deco: '/img/house.png', decoW: '40%', decoX: '50%', decoY: '38%' },
  { x: 72, y: 38, island: '/img/island 3.png', w: 130, deco: '/img/stones 1.png', decoW: '45%', decoX: '55%', decoY: '38%' },
  { x: 50, y: 18, island: '/img/island 4.png', w: 150, deco: '/img/cave.png', decoW: '55%', decoX: '50%', decoY: '38%' },
];

const BRIDGES = [
  '/img/bridge 1.png',
  '/img/bridge 2.png',
  '/img/bridge 3.png'
];

const ROMAN = ['I', 'II', 'III', 'IV'];

export default function DashboardScreen({ playerState }) {
  const [selectedEp, setSelectedEp] = useState(null);

  const handleGo = (episodeId) => {
    setSelectedEp(null);
    fsm.transition(STATES.EPISODE_INTRO, { episodeId });
  };

  const isGraduated = playerState.completedEpisodes.size >= episodesData.length;
  const masteryPct = Math.max(0, Math.min(100, (playerState.mastery / gameRules.mastery.maxValue) * 100));

  return (
    <div className="map-screen">
      {/* Background requested by user */}
      <img src="/img/bg.png" alt="" className="map-bg" />

      {/* Floating clouds */}
      <img src="/img/cloud1.png" alt="" className="cloud c1" />
      <img src="/img/cloud2.png" alt="" className="cloud c2" />
      <img src="/img/cloud1.png" alt="" className="cloud c3" />
      <img src="/img/cloud2.png" alt="" className="cloud c4" />

      {/* Logo */}
      <div className="logo-wrap">
        <img src="/img/logo.png" alt="ChemQuest Pesisir Meranti" className="logo" />
      </div>

      {/* Compact Stats */}
      <div className="compact-stats">
        <div className="compact-stat-chip">
          <span className="stat-label">XP</span>
          <span className="stat-val">{playerState.xp}</span>
        </div>
        <div className="compact-stat-chip">
          <span className="stat-label">Mastery</span>
          <span className="stat-val">{Math.round(playerState.mastery)}%</span>
        </div>
      </div>

      {/* Island map area */}
      <div className="island-map">
        
        {/* Bridge connectors between nodes */}
        {[0, 1, 2].map(i => {
          const a = NODES[i], b = NODES[i + 1];
          const completed = playerState.completedEpisodes.has(episodesData[i].id);
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          const isUpward = i % 2 === 0;

          return (
            <div
              key={`bridge-${i}`}
              className={`bridge-path ${completed ? 'visible' : 'dimmed'}`}
              style={{
                position: 'absolute',
                left: `${a.x}%`,
                top: `${a.y}%`,
                width: `${dist}%`,
                height: '80px', // Beri ruang yang cukup untuk lengkungan
                transformOrigin: '0 50%',
                transform: `translateY(-50%) rotate(${Math.atan2((b.y - a.y), (b.x - a.x))}rad)`,
                zIndex: 1,
                pointerEvents: 'none',
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <path 
                  d={isUpward ? "M 0 50 C 25 -20, 75 120, 100 50" : "M 0 50 C 25 120, 75 -20, 100 50"}
                  fill="none"
                  stroke={completed ? "#ffc107" : "rgba(59,42,26,0.35)"} 
                  strokeWidth="10" 
                  strokeDasharray="16 20" 
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: completed ? 'drop-shadow(0px 3px 6px rgba(0,0,0,0.6))' : 'none' }}
                />
              </svg>
            </div>
          );
        })}

        {/* Island nodes */}
        {episodesData.map((ep, i) => {
          const node = NODES[i];
          const unlocked = isEpisodeUnlocked(ep.id, playerState.completedEpisodes, episodesData);
          const completed = playerState.completedEpisodes.has(ep.id);
          const status = completed ? 'completed' : unlocked ? 'unlocked' : 'locked';

          return (
            <div
              key={ep.id}
              className={`island-node ${status}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => (unlocked || completed) && setSelectedEp(ep)}
            >
              {/* Island artwork container */}
              <div style={{ position: 'relative', width: node.w, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src={node.island} alt="" className="island-img" style={{ width: '100%', display: 'block' }} />

                {/* Decorative element sitting on the island */}
                <img
                  src={node.deco}
                  alt=""
                  className="island-deco"
                  style={{ position: 'absolute', left: node.decoX, top: node.decoY, width: node.decoW, transform: 'translate(-50%, -100%)' }}
                />

                {/* Level dot / Lock - Moved to bottom of island so it doesn't overlap deco */}
                <div className="level-dot-wrap" style={{ position: 'absolute', bottom: '5%', left: '50%', transform: 'translate(-50%, 0)', top: 'auto' }}>
                  {status === 'locked' ? (
                    <img src="/img/lock.png" alt="Terkunci" className="lock-icon" />
                  ) : (
                    <>
                      <img src={completed ? '/img/dot_active.png' : '/img/dot_active.png'} alt="" className="dot-img" />
                      <span className="dot-num">{ROMAN[i]}</span>
                    </>
                  )}
                </div>

                {/* Stars for completed */}
                {completed && (
                  <img src="/img/star3.png" alt="Selesai" className="stars-img" style={{ position: 'absolute', bottom: '-15%', left: '50%', transform: 'translateX(-50%)' }} />
                )}
              </div>

                {/* Level Title Banner */}
                <div
                  className="level-title-banner"
                  style={{
                    position: 'absolute',
                    top: '-45px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#eaddc5',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '2px solid #d4c4a8',
                    color: '#3b2a1a',
                    fontFamily: "'Cinzel Decorative', serif",
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    textAlign: 'center',
                    whiteSpace: 'normal',
                    width: 'max-content',
                    maxWidth: '140px',
                    lineHeight: '1.2',
                    zIndex: 10,
                    pointerEvents: 'none'
                  }}
                >
                  {ep.title}
                </div>
            </div>
          );
        })}
      </div>



      {/* Bottom drawer (Now a Centered Modal) */}
      {selectedEp && (
        <div className="drawer-bg" onClick={() => setSelectedEp(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <img src="/img/header_level.png" alt="" className="drawer-header-img" />
            <h2 className="drawer-title">{selectedEp.subtitle}: {selectedEp.title}</h2>
            <p className="drawer-brief">{selectedEp.storyline}</p>
            <div className="drawer-tags">
              {selectedEp.concepts.map((c, ci) => (
                <span key={ci} className="drawer-tag">{c}</span>
              ))}
            </div>
            {playerState.completedEpisodes.has(selectedEp.id) ? (
              <button className="drawer-btn revisit" onClick={() => handleGo(selectedEp.id)}>
                Jelajahi Ulang
              </button>
            ) : (
              <button className="drawer-btn go" onClick={() => handleGo(selectedEp.id)}>
                <img src="/img/btn_circle_play.png" alt="" style={{ width: 24, marginRight: 8, verticalAlign: 'middle' }} />
                Berangkat
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
