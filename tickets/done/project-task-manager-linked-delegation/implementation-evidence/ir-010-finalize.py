from pathlib import Path
import json,subprocess,hashlib,difflib
w=Path.cwd();t=w/'tickets/in-progress/project-task-manager-linked-delegation';e=t/'implementation-evidence';b=e/'ir-010-input';base=json.loads((b/'preservation.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def git(*a):return subprocess.check_output(['git',*a])
allow={'autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts','autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-cleanup.ts','autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts'}
new='autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-input-terminal-release.test.ts'
allowed_refs={str(w/p) for p in allow}|{str(t/p) for p in ['implementation-handoff.md','implementation-revision-record.md','implementation-investigation.md']}
refs_changed=[p for p,h in base['references'].items() if not Path(p).is_file() or sha(Path(p))!=h];assert set(refs_changed)==allowed_refs,(refs_changed,allowed_refs)
changed=[p for p,h in base['dirty'].items() if not (w/p).is_file() or sha(w/p)!=h];assert set(changed)==allow
s=git('status','--porcelain=v1','-z','--untracked-files=all');rows={row[3:].decode():row[:2].decode() for row in s.split(b'\0') if row and not row[3:].startswith(b'tickets/')};prior={row[3:].decode():row[:2].decode() for row in (b/'status.z').read_bytes().split(b'\0') if row and not row[3:].startswith(b'tickets/')}
assert set(rows)==set(prior)|{new};assert all(rows[p]==v for p,v in prior.items() if p not in allow);assert all(rows[p][0]==v[0] for p,v in prior.items())
idx=Path(git('rev-parse','--git-path','index').decode().strip());assert sha(idx)==base['index'];assert hashlib.sha256(git('ls-files','--stage')).hexdigest()==base['stages'];assert not git('ls-files','-u');assert git('rev-parse','HEAD').decode().strip()==base['head'];assert git('rev-parse','refs/stash').decode().strip()==base['stash'];assert git('branch','--show-current').decode().strip()==base['branch']
api=json.loads((e/'ir-009-package-fingerprints.json').read_text())['apiDurable20'];assert len(api)==20 and all(sha(w/p)==h for p,h in api.items())
assert (t/'implementation-revision-record.md').read_bytes().startswith((b/'implementation-revision-record.md').read_bytes());assert (t/'implementation-investigation.md').read_bytes().startswith((b/'implementation-investigation.md').read_bytes())
for name in ['implementation-handoff.md','implementation-revision-record.md','implementation-investigation.md']:assert sha(b/name)==base['references'][str(t/name)]
subprocess.run(['git','diff','--check'],check=True);subprocess.run(['git','diff','--cached','--check'],check=True)
(e/'ir-010-final-status.txt').write_bytes(git('status','--short','--untracked-files=all'))
record={'head':base['head'],'branch':base['branch'],'stash':base['stash'],'indexUnchanged':True,'stagesUnchanged':True,'zeroUnmerged':True,'diffAndCachedChecks':0,'incomingReferences':len(base['references']),'unchangedIncomingReferences':len(base['references'])-len(refs_changed),'authorizedChangedReferences':refs_changed,'baselineCandidate':len(base['dirty']),'unchangedBaselineCandidate':len(base['dirty'])-len(changed),'authorizedChangedCandidate':changed,'newUnit':new,'currentCandidatePaths':len(rows),'baselineStatusRowsUnchangedExceptAuthorizedSource':True,'authorizedWorktreeStatusChanges':{p:[prior[p],rows[p]] for p in prior if prior[p]!=rows[p]},'apiDurable20Unchanged':True,'apiDurable20':api,'priorRevisionAndInvestigationPrefixExact':True,'allPreviousCanonicalsArchivedExact':True,'currentCandidateHashes':{p:sha(w/p) for p in rows}}
(e/'ir-010-final-preservation.json').write_text(json.dumps(record,indent=2)+'\n')
built={}
for p in allow:
 if '/src/' not in p:continue
 for ext in ['.js','.d.ts','.d.ts.map']:
  d=Path(p.replace('/src/','/dist/')).with_suffix(ext);assert (w/d).is_file();built[str(w/d)]=sha(w/d)
(e/'ir-010-built-boundary-hashes.json').write_text(json.dumps({'scope':'Current local server build only; packaged app not rebuilt or certified','source':{str(w/p):sha(w/p) for p in allow if '/src/' in p},'built':built},indent=2)+'\n')
refs=set(base['references'])|{str(p) for p in t.rglob('*') if p.is_file()}|{str(w/p) for p in rows}|set(built)
for directory in ['autobyteus-server-ts/src/agent-execution/backends/claude','autobyteus-server-ts/src/agent-execution/input','autobyteus-server-ts/src/agent-execution/events','autobyteus-server-ts/tests/unit/agent-execution/backends/claude']:
 refs|={str(p) for p in (w/directory).rglob('*.ts')}
refs.add(str(e/'ir-010-reference-files.json'));assert all(Path(p).is_file() or p==str(e/'ir-010-reference-files.json') for p in refs)
(e/'ir-010-reference-files.json').write_text(json.dumps(sorted(refs),indent=2)+'\n')
print(json.dumps({'references':len(refs),'candidate':len(rows),'baselineUnchanged':len(base['dirty'])-len(changed),'incomingUnchanged':len(base['references'])-len(refs_changed),'api20exact':True,'indexStagesHeadStashExact':True,'zeroU':True,'sourceLimits':json.loads((e/'ir-010-size-audit.json').read_text())[:2]}))
