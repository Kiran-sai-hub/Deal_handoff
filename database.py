import aiosqlite
import sqlite3
import os
from datetime import datetime, timezone
from typing import Optional

DB_PATH = os.environ.get("SQLITE_DB_PATH", "data/deals.db")


async def init_db() -> None:
    """Create tables on startup."""
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS app_config (
                key        TEXT PRIMARY KEY,
                value      TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS deal_statuses (
                deal_id         TEXT PRIMARY KEY,
                client_name     TEXT NOT NULL,
                deal_value      REAL NOT NULL,
                service_type    TEXT NOT NULL,
                status          TEXT NOT NULL DEFAULT 'pending_approval',
                created_at      TEXT NOT NULL,
                updated_at      TEXT NOT NULL,
                pm_name         TEXT,
                project_url     TEXT,
                project_id      TEXT,
                invoice_id      TEXT,
                email_draft_id  TEXT,
                slack_ts        TEXT,
                slack_channel_id TEXT,
                error_details   TEXT,
                deal_snapshot   TEXT
            )
        """)
        await db.commit()


# ── Config helpers ────────────────────────────────────────────────────────────

async def get_setting(key: str) -> Optional[str]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT value FROM app_config WHERE key = ?", (key,)
        ) as cur:
            row = await cur.fetchone()
            return row[0] if row else None


async def set_setting(key: str, value: str) -> None:
    now = _now()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, ?)",
            (key, value, now),
        )
        await db.commit()


async def set_settings_bulk(settings: dict) -> None:
    now = _now()
    rows = [(k, str(v), now) for k, v in settings.items() if v is not None]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executemany(
            "INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, ?)",
            rows,
        )
        await db.commit()


async def get_all_settings() -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT key, value FROM app_config") as cur:
            rows = await cur.fetchall()
            return {row[0]: row[1] for row in rows}


async def is_setup_complete() -> bool:
    val = await get_setting("setup_complete")
    return val == "true"


# ── Deal helpers ──────────────────────────────────────────────────────────────

async def upsert_deal(deal_id: str, **fields) -> None:
    now = _now()
    fields.setdefault("created_at", now)
    fields["updated_at"] = now
    fields["deal_id"] = deal_id

    cols = ", ".join(fields.keys())
    placeholders = ", ".join("?" * len(fields))
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            f"INSERT OR REPLACE INTO deal_statuses ({cols}) VALUES ({placeholders})",
            list(fields.values()),
        )
        await db.commit()


async def update_status(deal_id: str, status: str, **extra_fields) -> None:
    now = _now()
    fields = {"status": status, "updated_at": now, **extra_fields}
    set_clause = ", ".join(f"{k} = ?" for k in fields.keys())
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            f"UPDATE deal_statuses SET {set_clause} WHERE deal_id = ?",
            [*fields.values(), deal_id],
        )
        await db.commit()


async def get_deal(deal_id: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM deal_statuses WHERE deal_id = ?", (deal_id,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def list_deals(limit: int = 50) -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM deal_statuses ORDER BY created_at DESC LIMIT ?", (limit,)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


# ── Sync helper (for use inside run_in_executor threads) ─────────────────────

def sync_get_setting(key: str) -> Optional[str]:
    """Synchronous version of get_setting for use in non-async connector code."""
    try:
        db_dir = os.path.dirname(DB_PATH)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cur = conn.execute("SELECT value FROM app_config WHERE key = ?", (key,))
        row = cur.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception:
        return None


# ── Internal ──────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
