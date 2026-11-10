# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/requirements-doc.md` (Approved; SR-004)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/investigation-notes.md` (AF-01..AF-26)
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/solution-revision-record.md` (SR-001..SR-004)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/design-spec.md` (SR-004, commit `f72aca709`)
- Supplemental Task Artifacts Reviewed: `semantic-memory-prompt-contract.md` (behavior-defining, SR-004), `follow-ups.md` (FU-001..FU-009)
- Relevant Solution Revision IDs: SR-002 (approval), SR-003 (design), SR-004 (prompt contract)
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Architecture Design Complete at SR-003, superseded before completion by SR-004 (the Solution Designer asked to review SR-004 instead). No result was issued on SR-003.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory`, branch `codex/agent-semantic-memory`, source at base `f78b60ddd` (ticket docs at `f72aca709`). Opened at their cited lines: `carpenter-prompt-composer.ts` (whole), `carpenter-prompt-sections.ts` (whole), `codex-thread-bootstrapper.ts:220-300`, `codex-integration-thread-config.ts`, `claude-session-bootstrapper.ts:44-120`, `claude-session-config.ts`, `claude-session-query-options.ts:30-80`, `acp-agent-run-backend-factory.ts:60-150`, `agy-agent-run-backend-factory.ts:35-90`, `autobyteus-agent-run-backend-factory.ts:290-345`, `agent-memory-layout.ts:1-90`, `team-local-definition-id.ts`, `agent-org-owned-definition-id.ts`, `configured-agent-execution-handle.ts:455-475`, `personal-setting-record.ts:1-80`, `agent-definition-service.ts:64,330-499`, `agent-definition-converter.ts:40-75`, `docs/modules/deepseek_harness_runtime.md:80-95`, done ticket `package-personal-settings/personal-settings-file-contract.md` §5–§8.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: spans agent definitions, personal settings, agent memory, prompt composer, five runtime backends, GraphQL and web; changes shared contracts (`agent-config.json`, `personal-settings.json`, GraphQL `AgentDefinition`) and a write-access boundary (Codex writable roots, Claude additional directories).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Confirmed by the five composer call sites (grep) and the contract surfaces listed.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: an optional per-definition flag; when on, the server owns `<memory dir>/semantic/<encoded id>/`, creates it at run preparation, tells every run the path in a minimal fixed section, and makes it writable where a runtime would refuse or prompt; off agents unchanged byte for byte.
- Relevant existing behavior and evidence confirmed: one composer used by all five backends (grep: Claude `:93`, Codex `:254`, AutoByteus `:329`, AGY `:60`, ACP `:136`); sections joined with `"\n\n"` and order Identity → Team Instruction → collaboration → Project (composer `:32-49`); Codex/Claude/ACP read the definition and compose inside the shared create/restore path; AGY composes at create only; Codex already sends `sandbox_workspace_write` in thread config via the integration builder (`codex-integration-thread-config.ts:13-22`); member/delegated runs carry `execution.agentDefinitionId` (`configured-agent-execution-handle.ts:460-461`); `AgentMemoryLayout` owns memory folder names and `resolveSafePath`.
- Scope guardrail confirmed: In-Scope UC-001..UC-004; Out of Scope (run-folder renaming, Memory page, search, history/sync, locking, operator package, router knowledge) respected by the design; Preserved Behavior Boundary (REQ-008/AC-005 byte identity, run memory tooling, sandbox modes) respected; Review Authority applied.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (no blocking findings).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on: all opened statements match. Contract §5.1's Project-section text matches `renderProjectSection` verbatim; §2's backtick convention matches `renderWorkingEnvironmentSection`; §2's placeholder note matches `assertNoUnresolvedPlaceholders`. One unstated touch point (not false, only not named): `PERSONAL_FIELDS` at `agent-definition-service.ts:64` decides which fields skip the file write for package agents (see Residual Risks note N-1).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (composer + 5 callers read) | Pass (DS-001; contract §1–§5) | Confirmed | — |
| BEH-002 | User | Pass | Pass (`updateAgentDefinition` personal routing `:359-387`; record fields) | Pass (DS-002, DS-003) | Confirmed | — |
| BEH-003 | System | Pass | Pass (layout owner; no-delete) | Pass (DS-001 via `prepareForRun`) | Confirmed | — |
| BEH-004 | System | Pass | Pass (shared ref → shared ID; member config carries definition ID; team-local/Org IDs distinct) | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass (AF-01/02 probe; integration builder; Claude options) | Pass (DS-001 runtime nodes, DS-004) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear | Linked To Core Artifacts | Internally Complete | Consistent With Core Artifacts | Status And Approval Applicability Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `semantic-memory-prompt-contract.md` | Pass | Pass (requirements Document Status + Supplemental Artifacts + REQ-005 source; design approval basis + supplements + examples + guidance; investigation inventory) | Pass (presence, exact text, path form, placement, examples incl. disabled/Windows/member, verification) | Pass (text realizes REQ-005 clause by clause; placement matches composer order; path form matches design's layout method) | Pass (behavior-defining; changes need renewed approval) | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass (not behavior-defining) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature posture; triggers listed with evidence | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; owners exist for layout, personal settings, composer (AF-15, AF-19) | — |
| Refactor needed now / no / deferred is explicit | Pass | Yes, small: `agent-definition-edits.ts` extraction (service is 499 lines, verified); Codex sandbox object split; FU-005/006 deferred (515/526 lines verified) | — |
| Refactor decision supported by concrete design sections | Pass | File mapping, removal plan, sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade Vs Owner | Subject Naming | One Owner Per Node, Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Run create/restore → runtime start | Pass | Pass | N/A | Pass | Pass (backend drives: read definition → `prepareForRun` → compose → runtime write access → start; each backend calls each mechanism itself) | Pass | Pass |
| DS-002 | Form save → file or personal record | Pass | Pass | N/A | Pass | Pass (`AgentDefinitionService` routes, as for the four existing settings) | Pass | Pass |
| DS-003 | Detail load → path shown | Pass | Pass | N/A | Pass | Pass (converter → pure `folderOf`) | Pass | Pass |
| DS-004 | Codex `sandbox_workspace_write` build | Pass | Pass | N/A | Pass | Pass (one builder) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentSemanticMemory` | Pass | Pass (layout semantic path called only by owner) | Pass (forbidden: backend reads flag + calls layout) | Pass | — |
| `AgentMemoryLayout` | Pass | Pass | Pass | Pass | Extended in place |
| Carpenter composer | Pass | Pass | Pass | Pass | Stays pure; required key prevents a caller from omitting it |
| `PersonalSettingsService` | Pass | Pass | Pass | Pass | — |
| Codex sandbox builder | Pass | Pass | Pass | Pass | Integration builder stops emitting the key |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/*` | Pass | Pass (no layout access) | Pass | Pass | — |
| `agent-execution/prompt` | Pass | Pass (no fs/config) | Pass | Pass | — |
| `api/graphql/converters` | Pass | Pass (no mkdir on read) | Pass | Pass | — |
| `runtime-management/claude/client` | Pass | Pass (data only) | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentSemanticMemory.folderOf(definition)` | Pass | Pass | Pass | Low | Pass |
| `AgentSemanticMemory.prepareForRun(definition)` | Pass | Pass | Pass | Low | Pass |
| `AgentMemoryLayout.getAgentSemanticMemoryDirPath(agentDefinitionId)` | Pass | Pass | Pass | Low | Pass |
| Composer `semanticMemoryPath: string \| null` (required) | Pass | Pass | Pass | Low | Pass |
| `buildCodexSandboxWorkspaceWriteConfig` | Pass | Pass | N/A | Low | Pass |
| GraphQL fields / inputs / `PersonalSetting.SEMANTIC_MEMORY` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Memory folder naming | Pass | Pass (extend layout) | N/A | Pass | — |
| Per-node override for package/built-in agents | Pass | Pass (fifth personal setting) | N/A | Pass | Matches contract §8 sources |
| Instructions | Pass | Pass | N/A | Pass | — |
| Enable rule + mkdir | Pass | Pass | Pass (no existing owner of agent-owned knowledge) | Pass | — |
| Codex sandbox object | Pass | Pass (split, one owner) | Pass | Pass | Prevents `{...a, ...b}` overwrite of `network_access` |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-memory` | Pass | Pass | Pass | Pass | — |
| `agent-definition` | Pass | Pass | Pass | Pass | — |
| `personal-settings` | Pass | Pass | Pass | Pass | — |
| `agent-execution/prompt`, `backends/*`, `runtime-management/claude` | Pass | Pass | Pass | Pass | All runtime kinds traced separately |
| `api/graphql`, `autobyteus-web` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Folder path for a definition | Pass | Pass | Pass | Pass | One derivation for runs and GraphQL |
| `sandbox_workspace_write` object | Pass | Pass | Pass | Pass | — |
| Config→domain mapping (two readers) | Pass | N/A | N/A | Pass | Old duplication, FU-008 |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentDefinition.semanticMemoryEnabled` | Pass | Pass (path derived, never stored) | Pass | N/A | Pass | — |
| Personal record `semanticMemoryEnabled` | Pass | Pass (equal to base → removed) | Pass | N/A | Pass | Agents only |
| `agent-config.json` field | Pass | Pass (written only when true) | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass` (design Change Scope list).

One vocabulary across code, data, wire, tools, UI and docs: `Pass` (`semanticMemoryEnabled` everywhere; glossary entry separates it from the old `semantic.jsonl`/library items; FU-009).

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-memory/services/agent-semantic-memory.ts` (Add) | Pass | Pass | N/A | Pass | — |
| `agent-memory/store/agent-memory-layout.ts` | Pass | Pass | N/A | Pass | — |
| `prompt/carpenter-prompt-sections.ts`, `carpenter-prompt-composer.ts` | Pass | Pass | N/A | Pass | Text per contract §2 |
| Five backend files (wiring) | Pass | Pass | N/A | Pass | AutoByteus factory wiring only |
| `codex-sandbox-workspace-write-config.ts` (Add), `codex-integration-thread-config.ts` | Pass | Pass | Pass | Pass | — |
| Claude session config / query options / SDK client | Pass | Pass | N/A | Pass | — |
| Agent definition config/readers/service + `agent-definition-edits.ts` (Add) | Pass | Pass | Pass | Pass | Service ≤500 lines |
| Personal settings record/service/GraphQL enum | Pass | Pass | N/A | Pass | — |
| Web `AgentSemanticMemoryField.vue` (Add) + form/detail wiring | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-memory/services/agent-semantic-memory.ts` | Pass | Pass | Low | Pass | — |
| `codex/backend/codex-sandbox-workspace-write-config.ts` | Pass | Pass | Low | Pass | — |
| `agent-definition/services/agent-definition-edits.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `sandbox_workspace_write` in integration builder | Pass | Pass | Pass | Pass | Doc comment moves; tests updated |
| `cloneAgent`/`personalEditsOf` move | Pass | Pass | Pass | Pass | — |
| Dead code in touched files | Pass | N/A | Pass | Pass | None found; library dead code FU-009 |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retention Exists | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Codex sandbox object | No | Pass | Pass | Merge-after rejected |
| Config/personal record field | No | Pass | Pass | Tolerant optional field, no version branches |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `agent-config.json` | Directly Usable — No Migration | Pass (tolerant reader, absent = off) | Pass | N/A | Pass | — |
| `personal-settings.json` | Directly Usable — No Migration | Pass (reader skips unknown/invalid; absent = not personal) | Pass | N/A | Pass | — |
| `memory/semantic/<id>/` | New, never deleted | Pass (scanners walk run roots only, AF-16) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Server domain → personal settings → owner → composer/backends → GraphQL/web → tests/docs | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present And Clear | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Section text/placement | Yes | Pass (contract §2, §5) | Pass | Pass | — |
| Folder encoding | Yes | Pass | Pass | Pass | — |
| Codex config | Yes | Pass | Pass | Pass | — |
| Backend wiring | Yes | Pass | Pass | Pass | — |
| Config write | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

None. No finding or proposed mechanism depends on a scenario outside the established basis. Concurrent writes (SCN-006) are an approved accepted risk.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation, per the handoff rules.

## Residual Risks

- Codex app-server `writable_roots`: shown with the Codex CLI sandbox (AF-01/AF-02). The same thread-`config` key `sandbox_workspace_write` already carries `network_access` in production today (`codex-integration-thread-config.ts:20`), which lowers the risk. AC-002 E2E must confirm it with a data dir outside `/tmp` (AF-03).
- DeepSeek harness (FU-007): with auto-execute off, writes to the folder need a sandbox-escalation approval while workspace writes do not, so REQ-006's "same approval policy" holds only with auto-execute on. AC-002's alternate outcome covers this (report with evidence). Make sure the delivery report states it.
- Claude `additionalDirectories` makes the folder a working directory for Claude Code. If an agent ever puts `.claude/` content there, Claude may pick it up. The design accepts this.
- N-1 (implementation note, not a finding): for package and built-in agents, `agent-definition-service.ts:64` `PERSONAL_FIELDS` decides which fields skip the file write. `semanticMemoryEnabled` must be added there, or the switch would also write package files and break AC-007 ("package files unchanged"). DS-002 already states the intended routing; the AC-007 API test covers it.
- N-2 (housekeeping): `handoff-architecture-design.md` line 4 still says `SR-003`. The canonical documents say SR-004.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: SR-004 reviewed (SR-003 superseded). The design structure is unchanged by SR-004. The prompt contract is consistent with REQ-005, the composer's real section order and join, and AC-005 byte identity. Classification Large/High is preserved.
