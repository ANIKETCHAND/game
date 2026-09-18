/**
 * Echo Duel - Procedural Web Audio Engine with Spatial Panning
 * Zero external audio assets required; immune to missing-asset 404 errors.
 */

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    this.masterVolume = 0.8;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.20; // Default low tone for background music
    this.isMuted = false;

    this.bgmAudio = null;
    this.isBgmPlaying = false;
    this.tensionInterval = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API not supported in this environment', e);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.initBGM();
  }

  initBGM() {
    if (this.bgmAudio || typeof Audio === 'undefined') return;
    try {
      this.bgmAudio = new Audio('assets/bgm.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.preload = 'auto';
      this.updateBGMVolume();
    } catch (e) {
      console.warn('Could not initialize BGM audio element:', e);
    }
  }

  startBGM() {
    this.initBGM();
    if (!this.bgmAudio) return;
    this.isBgmPlaying = true;
    this.updateBGMVolume();
    const p = this.bgmAudio.play();
    if (p !== undefined) {
      p.catch(() => {
        // Autoplay pending user interaction
      });
    }
  }

  pauseBGM() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
    this.updateBGMVolume();
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    this.updateBGMVolume();
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  updateBGMVolume() {
    if (this.bgmAudio) {
      const vol = this.isMuted ? 0 : (this.masterVolume * this.musicVolume);
      this.bgmAudio.volume = Math.max(0, Math.min(1, vol));
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    this.updateBGMVolume();
    return this.isMuted;
  }

  /**
   * Helper to create a panned tone node
   */
  createPanner(panValue) {
    if (!this.ctx) return null;
    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panValue, this.ctx.currentTime);
      return panner;
    }
    // Fallback if StereoPanner is not supported
    return null;
  }

  /**
   * Play UI button click
   */
  playClick() {
    this.ensureContext();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Spatially panned gentle audio cue for single-switch lane scanning
   * LEFT = -0.85 pan, 320 Hz
   * CENTER = 0.0 pan, 520 Hz
   * RIGHT = +0.85 pan, 780 Hz
   */
  playScanBeep(direction) {
    this.ensureContext();
    if (!this.ctx) return;
    let pan = 0;
    let freq = 520;
    if (direction === 'LEFT') {
      pan = -0.85;
      freq = 320;
    } else if (direction === 'RIGHT') {
      pan = 0.85;
      freq = 780;
    } else {
      pan = 0.0;
      freq = 520;
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.createPanner(pan);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.9, t + 0.04);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    if (panner) {
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      osc.connect(gain);
      gain.connect(this.sfxGain);
    }
    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Start tension heartbeat during pre-signal window
   */
  startTensionPulse() {
    this.stopTensionPulse();
    this.ensureContext();
    let tick = 0;

    const pulse = () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(tick % 2 === 0 ? 85 : 65, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.12);
      tick++;
    };

    pulse();
    this.tensionInterval = setInterval(pulse, 420);
  }

  stopTensionPulse() {
    if (this.tensionInterval) {
      clearInterval(this.tensionInterval);
      this.tensionInterval = null;
    }
  }

  /**
   * Directional Duel Cue:
   * LEFT = -0.9 pan, 340 Hz, distinct pulse
   * CENTER = 0.0 pan, 550 Hz + 820 Hz bell
   * RIGHT = +0.9 pan, 950 Hz, bright snap
   */
  playDirectionCue(direction) {
    this.stopTensionPulse();
    this.ensureContext();
    if (!this.ctx) return;

    let pan = 0;
    let baseFreq = 550;
    let waveform = 'triangle';

    if (direction === 'LEFT') {
      pan = -0.92;
      baseFreq = 340;
      waveform = 'sawtooth';
    } else if (direction === 'RIGHT') {
      pan = 0.92;
      baseFreq = 950;
      waveform = 'square';
    } else {
      // CENTER
      pan = 0.0;
      baseFreq = 620;
      waveform = 'sine';
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.createPanner(pan);

    osc.type = waveform;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, t + 0.28);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    if (panner) {
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      osc.connect(gain);
      gain.connect(this.sfxGain);
    }

    osc.start(t);
    osc.stop(t + 0.32);

    // Harmonic layer for center chime
    if (direction === 'CENTER') {
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1240, t);
      gain2.gain.setValueAtTime(0.35, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t);
      osc2.stop(t + 0.25);
    }
  }

  /**
   * Player hit success chord
   */
  playSuccess() {
    this.ensureContext();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.28);
    });
  }

  /**
   * Opponent strike / player loss sound
   */
  playDefeat() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.35);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /**
   * False start penalty buzz
   */
  playFalseStart() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    [0, 0.12].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const buzzTime = t + offset;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, buzzTime);

      gain.gain.setValueAtTime(0.45, buzzTime);
      gain.gain.exponentialRampToValueAtTime(0.001, buzzTime + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(buzzTime);
      osc.stop(buzzTime + 0.09);
    });
  }

  /**
   * Match victory fanfare
   */
  playVictoryFanfare() {
    this.ensureContext();
    if (!this.ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = t + i * 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.4, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startT);
      osc.stop(startT + 0.4);
    });
  }

  /**
   * Microphone active listening chime
   */
  playMicStart() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [440, 660].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + idx * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.35, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.15);
    });
  }

  /**
   * Microphone transcription success chime
   */
  playMicSuccess() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + idx * 0.07;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.4, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(st);
      osc.stop(st + 0.18);
    });
  }

  /**
   * Spatial Audio Test sequence (Left -> Center -> Right)
   * Essential for blind players to calibrate stereo perception,
   * and provides callback for deaf visual closed-captions.
   */
  runSoundTest(onStep = null) {
    this.ensureContext();
    if (!this.ctx) return;

    const steps = [
      { delay: 0, pan: -0.85, freq: 440, label: 'Left Speaker' },
      { delay: 450, pan: 0, freq: 660, label: 'Center Sound' },
      { delay: 900, pan: 0.85, freq: 880, label: 'Right Speaker' }
    ];

    steps.forEach((s) => {
      setTimeout(() => {
        if (onStep) onStep(s);
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.createPanner(s.pan);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(s.freq, t);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        if (panner) {
          osc.connect(panner);
          panner.connect(gain);
        } else {
          osc.connect(gain);
        }

        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);
      }, s.delay);
    });
  }

  /**
   * Clean up all sounds
   */
  stopAll() {
    this.stopTensionPulse();
  }
}

