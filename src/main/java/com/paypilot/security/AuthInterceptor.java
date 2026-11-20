package com.paypilot.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

public class AuthInterceptor implements HandlerInterceptor {

    public static final String USER_ID_ATTR = "userId";
    public static final String IS_ADMIN_ATTR = "isAdmin";

    private final JwtUtil jwtUtil;

    public AuthInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        String header = request.getHeader("Authorization");
        String token = (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;
        if (token == null) {
            sendUnauthorized(response, "Authentication required.");
            return false;
        }
        try {
            Claims claims = jwtUtil.parseClaims(token);
            request.setAttribute(USER_ID_ATTR, claims.getSubject());
            request.setAttribute(IS_ADMIN_ATTR, Boolean.TRUE.equals(claims.get("isAdmin", Boolean.class)));
            return true;
        } catch (Exception e) {
            sendUnauthorized(response, "Invalid or expired session.");
            return false;
        }
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
