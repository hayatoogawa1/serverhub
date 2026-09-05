package com.serverhub.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.Pattern;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * ホスト名の形式バリデーション（RFC 1123 のラベル規則、詳細設計 01-common §2.1）。
 *
 * <p>Commons Validator の {@code DomainValidator} は公開 TLD を前提とし内部ホスト名（例 {@code
 * web-prod-01}）に不向きなため、既存の Bean Validation 制約（{@code @Pattern}）を合成した
 * 独自制約として定義する（専用ライブラリは追加しない）。長さは呼び出し側で {@code @Size} を別途 付ける。{@code null} は有効とみなす（必須チェックは
 * {@code @NotBlank} と組み合わせる）。
 */
@Documented
@Pattern(
    regexp =
        "^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$")
@Constraint(validatedBy = {})
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface Hostname {

  String message() default "ホスト名の形式が正しくありません。";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
