# Implementation Handoff — remove-skill-access-mode

All artifact paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-access-mode/tickets/in-progress/remove-skill-access-mode/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High). `ARCH-REV-003` Pass on `SR-005`. Handoff rule: implementation complete with `task_size=Large` or `architectural_risk=High` → `/code_reviewer`.
- Requirements doc: `requirements-doc.md` (approved; REQ-001..006, AC-001..007)
- Investigation notes: `investigation-notes.md` (AF-001..AF-015)
- Solution revision record: `solution-revision-record.md` (current `SR-005`)
- Design spec: `design-spec.md` (`SR-005`)
- Supplemental task artifacts: None. Product Design artifacts: `N/A — not applicable`.
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md` (`ARCH-REV-003`)
- Triggering rework report, revision record, or evidence: `implementation-design-impact-DI-001.md` (raised by implementation against SR-004, resolved by SR-005); `code-review-report.md` and `code-review-revision-record.md` (`CRR-001`, Fail — Local Fix: `CR-001`, `CR-002`)

## Current Implementation Summary

The run-level `skillAccessMode` is removed from current code in autobyteus-ts, the server (run configs, services, every runtime backend, GraphQL, run-history stores, projectors), the web client, the application SDK and both stream-contract packages. The agent definition is the only skill authority. Run history that still stores the value loads and ignores it; new records do not write it. Released app-data migrations keep their behavior through two frozen legacy files. The Daily Assistant template has `read_file`, and every built-in agent is overwritten from its template at startup; the copy-if-missing policy is gone.

- Implementation cycle: `Rework` (current delta: `IR-003`; earlier: `IR-001` baseline, `IR-002`)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-003`
- Related solution revision IDs: `SR-005` (supersedes `SR-004`)
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`, `CRR-002`, `CRR-003`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `DR-002`
- Triggering finding IDs: `IR-003`: `DR-002` re-integration blocker (three merged-in test files). `IR-002`: `CR-001`, `CR-002`. (`DI-001` was raised and resolved before any source change)

Commits on `codex/remove-skill-access-mode` (base `origin/personal` @ `57df63f07`):

| Commit | Content |
| --- | --- |
| `049c54419` | Step 1: frozen legacy shapes; released migrations repointed |
| `f85525ce5` | Built-in agents: overwrite for all, `read_file` on Daily Assistant |
| `cf401a563` | Field removal across packages, tests, docs |
| `1595b8b2c` | `IR-002`: released-upgrade E2E current-contract calls fixed; orphaned comment and leftover blank lines removed |
| `d213b6c33` | Delivery merge of `origin/personal` @ `e9aa4a74c` (Background Tasks ticket, `1.4.92-beta.3`) |
| `a341dad0f` | `IR-003`: field removed from three test files that arrived with that merge |

Ticket documents are not committed, matching the state in which the package arrived.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 340 files changed over the four commits: 226 test files and 114 others (source, 13 docs, committed `dist` and generated output). Contract removals in GraphQL, SDK and two stream-contract packages; persisted reader/writer shape change; released migrations repointed.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` open. One item recorded for the reviewer under Known Risks (AGY capsule manifest, a stored subject the design did not list).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Catalog appended whenever effective skills exist; no mode check | `autobyteus-ts/src/agent/system-prompt/append-configured-skills-catalog.ts`; `agent/context/agent-config.ts` (positional ctor param, field, `copy`, `toString` removed); `agent-context-like.ts`; enum file deleted; server `autobyteus-agent-run-backend-factory.ts` positional call updated | Done. Catalog wording and "no skills → no catalog" unchanged. |
| BEH-002 | Codex / Claude / ACP / AGY always materialize effective skills | `backends/shared/workspace-skill-materializer.ts`, `codex/backend/codex-thread-bootstrapper.ts`, `claude/backend/claude-session-bootstrapper.ts`, `claude/backend/claude-agent-run-context.ts`, `acp/backend/acp-agent-run-backend-factory.ts`, `antigravity/backend/agy-agent-run-backend-factory.ts`, `antigravity/capsule/agy-run-capsule.ts`, `agy-configured-skill-materializer.ts` | Done. AGY: the `enabled` flag is removed rather than re-derived; with zero bindings the materializer behaves as it did for `PRELOADED_ONLY` with zero skills (creates an empty `.agents/skills`, returns no snapshots). |
| BEH-003 | No field in web types, stores, forms, queries or launch payloads | `autobyteus-web` types, stores, services, utils, composables, two config components, `graphql/queries/runHistoryQueries.ts`; guard removed from `agentOrgRunLaunchSeed.ts`; equality term removed from `teamRunConfigUtils.ts`; "skill access mode is required" check removed from `agentRunStore.ts` | Done. |
| BEH-004 | Field and type removed from GraphQL, SDK, stream DTOs | `api/graphql/types/{agent-run,agent-team-run,agent-org-run,run-history}.ts` (`SkillAccessModeEnum` no longer registered); `application-sdk-contracts/src/index.ts`; `application-backend-sdk/src/{launch-profile,index}.ts`; both stream-contract packages `src` + committed `dist`; `team-execution-view-projector.ts`; `application-run-binding-launch-service.ts` (`skillMode()` removed); `autobyteus-web/generated/graphql.ts` regenerated | Done. |
| BEH-005 | New records omit the field; old records load | `run-history/store/run-execution-tree-shared-record-schemas.ts` (key dropped from required keys, validation and projection), `agent-run-metadata-{store,types}.ts` | Done. No version branch in the reader. |
| BEH-006 | Daily Assistant overwritten at startup; template has `read_file` | `built-in-agents/built-in-agent-{registry,bootstrapper}.ts`, `templates/daily-assistant/agent-config.json`, `scripts/smoke-built-in-agents-bootstrap.mjs` | Done. `BuiltInAgentSyncPolicy`, `syncPolicy`, both seed helpers and the now-unused `exists` helper removed. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New, frozen: `autobyteus-server-ts/src/app-data-migrations/legacy/released-skill-access-mode.ts`, `.../legacy/released-team-run-config.ts` (copied from `team-run-config.ts` at `57df63f07`; exported names prefixed `Released`; the four current-only launch-settings helpers were left out because no released migration uses them).
- Repointed, no logic change: `legacy/released-run-package-shapes/{run-execution-tree-shared-records-v2,run-execution-tree-shared-record-schemas-v2,team-run-execution-tree-v2,agent-org-run-execution-tree-v1}.ts`, `legacy/team-run-metadata-{schema,types}.ts`, `migrations/team-run-execution-tree-v1/{predecessor-team-run-planner,team-run-execution-tree-v1-builder,predecessor-team-metadata-converter,team-run-execution-tree-v1-schema,team-run-execution-tree-v1-types}.ts`, `migrations/team-run-member-tree-prerequisite-converter.ts`, `migrations/remove-global-skill-discovery-mode-migration.ts`, `migrations/team-run-execution-tree-v2-app-data-migration.ts`.
- New tests: `tests/unit/app-data-migrations/released-skill-access-mode-frozen-shapes.test.ts`, `tests/unit/run-history/removed-skill-access-mode-record-tolerance.test.ts`.
- Deleted: `autobyteus-ts/src/agent/context/skill-access-mode.ts`, `autobyteus-server-ts/tests/e2e/runtime/skill-access-mode-graphql.e2e.test.ts` (it only tested the removed enum).

## Important Assumptions

- `released-team-run-config.ts` imports the `RuntimeKind` and `TeamBackendKind` enums as types, as the existing frozen files do. The reviewer flagged this as a wording point in the design's allowed-import sentence; I read it as permitted.
- Test fixtures named "current" now produce the current shape without the field. Migration tests that seed released data get the field from `tests/fixtures/released-run-tree-fixtures.ts`, whose job is the current → released shape change.

## Known Risks

1. **AGY capsule manifest is a fourth stored subject.** `memory/.../agy-project/manifest.json` stored `skillAccessMode`. The design's persisted-data section lists three subjects and not this one, though its removal plan does list `agy-run-capsule.ts`. `restoreAgyRunCapsule` parses the manifest without key validation and never read the field, so old manifests restore unchanged and new ones omit the key. I treated it as covered by `Directly Usable — No Migration` and added a test. Flagging it so the reviewer can decide whether the design record needs the fourth subject added.
2. **`generated/graphql.ts` regeneration carries unrelated drift.** The committed file was stale against the schema. Besides the field and enum removal, regeneration reorders several types and adds the `GetSkillNameIssues` operation types that a current query document already needed. Regeneration used a schema SDL emitted from the worktree's `buildGraphqlSchema()`, not a running server.
3. **Test helpers that launched with `NONE` now follow the definition.** `test-support/live-e2e/live-e2e-harness.ts`, `tests/fixtures/codex-thread-event-harness.ts`, `tests/fixtures/accepted-attachment-message.ts` and two AGY browser probes (`autobyteus-web/tests/e2e/agy-*.mjs`) passed `NONE`. They now expose whatever skills their test definitions have. I did not run the live or probe suites.
4. **One live E2E wait condition changed.** `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` polled `metadataConfig.skillAccessMode === "PRELOADED_ONLY"` as a bootstrap signal; it now polls `metadataConfig.runtimeKind`. Not executed (needs a live runtime).
5. **Server test files are not typechecked.** `pnpm -C autobyteus-server-ts typecheck` reports only `TS6059` rootDir errors for tests, on base as well, so type errors in the 150 changed server test files would not surface. Vitest executes them, which catches runtime breakage only.
6. Design risks R-1..R-5 stand as written; R-3 is now covered by a unit test.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Cleanup` plus a small behavior change for built-in sync
- Reviewed root-cause classification: `Duplicated Policy Or Coordination` with `Legacy Or Compatibility Pressure`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `Yes` — once, `DI-001` against SR-004 (released V1 tree migration used the current `TeamRunConfig` class as a value). Resolved in SR-005 before implementation started.
- Evidence / notes: no replacement flag, default or "always PRELOADED_ONLY" constant exists in current code.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — no changed source file is above 500 non-empty lines; the only additions above a few lines are the two new legacy files (9 and 182 lines).
- Notes: final gate `git grep -i "skillAccessMode\|skill_access_mode"` outside historical tickets and logs. Every remaining occurrence was read line by line for `IR-002`; none addresses a current contract:
  - `src/app-data-migrations/**` (12 files): frozen shapes and released migrations.
  - `tests/unit/app-data-migrations/**` (10 files), `tests/fixtures/app-data-migrations/**` (7 files), `tests/fixtures/released-run-tree-fixtures.ts`: released-era seed data and the frozen-shape tests.
  - `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` lines 254, 263, 294: released-shape seed data only. **Correction:** at `IR-001` this file also sent the field in four current GraphQL inputs and expected it in four places of the current resume tree. The `IR-001` gate grouped the whole directory as "migration tests" without reading it, and the statement made then was wrong for this file. Fixed in `IR-002` (`CR-001`).
  - Three persisted-tolerance tests (run-history records, AGY manifest, older application bundle) and three negative assertions (`not.toHaveProperty` / `not.toContain`).
  - The applied Prisma SQL, and one sentence in `docs/modules/run_history.md` describing what the released `20260706` migration rewrites.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration` for agent run metadata and team / agent-org execution trees; `Discard or Rebuild` for Daily Assistant app-data files.
- Design-spec decision reference: `design-spec.md` → "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: `removed-skill-access-mode-record-tolerance.test.ts` writes each record kind to disk with the stored key set to `PRELOADED_ONLY` and to `NONE`, reads it through the real store, and asserts the rewritten key set excludes the field. Daily Assistant: bootstrapper test edits the definition and adds an agent-local skill, then asserts files equal the template and `skills/` is gone after the next bootstrap.
- Migration implementation: not applicable. Released migrations: no accept/reject change; see the frozen-shape tests below.
- Deviation from the reviewed transition decision: `None`. See Known Risk 1 for the unlisted AGY manifest.

## Environment Or Dependency Notes

- The worktree had no `node_modules`; I ran `pnpm install --frozen-lockfile` and built the workspace packages. Untracked build outputs remain and are not committed: `dist/` under `autobyteus-application-sdk-contracts`, `autobyteus-application-backend-sdk`, `autobyteus-application-frontend-sdk`, `autobyteus-application-devkit`, `applications/brief-studio`, `applications/socratic-math-teacher`.
- Baselines came from a temporary worktree at `57df63f07`, since removed.

## Local Implementation Checks Run

Results are compared per test against the same command on base `57df63f07`.

| Check | Command | Result |
| --- | --- | --- |
| Server source typecheck | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | Clean. Also clean after step 1 alone, with the enum still present. |
| Server build + smoke | `pnpm -C autobyteus-server-ts build` | Passed, including the built-in agents bootstrap smoke check. |
| Server tests | `pnpm -C autobyteus-server-ts exec vitest run --no-watch`, server and bundled applications built on the branch; base worktree with the server built | Branch (`IR-002`): 4,380 passed, 149 failed, 181 skipped. Base: 4,342 passed, 171 failed. No test fails on the branch that passes on base. All 149 branch failures also fail on base with the same first failure line (one differs only in a temp-directory name). 22 tests fail on base only: 20 in `tests/integration/application-backend/*` because the bundled applications were not packed in my base worktree, and 2 in `token-usage-analytics-graphql.e2e.test.ts` that I did not investigate. **Correction:** the `IR-001` comparison ran without a server build on either side, so build-dependent E2E files were not exercised, and its "failure messages match base" check covered only files I had changed; both statements overstated what was compared. |
| Released-upgrade E2E (`CR-001`) | `vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`, server built on branch and base | Same outcome on both: 1 passed, 3 failed. Failing test-file lines, base → branch: 741 → 740, 850 → 849, 1320 → 1312. The shifts equal the lines removed above each point (1, 1 and 8), so no test fails earlier on the branch. The three failures are pre-existing. |
| autobyteus-ts build | `pnpm -C autobyteus-ts build` | Passed. |
| autobyteus-ts typecheck incl. tests | `tsc --noEmit -p tsconfig.json` | 281 errors, the same set as base. |
| autobyteus-ts tests | `vitest run tests/unit/agent/context tests/unit/agent/system-prompt tests/unit/agent/bootstrap-steps tests/integration/agent/agent-skills.test.ts` | 44 passed. `tests/unit/agent` as a whole: 74 files pass, then the run hangs; base hangs at the same point. The full package suite was not completed for that reason. |
| Web tests | `pnpm -C autobyteus-web test:nuxt --run` | 3,373 passed, 4 failed. Base: 3,374 passed, 4 failed. Same failures; one test case removed with the guard it tested. |
| Web typecheck | `tsc --noEmit -p tsconfig.json` | 599 errors, same count and same locations as base. `.vue` files are not covered by this command (`vue-tsc` is not installed). |
| SDK contracts | `pnpm -C autobyteus-application-sdk-contracts test` | 6 passed. |
| Backend SDK | `pnpm -C autobyteus-application-backend-sdk test` | 10 passed. |
| Team stream contracts | `pnpm -C autobyteus-team-stream-contracts test` | 2 passed. |
| Collaboration stream contracts | `pnpm -C autobyteus-collaboration-stream-contracts test` | 1 passed, 7 failed — identical on base (schema `strict()` failures on unrelated keys such as `schema_version`). |
| Bundled applications | `pnpm -C applications/brief-studio build`, `... socratic-math-teacher build` | Both packed. |

Tests required by the design:

| Requirement | Where | Result |
| --- | --- | --- |
| AC-002 catalog present / absent | `append-configured-skills-catalog.test.ts`, `agent-skills.test.ts` (no `NONE` case remains) | Pass. `ALL_INSTALLED` resolution is covered by the existing `skill-service-all-installed-scope.test.ts`; no single test drives an `ALL_INSTALLED` definition through to a rendered system prompt. |
| AC-003 exposure with no mode input | materializer, Codex, Claude, ACP, AGY unit tests updated | Pass |
| AC-004 / AC-005 | `removed-skill-access-mode-record-tolerance.test.ts` (7 tests) | Pass |
| AF-004 V2 output under frozen strict V2 schema | `released-skill-access-mode-frozen-shapes.test.ts` | Pass |
| Frozen-validator equivalence (five validators: accept both values, reject unknown and missing) | same file | Pass |
| AF-015 V1 planner output carries the field, passes V1 schema, structural rejections reject | same file | Pass. Mutation check: deleting the field from `cloneReleasedTeamRunNode` makes two of these tests fail. |
| AC-006 / AC-007 | `built-in-agent-bootstrapper.test.ts`, smoke script | Pass |
| R-3 older bundle sends the field | `application-run-binding-launch-service.test.ts` | Pass |

The equivalence tests assert the contract the validators had on base; they import the new legacy files, so they were not themselves run against base.

## Frontend Rendered-Result Check

`Not Applicable`. No UI control for this setting existed and none was added or removed. The two changed components (`AgentOrgRunConfigPanel.vue`, `ExistingRunConfigEditor.vue`) lose only a script-level config property. I did not render the app.

## Downstream Coverage Hints / Suggested Scenarios

- Launch, stop and restore a standalone agent, a team and an agent-org run from the web client against the worktree server; confirm the GraphQL inputs are accepted without the field.
- Open history written by the released version (records containing `skillAccessMode`), for all three record kinds, and restore a run.
- AutoByteus runtime: Daily Assistant (`ALL_INSTALLED`) system prompt contains the catalog, and it can call `read_file` on a cataloged `SKILL.md`.
- Codex / Claude / AGY: configured skills are materialized as before.
- Upgrade path on a data root older than `20260814`: migrations `20260814`, `20260824`, `20260901` still succeed.
- Restart with an edited Daily Assistant: files equal the template afterwards.
- Application launch from a bundled app (Brief Studio).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Not run by implementation: `pnpm test:e2e`, real-provider and Codex live E2E, browser dev-path probes, isolated desktop instance. All of the scenarios above remain to be validated by `api_e2e_engineer`.

## IR-003 Addendum — Files That Arrived With The Delivery Merge

Delivery merged `origin/personal` @ `e9aa4a74c` into the branch (`d213b6c33`). The merged-in Background Tasks ticket added three test files that used the removed field. They are fixed; see `IR-003` in `implementation-revision-record.md`.

| File | Change | Check |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts` | field removed from the member config and `teamConfigs[0]` | Live run with `RUN_CLAUDE_E2E=1`: 1 passed. Before the fix it failed on the GraphQL input (delivery log). |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-updates-live.e2e.test.ts` | field removed from the `createAgentRun` input | Live run with `RUN_AGY_BACKGROUND_E2E=1`: 5 passed. |
| `autobyteus-web/tests/e2e/fixtures/background-tasks-panel.page.vue` | field removed from the `AgentRunConfig` cast | Not executed; the browser probe that loads it was not run. No runtime effect. |

- Server source typecheck on the merged state: clean.
- Grep gate on the merged state, read line by line: besides the categories listed under "Legacy / Compatibility Removal Check", two files added downstream remain and are legitimate — `tests/e2e/run-history/removed-skill-access-mode-history-graphql.e2e.test.ts` (API/E2E persisted-history test) and one sentence in `docs/modules/agent_execution.md` describing the former input.
- Not rerun on the merged state: full server, web, autobyteus-ts and contract-package suites. The file counts and suite numbers earlier in this handoff describe the pre-merge branch.
- I did not review the merged-in Background Tasks production source beyond the field search and the typecheck.
