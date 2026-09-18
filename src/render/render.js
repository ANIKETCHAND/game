/**
 * Echo Duel - High-Contrast Accessible Canvas Renderer
 * Renders duelist avatars, directional telegraphs with distinct shapes & text (for deaf players),
 * tension pulse rings, single-switch scan outlines, and particle VFX.
 */

import { SignalDirections } from '../core/game.js';
import { ThreeSceneManager } from './three-scene.js';

// Safe roundRect polyfill for older browsers or headless environments
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r = 0) {
    const radius = typeof r === 'number' ? r : (r.tl || 0);
    this.moveTo(x + radius, y);
    this.lineTo(x + w - radius, y);
    this.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.lineTo(x + w, y + h - radius);
    this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.lineTo(x + radius, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    return this;
  };
}

export class GameRenderer {
  constructor(canvas, vfxManager) {
    this.canvas = canvas;
    this.ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    this.vfx = vfxManager;

    this.width = canvas ? canvas.width : 800;
    this.height = canvas ? canvas.height : 460;
    this.dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    // Visual theme options
    this.highContrast = false;
    this.reduceMotion = false;

    // Render state references
    this.gameState = 'MENU';
    this.roundPhase = 'IDLE';
    this.currentSignal = null;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.currentRound = 1;
    this.roundsToWin = 3;
    this.lastResult = null;
    this.reactionTime = null;
    this.scannedDirection = null;
    this.isSingleSwitchMode = false;
    this.playerName = 'Duelist';

    // Animation tickers
    this.pulseTick = 0;
    this.idleTick = 0;

    // 2D Jack-Jack Fallback Images
    this.jackPlayerImg = null;
    this.jackRivalImg = null;
    if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
      this.jackPlayerImg = new Image();
      this.jackPlayerImg.src = 'assets/jack_player.png';
      this.jackRivalImg = new Image();
      this.jackRivalImg.src = 'assets/jack_rival.png';
    }

    // 3D Three.js Scene Subsystem
    this.threeScene = null;
    this.is3D = false;

    if (typeof window !== 'undefined' && canvas && canvas.parentElement) {
      try {
        this.threeScene = new ThreeSceneManager(canvas.parentElement, {
          highContrast: this.highContrast,
          reduceMotion: this.reduceMotion
        });
        if (this.threeScene && this.threeScene.isSupported) {
          this.is3D = true;
        }
      } catch (err) {
        console.warn('ThreeSceneManager initialization fallback to 2D:', err);
      }
    }

    this.handleResize();
  }

  setHighContrast(enabled) {
    this.highContrast = !!enabled;
    if (this.threeScene && this.is3D) {
      this.threeScene.setHighContrast(this.highContrast);
    }
  }

  setReduceMotion(enabled) {
    this.reduceMotion = !!enabled;
    if (this.vfx) {
      this.vfx.setReduceMotion(enabled);
    }
    if (this.threeScene && this.is3D) {
      this.threeScene.setReduceMotion(this.reduceMotion);
    }
  }

  handleResize() {
    if (this.threeScene && this.is3D) {
      this.threeScene.handleResize();
      this.width = this.threeScene.width;
      this.height = this.threeScene.height;
    }
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    const displayWidth = Math.max(320, rect.width || 800);
    const displayHeight = Math.max(280, rect.height || 480);

    this.canvas.width = Math.floor(displayWidth * this.dpr);
    this.canvas.height = Math.floor(displayHeight * this.dpr);

    if (!this.is3D) {
      this.width = displayWidth;
      this.height = displayHeight;
    }
  }

  updateState(stateData) {
    if (stateData.gameState !== undefined) this.gameState = stateData.gameState;
    if (stateData.roundPhase !== undefined) this.roundPhase = stateData.roundPhase;
    if (stateData.currentSignal !== undefined) this.currentSignal = stateData.currentSignal;
    if (stateData.playerScore !== undefined) this.playerScore = stateData.playerScore;
    if (stateData.opponentScore !== undefined) this.opponentScore = stateData.opponentScore;
    if (stateData.currentRound !== undefined) this.currentRound = stateData.currentRound;
    if (stateData.roundsToWin !== undefined) this.roundsToWin = stateData.roundsToWin;
    if (stateData.lastResult !== undefined) this.lastResult = stateData.lastResult;
    if (stateData.scannedDirection !== undefined) this.scannedDirection = stateData.scannedDirection;
    if (stateData.isSingleSwitchMode !== undefined) this.isSingleSwitchMode = stateData.isSingleSwitchMode;
    if (stateData.playerName !== undefined) this.playerName = stateData.playerName;

    if (this.threeScene && this.is3D) {
      this.threeScene.updateState(stateData);
    }
  }

  triggerClash(winner, isFalseStart = false) {
    if (this.threeScene && this.is3D) {
      this.threeScene.triggerClashVisuals(winner, isFalseStart);
    }
  }

  triggerMatchOver(winner) {
    if (this.threeScene && this.is3D) {
      this.threeScene.triggerMatchOverVisuals(winner);
    }
  }

  render() {
    if (this.is3D && this.threeScene) {
      this.threeScene.render();
      return;
    }

    const { ctx, width, height, dpr } = this;
    if (!ctx) return;

    this.idleTick += 0.03;
    if (this.roundPhase === 'TENSION') {
      this.pulseTick += 0.08;
    }

    // Always clear the raw physical canvas before transforms to prevent ghosting
    if (this.canvas.width > 0 && this.canvas.height > 0) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Apply screen shake offset from VFX
    const shake = this.vfx ? this.vfx.getShakeOffset() : { x: 0, y: 0 };
    ctx.translate(shake.x, shake.y);

    // 1. Clear background (with safety overscan margin for screen shake)
    this.drawBackground(ctx, width, height);

    // 2. Arena Lane & Grid
    this.drawArenaGrid(ctx, width, height);

    // 3. Duelist Characters
    this.drawDuelists(ctx, width, height);

    // 4. Directional Telegraph Targets (Left, Center, Right)
    this.drawTelegraphLanes(ctx, width, height);

    // 5. Tension / Active Signal Cue overlay
    if (this.roundPhase === 'TENSION') {
      this.drawTensionIndicator(ctx, width, height);
    } else if (this.roundPhase === 'SIGNAL_ACTIVE') {
      this.drawActiveSignalBanner(ctx, width, height);
    }

    // 6. Round Result or Match Over Banner overlay
    if (this.gameState === 'ROUND_RESULT' || this.roundPhase === 'RESOLVED') {
      this.drawRoundResultOverlay(ctx, width, height);
    } else if (this.gameState === 'MATCH_OVER') {
      this.drawMatchOverOverlay(ctx, width, height);
    }

    // 7. Render particles and shockwaves
    if (this.vfx) {
      this.vfx.render(ctx);
    }

    ctx.restore();
  }

  drawBackground(ctx, width, height) {
    const pad = 24; // overscan to prevent edge flicker during screen shake
    if (this.highContrast) {
      ctx.fillStyle = '#05070d';
      ctx.fillRect(-pad, -pad, width + pad * 2, height + pad * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, width - 4, height - 4);
      return;
    }

    // Subtle rich dark cyber-arena gradient
    const grad = ctx.createLinearGradient(0, -pad, 0, height + pad);
    grad.addColorStop(0, '#0c1322');
    grad.addColorStop(0.5, '#131f38');
    grad.addColorStop(1, '#090e18');
    ctx.fillStyle = grad;
    ctx.fillRect(-pad, -pad, width + pad * 2, height + pad * 2);
  }

  drawArenaGrid(ctx, width, height) {
    const centerY = height * 0.52;
    ctx.save();
    ctx.strokeStyle = this.highContrast ? 'rgba(255, 255, 255, 0.25)' : 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1.5;

    // Duel Horizon Line
    ctx.beginPath();
    ctx.moveTo(30, centerY);
    ctx.lineTo(width - 30, centerY);
    ctx.stroke();

    // Center divider
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(width / 2, centerY - 80);
    ctx.lineTo(width / 2, centerY + 80);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawDuelists(ctx, width, height) {
    let playerX = width * 0.22;
    let opponentX = width * 0.78;
    const baseLineY = height * 0.58;

    const bobOffset = this.reduceMotion ? 0 : Math.sin(this.idleTick) * 3;

    // Combat lunges & slashes when round is resolved
    const isResolved = this.roundPhase === 'RESOLVED' || this.gameState === 'ROUND_RESULT';
    let playerLunging = false;
    let opponentLunging = false;

    if (isResolved && this.lastResult) {
      if (this.lastResult.winner === 'PLAYER') {
        playerX += 20;
        playerLunging = true;
      } else if (this.lastResult.winner === 'OPPONENT') {
        opponentX -= 20;
        opponentLunging = true;
      }
    }

    // Player Avatar (Left)
    this.drawAvatar(ctx, playerX, baseLineY + bobOffset, {
      name: this.playerName ? `${this.playerName.toUpperCase()} (YOU)` : 'YOU (PLAYER)',
      color: '#38bdf8',
      score: this.playerScore,
      isPlayer: true,
      isWinner: playerLunging,
      isFalseStart: isResolved && this.lastResult && this.lastResult.isFalseStart
    });

    // Opponent Avatar (Right)
    this.drawAvatar(ctx, opponentX, baseLineY - bobOffset, {
      name: 'RIVAL (AI)',
      color: '#f43f5e',
      score: this.opponentScore,
      isPlayer: false,
      isWinner: opponentLunging
    });

    // Draw duel strike slash beam if a combatant scored a direct hit
    if (isResolved && this.lastResult && (playerLunging || opponentLunging)) {
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = playerLunging ? (this.highContrast ? '#ffffff' : '#38bdf8') : (this.highContrast ? '#ff1744' : '#fb7185');
      ctx.beginPath();
      if (playerLunging) {
        ctx.moveTo(playerX + 24, baseLineY - 10);
        ctx.lineTo(opponentX - 10, baseLineY - 10);
      } else {
        ctx.moveTo(opponentX - 24, baseLineY - 10);
        ctx.lineTo(playerX + 10, baseLineY - 10);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  drawAvatar(ctx, x, y, options) {
    const { name, color, score, isPlayer } = options;

    ctx.save();
    // Shadow base
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 26, 28, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = this.highContrast ? '#ffffff' : color;
    ctx.beginPath();
    ctx.arc(x, y - 10, 22, 0, Math.PI * 2);
    ctx.fill();

    // Visor / Eyes
    ctx.fillStyle = '#05070d';
    ctx.beginPath();
    if (isPlayer) {
      // Facing right
      ctx.roundRect(x - 4, y - 16, 20, 10, 4);
    } else {
      // Facing left
      ctx.roundRect(x - 16, y - 16, 20, 10, 4);
    }
    ctx.fill();

    // Visor glow
    ctx.fillStyle = isPlayer ? '#38bdf8' : '#fb7185';
    ctx.beginPath();
    ctx.arc(isPlayer ? x + 6 : x - 6, y - 11, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Jack-Jack 2D Image Overlay (if loaded)
    const img = isPlayer ? this.jackPlayerImg : this.jackRivalImg;
    if (img && img.complete && img.naturalWidth > 0) {
      const imgW = 76;
      const imgH = 88;
      ctx.drawImage(img, x - imgW / 2, y - 56, imgW, imgH);

      // Laser Eyes during Tension or Strike!
      if (this.roundPhase === 'TENSION' || options.isWinner) {
        ctx.save();
        ctx.strokeStyle = isPlayer ? '#00e5ff' : '#ff1744';
        ctx.lineWidth = options.isWinner ? 4 : 2;
        ctx.shadowColor = isPlayer ? '#00e5ff' : '#ff1744';
        ctx.shadowBlur = 10;
        const eyeY = y - 38;
        const targetX = x + (isPlayer ? 50 : -50);
        ctx.beginPath();
        ctx.moveTo(x - 5, eyeY);
        ctx.lineTo(options.isWinner ? (isPlayer ? x + 80 : x - 80) : targetX, eyeY);
        ctx.moveTo(x + 5, eyeY);
        ctx.lineTo(options.isWinner ? (isPlayer ? x + 80 : x - 80) : targetX, eyeY);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Name label
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y - 40);

    // Score pips
    const pipCount = this.roundsToWin;
    const startX = x - ((pipCount - 1) * 14) / 2;
    for (let i = 0; i < pipCount; i++) {
      const pipX = startX + i * 14;
      const pipY = y + 42;
      ctx.beginPath();
      ctx.arc(pipX, pipY, 5, 0, Math.PI * 2);
      if (i < score) {
        ctx.fillStyle = '#22c55e'; // scored round
      } else {
        ctx.fillStyle = '#334155'; // empty round
      }
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw the 3 directional telegraph stations with high-contrast shapes, icons & keys
   */
  drawTelegraphLanes(ctx, width, height) {
    const laneY = height * 0.82;
    const lanes = [
      {
        dir: SignalDirections.LEFT,
        x: width * 0.22,
        label: 'LEFT',
        key: 'A / ◄',
        shape: '◄ TRIANGLE',
        color: '#38bdf8'
      },
      {
        dir: SignalDirections.CENTER,
        x: width * 0.50,
        label: 'CENTER',
        key: 'W / ▲',
        shape: '◉ BULLSEYE',
        color: '#fbbf24'
      },
      {
        dir: SignalDirections.RIGHT,
        x: width * 0.78,
        label: 'RIGHT',
        key: 'D / ►',
        shape: '► TRIANGLE',
        color: '#ec4899'
      }
    ];

    lanes.forEach((lane) => {
      const isTarget = this.currentSignal === lane.dir && this.roundPhase === 'SIGNAL_ACTIVE';
      const isScanned = this.isSingleSwitchMode && this.scannedDirection === lane.dir;

      ctx.save();
      const cardWidth = Math.min(180, width * 0.26);
      const cardHeight = 64;
      const cardX = lane.x - cardWidth / 2;
      const cardY = laneY - cardHeight / 2;

      // Single switch scan highlight outline
      if (isScanned) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.strokeRect(cardX - 4, cardY - 4, cardWidth + 8, cardHeight + 8);
      }

      // Base card
      if (isTarget) {
        ctx.fillStyle = this.highContrast ? '#ffffff' : lane.color;
      } else {
        ctx.fillStyle = this.highContrast ? '#111827' : 'rgba(30, 41, 59, 0.75)';
      }
      ctx.strokeStyle = isTarget ? '#ffffff' : (this.highContrast ? '#ffffff' : 'rgba(255, 255, 255, 0.25)');
      ctx.lineWidth = isTarget ? 3 : 1.5;

      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 10);
      ctx.fill();
      ctx.stroke();

      // Card Contents
      const textColor = isTarget ? (this.highContrast ? '#000000' : '#05070d') : '#ffffff';

      // Shape icon
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      let icon = '◄';
      if (lane.dir === SignalDirections.CENTER) icon = '◉';
      if (lane.dir === SignalDirections.RIGHT) icon = '►';
      ctx.fillText(icon, lane.x, cardY + 26);

      // Label & Input binding
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(`${lane.label} [${lane.key}]`, lane.x, cardY + 44);

      if (isScanned) {
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('SWITCH SELECT', lane.x, cardY + 58);
      }

      ctx.restore();
    });
  }

  drawTensionIndicator(ctx, width, height) {
    const cx = width / 2;
    const cy = height * 0.38;
    const radius = 32 + (this.reduceMotion ? 0 : Math.sin(this.pulseTick * 4) * 8);

    ctx.save();
    // Pulsing aura for deaf players (signals tension heartbeat)
    ctx.strokeStyle = this.highContrast ? '#ffffff' : 'rgba(239, 68, 68, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = this.highContrast ? '#ef4444' : 'rgba(239, 68, 68, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Text warning
    ctx.font = '900 17px system-ui, sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ READY... HOLD... ⚡', cx, cy - 45);

    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#fecaca';
    ctx.fillText('Do NOT strike yet (False Start penalty!)', cx, cy + 50);

    ctx.restore();
  }

  drawActiveSignalBanner(ctx, width, height) {
    const cx = width / 2;
    const cy = height * 0.36;

    let dirLabel = 'CENTER';
    let dirShape = '◉ BULLSEYE';
    let bannerColor = '#fbbf24';

    if (this.currentSignal === SignalDirections.LEFT) {
      dirLabel = 'STRIKE LEFT!';
      dirShape = '◄ LEFT ARROW [A]';
      bannerColor = '#38bdf8';
    } else if (this.currentSignal === SignalDirections.RIGHT) {
      dirLabel = 'STRIKE RIGHT!';
      dirShape = '► RIGHT ARROW [D]';
      bannerColor = '#ec4899';
    } else {
      dirLabel = 'STRIKE CENTER!';
      dirShape = '◉ CENTER [W / SPACE]';
      bannerColor = '#fbbf24';
    }

    ctx.save();
    // High-contrast attention flash banner
    const bWidth = Math.min(420, width * 0.82);
    const bHeight = 84;
    ctx.fillStyle = this.highContrast ? '#ffffff' : bannerColor;
    ctx.strokeStyle = '#05070d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx - bWidth / 2, cy - bHeight / 2, bWidth, bHeight, 14);
    ctx.fill();
    ctx.stroke();

    // Bold text for deaf players
    ctx.font = '900 26px system-ui, sans-serif';
    ctx.fillStyle = '#05070d';
    ctx.textAlign = 'center';
    ctx.fillText(dirLabel, cx, cy - 6);

    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(dirShape, cx, cy + 22);

    ctx.restore();
  }

  drawRoundResultOverlay(ctx, width, height) {
    const cx = width / 2;
    const cy = height * 0.36;
    const result = this.lastResult;
    if (!result) return;

    ctx.save();
    const isWin = result.winner === 'PLAYER';
    const isOpponent = result.winner === 'OPPONENT';

    let headline = 'ROUND OVER';
    let headlineColor = '#94a3b8';
    if (isWin) {
      headline = '★ POINT SCORED! ★';
      headlineColor = '#22c55e';
    } else if (isOpponent) {
      headline = result.isFalseStart ? '⚠ FALSE START! ⚠' : (result.isWrongDirection ? '✕ WRONG DIRECTION! ✕' : '✕ OPPONENT POINT ✕');
      headlineColor = '#ef4444';
    } else {
      headline = '⏱ TIMEOUT - NO HIT';
      headlineColor = '#f59e0b';
    }

    const boxW = Math.min(460, width * 0.88);
    const boxH = 80;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = headlineColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 20px system-ui, sans-serif';
    ctx.fillStyle = headlineColor;
    ctx.textAlign = 'center';
    ctx.fillText(headline, cx, cy - 8);

    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#f8fafc';
    let detail = result.reason;
    if (result.playerTime) {
      detail += ` (${result.playerTime} ms)`;
    } else if (result.opponentTime) {
      detail += ` (${result.opponentTime} ms)`;
    }
    ctx.fillText(detail, cx, cy + 18);

    ctx.restore();
  }

  drawMatchOverOverlay(ctx, width, height) {
    const cx = width / 2;
    const cy = height * 0.36;
    const isPlayerWin = this.playerScore >= this.roundsToWin;

    ctx.save();
    const boxW = Math.min(500, width * 0.9);
    const boxH = 100;

    const accentColor = isPlayerWin ? '#22c55e' : '#ef4444';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 26px system-ui, sans-serif';
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'center';
    ctx.fillText(isPlayerWin ? '🏆 VICTORY! YOU WON THE DUEL! 🏆' : '💀 DEFEAT! RIVAL CLAIMS MATCH! 💀', cx, cy - 14);

    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(`Final Score: ${this.playerScore} - ${this.opponentScore}. Press SPACE or Play Again button!`, cx, cy + 18);

    ctx.restore();
  }
}
