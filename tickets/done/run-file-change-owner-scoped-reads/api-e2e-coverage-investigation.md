# API/E2E Coverage Investigation — run-file-change-owner-scoped-reads

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision go in the execution coverage report.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-003)
- Design Spec (required on every route): `design-spec.md` (SR-003, `Ready`)
- Supplemental Task Artifacts: none behavior-defining (autobyteus-93 timing evidence `tickets/done/delegated-copies-slow-open/evidence/API-05-07-timing-summary.txt` and its probe `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs`, used as precedent only)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass, 9.4/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: round 2: test-code review CRR-002 Local Fix TR-001 (`api-e2e-test-review-report.md`); round 1: code review pass CRR-001
- Prior Investigation Reviewed: round 1 (this file)
- Latest Authoritative Investigation: this file, round 2

All paths are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/` unless written in full.

## Current Requirement And Design Basis

Every file-change read (list and content) names its owner. A run-id read serves a run only when it has standalone run metadata, running or saved. Any other run id gets `[]` / 404 with no tree scan (REQ-005, AC-007, QR-002). Team members are read through the team run (REQ-002). Org members are read through the org run and member address (REQ-003). Delegated copies are read through the hub and member address (REQ-001). Each owner read loads one tree: the live tree while the owner runs, the saved one otherwise (REQ-009). Team and org task agents resolve workspace-relative paths against their own launch workspace via `locatedExecutionSource` (AC-003, AC-005, MP-002). One content policy covers every owner (REQ-008): bytes; 409 for a pending or streaming file while the owner runs; 404 "not available" when the file is gone; 404 "not found" when the path is not a recorded change or the agent is not in the owner. Org and copy routes require `memberAddress` (400 without it). The team-member conversation lookup uses the named team only (REQ-004, AC-011). The web sends the owner subject from desktop and mobile (REQ-007, AC-012). Owner reads take under 0.5 s server time and do not grow with unrelated saved runs (QR-001, AC-010). Containment still holds: remaining scans skip an unreadable hub with a warning (AC-013).

Implementation `03f2d4da05` (server `5d6127cee4`, web `03f2d4da05`); ticket docs `581fecdf8e`. Code review CRR-001 passed with no findings and listed the API/E2E work: the two edited gated E2E files, the real-server checks of AC-003/AC-005/AC-007, the AC-001 browser journey, AC-010 timing, and the missing web typecheck.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-006 (all).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-002a / SCN-003a: a task agent of a team root or of an org root (org-root and member-team task agents) writes a workspace-relative file. Trigger: the configured member delegates with `delegate_task`, and the task agent's first turn writes the file (scripted AGY `GENERATE_IMAGE:`). This is the MP-002 premise; before this change the file answered 404.
  - SCN-002b: a team or org member's file is still being written while the root runs, and the user opens it ("not ready yet"). Trigger: the runtime's file-write tool call in progress. The scripted AGY gets a new `WRITE_FILE_HOLD:` directive that opens an MCP-projected `write_file` call and holds the turn. This emulates the in-progress write, because no scripted runtime records a pending file today (AGY's native `write_to_file` is not a file-mutation tool name).
  - SCN-004a: the hub's own files by its own run id, running and stopped, next to its copies (AC-007 alternate).
  - SCN-006a: an old browser tab or another client calls the run-id surfaces with a member id while the owner runs (member active in the activation registry), the AR-001 premise.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 copy content | Changed (hub-scoped route) | Design DS-001; handoff trace | Real HTTP: copy content route running, stopped, deleted file, wrong owner, missing `memberAddress`; browser: Artifacts tab request URL and rendered content |
| BEH-002 team member list | Changed (team query, live while running) | DS-002 | Real GraphQL `getTeamMemberFileChanges` running and saved; browser team member list |
| BEH-003 team member content incl. task agent | Changed (team route; task agent workspace root) | DS-001, AR-002 | Real HTTP, configured member and team task agent, running and saved, 409 pending while running |
| BEH-004 / BEH-005 org member list and content | Changed (org query/route) | DS-001/002 | Real GraphQL/HTTP, direct member, mounted-team member, org-root task agent, member-team task agent; running and saved |
| BEH-006 standalone run-id reads | Changed (narrowed to standalone metadata) | AR-001 | Real server: member ids → `[]`/404 with owner running and saved; hub's own id served |
| BEH-007 copy list | Preserved | autobyteus-93 | Existing E2E kept green |
| BEH-008 team member conversation lookup | Changed (team root passed) | DS-003 | Real GraphQL `getTeamMemberRunProjection` with the right team and with another team |
| BEH-009 mobile | Changed (owner subject) | `useMobileFocusedRunIdentity` | Browser probe at a mobile viewport |
| Containment (AC-013) | Preserved (trigger moved to FU-A surface) | R-003 | Existing E2E kept green; warning tied to the scanning read itself |
| Removed: collaboration fallback scan, `getEntry`, run-id member reads | Removed | Removal plan | Real server shows no member files by run id; timing flat in seed size |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `RunFileChangeProjectionService`, member-view services, `locatedExecutionSource` | IMP-02 unit tests with real stored trees and read spies | Live (running) member reads use a mocked live service | Real-server E2E with running roots |
| API / transport / contract | Yes | 2 new GraphQL queries, 3 new REST routes, narrowed run-id surfaces | REST unit tests, IMP-03 integration (team saved only) | Org and copy routes, running owners, task agents over real HTTP | Gated server E2E |
| Frontend component / state | Yes | Viewer `readSubject`, fetch dispatch, hydration subjects, mobile subject | IMP-04 component/unit tests | Real stores feeding the real subject; no web typecheck | Browser probe on a real stack; ad-hoc type check |
| Browser integration / user journey | Yes | Artifacts tab and mobile Artifacts content requests | None real (IMP-06 fixture probe passes `null` subject) | Whole journey | Browser probe (probe-owned stack) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer as the browser | — | — | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific integration | No | No main/preload/IPC change | — | — | None |
| Process / lifecycle | Yes (read side) | Running vs stopped owner decides live vs saved | Unit (mocked live) | Real stop/terminate transition | Gated E2E stops roots mid-test |
| Persisted-data transition | No | Reads only (`Not Affected`) | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | Scripted AGY only drives runs | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads`, branch `codex/run-file-change-owner-scoped-reads`
- Project type and runtime stack: pnpm monorepo; `autobyteus-server-ts` (Node 22, Fastify, type-graphql, Prisma sqlite); `autobyteus-web` (Nuxt 3, Pinia, vitest); Electron shell not affected
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/TESTING.md` (root; no closer `TESTING*.md` in `autobyteus-server-ts` or `autobyteus-web`)
- Conflicting, missing, or unclear project instructions: the web has no typecheck script (known; recorded by implementation and code review)
- Required environment variables or secrets available: `N/A` (scripted AGY runtime, no provider)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, path choice, environment and data rules | Server E2E for API journeys; browser probe for renderer behavior; clean env for E2E (`env -i …`); `dist` must be built from the worktree; own data roots and ports; stage paths explicitly; Rule 9 for failures |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | Package commands | `vitest run <file> --no-watch`; `test:nuxt --run`; never `git add -A` |
| Gated E2E headers (`tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts`, `tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts`) | Gate and command | `env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`; the containment UC-2 starts `dist/app.js` |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Real Agent/Team/Org roots on a test-owned Studio server | `startRoot`, `calls`, `sendTo`, `terminate`, own data dir and cleanup |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY (`linked_skills`) | `GENERATE_IMAGE:<abs path>` records a generated-output file change (workspace-relative when inside the workspace); `CALL_TOOL:` real tool calls; `HOLD_TURN` |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Precedent probe with a probe-owned real stack | Server `dist/app.js` with private data dir and HOME, Nuxt dev with `BACKEND_*` env, headless Chrome via `playwright-core`; seeds through public APIs only; 300 unrelated team runs ≈ 35 s |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | Serialized, once per source change | exit 0 | — |
| In-process E2E server | worktree | via vitest (harness) | Own temp data dir, sqlite, scripted AGY, temp HOME | harness | `h.close()` removes data dir |
| Probe backend | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <probe dir>` | Private HOME, `ANTIGRAVITY_CLI_COMMAND`, `AGY_FAKE_CASE=linked_skills` | log `listening` + `{__typename}` | process-group SIGTERM; port closed check |
| Probe frontend | `autobyteus-web` | `pnpm exec nuxi dev --host 127.0.0.1 --port <free>` with `BACKEND_*` env | Warm up before asserting (cold optimizer reload) | HTTP 200 | process-group SIGTERM |
| Headless Chrome | — | `playwright-core` with system Chrome | Fresh context | — | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Hub with a delegated copy and files | Public GraphQL + scripted AGY `delegate_task` / `GENERATE_IMAGE` | Test-owned data root only | Removed by harness / probe |
| Team root with configured member, team task agent, pending file | Same, plus new `WRITE_FILE_HOLD:` directive | Same | Same |
| Org root (direct agent, member team) with org-root and member-team task agents | Same | Same | Same |
| Hundreds of unrelated saved team runs (AC-010) | `createAgentTeamRun` + `terminateAgentTeamRun` through GraphQL (precedent probe) | Test-owned seed dir under `/tmp/rfcosr-api/` | Seed dirs removed after measurements; evidence kept |
| Unreadable hub tree (AC-013) | Existing containment E2E truncates its own test tree | Own data dir | Harness |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts` | Copy list hub-scoped running/stopped; run-id query gives a running/stopped copy `[]`; wrong-owner errors | REQ-001, REQ-005, AC-007, AC-009, BEH-007 | Needs Update | Read; run API-02 passes | Add the copy content route (AC-001 server side: bytes running and stopped, deleted file 404 "not available", wrong hub 404, missing `memberAddress` 400) and the hub's own id served running and stopped (list + content) |
| `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | Remaining scans skip the unreadable hub with a warning; other runs work; restart holds | AC-013, R-003 | Needs Update | Read; run API-03 passes; the warning assertion covers all reads together (token summary, collaboration view and the context-file read), so it does not prove the moved trigger itself warns | Collect the warnings emitted by the scanning context-file read alone and assert they name the bad run (UC-1 and UC-2) |
| `autobyteus-server-ts/tests/integration/api/run-file-changes-api.integration.test.ts` | Standalone list/content, 404/409, team member team-scoped (saved), run-id narrowed | AC-002, AC-003 (saved), AC-006, AC-007 | Still Valid | IMP-03 at `03f2d4da05` | Reuse |
| `autobyteus-server-ts/tests/unit/run-history/collaboration-member-file-change-reads.test.ts` (new) | Real stored trees, 20 unrelated roots, read spies; task agents; 409 with mocked live service | AC-002..AC-005, AC-008, AC-009 | Still Valid | IMP-02 | Reuse; running path gets real-server proof in API-04 |
| `autobyteus-server-ts/tests/unit/run-history/run-file-change-projection-service.test.ts`, `team-member-run-view-projection-service.test.ts`, `standalone-root-member-file-changes.test.ts`, `tests/unit/agent-collaboration/execution/located-execution-source.test.ts`, `tests/unit/api/rest/run-file-changes.test.ts`, GraphQL type tests | Unit contracts of the changed services and routes | AC-007, AC-011, QR-002, REQ-008 | Still Valid | IMP-02 | Reuse |
| Web specs: `ArtifactContentViewer.spec.ts`, fetch/hydration specs, `useMobileFocusedRunIdentity.spec.ts`, store/fixture specs | Owner URLs per kind, guard, dispatch, subjects | AC-001..AC-005, AC-012 | Still Valid | IMP-04 | Reuse; real-store wiring gets browser proof (API-05) |
| `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | Viewer rendering on a fixture page (`readSubject=null`) | Rendering only | Still Valid / Out Of Scope for owner reads | IMP-06b | Reuse as rendering regression only |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | autobyteus-93 copy-open journey; `S-API` times `copyArtifactsGeneric` (run-id query on a copy) | autobyteus-93 | Out Of Scope (its generic timing row now measures a `[]` answer, which is not a failure; not run here) | Read | None |

## Planned Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | All server and web repository criteria (AC-002..AC-009, AC-011, AC-012 unit layers; REQ-008; QR-002) | Server typecheck, unit, integration; web unit/component; web guards; codegen | Reused | IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-07 | Ran on `03f2d4da05`; `git diff --name-only 03f2d4da05 581fecdf8e` touches only the ticket folder; logs have headers and exit lines |
| API-02 | AC-007, AC-009, BEH-007 | Real HTTP/GraphQL, hub roots | Existing Test | Gated E2E as reviewed (command in its header) | Edited in IR-001 but not run |
| API-02b | AC-001 (server), AC-006, AC-007 (alternate: hub's own id), AC-009, REQ-008 | Real HTTP/GraphQL, copy content route | Durable (update) | Same file after the update | No real-server test of the copy content route or the hub's own id |
| API-03 | AC-013 | Real HTTP/GraphQL + restarted `dist/app.js` | Existing Test | Gated E2E as reviewed | Edited in IR-001 but not run |
| API-03b | AC-013, R-003 | Same | Durable (update) | Same file; warnings from the context-file read alone | Proves that the moved trigger itself still scans and warns |
| API-04 | AC-002, AC-003, AC-004, AC-005, AC-007, AC-008, AC-009, AC-011, REQ-008, REQ-009 | Real HTTP/GraphQL, team and org roots, running then stopped | Durable (new) | New gated E2E `tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts` + fixture `WRITE_FILE_HOLD:` | No real-server test of the new team/org queries and routes, running owners or task agents |
| API-05 | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-012, REQ-007 | Browser on a probe-owned real stack (desktop and mobile viewports) | Durable (new browser probe) | New `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` (package script `test:e2e:owner-scoped-file-reads`): seed through public APIs, then open files from the Artifacts tab for a copy, a team member and team task agent, an org member and org task agent, a standalone run; deleted copy file; mobile Artifacts for an agent run and a team member; record each content request URL and the shown content | Only real stores produce the subject the viewer gets; the web has no typecheck; repeatable for regressions |
| API-06 | AC-010, QR-001 (and QR-002 at system level) | Real server HTTP timing | Durable (same probe, timing cases) | Same probe on a small seed (few unrelated team runs) and a large seed (≥ 600 unrelated saved team runs): median server time of each owner list and content read; a still-scanning control (FU-A team-member context-file read) shows the seed size matters | QR-001 needs timing on a changed build |
| API-07 | REQ-007 (web types) | Web sources changed by the ticket | Temporary Probe | `vue-tsc --noEmit` (ad hoc, not installed in the repo) on the head and on the base; compare errors in the changed web files | The web has no typecheck script; a durable script would be a project-wide change outside the ticket |
| API-05c | TR-001 (probe validity) | Browser probe | Temporary Probe | Temp copy of the probe injecting a page exception (B-004) and a console error (B-005) | Round 2: proves the TR-001 rule fails journeys on browser errors; a durable injected failure would break the probe |
| API-03c | AC-013 (assertion validity) | Containment E2E | Temporary Probe | Temp copy of the API-03b test with a non-scanning read in place of the scanning one | Added during the run: proves the API-03b assertion fails when the read does not scan; a durable mutation copy would duplicate the suite |
| API-04b | AC-008 (stability) | New gated E2E | Existing Test (repeated) | 9 runs of the first version, 10 runs after the stored-record wait | Added during the run after an intermittent failure (Rule 9) |
| API-08 | AC-008 / AC-003 (risk) | `RunFileChangeService.load` | Temporary Probe | Temp vitest probe, real service, delayed first stored read | Added during the run: deterministic cause of the API-04 intermittent failure; the code is outside the Change Scope (follow-up FU-C), so no durable test here |
| API-09 | Test validity | Scripted AGY fixture | Existing Test | `vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | Added during the run: the fixture changed (TESTING.md rerun-by-impact) |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-04 | `autobyteus-server-ts/tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts` | Real-server contract of the two new GraphQL queries and the team/org REST routes, running and saved, including task agents and the narrowed run-id reads |
| API-04 | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`WRITE_FILE_HOLD:<path>` directive) | Pending-file state for the 409 rule on a running team/org |
| API-05, API-06 | `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` + `autobyteus-web/package.json` script | Repeatable browser and timing regression check of owner-scoped reads |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-02b | `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts` | Copy content route checks; hub's own id list/content | Same roots; adds a hub-own `GENERATE_IMAGE` |
| API-03b | `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | Warnings captured per scanning read | Keeps the rest unchanged |
| API-05 (round 2) | `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` | Fail each journey on browser errors; allow only B-005's 404 resource lines for `/file-change-content`, at most one per 404 content response (CRR-002 TR-001) | Commit `ae178ebe39` |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron wrapping the Nuxt renderer and the embedded server.
- Testing guideline used: `TESTING.md` "Choosing the path": renderer and client–server behavior → web tests + a browser probe.
- Web-equivalent behavior: everything this ticket changes (renderer components, stores, GraphQL/REST to the server).
- Shell-specific or lifecycle behavior: none changed (no main, preload, IPC, packaging change).
- Chosen validation approach and why it fits the project: probe-owned real stack in headless Chrome (server `dist` + Nuxt dev), as TESTING.md prescribes for renderer behavior; an isolated desktop instance would add no evidence for an unchanged shell.
- Server/frontend setup when browser validation is used: see the component table.
- How the run avoids disturbing an already-running desktop application: own ports, own data root and HOME; nothing touches `~/.autobyteus` or the user's app.

## Live Environment And Fixture Plan

- Startup order and commands: build server; probe seeds with backend only; then backend + Nuxt dev + Chrome for journeys; timing on the backend only.
- Environment choices that materially affect the run: private HOME; scripted AGY; sqlite under the probe data root; warm Nuxt before asserting.
- Health / readiness checks: backend `listening` line and GraphQL `{__typename}`; Nuxt HTTP 200 and router ready.
- Seed data / fixtures: through public GraphQL/WebSocket APIs only (definitions, workspaces, roots, `delegate_task`, `GENERATE_IMAGE`, team runs created and stopped).
- Test identities, authentication, permissions, or session state: none (local server without remote access).
- Requirement-linked journeys or scenarios: SCN-001..SCN-005 as API-05; SCN-001..SCN-003 timing as API-06.
- Evidence to capture: `evidence.json` with each case's DOM/state assertions, content request URLs and statuses, timings; screenshots; backend/frontend logs; cleanup receipt.
- Owned processes and temporary state to clean up: backend, Nuxt, Chrome, `/tmp/rfcosr-api/*` seed and data dirs.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Timing on the user's own 680 saved team runs | Never test against the user's data (TESTING.md Rule 2) | Real trees are larger than synthetic ones; scoped reads do not depend on other trees, so the risk is low | No (the synthetic seed plus the scanning control prove the independence) | None |
| A pending file produced by a real provider runtime | Scripted runtimes cannot produce one (AGY `write_to_file` is not a file-mutation tool name); emulated with an MCP-projected `write_file` step | The read path is the same once the live record holds a pending entry | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| `RunFileChangeService.load` live-cache race: a first read that overlaps a run's first FILE_CHANGE event leaves the live projection without that entry until the run stops (found during the run) | Out of scope, pre-existing (TESTING.md Rule 9: product defect not caused by this change); not a reroute of this ticket | API-08 deterministic reproduction; API-04b; code identical on base `cba6b85122`; the design's Change Scope leaves "RunFileChangeService live tracking" alone | Follow-up FU-C to `/project_task_manager` |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated; none removed)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Round 2 (TR-001): the probe now fails each journey on browser errors (only B-005's 404 resource lines for `/file-change-content`, at most one per 404 content response, are allowed). Rerun by impact: API-05, API-06 and the new API-05c; all other cases still valid (the diff changes only the probe).
- Notes: API-02 and API-03 ran first, on the files as reviewed (both Pass), before the durable updates. During the run, the mobile journeys were added to API-05 (B-006/B-007), and API-03c, API-04b, API-08 and API-09 were added (rows above).
