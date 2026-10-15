"""Recompute relevant upstream execution and candidate identity assertions."""
from pathlib import Path
import json,hashlib,subprocess as sp
R=Path.cwd();T=R/'tickets/in-progress/shared-network-workspaces';E=T/'code-review-evidence/crr-011';D=T/'evidence/design-recovery/sr022';I=T/'implementation-evidence/ir-008'
rows=[];count=0
for phase in ['baseline-default','candidate-zero','restored-default']:
 d=json.loads((D/(phase+'.json')).read_text());assert (d['uid'],d['gid'],d['groups'])==(1000,109,[]) and len(set(d['markers']))==1
 for c in d['cases']:
  assert c['sourceHash']==c['newHash'] and c['newHash']!=c['oldHash'];first=[None,None]
  for o in c['observations']:
   count+=1
   for i,v in enumerate(o['reads']):
    if v.get('sha256')==c['newHash'] and first[i] is None:first[i]=v['endSeconds']
  assert first==c['firstExact'];expected=phase=='candidate-zero';assert c['withinFiveSeconds']==expected and all(x is not None and x<=5 for x in first)==expected
  if not expected: assert max(o['endSeconds'] for o in c['observations'])>5
  rows.append({'phase':phase,'case':c['name'],'observations':len(c['observations']),'firstExact':first,'withinFiveSeconds':expected})
build=json.loads((I/'build-result.json').read_text());verified=[]
meta=R/'autobyteus-nfs/out/ir008-local-candidate/release.json';raw=meta.read_bytes();assert json.loads(raw)==build['metadata'];assert build['metadata']['qualifiedTargets']==[]
for f in build['files']:
 p=Path(f['path']);b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==f['sha256'] and len(b)==f['size']
 if p.name.startswith('autobyteus-nfs-'):assert raw in b
 verified.append(f)
# Source and engine build identities are not Docker-image or installation proof.
report={'designerDependencyABA':rows,'rawObservationRowsAudited':count,'scope':'Upstream diagnostic dependency evidence only; no reviewer runtime execution or corrected-public-path signoff','currentCandidateFilesVerified':verified,'embeddedMetadataVerified':True,'engineRebuilt':False,'currentProductFreshness':'pending API-F004','implementationChecksReviewed':json.loads((I/'checks-result.json').read_text()),'limits':['Positive setup fixtures stop at mount boundary','Initial IR008 scratch GID correction retained','Ten raw whitespace diagnostic lines retained, not source whitespace','No current Docker image identity or full qualification inferred']}
(E/'execution-evidence-review.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'designerRows':count,'cases':rows,'currentCandidateFiles':len(verified)}))
