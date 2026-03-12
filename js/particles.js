// ============================================================
//  particles.js  —  key-press burst particle system
// ============================================================

class Particle {
  constructor(x, y, color, fast) {
    this.x     = x;
    this.y     = y;
    const spd  = fast ? (3 + Math.random() * 6) : (2 + Math.random() * 4);
    const ang  = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.85;
    this.vx    = Math.cos(ang) * spd;
    this.vy    = Math.sin(ang) * spd;
    this.life  = 1.0;
    this.decay = 0.025 + Math.random() * 0.025;
    this.r     = 1.5 + Math.random() * 2.5;
    this.color = color;
    this.gravity = 0.12;
  }

  update() {
    this.x    += this.vx;
    this.y    += this.vy;
    this.vy   += this.gravity;
    this.vx   *= 0.98;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this._particles = [];
  }

  // Emit a burst from the top‑edge of a piano key
  burst(x, y, colors, count = 22) {
    for (let i = 0; i < count; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      this._particles.push(new Particle(x, y, c, i < 6));
    }
  }

  update() {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      this._particles[i].update();
      if (this._particles[i].life <= 0) this._particles.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this._particles) p.draw(ctx);
  }

  clear() { this._particles = []; }
}

window.ParticleSystem = ParticleSystem;
