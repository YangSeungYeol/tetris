"use strict";

const COLS = 10;
const ROWS = 20;
const DROP_INTERVAL = 700;
const LINE_SCORES = [0, 100, 300, 500, 800];
const SHAPES = [
  [[1, 1, 1, 1]],
  [[2, 0, 0], [2, 2, 2]],
  [[0, 0, 3], [3, 3, 3]],
  [[4, 4], [4, 4]],
  [[0, 5, 5], [5, 5, 0]],
  [[0, 6, 0], [6, 6, 6]],
  [[7, 7, 0], [0, 7, 7]],
];
const COLORS = [null, "#7ccbd4", "#789ae6", "#e2ae78", "#e5cf7a", "#9cce98", "#b39bd7", "#df8e92"];

// 게임 규칙은 화면과 분리해 브라우저 외부에서도 검증할 수 있게 합니다.
class TetrisGame {
  constructor(random = Math.random) {
    this.random = random;
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.piece = null;
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.state = "idle";
  }

  start() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.state = "playing";
    this.spawn();
  }

  spawn() {
    if (this.bag.length === 0) {
      this.bag = SHAPES.map((_, index) => index);
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    const matrix = SHAPES[this.bag.pop()].map(row => [...row]);
    this.piece = { matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: 0 };
    if (!this.canPlace(matrix, this.piece.x, this.piece.y)) {
      this.piece = null;
      this.state = "over";
    }
  }

  canPlace(matrix, offsetX, offsetY) {
    return matrix.every((row, y) => row.every((cell, x) => {
      if (!cell) return true;
      const boardX = offsetX + x;
      const boardY = offsetY + y;
      return boardX >= 0 && boardX < COLS && boardY >= 0 && boardY < ROWS && this.board[boardY][boardX] === 0;
    }));
  }

  move(dx, dy) {
    if (this.state !== "playing" || !this.piece) return false;
    const { matrix, x, y } = this.piece;
    if (!this.canPlace(matrix, x + dx, y + dy)) return false;
    this.piece.x += dx;
    this.piece.y += dy;
    return true;
  }

  rotate() {
    if (this.state !== "playing" || !this.piece) return false;
    const { matrix, x, y } = this.piece;
    const rotated = matrix[0].map((_, column) => matrix.map(row => row[column]).reverse());
    if (!this.canPlace(rotated, x, y)) return false;
    this.piece.matrix = rotated;
    return true;
  }

  step() {
    if (this.state !== "playing") return;
    if (!this.move(0, 1)) this.lock();
  }

  hardDrop() {
    if (this.state !== "playing") return;
    while (this.move(0, 1)) { /* 바닥이나 다른 블록에 닿을 때까지 내립니다. */ }
    this.lock();
  }

  lock() {
    this.piece.matrix.forEach((row, y) => row.forEach((cell, x) => {
      if (cell) this.board[this.piece.y + y][this.piece.x + x] = cell;
    }));
    this.clearLines();
    this.spawn();
  }

  clearLines() {
    const remaining = this.board.filter(row => row.some(cell => cell === 0));
    const cleared = ROWS - remaining.length;
    if (cleared === 0) return 0;
    this.board = [
      ...Array.from({ length: cleared }, () => Array(COLS).fill(0)),
      ...remaining,
    ];
    this.score += LINE_SCORES[cleared];
    this.lines += cleared;
    return cleared;
  }

  togglePause() {
    if (this.state === "playing") this.state = "paused";
    else if (this.state === "paused") this.state = "playing";
  }
}

