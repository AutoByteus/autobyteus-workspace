# API/E2E Revision Record — agent-loop-structure-refactor

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, CRR-001 | SR-003; ARCH-REV-001; IR-001; CRR-001 | N/A | Pass / 95.8% |
| API-REV-002 | Code Reviewer, CRR-003 (after delivery DR-001 → IR-002) | IR-002; CRR-003; DR-001 | Pass / 95.8% | Pass / 96% |
| API-REV-003 | Code Reviewer, CRR-006 (IR-003, CND-003) | IR-003; CRR-006; DR-003 | Pass / 96% | Pass / 96% |
| API-REV-004 | Code Reviewer, CRR-008 (after delivery DR-004 → IR-004) | IR-004; CRR-008; DR-004 | Pass / 96% | Pass / 95.7% |

## Revision Entries

### API-REV-001 — Baseline: pure-refactor behavior identity proven (golden + live)

- Triggering role, report path, and round: Code Reviewer pass, `code-review-report.md`, CRR-001
- Triggering finding or case IDs: CND-002 (CCR-E2E-002 variance) to re-check
- Related revision IDs: SR-003; ARCH-REV-001; IR-001; CRR-001
- Why recorded: first API/E2E validation (AC-001, AC-002, AC-003, AC-007)
- Coverage decisions or durable test paths changed: none (no repository test changes)
- Cases: REP-001..006, LIVE-CCR, LIVE-APC, LIVE-OLR, LIVE-OLM, FID-001 (temporary golden fidelity mutation, reverted)
- Commands, environment: `env -i` core runs with `CI=1` golden; live suites via `evidence/run-live.sh` (per-run vaults)

#### Prior Failure Resolution

None.

- Canonical artifacts: investigation, report, ledger (rows 1–11)
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95.8%
- New or remaining failure IDs: none (CCR-E2E-002 passed; variance attributed to model output size, not code)
- Recommended owner: per handoff rules
- Remaining risks: CCR suite fixture sensitivity to live output size (suite owner); providers without a usable key out of scope

### API-REV-002 — Re-entry after the merge Local Fix (IR-002): ported threshold field proven live

- Triggering role, report path, and round: Code Reviewer CRR-003 (Targeted Delta Review), after delivery DR-001 → IR-002; head `b12e8c113`
- Related revision IDs: IR-002; CRR-003; DR-001
- Why recorded: implementation fix requires API/E2E again
- Coverage decisions or durable test paths changed: none by API/E2E (temporary probe removed; golden snapshot re-recorded by implementation, field only)
- Cases: golden, core unit, agent integration, builds, typecheck, server unit, token-usage suites, ALSR-TU-001 live probe, LIVE-OLR

#### Prior Failure Resolution

None.

- Canonical artifacts: investigation (round-2 section), report (round-2 section), ledger (round-2 table)
- Prior result and confidence: Pass / 95.8%
- Current result and confidence: Pass / 96%
- New or remaining failure IDs: none
- Recommended owner: per handoff rules
- Remaining risks: none new; CCR fixture sensitivity (suite owner) unchanged; CND-003 suggestion unchanged

### API-REV-003 — Re-entry after IR-003: exhaustive outcome-switch guard

- Triggering role, report path, and round: Code Reviewer CRR-006 (Targeted Delta Review); head `002207b11`
- Related revision IDs: IR-003; CRR-006; DR-003 (held for user verification)
- Why recorded: implementation change requires API/E2E again
- Coverage decisions or durable test paths changed: none
- Cases: golden, core unit, agent integration, build, server typecheck, GUARD-001 (temporary case removal → TS2322 at the `never` line; reverted)

#### Prior Failure Resolution

None.

- Canonical artifacts: investigation (round-3 section), report (round 3 at top), ledger (round-3 table)
- Prior result and confidence: Pass / 96%
- Current result and confidence: Pass / 96%
- New or remaining failure IDs: none
- Recommended owner: per handoff rules
- Remaining risks: none new; CND-003 now implemented

### API-REV-004 — Re-entry after IR-004: ported per-call output-speed timing proven live

- Triggering role, report path, and round: Code Reviewer CRR-008 (Targeted Delta Review); head `04b879d55`
- Related revision IDs: IR-004; CRR-008; DR-004
- Why recorded: implementation change (merge port) requires API/E2E again
- Coverage decisions or durable test paths changed: none (temporary TPS probe removed; golden re-recorded by implementation)
- Cases: golden, core unit, agent integration, build, server typecheck, TPS probe TPS-001..005 (run 1 environment-limited by Anthropic credit; run 2 Pass 5/5)

#### Prior Failure Resolution

None.

- Prior result and confidence: Pass / 96%
- Current result and confidence: Pass / 95.7% (environment fidelity 94: Anthropic account out of credit)
- New or remaining failure IDs: none
- Remaining risks: CND-004 (golden `method` timing dependence, not observed); Anthropic live evidence needs account credit if required later

