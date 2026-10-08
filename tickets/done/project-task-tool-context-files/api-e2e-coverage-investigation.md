# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec (required on every route): `.../design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: None
- Design Review Report: `.../design-review-report.md` (Pass, ARCH-REV-001)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-001, Pass 9.4/10)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Code review pass CRR-001 (Medium / High, reviewed route)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of changed durable test code)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

`create_or_update_task` gains one optional additive `context_files` argument (absolute node-local file paths) in create and patch mode (REQ-001/002/012). Files are copied into the Project Task's saved context under the app upload policy (allowlist by extension, 25 MiB; REQ-004/005), all-or-nothing including no DONE closure (REQ-006), rejected on Tasks with no Project (REQ-007), strict argument rules preserved (REQ-008), conditional `attachedContextFiles` return (REQ-009), visible in app and handed to workers by `delegate_task({task_id})` (REQ-010), documented and identical on native and MCP (REQ-011). Design: DS-001..DS-005; error map in design-spec §Concrete Examples. Persisted data: `Not Affected` (new writes, existing shape).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-004, SCN-005, SCN-006 (SCN-003 is out of scope by decision).
- Real-use scenarios added from investigating the implemented behavior:
  - RU-001 macOS screenshot names: the user's reported case is a pasted screenshot under `/private/tmp/...`; macOS names screenshots `Screenshot <date> at <time> AM.png` with spaces and a U+202F narrow no-break space. Trigger: agent passes that path. Proves display name, stored name sanitising and REST `Content-Disposition` for a realistic name.
  - RU-002 UI-attached file + agent append + user removal in the app: Task first gets a file through the app (draft upload), the agent then appends, the user removes the agent's file through the app's normal `updateProjectTask` path (removal stays in the app).
  - RU-003 Worker actually reads the saved copies: after `delegate_task({task_id})` the worker process (a separate CLI process) opens the listed paths. Trigger: real linked delegation with the scripted AGY actor.
  - RU-004 DONE with an invalid file while a delegated worker is live: the runs must stay open (no closure frame, `closedAt` null, worker still messageable), then a corrected DONE closes them.
  - RU-005 Exact 25 MiB file (cap boundary) accepted; 25 MiB + 1 rejected.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none recorded. Not tested as contrived: a source file changing size between validation and copy, and a copy failing after validation (phase-2 failure); unit-covered (R-3, P-001), not producible by a real agent call deterministically.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 create + `context_files` | Added | REQ-001/003-006/009, AC-001/005/006 | MCP + native E2E with GraphQL/REST/disk readback |
| BEH-002 patch + `context_files` (additive, files-only allowed, DONE) | Added | REQ-002, AC-002/003/004 | MCP + native E2E |
| BEH-003 same storage/policy as UI | Preserved/extended | REQ-004/005/010 | GraphQL/REST reads, inline image preview header, UI removal |
| BEH-004 linked delegation passes saved files | Preserved (now includes agent files) | REQ-010, AC-010 | Gated scripted-actor E2E: worker message + worker reads bytes |
| BEH-005 ad-hoc Task rejection | Added | REQ-007, AC-007 | Real ad-hoc Task from described `delegate_task`, patched through the Manager's MCP session |
| BEH-006 conditional return | Added | REQ-009, AC-009 | Exact return shapes; existing plain-return assertions kept |
| Tool schema/description | Changed | REQ-011, AC-011 | MCP `tools/list` inputSchema assertion |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `ProjectTaskService` create/update bodies, `importLocalFiles`, policy | Unit (18 + tool cases) | Real fs paths/permissions through a running server | Server E2E |
| API / transport / contract | Yes | MCP + native `create_or_update_task` schema, args, return, errors | Unit with MCP adapter | Real Streamable HTTP MCP session, JSON schema rendering | Server E2E (API-MCP) |
| Frontend component / state | No | App already renders `contextFiles`; no UI change | – | In-app rendering is user verification (AC-010) | None (delivery/user verification) |
| Browser integration / user journey | No (indirect) | GraphQL/REST readers unchanged | – | – | GraphQL/REST reads in server E2E |
| Authentication / session / permissions | Yes (scoped MCP session exposure) | Tool exposure via scoped session | Existing E2E | – | Server E2E |
| Desktop renderer / web-equivalent UI | No | – | – | – | – |
| Desktop shell / Electron-specific integration | No | – | – | – | – |
| Process / lifecycle | Yes | DONE closure ordering with live runs; worker process reading files | Unit with fakes | Live run closure not triggered by a failed call | Gated scripted-AGY server E2E |
| Persisted-data transition | No (`Not Affected`) | New records in existing shape | Unit asserts `task.json` | – | On-disk `task.json` read in E2E |
| Worker / queue / distributed coordination | No | – | – | – | – |
| External integration | No | `mime-types` lookup is in-process | Unit | – | – |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files` (branch `codex/project-task-tool-context-files`, HEAD `7dab8b5d9`)
- Project type and runtime stack: pnpm monorepo; `autobyteus-server-ts` Fastify/GraphQL/MCP server, Vitest
- Project testing guideline paths: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md` (identical in the worktree); `autobyteus-server-ts/AGENTS.md` (testing commands). No closer `TESTING*.md` under `autobyteus-server-ts`.
- Conflicting, missing, or unclear project instructions: `typecheck` script fails on pre-existing TS6059 (recorded by implementation and code review); production `tsc -p tsconfig.build.json` is used.
- Required environment variables or secrets available: `N/A` — no provider credentials; gated suites use the fake AGY CLI.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` §Project Mutation Regressions | Project Task HTTP boundary suite | `prebuild`, `build`, `vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts ...` |
| `TESTING.md` §Project Task Agent Run Resources... | Unit + gated scripted-AGY E2E | `vitest run tests/unit/projects tests/unit/agent-collaboration tests/unit/agent-tools/project-tasks ...`; `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs vitest run tests/e2e/projects/<file>`; `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS ...` for machine independence |
| `TESTING.md` §Antigravity Native Argument Capture | Shared AGY fixture | Fixture routes must coexist; `agy-failure-cli-routing.test.ts` protects them |
| `TESTING.md` Rules 2, 9 | Data safety; baseline failures | Never user app/data; explain/fix baseline failures |
| `autobyteus-server-ts/AGENTS.md` | Commands | `vitest run <path> --no-watch` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server (Fastify + GraphQL + Agent Tools MCP host) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside the suite | Free port, test-owned app-data dir | Suite `beforeAll` | `app.close()`, data dir removed, listener refusal asserted |
| Scripted AGY CLI (`agy-failure-cli.mjs`, `AGY_FAKE_CASE=linked_skills`) | spawned per run | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=...` | No model call | Run start + CALLED results | Root terminate in `afterAll` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Projects/Tasks | Public GraphQL `createProject`, MCP `create_or_update_task` | test-owned `mkdtemp` app data | removed in `afterAll` |
| Source files (png bytes, md, txt, 25 MiB, unreadable, dir) | written by the test into owned temp dirs; screenshot-style source under `/private/tmp/<owned mkdtemp>` on macOS | never outside owned dirs | removed in `afterAll` |
| Open run resource for DONE atomicity (non-gated) | current-format `agent_run_resources.json` fixture, as existing E-007 | representative current format | inside owned data dir |
| Live worker run (gated) | real `delegate_task({task_id})` from the scripted Manager | fake CLI only | root terminated, data removed |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- References: design-spec §Persisted Data / State Transition Decision; implementation-handoff §Persisted Data Transition Check
- Evidence planned: E2E reads `task.json` and asserts each agent-attached record has exactly `{storedFilename, displayName, mimeType, sizeBytes}`, and existing UI-attached records stay byte-identical through agent appends.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/projects/project-task-boundaries.e2e.test.ts` API-MCP | Plain create/patch return exactly `{projectId, taskId, status}`; error parity; `TASK_PATCH_REQUIRED` message-agnostic | AC-009, AC-008 | Still Valid | Asserts codes, not the changed message text | Keep; extend file |
| same, API-FILES / E-007 | UI draft path, REST headers, removal, preservation | BEH-003 preserved | Still Valid | GraphQL path unchanged | Keep |
| `tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | Strict modes, ad-hoc DONE | REQ-008 preserved | Still Valid | – | Run as regression |
| `task-closure-root-visibility`, `task-reactivation-root-visibility`, `project-change-feed` e2e | DONE closure, linked delegation, feed | DONE semantics preserved | Still Valid | – | Run as regression |
| `tests/unit/projects/project-task-local-context-files.test.ts` (new, 18) | Store/service rules | AC-001..007 | Still Valid | Reviewed | Run |
| `tests/unit/agent-tools/project-tasks/*` | Schema/parser/returns | AC-008/009/011 | Still Valid | Reviewed | Run |
| `tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | Fixture routes coexist | Fixture | Needs Update | Fixture gains a READ_REFERENCE_FILES route | Add one routing case |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| CTX-E2E-001 | MCP schema + create [png, md] + files-only patch + combined patch + DONE+files; GraphQL/REST/disk/`list_project_tasks` readback; sources deleted; UI-attached + agent append + UI removal; native parity | AC-001, 002, 003, 004, 006, 009, 011; RU-001, RU-002, RU-005 | `tests/e2e/projects/project-task-boundaries.e2e.test.ts` new `it` | Real MCP/HTTP boundary is not exercised by unit tests |
| CTX-E2E-002 | Error contract through MCP and native: relative, non-normalized, missing, directory, unreadable, unsupported type, extensionless, > 25 MiB, duplicate, argument-shape errors, `remove_context_files`, `[]` patch; atomic (projects tree snapshot unchanged) in create and patch mode; DONE + invalid file leaves the open run resource untouched | AC-004, 005, 008 | same file, new `it` | Atomicity across the real boundary |
| CTX-E2E-003 | Linked delegation: Manager (real scoped MCP) attaches files, `delegate_task({task_id})`, worker first message lists saved copies, worker process reads the exact bytes; DONE + missing file keeps the live run open; corrected DONE closes it; ad-hoc Task + files → `TASK_CONTEXT_INVALID`, unchanged; ad-hoc text patch still works | AC-005 (DONE), AC-007, AC-010; RU-003, RU-004 | new gated `tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts` | Only a live run proves closure non-interference and worker hand-off |
| CTX-FIX-001 | Fake AGY `READ_REFERENCE_FILES` route (reports sha256/size of each listed Reference file) | RU-003 | `tests/fixtures/agy-failure-cli.mjs` + routing unit case | Lets a worker process prove it can read the listed copies |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC | Notes |
| --- | --- | --- | --- | --- |
| CTX-FIX-001 | `agy-failure-cli-routing.test.ts` | Add a routing case for `READ_REFERENCE_FILES` | Fixture coexistence | Existing routes untouched |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools tests/unit/context-files tests/unit/agent-collaboration tests/architecture --no-watch` | worktree root | Unit regression | Pass (88 files, 790 tests) | api-e2e-evidence/logs/unit.log |
| 2 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | worktree root | Current dist | Pass (bootstrap smoke pass) | api-e2e-evidence/logs/build.log |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts --no-watch` | worktree root | CTX-E2E-001/002 | Pass (10/10) after one test-input fix (ledger seq 3) | api-e2e-evidence/logs/boundaries.log |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts --no-watch` | worktree root | CTX-FIX-001 | Pass (15/15) | api-e2e-evidence/logs/routing.log |
| 5 | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts --no-watch` | worktree root | CTX-E2E-003 | Pass (1/1) | api-e2e-evidence/logs/delegation.log; api-e2e-evidence/project-task-context-files-delegation.json |
| 6 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects --no-watch` and the same with the AGY gate | worktree root | Broader Project E2E regression (closure, reactivation, ad-hoc, feed) | Pass (ungated 26 pass/19 skip; gated 44 pass/1 skip = Claude-only case) | api-e2e-evidence/logs/e2e-projects-*.log |
| 7 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | worktree root | Production types | Pass | api-e2e-evidence/logs/tsc.log |
| 8 | Temporary source mutations (restored with `git checkout`): import after DONE closure; ad-hoc rejection removed | worktree root | Sensitivity of CTX-E2E-002/003 | Pass (both mutations caught) | api-e2e-evidence/logs/mutation.log, mutation2.log |

## Test-Case Ledger Decision

- Ledger required: `Yes` — multiple independently meaningful cases, gated long-running scripted-actor journey.
- Canonical ledger path: `.../api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | AC-001..009 and AC-011 proven directly at the real MCP/native/GraphQL/REST/disk boundary. AC-010 worker hand-off proven live, including the worker process reading the exact bytes | The app-display half of AC-010 (files visible in the app with image preview) is shown only through REST headers and GraphQL records; nothing was rendered | Render the Task page from a real backend |
| Changed-boundary execution directness | 97% | Real Streamable HTTP MCP session (test client, and a separate agent CLI process), native tool, real filesystem | – | – |
| Cross-boundary integration realism and mock gap | 94% | Only the external CLI/model is scripted; Studio, MCP, services, roots and feeds are real | The E2E server runs in-process from source, not the built dist | Run the change through `dist/app.js` |
| Environment, configuration, identity, and fixture fidelity | 95% | Owned app data; real permissions (chmod 000); macOS screenshot name with U+202F under `/private/tmp`; 25 MiB boundary | The non-gated DONE atomicity check uses a current-format run-resource fixture (the live run in CTX-E2E-003 complements it) | – |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Every error class in both modes and on both surfaces, with atomic snapshots; DONE with a live run; ad-hoc Task; mutation sensitivity | Phase-2 copy failure is covered only by unit tests (a real call cannot produce it) | – |
| User-surface, browser, and desktop-shell confidence | 85% | No UI change. Same records as UI uploads. REST serves images inline. The app's removal path is proven | Nothing rendered | Web-equivalent Task page with an agent-attached screenshot |
| Durable regression coverage quality and relevance | 96% | 3 durable cases plus a fixture route, in documented suites, mutation-verified | – | – |

- Overall post-repository confidence: 93.6% (simple average)
- Every critical acceptance criterion directly proven: `No`. The app-display half of AC-010 was not rendered
- Any applicable category below `90%`: `Yes` — user surface 85%
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: rendering of agent-attached files in the app (expected to match UI uploads)

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser`. A web-equivalent desktop renderer: worktree `dist/app.js` backend, Nuxt dev and a browser tab, in temporary probe BV-001
- Specific confidence gap addressed: the app-display half of AC-010 and the user-surface category. It also runs the change through the built dist with a real agent run (integration realism)
- Why the selected mode can materially improve confidence: it renders the exact Task page a user opens. The records come from an agent's own MCP call on a production build
- Expected confidence after the selected validation: at least 95%, with no category below 90%
- Browser-specific decision and rationale: browser, not packaged Electron. No desktop-shell code changed, and the renderer is the same Nuxt app
- Result: Pass (see execution coverage report)

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: `node api-e2e-evidence/bv-001-stack.mjs`, following the same pattern as `projects-feature-probe.mjs`:
  1. create an owned root under `$TMPDIR` and run `prisma migrate deploy`;
  2. start `dist/app.js --data-dir <owned>` on a free port with `ANTIGRAVITY_CLI_COMMAND=<fixture>` and `AGY_FAKE_CASE=linked_skills`;
  3. start the agent run;
  4. run `pnpm dev` in `autobyteus-web` with `BACKEND_NODE_BASE_URL`.
- Health / readiness checks: `/rest/health`; frontend HTTP status < 500
- Seed data / fixtures:
  - Project created through GraphQL.
  - Task created by the Manager run's own `create_or_update_task` (`CALL_TOOL`), attaching `/private/tmp/<owned>/Screenshot 2026-10-08 at 10.15.32<U+202F>AM.png` and `repro-notes.md`.
  - Sources deleted before viewing.
- Journeys: open `/projects/<id>/tasks/<taskId>`. Check the Context Files section, names, types and sizes, and the decoded thumbnail. Open Preview.
- Evidence: DOM via `run_script`, screenshot `bv-001-task-page.png`, backend and frontend logs, `bv-001-stack.json`
- Owned processes and temporary state to clean up: three process groups (prisma, backend, Nuxt), the owned data root and the `/private/tmp` source dir. Never the user's app or data

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| BV-001 | `api-e2e-evidence/bv-001-stack.mjs` + browser tab | An agent-attached screenshot and markdown file render on the real Task page with image preview, served by a built backend | The renderer is unchanged and already covered by the `TaskContextFiles`/Task component tests and `test:e2e:project-manager-ux` (PMU-014 context-file line). The server side is now durable in CTX-E2E-001..003. A new durable browser probe would only retest unchanged rendering |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Packaged desktop app display and explicit user verification (app-display half of AC-010) | Web-equivalent rendering was done in BV-001. Explicit user verification is delivery's gate | Low | Delivery user verification |
| Server and agent under different OS users (ASM-001 negative) | Not a supported single-node desktop setup | Low; unreadable mapped to `TASK_CONTEXT_FILE_UNAVAILABLE` (proven with chmod 000) | None |
| Phase-2 copy failure / source growing during copy | Not reproducible through a real call deterministically | Low; unit-covered | None |
| Real model choosing to use `context_files` | Tool description quality, not runtime behavior | Low | PTM skill follow-up is out of scope |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added/updated)
- Post-repository confidence: 93.6%. Final after BV-001: 95.6% (see execution coverage report)
- Broader validation decision: `Required`; BV-001 executed, Pass
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: none
