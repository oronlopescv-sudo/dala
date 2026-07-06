// Sons de rádio walkie talkie (gerados via WebAudio — sem ficheiros)

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, durationMs: number, delayMs = 0, volume = 0.15) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(c.destination);
  const start = c.currentTime + delayMs / 1000;
  const end = start + durationMs / 1000;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  osc.start(start);
  osc.stop(end);
}

// Beep ao carregar o botão (iniciar transmissão)
export function playPttStart() {
  tone(1000, 80);
}

// "Roger beep" ao soltar (fim de transmissão) — o clássico da rádio
export function playPttEnd() {
  tone(880, 60);
  tone(660, 80, 70);
}

// Chirp quando outra pessoa começa a falar
export function playIncoming() {
  tone(740, 50, 0, 0.08);
}

// Estática curta "kshhh" (ruído branco)
export function playStatic(durationMs = 120) {
  const c = getCtx();
  if (!c) return;
  const bufferSize = Math.floor((durationMs / 1000) * c.sampleRate);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.value = 0.05;
  source.connect(gain);
  gain.connect(c.destination);
  source.start();
}
