# IR-009 local implementation check commands

Run from `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`. TESTING.md and closer AGENTS.md applied; no closer testing guideline. No API/E2E ownership assumed. Exact selected unit script retained; no flags for paid/live tests. Counts overlap.

## ir-009-focused-initial.log

```bash
pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/collaboration-root-history-public-projection.test.ts tests/unit/agent-execution/backends/antigravity/agy-native-argument-lifecycle.test.ts tests/unit/agent-execution/backends/antigravity/agy-turn-lifecycle.test.ts tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts --no-watch
```

Exit 0. 

## ir-009-production-typecheck.log

```bash
pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json
```

Exit 0. 

## ir-009-prebuild.log

```bash
pnpm -C autobyteus-server-ts prebuild
```

Exit 0. Current shared core/SDK compilation and Prisma generation, no database migration

## ir-009-server-build.log

```bash
pnpm -C autobyteus-server-ts build
```

Exit 0. Includes package prebuild hook, full compile/assets/sanitized built-module bootstrap, not desktop or independent API

## ir-009-native-integration.log

```bash
pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-run-collaboration/native-root-fixture-cleanup.integration.test.ts tests/integration/agent-run-collaboration/native-compaction-root.integration.test.ts tests/integration/agent-run-collaboration/native-root-termination.integration.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts --no-watch
```

Exit 0. 

## ir-009-cumulative-unit.log

```bash
bash /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-009-cumulative-unit-command.sh
```

Exit 0. Same selected owner unit command as IR-008, expanded by current upstream tests; exact script retained. Not whole repository test baseline. AGY live prerequisites not enabled; skips not Pass

## ir-009-web-history.log

```bash
pnpm -C autobyteus-web test:nuxt stores/__tests__/runHistoryStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts tests/integration/web-boundary-guard.integration.test.ts --run
```

Exit 0. 47 store + 3 panel + 3 boundary; expected Vue router injection warnings retained

## ir-009-history-fixture-producer.log

```bash
node /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-009-history-fixture-producer.mjs
```

Exit 0. Rebuilt actual read facade/store over archived real stamped trees. List and scoped equality/strict forest/facts/private bytes. Active row controlled seam, not live

## ir-009-rendered-preview-initial.log

```bash
node /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-009-org-history-preview.mjs
```

Exit 0. Initial interaction assertions pass; mobile full-page capture showed transient resize/stitch artifact on direct image inspection. Retained separately; not final visual evidence

## ir-009-rendered-preview.log

```bash
node /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-009-org-history-preview.mjs
```

Exit 0. Final own dev preview after harness-only viewport paint stabilization; interactions and desktop/mobile directly inspected. Zero errors, one Apollo list replacement warning retained

## ir-009-production-typecheck-final.log

```bash
pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json
```

Exit 0. 

## ir-009-diffcheck.log

```bash
git diff HEAD --check && git diff --cached --check
```

Exit 0. 
