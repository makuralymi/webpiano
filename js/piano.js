// ============================================================
//  piano.js  —  keyboard layout, canvas renderer, PC keyboard input
// ============================================================

// ── Layout ──────────────────────────────────────────────────

class KeyboardLayout {
  constructor(canvasWidth, keyboardHeight) {
    this.whiteW = canvasWidth / CONSTANTS.WHITE_KEY_COUNT;
    this.blackW = this.whiteW * CONSTANTS.BLACK_KEY_WIDTH_RATIO;
    this.whiteH = keyboardHeight;
    this.blackH = keyboardHeight * CONSTANTS.BLACK_KEY_HEIGHT_RATIO;

    this._keys    = [];   // all 88 keys, in MIDI order
    this._byMidi  = new Map();

    let wIdx = 0;
    for (let midi = CONSTANTS.MIDI_START; midi <= CONSTANTS.MIDI_END; midi++) {
      const sem     = midi % 12;
      const isBlack = CONSTANTS.BLACK_SEMITONES.has(sem);
      const key     = { midi, isBlack };

      if (isBlack) {
        key.x = wIdx * this.whiteW - this.blackW / 2;
        key.w = this.blackW;
        key.h = this.blackH;
      } else {
        key.x = wIdx * this.whiteW;
        key.w = this.whiteW;
        key.h = this.whiteH;
        wIdx++;
      }

      // Colour state
      key.pressColor = null;   // null = not pressed
      key.lastColor  = CONSTANTS.TRACK_COLORS[0].fill;  // color of last press
      key.glowAlpha  = 0;      // fade‑out after release

      this._keys.push(key);
      this._byMidi.set(midi, key);
    }
  }

  getKey(midi)   { return this._byMidi.get(midi); }
  get keys()     { return this._keys; }

  // Update key state from external (player or keyboard input)
  press(midi, color)  {
    const k = this._byMidi.get(midi);
    if (!k) return;
    k.pressColor = color;
    k.lastColor  = color;
    k.glowAlpha  = 1.0;
  }
  release(midi) {
    const k = this._byMidi.get(midi);
    if (!k) return;
    k.pressColor = null;
  }

  // Fade glow on released keys each frame
  tickGlow(dt) {
    for (const k of this._keys) {
      if (!k.pressColor && k.glowAlpha > 0) {
        k.glowAlpha = Math.max(0, k.glowAlpha - dt * 3.5);
      }
    }
  }

  // Returns key rect shifted by keyboard Y offset
  rectOf(midi, keyboardY) {
    const k = this._byMidi.get(midi);
    if (!k) return null;
    return { x: k.x, y: keyboardY, w: k.w, h: k.h };
  }
}

// ── Renderer ─────────────────────────────────────────────────

const KeyboardRenderer = {
  draw(ctx, layout, keyboardY, canvasW) {
    const { whiteW, whiteH, blackW, blackH } = layout;

    ctx.save();

    // -- White keys --
    for (const k of layout.keys) {
      if (k.isBlack) continue;
      const x = k.x, w = k.w - 1, h = k.h, y = keyboardY;

      if (k.pressColor) {
        // Pressed
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, k.pressColor);
        grad.addColorStop(0.4, 'rgba(255,255,255,0.3)');
        grad.addColorStop(1,   '#111');
        ctx.fillStyle = grad;
        ctx.shadowColor = k.pressColor;
        ctx.shadowBlur  = 22;
      } else if (k.glowAlpha > 0.01) {
        // Fading glow after release
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        const c    = k.lastColor;
        grad.addColorStop(0, `rgba(255,255,255,${0.85 * k.glowAlpha})`);
        grad.addColorStop(1, CONSTANTS.KEY_WHITE_BOT);
        ctx.fillStyle   = grad;
        ctx.shadowColor = c;
        ctx.shadowBlur  = 18 * k.glowAlpha;
      } else {
        // Rest state
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, CONSTANTS.KEY_WHITE);
        grad.addColorStop(0.7, CONSTANTS.KEY_WHITE);
        grad.addColorStop(1, CONSTANTS.KEY_WHITE_BOT);
        ctx.fillStyle  = grad;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, [0, 0, 4, 4]);
      ctx.fill();

      // Separator line
      ctx.shadowBlur = 0;
      ctx.strokeStyle = CONSTANTS.KEY_SEP;
      ctx.lineWidth   = 0.7;
      ctx.stroke();
    }

    // -- Black keys --
    for (const k of layout.keys) {
      if (!k.isBlack) continue;
      const x = k.x, w = k.w, h = k.h, y = keyboardY;

      if (k.pressColor) {
        ctx.fillStyle   = k.pressColor;
        ctx.shadowColor = k.pressColor;
        ctx.shadowBlur  = 20;
      } else if (k.glowAlpha > 0.01) {
        const a = k.glowAlpha;
        ctx.fillStyle   = `rgba(40,40,50,1)`;
        ctx.shadowColor = k.lastColor;
        ctx.shadowBlur  = 14 * a;
      } else {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0,   CONSTANTS.KEY_BLACK);
        grad.addColorStop(0.5, '#222228');
        grad.addColorStop(1,   CONSTANTS.KEY_BLACK_BOT);
        ctx.fillStyle  = grad;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, [0, 0, 3, 3]);
      ctx.fill();
    }

    // Keyboard shelf shadow
    ctx.shadowBlur = 0;
    const shelf = ctx.createLinearGradient(0, keyboardY - 12, 0, keyboardY);
    shelf.addColorStop(0, 'rgba(0,0,0,0)');
    shelf.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = shelf;
    ctx.fillRect(0, keyboardY - 12, canvasW, 12);

    ctx.restore();
  }
};

// ── PC Keyboard Input ────────────────────────────────────────
// Maps physical keys to two octaves (C3–B4)

const KEY_MAP = {
  // Lower octave (C3–B3), bottom two rows
  'z': 48, 's': 49, 'x': 50, 'd': 51, 'c': 52,
  'v': 53, 'g': 54, 'b': 55, 'h': 56, 'n': 57,
  'j': 58, 'm': 59,
  // Upper octave (C4–B4)
  'q': 60, '2': 61, 'w': 62, '3': 63, 'e': 64,
  'r': 65, '5': 66, 't': 67, '6': 68, 'y': 69,
  '7': 70, 'u': 71, 'i': 72,
};

class KeyboardInput {
  constructor(onNoteOn, onNoteOff) {
    this._on  = onNoteOn;
    this._off = onNoteOff;
    this._held = new Set();
    this._bind();
  }

  _bind() {
    document.addEventListener('keydown', e => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      const midi = KEY_MAP[e.key.toLowerCase()];
      if (midi == null || this._held.has(midi)) return;
      this._held.add(midi);
      this._on(midi, 90);   // fixed velocity 90
    });

    document.addEventListener('keyup', e => {
      const midi = KEY_MAP[e.key.toLowerCase()];
      if (midi == null) return;
      this._held.delete(midi);
      this._off(midi);
    });
  }
}

window.KeyboardLayout  = KeyboardLayout;
window.KeyboardRenderer = KeyboardRenderer;
window.KeyboardInput   = KeyboardInput;
