# API/E2E Revision Record — phone-run-model-runtime-458 (autobyteus-458)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001 (direct route), round 1 | SR-006, IR-001 | N/A | Fail (F-1) / 89% |
| API-REV-002 | Implementation Engineer, `implementation-handoff.md` IR-002 (CR-001 from `code-review-report.md` CRR-001), round 2 | CRR-001, IR-002, API-REV-001 | Fail (F-1) / 89% | Pass / 94% |

## Revision Entries

### API-REV-001 — Baseline: the full phone probe, the Android app (Team, agents, Org members, Text size across a restart, a "not offered" refusal), the desktop Team stop and composer

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-001, round 1; code `ec5b81f912`
- Triggering finding or case IDs: the handoff's "Not run, left to you": the full phone probe, the emulator journey (AC-004, AC-006), an Org member's Settings, AC-005 "model not offered", the desktop Team stop
- Related revision IDs: SR-006, IR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: `mobile-code-wrap-cases.mjs` (`cdb3ad0025`, baseline test fix), `mobile-shell-probe.mjs` MSP-08 (`1054deb132`), `mobile-run-settings-cases.mjs` MSP-65 (new, reproduces F-1)
- Cases added, changed, removed, or rechecked: R-IMP, API-01…05; MSP-65
- Commands, environment, fixture, or broader-validation delta: own AVD and the branch's APK; a host node with scripted runtimes restarted without a model; a `pnpm dev` desktop window

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, execution report, test progress log, `follow-ups.md` (FU-002, FU-003), evidence
- Prior result and confidence: N/A
- Current result and confidence: Fail, 89%
- New or remaining failure IDs: F-1
- Recommended owner: Code Reviewer (failure-origin review)

### API-REV-002 — F-1 rechecked: the Org stop on the phone keeps Settings; the full probe; the desktop Org Settings stop preserved

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-002 (CR-001, `code-review-report.md` CRR-001), round 2; code `6ddf9bb8f5`, documents `1b53150c63`
- Triggering finding or case IDs: F-1 (API-03, MSP-65); CRR-001's rerun list (MSP-65, MSP-59…64, the Org stop in the app, the full probe, the desktop Org-member Settings stop)
- Related revision IDs: CRR-001, IR-002, API-REV-001
- Why this revision was recorded: rerun after the fix
- Coverage decisions or durable test paths changed: none this round
- Cases added, changed, removed, or rechecked: rechecked API-01 (full probe; MSP-53…55, 32 separately), API-03 (working Org direct agent, idle Org Team member), API-05 (desktop Org Settings stop, new script `desktop-org-stop.mjs`); reused R-IMP (IR-002 checks); API-02, API-04 and API-05's Team and composer cases still valid (the fix touches only the Org stop's route write)
- Commands, environment, fixture, or broader-validation delta: the same AVD, APK and node script; round 2's last emulator boot with `-gpu host` (host load); MSP-41 investigated with 14 runs (base sources vs this branch)

#### Prior Failure Resolution

| Failure ID | Cause | Fix | Rechecked By | Result |
| --- | --- | --- | --- | --- |
| F-1 | the shared Org stop wrote `/workspace` whatever the shell; the phone gate turned it into "Unsupported on phone" | `6ddf9bb8f5`: the write runs off the phone shell only; phone Settings passes `shell: 'mobile'` | API-03 (planner working, reviewer idle: the phone stays at `screen=settings`, rows open, Save works), MSP-65 Pass (full run), API-05 desktop still writes `mode=history` | Resolved |

- Canonical artifacts and sections updated: execution report (rewritten on the updated template), test progress log, `follow-ups.md` (FU-003 evidence), evidence `r2-*`
- Prior result and confidence: Fail, 89%
- Current result and confidence: Pass, 94%
- New or remaining failure IDs: none in scope
- Recommended owner: Code Reviewer (the test-code review CRR-001 requested)
