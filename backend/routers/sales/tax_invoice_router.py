from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class TaxInvoicePayload(BaseModel):
    invoiceNumber: str
    invoiceDate: str
    customerId: int
    salesDcId: Optional[int] = None
    addressType: Optional[str] = "billing"
    invoiceAddress: Optional[str] = None
    itemId: int
    qty: str
    rate: str
    taxPercent: str
    status: Optional[str] = "Draft"
    remarks: Optional[str] = None


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _ensure_tax_invoice_columns(cursor):
    cursor.execute("ALTER TABLE tax_invoices ADD COLUMN IF NOT EXISTS address_type VARCHAR(30) DEFAULT 'billing'")
    cursor.execute("ALTER TABLE tax_invoices ADD COLUMN IF NOT EXISTS invoice_address TEXT")


def _resolve_invoice_address(cursor, customer_id: int, address_type: str | None, invoice_address: str | None):
    cursor.execute(
        """
        SELECT address, delivery_address, city, state, pincode
        FROM customers
        WHERE id = %s
        """,
        (customer_id,),
    )
    customer = cursor.fetchone()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    selected_type = (address_type or "billing").lower()
    billing_address = ", ".join(filter(None, [customer["address"], customer["city"], customer["state"], customer["pincode"]]))
    delivery_address = customer["delivery_address"] or billing_address

    if selected_type == "delivery":
        return "delivery", delivery_address
    if selected_type == "custom":
        return "custom", (invoice_address or "").strip() or billing_address
    return "billing", billing_address


def _validate_tax_invoice_refs(cursor, data):
    cursor.execute("SELECT id FROM customers WHERE id = %s", (data["customerId"],))
    if cursor.fetchone() is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    cursor.execute("SELECT id FROM items WHERE id = %s", (data["itemId"],))
    if cursor.fetchone() is None:
        raise HTTPException(status_code=404, detail="Item not found")

    if data["salesDcId"]:
        cursor.execute("SELECT id FROM sales_dc WHERE id = %s", (data["salesDcId"],))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Sales DC not found")


@router.get("/")
def list_tax_invoices():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_tax_invoice_columns(cursor)
        cursor.execute(
            """
            SELECT
                ti.id,
                ti.invoice_no,
                ti.invoice_date,
                ti.subtotal,
                ti.gst_amount,
                ti.total_amount,
                ti.status,
                c.customer_name,
                tii.item_id,
                i.item_code,
                i.item_name,
                tii.qty,
                tii.rate,
                tii.tax_percent,
                tii.amount
            FROM tax_invoices ti
            JOIN customers c ON c.id = ti.customer_id
            JOIN tax_invoice_items tii ON tii.tax_invoice_id = ti.id
            JOIN items i ON i.id = tii.item_id
            ORDER BY ti.id DESC, tii.id DESC
            """
        )
        return cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/{invoice_id}")
def get_tax_invoice(invoice_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_tax_invoice_columns(cursor)
        cursor.execute(
            """
            SELECT
                ti.id,
                ti.invoice_no,
                ti.invoice_date,
                ti.customer_id,
                ti.sales_dc_id,
                ti.address_type,
                ti.invoice_address,
                ti.subtotal,
                ti.gst_amount,
                ti.total_amount,
                ti.status,
                ti.remarks,
                c.customer_code,
                c.customer_name,
                c.address,
                c.city,
                c.state,
                c.pincode,
                c.phone,
                c.mobile,
                c.email,
                c.gstin,
                c.payment_terms,
                c.transport_mode,
                sdc.dc_no,
                tii.item_id,
                tii.qty,
                tii.rate,
                tii.tax_percent,
                tii.amount,
                i.item_code,
                i.item_name,
                i.uom,
                i.hsn_code
            FROM tax_invoices ti
            JOIN customers c ON c.id = ti.customer_id
            LEFT JOIN sales_dc sdc ON sdc.id = ti.sales_dc_id
            JOIN tax_invoice_items tii ON tii.tax_invoice_id = ti.id
            JOIN items i ON i.id = tii.item_id
            WHERE ti.id = %s
            ORDER BY tii.id ASC
            LIMIT 1
            """,
            (invoice_id,),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Tax invoice not found")
        return row
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/")
def create_tax_invoice(payload: TaxInvoicePayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    qty = Decimal(str(data["qty"]))
    rate = Decimal(str(data["rate"]))
    tax_percent = Decimal(str(data["taxPercent"]))
    subtotal = qty * rate
    gst_amount = (subtotal * tax_percent) / Decimal("100")
    total_amount = subtotal + gst_amount

    try:
        _ensure_tax_invoice_columns(cursor)
        _validate_tax_invoice_refs(cursor, data)
        address_type, resolved_invoice_address = _resolve_invoice_address(
            cursor,
            data["customerId"],
            data.get("addressType"),
            data.get("invoiceAddress"),
        )

        cursor.execute(
            """
            INSERT INTO tax_invoices (
                invoice_no, invoice_date, customer_id, sales_dc_id, address_type, invoice_address,
                subtotal, gst_amount, total_amount, status, remarks
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, invoice_no, invoice_date, total_amount, status
            """,
            (
                data["invoiceNumber"],
                data["invoiceDate"],
                data["customerId"],
                data["salesDcId"],
                address_type,
                resolved_invoice_address,
                subtotal,
                gst_amount,
                total_amount,
                data["status"],
                data["remarks"],
            ),
        )
        invoice = cursor.fetchone()

        cursor.execute(
            """
            INSERT INTO tax_invoice_items (
                tax_invoice_id, item_id, qty, rate, tax_percent, amount
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                invoice["id"],
                data["itemId"],
                qty,
                rate,
                tax_percent,
                subtotal,
            ),
        )
        line = cursor.fetchone()
        connection.commit()

        return {
            "message": "Tax invoice created successfully",
            "invoice": invoice,
            "line": {
                "id": line["id"],
                "item_id": data["itemId"],
                "qty": str(qty),
                "rate": str(rate),
                "tax_percent": str(tax_percent),
                "amount": str(subtotal),
            },
            "totals": {
                "subtotal": str(subtotal),
                "gst_amount": str(gst_amount),
                "total_amount": str(total_amount),
            },
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


@router.put("/{invoice_id}")
def update_tax_invoice(invoice_id: int, payload: TaxInvoicePayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    qty = Decimal(str(data["qty"]))
    rate = Decimal(str(data["rate"]))
    tax_percent = Decimal(str(data["taxPercent"]))
    subtotal = qty * rate
    gst_amount = (subtotal * tax_percent) / Decimal("100")
    total_amount = subtotal + gst_amount

    try:
        _ensure_tax_invoice_columns(cursor)
        cursor.execute("SELECT id FROM tax_invoices WHERE id = %s", (invoice_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Tax invoice not found")

        _validate_tax_invoice_refs(cursor, data)
        address_type, resolved_invoice_address = _resolve_invoice_address(
            cursor,
            data["customerId"],
            data.get("addressType"),
            data.get("invoiceAddress"),
        )

        cursor.execute(
            """
            UPDATE tax_invoices
            SET
                invoice_no = %s,
                invoice_date = %s,
                customer_id = %s,
                sales_dc_id = %s,
                address_type = %s,
                invoice_address = %s,
                subtotal = %s,
                gst_amount = %s,
                total_amount = %s,
                status = %s,
                remarks = %s
            WHERE id = %s
            RETURNING id, invoice_no, invoice_date, total_amount, status
            """,
            (
                data["invoiceNumber"],
                data["invoiceDate"],
                data["customerId"],
                data["salesDcId"],
                address_type,
                resolved_invoice_address,
                subtotal,
                gst_amount,
                total_amount,
                data["status"],
                data["remarks"],
                invoice_id,
            ),
        )
        invoice = cursor.fetchone()

        cursor.execute(
            """
            UPDATE tax_invoice_items
            SET item_id = %s, qty = %s, rate = %s, tax_percent = %s, amount = %s
            WHERE tax_invoice_id = %s
            RETURNING id
            """,
            (
                data["itemId"],
                qty,
                rate,
                tax_percent,
                subtotal,
                invoice_id,
            ),
        )
        line = cursor.fetchone()
        connection.commit()

        return {
            "message": "Tax invoice updated successfully",
            "invoice": invoice,
            "line": {
                "id": line["id"] if line else None,
                "item_id": data["itemId"],
                "qty": str(qty),
                "rate": str(rate),
                "tax_percent": str(tax_percent),
                "amount": str(subtotal),
            },
            "totals": {
                "subtotal": str(subtotal),
                "gst_amount": str(gst_amount),
                "total_amount": str(total_amount),
            },
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


@router.delete("/{invoice_id}")
def delete_tax_invoice(invoice_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "SELECT id, invoice_no FROM tax_invoices WHERE id = %s",
            (invoice_id,),
        )
        invoice = cursor.fetchone()
        if invoice is None:
            raise HTTPException(status_code=404, detail="Tax invoice not found")

        cursor.execute(
            "DELETE FROM tax_invoice_items WHERE tax_invoice_id = %s",
            (invoice_id,),
        )
        cursor.execute(
            "DELETE FROM tax_invoices WHERE id = %s",
            (invoice_id,),
        )
        connection.commit()

        return {
            "message": "Tax invoice deleted successfully",
            "invoice": invoice,
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
