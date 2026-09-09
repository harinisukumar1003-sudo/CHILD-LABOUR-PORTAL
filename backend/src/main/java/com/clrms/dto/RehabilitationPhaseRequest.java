package com.clrms.dto;

import com.clrms.entity.RehabilitationPhase;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RehabilitationPhaseRequest {
    @NotNull private RehabilitationPhase phase;
}