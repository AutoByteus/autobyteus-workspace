import json,pathlib,hashlib
p=pathlib.Path(__file__).parent;base=pathlib.Path((p/'installed-copy-root.txt').read_text().strip());before=json.loads((p/'installed-before-hashes.json').read_text());after={};m=base/'desktop/server-data/memory'
def sha(f):
 h=hashlib.sha256()
 with f.open('rb') as r:
  for b in iter(lambda:r.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
for f in m.rglob('*'):
 if f.is_file():after[str(f.relative_to(m))]={'bytes':f.stat().st_size,'sha256':sha(f)}
changed=[k for k,v in before.items() if k in after and v!=after[k]];missing=list(set(before)-set(after));new=list(set(after)-set(before));blobs=[k for k in before if '/context_files/' in k]
residue=[d.name for d in (base/'snapshot/server-data/memory/agent_teams').iterdir() if d.is_dir() and not (d/'team_run_execution_tree.json').exists()];rfiles=[k for k in before if any(k.startswith('agent_teams/'+d+'/') for d in residue)]
r={'filesBefore':len(before),'filesAfter':len(after),'changed':changed,'removed':missing,'added':new,'attachmentBlobCount':len(blobs),'attachmentBlobsUnchanged':all(before[k]==after.get(k) for k in blobs),'missingTreeRootCount':len(residue),'missingTreeFiles':len(rfiles),'missingTreeBytes':sum(before[k]['bytes'] for k in rfiles),'missingTreeFilesUnchanged':all(before[k]==after.get(k) for k in rfiles),'missingTreeDirsRetained':all((m/'agent_teams'/d).is_dir() for d in residue)}
(p/'installed-after-hashes.json').write_text(json.dumps(after));(p/'installed-diff.json').write_text(json.dumps(r,indent=2));print({k:(len(v) if isinstance(v,list) else v) for k,v in r.items()})
