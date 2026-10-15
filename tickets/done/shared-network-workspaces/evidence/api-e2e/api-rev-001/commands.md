# Executed repository commands — API-REV-001

All commands from the assigned worktree unless cwd says autobyteus-nfs. Clean environment keys/values and per-suite gates are in run-repository.py; no provider keys/CLI homes inherited. Serial integration prepare precedes API suites. Temporary paths were removed after execution.

## N01 / python-bootstrap-launcher

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; rc: 0; log: `python-bootstrap-launcher.log`

```sh
python3 -m unittest scripts/tests/test_nfs_packaging_and_launcher.py scripts/tests/test_nfs_installer_fixture.py scripts/tests/test_public_docker_launcher_shared_workspace.py -v
```

## N01 / go-race

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/autobyteus-nfs`; rc: 0; log: `go-race.log`

```sh
/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab-nfs-api001-pk2d0kur/go/bin/go test -race -count=1 -v ./...
```

## N01 / go-vet

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/autobyteus-nfs`; rc: 0; log: `go-vet.log`

```sh
/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab-nfs-api001-pk2d0kur/go/bin/go vet ./...
```

## N01 / go-build-native

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/autobyteus-nfs`; rc: 0; log: `go-build-native.log`

```sh
/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab-nfs-api001-pk2d0kur/go/bin/go build -trimpath -o /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab-nfs-api001-pk2d0kur/autobyteus-nfs ./cmd/autobyteus-nfs
```

## N01 / native-version

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; rc: 0; log: `native-version.log`

```sh
/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab-nfs-api001-pk2d0kur/autobyteus-nfs version
```

## N02 / server-targeted

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; rc: 0; log: `server-targeted.log`

```sh
pnpm -C autobyteus-server-ts exec vitest run tests/unit/workspaces/shared-workspace-binding.test.ts tests/unit/agent-execution/backends/shared tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts tests/unit/runtime-management/codex/client/codex-app-server-client-manager.test.ts tests/unit/runtime-management/shared/scoped-project-git-environment.test.ts tests/unit/skills/github/private-profile-source-lifecycle.test.ts tests/unit/agent-execution/backends/antigravity/agy-configured-skill-linker.test.ts tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts tests/unit/api/rest/workspaces.test.ts tests/unit/api/rest/run-file-changes.test.ts --no-watch --maxWorkers=2
```

## N03 / integration-prepare

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; rc: 0; log: `integration-prepare.log`

```sh
pnpm -C autobyteus-server-ts test:integration:prepare
```

## N03 / public-contracts

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; rc: 1; log: `public-contracts.log`

```sh
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts tests/integration/api/run-file-changes-api.integration.test.ts --no-watch --maxWorkers=2
```

## N03 / agy-scripted-linked-skills

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; rc: 0; log: `agy-scripted-linked-skills.log`

```sh
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts --no-watch
```

## N04 / guide-unit

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; rc: 0; log: `guide-unit.log`

```sh
pnpm -C autobyteus-web test:nuxt components/settings/__tests__/NodeManager.spec.ts components/settings/__tests__/NfsGuideCard.spec.ts utils/__tests__/nfsLauncherCommands.spec.ts --run --maxWorkers=2
```

## N04 / terminal-unit

cwd: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; rc: 0; log: `terminal-unit.log`

```sh
pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal --no-watch --maxWorkers=2
```

## N03 fixture correction rerun

Clean environment keys: PATH, HOME, TMPDIR, LANG, CI. rc0, workspace-http-rerun.log.

```sh
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts --no-watch
```

## Actual native VM commands

Each mac-*-result.json retains every guest and host argv, timing, rc/stdout/stderr and cleanup; run-mac-*.py is archival orchestration, not a claim unexecuted matrix code passed. Do not rerun into these evidence paths or against deleted scratch. Use a fresh round and owned clone. Source unchanged; public release remains unqualified.
