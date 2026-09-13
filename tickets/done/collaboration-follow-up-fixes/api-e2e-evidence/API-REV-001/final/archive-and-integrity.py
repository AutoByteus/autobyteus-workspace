import json,pathlib,hashlib,datetime,tarfile,shutil,sqlite3,subprocess,re
from decimal import Decimal
E=pathlib.Path(__file__).resolve().parent.parent;T=E.parent.parent;W=T.parent.parent.parent
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
env=json.loads((E/'runtime/environment.json').read_text());base=json.loads((E/'entry-baseline.json').read_text());D=pathlib.Path(env['dataDir']);root=pathlib.Path(env['root']);assert root.parent==pathlib.Path('/tmp') and root.name.startswith('collab-api01-') and not root.is_symlink();assert json.loads((E/'final/credential-cleanup.json').read_text())['after']=='MISSING';assert not json.loads((E/'final/process-cleanup.json').read_text())['remainingLive']
con=sqlite3.connect(str(D/'db/production.db'));con.execute('PRAGMA wal_checkpoint(TRUNCATE)');con.execute('VACUUM');con.close()
source=pathlib.Path(base['credentialSource']['path']);assert digest(source)==base['credentialSource']['sha256'];match=re.search(r'^\s*(?:export\s+)?DEEPSEEK_API_KEY\s*=\s*(.+?)\s*$',source.read_text(),re.M);assert match;key=match.group(1).strip().strip('\"\'').encode();assert len(key)>15
files=[]
for name in ['agents','agent-teams','agent-orgs','memory']:
 for p in sorted((D/name).rglob('*')):
  if p.is_file() and not p.is_symlink():files.append(p)
files += [pathlib.Path(env['workspace'])/'COLLAB-API01-first-text.txt']
leaks=[str(p) for p in [*files,*[x for x in E.rglob('*') if x.is_file()]] if key in p.read_bytes()];assert not leaks,leaks
archive=E/'final/runtime-owned-sanitized.tar.gz';manifest=[]
with tarfile.open(archive,'w:gz',format=tarfile.PAX_FORMAT) as tar:
 for p in files:
  stat=p.stat();name=str(p.relative_to(root));info=tar.gettarinfo(str(p),arcname=name);info.pax_headers['mtime']=str(Decimal(stat.st_mtime_ns)/Decimal(1000000000));
  with p.open('rb') as src:tar.addfile(info,src)
  manifest.append({'path':name,'sha256':digest(p),'bytes':stat.st_size,'mtimeNs':stat.st_mtime_ns,'mode':stat.st_mode&0o777})
with tarfile.open(archive,'r:gz') as tar:
 for m in manifest:
  member=tar.getmember(m['path']);assert hashlib.sha256(tar.extractfile(member).read()).hexdigest()==m['sha256'];assert int(Decimal(member.pax_headers['mtime'])*Decimal(1000000000))==m['mtimeNs']
(E/'final/runtime-archive-manifest.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':str(archive),'archiveSha256':digest(archive),'files':manifest,'excluded':'Database/vault/master keys/.env/browser profile/cache excluded; exact original text fixture and owned definitions/memory retained. PAX decimal mtime verified exactly; no metadata normalization.'},indent=2)+'\n')
shutil.rmtree(root)
removed=[]
for rel,existed in base['generatedOutputs'].items():
 p=W/rel
 if not existed and p.exists():shutil.rmtree(p);removed.append(rel)
changed=[];missing=[]
for path,sha in base['protected'].items():
 p=pathlib.Path(path) if path.startswith('/') else W/path
 if not p.is_file():missing.append(path)
 elif digest(p)!=sha:changed.append(path)
status=subprocess.check_output(['git','status','--porcelain'],cwd=W,text=True);head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip();staged=subprocess.check_output(['git','diff','--cached','--name-only'],cwd=W,text=True);unmerged=subprocess.check_output(['git','ls-files','-u'],cwd=W,text=True)
r={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'protectedCount':len(base['protected']),'changed':changed,'missing':missing,'all224UpstreamReferencesPreserved':not changed and not missing,'head':head,'headUnchanged':head==base['head'],'staged':staged,'unmerged':unmerged,'gitStatus':status,'removedOwnInitiallyAbsentOutputs':removed,'preexistingCoreDist':'Rebuilt by normal server build, retained because existed at entry; not claimed byte-identical.','ownedPosixRootRemoved':not root.exists(),'sourceCredentialUnchanged':digest(source)==base['credentialSource']['sha256'],'secretInEvidence':False,'archiveFiles':len(manifest),'oldAORG':'Read-only provenance; no execution/reopen/repair/cutover','limits':'Default Temp Workspace discovery/file-explorer watcher read external /home/autobyteus/workspace during normal no-selection navigation; no user work or writes there. Initial ambient definition roots were read before isolation correction; owned seeds confirmed in isolated data only.'};(E/'final/cleanup-integrity.json').write_text(json.dumps(r,indent=2)+'\n');assert not changed and not missing and not staged and not unmerged and head==base['head'];print(json.dumps({k:v for k,v in r.items() if k!='gitStatus'}))
