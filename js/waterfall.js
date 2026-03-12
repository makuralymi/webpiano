// ============================================================
//  waterfall.js  —  falling notes canvas renderer + note scheduler
// ============================================================

// ── NoteScheduler ────────────────────────────────────────────

class NoteScheduler {
  constructor() {
    this._events = [];   // sorted by startSec
  }

  load(noteEvents) {
    // already sorted by the parser
    this._events = noteEvents;
  }

  // Returns all events that should be visible or just active at `t`
  getVisible(t, fallSec) {
    const winStart = t - 0.2;        // notes that just ended (still fading out)
    const winEnd   = t + fallSec;    // notes not yet arrived

    const out = [];
    for (const ev of this._events) {
      if (ev.startSec > winEnd)      break;
      if (ev.endSec   < winStart)    continue;
      out.push(ev);
    }
    return out;
  }

  clear() { this._events = []; }
}

// ── WaterfallRenderer ────────────────────────────────────────

const WaterfallRenderer = {
  // Draw the falling notes area
  // keyboardY    — y pixel where keyboard starts (top edge)
  // currentTime  — current song time (seconds)
  // trackColorMap— Map<trackIndex, {fill, glow}>
  draw(ctx, visibleNotes, layout, keyboardY, canvasW, canvasH, currentTime, trackColorMap, fallSec) {
    const waterfallH = keyboardY;   // waterfall fills from y=0 to keyboardY

    // ── Background ──────────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, waterfallH);
    bgGrad.addColorStop(0,   '#08080e');
    bgGrad.addColorStop(0.6, '#0a0a14');
    bgGrad.addColorStop(1,   '#0d0d1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, waterfallH);

    // ── Subtle horizontal grid lines ────────────────────────
    const pps = waterfallH / fallSec;  // pixels per second
    ctx.strokeStyle = 'rgba(28,28,55,0.6)';
    ctx.lineWidth   = 0.5;
    const beatH = pps * 0.5;   // one line every 0.5 s (rough)
    const gridOffset = (currentTime * pps) % beatH;
    for (let y = waterfallH - gridOffset; y > 0; y -= beatH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasW, y);
      ctx.stroke();
    }

    // ── Note bars ────────────────────────────────────────────
    ctx.save();
    // Clip to waterfall area so notes don't bleed into keyboard
    ctx.beginPath();
    ctx.rect(0, 0, canvasW, waterfallH);
    ctx.clip();

    for (const ev of visibleNotes) {
      const key = layout.getKey(ev.midi);
      if (!key) continue;

      const tc  = trackColorMap.get(ev.trackIndex)
                  || CONSTANTS.TRACK_COLORS[ev.trackIndex % CONSTANTS.TRACK_COLORS.length];

      const timeUntilStart = ev.startSec - currentTime;
      const timeUntilEnd   = ev.endSec   - currentTime;

      // yBottom = where the start‑edge of this note is (bottom of bar = keyboard edge)
      const yBottom = waterfallH - timeUntilStart * pps;
      const yTop    = waterfallH - timeUntilEnd   * pps;
      const height  = Math.max(yBottom - yTop, 2);

      if (yBottom < 0 || yTop > waterfallH) continue;

      const x = key.x;
      const w = key.isBlack ? key.w - 1 : key.w - 2;

      // Glow pass (blurred, wider)
      ctx.save();
      ctx.shadowColor = tc.glow;
      ctx.shadowBlur  = key.isBlack ? 10 : 14;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle   = tc.fill;
      const r  = Math.min(4, w / 2, height / 2);
      ctx.beginPath();
      ctx.roundRect(x + (key.isBlack ? 0 : 1), yTop, w, height, r);
      ctx.fill();
      ctx.restore();

      // Solid fill pass
      ctx.save();
      const noteGrad = ctx.createLinearGradient(x, yTop, x, yBottom);
      noteGrad.addColorStop(0,    'rgba(255,255,255,0.18)');
      noteGrad.addColorStop(0.1,  tc.fill);
      noteGrad.addColorStop(0.85, tc.fill);
      noteGrad.addColorStop(1,    'rgba(0,0,0,0.35)');
      ctx.fillStyle = noteGrad;
      ctx.beginPath();
      ctx.roundRect(x + (key.isBlack ? 0 : 1), yTop, w, height, r);
      ctx.fill();

      // Top highlight stripe
      if (height > 6) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.roundRect(x + (key.isBlack ? 1 : 2), yTop, w - 2, Math.min(3, height * 0.3), [r, r, 0, 0]);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();

    // ── Impact line (glowing edge between waterfall and keyboard) ──
    const lineGrad = ctx.createLinearGradient(0, 0, canvasW, 0);
    lineGrad.addColorStop(0,    'rgba(0,212,255,0)');
    lineGrad.addColorStop(0.15, 'rgba(0,212,255,0.6)');
    lineGrad.addColorStop(0.5,  'rgba(255,255,255,0.9)');
    lineGrad.addColorStop(0.85, 'rgba(255,63,128,0.6)');
    lineGrad.addColorStop(1,    'rgba(255,63,128,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, keyboardY - 2, canvasW, 2);

    // Soft ambient glow just above the keyboard
    const ambGrad = ctx.createLinearGradient(0, keyboardY - 30, 0, keyboardY);
    ambGrad.addColorStop(0, 'rgba(0,212,255,0)');
    ambGrad.addColorStop(1, 'rgba(0,212,255,0.06)');
    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, keyboardY - 30, canvasW, 30);
  },

  // Draw keyboard background + shelf
  drawBackground(ctx, keyboardY, canvasW, canvasH) {
    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, keyboardY, canvasW, canvasH - keyboardY);
  },
};

window.NoteScheduler    = NoteScheduler;
window.WaterfallRenderer = WaterfallRenderer;
