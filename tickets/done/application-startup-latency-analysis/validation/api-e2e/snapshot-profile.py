#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()

categories: dict[str, list[Path]] = {
    "definitions": [],
    "raw_traces": [],
    "context_files": [],
    "history_and_runtime": [],
    "database": [],
    "configuration": [],
}

for parent in (root / "agents", root / "agent-teams", root / "agent-orgs"):
    if parent.exists(): categories["definitions"].extend(p for p in parent.rglob("*") if p.is_file())

memory = root / "memory"
if memory.exists():
    for item in memory.rglob("*"):
        if not item.is_file(): continue
        if item.name.startswith("raw_traces_") and item.suffix == ".jsonl": categories["raw_traces"].append(item)
        elif "context_files" in item.parts: categories["context_files"].append(item)
        else: categories["history_and_runtime"].append(item)

database = root / "db/production.db"
if database.is_file(): categories["database"].append(database)
for name in (".env",):
    item = root / name
    if item.is_file(): categories["configuration"].append(item)

def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(8 * 1024 * 1024): digest.update(chunk)
    return digest.hexdigest()

result = {"rootRedacted": True, "categories": {}}
for category, items in categories.items():
    records = []
    aggregate = hashlib.sha256()
    total = 0
    for item in sorted(set(items)):
        relative = str(item.relative_to(root))
        size = item.stat().st_size
        digest = sha256(item)
        aggregate.update(relative.encode()); aggregate.update(b"\0"); aggregate.update(str(size).encode()); aggregate.update(b"\0"); aggregate.update(digest.encode()); aggregate.update(b"\n")
        total += size
        records.append({"path": relative, "size": size, "sha256": digest})
    result["categories"][category] = {
        "fileCount": len(records),
        "bytes": total,
        "aggregateSha256": aggregate.hexdigest(),
        "files": records,
    }

output.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({k: {"fileCount": v["fileCount"], "bytes": v["bytes"], "aggregateSha256": v["aggregateSha256"]} for k, v in result["categories"].items()}, indent=2))
