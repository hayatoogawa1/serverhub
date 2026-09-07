package com.serverhub.common.domain;

import com.serverhub.cloud.CloudInstanceState;
import org.seasar.doma.ExternalDomain;
import org.seasar.doma.jdbc.domain.DomainConverter;

/**
 * {@link CloudInstanceState} を DB カラム値（{@link String}）と相互変換する （D-DETAIL-04、07-aws-ec2-integration
 * §6.1）。
 *
 * <p>DB 側は {@code CHECK} 制約（V3）で値集合を固定済み。未知値が来ても {@link CloudInstanceState#fromValue} が {@code
 * UNKNOWN} を返すため例外にしない。
 */
@ExternalDomain
public class CloudInstanceStateConverter implements DomainConverter<CloudInstanceState, String> {

  @Override
  public String fromDomainToValue(CloudInstanceState domain) {
    return domain.value();
  }

  @Override
  public CloudInstanceState fromValueToDomain(String value) {
    if (value == null) {
      return null;
    }
    return CloudInstanceState.fromValue(value);
  }
}
