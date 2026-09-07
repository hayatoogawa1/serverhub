package com.serverhub.maintenance;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * クエリパラメータ {@code sort}（camelCase の論理項目名）を {@link MaintenanceSortKey} に変換する（04-maintenance §2）。
 *
 * <p>ホワイトリスト外は {@code IllegalArgumentException} → {@code 400 VALIDATION_ERROR}。
 */
@Component
public class StringToMaintenanceSortKeyConverter implements Converter<String, MaintenanceSortKey> {

  @Override
  public MaintenanceSortKey convert(String source) {
    return MaintenanceSortKey.fromValue(source);
  }
}
