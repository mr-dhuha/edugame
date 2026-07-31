class AudioEngine {
  constructor() {
    this.musicEnabled = localStorage.getItem('cq_music_enabled') !== 'false';
    this.sfxEnabled = localStorage.getItem('cq_sfx_enabled') !== 'false';
    this.bgmBlocked = false;
    
    // Load Audio Objects
    this.bgm = new Audio('/audio/bgm.ogg');
    this.bgm.loop = true;
    this.bgm.volume = 0.2; // Keep background music soft

    this.sfx = {
      click: new Audio('/audio/click.ogg'),
      success: new Audio('/audio/success.wav'),
      fail: new Audio('/audio/fail.wav')
    };

    // Preload SFX
    Object.values(this.sfx).forEach(audio => {
      audio.volume = 0.5;
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
      clone.play().catch(e => console.warn('SFX blocked:', e));
    } else {
      console.warn(`SFX key '${key}' not found.`);
    }
  }
}

export const audioEngine = new AudioEngine();
