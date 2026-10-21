# シンセイ工業 現場管理アプリ

スマホ用の現場管理アプリ（PWA）。本番は https://shinsei-field-app.pages.dev

- フロント：`src/user.jsx`（スタッフ）・`admin.html`（管理）・`shared.js`。`public/` が Cloudflare Pages に上がる
- サーバー：Supabase（`supabase/functions/` と `supabase/migrations/`）
- デプロイ：`deploy.ps1`（PC から）

## このリポジトリに入れないもの
- キー・パスワード（本番のキーは Supabase / Cloudflare の環境変数にある）
- `_backup/`、`.claude/`、就業規則などの PDF、特定スタッフの出勤簿を直したデータ修正
