# API/E2E Revision Record — ORG-STOPPED-WHOLE-CONFIG-20260917-001

## Revision Index

| Revision ID | Triggering role / report / round | Related upstream revisions | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / CRR-002 / API round 1 | SR-002/SR-003, ARCH-REV-001, IR-001/002, CRR-001/002 | N/A | **Fail / 82.1%** |
| API-REV-002 | Code Reviewer / CRR-004 / API round 2 | SR-002/SR-003, ARCH-REV-001, IR-001–003, CRR-001–004 | Fail / 82.1% | **Pass / 95.0%** |

## Revision Entries

### API-REV-001 — Actual direct/mounted Settings canonical-read loop

- Trigger: CRR-002 source Pass and initial independent API/E2E validation.
- Triggering scenario: `B01 / AC-001`.
- Why recorded: establishes the initial API/E2E baseline and records a critical actual-browser failure that repository/component seams did not expose.
- Coverage changes: no repository durable test changed. The investigation now requires a production parent/child reactive integration regression for one bounded canonical read and a rendered form.
- Scenarios: R01 passed; B01 failed for both stopped direct and mounted entries; B02–B04 not tested because they depend on the editor; B05 precondition/Stop/nonactivation passed partially.
- Execution delta: browser control recovered; an isolated Chrome/Nuxt/proxy/backend/SQLite environment was used with a synthetic real package and official imported test secret. Two ordinary provider continuations passed before Stop. Both Settings entries then remained loading and generated repeated successful canonical reads.

#### Prior Failure Resolution

None — initial API/E2E baseline.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`, this record, and `validation/api-live/runtime-r3/*`.
- Prior result / confidence: `N/A`.
- Current result / confidence: **Fail / 82.1%** (confidence, not pass rate).
- New failure: `B01` — actual whole-Org Settings never renders; unbounded `AgentOrgRunModelConfig` read loop from both supported entry placements.
- Preliminary classification: `Local Fix`, frontend reactive identity/load ownership; Code Reviewer confirmation required.
- Recommended recipient: `/software_engineering_team/code_reviewer`.
- Remaining untested scope: aggregate edit/Save/reopen, post-Save continuation, determinate/indeterminate failure recovery, active/task/stale and adjacent controls, post-Save preservation.

### API-REV-002 — Actual direct/mounted resolution and complete whole-Org acceptance

- Trigger: IR-003 / CRR-004 source Pass after the actual-parent/actual-child regression corrected the semantic-identity reload boundary.
- Triggering scenario: prior `B01 / AC-001` failure rerun first, followed by B02–B05 and C01.
- Why recorded: completes the required second executable round and preserves the prior Fail rather than treating source review as live acceptance.
- Coverage changes: no repository durable test was added, updated or removed by API/E2E. The implementation's new `AgentOrgWorkspaceConfigBoundary.spec.ts` was accepted as valid carried durable coverage and correlated with actual browser behavior.
- Execution delta: both direct and mounted stopped Settings rendered after exactly one canonical read; one actual multi-scope Save persisted root/direct/Team/mounted values; reopen and real direct/mounted provider continuations used the saved high/xhigh parameters; live pre-write failure and post-write response-loss/no-replay passed; active/offline and adjacent Agent/Team/Org `+` controls passed; exact preservation diff passed.

#### Prior Failure Resolution

- API-REV-001 B01 unbounded canonical-read loop: **Resolved**. Actual Chrome direct `/guide` and mounted `/squad/lead` header Settings each produced one bounded `AgentOrgRunModelConfig` read, rendered the stable complete Org form, and did not start a provider or mutate the tree.
- Follow-on B02–B05 scope previously not testable: **Completed** through the actual frontend and backend. No direct GraphQL/store acceptance substitution was used.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`, this record, and `validation/api-live/runtime-r4/*`.
- Prior result / confidence: **Fail / 82.1%**.
- Current result / confidence: **Pass / 95.0%**.
- New failures: `None`.
- Broader-validation decision: `Required and completed`.
- Residual qualification: unchanged Electron shell and all-provider generalization are not certified; task/attachment-bearing adversarial preservation remains direct owner-suite evidence because the safe synthetic UI fixture contains neither.
- Recommended recipient: `/software_engineering_team/code_reviewer` for proportional test-code review; expected decision `Not Applicable` because API/E2E changed no durable test code.
