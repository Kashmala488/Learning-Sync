package com.example.authservice.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User implements UserDetails {
    @Id
    private String id;
    private String name;
    private String email;
    private String password;
    private String role;
    private String socialId;
    private String picture;
    private String refreshToken;
    private double[] coordinates;
    private boolean locationSharing;

    // Location object
    @Builder.Default
    private Map<String, Object> location = new HashMap<String, Object>() {{
        put("type", "Point");
        put("coordinates", List.of(0.0, 0.0));
        put("locationSharing", true);
        put("lastLocationUpdate", new Date());
    }};

    // Common profile fields
    private String bio;
    private String phoneNumber;
    private Date dateOfBirth;
    private String address;
    @Builder.Default
    private List<String> groups = new ArrayList<>();

    // Student profile
    @Builder.Default
    private Map<String, Object> studentProfile = new HashMap<String, Object>() {{
        put("grade", "");
        put("interests", new ArrayList<String>());
        put("enrolledCourses", new ArrayList<String>());
        put("skills", new ArrayList<String>());
        put("educationLevel", "");
        put("goals", new ArrayList<String>());
    }};

    // Teacher profile
    @Builder.Default
    private Map<String, Object> teacherProfile = new HashMap<String, Object>() {{
        put("qualifications", new ArrayList<String>());
        put("expertise", new ArrayList<String>());
        put("yearsOfExperience", 0);
        put("teachingCourses", new ArrayList<Map<String, Object>>());
        put("certifications", new ArrayList<String>());
        put("availability", "");
    }};

    private Date createdAt;
    private Date updatedAt;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
} 