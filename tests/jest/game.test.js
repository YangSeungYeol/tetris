import { test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../src/game.js', import.meta.url), 'utf8');
const TetrisGame = vm.runInNewContext(`${source}\n;TetrisGame;`);

function clearRows(game, count) {
  for (let row = 20 - count; row < 20; row++) game.board[row].fill(1);
  return game.clearLines();
}

test('시작 전과 시작 직후에는 레벨 1, 낙하 간격 700ms다', () => {
  const game = new TetrisGame(() => 0);
  expect(game.level).toBe(1);
  expect(game.dropInterval).toBe(700);
  game.start();
  expect(game.level).toBe(1);
  expect(game.dropInterval).toBe(700);
});

test('9줄까지 속도를 유지하고 10줄에서 레벨 2, 640ms가 된다', () => {
  const game = new TetrisGame(() => 0);
  clearRows(game, 4);
  clearRows(game, 4);
  clearRows(game, 1);
  expect(game.lines).toBe(9);
  expect(game.level).toBe(1);
  expect(game.dropInterval).toBe(700);
  clearRows(game, 1);
  expect(game.level).toBe(2);
  expect(game.dropInterval).toBe(640);
});

test('여러 줄을 한꺼번에 지워 경계를 넘어도 누적 줄 수로 레벨을 계산한다', () => {
  const game = new TetrisGame(() => 0);
  for (let i = 0; i < 4; i++) clearRows(game, 4);
  clearRows(game, 2);
  expect(game.lines).toBe(18);
  clearRows(game, 4);
  expect(game.lines).toBe(22);
  expect(game.level).toBe(3);
  expect(game.dropInterval).toBe(580);
  expect(game.score).toBe(4300);
});

test('레벨이 오를수록 빨라지고 낙하 간격은 최소 100ms를 유지한다', () => {
  const game = new TetrisGame(() => 0);
  let previous = game.dropInterval;
  for (let level = 2; level <= 11; level++) {
    clearRows(game, 4);
    clearRows(game, 4);
    clearRows(game, 2);
    expect(game.level).toBe(level);
    expect(game.dropInterval).toBe(previous - 60);
    previous = game.dropInterval;
  }
  expect(game.dropInterval).toBe(100);
  for (let i = 0; i < 100; i++) clearRows(game, 4);
  expect(game.level).toBe(51);
  expect(game.dropInterval).toBe(100);
});

test('빈 줄 검사나 일시정지·재개는 레벨과 속도를 바꾸지 않는다', () => {
  const game = new TetrisGame(() => 0);
  game.start();
  clearRows(game, 4);
  clearRows(game, 4);
  clearRows(game, 2);
  expect(game.clearLines()).toBe(0);
  for (let i = 0; i < 2; i++) {
    game.togglePause();
    expect(game.level).toBe(2);
    expect(game.dropInterval).toBe(640);
  }
});

test.each(['playing', 'paused', 'over'])('%s 상태에서 재시작하면 레벨과 속도가 초기화된다', state => {
  const game = new TetrisGame(() => 0);
  clearRows(game, 4);
  clearRows(game, 4);
  clearRows(game, 2);
  game.state = state;
  game.start();
  expect(game.level).toBe(1);
  expect(game.dropInterval).toBe(700);
  expect(game.lines).toBe(0);
  expect(game.score).toBe(0);
});

test('두 줄을 제거하면 300점이며 빈 줄이 보충된다', () => {
  const game = new TetrisGame(() => 0);
  game.board[18].fill(1);
  game.board[19].fill(1);
  expect(game.clearLines()).toBe(2);
  expect(game.score).toBe(300);
  expect(game.lines).toBe(2);
  expect(game.board).toHaveLength(20);
  expect(game.board.flat().every(cell => cell === 0)).toBe(true);
});

test('일시정지 중에는 블록이 이동하지 않는다', () => {
  const game = new TetrisGame(() => 0);
  game.start();
  const x = game.piece.x;
  const y = game.piece.y;
  game.togglePause();
  expect(game.state).toBe('paused');
  expect(game.move(1, 0)).toBe(false);
  game.step();
  expect(game.piece.x).toBe(x);
  expect(game.piece.y).toBe(y);
});
