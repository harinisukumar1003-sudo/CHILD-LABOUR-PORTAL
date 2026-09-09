package com.clrms.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RehabilitationCenterRequest {
    @NotBlank private String name;
    @NotBlank private String address;
    @NotBlank private String contactPerson;
    @NotBlank private String contactPhone;
    @NotNull @Min(1) private Integer capacity;
    @NotBlank private String servicesOffered;
}