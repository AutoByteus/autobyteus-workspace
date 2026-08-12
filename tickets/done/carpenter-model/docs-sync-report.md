# Docs Sync Report

## Scope

- Ticket: `carpenter-model`
- Trigger: `CRR-003 Pass` after `API-REV-001 Pass` at 97% confidence
- Bootstrap base reference: `origin/personal@023f4f550b07f27dbf388d55234a10b8eae0e0c7`
- Integrated base reference used for docs sync: `origin/personal@023f4f550b07f27dbf388d55234a10b8eae0e0c7` (already current; zero new base commits)
- Post-integration verification reference: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/delivery-post-integration-check.log`

## Why Docs Were Updated

- Summary: Completed delivery-owned `AC-006` synchronization for the final integrated Carpenter implementation. Durable docs now explain the closed platform-owned foundation, agent authoring boundary, exact Bash-first operating policy, ordinary configured lazy skills, automatic team-tool exposure, and provider-specific projection.
- Why this should live in long-lived project docs: Future agent authors and runtime maintainers must be able to distinguish stable platform instructions from agent/team bodies, skill packages, workspaces, and provider-native tool authorization without reconstructing the contract from ticket artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/prompt_engineering.md` | Canonical runtime instruction composition and author guidance | Updated | Expanded from prompt storage only into the full Carpenter contract and concrete examples. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_definition.md` | `agent.md`, `skillNames`, and `toolNames` authoring surface | Updated | Added the exact agent-owned prompt boundary and removal of processor selection. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_execution.md` | Native/Codex/Claude bootstrap and tool projection | Updated | Added shared Carpenter projection and effective tool exposure. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_tools.md` | Provider-native schemas and task/communication exposure | Updated | Documented the common resolver and automatic team pair. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_communication.md` | `send_message_to` exposure and selector authorization | Updated | Distinguished explicit standalone configuration from automatic team exposure. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team prompt/tool/runtime source truth | Updated | Replaced removed composer/provider task paths and configuration-only wording. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/codex_integration.md` | Codex instruction/tool projection | Updated | Added `baseInstructions`, effective tools, and automatic team behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-ts/docs/agent_processor_and_engine_design.md` | Native closed final-instruction step | No change | Implementation already updated this canonical core architecture doc accurately. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-ts/docs/skills_design.md` | Native ordinary lazy skill model | No change | Already contains the catalog/path-only example and direct platform append. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/skills.md` | Managed skill resolution/provider boundary | No change | Existing catalog, configured resolution, and provider materialization contract remains accurate. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Canonical conceptual/authoring rewrite | Added ownership/order/validation, `agent.md` and foundation examples, exact Bash practice, lazy-skill example, tool examples, provider table, and historical/failure boundaries. | Satisfies `AC-006` in one discoverable durable owner. |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Authoring contract | Clarified rendered fields, omissions, heading containment, skill/tool selection, automatic team pair, and retired processor field. | Prevents agent authors from duplicating platform text or tool schemas. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime composition/projection | Documented shared composer and native/Codex/Claude placement plus effective tool exposure. | Keeps runtime architecture aligned with implemented data flow. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Tool exposure contract | Documented the common runtime resolver, automatic `send_message_to`/`delegate_task`, and explicitly configured remaining tools. | Separates prompt guidance from capability authorization. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Communication exposure | Updated standalone/team semantics and MCP gating wording. | Reflects automatic valid-team exposure without weakening selector authorization. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team runtime architecture | Replaced removed instruction composer/task adapter paths and configuration-only tool claims with current owners. | Removes stale component guidance. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Provider projection | Documented Carpenter `baseInstructions`, effective Agent Tools MCP exposure, and automatic team pair. | Prevents Codex-specific drift. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Closed Carpenter foundation | Identity/team/workspace/Bash/file sections have fixed owners/order and fail-fast bindings. | `system-prompt-contract.md`, focused prompt specs, `prompt-value-binding-spec.md` | `prompt_engineering.md`, `agent_execution.md` |
| Agent authoring | `agent.md` owns responsibilities/boundaries only; blank optionals omit cleanly. | `agent-identity-prompt-spec.md` | `agent_definition.md`, `prompt_engineering.md` |
| Workspace vs skill package | The effective workspace remains the task/default-cwd root; lazy skill assets resolve from the package root. | `working-environment-prompt-spec.md`, `system-skill-decision.md` | `prompt_engineering.md`, existing core `skills_design.md` |
| Bash/file practice | Bash-first and deterministic bounded file work are platform foundation, not a system skill. | `bash-operating-practice-prompt-spec.md`, `file-and-directory-practice-prompt-spec.md` | `prompt_engineering.md` |
| Team prompt vs tools | Team Runtime renders fixed rosters/protocols; valid team contexts independently receive exactly two automatic provider-native tools. | `team-and-runtime-prompt-spec.md`, `design-spec.md` | `agent_tools.md`, `agent_team_execution.md`, `agent_communication.md` |
| Provider projection | Native uses `AgentConfig.systemPrompt` plus terminal Skills; Codex uses `baseInstructions`; Claude uses SDK `systemPrompt`. | `design-spec.md`, `implementation-handoff.md` | `prompt_engineering.md`, `agent_execution.md`, `codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Generic core system-prompt processor list, defaults, pipeline, registry, registration APIs, and public exports | Closed native `SystemPromptProcessingStep` with one direct terminal Skills append | core `agent_processor_and_engine_design.md`, server `prompt_engineering.md` |
| `systemPromptProcessorNames` authoring/API/UI field | No replacement; prompt structure is platform-owned | `agent_definition.md`, `prompt_engineering.md` |
| Runtime-specific member instruction composers/bootstrap strategies and Claude turn-input instruction wrapping | Shared `composeCarpenterPrompt(...)` projected through provider instruction boundaries | `prompt_engineering.md`, `agent_execution.md`, `agent_team_execution.md` |
| Configuration-only availability for team communication/delegation | Deduplicated configured tools plus automatic `send_message_to` and `delegate_task` for valid team contexts | `agent_tools.md`, `agent_communication.md`, `agent_team_execution.md` |
| Text `Available Tools`/tool manifest or eager configured skill bodies | Provider-native schemas plus ordinary lazy skill discovery/catalog | `prompt_engineering.md`, core `skills_design.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Present the integrated, documented handoff for explicit user verification. Hold archival, push, final target merge, release, and cleanup until the user accepts.
- Notes: `AC-006` is now satisfied. No documentation blocker or reroute remains.

## Delivery Re-entry — API-REV-002

- Trigger: User-requested real built-server AutoByteus/DeepSeek validation, followed by `API-REV-002 Pass` and `CRR-004 Not Applicable`.
- Docs impact: `No additional impact`
- Rationale: Round 2 changed no implementation, requirement, durable test, provider contract, or authoring surface. The real `deepseek-v4-flash` run exercised and confirmed the already documented Carpenter native bootstrap path. The seven `DR-001` documentation updates remain authoritative and `AC-006` remains satisfied.
- Current delivery action: Refresh the handoff evidence/confidence to 98% and retain the explicit user-verification hold.

## Delivery Re-entry — API-REV-003

- Trigger: User-requested real Codex App Server validation with exact `gpt-5.6-luna`, followed by `API-REV-003 Pass` and `CRR-005 Not Applicable`.
- Docs impact: `No additional impact`
- Rationale: Round 3 changed no implementation, requirement, durable test, provider contract, or authoring surface. The exact-model catalog check, two-turn history/projection flow, and configured-skill materialization flow confirmed the already documented Codex `baseInstructions`, provider runtime, and lazy-skill boundaries. The seven `DR-001` documentation updates remain authoritative and `AC-006` remains satisfied.
- Current delivery action: Refresh the handoff with Codex live evidence while retaining the 98% confidence result and explicit user-verification hold.
