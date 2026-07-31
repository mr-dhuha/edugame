import React, { useState } from 'react';
import { fsm, STATES } from '../core/FSMEngine';
import episodesData from '../data/episodes.json';
import gameRules from '../data/gameRules.json';
import { isEpisodeUnlocked } from '../core/AdaptiveEngine';
import SeaBackground from './3d/SeaBackground';
import './DashboardScreen.css';

/*
  Titik koordinat relatif (persentase) terhadap gambar peta (progressive map)
  Disesuaikan dengan posisi pulau dari bawah ke atas pada episodeX.png
*/
const NODES = [
  { x: 50, y: 77 }, // Episode 1 (Jejak Teori)
  { x: 50, y: 58 }, // Episode 2 (Derajat Keasaman)
  { x: 50, y: 40 }, // Episode 3 (Detektif Warna)
  { x: 50, y: 22 }, // Episode 4 (Titrasi)
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
  
  // Tentukan gambar progressive map berdasarkan jumlah episode yang diselesaikan
  const currentLevel = Math.min(playerState.completedEpisodes.size + 1, 4);
  const mapImage = `/img/episode${currentLevel}.png`;

  return (
    <div className="map-screen">
      {/* 3D Animated Background Dihapus, diganti dengan map_bg.png di CSS */}

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

      {/* Progressive Map Area */}
      <div className="island-map-container" style={{ width: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '10px 0 40px 0' }}>
        
        {/* Gambar Peta Utama dengan proporsi asli */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
          <img 
            src={mapImage} 
            alt={`Map Level ${currentLevel}`} 
            style={{ width: '100%', height: 'auto', display: 'block', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' }} 
          />

          {/* Invisible Hitboxes / Buttons di atas Peta Utama */}
          {episodesData.map((ep, i) => {
            const node = NODES[i];
            const unlocked = isEpisodeUnlocked(ep.id, playerState.completedEpisodes, episodesData);
            const completed = playerState.completedEpisodes.has(ep.id);
            
            return (
              <div
                key={ep.id}
                className="island-hitbox"
                style={{ 
                  position: 'absolute', 
                  left: `${node.x}%`, 
                  top: `${node.y}%`, 
                  transform: 'translate(-50%, -50%)',
                  cursor: (unlocked || completed) ? 'pointer' : 'not-allowed',
                  zIndex: 100 - i, // Semakin awal (episode 1 di bawah), z-index semakin besar agar berada di depan
                  width: '50%',     // Area klik dioptimalkan (50% lebar gambar)
                  height: '12%',    // Tinggi hitbox diperkecil sedikit menjadi 12% agar pas
                  borderRadius: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Uncomment line di bawah untuk debugging area hitbox:
                  // background: 'rgba(255, 0, 0, 0.2)', border: '2px solid red'
                }}
                onClick={() => (unlocked || completed) && setSelectedEp(ep)}
              >
                <div 
                  style={{
                    backgroundColor: (unlocked || completed) ? '#2a6f8f' : '#6b5a4a',
                    color: '#f4e4c1',
                    fontFamily: "'Cinzel Decorative', serif",
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                    border: '2px solid #f4e4c1',
                    opacity: (unlocked || completed) ? 1 : 0.8,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (unlocked || completed) e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (unlocked || completed) e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {(unlocked || completed) ? 'MAINKAN' : 'TERKUNCI'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom drawer (Centered Modal) */}
      {selectedEp && (
        <div className="drawer-bg" onClick={() => setSelectedEp(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header-css">
              LEVEL SELECT
            </div>
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
