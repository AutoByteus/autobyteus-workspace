import pathlib,subprocess,json,datetime,time
W=pathlib.Path.cwd();C=W/'tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence'
checks=[
('production-typecheck','pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json'),
('history-agy-builtin','pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/collaboration-root-history-public-projection.test.ts tests/unit/run-history/services/collaboration-root-history-readiness.test.ts tests/unit/services/agent-streaming/collaboration-public-tree-projection.test.ts tests/unit/agent-execution/backends/antigravity/agy-native-argument-lifecycle.test.ts tests/unit/agent-execution/backends/antigravity/agy-turn-lifecycle.test.ts tests/unit/agent-execution/backends/antigravity/agy-stream-process.test.ts tests/unit/agent-execution/backends/antigravity/agy-background-process-groups.test.ts tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts --no-watch'),
('native-integration','pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-run-collaboration/native-root-fixture-cleanup.integration.test.ts tests/integration/agent-run-collaboration/native-compaction-root.integration.test.ts tests/integration/agent-run-collaboration/native-root-termination.integration.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts --no-watch'),
('terminal-neighbors','bash tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-006-terminal-neighbors-command.sh'),
('web-history','pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts tests/integration/web-boundary-guard.integration.test.ts --run'),
('diffcheck','git diff HEAD --check && git diff --cached --check && test -z "$(git ls-files -u)"')]
rows=[]
for name,cmd in checks:
 start=datetime.datetime.now(datetime.timezone.utc).isoformat();now=time.monotonic()
 with (C/('crr-017-'+name+'.log')).open('w') as log: result=subprocess.run(cmd,shell=True,cwd=W,stdout=log,stderr=subprocess.STDOUT)
 row={'name':name,'command':cmd,'started':start,'seconds':round(time.monotonic()-now,2),'exit':result.returncode,'log':str(C/('crr-017-'+name+'.log'))};rows.append(row);(C/'crr-017-executable-results.json').write_text(json.dumps({'scope':'Independent reviewer source/contract checks only, no paid provider, packaged desktop or fresh API acceptance. Counts overlap.','checks':rows},indent=2)+'\n');print(row,flush=True)
print('RESULT',all(r['exit']==0 for r in rows),flush=True)
