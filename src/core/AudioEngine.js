class AudioEngine {
  constructor() {
    this.musicEnabled = true; // Always enabled, volume 0 means muted
    this.sfxEnabled = true;
    this.bgmBlocked = false;
    
    this.activeSfxCount = 0;
    
    const savedBgmVol = localStorage.getItem('cq_bgm_vol');
    const savedSfxVol = localStorage.getItem('cq_sfx_vol');
    this.bgmVolume = savedBgmVol !== null ? parseFloat(savedBgmVol) : 0.5; // Default slider 50%
    this.sfxVolume = savedSfxVol !== null ? parseFloat(savedSfxVol) : 1.0;
    
    this.maxBgmMultiplier = 0.6; // Baseline max 60%
    this.duckedBgmVolume = this.bgmVolume * 0.2;
    
    // Load Audio Objects
    this.bgm = new Audio('/audio/jonasblakewood-tropical-533862.mp3');
    this.bgm.loop = true;
    this.bgm.volume = this.bgmVolume * this.maxBgmMultiplier;

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
      audio.volume = this.sfxVolume;
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
  setBgmVolume(vol) {
    this.bgmVolume = parseFloat(vol);
    this.duckedBgmVolume = this.bgmVolume * 0.2;
    localStorage.setItem('cq_bgm_vol', this.bgmVolume);
    
    const actualVolume = this.bgmVolume * this.maxBgmMultiplier;
    const actualDucked = this.duckedBgmVolume * this.maxBgmMultiplier;

    if (this.activeSfxCount === 0) {
      this.bgm.volume = actualVolume;
    } else {
      this.bgm.volume = actualDucked;
    }
    
    if (this.bgmVolume > 0 && this.bgm.paused && !this.bgmBlocked) {
      this.playBGM();
    } else if (this.bgmVolume === 0) {
      this.stopBGM();
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = parseFloat(vol);
    localStorage.setItem('cq_sfx_vol', this.sfxVolume);
    Object.values(this.sfx).forEach(audio => {
      audio.volume = this.sfxVolume;
    });
  }

  // --- PLAYBACK ---
  playBGM() {
    if (this.bgmVolume > 0) {
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
    if (this.sfxVolume <= 0) return;
    
    const audio = this.sfx[key];
    if (audio) {
      // Clone the node to allow overlapping sounds (e.g. rapid clicking)
      const clone = audio.cloneNode();
      clone.volume = audio.volume;
      
      // Audio Ducking (Auto Low Volume)
      this.activeSfxCount++;
      if (this.bgmVolume > 0 && this.bgm) {
        this.bgm.volume = this.duckedBgmVolume * this.maxBgmMultiplier;
      }
      
      let restored = false;
      const restoreBgm = () => {
        if (restored) return;
        restored = true;
        this.activeSfxCount = Math.max(0, this.activeSfxCount - 1);
        if (this.activeSfxCount === 0 && this.bgmVolume > 0 && this.bgm) {
          this.bgm.volume = this.bgmVolume * this.maxBgmMultiplier;
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
