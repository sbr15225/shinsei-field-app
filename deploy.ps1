# シンセイ工業 現場管理アプリ デプロイスクリプト
# [2026-06-10 作成] 監査C-1対応：フォルダ丸ごと公開をやめ、public/ に必要ファイルだけ集めてデプロイする
# 使い方: アプリフォルダで  powershell -ExecutionPolicy Bypass -File deploy.ps1
# 注意: sw.js の CACHE_NAME バンプは手動（コード変更があった時のみ）
# [2026-09-11] UTF-8 BOM付きで保存すること。BOMなしだとWindows PowerShell 5.1が日本語をSJIS解釈してパースエラーになる（2026-07-18の手動デプロイ原因）

$ErrorActionPreference = "Stop"
$app = $PSScriptRoot
$pub = Join-Path $app "public"

# 1. user側を必ずビルド（src/user.jsx → dist/user.js。忘れると変更が反映されない）
Set-Location $app
npm run build:user
if ($LASTEXITCODE -ne 0) { Write-Error "ビルド失敗。デプロイ中止"; exit 1 }
# [2026-10-15] 管理画面も事前に変換する（admin.html の JSX → dist/admin.js。ブラウザで Babel を動かさないので起動が速い）
node tools/build_admin.mjs
if ($LASTEXITCODE -ne 0) { Write-Error "管理画面のビルド失敗。デプロイ中止"; exit 1 }

# 2. public/ を作り直す（このフォルダは生成物。直接編集しない）
if (Test-Path $pub) { Remove-Item $pub -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $pub "dist") | Out-Null

# 3. 公開してよいファイルだけコピー（ホワイトリスト方式。ここに無いファイルは公開されない）
$files = @(
  "index.html", "user.html",
  "shared.js", "sw.js", "manifest.json", "ic_kanto.js",
  "icon-192_v4.png", "icon-512_v4.png",
  "manual.pdf",  # [2026-06-12] スタッフ向け使い方マニュアル（会社情報タブからリンク）
  "kisoku.pdf", "ikukai.pdf"  # [2026-10-19] 就業規則・育児介護規則（会社情報タブからリンク。労基法106条の周知）
)
foreach ($f in $files) { Copy-Item (Join-Path $app $f) $pub }
Copy-Item (Join-Path $app "dist\user.js") (Join-Path $pub "dist")
Copy-Item (Join-Path $app "dist\admin.js") (Join-Path $pub "dist")
Copy-Item (Join-Path $app "dist\admin.html") (Join-Path $pub "admin.html")   # [2026-10-15] 変換済みの管理画面（元の admin.html は公開しない）

# 4. セキュリティヘッダー（監査H-12対応）
@"
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: geolocation=(self), camera=(self)
"@ | Set-Content -Path (Join-Path $pub "_headers") -Encoding ascii

# 5. public/ だけをデプロイ
npx wrangler pages deploy $pub --project-name shinsei-field-app --commit-dirty=true
