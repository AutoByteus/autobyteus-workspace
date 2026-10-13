from pathlib import Path
import subprocess,json,urllib.request,urllib.parse,re,datetime
pub=Path(__file__).parent;version=(pub/'version.txt').read_text().strip();tag='v'+version
runs=json.loads((pub/'release-workflow-monitor.json').read_text())['runs']
assert len(runs)==4 and all(r['status']=='completed' and r['conclusion']=='success' for r in runs),'Four workflows must succeed before full verification'
p=subprocess.run(['gh','api','repos/AutoByteus/autobyteus-workspace/releases/tags/'+tag],text=True,stdout=subprocess.PIPE,check=True)
release=json.loads(p.stdout);assets=release['assets'];names={a['name'] for a in assets}
expected={f'AutoByteus_personal_android-{version}-release.apk',f'AutoByteus_personal_android-{version}-release.apk.sha256',f'AutoByteus_personal_linux-arm64-{version}.AppImage',f'AutoByteus_personal_linux-x64-{version}.AppImage',f'AutoByteus_personal_windows-{version}.exe','latest-linux-arm64.yml','latest-linux.yml','latest-mac.yml','latest.yml'}
for arch in ['arm64','x64']:
 for suffix in ['dmg','dmg.blockmap','zip','zip.blockmap']:expected.add(f'AutoByteus_personal_macos-{arch}-{version}.{suffix}')
assert release['prerelease'] and not release['draft'] and names==expected and len(assets)==17
assert all(a['state']=='uploaded' and a['size']>0 for a in assets)
yamls={};apkhash=None
for a in assets:
 if a['name'].endswith('.yml') or a['name'].endswith('.apk.sha256'):
  body=urllib.request.urlopen(a['browser_download_url'],timeout=60).read().decode()
  (pub/a['name']).write_text(body)
  if a['name'].endswith('.yml'):
   m=re.search(r'^version:\s*[\"\']?([^\"\'\s]+)',body,re.M);assert m and m.group(1)==version
   urls=re.findall(r'^\s*(?:-\s*)?(?:url|path):\s*[\"\']?([^\"\'\r\n]+)',body,re.M)
   for url in urls:assert urllib.parse.unquote(url.strip()).split('/')[-1] in names,(a['name'],url)
   assert urls;yamls[a['name']]={'version':version,'referencedFiles':urls}
  else:
   apkhash=body.split()[0];assert re.fullmatch(r'[a-fA-F0-9]{64}',apkhash)
apk=next(a for a in assets if a['name'].endswith('.apk'));assert apk.get('digest')=='sha256:'+apkhash,'APK checksum must match GitHub asset digest'
repo='autobyteus/autobyteus-server'
token=json.loads(urllib.request.urlopen('https://auth.docker.io/token?'+urllib.parse.urlencode({'service':'registry.docker.io','scope':'repository:'+repo+':pull'}),timeout=60).read())['token']
accept='application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json'
def manifest(ref):
 req=urllib.request.Request('https://registry-1.docker.io/v2/'+repo+'/manifests/'+ref,headers={'Authorization':'Bearer '+token,'Accept':accept})
 with urllib.request.urlopen(req,timeout=90) as response:return json.loads(response.read()),response.headers['Docker-Content-Digest']
index,digest=manifest(version);platforms={m.get('platform',{}).get('os','')+'/'+m.get('platform',{}).get('architecture','') for m in index['manifests']};assert {'linux/amd64','linux/arm64'}<=platforms
beta,betaDigest=manifest('beta')
newest=subprocess.check_output(['python3','scripts/release_versions.py','is-newest',tag],text=True).strip()
if newest=='true':assert betaDigest==digest,'Newest release must move beta alias to published version'
receipt={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tag':tag,'releaseCommit':(pub/'release-commit.txt').read_text().strip(),'releaseUrl':release['html_url'],'isPrerelease':release['prerelease'],'draft':release['draft'],'allFourWorkflows':'success','assetCount':len(assets),'assets':[{'name':a['name'],'size':a['size'],'digest':a.get('digest'),'url':a['browser_download_url']} for a in assets],'updaterMetadata':yamls,'apkChecksumMatchesGitHubDigest':True,'docker':{'repository':repo,'tag':version,'digest':digest,'platforms':sorted(platforms),'betaDigest':betaDigest,'isNewestRelease':newest,'betaAliasMatchesThisRelease':betaDigest==digest},'iosEvidence':'Archive And Upload To App Store Connect job success; public App Store listing/review not implied','actualPort8001Upgraded':False}
(pub/'publication-verification.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
