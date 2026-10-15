"""Public current reconnect refuses owned replacements; restore originals without state editing."""
exec((__import__('pathlib').Path(__file__).resolve().parent/'mac-common.py').read_text())
OUT='mac-controls-result.json';prior=json.loads((E/'mac-native-result.json').read_text());assert prior['result']=='Pass';r['baseline']=prior['baseline'];r['connection']=prior['connection']
def unchanged():
 b=m('sudo -n cat '+Q(STATE+'/hosted-filesystem.json'))['stdout'];assert b==r['baseline']['bindingBytes'];return hashlib.sha256(b.encode()).hexdigest()
def refuse(expected):
 q=m(B+' reconnect --yes --json',90,False);assert q['rc']!=0 and expected in q['stderr'],q;unchanged();return q
try:
 case('replace owned directory at same path with copied marker/content',lambda:m('set -e; mv '+SRC+' '+SRC+'-original; mkdir -m 755 '+SRC+'; cp -R '+SRC+'-original/project '+SRC+'-original/.autobyteus-nfs '+SRC+'/; cmp '+SRC+'/.autobyteus-nfs/storage.json '+SRC+'-original/.autobyteus-nfs/storage.json; stat -f "%d:%i:%u:%g:%Lp" '+SRC+' '+SRC+'-original'))
 v=capture('directory-replacement');assert v['stat'].split(':')[1]!=r['baseline']['stat'].split(':')[1];assert v['markerBytes']==r['baseline']['markerBytes'];case('public reconnect rejects actual new directory despite copied marker',lambda:refuse('source volume/directory identity changed'))
 case('restore exact original directory',lambda:m('set -e; mv '+SRC+' '+SRC+'-replacement; mv '+SRC+'-original '+SRC));assert capture('directory-restored')['stat'].split(':')[1:]==r['baseline']['stat'].split(':')[1:]
 case('restored original public reconnect',lambda:m(B+' reconnect --yes --json',90));case('restored original mounted nonroot RW',lambda:mounted_proof('directory-restored'))
 case('replace path with symlink to exact original',lambda:m('set -e; mv '+SRC+' '+SRC+'-original; ln -s '+SRC+'-original '+SRC));case('public reconnect rejects symlink source',lambda:refuse('not a symlink'));case('restore source after symlink control',lambda:m('set -e; test -L '+SRC+'; rm '+SRC+'; mv '+SRC+'-original '+SRC));case('symlink restore reconnect',lambda:m(B+' reconnect --yes --json',90))
 case('remove source access permission without ownership change',lambda:m('chmod 000 '+SRC));case('public reconnect rejects nonroot write denial',lambda:refuse('permission denied'));case('restore original permission',lambda:m('chmod 755 '+SRC));case('permission restore reconnect',lambda:m(B+' reconnect --yes --json',90));case('post-controls nonroot mounted RW',lambda:mounted_proof('controls-restored'));unchanged()
 r['result']='Pass';save()
except BaseException as x:r['result']='Fail';r['fatal']=repr(x);save();event('controls failure '+repr(x))
print(json.dumps({'result':r['result'],'fatal':r.get('fatal')}),flush=True)
