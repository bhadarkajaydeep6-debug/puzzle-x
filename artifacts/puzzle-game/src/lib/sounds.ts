// artifacts/puzzle-game/src/lib/sounds.ts
// Premium Web Audio API sound engine — procedural, no external assets needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.3,
  startDelay = 0
) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime + startDelay);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration);
  } catch {}
}

// ── Tile slide — snappy click with subtle pitch ─────────────────────────
export function playTileSound(pitch = 1) {
  const baseFreq = 600 * pitch;
  playTone(baseFreq, 0.06, 'triangle', 0.18);
  playTone(baseFreq * 0.5, 0.1, 'square', 0.06);
}

// ── Combo sound — escalating ping per combo level ───────────────────────
export function playComboSound(combo: number) {
  const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
  const freq = notes[Math.min(combo - 1, notes.length - 1)];
  playTone(freq, 0.12, 'sine', 0.28);
  if (combo >= 5) playTone(freq * 1.5, 0.18, 'sine', 0.15, 0.06);
  if (combo >= 10) playTone(freq * 2, 0.25, 'sine', 0.12, 0.12);
}

// ── Win fanfare — triumphant ascending chord ─────────────────────────────
export function playWinSound() {
  const melody = [
    { f: 523, d: 0.12, g: 0.3 },
    { f: 659, d: 0.12, g: 0.3 },
    { f: 784, d: 0.12, g: 0.35 },
    { f: 1047, d: 0.25, g: 0.45 },
    { f: 784, d: 0.1,  g: 0.25 },
    { f: 1047, d: 0.4, g: 0.5 },
  ];
  let t = 0;
  for (const n of melody) {
    playTone(n.f, n.d + 0.1, 'sine', n.g, t);
    t += n.d;
  }
}

// ── Perfect win (3 stars) — extra sparkle ────────────────────────────────
export function playPerfectWinSound() {
  playWinSound();
  setTimeout(() => {
    [1047, 1319, 1568, 2093].forEach((f, i) => {
      playTone(f, 0.3, 'sine', 0.2, i * 0.08);
    });
  }, 600);
}

// ── Hint used ─────────────────────────────────────────────────────────────
export function playHintSound() {
  playTone(880, 0.08, 'sine', 0.22);
  playTone(1100, 0.12, 'sine', 0.18, 0.08);
}

// ── Coin earned ───────────────────────────────────────────────────────────
export function playCoinSound() {
  playTone(1047, 0.08, 'sine', 0.28, 0);
  playTone(1319, 0.12, 'sine', 0.28, 0.07);
  playTone(1568, 0.1,  'sine', 0.22, 0.14);
}

// ── Daily reward ──────────────────────────────────────────────────────────
export function playDailyRewardSound() {
  const notes = [523, 659, 784, 1047, 880, 1047];
  notes.forEach((f, i) => playTone(f, 0.15, 'sine', 0.28, i * 0.1));
}

// ── Error / no coins ──────────────────────────────────────────────────────
export function playErrorSound() {
  playTone(220, 0.08, 'sawtooth', 0.2);
  playTone(180, 0.12, 'sawtooth', 0.18, 0.08);
}

// ── Achievement unlocked ──────────────────────────────────────────────────
export function playAchievementSound() {
  [659, 784, 1047, 1319].forEach((f, i) => playTone(f, 0.25, 'sine', 0.3, i * 0.12));
}

// ── Level up ─────────────────────────────────────────────────────────────
export function playLevelUpSound() {
  const chord = [523, 659, 784];
  chord.forEach(f => playTone(f, 0.6, 'sine', 0.25));
  playTone(1047, 0.8, 'sine', 0.35, 0.2);
}

// ── Haptic vibrate wrapper ────────────────────────────────────────────────
export function vibrate(pattern: number | number[]) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}
