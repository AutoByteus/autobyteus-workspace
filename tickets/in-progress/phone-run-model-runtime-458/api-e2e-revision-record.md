# API/E2E Revision Record — phone-run-model-runtime-458 (autobyteus-458)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md` IR-001 (direct route), round 1 | SR-006, IR-001 | N/A | Fail (F-1) / 89% |

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
