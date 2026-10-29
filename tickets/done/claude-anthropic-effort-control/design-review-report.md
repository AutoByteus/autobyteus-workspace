# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/claude-anthropic-effort-control/requirements-doc.md` (Approved SR-002; DEC-011/AC-012 at SR-003/SR-004)
- Upstream Investigation Notes: `investigation-notes.md` (SRC-001..SRC-023, PRB-001..003)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-001..SR-004)
- Reviewed Design Spec: `design-spec.md` at docs commit `4eb5d87f7` (SR-005; round 1 reviewed `7bfed6427`, SR-004)
- Supplemental Task Artifacts Reviewed: `handoff.md`, `follow-ups.md`, `code-review-report.md`, `implementation-handoff.md` (context only)
- Relevant Solution Revision IDs: SR-001 (superseded parts), SR-002, SR-003 (superseded mechanism), SR-004, SR-005
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-005 revision (docs `4eb5d87f7`) answering ARCH-REV-001 AR-001/AR-002; re-review limited to those findings, unaffected verdicts carried forward
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/claude-anthropic-effort-control`; production code at `574aa0bd7` (SR-002); server validator and every `RunModelSelectionValidator` call site read directly (cited below).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: SR-004 changes the documented contract of the shared `validateModelConfigSchema` (`run_history.md` L184-187) for every runtime and every caller of `RunModelSelectionService.validate/validateMany`. The rest of the package is within existing owners.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Medium/High is correct, and the blast radius of the shared contract is the main subject of this review.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for intent. Two technical corrections are needed in the design: AR-001 and AR-002.
- Approved requirements / intended behavior understood: Effort on every remaining Claude row, sent as `output_config.effort` only while thinking is not off. One Thinking list. No display setting or `display` field. Gen-4 Claude rows removed. Saved runs/definitions/launch configs that hold a no-longer-declared key keep loading, resuming, running and saving, and the key is never sent to Anthropic (REQ-011). DEC-011 B (user): such keys are left out of saved model settings instead of blocking the save. The server-validator placement is the Solution Designer's decision within B.
- Relevant existing behavior and evidence confirmed:
  - `model-config-schema-validation.ts` L117-121 (null schema with a non-null config is invalid) and L131-136 (an undeclared top-level key is an error).
  - `run-model-selection-service.ts` L71-72: the canonical `selection.llmConfig` is the validator's `config`.
  - Saves persist the canonical config: `standalone-stopped-run-model-config-updater.ts` L66-91, `team-run-delegated-launch-plan.ts` L95-98, `agent-org-run-manager.ts` L316-320, `delegated-launch-selection-command.ts` L125-130 and `model-routing-settings.ts` L136-143.
  - `AnthropicLLM` reads only its owned keys (`anthropic-llm.ts` L211, `readOwnedConfig`).
- Scope guardrail confirmed: Yes. UC-001..UC-004 are in scope. Non-Anthropic providers and the Claude SDK backend are out of scope.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes. AR-001 traces to REQ-011 and DEC-011/AC-012 and to the out-of-scope boundary for non-Anthropic providers.
- Remaining material ambiguity: none on intent.
- Statements about existing code, opened at their cited lines:
  - `run_history.md` L184-187: correct.
  - `agent-org-run-manager.ts` L278-321 (workspace targets are revalidated, untouched scopes are not normalized, L316): correct.
  - `agent-org-run-service.ts` L136-161: correct, with one gap: the validation result is discarded and the raw configuration launches.
  - Unit test L104-111: correct.
  - The claim that DEC-011 is "reached through `RunModelSelectionService` by every save, edit and launch path" is incomplete. Of the ten production callers, the design names four (AR-001).
  - The claim "Org launch passes and the runtime ignores undeclared keys" holds only for `AnthropicLLM`. `openai-compatible-request-builder.ts` L48 and `mistral-llm.ts` L68 forward `config.extraParams` raw, and stored `llmConfig` keys become `extraParams` (`llm-config-overrides.ts` L187-191) (AR-001).

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass (PRB-001) | Pass | Confirmed | — |
| BEH-004 | User/System | Pass | Pass (PRB-002) | Pass | Confirmed | — |
| BEH-005 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass (SRC-013) | Pass | Confirmed | — |
| BEH-007 (resume, AC-011) | User/System | Pass | Pass | Pass (owned-key reads) | Confirmed | — |
| BEH-007 (edit/launch, AC-012, REQ-011 "launch configs") | User/System | Pass | Pass for stopped-run edits and Org edit (SRC-023). Unclear for launch-preference/collaborator launch (not traced) | Fail: no spine for the server admission leg. Org launch and launch-usability carry the raw config onward, so "omitted from the canonical config" does not hold on those paths | Needs Correction | AR-001 |

## Supplemental Artifact Coherence Verdict

None. No behavior-defining supplements. The ticket artifacts (handoff, follow-ups, downstream reports) are consistent with the solution revision record.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | design-spec "Task Design Health Assessment" | — |
| Root-cause classification evidence-backed | Pass | Missing invariant: the raw passthrough in `AnthropicLLM` (SRC-004/020). SR-004 adds a second invariant owner at the server (SRC-023) | — |
| Refactor decision explicit | Pass | owned-key projection now; validator rule change in SR-004 | — |
| Refactor supported by concrete sections | Fail (minor) | The cumulative sections still describe the server validator as "no change"/"unchanged" and edit surfaces as dropping keys (AR-002) | AR-002 |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner / Call Order | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | turn → Anthropic request | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | schema → web thinking control | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | catalog → model menu | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| (missing) server admission of stored configs: save / edit / launch → `RunModelSelectionService` → `validateModelConfigSchema` → caller uses canonical or raw → store / runtime | SR-004 | Fail | Fail | N/A | Pass | Fail | — | Fail (AR-001) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AnthropicLLM` | Pass | Pass | Pass | Pass | Only Anthropic request builder and policy consumer |
| `RunModelSelectionService` → `validateModelConfigSchema` | Pass | Pass | Pass | Pass | No caller imports the schema function directly (one call site, `run-model-selection-service.ts` L71) |
| `llmThinkingConfigAdapter` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Catalog → policy constants | Pass | Pass | Pass | Pass | — |
| Web menu/form → adapter | Pass | Pass | Pass | Pass | — |
| Server callers → validator | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `resolveAnthropicModelRequestPolicy(modelValue)` | Pass | Pass | Pass | Low | Pass |
| `validateModelConfigSchema(model, llmConfig)`: result `valid{config}` becomes the canonical config with undeclared keys omitted | Pass | Pass | Pass | Low | Pass. The result shape is unchanged. The meaning of `valid` widens, so every caller's use of `config` matters (AR-001) |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| One-list presentation | Pass | Pass | N/A | Pass | existing merged list |
| Stale stored keys | Pass | Pass | N/A | Pass | The server validator is the one existing owner on every admission path. This beats a client filter (rejected alternatives are well argued). The reuse table row "web sanitize + residuals" is stale (AR-002) |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts catalog / Anthropic adapter | Pass | Pass | Pass | Pass | — |
| autobyteus-web thinking | Pass | Pass | Pass | Pass | — |
| server llm-management validation | Pass | Pass | Fail | Fail | Callers outside the four named ones are not given a decision (AR-001) |

## Reusable Owned Structures Verdict

| Structure | Evaluated | Shared File | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `claudeEffortParameter(default)` | Pass | Pass (file-local) | Pass | Pass | — |
| `ANTHROPIC_EFFORT_LEVELS` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Claude config schemas | Pass | Pass | Pass | N/A | Pass | `thinking_display` gone |
| `ModelConfigValidationResult.valid.config` | Pass | Pass | Fail | N/A | Fail | It becomes a projection that differs from the input, but some callers keep using the input (AR-001) |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Fail`. The validator is called from 10 production sites. The design names 4 of them: the standalone updater, the team plan, the Org manager and Org launch. Missing are `launch-usability-check.ts` L138 (→ collaborator launch resolver), `model-routing-settings.ts` L136, `delegated-launch-selection-command.ts` L140, `standalone-agent-run-root-manager.ts` L328 (host selection), and the delegated paths inside the team plan and Org manager.

Each domain word keeps one meaning (Principle 15): `Pass`. "Declared key" and "owned config keys" are distinct and defined.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `anthropic-supported-model-definitions.ts` | Pass | Pass | Pass | Pass | — |
| `anthropic-model-request-policy.ts` | Pass | Pass | N/A | Pass | — |
| `anthropic-llm.ts` | Pass | Pass | N/A | Pass | — |
| web adapter / menu / control / i18n | Pass | Pass | N/A | Pass | — |
| `model-config-schema-validation.ts` | Pass | Pass | N/A | Pass | Rule change is local. Nested unknown keys are still rejected (explicit) |
| admission callers (`agent-org-run-service.ts`, `launch-usability-check.ts`) | — | — | — | Fail | Not in the mapping. Whether they consume the canonical config is undecided (AR-001) |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| all mapped files | Pass | Pass | Low | Pass | no new files |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| gen-4 rows, `claudeSchema`, legacy budget policy/fallback | Pass | Pass | Pass | Pass | done in WIP |
| `thinking_display` (schemas, adapter, web) | Pass | Pass | Pass | Pass | — |
| raw forwarding of config extras in `AnthropicLLM` | Pass | Pass | Pass | Pass | per-call kwargs kept |
| SR-001 independent-effort web work, refusal constant | Pass | Pass | Pass | Pass | — |
| SR-003 client filter | Pass | N/A | Pass | Pass | never landed in production code (574aa0bd7 is SR-002) |
| Server "unknown key" / "no adjustable settings" error branches | Pass | Pass | Pass | Pass | replaced by omission. The unit test at L107-111 is updated |

## Legacy / Backward-Compatibility Verdict

| Area | Compat Retention | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Removed model IDs | No | Pass | Pass | unavailable-model state, no aliases |
| Stale `thinking_display` | No | Pass | Pass | generic declared-key projection; no name-specific branch |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| run metadata / team & org trees / definitions / launch prefs `llmConfig` | Directly Usable — No Migration | Pass (SRC-019, owned-key reads, canonical-on-save) | Pass | N/A | Pass | The "Semantics under direct use" text still says "edit surfaces drop them on save". After SR-004 the server canonical config drops them (AR-002, wording only) |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| SR-002 sequence (adapter → catalog → web → resume test → docs → live → rendered) | Pass | Pass | Pass | Pass |
| SR-004 validator change | Pass | Pass | Fail | Fail. The sequence section has no SR-004 step and no step for the admission callers (AR-001/AR-002) |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Request shapes (off+max, high, resumed stale key) | Yes | Pass | Pass | Pass | — |
| Validator omission | Yes | Fail | N/A | Fail (minor) | Add one input → canonical example: `{reasoning_effort:'high', thinking_display:'omitted'}` → valid `{reasoning_effort:'high'}`; `{reasoning_effort:'ultra'}` → invalid; null schema + `{x:1}` → valid `null` |

## Material Premise Validation

### AR-P1 — Admission-only callers carry an undeclared key to a runtime that forwards it

- Related approved requirement or established contract: DEC-011 B ("left out of saved model settings"); REQ-011 ("launch configs … keep … running"); Out of Scope "Non-Anthropic providers"; the SR-004 contract itself, which applies to every runtime and to "any future removed setting" (DEC-011 rationale).
- Relevant behavior ID(s): BEH-007
- Initiating basis kind: `Contract`
- Governing contract: SR-004 rewrites the shared validation contract for all runtimes, and the designer cites future removed settings as part of its purpose.
- Support evidence: the design states the generic contract (design-spec SR-004 Delta and the DEC-011 row).
- Forward path:
  - Org launch: `agent-org-run-service.ts` L136-161 validates, discards `selection` and launches with `configuration.llmConfig`.
  - Collaborator launch: `launch-usability-check.ts` L138-163 returns `{usable:true, launch}` with the raw launch, which `collaborator-launch-resolver.ts` L178-201 uses.
  - AutoByteus runtime: `llm-config-overrides.ts` L187-191 puts stored keys into `extraParams`. `openai-compatible-request-builder.ts` L48 and `mistral-llm.ts` L68 forward `extraParams` raw.
- Lifecycle preconditions and consequence: today the only undeclared stored keys are on Claude configs (SRC-019). `AnthropicLLM` ignores them, so there is no current failure for Claude, and the change actually makes Claude launch preferences usable (good for REQ-011). For any other model whose schema drops a key, admission changes from an explicit refusal to accepting the config and forwarding the key raw. The likely result is a provider 400 on the first turn. That is a change on out-of-scope providers that the design does not state. The design's "runtime ignores undeclared keys" is true for one adapter only.
- Reachability: `Reachable` under the governing contract for future key removals, and on the Claude launch-preference path today. `Not established` for current non-Claude data. The finding is therefore about the completeness and correctness of the design's contract statement and caller inventory, not about adding new machinery.
- Review consequence: AR-001. The response is a proportionate design decision per caller, not new mechanisms.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| REQ-011 "launch configs" leg (launch preferences → collaborator launch) not traced or tested | REQ-011 names launch configs | Trace it under AR-001 and add a check | Open (AR-001) |

## Round 2 Re-Review (ARCH-REV-002) — AR-001 / AR-002

Behavior basis reconfirmed. SR-005 changes no intended behavior. AC-013 makes REQ-011's "launch configs" leg testable and does not add new behavior.

The SR-005 claims were checked against the code:

- **Caller inventory (10 rows):** matches my round-1 count. Each row's "uses today" was spot-checked:
  - #1 is L66-91 (canonical).
  - #2/#3: the team plan stores the canonical selection at L95-98.
  - #4: the Org manager does so at L316-320.
  - #6: Org launch, `agent-org-run-service.ts` L99-112, validates `resolved.launch` and then `planner.build` re-resolves from the raw inputs. This is correct and now marked as a change.
  - #7: launch-usability L138-163 is now marked as a change.
  - #8: model routing L136-143 is canonical.
  - #10: the host selection is admission only and is then saved through `agentRuns.updateStoppedModelConfig` (`delegated-launch-selection-service.ts` L141-156). That save goes through caller #1, which revalidates and stores the canonical config. Correct.
  - The name-collision exclusions are correct.
- **Rule:** "every caller stores or launches only `validation.selection`" is one owner-level rule. Combined with DS-004, "omitted" now holds on every validated path for every provider.
- **Paths that bypass the validator** (resume, new standalone launch) are stated honestly as pre-existing and recorded as FU-004 with evidence. No key is removed from a non-Claude schema in this ticket, so this is not a prerequisite.
- **AR-002 corrections:** derived consumers, spine actors, the Persisted Data readers and semantics, the reuse row, escalation trigger (a′), sequence steps 8-9 and the AC-012 verification intent are all aligned with SR-004/005. The examples table covers omit, invalid-with-undeclared, an all-undeclared config → `null`, and a null schema.

Verdict updates (all other verdicts carried forward from round 1 unchanged):
- Behavior table, BEH-007 (edit/launch): Confirmed.
- Spine inventory, DS-004: Pass.
- Allocation, server llm-management validation: Pass.
- `ModelConfigValidationResult.valid.config` tightness: Pass, because callers consume the canonical config.
- Principle 11 derived consumers: Pass.
- File mapping, admission callers: Pass (named in the inventory, rows #6 and #7).
- Change safety, SR-004/005: Pass.
- Example adequacy, validator omission: Pass.
- Task Design Health, refactor supported by sections: Pass.

Implementation guidance (non-blocking; for the implementer and code reviewer to verify against the stated rule):

- **IG-1, Org launch (#6).** `planner.build` calls `resolveConfiguration` again from the raw inputs (`agent-org-run-planner.ts` L46-54). Prefer resolving once, replacing each scope's `llmModelIdentifier`/`llmConfig` with its validated selection, and building the tree from that resolved plan. Feeding canonical configs back in as "overrides" could change follow-team/inheritance resolution. If neither approach works without changing the planner contract, escalation trigger (a′) applies.
- **IG-2, inherited collaborator launch.** `LaunchUsabilityCheck` validates the inherited launch (offset 0) but returns only `inheritedFailure`. The resolver launches its own raw copy (`collaborator-launch-resolver.ts` L113, `cloneLaunch(base.launch)`). The design says "inherited launch likewise where it is returned for use". Today it is not returned. To keep the rule, return the canonical inherited launch from the check and have the resolver use it. Otherwise record explicitly that it is the delegator's own running config, the same class as the resume path in FU-004. Either is acceptable. Do not leave it implicit.

## Review Decision

`Pass`. The design is ready for implementation.

## Findings

None open. AR-001 and AR-002 are resolved (see `architecture-review-revision-record.md` ARCH-REV-002).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- Nested object properties still reject undeclared nested keys. No current schema needs nested settings.
- A stray or typo key submitted through the API is silently dropped (inherent in DEC-011 B).
- FU-004: paths that bypass the validator plus non-Anthropic raw forwarding. FU-001 and FU-003 remain open.
- IG-1/IG-2 are implementation-level. The escalation trigger (a′) covers a planner-contract surprise.
- Live evidence for the Fable 5.1 round trip is incomplete (noted by the design).

## Latest Authoritative Result

- Review Decision: Pass
- Material-Premise Gate: Pass. AR-P1 is resolved by the canonical-only rule. The remaining raw-forwarding class is recorded as FU-004.
- Notes: The round-1 sections above keep their evidence. Where round 1 marked Fail for AR-001/AR-002, the round-2 verdict updates above supersede it.
