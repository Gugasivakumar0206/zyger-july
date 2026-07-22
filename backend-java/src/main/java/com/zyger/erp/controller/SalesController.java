package com.zyger.erp.controller;

import com.zyger.erp.support.Rows;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class SalesController {
    private final JdbcTemplate jdbc;

    public SalesController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/sales-dc/")
    public List<Map<String, Object>> salesDc() {
        return Rows.list(jdbc, """
            select sd.*, c.customer_name,
                   coalesce(sum(sdi.qty),0) as total_qty
            from sales_dc sd
            join customers c on c.id = sd.customer_id
            left join sales_dc_items sdi on sdi.sales_dc_id = sd.id
            group by sd.id, c.customer_name
            order by sd.id desc
            """);
    }

    @GetMapping("/sales-dc/{id}")
    public Map<String, Object> salesDcDetail(@PathVariable long id) {
        Map<String, Object> header = Rows.one(jdbc, """
            select sd.*, c.customer_code, c.customer_name, c.gstin, c.address, c.city, c.state, c.pincode, c.mobile, c.email
            from sales_dc sd join customers c on c.id=sd.customer_id where sd.id=?
            """, id);
        List<Map<String, Object>> items = Rows.list(jdbc, """
            select sdi.*, i.item_code, i.item_name, i.uom, i.hsn_code, i.sales_rate, sdi.qty * coalesce(i.sales_rate,0) as amount
            from sales_dc_items sdi join items i on i.id=sdi.item_id where sdi.sales_dc_id=?
            """, id);
        header.put("items", items);
        return header;
    }

    @GetMapping("/sale-invoice/")
    public List<Map<String, Object>> saleInvoices() {
        return Rows.list(jdbc, "select si.*, c.customer_name from sale_invoices si join customers c on c.id=si.customer_id order by si.id desc");
    }

    @GetMapping("/tax-invoice/")
    public List<Map<String, Object>> taxInvoices() {
        return Rows.list(jdbc, "select ti.*, c.customer_name from tax_invoices ti join customers c on c.id=ti.customer_id order by ti.id desc");
    }

    @GetMapping("/stock/")
    public List<Map<String, Object>> stock() {
        return Rows.list(jdbc, """
            select i.item_code, i.item_name, i.uom,
                   sum(sl.inward_qty) as inward_qty,
                   sum(sl.outward_qty) as outward_qty,
                   max(sl.balance_qty) as balance_qty
            from stock_ledger sl
            join items i on i.id=sl.item_id
            group by i.item_code, i.item_name, i.uom
            order by i.item_code
            """);
    }
}
