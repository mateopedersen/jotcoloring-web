#!/usr/bin/env python3
"""Measure a local SQLite export; project space, never claim cloud load capacity."""
import argparse
import json
from pathlib import Path
import re
import sqlite3


def gate(current_bytes, rows, target_rows=5_000_000, growth_headroom=1.30, limit_bytes=10_000_000_000):
    if rows <= 0 or current_bytes < 0 or target_rows < rows or growth_headroom < 1:
        raise ValueError("Positive measured rows and valid growth target required")
    projected = current_bytes / rows * target_rows * growth_headroom
    ratio = projected / limit_bytes
    current_ratio = current_bytes / limit_bytes
    status = "STOP_BULK_IMPORT" if current_ratio >= .8 else "MIGRATION_READY_REQUIRED" if current_ratio >= .7 else "PLAN_MIGRATION" if current_ratio >= .6 else "CURRENT_STORAGE_BELOW_THRESHOLDS"
    return {"rows_measured": rows, "bytes_measured": current_bytes,
            "bytes_per_row_including_indexes": current_bytes / rows, "target_rows": target_rows,
            "headroom_multiplier": growth_headroom, "projected_bytes": round(projected),
            "limit_bytes_assumption": limit_bytes, "projected_limit_ratio": round(ratio, 4),
            "capacity_gate": status, "current_limit_ratio": round(current_ratio, 6),
            "target_projection_action": "MIGRATE_BEFORE_TARGET_IMPORT" if ratio >= .8 else "REVIEW_TARGET_CAPACITY" if ratio >= .6 else "SPACE_PROJECTION_ONLY", "five_million_load_test": "NOT RUN",
            "scope": "local SQLite storage projection; no D1 latency, concurrency, or traffic claim"}


def measure(path, table, target_rows):
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", table):
        raise ValueError("Invalid table identifier")
    path = Path(path).resolve()
    if not path.is_file():
        raise ValueError("Existing database export required")
    db = sqlite3.connect(path.as_uri() + "?mode=rw", uri=True)
    try:
        db.execute("PRAGMA query_only=ON")
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("SQLite integrity check failed")
        tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if table not in tables:
            raise ValueError("Canonical row table not present")
        rows = db.execute('SELECT count(*) FROM "' + table + '"').fetchone()[0]
        size = db.execute("PRAGMA page_size").fetchone()[0] * db.execute("PRAGMA page_count").fetchone()[0]
        return gate(size, rows, target_rows)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database")
    parser.add_argument("--table", required=True)
    parser.add_argument("--target-rows", type=int, default=5_000_000)
    args = parser.parse_args()
    print(json.dumps(measure(args.database, args.table, args.target_rows), indent=2))
