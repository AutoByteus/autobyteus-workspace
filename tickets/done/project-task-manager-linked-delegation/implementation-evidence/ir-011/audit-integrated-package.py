from pathlib import Path
import json,hashlib,subprocess,difflib,re,collections
w=Path.cwd();t=w/'tickets/in-progress/project-task-manager-linked-delegation';e=t/'implementation-evidence/ir-011';d=t/'delivery-evidence/dr-001';h=lambda b:hashlib.sha256(b).hexdigest();rows=subprocess.check_output(['git','diff','HEAD','--name-status','-M'],text=True).splitlines();renames={}
for line in rows:
 parts=line.split('\t')
 if parts[0].startswith('R'):renames[parts[1]]=parts[2]
renames['autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-manager.ts']='autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts'
(e/'integration-rename-map.json').write_text(json.dumps(renames,indent=2)+'\n')
accepted=json.loads((d/'accepted-candidate-index.json').read_text());candidates=[]; changes=[]
for old,rec in accepted.items():
 assert h(Path(rec['snapshot']).read_bytes())==rec['sha256'],old
 rel=str(Path(old).relative_to(w));new=renames.get(rel,rel);p=w/new;assert p.is_file(),(rel,new)
 r={'acceptedPath':rel,'integratedPath':new,'acceptedHash':rec['sha256'],'acceptedSnapshot':rec['snapshot'],'snapshotExact':True,'currentHash':h(p.read_bytes()),'bytesExact':h(p.read_bytes())==rec['sha256'],'renamed':new!=rel}
 if not r['bytesExact']:
  out=e/'accepted-diffs'/(rel+'.diff');out.parent.mkdir(parents=True,exist_ok=True);out.write_text(''.join(difflib.unified_diff(Path(rec['snapshot']).read_text().splitlines(True),p.read_text().splitlines(True),fromfile='accepted/'+rel,tofile='integrated/'+new)));r['diff']=str(out);changes.append(r)
 candidates.append(r)
(e/'accepted-candidate-fidelity.json').write_text(json.dumps(candidates,indent=2)+'\n');(e/'accepted-change-map.json').write_text(json.dumps(changes,indent=2)+'\n')
durables=[]
for r in json.loads((d/'durable-fidelity.json').read_text()):
 old=Path(r['original']);rel=str(old.relative_to(w));new=w/renames.get(rel,rel);assert h(Path(r['acceptedSnapshot']).read_bytes())==r['acceptedHash'];assert new.is_file()
 durables.append({'original':str(old),'current':str(new),'acceptedSnapshot':r['acceptedSnapshot'],'acceptedHash':r['acceptedHash'],'acceptedSnapshotExact':True,'currentHash':h(new.read_bytes()),'currentBytesExact':h(new.read_bytes())==r['acceptedHash'],'renamed':old!=new})
(e/'durable-fidelity.json').write_text(json.dumps(durables,indent=2)+'\n')
local=json.loads((e/'implementation-local-change-map.json').read_text());inputmap={str(w/r['path']):r['incomingSnapshot'] for r in local};inputmap.update({r['original']:r['snapshot'] for r in json.loads((e/'compiled-input-recovery.json').read_text())})
inputmap.update({str(t/name):str(e/'input'/name) for name in ['implementation-handoff.md','implementation-investigation.md','implementation-revision-record.md']})
refrows=[]
for r in json.loads((e/'input/references.json').read_text()):
 p=Path(r['path']);assert p.is_file();exact=h(p.read_bytes())==r['sha256'];snap=str(p) if exact else inputmap.get(str(p));assert snap and Path(snap).is_file() and h(Path(snap).read_bytes())==r['sha256'],r
 refrows.append({**r,'currentHash':h(p.read_bytes()),'currentExact':exact,'originalExactReference':snap})
(e/'input-reference-reconciliation.json').write_text(json.dumps({'count':len(refrows),'exact':sum(r['currentExact'] for r in refrows),'recoverable':True,'entries':refrows},indent=2)+'\n')
# Actual original reference context: all DR-001's 4205 accepted reference locators remain exact.
prior=json.loads((d/'incoming-reference-reconciliation.json').read_text());assert not prior['unrecoverable'];original4205=[]
for r in prior['entries']:
 loc=r['acceptedReference']
 if not Path(loc).is_file() or h(Path(loc).read_bytes())!=r['acceptedHash']:
  candidatesForOriginal=[accepted.get(r['original'],{}).get('snapshot'),inputmap.get(r['original'])]
  loc=next((v for v in candidatesForOriginal if v and Path(v).is_file() and h(Path(v).read_bytes())==r['acceptedHash']),None)
 assert loc,r
 original4205.append({**r,'currentRecoverableReference':loc,'exactRecoverable':True})
(e/'original4205-reference-recovery.json').write_text(json.dumps(original4205,indent=2)+'\n')
# Source health: generated output excluded; comments-only lines excluded (approximation, not parser claim).
size=[]
sourcePaths={line.split('\t')[-1] for line in rows if not line.split('\t')[-1].startswith('tickets/')} | {r['integratedPath'] for r in candidates}
for rel in sorted(sourcePaths):
 p=w/rel
 if not p.is_file() or p.suffix not in ['.ts','.vue','.js','.mjs'] or '/tests/' in rel or '/__tests__/' in rel or '/generated/' in rel or not ('/src/' in rel or rel.startswith('autobyteus-web/')):continue
 s=p.read_text();effective=re.sub(r'/\*.*?\*/','',s,flags=re.S);effective=re.sub(r'^\s*//.*$', '',effective,flags=re.M)
 n=sum(bool(x.strip()) for x in effective.splitlines());num=subprocess.check_output(['git','diff','HEAD','--numstat','--',rel],text=True).strip().split('\t');size.append({'path':rel,'rawNonEmpty':sum(bool(x.strip()) for x in s.splitlines()),'effectiveNonEmptyApprox':n,'deltaVsCheckpoint':num[:2]})
assert all(r['effectiveNonEmptyApprox']<=500 for r in size),[r for r in size if r['effectiveNonEmptyApprox']>500]
(e/'size-audit.json').write_text(json.dumps({'basis':'Integrated non-ticket changed source against checkpoint; generated files/tests exempt; comments-only exclusion approximate. Rename-aware accepted diffs are separate.','rows':size},indent=2)+'\n')
# Changes to 58 overlapping incoming references grouped by owner, with actual snapshots and current mapped paths.
overlap=[]
for r in prior['entries']:
 if r['currentExact']:continue
 rel=str(Path(r['original']).relative_to(w));current=w/renames.get(rel,rel);assert current.is_file();overlap.append({**r,'integratedPath':str(current),'integratedHash':h(current.read_bytes())})
(e/'all58-overlap-map.json').write_text(json.dumps(overlap,indent=2)+'\n')
summary={'accepted300SnapshotsExact':True,'accepted300BytesExact':sum(r['bytesExact'] for r in candidates),'accepted300ChangedOrRenamed':sum(not r['bytesExact'] or r['renamed'] for r in candidates),'acceptedRenamed':sum(r['renamed'] for r in candidates),'all20DurableSnapshotsExact':True,'durableCurrentBytesExact':sum(r['currentBytesExact'] for r in durables),'durableRenamed':sum(r['renamed'] for r in durables),'durableChanged':sum(not r['currentBytesExact'] for r in durables),'all4205AcceptedReferencesExactAtRecoverableLocations':True,'all4597IncomingReferencesRecoverable':True,'incomingCurrentExact':sum(r['currentExact'] for r in refrows),'manualPaths':len(local),'overlap58':len(overlap),'cumulativeAndIntegrationSourceCount':len(size),'maxEffectiveSource':max(r['effectiveNonEmptyApprox'] for r in size)}
(e/'audit-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2));print('durable changes',[(r['original'].replace(str(w)+'/',''),r['current'].replace(str(w)+'/','')) for r in durables if not r['currentBytesExact'] or r['renamed']])
