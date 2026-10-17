from pathlib import Path
import json,subprocess as sp,re
E=Path(__file__).resolve().parent;R=Path.cwd();T=E.parents[2];r={}
def run(a):
 p=sp.run(a,capture_output=True,text=True);return {'argv':a,'rc':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
r['technicalSourceVsInput']=run(['git','diff','--name-only','d3c88f37c30ee74a89a95a4f6906992667c9b875','HEAD','--','.',':!tickets']);assert not r['technicalSourceVsInput']['stdout'].strip()
r['trackedSourceWorkingDiff']=run(['git','diff','--name-only','--','.',':!tickets']);assert not r['trackedSourceWorkingDiff']['stdout'].strip()
r['durableTest']='autobyteus-web/components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts';assert (R/r['durableTest']).is_file()
r['verdict']=json.loads((E/'final-verdict.json').read_text());assert r['verdict']['result']=='Fail'
r['localEvidenceLinks']=[]
report=(T/'api-e2e-execution-coverage-report.md').read_text()
for link in re.findall(r'\]\((evidence/[^)]+)\)',report):
 assert (T/link).is_file(),link;r['localEvidenceLinks'].append(link)
r['caseGroupRows']=[x for x in (T/'api-e2e-test-case-ledger.md').read_text().splitlines() if re.match(r'^\| L\d{2} \|',x)];assert len(r['caseGroupRows'])==26
r['caseGroupCounts']={s:sum((' | '+s+' ') in x for x in r['caseGroupRows']) for s in ['Pass','Fail']};assert r['caseGroupCounts']=={'Pass':24,'Fail':2}
r['newEvidenceJsonParsed']=0
for p in E.glob('*.json'):json.loads(p.read_text());r['newEvidenceJsonParsed']+=1
# No private keys or actual credentials in this round's text evidence. Public keys/paths are not secrets.
r['sensitiveFindings']=[]
for p in E.rglob('*'):
 if not p.is_file() or p.suffix not in ['.json','.log','.md','.py','.mjs']:continue
 text=p.read_text(errors='replace')
 if re.search(r'-----BEGIN (?:OPENSSH|RSA|EC|PRIVATE) PRIVATE KEY-----',text):r['sensitiveFindings'].append(str(p))
assert not r['sensitiveFindings']
r['focusedWhitespace']=run(['git','diff','--check','--',str(T/'api-e2e-coverage-investigation.md'),str(T/'api-e2e-test-case-ledger.md'),str(T/'api-e2e-execution-coverage-report.md'),str(T/'api-e2e-revision-record.md')]);assert r['focusedWhitespace']['rc']==0
r['cleanup']=json.loads((E/'cleanup.json').read_text())['result'];assert r['cleanup']=='Complete'
r['result']='Pass';(E/'final-audit.json').write_text(json.dumps(r,indent=2)+'\n');print('Focused final audit Pass')
