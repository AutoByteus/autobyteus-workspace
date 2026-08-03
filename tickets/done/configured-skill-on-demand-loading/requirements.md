# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by the user on 2026-08-02

## Goal / Problem Statement

Native AutoByteus currently copies the complete body of every configured `SKILL.md` into the agent's bootstrap-time system prompt. That prompt becomes the run's processed system instruction and cannot reflect later skill-file edits. Replace that behavior with configured-skill awareness plus direct on-demand reading from the current file-backed source, following the same broad model used by Codex: stable routing metadata is present up front, while the full skill instructions are read from the advertised absolute `SKILL.md` path with an existing general-purpose file or shell tool when needed. No skill-specific loader tool is required.

This slice deliberately does not introduce primary, fundamental, or supporting skill roles.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | Starting a native AutoByteus run with configured skills appends each skill's launch-time name, description, root path, path guidance, and complete `SKILL.md` body to the processed system prompt. | The processed system prompt contains only each configured skill's name, description, absolute `SKILL.md` path, and concise direct-read/relative-path guidance; it contains no configured `SKILL.md` body. | The agent remains aware only of its explicitly configured skills. | `R-001`, `R-002`; `AC-001`, `AC-002` |
| `BEH-002` | Skill instructions are preloaded, while the server also exposes three overlapping agent-facing skill tools: `get_available_skills`, `get_skill_content`, and `load_skill`. | When a configured skill applies, the agent reads the advertised absolute `SKILL.md` path directly with an already-authorized general-purpose tool such as `read_file` or `run_bash`; no skill-specific agent tool is exposed. | Tool authorization remains explicit and general-purpose tools retain their current behavior. Skill administration and runtime skill resolution remain internal services, not agent tools. | `R-003`, `R-005`; `AC-003`, `AC-006` |
| `BEH-003` | Editing `SKILL.md` after a run starts does not change the copy already embedded in that run's system prompt. | A later direct file read in the same active run returns the current `SKILL.md`, so edits made after launch are visible on the next read. | Skill updates continue through the existing filesystem/SkillService write paths. | `R-004`; `AC-004`, `AC-005` |
| `BEH-004` | Runtime skill tools enforce configured-skill membership, but generic file/shell tools can already read paths allowed by their own authorization model. | Only configured skill metadata/paths are advertised as skills. `NONE` or zero resolved skills advertise nothing. Generic file/shell access continues to be governed by those tools rather than by a redundant skill loader. | No global skill catalog is injected and no installed-but-unconfigured skill is advertised. | `R-006`; `AC-007` |
| `BEH-005` | Codex and Claude use their existing runtime-specific configured-skill exposure paths. | Those provider-runtime paths remain behaviorally unchanged by this native AutoByteus fix. | Codex/Claude materialization, agent-definition skill configuration, and skill catalog administration remain unchanged. | `R-007`; `AC-008` |
| `BEH-006` | Restoring a historical native working-context snapshot reinstalls its stored system message exactly, which may include a pre-change skill body. | Historical snapshots remain exact historical context and are not bulk-rewritten; the catalog/path-only invariant applies to newly bootstrapped native system prompts. | Conversation/tool history and the established snapshot-restore contract remain unchanged. | Persisted-data decision; `R-001`, `R-007`; `AC-001`, `AC-008` |

## Investigation Findings

- `AvailableSkillsProcessor` is mandatory and currently builds `Skill Details` for every configured skill by interpolating `formatSkillContentForPrompt(skill)` into the system prompt.
- `SystemPromptProcessingStep` runs once during bootstrap, saves that processed string, configures it on the LLM, and logs the complete prompt. The configured skill body is therefore launch-time state and also contributes to prompt/log size.
- Native server bootstrap already resolves configured agent skills to concrete root paths before constructing `AgentConfig`; core `AgentFactory.prepareSkills(...)` registers those paths. The processor can therefore advertise the exact absolute `SKILL.md` path without embedding its body.
- Core `read_file` accepts absolute paths directly, and `run_bash` can execute `cat` against an absolute path. Either primitive reads current filesystem content on each call.
- The server registers exactly three agent-facing skill tools as one `Skills Tools` group: `get_available_skills`, `get_skill_content`, and `load_skill`. Their discovery, content, tree, and guidance results are redundant once the system prompt supplies the configured catalog and exact path and the agent uses an authorized general-purpose file/shell primitive.
- No repository-owned `agent-config.json` explicitly selects any of the three skill tool names. Persisted user-created agent definitions may still contain retired names and require a clean transition decision.
- General-purpose tools are opt-in today. Removing prompt preloading therefore makes a file-capable tool an explicit prerequisite for a skill-bearing native agent; silently auto-granting `run_bash` or unrestricted `read_file` would broaden permissions and is not recommended.
- Current documentation describes just-in-time skill loading as the philosophy while also documenting and implementing full configured-skill body injection; the two paths are inconsistent.

## Relevant Supplemental Task Artifacts

None.

## Design Health Assessment (Mandatory)

- Change posture: Behavior change / cleanup
- Initial design issue signal: Yes
- Root cause classification: Duplicated Policy Or Coordination / Legacy Or Compatibility Pressure
- Refactor posture: Likely Needed
- Evidence basis: Full prompt-body injection plus the three `Skills Tools` wrappers duplicate catalog and file access already supplied by prompt metadata and authorized general-purpose file/shell tools. Keeping any wrapper would preserve a parallel discovery/content policy with no required capability gain.
- Requirement or scope impact: The clean-cut target removes full-body prompt injection and the complete agent-facing `Skills Tools` group, advertises absolute configured skill paths, and relies on explicit general-purpose tool authorization.

## Recommendations

- Keep only configured skill names, descriptions, absolute `SKILL.md` paths, and stable selection/path-resolution guidance in the processed system prompt.
- Tell the agent simply to read the applicable `SKILL.md` from its exact listed path before beginning work governed by that skill; tool choice remains governed by the agent's explicitly configured capabilities.
- Remove `get_available_skills`, `get_skill_content`, and `load_skill`, including their group registration and private support code, rather than maintaining redundant wrappers.
- Do not silently grant `run_bash` or broad file access merely because a skill is configured; preserve explicit tool authorization.
- Treat at least one file-capable tool as an agent-authoring prerequisite for native agents expected to use file-backed skills. Do not auto-grant tools or add a narrow validator that assumes only `read_file` and `run_bash` can satisfy the capability.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. The observable change is narrow, but correctness crosses core prompt composition, server tool-catalog cleanup, agent configuration expectations, tests, and durable skill documentation.

## In-Scope Use Cases

- `UC-001`: Start a native AutoByteus run with one or more configured skills and receive catalog metadata plus exact absolute `SKILL.md` paths without complete skill bodies in the system prompt.
- `UC-002`: Use an applicable configured skill by reading its advertised path with an explicitly authorized `read_file` or `run_bash` capability.
- `UC-003`: Update a configured skill after the native run starts and receive the updated instructions on the next direct read in that same run.
- `UC-004`: Suppress all skill metadata/paths for `NONE` or zero resolved skills and avoid advertising unconfigured skills.
- `UC-005`: Continue using existing agent-definition skill configuration, contextual/private/global resolution, and multiple configured skills.

## Out of Scope

- Primary/fundamental/supporting skill roles or priority semantics.
- Global discovery of installed-but-unconfigured skills.
- Automatic skill selection by a new classifier or automatic reload in the middle of a model turn without a new file read.
- Changes to Codex or Claude configured-skill materialization.
- Changes to skill CRUD UI, skill package layouts, or agent-definition `skillNames` schema.
- A general redesign deciding which unrelated specialized tools could be replaced by `run_bash`; this slice removes only the complete agent-facing skill-tool group.
- Hot mutation of the base agent instructions or the launch-time skill catalog metadata.
- Bulk rewriting of previously persisted working-context snapshots created before this change; historical snapshot policy remains a named residual risk for design review.

## Functional Requirements

- `R-001`: Native AutoByteus must not embed any configured `SKILL.md` body in the processed system prompt.
- `R-002`: When configured skills are enabled and resolved, the system prompt must list only those configured skills with name, description, absolute `SKILL.md` path, and concise guidance that relative references resolve from the containing skill directory.
- `R-003`: The prompt must instruct the agent to read the applicable `SKILL.md` from its exact listed path before beginning work governed by that skill. Runtime tool authorization remains explicit, and no skill-specific loader may be required or exposed.
- `R-004`: Each direct read must observe the current file content, so an active run can obtain skill changes on its next read without changing the system prompt.
- `R-005`: The redundant `get_available_skills`, `get_skill_content`, and `load_skill` implementations, their `Skills Tools` registration, skill-tool-only support code, the now-unused prompt-content/Markdown-link formatter, obsolete tests, prompt guidance, and documentation must be removed cleanly rather than retained as compatibility paths.
- `R-006`: `NONE` or zero resolved skills must produce no skill catalog/path section; installed-but-unconfigured skills must not be advertised. Existing generic file/shell authorization remains unchanged.
- `R-007`: Existing agent-definition skill configuration, contextual/private/global resolution, multiple configured skills, and Codex/Claude skill behavior must remain unchanged.
- `R-008`: Durable documentation must describe catalog/path-only system prompting plus direct file reading and must remove obsolete preloaded-body/loader examples and terminology.

## Acceptance Criteria

- `AC-001`: A processed native AutoByteus system prompt for a configured skill contains its catalog name/description and exact absolute `SKILL.md` path but contains neither a unique marker from its body nor a `Skill Details` body section.
- `AC-002`: The processed prompt explains that the selected `SKILL.md` must be read before applicable work and that relative references resolve from the skill directory.
- `AC-003`: A native AutoByteus agent's effective/available tool catalog exposes none of `get_available_skills`, `get_skill_content`, or `load_skill`, and configuring skills does not implicitly add a replacement skill-specific tool.
- `AC-004`: In one active native run, a direct `read_file` or `run_bash` read returns version A; after the supported update path writes version B to the same `SKILL.md`, a second direct read returns version B and not version A.
- `AC-005`: A configured skill containing a relative reference can be followed by resolving it from the advertised skill directory with the existing file/shell primitive.
- `AC-006`: Removing the `Skills Tools` group does not remove or alter `read_file`, `run_bash`, `SkillService`, configured-skill resolution, GraphQL skill CRUD/catalog operations, or provider-runtime materialization; broader tool consolidation is out of scope.
- `AC-007`: `NONE`, an empty configured set, or a configured set that resolves to no skill produces no skill catalog/body/path section.
- `AC-008`: Targeted regression coverage confirms existing configured-skill resolution inputs and provider-runtime skill paths are not changed by the native-runtime implementation.
- `AC-009`: Durable skill documentation no longer claims that configured `SKILL.md` bodies are injected or that any of the three retired skill agent tools are part of the supported runtime flow.

## Constraints / Dependencies

- `AgentDefinition.skillNames` remains the configured catalog source; this ticket adds no skill-role schema.
- General-purpose tool authorization remains explicit. Configuring a skill must not silently grant shell or unrestricted filesystem access.
- A native agent can execute file-backed skill instructions only when it has an authorized capability that can read the advertised absolute path.
- The prompt must advertise only paths for successfully resolved configured skills; it must not add global discovery.
- The implementation must keep skill catalog guidance usable with both API-native and text-manifest tool formats.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Native working-context snapshots can contain the processed system message; persisted user-created agent definitions can contain `toolNames` entries for the three retired tools.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve conversation/tool history and existing agent definitions. Do not bulk-rewrite historical snapshots or agent configuration files. Retired skill-tool selections remain inert because normal runtime tool resolution skips names absent from the current registry.
- Unacceptable data loss or corruption: Non-system conversation history or tool protocol history must not be discarded.
- Relevant availability, maintenance-window, or rollout constraints: None known; no data rewrite or maintenance window is required.
- Related requirement and acceptance-criteria IDs: `R-001`, `AC-001`; historical pre-change snapshots are currently listed out of scope and remain a residual risk.

## Assumptions

- “Updated skill” means the content at the already-configured skill identity/root changes; renaming a skill while a run is active is not required.
- A skill edit becomes visible on the next explicit file read; no mechanism can change a model turn already in progress.
- Configured skill catalog name/description may remain launch-time metadata for the active run; the complete instructional body must be current at direct-read time.

## Risks / Open Questions

- A native skill-bearing agent without a suitable general-purpose file/shell capability cannot read the advertised file. This remains an explicit agent-authoring responsibility; the change must not silently expand permissions or hard-code a validator to only two tool names.
- Previously persisted snapshots may still contain an old full skill body because snapshot restore preserves the historical system message exactly. The approved scope does not bulk-migrate those snapshots.
- Persisted user-created agent definitions may contain retired skill-tool names. The target has no compatibility registration; the existing missing-tool warning/skip behavior keeps those names inert until the definition is normally edited.
- Older direct-read results remain in conversation history. The concise read-before-governed-work rule obtains the relevant instructions at the point they are needed without explaining conversation-history mechanics to the agent.

## Requirement-To-Use-Case Coverage

| Requirement ID | Use Case IDs |
| --- | --- |
| `R-001` | `UC-001` |
| `R-002` | `UC-001`, `UC-002` |
| `R-003` | `UC-002` |
| `R-004` | `UC-002`, `UC-003` |
| `R-005` | `UC-002` |
| `R-006` | `UC-004` |
| `R-007` | `UC-005` |
| `R-008` | `UC-001`, `UC-002` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001`, `AC-002` | Inspect the processed prompt for catalog/path-only exposure, direct-read guidance, and absence of body content. |
| `AC-003`, `AC-006` | Inspect effective/registered tool catalogs for removal of all three skill agent tools and preservation of general-purpose tools and non-agent skill services. |
| `AC-004`, `AC-005` | Perform two direct reads around a supported file-backed skill update and follow a relative reference. |
| `AC-007` | Exercise disabled/empty/unresolved suppression paths. |
| `AC-008` | Run targeted native/provider/configured-resolution regressions. |
| `AC-009` | Inspect updated durable documentation for the clean-cut model. |

## Approval Status

Approved by the user on 2026-08-02. The approved boundary removes prompt-body injection and all three agent-facing skill tools in favor of configured name/description/absolute-path metadata plus direct use of explicitly authorized general-purpose tools. Missing file capability remains an agent-authoring responsibility; historical snapshots and inert retired tool-name selections are directly usable without migration.
