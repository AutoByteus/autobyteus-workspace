import pathlib,json,subprocess,hashlib,difflib
w=pathlib.Path.cwd();e=w/'tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-011';paths=sorted(set(subprocess.check_output(['git','diff','--name-only'],text=True).splitlines()))
assert all(p.startswith(('autobyteus-server-ts/src/','autobyteus-server-ts/tests/')) for p in paths),paths
local=[]; refs={r['path']:r['sha256'] for r in json.loads((e/'input/references.json').read_text())};h=lambda b:hashlib.sha256(b).hexdigest()
for p in paths:
 before=e/'input/source'/p; current=w/p;basis='incoming merge worktree snapshot'
 if not before.exists():
  b=subprocess.check_output(['git','show','HEAD:'+p]);basis='unchanged incoming file reconstructed from safety checkpoint HEAD'
  if str(current) in refs: assert h(b)==refs[str(current)],p
  before=e/'unchanged-input-from-checkpoint'/p;before.parent.mkdir(parents=True,exist_ok=True);before.write_bytes(b)
 b=before.read_text(); a=current.read_text();d=e/'local-diffs'/(p+'.diff');d.parent.mkdir(parents=True,exist_ok=True);d.write_text(''.join(difflib.unified_diff(b.splitlines(True),a.splitlines(True),fromfile='incoming-merge/'+p,tofile='IR-011/'+p)))
 local.append({'path':p,'incomingBasis':basis,'incomingSnapshot':str(before),'incomingSha256':h(before.read_bytes()),'currentSha256':h(current.read_bytes()),'diff':str(d)})
(e/'implementation-local-change-map.json').write_text(json.dumps(local,indent=2)+'\n');
for p in paths:subprocess.run(['git','add','--',p],check=True)
(e/'stage-paths.json').write_text(json.dumps(paths,indent=2)+'\n');
print('individually staged',len(paths));print('unmerged',subprocess.check_output(['git','ls-files','-u'],text=True));print('HEAD',subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'MERGE_HEAD',subprocess.check_output(['git','rev-parse','MERGE_HEAD'],text=True).strip())
for scope,args in [('unstaged',['git','diff','--check']),('selected-cached',['git','diff','--cached','--check','--',*paths]),('integrated-nonticket',['git','diff','--cached','--check','--','.',' :(exclude)tickets/**'.strip()])]:
 r=subprocess.run(args,capture_output=True,text=True);(e/(scope+'-diffcheck.log')).write_text(r.stdout+r.stderr);print(scope,r.returncode,(r.stdout+r.stderr)[:900])
