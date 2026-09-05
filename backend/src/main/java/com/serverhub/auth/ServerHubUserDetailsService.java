package com.serverhub.auth;

import com.serverhub.user.User;
import com.serverhub.user.UserDao;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * {@code email} でユーザーを検索する（詳細設計 02-auth §3.2）。
 *
 * <p>パスワード照合（bcrypt）は {@code DaoAuthenticationProvider} が自動で行うため、ここでは行わない。 存在しないメールアドレスは {@link
 * UsernameNotFoundException} を投げるが、 {@code DaoAuthenticationProvider} がこれを {@code
 * BadCredentialsException} に正規化するため、 「メールアドレス不存在」と「パスワード誤り」は同じ 401 になる（requirements §10.1.2）。
 */
@Service
public class ServerHubUserDetailsService implements UserDetailsService {

  private final UserDao userDao;

  public ServerHubUserDetailsService(UserDao userDao) {
    this.userDao = userDao;
  }

  @Override
  public UserDetails loadUserByUsername(String email) {
    User user =
        userDao
            .selectByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("user not found: " + email));
    return new ServerHubUserPrincipal(user);
  }
}
