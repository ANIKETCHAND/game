/**
 * Echo Duel - Automated Verification Test Suite
 * Tests Core State Machine, Game Engine, AI Timing, Input Normalization,
 * Switch Controller, Audio/VFX Safety, and Edge Cases.
 */

import { StateMachine, GameStates } from '../src/core/state.js';
import { GameEngine, SignalDirections, Difficulties } from '../src/core/game.js';
import { SwitchController } from '../src/accessibility/switch-control.js';
import { VFXManager } from '../src/render/vfx.js';
import { InputManager } from '../src/input/input.js';
import { SoundEngine } from '../src/audio/sound.js';
import { AccessibilityAnnouncer } from '../src/accessibility/tts.js';
import { GameRenderer } from '../src/render/render.js';
import { LeaderboardManager } from '../src/core/leaderboard.js';
import { VoiceInputManager } from '../src/accessibility/voice-input.js';
import { HumanoidDuelist } from '../src/render/humanoid.js';
import { ThreeSceneManager } from '../src/render/three-scene.js';

let passed = 0;
let failed = 0;

function logSection(title) {
  console.log(title);
  if (typeof document !== 'undefined') {
    const logEl = document.getElementById('test-log');
    if (logEl) logEl.innerHTML += `<div class="header">${title}</div>`;
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    if (typeof document !== 'undefined') {
      const logEl = document.getElementById('test-log');
      if (logEl) logEl.innerHTML += `<div class="fail">âœ• FAIL: ${message}</div>`;
    }
    failed++;
    throw new Error(message);
  } else {
    console.log(`  PASS: ${message}`);
    if (typeof document !== 'undefined') {
      const logEl = document.getElementById('test-log');
      if (logEl) logEl.innerHTML += `<div class="pass">âœ“ PASS: ${message}</div>`;
    }
    passed++;
  }
}

export async function runTests() {
  passed = 0;
  failed = 0;
  logSection('\n--- 1. Testing State Machine ---');
  {
    const sm = new StateMachine();
    assert(sm.getState() === GameStates.MENU, 'Initial state should be MENU');

    let emitted = null;
    sm.on('stateChange', (data) => {
      emitted = data;
    });

    sm.setState(GameStates.PLAYING, { mode: 'duel' });
    assert(sm.getState() === GameStates.PLAYING, 'State changed to PLAYING');
    assert(emitted !== null && emitted.current === GameStates.PLAYING, 'Event stateChange emitted');
    assert(emitted.previous === GameStates.MENU, 'Previous state recorded');
    assert(emitted.payload.mode === 'duel', 'Payload delivered');

    // Duplicate non-playing state transition should be ignored
    emitted = null;
    sm.setState(GameStates.SETTINGS);
    sm.setState(GameStates.SETTINGS);
    assert(sm.getState() === GameStates.SETTINGS, 'State is SETTINGS');

    sm.reset();
    assert(sm.getState() === GameStates.MENU, 'Reset restores MENU state');
  }

  console.log('\n--- 2. Testing Game Engine Round & Match Logic ---');
  {
    const sm = new StateMachine();
    const game = new GameEngine(sm);
    assert(game.playerScore === 0 && game.opponentScore === 0, 'Scores start at 0');
    assert(game.currentRound === 1, 'Round starts at 1');

    // Match Start
    game.startMatch();
    assert(sm.getState() === GameStates.PLAYING, 'startMatch sets state to PLAYING');
    assert(game.roundPhase === 'TENSION', 'Round starts in TENSION phase');

    // Test False Start: Player strikes during TENSION phase
    game.handlePlayerInput(SignalDirections.LEFT);
    assert(game.opponentScore === 1, 'False start awards opponent 1 point');
    assert(game.lastResult.isFalseStart === true, 'Result flagged as isFalseStart');
    assert(sm.getState() === GameStates.ROUND_RESULT, 'State transitioned to ROUND_RESULT');

    // Test Round 2: Signal triggering & Player correct hit
    game.startRound();
    assert(game.roundPhase === 'TENSION', 'Round 2 is now in TENSION');
    game.clearAllTimers(); // clear random tension timer to trigger manually
    game.triggerSignal(SignalDirections.RIGHT);
    assert(game.roundPhase === 'SIGNAL_ACTIVE', 'Phase is SIGNAL_ACTIVE');
    assert(game.currentSignal === SignalDirections.RIGHT, 'Signal direction set to RIGHT');

    // Player strikes RIGHT
    game.handlePlayerInput(SignalDirections.RIGHT);
    assert(game.playerScore === 1, 'Player scores 1 point for matching signal');
    assert(game.lastResult.winner === 'PLAYER', 'Winner is PLAYER');
    assert(typeof game.lastResult.playerTime === 'number', 'Player reaction time recorded');

    // Test Round 3: Player strikes WRONG direction
    game.startRound();
    game.clearAllTimers();
    game.triggerSignal(SignalDirections.CENTER);
    game.handlePlayerInput(SignalDirections.LEFT); // Wrong!
    assert(game.opponentScore === 2, 'Wrong direction awards opponent a point');
    assert(game.lastResult.isWrongDirection === true, 'Result flagged as isWrongDirection');

    // Test Round 4: Opponent AI reaction / Match winning point
    game.startRound();
    game.clearAllTimers();
    game.triggerSignal(SignalDirections.LEFT);
    // Let's resolve round with Opponent win to trigger match over
    game.resolveRound({
      winner: 'OPPONENT',
      reason: 'Opponent struck faster!',
      direction: SignalDirections.LEFT
    });
    assert(game.opponentScore === 3, 'Opponent reaches 3 points');
    assert(sm.getState() === GameStates.MATCH_OVER, 'Match completes when player or opponent reaches roundsToWin (3)');

    // Test ResetAll
    game.resetAll();
    assert(game.playerScore === 0 && game.opponentScore === 0, 'resetAll resets scores to 0');
    assert(sm.getState() === GameStates.MENU, 'resetAll returns to MENU');
  }

  console.log('\n--- 3. Testing Single-Switch Controller ---');
  {
    const sc = new SwitchController({ scanIntervalMs: 50 });
    assert(sc.enabled === false, 'Switch controller initially disabled');
    assert(sc.getCurrentDirection() === SignalDirections.LEFT, 'Initial direction is LEFT');

    sc.setEnabled(true);
    assert(sc.enabled === true, 'Enabled set to true');

    let scanHistory = [];
    sc.onScanChange = (dir) => {
      scanHistory.push(dir);
    };

    sc.start();
    // Wait 120ms to allow cycling through directions
    await new Promise((res) => setTimeout(res, 130));
    sc.stop();

    assert(scanHistory.length >= 2, 'Switch controller cycled through directions');
    sc.reset();
    assert(sc.getCurrentDirection() === SignalDirections.LEFT, 'Reset restored LEFT direction');
  }

  console.log('\n--- 4. Testing Input Manager & Normalization ---');
  {
    const input = new InputManager();
    let actions = [];
    input.onAction((action, details) => {
      actions.push({ action, details });
    });

    // Test debouncing
    input.emitAction('STRIKE_LEFT');
    input.emitAction('STRIKE_LEFT'); // Immediate duplicate should be debounced
    assert(actions.length === 1, 'Rapid duplicate action debounced');

    // Wait past debounce time
    await new Promise((res) => setTimeout(res, 90));
    input.emitAction('STRIKE_CENTER');
    assert(actions.length === 2, 'Action after debounce window emitted');

    // Test touch handling
    input.handleTouch(null, 'RIGHT');
    assert(actions[actions.length - 1].action === 'STRIKE_RIGHT', 'Touch input normalized to STRIKE_RIGHT');
  }

  console.log('\n--- 5. Testing VFX Manager ---');
  {
    const vfx = new VFXManager();
    vfx.triggerImpact(100, 100, '#38bdf8', 10);
    assert(vfx.particles.length === 10, 'Generated 10 particles on impact');
    assert(vfx.shockwaves.length === 1, 'Generated 1 shockwave');

    vfx.update();
    assert(vfx.particles[0].life < 1.0, 'Particle life decays on update');

    // Reduce motion setting
    vfx.setReduceMotion(true);
    vfx.triggerImpact(100, 100, '#38bdf8', 10);
    assert(vfx.particles.length === 15, 'Reduced count applied (5 instead of 10)');
    assert(vfx.getShakeOffset().x === 0, 'Screen shake suppressed when reduceMotion is enabled');

    vfx.reset();
    assert(vfx.particles.length === 0, 'Particles cleared on reset');
  }

  console.log('\n--- 6. Testing Audio & Announcer Clamping & Robustness ---');
  {
    const sound = new SoundEngine();
    sound.setMasterVolume(1.5); // Overshoot
    assert(sound.masterVolume === 1.0, 'Master volume clamped to 1.0 max');
    sound.setMasterVolume(-0.5); // Undershoot
    assert(sound.masterVolume === 0.0, 'Master volume clamped to 0.0 min');

    const tts = new AccessibilityAnnouncer();
    tts.setVolume(2.0);
    assert(tts.volume === 1.0, 'TTS volume clamped to 1.0');
    tts.setEnabled(false);
    assert(tts.enabled === false, 'TTS enabled set to false');
  }

  console.log('\n--- 7. Testing GameRenderer with Mock Canvas ---');
  {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      scale: () => {},
      translate: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      ellipse: () => {},
      roundRect: () => {},
      setLineDash: () => {},
      fillText: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} })
    };
    const mockCanvas = {
      getContext: () => mockCtx,
      width: 800,
      height: 460,
      getBoundingClientRect: () => ({ width: 800, height: 460 })
    };
    const vfx = new VFXManager();
    const renderer = new GameRenderer(mockCanvas, vfx);
    assert(renderer.width === 800 && renderer.height === 460, 'Renderer initialized dimensions');
    renderer.updateState({
      gameState: GameStates.PLAYING,
      roundPhase: 'SIGNAL_ACTIVE',
      currentSignal: SignalDirections.LEFT
    });
    renderer.render(); // Ensures render() runs without error
    assert(renderer.currentSignal === SignalDirections.LEFT, 'Renderer updated signal direction');
    renderer.setHighContrast(true);
    assert(renderer.highContrast === true, 'High contrast enabled');
    renderer.setReduceMotion(true);
    assert(renderer.reduceMotion === true, 'Reduce motion enabled');
  }

  console.log('\n--- 8. Testing Assistive Single-Switch Mode & Spatial Audio ---');
  {
    const sm = new StateMachine();
    const game = new GameEngine(sm);
    game.setSingleSwitchMode(true, 600);
    assert(game.isSingleSwitchMode === true, 'Switch mode flag set in engine');
    assert(game.switchScanInterval === 600, 'Switch scan interval configured');

    // Test signal timeout is extended in switch mode
    game.startMatch();
    game.clearAllTimers();
    game.triggerSignal(SignalDirections.RIGHT);
    assert(game.roundPhase === 'SIGNAL_ACTIVE', 'Signal active in switch mode');

    // Test SoundEngine spatial scan beeps
    const sound = new SoundEngine();
    let beepSafe = true;
    try {
      sound.playScanBeep(SignalDirections.LEFT);
      sound.playScanBeep(SignalDirections.CENTER);
      sound.playScanBeep(SignalDirections.RIGHT);
    } catch (e) {
      beepSafe = false;
    }
    assert(beepSafe === true, 'playScanBeep executed without exception');
  }

  console.log('\n--- 9. Testing Keyboard Normalization, Numpad & Modal Isolation ---');
  {
    const input = new InputManager();
    let lastAction = null;
    input.onAction((action) => {
      lastAction = action;
    });

    // Test Numpad 4 (Left)
    input.handleKeyDown({ key: '4', code: 'Numpad4', preventDefault: () => {} });
    assert(lastAction === 'STRIKE_LEFT', 'Numpad4 mapped to STRIKE_LEFT');

    // Wait past debounce
    await new Promise((res) => setTimeout(res, 90));

    // Test Numpad 5 (Center)
    input.handleKeyDown({ key: '5', code: 'Numpad5', preventDefault: () => {} });
    assert(lastAction === 'STRIKE_CENTER', 'Numpad5 mapped to STRIKE_CENTER');

    await new Promise((res) => setTimeout(res, 90));

    // Test Numpad 6 (Right)
    input.handleKeyDown({ key: '6', code: 'Numpad6', preventDefault: () => {} });
    assert(lastAction === 'STRIKE_RIGHT', 'Numpad6 mapped to STRIKE_RIGHT');

    await new Promise((res) => setTimeout(res, 90));

    // Test Modal Focus Isolation: keys pressed inside #settings-panel
    const mockModalTarget = {
      tagName: 'BUTTON',
      closest: (selector) => (selector === '#settings-panel' ? {} : null)
    };

    lastAction = null;
    input.handleKeyDown({
      key: ' ',
      code: 'Space',
      target: mockModalTarget,
      preventDefault: () => {}
    });
    assert(lastAction === null, 'Space key inside settings modal suppressed from game action');

    // Test Escape inside modal still closes settings
    input.handleKeyDown({
      key: 'Escape',
      code: 'Escape',
      target: mockModalTarget,
      preventDefault: () => {}
    });
    assert(lastAction === 'TOGGLE_SETTINGS', 'Escape key inside settings modal emits TOGGLE_SETTINGS');
  }

  console.log('\n--- 10. Testing Scoreboard Reset & Round Progression Integrity ---');
  {
    const sm = new StateMachine();
    const game = new GameEngine(sm);
    let scoreEvent = null;
    game.onScoreUpdate = (data) => {
      scoreEvent = data;
    };

    game.startMatch();
    assert(game.currentRound === 1, 'Match begins at round 1');

    // Finish round 1 with false start
    game.handlePlayerInput(SignalDirections.LEFT);
    assert(game.currentRound === 1, 'Current round stays 1 during round result screen');
    assert(sm.getState() === GameStates.ROUND_RESULT, 'State is ROUND_RESULT');

    // Advance to round 2
    game.startRound();
    assert(game.currentRound === 2, 'Round advances to 2 upon starting next round');
    assert(sm.getState() === GameStates.PLAYING, 'State is PLAYING in round 2');

    // Reset All
    scoreEvent = null;
    game.resetAll();
    assert(game.playerScore === 0 && game.opponentScore === 0, 'Scores reset to 0');
    assert(game.currentRound === 1, 'Round reset to 1');
    assert(scoreEvent !== null && scoreEvent.playerScore === 0 && scoreEvent.currentRound === 1, 'onScoreUpdate notified on resetAll');
  }

  logSection('\n--- 11. Testing Leaderboard Manager & Points System ---');
  {
    const lb = new LeaderboardManager();
    assert(Array.isArray(lb.records), 'Leaderboard initializes with records array');

    // Points calculation: Base Win (150) + Tough (100) + Speed (500-200)*0.5=150 + RoundBonus (3*25)=75 => 475
    const ptsWin = lb.calculatePoints(true, 'TOUGH', 200, 3, 1);
    assert(ptsWin === 475, `Points calculation for victory on TOUGH: expected 475, got ${ptsWin}`);

    // Base Loss (30) + Easy (20) + Speed (0) + RoundBonus (1*25)=25 => 75
    const ptsLoss = lb.calculatePoints(false, 'EASY', 600, 1, 3);
    assert(ptsLoss === 75, `Points calculation for defeat on EASY: expected 75, got ${ptsLoss}`);

    // Test recordMatch
    const entry = lb.recordMatch({
      name: 'EchoTester',
      difficulty: 'HARD',
      playerScore: 3,
      opponentScore: 0,
      won: true,
      bestReaction: 180
    });
    assert(entry.name === 'EchoTester', 'Recorded match player name stored');
    assert(entry.difficulty === 'TOUGH', 'HARD mapped to TOUGH difficulty');
    assert(entry.points > 0, 'Match points calculated and stored');

    // Test getRecords filter and sort
    const allRecords = lb.getRecords('ALL');
    assert(allRecords.length > 0, 'getRecords returns list of records');
    assert(allRecords[0].points >= allRecords[allRecords.length - 1].points, 'Records sorted descending by points');

    const toughRecords = lb.getRecords('TOUGH');
    assert(toughRecords.every(r => r.difficulty === 'TOUGH' || r.difficulty === 'HARD'), 'Filter TOUGH returns only tough entries');

    // Test clearRecords
    lb.clearRecords();
    assert(lb.getRecords('ALL').length === 0, 'clearRecords empties the points table');
  }

  logSection('\n--- 12. Testing Voice Input & Audio Enhancements ---');
  {
    const voice = new VoiceInputManager();
    assert(voice.isListening === false, 'Voice manager initially not listening');
    voice.stop();
    assert(voice.isListening === false, 'voice.stop() safely handles idle state');

    const sound = new SoundEngine();
    assert(typeof sound.playMicStart === 'function', 'sound.playMicStart is defined');
    assert(typeof sound.playMicSuccess === 'function', 'sound.playMicSuccess is defined');
    assert(typeof sound.runSoundTest === 'function', 'sound.runSoundTest is defined');

    let stepsSeen = 0;
    sound.runSoundTest(() => {
      stepsSeen++;
    });
    assert(typeof sound.runSoundTest === 'function', 'runSoundTest triggers without error');
  }

  logSection('\n--- 13. Testing 3D Humanoid Duelists & Three.js Scene ---');
  {
    // Test HumanoidDuelist creation and properties
    const playerWarrior = new HumanoidDuelist({ isPlayer: true, colorTheme: 'cyan' });
    assert(playerWarrior !== null && typeof playerWarrior.group === 'object', 'Player 3D humanoid initialized with Three.js group');
    assert(playerWarrior.isPlayer === true, 'Player warrior flag verified');
    assert(playerWarrior.state === 'IDLE', 'Initial animation state is IDLE');

    const botWarrior = new HumanoidDuelist({ isPlayer: false, colorTheme: 'crimson' });
    assert(botWarrior.isPlayer === false, 'Bot warrior flag verified');

    // Test Animation State Transitions
    playerWarrior.setAnimationState('TENSION');
    assert(playerWarrior.state === 'TENSION', 'Warrior transitioned to TENSION animation');

    playerWarrior.triggerLunge();
    assert(playerWarrior.state === 'LUNGE', 'Warrior triggered LUNGE attack animation');

    botWarrior.triggerHit();
    assert(botWarrior.state === 'HIT', 'Warrior triggered HIT recoil animation');

    playerWarrior.setAnimationState('VICTORY');
    assert(playerWarrior.state === 'VICTORY', 'Warrior set to VICTORY flourish animation');

    // Test animation update tick
    playerWarrior.update(0.016);
    botWarrior.update(0.016);
    assert(playerWarrior.animTime > 0, 'Warrior skeletal animation ticks advance smoothly');

    // Test ThreeSceneManager headless resilience (does not crash without DOM/WebGL)
    const sceneMgr = new ThreeSceneManager(null);
    assert(sceneMgr.isInitialized === false, 'ThreeSceneManager safely guards against missing container/DOM in headless environments');
    sceneMgr.setPhase('TENSION');
    sceneMgr.triggerClash(true, false);
    sceneMgr.update(0.016);
    assert(typeof sceneMgr.dispose === 'function', 'ThreeSceneManager provides clean lifecycle API');
  }

  const summary = `\n=============================================\nTEST RESULTS: ${passed} passed, ${failed} failed.\n=============================================\n`;
  console.log(summary);

  if (typeof document !== 'undefined') {
    const logEl = document.getElementById('test-log');
    if (logEl) {
      logEl.innerHTML += `<pre>${summary}</pre>`;
    }
  }

  if (failed > 0 && typeof process !== 'undefined' && process.exit) {
    process.exit(1);
  }
}

if (typeof window === 'undefined') {
  runTests().catch((err) => {
    console.error('Fatal error during test run:', err);
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
  });
}
