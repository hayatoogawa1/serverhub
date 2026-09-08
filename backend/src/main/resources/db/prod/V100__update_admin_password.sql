-- 本番デプロイ専用マイグレーション（prod プロファイルのみ適用）。
--
-- このディレクトリ（classpath:db/prod）は application-prod.yml の
-- spring.flyway.locations でのみ読み込まれる。ローカル開発・CI（既定プロファイル）は
-- classpath:db/migration だけを見るため、ここのファイルは適用されない。
--
-- バージョン番号は共有マイグレーション（db/migration の V1〜）と衝突しないよう
-- 大きく離して V100 から始める。db/migration 側に V100 台を作らないこと。
--
-- 目的: 公開環境のデモ管理者パスワードを、総当たりされやすい "password" から
--       デモ用の固定値に変更する（requirements §10.1.18: 実在の秘密ではないデモ資格情報）。
--       デモパスワード: serverhub-demo-2026
--       ハッシュは BCryptPasswordEncoder(strength=10) で生成し matches=true を確認済み。
--       {bcrypt} プレフィックスは Spring Security の DelegatingPasswordEncoder に必須。

UPDATE users
SET password_hash = '{bcrypt}$2a$10$Uk5OsltD8doDHC1CaDP4heThj/Cs6jEC3b3nLC3Mbci05zbUnuo46'
WHERE email = 'admin@serverhub.local';
