package com.serverhub.common.domain;

import com.serverhub.server.Environment;
import org.seasar.doma.ExternalDomain;
import org.seasar.doma.jdbc.domain.DomainConverter;

/**
 * {@link Environment} を DB カラム値（{@link String}）と相互変換する（D-SRV-01 / D-DETAIL-04）。
 *
 * <p>JSON・クエリパラメータと同じ {@code value()}/{@code fromValue} を使うことで、変換ロジックを 1 箇所に 集約する。
 */
@ExternalDomain
public class EnvironmentConverter implements DomainConverter<Environment, String> {

  @Override
  public String fromDomainToValue(Environment domain) {
    return domain.value();
  }

  @Override
  public Environment fromValueToDomain(String value) {
    if (value == null) {
      return null;
    }
    return Environment.fromValue(value);
  }
}
