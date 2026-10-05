# IR-011 local implementation commands
Workdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`. Local build/typecheck/unit/narrow Native integration and normal Nuxt development preview only. No independent API/E2E/paid/provider/desktop product acceptance. Counts overlap. Logs/results are separate; failures and skips retained.

## Dependencies / production
- `pnpm install --frozen-lockfile --ignore-scripts` — exit0, locked upstream tar installed; no lockfile change. Unbuilt devkit CLI bin warnings retained.
- Initial generic `pnpm -C autobyteus-server-ts exec tsc --noEmit` — exit2, repository tsconfig includes tests outside src rootDir; retained in typecheck-initial.log, not production compile certification.
- `pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json` — first exit2 (merged type recursion/stale DTO import/tar missing), corrected final exit0.
- `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` — initial exit0. Final production tsc then `pnpm -C autobyteus-server-ts build` exit0 after all source edits. Includes shared/core/SDK builds, Prisma client generation, clean server/assets and sanitized bootstrap. No data migration/user DB operation.
- `pnpm -C autobyteus-server-ts exec tsc --noEmit -p ../tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-011/tests-tsconfig.json` — two failed fixture-type attempts retained; final exit0. Seven selected tests plus actual transitive helpers, normal strict config, no type/assertion weakening.

## Affected unit scopes
Focused initial/reconciled logs and failed outcomes remain attached. Final small selections:
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/skills/github/runtime-generation.test.ts tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts --no-watch` — managed-admission.log,2/34 Pass.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-agent-run-backend-factory.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/services/agent-streaming/collaboration-public-tree-projection.test.ts --no-watch` — reconciled-focused-final.log,3/58 Pass.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration/task-lifetime-tree-scope.test.ts tests/unit/agent-team-execution/team-run-model-selection-save.test.ts tests/unit/agent-execution/backends/claude/session/claude-input-terminal-release.test.ts tests/unit/skills/github/runtime-generation.test.ts --no-watch` — strict-checked-units-final.log,4/47 Pass.

Wide local unit command:
```bash
pnpm -C autobyteus-server-ts exec vitest run \
 tests/unit/agent-collaboration tests/unit/agent-execution \
 tests/unit/agent-org-execution tests/unit/agent-team-execution \
 tests/unit/standalone-agent-run-root \
 tests/unit/agent-tools/project-tasks tests/unit/agent-tools/task-delegation \
 tests/unit/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.test.ts \
 tests/unit/projects \
 tests/unit/run-history/services/collaboration-root-history-public-projection.test.ts \
 tests/unit/run-history/services/collaboration-root-history-readiness.test.ts \
 tests/unit/services/agent-streaming/collaboration-public-tree-projection.test.ts \
 tests/unit/services/agent-streaming/agent-collaboration-task-lifetime-projection.test.ts \
 tests/unit/skills/github tests/unit/runtime-management/claude/client \
 tests/unit/runtime-management/codex/client --no-watch
```
Exit1;227files2046tests Pass,3files4tests Fail,3files5tests Skip. Exact unchanged checkpoint/test/source provenance is separate; no whole-suite Pass. Later fixture-only typed changes pass their focused recheck. No opt-in live provider flags set.

`pnpm -C autobyteus-server-ts exec vitest run tests/architecture --no-watch` — exit1;3files43tests Pass /one unchanged old blanket Project/execution boundary assertion Fail. Not repaired/waived. Exact checkpoint affected source and test provenance retained.

## Narrow integration
```bash
pnpm -C autobyteus-server-ts exec vitest run \
 tests/integration/standalone-agent-run-root/native-compaction-root.integration.test.ts \
 tests/integration/standalone-agent-run-root/native-root-fixture-cleanup.integration.test.ts \
 tests/integration/standalone-agent-run-root/native-root-termination.integration.test.ts \
 tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts --no-watch
```
First duplicate fixture catalog setup exit1/2fail; corrected final4files31tests Pass. Actual native fixture-owned resources and root/ProjectStore lifecycle with controlled local backend for Task address helpers, not paid model/API/desktop proof.

## Web / rendered self-check
`pnpm -C autobyteus-web test:nuxt run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts composables/__tests__/useWorkspaceHistorySubjectActions.coldHistory.spec.ts stores/__tests__/runHistoryStore.spec.ts stores/__tests__/agentRunCollaborationStore.spec.ts services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts services/agentCollaboration/__tests__/agentRunCollaborationHydration.spec.ts --no-watch` — 5files74tests Pass; the last selector is not an existing test file and contributes no coverage. Existing missing-router injection warnings retained.

`node tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-011/rendered-preview.mjs` — fresh test-owned random-port `pnpm exec nuxi dev --host 127.0.0.1 --port <port>` and fresh Chrome headless, no desktop app. First own locator strictness failure retained, corrected final Pass without product edits. Current production Task rows/store/GraphQL facade hydration/message panel over public controlled fixture. Keyboard/click selection/disclosure, exact child browse locator, host label,1440/390 viewport, error-preserved data/empty/recovery. Temporary route/browser/server removed; no write/send/restore operation.

## Integrity / source self-review
`stage-integration.py`: only28 exact individual source/test paths staged, including14 original conflicts. No commit or finalization. `audit-integrated-package.py`: three-way/current byte/rename/reference/durable/source-health checks, not execution or correctness certificate. Full cached diffcheck exit2 includes inherited upstream evidence-file whitespace and one upstream web test blank EOF; selected28 cached diffcheck and unstaged diffcheck exit0. No unrelated evidence whitespace edited.
