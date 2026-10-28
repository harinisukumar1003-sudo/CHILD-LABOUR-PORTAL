package com.clrms.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PublicStatsResponse(
    @JsonProperty("casesReported")
    long casesReported,
    
    @JsonProperty("childrenRescued")
    long childrenRescued,
    
    @JsonProperty("ongoingRehabilitation")
    long ongoingRehabilitation,
    
    @JsonProperty("activeOfficers")
    long activeOfficers
) {}
