"""Read only the named migration record, never run/reset a migration.
No DB/env/key/raw trace contents are emitted. Nonempty WAL is an unavailable
observation, not permission to ignore it or checkpoint a live database.
"""
import hashlib
import json
from pathlib import Path
import sqlite3

ROOTS = [
    '/home/autobyteus/data', '/root/.autobyteus/server-data',
    '/home/vncuser/.autobyteus/server-data',
    '/tmp/autobyteus-dr008-user-test-20260911/server-data',
    '/tmp/autobyteus-dr009-user-test-20260911/server-data',
]
for root in ROOTS:
    db = Path(root) / 'db/production.db'
    item = {'appDataRoot': root, 'databaseExists': db.exists()}
    wal = Path(str(db) + '-wal')
    item['walBytes'] = wal.stat().st_size if wal.exists() else 0
    if db.exists() and not item['walBytes']:
        before = hashlib.sha256(db.read_bytes()).hexdigest()
        connection = sqlite3.connect(f'file:{db}?mode=ro&immutable=1', uri=True)
        try:
            row = connection.execute(
                'SELECT migration_id,status,attempts,completed_at,summary '
                'FROM app_data_migration_records WHERE migration_id=?',
                ('20260901_agent_org_flat_team_families_v1',),
            ).fetchone()
            item['record'] = dict(zip(['migrationId', 'status', 'attempts', 'completedAt', 'summary'], row)) if row else None
        finally:
            connection.close()
        item['readHashUnchanged'] = before == hashlib.sha256(db.read_bytes()).hexdigest()
    print(json.dumps(item))
