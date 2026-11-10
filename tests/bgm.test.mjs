import test from "node:test";
import assert from "node:assert/strict";
import { KorobeinikiBgm, MELODY, noteFrequency } from "../src/bgm.js";

class FakeContext {
  constructor() {
    this.currentTime = 0;
    this.state = "suspended";
    this.destination = {};
    this.oscillators = [];
  }
  createGain() {
    return {
      gain: {
        value: 0,
        setValueAtTime(value) { this.value = value; },
        linearRampToValueAtTime(value) { this.value = value; },
        exponentialRampToValueAtTime(value) { this.value = value; },
        setTargetAtTime(value) { this.value = value; },
      },
      connect() {}, disconnect() {},
    };
  }
  createOscillator() {
    const oscillator = {
      frequency: { setValueAtTime(value) { this.value = value; } },
      connect() {}, disconnect() {},
      start(time) { this.startTime = time; },
      stop(time) {
        this.stopTime = time;
        if (time === undefined) { this.stopped = true; this.onended?.(); }
      },
    };
    this.oscillators.push(oscillator);
    return oscillator;
  }
  async resume() { this.state = "running"; }
  async suspend() { this.state = "suspended"; }
  async close() { this.state = "closed"; }
}

function fixture(t) {
  const context = new FakeContext();
  let creations = 0;
  const music = new KorobeinikiBgm({ contextFactory: () => { creations++; return context; } });
  t.after(() => music.dispose());
  return { music, context, creations: () => creations };
}

test("첫 사용자 재생 요청 전에는 AudioContext나 타이머를 만들지 않는다", t => {
  const { music, creations } = fixture(t);
  assert.equal(creations(), 0);
  assert.equal(music.context, null);
  assert.equal(music.timer, null);
});

test("코로베이니카 첫 선율과 MIDI 음높이가 정확하다", () => {
  assert.deepEqual(MELODY.slice(0, 8).map(([note]) => note), [76, 71, 72, 74, 72, 71, 69, 69]);
  assert.ok(MELODY.every(([note, beats]) => note > 0 && beats > 0));
  assert.equal(noteFrequency(69), 440);
  assert.ok(Math.abs(noteFrequency(76) - 659.255) < .001);
});

test("멜로디와 베이스를 서로 다른 파형으로 예약하고 중복 재생하지 않는다", async t => {
  const { music, context, creations } = fixture(t);
  assert.equal(await music.play(), true);
  assert.equal(music.running, true);
  assert.equal(context.state, "running");
  assert.equal(context.oscillators.length, 2);
  assert.deepEqual(context.oscillators.map(node => node.type), ["square", "triangle"]);
  assert.equal(context.oscillators[0].frequency.value, noteFrequency(76));
  const timer = music.timer;
  await music.play();
  assert.equal(music.timer, timer);
  assert.equal(context.oscillators.length, 2);
  assert.equal(creations(), 1);
});

test("일시정지는 오디오 시계를 멈추고 재개 시 같은 위치에서 이어진다", async t => {
  const { music, context } = fixture(t);
  await music.play();
  const next = music.nextNoteTime;
  const index = music.noteIndex;
  music.pause();
  assert.equal(context.state, "suspended");
  assert.equal(music.running, false);
  assert.equal(music.timer, null);
  assert.equal(music.requested, false);
  assert.ok(context.oscillators.every(node => !node.stopped));
  await music.play();
  assert.equal(context.state, "running");
  assert.equal(music.nextNoteTime, next);
  assert.equal(music.noteIndex, index);
});

test("BGM 끄기는 즉시 멈추고 플레이 중 켜면 이어서 재생한다", async t => {
  const { music, context } = fixture(t);
  await music.play();
  music.setEnabled(false);
  assert.equal(music.running, false);
  assert.equal(context.state, "suspended");
  assert.equal(music.requested, true);
  music.setEnabled(true);
  await Promise.resolve();
  assert.equal(music.running, true);
});

test("시작 전이나 일시정지 중 BGM을 켜도 임의로 재생하지 않는다", async t => {
  const { music, creations } = fixture(t);
  music.setEnabled(false);
  music.setEnabled(true);
  assert.equal(creations(), 0);
  await music.play();
  music.pause();
  music.setEnabled(false);
  music.setEnabled(true);
  await Promise.resolve();
  assert.equal(music.running, false);
  assert.equal(music.requested, false);
});

test("음악을 끈 채 시작한 게임은 AudioContext를 만들지 않는다", async t => {
  const { music, creations } = fixture(t);
  music.setEnabled(false);
  await music.restart();
  assert.equal(creations(), 0);
  assert.equal(music.running, false);
  music.setEnabled(true);
  await Promise.resolve();
  assert.equal(creations(), 1);
  assert.equal(music.running, true);
});

test("볼륨 변경은 마스터 게인에 적용하고 0~100% 범위를 유지한다", async t => {
  const { music } = fixture(t);
  music.setVolume(.7);
  await music.play();
  assert.equal(music.master.gain.value, .7);
  music.setVolume(0);
  assert.equal(music.master.gain.value, 0);
  music.setVolume(2);
  assert.equal(music.volume, 1);
  music.setVolume(-1);
  assert.equal(music.volume, 0);
});

test("재시작은 기존 음표를 정리하고 첫 음부터 다시 시작한다", async t => {
  const { music, context, creations } = fixture(t);
  await music.play();
  const previousVoices = [...context.oscillators];
  music.noteIndex = 30;
  await music.restart();
  assert.ok(previousVoices.every(node => node.stopped));
  assert.equal(music.noteIndex, 1);
  assert.equal(creations(), 1);
  assert.equal(context.oscillators.at(-2).frequency.value, noteFrequency(76));
});

test("곡 끝에서 첫 음으로 반복한다", async t => {
  const { music, context } = fixture(t);
  await music.play();
  music.noteIndex = MELODY.length - 1;
  context.currentTime = music.nextNoteTime;
  music.schedule();
  assert.equal(music.noteIndex, 0);
  context.currentTime = music.nextNoteTime;
  music.schedule();
  assert.equal(music.noteIndex, 1);
  assert.ok(context.oscillators.some(node => node.startTime === context.currentTime && node.frequency.value === noteFrequency(76)));
});

test("비동기 resume 직후 일시정지해도 뒤늦게 음악이 시작되지 않는다", async t => {
  const { music, context } = fixture(t);
  let resolve;
  context.resume = () => new Promise(done => { resolve = done; });
  const playing = music.play();
  music.pause();
  resolve();
  assert.equal(await playing, false);
  assert.equal(music.running, false);
  assert.equal(music.timer, null);
  assert.equal(context.oscillators.length, 0);
});

test("Web Audio 미지원·재생 차단은 예외를 전파하지 않는다", async () => {
  const unsupported = new KorobeinikiBgm({ contextFactory: () => { throw new Error("미지원"); } });
  assert.equal(await unsupported.play(), false);
  assert.equal(unsupported.error, "미지원");
  unsupported.dispose();
  const context = new FakeContext();
  context.resume = async () => { throw new Error("재생 차단"); };
  const denied = new KorobeinikiBgm({ contextFactory: () => context });
  assert.equal(await denied.play(), false);
  assert.equal(denied.error, "재생 차단");
  assert.equal(denied.timer, null);
  denied.dispose();
});

test("정리 시 타이머·음표·AudioContext를 닫는다", async t => {
  const { music, context } = fixture(t);
  await music.play();
  music.dispose();
  assert.equal(context.state, "closed");
  assert.equal(music.timer, null);
  assert.equal(music.voices.size, 0);
  assert.equal(music.running, false);
});
