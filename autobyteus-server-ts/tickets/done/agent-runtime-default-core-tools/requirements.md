# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — the explicit user request approves the expanded four-tool native-runtime behavior and the system-prompt file-operations contract; architecture review remains the gate before the follow-up implementation change.

## Goal / Problem Statement

Every agent run using the native AutoByteus runtime must receive the four foundational local-development tools `run_bash`, `read_file`, `edit_file`, and `write_file` by default, regardless of whether its persisted agent definition lists those tools and regardless of whether the run is standalone or a team member. Agent-defined tool selection must continue to control optional tools; this change establishes only the mandatory native-runtime baseline.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BE-001 | A native AutoByteus run resolves tools from configured `AgentDefinition.toolNames`; the current native wrapper adds `run_bash`, `read_file`, and `edit_file`, while a valid team context automatically adds `send_message_to` and `delegate_task`. A standalone or team agent whose definition omits `write_file` therefore does not receive it by default. | Every native AutoByteus standalone and team run has `run_bash`, `read_file`, `edit_file`, and `write_file` in its effective tool set before runtime-specific tool construction. | Existing configured tools remain available; duplicate names remain deduplicated; missing/stale optional names remain tolerant. | REQ-001, AC-001, AC-002, AC-003 |
| BE-002 | Team runs receive the existing automatic communication/delegation baseline through team context; external runtimes use their own provider projection and are governed by their existing explicit exposure rules. | Native AutoByteus team runs retain their automatic team tools in addition to the four foundation tools. External runtimes do not inherit this native-runtime default as a side effect. | `send_message_to` and `delegate_task` team behavior, runtime-specific tool projections, and optional tool gating remain unchanged. | REQ-002, AC-004, AC-005 |
| BE-003 | Native runtime tool construction creates only the names present in the resolved exposure and skips names not registered in the native registry. | The four default names are resolved through the existing native registry/tool factory and are present in the created native agent tool instances for standalone and team runs. | Existing tool contracts, workspace/path authorization, approval behavior, execution semantics, and event identities remain unchanged. | REQ-003, AC-006 |
| BE-004 | The native AgentFactory initializes the existing tool registry through registerTools() before native agents are created; the four requested definitions are available under their canonical names. | Native default exposure continues to use that existing registry readiness/registration contract to create exactly one `run_bash`, `read_file`, `edit_file`, and `write_file` instance. | Registry initialization order, tool schemas, tool factories, and canonical tool identities remain unchanged. | REQ-005, AC-006 |
| BE-005 | The fixed prompt's Bash section describes Bash as primary even for file reading/writing, while the file section recommends shell readers and only conditionally mentions `read_file`; the edit-file tool contract separately describes read-before-edit and reread-after-failure behavior. | The two fixed sections have a clear division: Bash is primary for navigation/search/repository/project commands and verification, while exposed file tools are normal for file content. The prompt explicitly requires a recent relevant `read_file` region before a regional `edit_file` patch, allows the read to be skipped only when that region is recent and unchanged, requires rereading after context failure, and leaves detailed schema semantics authoritative. | Tool availability, path semantics, approval gates, schemas, execution behavior, and the ability to use Bash as an appropriate fallback remain unchanged. | REQ-006, AC-008, AC-009 |
| BE-006 | Existing unit, integration, and API/E2E coverage asserts the prior three-tool native baseline and can pass without proving default `write_file` exposure. | Coverage is updated to prove the four-tool baseline, native create/restore materialization, persisted-name immutability, external isolation, approval/path preservation, and representative standalone/team API/E2E behavior. | Coverage remains proportional and must not broaden external runtime defaults or change production approval semantics. | REQ-007, AC-010 |

## Investigation Findings

The runtime-neutral exposure boundary is `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts`; native AutoByteus materialization occurs in `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` and `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts`. The native registry readiness contract is provided by AgentFactory startup registration. The shared exposure boundary is also consumed by Claude and Codex paths, so native defaults must not leak into external provider runtimes. Detailed evidence is recorded in `investigation-notes.md`.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `runtime-tool-exposure-matrix.md` | Intended-behavior matrix for runtime kind, standalone/team context, defaults, and coverage | REQ-001 through REQ-005, REQ-007 | AC-001 through AC-007, AC-010 | Approved by explicit user request; architecture review remains the gate | Makes the four-tool native-only default boundary and external-runtime non-regression explicit |
| `system-prompt-file-operations-contract.md` | Fixed system-prompt guidance for file-tool selection, fresh context, recovery, verification, and Bash fallback | REQ-006 | AC-008, AC-009 | Approved by explicit user request; architecture review remains the gate | Makes the desired agent procedure authoritative without changing tool exposure or execution contracts |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Not Needed`
- Evidence basis: The native resolver treats all non-team tools as opt-in configuration, but the requested foundation is a runtime invariant. The existing exposure composition boundary is already the single place that unions automatic tool names before native construction; no second coordinator is indicated at bootstrap.
- Requirement or scope impact: Expand the native-runtime default invariant from three to four existing registered tools without changing persisted agent definitions or external runtime behavior.

## Recommendations

Investigate and implement the default union at the native AutoByteus boundary, with explicit unit, integration, and API/E2E coverage for empty/omitted configuration, standalone and team create/restore, deduplication, registry materialization, approval/path semantics, and non-AutoByteus exposure isolation. Preserve agent definition data as user configuration rather than mutating it.

## Scope Classification (`Small`/`Medium`/`Large`)

`Small` behavior change with cross-runtime exposure regression coverage.

## In-Scope Use Cases

- UC-001: Start a standalone native AutoByteus agent with no foundation tools configured.
- UC-002: Start a native AutoByteus team member with no foundation tools configured.
- UC-003: Start a native AutoByteus agent with some or all foundation tools configured, without duplicate effective tools.
- UC-004: Verify external runtime exposure remains governed by its current configuration and team rules.
- UC-005: Review the fixed system-prompt file-operation contract for native and availability-aware external behavior.
- UC-006: Validate four-tool default exposure and representative native standalone/team behavior through unit, integration, and API/E2E coverage.

## Out of Scope

- Adding foundation tools to persisted agent-definition JSON/configuration or UI selections.
- Making the four tools default for Claude Agent SDK, Codex App Server, or any other external runtime.
- Changing tool schemas, authorization roots, approval policies, shell/file semantics, event projection, or team communication/delegation contracts.
- Adding other tools to the mandatory baseline.

## Functional Requirements

- **REQ-001 — Native foundation baseline:** For every agent run whose resolved runtime kind is `autobyteus`, effective tool exposure MUST contain `run_bash`, `read_file`, `edit_file`, and `write_file` before tool instances are materialized.
- **REQ-002 — Scope by run type:** The baseline MUST apply identically to native standalone runs and native team-member/task-agent runs. Existing team automatic tools MUST remain additive.
- **REQ-003 — Clean composition:** The baseline MUST be added through the authoritative native exposure/materialization boundary, MUST be deduplicated, and MUST NOT mutate persisted `AgentDefinition.toolNames`.
- **REQ-004 — Runtime isolation:** The native baseline MUST NOT be applied to Claude Agent SDK, Codex App Server, or other external runtime exposure paths merely because they reuse runtime-neutral exposure types/helpers.
- **REQ-005 — Existing behavior preservation:** Configured optional tools, stale-name tolerance, native tool registry lookup, tool approval, workspace/path safety, and event/tool identity behavior MUST remain unchanged for all four foundation tools. The existing `write_file` schema, trusted-local path contract, approval behavior, and execution semantics remain authoritative.
- **REQ-006 — File-operation prompt contract:** The fixed Carpenter system prompt MUST divide responsibilities consistently: Bash is the primary interface for navigation, search, repository/project commands, processes, and verification; exposed file tools are the normal interface for file content. It MUST prefer `read_file` for reading, require a recent relevant `read_file` region before a regional `edit_file` change unless that region is recent and unchanged, prefer `write_file` for new or deliberate whole-file content, require rereading after edit-context failure, and preserve fitting post-change verification and Bash fallback while leaving detailed tool-schema semantics authoritative. The wording MUST remain availability-aware for external runtimes, where `write_file` is not a native default.
- **REQ-007 — Coverage and regression evidence:** The implementation change MUST update proportional unit, integration, and API/E2E coverage to prove the four-tool native baseline for standalone and team create/restore, deduplication, persisted-name immutability, registry materialization, approval/path preservation, and isolation of Claude/Codex exposure.

## Acceptance Criteria

- **AC-001:** A native AutoByteus standalone run whose agent definition has an empty or omitted `toolNames` produces effective native tools containing exactly one instance of each of `run_bash`, `read_file`, `edit_file`, and `write_file` among the default baseline.
- **AC-002:** A native AutoByteus team-member run whose agent definition omits all four foundation names produces all four foundation tools and retains the existing automatic `send_message_to` and `delegate_task` tools when the team context qualifies for them.
- **AC-003:** Definitions that configure one, two, three, or all four foundation names do not create duplicates in the effective tool names or created tool instances.
- **AC-004:** Existing explicitly configured optional tools continue to be materialized, and stale/unknown optional configured names continue to be skipped without blocking the foundation baseline.
- **AC-005:** Claude and Codex exposure tests/fixtures built with the shared exposure helper do not gain the native foundation baseline unless explicitly configured; their existing team automatic behavior remains unchanged.
- **AC-006:** Native tool resolution creates registry-backed `run_bash`, `read_file`, `edit_file`, and `write_file` instances, and focused unit/integration checks demonstrate their canonical names remain unchanged across native standalone/team create and restore paths.
- **AC-007:** The persisted agent definition's `toolNames` array is not modified when the native default baseline is applied.
- **AC-008:** The composed fixed prompt contains logically aligned, appropriately concise Bash and file-operation sections: Bash is primary for command/search/repository/project work and verification, with practical discovery examples such as `rg -n "term" path`, `rg --files path | rg "pattern"`, and constrained `find`; exposed file tools are normal for file content; it explicitly says to use `read_file` for the recent relevant region before a regional `edit_file` patch unless that region is recent and unchanged, to reread after context failure, and to use `write_file` for deliberate whole-file work when exposed, without duplicating unrelated tool-schema details.
- **AC-009:** The composed fixed prompt explicitly allows `run_bash` fallback for inspection or modification when relevant file tools are unavailable or cannot complete the operation after appropriate recovery, while preserving existing safety and approval rules and not requiring unavailable tools in external runtimes.
- **AC-010:** Unit coverage asserts the exact four-name native policy, deduplication, definition immutability, mixed-team retention, and neutral-helper external isolation; integration coverage asserts registry-backed create/restore materialization and approval/path contracts; API/E2E coverage asserts representative native standalone/team exposure and file-tool approval/execution behavior without adding the baseline to Claude/Codex.

## Constraints / Dependencies

- The native tool registry must register the four tools before native resolution; current `AgentFactory` startup registration is the expected dependency.
- Native team context is carried by `AgentRunConfig.memberTeamContext`; the solution must not infer team status from arbitrary tool names.
- External runtime providers may use the shared `RuntimeAgentToolExposure` shape; runtime-kind isolation must be explicit.
- Existing tests may call the runtime-neutral builder directly, so its API/semantics need a deliberate design decision rather than an accidental global default.
- `composeCarpenterPrompt` is reused by native, Claude, and Codex backends; file-tool wording must therefore be availability-aware and must not imply that `write_file` or native defaults exist in every external runtime.
- The prompt contract is guidance, not a replacement for the authoritative tool descriptions in `edit-file-contract.ts` or the tool-level path/approval safeguards.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: `AgentDefinition.toolNames` in agent-definition persistence and package/config sources.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all configured tool names exactly; effective defaults are runtime-derived and do not require rewriting stored definitions.
- Unacceptable data loss or corruption: Any mutation/loss of configured optional tools or inability to read existing definitions.
- Relevant availability, maintenance-window, or rollout constraints: No data migration or maintenance window; runtime behavior changes on next native run creation.
- Related requirement and acceptance-criteria IDs: REQ-003, REQ-005, AC-007.

## Assumptions

- “Our own runtime” means `RuntimeKind.AUTOBYTEUS`; Claude Agent SDK and Codex App Server are external provider runtimes and are out of scope for this default.
- The four names identify the existing registered native tools and their current contracts; `write_file` is already registered and its existing creation/overwrite, trusted-local path, approval, and execution contracts remain unchanged.
- A native team run includes mixed-runtime team members that use the AutoByteus backend as well as standalone native runs.

## Risks / Open Questions

- The exact shared-helper API shape must ensure native defaults do not leak into Claude/Codex tests or production paths.
- Native team context filtering for mixed runs must not remove the four foundation tools while stripping legacy task-management tools.
- Coverage should validate both effective exposure and actual native tool instance materialization, not only the helper list; API/E2E should exercise representative approval and file side effects without changing approval policy.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 | UC-006 |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | X | X | X |  |
| REQ-002 |  | X | X |  |
| REQ-003 | X | X | X |  |
| REQ-004 |  |  |  | X |
| REQ-005 | X | X | X | X |  |
| REQ-006 | X | X | X | X | X |
| REQ-007 | X | X | X | X |  | X |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Native standalone empty-definition four-tool materialization |
| AC-002 | Native team-member empty-definition four-tool materialization with team tools |
| AC-003 | Partial/full explicit four-tool baseline deduplication |
| AC-004 | Optional configured/stale names coexist with mandatory defaults |
| AC-005 | External runtime exposure regression isolation |
| AC-006 | Native registry-backed instance creation and canonical names |
| AC-007 | Definition immutability after resolution |
| AC-008 | Fixed prompt file-tool selection and fresh-context guidance |
| AC-009 | Prompt-preserved Bash fallback and availability-aware wording |
| AC-010 | Unit, integration, and API/E2E coverage for four-tool exposure and preserved contracts |

## Approval Status

Approved by explicit user request for the expanded four-tool native AutoByteus runtime behavior and the concise system-prompt file-operation workflow; `runtime-tool-exposure-matrix.md` and `system-prompt-file-operations-contract.md` are approved intended-behavior supplements for this scope. The prior three-tool implementation is not sufficient for this revised scope. Architecture review remains the current gate before the follow-up implementation change.
