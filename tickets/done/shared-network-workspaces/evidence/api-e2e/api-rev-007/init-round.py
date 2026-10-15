from pathlib import Path
import hashlib,json,subprocess as sp,datetime
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
up=T/'evidence/acceptance-revision/sr024/review-receipt/package-index.json';pkg=json.loads(up.read_text());refs=pkg['reference_files'];assert len(refs)==1618
rows=[{'path':p,'size':Path(p).stat().st_size,'sha256':sha(Path(p))} for p in refs];assert len(rows)==len(set(refs))
head=sp.check_output(['git','rev-parse','HEAD'],text=True).strip();assert head=='437c20b536b852574afb8258d4562b35b24658a1'
r={'head':head,'source':'d3c88f37c30ee74a89a95a4f6906992667c9b875','authority':'ApprovedSR024 / ReadySR024 / ARCH008; technicalSR023 / IR009 / CRR013','references':rows,'priorRevisionBytes':(T/'api-e2e-revision-record.md').stat().st_size,'priorRevisionSHA256':sha(T/'api-e2e-revision-record.md'),'candidates':[],'dist':[]}
old=json.loads((T/'evidence/api-e2e/api-rev-006/input-audit.json').read_text())
for k in ['candidates','dist']:
 for q in old[k]:
  p=Path(q['path']);assert p.is_file() and sha(p)==q['sha256'];r[k].append(q)
r['status']=sp.check_output(['git','status','--short'],text=True)
(E/'upstream-package-index.json').write_text(up.read_text());(E/'input-audit.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({'head':head,'references':len(rows),'candidates':len(r['candidates']),'dist':len(r['dist'])}))
