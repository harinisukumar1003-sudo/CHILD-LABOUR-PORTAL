
package com.clrms.config;

import com.clrms.filter.JwtAuthenticationFilter;
import com.clrms.repository.UserRepository;
import com.clrms.service.JwtTokenService;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    JwtAuthenticationFilter jwtAuthenticationFilter(
            JwtTokenService tokens,
            UserRepository users) {
        return new JwtAuthenticationFilter(tokens, users);
    }

    @Bean
    FilterRegistrationBean<JwtAuthenticationFilter>
    disableContainerJwtFilterRegistration(
            JwtAuthenticationFilter jwtAuthenticationFilter) {

        FilterRegistrationBean<JwtAuthenticationFilter> registration =
                new FilterRegistrationBean<>(jwtAuthenticationFilter);

        registration.setEnabled(false);
        return registration;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of(
                "https://child-labour-frontend1.onrender.com"
        ));

        config.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH",
                "DELETE", "OPTIONS"
        ));

        config.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin"
        ));

        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter)
            throws Exception {

        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .headers(headers -> headers
                        .contentSecurityPolicy(policy ->
                                policy.policyDirectives(
                                        "default-src 'self'; object-src 'none'; "
                                        + "base-uri 'self'; frame-ancestors 'none'"
                                ))
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(Customizer.withDefaults()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/auth/demo-accounts",
                                "/api/auth/demo-login",
                                "/api/reports",
                                "/api/reports/*/track",
                                "/api/cases/*/timeline",
                                "/api/public/locations",
                                "/api/public/**",
                                "/swagger-ui/**",
                                "/v3/api-docs/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
