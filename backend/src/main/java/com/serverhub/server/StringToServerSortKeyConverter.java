package com.serverhub.server;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * クエリパラメータ {@code sort}（camelCase の論理項目名）を {@link ServerSortKey} に変換する（03-server §1、F1）。
 *
 * <p>ホワイトリスト外は {@code IllegalArgumentException} → {@code 400 VALIDATION_ERROR}。
 */
@Component
public class StringToServerSortKeyConverter implements Converter<String, ServerSortKey> {

  @Override
  public ServerSortKey convert(String source) {
    return ServerSortKey.fromValue(source);
  }
}
