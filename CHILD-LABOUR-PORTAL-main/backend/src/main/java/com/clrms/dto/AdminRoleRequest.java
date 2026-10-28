package com.clrms.dto;

import com.clrms.entity.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AdminRoleRequest { @NotNull private UserRole role; }