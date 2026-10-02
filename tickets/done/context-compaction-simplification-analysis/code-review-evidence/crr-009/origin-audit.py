from pathlib import Path
import json,subprocess,hashlib,re
r=Path(__file__).resolve().parents[5]; e=Path(__file__).resolve().parent
path='autobyteus-server-ts/src/services/server-settings-service.ts'
h=lambda b:hashlib.sha256(b).hexdigest()
refs=['8caa610ff438c288d9aca9f2efe2c33924fbf517','5cb7b049ae3158108bff2cb70ed80e89540586d9','6908ccff483f1eca522caa65bfaaf6dcfcc26750']
records=[]
for ref in refs+['worktree']:
    s=(r/path).read_text() if ref=='worktree' else subprocess.check_output(['git','show',f'{ref}:{path}'],cwd=r).decode()
    regex=re.search(r'^const SENSITIVE_SETTING_NAME = (.+);$',s,re.M).group(0)
    expr=re.search(r'^const SENSITIVE_SETTING_NAME = (.+);$',s,re.M).group(1)
    guard=re.search(r'      if \(SENSITIVE_SETTING_NAME.test\(key\)\) \{\n        return \[false, "Sensitive settings must use their write-only credential editor\."\];\n      \}',s).group(0)
    registration=re.search(r'    this.registerPredefinedSetting\(\n      "AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE",\n[^\n]+\n    \);',s).group(0)
    matches=json.loads(subprocess.check_output(['node','-e',f'process.stdout.write(JSON.stringify({expr}.exec("AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE")))'],cwd=r))
    records.append({'ref':ref,'source_sha256':h(s.encode()),'regex':regex,'guard':guard,'guard_sha256':h((regex+'\n'+guard).encode()),'predefined_registration':registration,'matched_substring':matches[0], 'guard_precedes_metadata':s.index(guard)<s.index('const metadata = this.settingsInfo.get(key);')})
output={'finding':'API-F007','records':records,'same_guard_all_refs':len(set(x['guard_sha256'] for x in records))==1,'baseline_execution':False,'conclusion':'Existing production defect in supported numeric Settings save; source identity is not baseline execution, waiver, or proof every historical product build failed.'}
(e/'origin-audit.json').write_text(json.dumps(output,indent=2)+'\n')
print({'same_guard_all_refs':output['same_guard_all_refs'],'matched_substrings':[x['matched_substring'] for x in records]})
paths={path:[(51,68),(133,136),(235,248),(290,326)],'autobyteus-server-ts/src/api/graphql/types/server-settings.ts':[(57,66),(79,85)],'autobyteus-web/components/settings/CompactionConfigCard.vue':[(65,80),(136,157),(213,251)],'autobyteus-web/stores/serverSettings.ts':[(386,421)],'autobyteus-server-ts/src/config/app-config.ts':[(470,495),(549,557)],'autobyteus-ts/src/memory/compaction/compaction-runtime-settings.ts':[(27,43),(54,62)],'autobyteus-ts/src/agent/loop/llm-phase.ts':[(80,95)],'autobyteus-ts/src/agent/token-budget.ts':[(43,67)],'autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts':[(719,755)]}
evidence=[]
for p,ranges in paths.items():
    f=r/p;s=f.read_text().splitlines();evidence.append({'path':p,'sha256':h(f.read_bytes()),'excerpts':[{'start':a,'end':b,'text':'\n'.join(f'{n}: {s[n-1]}' for n in range(a,min(b,len(s))+1))} for a,b in ranges]})
(e/'source-evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
