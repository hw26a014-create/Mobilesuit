/**
 * Web Audio API procedurally synthesized sound effects for the Mecha Shooter game
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setMuted(muted: boolean) {
  isMuted = muted;
}

export function getMuted(): boolean {
  return isMuted;
}

/**
 * Procedural Laser Shot Sound
 */
export function playLaserSound(type: 'PULSE' | 'SPREAD' | 'PLASMA' | 'ROCKET' | 'ENEMY' = 'PULSE') {
  if (isMuted) return;
  try {
    const ctx = initAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'SPREAD':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case 'PLASMA':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      case 'ROCKET':
        // Low rumble sine with frequency decay
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.3);
        // Let's create a temporary filter for rumble
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gainNode);

        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      case 'ENEMY':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'PULSE':
      default:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
    }
  } catch (e) {
    console.warn('Audio play failure:', e);
  }
}

/**
 * Procedural Explosion Sound (White Noise Synth)
 */
export function playExplosionSound(intensity: 'small' | 'medium' | 'large' | 'boss' = 'medium') {
  if (isMuted) return;
  try {
    const ctx = initAudioContext();
    const bufferSize = ctx.sampleRate * (intensity === 'boss' ? 1.5 : intensity === 'large' ? 0.8 : intensity === 'medium' ? 0.4 : 0.2);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Populate with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to give explosion weight
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    
    // Gain Node
    const gainNode = ctx.createGain();

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (intensity === 'boss') {
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(30, now + 1.2);
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
    } else if (intensity === 'large') {
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + 0.7);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.75);
    } else if (intensity === 'medium') {
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.35);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    } else { // small
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.18);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    }

    noiseNode.start(now);
  } catch (e) {
    console.warn('Audio play failure:', e);
  }
}

/**
 * Procedural Scrap Pick Up Sound
 */
export function playScrapCollectSound() {
  if (isMuted) return;
  try {
    const ctx = initAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    // Chiptune double beep
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.05); // E5
    
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.setValueAtTime(0.08, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.warn('Audio play failure:', e);
  }
}

/**
 * Player Hit Damage Alert
 */
export function playDamageSound() {
  if (isMuted) return;
  try {
    const ctx = initAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.25);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn('Audio play failure:', e);
  }
}

/**
 * Mecha Dash Sound
 */
export function playDashSound() {
  if (isMuted) return;
  try {
    const ctx = initAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

    osc.start(now);
    osc.stop(now + 0.18);
  } catch (e) {
    console.warn('Audio play failure:', e);
  }
}

/**
 * Mecha Module Upgraded Sound
 */
export function playUpgradeSound() {
  if (isMuted) return;
  try {
    const ctx = initAudioContext();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0.08, start);
      gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Arpeggio C Major C4 -> E4 -> G4 -> C5
    playTone(261.63, now, 0.15);
    playTone(329.63, now + 0.08, 0.15);
    playTone(392.00, now + 0.16, 0.15);
    playTone(523.25, now + 0.24, 0.25);
  } catch (e) {
    console.warn('Audio play failure:', e);
  }
}

/**
 * Epic Boss Spawn Alarm
 */
export function playBossSpawnSound() {
  if (isMuted) return;
  try {
    const ctx = initAudioContext();
    const now = ctx.currentTime;

    const triggerTensionTone = (timeOffset: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      
      // Detuned lower brass sirens
      osc1.frequency.setValueAtTime(110, now + timeOffset);
      osc2.frequency.setValueAtTime(111.5, now + timeOffset);

      osc1.frequency.linearRampToValueAtTime(80, now + timeOffset + 0.6);
      osc2.frequency.linearRampToValueAtTime(80, now + timeOffset + 0.6);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now + timeOffset);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0.18, now + timeOffset);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + timeOffset + 0.7);

      osc1.start(now + timeOffset);
      osc1.stop(now + timeOffset + 0.7);
      osc2.start(now + timeOffset);
      osc2.stop(now + timeOffset + 0.7);
    };

    // Double epic warning trumpets
    triggerTensionTone(0);
    triggerTensionTone(0.8);
  } catch (e) {
    console.warn('Audio play failure:', e);
  }
}
