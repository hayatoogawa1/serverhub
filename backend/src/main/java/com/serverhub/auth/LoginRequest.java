package com.serverhub.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * ログインリクエストボディ（詳細設計 02-auth §4.1）。
 *
 * <p>{@link JsonLoginAuthenticationFilter} が JSON ボディをこの型にデシリアライズし、手動で Bean Validation を実行する（Spring
 * Security のフィルタは {@code @Valid} の対象外のため）。
 */
public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
