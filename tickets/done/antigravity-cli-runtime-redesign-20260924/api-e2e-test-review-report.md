# API/E2E Test Review Report — AGY runtime

## Review meta

- **CRR-018 — Pass.** Bounded re-review after CRR-017/TR-002 reporting-only Local Fix, API-REV-009 **Pass / 96%**, IR-009 source `42ec93de0`, test/evidence commit `9df7ac417`, report correction commit `fe4c0d556`. Task remains **Large / High**. CRR-016 production-source report and scorecard remain authoritative and unchanged.
- Context: approved SR-024 / DS-006 / ARCH-REV-005 and earlier SR-016/019/021, IR-009, CRR-016, current API investigation/report/revision/ledger, final actual-member browser/process evidence, prior CRR-017. Delivery still requires an Electron rebuild and explicit user verification.
- Supported scenario: **Yes.** The user focuses the configured Solution Designer in a full Org, sends a first prompt, then resumes that same member after a backend process restart. Approved skill-isolation and immutable-restore contracts require its in-bound Team-shared file links to become private ordinary capsule bytes without changing source links or selected workspace. The test witnesses this independently established journey.
- Method: CRR-017 proportionally reviewed the one added durable test, final evidence and screenshot. This round inspected `fe4c0d556` and reconciled the canonical report, revision record, ledger and unchanged final evidence. No successful live E2E rerun was needed or claimed for this documentation-only correction; no production source was reopened.

## Changed durable test scope

| Durable path | Change | Coherent responsibility |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/agy-actual-solution-designer-skill-org-probe.mjs` | Added in API-REV-009; unchanged by correction | Opt-in isolated actual mounted-package full Org first turn, linked-skill capsule bytes, and distinct-backend same-member browser/public-projection continuation. |

No durable test was updated or removed by the correction. Screenshots, logs and evidence JSON are execution artifacts, not test code under review.

## Proportional checks

| Check | Result | Evidence / note |
| --- | --- | --- |
| Scenario grouping and names | Pass | One named actual-member first-turn/restore journey, distinct from generic large-Org and transport probes. |
| Requirement-relevant assertions | Pass | Exact member/address/run/provider binding; visible first answer and Idle; read-only source links; ordinary exact-byte capsule files; empty workspace; old visible reply before a new send; old/new replies and exact public projection after restart. Screenshot separates prompt and AGY answer. |
| Fixture/setup/helper reuse | Pass | Local process, GraphQL and polling helpers serve the single journey; mounted package and link names are intentionally specific to the reported installed configuration. |
| Isolation and determinism | Pass | Explicit opt-in, isolated temporary data/SQLite/workspace, owned backend/frontend/browser, read-only mounted package, finite waits and cleanup. Distinct PIDs and same isolated root establish OS restart. Backend A exit **1** is preserved as an unclassified shutdown anomaly, not called clean. |
| File coherence/navigability | Pass | Setup, first turn, snapshot, A→B continuation and cleanup remain one traceable scenario. Dense formatting alone is not an actionable regression; source-file size thresholds do not apply to tests. |
| Stale/duplicate/disabled coverage | Pass | This activates the actual member that earlier 18-placement launch did not. No older test was muted or removed. |
| Coverage/evidence agreement | **Pass — TR-002 resolved** | Corrected AGY-16 report names provider ID `0784e353-e6d3-42b4-921b-a641e9ad57a3`, matching final `evidence.json` firstTurn and restore. Ledger 89 now identifies the different `dd5dd0bc-...` earlier run as historical and points only to its historical log; ledger 90/91 identify final evidence and correction. Execution Pass/96% and exit-1 caveat are unchanged. |
| Independent supported scenario | Pass | Approved Org first turn, linked configured skill, exact restore and real UI entry are the basis; the test itself does not invent the workflow. |

## Findings and disposition

| ID | Prior result | Current result | Evidence |
| --- | --- | --- | --- |
| **TR-002** | CRR-017 Fail — Local Fix, canonical provider-ID transcription mismatch | **Resolved** | `fe4c0d556` corrects the canonical AGY-16 ID and explains earlier-run provenance; both final evidence fields match. No test/source/evidence change or new validation claim. |
| TR-001 | Resolved before this round | Remains resolved | No affected durable assertion changed. |

No new actionable test-code finding. The older Codex/Claude provider-real fixture stopped before provider and is not counted passing. The actual Electron 1.4.80 package and normal user Org are not accepted by this review.

## Latest authoritative result

- **Result:** **Pass** for proportional changed-test-code review; TR-002 resolved. API Engineer's 96% remains execution confidence, not a reviewer score.
- **Recommended recipient:** `/delivery_engineer` with the cumulative passed package for fresh Electron rebuild, documentation sync and explicit user verification. This review does not authorize release, finalization or cleanup.
