/**
 * Audio processing, procedural audio generation, and waveform utilities
 */

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(blob);
    audio.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(objectUrl);
    };

    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      cleanUp();
      resolve(isFinite(duration) ? duration : 0);
    };

    audio.onerror = () => {
      cleanUp();
      resolve(0);
    };

    audio.src = objectUrl;
  });
}

export async function extractWaveform(blob: Blob, sampleCount = 60): Promise<number[]> {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return generateSyntheticWaveform(sampleCount);
    }

    const audioCtx = new AudioCtx();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / sampleCount);
    const peaks: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j += 4) {
        sum += Math.abs(channelData[start + j] || 0);
      }
      peaks.push(sum / (blockSize / 4));
    }

    await audioCtx.close();

    const max = Math.max(...peaks, 0.001);
    return peaks.map((p) => Math.max(0.12, Math.min(1.0, p / max)));
  } catch {
    return generateSyntheticWaveform(sampleCount);
  }
}

function generateSyntheticWaveform(sampleCount: number): number[] {
  const points: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const wave = Math.sin((i / sampleCount) * Math.PI) * 0.7 + Math.sin(i * 0.4) * 0.2 + 0.15;
    points.push(Math.max(0.15, Math.min(0.95, wave)));
  }
  return points;
}

/**
 * Converts an AudioBuffer to an audio/wav Blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // fmt sub-chunk
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // chunkSize: 16 for PCM
  setUint16(1); // 1 = PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample

  // data sub-chunk
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // data length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
}

export type SampleSoundType = 'ambient_rain' | 'lofi_pulse' | 'binaural_meditation' | 'ocean_breeze';

export interface GeneratedSample {
  blob: Blob;
  title: string;
  artist: string;
  duration: number;
}

/**
 * Procedurally synthesizes rich, realistic ambient & musical audio tracks
 * using the Web Audio API without needing network or external downloads!
 */
export async function generateProceduralSound(type: SampleSoundType, durationSec = 15): Promise<GeneratedSample> {
  const sampleRate = 44100;
  const numFrames = sampleRate * durationSec;
  const offlineCtx = new OfflineAudioContext(2, numFrames, sampleRate);

  let title = 'Ambient Track';
  let artist = 'SoundVault Generator';

  if (type === 'ambient_rain') {
    title = 'Gentle Rain & Calm Thunder';
    artist = 'SoundVault Studio';

    // Pink noise generator for soothing rain
    const bufferSize = numFrames;
    const noiseBuffer = offlineCtx.createBuffer(2, bufferSize, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }
    }
    const rainSource = offlineCtx.createBufferSource();
    rainSource.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, 0);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0.7, 0);
    // Smooth fade in & out
    gain.gain.setValueAtTime(0.0, 0);
    gain.gain.linearRampToValueAtTime(0.7, 1);
    gain.gain.setValueAtTime(0.7, durationSec - 1);
    gain.gain.linearRampToValueAtTime(0.0, durationSec);

    rainSource.connect(filter);
    filter.connect(gain);
    gain.connect(offlineCtx.destination);
    rainSource.start();

  } else if (type === 'lofi_pulse') {
    title = 'Lo-Fi Chill Beats & Rhodes Chords';
    artist = 'SoundVault Audio';

    // Warm chord progression: Dm9 -> G13 -> Cmaj9 -> Am7
    const chords = [
      [146.83, 220.00, 261.63, 329.63], // Dm9
      [196.00, 246.94, 329.63, 392.00], // G13
      [130.81, 196.00, 246.94, 329.63], // Cmaj9
      [220.00, 261.63, 329.63, 392.00], // Am7
    ];

    const chordDuration = durationSec / chords.length;

    chords.forEach((chord, chordIdx) => {
      const startTime = chordIdx * chordDuration;
      chord.forEach((freq) => {
        const osc = offlineCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        // subtle vibrato
        const vibrato = offlineCtx.createOscillator();
        vibrato.frequency.value = 4.5;
        const vibratoGain = offlineCtx.createGain();
        vibratoGain.gain.value = 2.0;
        vibrato.connect(osc.frequency);
        vibrato.start(startTime);
        vibrato.stop(startTime + chordDuration);

        const chordGain = offlineCtx.createGain();
        chordGain.gain.setValueAtTime(0.001, startTime);
        chordGain.gain.linearRampToValueAtTime(0.12, startTime + 0.3);
        chordGain.gain.exponentialRampToValueAtTime(0.06, startTime + chordDuration - 0.2);
        chordGain.gain.linearRampToValueAtTime(0.0001, startTime + chordDuration);

        osc.connect(chordGain);
        chordGain.connect(offlineCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + chordDuration);
      });

      // Sub Bass pulse
      const bassOsc = offlineCtx.createOscillator();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(chord[0] / 2, startTime);
      const bassGain = offlineCtx.createGain();
      bassGain.gain.setValueAtTime(0.22, startTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + chordDuration * 0.85);

      bassOsc.connect(bassGain);
      bassGain.connect(offlineCtx.destination);
      bassOsc.start(startTime);
      bassOsc.stop(startTime + chordDuration);
    });

  } else if (type === 'binaural_meditation') {
    title = 'Deep Theta Waves 432Hz Meditation';
    artist = 'SoundVault Sanctuary';

    // Left ear: 432 Hz, Right ear: 438 Hz (6Hz Theta beat for deep relaxation)
    const baseFreq = 216; // A3 harmonic
    const merger = offlineCtx.createChannelMerger(2);

    const oscL = offlineCtx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(baseFreq, 0);

    const oscR = offlineCtx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(baseFreq + 6, 0);

    const gainL = offlineCtx.createGain();
    const gainR = offlineCtx.createGain();
    gainL.gain.setValueAtTime(0.2, 0);
    gainR.gain.setValueAtTime(0.2, 0);

    oscL.connect(gainL);
    gainL.connect(merger, 0, 0);

    oscR.connect(gainR);
    gainR.connect(merger, 0, 1);

    merger.connect(offlineCtx.destination);
    oscL.start();
    oscR.start();

  } else {
    // Ocean breeze
    title = 'Pacific Ocean Coastline Ambience';
    artist = 'SoundVault Nature';

    const bufferSize = numFrames;
    const noiseBuffer = offlineCtx.createBuffer(2, bufferSize, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }
    }

    const noiseSource = offlineCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, 0);
    // Ocean wave rhythm
    for (let t = 0; t < durationSec; t += 4) {
      filter.frequency.linearRampToValueAtTime(700, t + 2);
      filter.frequency.linearRampToValueAtTime(200, t + 4);
    }

    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.5, 0);

    noiseSource.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(offlineCtx.destination);
    noiseSource.start();
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);

  return {
    blob: wavBlob,
    title,
    artist,
    duration: durationSec,
  };
}

export type PeriodKey = 'period1' | 'period2' | 'period3' | 'other';

export interface PeriodInfo {
  key: PeriodKey;
  label: string;
  patternLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const PERIOD_CONFIG: Record<PeriodKey, PeriodInfo> = {
  period1: {
    key: 'period1',
    label: 'Period 1',
    patternLabel: '1.x.x',
    description: 'Files named 1.x.x',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/30',
  },
  period2: {
    key: 'period2',
    label: 'Period 2',
    patternLabel: '2.x.x',
    description: 'Files named 2.x.x',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
  },
  period3: {
    key: 'period3',
    label: 'Period 3',
    patternLabel: '3.x.x',
    description: 'Files named 3.x.x',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/30',
  },
  other: {
    key: 'other',
    label: 'Other Audio',
    patternLabel: 'Misc',
    description: 'Other audio files & recordings',
    badgeBg: 'bg-slate-700/30',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-600/40',
  },
};

/**
 * Classifies a track into Period 1, Period 2, Period 3, or Other.
 * Rule:
 * Files with 1.x.x -> Period 1
 * Files with 2.x.x -> Period 2
 * Files with 3.x.x -> Period 3
 */
export function getTrackPeriod(title: string): PeriodKey {
  const clean = title.trim();

  // 1.x.x check: e.g. starts with 1. or has 1.x.x token or period 1
  if (/^1\.\S+/i.test(clean) || /\b1\.\d+(\.\d+)?\b/i.test(clean) || /\bperiod\s*1\b/i.test(clean)) {
    return 'period1';
  }
  // 2.x.x check: e.g. starts with 2. or has 2.x.x token or period 2
  if (/^2\.\S+/i.test(clean) || /\b2\.\d+(\.\d+)?\b/i.test(clean) || /\bperiod\s*2\b/i.test(clean)) {
    return 'period2';
  }
  // 3.x.x check: e.g. starts with 3. or has 3.x.x token or period 3
  if (/^3\.\S+/i.test(clean) || /\b3\.\d+(\.\d+)?\b/i.test(clean) || /\bperiod\s*3\b/i.test(clean)) {
    return 'period3';
  }

  return 'other';
}

/**
 * Sorts audio tracks alphabetically and naturally by name (e.g. 1.1.1, 1.1.2, 1.1.10)
 */
export function sortTracksByName<T extends { title: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
  );
}

