import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / "ops" / (name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


backup, capacity, cost, secrets = map(module, ["backup", "capacity", "cost_model", "secret_scan"])


class OperationsTests(unittest.TestCase):
    def test_backup_restore_and_corruption(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / "export"
            source.mkdir()
            (source / "catalog.ndjson").write_text('{"id":"test-001","version":2}\n')
            (source / "objects").mkdir()
            (source / "objects" / "original.webp").write_bytes(b"test-bytes")
            made = backup.create(source, root / "snapshot", "local", "local-test", "1")
            self.assertEqual(made["files"], 2)
            restored = backup.restore(root / "snapshot", root / "restored")
            self.assertEqual(restored["status"], "PASS")
            self.assertEqual((root / "restored/objects/original.webp").read_bytes(), b"test-bytes")
            with self.assertRaises(ValueError):
                backup.restore(root / "snapshot", source)
            (root / "snapshot/objects/original.webp").write_bytes(b"corrupt")
            with self.assertRaises(ValueError):
                backup.verify(root / "snapshot")

    def test_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with self.assertRaises(ValueError):
                backup.safe_path(root, "../outside")
            with self.assertRaises(ValueError):
                backup.safe_path(root, "/absolute")
            with self.assertRaises(ValueError):
                backup.safe_path(root, "a\\b")

    def test_unmanifested_and_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / "export"
            source.mkdir()
            (source / "a").write_bytes(b"a")
            backup.create(source, root / "snapshot", "local", "local-test", "1")
            (root / "snapshot/unlisted").write_bytes(b"b")
            with self.assertRaises(ValueError):
                backup.verify(root / "snapshot")
            (source / "link").symlink_to(source / "a")
            with self.assertRaises(ValueError):
                backup.create(source, root / "symlink-snapshot", "local", "local-test", "1")

    def test_capacity_thresholds_and_no_false_pass(self):
        self.assertEqual(capacity.gate(8_000, 10, 10, 1, 10_000)["capacity_gate"], "STOP_BULK_IMPORT")
        self.assertEqual(capacity.gate(7_000, 10, 10, 1, 10_000)["capacity_gate"], "MIGRATION_READY_REQUIRED")
        self.assertEqual(capacity.gate(6_000, 10, 10, 1, 10_000)["capacity_gate"], "PLAN_MIGRATION")
        self.assertEqual(capacity.gate(5_000, 10, 10, 1, 10_000)["five_million_load_test"], "NOT RUN")
        forecast = capacity.gate(100, 10, 5_000_000, 1.3, 10_000)
        self.assertEqual(forecast["capacity_gate"], "CURRENT_STORAGE_BELOW_THRESHOLDS")
        self.assertEqual(forecast["target_projection_action"], "MIGRATE_BEFORE_TARGET_IMPORT")
        with self.assertRaises(ValueError):
            capacity.gate(100, 0)

    def test_source_scan_blocks_private_paths_without_returning_secret_values(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            token = root / "source.ts"
            value = "ghp_" + "A" * 40
            token.write_text(value)
            raw = root / "public/assets/originals/line-art.png"
            raw.parent.mkdir(parents=True)
            raw.write_bytes(b"not-a-real-image")
            found = secrets.scan([str(token), str(raw)])
            self.assertIn((str(token), "github-token"), found)
            self.assertIn((str(raw), "forbidden-private-directory"), found)
            self.assertNotIn(value, repr(found))

    def test_cost_rounding_and_backup(self):
        result = cost.estimate(5_000_000, 2_000_000)
        self.assertEqual(result["decimal_active_gb"], 10_000)
        self.assertEqual(result["monthly_known_components"]["r2_storage"], 150)
        self.assertEqual(result["one_time_import_a_gross"], 112.5)
        rounded = cost.estimate(1, 1_100_000_000, backup_multiplier=2, r2_monthly_a=1_000_001)
        self.assertEqual(rounded["monthly_known_components"]["r2_storage"], .045)
        self.assertEqual(rounded["monthly_known_components"]["r2_monthly_class_a"], 9)

    def test_d1_snapshot_retains_schema_but_excludes_private_ai_rows(self):
        prepare = module('prepare-d1-snapshot')
        db = sqlite3.connect(':memory:')
        for migration in sorted((ROOT/'migrations/catalog').glob('*.sql')):
            db.executescript(migration.read_text())
        db.execute("INSERT INTO creator_upload VALUES ('upload-one','private-owner','private-photo-path','image/png',100,'sha','uploaded','2026-10-29T00:00:00Z')")
        db.execute("INSERT INTO audit_event(id,actor,action,target_id) VALUES (9007199254740995,'fixture','test','test')")
        db.execute('DELETE FROM audit_event')
        source = ('\n'.join(db.iterdump())+'\n').encode()
        db.close()
        with tempfile.TemporaryDirectory() as folder:
            result = prepare.prepare(source, folder)
            sql = (Path(folder)/'catalog.sql').read_text()
            self.assertNotIn('private-owner', sql)
            self.assertNotIn('private-photo-path', sql)
            self.assertEqual(result['excluded_private_rows']['creator_upload'], 1)
            self.assertEqual(result['tables']['creator_upload']['rows'], 0)
            self.assertEqual(result['tables']['category']['rows'], 15)
            restored=sqlite3.connect(':memory:');restored.execute('PRAGMA foreign_keys=ON');restored.executescript(sql)
            self.assertEqual(restored.execute('SELECT COUNT(*) FROM creator_upload').fetchone()[0],0)
            self.assertEqual(restored.execute('SELECT COUNT(*) FROM category').fetchone()[0],15)
            self.assertEqual(restored.execute("SELECT seq FROM sqlite_sequence WHERE name='audit_event'").fetchone()[0],9007199254740995)
            self.assertIn({'name':'audit_event','seq':'9007199254740995'},result['autoincrement_sequences'])
            self.assertIsNone(restored.execute('PRAGMA foreign_key_check').fetchone())
            restored.close()
            with self.assertRaises(ValueError):prepare.prepare(source,folder)
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(sqlite3.DatabaseError):prepare.prepare(b"ATTACH DATABASE '/tmp/should-not-create.sqlite' AS other;",folder)


if __name__ == "__main__":
    unittest.main()
