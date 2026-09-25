# Requirements — Runtime-specific stopped-run model switching

## Document Status
- Package identifier: `runtime-specific-stopped-model-switch`
- Status: **Approved**; explicit user confirmation received 2026-09-25.
- Current solution revision: `SR-003` (design completed after approval); exact approved requirements baseline: `SR-002` approval of the `SR-001` content.
- Request: Analyze replacement-model eligibility in existing-run Settings for external runtimes versus AutoByteus.
- Requirements owner: Solution Designer.
- Approval reference: User replied, “yes. basically no need to consider context sidze for those runtime. because its handled by those runtimes right? it should not be blcoked by our platform” to the presented question explicitly covering existing stopped Agent, Team and Agent Org Settings, smaller/unknown capacities, AutoByteus exception, and external-runtime context-management caveat. This approves the REQ-001–007 / AC-001–009 / SCN-001–006 baseline below. It does **not** establish a guarantee that every provider accepts every oversized previous conversation.
- Prior approved/delivered basis: `tickets/done/stopped-run-compatible-model/requirements-doc.md` (RER-004), which requires verified target context capacity ≥ the saved model's context capacity for **every** runtime. This package proposes a new rule; it does not rewrite the old approval or completed ticket.
- Behavior-defining supplements: N/A. The supplied screenshot is current-state evidence, not a UI approval.

## Problem And Desired Outcome
The existing stopped-run model selector filters replacement models using verified context-window capacities, regardless of runtime. This can leave only the saved Claude model visible; it makes Antigravity replacements impossible because its capacity provider deliberately returns unknown. The user wants any model *offered by the run's own external runtime* selectable and saveable, without AutoByteus's currently inadequate cross-model continuity being treated as equally reliable. Success means fixed-runtime stopped-run Settings lists and accepts all currently discoverable replacement models for Claude Agent SDK, Codex App Server and Antigravity CLI, irrespective of relative/unknown context capacity, while the existing AutoByteus capacity rule and lifecycle safeguards remain. The external runtime, not this platform's capacity gate, handles the consequences of a smaller context on later execution; provider failure remains possible and must be surfaced without history loss.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Evidence-backed current behavior | Approved desired behavior | Preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User / SCN-001–003 | External runtimes are filtered to verified equal-or-larger context; unknown capacity yields no replacement. | Offer every model in that runtime's current catalog, excluding only the already selected model from replacement rows; permit a smaller or unknown-capacity target. | Saved model remains visible; runtime stays fixed; existing stopped-only Settings and explicit Save. | E01–E05 |
| BEH-002 | Contract / SCN-001–003,005 | Server Save rechecks catalog, capacity and target settings schema. | Server Save rechecks runtime catalog and target schema, but skips the capacity comparison for the three external runtimes. | Server authority, no stale-catalog acceptance, no partial invalid Save, canonical outcome. | E02,E04,E06 |
| BEH-003 | User/contract / SCN-004 | AutoByteus replacement requires verified positive current/target capacity and target ≥ current. | No change. | Same-model settings need no capacity lookup. | E02,E07 |
| BEH-004 | System / SCN-001–003,006 | Saved model/settings pair is used by normal restore; live Codex same-thread replacement was validated only for an equal-size pair in the prior ticket. | Continue the same saved run with the external runtime's selected model; let that runtime handle context limits normally. | Local history, provider binding, normal restore/error behavior; no AutoByteus compression change or Save-time rewrite. | E08–E11 |
| BEH-005 | User / SCN-001–005 | UI copy says all replacements need at least saved context and shows capacity-specific unavailable states. | Explain the runtime-specific rule and truthful catalog/Save errors without a false capacity restriction on external runtimes. | Existing search, current-model fallback, model-specific settings review and validation. | E01,E05,E12 |
| BEH-006 | User / SCN-002–003 | Configured Team and Org scopes use the same selection service; existing propagation only affects linked scopes and Save validates all targets. | Apply the same runtime-specific eligibility per configured scope. | Directly edited/divergent scopes, topology, task records and workspace boundaries. | E04,E09,E13 |

## Stakeholders, Actors, And Outcomes
| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| Studio user | Continue a stopped Agent with another model | Choose, review settings, Save, normally resume | Same runtime; no silent history reset |
| Team/Org operator | Edit configured member/scope models | Eligible choices per scope, bounded propagation | Existing stopped-root and ownership rules |
| Runtime/system | Restore selected model and prior conversation | Provider-native continuation or visible failure | Do not claim universal success for every model/history pair |

## Scope Guardrail
### In-Scope Use Cases
- UC-001: Existing stopped standalone Agent Settings for Claude Agent SDK, Codex App Server or Antigravity CLI (SCN-001).
- UC-002: Existing stopped configured Team root/member Settings, including mixed-runtime scopes (SCN-002).
- UC-003: Existing stopped Agent Org configuration scopes, which currently share this selection policy (SCN-003).
- UC-004: Preserve the existing AutoByteus equal-or-larger verified-capacity policy (SCN-004).
- UC-005: Catalog/target-schema/Save/resume failures and accurate Settings messaging (SCN-005–006).

### Out Of Scope
Runtime switching; hot-swapping an active run; new model/provider discovery; arbitrary identifier entry outside the runtime catalog; changing model definitions or launch defaults; history conversion, proactive compression, memory reset, or migration; changed ownership/archive rules; changing provider-native context handling. A guarantee that every provider will successfully process every previously accumulated history under every smaller model is not made merely by listing the model.

### Non-Goals
No promise of identical available context, prompt tokens, costs, output, compaction timing or uninterrupted execution for all external model/history pairs. Do not treat mere catalog membership as proof that a provider accepted a specific resumed conversation; executable validation remains necessary.

### Preserved Behavior Boundary And Review Authority
BEH-002–006 and REQ-001/003–006 preserve fixed runtime, stopped-only lifecycle, per-scope validation, explicit Save, history/provider identity, same-model settings, target schema, and error reconciliation. A new condition restricting external catalog models, new history-loss permission, or altered AutoByteus rule is a Requirement Gap requiring approval, not an automatic technical correction. Every blocking downstream finding must trace to an approved REQ/AC/preserved outcome.

## Requirements
| ID | Requirement | Behavior / scenario | Priority | Basis |
| --- | --- | --- | --- | --- |
| REQ-001 | Permit model editing only through the existing editable stopped-run Settings path; runtime and existing ownership/archive guards remain fixed. | BEH-001/002/006; SCN-001–005 | Must | Prior RER-004, E04/E09 |
| REQ-002 | For Claude Agent SDK, Codex App Server and Antigravity CLI, the eligible replacement set is **all models currently returned for that runtime and run environment**, without context-capacity comparison, including smaller or unknown capacities. | BEH-001/002; SCN-001–003,005 | Must; approved change | User approval, E02/E03 |
| REQ-003 | For AutoByteus, retain verified positive current and target context capacities and require target ≥ the currently saved model; same-model settings edits bypass replacement-capacity discovery. | BEH-003; SCN-004 | Must; preserved | Prior RER-004, E02/E07 |
| REQ-004 | At Save, validate each changed selection against the fresh runtime catalog and the selected model's settings schema; a missing/unavailable/invalid model or settings fails clearly without committing an invalid or partial change. | BEH-002/006; SCN-002/003/005 | Must | E02/E04/E06 |
| REQ-005 | A successful Save preserves run/provider identity and stored conversation/history, changes only the intended model/settings pair, and takes effect on normal resume. No Save-triggered compression/reset; external runtimes continue to own ordinary context management. A resume rejection is reported without silently creating a fresh conversation or deleting history. | BEH-004; SCN-001–003,006 | Must | Prior preservation, E08–E11 |
| REQ-006 | Team/Org propagation and atomic multi-scope Save remain limited to existing configured linked scopes; each affected scope applies its own runtime-specific rule and target settings validation. | BEH-006; SCN-002/003 | Must | E04/E09/E13 |
| REQ-007 | Settings labels/status/error copy must reflect the relevant runtime rule; external runtimes must not show the universal equal-or-larger wording or capacity-unavailable blockage. | BEH-005; SCN-001–005 | Must | Screenshot, E05/E12 |

## Acceptance Criteria
| ID | REQ / scenario | Trigger | Observable expected outcome | Important alternate / verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001/002/007; SCN-001 | Open stopped external Agent Settings | All current runtime-catalog models appear as choices; smaller/unknown-capacity alternatives are not filtered; saved model stays visible. | Runtime catalog failure shows retry/error, not invented choices; UI/API checks. |
| AC-002 | REQ-002/004; SCN-001 | Select smaller or unknown-capacity external model, review target settings, Save | Valid selection persists, with no capacity error. | Invalid schema or no-longer-listed target fails; service/API tests. |
| AC-003 | REQ-003; SCN-004 | Open/Save stopped AutoByteus run | Only verified equal-or-larger replacements qualify; smaller/unknown targets reject; same-model settings remain editable. | UI/server tests. |
| AC-004 | REQ-001/004; SCN-005 | Run resumes, is archived, or ownership changes before Save | Save is refused with existing lifecycle/ownership outcome and no changed durable model. | Lifecycle/race tests. |
| AC-005 | REQ-004/006; SCN-002/003 | Change Team/Org configured root and linked member(s) | Only intended linked scopes change, each validated with its runtime rule; no partial write on one invalid target. | Tree/API tests. |
| AC-006 | REQ-005; SCN-006 | Resume after external replacement | Normal continuation uses saved target on the same local/provider conversation identity and retained history. | Real runtime test for representative external target pairs; failure must remain visible and history intact. |
| AC-007 | REQ-005; SCN-006 | Save model switch, before resume | No history/summary deletion or special Save-time compaction; already retained context remains stored. | Persistence/read-back tests. |
| AC-008 | REQ-004/007; SCN-005 | Catalog unavailable or target removed; settings-only edit | Replacement cannot be falsely saved; clear retry/error. Same-model settings path is not newly blocked by unavailable capacity evidence. | UI/server tests. |
| AC-009 | REQ-007; SCN-001–004 | Inspect Settings copy | External copy promises catalog-based choice, not equal-or-larger context; AutoByteus copy retains its capacity rule. | Render/localization tests. |

## Relevant Scenarios And Journeys
| ID | Actor / supported trigger | Starting condition and product-level sequence | Outcome / alternate | Validity and basis |
| --- | --- | --- | --- | --- |
| SCN-001 | User opens stopped standalone Agent Settings | External runtime selected → inspect runtime-offered models → select different model/settings → Save → normal next message | New selection on same run; removed catalog target or invalid settings rejects | Supported Normal Scenario; existing Settings + user's extension, E01/E02/E04 |
| SCN-002 | Team operator opens stopped Team Settings (supplied surface) | Edit configured root/member; linked unchanged descendants may follow; Save; resume | Each scope's fixed runtime uses corresponding rule; divergent/direct edits remain | Supported Normal Scenario; screenshot, E04/E09 |
| SCN-003 | Org operator opens existing stopped Org configuration | Edit configured root/placement, review linked scopes/workspaces, Save, continue | Same policy per scope; workspace/ownership unchanged | Supported Normal Scenario in current product, proposed parity; E09/E13 |
| SCN-004 | User edits stopped AutoByteus Agent/Team/Org | Choose verified non-decreasing replacement or edit same-model settings | Smaller/unknown replacement rejected; settings-only remains | Supported Normal Scenario, preserved prior RER-004, E02/E07 |
| SCN-005 | User Save with stale catalog/lifecycle or invalid target config | Select candidate, then catalog/ownership changes or schema invalidates | Server refuses clearly, no partial/false success; canonical refresh/retry | Supported Explicit Edge Scenario from existing contract, E04/E06 |
| SCN-006 | System resumes smaller-window external target | Prior conversation may exceed target's usable window; normal resume is attempted with same provider binding | Runtime may compact or reject per its own rules; no silent new conversation/history loss; visible failure | Supported Explicit Edge Scenario implied by requested smaller-model choice; E08–E11; actual provider matrix unverified |

## UI, Interaction, And Experience Requirements
- Applicable: Yes, bounded copy/option behavior within current Settings; no new visual design requested.
- Prototype/UI-UX spec/runnable reference/confirmation: N/A — not applicable. Supplied screenshot is current-state evidence only.
- Preserve searchable grouped picker, saved-model fallback, per-scope Settings, target-model settings review, clear loading/error status and explicit Save.
- Replace universal context-capacity help text and capacity-specific loading/no-replacement/error messages with runtime-accurate text. Do not conflate the screenshot's orange **workspace** “Saved value is unavailable in current options” warning with model eligibility.
- Visual styling and layout changes: N/A; existing design system applies.

## Quality And Non-Functional Requirements
- N/A beyond the observable correctness, integrity and truthful-error criteria above. No new performance or availability numerical target is approved.

## Data Continuity And Acceptable Loss
- Persisted data affected: Yes — saved model identifier/settings for selected scopes; existing history/provider binding must remain.
- Acceptable loss/reset: None caused by Save. The external provider may perform its ordinary context compaction on subsequent execution; exact token retention in the *model prompt* is not guaranteed.
- No bulk rewrite/migration requirement is inferred. Volume and provider behavior require architecture/validation evidence, not a new user-facing policy.

## External Contracts And Dependencies
| Dependency | Required boundary | Evidence / uncertainty |
| --- | --- | --- |
| Claude Agent SDK / Codex App Server / Antigravity CLI model catalogs | Runtime-offered model list is option authority for the same runtime/environment | Local catalog adapters E03/E08; current user assertion; provider continuation for smaller models unverified. |
| Provider resume/continuation | Preserve existing provider identity and surface rejection | Local restore code E08; Codex equal-size live evidence E10; no universal smaller-window proof. |

## Supplemental Artifacts
| Artifact | Purpose | State |
| --- | --- | --- |
| User screenshot at absolute path in investigation notes | Current Claude Team Settings evidence | Evidence only; not approved UI baseline |
| Prior `tickets/done/stopped-run-compatible-model/` package | Historical approved/delivered boundary and validation | Read-only predecessor; not this package's approval |

## Assumptions And Open Decisions
| ID | Question / assumption | Status / owner |
| --- | --- | --- |
| DEC-001 | Does “any model” expressly include smaller and unknown-capacity runtime-catalog models? | **Resolved yes** by explicit 2026-09-25 approval. |
| DEC-002 | Should the same rule apply to existing stopped Agent, Team and Org Settings surfaces? | **Resolved yes** by approval of the presented scope. |
| DEC-003 | Is provider-native normal compaction/rejection acceptable for a smaller model while preserving stored history and surfacing failure? | **Resolved yes** by approval of the presented caveat. No claim of guaranteed successful continuation for every pair. |
| ASM-001 | All external catalog models can be configured for a stopped run with valid model-specific settings, but actual continuation depends on provider/session state. | Technical hypothesis only; validate downstream. |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001–003,005 | BEH-001/002/006 | AC-001/004 | SCN-001–005 |
| REQ-002 | UC-001–003 | BEH-001/002 | AC-001/002 | SCN-001–003 |
| REQ-003 | UC-004 | BEH-003 | AC-003 | SCN-004 |
| REQ-004 | UC-001–003,005 | BEH-002 | AC-002/004/005/008 | SCN-001–005 |
| REQ-005 | UC-001–003,005 | BEH-004 | AC-006/007 | SCN-001–003,006 |
| REQ-006 | UC-002/003 | BEH-006 | AC-005 | SCN-002/003 |
| REQ-007 | UC-001–005 | BEH-005 | AC-001/009 | SCN-001–005 |

## Architecture Phase Input
Map the existing shared selection service, catalog/capacity boundary, GraphQL option shape, frontend picker/status copy, configured-scope Save and restore boundaries. Investigate provider-native smaller-window continuation, including actual Claude/Antigravity and Codex smaller-window examples. Design must preserve AutoByteus capacity authority and history/identity; it must not assume capacity metadata is needed for external options. No architecture design is authoritative yet.

## Readiness Check
Current behavior, desired/preserved behavior, scenarios, scope, testable REQ/AC, data continuity and evidence gaps: **Yes**. Product Design supplement: **N/A**. Material intended-behavior decisions: resolved in DEC-001–003. Content ready for user approval: **Yes**. User approval / exact approved basis / design authorization: **Yes**, by the 2026-09-25 reply quoted above. Next action: complete architecture investigation and design before implementation handoff.
