from pathlib import Path
import subprocess,hashlib,json,shutil,datetime
r=Path.cwd();t=r/'tickets/in-progress/collaboration-follow-up-fixes';e=t/'implementation-evidence/IR-001'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
checks=json.loads((e/'verification-checks.json').read_text())
assert {x['name']:x['exit'] for x in checks} == {'verification-web':0,'verification-web-typecheck':2,'verification-whitespace':0}
comparison=json.loads((e/'typecheck-comparison-current.json').read_text())
assert comparison['new_production_diagnostics']==[] and comparison['current_total_diagnostics']>0
sources=json.loads((e/'source-inventory.json').read_text())
for x in sources:
 p=r/x['path'];x['sha256']=sha(p);x['effective_nonempty_lines']=sum(bool(v.strip()) for v in p.read_bytes().splitlines())
 d=subprocess.check_output(['git','diff','--numstat','--',x['path']],text=True).strip()
 x['delta']=[int(v) for v in d.split('\t')[:2]] if d else [len(p.read_bytes().splitlines()),0]
assert len(sources)==39 and sum(x['production'] for x in sources)==24
assert all(x['effective_nonempty_lines']<=500 and sum(x['delta'])<=220 for x in sources if x['production'])
(e/'source-inventory.json').write_text(json.dumps(sources,indent=2)+'\n')
authorities=json.loads((e/'authority-integrity.json').read_text());assert all(sha(Path(x['path']))==x['sha256'] for x in authorities)
tracked=set(subprocess.check_output(['git','diff','--name-only'],text=True).splitlines());assert tracked <= {x['path'] for x in sources}
assert not subprocess.check_output(['git','diff','--cached','--name-only'],text=True).strip()
assert not subprocess.check_output(['git','ls-files','--unmerged'],text=True).strip()
removed=[]
for name in ['autobyteus-application-backend-sdk','autobyteus-application-frontend-sdk','autobyteus-application-sdk-contracts']:
 p=r/name/'dist';assert p.is_dir() and not p.is_symlink()
 assert not subprocess.check_output(['git','ls-files',str(p.relative_to(r))],text=True).strip()
 files=[{'path':str(v.relative_to(r)),'sha256':sha(v)} for v in sorted(p.rglob('*')) if v.is_file()]
 shutil.rmtree(p);removed.append({'directory':str(p),'ownership':'initially absent; created by IR-001 prerequisite build','files':files,'removed':not p.exists()})
assert not (r/'autobyteus-web/pages/ir001-render.vue').exists()
port=subprocess.check_output(['ss','-ltnp','( sport = :31181 )'],text=True)
assert len(port.strip().splitlines())==1
assert not list(Path('/tmp').glob('collab-followup-readiness-*'))
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'review_head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'source_files':len(sources),'production_files':24,'test_files':15,'upstream_references':len(authorities),'all_upstream_hashes_unchanged':True,'no_unexpected_tracked_delta':True,'index_empty_before_source_commit':True,'no_unmerged':True,'temporary_renderer_page_absent':True,'owned_renderer_port_no_listener':True,'runtime_temporary_roots_remaining':[],'removed_owned_prerequisites':removed,'retained_ignored_setup':'node_modules, Nuxt build caches and normal ignored local build outputs; no deployment','runtime_limits':'No backend/native-provider/Electron/user-running process touched. Old AORG ticket/data read-only.'}
(e/'completion-integrity.json').write_text(json.dumps(result,indent=2)+'\n')
print('verified39source/test files,29upstreams; removed3owned setup directories; renderer stopped')
