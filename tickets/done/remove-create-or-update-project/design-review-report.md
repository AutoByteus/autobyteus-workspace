# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/requirements-doc.md` (`Approved`, SR-001)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts Reviewed: `tickets/done/project-tool-split/` (origin of FU-2/DEC-006; read-only, not behavior-defining)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Solution Designer handoff `handoff-architecture-design.md` (Architecture Design Complete, SR-002)
- Prior Review Round Reviewed: N/A (first review of this ticket)
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project`, branch `codex/remove-create-or-update-project`, base `origin/personal` @ `2f211340ee`. Read directly: `git grep -c create_or_update_project -- ':!tickets'` (13 files, matches SRC-01); `autobyteus-server-ts/src/agent-tools/project-tasks/{project-task-tool-contract,project-task-tool-manifest,project-task-native-tools}.ts`; `git grep` of `effectiveProjectTaskToolName`, `EffectiveProjectTaskToolName`, `CreateOrUpdateProjectTool`, `projectInput(`; `autobyteus-agent-tool-resolver.ts` unknown-name branch; precedent skip tests `task-tool-runtime-parity.test.ts:60-76` and `autobyteus-agent-tool-resolver.test.ts:114-123`; docs passages in `projects.md` (l.56-62, l.442 heading, l.454), `agent_tools_mcp_server.md` (l.253, l.327-330), `autobyteus-web/docs/projects.md` (l.457-458); `autobyteus-web/tests/e2e/team-status-live-probe.mjs:141`.

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High`
- Classification rationale reviewed: confirmed. The structural delta is the project-task tool contract only (three source files). Removing a public agent tool contract on two transports, and its protected first-party name, is a material contract change → `High`. `Small` fits: the change only deletes code inside existing owners and adds no new mechanism.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: remove `create_or_update_project` from every runtime and the picker, and drop its protected name. Definitions still listing it launch and skip it. The new tools stay unchanged. Repository references are limited to the REQ-004 exceptions. The release note announces the removal. The web probe no longer lists either removed name.
- Relevant existing behavior and evidence confirmed: the old tool is in `PROJECT_TASK_TOOL_NAMES`/`ProjectTaskToolName`, has its own description and schema branch, and is resolved by `effectiveProjectTaskToolName`. That helper is called from `parseProjectTaskToolInput` (contract l.224) and `executeProjectTaskTool` (manifest l.60). `CreateOrUpdateProjectTool` is registered in `registerProjectTaskTools`. No production code outside `agent-tools/project-tasks` names the old tool, `create_project` or `update_project`. The MCP manifest and its protection derive from `PROJECT_TASK_TOOL_NAMES`. Exposure drops names outside the set (`isProjectTaskToolName`). The AutoByteus resolver warns "not found in registry. Skipping." for unregistered names and continues.
- Scope guardrail confirmed: `Yes`
- Approved change, preserved behavior, and outside scope understood: `Yes`
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none)
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (contract l.4-7, 14-15, 52-58, 146-153, 224; manifest l.8, 59-60; native l.40-44, 58) | Pass (DS-001: every name runs as itself; new-tool parsers untouched) | Confirmed | — |
| BEH-002 | Contract | Pass | Pass (resolver warn-and-skip; exposure filter; MCP set-driven; precedent skip tests exist) | Pass (DS-002 unchanged; old name becomes unknown) | Confirmed | — |
| BEH-003 | Contract | Pass | Pass (doc passages located; `.github` notes written by the release step per RELEASE.md, SRC-04) | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/done/project-tool-split/` | Pass | Pass | Pass | Pass | Pass (archived, N/A) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Cleanup` (planned removal) | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Legacy Or Compatibility Pressure`: the transition dispatcher, verified in code | — |
| Refactor decision is explicit | Pass | `Yes`, clean-cut removal | — |
| Refactor decision is supported by concrete design sections | Pass | removal plan, tests to add, sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary: tool call → `{project}`/`{error}` | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary: launch → visible tools (old name skipped) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| project-task tool contract | Pass | Pass | Pass | Pass | removing the exported `effectiveProjectTaskToolName` drops the manifest's second contract import; dispatch returns to `parseProjectTaskToolInput(name)` only |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| transports → contract/manifest → `ProjectService` | Pass | Pass | Pass | Pass | unchanged |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `create_project` | Pass | Pass | Pass | Low | Pass |
| `update_project` | Pass | Pass | Pass | Low | Pass |
| `parseProjectTaskToolInput` / `executeProjectTaskTool` (by `name`) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| skipping the old name at launch | Pass | Pass (existing unknown-name skip; no alias or rewrite) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/project-tasks` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `projectInput`, `workspacesDefinition` | Pass | Pass | Pass | Pass | kept: still used by both project parsers and schemas (verified l.126, l.136); stale comment "three" → "both" |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectTaskToolName` | Pass | Pass (`EffectiveProjectTaskToolName` removed as identical) | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `project-task-tool-contract.ts` | Pass | Pass | N/A | Pass | — |
| `project-task-tool-manifest.ts` | Pass | Pass | N/A | Pass | remove l.59 comment and the import too |
| `project-task-native-tools.ts` | Pass | Pass | N/A | Pass | — |
| tests, docs, web probe, release notes | Pass | Pass | N/A | Pass | R-1, R-2 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| no new files | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| name, type, description, schema branch | Pass | N/A | Pass | Pass | — |
| `effectiveProjectTaskToolName`, `EffectiveProjectTaskToolName` (dead) | Pass | Pass (`name` / `ProjectTaskToolName`) | Pass | Pass | `git grep`: only callers are contract l.224 and manifest l.60 |
| `CreateOrUpdateProjectTool` + registration | Pass | N/A | Pass | Pass | — |
| old-tool tests and imports | Pass | Pass (skip tests) | Pass | Pass | three test files verified |
| doc passages | Pass | N/A | Pass | Pass | the heading `## Project And Task Agent Tools` is generic, so no anchors change |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `create_or_update_project` | No (after change) | Pass | Pass | alias, startup rewrite and "just in case" dispatcher all rejected. The migration fixture is historical-data evidence owned by the migration test (DEC-002), not runtime legacy retention. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| agent definitions' `toolNames` | `Not Affected` | Pass (the existing reader skips unknown names; SRC-07: only the PTM package lists it, together with the new names) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| contract → tests → docs/probe → release note → real-app check | Pass | N/A | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| skip tests | Yes | Pass (mirror named precedent lines) | N/A | Pass | — |
| release note text | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

None.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

Non-blocking guidance:

- **R-1 — keep old-name test references inside the REQ-004 exception.** DEC-003 allows only tests and test data that prove REQ-002 (the skip) to name the old tool. Prove REQ-001's absence with exact-set equality where possible: `PROJECT_TASK_TOOL_NAMES`, MCP adapter names and registered native names each equal the six current names. Avoid scattering `not.toContain("create_or_update_project")` across files. Negative checks inside the runtime-parity skip test, mirroring the precedent, are fine.
- **R-2 — web probe tool list.** In `team-status-live-probe.mjs:141`, the design replaces the two removed names with `create_project`, `update_project`, `create_task`, `update_task`. That gives the probe's manager two Task tools it effectively lacked before, because `create_or_update_task` was already being skipped. The probe drives a scripted AGY CLI and never calls these tools, so the change is harmless and satisfies REQ-006. Either keeping or trimming the list is acceptable.
- **R-3 — the doc passages span several lines.** Remove whole passages, not just the lines that contain the name: server `projects.md` l.60-62 (the sentence continues to the link), `agent_tools_mcp_server.md` l.327-330, web `docs/projects.md` l.457-458.
- Accepted design risk: a definition relying only on the old tool cannot change Projects until it selects the new tools (release note). No such definition was found locally (SRC-07).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (no additional premises)
- Notes: ARCH-REV-001 against SR-002. Small/High confirmed. No findings. R-1..R-3 are non-blocking.
