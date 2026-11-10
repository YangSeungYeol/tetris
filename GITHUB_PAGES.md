# YangSeungYeol/tetris GitHub Pages 배포 가이드

현재 앱을 `~/work/tetris`로 복사하고, 해당 폴더를 GitHub 저장소와 연결해 배포하는 절차입니다. 명령은 현재 환경의 **Linux 또는 WSL Bash**에서 실행하는 기준입니다.

| 항목 | 값 |
| --- | --- |
| 현재 앱 폴더 | `/home/ubuntu/work/vibe-coding` |
| 앞으로 작업할 폴더 | `~/work/tetris` |
| GitHub 계정 | `YangSeungYeol` |
| 저장소 | `YangSeungYeol/tetris` |
| 원격 URL | `https://github.com/YangSeungYeol/tetris.git` |
| 게시 설정 | `main` 브랜치, `/(root)` 폴더 |
| 배포 완료 후 예상 랜딩 주소 | `https://yangseungyeol.github.io/tetris/` |
| 배포 완료 후 예상 게임 주소 | `https://yangseungyeol.github.io/tetris/game.html` |

이 가이드는 **새 로컬 폴더와 비어 있는 원격 저장소**를 기준으로 합니다. 실제 저장소 생성·폴더 복사·푸시·배포는 이 문서 작성 과정에서 실행하지 않았습니다.

## 1. 준비와 GitHub 로그인

다음 도구를 준비합니다.

- Git 2.28 이상
- Node.js 18 이상과 npm: 소스 빌드 및 테스트용
- [GitHub CLI](https://cli.github.com/): 터미널의 GitHub 인증용

설치를 확인합니다.

```bash
git --version
node --version
npm --version
gh --version
```

GitHub CLI의 브라우저 로그인으로 인증하고, HTTPS Git 명령에 이 인증을 연결합니다.

```bash
gh auth login --hostname github.com --git-protocol https --web
gh auth setup-git --hostname github.com
gh auth status
```

브라우저에서는 **YangSeungYeol** 계정으로 로그인합니다. 이미 로그인되어 있다면 `gh auth status`로 사용할 계정을 확인하면 됩니다. 명령의 동작은 [로그인 공식 안내](https://cli.github.com/manual/gh_auth_login)와 [Git 인증 연결 공식 안내](https://cli.github.com/manual/gh_auth_setup-git)를 참고하세요.

## 2. ~/work/tetris에 현재 프로젝트 복사

대상 경로에 다른 프로젝트가 없는 상태에서 아래 명령을 실행합니다. 앱 파일과 개발용 소스·문서를 명시적으로 복사하므로 기존 `.git`, `node_modules`, `.aws`, `.codex`, `.agents`는 복사하지 않습니다.

```bash
mkdir -p ~/work/tetris

cp -a /home/ubuntu/work/vibe-coding/{index.html,game.html,src,scripts,tests,package.json,package-lock.json,.gitignore} ~/work/tetris/
cp -a /home/ubuntu/work/vibe-coding/{README.md,THIRD_PARTY_NOTICES.md,GITHUB_PAGES.md,PLAN.md,AGENTS.md,WORKFLOW.md} ~/work/tetris/

cd ~/work/tetris
```

`AGENTS.md`와 `WORKFLOW.md`도 복사해 새 폴더에서 작업 기록을 이어갑니다. 작업 기록은 로컬에 보관하도록 복사본의 `.gitignore`에 추가합니다. `.nojekyll`은 GitHub Pages가 완성된 정적 파일을 그대로 게시하도록 만드는 빈 파일입니다.

```bash
printf '\n# Local conversation history\nWORKFLOW.md\n' >> .gitignore
touch .nojekyll
```

Jekyll 처리를 생략하는 설정은 [GitHub Pages 정적 사이트 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site#static-site-generators)에 설명되어 있습니다.

앞으로 앱 수정과 Git 명령은 **`~/work/tetris`에서 진행합니다.** 원래 폴더는 그대로 남으며, 두 폴더가 자동으로 동기화되지는 않습니다.

## 3. 새 폴더에서 빌드하고 확인

```bash
cd ~/work/tetris
npm ci
npm run build && npm test
```

두 명령이 모두 성공하면 루트의 `index.html`과 `game.html`이 최신 소스로 생성된 상태입니다. 현재 구성의 단위 테스트는 총 43개입니다.

PC에서 파일을 직접 열거나, 다음 서버로 확인할 수 있습니다.

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

브라우저에서 [http://127.0.0.1:8000/](http://127.0.0.1:8000/)로 접속해 랜딩의 **플레이** 버튼과 게임을 확인합니다. 확인을 마친 뒤 터미널에서 `Ctrl+C`로 서버를 종료합니다.

## 4. GitHub에 빈 tetris 저장소 만들기

[GitHub 새 저장소 만들기](https://github.com/new)에서 다음과 같이 설정합니다.

1. **Owner**: `YangSeungYeol`
2. **Repository name**: `tetris`
3. **Visibility**: `Public`
4. README, `.gitignore`, License를 자동 생성하는 옵션은 선택하지 않습니다.
5. **Create repository**를 누릅니다.

이미 `YangSeungYeol/tetris`라는 **빈 저장소**를 만들었다면 이 단계는 생략합니다. 로컬 프로젝트를 처음 올릴 때 원격 저장소를 비워두는 방식은 [GitHub의 기존 코드 업로드 안내](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github#adding-a-local-repository-to-github-using-git)를 따릅니다. 무료 개인 계정에서 Pages를 사용하려면 공개 저장소를 사용합니다. [Pages 사용 가능 범위](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site#who-can-use-this-feature)

## 5. 로컬 Git 초기화와 첫 푸시

```bash
cd ~/work/tetris
git init -b main
```

커밋 작성자 이름과 이메일을 확인합니다.

```bash
git config --get user.name
git config --get user.email
```

설정이 없거나 이 프로젝트에서 다른 값을 쓰려면 아래와 같이 설정합니다. `YOUR_VERIFIED_EMAIL`은 GitHub 계정의 **Settings → Emails**에서 확인한 이메일 또는 제공되는 비공개 커밋용 이메일로 바꿉니다. 설정은 이 저장소에만 적용됩니다.

```bash
git config user.name "YangSeungYeol"
git config user.email "YOUR_VERIFIED_EMAIL"
```

파일을 추가하고 커밋합니다. `node_modules/`와 `WORKFLOW.md`는 `.gitignore` 규칙에 따라 제외됩니다.

```bash
git add .
git diff --cached --stat
git commit -m "Add responsive Tetris and landing page"
```

원격 저장소를 연결하고 `main`을 올립니다.

```bash
git remote add origin https://github.com/YangSeungYeol/tetris.git
git remote -v
git push -u origin main
```

이후 [YangSeungYeol/tetris 저장소](https://github.com/YangSeungYeol/tetris)에서 루트에 `index.html`, `game.html`, `.nojekyll`이 있는지 확인합니다.

## 6. GitHub Pages 게시 설정

저장소에서 다음 순서로 설정합니다.

1. **Settings → Pages**로 이동합니다.
2. **Build and deployment → Source**를 **Deploy from a branch**로 선택합니다.
3. **Branch**를 `main`으로 선택합니다.
4. 폴더를 **`/(root)`**로 선택합니다.
5. **Save**를 누릅니다.

공식 설정 절차는 [브랜치에서 GitHub Pages 게시하기](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-from-a-branch)를 참고하세요.

현재 프로젝트는 이미 빌드한 HTML을 커밋하므로 별도의 배포용 YAML을 작성할 필요가 없습니다. **이 방식에서는 GitHub가 `npm run build`를 대신 실행하지 않습니다.** 소스를 수정하면 로컬에서 빌드한 HTML까지 커밋해야 합니다.

현재 앱은 `game.html#play`, `index.html#how-to-play`처럼 상대 경로를 사용하므로 `/tetris/` 하위 경로에서도 두 페이지를 오갈 수 있습니다. 별도의 React 라우터나 base 경로 설정은 필요하지 않습니다.

## 7. 배포 완료와 접속 확인

저장소의 **Actions**에서 Pages 배포 작업이 성공했는지 확인합니다. 이후 **Settings → Pages → Visit site**에 표시되는 주소로 접속합니다. 최초 반영에는 시간이 걸릴 수 있으며, GitHub는 변경 게시에 최대 10분이 걸릴 수 있다고 안내합니다. [게시된 사이트 확인 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site#viewing-your-published-site)

기본 Pages 주소는 다음과 같습니다. 아래 주소는 **배포 완료 후 사용할 예상 주소**입니다.

- 랜딩: [https://yangseungyeol.github.io/tetris/](https://yangseungyeol.github.io/tetris/)
- 게임 대기 화면: [https://yangseungyeol.github.io/tetris/game.html](https://yangseungyeol.github.io/tetris/game.html)
- 게임 즉시 시작: [https://yangseungyeol.github.io/tetris/game.html#play](https://yangseungyeol.github.io/tetris/game.html#play)

PC와 휴대폰에서 랜딩의 플레이 버튼, 게임 조작, 음악 켜기·끄기를 확인합니다. 배포 후에는 PC의 Python 서버를 실행하지 않아도 휴대폰에서 Pages 주소로 접속할 수 있습니다. 랜딩에서 게임으로 이동한 경우 음악은 게임 화면에서 첫 터치나 키보드 조작 후 시작합니다.

## 8. 이후 수정 내용을 배포하는 방법

이후에는 `~/work/tetris`의 소스를 수정합니다.

```bash
cd ~/work/tetris
npm run build && npm test
```

빌드와 테스트가 성공한 뒤 변경 내용을 올립니다.

```bash
git add .
git diff --cached --stat
git commit -m "Update Tetris"
git push
```

`main`에 올린 변경은 앞서 지정한 Pages 설정에 따라 다시 게시됩니다. 다른 PC에서도 저장소를 수정했다면 로컬 변경을 시작하기 전에 `git pull --ff-only`로 최신 커밋을 받습니다.

## 문제가 생겼을 때

| 증상 | 확인할 내용 |
| --- | --- |
| `gh: command not found` | GitHub CLI 설치 후 터미널을 다시 열고 1단계의 로그인 진행 |
| `Repository not found` 또는 인증 실패 | 저장소 이름·존재 여부와 `gh auth status`의 계정이 `YangSeungYeol`인지 확인 |
| `remote origin already exists` | `git remote -v`로 기존 연결 확인. 같은 저장소면 추가 명령을 생략하고, 바꿀 대상이 맞으면 `git remote set-url origin https://github.com/YangSeungYeol/tetris.git` 사용 |
| `non-fast-forward` 또는 원격 저장소에 이미 README·커밋이 있음 | 원격 기록이 있는 상태입니다. 새 빈 폴더에 원격 저장소를 `git clone`한 뒤 앱 파일을 복사해 일반 커밋·푸시합니다. 기존 기록을 덮어쓰는 강제 푸시는 사용하지 않습니다. |
| Pages 주소에서 404 | Actions 성공 여부, 게시 소스 `main` + `/(root)`, 루트의 `index.html`, 주소의 `/tetris/` 포함 여부 확인 |
| 랜딩은 열리지만 게임은 404 | `game.html`이 같은 루트에 커밋되었는지, 대소문자가 맞는지 확인 |
| 소스를 바꿨는데 화면이 그대로 | 새 `index.html`·`game.html`까지 빌드·커밋·푸시했는지 확인한 뒤 배포 완료를 기다리고 새로고침 |
| BGM이 바로 안 들림 | 게임 화면에서 이동 버튼이나 키보드를 한 번 조작하고, 배경음악 스위치와 볼륨 확인 |

원격 저장소에 기존 커밋이 있는 경우에는 **2단계를 시작하기 전에**, 대상 폴더가 아직 없을 때 다음과 같이 복제할 수 있습니다.

```bash
git clone https://github.com/YangSeungYeol/tetris.git ~/work/tetris
```

그 뒤 2·3단계의 파일 복사와 확인을 진행합니다. 이미 복제한 저장소이므로 `git init`과 `git remote add origin`은 생략하고 현재 브랜치에 커밋·푸시합니다. Pages의 게시 브랜치도 그 브랜치에 맞춥니다.
