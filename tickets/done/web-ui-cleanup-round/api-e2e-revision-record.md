# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Fail / 90% |
| API-REV-002 | Implementation Engineer, IR-002 (CRR-001 Local Fix), round 2 | IR-002, CRR-001 | Fail / 90% | Fail (build) |
| API-REV-003 | Implementation Engineer, IR-003 (CRR-002 Local Fix), round 3 | IR-003, CRR-002 | Fail (build) | Pass / 95% |

## Revision Entries

### API-REV-001: Baseline. Everything passes in the app except runtime kinds in the Application launch setup summary

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001), round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first completed validation result
- Coverage decisions or durable test paths changed: `delegated-launch-defaults-probe.mjs` (expectations through `agentRuntimeName`, `bacc8f51fd`); `system-instruction-activity-probe.mjs` (baseline fix, `a26305a2a7`)
- Cases: API-01…08 reused; API-09…11 probes; API-12 desktop journey (Fail on one finding)
- Commands, environment, fixture, or broader-validation delta: server dist rebuilt; isolated instance with the voice extension; microphone emulated in the renderer

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution report, `follow-ups.md` (FU-001)
- Prior result and confidence: N/A
- Current result and confidence: Fail, 90%
- New or remaining failure IDs: API-12 finding (AC-003, `ApplicationExecutionResourceSlotEditor.vue:52,64,88`)
- Recommended owner: Code Reviewer (failure-origin review), then the implementation engineer
- Remaining risks, blocked evidence, or untested scope: Qwen configured state, Migrations Run, Token Statistics names and the Embedding/skill-update cards were checked by component tests only; real microphone optional for the user

### API-REV-002: Round 2. The fix fails the desktop build's typecheck

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-002 (CRR-001 FO-001/FO-002), round 2
- Triggering finding or case IDs: FO-001, FO-002
- Related revision IDs: IR-002, CRR-001
- Why this revision was recorded: rerun by impact after the fix
- Coverage decisions or durable test paths changed: none
- Cases added, changed, removed, or rechecked: API-09 rerun (Pass); API-12 rerun stopped at the build (`BUILD_FAILED`, 2 production type errors)
- Commands, environment, fixture, or broader-validation delta: server dist rebuilt on `de7482b46f`

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-12 round 1 (runtime kinds in the launch setup summary) | Local Fix (confirmed by CRR-001 as FO-001; FO-002 added) | Fixed in source, but the fix does not build (`ApplicationExecutionResourceSlotEditor.vue:52,64`, `string \| null`), so not yet verified in the app | — (pending) |

- Canonical artifacts and sections updated: execution report (Round, Cases, Acceptance-Criteria Proof, Preliminary Classification, Result)
- Prior result and confidence: Fail, 90%
- Current result and confidence: Fail (build blocked)
- New or remaining failure IDs: API-12 (r2) build typecheck
- Recommended owner: Code Reviewer (failure-origin review), then the implementation engineer
- Remaining risks, blocked evidence, or untested scope: the fixed views, the token-usage Runtime row and a launch-setup issue text await a building fix

### API-REV-003: Round 3. The fix builds; the affected views show full names

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` IR-003 (CRR-002 FO-003), round 3
- Triggering finding or case IDs: FO-003 (and the pending FO-001/FO-002 verification)
- Related revision IDs: IR-003, CRR-002
- Why this revision was recorded: rerun after the fix
- Coverage decisions or durable test paths changed: none
- Cases added, changed, removed, or rechecked: API-12 (r3): desktop build plus the affected views; API-09 (r2) stays valid (no server change since `1a4bfd2ae9`)
- Commands, environment, fixture, or broader-validation delta: isolated instance `iso-52555-8e2c`; a retired-model override (removed); one local LM Studio turn

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-12 round 1 (runtime kinds in the launch setup summary; agent detail) | Local Fix (CRR-001 FO-001, FO-002) | Fixed (IR-002, IR-003); names shown in the app | API-12 (r3) |
| API-12 (r2) (the desktop build's typecheck) | Local Fix (CRR-002 FO-003) | Fixed (IR-003); build passes with 0 production errors | API-12 (r3) |

- Canonical artifacts and sections updated: execution report (Round, Routing, Cases, Acceptance-Criteria Proof, Scorecard, Classification, Result)
- Prior result and confidence: Fail (build)
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: delivery
- Remaining risks, blocked evidence, or untested scope: AC-007/AC-009 at component level; FU-001, FU-002
