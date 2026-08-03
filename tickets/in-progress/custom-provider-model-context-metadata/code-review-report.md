# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `None`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-005`–`SR-008`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`–`IR-003`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Trigger: IR-003 rework at commit `e66b13c19` after CRR-001 finding `CR-001`
- Prior Review Round Reviewed: `CRR-001` — `Fail`, `CR-001`
- Latest Authoritative Round: `ARCH-REV-003`
- Coverage Investigation Reviewed: `N/A` — API/E2E has not started
- Execution Coverage Report Reviewed: `N/A` — API/E2E has not started
- API/E2E Revision Record Reviewed: `N/A`
- Relevant API/E2E Revision IDs: `N/A`
- Delivery Revision Record Reviewed: `N/A`
- Relevant Delivery Revision IDs: `N/A`

## Review Scope

- Changed implementation and behavior reviewed: Full implementation range `d5618bffd..e66b13c19`, with focused re-review of `b8f1dce50..e66b13c19` and the CR-001 resolution.
- Files / areas reviewed: Endpoint metadata parser/resolver and regressions; prior discovery normalization, exact profile/reference/fallback resolution, custom model construction and reload behavior, `ModelInfo`/server propagation, GraphQL projection, token-budget/UI path, localization, and the cumulative implementation artifacts.
- Explicit exclusions: API/E2E coverage investigation and execution, browser-level validation, delivery documentation sync, and the repository-wide web TypeScript check already documented as pre-existing/non-clean in IR-003.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Confirmed` for advertised -> exact endpoint profile/reference -> exact built-in inferred fallback -> unknown precedence, five-kind source propagation, the endpoint-scoped Alibaba wire alias, stale/error preservation, runtime reuse, and truthful unknown-capacity UI.
- Design-spec behavior map verified against the implementation: `Confirmed`. The IR-003 parser retains canonical protocol/hostname/port/base-path identity plus an internal profile-addressability bit; resolver profile lookup is gated on no non-empty URL search/hash, while live and exact fallback behavior remains unchanged.
- Design review report and round confirmed: `Confirmed` through `ARCH-REV-003`; prior architecture findings remain resolved and the implementation handoff explicitly records the IR-003 guard and tests.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: No new behavior. CR-001's previously identified query/fragment profile-match defect is resolved by the approved non-profile-addressable rule.
- Remaining material ambiguity, if any: None for source review. API/E2E and realistic runtime evidence remain downstream validation, not an implementation-source ambiguity.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | `Confirmed` | Discovery normalization retains recognized optional numeric fields, fixed alias precedence, duplicate-row merging, and existing discovery error behavior in `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts`; downstream consumers receive normalized rows. | None. |
| `BEH-002` | `Confirmed` | `OpenAICompatibleEndpointModelProvider` passes each saved endpoint URL and discovered row to the pure resolver; `openai-compatible-endpoint-model-metadata.ts:283-297` applies advertised, exact profile/reference, per-field fallback, and unknown precedence. | None. |
| `BEH-003` | `Confirmed` | Resolved numeric fields are supplied during fresh custom model construction, mapped into `LLMModel`, and consumed by the existing token-budget/compaction path without provider-specific runtime branches. | None. |
| `BEH-004` | `Confirmed` | `openai-compatible-endpoint-model-metadata.ts:139-170` parses the URL while retaining `profileAddressable`; `:283-289` refuses profiles for non-empty search/hash, and `:290-297` preserves advertised/fallback/unknown resolution. | None. |
| `BEH-005` | `Confirmed` | `TokenUsageMeterPanel.vue` keeps the known-capacity meter and renders an explicit unavailable-limit state when capacity is unknown; localized guards/component tests are recorded in IR-003. | None. |
| `REQ-012` / `AC-014` | `Confirmed` | The exact Alibaba profile maps `deepseek-v4-flash-0731` only at the exact Token Plan tuple to `{provider: DEEPSEEK, value: deepseek-v4-flash}`; a different endpoint remains unknown. | None. |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | IR-003 handoff preserves the reviewed boundary/ownership assessment and limits the rework to the endpoint metadata boundary. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Requirements `REQ-011`/`AC-013` and design-spec canonicalization require query/hash variants to be non-profile-addressable; parser and resolver lines `139-170`, `283-289` implement that rule. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Discovery -> resolver -> custom model -> `ModelInfo` -> server -> runtime/UI remains intact; the fix changes only profile eligibility. | None. |
| Ownership boundary preservation and clarity | Pass | URL/profile policy remains owned by the pure endpoint metadata resolver; callers do not duplicate matching or fallback policy. | None. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Provenance, server coarse mapping, stale reload, and UI unknown state remain in their existing owners. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | The internal parser is a minimal extension of the existing endpoint identity policy; no new URL or runtime subsystem was introduced. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | `ParsedEndpointIdentity`, profile records, fallback candidates, and source-bearing fields remain centralized in the metadata owner. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | The internal parsed result composes the existing canonical tuple with one addressability flag; it does not add a parallel public identity shape. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Only the resolver decides profile eligibility, exact profile/reference resolution, fallback selection, and source precedence. | None. |
| Empty indirection check (no pass-through-only boundary) | Pass | The resolver performs the complete canonicalization, exact matching, source resolution, and per-field precedence policy. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | The 268-effective-line resolver remains one cohesive pure endpoint metadata policy; server and UI changes remain localized. | None. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | Discovery/resolver remain independent of server/UI; server consumes `ModelInfo`; runtime/UI do not infer provider limits. | None. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | Custom model construction invokes the resolver and does not inspect profiles/definitions; server consumes the model projection rather than querying endpoints. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` is the established pure endpoint metadata owner. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | The addressability guard is local to the existing metadata file; no artificial split or patch-only helper file was added. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | Public canonicalization remains a tuple projection for existing callers, while the private parser supplies the resolver's explicit addressability decision. | None. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | `parseOpenAICompatibleEndpointIdentity`, `ParsedEndpointIdentity`, and `profileAddressable` accurately name the internal distinction without changing the public tuple API. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | The fix reuses one parser for both public canonicalization and resolver matching; no duplicate identity logic was added. | None. |
| Patch-on-patch complexity control | Pass | IR-003 is a bounded 24-addition/7-deletion source correction with focused regressions and no unrelated refactor. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | The old resolver path was replaced by the guarded path; no dormant alias or compatibility branch remains. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Resolver tests cover exact profile matching, query-only live precedence, query/fragment profile misses, exact fallback after a miss, unknown differing wire ID, and canonical fallback separation. | None. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The metadata suite reuses `discovered`, `definition`, and `staticMetadata` builders; new cases stay in the resolver behavior suite. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The former query-bearing exact-profile fixture was corrected to a true addressable URL; variants now have dedicated assertions rather than preserving a misleading test. | None. |
| API/E2E readiness for the next workflow stage | Pass | Source review is clean and IR-003 records focused implementation checks; the handoff explicitly defers required coverage investigation and execution to `api_e2e_engineer`. | Begin the required coverage investigation before executable coverage execution or durable coverage edits. |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | 268 | Pass | Pass — IR-003 is 24 additions/7 deletions; the 268-line file remains one cohesive pure policy boundary | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | 208 | Pass | Pass — existing normalization remains cohesive | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | 183 | Pass | Pass — shared source union remains focused | Pass | Pass | Pass | None. |
| `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` | 206 | Pass | Pass — server merge/projection remains localized | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/models.ts` | 158 | Pass | Pass — non-secret projection remains localized | Pass | Pass | Pass | None. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | 387 | Pass | Pass — UI state change remains localized to the existing panel | Pass | Pass | Pass | None. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts` | 135 | Pass | Pass — projection update remains small and owner-local | Pass | Pass | Pass | None. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-model-normalizer.ts` | 175 | Pass | Pass — projection update remains small and owner-local | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` | 46 | Pass | Pass — constructor mapping remains focused | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-provider.ts` | 119 | Pass | Pass — lifecycle integration remains focused | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/index.ts` | 16 | Pass | Pass — export-only change | Pass | Pass | Pass | None. |
| `autobyteus-web/localization/messages/en/shell.ts` | 156 | Pass | Pass — one localized message addition | Pass | Pass | Pass | None. |
| `autobyteus-web/localization/messages/zh-CN/shell.ts` | 140 | Pass | Pass — one localized message addition | Pass | Pass | Pass | None. |

Unit/component test files are intentionally excluded from the implementation-source size thresholds; their structure was reviewed proportionately above.

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No dual DTO, version branch, generic alias fallback, or compatibility wrapper was added. |
| No legacy old-behavior retention in changed scope | Pass | Identifier-only discovery was replaced in place and obsolete global aliasing was not introduced. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No redundant metadata catalog or old endpoint-path machinery remains in the changed scope. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Derived metadata is not persisted; existing version-2 custom-provider records remain directly usable. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | The normal reader remains version-agnostic and no migration/fallback branch was added. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | The approved persisted-data decision is `Not Affected` and implementation follows it. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `No`
- Why: The endpoint addressability guard completes the already-recorded source-local metadata contract; no user-facing documentation or operational runbook is changed by this source re-review.
- Files or areas likely affected: None beyond the existing ticket artifacts.

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status (`Confirmed`/`Reclassified`/`No Longer Relevant`) | Changed Evidence / Reason (Required For `Reclassified` Or `No Longer Relevant`) |
| --- | --- | --- |
| `MP-001` | `Confirmed` | The supported custom-provider URL input and query/fragment non-profile-addressable contract remain applicable. IR-003 removes the prior profile-application consequence; no premise reclassification is needed. |

### MP-001 — Query/fragment-bearing custom endpoint can reach the resolver's profile-eligibility boundary

- Origin: `New` at `CRR-001`; retained unchanged for this re-review.
- Related approved requirement or established contract: `REQ-011`, `AC-013`; design-spec canonical endpoint identity section; preserved custom-provider base URL contract.
- Relevant behavior ID(s): `BEH-004`, `BEH-001`
- Initiating basis kind: `User` plus `Contract`
- Independent product-supported initiating trigger or applicable governing contract: The Settings custom-provider form accepts a user-entered base URL; server normalization accepts an absolute `http`/`https` URL, and the persisted custom-provider schema requires only a non-empty string. The reviewed contract explicitly governs query-dependent plan URLs as non-profile-addressable.
- Support evidence: Exposed custom-provider settings input -> `probeCustomProvider`/`createCustomProvider` -> `normalizeDraftInput` at `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts:193-210,399-409`; URL normalization accepts search/hash at `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts:34-49`; the saved endpoint URL is passed to the resolver during custom model construction.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: A user saves/probes a query- or fragment-bearing endpoint -> discovery/model synchronization supplies a discovered row -> `OpenAICompatibleEndpointModelProvider.createModelsForEndpoint` passes the saved `endpoint.baseUrl` to `OpenAICompatibleEndpointModelMetadataResolver.resolve`. The current resolver parses the URL and deliberately stops before profile matching when search/hash is non-empty.
- Lifecycle preconditions and material consequence at the claimed point: A returned model row is available and the URL may distinguish a plan. Before IR-003, the tuple-only comparison could apply the query-free profile; now that consequence is prevented and resolution proceeds to live/exact fallback/unknown.
- Reachability: `Reachable`
- Review consequence / proportionate response: The premise justified CR-001 in CRR-001. The current implementation satisfies it; no finding or score deduction remains.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `9.45`
- Overall score (`/100`): `94.5`
- Score calculation note: Simple average of the ten category scores below; every category meets the clean-pass threshold. The review decision is independently based on the confirmed behavior basis, resolved prior finding, structural checks, and no remaining source findings.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | The implementation preserves discovery -> resolver -> model -> server -> runtime/UI and makes profile addressability explicit at the resolver boundary. | Broader runtime and API/E2E evidence is still downstream, not a source defect. | Confirm the complete spine with the required downstream coverage investigation and execution. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | URL/profile/fallback policy remains centralized and callers consume resolved metadata. | No material source weakness; downstream ownership evidence is pending. | Preserve the resolver as the sole profile/fallback owner during downstream coverage work. |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | The private parsed result explicitly separates canonical identity from profile addressability, while the public canonicalizer remains compatible. | The public tuple helper alone does not communicate addressability, but no caller uses it for profile matching; the resolver owns the safe contract. | Keep profile matching behind the resolver rather than exposing a second matching API. |
| `4` | `Separation of Concerns and File Placement` | 9.5 | The fix is local to the pure endpoint metadata file and does not move policy into discovery, server, or UI. | None material. | None beyond normal future maintenance. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | One internal parser composes the existing identity tuple with one boolean; no parallel public DTO or duplicated policy was added. | None material. | None. |
| `6` | `Naming Quality and Local Readability` | 9.5 | `parseOpenAICompatibleEndpointIdentity`, `ParsedEndpointIdentity`, and `profileAddressable` make the corrected distinction readable. | None material. | None. |
| `7` | `API/E2E Readiness` | 9.0 | The source package and focused regressions are ready for the next stage, with explicit downstream scenarios and no premature API/E2E claims. | API/E2E coverage investigation, realistic endpoint, runtime, catalog, stale, and browser evidence do not yet exist. | `api_e2e_engineer` must investigate existing coverage before adding or executing durable coverage. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.5 | Exact profile, live, fallback, unknown, alias, stale, and UI behaviors are preserved; the reachable query/fragment misapplication is now blocked. | Runtime compaction and real catalog execution remain unverified downstream. | Validate runtime thresholds and source propagation through API/E2E coverage. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | No compatibility machinery, duplicate catalog, or version-specific data path was introduced. | None material. | None. |
| `10` | `Cleanup Completeness` | 9.5 | The old unguarded profile lookup was replaced, tests were corrected/extended, and no dormant alias machinery remains. | None material. | None. |

## Findings

None. Prior finding `CR-001` is resolved by IR-003 and verified in the current source and focused regression suite.

## Classification

`N/A` — the implementation review passes; no current failure classification applies.

## Recommended Recipient

`api_e2e_engineer` for the required coverage investigation and subsequent executable validation.

## Residual Risks

- Profile facts are source-dated and can become stale; the DeepSeek alias and Alibaba plan facts require deliberate source/date revalidation when vendor behavior changes.
- Exact built-in fallback is explicitly inferred and can differ from a plan-specific limit; endpoint-advertised and exact endpoint-profile values must continue to take precedence, and unmatched wire IDs must remain unknown.
- Reviewer reruns of `tsc` and focused Vitest were unavailable because IR-003 removed temporary dependency symlinks and this worktree has no local `node_modules/.bin/tsc` or `vitest`; IR-003 records the implementation checks as passed and reviewer `git diff --check` over `d5618bffd..e66b13c19` passed.
- API/E2E coverage investigation, execution, realistic synthetic endpoint evidence, runtime compaction evidence, GraphQL catalog evidence, stale reload evidence, secret-hygiene evidence, and browser-level validation remain downstream.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — MP-001 remains a supported user/contract path and is now safely handled by the explicit addressability guard.
- Score Summary: `9.45/10` (`94.5/100`); all ten categories meet the clean-pass threshold.
- Failure Origin (when applicable): `N/A`; CR-001 was an implementation-owned prior finding and is resolved.
- Recommended Recipient (when applicable): `api_e2e_engineer`
- Notes: Source review is complete at commit `e66b13c19`. API/E2E has not started; the next specialist must first produce the required coverage investigation artifact. Any durable repository coverage added, updated, or removed later must return through code review before delivery.
