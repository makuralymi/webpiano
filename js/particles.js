// ============================================================
//  particles.js  —  key-press burst particle system
// ============================================================

const _TRAIL_LEN = 7;

class Particle {
  constructor(x, y, color, fast) {
    this.xBase  = x + (Math.random() - 0.5) * 10;
    this.x      = this.xBase;
    this.y      = y;
    this.vy     = -(fast ? (1.8 + Math.random() * 2.2) : (0.8 + Math.random() * 1.4));
    this.vxBase = (Math.random() - 0.5) * 0.3;
    this.life   = 1.0;
    this.decay  = 0.004 + Math.random() * 0.008;
    this.r      = 2 + Math.random() * 3.0;
    this.color  = color;
    this.amp    = 3 + Math.random() * 8;
    this.freq   = 0.04 + Math.random() * 0.04;
    this.phase  = Math.random() * Math.PI * 2;
    this.age    = 0;
    // Ring buffer — avoids shift() O(n) copies
    this._tx    = new Float32Array(_TRAIL_LEN);
    this._ty    = new Float32Array(_TRAIL_LEN);
    this._th    = 0;   // write head
    this._tc    = 0;   // filled count
  }

  update() {
    // Record current position into ring buffer before moving
    this._tx[this._th] = this.x;
    this._ty[this._th] = this.y;
    this._th = (this._th + 1) % _TRAIL_LEN;
    if (this._tc < _TRAIL_LEN) this._tc++;
    if (this.y < 10) this.life = 0;  // early kill for stragglers that float off-screen

    this.age   += 1;
    this.xBase += this.vxBase;
    this.x      = this.xBase + Math.sin(this.age * this.freq + this.phase) * this.amp;
    this.y     += this.vy;
    this.vy    *= 0.997;
    this.life  -= this.decay;
  }

  // Draw tail as a single path — no shadowBlur (called in a batched pass)
  drawTail(ctx) {
    if (this._tc < 2) return;
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = this.r * 0.5;
    ctx.globalAlpha = this.life * 0.45;
    // Walk ring buffer oldest → newest
    const start = (this._th - this._tc + _TRAIL_LEN) % _TRAIL_LEN;
    ctx.beginPath();
    ctx.moveTo(this._tx[start], this._ty[start]);
    for (let i = 1; i < this._tc; i++) {
      const idx = (start + i) % _TRAIL_LEN;
      ctx.lineTo(this._tx[idx], this._ty[idx]);
    }
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }

  // Draw glowing head dot (called in a separate batched pass with shadowBlur set)
  drawHead(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle   = this.life > 0.6 ? '#ffffff' : this.color;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * this.life, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Smoke Particle ───────────────────────────────────────────

class SmokeParticle {
  constructor(x, y, color) {
    this.x     = x + (Math.random() - 0.5) * 22;
    this.y     = y;
    this.vx    = (Math.random() - 0.5) * 0.7;
    this.vy    = -(0.5 + Math.random() * 1.1);
    this.r     = 7 + Math.random() * 10;
    this.life  = 1.0;
    this.decay = 0.006 + Math.random() * 0.006;
    this.color = color;
  }

  update() {
    this.x    += this.vx + (Math.random() - 0.5) * 0.28;
    this.y    += this.vy;
    this.vy   *= 0.992;
    this.r    += 0.28;
    this.life -= this.decay;
  }

  // No save/restore — called inside a batched smoke pass
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.globalAlpha = this.life * this.life * 0.14;
    ctx.shadowColor = this.color;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── ParticleSystem ───────────────────────────────────────────

class ParticleSystem {
  constructor() {
    this._particles = [];
    this._smoke     = [];
    // Dynamic particle management thresholds
    this._maxParticles = 500;      // Soft limit for normal particles
    this._maxSmoke = 200;          // Soft limit for smoke particles
    this._criticalThreshold = 0.8; // Start aggressive cleanup at 80% capacity
    this._decayMultiplier = 1.0;   // Global decay speed multiplier
    this._lastFrameTime = performance.now();
    this._frameTime = 16.67;       // Target 60fps
  }

  burst(x, y, colors, count = 28) {
    // Throttle particle creation if approaching limits
    const particleLoad = this._particles.length / this._maxParticles;
    if (particleLoad > 0.9) {
      count = Math.floor(count * (1 - particleLoad) * 10); // Drastically reduce
    } else if (particleLoad > 0.7) {
      count = Math.floor(count * 0.5); // Reduce by half
    }
    
    for (let i = 0; i < count; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      this._particles.push(new Particle(x, y, c, i < 8));
    }
  }

  smokeBurst(x, y, color, count = 7) {
    // Throttle smoke creation if approaching limits
    const smokeLoad = this._smoke.length / this._maxSmoke;
    if (smokeLoad > 0.9) {
      count = Math.floor(count * (1 - smokeLoad) * 10);
    } else if (smokeLoad > 0.7) {
      count = Math.floor(count * 0.5);
    }
    
    for (let i = 0; i < count; i++)
      this._smoke.push(new SmokeParticle(x, y, color));
  }

  update() {
    // Measure frame time for performance-based adjustments
    const now = performance.now();
    const dt = now - this._lastFrameTime;
    this._lastFrameTime = now;
    this._frameTime = this._frameTime * 0.9 + dt * 0.1; // Smooth average
    
    // Calculate load factors
    const particleLoad = this._particles.length / this._maxParticles;
    const smokeLoad = this._smoke.length / this._maxSmoke;
    const maxLoad = Math.max(particleLoad, smokeLoad);
    
    // Adjust decay multiplier based on load and performance
    if (maxLoad > this._criticalThreshold || this._frameTime > 20) {
      // Over threshold or dropping below 50fps → speed up decay
      const overload = Math.max(maxLoad - this._criticalThreshold, 0) / (1 - this._criticalThreshold);
      const perfPenalty = Math.max((this._frameTime - 16.67) / 16.67, 0);
      this._decayMultiplier = 1.0 + overload * 3.0 + perfPenalty * 2.0;
    } else if (maxLoad < 0.3 && this._frameTime < 18) {
      // Low load and good performance → gradually restore normal decay
      this._decayMultiplier = Math.max(1.0, this._decayMultiplier * 0.95);
    }
    
    // Update particles with dynamic decay
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.update();
      // Apply dynamic decay multiplier
      p.life -= p.decay * (this._decayMultiplier - 1);
      if (p.life <= 0) this._particles.splice(i, 1);
    }
    
    // Update smoke with dynamic decay
    for (let i = this._smoke.length - 1; i >= 0; i--) {
      const s = this._smoke[i];
      s.update();
      // Apply dynamic decay multiplier
      s.life -= s.decay * (this._decayMultiplier - 1);
      if (s.life <= 0) this._smoke.splice(i, 1);
    }
    
    // Emergency cleanup if still over limits
    if (this._particles.length > this._maxParticles * 1.2) {
      this._emergencyCleanup(this._particles, this._maxParticles);
    }
    if (this._smoke.length > this._maxSmoke * 1.2) {
      this._emergencyCleanup(this._smoke, this._maxSmoke);
    }
  }
  
  _emergencyCleanup(array, targetCount) {
    // Remove oldest/weakest particles if critically over limit
    if (array.length <= targetCount) return;
    
    // Sort by life (weakest first) and remove excess
    array.sort((a, b) => a.life - b.life);
    const toRemove = array.length - targetCount;
    array.splice(0, toRemove);
  }

  draw(ctx) {
    if (this._smoke.length === 0 && this._particles.length === 0) return;

    // ── Pass 1: Smoke (fixed shadowBlur, no per-particle save/restore) ──
    if (this._smoke.length > 0) {
      ctx.save();
      ctx.shadowBlur = 28;
      for (const s of this._smoke) s.draw(ctx);
      ctx.restore();
    }

    if (this._particles.length === 0) return;

    // ── Pass 2: Tails — no shadowBlur (most expensive to skip) ──
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.lineCap    = 'round';
    ctx.lineJoin   = 'round';
    for (const p of this._particles) p.drawTail(ctx);
    ctx.restore();

    // ── Pass 3: Glowing heads ────────────────────────────────
    ctx.save();
    ctx.shadowBlur = 14;
    for (const p of this._particles) p.drawHead(ctx);
    ctx.restore();
  }

  clear() { 
    this._particles = []; 
    this._smoke = []; 
    this._decayMultiplier = 1.0;
  }
  
  // Diagnostic methods
  getStats() {
    return {
      particles: this._particles.length,
      smoke: this._smoke.length,
      total: this._particles.length + this._smoke.length,
      decayMultiplier: this._decayMultiplier.toFixed(2),
      frameTime: this._frameTime.toFixed(1),
      particleLoad: (this._particles.length / this._maxParticles * 100).toFixed(0) + '%',
      smokeLoad: (this._smoke.length / this._maxSmoke * 100).toFixed(0) + '%'
    };
  }
  
  setLimits(maxParticles, maxSmoke) {
    this._maxParticles = maxParticles;
    this._maxSmoke = maxSmoke;
  }
}

window.ParticleSystem = ParticleSystem;
