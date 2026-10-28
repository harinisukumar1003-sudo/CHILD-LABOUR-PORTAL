package com.clrms.entity;

public enum UserRole {
    CITIZEN,
    OFFICER,
    NGO_OFFICIAL,
    NGO_STAFF,
    ADMIN;

    public boolean isNgo() {
        return this == NGO_OFFICIAL || this == NGO_STAFF;
    }
}