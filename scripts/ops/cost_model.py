#!/usr/bin/env python3
"""Explicit assumption model, not an account invoice or measured traffic result."""
import argparse
import json
import math


def estimate(items, bytes_per_item, objects_per_item=5, backup_multiplier=1, revision_multiplier=1,
             r2_available_gb=0, r2_available_a=0, r2_available_b=0,
             worker_requests=0, worker_cpu_ms=0, r2_monthly_a=0, r2_monthly_b=0,
             worker_available_requests=0, worker_available_cpu_ms=0):
    values = locals().copy()
    if any(not isinstance(v, (int, float)) or v < 0 for v in values.values()):
        raise ValueError("All cost inputs must be explicit nonnegative numbers")
    if backup_multiplier < 1 or revision_multiplier < 1:
        raise ValueError("Multipliers include active copy and must be at least 1")
    active_gb = items * bytes_per_item / 1_000_000_000
    retained_gb = active_gb * backup_multiplier * revision_multiplier
    costs = {
        "zone_plan": 0,
        "new_workers_subscription": 0,
        "r2_storage": math.ceil(max(0, retained_gb - r2_available_gb)) * .015,
        "r2_monthly_class_a": math.ceil(max(0, r2_monthly_a - r2_available_a) / 1_000_000) * 4.5,
        "r2_monthly_class_b": math.ceil(max(0, r2_monthly_b - r2_available_b) / 1_000_000) * .36,
        "workers_requests": max(0, worker_requests - worker_available_requests) / 1_000_000 * .30,
        "workers_cpu": max(0, worker_cpu_ms - worker_available_cpu_ms) / 1_000_000 * .02,
    }
    return {"kind": "assumption_projection", "authorization": "zone_free_existing_paid_workers_and_r2",
            "free_tier_capacity": "EXCEEDS_R2_FREE_STORAGE" if retained_gb > 10 else "VERIFY_SHARED_REMAINING_ALLOWANCE",
            "currency": "USD", "tax_included": False,
            "price_checked_on": "2026-10-28", "inputs": values,
            "decimal_active_gb": active_gb, "decimal_retained_gb": retained_gb,
            "monthly_known_components": {k: round(v, 3) for k, v in costs.items()},
            "variable_usage_projection": round(sum(costs.values()), 3),
            "one_time_simple_puts": items * objects_per_item,
            "one_time_import_a_gross": math.ceil(items * objects_per_item / 1_000_000) * 4.5,
            "excluded_unpriced_components": ["D1 reads/writes/storage", "Queues", "AI", "image conversion", "builds", "logs", "external database", "tax"],
            "account_shared_allowance": "Defaults to zero remaining; fill only after account verification",
            "notes": "Latest owner clarification: existing paid Workers and R2, domain Free. Existing paid Workers and R2 are authorized; zone stays Free. AI budget remains separately unset. Usage amounts are projections, not measured bills. Shared subscriptions must not be changed. R2 rounds up billing units; storage uses daily peak average. Constant monthly storage assumed."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bytes-per-item", type=int, default=2_000_000)
    parser.add_argument("--backup-multiplier", type=float, default=1)
    parser.add_argument("--revision-multiplier", type=float, default=1)
    args = parser.parse_args()
    print(json.dumps({"sources": ["https://www.cloudflare.com/plans/", "https://developers.cloudflare.com/workers/platform/pricing/", "https://developers.cloudflare.com/r2/pricing/"],
                      "scenarios": [estimate(n, args.bytes_per_item, backup_multiplier=args.backup_multiplier, revision_multiplier=args.revision_multiplier) for n in [10_000, 100_000, 1_000_000, 5_000_000]]}, indent=2))
