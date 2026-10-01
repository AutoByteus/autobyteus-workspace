# API/E2E Test Review Report

## Review Meta

- Review round: **CRR-013**, 2026-10-01; proportional successful-validation test-code re-review.
- Trigger: **API-REV-008 Pass / 95.0%** reporting Local Fix for CRR012/TR-001. Current independent test-review result: **Pass; TR-001 closed**. This is not implementation-source or API failure-origin review.
- Context authorities: `requirements-doc.md` Approved SR033 (SR028 baseline), `investigation-notes.md`, `solution-revision-record.md`; `design-spec.md` Ready SR034; `design-review-report.md` / `architecture-review-revision-record.md` ARCH-REV004; `implementation-handoff.md` / `implementation-revision-record.md` IR007.
- Relevant supplements: SR020 accepted deviation, SR022 diagnostic limits, SR031 supported-scenario clarification, SR032/033 terminal activity approval and SR034 retention design. No intended-behavior change.
- Original implementation review: **`code-review-report.md`, CRR-011 Pass 9.40/10**, byte-identical; not reopened or rescored.
- Cumulative history: `code-review-revision-record.md`; CRR001 baseline and CRR012 historical **Fail** retained. CRR012 canonical report beforeimage is `code-review-evidence/crr-013/entry-api-e2e-test-review-report.md`.
- API inputs: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`; API008 exact correction patch, beforeimages, red/green/related logs, historical annotation and cumulative 12-path inventory.
- Final validation confidence: **95.0% upstream API-owned**, not a reviewer score. API007 historical execution Pass95.0 and actual successes preserved; unsupported field excluded.
- Task size / architectural risk: **Large / High**, unchanged. Product Design / delivery revision: **N/A — not applicable**.
- Prior unresolved test finding rechecked: **TR-001**, now independently closed by exact source/consumer removal and truthful historical annotation.
- Supported scenario/contract basis confirmed: **Yes**. Existing SCN001/003 native work, settings, SCN004 restoration, SCN005 ordinary later-admission recovery and SCN006 termination/history remain the cumulative basis. Current delta concerns only TESTING.md rule6/asserted-evidence accuracy, not a new product scenario or Unicode policy.
- Checkout: branch `codex/context-compaction-simplification-analysis`, HEAD `6908ccff483f1eca522caa65bfaaf6dcfcc26750`; **pending worktree authoritative**. All2565 incoming references exist and are pinned. All12 durable hashes match API008; nine match the prior independent CRR012 review.

## Changed Durable Test Scope

Cumulative scope is **12 paths**, none removed. CRR012's valid review evidence is reused for nine byte-identical paths and unaffected behavior in two returning files. Focused current inspection covers the three API008 edited paths: harness, boundary suite and newly cumulative provider-capabilities consumer. The exact three-file correction patch was independently reconstructed from beforeimages and current source, byte-identical to API's patch. The consumer's beforeimage equals HEAD.

Temporary probes, logs, screenshots and execution-only artifacts are supporting evidence, not durable production code under review.

| Durable test path | Change | Requirement / responsibility | Review evidence |
| --- | --- | --- | --- |
| `test-support/live-e2e/live-e2e-harness.ts` | Updated | SCN001/003; AC001/003/004/010/011/016; real native agent flow and observations | Normal AgentRun composition with owned attachment resolver, real tool registration, threshold crossing, exact tool pairs, archive/snapshot/next-request equality and synthetic-source continuation. TR-001 type/result flag removed; valid checks unchanged. |
| `test-support/live-e2e/run-live-e2e.mjs` | Updated | Explicit live-provider validation / isolation | Adds quality file to existing runner, preserving selected scenarios, preflight, sanitized child environment, evidence scan and owned cleanup. |
| `test-support/live-e2e/compaction-quality-checks.ts` | Added | REQ006 / AC007; controlled planned-versus-completed alarm | Explicitly fixture-specific, not a universal semantic evaluator; positive, negative and negated examples maintained. Manual review remains necessary. |
| `test-support/live-e2e/live-e2e-safe-error.ts` | Added | Test evidence confidentiality | Bounded cause traversal; allowlisted categories/codes/conditions and numeric HTTP status; arbitrary exception text/stack/headers omitted. |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` | Updated | Harness composition / established attachment ownership contract | Real package scan distinguishes admitted and unadmitted owner; copied provider input versus original recording locator checked. Canonical event facade exercised; temporary roots/readiness index cleaned. |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-boundary.test.ts` | Updated | AC011/015/016; test setup and Unicode boundary | Real content builder/exact v5; tool registration checked before stubbed generation boundary. Ordinary emoji/literal replacement character allowed; lone surrogate rejected. Source immutable. Prior whole-history glyph-absence assertion remains removed. Two new read-only source reporting-contract cases detect the retired producer/type and consumer field; not live execution. |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-observation.test.ts` | Added | Failure observation / evidence safety contract | No-provider post failure: original error rethrown, observation before termination, owned root removed, network unused, secret-like arbitrary error content absent. Registry/mocks restored. |
| `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | Updated | REQ008 / AC010/012; public settings contract | Real GraphQL schema and initialized owned AppConfig; absent tuple not written, persisted tuple reloaded, invalid tuple preserves baseline, exact numeric setting succeeds and credential-like name remains rejected. Environment restored. |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts` | Added | REQ006 / AC002/007/016; direct first/repeated semantic samples | Actual direct strategy/factory/parser; first response becomes repeated input; corrections/exact references/pending approval checked. Keyword alarms explicitly not semantic completeness proof; retained manual source/output assessment supplies that separate observation. Explicit live/preflight gates are justified, not hidden skips. |
| `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts` | Updated | REQ007 / AC008/012; current writer/reader continuation | Changes stale v5 title/key expectation to current versionless writer shape only. Restore, validated serialization, original content and subsequent assistant continuation assertions retained. Not a released-v5 migration test. |
| `autobyteus-web/stores/__tests__/retainedActivityTermination.spec.ts` | Updated | Preserved history / SCN006-related regression | Typed strict snapshot adds `agent_input_states: []` and idle `recoverableBlock: null`. Parser remains real; all eight cases and their original assertions remain. Real stores/stream handlers/renderer with external I/O substituted; not desktop/cold-replay proof. |

| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Updated; newly cumulative | Truthful live-flow result reporting / TR-001 | Removes only the retired expectation; exact valid fields, preflight/scenario gates, assertions and generic JSON serializer retained. Beforeimage equals HEAD; no unrelated consumer delta. |

No durable test file changed: **No**. Twelve cumulative paths, three current-round edits (two existing plus one newly cumulative). No source-size thresholds, forced splitting, full structural scorecard or confidence rescoring.

## Proportional Test-Code Checks

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Prior coherent suites preserved. New cases explicitly name retirement of unsupported reporting, with static-only comments. |
| Assertions prove approved requirements instead of incidental details | Pass | New guards check the exact retired reporting key in actual producer/type and registered consumer. This is a source-reporting contract, not runtime behavior proof. Exact diff confirms actual property/expectation removal; retained-field string checks alone are not treated as semantic validation. |
| Fixtures/setup/helpers reuse meaningful repetition | Pass | One two-source parameterized guard reuses fs/import.meta.url and existing isolated suite. No duplicate runtime campaign or new abstraction. Prior reusable helpers unchanged. |
| Isolation and determinism appropriate to boundary | Pass | New cases read repository text only; URLs resolve from the test module, not shell cwd. Existing registry/mock restoration retained. Live nondeterminism remains separately attributed to prior campaign/manual evidence. |
| Large files coherent and navigable | Pass | Existing capability harness/settings responsibilities unchanged. No size-driven split required. |
| No stale/duplicated/unjustifiably disabled/compatibility-only tests | Pass | Retired result assertion removed, not skipped or replaced by a constant. Existing executable Unicode/framing controls remain. Narrow -t deliberately deselects eight; full related run has zero skips. |
| Coverage agrees with investigation/execution | Pass | Twelve-path inventory reconciles. Same guards red2Fail then green2Pass, related30Pass; no runtime/model claim from source guards and no overlapping grand total. Historical unsupported flag explicitly excluded. |
| Test callers/fixtures reproduce independently established scenarios | Pass | Existing approved scenarios reused; truthful evidence contract independently justifies retirement. No new glyph ban, concurrency or persistence requirement. |
| Real trigger and actor/event steps appropriate to boundary | Pass | Existing flow still uses normal user messages/tools/threshold; new static guard reads exact registered producer/consumer. Three-line deletion does not alter generation or actor steps. Prior settings/restore/renderer boundaries retain their narrower proof. |

## Findings And Prior-Finding Closure

**No unresolved actionable test-code finding. TR-001 — Closed.**

- **Governing contract / actor:** TESTING.md rule6 (assertions first) and accurate asserted coverage; API validator and Delivery reviewer consume the explicit live campaign's result.
- **Supported path / lifecycle:** registered real-provider compaction test → successful `executeCompactionAgentFlow` result → consumer assertions → unchanged generic JSON stdout. CRR012's finding was evidenced by actual API007 output, not an invented product sequence.
- **Correction verified:** `live-e2e-harness.ts` removes the retired property from the type (between current lines149–150) and return (1060–1061). `real-e2e-provider-capabilities.e2e.test.ts` removes its expectation (140–141); line156 still serializes `JSON.stringify(result)`. Exactly three deleted lines; no masking or replacement proof constant.
- **Regression verified:** `live-e2e-compaction-boundary.test.ts:26–43` adds two source reporting-contract checks. Both actual files must lack the retired key and retain the named valid fields. Red log fails at line34 for each target; same named command passes after removal. Other assertions and setup are byte-preserved, including ordinary emoji/literal U+FFFD acceptance, malformed-surrogate rejection, framing and source immutability.
- **Historical truth preserved:** `api-e2e-evidence/api-rev-008/historical-claim-annotation.md` and `.json` explicitly mark API007 `flow.log:475` emitted true as unsupported/not calculated/excluded. Original SHA256 independently verified: `66411303344b6c8ca6e894822df1a04a822952f20be6076297ed4b1f6e54f250`. Raw log and original CRR012 evidence remain unchanged.
- **Disposition:** prior promoted reporting defect resolved; F006 substantive Unicode correction retained. CRR007's previously acknowledged missed leftover result/consumer remains historical reviewer gap, not erased by closure. No production defect, restored whole-history glyph/U+FFFD ban, new mechanism, source deduction or retrospective API007 rescore.
- **Owner/action:** API-owned Local Fix complete and independently verified; no further TR-001 action required.

Evidence: `code-review-evidence/crr-013/TR-001-reviewed.patch`, `TR-001-closure-audit.json`, `durable-hash-audit.json`; API008 beforeimages, exact commands/logs and sidecars. Earlier CRR012 reviews of F001, F007, versionless restore and CG034 retained-activity fixture corrections remain valid; hashes show no new delta in those nine paths.

## Execution Evidence And Limits

No tests, successful live workflow or provider/UI campaign rerun by this reviewer. Current source/diff and existing execution evidence suffice for the changed assertions; no focused execution gap remains.

- API008 named offline guard: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-compaction-boundary.test.ts -t 'retires unsupported omission-pressure reporting' --no-watch`. Expected **2Fail/8deselected** before deletion, **2Pass/8deselected** after. Initial wrong-cwd ENOENT was before Vitest and is separately preserved, not red proof.
- API008 full related harness/boundary/observation command: **30Pass/3files/0skipped (18+10+2)**. Exact argv/cwd/times/exit codes in API008-C01.json/log. Narrow and historical runs overlap and are not added together. New guards are static reporting evidence only.
- API008 broader validation **Not Required** is proportionate for this deletion/reporting-only correction; no production/prompt/generation/UI/lifecycle change. Prior runtime evidence remains attributed to its actual executions, not newly reproduced.
- API007 real campaign: 8 parent +3 compactor requests, actual 5% threshold crossing, tools, exact artifact, snapshot/next-parent equality and manual three-output assessment remain scoped evidence. Direct first/repeated sample is distinct from automatic repeated replacement; not universal semantic reliability.
- Actual API007 Team B timeout followed by genuine C recovery is **not retroactive B Pass**. Org A→B and consumed-tool read/result/follow-up/nonreplay retain prior actual UI/raw attribution; local protocol emulator is not model inference. Prior API006 actual three-root termination/reconnect/current/cold-reader evidence remains separately attributed; withdrawn authored reload/reopen claims remain withdrawn.
- API006 historical Blocked89.3 authorization premise was corrected; API007 interim92.9 was incomplete. Neither is reinstated as an active blocker. API007 historical and API008 current execution **Pass95.0** are upstream results; this independent test-review Pass closes the reporting gate only.
- Preserve F005 SR020 accepted known/nonblocking **not fixed/not Pass**, **Qwen STOP**; F004 historical cause unknown; F006 substantive correction; SR022 exhausted **one fidelity failure/three usable**, v6 unapproved.
- Preserve CG033 first-auto preparation timeout **unproved/not fixed/not pump Pass/not executed baseline**, before backend shutdown. No immediate-preparation latency guarantee or new shutdown policy.
- Plain web tsc OOM→8GB exit2/**7078** (including five changed-test Vue imports) is **not vue-tsc/full typecheck Pass/not comparable to6836**. **14 wider residuals +7 baseline contract failures remain unresolved/unwaived**.
- No unsupported same-ID workflow, native cold replay, physical drag/hit-testing, seven-member concurrent UI or whole-power-loss guarantee reinstated. Seven-member atomic staging is repository evidence; actual Team2/Org3 journeys have one recovering member. Native live-memory retention differs from current/cold history readers; per-file atomicity is not whole-operation crash atomicity.
- API008 owned temporary flow roots removed and standard worktree test DB retained per upstream cleanup; no new service/browser/provider execution. Reviewer performs no unrelated cleanup.
- **Delivery/docs/integrated verification/explicit user verification/finalization/release remain pending.** This Pass is not Delivery Completed or a full-suite waiver.

## Latest Authoritative Result

- **Result: Pass — proportional successful-validation test-code re-review.**
- Changed durable paths reviewed: **12 cumulative; three current-round edited; nine unchanged reused; none removed.**
- Unresolved finding IDs: **None. TR-001 closed.**
- Recommended recipient: **`/delivery_engineer`**, subject to fresh result routing.
- Source CRR011 report preserved byte-for-byte. CRR012 historical Fail retained in revision history and saved report beforeimage. Only reviewer report/history/evidence written; no source/test edits, staging, commit, remote refresh, provider calls or user-app access.
