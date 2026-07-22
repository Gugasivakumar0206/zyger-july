package com.zyger.erp.controller;

import com.zyger.erp.support.ApiResponse;
import com.zyger.erp.support.Rows;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class LegacyCompatController {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();

    public LegacyCompatController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/dashboard/summary")
    public Map<String, Object> dashboardSummary() {
        return Map.of(
            "customers", count("customers"),
            "suppliers", count("suppliers"),
            "items", count("items"),
            "salesOrders", countProcess("so"),
            "purchaseRequests", countProcess("pr"),
            "purchaseOrders", countProcess("po"),
            "inwardInspections", count("inward_inspections"),
            "stockLines", count("stock_ledger")
        );
    }

    @GetMapping("/planning/process/{type}")
    public List<Map<String, Object>> processList(@PathVariable String type, @RequestParam(defaultValue = "") String q) {
        String like = "%" + q.toLowerCase() + "%";
        return Rows.list(jdbc, """
            select *, document_no as code, document_no as doc_no, document_no as number
            from erp_process_documents
            where process_type=? and (lower(document_no) like ? or lower(coalesce(reference_no,'')) like ? or lower(coalesce(remarks,'')) like ?)
            order by id desc
            """, type, like, like, like);
    }

    @GetMapping("/planning/process/{type}/{id}")
    public Map<String, Object> processDetail(@PathVariable String type, @PathVariable long id) {
        return Rows.one(jdbc, "select * from erp_process_documents where process_type=? and id=?", type, id);
    }

    @GetMapping("/planning/process/{type}/next-number")
    public Map<String, String> nextProcessNumber(@PathVariable String type) {
        String next = type.toUpperCase() + "-JAVA-" + String.format("%04d", countProcess(type) + 1);
        return Map.of("number", next, "nextNumber", next);
    }

    @GetMapping("/planning/process/{type}/source-options")
    public List<Map<String, Object>> sourceOptions(@PathVariable String type) {
        return switch (type) {
            case "bom", "mrp", "wo" -> Rows.list(jdbc, """
                select id, document_no, reference_no, order_number, status
                from erp_process_documents
                where process_type='so'
                order by id desc
                """);
            case "routesheet" -> Rows.list(jdbc, """
                select id, document_no, reference_no, order_number, status
                from erp_process_documents
                where process_type='bom'
                order by id desc
                """);
            case "po" -> Rows.list(jdbc, """
                select id, document_no, reference_no, order_number, status
                from erp_process_documents
                where process_type='pr' and coalesce(status,'Open') <> 'Closed'
                order by id desc
                """);
            default -> Rows.list(jdbc, """
                select id, document_no, reference_no, order_number, status
                from erp_process_documents
                where process_type=?
                order by id desc
                """, type);
        };
    }

    @PostMapping("/planning/process/{type}")
    public Map<String, Object> createProcess(@PathVariable String type, @RequestBody Map<String, Object> payload) {
        String no = str(payload, "documentNo", str(payload, "document_no", type.toUpperCase() + "-JAVA-" + System.currentTimeMillis() % 10000));
        jdbc.update("""
            insert into erp_process_documents(process_type, document_no, reference_no, order_number, order_type, department, status, approval_status, remarks, extra_data, items)
            values(?,?,?,?,?,?,?,?,?,?::jsonb,?::jsonb)
            """, type, no, payload.get("referenceNo"), payload.get("orderNumber"), payload.get("orderType"),
            payload.getOrDefault("department", "General"), payload.getOrDefault("status", "Open"), payload.getOrDefault("approvalStatus", "Pending"),
            payload.get("remarks"), json(payload.getOrDefault("extraData", java.util.Map.of())), json(payload.getOrDefault("items", java.util.List.of())));
        Long id = jdbc.queryForObject("select max(id) from erp_process_documents where process_type=? and document_no=?", Long.class, type, no);
        if ("po".equals(type)) closeSelectedPurchaseRequests(payload);
        return java.util.Map.of("success", true, "message", type + " created successfully", "document", processDetail(type, id));
    }

    @PutMapping("/planning/process/{type}/{id}")
    public Map<String, Object> updateProcess(@PathVariable String type, @PathVariable long id, @RequestBody Map<String, Object> payload) {
        jdbc.update("update erp_process_documents set reference_no=?, order_number=?, department=?, status=?, remarks=?, extra_data=?::jsonb, items=?::jsonb where process_type=? and id=?",
            payload.get("referenceNo"), payload.get("orderNumber"), payload.get("department"), payload.getOrDefault("status", "Open"), payload.get("remarks"), json(payload.getOrDefault("extraData", java.util.Map.of())), json(payload.getOrDefault("items", java.util.List.of())), type, id);
        if ("po".equals(type)) closeSelectedPurchaseRequests(payload);
        return java.util.Map.of("success", true, "message", type + " updated successfully", "document", processDetail(type, id));
    }


    @PostMapping("/planning/process/{type}/{id}/run-mrp")
    public Map<String, Object> runMrp(@PathVariable String type, @PathVariable long id) {
        if (!"so".equals(type)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "MRP can be generated from Sales Order only");
        Map<String, Object> so = processDetail("so", id);
        java.util.List<Map<String, Object>> soItems = asList(so.getOrDefault("items", java.util.List.of()));
        if (soItems.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sales Order has no manufacturing item lines");

        String mrpNo = nextProcessNumber("mrp").get("nextNumber");
        java.util.List<Map<String, Object>> materialLines = new java.util.ArrayList<>();
        java.util.List<Map<String, Object>> shortageLines = new java.util.ArrayList<>();
        java.util.List<String> usedBoms = new java.util.ArrayList<>();

        for (Map<String, Object> soLine : soItems) {
            String fgCode = lineValue(soLine, "itemCode", "item_code", "");
            if (fgCode.isBlank()) fgCode = String.valueOf(so.getOrDefault("reference_no", ""));
            double salesQty = decimal(soLine.getOrDefault("quantity", soLine.getOrDefault("qty", 1)));
            if (salesQty <= 0) salesQty = 1;

            Map<String, Object> bom = activeBomForFg(fgCode);
            if (bom.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Active Master BOM not found for FG item " + fgCode);
            usedBoms.add(String.valueOf(bom.getOrDefault("document_no", "")));

            for (Map<String, Object> component : asList(bom.getOrDefault("items", java.util.List.of()))) {
                String itemCode = lineValue(component, "itemCode", "item_code", "");
                String itemName = lineValue(component, "itemName", "item_name", itemCode);
                double bomQty = decimal(component.getOrDefault("quantity", component.getOrDefault("qty", 0)));
                double requiredQty = bomQty * salesQty;
                double availableQty = latestStockForCode(itemCode);
                double shortageQty = Math.max(0, requiredQty - availableQty);
                java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
                row.put("fgItemCode", fgCode);
                row.put("bomNo", bom.getOrDefault("document_no", ""));
                row.put("itemCode", itemCode);
                row.put("itemName", itemName);
                row.put("requiredQty", requiredQty);
                row.put("availableQty", availableQty);
                row.put("shortageQty", shortageQty);
                row.put("uom", component.getOrDefault("uom", ""));
                row.put("status", shortageQty > 0 ? "Shortage" : "Available");
                materialLines.add(row);
                if (shortageQty > 0) shortageLines.add(row);
            }
        }

        jdbc.update("""
            insert into erp_process_documents(process_type, document_no, reference_no, order_number, order_type, department, status, approval_status, remarks, extra_data, items)
            values('mrp', ?, ?, ?, 'Sales Order', 'Planning', ?, 'Approved', 'MRP exploded from active Master BOM and checked against stock', ?::jsonb, ?::jsonb)
            """, mrpNo, so.get("document_no"), so.get("document_no"), shortageLines.isEmpty() ? "Completed - No Shortage" : "Shortage Found",
            json(java.util.Map.of("sourceSoId", id, "usedBoms", usedBoms)), json(materialLines));
        Long mrpId = jdbc.queryForObject("select max(id) from erp_process_documents where process_type='mrp' and document_no=?", Long.class, mrpNo);

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("success", true);
        result.put("message", shortageLines.isEmpty() ? "MRP completed. No PR required." : "MRP completed. PR generated for shortages.");
        result.put("mrp", processDetail("mrp", mrpId));
        result.put("analysis", materialLines);

        if (!shortageLines.isEmpty()) {
            String prNo = nextProcessNumber("pr").get("nextNumber");
            jdbc.update("""
                insert into erp_process_documents(process_type, document_no, reference_no, order_number, order_type, department, status, approval_status, remarks, extra_data, items)
                values('pr', ?, ?, ?, 'Purchase Request', 'Purchase', 'Open', '', 'Auto PR generated from MRP shortage', ?::jsonb, ?::jsonb)
                """, prNo, mrpNo, so.get("document_no"), json(java.util.Map.of("sourceMrpId", mrpId)), json(shortageLines));
            Long prId = jdbc.queryForObject("select max(id) from erp_process_documents where process_type='pr' and document_no=?", Long.class, prNo);
            result.put("purchaseRequest", processDetail("pr", prId));
        }
        return result;
    }

    @PostMapping("/planning/process/{type}/{id}/generate-work-order")
    public Map<String, Object> generateWorkOrder(@PathVariable String type, @PathVariable long id) {
        Map<String, Object> source = processDetail(type, id);
        String woNo = nextProcessNumber("wo").get("nextNumber");
        String sourceNo = String.valueOf(source.getOrDefault("document_no", ""));
        java.util.List<Map<String, Object>> sourceLines = asList(source.getOrDefault("items", java.util.List.of()));
        String fgCode = String.valueOf(source.getOrDefault("reference_no", ""));
        if (!sourceLines.isEmpty()) {
            String itemCode = lineValue(sourceLines.get(0), "itemCode", "item_code", "");
            if (!itemCode.isBlank()) fgCode = itemCode;
        }

        java.util.Map<String, Object> bom = activeBomForFg(fgCode);
        if (bom.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Work Order cannot be generated. Active Master BOM missing for " + fgCode);
        java.util.Map<String, Object> routeSheet = activeRouteForFg(fgCode);
        if (routeSheet.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Work Order cannot be generated. Active Route Sheet missing for " + fgCode);

        java.util.Map<String, Object> extra = new java.util.LinkedHashMap<>();
        extra.put("sourceType", type);
        extra.put("sourceId", id);
        extra.put("finishedGoodCode", fgCode);
        extra.put("bomNo", bom.getOrDefault("document_no", ""));
        extra.put("routeSheetNo", routeSheet.getOrDefault("document_no", ""));
        extra.put("materialLines", bom.getOrDefault("items", java.util.List.of()));
        extra.put("processLines", routeSheet.getOrDefault("items", java.util.List.of()));
        extra.put("materialStatus", "Release after MRP and accepted stock availability check");

        jdbc.update("""
            insert into erp_process_documents(process_type, document_no, reference_no, order_number, order_type, department, status, approval_status, remarks, extra_data, items)
            values('wo', ?, ?, ?, 'Work Order', 'Production', 'Draft', 'Pending', 'WO generated with active Master BOM and Route Sheet', ?::jsonb, ?::jsonb)
            """, woNo, sourceNo, sourceNo, json(extra), json(sourceLines));
        Long woId = jdbc.queryForObject("select max(id) from erp_process_documents where process_type='wo' and document_no=?", Long.class, woNo);
        return java.util.Map.of("success", true, "message", "Work Order generated successfully", "workOrder", processDetail("wo", woId));
    }

    @GetMapping("/planning/notifications/purchase")
    public List<Map<String, Object>> purchaseNotifications() {
        return Rows.list(jdbc, "select id, document_no, status, remarks from erp_process_documents where process_type in ('mrp','pr') order by id desc");
    }

    @GetMapping("/planning/master/{masterType}")
    public List<Map<String, Object>> processMasterList(@PathVariable String masterType) {
        return List.of(Map.of("id", 1, "code", masterType.toUpperCase() + "-001", "name", masterType + " Demo", "status", "Active", "remarks", "Java demo master"));
    }

    @GetMapping("/planning/master/{masterType}/{id}")
    public Map<String, Object> processMasterDetail(@PathVariable String masterType, @PathVariable long id) {
        return Map.of("id", id, "code", masterType.toUpperCase() + "-001", "name", masterType + " Demo", "status", "Active");
    }

    @GetMapping("/planning/master/{masterType}/next-number")
    public Map<String, String> nextProcessMaster(@PathVariable String masterType) {
        return Map.of("number", masterType.toUpperCase() + "-001");
    }

    @PostMapping("/planning/master/{masterType}")
    public Map<String, Object> createProcessMaster(@PathVariable String masterType, @RequestBody Map<String, Object> payload) {
        return ApiResponse.ok(masterType + " saved successfully");
    }

    @PutMapping("/planning/master/{masterType}/{id}")
    public Map<String, Object> updateProcessMaster(@PathVariable String masterType, @PathVariable long id, @RequestBody Map<String, Object> payload) {
        return ApiResponse.ok(masterType + " updated successfully");
    }

    @GetMapping("/reports/inventory")
    public List<Map<String, Object>> inventoryReport() {
        return Rows.list(jdbc, """
            select i.item_code, i.item_name, i.uom,
                   sum(sl.inward_qty) as inward_qty,
                   sum(sl.outward_qty) as outward_qty,
                   max(sl.balance_qty) as balance_qty,
                   'Accepted' as stock_status,
                   '' as location
            from stock_ledger sl join items i on i.id=sl.item_id
            group by i.item_code, i.item_name, i.uom
            order by i.item_code
            """);
    }

    @GetMapping("/reports/{reportKey}")
    public List<Map<String, Object>> businessReport(@PathVariable String reportKey) {
        if (reportKey.contains("sales")) return Rows.list(jdbc, "select invoice_no, invoice_date, total_amount, status from sale_invoices order by id desc");
        if (reportKey.contains("purchase")) return Rows.list(jdbc, "select document_no, reference_no, status, remarks from erp_process_documents where process_type in ('pr','po') order by id desc");
        return Rows.list(jdbc, "select document_no, process_type, status, remarks from erp_process_documents order by id desc");
    }

    @GetMapping("/maintenance/racks")
    public List<Map<String, Object>> racks() {
        return List.of(Map.of("id", 1, "rack_code", "RM-RACK-01", "rack_name", "Raw Material Rack", "status", "Active"));
    }

    @GetMapping("/maintenance/bins")
    public List<Map<String, Object>> bins() {
        return List.of(Map.of("id", 1, "bin_code", "RM-BIN-01", "bin_name", "Raw Material Bin", "status", "Active"));
    }

    @GetMapping("/maintenance/stores")
    public List<Map<String, Object>> stores() {
        return List.of(Map.of("id", 1, "store_code", "MAIN-STORE", "store_name", "Main Raw Material Store", "status", "Active"));
    }

    @PostMapping({"/maintenance/racks", "/maintenance/bins", "/maintenance/stores"})
    public Map<String, Object> saveMaintenance(@RequestBody Map<String, Object> payload) {
        return ApiResponse.ok("Maintenance master saved successfully");
    }

    @GetMapping("/quality/inward-inspection")
    public List<Map<String, Object>> inspections() {
        return Rows.list(jdbc, "select * from inward_inspections order by id desc");
    }

    @GetMapping("/quality/inward-inspection/{id}")
    public Map<String, Object> inspectionDetail(@PathVariable long id) {
        Map<String, Object> header = Rows.one(jdbc, "select * from inward_inspections where id=?", id);
        header.put("items", Rows.list(jdbc, "select iii.*, i.item_code, i.item_name, i.uom from inward_inspection_items iii join items i on i.id=iii.item_id where iii.inspection_id=?", id));
        return header;
    }

    @GetMapping("/quality/inward-inspection/next-number")
    public Map<String, String> nextInspection() {
        return Map.of("inspectionNo", "INI-JAVA-" + String.format("%04d", count("inward_inspections") + 1));
    }

    @GetMapping("/quality/inward-inspection/source")
    public List<Map<String, Object>> inspectionSources(@RequestParam(name = "inward_type", defaultValue = "") String inwardType) {
        return Rows.list(jdbc, "select pi.*, s.supplier_name from purchase_inward pi left join suppliers s on s.id=pi.supplier_id order by pi.id desc");
    }

    @GetMapping("/quality/inward-inspection/source/{id}")
    public Map<String, Object> inspectionSourceDetail(@PathVariable long id) {
        Map<String, Object> header = Rows.one(jdbc, "select pi.*, s.supplier_name from purchase_inward pi left join suppliers s on s.id=pi.supplier_id where pi.id=?", id);
        header.put("items", Rows.list(jdbc, "select pii.*, i.item_code, i.item_name, i.uom from purchase_inward_items pii join items i on i.id=pii.item_id where pii.inward_id=?", id));
        return header;
    }

    @PostMapping("/quality/inward-inspection")
    public Map<String, Object> createInspection(@RequestBody Map<String, Object> payload) {
        String inspectionNo = str(payload, "inspectionNo", "INI-JAVA-" + String.format("%04d", count("inward_inspections") + 1));
        long inwardId = number(payload.get("inwardId"), 1L);
        long supplierId = number(payload.get("supplierId"), 1L);
        String inwardNo = str(payload, "inwardNo", str(payload, "sourceNumber", "INW-DEMO-001"));
        String inwardType = str(payload, "inwardType", "PO Inward");
        String companyName = str(payload, "companyName", str(payload, "supplierName", "Prime Metals and Components"));
        String remarks = str(payload, "remarks", "Inspection completed from Java demo");

        jdbc.update("""
            insert into inward_inspections(inspection_no, inspection_date, inward_type, inward_id, inward_no, supplier_id, company_name, status, remarks)
            values(?, current_date, ?, ?, ?, ?, ?, 'Completed', ?)
            """, inspectionNo, inwardType, inwardId, inwardNo, supplierId, companyName, remarks);

        Long inspectionId = jdbc.queryForObject("select max(id) from inward_inspections where inspection_no=?", Long.class, inspectionNo);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lines = payload.get("items") instanceof List<?> ? (List<Map<String, Object>>) payload.get("items") : List.of();
        if (lines.isEmpty()) {
            lines = Rows.list(jdbc, "select item_id, qty as received_qty, accepted_qty, rejected_qty from purchase_inward_items where inward_id=?", inwardId);
        }

        for (Map<String, Object> line : lines) {
            long itemId = number(line.get("itemId"), number(line.get("item_id"), 1L));
            double receivedQty = decimal(line.getOrDefault("receivedQty", line.getOrDefault("received_qty", 0)));
            double acceptedQty = decimal(line.getOrDefault("acceptedQty", line.getOrDefault("accepted_qty", receivedQty)));
            double rejectedQty = decimal(line.getOrDefault("rejectedQty", line.getOrDefault("rejected_qty", 0)));
            double holdQty = decimal(line.getOrDefault("holdQty", line.getOrDefault("hold_qty", 0)));
            double idleQty = decimal(line.getOrDefault("idleStockQty", line.getOrDefault("idle_stock_qty", 0)));
            String reason = str(line, "rejectionReason", str(line, "rejection_reason", ""));
            String location = str(line, "location", "Main Store");

            jdbc.update("""
                insert into inward_inspection_items(inspection_id, item_id, received_qty, accepted_qty, rejected_qty, hold_qty, idle_stock_qty, rejection_reason, location)
                values(?,?,?,?,?,?,?,?,?)
                """, inspectionId, itemId, receivedQty, acceptedQty, rejectedQty, holdQty, idleQty, reason, location);

            if (acceptedQty > 0) addStock(itemId, "QUALITY_ACCEPTED", inspectionId, acceptedQty, 0, "Accepted", location, inspectionNo);
            if (rejectedQty > 0) addStock(itemId, "QUALITY_REJECTED", inspectionId, 0, rejectedQty, "Rejected", "Rejected Store", reason);
            if (holdQty > 0 || idleQty > 0) addStock(itemId, "QUALITY_HOLD", inspectionId, holdQty + idleQty, 0, "Idle", "Idle Stock", inspectionNo);
        }

        jdbc.update("update purchase_inward set status='Inspection Completed' where id=?", inwardId);
        return Map.of("message", "Inward inspection saved successfully", "id", inspectionId, "inspectionNo", inspectionNo);
    }

    @GetMapping("/quality/item-group")
    public List<Map<String, Object>> itemGroups() {
        return List.of(
            Map.of("id", 1, "group_code", "IG-001", "group_name", "Raw Material", "item_type", "Purchasable Item", "status", "Active"),
            Map.of("id", 2, "group_code", "IG-002", "group_name", "Finished Goods", "item_type", "Manufacturing Item", "status", "Active")
        );
    }

    @GetMapping("/quality/item-group/next-number")
    public Map<String, String> nextItemGroup() { return Map.of("groupCode", "IG-003"); }

    @PostMapping("/quality/item-group")
    public Map<String, Object> createItemGroup(@RequestBody Map<String, Object> payload) { return ApiResponse.ok("Item group saved successfully"); }

    @DeleteMapping("/quality/item-group/{id}")
    public Map<String, Object> deleteItemGroup(@PathVariable long id) { return ApiResponse.ok("Item group deleted successfully"); }

    private int count(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }

    private int countProcess(String type) {
        return jdbc.queryForObject("select count(*) from erp_process_documents where process_type=?", Integer.class, type);
    }

    private String str(Map<String, Object> payload, String key, String fallback) {
        Object value = payload.get(key);
        return value == null || String.valueOf(value).isBlank() ? fallback : String.valueOf(value);
    }

    private long number(Object value, long fallback) {
        if (value == null || String.valueOf(value).isBlank()) return fallback;
        return Long.parseLong(String.valueOf(value));
    }

    private double decimal(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return 0;
        return Double.parseDouble(String.valueOf(value));
    }

    private void addStock(long itemId, String refType, Object refId, double inward, double outward, String status, String location, String remarks) {
        Double balance = jdbc.queryForObject("select coalesce(max(balance_qty),0) from stock_ledger where item_id=?", Double.class, itemId);
        double nextBalance = (balance == null ? 0 : balance) + inward - outward;
        jdbc.update("""
            insert into stock_ledger(item_id, ref_type, ref_id, inward_qty, outward_qty, balance_qty, stock_status, location, remarks)
            values(?,?,?,?,?,?,?,?,?)
            """, itemId, refType, refId, inward, outward, nextBalance, status, location, remarks);
    }


    @SuppressWarnings("unchecked")
    private java.util.List<Map<String, Object>> asList(Object value) {
        if (value instanceof java.util.List<?> list) return (java.util.List<Map<String, Object>>) value;
        return java.util.List.of();
    }

    private String lineValue(Map<String, Object> line, String primary, String secondary, String fallback) {
        Object value = line.get(primary);
        if (value == null || String.valueOf(value).isBlank()) value = line.get(secondary);
        return value == null || String.valueOf(value).isBlank() ? fallback : String.valueOf(value);
    }

    private java.util.Map<String, Object> activeBomForFg(String fgCode) {
        java.util.List<Map<String, Object>> rows = Rows.list(jdbc, """
            select * from erp_process_documents
            where process_type='bom' and reference_no=? and coalesce(status,'Active') in ('Active','Released')
            order by id desc limit 1
            """, fgCode);
        return rows.isEmpty() ? java.util.Map.of() : rows.get(0);
    }

    private java.util.Map<String, Object> activeRouteForFg(String fgCode) {
        java.util.List<Map<String, Object>> rows = Rows.list(jdbc, """
            select * from erp_process_documents
            where process_type='routesheet' and reference_no=? and coalesce(status,'Released') in ('Active','Released')
            order by id desc limit 1
            """, fgCode);
        return rows.isEmpty() ? java.util.Map.of() : rows.get(0);
    }

    private double latestStockForCode(String itemCode) {
        Double balance = jdbc.queryForObject("""
            select coalesce((
                select sl.balance_qty
                from stock_ledger sl
                join items i on i.id = sl.item_id
                where i.item_code = ? and coalesce(sl.stock_status,'Accepted') in ('Accepted','General','Store Stock')
                order by sl.id desc
                limit 1
            ), 0)
            """, Double.class, itemCode);
        return balance == null ? 0 : balance;
    }

    private String json(Object value) {
        try {
            return mapper.writeValueAsString(value == null ? java.util.Map.of() : value);
        } catch (Exception exc) {
            throw new IllegalArgumentException("Invalid JSON payload", exc);
        }
    }

    @SuppressWarnings("unchecked")
    private void closeSelectedPurchaseRequests(java.util.Map<String, Object> payload) {
        Object extra = payload.get("extraData");
        if (!(extra instanceof java.util.Map<?, ?> map)) return;
        Object ids = map.get("selectedPrIds");
        if (!(ids instanceof java.util.List<?> list)) return;
        for (Object id : list) {
            if (id != null && !String.valueOf(id).isBlank()) {
                jdbc.update("update erp_process_documents set status='Closed' where process_type='pr' and id=?", Long.parseLong(String.valueOf(id)));
            }
        }
    }
}
