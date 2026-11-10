import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import { createHoldRepeater } from '../../src/touch.js';

let repeater;

beforeEach(() => {
  jest.useFakeTimers();
  repeater = createHoldRepeater();
});

afterEach(() => {
  repeater.stop();
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('누르는 즉시 이동하고 일정 시간이 지난 뒤 반복한다', () => {
  const move = jest.fn();
  repeater.start(move);
  expect(move).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(239);
  expect(move).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1);
  expect(move).toHaveBeenCalledTimes(2);
  jest.advanceTimersByTime(85);
  expect(move).toHaveBeenCalledTimes(3);
});

test('손을 떼면 예약된 반복 이동을 취소한다', () => {
  const move = jest.fn();
  repeater.start(move);
  repeater.stop();
  jest.advanceTimersByTime(1000);
  expect(move).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
