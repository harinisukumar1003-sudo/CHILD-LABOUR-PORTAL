package com.clrms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {
    @Bean
    WebMvcConfigurer corsConfigurer(
            @Value("${app.frontend-url}") String frontendUrl,
            @Value("${app.cors.allowed-origin-patterns:}") String allowedOriginPatterns
    ) {
        return new WebMvcConfigurer() {
            @Override 
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                CorsRegistration cors = registry.addMapping("/**")
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
                List<String> originPatterns = Arrays.stream(allowedOriginPatterns.split(","))
                        .map(String::trim)
                        .filter(pattern -> !pattern.isEmpty())
                        .toList();
                if (originPatterns.isEmpty()) {
                    cors.allowedOrigins(frontendUrl);
                } else {
                    cors.allowedOriginPatterns(originPatterns.toArray(String[]::new));
                }
            }
        };
    }
}