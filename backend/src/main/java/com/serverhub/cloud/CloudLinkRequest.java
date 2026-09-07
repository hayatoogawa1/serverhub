package com.serverhub.cloud;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * サーバーへのクラウド連携（紐付け）の設定リクエスト（{@code PUT /servers/{id}/cloud-link}）。
 *
 * <p>実行状態はここでは受け取らない（AWS からの取得のみ）。
 *
 * @param provider 当面 {@code aws_ec2} のみ。未知値は Jackson が {@code 400} にする
 * @param externalId EC2 インスタンス ID（{@code i-} + 8 桁 or 17 桁の 16 進）
 * @param region 例 {@code ap-northeast-1}。未指定なら設定値（当面 {@code ap-northeast-1}）
 */
public record CloudLinkRequest(
    @NotNull CloudProvider provider,
    @NotBlank @Pattern(regexp = "^i-([0-9a-f]{8}|[0-9a-f]{17})$", message = "インスタンス ID の形式が正しくありません。")
        String externalId,
    @Size(max = 30) String region) {}
