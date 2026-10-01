# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/implementation_engineer`, `implementation-handoff.md`, round 1 | SR-002, IR-001 | N/A | Pass / 95% |
| API-REV-002 | User-directed Code Reviewer CRR-001 continuation / CR-F001 | SR-005, ARCH-REV-001, IR-002, CRR-001, DR-003 | API-REV-001 Pass/95% on original scope only | **Fail / 88.6%**, API-F001; restored assertion passing, review pending |
| API-REV-003 | Implementation Engineer new narrow candidate / round1 of new ticket | SR-006, IR-003 | Parent API-REV-002 Fail88.6%, different scope | **Pass95.7% — AGY-only; full E2E43 inherited failures disclosed** |

## Revision Entries

### API-REV-001 — Initial validation of AGY MCP tool call presentation

- Triggering role, report path, and round: `/implementation_engineer`; `implementation-handoff.md`; round 1
- Triggering finding or scenario IDs: N/A
- Related revision IDs: SR-002, IR-001 (commit `34b310118`)
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts`; added case `mcp_calls` to `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`; extended the MCP guard in `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts`
- Scenarios added, changed, removed, or rechecked: TC-001..TC-008 (all new)
- Commands, environment, fixture, or broader-validation delta: unit and fake-AGY e2e; live AGY 1.2.14 (`RUN_AGY_E2E=1`, `RUN_AGY_CAPABILITY_E2E=1`); browser on a worktree dev stack; `pnpm test:e2e` regression

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md` (all created)
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none
- Recommended recipient: `/delivery_engineer`
- Remaining risks, blocked evidence, or untested scope: no live model call of `delegate_task`, a third-party MCP server or an MCP media tool through the full server (covered deterministically and by a real capture); the new e2e is opt-in; `pnpm test:e2e` has 43 failing tests in 12 non-AGY files, 41 reproduced with the base converter and 2 passing in isolation, not investigated


### API-REV-002 — Test-owned correction and current combined validation

- Trigger: Code Reviewer ordinary message explicitly requested by user after CRR-001 Fail; not a source-review Pass or release authorization. Large/High unchanged. HEAD a727971dabab141a39404a00ca6f7db46696f0b9, integrated b0b077b02, plus one uncommitted test correction.
- Current authority: SR-005 / ARCH-REV-001 / IR-002; triggering CR-F001; prior API-REV-001 and DR-003 remain basis-limited. Read full cumulative package and testing instructions before initial investigation, ledger and durable edit.
- Durable path: `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`; restore independently specified exact populated task/submission/review expectation at Org output wrapper. No source changes, test removal or weakening.
- Prior finding resolution: CR-F001 correction **implemented and executed**, 5/5 fresh built-server cases focused and again in full E2E. **Pending explicit reviewer closure**, not self-declared closed.
- Current execution: full unit/architecture 4126 pass/2 fail/6 skip; full integration 318 pass/64 skip; deterministic E2E 238 pass/133 skip; enabled fake AGY 9/9; live AGY 3 pass/1 imported-package opt-in skip; current rendered Activity/reload/stop-reopen Pass. All 47 historical cohort files passed (287 tests). Independent focused architecture reproduction repeats both failures (32 pass/2 fail). No unhandled runner errors reported. Exact commands and logs in api-e2e-evidence/api-rev-002/.
- New finding API-F001: two architecture guards detect a third model-validator constructor and two extra definition singleton reads in collaborator-definition-catalog.ts. Source/guards byte-identical to integrated base; current normal GraphQL/collaborator paths reach it. Preliminary **Unclear** source-vs-test contract ownership; no automatic whitelist/source refactor. Request focused failure-origin review for AC-012/013 / REQ-010/011.
- Broader decision: Required, partially executed (live AGY + browser). Desktop/current full-product and old-base-writer replay Not Tested/deferred at failing gate, not blocked on a secret/account and not waived. Historical stopped app not reused. Browser/test-owned processes and roots cleaned; external CLI conversation artifacts follow existing harness retention. Incoming evidence/generated artifacts/checkpoint preserved.
- Confidence: post-repository 83.6%, final 88.6% across mandatory seven categories. Fail regardless of score, critical architecture/full-layer gate unresolved. No release readiness, successful-test review or delivery Pass.
- Canonical artifacts updated in place: investigation, execution report, ledger, this record; prior snapshots retained as history only. One durable test diff and retained temporary orchestration/probe evidence supplied. No commit/push/release.
- Next action: current get_handoff_rules → matching Fail/failure-origin recipient; explicit CR-F001 resolution and applicable proportional test review before delivery. Stop after confirmed handoff.

Routing selection: get_handoff_rules returned the executable validation **Fail → /code_reviewer** rule. It is more specific than the pre-execution Unclear-upstream rule because these failures were executed/reproduced. Send only that exact recipient; no Delivery or Solution Designer duplicate. Request focused failure-origin review, carrying pending CR-F001 correction closure; no successful-test-review Pass asserted.


### API-REV-003 — Fresh AGY-only candidate, not expanded repair continuation

- Trigger: Implementation Engineer direct Small/Low handoff IR-003; SR-006 user scope reset. HEAD cb7688c4e25d0d990d1f196ea59142dff824d0ea directly over b0b077b02571098a6bf7993ab46b67a69fdb8f9d in new agy-mcp-tool-call-presentation-only worktree. First validation of this ticket, inherited cumulative numbering preserved.
- Read cumulative authority; initial investigation and ledger before execution. Current independent reviews N/A—not applicable; parent artifacts not credited as current passes. No durable source/test changes or assertion deletion; temporary scaffold corrections retain exact checks.
- Prior failure resolution: parent CR-F001 independently closed by CRR-002 on parent basis; not imported into new ticket. API-F001 Design Impact explicitly deferred/out-of-scope under SR-006, NOT fixed or passed. Expanded AC-009..014 not current acceptance. Parent API-REV-002 remains Fail88.6% on its original scope.
- Fresh evidence: build/bootstrap Pass; AGY unit168 pass/5existing opt-in skipped; explicit fake9/9; live AGY3 pass/1optional imported-package skipped; fresh third-party shape capture; old-writer/current-reader identical projection and bytes; rendered Activity/reload/stop-reopen Pass; current isolated desktop scripted-MCP and real-native journey with process-reopen Pass.
- Full E2E195 pass/43 fail/133skipped. Full production-equivalent baseline197 pass/41fail/133skipped; remaining2analytics failures reproduce on both current and base in ordered token cohort12pass/2fail each. All43 failing identities separated from AGY delta; no blanket suite Pass, blacklist, test repair or risk waiver. Evidence/basis limits in api-e2e-evidence/api-rev-003/failure-provenance.md.
- Desktop three temporary probe attempts retained: section toggle state, responsive Activity visibility, cold bootstrap navigation readiness. Conditional UI opening/ready waits fixed only automation; final all original assertions pass. All four owned instances stopped/root removed/ports released; final source/index diff empty. Parent and incoming artifacts untouched.
- Broader validation Required/completed. Seven confidence scores95/100/95/95/95/95/95 =95.7%, up from81.4%. Narrow Pass; no in-scope failure. Live delegate_task itself not model-selected this round; exact scripted backend/browser/desktop plus live platform MCP and independent real provider shape are explicitly differentiated.
- Updated canonical investigation, execution report, ledger, revision record. New evidence in api-e2e-evidence/api-rev-003. No currently running case. No commit/push/release or fresh user verification.
- Recommended recipient / successful route: Delivery, Small/Low direct. No proportional test review required for current route/no durable edits. Delivery must preserve non-green full-suite/API-F001 disclosure and complete its own verification/integration/release gates.

Routing selection: get_handoff_rules returned Pass + Small/Low direct + no required durable-test review → `/delivery_engineer`. This single most-specific rule applies to the approved AGY-only result; raw inherited suite failures remain disclosed with complete baseline reproduction. No duplicate reviewer or designer handoff.
