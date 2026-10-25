package com.clrms.dto;

import com.clrms.entity.OrganizationType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PartnershipRequest(
        @NotBlank(message = "Organization name is required")
        @Size(max = 180)
        String organizationName,

        @NotNull(message = "Organization type is required")
        OrganizationType organizationType,

        @NotBlank(message = "Contact person is required")
        @Size(max = 120)
        String contactPerson,

        @NotBlank(message = "Email address is required")
        @Email(message = "Enter a valid email address")
        @Size(max = 254)
        String email,

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^[+()0-9 .-]{7,30}$", message = "Enter a valid phone number")
        String phone,

        @NotBlank(message = "Location is required")
        @Size(max = 180)
        String location,

        @NotBlank(message = "Partnership proposal or message is required")
        @Size(min = 10, max = 4000, message = "Proposal must be between 10 and 4000 characters")
        String message
) {}
