package com.serverhub.common.domain;

import com.serverhub.maintenance.MaintenanceType;
import org.seasar.doma.ExternalDomain;
import org.seasar.doma.jdbc.domain.DomainConverter;

/**
 * {@link MaintenanceType} を DB カラム値（{@link String}）と相互変換する（D-SRV-01 / D-DETAIL-04）。
 *
 * <p>JSON と同じ {@code value()}/{@code fromValue} を使うことで、変換ロジックを 1 箇所に集約する。
 */
@ExternalDomain
public class MaintenanceTypeConverter implements DomainConverter<MaintenanceType, String> {

  @Override
  public String fromDomainToValue(MaintenanceType domain) {
    return domain.value();
  }

  @Override
  public MaintenanceType fromValueToDomain(String value) {
    if (value == null) {
      return null;
    }
    return MaintenanceType.fromValue(value);
  }
}
