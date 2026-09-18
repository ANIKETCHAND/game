/**
 * Echo Duel - Voice Speech Recognition (Microphone Option)
 * Enables hands-free name entry and voice commands via Web Speech Recognition API.
 */

export class VoiceInputManager {
  constructor(options = {}) {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;

    this.onStart = options.onStart || null;
    this.onResult = options.onResult || null;
    this.onError = options.onError || null;
    this.onEnd = options.onEnd || null;

    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      this.isSupported = false;
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
      this.isSupported = true;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStart) this.onStart();
      };

      this.recognition.onresult = (event) => {
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          if (this.onResult) {
            this.onResult(transcript.trim());
          }
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        console.warn('Speech recognition event error:', event.error);
        if (this.onError) {
          this.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEnd) this.onEnd();
      };
    } catch (e) {
      console.warn('SpeechRecognition initialization failed:', e);
      this.isSupported = false;
    }
  }

  start() {
    if (!this.isSupported || !this.recognition) {
      if (this.onError) this.onError('not-supported');
      return false;
    }
    if (this.isListening) {
      this.stop();
      return false;
    }
    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn('Recognition start exception:', e);
      if (this.onError) this.onError('start-failed');
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }
    this.isListening = false;
  }
}
