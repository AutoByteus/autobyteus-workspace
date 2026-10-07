# API/E2E Revision Record

## Revision Index
| Revision ID | Trigger / round | Related upstream | Prior result / confidence | Current result / confidence |
|---|---|---|---|---|
| API-REV-001 | Initial Implementation Engineer handoff, round1 | SR-007; R3 UREQ-001; Product UCONF-001; IR-001 | N/A | Pass / 95% |

## API-REV-001 — Source-current native and explicit-owner boundary proof
- Trigger: canonical implementation-handoff.md / implementation-revision-record.md, initial IR-001. Trigger finding IDs N/A. Architecture/source-review/delivery revision IDs N/A — not applicable.
- Baseline recorded because repository mocks alone left actual OS/full-caller/native-focus and saved-owner boundaries unproven (72.14% post-repository). Broader Required; completed source-current isolated desktop native-assisted validation.
- Durable additions: autobyteus-web/tests/e2e/workspace-folder-picker-probe.mjs; package.json script; TESTING.md runbook; four ExistingRunSettings policy cases in components/run-settings/__tests__/RunSettingsCard.workspace.spec.ts. No removed coverage, production edits, dependency changes or risk reclassification.
- Cases FP-001..009 and durable FP-P01..08; final89 repository tests and final8 native/API cases pass. Full build, guards and syntax checks pass. Commands/environment/fixtures/cleanup in canonical report.
- Intra-round FP-P07 attempts02/03 exposed harness-only navigation/remount assumptions; retain failures, correct user member-selection/re-expansion, runs04/05 verify resolution. No requirement weakened.
- Execution incident: post-cleanup app selection auto-launched exact worktree bundle unisolated (PID4683), immediately terminated without validation/UI actions. Possible default-profile access unknown. All test evidence isolated; never claim every startup was isolated. Prevention runbook added; disclose at Delivery user verification.

### Prior Failure Resolution
None — no prior completed API/E2E result. Intra-round harness attempts are retained in ledger/report, not invented prior rounds.

- Canonical artifacts updated: api-e2e-coverage-investigation.md (inventory, plan, staged scorecards); api-e2e-test-case-ledger.md (all checkpoints and final reconciliation); api-e2e-execution-coverage-report.md (authoritative completed result); this record.
- Prior result/confidence: N/A.
- Current result/confidence: **Pass / 95%**; all7 final categories95%, no unproven critical scoped AC.
- New/remaining product failure IDs: None. No design-impact/requirement-gap reroute.
- task_size Small; architectural_risk Low. Test-review **Not Required — direct low-risk route**. Fresh get_handoff_rules selected **/delivery_engineer**, the sole direct Small/Low Pass recipient.
- Residuals: mac native only; controlled rather than OS-induced error/context/lifetime edge cases; no paid model turns/physical mobile/all-platform or exhaustive a11y/translation audit; full vue-tsc unavailable (distinct from Product historical overflow). Auto-launch default-profile uncertainty must remain visible.
- No merge, push, tag or release. Generated SDK dist output remains unstaged.
