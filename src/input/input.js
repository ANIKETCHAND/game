/**
 * Echo Duel - Unified Input System
 * Normalizes Keyboard, Mouse, Touch, Gamepad, and Single-Switch accessibility inputs.
 */

export class InputManager {
  constructor() {
    this.actionListeners = [];
    this.debounceTime = 80; // ms to prevent accidental hardware bounce
    this.lastActionTimestamp = 0;
    this.enabled = true;
    this.isSingleSwitchMode = false;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundTouch = this.handleTouch.bind(this);
    this.attachEvents();
  }

  attachEvents() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.boundKeyDown, { passive: false });
  }

  detachEvents() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  onAction(callback) {
    this.actionListeners.push(callback);
    return () => {
      this.actionListeners = this.actionListeners.filter(cb => cb !== callback);
    };
  }

  emitAction(actionName, details = {}) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastActionTimestamp < this.debounceTime && actionName === this.lastActionName) {
      return; // Debounce rapid accidental double triggers
    }
    this.lastActionTimestamp = now;
    this.lastActionName = actionName;

    for (const listener of this.actionListeners) {
      try {
        listener(actionName, details);
      } catch (err) {
        console.error('Error handling input action:', err);
      }
    }
  }

  handleKeyDown(e) {
    // If inside settings modal drawer, allow Escape to close it
    if (e.target && e.target.closest && e.target.closest('#settings-panel')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.emitAction('TOGGLE_SETTINGS', { source: 'keyboard' });
      }
      return;
    }

    // If inside leaderboard modal, allow Escape to close it
    if (e.target && e.target.closest && e.target.closest('#leaderboard-modal')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.emitAction('CLOSE_MODALS', { source: 'keyboard' });
      }
      return;
    }

    // Ignore game input if user is in an input or select field
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
      if (e.key === 'Enter' && e.target.id === 'player-name-input') {
        e.preventDefault();
        this.emitAction('SUBMIT_NAME', { source: 'keyboard' });
      }
      return;
    }

    const key = e.key;
    const code = e.code;

    // Single switch mode check
    if (this.isSingleSwitchMode && (key === ' ' || code === 'Space' || key === 'Enter' || code === 'NumpadEnter')) {
      e.preventDefault();
      this.emitAction('SWITCH_TRIGGER', { key });
      return;
    }

    // Directional actions (supporting WASD, Arrows, and Numpad)
    if (key === 'ArrowLeft' || key === 'a' || key === 'A' || code === 'KeyA' || code === 'Numpad4') {
      e.preventDefault();
      this.emitAction('STRIKE_LEFT', { source: 'keyboard' });
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D' || code === 'KeyD' || code === 'Numpad6') {
      e.preventDefault();
      this.emitAction('STRIKE_RIGHT', { source: 'keyboard' });
    } else if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'w' || key === 'W' || key === 's' || key === 'S' || code === 'KeyW' || code === 'KeyS' || code === 'Numpad5' || code === 'Numpad8') {
      e.preventDefault();
      this.emitAction('STRIKE_CENTER', { source: 'keyboard' });
    } else if (key === ' ' || code === 'Space' || key === 'Enter' || code === 'NumpadEnter') {
      e.preventDefault();
      this.emitAction('PRIMARY_ACTION', { source: 'keyboard' });
    } else if (key === 'Escape') {
      e.preventDefault();
      this.emitAction('TOGGLE_SETTINGS', { source: 'keyboard' });
    } else if (key === 'm' || key === 'M') {
      this.emitAction('TOGGLE_MUTE', { source: 'keyboard' });
    }
  }

  handleTouch(e, direction) {
    if (e) {
      e.preventDefault();
    }
    if (direction === 'LEFT') {
      this.emitAction('STRIKE_LEFT', { source: 'touch' });
    } else if (direction === 'RIGHT') {
      this.emitAction('STRIKE_RIGHT', { source: 'touch' });
    } else if (direction === 'CENTER') {
      this.emitAction('STRIKE_CENTER', { source: 'touch' });
    } else if (direction === 'PRIMARY') {
      this.emitAction('PRIMARY_ACTION', { source: 'touch' });
    }
  }

  setSingleSwitchMode(enabled) {
    this.isSingleSwitchMode = !!enabled;
  }
}
