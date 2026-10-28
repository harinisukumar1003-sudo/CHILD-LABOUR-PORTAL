package com.clrms.dto;

import com.clrms.entity.NgoOrganization;

public record NgoReferralOptionResponse(
        Long id,
        String name,
        String district,
        Integer capacity,
        Integer availableBeds
) {
    public static NgoReferralOptionResponse from(NgoOrganization organization) {
        return new NgoReferralOptionResponse(organization.getId(), organization.getName(),
                organization.getDistrict(), organization.getCapacity(), organization.getAvailableBeds());
    }
}
