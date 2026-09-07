package com.serverhub.cloud;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.DescribeInstancesRequest;
import software.amazon.awssdk.services.ec2.model.Ec2Exception;
import software.amazon.awssdk.services.ec2.model.Instance;
import software.amazon.awssdk.services.ec2.model.Reservation;

/**
 * AWS EC2 の実行状態を取得する {@link CloudStateProvider}（{@code serverhub.cloud.enabled=true} のとき有効）。
 *
 * <p><b>使う AWS API は {@code ec2:DescribeInstances}（参照）のみ。</b>認証は AWS SDK 既定のクレデンシャル チェーン（本番は IAM
 * ロール）。静的キーはコード・DB に持たない（設計 07-aws-ec2-integration §8）。
 *
 * <p>{@code DescribeInstances} に存在しないインスタンス ID を渡すと呼び出し全体が {@code InvalidInstanceID.NotFound}
 * で失敗するため、失敗メッセージから該当 ID を除いて 1 度だけ再試行する。 除かれた ID は戻り値に含めない（呼び出し側で GONE 扱い）。
 */
@Component
@ConditionalOnProperty(prefix = "serverhub.cloud", name = "enabled", havingValue = "true")
public class Ec2CloudStateProviderImpl implements CloudStateProvider {

  private static final Logger log = LoggerFactory.getLogger(Ec2CloudStateProviderImpl.class);
  private static final Pattern INSTANCE_ID = Pattern.compile("i-[0-9a-fA-F]+");

  /** リージョンごとに Ec2Client を使い回す。 */
  private final Map<String, Ec2Client> clients = new HashMap<>();

  @Override
  public boolean isEnabled() {
    return true;
  }

  @Override
  public synchronized Map<String, String> describeStates(
      String region, Collection<String> externalIds) {
    if (externalIds == null || externalIds.isEmpty()) {
      return Map.of();
    }
    Ec2Client client = clients.computeIfAbsent(region, this::buildClient);
    List<String> ids = new ArrayList<>(new HashSet<>(externalIds));
    try {
      return query(client, ids);
    } catch (Ec2Exception e) {
      if ("InvalidInstanceID.NotFound".equals(e.awsErrorDetails().errorCode())) {
        Set<String> missing = extractInstanceIds(e.awsErrorDetails().errorMessage());
        List<String> remaining = ids.stream().filter(id -> !missing.contains(id)).toList();
        log.info(
            "EC2 describe: {} instance id(s) not found, retrying with {} remaining",
            missing.size(),
            remaining.size());
        return remaining.isEmpty() ? Map.of() : query(client, remaining);
      }
      throw providerUnavailable(e);
    } catch (SdkException e) {
      throw providerUnavailable(e);
    }
  }

  private Map<String, String> query(Ec2Client client, List<String> ids) {
    Map<String, String> out = new HashMap<>();
    DescribeInstancesRequest request = DescribeInstancesRequest.builder().instanceIds(ids).build();
    for (Reservation reservation : client.describeInstancesPaginator(request).reservations()) {
      for (Instance instance : reservation.instances()) {
        if (instance.state() != null) {
          out.put(instance.instanceId(), instance.state().nameAsString());
        }
      }
    }
    return out;
  }

  private Ec2Client buildClient(String region) {
    return Ec2Client.builder()
        .region(Region.of(region))
        .httpClientBuilder(UrlConnectionHttpClient.builder())
        .build();
  }

  private static CloudProviderUnavailableException providerUnavailable(Exception cause) {
    return new CloudProviderUnavailableException(
        "EC2 DescribeInstances failed: " + cause.getMessage(), cause);
  }

  private static Set<String> extractInstanceIds(String message) {
    Set<String> ids = new HashSet<>();
    if (message != null) {
      Matcher m = INSTANCE_ID.matcher(message);
      while (m.find()) {
        ids.add(m.group());
      }
    }
    return ids;
  }
}
