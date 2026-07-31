class AudioEngine {
  constructor() {
    this.musicEnabled = localStorage.getItem('cq_music_enabled') !== 'false';
    this.sfxEnabled = localStorage.getItem('cq_sfx_enabled') !== 'false';
    this.bgmBlocked = false;
    
    this.activeSfxCount = 0;
    this.normalBgmVolume = 0.05;
    this.duckedBgmVolume = 0.01;
    
    // Load Audio Objects
    this.bgm = new Audio('/audio/jonasblakewood-tropical-533862.mp3');
    this.bgm.loop = true;
    this.bgm.volume = this.normalBgmVolume; // Keep background music very soft

    this.sfx = {
      click: new Audio('/audio/creatorshome-select-001-337218.mp3'),
      success: new Audio('/audio/scratchonix-victory-chime-366449.mp3'),
      fail: new Audio('/audio/freesound_community-wrong-buzzer-6268.mp3'),
      correct: new Audio('/audio/dragon-studio-correct-472358.mp3'),
      typing: new Audio('/audio/dragon-studio-keyboard-typing-sound-effect-335503.mp3'),
      countdown: new Audio('/audio/kave_msri-10sec-digital-countdown-sfx-319873.mp3')
    };

    // Preload SFX
    Object.values(this.sfx).forEach(audio => {
      audio.volume = 1.0;
    });

    // Unlock audio on first user interaction
    const unlockAudio = () => {
      if (this.bgmBlocked && this.musicEnabled) {
        this.playBGM();
      }
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
  }

  // --- SETTINGS ---
  toggleMusic(enabled) {
    this.musicEnabled = enabled;
    localStorage.setItem('cq_music_enabled', enabled);
    if (enabled) {
      this.playBGM();
    } else {
      this.stopBGM();
    }
  }

  toggleSFX(enabled) {
    this.sfxEnabled = enabled;
    localStorage.setItem('cq_sfx_enabled', enabled);
  }

  // --- PLAYBACK ---
  playBGM() {
    if (this.musicEnabled) {
      // Browser might block this if no user interaction yet, handle gracefully
      this.bgm.play().then(() => {
        this.bgmBlocked = false;
      }).catch(e => {
        console.warn('BGM blocked by browser autoplay policy:', e);
        this.bgmBlocked = true;
      });
    }
  }

  stopBGM() {
    this.bgm.pause();
  }

  playSFX(key) {
    if (!this.sfxEnabled) return;
    
    const audio = this.sfx[key];
    if (audio) {
      // Clone the node to allow overlapping sounds (e.g. rapid clicking)
      const clone = audio.cloneNode();
      clone.volume = audio.volume;
      
      // Audio Ducking (Auto Low Volume)
      this.activeSfxCount++;
      if (this.musicEnabled && this.bgm) {
        this.bgm.volume = this.duckedBgmVolume;
      }
      
      let restored = false;
      const restoreBgm = () => {
        if (restored) return;
        restored = true;
        this.activeSfxCount = Math.max(0, this.activeSfxCount - 1);
        if (this.activeSfxCount === 0 && this.musicEnabled && this.bgm) {
          this.bgm.volume = this.normalBgmVolume;
        }
      };
      
      clone.onended = restoreBgm;
      clone.onpause = restoreBgm;

      clone.play().catch(e => {
        console.warn('SFX blocked:', e);
        restoreBgm();
      });
      return clone;
    } else {
      console.warn(`SFX key '${key}' not found.`);
    }
  }
}

export const audioEngine = new AudioEngine();
