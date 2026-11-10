// 러시아 전통 선율 코로베이니카를 직접 합성합니다. 음원 파일은 사용하지 않습니다.
const A = [
  [76, 1], [71, .5], [72, .5], [74, 1], [72, .5], [71, .5],
  [69, 1], [69, .5], [72, .5], [76, 1], [74, .5], [72, .5],
  [71, 1.5], [72, .5], [74, 1], [76, 1], [72, 1], [69, 1], [69, 2],
  [74, 1.5], [77, .5], [81, 1], [79, .5], [77, .5],
  [76, 1.5], [72, .5], [76, 1], [74, .5], [72, .5],
  [71, 1], [71, .5], [72, .5], [74, 1], [76, 1], [72, 1], [69, 1], [69, 2],
];
const B = [
  [76, 2], [72, 2], [74, 2], [71, 2], [72, 2], [69, 2], [68, 2], [71, 2],
  [76, 2], [72, 2], [74, 2], [71, 2], [72, 1], [76, 1], [81, 2], [80, 2], [71, 2],
];
export const MELODY = [...A, ...A, ...B, ...B];
const BASS = [45, 52, 45, 52, 40, 47, 40, 47, 45, 52, 45, 52, 45, 52, 45, 52,
  50, 57, 50, 57, 45, 52, 45, 52, 40, 47, 40, 47, 45, 52, 45, 52];
const BEAT = 60 / 148;
export const noteFrequency = midi => 440 * 2 ** ((midi - 69) / 12);

export class KorobeinikiBgm {
  constructor({ contextFactory, onChange = () => {} } = {}) {
    this.contextFactory = contextFactory || (() => {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) throw new Error("이 브라우저는 Web Audio를 지원하지 않습니다.");
      return new AudioContextClass();
    });
    this.onChange = onChange;
    this.context = null;
    this.master = null;
    this.enabled = true;
    this.volume = .25;
    this.requested = false;
    this.running = false;
    this.error = null;
    this.timer = null;
    this.generation = 0;
    this.noteIndex = 0;
    this.bassIndex = 0;
    this.nextNoteTime = null;
    this.nextBassTime = null;
    this.voices = new Set();
  }

  notify() { this.onChange(); }

  fail(error) {
    this.error = error instanceof Error ? error.message : String(error);
    this.running = false;
    this.clearTimer();
    this.stopVoices();
    this.notify();
  }

  ensureContext() {
    if (this.context) return;
    this.context = this.contextFactory();
    this.master = this.context.createGain();
    this.master.gain.setValueAtTime(this.volume, this.context.currentTime);
    this.master.connect(this.context.destination);
  }

  async play() {
    this.requested = true;
    if (!this.enabled || this.error) return false;
    if (this.running) return true;
    const generation = this.generation;
    try {
      // AudioContext 생성과 resume 호출은 시작 버튼의 사용자 제스처 안에서 실행됩니다.
      this.ensureContext();
      await this.context.resume();
      if (generation !== this.generation || !this.requested || !this.enabled) return false;
      if (this.running) return true;
      if (this.nextNoteTime === null) {
        this.nextNoteTime = this.context.currentTime + .025;
        this.nextBassTime = this.nextNoteTime;
      }
      this.running = true;
      this.schedule();
      this.timer = setInterval(() => this.schedule(), 25);
      this.notify();
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  schedule() {
    if (!this.running || this.context.state !== "running") return;
    const now = this.context.currentTime;
    // 백그라운드 타이머가 지연되더라도 지난 음표가 한꺼번에 울리지 않게 합니다.
    this.nextNoteTime = Math.max(this.nextNoteTime, now);
    this.nextBassTime = Math.max(this.nextBassTime, now);
    while (this.nextNoteTime < now + .12) {
      const [note, beats] = MELODY[this.noteIndex];
      this.tone(note, this.nextNoteTime, beats * BEAT * .88, "square", .09);
      this.nextNoteTime += beats * BEAT;
      this.noteIndex = (this.noteIndex + 1) % MELODY.length;
    }
    while (this.nextBassTime < now + .12) {
      this.tone(BASS[this.bassIndex], this.nextBassTime, BEAT * .7, "triangle", .16);
      this.nextBassTime += BEAT;
      this.bassIndex = (this.bassIndex + 1) % BASS.length;
    }
  }

  tone(note, time, duration, type, level) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(noteFrequency(note), time);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(level, time + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      this.voices.delete(oscillator);
    };
    oscillator.start(time);
    oscillator.stop(time + duration + .015);
  }

  clearTimer() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  suspend() {
    this.generation++;
    this.running = false;
    this.clearTimer();
    // 오디오 시계를 멈춰 이미 예약된 음표와 현재 재생 위치를 그대로 보존합니다.
    if (this.context && this.context.state !== "closed") {
      this.context.suspend().catch(error => this.fail(error));
    }
    this.notify();
  }

  pause() {
    this.requested = false;
    this.suspend();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.suspend();
    else if (this.requested) void this.play();
    this.notify();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .02);
    this.notify();
  }

  stopVoices() {
    for (const voice of this.voices) {
      try { voice.stop(); } catch { /* 종료된 음표는 다시 중지하지 않습니다. */ }
    }
    this.voices.clear();
  }

  restart() {
    this.generation++;
    this.clearTimer();
    this.stopVoices();
    this.running = false;
    this.noteIndex = 0;
    this.bassIndex = 0;
    this.nextNoteTime = null;
    this.nextBassTime = null;
    return this.play();
  }

  dispose() {
    this.requested = false;
    this.generation++;
    this.running = false;
    this.clearTimer();
    this.stopVoices();
    if (this.context && this.context.state !== "closed") void this.context.close();
  }
}
