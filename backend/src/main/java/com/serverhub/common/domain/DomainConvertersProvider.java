package com.serverhub.common.domain;

import org.seasar.doma.DomainConverters;

/**
 * Doma に登録する {@link org.seasar.doma.jdbc.domain.DomainConverter} 実装の一覧（D-DETAIL-04）。
 *
 * <p>このクラスの完全修飾名を注釈処理オプション {@code doma.domain.converters} （build.gradle.kts の {@code
 * -Adoma.domain.converters=...}）で指定する。新しい enum の DB 変換を 追加する場合は、対応する {@code DomainConverter}
 * 実装を作成しここに追記する。
 */
@DomainConverters({
  EnvironmentConverter.class,
  StatusConverter.class,
  VirtualizationTypeConverter.class,
  MaintenanceTypeConverter.class
})
public class DomainConvertersProvider {}
