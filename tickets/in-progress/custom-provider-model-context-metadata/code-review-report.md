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
- Relevant Implementation Revision IDs: `IR-001`, `IR-002`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Trigger: Initial source review of IR-002 after ARCH-REV-003 and approved SR-008
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `ARCH-REV-003`
- Coverage Investigation Reviewed: `N/A` — API/E2E has not started
- Execution Coverage Report Reviewed: `N/A` — API/E2E has not started
- API/E2E Revision Record Reviewed: `N/A`
- Relevant API/E2E Revision IDs: `N/A`
- Delivery Revision Record Reviewed: `N/A`
- Relevant Delivery Revision IDs: `N/A`

## Review Scope

- Changed implementation and behavior reviewed: Commit range `d5618bffd..b8f1dce50`, including IR-001 and the IR-002 exact Alibaba `deepseek-v4-flash-0731` endpoint-profile reference.
- Files / areas reviewed: Custom `/models` normalization; endpoint canonicalization/profile/fallback resolver; custom model construction and stale reload; `ModelInfo` and server enrichment/provenance; GraphQL projection boundary; token-budget/UI path; updated unit/component tests; all cumulative requirements/design/review/handoff artifacts.
- Explicit exclusions: API/E2E coverage investigation and execution, browser-level validation, delivery documentation sync, and repository-wide web TypeScript failures already documented as pre-existing in IR-002.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Confirmed` for the endpoint-advertised -> exact endpoint profile/reference -> exact built-in inferred fallback -> unknown precedence, five-kind source propagation, explicit Alibaba wire alias, stale/error preservation, runtime reuse, and truthful unknown UI.
- Design-spec behavior map verified against the implementation: `Contradicted` for the query/fragment profile-addressability rule. The implementation correctly follows the main discovery/model/catalog/runtime/UI spines and the exact wire-ID alias rule, but its profile lookup removes query/fragment distinctions before matching.
- Design review report and round confirmed: `ARCH-REV-003` is authoritative and passes the approved endpoint-scoped alias contract. Its residual risk explicitly says query/fragment-bearing URLs are not profile-addressable when the plan depends on those components.
- Behavior-basis status: `Confirmed` for the approved behavior set, with one implementation contradiction in `BEH-004`/`REQ-011`/`AC-013`.
- Changed or newly discovered behavior, if any: `None`; this is a source-level contradiction of an existing reviewed contract, not a new product behavior.
- Remaining material ambiguity, if any: `None` for the required outcome: query/fragment-bearing endpoint URLs must not receive a profile match when query/fragment can distinguish the plan. The code currently has no addressability guard.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Saved custom provider -> secret resolution -> one `GET {baseUrl}/models` -> normalized rows -> `OpenAICompatibleEndpointModelProvider` -> shared `LLMModel`/registry -> catalog/runtime/UI. Optional aliases and duplicate merging stay at discovery; stale reload still reuses prior constructed models. | None. |
| `BEH-002` | Confirmed | `openai-compatible-endpoint-model-metadata.ts` resolves endpoint-advertised values, exact profiles/references, and exact-value fallback independently per field; `ModelInfo` and server enrichment preserve non-secret sources. | None. |
| `BEH-003` | Confirmed | `OpenAICompatibleEndpointModel` supplies resolved numeric fields before registry/runtime use; no provider-specific compaction branch was added; token meter consumes the existing summary. | None. |
| `BEH-004` | Contradicted | `canonicalizeOpenAICompatibleEndpointIdentity` returns only protocol/host/port/path at lines 134–158, dropping `search` and `hash`; `resolve` then compares only that identity at lines 271–279. A query/fragment variant therefore matches the exact profile and can inherit its plan metadata. | `requirements.md:105` (`AC-013`) requires query-only differences not to match; `requirements.md:105`/`REQ-011` and `design-spec.md:141` require query-dependent plans to remain on advertised/fallback resolution. |
| `BEH-005` | Confirmed | `TokenUsageMeterPanel.vue` now renders prompt usage plus localized unavailable-limit text when capacity is absent, while retaining the known-capacity progress state. | None. |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Requirements/design and ARCH-REV-003 record the targeted boundary extension, no-refactor posture, and source/provenance contracts; implementation remains within those owners. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | The exact alias/reference, source union, precedence, and unknown behavior match; query/fragment-bearing profile addressability does not. | Fix profile lookup to refuse query/fragment-bearing endpoint identities and add focused regression coverage. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Discovery -> resolver -> custom model -> registry/runtime -> catalog/UI remains explicit and intact across the changed files. | None. |
| Ownership boundary preservation and clarity | Pass | Discovery owns wire normalization; the pure endpoint resolver owns identity/profile/fallback policy; model/provider owns construction; server owns enrichment; UI owns presentation. | None. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Source provenance is carried as a shared model projection without moving server/UI policy into discovery or runtime. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | The implementation extends existing discovery, metadata, model, provisioning, runtime, and token-meter owners; no parallel catalog or network probe was introduced. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | `ResolvedMetadataSource`, `ResolvedMetadataField`, `ResolvedModelMetadata`, endpoint profiles, and exact fallback candidates are centralized under their owning metadata boundary. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | Per-field source union is explicit and non-secret; endpoint profile references are distinct from exact fallback candidates; active context remains separate. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Alias normalization and endpoint/profile/fallback precedence are centralized; callers consume the resolver result. | None. |
| Empty indirection check (no pass-through-only boundary) | Pass | The new endpoint metadata resolver performs canonicalization, exact matching, reference resolution, conflict selection, and per-field precedence. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | The new 294-line policy file remains one coherent pure metadata concern; server merge and UI changes stay localized. | None. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | Discovery/resolver do not depend on server/UI; server consumes `ModelInfo`; runtime/UI do not infer provider limits. | None. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | Custom model callers invoke the endpoint metadata resolver rather than parsing profiles or definitions themselves; server consumes the model projection rather than querying endpoints. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` is the established pure endpoint metadata owner. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | Endpoint files remain flat under `llm/`; shared metadata policy is isolated in the existing `metadata/` folder without artificial submodules. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | `resolve({ endpointBaseUrl, discoveredModel })` and `EndpointModelProfile` expose exact endpoint/model identity and source-bearing output. | Add an explicit profile-addressability rule for search/hash-bearing inputs in the resolver contract implementation. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | Names identify endpoint discovery, canonical identity, profiles, fallback candidates, and resolved fields accurately. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Positive-integer validation is intentionally repeated only across separate existing metadata owners where dependency direction requires it; no duplicate catalog exists. | None. |
| Patch-on-patch complexity control | Pass | IR-002 is a bounded 15-line source extension over IR-001, with focused tests and refreshed handoff/revision artifacts. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No superseded custom metadata path, compatibility wrapper, or dormant alias machinery remains. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Alias exact-match, cross-endpoint unknown, canonical built-in separation, alias allowlist, fallback conflicts, and UI states are covered; the focused endpoint resolver suite does not assert that query/fragment variants miss the profile. | Add query-only and fragment-bearing profile-miss cases that verify advertised/fallback/unknown behavior. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Resolver tests reuse `discovered`, `definition`, and `staticMetadata` builders; component tests reuse summary/context mounting helpers. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Changed tests cover the approved behavior; no disabled or compatibility-only alias path was added. | None. |
| API/E2E readiness for the next workflow stage | Pass | IR-002 provides the cumulative downstream hints and explicitly blocks API/E2E until source review; no durable API/E2E coverage has been added prematurely. | After the local fix, rerun source review and then begin the required coverage investigation. |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | 258 | Pass | Pass — 294 added lines form one pure endpoint metadata policy; no split is required for this scope | Pass | Pass | Pass with watch | Keep the resolver cohesive; add the addressability guard locally. |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | 208 | Pass | Pass — 97 additions/13 deletions remain external normalization | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | 183 | Pass | Pass — 26 additions/7 deletions extend the shared source union | Pass | Pass | Pass | None. |
| `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` | 206 | Pass | Pass — 82 additions/13 deletions remain server merge/projection policy | Pass | Pass | Pass | None. |
| `autobyteus-ts/src/llm/models.ts` | 158 | Pass | Pass — 2 additions carry the non-secret projection | Pass | Pass | Pass | None. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | 387 | Pass | Pass — 15 additions/6 deletions are localized to the context card state | Pass | Pass | Pass | None. |
| Other changed implementation files (`index.ts`, endpoint model/provider, Codex/Claude normalizers) | 16–175 | Pass | Pass — each change is a small projection/construction update | Pass | Pass | Pass | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No dual DTO, version branch, generic alias fallback, or compatibility wrapper was added. |
| No legacy old-behavior retention in changed scope | Pass | Identifier-only discovery was replaced in place and obsolete global aliasing was not introduced. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No redundant metadata catalog or old endpoint-path machinery was introduced. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Derived metadata is not persisted; existing version-2 custom-provider records remain directly usable. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | The normal reader remains version-agnostic and no migration/fallback branch was added. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | `Not Affected` is followed. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `No`
- Why: This is a source-local metadata/profile contract and UI state change; the ticket's durable requirements/design/review records already capture the profile and provenance behavior. No user-facing documentation or operational runbook is changed by this source review.
- Files or areas likely affected: None beyond the existing ticket artifacts.

## Material Premise Validation (Only When Needed)

### MP-001 — Query/fragment-bearing custom endpoint can reach profile resolution

- Origin: `New`
- Related approved requirement or established contract: `REQ-011`, `AC-013`; design-spec canonical endpoint identity section; preserved custom-provider base URL contract.
- Relevant behavior ID(s): `BEH-004`, `BEH-001`
- Initiating basis kind: `User` plus `Contract`
- Independent product-supported initiating trigger or applicable governing contract: The Settings custom-provider form accepts a user-entered base URL; the server's `normalizeDraftInput` accepts any absolute `http`/`https` URL and the persisted custom-provider schema only requires a non-empty string. The reviewed contract explicitly governs query-dependent plan URLs as non-profile-addressable.
- Support evidence: Exposed custom-provider settings input -> `probeCustomProvider`/`createCustomProvider` -> `normalizeDraftInput` at `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts:193-210,399-409`; URL normalization accepts search/hash at `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts:34-49`; the saved record is later used by runtime sync and passed as `endpointBaseUrl`.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: User saves/probes `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1?plan=other#variant` -> existing `/models` discovery returns a model row -> `OpenAICompatibleEndpointModelProvider.createModelsForEndpoint` passes the saved `endpoint.baseUrl` -> `OpenAICompatibleEndpointModelMetadataResolver.resolve` canonicalizes it and compares only protocol/host/port/basePath against the Token Plan profile.
- Lifecycle preconditions and material consequence at the claimed point: The returned wire model equals a profiled model value and the URL carries a query/fragment that can distinguish the serving plan. Because the resolver drops those components, it can assign the profile's context/output capacity and allow model-derived compaction for a plan the profile does not address.
- Reachability: `Reachable`
- Review consequence / proportionate response: `Local Fix` — make profile matching reject search/hash-bearing endpoint URLs (or otherwise preserve an explicit non-addressable marker), add query-only and fragment regression cases, then return through source review before API/E2E.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `8.8`
- Overall score (`/100`): `88`
- Score calculation note: Simple average of the ten category scores below; the review decision remains `Fail` because one approved identity contract is violated and two required checks are below 9.0.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | The implementation preserves the complete discovery -> resolver -> runtime/catalog/UI paths and makes the alias case explicit. | Query addressability is not represented at the resolver input boundary. | Add a non-addressable search/hash guard without moving policy out of the resolver. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Each changed owner remains clear and callers use the endpoint resolver. | The resolver's endpoint identity shape omits whether the supplied URL is profile-addressable. | Preserve that distinction inside the resolver contract. |
| `3` | `API / Interface / Query / Command Clarity` | 8.5 | Exact endpoint/model profile keys and source-bearing output are clear. | `canonicalizeOpenAICompatibleEndpointIdentity` silently turns a query-bearing URL into the same profile key as a query-free URL. | Reject or mark search/hash-bearing inputs before profile lookup and test the contract. |
| `4` | `Separation of Concerns and File Placement` | 9.5 | New policy is placed in one pure metadata file and existing owners remain focused. | No structural concern beyond the missing addressability guard. | Keep the guard in endpoint metadata resolution. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | The five-kind source union and exact profile/reference/fallback structures are tight and non-overlapping. | Addressability is implicit rather than represented. | Add the smallest explicit guard/representation needed. |
| `6` | `Naming Quality and Local Readability` | 9.5 | Names accurately describe endpoint identity, profile, source, and fallback behavior. | The name `canonicalize...Identity` suggests all URL inputs are eligible for profile identity, which is too broad under REQ-011. | Clarify addressability in implementation/API naming or helper semantics. |
| `7` | `API/E2E Readiness` | 9.0 | Handoff lists realistic endpoint, stale, runtime, catalog, provenance, and UI scenarios and correctly defers coverage investigation. | The required query/fragment near-miss is not yet in durable focused coverage. | Add it before downstream execution and reroute after the source fix. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 7.5 | Core source precedence, exact alias behavior, stale preservation, and unknown UI behavior are implemented coherently. | A reachable query/fragment variant can receive an unsupported profile limit, affecting compaction safety. | Prevent profile application for non-addressable URLs and prove fallback/unknown outcomes. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | No compatibility machinery or duplicate metadata path was introduced. | None material. | None. |
| `10` | `Cleanup Completeness` | 9.5 | No obsolete alias/fallback path, duplicate catalog, or dormant adapter remains. | None material. | None. |

## Findings

### CR-001 — Query/fragment variants incorrectly receive endpoint profiles

- Classification: `Local Fix`
- Severity: `Blocking`
- Affected behavior/contract: `BEH-004`; `REQ-011`; `AC-013`; design-spec canonical endpoint identity section.
- Evidence: `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts:134-158` constructs the canonical identity from `parsed.protocol`, `parsed.hostname`, `parsed.port`, and `parsed.pathname`, so `parsed.search` and `parsed.hash` are discarded. `:271-279` then applies a profile solely by that identity and exact `modelValue`. The product accepts such URLs through `llm-provider-service.ts:399-409`, and discovery preserves them through `normalizeOpenAICompatibleEndpointBaseUrl` before appending `/models` at `openai-compatible-endpoint-discovery.ts:34-49,203-229`.
- Reachability basis: `MP-001` above. The initiating user surface and forward production path are independent of the resolver mechanism.
- Observed consequence: A query/fragment-bearing custom endpoint can match the same exact host/path/model profile as the query-free Token Plan URL, despite `AC-013` requiring query-only differences not to match and the design requiring query-dependent plans to use advertised/fallback resolution. That can supply profile context/output limits and a model-derived compaction threshold for an unaddressed plan.
- Required action: Keep canonical host/path normalization, but make profile lookup refuse any input URL with a non-empty search or hash (or carry an explicit `profileAddressable`/equivalent marker that prevents matching). Add focused tests for query-only and fragment variants proving they do not use the Alibaba profile and instead follow advertised -> exact wire-value fallback -> unknown. Re-run the implementation source checks and return for source review.

## Classification

`Local Fix` — bounded implementation and focused-test correction; no upstream requirement or design change is required.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Profile facts are source-dated and can become stale; the DeepSeek alias profile's provenance URL is the canonical DeepSeek source while endpoint equivalence remains an explicitly approved endpoint profile fact and should be revalidated when Alibaba changes its wire catalog.
- Exact built-in fallback is explicitly inferred and can differ from a plan-specific serving limit; endpoint/profile values must continue to override it and unmatched wire IDs must remain unknown.
- Reviewer reruns of `tsc`/Vitest were unavailable because IR-002 removed the temporary dependency symlink and this worktree currently has no `node_modules/.bin/tsc` or `vitest`; the report relies on IR-002's recorded successful checks plus the reviewer-executed `git diff --check`.
- API/E2E coverage investigation, execution, runtime compaction evidence, realistic synthetic endpoint evidence, GraphQL catalog evidence, stale reload evidence, and browser-level validation remain downstream.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — MP-001 is a supported user/contract path and is fully forward-traced.
- Score Summary: `8.8/10` (`88/100`); API/interface clarity and runtime correctness are below the clean-pass threshold because of CR-001.
- Failure Origin: Implementation-owned query/fragment addressability guard and missing focused regression coverage.
- Recommended Recipient: `implementation_engineer`
- Notes: The exact Alibaba wire alias itself is correctly endpoint-scoped and source-bearing. Do not reroute to API/E2E until CR-001 is fixed, focused checks pass, and this source review is repeated.
