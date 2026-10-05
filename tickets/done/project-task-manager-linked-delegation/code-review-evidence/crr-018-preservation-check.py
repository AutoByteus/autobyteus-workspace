from pathlib import Path
import json,hashlib,subprocess,datetime
W=Path.cwd();T=W/'tickets/in-progress/project-task-manager-linked-delegation';C=T/'code-review-evidence'
h=lambda b:hashlib.sha256(b).hexdigest();a=json.loads((C/'crr-018-input-preservation.json').read_text())
changed=[p for p,v in a['references'].items() if not Path(p).is_file() or h(Path(p).read_bytes())!=v]
expected={str(T/'code-review-report.md'),str(T/'code-review-revision-record.md')};assert set(changed)==expected,changed
status=subprocess.check_output(['git','status','--porcelain=v1','-z','--untracked-files=all']);chunks=status.split(b'\0');i=0;dirty={}
while i<len(chunks) and chunks[i]:
 s=chunks[i];i+=1;p=s[3:].decode()
 if 'R' in s[:2].decode() or 'C' in s[:2].decode():i+=1
 if p.startswith('tickets/'):continue
 path=W/p;dirty[p]={'status':s[:2].decode(),'sha256':h(path.read_bytes()) if path.is_file() else None}
assert dirty==a['dirty']
index=Path(subprocess.check_output(['git','rev-parse','--git-path','index'],text=True).strip());index=index if index.is_absolute() else W/index
assert h(index.read_bytes())==a['indexSha256'];assert h(subprocess.check_output(['git','ls-files','--stage','-z']))==a['stagesSha256'];assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==a['head'];assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()==a['branch'];assert subprocess.check_output(['git','ls-files','-u'],text=True)==a['unmerged']==''
prior=(C/'crr-018-prior-revision-record.md').read_bytes();current=(T/'code-review-revision-record.md').read_text();prefix=current.split('\n## CRR-018 —')[0];prefix=''.join(v for v in prefix.splitlines(keepends=True) if not v.startswith('| **CRR-018**'));assert prefix.encode()==prior
assert h((C/'crr-018-prior-canonical-report.md').read_bytes())==a['references'][str(T/'code-review-report.md')]
checks={}
for label,cmd in [('diffHEAD',['git','diff','--check','HEAD']),('diffIndex',['git','diff','--cached','--check'])]:
 p=subprocess.run(cmd,text=True,capture_output=True);checks[label]={'exit':p.returncode,'output':p.stdout+p.stderr};assert p.returncode==0,checks[label]
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'incomingReferenceCount':len(a['references']),'missing':[],'changedIncomingReferencesOnlyReviewerCanonicals':changed,'all299NonTicketStatusAndHashesExact':True,'all20IncomingDurablesExactByFullHashComparison':True,'binaryIndexExact':True,'stagesExact':True,'headAndBranchExact':True,'unmerged':0,'CRR001Through017RevisionHistoryReconstructsByteExact':True,'priorCRR017CanonicalExact':True,'noProductionDurableGitOrAppChanges':True,'checks':checks,'initialVerifierFailure':'Retained separately: accidental added newline only, corrected without canonical mutation'}
(C/'crr-018-final-preservation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':'PASS','incomingReferences':len(a['references']),'dirty':len(dirty),'indexExact':True,'priorHistoryExact':True,'diffChecks':checks},indent=2))
