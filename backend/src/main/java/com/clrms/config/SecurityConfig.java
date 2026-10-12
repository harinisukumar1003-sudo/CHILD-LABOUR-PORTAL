package com.clrms.config;

import com.clrms.filter.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.Customizer;
import org.springframework.boot.web.servlet.FilterRegistrationBean;

@Configuration @EnableWebSecurity @EnableMethodSecurity
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean JwtAuthenticationFilter jwtAuthenticationFilter(com.clrms.service.JwtTokenService tokens,
                                                              com.clrms.repository.UserRepository users) {
        return new JwtAuthenticationFilter(tokens, users);
    }
    @Bean FilterRegistrationBean<JwtAuthenticationFilter> disableContainerJwtFilterRegistration(
            JwtAuthenticationFilter jwtAuthenticationFilter) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>(jwtAuthenticationFilter);
        registration.setEnabled(false);
        return registration;
    }
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        return http.csrf(csrf -> csrf.disable()).cors(cors -> {}).headers(headers -> headers
            .contentSecurityPolicy(policy -> policy.policyDirectives("default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"))
            .frameOptions(frame -> frame.deny())
            .contentTypeOptions(Customizer.withDefaults()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password",
                            "/api/reports", "/api/reports/*/track", "/api/cases/*/timeline", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                    .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                    .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}