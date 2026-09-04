# 02. 認証（詳細設計）

- バージョン: 1.0（確定、PR #21）
- 最終更新: 2026-09-04
- 対応: FR-AUTH-01〜03 / BR-12 / BR-13 / UC-01・UC-02 / [04-security](../basic/04-security.md) D-SEC-01〜06 / [01-common](01-common.md)

`user`（`User` Entity・`UserDao`）と `auth`（Spring Security 連携）の2パッケージにまたがる
（[01-architecture §2.2](../basic/01-architecture.md)）。04-security で決めた「何をするか」を
クラス・DTO レベルまで具体化する。**内容の重複記載はしない**（04-security にある事項は参照のみ）。

---

## 1. Entity（`user` パッケージ）

```java
package com.serverhub.user;

@Entity(immutable = true)
public record User(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id,
    String email,
    String passwordHash,
    String displayName,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
```

- **Doma の immutable entity（`record` ベース）を採用**（D-AUTH-01）。以降 03/04 の
  `Server`/`Tag`/`MaintenanceHistory` も同じ方針で統一する（[01-common §4](01-common.md) の
  Doma 共通方針を record ベースで具体化）。
- `users` は MVP で**登録・更新 API を持たない**（B1）ため `EntityListener`（監査列自動設定）は不要。
  `created_at`/`updated_at` は Flyway シード時点の値のまま。
- カラム対応は Doma 既定の命名変換（`passwordHash` ⇄ `password_hash`）に従う（[03-data-model §2.1](../basic/03-data-model.md)）。

## 2. DAO（`user` パッケージ）

```java
package com.serverhub.user;

@Dao
@ConfigAutowireable
public interface UserDao {
  @Select
  Optional<User> selectByEmail(String email);
}
```

- 外部 SQL ファイル `resources/META-INF/com/serverhub/user/UserDao/selectByEmail.sql`
  （`CLAUDE.md` §3「DAO は外部 SQL ファイル」、Criteria API 等は使わない）。

  ```sql
  select id, email, password_hash, display_name, created_at, updated_at
  from users
  where email = /* email */'x'
  ```

- MVP では `selectByEmail` の 1 メソッドのみ（登録・更新・一覧は作らない、B1）。

## 3. `auth` パッケージ（Spring Security 連携）

### 3.1 認証プリンシパル

```java
package com.serverhub.auth;

public class ServerHubUserPrincipal implements UserDetails {
  private final Long id;
  private final String email;
  private final String displayName;
  private final String passwordHash;

  // getAuthorities() は固定で ROLE_USER を1つ返す（D-AUTH-02）
  // getUsername() は email を返す
  // getPassword() は passwordHash を返す
  // isEnabled 等のフラグはすべて true 固定（MVP はアカウント無効化機能なし）
}
```

- **`ROLE_USER` を固定の権限として付与**（D-AUTH-02）。MVP では認可判定に使わないが、
  「権限を持つ主体」を最初から用意しておくことで、将来のロール追加（01-architecture §4.3）が
  `ServerHubUserPrincipal` の変更だけで済む。
- `id`/`displayName` を保持するのは、ログイン成功レスポンス・`GET /auth/me` で
  `UserResponse`（§4）を組み立てるため。

### 3.2 `UserDetailsService`

```java
package com.serverhub.auth;

@Service
public class ServerHubUserDetailsService implements UserDetailsService {
  private final UserDao userDao;

  public UserDetails loadUserByUsername(String email) {
    User user = userDao.selectByEmail(email)
        .orElseThrow(() -> new UsernameNotFoundException("not found")); // メッセージはログのみ、レスポンスには出ない
    return new ServerHubUserPrincipal(user);
  }
}
```

- `UsernameNotFoundException` は Spring Security の `DaoAuthenticationProvider` が内部で
  `BadCredentialsException` に正規化するため、**存在しないメールアドレスと誤ったパスワードが
  同じ 401 メッセージになる**（requirements §10.1.2「ユーザーの存在を示さない」を Spring Security の
  既定動作で満たす）。
- パスワード照合（bcrypt）は `PasswordEncoder`（04-security §3.1）を使う `DaoAuthenticationProvider` が
  自動で行う。`UserDetailsService`/DAO はハッシュ照合ロジックを持たない。

### 3.3 ログインのリクエスト形式（D-AUTH-03）

- **JSON ボディを受け付ける**（`{ "email": "...", "password": "..." }`）。他の全 API が JSON の
  ため、ログインだけ `application/x-www-form-urlencoded` にして API の一貫性を崩さない。
- Spring Security の既定 `UsernamePasswordAuthenticationFilter` はフォーム値を読むため、
  **JSON ボディを解釈するカスタムフィルタ** `JsonLoginAuthenticationFilter extends
  UsernamePasswordAuthenticationFilter` を用意し、`attemptAuthentication` で
  `LoginRequest`（§4.1）にデシリアライズしてから認証トークンを組み立てる。

  ```java
  public class JsonLoginAuthenticationFilter extends UsernamePasswordAuthenticationFilter {
    // ObjectMapper でボディを LoginRequest に変換
    // jakarta.validation.Validator で @Valid 相当のチェックを実行
    //   違反があれば AuthenticationFailureHandler ではなく、
    //   このフィルタ内で直接 400 + ApiError.validation(...) を書いて return（§5 参照）
    // 違反がなければ UsernamePasswordAuthenticationToken を構築し super の認証処理へ委譲
  }
  ```

- この形にする理由：**FR-AUTH-01 は「未入力・形式」を `400`、「資格情報不正」を `401` に
  分けている**。Spring Security の `AuthenticationException`（→ 04-security の失敗ハンドラ）は
  すべて `401` になるため、入力形式チェックは `authenticate()` を呼ぶ前にフィルタ側で行い、
  違反時はここで直接レスポンスを書いて短絡させる。

## 4. Request / Response DTO

### 4.1 `LoginRequest`（`auth` パッケージ、Bean Validation 用。§3.3 のフィルタ内で手動検証）

```java
public record LoginRequest(
    @NotBlank @Email String email,
    @NotBlank String password
) {}
```

### 4.2 `UserResponse`（ログイン成功・`GET /auth/me` 共通）

```java
public record UserResponse(Long id, String email, String displayName) {
  public static UserResponse from(ServerHubUserPrincipal principal) {
    return new UserResponse(principal.getId(), principal.getUsername(), principal.getDisplayName());
  }
}
```

- [02-api §3.1](../basic/02-api.md) の JSON 契約（`200` + `{id,email,displayName}`）に対応。

### 4.3 `AuthController`（`GET /api/v1/auth/me` のみ。login/logout はフィルタ/ハンドラで完結）

```java
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  @GetMapping("/me")
  public UserResponse me(@AuthenticationPrincipal ServerHubUserPrincipal principal) {
    return UserResponse.from(principal);
  }
}
```

- 未認証時は `Controller` に到達する前に `AuthenticationEntryPoint`（04-security §3.2）が `401` を返す
  ため、この中で null チェックは不要。

## 5. ハンドラの実装詳細（04-security §3.2 の具体化）

すべて `common/error` の `ApiError`（[01-common §1.3](01-common.md)）を使い、レスポンス形式を統一する。
`traceId` は `MDC.get("traceId")` から取得する（[05-cross-cutting §4.1](../basic/05-cross-cutting.md) の
`RequestLoggingFilter` が Security より前段で設定済み）。

| ハンドラ | クラス | 応答 | ログ |
|---|---|---|---|
| ログイン成功 | `LoginSuccessHandler implements AuthenticationSuccessHandler` | `200` + `UserResponse` | `INFO`：メールアドレス・結果=成功・クライアント IP・`traceId`（requirements §10.1.2） |
| ログイン失敗（資格情報） | `LoginFailureHandler implements AuthenticationFailureHandler` | `401` + `ApiError.of("AUTH_BAD_CREDENTIALS", "メールアドレスまたはパスワードが正しくありません。", traceId)` | `WARN`：入力されたメールアドレス・結果=失敗・クライアント IP・`traceId`（**パスワードは記録しない**） |
| ログイン失敗（入力形式） | `JsonLoginAuthenticationFilter` 内で直接応答（§3.3） | `400` + `ApiError.validation(...)` | `WARN`：違反フィールド数のみ |
| 未認証で保護 API | `ApiAuthenticationEntryPoint implements AuthenticationEntryPoint` | `401` + `ApiError.of("AUTH_REQUIRED", "認証が必要です。", traceId)` | ログ出力なし（頻出のため、requirements §10.5 は業務イベントのみ `INFO` 対象） |
| ログアウト成功 | `ApiLogoutSuccessHandler implements LogoutSuccessHandler` | `204` | なし |

- クライアント IP は `HttpServletRequest#getRemoteAddr()`（`X-Forwarded-For` は本番の ALB 経由時のみ
  `server.forward-headers-strategy` 経由で反映、[01-architecture §1.3](../basic/01-architecture.md)）。

## 6. 業務ルールの実装配置

| BR | 内容 | 実装配置 |
|---|---|---|
| BR-12 | 認証済みユーザーのみ全業務機能を利用できる | `SecurityFilterChain`（04-security §3.3）。本書は関与しない |
| BR-13 | パスワードはハッシュ化して保存（bcrypt） | `PasswordEncoder`（04-security §3.1）。`DaoAuthenticationProvider` が比較を実行、本書のコードはハッシュを直接扱わない |

## 7. エラーケース一覧

| ケース | HTTP | `code` |
|---|---|---|
| メールアドレス/パスワード未入力・形式不正 | 400 | `VALIDATION_ERROR` |
| メールアドレス不存在 または パスワード誤り | 401 | `AUTH_BAD_CREDENTIALS` |
| セッションなし/期限切れで業務 API アクセス | 401 | `AUTH_REQUIRED` |

`404`/`409` に相当するケースは認証機能にはない。

---

## 8. この文書で追加・確定した事項

| ID | 事項 | 根拠 |
|---|---|---|
| D-AUTH-01 | Entity は Doma の immutable entity（record ベース）を採用。以降 03/04 も同じ方針 | シンプルさ・不変性。[01-common §4](01-common.md) の具体化 |
| D-AUTH-02 | `ServerHubUserPrincipal` は固定で `ROLE_USER` を付与 | 将来のロール拡張点を最小変更で用意（01-architecture §4.3） |
| D-AUTH-03 | ログインは JSON ボディ（カスタム `JsonLoginAuthenticationFilter`）。入力形式エラーは `authenticate()` を呼ぶ前にフィルタ内で `400` として短絡させる | FR-AUTH-01 の 400/401 の区別、API 全体の JSON 一貫性 |
| D-AUTH-04 | ログイン成功/失敗のログは各ハンドラ内で直接出力する（イベントリスナー等の間接層を挟まない） | シンプルさ、requirements §10.1.2 |

- `UserDao`/`ServerHubUserDetailsService`/各ハンドラの実クラス名は変更の余地あり（Phase 5 実装時に最終化）。
- 単体/結合テスト（CSRF 疎通・ログイン成功/失敗・未認証 401 等）は Phase 5。
