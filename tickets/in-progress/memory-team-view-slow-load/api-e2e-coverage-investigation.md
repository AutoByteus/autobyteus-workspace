# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/design-spec.md` (SR-003)
- Supplemental Task Artifacts: None. Product Design: `N/A — not applicable`.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: `/code_reviewer` Implementation Review Pass (CRR-001, round 1) for commit `bd8450984`
- Prior Investigation Reviewed: N/A (initial)
- Latest Authoritative Investigation: Round 1

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required` (durable coverage is added)

## Current Requirement And Design Basis

This package must prove four things:

1. The Agent Teams list and one team's runs list scale linearly and answer in ≤ 2 s on the user's data. Team content is unchanged apart from REQ-009 and REQ-010 (REQ-001, REQ-004, REQ-005; AC-001…003, AC-005, AC-006).
2. A click only navigates. The route sync sends exactly one data request, shows the loading state and never shows another selection's runs (REQ-002, REQ-003; AC-004).
3. The new Agent Orgs tab, org detail and org member inspector work end to end. That includes the breadcrumb `Agent Orgs / <org> / <org run> / <member>`, Back, and the imported-source empty state (REQ-006…008; AC-007…009).
4. Member entries show a display name and their own run ID. The badge, the run ID and the inspector agree (REQ-009, REQ-010; AC-010, AC-011).

The design is SR-003: a shared `CollaborationRootMemoryCatalog`, team and org sources that read one tree per root, a root-first and admission-aware `resolveTeamMemberLocation`, and route-owned fetching in `pages/memory.vue`. Code review CR-001 (Low) asks this stage to observe whether the transient "No runs match this filter." state is visible before "Loading runs…".

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / BEH-002 performance (team list, team runs) | Changed | REQ-001, AC-001/002 | Live timing on the built backend against a full-fidelity copy of the live memory dir |
| BEH-005 team content | Preserved | REQ-004, AC-005 | Existing unit tests, plus team GraphQL e2e (new) and live-data spot checks |
| BEH-006 / BEH-007 Agent Orgs | Added | REQ-006…008, AC-007…009 | New GraphQL e2e; live timing; browser walkthrough |
| BEH-002…004 route-owned fetching | Changed | REQ-002/003, AC-004 | Page and store unit tests exist; browser request counting and state observation (CR-001) |
| BEH-008 display name | Changed (fix) | REQ-009, AC-010 | Component test exists; GraphQL e2e asserts `displayName`; browser check |
| BEH-009 own run ID | Changed (fix) | REQ-010, AC-011 | Unit test exists; GraphQL e2e for team and org task instances; live nested-classroom check |
| `resolveTeamMemberLocation` root-first / nested / admission | Changed (internal) | REQ-005, AC-006, REC-001 | Unit tests exist; GraphQL e2e through `getTeamMemberRunMemoryView` |
| GraphQL type rename `CollaborationMemberMemoryTargetSummary` | Changed | Design Interface Mapping | GraphQL e2e selects member fields through the real schema |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Catalog, sources, location services | Unit tests (service level, real fs fixtures) | Performance at real volume; admission from the real readiness index | Live API timing on the built backend |
| API / transport / contract | Yes | 3 new queries, 4 types, type rename | `memory-explorer-types.test.ts`, resolver unit test (source service mocked) | No test runs the team or org queries through the built schema | Durable GraphQL e2e (new) + live curl |
| Frontend component / state | Yes | Stores, `CollaborationMemoryDetail`, `MemoryHome`, `MemoryInspector` | Web component/store/page specs (12 files / 46 tests) | Real rendering, request counts over the network, CR-001 transient state | Browser |
| Browser integration / user journey | Yes | `pages/memory.vue` route sync and new routes | Page spec with mocked stores | Real router + Apollo + backend sequencing | Browser against the dev stack |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer | As above | As above | Browser (project `pnpm dev`) |
| Desktop shell / Electron-specific integration | No | No `autobyteus-web/electron/**` file changed | — | None introduced by this diff | None (see Desktop decision) |
| Process / lifecycle | No | Read-only queries | — | — | — |
| Persisted-data transition | No (`Not Affected`) | Read-only paths | Handoff Persisted Data check | A read path must not write: check the live copy is not modified by the explorer queries | Live copy observation |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load`
- Project type and runtime stack: pnpm monorepo; `autobyteus-server-ts` (Node, Fastify + Mercurius + type-graphql, vitest); `autobyteus-web` (Nuxt 3, Pinia, Apollo, vitest; Electron shell under `autobyteus-web/electron`).
- Conflicting or unclear instructions: none.
- Required secrets: `N/A` (the memory explorer needs no provider keys).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `autobyteus-web/AGENTS.md` | Web test commands, git rules | `pnpm test:nuxt <path> --run`; never `git add .` |
| `package.json` (root) | Dev stack | `pnpm dev` = server build + `scripts/development/run-dev.mjs` |
| `scripts/development/development-runtime.mjs` | Dev runtime layout | Backend `127.0.0.1:8000`, frontend `127.0.0.1:3000`; data root `<worktree>/.autobyteus/development/server-data`; `AUTOBYTEUS_MEMORY_DIR=<data root>/memory` |
| `autobyteus-server-ts/tests/e2e/memory/*.e2e.test.ts` | Existing GraphQL e2e pattern | `buildGraphqlSchema()` + `graphql()` in-process over a temp app data dir |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built backend + Nuxt dev | worktree root | `pnpm dev` (background) | Ports 8000/3000 were free; the user's Electron app uses :29695 and `~/.autobyteus/server-data` and is not touched | Log line `Server listening on 127.0.0.1:8000` and `/rest/health`; frontend HTTP 200 | SIGINT/kill of the owned `pnpm dev` process group; verify ports freed |
| Full-fidelity memory copy | worktree | `cp -cR ~/.autobyteus/server-data/memory <data root>/memory` (APFS clonefile, same volume; copy-on-write, no data movement) | 6.0 GB teams, 144 MB orgs, 1.0 GB imports; live dir is only read | File counts compared with the live dir | `rm -rf <worktree>/.autobyteus/development` after validation |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| User's real team/org memory (534+ team runs, 19 org runs) | APFS clone of the live memory dir into the dev data root | The dev backend never opens the live dir, so startup reconciliation cannot mutate the user's data | Deleted after validation |
| Imported source for the org empty state | Real `imports/docker-node-1` in the copy (has `agent_teams`, `agents`, no `agent_orgs`) | Same | Same |
| GraphQL e2e fixtures | `tests/fixtures/current-team-run-fixtures.ts`, `current-agent-org-run-fixtures.ts`, run-history stores | Temp app data dir per suite | Removed in `afterAll` |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- References: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Evidence planned: the new queries run against a real data copy. I will compare the history index files of the copy before and after the explorer queries to show that the read paths do not write.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Req / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `server/tests/unit/agent-memory/team-memory-explorer-service.test.ts` | Grouping, search, paging, one read per root, AC-011 task instance, corrupt root skipped | REQ-001, 004, 010; AC-003, 011 | Still Valid | Reviewed file | Run |
| `server/tests/unit/agent-memory/agent-org-memory-explorer-service.test.ts` | Org grouping, labels, own run ID, search, paging, index fallback, one read per root, corrupt skip | REQ-006…008, 010; AC-003, 007, 008 | Still Valid | Reviewed file | Run |
| `server/tests/unit/agent-memory/agent-memory-location-service.test.ts` | Root-scoped read, nested ID, non-admitted root, org resolution | REQ-005; AC-006, 009 | Still Valid | Reviewed file | Run |
| `server/tests/unit/agent-org-execution/agent-org-execution-tree-location-service.test.ts` | `listAgents({rootRunId})`, `listRootRunIds` | REQ-008 | Still Valid | Handoff | Run |
| `server/tests/unit/api/graphql/types/memory-explorer-types.test.ts`, `memory-view-member-resolver.test.ts` | Resolver wiring; the source service is mocked | AC-007, 009 | Still Valid | Reviewed file | Run |
| `server/tests/e2e/memory/memory-explorer-graphql.e2e.test.ts` | Agents list and runs through the schema | Agents (preserved) | Still Valid | Reviewed file | Run; no team/org coverage |
| `server/tests/e2e/memory/memory-view-graphql.e2e.test.ts` | Agent run memory view through the schema | Preserved | Still Valid | Reviewed file | Run; no team/org member view |
| `web/pages/__tests__/memory.spec.ts` | One fetch per route, no fetch on click, org routes, back labels, selection before sources | REQ-002/003/007; AC-004, 009 | Still Valid | Handoff | Run |
| `web/tests/stores/memoryExplorerStore.test.ts`, `memoryInspectorStore.test.ts` | Org fetch, identity reset, late-response drop, org inspect query | AC-004, 009 | Still Valid | Handoff | Run |
| `web/components/memory/__tests__/{CollaborationMemoryDetail,MemoryHome,MemoryInspector}.spec.ts` | `displayName` shown, org tab, org breadcrumb | AC-007, 009, 010 | Still Valid | Handoff | Run |
| `web/components/memory/__tests__/AgentTeamMemoryDetail.spec.ts` | Removed by implementation (component replaced) | — | Stale / Remove (already removed) | Design Removal Plan | None |

## Stale Or Obsolete Coverage Decisions

None beyond the implementation's removal of `AgentTeamMemoryDetail.spec.ts`. It is replaced by `CollaborationMemoryDetail.spec.ts`, per the design Removal Plan.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Req / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-TEAM-01 | Team list and runs through the built GraphQL schema: renamed member type, `displayName`, own task run ID, search by the task run ID, paging | REQ-004, 009, 010; AC-005, 010, 011 | `autobyteus-server-ts/tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` | No existing e2e runs any team explorer query; the type rename is a contract change |
| E2E-TEAM-02 | `getTeamMemberRunMemoryView` for a root ID, a nested team run ID and a non-admitted root (REC-001) | REQ-005; AC-006 | same file | The resolver was only unit-tested with the source service mocked; admission comes from the real readiness index |
| E2E-TEAM-03 | A corrupt team tree among valid roots is skipped with a warning | AC-003 alternate | same file | Proves the skip rule through the transport |
| E2E-ORG-01 | `listAgentOrgsWithMemory` / `listAgentOrgRunsWithMemory`: definition card, counts, badges, address-path labels, own task run ID, task-team exclusion, search, paging, corrupt org tree skipped | REQ-006…008, 010; AC-003, 007, 008 | same file | New queries have no transport-level coverage |
| E2E-ORG-02 | `getAgentOrgMemberRunMemoryView`: member inside a configured team, task instance, unknown member → empty view | REQ-007, 010; AC-009, 011 | same file | New query |
| E2E-ORG-03 | Imported source → org list is empty; teams still list from the imported source | AC-007 alternate | same file | The empty state depends on the imported layout |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/e2e/memory --no-watch` | `autobyteus-server-ts` | New and existing memory GraphQL e2e | Planned | Ledger R-01 |
| 2 | `pnpm exec vitest run tests/unit/agent-memory tests/unit/agent-org-execution tests/unit/api/graphql/types tests/unit/skill-improvement tests/unit/application-orchestration tests/integration/agent-memory --no-watch` | `autobyteus-server-ts` | Service/location/resolver units and external `resolveTeamMemberLocation` callers | Planned | Ledger R-02 |
| 3 | `pnpm exec tsc -p tsconfig.build.json --noEmit` | `autobyteus-server-ts` | Build typecheck incl. the new e2e file imports | Planned | Ledger R-03 |
| 4 | `pnpm test:nuxt components/memory pages/__tests__/memory.spec.ts tests/stores/memoryExplorerStore.test.ts tests/stores/memoryInspectorStore.test.ts localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts --run` | `autobyteus-web` | Web memory specs | Planned | Ledger R-04 |

## Test-Case Ledger Plan

- Ledger required: `Yes`. The run has multiple independent cases, including a long build and dev stack, live timing, and a multi-step browser journey, so interruption is a real risk.
- Canonical ledger path: see Meta.
- Ledger initialized before execution: `Yes`
- Case granularity: one suite, one timing set or one browser journey per case.

| Case ID | Case / Journey | Req / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order |
| --- | --- | --- | --- | --- | --- |
| R-01 | Memory GraphQL e2e (new + existing) | AC-003, 005…011 | In-process GraphQL schema | vitest `tests/e2e/memory` | 1 |
| R-02 | Server unit/integration suites | AC-003, 006, 011 | Services | vitest | 2 |
| R-03 | Server build typecheck | — | Compiler | tsc | 3 |
| R-04 | Web memory specs | AC-004, 009, 010 | Components/stores/page | vitest (nuxt) | 4 |
| L-01 | Live timing: teams, SE team runs, orgs, org runs, member views | AC-001, 002, 007; QR-001 | Built backend over HTTP, full-fidelity copy | `curl -w %{time_total}` on :8000 | 5 |
| L-02 | Live data correctness: 4 org cards/run counts, task-instance own IDs, imported org empty, read-only check | AC-007, 011; persisted `Not Affected` | Built backend | curl + jq | 6 |
| B-01 | SCN-001/002/003: Teams tab → team card → member inspector → Back, request counting, CR-001 observation | AC-004, 010 | Browser (Nuxt dev → :8000) | Browser tab + fetch instrumentation | 7 |
| B-02 | SCN-004/005/006: Orgs tab → org card → member (team-nested + task instance) → breadcrumb, Back; search/paging | AC-004, 007…011 | Browser | Same | 8 |
| B-03 | Imported source → Agent Orgs empty state; agent card single fetch | AC-004, AC-007 alt | Browser | Same | 9 |

## Post-Repository Confidence Scorecard

Filled in after repository execution (see below).

## Broader Validation Decision

Pre-decision: `Required`. AC-001/002/007 explicitly need timing on the built backend against the user's real data. AC-004 needs real request counting and a rendered-state observation (CR-001), which mocked page tests cannot give. Final decision recorded after repository execution.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron (`autobyteus-web/electron`), which loads the same Nuxt renderer and talks to the backend over HTTP/WS.
- Relevant instructions: `autobyteus-web/AGENTS.md`, `scripts/development/*` (browser development path `pnpm dev`).
- Web-equivalent behavior: all changed UI (memory page, stores, components) and all GraphQL queries.
- Shell-specific behavior: none changed. `git diff --stat 40b1783f4..bd8450984` touches no `electron/**` file, preload, IPC or packaging.
- Chosen approach: browser against the project's dev stack (built backend + Nuxt dev), with the backend reading a full-fidelity copy of the user's memory. The upstream "manual Electron check" wording is met by the web-equivalent renderer. Running the packaged app would add no shell evidence for this diff, and it would require touching the user's running app.
- Effect on the running desktop app: none. It stays on :29695 with its own data dir.
- Not directly proven: packaged-bundle behavior of the same renderer code. Risk is negligible because no shell code changed.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| L-01/L-02 | curl against the dev backend over the cloned real data | Real-volume timing and real-data correctness | Depends on the user's private data |
| B-01…03 | Browser journey with a `window.fetch` counter | Request counts, rendered states, CR-001 | Page/store specs already durably assert the fetch ownership; a new browser E2E harness is not part of this repo's memory feature tests |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Packaged Electron bundle | No shell change; the user's app must not be disturbed | Negligible | None |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Round 1 Status Update (stopped)

- Validation of `bd8450984` was stopped at `/solution_designer` direction (package reopened, CRR-003 Design Impact). No confidence scorecard or verdict is recorded for round 1.
- Plan revisions from evidence:
  - E2E-TEAM-02: nested team run IDs cannot exist in admitted stored Team V2 roots, so the nested fallback stays unit-covered. The e2e covers unknown and non-admitted team run IDs instead.
  - Org fixtures use a task execution of a configured team (the only admittable task-team shape).
- New finding **F-001** (task-team members listed for orgs; preliminary `Design Impact`) and open item **O-001** (server vs in-process admission count). See the execution report.

## Investigation Decision

- Proceed To API/E2E Execution: `Stopped` (round 1 superseded by SR-004; the original decision was `Yes`)
- Repository-Resident Durable Coverage Will Be Added: `Yes` (`memory-collaboration-graphql.e2e.test.ts`)
- Post-repository confidence: pending
- Broader validation decision: `Required` (pre-decision)
- Reroute Required Before Validation Execution: `No`
