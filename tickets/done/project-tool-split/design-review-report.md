# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/requirements-doc.md` (`Approved`, SR-001)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts Reviewed: precedent `tickets/done/task-tool-split/design-spec.md` (read-only reference; not behavior-defining)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Solution Designer handoff `handoff-architecture-design.md` (Architecture Design Complete, SR-002)
- Prior Review Round Reviewed: N/A (first review)
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split`, branch `codex/project-tool-split`, base `origin/personal` @ `8a970f214c`. Read directly: `autobyteus-server-ts/src/agent-tools/project-tasks/{project-task-tool-contract,project-task-tool-manifest,project-task-native-tools}.ts`; `src/agent-execution/shared/runtime-agent-tool-exposure.ts`; `src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts:119-123`; `src/agent-execution/backends/claude/session/claude-session-tooling-options.ts`; `src/agent-tools/mcp/{providers/project-task-tools-mcp-adapter-provider.ts,agent-tool-mcp-catalog.ts,agent-tool-mcp-session-registry.ts}`; `src/startup/agent-tool-loader.ts`; `git grep create_or_update_project` (excluding tickets); docs `projects.md`, `agent_tools_mcp_server.md`, `autobyteus-web/docs/projects.md`; repo `DESIGN.md`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: confirmed. Structural surface is limited to the project-task tool contract, manifest and native registration (three files; `git grep` finds no other production reference to `create_or_update_project`). The change adds two public agent tool contracts on two transports, two protected first-party names that shadow same-named configured MCP tools (`protect_static_adapter` follows the manifest), and fixes a cross-version transition contract (REQ-004/REQ-005). That is a material contract impact → `High`. `Medium` size fits: several files within existing ownership, no service/exposure/persistence/UI change.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: two single-meaning tools with today's create and patch semantics; configured-only exposure; the old tool stays unchanged during the transition (user direction, DEC-002); old+new lists work in both releases; docs and release notes mark the deprecation; removal is a later user decision (DEC-006).
- Relevant existing behavior and evidence confirmed: `parseProjectMutation` decides the mode by `Object.hasOwn(input, "project_id")` and validates keys `project_id, name, description, workspaces`; `executeProjectTaskTool` routes on `project_id` in the parsed result to `patchProjectRecord`/`createProjectRecord` and projects `{project}`, wrapping non-`ProjectError` failures as `PROJECT_OPERATION_UNCONFIRMED`. Native classes and the MCP provider both derive from `PROJECT_TASK_TOOL_NAMES` and the manifest. Exposure filters configured names through `isProjectTaskToolName`; Claude/Codex MCP selection consumes `enabledProjectTaskToolNames`; the AutoByteus resolver warns and skips unregistered names. Nothing is automatic.
- Scope guardrail confirmed: `Yes`. In-scope UC-001..UC-004; out of scope: project semantics, other tools, old-tool removal, agent packages, UI; preserved: results/error codes, unknown-name skipping, the old tool's name/schema/description/behavior, shared native/MCP contract and first-party protection; review authority as stated.
- Approved change, preserved behavior, and outside scope understood: `Yes`
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no blocking findings)
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (`parseProjectMutation` create branch; manifest `createProjectRecord`) | Pass (DS-001: `create_project` → `parseCreateProjectInput` → `createProjectRecord` → `{project}`) | Confirmed | — |
| BEH-002 | System | Pass | Pass (patch branch; `patchProjectRecord`) | Pass (DS-001: `update_project` → `parseUpdateProjectInput` → `patchProjectRecord`) | Confirmed | — |
| BEH-003 | System | Pass | Pass (`buildRuntimeAgentToolExposure`; no project tool in `automaticCollaborationToolNames`) | Pass (DS-002 unchanged; names join the set) | Confirmed | — |
| BEH-004 | Contract | Pass | Pass (resolver skip at `:119-123`; MCP filter by name set; `git diff v1.5.5-beta.2 HEAD` empty on these paths per SRC-06) | Pass (old tool registered and dispatching; skip unchanged; AC-005 probe planned for both versions) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/done/task-tool-split/` (precedent) | Pass | Pass (requirements, investigation SRC-09, design spec) | Pass | Pass (difference — old tool kept — recorded as DEC-002 in both) | Pass (archived, read-only, N/A approval) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | design spec §Task Design Health Assessment (`Behavior Change`) | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue` / ambiguous-boundary trigger: `parseProjectMutation` and the manifest branch choose the operation by ID presence (verified in code) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `Yes` now (split); old-tool removal deferred to FU-2 by user decision | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | interface mapping, removal plan, file mapping, sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary: tool call → `{project}`/`{error}` | Pass | Pass | Pass (native classes / MCP entries are facades; contract + manifest govern) | Pass | Pass | Pass (error projection off-spine) | Pass |
| DS-002 | Primary: run launch → visible tools | Pass | Pass | Pass | Pass | Pass (exposure module, unchanged) | Pass (collision protection off-spine) | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `project-task-tool-contract.ts` | Pass (`parseProjectTaskToolInput`, names, descriptions, schemas) | Pass (field validators private) | Pass | Pass | new parsers may be exported as the Task parsers are; transports still go through `parseProjectTaskToolInput` |
| `project-task-tool-manifest.ts` | Pass (`executeProjectTaskTool`, manifest) | Pass | Pass (tools reach `ProjectService` only here) | Pass | — |
| `create_or_update_project` facade | Pass | Pass (no own validation or service call) | Pass | Pass | see recommendation R-1 on keeping the dispatch rule singular |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| transports → contract/manifest → `ProjectService` | Pass | Pass ("transports never parse"; service only via `executeProjectTaskTool`) | Pass | Pass | exposure depends only on `isProjectTaskToolName` (unchanged) |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `create_project` | Pass | Pass | Pass (no `project_id`; rejected as unsupported) | Low | Pass |
| `update_project` | Pass | Pass | Pass (`project_id` required) | Low | Pass |
| `create_or_update_project` | Pass | Fail by nature, accepted (user-directed transition, REQ-004; removal FU-2) | Presence-based, unchanged | Medium, time-boxed | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| create/patch semantics | Pass | Pass (`ProjectService` unchanged) | N/A | Pass | — |
| exposure, MCP collision protection | Pass | Pass (name-set driven; verified in exposure, Claude tooling options, session registry, catalog) | N/A | Pass | — |
| field validation | Pass | Pass (split today's body into shared private validators) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/project-tasks` | Pass | Pass (extend) | Pass | Pass | same shape as the Task split |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| name/description/workspaces validators | Pass | Pass (contract file, private) | Pass | Pass | — |
| `workspaces` schema definition | Pass | Pass (one builder) | Pass | Pass | must keep the old schema byte-identical (AC-004) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectTaskToolName` / `PROJECT_TASK_TOOL_NAMES` | Pass | Pass | Pass | N/A | Pass | seven names; old one marked deprecated in docs |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `project-task-tool-contract.ts` | Pass | Pass | Pass | Pass | — |
| `project-task-tool-manifest.ts` | Pass | Pass | N/A | Pass | R-1 |
| `project-task-native-tools.ts` | Pass | Pass | N/A | Pass | registers two new classes in `registerProjectTaskTools` |
| tests, fixtures, probes, docs, release notes | Pass | Pass | N/A | Pass | R-3 on AC-003 runtime coverage |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-tools/project-tasks/*` | Pass | Pass | Low | Pass | no new files |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `parseProjectMutation` | Pass | Pass | Pass (In This Change) | Pass | — |
| combined manifest branch | Pass | Pass | Pass (In This Change) | Pass | — |
| `create_or_update_project` tool | Pass | Pass | Pass (FU-2, user decides) | Pass | — |
| Dead code in touched files | Pass | N/A | Pass | Pass | No other dead code found in the three touched source files |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `create_or_update_project` | Yes | Pass | Pass | Retention is an approved requirement (REQ-004, DEC-002), not designer-introduced compatibility. The design records the general-principle conflict, keeps one validation/service path (no second parser), and names the removal (FU-2/DEC-006). The approved requirements authorize it, so technical review cannot override it. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| agent configurations' `toolNames` | `Not Affected` | Pass (SRC-07; old name stays valid; unknown names skipped) | Pass | N/A | Pass | Project data is written by the same service calls |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| contract → manifest/native → tests → docs → probes | Pass | Pass (old tool = the transition seam) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| new descriptions | Yes | Pass | Pass | Pass | — |
| old-tool dispatch | Yes | Pass | Pass (no parser copy) | Pass | — |

## Material Premise Validation (Only When Needed)

None. Every check rests on the established behavior basis (BEH-001..BEH-004). No finding or mechanism depends on an additional scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (per handoff rules); informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

Non-blocking implementation guidance. None changes approved behavior:

- **R-1 — one dispatch rule.** `project_id` presence decides the old tool's path in two places: the contract's dispatcher, and the manifest's routing on the parsed result. That is safe, because the create parser rejects `project_id`, so parsed create input never carries it. Express it once. For example, `executeProjectTaskTool` maps `create_or_update_project` to the effective tool (`create_project`/`update_project`) from the parsed result, and the rest of execution runs under that name. Keep the two branches from re-implementing the rule independently.
- **R-2 — byte-level parity for the old tool.** Keep today's validation order and messages in the shared validators and both parsers, so the old tool's errors stay identical (AC-004). That covers four points. Use the `plainObject` check and the message "Tool arguments must be a plain object.", not the Task parsers' `plainInput`. Perform the plain-object check before `Object.hasOwn` (it throws on `null`). Check unknown keys before `project_id`. Check name-required and patch-required after the field validation. The parity tests the design calls for must pin these messages, not only the codes.
- **R-3 — AC-003 across runtimes.** AC-003 names the AutoByteus, Codex and Claude runtimes. Consider extending the existing `tests/unit/agent-execution/shared/task-tool-runtime-parity.test.ts` pattern to the project tools, beyond the exposure/catalog assertions in `project-task-tools.test.ts`. This is the validation owners' choice.
- **R-4 — non-normative doc comment.** The doc comment in `runtime-agent-tool-exposure.ts` (lines 14-17) names only the Task tools as non-automatic. The file is deliberately left alone, so updating it is optional.
- Accepted design risks remain as recorded: MCP shadowing of third-party `create_project`/`update_project` (release note), and agents configured with all three tools seeing two ways to do the same thing until FU-1.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (no additional premises)
- Notes: ARCH-REV-001 against SR-002. Classification Medium/High confirmed. No findings. R-1..R-4 are non-blocking.
