from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import Json, RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


PROCESS_CONFIG = {
    "so": {"prefix": "SO", "title": "Sales Order"},
    "wo": {"prefix": "WO", "title": "Work Order"},
    "po": {"prefix": "PO", "title": "Purchase Order"},
    "pr": {"prefix": "PRQ", "title": "Purchase Request"},
    "bom": {"prefix": "BOM", "title": "Bill of Material"},
    "mrp": {"prefix": "MRP", "title": "Material Requirement Planning"},
    "production": {"prefix": "PROD", "title": "Production"},
    "routesheet": {"prefix": "RSH", "title": "Routesheet"},
    "raw-material-issue": {"prefix": "RMI", "title": "Raw Material Issue"},
    "process-inspection": {"prefix": "PIN", "title": "Process Inspection"},
    "fg-stock": {"prefix": "FGS", "title": "Finished Goods Stock"},
    "general-dc": {"prefix": "GDC", "title": "General DC"},
    "iar": {"prefix": "IAR", "title": "Issue Against Receipt"},
    "rai": {"prefix": "RAI", "title": "Received Against Issue"},
    "jo-inward": {"prefix": "JIN", "title": "JO Inward"},
    "supplier-invoice": {"prefix": "SIN", "title": "Supplier Invoice"},
}

MASTER_CONFIG = {
    "item-catalog": {"prefix": "IC", "title": "Item Catalog"},
    "process": {"prefix": "PC", "title": "Process"},
    "process-group": {"prefix": "PG", "title": "Process Group"},
}


class ProcessItemPayload(BaseModel):
    itemId: Optional[int] = None
    itemCode: Optional[str] = None
    itemName: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[str] = "0"
    uom: Optional[str] = None
    weight: Optional[str] = "0"
    totalWeight: Optional[str] = "0"
    reservationQty: Optional[str] = "0"
    reservedQty: Optional[str] = "0"
    availableStockQty: Optional[str] = "0"
    shortageQty: Optional[str] = "0"
    sourceDocumentNo: Optional[str] = None
    sourceItemName: Optional[str] = None
    decision: Optional[str] = None
    locationQty: Optional[str] = None
    unitPrice: Optional[str] = "0"
    discountType: Optional[str] = None
    discountValue: Optional[str] = "0"
    taxName: Optional[str] = None
    taxPercent: Optional[str] = "0"
    taxValue: Optional[str] = "0"
    amount: Optional[str] = "0"
    totalAmount: Optional[str] = "0"
    dueDate: Optional[str] = None
    remarks: Optional[str] = None
    status: Optional[str] = "Open"


class ProcessPayload(BaseModel):
    documentNo: Optional[str] = None
    documentDate: Optional[str] = None
    referenceNo: Optional[str] = None
    referenceDate: Optional[str] = None
    customerId: Optional[int] = None
    supplierId: Optional[int] = None
    orderNumber: Optional[str] = None
    orderType: Optional[str] = None
    department: Optional[str] = None
    budgetHead: Optional[str] = None
    materialPlanning: Optional[str] = None
    planningQuantity: bool = False
    initiatedBy: Optional[str] = None
    targetDate: Optional[str] = None
    visibleTo: Optional[str] = None
    status: Optional[str] = "Open"
    approvalStatus: Optional[str] = "Pending"
    remarks: Optional[str] = None
    extraData: Optional[Dict[str, Any]] = None
    items: Optional[List[ProcessItemPayload]] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _process_or_404(process_type: str):
    config = PROCESS_CONFIG.get(process_type)
    if not config:
        raise HTTPException(status_code=404, detail="Process screen not found")
    return config


def _ensure_process_tables(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS erp_process_documents (
            id BIGSERIAL PRIMARY KEY,
            process_type VARCHAR(40) NOT NULL,
            document_no VARCHAR(80) NOT NULL,
            document_date DATE DEFAULT CURRENT_DATE,
            reference_no VARCHAR(120),
            reference_date DATE,
            customer_id BIGINT,
            supplier_id BIGINT,
            order_number VARCHAR(120),
            order_type VARCHAR(80),
            department VARCHAR(120),
            budget_head VARCHAR(120),
            material_planning VARCHAR(120),
            planning_quantity BOOLEAN DEFAULT FALSE,
            initiated_by VARCHAR(150),
            target_date DATE,
            visible_to VARCHAR(150),
            status VARCHAR(50) DEFAULT 'Open',
            approval_status VARCHAR(50) DEFAULT 'Pending',
            remarks TEXT,
            extra_data JSONB DEFAULT '{}'::JSONB,
            items JSONB DEFAULT '[]'::JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(process_type, document_no)
        )
        """
    )
    cursor.execute("ALTER TABLE erp_process_documents ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::JSONB")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS process_notifications (
            id BIGSERIAL PRIMARY KEY,
            module VARCHAR(80) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT,
            ref_type VARCHAR(40),
            ref_id BIGINT,
            ref_no VARCHAR(80),
            target_department VARCHAR(120),
            status VARCHAR(40) DEFAULT 'Unread',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS process_master_records (
            id BIGSERIAL PRIMARY KEY,
            master_type VARCHAR(60) NOT NULL,
            code VARCHAR(80) NOT NULL,
            name VARCHAR(200) NOT NULL,
            grade VARCHAR(80),
            remarks TEXT,
            data JSONB DEFAULT '{}'::JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(master_type, code)
        )
        """
    )


def _to_decimal(value):
    return Decimal(str(value or "0"))


def _serialize(row):
    result = {}
    for key, value in row.items():
        if isinstance(value, Decimal):
            result[key] = str(value)
        elif hasattr(value, "isoformat"):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


def _next_number(cursor, process_type: str):
    config = _process_or_404(process_type)
    prefix = config["prefix"]
    cursor.execute(
        """
        SELECT document_no
        FROM erp_process_documents
        WHERE process_type = %s AND document_no LIKE %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (process_type, f"{prefix}-%"),
    )
    row = cursor.fetchone()
    next_id = 1
    if row and row.get("document_no"):
        try:
            next_id = int(str(row["document_no"]).split("-")[-1]) + 1
        except ValueError:
            next_id = 1
    return f"{prefix}-{date.today().year}-{next_id:04d}"


def _clean_items(items):
    cleaned = []
    for item in items or []:
        row = item.model_dump() if hasattr(item, "model_dump") else dict(item)
        qty = _to_decimal(row.get("quantity"))
        weight = _to_decimal(row.get("weight"))
        if not row.get("itemId") and not row.get("itemName") and qty == 0:
            continue
        row["quantity"] = str(qty)
        row["weight"] = str(weight)
        row["totalWeight"] = str(_to_decimal(row.get("totalWeight")) or qty * weight)
        row["reservationQty"] = str(_to_decimal(row.get("reservationQty")))
        row["reservedQty"] = str(_to_decimal(row.get("reservedQty")))
        row["availableStockQty"] = str(_to_decimal(row.get("availableStockQty")))
        row["shortageQty"] = str(_to_decimal(row.get("shortageQty")))
        unit_price = _to_decimal(row.get("unitPrice"))
        discount_value = _to_decimal(row.get("discountValue"))
        tax_percent = _to_decimal(row.get("taxPercent"))
        amount = qty * unit_price
        if str(row.get("discountType") or "").lower().startswith("percent"):
            amount = amount - (amount * discount_value / Decimal("100"))
        else:
            amount = amount - discount_value
        tax_value = amount * tax_percent / Decimal("100")
        row["unitPrice"] = str(unit_price)
        row["discountValue"] = str(discount_value)
        row["taxPercent"] = str(tax_percent)
        row["taxValue"] = str(tax_value)
        row["amount"] = str(amount)
        row["totalAmount"] = str(amount + tax_value)
        cleaned.append(row)
    return cleaned


def _fetch_process_document(cursor, process_type: str, document_id: int):
    cursor.execute(
        """
        SELECT epd.*, c.customer_name, s.supplier_name
        FROM erp_process_documents epd
        LEFT JOIN customers c ON c.id = epd.customer_id
        LEFT JOIN suppliers s ON s.id = epd.supplier_id
        WHERE epd.process_type = %s AND epd.id = %s
        """,
        (process_type, document_id),
    )
    row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Process document not found")
    return row


def _insert_process_document(cursor, process_type: str, data: Dict[str, Any], items: List[Dict[str, Any]]):
    document_no = data.get("documentNo") or _next_number(cursor, process_type)
    cursor.execute(
        """
        INSERT INTO erp_process_documents (
            process_type, document_no, document_date, reference_no, reference_date,
            customer_id, supplier_id, order_number, order_type, department, budget_head,
            material_planning, planning_quantity, initiated_by, target_date, visible_to,
            status, approval_status, remarks, extra_data, items
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            process_type,
            document_no,
            data.get("documentDate") or date.today().isoformat(),
            data.get("referenceNo"),
            data.get("referenceDate"),
            data.get("customerId"),
            data.get("supplierId"),
            data.get("orderNumber"),
            data.get("orderType"),
            data.get("department"),
            data.get("budgetHead"),
            data.get("materialPlanning"),
            data.get("planningQuantity", False),
            data.get("initiatedBy"),
            data.get("targetDate"),
            data.get("visibleTo"),
            data.get("status") or "Open",
            data.get("approvalStatus") or "Pending",
            data.get("remarks"),
            Json(data.get("extraData") or {}),
            Json(items),
        ),
    )
    return cursor.fetchone()


def _latest_stock(cursor, item_id):
    if not item_id:
        return Decimal("0")
    cursor.execute(
        """
        SELECT balance_qty
        FROM stock_ledger
        WHERE item_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (item_id,),
    )
    row = cursor.fetchone()
    return _to_decimal(row["balance_qty"]) if row else Decimal("0")


def _find_bom_for_item(cursor, item: Dict[str, Any]):
    item_id = str(item.get("itemId") or item.get("item_id") or "")
    item_code = str(item.get("itemCode") or item.get("item_code") or "")
    item_name = str(item.get("itemName") or item.get("item_name") or "")
    cursor.execute(
        """
        SELECT *
        FROM erp_process_documents
        WHERE process_type = 'bom'
          AND (
            COALESCE(extra_data->>'bomItemId', '') = %s OR
            COALESCE(extra_data->>'fgItemId', '') = %s OR
            COALESCE(extra_data->>'bomItemCode', '') = %s OR
            document_no = %s OR
            COALESCE(extra_data->>'bomItemName', '') ILIKE %s OR
            COALESCE(extra_data->>'copyBomItem', '') ILIKE %s OR
            COALESCE(extra_data->>'finishedItemName', '') ILIKE %s
          )
        ORDER BY id DESC
        LIMIT 1
        """,
        (item_id, item_id, item_code, item_code, f"%{item_name}%", f"%{item_name}%", f"%{item_name}%"),
    )
    return cursor.fetchone()


def _insert_notification(cursor, title: str, message: str, ref_type: str, ref_id: int, ref_no: str, target_department: str):
    cursor.execute(
        """
        INSERT INTO process_notifications (
            module, title, message, ref_type, ref_id, ref_no, target_department
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        ("Purchase", title, message, ref_type, ref_id, ref_no, target_department),
    )


def _close_selected_purchase_requests(cursor, data: Dict[str, Any]):
    extra_data = data.get("extraData") or {}
    selected_ids = extra_data.get("selectedPrIds") or []
    clean_ids = []
    for value in selected_ids:
        try:
            clean_ids.append(int(value))
        except (TypeError, ValueError):
            continue
    if not clean_ids:
        return
    cursor.execute(
        """
        UPDATE erp_process_documents
        SET status = 'Closed', updated_at = CURRENT_TIMESTAMP
        WHERE process_type = 'pr' AND id = ANY(%s)
        """,
        (clean_ids,),
    )


def _master_or_404(master_type: str):
    config = MASTER_CONFIG.get(master_type)
    if not config:
        raise HTTPException(status_code=404, detail="Master screen not found")
    return config


def _next_master_code(cursor, master_type: str):
    config = _master_or_404(master_type)
    prefix = config["prefix"]
    cursor.execute(
        """
        SELECT code
        FROM process_master_records
        WHERE master_type = %s AND code LIKE %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (master_type, f"{prefix}-%"),
    )
    row = cursor.fetchone()
    next_id = 1
    if row and row.get("code"):
        try:
            next_id = int(str(row["code"]).split("-")[-1]) + 1
        except ValueError:
            next_id = 1
    return f"{prefix}-{next_id:04d}"


@router.get("/process/{process_type}/next-number")
def get_next_process_number(process_type: str):
    _process_or_404(process_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        return {"nextNumber": _next_number(cursor, process_type)}
    finally:
        cursor.close()
        connection.close()


@router.get("/master/{master_type}/next-number")
def get_next_master_number(master_type: str):
    _master_or_404(master_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        return {"nextNumber": _next_master_code(cursor, master_type)}
    finally:
        cursor.close()
        connection.close()


@router.get("/master/{master_type}")
def list_master_records(master_type: str, q: str = ""):
    _master_or_404(master_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        params: list[Any] = [master_type]
        where = "WHERE master_type = %s"
        if q:
            params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])
            where += " AND (code ILIKE %s OR name ILIKE %s OR COALESCE(grade, '') ILIKE %s)"
        cursor.execute(
            f"""
            SELECT *
            FROM process_master_records
            {where}
            ORDER BY id DESC
            """,
            tuple(params),
        )
        return [_serialize(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        connection.close()


@router.get("/master/{master_type}/{record_id}")
def get_master_record(master_type: str, record_id: int):
    _master_or_404(master_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        cursor.execute(
            "SELECT * FROM process_master_records WHERE master_type = %s AND id = %s",
            (master_type, record_id),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Master record not found")
        return _serialize(row)
    finally:
        cursor.close()
        connection.close()


@router.post("/master/{master_type}")
def create_master_record(master_type: str, payload: Dict[str, Any]):
    _master_or_404(master_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        code = payload.get("code") or _next_master_code(cursor, master_type)
        name = payload.get("name") or payload.get("catalogName") or payload.get("processName") or payload.get("groupName")
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")
        cursor.execute(
            """
            INSERT INTO process_master_records (master_type, code, name, grade, remarks, data, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                master_type,
                code,
                name,
                payload.get("grade"),
                payload.get("remarks"),
                Json(payload),
                payload.get("isActive", True),
            ),
        )
        row = cursor.fetchone()
        connection.commit()
        return {"message": "Master record saved successfully", "record": _serialize(row)}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.put("/master/{master_type}/{record_id}")
def update_master_record(master_type: str, record_id: int, payload: Dict[str, Any]):
    _master_or_404(master_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        name = payload.get("name") or payload.get("catalogName") or payload.get("processName") or payload.get("groupName")
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")
        cursor.execute(
            """
            UPDATE process_master_records
            SET code = %s, name = %s, grade = %s, remarks = %s, data = %s,
                is_active = %s, updated_at = CURRENT_TIMESTAMP
            WHERE master_type = %s AND id = %s
            RETURNING *
            """,
            (
                payload.get("code"),
                name,
                payload.get("grade"),
                payload.get("remarks"),
                Json(payload),
                payload.get("isActive", True),
                master_type,
                record_id,
            ),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Master record not found")
        connection.commit()
        return {"message": "Master record updated successfully", "record": _serialize(row)}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/process/{process_type}/source-options")
def get_process_source_options(process_type: str):
    _process_or_404(process_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        cursor.execute(
            """
            SELECT id, document_no, document_date, process_type, status
            FROM erp_process_documents
            WHERE process_type <> %s
            ORDER BY id DESC
            LIMIT 200
            """,
            (process_type,),
        )
        return [_serialize(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        connection.close()


@router.get("/process/{process_type}")
def list_process_documents(process_type: str, q: str = ""):
    _process_or_404(process_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        params: list[Any] = [process_type]
        where = "WHERE epd.process_type = %s"
        if q:
            params.extend([f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%"])
            where += """
                AND (
                    epd.document_no ILIKE %s OR
                    epd.reference_no ILIKE %s OR
                    COALESCE(c.customer_name, '') ILIKE %s OR
                    COALESCE(s.supplier_name, '') ILIKE %s
                )
            """
        cursor.execute(
            f"""
            SELECT
                epd.*,
                c.customer_name,
                s.supplier_name,
                JSONB_ARRAY_LENGTH(COALESCE(epd.items, '[]'::JSONB)) AS item_count
            FROM erp_process_documents epd
            LEFT JOIN customers c ON c.id = epd.customer_id
            LEFT JOIN suppliers s ON s.id = epd.supplier_id
            {where}
            ORDER BY epd.id DESC
            """,
            tuple(params),
        )
        return [_serialize(row) for row in cursor.fetchall()]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/process/{process_type}/{document_id}")
def get_process_document(process_type: str, document_id: int):
    _process_or_404(process_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        cursor.execute(
            """
            SELECT epd.*, c.customer_name, s.supplier_name
            FROM erp_process_documents epd
            LEFT JOIN customers c ON c.id = epd.customer_id
            LEFT JOIN suppliers s ON s.id = epd.supplier_id
            WHERE epd.process_type = %s AND epd.id = %s
            """,
            (process_type, document_id),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Process document not found")
        return _serialize(row)
    finally:
        cursor.close()
        connection.close()


@router.post("/process/{process_type}")
def create_process_document(process_type: str, payload: ProcessPayload):
    _process_or_404(process_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()
    try:
        _ensure_process_tables(cursor)
        items = _clean_items(data.get("items"))
        if process_type == "pr":
            data["status"] = "Open"
            data["approvalStatus"] = ""
        row = _insert_process_document(cursor, process_type, data, items)
        if process_type == "po":
            _close_selected_purchase_requests(cursor, data)
        connection.commit()
        return {"message": "Process document saved successfully", "document": _serialize(row)}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/notifications/purchase")
def get_purchase_notifications():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        cursor.execute(
            """
            SELECT *
            FROM process_notifications
            WHERE target_department = 'Purchase'
            ORDER BY id DESC
            LIMIT 100
            """
        )
        return [_serialize(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        connection.close()


@router.post("/process/so/{document_id}/run-mrp")
def run_mrp_for_sales_order(document_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        sales_order = _fetch_process_document(cursor, "so", document_id)
        sales_items = sales_order.get("items") or []
        if not sales_items:
            raise HTTPException(status_code=400, detail="Sales Order has no product items for MRP")

        mrp_rows = []
        for so_item in sales_items:
            so_qty = _to_decimal(so_item.get("quantity"))
            bom = _find_bom_for_item(cursor, so_item)
            component_rows = bom.get("items") if bom else [so_item]
            bom_no = bom.get("document_no") if bom else "Direct item"

            for component in component_rows or []:
                base_qty = _to_decimal(component.get("quantity") or "1")
                required_qty = base_qty * so_qty if bom else so_qty
                available_qty = _latest_stock(cursor, component.get("itemId"))
                reserved_qty = min(required_qty, available_qty)
                shortage_qty = required_qty - available_qty
                if shortage_qty < 0:
                    shortage_qty = Decimal("0")

                mrp_rows.append({
                    "itemId": component.get("itemId"),
                    "itemCode": component.get("itemCode") or component.get("item_code") or "",
                    "itemName": component.get("itemName") or component.get("item_name") or component.get("description") or "Material",
                    "description": component.get("description") or "",
                    "quantity": str(required_qty),
                    "uom": component.get("uom") or so_item.get("uom") or "",
                    "weight": component.get("weight") or "0",
                    "totalWeight": component.get("totalWeight") or "0",
                    "reservationQty": str(reserved_qty),
                    "reservedQty": str(reserved_qty),
                    "availableStockQty": str(available_qty),
                    "shortageQty": str(shortage_qty),
                    "sourceDocumentNo": sales_order["document_no"],
                    "sourceItemName": so_item.get("itemName") or so_item.get("description") or "",
                    "decision": "Purchase Request" if shortage_qty > 0 else "Stock Available",
                    "dueDate": sales_order.get("target_date") or date.today().isoformat(),
                    "status": "Shortage" if shortage_qty > 0 else "Reserved",
                    "remarks": f"MRP from {sales_order['document_no']} using {bom_no}",
                })

        mrp_doc = _insert_process_document(
            cursor,
            "mrp",
            {
                "documentDate": date.today().isoformat(),
                "referenceNo": sales_order["document_no"],
                "customerId": sales_order.get("customer_id"),
                "orderNumber": sales_order["document_no"],
                "orderType": "Sales Order",
                "department": "Planning",
                "materialPlanning": "Auto MRP",
                "status": "Open",
                "approvalStatus": "Pending",
                "remarks": f"MRP generated from Sales Order {sales_order['document_no']}",
                "extraData": {
                    "sourceSalesOrderId": sales_order["id"],
                    "sourceSalesOrderNo": sales_order["document_no"],
                    "flow": "SO -> MRP",
                },
            },
            mrp_rows,
        )

        shortage_rows = [
            {**row, "quantity": row["shortageQty"], "status": "Open", "remarks": f"Shortage from {mrp_doc['document_no']}"}
            for row in mrp_rows
            if _to_decimal(row.get("shortageQty")) > 0
        ]
        pr_doc = None
        if shortage_rows:
            pr_doc = _insert_process_document(
                cursor,
                "pr",
                {
                    "documentDate": date.today().isoformat(),
                    "referenceNo": mrp_doc["document_no"],
                    "customerId": sales_order.get("customer_id"),
                    "orderNumber": sales_order["document_no"],
                    "orderType": "Purchase Order",
                    "department": "Purchase",
                    "materialPlanning": mrp_doc["document_no"],
                    "targetDate": sales_order.get("target_date") or date.today().isoformat(),
                    "status": "Open",
                    "approvalStatus": "Pending",
                    "remarks": f"Auto PR generated for stock shortage from MRP {mrp_doc['document_no']}",
                    "extraData": {
                        "sourceMrpId": mrp_doc["id"],
                        "sourceMrpNo": mrp_doc["document_no"],
                        "sourceSalesOrderId": sales_order["id"],
                        "sourceSalesOrderNo": sales_order["document_no"],
                        "flow": "SO -> MRP -> PR",
                    },
                },
                shortage_rows,
            )
            _insert_notification(
                cursor,
                "Purchase Request Generated",
                f"{pr_doc['document_no']} generated from MRP {mrp_doc['document_no']} for Sales Order {sales_order['document_no']}.",
                "pr",
                pr_doc["id"],
                pr_doc["document_no"],
                "Purchase",
            )

        connection.commit()
        return {
            "message": "MRP completed successfully",
            "mrp": _serialize(mrp_doc),
            "purchaseRequest": _serialize(pr_doc) if pr_doc else None,
            "analysis": mrp_rows,
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


def _generate_work_order_from_document(source_type: str, document_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_process_tables(cursor)
        source = _fetch_process_document(cursor, source_type, document_id)
        source_items = source.get("items") or []
        if not source_items:
            raise HTTPException(status_code=400, detail="Source document has no items for Work Order")

        work_order = _insert_process_document(
            cursor,
            "wo",
            {
                "documentDate": date.today().isoformat(),
                "referenceNo": source["document_no"],
                "customerId": source.get("customer_id"),
                "orderNumber": source.get("order_number") or source["document_no"],
                "orderType": PROCESS_CONFIG[source_type]["title"],
                "department": "Production",
                "targetDate": source.get("target_date") or date.today().isoformat(),
                "status": "Open",
                "approvalStatus": "Pending",
                "remarks": f"Work Order generated from {PROCESS_CONFIG[source_type]['title']} {source['document_no']}",
                "extraData": {
                    "sourceType": source_type,
                    "sourceId": source["id"],
                    "sourceNo": source["document_no"],
                    "flow": f"{source_type.upper()} -> WO",
                },
            },
            source_items,
        )
        connection.commit()
        return {"message": "Work Order generated successfully", "workOrder": _serialize(work_order)}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/process/bom/{document_id}/generate-work-order")
def generate_work_order_from_bom(document_id: int):
    return _generate_work_order_from_document("bom", document_id)


@router.post("/process/mrp/{document_id}/generate-work-order")
def generate_work_order_from_mrp(document_id: int):
    return _generate_work_order_from_document("mrp", document_id)


@router.post("/process/so/{document_id}/generate-work-order")
def generate_work_order_from_sales_order(document_id: int):
    return _generate_work_order_from_document("so", document_id)


@router.put("/process/{process_type}/{document_id}")
def update_process_document(process_type: str, document_id: int, payload: ProcessPayload):
    _process_or_404(process_type)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()
    try:
        _ensure_process_tables(cursor)
        items = _clean_items(data.get("items"))
        if process_type == "pr":
            cursor.execute(
                """
                SELECT status
                FROM erp_process_documents
                WHERE process_type = %s AND id = %s
                """,
                (process_type, document_id),
            )
            current_pr = cursor.fetchone()
            data["status"] = (current_pr or {}).get("status") or "Open"
            data["approvalStatus"] = ""
        cursor.execute(
            """
            UPDATE erp_process_documents
            SET
                document_no = %s,
                document_date = %s,
                reference_no = %s,
                reference_date = %s,
                customer_id = %s,
                supplier_id = %s,
                order_number = %s,
                order_type = %s,
                department = %s,
                budget_head = %s,
                material_planning = %s,
                planning_quantity = %s,
                initiated_by = %s,
                target_date = %s,
                visible_to = %s,
                status = %s,
                approval_status = %s,
                remarks = %s,
                extra_data = %s,
                items = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE process_type = %s AND id = %s
            RETURNING *
            """,
            (
                data.get("documentNo"),
                data.get("documentDate"),
                data.get("referenceNo"),
                data.get("referenceDate"),
                data.get("customerId"),
                data.get("supplierId"),
                data.get("orderNumber"),
                data.get("orderType"),
                data.get("department"),
                data.get("budgetHead"),
                data.get("materialPlanning"),
                data.get("planningQuantity"),
                data.get("initiatedBy"),
                data.get("targetDate"),
                data.get("visibleTo"),
                data.get("status") or "Open",
                data.get("approvalStatus") or "Pending",
                data.get("remarks"),
                Json(data.get("extraData") or {}),
                Json(items),
                process_type,
                document_id,
            ),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Process document not found")
        if process_type == "po":
            _close_selected_purchase_requests(cursor, data)
        connection.commit()
        return {"message": "Process document updated successfully", "document": _serialize(row)}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
