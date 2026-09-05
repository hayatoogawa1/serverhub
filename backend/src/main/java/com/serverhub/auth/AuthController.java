package com.serverhub.auth;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 認証状態の確認（基本設計 02-api §3.1）。ログイン・ログアウトはフィルタ/ハンドラで完結し、 ここには含まない（詳細設計 02-auth §4.3）。 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  @GetMapping("/me")
  public UserResponse me(@AuthenticationPrincipal ServerHubUserPrincipal principal) {
    return UserResponse.from(principal);
  }
}
