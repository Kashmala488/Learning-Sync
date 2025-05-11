package com.example.authservice.service;

import lombok.Builder;
import lombok.Data;

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
} 