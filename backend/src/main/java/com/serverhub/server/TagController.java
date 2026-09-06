package com.serverhub.server;

import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** タグ API（基本設計 02-api §3.3）。前方一致サジェストのみ（FR-TAG-02）。 */
@RestController
@RequestMapping("/api/v1/tags")
@Validated
public class TagController {

  private final TagService tagService;

  public TagController(TagService tagService) {
    this.tagService = tagService;
  }

  @GetMapping("/suggest")
  public List<String> suggest(@RequestParam @Size(max = 50) String prefix) {
    return tagService.suggest(prefix);
  }
}
