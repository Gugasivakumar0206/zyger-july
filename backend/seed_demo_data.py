"""Load linked sample data for the complete Zyger ERP demo flow.

This script is idempotent: running it again updates/reuses the same demo codes.
"""

from datetime import date, timedelta
from decimal import Decimal

import bcrypt
from psycopg2.extras import Json, RealDictCursor

from database.db_connection import get_connection
from routers.crm_router import _ensure_crm_tables
from routers.master.planning_router import _ensure_process_tables
from routers.master.quality_router import _ensure_quality_tables
from routers.master.maintenance_router import _ensure_tables as _ensure_maintenance_tables
from routers.purchase.purchase_return_router import _ensure_purchase_return_tables
from routers.sales.sale_invoice_router import _ensure_sale_invoice_columns
from routers.sales.sales_dc_router import _ensure_sales_dc_columns
from routers.sales.tax_invoice_router import _ensure_tax_invoice_columns
from routers.subcontract.subcontract_dc_router import _ensure_schema as _ensure_subcontract_schema


TODAY = date.today()


def columns(cursor, table):
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table,),
    )
    return {row["column_name"] for row in cursor.fetchall()}


def upsert(cursor, table, values, conflict_columns, returning="id"):
    available = columns(cursor, table)
    data = {key: value for key, value in values.items() if key in available}
    conflicts = [key for key in conflict_columns if key in data]
    names = list(data)
    placeholders = ", ".join(["%s"] * len(names))
    updates = [name for name in names if name not in conflicts and name not in {"id", "created_at"}]
    if conflicts:
        where_sql = " AND ".join(f"{name} = %s" for name in conflicts)
        if updates:
            cursor.execute(
                f"""
                UPDATE {table}
                SET {", ".join(f"{name} = %s" for name in updates)}
                WHERE {where_sql}
                """,
                tuple(data[name] for name in updates) + tuple(data[name] for name in conflicts),
            )
        else:
            cursor.execute(
                f"SELECT 1 FROM {table} WHERE {where_sql} LIMIT 1",
                tuple(data[name] for name in conflicts),
            )
        if cursor.rowcount:
            if returning in available:
                cursor.execute(
                    f"SELECT {returning} FROM {table} WHERE {where_sql} LIMIT 1",
                    tuple(data[name] for name in conflicts),
                )
                row = cursor.fetchone()
                return row[returning] if row else None
            return None
    return_sql = f" RETURNING {returning}" if returning and returning in available else ""
    cursor.execute(
        f"""
        INSERT INTO {table} ({", ".join(names)})
        VALUES ({placeholders})
        {return_sql}
        """,
        tuple(data[name] for name in names),
    )
    row = cursor.fetchone() if return_sql else None
    if row:
        return row[returning]
    return None


def process_document(cursor, process_type, document_no, values, items):
    cursor.execute(
        """
        INSERT INTO erp_process_documents (
            process_type, document_no, document_date, reference_no, reference_date,
            customer_id, supplier_id, order_number, order_type, department,
            budget_head, material_planning, planning_quantity, initiated_by,
            target_date, visible_to, status, approval_status, remarks, extra_data, items
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (process_type, document_no) DO UPDATE SET
            reference_no = EXCLUDED.reference_no,
            customer_id = EXCLUDED.customer_id,
            supplier_id = EXCLUDED.supplier_id,
            order_number = EXCLUDED.order_number,
            status = EXCLUDED.status,
            remarks = EXCLUDED.remarks,
            extra_data = EXCLUDED.extra_data,
            items = EXCLUDED.items,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id
        """,
        (
            process_type,
            document_no,
            values.get("document_date", TODAY),
            values.get("reference_no"),
            values.get("reference_date", TODAY),
            values.get("customer_id"),
            values.get("supplier_id"),
            values.get("order_number"),
            values.get("order_type"),
            values.get("department"),
            values.get("budget_head"),
            values.get("material_planning"),
            values.get("planning_quantity", False),
            values.get("initiated_by", "Demo Admin"),
            values.get("target_date", TODAY + timedelta(days=14)),
            values.get("visible_to", "All Users"),
            values.get("status", "Open"),
            values.get("approval_status", "Pending"),
            values.get("remarks"),
            Json(values.get("extra_data", {})),
            Json(items),
        ),
    )
    return cursor.fetchone()["id"]


def item_line(item_id, code, name, quantity, uom, **extra):
    row = {
        "itemId": item_id,
        "itemCode": code,
        "itemName": name,
        "description": extra.pop("description", name),
        "quantity": str(quantity),
        "uom": uom,
        "weight": str(extra.pop("weight", 0)),
        "totalWeight": str(extra.pop("total_weight", 0)),
        "reservationQty": str(extra.pop("reservation_qty", 0)),
        "availableStockQty": str(extra.pop("available_stock_qty", 0)),
        "unitPrice": str(extra.pop("unit_price", 0)),
        "status": extra.pop("status", "Open"),
        "dueDate": str(extra.pop("due_date", TODAY + timedelta(days=10))),
        "remarks": extra.pop("remarks", "Demo flow item"),
    }
    row.update(extra)
    return row


def seed_invoice_items(cursor, table, parent_column, parent_id, items):
    for entry in items:
        upsert(
            cursor,
            table,
            {
                parent_column: parent_id,
                "item_id": entry["item_id"],
                "qty": entry["qty"],
                "rate": entry["rate"],
                "tax_percent": entry.get("tax_percent", Decimal("18")),
                "amount": entry["amount"],
            },
            [parent_column, "item_id"],
        )


def main():
    connection = get_connection()
    if connection is None:
        raise SystemExit("Database is not available. Start docker-compose.local.yml first.")
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SET statement_timeout = '15s'")
        print("1/8 Initializing schemas...", flush=True)
        init_sql = (open("sql/init_app.sql", encoding="utf-8").read())
        cursor.execute(init_sql)
        _ensure_crm_tables(cursor)
        _ensure_quality_tables(cursor)
        _ensure_process_tables(cursor)
        _ensure_maintenance_tables(cursor)
        _ensure_sales_dc_columns(cursor)
        _ensure_sale_invoice_columns(cursor)
        _ensure_tax_invoice_columns(cursor)
        _ensure_purchase_return_tables(cursor)
        _ensure_subcontract_schema(cursor)

        print("2/8 Seeding users and masters...", flush=True)
        password_hash = bcrypt.hashpw(b"Demo@123", bcrypt.gensalt()).decode()
        upsert(
            cursor,
            "users",
            {
                "full_name": "Demo Administrator",
                "email": "admin@zygerdemo.com",
                "password_hash": password_hash,
                "role": "admin",
                "is_active": True,
            },
            ["email"],
        )

        upsert(
            cursor,
            "company_info",
            {
                "company_name": "Zyger Precision Industries LLP",
                "print_name": "Zyger Precision Industries LLP",
                "address": "52, Peelamedu Industrial Estate",
                "delivery_address": "52, Peelamedu Industrial Estate, Coimbatore",
                "city": "Coimbatore",
                "state": "Tamil Nadu",
                "pincode": "641004",
                "mobile_no": "+91 98765 43210",
                "email": "accounts@zygerprecision.in",
                "website": "https://zygertechnology.in",
                "contact_person": "Demo Admin",
                "pan_it_no": "ABCDE1234F",
                "gstin": "33ABCDE1234F1Z5",
                "gst_state": "Tamil Nadu",
                "company_display_type": "Logo With Name",
            },
            ["company_name"],
        )

        customer_id = upsert(
            cursor,
            "customers",
            {
                "customer_code": "CUS-DEMO-001",
                "customer_name": "Apex Engineering Private Limited",
                "print_name": "Apex Engineering",
                "customer_group": "OEM",
                "customer_type": "Manufacturing",
                "status": "Active",
                "address": "12 Industrial Estate, Ambattur",
                "delivery_address": "Plant 2, Chennai",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "pincode": "600058",
                "country": "India",
                "mobile": "9876543210",
                "email": "purchase@apex-demo.com",
                "gst_type": "Regular",
                "gstin": "33ABCDE1234F1Z5",
                "pan_no": "ABCDE1234F",
                "payment_terms": "30 Days",
                "credit_limit": Decimal("500000"),
                "credit_days": 30,
                "is_active": True,
            },
            ["customer_code"],
        )
        supplier_id = upsert(
            cursor,
            "suppliers",
            {
                "supplier_code": "SUP-DEMO-001",
                "supplier_name": "Prime Metals and Components",
                "print_name": "Prime Metals",
                "supplier_group": "Raw Material",
                "supplier_type": "Manufacturer",
                "status": "Active",
                "address": "SIDCO Industrial Estate, Coimbatore",
                "city": "Coimbatore",
                "state": "Tamil Nadu",
                "pincode": "641021",
                "country": "India",
                "mobile": "9876501234",
                "email": "sales@primemetals-demo.com",
                "gst_type": "Regular",
                "gstin": "33AACCP1234G1Z2",
                "pan_no": "AACCP1234G",
                "payment_terms": "30 Days",
                "credit_days": 30,
            },
            ["supplier_code"],
        )

        store_id = upsert(
            cursor,
            "maintenance_stores",
            {
                "store_code": "STORE-DEMO-001",
                "store_name": "Main Raw Material Store",
                "location": "Coimbatore Plant",
                "description": "Default demo store for PO/JO/LO inward and stock reports",
                "is_active": True,
            },
            ["store_code"],
        )
        rack_id = upsert(
            cursor,
            "maintenance_racks",
            {
                "store_id": store_id,
                "rack_code": "RM-RACK-01",
                "rack_name": "Raw Material Rack 01",
                "description": "CRCA and electrical material rack",
                "is_active": True,
            },
            ["rack_code"],
        )
        upsert(
            cursor,
            "maintenance_bins",
            {
                "store_id": store_id,
                "rack_id": rack_id,
                "bin_code": "RM-BIN-01",
                "bin_name": "Raw Material Bin 01",
                "description": "Default bin for demo accepted stock",
                "is_active": True,
            },
            ["bin_code"],
        )

        fg_id = upsert(
            cursor,
            "items",
            {
                "item_type": "Manufacturing Item",
                "item_code": "FG-PANEL-001",
                "item_name": "Industrial Control Panel",
                "print_name": "Control Panel 100A",
                "item_group": "Finished Goods",
                "uom": "NOS",
                "hsn_code": "85371000",
                "rack": "FG-RACK-01",
                "bin": "FG-BIN-01",
                "sales_rate": Decimal("85000"),
                "purchase_rate": Decimal("0"),
                "is_active": True,
            },
            ["item_code"],
        )
        rm_sheet_id = upsert(
            cursor,
            "items",
            {
                "item_type": "Purchase Item",
                "item_code": "RM-SHEET-001",
                "item_name": "CRCA Sheet 2mm",
                "print_name": "CRCA Sheet",
                "item_group": "Raw Material",
                "uom": "KG",
                "hsn_code": "72091790",
                "rack": "RM-RACK-01",
                "bin": "RM-BIN-01",
                "purchase_rate": Decimal("82.50"),
                "is_active": True,
            },
            ["item_code"],
        )
        rm_breaker_id = upsert(
            cursor,
            "items",
            {
                "item_type": "Purchase Item",
                "item_code": "RM-MCCB-001",
                "item_name": "MCCB 100A 4P",
                "print_name": "MCCB 100A",
                "item_group": "Electrical",
                "uom": "NOS",
                "hsn_code": "85362030",
                "rack": "EL-RACK-01",
                "bin": "EL-BIN-01",
                "purchase_rate": Decimal("6500"),
                "is_active": True,
            },
            ["item_code"],
        )

        for item_id, qty, remark in [
            (rm_sheet_id, Decimal("250"), "Opening stock - CRCA Sheet"),
            (rm_breaker_id, Decimal("4"), "Opening stock - MCCB"),
            (fg_id, Decimal("2"), "Opening stock - Finished Panel"),
        ]:
            upsert(
                cursor,
                "stock_ledger",
                {
                    "item_id": item_id,
                    "ref_type": "OPENING",
                    "ref_id": 1,
                    "inward_qty": qty,
                    "outward_qty": Decimal("0"),
                    "balance_qty": qty,
                    "remarks": remark,
                },
                [],
                returning=None,
            )

        upsert(
            cursor,
            "item_groups",
            {
                "group_code": "IG-RM-001",
                "item_type": "Purchase Item",
                "group_name": "Raw Material",
                "description": "Purchased raw materials requiring inward inspection",
                "inspection_required": True,
                "is_active": True,
            },
            ["group_code"],
        )
        upsert(
            cursor,
            "process_master_records",
            {
                "master_type": "process",
                "code": "PC-0001",
                "name": "Panel Fabrication",
                "data": Json({"processCode": "PC-0001", "sequence": 1}),
                "is_active": True,
            },
            ["master_type", "code"],
        )
        upsert(
            cursor,
            "process_master_records",
            {
                "master_type": "process-group",
                "code": "PG-0001",
                "name": "Control Panel Production",
                "data": Json({"steps": ["Panel Fabrication", "Assembly", "Wiring", "Testing"]}),
                "is_active": True,
            },
            ["master_type", "code"],
        )

        print("3/8 Seeding BOM, SO, MRP, PR and PO...", flush=True)
        bom_items = [
            item_line(rm_sheet_id, "RM-SHEET-001", "CRCA Sheet 2mm", 40, "KG"),
            item_line(rm_breaker_id, "RM-MCCB-001", "MCCB 100A 4P", 2, "NOS"),
        ]
        bom_id = process_document(
            cursor,
            "bom",
            "BOM-DEMO-001",
            {
                "reference_no": "FG-PANEL-001",
                "order_type": "Manufacturing Item",
                "department": "Production",
                "status": "Active",
                "approval_status": "Approved",
                "remarks": "Demo BOM for Industrial Control Panel",
                "extra_data": {
                    "bomItemId": str(fg_id),
                    "bomItemCode": "FG-PANEL-001",
                    "bomItemName": "Industrial Control Panel",
                    "schedule": "Standard",
                    "department": "Production",
                },
            },
            bom_items,
        )
        so_items = [item_line(fg_id, "FG-PANEL-001", "Industrial Control Panel", 5, "NOS", unit_price=85000)]
        so_id = process_document(
            cursor,
            "so",
            "SO-DEMO-001",
            {
                "reference_no": "APEX/PO/2026/001",
                "reference_date": TODAY,
                "customer_id": customer_id,
                "order_number": "SO-DEMO-001",
                "order_type": "Sales Order",
                "department": "Sales",
                "status": "Open",
                "approval_status": "Approved",
                "remarks": "Demo customer sales order",
                "extra_data": {"customerPoNumber": "APEX/PO/2026/001", "bomId": bom_id},
            },
            so_items,
        )
        mrp_items = [
            item_line(
                rm_sheet_id, "RM-SHEET-001", "CRCA Sheet 2mm", 200, "KG",
                available_stock_qty=250, reservation_qty=200, status="Stock Available",
                shortageQty="0", decision="Reserve Stock",
            ),
            item_line(
                rm_breaker_id, "RM-MCCB-001", "MCCB 100A 4P", 10, "NOS",
                available_stock_qty=4, reservation_qty=4, status="Shortage",
                shortageQty="6", decision="Purchase Request",
            ),
        ]
        mrp_id = process_document(
            cursor,
            "mrp",
            "MRP-DEMO-001",
            {
                "reference_no": "SO-DEMO-001",
                "customer_id": customer_id,
                "order_number": "SO-DEMO-001",
                "order_type": "Sales Order",
                "department": "Planning",
                "material_planning": "BOM-DEMO-001",
                "status": "Completed",
                "approval_status": "Approved",
                "remarks": "MRP run from demo Sales Order and BOM",
                "extra_data": {"sourceSalesOrderId": so_id, "sourceBomId": bom_id},
            },
            mrp_items,
        )
        pr_items = [item_line(rm_breaker_id, "RM-MCCB-001", "MCCB 100A 4P", 6, "NOS", unit_price=6500)]
        pr_id = process_document(
            cursor,
            "pr",
            "PRQ-DEMO-001",
            {
                "reference_no": "MRP-DEMO-001",
                "order_number": "SO-DEMO-001",
                "department": "Purchase",
                "status": "Closed",
                "approval_status": "",
                "remarks": "Purchase Request generated for MRP shortage",
                "extra_data": {"sourceMrpId": mrp_id, "sourceSalesOrderId": so_id},
            },
            pr_items,
        )
        process_document(
            cursor,
            "pr",
            "PRQ-DEMO-002",
            {
                "reference_no": "MRP-DEMO-001",
                "order_number": "SO-DEMO-001",
                "department": "Purchase",
                "status": "Open",
                "approval_status": "",
                "remarks": "Open demo Purchase Request available for Create PO With PR testing",
                "extra_data": {"sourceMrpId": mrp_id, "sourceSalesOrderId": so_id},
            },
            [item_line(rm_sheet_id, "RM-SHEET-001", "CRCA Sheet 2mm", 50, "KG", unit_price=82.50)],
        )
        po_id = process_document(
            cursor,
            "po",
            "PO-DEMO-001",
            {
                "reference_no": "PRQ-DEMO-001",
                "supplier_id": supplier_id,
                "order_number": "PO-DEMO-001",
                "order_type": "Regular",
                "department": "Purchase",
                "status": "Open",
                "approval_status": "Approved",
                "remarks": "PO created against demo Purchase Request",
                "extra_data": {"selectedPrIds": [str(pr_id)], "poType": "Regular"},
            },
            pr_items,
        )
        wo_id = process_document(
            cursor,
            "wo",
            "WO-DEMO-001",
            {
                "reference_no": "SO-DEMO-001",
                "customer_id": customer_id,
                "order_number": "SO-DEMO-001",
                "order_type": "Sales Order",
                "department": "Production",
                "status": "Open",
                "approval_status": "Approved",
                "remarks": "Work Order for five control panels",
                "extra_data": {"sourceSalesOrderId": so_id, "bomId": bom_id},
            },
            so_items,
        )
        process_document(
            cursor,
            "production",
            "PROD-DEMO-001",
            {
                "reference_no": "WO-DEMO-001",
                "order_number": "WO-DEMO-001",
                "department": "Production",
                "status": "In Progress",
                "approval_status": "Approved",
                "remarks": "Demo production batch",
                "extra_data": {"workOrderId": wo_id, "completedQty": 2, "pendingQty": 3},
            },
            so_items,
        )
        process_document(
            cursor,
            "raw-material-issue",
            "RMI-DEMO-001",
            {
                "reference_no": "WO-DEMO-001",
                "order_number": "WO-DEMO-001",
                "department": "Stores",
                "status": "Issued",
                "remarks": "Raw material issued to production",
            },
            bom_items,
        )
        process_document(
            cursor,
            "fg-stock",
            "FGS-DEMO-001",
            {
                "reference_no": "WO-DEMO-001",
                "order_number": "WO-DEMO-001",
                "department": "Stores",
                "status": "Received",
                "remarks": "Two completed panels received into FG stock",
            },
            [item_line(fg_id, "FG-PANEL-001", "Industrial Control Panel", 2, "NOS")],
        )

        print("4/8 Seeding inward and quality inspection...", flush=True)
        inward_id = upsert(
            cursor,
            "purchase_inward",
            {
                "inward_no": "INW-DEMO-001",
                "inward_date": TODAY,
                "supplier_id": supplier_id,
                "po_no": "PO-DEMO-001",
                "invoice_no": "PM/INV/001",
                "invoice_date": TODAY,
                "status": "Received",
                "remarks": "Demo PO inward",
            },
            ["inward_no"],
        )
        inward_item_id = upsert(
            cursor,
            "purchase_inward_items",
            {
                "purchase_inward_id": inward_id,
                "inward_id": inward_id,
                "item_id": rm_breaker_id,
                "qty": Decimal("6"),
                "ordered_qty": Decimal("6"),
                "received_qty": Decimal("6"),
                "accepted_qty": Decimal("5"),
                "rejected_qty": Decimal("1"),
                "rate": Decimal("6500"),
            },
            ["purchase_inward_id", "item_id"],
        )

        inspection_id = upsert(
            cursor,
            "inward_inspections",
            {
                "inspection_no": "INI-DEMO-001",
                "inspection_date": TODAY,
                "inward_type": "PO Inward",
                "inward_id": inward_id,
                "purchase_inward_id": inward_id,
                "inward_no": "INW-DEMO-001",
                "supplier_id": supplier_id,
                "company_name": "Prime Metals and Components",
                "status": "Completed",
                "remarks": "One MCCB rejected due to terminal damage",
            },
            ["inspection_no"],
        )
        upsert(
            cursor,
            "inward_inspection_items",
            {
                "inspection_id": inspection_id,
                "inward_inspection_id": inspection_id,
                "purchase_inward_item_id": inward_item_id,
                "item_id": rm_breaker_id,
                "received_qty": Decimal("6"),
                "accepted_qty": Decimal("5"),
                "rejected_qty": Decimal("1"),
                "hold_qty": Decimal("0"),
                "hold_number": "HOLD-DEMO-001",
                "idle_stock_qty": Decimal("0"),
                "rework_qty": Decimal("0"),
                "rejection_reason": "Terminal damaged",
                "reason": "Terminal damaged",
                "location": "EL-RACK-01 / EL-BIN-01",
                "status": "Inspected",
            },
            ["inspection_id", "item_id"],
        )

        upsert(
            cursor,
            "stock_ledger",
            {
                "item_id": rm_breaker_id,
                "ref_type": "QUALITY_ACCEPTED",
                "ref_id": inspection_id,
                "inward_qty": Decimal("5"),
                "outward_qty": Decimal("0"),
                "balance_qty": Decimal("9"),
                "remarks": "Accepted stock from INI-DEMO-001 at EL-RACK-01 / EL-BIN-01",
                "stock_status": "Accepted",
                "location": "Main Raw Material Store / EL-RACK-01 / EL-BIN-01",
            },
            ["item_id", "ref_type", "ref_id"],
            returning=None,
        )
        upsert(
            cursor,
            "stock_ledger",
            {
                "item_id": rm_breaker_id,
                "ref_type": "QUALITY_REJECTED",
                "ref_id": inspection_id,
                "inward_qty": Decimal("0"),
                "outward_qty": Decimal("1"),
                "balance_qty": Decimal("1"),
                "remarks": "Rejected stock from INI-DEMO-001 - terminal damaged",
                "stock_status": "Rejected",
                "location": "Rejected Store",
            },
            ["item_id", "ref_type", "ref_id"],
            returning=None,
        )

        print("5/9 Seeding Sales DC and invoices...", flush=True)
        sales_dc_id = upsert(
            cursor,
            "sales_dc",
            {
                "dc_no": "SDC-DEMO-001",
                "dc_date": TODAY,
                "customer_id": customer_id,
                "po_number": "APEX/PO/2026/001",
                "reference_no": "SO-DEMO-001",
                "vehicle_no": "TN37AB1234",
                "mode_of_transport": "By Road",
                "linked_invoice_ids": Json([]),
                "remarks": "Sales DC created against demo Sales Order",
                "status": "Open",
            },
            ["dc_no"],
        )
        upsert(
            cursor,
            "sales_dc_items",
            {
                "sales_dc_id": sales_dc_id,
                "item_id": fg_id,
                "qty": Decimal("2"),
                "returned_qty": Decimal("0"),
                "pending_qty": Decimal("0"),
                "hsn_code": "85371000",
            },
            ["sales_dc_id", "item_id"],
        )
        sale_invoice_id = upsert(
            cursor,
            "sale_invoices",
            {
                "invoice_no": "SINV-DEMO-001",
                "invoice_date": TODAY,
                "customer_id": customer_id,
                "sales_dc_id": sales_dc_id,
                "address_type": "billing",
                "invoice_address": "12 Industrial Estate, Ambattur, Chennai, Tamil Nadu - 600058",
                "subtotal": Decimal("170000"),
                "gst_amount": Decimal("30600"),
                "total_amount": Decimal("200600"),
                "status": "Posted",
                "remarks": "Demo sale invoice generated from SDC-DEMO-001",
            },
            ["invoice_no"],
        )
        tax_invoice_id = upsert(
            cursor,
            "tax_invoices",
            {
                "invoice_no": "TAX-DEMO-001",
                "invoice_date": TODAY,
                "customer_id": customer_id,
                "sales_dc_id": sales_dc_id,
                "address_type": "billing",
                "invoice_address": "12 Industrial Estate, Ambattur, Chennai, Tamil Nadu - 600058",
                "subtotal": Decimal("170000"),
                "gst_amount": Decimal("30600"),
                "total_amount": Decimal("200600"),
                "status": "Posted",
                "remarks": "Demo tax invoice with Original/Duplicate print copy",
            },
            ["invoice_no"],
        )
        invoice_items = [
            {
                "item_id": fg_id,
                "qty": Decimal("2"),
                "rate": Decimal("85000"),
                "tax_percent": Decimal("18"),
                "amount": Decimal("170000"),
            }
        ]
        seed_invoice_items(cursor, "sale_invoice_items", "sale_invoice_id", sale_invoice_id, invoice_items)
        seed_invoice_items(cursor, "tax_invoice_items", "tax_invoice_id", tax_invoice_id, invoice_items)
        cursor.execute(
            "UPDATE sales_dc SET linked_invoice_ids = %s, status = %s WHERE id = %s",
            (Json([sale_invoice_id, tax_invoice_id]), "Invoiced", sales_dc_id),
        )

        purchase_return_id = upsert(
            cursor,
            "purchase_returns",
            {
                "return_type": "PO_DC_RETURN",
                "return_no": "GRN-PO-RT-DEMO-001",
                "return_date": TODAY,
                "supplier_id": supplier_id,
                "purchase_inward_id": inward_id,
                "reference_no": "INW-DEMO-001",
                "reference_date": TODAY,
                "purchase_ledger": "Purchase - Raw Material",
                "lr_no": "LR-DEMO-001",
                "so_number": "SO-DEMO-001",
                "subtotal": Decimal("6500"),
                "tax_percent": Decimal("18"),
                "tax_amount": Decimal("1170"),
                "total_amount": Decimal("7670"),
                "status": "Posted",
                "approval_status": "Approved",
                "remarks": "Rejected MCCB returned to supplier",
            },
            ["return_no"],
        )
        upsert(
            cursor,
            "purchase_return_items",
            {
                "purchase_return_id": purchase_return_id,
                "item_id": rm_breaker_id,
                "qty": Decimal("1"),
                "rate": Decimal("6500"),
                "amount": Decimal("6500"),
                "net_amount": Decimal("6500"),
                "rejected_qty": Decimal("1"),
                "print_code": "RM-MCCB-001",
            },
            ["purchase_return_id", "item_id"],
        )

        print("6/9 Seeding CRM...", flush=True)
        upsert(
            cursor,
            "crm_leads",
            {
                "lead_no": "LEAD-DEMO-001",
                "customer_id": customer_id,
                "customer_name": "Apex Engineering Private Limited",
                "company_name": "Apex Engineering Private Limited",
                "contact_person": "Ravi Kumar",
                "email": "ravi@apex-demo.com",
                "phone": "9876543210",
                "source": "Website",
                "status": "Converted",
                "stage": "Won",
                "expected_revenue": Decimal("425000"),
                "probability": 100,
                "assigned_to": "Demo Administrator",
                "remarks": "Converted to customer and Sales Order SO-DEMO-001",
            },
            ["lead_no"],
        )
        upsert(
            cursor,
            "crm_enquiries",
            {
                "enquiry_no": "ENQ-DEMO-001",
                "customer_id": customer_id,
                "customer_name": "Apex Engineering Private Limited",
                "enquiry_date": TODAY,
                "status": "Quoted",
                "subject": "Five Industrial Control Panels",
                "remarks": "Demo enquiry linked to quotation",
            },
            ["enquiry_no"],
        )
        upsert(
            cursor,
            "crm_quotations",
            {
                "quotation_no": "QUO-DEMO-001",
                "customer_id": customer_id,
                "customer_name": "Apex Engineering Private Limited",
                "quotation_date": TODAY,
                "valid_until": TODAY + timedelta(days=30),
                "status": "Approved",
                "total_amount": Decimal("425000"),
                "remarks": "Approved quotation converted to SO-DEMO-001",
            },
            ["quotation_no"],
        )

        print("7/9 Seeding subcontractor DC...", flush=True)
        subcontractor_id = upsert(
            cursor,
            "subcontractors",
            {
                "subcontractor_code": "SUB-DEMO-001",
                "subcontractor_name": "XYZ Precision Machining",
                "short_name": "XYZ Machining",
                "gst_number": "33AAACX1234A1Z1",
                "industry_type": "Machining",
                "contact_person": "Suresh",
                "mobile": "9876512345",
                "email": "works@xyz-demo.com",
                "status": "Active",
                "is_active": True,
            },
            ["subcontractor_code"],
        )
        subcontract_dc_id = upsert(
            cursor,
            "subcontractor_dc",
            {
                "dc_no": "SUBDC-DEMO-001",
                "dc_date": TODAY,
                "subcontractor_id": subcontractor_id,
                "reference_type": "WO-DEMO-001",
                "reference_no": "WO-DEMO-001",
                "work_order_no": "WO-DEMO-001",
                "returnable": True,
                "status": "Open",
                "remarks": "Panel plates sent for powder coating",
            },
            ["dc_no"],
        )
        upsert(
            cursor,
            "subcontractor_dc_items",
            {
                "dc_id": subcontract_dc_id,
                "subcontractor_dc_id": subcontract_dc_id,
                "item_id": rm_sheet_id,
                "item_code": "RM-SHEET-001",
                "item_name": "Fabricated Panel Enclosure",
                "qty": Decimal("5"),
                "quantity": Decimal("5"),
                "uom": "NOS",
                "returned_qty": Decimal("0"),
                "pending_qty": Decimal("5"),
                "remarks": "Returnable after powder coating",
            },
            ["subcontractor_dc_id", "item_id"],
        )

        print("8/9 Committing data...", flush=True)
        connection.commit()
        print("9/9 Complete.", flush=True)
        print("Demo data loaded successfully.")
        print("Login: admin@zygerdemo.com / Demo@123")
        print("Flow: CRM -> SO -> BOM -> MRP -> PR -> PO -> Inward -> Quality -> Purchase Return -> WO -> Production -> FG Stock -> Sales DC -> Sale/Tax Invoice -> Subcontractor DC")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
