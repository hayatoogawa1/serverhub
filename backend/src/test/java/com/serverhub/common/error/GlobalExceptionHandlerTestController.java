package com.serverhub.common.error;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** {@link GlobalExceptionHandlerTest} 専用のテスト用コントローラ。各種例外を意図的に送出する。 */
@RestController
public class GlobalExceptionHandlerTestController {

  @GetMapping("/test/not-found")
  String notFound() {
    throw new ResourceNotFoundException("Server", 1L);
  }

  @GetMapping("/test/type-mismatch")
  String typeMismatch(@RequestParam int count) {
    return "ok:" + count;
  }

  @GetMapping("/test/boom")
  String boom() {
    throw new IllegalStateException("something went wrong internally");
  }
}
