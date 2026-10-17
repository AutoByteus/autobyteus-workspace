# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (requirements re-approved at SR-003: UC-006 withdrawn; otherwise unchanged)
- Approved requirements baseline: `requirements-doc.md` at `SR-001`, approved by the Solution Designer within the Task's direction (user informed 2026-10-17).
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair/tickets/in-progress/baseline-e2e-probe-repair/investigation-notes.md`
- Authorities read (2026-10-17): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `TESTING.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`. `references/design-examples.md`: not used.
- Project design-principle conflicts or discrepancies: None. Note: the Data Migration Guideline is not engaged because no persisted product data or migration changes; released-shape fixtures follow TESTING.md's migrations rule.

## Current-State Read

Each of the 11 items is a test that still targets an API, payload, fixture shape or model the product deliberately changed (investigation BEH-001..BEH-011). The production owners are healthy: `AgentRunManager.beginActivation`, the native backend factory's `beginPreparation`, the `RootRunPackageReadinessIndex` admission rule, the startup migration chain ending in `agent_org_flat_team_families_v1`, Agent-only Team definitions, the `AGENT_STATUS` payload with `recoverableBlock`, and the Org launch page's readiness rule. The tests bypassed or predated these owners.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: 8 server e2e files (one renamed), 2–3 web probe files plus their fixture pages, one `package.json` script line; all in existing test ownership. Roughly 5k lines of test code are in the touched files, but the change per file is a bounded harness/expectation update. No production surface.
- Architectural risk: `Low`
- Risk rationale: no contract, persistence, security, concurrency, deployment or ownership change; tests only consume existing public APIs and the established harness patterns. The only uncertainty (RSK-001: content loss in the upgraded end state) is a verification gate with a defined stop-and-report outcome, not a design unknown.
- Escalation trigger: any need to modify a production file, or any repaired assertion that shows lost or wrong product data (REQ-011) → stop that item and return to the Solution Designer as a possible product defect.

## Architecture Investigation Evidence

| Source / Command | Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| base run | `evidence/base-db00ba16a9-eight-suites.plain.log` | 27 failures, same as receipt | Scope confirmed | — |
| GraphQL diagnostics | Source Log | `refType` not in `TeamMemberInput` | Flat Team rework (UC-001) | — |
| scratch nested probe | Source Log | three-level tree refused by the flat migration; sources intact | UC-006 split into supported + refusal cases | — |
| flat-Orgs requirements | REQ-013/AC-008 | refusal approved | Not a defect | — |
| admission probe | Source Log | `admitCurrent` + complete authorities needed | UC-007 seeding | — |
| sibling suite | `run-projection-toolcalls-graphql.e2e.test.ts:262` | Established admission pattern | Reuse | — |
| `agent-run-manager.ts:133` | — | `beginActivation` | UC-003 | — |
| factory `beginPreparation` | `autobyteus-agent-run-backend-factory.ts:138` | public preparation entry | UC-008 | — |
| `OrgLaunchPage.vue:131-152` | — | readiness disables Run | UC-011 trigger | Whether a cheap server-only cause exists |
| probes with `page.route` | e.g. `chat-draft-rows-live-probe.mjs`, `chat-entry-live-probe.mjs` | route interception is an established probe technique | UC-011 fallback | — |

## Intended Change

Update each failing test to the current product contract, through public APIs and existing harness patterns, in one commit per item; drop only expectations for removed or approved-refused behavior, with the reason in the file header.

## Change Scope (Mandatory)

- In scope: UC-001..UC-011 except UC-006 (withdrawn SR-003); UC-001 and UC-007 are verify-only (fixed upstream, SR-002). Areas: `autobyteus-server-ts/tests/e2e/{agent-team-runs,agent,app-data-migrations,memory-sync,run-history,runtime}/` (the 8 files), `autobyteus-server-ts/tests/fixtures/` only when a released or current-shape fixture must be added or derived for these suites, `autobyteus-web/tests/e2e/{existing-run-model-config-probe.mjs,interrupt-result-presentation-probe.mjs,run-settings-live-probe.mjs}`, their pages in `autobyteus-web/tests/e2e/fixtures/`, and `autobyteus-web/package.json` (one script).
- Deliberately left alone: all production source and docs; `test-support/live-e2e/test-runtime-bootstrap.mjs` (shared; changing its error reporting is a separate decision); other stale/flaky suites owned by Tasks 0c7efc37, 7e13a4af, a1dfb6dc; `terminal-websocket-lifecycle`; CI (7ea7804f).
- SR-002 upstream status (2026-10-17): UC-001 and UC-007 were fixed upstream by other tickets (`e6ba249a96`/`2e70401f18`/`57d388a7fd` and `149bce0be9`) and are in the branch base `66429d6f31`; for them this ticket only verifies AC-001/AC-007. UC-004's ledger part is fixed upstream in `fa49138794`; refresh onto `origin/personal` (`516e592d7b` or later) before committing UC-004. PMU-021 (`project-manager-ux`) is not in scope; it stays with Task a1dfb6dc.
- Follow-ups (for `/project_task_manager`):
  - FU-1: `tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts` (Task 0c7efc37) fails for the same reason as UC-003 (`prepareNewAgentRun` removed; use `beginActivation`). 0c7efc37 can also drop `team-run-v1-production-upgrade`, fixed here.
  - FU-2: `executeGraphql` in `test-support/live-e2e/test-runtime-bootstrap.mjs` throws `TEST_GRAPHQL_REQUEST_FAILED` without the server's error message, which made every stale-API failure in this ticket opaque. Suggest including the GraphQL error messages (no secrets are in them) in the thrown error. Fits naturally with 7ea7804f.
  - FU-3: withdrawn (SR-003): the three-level shape is unsupported (the user, remove-nested-task-team DEC-008).
  - FU-4 (product, from IR-001): when the derived `memory/team_run_history_index.json` is unreadable (not an array), `listWorkspaceRunHistory` and `listCollaborationRootHistory` fail for every run, standalone included, across restarts, until the file is fixed by hand. The data is intact and the index is derived. This is worth a product look against DESIGN.md rule 7 (contain bad data), for example rebuilding the index from admitted packages. Evidence: `evidence/implementation/uc004-warning-case-served-behavior-516e592d7b.txt`.
  - FU-5 (docs): `autobyteus-server-ts/tests/fixtures/app-data-migrations/team-run-execution-tree-v1/README.md` claims a V1 package-schema suite validates every case, but no suite enumerates them.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger / Contract | Existing Behavior | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001 / AC-001 | Team definition + run GraphQL | Agent-only Teams | test reworked to flat Team | DS-001 |
| BEH-002 | Contract | REQ-002 / AC-002 | Agent status WebSocket | `recoverableBlock` in payload | expectation updated | DS-002 |
| BEH-003 | Contract | REQ-003 / AC-003 | `beginActivation`, GraphQL | — | harness updated | DS-003 |
| BEH-004 | Operational | REQ-004 / AC-004 | startup chain | ends in Org family | expectations to end state | DS-004 |
| BEH-005 | Operational | REQ-005 / AC-005 | Memory Sync | flat Team only | fixture updated | DS-005 |
| BEH-006 | Operational | REQ-006 / AC-006 (withdrawn SR-003) | — | suite removed upstream | none | — |
| BEH-007 | Contract | REQ-007 / AC-007 | history projection GraphQL | admission required | seeding updated | DS-006 |
| BEH-008 | System | REQ-008 / AC-008 | `beginPreparation` | — | harness updated | DS-003 |
| BEH-009 | User | REQ-009 / AC-009 | run settings page | new operations | fixture updated | DS-007 |
| BEH-010 | User | REQ-009 / AC-010 | agent/team stream rendering | current shapes | fixture updated + script | DS-007 |
| BEH-011 | User | REQ-009 / AC-011 | Org launch | readiness pre-check | trigger replaced | DS-008 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (stale tests; Rule 9 baseline fixes).
- Current design issue found: `No` in production; the tests drifted.
- Structural triggers: Authoritative-boundary trigger fires inside two tests (UC-003 used a removed manager entry; UC-008 calls a private factory method) → fixed by using the public boundary. Legacy-cleanup trigger fires for nested-Team test expectations → dropped. Others (repeated coordination, shared-structure tightness, persisted-data transition) ruled out: no production structure changes.
- Root cause classification: `Legacy Or Compatibility Pressure` in test code (tests pinned to retired APIs/shapes); production `No Design Issue Found`.
- Refactor needed now: `No` (production). Test-side: use public boundaries, as above.
- Evidence: investigation Source Log.
- Design response: per-file updates below.
- Refactor rationale: production owners already correct.
- Intentional deferrals and residual risk: FU-1..FU-3.

## Terminology

- "End state of the chain": what the full ordered startup migration list produces from released data on the current build.
- "One-level nested history": a released root Team whose members are Agents and Teams of Agents (Org-like). "Three-level": a Team inside a Team inside the root.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths in this scope: test expectations for nested Team definitions and runs (UC-001), nested current Team packages (UC-005), three-level conversion success (UC-006), TeamRun V2 as the final upgrade state (UC-004), retired stream/GraphQL fixture shapes (UC-009, UC-010).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Only test-owned temp data roots and databases are written; no product reader, writer, schema or migration changes. Released-shape fixtures remain faithful synthesized data per TESTING.md.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | test GraphQL client | Team V2 tree on disk + resume config | Team run service | Config persistence |
| DS-002 | Primary | BEH-002 | WebSocket client | `AGENT_STATUS` sequence | agent streaming | Status contract |
| DS-003 | Primary | BEH-003, BEH-008 | test harness | published run / prepared backend | `AgentRunManager` / backend factory | Public activation boundary |
| DS-004 | Primary | BEH-004, BEH-006 | built server startup on seeded released data | migration ledger + current family on disk + public reads | migration runner → readiness index → history APIs | Data continuity |
| DS-005 | Primary | BEH-005 | source server | target server import | Memory Sync | Cross-process sync |
| DS-006 | Primary | BEH-007 | in-process GraphQL | projection / pages | readiness index → projection services | Admission |
| DS-007 | Primary | BEH-009, BEH-010 | probe fixture page | rendered DOM | renderer stores via fixture GraphQL/WS | Harness completeness |
| DS-008 | Primary | BEH-011 | Org launch page | failure status | launch draft store → launch mutation | Failure presentation |

## Primary Execution Spine(s)

- DS-001: `Test → createAgentTeamDefinition (Agent-only) → createAgentTeamRun(teamConfigs "/", memberConfigs "/x") → Team V2 tree → getTeamRunResumeConfig → restart → restoreAgentTeamRun → getTeamRunResumeConfig`
- DS-004: `Seed released files + ledger → startBuiltTestServer → ordered migrations (… V2 → flat families → …) → readiness admission → listCollaborationRootHistory / getAgentOrgRootHistory / getAgentOrgMemberRunProjection / restoreAgentOrgRun → restart → unchanged`
- DS-006: `Seed via current stores (complete authorities) → RootRunPackageReadinessIndex.admitCurrent → GraphQL projection → page cursors`
- DS-008: `Org launch page → Run → createAgentOrgRun (rejected) → "Couldn't start this Agent Org. Try again." → values kept, Run enabled`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | Same journey as before, flattened: one Team with coordinator + observer (+ e.g. a third Agent) using root defaults and one member override each; tree, active resume, restarted resume and restored resume all equal the expected config tree. Rejection cases target the Team root and one Agent member. | Team run GraphQL | Team run service | — |
| DS-004 | The suite seeds released data, starts the real build, and checks the ledger rows of the migrations it cares about by ID (not total count), then reads the end state through the current family's public API. For Org-like roots that is the Org family. | runner, readiness, history | migration runner | ledger reader |
| DS-006 | Seeding writes what production writes (complete package), then admits it; queries unchanged. | readiness, projection | readiness index | — |
| DS-008 | The case reaches the server-rejection presentation with a cause the client cannot pre-check. | launch store | launch draft store | route interception (fallback) |

## Spine Actors / Main-Line Nodes

Existing product owners named above; no new nodes.

## Ownership Map

Unchanged. Tests depend only on public boundaries: GraphQL, WebSocket, `AgentRunManager.beginActivation`, factory `beginPreparation`, `RootRunPackageReadinessIndex.admitCurrent` (already used by sibling suites), current fixture builders.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` | Nested Teams removed (flat-Orgs REQ-002) | `team-run-config-graphql.e2e.test.ts` (rename + flat rework) | In This Change | `git mv` so history follows |
| Nested-Team configuration expectations (`/Research/*`, `AGENT_TEAM`, `refType`) | Removed feature | — | In This Change | Reason in header |
| `testAgentTeamNode` usage in `memory-sync-multiprocess` and its nested-layout conflict/retained assertions | Current Team V2 rejects nested Teams | flat Team package | In This Change | `testAgentTeamNode` itself stays: it has many other callers in `tests/unit` (not dead) |
| TeamRun-V2-as-final expectations and hard-coded ledger length in `team-run-v1-production-upgrade` | Chain continues | end-state assertions by migration ID | In This Change | — |
| Three-level success expectations in `nested-team-history-restart` | Approved refusal | refusal case | In This Change | — |
| Retired shapes in two probe fixtures | Contract changed | current shapes | In This Change | — |
| R03 deletion trigger | Client readiness pre-empts it | server-only cause or boundary injection | In This Change | — |

## Return Or Event Spine(s)

DS-002 status events; DS-007 fixture WebSocket messages. No change in shape beyond matching current contracts.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Process-singleton cleanup in UC-003 | DS-003 | test isolation | release `AgentRunManager` instance in `afterEach`/`finally` | stop cascades | one failure masks the other |
| Ledger reader in UC-004 | DS-004 | upgrade assertions | select rows by migration ID | registry grows | brittle counts |

## Ownership Boundaries

Tests must not call private methods (`createBackend`) or removed entries; must not mock the readiness index; must seed through current stores/builders or released-shape fixture files.

## Boundary Encapsulation Map

| Boundary | Internal | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `AutoByteusAgentRunBackendFactory.beginPreparation` | `createBackend`, `restoreBackend`, `buildAgentConfig` | UC-008 test | calling `createBackend` directly | use `beginPreparation(...).prepare()`; release via the preparation |
| `AgentRunManager.beginActivation` | activation registry | UC-003 test | registry internals | use operation API |

## Dependency Rules

Tests → public product boundaries and `tests/fixtures/*` only. No new test dependency on production internals beyond those already used by sibling suites.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `createAgentTeamRun` | Team run | launch | `teamDefinitionId`, `teamConfigs[{teamAddress:"/"}]`, `memberConfigs[{memberAddress:"/<agent>"}]` | flat addresses only |
| Org history/projection queries | Org run | read upgraded history | `orgRunId`, `memberAddress`, `agentRunId` | UC-004, UC-006 |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Risk | Action |
| --- | --- | --- | --- | --- |
| above | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| renamed suite | `team-run-config-graphql.e2e.test.ts`, `describe("TeamRun configuration GraphQL and V2 lifecycle")` | Yes | Low | — |
| `nested-team-history-restart` | keep file name (it still tests released nested history) | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Admit seeded run | `RootRunPackageReadinessIndex.admitCurrent` (as in `run-projection-toolcalls-graphql`) | Reuse | Same rule as production |
| Current Team package | `tests/fixtures/current-team-run-fixtures` + current stores | Reuse | — |
| Released nested fixture | `tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-00x` | Reuse / derive | Faithful released keys |
| Probe GraphQL/WS harness | `autobyteus-web/tests/e2e/fixtures/` shared helpers | Reuse | TESTING.md browser-probe rule |
| Rejection injection | `page.route` (used by several probes) | Reuse (fallback only) | — |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spine | Decision |
| --- | --- | --- | --- |
| server `tests/e2e` | UC-001..UC-008 | DS-001..DS-006 | Extend existing files |
| server `tests/fixtures` | released/current fixtures if needed | DS-004..DS-006 | Reuse; add a derived released case only if UC-006 needs it |
| web `tests/e2e` + `fixtures/` | UC-009..UC-011 | DS-007, DS-008 | Extend existing files |

## Draft File Responsibility Mapping

Same as Final (no shared structure extraction needed).

## Reusable Owned Structures Check

| Repeated Logic | Candidate | Decision |
| --- | --- | --- |
| Seed-then-admit in UC-007 | local helper in the suite | Keep local; sibling suites already inline it. Do not create a new shared helper for two call sites. |

## Shared Structure / Data Model Tightness Check

N/A — no shared structure added.

## Final File Responsibility Mapping

| File | Concern | Change |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` → `team-run-config-graphql.e2e.test.ts` | flat Team run config persist/restart/restore + 6 rejection cases | Rename/Move + Modify. Agent-only `nodes` (no `refType`), only `/` team config, flat member addresses; the `assertExactConfigurationTree` helper loses its nested branch; header states why nested cases were removed. |
| `autobyteus-server-ts/tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` | status payload | Modify: add `recoverableBlock: null` to every exact `AGENT_STATUS` expectation in the file (search the whole file, not only line 424). |
| `autobyteus-server-ts/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` | Error-runtime lifecycle | Modify: replace `prepareNewAgentRun(...)` with `beginActivation({ kind: "new", runId, config }).prepare()` and publish the candidate (mirror `tests/integration/agent-execution/agent-run-manager.integration.test.ts:138`); release the process instance in cleanup that runs on failure. |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | released upgrade | Modify: assert flat-families migration status and the AgentOrg V1 end state (`agent_orgs/<id>/agent_org_run_execution_tree.json`, retired Team files gone), read history/projection/restore through Org APIs, the ledger-row derivation is already done upstream in `fa49138794` (on `origin/personal`, not yet in the branch): refresh the branch onto `origin/personal` and build on it, do not re-implement it; keep warning isolation, retry and relaunch immutability. |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | cross-process sync | Modify: replace `writeCurrentNestedTeamPackage` with a current flat Team package (member directly under the root); drop the nested-layout conflict/retained assertions; keep conflict and read-back for the flat Team. |
| `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` | — | **Withdrawn (SR-003)**: deleted upstream by remove-nested-task-team (user decision DEC-008); no change in this ticket |
| (no new released fixture) | — | Withdrawn with UC-006 (SR-003) |
| `autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | projection | Modify: team seeding writes `task_delegation_records.json` and `team_communication_messages.json` (current empty shapes, as `memory-sync-multiprocess` already does) and admits `agent_team`; standalone seeding (both writers, incl. line ~571) admits `agent`. |
| `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | skill loading | Modify: `factory.beginPreparation({ kind: "new", runId, config }).prepare()`; release through the preparation/backend terminate. |
| `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` (+ `fixtures/existing-run-model-config.page.vue` if needed) | settings probe | Modify: answer `DelegatedLaunchModelOptions` and `GetAgentRunCollaboration` with current shapes (from `autobyteus-web/generated/graphql.ts`/the server schema). |
| `autobyteus-web/tests/e2e/interrupt-result-presentation-probe.mjs` (+ `fixtures/interrupt-result-presentation.page.vue`) | interrupt presentation | Modify: current tree shape (current schema version, lowercase runtime kind, flat member address e.g. `/critic`), current agent and Team stream message shapes, serve `/ws/agent-package-definitions`; no browser console errors. |
| `autobyteus-web/package.json` | discoverability | Modify: add `"test:e2e:interrupt-result-presentation": "node tests/e2e/interrupt-result-presentation-probe.mjs"` (in UC-010's commit). |
| `autobyteus-web/tests/e2e/run-settings-live-probe.mjs` | R03 | Modify R03 and its header line: keep the setup and AC-003 assertions; replace the deletion trigger per DEC-006 (preferred: a real server-only rejection the client cannot see; fallback: `page.route` on the GraphQL request whose operation is the Org launch mutation, returning the server's failure shape, scoped to that one request and removed afterwards). Keep `historyUnchanged`. |

## Applied Patterns

None new.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; no new folders.

## Folder Boundary Check

N/A — existing test folders.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| UC-003 activation | `const candidate = await manager.beginActivation({ kind: "new", runId: RUN_ID, config }).prepare();` then publish it as `tests/integration/agent-execution/agent-run-manager.integration.test.ts:138` does | re-adding `prepareNewAgentRun` to production | test-only |
| UC-004 ledger | `expect(rowFor(after, FLAT_ID)).toMatchObject({ status: "SUCCEEDED" })` | `expect(afterRows).toHaveLength(beforeRows.length + 4)` | registry grows |
| UC-007 seeding | `await writeTeamPackage(...); await new RootRunPackageReadinessIndex(memoryDir).admitCurrent("agent_team", id)` | mocking `assertAdmitted` | real admission rule |
| UC-011 | rejection reaches the page through the launch request | deleting a definition the client watches | readiness pre-empts it |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Re-adding `prepareNewAgentRun` or a test-only manager shim | quickest fix for UC-003 | Rejected | `beginActivation` |
| Keeping nested Team fixtures via a legacy test builder | preserve old tests | Rejected | flat/Org current shapes; released shapes only in released fixtures |
| Relaxing Zod/stream validation for the probes | silence console errors | Rejected | current fixture shapes |

## Derived Layering

N/A.

## Change / Refactor Sequence

One commit per item, any order; suggested: UC-002, UC-003, UC-008 (small API/payload), UC-007, UC-001, UC-005, UC-004, UC-006 (migration-related, slower), then UC-009, UC-010, UC-011. Commit message shape: `test(<area>): baseline fix — <test name>: <cause>` (Rule 9). Run each repaired file twice in a clean env before committing it; the full 8-file set and the probes once more at the end; server `test:unit` and `typecheck` once as a no-production-change check.

## Key Tradeoffs

- Rework vs. drop for the hierarchical suite: rework keeps the still-supported flat half (DEC-001).
- R03 boundary injection: proves the page's failure presentation without proving server validation, which server tests own; preferred only when no real server-only cause is cheap (DEC-006).

## Risks

- RSK-001 (upgrade end state may expose loss) → stop and report (REQ-011).
- RSK-002 (R03 needs signed-in CLIs) → report environment limits; never claim a pass.
- `task-copy-idle-lifetime` flakiness (Task 7e13a4af) may show up in broader runs; not this ticket.

## Guidance For Implementation

- Run e2e files with `env -i PATH="$PATH" HOME=<tmp> TMPDIR="$TMPDIR" pnpm exec vitest run --no-watch <file>` from `autobyteus-server-ts`, after `pnpm -C autobyteus-server-ts build` (suites start `dist/app.js`).
- When an executeGraphql call fails opaquely, temporarily print `payload.errors` locally (do not commit; FU-2).
- Probes: fresh `--output-dir`, check the cleanup receipt; R03 alone: `pnpm -C autobyteus-web test:e2e:run-settings-live --cases R03 --output-dir <fresh>`, with the real `HOME` (and `USER`, `LOGNAME`) for the signed-in CLIs.
- Never touch the user's running app or `~/.autobyteus`.
- Stage paths explicitly; never `git add -A` (untracked SDK `dist/` folders exist in the worktree).
