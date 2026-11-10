# Node.js 설치부터 Jest 유닛 테스트 실행까지

이 문서는 `~/work/vibe-coding/tetris`의 테트리스 프로젝트에 Jest를 추가하는 안내서다. **문서 작성 단계이며, 아래 설치·설정 명령은 아직 실행하지 않았다.** 게임을 플레이하는 데에는 Node.js나 Jest가 필요하지 않다.

## 1. 현재 프로젝트 확인

- React와 Material UI를 사용하고, esbuild로 `index.html`과 `game.html`을 생성한다.
- `package.json`에 `"type": "module"`이 있어 JavaScript는 ESM 방식이다.
- 현재 `npm test`는 Jest가 아닌 Node.js 기본 테스트 러너(`node --test`)를 실행한다. 기존 테스트는 `tests/*.test.mjs`에 있으며 총 43개다.
- `src/viewport.js`와 `src/touch.js`는 함수를 export하므로 Jest에서 바로 테스트할 수 있다.
- `src/game.js`는 HTML에 삽입되는 일반 스크립트이며 export가 없다. 이 파일에 바로 `import { TetrisGame }`을 쓰면 실패한다.

2026-11-10 확인 시 이 작업 환경에는 Node.js `v22.23.4`, npm `10.9.9`가 있었다. 사용자의 PC나 새 터미널 환경에 없다면 다음 설치 절차부터 진행한다. 이미 설치되어 있다면 버전을 확인하고 3절로 이동해도 된다.

```bash
node --version
npm --version
```

## 2. Node.js와 npm 설치

### Ubuntu/Linux · macOS · WSL의 Bash/Zsh

Node.js 24 LTS를 사용한다. 버전 관리 도구 nvm을 사용하면 사용자 계정 안에서 설치할 수 있다. [Node.js 다운로드](https://nodejs.org/en/download), [npm 설치 안내](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/)와 [nvm 공식 설치 안내](https://github.com/nvm-sh/nvm#installing-and-updating)를 참고한다.

Ubuntu/WSL에서 `curl`이 없다면 먼저 설치한다. macOS에서 이미 있는 경우에는 건너뛴다.

```bash
sudo apt update
sudo apt install -y curl ca-certificates
```

nvm을 설치하고 현재 터미널에도 불러온다. 설치 스크립트는 셸 설정 파일에 nvm 로딩 설정을 추가한다.

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh -o /tmp/tetris-install-nvm.sh
bash /tmp/tetris-install-nvm.sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 24
nvm alias default 24
nvm use 24
node --version
npm --version
```

`node`가 `v24.x.x`이고 npm 버전도 출력되면 준비 완료다. npm은 Node.js와 함께 설치된다. `sudo npm install`이나 Jest 전역 설치는 필요하지 않다.

### Windows PowerShell

[Node.js 공식 다운로드](https://nodejs.org/en/download)에서 Node.js 24 LTS Windows 설치 파일을 받아 npm과 PATH 옵션을 포함해 설치한다. PowerShell을 새로 열고 `node --version`, `npm --version`으로 확인한다. 위의 nvm-sh 명령은 PowerShell용이 아니다. WSL을 쓰는 경우 WSL 터미널 안에서 Linux 절차를 따른다.

PowerShell 실행 정책 때문에 `npm.ps1`이 차단되면 아래 명령의 `npm`을 `npm.cmd`로 실행할 수 있다.

## 3. 프로젝트 의존성과 Jest 설치

배포 저장소가 있는 폴더에서 실행한다. Windows에서는 실제로 복제한 폴더 경로로 바꾼다.

```bash
cd ~/work/vibe-coding/tetris
npm ci
npm install --save-dev jest@30
```

`npm ci`는 기존 lockfile에 따라 앱 의존성을 설치하고, 다음 명령은 Jest를 개발 의존성으로 추가하면서 `package.json`과 `package-lock.json`을 갱신한다. 설치에는 인터넷 연결이 필요하다. 이후 다른 PC에서는 변경된 lockfile로 `npm ci`만 실행하면 된다. [Jest 시작 안내](https://jestjs.io/docs/getting-started)

## 4. ESM 설정과 기존 테스트 분리

프로젝트 루트에 `jest.config.mjs`를 다음 내용으로 생성한다.

```javascript
export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/jest/**/*.test.js'],
  transform: {},
  clearMocks: true,
  restoreMocks: true,
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/viewport.js', 'src/touch.js'],
  coverageDirectory: 'coverage',
};
```

기존 `tests/*.test.mjs`를 Jest가 수집하지 않도록 경로를 분리한다. 이 테스트들의 `node:test` import는 Jest API가 아니므로 이름만 바꾸어 실행하지 않는다.

ESM을 유지하고 변환은 끈다. Jest의 ESM 지원은 실험적이며 공식 문서에 따라 Node 실행 옵션을 지정한다. 이 단계의 `.js` 테스트에는 JSX를 쓰지 않는다. [ESM 설정](https://jestjs.io/docs/ecmascript-modules), [Jest 설정](https://jestjs.io/docs/configuration)

아래 명령으로 기존 `test`와 `build` 스크립트를 유지하면서 새 스크립트만 추가한다.

```bash
npm pkg set 'scripts.test:jest=node --experimental-vm-modules node_modules/jest/bin/jest.js'
npm pkg set 'scripts.test:jest:watch=npm run test:jest -- --watch'
npm pkg set 'scripts.test:jest:coverage=npm run test:jest -- --coverage'
npm pkg set 'scripts.test:all=npm test && npm run test:jest'
```

`.gitignore`에 다음 줄도 추가한다.

```gitignore
coverage/
```

## 5. 첫 테스트: 모바일 게임판 크기

`tests/jest` 폴더를 만들고 `tests/jest/viewport.test.js`를 작성한다. 아래는 실제 앱에서 사용하는 함수의 동작을 검증한다.

```javascript
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
```

## 6. 타이머 테스트: 터치 길게 누르기와 해제

`tests/jest/touch.test.js`를 작성한다. 실제 시간을 기다리지 않고 Jest 가상 타이머로 240ms 후 반복, 이후 85ms 간격 반복 및 해제 동작을 확인한다. [Jest 타이머 모킹](https://jestjs.io/docs/timer-mocks)

```javascript
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
```

## 7. 게임 엔진 테스트: 점수와 일시정지

`src/game.js`는 export가 없으므로 기존 테스트와 동일하게 Node의 `vm`에서 읽어 실행한다. 실제 엔진을 수정하지 않고 테스트할 수 있다. `tests/jest/game.test.js`를 작성한다.

```javascript
import { test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../src/game.js', import.meta.url), 'utf8');
const TetrisGame = vm.runInNewContext(`${source}\n;TetrisGame;`);

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
```

## 8. 실행과 결과 확인

```bash
# 새 Jest 테스트만 실행
npm run test:jest

# 파일 수정 시 다시 실행 — 종료는 Ctrl+C
npm run test:jest:watch

# 특정 테스트 파일만 실행
npm run test:jest -- --runTestsByPath tests/jest/touch.test.js

# 커버리지 생성
npm run test:jest:coverage

# 빌드 결과를 갱신한 뒤 기존 테스트와 Jest 테스트 모두 실행
npm run build
npm run test:all
```

위 예제를 모두 작성했다면 Jest는 **3개 파일, 7개 테스트**가 통과하는 것이 예상 결과다. 실패하면 `Expected`와 `Received` 및 표시된 파일·줄 번호를 확인한다. 실행 옵션 때문에 나오는 `ExperimentalWarning`만으로 테스트 실패를 뜻하지는 않는다.

watch 모드는 Git 변경 파일 위주로 실행할 수 있다. 아무 테스트도 선택되지 않으면 `a`를 눌러 전체를 실행한다. Git 저장소가 없는 폴더에서는 `npm run test:jest -- --watchAll`을 사용한다.

커버리지는 `coverage/lcov-report/index.html`을 브라우저에서 연다. 현재 설정에서는 직접 import하는 `viewport.js`와 `touch.js`만 집계한다. 별도 VM에서 실행하는 게임 엔진과 React 화면, Web Audio의 전체 커버리지를 의미하지 않는다.

## 9. React 화면 테스트로 확장하려면

위 테스트는 프론트엔드의 로직을 검증한다. 버튼 클릭에 따른 점수·상태 표시 등 React 화면을 검증하려면 추가 구성이 필요하다.

1. `src/app.jsx`와 `src/landing.jsx`의 컴포넌트를 export하고, 파일 끝의 `createRoot(...).render(...)`를 각각 별도 진입 파일로 분리한다. `scripts/build.mjs`의 entry도 새 진입 파일을 가리키게 한다. 현재 파일을 그대로 import하면 테스트 중 자동 마운트되어 실패할 수 있다.
2. `jest-environment-jsdom@30`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event`를 개발 의존성으로 설치한다. DOM 테스트 파일 상단에 `/** @jest-environment jsdom */`을 지정하면 기본 Node 환경과 함께 사용할 수 있다.
3. JSX 변환을 위해 `babel-jest@30`, `@babel/core@7`, `@babel/preset-react@7`를 추가하고 Jest `transform`에 JSX 변환을 설정한다. Babel은 `runtime: 'automatic'`인 React preset으로 JSX만 변환하고 ESM은 유지하도록 구성한다. 현재의 `transform: {}` 설정만으로는 JSX를 읽을 수 없다.
4. ESM 테스트에서 matcher를 추가할 때는 `@testing-library/jest-dom/jest-globals`를 불러온다. `render`, `screen`, `userEvent`로 사용자가 보는 버튼 이름과 점수 표시를 검사한다.
5. 게임 화면이 사용하는 일반 스크립트 전역(`TetrisGame`, `COLS` 등) 의존성을 모듈이나 주입 가능한 의존성으로 정리한다. Canvas, `matchMedia`, Web Audio는 필요한 동작만 모킹한다.

이 절은 후속 작업 범위다. 현재 문서의 3~8절 예제를 실행하기 위해 React 화면 구조를 먼저 바꿀 필요는 없다. [Testing Library 설정](https://testing-library.com/docs/react-testing-library/setup/), [Jest JSX/Babel 안내](https://jestjs.io/docs/getting-started#using-babel), [jsdom 환경 설정](https://jestjs.io/docs/configuration#testenvironment-string)

실제 Canvas 렌더링, 소리 출력, 화면 회전과 터치·키보드의 브라우저 동작은 별도의 브라우저 테스트로 확인한다. jsdom은 실제 브라우저나 오디오 장치가 아니다.

## 10. 자주 발생하는 문제

| 증상 | 확인할 내용 |
| --- | --- |
| `node: command not found` | 터미널을 다시 열거나 nvm 로딩 명령을 실행하고 `nvm use 24`를 실행한다. |
| `nvm: command not found` | nvm 설치 성공 여부와 셸 설정 파일을 확인한다. PowerShell에서는 Windows 설치 절차를 사용한다. |
| `Cannot use import statement outside a module` | `type: module`, `transform: {}`, `--experimental-vm-modules` 옵션을 확인하고 `npm run test:jest`로 실행한다. |
| `No tests found` | 새 파일이 `tests/jest/*.test.js`에 있는지 확인한다. 기존 `.test.mjs`는 `npm test` 대상이다. |
| `document is not defined` | 로직 테스트는 Node 환경이다. DOM 테스트에 jsdom을 설치하고 환경을 지정한다. |
| `Unexpected token '<'` | JSX를 import했다면 9절의 JSX 변환과 진입 파일 분리가 필요하다. |
| 타이머 테스트가 끝나지 않음 | 반복 타이머에 `runAllTimers()`를 쓰지 말고 필요한 시간만 진행시킨 뒤 `stop()`으로 정리한다. |
| 패키지 권한 오류 | nvm으로 설치한 Node/npm을 쓰는지 확인한다. 프로젝트 안에서 일반 사용자 권한으로 설치한다. |
| 실행 환경의 worker 제한 오류 | `npm run test:jest -- --runInBand`로 단일 프로세스 실행을 시도한다. |

## 11. 변경 사항 저장

설정을 실제로 적용한 뒤 다음 파일을 Git에 포함한다. `node_modules`, `coverage`, 로컬 기록인 `WORKFLOW.md`는 제외한다.

```bash
git add JEST.md package.json package-lock.json jest.config.mjs tests/jest .gitignore
git commit -m "Add Jest unit tests and setup guide"
```

이 명령은 3~7절을 적용한 이후에 실행한다. 문서만 저장한 현재 상태에서는 `git add JEST.md`만 해당한다. 기존 GitHub Pages는 브랜치의 HTML을 게시하는 방식이므로 Jest 설치가 서비스 실행에 필요하지 않다. 유닛 테스트와 빌드를 통과한 뒤 배포 변경 사항을 푸시한다.
