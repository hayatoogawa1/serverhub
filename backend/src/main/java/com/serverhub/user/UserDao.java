package com.serverhub.user;

import java.util.Optional;
import org.seasar.doma.Dao;
import org.seasar.doma.Select;
import org.seasar.doma.boot.ConfigAutowireable;

/**
 * {@code users} テーブルへのアクセス（詳細設計 02-auth §2）。
 *
 * <p>MVP では {@code selectByEmail} のみ（登録・更新 API を持たない、B1）。
 */
@Dao
@ConfigAutowireable
public interface UserDao {

  @Select
  Optional<User> selectByEmail(String email);
}
