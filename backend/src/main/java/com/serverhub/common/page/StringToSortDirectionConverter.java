package com.serverhub.common.page;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * クエリパラメータ {@code order}（{@code asc}/{@code desc}、大文字小文字不問）を {@link SortDirection} に変換する （02-api
 * §2.5）。
 *
 * <p>それ以外の値は {@code IllegalArgumentException} → {@code 400 VALIDATION_ERROR}。
 */
@Component
public class StringToSortDirectionConverter implements Converter<String, SortDirection> {

  @Override
  public SortDirection convert(String source) {
    return SortDirection.valueOf(source.trim().toUpperCase());
  }
}
