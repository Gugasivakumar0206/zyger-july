package com.zyger.erp.controller;

import com.zyger.erp.support.ApiResponse;
import com.zyger.erp.support.Rows;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/process")
public class ProcessController {
    private final JdbcTemplate jdbc;

    public ProcessController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/{type}")
    public List<Map<String, Object>> list(@PathVariable String type) {
        return Rows.list(jdbc, "select * from erp_process_documents where process_type=? order by id desc", type);
    }

    @GetMapping("/{type}/{id}")
    public Map<String, Object> detail(@PathVariable String type, @PathVariable long id) {
        return Rows.one(jdbc, "select * from erp_process_documents where process_type=? and id=?", type, id);
    }

    @PostMapping("/{type}")
    public Map<String, Object> create(@PathVariable String type, @RequestBody Map<String, Object> payload) {
        String documentNo = String.valueOf(payload.getOrDefault("documentNo", type.toUpperCase() + "-JAVA-DEMO"));
        jdbc.update("""
            insert into erp_process_documents(process_type, document_no, reference_no, order_number, department, status, approval_status, remarks, extra_data, items)
            values(?,?,?,?,?,?,?,?,?,?)
            """,
            type, documentNo, payload.get("referenceNo"), payload.get("orderNumber"), payload.get("department"),
            payload.getOrDefault("status", "Open"), payload.getOrDefault("approvalStatus", "Pending"),
            payload.get("remarks"), "{}", "[]"
        );
        return ApiResponse.ok(type + " created successfully");
    }
}
