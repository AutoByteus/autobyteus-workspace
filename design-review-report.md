# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/provider-error-and-pricing-contract.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-009`, `SR-010`, `SR-011`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Re-review of `SR-011` runtime-aware model-ownership rework for `ARCH-DI-005`.
- Prior Review Round Reviewed: `ARCH-REV-002` — Fail with `ARCH-DI-005`.
- Latest Authoritative Round: `ARCH-REV-003`
- Current-State Evidence Basis: Updated design artifacts plus current `RuntimeKind`, application launch contracts, `ApplicationRunBindingLaunchService`, `AgentRunManager`, and separate Claude/Codex backend factories.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved requirements / intended behavior understood: `B-001`–`B-010`, `REQ-001`–`REQ-012`, and `AC-001`–`AC-018` remain authoritative. `SR-011` clarifies preserved runtime ownership without adding behavior.
- Relevant existing behavior and evidence confirmed: AutoByteus catalog/factory/adapters, external runtime dispatch, pricing, secret resolution, agent/team event transport, application configuration, and application launch paths were rechecked.
- Scope guardrail confirmed: Confirmed. No alias, historical pricing, provider taxonomy, generic request-rejection subsystem, or unrelated runtime/model-family removal is introduced.
- Approved change, preserved behavior, and outside scope understood: Confirmed.
- Every prospective blocking finding is traceable to approved authority: Yes; no blocking finding remains.
- Remaining material ambiguity: GLM/MiniMax deployment evidence, provider balance causality, and Docker build identity remain implementation/integration evidence items only.

| Behavior ID | Kind | Design Alignment | Trigger / Current Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| B-001 | User/Contract | Pass | Pass | Pass | Confirmed | None. |
| B-002 | Operational | Pass | Pass | Pass | Confirmed | None. |
| B-003 | User/Contract | Pass | Pass | Pass | Confirmed | None. |
| B-004 | User/Contract | Pass | Pass | Pass | Confirmed | None. |
| B-005 | User/Contract | Pass | Pass | Pass | Confirmed | None. |
| B-006 | User/Contract | Pass | Pass | Pass | Confirmed | None. |
| B-007 | User/Contract | Pass | Pass | Pass | Confirmed | None. |
| B-008 | Contract/User | Pass | Pass | Pass | Confirmed | None. |
| B-009 | Contract/User | Pass | Pass | Pass | Confirmed | None. |
| B-010 | User/Contract | Pass | Pass | Pass | Confirmed | None. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose Clear | Linked To Core Artifacts | Internally Complete | Consistent | Status/Approval Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `provider-error-and-pricing-contract.md` | Pass | Pass | Pass | Pass | Pass | None. |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present for current posture | Pass | Larger-requirement posture is explicit. | None. |
| Root-cause classification explicit/evidence-backed | Pass | Boundary/ownership, missing invariant, coordination, shared-structure, and legacy pressure are tied to current paths. | None. |
| Refactor posture explicit | Pass | Limited refactor of affected provider-policy and event boundaries is stated. | None. |
| Refactor decision supported | Pass | Ownership, change sequence, removal plan, and boundary maps describe it. | None. |

## Spine Inventory Verdict

| Spine | Readable | Narrative | Facade/Owner | Main Naming | Ownership | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 model/catalog/setup/request | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 DeepSeek pricing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 provider error return/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internal Mechanisms Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime-aware effective-selection gate | Pass | Pass | Pass | Pass | The gate normalizes `{runtimeKind, llmModelIdentifier}` and delegates only AutoByteus pairs. |
| LLMFactory catalog lookup/create | Pass | Pass | Pass | Pass | Exact current membership is limited to `RuntimeKind.AUTOBYTEUS`. |
| Claude/Codex backend factories | Pass | Pass | Pass | Pass | External model/session/thread ownership remains in existing factories. |
| Application configuration readiness | Pass | Pass | Pass | Pass | Saved profile validation preserves the saved string and exposes reselection. |
| Application run-binding launch | Pass | Pass | Pass | Pass | All effective pairs are checked before run/team side effects. |
| TokenPriceConfigProvider | Pass | Pass | Pass | Pass | Current schedule remains the pricing owner. |
| Error notifier/team/web projection | Pass | Pass | Pass | Pass | Safe evidence and code/message separation are end to end. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Dependencies | Shortcuts | Direction | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime identity and application gate | Pass | Pass | Pass | Pass | Server runtime normalization selects the owning model validator. |
| Catalog/factory/adapters | Pass | Pass | Pass | Pass | External runtime factories are not routed through AutoByteus catalog logic. |
| Pricing policy/calculator | Pass | Pass | Pass | Pass | Calculator does not read catalog pricing directly. |
| Error/event transport | Pass | Pass | Pass | Pass | Provider SDK types stay out of team/web contracts. |

## Interface Boundary Verdict

| Interface | Subject | Responsibility | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Effective selection runtime gate | Pass | Pass | Pass — `{runtimeKind, llmModelIdentifier}` | Low | Pass |
| `LLMFactory.requireCurrentModelIdentifier` | Pass | Pass | Pass — AutoByteus runtime plus model | Low | Pass |
| Claude/Codex backend factory model bootstrap | Pass | Pass | Pass — external runtime plus model | Low | Pass |
| Configuration-service saved-profile validation | Pass | Pass | Pass | Low | Pass |
| Run-binding effective launch guard | Pass | Pass | Pass — every effective team pair | Low | Pass |
| `TokenPriceConfigProvider.resolvePolicy` | Pass | Pass | Pass | Low | Pass |
| `ProviderErrorEvidence` / event contract | Pass | Pass | Pass | Low | Pass |
| `TeamAgentEventAdapter` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Existing Area Checked | Reuse/Extend Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current model catalog | Pass | Pass | N/A | Pass | Extends `LLMFactory`; no alias/validation subsystem. |
| Runtime ownership/dispatch | Pass | Pass | N/A | Pass | Reuses `RuntimeKind` and `AgentRunManager` dispatch. |
| DeepSeek schedule | Pass | Pass | Pass | Pass | Narrow schedule plus existing policy extension. |
| Provider error evidence | Pass | Pass | Pass | Pass | One shared safe evidence shape. |
| Application readiness/launch | Pass | Pass | N/A | Pass | Existing services gain runtime-aware delegation and ordering. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation | Reuse/Extend Decision | Spine Support | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime identity/dispatch | Pass | Pass | Pass | Pass | `RuntimeKind` and `AgentRunManager` retain their authority. |
| LLM catalog/factory/adapters | Pass | Pass | Pass | Pass | AutoByteus-only current membership is explicit. |
| Application orchestration | Pass | Pass | Pass | Pass | Effective runtime/model pairs are normalized and checked. |
| Token usage pricing | Pass | Pass | Pass | Pass | Schedule and arithmetic remain together. |
| Secret management | Pass | Pass | Pass | Pass | Missing-key mapping remains at resolver/runtime boundary. |
| Agent/team/web eventing | Pass | Pass | Pass | Pass | Canonical contract is coherent. |

## Reusable Owned Structures Verdict

| Structure | Extraction Evaluated | Shared Choice | Owner Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Effective `{runtimeKind, llmModelIdentifier}` selection | Pass | Pass | Pass | Pass | Application orchestration owns normalization/delegation; runtime factories retain model ownership. |
| `ProviderErrorEvidence` | Pass | Pass | Pass | Pass | LLM error boundary owns it. |
| `TokenPricingSchedule` | Pass | Pass | Pass | Pass | Shared serialized meaning, no historical registry. |

## Shared Structure / Data Model Tightness Verdict

| Structure | Singular Meaning | Redundancy | Overlap Controlled | Core/Variant Sound | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Runtime/model selection pair | Pass | Pass | Pass | Pass | Pass | Runtime selects the model owner; the identifier retains its existing meaning. |
| Provider evidence/event fields | Pass | Pass | Pass | Pass | Pass | Message, transport code, and provider metadata are separate. |
| Schedule/resolved policy | Pass | Pass | Pass | Pass | Pass | Selected period/provenance are explicit. |

## File Responsibility Mapping Verdict

| File / Area | Singular | Matches Owner | Retightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-kind-enum.ts` | Pass | Pass | Pass | Pass | Normalizes runtime identity before model validation. |
| `autobyteus-ts/src/llm/llm-factory.ts` | Pass | Pass | Pass | Pass | Owns AutoByteus catalog membership only. |
| Application configuration/run-binding services | Pass | Pass | Pass | Pass | Derive effective pairs and preserve side-effect ordering. |
| `agent-run-manager.ts` and Claude/Codex factories | Pass | Pass | Pass | Pass | Preserve distinct runtime dispatch/model ownership. |
| Pricing files/schedule module | Pass | Pass | Pass | Pass | Concrete and aligned. |
| Error/event/web files | Pass | Pass | Pass | Pass | Full propagation map is actionable. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches Owner | Mixed-Layer Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime management | Pass | Pass | Low | Pass | Existing runtime identity owner. |
| LLM catalog/error folders | Pass | Pass | Low | Pass | Narrow modules fit existing ownership. |
| Server token-usage/pricing | Pass | Pass | Low | Pass | Schedule resolution stays beside policy/arithmetic. |
| Application orchestration services | Pass | Pass | Low | Pass | Runtime gate belongs with saved/direct launch ownership. |
| Team contracts/web stream/UI | Pass | Pass | Low | Pass | No provider logic moves into presentation. |

## Removal / Decommission Completeness Verdict

| Item | Obsolete Piece Named | Replacement Clear | Scope Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Named legacy catalog rows/policies | Pass | Pass | Pass | Pass |
| Generic provider wrappers/prefix/truncation | Pass | Pass | Pass | Pass |
| Source-only event payload | Pass | Pass | Pass | Pass |
| Historical price lookup/model aliases | Pass | Pass | Pass | Pass |
| Global AutoByteus guard over external runtimes | Pass | Pass | Pass | Pass |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Retention | Clean-Cut Removal | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Removed AutoByteus model IDs/prices | No | Pass | Pass | Saved strings remain data, not aliases/migration. |
| External runtime model ownership | No | Pass | Pass | Claude/Codex continue through existing factories; no parallel compatibility path. |
| Provider error source alias | No | Pass | Pass | `code` is canonical; genuine malformed events remain validation failures. |
| DeepSeek historical prices | No | Pass | Pass | One current schedule only. |

## Persisted-Data Transition Verdict

| Stored Subject | Approved Decision | Reader Evidence | Choice Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Usage records / `pricing_snapshot_json` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Additive evidence fields; old snapshots remain immutable/readable. |
| Saved launch/profile model IDs and runtime values | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing values remain readable; current validation is runtime-scoped and does not rewrite them. |

## Change / Refactor Safety Verdict

| Area | Sequence | Temporary Seams | Cleanup | Verdict |
| --- | --- | --- | --- | --- |
| Catalog/provider updates | Pass | Pass | Pass | Pass |
| Runtime-aware model validation | Pass | Pass | Pass | Pass |
| Pricing schedule projection | Pass | Pass | Pass | Pass |
| Error/event contract | Pass | Pass | Pass | Pass |
| Saved/direct launch ordering | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present/Clear | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime/model selection | Yes | Pass | Pass | Pass | Correct pair-to-owner path and global-guard anti-example are explicit. |
| Current model reselection | Yes | Pass | Pass | Pass | Old AutoByteus ID requires explicit reselection without alias. |
| Provider error transport | Yes | Pass | Pass | Pass | Code/message separation and `code is required` repair are explicit. |
| DeepSeek schedule | Yes | Pass | Pass | Pass | UTC selection and no historical table are explicit. |

## Material Premise Validation

### MP-001 — A saved profile can contain a removed model identifier and reach launch resolution

- Related approved requirement or established contract: `REQ-012`, `AC-018`.
- Relevant behavior ID(s): `B-001`–`B-005`, `B-010`.
- Initiating basis kind: User.
- Independent product-supported initiating trigger: User saves or launches an application execution-resource configuration through the supported configuration surface.
- Support evidence: Application SDK profiles persist `llmModelIdentifier`; configuration and launch services consume it.
- Forward path: Application configuration/launch -> profile normalization or run-binding launch -> runtime-aware model ownership -> provider/run path.
- Lifecycle consequence: Removed AutoByteus IDs remain editable but must not execute or silently map to another model.
- Reachability: `Reachable`.
- Review consequence: Runtime-scoped current-model validation and explicit reselection; no migration or alias.

### MP-002 — A supported provider request can fail before the team/web return path

- Related approved requirement or established contract: `REQ-007`–`REQ-009`, `AC-010`–`AC-015`.
- Relevant behavior ID(s): `B-007`–`B-009`.
- Initiating basis kind: User.
- Independent product-supported initiating trigger: User submits a provider-backed request through the supported local/Docker application path.
- Support evidence: Existing LLM phase, notifier, AgentRun mapper, team adapter, websocket, and web parser form the production path; the source/code mismatch is observed there.
- Forward path: User request -> provider/transport failure -> notifier -> AgentRun/team/websocket -> client error segment.
- Lifecycle consequence: Provider message must remain available while a valid event is admitted.
- Reachability: `Reachable`.
- Review consequence: Preserve safe evidence and canonical event code; do not invent balance classification.

### MP-003 — Missing provider credentials can reach LLM setup

- Related approved requirement or established contract: `REQ-006`, `AC-008`–`AC-009`.
- Relevant behavior ID(s): `B-006`.
- Initiating basis kind: User.
- Independent product-supported initiating trigger: User selects a provider-backed model and sends without a configured provider key.
- Support evidence: Provider key resolution calls secret management during LLM/client setup; missing/blank records are supported configuration states.
- Forward path: Request -> secret resolver -> missing/blank credential -> setup failure -> runtime error event.
- Lifecycle consequence: No provider request occurs; user needs a provider-specific setup action.
- Reachability: `Reachable`.
- Review consequence: Map only missing/blank credentials to `missing_api_key`; preserve other vault failures.

### MP-004 — Usage events carry time for current DeepSeek schedule selection

- Related approved requirement or established contract: `REQ-003`–`REQ-004`, `AC-003`–`AC-004`.
- Relevant behavior ID(s): `B-002`.
- Initiating basis kind: System.
- Independent product-supported initiating trigger: Normal provider usage observation emits a token-usage event with `observed_at`.
- Support evidence: `TokenUsageUpdatedPayload.observed_at` is required and feeds the pricing chain.
- Forward path: Usage event -> pricing provider -> UTC period -> existing tier arithmetic -> immutable snapshot.
- Lifecycle consequence: Time-of-day selects the current period; calendar date cannot select retired policy.
- Reachability: `Reachable`.
- Review consequence: Extend the pricing owner without historical storage.

### MP-005 — The screenshot provider rejection was specifically an insufficient-balance response

- Related approved requirement or established contract: `AC-010`; no balance classification is authorized.
- Relevant behavior ID(s): `B-007`–`B-009`.
- Initiating basis kind: User.
- Independent product-supported initiating trigger: User submits the Docker-node request described in MP-002.
- Support evidence: Screenshot proves local event admission defect, not upstream provider cause; no provider response or safe fixture establishes balance causality.
- Forward path: Request -> possible provider failure -> local event defect; upstream cause remains unidentified.
- Lifecycle consequence: Balance and other provider failures have different text; inventing one violates `REQ-007`.
- Reachability: `Unclear`.
- Review consequence: Use safe fixtures/runtime evidence only; no balance machinery.

### MP-006 — The Docker node on port 8001 runs the reviewed repository build

- Related approved requirement or established contract: `REQ-010`, `AC-014`.
- Relevant behavior ID(s): `B-008`–`B-009`.
- Initiating basis kind: Operational.
- Independent product-supported initiating trigger: Operator runs the supported Docker node and connects the web client to its exposed port.
- Support evidence: No build/commit identity or live request was captured in this review.
- Forward path: Docker node -> server/team stream -> websocket/client.
- Lifecycle consequence: A stale image can reproduce or conceal the mismatch independently of reviewed source.
- Reachability: `Unclear`.
- Review consequence: Delivery records build identity; no compatibility machinery.

### MP-007 — A supported application launch can target a non-AutoByteus runtime

- Related approved requirement or established contract: Preserved behavior in `B-001`, `B-003`–`B-005`, and `B-010`.
- Relevant behavior ID(s): `B-001`, `B-003`–`B-005`, `B-010`.
- Initiating basis kind: User.
- Independent product-supported initiating trigger: User selects a supported application launch/profile with `runtimeKind=claude_agent_sdk` or `runtimeKind=codex_app_server` and submits it.
- Support evidence: Application launch/profile types expose `runtimeKind`; `ApplicationRunBindingLaunchService` forwards it; `AgentRunManager` dispatches to distinct Claude/Codex factories that do not use the AutoByteus `LLMFactory` catalog.
- Forward path: Application launch -> run-binding service -> AgentRun/team service -> `AgentRunManager.resolveBackendFactory` -> external factory -> external runtime.
- Lifecycle consequence: The corrected design bypasses the AutoByteus guard and preserves the external factory's model ownership.
- Reachability: `Reachable`.
- Review consequence: Confirms `ARCH-DI-005` is resolved; retain mixed-runtime and per-member override coverage.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass** — the approved behavior basis is confirmed, `ARCH-DI-001`–`ARCH-DI-005` are resolved, and the design is ready for implementation. No in-scope machinery depends on an unsupported material premise.

## Findings

None.

## Classification

`Pass` — the design is structurally coherent, actionable in the current codebase, and preserves runtime-specific ownership while implementing the approved model, pricing, credential, and error-path changes.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- GLM-5.3 and MiniMax M3 deployment-specific endpoint/pricing facts remain implementation-time verification gates; unverified pricing must remain explicitly unpriced.
- The exact upstream provider cause behind the screenshot remains unproven; use safe fixtures/runtime evidence and do not invent balance text.
- The Docker node build/commit identity remains unproven; integrated validation must record it.
- Preserve existing unsupported-runtime validation while applying the stated absent/blank-runtime defaulting behavior; the runtime ownership test map should cover this boundary.
- The implementation should route the stable `CURRENT_MODEL_SELECTION_REQUIRED` message through the existing application API error boundary for save/direct-launch rejection; the approved contract requires the explicit message, not a new status policy.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` — MP-001–MP-004 and MP-007 are reachable supported paths; MP-005 and MP-006 remain `Unclear` residual evidence and do not drive machinery.
- Notes: `ARCH-DI-001`–`ARCH-DI-005` are resolved. The cumulative package is ready for implementation handoff.
