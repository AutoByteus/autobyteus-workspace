# Code Review Revision Record: follow-ups-of-461-500 (autobyteus-500)

| CRR | Report | Entry point / trigger | Prior result | Result | Findings |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (Full Review) / IR-001 | N/A | Fail: Local Fix | CR-500-001, CR-500-002 new |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (Targeted Delta) / IR-002 | Fail (CRR-001) | Pass | CR-500-001, CR-500-002 resolved |
| CRR-003 | `code-review-report.md` | API/E2E failure-origin review / API-REV-001 | Pass (CRR-002) | Fail: Design Impact ×2 + Local Fix | CR-500-003 … -005 new |
| CRR-004 | `code-review-report.md` | Implementation Review, round 3 (Targeted Delta) / IR-003 (SR-015, SR-016) | Fail (CRR-003) | Pass | CR-500-003 … -005 resolved |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-002 (c0770ea7b0, a7e76ca248) | Pass (CRR-004) | Fail: Local Fix (API/E2E) | CR-500-006 new |
| CRR-006 | `api-e2e-test-review-report.md` | Proportional test-code recheck / CR-500-006 fix (73bfba186c) | Fail (CRR-005) | Pass | CR-500-006 resolved |

### CRR-001: Implementation review of IR-001: Fail, Local Fix

- Review entry point and round: implementation review, round 1
- Review scope: Full Review of `9695d310c5..941355e258` (466 non-ticket files)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-006 … SR-014
- Relevant architecture-review revision IDs: ARCH-REV-003, -005, -006, -007
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail, Local Fix
- What changed in the review result and why:
  - Every step matches the design:
    - FU-036 (one attach function for the four streams);
    - FU-011 / FU-018 (owners passed in by both hosts; the studio's late binding throws if used early);
    - FU-013;
    - FU-020 (a clean removal, and a migration with a backup per file, retry-safe);
    - FU-030;
    - G-1, G-2 and G-5 (bounded at 8 s; an unreadable list starts as today);
    - FU-021 (labels only).
  - Two local findings:
    - the N3 "copy" rename is incomplete in server code (AC-001);
    - a stale doc line describes a removed fallback.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: CR-500-001, CR-500-002
- Material score or classification changes: initial scorecard, 9.3 overall. Naming 8.8 and Cleanup 9.1 are below the 9.2 bar.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - FU-035 is IR-002;
  - AC-005's Linux proof is API/E2E's;
  - the first start runs two scans (C-6);
  - delivery confirms beta.8 shipped no migration (G-1's record).

### CRR-002: Targeted delta review of IR-002: Pass

- Review entry point and round: implementation review, round 2
- Review scope: Targeted Delta, `941355e258..cc8dbce099`. The code is `7eb6f94b9f` only: 23 server files, renames and one doc line.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002); CR-500-001, CR-500-002
- Relevant solution revision IDs: SR-014 (unchanged)
- Relevant architecture-review revision IDs: ARCH-REV-007 (unchanged)
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The N3 identifiers are renamed. The internal `copy` field is now `delegatedRun`, with no change to the wire or storage.
  - The completion grep finds no identifier; the remaining comment wording is recorded as FU-500-08.
  - The stale doc line is removed.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution:

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-500-001 | Resolved | `7eb6f94b9f`; the completion grep finds no identifier |
| CR-500-002 | Resolved | `agent-run-command-coordinator.ts:44-53` |

- New or remaining finding IDs: none
- Material score or classification changes: Naming 8.8 → 9.4 and Cleanup 9.1 → 9.4; overall 9.4
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - FU-035 comes as IR-003, with its own review.
  - AC-005's Linux proof is API/E2E's.
  - C-6: two scans on the first start.
  - Delivery confirms beta.8 shipped no migration.

### CRR-003: Failure-origin review of API-REV-001: Fail (Design Impact ×2, Local Fix)

- Review entry point and round: API/E2E failure-origin review (API round 1)
- Review scope: F-1 (E-002), F-2 (inherited-layer DLP-005), F-3 (SCP-E2E-006) on `cc8dbce099`
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001)
- Relevant solution revision IDs: SR-011 / SR-012 (G-5), SR-006 (FU-030)
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: Fail
- What changed in the review result and why:
  - **F-3:** G-5 reads `LLMFactory.listAvailableModels()` for the AutoByteus runtime without the on-demand load of a dynamic provider's catalog that the start path does (`ensureModelAvailable`). So after a restart, every Ollama, LM Studio or custom-provider run is refused. API/E2E's "no error frame" is corrected: the `RUN_MODEL_NOT_OFFERED` frame is in `scp006-diag2.log`.
  - **F-1:** G-5 answers before the missing-definition refusal (`restoreStarted`), so a retired agent's run gets a repair that can't help.
  - **F-2:** FU-030 dropped the inherited-layer refusal's next step, and its test was rewritten to a text that path can't give.
- Supported product scenario / material-premise basis changes: CRR-001's C-7 (rejected on "today that start fails anyway") is reclassified. The start works at base through on-demand loading, so it is a supported normal scenario and is promoted as CR-500-003. That is my review gap.
- Prior finding resolution: N/A (CR-500-001 and -002 stay resolved)
- New or remaining finding IDs:
  - CR-500-003 (G-5's AutoByteus availability source);
  - CR-500-004 (G-5's order against a missing definition);
  - CR-500-005 (the inherited-layer next step, and its test).
- Material score or classification changes: Runtime Correctness falls below 9.2 until G-5 is revised
- Recommended recipient: `/solution_designer` (Design Impact). CR-500-005 rides with the revised package to implementation.
- Remaining risks or uncertainty: whether other G-5 readers (the web's per-member note) share the same AutoByteus source and so show a false note after a restart. The revision should cover the note too.

### CRR-004: Review of IR-003 (the G-5 revision): Pass

- Review entry point and round: implementation review, round 3
- Review scope: Targeted Delta, `cc8dbce099..c22af3b892` (code `7eb78a701b`: G-5's owners and the inherited-layer refusal)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-003); CR-500-003 … -005
- Relevant solution revision IDs: SR-015, SR-016
- Relevant architecture-review revision IDs: ARCH-REV-008, ARCH-REV-009
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why:
  - G-5 loads an on-demand AutoByteus provider the way a start does, within the 8 s race. A provider that couldn't be read starts as before.
  - It speaks only for an existing agent, on both paths.
  - The inherited-layer refusal has its own next step, and its test was corrected.
- Supported product scenario / material-premise basis changes: none beyond CRR-003
- Prior finding resolution:

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-500-003 | Resolved | `loadOnDemandModel`; `storedModelOffer` / `listOptions`; `on-demand-stored-model.test.ts` (14 cases) |
| CR-500-004 | Resolved | `storedModelStartRefusal` definition first; both hosts' `storedModelChecks` |
| CR-500-005 | Resolved | `inheritedLayerRefusal`; resolver test, DLP-005 e2e (IMP-015), probe |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness back to 9.4; overall 9.4
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - `team-stream-clients-wait-for-connected` flags API/E2E's own early-send e2e (test-side);
  - FU-035 comes in a later round.

### CRR-005: Proportional test-code review after API-REV-002: Fail, Local Fix (API/E2E)

- Review entry point and round: successful API/E2E test-code review (rounds 1 and 2)
- Review scope: `c0770ea7b0`, `a7e76ca248`
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-002)
- Relevant solution revision IDs: SR-015, SR-016
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-004)
- Current authoritative result: Fail, Local Fix (API/E2E-owned)
- What changed in the review result and why:
  - The new and updated tests are sound: RSE-1 asserts exactly one answer; ALM-1 asserts byte identity and backups; the static check's exemption is named and self-checking; the stale tests follow the change.
  - One gap: ODM-1's host-down and retired-member steps assert only that G-5's text is absent, so a silent non-answer would pass. Their required answers (`MODEL_IDENTIFIER_NOT_AVAILABLE`, "AgentDefinition with ID … not found") must be asserted.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: CR-500-006
- Material score or classification changes: N/A (test review)
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: as API-REV-002 (the quiet macOS, M-6 cold, the founder's data, the emulated local providers; FU-500-09 … -11)

### CRR-006: Recheck of the CR-500-006 fix: Pass

- Review entry point and round: proportional test-code recheck
- Review scope: `73bfba186c` (ODM-1) and `642737b97a` (docs)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-revision-record.md` (API-REV-002 addendum); CR-500-006
- Relevant solution revision IDs: SR-015, SR-016
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-005)
- Current authoritative result: Pass
- What changed in the review result and why:
  - ODM-1 asserts the start's own `MODEL_IDENTIFIER_NOT_AVAILABLE` with the host down, and the member path's "AgentDefinition with ID … not found" for a removed agent.
  - The lead's options are checked every time.
  - Rerun: 1/1 pass.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution:

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-500-006 | Resolved | `73bfba186c`; `/tmp/api500/r2/odm3.log` |

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty, for delivery:
  - FU-035 (Grok) is not in this package; it comes in a later round with its own review;
  - the quiet-macOS watcher run was not tested (Linux 5/5 is the gate);
  - M-6 measured warm only: about 27 s on the first start (both passes);
  - the migration must not run on the founder's own data without his approval;
  - the local providers were emulated;
  - `origin/personal` moved 8 commits (beta.8): confirm no new app-data migration shipped, so `released-migration-order.json` (beta.7) stays the released list, and add `RELEASE.md`'s G-1 line;
  - the member handle is at 499 lines;
  - FU-500-01 … FU-500-11 in `follow-ups.md`.
