package com.zyger.erp.support;

import java.util.Map;

public final class ApiResponse {
    private ApiResponse() {
    }

    public static Map<String, Object> ok(String message) {
        return Map.of("success", true, "message", message);
    }

    public static Map<String, Object> ok(String message, String key, Object value) {
        return Map.of("success", true, "message", message, key, value);
    }
}
