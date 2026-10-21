# ⚠️ update-rates 関数 — 廃止・再デプロイ禁止

最終確認日: 2026-06-16

## 状態
- Supabase 本番（project-ref: rmahzqmwlavgxvfitymq）には **デプロイされていない**。
  `npx supabase functions list` で不在を確認済み（2026-06-16）。
- このフォルダの `index.ts` は **認証チェックなしで service_role により staff.daily_rate（給与単価）を更新する** 実装。
  フロントに平文で載る anon キーがあれば admin 認可なしで直叩きできる「裏口」になるため危険。

## 禁止事項
- **このフォルダを `supabase functions deploy update-rates` で再デプロイしないこと。**
- 棚卸し区分：**禁止 / 廃止**。

## 単価更新が必要になった場合
- 必ず **api-gateway の `update_rates` アクション** を使う。
  （セッショントークン → sessions DB照合 → staff.role を DB取得 → admin のみ許可、の認可フローあり）
- `archive/index_v2.ts` は callerId 自己申告方式で弱いので参考程度に留める。

## 経緯
- 2026-06-16 のフォルダ整理＆セキュリティ点検で「未使用の孤立関数」として検出。
- Codex 確認の結果、本番に存在しないため undeploy 対象なし。ローカルのみ廃止明記。
