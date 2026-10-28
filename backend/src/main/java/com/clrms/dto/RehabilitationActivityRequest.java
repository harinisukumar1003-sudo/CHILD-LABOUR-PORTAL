package com.clrms.dto;

import com.clrms.entity.RehabilitationActivityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter @Setter
public class RehabilitationActivityRequest {
    @NotNull private RehabilitationActivityType activityType;
    @NotBlank private String description;
    @NotBlank private String providerName;
    @NotNull private LocalDate activityDate;
    private String outcomeNotes;
    private LocalDate nextFollowUpDate;
}