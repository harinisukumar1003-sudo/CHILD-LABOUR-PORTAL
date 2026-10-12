package com.clrms.dto;

public record AuthSessionResponse(String token, AuthUserResponse user) { }
