package com.paypilot.config;

import com.paypilot.security.AuthInterceptor;
import com.paypilot.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final JwtUtil jwtUtil;

    @Value("${paypilot.uploads-dir}")
    private String uploadsDir;

    public WebConfig(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor(jwtUtil))
            .addPathPatterns("/api/**")
            .excludePathPatterns(
                "/api/auth/signup",
                "/api/auth/login",
                "/api/auth/screen-challenge",
                "/api/auth/verify-screen",
                "/api/auth/verify-otp",
                "/api/auth/forgot/request",
                "/api/auth/forgot/verify",
                "/api/auth/forgot/reset"
            );
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
            .addResourceLocations("file:" + uploadsDir + "/");
    }
}
