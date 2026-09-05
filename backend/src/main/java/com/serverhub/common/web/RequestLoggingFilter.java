package com.serverhub.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

/**
 * リクエストごとに {@code traceId} を採番して MDC へ設定し、完了時に 1 行のリクエストログ （メソッド・パス・ステータス・所要時間・traceId）を出力する（詳細設計
 * 05-cross-cutting §4.1）。
 *
 * <p>リクエスト/レスポンスボディは全文ダンプしない（requirements §10.1.11）。{@code finally} で 必ず {@link MDC#remove}
 * し、スレッドプール再利用時の漏洩を防ぐ。
 *
 * <p>Spring Security の {@code FilterChainProxy} より前段で動く必要がある（401 になったリクエストにも traceId を残すため）ため、登録は
 * {@code FilterRegistrationBean} で明示的な順序をつけて行う （{@link com.serverhub.config.FilterConfig}）。
 */
public class RequestLoggingFilter extends HttpFilter {

  public static final String TRACE_ID_MDC_KEY = "traceId";
  public static final String TRACE_ID_HEADER = "X-Trace-Id";

  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  protected void doFilter(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    String traceId = UUID.randomUUID().toString();
    MDC.put(TRACE_ID_MDC_KEY, traceId);
    response.setHeader(TRACE_ID_HEADER, traceId);
    long startMillis = System.currentTimeMillis();
    try {
      chain.doFilter(request, response);
    } finally {
      long durationMillis = System.currentTimeMillis() - startMillis;
      log.info(
          "{} {} {} {}ms",
          request.getMethod(),
          request.getRequestURI(),
          response.getStatus(),
          durationMillis);
      MDC.remove(TRACE_ID_MDC_KEY);
    }
  }
}
