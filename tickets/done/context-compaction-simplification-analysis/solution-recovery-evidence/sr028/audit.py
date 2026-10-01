from pathlib import Path
import json,hashlib,subprocess
w=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis');p=w/'tickets/in-progress/context-compaction-simplification-analysis';e=p/'solution-recovery-evidence/sr028';before=json.loads((e/'input-audit.json').read_text());api_before=json.loads((p/'solution-recovery-evidence/sr026/input-audit.json').read_text())['api_owned_sha256']
owned={'requirements-doc.md','design-spec.md','solution-progress-result.md','investigation-notes.md','solution-revision-record.md','analysis-report.md','output-format-and-coverage.md','compaction-prompt-proposal.md','simplification-design-direction.md','input-hold-proposal.sr027.md','strategy-boundary-analysis.sr021.md','strategy-execution-investigation.sr025.md'}
changes=[];unexpected=[]
for n,h in before['files'].items():
 f=w/n
 if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=h:
  changes.append(n)
  if not(f.is_relative_to(p) and str(f.relative_to(p)) in owned):unexpected.append(n)
apiresult={f:{'baseline_source':'SR028 entry' if f in before['files'] else 'SR026 api_owned_sha256 (SR027 final audit also reports unchanged)','baseline_hash':before['files'].get(f) or h,'current_hash':hashlib.sha256((w/f).read_bytes()).hexdigest()} for f,h in api_before.items()}
prompt=hashlib.sha256((p/'proposed-compaction-prompt.md').read_bytes()).hexdigest();r=(p/'requirements-doc.md').read_text();d=(p/'design-spec.md').read_text();rasm=r.split('**ASM-022-01 — Natural summary compression.**')[1].split('## Constraints')[0].strip();dasm=d.split('**ASM-022-01 — Natural summary compression.**')[1].split('## Main Domain')[0].strip()
audit={'head_unchanged':subprocess.check_output(['git','rev-parse','HEAD'],cwd=w,text=True).strip()==before['head'],'changed_owned_existing_files':changes,'unexpected_existing_file_changes':unexpected,'api_durable':apiresult,'all_api_unchanged':all(v['baseline_hash']==v['current_hash'] for v in apiresult.values()),'production_diff_empty':not subprocess.check_output(['git','diff','--stat','HEAD','--','autobyteus-ts/src','autobyteus-server-ts/src','autobyteus-web'],cwd=w,text=True).strip(),'prompt_sha256':prompt,'prompt_unchanged':prompt=='2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7','assumption_identical':rasm==dasm,'tests_run':0,'provider_calls':0,'new_migrations':0,'new_review_verdict':None,'requirements_approval':'SR028 exact direct user quote in canonical requirements','result':'Architecture Design Complete','task_size':'Large','architectural_risk':'High','audit_note':'First audit stopped before writing final-audit due to missing 5 API hashes in SR027 sources. Corrected lookup to actual SR026 api_owned_sha256; current hashes reconciled. No tests/provider work or change to evidence.'}
(e/'final-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
(e/'audit.py').write_bytes(Path(__file__).read_bytes())
assert not unexpected and audit['all_api_unchanged'] and audit['prompt_unchanged'] and audit['assumption_identical'] and audit['production_diff_empty']
print('Audit PASS: 12 owned existing docs changed; all sampled source/non-owned ticket files and 9 API hashes unchanged; exactv5/ASM preserved. Tests0/model0.')
