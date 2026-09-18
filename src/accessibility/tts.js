/**
 * Echo Duel - Accessibility & TTS Engine
 * Dual-channel screen reader support: Web Speech API TTS + ARIA live assertive announcer.
 */

export class AccessibilityAnnouncer {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.liveRegion = null;
    this.enabled = true;
    this.volume = 1.0;
    this.rate = 1.15; // Slightly fast for responsive gameplay feedback
    this.pitch = 1.0;
    this.preferredVoice = null;

    this.initAriaLive();
    this.initVoice();
  }

  initAriaLive() {
    if (typeof document === 'undefined') return;
    let live = document.getElementById('aria-game-announcer');
    if (!live) {
      live = document.createElement('div');
      live.id = 'aria-game-announcer';
      live.setAttribute('aria-live', 'assertive');
      live.setAttribute('aria-atomic', 'true');
      live.className = 'sr-only';
      document.body.appendChild(live);
    }
    this.liveRegion = live;
  }

  initVoice() {
    if (!this.synth) return;
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      // Pick clear English voice if available
      this.preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Zira') || v.name.includes('David'))) || voices[0];
    };
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (!this.enabled && this.synth) {
      this.synth.cancel();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  announce(text, options = {}) {
    if (!text) return;

    // 1. Update ARIA Live Region for external screen readers
    if (this.liveRegion) {
      this.liveRegion.textContent = '';
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = text;
        }
      }, 20);
    }

    // 2. Speak aloud using Web Speech API if enabled
    if (!this.enabled || !this.synth || this.volume <= 0) return;

    // Cancel previous utterance to avoid lagging behind rapid gameplay
    if (options.interrupt !== false) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }
    utterance.volume = this.volume;
    utterance.rate = options.rate || this.rate;
    utterance.pitch = options.pitch || this.pitch;

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
      utterance.onerror = (e) => {
        // Non-fatal error during speech
        console.warn('SpeechSynthesis error:', e.error || e);
      };
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}
