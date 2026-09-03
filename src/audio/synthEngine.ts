import { Track } from '../types';

export const DEMO_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'Neon Pulse',
    artist: 'AI Composer Alpha',
    genre: 'Synthwave / Cyber Beat',
    bpm: 120,
    duration: 68,
    primaryColor: '#39FF14', // Neon Green
    accentColor: '#00FFFF', // Neon Cyan
    tag: 'ALPHA SERIES',
  },
  {
    id: 'track-2',
    title: 'Midnight Grid',
    artist: 'Synth-V Engine',
    genre: 'Darksynth / Cyberpunk',
    bpm: 128,
    duration: 60,
    primaryColor: '#00FFFF', // Electric Cyan
    accentColor: '#39FF14',
    tag: 'SYNTH-V LOGIC',
  },
  {
    id: 'track-3',
    title: 'Pixel Drift',
    artist: 'ByteBeat Logic',
    genre: 'ByteBeat / Lo-Fi Chiptune',
    bpm: 96,
    duration: 75,
    primaryColor: '#FF00FF', // Neon Magenta
    accentColor: '#39FF14',
    tag: 'BYTEBEAT V2',
  },
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private sfxGain: GainNode | null = null;

  private isMusicPlaying = false;
  private currentTrackIdx = 0;
  private volume = 0.7;
  private timerId: number | null = null;

  private currentBeat = 0;
  private nextNoteTime = 0;
  private elapsedSeconds = 0;
  private progressInterval: number | null = null;
  private onProgressUpdate: ((elapsed: number, duration: number) => void) | null = null;
  private onTrackEnd: (() => void) | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      // Routing
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setProgressCallback(cb: (elapsed: number, duration: number) => void) {
    this.onProgressUpdate = cb;
  }

  public setTrackEndCallback(cb: () => void) {
    this.onTrackEnd = cb;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public isPlaying(): boolean {
    return this.isMusicPlaying;
  }

  public getCurrentTrack(): Track {
    return DEMO_TRACKS[this.currentTrackIdx];
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIdx;
  }

  public play(trackIdx?: number) {
    this.initContext();
    if (trackIdx !== undefined && trackIdx !== this.currentTrackIdx) {
      this.currentTrackIdx = (trackIdx + DEMO_TRACKS.length) % DEMO_TRACKS.length;
      this.elapsedSeconds = 0;
      this.currentBeat = 0;
    }

    this.isMusicPlaying = true;
    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
    }

    if (this.timerId === null) {
      this.scheduleLoop();
    }

    if (this.progressInterval === null) {
      this.progressInterval = window.setInterval(() => {
        if (!this.isMusicPlaying) return;
        this.elapsedSeconds += 0.25;
        const duration = DEMO_TRACKS[this.currentTrackIdx].duration;
        if (this.elapsedSeconds >= duration) {
          this.elapsedSeconds = 0;
          this.currentBeat = 0;
          if (this.onTrackEnd) {
            this.onTrackEnd();
            return;
          }
        }
        if (this.onProgressUpdate) {
          this.onProgressUpdate(this.elapsedSeconds, duration);
        }
      }, 250);
    }
  }

  public pause() {
    this.isMusicPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.progressInterval !== null) {
      window.clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  public nextTrack() {
    const nextIdx = (this.currentTrackIdx + 1) % DEMO_TRACKS.length;
    this.elapsedSeconds = 0;
    this.currentBeat = 0;
    this.play(nextIdx);
  }

  public prevTrack() {
    const prevIdx = (this.currentTrackIdx - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length;
    this.elapsedSeconds = 0;
    this.currentBeat = 0;
    this.play(prevIdx);
  }

  public seek(seconds: number) {
    const duration = DEMO_TRACKS[this.currentTrackIdx].duration;
    this.elapsedSeconds = Math.max(0, Math.min(duration, seconds));
    if (this.onProgressUpdate) {
      this.onProgressUpdate(this.elapsedSeconds, duration);
    }
  }

  // Real-time loop scheduler for notes
  private scheduleLoop = () => {
    if (!this.isMusicPlaying || !this.ctx || !this.masterGain) return;

    const currentTrack = DEMO_TRACKS[this.currentTrackIdx];
    const secondsPerBeat = 60.0 / currentTrack.bpm;
    const stepDuration = secondsPerBeat / 4; // 16th notes

    // Schedule events up to 0.15s in advance
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playStep(this.currentTrackIdx, this.currentBeat, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.currentBeat = (this.currentBeat + 1) % 64; // 4-bar 16th note loop
    }

    this.timerId = window.setTimeout(this.scheduleLoop, 35);
  };

  private playStep(trackIdx: number, step: number, time: number, stepDuration: number) {
    if (!this.ctx || !this.masterGain) return;

    if (trackIdx === 0) {
      // Track 1: Cyber Genesis (Synthwave)
      // Drums: Kick on 0, 4, 8, 12, 16... (four on the floor or classic synthwave)
      if (step % 8 === 0) {
        this.synthKick(time, 0.5);
      }
      if (step % 16 === 8) {
        this.synthSnare(time, 0.35);
      }
      if (step % 2 === 0) {
        this.synthHiHat(time, step % 4 === 2 ? 0.15 : 0.08);
      }

      // Bass: 16th note driving saw bass in A minor (A1, C2, D2, F1)
      const bassNotes = [110, 110, 110, 110, 130.81, 130.81, 110, 110, 87.31, 87.31, 87.31, 87.31, 98, 98, 123.47, 130.81];
      const bassFreq = bassNotes[step % 16];
      this.synthBass(time, bassFreq, stepDuration * 0.9, 'sawtooth');

      // Lead / Arp melody
      const arpSequence = [
        440, 523.25, 659.25, 880, 659.25, 523.25, 440, 523.25,
        392, 493.88, 587.33, 783.99, 587.33, 493.88, 392, 493.88,
        349.23, 440, 523.25, 698.46, 523.25, 440, 349.23, 440,
        329.63, 392, 493.88, 659.25, 493.88, 392, 440, 523.25
      ];
      if (step % 2 === 0) {
        const arpNote = arpSequence[(step / 2) % arpSequence.length];
        this.synthLead(time, arpNote, stepDuration * 1.5, 0.12, 'square');
      }

    } else if (trackIdx === 1) {
      // Track 2: Neon Overdrive (Darksynth / Cyberpunk)
      // Fast hard drums
      if (step % 4 === 0) {
        this.synthKick(time, 0.7);
      }
      if (step % 8 === 4) {
        this.synthSnare(time, 0.45);
      }
      this.synthHiHat(time, (step % 4 === 2) ? 0.2 : 0.08);

      // Acid bassline in D minor (73.42 Hz D2)
      const acidPattern = [73.42, 73.42, 146.83, 73.42, 82.41, 73.42, 110, 73.42, 73.42, 164.81, 73.42, 87.31, 98, 73.42, 146.83, 110];
      const acidFreq = acidPattern[step % 16];
      this.synthAcid(time, acidFreq, stepDuration * 0.85);

      // Stabs
      if (step % 16 === 0 || step % 16 === 6 || step % 16 === 10) {
        this.synthStab(time, 293.66, 0.2); // D4 stab
      }

    } else {
      // Track 3: Starlight Matrix (Lo-Fi Chiptune)
      if (step % 16 === 0 || step % 16 === 10) {
        this.synthSoftKick(time, 0.4);
      }
      if (step % 16 === 8) {
        this.synthSnare(time, 0.25);
      }
      if (step % 4 === 0) {
        this.synthHiHat(time, 0.06);
      }

      // Melodic chiptune lead
      const melody = [523.25, 0, 587.33, 659.25, 0, 783.99, 659.25, 0, 587.33, 523.25, 0, 440, 493.88, 0, 523.25, 0];
      const note = melody[step % 16];
      if (note > 0) {
        this.synthLead(time, note, stepDuration * 2.5, 0.18, 'triangle');
      }

      // Warm sub bass
      if (step % 8 === 0) {
        const subNotes = [65.41, 73.42, 82.41, 58.27];
        const subFreq = subNotes[Math.floor((step % 32) / 8)];
        this.synthBass(time, subFreq, stepDuration * 3.5, 'sine');
      }
    }
  }

  // --- Synth Modules ---
  private synthKick(time: number, gainVal: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private synthSoftKick(time: number, gainVal: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.18);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private synthSnare(time: number, gainVal: number) {
    if (!this.ctx || !this.masterGain) return;
    // Tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(90, time + 0.08);

    oscGain.gain.setValueAtTime(gainVal * 0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.1);

    // Noise buffer for snare crackle
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainVal, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.12);
  }

  private synthHiHat(time: number, gainVal: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.04);
  }

  private synthBass(time: number, freq: number, duration: number, type: OscillatorType) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);

    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthAcid(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(8, time); // High resonance for acid squelch
    filter.frequency.setValueAtTime(2500, time);
    filter.frequency.exponentialRampToValueAtTime(250, time + duration);

    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthLead(time: number, freq: number, duration: number, volume: number, type: OscillatorType) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthStab(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.5, time); // 5th interval

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  // --- Interactive Sound Effects (SFX) for Snake Game ---
  public playFruitSound(isBonus = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isBonus) {
      // Cosmic sparkly multi-note chirp
      osc.type = 'square';
      osc.frequency.setValueAtTime(587.33, time); // D5
      osc.frequency.setValueAtTime(880, time + 0.05); // A5
      osc.frequency.setValueAtTime(1174.66, time + 0.1); // D6

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + 0.25);
    } else {
      // Crisp neon blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, time);
      osc.frequency.exponentialRampToValueAtTime(880, time + 0.08);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + 0.1);
    }
  }

  public playGameOverSound() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.45);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  public playTurnSound() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, time);
    osc.frequency.exponentialRampToValueAtTime(180, time + 0.03);

    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + 0.03);
  }

  public playTimerTick(urgent: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = urgent ? 'square' : 'sine';
    osc.frequency.setValueAtTime(urgent ? 1046.5 : 659.25, time); // C6 or E5
    gain.gain.setValueAtTime(urgent ? 0.08 : 0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  public playTimeUpSound() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const time = this.ctx.currentTime;
    // Ascending celebratory power chord fanfare
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + idx * 0.08);

      gain.gain.setValueAtTime(0.18, time + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time + idx * 0.08);
      osc.stop(time + idx * 0.08 + 0.45);
    });
  }

  // Get frequency spectrum data for visualizer
  public getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(32);
    }
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export const synthEngine = new AudioEngine();
