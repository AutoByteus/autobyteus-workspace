# API/E2E Execution Coverage Report — run-file-change-owner-scoped-reads

The run record and the result: what ran, what it proves, how confident I am, and the outcome. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code review pass CRR-001 (`/software_engineering_team/code_reviewer`)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - The mobile Artifacts journeys were added to the API-05 probe as B-006/B-007. Phone Access pairing refuses loopback URLs, so the phone pairs with a private-network URL (`http://192.168.77.10:<port>`) that the probe's browser routes (HTTP and WebSocket) to the probe backend. This is network emulation only.
  - New cases found during the run: API-03c (mutation check of the API-03b assertion), API-04b (stability record of the new E2E), API-08 (deterministic probe of a pre-existing `RunFileChangeService.load` cache race, follow-up FU-C), API-09 (rerun of the fixture's unit test after the fixture change).
  - API-04 now waits for each running member's recording to reach its stored `file_changes.json` before the first live read. Without that wait, 2 of 9 development runs hit the FU-C race (see API-04b, API-08).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/evidence/` (the handoff message gives the commit that holds it)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed` (CRR-001)
- Successful-output route: `Code Review` (proportional test-code review of the changed durable test code)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `581fecdf8e` (product code `03f2d4da05`), working tree with the uncommitted test edits for development rounds | macOS 26 (darwin-arm64), 10 CPUs | node v22.23.1, pnpm 10.28.2; server `dist` rebuilt from the worktree (`pnpm -C autobyteus-server-ts build`, exit 0); vitest in-process Studio server; scripted AGY (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`) | `env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>`; each suite makes its own temp HOME, data dir and sqlite DB |
| ENV-2 | `2486c8b7c4` (product code `03f2d4da05` + committed durable tests; no tracked file dirty) | same | same as ENV-1 | same as ENV-1 (final evidence runs) |
| ENV-3 | `2486c8b7c4` | same | probe-owned stack: server `dist/app.js` (private HOME, own data root copied from the seed, free port, sqlite), Nuxt dev (`nuxi dev`, warmed up before asserting), headless Chrome (system Chrome via playwright-core 1.58.2) | Desktop viewport 1600×1000; mobile 390×844 (`isMobile`, touch, DPR 2) with Phone Access pairing; seeds made through public GraphQL/WebSocket APIs only: small = 10, large = 680 unrelated saved team runs (the user's machine has 680) |
| ENV-4 | `581fecdf8e` working tree (web code `03f2d4da05`) | same | `vue-tsc` 3.3.13 + TypeScript 5.9.3, installed in a temp dir (not in the repo) | `autobyteus-web/tsconfig.json` (extends `.nuxt/tsconfig.json`) |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | All server and web repository criteria (AC-002..AC-009, AC-011, AC-012 at unit/component level; REQ-008; QR-002) | Server typecheck, unit, integration; web unit/component; web guards; codegen | Reused: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-07 | — | Pass | Implementation handoff rows | Implementation handoff "Checks Run" | Ran on `03f2d4da05`; `git diff --name-only 03f2d4da05 2486c8b7c4` touches only ticket docs, `tests/e2e/**`, `tests/fixtures/agy-failure-cli.mjs` and the web probe/script. The fixture's one unit consumer was rerun (API-09); nothing else in those suites changed |
| API-02 | AC-007, AC-009, BEH-007 | Real HTTP/GraphQL, hub roots | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts --no-watch` (file as reviewed) | ENV-1 | Pass | `API-02-member-file-changes-e2e.log` | `Tests  3 passed (3)`, `exit=0` | The run-id query gives a running copy `[]` |
| API-02b | AC-001 (server side), AC-006, AC-007 (hub's own id), AC-009, REQ-008 | Real HTTP: copy content route and run-id route | Same command after the durable update; final run on `2486c8b7c4` | ENV-1, ENV-2 | Pass | `API-02b-member-file-changes-e2e.log`, `API-02b-member-file-changes-e2e-final.log` | `Tests  3 passed (3)`, `exit=0` | Running and stopped hub: copy file bytes (`image/png`, `no-store`); another hub, a wrong address, an unrecorded path and the run-id route → 404 `File change not found`; missing `memberAddress` → 400; deleted file → 404 `File change content is not available`; the hub's own file is listed and served by its own id |
| API-03 | AC-013 | Real HTTP/GraphQL + restarted `dist/app.js` | Gated E2E as reviewed | ENV-1 | Pass | `API-03-unreadable-tree-containment-e2e.log` | `Tests  2 passed (2)`, `exit=0` | The warning check covered all reads together |
| API-03b | AC-013, R-003 | Same | Updated E2E: warnings collected from the scanning context-file read alone (in-process console and the restarted process's log); final run on `2486c8b7c4` | ENV-1, ENV-2 | Pass | `API-03b-unreadable-tree-containment-e2e.log`, `API-03b-unreadable-tree-containment-e2e-final.log` | `Tests  2 passed (2)`, `exit=0` | Proves the moved trigger (team-member context-file read, FU-A surface) still scans and logs `Skipping standalone run '<bad>'` on both servers |
| API-03c | AC-013 (assertion validity) | Same | Temp copy of the API-03b test with the scanning read replaced by the hub-scoped context-file route (no scan); file removed after the run | ENV-1 | Pass (expected failure observed) | `API-03c-containment-mutation-check.log` | `running server: a warning names the skipped run; got []`, `Tests  2 failed (2)` | With no scanning read, no warning appears at all, so the context-file read is the only scan in the check |
| API-04 | AC-002, AC-003, AC-004, AC-005, AC-007, AC-008, AC-009, AC-011, REQ-002..REQ-006, REQ-008, REQ-009 | Real HTTP/GraphQL, real Team and Org runs, running then stopped | `env -i … vitest run tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-04-owner-scoped-member-file-changes-e2e.log` | `Tests  2 passed (2)`, `exit=0` | Team: configured `/manager`, team task agent, `/mate` with a pending file. Org: direct `/manager`, `/squad/lead`, org-root task agent, member-team task agent, `/sibling` pending. Running: lists from the live record (pending entry included); workspace-relative bytes for every member, task agents too; pending → 409 `not ready yet`. Stopped: same lists and bytes from the saved record; pending → 404 `not available`. Both states: run-id list `[]` and run-id content 404 for every member; another team/org → GraphQL error `was not found in` and REST 404; org route without `memberAddress` → 400, another member's address → 404; `getTeamMemberRunProjection` served in its team, `AgentRun '<id>' was not found in root TeamRun '<other>'.` in another |
| API-04b | AC-008 (stability), test validity | Same | Development rounds: 1 + 8 runs of the first version, 10 runs after the stored-record wait | ENV-1 | Pass | `API-04b-stability-loops.txt` | Round A: 2 of 9 `Timed out waiting for …`; Round B: 10 × `Tests 2 passed (2)` | Round A failures are the FU-C race (API-08), not this ticket's code |
| API-05 | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-012, REQ-007, REQ-008 | Browser: desktop Artifacts tab and mobile Artifacts view on a real stack | `pnpm -C autobyteus-web test:e2e:owner-scoped-file-reads --from-seed <seed> --output-dir <dir> --samples 9`, on both seeds. B-001 copy; B-002 team member + team task agent; B-003 org direct agent, member-team member, org-root and member-team task agents; B-004 standalone run; B-005 deleted copy file; B-006 mobile agent run; B-007 mobile team member. Each: open in the sidebar or mobile picker → Artifacts → click the file | ENV-3 | Pass | `API-05-06-small-seed-check/evidence.json`, `API-05-06-large-seed-check/evidence.json` (+ `B-00n-*.png`, `backend-1.log`, `frontend.log`), `API-05-06-*-seed-check.out.txt` | `"result":"Pass"` with `B-001`..`B-007` `"Pass"`; per case `requests` lists only owner routes, e.g. `200 /rest/agent-org-runs/<org>/agent-runs/<task agent>/file-change-content?memberAddress=%2Fosr_helper&path=org-squad-task-agent-notes.md`; `shown` contains the file's own text (`Owner-scoped file of org member-team task agent …`); B-005 shows `File not found` with 404 | Every content request of each journey goes to the opened subject's owner route (asserted); no run-id request for a member. Browser errors: only the expected `404 (Not Found)` resource lines of B-005. See Notes on request counts |
| API-06 | AC-010, QR-001, QR-002 | Real server HTTP timing | Same probe (`T-API`): 1 warm-up + 9 samples per read on the small (10) and large (680 unrelated saved team runs) seeds; seeds via `--seed-to <dir> --unrelated 10 / 680` | ENV-3 | Pass | `API-06-timing-summary.txt`, `API-06-seed-small/`, `API-06-seed-large/`, `API-06-seed-*.out.txt`, T-API in `API-05-06-*-seed-check/evidence.json` | Owner-scoped medians 2.3–3.9 ms (small) and 2.3–3.3 ms (large); slowest single sample 48 ms (small, delegated copy content, one outlier); control `scanning context-file read (FU-A)` 3.5 → 63.3 ms; member run-id reads 1.8–2.2 ms | Times include the local HTTP round trip. The control proves the seed size costs a scanning read (×18) while owner reads stay flat |
| API-07 | REQ-007 (web types) | Web sources changed by the ticket | `vue-tsc --noEmit -p tsconfig.json` in `autobyteus-web`; each error in a changed web file matched to the lines the ticket added | ENV-4 | Pass | `API-07-web-type-check.txt`, `API-07-vue-tsc-full-output.log` | `errors on lines added by this ticket: 0`; new files `0 errors` | 404 errors exist project-wide (no typecheck gate exists); the 23 in changed files are all on lines the ticket did not touch |
| API-08 | AC-008 / AC-003 (risk analysis), Rule 9 | `RunFileChangeService.load` (unchanged by this ticket) | Temp vitest probe with the real service and a delayed first stored read; probe copy kept; temp file removed | ENV-1 | Pass (defect reproduced) | `API-08-run-file-change-cache-race.log`, `API-08-run-file-change-cache-race.probe.test.ts` | `{"stored":["/abs/out.png"],"readerSaw":[],"later":[]}` | A first live read overlapping a run's first FILE_CHANGE event overwrites the live cache with the stale projection; later live reads miss the entry until the run detaches. Identical code on base `cba6b85122`, where active members were served through the same `load`. Outside the Change Scope ("RunFileChangeService live tracking" left alone) → follow-up FU-C |
| API-09 | Test validity (shared fixture change) | Scripted AGY fixture | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts --no-watch` | ENV-2 | Pass | `API-09-agy-fixture-routing-unit.log` | `Tests  18 passed (18)`, `exit=0` | The only unit/integration consumer of `agy-failure-cli.mjs`; the new `WRITE_FILE_HOLD:` branch fires only on its own token. Gated suites using the fixture in this ticket (API-02b, API-03b, API-04) pass on `2486c8b7c4`; other gated suites send no such token |

Notes on request counts (API-05): each file open records the content requests made by the tab opening (it selects the newest file) and by the click (a click on the selected file bumps `refreshSignal`, an intended refresh in unchanged code). Typical is 1 + 1. Twice (large seed, B-001 and B-005, the copy) the tab opening made 2 identical requests, both to the hub route; no request ever went to another run.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 (B-001, B-005), API-02b, API-01 | Proven | — |
| AC-002 | Yes | API-04, API-05 (B-002), API-01 | Proven | — |
| AC-003 | Yes | API-04 (configured member + team task agent, running and saved, 409 pending), API-05 (B-002), API-01 | Proven | — |
| AC-004 | Yes | API-04, API-05 (B-003), API-01 | Proven | — |
| AC-005 | Yes | API-04 (direct agent, member-team member, org-root and member-team task agents, running and saved, 409 pending), API-05 (B-003), API-01 | Proven | — |
| AC-006 | Yes | API-02b, API-05 (B-004, B-006), API-01 (IMP-03) | Proven | — |
| AC-007 | Yes | API-04 (members, owner running and saved), API-02/API-02b (copy; hub's own id), API-06 (member run-id reads), API-01 (unit spies) | Proven | — |
| AC-008 | Yes | API-04 (live list includes the pending entry; 409; saved list after stop), API-01 | Proven | — (FU-C is a pre-existing recording-cache race, out of scope; see residual risks) |
| AC-009 | Yes | API-04, API-02b, API-02, API-01 | Proven | — |
| AC-010 | Yes | API-06 | Proven | — |
| AC-011 | No | API-04, API-01 | Proven | — |
| AC-012 | Yes | API-05 (B-006, B-007), API-01 (IMP-04) | Proven | — |
| AC-013 | Yes | API-03, API-03b, API-03c | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 96% | API-01..API-06 | QR-001 measured on synthetic trees, smaller than the user's real ones (scoped reads do not depend on other trees; the control shows the seed matters) | A run on real user data, which TESTING.md forbids |
| Changed-boundary execution directness | 93% | 97% | API-02b, API-04 (real routes/queries), API-05 (real stores feed the viewer subject) | — | — |
| Cross-boundary integration realism and mock gap | 90% | 94% | Real server, real browser, real stores; scripted AGY runtime (TESTING.md "Runtimes without a model") | Pending state emulated (MCP-projected `write_file` step), because no scripted runtime records a pending file; mobile network routing emulated | A real-provider runtime writing a file slowly (costs credits; the read path is the same once the record exists) |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | Clean env, worktree `dist`, test-owned data roots, seeds via public APIs, 680 unrelated runs | Synthetic tree sizes | — |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 96% | Running → stopped transitions (API-04, API-02b), 409/404/400, wrong owner, deleted file, restart with an unreadable tree (API-03b) | FU-C race (pre-existing, out of scope) | Fix FU-C in its own Task |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | API-05 desktop B-001..B-005, mobile B-006..B-007, both seeds | Electron shell not exercised; no shell code changed (web-equivalent renderer only) | — |
| Durable regression coverage quality and relevance | 90% | 95% | New gated E2E (10/10 stable after the stored-record wait), updated E2Es, committed probe with package script | Gated suites skip without their gate (by project policy) | — |

- Overall post-repository confidence: 89.1% (simple average)
- Overall final confidence: 95.4% (simple average)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: FU-C (pre-existing live-cache race in `RunFileChangeService.load`); emulated pending state; synthetic tree sizes

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (gated server E2E on real Team/Org/hub roots) + `Browser` (probe-owned real stack, desktop and mobile)
- Confidence gap or residual risk it addresses, and the expected gain: after repository checks the running-owner reads (live record), task-agent workspace roots, org and copy routes over real HTTP, the web subject wiring through real stores (no web typecheck) and QR-001 timing were proven only by unit/mocked tests or not at all. API-02b..API-06 close these.
- Browser validation needed, and why: yes. The viewer's subject comes from `activeWorkspaceTarget.browse` in real stores (desktop) and `focusedReadSubject` (mobile); only a real stack proves the request each click makes.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: browser probe on a probe-owned real stack, as TESTING.md prescribes for renderer and client–server behavior; no deviation.
- Cases proving web-equivalent behavior: API-05 (B-001..B-007). Shell-specific or lifecycle behavior: none changed by the ticket.
- Effect on any already-running desktop application: `None` (own ports, data roots and HOME; `~/.autobyteus` untouched)
- Behavior not directly proven and its confidence consequence: Electron main/preload are not exercised; they are unchanged, so no confidence deduction.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (run-id reads give members nothing on a real server: API-04, API-02b, API-06)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (commit `2486c8b7c4`)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts` | Added | API-04 | — |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`WRITE_FILE_HOLD:<path>` directive) | Updated | API-04 | — |
| `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts` | Updated | API-02b | — |
| `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | Updated | API-03b | — |
| `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` | Added | API-05, API-06 | — |
| `autobyteus-web/package.json` (`test:e2e:owner-scoped-file-reads`) | Updated | API-05, API-06 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model runtime | Scripted AGY CLI (`linked_skills`): `GENERATE_IMAGE:`, `CALL_TOOL:`, new `WRITE_FILE_HOLD:` | No inference needed; TESTING.md "Runtimes without a model" | The pending entry comes from an emulated in-progress `write_file` step |
| Phone network | Pairing URL `http://192.168.77.10:<port>`; the probe browser routes that host (HTTP via `context.route`, WebSocket via `routeWebSocket` + a `ws` relay) to the probe backend | The server refuses loopback pairing URLs; exposing the test server on the LAN is unnecessary | The real phone network path (LAN) is not exercised; it does not affect which route the viewer requests |
| Slow first stored read (API-08 only) | Delayed `readProjection` wrapper around the real store | Deterministic reproduction of a timing race | Probe only; not durable |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process E2E servers, temp HOMEs and data dirs | Yes | Harness `close()` / `afterAll` | Removed |
| Probe stacks (backend, Nuxt dev, Chrome, data copies, private HOMEs) | Yes | Probe `finally`: process-group SIGTERM, `dataCopyRemoved` | `cleanup` receipts in each `evidence.json`: backend `terminated` exit 0, frontend `terminated` |
| Throwaway explore stack (DOM discovery, ports 18731/18732) | Yes | Killed; ports checked free | Removed |
| Seeds and dev runs under `/tmp/rfcosr-api` (seeds, loops, vue-tsc install, base export) | Yes | `rm -rf /tmp/rfcosr-api` | Removed; summaries kept in evidence |
| Temp test files `zz-tmp-mutation-containment.e2e.test.ts`, `zz-tmp-run-file-change-cache-race.test.ts` | Yes | Deleted after their runs | Removed (probe copy kept as evidence for API-08) |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (Pass with `architectural_risk=High` → proportional test-code review)
- Notes:
  - Follow-up FU-C (outside the Change Scope, pre-existing, identical on base `cba6b85122`): `RunFileChangeService.load` (`autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts:92-99`). A first read of an attached run that is still in its stored read when the run's first FILE_CHANGE event is handled overwrites the live cache with the stale projection. Later live list and content reads miss that entry (content: 404 "File change not found") until the run stops. Reproduced by API-08; seen in 2 of 9 API-04 development runs. In real use it needs a list hydration that overlaps an agent's first file change. Sent to `/project_task_manager` as a follow-up.
  - Docs impact (from CRR-001) is unchanged; delivery's docs sync owns it.
