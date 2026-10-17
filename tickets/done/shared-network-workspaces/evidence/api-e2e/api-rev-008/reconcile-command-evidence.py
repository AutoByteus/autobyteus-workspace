"""Validate exact prior unchanged-source filesystem management evidence, not combined UI verdict."""
from pathlib import Path
import json,hashlib,subprocess as sp
R=Path.cwd();E=Path(__file__).resolve().parent;T=E.parents[2];P=E.parent/'api-rev-007';r={'result':'Running','sourceChecks':[],'cases':{},'limits':'One Linux VM/kernel/daemon, LN and LD sequential. No application verdict or independent-client qualification.'}
def save():(E/'command-carried-evidence.json').write_text(json.dumps(r,indent=2)+'\n')
for path in ['autobyteus-nfs','scripts/public/docker','autobyteus-server-ts/src']:
 p=sp.run(['git','diff','--exit-code','f70912934b2a660a92574b777edc7e465a6d34df','--',path],capture_output=True,text=True);r['sourceChecks'].append({'path':path,'rc':p.returncode,'diff':p.stdout});assert p.returncode==0
r['inputHead']=sp.check_output(['git','rev-parse','HEAD'],text=True).strip();r['nativeBinary']=json.loads((E/'build-result.json').read_text())['binary'];assert r['nativeBinary']['sha256']=='3944a3f0696f006ac658475ea335fcc5dd8c9bfc1195c2301ab92608de446b38'
selection={
'FS13': [('LN-lifecycle-result.json',lambda n:n.startswith('L17 ') or n.startswith('L18 ')),('LN-lifecycle-resume-result.json',lambda n:True),('LD-lifecycle-v2-result.json',lambda n:not n.startswith('L20 ')),('LD-lifecycle-upgrade-result.json',lambda n:True)],
'FS14': [('preflight-controls-result.json',lambda n:True),('LN-source-detach-result.json',lambda n:n.startswith('L21 ')),('LD-source-detach-result.json',lambda n:n.startswith('L21 '))],
'FS15': [('selected-create-result.json',lambda n:True),('docker-selected-create-v2-result.json',lambda n:True),('LN-both-create-result.json',lambda n:n.startswith('L06 ')),('LD-both-create-result.json',lambda n:n.startswith('L06 '))],
'FS16': [('LN-source-detach-resume-result.json',lambda n:n.startswith('L25 ')),('LD-source-detach-result.json',lambda n:n.startswith('L25 '))]}
for cid,items in selection.items():
 rows=[]
 for name,pred in items:
  f=P/name;d=json.loads(f.read_text());selected=[c for c in d['cases'] if pred(c.get('name',''))];assert selected and all(c['status']=='Pass' for c in selected),(name,selected)
  rows.append({'path':str(f.relative_to(R)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'rawResult':d['result'],'creditedCases':[c['name'] for c in selected],'notCredited':[{'name':c['name'],'status':c['status']} for c in d['cases'] if c not in selected],'source':d.get('source'),'vm':d.get('vm'),'binary':d.get('binary'),'mode':d.get('mode'),'qualification':'Historical executed command/inspection proof carried only for unchanged source; application health subchecks are context, not a new application gate'})
 r['cases'][cid]={'result':'Pass','kind':'Carried scoped actual execution','receipts':rows};save()
 with (T/'api-e2e-test-case-ledger.md').open('a') as out:out.write('\n- '+cid+' Pass (scoped carry): actual API007 LN/LD command/inspection evidence audited against unchanged NFS/launcher/server source and same native binary. Exact credited/excluded cases and hashes: E8/command-carried-evidence.json. No raw failed attempt promoted wholesale.\n')
r['historicalFailuresNotCredited']={'LN-lifecycle-result.json':'stopped-node Ports-empty harness oracle; corrected actual snapshots in resume','LD-lifecycle-v2-result.json':'already-current upgrade ID-change overassertion outside credited L17–19; actual replacement proof separately credited','LN-source-detach-result.json':'no-drain refusal wording overassertion; corrected repeat separately credited'}
r['result']='Pass';save();print(json.dumps({'result':r['result'],'cases':list(r['cases'])}))
