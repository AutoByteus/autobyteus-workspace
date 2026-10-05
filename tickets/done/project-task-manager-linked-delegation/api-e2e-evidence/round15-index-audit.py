from pathlib import Path
import struct,hashlib,json,subprocess,datetime,os
E=Path(__file__).resolve().parent;W=E.parents[3];idx=Path(subprocess.check_output(['git','rev-parse','--git-path','index'],cwd=W,text=True,env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'}).strip());idx=idx if idx.is_absolute() else W/idx;old=(E/'api-015-input-index').read_bytes();new=idx.read_bytes();(E/'api-015-final-index').write_bytes(new)
def parse(b):
 assert hashlib.sha1(b[:-20]).digest()==b[-20:];sig,v,n=struct.unpack('>4sII',b[:12]);assert sig==b'DIRC' and v==2;entries=[];p=12
 for _ in range(n):
  start=p;stat=struct.unpack('>10I',b[p:p+40]);blob=b[p+40:p+60];flags=struct.unpack('>H',b[p+60:p+62])[0];assert not flags&0x4000;z=b.index(b'\0',p+62);name=b[p+62:z];end=start+((z+1-start+7)//8)*8;assert not any(b[z:end]);entries.append((name,stat,blob,flags,b[z:end]));p=end
 return (v,n,entries,b[p:-20])
a,b=parse(old),parse(new);assert a[:2]==b[:2];changes=[]
fields=['ctimeSec','ctimeNano','mtimeSec','mtimeNano','dev','ino','mode','uid','gid','size']
for x,y in zip(a[2],b[2]):
 assert x[0]==y[0] and x[2:]==y[2:] and x[1][6]==y[1][6]
 for k,(before,after) in enumerate(zip(x[1],y[1])):
  if before!=after:assert k!=6;changes.append({'path':x[0].decode(),'field':fields[k],'before':before,'after':after})
assert a[3]==b[3];out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'binaryIndexExact':old==new,'entryCount':a[1],'stageModeBlobPathAndFlagsExact':True,'extensionsAndEntryPaddingExact':True,'bothChecksumsValid':True,'statCacheFieldsOnly':True,'changedStatPaths':len({x['path'] for x in changes}),'changedStatFields':len(changes),'statChanges':changes,'inputSha256':hashlib.sha256(old).hexdigest(),'currentSha256':hashlib.sha256(new).hexdigest(),'scope':'Read-only exact binary DIRC2 audit. Only stat-cache words and corresponding footer changed; no stage/blob/mode/path/flag/extension edit. Original index not restored.'};(E/'api-015-index-stat-audit.json').write_text(json.dumps(out,indent=2)+'\n');print('Scoped Pass binary index only',len(changes),'stat fields on',out['changedStatPaths'],'paths, all45332 entries/nonstat fields/extensions/checksums retained; no index restoration')
