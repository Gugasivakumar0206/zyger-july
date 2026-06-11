from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import Json, RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class SubcontractorPayload(BaseModel):
    gstNumber: Optional[str] = None
    code: str
    name: str
    shortName: str
    industryType: Optional[str] = None
    contactPerson: Optional[str] = None
    attentionPerson: Optional[str] = None
    priority: Optional[str] = None
    enableTcs: Optional[bool] = False
    tcsAmount: Optional[str] = None
    enableTds: Optional[bool] = False
    tdsMinAmount: Optional[str] = None
    tdsPercentage: Optional[str] = None
    generalRemarks: Optional[str] = None
    visibleTo: Optional[str] = None
    active: Optional[bool] = True
    addresses: Optional[list[dict[str, Any]]] = None
    billingContacts: Optional[list[dict[str, Any]]] = None
    shippingContacts: Optional[list[dict[str, Any]]] = None
    taxClassification: Optional[dict[str, Any]] = None
    registration: Optional[dict[str, Any]] = None
    bank: Optional[dict[str, Any]] = None
    attachments: Optional[list[dict[str, Any]]] = None


class SubcontractorDCItemPayload(BaseModel):
    itemId: int
    itemCode: Optional[str] = None
    itemName: Optional[str] = None
    uom: Optional[str] = None
    availableStock: Optional[str] = "0"
    issueQty: str
    returnedQty: Optional[str] = "0"
    acceptedQty: Optional[str] = "0"
    rejectedQty: Optional[str] = "0"
    pendingQty: Optional[str] = "0"
    rate: Optional[str] = "0"
    amount: Optional[str] = "0"
    batchNo: Optional[str] = None
    location: Optional[str] = None
    remarks: Optional[str] = None


class SubcontractorDCPayload(BaseModel):
    dcNo: str
    dcDate: str
    dcType: Optional[str] = "Returnable"
    subcontractorId: int
    workOrderNo: Optional[str] = None
    routeSheetNo: Optional[str] = None
    processName: Optional[str] = None
    referenceNo: Optional[str] = None
    vehicleNo: Optional[str] = None
    transportMode: Optional[str] = None
    expectedReturnDate: Optional[str] = None
    returnDate: Optional[str] = None
    ewayBillNo: Optional[str] = None
    gstType: Optional[str] = None
    status: Optional[str] = "Open"
    approvalStatus: Optional[str] = "Pending"
    remarks: Optional[str] = None
    items: list[SubcontractorDCItemPayload]


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _ensure_schema(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS subcontractors (
            id BIGSERIAL PRIMARY KEY,
            subcontractor_code VARCHAR(50) NOT NULL UNIQUE,
            subcontractor_name VARCHAR(200) NOT NULL,
            short_name VARCHAR(150) NOT NULL,
            gst_number VARCHAR(50),
            industry_type VARCHAR(120),
            contact_person VARCHAR(150),
            attention_person VARCHAR(150),
            priority INTEGER,
            enable_tcs BOOLEAN DEFAULT FALSE,
            tcs_amount NUMERIC(14,2),
            enable_tds BOOLEAN DEFAULT FALSE,
            tds_min_amount NUMERIC(14,2),
            tds_percentage NUMERIC(8,3),
            general_remarks TEXT,
            visible_to VARCHAR(120),
            active BOOLEAN DEFAULT TRUE,
            addresses JSONB DEFAULT '[]'::jsonb,
            billing_contacts JSONB DEFAULT '[]'::jsonb,
            shipping_contacts JSONB DEFAULT '[]'::jsonb,
            tax_classification JSONB DEFAULT '{}'::jsonb,
            registration JSONB DEFAULT '{}'::jsonb,
            bank JSONB DEFAULT '{}'::jsonb,
            attachments JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_subcontractors_code ON subcontractors(subcontractor_code)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_subcontractors_name ON subcontractors(subcontractor_name)")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS subcontractor_dc (
            id BIGSERIAL PRIMARY KEY,
            dc_no VARCHAR(60) NOT NULL UNIQUE,
            dc_date DATE NOT NULL,
            dc_type VARCHAR(40) DEFAULT 'Returnable',
            subcontractor_id BIGINT NOT NULL REFERENCES subcontractors(id),
            work_order_no VARCHAR(80),
            route_sheet_no VARCHAR(80),
            process_name VARCHAR(160),
            reference_no VARCHAR(100),
            vehicle_no VARCHAR(80),
            transport_mode VARCHAR(80),
            expected_return_date DATE,
            return_date DATE,
            eway_bill_no VARCHAR(100),
            gst_type VARCHAR(100),
            total_issue_qty NUMERIC(14,3) DEFAULT 0,
            total_returned_qty NUMERIC(14,3) DEFAULT 0,
            total_accepted_qty NUMERIC(14,3) DEFAULT 0,
            total_rejected_qty NUMERIC(14,3) DEFAULT 0,
            total_pending_qty NUMERIC(14,3) DEFAULT 0,
            total_amount NUMERIC(14,2) DEFAULT 0,
            status VARCHAR(40) DEFAULT 'Open',
            approval_status VARCHAR(40) DEFAULT 'Pending',
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS subcontractor_dc_items (
            id BIGSERIAL PRIMARY KEY,
            subcontractor_dc_id BIGINT NOT NULL REFERENCES subcontractor_dc(id) ON DELETE CASCADE,
            item_id BIGINT NOT NULL,
            item_code VARCHAR(80),
            item_name VARCHAR(220),
            uom VARCHAR(50),
            available_stock NUMERIC(14,3) DEFAULT 0,
            issue_qty NUMERIC(14,3) DEFAULT 0,
            returned_qty NUMERIC(14,3) DEFAULT 0,
            accepted_qty NUMERIC(14,3) DEFAULT 0,
            rejected_qty NUMERIC(14,3) DEFAULT 0,
            pending_qty NUMERIC(14,3) DEFAULT 0,
            rate NUMERIC(14,2) DEFAULT 0,
            amount NUMERIC(14,2) DEFAULT 0,
            batch_no VARCHAR(100),
            location VARCHAR(160),
            remarks TEXT
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS stock_ledger (
            id BIGSERIAL PRIMARY KEY,
            item_id BIGINT NOT NULL,
            ref_type VARCHAR(80),
            ref_id BIGINT,
            inward_qty NUMERIC(14,3) DEFAULT 0,
            outward_qty NUMERIC(14,3) DEFAULT 0,
            balance_qty NUMERIC(14,3) DEFAULT 0,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_subcontractor_dc_no ON subcontractor_dc(dc_no)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_subcontractor_dc_subcontractor ON subcontractor_dc(subcontractor_id)")


def _to_decimal_or_none(value):
    value = str(value or "").strip()
    return value if value else None


def _decimal(value):
    return Decimal(str(value or "0"))


def _latest_stock_balance(cursor, item_id):
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
    return _decimal(row["balance_qty"]) if row else Decimal("0")


def _post_stock(cursor, item_id, ref_type, ref_id, inward_qty, outward_qty, remarks):
    inward_qty = _decimal(inward_qty)
    outward_qty = _decimal(outward_qty)
    if inward_qty == 0 and outward_qty == 0:
        return

    current_balance = _latest_stock_balance(cursor, item_id)
    if outward_qty > 0 and current_balance < outward_qty:
        raise HTTPException(status_code=400, detail=f"Insufficient stock for item {item_id}. Available: {current_balance}")

    balance_qty = current_balance + inward_qty - outward_qty
    cursor.execute(
        """
        INSERT INTO stock_ledger (
            item_id, ref_type, ref_id, inward_qty, outward_qty, balance_qty, remarks
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (item_id, ref_type, ref_id, inward_qty, outward_qty, balance_qty, remarks),
    )


def _fetch_item(cursor, item_id):
    cursor.execute(
        """
        SELECT id, item_code, item_name, uom, purchase_rate
        FROM items
        WHERE id = %s
        """,
        (item_id,),
    )
    item = cursor.fetchone()
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
    return item


def _to_int_or_none(value):
    value = str(value or "").strip()
    if not value:
        return None
    try:
        return int(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Priority must be a number") from exc


def _row_to_response(row):
    return {
        "id": row["id"],
        "code": row["subcontractor_code"],
        "name": row["subcontractor_name"],
        "shortName": row["short_name"],
        "gstNumber": row["gst_number"],
        "industryType": row["industry_type"],
        "contactPerson": row["contact_person"],
        "attentionPerson": row["attention_person"],
        "priority": row["priority"],
        "enableTcs": row["enable_tcs"],
        "tcsAmount": str(row["tcs_amount"] or ""),
        "enableTds": row["enable_tds"],
        "tdsMinAmount": str(row["tds_min_amount"] or ""),
        "tdsPercentage": str(row["tds_percentage"] or ""),
        "generalRemarks": row["general_remarks"],
        "visibleTo": row["visible_to"],
        "active": row["active"],
        "addresses": row["addresses"] or [],
        "billingContacts": row["billing_contacts"] or [],
        "shippingContacts": row["shipping_contacts"] or [],
        "taxClassification": row["tax_classification"] or {},
        "registration": row["registration"] or {},
        "bank": row["bank"] or {},
        "attachments": row["attachments"] or [],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _dc_row_to_response(row, items=None):
    return {
        "id": row["id"],
        "dcNo": row["dc_no"],
        "dcDate": str(row["dc_date"]),
        "dcType": row["dc_type"],
        "subcontractorId": row["subcontractor_id"],
        "subcontractorCode": row.get("subcontractor_code"),
        "subcontractorName": row.get("subcontractor_name"),
        "workOrderNo": row["work_order_no"],
        "routeSheetNo": row["route_sheet_no"],
        "processName": row["process_name"],
        "referenceNo": row["reference_no"],
        "vehicleNo": row["vehicle_no"],
        "transportMode": row["transport_mode"],
        "expectedReturnDate": str(row["expected_return_date"]) if row["expected_return_date"] else "",
        "returnDate": str(row["return_date"]) if row["return_date"] else "",
        "ewayBillNo": row["eway_bill_no"],
        "gstType": row["gst_type"],
        "totalIssueQty": str(row["total_issue_qty"] or 0),
        "totalReturnedQty": str(row["total_returned_qty"] or 0),
        "totalAcceptedQty": str(row["total_accepted_qty"] or 0),
        "totalRejectedQty": str(row["total_rejected_qty"] or 0),
        "totalPendingQty": str(row["total_pending_qty"] or 0),
        "totalAmount": str(row["total_amount"] or 0),
        "status": row["status"],
        "approvalStatus": row["approval_status"],
        "remarks": row["remarks"],
        "items": items or [],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _dc_item_to_response(row):
    return {
        "id": row["id"],
        "itemId": row["item_id"],
        "itemCode": row["item_code"],
        "itemName": row["item_name"],
        "uom": row["uom"],
        "availableStock": str(row["available_stock"] or 0),
        "issueQty": str(row["issue_qty"] or 0),
        "returnedQty": str(row["returned_qty"] or 0),
        "acceptedQty": str(row["accepted_qty"] or 0),
        "rejectedQty": str(row["rejected_qty"] or 0),
        "pendingQty": str(row["pending_qty"] or 0),
        "rate": str(row["rate"] or 0),
        "amount": str(row["amount"] or 0),
        "batchNo": row["batch_no"],
        "location": row["location"],
        "remarks": row["remarks"],
    }


@router.get("/next-number")
def get_next_subcontractor_number():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_schema(cursor)
        cursor.execute(
            """
            SELECT subcontractor_code
            FROM subcontractors
            WHERE subcontractor_code LIKE 'SUB-%'
            ORDER BY id DESC
            LIMIT 1
            """
        )
        row = cursor.fetchone()
        current = row["subcontractor_code"] if row else ""
        try:
            next_number = int(str(current).split("-")[-1]) + 1
        except ValueError:
            next_number = 1
        connection.commit()
        return {"nextNumber": f"SUB-{next_number:04d}"}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/")
def list_subcontractors(q: str = ""):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_schema(cursor)
        if q:
            like = f"%{q}%"
            cursor.execute(
                """
                SELECT *
                FROM subcontractors
                WHERE subcontractor_code ILIKE %s
                   OR subcontractor_name ILIKE %s
                   OR short_name ILIKE %s
                   OR COALESCE(gst_number, '') ILIKE %s
                ORDER BY id DESC
                """,
                (like, like, like, like),
            )
        else:
            cursor.execute("SELECT * FROM subcontractors ORDER BY id DESC")
        rows = cursor.fetchall()
        connection.commit()
        return [_row_to_response(row) for row in rows]
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/master/{subcontractor_id}")
def get_subcontractor(subcontractor_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_schema(cursor)
        cursor.execute("SELECT * FROM subcontractors WHERE id = %s", (subcontractor_id,))
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="SubContractor not found")
        connection.commit()
        return _row_to_response(row)
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


def _validate_payload(data):
    if not str(data.get("code") or "").strip():
        raise HTTPException(status_code=400, detail="SubContractor code is required")
    if not str(data.get("name") or "").strip():
        raise HTTPException(status_code=400, detail="SubContractor name is required")
    if not str(data.get("shortName") or "").strip():
        raise HTTPException(status_code=400, detail="Short name is required")
    if not str(data.get("gstNumber") or "").strip():
        raise HTTPException(status_code=400, detail="GST number is mandatory")


@router.post("/")
def create_subcontractor(payload: SubcontractorPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_schema(cursor)
        _validate_payload(data)
        cursor.execute(
            """
            INSERT INTO subcontractors (
                subcontractor_code, subcontractor_name, short_name, gst_number,
                industry_type, contact_person, attention_person, priority,
                enable_tcs, tcs_amount, enable_tds, tds_min_amount, tds_percentage,
                general_remarks, visible_to, active, addresses, billing_contacts,
                shipping_contacts, tax_classification, registration, bank, attachments
            )
            VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            RETURNING *
            """,
            (
                data["code"],
                data["name"],
                data["shortName"],
                data["gstNumber"],
                data.get("industryType"),
                data.get("contactPerson"),
                data.get("attentionPerson"),
                _to_int_or_none(data.get("priority")),
                data.get("enableTcs") or False,
                _to_decimal_or_none(data.get("tcsAmount")),
                data.get("enableTds") or False,
                _to_decimal_or_none(data.get("tdsMinAmount")),
                _to_decimal_or_none(data.get("tdsPercentage")),
                data.get("generalRemarks"),
                data.get("visibleTo"),
                data.get("active") if data.get("active") is not None else True,
                Json(data.get("addresses") or []),
                Json(data.get("billingContacts") or []),
                Json(data.get("shippingContacts") or []),
                Json(data.get("taxClassification") or {}),
                Json(data.get("registration") or {}),
                Json(data.get("bank") or {}),
                Json(data.get("attachments") or []),
            ),
        )
        row = cursor.fetchone()
        connection.commit()
        return {"message": "SubContractor created successfully", "subcontractor": _row_to_response(row)}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.put("/master/{subcontractor_id}")
def update_subcontractor(subcontractor_id: int, payload: SubcontractorPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_schema(cursor)
        _validate_payload(data)
        cursor.execute(
            """
            UPDATE subcontractors
            SET
                subcontractor_code = %s,
                subcontractor_name = %s,
                short_name = %s,
                gst_number = %s,
                industry_type = %s,
                contact_person = %s,
                attention_person = %s,
                priority = %s,
                enable_tcs = %s,
                tcs_amount = %s,
                enable_tds = %s,
                tds_min_amount = %s,
                tds_percentage = %s,
                general_remarks = %s,
                visible_to = %s,
                active = %s,
                addresses = %s,
                billing_contacts = %s,
                shipping_contacts = %s,
                tax_classification = %s,
                registration = %s,
                bank = %s,
                attachments = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *
            """,
            (
                data["code"],
                data["name"],
                data["shortName"],
                data["gstNumber"],
                data.get("industryType"),
                data.get("contactPerson"),
                data.get("attentionPerson"),
                _to_int_or_none(data.get("priority")),
                data.get("enableTcs") or False,
                _to_decimal_or_none(data.get("tcsAmount")),
                data.get("enableTds") or False,
                _to_decimal_or_none(data.get("tdsMinAmount")),
                _to_decimal_or_none(data.get("tdsPercentage")),
                data.get("generalRemarks"),
                data.get("visibleTo"),
                data.get("active") if data.get("active") is not None else True,
                Json(data.get("addresses") or []),
                Json(data.get("billingContacts") or []),
                Json(data.get("shippingContacts") or []),
                Json(data.get("taxClassification") or {}),
                Json(data.get("registration") or {}),
                Json(data.get("bank") or {}),
                Json(data.get("attachments") or []),
                subcontractor_id,
            ),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="SubContractor not found")
        connection.commit()
        return {"message": "SubContractor updated successfully", "subcontractor": _row_to_response(row)}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.delete("/master/{subcontractor_id}")
def delete_subcontractor(subcontractor_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_schema(cursor)
        cursor.execute("DELETE FROM subcontractors WHERE id = %s RETURNING id", (subcontractor_id,))
        deleted = cursor.fetchone()
        if deleted is None:
            raise HTTPException(status_code=404, detail="SubContractor not found")
        connection.commit()
        return {"message": "SubContractor deleted successfully"}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/transactions/next-number")
def get_next_subcontractor_dc_number():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_schema(cursor)
        cursor.execute(
            """
            SELECT dc_no
            FROM subcontractor_dc
            WHERE dc_no LIKE 'SCDC-%'
            ORDER BY id DESC
            LIMIT 1
            """
        )
        row = cursor.fetchone()
        current = row["dc_no"] if row else ""
        try:
            next_number = int(str(current).split("-")[-1]) + 1
        except ValueError:
            next_number = 1
        connection.commit()
        return {"nextNumber": f"SCDC-{next_number:04d}"}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/transactions")
def list_subcontractor_dc(q: str = ""):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_schema(cursor)
        like = f"%{q}%"
        if q:
            cursor.execute(
                """
                SELECT d.*, s.subcontractor_code, s.subcontractor_name
                FROM subcontractor_dc d
                JOIN subcontractors s ON s.id = d.subcontractor_id
                WHERE d.dc_no ILIKE %s
                   OR s.subcontractor_name ILIKE %s
                   OR COALESCE(d.work_order_no, '') ILIKE %s
                   OR COALESCE(d.route_sheet_no, '') ILIKE %s
                   OR COALESCE(d.process_name, '') ILIKE %s
                ORDER BY d.id DESC
                """,
                (like, like, like, like, like),
            )
        else:
            cursor.execute(
                """
                SELECT d.*, s.subcontractor_code, s.subcontractor_name
                FROM subcontractor_dc d
                JOIN subcontractors s ON s.id = d.subcontractor_id
                ORDER BY d.id DESC
                """
            )
        rows = cursor.fetchall()
        connection.commit()
        return [_dc_row_to_response(row) for row in rows]
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/transactions/{dc_id}")
def get_subcontractor_dc(dc_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_schema(cursor)
        cursor.execute(
            """
            SELECT d.*, s.subcontractor_code, s.subcontractor_name
            FROM subcontractor_dc d
            JOIN subcontractors s ON s.id = d.subcontractor_id
            WHERE d.id = %s
            """,
            (dc_id,),
        )
        header = cursor.fetchone()
        if header is None:
            raise HTTPException(status_code=404, detail="SubContractor DC not found")

        cursor.execute(
            """
            SELECT *
            FROM subcontractor_dc_items
            WHERE subcontractor_dc_id = %s
            ORDER BY id ASC
            """,
            (dc_id,),
        )
        items = [_dc_item_to_response(row) for row in cursor.fetchall()]
        connection.commit()
        return _dc_row_to_response(header, items)
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


def _save_dc_items(cursor, dc_id, dc_no, items, post_stock=True):
    totals = {
        "issue": Decimal("0"),
        "returned": Decimal("0"),
        "accepted": Decimal("0"),
        "rejected": Decimal("0"),
        "pending": Decimal("0"),
        "amount": Decimal("0"),
    }

    for payload in items:
        item_data = payload.model_dump() if hasattr(payload, "model_dump") else payload
        item = _fetch_item(cursor, item_data["itemId"])
        issue_qty = _decimal(item_data.get("issueQty"))
        returned_qty = _decimal(item_data.get("returnedQty"))
        accepted_qty = _decimal(item_data.get("acceptedQty"))
        rejected_qty = _decimal(item_data.get("rejectedQty"))
        rate = _decimal(item_data.get("rate") or item.get("purchase_rate") or 0)
        pending_qty = issue_qty - returned_qty
        if pending_qty < 0:
            raise HTTPException(status_code=400, detail="Returned qty cannot exceed issued qty")
        amount = issue_qty * rate

        totals["issue"] += issue_qty
        totals["returned"] += returned_qty
        totals["accepted"] += accepted_qty
        totals["rejected"] += rejected_qty
        totals["pending"] += pending_qty
        totals["amount"] += amount

        cursor.execute(
            """
            INSERT INTO subcontractor_dc_items (
                subcontractor_dc_id, item_id, item_code, item_name, uom,
                available_stock, issue_qty, returned_qty, accepted_qty,
                rejected_qty, pending_qty, rate, amount, batch_no, location, remarks
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                dc_id,
                item["id"],
                item_data.get("itemCode") or item["item_code"],
                item_data.get("itemName") or item["item_name"],
                item_data.get("uom") or item["uom"],
                _latest_stock_balance(cursor, item["id"]),
                issue_qty,
                returned_qty,
                accepted_qty,
                rejected_qty,
                pending_qty,
                rate,
                amount,
                item_data.get("batchNo"),
                item_data.get("location"),
                item_data.get("remarks"),
            ),
        )

        if post_stock:
            _post_stock(cursor, item["id"], "SUBCONTRACTOR_DC_ISSUE", dc_id, 0, issue_qty, f"SubContractor DC issue {dc_no}")
            if accepted_qty > 0:
                _post_stock(cursor, item["id"], "SUBCONTRACTOR_DC_RETURN", dc_id, accepted_qty, 0, f"SubContractor DC accepted return {dc_no}")

    return totals


def _fetch_dc_stock_totals(cursor, dc_id):
    cursor.execute(
        """
        SELECT
            item_id,
            SUM(COALESCE(issue_qty, 0)) AS issue_qty,
            SUM(COALESCE(accepted_qty, 0)) AS accepted_qty
        FROM subcontractor_dc_items
        WHERE subcontractor_dc_id = %s
        GROUP BY item_id
        """,
        (dc_id,),
    )
    return {
        row["item_id"]: {
            "issue": _decimal(row["issue_qty"]),
            "accepted": _decimal(row["accepted_qty"]),
        }
        for row in cursor.fetchall()
    }


def _payload_stock_totals(items):
    totals = {}
    for payload in items:
        item_data = payload.model_dump() if hasattr(payload, "model_dump") else payload
        item_id = int(item_data["itemId"])
        current = totals.setdefault(item_id, {"issue": Decimal("0"), "accepted": Decimal("0")})
        current["issue"] += _decimal(item_data.get("issueQty"))
        current["accepted"] += _decimal(item_data.get("acceptedQty"))
    return totals


def _post_stock_adjustments(cursor, dc_id, dc_no, old_totals, new_totals):
    item_ids = set(old_totals.keys()) | set(new_totals.keys())
    for item_id in item_ids:
        old_issue = old_totals.get(item_id, {}).get("issue", Decimal("0"))
        new_issue = new_totals.get(item_id, {}).get("issue", Decimal("0"))
        issue_delta = new_issue - old_issue

        if issue_delta > 0:
            _post_stock(
                cursor,
                item_id,
                "SUBCONTRACTOR_DC_ISSUE_ADJUST",
                dc_id,
                0,
                issue_delta,
                f"SubContractor DC issue adjustment {dc_no}",
            )
        elif issue_delta < 0:
            _post_stock(
                cursor,
                item_id,
                "SUBCONTRACTOR_DC_ISSUE_REVERSAL",
                dc_id,
                abs(issue_delta),
                0,
                f"SubContractor DC issue reversal {dc_no}",
            )

        old_accepted = old_totals.get(item_id, {}).get("accepted", Decimal("0"))
        new_accepted = new_totals.get(item_id, {}).get("accepted", Decimal("0"))
        accepted_delta = new_accepted - old_accepted

        if accepted_delta > 0:
            _post_stock(
                cursor,
                item_id,
                "SUBCONTRACTOR_DC_RETURN_ADJUST",
                dc_id,
                accepted_delta,
                0,
                f"SubContractor DC accepted return adjustment {dc_no}",
            )
        elif accepted_delta < 0:
            _post_stock(
                cursor,
                item_id,
                "SUBCONTRACTOR_DC_RETURN_REVERSAL",
                dc_id,
                0,
                abs(accepted_delta),
                f"SubContractor DC accepted return reversal {dc_no}",
            )


@router.post("/transactions")
def create_subcontractor_dc(payload: SubcontractorDCPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_schema(cursor)
        if not data.get("items"):
            raise HTTPException(status_code=400, detail="At least one DC item is required")
        cursor.execute("SELECT id FROM subcontractors WHERE id = %s", (data["subcontractorId"],))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="SubContractor not found")

        cursor.execute(
            """
            INSERT INTO subcontractor_dc (
                dc_no, dc_date, dc_type, subcontractor_id, work_order_no,
                route_sheet_no, process_name, reference_no, vehicle_no,
                transport_mode, expected_return_date, return_date, eway_bill_no,
                gst_type, status, approval_status, remarks
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                data["dcNo"],
                data["dcDate"],
                data.get("dcType") or "Returnable",
                data["subcontractorId"],
                data.get("workOrderNo"),
                data.get("routeSheetNo"),
                data.get("processName"),
                data.get("referenceNo"),
                data.get("vehicleNo"),
                data.get("transportMode"),
                data.get("expectedReturnDate") or None,
                data.get("returnDate") or None,
                data.get("ewayBillNo"),
                data.get("gstType"),
                data.get("status") or "Open",
                data.get("approvalStatus") or "Pending",
                data.get("remarks"),
            ),
        )
        dc = cursor.fetchone()
        totals = _save_dc_items(cursor, dc["id"], dc["dc_no"], payload.items, post_stock=True)
        cursor.execute(
            """
            UPDATE subcontractor_dc
            SET total_issue_qty = %s,
                total_returned_qty = %s,
                total_accepted_qty = %s,
                total_rejected_qty = %s,
                total_pending_qty = %s,
                total_amount = %s,
                status = 'Open'
            WHERE id = %s
            RETURNING *
            """,
            (
                totals["issue"],
                totals["returned"],
                totals["accepted"],
                totals["rejected"],
                totals["pending"],
                totals["amount"],
                dc["id"],
            ),
        )
        saved = cursor.fetchone()
        connection.commit()
        return {"message": "SubContractor DC saved successfully", "dc": _dc_row_to_response(saved)}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.put("/transactions/{dc_id}")
def update_subcontractor_dc(dc_id: int, payload: SubcontractorDCPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_schema(cursor)
        cursor.execute("SELECT id FROM subcontractor_dc WHERE id = %s", (dc_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="SubContractor DC not found")
        cursor.execute("SELECT id FROM subcontractors WHERE id = %s", (data["subcontractorId"],))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="SubContractor not found")

        old_stock_totals = _fetch_dc_stock_totals(cursor, dc_id)
        new_stock_totals = _payload_stock_totals(payload.items)
        _post_stock_adjustments(cursor, dc_id, data["dcNo"], old_stock_totals, new_stock_totals)

        cursor.execute("DELETE FROM subcontractor_dc_items WHERE subcontractor_dc_id = %s", (dc_id,))
        totals = _save_dc_items(cursor, dc_id, data["dcNo"], payload.items, post_stock=False)
        cursor.execute(
            """
            UPDATE subcontractor_dc
            SET dc_no = %s,
                dc_date = %s,
                dc_type = %s,
                subcontractor_id = %s,
                work_order_no = %s,
                route_sheet_no = %s,
                process_name = %s,
                reference_no = %s,
                vehicle_no = %s,
                transport_mode = %s,
                expected_return_date = %s,
                return_date = %s,
                eway_bill_no = %s,
                gst_type = %s,
                total_issue_qty = %s,
                total_returned_qty = %s,
                total_accepted_qty = %s,
                total_rejected_qty = %s,
                total_pending_qty = %s,
                total_amount = %s,
                status = CASE
                    WHEN %s = 0 THEN 'Completed'
                    WHEN %s > 0 THEN 'Pending'
                    ELSE 'Open'
                END,
                approval_status = %s,
                remarks = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *
            """,
            (
                data["dcNo"],
                data["dcDate"],
                data.get("dcType") or "Returnable",
                data["subcontractorId"],
                data.get("workOrderNo"),
                data.get("routeSheetNo"),
                data.get("processName"),
                data.get("referenceNo"),
                data.get("vehicleNo"),
                data.get("transportMode"),
                data.get("expectedReturnDate") or None,
                data.get("returnDate") or None,
                data.get("ewayBillNo"),
                data.get("gstType"),
                totals["issue"],
                totals["returned"],
                totals["accepted"],
                totals["rejected"],
                totals["pending"],
                totals["amount"],
                totals["pending"],
                totals["returned"],
                data.get("approvalStatus") or "Pending",
                data.get("remarks"),
                dc_id,
            ),
        )
        row = cursor.fetchone()
        connection.commit()
        return {"message": "SubContractor DC updated successfully", "dc": _dc_row_to_response(row)}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
