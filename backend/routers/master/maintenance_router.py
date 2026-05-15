from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database.db_connection import get_connection

router = APIRouter()


class RackPayload(BaseModel):
    rackCode: str
    rackName: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[str] = None
    isActive: Optional[bool] = True


class BinPayload(BaseModel):
    binCode: str
    binName: Optional[str] = None
    rackId: Optional[int] = None
    location: Optional[str] = None
    isActive: Optional[bool] = True


def _connection_or_500():
    connection = get_connection()
    if connection is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    return connection


def _ensure_tables(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS maintenance_racks (
            id BIGSERIAL PRIMARY KEY,
            rack_code VARCHAR(50) NOT NULL UNIQUE,
            rack_name VARCHAR(150) NOT NULL,
            location VARCHAR(150),
            capacity VARCHAR(50),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS maintenance_bins (
            id BIGSERIAL PRIMARY KEY,
            bin_code VARCHAR(50) NOT NULL UNIQUE,
            bin_name VARCHAR(150) NOT NULL,
            rack_id BIGINT REFERENCES maintenance_racks(id) ON DELETE SET NULL,
            location VARCHAR(150),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute("SELECT COUNT(*) AS count FROM maintenance_racks")
    if int(cursor.fetchone()["count"] or 0) == 0:
        defaults = [
            ("STORE-1", "Store 1", "Main Store"),
            ("STORE-2", "Store 2", "Main Store"),
            ("STORE-3", "Store 3", "Main Store"),
            ("REJECTION", "Rejection Store", "Quality"),
            ("INSPECTION", "Inspection Hold", "Quality"),
        ]
        cursor.executemany(
            """
            INSERT INTO maintenance_racks (rack_code, rack_name, location, is_active)
            VALUES (%s, %s, %s, TRUE)
            ON CONFLICT (rack_code) DO NOTHING
            """,
            defaults,
        )


def _rack_row(row):
    return {
        "id": row["id"],
        "rackCode": row["rack_code"],
        "rackName": row["rack_name"],
        "location": row["location"],
        "capacity": row["capacity"],
        "isActive": row["is_active"],
        "createdAt": row["created_at"],
    }


def _bin_row(row):
    return {
        "id": row["id"],
        "binCode": row["bin_code"],
        "binName": row["bin_name"],
        "rackId": row["rack_id"],
        "rackName": row.get("rack_name"),
        "location": row["location"],
        "isActive": row["is_active"],
        "createdAt": row["created_at"],
    }


@router.get("/")
def list_maintenance():
    return {"message": "Maintenance master is running"}


@router.get("/racks")
def list_racks():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_tables(cursor)
        connection.commit()
        cursor.execute(
            """
            SELECT id, rack_code, rack_name, location, capacity, is_active, created_at
            FROM maintenance_racks
            ORDER BY id ASC
            """
        )
        return [_rack_row(row) for row in cursor.fetchall()]
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/racks")
def create_rack(payload: RackPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_tables(cursor)
        rack_name = data["rackName"] or data["rackCode"]
        cursor.execute(
            """
            INSERT INTO maintenance_racks (
                rack_code, rack_name, location, capacity, is_active
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, rack_code, rack_name, location, capacity, is_active, created_at
            """,
            (
                data["rackCode"],
                rack_name,
                data["location"],
                data["capacity"],
                data["isActive"],
            ),
        )
        row = cursor.fetchone()
        connection.commit()
        return {"message": "Rack created successfully", "rack": _rack_row(row)}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.get("/bins")
def list_bins():
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        _ensure_tables(cursor)
        connection.commit()
        cursor.execute(
            """
            SELECT
                b.id,
                b.bin_code,
                b.bin_name,
                b.rack_id,
                r.rack_name,
                b.location,
                b.is_active,
                b.created_at
            FROM maintenance_bins b
            LEFT JOIN maintenance_racks r ON r.id = b.rack_id
            ORDER BY b.id ASC
            """
        )
        return [_bin_row(row) for row in cursor.fetchall()]
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()


@router.post("/bins")
def create_bin(payload: BinPayload):
    connection = _connection_or_500()
    cursor = connection.cursor(cursor_factory=RealDictCursor)
    data = payload.model_dump()

    try:
        _ensure_tables(cursor)
        bin_name = data["binName"] or data["binCode"]
        cursor.execute(
            """
            INSERT INTO maintenance_bins (
                bin_code, bin_name, rack_id, location, is_active
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, bin_code, bin_name, rack_id, location, is_active, created_at
            """,
            (
                data["binCode"],
                bin_name,
                data["rackId"],
                data["location"],
                data["isActive"],
            ),
        )
        row = cursor.fetchone()
        connection.commit()
        return {"message": "Bin created successfully", "bin": _bin_row(row)}
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cursor.close()
        connection.close()
