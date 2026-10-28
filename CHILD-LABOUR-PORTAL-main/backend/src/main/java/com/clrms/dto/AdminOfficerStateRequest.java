package com.clrms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AdminOfficerStateRequest {
    @NotBlank private String state;
}
