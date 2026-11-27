# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/team-stream-recovery-541/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/team-stream-recovery-541/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/team-stream-recovery-541/api-e2e-test-progress.md`
- Round and trigger: round 1; code review Pass (CRR-001) of IR-001; code head `9e508b3adf`, review docs `bfd6ab97b5`
- Prior round reviewed: none
- Deviations from the plan: API-016 (C-2) found that its own click-time assertion was wrong (a run-tree click joins the recovery); its result is read from the after-commit state, and it became the durable SDD-17. To close the confidence gap, API-016b drove C-2's other path (an in-app execution link during the hydration) and reproduced it; it became the durable SDD-16. A first try with browser Back was a harness artifact (Back left the app: member selection adds no history entry). API-017 (C-1) was not run: the web UI has no unarchive (below).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541/tickets/in-progress/team-stream-recovery-541/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (this round is a `Fail`: failure-origin review)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `bfd6ab97b5` (code `9e508b3adf`) | macOS arm64, Node 22 | worktree web and server suites | `env -i PATH HOME TMPDIR=/tmp/api541/tmp`; machine load 46–92 from other work |
| ENV-2 | same, plus my probe edits | macOS arm64, headless Chrome | `send-delivery-probe.mjs`: the worktree's built node on a temp data root, scripted AGY CLI, `nuxt dev`, the probe wire | desktop 1440×1000 |
| ENV-3 | same | macOS arm64, headless Chrome | `mobile-shell-probe.mjs`: probe nodes, the phone bundle (`build:mobile-web`) at `/mobile`, the phone wire | 390×844 |
| ENV-4 | base `80420a8bf6` with the branch's probe files (`send-delivery-probe.mjs`, `fixtures/stop-generation-wire.mjs`, `fixtures/team-stream-gap.mjs`, `fixtures/runtime-error-transport.page.vue`) | macOS arm64 | fresh `--no-local` clone `/tmp/api541/base`, frozen install, SDK `dist`, server build | as ENV-2 |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | AC-003, 005, 006, 007, 008, 010 | whole web suite | `pnpm -C autobyteus-web test:nuxt` | ENV-1 | Pass (1 base failure, FU-001) | `API-001-002-suites/web-suite.txt` | `817 passed`, `6369 passed`; the one failure `app-font-size-fixed-px-audit` flags `NodeRow.vue … text-[11px] @ line 39` | the base has the same class (from `aba07b35e3`, autobyteus-581); this branch touches neither file: FU-001 |
| API-002 | AC-008 | server unit suite | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-001-002-suites/server-unit.txt` | `1099 passed`, `5 skipped` | includes the new `team-tool-approval-command-handler.test.ts` |
| API-003 | AC-008 | file sizes, old name | `wc -l` the two Org files; `git grep agentOrgConnectionLostError` | ENV-1 | Pass | (this row) | `482 … agentOrgContextsStore.ts`, `446 … agentOrgStreamingService.ts`; the grep finds nothing | |
| API-010 | AC-001 (desktop) | Team view | `node autobyteus-web/tests/e2e/send-delivery-probe.mjs --cases SDD-13,SDD-07,SDD-12,SDD-09,SDD-14,SDD-15,SDD-91 --output-dir <dir>` | ENV-2 | Pass | `API-010-016-desktop/sdd-branch-cases.json` (`SDD-14`), `SDD-14-team-recovered.png` | `"withheld": {"type": "TURN_COMPLETED", "seq": 34}`, `"recoveredAfterMs": 46`, `"gapSeen": true`, `"failedAttempts": 0`; lead `Idle`, the message shown, no notice; the next send on the replacement link and answered | |
| API-011 | AC-001 (phone) | phone run screen | `node autobyteus-web/tests/e2e/mobile-shell-probe.mjs --cases=MSP-119,MSP-120 --output-dir=<dir>` | ENV-3 | Pass | `API-011-013-phone/msp-cases.json`, `MSP-119-team-recovered.png` | `"recoveredAfterMs": 354`, `"failedAttempts": 0` | |
| API-012 | AC-002 (desktop), REQ-002 | Team view | as API-010 (SDD-15, with my new assertion) | ENV-2 | Pass | `sdd-branch-cases.json` (`SDD-15`), `SDD-15-team-recovery-exhausted.png` | send `noticeAfterMs` `10028` → text (a), the text back; `"failuresAtNotice": 5`, `"noticeAfterGapMs": 15065`; `"shownStatus": "Idle"` and the send's view `Idle` throughout; after the reads pass `"recoveredAfterMs": 31044`, the notice gone | screenshot: the localized notice, the member Idle, the not-sent notice with the text in the box |
| API-013 | AC-002 (phone), REQ-002 | phone run screen | MSP-120 (with my new assertion), rerun alone `--cases=MSP-120` | ENV-3 | Pass (×2) | `API-011-013-phone/msp-cases.json`, `msp120-cases.json`, `MSP-120-team-recovery-exhausted.png` | `"noticeAfterMs": 10050`, `"failuresAtNotice": 5`, `"noticeAfterGapMs": 15102`, subtitle `"Idle · in Delivery Team"` during the recovery, recovered at `31089` ms | |
| API-014 | AC-004 (old vs new) | Team member and standalone run | SDD-13, 07, 12, 09 (+ SDD-14) on the branch (ENV-2) and the base (ENV-4) | ENV-2, ENV-4 | Pass (branch Pass; base Fail as required) | `API-010-016-desktop/sdd-branch-cases.json`, `API-014-base/sdd-base-cases.json` | branch: SDD-13, SDD-12 `"timeline": [[0, "Idle"]]`, `"sendDisabledAt": null`; SDD-09 and SDD-07 `"sendAfterNotice": {"label": "Send message", "enabled": true}`, `noticeAfterMs` `10023` / `10040`. Base: SDD-13 `[3299, "Initializing"]`, SDD-12 `[3895, "Initializing"]`, `sendDisabledAt` 3302 / 3898; SDD-09 Initializing at 202 ms; SDD-07 `"sendAfterNotice": {… "enabled": false}`; SDD-14 `Timed out: the page's replacement Team stream snapshot` | |
| API-015 | AC-009 | the wire | `node wire-order-stress.mjs <wire>` on the base and branch wire; `node autobyteus-web/tests/e2e/stop-generation-probe.mjs --cases SGD-06 --latency-ms 150` ×10 | ENV-1, ENV-2 | Pass | `API-015-wire/wire-prototype.txt`, `sgd06-x10.json` | base `548 out-of-order deliveries in 8000 frames`, branch `0 out-of-order`; SGD-06 ten runs `Pass`, `changeSequenceGapLines: 0` each | |
| API-016 | CRR-001 C-2 (held), AC-003 | Team view | temporary SDD-91, then the durable SDD-17 (copy `API-010-016-desktop/send-delivery-probe.with-SDD-91.mjs.txt`; removed from the probe after the run): the recovery's checkpoint read held 2.5 s; during it, the user clicks the other member's run-tree row | ENV-2 | Pass (C-2 does not occur on this path) | `sdd-branch-cases.json` (`SDD-91`), `SDD-91-member-switch-during-recovery.png` | after the click `mate` not yet selected (the click joined the recovery, AC-003); after the commit `"rows": {"lead": null, "mate": "true"}`, header `mate`: the member the user chose, not the earlier one | the case's own click-time assertion was wrong (it expected an immediate selection); the result is the after-commit state. Read, not run: the routes that focus a member directly (`openWorkspaceExecutionLink` → `inspectTeamMember`: route back/forward, project Task links) do not join the recovery, so C-2 can still occur there within the 100–500 ms hydration |
| API-016b | CRR-001 C-2 (held), REQ-001 ("a user's reselect during a recovery joins it") | Team view | durable SDD-16 (`send-delivery-probe.mjs --cases SDD-16,SDD-17`): the recovery's checkpoint read held 2.5 s (to widen its 100–500 ms window); during it, an in-app router push to the mate's execution route (`/workspace?workspaceExecutionKind=team&workspaceExecutionRunId=…&workspaceExecutionAgentRunId=<mate>`, what a Project Task's link pushes) | ENV-2 | **Fail** (reproduced ×2) | `API-010-016-desktop/sdd-16-17-cases.json`, `SDD-16-link-during-recovery.png`; the first reproduction in `send-delivery-probe.with-SDD-92.mjs.txt`; the Back attempt `sdd-92-back-harness-artifact.json` | after the link `"rows": {"lead": null, "mate": "true"}`, header `mate`; after the commit `"rows": {"lead": "true", "mate": null}`, header `lead`; `"failedAttempts": 0` | see Preliminary Classification |
| API-017 | CRR-001 C-1 (held) | — | — | — | Not Tested | — | — | the web UI has no unarchive (no control in `components/runList` or `components/workspace/history`); an archived Team reopened in the same page session needs another client to restore it. The reviewer's hardening (end with `disconnectTeamStream` when the context is gone) stays a code choice |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result | Notes |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-010, API-011, API-001 | Proven | desktop 46 ms, phone 354 ms after the gap, 0 failed attempts; the node's status; a send right after on the new stream |
| AC-002 | Yes | API-012, API-013, API-001 | Proven | send 10 s → text (a); notice at the 5th failure (~15 s); members keep their status; recovered once reads pass, notice gone; desktop and phone |
| AC-003 | Yes | API-001 (spec), API-016 (SDD-17) | Proven | a run-tree reselect during a recovery joins it and ends on the chosen member |
| AC-004 | Yes | API-014 | Proven | fails on the base, passes on the branch, Team member and standalone run |
| AC-005 | Yes | API-001 (spec) | Proven (spec) | no deterministic browser path (handoff); the decision table spec covers it |
| AC-006 | Yes | API-001 (spec) | Proven (spec) | as its Verification column |
| AC-007 | No | API-001 (spec) | Proven | |
| AC-008 | No | API-001, API-002, API-003 | Proven | the web suite's one failure is the base's (FU-001) |
| AC-009 | Yes | API-015 | Proven | |
| AC-010 | Yes | API-001 (specs, the AR-001 walks), API-016b | **Not Proven** | the specs' walks hold, and SDD-15 keeps a draft and a not-sent notice across a recovery; but a member switch made by an in-app execution link during the hydration is undone at the commit (API-016b): "on the member the user sees" does not hold on that path |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Support | Residual Uncertainty | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 85% | every other AC proven; AC-004 old vs new | AC-010 / REQ-001 on the in-app link path (API-016b) | the fix, then SDD-16 |
| Changed-boundary execution directness | 80% | 95% | real node, real browser, desktop and phone | | |
| Cross-boundary integration realism and mock gap | 75% | 95% | a real lost frame; reads refused or held at the browser | | |
| Environment, configuration, identity, fixture fidelity | 85% | 95% | ENV-1…4 | | |
| Failure, edge-case, lifecycle, recovery evidence | 80% | 85% | five failures and recovery; both C-2 paths run | C-2 reproduced; C-1 not reachable in one session through the UI | the fix |
| User-surface, browser, desktop-shell | 80% | 90% | screenshots, both surfaces | the focus jump on the link path | the fix |
| Durable regression coverage quality | 85% | 95% | SDD-12…17, MSP-119/120; the wire | | |

- Overall post-repository confidence: 81%
- Overall final confidence: 91% (round result `Fail`)
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `No` (AC-010 on the in-app link path)
- Any final applicable category below `90%`: `Yes`: requirement proof 85%, failure evidence 85%
- Default final confidence target of `95%` met: `No`

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (desktop and phone)
- Gap: real stream timing, a real lost frame, the cadence, the notice, the send's wait, old vs new.

## Compatibility / Legacy Scope Check

- Compatibility in scope: `No`; observed: `No` (the dead coordinator and branch are removed).

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/send-delivery-probe.mjs` SDD-15 | Updated | API-012 | asserts the member keeps its last status during the recovery (REQ-002) |
| `autobyteus-web/tests/e2e/mobile-team-stream-recovery-cases.mjs` MSP-120 | Updated | API-013 | the same assertion on the phone |
| `autobyteus-web/tests/e2e/send-delivery-probe.mjs` SDD-16 | Added | API-016b | an in-app execution link to another member during a recovery's hydration: that member stays focused after the commit. **Fails on `9e508b3adf`** (C-2's reproduction); the fix turns it green |
| `autobyteus-web/tests/e2e/send-delivery-probe.mjs` SDD-17 | Added | API-016 | a run-tree reselect during the hydration joins the recovery and ends on the chosen member (AC-003 in a browser) |
| (implementation's, reviewed and kept) `fixtures/stop-generation-wire.mjs`, `fixtures/team-stream-gap.mjs`, `send-delivery-probe.mjs` SDD-07/09/12/13/14/15, `mobile-team-stream-recovery-cases.mjs`, `mobile-shell-probe.mjs` registration | Added / Updated | API-010…015 | |

- Paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| A lost frame | the probe wire withholds one numbered frame | a real network loss is not reproducible on demand | the loss is at the page's edge, as a lost frame would be |
| The node unreachable for the recovery's reads | Playwright aborts `GetTeamRunExecutionCheckpoint` | to fail the reads only | other requests pass |
| Agent runtime | scripted AGY CLI | no provider needed | none |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks (desktop ×2 incl. base, phone ×2, SGD-06 ×10) | Yes | each probe's `finally` | receipts: backend/frontend stopped, data roots removed |
| Temporary SDD-91 and SDD-92 | Yes | the probe restored from my backups; the cases' lasting forms are SDD-16 and SDD-17 | `grep -c 'SDD-9[12]\|TEMPORARY' send-delivery-probe.mjs` → 0 |
| Base clone `/tmp/api541/base`, `/tmp/api541` | Yes | removed when the Solution Designer asks | kept |

## Preliminary Classification (On `Fail`)

**F-1 — CRR-001 C-2 reproduced: a member switch by an in-app execution link during an automatic recovery's hydration is undone at the commit. `Local Fix` (implementation).**

- Observed (Reproduced ×2, ENV-2; durable SDD-16): with the recovery's checkpoint read held 2.5 s, an in-app router push to the mate's execution route focused mate at once (run-tree row current, header `mate`); when the recovery committed, focus returned to lead (`lead` current, header `lead`). The recovery itself succeeded at its first attempt.
- Cause (Read, consistent with the run): `runTeamStreamRecovery` (`teamRunOpenCoordinator.ts:110-123`) takes `preferredAgentRunId` from the focus when the attempt begins and focuses it on the candidate context; `openWorkspaceExecutionLink` → `inspectTeamMember` (`workspaceNavigationService.ts:138-143`, `teamMemberInspectionCoordinator.ts`) focuses the member directly on the current context without joining the recovery, unlike the run-tree selection (`runHistorySelectionActions.ts:81-82, 122`), which joins it (SDD-17 passes).
- Requirements: REQ-001 "a user's reselect during a recovery joins it"; AC-010 "… on the member the user sees". 
- Real trigger: an in-app execution link to a Team member (a Project Task's link, `useTaskRootNavigation`; route selection, `useWorkspaceRouteSelection`) while the Team's automatic recovery hydrates; without my hold that window is about 100–500 ms per attempt, so it is rare, and nothing is lost (D-A6 carries per member); the user's navigation is undone.
- Fix hint (the reviewer's): re-read the current context's focus in `beforeContextCommit`, or have the link path join a running recovery as the run-tree path does. SDD-16 turns green.
- If the failure-origin review judges this acceptable for now, SDD-16 can stay as the follow-up's reproduction.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-010 on the in-app link path (REQ-001's "joins it")
- Evidence decisions requested: `None`
- Preliminary classification and recommended owner: F-1 `Local Fix` → implementation (via failure-origin review)
- Next recipient from `get_handoff_rules`: `/code_reviewer` (failure-origin review)
- Notes: everything else passes on desktop and phone (AC-001…009 and AC-010's specs); AC-004 fails on the base as required; C-1 not reachable in one session through the UI; FU-001 (the base's font audit failure).
