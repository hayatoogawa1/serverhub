package com.serverhub.common.domain;

import com.serverhub.cloud.CloudProvider;
import org.seasar.doma.ExternalDomain;
import org.seasar.doma.jdbc.domain.DomainConverter;

/**
 * {@link CloudProvider} を DB カラム値（{@link String}）と相互変換する（D-DETAIL-04、07-aws-ec2-integration §6.1）。
 *
 * <p>JSON と同じ {@code value()}/{@code fromValue} を使い変換ロジックを 1 箇所に集約する （{@link StatusConverter}
 * と同じパターン）。
 */
@ExternalDomain
public class CloudProviderConverter implements DomainConverter<CloudProvider, String> {

  @Override
  public String fromDomainToValue(CloudProvider domain) {
    return domain.value();
  }

  @Override
  public CloudProvider fromValueToDomain(String value) {
    if (value == null) {
      return null;
    }
    return CloudProvider.fromValue(value);
  }
}
