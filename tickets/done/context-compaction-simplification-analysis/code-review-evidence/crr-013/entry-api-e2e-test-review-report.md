# API/E2E Test Review Report

## Review Meta

- Review round: **CRR-012**, 2026-10-01; first completed proportional successful-validation test-code review.
- Trigger: API/E2E engineer's **API-REV-007 completed Pass / 95.0%** package. This review is **Fail — Local Fix, API/E2E-owned**, for one stale asserted evidence field, not an implementation or live-campaign failure.
- Context authorities: `requirements-doc.md` Approved SR033 (SR028 baseline), `investigation-notes.md`, `solution-revision-record.md`; `design-spec.md` Ready SR034; `design-review-report.md` / `architecture-review-revision-record.md` ARCH-REV004; `implementation-handoff.md` / `implementation-revision-record.md` IR007.
- Relevant supplements: SR020 accepted deviation; SR022 diagnostic limits; SR031 supported-scenario clarification; SR032/033 terminal activity approval and SR034 retention design. No intended-behavior change made here.
- Original implementation review: **`code-review-report.md`, CRR-011 Pass 9.40/10**, preserved byte-for-byte. This report does not reopen or replace that source verdict.
- Cumulative history: `code-review-revision-record.md`; current ID **CRR-012**, CRR-001 baseline retained.
- API inputs: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md` (API007 completed entry).
- Task size / architectural risk: **Large / High**, unchanged. Product Design and delivery revision: **N/A — not applicable**.
- Prior proportional test-review findings: **None**. Earlier failure-origin corrections are rechecked below; missing prior test-review report was not treated as Pass.
- Supported product scenario basis confirmed: **Yes** — sustained/repeated native work (SCN001/003), current settings, saved-context restoration (SCN004), ordinary later-admission recovery (SCN005), confirmed termination display and preserved history (SCN006). Helpers also follow established test-isolation and truthful-evidence contracts.
- Reviewed checkout: branch `codex/context-compaction-simplification-analysis`, HEAD `6908ccff483f1eca522caa65bfaaf6dcfcc26750`; **pending worktree authoritative**. All 11 current durable hashes match API007's final audit. Incoming index contains 2512 existing references (the handoff's 2511 plus its index); no missing artifact.

## Changed Durable Test Scope

All paths below are worktree-relative. Cumulative changes, not merely API007's zero-edit continuation, were reviewed using current files, the supplied cumulative diff and earlier correction context. No test removals. Temporary probes/logs/screenshots/decoders are supporting execution evidence, not durable production source under review.

| Durable test path | Change | Requirement / responsibility | Review evidence |
| --- | --- | --- | --- |
| `test-support/live-e2e/live-e2e-harness.ts` | Updated | SCN001/003; AC001/003/004/010/011/016; real native agent flow and observations | Normal AgentRun composition with owned attachment resolver, real tool registration, threshold crossing, exact tool pairs, archive/snapshot/next-request equality and synthetic-source continuation. **TR-001** affects one returned proof flag only. |
| `test-support/live-e2e/run-live-e2e.mjs` | Updated | Explicit live-provider validation / isolation | Adds quality file to existing runner, preserving selected scenarios, preflight, sanitized child environment, evidence scan and owned cleanup. |
| `test-support/live-e2e/compaction-quality-checks.ts` | Added | REQ006 / AC007; controlled planned-versus-completed alarm | Explicitly fixture-specific, not a universal semantic evaluator; positive, negative and negated examples maintained. Manual review remains necessary. |
| `test-support/live-e2e/live-e2e-safe-error.ts` | Added | Test evidence confidentiality | Bounded cause traversal; allowlisted categories/codes/conditions and numeric HTTP status; arbitrary exception text/stack/headers omitted. |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` | Updated | Harness composition / established attachment ownership contract | Real package scan distinguishes admitted and unadmitted owner; copied provider input versus original recording locator checked. Canonical event facade exercised; temporary roots/readiness index cleaned. |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-boundary.test.ts` | Updated | AC011/015/016; test setup and Unicode boundary | Real content builder/exact v5; tool registration checked before stubbed generation boundary. Ordinary emoji/literal replacement character allowed; lone surrogate rejected. Source immutable. Prior whole-history glyph-absence assertion correctly removed. |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-observation.test.ts` | Added | Failure observation / evidence safety contract | No-provider post failure: original error rethrown, observation before termination, owned root removed, network unused, secret-like arbitrary error content absent. Registry/mocks restored. |
| `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | Updated | REQ008 / AC010/012; public settings contract | Real GraphQL schema and initialized owned AppConfig; absent tuple not written, persisted tuple reloaded, invalid tuple preserves baseline, exact numeric setting succeeds and credential-like name remains rejected. Environment restored. |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts` | Added | REQ006 / AC002/007/016; direct first/repeated semantic samples | Actual direct strategy/factory/parser; first response becomes repeated input; corrections/exact references/pending approval checked. Keyword alarms explicitly not semantic completeness proof; retained manual source/output assessment supplies that separate observation. Explicit live/preflight gates are justified, not hidden skips. |
| `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts` | Updated | REQ007 / AC008/012; current writer/reader continuation | Changes stale v5 title/key expectation to current versionless writer shape only. Restore, validated serialization, original content and subsequent assistant continuation assertions retained. Not a released-v5 migration test. |
| `autobyteus-web/stores/__tests__/retainedActivityTermination.spec.ts` | Updated | Preserved history / SCN006-related regression | Typed strict snapshot adds `agent_input_states: []` and idle `recoverableBlock: null`. Parser remains real; all eight cases and their original assertions remain. Real stores/stream handlers/renderer with external I/O substituted; not desktop/cold-replay proof. |

No durable test file changed: **No** (11 cumulative paths). Related unchanged consumer `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts:116–157` was inspected solely to follow TR-001's emitted claim; it was not falsely counted as a twelfth API-owned changed path.

## Proportional Test-Code Checks

No implementation-source size thresholds, forced file splitting, full structural scorecard or reviewer confidence score applied.

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Coherent harness, settings, snapshot, retained-activity and semantic boundaries. |
| Assertions prove approved requirements rather than incidental details | **Fail** | Main behavior assertions are meaningful; TR-001's constant proof field has no remaining corresponding observation. |
| Fixtures/setup/helpers reuse meaningful repetition | Pass | Shared content builder, flow wrapper, owned settings initializer, renderer setup and safe-error helper. |
| Isolation and determinism appropriate to boundary | Pass | Owned temp storage, environment/registry/mock restoration; explicit selected live scenarios and preflight. Model samples deliberately nondeterministic and manually assessed; not reported as universal reliability. |
| Large files coherent and navigable | Pass | Existing capability harness and settings schema suites retain named behavior sections; no size-driven split needed. |
| No stale/duplicated/unjustifiably disabled/compatibility-only tests | **Fail** | TR-001 retains a stale result assertion in the registered consumer. Other reviewed corrections remove obsolete expectations; live gating is justified. |
| Added/updated/removed coverage agrees with investigation/execution | **Fail** | Main coverage reconciles; one emitted Verified claim overstates what its current test code observes. No removed tests. |
| Test callers/fixtures reproduce independently established scenarios | Pass | Approved native work/settings/restore/termination contracts establish scope; fixtures do not authorize new concurrency, persistence or glyph rules. |
| Real trigger and actor/event steps appropriate to test boundary | Pass | Flow uses ordinary `postUserMessage` and real tools/threshold; GraphQL uses public mutations; restore uses writer/store/factory; renderer uses real actions and parsed stream fixtures. Direct semantic pair intentionally does not claim a second automatic host commit. |

## Findings

### TR-001 — Remove the retired shield-omission verification claim (Local Fix)

**Path:** `test-support/live-e2e/live-e2e-harness.ts:150,1062`; related unchanged consumer `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts:141,157`.

The F006 correction correctly removed `shieldOmissionPressureVerified` from `inspectDirectSummaryRequest` and removed the whole-history shield-absence requirement. However, the returned flow type and successful result still declare **`directSummaryShieldOmissionPressureVerified: true`** unconditionally. The registered test asserts that literal and prints it. API007's actual `flow.log` contains the flag as true. Current checks prove source immutability, valid Unicode, framing and tool-tail presence; none independently calculates the retired shield-omission observation. The consumer therefore passes and publishes this particular claim without proving it.

- **Independent governing contract / actor:** TESTING.md rule 6 (assertions first), and the successful-review requirement that asserted coverage match execution; API validator and downstream delivery reviewer rely on evidence fields when evaluating the normal explicit live campaign.
- **Forward path/lifecycle:** registered real-provider test → `executeCompactionAgentFlow` → successful return's constant → consumer `toMatchObject(true)` → JSON stdout artifact. This is reachable in the completed API007 run, not a hypothetical production sequence.
- **Disposition: Promote**, test-evidence correctness only. This neither establishes a production compaction defect nor reintroduces a requirement that a glyph disappear. **No source score deduction or confidence rescoring.** F006's substantive Unicode correction remains valid. CRR007 checked the removed predicate but missed this leftover result/consumer assertion; that bounded review gap is acknowledged.
- **Required action:** retire this unsupported flag from the flow result type/value and its consumer expectation, or replace it only with a precisely named observation genuinely supported by existing valid checks. **Do not restore the rejected whole-history glyph ban or add a new product requirement.** Add/update a small offline regression for the reporting contract; annotate the historical emitted field as unsupported without rewriting original logs. Retain the other valid proof fields and successful behavioral evidence.
- **Owner/classification:** `api_e2e_engineer` / **Local Fix**. The consumer may become an additional cumulative changed test path in the return package.
- **Verification scope:** targeted offline test/report-contract validation is sufficient for this correction; no new provider campaign, changed approval or production implementation is requested. A passing rerun alone is not proof unless it checks the corrected field/consumer contract.

No other actionable finding identified in the 11-path review. Evidence: `code-review-evidence/crr-012/TR-001-evidence.json`, `stale-claim-runtime-excerpt.json`, and the preserved cumulative patch.

## Execution Evidence And Limits

No successful workflow or tests rerun by this reviewer: the diff/current assertions and retained evidence suffice. No independent desktop/provider result is claimed.

- Inspected API007 logs: 18 harness + 10 boundary/observation checks; real flow 2 tests and semantic pair 1 test; final core334/41, settings/history20/3, strict compaction DTO3/1. API006 retained-activity correction log is 8Pass/1. These are attributed groups, **not an overlapping grand total**.
- API007 real campaign evidence records 8 parent + 3 compactor requests, actual 5% threshold crossing, snapshot/next-request equality and exact continuation artifact. Manual first/repeated/flow assessment stays scoped; direct semantic pair is distinct from automatic repeated replacement.
- New UI evidence records Team A/B timeout followed by genuine C recovery (not retroactive B success), Org A→B, actual consumed read/result/follow-up with no replay, 35 local requests and 52 offline assertions. Protocol emulation is not model inference. API006 actual three-root termination/reconnect/cold reader evidence remains separately attributed; withdrawn authored reload claims remain withdrawn.
- API007's **reported Pass95.0** remains the upstream execution result; this **test-review Fail** blocks Delivery pending the bounded reporting correction. It does not erase successful observations or reopen implementation review.
- Preserve F005 SR020 accepted known/nonblocking **not fixed/Pass**, Qwen STOP; F004 historical unknown; F006 substantive correction; SR022 exhausted one fidelity failure/three usable, v6 unapproved.
- Preserve CG033 first-auto preparation timeout **unproved/not fixed/not pump Pass/not executed baseline**; no immediate-preparation latency guarantee or shutdown redesign. Plain web tsc OOM→8GB exit2/7078 including five changed-test Vue imports is not vue-tsc/full typecheck Pass or comparable to historical6836. Fourteen wider residuals and seven baseline contract failures remain unresolved/unwaived.
- No native physical drag/seven-member concurrent UI/all-model reliability/whole-power-loss guarantee. Seven-member atomic staging is repository evidence; current Team2/Org3 journeys each use one recovering member. Native live-memory retention is not persisted native cold replay.
- Delivery/docs/integrated verification/explicit user verification/finalization/release remain pending.

## Latest Authoritative Result

- **Result: Fail — Local Fix (API/E2E-owned test/report correction).**
- Changed durable paths reviewed: **11**, none removed.
- Unresolved finding: **TR-001**.
- Recommended recipient: **`/api_e2e_engineer`**, subject to fresh result routing.
- Source report preserved; no production/test edits, staging, commit, remote refresh, provider calls, user-app access or unrelated cleanup by reviewer. Evidence and pin audits are under `code-review-evidence/crr-012/`.
