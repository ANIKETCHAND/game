/**
 * Echo Duel - Lightweight Accessible Visual Effects
 * Controlled particles, directional telegraphs, shockwaves, and subtle screen impact.
 */

export class VFXManager {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.screenShake = 0;
    this.screenShakeDecay = 0.9;
    this.reduceMotion = false;
  }

  setReduceMotion(val) {
    this.reduceMotion = !!val;
  }

  triggerImpact(x, y, color = '#38bdf8', count = 18) {
    if (this.reduceMotion) {
      count = 5;
    }
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.03,
        size: 3 + Math.random() * 4,
        color
      });
    }

    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: 80,
      life: 1.0,
      color
    });

    if (!this.reduceMotion) {
      this.screenShake = 10;
    }
  }

  triggerClash(x, y) {
    this.triggerImpact(x, y, '#f59e0b', 24);
    if (!this.reduceMotion) {
      this.screenShake = 14;
    }
  }

  triggerMiss(x, y) {
    this.triggerImpact(x, y, '#ef4444', 12);
    if (!this.reduceMotion) {
      this.screenShake = 6;
    }
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * 0.2;
      s.life -= 0.05;
      if (s.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Decay screen shake
    if (this.screenShake > 0.1) {
      this.screenShake *= this.screenShakeDecay;
    } else {
      this.screenShake = 0;
    }
  }

  render(ctx) {
    // Draw shockwaves
    for (const s of this.shockwaves) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1, s.radius), 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3 * s.life;
      ctx.globalAlpha = Math.max(0, s.life * 0.8);
      ctx.stroke();
      ctx.restore();
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size * p.life), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.restore();
    }
  }

  getShakeOffset() {
    if (this.screenShake <= 0.2 || this.reduceMotion) {
      return { x: 0, y: 0 };
    }
    return {
      x: (Math.random() - 0.5) * this.screenShake * 1.5,
      y: (Math.random() - 0.5) * this.screenShake * 1.5
    };
  }

  reset() {
    this.particles = [];
    this.shockwaves = [];
    this.screenShake = 0;
  }
}
