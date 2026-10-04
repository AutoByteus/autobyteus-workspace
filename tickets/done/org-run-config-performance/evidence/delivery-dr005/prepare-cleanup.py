import pathlib,json,os,subprocess,hashlib,shutil,datetime,stat,gzip
C=pathlib.Path('/Users/normy/autobyteus_org/autobyteus-release-checkouts/org-run-config-performance-beta');A=C/'tickets/done/org-run-config-performance';D=A/'evidence/delivery-dr005';U=pathlib.Path(__file__).parent;W=pathlib.Path('/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance');S=pathlib.Path('/Users/normy/autobyteus_org/autobyteus-workspace-superrepo')
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def git(*a,cwd=W):return subprocess.check_output(['git',*a],cwd=cwd,text=True).rstrip("\n")
assert git('rev-parse','HEAD')=='2eb8732c7243aec7883a99107032f73e972d8b9a'
assert git('diff','--name-only')=='SOLUTION_DESIGN_BEST_PRACTICES.md'
assert not git('diff','--cached','--name-only')
assert git('ls-files','--others','--exclude-standard').splitlines() and all(p.startswith('autobyteus-application-sdk-contracts/dist/') for p in git('ls-files','--others','--exclude-standard').splitlines())
assert sha(W/'SOLUTION_DESIGN_BEST_PRACTICES.md')=='34476762da34b5f06ea84f78e5972880b006e18535c330b5b76a8c5ec3a6089a'
manifest=pathlib.Path('/Users/normy/autobyteus_org/autobyteus-worktrees/_solution-designer-reports/runtime-lifecycle-guide-custody-dr004/custody-manifest.json');o=json.loads(manifest.read_text());assert o['noFurtherWritesOrActiveDependencyOnOldOrgWorktreeByThisOwner'] and not o['oldWorktreeRetentionNeededForTheseGuideBytes']
versions=[]
for label,r in o['versions'].items():assert sha(r['path'])==r['sha256'];versions.append({'label':label,**r})
assert len(o['references'])==14 and all(pathlib.Path(r['path']).is_file() for r in o['references'])
assert sha(C/'SOLUTION_DESIGN_BEST_PRACTICES.md')=='ff6d2e1ecad2f475f79b9581ade6cbe53c96f3e414323e0266762ac999cc9342'
for f in ['docs-sync-report.md','handoff-summary.md','release-deployment-report.md']:(D/('prior-dr004-'+f)).write_bytes((A/f).read_bytes())
# Owner inputs are external durable reports; copies provide additional archive custody.
external=[]
for prefix in ['org-run-config-performance-cleanup-dr004','runtime-lifecycle-guide-custody-dr004']:
 root=manifest.parent.parent/prefix;dst=D/prefix;dst.mkdir(exist_ok=True)
 for f in root.iterdir():
  if f.is_file():shutil.copy2(f,dst/f.name);external.append(str(f))
# Preserve precisely inventoried contracts output and transient test DB/config independently.
saved=[]
for rel in ['autobyteus-application-sdk-contracts/dist','autobyteus-server-ts/tests/.tmp','autobyteus-web/.nuxtrc']:
 src=W/rel;dst=U/'generated-output-custody'/rel
 assert src.exists()
 if src.is_dir():shutil.copytree(src,dst,dirs_exist_ok=True,symlinks=True);files=[f for f in src.rglob('*') if f.is_file()]
 else:dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst);files=[src]
 for f in files:
  target=U/'generated-output-custody'/f.relative_to(W);assert sha(f)==sha(target);saved.append({'originalRelativePath':str(f.relative_to(W)),'custody':str(target),'sha256':sha(f),'bytes':f.stat().st_size,'mtimeUTC':datetime.datetime.fromtimestamp(f.stat().st_mtime,datetime.timezone.utc).isoformat()})
# No follow of symlinks; removing this worktree must not remove global stores/other workspaces.
ignored=git('status','--short','--ignored');known=['applications/brief-studio/node_modules/','applications/socratic-math-teacher/node_modules/','autobyteus-agent-presentation-contracts/node_modules/','autobyteus-application-backend-sdk/node_modules/','autobyteus-application-devkit/node_modules/','autobyteus-application-frontend-sdk/node_modules/','autobyteus-application-sdk-contracts/node_modules/','autobyteus-collaboration-stream-contracts/node_modules/','autobyteus-server-ts/autobyteus-web/','autobyteus-server-ts/dist/','autobyteus-server-ts/node_modules/','autobyteus-server-ts/tests/.tmp/','autobyteus-team-stream-contracts/node_modules/','autobyteus-ts/dist/','autobyteus-ts/node_modules/','autobyteus-web/.nuxt/','autobyteus-web/.nuxtrc','autobyteus-web/build/dist/','autobyteus-web/build/icons/1024x1024.png','autobyteus-web/build/icons/128x128.png','autobyteus-web/build/icons/256x256.png','autobyteus-web/build/icons/512x512.png','autobyteus-web/build/icons/64x64.png','autobyteus-web/build/icons/icon.icns','autobyteus-web/build/icons/icon.ico','autobyteus-web/dist-mobile/','autobyteus-web/dist/','autobyteus-web/electron-dist/','autobyteus-web/node_modules/','autobyteus-web/resources/','node_modules/']
assert sorted(x[3:] for x in ignored.splitlines() if x.startswith('!! '))==sorted(known)
assert git('status','--short')==' M SOLUTION_DESIGN_BEST_PRACTICES.md\n?? autobyteus-application-sdk-contracts/dist/'
empty=['autobyteus-server-ts/agents','autobyteus-server-ts/agent-orgs','autobyteus-server-ts/agent-teams','autobyteus-server-ts/db','autobyteus-server-ts/memory']
assert all(not list((W/x).rglob('*')) for x in empty)
# Metadata inventory of generated/installed roots, plus strong custody hashes for non-cache outputs.
roots=known+['autobyteus-application-sdk-contracts/dist/']+empty
rows=[];totals={}
for rel in roots:
 p=W/rel;files=[]
 if p.is_dir() and not p.is_symlink():
  for root,dirs,names in os.walk(p,followlinks=False):
   for name in dirs+names:files.append(pathlib.Path(root)/name)
 else:files=[p]
 total=0;regular=0;links=0
 for f in sorted(files):
  st=f.lstat();entry=[str(f.relative_to(W)),stat.S_IFMT(st.st_mode),st.st_size,st.st_mtime_ns,os.readlink(f) if f.is_symlink() else None];rows.append(entry)
  if f.is_symlink():links+=1
  elif f.is_file():regular+=1;total+=st.st_size
 totals[rel]={'entries':len(files),'regularFiles':regular,'symlinks':links,'regularBytes':total}
rows.sort(key=lambda x:x[0]);body=json.dumps(rows,separators=(',',':')).encode();fingerprint=hashlib.sha256(body).hexdigest()
with gzip.open(U/'generated-root-inventory.json.gz','wb') as f:f.write(body)
(U/'generated-root-inventory.sha256').write_text(fingerprint+'\n')
app=W/'autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/app.asar';assert sha(app)=='0c75dc34e21b057f95419e41c74e81f1e01abc25fa0294674320cbf6698a6e0b'
# Record live-owner cwd snapshot before cleanup. Only this synchronous inspection can appear.
ps=subprocess.check_output(['ps','-axo','pid,ppid,command'],text=True)
assert not any(str(W) in l and not ('prepare-cleanup.py' in l or 'bash -l' in l or 'python3 -' in l) for l in ps.splitlines()),'Unexpected process references old worktree'
# Shared dirty bytes must remain outside scope.
sharedDirty={}
for rel in git('diff','--name-only',cwd=S).splitlines():
 if (S/rel).is_file():sharedDirty[rel]=sha(S/rel)
proof={'revision':'DR-005','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'resumeScope':'Only unfinished bounded cleanup/final receipt; no release/acceptance/finalization/API replay','ownerDisposition':'Resolved, runtime-lifecycle Solution Designer releases old guide copy,14 referencing artifact aliases preserved','guideVersions':versions,'externalInputs':external,'generatedOutputCustody':saved,'sdkContractsOwnership':'52 tsc outputs: DR003 prebuild explicitly builds contracts and rebuilt packaged-freshness step reruns it;03:10UTC mtime matches that owned build. Sources/package build recipe remain committed; exact52 files independently copied/hashed, no regeneration needed','testDBOwnership':'Prisma tests/setup/prisma-test-config.ts points to tests/.tmp/autobyteus-server-test.db;03:08:41UTC mtime matches owned DR003 AGY transport25 test command starting03:08:40; DB+journal copied/hashed, no active runtime','nuxtConfigOwnership':'Generated setups.@nuxt/test-utils=3.23.0 in dedicated ticket validation workspace; copied/hashed','otherGeneratedRoots':'Known pnpm dependency trees and core/server/Nuxt/mobile/Electron build/deploy/icon outputs from ticket implementation/API/DR003 commands; regenerated outputs, no user source/data. No symlink targets followed/deleted. All generated roots explicitly listed; empty server data directories contain no user state. Current app.asar matches recorded DR003 build proof','roots':roots,'rootTotals':totals,'inventoryRows':len(rows),'metadataFingerprint':fingerprint,'independentInventory':str(U/'generated-root-inventory.json.gz'),'knownEmptyDataRoots':empty,'currentWorktreeStatus':git('status','--short'),'currentWorktreeHead':git('rev-parse','HEAD'),'currentOriginPersonal':git('rev-parse','origin/personal',cwd=C),'candidateReachable':subprocess.run(['git','merge-base','--is-ancestor','2eb8732c7243aec7883a99107032f73e972d8b9a','origin/personal'],cwd=C).returncode==0,'publishedTag':'v1.4.94-beta.2','publishedSHA':git('rev-parse','v1.4.94-beta.2^{}',cwd=C),'sharedHeadBefore':git('rev-parse','HEAD',cwd=S),'sharedDirtyTrackedHashesBefore':sharedDirty,'noNewRuntimeLaunched':True,'beforeRemovalGuardRequired':True}
assert proof['candidateReachable'] and proof['publishedSHA']=='a4a5a1ce6cf9b7909429f858a0894eb58d5f86b2'
(D/'cleanup-custody-and-inventory.json').write_text(json.dumps(proof,indent=2)+'\n');(U/'custody-manifest.json').write_text(json.dumps(proof,indent=2)+'\n')
print('Custody verified:',len(saved),'exact copied files; contracts52, testDB2, Nuxt config1. Generated inventory:',len(rows),'metadata rows; independent compressed custody. Guide owner released, candidate reachable.')
