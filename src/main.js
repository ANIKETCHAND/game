/**
 * Echo Duel - Main Orchestrator & Game Entry Point
 * Wires state machine, game engine, procedural audio, TTS announcer,
 * high-contrast canvas renderer, switch controller, unified input manager,
 * microphone speech recognition, and persistent points leaderboard.
 */

import { StateMachine, GameStates } from './core/state.js';
import { GameEngine, SignalDirections, Difficulties } from './core/game.js';
import { SoundEngine } from './audio/sound.js';
import { AccessibilityAnnouncer } from './accessibility/tts.js';
import { SwitchController } from './accessibility/switch-control.js';
import { InputManager } from './input/input.js';
import { VFXManager } from './render/vfx.js';
import { GameRenderer } from './render/render.js';
import { VoiceInputManager } from './accessibility/voice-input.js';
import { LeaderboardManager } from './core/leaderboard.js';

class EchoDuelApp {
  constructor() {
    // 1. Initialize Subsystems
    this.stateMachine = new StateMachine(GameStates.LANDING);
    this.gameEngine = new GameEngine(this.stateMachine);
    this.soundEngine = new SoundEngine();
    this.announcer = new AccessibilityAnnouncer();
    this.inputManager = new InputManager();
    this.vfxManager = new VFXManager();
    this.leaderboard = new LeaderboardManager();

    this.playerName = 'Jack-Jack';
    this.selectedDifficulty = 'MEDIUM';
    this.fastestReactionThisMatch = null;
    this.currentLeaderboardFilter = 'ALL';

    this.switchController = new SwitchController({
      scanIntervalMs: 450,
      soundEngine: this.soundEngine,
      onScanChange: (dir) => {
        if (this.renderer) {
          this.renderer.updateState({ scannedDirection: dir });
        }
        this.updateSwitchVisualHighlight(dir);
      }
    });

    // 2. DOM Elements - Arena & HUD
    this.canvas = document.getElementById('game-canvas');
    this.cueBanner = document.getElementById('sensory-cue-banner');
    this.cueText = document.getElementById('cue-display-text');
    this.btnPrimary = document.getElementById('btn-primary-action');
    this.btnLeft = document.getElementById('btn-strike-left');
    this.btnCenter = document.getElementById('btn-strike-center');
    this.btnRight = document.getElementById('btn-strike-right');

    this.scorePlayer = document.getElementById('score-val-player');
    this.scoreOpponent = document.getElementById('score-val-opponent');
    this.roundText = document.getElementById('round-val-text');
    this.targetText = document.getElementById('target-val-text');
    this.hudPlayerName = document.querySelector('.player-card .player-name');

    // Header & Toggles
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.soundIconText = document.getElementById('sound-icon-text');
    this.btnContrastToggle = document.getElementById('btn-contrast-toggle');
    this.contrastIconText = document.getElementById('contrast-icon-text');
    this.btnNavLeaderboard = document.getElementById('btn-nav-leaderboard');

    // Settings Modal
    this.settingsDrawer = document.getElementById('settings-panel');
    this.btnSettings = document.getElementById('btn-settings');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnSaveSettings = document.getElementById('btn-save-settings');

    this.toggleTts = document.getElementById('toggle-tts');
    this.sliderVolume = document.getElementById('slider-volume');
    this.sliderSfx = document.getElementById('slider-sfx');
    this.toggleSwitchMode = document.getElementById('toggle-switch-mode');
    this.sliderScanSpeed = document.getElementById('slider-scan-speed');
    this.scanSpeedLabel = document.getElementById('scan-speed-label');
    this.toggleHighContrast = document.getElementById('toggle-high-contrast');
    this.toggleReduceMotion = document.getElementById('toggle-reduce-motion');
    this.selectDifficulty = document.getElementById('select-difficulty');
    this.selectMatchLength = document.getElementById('select-match-length');

    // Landing Page Elements
    this.landingScreen = document.getElementById('landing-screen');
    this.playerNameInput = document.getElementById('player-name-input');
    this.btnMicName = document.getElementById('btn-mic-name');
    this.micBtnLabel = document.getElementById('mic-btn-label');
    this.micStatusBadge = document.getElementById('mic-status-badge');
    this.micFeedbackText = document.getElementById('mic-feedback-text');
    this.avatarTags = document.querySelectorAll('.btn-tag');
    this.btnSoundTest = document.getElementById('btn-sound-test');
    this.soundTestCaption = document.getElementById('sound-test-caption');
    this.btnModeEasy = document.getElementById('btn-mode-easy');
    this.btnModeMedium = document.getElementById('btn-mode-medium');
    this.btnModeTough = document.getElementById('btn-mode-tough');
    this.btnEnterArena = document.getElementById('btn-enter-arena');
    this.btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');

    // Leaderboard Modal Elements
    this.leaderboardModal = document.getElementById('leaderboard-modal');
    this.btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
    this.btnCloseLeaderboardBottom = document.getElementById('btn-close-leaderboard-bottom');
    this.btnClearLeaderboard = document.getElementById('btn-clear-leaderboard');
    this.leaderboardTbody = document.getElementById('leaderboard-tbody');
    this.filterButtons = document.querySelectorAll('.btn-filter');

    // 3. Renderer
    this.renderer = new GameRenderer(this.canvas, this.vfxManager);
    this.renderer.updateState({ playerName: this.playerName });

    // 4. Voice Input Subsystem
    this.voiceInput = new VoiceInputManager({
      onStart: () => {
        if (this.btnMicName) this.btnMicName.classList.add('listening');
        if (this.micStatusBadge) this.micStatusBadge.classList.add('listening-active');
        if (this.micBtnLabel) this.micBtnLabel.textContent = 'Listening...';
        if (this.micFeedbackText) this.micFeedbackText.textContent = 'Listening... Speak your name clearly.';
        this.announcer.announce('Microphone active. Speak your name now.');
      },
      onResult: (transcript) => {
        if (this.btnMicName) this.btnMicName.classList.remove('listening');
        if (this.micStatusBadge) this.micStatusBadge.classList.remove('listening-active');
        if (this.micBtnLabel) this.micBtnLabel.textContent = 'Speak';
        const cleaned = transcript.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 16);
        if (cleaned) {
          this.playerName = cleaned;
          if (this.playerNameInput) this.playerNameInput.value = cleaned;
          if (this.micFeedbackText) this.micFeedbackText.textContent = `Captured: "${cleaned}"`;
          this.soundEngine.playMicSuccess();
          this.announcer.announce(`Name set to ${cleaned}`);
        }
      },
      onError: (err) => {
        if (this.btnMicName) this.btnMicName.classList.remove('listening');
        if (this.micStatusBadge) this.micStatusBadge.classList.remove('listening-active');
        if (this.micBtnLabel) this.micBtnLabel.textContent = 'Speak';
        if (this.micFeedbackText) this.micFeedbackText.textContent = 'Voice input unavailable or permission denied. Type name instead.';
        this.announcer.announce('Voice input unavailable. Please type your name.');
      },
      onEnd: () => {
        if (this.btnMicName) this.btnMicName.classList.remove('listening');
        if (this.micStatusBadge) this.micStatusBadge.classList.remove('listening-active');
        if (this.micBtnLabel) this.micBtnLabel.textContent = 'Speak';
      }
    });

    // 5. Connect callbacks and listeners
    this.wireEngineEvents();
    this.wireStateEvents();
    this.wireInputActions();
    this.wireUIControls();
    this.wireLandingAndLeaderboardControls();

    // 6. Setup Resize Listener
    window.addEventListener('resize', () => {
      this.renderer.handleResize();
    });

    // 7. Start Render Loop
    this.startLoop();

    // Initial voice greeting for landing screen
    setTimeout(() => {
      this.announcer.announce('Welcome to Echo Duel. Enter your name, select difficulty, or press Enter Arena to begin.');
    }, 400);
  }

  wireEngineEvents() {
    this.gameEngine.onTensionStart = ({ round, playerScore, opponentScore }) => {
      this.soundEngine.startTensionPulse();
      this.updateBanner('⚡ READY... HOLD... ⚡', 'active-tension');
      this.announcer.announce(`Round ${round}. Ready... hold.`, { rate: 1.2 });
      if (this.switchController.enabled) {
        this.switchController.start();
      }
      this.renderer.updateState({
        roundPhase: 'TENSION',
        currentSignal: null,
        playerScore,
        opponentScore,
        currentRound: round
      });
    };

    this.gameEngine.onSignalTrigger = ({ direction }) => {
      this.soundEngine.playDirectionCue(direction);
      let dirText = 'CENTER';
      let iconClass = 'active-cue-center';
      if (direction === SignalDirections.LEFT) {
        dirText = '◄ STRIKE LEFT!';
        iconClass = 'active-cue-left';
      } else if (direction === SignalDirections.RIGHT) {
        dirText = '► STRIKE RIGHT!';
        iconClass = 'active-cue-right';
      } else {
        dirText = '◉ STRIKE CENTER!';
      }

      this.updateBanner(dirText, iconClass);
      this.announcer.announce(direction, { rate: 1.35, pitch: 1.2 });

      this.renderer.updateState({
        roundPhase: 'SIGNAL_ACTIVE',
        currentSignal: direction
      });
    };

    this.gameEngine.onRoundResolved = (result) => {
      this.soundEngine.stopTensionPulse();
      if (this.switchController.enabled) {
        this.switchController.stop();
      }

      // Track fastest reaction time for points calculation
      if (result.winner === 'PLAYER' && typeof result.playerTime === 'number') {
        if (this.fastestReactionThisMatch === null || result.playerTime < this.fastestReactionThisMatch) {
          this.fastestReactionThisMatch = result.playerTime;
        }
      }

      // Visual / Audio feedback based on outcome
      const canvasW = this.renderer.width;
      const canvasH = this.renderer.height;

      // Trigger 3D combat animations (lunges, clashes, hits)
      this.renderer.triggerClash(result.winner, result.isFalseStart);

      if (result.winner === 'PLAYER') {
        this.soundEngine.playSuccess();
        this.vfxManager.triggerClash(canvasW * 0.78, canvasH * 0.52);
        this.updateBanner(`★ POINT SCORED! (${result.playerTime} ms) ★`, 'active-cue-center');
        this.announcer.announce(`Point player! ${result.playerTime} milliseconds.`);
      } else if (result.winner === 'OPPONENT') {
        if (result.isFalseStart) {
          this.soundEngine.playFalseStart();
          this.vfxManager.triggerMiss(canvasW * 0.22, canvasH * 0.52);
          this.updateBanner('⚠ FALSE START! Reacted too early ⚠', 'active-tension');
          this.announcer.announce('False start! You struck before the signal. Opponent scores.');
        } else {
          this.soundEngine.playDefeat();
          this.vfxManager.triggerImpact(canvasW * 0.22, canvasH * 0.52, '#ef4444', 16);
          this.updateBanner(`✕ OPPONENT SCORED! ${result.reason} ✕`, 'active-cue-right');
          this.announcer.announce(`Point rival! ${result.reason}`);
        }
      } else {
        // Timeout
        this.soundEngine.playFalseStart();
        this.updateBanner('⏱ TIMEOUT! Neither duelist struck in time.', 'active-tension');
        this.announcer.announce('Timeout. Neither duelist struck in time.');
      }

      this.renderer.updateState({
        roundPhase: 'RESOLVED',
        lastResult: result,
        playerScore: this.gameEngine.playerScore,
        opponentScore: this.gameEngine.opponentScore
      });

      this.updateHUD();
      this.btnPrimary.textContent = '▶ NEXT ROUND (Space / Tap)';
      this.btnPrimary.setAttribute('aria-label', 'Proceed to Next Round');
    };

    this.gameEngine.onMatchOver = ({ matchWinner, playerScore, opponentScore }) => {
      this.soundEngine.stopTensionPulse();
      if (this.switchController.enabled) {
        this.switchController.stop();
      }

      const won = matchWinner === 'PLAYER';

      // Trigger 3D Match Over animation (victory stance vs defeat)
      this.renderer.triggerMatchOver(matchWinner);

      // Save match to persistent Points Leaderboard
      const matchRecord = this.leaderboard.recordMatch({
        name: this.playerName,
        difficulty: this.selectedDifficulty,
        playerScore,
        opponentScore,
        won,
        bestReaction: this.fastestReactionThisMatch
      });

      if (won) {
        this.soundEngine.playVictoryFanfare();
        this.vfxManager.triggerImpact(this.renderer.width * 0.5, this.renderer.height * 0.4, '#22c55e', 35);
        this.updateBanner(`🏆 VICTORY! Match won ${playerScore}-${opponentScore}! +${matchRecord.points} PTS! 🏆`, 'active-cue-center');
        this.announcer.announce(`Victory! You won the match ${playerScore} to ${opponentScore}! Earned ${matchRecord.points} points. Press Spacebar or Play Again to rematch.`);
      } else {
        this.soundEngine.playDefeat();
        this.updateBanner(`💀 DEFEAT! Rival took match ${opponentScore}-${playerScore}. +${matchRecord.points} PTS. 💀`, 'active-cue-right');
        this.announcer.announce(`Defeat! Rival won the match ${opponentScore} to ${playerScore}. Earned ${matchRecord.points} points. Press Spacebar or Play Again to rematch.`);
      }

      this.renderer.updateState({
        gameState: GameStates.MATCH_OVER,
        playerScore,
        opponentScore
      });

      this.updateHUD();
      this.btnPrimary.textContent = '🔄 PLAY AGAIN (Space / Tap)';
      this.btnPrimary.setAttribute('aria-label', 'Rematch and Play Again');
    };

    this.gameEngine.onScoreUpdate = ({ playerScore, opponentScore, currentRound, roundsToWin }) => {
      this.renderer.updateState({
        playerScore,
        opponentScore,
        currentRound,
        roundsToWin
      });
      this.updateHUD();
    };
  }

  wireStateEvents() {
    this.stateMachine.on('stateChange', ({ current }) => {
      this.renderer.updateState({ gameState: current });

      if (current === GameStates.LANDING) {
        if (this.landingScreen) this.landingScreen.classList.remove('hidden');
      } else {
        if (this.landingScreen) this.landingScreen.classList.add('hidden');
      }

      if (current === GameStates.MENU) {
        this.btnPrimary.textContent = '▶ START MATCH (Space / Tap)';
        this.btnPrimary.setAttribute('aria-label', 'Start Match');
        this.updateBanner('🎧 Ready to duel. Press START MATCH or Spacebar.', '');
      } else if (current === GameStates.PLAYING) {
        if (this.switchController.enabled) {
          this.btnPrimary.textContent = '⚡ STRIKE SCANNED LANE (Tap / Space)';
          this.btnPrimary.setAttribute('aria-label', 'Strike scanned lane');
        } else {
          this.btnPrimary.textContent = '⚡ DUEL IN PROGRESS';
          this.btnPrimary.setAttribute('aria-label', 'Duel in progress');
        }
      } else if (current === GameStates.ROUND_RESULT) {
        this.btnPrimary.textContent = '▶ NEXT ROUND (Space / Tap)';
        this.btnPrimary.setAttribute('aria-label', 'Proceed to Next Round');
      } else if (current === GameStates.MATCH_OVER) {
        this.btnPrimary.textContent = '🔄 PLAY AGAIN (Space / Tap)';
        this.btnPrimary.setAttribute('aria-label', 'Rematch and Play Again');
      }
    });
  }

  wireInputActions() {
    this.inputManager.onAction((action, details) => {
      // Unlock AudioContext on first user action
      this.soundEngine.ensureContext();

      const currentState = this.stateMachine.getState();

      if (action === 'CLOSE_MODALS') {
        this.toggleSettingsModal(false);
        this.closeLeaderboard();
        return;
      }

      if (action === 'SUBMIT_NAME') {
        this.enterArena();
        return;
      }

      if (action === 'TOGGLE_MUTE') {
        this.toggleSound();
        return;
      }

      if (action === 'TOGGLE_SETTINGS') {
        this.toggleSettingsModal();
        return;
      }

      // Single-Switch Trigger Action
      if (action === 'SWITCH_TRIGGER') {
        if (currentState === GameStates.LANDING) {
          this.enterArena();
        } else if (currentState === GameStates.MENU || currentState === GameStates.ROUND_RESULT || currentState === GameStates.MATCH_OVER) {
          this.handlePrimaryAction();
        } else if (currentState === GameStates.PLAYING) {
          const scannedDir = this.switchController.getCurrentDirection();
          this.gameEngine.handlePlayerInput(scannedDir);
        }
        return;
      }

      // Directional Strikes
      if (currentState === GameStates.PLAYING) {
        if (action === 'STRIKE_LEFT') {
          this.highlightButton(this.btnLeft);
          this.gameEngine.handlePlayerInput(SignalDirections.LEFT);
        } else if (action === 'STRIKE_CENTER') {
          this.highlightButton(this.btnCenter);
          this.gameEngine.handlePlayerInput(SignalDirections.CENTER);
        } else if (action === 'STRIKE_RIGHT') {
          this.highlightButton(this.btnRight);
          this.gameEngine.handlePlayerInput(SignalDirections.RIGHT);
        } else if (action === 'PRIMARY_ACTION') {
          // If Spacebar is hit during active duel in standard mode, strike center
          this.highlightButton(this.btnCenter);
          this.gameEngine.handlePlayerInput(SignalDirections.CENTER);
        }
      } else if (currentState === GameStates.LANDING) {
        if (action === 'PRIMARY_ACTION') {
          this.enterArena();
        }
      } else {
        // In MENU, ROUND_RESULT, or MATCH_OVER
        if (action === 'PRIMARY_ACTION') {
          this.handlePrimaryAction();
        }
      }
    });
  }

  handlePrimaryAction() {
    this.soundEngine.ensureContext();
    this.soundEngine.playClick();
    const currentState = this.stateMachine.getState();

    if (currentState === GameStates.LANDING) {
      this.enterArena();
    } else if (currentState === GameStates.MENU || currentState === GameStates.MATCH_OVER) {
      this.fastestReactionThisMatch = null;
      this.gameEngine.startMatch();
    } else if (currentState === GameStates.ROUND_RESULT) {
      this.gameEngine.startRound();
    }
  }

  enterArena() {
    this.soundEngine.ensureContext();
    this.soundEngine.playClick();

    const inputVal = this.playerNameInput ? this.playerNameInput.value.trim() : '';
    this.playerName = inputVal || 'Jack-Jack';

    if (this.hudPlayerName) {
      this.hudPlayerName.textContent = this.playerName.toUpperCase();
    }
    this.renderer.updateState({ playerName: this.playerName });

    if (this.landingScreen) {
      this.landingScreen.classList.add('hidden');
    }

    this.stateMachine.setState(GameStates.MENU);
    this.announcer.announce(`Welcome ${this.playerName}. Match ready. Press Start Match or Spacebar to duel.`);
    if (this.btnPrimary) this.btnPrimary.focus();
  }

  wireLandingAndLeaderboardControls() {
    // Microphone Button Click
    if (this.btnMicName) {
      this.btnMicName.addEventListener('click', () => {
        this.soundEngine.ensureContext();
        if (this.voiceInput.isListening) {
          this.voiceInput.stop();
        } else {
          this.soundEngine.playMicStart();
          this.voiceInput.start();
        }
      });
    }

    // Quick Name Preset Badges
    this.avatarTags.forEach((tagBtn) => {
      tagBtn.addEventListener('click', () => {
        this.soundEngine.ensureContext();
        this.soundEngine.playClick();
        const preset = tagBtn.getAttribute('data-name');
        this.playerName = preset;
        if (this.playerNameInput) this.playerNameInput.value = preset;
        if (this.micFeedbackText) this.micFeedbackText.textContent = `Selected: "${preset}"`;
        this.announcer.announce(`Name set to ${preset}`);
      });
    });

    // Spatial Sound Test (Blind audio calibration + Deaf visual caption check)
    if (this.btnSoundTest) {
      this.btnSoundTest.addEventListener('click', () => {
        this.soundEngine.ensureContext();
        if (this.soundTestCaption) {
          this.soundTestCaption.textContent = 'Testing spatial audio channels...';
          this.soundTestCaption.classList.add('active-test');
        }
        this.announcer.announce('Starting spatial sound test: Left, Center, Right.');

        this.soundEngine.runSoundTest((step) => {
          if (!this.soundTestCaption) return;
          this.soundTestCaption.classList.add('active-test');
          if (step.pan < -0.3) {
            this.soundTestCaption.textContent = '◄ LEFT SPEAKER (440Hz)';
          } else if (step.pan > 0.3) {
            this.soundTestCaption.textContent = '► RIGHT SPEAKER (880Hz)';
          } else {
            this.soundTestCaption.textContent = '◉ CENTER AUDIO (660Hz)';
          }

          setTimeout(() => {
            if (this.soundTestCaption) {
              this.soundTestCaption.classList.remove('active-test');
            }
          }, 380);
        });
      });
    }

    // Difficulty Mode Selection Cards
    const selectDifficultyCard = (mode) => {
      this.selectedDifficulty = mode;
      this.gameEngine.setDifficulty(mode);
      if (this.selectDifficulty) this.selectDifficulty.value = mode;

      [this.btnModeEasy, this.btnModeMedium, this.btnModeTough].forEach((card) => {
        if (!card) return;
        const isSelected = card.getAttribute('data-mode') === mode;
        card.classList.toggle('selected', isSelected);
        card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      });

      const modeName = mode === 'HARD' ? 'Tough' : (mode === 'MEDIUM' ? 'Medium' : 'Easy');
      this.announcer.announce(`Difficulty set to ${modeName}`);
    };

    if (this.btnModeEasy) {
      this.btnModeEasy.addEventListener('click', () => {
        this.soundEngine.ensureContext();
        this.soundEngine.playClick();
        selectDifficultyCard('EASY');
      });
    }

    if (this.btnModeMedium) {
      this.btnModeMedium.addEventListener('click', () => {
        this.soundEngine.ensureContext();
        this.soundEngine.playClick();
        selectDifficultyCard('MEDIUM');
      });
    }

    if (this.btnModeTough) {
      this.btnModeTough.addEventListener('click', () => {
        this.soundEngine.ensureContext();
        this.soundEngine.playClick();
        selectDifficultyCard('HARD');
      });
    }

    // Enter Arena Button
    if (this.btnEnterArena) {
      this.btnEnterArena.addEventListener('click', () => {
        this.enterArena();
      });
    }

    // Open Points Table Modal Buttons
    if (this.btnOpenLeaderboard) {
      this.btnOpenLeaderboard.addEventListener('click', () => this.openLeaderboard());
    }
    if (this.btnNavLeaderboard) {
      this.btnNavLeaderboard.addEventListener('click', () => this.openLeaderboard());
    }

    // Close Points Table Modal Buttons
    if (this.btnCloseLeaderboard) {
      this.btnCloseLeaderboard.addEventListener('click', () => this.closeLeaderboard());
    }
    if (this.btnCloseLeaderboardBottom) {
      this.btnCloseLeaderboardBottom.addEventListener('click', () => this.closeLeaderboard());
    }
    if (this.leaderboardModal) {
      this.leaderboardModal.addEventListener('click', (e) => {
        if (e.target === this.leaderboardModal) {
          this.closeLeaderboard();
        }
      });
    }

    // Filter Buttons in Leaderboard
    this.filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.soundEngine.playClick();
        this.filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentLeaderboardFilter = btn.getAttribute('data-filter') || 'ALL';
        this.renderLeaderboard(this.currentLeaderboardFilter);
      });
    });

    // Clear Leaderboard Records
    if (this.btnClearLeaderboard) {
      this.btnClearLeaderboard.addEventListener('click', () => {
        if (window.confirm('Are you sure you want to clear all player point records?')) {
          this.leaderboard.clearRecords();
          this.renderLeaderboard(this.currentLeaderboardFilter);
          this.announcer.announce('Points records cleared.');
        }
      });
    }
  }

  openLeaderboard() {
    this.soundEngine.ensureContext();
    this.soundEngine.playClick();
    this.renderLeaderboard(this.currentLeaderboardFilter);
    if (this.leaderboardModal) {
      this.leaderboardModal.classList.remove('hidden');
      if (this.btnCloseLeaderboard) this.btnCloseLeaderboard.focus();
    }
    this.announcer.announce('Points table opened.');
  }

  closeLeaderboard() {
    if (this.leaderboardModal) {
      this.leaderboardModal.classList.add('hidden');
    }
    this.announcer.announce('Points table closed.');
    if (this.stateMachine.getState() === GameStates.LANDING) {
      if (this.btnEnterArena) this.btnEnterArena.focus();
    } else {
      if (this.btnPrimary) this.btnPrimary.focus();
    }
  }

  renderLeaderboard(filter = 'ALL') {
    if (!this.leaderboardTbody) return;
    const records = this.leaderboard.getRecords(filter);

    if (records.length === 0) {
      this.leaderboardTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
            No records found. Complete a duel match to score points!
          </td>
        </tr>
      `;
      return;
    }

    this.leaderboardTbody.innerHTML = records.map((rec, index) => {
      let rankClass = 'rank-cell';
      let rankBadge = `#${index + 1}`;
      if (index === 0) { rankClass += ' rank-gold'; rankBadge = '🥇 #1'; }
      else if (index === 1) { rankClass += ' rank-silver'; rankBadge = '🥈 #2'; }
      else if (index === 2) { rankClass += ' rank-bronze'; rankBadge = '🥉 #3'; }

      const diffClass = (rec.difficulty === 'TOUGH' || rec.difficulty === 'HARD') ? 'tag-tough' : (rec.difficulty === 'MEDIUM' ? 'tag-medium' : 'tag-easy');
      const diffLabel = (rec.difficulty === 'HARD') ? 'TOUGH' : rec.difficulty;

      const resultBadge = rec.won
        ? `<span class="win-badge">VICTORY (${rec.playerScore}-${rec.opponentScore})</span>`
        : `<span class="loss-badge">DEFEAT (${rec.playerScore}-${rec.opponentScore})</span>`;

      const speedText = rec.bestReaction ? `${rec.bestReaction} ms` : '—';

      return `
        <tr>
          <td class="${rankClass}">${rankBadge}</td>
          <td class="duelist-name">${this.escapeHtml(rec.name)}</td>
          <td><span class="badge-tag ${diffClass}">${diffLabel}</span></td>
          <td class="points-cell">${rec.points} pts</td>
          <td>${speedText}</td>
          <td>${resultBadge}</td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${rec.date}</td>
        </tr>
      `;
    }).join('');
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  wireUIControls() {
    // Primary Action / Switch Button
    this.btnPrimary.addEventListener('click', () => {
      this.soundEngine.ensureContext();
      if (this.switchController.enabled && this.stateMachine.getState() === GameStates.PLAYING) {
        this.inputManager.emitAction('SWITCH_TRIGGER', { source: 'touch_primary' });
      } else {
        this.handlePrimaryAction();
      }
    });

    // Canvas Arena Click / Tap (allows full-screen single-switch tapping)
    this.canvas.addEventListener('click', () => {
      this.soundEngine.ensureContext();
      if (this.switchController.enabled && this.stateMachine.getState() === GameStates.PLAYING) {
        this.inputManager.emitAction('SWITCH_TRIGGER', { source: 'touch_canvas' });
      }
    });

    // Touch & Mouse Directional Strike Buttons (routed uniformly through InputManager)
    this.btnLeft.addEventListener('click', () => {
      this.soundEngine.ensureContext();
      this.inputManager.emitAction('STRIKE_LEFT', { source: 'touch' });
    });

    this.btnCenter.addEventListener('click', () => {
      this.soundEngine.ensureContext();
      this.inputManager.emitAction('STRIKE_CENTER', { source: 'touch' });
    });

    this.btnRight.addEventListener('click', () => {
      this.soundEngine.ensureContext();
      this.inputManager.emitAction('STRIKE_RIGHT', { source: 'touch' });
    });

    // Header Actions
    this.btnSoundToggle.addEventListener('click', () => this.toggleSound());
    this.btnContrastToggle.addEventListener('click', () => this.toggleContrast());

    // Settings Modal
    this.btnSettings.addEventListener('click', () => this.toggleSettingsModal(true));
    this.btnCloseSettings.addEventListener('click', () => this.toggleSettingsModal(false));
    this.btnSaveSettings.addEventListener('click', () => this.toggleSettingsModal(false));
    this.settingsDrawer.addEventListener('click', (e) => {
      if (e.target === this.settingsDrawer) {
        this.toggleSettingsModal(false);
      }
    });

    // Settings Controls
    this.toggleTts.addEventListener('change', (e) => {
      this.announcer.setEnabled(e.target.checked);
      if (e.target.checked) {
        this.announcer.announce('Voice feedback enabled.');
      }
    });

    this.sliderVolume.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      this.soundEngine.setMasterVolume(val);
      this.announcer.setVolume(val);
    });

    this.sliderSfx.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      this.soundEngine.setSfxVolume(val);
    });

    this.toggleSwitchMode.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      const speed = parseInt(this.sliderScanSpeed.value, 10);
      this.inputManager.setSingleSwitchMode(enabled);
      this.switchController.setEnabled(enabled);
      this.gameEngine.setSingleSwitchMode(enabled, speed);
      this.renderer.updateState({ isSingleSwitchMode: enabled });

      if (enabled) {
        this.announcer.announce('Single-switch mode enabled. Use Spacebar, Enter, or Screen Tap to strike scanned lane.');
        this.updateBanner('Single-Switch Mode Active. Space / Tap strikes highlighted lane.', 'active-cue-center');
      } else {
        this.announcer.announce('Standard directional controls restored.');
      }
    });

    this.sliderScanSpeed.addEventListener('input', (e) => {
      const ms = parseInt(e.target.value, 10);
      this.scanSpeedLabel.textContent = `${ms} ms`;
      this.switchController.setScanSpeed(ms);
      this.gameEngine.switchScanInterval = ms;
    });

    this.toggleHighContrast.addEventListener('change', (e) => {
      this.setContrastMode(e.target.checked);
    });

    this.toggleReduceMotion.addEventListener('change', (e) => {
      const reduce = e.target.checked;
      this.renderer.setReduceMotion(reduce);
      this.vfxManager.setReduceMotion(reduce);
    });

    this.selectDifficulty.addEventListener('change', (e) => {
      const level = e.target.value;
      this.selectedDifficulty = level;
      this.gameEngine.setDifficulty(level);

      [this.btnModeEasy, this.btnModeMedium, this.btnModeTough].forEach((card) => {
        if (!card) return;
        const isMatch = card.getAttribute('data-mode') === level;
        card.classList.toggle('selected', isMatch);
        card.setAttribute('aria-checked', isMatch ? 'true' : 'false');
      });

      this.announcer.announce(`Difficulty set to ${Difficulties[level].name}`);
    });

    this.selectMatchLength.addEventListener('change', (e) => {
      const rounds = parseInt(e.target.value, 10);
      this.gameEngine.roundsToWin = rounds;
      this.renderer.updateState({ roundsToWin: rounds });
      this.targetText.textContent = `FIRST TO ${rounds}`;
      this.announcer.announce(`Match length set to first to ${rounds} points.`);
    });
  }

  toggleSound() {
    const isMuted = this.soundEngine.toggleMute();
    if (isMuted) {
      this.soundIconText.textContent = '🔇 Sound: MUTED';
      this.btnSoundToggle.setAttribute('aria-label', 'Unmute Sound');
      this.announcer.announce('Audio muted.');
    } else {
      this.soundIconText.textContent = '🔊 Sound: ON';
      this.btnSoundToggle.setAttribute('aria-label', 'Mute Sound');
      this.announcer.announce('Audio unmuted.');
    }
  }

  toggleContrast() {
    const isHigh = !document.body.classList.contains('high-contrast');
    this.setContrastMode(isHigh);
  }

  setContrastMode(isHigh) {
    if (isHigh) {
      document.body.classList.add('high-contrast');
      this.contrastIconText.textContent = '👁 Contrast: HIGH';
      this.toggleHighContrast.checked = true;
      this.renderer.setHighContrast(true);
      this.announcer.announce('High contrast mode enabled.');
    } else {
      document.body.classList.remove('high-contrast');
      this.contrastIconText.textContent = '👁 Contrast: NORMAL';
      this.toggleHighContrast.checked = false;
      this.renderer.setHighContrast(false);
      this.announcer.announce('High contrast mode disabled.');
    }
  }

  toggleSettingsModal(open) {
    const shouldOpen = open !== undefined ? open : this.settingsDrawer.classList.contains('hidden');
    if (shouldOpen) {
      this.settingsDrawer.classList.remove('hidden');
      this.btnSettings.setAttribute('aria-expanded', 'true');
      this.btnCloseSettings.focus();
      this.announcer.announce('Settings opened.');
    } else {
      this.settingsDrawer.classList.add('hidden');
      this.btnSettings.setAttribute('aria-expanded', 'false');
      this.btnPrimary.focus();
      this.announcer.announce('Settings closed.');
    }
  }

  updateBanner(message, modifierClass = '') {
    if (!this.cueText || !this.cueBanner) return;
    this.cueText.innerHTML = `<span class="cue-icon">⚡</span> <span class="cue-message">${message}</span>`;
    this.cueBanner.className = `sensory-cue-banner ${modifierClass}`;
  }

  updateHUD() {
    if (this.scorePlayer) this.scorePlayer.textContent = this.gameEngine.playerScore;
    if (this.scoreOpponent) this.scoreOpponent.textContent = this.gameEngine.opponentScore;
    if (this.roundText) this.roundText.textContent = `ROUND ${this.gameEngine.currentRound}`;
    if (this.targetText) this.targetText.textContent = `FIRST TO ${this.gameEngine.roundsToWin}`;
  }

  updateSwitchVisualHighlight(dir) {
    [this.btnLeft, this.btnCenter, this.btnRight].forEach(b => b.classList.remove('active-key'));
    if (dir === SignalDirections.LEFT) this.btnLeft.classList.add('active-key');
    if (dir === SignalDirections.CENTER) this.btnCenter.classList.add('active-key');
    if (dir === SignalDirections.RIGHT) this.btnRight.classList.add('active-key');
  }

  highlightButton(btn) {
    if (!btn) return;
    btn.classList.add('active-key');
    setTimeout(() => {
      btn.classList.remove('active-key');
    }, 120);
  }

  startLoop() {
    const loop = () => {
      if (this.vfxManager) {
        this.vfxManager.update();
      }
      if (this.renderer) {
        this.renderer.render();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Bootstrap once DOM is parsed
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.echoDuelApp = new EchoDuelApp();
  });
}
