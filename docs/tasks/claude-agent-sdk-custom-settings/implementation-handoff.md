# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings/design-review-report.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings/review-report.md`
- API/E2E validation report that triggered this Local Fix round: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/tasks/claude-agent-sdk-custom-settings/api-e2e-validation-report.md`

## What Changed

- Implemented the Round 2 backend-only Claude Agent SDK settings-source policy.
- Added a small pure Claude SDK settings-source resolver:
  - runtime turns: `settingSources: ["user", "project", "local"]`
  - model catalog discovery: `settingSources: ["user"]`
- Updated `ClaudeSdkClient` so runtime query options and model-discovery query options both pass explicit `settingSources` from the resolver.
- Removed the stale project-skill-only replacement behavior (`enableProjectSkillSettings ? ["project"] : omitted`) by making runtime sources always include `project` without dropping `user`.
- Applied code-review Local Fix CR-001 by removing obsolete `enableProjectSkillSettings` from the SDK client boundary, `ClaudeSession` callsite, and direct SDK-client tests.
- Removed/reverted stale prior-design Server Settings source-selection artifacts from frontend settings, localization, `ServerSettingsService`, and related tests; no source selector/card/durable setting remains.
- Updated Docker operator docs to clarify automatic Claude Code settings inheritance and Docker `/root/.claude/settings.json` behavior.
- Resolved API/E2E Round 2 broad `RUN_CLAUDE_E2E` Local Fix findings:
  - refreshed Claude team E2E GraphQL model selection and team member payloads to current schema requirements;
  - configured `send_message_to` in Claude team E2E agent definitions where the test expects the tool;
  - made live Write-tool assertions tolerant of Claude's trailing newline;
  - supplied configured tool exposure in direct Claude session-manager test contexts;
  - made live model-catalog assertions tolerant of current Claude reasoning-effort levels and Haiku config schema;
  - merged complementary local and runtime run-history projections so restored Claude team member projections retain earlier local history plus current live SDK history.

## Key Files Or Areas

- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-setting-sources.ts`
- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
- `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-setting-sources.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`
- `autobyteus-server-ts/tests/unit/run-history/services/agent-run-view-projection-service.test.ts`
- `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts`
- `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts`
- `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts`
- `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`
- `autobyteus-server-ts/docker/README.md`

## Important Assumptions

- Runtime turns have a meaningful workspace/project `cwd`; existing `ClaudeSdkClient` behavior still passes `cwd: options.workingDirectory` when provided.
- Global model discovery remains workspace-agnostic, so it intentionally uses only `user` settings.
- No env-only disable escape hatch was implemented; this matches the revised design preference for no normal disable path in scope.
- The API/E2E Local Fix test updates align Claude test fixtures with current schema/tool-exposure rules rather than adding product fallback behavior.

## Known Risks

- Project/local model aliases may not appear in the global model picker until a future workspace-scoped catalog API exists.
- Docker/remote users must place Claude Code settings under the server process user's home; in the Docker image this is normally `/root/.claude/settings.json`.
- Loading `local` during runtime may pick up machine-specific project settings, which is intentional Claude Code parity per Round 2 design.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: Missing Invariant / Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: SDK settings-source policy is centralized in `claude-sdk-setting-sources.ts`; `ClaudeSdkClient` is the only boundary that passes SDK `settingSources`; obsolete `enableProjectSkillSettings` was removed from the SDK client API/callsite/tests; no frontend or server-settings source selector remains. API/E2E Round 2 exposed local fixture/schema drift plus one local projection-source merge defect; none required a requirement or design reroute.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `claude-sdk-client.ts` remains under the 500-line source-file guardrail; new resolver is intentionally tiny and pure. CR-001 obsolete flag cleanup is complete (`grep -R enableProjectSkillSettings autobyteus-server-ts/src autobyteus-server-ts/tests` returns no matches).

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` in the worktree earlier to install workspace dependencies after the isolated worktree initially had no `node_modules`.
- `pnpm --dir autobyteus-server-ts run typecheck` currently fails because `tsconfig.json` includes `tests` while `rootDir` is `src`, producing broad pre-existing `TS6059` errors for test files outside `src`.
- Source-only typecheck required Prisma client generation in this fresh worktree: `pnpm --dir autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code. API/E2E remains owned by the API/E2E stage; the broad `RUN_CLAUDE_E2E` command below was re-run locally only to verify the reported Local Fix class was resolved before returning to code review.

- Passed: `pnpm --dir autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-view-projection-service.test.ts tests/unit/runtime-management/claude/client/claude-sdk-setting-sources.test.ts tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`
  - Result: 3 test files passed, 13 tests passed.
- Passed: `RUN_CLAUDE_E2E=1 pnpm --dir autobyteus-server-ts exec vitest run tests/integration/services/claude-model-catalog.integration.test.ts`
  - Result: 1 test file passed, 1 test passed.
- Passed: `RUN_CLAUDE_E2E=1 CLAUDE_FLOW_TEST_TIMEOUT_MS=240000 CLAUDE_BACKEND_EVENT_TIMEOUT_MS=120000 CLAUDE_APPROVAL_STEP_TIMEOUT_MS=60000 pnpm --dir autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts -t "Claude"`
  - Result: 1 test file passed, 4 tests passed.
- Passed: `RUN_CLAUDE_E2E=1 CLAUDE_FLOW_TEST_TIMEOUT_MS=240000 CLAUDE_BACKEND_EVENT_TIMEOUT_MS=120000 CLAUDE_APPROVAL_STEP_TIMEOUT_MS=60000 pnpm --dir autobyteus-server-ts exec vitest run tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts tests/integration/services/claude-model-catalog.integration.test.ts tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts tests/integration/agent-execution/claude-session-manager.integration.test.ts tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "Claude"`
  - Result: 6 test files passed, 29 tests passed, 11 skipped.
- Passed after Prisma generation: `pnpm --dir autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Failed / environment-config issue: `pnpm --dir autobyteus-server-ts run typecheck`
  - Failure: broad `TS6059` because `autobyteus-server-ts/tsconfig.json` includes `tests` but has `rootDir: "src"`; this is not specific to the changed files.
- Passed: `grep -R "enableProjectSkillSettings" -n autobyteus-server-ts/src autobyteus-server-ts/tests || true` returned no matches.
- Passed: `git diff --check`

## Downstream Validation Hints / Suggested Scenarios

- Re-run the broad `RUN_CLAUDE_E2E=1` Claude validation set from the API/E2E Round 2 report after code review passes.
- Verify a normal Claude Agent SDK turn receives `settingSources: ["user", "project", "local"]` and keeps `cwd` set to the intended workspace/project directory.
- Verify Claude model discovery receives `settingSources: ["user"]` and can discover user-level gateway-backed models when `~/.claude/settings.json` is configured.
- Verify project-skill materialization still works because runtime source policy includes `project` and allowed tools still include `Skill` through existing session logic.
- Verify restored Claude team member projections include both earlier local history and current live SDK history.
- In Docker, verify docs match runtime expectations: `user` settings resolve to `/root/.claude/settings.json` unless the server user/home is changed.

## API / E2E / Executable Validation Still Required

- API/E2E validation remains required before delivery.
- Because this Local Fix updated repository-resident durable validation and run-history projection source, this package should return through `code_reviewer` before API/E2E resumes.
