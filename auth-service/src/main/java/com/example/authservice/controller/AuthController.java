package com.example.authservice.controller;

import com.example.authservice.dto.AuthResponse;
import com.example.authservice.dto.GoogleUserInfo;
import com.example.authservice.dto.LoginRequest;
import com.example.authservice.dto.RegisterRequest;
import com.example.authservice.dto.SocialLoginRequest;
import com.example.authservice.model.User;
import com.example.authservice.service.AuthService;
import com.example.authservice.service.OAuthService;
import com.example.authservice.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication management APIs")
public class AuthController {

    private final AuthService authService;
    private final OAuthService oAuthService;
    private final JwtService jwtService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(createAuthResponse(response));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(createAuthResponse(response));
    }

    @PostMapping("/social-login")
    @Operation(summary = "Login with Google OAuth")
    public ResponseEntity<Map<String, Object>> socialLogin(@Valid @RequestBody SocialLoginRequest request) {
        try {
            if (request.getCredential() == null || request.getCredential().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("message", "Google credential is required");
                return ResponseEntity.badRequest().body(error);
            }

            GoogleUserInfo googleUser = oAuthService.verifyGoogleToken(request.getCredential());
            
            // Set user role from request or default to USER
            String role = request.getRole();
            if (role == null || role.isEmpty()) {
                role = "student";
            }

            // Create or update user and generate tokens
            User user = authService.findOrCreateSocialUser(
                googleUser.getSocialId(),
                googleUser.getEmail(),
                googleUser.getName(),
                googleUser.getPicture(),
                role
            );

            // Update location if provided
            if (request.getLocation() != null) {
                user.setCoordinates(request.getLocation().getCoordinates());
                user.setLocationSharing(request.getLocation().isLocationSharing());
                // Save updated user
                authService.updateUser(user);
            }

            // Generate tokens
            String accessToken = jwtService.generateToken(user);
            String refreshToken = jwtService.generateRefreshToken(user);
            user.setRefreshToken(refreshToken);

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            response.put("token", accessToken);
            response.put("refreshToken", refreshToken);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", "Invalid Google token: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", "Social login failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@RequestHeader("Authorization") String token) {
        try {
            if (token == null || !token.startsWith("Bearer ")) {
                return ResponseEntity.status(401).build();
            }
            
            String jwt = token.substring(7);
            String email = jwtService.extractEmail(jwt);
            
            if (email == null || !jwtService.isTokenValid(jwt)) {
                return ResponseEntity.status(401).build();
            }

            User user = authService.findByEmail(email);
            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh access token")
    public ResponseEntity<Map<String, Object>> refreshToken(@RequestBody Map<String, String> request) {
        try {
            String refreshToken = request.get("refreshToken");
            if (!jwtService.isRefreshTokenValid(refreshToken)) {
                return ResponseEntity.status(401).build();
            }

            String email = jwtService.extractEmail(refreshToken);
            User user = authService.findByEmail(email);
            
            if (!refreshToken.equals(user.getRefreshToken())) {
                return ResponseEntity.status(401).build();
            }

            String newToken = jwtService.generateToken(user);
            String newRefreshToken = jwtService.generateRefreshToken(user);
            user.setRefreshToken(newRefreshToken);
            authService.updateUser(user);

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            response.put("token", newToken);
            response.put("refreshToken", newRefreshToken);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String token) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                String jwt = token.substring(7);
                String email = jwtService.extractEmail(jwt);
                User user = authService.findByEmail(email);
                if (user != null) {
                    user.setRefreshToken(null);
                    authService.updateUser(user);
                }
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.ok().build(); // Always return OK for logout
        }
    }

    private Map<String, Object> createAuthResponse(AuthResponse authResponse) {
        Map<String, Object> response = new HashMap<>();
        response.put("user", authResponse.getUser());
        response.put("token", authResponse.getAccessToken());
        response.put("refreshToken", authResponse.getRefreshToken());
        return response;
    }
} 