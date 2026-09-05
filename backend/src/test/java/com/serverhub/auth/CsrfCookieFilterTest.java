package com.serverhub.auth;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;

class CsrfCookieFilterTest {

  private final CsrfCookieFilter filter = new CsrfCookieFilter();

  @Test
  void materializesTokenWhenPresent() throws Exception {
    CsrfToken csrfToken = mock(CsrfToken.class);
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setAttribute(CsrfToken.class.getName(), csrfToken);
    MockHttpServletResponse response = new MockHttpServletResponse();
    FilterChain chain = mock(FilterChain.class);

    filter.doFilter(request, response, chain);

    verify(csrfToken).getToken();
    verify(chain).doFilter(request, response);
  }

  @Test
  void doesNothingWhenTokenAbsent() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();
    FilterChain chain = mock(FilterChain.class);

    filter.doFilter(request, response, chain);

    verify(chain).doFilter(request, response);
  }
}
