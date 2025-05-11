package com.example.authservice.service;

import lombok.Builder;
import lombok.Data;

/**
 * @deprecated Use com.example.authservice.dto.GoogleUserInfo instead.
 * This class is kept for backward compatibility and delegates to the DTO version.
 */
@Data
@Builder
public class GoogleUserInfo {
    private String id;
    private String email;
    private String name;
    private String picture;
    private boolean verified_email;
    private String locale;

    public String getSocialId() {
        return id;
    }
    
    /**
     * Convert to DTO version
     */
    public com.example.authservice.dto.GoogleUserInfo toDto() {
        return com.example.authservice.dto.GoogleUserInfo.builder()
                .id(this.id)
                .email(this.email)
                .name(this.name)
                .picture(this.picture)
                .verified_email(this.verified_email)
                .locale(this.locale)
                .build();
    }
    
    /**
     * Create from DTO version
     */
    public static GoogleUserInfo fromDto(com.example.authservice.dto.GoogleUserInfo dto) {
        return GoogleUserInfo.builder()
                .id(dto.getId())
                .email(dto.getEmail())
                .name(dto.getName())
                .picture(dto.getPicture())
                .verified_email(dto.isVerified_email())
                .locale(dto.getLocale())
                .build();
    }
} 