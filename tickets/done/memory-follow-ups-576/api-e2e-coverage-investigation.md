# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved; FU-004 waits for DEC-004)
- Investigation Notes: `investigation-notes.md` (I-1…I-8)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `handoff-implementation.md`; `follow-ups.md` (FU-001); the 554 follow-ups and evidence in `tickets/done/semantic-memory-for-every-agent/`
- Design Review Report: N/A (direct route)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Code Review Report: N/A (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (Medium / Low, direct route), message from `/implementation_engineer`
- Code validated: branch `codex/memory-follow-ups-576`, HEAD `56c61c3ecb` (code `8850dc3f99` + `570aab87d2`, a comment reflow), base `origin/personal` `61fd6f41f7`

## Current Requirement And Design Basis

Seven follow-ups of autobyteus-554, each in its existing owner: folder names keep `encodeURIComponent(id)` up to 255 bytes (REQ-001); relative Markdown links open the linked workspace file as a preview tab (REQ-002); workspace menus offer only `filesystem` and `temp`, and a skill workspace is always released (REQ-003); three E2E tests that failed for the wrong reason (REQ-005…REQ-007); Antigravity and Grok probes report what happened (REQ-008). FU-004 (REQ-004) waits for DEC-004; with answer (a) there is nothing to test.

## Supported Scenarios And Real Usage

- Designer scenarios: UC-001…UC-006 and the ACs' own scenarios.
- Real-use scenarios added, each with its real trigger:
  - **S-1 a bundled application member** (554 IC-03): its id is 274+ encoded bytes, so it still gets the shortened name; IC-03's copy of the decision now says 255. Rerun.
  - **S-2 a link clicked in the desktop app**: the Memory page's Global semantic folder (read only) in an isolated desktop instance of this worktree's build; a link opens the linked file in a preview tab, a link out of the folder opens nothing.
  - **S-3 probes under load** (FU-008's real-world cases): the Grok replay catalog test and `own-stream-turns-read-once`'s AGY discovery, run on this loaded host.
- Contrived: none.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Folder-name threshold 255 | Changed | REQ-001 | unit (reused IMP-01); IC-03 and SMV-100 at the boundary |
| Probe time bound (new `probe-time-bound.ts`) | Changed | REQ-008 | unit (reused IMP-02); Grok replay and AGY e2e; whole suites |
| Markdown relative links | Added | REQ-002 | web unit (reused IMP-06); rendered probe; isolated desktop instance |
| Workspace menus, skill loader | Changed | REQ-003 | web unit (reused IMP-05); whole web suite |
| Three E2E tests | Changed | REQ-005…REQ-007 | each alone three times on this host |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | layout constant, probe bound | units | — | whole server suites |
| API / transport | No | — | — | — | — |
| Frontend component / state | Yes | renderer, previewer, menus, loader | web specs | — | rendered probe |
| Browser integration / user journey | Yes | link click in the Files panel | probe SMV-103…105 (IMP-07) | this round's own run | probe rerun |
| Desktop shell | Possibly | a link click inside Electron (navigation guards) | none | whether the shell lets the click reach the renderer's handler | isolated desktop instance |
| Process / lifecycle | Yes | child processes of probes | units with real processes | under load | e2e S-3 |
| Persisted-data transition | No | FU-009 `Not Affected` (554 unreleased) | — | — | — |
| External integration | Yes | Grok, AGY CLIs (scripted) | units | — | e2e S-3 |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (worktree root; no closer one). Rules used: rerun by impact; one heavy run at a time; `env -i` with a resolved temp HOME; File watching on a busy Mac (`fseventsd` was 208% CPU, 24 GB resident at the start); Rule 9 (find each failure's cause); isolated desktop instances (Rules 1–5).
- Build inputs changed: none (`git diff --name-only 61fd6f41f7...HEAD`): no fresh-start build.
- Isolated desktop instance: `docs/isolated-app-instances.md` (`pnpm --silent isolated-app start --build --data-root <own>`, CDP `controlPort`, `stop`).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `definition-folder-names.test.ts` | 255 full, 256 short, cut cases | AC-001 | Still Valid | IMP-01 (`72f7ebe040`; layout unchanged since) | Reuse |
| `probe-time-bound.test.ts`, AGY and Grok capability tests | exited child returns its result; time-out code and log | AC-008 | Still Valid | IMP-02 (`5999a84ca8`; unchanged since) | Reuse; whole unit suite reruns |
| web specs: `runnableWorkspaceKind`, menus, mobile picker, loader | REQ-003 | AC-003 | Still Valid | IMP-05 | Reuse; whole web suite reruns |
| `MarkdownPreviewer.relativeLinks.spec.ts` | REQ-002 | AC-002 | Still Valid | IMP-06 | Reuse; whole web suite reruns |
| `semantic-memory-view-probe.mjs` (SMV-100 at 255, SMV-103…105) | REQ-001, REQ-002 rendered | AC-002 | Still Valid | IMP-07 | Rerun (own evidence) |
| `package-personal-settings.e2e` | afterAll within its hook limit | AC-005 | Still Valid | IMP-03 (one pass) | Run alone ×3 |
| `agent-semantic-memory.e2e` SM-12 | regular-file setup | AC-006 | Still Valid | IMP-04 | Rerun (whole file, scripted AGY) |
| `agent-package-definitions-live-refresh.e2e` DCF-E2E-007 | waits for the OS event, then asserts | AC-007 | Still Valid | IMP-08 (Linux pass; macOS `ENVIRONMENT`) | Run alone ×3 on this host |
| `application-import-codex-launch.e2e` IC-03 | 255 in its copy of the decision | AC-001 / S-1 | Still Valid | none | Rerun |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | server build | — | `pnpm -C autobyteus-server-ts build` | e2e restarts, probe |
| API-01 | AC-001 | units (IMP-01), IC-03 | Reused + Existing Test | `env -i … vitest run application-import-codex-launch` | S-1 |
| API-02 | AC-005 | personal-settings | Existing Test | the file alone, three times; `fseventsd` CPU each time | AC-005 |
| API-03 | AC-006 | SM-12 | Existing Test (gated) | `RUN_AGY_FAILURE_E2E=1 … vitest run agent-semantic-memory` | AC-006 |
| API-04 | AC-007 | DCF-E2E-007 | Existing Test (gated) | the live-refresh file alone, three times on this host | AC-007 |
| API-05 | AC-008 | probes under load | Existing Test | Grok replay e2e files; `own-stream-turns-read-once` (scripted AGY) | S-3 |
| API-06 | all | server unit suite | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | handoff: not run |
| API-07 | all | server integration | Existing Test | `test:integration:prepare`, `test:integration` | not run |
| API-08 | all | whole server E2E | Existing Test | root `env -i … pnpm test:e2e` | not run |
| API-09 | AC-002, AC-003 | whole web unit suite | Existing Test | `pnpm -C autobyteus-web test` (its unit command) | not run |
| API-10 | AC-001, AC-002 | rendered probe | Durable | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir <fresh>` | own run of SMV-100…105 |
| API-11 | AC-002 (S-2) | isolated desktop instance | Temporary journey | `isolated-app start --build --data-root <own, seeded semantic-global>`; CDP; click a link; `stop` | the shell |
| API-12 | — | typechecks | Reused | IMP-09, IMP-10 (`8850dc3f99`; only a comment reflow since) | — |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned: the implementation added the durable coverage. The desktop journey is temporary (no desktop-shell harness case covers Markdown in the file panel; one link click does not justify a new packaged harness case).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| FU-004 | waits for DEC-004 | — | Yes (the founder's decision) | Solution Designer |
| FU-002 on the mobile file viewer | the same previewer component; no phone build in this round | low | No | — |
| SM-12 as root | REQ-006's root case is POSIX: `mkdir` over a regular file fails `EEXIST` for any user; AC-006 asks a normal user | low | No | — |

## Ambiguities Or Reroute Triggers

AC-007 asks three passes on this host, whose file events the handoff found 2–6 s late or missing. If the runs end `ENVIRONMENT`, the cause is measured and the result recorded with it; the design's escalation trigger (a product defect in watching or listing) is checked against the measurement.

## Round 2

- Trigger: IR-002 (SR-002, Design Impact after CRR-001 CR-001 / API-REV-001), direct route, Medium / Low. Code `3b39828501` (records `a4ed4455fa`).
- Changed since round 1 (`git diff --name-only e99963e815 HEAD`, outside `tickets/`): `src/runtime-management/probe-time-bound.ts` and its unit test only. The bound learns the exit from the child's `exit` event and decides after `setImmediate` (after the poll phase that delivers an exit held up by a blocked main thread).
- Requirements now: AC-007 per DEC-005 (a Linux pass plus the named `ENVIRONMENT` failure on a host without file events); AC-008 adds the real-order unit and the E2E cases (API-05, SM-04).
- Still valid (nothing they exercise changed): API-01, API-02, API-04 (AC-007 now proven per DEC-005 with IMP-08 + API-04), API-06 (server unit; the changed file's consumers rerun by IMP-12), API-09, API-10, API-11, API-12.
- Rerun or new: API-00 (build), API-05 (the Grok catalog test repeated under load, with a temporary diagnostic run that records late timer firings, and clean runs), API-03 (SM-04, CF-05: whole file, errors kept), API-07 (server integration), API-08 (whole server E2E).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (unless a case shows a gap)
- Reroute Required Before Validation Execution: `No`
