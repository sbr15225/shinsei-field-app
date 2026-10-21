// [2026-10-15] 管理画面の起動を速くする：admin.html の <script type="text/babel"> を、ブラウザの Babel ではなく
// デプロイ前に esbuild で JS に変換する（以前は開くたびにブラウザで約 460KB の JSX を変換し、PC で約 10 秒かかっていた）。
// 編集するのは今までどおり admin.html。このスクリプトは生成物 dist/admin.html と dist/admin.js を作るだけ。
// 実行：node tools/build_admin.mjs（deploy.ps1 から呼ぶ）
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { transform } from "esbuild";

const src = readFileSync("admin.html", "utf8");
const open = src.indexOf('<script type="text/babel">');
const close = src.indexOf("</script>", open);
if (open < 0 || close < 0) throw new Error('admin.html に <script type="text/babel"> が見つからない');
const jsx = src.slice(open + '<script type="text/babel">'.length, close);
const out = await transform(jsx, {
  loader: "jsx",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  target: "es2018",
  minify: true,
  legalComments: "none",
});
mkdirSync("dist", { recursive: true });
writeFileSync("dist/admin.js", out.code);
const v = createHash("sha256").update(out.code).digest("hex").slice(0, 10);
let html = src.slice(0, open) + `<script src="/dist/admin.js?v=${v}"></script>` + src.slice(close + "</script>".length);
// Babel 本体（約 3MB）はもう読まない
html = html.replace(/\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone@[^"]+"><\/script>/, "");
if (/<script[^>]*(text\/babel|@babel\/standalone)/.test(html)) throw new Error("Babel の読み込みが残っている");
writeFileSync("dist/admin.html", html);
console.log(`dist/admin.js ${(out.code.length / 1024).toFixed(0)}KB（元の JSX ${(jsx.length / 1024).toFixed(0)}KB）v=${v}`);
