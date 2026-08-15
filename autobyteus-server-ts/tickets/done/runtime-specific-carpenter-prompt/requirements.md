# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — requirements scope approved during user refinement on 2026-08-15. No implementation or architecture handoff is authorized until the design package is complete and reviewed.

## Goal / Problem Statement

Determine and implement the correct ownership boundary for Carpenter/system-prompt construction across the native AutoByteus runtime, Codex App Server, and Claude Agent SDK runtimes.

The current server prompt composer emits the same Carpenter sections for all three runtimes, even though Codex and Claude have their own provider-native tools and existing prompt guidance. This ticket must distinguish genuinely shared context from runtime-specific guidance so native AutoByteus file/Bash practices do not unintentionally alter or dilute Codex or Claude behavior.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BE-001 | `composeCarpenterPrompt` assembles agent identity, optional team sections, working environment, and fixed Bash/file sections without receiving a runtime-kind discriminator. | Prompt construction has an explicit ownership boundary: shared composition renders Agent Identity, optional Team Instruction, and optional Team Collaboration; native composition then adds Working Environment, Bash Operating Practice, and File And Directory Practice in that logical order. | Agent identity, supported team context, workspace identity, placeholder validation, and each runtime's intended section order remain correct. | REQ-001, AC-001, AC-002, AC-003 |
| BE-002 | AutoByteus, Claude, and Codex bootstrap paths all call the same composer. The resulting text is passed to native `AgentConfig`, Claude `systemPrompt`, and Codex `baseInstructions`, respectively. | Native AutoByteus receives the shared sections followed by native Working Environment/Bash/File sections. Codex and Claude receive only the approved shared sections through their existing injection fields and retain their provider/runtime-specific system and developer guidance. | Each provider continues receiving its existing prompt field and provider bootstrap behavior. | REQ-002, REQ-003, AC-003, AC-004, AC-007 |
| BE-003 | The fixed Bash/file sections describe dedicated `run_bash`, `read_file`, `edit_file`, and `write_file` workflows even when those native tools are not the external runtime's tool surface. | Runtime prompt guidance must not instruct an agent to rely on unavailable tools or duplicate provider-native best practices. Team collaboration tools remain shared through native/MCP projection, with task-result tools shown only when the current task context makes them available. | Tool exposure remains governed by each runtime's existing exposure/materialization path, not by prompt text. | REQ-002, REQ-004, AC-004, AC-006 |
| BE-004 | Prompt source ownership is concentrated under `autobyteus-server-ts`, while the underlying native tool implementations and schemas live in `autobyteus-ts`; the correct split for runtime-specific guidance is not yet documented. | The design explicitly assigns each shared and runtime-specific prompt/tool concern to the correct project and owner, with one authoritative source per concern. | Existing `autobyteus-ts` tool contracts and provider-specific runtime adapters remain authoritative for their current responsibilities. | REQ-005, AC-005 |
| BE-005 | The prior default-tool work changed native exposure, but its prompt contract treated the fixed Carpenter file-operation sections as cross-runtime because the composer is shared. | This refactoring separates prompt scope from code reuse and prevents native-only guidance from changing Codex or Claude prompts. | Native default-tool behavior and external tool exposure remain independently testable and isolated. | REQ-006, AC-006 |
| BE-006 | Mixed team-member/task-agent `ensureReady` supplies team context before the selected runtime backend creates or restores the member run, but the prompt design does not document that full path. | The runtime-specific composition boundary preserves `MemberTeamContext` through AgentRunManager backend selection to the final native run, Claude session, or Codex thread for both create and restore. | Team context construction, runtime selection, tool projection, approval, path, and restore semantics remain owned by their existing services/adapters. | REQ-001, REQ-003, REQ-007, AC-001, AC-007 |

## Investigation Findings

The current code confirms that the prompt composer is shared at the server layer,
but the product behavior is not uniformly shared. The existing injection fields
are already sufficient: native `AgentConfig.systemPrompt`, Claude SDK
`systemPrompt`, and Codex thread `baseInstructions`. The refactor should preserve
those fields and change only the composition supplied to each one. The target
native order remains the previously logical order—Agent Identity, optional Team
Instruction, optional Team Collaboration, Working Environment, Bash Operating
Practice, File And Directory Practice—followed by the native terminal Skills
catalog. External runtimes should receive the shared identity/team sections only;
their provider-native operating, tool, workspace, and skill mechanisms remain
outside this native Carpenter composition.

## Relevant Supplemental Task Artifacts

None yet. A prompt ownership matrix or runtime prompt contract should be added only if investigation shows that it materially improves requirement or design clarity.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Refactor` with behavior-preservation constraints
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed`
- Evidence basis: One composer currently feeds three runtime-specific prompt consumers, but its fixed file/Bash guidance describes capabilities owned by the native AutoByteus tool surface. The composer input has no runtime-kind boundary.
- Requirement or scope impact: Establish which prompt content is universal, which is native-only, and where each authoritative source belongs before changing implementation.

## Recommendations

First trace the complete prompt path for AutoByteus, Codex, and Claude, inspect their provider-native system/developer prompt construction, and inventory the actual tool surfaces each runtime receives. Then propose the smallest ownership-preserving refactor. Do not broaden or rewrite Codex/Claude prompt guidance merely because their bootstrap paths reuse a server helper.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` investigation/refactor candidate because the prompt composer is a shared boundary consumed by three runtimes and the ownership split may cross `autobyteus-server-ts` and `autobyteus-ts`.

## In-Scope Use Cases

- UC-001: Construct a native AutoByteus standalone prompt with native file/Bash guidance.
- UC-002: Construct a native AutoByteus team-member prompt with native guidance plus valid team context.
- UC-003: Construct a Claude prompt without injecting native-only file/Bash policy or unavailable native tool assumptions.
- UC-004: Construct a Codex prompt without injecting native-only file/Bash policy or unavailable native tool assumptions.
- UC-005: Identify the authoritative project/file owner for universal prompt context, native prompt guidance, provider prompt guidance, and underlying tool contracts.

## Out of Scope

- Adding or changing default tools; the prior native default-tool ticket is finalized.
- Rewriting Codex or Claude provider-native best-practice prompts without separate approved scope.
- Changing provider tool exposure, MCP projection, approval policy, sandbox/path semantics, or tool schemas unless investigation proves a direct ownership defect requires it.
- Changing model behavior or provider SDK contracts for reasons unrelated to prompt ownership.

## Functional Requirements

- **REQ-001 — Explicit runtime prompt boundary:** Prompt construction MUST have an explicit way to distinguish native AutoByteus, Codex App Server, and Claude Agent SDK consumers before runtime-specific guidance is selected.
- **REQ-002 — Native-only guidance isolation:** AutoByteus-specific Bash/file-operation guidance MUST be applied only to the native AutoByteus prompt unless a separate approved contract explicitly identifies a section as universal.
- **REQ-003 — External prompt preservation:** Codex and Claude prompts MUST retain their provider-native guidance and AutoByteus-owned identity/team context that is approved as shared; they MUST NOT receive native-only instructions merely because they reuse a composer or helper.
- **REQ-004 — Capability-consistent wording:** A runtime prompt MUST NOT require or strongly imply use of tools unavailable in that runtime's effective tool surface.
- **REQ-005 — Ownership decision:** The design MUST assign universal prompt context, native prompt guidance, provider-specific prompt guidance, and underlying tool contracts to explicit authoritative owners in `autobyteus-server-ts` or `autobyteus-ts`.
- **REQ-006 — Regression protection:** The change MUST include prompt-output tests for native, Claude, and Codex paths proving native-only guidance isolation and preservation of existing external prompt content.
- **REQ-007 — Existing injection boundary preservation:** The refactor MUST retain the established provider injection fields: native `AgentConfig.systemPrompt`, Claude SDK `systemPrompt`, and Codex thread `baseInstructions`. It MUST change the composed content at those boundaries without introducing a second prompt injection path or changing provider/tool bootstrap behavior.

## Acceptance Criteria

- **AC-001:** Investigation documents the current prompt assembly chain from agent definition and team context through `composeCarpenterPrompt` to each runtime's prompt field.
- **AC-002:** The design identifies which prompt sections are genuinely runtime-neutral and which are native AutoByteus-specific, with evidence for each decision.
- **AC-003:** Native AutoByteus prompt coverage proves the intended native identity, workspace, team, and file/Bash guidance remains present after refactoring.
- **AC-004:** Claude and Codex prompt coverage proves native-only file/Bash guidance is absent unless an explicitly approved shared section requires it, while provider-native guidance/settings and approved shared identity/team context remain intact.
- **AC-005:** The design names the authoritative source file and project for each prompt/tool concern and forbids parallel conflicting prompt policies.
- **AC-006:** The implementation/refactor does not change runtime tool exposure or provider approval/path behavior as an incidental effect.
- **AC-007:** Native, Claude, and Codex bootstrap coverage proves that the correctly scoped prompt is injected through the existing runtime-specific field and that the intended section order is preserved for standalone and team runs.

## Constraints / Dependencies

- The current composer is in `autobyteus-server-ts`; current native tool implementations and schemas are in `autobyteus-ts`.
- Runtime kind is already present in `AgentRunConfig` and backend selection; the investigation must determine the cleanest prompt-boundary input rather than infer runtime from tool names.
- Claude and Codex may have provider-native system/developer instruction fields and their own tool descriptions; those contracts must be inspected before proposing changes.
- Existing team identity/instruction sections may be genuinely shared, but this must be evidenced rather than assumed.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: None expected; this is a prompt assembly and ownership refactor.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve agent definitions, team definitions, runtime configuration, tool names, and provider settings unchanged.
- Unacceptable data loss or corruption: Any changed persisted runtime/tool configuration caused by prompt refactoring.
- Relevant availability, maintenance-window, or rollout constraints: No migration or storage rollout expected.
- Related requirement and acceptance-criteria IDs: REQ-006, AC-006.

## Assumptions

- The prior native default-tool ticket is finalized and is not reopened by this investigation.
- Codex and Claude already have provider/runtime-specific prompt and tool best practices that should remain authoritative unless evidence shows a missing universal section.
- The desired result is native-only file/Bash guidance, not a universal prompt rewrite. The approved scope is: shared Agent Identity, Team Instruction, and Team Collaboration; native-only Working Environment, Bash Operating Practice, and File And Directory Practice; provider-native skills and operating guidance remain provider-owned.

## Risks / Open Questions

- Whether any future provider-specific workspace supplement is needed beyond the existing provider `cwd`/working-directory fields; it is out of scope for this refactor unless required by current tests.
- Should the server composer accept an explicit runtime-kind/prompt-profile input, or should each backend compose its own provider prompt from shared primitives?
- Does `autobyteus-ts` own any prompt content, or should it remain limited to tool schemas and implementations?
- How should durable documentation describe shared context versus native-only prompt policy?
- Could existing prompt tests assert only output shape and miss cross-runtime wording leakage?

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | X | X | X | X | X |
| REQ-002 | X | X | X | X |  |
| REQ-003 |  |  | X | X |  |
| REQ-004 | X | X | X | X |  |
| REQ-005 |  |  |  |  | X |
| REQ-006 | X | X | X | X |  |
| REQ-007 | X | X | X | X |  |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Current prompt construction trace for all three runtime consumers |
| AC-002 | Evidence-backed shared-versus-runtime-specific prompt inventory |
| AC-003 | Native prompt output preservation |
| AC-004 | Claude/Codex prompt isolation and preservation |
| AC-005 | Explicit source/project ownership map |
| AC-006 | No incidental tool/approval/path behavior change |
| AC-007 | Existing injection fields and runtime-specific section ordering for standalone/team paths |

## Approval Status

Requirements are Design-ready after user refinement. The design spec must now make the shared/native composition boundary, logical section order, existing injection fields, ownership, and removal plan concrete. No implementation or production change is authorized before architecture review passes.
