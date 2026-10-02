import pathlib,json,hashlib,datetime,subprocess,sys
root=pathlib.Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],text=True).strip()); t=root/'tickets/done/project-task-manager-foundations';e=t/'delivery-round-3-evidence';rel=json.loads((e/'artifact-relocation.json').read_text());finalroot=pathlib.Path(rel['currentRoot']);oldroot=pathlib.Path(rel['oldRoot']);old=json.loads(json.loads((e/'dr002-authoritative-snapshot.json').read_text())['delivery-package-inventory.json']['text']);refs={}
def add(source,dest):
    assert source.is_file(),str(source)
    if dest==finalroot/'tickets/done/project-task-manager-foundations/delivery-package-inventory.json':return
    data=source.read_bytes();refs[str(dest)]={'path':str(dest),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
for rec in old['files']:
    p=pathlib.Path(rec['path'])
    if p.is_relative_to(oldroot):
        rp=str(p.relative_to(oldroot)).replace('tickets/in-progress/project-task-manager-foundations','tickets/done/project-task-manager-foundations');add(root/rp,finalroot/rp)
    else:add(p,p)
for p in t.rglob('*'):
    if p.is_file():add(p,finalroot/p.relative_to(root))
for rp in ['scripts/desktop-release.sh','scripts/release_versions.py','.github/workflows/release-desktop.yml','autobyteus-web/package.json']:
    add(root/rp,finalroot/rp)
result=sys.argv[1] if len(sys.argv)>1 else 'Authorized; repository finalization and beta publication pending'
selfpath=str(finalroot/'tickets/done/project-task-manager-foundations/delivery-package-inventory.json')
records=sorted(refs.values(),key=lambda x:x['path']);records.append({'path':selfpath,'self':'Recursive inventory hash intentionally excluded'})
obj={'ticket':'PROJ-TASK-MANAGER-20261002-001','deliveryRevision':'DR-003','result':result,'taskSize':'Large','architecturalRisk':'High','route':'Reviewed','publishedReleaseCommit':'777548b050527ab3ff5904a085c0c95677e50e74','publishedReleaseVersion':'1.4.92-beta.11','postPublicationRecordTarget':'cc143577b8ca3bcf40469dcf5f1f928438f56a02','currentCheckoutPackageVersion':json.loads((root/'autobyteus-web/package.json').read_text())['version'],'checkedBase':'2056b04f3b654ffe583aa956c371869f7d06444d','initialMerge':'a5123e7d08f66bbb08440340db167fa4ccb5eba0','finalRefreshMerge':'0ac39a28d3abaf493a6673992ae01106452db38e','incomingReferencesPreservedWithSelf':538,'originalUpstreamCount':129,'currentReferenceCount':len(records),'relocationPolicy':'All prior cumulative references retained under current archived paths; as-of upstream inventories/histories preserved. External Product references unchanged.','files':records}
(t/'delivery-package-inventory.json').write_text(json.dumps(obj,indent=2)+'\n');print('Current cumulative references:',len(records))
