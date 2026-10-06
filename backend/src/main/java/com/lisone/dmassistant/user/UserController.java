package com.lisone.dmassistant.user;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public UserDtos.UserResponse me(AppUser me) {
        return UserDtos.UserResponse.from(me);
    }

    @PutMapping
    public UserDtos.UserResponse updateProfile(AppUser me, @Valid @RequestBody UserDtos.ProfileUpdate update) {
        return UserDtos.UserResponse.from(userService.updateProfile(me, update));
    }
}
