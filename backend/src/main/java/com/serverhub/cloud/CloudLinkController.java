package com.serverhub.cloud;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * サーバーのクラウド連携サブリソース（FR-CLOUD-01、設計 07-aws-ec2-integration §5.2）。
 *
 * <p>紐付け（{@code cloud-link}）はサーバー本体とは別リソース。ここを更新しても {@code servers.version} は バンプしない（P7）。実行状態の取得は
 * {@code refresh} で明示的に行う。
 */
@RestController
@RequestMapping("/api/v1/servers/{id}/cloud-link")
public class CloudLinkController {

  private final CloudLinkService cloudLinkService;

  public CloudLinkController(CloudLinkService cloudLinkService) {
    this.cloudLinkService = cloudLinkService;
  }

  /** 紐付けの作成 / 置換。 */
  @PutMapping
  public CloudLinkResponse put(
      @PathVariable Long id, @Valid @RequestBody CloudLinkRequest request) {
    return cloudLinkService.upsert(id, request);
  }

  /** 紐付けの解除。 */
  @DeleteMapping
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    cloudLinkService.delete(id);
  }

  /** その 1 台だけ即時取得（失敗してもキャッシュ値を 200 で返す、P8）。 */
  @PostMapping("/refresh")
  public CloudLinkResponse refresh(@PathVariable Long id) {
    return cloudLinkService.refresh(id);
  }
}
