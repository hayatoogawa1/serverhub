plugins {
    java
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
    // Doma のアノテーション処理・SQL リソース配置を自動で構成する公式プラグイン
    id("org.domaframework.doma.compile") version "4.0.3"
    // フォーマッタ（google-java-format）。`./gradlew check` で spotlessCheck も実行される
    id("com.diffplug.spotless") version "8.10.1"
}

group = "com.serverhub"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

repositories {
    mavenCentral()
}

extra["domaVersion"] = "3.11.1"          // doma-spring-boot-starter 3.0.0 が想定するバージョンに合わせる
extra["springdocVersion"] = "3.1.0"

dependencies {
    // --- Spring Boot ---
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // --- 入力値検証（既存ライブラリを優先、requirements §10.1.1）。IP アドレス形式チェックに使用 ---
    implementation("commons-validator:commons-validator:1.9.0")

    // --- DB / マイグレーション ---
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    // --- Doma ---
    implementation("org.seasar.doma.boot:doma-spring-boot-starter:3.0.0")
    annotationProcessor("org.seasar.doma:doma-processor:${property("domaVersion")}")

    // --- API ドキュメント ---
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:${property("springdocVersion")}")

    // --- テスト ---
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    // Spring Boot 4 でモジュール化され、@WebMvcTest 等は starter-test に含まれない
    testImplementation("org.springframework.boot:spring-boot-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.springframework.security:spring-security-test")
    // Testcontainers 2.x はモジュール名が testcontainers-* にリネームされている
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
    options.compilerArgs.add("-parameters")
}

spotless {
    java {
        target("src/**/*.java")
        googleJavaFormat()
        removeUnusedImports()
        formatAnnotations()
    }
}
