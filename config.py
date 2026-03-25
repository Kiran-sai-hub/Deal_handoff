"""
Bootstrap configuration — only what's needed before the SQLite DB is available.

All runtime config (API keys, tokens, tool selections) is stored in the
app_config table and accessed via database.get_setting() / set_setting().
"""
import os
from pydantic_settings import BaseSettings


class BootstrapSettings(BaseSettings):
    """Loaded from environment / .env at startup."""
    sqlite_db_path: str = "data/deals.db"
    app_base_url: str = "http://localhost:8000"

    model_config = {"env_file": ".env", "extra": "ignore"}


bootstrap = BootstrapSettings()

# Sync helper so non-async code (connectors) can read the DB path
SQLITE_DB_PATH: str = os.environ.get("SQLITE_DB_PATH", bootstrap.sqlite_db_path)
APP_BASE_URL: str = os.environ.get("APP_BASE_URL", bootstrap.app_base_url)
