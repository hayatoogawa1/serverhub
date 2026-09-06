package com.serverhub.server;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * クエリパラメータ {@code environment}（小文字表記）を {@link Environment} に変換する（03-server §1）。
 *
 * <p>不一致は {@code IllegalArgumentException} → Spring が {@code MethodArgumentTypeMismatchException}
 * に包み、{@code GlobalExceptionHandler} が {@code 400 VALIDATION_ERROR} にする。
 */
@Component
public class StringToEnvironmentConverter implements Converter<String, Environment> {

  @Override
  public Environment convert(String source) {
    return Environment.fromValue(source);
  }
}
