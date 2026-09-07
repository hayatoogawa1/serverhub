# syntax=docker/dockerfile:1
#
# ServerHub Backend（Spring Boot 4.1 / Java 17）。
# マルチステージ: JDK でビルド → JRE で実行。実行ユーザーは非 root。
# ビルドはリポジトリの Gradle Wrapper（8.14.5）をそのまま使う。
# コンテキストは backend/（.dockerignore で build/ 等を除外）。

# ---- build ----
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace

# 依存解決を層キャッシュに乗せるため、まずビルド定義だけコピー
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle.kts settings.gradle.kts ./
# Windows チェックアウト（CRLF）でも動くよう改行を正規化してから実行
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew \
 && ./gradlew --no-daemon dependencies >/dev/null 2>&1 || true

# ソースを入れて fat jar をビルド（テストはイメージビルドでは回さない = CI の責務）
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test \
 && cp build/libs/*.jar /workspace/app.jar

# ---- runtime ----
FROM eclipse-temurin:17-jre-jammy AS runtime

# healthcheck 用に curl だけ追加。非 root 実行ユーザーを作成
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system app \
 && useradd --system --gid app --home-dir /app --create-home app
WORKDIR /app

COPY --from=build --chown=app:app /workspace/app.jar /app/app.jar

USER app
EXPOSE 8080

# コンテナのメモリ制限に追従（cgroup 認識は JRE 標準）。上書きは JAVA_OPTS で。
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0"

HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=5 \
  CMD curl -fsS http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

# PID 1 をシェルにしない（シグナル透過のため exec）
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
