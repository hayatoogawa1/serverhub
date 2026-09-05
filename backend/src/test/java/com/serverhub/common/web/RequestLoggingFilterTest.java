package com.serverhub.common.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

class RequestLoggingFilterTest {

  private final RequestLoggingFilter filter = new RequestLoggingFilter();

  @Test
  void setsTraceIdHeaderAndClearsMdcAfterChain() throws Exception {
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    FilterChain chain = mock(FilterChain.class);
    when(request.getMethod()).thenReturn("GET");
    when(request.getRequestURI()).thenReturn("/api/v1/servers");
    when(response.getStatus()).thenReturn(200);

    filter.doFilter(request, response, chain);

    verify(response).setHeader(eq(RequestLoggingFilter.TRACE_ID_HEADER), anyString());
    verify(chain).doFilter(request, response);
    assertThat(MDC.get(RequestLoggingFilter.TRACE_ID_MDC_KEY)).isNull();
  }

  @Test
  void clearsMdcEvenWhenChainThrows() throws Exception {
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    FilterChain chain = mock(FilterChain.class);
    when(request.getMethod()).thenReturn("GET");
    when(request.getRequestURI()).thenReturn("/api/v1/servers");
    when(response.getStatus()).thenReturn(500);
    doThrow(new IOException("boom")).when(chain).doFilter(request, response);

    assertThatThrownBy(() -> filter.doFilter(request, response, chain))
        .isInstanceOf(IOException.class);

    assertThat(MDC.get(RequestLoggingFilter.TRACE_ID_MDC_KEY)).isNull();
  }
}
