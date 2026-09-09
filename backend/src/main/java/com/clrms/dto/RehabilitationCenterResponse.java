package com.clrms.dto;

import com.clrms.entity.RehabilitationCenter;

public record RehabilitationCenterResponse(Long id, String name, String address, String contactPerson, String contactPhone,
                                            Integer capacity, String servicesOffered) {
    public static RehabilitationCenterResponse from(RehabilitationCenter center) {
        return new RehabilitationCenterResponse(center.getId(), center.getName(), center.getAddress(), center.getContactPerson(),
                center.getContactPhone(), center.getCapacity(), center.getServicesOffered());
    }
}