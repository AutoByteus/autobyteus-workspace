# Design Spec

## Current-State Read

A native AutoByteus launch resolves `AgentDefinition.skillNames` in the server, passes concrete skill root paths into core `AgentConfig`, and lets `AgentFactory.prepareSkills(...)` register those paths in `SkillRegistry`. The mandatory `AvailableSkillsProcessor` then looks up the configured entries and owns two responsibilities at once: catalog awareness and complete instruction delivery. It appends name/description metadata, root-path guidance, and a formatted copy of every configured `SKILL.md` body to the bootstrap-time system prompt. `SystemPromptProcessingStep` stores that processed string and the LLM reuses it, so later disk edits cannot change the embedded copy (`BEH-001`, `BEH-003`).

In parallel, server startup registers a self-contained `Skills Tools` group containing `get_available_skills`, `get_skill_content`, and `load_skill`. Those wrappers repeat catalog lookup, current content retrieval, tree listing, access-policy checks, and path guidance even though native agent tools are explicitly configured and the existing `read_file`/`run_bash` capabilities can read an advertised absolute path from current disk (`BEH-002`, `BEH-004`). No repository-owned `agent-config.json` selects these wrappers.

The target must preserve configured-only resolution, `NONE` suppression, explicit tool authorization, the established `PRELOADED_ONLY` transport value, snapshot restore semantics, and Codex/Claude materialization (`BEH-004`–`BEH-006`). It must not turn generic file access into a hidden skill-specific security boundary.

## Intended Change

Make `AvailableSkillsProcessor` a catalog-and-routing owner only. For every successfully resolved configured skill it will emit:

- the configured skill name;
- the launch-time description;
- the exact absolute path to that skill's `SKILL.md`;
- concise selection, direct-read, freshness, and relative-path guidance.

It will not append `Skill.content`, rewrite Markdown links, or produce a `Skill Details` section. When applicable work arrives, the agent reads the advertised entry-point path with an already-authorized general-purpose capability. Each such invocation reads current disk content, so a later read observes a skill update without mutating the system prompt.

Remove the complete server `Skills Tools` group and the now-unused core prompt-content formatter. Preserve internal skill resolution/CRUD services and provider-specific skill materializers.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | System | `R-001`, `R-002`; `AC-001`, `AC-002` | Bootstrap a native run with resolved configured skills | Investigation: `AvailableSkillsProcessor` currently appends catalog and full details | Emit configured name/description/absolute `SKILL.md` path and routing rules only; emit no body | Native launch/catalog path, `DS-001` |
| `BEH-002` | Contract | `R-003`, `R-005`; `AC-003`, `AC-006` | Agent uses an applicable configured skill | Investigation: three server wrappers overlap prompt metadata and general file/shell tools | Remove all three wrappers; invoke an already-authorized general-purpose capability directly | Task-use/direct-read path, `DS-002`; tool-catalog cleanup, `DS-004` |
| `BEH-003` | User / Operational | `R-004`; `AC-004`, `AC-005` | Supported skill update followed by a later read in the same active run | Investigation: update writes disk while embedded prompt remains launch-time | Later direct read returns current `SKILL.md`; relative references resolve from its containing directory | Update/fresh-read path, `DS-003` |
| `BEH-004` | Contract | `R-006`; `AC-007` | `NONE`, empty, unresolved, or configured-only skill access | Investigation: server resolves configured roots and processor suppresses empty/`NONE` | Preserve suppression and configured-only advertisement; do not advertise global skills | Native launch/catalog path, `DS-001` |
| `BEH-005` | System | `R-007`; `AC-008` | Launch Codex or Claude with configured skills | Investigation: provider-specific materializers/bootstrap paths bypass native prompt processor | Preserve behavior without modification | Provider-runtime path, unchanged and outside in-scope spines |
| `BEH-006` | System | Persisted-data decision; `R-001`, `R-007`; `AC-001`, `AC-008` | Restore a historical native working-context snapshot | Investigation: stored working context replaces freshly processed prompt | Preserve exact historical restore; new path-only invariant applies to newly bootstrapped prompts | Historical restore path, `DS-005` |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination / Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Catalog awareness and instruction delivery are coupled in `AvailableSkillsProcessor`; the same content is exposed again through three server agent tools. Removing body injection leaves `format-skill-content-for-prompt.ts` and the entire server skill-tool directory without production consumers.
- Design response: Narrow the processor to stable configured routing metadata, reuse general file/shell boundaries for live reads, and delete the parallel tool/formatting path.
- Refactor rationale: Keeping any wrapper or prompt formatter would preserve multiple owners for skill delivery and invite divergence in allowlisting, freshness, and path guidance.
- Intentional deferrals and residual risk, if any: The `PRELOADED_ONLY` enum name is retained because it is a broad persisted/transport contract across core, server, web, and application packages; its behavioral meaning remains “only explicitly configured skills,” so changing it is not required for the clean instruction-delivery replacement. The broader fundamental-versus-specialized skill model and unrelated tool consolidation remain separate product/design work.

## Terminology

- **Configured skill catalog**: Launch-time name, description, and exact `SKILL.md` path for only the skills resolved from the agent definition.
- **Direct read**: An invocation of an already-authorized general-purpose capability against the advertised `SKILL.md` path; it is not a skill-specific tool.
- **Newly bootstrapped prompt**: A system prompt processed after this change without being replaced by a historical working-context snapshot.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete paths: full skill-body/rewritten-link injection, `Skill Details` formatting, the core prompt-only Markdown-link formatter, all three server skill tools, their group registration/access/formatting helpers, and their tool-specific tests and documentation.
- No aliases, deprecated registrations, hidden fallback injection, or dual direct-read/tool-wrapper path will remain.
- Non-agent skill services are not legacy paths: `SkillService`, GraphQL skill CRUD/catalog, configured-skill resolution, `SkillRegistry`, and Codex/Claude materializers remain because they own different application/runtime responsibilities.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

Two stored subjects are relevant:

1. Native working-context v5 snapshots store the exact system message plus conversation/tool history, one record per restorable run.
2. File-backed agent definitions store `toolNames: string[]`; user-created definitions could contain one or more retired skill-tool names, although repository-owned definitions do not.

- Relevant code-model, serialization, semantic, or physical-store change: No schema changes. The current registry stops defining three names, and newly processed prompts stop embedding bodies.
- Normal reader/writer behavior and representative evidence: `WorkingContextSnapshotBootstrapper` deliberately installs the stored context and ignores the current processed prompt. `normalizeAgentConfigRecord` preserves string entries; `resolveAutoByteusAgentTools` warns and skips any name absent from `defaultToolRegistry`.
- Required semantics and invariants under direct use: Historical run context remains historically exact. Conversation/tool protocol history is preserved. Retired tool names cannot recreate retired tools. Newly bootstrapped prompts satisfy the path-only invariant.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Rewriting a snapshot system message risks changing historical conversation semantics. Scanning arbitrary agent package roots to rewrite configurations adds ownership, writeability, recovery, and package-integrity problems for inert values.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): **Directly Usable — No Migration**.
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Existing readers already preserve the required history and skip unavailable tools safely. Migration would provide only representational cleanup while adding filesystem I/O, writeability distinctions, rollback needs, and risk of corrupting historical/package-owned records. No maintenance window is justified.
- Acceptance criteria or design constraints supported by this decision: `AC-001` applies to newly processed native prompts; `AC-003` requires absence from the current registry/effective tool set; `AC-008` preserves restore and provider paths.

No migration plan applies.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001`, `BEH-004` | Native run launch with configured skill names | Path-only configured skill section in newly processed system prompt | `AvailableSkillsProcessor`, after server configured-skill resolution | Establishes the stable awareness boundary without instruction-body capture |
| `DS-002` | Primary End-to-End | `BEH-002` | Applicable user task and configured catalog entry | Current `SKILL.md` content returned to the model by a general tool | Native runtime tool execution boundary | Replaces every skill-specific delivery tool with the existing authorized capability path |
| `DS-003` | Primary End-to-End | `BEH-003` | Supported skill file update | Later direct read returns updated content | Filesystem/`SkillService` writer plus general read tool | Proves freshness is obtained at read time rather than prompt mutation |
| `DS-004` | Bounded Local | `BEH-002` | Server tool startup/catalog query | Registry/catalog without a `Skills` tool group | `loadAllAgentTools` and `defaultToolRegistry` | Makes tool removal observable and prevents accidental re-registration |
| `DS-005` | Bounded Local | `BEH-006` | Historical native run restore | Stored working context installed unchanged | `WorkingContextSnapshotBootstrapper` | Records the approved no-migration boundary |

## Primary Execution Spine(s)

- `DS-001`: `AgentDefinition.skillNames -> SkillService.resolveConfiguredSkillsForAgent -> absolute skill roots -> AgentConfig.skills -> AgentFactory.prepareSkills -> SkillRegistry metadata -> AvailableSkillsProcessor -> path-only system prompt`
- `DS-002`: `User task -> LLM selects applicable configured skill -> read_file(path=advertised SKILL.md) or run_bash(cat advertised path) -> current filesystem content -> LLM applies instructions`
- `DS-003`: `Skill CRUD/file edit -> canonical SKILL.md on disk -> later DS-002 read -> updated instructions`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Server resolution keeps ownership of which skill roots belong to the agent. Core registers those roots and the mandatory processor emits only routing metadata for successful configured entries. | Agent definition, configured skill, agent config, system prompt | `AvailableSkillsProcessor` for prompt composition | Logging, `NONE`/empty suppression, provider-runtime isolation |
| `DS-002` | At an applicable task boundary, the model follows the catalog rule and invokes one of its already-configured general tools with the exact path. The tool reads disk at invocation time. | Applicable task, advertised path, current file content | Existing native tool execution boundary | Authorization, tool availability, relative reference resolution |
| `DS-003` | Existing skill writers update the canonical file. No running prompt is mutated; freshness appears on the next general-tool read. | Skill update, canonical file, later read | Existing skill/file writer and filesystem read primitive | Conversation may retain earlier reads |
| `DS-004` | Server startup loads all remaining tool groups. With the skill loader spec and directory removed, GraphQL and registry views cannot expose any of the retired names. | Loader specs, tool registry, GraphQL catalog | `loadAllAgentTools` | Durable negative coverage |
| `DS-005` | Restore continues to install the exact stored context, including an old prompt where present. It does not merge the new catalog into historical context. | Snapshot, working context | `WorkingContextSnapshotBootstrapper` | Historical stale instruction residual risk |

## Spine Actors / Main-Line Nodes

- `SkillService.resolveConfiguredSkillsForAgent`: resolves contextual configured identities to concrete managed roots before native core bootstrap.
- `AgentFactory.prepareSkills`: registers concrete roots and normalizes `AgentConfig.skills` to registry names.
- `SkillRegistry`: provides launch-time `Skill` metadata for successfully registered/configured entries.
- `AvailableSkillsProcessor`: governs configured catalog rendering and suppression in the native system prompt.
- `read_file` / `run_bash`: existing explicit tool boundaries that perform current filesystem reads.
- `loadAllAgentTools` / `defaultToolRegistry`: govern which server agent tools appear in the runtime/catalog.

## Ownership Map

- Server backend factory owns contextual/private/team/global configured-skill resolution and passes only resolved root paths across the native-core boundary. It does not compose skill prompt text.
- `AgentFactory` owns runtime registration/normalization and tool instance preparation. It does not infer or auto-grant file tools from skills.
- `AvailableSkillsProcessor` owns the complete native configured-skill prompt section: filtering successful configured entries, exact path construction, priority/read guidance, and no-section suppression.
- General-purpose tool implementations own their existing path resolution, filesystem/shell semantics, and authorization exposure. They do not know about skill names.
- `SkillService` and GraphQL own skill administration. They do not become runtime agent tools.
- Server startup owns tool-group registration. Deleting the skill spec is the only registration change.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL tool catalog | `defaultToolRegistry` populated by core and server startup | Exposes current selectable tools to clients | Compatibility aliases for retired skill tools |
| GraphQL skill CRUD/catalog | `SkillService` | User/application administration of managed skills | Runtime agent instruction delivery |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Full body and `Skill Details` construction in `AvailableSkillsProcessor` | Freezes instructions and duplicates direct read | Catalog/path rendering in same processor plus general tools | In This Change | Also remove prompt-time Markdown link rewriting |
| `autobyteus-ts/src/skills/format-skill-content-for-prompt.ts` and its unit test | No production consumer remains after body/tool removal | Raw current file read; relative references resolve from advertised containing directory | In This Change | Delete, do not retain as unused utility |
| `autobyteus-server-ts/src/agent-tools/skills/` | All three public wrappers and both helpers are redundant | Prompt catalog + existing file/shell tools; `SkillService` remains internal | In This Change | Delete all six source files |
| `Skills Tools` loader spec | Its registered module is removed | Remaining loader specs | In This Change | Do not replace with an empty group |
| Server skill-tool unit tests, including checked-in `.js` duplicates | Test only removed code | Updated processor unit tests and downstream catalog/direct-read coverage | In This Change | Delete complete test directory |
| Obsolete body/link-injection and unconfigured-discovery expectations in `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` | They enforce the exact prompt behavior being removed and contradict configured-only empty suppression | Rewritten AgentFactory integration cases in the same file | In This Change | Keep the integration seam: configured path becomes path-only metadata/body-absence coverage; empty config becomes unchanged-prompt/no-section coverage |
| Positive tool-catalog expectations for retired names/category | Would enforce removed behavior | Negative absence assertions | In This Change | Durable API/E2E edit is owned by `api_e2e_engineer` after implementation review |
| Historical ticket/log references | Historical evidence, not current contract | N/A | Follow-up: none | Preserve; do not rewrite archives |

## Return Or Event Spine(s) (If Applicable)

N/A. This change uses existing synchronous prompt processing and tool-result return paths; it adds no event protocol.

## Bounded Local / Internal Spines (If Applicable)

- `DS-004` parent owner: server tool loader. `loaderSpecs -> dynamic imports -> registration -> registry/catalog`. It matters because removal must occur at registration ownership rather than by filtering results later.
- `DS-005` parent owner: snapshot bootstrapper. `stored snapshot -> deserialize -> install working context`. It remains unchanged to preserve historical context.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Logging | `DS-001`, `DS-004` | Prompt processor / startup loader | Report catalog count/mode and remaining tool groups without logging skill bodies | Operational visibility | Reintroducing body text leaks instructions and wastes logs |
| Tool authorization | `DS-002` | Agent definition/runtime tool resolver | Keep tools explicit; skip unknown retired names | Preserves least surprise and existing capability model | Auto-granting shell/file tools broadens permissions |
| Documentation | All | Maintainers/agent authors | Describe catalog/path/direct-read model and prerequisite | Prevents divergent usage guidance | Stale docs cause wrapper reinvention |
| Provider materialization | `BEH-005` | Codex/Claude backends | Preserve existing provider-specific skill exposure | Separate runtime contract | Native change leaking into providers creates regressions |
| Snapshot restore | `DS-005` | Memory subsystem | Preserve exact historical context | Historical continuity | Replacing only the system message creates mixed-era context |
| Earlier read results | `DS-002`, `DS-003` | Conversation context | Concise prompt tells the agent to read the file before beginning work governed by the skill | Files cannot retract prior messages | Pretending every prior read updates automatically breaks freshness reasoning |

## Ownership Boundaries

The server-to-core boundary ends after configured identities have been resolved to managed root paths. Core may construct the exact entry-point path from a registered root, but it must not rediscover global skills or call server CRUD services.

The prompt-to-tool boundary is metadata only. `AvailableSkillsProcessor` tells the model which configured path to read and how to prioritize it; it never reads for the model or grants a tool. The invoked general-purpose tool remains the authority for path access and current content.

The tool-registration boundary removes capability at its source. GraphQL/UI catalogs consume the current registry and must not carry a special filter or retired-name mapping.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillsForAgent` | Contextual source precedence and managed root resolution | Native/Codex/Claude backend bootstrappers | Prompt processor scanning global directories | Extend resolver, not prompt code |
| `AvailableSkillsProcessor.process` | Configured catalog filtering, path rendering, suppression, stable guidance | Native bootstrap system-prompt step | Server composing a second native skill prompt section | Extend processor-owned rendering |
| `read_file` / `run_bash` | Current filesystem access and tool execution semantics | Model tool invocation | New skill-specific read wrapper | Improve general tool only for genuinely general needs |
| `loadAllAgentTools` | Server group registration | Server startup | GraphQL-side hiding of registered retired tools | Remove/change loader spec |

## Dependency Rules

- `AvailableSkillsProcessor` may depend on `SkillRegistry`, `SkillAccessMode`, and Node path normalization; it must not depend on `Skill.content`, prompt-body formatting, `SkillService`, or server modules.
- Server configured-skill resolution may depend on `SkillService`; core prompt code may not.
- General file/shell tools must remain skill-agnostic and must not receive configured skill allowlists.
- Configuring a skill must not add `read_file`, `run_bash`, or any replacement tool automatically.
- The startup loader must not import the deleted skill registration module.
- Current docs/tests must not present retired tool names as supported; historical tickets/logs remain untouched.
- Codex/Claude materializers and `SkillAccessMode` serialization are forbidden change areas for this slice unless a compilation regression proves a direct dependency.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveConfiguredSkillsForAgent(agentDefinition)` | Configured managed skills | Resolve configured names under source/context rules | Agent definition plus contextual ownership | Unchanged |
| `AgentConfig.skills` | Native configured skill inputs | Carry resolved roots into bootstrap, later normalize to names | Absolute root path or already-registered name | Existing hybrid contract retained |
| `AvailableSkillsProcessor.process(...)` | Native configured skill prompt section | Render successful configured catalog/path metadata | Configured registry names in context | No body input/output contract added |
| `read_file(path, ...)` | File content | Read current file at an exact path | Absolute path, or relative plus explicit absolute base | Existing tool; skill path is absolute |
| `run_bash(command, cwd, ...)` | Shell command execution | Permit configured agents to `cat` current file when authorized | Shell command string and cwd | Existing tool; not auto-granted |
| GraphQL tool catalog | Available current tools | Project registry definitions | Registered tool names | Retired names/category absent |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Configured-skill resolver | Yes | Yes | Low | None |
| Prompt processor | Yes after change | Yes | Low | Remove instruction-content responsibility |
| General file/shell tools | Yes | Yes | Low | Reuse unchanged |
| Tool catalog | Yes | Yes | Low | Remove definitions at registration, not by response filtering |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Native skill prompt owner | `AvailableSkillsProcessor` | Yes | Low | Keep; it now accurately exposes availability metadata |
| Local configured skill variables | `configuredSkillNames`, `catalogSkills`, `catalogEntries` | Yes | Low | Rename `preloadedSkills` locally where touched |
| Transport access enum | `SkillAccessMode.PRELOADED_ONLY` | Partially | Medium | Retain established contract; document configured-only meaning rather than cross-repo rename |
| Skill entry path | `skillEntryPath` / displayed `SKILL.md` path | Yes | Low | Construct with `path.resolve(skill.rootPath, 'SKILL.md')` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Configured skill allowlisting | Server configured-skill resolver + core registry | Reuse | Already resolves only configured paths/names | N/A |
| Stable skill awareness | System prompt processors | Extend | `AvailableSkillsProcessor` already owns native awareness | N/A |
| Current entry-point read | Core file/shell tools | Reuse | Existing invocation reads disk at call time | N/A |
| Skill administration | `SkillService`/GraphQL | Reuse | Remains canonical writer/catalog for users | N/A |
| Tool absence projection | Startup loader + registry | Extend | Removal at source naturally flows to catalogs | N/A |
| File-capability validation | None | Do not create | Capability may be supplied by tools other than two hard-coded names; authoring prerequisite is approved | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Core system-prompt processing | Configured catalog, exact entry path, usage guidance, suppression | `DS-001` | `AvailableSkillsProcessor` | Extend | Narrow responsibility by removal |
| Core general tools | Current file/shell reads | `DS-002`, `DS-003` | Native tool execution | Reuse | No changes required |
| Server skill management/resolution | Managed sources, CRUD, configured roots | `DS-001`, `DS-003` | `SkillService` | Reuse | Not an agent tool |
| Server tool startup/catalog | Current tool registrations | `DS-004` | `loadAllAgentTools` / registry | Extend | Delete skill group spec |
| Memory restore | Exact stored working context | `DS-005` | Snapshot bootstrapper | Reuse | No changes |
| Provider runtimes | Codex/Claude skill materialization | `BEH-005` | Provider bootstrappers | Reuse | Explicitly unchanged |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Core prompt processing | `AvailableSkillsProcessor` | Render configured catalog/path/rules and suppress empty modes | Single mandatory prompt-section owner | `SkillRegistry`, `SkillAccessMode` |
| `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts` | Core prompt coverage | Processor contract | Assert the exact normative static block and catalog-entry structure, filtering, and absence of body/details | Tests one production owner | Test fixtures |
| `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` | Core AgentFactory integration coverage | AgentFactory-to-processor contract | Rewrite the configured-path case for path-only metadata and rewrite the registry-only/empty-config case for suppression | Preserves the existing end-to-end core seam without retaining contradictory expectations | Temporary skill directory fixture |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Server startup | Tool-group loader | Remove skill group registration | Existing group registry owner | Loader spec shape |
| Core/server durable docs | Documentation | Maintainer contract | Replace preload/wrapper narrative with catalog/direct-read behavior | One doc per subsystem | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Skill catalog entry formatting | None | Core prompt processing | Used only inside one small processor | Yes | Yes | A second skill DTO/formatter abstraction |
| Entry-point path construction | None | Core prompt processing | One `path.resolve` call at the rendering point is clearer | Yes | Yes | A global skill-path service |
| Retired tool names | None | None | Historical constants would create compatibility knowledge | Yes | Yes | A runtime denylist/migration shim |

## Shared Structure / Data Model Tightness Check

No new shared structure or schema is introduced. Existing `Skill` remains the registry/service model because other owners still require its content and root. The processor consumes only `name`, `description`, and `rootPath`; extracting a second catalog DTO would add a parallel representation for one local formatting pass.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Core prompt processing | `AvailableSkillsProcessor` | Configured-only path catalog and usage rules | Existing singular prompt-section owner | Existing `Skill`, registry, access mode |
| `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts` | Core unit coverage | Processor contract | Exact normative static wording and dynamic entry/path rendering plus negative body/unconfigured/empty assertions | Mirrors the production owner | Existing test helpers |
| `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` | Core integration coverage | AgentFactory-to-prompt contract | Configured root is normalized to its skill name and produces name/description/exact entry path/shared guidance without body/link content; registry-only skill with empty config produces the unchanged prompt and no skill section | Exercises the real `AgentFactory.prepareSkills -> AvailableSkillsProcessor` path | Existing temp skill fixture and dummy LLM |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Server startup | Tool-group loader | Remaining server tool group list | Existing singular startup registration owner | Existing loader spec |
| `autobyteus-server-ts/tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` | Server API/E2E coverage | Registry-to-GraphQL catalog contract | Assert all three names and empty `Skills` category are absent | Existing cleanup regression test | Existing GraphQL fixture |
| `autobyteus-ts/docs/skills_design.md` | Core documentation | Native skill architecture contract | Catalog/path/direct-read model | Existing canonical skill design doc | N/A |
| `autobyteus-server-ts/docs/modules/skills.md` | Server documentation | Managed skill subsystem contract | Keep CRUD/resolution; remove agent-tool claims | Existing server skill module doc | N/A |

## Applied Patterns (If Any)

- **Metadata-first, content-on-demand**: stable routing metadata stays in the system prompt while mutable instructions are read from the canonical source when applicable.
- **Removal at ownership source**: delete tool registration rather than retain definitions and filter them from GraphQL/UI.
- **Version-agnostic inert reference handling**: existing unknown-tool skip behavior handles old configuration values without a migration-specific business path.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | File | Native prompt processor | Render catalog entries and critical direct-read rules | Existing mandatory processor | Skill bodies, rewritten links, tool grants |
| `autobyteus-ts/src/skills/format-skill-content-for-prompt.ts` | File (delete) | Former prompt formatting helper | None after cleanup | Dead after both consumers disappear | Compatibility exports |
| `autobyteus-server-ts/src/agent-tools/skills/` | Folder (delete) | Former server tool group | None after cleanup | Entire capability is retired | Empty registration or aliases |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | File | Server startup | Register only remaining server tool groups | Existing startup owner | Skill loader spec |
| `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts` | File | Core unit contract | Verify new prompt semantics | Nearest durable unit seam | Assertions for body injection |
| `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` | File | Core AgentFactory integration contract | Rewrite configured-path coverage to require catalog name/description, `path.join(skillPath, 'SKILL.md')`, shared read/relative-path guidance, normalized configured name, and absence of a unique body/link marker; rewrite the empty-config registry case to require the original prompt unchanged and no `Agent Skills`/catalog section | Existing owner-aligned integration seam directly exercises configured root registration and mandatory prompt processing | Any positive body/link injection or unconfigured registry discovery assertion |
| `autobyteus-ts/tests/unit/skills/format-skill-content-for-prompt.test.ts` | File (delete) | Former helper coverage | None | Production helper removed | Orphan coverage |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/` | Folder (delete) | Former tool unit coverage | None | Production group removed | Historical behavior tests |
| `autobyteus-server-ts/tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` | File | API/E2E tool catalog contract | Negative assertions for all retired names/category | Existing catalog cleanup suite | Positive skill-tool assertions |
| `autobyteus-ts/docs/skills_design.md` | File | Core architecture docs | Explain configured catalog and direct reads | Existing skill design authority | Preloaded-body or server-tool examples |
| `autobyteus-server-ts/docs/modules/skills.md` | File | Server module docs | Explain managed skill sources/CRUD/resolution only | Existing server authority | Agent-facing Skills Tools section |

Historical completed tickets, progress logs, generated application distributions, and unrelated web copy are not current contract files and must not be edited for textual cleanup.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Core system-prompt processor folder | Main-Line Domain-Control | Yes | Low | Existing processor boundary remains the correct compact owner |
| Server agent-tools folder | Transport/tool boundary | Yes after deletion | Low | Remove only the retired skill child; unrelated tool groups stay isolated |
| Core skills folder | Main-Line Domain-Control | Yes | Low | Delete only dead prompt formatter; registry/model/loader remain |
| Docs/tests folders | Off-Spine Concern | Yes | Low | Mirror current production contracts without owning behavior |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Prompt catalog | `- **solution-designer**: ...\n  - **SKILL.md:** \`/abs/.../SKILL.md\`` followed by the exact five-rule block below | Appending `[entire SKILL.md body]` under `Skill Details` | Separates stable routing from mutable instructions |
| Task use | `read_file({ path: "/abs/.../SKILL.md", include_line_numbers: false })` or authorized `cat` | `load_skill({ skill_name: ... })` | Shows no replacement wrapper is required |
| Relative reference | Resolve `references/x.md` from the directory containing advertised `SKILL.md` | Resolve from workspace/process cwd | Preserves portable skill packages |
| Registration cleanup | Delete the `Skills Tools` loader spec and source group | Keep registrations and hide names in GraphQL | Ensures every registry consumer sees one truth |

### Normative Skill System-Prompt Contract

This wording and Markdown structure are authoritative. Implementation must render this block exactly, substituting only catalog entry values. It must not add or paraphrase skill-policy wording.

For each resolved configured skill, render exactly this catalog-entry template in configured order:

```text
- **${skill.name}**: ${skill.description}
  - **SKILL.md:** `${path.resolve(skill.rootPath, 'SKILL.md')}`
```

Join catalog entries with one newline. When at least one configured catalog entry exists, append exactly the following block to the existing system prompt, preceded by two newline characters:

```markdown
## Agent Skills

### Skill Catalog

- **solution-designer**: Bootstrap, investigate, and design software changes.
  - **SKILL.md:** `/absolute/skill/root/SKILL.md`

### Rules for Using Skills

- Use a configured skill whenever it applies to the task.
- When no configured skill applies, use the best available general approach.
- When an applicable configured skill covers only part of the task, follow it for the covered part and use another available technique for the uncovered part.
- Before beginning work governed by a skill, read its `SKILL.md` from the exact path listed above.
- Resolve every relative path mentioned by a skill from the directory containing that skill's `SKILL.md`.
```

The `solution-designer` entry above is illustrative only; production substitutes the joined catalog entries at that exact position. The headings, five rules, and catalog-entry structure are static. The appended block begins with exactly two line-feed characters before `## Agent Skills`, ends with exactly one line-feed character after the final rule, and has no additional trailing blank line. If skill access is `NONE`, the configured list is empty, or no configured name resolves to a registry entry, append nothing—including no headings or explanatory text—and return the original system prompt unchanged.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `load_skill` as deprecated alias | Existing agents may have selected it | Rejected | Registry omits it; stale selections use generic unknown-tool skip |
| Keep discovery/content wrappers but stop documenting them | Could avoid deleting tests/callers | Rejected | Remove complete group; prompt/direct read are sole agent path |
| Retain body injection when no file tool is configured | Could make misconfigured agents appear functional | Rejected | Explicit tool authorization/agent-authoring responsibility |
| Replace old snapshot system messages on restore | Would enforce new prompt shape everywhere | Rejected | Preserve historical context; apply new behavior to new bootstrap |
| Rename `PRELOADED_ONLY` in this slice | Name is less precise after body removal | Rejected | Keep established configured-only transport contract; no dual enum |
| Add retired-name filtering in GraphQL/UI | Could hide persisted stale values | Rejected | Remove at registry source; do not add presentation compatibility logic |

## Derived Layering (If Useful)

`Server configured-resolution -> Core runtime registration -> Core prompt metadata -> Existing tool boundary -> Filesystem`

Server skill administration and provider materialization remain sibling capabilities; they do not move onto the native direct-read spine.

## Change / Refactor Sequence

1. Change `AvailableSkillsProcessor` to construct an absolute `SKILL.md` path with `path.resolve`, render the normative catalog entry and five-rule prompt block above byte-for-byte apart from dynamic values, and stop accessing `Skill.content` or body formatters. Rename touched local `preloaded*` variables to `configured*`; keep the external `PRELOADED_ONLY` value.
2. Update its unit test contract: assert the exact five-rule normative block and dynamic catalog-entry structure; preserve configured-only filtering and `NONE`/empty suppression; require exact absolute paths; forbid unique body markers, rewritten body links, `Skill Details`, and retired tool guidance.
3. Rewrite `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` at its existing AgentFactory seam. The configured-root case must assert catalog name/description, the exact absolute `path.join(skillPath, 'SKILL.md')`, the exact five-rule block, and normalized `java_expert` configuration while asserting that a unique body/link marker and rewritten body links are absent. The registry-only case with `AgentConfig.skills=[]` must be corrected to assert the initial prompt is unchanged and contains no `Agent Skills` or `Skill Catalog` section; do not delete this suppression coverage.
4. Delete the now-unreferenced core prompt-content formatter and its tests.
5. Remove the `Skills Tools` loader spec, delete all six server skill-tool source files, and delete their complete unit-test directory, including tracked `.js` duplicates.
6. Update current tool-catalog coverage to assert the three retired names and the `Skills` category are absent while unrelated groups remain. Per team ownership, repository-resident API/E2E edits performed after initial code review return through code review.
7. Synchronize core/server skill docs to the normative prompt/direct-read model; do not paraphrase the supported rules into a conflicting contract and do not rewrite historical ticket/log evidence.
8. Run implementation-scoped core unit/integration, server unit, type, and lint checks, then downstream API/E2E catalog and active-read freshness scenarios under the coverage owner's normal environment setup.
9. Search current source/tests/docs for retired tool names and body-injection terminology. Remaining occurrences must be either explicit negative regression assertions or historical archives outside current contract.

No temporary compatibility seam or migration step is allowed.

## Key Tradeoffs

- The agent may spend tokens/tool latency reading a relevant `SKILL.md`, but avoids permanent prompt cost and receives current content.
- Generic tools have broader capabilities than a configured-only skill wrapper. This does not expand permissions because they remain explicitly selected; it does mean configured-only protection is an advertisement/routing rule rather than a filesystem sandbox.
- Launch-time description metadata can become stale during an active run. The mutable instructional body is the required freshness boundary; hot catalog metadata mutation is out of scope.
- Keeping `PRELOADED_ONLY` avoids a broad persisted-contract migration at the cost of naming drift.
- No persisted-data rewrite leaves historical snapshots and inactive retired tool-name strings intact, but neither can re-register or execute the removed tools.

## Risks

- Skill-bearing native agents without any suitable general-purpose reader cannot follow the catalog. This is intentional authoring responsibility and must not trigger automatic shell/file permission grants.
- A skill path may disappear or permissions may change after bootstrap; the existing general tool should surface its normal file error.
- Prior direct-read results remain in conversation history. Prompt guidance mitigates this by requiring a file read before beginning work governed by the skill, but it cannot retract old messages.
- Pre-change restored snapshots can still include embedded bodies by design.
- If a hidden external consumer imports the prompt formatter or selects a retired tool, the clean cut will break it. Repository search found no current first-party agent configuration and no other production consumer; no compatibility layer is permitted.

## Guidance For Implementation

- Lift the normative catalog-entry template and static five-rule block exactly from this design. Do not ask implementation to invent or paraphrase system-prompt policy.
- Keep the prompt compact: one catalog and one five-rule block, not repeated per-skill boilerplate.
- Construct the entry path with `path.resolve(skill.rootPath, 'SKILL.md')` so the advertised path is absolute even if a lower-level caller supplies a relative root.
- Do not interpolate `skill.content`; tests should use a unique body sentinel and assert absence.
- Do not condition prompt catalog visibility on `read_file`/`run_bash` presence and do not auto-add tools.
- Preserve existing behavior for `NONE`, empty configured arrays, missing registry entries, multiple skills, and configured-only filtering.
- Update log wording from “injected ... details” to catalog/path terminology and never log skill bodies.
- Delete empty directories and tracked generated duplicate tests rather than leaving no-op registrations.
- Keep `SkillService`, GraphQL skill CRUD/catalog, `SkillRegistry`, `SkillLoader`, the `Skill` model, and provider materializers intact.
- Implementation-scoped tests should not claim live LLM behavior. The downstream coverage stage owns realistic API/E2E execution and current-test validity decisions.
