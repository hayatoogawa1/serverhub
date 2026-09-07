package com.serverhub.maintenance;

import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.PageRequestFactory;
import com.serverhub.common.page.PageResponse;
import com.serverhub.common.page.SortDirection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * メンテナンス履歴 API（基本設計 02-api §3.4、詳細設計 04-maintenance）。
 *
 * <p>登録・参照のみ（BR-06）。編集・削除のエンドポイントは存在しない。サーバー詳細内の履歴 （{@code GET
 * /servers/{id}/maintenance-histories}）は {@link ServerMaintenanceHistoryController}。
 */
@RestController
@RequestMapping("/api/v1/maintenance-histories")
@Validated
public class MaintenanceHistoryController {

  private final MaintenanceHistoryService maintenanceHistoryService;

  public MaintenanceHistoryController(MaintenanceHistoryService maintenanceHistoryService) {
    this.maintenanceHistoryService = maintenanceHistoryService;
  }

  @GetMapping
  public PageResponse<MaintenanceHistorySummaryResponse> list(
      @RequestParam(defaultValue = "0") @PositiveOrZero int page,
      @RequestParam(required = false) Integer size,
      @RequestParam(defaultValue = "performedDate") MaintenanceSortKey sort,
      @RequestParam(defaultValue = "desc") SortDirection order,
      @RequestParam(required = false) Long serverId) {

    PageRequest pageRequest = PageRequestFactory.create(page, size);
    return maintenanceHistoryService.list(serverId, pageRequest, sort, order);
  }

  @PostMapping
  public ResponseEntity<MaintenanceHistoryDetailResponse> create(
      @Valid @RequestBody MaintenanceHistoryCreateRequest request) {
    MaintenanceHistoryDetailResponse created = maintenanceHistoryService.create(request);
    return ResponseEntity.created(URI.create("/api/v1/maintenance-histories/" + created.id()))
        .body(created);
  }
}
