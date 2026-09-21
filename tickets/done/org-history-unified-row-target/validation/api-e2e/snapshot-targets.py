#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, sys

root = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2])
targets = {
    'database': root / 'db/production.db',
    'stoppedOrg': root / 'memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e',
    'teamComparator': root / 'memory/agent_teams/software_engineering_team_4dab4182f72849b989494754ad79f03a',
}

def hash_file(path: Path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        while chunk := handle.read(8 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()

def snapshot(path: Path):
    if path.is_file():
        return {'kind': 'file', 'size': path.stat().st_size, 'sha256': hash_file(path)}
    rows, aggregate, total = [], hashlib.sha256(), 0
    for file in sorted(item for item in path.rglob('*') if item.is_file()):
        rel, size, sha = str(file.relative_to(path)), file.stat().st_size, hash_file(file)
        total += size
        aggregate.update(rel.encode() + b'\0' + str(size).encode() + b'\0' + sha.encode() + b'\n')
        rows.append({'path': rel, 'size': size, 'sha256': sha})
    return {'kind': 'tree', 'fileCount': len(rows), 'bytes': total,
            'aggregateSha256': aggregate.hexdigest(), 'files': rows}

result = {name: snapshot(path) for name, path in targets.items()}
out.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({name: {key: value for key, value in data.items() if key != 'files'}
                  for name, data in result.items()}, indent=2))
