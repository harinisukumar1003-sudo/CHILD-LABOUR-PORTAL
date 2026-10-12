package com.clrms.dto;

public record AdminDashboardOverviewResponse(long totalCases, long activeCases, long childrenRescued,
                                             long casesThisMonth, double resolutionRate,
                                             double averageTimeToRescueHours, double averageTimeToClosureHours,
                                             long activeOfficers, long pendingAccountApprovals,
                                             double totalCasesTrend, double activeCasesTrend,
                                             double childrenRescuedTrend, double resolutionRateTrend) { }