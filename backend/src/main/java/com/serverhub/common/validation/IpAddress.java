package com.serverhub.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * IPv4/IPv6 形式のバリデーション（requirements §10.1.6、詳細設計 01-common §2.1）。
 *
 * <p>{@code null}/空文字は有効とみなす（必須チェックは {@code @NotBlank} 等と組み合わせる）。
 */
@Documented
@Constraint(validatedBy = IpAddressValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface IpAddress {

  String message() default "IP アドレスの形式が正しくありません。";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
