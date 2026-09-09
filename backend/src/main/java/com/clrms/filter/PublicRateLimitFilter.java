package com.clrms.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class PublicRateLimitFilter extends OncePerRequestFilter {
    private final Map<String, RateLimitBucket> buckets = new ConcurrentHashMap<>();
    
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain chain) throws ServletException, IOException {
        if (!limitedEndpoint(request)) {
            chain.doFilter(request, response);
            return;
        }
        
        String clientId = client(request);
        RateLimitBucket bucket = buckets.computeIfAbsent(clientId, key -> new RateLimitBucket(60, 60000));
        
        if (!bucket.tryConsume()) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.getWriter().write("Rate limit exceeded");
            return;
        }
        
        chain.doFilter(request, response);
    }
    
    private boolean limitedEndpoint(HttpServletRequest request) {
        String path = request.getRequestURI();
        return ("POST".equals(request.getMethod()) && "/api/reports".equals(path)) ||
               ("GET".equals(request.getMethod()) && (path.matches("/api/reports/[^/]+/track") || path.matches("/api/cases/[^/]+/timeline")));
    }
    
    private String client(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
    
    private static class RateLimitBucket {
        private final int maxRequests;
        private final long windowMs;
        private final AtomicInteger requestCount = new AtomicInteger(0);
        private long windowStart = System.currentTimeMillis();
        
        RateLimitBucket(int maxRequests, long windowMs) {
            this.maxRequests = maxRequests;
            this.windowMs = windowMs;
        }
        
        synchronized boolean tryConsume() {
            long now = System.currentTimeMillis();
            if (now - windowStart > windowMs) {
                requestCount.set(0);
                windowStart = now;
            }
            
            if (requestCount.get() < maxRequests) {
                requestCount.incrementAndGet();
                return true;
            }
            return false;
        }
    }
}