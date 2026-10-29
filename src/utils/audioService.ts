// Serviço modular de áudio do Party Games
// Desenvolvido de forma a facilitar a troca por arquivos estáticos (.mp3) no futuro.

class AudioService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private storageKey = 'ito_audio_muted';

  constructor() {
    // Carrega preferência de som do usuário
    try {
      const saved = localStorage.getItem(this.storageKey);
      this.muted = saved === 'true';
    } catch {
      this.muted = false;
    }
  }

  // Inicializa o contexto de áudio sob demanda (atendendo políticas de autoplay de navegadores)
  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(val: boolean) {
    this.muted = val;
    try {
      localStorage.setItem(this.storageKey, val.toString());
    } catch { /* armazenamento indisponível */ }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- TRIGGERS DE SOM ---
  // Se futuramente você quiser usar arquivos de áudio (.mp3), basta alterar o corpo de cada função 
  // para tocar um elemento HTMLAudioElement (ex: new Audio('/sounds/flip.mp3').play()).

  /**
   * Som tátil rápido (click/flip) ao interagir ou virar cartas
   */
  public playFlip() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Configura uma frequência que cai rapidamente (som de clique/pop)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  /**
   * Som de sucesso / vitória do round
   */
  public playSuccess() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Arpejo de C Maior feliz
    playNote(261.63, now, 0.4);       // C4
    playNote(329.63, now + 0.1, 0.4); // E4
    playNote(392.00, now + 0.2, 0.4); // G4
    playNote(523.25, now + 0.3, 0.6); // C5
  }

  /**
   * Som de erro / falha
   */
  public playFail() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const playNote = (freq: number, startTime: number, duration: number, detune = 0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.detune.setValueAtTime(detune, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Som grave e desafinado triste
    playNote(150, now, 0.5, 0);
    playNote(146, now + 0.05, 0.5, 30); // Desafinado sutilmente
    playNote(110, now + 0.25, 0.7, 0);
  }

  /**
   * Pequeno tique-taque de aviso / tempo correndo
   */
  public playTick() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  /**
   * Som de suspense / revelação misteriosa (ex: revelar papel no Impostor)
   */
  public playSuspense() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, ctx.currentTime); // A2
    osc.frequency.linearRampToValueAtTime(82.41, ctx.currentTime + 0.6); // E2

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);

    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  }

  /**
   * Som rápido de clique / pop (interação de UI suave)
   */
  public playPop() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  /**
   * Som de pulso / batimento cardíaco tenso (para contagens regressivas e momentos de revelação)
   */
  public playHeartbeat() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const playThump = (freq: number, time: number, duration: number, gainLevel: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + duration);

      gain.gain.setValueAtTime(0.01, time);
      gain.gain.linearRampToValueAtTime(gainLevel, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.start(time);
      osc.stop(time + duration);
    };

    // "Lub-dub" (dois batimentos próximos)
    playThump(85, now, 0.12, 0.35);
    playThump(65, now + 0.14, 0.15, 0.25);
  }
}

export const audioService = new AudioService();

