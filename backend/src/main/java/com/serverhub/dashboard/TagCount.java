package com.serverhub.dashboard;

import org.seasar.doma.Entity;

/**
 * タグごとのサーバー数（詳細設計 05-dashboard §1・§2・§4、D-DASH-04）。
 *
 * <p>{@link DashboardDao#selectServerCountByTag()} は件数降順で<b>全件</b>返す。上位 10 件（{@code topTags}）と 11
 * 件目以降の合計（{@code otherTagsCount}）への切り出しは {@link DashboardService}（D-DASH-01、F5）。 0
 * 件のタグは返らない（表示する意味がないため）。
 */
@Entity(immutable = true)
public record TagCount(String tagName, long count) {}
