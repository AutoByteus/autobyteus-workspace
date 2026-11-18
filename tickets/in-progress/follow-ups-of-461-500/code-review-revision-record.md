# Code Review Revision Record: follow-ups-of-461-500 (autobyteus-500)

| CRR | Report | Entry point / trigger | Prior result | Result | Findings |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (Full Review) / IR-001 | N/A | Fail: Local Fix | CR-500-001, CR-500-002 new |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (Targeted Delta) / IR-002 | Fail (CRR-001) | Pass | CR-500-001, CR-500-002 resolved |
| CRR-003 | `code-review-report.md` | API/E2E failure-origin review / API-REV-001 | Pass (CRR-002) | Fail: Design Impact ×2 + Local Fix | CR-500-003 … -005 new |
| CRR-004 | `code-review-report.md` | Implementation Review, round 3 (Targeted Delta) / IR-003 (SR-015, SR-016) | Fail (CRR-003) | Pass | CR-500-003 … -005 resolved |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-002 (c0770ea7b0, a7e76ca248) | Pass (CRR-004) | Fail: Local Fix (API/E2E) | CR-500-006 new |
| CRR-006 | `api-e2e-test-review-report.md` | Proportional test-code recheck / CR-500-006 fix (73bfba186c) | Fail (CRR-005) | Pass | CR-500-006 resolved |
| CRR-007 | `code-review-report.md` | Merge review, round 4 (Targeted Delta) / IR-004, base `ff13782f36` | Pass (CRR-006) | Fail: Local Fix | CR-500-007 new |
| CRR-008 | `code-review-report.md` | Recheck, round 5 (Targeted Delta) / IR-005 | Fail (CRR-007) | Pass | CR-500-007 resolved |
| CRR-009 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-003 (merged state; d600a2af71) | Pass (CRR-008) | Pass | None |
| CRR-010 | `code-review-report.md` | Merge review, round 6 (Targeted Delta) / IR-006, base `0570c47fd9` | Pass (CRR-009) | Pass | None |
| CRR-011 | `code-review-report.md` | API/E2E failure-origin review / API-REV-004 (F-4) | Pass (CRR-010) | Test-side (also on base) → API/E2E | None (source) |
| CRR-012 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-004 (696acc408c, 8d14de45e3) | Test-side (CRR-011) | Pass | None |
| CRR-013 | `code-review-report.md` | Merge review, round 7 (Targeted Delta) / IR-007, base `24d438fa31` | Pass (CRR-012) | Pass | None |
| CRR-014 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-005 (16559affdd) | Pass (CRR-013) | Pass | None |
| CRR-015 | `code-review-report.md` | Merge review, round 8 (Targeted Delta) / IR-008, base `75048cbaf4` | Pass (CRR-014) | Pass | None |
| CRR-016 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-006 (no test change) | Pass (CRR-015) | Not Applicable | None |
| CRR-017 | `code-review-report.md` | Merge review, round 9 (Targeted Delta) / IR-009, base `53b72018ad` (491, 492) | Not Applicable (CRR-016) | Pass | None |
| CRR-018 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-007 (d33103b732) | Pass (CRR-017) | Pass | None |

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

### CRR-007: Merge review of IR-004 (the base `ff13782f36`): Fail, Local Fix

- Review entry point and round: implementation review, round 4 (the delivery base refresh)
- Review scope: Targeted Delta, `642737b97a..a462aa6fe7`: the merge `39325a1e50`, and `bfeea63612`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-004, IMP-020); Delivery, `release-deployment-report.md`
- Relevant solution revision IDs: SR-016 (unchanged)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: the base-integration block (`2f8a463a11`)
- Prior authoritative result: Pass (CRR-006)
- Current authoritative result: Fail, Local Fix
- What changed in the review result and why:
  - The remerge diff shows only the four conflict files, each keeping both sides (448's wording with 500's names).
  - The base adds no migration, brings back no removed name, and 515's tool search uses the agents' own tools.
  - The order-test fix is correct.
  - On the merged base, `build-studio-server.ts` is at 502 effective lines: the new base has 492 and this ticket adds 10.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A (all earlier findings stay resolved)
- New or remaining finding IDs: CR-500-007
- Material score or classification changes: SoC & File Placement is below 9.2 until the move
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: the merged state's e2e and `release:test` are delivery's and API/E2E's

### CRR-008: Recheck of IR-005 (CR-500-007): Pass

- Review entry point and round: implementation review, round 5 (the delivery base refresh's Local Fix)
- Review scope: Targeted Delta, `a462aa6fe7..460b12a673` (code `eb741a097e`)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-005); CR-500-007
- Relevant solution revision IDs: SR-016 (unchanged)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: the base-integration block (`2f8a463a11`)
- Prior authoritative result: Fail (CRR-007)
- Current authoritative result: Pass
- What changed in the review result and why: `createStudioPackageServices` moved unchanged to its own file, so `build-studio-server.ts` is at 485 effective lines. This ticket's own wiring stays, because the architecture tests require it in that file.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution:

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-500-007 | Resolved | `eb741a097e`; 485 lines; no changed file over 500 against `ff13782f36` |

- New or remaining finding IDs: none
- Material score or classification changes: SoC & File Placement back to 9.3; overall 9.4
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty: the merged state's e2e suites and `release:test` are delivery's; the residual risks are as in CRR-006

### CRR-009: Proportional test-code review after API-REV-003 (merged state): Pass

- Review entry point and round: successful API/E2E test-code review (round 3, the merged state `eb741a097e`)
- Review scope: `d600a2af71` (`project-task-boundaries.e2e.test.ts` E-007)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-003)
- Relevant solution revision IDs: SR-016 (unchanged)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-004, IR-005
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DEL-01 (the merged-state check that asked for this round)
- Prior authoritative result: Pass (CRR-008)
- Current authoritative result: Pass
- What changed in the review result and why: E-007 composes the Task side again from disk with the hosts' `composeTaskSide` (FU-011 removed the lazy instance it relied on). That is the restart path itself, and it's released by the file's reset. The merged state's failures are classified as load, FSEvents, or the same on base.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty: the quiet macOS (1/5 at a loaded fseventsd, every failure INCONCLUSIVE, evidence only); FU-500-09 and FU-500-12 (base); the residual risks as in CRR-006

### CRR-010: Merge review of IR-006 (the base `0570c47fd9`): Pass

- Review entry point and round: implementation review, round 6 (the third delivery base refresh)
- Review scope: Targeted Delta, the merge `e93671cce0` (13 conflicts) and `4db98c6d1a`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-006, IMP-022); Delivery, `release-deployment-report.md` (`0af5a64677`)
- Relevant solution revision IDs: SR-016 (unchanged)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: the third integration refresh
- Prior authoritative result: Pass (CRR-009)
- Current authoritative result: Pass
- What changed in the review result and why:
  - 448 part 2's background-task count is carried through 500's run-agent names on the server, the peer and the web. The modify/delete is applied to the renamed file.
  - 493's episodic catalog is in the composition with this ticket's remote channel; the removed collaboration-folder constant stays removed.
  - No migration and no release came from the base.
  - Every file is at or under 500 lines; the member handle is exactly at 500.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A (all earlier findings stay resolved)
- New or remaining finding IDs: none
- Material score or classification changes: none (overall 9.4)
- Recommended recipient: `/api_e2e_engineer` (round 4 on the merged state)
- Remaining risks or uncertainty: the merged state's e2e is API/E2E's round 4; the member handle is at the limit

### CRR-011: Failure-origin review of API-REV-004 (F-4): test-side, also on base

- Review entry point and round: API/E2E failure-origin review (API round 4, the third merged state)
- Review scope: F-4, OT-2 (and OT-3) in `open-task-tree-upgrade-startup.e2e.test.ts`; the round's test changes `696acc408c`
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-004), F-4
- Relevant solution revision IDs: N/A
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: the third integration refresh
- Prior authoritative result: Pass (CRR-010)
- Current authoritative result: the failure is test-side and also present on base; the source review stands
- What changed in the review result and why:
  - A temporary probe of OT-1 … OT-3 showed the same thing on the branch and on base `0570c47fd9`: OT-2's start writes four `memory/episodic/*/catalog.md` files and rewrites `index.md`. That is 493's start pass, after OT-1's server stopped before its 5 s refresh, and OT-2 and OT-3 fail the same way on both.
  - The fix is test-side, as for SIR-002: OT-2's fingerprint leaves out the derived `memory/episodic/`.
  - The round's test changes (TS-009, SIR-002) are sound.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: none against source
- Material score or classification changes: none
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: the base-side flakiness of OT-2 under load, a follow-up for 493's area

### CRR-012: Proportional test-code review after API-REV-004 (third merged state): Pass

- Review entry point and round: successful API/E2E test-code review (round 4, after the F-4 fix)
- Review scope: `696acc408c` (TS-009, SIR-002) and `8d14de45e3` (OT-2)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-004 final)
- Relevant solution revision IDs: N/A
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: the third integration refresh
- Prior authoritative result: test-side failure routed to API/E2E (CRR-011)
- Current authoritative result: Pass
- What changed in the review result and why:
  - TS-009 proves the Org rows' background-task state, and its return to Idle, through a real trigger.
  - SIR-002 and OT-2 leave out only the derived `memory/episodic/`, with their reasons, and still compare every other file.
  - OT-1 … OT-3 pass 3/3.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A (F-4 was not a source finding)
- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty: FU-500-13 (OT-2's base-side timing); BTS-04/05 need the live Claude/Codex gates and weren't run; the residual risks as in CRR-006

### CRR-013: Merge review of IR-007 (the base `24d438fa31`): Pass

- Review entry point and round: implementation review, round 7 (the fourth delivery base refresh)
- Review scope: Targeted Delta, the merge `eecb228bd6` (2 conflicts)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-007, IMP-023); Delivery (`92780698b9`)
- Relevant solution revision IDs: SR-016 (unchanged)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-007
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: the fourth integration refresh
- Prior authoritative result: Pass (CRR-012)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The restart notice uses 526's whole-message observer with this ticket's `readyAgent`.
  - 524's moved close function is identical to the base, and this ticket's package-services move stays.
  - beta.8 … beta.10 shipped no migration, so the recorded order holds.
  - No file is over 500.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: `origin/personal` moved again (`0ce426bc9f`, 534); the member handle is at 500

### CRR-014: Proportional test-code review after API-REV-005 (fourth merged state): Pass

- Review entry point and round: successful API/E2E test-code review (round 5)
- Review scope: `16559affdd` (RR-12; SIR-002's `restart-resume/` exclusion)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-005)
- Relevant solution revision IDs: N/A
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-007
- Relevant API/E2E revision IDs: API-REV-005
- Relevant delivery revision IDs: the fourth integration refresh
- Prior authoritative result: Pass (CRR-013)
- Current authoritative result: Pass
- What changed in the review result and why:
  - RR-12 proves the merged resumer's member path (an update restart, the notice once with its reason, the next input clean) through a real previous-release start.
  - SIR-002 also leaves out 448's runtime `restart-resume/` record, with its reason.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - RR-07 … 09 (live) and RR-11 (needs a pre-526 build) weren't run;
  - `origin/personal` moved again (534);
  - the residual risks as in CRR-006 and FU-500-09 … -13.

### CRR-015: Merge review of IR-008 (the base `75048cbaf4`): Pass

- Review entry point and round: implementation review, round 8 (the seventh delivery base refresh)
- Review scope: Targeted Delta, the merge `bb42531c7d` (the watcher test and `TESTING.md`)
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-008, IMP-024, IMP-025); Delivery (`50faf1c629`)
- Relevant solution revision IDs: SR-013, SR-014 (FU-021)
- Relevant architecture-review revision IDs: ARCH-REV-006, ARCH-REV-007
- Relevant implementation revision IDs: IR-008
- Relevant API/E2E revision IDs: API-REV-005
- Relevant delivery revision IDs: refreshes 5 to 7
- Prior authoritative result: Pass (CRR-014)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The watcher test keeps 500's outcome waits, sentinel checks and labels, and takes 517's shared limits: a 30 s guard, and a 55 s test timeout that includes the probe.
  - The 30 s guard deviates from SR-013's 60 s, following the newer project rule, with no longer waits. The reason holds.
  - AC-005 is 5/5 on Linux on the merged commit.
  - v1.5.13 shipped beta.7's migrations, so the recorded order holds.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - the design spec's FU-021 "60 s" text needs aligning with the project limit (the Solution Designer, at closure);
  - `origin/personal` moved again (`be11a62449`).

### CRR-016: Proportional test-code review after API-REV-006 (seventh merged state): Not Applicable

- Review entry point and round: successful API/E2E test-code review (round 6)
- Review scope: `94376f166d..2c03613d36`. No durable test file changed (ticket documents only).
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-006)
- Relevant solution revision IDs: SR-013, SR-014 (FU-021)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-008
- Relevant API/E2E revision IDs: API-REV-006
- Relevant delivery revision IDs: refreshes 5 to 7
- Prior authoritative result: Pass (CRR-015)
- Current authoritative result: Not Applicable (the package passes to delivery)
- What changed in the review result and why: no test-code change to review. The merged state's AC-005 gate is 5/5 on Linux, and 517's areas pass in Linux.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - the quiet macOS was not tested;
  - FU-500-14 (517's rename cases on a loaded Mac);
  - `origin/personal` moved again (`be11a62449`);
  - the design spec's FU-021 "60 s" text needs aligning (the Solution Designer, at closure);
  - the residual risks as in CRR-006.

### CRR-017: Merge review of IR-009 (the base `53b72018ad`, 491 and 492): Pass

- Review entry point and round: implementation review, round 9 (the eighth delivery base refresh)
- Review scope: Targeted Delta, the merge `5eb8246076` (18 conflicts, 31 files in the remerge diff) and `8e8c21c2c4`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-009, IMP-026); Delivery (`04d44b5cd0`)
- Relevant solution revision IDs: SR-006 (FU-030), SR-016 (unchanged)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-009
- Relevant API/E2E revision IDs: API-REV-006
- Relevant delivery revision IDs: the eighth integration refresh
- Prior authoritative result: Not Applicable (CRR-016)
- Current authoritative result: Pass
- What changed in the review result and why:
  - 491's unreleased `20261118` migration is appended after this ticket's two `20261117` ones. The released record is unchanged, since no tag holds 491's migration, and the two don't share any stored data.
  - 492's DEC-001 (delivering messages between unrelated runs) supersedes FU-030's SIR-001 refusal, so the base's side is taken.
  - 492's running agents use this ticket's names, and `list_running_agents` now takes the host's `PeerDiscoveryAccess` (FU-011), with the off value answering it.
  - The type-check baseline is not raised.
- Supported product scenario / material-premise basis changes: SIR-001's refusal no longer applies (superseded by 492 DEC-001)
- Prior finding resolution: N/A
- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - the FU-030 SIR-001 row in the handoff and requirements needs a "superseded by 492 DEC-001" note at closure;
  - the member handle is at 500.

### CRR-018: Proportional test-code review after API-REV-007 (eighth merged state): Pass

- Review entry point and round: successful API/E2E test-code review (round 7)
- Review scope: `d33103b732` (MO-1; LRN-1/2; the RC suite's `calls()`)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-007)
- Relevant solution revision IDs: SR-016 (unchanged)
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-009
- Relevant API/E2E revision IDs: API-REV-007
- Relevant delivery revision IDs: the eighth integration refresh
- Prior authoritative result: Pass (CRR-017)
- Current authoritative result: Pass
- What changed in the review result and why:
  - MO-1 proves the merged migration order and 491's removal on one first start.
  - LRN-1/2 prove `list_running_agents` with the host's discovery on both routes and two nodes, and the application host's same-senders rule.
  - The RC suite's reply wait follows the run view's 100-event window, with its cause evidenced and no assertion changed.
- Supported product scenario / material-premise basis changes: none
- Prior finding resolution: N/A
- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - FU-500-15 (a), the host's "off" answer reached by units only;
  - FU-500-15 (b), the runtimes' not-found codes differ, as on base;
  - FU-500-10 is resolved by 492;
  - the closure doc notes (SIR-001 superseded; the FU-021 guard text);
  - the residual risks as in CRR-006.
