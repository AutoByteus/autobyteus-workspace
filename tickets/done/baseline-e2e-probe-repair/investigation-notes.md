# Investigation Notes

## Investigation Meta

- Package identifier: `baseline-e2e-probe-repair`
- Request / ticket: Project Task `6834441c` — "Fix the pre-existing failing server e2e suites and web probes found in the collaboration-model ticket (test-only)", from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair`, branch `codex/baseline-e2e-probe-repair` (new, from the refreshed remote).
- Resolved base remote / branch / revision: `origin/personal` at `db00ba16a9` (fetched 2026-10-17). The receipt named `5096011674`; `origin/personal` has moved on by 183 commits, and every failure still reproduces on `db00ba16a9`.
- Finalization target remote / branch: `origin/personal` (merge; no release unless the user asks, per the Task and RELEASE.md default).
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web exec nuxt prepare` all exited 0 (`evidence/setup-install.log`, `evidence/setup-nuxt-prepare.log`).
- Bootstrap blocker: None.
- Current solution revision ID: `SR-002`
- Authorities read: requirements gate `references/requirements-engineering.md` (2026-10-17); architecture gate `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md` (2026-10-17); `TESTING.md`, `AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` (2026-10-17).
- Investigation status: Complete for requirements and design. Every one of the 11 items has a reproduced failure on the current base and an identified cause.

## Initial Request And Clarifications

- Original request: fix 8 failing server e2e files (27 tests) and 3 web probes that also fail on the base; for each, find the cause (stale test, flaky setup or product defect) and fix the test; report product defects before fixing; update or drop suites that test removed features, with a stated reason; commit each fix separately as a baseline test fix (TESTING.md Rule 9); merge; no release.
- Clarifications received: none needed.
- User-supplied facts and constraints: test-only; related Tasks 0c7efc37, 6d944a46 (done), 7e13a4af, a1dfb6dc, 7ea7804f must not be duplicated; overlaps are merged into one plan.
- Initial ambiguity: whether any failure hides a product defect (checked per item below; none found).

## Product And Domain Understanding

- Product area: server E2E suites (`autobyteus-server-ts/tests/e2e/`) and browser probes (`autobyteus-web/tests/e2e/`).
- Affected actors or systems: developers and validation agents relying on the e2e baseline; Task 7ea7804f, which plans to run these suites in CI and needs a green baseline.
- Existing purpose: each suite proves a supported API journey or upgrade path; each probe proves a renderer journey.
- Terminology: "stale test" = a test that still targets an API, payload or model that the product deliberately changed.

## Source Log

| Date | Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-17 | Doc | `origin/personal:tickets/done/collaboration-model-contract/api-e2e-execution-coverage-report.md` §Failures | Task evidence | Lists the 8 files and 3 probes, identical on base | Reproduce on current base |
| 2026-10-17 | Data | `origin/personal:tickets/done/collaboration-model-contract/evidence/base-e2e-nine-failing-files.log` | Base failure messages | Same messages as today (plus `terminal-websocket-lifecycle`, not in this Task) | — |
| 2026-10-17 | Command | `env -i PATH HOME=<tmp> TMPDIR pnpm exec vitest run --no-watch <8 files>` in `autobyteus-server-ts` | Reproduce on `db00ba16a9` | 8 files failed, 27 failed / 1 passed | `evidence/base-db00ba16a9-eight-suites.plain.log` |
| 2026-10-17 | Command | temporary local patch of `test-support/live-e2e/test-runtime-bootstrap.mjs` `executeGraphql` to print `payload.errors` (reverted, never committed) | `TEST_GRAPHQL_REQUEST_FAILED` hides the GraphQL message | Revealed `refType` and `getTeamMemberRunProjection` errors | Reverted; file identical to base |
| 2026-10-17 | Runtime | throwaway scratch e2e (deleted) seeding the `case-003-nested-task-team` fixture, starting the built server and dumping the memory tree, migration statuses, migration logs and `listCollaborationRootHistory` | Decide stale test vs. lost history | `20260901_agent_org_flat_team_families_v1` FAILED: `rootTeam.members[2].members[2] has unsupported or missing field(s)`; history list empty; sources untouched | See BEH-006 |
| 2026-10-17 | Doc | `tickets/done/flat-agent-organization-model/requirements-doc.md` REQ-002, REQ-013, AC-008, BEH-005, BEH-007 | Is refusing three-level history approved? | Yes: migration must not convert three-or-more-level Teams and must stop before mutation, reporting the invariant | Not a product defect |
| 2026-10-17 | Code | `git show 37d05c7f71^:autobyteus-server-ts/src/run-history/store/team-run-execution-tree-schema.ts` | Did released V2 allow deep nesting? | Yes, `validateConfiguredMember` recursed to any depth before the flat change (released up to v1.4.69) | — |
| 2026-10-17 | Code | `src/app-data-migrations/legacy/released-run-package-shapes/run-execution-tree-shared-record-schemas-v2.ts` `validateConfiguredTeam` | Why the flat migration rejects it | Members of a nested Team must be Agents | Consistent with REQ-013 |
| 2026-10-17 | Code | `src/run-history/services/root-run-package-readiness-index.ts`; `src/run-history/services/team-run-package-catalog.ts`; `agent-run-history-catalog-service.ts:199` | Why seeded runs are "unavailable" | Production writers call `admitCurrent`; packages must be complete | — |
| 2026-10-17 | Runtime | temporary local edit of `recent-run-projection-graphql.e2e.test.ts` adding `admitCurrent` after seeding (reverted) | Test admission hypothesis | 4 of 9 cases then pass; team cases fail admission: `ROOT_RUN_PACKAGE_MANIFEST_INVALID — missing required authorities: team_communication_messages.json` | Seed complete packages |
| 2026-10-17 | Code | `tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts:262` | Established pattern | Sibling suite already admits seeded runs with `new RootRunPackageReadinessIndex(memoryDir).admitCurrent(...)` | Reuse |
| 2026-10-17 | Code | `src/agent-execution/services/agent-run-manager.ts:133` `beginActivation` | Replacement for `prepareNewAgentRun` | `prepareNewAgentRun` removed (`028cca2312`); activation is `beginActivation({ kind: "new", runId, config })` | — |
| 2026-10-17 | Code | `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts:138-200` | `ownLlm is not a function` | Private `createBackend(config, runId, assertAccepting, ownAgent, ownLlm)` gained two parameters; public entry is `beginPreparation({ kind: "new", runId, config }).prepare()` | — |
| 2026-10-17 | Code | `git log -S recoverableBlock` → `6908ccff48` (2026-09-30) | correlated-status diff | `AGENT_STATUS` payload gained `recoverableBlock` (null when nothing is held) | — |
| 2026-10-17 | Doc | `autobyteus-server-ts/docs/modules/agent_team_definition.md` §Member And Coordinator Rules | Nested Team definitions | "Every configured member is an Agent … no `refType`" | — |
| 2026-10-17 | Command | `node tests/e2e/existing-run-model-config-probe.mjs --output-dir …` (clean env) | Reproduce probe | 11 failures: `Unexpected GraphQL operation 'DelegatedLaunchModelOptions'`, `'GetAgentRunCollaboration'`; API-E2E-004-A/D/E wait timeouts | `evidence/probes-base/existing-run-model-config*` |
| 2026-10-17 | Command | `node tests/e2e/interrupt-result-presentation-probe.mjs --output-dir …` (clean env) | Reproduce probe | `SR008-BR-001` click timeout; console: `ws://127.0.0.1:65534/ws/agent-package-definitions` refused; ZodError on agent and Team stream messages; "Team lifecycle message is invalid during 'awaiting_snapshot'" | `evidence/probes-base/interrupt-result-presentation*` |
| 2026-10-17 | Data | `origin/personal:…/evidence/probes/base/run-settings-live-R03/run-settings-live-evidence.json` | R03 cause | `org-launch-run` click timeout: "element is not enabled" after the member's definition was deleted | — |
| 2026-10-17 | Code | `autobyteus-web/components/run-settings/OrgLaunchPage.vue:131-152`, `stores/agentOrgLaunchDraftStore.ts:377-405` | Is disabling Run intended? | `canRun` requires `store.readiness.ready`; a broken topology blocks Run and shows the reason (REQ-006/AC-002, DI-004) | Probe trigger is stale |
| 2026-10-17 | Command | `git log --since=2026-10-14 -- OrgLaunchPage.vue agentOrgLaunchDraftStore.ts run-settings-live-probe.mjs` | Is archived R03 evidence still current? | Only the probe's own 2026-10-15 update; launch-page logic unchanged | R03 not re-run on base (needs signed-in CLIs) |
| 2026-10-17 | Code | `autobyteus-web/package.json` scripts | Probe discoverability | `interrupt-result-presentation-probe.mjs` has no `test:e2e:*` script (TESTING.md: probes are found through their script) | Add script |
| 2026-10-17 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-suite-repair` (read-only) | Prior art | Abandoned, uncommitted 2026-09-30 attempt on base `cb01dea239` touching several of the same suites (including renaming `hierarchical-team-run-config-graphql` → `team-run-config-graphql`) | Outdated base; ideas only, not reused as code |
| 2026-10-17 | Other | Message from `/project_task_manager` (relaying the task-keys-and-dependencies delivery engineer) | Upstream overlap | `team-run-v1-production-upgrade` cause confirmed (flat migration moves the released root to `memory/agent_orgs/team-v1-supported-root/agent_org_run_execution_tree.json`); its ledger-count part is already fixed upstream in `fa49138794` | SR-002: build on it, don't duplicate |
| 2026-10-17 | Command | `git log $(git merge-base HEAD origin/personal)..origin/personal`; `git merge-base --is-ancestor fa49138794 HEAD` | Where upstream stands | Branch is rebased on `66429d6f31`; `origin/personal` is now `516e592d7b`; `fa49138794` is on `origin/personal` but NOT in the branch | Implementation must refresh onto `origin/personal` before committing UC-004 |
| 2026-10-17 | Command | `git log db00ba16a9..66429d6f31` | Other tickets' baseline fixes | UC-001 already fixed upstream (`e6ba249a96`, `2e70401f18`, `57d388a7fd`: TeamRun configuration e2e rewritten for flat Teams as `team-run-config-graphql.e2e.test.ts`); UC-007 already fixed upstream (`149bce0be9`: admit seeded packages, seed current team packages); `065430dd61` removed the remaining team-inside-a-team representations | UC-001/UC-007: verify only (AC-001, AC-007) |
| 2026-10-17 | Data | `evidence/implementation/uc004-team-run-v1-production-upgrade.pending.patch`, `uc004-warning-case-flat-families-failure.txt` (implementation, in progress) | Avoid duplicate work | Pending patch re-implements the ledger change from `fa49138794`; warning case shows the flat migration FAILED_HISTORY on the seeded invalid history index, leaving `team-v1-warning-root` neither Team- nor Org-admitted | Ledger: drop in favour of upstream. Warning case: under investigation by implementation (REQ-011 gate) |
| 2026-10-17 | Other | Same PTM message: PMU-021 (`project-manager-ux` probe) console error on file-explorer WebSocket during `page.reload()` | Scope check | Not one of this Task's 3 probes | Out of scope; stays in Task a1dfb6dc |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger / Contract | Current Product Behavior | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | `createAgentTeamDefinition`, `createAgentTeamRun`, `terminateAgentTeamRun`, `restoreAgentTeamRun` GraphQL | Team definitions are Agent-only (no `refType`); a Team run stores root launch defaults plus per-member configs; restore after restart keeps them; invalid runtime is rejected before workspace or run side effects | Flat Team V2 tree | `agent_team_definition.md`; GraphQL error `Field "refType" is not defined by type "TeamMemberInput"` | High |
| BEH-002 | Contract | Agent WebSocket status stream | Restore of a stopped standalone run emits offline → initializing → running; `AGENT_STATUS` payload is `{ status, agent_id, recoverableBlock }` | `recoverableBlock: null` when nothing is held | `6908ccff48`; log diff | High |
| BEH-003 | Contract | `AgentRunManager.beginActivation`; GraphQL run status / terminate | A manager-owned Error runtime lists as active, terminates, keeps inactive history; a rejected termination keeps it active and retryable | Activation is the only entry | `agent-run-manager.ts:133` | High |
| BEH-004 | Operational | Server startup with released TeamRun V1 data (one-level nested Team, Org-like) | The full migration chain runs: V1 → V2 → `agent_org_flat_team_families_v1` converts the Org-like root into an AgentOrg V1 package under `agent_orgs/` and retires the Team files; later migrations run after it | History and new work served from the Org family | `agent-org-flat-team-families-v1-app-data-migration.ts`; ENOENT at `agent_teams/<id>/team_run_execution_tree.json` | High for the path; the final Org shape is verified during implementation |
| BEH-005 | Operational | Memory Sync between two server processes | Source memory of standalone and flat-Team runs is mirrored into the target and read back by explicit source | Current Team V2 rejects a configured Team inside a Team: `Team V2 cannot contain configured Team '/nested'` | log; `memory-sync-multiprocess.e2e.test.ts:41-80` | High |
| BEH-006 | Operational | Server startup with released nested Team history | One-level (Org-like) history: layout repair moves member memory, flat migration converts it to an Org. Three-level history (Team in Team in root): layout repair succeeds, the flat migration FAILS before mutation with the invariant, and history is not listed | REQ-013/AC-008 of flat-agent-organization-model approve the refusal; flat migration is `STARTUP_ONLY` (a manual retry of the earlier migrations needs a restart to reach it) | scratch probe; flat-Orgs requirements | High |
| BEH-007 | Contract | Run history GraphQL projections and active-trace pages | A run is readable only after its package is admitted (`RootRunPackageReadinessIndex`); a current Team package needs `team_run_execution_tree.json`, `task_delegation_records.json` and `team_communication_messages.json` | Production writers admit | readiness index; diagnostics | High |
| BEH-008 | Contract | Native AutoByteus backend preparation | `beginPreparation({ kind: "new" \| "restore", … }).prepare()` builds the backend, catalogs configured skills and exposes `read_file` | Private `createBackend` is internal | factory lines 138-200 | High |
| BEH-009 | User | Edit settings of an existing run (agent/team) in the web UI | Run settings view loads model options (now incl. `DelegatedLaunchModelOptions`) and collaboration (`GetAgentRunCollaboration`) | Fixture harness lacks these operations | probe log | High |
| BEH-010 | User | Interrupted result / steering presentation in agent and team views | Renderer consumes current stream message shapes and the agent-package-definitions WebSocket | Fixture sends retired shapes (`schema_version: 1`, `runtime_kind: 'AUTOBYTEUS'`, nested `/review_group/critic`) and does not serve that WebSocket | probe log; probe source lines 1-60 | High |
| BEH-011 | User | Launch an Org from its launch page | If a member's definition disappears, Run is disabled and the reason shown (client readiness); if the server rejects a launch, "Couldn't start this Agent Org. Try again." with values kept and Run enabled | Client readiness now catches the probe's trigger first | `OrgLaunchPage.vue`; store | High |

## Relevant Codebase And Technical Facts

| Path / Component | Responsibility | Requirement Implication | Design Implication |
| --- | --- | --- | --- |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` `executeGraphql` | Shared helper; throws a stable `TEST_GRAPHQL_REQUEST_FAILED` without the server's message | None (out of scope) | Follow-up suggestion only |
| `tests/fixtures/current-team-run-fixtures.js` (`testExecutionTree`, `testAgentNode`, `testAgentTeamNode`) | Current-shape tree builders used by suites | — | Seed via current builders; `testAgentTeamNode` is no longer a valid Team V2 member |
| `tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-001…case-005` | Released V1 fixture cases | Released shapes stay faithful (TESTING.md) | A one-level released case is available or derivable for nested-history |
| `src/app-data-migrations/app-data-migration-registry.ts` | Ordered migration list; grew since the upgrade suite was written | Ledger-count assertions must not hard-code the old count | Derive expectations from the current registry |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Test files and fixtures under `autobyteus-server-ts/tests/e2e/`, `autobyteus-server-ts/tests/fixtures/`, `autobyteus-web/tests/e2e/` and `autobyteus-web/tests/e2e/fixtures/`; one `package.json` script.
- Readers: vitest, node probe runners.

### Structural Surfaces

- None changed. No production `src/` file, API, schema, migration, persistence reader/writer or web component changes.

### Potential Structural Impacts To Investigate

- API or external-contract change: Absent.
- Persistence schema or invariant change: Absent.
- Security or privacy boundary change: Absent.
- Concurrency or lifecycle change: Absent.
- Deployment, migration, ownership-boundary change: Absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| 8 suites on `db00ba16a9` | all | 27 failed, 1 passed | Same as the receipt | `evidence/base-db00ba16a9-eight-suites.plain.log` |
| GraphQL diagnostics | hierarchical | `refType` rejected by `TeamMemberInput` | Nested Team definitions removed | console output, reproduced in Source Log |
| scratch nested probe | case-003 | flat migration FAILED (three-level), `team_communication_projection_addresses` FAILED (`senderAddress.segments[0] member identity is missing`) on the same unconvertible root; history empty | Approved refusal; the fixture is outside the supported population | Source Log |
| admission probe | recent-run-projection | admission fixes 4/9; team cases need complete packages | Stale harness | Source Log |
| probes on base | existing-run-model-config, interrupt-result-presentation | stale GraphQL/stream fixtures, unsupplied WebSocket | Stale harness | `evidence/probes-base/` |

## Stakeholder And User Evidence

| Source / Actor | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| Project Task Manager (Task 6834441c) | Green baseline; each item owned | Direct | All 11 items fixed or removed with reason | None |
| Task 7ea7804f | Run server e2e in CI after stale suites are fixed | Direct (ordering note) | This ticket unblocks it | None |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| TESTING.md Rule 9, Environments (clean env), Migrations (faithful synthesized released data), Browser probes (supply every boundary; found by script) | Repository | Each fix its own commit labelled baseline fix; probes found via `package.json` | TESTING.md | — |
| Flat-Orgs requirements REQ-002/REQ-013/AC-008 | `tickets/done/flat-agent-organization-model/requirements-doc.md` | No deep conversion; fail closed | Doc | — |
| Data Migration Guideline | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Not touched; test fixtures only | Doc | — |

## Persisted Data And State Facts

- Affected stored or external subject: none in production. Tests write only into their own temp data roots and databases.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. N/A.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/base-db00ba16a9-eight-suites.plain.log` | Solution Designer | Base reproduction of the 8 suites | Evidence | AC-001..AC-008 | Final | N/A (evidence) |
| `evidence/probes-base/` | Solution Designer | Base reproduction of two fixture probes | Evidence | AC-009, AC-010 | Final | N/A (evidence) |
| `evidence/setup-*.log` | Solution Designer | Bootstrap proof | Evidence | — | Final | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | The upgraded final state of the released cohort (AgentOrg V1) might reveal lost content when the test asserts it in detail | Would be a product defect | Implementation asserts history/content readable through Org APIs; on any loss, stop and report (REQ-011) | Open (verification gate) |
| RSK-002 | Risk | run-settings-live needs signed-in `claude`/`codex` CLIs with the real `HOME` | Environment, not cost: R03 makes no inference | Validation runs R03 alone; report environment limits truthfully | Open |
| UNK-001 | Unknown | Whether `case-004`/another released fixture is a ready one-level nested shape for nested-history | Fixture choice | Implementation; derive from case-003 by removing the deeper Team if needed, keeping released keys | Open (implementation detail) |

## Architecture Investigation Findings

See Source Log rows dated 2026-10-17 from `agent-run-manager.ts`, the native backend factory, the readiness index, the migration registry, the frozen V2 schemas, `OrgLaunchPage.vue` and the probe harnesses. All causes are in test code: stale API calls, stale payload expectations, stale fixtures/harnesses, and expectations that stop before the current end of the migration chain. No production owner is at fault.

## Requirement Implications

- No product defect was found, so nothing needs the user's decision before fixing.
- Nested-Team configuration (hierarchical suite) and three-level history (nested-history suite) are removed or refused by approved flat-Orgs requirements; their test expectations are dropped or replaced with stated reasons.
- Every other expectation still describes supported behavior and is updated to the current API/payload.

## Notes For Architecture Design

- Reuse existing harness patterns: `admitCurrent` after seeding (`run-projection-toolcalls-graphql`), `beginActivation`, `beginPreparation(...).prepare()`, current fixture builders, the probes' shared fixture helpers in `autobyteus-web/tests/e2e/fixtures/`.
- Keep each item a separate commit (Rule 9).
- Overlap: `team-run-v1-production-upgrade` is also listed in Task 0c7efc37; this ticket fixes it. `codex-interrupted-compaction` in 0c7efc37 has the same `prepareNewAgentRun` cause as BEH-003 but is not in this Task (follow-up note).
