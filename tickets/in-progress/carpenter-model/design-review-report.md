# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/design-spec.md`
- Supplemental Task Artifacts Reviewed: `system-prompt-contract.md`, `agent-identity-prompt-spec.md`, `working-environment-prompt-spec.md`, `bash-operating-practice-prompt-spec.md`, `file-and-directory-practice-prompt-spec.md`, `team-and-runtime-prompt-spec.md`, `prompt-value-binding-spec.md`, `system-skill-decision.md`, and `classroom-simulation-composed-system-prompt.md`, all at the canonical ticket paths listed in the investigation inventory.
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/solution-revision-record.md`
- Triggering Downstream Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/implementation-handoff.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/implementation-revision-record.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/code-review-report.md`, and `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/code-review-revision-record.md`.
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4`
- Trigger: Solution-designer re-review handoff for `SR-004`, rerouted from code review `CRR-001` findings `CR-001` and `CR-002` after the first implementation pass exposed an incomplete core removal boundary and a reachable fence-containment defect.
- Prior Review Round Reviewed: Round 3 / `ARCH-REV-003` (`Pass`) plus downstream code review `CRR-001` (`Fail — Design Impact`).
- Latest Authoritative Round: Round 4 / `ARCH-REV-004`.
- Current-State Evidence Basis: prior-round evidence plus direct verification of `SR-004`, `CRR-001`, current `AgentConfig`/`SystemPromptPipeline`/processor exports and callers, current native final-payload ordering, the reproduced fence state machine, and the updated design, binding, contract, removal, sequence, and coverage mappings.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: Yes. The complete requirements basis and intended-behavior supplements were approved on 2026-08-12.
- Relevant existing behavior and evidence confirmed: Yes. The current three provider paths, configured skill exposure, post-resolution tool exposure, team context, persisted file-definition readers, authoring surfaces, public core prompt-processor surface, and fence-containment defect match the investigation and `CRR-001` evidence.
- Approved change, preserved behavior, and outside scope understood: Yes. The review does not reopen the approved prompt text, automatic team tools, the one ordinary lazy-skill model, provider-native tool/skill transport, the no-migration decision, unchanged MCP/client lifecycle, or external repository follow-ups. `SR-004` closes the omitted core runtime surface and corrects containment without changing behavior intent.
- Remaining material ambiguity, if any: None. The direct native Skills appender, singular final-payload owner, complete core removal set, positional-caller update rule, fence close grammar, and focused verification obligations are explicit.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | System | Pass | Pass | Pass | Confirmed | None. |
| `BEH-002` | System | Pass | Pass | Pass | Confirmed | None; the ordinary native Skills catalog moves from the generic processor pipeline to one direct platform-owned appender without changing its lazy configured-skill semantics. |
| `BEH-003` | Contract | Pass | Pass | Pass | Confirmed | None; shared runtime exposure adds/deduplicates the two team defaults before each provider-native projection. |
| `BEH-004` | System | Pass | Pass | Pass | Confirmed | None; prompt projection is descriptor-independent and provider lifecycle remains encapsulated. |
| `BEH-005` | Operational | Pass | Pass | Pass | Confirmed | None. |
| `BEH-006` | Contract | Pass | Pass | Pass | Confirmed | None. |
| `BEH-007` | System | Pass | Pass | Pass | Confirmed | None. |
| `BEH-008` | System | Pass | Pass | Pass | Confirmed | None; the design now removes both the authoring layer and the public core processor/pipeline layer, and pins legal fence closing separately from opening recognition. |
| `BEH-009` | System | Pass | Pass | Pass | Confirmed | None. |
| `BEH-010` | System | Pass | Pass | Pass | Confirmed | None. |
| `BEH-011` | System | Pass | Pass | Pass | Confirmed | None; validated team context is the sole Team Runtime source and automatic-tool trigger. |
| `BEH-012` | Contract | Pass | Pass | Pass | Confirmed | None; the direct append is followed by complete-payload validation, and coverage must use a real valid configured skill containing placeholder-shaped metadata rather than an injectable test processor. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `system-prompt-contract.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `agent-identity-prompt-spec.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `working-environment-prompt-spec.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `bash-operating-practice-prompt-spec.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `file-and-directory-practice-prompt-spec.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `team-and-runtime-prompt-spec.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `prompt-value-binding-spec.md` | Pass | Pass | Pass | Pass | Pass | None; it distinguishes carpenter-portion validation from the direct native final-payload owner and defines the separate legal fence-close rule. |
| `system-skill-decision.md` | Pass | Pass | Pass | Pass | Pass | None; the ownership table now matches the approved Bash/File sections. |
| `classroom-simulation-composed-system-prompt.md` | Pass | Pass | Pass | Pass | Pass | None; authored-body normalization is correctly recorded as out of scope and externally owned. |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements and design identify a large behavior change/refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Shared structure looseness and boundary/ownership fragmentation are traced across the three runtime composers. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | One shared semantic composer and clean removal are required now; external package cleanup and authored-body editorial normalization are explicitly deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spines, ownership, exact core removal inventory, focused Skills appender, fence correction, automatic-tool exposure boundary, file mapping, and sequence implement the approved decision without changing MCP/client lifecycle. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Cross-runtime carpenter composition and provider projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Team Runtime derivation from validated team context | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Configured ordinary skill exposure/materialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Carpenter-portion validation and containment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Native complete-payload invariant | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` | Cross-runtime automatic team-tool exposure | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

`DS-006` is now a provider-neutral requested-tool spine, independent of prompt composition and existing MCP/client lifecycle. This removes the superseded target mechanism behind `AR-001` and `MP-003`.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `CarpenterPromptComposer` | Pass | Pass | Pass | Pass | Correct semantic owner for the shared carpenter portion. |
| `SystemPromptProcessingStep` / final native provider payload | Pass | Pass | Pass | Pass | It directly invokes one focused configured-Skills appender, asserts the complete payload, then mutates state/configures the LLM; no generic pipeline or caller-provided mutator remains. |
| Shared runtime tool exposure | Pass | Pass | Pass | Pass | One context-aware union feeds all provider projectors; no provider-local defaults. |
| Codex/Claude Agent Tools MCP lifecycle | Pass | Pass | Pass | Pass | Existing creation, identity, cleanup, and client ownership remain unchanged and outside prompt composition. |
| Claude session bootstrap/cleanup | Pass | Pass | Pass | Pass | Descriptor identity, reuse, create/resume projection, and cleanup are explicit. |
| Agent/team definition and authoring surfaces | Pass | Pass | Pass | Pass | Clean removal of obsolete processor selection is explicit. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider adapters -> shared composer | Pass | Pass | Pass | Pass | Provider wording divergence is prohibited. |
| Composer -> team renderer/domain values | Pass | Pass | Pass | Pass | No provider or storage reparsing dependency. |
| Skill subsystem -> native/provider materialization | Pass | Pass | Pass | Pass | Bodies stay outside the shared carpenter foundation. |
| Runtime tool exposure -> provider-native projection | Pass | Pass | Pass | Pass | Tool defaults are resolved once; descriptors remain transport outputs and never prompt inputs. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `CarpenterPromptComposer.compose(...)` | Pass | Pass | Pass | Low | Pass |
| `TeamRuntimeInstructionRenderer.render(...)` | Pass | Pass | Pass | Low | Pass |
| Agent Tools MCP descriptor creation | Pass | Pass | Pass | Low | Pass |
| Native final prompt processing boundary | Pass | Pass | Pass | Low | Pass |
| `appendConfiguredSkillsCatalog` | Pass | Pass | Pass | Low | Pass |
| `resolveRuntimeAgentToolExposure` | Pass | Pass | Pass | Low | Pass |
| Provider instruction projection fields | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Prompt composition | Pass | Pass | Pass | Pass | A new shared semantic owner replaces duplicated provider composers. |
| Team manifest/runtime facts | Pass | Pass | Pass | Pass | Existing roster and delegation builders are reused beneath a narrower renderer. |
| Skill resolution/materialization | Pass | Pass | N/A | Pass | Existing SkillService and provider materializers remain authoritative. |
| Automatic team-tool exposure | Pass | Pass | Pass | Pass | The existing shared exposure capability is renamed and extended rather than duplicated in three adapters. |
| Agent Tools MCP and Codex ref-counted client lifecycle | Pass | Pass | N/A | Pass | Current ownership is explicitly preserved; no prompt-driven session or cleanup change remains. |
| Heading containment | Pass | Pass | Pass | Pass | A small fence-aware reusable concern is justified by multiple authored bodies; opening and active-fence closing have distinct exact recognition rules. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared prompt composition | Pass | Pass | Pass | Pass | Server-owned and provider-neutral. |
| Team execution rendering | Pass | Pass | Pass | Pass | Team facts remain team-owned. |
| Native terminal skill catalog | Pass | Pass | Pass | Pass | Focused appending replaces the generic processor abstraction, and final validation is correctly allocated after rendering. |
| Runtime tool exposure | Pass | Pass | Pass | Pass | Shared requested-name owner serves native/Codex/Claude without absorbing provider transport. |
| Codex backend lifecycle | Pass | Pass | Pass | Pass | Existing lifecycle is unchanged; the superseded full-cleanup target is prohibited. |
| Claude backend lifecycle | Pass | Pass | Pass | Pass | Explicit state and cleanup mapping. |
| Definition/GraphQL/web cleanup | Pass | Pass | Pass | Pass | Closed authoring/runtime surface removal is concrete. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Cross-provider prompt composition | Pass | Pass | Pass | Pass | `carpenter-prompt-composer.ts`. |
| Fixed section Markdown | Pass | Pass | Pass | Pass | `carpenter-prompt-sections.ts`. |
| Fence-aware heading containment | Pass | Pass | Pass | Pass | `markdown-heading-containment.ts` owns distinct opening and legal active-close recognition without becoming a general Markdown parser. |
| Team capability rendering | Pass | Pass | Pass | Pass | `team-runtime-instruction-renderer.ts`. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Composer semantic input | Pass | Pass | Pass | Pass | Pass | Definition, workspace, and optional validated team context are the complete prompt inputs; tool exposure is absent. |
| Runtime requested-tool exposure | Pass | Pass | Pass | Pass | Pass | Configured names and automatic team defaults have one deduplicated requested-name meaning. |
| Claude runtime context | Pass | Pass | Pass | Pass | Pass | Replaces duplicate instruction/team fields with the composed prompt while existing MCP state stays separately owned. |
| Skill model | Pass | Pass | Pass | Pass | Pass | One ordinary model is preserved. |
| Agent definition authoring model | Pass | Pass | Pass | Pass | Pass | Obsolete optional processor field is removed without a replacement field. |
| Native `AgentConfig` | Pass | Pass | Pass | Pass | Pass | Skills/access mode remain; processor objects, global defaults, constructor slot, and copy propagation are removed rather than replaced or aliased. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `carpenter-prompt-composer.ts` | Pass | Pass | Pass | Pass | Shared order/normalization/composition. |
| `carpenter-prompt-sections.ts` | Pass | Pass | Pass | Pass | Fixed approved Markdown. |
| `markdown-heading-containment.ts` | Pass | Pass | Pass | Pass | Fence-aware authored-body containment with separate opening and closing recognition only. |
| `team-runtime-instruction-renderer.ts` | Pass | Pass | Pass | Pass | Generated team runtime only. |
| Native final step and focused Skills appender | Pass | Pass | Pass | Pass | Direct append, ordering, failure path, and real-skill coverage are explicit. |
| Core `AgentConfig`, barrels, and deleted processor/pipeline files | Pass | Pass | Pass | Pass | Exact fields, constructor/copy slot, exports, sources, tests, caller updates, and absence searches are mapped. |
| `runtime-agent-tool-exposure.ts` and provider callers | Pass | Pass | Pass | Pass | Cleanly replaces configured-only naming and centralizes the exact two team defaults. |
| Codex bootstrap file | Pass | Pass | Pass | Pass | Consumes shared exposure and context-only prompt composition without changing factory/context/cleanup/manager lifecycle. |
| Claude bootstrap/context/client/cleanup files | Pass | Pass | Pass | Pass | Create/resume and cleanup are explicit. |
| Definition/GraphQL/web removal set | Pass | Pass | Pass | Pass | Removal responsibilities are concrete. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/prompt/*` | Pass | Pass | Low | Pass | Shared provider-neutral prompt capability. |
| `src/agent-team-execution/services/team-runtime-instruction-renderer.ts` | Pass | Pass | Low | Pass | Team-owned runtime facts. |
| Native final-payload validation placement | Pass | Pass | Low | Pass | Existing native bootstrap step is the correct complete-payload boundary. |
| Runtime tool exposure placement | Pass | Pass | Low | Pass | Existing cross-runtime shared folder is the natural requested-tool owner. |
| Codex session/client cleanup placement | Pass | Pass | Low | Pass | No target change remains; established provider lifecycle stays local. |
| Provider-specific adapters | Pass | Pass | Low | Pass | Thin projection remains local. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Fragmented native/team/provider composers and strategies | Pass | Pass | Pass | Pass | Clean replacement by composer/renderer. |
| Claude per-turn XML instruction wrapping and duplicate fields | Pass | Pass | Pass | Pass | SDK system prompt becomes authoritative. |
| Description fallbacks | Pass | Pass | Pass | Pass | Optional identity fields are explicit. |
| `systemPromptProcessorNames` authoring/runtime surface | Pass | Pass | Pass | Pass | Domain/config/service/API/tool/web/generated/built-in removal is enumerated. |
| Core `AgentConfig` processor injection/default/copy surface | Pass | Pass | Pass | Pass | The exact property, mutable default, constructor position, assignment, copy propagation, caller updates, and tests are named. |
| Generic `SystemPromptPipeline` and processor base/definition/registry/registration exports | Pass | Pass | Pass | Pass | Files, barrels, package-root exports, obsolete tests, usages, and compatibility aliases are explicitly removed. |
| Obsolete headings/wording | Pass | Pass | Pass | Pass | Exact target sections are authoritative. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Runtime composers/strategies | No | Pass | Pass | No compatibility path retained. |
| Historical file-definition keys | No | Pass | Pass | Version-agnostic current reader ignores unrecognized keys. |
| Provider prompt transport | No | Pass | Pass | One high-authority field per provider. |
| Core native prompt mutation | No | Pass | Pass | One direct platform-owned Skills append replaces the public configurable processor/pipeline contract without an alias or null compatibility slot. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| File-backed agent definitions with historical `systemPromptProcessorNames` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Current normalizer projects recognized keys; historical key is ignored and never executed. |
| Run/thread history | Not Affected | Pass | Pass | N/A | Pass | No stored field or historical prompt rewrite is introduced. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared composer and team renderer introduction | Pass | Pass | Pass | Pass |
| Native projection and terminal Skills | Pass | Pass | Pass | Pass |
| Core processor/pipeline removal and positional `AgentConfig` callers | Pass | Pass | Pass | Pass |
| Fence containment correction | Pass | Pass | Pass | Pass |
| Runtime tool exposure and Codex/Claude transport | Pass | Pass | Pass | Pass |
| Claude projection/create/resume/cleanup | Pass | Pass | Pass | Pass |
| Definition/API/web clean removal | Pass | Pass | Pass | Pass |
| Coverage/docs and evidence package | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Exact full composed prompt | Yes | Pass | Pass | Pass | Professor/student fixture exercises complete ordering and omissions. |
| Tool-subset Team Runtime behavior | Yes | Pass | Pass | Pass | Binding/team supplements close subset behavior. |
| Optional/invalid value behavior | Yes | Pass | Pass | Pass | Binding matrix is actionable. |
| Final native prompt after skill append | Yes | Pass | Pass | Pass | `SR-002` provides exact post-Skills placement and the placeholder-shaped metadata case. |
| Automatic team tools across providers | Yes | Pass | Pass | Pass | The design gives an omitted-config/dedup example and requires native, Codex, and Claude boundary assertions. |
| Same-marker fence-like content versus legal close | Yes | Pass | Pass | Pass | `SR-004` provides the non-closing content example plus backtick, tilde, longer-close, and overflow coverage obligations. |

## Material Premise Validation (Only When Needed)

### `MP-001` — A Codex Agent Tools MCP session is created, then Codex thread creation or restoration fails

- Related approved requirement or established contract: `R-004` / `AC-004` provider encapsulation and the established lifecycle contract that capability-bearing runtime sessions created during bootstrap are revoked when their owner fails to construct.
- Relevant behavior ID(s): `BEH-003`, `BEH-004`, `BEH-011`.
- Initiating basis kind: `System`.
- Independent product-supported initiating trigger or applicable governing contract: a supported AutoByteus agent run starts or restores with runtime kind Codex.
- Support evidence: the production `CodexAgentRunBackendFactory.createBackend` and `restoreBackend` paths call the Codex bootstrapper and explicitly catch `createThread`/`restoreThread` rejection, proving that failed thread construction/restoration is part of the supported bootstrap lifecycle rather than a synthetic-only path.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: supported run create/restore -> `CodexAgentRunBackendFactory` -> `CodexThreadBootstrapper` -> `AgentToolMcpSessionService.createAgentToolMcpSession` -> composed `CodexThreadConfig` -> `CodexThreadManager.createThread` or `restoreThread` rejects -> factory catch.
- Lifecycle preconditions and material consequence at the claimed point: the MCP registry session/token has been created before the external thread operation, but the backend was not constructed. Current factory cleanup releases only prepared workspace skills; current `CodexAgentRunContext`/`CodexThreadCleanup` does not own the descriptor/session identity. The registry entry/capability can remain live without a constructed Codex backend owner.
- Reachability: `Reachable`.
- Review consequence / proportionate response: the descriptor-before-prompt target that made extra ownership necessary was removed by the approved `SR-003` contract. Existing provider session lifecycle remains unchanged, so this prior premise drives no current finding or machinery.

### `MP-002` — A configured skill description containing double-brace placeholder syntax reaches the native terminal Skills append

- Related approved requirement or established contract: `R-005`, `R-014`, and `AC-014`, which require that no final provider instruction payload contain unresolved `{{...}}` syntax.
- Relevant behavior ID(s): `BEH-002`, `BEH-006`, `BEH-012`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: the user creates or updates an ordinary skill through the exposed Skills authoring surface with a non-blank free-form description containing `{{token}}`, then configures that skill for a native agent run.
- Support evidence: GraphQL `createSkill`/`updateSkill` call `SkillService`, which writes the supplied description to `SKILL.md`; the current and proposed validation require non-blank metadata but define no double-brace rejection. The supported configured-skill path renders name/description in the native catalog.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Skills authoring UI/GraphQL mutation -> `SkillService.createSkill` or `updateSkill` -> configured skill resolution -> `CarpenterPromptComposer` assertion on the carpenter portion -> native `SystemPromptProcessingStep` calls the direct `appendConfiguredSkillsCatalog` -> complete-payload assertion -> provider system prompt or bootstrap failure.
- Lifecycle preconditions and material consequence at the claimed point: the dynamic value is valid under the skill metadata rules and is added only after the composer assertion. Without the complete-payload assertion, the actual final native provider instruction would contain forbidden unresolved-placeholder syntax despite `AC-014`.
- Reachability: `Reachable`.
- Review consequence / proportionate response: resolved by `SR-002`; `SystemPromptProcessingStep` now owns the actual final assertion with focused no-provider-invocation coverage.

### `MP-003` — A proposed factory full cleanup releases a Codex client reference already released by failed thread startup

- Related approved requirement or established contract: `R-004` / `AC-004` provider lifecycle encapsulation and the current `CodexAppServerClientManager` reference-count contract for shared workspace clients.
- Relevant behavior ID(s): `BEH-004`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: while one Codex run is active, the user selects **Start new run** for the same agent/workspace and launches another Codex run; the second run's external thread start or restore rejects.
- Support evidence: `RunningAgentGroup.vue` exposes the localized **Start new run** button even while its group lists existing runs; `RunningAgentsPanel.vue` seeds the new run from the selected/most recent run, preserving its workspace/runtime choices; GraphQL `createAgentRun` accepts that workspace and runtime; the run manager supports multiple run IDs. `CodexAppServerClientManager` intentionally keys by normalized working directory and reference-counts every acquisition.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: the supported first-run/second-run same-workspace path can reach `startThread` failure, whose existing catch releases only the failed acquisition. Under `SR-003`, the factory is not changed to call full cleanup, no MCP lease is added to `CodexAgentRunContext`, and no second client release is introduced. The forward target path therefore stops after the balanced local release and never reaches the claimed second release.
- Lifecycle preconditions and material consequence at the claimed point: concurrent same-workspace runs remain supported, but the superseded full-cleanup mechanism that caused the over-release is absent. The first live run retains its reference.
- Reachability: `Not Reachable`.
- Review consequence / proportionate response: `MP-003` cannot drive a finding or cleanup machinery in `SR-003`. Preserve the existing MCP/client lifecycle as the design requires.

### `MP-004` — A supported authored instruction body contains a same-marker fenced content line that is not a legal closing fence

- Related approved requirement or established contract: `R-010`, `R-014`, `AC-010`, and `AC-014`; authored fenced Markdown must remain unchanged while only ATX headings outside fences are contained.
- Relevant behavior ID(s): `BEH-008`, `BEH-012`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: a user creates or edits an agent definition's free-form instruction body through the Agent Definition form or GraphQL create/update mutation; file-backed `agent.md` authoring is also supported.
- Support evidence: `CRR-001` / `CR-MP-001` traces the exposed `instructions` textarea and mutations to `AgentDefinition.instructions`, and directly reproduces the current parser result.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Agent Definition form/GraphQL mutation or file-backed source -> `AgentDefinition.instructions` -> `composeCarpenterPrompt` -> `containAuthoredMarkdownHeadings` -> native, Codex, or Claude provider instruction projection.
- Lifecycle preconditions and material consequence at the claimed point: for an opened backtick fence containing a same-marker prefix followed by non-whitespace content and then an ATX heading, the current shared prefix matcher falsely closes the fence and rewrites that fenced heading. The authored code content changes before provider projection.
- Reachability: `Reachable`.
- Review consequence / proportionate response: `SR-004` provides the bounded correction: distinct opening/active-close recognition, same marker, run length at least the opener, trailing spaces/tabs only, and focused backtick/tilde/non-close/longer-close/overflow coverage. No generalized Markdown parser is introduced.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — the approved behavior basis is confirmed and the design is ready for implementation.

## Findings

None.

## Classification

N/A — no current finding.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Claude create and resume must continue to pass the same composed `options.systemPrompt`; the design addresses this and focused execution evidence remains required downstream.
- Positional `AgentConfig` callers must all be updated without leaving a null compatibility slot; the explicit repository-wide absence search and source re-review must verify the clean cut.
- Heading containment must implement the exact legal active-close rule and preserve same-marker content; the focused cases remain downstream implementation evidence.
- Native post-Skills placeholder rejection must be exercised through a real registered configured skill; downstream implementation and source review still must verify it.
- External `shell-first-operating-practice` package/consumer cleanup and authored-body editorial normalization remain follow-ups in their owning repositories and must not introduce a compatibility runtime path here.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — `MP-004` is reachable through supported authoring and the bounded parser correction is proportionate; prior `MP-003` remains `Not Reachable` and drives no machinery.
- Notes: `ARCH-REV-004` is authoritative. `SR-004` resolves code-review design impact `CR-001` and carries the bounded `CR-002` correction into an actionable design. Earlier `AR-002` and `AR-003` remain resolved, and `AR-001` remains obsolete under the approved `SR-003` target replacement. Implementation revision and source re-review are required before API/E2E.
