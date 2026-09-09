package com.clrms.aspect;

import com.clrms.entity.AuditLog;
import com.clrms.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class AuditLogAspect {
    private final AuditLogRepository audit;
    private final ObjectMapper mapper;

    public AuditLogAspect(AuditLogRepository audit, ObjectMapper mapper) { this.audit = audit; this.mapper = mapper; }

    @Around("execution(* com.clrms.service.CaseReportService.create(..)) || execution(* com.clrms.service.CaseManagementService.assign(..)) || execution(* com.clrms.service.CaseManagementService.updateStatus(..)) || execution(* com.clrms.service.RehabilitationService.create(..)) || execution(* com.clrms.service.RehabilitationService.addActivity(..)) || execution(* com.clrms.service.RehabilitationService.updatePhase(..)) || execution(* com.clrms.service.AdminManagementService.approve(..)) || execution(* com.clrms.service.AdminManagementService.suspend(..)) || execution(* com.clrms.service.AdminManagementService.role(..)) || execution(* com.clrms.service.AdminManagementService.export(..))")
    public Object record(ProceedingJoinPoint joinPoint) throws Throwable {
        String before = snapshot(joinPoint.getArgs());
        Object result = joinPoint.proceed();
        AuditLog log = new AuditLog();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        log.setAdminUserId(userId(authentication)); log.setAction(joinPoint.getSignature().getName().toUpperCase());
        log.setTargetEntity(targetEntity(joinPoint)); log.setTargetId(targetId(joinPoint.getArgs(), result));
        log.setBeforeState(before); log.setAfterState(snapshot(result)); log.setIpAddress(ipAddress());
        audit.save(log);
        return result;
    }

    private String snapshot(Object value) { try { return mapper.writeValueAsString(value); } catch (Exception ignored) { return String.valueOf(value); } }
    private String targetEntity(ProceedingJoinPoint joinPoint) { String type = joinPoint.getSignature().getDeclaringTypeName(); if (type.contains("CaseReport")) return "CaseReport"; if (type.contains("Rehabilitation")) return "RehabilitationCase"; if (type.contains("AdminManagement")) return "User"; return "Unknown"; }
    private Long targetId(Object[] args, Object result) { for (Object arg : args) if (arg instanceof Long id) return id; try { return (Long) result.getClass().getRecordComponents()[0].getAccessor().invoke(result); } catch (Exception ignored) { return null; } }
    private Long userId(Authentication authentication) { try { return authentication == null ? null : Long.valueOf(authentication.getName()); } catch (Exception ignored) { return null; } }
    private String ipAddress() { ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes(); if (attributes == null) return null; HttpServletRequest request = attributes.getRequest(); return request.getRemoteAddr(); }
}