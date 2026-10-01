"""Read-only source/git preservation and complete incoming-path disposition audit."""
from pathlib import Path
import json, hashlib, subprocess, collections, difflib
R=Path(__file__).resolve().parents[5]
E=Path(__file__).resolve().parent
T=E.parent.parent
def git(*args): return subprocess.check_output(['git','-C',str(R),*args])
def sha(b): return hashlib.sha256(b).hexdigest()
def filehash(p): return sha(p.read_bytes()) if p.is_file() else None
def dump(name,data): (E/name).write_text(json.dumps(data,indent=2)+'\n')
entry=json.loads((E/'entry-audit.json').read_text())
incoming=json.loads((E.parent/'ir-008/upstream-paths.json').read_text())
overlap=set(json.loads((E.parent/'ir-008/overlap-paths.json').read_text()))
retired={
'autobyteus-server-ts/src/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.ts',
'autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts',
'autobyteus-server-ts/tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts'}
def group(p):
 if p in retired:return 'retired-compactor'
 if p.startswith('tickets/'):return 'historical-upstream-evidence'
 if '/dist/' in p:return 'generated-contract'
 if '/docs/' in p:return 'documentation'
 if '/tests/' in p or '/__tests__/' in p or '/test-support/' in p:return 'test-or-fixture'
 if '-contracts/src/' in p:return 'strict-contract'
 if p.startswith('autobyteus-ts/'):return 'core-sender-memory'
 if p.startswith('autobyteus-web/'):
  if 'agentCollaboration/' in p or 'agentRunCollaborationStore' in p:return 'web-agent-root'
  if '/services/agentStreaming/' in p or '/services/runHydration/' in p or '/services/runSubmission/' in p or p.endswith(('agentRunStore.ts','agentOrgContextsStore.ts','agentTeamRunStore.ts')):return 'web-input-hydration-termination'
  if any(s in p for s in ['agentOrgExecution/','teamExecution/','contextFiles/','activeContextStore','runHistory','agentOrgHistory','runTree','nodeEndpoints','types/']):return 'web-root-identity-history'
  return 'web-composer-navigation-presentation'
 if '/src/agent-run-collaboration/' in p:return 'server-agent-root'
 if '/src/agent-org-execution/' in p or '/src/agent-team-execution/' in p:return 'server-team-org-recursion'
 if '/src/agent-collaboration/' in p:return 'server-shared-collaboration'
 if '/src/agent-memory/' in p or '/src/run-history/' in p:return 'server-memory-history'
 if '/src/context-files/' in p or '/src/api/' in p or '/src/services/agent-streaming/' in p:return 'server-transport-projection'
 return 'server-runtime-admission-tools'
rows=[]
for p in incoming:
 blob=subprocess.run(['git','-C',str(R),'show','MERGE_HEAD:'+p],capture_output=True)
 upstream=sha(blob.stdout) if blob.returncode==0 else None
 current=filehash(R/p); before=entry['sha256'].get(p)
 category=group(p)
 if p in retired: disposition='Retain approved direct-summary removal; do not resurrect incoming child/category compactor.'
 elif category=='historical-upstream-evidence':disposition='Preserve upstream bytes as historical provenance only, never integrated execution evidence.'
 elif category=='documentation':disposition='Preserve merged source-of-truth narrative; final semantic synchronization is Delivery-owned, not certified here.'
 elif category=='generated-contract':disposition='Derived strict shared schema output; merged declarations/maps emitted from source, no hand-written compatibility defaults.'
 elif current==upstream:disposition='Incoming bytes preserved; assessed in mapped semantic boundary, with independent source/API review still required.'
 elif current!=before:disposition='IR009 reviewed-design correction or strict current-shape fixture adaptation; see source-delta.patch and local check matrix.'
 else:disposition='Pre-IR009 combined merge/WIP retained; compare IR008 resolution and semantic boundary review.'
 rows.append(dict(path=p,overlap=p in overlap,group=category,incomingSha256=upstream,entrySha256=before,
  currentSha256=current,equalsIncoming=current==upstream,changedThisRound=current!=before,disposition=disposition))
assert len(rows)==676 and sum(x['overlap'] for x in rows)==69
dump('incoming-semantic-audit.json',{'method':'Every incoming path classified and hashed; all 69 overlaps explicitly indexed. Semantic boundary assessments in semantic-audit.md. Hash equality is preservation, not product validation.', 'count':676,'overlapCount':69,'groups':dict(collections.Counter(x['group'] for x in rows)), 'paths':rows})
dump('overlap-semantic-audit.json',[x for x in rows if x['overlap']])
changed=[]
for p,old in entry['sha256'].items():
 current=filehash(R/p)
 if current!=old:changed.append(dict(path=p,before=old,after=current))
new=[p for p in git('ls-files','--others','--exclude-standard','-z').decode().split('\0') if p and not p.startswith('tickets/') and p not in entry['sha256']]
owned=[x['path'] for x in changed if not x['path'].startswith('tickets/')]
inventory=[dict(path=p,sha256=filehash(R/p),new=p in new) for p in owned+new]
dump('source-inventory.json',inventory)
sizes=[];patch=[]
for p in owned+new:
 if '/dist/' in p or not (R/p).is_file():continue
 before=E/'source-before'/p
 a=before.read_text() if before.exists() else ''
 b=(R/p).read_text()
 diff=list(difflib.unified_diff(a.splitlines(True),b.splitlines(True),fromfile='entry/'+p,tofile='current/'+p))
 patch+=diff
 production=('/src/' in p or p.startswith('autobyteus-web/')) and '/__tests__/' not in p and '/tests/' not in p
 sizes.append(dict(path=p,effective=sum(bool(l.strip()) for l in b.splitlines()),changedLines=sum(l.startswith(('+','-')) and not l.startswith(('+++','---')) for l in diff),production=production))
(E/'source-delta.patch').write_text(''.join(patch));dump('source-size-check.json',sizes)
allIncomingSizes=[]
for p in incoming:
 if group(p) in ['test-or-fixture','historical-upstream-evidence','generated-contract','documentation','retired-compactor']:continue
 if not (R/p).is_file() or not p.endswith(('.ts','.vue')):continue
 allIncomingSizes.append(dict(path=p,effective=sum(bool(l.strip()) for l in (R/p).read_text().splitlines())))
dump('incoming-source-size-check.json',allIncomingSizes)
api=json.loads((E.parent/'ir-008/api-owner-preservation.json').read_text())
dump('api-owner-preservation.json',[dict(path=x['path'],before=x['after'],after=filehash(R/x['path']),unchanged=x['after']==filehash(R/x['path'])) for x in api])
backups=json.loads((E.parent/'ir-008/core-dist-preemit.json').read_text())
dr=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-delivery-safety/dr-002-20261001T101508Z/pending-files.tar.gz')
index=git('ls-files','--stage').decode()
(E/'final-index.txt').write_text(index);(E/'final-status.txt').write_bytes(git('status','--short'))
entryIndex=(E/'entry-index.txt').read_text()
dump('final-audit.json',dict(head=git('rev-parse','HEAD').decode().strip(),mergeHead=git('rev-parse','MERGE_HEAD').decode().strip(),
 branch=git('branch','--show-current').decode().strip(),unmerged=len(git('ls-files','-u').splitlines()),
 stagedCount=len(git('diff','--cached','--name-only').splitlines()),indexUnchanged=index==entryIndex,
 stashUnchanged=git('stash','list').decode().strip()==entry['stash'].strip(),
 pinnedFileCount=len(entry['sha256']),changedPinned=changed,newSourcePaths=new,
 api12Unchanged=all(x['after']==filehash(R/x['path']) for x in api),
 dr002BackupUnchanged=filehash(dr)=='55fef007de41a057443c3a34b37cfa55612fdf661061882b7e13d74080c4c215',
 ir008PreemitBackupUnchanged=filehash(Path(backups['archive']))==backups['archiveSha256'],
 sourceSizeViolations=[x for x in sizes if x['production'] and x['effective']>500],
 incomingSourceSizeViolations=[x for x in allIncomingSizes if x['effective']>500]))
print(json.dumps({'incoming':len(rows),'overlap':sum(x['overlap'] for x in rows),'groups':dict(collections.Counter(x['group'] for x in rows)),'changedPins':len(changed),'ownedSourceAndGeneratedAndTests':len(inventory),'indexUnchanged':index==entryIndex,'missingIncoming':[x['path'] for x in rows if x['currentSha256'] is None]},indent=2))
