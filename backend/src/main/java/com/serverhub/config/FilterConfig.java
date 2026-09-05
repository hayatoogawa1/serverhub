package com.serverhub.config;

import com.serverhub.common.web.RequestLoggingFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * 横断フィルタの登録。
 *
 * <p>{@link RequestLoggingFilter} は Spring Security のフィルタチェーンより前段で動く必要がある ため、{@link
 * Ordered#HIGHEST_PRECEDENCE} を明示する（詳細設計 05-cross-cutting §4.1）。
 */
@Configuration
public class FilterConfig {

  @Bean
  FilterRegistrationBean<RequestLoggingFilter> requestLoggingFilter() {
    FilterRegistrationBean<RequestLoggingFilter> registration =
        new FilterRegistrationBean<>(new RequestLoggingFilter());
    registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
    registration.addUrlPatterns("/*");
    return registration;
  }
}
