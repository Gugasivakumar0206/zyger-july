package com.zyger.erp.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Rows {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Rows() {
    }

    public static List<Map<String, Object>> list(JdbcTemplate jdbc, String sql, Object... args) {
        return jdbc.queryForList(sql, args).stream().map(Rows::normalize).toList();
    }

    public static Map<String, Object> one(JdbcTemplate jdbc, String sql, Object... args) {
        List<Map<String, Object>> rows = list(jdbc, sql, args);
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Record not found");
        }
        return rows.get(0);
    }

    private static Map<String, Object> normalize(Map<String, Object> row) {
        Map<String, Object> copy = new LinkedHashMap<>(row);
        if (copy.containsKey("extra_data")) copy.put("extra_data", parseObject(copy.get("extra_data")));
        if (copy.containsKey("items")) copy.put("items", parseList(copy.get("items")));
        return copy;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> parseObject(Object value) {
        if (value instanceof Map<?, ?> map) return new LinkedHashMap<>((Map<String, Object>) map);
        if (value == null || String.valueOf(value).isBlank()) return new LinkedHashMap<>();
        try { return MAPPER.readValue(String.valueOf(value), new TypeReference<LinkedHashMap<String, Object>>() {}); }
        catch (Exception ignored) { return new LinkedHashMap<>(); }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> parseList(Object value) {
        if (value instanceof List<?> list) return (List<Map<String, Object>>) list;
        if (value == null || String.valueOf(value).isBlank()) return new ArrayList<>();
        try { return MAPPER.readValue(String.valueOf(value), new TypeReference<List<Map<String, Object>>>() {}); }
        catch (Exception ignored) { return new ArrayList<>(); }
    }
}