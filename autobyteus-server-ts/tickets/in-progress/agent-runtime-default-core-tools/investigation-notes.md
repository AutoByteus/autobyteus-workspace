# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — dedicated task worktree and branch created from refreshed `origin/personal`; initial requirements were created as Draft and then refined to Design-ready.
- Current Status: Complete for architecture handoff — current-state architecture, runtime exposure paths, native registry availability including `write_file`, prompt composition, downstream coverage scope, and prior implementation limitation investigated; revised design spec and approved system-prompt contract produced.
- Investigation Goal: Determine the authoritative native AutoByteus tool-exposure boundary and design the smallest safe default invariant for `run_bash`, `read_file`, `edit_file`, and `write_file` across standalone and team runs without leaking to external runtimes; also define clear file-operation guidance with a recoverable Bash fallback.
- Scope Classification (`Small`/`Medium`/`Large`): Small, confirmed by the completed design; architecture review remains the gate before implementation.
- Scope Classification Rationale: Existing tool-resolution pipeline appears centralized, but shared exposure code is consumed by multiple runtime backends and needs isolation checks.
- Scope Summary: Add four default tools to every AutoByteus-runtime run; preserve configured optional tools and existing team communication/delegation defaults; provide availability-aware file-operation guidance; do not mutate persisted definitions or change external runtimes.
- Primary Questions To Resolve: Resolved. Configured names are converted in the native backend factory/resolver; team automatic names are added by the shared helper for valid team context; existing unit seams cover neutral exposure and native materialization; persisted data is directly usable with no migration.

## Request Context

The user requests that every agent started with the native AutoByteus runtime receive `run_bash`, `read_file`, `edit_file`, and `write_file` by default, even when an agent configuration omits them, for both independent and team execution. The user believes team runs already receive automatic `send_message_to` and `delegate_task`; this investigation verifies that behavior and limits the new default to the native runtime. This is a small scope expansion of the prior approved three-tool baseline, not a new tool implementation.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools`.
- Current Branch: `codex/agent-runtime-default-core-tools`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` succeeded; `origin/personal` resolved to commit `54890a07f` (`docs(delivery): record v1.4.50 release results`).
- Task Branch: `codex/agent-runtime-default-core-tools`.
- Expected Base Branch (if known): `origin/personal` / local tracking branch `personal`.
- Expected Finalization Target (if known): `personal` after downstream review and delivery.
- Bootstrap Blockers: None. The original shared checkout contains unrelated untracked `.article-work/`; it was not modified.
- Notes For Downstream Agents: Use this dedicated worktree for all authoritative artifacts and implementation. Do not infer prior solution state from missing records.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/runtime-tool-exposure-matrix.md` | Runtime-kind/run-shape matrix for effective tool exposure | Four native defaults, preserved team defaults, external-runtime isolation, materialization, and coverage scenarios | `requirements.md`, `design-spec.md` | REQ-001 through REQ-005, REQ-007; AC-001 through AC-007, AC-010 | Approved | Defines intended behavior; explicit user approval is recorded in requirements; architecture review remains the gate | Keep aligned through architecture/implementation review |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/system-prompt-file-operations-contract.md` | Fixed prompt contract for file-tool selection, fresh context, recovery, verification, and Bash fallback | Explicit wording approved by the user; native `write_file` availability comes from the four-tool baseline while external wording remains availability-aware | `requirements.md`, `design-spec.md` | REQ-006; AC-008, AC-009 | Approved | Intended behavior is explicitly user-approved; architecture review remains the gate | Keep aligned through architecture/implementation review |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-14 | Setup | `git fetch origin --prune`; `git remote show origin`; `git worktree add -b codex/agent-runtime-default-core-tools ... origin/personal` | Establish task isolation and fresh base | Dedicated worktree/branch created from refreshed `origin/personal`; no bootstrap blocker | No |
| 2026-08-14 | Code | `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | Find runtime-neutral exposure composition | Configured names are trimmed/deduplicated; `send_message_to` and `delegate_task` are automatically added only for non-null team context; the helper is shared by native, Claude, and Codex paths | Yes — decide native-only default boundary |
| 2026-08-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Trace native runtime materialization | Resolves agent definition, calls shared exposure resolver with member context, resolves native tools, and passes created tools into `AgentConfig`; this is the native production entrypoint | Yes — inspect tests and runtime-kind handling |
| 2026-08-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | Verify native tool instance creation | Iterates effective requested names, handles server-owned send-message factory, otherwise creates from `defaultToolRegistry`; unknown names are warned/skipped | Yes — add/locate materialization coverage |
| 2026-08-14 | Code | `autobyteus-ts/src/tools/register-tools.ts` | Verify foundation tool availability | `read_file`, `write_file`, `edit_file`, run-bash and related terminal tools are registered by `registerTools()` | Yes — confirm AgentFactory startup registration is sufficient |
| 2026-08-14 | Code | `autobyteus-ts/src/agent/factory/agent-factory.ts` | Verify registration lifecycle | AgentFactory constructor calls `registerTools()` before agents are created | No |
| 2026-08-14 | Code | `autobyteus-ts/src/tools/file/read-file.ts`; `autobyteus-ts/src/tools/file/write-file.ts`; `autobyteus-ts/src/tools/file/edit-file.ts`; `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Verify the concrete native registry contract used by AC-006 | The four canonical tool definitions are registered by the existing startup registration path and are resolved by name; no new registry contract is required | No |
| 2026-08-14 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Trace runtime selection and restore contexts | Runtime kind selects native/Claude/Codex factories; shared exposure builder is used for Claude restore context with empty configured names, so a global helper default would leak if not isolated | Yes — inspect Claude/Codex bootstrap call signatures |
| 2026-08-14 | Code | `autobyteus-server-ts/tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts` | Establish current contract tests | Tests assert empty missing definition gives empty exposure and team context adds exactly `send_message_to`/`delegate_task`; current helper is explicitly runtime-neutral | Yes — update expected contract only if API is extended |
| 2026-08-14 | Code | `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` | Establish native resolver test seam | Test resolves configured `read_file`, skips stale name, and verifies definition array unchanged | Yes — add four-default omission/materialization scenario |
| 2026-08-14 | Code | `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts` | Check team-specific filtering | Mixed AutoByteus team members strip legacy task-plan names while retaining server-owned task delegation and configured `read_file` | Yes — verify foundation defaults survive this filtering |
| 2026-08-14 | Code | `autobyteus-ts/src/tools/file/write-file.ts`; `autobyteus-ts/docs/tool_schema_and_configuration.md` | Verify existing write-file behavior and documentation authority | `write_file` already creates/overwrites files through the registered tool, uses the trusted-local path contract, and remains governed by the existing approval/runtime path; no tool contract change is needed | Yes — preserve during four-default exposure change |
| 2026-08-14 | Code | `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts`; `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts` | Locate the fixed system-prompt owner and all prompt consumers | The Bash section currently calls Bash primary for file reading/writing/editing and the file section recommends `cat`/`sed`/`nl`; the composer is reused by native, Claude, and Codex backends, so the replacement must give Bash and dedicated file tools a logical division and remain availability-aware | Yes — add the reviewed contract without implying unavailable tools |
| 2026-08-14 | Code | `autobyteus-ts/src/tools/file/read-file.ts` | Verify the actual read-file range and output contract before revising prompt guidance | `read_file` supports optional 1-based inclusive `start_line`/`end_line` ranges and prefixes returned lines with line numbers by default; these detailed semantics are already supplied by the tool schema | No — keep the fixed prompt schema-led and concise |
| 2026-08-14 | Code / Doc | `autobyteus-ts/src/tools/file/edit-file-contract.ts`; `autobyteus-ts/docs/tool_schema_and_configuration.md`; `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Compare existing tool-level and durable file-operation guidance | The edit-file description and tool-schema documentation already require fresh context before edits and rereading after context failure; the system prompt should reinforce, not contradict, those contracts | Yes — keep wording aligned during implementation |
| 2026-08-14 | Doc | `autobyteus-server-ts/docs/modules/agent_tools.md` | Confirm documented runtime exposure contract | Documents shared helper as runtime-neutral; standalone gets no automatic team pair; tools remain explicit except team pair | Yes — docs must be updated after approved implementation |
| 2026-08-14 | Command | `rg -n 'resolveRuntimeAgentToolExposure|buildRuntimeAgentToolExposure|RuntimeAgentToolExposure' autobyteus-server-ts/src ...` | Enumerate helper consumers | Native factory, Claude bootstrap/session, Codex bootstrap, manager restore context, Agent Tools MCP catalog/tests consume the exposure type/helper | Yes — complete runtime isolation map |
| 2026-08-14 | Command | `rg -n 'new AgentRunConfig\(|memberTeamContext' autobyteus-server-ts/src ...` | Locate native/team config flow | Team member handles construct `AgentRunConfig` with `memberTeamContext`; standalone provisioning leaves it null; runtime kind is explicit in config | No |
| 2026-08-14 | Test | `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Establish focused baseline before implementation | Could not execute because the dedicated worktree has no installed `vitest`/`node_modules`; this is an environment/setup limitation, not a product failure. | Install workspace dependencies before implementation-scoped validation |
| 2026-08-14 | Other | `design-review-report.md` / ARCH-REV-001 | Apply architecture-review rework findings to the authoritative package | Review confirmed the native-only design and identified BE-004 traceability, supplement approval metadata, and missing explicit external spine DS-005; all three are addressed in SR-002. | No |
| 2026-08-14 | Other | `design-review-report.md` / ARCH-REV-003 / ARCH-DI-003 | Apply the latest architecture-review design-impact finding | Review found that `autobyteus-server-ts/docs/modules/prompt_engineering.md` was omitted from the final design inventory; the rework adds its required edit owner/scope and records `autobyteus-ts/docs/tool_schema_and_configuration.md` as verification-only. | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BE-001 | System | Application/GraphQL start-run flow creates an `AgentRunConfig` with `runtimeKind=autobyteus`; an agent definition may omit `toolNames`. | Start run -> `AgentRunManager.createAgentRun` -> native backend factory -> resolve `AgentDefinition` -> native exposure wrapper -> `resolveAutoByteusAgentTools` -> `AgentConfig.tools` -> native `AgentFactory.createAgentWithId`/runtime loop. | The prior implementation materializes only the configured names plus team automatic names; the revised target adds all four foundation tools without changing the stored definition. | `src/agent-execution/services/agent-run-manager.ts`; `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`; native wrapper/resolver files. |
| BE-002 | System | Team execution launches a member with a valid `MemberTeamContext` and native/mixed team backend. | Team run -> member handle builds context/config -> AgentRunManager selects AutoByteus factory -> native baseline plus shared team pair -> mixed filtering -> native tool resolver -> agent runtime. | `send_message_to` and `delegate_task` are automatic for valid team context; the revised target makes all four foundation tools automatic for native team members and task-agents. | `src/agent-execution/shared/runtime-agent-tool-exposure.ts`; `src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`; `tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts`. |
| BE-003 | Contract | External runtime run starts with explicit `runtimeKind=claude_agent_sdk` or `codex_app_server`; provider bootstrap receives effective exposure. | Start/restore -> runtime-specific backend factory/bootstrap -> shared exposure helper -> provider-native or Agent Tools MCP projection. | External runtimes honor explicit configured tools/team automatic rules; adding a native default globally would alter provider exposure and is prohibited by scope. | `src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts`; `src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`; `src/agent-execution/services/agent-run-manager.ts`. |
| BE-004 | System | Native AgentFactory initialization is the governing registry-readiness contract for AC-006. | Native backend factory -> AgentFactory singleton -> registerTools() -> defaultToolRegistry -> native resolver creates the requested tool instances. | The four canonical definitions are ready before native tool resolution; registration order and schemas are unchanged. | `autobyteus-ts/src/agent/factory/agent-factory.ts`; `autobyteus-ts/src/tools/register-tools.ts`; requested tool definition files. |
| BE-005 | Contract | A composed Carpenter prompt is provided to native, Claude, and Codex backends; fixed Bash/file guidance is currently overlapping, while the edit-tool description and tool schemas already contain detailed semantics. | Run start/restore -> runtime backend bootstrap -> `composeCarpenterPrompt` -> provider system/base instructions. | The prompt should concisely divide Bash command/search/project work from dedicated file-content tools, guide `read_file`/`edit_file`/`write_file` selection, fresh-context recovery, verification, and `run_bash` fallback when available, without duplicating schema details or changing exposure/safety contracts. | `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts`; `carpenter-prompt-composer.ts`; `autobyteus-ts/src/tools/file/read-file.ts`; `autobyteus-ts/src/tools/file/edit-file-contract.ts`. |
| BE-006 | Contract | Prior source and downstream coverage were reviewed for the three-tool baseline; the requested `write_file` expansion has not yet been implemented or reviewed. | Native policy -> native materialization -> create/restore integration -> GraphQL/API-E2E approval and file side effect. | New coverage must prove all four defaults, deduplication, immutable persisted names, registry-backed materialization, approval/path preservation, and no Claude/Codex leakage. | Native unit tests; `tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts`; `tests/integration/agent-execution/agent-run-manager.integration.test.ts`; `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`; `tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`. |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant`.
- Refactor posture evidence summary: The existing shared exposure composition is the natural neutral mechanics boundary, and native tool instance resolution is already separate. The risk is policy scope: adding defaults in the runtime-neutral helper would affect Claude/Codex. The selected small native-only composition wrapper keeps materialization unchanged and makes the runtime boundary explicit.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `runtime-agent-tool-exposure.ts` | Team pair is unioned at one shared composition point. | Existing owner can hold default composition if runtime scope is explicit. | Decide API shape that does not leak native policy. |
| `autobyteus-agent-run-backend-factory.ts` | Native factory calls shared resolver before creating AgentConfig. | Native backend is an authoritative entrypoint for native-only defaults. | Confirm restore/create symmetry. |
| `agent-run-manager.ts` | Shared exposure helper is called for Claude restore runtime context with empty names. | Global helper default would be incorrect. | Add external isolation coverage. |
| `autobyteus-ts/src/tools/register-tools.ts` | Requested tools already register at startup. | No registry or tool implementation refactor needed. | Verify tests exercise registry-backed instance creation. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | Normalize configured names and derive runtime-neutral family flags/team automatic names | Shared by native, Claude, Codex, and MCP projections | Keep native baseline scoped explicitly; do not make generic helper silently native-specific |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Build native `AgentConfig` and native runtime context | Single native create/restore path calls resolver | Strong candidate for authoritative native default union |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` | Materialize effective names from native registry or server-owned factories | Already handles configured and team names | Reuse unchanged; ensure receives defaults |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | Remove legacy task-plan names for mixed team members | Filters names after effective exposure | Foundation names are not task-management and should remain |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Select backend; build restore runtime contexts | Claude restore currently calls shared exposure helper | External isolation must remain explicit |
| `autobyteus-ts/src/tools/register-tools.ts` | Register native tool definitions | Foundation tools already present | No tool implementation changes expected |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Initialize native registry and create/restore agents | Calls `registerTools()` | Supports native materialization without config mutation |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Document runtime exposure contract | Current wording says non-team tools are explicit | Update after behavior implementation |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-14 | Static Trace | `sed`/`rg` over native factory, manager, exposure, resolver, registry, and tests | Native create/restore both pass through the same factory build path; native resolver uses the effective exposure names. | One policy change can cover create and restore. |
| 2026-08-14 | Static Probe | `cat autobyteus-ts/src/tools/register-tools.ts`; `sed` AgentFactory | `read_file`, `write_file`, `edit_file`, and `run_bash` registrations exist and AgentFactory calls `registerTools()` during construction. | No registration or schema change required. |
| 2026-08-14 | Static Contract Check | `cat autobyteus-server-ts/tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts` | Tests encode current empty standalone exposure and team pair behavior. | Tests need explicit native-default coverage; shared helper contract should remain neutral unless API gains explicit mode. | No — native-only composition is preferred at current evidence level |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None; this is an internal runtime policy change.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: Local source and tests are authoritative.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for bootstrap/static analysis.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; dedicated `git worktree add`.
- Cleanup notes for temporary investigation-only setup: None; dedicated worktree is authoritative task workspace.

## Findings From Code / Docs / Data / Logs

- The four foundation tools are existing native tools; this request is a small exposure-policy expansion, not new tool implementation.
- `AgentDefinition.toolNames` defaults to an empty array when omitted and is persisted as configuration. Runtime-derived defaults should not be written back.
- Team automatic tools are currently added when any `MemberTeamContext` is present, while mixed AutoByteus filtering removes only legacy local task-plan names and preserves server-owned delegation names.
- The current shared helper returns `requestedToolNames` and derived flags. Native AutoByteus consumes names directly; Claude/Codex use them to gate Agent Tools MCP/provider surfaces.
- A focused matrix supplement now records the intended native-vs-external effective exposure, `write_file` contract preservation, and coverage boundary.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Agent definitions/package configs store `toolNames` as a string array; exact volume is not needed because no records are rewritten.
- Relevant code-model, serialization, semantic, or physical-store change: None; effective exposure is runtime-only.
- Normal readers and writers, including unknown/extra-field behavior: AgentDefinition constructor defaults missing `toolNames` to `[]`; definitions are read and resolved without requiring new fields.
- Representative direct-read or compatibility evidence: `AgentDefinition` model and runtime resolver accept empty/missing names; no schema transformation is proposed.
- Required semantics and invariants preserved by direct use: `Yes` — configured tool names remain unchanged; runtime union adds only effective defaults.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: No migration, rewrite, or downtime.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration has no benefit and would incorrectly conflate runtime policy with persisted user configuration.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable.

## Constraints / Dependencies / Compatibility Facts

- The default baseline must be runtime-kind-scoped to `RuntimeKind.AUTOBYTEUS`.
- Existing external runtime behavior is a compatibility constraint: no accidental new tools in Claude/Codex provider schemas or Agent Tools MCP sessions.
- Do not retain or add compatibility wrappers; use a clean effective-exposure union and remove no existing tool paths.
- Native tool resolver must continue using the existing registry and server-owned factory pathways.
- Any team-specific automatic names remain additive and their current context/availability checks must remain intact.

## Open Unknowns / Risks

- The mixed member handle and task-agent registry delegate create/restore through `AgentRunManager`, which selects the native factory by `runtimeKind`; no alternate server-managed native path was found.
- A workspace dependency install is still required before implementation-scoped tests can run; no source-level blocker was found.
- Native default tools provide significant local capabilities; existing authorization and approval controls must remain the governing safety contract.
- The new prompt contract must not dead-end an agent when a file tool is unavailable or cannot complete the operation after appropriate recovery; it should explicitly preserve `run_bash` as an appropriate fallback while retaining safety and verification guidance.
- `write_file` is newly part of the requested native four-tool baseline; prompt wording remains “when exposed” for the shared native/external prompt because external runtimes must not be assumed to expose it.
- The tool schemas already expose range and formatting semantics; the fixed prompt should not restate those details unless implementation evidence shows a concrete model failure that requires it.

## Notes For Architecture Reviewer

Review the selected native-only composition wrapper and the approved system-prompt file-operations contract against the explicit DS-005 external-provider spine. The expected target remains a small, clean-cut four-tool baseline expansion with no persisted-data migration and no external runtime behavior change. Requirements and both intended-behavior supplements are user-approved; architecture review remains the gate before the follow-up implementation change. The prior implementation/source and downstream coverage artifacts are included for context but are not sufficient authorization for this revised scope.

The intended-behavior supplement is `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/runtime-tool-exposure-matrix.md`; its intended behavior is approved by the explicit user request, and architecture review remains the gate. It must be included in any handoff. The design spec is now `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/design-spec.md`.

The approved prompt supplement is `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/in-progress/agent-runtime-default-core-tools/system-prompt-file-operations-contract.md`; its concise workflow wording is locked intended behavior for architecture review. ARCH-DI-003 rework now explicitly maps `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/docs/modules/prompt_engineering.md` as a required durable-document edit and `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-ts/docs/tool_schema_and_configuration.md` as verification-only.
