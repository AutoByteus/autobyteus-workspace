# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — approved by the user as the complete carpenter-model requirements basis on 2026-08-12, including the later same-day automatic team-tool clarification

## Goal / Problem Statement

Define the **carpenter model** for AutoByteus agents: an agent receives a minimal structured foundation containing identity, environment, a concise Bash-first operating practice, a concise file-and-directory practice, and applicable team policy/execution facts, while configured domain/reusable skills remain one ordinary lazy model. Generic behavioral advice already learned by capable models must not be added merely for reinforcement.

The immediate requirements question is the exact minimal structured prompt and clean replacement boundary for the former shell-first skill package. The target behavior applies to AutoByteus, Codex, and Claude runs, while each runtime keeps its own provider projection and skill-discovery mechanism.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | Agent instructions and team-generated context contribute stable prompt content, but identity, environment, Bash-first policy, file/directory practice, and team execution facts are not composed as one explicit minimal agent foundation. | Every applicable run receives only necessary foundation content: Agent Identity, Working Environment, concise Bash Operating Practice, File And Directory Practice, and applicable Team Instruction/Team Runtime context. No generic Platform Fundamentals advice block is added. | Existing model reasoning behavior is not redundantly prompted; skill bodies remain lazy. | `R-001`; `AC-001` |
| `BEH-002` | Configured `SKILL.md` files are task-specific and, after the previous merged change, are advertised by metadata/path for just-in-time reading. | Skills remain task-specific techniques and are read only when work governed by them begins. | Lazy configured-skill loading and configured-only advertisement remain unchanged. | `R-002`; `AC-002` |
| `BEH-003` | The latest base has removed text-embedded tool calling and its `ToolManifestInjectorProcessor`. Native AutoByteus sends schemas through the provider tools field, while Codex and Claude expose tools through provider-native/MCP configuration. Team collaboration tools currently depend on each agent definition listing their names. | The structured prompt contains no `Available Tools` section and does not duplicate tool schemas. For a team member run, the runtime automatically adds `send_message_to` and `delegate_task` to provider tool exposure even when the agent definition omits them. | Provider-native tool schemas remain authoritative for capability and invocation shape; standalone configured-tool behavior remains unchanged. | `R-003`; `AC-003` |
| `BEH-004` | Native AutoByteus, Codex, and Claude compose instructions through different runtime paths. | Every supported runtime receives the same carpenter-model semantics—identity, workspace, Bash practice, file/directory practice, and applicable team policy/execution context—through its correct provider instruction boundary. | Provider-specific bootstrap, tool exposure, and skill materialization remain encapsulated. | `R-004`; `AC-004` |
| `BEH-005` | A run has an authoritative `workspaceRootPath`, and native `run_bash` defaults to that path when `cwd` is omitted, but the prompt does not explicitly identify that path or distinguish it from skill locations. Repeated observed runs have treated the loaded skill package directory as the workspace. The skill catalog separately exposes exact `SKILL.md` paths, which may originate elsewhere. | The always-present environment block names the configured workspace and states that all skill directories are instruction-package roots rather than workspaces. Reading a skill does not change workspace identity; skill assets resolve from the skill directory, while task/project paths resolve from the workspace unless explicitly targeted elsewhere. | Exact skill paths remain catalog-owned and lazy; tool schemas remain authoritative for path arguments. | `R-007`; `AC-007` |
| `BEH-006` | All current skills share one name/description/body/root-path model. The server discovers skills from several sources, and no system/operating/task kind exists. | Preserve one ordinary configured lazy-skill model. Do not add a system-, operating-, or task-skill kind or separate catalogs. Cross-domain reusable workflows remain ordinary skills when they are still needed. | The agent foundation remains minimal; skill bodies remain lazy; tools remain separately authorized. | `R-008`; `AC-008` |
| `BEH-007` | `agent.md` already carries required `name`, optional-in-practice `description`, optional `role`, and a possibly blank instruction body, but current runtime projection primarily uses the body or description fallback and does not consistently render identity fields as their own section. Team member identity is separately generated in the current generic runtime block. | Every run has an explicit always-present Agent Identity section with required name; non-blank description and instruction body are rendered in their exact optional positions. The optional `role` is not rendered, and description is not duplicated as a responsibility-body fallback. | Skill bodies remain lazy; team member aliases remain Team Runtime context; tools remain separately authorized. | `R-009`; `AC-009` |
| `BEH-008` | Current prompt composition is partly structured—team runs render Team, Agent, and generic Runtime headings, while standalone/native base instructions and runtime-native skill exposure follow different shapes. | The carpenter-model prompt has stable semantic sections with one owner each in the approved order: Agent Identity, optional Team Instruction, optional Team Runtime, Working Environment, Bash Operating Practice, File And Directory Practice, and optional Skills. There is no generic Runtime Instruction bucket or prompt-rendered Available Tools section. | Existing provider instruction authority and out-of-band tool exposure remain authoritative. | `R-010`; `AC-010` |
| `BEH-009` | `shell-first-operating-practice` is currently a long configurable `SKILL.md` package. Its body mixes the non-default Bash-first policy with common command knowledge, generic model behavior, and domain-sensitive Git/workflow rules. | Bash-first operation is a concise always-present `## Bash Operating Practice` system-prompt section. Bash is assumed available; it is the primary interface, with other provided tools used when Bash cannot achieve the purpose. The long operating manual is not eagerly copied. | Workspace semantics remain in Working Environment; tool schemas remain authoritative; domain workflows remain in ordinary skills. | `R-011`; `AC-011` |
| `BEH-010` | High-value filesystem guidance currently lives inside the long `shell-first-operating-practice` package and partly inside the draft Bash section, coupling interface selection with file discovery, inspection, editing, and verification. | An always-present `## File And Directory Practice` section separately defines concise intent-led discovery, bounded and format-aware inspection, narrow editing, guarded filesystem changes, and fitting verification. | Bash Operating Practice remains the interface-selection owner; tool schemas and domain/project instructions remain authoritative. | `R-012`; `AC-012` |
| `BEH-011` | `composeMemberRunInstructions` currently places authored `teamInstruction` beside a generic generated `runtimeInstruction` and makes its communication/delegation prose conditional on configured tool names. | Replace the ambiguous generic name with two closed contracts: Team Instruction is exactly the non-blank selected `team.md` body; Team Runtime is framework-derived team membership plus the fixed `send_message_to` and `delegate_task` collaboration protocol guaranteed for every team member run. | Standalone runs omit both; agent identity, workspace, Bash/file practices, provider tool schemas, skills, task packets, and provider details remain owned elsewhere. | `R-013`; `AC-013` |
| `BEH-012` | The draft prompt examples used documentation placeholders, but several current source shapes permit blank optional values, team-definition lookup currently collapses errors to a blank result, and server skill parsing can construct blank metadata. | Every dynamic prompt value has a closed authoritative source, normalization, omission/fallback or fail-fast rule, and provider binding. Team Runtime derives from validated team context rather than a provider descriptor, and no unresolved placeholder reaches a provider. | Authored Markdown and provider-specific transport remain preserved; no new persisted field is introduced. | `R-005`, `R-014`; `AC-005`, `AC-014` |

## Investigation Findings

Established findings:

- The ticket worktree was refreshed on 2026-08-11 and now exactly matches `origin/personal@023f4f550b07f27dbf388d55234a10b8eae0e0c7` before ticket-local artifact changes.
- Since the original carpenter investigation, `origin/personal` removed text-embedded tool calling, the tool-manifest prompt processor, and the text tool-manifest provider. The `Available Tools` prompt section is therefore obsolete and is removed from this contract.
- The user clarified that a skill is analogous to a carpenter's technique for a certain task, not the carpenter's always-present foundation.
- The always-present layer is narrowed to identity, environment, concise Bash-first routing, concise file-and-directory practice, and applicable runtime content rather than generic behavioral fundamentals or another lazily loaded `SKILL.md`.
- Current agent definitions expose one authored instruction body, while team/runtime instruction composition and provider projection already have separate owners. No explicit fundamental field or global fundamental block exists.

## Relevant Supplemental Task Artifacts

- [`system-prompt-contract.md`](system-prompt-contract.md) — Approved consolidated intended-behavior authority for the complete carpenter-model prompt contract; approval applies with this requirements doc.
- [`system-skill-decision.md`](system-skill-decision.md) — Selected-decision rationale for retaining one ordinary lazy skill model and moving only the concise Bash convention into the structured prompt; evidence/context, not a separate intended-behavior authority.
- [`working-environment-prompt-spec.md`](working-environment-prompt-spec.md) — Approved intended-behavior supplement containing the exact proposed workspace-versus-skill prompt text; approval applies with this requirements doc.
- [`bash-operating-practice-prompt-spec.md`](bash-operating-practice-prompt-spec.md) — Approved intended-behavior supplement containing the approved concise Bash-first section; approval applies with this requirements doc.
- [`file-and-directory-practice-prompt-spec.md`](file-and-directory-practice-prompt-spec.md) — Approved intended-behavior supplement containing the proposed concise filesystem discovery, inspection, modification, and verification section; approval applies with this requirements doc.
- [`agent-identity-prompt-spec.md`](agent-identity-prompt-spec.md) — Approved intended-behavior supplement defining `agent.md` as the source of a separate always-present Agent Identity section; approval applies with this requirements doc.
- [`team-and-runtime-prompt-spec.md`](team-and-runtime-prompt-spec.md) — Approved intended-behavior supplement fixing the exact Team Instruction source and the closed Team Runtime membership/communication/delegation contract; approval applies with this requirements doc.
- [`prompt-value-binding-spec.md`](prompt-value-binding-spec.md) — Approved intended-behavior supplement mapping every dynamic prompt value and generated fragment to an authoritative source, validation rule, omission/fallback, or fail-fast outcome; approval applies with this requirements doc.
- [`classroom-simulation-composed-system-prompt.md`](classroom-simulation-composed-system-prompt.md) — Derived two-member validation fixture that instantiates the complete current contract for both real Classroom Simulation members (`professor` and `student`), including exact composed prompts and a cross-member assertion matrix; evidence/context, not a separate intended-behavior authority.

## Design Health Assessment (Mandatory)

- Change posture: Larger Requirement / Behavior Change
- Initial design issue signal: Yes
- Root cause classification: Shared Structure Looseness / Boundary Or Ownership Issue
- Refactor posture: Required in this change: introduce one semantic carpenter-prompt composition owner and make the three runtime adapters consume/project it instead of independently reconstructing agent instruction content.
- Evidence basis: `AgentDefinition.instructions` is one untyped body, while current packages variably mix identity, stable rules, tool intent, and workflow content. The three runtimes project instructions differently. A carpenter model needs an explicit semantic boundary and one composition owner rather than ad hoc concatenation.
- Requirement or scope impact: Do not add a second kind of `SKILL.md` or rename task-specific skills prematurely.

## Recommendations

- Do not add a generic Platform Fundamentals advice block.
- Keep the always-present agent foundation limited to necessary identity, configured environment/path semantics, concise Bash-first policy, concise file-and-directory practice, and applicable team policy/execution facts.
- Keep skills task-specific, configured, and lazy.
- Avoid putting full tool documentation or task techniques in the always-present foundation.
- Do not require a blind `pwd` call on every task. Inject the configured workspace explicitly; use `pwd` only to verify effective command location when needed.
- Keep one ordinary lazy skill model; do not introduce system/operating/task skill kinds.
- Render the approved concise Bash Operating Practice immediately after Working Environment.
- Render File And Directory Practice immediately after Bash Operating Practice, and remove its duplicated search/inspection details from Bash Operating Practice.
- Replace the ambiguous `Runtime Instruction` label with the closed `Team Runtime` contract; do not create a miscellaneous runtime-instruction bucket.
- Apply the semantic contract to AutoByteus, Codex, and Claude while preserving provider-specific projection, tool exposure, and skill materialization.

## Scope Classification (`Small`/`Medium`/`Large`)

Large. The behavior crosses shared semantic prompt composition, three runtime adapters, native skill-catalog composition, tests, and documentation, but it reuses the existing agent-definition and run-workspace fields and therefore does not require a new authoring or persisted schema.

## In-Scope Use Cases

- `UC-001`: Start an agent run and receive only the necessary always-present identity, environment, operating-practice, and applicable team execution facts.
- `UC-002`: Encounter task-specific work and lazily read only the applicable configured skill.
- `UC-003`: Author or select an agent without confusing its minimal foundation with skills or tool permissions.
- `UC-004`: Preserve coherent carpenter-model behavior across AutoByteus, Codex, and Claude.
- `UC-005`: Perform domain work under an applicable ordinary skill while using the always-present Bash Operating Practice for computer operations.
- `UC-006`: Start a standalone or team run and know the agent's definition name, description, and stable responsibilities without confusing them with shared fundamentals or temporary team membership.
- `UC-007`: Inspect a composed prompt and identify identity, workspace, Bash practice, file/directory practice, Team Instruction, Team Runtime, and skills without reconstructing their boundaries from an undifferentiated text blob.
- `UC-008`: Locate, inspect, modify, and verify workspace files efficiently without broadly dumping directories, reading irrelevant content, or applying an unsafe edit method.
- `UC-009`: Start an agent as a team member and receive exactly the authored team policy plus current membership, communication, and delegation information that applies to the actual run.
- `UC-010`: Start a team member whose agent definition omits collaboration tools and still receive callable provider-native `send_message_to` and `delegate_task` tools consistent with Team Runtime.

## Out of Scope

- Rewriting existing agent/team source packages merely to remove wording that may overlap the new platform-owned sections.
- Deleting or rewriting the external `shell-first-operating-practice` package and its consumers outside this repository; those repositories require their own coordinated change.
- Eager loading of task-specific `SKILL.md` bodies.
- Reintroducing skill-specific loading tools.
- Treating every tool's usage documentation as a fundamental.
- A marketplace or hierarchy for task-specific skills unless later approved.

## Functional Requirements

- `R-001` (Approved): AutoByteus must provide an explicitly owned, minimal always-present agent foundation containing Agent Identity, Working Environment, Bash Operating Practice, File And Directory Practice, and applicable Team Instruction/Team Runtime context, without a generic Platform Fundamentals behavioral-advice block.
- `R-002` (Approved): Task-specific `SKILL.md` files must remain configured, lazy techniques and must not be embedded as fundamental prompt content.
- `R-003` (Approved): Always-present foundation content must be limited to necessary run facts, approved operating practices, and semantic boundaries; it must not restate generic reasoning behavior or duplicate tool schemas. For every run with a non-null valid `MemberTeamContext`, runtime tool provisioning must automatically union `send_message_to` and `delegate_task` into the agent's provider-native tool exposure regardless of `agent-config.json`; standalone runs retain only their configured tools. Prompt text never grants these tools.
- `R-004` (Approved): The carpenter-model semantic contract must apply to native AutoByteus, Codex, and Claude runs. Runtime adapters must project that shared meaning through their supported instruction boundaries without duplicating provider-owned tool schemas or replacing provider-owned configured-skill materialization. Native and Codex use their system/base instruction fields; Claude Agent SDK uses its custom `systemPrompt` option so persistent carpenter content is not inserted into user-turn text.
- `R-005` (Approved): The source, normalization, binding policy, and empty/default/failure behavior for each agent-foundation section must be explicit and must follow `prompt-value-binding-spec.md`.
- `R-006` (Approved): Durable documentation and coverage must make the agent-foundation-versus-skill boundary verifiable.
- `R-007` (Approved): The always-present Working Environment section must bind the run's canonical absolute workspace path and distinguish it from every skill location: the workspace is the task/project root, each skill directory is an independent instruction-package root, reading a skill never changes workspace identity, skill-bundled relative paths resolve from the skill directory, and task/project paths resolve from the workspace unless explicitly targeted elsewhere. Skill packages must not be modified unless the task explicitly targets them.
- `R-008` (Approved): AutoByteus must retain one ordinary configured lazy-skill model and one `## Skills` catalog. It must not add system-, operating-, or task-skill kinds, separate skill catalogs, trusted kind providers, or cross-kind dependency machinery in this ticket.
- `R-009` (Approved): AutoByteus must treat the selected agent definition, including its file-backed `agent.md` representation, as the authoritative agent-identity source. Agent Identity must always render a validated non-blank name; it must render the Description line and Responsibilities and Boundaries subsection only for their respective non-blank values, must not substitute description as the responsibility body, and must not render the optional `role` field.
- `R-010` (Approved): AutoByteus must compose the prompt from stable semantic sections in the approved logical order—Agent Identity, optional Team Instruction, optional Team Runtime, Working Environment, Bash Operating Practice, File And Directory Practice, and optional Skills—while omitting empty sections and preserving provider instruction authority. Authored agent/team body headings must be deterministically nested beneath their owning section rather than escaping as sibling carpenter sections. It must not render a generic `Runtime Instruction` or `Available Tools` section. The obsolete optional system-prompt-processor extension surface must be removed so no later processor can append or mutate content outside the closed contract.
- `R-011` (Approved): AutoByteus must render the exact approved Bash Operating Practice text from `bash-operating-practice-prompt-spec.md` for every agent run. Bash is the primary interface for workspace and system operations; other provided tools are used when Bash cannot achieve the purpose. The section must not include shell-availability caveats, filesystem-detail guidance owned by File And Directory Practice, or the former complete shell-first manual.
- `R-012` (Approved): AutoByteus must render the exact proposed File And Directory Practice text from `file-and-directory-practice-prompt-spec.md` for every agent run, immediately after Bash Operating Practice. It must own concise intent-led discovery, bounded and format-aware reading, narrow change-shape-aware editing, explicit and guarded filesystem operations, and fitting file-level verification without duplicating tool schemas or domain workflows.
- `R-013` (Approved): For team member runs, AutoByteus must render the closed contracts in `team-and-runtime-prompt-spec.md`: Team Instruction is exactly the confirmed non-blank selected `AgentTeamDefinition.instructions`/`team.md` body; Team Runtime contains only the current member alias, fixed `send_message_to` communication contract/roster, and fixed `delegate_task` target roster/assignment protocol derived from `MemberTeamContext`. Communication selector rules must appear once, and Team Runtime must not contain an unavailable-tool warning, task-domain examples such as a software-engineering handoff path, provider details, or a tool catalog. A team-definition resolution error or missing required team delivery binding must fail bootstrap rather than produce inconsistent prose. Standalone runs render neither section, and no other content may be routed through Team Runtime.
- `R-014` (Approved): Runtime composition must validate every dynamic prompt value under `prompt-value-binding-spec.md`, fail before provider invocation when a required source is missing or invalid, omit only the exact optional line/subsection/section when its value is blank, derive Team Runtime solely from validated team context, and never send unresolved double-brace template syntax to a provider.

## Acceptance Criteria

- `AC-001` (Approved): An applicable processed prompt contains the approved Agent Identity, Working Environment, Bash Operating Practice, File And Directory Practice, and applicable Team Instruction/Team Runtime sections in the approved composition positions and contains no generic Platform Fundamentals advice block.
- `AC-002` (Approved): The same prompt does not contain a task-specific `SKILL.md` body merely because the skill is configured.
- `AC-003` (Approved): A standalone run preserves its configured effective tool set. A native, Codex, or Claude team member whose agent definition omits both collaboration names nevertheless receives callable provider-native `send_message_to` and `delegate_task`; duplicates in configuration are deduplicated. No prompt-rendered `Available Tools` heading, tool schema, removed `ToolManifestInjectorProcessor`, or text manifest provider is created.
- `AC-004` (Approved): Targeted coverage confirms the approved identity, workspace, Bash, file/directory, Team Instruction, Team Runtime, and lazy-skill semantics for native AutoByteus, Codex, and Claude through each runtime's supported instruction boundary.
- `AC-005` (Approved): Agent authoring surfaces and persisted records follow the approved source/normalization/omission/failure policy without ambiguous parallel representations.
- `AC-006` (Approved): Documentation gives concrete examples of necessary agent-foundation content, Bash operating policy, ordinary lazy skills, and tool contracts.
- `AC-007` (Approved): For a run configured with workspace `W` and a skill package at a different absolute location `S`, the prompt names `W` as the only agent workspace and the skill catalog names the manifest under `S`. After the skill is read, a shell command with no `cwd` override still executes in `W`, task output is created under `W`, skill-bundled relative assets resolve under `S`, and `S` is not modified unless the task explicitly targets the skill package. An explicit permitted nested `cwd` changes only that command's effective directory and does not redefine `W`.
- `AC-008` (Approved): Existing configured skills from global, additional, team, agent-private, and built-in-agent sources continue to resolve through the ordinary skill model and appear in one `## Skills` catalog with name, description, and exact manifest locator. No skill-kind field, system-skill provider, separate catalog, or cross-kind dependency is introduced.
- `AC-009` (Approved): Standalone and team runs render the same validated agent-definition name under Agent Identity, without a role line. Each renders Description and Responsibilities and Boundaries only when the corresponding value is non-blank; a blank body does not cause description to be duplicated as responsibilities. A team member alias is rendered separately as runtime context, and neither shared fundamentals nor skill bodies are duplicated into identity.
- `AC-010` (Approved): Representative standalone and team prompts contain each applicable carpenter semantic section exactly once in the approved logical order, contain no empty headings, keep inapplicable sections absent, and preserve the same section meaning when projected through every in-scope provider adapter. Authored headings remain structurally beneath Responsibilities and Boundaries or Team Instruction under the deterministic containment rule, including the level-6 overflow behavior. Agent definition APIs and native runtime configuration no longer expose optional system-prompt processors, and persisted historical names are ignored by the version-agnostic definition reader rather than executed.
- `AC-011` (Approved): Every representative composed prompt includes the exact Bash Operating Practice section immediately after Working Environment, with Bash stated as primary, deterministic/non-interactive/composable command guidance, project-native/format-aware tool guidance, and the rule to use another provided tool when Bash cannot achieve the purpose. No shell-availability condition, duplicated file-operation detail, or long command manual is present.
- `AC-012` (Approved): Every representative composed prompt includes the exact File And Directory Practice section immediately after Bash Operating Practice, including targeted `rg`/`rg --files`, constrained `find`, bounded `cat`/`wc`/`sed`/`nl` inspection, format-aware reading/editing, narrow and guarded modification, quoted explicit paths, preservation of unrelated content, and fitting verification. The guidance appears exactly once rather than being duplicated in Bash Operating Practice.
- `AC-013` (Approved): A standalone run contains neither Team Instruction nor Team Runtime. A team run with a confirmed non-blank `team.md` body renders that body exactly once under Team Instruction, while a lookup or required delivery-binding failure stops bootstrap. Every team member run renders `Current team member: <memberName>`, the fixed `send_message_to` contract/allowed roster, and the fixed `delegate_task` target roster/assignment protocol under Team Runtime, with selector rules once and no unavailable-tool branch or task-domain example. No generic Runtime Instruction heading, Available Tools catalog, provider details, tool schemas, workspace facts, skill bodies, task packets, or conversation content appear in Team Runtime.
- `AC-014` (Approved): Binding-matrix coverage exercises full and optional-empty identity, standalone and team contexts, communication/recipient states, delegation target states, valid/invalid skill metadata, and each runtime workspace binding. Required-value failures occur before provider invocation; optional omissions leave no blank labels/headings; Team Runtime needs no configured/effective tool-name input; and every final provider instruction payload is free of unresolved double-brace template syntax.

## Constraints / Dependencies

- The previous lazy configured-skill model on `origin/personal` is the starting contract.
- System-prompt content must remain compact and contain only necessary run facts, agent-specific contracts, the approved Bash/file operating practices, and applicable team policy/execution rules.
- Tool authorization remains explicit and independent of prompt classification.
- Requirements approval is required before design.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing agent-definition records and historical native snapshots/provider sessions.
- Required outcome: `Directly Usable — No Migration`. The target reuses existing `name`, `description`, `instructions`, configured skills, and run workspace fields. Newly created runs use the new composition; historical prompt/session context remains historical rather than being rewritten.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Existing agent identities, instructions, tools, task-specific skill configuration, and historical conversations must not be silently corrupted.
- Unacceptable data loss or corruption: Loss of existing agent instructions, configured skills, tool selections, or historical conversation/tool protocol state.
- Relevant availability, maintenance-window, or rollout constraints: None; no stored-data rewrite or maintenance window is required.
- Related requirement and acceptance-criteria IDs: `R-004`, `R-005`; `AC-004`, `AC-005`.

## Assumptions

- “Copyright model” in prior speech transcription means **carpenter model**.
- Necessary agent-foundation facts are stable or runtime-authoritative enough to place in high-authority prompt context.
- Skills remain ordinary configured lazy techniques without a system/operating/task kind taxonomy.

## Risks / Open Questions

- No unresolved requirement question blocks design. Existing authored agent/team bodies remain source-preserved in this ticket, so an author can still duplicate platform-owned advice inside those bodies until the separate content packages are normalized.
- The external `shell-first-operating-practice` package and its consumers are not versioned by this repository. Removing those configurations is a coordinated follow-up, not a compatibility path in the AutoByteus runtime.

## Requirement-To-Use-Case Coverage

| Requirement ID | Use Case IDs |
| --- | --- |
| `R-001` | `UC-001` |
| `R-002` | `UC-002` |
| `R-003` | `UC-001`, `UC-003`, `UC-004`, `UC-010` |
| `R-004` | `UC-004` |
| `R-005` | `UC-001`, `UC-003` |
| `R-006` | `UC-001`–`UC-004` |
| `R-007` | `UC-001`, `UC-002`, `UC-003` |
| `R-008` | `UC-002`, `UC-003`, `UC-005` |
| `R-009` | `UC-001`, `UC-003`, `UC-004`, `UC-006` |
| `R-010` | `UC-001`, `UC-004`, `UC-007` |
| `R-011` | `UC-001`, `UC-005`, `UC-007` |
| `R-012` | `UC-001`, `UC-007`, `UC-008` |
| `R-013` | `UC-004`, `UC-006`, `UC-007`, `UC-009`, `UC-010` |
| `R-014` | `UC-001`, `UC-004`, `UC-007`, `UC-009` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001`, `AC-002` | Inspect prompt composition for the minimal always-present agent foundation and lazy skills. |
| `AC-003` | Compare standalone configured tools and team-member provider tools across all runtimes, including omitted and duplicate collaboration-tool configuration. |
| `AC-004` | Exercise each approved runtime boundary. |
| `AC-005` | Create/read/update representative agent definitions and inspect persisted shape. |
| `AC-006` | Review durable conceptual and authoring documentation. |
| `AC-007` | Launch with workspace and skill manifest in different directory trees; inspect the composed prompt and default/overridden shell working directories. |
| `AC-008` | Resolve skills from every supported source and inspect the single lazy catalog and unchanged model shape. |
| `AC-009` | Compare standalone and team prompt composition for the same agent definition and verify identity versus team-member runtime context. |
| `AC-010` | Snapshot or inspect representative prompt composition across in-scope providers for stable headings, order, omission, ownership, and semantic projection. |
| `AC-011` | Inspect the exact Bash section and exercise Bash-first routing plus non-shell fallback routing. |
| `AC-012` | Inspect the exact File And Directory section and exercise targeted discovery, bounded inspection, narrow editing, guarded filesystem operations, and fitting verification. |
| `AC-013` | Compare standalone and team runs across recipient/target states; verify exact Team Instruction source, fixed Team Runtime content, roster/target derivation, and prohibited-content absence. |
| `AC-014` | Execute the complete prompt-value binding matrix, including invalid required values, blank optional values, recipient/target states, invalid skill metadata, and unresolved-placeholder rejection across all provider projections. |

## Approval Status

Approved as a whole package by the user on 2026-08-12. The same-day clarification additionally approves automatic provider-native `send_message_to` and `delegate_task` provisioning for every valid team context and removes configured/MCP tool exposure as a Team Runtime prompt input. Approval covers this requirements document and every intended-behavior supplement listed above, including exact section wording, heading containment, binding/failure behavior, and final logical order. Evidence-only supplements remain `N/A` for approval.
