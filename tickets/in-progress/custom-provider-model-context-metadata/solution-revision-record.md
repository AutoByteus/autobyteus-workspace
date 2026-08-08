# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer initial investigation and refined solution package | N/A | `Initial Baseline` | Proposed requirements and design package completed; user approval pending before architecture review. |
| SR-002 | Solution designer direct completion-response probe | BEH-004, AC-007 | `Initial Baseline` | Fresh Alibaba completion response also contains usage only; requirements and investigation evidence strengthened, with no design change. |
| SR-003 | Solution designer latest-base reconciliation | BEH-002, BEH-003; REQ-002–REQ-006 | `Design Impact / Current-State Refresh` | Fast-forwarded to `origin/personal` `d5618bffd`; removed the obsolete server null-clearing work and redesigned metadata reuse around compound endpoint/model identity plus canonical static-definition references and plan overrides. |
| SR-004 | Solution designer endpoint-channel clarification | BEH-002, BEH-004; REQ-002, REQ-003 | `Investigation Clarification` | Confirmed that built-in Qwen and Alibaba Token Plan use intentionally isolated pay-as-you-go versus subscription gateways/keys; the existing compound endpoint-plan design remains correct. |
| SR-005 | User-approved exact built-in fallback and truthful unknown state | BEH-002–BEH-004; REQ-002–REQ-006 | `Requirement Clarification / Approval` | Approved endpoint/provider data, then endpoint profile, then exact built-in identity as inferred fallback, otherwise unknown; endpoint/profile values override fallback. |
| SR-006 | Architecture review `ARCH-REV-001` Design Impact rework | ARCH-DESIGN-001–ARCH-DESIGN-003; REQ-001, REQ-002, REQ-006, REQ-009–REQ-011 | `Design Impact / Contract Clarification` | Added actionable source union/projection, exact `value` fallback index/profile identity, alias/fall-through rules, and canonical endpoint tuple matching; approved fallback precedence unchanged. |
| SR-007 | User DeepSeek wire-ID alias clarification | REQ-003, REQ-012; AC-014 | `Requirement Clarification / Design Impact` | Added explicit endpoint-profile alias/reference handling for Alibaba `deepseek-v4-flash-0731` -> canonical DeepSeek `deepseek-v4-flash`; no automatic suffix stripping; exact fallback/unknown behavior remains unchanged. |
| SR-008 | User approval of endpoint-scoped wire aliases | REQ-003, REQ-012; AC-014 | `Requirement Approval` | Approved explicit endpoint-scoped alias/reference profiles as the correct design for provider wire IDs that differ from canonical built-in values; global fuzzy/suffix aliasing remains rejected. |
| SR-009 | User minimal-representation clarification | REQ-003, REQ-008, REQ-012; AC-011, AC-014 | `Scope Constraint / No Design Expansion` | Confirmed that the endpoint profile's optional `{provider, value}` reference is sufficient; no model-offering, producer, revision, deployment, route, serving-override, persisted, or public API attributes are added. |
| SR-010 | User post-delivery native-Qwen and exact-model rework | BEH-002, BEH-004–BEH-006; REQ-002–REQ-007, REQ-009, REQ-010 | `Requirement Approval / Material Design Replacement` | Replaced custom endpoint profiles and aliases with exact built-in value fallback only; added native Qwen Base URL/key configuration and required exact Qwen-served values `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2`. |
| SR-011 | Architecture review `ARCH-REV-004` Design Impact rework | ARCH-DESIGN-004, ARCH-DESIGN-005; PREM-QWEN-001 | `Design Impact / Contract Clarification` | Added strict atomic AppConfig persistence, key-first secret compensation with truthful failure codes, and a Qwen-specific `DEFAULT|CONFIGURED` setup-status projection. |

## Revision Entries

### SR-001 — Initial refined solution baseline

- Triggering role, report path, and round: `solution_designer`; initial investigation round; no prior report (`N/A`).
- Triggering finding IDs: `N/A`.
- Prior authoritative result: `N/A`.
- Current authoritative result: The configured Alibaba `/models` endpoint does not return context metadata; custom discovery also drops optional fields; server enrichment can clear known values; runtime/UI correctly represent unknown capacity as null but the UI hides the state. A layered endpoint-capture, exact-provider-profile, preservation, and explicit-unknown design is proposed.
- Why this baseline or revision entry is recorded: Establish the first complete requirements, investigation, and proposed design package with live probe evidence and no secret-bearing artifacts.
- Resolution: Refined `requirements.md`, completed `investigation-notes.md`, and created proposed `design-spec.md`. Persisted custom-provider configuration is not affected; no compatibility wrapper or undocumented metadata probe is proposed.
- Approved behavior or requirement IDs affected: Proposed `BEH-001`–`BEH-005`; `REQ-001`–`REQ-007`; `AC-001`–`AC-008` — pending user approval.
- Canonical artifacts and sections updated: `requirements.md` all sections; `investigation-notes.md` source log, behavior map, probe findings, persisted-data evidence; `design-spec.md` all design sections.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Do not hand off to `architecture_reviewer` until the user approves the refined endpoint-profile scope and explicit unknown-context UI behavior. After approval, architecture review should focus on profile ownership, provenance enum shape, and merge precedence.
- Next recipient or routing: User for requirements approval; then `architecture_reviewer` with the cumulative package.
- Remaining gaps or risks: Vendor preview metadata may change; exact provider-side enforcement may differ from the documented rounded 1M value; arbitrary unsupported custom models remain unknown; no durable implementation/API/E2E results exist yet.

### SR-002 — Direct completion response verification

- Triggering role, report path, and round: `solution_designer`; follow-up probe requested by the user after the initial solution baseline.
- Triggering finding IDs: `BEH-004`, `AC-007`.
- Prior authoritative result: `SR-001` proposed package; Alibaba `/models` and stored usage showed no context-limit metadata.
- Current authoritative result: A fresh direct Alibaba `POST /chat/completions` call returned HTTP 200. The response contained standard top-level fields and a `usage` object with prompt/completion/total tokens, cache details, and reasoning details, but no context-window or maximum-limit field.
- Why this baseline or revision entry is recorded: Confirm whether the context limit is available only in a successful LLM response rather than in `/models`.
- Resolution: Updated `requirements.md` investigation findings and `investigation-notes.md` source log/runtime findings. The layered design remains unchanged: capture provider extensions if present, use verified endpoint profiles where documented, and preserve unknown otherwise.
- Approved behavior or requirement IDs affected: `BEH-004`, `REQ-003`, `REQ-005`; `AC-007` — still pending user approval.
- Canonical artifacts and sections updated: `requirements.md` investigation findings; `investigation-notes.md` source log and findings.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review can rely on both discovery and completion-response evidence; no additional response-probing boundary is required for Alibaba.
- Next recipient or routing: User for requirements approval; then `architecture_reviewer`.
- Remaining gaps or risks: The direct probe consumed a minimal provider request; vendor-specific future response extensions remain possible but are not part of the standard contract.

### SR-003 — Latest-base metadata architecture reconciliation

- Triggering role, report path, and round: `solution_designer`; resumed solution round after user asked to continue; upstream source refresh, no downstream report.
- Triggering finding IDs: `BEH-002`, `BEH-003`; `REQ-002`–`REQ-006`.
- Prior authoritative result: `SR-002` assumed the older server provisioning service could clear custom metadata and proposed a new field-preserving merge.
- Current authoritative result: The dedicated branch was fast-forwarded from `34f3fe97a` to current `origin/personal` `d5618bffd`. Upstream commit `544cc980d` moved built-in static metadata onto each `SupportedModelDefinition`, introduced per-field live/static/unknown resolution, and made server provisioning preserve existing numeric fields as static fallback. The task no longer changes server numeric merge behavior. The remaining design resolves metadata before custom model construction using endpoint-advertised values plus a compound endpoint-plan/model profile. Profiles reference canonical built-in `staticMetadata` when serving semantics match and own explicit plan-specific values when they differ.
- Why this revision is recorded: The current code reality changed materially before requirements approval; retaining the old design would prescribe already-completed work and reference a removed curated metadata file.
- Resolution: Rewrote the refined requirements and proposed design around the refreshed ownership model; updated investigation evidence and current paths; retained the live Alibaba probes, no-migration decision, compaction goal, and explicit unknown UI state.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-003`; `REQ-002`–`REQ-006`; `AC-003`, `AC-004`, `AC-008`–`AC-010` — still pending user approval.
- Canonical artifacts and sections updated: `requirements.md` all current/desired behavior, findings, requirements, and acceptance criteria; `investigation-notes.md` bootstrap refresh, source log, current behavior, design health, relevant files, and conclusions; `design-spec.md` all target ownership/file mappings and change sequence.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review must assess compound identity, built-in static-definition reference safety, plan-specific override ownership, and minimal source propagation. It must not request a second generic metadata catalog or reintroduce the obsolete server null-clearing fix.
- Next recipient or routing: User for requirements approval; then `architecture_reviewer` with the complete cumulative package.
- Remaining gaps or risks: Vendor plan facts remain time-sensitive; rounded documented limits may differ from exact enforcement; source projection must not regress built-in provider provenance; arbitrary unsupported endpoints remain unknown.

### SR-004 — Qwen versus Token Plan endpoint-channel clarification

- Triggering role, report path, and round: User follow-up question about the differing built-in Qwen and Alibaba custom-provider URLs; `solution_designer` clarification round.
- Triggering finding IDs: `BEH-002`, `BEH-004`; `REQ-002`, `REQ-003`.
- Prior authoritative result: `SR-003` required endpoint-plan identity because identical model strings can have different limits.
- Current authoritative result: Official Alibaba documentation explicitly separates Token Plan, Coding Plan, and pay-as-you-go keys/base URLs. AutoByteus's built-in Qwen adapter uses the still-functional legacy Singapore pay-as-you-go `dashscope-intl` endpoint, while the configured custom provider uses the dedicated Singapore Token Plan endpoint. They are different billing/entitlement gateways over overlapping model families, not interchangeable aliases.
- Why this revision is recorded: The user's question exposed an important explanation for the compound-identity requirement and the apparent URL inconsistency.
- Resolution: Added the official endpoint/key isolation and current pay-as-you-go migration findings to `requirements.md` and `investigation-notes.md`. No intended-behavior or target-design change was required.
- Approved behavior or requirement IDs affected: Clarifies `BEH-002`, `BEH-004`, `REQ-002`, and `REQ-003`; approval remains pending.
- Canonical artifacts and sections updated: `requirements.md` investigation findings; `investigation-notes.md` source log, external findings, and conclusions.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Review must treat endpoint plan as part of metadata identity and must not collapse Token Plan into built-in Qwen by URL aliasing or key reuse.
- Next recipient or routing: User for the existing requirements approval; then `architecture_reviewer`.
- Remaining gaps or risks: The built-in Qwen adapter still uses a legacy-but-supported pay-as-you-go domain; migrating it to workspace-specific domains would require workspace identity/configuration and is a separate task.

### SR-005 — User-approved exact built-in fallback and truthful unknown state

- Triggering role, report path, and round: User follow-up clarification; `solution_designer` requirements refinement round after the live Alibaba discovery/completion probes and endpoint-channel clarification.
- Triggering finding IDs: `BEH-002`, `BEH-004`; `REQ-002`, `REQ-003`, `REQ-006`; `AC-004`, `AC-009`, `AC-010`.
- Prior authoritative result: `SR-004` required endpoint-advertised metadata or an endpoint-scoped exact profile and otherwise left the custom model unknown; an unscoped model-ID fallback was rejected.
- Current authoritative result: The user approved a bounded fallback: use provider/endpoint metadata first, then an exact endpoint/profile fact, then an exact matching built-in model definition as explicitly inferred best effort. If no exact built-in match exists, provide no context limit and retain the unknown state. Endpoint/profile values override the inferred built-in value. Substring, family, display-name, and nearest-model matching remain forbidden. If multiple exact built-in definitions conflict, use the lowest valid value per field for conservative compaction.
- Why this revision is recorded: The user clarified that the product should preserve compaction where an exact known model definition exists, while remaining truthful when no such definition exists.
- Resolution: Updated `requirements.md`, `investigation-notes.md`, and `design-spec.md` with the approved precedence, inferred provenance, conservative conflict handling, and unknown fallback behavior. The design remains endpoint-aware so Alibaba Token Plan values can override built-in Qwen metadata.
- Approved behavior or requirement IDs affected: `BEH-002`–`BEH-004`; `REQ-002`–`REQ-006`; `AC-004`, `AC-009`, `AC-010`.
- Canonical artifacts and sections updated: Requirements status, behavior map, recommendations, scope, functional requirements, acceptance criteria, constraints, risks, and approval status; investigation status, conclusions, current findings, and notes for architecture review; design status, intended change, identity/provenance terminology, spine, ownership, lookup rules, examples, rejection log, sequence, tradeoffs, risks, and guidance.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Review the exact built-in definition index as a fallback-only source, the lowest-value conflict rule, explicit inferred provenance, and endpoint/profile precedence. Do not replace this with global provider-name matching or a fabricated default.
- Next recipient or routing: `architecture_reviewer` with the complete approved solution package.
- Remaining gaps or risks: Exact built-in metadata can still differ from a custom plan; this is why the fallback is marked inferred and subordinate to endpoint/profile facts. Unmatched custom models remain unknown and will not receive automatic model-derived compaction thresholds.


### SR-006 — Architecture review contract rework

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`; architecture review round `ARCH-REV-001`.
- Triggering finding IDs: `ARCH-DESIGN-001`, `ARCH-DESIGN-002`, `ARCH-DESIGN-003`.
- Prior authoritative result: `SR-005` approved the source precedence and unknown behavior, but the design package did not make its internal source, exact built-in identity, advertised aliases, invalid fall-through, or endpoint canonicalization contracts implementation-ready.
- Current authoritative result: The approved precedence is unchanged. The design now specifies a discriminated source union (`live`, `endpoint_profile`, `inferred_builtin`, `static_definition`, `unknown`), mandatory non-secret propagation through `LLMModel.toModelInfo()` and `ModelMetadataProvisioningService`, coarse GraphQL mapping that does not falsely claim provider confirmation, an exact fallback index keyed only by `SupportedModelDefinition.value`, `{provider, value}` profile references, lowest-valid per-field conflict selection with selected URL/date provenance, a fixed top-level alias allowlist and JSON-number validation, duplicate alias/row precedence, per-field invalid fall-through, and exact canonical endpoint tuple matching.
- Why this revision is recorded: Architecture review confirmed the behavior and spines but blocked implementation until these policy details were explicit.
- Resolution: Updated `requirements.md`, `investigation-notes.md`, and `design-spec.md`; retained the review report and architecture-review revision record as cumulative rework evidence. No implementation or durable coverage was started.
- Approved behavior or requirement IDs affected: Clarifies `REQ-001`, `REQ-002`, `REQ-006`, `REQ-009`–`REQ-011` and `AC-001`, `AC-002`, `AC-004`, `AC-011`–`AC-013`; does not alter the user-approved SR-005 source precedence.
- Canonical artifacts and sections updated: Requirements functional requirements, acceptance criteria, coverage intent, and behavior basis; investigation status, scope, and architecture-rework evidence; design terminology, implementation contracts, spines, ownership, file responsibilities, examples, sequence, tradeoffs, risks, and guidance.
- Supplemental artifacts updated, added, or removed: None. `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md` and `architecture-review-revision-record.md` remain relevant upstream review artifacts and are included in the reroute.
- Downstream and architecture-review impact: Re-review must verify that all three findings are closed and that implementation can use the source union, exact index/profile identities, alias table, and canonical endpoint tuple without inventing additional policy. Do not hand off to implementation until the review passes.
- Next recipient or routing: `architecture_reviewer` for review round `ARCH-REV-002`.
- Remaining gaps or risks: Vendor profile facts remain time-sensitive; exact built-in fallback remains best effort; no API/E2E execution or durable coverage has begun.


### SR-007 — Provider wire alias clarification for Alibaba DeepSeek

- Triggering role, report path, and round: User follow-up with Alibaba model catalog screenshot; `solution_designer` design clarification round after `ARCH-REV-001` rework.
- Triggering finding IDs: `REQ-003`, `REQ-012`, `AC-014`.
- Prior authoritative result: Exact fallback matching used only `SupportedModelDefinition.value`; Alibaba `deepseek-v4-pro` matched directly, but `deepseek-v4-flash-0731` did not match built-in `deepseek-v4-flash`.
- Current authoritative result: A provider wire ID that differs from a built-in value is supported only through an explicit exact endpoint profile: the profile keys the exact Alibaba endpoint and returned `deepseek-v4-flash-0731`, then references `{ provider: DEEPSEEK, value: deepseek-v4-flash }`. Any Alibaba-specific context override wins. No automatic `-0731` stripping or fuzzy aliasing is allowed; without the profile, the differing ID remains unknown unless it independently has an exact fallback entry.
- Why this revision is recorded: The user's catalog exposed a real provider-versioned wire ID that is semantically related to an existing built-in model but cannot be handled by exact-value fallback alone.
- Resolution: Updated `requirements.md`, `investigation-notes.md`, and `design-spec.md` with explicit wire-alias profile semantics, a DeepSeek example, source-backed context considerations, and durable coverage intent. Official DeepSeek API documentation was recorded as supporting the canonical `deepseek-v4-flash`/`deepseek-v4-pro` IDs and 1M context; endpoint equivalence remains an explicit profile fact rather than an identifier guess.
- Approved behavior or requirement IDs affected: Clarifies `REQ-003`, `REQ-012`, and `AC-014`; it does not change the SR-005 precedence or unknown behavior.
- Canonical artifacts and sections updated: Requirements behavior map, recommendations, use cases, out-of-scope rules, functional requirements, acceptance criteria, and coverage intent; investigation source log, findings, risks, and architecture-rework notes; design current-state rationale, profile contract, examples, sequence, and tests.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Re-review must confirm that explicit endpoint-profile references can bridge different provider wire IDs to canonical built-in values while retaining endpoint/profile provenance and avoiding generic alias normalization.
- Next recipient or routing: `architecture_reviewer` for the current architecture re-review package.
- Remaining gaps or risks: Alibaba-specific context enforcement for the dated DeepSeek wire ID still requires a source-dated profile fact; official DeepSeek canonical documentation alone does not prove every Alibaba plan gateway has identical limits.


### SR-008 — User approval of endpoint-scoped wire aliases

- Triggering role, report path, and round: User confirmation after the DeepSeek Alibaba wire-ID case; `solution_designer` requirements approval round.
- Triggering finding IDs: `REQ-003`, `REQ-012`, `AC-014`.
- Prior authoritative result: `SR-007` proposed an explicit profile mapping for Alibaba `deepseek-v4-flash-0731` to canonical built-in `deepseek-v4-flash`, while rejecting generic suffix stripping.
- Current authoritative result: The user approved the alias direction. A provider wire ID may reference canonical built-in metadata only through an exact endpoint-scoped profile. The profile records the returned wire ID, canonical `{provider, value}` reference, source/provenance, and any endpoint-specific overrides. No global fuzzy, family, or suffix aliasing is allowed.
- Why this revision is recorded: The user confirmed that explicit aliases are the correct design for semantically equivalent provider IDs with different wire names.
- Resolution: Marked the alias requirement approved in `requirements.md`; the design and investigation artifacts already contain the actionable profile shape, precedence, provenance, and test intent.
- Approved behavior or requirement IDs affected: `REQ-003`, `REQ-012`, `AC-014`; the SR-005 precedence remains unchanged.
- Canonical artifacts and sections updated: Requirements approval status; solution revision index and this entry. The alias details remain authoritative in `requirements.md`, `investigation-notes.md`, and `design-spec.md` from SR-007.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review must verify explicit wire alias profile handling and ensure implementation does not introduce global suffix stripping or fuzzy matching.
- Next recipient or routing: `architecture_reviewer` for the cumulative re-review package.
- Remaining gaps or risks: The specific Alibaba alias profile still needs source-dated endpoint equivalence/context facts during implementation; absent that profile, the wire ID remains unknown.

### SR-009 — Minimal representation; no generalized model-offering schema

- Triggering role, report path, and round: User clarification after discussing model producers versus inference providers; `solution_designer` post-delivery scope-confirmation round.
- Triggering finding IDs: `REQ-003`, `REQ-008`, `REQ-012`; `AC-011`, `AC-014`.
- Prior authoritative result: `SR-008` approved an exact endpoint-scoped mapping from a provider wire ID to canonical built-in `{provider, value}` metadata. A broader `ModelOffering` abstraction was discussed conceptually but was not part of the approved design or implementation.
- Current authoritative result: The user explicitly rejects overengineering and unused attributes. The existing custom-provider identity/base URL and exact wire model `value` remain authoritative for the inference route. The only new relationship needed is the endpoint profile's optional canonical `{provider, value}` reference, retained inside metadata resolution/source provenance. No first-class producer, revision, offering, deployment, route, or serving-override fields; no persisted schema change; and no new public GraphQL fields are in scope.
- Why this revision is recorded: Prevent the valid producer-versus-inference-provider concept from being over-modeled beyond the concrete context-metadata and compaction need.
- Resolution: Updated the requirements constraints/out-of-scope sections, investigation evidence/conclusion, and design minimal-representation/rejection guidance. The already implemented resolver-local reference satisfies the clarification; no source change is expected.
- Approved behavior or requirement IDs affected: Narrows the representation of `REQ-003` and `REQ-012` while reinforcing `REQ-008`, `AC-011`, and `AC-014`; source precedence and observable behavior are unchanged.
- Canonical artifacts and sections updated: `requirements.md` status, recommendations, out-of-scope, constraints, and approval status; `investigation-notes.md` status, request context, source log, findings, constraints, and reviewer notes; `design-spec.md` status, intended change, terminology, dependency rules, rejection log, tradeoffs, and implementation guidance.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review should confirm this is a no-design-expansion clarification. If confirmed, the existing implementation, code review, API/E2E evidence, docs, and delivery build remain valid without rework or new durable coverage.
- Next recipient or routing: `architecture_reviewer` for focused confirmation against the cumulative completed package.
- Remaining gaps or risks: Future pricing, tokenizer, capability, or cross-provider catalog features could justify a separate canonical model relationship, but no such abstraction should be introduced without a concrete approved consumer.

### SR-010 — Native Qwen endpoint configuration and exact-only custom fallback

- Triggering role, report path, and round: User post-delivery scope rework culminating in the 2026-08-06 exact-model clarification; `solution_designer` rework round. No downstream report triggered the change.
- Triggering finding IDs: `BEH-002`, `BEH-004`, `BEH-005`, `BEH-006`; `REQ-002`–`REQ-007`, `REQ-009`, `REQ-010`; `AC-003`, `AC-004`, `AC-007`–`AC-012`.
- Prior authoritative result: `SR-009` retained an endpoint-scoped Alibaba profile and optional canonical `{provider, value}` reference while rejecting broader model-offering attributes. The branch had already implemented, reviewed, tested, documented, and built that profile design.
- Current authoritative result: The user replaces that design. Custom-provider metadata is now generic and exact-only: advertised field, exact built-in `SupportedModelDefinition.value` fallback marked inferred, then unknown. All endpoint profiles, region/plan matching, URL canonicalization for metadata, and wire aliases/references are removed. Native Qwen gains a user-configurable Base URL plus the existing API-key secret and owns the required exact Alibaba-served model values `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2`. `qwen3.8-max-preview` is removed with no alias. Existing `modelIdentifierOverride` distinguishes duplicated Qwen-served DeepSeek/GLM entries from direct-provider entries.
- Why this revision is recorded: The user's endpoint variability and native-Qwen product direction make the prior hardcoded custom-profile solution both brittle and unnecessarily complex. The final model correction also changes the exact Qwen catalog from preview/different DeepSeek values to the current production set.
- Resolution: Rewrote `requirements.md`, `investigation-notes.md`, and `design-spec.md`; added `qwen-native-provider-setup-ui-spec.md`; documented route-specific context values and the conservative GLM decision; identified the existing profile/source/test/docs implementation as required removal. No implementation source or `implementation-handoff.md` was changed by the solution designer.
- Approved behavior or requirement IDs affected: User-approved `BEH-001`–`BEH-006`; `REQ-001`–`REQ-010`; `AC-001`–`AC-012`. The exact required Qwen values are `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2`.
- Canonical artifacts and sections updated: All sections of `requirements.md`, `investigation-notes.md`, and `design-spec.md`; solution revision index and this entry.
- Supplemental artifacts updated, added, or removed: Added `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md` as the approved Qwen Settings behavior specification.
- Downstream and architecture-review impact: `ARCH-REV-003` and every implementation/code/API-E2E/delivery result for the prior endpoint-profile design are historical only. Architecture must review SR-010 as a material rework. After pass, implementation must remove the obsolete profile/alias/source machinery and add native Qwen configuration/models; all later reviews and coverage must be repeated on the new state.
- Next recipient or routing: `architecture_reviewer` with the full current solution package and the historical architecture artifacts for context.
- Remaining gaps or risks: Final public vendor documentation for the non-preview `qwen3.8-max` ID may lag the user-confirmed production change; GLM-5.2 Alibaba-route documentation has conflicted, so the design uses the conservative 198k value; AppConfig and secret-vault write sequencing needs proportionate implementation review.

### SR-011 — Durable Qwen pair commit and explicit endpoint-source status

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`; architecture review round `ARCH-REV-004` / report revision `ARCH-REV-004`.
- Triggering finding IDs: `ARCH-DESIGN-004`, `ARCH-DESIGN-005`, and material premise `PREM-QWEN-001`.
- Prior authoritative result: `ARCH-REV-004` failed SR-010 because the Qwen command used best-effort `AppConfig.set` after replacing the key and could report a non-durable mismatched pair; effective URL plus key status also could not distinguish the absent/default state from an explicitly saved equal URL.
- Current authoritative result: The approved native-Qwen/custom-model direction is unchanged. The Qwen command now probes, retains the prior command-scoped `SecretValue`, saves the new key, calls strict `AppConfig.setDurably`, and returns success only after the URL's atomic file commit. A URL failure restores/removes the key and returns `QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED`; a bounded compensation failure returns `QWEN_CONFIGURATION_REPAIR_REQUIRED` without claiming rollback. A Qwen-only status exposes `effectiveBaseUrl`, `endpointSource: DEFAULT | CONFIGURED`, and `apiKeyConfigured`, with source based on saved-setting presence rather than URL equality.
- Why this revision is recorded: The architecture review found two supported Settings states that SR-010 could not persist or render truthfully. Both require explicit contracts before implementation but do not justify a generalized transaction or provider/model schema.
- Resolution: Refined `requirements.md`, `investigation-notes.md`, `design-spec.md`, and `qwen-native-provider-setup-ui-spec.md`. The design assigns atomic same-directory replacement to one synchronous AppConfig method, pair sequencing/compensation to `LlmProviderService`, allowlisted error-code mapping to GraphQL, and default/configured presentation to the Qwen status/form. No implementation source or `implementation-handoff.md` was changed by the solution designer.
- Approved behavior or requirement IDs affected: Clarifies `BEH-004` and `BEH-006`; `REQ-005`, `REQ-006`, `REQ-008`, and `REQ-010`; adds implementation-ready `REQ-011`, `REQ-012`, `AC-013`, and `AC-014` without changing user-approved product scope.
- Canonical artifacts and sections updated: Requirements status, behavior map, findings, recommendations, functional requirements, acceptance criteria, constraints, risks, coverage intent, and architecture status; investigation source evidence, design health, persistence evidence, constraints/risks, and architecture-rework notes; design intended change, contracts, spines, ownership/boundaries, interfaces, file mappings, examples, sequence, risks, and implementation guidance.
- Supplemental artifacts updated, added, or removed: Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md` with server-owned endpoint-source labels, previous-restored and repair-required states, query/mutation names, and allowlisted GraphQL error-code handling. No supplement was added or removed.
- Downstream and architecture-review impact: Architecture must re-review SR-011 and confirm both blocking findings are closed. Do not route to implementation until a pass. After a pass, the SR-010/SR-011 source rework, code review, coverage investigation/execution, any durable-test re-review, documentation sync, integration refresh, and build evidence must all be performed anew; earlier downstream evidence remains superseded.
- Next recipient or routing: `architecture_reviewer` for the cumulative architecture re-review package, expected as `ARCH-REV-005`.
- Remaining gaps or risks: A simultaneous strict-URL failure and secret-compensation failure cannot prove all-old and is intentionally repair-required; vendor provenance limitations and the conservative GLM value remain; delivery still owns refresh against the substantially newer tracked base.
