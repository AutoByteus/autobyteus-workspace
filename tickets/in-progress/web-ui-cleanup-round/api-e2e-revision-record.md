# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Fail / 90% |

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
