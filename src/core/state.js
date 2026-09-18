/**
 * Echo Duel - Central State Machine
 * States: MENU -> PLAYING -> ROUND_RESULT -> REPLAY
 */

export const GameStates = {
  LANDING: 'LANDING',
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  ROUND_RESULT: 'ROUND_RESULT',
  MATCH_OVER: 'MATCH_OVER',
  SETTINGS: 'SETTINGS'
};

export class StateMachine {
  constructor(initialState = GameStates.MENU) {
    this.currentState = initialState;
    this.previousState = null;
    this.listeners = new Map();
  }

  getState() {
    return this.currentState;
  }

  setState(newState, payload = {}) {
    if (this.currentState === newState && newState !== GameStates.PLAYING) {
      return;
    }
    this.previousState = this.currentState;
    this.currentState = newState;
    this.emit('stateChange', {
      current: this.currentState,
      previous: this.previousState,
      payload
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const filtered = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, filtered);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    for (const callback of this.listeners.get(event)) {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in state listener for ${event}:`, err);
      }
    }
  }

  reset() {
    this.setState(GameStates.MENU);
  }
}
