# API/E2E Execution Coverage Report

The run record and the result: what ran, what it proves, how confident you are, and the outcome. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-004` (the CR-T-001 Local Fix on round 3's result)
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 3, code review CRR-007 Pass after the L-002 rework: IR-006 (`65a5b34c9b`; SR-007, SR-008). A rebuild keeps the Team tab's lists when the live sequence is the same and the last **message** sequence M ≤ C.
- Prior round reviewed: round 2 (API-REV-002: Fail on API-08 L-002)
- API-REV-004 (test-code review CRR-008, CR-T-001):
  - LRL-004 now asserts the server's reason (`<file>:line <n> is not valid JSON`) in the server error, the desktop Team tab, the phone and the restore response; the length-only `reasonShown` is removed.
  - The resume waits for the restore response instead of a fixed 8 s.
  - LRL-002 waits until the Org run is inactive, and its title says "at most" one member at open.
  - LRL-005 asserts exactly one reload after the resume.
  - LRL-002, LRL-004 and LRL-005 were rerun (round 4): Pass.
- Deviations from the investigation's plan, and why:
  - L-012 added to the hub probe: a delegation whose new copy reports to the hub at once, the reviewer's "a message in the window" count.
  - The hub probe now records each browser error's time and stack, to trace FU-006.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | round 3: `2b00c20f0a` (code `65a5b34c9b`; server `dist` rebuilt this round; the contracts' `dist` carries `last_message_change_sequence`) plus this round's probe files. Earlier rounds: `f4e7b1d13b`, `feb69a02a3` | macOS (Darwin 25.5.0), Node v22.23.1 | `delegated-launch-defaults-probe.mjs` stack: headless Chrome (playwright-core) → Nuxt dev → `autobyteus-server-ts/dist/app.js`, scripted AGY (`agy-failure-cli.mjs`, `linked_skills`) | Clean env (`env -i PATH HOME USER LOGNAME TMPDIR`); probe-owned temp data root, HOME, SQLite and ports, removed after each run; desktop 1512×952 `en-US`; phone 390×844 (Phone Access through a private-network URL routed to the probe backend) |
| ENV-2 | same | same | `delegated-copies-large-hub-probe.mjs` on the test-owned seed `/tmp/ab358e2e/seed` (`--teams 12 --unrelated 50`), `--from-seed … --live --large-shape unbroken --samples 1` | Hub with 12 six-member Team copies, 62 hub messages (60 × 10 KB reports; hub log 627,887 bytes), 50 unrelated team runs |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-008, all (repository layer) | every suite | Reused: IMP-12/IMP-13 (round 1); `evidence/IMP-IR006-checks.log` at `65a5b34c9b`: contracts 39/21; server unit 7,674; integration 480 (FU-001's 6 only); web 4,944; typecheck PASS; guards; a mutation check (comparing the base instead of M fails 3 tests) | — | Pass | (implementation rows) | (implementation rows) | Ran on the round-3 code commit |
| API-02 | AC-001, AC-004, AC-005, AC-007; QR-001…QR-004 | seed probes | Reused: IMP-10, IMP-11 | — | Pass | (implementation rows) | (implementation rows) | IR-004…IR-006 add sequence fields to views, snapshots and the Team open read; no effect on view size, view-request counts or the scan. QR-002 and QR-004 rechecked live (API-08 L-001, API-07) |
| API-03 | AC-003, QR-005 (Team) | browser, real stack | `pnpm -C autobyteus-web test:e2e:large-runs-load-less --output-dir <fresh>` (LRL-001…LRL-005), LRL-001 | ENV-1 | Pass (rounds 1–3) | `API-03-06-09-r3-lrl-browser-probe.json`, `API-03-LRL-001-team-open.png` | `openOps`: one `GetTeamMemberRunProjection` and one `GetTeamMemberFileChanges`, for the lead; `otherOps`: one pair for the designer; `backOps: {}` | |
| API-04 | AC-003, QR-005 (Org) | same | LRL-002 | ENV-1 | Pass (rounds 1–4) | `API-04-06-09-r4-lrl-browser-probe.json` (round 4), `API-04-LRL-002-org-opened.png`, `API-04-LRL-002-writer-opened.png` | `openOps: {}` (at most one member at open; none with no selection); `writerOps`: one pair for the writer | Round 4 waits until the Org run is inactive before opening it |
| API-05 | AC-002 live; SCN-002b, SCN-002c | browser, real Team stream | LRL-003 | ENV-1 | Pass (rounds 1–3) | same, `API-05-LRL-003-after-reconnect.png` | `heldResponseHasM2: false`; `afterReconnect` M3, M2, M1, each once | Holds under every round's reload rule |
| API-06 | AC-006; SCN-007, SCN-007b | browser (desktop and phone), real server | LRL-004 (round 4: `--cases LRL-002,LRL-004,LRL-005`) | ENV-1 | Pass (rounds 1–4) | `API-04-06-09-r4-lrl-browser-probe.json` (round 4: asserted `expectedReason` "team_communication_messages_active.jsonl:line 2 is not valid JSON"), `API-06-r4-LRL-004-team-tab-unavailable.png`, `API-06-r4-LRL-004-phone-unavailable.png`, `API-06-LRL-004-resume-refused.png` | "These messages can't be shown team_communication_messages_active.jsonl:line 2 is not valid JSON." on desktop and phone; `restoreResponses` "success":false with the reason; `activeAfterResume: false` | The app does not show the refused resume's reason (FU-004, existing composer path) |
| API-07 | AC-007, QR-004 | browser, long-token copy | Large-hub probe L-010 `--large-shape unbroken` with the display checks | ENV-2 | Pass (rounds 1–3) | `API-07-08-r3-hub-probe-live.json` (`cases.L-010`), `API-07-L-010-unbroken-copy-open.png` | `clickToStoreLoadedMs` ≈ 179; `display` `overflowing: 0`, `selectedHasWholeToken: true`, `found: true`, `distanceFromBottom: 0` | |
| API-08 | AC-001, AC-002, AC-004; REQ-002, REQ-003; SR-004…SR-008's counts | large-hub probe, live | `pnpm -C autobyteus-web test:e2e:delegated-copies-large-hub --from-seed /tmp/ab358e2e/seed --output-dir <fresh> --live --large-shape unbroken --samples 1` (5 runs this round) | ENV-2 | Pass | `API-07-08-r3-hub-probe-live.json` (clean run t1), `API-08-r3-hub-participant-requests.log`, `API-08-r3-L-012-delegation-with-report.png`; round 1/2 logs kept | S-001: one hub fetch; L-001 (running hub click): one; L-002: `participants: {}` with `hubMessagesBefore: 62`, `hubMessagesAfter: 62`; L-012: `markerShown: 1`, `rowsShown: 63` = stored 63, `participants: {}` | Every case passed in all 5 runs. 2 of the 5 runs still ended `Fail` on FU-006's Terminal-panel browser errors, outside this ticket (`API-08-r3-FU-006-terminal-error-trace.log`). In L-012 the report arrived after the reconnect and was applied live (no refetch); the reload branch for a message inside the window is unit-tested (IR-006 mutation check) |
| API-09 | AC-002, REQ-002; SR-004…SR-008 (Team) | browser, real Team stream | LRL-005 | ENV-1 | Pass (rounds 2–4) | `API-04-06-09-r4-lrl-browser-probe.json` (round 4), `API-03-06-09-r3-lrl-browser-probe.json`, `API-09-r3-LRL-005-after-resume.png` | `openParticipantOps`: one for the lead; `liveParticipantOps: {}`; `resumeParticipantOps`: exactly one (asserted from round 4); list M3, M2, M1 | |

### Prior Failure Resolution (API-08)

- Round 1: a running hub's selection fetched the hub's list twice, and every publication (each new delegation) re-read every loaded list. **Resolved:** L-001 fetches once (rounds 2–3), and L-002 fetches nothing when the delegation adds no hub message (round 3).
- Round 2: a delegation with no hub message still refetched both loaded lists (4/4 runs). **Resolved** by IR-006 (M ≤ C): `participants: {}` in all 5 round-3 runs. A delegation whose copy reports at once (L-012) shows the report once, with the list equal to the stored log.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (no message log in the view; QR-001) | Yes | API-02, API-08 (S-API), API-01 | Proven | — |
| AC-002 (Team tab equals the stored log; a live message once, in order) | Yes | API-05, API-09, API-08 (L-012), API-03, API-01 | Proven | — |
| AC-003 (focused member only at open; next on open; QR-005) | Yes | API-03, API-04, API-08 | Proven | — |
| AC-004 (one view read per hub selection; QR-002) | Yes | API-02, API-08 (S-001, L-001) | Proven; the hub's message list is also fetched once per selection | — |
| AC-005 (scan; QR-003) | Yes | API-02, API-01 | Proven | — |
| AC-006 (damaged log reported where read) | Yes | API-06, API-01 | Proven (FU-004: the app does not show the resume refusal) | — |
| AC-007 (long-token copy; QR-004) | Yes | API-07, API-02 | Proven | — |
| AC-008 (suites) | Yes | API-01 | Proven (FU-001 on base) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | API-01…API-09 | — | — |
| Changed-boundary execution directness | 85% | 95% | real server, streams, browser, phone | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | scripted AGY over real tools and streams; real request counts | No provider model (not needed: loading does not depend on the model) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | probe-owned stacks; test-owned seed; Phone Access pairing | Seed at 12 copies (QR numbers from the 50-copy seed are reused) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | API-05, API-06, API-09 | A message inside the reconnect window proven by unit tests; in the browser it arrived live (L-012) | — |
| User-surface, browser, and desktop-shell confidence | 80% | 90% | API-03…API-09 | FU-004 (resume refusal not shown); FU-006 (Terminal errors) | — |
| Durable regression coverage quality and relevance | 90% | 95% | LRL-001…005; L-001/L-002/L-012 count assertions; L-010 display checks | — | Test-code review |

- Overall post-repository confidence: 86%
- Overall final confidence: 94%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94%). The gap is the user surface: FU-004 and FU-006 are outside this ticket, and no further validation of this ticket would close it
- Confidence-limiting residual risks: FU-004 (refused resume shown only in the console), FU-006 (intermittent Terminal-panel errors fail the hub probe run in 2 of 5 runs); remote participants, the sequence-gap reopen and the reasoning renderer (investigation residuals)

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Browser` (desktop and phone) on probe-owned real stacks
- Confidence gap or residual risk it addresses, and the expected gain: real request counts on Team/Org open and on running roots; the merge, reconnect and stop/resume; damaged logs; long-token display
- Browser validation needed, and why or why not: yes; the changed boundary is client loading over real streams
- If `Blocked`: N/A

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: runs written by the current code; a damaged current log (API-06); the round-1 seed opened by the round-3 build
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-06; API-08
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes` (rounds 1–3)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs` | Added (round 1: LRL-001…004; round 2: LRL-005) | API-03…API-06, API-09 | — |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated: registration and header | same | — |
| `autobyteus-web/package.json` | Updated: `test:e2e:large-runs-load-less` | same | — |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Updated: round 1, L-010 display checks and the `isChildHydrated` → `MemberLoader` baseline fix (own commit `ceb5e2d972`). Round 2, L-001/L-002 participant-count assertions and `hubMessageCount`. Round 3, L-012 and browser-error time and stack (`errorDetails`) | API-07, API-08 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model providers | scripted AGY CLI (real tool calls, real streams) | No provider proof needed | The model's choices are typed by the probe |
| Network (API-05) | Playwright `route` holds one response; `routeWebSocket` drops the Team stream and refuses reconnects | Forces the load race and the gap | Real network timing |
| Phone (API-06) | Phone Access paired through a private-network URL routed to the probe backend | The server refuses loopback pairing URLs | No physical phone |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (rounds 1–3) | Yes | backends, Nuxt and Chrome stopped; owned roots removed (cleanup receipts in the evidence JSON) | Done |
| Test-owned seed `/tmp/ab358e2e/seed` | Yes | removed after this round | Done |
| `/tmp/ab358e2e/` scratch logs | Yes | evidence copied into the ticket | Kept (scratch) |

## Preliminary Classification (On `Fail`)

N/A: this round passes.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review)
- Notes:
  - Follow-ups: FU-004 (the app does not show a refused resume's reason) and FU-006 (intermittent Terminal-panel browser errors).
  - FU-006 makes a full large-hub probe run end `Fail` in about 2 of 5 runs even when every case passes. Whoever runs that probe should read its `errors` before reading the result.
