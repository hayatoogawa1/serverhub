package com.serverhub.common.error;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.serverhub.common.web.RequestLoggingFilter;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

/**
 * {@link GlobalExceptionHandler} が各例外を統一エラーレスポンスに変換することを、実際に MVC ディスパッチを通して確認する（Testcontainers
 * 不要、DB に依存しない Web レイヤスライステスト）。
 */
@WebMvcTest(controllers = GlobalExceptionHandlerTestController.class)
@Import(GlobalExceptionHandler.class)
class GlobalExceptionHandlerTest {

  @Autowired private MockMvc mockMvc;

  @Test
  void resourceNotFoundReturns404() throws Exception {
    mockMvc
        .perform(get("/test/not-found"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value(ErrorCode.RESOURCE_NOT_FOUND))
        .andExpect(jsonPath("$.errors").doesNotExist());
  }

  @Test
  void invalidQueryParamReturns400() throws Exception {
    mockMvc
        .perform(get("/test/type-mismatch").param("count", "not-a-number"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value(ErrorCode.VALIDATION_ERROR));
  }

  @Test
  void unexpectedExceptionReturns500WithoutLeakingDetails() throws Exception {
    mockMvc
        .perform(get("/test/boom"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.code").value(ErrorCode.INTERNAL_ERROR))
        .andExpect(jsonPath("$.message").value("システムエラーが発生しました。"));
  }

  @Test
  void includesTraceIdFromMdc() throws Exception {
    MDC.put(RequestLoggingFilter.TRACE_ID_MDC_KEY, "test-trace-id");
    try {
      mockMvc
          .perform(get("/test/not-found"))
          .andExpect(jsonPath("$.traceId").value("test-trace-id"));
    } finally {
      MDC.remove(RequestLoggingFilter.TRACE_ID_MDC_KEY);
    }
  }
}
