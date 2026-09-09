package com.clrms.dto;

import java.time.Instant;

public record CaseTimelineEntryResponse(String stage, String label, Instant timestamp, String actor,
                                        String remarks, boolean isCompleted, boolean isCurrent) { }