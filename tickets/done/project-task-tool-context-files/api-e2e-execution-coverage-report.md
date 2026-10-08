# API/E2E Execution Coverage Report

## Execution Round Meta

All artifact paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files/tickets/in-progress/project-task-tool-context-files/` unless absolute.

- Requirements Doc: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-003)
- Supplemental Task Artifacts: None
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report: `code-review-report.md` (CRR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger (when used): `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: code review pass CRR-001 (round 1, Full Review)
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. One addition: the user-surface gap was closed with the temporary probe BV-001, as the post-repository confidence gate required.
- Existing coverage decisions revised during execution, with evidence: none. Every existing Project E2E assertion stayed valid; the 8 pre-existing cases in `project-task-boundaries.e2e.test.ts` are unchanged.
- Reroute required before or during execution: `No`
- Notes:
  - The first CTX-E2E-001 attempt failed on a defect in my test: `updateProjectTask` was sent without its required `description`. The app always sends that field (`useProjectTaskDraft.save`), so I fixed the test input to match the app and the rerun passed. The product was not at fault.

## Test-Case Ledger Reconciliation (When Applicable)

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (BV-001 Started/Completed)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: seq 11 (BV-001 Completed)
- Cases still running, interrupted, or not started: none
- Interruption, context-compression, or rerun note: CTX-E2E-001 test-input fix (seq 3 → 5)

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| UNIT-REG | Pass | seq 1 | `api-e2e-evidence/logs/unit.log` | 88 files, 790 tests |
| BUILD | Pass | seq 2 | `api-e2e-evidence/logs/build.log`, `tsc.log` | – |
| CTX-E2E-001 | Pass | seq 5 | `api-e2e-evidence/logs/boundaries.log` | First attempt: test-input defect, fixed |
| CTX-E2E-002 | Pass | seq 4 | same | – |
| CTX-FIX-001 | Pass | seq 6 | `api-e2e-evidence/logs/routing.log` | – |
| CTX-E2E-003 | Pass | seq 7 | `api-e2e-evidence/logs/delegation.log`, `api-e2e-evidence/project-task-context-files-delegation.json` | – |
| MUTATION | Pass | seq 8 | `api-e2e-evidence/logs/mutation.log`, `mutation2.log` | Source restored; `git status` of `src` clean |
| E2E-REG | Pass | seq 9 | `api-e2e-evidence/logs/e2e-projects-ungated.log`, `e2e-projects-gated.log` | – |
| BV-001 | Pass | seq 11 | `api-e2e-evidence/bv-001-*` | – |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` (`Not Affected`)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| CTX-E2E-001 | AC-001, 002, 003, 004 (alternate), 006, 009, 011; RU-001, RU-002; BEH-001..003, 006 | MCP/native `create_or_update_task` with `context_files` → Task service → context store → GraphQL/REST/`list_project_tasks`/`task.json` | Real Studio HTTP + selected scoped MCP session + native tool | Durable | Pass | boundaries.log |
| CTX-E2E-002 | AC-004, 005, 008; RU-005; REQ-006 atomicity incl. DONE | Error contract and all-or-nothing behaviour on create and patch, on both surfaces | Same | Durable | Pass | boundaries.log |
| CTX-E2E-003 | AC-005 (DONE with a live run), AC-007, AC-010 (worker half); RU-003, RU-004; BEH-004, BEH-005 | Manager's own MCP session → Task → `delegate_task({task_id})` → worker message → worker process reads bytes; DONE closure ordering; ad-hoc branch | Real HTTP/WS/scoped MCP + scripted AGY | Durable (gated) | Pass | delegation.log, `project-task-context-files-delegation.json` |
| CTX-FIX-001 | Fixture route coexistence | Fake AGY `READ_REFERENCE_FILES` | Local process | Durable | Pass | routing.log |
| BV-001 | AC-010 (app-display half), AC-006, BEH-003 | Built dist + real agent run → rendered Task page | Web-equivalent browser | Browser / Temporary | Pass | `bv-001-task-page.png`, `bv-001-stack.json` |
| E2E-REG | Preserved DONE closure, reactivation, ad-hoc, change feed, strict modes, startup migration | Existing suites | Server E2E (both modes) | Durable | Pass | e2e-projects-*.log |

What each case asserts:

- **CTX-E2E-001**
  - The MCP schema has `context_files` as `{type: array, items: {type: string}}`. It is optional and documented in the tool description, and no new tool exists.
  - Create with [macOS screenshot under `/private/tmp` with U+202F in its name, md] returns exactly `{projectId, taskId, status: TODO, attachedContextFiles: [{storedFilename, displayName}×2]}`.
  - GraphQL records show MIME `image/png` / `text/markdown` and the exact sizes. `task.json` keeps the existing 4-key record shape.
  - REST serves the image `inline` as `image/png` with the encoded display name, and the markdown as an `attachment`; bytes are exact.
  - The sources are deleted and the service state is reset; REST and `list_project_tasks` `localPath` still return the exact bytes.
  - A files-only patch appends: earlier files, description, status and `createdAt` are unchanged, and only the new file is returned.
  - Through the native tool, the same source attached again becomes a distinct copy.
  - A patch with description + IN_PROGRESS + a file applies all three in one call. DONE + a file sets DONE and adds the file. All 6 files are served.
  - Native create with `context_files: []` returns the plain return, no files and no `context/` directory. A plain patch keeps the plain return.
  - On a Task that already has a UI-uploaded file, the agent's append keeps the UI record byte-identical. Removing the agent's file through the app's own `updateProjectTask` call leaves only the UI file on disk. The source is untouched.
- **CTX-E2E-002**
  - Each invalid case is run in create mode and in patch mode with `status: DONE`, through native and MCP. The error code and message are identical on both surfaces, and the message names the offending path:
    - relative, non-normalized, unsupported `.ts` / `.exe`, extensionless and > 25 MiB give `TASK_CONTEXT_INVALID`;
    - missing, a directory and an unreadable file (chmod 000) give `TASK_CONTEXT_FILE_UNAVAILABLE`.
  - Each case is mixed with one valid file. The whole `projects/` tree, including the open run resource, stays byte-identical.
  - A duplicate in the call gives `TASK_CONTEXT_INVALID` naming the path.
  - Argument shapes give `PROJECT_TOOL_ARGUMENT_INVALID`: string, null, object, `[12]`, `[" "]`, `[null]`, a nested array, `remove_context_files`, and `project_id` + `task_id`.
  - Mode rules still apply with files: `TASK_DESCRIPTION_REQUIRED`, `TASK_CREATE_STATUS_UNSUPPORTED`, `TASK_NOT_FOUND`. `{task_id, context_files: []}` gives `TASK_PATCH_REQUIRED`.
  - Exactly 25 MiB is accepted (`sizeBytes` 26214400).
- **CTX-E2E-003**
  - The Manager creates the Task with [png, md] and patches it with [txt], each through its own scoped MCP session. Then the sources are deleted.
  - `delegate_task({task_id})`: the worker's first message ends with exactly `Reference files:` followed by the 3 saved `localPath`s. The worker process opens each one and reports the source's size and sha256.
  - DONE + [valid, missing] gives `TASK_CONTEXT_FILE_UNAVAILABLE` naming the path. There is no `task_executions_closed` frame, `task.json` is byte-identical, the worker's `closedAt` stays null, the status stays TODO, and the worker still takes a `send_message_to` by run ID.
  - The corrected DONE + [valid] attaches the file, emits the closure for the worker, sets DONE and sets `closedAt`.
  - On a real ad-hoc Task from a described `delegate_task`, `context_files` gives `TASK_CONTEXT_INVALID` ("no Project"). Its `task.json` is byte-identical and no `context/` appears. A text/status patch still returns `{projectId: null, …}`.

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `node api-e2e-evidence/bv-001-stack.mjs` (background) + browser tab via agent browser tools | worktree; owned `$TMPDIR` root; worktree `dist` | BV-001 | Pass | `api-e2e-evidence/bv-001-*` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | 96% | +3 | BV-001 renders the agent-attached screenshot (decoded thumbnail, preview panel) and markdown on the Task page after the sources were deleted | Packaged-app display and explicit user verification belong to delivery |
| Changed-boundary execution directness | 97% | 97% | 0 | – | – |
| Cross-boundary integration realism and mock gap | 94% | 95% | +1 | Built `dist/app.js` with a real agent run (scoped MCP) produced the records | The CLI/model is scripted (no paid inference) |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | 0 | – | Same OS user for server and agent (the supported single-node setup) |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | 0 | – | Phase-2 copy failure is unit-only |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | +10 | Real Nuxt renderer against a real backend; DOM assertions plus screenshot | Not packaged Electron; no shell change |
| Durable regression coverage quality and relevance | 96% | 96% | 0 | – | – |

- Overall post-repository confidence: 93.6%
- Overall final confidence: 95.6%
- Calculation method: simple average of the 7 applicable categories
- Confidence change produced by broader validation: +2.0 points; the user-surface category rose from 85% to 95%.
- Every critical acceptance criterion directly proven: `Yes`. The only part left is the explicit in-app user verification in the packaged app (the Done-when user step), which delivery owns.
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material. See Not Tested below.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required`. Mode: `Browser` (web-equivalent renderer, BV-001).
- Material deviation from the planned mode or rationale: none.
- Confidence gap or residual risk actually addressed:
  - AC-010 app display;
  - user-surface rendering;
  - the built dist with a real agent run.
- Startup order, commands, and readiness results:
  - `prisma migrate deploy` passed.
  - `dist/app.js` reported `/rest/health` OK on 127.0.0.1:60863.
  - The agent run started; `CALLED:` was seen; the Task held 2 files.
  - The sources were deleted.
  - `pnpm dev` served on 127.0.0.1:60879.
- Environment choices that materially affected the run:
  - `AGY_FAKE_CASE=linked_skills` with the fixture CLI;
  - `ENABLE_*` and `AUTOBYTEUS_*` scrubbed from the shell environment;
  - private HOME and data dir.
- Seed data, fixtures, identities: one Project (GraphQL) and one Manager Agent definition with Project tools. The Task was created only by the agent's tool call.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Agent attaches a pasted screenshot + notes through its own MCP call on a built backend | Task with 2 files; sources removable | Task `project_task_05141c07…` with `Screenshot 2026-10-08 at 10.15.32 AM.png` (image/png, 70 B) and `repro-notes.md` (text/markdown, 56 B); sources deleted | `bv-001-stack.json` | Pass |
| Open the Task page | Description and "Context Files (2)" with names, types, sizes | Heading "Task details"; description text; "Context Files (2)", "Image · 70 B", "File · 56 B" | DOM via `run_script`; `bv-001-task-page.png` | Pass |
| Image preview | Thumbnail decodes; Preview opens the image | Thumbnail `<img alt="Screenshot … AM.png">` decoded (`naturalWidth` 1 = the 1×1 PNG); Preview opens the inline preview panel with the decoded image and "Close preview" | DOM; screenshot | Pass |

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0), uid 501 (non-root, so the chmod-000 case ran)
- Runtime and relevant framework versions: Node (workspace toolchain), Vitest, Fastify, Nuxt dev; fake AGY CLI (`agy version 1.2.11`)
- Browser / engine and version: agent browser tab (Chromium-based)
- Device, viewport, locale, timezone: default desktop viewport, en

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: a UI-uploaded context record on the same Task the agent appended to. It stayed byte-identical in `task.json`, and existing E-007/API-FILES preservation passed.
- Direct-use, discard/rebuild, or migration result and evidence: new records match the existing 4-key `ProjectTaskContextFile` shape (CTX-E2E-001). The service state was reset (`reset()`) and the records were re-read through GraphQL, REST and `list_project_tasks`.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (`CTX-E2E-001`, `CTX-E2E-002`, shared helpers) | Updated (+194 lines, existing cases untouched) | AC-001..006, 008, 009, 011 at the real HTTP/MCP/native boundary | Pass |
| `autobyteus-server-ts/tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts` (`CTX-E2E-003`) | Added (gated by `RUN_AGY_FAILURE_E2E=1` + fixture CLI; skips cleanly otherwise) | AC-005 (DONE), AC-007, AC-010 with a live worker | Pass |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated: `linked_skills` gains `READ_REFERENCE_FILES` (reports size/sha256 or error code for each listed Reference file); other routes unchanged | Worker-side proof of the reference files | Pass (fixture routing + all gated suites) |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | Updated: one routing case for the new route | Fixture coexistence | Pass (15/15) |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (nothing removed)
- Note for delivery docs sync: `TESTING.md` §Project Task Agent Run Resources lists the gated Project E2E suites. The new gated `project-task-context-files-delegation.e2e.test.ts` (with its `TASK_CONTEXT_FILES_E2E_EVIDENCE_DIR` receipt) and the fixture's `READ_REFERENCE_FILES` route are candidates for that section.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/logs/*.log` | Command outputs (ANSI-stripped) | Retained in ticket | unit, build, tsc, boundaries, routing, delegation, mutation, e2e-projects (both modes) |
| `api-e2e-evidence/project-task-context-files-delegation.json` | CTX-E2E-003 receipt (worker first message, worker read results, errors, closure refs, cleanup) | Retained | Cleanup: data and sources removed, server closed, 0 roots left |
| `api-e2e-evidence/bv-001-stack.mjs`, `bv-001-stack.json`, `bv-001-backend.log`, `bv-001-frontend.log`, `bv-001-task-page.png` | BV-001 probe, receipt, logs, screenshot | Retained | – |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/bv-001-stack.mjs` | Owned built backend + Nuxt stack for the rendered check | Pass | Process groups terminated; owned root and `/private/tmp` sources removed; ports free; no remaining processes (`bv-001-stack.json` `cleanup`) |
| Source mutations in `project-task-service.ts` | Show the new cases detect DONE-ordering and ad-hoc regressions | Both caught | Restored with `git checkout`; `git status` of `src` clean |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI / model provider | `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`); it calls the real Agent Tools MCP server named in its capsule | Deterministic, no paid inference (TESTING.md) | No proof that a real model chooses to use `context_files` (tool-description quality; the PTM skill update is out of scope) |
| Publication capability in the non-gated suite | Existing never-called stub | Unchanged existing harness | None for this change |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | UNIT-REG, BUILD, CTX-E2E-001, CTX-E2E-002, CTX-FIX-001, CTX-E2E-003, MUTATION, E2E-REG, BV-001 | Every AC is directly proven at the real boundary; existing Project E2E suites are green in both modes |
| Not Tested | – | The packaged-app explicit user verification of AC-010 (delivery's gate). A phase-2 copy failure cannot be produced by a real call (unit-covered) |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process Studio servers, app-data temp dirs, `/private/tmp` sources of the E2E suites | Test-owned | Suite `afterAll` / `finally` | Removed; listeners closed (asserted) |
| Gated-suite roots and fake CLI processes | Test-owned | `terminateAgentRun`, server close | `pgrep agy-failure-cli` empty |
| BV-001 backend, Nuxt, prisma process groups; owned data root; `/private/tmp/ctxfiles-bv001-src-*` | Probe-owned | SIGTERM/SIGKILL of the exact groups; `fs.rm` | Removed; no leftover processes or dirs |
| Browser tab `ccedcc` | Mine | `close_tab` | Closed |
| `/tmp/ctxfiles-e2e-logs` | Mine | Moved into `api-e2e-evidence/logs`, then removed | Done |

## Preliminary Classification

N/A: no failure. The single failed attempt was a defect in my own test input, fixed within this stage.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.6%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`; executed as BV-001 (web-equivalent browser), Pass
- Critical acceptance criteria lacking direct proof: none. The explicit user verification in the packaged app remains delivery's gate.
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff (test-code review request, reviewed route)
- Notes:
  - ASM-001 holds in the supported setup (server and agent run as the same OS user on one node), including a file under `/private/tmp`. An unreadable file maps to `TASK_CONTEXT_FILE_UNAVAILABLE`.
  - These failures are already known and none was introduced here: the `typecheck` script (TS6059), and the `tests/unit/api` failures on base, which `dc70e7f44` fixes upstream. Both were recorded upstream, and the unit suites I ran do not include `tests/unit/api`.
