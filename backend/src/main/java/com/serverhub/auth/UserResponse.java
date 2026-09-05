package com.serverhub.auth;

/** ログイン成功・{@code GET /auth/me} 共通のレスポンス（基本設計 02-api §3.1）。 */
public record UserResponse(Long id, String email, String displayName) {

  public static UserResponse from(ServerHubUserPrincipal principal) {
    return new UserResponse(principal.getId(), principal.getUsername(), principal.getDisplayName());
  }
}
