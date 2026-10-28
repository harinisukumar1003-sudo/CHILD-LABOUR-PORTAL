package com.clrms.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NgoAssignmentOptionResponse {
    private Long id;
    private Long organizationId;
    private String officialName;
    private String organizationName;
    private String email;
    private String phone;
    private String state;
    private String district;
    private String address;
    private long activeCaseCount;
}
