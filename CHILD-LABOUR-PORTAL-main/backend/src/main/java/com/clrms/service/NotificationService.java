package com.clrms.service;

import com.clrms.dto.NotificationResponse;
import com.clrms.entity.*;
import com.clrms.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.*;

@Service
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final NotificationRepository notifications; @SuppressWarnings("unused") private final CaseReportRepository reports; private final RehabilitationActivityRepository activities; private final RehabilitationCaseRepository rehabilitationCases; private final UserRepository users; private final SimpMessagingTemplate messaging; private final JavaMailSender mailSender; private final ApplicationEventPublisher eventPublisher;
    @Value("${app.mail-from:clrms@localhost}") private String mailFrom;
    @Value("${app.notification.default-email:}") private String defaultEmail;
    @Value("${app.notification.staff-user-ids:}") private String staffUserIds;

    public NotificationService(NotificationRepository notifications, CaseReportRepository reports, RehabilitationActivityRepository activities, RehabilitationCaseRepository rehabilitationCases, UserRepository users, SimpMessagingTemplate messaging, JavaMailSender mailSender, ApplicationEventPublisher eventPublisher) { this.notifications = notifications; this.reports = reports; this.activities = activities; this.rehabilitationCases = rehabilitationCases; this.users = users; this.messaging = messaging; this.mailSender = mailSender; this.eventPublisher = eventPublisher; }

    @EventListener
    @Transactional
    public void onNewCase(NewCaseReportedEvent event) { if (event.getSource() instanceof CaseReport report) { if (report.getReporterId() != null) create(report.getReporterId(), NotificationType.NEW_REPORT, "Report received", "Your report " + event.getCaseNumber() + " has been received.", event.getCaseId(), defaultEmail, urgent(report.getUrgencyLevel())); notifyAdmins(event.getCaseId(), event.getCaseNumber(), "A new case is ready for review.", null); } }

    @EventListener
    @Transactional
    public void onAssigned(CaseAssignedEvent event) {
        boolean reassigned = event.getPreviousOfficerId() != null;
        create(event.getAssignedOfficerId(), NotificationType.CASE_ASSIGNED,
                reassigned ? "Case reassigned" : "Case assigned",
                "Case " + event.getCaseNumber() + (reassigned ? " has been reassigned to you." : " has been assigned to you."),
                event.getCaseId(), defaultEmail, urgent(event.getUrgency()));
        if (reassigned && !event.getPreviousOfficerId().equals(event.getAssignedOfficerId())) {
            create(event.getPreviousOfficerId(), NotificationType.CASE_ASSIGNED, "Case reassigned",
                    "Case " + event.getCaseNumber() + " has been reassigned to another officer.",
                    event.getCaseId(), defaultEmail, urgent(event.getUrgency()));
        }
        if (event.getAssignedByAdminId() != null && !event.getAssignedByAdminId().equals(event.getAssignedOfficerId())) {
            create(event.getAssignedByAdminId(), NotificationType.CASE_ASSIGNED, "Assignment recorded",
                    "Case " + event.getCaseNumber() + " was assigned successfully.", event.getCaseId(), defaultEmail, true);
        }
    }

    @EventListener
    @Transactional
    public void onNgoReferralCreated(NgoReferralCreatedEvent event) {
        event.recipientUserIds().stream().filter(java.util.Objects::nonNull).distinct()
                .forEach(recipient -> create(recipient, NotificationType.STATUS_CHANGED,
                        "New rehabilitation referral",
                        "Case " + event.caseNumber() + " was referred to your NGO.",
                        event.caseId(), defaultEmail, urgent(event.urgency())));
    }

    @EventListener
    @Transactional
    public void onStatusChanged(CaseStatusChangedEvent event) {
        if (event.getRecipientUserId() != null && !event.getRecipientUserId().equals(event.getActorId())) {
            boolean referralRejected = event.getPreviousStatus() == CaseStatus.REHABILITATION_REFERRED
                    && event.getNewStatus() == CaseStatus.INVESTIGATION_COMPLETED;
            String message = referralRejected
                    ? "The NGO declined case " + event.getCaseNumber() + ". Refer it to another active NGO."
                    : "Case " + event.getCaseNumber() + " is now "
                    + event.getNewStatus().name().replace('_', ' ') + ".";
            create(event.getRecipientUserId(), NotificationType.STATUS_CHANGED,
                    referralRejected ? "Referral declined" : "Case status updated",
                    message, event.getCaseId(), defaultEmail, urgent(event.getUrgency()));
        }
        notifyAdmins(event.getCaseId(), event.getCaseNumber(),
                "Case " + event.getCaseNumber() + " was updated: "
                        + event.getNewStatus().name().replace('_', ' ') + ".",
                event.getActorId());
    }

    private void notifyAdmins(Long caseId, String caseNumber, String message, Long excludedActor) {
        users.findByRole(UserRole.ADMIN, org.springframework.data.domain.Pageable.unpaged()).getContent().stream()
                .filter(user -> !user.getId().equals(excludedActor))
                .forEach(user -> create(user.getId(), NotificationType.STATUS_CHANGED, "Case update", message, caseId, defaultEmail, false));
    }

    @EventListener
    @Transactional
    public void onFollowUpDue(FollowUpDueEvent event) { create(event.getRecipientUserId(), NotificationType.FOLLOW_UP_DUE, "Follow-up due", "A rehabilitation follow-up is due on " + event.getFollowUpDate() + ".", event.getRehabilitationCaseId(), defaultEmail, true); }

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    @SuppressWarnings("null")
    public void publishDueFollowUps() { LocalDate today = LocalDate.now(); for (RehabilitationActivity activity : activities.findByNextFollowUpDateLessThanEqualOrderByNextFollowUpDateAsc(today)) { RehabilitationCase rehab = rehabilitationCases.findById(activity.getRehabilitationCaseId()).orElse(null); if (rehab == null || notifications.existsByRecipientUserIdAndTypeAndRelatedCaseIdAndCreatedAtBetween(rehab.getAssignedCounsellorId(), NotificationType.FOLLOW_UP_DUE, rehab.getId(), today.atStartOfDay(ZoneOffset.UTC).toInstant(), today.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant())) continue; eventPublisher.publishEvent(new FollowUpDueEvent(this, activity.getId(), rehab.getId(), rehab.getAssignedCounsellorId(), activity.getNextFollowUpDate())); } }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(AuthenticationUser authentication, Pageable pageable) { return notifications.findByRecipientUserIdOrderByCreatedAtDesc(authentication.id(), pageable).map(NotificationResponse::from); }
    @Transactional public NotificationResponse markRead(Long id, AuthenticationUser authentication) { Notification notification = owned(id, authentication.id()); notification.setRead(true); return NotificationResponse.from(notifications.save(notification)); }
    @Transactional public int markAllRead(AuthenticationUser authentication) { return notifications.markAllRead(authentication.id()); }
    @Transactional(readOnly = true) public long unreadCount(AuthenticationUser authentication) { return notifications.countByRecipientUserIdAndIsReadFalse(authentication.id()); }

    @SuppressWarnings("null")
    private Notification create(Long recipient, NotificationType type, String title, String message, Long caseId, String email, boolean sendEmail) { if (recipient == null) return null; Notification notification = new Notification(); notification.setRecipientUserId(recipient); notification.setType(type); notification.setTitle(title); notification.setMessage(message); notification.setRelatedCaseId(caseId); notification.setRead(false); Notification saved = notifications.save(notification); messaging.convertAndSend("/topic/notifications/" + recipient, NotificationResponse.from(saved)); if (sendEmail && email != null && !email.isBlank()) sendEmail(email, title, message); return saved; }
    private void sendEmail(String recipient, String subject, String message) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(mailFrom);
            mail.setTo(recipient);
            mail.setSubject(subject);
            mail.setText(message);
            mailSender.send(mail);
        } catch (Exception ex) {
            log.error("Failed to send notification email to {}: {}", recipient, ex.getMessage(), ex);
        }
    }
    private boolean urgent(UrgencyLevel urgency) { return urgency == UrgencyLevel.HIGH || urgency == UrgencyLevel.CRITICAL; }
    private Notification owned(Long id, Long recipient) { 
        @SuppressWarnings("null")
        Notification notification = notifications.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found")); 
        if (!notification.getRecipientUserId().equals(recipient)) throw new ResponseStatusException(HttpStatus.FORBIDDEN); 
        return notification; 
    }
    public record AuthenticationUser(Long id) { }
}
