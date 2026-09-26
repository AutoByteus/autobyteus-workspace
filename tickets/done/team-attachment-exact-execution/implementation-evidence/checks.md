# Local checks — IR-001

From assigned worktree, 2026-09-26:
- pnpm install --frozen-lockfile --offline --ignore-scripts: success, cached dependencies; expected unbuilt devkit bin warnings.
- pnpm -C autobyteus-server-ts prepare:shared: success; shared-build.log.
- pnpm -C autobyteus-server-ts exec prisma generate --schema prisma/schema.prisma: success; prisma.log.
- pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit: exit 0; server-typecheck.log intentionally empty.
- pnpm -C autobyteus-server-ts exec vitest run tests/unit/context-files tests/unit/app-data-migrations/team-context-file-execution-locators-v1.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts tests/unit/agent-execution/input/agent-run-provider-input-normalizer.test.ts tests/unit/agent-team-execution/services/team-member-input-event-builder.test.ts --no-watch: 12 files / 97 tests pass; server-unit.log.
- pnpm -C autobyteus-web exec nuxt prepare: success; nuxt-prepare.log (required in fresh worktree).
- pnpm -C autobyteus-web test:nuxt stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/teamRunConfigStore.spec.ts utils/contextFiles/__tests__ services/runHydration/__tests__/runProjectionConversation.spec.ts components/conversation/__tests__/UserMessageStoredUploadNames.spec.ts components/conversation/__tests__/UserMessageFirstSubmission.spec.ts components/conversation/__tests__/UserMessageHistoryFiles.spec.ts --run: 10 files / 78 tests pass; web-unit.log.
- git diff --check: pass. Source size guard: pass; source-size-check.txt.
- Browser component self-check: rendered-result-check.md.

Initial iterations corrected missing generated Nuxt config, a fixture variable typo, base unresolved draft validator, and macOS ancestor realpath canonicalization in migration containment checks. Final logs above follow corrections.
Only implementation-scoped checks. No API/E2E suite, real model execution, full frontend typecheck/build, Docker migration, release or deployment performed. Test DB is worktree tests/.tmp, not user data. Shared dist outputs are generated and not source changes; regenerate with prepare:shared if needed.
