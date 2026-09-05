package com.serverhub.auth;

import com.serverhub.user.User;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * 認証プリンシパル（詳細設計 02-auth §3.1）。
 *
 * <p>固定で {@code ROLE_USER} を1つ付与する（D-AUTH-02）。MVP では認可判定に使わないが、将来の ロール追加（01-architecture
 * §4.3）をこのクラスの変更だけで済ませるための布石。
 */
public class ServerHubUserPrincipal implements UserDetails {

  private static final List<GrantedAuthority> AUTHORITIES =
      List.of(new SimpleGrantedAuthority("ROLE_USER"));

  private final Long id;
  private final String email;
  private final String displayName;
  private final String passwordHash;

  public ServerHubUserPrincipal(User user) {
    this.id = user.id();
    this.email = user.email();
    this.displayName = user.displayName();
    this.passwordHash = user.passwordHash();
  }

  public Long getId() {
    return id;
  }

  public String getDisplayName() {
    return displayName;
  }

  @Override
  public List<GrantedAuthority> getAuthorities() {
    return AUTHORITIES;
  }

  @Override
  public String getPassword() {
    return passwordHash;
  }

  @Override
  public String getUsername() {
    return email;
  }
}
