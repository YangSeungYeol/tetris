import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, AppBar, Button, ButtonGroup, Card,
  CardContent, Chip, Container, CssBaseline, FormControlLabel, Grid, Slider,
  Stack, SvgIcon, Switch, ThemeProvider, Toolbar, Typography, createTheme, useMediaQuery,
} from "@mui/material";
import { KorobeinikiBgm } from "./bgm.js";
import { getBoardLayout } from "./viewport.js";
import { createHoldRepeater } from "./touch.js";

// Material UI 기본 테마와 반응형 컴포넌트만 사용합니다. 수작업 CSS는 없습니다.
const theme = createTheme();
const STATES = { idle: "대기 중", playing: "플레이 중", paused: "일시정지", over: "게임 종료" };
const LABELS = { idle: "게임 시작", playing: "일시정지", paused: "계속하기", over: "다시 도전하기" };
const TOUCH_ACTIONS = [
  { action: "left", label: "왼쪽 이동", path: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20z", repeat: true },
  { action: "right", label: "오른쪽 이동", path: "m12 4-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", repeat: true },
  { action: "rotate", label: "블록 회전", path: "M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.09A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" },
  { action: "down", label: "빠르게 내리기", path: "M11 4v12.17l-5.59-5.58L4 12l8 8 8-8-1.41-1.41L13 16.17V4z", repeat: true },
];

function drawBoard(canvas, game) {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const cell = width / COLS;
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#283449";
  ctx.lineWidth = .5;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(x * cell, 0);
    ctx.lineTo(x * cell, height);
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.moveTo(0, y * cell);
    ctx.lineTo(width, y * cell);
  }
  ctx.stroke();
  const paint = (x, y, value) => {
    ctx.fillStyle = COLORS[value];
    ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  };
  game.board.forEach((row, y) => row.forEach((value, x) => { if (value) paint(x, y, value); }));
  game.piece?.matrix.forEach((row, y) => row.forEach((value, x) => {
    if (value) paint(game.piece.x + x, game.piece.y + y, value);
  }));
  if (game.state !== "playing") {
    ctx.fillStyle = "#111827d9";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = `600 ${Math.min(24, Math.floor(width / 10))}px sans-serif`;
    ctx.fillText(game.state === "idle" ? "준비되셨나요?" : STATES[game.state], width / 2, height / 2 - 12);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `${Math.max(8, Math.min(14, Math.floor(width / 18)))}px sans-serif`;
    ctx.fillText(game.state === "over" ? `${game.score.toLocaleString("ko-KR")}점` :
      game.state === "paused" ? "계속하기로 재개" : "시작을 눌러주세요", width / 2, height / 2 + 18);
  }
}

function App() {
  const compact = useMediaQuery(theme.breakpoints.down("md"));
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const [viewport, setViewport] = useState(() => ({ width: innerWidth, height: window.visualViewport?.height || innerHeight }));
  const layout = getBoardLayout(viewport.width, viewport.height, compact);
  const showTouch = compact || coarsePointer;
  const gameRef = useRef(null);
  if (!gameRef.current) gameRef.current = new TetrisGame();
  const holdRef = useRef(null);
  if (!holdRef.current) holdRef.current = createHoldRepeater();
  const canvasRef = useRef(null);
  const clockRef = useRef({ last: performance.now(), elapsed: 0 });
  const phaseRef = useRef("idle");
  const [view, setView] = useState({ state: "idle", score: 0, lines: 0 });
  const [boardError, setBoardError] = useState(null);
  const [audio, setAudio] = useState({ enabled: true, volume: 25, running: false, error: null });
  const musicRef = useRef(null);
  if (!musicRef.current) {
    musicRef.current = new KorobeinikiBgm({ onChange: () => {
      const music = musicRef.current;
      setAudio({ enabled: music.enabled, volume: Math.round(music.volume * 100), running: music.running, error: music.error });
    } });
  }

  const resetClock = useCallback(() => {
    clockRef.current = { last: performance.now(), elapsed: 0 };
  }, []);

  const publish = useCallback(() => {
    const game = gameRef.current;
    if (phaseRef.current !== game.state) {
      phaseRef.current = game.state;
      if (game.state === "playing") void musicRef.current.play();
      else {
        holdRef.current.stop();
        musicRef.current.pause();
      }
    }
    setView({ state: game.state, score: game.score, lines: game.lines });
    drawBoard(canvasRef.current, game);
  }, []);

  const activateMusic = useCallback(() => {
    const music = musicRef.current;
    if (gameRef.current.state === "playing" && music.enabled && !music.running) void music.play();
  }, []);

  const startGame = useCallback(({ withAudio = true } = {}) => {
    holdRef.current.stop();
    gameRef.current.start();
    phaseRef.current = "playing";
    resetClock();
    if (withAudio) void musicRef.current.restart();
    publish();
  }, [publish, resetClock]);

  const togglePause = useCallback(() => {
    holdRef.current.stop();
    gameRef.current.togglePause();
    resetClock();
    publish();
  }, [publish, resetClock]);

  const perform = useCallback(action => {
    const game = gameRef.current;
    if (game.state !== "playing") return;
    activateMusic();
    if (action === "left") game.move(-1, 0);
    if (action === "right") game.move(1, 0);
    if (action === "rotate") game.rotate();
    if (action === "down") { game.step(); resetClock(); }
    if (action === "drop") { game.hardDrop(); resetClock(); }
    publish();
  }, [activateMusic, publish, resetClock]);

  useEffect(() => {
    const resize = () => {
      holdRef.current.stop();
      setViewport({ width: innerWidth, height: window.visualViewport?.height || innerHeight });
    };
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => { drawBoard(canvasRef.current, gameRef.current); }, [layout.width, layout.landscape]);

  useEffect(() => {
    if (!canvasRef.current?.getContext("2d")) {
      setBoardError("Canvas를 지원하는 최신 브라우저로 파일을 열어주세요.");
      return;
    }
    // 문서 이동 후에는 게임을 바로 시작하고 음악은 첫 사용자 조작에서 활성화합니다.
    if (location.hash === "#play" && gameRef.current.state === "idle") startGame({ withAudio: false });
    let frameId;
    const frame = time => {
      const clock = clockRef.current;
      const elapsed = Math.max(0, time - clock.last);
      clock.last = time;
      if (gameRef.current.state === "playing") {
        clock.elapsed += Math.min(elapsed, DROP_INTERVAL);
        if (clock.elapsed >= DROP_INTERVAL) {
          gameRef.current.step();
          clock.elapsed %= DROP_INTERVAL;
          publish();
        }
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    const keydown = event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const input = event.target instanceof Element ? event.target.closest("input, textarea, select, [role='slider']") : null;
      if (input && !["range", "checkbox"].includes(input.type)) return;
      const game = gameRef.current;
      if (event.code === "KeyP" && ["playing", "paused"].includes(game.state)) {
        event.preventDefault();
        if (!event.repeat) togglePause();
        return;
      }
      if (input && (input.type === "range" || event.code === "Space")) return;
      const action = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "rotate", ArrowDown: "down", Space: "drop" }[event.code];
      if (!action || !["playing", "paused"].includes(game.state)) return;
      event.preventDefault();
      if (event.repeat && ["rotate", "drop"].includes(action)) return;
      perform(action);
    };
    const stopHold = () => holdRef.current.stop();
    const autoPause = () => {
      stopHold();
      if (gameRef.current.state !== "playing") return;
      gameRef.current.togglePause();
      resetClock();
      publish();
    };
    const visibility = () => { if (document.hidden) autoPause(); };
    document.addEventListener("keydown", keydown);
    window.addEventListener("pointerup", stopHold);
    window.addEventListener("pointercancel", stopHold);
    window.addEventListener("blur", autoPause);
    window.addEventListener("pagehide", autoPause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frameId);
      stopHold();
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("pointerup", stopHold);
      window.removeEventListener("pointercancel", stopHold);
      window.removeEventListener("blur", autoPause);
      window.removeEventListener("pagehide", autoPause);
      document.removeEventListener("visibilitychange", visibility);
      musicRef.current.dispose();
    };
  }, [perform, publish, resetClock, startGame, togglePause]);

  const pointerProps = (action, repeat) => ({
    onPointerDown: event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      if (repeat) holdRef.current.start(() => perform(action));
      else perform(action);
    },
    onPointerUp: () => holdRef.current.stop(),
    onPointerCancel: () => holdRef.current.stop(),
    onLostPointerCapture: () => holdRef.current.stop(),
    onContextMenu: event => event.preventDefault(),
    onClick: event => { if (event.detail === 0) perform(action); },
  });

  const scorePanel = <Stack direction="row" spacing={1}>
    <Typography id="score" component="output" aria-label="현재 점수" variant={compact ? "h5" : "h4"} color="primary">
      {String(view.score).padStart(6, "0")}
    </Typography>
    <Chip id="status" role="status" label={STATES[view.state]} color={view.state === "playing" ? "success" : "default"} size="small" />
    <Chip label={<><span id="lines">{view.lines}</span>줄</>} variant="outlined" size="small" />
  </Stack>;

  const actionButtons = <Stack direction="row" spacing={1}>
    <Button id="primary-button" variant="contained" disabled={Boolean(boardError)} fullWidth
      onClick={view.state === "idle" || view.state === "over" ? () => startGame() : togglePause}>
      <span id="primary-label">{LABELS[view.state]}</span>
    </Button>
    <Button id="restart-button" variant="outlined" disabled={view.state === "idle" || Boolean(boardError)} fullWidth onClick={() => startGame()}>다시 시작</Button>
  </Stack>;

  const canvas = <Typography component="div" align="center">
    <canvas id="board" ref={canvasRef} width={layout.width} height={layout.height} onPointerDown={activateMusic}
      role="img" aria-label={`10열 20행 테트리스 게임판. ${STATES[view.state]}. 현재 점수 ${view.score}점.`}>
      이 브라우저는 Canvas를 지원하지 않습니다.
    </canvas>
  </Typography>;

  const touchPad = <Stack id="touch-controls" spacing={1} aria-label="터치 조작 버튼">
    <ButtonGroup variant="outlined" size="large" fullWidth aria-label="이동과 회전">
    {TOUCH_ACTIONS.map(({ action, label, path, repeat }) =>
      <Button key={action} id={`touch-${action}`} aria-label={label}
        disabled={view.state !== "playing" || Boolean(boardError)} {...pointerProps(action, repeat)}>
        <SvgIcon fontSize="large"><path d={path} /></SvgIcon>
      </Button>,
    )}
    </ButtonGroup>
      <Button id="touch-drop" variant="contained" size="large" fullWidth disabled={view.state !== "playing" || Boolean(boardError)}
        {...pointerProps("drop", false)}>즉시 떨어뜨리기</Button>
  </Stack>;

  const musicStatus = audio.error ? "음악 재생 불가" : !audio.enabled ? "꺼짐" :
    audio.running ? (audio.volume === 0 ? "음소거" : "재생 중") : view.state === "idle" ? "게임 시작 후 재생" :
      view.state === "over" ? "재생 종료" : view.state === "paused" ? "일시정지" : "첫 터치 또는 키보드 조작 후 재생";

  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <AppBar position="static"><Toolbar variant="dense">
      <Container maxWidth="md"><Stack direction="row" spacing={2}>
        <Typography variant="h6">테트리스</Typography>
        <Button id="instructions-link" color="inherit" component="a" href="index.html#how-to-play">플레이 방법</Button>
      </Stack></Container>
    </Toolbar></AppBar>
    <Container maxWidth="md" component="main">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined"><CardContent>
            {layout.landscape ? <Grid container spacing={1}>
              <Grid size={6}>{canvas}</Grid>
              <Grid size={6}><Stack spacing={1}>{scorePanel}{actionButtons}{touchPad}</Stack></Grid>
            </Grid> : <Stack spacing={1}>
              {scorePanel}{actionButtons}{canvas}{showTouch && touchPad}
            </Stack>}
            {boardError && <Alert severity="error">{boardError}</Alert>}
            <Typography id="overlay-description" variant="caption" color="text.secondary" aria-live="polite">
              {view.state === "over" ? `최종 점수 ${view.score.toLocaleString("ko-KR")}점. 다시 도전해보세요.` :
                view.state === "paused" ? "계속하기 버튼 또는 P 키로 재개하세요." : null}
            </Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            <Accordion defaultExpanded={!compact}>
              <AccordionSummary id="music-heading" aria-controls="music-panel"><Typography component="h2">배경음악</Typography></AccordionSummary>
              <AccordionDetails id="music-panel"><Stack spacing={1}>
                <FormControlLabel label="코로베이니카" control={
                  <Switch id="bgm-toggle" checked={audio.enabled} disabled={Boolean(audio.error)} onChange={(_, checked) => {
                    musicRef.current.setEnabled(checked);
                    if (checked) activateMusic();
                  }} />
                } />
                <Stack direction="row" spacing={2}>
                  <Typography id="volume-heading" variant="body2" color="text.secondary">볼륨</Typography>
                  <Typography id="volume-value" variant="body2">{audio.volume}%</Typography>
                </Stack>
                <Slider id="volume-slider" aria-labelledby="volume-heading" min={0} max={100} value={audio.volume}
                  valueLabelDisplay="auto" disabled={!audio.enabled || Boolean(audio.error)} onChange={(_, value) => {
                    musicRef.current.setVolume(value / 100);
                    activateMusic();
                  }} />
                <Typography id="bgm-status" variant="caption" color="text.secondary" role="status">{musicStatus}</Typography>
                {audio.error && <Alert severity="warning">음악을 재생할 수 없습니다. 게임은 계속할 수 있습니다.</Alert>}
              </Stack></AccordionDetails>
            </Accordion>
            <Alert severity="info">다른 창이나 앱으로 이동하면 게임과 음악이 멈춥니다. 돌아온 뒤 계속하기를 눌러주세요.</Alert>
            <Button component="a" href="index.html#how-to-play" variant="outlined" fullWidth>플레이 방법 보기</Button>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  </ThemeProvider>;
}

createRoot(document.getElementById("root")).render(<App />);
