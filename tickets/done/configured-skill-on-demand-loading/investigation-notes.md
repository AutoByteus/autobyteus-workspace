# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Architecture review round 1 returned `Fail — Design Impact` (`AR-001`); design revised through `SR-006` and ready for re-review
- Investigation Goal: Identify the native AutoByteus skill prompt/loading production path and define a clean-cut on-demand replacement that preserves configured-skill allowlisting and usable runtime access.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The stale prompt body is local to one processor, but a safe replacement crosses core agent bootstrap/tool preparation, server skill tooling, native runtime provisioning, snapshot behavior, documentation, and validation.
- Scope Summary: Remove configured `SKILL.md` bodies from native system prompts, advertise exact configured skill paths, remove the complete redundant agent-facing skill-tool group (`get_available_skills`, `get_skill_content`, and `load_skill`), and use existing authorized file/shell primitives for current file-backed reads. Defer skill-role hierarchy, unrelated tool consolidation, and provider-runtime changes.
- Primary Questions To Resolve:
  - Where is the configured skill body inserted and retained?
  - Can existing `read_file`/`run_bash` primitives read the advertised path and observe updates?
  - What is the correct policy when a skill-bearing agent has no file-capable tool? Resolved: explicit agent-authoring responsibility; no auto-grant or narrow validator.
  - Which existing access and resolution invariants must be preserved?
  - Do historical working-context snapshots require an explicit transition?

## Request Context

The user confirmed that the immediate scope is to stop loading configured `SKILL.md` content directly into the immutable system prompt and to follow Codex's broad catalog-plus-later-read approach. The user then clarified that a dedicated `load_skill` tool is unnecessary: the prompt can advertise name, description, and absolute path, and an authorized `read_file` or `run_bash` primitive can read it directly. The user subsequently asked whether other skill-related tools exist and directed that redundant ones be removed too. The broader carpenter-style model and unrelated tool consolidation remain deferred.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/configured-skill-on-demand-loading`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/configured-skill-on-demand-loading/tickets/in-progress/configured-skill-on-demand-loading`
- Current Branch: `codex/configured-skill-on-demand-loading`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/configured-skill-on-demand-loading`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-08-02.
- Task Branch: `codex/configured-skill-on-demand-loading`
- Expected Base Branch (if known): `origin/personal@1df9bde23065eb4b4260698acfce1907153dc2bc`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This worktree is authoritative. Do not use the shared `personal` checkout. No product-iteration loop is active; Product Manager acceptance callback is `Not Required`.

## Supplemental Task Artifact Inventory

None.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-02 | Command | `git fetch origin --prune`; `git remote show origin` | Refresh tracked state and resolve base | Remote default is `personal`; refresh succeeded | No |
| 2026-08-02 | Setup | `git worktree add -b codex/configured-skill-on-demand-loading /Users/normy/autobyteus_org/autobyteus-worktrees/configured-skill-on-demand-loading origin/personal` | Create isolated task workspace | Created at `1df9bde23065eb4b4260698acfce1907153dc2bc` | No |
| 2026-08-02 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Required design reference | Spine, ownership, clean-cut replacement, persisted-data evidence, and authoritative-boundary rules apply | No |
| 2026-08-02 | Code | `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts:17-96` | Identify prompt skill insertion | Mandatory processor resolves configured registry entries and appends catalog plus full formatted bodies/root paths | No |
| 2026-08-02 | Code | `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts:22-36`; `autobyteus-ts/src/agent/loop/llm-phase.ts:171` | Trace processed prompt lifetime | Prompt is processed during bootstrap, stored on runtime state, configured on LLM, and reused for requests | No |
| 2026-08-02 | Code | `autobyteus-ts/src/agent/factory/agent-factory.ts:63-109,112-169` | Trace skill/tool runtime preparation | Configured paths are registered and normalized to names before explicitly configured tools are prepared; no conditional skill loader is added | No |
| 2026-08-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts:313-424,493-515` | Trace server agent definition to core config | Server resolves contextual configured skills to root paths and passes those paths into `AgentConfig`; tools come only from agent `toolNames` | No |
| 2026-08-02 | Code | `autobyteus-server-ts/src/agent-tools/skills/load-skill.ts`; `skill-tool-access.ts` | Check safe loader and policy | Existing server tool rejects paths/unconfigured names and honors `NONE` | No |
| 2026-08-02 | Code | `autobyteus-ts/src/tools/file/read-file.ts`; `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Verify direct primitive alternative | `read_file` accepts absolute paths with trusted-local semantics; `run_bash` can execute `cat` in its authorized process environment; both read current disk content | No |
| 2026-08-02 | User clarification | Conversation message rejecting a dedicated loader | Refine requirements | Advertise exact skill paths and remove `load_skill`; use general-purpose file/shell primitives instead | No — approved as agent-authoring responsibility |
| 2026-08-02 | User clarification | Conversation message requesting removal of other skill-related tools | Refine cleanup boundary | Remove all redundant agent-facing skill tools, not only `load_skill` | No |
| 2026-08-02 | User approval | `approve lets go` | Lock the requirements basis | Approved the catalog/path-only prompt, complete skill-tool group removal, explicit tool authorization, and recorded persisted-state boundaries | No |
| 2026-08-02 | Code/search | `find autobyteus-server-ts/src/agent-tools/skills -maxdepth 1 -type f`; `rg -n 'get_available_skills|get_skill_content|load_skill|Skills Tools' ...`; scan repository `agent-config.json` files | Enumerate the complete tool group and configured usage | Exactly three agent-facing tools are registered by the `Skills Tools` loader: `get_available_skills`, `get_skill_content`, and `load_skill`; no repository-owned agent config explicitly selects them | Yes — account for possible persisted user selections |
| 2026-08-02 | Code | `autobyteus-server-ts/src/skills/services/skill-service.ts:77-218`; `configured-agent-skill-resolver.ts` | Check freshness and contextual resolution | `SkillService` resolves roots and loads `SKILL.md` from disk per lookup; contextual resolver owns private/team/global order | No |
| 2026-08-02 | Code | `autobyteus-server-ts/src/api/graphql/types/skills.ts:174-185` | Establish supported skill update trigger | GraphQL `updateSkill` delegates to `SkillService.updateSkill`, providing a supported product path for edits | No |
| 2026-08-02 | Code | `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts:25-61`; unit test lines 71-93 | Check persisted prompt behavior | Restore intentionally ignores the newly processed prompt and preserves the stored system message exactly | Yes — decide historical snapshot scope |
| 2026-08-02 | History | `git show 058f13425`; `git show a95fd695e` | Understand prior ownership/safety decisions | `load_skill` moved from core to server to use managed sources and avoid arbitrary path registration; global runtime discovery was later removed | No |
| 2026-08-02 | Doc | `autobyteus-ts/docs/skills_design.md:5-23,64-180` | Compare documented intent and implementation | Docs endorse just-in-time loading but also state full configured bodies are injected; documentation is internally inconsistent | No |
| 2026-08-02 | Test | `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts:121-159` | Verify durable current expectation | Current test explicitly expects detailed body/root/path content in the system prompt | No |
| 2026-08-02 | Code | `autobyteus-server-ts/src/startup/agent-tool-loader.ts`; `src/agent-tools/skills/register-skills-tools.ts`; all files in `src/agent-tools/skills/` | Establish registration and removal boundary | The startup loader owns one self-contained `Skills Tools` registration spec; the directory's two helper files are used only by the three tool implementations | No |
| 2026-08-02 | Code / test | `autobyteus-server-ts/tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` | Trace observable tool catalog contract | The current GraphQL catalog test positively requires the three skill tools and `Skills` category; it must become a negative regression assertion after removal | No |
| 2026-08-02 | Code | `autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts`; `file-agent-definition-provider.ts`; `autobyteus-agent-tool-resolver.ts` | Decide persisted retired-name handling | Configs preserve string-array tool names; runtime resolution already warns and skips any name missing from the current registry, so stale retired names are inert without historical-shape code | No |
| 2026-08-02 | Code/search | `autobyteus-ts/src/agent/context/skill-access-mode.ts`; repository search for `PRELOADED_ONLY` | Check whether access-mode rename belongs in scope | `PRELOADED_ONLY` is a broad persisted/transport contract across core, server, web, and applications; renaming it is disproportionate and not required to replace body injection | No |
| 2026-08-02 | Docs | `autobyteus-server-ts/docs/modules/skills.md`; `autobyteus-ts/docs/skills_design.md` | Identify durable documentation boundary | Both docs describe server skill tools and/or body injection and require synchronization to the path-only direct-read model | No |
| 2026-08-02 | Architecture review | `design-review-report.md` round 1; `architecture-review-revision-record.md` `ARCH-REV-001` | Review initial solution completeness | `Fail — Design Impact`; finding `AR-001` identified omitted current core integration coverage | Resolved in `SR-002`; re-review required |
| 2026-08-02 | Test | `autobyteus-ts/tests/integration/agent/agent-skills.test.ts:67-170` | Validate `AR-001` and determine target disposition | Configured-root case enforces body/link injection; registry-only empty-config case enforces unconfigured discovery contrary to approved suppression | Rewrite both cases at the existing AgentFactory integration seam |
| 2026-08-02 | User design direction | Conversation request to pin exact skill-related system-prompt wording | Remove implementation ambiguity | The prompt contract must be normative and copyable rather than an illustrative shape that implementation may paraphrase | Resolved in `SR-003` with exact static wording and dynamic entry template |
| 2026-08-02 | User design correction | Conversation feedback that the pinned prompt was overcomplicated and contained internal-mechanics noise | Simplify the behavioral instruction | Replace nine rule bullets with two plain instruction paragraphs; remove conversation-history explanation and loader-tool commentary from the prompt | Resolved in `SR-004` |
| 2026-08-02 | User design correction | Conversation clarification that simplification should retain a small explicit rules section | Restore useful structure without restoring noise | Use four short rules covering applicability, multiple relevant skills, uncovered work, entry-file reading, and relative-path resolution; keep internal freshness/loader mechanics out | Resolved in `SR-005` |
| 2026-08-02 | User rule-by-rule correction | Conversation evaluation of useful and redundant prompt rules | Finalize just-in-time rule semantics | Retain applicability, no-match fallback, partial-coverage supplementation, read-before-governed-work, and relative-path rules; remove the eager multiple-skills rule | Resolved in `SR-006` |
| 2026-08-02 | Command | `pnpm -C autobyteus-ts exec vitest run tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts --no-watch` | Attempt baseline execution | Did not execute: fresh worktree has no installed `vitest` (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`) | Yes — environment setup belongs to implementation/coverage stages |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | System | Launch a native AutoByteus run for an agent definition with `skillNames` | `AgentDefinition.skillNames -> SkillService.resolveConfiguredSkillsForAgent -> skill root paths -> AgentConfig.skills -> AgentFactory.prepareSkills -> AvailableSkillsProcessor -> processed system prompt` | Only configured skills are selected, but every selected body's launch-time content/root guidance is frozen into the system prompt | Prompt processor, backend factory, agent factory sources above |
| `BEH-002` | System | Native agent uses configured skills | `AgentDefinition.toolNames -> resolveAutoByteusAgentTools -> AgentConfig.tools -> AgentFactory.prepareToolInstances`; separately, prompt preloading provides skill instructions | `read_file`/`run_bash` are explicit tools rather than skill-implied capabilities; the built-in skill-bearing agent uses `run_bash` but user agents may configure neither | Tool resolver; built-in `retrospective-skill-improver/agent-config.json`; agent config defaults |
| `BEH-003` | User / Operational | User updates a writable skill through GraphQL/UI or the configured file changes | `updateSkill -> SkillService.updateSkill -> write SKILL.md`; active run continues using already-processed system prompt | Update is persisted, but the active system prompt retains the old body; a later direct `read_file`/`run_bash` read would observe current disk content | GraphQL resolver, SkillService, SystemPromptProcessingStep |
| `BEH-004` | Contract | Agent uses advertised skill metadata/path | `AvailableSkillsProcessor -> configured metadata/path -> existing read_file or run_bash invocation -> filesystem content` | Only configured paths should be advertised; generic file/shell access remains governed by its own broader authorization model | Prompt processor plus file/shell tool sources |
| `BEH-005` | System | Launch Codex or Claude runtime with configured skills | Runtime-specific bootstrap/materializer path | Provider runtimes already expose configured skills without native `AvailableSkillsProcessor` behavior | Codex/Claude bootstrap/materializer sources found in repository search |
| `BEH-006` | System | Restore a persisted native run | `restoreBackend -> fresh AgentConfig/bootstrap prompt -> WorkingContextSnapshotRestoreStep -> WorkingContextSnapshotBootstrapper -> install stored working context` | Stored system prompt wins; a pre-change snapshot can retain an old embedded body | Restore factory/bootstrapper/test sources above |

## Design Health Assessment Evidence

- Change posture: Behavior change / cleanup
- Candidate root cause classification: Duplicated Policy Or Coordination / Legacy Or Compatibility Pressure
- Refactor posture evidence summary: Prompt-body injection and the complete `Skills Tools` group duplicate catalog metadata or direct access to the canonical file. The clean target keeps metadata/path routing and relies on existing authorized primitives, while explicitly resolving the no-file-tool configuration policy.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AvailableSkillsProcessor` | Owns both catalog awareness and full instruction delivery | Split the stable awareness contract from live instruction retrieval | Yes — target design |
| Core file/shell tools + server tool resolver | `read_file` and `run_bash` can directly read absolute paths but are opt-in | Preserve explicit authorization; decide whether missing capability is warned or rejected | Yes — requirements decision |
| Server `Skills Tools` group | Three wrappers add configured discovery, content/tree lookup, and formatted guidance on top of prompt metadata and canonical file access | Remove the complete group cleanly rather than keep parallel access paths | No |
| Snapshot restore | Stored system message overrides fresh processed prompt | Historical snapshots can preserve the removed behavior | Yes — requirements approval/design risk decision |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Compose configured skill prompt section | Injects catalog, body, root, and path rules | Retain only awareness/routing; remove body delivery |
| `autobyteus-ts/src/tools/file/read-file.ts` / `terminal/tools/run-bash.ts` | General-purpose file and shell primitives | Can read advertised absolute skill paths and observe file changes | Reuse; do not add another skill-specific read abstraction |
| `autobyteus-ts/src/skills/registry.ts` / `loader.ts` | Register configured skill metadata and load `SKILL.md` from a root | Registry caches `Skill` content; loader reads current disk | Prompt composition may use cached launch metadata, but instructional content must be read directly from the advertised file path rather than returned from registry cache |
| `autobyteus-ts/src/skills/format-skill-content-for-prompt.ts` | Rewrite resolvable links when embedding skill bodies | Its only production consumers are the native prompt processor and the retiring server skill-tool formatter | Delete it and its unit test once both content-delivery paths are removed |
| `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` | Exercise `AgentFactory.prepareSkills` through mandatory prompt processing | Current configured-root case asserts full body/link injection; current empty-config registry case asserts unconfigured discovery | Rewrite configured case for path-only metadata and body/link absence; correct empty-config case to assert unchanged prompt/no section |
| `autobyteus-server-ts/src/agent-tools/skills/` | Server-managed skill discovery/content/load agent-tool group | Contains exactly three public tools plus group registration and private access/formatting helpers; all public results are covered by prompt metadata plus authorized direct filesystem operations | Remove the group, private support code, current tests, and current docs in scope |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Register server-owned tool groups at startup | Registers the skill directory as `Skills Tools` | Remove only this loader spec; preserve unrelated tool groups |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | Resolve explicitly configured agent tools | Preserves explicit authorization; a skill-bearing user agent may select no file-capable tool | Do not silently grant shell/file access; capability remains an approved agent-authoring responsibility |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Authoritative server skill discovery/CRUD | Loads disk per lookup and owns managed source semantics | Must not be bypassed by arbitrary model paths |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Restore exact persisted working context | Deliberately ignores fresh system prompt | Historical snapshot behavior requires explicit decision, not accidental change |
| `autobyteus-ts/docs/skills_design.md` | Durable skill architecture documentation | JIT philosophy conflicts with preloaded-body execution/examples | Must be synchronized after implementation |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-02 | Static production-path trace | Read sources listed above from launch through prompt and tool execution | Full body is deterministically concatenated at bootstrap; direct file/shell primitives can read current disk content later | Root cause and viable replacement capability are established without a live model |
| 2026-08-02 | Test setup attempt | `pnpm -C autobyteus-ts exec vitest run tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts --no-watch` | `vitest` unavailable in the fresh worktree | No behavioral test result; install/setup required later |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None required. The user asked to mirror the locally observed Codex skill-loading model conceptually; no unstable public contract is needed for this internal behavior change.
- Version / tag / commit / freshness: N/A
- Relevant contract, behavior, or constraint learned: N/A
- Why it matters: Local production paths are sufficient design evidence.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation; targeted tests will need workspace dependencies installed.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Remote refresh and dedicated worktree creation recorded above.
- Cleanup notes for temporary investigation-only setup: No disposable files created.

## Findings From Code / Docs / Data / Logs

1. The stale behavior is not accidental caching in the LLM provider. AutoByteus explicitly constructs one processed prompt string containing the bodies and stores it as runtime state.
2. `read_file` and `run_bash` both read current filesystem content, so an advertised absolute `SKILL.md` path naturally avoids the cached-body problem.
3. The server has exactly three agent-facing skill tools: `get_available_skills`, `get_skill_content`, and `load_skill`. The first duplicates prompt catalog metadata; the latter two duplicate current file/tree access and guidance available through the advertised path and authorized general-purpose tools.
4. The built-in `retrospective-skill-improver` already has `run_bash`, but arbitrary user-created skill-bearing agents can have an empty tool list. The target must not silently broaden those agents' permissions.
5. Configured-only behavior becomes an advertisement/routing invariant: only configured paths appear in the skill catalog. Generic file/shell tools keep their existing authorization scope rather than pretending the removed wrapper is a security boundary.
6. The current prompt logger prints the full processed prompt; removal will also stop logging complete configured skill bodies and reduce prompt/log volume.
7. Current snapshot restoration intentionally preserves the stored system message. Persisted user-created agent definitions are a second data question because their `toolNames` may contain retired names even though repository-owned agent configs do not.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Per-run working-context v5 snapshots include the system message plus conversation/tool history. Volume is per active/restorable run and not yet measured.
- Relevant code-model, serialization, semantic, or physical-store change: No schema change is proposed, but old snapshots may semantically contain the removed full-body prompt.
- Normal readers and writers, including unknown/extra-field behavior: `WorkingContextSnapshotStore` reads strict v5; `WorkingContextSnapshotBootstrapper` deserializes and installs the exact stored context, ignoring its current-system-prompt argument.
- Representative direct-read or compatibility evidence: Unit test explicitly expects `Stored system` to win over `Different current base prompt`.
- Required semantics and invariants preserved by direct use: Historical conversation identity and tool protocol history remain exact. New prompt behavior applies to newly bootstrapped system prompts; historical snapshots remain historical rather than being rewritten. Retired tool names in agent definitions cannot resolve after registry removal and are skipped by the existing runtime resolver.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Non-system conversation/tool history cannot be discarded merely to remove the old prompt.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Restore-time replacement of only the system message would remove stale bodies but changes the deliberate exact-snapshot contract and affects more than skills. Scanning and rewriting user agent definitions would introduce historical tool-name knowledge solely for inert values. Both rewrites are disproportionate to the benefit and add corruption/recovery surface.
- Existing migration framework or lifecycle constraints, only if migration may be required: No migration is required. Snapshot bootstrap preserves exact stored context; the current runtime resolver already warns and skips unavailable configured tools.

## Constraints / Dependencies / Compatibility Facts

- Configured skills are resolved by agent definition/source context before native core bootstrap; contextual/package path semantics must remain owned by the server skill subsystem.
- `SkillAccessMode` now supports configured-only or none; global runtime discovery was deliberately removed.
- The solution cannot keep a full-body fallback or compatibility registration for any of the three retired skill agent tools.
- General-purpose tools remain explicitly configured; this ticket must not silently grant `run_bash` or unrestricted file access.
- The configured catalog can remain launch-time name/description metadata. Current body freshness is the required dynamic contract.

## Open Unknowns / Risks

- A skill-bearing native agent without a suitable file/shell tool cannot execute its file-backed skill. This is an approved agent-authoring responsibility; broad capability detection is intentionally not added.
- Historical pre-change working-context snapshots may restore old embedded skill bodies unless the scope is expanded.
- Persisted user-created agent definitions may retain retired skill-tool names; the runtime already warns/skips unknown tool names, but the durable cleanup policy needs design review.
- Conversation history can contain an older direct-read result. The simple rule to read `SKILL.md` before beginning work governed by that skill obtains the instructions when needed without exposing this internal concern in the system prompt.
- Test dependencies are not installed in the fresh worktree; downstream stages must establish the normal repository environment before execution.

## Notes For Architecture Reviewer

- Confirm the prompt advertises the exact configured `SKILL.md` path and no body.
- Confirm all three agent-facing skill tools and their group registration are removed cleanly rather than retained as compatibility wrappers.
- Preserve explicit generic-tool authorization and no global skill advertisement.
- Verify direct rereading observes current file content and resolves relative references from the advertised skill directory.
- Confirm the approved `Directly Usable — No Migration` decision: historical snapshots remain exact, and persisted retired tool names remain inert through existing missing-tool skip behavior.
