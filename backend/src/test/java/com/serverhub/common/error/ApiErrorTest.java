package com.serverhub.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class ApiErrorTest {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void omitsNullErrorsFromJson() throws Exception {
    String json =
        objectMapper.writeValueAsString(
            ApiError.of(ErrorCode.RESOURCE_NOT_FOUND, "対象が見つかりません。", "trace-1"));

    assertThat(json).doesNotContain("errors");
  }

  @Test
  void includesErrorsWhenValidation() throws Exception {
    String json =
        objectMapper.writeValueAsString(
            ApiError.validation(
                "入力内容を確認してください。", "trace-1", List.of(new FieldError("hostname", "ホスト名は必須です。"))));

    assertThat(json).contains("\"errors\"").contains("hostname");
    assertThat(json).contains("\"code\":\"" + ErrorCode.VALIDATION_ERROR + "\"");
  }
}
