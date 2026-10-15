from pathlib import Path
import json,hashlib,tarfile,io,urllib.request
E=Path(__file__).resolve().parent;T=E.parents[2];prev=json.loads((T/'code-review-evidence/crr-010/engine-source-audit.json').read_text());p=Path(prev['archive']);data=p.read_bytes();r={'archive':str(p),'sha256':hashlib.sha256(data).hexdigest(),'files':[],'primary':[]};assert r['sha256']==prev['sha256']
with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as tf:
 names=tf.getnames();orig=[x for x in names if x.endswith('.orig.tar.gz')][0];b=tf.extractfile(orig).read();r['originalSHA256']=hashlib.sha256(b).hexdigest();assert r['originalSHA256']==prev['originalSHA256']
 with tarfile.open(fileobj=io.BytesIO(b),mode='r:gz') as inner:
  for f in prev['files']:
   b=inner.extractfile(f['member']).read();sha=hashlib.sha256(b).hexdigest();assert sha==f['sha256'];lines=b.decode().splitlines();out={'member':f['member'],'sha256':sha,'excerpts':[]}
   for x in f['excerpts']:
    s='\n'.join(lines[x['start']-1:x['end']]);assert s==x['text'];out['excerpts'].append({'start':x['start'],'end':x['end'],'text':s})
   r['files'].append(out)
for name,rel in [('export-contract.txt','src/doc/man/ganesha-export-config.rst'),('cache-validity.txt','src/FSAL/Stackable_FSALs/FSAL_MDCACHE/mdcache_int.h')]:
 url='https://raw.githubusercontent.com/nfs-ganesha/nfs-ganesha/V4.3/'+rel;b=urllib.request.urlopen(url,timeout=30).read();(E/name).write_bytes(b);r['primary'].append({'url':url,'file':name,'sha256':hashlib.sha256(b).hexdigest()})
r['scope']='Personal read-only re-audit of exact retained source members and versioned primary contracts; no engine rebuild or live-cache instrumentation'
(E/'engine-source-check.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'files':len(r['files']),'sha256':r['sha256']}))
