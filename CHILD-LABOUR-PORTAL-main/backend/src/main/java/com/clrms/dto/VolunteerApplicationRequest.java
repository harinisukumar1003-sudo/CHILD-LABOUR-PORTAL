package com.clrms.dto;

import com.clrms.entity.VolunteerInterest;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VolunteerApplicationRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 120, message = "Full name must be at most 120 characters")
        String fullName,

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

        @NotNull(message = "Area of interest is required")
        VolunteerInterest areaOfInterest,

        @Size(max = 3000, message = "Skills or experience must be at most 3000 characters")
        String skills,

        @Size(max = 3000, message = "Message must be at most 3000 characters")
        String message
) {}
