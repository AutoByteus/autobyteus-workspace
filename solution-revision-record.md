# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer bootstrap, initial baseline | N/A | `Initial Baseline` | Requirements Draft; investigation bootstrap complete; design not yet produced. |
| SR-002 | User scope expansion and solution-designer investigation round | B-001–B-009; REQ-001–REQ-010; AC-001–AC-015 | `Requirement Gap` / `Design Impact` | Requirements refined with latest-only provider scope, verified Docker error root cause, DeepSeek schedule, and explicit approval gates; design remains pending user approval. |
| SR-003 | User request to check MiniMax and solution-designer provider verification round | B-010; REQ-011; AC-016–AC-017 | `Design Impact` / `Requirement Gap` | MiniMax M3 is already present, but its 1M context metadata and endpoint/pricing verification were added to the approval basis; design remains pending user approval. |
| SR-004 | User correction that only the latest price is supported | B-002; REQ-003–REQ-004; AC-003–AC-004 | `Requirement Gap` / `Design Impact` | Removed historical pricing support from the requirements basis. DeepSeek now uses only the latest pricing schedule, with time-of-day peak/off-peak selection; existing stored records remain immutable evidence and are not repriced. |
| SR-005 | User clarification that provider errors must remain original and legacy compatibility is out of scope | B-007–B-009; REQ-007–REQ-009, REQ-012; AC-010–AC-014, AC-018 | `Requirement Gap` / `Design Impact` | Replaced semantic provider-error normalization with original-message passthrough after redaction, limited local translation to missing API-key configuration, removed obsolete request-policy branches, and made removed model/price compatibility a hard rejection rather than a fallback. |
| SR-006 | User clarification that request handling must remain forward-compatible and schemas should remain the configuration source of truth | B-011; REQ-002, REQ-012; AC-002, AC-005–AC-007 | `Requirement Gap` / `Design Impact` | Removed the implication that every parameter absent from today’s schema needs a dedicated rejection path. The revised basis keeps safe unknown optional-field pass-through, updates current schemas/defaults and provider-specific transforms, and removes obsolete branches without an exhaustive request allowlist. |
| SR-007 | User confirmation of the ticket scope and correction of “DeepSight” to DeepSeek | B-001–B-010; REQ-001–REQ-012; AC-001–AC-018 | `Approval Boundary` | Scope is approved for design production: latest-only named model replacement, latest DeepSeek pricing, original missing-key/provider-error fixes, and no historical or legacy compatibility behavior. GLM/MiniMax endpoint verification remains an implementation detail within scope. |
| SR-008 | User clarified that the ticket is the complete product-path set, not a separate request-rejection/compatibility feature | B-001–B-010; REQ-001–REQ-012; AC-001–AC-018 | `Requirement Gap` / `Design Impact` | Removed B-011 and all forward-compatibility/rejection wording from the authoritative requirements. The design now follows the actual product path: schema/catalog → factory → provider adapter → provider, plus pricing, API-key, and error-stream corrections. |
| SR-009 | Solution designer completed the approved design package | B-001–B-010; REQ-001–REQ-012; AC-001–AC-018 | `Design Production` | Created the design spec and provider/error/pricing supplement. The package is ready for architecture review; GLM/MiniMax deployment verification and Docker build identity remain explicit risks. |
| SR-010 | Architecture reviewer report `design-review-report.md` / `architecture-review-revision-record.md` (ARCH-REV-001) | ARCH-DI-001–ARCH-DI-004; B-001–B-010; REQ-001–REQ-012; AC-001–AC-018 | `Design Impact` / `Upstream Rework` | Reconciled behavior IDs, assigned saved-model validation/reselection owners and paths, specified provider evidence through every runtime/team/web boundary, and projected the current DeepSeek schedule onto existing pricing interfaces. Package is ready for reroute; implementation remains blocked pending review. |
| SR-011 | Architecture reviewer report `design-review-report.md` / `architecture-review-revision-record.md` (ARCH-REV-002) | ARCH-DI-005; B-001, B-003–B-005, B-010; REQ-001–REQ-002, REQ-012; AC-001–AC-002, AC-005–AC-007, AC-016–AC-018 | `Design Impact` / `Upstream Rework` | Scoped exact-current validation to `RuntimeKind.AUTOBYTEUS` / the AutoByteus catalog, retained Claude/Codex factory ownership, specified effective runtime/model-pair expansion and side-effect ordering, and aligned the investigation, design, supplement, requirements boundary, and test map. Package is ready for reroute; implementation remains blocked pending review. |

## Revision Entries

### SR-001 — Initial solution baseline

- Triggering role, report path, and round: Solution designer bootstrap; no prior report; initial round.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: Requirements are Draft; investigation is in progress; design is gated on evidence and user approval.
- Why this baseline or revision entry is recorded: Establishes the dedicated task workspace, initial scope, behavior IDs, and open investigation questions for the reported improvements.
- Resolution: Created the initial requirements and investigation artifacts in the dedicated worktree. No implementation or design handoff occurred.
- Approved behavior or requirement IDs affected: None approved yet; provisional behavior and requirement IDs were recorded for investigation.
- Canonical artifacts and sections updated: `requirements.md` bootstrap sections; `investigation-notes.md` bootstrap context/source log/open questions.
- Supplemental artifacts updated, added, or removed: Planned `provider-error-and-pricing-contract.md`; not created.
- Downstream and architecture-review impact: None; architecture review must wait for refined requirements and design spec.
- Next recipient or routing: User approval after requirements refinement, then architecture reviewer after design production.
- Remaining gaps or risks: Provider-current model/pricing facts and actual error origin were unverified; Docker runtime version could differ from repository baseline.

### SR-002 — Latest-only provider scope and confirmed error-contract investigation

- Triggering role, report path, and round: User added Gemini 3.7 Flash, latest Kimi, and latest GLM/latest-only intent; solution-designer investigation round 2.
- Triggering finding IDs: B-001–B-009; REQ-001–REQ-010; AC-001–AC-015.
- Prior authoritative result: Requirements Draft with four provisional problem areas and unverified Docker error origin.
- Current authoritative result: Requirements are **Refined — awaiting explicit user approval**. The scope now covers Grok 4.6, Gemini 3.7 Flash, Kimi K3, GLM 5.3, DeepSeek effective-dated pricing, missing-key normalization, and canonical error-code transport. The Docker string is confirmed as a local event-contract mismatch; insufficient balance remains an unverified causal hypothesis.
- Why this revision entry is recorded: The user materially expanded the provider scope, and source investigation changed the root-cause confidence from “unknown” to a verified `source`/`code` contract mismatch.
- Resolution: Replaced bootstrap requirements/investigation content with evidence-backed current/desired behavior, acceptance criteria, scope guardrails, official source log, current-path map, pricing/persistence findings, and explicit unresolved choices for persisted launch profiles and GLM endpoint/pricing.
- Approved behavior or requirement IDs affected: None are user-approved yet. Provisional IDs B-001–B-009, REQ-001–REQ-010, AC-001–AC-015 are the current approval basis.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`.
- Supplemental artifacts updated, added, or removed: Planned `provider-error-and-pricing-contract.md`; creation is gated on requirements approval.
- Downstream and architecture-review impact: Design production is blocked until the user confirms the clean-cut latest-only boundary, stale launch-profile handling, and GLM endpoint/pricing choice. No downstream handoff has occurred.
- Next recipient or routing: User for explicit requirements approval; then solution designer produces the design spec and supplement, then architecture reviewer.
- Remaining gaps or risks: Provider facts are time-sensitive; GLM endpoint/pricing remains unresolved; historical DeepSeek policy and stale launch-profile rollout behavior need an explicit decision; Docker 8001 build identity is unknown.

### SR-003 — MiniMax M3 verification and metadata gap

- Triggering role, report path, and round: User asked whether MiniMax released a newer model; solution-designer investigation round 3.
- Triggering finding IDs: B-010; REQ-011; AC-016–AC-017.
- Prior authoritative result: Requirements refined for Grok, Gemini Flash, Kimi, GLM, DeepSeek pricing, and error handling; MiniMax was not explicitly covered.
- Current authoritative result: MiniMax M3 is the current official text/coding flagship and is already present as `minimax-m3` / `MiniMax-M3`. The catalog metadata is stale at 204,800 context versus the official 1M context; current discounted pricing tiers match the official API page but endpoint/effective-date verification remains required.
- Why this revision entry is recorded: The user expanded the latest-only provider check to MiniMax; investigation found an update/verification requirement rather than a missing model identifier.
- Resolution: Added B-010, REQ-011, AC-016, and AC-017; updated the scope, local catalog evidence, official source log, supplement inventory, and open questions. No implementation changes were made.
- Approved behavior or requirement IDs affected: None are user-approved yet; B-010/REQ-011/AC-016–AC-017 are added to the approval basis.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`.
- Supplemental artifacts updated, added, or removed: `provider-error-and-pricing-contract.md` remains planned and now includes MiniMax in its intended scope.
- Downstream and architecture-review impact: Design must update MiniMax metadata and pricing/endpoint ownership; architecture review remains blocked pending user approval of the cumulative requirements.
- Next recipient or routing: User for cumulative approval, then solution designer produces the design spec/supplement and routes the complete package to `/architecture_reviewer`.
- Remaining gaps or risks: Confirm global versus China MiniMax endpoint contract, current effective-date/source labeling, and stale launch-profile handling.

### SR-004 — Latest-price-only correction

- Triggering role, report path, and round: User clarified that historical pricing is not supported; solution-designer requirements correction round 4.
- Triggering finding IDs: B-002; REQ-003–REQ-004; AC-003–AC-004.
- Prior authoritative result: DeepSeek requirements proposed effective-dated schedule selection and historical-policy preservation/recalculation.
- Current authoritative result: Only the latest DeepSeek pricing configuration is supported. The latest schedule selects peak/off-peak by request time-of-day; the effective date is provenance only. No retired price tables, date-based policy selection, or historical repricing are in scope.
- Why this revision entry is recorded: The user explicitly rejected historical pricing support, changing both the pricing design and persisted-data interpretation.
- Resolution: Updated the DeepSeek behavior, recommendations, requirements, acceptance criteria, constraints, persisted-data outcome, investigation pricing path, persisted-data evidence, and open questions. Existing snapshots remain readable/immutable but are not a historical pricing feature.
- Approved behavior or requirement IDs affected: None are formally locked yet; B-002, REQ-003–REQ-004, and AC-003–AC-004 carry the corrected approval basis.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`.
- Supplemental artifacts updated, added, or removed: Planned `provider-error-and-pricing-contract.md` must use the latest-price-only rule when created.
- Downstream and architecture-review impact: Design must not introduce effective-dated policy storage or historical price lookup; the only pricing extension is current peak/off-peak selection.
- Next recipient or routing: User for cumulative requirements approval, then solution designer produces the design spec/supplement and routes the complete package to `/architecture_reviewer`.
- Remaining gaps or risks: Confirm stale launch-profile handling, GLM endpoint/pricing, and MiniMax endpoint/effective-date metadata; none are historical pricing requirements.

### SR-005 — Original provider-message passthrough and no legacy compatibility

- Triggering role, report path, and round: User clarified that meaningful provider errors, including balance errors, must be shown in their original form and that legacy code/pricing/model compatibility is not wanted; solution-designer requirements correction round 5.
- Triggering finding IDs: B-007–B-009; REQ-007–REQ-009, REQ-012; AC-010–AC-014, AC-018.
- Prior authoritative result: Requirements still described a provider-error category/normalization direction and left stale persisted model handling as an explicit migration choice.
- Current authoritative result: The application must preserve the original provider error message after secret redaction and safe metadata attachment. It must not classify or replace provider messages with application-authored balance/quota/authentication text. Missing/blank API-key configuration remains the one intentional local setup message. The required protocol `code` is transport metadata separate from the display message; an internal fallback is allowed only to satisfy the non-empty wire contract. Removed legacy model IDs and prices are rejected with explicit current-model reselection, obsolete request-policy branches are removed, and no silent remap or fallback is allowed.
- Why this revision entry is recorded: The user rejected misleading application-authored error conversion and questioned the need for legacy support, materially changing the error and compatibility design constraints.
- Resolution: Updated the requirements behavior table, functional requirements, acceptance criteria, scope guardrails, investigation error-path analysis, persisted-profile decision, supplemental inventory, and open questions. No implementation or design spec was created.
- Approved behavior or requirement IDs affected: None are formally locked yet; B-007–B-009, REQ-007–REQ-009, REQ-012, and AC-010–AC-014/AC-018 carry the corrected approval basis.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`.
- Supplemental artifacts updated, added, or removed: Planned `provider-error-and-pricing-contract.md` must specify message passthrough, redaction, protocol-code separation, and hard rejection of removed legacy identifiers; creation remains gated on requirements approval.
- Downstream and architecture-review impact: The design must remove generic provider-message wrappers and compatibility aliases/fallbacks, repair the event contract without changing the provider message, and validate stale saved model IDs by requiring explicit reselection. Architecture review remains blocked pending cumulative requirements approval.
- Next recipient or routing: User for cumulative requirements approval; then solution designer produces the design spec/supplement and routes the complete package to `/architecture_reviewer`.
- Remaining gaps or risks: GLM endpoint/pricing, MiniMax endpoint/effective-date metadata, and exact stale-profile validation wording remain unresolved; provider balance causality is still unverified, but its original returned message is the required user-visible source.

### SR-006 — Forward-compatible request boundary clarification

- Triggering role, report path, and round: User clarified that “provider request compatibility” should mean forward-compatible code and questioned whether the implementation should explicitly reject parameters not listed in the schema; solution-designer requirements correction round 6.
- Triggering finding IDs: B-011; REQ-002, REQ-012; AC-002, AC-005–AC-007.
- Prior authoritative result: Requirements described latest-model schemas and removal of legacy request-policy branches, but the wording that unsupported legacy options should fail before the request implied an exhaustive rejection layer.
- Current authoritative result: The model schema remains the documented current configuration surface. The shared request path remains forward-compatible with safe unknown optional fields and does not reject every field absent from the current schema. Implementation updates current model IDs, schemas/defaults, and provider-specific transformations; it removes obsolete model-specific branches and defaults rather than adding a rejection branch for each old or future field. Removed model IDs/prices still have no alias or fallback.
- Why this revision entry is recorded: The user identified a material ambiguity between latest-model catalog cleanup and forward-compatible request plumbing; the requirements needed to distinguish model selection from optional request-field handling.
- Resolution: Added B-011, revised the recommendation, preserved-behavior boundary, REQ-002, REQ-012, AC-002, AC-005–AC-007, investigation notes, and design-health evidence. No implementation or design spec was created.
- Approved behavior or requirement IDs affected: None are formally locked yet; B-011, REQ-002/REQ-012, and AC-002/AC-005–AC-007 carry the corrected approval basis.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`.
- Supplemental artifacts updated, added, or removed: Planned `provider-error-and-pricing-contract.md` must describe schema-as-configuration, current-model transforms, and forward-compatible safe extra-field pass-through; creation remains gated on requirements approval.
- Downstream and architecture-review impact: The design must not introduce a generic parameter allowlist/rejection firewall. It must define the ownership of schema/defaults versus provider adapters and remove only obsolete model-specific behavior. Architecture review remains blocked pending cumulative requirements approval.
- Next recipient or routing: User for cumulative requirements approval; then solution designer produces the design spec/supplement and routes the complete package to `/architecture_reviewer`.
- Remaining gaps or risks: Exact GLM/MiniMax endpoint and pricing verification remain open; provider-specific APIs may reject unknown fields, in which case their original provider error must continue through the unchanged error-preservation path.

### SR-007 — Scope approval and DeepSeek naming correction

- Triggering role, report path, and round: User confirmed that the ticket scope is replacing unsupported old models with current models and updating DeepSeek pricing; solution-designer approval round 7.
- Triggering finding IDs: B-001–B-010; REQ-001–REQ-012; AC-001–AC-018.
- Prior authoritative result: Requirements were refined but still marked as awaiting explicit user approval, with the scope explanation carrying too much emphasis on request compatibility.
- Current authoritative result: The user-approved scope is latest-only named model replacement, latest DeepSeek pricing, the original missing-API-key correction, and preservation of original provider errors through the Docker/team stream. There is no historical pricing, legacy model/price alias, or exhaustive request-parameter rejection layer. “DeepSight” is corrected to DeepSeek. GLM/MiniMax endpoint and pricing verification remains an implementation-time task within this scope.
- Why this revision entry is recorded: The user confirmed the intended product scope and clarified the provider name, allowing the requirements basis to move to design production.
- Resolution: Marked `requirements.md` Design-ready, updated the investigation status/open gaps/notes, and retained the forward-compatible request-boundary clarification as an implementation constraint. No implementation changes were made.
- Approved behavior or requirement IDs affected: B-001–B-010, REQ-001–REQ-012, and AC-001–AC-018 are approved as the design input basis.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`.
- Supplemental artifacts updated, added, or removed: Planned `provider-error-and-pricing-contract.md` is now part of the design package to be produced; it must remain aligned with the approved scope.
- Downstream and architecture-review impact: Produce the design spec and contract supplement before routing to `/architecture_reviewer`; endpoint verification must not broaden the model/pricing scope.
- Next recipient or routing: Solution designer produces the design package, then sends all cumulative artifacts to `/architecture_reviewer`.
- Remaining gaps or risks: Exact GLM/MiniMax endpoint/pricing deployment choices, stale-profile validation wording, Docker build identity, and provider balance causality remain to be resolved or explicitly evidenced in design/tests.

### SR-008 — Product-path scope clarification

- Triggering role, report path, and round: User objected to the separate “request handling”/parameter-rejection framing and restated the complete product scope; solution-designer requirements correction round 8.
- Triggering finding IDs: B-001–B-010; REQ-001–REQ-012; AC-001–AC-018.
- Prior authoritative result: The requirements had introduced B-011 and repeated a technical forward-compatibility/rejection discussion that was not a user-facing ticket requirement.
- Current authoritative result: The ticket is the complete product-path set: latest model catalog/schema/adapter updates, latest DeepSeek pricing, clear missing-API-key messaging, and original provider-error preservation plus Docker/team error transport repair. The design follows the existing schema/catalog → factory → adapter → provider path and adds no separate request-validation feature.
- Why this revision entry is recorded: The user correctly identified that the earlier framing obscured the actual production path and made the ticket sound more defensive than intended.
- Resolution: Removed B-011 and the related forward-compatible/unknown-parameter wording from the requirements, simplified the supplement, and kept the actual schema/adapter path as current-state evidence in the investigation notes.
- Approved behavior or requirement IDs affected: B-001–B-010, REQ-001–REQ-012, and AC-001–AC-018 remain the approved design basis.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/provider-error-and-pricing-contract.md`.
- Supplemental artifacts updated, added, or removed: `provider-error-and-pricing-contract.md` now describes the schema/catalog/provider-adapter path without presenting request compatibility as a separate feature.
- Downstream and architecture-review impact: The design spec must use the real product and return/event spines and must not invent a parameter-rejection subsystem. Architecture review remains the next downstream stage after design completion.
- Next recipient or routing: Solution designer completes the design package, then sends it to `/architecture_reviewer`.
- Remaining gaps or risks: Exact GLM/MiniMax endpoint/pricing deployment choices, stale-profile wording, Docker build identity, and provider balance causality remain implementation/design evidence items.

### SR-009 — Approved design package

- Triggering role, report path, and round: Solution designer design-production round after user approval and product-path clarification.
- Triggering finding IDs: B-001–B-010; REQ-001–REQ-012; AC-001–AC-018.
- Prior authoritative result: Approved requirements and investigation notes; design spec had not yet been produced.
- Current authoritative result: The complete solution package is ready for architecture review. The design follows the real catalog/schema -> factory -> provider adapter -> provider path, the existing pricing owner, the secret resolver, and the AgentRun/team return-event path. It does not create a separate request-rejection feature.
- Why this revision entry is recorded: The mandatory design spec and aligned provider/error/pricing supplement are now complete after the user clarified the full scope.
- Resolution: Created the design spec with behavior map, spines, ownership, file responsibilities, removal plan, persistence decision, sequence, tradeoffs, risks, and implementation guidance. Aligned the supplement to the approved scope.
- Approved behavior or requirement IDs affected: B-001–B-010, REQ-001–REQ-012, and AC-001–AC-018.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-spec.md`.
- Supplemental artifacts updated, added, or removed: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/provider-error-and-pricing-contract.md` is complete and aligned.
- Downstream and architecture-review impact: Route the cumulative package to `/architecture_reviewer` for readiness decision. Implementation remains blocked until architecture review passes.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: Verify GLM/MiniMax deployment-specific endpoint/pricing evidence, stale-profile wording, Docker build identity, and provider balance causality through safe fixtures/runtime evidence.

### SR-010 — Architecture-review rework: concrete ownership and boundary contracts

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-review-report.md`; architecture-review round `ARCH-REV-001`.
- Triggering finding IDs: `ARCH-DI-001`, `ARCH-DI-002`, `ARCH-DI-003`, `ARCH-DI-004`.
- Prior authoritative result: `SR-009` design package was submitted, but architecture review failed because behavior IDs/spine membership were inconsistent and three implementation-critical paths were underspecified.
- Current authoritative result: The approved requirements remain unchanged and authoritative. The investigation and design now use the exact requirements meanings for B-001–B-010. `DS-001` explicitly owns current catalog lookup plus saved/direct model selection; `DS-002` owns current DeepSeek schedule projection; `DS-003` owns provider/secret error evidence, canonical code/message transport, and UI return.
- Why this revision entry is recorded: The architecture reviewer identified blocking design impacts that required upstream solution-package rework rather than implementation interpretation.
- Resolution: (1) corrected all behavior maps and kept `REQ-012`/`AC-018` as the stale-profile authority without repurposing B-010; (2) assigned `LLMFactory` as exact active-model owner, `ApplicationExecutionResourceConfigurationService` as persisted-readiness owner, and `ApplicationRunBindingLaunchService` as final direct-launch guard, with `CURRENT_MODEL_SELECTION_REQUIRED` and no provider/run side effects; (3) defined `ProviderErrorEvidence`, missing-field semantics, safe redaction, wrapper/prefix removal, and propagation through notifier, lifecycle payload, AgentRun mapper, team adapter/DTO/websocket, application projector, web protocol/parser, web adapters, and `ErrorSegment`; (4) defined `TokenPricingSchedule`, `ModelPricingInfo.pricing_schedule`, period selection, trusted dimensions, tier composition, `ResolvedTokenPricingPolicy` provenance fields, and latest-only snapshot/policy-key behavior.
- Approved behavior or requirement IDs affected: None; `B-001–B-010`, `REQ-001–REQ-012`, and `AC-001–AC-018` retain their approved meanings.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-spec.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/provider-error-and-pricing-contract.md`; this revision record.
- Supplemental artifacts updated, added, or removed: `provider-error-and-pricing-contract.md` expanded with the concrete schedule, evidence, transport, and stale-profile contracts; no supplement was removed.
- Downstream and architecture-review impact: The cumulative package must be rerouted to `/architecture_reviewer`; implementation remains blocked until a passing architecture decision. The architecture review report and review revision record remain part of the cumulative package.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: GLM/MiniMax deployment-specific endpoint/pricing evidence, Docker build identity, and the user’s balance causality remain Unclear/implementation verification items; they do not create new machinery or change the approved scope.

### SR-011 — Architecture-review rework: runtime-aware current-model ownership

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-review-report.md`; architecture-review round `ARCH-REV-002`.
- Triggering finding IDs: `ARCH-DI-005`, with preserved behavior IDs B-001, B-003–B-005, and B-010 and requirements/criteria REQ-001–REQ-002, REQ-012 and AC-001–AC-002, AC-005–AC-007, AC-016–AC-018.
- Prior authoritative result: `SR-010` described the exact-current guard but made `LLMFactory` appear globally authoritative for every model selection. That could reject valid Claude Agent SDK or Codex App Server selections even though `AgentRunManager` dispatches those runtime kinds to distinct backend factories.
- Current authoritative result: Model identity is an effective `{ runtimeKind, llmModelIdentifier }` pair. Only `RuntimeKind.AUTOBYTEUS` / the AutoByteus catalog enters `LLMFactory.requireCurrentModelIdentifier`. Claude and Codex selections retain ownership in their backend factories. Saved configuration and direct agent/team launch paths normalize runtime, expand every effective member pair, validate only AutoByteus pairs, and allocate/create runs only after those checks. Existing external-runtime dispatch and model ownership remain unchanged.
- Why this revision entry is recorded: The architecture reviewer identified a blocking design impact in the ownership boundary, not a new product requirement. The correction makes the approved preserved-runtime behavior explicit and testable without adding a generic request-parameter rejection feature or legacy compatibility.
- Resolution: Updated the requirements preserved-behavior boundary; added runtime evidence to the investigation; rewrote DS-001's production path, ownership, interface, file, sequence, risk, and guidance maps; added a runtime-ownership test map; and aligned the provider/error/pricing contract supplement.
- Approved behavior or requirement IDs affected: No new behavior was added. The existing approved B-001–B-010, REQ-001–REQ-012, and AC-001–AC-018 basis remains authoritative; the runtime scoping clarifies preserved behavior for the cited IDs.
- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-spec.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/provider-error-and-pricing-contract.md`; this revision record.
- Supplemental artifacts updated, added, or removed: `provider-error-and-pricing-contract.md` gained the runtime-scoped ownership contract; no supplement was removed.
- Downstream and architecture-review impact: Reroute the cumulative package to `/architecture_reviewer`; implementation remains blocked until the runtime-aware design passes. The architecture review report and architecture-review revision record remain review-owned cumulative artifacts.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: GLM/MiniMax deployment-specific endpoint/pricing evidence, Docker build identity, balance causality, and the exact current-reselection implementation boundary remain implementation verification risks. They do not justify global external-runtime rejection or new machinery.
