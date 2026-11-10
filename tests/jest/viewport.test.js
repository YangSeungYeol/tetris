import { test, expect } from '@jest/globals';
import { getBoardLayout } from '../../src/viewport.js';

test('작은 세로 화면에서도 게임판은 화면 폭 안에 들어간다', () => {
  const layout = getBoardLayout(320, 568, true);
  expect(layout.landscape).toBe(false);
  expect(layout.width).toBeGreaterThan(0);
  expect(layout.width).toBeLessThanOrEqual(320 - 64);
  expect(layout.height).toBe(layout.width * 2);
});

test('가로 모바일 화면에서 게임판이 남은 높이를 넘지 않는다', () => {
  const layout = getBoardLayout(568, 320, true);
  expect(layout.landscape).toBe(true);
  expect(layout.height).toBeLessThanOrEqual(320 - 100);
});

test('큰 PC 화면에서도 게임판은 최대 300×600이다', () => {
  const layout = getBoardLayout(1440, 1000, false);
  expect(layout.width).toBe(300);
  expect(layout.height).toBe(600);
});
