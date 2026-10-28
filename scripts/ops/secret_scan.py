#!/usr/bin/env python3
"""Scan tracked source bytes without printing matched secret values."""
import argparse
import re
import subprocess
from pathlib import Path
import sys

PATTERNS = [
    ("private-key", re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("github-token", re.compile(rb"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})")),
    ("openai-key", re.compile(rb"sk-(?:proj-)?[A-Za-z0-9_-]{40,}")),
    ("aws-key", re.compile(rb"AKIA[A-Z0-9]{16}")),
    ("local-personal-path", re.compile(rb"/" + rb"Users/[A-Za-z0-9._-]+/")),
    ("credential-url", re.compile(rb"(?:postgres(?:ql)?|mysql)://[^\s:/]+:[^\s@]+@")),
]
PRIVATE_DIRECTORIES = re.compile(r"(?:^|/)(?:\.local|\.wrangler|browser-profile|private|backups|exports)(?:/|$)|(?:^|/)public/assets/(?:originals|colors)/")
FORBIDDEN = re.compile(r"(?:^|/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|cookies\.json|storage-state\.json|.*\.(?:pem|key|p12|pfx|db|sqlite3?|dump|zip))$")


def scan(paths):
    issues = []
    for value in paths:
        path = Path(value)
        if not path.is_file():
            continue
        if PRIVATE_DIRECTORIES.search(value):
            issues.append((value, "forbidden-private-directory"))
        if FORBIDDEN.search(value) and path.name not in (".env.example", ".dev.vars.example"):
            issues.append((value, "forbidden-private-file"))
        data = path.read_bytes()
        for name, pattern in PATTERNS:
            if pattern.search(data):
                issues.append((value, name))
    return issues


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--working-tree", action="store_true", help="Before Git initialization, scan candidate files respecting .gitignore; not a tracked-file proof")
    args = parser.parse_args()
    command = ["rg", "--files", "--hidden", "--no-require-git", "-g", "!.git", "-0"] if args.working_tree else ["git", "ls-files", "-z"]
    result = subprocess.run(command, check=True, capture_output=True)
    paths = [p for p in result.stdout.decode().split("\0") if p]
    if not paths:
        raise SystemExit("No source files; cannot claim a repository secret scan")
    scope = "candidate working-tree" if args.working_tree else "tracked"
    findings = scan(paths)
    for path, rule in findings:
        print(f"FAIL {rule}: {path}")
    print(f"{'FAIL' if findings else 'PASS'}: {len(paths)} {scope} files; pattern scan is not a complete secret audit")
    sys.exit(bool(findings))
