package com.serverhub.server;

import java.util.List;

/**
 * サーバー一覧・検索の絞り込み条件（Service 内部専用、詳細設計 03-server §3.1）。
 *
 * <p>リクエスト DTO をそのまま {@code ServerDao} に渡さず、この型を経由する。{@code tagIds} は タグ名から {@code
 * TagDao.selectByNames} で解決済みの ID（D-SRV-05：存在しないタグ名を含む場合は DAO
 * を呼ばず空リストを返すため、ここに渡る時点で全件解決済みであることが前提）。
 */
public record ServerSearchCriteria(
    String keyword, Environment environment, Status status, List<Long> tagIds) {}
