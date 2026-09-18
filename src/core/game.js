/**
 * Echo Duel - Core Game Logic & Round Engine
 */
import { GameStates } from './state.js';

export const SignalDirections = {
  LEFT: 'LEFT',
  CENTER: 'CENTER',
  RIGHT: 'RIGHT'
};

export const Difficulties = {
  EASY: { name: 'Casual', minReaction: 480, maxReaction: 680, missRate: 0.20 },
  MEDIUM: { name: 'Challenger', minReaction: 310, maxReaction: 450, missRate: 0.10 },
  HARD: { name: 'Master', minReaction: 200, maxReaction: 290, missRate: 0.04 }
};

export class GameEngine {
  constructor(stateMachine) {
    this.stateMachine = stateMachine;
    this.roundsToWin = 3;
    this.currentDifficulty = Difficulties.MEDIUM;

    this.playerScore = 0;
    this.opponentScore = 0;
    this.currentRound = 1;

    // Round state
    this.roundPhase = 'IDLE'; // IDLE, TENSION, SIGNAL_ACTIVE, RESOLVED
    this.currentSignal = null;
    this.signalStartTime = 0;
    this.tensionTimer = null;
    this.signalTimeout = null;
    this.aiTimeout = null;

    this.lastResult = null; // details about the last round
    this.isSingleSwitchMode = false;
    this.switchScanInterval = 450;
    this.switchScanDirection = SignalDirections.LEFT;
    this.switchScanTimer = null;

    // Event callbacks
    this.onTensionStart = null;
    this.onSignalTrigger = null;
    this.onRoundResolved = null;
    this.onMatchOver = null;
    this.onScoreUpdate = null;
  }

  setDifficulty(levelKey) {
    if (Difficulties[levelKey]) {
      this.currentDifficulty = Difficulties[levelKey];
    }
  }

  setSingleSwitchMode(enabled, scanIntervalMs = 450) {
    this.isSingleSwitchMode = !!enabled;
    if (scanIntervalMs) {
      this.switchScanInterval = scanIntervalMs;
    }
  }

  startMatch() {
    this.playerScore = 0;
    this.opponentScore = 0;
    this.currentRound = 1;
    this.lastResult = null;
    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        playerScore: this.playerScore,
        opponentScore: this.opponentScore,
        currentRound: this.currentRound,
        roundsToWin: this.roundsToWin
      });
    }
    this.startRound();
  }

  startRound() {
    this.clearAllTimers();
    if (this.lastResult) {
      this.currentRound++;
    }
    this.roundPhase = 'TENSION';
    this.currentSignal = null;
    this.signalStartTime = 0;
    this.stateMachine.setState(GameStates.PLAYING);

    const directions = [SignalDirections.LEFT, SignalDirections.CENTER, SignalDirections.RIGHT];
    const chosenDirection = directions[Math.floor(Math.random() * directions.length)];

    if (this.onTensionStart) {
      this.onTensionStart({
        round: this.currentRound,
        playerScore: this.playerScore,
        opponentScore: this.opponentScore
      });
    }

    // Tension window between 1300ms and 2700ms
    const tensionDuration = 1300 + Math.random() * 1400;
    this.tensionTimer = setTimeout(() => {
      this.triggerSignal(chosenDirection);
    }, tensionDuration);
  }

  triggerSignal(direction) {
    this.roundPhase = 'SIGNAL_ACTIVE';
    this.currentSignal = direction;
    this.signalStartTime = performance.now();

    if (this.onSignalTrigger) {
      this.onSignalTrigger({
        direction,
        timestamp: this.signalStartTime
      });
    }

    // Schedule AI reaction
    this.scheduleAIReaction(direction);

    // Timeout if neither reacts within allotted window (calibrated for switch scanning if active)
    const timeoutDuration = this.isSingleSwitchMode ? Math.max(3200, this.switchScanInterval * 5) : 1800;
    this.signalTimeout = setTimeout(() => {
      if (this.roundPhase === 'SIGNAL_ACTIVE') {
        this.resolveRound({
          winner: 'TIMEOUT',
          reason: 'Too slow! Neither duelist struck in time.',
          playerTime: null,
          opponentTime: null,
          direction: this.currentSignal
        });
      }
    }, timeoutDuration);
  }

  scheduleAIReaction(direction) {
    const diff = this.currentDifficulty;
    const willMiss = Math.random() < diff.missRate;
    let reactionTime = diff.minReaction + Math.random() * (diff.maxReaction - diff.minReaction);

    // Assistive fairness: In single switch mode, give the player time to cycle through lanes
    if (this.isSingleSwitchMode) {
      reactionTime += this.switchScanInterval * 1.8;
    }

    this.aiTimeout = setTimeout(() => {
      if (this.roundPhase !== 'SIGNAL_ACTIVE') return;

      if (willMiss) {
        // AI missed direction or hesitated
        return;
      }

      this.resolveRound({
        winner: 'OPPONENT',
        reason: 'Opponent struck faster!',
        playerTime: null,
        opponentTime: Math.round(reactionTime),
        direction
      });
    }, reactionTime);
  }

  handlePlayerInput(direction) {
    const now = performance.now();

    // 1. False Start check (during tension phase)
    if (this.roundPhase === 'TENSION') {
      this.clearAllTimers();
      this.resolveRound({
        winner: 'OPPONENT',
        reason: 'False Start! You reacted before the signal.',
        playerTime: null,
        opponentTime: null,
        direction: null,
        isFalseStart: true
      });
      return;
    }

    // 2. Active Signal check
    if (this.roundPhase === 'SIGNAL_ACTIVE') {
      const reactionTime = Math.round(now - this.signalStartTime);
      this.clearAllTimers();

      // Check if player selected the correct direction
      if (direction === this.currentSignal) {
        this.resolveRound({
          winner: 'PLAYER',
          reason: 'Direct Hit!',
          playerTime: reactionTime,
          opponentTime: null,
          direction: this.currentSignal
        });
      } else {
        // Wrong direction
        this.resolveRound({
          winner: 'OPPONENT',
          reason: `Wrong direction! Expected ${this.currentSignal}, but you pressed ${direction}.`,
          playerTime: reactionTime,
          opponentTime: null,
          direction: this.currentSignal,
          isWrongDirection: true
        });
      }
    }
  }

  resolveRound(result) {
    this.clearAllTimers();
    this.roundPhase = 'RESOLVED';
    this.lastResult = result;

    if (result.winner === 'PLAYER') {
      this.playerScore++;
    } else if (result.winner === 'OPPONENT') {
      this.opponentScore++;
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        playerScore: this.playerScore,
        opponentScore: this.opponentScore,
        currentRound: this.currentRound,
        roundsToWin: this.roundsToWin
      });
    }

    if (this.onRoundResolved) {
      this.onRoundResolved(result);
    }

    // Check match completion
    if (this.playerScore >= this.roundsToWin || this.opponentScore >= this.roundsToWin) {
      const matchWinner = this.playerScore >= this.roundsToWin ? 'PLAYER' : 'OPPONENT';
      this.stateMachine.setState(GameStates.MATCH_OVER, {
        matchWinner,
        playerScore: this.playerScore,
        opponentScore: this.opponentScore
      });
      if (this.onMatchOver) {
        this.onMatchOver({
          matchWinner,
          playerScore: this.playerScore,
          opponentScore: this.opponentScore
        });
      }
    } else {
      this.stateMachine.setState(GameStates.ROUND_RESULT, result);
    }
  }

  clearAllTimers() {
    if (this.tensionTimer) {
      clearTimeout(this.tensionTimer);
      this.tensionTimer = null;
    }
    if (this.signalTimeout) {
      clearTimeout(this.signalTimeout);
      this.signalTimeout = null;
    }
    if (this.aiTimeout) {
      clearTimeout(this.aiTimeout);
      this.aiTimeout = null;
    }
    if (this.switchScanTimer) {
      clearInterval(this.switchScanTimer);
      this.switchScanTimer = null;
    }
  }

  resetAll() {
    this.clearAllTimers();
    this.playerScore = 0;
    this.opponentScore = 0;
    this.currentRound = 1;
    this.roundPhase = 'IDLE';
    this.currentSignal = null;
    this.lastResult = null;
    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        playerScore: this.playerScore,
        opponentScore: this.opponentScore,
        currentRound: this.currentRound,
        roundsToWin: this.roundsToWin
      });
    }
    this.stateMachine.setState(GameStates.MENU);
  }
}
