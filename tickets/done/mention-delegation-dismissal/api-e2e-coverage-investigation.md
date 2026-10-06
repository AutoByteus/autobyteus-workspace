# API/E2E Coverage Investigation — mention-delegation-dismissal

## Investigation Meta

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/`.

- Requirements Doc: `requirements-doc.md` (SR-003, Approved 2026-10-06; REQ-001..013, AC-001..015)
- Investigation Notes: `investigation-notes.md` (E-01..E-36)
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-005)
- Design Spec: `design-spec.md` (SR-005)
- Supplemental Task Artifacts: None (`N/A — not applicable`)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.3)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A (not a delivery re-entry)
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 on commit `a2a7b37bc` (base `3c8e49ad5`)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (reviewed Large/High route; durable test code is changed)

## Current Requirement And Design Basis

- `@X` resolves names/kinds/addresses only; it writes no collaborator entry and no row (REQ-001). The note steers the agent to `delegate_task` and DONE (REQ-002). Older saved notes still render as chips.
- A described `delegate_task` from an unowned sender creates a text-only ad-hoc Task at `<appData>/ad-hoc-tasks/<id>/`, links the copy as `assigned` before resources, and returns `{target_agent_run_id, task_id}` (REQ-003/004/013). A rejected call creates no Task.
- `create_or_update_task` has a strict create mode `{project_id, description}` and a strict update mode `{task_id, status?, description?}`; `project_id` with `task_id` is rejected (REQ-005).
- Ad-hoc DONE equals Project DONE: closed forever, stopped, hidden live and after reopen/restart, fenced, history kept (REQ-006).
- `create_or_update_task` is automatic wherever `delegate_task` is (REQ-007, all runtimes).
- Ad-hoc Tasks are never listed under Projects (REQ-008) and are deleted with the hosting run's permanent delete (REQ-009).
- Preserved: Task-owned sub-work stays in its Task (REQ-010); stored collaborators keep working (REQ-011); ad-hoc paths work while the Projects migration is pending (REQ-012); linked delegation and Project DONE are unchanged (AC-014).
- Persisted data: `Not Affected` for existing data; additive `ad-hoc-tasks/` root.
- Code review: Pass, no findings. C-09 (stale live probe) is an API/E2E-owned required item.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005, SCN-006, SCN-007.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 `@` combined with the agent delegating in the same turn: the real trigger is a user send with `mentions`; the focused agent's next action is `delegate_task` to the note's address. The deterministic suite scripts that next action. The live probe lets a real model decide it.
  - SCN-A2 the agent-initiated bring-in (an unowned host's first `send_message_to` to a catalog address) is how collaborator entries still arise after this change. It is the real producer of the "stored run with collaborators" state for SCN-007/AC-012.
  - SCN-A3 a sub-copy of an ad-hoc copy (the copy's own described `delegate_task`) is closed by the ad-hoc DONE (SCN-006 applied to an ad-hoc owner).
  - SCN-A4 the first message of a New chat carrying an `@` mention (existing probe cases N02/N03) now goes through the same resolution path.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none in the requirements. The code review's C-04/C-05 (corrupted ad-hoc file, UUID collision) are not reachable from supported use and are not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 `@` adds nothing | Changed | REQ-001, DS-001 | Server wire proof per root + live browser proof that no row appears from the send |
| BEH-002 mention note | Changed | REQ-002 | Stored message text at the wire; web chip in the live probe; old-note parsing in the web/contract unit tests |
| BEH-003 ad-hoc Task on described delegation | Added | REQ-003/004/013 | Real MCP tool call → `task.json` on disk, text only, `task_id` in the tool result |
| BEH-004 two strict modes | Changed | REQ-005 | Real tool calls: update by `task_id` alone (ad-hoc and Project Task), rejection of `project_id`+`task_id`, unknown id, create without a Project |
| BEH-005 ad-hoc DONE | Added | REQ-006 | Live closed event, snapshot, stored read, fencing of a run-ID message, repeat DONE, and a real backend restart |
| BEH-006 automatic `create_or_update_task` | Changed | REQ-007 | The host definitions get no Project tools selected. Every run (AGY scripted, Claude, Codex, and AutoByteus when a model is available) must still be able to call it |
| BEH-007 Task-owned sub-work | Preserved | REQ-010 | Sub-delegation by the ad-hoc copy creates no second Task and is closed with it |
| BEH-008 listing + delete cleanup | Added | REQ-008/009 | GraphQL Project listing excludes it; permanent delete of each root kind removes only its ad-hoc folders |
| BEH-009 stored collaborators | Preserved | REQ-011 | Bring-in collaborator → Stop → reopen → message by address |
| REQ-012 migration pending | Preserved | AC-013 | `projects/projects.json` present → delegation + DONE work while Projects reject |
| AC-014 linked delegation | Preserved | AC-014 | Existing `task-closure-root-visibility.e2e`, `projects-feature-probe`, `task-closure-tree-probe` |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Projects services and stores, delegation lifecycle, dispatch | Unit tests (`ad-hoc-tasks.test.ts`, dispatch, lifecycle) | In-memory port fakes in the runtime tests | Server E2E through real HTTP/WS/MCP |
| API / transport / contract | Yes | `delegate_task` result, `create_or_update_task` modes, WS SEND_MESSAGE `mentions`, closure frames | Tool unit tests, `project-task-boundaries.e2e` | Real scoped-MCP tool calls from a runtime | Server E2E with a scripted AGY actor, plus live runtimes |
| Frontend component / state | Indirect | Chip parsing of the new note; tree hiding (unchanged code) | Web specs (19 files) | Real stored-note round trip | Live browser probe |
| Browser integration / user journey | Yes | `@` send → no row; delegated row appears → DONE → row leaves | None runnable (C-09 stale) | Everything user-visible | Rewritten live browser probe |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Indirect | Same renderer as the browser | — | — | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific | No | No shell code changed | — | — | None |
| Process / lifecycle | Yes | DONE stop, restart fencing, permanent delete | Unit tests | Real process stop and real backend restart | Live probe with a real backend restart |
| Persisted-data transition | Yes (additive) | New `ad-hoc-tasks/` root; existing Projects untouched | Unit tests, startup-migration e2e | Real disk layout under a running server | Server E2E reads disk; projects e2e suites |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | Runtime tool exposure (AutoByteus/Codex/Claude) | Exposure unit tests | Real CLIs seeing the tool | Live probe per runtime |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal`
- Project type and runtime stack: pnpm monorepo. The server is Node/TypeScript Fastify + GraphQL + WS (Vitest). The web is Nuxt (Vitest; Playwright-core probes). Runtimes: AutoByteus (native), Codex App Server, Claude Agent SDK, and AGY CLI (scripted fake for deterministic E2E).
- Project testing guideline paths: `TESTING.md` (worktree root; it differs from the superrepo copy only in two wording lines of the Project Mutation section). No closer `TESTING*.md` exists.
- Conflicting, missing, or unclear project instructions:
  - `pnpm -C autobyteus-server-ts typecheck` fails at baseline with TS6059 (implementation-handoff); `tsc -p tsconfig.build.json --noEmit` is the working source check.
  - The live mentions probe has no TESTING.md row. It documents its own prerequisites in its header (a logged-in runtime CLI).
- Required environment variables or secrets available:
  - Claude CLI 2.1.283 and Codex CLI 0.160.0 are installed and use their own logins.
  - LM Studio is not running on 127.0.0.1:1234.
  - AutoByteus-runtime provider keys exist only in a vault importable into a test-owned DB. See the AutoByteus note in Not Tested.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers | Layer map | Server: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; web: `pnpm -C autobyteus-web test:nuxt … --run` |
| `TESTING.md` § Project Task Agent Run Resources And Projects Migration Regressions | Focused suites for this area | Unit/integration commands, `tests/e2e/projects`, gated `task-closure-root-visibility` (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<fake>`), `test:e2e:task-closure-tree --output-dir`; rebuild dist first |
| `TESTING.md` § Project Mutation Regressions | Dist-based pair | `prebuild`, `build`, then the two e2e files |
| `TESTING.md` § Rules | Safety | Never touch the user's running AutoByteus (pid 27808, port 29695, `~/.autobyteus`); own and stop processes; assertions first |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` header | Live probe setup | Needs `dist/app.js`, Chrome and a logged-in runtime CLI. It uses its own temp data root and free ports and sanitized env |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`, `projects-feature-probe.mjs` headers | Browser probes | Probe-owned built backend + Nuxt; fresh output dir |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | Scripted actor | A message with `CALL_TOOL:{name,arguments}` makes the fake AGY call the real scoped MCP tool and reply `CALLED:<result>` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server dist | worktree | `pnpm -C autobyteus-server-ts prebuild && build` | Shared-output build; serialized | exit 0 | — |
| In-process Studio server (Vitest E2E) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` in the suite | Temp app-data dir | GraphQL reachable | `app.close()`, `rm` data dir in `afterAll` |
| Probe backend (`dist/app.js`) + Nuxt dev + headless Chrome | `autobyteus-web` | started by each probe on free ports | Owned temp root, sanitized env | `/rest/health`, Nuxt `/chat` | Probe stops its process groups and removes its root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team/Org definitions | GraphQL `create*Definition` mutations | Owned temp data only | Removed with the temp root |
| Projects/Project Tasks | GraphQL `createProject`, `createProjectTask` | Owned | Removed with the temp root |
| Migration-pending state | Create `<appData>/projects/projects.json` (the gate is a file-existence check, `project-store.ts:assertMigrated`) | Owned temp app data; the real state after an interrupted startup migration | Removed in the same case |
| Reference file for AC-015 | Temp file in the owned workspace | Owned | Removed with the temp root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (additive new root).
- Design-spec and implementation-handoff references: design-spec § Persisted Data / State Transition Decision; implementation-handoff § Persisted Data Transition Check.
- Representative existing-data setup and required behavior: existing Project/Task/`agent_run_resources.json` data keeps working unchanged. This is covered by `tests/e2e/projects/*`, the `projects-startup-migration.e2e`, and the browser probes on current-format data. A missing `ad-hoc-tasks/` means no ad-hoc Tasks (every fresh data root starts that way).
- Evidence planned: the projects e2e suites and the browser probes, all on a fresh build.
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related REQ / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | `@` send adds an Offline collaborator row at once; host briefs it with `send_message_to`; no `delegate_task` card; collaborator Stop/wake/restart; F01 add-failure; L01/L02 crash; P01 old data; N02/N03 first-send admission | AC-001/002/003/007/008/012 | `Needs Update` (core assertions `Stale`) | Requirements REQ-001; design Removal Plan; CR C-09 | Rewrite to the delegation outcome (see Durable Coverage To Update) |
| `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | Linked Project Task DONE closes, publishes and stores closure for all three roots. Its "plain" described delegation now silently creates an ad-hoc Task, but it is never DONE in the test, so the `not.toContain` assertion stays valid | AC-014, REQ-006 | `Still Valid` | Call shapes updated in IR-001 (update by `task_id` only) | Run (gated) |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Tool/HTTP Project boundaries | AC-005/006, AC-014 | `Still Valid` | Updated call shapes | Run |
| `autobyteus-server-ts/tests/e2e/projects/project-mutation-node-locality.e2e.test.ts` | Dist-based two-node Project mutation | Preserved Projects | `Still Valid` | TESTING.md | Run after fresh build |
| `autobyteus-server-ts/tests/e2e/projects/projects-startup-migration.e2e.test.ts` | STARTUP_ONLY migration + gate | REQ-012 context | `Still Valid` | — | Run |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | Projects GraphQL | REQ-008 | `Still Valid` | — | Run |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Browser: closed Task runs leave the tree, live + reload + restart | REQ-006 (Project kind), AC-014 | `Still Valid` (call shape updated, never run) | IR-001 | Run |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Projects UI/API | REQ-008, AC-014 | `Still Valid` (call shape updated, never run) | IR-001 | Run |
| Server unit/integration suites in TESTING.md's Projects section, plus agent-collaboration, agent-tools, roots and run-history | Unit-level proofs for every BEH | All | `Still Valid` (updated by IR-001; reviewed) | CR 970 tests pass | Rerun as the repository baseline |
| Web specs consuming the note (`utils/collaborators`, `components/conversation`, submission/streaming specs) | Note → chip parsing incl. saved guidance | AC-002 | `Still Valid` | IR-001 | Rerun |
| `autobyteus-agent-presentation-contracts` tests | Note compose/parse | AC-002 | `Still Valid` | — | Rerun |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | REQ / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| R-07 | AutoByteus runtime materializes `create_or_update_task` without selection | AC-009, QR-002 | 2 cases in `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` | A live AutoByteus model is not available. This proves the native exposure → filter → real registry → tool construction chain |
| E-ADHOC-agent / -team / -org | For each root kind, through real Studio HTTP/WS, scoped MCP and the actual Projects/Task services with a scripted AGY actor:<br>- `@` send (no collaborator, stored note)<br>- described delegation → `task_id`, text-only `task.json`, assigned link<br>- the copy's sub-delegation stays in the Task<br>- run-ID messaging open → DONE by `task_id` alone → live closed event, snapshot, fenced run-ID message, repeat DONE<br>- update-mode rejection, unknown id, create without a Project, Project Task patch by id<br>- not listed under Projects<br>- migration-pending delegation + DONE<br>- bring-in collaborator kept across Stop/restore<br>- permanent delete removes only this root's ad-hoc Tasks | AC-001..011, AC-012, AC-013, AC-015; DS-001..006 | `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` (gated like its sibling) | No existing test crosses the real wire/MCP/disk boundary for the ad-hoc flow. It is deterministic (no model) and therefore a durable regression guard |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | REQ / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| L-A01, L-A02, L-A03, L-A04, L-A05, L-T01, L-T02, L-O01, L-O02, L-F01, L-L01, L-L02, L-P01, L-N01, L-N02, L-N03 | `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Change the host rule to delegation, and change the outcome assertions:<br>- no collaborator entry and no Offline row on send<br>- a `delegate_task` card<br>- a `task_id` and `task.json`<br>- a delegated row<br>- "mark it done" → `create_or_update_task` card, the row leaves<br>- stays hidden after reload and a backend restart<br>- the delete removes `ad-hoc-tasks/<id>`<br>Stored-collaborator coverage (AC-012) moves to an agent-initiated bring-in. F01 asserts unchanged failure behaviour; L01/L02/P01/N01 keep their intent | REQ-001..009, REQ-011; design Removal Plan; CR C-09 | Real model; the expectations are behavioural (tool cards, server state), not model wording |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | REQ / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| Live probe A01/T01/O01/N02/N03 "send adds the collaborator Offline at once", "collaborator entry admitted on first send", "no delegate_task card" | `@` no longer admits anything (REQ-001); the host now delegates (REQ-002) | REQ-001/002; design Removal Plan | Replaced in place by delegation-outcome assertions in the same cases |
| Live probe A02/A03 "collaborator woken with the same run ID after Stop/restart" (as an `@` collaborator) | That collaborator no longer exists after `@` | REQ-001 | Replaced by ad-hoc closed-forever checks after Stop/restart (AC-008). The stored-collaborator wake is kept via a bring-in collaborator (AC-012) |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | worktree | Source typecheck | Pass | `api-e2e-evidence/logs/R-00-typecheck.log` |
| 2 | TESTING.md Projects unit + integration commands, plus `tests/unit/agent-collaboration tests/unit/agent-tools tests/unit/agent-execution/shared tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/standalone-agent-run-root tests/unit/run-history/services tests/unit/services/agent-streaming tests/architecture tests/integration/standalone-agent-run-root` | `autobyteus-server-ts` | Unit/integration baseline for all BEH | Pass: 169/171 files, 1233/1238 tests. The 2 failing files (`team-run-history-catalog-service`, `published-artifact-projection-service`, 5 tests) fail identically on base `3c8e49ad5`, rerun in a temp base worktree | `logs/R-01-server-focused.log` |
| 3 | `pnpm -C autobyteus-agent-presentation-contracts test`; web note specs | worktree | Note compose/parse; chips | Pass (contracts; web 19 files / 127 tests) | `logs/R-02-*.log` |
| 4 | `prebuild` + `build` | `autobyteus-server-ts` | Fresh dist | Pass | `logs/R-03-prebuild-build.log` |
| 5 | `vitest run tests/e2e/projects --no-watch` (incl. mutation pair, startup migration) | `autobyteus-server-ts` | Preserved Projects, migration gate, dist-based nodes | Pass (4 files / 21 tests; the 2 gated files skip here) | `logs/R-04-projects-e2e.log` |
| 6 | Gated `task-closure-root-visibility.e2e.test.ts` | `RUN_AGY_FAILURE_E2E=1`, fake CLI | AC-014 linked DONE at the wire | Pass (3/3) | `logs/R-05-task-closure-root-visibility.log` |
| 7 | Gated new `ad-hoc-task-delegation.e2e.test.ts` | same gate | AC-001..013, AC-015 at the wire | Pass (3/3; final run with the rejected-delegation step: `logs/R-final-gated.log`) | `logs/R-06-ad-hoc-task-delegation.log` |
| 8 | `vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` | `autobyteus-server-ts` | AC-009 AutoByteus: a real `create_or_update_task` instance for a delegating host and Team member, no selection | Pass (4/4) | `logs/R-final-gated.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are many independent cases, and several are long-running live-model probes on multiple runtimes, so the interruption risk is real.
- Canonical ledger path: `api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Scored after repository execution, before the live probes (R-00..R-07, B-01, B-02).

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | Every AC except the user-visible parts has a direct wire proof in R-06, for 3 roots | AC-001/002/007/008 UI parts, real runtimes, and a real backend restart are unproven | Live browser probe on Claude and Codex |
| Changed-boundary execution directness | 92% | Real HTTP/WS/scoped MCP/Projects services/disk | Renderer not exercised | Browser |
| Cross-boundary integration realism and mock gap | 85% | Only the AGY CLI is scripted | Real model tool choice (does the note steer a real agent?) is unknown | Live runtimes |
| Environment, configuration, identity, and fixture fidelity | 92% | Owned temp app data, fresh dist, real gate file | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | Rejections, fencing, repeat DONE, Stop/restore, migration pending, delete | Real process restart of a backend holding ad-hoc state is unproven | Live probe restart case |
| User-surface, browser, and desktop-shell confidence | 70% | B-01/B-02 (existing Project-kind UI paths) | No browser proof of `@` → delegated row → DONE → row gone | Rewritten live probe |
| Durable regression coverage quality and relevance | 92% | New gated E2E; resolver cases | Stale live probe not yet rewritten | Rewrite |

- Overall post-repository confidence: 87% (simple average)
- Every critical acceptance criterion directly proven: `No` (UI/live parts pending)
- Any applicable category below `90%`: `Yes` — requirement proof, integration realism, failure/lifecycle, user surface
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real-model behavior under the new note; UI outcomes; restart.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (confirmed after repository execution; executed — see the execution report)
- Selected execution mode: `Browser` against a probe-owned real backend with real runtimes (live probe), plus the two existing browser probes.
- Specific confidence gap: user-visible row behavior on `@`, the live delegated row disappearing after DONE, reload/restart persistence, and real Codex/Claude/AutoByteus tool exposure and behavior. None of these is proven by repository tests.
- Why the selected mode helps: it exercises the actual renderer, stream, runtime CLIs and server as a user would.
- Browser-specific decision: web-equivalent renderer; no shell code changed, so a packaged desktop run is not required.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron.
- Web-equivalent behavior: all changed UI-visible behavior (tree rows, chips) is renderer behavior over the server stream.
- Shell-specific behavior: none changed.
- Chosen approach: browser probes with probe-owned backend/Nuxt/Chrome (TESTING.md "Browser dev-path probes").
- Effect on the already-running desktop app: none. It is never touched (pid 27808, port 29695, `~/.autobyteus`).
- Behavior not directly proven: packaged-shell rendering (no change there).

## Live Environment And Fixture Plan

- Startup order: fresh server build → probe starts the backend (`dist/app.js`, temp data root, free port) → Nuxt dev (free port) → headless Chrome.
- Environment: sanitized env (HOME/PATH/USER/LANG/TMPDIR/SHELL/TERM), `APP_ENV=development`, SQLite in the owned root.
- Seed data: definitions via GraphQL; host agents have no Project tools selected (proves automatic exposure).
- Journeys: standalone, Team and Org `@` → delegate → DONE → reload → backend restart → delete; stored bring-in collaborator; first-send mention.
- Evidence: `evidence.json` per runtime, screenshots, backend/frontend logs, on-disk `ad-hoc-tasks/` reads.
- Cleanup: the probe stops its process groups and removes the owned root; verified from the `cleanup` receipts.

## Temporary Executable Validation Plan

None planned. All new executable coverage is durable.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AutoByteus runtime live run | Needs a model. LM Studio is not running, and the provider keys are only in the user's own app data, which TESTING.md rule 2 forbids using without the user. Covered instead by AC-009's stated verification layer: the exposure unit test plus the new resolver cases with the real registry | A real native model choosing `create_or_update_task` | Optional: a user-approved isolated run with imported keys |
| L01/L02 host-crash cases | AGY-only by design (process-bound liveness); not changed by this package beyond the delegation trigger | Low (a delegated child replaces the collaborator child) | Run with `--runtime antigravity_cli` if AGY quota is wanted |
| Crash between ad-hoc `task.json` and the link | Interrupted execution; out of scope by design | Orphan text file | None |

## Ambiguities Or Reroute Triggers

None. Observation (not a finding): with the new note, real Claude and Codex agents mark a reporting copy DONE on their own once it reports. This is approved behavior (SCN-002: "or agent decides itself"; REQ-002 note wording). The F01 notice names the deleted definition by its ID ("temp-helper"), because its name is gone. That is unchanged UI copy, already a residual-risk candidate.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (new gated server E2E; 2 resolver cases; live probe rewritten; TESTING.md section)
- Post-repository confidence: 87%
- Broader validation decision: `Required`, executed (Claude and Codex live probes)
- Reroute Required Before Validation Execution: `No`
