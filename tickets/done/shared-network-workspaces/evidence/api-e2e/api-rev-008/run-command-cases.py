from pathlib import Path
import sys
E=Path(__file__).resolve().parent;MODE=sys.argv[1];RESULT=MODE+'-command-runner.json';exec((E/('common-docker.py' if MODE=='LD' else 'common.py')).read_text());setup=json.loads((E/(MODE+'-command-setup-result.json')).read_text());assert setup['result']=='Pass'
try:
 cmd(['exec','-i',V,'sh','-c','cat > /home/admin/api008-command-cases.py'],data=(E/'guest-command-cases.py').read_bytes())
 event('FS01–12 '+MODE+' command-only actual NFS execution started; no application dependency')
 z=g('python3 /home/admin/api008-command-cases.py '+MODE+' '+SRC+' '+setup['connection']['storageId'],timeout=240,check=False);r['guestExecution']=z
 raw=g('cat /home/admin/api008-files-'+MODE+'-v2.json')['stdout'];(E/(MODE+'-commands-result.json')).write_text(raw);d=json.loads(raw)
 for c in d['cases']:event(MODE+' '+c['id']+': '+c['status'])
 r['result']=d['result'];save();assert z['rc']==0 and d['result']=='Pass',d.get('fatal')
except BaseException as x:r['result']='Fail';r['error']=repr(x);save();raise
