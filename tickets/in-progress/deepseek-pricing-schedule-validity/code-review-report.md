# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/requirements.md`
- Investigation Notes Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/investigation-notes.md`
- Design Spec Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: None.
- Solution Revision Record Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`
- Design Review Report Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`
- Implementation Handoff Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Trigger: Initial implementation-source review requested by `/implementation_engineer` for commit `c501ceed9de0f03890a57dcd0c6eb9b707037f2d` against recorded base `fd9b33e20ace3e7c221f931dbbcd5f4acf1df65f`.
- Prior Review Round Reviewed: None.
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed (failure-origin entry point): N/A
- Execution Coverage Report Reviewed (failure-origin entry point): N/A
- API/E2E Revision Record Reviewed (failure-origin entry point): N/A
- Relevant API/E2E Revision IDs: N/A
- Delivery Revision Record Reviewed (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: N/A
- Exact Failing Commands / Execution Mode: N/A
- Failure Evidence Paths: N/A

## Review Scope

- Changed implementation and behavior reviewed: Clean replacement of the singular DeepSeek schedule with effective-dated fixed/time-window history; catalog/config/factory projection; provider-owned pure selection; resolved-policy provenance; invalid-time behavior; focused tests; singular-path cleanup; durable pricing contract update.
- Files / areas reviewed: All eight changed implementation-source files, both changed unit-test files, `provider-error-and-pricing-contract.md`, the implementation commit/diff, and the supported event/calculator/accumulator/persistence path needed to verify BEH-001–BEH-005.
- Explicit exclusions: API/E2E coverage investigation and execution; remote vendor-catalog freshness; repair of already-persisted pricing outcomes; unrelated server-wide Prisma/generated-client and SDK build-state failures.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. The review used BEH-001–BEH-005, REQ-001–REQ-012, AC-001–AC-012, and the explicit no-rewrite/out-of-scope guardrails as authority.
- Design-spec behavior map verified against the implementation: Mostly. The catalog -> `LLMFactory` -> `TokenPriceConfigProvider` -> selector -> calculator path and immutable stored-outcome boundary are preserved, but BEH-003/REQ-008 is contradicted by the invalid-time trusted-dimension mapping.
- Design review report and round confirmed: Yes; `ARCH-REV-001` passed the design without findings.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: No new supported behavior. The contradiction is an implementation defect on approved BEH-003.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Supported DeepSeek observation -> event enrichment/accumulator -> calculator -> provider -> `LLMFactory` history -> pure selector. The selector consumes `peakDays`, `peakDaysTimezone`, `windowTimezone`, and half-open windows. A removed reviewer-only probe passed the approved weekend/weekday and independent-calendar scenarios. | N/A |
| `BEH-002` | Confirmed | The selector parses `observed_at`, filters eligible effective instants, and reduces to the latest version without depending on declaration order. The reviewer-only probe passed prior-flat, both exact cutovers, window boundaries, and reversed-history cases. | N/A |
| `BEH-003` | Contradicted | Invalid `observed_at` makes the selector return `null`; the provider correctly makes scheduled prices/status missing, and the calculator carries that policy into the event result. | `token-price-config-provider.ts:34-43` chooses base catalog trusted dimensions because `schedule` is `null`, even though lines 44-56 use the presence of `scheduleHistory` to fail prices/status closed. Thus an invalid scheduled timestamp reports scheduled input/output/cache-read dimensions as trusted, contrary to REQ-008. See `CR-001`. |
| `BEH-004` | Confirmed | Selected schedule/period/effective instant and independent window/day provenance are mapped into `ResolvedTokenPricingPolicy`; `TokenCostCalculator.applyPolicy` stores the selected policy as `pricing_snapshot_json`; the key suffix distinguishes schedule and period. | N/A |
| `BEH-005` | Confirmed | No persistence/query source or schema changed. Policy is still resolved while enriching/accumulating observations, and stored summaries remain the query source. | N/A |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The implementation performs the approved bounded history refactor and does not introduce refresh or old-record repair machinery. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No supplemental artifact applies. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001–DS-004 remain traceable through the catalog, factory, provider, selector, calculator, and unchanged persistence path. | None. |
| Ownership boundary preservation and clarity | Pass | Provider facts remain in `autobyteus-ts`; server evaluation remains in the token-pricing subsystem; the calculator has no DeepSeek branch. | None. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Calendar/history evaluation is isolated beside the provider; history construction stays with the catalog. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | One bounded selector file extends the existing pricing subsystem as reviewed. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | One canonical history/period type family crosses config, factory, and server boundaries. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | Fixed and time-window versions are discriminated; fixed versions do not carry dummy window/day fields; the singular representation is removed. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Selection is centralized in `selectTokenPricingSchedulePeriod`; callers do not repeat weekday/history policy. | None. |
| Empty indirection check (no pass-through-only boundary) | Pass | `TokenPriceConfigProvider` still owns lookup, failure mapping, provenance, and policy identity; the selector owns temporal evaluation. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | File allocation matches the reviewed design. | None. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | Server imports canonical shared types, not DeepSeek definitions; shared code does not depend on server selection. | None. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | Calculator calls only the provider; the provider alone calls factory and selector. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | Changed paths match the catalog/config/factory and server-pricing owners. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | One new selector beside its provider is proportionate. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | History transport, pure selection, and resolved-policy mapping remain separate interfaces. | None. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Fail | Core types are named well, but the new financial/calendar policy code is compressed into multi-action lines and the selector's chosen schedule is named `effective`, obscuring auditability. See `CR-004`. | Reformat the changed core and use names/steps that expose selection intent without adding another abstraction layer. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | DeepSeek windows/periods are shared by the history creator; selector coordinate logic is centralized. | None. |
| Patch-on-patch complexity control | Pass | Clean singular-to-history replacement; no dual transport or compatibility fallback. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | Runtime singular references are removed, but the durable contract still says it does not authorize historical pricing and omits the required rate contract. See `CR-003`. | Complete the contract cleanup and rate description. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | The new selector has no durable unit test; the retained focused tests do not prove the cutovers, weekend/calendar axis, boundaries, or full provenance. See `CR-002`. | Add the implementation-scoped selector/provider/catalog cases required by AC-001–AC-009. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Fail | No selector fixture/test exists, so the approved synthetic history mutation cannot be retained or reused. See `CR-002`. | Add a coherent selector fixture/table rather than duplicating policy construction across callers. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The two pre-cutover expectations now select `flat`; no singular-contract assertion remains. | None. |
| API/E2E readiness for the next workflow stage | Fail | The invalid-time output contradicts REQ-008, and implementation-scoped calendar/history invariants are not durably proven. | Resolve `CR-001`–`CR-004`, rerun focused checks, and return through source review before API/E2E. |

## Source File Size And Structure Audit (If Applicable)

Effective counts are non-empty lines in the reviewed worktree. Test files are intentionally excluded from size thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts` | 154 | Pass | N/A | Fail locally — invalid-history selection uses the wrong dimension gate (`CR-001`). | Pass | `Local Fix` | Fail dimensions closed whenever a present schedule history cannot select a period. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts` | 60 | Pass | N/A | Pass | Pass | Pass | None. |
| `autobyteus-server-ts/src/token-usage/pricing/token-pricing-schedule-selector.ts` | 30 | Pass | N/A | Pass structurally; local readability fails (`CR-004`). | Pass | `Local Fix` | Reformat/decompose dense expressions and add the missing direct test in the matching test folder. |
| `autobyteus-ts/src/llm/llm-model-pricing.ts` | 126 | Pass | N/A | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/model-pricing-types.ts` | 52 | Pass | N/A | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | 458 | Pass | Pass — no effective-line growth and only catalog-owned DeepSeek arguments changed. | Pass | Pass | Pass | Reformat the two changed DeepSeek pricing constructions as part of `CR-004`; no file split required. |
| `autobyteus-ts/src/llm/utils/llm-config.ts` | 427 | Pass | Pass — no effective-line growth and the change remains inside config transport. | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/utils/token-pricing-schedule.ts` | 31 | Pass | N/A | Pass structurally; local readability fails (`CR-004`). | Pass | `Local Fix` | Restore readable type/history construction layout; no new subsystem/file is required. |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No singular/plural dual read or alias. |
| No legacy old-behavior retention in changed scope | Pass | The old embedded selector and one-version creator are removed. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Runtime source is clean; the remaining contradiction is in the changed durable contract and is tracked separately as `CR-003`. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | No schema, migration, repair, or read-time repricing was added. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | History is the sole schedule transport. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Existing snapshots are left untouched and new snapshots carry selected policy data. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None in runtime source. The stale durable-contract statement is tracked in `CR-003` rather than as a runtime compatibility path.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: REQ-012 requires the active provider/pricing contract to describe the new history, exact prior flat rates, calendar/window selection, and immutable stored outcomes. The changed document remains internally contradictory and incomplete.
- Files or areas likely affected: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/provider-error-and-pricing-contract.md`

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

None.

No new or reclassified material premise was needed. `CR-001` follows the approved BEH-003/REQ-008 governing contract for an invalid DeepSeek observation and traces the established event -> calculator -> provider path. The coverage, documentation, and readability findings rely on approved acceptance criteria or engineering contracts, not hypothetical production scenarios.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `8.6`
- Overall score (`/100`): `86.4`
- Score calculation note: Simple average of the ten category scores; the failing categories and findings govern the decision.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.2 | The implementation preserves all four reviewed spines and the real observation-to-stored-outcome path. | BEH-003's return state is inconsistent at the provider mapping step. | Correct the invalid-selection dimension mapping. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.3 | Catalog facts, factory lookup, provider sequencing, pure evaluation, arithmetic, and persistence remain correctly owned. | No material boundary defect; only local provider mapping is wrong. | Keep the same ownership while applying the local fix. |
| `3` | `API / Interface / Query / Command Clarity` | 9.1 | History transport and selector/provider interfaces have explicit subjects and provider-neutral inputs. | The dense selector body makes its otherwise clear result contract harder to audit. | Reformat and name the selected schedule explicitly. |
| `4` | `Separation of Concerns and File Placement` | 9.0 | The one new file is proportionate and all changed responsibilities remain in their reviewed owners. | Local expression density weakens concern readability even though placement is sound. | Reformat without adding more files or layers. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.1 | Fixed/time-window variants are tight and singular transport is removed. | Exact history facts are weakly asserted by current durable tests. | Add catalog assertions for the exact rates/cutovers/day/timezone fields. |
| `6` | `Naming Quality and Local Readability` | 7.8 | Public type/function names are generally accurate. | `CR-004`: multi-statement/multi-concern lines, repeated parsing inside one expression, and 267–371 character history/catalog lines make financial calendar policy difficult to review. | Use conventional multiline formatting, explicit local names, and readable selection steps. |
| `7` | `API/E2E Readiness` | 7.2 | Reviewer probes show the main valid-time algorithm can produce approved outcomes. | `CR-001` is an approved-behavior defect, and `CR-002` leaves the core selector with no durable direct coverage. | Fix invalid dimensions and add implementation-scoped calendar/history regression tests before advancing. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.0 | Prior flat, both cutovers, weekday/window axes, policy identity, and normal valid-time outcomes align in source and temporary probes. | `CR-001`: invalid-time policies retain catalog-trusted scheduled dimensions, contradicting REQ-008. | Gate missing-selection dimensions on history presence and assert the complete fail-closed policy. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.7 | Runtime singular schedule transport, old selector, aliases, and fallbacks are removed cleanly. | No runtime weakness; stale documentation remains outside this category. | Preserve the clean-cut model during fixes. |
| `10` | `Cleanup Completeness` | 8.0 | Runtime searches find no active singular schedule path. | `CR-003`: the authoritative contract retains a no-historical-pricing statement and omits required exact rates; `CR-002` also leaves the planned selector test absent. | Complete documentation and test cleanup from the reviewed removal plan. |

## Findings

### `CR-001` — Invalid scheduled timestamps retain trusted scheduled dimensions

- Classification: `Local Fix`
- Affected approved behavior: `BEH-003`, `REQ-008`, `AC-008`.
- Supported initiating basis and path: The approved pricing contract permits a supported DeepSeek token-usage observation with an invalid `observed_at`. Normal processing is `TokenUsageEventEnrichmentTransformer.transform` -> `TokenCostCalculator.enrichCost` -> `TokenPriceConfigProvider.resolvePolicy` -> `toPolicy` -> `TokenCostCalculator.applyPolicy` -> event/snapshot result.
- Source evidence: In `token-price-config-provider.ts:30-33`, invalid time yields no `selected` schedule/period. Lines 44-56 correctly use `scheduleHistory` to return missing status and null scheduled prices. Lines 34-43 instead test `schedule`; because it is `null`, they copy the base DeepSeek catalog dimensions (`input`, `output`, and cache read trusted) into the missing policy.
- Material consequence: The produced pricing snapshot claims scheduled dimensions are trusted while the same policy says schedule time is invalid and all scheduled prices are missing. That directly violates REQ-008's fail-closed untrusted-dimension requirement.
- Required action: Use the presence of scheduled history/selection failure—not selected schedule presence—to return `emptyTrustedDimensions()`, and extend the invalid-time provider test to assert all scheduled trusted dimensions are false.
- Recommended owner: `/implementation_engineer`

### `CR-002` — The new history/calendar selector has no durable requirement-level coverage

- Classification: `Local Fix`
- Affected approved behavior: `BEH-001`–`BEH-004`; `AC-001`–`AC-009`; the reviewed file/test map and change sequence.
- Evidence: `autobyteus-server-ts/tests/unit/token-usage/pricing/token-pricing-schedule-selector.test.ts` was not added. The changed provider suite covers only two pre-cutover Flash observations and invalid time; it does not assert the post-cutover weekend/weekday outcomes, middle-version weekend, exact cutovers, half-open boundaries, configured calendar/day mutation, full provenance, or Pro prior rates. The catalog test only checks that three IDs/effective instants are present via `arrayContaining`.
- Review verification: A temporary reviewer-only selector probe (removed after execution) passed 15 cases spanning AC-001–AC-007, reversed history, and invalid time. That increases source confidence but is not repository-resident coverage and cannot satisfy AC-007's explicit mutation-resistant proof.
- Material consequence: The behavior that distinguishes a correct data-driven calendar implementation from a hard-coded/UTC-day implementation can regress without a failing implementation-scoped test, and downstream API/E2E would receive a source package that has not met its reviewed unit-test contract.
- Required action: Add the reviewed direct selector test with the synthetic `16:30Z` timezone/day-set mutation and declaration-order independence; expand provider/catalog tests to cover exact cutovers, current weekend/weekday behavior, exact rate triples, full selected provenance, and the corrected invalid-dimension outcome. Keep downstream API/E2E investigation separate.
- Recommended owner: `/implementation_engineer`

### `CR-003` — The active pricing contract is still contradictory and omits the required rate facts

- Classification: `Local Fix`
- Affected approved behavior: `REQ-012`, `UC-005`, and the design removal/decommission plan.
- Evidence: `provider-error-and-pricing-contract.md:5` still says the supplement "does not authorize ... historical pricing," while lines 57-65 now define historical effective-dated pricing. The revised DeepSeek sections also removed the price table without recording the required prior flat rates (Flash `$0.0028/$0.14/$0.28`; Pro `$0.003625/$0.435/$0.87`) or the exact current rate triples.
- Material consequence: The canonical durable contract gives mutually incompatible guidance and does not satisfy REQ-012's explicit prior-flat-rate description, so future maintenance can reintroduce the obsolete single-current assumption or lose the audited rate basis.
- Required action: Remove/qualify the stale no-historical-pricing statement, align the status/acceptance reference with the current requirements basis, and document the exact prior and current Flash/Pro rates with their effective periods while preserving immutable-snapshot and freshness boundaries.
- Recommended owner: `/implementation_engineer`

### `CR-004` — Core pricing history and selector code is unnecessarily compressed

- Classification: `Local Fix`
- Affected engineering contract: Canonical design guidance for naming quality, local readability, file responsibility clarity, and maintainable business-policy code.
- Evidence: `token-pricing-schedule.ts` compresses type members, the nine-field creator input, periods, and complete schedule versions into 144–298 character lines. `token-pricing-schedule-selector.ts` combines formatter construction, part extraction, multiple statements, repeated `Date.parse`, selection, and window matching into dense expressions up to 209 characters. The two changed DeepSeek catalog constructions are 368 and 371 characters. The chosen schedule local is named `effective`, which reads as an adjective rather than the selected version.
- Material consequence: This is the authoritative financial/timezone policy path. The current layout makes effective-date ordering, calendar separation, and rate review materially harder and helped leave the invalid-dimension/test-contract gaps less visible.
- Required action: Apply the repository's conventional multiline TypeScript layout; name the selected version explicitly; separate eligibility/selection/window matching into readable local steps; avoid repeated parsing. Do not add a new service, module layer, or compatibility abstraction.
- Recommended owner: `/implementation_engineer`

## Classification

`Local Fix` — all findings are bounded implementation, implementation-scoped test, documentation, or readability corrections. The reviewed design and approved requirements do not need revision.

## Recommended Recipient

`/implementation_engineer`

Implementation-owned fixes must return through implementation source review before API/E2E coverage investigation and execution.

## Residual Risks

- Server-wide clean typecheck/build evidence remains limited by unrelated generated Prisma/SDK build-state failures. The focused catalog suite passed `4/4`, the focused provider suite passed `7/7`, and no pricing-source diagnostic appeared in the attempted build-source check.
- API/E2E observation-to-persistence coverage has not been investigated or executed; this is intentionally downstream after a source-review pass.
- Remote catalog freshness and already-persisted incorrect outcomes remain explicitly outside scope and unchanged.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Score Summary: `8.6/10` (`86.4/100`); runtime fidelity, test readiness, readability, and cleanup are below the clean-pass threshold.
- Failure Origin (when applicable): Initial implementation-source review found one runtime mapping defect plus implementation-scoped coverage, contract, and readability gaps.
- Recommended Recipient (when applicable): `/implementation_engineer`
- Notes: `CRR-001` is the authoritative initial code-review baseline. Do not advance to API/E2E until `CR-001`–`CR-004` are resolved and re-reviewed.
