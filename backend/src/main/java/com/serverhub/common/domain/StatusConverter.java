package com.serverhub.common.domain;

import com.serverhub.server.Status;
import org.seasar.doma.ExternalDomain;
import org.seasar.doma.jdbc.domain.DomainConverter;

/**
 * {@link Status} を DB カラム値（{@link String}）と相互変換する（D-SRV-01 / D-DETAIL-04）。
 *
 * <p>JSON・クエリパラメータと同じ {@code value()}/{@code fromValue} を使うことで、変換ロジックを 1 箇所に 集約する。
 */
@ExternalDomain
public class StatusConverter implements DomainConverter<Status, String> {

  @Override
  public String fromDomainToValue(Status domain) {
    return domain.value();
  }

  @Override
  public Status fromValueToDomain(String value) {
    if (value == null) {
      return null;
    }
    return Status.fromValue(value);
  }
}
