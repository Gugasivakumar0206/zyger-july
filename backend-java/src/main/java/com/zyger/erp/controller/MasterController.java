package com.zyger.erp.controller;

import com.zyger.erp.support.ApiResponse;
import com.zyger.erp.support.Rows;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class MasterController {
    private final JdbcTemplate jdbc;

    public MasterController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/customer/")
    public List<Map<String, Object>> customers(@RequestParam(defaultValue = "") String q) {
        String query = "%" + q.toLowerCase() + "%";
        return Rows.list(jdbc, """
            select * from customers
            where lower(customer_name) like ? or lower(customer_code) like ? or lower(coalesce(gstin,'')) like ?
            order by id desc
            """, query, query, query);
    }

    @GetMapping("/customer/{id}")
    public Map<String, Object> customer(@PathVariable long id) {
        return Rows.one(jdbc, "select * from customers where id=?", id);
    }

    @GetMapping("/customer/next-number")
    public Map<String, String> nextCustomerNumber() {
        Integer count = jdbc.queryForObject("select count(*) from customers", Integer.class);
        return Map.of("customerCode", "CUS-" + String.format("%04d", (count == null ? 0 : count) + 1));
    }

    @PostMapping("/customer/")
    public Map<String, Object> createCustomer(@RequestBody Map<String, Object> payload) {
        jdbc.update("""
            insert into customers(customer_code, customer_name, print_name, customer_group, customer_type, address, city, state, pincode, mobile, email, gstin, pan_no, status)
            values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            payload.get("customerCode"), payload.get("customerName"), payload.get("printName"), payload.get("customerGroup"),
            payload.get("customerType"), payload.get("address"), payload.get("city"), payload.get("state"), payload.get("pincode"),
            payload.get("mobile"), payload.get("email"), payload.get("gstin"), payload.get("panNo"), payload.getOrDefault("status", "Active")
        );
        return ApiResponse.ok("Customer created successfully");
    }

    @GetMapping("/supplier/")
    public List<Map<String, Object>> suppliers() {
        return Rows.list(jdbc, "select * from suppliers order by id desc");
    }

    @GetMapping("/supplier/{id}")
    public Map<String, Object> supplier(@PathVariable long id) {
        return Rows.one(jdbc, "select * from suppliers where id=?", id);
    }

    @GetMapping("/supplier/next-number")
    public Map<String, String> nextSupplierNumber() {
        Integer count = jdbc.queryForObject("select count(*) from suppliers", Integer.class);
        return Map.of("supplierCode", "SUP-" + String.format("%04d", (count == null ? 0 : count) + 1));
    }

    @PostMapping("/supplier/")
    public Map<String, Object> createSupplier(@RequestBody Map<String, Object> payload) {
        jdbc.update("""
            insert into suppliers(supplier_code, supplier_name, print_name, supplier_group, supplier_type, address, city, state, pincode, mobile, email, gstin, pan_no, status)
            values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            payload.get("supplierCode"), payload.get("supplierName"), payload.get("printName"), payload.get("supplierGroup"),
            payload.get("supplierType"), payload.get("address"), payload.get("city"), payload.get("state"), payload.get("pincode"),
            payload.get("mobile"), payload.get("email"), payload.get("gstin"), payload.get("panNo"), payload.getOrDefault("status", "Active")
        );
        return ApiResponse.ok("Supplier created successfully");
    }

    @GetMapping("/inventory/")
    public List<Map<String, Object>> items(@RequestParam(name = "item_type", defaultValue = "") String itemType) {
        if (itemType.isBlank()) {
            return Rows.list(jdbc, "select * from items order by id desc");
        }
        return Rows.list(jdbc, "select * from items where item_type=? order by id desc", itemType);
    }

    @GetMapping("/inventory/{id}")
    public Map<String, Object> item(@PathVariable long id) {
        return Rows.one(jdbc, "select * from items where id=?", id);
    }

    @GetMapping("/inventory/next-number")
    public Map<String, String> nextItemNumber(@RequestParam(name = "item_type", defaultValue = "") String itemType) {
        String prefix = itemType.toLowerCase().contains("manufacturing") ? "FG" : "RM";
        Integer count = jdbc.queryForObject("select count(*) from items where item_type=?", Integer.class, itemType);
        return Map.of("itemCode", prefix + "-" + String.format("%04d", (count == null ? 0 : count) + 1));
    }

    @PostMapping("/inventory/")
    public Map<String, Object> createItem(@RequestBody Map<String, Object> payload) {
        jdbc.update("""
            insert into items(item_type, item_code, item_name, print_name, item_group, uom, hsn_code, rack, bin, purchase_rate, sales_rate, gst_percent, status)
            values(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            payload.getOrDefault("itemType", "Purchasable Item"), payload.get("itemCode"), payload.get("itemName"),
            payload.get("printName"), payload.get("itemGroup"), payload.get("uom"), payload.get("hsnCode"),
            payload.get("rack"), payload.get("bin"), payload.get("purchaseRate"), payload.get("salesRate"),
            payload.getOrDefault("gstPercent", 18), payload.getOrDefault("status", "Active")
        );
        return ApiResponse.ok("Item created successfully");
    }

    @GetMapping("/company/")
    public Map<String, Object> company() {
        return Map.of("company", Rows.one(jdbc, "select * from company_info order by id asc limit 1"));
    }
}
