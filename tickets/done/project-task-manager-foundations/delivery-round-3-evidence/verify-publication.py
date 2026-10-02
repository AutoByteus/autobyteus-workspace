import pathlib,json,subprocess,hashlib,re,datetime,urllib.request
root=pathlib.Path.cwd(); e=root/'tickets/done/project-task-manager-foundations/delivery-round-3-evidence';out=pathlib.Path('/tmp/project-task-manager-beta-delivery');version='1.4.92-beta.11';sha='777548b050527ab3ff5904a085c0c95677e50e74';tag='v'+version
runs=json.loads((out/'release-workflows-latest.json').read_text())['runs'];assert len(runs)==4 and all(r['status']=='completed' and r['conclusion']=='success' and r['headSha']==sha for r in runs)
for p in out.glob('*'):
    if p.is_file():(e/p.name).write_bytes(p.read_bytes())
release=json.loads(subprocess.check_output(['gh','api',f'repos/AutoByteus/autobyteus-workspace/releases/tags/{tag}'],text=True));(e/'github-prerelease.json').write_text(json.dumps(release,indent=2)+'\n')
assert release['tag_name']==tag and release['prerelease'] and not release['draft'] and release['published_at']
assets={a['name']:a for a in release['assets']}
prefix='AutoByteus_personal_';expected=['latest-mac.yml','latest-linux.yml','latest-linux-arm64.yml','latest.yml']
for arch in ['arm64','x64']:
    for suffix in ['dmg','dmg.blockmap','zip','zip.blockmap']:expected.append(f'{prefix}macos-{arch}-{version}.{suffix}')
    expected.append(f'{prefix}linux-{arch}-{version}.AppImage')
expected += [f'{prefix}windows-{version}.exe',f'{prefix}android-{version}-release.apk',f'{prefix}android-{version}-release.apk.sha256']
assert len(expected)==17 and set(expected)<=set(assets)
for name in expected:
    a=assets[name];assert a['state']=='uploaded' and a['size']>0 and re.fullmatch('sha256:[0-9a-f]{64}',a['digest'])
metadata=e/'published-update-metadata';metadata.mkdir(exist_ok=True)
subprocess.run(['gh','release','download',tag,'--repo','AutoByteus/autobyteus-workspace','--pattern','*.yml','--pattern','*.apk.sha256','--dir',str(metadata),'--clobber'],check=True)
checked=[]
for p in metadata.iterdir():
    a=assets[p.name];digest='sha256:'+hashlib.sha256(p.read_bytes()).hexdigest();assert digest==a['digest'];assert p.stat().st_size==a['size']
    text=p.read_text();check={'name':p.name,'downloadedSha256':digest,'bytes':p.stat().st_size}
    if p.suffix=='.yml':
        assert re.search(r'^version:\s*[\'"]?'+re.escape(version)+r'[\'"]?\s*$',text,re.M)
        names=re.findall(r'^\s*(?:-\s*)?(?:url|path):\s*(.+?)\s*$',text,re.M);names=[n.strip('\'"') for n in names];assert names and all(n in assets for n in names)
        check['referencedPublishedAssets']=names
        if p.name=='latest-mac.yml':assert any('macos-arm64' in n and n.endswith('.zip') for n in names) and any('macos-x64' in n and n.endswith('.zip') for n in names)
    else:
        checksum,apk=text.split()[:2];assert checksum==assets[apk.lstrip('*')]['digest'].split(':')[1]
    checked.append(check)
for file,arch in [('latest-linux.yml','linux-x64'),('latest-linux-arm64.yml','linux-arm64')]:
    subprocess.run(['python3','scripts/validate_linux_updater_metadata.py','--metadata',str(metadata/file),'--arch-token',arch],check=True)
def hub(name):
    req=urllib.request.Request('https://hub.docker.com/v2/repositories/autobyteus/autobyteus-server/tags/'+name,headers={'User-Agent':'AutoByteus-delivery-verification'})
    with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
image=hub(version);beta=hub('beta');(e/'docker-version-image.json').write_text(json.dumps(image,indent=2)+'\n');(e/'docker-beta-alias.json').write_text(json.dumps(beta,indent=2)+'\n')
assert image['name']==version and image['tag_status']=='active';arches={i['architecture'] for i in image['images'] if i['os']=='linux'};assert {'amd64','arm64'}<=arches
alias_matches=image['digest']==beta['digest']
newest=subprocess.check_output(['python3','scripts/release_versions.py','is-newest',tag],text=True).strip()=='true'
if not alias_matches:
    assert not newest
    decision=[line for line in (e/'docker-release-workflow.log').read_text().splitlines() if '\tMove beta tag\t' in line and 'Z Left ' in line and tag+'` is not the newest recognized release tag.' in line]
    assert len(decision)==1,decision
    alias_disposition='Intentionally unchanged by successful CI: newer v1.4.92-beta.12 was fetched before alias promotion; forward-only newest-tag policy prevented beta.11 replacing the alias. Version-pinned beta.11 multi-arch image is published/visible; no claim alias serves it.'
else:
    alias_disposition='Alias matches the version-pinned published image.'
(e/'docker-alias-policy-disposition.json').write_text(json.dumps({'initialDeliveryCheck':'Failed incorrect assumption that beta alias must match any completed release','resolvedBy':'Actual CI decision line plus freshly fetched recognized tags and documented newest-tag policy','newestCheck':newest,'higherTagObserved':'v1.4.92-beta.12','betaAliasDigest':beta['digest'],'versionManifestDigest':image['digest'],'aliasMatchesVersion':alias_matches,'disposition':alias_disposition,'noSourceTestPipelineOrRegistryMutation':True},indent=2)+'\n')
refs=subprocess.check_output(['git','ls-remote','origin',f'refs/tags/{tag}^{{}}'],text=True).split();assert refs[0]==sha
record={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tag':tag,'releaseCommit':sha,'githubReleaseUrl':release['html_url'],'githubPrerelease':True,'draft':False,'expectedAssets':expected,'allAssetsUploadedNonemptyAndGithubDigestPresent':True,'downloadedMetadata':checked,'desktopWorkflow':37053036495,'androidWorkflow':37053036337,'dockerWorkflow':37053036521,'iosWorkflow':37053036592,'allFourTagWorkflows':'Completed/success, exactly one each, no dispatch/rerun','dockerImage':'autobyteus/autobyteus-server:'+version,'dockerArchitectures':sorted(arches),'dockerManifestDigest':image['digest'],'dockerBetaAliasMatchesVersion':alias_matches,'dockerBetaAliasDisposition':alias_disposition,'iosResult':'CI signed archive/upload step success to App Store Connect/TestFlight; processing availability and installation not independently tested; no public App Store submission.','limits':'Asset publication/digests/update metadata and registry visibility, not local installer launch, actual updater installation, Projects phone proof, full VueTSC or real microphone capability. No installed user environment changes.'}
(e/'publication-verification.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record,indent=2))
