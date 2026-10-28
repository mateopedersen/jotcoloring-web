#!/usr/bin/env python3
"""Checksum a local export and rehearse a restore into a NEW directory.

This intentionally never connects to production or overwrites a restore target.
Cloud export and separate-permission R2 backup replication are separate steps.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import tempfile
from datetime import datetime, timezone

MANIFEST = "snapshot-manifest.json"


def digest(path):
    result = hashlib.sha256()
    size = 0
    with open(path, "rb") as stream:
        while chunk := stream.read(1024 * 1024):
            result.update(chunk)
            size += len(chunk)
    return result.hexdigest(), size


def safe_path(root, value):
    name = PurePosixPath(value)
    if not value or name.is_absolute() or ".." in name.parts or "\\" in value:
        raise ValueError("Unsafe snapshot path")
    path = root
    for part in name.parts:
        path = path / part
        if path.is_symlink():
            raise ValueError("Snapshot symlinks are not accepted")
    if root.resolve() not in path.resolve().parents:
        raise ValueError("Snapshot path escapes root")
    return path


def files(root):
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise ValueError("Snapshot symlinks are not accepted")
        if path.is_file() and path.name != MANIFEST:
            yield path


def create(source, destination, environment, code_commit, schema_version):
    source, destination = Path(source).resolve(), Path(destination).absolute()
    if not source.is_dir():
        raise ValueError("Export source must be an existing directory")
    if destination.exists() or source == destination or source in destination.parents:
        raise ValueError("Snapshot destination must be new and outside export source")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=".snapshot-", dir=destination.parent))
    try:
        entries = []
        for path in files(source):
            relative = path.relative_to(source).as_posix()
            target = safe_path(temporary, relative)
            target.parent.mkdir(parents=True, exist_ok=True)
            before = digest(path)
            shutil.copyfile(path, target)
            after = digest(target)
            if before != after or digest(path) != before:
                raise ValueError("Export changed while copying; retry with a frozen export")
            entries.append({"path": relative, "sha256": after[0], "bytes": after[1]})
        if not entries:
            raise ValueError("Refusing empty snapshot")
        manifest = {"schema": "jotcoloring-snapshot/1", "created_at": datetime.now(timezone.utc).isoformat(),
                    "source_environment": environment, "code_commit": code_commit,
                    "catalog_schema_version": schema_version, "files": entries}
        (temporary / MANIFEST).write_text(json.dumps(manifest, indent=2) + "\n")
        verify(temporary)
        # Atomic rename on the same filesystem, while refusing a preexisting target.
        if destination.exists():
            raise ValueError("Snapshot destination appeared during creation")
        temporary.rename(destination)
        return {"status": "PASS", "files": len(entries), "bytes": sum(e["bytes"] for e in entries)}
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)


def verify(snapshot):
    root = Path(snapshot).resolve()
    manifest = json.loads((root / MANIFEST).read_text())
    if manifest.get("schema") != "jotcoloring-snapshot/1" or not manifest.get("files"):
        raise ValueError("Unsupported or empty snapshot")
    expected = set()
    for item in manifest["files"]:
        path = safe_path(root, item["path"])
        if item["path"] in expected or not path.is_file():
            raise ValueError("Duplicate or missing snapshot file")
        expected.add(item["path"])
        if digest(path) != (item["sha256"], item["bytes"]):
            raise ValueError("Snapshot checksum or byte count mismatch: " + item["path"])
    actual = {p.relative_to(root).as_posix() for p in files(root)}
    if actual != expected:
        raise ValueError("Unmanifested files in snapshot")
    return manifest


def restore(snapshot, destination):
    manifest = verify(snapshot)
    root, destination = Path(snapshot).resolve(), Path(destination).absolute()
    if destination.exists() or root == destination or root in destination.parents:
        raise ValueError("Restore destination must be a new isolated directory")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=".restore-", dir=destination.parent))
    try:
        for item in manifest["files"]:
            target = safe_path(temporary, item["path"])
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(safe_path(root, item["path"]), target)
        shutil.copyfile(root / MANIFEST, temporary / MANIFEST)
        verify(temporary)
        if destination.exists():
            raise ValueError("Restore destination appeared during copy")
        temporary.rename(destination)
        return {"status": "PASS", "files": len(manifest["files"]), "scope": "local isolated bytes restore"}
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    make = sub.add_parser("create")
    make.add_argument("source")
    make.add_argument("destination")
    make.add_argument("--environment", required=True, choices=["local", "preview", "staging", "production"])
    make.add_argument("--commit", required=True)
    make.add_argument("--schema-version", required=True)
    check = sub.add_parser("verify")
    check.add_argument("snapshot")
    recover = sub.add_parser("restore")
    recover.add_argument("snapshot")
    recover.add_argument("destination")
    args = parser.parse_args()
    if args.command == "create":
        result = create(args.source, args.destination, args.environment, args.commit, args.schema_version)
    elif args.command == "verify":
        manifest = verify(args.snapshot)
        result = {"status": "PASS", "files": len(manifest["files"])}
    else:
        result = restore(args.snapshot, args.destination)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
