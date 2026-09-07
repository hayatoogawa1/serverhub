package com.serverhub.maintenance;

import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.PageRequestFactory;
import com.serverhub.common.page.PageResponse;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * サーバー詳細内のメンテナンス履歴 API（基本設計 02-api §3.2、FR-MNT-03 / UC-12）。
 *
 * <p>{@code server} パッケージの {@code ServerController} には置かず、履歴機能として {@code maintenance}
 * パッケージが担当する（詳細設計 04-maintenance §4）。対象サーバーが不存在・削除済みなら {@code 404}（D-MNT-02）。
 */
@RestController
@RequestMapping("/api/v1/servers/{serverId}/maintenance-histories")
@Validated
public class ServerMaintenanceHistoryController {

  private final MaintenanceHistoryService maintenanceHistoryService;

  public ServerMaintenanceHistoryController(MaintenanceHistoryService maintenanceHistoryService) {
    this.maintenanceHistoryService = maintenanceHistoryService;
  }

  @GetMapping
  public PageResponse<MaintenanceHistoryDetailResponse> listByServer(
      @PathVariable Long serverId,
      @RequestParam(defaultValue = "0") @PositiveOrZero int page,
      @RequestParam(required = false) Integer size) {

    PageRequest pageRequest = PageRequestFactory.create(page, size);
    return maintenanceHistoryService.listByServer(serverId, pageRequest);
  }
}
