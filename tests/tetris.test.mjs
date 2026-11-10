import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// 실제 빌드에 포함되는 게임 엔진을 실행합니다. 외부 테스트 패키지는 없습니다.
const html = readFileSync(new URL("../game.html", import.meta.url), "utf8");
const engineSource = readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const { TetrisGame, SHAPES, DROP_INTERVAL } = vm.runInNewContext(
  `${engineSource}\n;({ TetrisGame, SHAPES, DROP_INTERVAL });`,
);
const snapshot = value => JSON.stringify(value);
const filledCells = game => game.board.flat().filter(Boolean).length;

test("배포 HTML에 최신 게임 엔진이 포함된다", () => {
  const embeddedEngine = html.match(/<script id="game-engine">([\s\S]*?)<\/script>/)[1];
  assert.equal(embeddedEngine.trim(), engineSource.trim());
});

function gameWithPiece(matrix, x = 3, y = 0) {
  const game = new TetrisGame(() => 0);
  game.state = "playing";
  game.piece = { matrix: structuredClone(matrix), x, y };
  return game;
}

test("시작 전에는 빈 10×20 게임판이고 조작으로 시작되지 않는다", () => {
  const game = new TetrisGame();
  assert.equal(game.state, "idle");
  assert.equal(game.board.length, 20);
  assert.ok(game.board.every(row => row.length === 10));
  assert.equal(filledCells(game), 0);
  game.move(1, 0);
  game.rotate();
  game.step();
  game.hardDrop();
  game.togglePause();
  assert.equal(game.state, "idle");
  assert.equal(game.piece, null);
  assert.equal(DROP_INTERVAL, 700);
});

test("시작하면 블록이 나오며 각 7개 묶음에 기본 블록 7종이 한 번씩 포함된다", () => {
  const game = new TetrisGame(() => 0.42);
  game.start();
  assert.equal(game.state, "playing");
  for (let batch = 0; batch < 2; batch++) {
    const types = new Set();
    for (let i = 0; i < 7; i++) {
      if (batch !== 0 || i !== 0) game.spawn();
      const occupied = game.piece.matrix.flat().filter(Boolean);
      assert.equal(occupied.length, 4);
      assert.equal(new Set(occupied).size, 1);
      types.add(occupied[0]);
    }
    assert.equal(types.size, 7);
  }
});

test("좌우 벽과 바닥을 통과하지 않는다", () => {
  const game = gameWithPiece([[4, 4], [4, 4]], 0, 18);
  assert.equal(game.move(-1, 0), false);
  assert.equal(game.move(0, 1), false);
  assert.equal(game.move(8, 0), true);
  assert.equal(game.move(1, 0), false);
  assert.equal(game.piece.x, 8);
  assert.equal(game.piece.y, 18);
  assert.equal(filledCells(game), 0);
});

test("기존 블록과 충돌하는 이동을 거부한다", () => {
  const game = gameWithPiece([[4, 4], [4, 4]], 3, 5);
  game.board[5][5] = 2;
  game.board[7][3] = 2;
  assert.equal(game.move(1, 0), false);
  assert.equal(game.move(0, 1), false);
  assert.equal(game.move(-1, 0), true);
});

test("7종의 블록은 네 번 회전하면 원래 모양으로 돌아오고 블록 수를 보존한다", () => {
  const originalShapes = snapshot(SHAPES);
  for (const shape of SHAPES) {
    const game = gameWithPiece(shape, 3, 5);
    const original = snapshot(game.piece.matrix);
    for (let i = 0; i < 4; i++) {
      assert.equal(game.rotate(), true);
      assert.equal(game.piece.matrix.flat().filter(Boolean).length, 4);
    }
    assert.equal(snapshot(game.piece.matrix), original);
  }
  assert.equal(snapshot(SHAPES), originalShapes);
});

test("벽·바닥·기존 블록에 겹치는 회전은 원래 모양과 위치를 유지한다", () => {
  const cases = [
    gameWithPiece([[1], [1], [1], [1]], 9, 2),
    gameWithPiece([[1, 1, 1, 1]], 3, 19),
    gameWithPiece([[1], [1], [1], [1]], 3, 2),
  ];
  cases[2].board[2][5] = 2;
  for (const game of cases) {
    const before = snapshot(game.piece);
    assert.equal(game.rotate(), false);
    assert.equal(snapshot(game.piece), before);
  }
});

test("바닥에 도달한 블록을 고정하고 다음 블록을 생성한다", () => {
  const game = gameWithPiece([[4, 4], [4, 4]], 3, 17);
  game.step();
  assert.equal(game.piece.y, 18);
  assert.equal(filledCells(game), 0);
  game.step();
  assert.equal(filledCells(game), 4);
  assert.equal(game.piece.y, 0);
  assert.equal(game.state, "playing");
});

test("즉시 낙하는 중간 장애물을 통과하지 않고 바로 고정한다", () => {
  const game = gameWithPiece([[1], [1], [1], [1]], 4);
  game.board[10][4] = 2;
  game.hardDrop();
  assert.equal(filledCells(game), 5);
  for (let y = 6; y < 10; y++) assert.equal(game.board[y][4], 1);
  assert.equal(game.board[10][4], 2);
  assert.equal(game.board[11][4], 0);
  assert.equal(game.piece.y, 0);
});

for (const [count, expected] of [[1, 100], [2, 300], [3, 500], [4, 800]]) {
  test(`${count}줄을 동시에 제거하면 ${expected}점이고 위 블록이 정확히 내려온다`, () => {
    const game = gameWithPiece([[1], [1], [1], [1]], 4);
    for (let y = 20 - count; y < 20; y++) {
      game.board[y].fill(2);
      game.board[y][4] = 0;
    }
    game.board[5][2] = 3;
    game.hardDrop();
    assert.equal(game.score, expected);
    assert.equal(game.lines, count);
    assert.equal(game.board[5 + count][2], 3);
    assert.equal(filledCells(game), 5 - count);
    assert.equal(game.board.length, 20);
    assert.ok(game.board.every(row => row.length === 10));
    assert.ok(game.board.slice(0, count).every(row => row.every(cell => cell === 0)));
  });
}

test("여러 번 제거한 점수와 줄 수는 누적되고 불완전한 줄은 유지된다", () => {
  const game = new TetrisGame();
  game.board[19].fill(1);
  assert.equal(game.clearLines(), 1);
  game.board[18].fill(2);
  game.board[19].fill(3);
  assert.equal(game.clearLines(), 2);
  game.board[19][0] = 4;
  assert.equal(game.clearLines(), 0);
  assert.equal(game.score, 400);
  assert.equal(game.lines, 3);
  assert.equal(game.board[19][0], 4);
});

test("일시정지 중에는 모든 블록 조작과 자동 낙하가 멈추고 재개 후 이어진다", () => {
  const game = gameWithPiece([[0, 6, 0], [6, 6, 6]], 3, 4);
  game.togglePause();
  assert.equal(game.state, "paused");
  const before = snapshot(game);
  game.move(-1, 0);
  game.rotate();
  game.step();
  game.hardDrop();
  assert.equal(snapshot(game), before);
  game.togglePause();
  assert.equal(game.state, "playing");
  game.step();
  assert.equal(game.piece.y, 5);
});

test("새 블록을 생성할 공간이 없으면 종료하고 이후 조작을 무시한다", () => {
  const game = gameWithPiece([[4, 4], [4, 4]], 0, 18);
  game.board[0][4] = 2;
  game.bag = [3];
  game.score = 300;
  game.step();
  assert.equal(game.state, "over");
  assert.equal(game.piece, null);
  assert.equal(game.score, 300);
  const before = snapshot(game);
  game.move(1, 0);
  game.rotate();
  game.step();
  game.hardDrop();
  game.togglePause();
  assert.equal(snapshot(game), before);
});

test("재시작은 일시정지·게임 종료 상태와 점수·게임판을 모두 초기화한다", () => {
  for (const state of ["playing", "paused", "over"]) {
    const game = new TetrisGame();
    game.state = state;
    game.board[19][0] = 3;
    game.score = 800;
    game.lines = 4;
    game.start();
    assert.equal(game.state, "playing");
    assert.equal(game.score, 0);
    assert.equal(game.lines, 0);
    assert.equal(filledCells(game), 0);
    assert.equal(game.piece.y, 0);
  }
});
