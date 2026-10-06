package com.lisone.dmassistant.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserResponse(Long id, String displayName, String email, String avatarUrl) {
        public static UserResponse from(AppUser user) {
            return new UserResponse(user.getId(), user.getDisplayName(), user.getEmail(), user.getAvatarUrl());
        }
    }

    /** Profile data the frontend copies from the Auth0 ID token after login. */
    public record ProfileUpdate(
            @Size(max = 120) String displayName,
            @Email @Size(max = 320) String email,
            @Size(max = 1024) String avatarUrl) {
    }
}
