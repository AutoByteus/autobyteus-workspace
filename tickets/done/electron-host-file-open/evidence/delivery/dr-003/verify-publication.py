import json,datetime,base64,re,hashlib
from pathlib import Path
import yaml
e=Path(__file__).resolve().parent
d=json.loads((e/'release-api.json').read_text());before=json.loads((e/'stable-release-before.json').read_text());after=json.loads((e/'stable-release-after.json').read_text());assets={a['name']:a for a in d['assets']}
assert d['tag_name']=='v1.4.95-beta.9' and d['prerelease'] and not d['draft'] and d['published_at']
assert len(assets)==17 and all(a['state']=='uploaded' and a['size']>0 for a in assets.values())
expected={'latest-mac.yml','latest-linux.yml','latest-linux-arm64.yml','latest.yml'}
assert expected.issubset(assets)
assert before['tag_name']==after['tag_name'] and before['id']==after['id']
metadata=[]
for name in sorted(expected):
 p=e/'updater-metadata'/name
 assert assets[name]['digest']=='sha256:'+hashlib.sha256(p.read_bytes()).hexdigest()
 data=yaml.safe_load(p.read_text());assert data['version']=='1.4.95-beta.9' and data.get('files')
 row={'name':name,'version':data['version'],'downloadSha256MatchesUpload':True,'files':[]}
 for f in data['files']:
  name2=f['url']; assert name2 in assets
  size=f.get('size')
  if size is not None: assert assets[name2]['size']==size
  assert len(base64.b64decode(f['sha512'],validate=True))==64
  row['files'].append({'url':name2,'metadataSize':size,'assetSize':assets[name2]['size'],'sha512WellFormed':True,'releaseAssetExists':True,'metadataSizeMatchesWhenSupplied':size is not None,'missingSizeDisposition':'N/A — current Windows metadata omits size; uploaded asset nonzero size verified' if size is None else 'Not missing'})
 assert data['path'] in assets and len(base64.b64decode(data['sha512'],validate=True))==64
 metadata.append(row)
assert any('macos-arm64' in f['url'] for m in metadata for f in m['files']) and any('macos-x64' in f['url'] for m in metadata for f in m['files'])
assert all(any(arch in n and n.endswith('.AppImage') for n in assets) for arch in ['linux-x64','linux-arm64'])
assert any('windows' in n and n.endswith('.exe') for n in assets)
assert all(any(arch in n and n.endswith(ext) for n in assets) for arch in ['macos-arm64','macos-x64'] for ext in ['.dmg','.dmg.blockmap','.zip','.zip.blockmap'])
apk=next(n for n in assets if n.endswith('.apk')); checksumPath=e/'updater-metadata'/(apk+'.sha256'); checksum=checksumPath.read_text().split()[0];assert re.fullmatch('[a-fA-F0-9]{64}',checksum)
assert assets[apk]['digest']=='sha256:'+checksum.lower()
assert assets[apk+'.sha256']['digest']=='sha256:'+hashlib.sha256(checksumPath.read_bytes()).hexdigest()
record={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'Pass','releaseUrl':d['html_url'],'tag':d['tag_name'],'prerelease':d['prerelease'],'draft':d['draft'],'publishedAt':d['published_at'],'releaseId':d['id'],'assetsCount':len(assets),'assets':[{'name':n,'size':a['size'],'state':a['state'],'digest':a.get('digest'),'url':a['browser_download_url']} for n,a in assets.items()],'updaterMetadata':metadata,'androidChecksumMatchesGitHubUploadDigest':True,'stableLatestUnchanged':True,'stableTag':after['tag_name'],'notesMode':'Generated GitHub beta notes (ticket release-notes.md retained as separate summary)','priorAttempt':'Unsupported mandatory metadata size assumption corrected; raw Windows metadata/attempt log retained; no product change','limits':'Validated API uploaded assets, exact downloaded metadata/checksum hashes, references/nonzero sizes, supplied metadata sizes, version and SHA512 shape. Did not download/hash/install every large desktop binary; successful Desktop CI owns build/signing/packaging checks. iOS CI upload evidence is separate from TestFlight processing/user installation.'}
(e/'desktop-publication-verification.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'result':'Pass','tag':d['tag_name'],'prerelease':True,'assets':len(assets),'updaterFiles':len(metadata),'stableUnchanged':after['tag_name'],'androidChecksumMatches':True},indent=2))
