/**
 * Echo Duel - Single Switch Scanning Controller
 * Provides hands-free / single-button scanning for players with motor disabilities.
 * Cycles through directions (LEFT -> CENTER -> RIGHT) with configurable scan speed.
 */

import { SignalDirections } from '../core/game.js';

export class SwitchController {
  constructor(options = {}) {
    this.enabled = false;
    this.scanIntervalMs = options.scanIntervalMs || 450;
    this.scanItems = [
      SignalDirections.LEFT,
      SignalDirections.CENTER,
      SignalDirections.RIGHT
    ];
    this.currentIndex = 0;
    this.timer = null;
    this.onScanChange = options.onScanChange || null;
    this.soundEngine = options.soundEngine || null;
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (!this.enabled) {
      this.stop();
    }
  }

  setScanSpeed(ms) {
    this.scanIntervalMs = Math.max(200, Math.min(1200, ms));
    if (this.timer) {
      this.stop();
      this.start();
    }
  }

  getCurrentDirection() {
    return this.scanItems[this.currentIndex];
  }

  playScanAudio() {
    if (!this.soundEngine) return;
    const dir = this.getCurrentDirection();
    if (typeof this.soundEngine.playScanBeep === 'function') {
      this.soundEngine.playScanBeep(dir);
    } else if (typeof this.soundEngine.playClick === 'function') {
      this.soundEngine.playClick();
    }
  }

  start() {
    if (!this.enabled) return;
    this.stop();
    this.notifyChange();
    this.playScanAudio();

    this.timer = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.scanItems.length;
      this.notifyChange();
      this.playScanAudio();
    }, this.scanIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  reset() {
    this.stop();
    this.currentIndex = 0;
    this.notifyChange();
  }

  notifyChange() {
    if (this.onScanChange) {
      this.onScanChange(this.getCurrentDirection(), this.currentIndex);
    }
  }
}
