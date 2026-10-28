package com.clrms.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OfficerAssignmentOptionResponse {
    private Long id;
    private String name;
    private String email;
    private String state;
    private String district;
    private String badgeNumber;
    private String department;
    private long activeCaseCount;
    private boolean recommended;
}
