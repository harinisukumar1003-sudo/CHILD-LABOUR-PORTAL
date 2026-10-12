package com.clrms.filter;

import com.clrms.service.JwtTokenService;
import com.clrms.entity.User;
import com.clrms.entity.UserStatus;
import com.clrms.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.lang.NonNull;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenService tokens;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtTokenService tokens, UserRepository users) {
        this.tokens = tokens;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                Claims claims = tokens.parse(header.substring(7));
                String userId = claims.getSubject();
                User user = userId == null ? null
                        : users.findById(Objects.requireNonNull(Long.valueOf(userId))).orElse(null);
                if (user != null && user.getStatus() == UserStatus.ACTIVE) {
                    var authentication = new UsernamePasswordAuthenticationToken(
                            userId, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException | IllegalArgumentException exception) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
