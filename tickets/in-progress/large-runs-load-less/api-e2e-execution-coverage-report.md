# API/E2E Execution Coverage Report

The run record and the result: what ran, what it proves, how confident you are, and the outcome. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, code review CRR-005 Pass after the API-08 rework: IR-004 (`935c5c9fa9`, `da91ae689a`; SR-004, SR-005) and IR-005 (`99cd853f79`; SR-006)
- Prior round reviewed: round 1 (API-REV-001: Fail on API-08)
- Deviations from the investigation's plan, and why:
  - API-09 added (LRL-005): opening a **running** Team, and a stop/resume, under the new reload rule.
  - L-002 now asserts SR-004's expected count. A delegation that adds no hub message must not refetch the hub's list.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (after the failure-origin review)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: `feb69a02a3` (code `99cd853f79`; server `dist` rebuilt this round) plus this round's probe files; round 1: `f4e7b1d13b` | macOS (Darwin 25.5.0), Node v22.23.1 | `delegated-launch-defaults-probe.mjs` stack: headless Chrome (playwright-core) → Nuxt dev → `autobyteus-server-ts/dist/app.js`, scripted AGY (`agy-failure-cli.mjs`, `linked_skills`) | Clean env (`env -i PATH HOME USER LOGNAME TMPDIR`); probe-owned temp data root, HOME, SQLite and ports, removed after each run; desktop 1512×952 `en-US`; phone 390×844 (Phone Access through a private-network URL routed to the probe backend) |
| ENV-2 | same | same | `delegated-copies-large-hub-probe.mjs` on the test-owned seed `/tmp/ab358e2e/seed` (`--teams 12 --unrelated 50`, made in round 1), `--from-seed … --live --large-shape unbroken --samples 1` | Hub with 12 six-member Team copies, 62 hub messages (60 × 10 KB reports; hub log 627,887 bytes), 50 unrelated team runs; load 5–30 |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-008, all (repository layer) | every suite | Reused: IMP-12/IMP-13 (round 1) and `evidence/IMP-IR005-checks.log` at `99cd853f79` (server tsc 0, unit 7,671, integration 480 with FU-001's 6, web 4,943, typecheck PASS, guards) | — | Pass | (implementation rows) | (implementation rows) | Ran on the round-2 code commit |
| API-02 | AC-001, AC-004, AC-005, AC-007; QR-001…QR-004 | seed probes | Reused: IMP-10, IMP-11 | — | Pass | (implementation rows) | (implementation rows) | IR-004/IR-005 add `live_sequence_id` to views and two fields to the Team open read: no effect on view size, view-request counts or the scan. QR-002 rechecked live in API-08 (L-001) |
| API-03 | AC-003, QR-005 (Team) | browser, real stack | `pnpm -C autobyteus-web test:e2e:large-runs-load-less --output-dir <fresh>` (LRL-001…LRL-005), case LRL-001 | ENV-1 | Pass (round 1 and round 2) | `API-03-06-09-r2-lrl-browser-probe.json` (round 2), `API-03-06-lrl-browser-probe.json` (round 1), `API-03-LRL-001-team-open.png` | `openOps`: one `GetTeamMemberRunProjection` and one `GetTeamMemberFileChanges`, for the lead; `otherOps`: one pair for the designer; `backOps: {}` | |
| API-04 | AC-003, QR-005 (Org) | same | LRL-002 | ENV-1 | Pass (both rounds) | same, `API-04-LRL-002-org-opened.png`, `API-04-LRL-002-writer-opened.png` | `openOps: {}`; `writerOps`: one pair for the writer | |
| API-05 | AC-002 live; SCN-002b, SCN-002c | browser, real Team stream | LRL-003: a response held while M2 is stored; a dropped stream with reconnects refused while M3 is sent | ENV-1 | Pass (both rounds) | same, `API-05-LRL-003-after-reconnect.png` | `heldResponseHasM2: false`; `afterLoad` M2, M1; `afterReconnect` M3, M2, M1, each once | Rechecked under the new reload rule (the reviewer's request): the reconnect after the gap reloads, and M3 is shown |
| API-06 | AC-006; SCN-007, SCN-007b | browser (desktop and phone), real server | LRL-004 | ENV-1 | Pass (both rounds) | same, `API-06-LRL-004-team-tab-unavailable.png`, `API-06-LRL-004-resume-refused.png`, `API-06-LRL-004-phone-unavailable.png` | "These messages can't be shown team_communication_messages_active.jsonl:line 2 is not valid JSON." on desktop and phone; `restoreResponses` "success":false with the reason; `activeAfterResume: false` | The app does not show the refused resume's reason (FU-004, existing composer path) |
| API-07 | AC-007, QR-004 | browser, long-token copy | Large-hub probe L-010 `--large-shape unbroken` with the display checks | ENV-2 | Pass (both rounds) | `API-07-08-r2-hub-probe-live.json` (`cases.L-010`), `API-07-L-010-unbroken-copy-open.png` | `clickToStoreLoadedMs` 178.7 (round 1: 178.8); `display` `overflowing: 0`, `selectedHasWholeToken: true`, `found: true`, `distanceFromBottom: 0` | |
| API-08 | AC-001, AC-002, AC-004; REQ-002, REQ-003; SR-004's counts | large-hub probe, live | `pnpm -C autobyteus-web test:e2e:delegated-copies-large-hub --from-seed /tmp/ab358e2e/seed --output-dir <fresh> --live --large-shape unbroken --samples 1`; then `--cases L-001,L-002` with the hub's stored message count recorded around the delegation | ENV-2 | **Fail** | `API-07-08-r2-hub-probe-live.json`, `API-08-r2-hub-participant-requests.log`, `API-08-r2-delegation-refetch.log`; round 1: `API-08-hub-participant-reloads.log` | **Fixed:** L-001 (running hub click) one hub fetch, line 84 (round 1: two); S-001 one; L-004 (reopen) one. **Still failing:** L-002 `hubMessagesBefore: 62`, `hubMessagesAfter: 62`, yet `participants` hub 1 and open copy 1 (lines 93, 94, the same ms). Run d: "L-002 Fail: The hub's list was fetched again after a delegation that added no hub message" | See Failure Detail. All 14 probe cases pass otherwise. One of four runs also failed on two Terminal-panel browser errors (FU-006; unchanged code) |
| API-09 | AC-002, REQ-002; SR-004…SR-006 (Team) | browser, real Team stream | LRL-005: a running Team opened in a fresh page with its Team tab; a live message; stop, then resume from the composer | ENV-1 | Pass | `API-03-06-09-r2-lrl-browser-probe.json` (LRL-005), `API-09-LRL-005-after-resume.png` | `openParticipantOps`: one for the lead; `liveParticipantOps: {}`; `resumeParticipantOps`: one; `afterResume` M3, M2, M1 | SR-006's fix holds: one fetch per running-Team open |

### Failure Detail (API-08, round 2)

- **What is fixed.** A running hub's selection fetches its list once (L-001; round 1: twice). Opening a running Team fetches once (API-09). A reconnect after a real gap, and a stop/resume, reload and show the missed messages (API-05, API-09).
- **Observed.** One new delegation on a running hub, with the Team tab showing the hub's list and one copy's list loaded:
  - The hub's stored list is unchanged: 62 messages before and after. A local delegation writes no hub message; the seed's hub log has only `agent_message` entries, the 60 reports plus 2 markers.
  - The client still fetches **both** loaded lists again, at the same millisecond: the hub's whole list and the open copy's.
  - The stream showed one snapshot (`snapshotsReceived: 1`) and the new copy's events: `task_execution_started`, then `agent_presentation` × 16 and a batch.
  - Reproduced in 4 of 4 runs.
- **Expected.** SR-004: "a new child or settings Save with no message in the reconnect window gives 0; a message in that window gives 1". The reviewer's handoff lists the same counts.
- **Likely cause** (for the failure-origin review). The rule reloads when the rebuilt base sequence B passes the sequence C the lists are consistent through. B counts every root change, not only messages. A new copy emits events while the client reconnects after the delegation's `checkpoint_required`, so B > C on every delegation, whether or not a message was written. Either C is not advanced by events the client did apply, or the rule cannot tell a message from other events in the window. Each new delegation on a running hub therefore still re-transfers the hub's whole list while the Team tab has it loaded: half of round 1's finding.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (no message log in the view; QR-001) | Yes | API-02, API-08 (S-API), API-01 | Proven | — |
| AC-002 (Team tab equals the stored log; a live message once, in order) | Yes | API-05, API-09, API-03, API-01 | Proven | — |
| AC-003 (focused member only at open; next on open; QR-005) | Yes | API-03, API-04, API-08 | Proven | — |
| AC-004 (one view read per hub selection; QR-002) | Yes | API-02, API-08 (S-001, L-001: no view read on the click; one list fetch) | Proven | — |
| AC-005 (scan; QR-003) | Yes | API-02, API-01 | Proven | — |
| AC-006 (damaged log reported where read) | Yes | API-06, API-01 | Proven (FU-004: the app does not show the resume refusal) | — |
| AC-007 (long-token copy; QR-004) | Yes | API-07, API-02 | Proven | — |
| AC-008 (suites) | Yes | API-01 | Proven (FU-001 on base) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 80% | API-01…API-09 | Every AC proven; a delegation still re-reads every loaded list against SR-004's counts | Rework, then rerun L-002 |
| Changed-boundary execution directness | 80% | 95% | real server, streams, browser, phone | — | — |
| Cross-boundary integration realism and mock gap | 75% | 90% | scripted AGY over real tools and streams | No provider model | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | probe-owned stacks; test-owned seed | Seed at 12 copies | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | API-05, API-06, API-09 (stop/resume) | — | — |
| User-surface, browser, and desktop-shell confidence | 70% | 85% | API-03…API-09 | FU-004; FU-006 (intermittent Terminal errors) | — |
| Durable regression coverage quality and relevance | 85% | 95% | LRL-001…005; L-001/L-002 count assertions; L-010 display checks | — | Test-code review |

- Overall post-repository confidence: 81%
- Overall final confidence: 90%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `Yes`: requirement proof 80% (API-08), user surface 85% (FU-004, FU-006)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: the delegation refetch (API-08); FU-004; FU-006

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Browser` (desktop and phone) on probe-owned real stacks
- Confidence gap or residual risk it addresses, and the expected gain: the reload rule's counts on running roots; the merge and reconnect under the new rule
- Browser validation needed, and why or why not: yes; the changed boundary is client loading over real streams
- If `Blocked`: N/A

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: runs written by the current code; a damaged current log (API-06); the round-1 seed reused on the round-2 build
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-06; API-08 (the round-1 seed opens on the round-2 build)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs` | Added (round 1, LRL-001…004); updated (round 2, LRL-005) | API-03…API-06, API-09 | — |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (round 1 registration; round 2 header names LRL-005) | same | — |
| `autobyteus-web/package.json` | Updated: `test:e2e:large-runs-load-less` (round 2: with LRL-005) | same | — |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Updated: round 1, L-010's display checks and the `isChildHydrated` → `MemberLoader` baseline fix (own commit). Round 2: L-001/L-002 participant-count assertions and the hub's stored message count around the delegation | API-07, API-08 | — |

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
| Probe stacks (rounds 1 and 2) | Yes | backends, Nuxt and Chrome stopped; owned roots removed (cleanup receipts in the evidence JSON) | Done |
| Test-owned seed `/tmp/ab358e2e/seed` | Yes | kept for the next round's L-002 recheck, then removed | Kept (test-owned) |
| `/tmp/ab358e2e/` scratch logs | Yes | evidence copied into the ticket | Kept (scratch) |

## Preliminary Classification (On `Fail`)

- `Local Fix` or `Design Impact`, for the failure-origin review:
  - **Local Fix** if C should advance on the events the client applied after the reconnect, so the base after a delegation does not pass C (the design's expected count is 0).
  - **Design Impact** if the rule (B > C over every root change) cannot give SR-004's "no message → 0". Then the rule needs a message-specific sequence or a different policy.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: none. The failure is SR-004's delegation count (API-08 L-002)
- Preliminary classification and recommended owner: `Local Fix` (implementation) or `Design Impact` (Solution Designer), via the code reviewer's failure-origin review
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer`
- Notes: round 1's running-hub double fetch is fixed (L-001), and so is the running-Team open (API-09). FU-006 added (intermittent Terminal-panel browser errors).
