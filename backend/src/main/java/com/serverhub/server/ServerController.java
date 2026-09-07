package com.serverhub.server;

import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.PageRequestFactory;
import com.serverhub.common.page.PageResponse;
import com.serverhub.common.page.SortDirection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * サーバー API（基本設計 02-api §3.2、詳細設計 03-server）。
 *
 * <p>{@code GET /servers/{id}/maintenance-histories} は maintenance パッケージが担当する（本 PR 対象外）。
 */
@RestController
@RequestMapping("/api/v1/servers")
@Validated
public class ServerController {

  private final ServerService serverService;

  public ServerController(ServerService serverService) {
    this.serverService = serverService;
  }

  @GetMapping
  public PageResponse<ServerSummaryResponse> list(
      @RequestParam(defaultValue = "0") @PositiveOrZero int page,
      @RequestParam(required = false) Integer size,
      @RequestParam(defaultValue = "updatedAt") ServerSortKey sort,
      @RequestParam(defaultValue = "desc") SortDirection order,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Environment environment,
      @RequestParam(required = false) Status status,
      @RequestParam(required = false) List<String> tags) {

    PageRequest pageRequest = PageRequestFactory.create(page, size);
    return serverService.list(keyword, environment, status, tags, pageRequest, sort, order);
  }

  @GetMapping("/{id}")
  public ServerDetailResponse get(@PathVariable Long id) {
    return serverService.get(id);
  }

  @PostMapping
  public ResponseEntity<ServerDetailResponse> create(
      @Valid @RequestBody ServerCreateRequest request) {
    ServerDetailResponse created = serverService.create(request);
    return ResponseEntity.created(URI.create("/api/v1/servers/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  public ServerDetailResponse update(
      @PathVariable Long id, @Valid @RequestBody ServerUpdateRequest request) {
    return serverService.update(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    serverService.delete(id);
  }
}
