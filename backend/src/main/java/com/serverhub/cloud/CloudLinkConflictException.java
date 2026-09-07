package com.serverhub.cloud;

/**
 * 別のサーバーが既に同じ {@code (provider, externalId)} を使用している（設計 07-aws-ec2-integration §6.6）。
 *
 * <p>{@code 409 CLOUD_LINK_CONFLICT} にマッピングされる（{@link CloudExceptionHandler}）。 Service の事前チェックと、DB
 * の {@code UNIQUE (provider, external_id)} 制約の両方でこの状態を検出する。
 */
public class CloudLinkConflictException extends RuntimeException {

  public CloudLinkConflictException(String externalId) {
    super("cloud instance already linked to another server: " + externalId);
  }
}
