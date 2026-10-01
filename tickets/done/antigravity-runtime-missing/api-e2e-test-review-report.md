# API/E2E Test Review Report

## Latest Authoritative Result
**Pass — proportional durable-test review, CRR-002.** Both changed test files are requirement-aligned and appropriate for their respective boundaries. No actionable test-code findings. This is not a clean overall API/E2E confidence result, historical non-impact proof, or release authorization.

## Review Meta
- Date: 2026-09-27. Test-review round: 1; cumulative code-review revision: **CRR-002**.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing`; branch `codex/antigravity-runtime-missing`; reviewed HEAD `fbc84a664`.
- Trigger: API-REV-004 functional Pass / accepted-risk review-ready, explicit user continuation recorded in `user-continuation-disposition.md` / SR-007, and separate test-review gate requested by CRR-001.
- Requirements: `requirements-doc.md`, approved **SR-003**, unchanged. Design: `design-spec.md`, especially DS-003 and stored capsule preservation. Investigation: `investigation-notes.md` plus cumulative `api-e2e-coverage-investigation.md`.
- Solution history: `solution-revision-record.md`, SR-003 and SR-004–007 incident/retest/disposition history. Relevant supplemental authority: `user-continuation-disposition.md`. Original factual evidence inventory remains in investigation notes.
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md`, **IR-001**. Independent architecture and normal source-review records: **N/A — not applicable** to Medium/Low direct route.
- Original failure-origin report: `code-review-report.md`, **CRR-001**; unchanged by this separate review. Cumulative history: `code-review-revision-record.md`.
- Validation: `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, **API-REV-001–004**. Delivery revisions: N/A.
- API/E2E result: functional Pass; user-accepted historical residual uncertainty permits progression. Clean technical confidence gate remains unmet: **92.1% overall, environment 75%**, unchanged by this review.
- Prior unresolved test-review findings: None; this is the first separate test review.
- Supported product-scenario basis confirmed: **Yes**. Classification remains **Medium/Low**.
- Scope excludes duplicate failure-origin inquiry, full source audit/scorecard, source size thresholds, temporary browser probes as durable code, and production inspection/recovery. No tests rerun: changed assertions are assessable from source/diff and retained passing execution evidence.

## Changed Durable Test Scope
Paths below are worktree-relative; other artifact paths are relative to this ticket.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Responsibility / Evidence |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-restore-live.test.ts` | Updated | SCN-003 / BEH-003 / REQ-003 / AC-004, with AC-002 real create/restore support | Live factory new-run → original marker → terminate → changed definition → restore same conversation and original capsule/identity; wrong workspace and conversation rejected. Added manifest/Markdown exact-content comparison, optional current evidence output, and outer finally cleanup. `restore-live.log`: 1 passed; `factory-restore-live.json`: original marker twice, same provider ID, capsuleBytesUnchanged true. |
| `autobyteus-server-ts/tests/unit/runtime-management/codex/client/codex-app-server-client.test.ts` | Updated | SCN-003 / BEH-003 / REQ-003 / AC-004 non-AGY preservation; existing explicit child-environment contract | One matcher changes from reference identity to strict deep value equality. Client intentionally snapshots env before spawn. `runtime-regression-rerun.log`: 68 passed / 10 files, including the four-case client suite. |

No durable files added or removed. No new source/test edits in API-REV-004. `git diff 95637e21d..fbc84a664 -- '*/tests/*'` identifies exactly these two updates; diff from validation commit `1499c590d` to reviewed HEAD is empty for both. Retained `evidence/api-e2e/durable-coverage.diff` agrees with current content. No durable test changed: **No**; Not Applicable does not apply.

## Independent Scenario Basis And Relevant Path
- **Restore:** requirements SCN-003 and design DS-003 establish a user continuing a saved AGY run after upgrade, preserving run-start identity/capsule and exact provider binding. The production factory `restoreBackend` reads stored manifest, resolves workspace, restores the original capsule and launches with the stored conversation. Editing the current definition between turns tests the explicitly preserved run-start representation, not a fabricated concurrent workflow. The live test uses the real factory/discovery/capsule/process; definition, skill, workspace and MCP collaborators are bounded stubs. It proves that boundary, not every team/MCP interaction.
- **Codex:** preserved non-AGY execution includes passing configured child environment values. Existing `CodexAppServerClient.start()` creates an env snapshot and supplies it to spawn. The mock observes this supported launcher contract. JavaScript object identity is not an approved external behavior; `toStrictEqual` still rejects missing, changed or extra env entries. No production change is needed to satisfy the old incidental identity assertion.

## Proportional Test-Code Checks
| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One named live restore lifecycle; Codex cases remain grouped around launch environment and spawn diagnostics. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Same provider ID, original/revised identity distinction and exact saved manifest/Markdown text directly prove preservation. Full manifest equality includes stored hash; test does not claim an independent cryptographic audit. Codex strict value assertion matches configured environment semantics. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Existing ask helper handles subscription/turn completion for both live turns; one factory/config with controlled definition/workspace collaborators. Existing mockChildProcess and reset reused; no extra abstraction needed. |
| Test isolation and determinism appropriate for boundary | Pass | Live test deliberately opt-in via AGY_LIVE, uses unique mkdtemp root and explicit workspace/memory, bounded turn polling and 240-second test timeout; retains assertions after real provider responses. Outer finally terminates the active backend and removes owned root on ordinary execution/assertion-failure paths, with optional evidence output. Failed factory launch stops its own process; repeated backend termination is supported. Codex spawn is mocked and reset per case; existing global-env case restores values in finally. Real live model/login availability remains an explicit prerequisite, not a deterministic unit-test claim. |
| Files remain coherent and navigable | Pass | Added checks/evidence/cleanup all belong to the same restore lifecycle; Codex change is one matcher. No forced split justified. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain in changed scope | Pass | No cases removed or newly skipped; opt-in provider execution is intentional. Removed unsupported identity matcher, not value coverage. Model ID is a live fixture prerequisite, not a CLI version gate. |
| Coverage agrees with investigation and execution evidence | Pass | Investigation records exact capsule/evidence/cleanup change and semantic Codex matcher repair; retained live log/result and broad runtime rerun support both. Initial failing assertion evidence remains retained. |
| Fixtures exercise independently established supported scenarios | Pass | SCN-003/DS-003 preservation and existing Codex launcher environment contract establish intent independently of test mechanics. |

## Findings
**None.** No source/test modifications by reviewer, no new implementation machinery requested. Optional artifact I/O and provider/service availability are ordinary execution dependencies; this review does not promise cleanup through every infrastructure failure or label hypothetical failures as defects without evidence.

## Accepted Residual Risk / Prior Finding Disposition
**API-ENV-001 is not a test-code finding and is not technically cleared.** CRR-001 settled its API-owned environment origin. API-REV-002 reconciled reached startup operations; later prelaunch checks and fresh isolated runs demonstrate corrected execution, not prior non-impact. API-REV-004 / SR-007 record the user's explicit informed acceptance of the disclosed uncertainty for progression. That resolves the user-decision hold only; actual historic effects remain unknown.

Read current disposition and retained `evidence/api-e2e/retest2/preflight.json`, `result.json`, `cleanup.json`: fresh owned paths, actual RETEST2-AGY-OK response/Idle and cleanup support the latest operational result. These are supplementary execution evidence, not replacement proof for the two reviewed tests or a full regression rerun. No extra retest solely to prove historical non-impact is warranted. No production access, recovery or installation is authorized by this review.

## Latest Result / Next Owner
- Result: **Pass**, scoped only to the two durable test changes above.
- Unresolved test-review findings: **None**.
- Existing incident: **API-ENV-001 — residual uncertainty accepted for progression, technical non-impact unproven**.
- Full source scorecard/confidence rescoring: N/A. Medium/Low unchanged; prior failure-origin report remains authoritative for that earlier review entry point.
- Recommended recipient: **/delivery_engineer** for delivery-owned documentation, integrated checks and explicit user verification/finalization gates, carrying SR-007 acceptance and unchanged technical confidence limitation. This is progression to delivery work, not Delivery Completed or release permission.

## Applied Handoff Rule
Selected the single post-API/E2E durable-test-review Pass rule to **/delivery_engineer**. The complete functional validation package, explicit SR-007 accepted-risk disposition and test-review Pass make it ready for delivery-owned work/gate evaluation, not a claim that the API clean-confidence gate was met. No duplicate failure-origin route or informational implementation-pass notification applies.
