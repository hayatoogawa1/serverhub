package com.serverhub.dashboard;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ダッシュボード API（基本設計 02-api §3.5、詳細設計 05-dashboard、FR-DASH-01）。
 *
 * <p>入力パラメータのない読み取り専用エンドポイント。{@code 401}（未認証、Spring Security が処理）以外の 業務エラーはなく、データ 0 件でも {@code 200}
 * + 0 埋めのレスポンスで成立する（05-dashboard §6）。
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

  private final DashboardService dashboardService;

  public DashboardController(DashboardService dashboardService) {
    this.dashboardService = dashboardService;
  }

  @GetMapping("/summary")
  public DashboardSummaryResponse summary() {
    return dashboardService.getSummary();
  }
}
