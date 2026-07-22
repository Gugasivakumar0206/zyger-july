package com.zyger.erp.controller;

import com.zyger.erp.support.ApiResponse;
import com.zyger.erp.support.Rows;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final JdbcTemplate jdbc;

    public AuthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, Object> payload) {
        String email = String.valueOf(payload.getOrDefault("email", "admin@zygerdemo.com"));
        List<Map<String, Object>> users = jdbc.queryForList(
            "select id, full_name, email, role from users where lower(email)=lower(?) and is_active=true",
            email
        );
        if (users.isEmpty()) {
            users = jdbc.queryForList("select id, full_name, email, role from users where is_active=true order by id limit 1");
        }
        return Map.of(
            "token", "java-demo-token",
            "access_token", "java-demo-token",
            "token_type", "bearer",
            "user", users.isEmpty() ? Map.of("id", 1, "full_name", "Admin", "email", email, "role", "admin") : users.get(0)
        );
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, Object> payload) {
        jdbc.update("insert into users(full_name,email,password_hash,role,is_active) values(?,?,?,?,true)",
            payload.getOrDefault("fullName", payload.getOrDefault("full_name", "Demo User")),
            payload.getOrDefault("email", "user" + System.currentTimeMillis() + "@demo.com"),
            payload.getOrDefault("password", "Demo@123"),
            payload.getOrDefault("role", "user")
        );
        return ApiResponse.ok("User created successfully");
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        return Rows.one(jdbc, "select id, full_name, email, role from users where is_active=true order by id limit 1");
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users() {
        return Rows.list(jdbc, "select id, full_name, email, role, is_active, created_at from users order by id desc");
    }

    @PostMapping("/users")
    public Map<String, Object> createUser(@RequestBody Map<String, Object> payload) {
        return register(payload);
    }
}