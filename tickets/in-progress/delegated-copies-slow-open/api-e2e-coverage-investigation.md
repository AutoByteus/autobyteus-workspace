# API/E2E Coverage Investigation — delegated-copies-slow-open

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/delegated-copies-slow-open/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-004)
- Supplemental Task Artifacts: `probes/open-cost-probe.test.ts`, `probes/probe-run1.txt`, `probes/shape.py` (baseline evidence)
- Design Review Report: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.4)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

All paths above are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/`.

## Current Requirement And Design Basis

A standalone run with delegated copies (the hub) must draw its copy rows from its collaboration view alone (REQ-001, AC-001, AC-002), open without waiting for copies (REQ-002, AC-003), load one copy's stored conversation, activities and artifacts only when that copy is opened, through a hub-scoped server read whose cost does not depend on unrelated stored runs (REQ-003, REQ-004, AC-004, AC-009), and keep statuses, Task summaries, live updates, sending and pending input unchanged (REQ-005, REQ-006, AC-005, AC-006). A new delegation on a live hub must refresh only the opened copy (REQ-007, AC-007). REQ-008 / AC-008 needs baseline and fixed timings on a realistic large hub and a repeatable regression check. QR-001: rows ≤ 2 s after the hub row; QR-002: hub and copy conversation ≤ 2 s after the click, a copy's artifact lookup ≤ 100 ms with hundreds of stored runs.

Design D-1..D-5 (SR-004): structure-only `buildAgentRunCollaborationContext`; `hydrateAgentRunCollaborationChild` bound to one published context with supersession and 3 conflict retries; GraphQL `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` via `StandaloneRootMemberViewProjectionService.getFileChanges` → hub-scoped `requireLocation` → `RunFileChangeProjectionService.getLocatedCollaborationMemberProjection`; adoption carries opened children's conversation; store-owned dedupe keyed by (context, child). Code review accepted handoff Assumptions 1 (live-tool authority at commit) and 2 (pending-input overlay). Residuals to observe: CAND-003 (retry exhaustion on a busy copy), R-004, R-E, FU-4, R-B (running hub returns live artifacts).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-005, plus MP-001 (code review gate: open a copy of a hub that is not the selected run).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 Reload with a copy holding queued user input: the user sends to a busy copy (its message queues), then the app reloads (fresh store; running hub snapshot) and the user opens that copy. Trigger: composer send + page reload. Exercises the Assumption 2 overlay on the real stack.
  - SCN-A2 Task locate on a large hub: Projects page → Task root click → the hub's view must list the worker within `useTaskRootNavigation`'s 5 s wait (FU-4).
  - SCN-A3 Running hub copy produces an artifact, then the hub stops: the copy's artifact list is served live while running and from the stored file afterwards (R-B), over real GraphQL.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 rows from the view alone | Changed | D-1; handoff trace | Request counts and timing on a large real hub, base vs fix |
| BEH-002 hub opens without copy loads | Changed | D-1 | Hub click → conversation timing, stopped and running |
| BEH-003 copy loads on open, hub-scoped | Changed / Added (GraphQL query) | D-2, D-3, D-5 | GraphQL E2E for the new query; copy click timing and request counts; server lookup timing with ≥300 stored runs |
| BEH-004 republication refreshes only the selected copy | Changed | D-4 | Live delegation with one opened copy: exactly 1 projection + 1 file-change request; opened copy keeps its conversation |
| BEH-005 statuses, summaries, closed-Task hiding | Preserved | REQ-005 | Base vs fix row equivalence on the same data |
| `getRunFileChanges(runId)` collaboration branch (refactored into `locatedCollaborationMember`) | Preserved | handoff key files | Integration test of the generic route; E2E compares generic vs scoped results |
| Pending (held/queued) input after load | Preserved (Assumption 2) | handoff, CAND-002 | Real-stack queued input after reload (SCN-A1) |
| `fetchMemberRunState` explicit fetchers (team/org callers) | Changed (mechanical) | handoff | Reused web suite (IMP-05c) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | member view service `getFileChanges`, extracted located-member projection | IMP-02 unit (mocked location of live projection) | Real active-member projection, real stored file, real tree lookup | Server E2E (API-02), integration (API-03) |
| API / transport / contract | Yes | new GraphQL query | none at transport level | Schema, argument binding, error surface over HTTP | Server E2E (API-02) |
| Frontend component / state | Yes | store, context, child hydration, streaming service | IMP-04, IMP-05c, IMP-08 | Real backend timing, real stream ordering, browser concurrency | Browser real stack |
| Browser integration / user journey | Yes | rows, hub open, copy open, live delegation, send, Task locate | IMP-09 (7 Teams) | Large hub (≥50 Teams), timings, AC-007 counts on a real live delegation, queued input after reload | Browser probe on a probe-owned real stack |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same renderer) | renderer code | browser probe | Production bundle timing in the shell | Isolated desktop instance (fix build) |
| Desktop shell / Electron-specific integration | No | no Electron code changed | — | — | — |
| Process / lifecycle | Yes | hub stopped vs running; copy wake on send | IMP-09 B-005 | Send to an opened copy of a stopped hub | Browser probe |
| Persisted-data transition | No (`Not Affected`, reads only) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | scripted AGY only | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open`, branch `codex/delegated-copies-slow-open`, HEAD `7d32c3aa2b` (code identical to `54e5356ae6`).
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL/WebSocket server (`autobyteus-server-ts`, node 22), Nuxt 3 web (`autobyteus-web`), Electron shell.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/TESTING.md` (root); no closer `TESTING*.md` in `autobyteus-server-ts` or `autobyteus-web`.
- Conflicting, missing, or unclear project instructions: `autobyteus-web/AGENTS.md` and TESTING.md agree. The machine is shared and heavily loaded (load average 118–190 on 10 cores at start); timings are recorded with the load average and compared base vs fix in the same session.
- Required environment variables or secrets available: `N/A` (scripted AGY only; no provider keys).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global layers and rules | Server E2E `vitest run <file>`; browser probes own their stack; isolated desktop via `pnpm --silent isolated-app start --build`; never the user's app or data; clean env for E2E folders; scripted AGY `ANTIGRAVITY_CLI_COMMAND`, `RUN_AGY_FAILURE_E2E=1` |
| `docs/isolated-app-instances.md` | Desktop instance | `--data-root <owned dir>` keeps a seeded root; embedded server gets only a baseline env (no scripted AGY), so seeding happens beforehand |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Real in-process Studio server + scripted AGY roots | `startCollaborationHarness`, `startRoot('agent')`, `calls`, `terminate` |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY | `linked_skills`: `CALL_TOOL:{…}` calls a real agent tool; `HOLD_TURN` keeps a turn running; `ECHO_INPUT` echoes input; generated-output steps exist only in case `mcp_calls` |
| `autobyteus-web/tests/e2e/delegated-team-default-collapse-probe.mjs` | Existing real-stack probe pattern | owned backend (`dist/app.js`), Nuxt dev, Chrome, request/frames capture, cleanup receipt |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build (fix) | worktree | `pnpm -C autobyteus-server-ts build` (built for IMP-09 at `54e5356ae6`) | untracked `dist/` | `dist/app.js` present | none |
| Base build | `/tmp` git worktree at `5ceb43039a` | `git worktree add --detach`, `pnpm install --frozen-lockfile --offline`, server `prebuild` + `build`, `nuxt prepare` | separate node_modules | `dist/app.js` present | `git worktree remove --force` |
| Probe stack (per run) | `autobyteus-web` | `node tests/e2e/delegated-copies-large-hub-probe.mjs …` | free ports, own data root copy, private HOME | backend `listening` + GraphQL; Nuxt 200 | probe stops process groups, removes data copy, checks ports |
| Isolated desktop instance (fix) | repo root | `pnpm --silent isolated-app start --build --data-root <owned seeded root>` | packaged worktree build | `start` JSON `ok` | `isolated-app stop <id>`; `list` shows none |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Large hub: ≥50 task Teams × 6 members (≥300 child agents), few-MB hub message log | Probe seed mode: real GraphQL definitions, Project Tasks, scripted AGY `delegate_task` and `send_message_to` through the real server | Test-owned data root in `$TMPDIR`; never user data | Seed root kept read-only as template for the run, then removed |
| ≥300 unrelated stored team runs | `createAgentTeamRun` + `terminateAgentTeamRun` over GraphQL | same | same |
| Small hub with an artifact-producing copy | Server E2E harness; scripted AGY generated-output step (new `GENERATE_IMAGE:` directive) | in-process server, temp data dir, private HOME | harness `close()` removes |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/standalone-agent-run-root/standalone-root-member-file-changes.test.ts` | scoped read, stored/live, rejects foreign; no unscoped lookup | D-3, AC-009 | Still Valid | IMP-02 | Reuse |
| `autobyteus-server-ts/tests/unit/run-history/services/run-file-change-projection-service.test.ts`, `tests/unit/api/rest/run-file-changes.test.ts` | generic run-id path | preserved | Still Valid | IMP-02 | Reuse |
| `autobyteus-server-ts/tests/integration/api/run-file-changes-api.integration.test.ts` | generic route over in-process server | preserved generic path | Still Valid | not run by implementation | Run (API-03) |
| `autobyteus-web/stores/__tests__/agentRunCollaborationLazyChildren.spec.ts` | 5 vs 50 Teams: 1 view request, 0 member requests; republication counts; supersession | AC-001, AC-002, AC-004, AC-007 | Still Valid | IMP-04 | Reuse; it is the repository regression check for REQ-008 |
| `autobyteus-web/services/agentCollaboration/__tests__/agentRunCollaborationChildHydration.spec.ts` | load policy | AC-004, AC-006 | Still Valid | IMP-04 | Reuse |
| Other updated web specs (store, closure, disclosure, compaction, streaming, rows, member run state) | as listed in the handoff | AC-005 etc. | Still Valid | IMP-04, IMP-05c | Reuse |
| `test-support/native-input-history/native-accepted-input-history.integration.test.ts` | held/queued input after hydration | AC-006 | Still Valid | IMP-07 | Reuse |
| `autobyteus-web/tests/e2e/delegated-team-default-collapse-probe.mjs` | 7-Team real stack rows, copy open, live closure | AC-001, AC-004, AC-005, AC-007 (rendered) | Still Valid | IMP-09 | Reuse |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | member projection query on a real backend | unchanged query | Out Of Scope | handoff | none |
| Server E2E for `agentRunCollaborationMemberFileChanges` | — | AC-009, D-3, R-B | missing | — | Add (API-02) |
| Large-hub timing / request-count probe | — | AC-008, QR-001, QR-002, AC-007 live | missing | — | Add (API-04..API-10) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-009, REQ-004, D-3 | server unit (scoped read) + whole server unit suite + typecheck | Reused | IMP-01, IMP-02, IMP-03 | ran at `54e5356ae6`; `git diff --name-only 54e5356ae6 7d32c3aa2b` touches only `tickets/` |
| API-R2 | AC-001, AC-002, AC-004..AC-007 | web specs and full web suite, guards | Reused | IMP-04, IMP-05c, IMP-06 | same commit argument |
| API-R3 | AC-006 (held/queued) | native producer → server view → web hydration | Reused | IMP-07 | same |
| API-R4 | AR-001, D-2, D-4, D-5, REQ-006 | mutation checks | Reused | IMP-08 | same |
| API-R5 | AC-001, AC-004, AC-005, AC-007 (7 Teams, rendered) | real-stack browser | Reused | IMP-09 | same; my fixture-CLI change adds a directive the probe never sends |
| API-02 | AC-009, REQ-004, R-B, D-3 | GraphQL over the real in-process server, real trees, real stored file and live projection | Durable | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts --no-watch` (clean env) | new public query had unit coverage only |
| API-03 | preserved generic path | server integration | Existing Test | `pnpm -C autobyteus-server-ts test:integration:prepare`, then `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/run-file-changes-api.integration.test.ts --no-watch` | refactored branch of the generic route |
| API-04 | AC-008 (fixture) | real server, public APIs | Journey (durable probe, seed mode) | `node tests/e2e/delegated-copies-large-hub-probe.mjs --seed-to <owned dir> --teams 50` | builds the realistic large hub |
| API-05 | AC-008, QR-001, QR-002 (baseline), AC-009 baseline | base build `5ceb43039a`, browser + GraphQL | Journey | probe `--from-seed <copy> --stack-root <base worktree> --label base` | baseline numbers |
| API-06 | AC-001, AC-002, AC-003 (stopped), AC-004, AC-005, AC-008, AC-009, QR-001, QR-002 | fix build, browser + GraphQL | Journey | probe `--from-seed <copy> --label fix` | fixed numbers, request counts, row equivalence with API-05 |
| API-07 | AC-003 (running), AC-006, AC-007, CAND-003 | fix build, running large hub | Journey | probe live phase: hub running, open a copy, real `delegate_task` of a new Team, count requests; send to the opened copy via the composer | live republication on a real stream |
| API-08 | AC-006, REQ-006 | fix build, stopped hub | Journey | probe: open a copy of a stopped hub, send via the composer; copy wakes, message shown and stored | send path on a stopped hub |
| API-09 | AC-006 (pending input), SCN-A1 | fix build, running hub, page reload | Journey | probe: copy held busy (`HOLD_TURN`), user sends via composer (queued), reload page, open the copy, queued marker shown | Assumption 2 on the real stack |
| API-10 | MP-001 / R-004, FU-4 | fix build | Journey | probe: click a copy under a hub that is not selected (count loads ≤ 2, ends loaded); Projects Task-root click on the large hub (worker selected within 5 s) | accepted residual and follow-up check |
| API-11 | AC-001, AC-003, AC-004, QR-001, QR-002 in the shell | isolated desktop instance of the fix build, seeded large hub (stopped) | Journey | `pnpm --silent isolated-app start --build --data-root <seeded copy>` + probe `--desktop-instance` timings | production bundle in Electron; web-equivalent probe cannot show shell timing |

| API-L008 | REQ-005, REQ-006 | fix build, running hub | Journey (added during execution) | probe L-008: open a never-started copy, composer `HOLD_TURN`, sample row/header/server status | settles the status question raised by my first L-004 attempt (its Enter was the Interrupt action) |
| API-L009 | CAND-003 | fix build, running hub | Journey (added) | probe L-009: open a copy during a burst of 8 turns | residual-risk observation the code review asked for |
| API-12 | fixture regression | existing scripted-AGY suite | Existing Test (added) | `standalone-unreadable-tree-containment.e2e.test.ts` + API-02 with the changed fixture | the fixture CLI is shared by many suites |
| API-13 | web rules | web guards | Existing Test (added) | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | new probe file and package script |
| API-14 | QR-002 / AC-004 for a big copy | fix build (+ base comparison) | Journey (added) | probe L-010: a copy with a 2.4 MB conversation, prose and unbroken-token shapes | every other opened copy had a small conversation; real copies average ~1.3 MB |
| API-15 | AC-004 alternate (failure) | fix build, real browser | Journey (added) | probe L-011: abort one copy's projection request, check log/unloaded/other copy/retry | the failure path had unit coverage only |

API-07..API-10 ran as one probe run on the large hub (L-001..L-008): API-08 = L-007, API-09 = L-004 (queued input sent by a second client, because the composer shows Interrupt while the copy runs), API-10 = L-005 + L-006.

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02 | `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts` | Public GraphQL contract (stored, live, rejected) needs transport-level regression coverage |
| API-02 | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`: `GENERATE_IMAGE:<path>` directive in `linked_skills` | A delegated copy must produce a real artifact through the normal AGY event path; only case `mcp_calls` could, and it cannot delegate |
| API-04..API-11 | `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` + script `test:e2e:delegated-copies-large-hub` | REQ-008's repeatable regression check on a realistic large hub (request counts + timings), runnable against any build |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron with embedded server.
- Testing guideline used: TESTING.md, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: everything this ticket changes (renderer store/services + server).
- Shell-specific or lifecycle behavior: none changed.
- Chosen approach: browser real stack for base vs fix and all live cases; one isolated desktop instance of the fix build on the seeded (stopped) large hub for timings in the production bundle.
- Server/frontend setup: probe-owned backend from `dist/app.js` and Nuxt dev.
- Avoiding the running desktop app: own ports and data root; `isolated-app` only; never the user's instance.

## Live Environment And Fixture Plan

- Startup order: build base worktree → seed large hub (fix build backend) → base run → fix run (stopped cases, then live cases) → desktop instance.
- Environment choices: private HOME; scripted AGY `linked_skills`; `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` left default.
- Readiness: backend `listening` + `{__typename}`; Nuxt 200 + optimizer warm-up page.
- Seed data: see Data table.
- Identities: none.
- Journeys: API-05..API-11.
- Evidence: probe `evidence.json` (timings, per-operation request counts, store state), screenshots, backend logs, load average.
- Cleanup: probe process groups, data copies, private HOME, base worktree, seed root, desktop instance.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Live journeys inside the desktop shell | The embedded server receives only a baseline environment, so the scripted AGY CLI cannot run there | The same renderer code is proven live in the browser | No | — |
| The user's own PM hub (286 children, 388 MB traces) | Never run the app on user data or a copy (TESTING Rule 2, design guidance) | Synthesized traces are smaller, so baseline projection payload is understated | No | — |
| Base build in the desktop shell | Baseline cause is request fan-out, identical in browser; packaging a second build adds no evidence on the fix | low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: test-code review of the added durable tests is requested on Pass (reviewed route).
