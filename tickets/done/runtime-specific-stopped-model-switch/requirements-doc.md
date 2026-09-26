# Requirements — Runtime-specific stopped-run model switching

## Document Status
- Package identifier: `runtime-specific-stopped-model-switch`
- Status: **Approved — revised requirements**. The original runtime/context policy was approved at `SR-002`; the Claude `default` backend-catalog delta proposed at `SR-005` was explicitly approved at `SR-006`.
- Current solution revision: `SR-006` (requirements approval); prior approved baseline: `SR-002` approval of `SR-001`.
- Request: Analyze replacement-model eligibility in existing-run Settings for external runtimes versus AutoByteus.
- Requirements owner: Solution Designer.
- Approval reference: User replied, “yes. basically no need to consider context sidze for those runtime. because its handled by those runtimes right? it should not be blcoked by our platform” to the presented question explicitly covering existing stopped Agent, Team and Agent Org Settings, smaller/unknown capacities, AutoByteus exception, and external-runtime context-management caveat. This approved the prior REQ-001–007 / AC-001–009 / SCN-001–006 baseline. The later user correction that the Claude backend, not the frontend, should filter redundant `default` is recorded in investigation E20–E21; the user then said “please update the design follow design principelsa afterwards send for additional review. because i think some refactoring is needed here. backend provide, frontend display”, explicitly approving the presented revised REQ-008/AC-010–011 and related qualification of REQ-002/AC-001 for design and independent review. The prior reply does **not** guarantee every provider accepts every oversized previous conversation.
- Prior approved/delivered basis: `tickets/done/stopped-run-compatible-model/requirements-doc.md` (RER-004), which requires verified target context capacity ≥ the saved model's context capacity for **every** runtime. This package proposes a new rule; it does not rewrite the old approval or completed ticket.
- Behavior-defining supplements: N/A. The supplied screenshot is current-state evidence, not a UI approval.

## Problem And Desired Outcome
The existing stopped-run model selector filtered replacement models using verified context-window capacities, regardless of runtime. The approved change removes that platform gate for external runtimes. During delivery verification, the user found that the Claude SDK `default` alias appeared as a raw extra choice even though it resolved to a listed concrete model (`opus`). The approved correction is that the **backend Claude provider catalog** remove this redundant alias before model options reach the frontend, so the frontend displays the backend's normalized offered list. All distinct currently discoverable external models remain eligible irrespective of capacity; AutoByteus's capacity rule and lifecycle safeguards remain. A stored `default` identifier must not be silently rewritten or lost.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Evidence-backed current behavior | Desired behavior (SR-002 approved policy; SR-006 Claude delta approved) | Preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User / SCN-001–003 | Prior release filtered external runtimes by capacity; current delivery build now offers every raw Claude SDK catalog ID, including redundant `default`. | Offer every distinct model in the backend runtime catalog, excluding the already selected model from replacement rows; for Claude, normalize a proven duplicate `default` at the backend boundary per approved REQ-008. Smaller/unknown-capacity targets remain eligible. | Saved model remains visible; runtime stays fixed; existing stopped-only Settings and explicit Save. | E01–E05,E17–E21 |
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
- UC-006: Claude SDK backend catalog deduplication of a proven `default` alias, including existing saved-`default` continuity (SCN-007).

### Out Of Scope
Runtime switching; hot-swapping an active run; new model/provider discovery; arbitrary identifier entry outside the runtime catalog; changing model definitions or launch defaults; history conversion, proactive compression, memory reset, or migration; changed ownership/archive rules; changing provider-native context handling. A guarantee that every provider will successfully process every previously accumulated history under every smaller model is not made merely by listing the model.

### Non-Goals
No promise of identical available context, prompt tokens, costs, output, compaction timing or uninterrupted execution for all external model/history pairs. Do not treat mere catalog membership as proof that a provider accepted a specific resumed conversation; executable validation remains necessary.

### Preserved Behavior Boundary And Review Authority
BEH-002–006 and REQ-001/003–006 preserve fixed runtime, stopped-only lifecycle, per-scope validation, explicit Save, history/provider identity, same-model settings, target schema, and error reconciliation. REQ-008 is a **specific approved exception** to raw Claude SDK row visibility, not approval for generic external catalog filtering, history loss, or a changed AutoByteus rule. Every blocking downstream finding must trace to an approved REQ/AC/preserved outcome.

## Requirements
| ID | Requirement | Behavior / scenario | Priority | Basis |
| --- | --- | --- | --- | --- |
| REQ-001 | Permit model editing only through the existing editable stopped-run Settings path; runtime and existing ownership/archive guards remain fixed. | BEH-001/002/006; SCN-001–005 | Must | Prior RER-004, E04/E09 |
| REQ-002 | For Claude Agent SDK, Codex App Server and Antigravity CLI, the eligible replacement set is **all distinct models currently exposed by that runtime's backend selection catalog for the run environment**, without context-capacity comparison, including smaller or unknown capacities. The approved Claude alias exception is REQ-008; it must not become a general capacity or frontend veto. | BEH-001/002; SCN-001–003,005,007 | Must; original capacity policy approved, catalog-dedup qualification approved | User approval, E02/E03/E20–E21 |
| REQ-003 | For AutoByteus, retain verified positive current and target context capacities and require target ≥ the currently saved model; same-model settings edits bypass replacement-capacity discovery. | BEH-003; SCN-004 | Must; preserved | Prior RER-004, E02/E07 |
| REQ-004 | At Save, validate each changed selection against the fresh runtime catalog and the selected model's settings schema; a missing/unavailable/invalid model or settings fails clearly without committing an invalid or partial change. | BEH-002/006; SCN-002/003/005 | Must | E02/E04/E06 |
| REQ-005 | A successful Save preserves run/provider identity and stored conversation/history, changes only the intended model/settings pair, and takes effect on normal resume. No Save-triggered compression/reset; external runtimes continue to own ordinary context management. A resume rejection is reported without silently creating a fresh conversation or deleting history. | BEH-004; SCN-001–003,006 | Must | Prior preservation, E08–E11 |
| REQ-006 | Team/Org propagation and atomic multi-scope Save remain limited to existing configured linked scopes; each affected scope applies its own runtime-specific rule and target settings validation. | BEH-006; SCN-002/003 | Must | E04/E09/E13 |
| REQ-007 | Settings labels/status/error copy must reflect the relevant runtime rule; external runtimes must not show the universal equal-or-larger wording or capacity-unavailable blockage. | BEH-005; SCN-001–005 | Must | Screenshot, E05/E12 |
| REQ-008 | For Claude Agent SDK only, when the SDK reports `default` as an alias resolving unambiguously to the same concrete model as another listed model ID, the backend's **selection-facing provider catalog** must omit the redundant `default` row before provider snapshots and stopped-run replacement options are served; the frontend displays that backend list, not a locally hidden alias. If no matching concrete sibling can be established, do not discard the only offered `default` choice. Preserve pre-existing runs that saved exact `default`: keep their stored ID/current-value visibility and normal continuation, do not rewrite it implicitly, and retain supported same-model settings edits where the raw SDK still reports it. | BEH-001/005; SCN-001–003,007 | Must; **approved changed intent** | User E20–E21, investigation AE-10/11 |

## Acceptance Criteria
| ID | REQ / scenario | Trigger | Observable expected outcome | Important alternate / verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001/002/007/008; SCN-001/007 | Open stopped external Agent Settings | All distinct backend-catalog choices appear; smaller/unknown-capacity alternatives are not filtered; saved model stays visible. A proven redundant Claude `default` alias is absent under AC-010. | Runtime catalog failure shows retry/error, not invented choices; UI/API checks. |
| AC-002 | REQ-002/004; SCN-001 | Select smaller or unknown-capacity external model, review target settings, Save | Valid selection persists, with no capacity error. | Invalid schema or no-longer-listed target fails; service/API tests. |
| AC-003 | REQ-003; SCN-004 | Open/Save stopped AutoByteus run | Only verified equal-or-larger replacements qualify; smaller/unknown targets reject; same-model settings remain editable. | UI/server tests. |
| AC-004 | REQ-001/004; SCN-005 | Run resumes, is archived, or ownership changes before Save | Save is refused with existing lifecycle/ownership outcome and no changed durable model. | Lifecycle/race tests. |
| AC-005 | REQ-004/006; SCN-002/003 | Change Team/Org configured root and linked member(s) | Only intended linked scopes change, each validated with its runtime rule; no partial write on one invalid target. | Tree/API tests. |
| AC-006 | REQ-005; SCN-006 | Resume after external replacement | Normal continuation uses saved target on the same local/provider conversation identity and retained history. | Real runtime test for representative external target pairs; failure must remain visible and history intact. |
| AC-007 | REQ-005; SCN-006 | Save model switch, before resume | No history/summary deletion or special Save-time compaction; already retained context remains stored. | Persistence/read-back tests. |
| AC-008 | REQ-004/007; SCN-005 | Catalog unavailable or target removed; settings-only edit | Replacement cannot be falsely saved; clear retry/error. Same-model settings path is not newly blocked by unavailable capacity evidence. | UI/server tests. |
| AC-009 | REQ-007; SCN-001–004 | Inspect Settings copy | External copy promises catalog-based choice, not equal-or-larger context; AutoByteus copy retains its capacity rule. | Render/localization tests. |
| AC-010 | REQ-002/008; SCN-007 | Claude SDK reports `default` and a listed sibling resolving to the same unambiguous concrete model | Backend Claude provider-model snapshot and stopped-run replacement options both omit `default` while retaining the sibling and every other distinct model; the frontend renders the received list without an extra raw `default` row. | Backend catalog/service/API and packaged UI checks; no context-capacity filter added. If no sibling/clear resolution, keep the SDK-offered `default` rather than invent a target. |
| AC-011 | REQ-004/005/008; SCN-007 | Open/save/resume a pre-existing run whose exact saved model is `default` | Current saved identity remains visible and unchanged unless the user explicitly selects another listed model; supported unchanged-model settings Save and normal resume do not fail merely because selection-facing choices are deduplicated. | Persisted-data regression tests; explicit switch uses the chosen exact target; no silent conversion or history reset. |

## Relevant Scenarios And Journeys
| ID | Actor / supported trigger | Starting condition and product-level sequence | Outcome / alternate | Validity and basis |
| --- | --- | --- | --- | --- |
| SCN-001 | User opens stopped standalone Agent Settings | External runtime selected → inspect runtime-offered models → select different model/settings → Save → normal next message | New selection on same run; removed catalog target or invalid settings rejects | Supported Normal Scenario; existing Settings + user's extension, E01/E02/E04 |
| SCN-002 | Team operator opens stopped Team Settings (supplied surface) | Edit configured root/member; linked unchanged descendants may follow; Save; resume | Each scope's fixed runtime uses corresponding rule; divergent/direct edits remain | Supported Normal Scenario; screenshot, E04/E09 |
| SCN-003 | Org operator opens existing stopped Org configuration | Edit configured root/placement, review linked scopes/workspaces, Save, continue | Same policy per scope; workspace/ownership unchanged | Supported Normal Scenario in current product, proposed parity; E09/E13 |
| SCN-004 | User edits stopped AutoByteus Agent/Team/Org | Choose verified non-decreasing replacement or edit same-model settings | Smaller/unknown replacement rejected; settings-only remains | Supported Normal Scenario, preserved prior RER-004, E02/E07 |
| SCN-005 | User Save with stale catalog/lifecycle or invalid target config | Select candidate, then catalog/ownership changes or schema invalidates | Server refuses clearly, no partial/false success; canonical refresh/retry | Supported Explicit Edge Scenario from existing contract, E04/E06 |
| SCN-006 | System resumes smaller-window external target | Prior conversation may exceed target's usable window; normal resume is attempted with same provider binding | Runtime may compact or reject per its own rules; no silent new conversation/history loss; visible failure | Supported Explicit Edge Scenario implied by requested smaller-model choice; E08–E11; actual provider matrix unverified |
| SCN-007 | User opens Claude model selection after SDK discovery; or revisits a run historically saved as `default` | Backend discovers both `default` and its concrete listed sibling → serves one distinct choice under Anthropic; frontend displays the received choice. Historical saved `default` remains the current stored value until an explicit change. | No duplicate raw `default` selection; sibling remains available; ambiguous/no-sibling discovery retains `default`; old run retains same-model Save/continuation. | Supported Normal Scenario for current duplicate from E17–E21, and Supported Explicit Edge Scenario for historical saved alias from existing catalog/launch behavior and data continuity. |

## UI, Interaction, And Experience Requirements
- Applicable: Yes, bounded copy/option behavior within current Settings; no new visual design requested.
- Prototype/UI-UX spec/runnable reference/confirmation: N/A — not applicable. Supplied screenshot is current-state evidence only.
- Preserve searchable grouped picker, saved-model fallback, per-scope Settings, target-model settings review, clear loading/error status and explicit Save.
- Approved Claude correction: the backend provider catalog owns removal of a proven redundant `default` alias; the frontend must not own a separate alias filter. Saved exact values remain visible even if no longer selectable as a new replacement.
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
| Claude Agent SDK / Codex App Server / Antigravity CLI model catalogs | Backend selection-facing catalog is option authority for the same runtime/environment; approved Claude duplicate-`default` normalization is server-owned | Local catalog adapters E03/E08/E17–E21; provider continuation for smaller models unverified. |
| Provider resume/continuation | Preserve existing provider identity and surface rejection | Local restore code E08; Codex equal-size live evidence E10; no universal smaller-window proof. |

## Supplemental Artifacts
| Artifact | Purpose | State |
| --- | --- | --- |
| User screenshot at absolute path in investigation notes | Current Claude Team Settings evidence | Evidence only; not approved UI baseline |
| Prior `tickets/done/stopped-run-compatible-model/` package | Historical approved/delivered boundary and validation | Read-only predecessor; not this package's approval |
| `model-picker-verification-investigation.md` | Delivery-build catalog/UI diagnosis and subsequent user correction | Evidence only; not a separate UI/UX specification |

## Assumptions And Open Decisions
| ID | Question / assumption | Status / owner |
| --- | --- | --- |
| DEC-001 | Does “any model” expressly include smaller and unknown-capacity runtime-catalog models? | **Resolved yes** by explicit 2026-09-25 approval. |
| DEC-002 | Should the same rule apply to existing stopped Agent, Team and Org Settings surfaces? | **Resolved yes** by approval of the presented scope. |
| DEC-003 | Is provider-native normal compaction/rejection acceptable for a smaller model while preserving stored history and surfacing failure? | **Resolved yes** by approval of the presented caveat. No claim of guaranteed successful continuation for every pair. |
| DEC-004 | Should a duplicate Claude SDK `default` alias be removed at the backend provider-catalog boundary, not hidden by the frontend? | **Approved** by the user’s 2026-09-25 instruction to revise the design and send for additional review after the precise REQ-008/AC-010–011 baseline was presented (E22); E20–E21 supplied the correction and backend ownership. |
| ASM-001 | All external catalog models can be configured for a stopped run with valid model-specific settings, but actual continuation depends on provider/session state. | Technical hypothesis only; validate downstream. |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001–003,005 | BEH-001/002/006 | AC-001/004 | SCN-001–005 |
| REQ-002 | UC-001–003,006 | BEH-001/002 | AC-001/002/010 | SCN-001–003,007 |
| REQ-003 | UC-004 | BEH-003 | AC-003 | SCN-004 |
| REQ-004 | UC-001–003,005,006 | BEH-002 | AC-002/004/005/008/011 | SCN-001–005,007 |
| REQ-005 | UC-001–003,005,006 | BEH-004 | AC-006/007/011 | SCN-001–003,006–007 |
| REQ-006 | UC-002/003 | BEH-006 | AC-005 | SCN-002/003 |
| REQ-007 | UC-001–005 | BEH-005 | AC-001/009 | SCN-001–005 |
| REQ-008 | UC-001–003,006 | BEH-001/005 | AC-001/010/011 | SCN-001–003,007 |

## Architecture Phase Input
With REQ-008 approved, revise the reviewed SR-003 design at the Claude backend catalog boundary and inspect all catalog consumers, especially provider snapshots, stopped-run options and fresh Save validation. Preserve existing saved `default` identity/continuation and same-model settings behavior without making the frontend own alias policy. The original capacity-policy architecture is reviewed but does not authorize the new catalog normalization.

## Readiness Check
Current behavior, desired/preserved behavior, scenarios, scope, testable REQ/AC, data continuity and evidence gaps: **Yes** for the focused delta. Product Design supplement: **N/A**. Original DEC-001–003 approval remains valid; DEC-004 exact backend-filter baseline and saved-value safeguards are **Approved** by E22 in response to the presented baseline. Design revision and repeat independent architecture review remain required; the old ARCH-REV-001 pass is not a review of this delta. No implementation handoff is authorized until the revised design passes its route.
