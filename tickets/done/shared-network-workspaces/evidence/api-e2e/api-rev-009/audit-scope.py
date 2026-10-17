from pathlib import Path
import subprocess,json,hashlib
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=T/'evidence/api-e2e/api-rev-009';E8=T/'evidence/api-e2e/api-rev-008'
def git(*args):return subprocess.check_output(['git',*args],cwd=R)
def sha(b):return hashlib.sha256(b).hexdigest()
a=json.loads((E/'input-audit.json').read_text()); old='a53c133a262ca859e8b8103c737a0ce385019aa5'; predecessor='4f44d11562700d9518f42ae9be946d65163d23fc'
checks={p:git('diff','--name-only',old,'HEAD','--',p).decode().splitlines() for p in a['carriedScopes']}
for p in ['autobyteus-server-ts/src/workspaces','autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts']:
 checks[p]=git('diff','--name-only',old,'HEAD','--',p).decode().splitlines()
assert all(not paths for paths in checks.values())
test='autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts';before=git('show',predecessor+':'+test).decode();after=(R/test).read_text()
assert before[before.index('  it('):]==after[after.index('  it('):]
(E/'reviewed-test-delta.diff').write_bytes(git('diff',predecessor,'HEAD','--',test))
names=['command-final-summary.json','command-carried-evidence.json','command-cleanup.json','LN-commands-result.json','LD-commands-result.json','LN-command-setup-result.json','LD-command-setup-result.json','LN-command-detach-result.json','LD-command-detach-result.json','user-command-only-direction.json']
evidence=[]
for n in names:
 p=E8/n;actual=sha(p.read_bytes());expected=sha(git('show',old+':'+str(p.relative_to(R))));assert actual==expected;nested={'path':str(p.relative_to(T)),'sha256':actual,'matchesAPI008Commit':True};evidence.append(nested)
carry=json.loads((E8/'command-carried-evidence.json').read_text()); nested=[]
for case,v in carry['cases'].items():
 for receipt in v.get('receipts',[]):
  p=R/receipt['path'];match=sha(p.read_bytes())==receipt['sha256'];assert match,p
  nested.append({'case':case,'path':receipt['path'],'matchesRecordedHash':match})
out={'input':a['head'],'commandProofBaseline':old,'unchangedRelevantScopes':checks,'allSixTestBodiesByteIdentical':True,'testDelta':git('diff','--numstat',predecessor,'HEAD','--',test).decode().strip(),'currentTestSha256':sha((R/test).read_bytes()),'retainedFilesystemProof':evidence,'nestedCarriedReceipts':nested,'importantLimit':'Whole server changed through integrated base; only exact filesystem/launcher/workspace and IR010 paths carried unchanged. No new application image or live editor/NFS product qualification. Adjacent imported composition/search executes separately in API009.'}
(E/'scope-audit.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'sourceChecks':len(checks),'criticalAPI008FilesUnchanged':len(evidence),'nestedCarriedReceiptsUnchanged':len(nested),'sixBodiesUnchanged':True}))
