package com.serverhub.cloud;

/**
 * provider の生の状態文字列を {@link CloudInstanceState}（provider 横断の正規化値）へ写像する （設計 07-aws-ec2-integration
 * §5 P5 / §6.1）。
 *
 * <p>AWS EC2 の状態: {@code pending} / {@code running} / {@code shutting-down} / {@code terminated} /
 * {@code stopping} / {@code stopped}（<a
 * href="https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_InstanceState.html">InstanceState</a>）。
 */
public final class CloudStateMapper {

  private CloudStateMapper() {}

  /** AWS EC2 の生値 → 正規化状態。未知・null は {@link CloudInstanceState#UNKNOWN}。 */
  public static CloudInstanceState fromEc2(String rawState) {
    if (rawState == null) {
      return CloudInstanceState.UNKNOWN;
    }
    return switch (rawState) {
      case "running" -> CloudInstanceState.RUNNING;
      case "stopped" -> CloudInstanceState.STOPPED;
      case "pending" -> CloudInstanceState.PENDING;
      case "stopping", "shutting-down" -> CloudInstanceState.STOPPING;
      case "terminated" -> CloudInstanceState.TERMINATED;
      default -> CloudInstanceState.UNKNOWN;
    };
  }
}
