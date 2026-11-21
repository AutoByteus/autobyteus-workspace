# API/E2E Revision Record

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, round 1 (CRR-001 pass) | SR-008, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 88% |
| API-REV-002 | Code reviewer, CRR-003 (pass of IR-002), round 2 | SR-009, SR-010, ARCH-REV-004, IR-002, CRR-002, CRR-003 | Fail / 88% | Fail / 91% |
| API-REV-003 | Code reviewer, CRR-006 (pass of IR-003, IR-004), round 3 | IR-003, IR-004, CRR-004, CRR-005, CRR-006 | Fail / 91% | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: real-boundary validation; two failures (run-ID refusal, leaving member not shown in the app)

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-001
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-008, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first API/E2E validation.
- Coverage decisions or durable test paths changed (commit `443f1c2c0f`):
  - added `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` (TF-01..TF-10);
  - added `autobyteus-server-ts/tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts` (TFL-01, TFL-02);
  - added RC-51 to `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`;
  - a ticket-owned rendered probe at `probes/team-follows-ui-probe.mjs` (TFU-01..TFU-03).
- Cases added, changed, removed, or rechecked: as above; IMP-02..IMP-05, IMP-08, IMP-09 reused; three existing E2E suites rerun (API-REG); typecheck (API-TC); fresh-start build (API-FS).
- Commands, environment, fixture, or broader-validation delta: built server per suite (restart real); data root outside `/tmp` for Codex; the test vault's Anthropic key for native AutoByteus; Nuxt dev + Chromium for the rendered probe; two-node suite for the peer copy.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, execution report (all), progress log
- Prior result and confidence: N/A
- Current result and confidence: Fail, 88%
- New or remaining failure IDs:
  - F-1: TF-02/TF-03, a run-ID message to a removed member gets `TARGET_AGENT_RUN_NOT_ACTIVE` / `COLLABORATION_ROOT_NOT_ACTIVE` instead of the former-member refusal. Local Fix.
  - F-2: TFU-03, the app shows no leaving member: `TeamMembersPanel.vue`, which has the tag, is not mounted. Design Impact.
- Recommended owner: code reviewer (failure-origin review), then the implementation engineer (F-1) and the Solution Designer (F-2)
- Remaining risks, blocked evidence, or untested scope: configured-placement copies and application-bound runs not run end to end (unit-covered); observations O-1..O-5; the release job's signing-record unit tests refuse to run as root (27 node tests, environment); macOS/x64 release jobs need the runner.
- Follow-ups added: FU-004 (urgent): the Linux arm64 AppImage runtime needs the unversioned `libz.so` (outside this ticket).

### API-REV-002 — Round 2: F-1 and the warnings resolved; the Leaving tag shows, but a leaving member cannot be opened (F-3)

- Triggering role, report path, and round: code reviewer, CRR-003 (pass of IR-002 `d005fa2a5b`, `64a4b6100c`), round 2
- Triggering finding or case IDs: F-1, F-2 (round 1); O-1, O-2
- Related revision IDs: SR-009, SR-010, ARCH-REV-004, IR-002, CRR-002, CRR-003
- Why recorded: the rerun after rework.
- Coverage decisions or durable test paths changed: `team-run-follows-definition.e2e.test.ts` updated (commit `8789b97a41`):
  - TF-02/TF-03 run-ID refusals are now hard assertions;
  - TF-03 checks the stored leaving marker and the tagged run-tree row, both cleared on release, plus the leaving member's own reads (the F-3 check);
  - TF-07 checks one warning per run and reason;
  - new TF-11 (Stop while leaving) and TF-12 (restart while leaving).
  Ticket probe: TFU-03 rewritten for the tag; TFU-04 (real Codex approval while leaving), TFU-05 (delegated copy rows) and TFU-06 (Stop while leaving) added.
- Cases rechecked: all TF, TFL, TFU and API-PEER cases, API-REG, API-TC, API-FS (by impact: the round's diff touches the planner, committer, membership, execution manager, router, run-tree, a contracts package and the web rows).
- Commands, environment, fixture, or broader-validation delta: the probe root moved outside `/tmp` and uses real Codex for TFU-04; the server was rebuilt from `2bd8a470bf`.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1: run-ID message to a removed member gets the wrong refusal | Local Fix | Resolved: `COLLABORATION_TARGET_NOT_FOUND` with the exact text, for former and leaving members | TF-02, TF-03, TFL-02 |
| F-2: the app shows no leaving member | Design Impact (SR-010) | Partly resolved. The tag shows on the team's own rows and a copy's rows; Stop and restart leave no leaving row; reopening clears the marker. Opening the row fails: F-3 | TFU-03 (tag), TFU-05, TFU-06, TF-11, TF-12 |
| O-1 / O-2: unusable definitions not logged / not once | Observation | Resolved: one warning per run and reason, again after a new breakage | TF-07 |

- Canonical artifacts and sections updated: execution report (rewritten for round 2), investigation meta, progress log
- Prior result and confidence: Fail, 88%
- Current result and confidence: Fail, 91%
- New or remaining failure IDs: F-3, a "Leaving" row does not open the member. `getTeamMemberRunProjection` and `getTeamMemberFileChanges` refuse a member stored under `formerMembers` (`team-member-run-view-projection-service.ts:128-141`), so its pending approval cannot be answered in the app (TFU-04). Local Fix.
- Recommended owner: code reviewer (failure-origin review), then the implementation engineer
- Remaining risks, blocked evidence, or untested scope: API-NF (configured placement, application run) unit-covered only; FU-004; the release job's signing-record units refuse to run as root.

### API-REV-003 — Round 3: F-3 resolved; Pass on the final source

- Triggering role, report path, and round: code reviewer, CRR-006 (pass of IR-003 `072bdb7217`, IR-004 `6c7af4a384`), round 3
- Triggering finding or case IDs: F-3 (round 2)
- Related revision IDs: IR-003, IR-004, CRR-004, CRR-005, CRR-006
- Why recorded: the rerun after the F-3 fix.
- Coverage decisions or durable test paths changed: TF-02 now asserts that a stopped former member's conversation opens by run ID and that the Memory page attributes it to its own agent definition (commit `44fd8d073a`).
- Cases rechecked, by impact of `8789b97a41..6c7af4a384` (location and projection services):
  - all TF, TFU and TFL cases, API-PEER, API-REG (plus `memory-explorer-graphql` and the `memory` and `run-history` folders), API-TC;
  - API-FS from round 2 still valid: no build input changed.
- Commands, environment, fixture, or broader-validation delta: none, except the added folders.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-3: a Leaving row does not open the member (projection and file changes refuse it) | Local Fix | Resolved: the leaving member's reads open it; its approval is answered in the app; a stopped former member opens by run ID | TF-03, TF-02, TFU-03, TFU-04 |

- Canonical artifacts and sections updated: execution report (rewritten for round 3), investigation meta, progress log, follow-ups (FU-005)
- Prior result and confidence: Fail, 91%
- Current result and confidence: Pass, 95.4%
- New or remaining failure IDs: none in scope. Out of scope: FU-005, `episodic-catalog` EC-04 cannot pass as root (chmod).
- Recommended owner: code reviewer (proportional test-code review of the added suites and RC-51)
- Remaining risks, blocked evidence, or untested scope: API-NF (configured-placement copy, application run) unit-covered only; the release job's signing units are root-limited; macOS/x64 jobs need the runner; FU-003, FU-004, FU-005.
