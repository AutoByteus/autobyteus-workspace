# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/team-stream-recovery-541/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/team-stream-recovery-541/api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `tickets/in-progress/team-stream-recovery-541/api-e2e-test-progress.md`
- Round and trigger: round 2; IR-002 (CR-001 from CRR-002, the fix `376b4bb9c0`), delta review CRR-003 Pass (`1727ea8336`). Round 1: IR-001 at `9e508b3adf` (API-REV-001, Fail on F-1).
- Prior round reviewed: round 1. Changed since: `teamRunOpenCoordinator.ts` (the recovery keeps the member focused at the commit), its spec, a stale mock removed. Round 2 reran the whole web suite, every desktop case of the recovery path (SDD-13, 07, 12, 09, 14, 15, 16, 17) and the phone cases (MSP-119, 120) (API-018). Round 1's API-002 (server), API-003, API-014's base half and API-015 stand: their code did not change.
- Deviations from the plan: API-016 (C-2) found that its own click-time assertion was wrong (a run-tree click joins the recovery); its result is read from the after-commit state, and it became the durable SDD-17. To close the confidence gap, API-016b drove C-2's other path (an in-app execution link during the hydration) and reproduced it; it became the durable SDD-16. A first try with browser Back was a harness artifact (Back left the app: member selection adds no history entry). API-017 (C-1) was not run: the web UI has no unarchive (below).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541/tickets/in-progress/team-stream-recovery-541/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
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
| API-018 | AC-001, 002, 003, 004, 010; F-1 | round 2 rerun | the whole web suite; `send-delivery-probe.mjs --cases SDD-13,SDD-07,SDD-12,SDD-09,SDD-14,SDD-15,SDD-93,SDD-16,SDD-17` (SDD-93 temporary); `mobile-shell-probe.mjs --cases=MSP-119,MSP-120` (phone bundle rebuilt) | ENV-1…3 | Pass (SDD-93: the held residual, measured) | `API-018-round2/web-suite-r2.txt`, `sdd-r2-cases.json`, `msp-r2-cases.json`, `SDD-16-link-during-recovery.png`, `SDD-17-reselect-during-recovery.png`, `SDD-93-link-loading-at-commit.png`, `send-delivery-probe.with-SDD-93.mjs.txt` | web `817 passed`, `6372 passed` (the one failure FU-001); SDD-16 and SDD-17 Pass (mate focused after the commit, header and row); SDD-14 Pass; SDD-15 Pass; AC-004 four Pass; MSP-119 `"recoveredAfterMs": 27`; MSP-120 notice at `15041`, send `10053`, subtitle `Idle · in Delivery Team`; SDD-93: `"commitDuringHold": true`, afterwards lead focused, `Failed to open workspace execution link: Error: Team context '…' changed before selection commit.` | SDD-93 measures the residual CRR-003 holds (a link whose member is still loading when the commit lands is rejected): FU-002; the probe restored after it |
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
| AC-010 | Yes | API-001 (specs, the AR-001 walks), API-016b, API-018 | Proven | the specs' walks hold; SDD-15 keeps a draft and a not-sent notice across a recovery; a member switch by an in-app link (SDD-16) or the run tree (SDD-17) during the hydration lands on the chosen member (round 2). Residual (FU-002, held in CRR-003): a link whose member is still loading when the commit lands is rejected and the earlier member stays |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Support | Residual Uncertainty | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | every AC proven; AC-004 old vs new; F-1 fixed | the residual race FU-002 (held) | |
| Changed-boundary execution directness | 80% | 95% | real node, real browser, desktop and phone | | |
| Cross-boundary integration realism and mock gap | 75% | 95% | a real lost frame; reads refused or held at the browser | | |
| Environment, configuration, identity, fixture fidelity | 85% | 95% | ENV-1…4 | | |
| Failure, edge-case, lifecycle, recovery evidence | 80% | 90% | five failures and recovery; both focus paths during a recovery; the residual measured | FU-002 (a link loading at the commit); C-1 not reachable through the UI in one session | the FU-002 change |
| User-surface, browser, desktop-shell | 80% | 95% | screenshots, both surfaces | | |
| Durable regression coverage quality | 85% | 95% | SDD-12…17, MSP-119/120; the wire | | |

- Overall post-repository confidence: 81%
- Overall final confidence: 94%
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94%): the gap is FU-002, which the code reviewer holds as a residual (CRR-003) and which I measured in a browser (SDD-93); closing it is a code change, not more evidence

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
| `autobyteus-web/tests/e2e/send-delivery-probe.mjs` SDD-16 | Added | API-016b, API-018 | an in-app execution link to another member during a recovery's hydration: that member stays focused after the commit. Failed on `9e508b3adf` (C-2's reproduction), passes on `376b4bb9c0` |
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
| Temporary SDD-91, SDD-92, SDD-93 | Yes | the probe restored from my backups; SDD-91/92's lasting forms are SDD-16 and SDD-17; SDD-93 kept as evidence (FU-002) | `grep -c 'SDD-9[123]\|TEMPORARY' send-delivery-probe.mjs` → 0; the probe equals its committed state |
| Base clone `/tmp/api541/base`, `/tmp/api541` | Yes | removed when the Solution Designer asks | kept |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, user-only or accepted risk: `None`
- Evidence decisions requested: `None`
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Large / High: proportional test-code review of `488e231641`'s cases)
- Notes:
  - Round 1's F-1 (C-2) is fixed (`376b4bb9c0`): SDD-16 and SDD-17 pass.
  - Residual, measured: a link whose member is still loading when the recovery commits is rejected ("changed before selection commit", a console error) and the earlier member stays (SDD-93, FU-002). CRR-003 holds it; if the reviewer now judges it a fix, it routes back.
  - C-1 not reachable in one session through the UI; FU-001 (the base's font audit failure).
