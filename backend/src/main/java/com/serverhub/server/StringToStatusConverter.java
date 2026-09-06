package com.serverhub.server;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * クエリパラメータ {@code status}（小文字表記）を {@link Status} に変換する（03-server §1）。
 *
 * <p>不一致は {@code IllegalArgumentException} → {@code 400 VALIDATION_ERROR}。
 */
@Component
public class StringToStatusConverter implements Converter<String, Status> {

  @Override
  public Status convert(String source) {
    return Status.fromValue(source);
  }
}
