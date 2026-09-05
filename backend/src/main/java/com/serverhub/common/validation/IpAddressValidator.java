package com.serverhub.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.apache.commons.validator.routines.InetAddressValidator;

/**
 * {@link IpAddress} の実装。既存ライブラリを優先し自作を避ける方針（requirements §10.1.1）に従い、 Commons Validator の {@link
 * InetAddressValidator}（IPv4/IPv6 両対応）をそのまま利用する。
 */
public class IpAddressValidator implements ConstraintValidator<IpAddress, String> {

  @Override
  public boolean isValid(String value, ConstraintValidatorContext context) {
    if (value == null || value.isBlank()) {
      // 必須チェックは @NotBlank 等が担う。
      return true;
    }
    return InetAddressValidator.getInstance().isValid(value);
  }
}
