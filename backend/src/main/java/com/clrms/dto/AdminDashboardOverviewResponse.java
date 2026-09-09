package com.clrms.dto;

public record AdminDashboardOverviewResponse(long totalCases, long casesThisMonth, double resolutionRate,
                                             double averageTimeToRescueHours, double averageTimeToClosureHours,
                                             long activeOfficers, long pendingAccountApprovals) { }