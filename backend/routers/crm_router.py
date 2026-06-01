from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from psycopg2.extras import Json, RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


ENTITY_CONFIG = {
    "leads": {
        "table": "crm_leads",
        "number_column": "lead_no",
        "prefix": "LED",
        "date_column": "lead_date",
        "fields": [
            "lead_no", "lead_date", "customer_id", "company_name", "contact_person", "phone", "email",
            "source", "stage", "priority", "assigned_to", "expected_value",
            "next_followup_date", "remarks", "status", "todos", "history", "activities", "products",
            "transactions", "attachments",
        ],
        "search_columns": ["lead_no", "company_name", "contact_person", "phone", "email", "stage", "status"],
    },
    "enquiries": {
        "table": "crm_enquiries",
        "number_column": "enquiry_no",
        "prefix": "ENQ",
        "date_column": "enquiry_date",
        "fields": [
            "enquiry_no", "enquiry_date", "lead_id", "customer_id", "customer_name", "contact_person",
            "phone", "email", "requirement", "estimated_value", "assigned_to",
            "status", "remarks", "todos", "history", "activities", "products", "transactions", "attachments",
        ],
        "search_columns": ["enquiry_no", "customer_name", "contact_person", "phone", "email", "status"],
    },
    "quotations": {
        "table": "crm_quotations",
        "number_column": "quotation_no",
        "prefix": "QUO",
        "date_column": "quotation_date",
        "fields": [
            "quotation_no", "quotation_date", "enquiry_id", "customer_id", "customer_name", "subject",
            "subtotal", "tax_amount", "total_amount", "valid_until", "status", "remarks",
            "todos", "history", "activities", "products", "transactions", "attachments",
        ],
        "search_columns": ["quotation_no", "customer_name", "subject", "status"],
    },
    "campaigns": {
        "table": "crm_campaigns",
        "number_column": "campaign_no",
        "prefix": "CMP",
        "date_column": "start_date",
        "fields": [
            "campaign_no", "campaign_name", "campaign_type", "start_date", "end_date",
            "budget", "status", "target_audience", "remarks",
        ],
        "search_columns": ["campaign_no", "campaign_name", "campaign_type", "status"],
    },
    "contacts": {
        "table": "crm_contacts",
        "number_column": "contact_no",
        "prefix": "CON",
        "date_column": "created_at",
        "fields": [
            "contact_no", "customer_id", "contact_name", "company_name", "phone", "email",
            "designation", "city", "state", "source", "status", "remarks", "todos", "history", "activities",
            "attachments",
        ],
        "search_columns": ["contact_no", "contact_name", "company_name", "phone", "email", "status"],
    },
}


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _entity_or_404(entity: str) -> Dict[str, Any]:
    config = ENTITY_CONFIG.get(entity)
    if not config:
        raise HTTPException(status_code=404, detail="CRM module not found")
    return config


def _clean_value(value: Any):
    if value == "":
        return None
    return value


def _ensure_crm_tables(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS crm_leads (
            id BIGSERIAL PRIMARY KEY,
            lead_no VARCHAR(50) NOT NULL UNIQUE,
            lead_date DATE DEFAULT CURRENT_DATE,
            customer_id BIGINT,
            company_name VARCHAR(200) NOT NULL,
            contact_person VARCHAR(150),
            phone VARCHAR(40),
            email VARCHAR(150),
            source VARCHAR(100),
            stage VARCHAR(80) DEFAULT 'New',
            priority VARCHAR(30) DEFAULT 'Medium',
            assigned_to VARCHAR(150),
            expected_value NUMERIC(14,2) DEFAULT 0,
            next_followup_date DATE,
            remarks TEXT,
            status VARCHAR(40) DEFAULT 'Open',
            todos JSONB DEFAULT '[]'::JSONB,
            history JSONB DEFAULT '[]'::JSONB,
            activities JSONB DEFAULT '[]'::JSONB,
            products JSONB DEFAULT '[]'::JSONB,
            transactions JSONB DEFAULT '[]'::JSONB,
            attachments JSONB DEFAULT '[]'::JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS crm_enquiries (
            id BIGSERIAL PRIMARY KEY,
            enquiry_no VARCHAR(50) NOT NULL UNIQUE,
            enquiry_date DATE DEFAULT CURRENT_DATE,
            lead_id BIGINT,
            customer_id BIGINT,
            customer_name VARCHAR(200) NOT NULL,
            contact_person VARCHAR(150),
            phone VARCHAR(40),
            email VARCHAR(150),
            requirement TEXT,
            estimated_value NUMERIC(14,2) DEFAULT 0,
            assigned_to VARCHAR(150),
            status VARCHAR(40) DEFAULT 'Open',
            remarks TEXT,
            todos JSONB DEFAULT '[]'::JSONB,
            history JSONB DEFAULT '[]'::JSONB,
            activities JSONB DEFAULT '[]'::JSONB,
            products JSONB DEFAULT '[]'::JSONB,
            transactions JSONB DEFAULT '[]'::JSONB,
            attachments JSONB DEFAULT '[]'::JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS crm_quotations (
            id BIGSERIAL PRIMARY KEY,
            quotation_no VARCHAR(50) NOT NULL UNIQUE,
            quotation_date DATE DEFAULT CURRENT_DATE,
            enquiry_id BIGINT,
            customer_id BIGINT,
            customer_name VARCHAR(200) NOT NULL,
            subject VARCHAR(250),
            subtotal NUMERIC(14,2) DEFAULT 0,
            tax_amount NUMERIC(14,2) DEFAULT 0,
            total_amount NUMERIC(14,2) DEFAULT 0,
            valid_until DATE,
            status VARCHAR(40) DEFAULT 'Draft',
            remarks TEXT,
            todos JSONB DEFAULT '[]'::JSONB,
            history JSONB DEFAULT '[]'::JSONB,
            activities JSONB DEFAULT '[]'::JSONB,
            products JSONB DEFAULT '[]'::JSONB,
            transactions JSONB DEFAULT '[]'::JSONB,
            attachments JSONB DEFAULT '[]'::JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS crm_campaigns (
            id BIGSERIAL PRIMARY KEY,
            campaign_no VARCHAR(50) NOT NULL UNIQUE,
            campaign_name VARCHAR(200) NOT NULL,
            campaign_type VARCHAR(80),
            start_date DATE DEFAULT CURRENT_DATE,
            end_date DATE,
            budget NUMERIC(14,2) DEFAULT 0,
            status VARCHAR(40) DEFAULT 'Planned',
            target_audience TEXT,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS crm_contacts (
            id BIGSERIAL PRIMARY KEY,
            contact_no VARCHAR(50) NOT NULL UNIQUE,
            customer_id BIGINT,
            contact_name VARCHAR(150) NOT NULL,
            company_name VARCHAR(200),
            phone VARCHAR(40),
            email VARCHAR(150),
            designation VARCHAR(120),
            city VARCHAR(100),
            state VARCHAR(100),
            source VARCHAR(100),
            status VARCHAR(40) DEFAULT 'Active',
            remarks TEXT,
            todos JSONB DEFAULT '[]'::JSONB,
            history JSONB DEFAULT '[]'::JSONB,
            activities JSONB DEFAULT '[]'::JSONB,
            attachments JSONB DEFAULT '[]'::JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    for table in ["crm_leads", "crm_enquiries", "crm_quotations", "crm_contacts"]:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS customer_id BIGINT")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS todos JSONB DEFAULT '[]'::JSONB")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::JSONB")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]'::JSONB")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::JSONB")
    for table in ["crm_leads", "crm_enquiries", "crm_quotations"]:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::JSONB")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS transactions JSONB DEFAULT '[]'::JSONB")


def _fetch_customer(cursor, customer_id):
    if not customer_id:
        return None
    cursor.execute(
        """
        SELECT
            id,
            customer_code,
            customer_name,
            print_name,
            phone,
            mobile,
            email,
            city,
            state,
            gstin,
            contacts
        FROM customers
        WHERE id = %s
        """,
        (customer_id,),
    )
    customer = cursor.fetchone()
    if customer is None:
        raise HTTPException(status_code=404, detail="Selected ERP customer not found")
    return customer


def _first_contact_name(customer):
    contacts = customer.get("contacts") if customer else None
    if isinstance(contacts, list) and contacts:
        return contacts[0].get("name") or ""
    return ""


def _apply_customer_master(cursor, entity: str, data: Dict[str, Any]):
    customer = _fetch_customer(cursor, data.get("customer_id"))
    if customer is None:
        return data

    customer_name = customer["customer_name"]
    contact_name = _first_contact_name(customer)
    phone = customer["mobile"] or customer["phone"]
    email = customer["email"]

    if entity == "leads":
        data["company_name"] = customer_name
        data["contact_person"] = data.get("contact_person") or contact_name
        data["phone"] = data.get("phone") or phone
        data["email"] = data.get("email") or email
    elif entity in ["enquiries", "quotations"]:
        data["customer_name"] = customer_name
        if entity == "enquiries":
            data["contact_person"] = data.get("contact_person") or contact_name
            data["phone"] = data.get("phone") or phone
            data["email"] = data.get("email") or email
    elif entity == "contacts":
        data["company_name"] = customer_name
        data["contact_name"] = data.get("contact_name") or contact_name or customer_name
        data["phone"] = data.get("phone") or phone
        data["email"] = data.get("email") or email
        data["city"] = data.get("city") or customer["city"]
        data["state"] = data.get("state") or customer["state"]
    return data


def _next_number(cursor, config):
    number_column = config["number_column"]
    table = config["table"]
    prefix = config["prefix"]
    cursor.execute(
        f"""
        SELECT {number_column}
        FROM {table}
        WHERE {number_column} LIKE %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (f"{prefix}-%",),
    )
    row = cursor.fetchone()
    next_id = 1
    if row and row.get(number_column):
        try:
            next_id = int(str(row[number_column]).split("-")[-1]) + 1
        except ValueError:
            next_id = 1
    return f"{prefix}-{date.today().year}-{next_id:04d}"


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


def _db_value(value):
    if isinstance(value, (list, dict)):
        return Json(value)
    return value


def _validate_required(entity: str, payload: Dict[str, Any]):
    required_map = {
        "leads": ["company_name"],
        "enquiries": ["customer_name"],
        "quotations": ["customer_name"],
        "campaigns": ["campaign_name"],
        "contacts": ["contact_name"],
    }
    missing = [field for field in required_map[entity] if not payload.get(field)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Required field missing: {', '.join(missing)}")


@router.get("/summary")
def get_crm_summary():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_crm_tables(cursor)
        summary = {}
        for entity, config in ENTITY_CONFIG.items():
            cursor.execute(f"SELECT COUNT(*) AS total FROM {config['table']}")
            summary[entity] = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT lead_no AS number, company_name AS name, stage, status, created_at
            FROM crm_leads
            ORDER BY id DESC
            LIMIT 5
            """
        )
        recent_leads = [_serialize(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT quotation_no AS number, customer_name AS name, total_amount, status, created_at
            FROM crm_quotations
            ORDER BY id DESC
            LIMIT 5
            """
        )
        recent_quotations = [_serialize(row) for row in cursor.fetchall()]
        return {
            "summary": summary,
            "recent_leads": recent_leads,
            "recent_quotations": recent_quotations,
            "notifications": _collect_followup_notifications(cursor),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


def _collect_followup_notifications(cursor):
    notifications = []
    sources = [
        ("leads", "crm_leads", "lead_no", "company_name"),
        ("enquiries", "crm_enquiries", "enquiry_no", "customer_name"),
        ("quotations", "crm_quotations", "quotation_no", "customer_name"),
        ("contacts", "crm_contacts", "contact_no", "contact_name"),
    ]
    today_value = date.today()
    upcoming_value = today_value + timedelta(days=7)

    for entity, table, number_column, name_column in sources:
        cursor.execute(
            f"""
            SELECT id, {number_column} AS number, {name_column} AS name, activities
            FROM {table}
            WHERE activities IS NOT NULL
            ORDER BY id DESC
            LIMIT 100
            """
        )
        for row in cursor.fetchall():
            activities = row.get("activities") or []
            if not isinstance(activities, list):
                continue
            for activity in activities:
                if not activity.get("followup"):
                    continue
                followup_date = activity.get("followup_date")
                if not followup_date:
                    continue
                try:
                    parsed_date = date.fromisoformat(str(followup_date)[:10])
                except ValueError:
                    continue
                if parsed_date <= upcoming_value:
                    notifications.append({
                        "entity": entity,
                        "record_id": row["id"],
                        "number": row["number"],
                        "name": row["name"],
                        "followup_date": parsed_date.isoformat(),
                        "task": activity.get("followup_task") or activity.get("task_name") or "Follow-up",
                        "to": activity.get("followup_to") or activity.get("employee") or "",
                        "status": "Overdue" if parsed_date < today_value else "Upcoming",
                    })

    return sorted(notifications, key=lambda item: item["followup_date"])[:20]


@router.get("/notifications/followups")
def get_crm_followup_notifications():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_crm_tables(cursor)
        return {"notifications": _collect_followup_notifications(cursor)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/customer/{customer_id}/links")
def get_customer_crm_links(customer_id: int):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_crm_tables(cursor)
        customer = _fetch_customer(cursor, customer_id)

        cursor.execute(
            """
            SELECT id, lead_no AS number, lead_date AS record_date, company_name AS name, stage, status
            FROM crm_leads
            WHERE customer_id = %s
            ORDER BY id DESC
            """,
            (customer_id,),
        )
        leads = [_serialize(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT id, enquiry_no AS number, enquiry_date AS record_date, customer_name AS name, status
            FROM crm_enquiries
            WHERE customer_id = %s
            ORDER BY id DESC
            """,
            (customer_id,),
        )
        enquiries = [_serialize(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT id, quotation_no AS number, quotation_date AS record_date, customer_name AS name, status, total_amount
            FROM crm_quotations
            WHERE customer_id = %s
            ORDER BY id DESC
            """,
            (customer_id,),
        )
        quotations = [_serialize(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT id, contact_no AS number, created_at AS record_date, contact_name AS name, status
            FROM crm_contacts
            WHERE customer_id = %s
            ORDER BY id DESC
            """,
            (customer_id,),
        )
        contacts = [_serialize(row) for row in cursor.fetchall()]

        return {
            "customer": _serialize(customer),
            "links": {
                "leads": leads,
                "enquiries": enquiries,
                "quotations": quotations,
                "contacts": contacts,
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/{entity}/next-number")
def get_next_crm_number(entity: str):
    config = _entity_or_404(entity)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_crm_tables(cursor)
        return {"next_number": _next_number(cursor, config)}
    finally:
        cursor.close()
        connection.close()


@router.get("/{entity}")
def list_crm_records(entity: str, q: str = ""):
    config = _entity_or_404(entity)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_crm_tables(cursor)
        where = ""
        params: List[Any] = []
        if q:
            search_sql = " OR ".join([f"COALESCE({column}::TEXT, '') ILIKE %s" for column in config["search_columns"]])
            where = f"WHERE {search_sql}"
            params = [f"%{q}%"] * len(config["search_columns"])

        cursor.execute(
            f"""
            SELECT *
            FROM {config['table']}
            {where}
            ORDER BY id DESC
            """,
            params,
        )
        return [_serialize(row) for row in cursor.fetchall()]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/{entity}/{record_id}")
def get_crm_record(entity: str, record_id: int):
    config = _entity_or_404(entity)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_crm_tables(cursor)
        cursor.execute(f"SELECT * FROM {config['table']} WHERE id = %s", (record_id,))
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="CRM record not found")
        return _serialize(row)
    finally:
        cursor.close()
        connection.close()


@router.post("/{entity}")
def create_crm_record(entity: str, payload: Dict[str, Any]):
    config = _entity_or_404(entity)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_crm_tables(cursor)
        data = {field: _clean_value(payload.get(field)) for field in config["fields"]}
        if not data.get(config["number_column"]):
            data[config["number_column"]] = _next_number(cursor, config)
        data = _apply_customer_master(cursor, entity, data)
        _validate_required(entity, data)

        columns = list(data.keys())
        placeholders = ", ".join(["%s"] * len(columns))
        cursor.execute(
            f"""
            INSERT INTO {config['table']} ({", ".join(columns)})
            VALUES ({placeholders})
            RETURNING *
            """,
            [_db_value(data[column]) for column in columns],
        )
        record = _serialize(cursor.fetchone())
        connection.commit()
        return {"message": "CRM record created successfully", "record": record}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.put("/{entity}/{record_id}")
def update_crm_record(entity: str, record_id: int, payload: Dict[str, Any]):
    config = _entity_or_404(entity)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_crm_tables(cursor)
        data = {field: _clean_value(payload.get(field)) for field in config["fields"] if field in payload}
        data = _apply_customer_master(cursor, entity, data)
        _validate_required(entity, {**payload, **data})
        if not data:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_sql = ", ".join([f"{field} = %s" for field in data.keys()])
        cursor.execute(
            f"""
            UPDATE {config['table']}
            SET {set_sql}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *
            """,
            [*[_db_value(value) for value in data.values()], record_id],
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="CRM record not found")
        connection.commit()
        return {"message": "CRM record updated successfully", "record": _serialize(row)}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.delete("/{entity}/{record_id}")
def delete_crm_record(entity: str, record_id: int):
    config = _entity_or_404(entity)
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    try:
        _ensure_crm_tables(cursor)
        cursor.execute(f"DELETE FROM {config['table']} WHERE id = %s RETURNING id", (record_id,))
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="CRM record not found")
        connection.commit()
        return {"message": "CRM record deleted successfully"}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
