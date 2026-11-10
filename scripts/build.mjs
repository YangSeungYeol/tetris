import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const engine = await readFile(new URL("src/game.js", root), "utf8");
const pages = [
  { file: "index.html", entry: "src/landing.jsx", title: "테트리스 — 플레이 방법과 게임 시작", game: false },
  { file: "game.html", entry: "src/app.jsx", title: "테트리스 — 한 줄씩, 가볍게.", game: true },
];
const results = await Promise.all(pages.map(page => build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: [page.entry],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "eof",
  metafile: true,
})));
const packages = [...new Set(results.flatMap(result => Object.keys(result.metafile.inputs)).flatMap(input => {
  const match = input.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)\//);
  return match ? [match[1]] : [];
}))].sort();
const notices = [];
for (const name of packages) {
  const directory = new URL(`node_modules/${name}/`, root);
  const metadata = JSON.parse(await readFile(new URL("package.json", directory), "utf8"));
  let license;
  for (const filename of ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "LICENSE-MIT"]) {
    try { license = await readFile(new URL(filename, directory), "utf8"); break; } catch {}
  }
  if (!license) throw new Error(`라이선스 파일을 찾을 수 없습니다: ${name}`);
  notices.push(`## ${name} ${metadata.version}\n\n${license.trim()}`);
}
const noticeText = `# Third-party notices\n\n${notices.join("\n\n")}\n`;
await writeFile(new URL("THIRD_PARTY_NOTICES.md", root), noticeText);
for (const [index, page] of pages.entries()) {
  const bundle = `${results[index].outputFiles[0].text}\n/*\n${noticeText.replaceAll("*/", "* /")}*/`
    .replace(/<\/script/gi, "<\\/script");
  const engineScript = page.game ? `<script id="game-engine">\n${engine}\n  </script>` : "";
  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="모바일 터치와 PC 키보드로 즐기는 테트리스. 플레이 방법을 확인하고 코로베이니카와 함께 한 판을 시작하세요.">
  <title>${page.title}</title>
</head>
<body>
  <div id="root"></div>
  <noscript>페이지를 이용하려면 브라우저에서 JavaScript를 활성화해주세요.</noscript>
  <!-- npm run build로 생성됩니다. 수정은 src/에서 해주세요. -->
  ${engineScript}
  <script id="application">
${bundle}
  </script>
</body>
</html>
`;
  await writeFile(new URL(page.file, root), html);
  console.log(`${page.file} 생성 완료 (${Math.round(Buffer.byteLength(html) / 1024)} KB, 모든 라이브러리 포함)`);
}
