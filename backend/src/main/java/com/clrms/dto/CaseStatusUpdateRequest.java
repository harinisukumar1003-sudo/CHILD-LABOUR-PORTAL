package com.clrms.dto;

import com.clrms.entity.CaseStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CaseStatusUpdateRequest {
    @NotNull
    private CaseStatus status;
    @NotBlank
    private String remarks;
    private String attachmentUrl;
}