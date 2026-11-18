# API/E2E Revision Record — one-step-phone-pairing

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, code-review-report.md CRR-001, round 1 | SR-014, ARCH-REV-003, IR-001, CRR-001 | N/A | Fail / 91% |
| API-REV-002 | Code reviewer, code-review-report.md CRR-003 (delta review of IR-002), round 2 | IR-002, CRR-002, CRR-003 | Fail / 91% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: desktop, Docker, remote, Linux, Android and pre-change data; one locale defect

- Triggering role, report path, and round: code reviewer, [code-review-report.md](code-review-report.md), round 1 (head `27b24037dd`, code `55fdae0a34`).
- Triggering finding or case IDs: CR-C07 (stale MSP-09); the handoff's unrun list (AC-004, AC-005, AC-013, AC-014, Linux, `file://`, Serve, QR-004, bridge abuse, camera).
- Related revision IDs: SR-014, ARCH-REV-003, IR-001, CRR-001.
- Why recorded: first API/E2E result.
- Coverage decisions or durable test paths changed: `mobile-shell-probe.mjs` setup, MSP-06, MSP-09 updated (REQ-011, REQ-019, DEC-018, AC-015, AC-016); `TESTING.md` fresh-start rule for the Android build.
- Cases: API-01…API-18 and the QR-001 log check (investigation plus API-17 and API-18 added during execution).
- Commands, environment, fixture, or broader-validation delta: baseline (report's Tested Builds And Environments).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test progress log, follow-ups.md (FU-004, FU-005), evidence `API-05`…`API-18`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 91%
- New or remaining failure IDs: API-17 (phones list dates in the OS locale)
- Recommended owner: implementation engineer (`Local Fix`), after the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: AC-006 after-setup (U-006), Scan with a real camera (API-13), AC-005 on a second physical computer — user checks.

### API-REV-002 — Rerun of API-17 after the locale fix; Pass

- Triggering role, report path, and round: code reviewer, [code-review-report.md](code-review-report.md) CRR-003 (delta review of IR-002), round 2 (fix `c113dae1a7`, head `8ea55b1e6b`).
- Triggering finding or case IDs: API-17 (CR-001).
- Related revision IDs: IR-002, CRR-003.
- Why recorded: rerun after rework.
- Coverage decisions or durable test paths changed: none by API/E2E this round; the implementation added `autobyteus-web/components/settings/phone/__tests__/ConnectedPhones.spec.ts` (reused as API-19 = IMP-11).
- Cases added, changed, removed, or rechecked: API-17 rerun; API-19 added (Reused IMP-11); all other cases still valid by impact (`git diff --name-only 55fdae0a34 8ea55b1e6b` outside `tickets/`: `ConnectedPhones.vue` and its spec, plus round 1's own probe and TESTING.md commits).
- Commands, environment, fixture, or broader-validation delta: fresh isolated packaged instance `iso-57743-8b43` of the head (ENV-5); phones made through the public REST routes; the app language switched to 简体中文 and back.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-17 phones-list dates in the OS locale ("Last seen jetzt", "Revoked 7. Nov.") | Local Fix (implementation), confirmed as CR-001 | Fixed in `c113dae1a7` (`resolvedLocale`); English rows "Last seen 3 minutes ago", "Revoked Nov 7"; zh-CN rows "最近使用 3分钟前", "11月7日 已撤销" on the de_DE host | API-17 (round 2), API-19 |

- Canonical artifacts and sections updated: execution report (Round, Routing, Environments ENV-5, Cases API-17/API-19, Acceptance-Criteria Proof, Scorecard, Cleanup, Result), coverage investigation (meta, Planned Cases), progress log, evidence `API-17-phones-list-locale.txt` (round 2 section).
- Prior result and confidence: `Fail`, 91%
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review of `mobile-shell-probe.mjs` and the `TESTING.md` rule)
- Remaining risks, blocked evidence, or untested scope: user-only: AC-006 after Serve setup (U-006), Scan with a real camera (API-13), AC-005 on his own second computer.
