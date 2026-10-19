# API/E2E Execution Coverage Report — run-file-change-live-cache-race (autobyteus-180)

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (direct route)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why: none
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/evidence/` (the handoff message gives the commit that holds it)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `e44a2de1b1` (code `c2bd6991b0`) | macOS 26 (darwin-arm64) | node v22.23.1, pnpm 10.28.2; server `dist` rebuilt from the worktree (exit 0); vitest | Unit probe under test isolation; gated E2E under `env -i` with the scripted AGY CLI, a fresh resolved temp HOME per loop run |
| ENV-2 | `4667ec6613` (code `c2bd6991b0` + probe update) | same | probe-owned stack: server `dist/app.js`, Nuxt dev (`nuxt prepare` done), headless Chrome (playwright-core) | Own ports, data root and HOME; small seed (10 unrelated saved team runs) made through public APIs; desktop 1600×1000 and mobile 390×844 (Phone Access, private-IP pairing routed by the browser) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, AC-004, QR-001 (unit/integration), typecheck | Server unit, integration, typecheck | Reused: IMP-01, IMP-02, IMP-03, IMP-06 | — | Pass | Implementation handoff rows | Handoff "Checks Run" | Ran on `c2bd6991b0` (IMP-01: base src + new tests, red as expected); `e44a2de1b1` adds only ticket docs. IMP-04/IMP-05 are implementation-side loops; API-03 is my own |
| API-02 | AC-001 (independent) | `RunFileChangeService` | The original FU-C probe (autobyteus-153 `API-08`), only its last assertion changed to the fixed expectation; `pnpm -C autobyteus-server-ts exec vitest run tests/unit/zz-tmp-fu-c-probe-on-fix.test.ts --no-watch`; temp file removed | ENV-1 | Pass | `API-02-fu-c-probe-on-fix.log`, `API-02-fu-c-probe-on-fix.probe.test.ts` | `{"stored":["/abs/out.png"],"readerSaw":["/abs/out.png"],"later":["/abs/out.png"]}` | Before the fix the same probe printed `"readerSaw":[],"later":[]` |
| API-03 | AC-003, REQ-001, REQ-002 (real server) | Real HTTP/GraphQL; Team and Org roots running, then stopped | `owner-scoped-member-file-changes.e2e.test.ts` × 10 consecutive runs (command in the log header), fresh temp HOME per run | ENV-1 | Pass | `API-03-owner-scoped-e2e-loop-10.log` | `SUMMARY: 10 passed, 0 failed of 10 consecutive runs`; each `Tests 2 passed (2)` | No stored-record wait: members are read live as they write (the first reads overlap their first file changes); after the stop the saved lists hold every file. The unfixed control failed 3/10 (IMP-05) |
| API-04 | AC-004 / BEH-003 | Real HTTP/GraphQL | `agent-run-collaboration-member-file-changes.e2e.test.ts`; `standalone-unreadable-tree-containment.e2e.test.ts` | ENV-1 | Pass | `API-04-agent-run-collaboration-member-file-changes.log`, `API-04-standalone-unreadable-tree-containment.log` | `Tests  3 passed (3)`, `Tests  2 passed (2)`, `exit=0` | Live and stored reads of copies and hubs; restart with an unreadable tree |
| API-05 | SCN-001 via the browser stack, REQ-001, REQ-002, BEH-003 | Probe-owned real stack: seed via public APIs; desktop and mobile Artifacts | `pnpm -C autobyteus-web test:e2e:owner-scoped-file-reads --seed-to <dir> --unrelated 10`, then `--from-seed <dir> --output-dir <dir> --samples 5` | ENV-2 | Pass | `API-05-probe-seed/evidence.json`, `API-05-probe-seed.out.txt`, `API-05-probe-check/evidence.json` (+ `B-00n-*.png`, logs), `API-05-probe-check.out.txt` | Seed `"SEED":"Pass"`; check `"result":"Pass"` with T-API and B-001..B-007 `"Pass"`; per-case `browserErrors` empty except B-005 (2 allowed 404 lines = 2 content 404 responses) | Updated seed (commit `4667ec6613`): polls each owner's live list as the agent records its first file, with no stored-record wait, and after every root stops asserts each saved list still holds every file. Owner reads stay under 6 ms |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-01/IMP-03), API-02, API-03, API-05 (seed live reads) | Proven | — |
| AC-002 | Yes | API-01 (IMP-01/IMP-03), API-03 (saved lists after stop), API-05 (saved-list assertion after stop) | Proven | — |
| AC-003 | Yes | API-03 (10/10; IMP-05 control shows the loop detects the race) | Proven | — |
| AC-004 | Yes | API-01 (IMP-03, IMP-06), API-04, API-05 | Proven | — |

QR-001 (reads never wait for queued file-change handling): the code reads no queue (`load` diff); the overlap tests return without waiting for the event (IMP-01 gated read); owner reads stay at a few ms in API-05.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | API-01..API-05 | — | — |
| Changed-boundary execution directness | 95% | 97% | IMP-01/API-02 force the overlap on the real service; API-03 hits it on a real server | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | Real server and browser stack; scripted AGY runtime | Model-free runtime | A real provider (no added value for a server cache rule) |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | Clean env, worktree `dist`, test-owned data | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 95% | Overlap, second change, concurrent reads, detach (unit); stop after overlap (API-03, API-05) | R-001 contrived, not tested | — |
| User-surface, browser, and desktop-shell confidence | N/A at repo level | 94% | API-05 desktop and mobile journeys | A browser hydration overlapping the event cannot be forced through the UI; the server path it uses is proven | — |
| Durable regression coverage quality and relevance | 95% | 96% | 3 unit regressions (red on base), E2E without the workaround (control 3/10 red), probe without the workaround | — | — |

- Overall post-repository confidence: 92.5% (simple average of six categories; user surface not yet run)
- Overall final confidence: 95.6% (simple average of seven categories)
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: entries lost before the fix stay lost (R-002, release notes); R-001 contrived

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (gated E2E loop) + `Browser` (probe)
- Confidence gap it addresses: the unit tests force the overlap with a gated store; a real server with real event timing and the lists the UI hydrates were not proven by my own runs.
- Browser validation needed, and why: yes, briefly. The defect showed up as files missing in the Artifacts tab; the probe proves the lists and files the UI reads on a real stack.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: browser probe (web-equivalent); no shell change.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: Electron shell (unchanged); no deduction.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: pre-written `file_changes.json` records (IMP-06); records written during and after runs (API-03, API-05)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-01 (IMP-06), API-03, API-05
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: past losses stay lost (DEC-002, R-002)

## Compatibility / Legacy Scope Check

- Backward compatibility in requirements/design: `No`
- Compatibility-only or legacy-retention behavior in implementation: `No`
- Durable coverage retained only for compatibility: `No` (the E2E and probe workarounds are removed)
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` | Updated (`4667ec6613`): seed reads owner lists live while agents write (no stored-record wait); asserts saved lists after the stop | API-05 | The removed `storedPathsOf` wait existed only to dodge the defect this ticket fixes |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route)
- Diff or repository evidence supplied for removed paths: N/A (code removed inside an updated file; diff in `4667ec6613`)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model runtime | Scripted AGY CLI | No inference needed (TESTING.md) | None for a server cache rule |
| First stored read timing (API-02) | Delayed read wrapper around the real store | Deterministic overlap | Probe only |
| Phone network (API-05 mobile) | Private-IP pairing URL routed by the browser to the probe backend | Server refuses loopback pairing URLs | Network path only |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temp test `autobyteus-server-ts/tests/unit/zz-tmp-fu-c-probe-on-fix.test.ts` | Yes | Deleted after the run (copy kept as evidence) | Removed |
| E2E temp HOMEs and data dirs | Yes | Per-run `rm -rf`; harness `close()` | Removed |
| Probe stacks, seed, per-run logs under `/tmp/rflcr-api` | Yes | Probe cleanup receipts; `rm -rf /tmp/rflcr-api` | Removed (backend `terminated` exit 0, frontend `terminated`) |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer` (direct `Small` / `Low` route; test-code review `Not Required — direct low-risk route`)
- Notes: the release-notes line for R-002 (losses before the fix cannot be restored) is delivery's, as the handoff says.
