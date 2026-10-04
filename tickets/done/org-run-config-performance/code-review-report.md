# Code Review Report

## Review Round Meta

- Date / reviewer: **2026-10-04 (Europe/Berlin) / Code Reviewer**.
- Entry point: **API/E2E Failure-Origin Review**, round **4**, revision **CRR-004**. Trigger **API-REV-002 Fail / F-API-002 / API-009**, not successful-test review.
- Decision: **Fail / Local Fix — API/E2E-owned stale fixture and setup cleanup**. **Medium / High unchanged**.
- Intended-behavior authority: approved **SR-006** [requirements-doc.md](requirements-doc.md), frozen approval and investigation; cumulative **SR-010** [design-spec.md](design-spec.md), solution history; **ARCH-REV-001 Pass**. No requirement/design change or new product behavior.
- Implementation: **IR-002 current uncommitted source**, IR-001 historical; implementation-handoff.md / implementation-revision-record.md. Prior **CRR-003 source-gate Pass** is retained, not an overall API/E2E Pass. Full prior source result/scorecard preserved as **historical, noncanonical evidence** at [code-review-source-result-crr003.md](evidence/code-review-source-result-crr003.md).
- Execution authority: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), investigation, ledger and revision record, **API-REV-002 Fail / 80.00%, broader validation Required**. **F-API-001 resolved at qualified actual rebuilt packaged boundary**; new failure prevents native supplemental coverage.
- Complete input: [api-package-index.json](evidence/api-package-index.json), **483 current references** including dispatch receipt; all **376 prior reviewer / 198 original upstream references** independently confirmed retained. Prior 323 API inventory and all raw failure/governance artifacts remain in that chain.
- Worktree only: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance`, branch `codex/org-run-config-performance`; base `1b976216da0cbd0cc84fef3fe22a2739325b8ad3`, HEAD `f2dc1fd392201844bf28fdfdec26c7424a7ea7b2`. HEAD alone is not current IR-002 source.
- Delivery / Product: **N/A — not applicable**. No source/test correction, reviewer app/test execution, inference, user-data action, commit/stage/merge/push/tag/release/deployment.

## Review Scope And Basis

Inspected the exact failed command/log, workspace manifest and TESTING.md boundary/cleanup contracts; shared `native-compaction-root-fixture.ts`, acquiring `recovery-native-fixture.ts`, workspace native history harness, current collaborator admission factory/validator and real production callers. This is a focused setup-origin review, **not a whole-suite test review or reopened implementation audit/scorecard**.

Approved **BEH-003 / REQ-007 / AC-007** publication, retained-context, hierarchy and freshness obligations remain confirmed as intended behavior. This native-to-web harness supplies **supplemental** FIFO/history/hydration evidence under the independently documented workspace contract; it does not replace actual Org row/performance/producer-chain proof. Its failure before admission does **not** demonstrate a product FIFO/history defect or violation of AC-007.

**BEH-004 / REQ-002 / AC-002**, inheritance preservation AC-003: prior **CR-001 / F-API-001** recovery claim checked first against current qualified packaged receipts, response bodies, normal-entry script and schema DOM states. Details below. No new approval ambiguity or architecture impact.

## Supported Scenario And Candidate Gate

| Basis | Actor / supported trigger | Forward path, lifecycle and consequence | Evidence / disposition |
| --- | --- | --- | --- |
| **CON-CR-002**, documented validation and owned cleanup contract | Validation engineer runs normal documented `pnpm test:native-input-history` from assigned worktree to collect supplemental native-to-web evidence; must stop/remove only owned disposable resources | Root script → unchanged web boundary guard → workspace Nuxt harness → shared fixture starts controlled native producer and creates owned memory directory → obsolete factory call rejects before root admission/hydration → caller never obtains fixture close handle; two cases fail and acquired cleanup is skipped | TESTING.md:17,35–46,201–202; requirements-doc.md:71–72,81; package.json:5. **Supported Normal Scenario (Operational / Contract), Reachable** |
| **SCN-004 / BEH-004**, existing selected-kind recovery | Operator opens normal imported Org config, selects Codex, encounters one selected catalog outage, uses root or inherited-member visible Retry, then explicitly selects exact model after genuine response | Same-kind catalog refresh held → Run remains blocked → actual successful response → current shared publication and exact selected schema → 14 affected scope controls ready with sparse inheritance intact | API-011 raw packaged build/recovery JSON/log/script; **Supported Normal Scenario, Reachable**, prior finding resolution only; no blanket global/different-kind healing |

| Candidate | Observation / proposed action | Independent basis / evidence | Disposition / proportionate response |
| --- | --- | --- | --- |
| **CG-012** | Shared fixture calls absent `createCollaboratorMentionAdmission`; its setup rejection skips release of already acquired owned native/directory resources | CON-CR-002; exact failed command; fixture:7,28–29,82,113–119; harness:31–33,113; current catalog:22–38; retained cleanup captures | **Promote → CR-002**. Use current test factory seam and ensure acquired fixture resources are released if setup rejects. Preserve original failure, assertions and package boundary; no production compatibility alias or lifecycle framework |

No unsupported race, hypothetical infrastructure failure, or unexecuted product assertion is promoted. The cleanup requirement is grounded in this **observed setup rejection**, not a generic list of imagined failure causes.

## Findings

### CR-002 — Stale native admission fixture prevents documented coverage and skips setup cleanup

**P2 / Open / API/E2E-owned Local Fix**, linked **F-API-002 / API-009 / CG-012**. Blocks this validation gate, not a demonstrated production regression.

1. Exact API command **`pnpm test:native-input-history`**, cwd assigned worktree, exits **1**. Boundary guard passes; both native Agent and hosted-Team cases throw `TypeError: (0, createCollaboratorMentionAdmission) is not a function` at `native-compaction-root-fixture.ts:82` (import:7), called by workspace harness:31. Root creation/admission and intended held-A/queued-B/history/hydration assertions are **not reached**.
2. Current production catalog exports **`createCollaboratorAdmission(catalog, modelSelectionValidator)`** (`collaborator-definition-catalog.ts:22–30`), wired by `getCollaboratorAdmission` (:34–38). Actual Agent/Org/Team collaborators use that getter. Existing admission tests already use the current factory. The fixture's catalog and `validateMany` seam fit the current boundary; changing only its import/call is appropriate. Do **not** reintroduce an obsolete runtime export/alias or substitute fake admission to make the harness green.
3. Setup first obtains `createRecoveryFixture` (:28) and its own `native-root-compaction-*` directory (:29). Recovery fixture:39–61 starts a real controlled native Agent, persists three seed turns and exposes owned cleanup at :64. The missing factory throws **before** returned close at root fixture:113–119. The harness awaits setup **before** its try/finally (:31–33), so it cannot call `f.close()` on rejection. API raw log/snapshot Agent IDs and exact command window establish two acquired native fixtures and two empty root directories; four owned directories required explicit later cleanup. Retained captures' hashes match. No claim that a native worker survives the exited Vitest process.

**Required bounded outcome:** API/E2E updates the shared test fixture to the current factory, cleans already acquired owned resources when setup itself rejects (including initialized root/session resources if acquired), retains meaningful original error attribution, and proves both successful and rejected setup teardown. Keep native producer/FIFO/raw-history/attachments/dedupe/web-hydration assertions and the unchanged web/core guard boundary. Do not delete/skip/weaken cases, move core imports into web, add runtime compatibility code, or change product behavior.

## Failure Origin And Review Attribution

- **Confirmed origin: pre-existing stale test fixture / execution setup**, with setup-resource cleanup defect. Fixture and production catalog are **byte-identical** to approved base and reviewed HEAD; independently recomputed hashes are in [code-review-failure-origin-crr004.json](evidence/code-review-failure-origin-crr004.json). No approved-base harness rerun is claimed.
- **Not IR-002 regression or post-review production change**: all **11 current repair hashes**, merged **62 reviewed source/test continuity paths**, current saved web delta, API durable HTTP test and frozen approval match prior reviewed evidence. This continuity check is not another structural audit.
- **Not missing environment prerequisites, source admission defect or demonstrated FIFO loss**: the modules and native producers load; the failing call requests an export that does not exist. Token-schema/KaTeX/Browserslist warnings are retained but do not explain this TypeError. Later warnings or assertions may need classification after real rerun; no advance Pass inferred.
- **No new production-source review gap attributed**. The obsolete import and constructor cleanup gap are statically detectable once this shared fixture is in scope; they are **not runtime-only**. This unchanged supplemental fixture was outside the selected IR-001/IR-002 source/test changes. CRR-003 did not claim a native-harness or whole-suite Pass. CRR-002's earlier, separate recovery review gap remains historical. No unsupported numerical deduction from the CRR-003 source scorecard.

## Prior Finding Resolution — CR-001 / F-API-001

**Resolved at qualified actual current packaged boundary, corroborating CRR-003 source/component resolution.** API-REV-002 rebuilt current uncommitted IR-002 with isolated `start --build`; no IR-001 binary reuse. Normal unchanged 570-file import, actual Codex / `gpt-6.1-sol` and real provider schema. Root Retry and `/product_team/product_ui_ux_designer` own visible Retry each keep Run blocked while selected genuine response is held; after release and **explicit exact model selection**, root + 3 Teams + 10 members show **14 enabled real low-reasoning controls**, no stale alerts, inherited/sparse state retained, no launch/inference, zero captured page errors. Definition before/after is identical; no authoring/create requests in the successful browser trace.

This product probe began with no selected root model. It does **not** prove preservation of an already-selected high config/draft epoch; that remains controlled component proof. Earlier rejected authoring setup, unused helper/stale observer wording and locator attempts are retained, not credited as successful actions. No independent different-kind outage exists in this qualified probe; final Run-enabled is corroboration, not a blanket healing contract.

## Independent Evidence And Remaining Gates

- Reviewer inspected evidence and current source only; did **not** rerun the known failing setup merely to reproduce resource leakage. Four captured native files independently hash-match API cleanup receipt; no reviewer resource cleanup or user-data action.
- Complete cumulative upstream/raw package preserved. Current focused proof: [code-review-failure-origin-crr004.json](evidence/code-review-failure-origin-crr004.json). Canonical history: [code-review-revision-record.md](code-review-revision-record.md).
- API-REV-002's other repository/HTTP/packaged/AGY/browser subresults remain **API execution evidence**, not reviewer execution or a full validation Pass. Shared native fixture callers (`native-compaction-root.integration.test.ts`, `native-root-termination.integration.test.ts`) should receive narrow regression coverage after repair; no general test-suite review requested.
- Recheck **F-API-002 FIRST**, then complete required actual task/collaborator/ACK/conversation/enrichment/freshness/negative-reference chains and current IR-002 comparative ≥5 warm / ≥5 cold-renderer small/~500-root phase/work-count/provenance/byte-continuity proof. Historical IR-001 row-only gains/zero collision-purpose reads are not current overall performance Pass.
- Required SDK dist outputs were removed by API cleanup; run **server prebuild** before subsequent server build/typecheck/runtime; build current core outputs when needed for native harness. Standalone Vue typecheck unavailable, not Pass.
- Residuals unchanged: retained structural admission/full resync, synchronous provider scheduling, exact live-user workload. Successful durable-test review (including existing API-owned scoped HTTP test and forthcoming fixture repair), delivery/user verification remain pending. No release/deployment authorization.

## Classification / Routing / Latest Authoritative Result

- **Review Decision: Fail. Entry: focused failure-origin. Failure Origin: stale test fixture / setup cleanup. Classification: Local Fix — API/E2E-owned.**
- Scenario / material-premise gates: **Pass for this classification**; no new upstream behavior or speculative machinery. Full source audit/scorecard: **not applicable to this entry**; previous source result preserved as historical evidence.
- Recommended next owner: **/api_e2e_engineer**, subject to fresh current handoff-rule lookup. No implementation/design rework required by F-API-002; no successful-test review or delivery advance.
- After correction: API/E2E execution again, then separate proportional durable-test review **only after a clean passed API/E2E package**; a fixture-only green command does not satisfy remaining broader gates.
- Routing status: fresh current **rule 3** selects only **/api_e2e_engineer** for confirmed fixture/test failure origin; [handoff-rules-crr004.json](evidence/handoff-rules-crr004.json). Cumulative [code-review-package-index-crr004.json](evidence/code-review-package-index-crr004.json) attached. Single handoff confirmed **accepted=true / DELIVERED**, **495 references**, to **/api_e2e_engineer**, run **api_e2e_engineer_ece1f0c49a1547419302d1be2f4f2128**; [receipt](evidence/code-review-failure-handoff-receipt-crr004.json). Receipt appended to inventory after dispatch (496 current references). Stage complete; no additional recipient or polling.
