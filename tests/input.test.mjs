import test from "node:test";
import assert from "node:assert/strict";
import { getBoardLayout } from "../src/viewport.js";
import { createHoldRepeater } from "../src/touch.js";

for (const [width, height] of [[320, 568], [360, 640], [375, 667], [390, 844], [412, 915], [768, 1024], [667, 375], [844, 390]]) {
  test(`${width}×${height}에서 게임판이 화면에 맞고 10×20 비율을 유지한다`, () => {
    const layout = getBoardLayout(width, height, true);
    assert.equal(layout.width % 10, 0);
    assert.equal(layout.height, layout.width * 2);
    assert.ok(layout.width <= (layout.landscape ? width / 2 - 64 : width - 64));
    assert.ok(layout.height <= height - (layout.landscape ? 100 : 320));
    assert.equal(layout.landscape, width > height);
  });
}

test("데스크톱 게임판은 최대 300×600이고 화면 높이가 줄면 축소된다", () => {
  assert.deepEqual(getBoardLayout(1280, 1000, false), { landscape: false, width: 300, height: 600 });
  const small = getBoardLayout(1024, 768, false);
  assert.ok(small.width < 300);
  assert.equal(small.height, small.width * 2);
});

function clock() {
  let now = 0;
  let id = 0;
  const jobs = new Map();
  return {
    jobs,
    setTimeout(fn, delay) { jobs.set(++id, { fn, time: now + delay }); return id; },
    clearTimeout(id) { jobs.delete(id); },
    tick(duration) {
      const target = now + duration;
      while (true) {
        const next = [...jobs.entries()].filter(([, job]) => job.time <= target).sort((a, b) => a[1].time - b[1].time)[0];
        if (!next) break;
        jobs.delete(next[0]);
        now = next[1].time;
        next[1].fn();
      }
      now = target;
    },
  };
}

test("길게 누르기는 즉시 한 번 실행하고 대기 후 일정 간격으로 반복한다", () => {
  const time = clock();
  const repeat = createHoldRepeater(time);
  let moves = 0;
  repeat.start(() => moves++);
  assert.equal(moves, 1);
  time.tick(239);
  assert.equal(moves, 1);
  time.tick(1);
  assert.equal(moves, 2);
  time.tick(170);
  assert.equal(moves, 4);
  repeat.stop();
  assert.equal(time.jobs.size, 0);
});

test("손을 떼거나 취소하면 예약된 반복과 늦게 도착한 콜백을 무시한다", () => {
  const time = clock();
  const repeat = createHoldRepeater(time);
  let moves = 0;
  repeat.start(() => moves++);
  const stale = [...time.jobs.values()][0].fn;
  repeat.stop();
  stale();
  time.tick(1000);
  assert.equal(moves, 1);
  assert.equal(time.jobs.size, 0);
});

test("다른 방향을 누르면 이전 반복을 교체하고 한 방향만 반복한다", () => {
  const time = clock();
  const repeat = createHoldRepeater(time);
  let left = 0;
  let right = 0;
  repeat.start(() => left++);
  repeat.start(() => right++);
  time.tick(410);
  assert.equal(left, 1);
  assert.equal(right, 4);
  assert.equal(time.jobs.size, 1);
  repeat.stop();
});

test("입력 도중 게임 종료·일시정지가 발생하면 새 반복을 예약하지 않는다", () => {
  const time = clock();
  const repeat = createHoldRepeater(time);
  repeat.start(() => repeat.stop());
  assert.equal(time.jobs.size, 0);
  time.tick(1000);
  assert.equal(time.jobs.size, 0);
});
