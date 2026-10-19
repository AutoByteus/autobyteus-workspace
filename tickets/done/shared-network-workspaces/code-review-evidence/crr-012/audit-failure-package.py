"""Read-only incoming evidence/source audit; writes only this review's evidence.
No VM, daemon, mount, root, provider, application or test execution.
"""
from pathlib import Path
import json,hashlib,subprocess as sp,re,plistlib,collections
E=Path(__file__).resolve().parent;T=E.parent.parent;R=T.parent.parent.parent;A=T/'evidence/api-e2e/api-rev-005'
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,d):(E/n).write_text(json.dumps(d,indent=2)+'\n')
def git(*a):return sp.check_output(['git',*a],cwd=R,text=True).strip()
base='190e130290ca74307430fac6b28f0bc736766033'
assert git('rev-parse','HEAD')==base
refs=read(A/'package-index.json')['reference_files'];assert len(refs)==1285==len(set(refs))
manifest=read(A/'evidence-manifest.json')['files']
for x in manifest:
 p=Path(x['path']);assert p.is_file() and p.stat().st_size==x['size'] and sha(p)==x['sha256'],str(p)
i=read(A/'input-audit.json')
for x in i['retainedFiles']+i['priorDistFiles']:
 p=Path(x['path']);assert p.is_file() and p.stat().st_size==x['size'] and sha(p)==x['sha256'],str(p)
snapshot={p:{'sha256':sha(Path(p)),'size':Path(p).stat().st_size} for p in refs}
assert not [p for p in git('diff','--name-only','d963097b6e3d0cf80e3bf4e86d900173b671fd26',base).splitlines() if not p.startswith('tickets/')]
sourcefiles=['platform/source.go','config/state.go','setup/plan.go','setup/apply.go','setup/pending.go','setup/lifecycle.go','setup/status.go','platform/jobs.go','service/supervisor.go','cli/run.go']
source=[]
for rel in sourcefiles:
 p=R/'autobyteus-nfs/internal'/rel
 assert sp.check_output(['git','show','d65aeda24fc4b9a534a3941b194dd4a55b88c00c:'+str(p.relative_to(R))],cwd=R)==p.read_bytes()
 source.append({'path':str(p.relative_to(R)),'sha256':sha(p)})
save('input-audit.json',{'inputHead':base,'referenceCount':len(refs),'manifestVerified':len(manifest),'inputReferences':snapshot,'retainedFiles':i['retainedFiles'],'priorDistFiles':i['priorDistFiles'],'sourceFiles':source,'productionChangesSinceSourceReview':[],'initialStatus':git('status','--short'),'result':'Pass'})
(E/'prior-code-review-report-crr011.md').write_bytes((T/'code-review-report.md').read_bytes())
err='selected source device/inode changed; no replacement will be exported'
native=read(A/'mac-native-result.json');second=read(A/'mac-reboot-confirm-result.json');third=read(A/'mac-volume-boot-result.json')
assert len(native['cases'])==3 and all(x['status']=='Pass' for x in native['cases']) and native['result']=='Fail'
assert native['sourceIdentity']=='16777228:506781:501:20:755'
assert err in native['diagnostics']['stdout']
assert native['binary']['sha256']=='5908c8229010102d7a1708c65e50b8674766a6c8356c4362588c0fed36167a57'
rows=[]
for name,d in [('second',second),('third',third)]:
 assert d['result']=='Observed'
 for j,q in enumerate(d['observations']):
  raw=q['stdout'];src=d['source']
  m=re.search(r'^(\d+):(\d+):(\d+):(\d+):(\d+):'+re.escape(src)+r'$',raw,re.M);assert m
  ident=list(map(int,m.groups()));assert ident[1:]==[506781,501,20,755]
  start=raw.index('{\n  "installationId"');hosted=json.JSONDecoder().raw_decode(raw[start:])[0]
  assert hosted['identity']=={'device':16777228,'inode':506781} and hosted['source']==src
  assert hosted['storageId']==native['connection']['storageId'] and hosted['backend']=='apple'
  hashes=[]
  for suffix in ['/project/preexisting.txt','/.autobyteus-nfs/storage.json']:
   hashes.append(re.search(r'^([0-9a-f]{64})  '+re.escape(src+suffix)+'$',raw,re.M).group(1))
  record=re.search(r'^([0-9a-f]{64})  /Library/Application Support/AutoByteusNFS/hosted-filesystem.json$',raw,re.M).group(1)
  assert hashes==['924b88c26e48449a10b52dc755f1888b994389d1cf2b34812de55f5bfba2ec7d','629c7f5cd6d4b1d27f0b84e8ec3d9ac5d96f363e5e1ed87f81de349373b4e393']
  assert record=='a9148db38d10a1eb3694846c990cac97dc9df9c857a73220c767a0d558a8c5de'
  volume=None
  if name=='third':
   xml=re.search(r'<\?xml.*?</plist>',raw,re.S).group(0);v=plistlib.loads(xml.encode())
   assert v['VolumeUUID']==v['DiskUUID']=='A19FE379-BE62-4297-9A39-3934CC88214B'
   assert v['DeviceNode']=='/dev/disk2s5' and v['MountPoint']=='/System/Volumes/Data' and v['FilesystemType']=='apfs'
   volume={k:v[k] for k in ['VolumeUUID','DiskUUID','DeviceNode','MountPoint','FilesystemType']}
  assert err in raw and 'nfsd is running' in raw and ' on /Volumes/autobyteus-shared ' not in raw
  rows.append({'round':name,'observation':j,'sourceIdentity':ident,'storedIdentity':hosted['identity'],'originalSHA256':hashes[0],'markerSHA256':hashes[1],'recordSHA256':record,'validVolumeProof':volume,'identityRefusalCount':raw.count(err),'mountAbsent':True,'nfsdRunning':True})
 for q in d['statusObservations']:
  assert q['rc']==1 and json.loads(q['stdout'])['hostReady'] is False
  assert 'expected host NFS source/protocol is not mounted' in q['stderr']
 assert d['diagnosticReconnect']['rc']==1 and err in d['diagnosticReconnect']['stderr']
assert [x['sourceIdentity'][0] for x in rows]==[16777230,16777227,16777227,16777227,16777227,16777227,16777230,16777230,16777230]
boots=[native['beforeBoot'],second['beforeSecondBoot'],second['afterSecondBoot'],third['afterThirdBoot']];assert len(set(boots))==4 and second['afterSecondBoot']==third['beforeThirdBoot']
save('mac-evidence-review.json',{'result':'Confirmed API-F005','initialSourceIdentity':native['sourceIdentity'],'bootTimes':boots,'observations':rows,'actualStatusFailures':len(second['statusObservations'])+len(third['statusObservations']),'explicitReconnectFailures':2,'scope':'Independent static/raw receipt audit, not reviewer reexecution. First210s is not an SLA. Only third-boot actual-disk plist supplies volume UUID proof.'})
summary=[];names=set()
for name in ['visibility-result.json','docker-visibility-result.json']:
 d=read(A/name);assert d['result']=='Pass' and all(x['status']=='Pass' for x in d['cases'])
 cases=[c for p in d['phases'] for c in p['cases']];assert len(cases)==20
 assert all(p['uid']==1000 and p['gid']==109 and p['groups']==[] for p in d['phases'])
 assert all(p['marker']['storageId']==d['connection']['storageId'] for p in d['phases'])
 assert d['activationEvidence']['rc']==0 and d['activationEvidence']['stdout'].count('Attr_Expiration_Time = 0;')==1
 maxima={'native':0,'http':0}
 for c in cases:
  assert c['file'] not in names;names.add(c['file'])
  assert c['sourceSHA256']==c['expectedSHA256'] and c['result']=='Pass'
  if c['kind']=='inplace':assert c['sourceIdentityBefore']==c['sourceIdentityAfter']
  if c['kind']=='atomic':assert c['sourceIdentityBefore'][1]!=c['sourceIdentityAfter'][1]
  assert c['initialSHA256']!=c['expectedSHA256']
  for label,reader in c['readers'].items():
   assert label in maxima and reader['result']=='Pass' and 0<=reader['firstExactSeconds']<=5
   exact=[r for r in reader['rows'] if r.get('sha256')==c['expectedSHA256'] and r.get('size')==c['size']];assert exact
   assert abs(exact[0]['seconds']-reader['firstExactSeconds'])<.000001
   maxima[label]=max(maxima[label],reader['firstExactSeconds'])
 counts=dict(collections.Counter(c['kind'] for c in cases));assert counts=={'inplace':12,'atomic':4,'new':4}
 assert set(c['size'] for c in cases)=={1024,1048576}
 summary.append({'evidence':name,'fixtures':20,'kindCounts':counts,'readerChecks':40,'maxSeconds':maxima,'source':d['source'],'connection':d['connection'],'binary':d['binary'],'activationVerified':True})
assert summary[0]['source']==summary[1]['source'] and summary[0]['connection']==summary[1]['connection']
save('visibility-evidence-review.json',{'result':'CR006/API-F004 resolved at executed Linux native+Docker storage/native+managed HTTP scope','uniqueFixtures':len(names),'readerChecks':80,'modes':summary,'notFullQualification':True,'method':'Recomputed from raw current API005 phases, no runtime reexecution. Reviewed guest script: warmed fresh opens, writer flush/fsync/close before timer; real HTTP; observer polling only.'})
print(json.dumps({'inputManifestVerified':len(manifest),'references':len(refs),'retainedCandidatesVerified':len(i['retainedFiles']),'oldDistVerified':len(i['priorDistFiles']),'macObservations':len(rows),'visibilityChecks':80,'result':'Pass evidence audit; product FAIL API-F005'}))
