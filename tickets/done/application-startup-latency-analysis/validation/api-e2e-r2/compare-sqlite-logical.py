#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,sqlite3,sys
from pathlib import Path
before=Path(sys.argv[1]); after=Path(sys.argv[2]); output=Path(sys.argv[3])

def enc(v):
 if v is None:return b'N\0'
 if isinstance(v,bytes):return b'B'+len(v).to_bytes(8,'big')+v
 s=str(v).encode(); return type(v).__name__.encode()+b':'+len(s).to_bytes(8,'big')+s

def snapshot(db):
 c=sqlite3.connect(f'file:{db}?mode=ro',uri=True); c.text_factory=lambda b:b.decode(errors='surrogateescape')
 names=[r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
 out={}
 for name in names:
  info=c.execute(f'PRAGMA table_info("{name}")').fetchall(); cols=[x[1] for x in info]; pks=[x[1] for x in sorted(info,key=lambda x:x[5]) if x[5]]
  order=pks or ['rowid']
  h=hashlib.sha256(); count=0
  q=f'SELECT * FROM "{name}" ORDER BY '+','.join(f'"{x}"' if x!='rowid' else 'rowid' for x in order)
  for row in c.execute(q):
   count+=1
   for v in row:h.update(enc(v));h.update(b'\xff')
   h.update(b'\n')
  out[name]={'rowCount':count,'sha256':h.hexdigest(),'columns':cols,'primaryKey':pks}
 c.close();return out
b=snapshot(before);a=snapshot(after)
allnames=sorted(set(b)|set(a));changes=[]
for n in allnames:
 if b.get(n)!=a.get(n):changes.append({'table':n,'before':b.get(n),'after':a.get(n)})
result={'before':str(before),'after':str(after),'tableCount':len(allnames),'changedTableCount':len(changes),'changedTables':changes,'allOtherTablesUnchanged':all(x['table']=='app_data_migration_records' for x in changes)}
output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
