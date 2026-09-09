-- デモ用の追加ログインユーザー（B1: サインアップ画面なし、Flyway シードで作成）。
-- 「デモ管理者」1 人だけだと複数人利用（同時編集・楽観ロック競合など）を試せないため、
-- 運用担当を 2 人分シードする。MVP は権限差なし（全ユーザー同一操作可）。
--
-- パスワードは "password"（bcrypt、V2 のデモ管理者と同じ扱い。実在の秘密ではない、
-- requirements §10.1.18）。本番（prod プロファイル）では db/prod/V101 が
-- serverhub-demo-2026 に変更する（V2 のデモ管理者 → V100 と同じ流れ）。

INSERT INTO users (email, password_hash, display_name)
VALUES
  ('ops-a@serverhub.local',
   '{bcrypt}$2a$10$XQa33UgIbs3sprCeozHGM.K0/pgFMeqIauvwUJrCk1Bda47FuH7W.',
   '運用担当A'),
  ('ops-b@serverhub.local',
   '{bcrypt}$2a$10$ZDpHYRoVZ0oc.GU7t.44/uHCFmSFNz7G6Abh/PzHpCbe4kpiv.4ZS',
   '運用担当B')
ON CONFLICT (email) DO NOTHING;
