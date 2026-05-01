# Docs Sync Report

## Scope

- Ticket: `agent-based-compaction`
- Trigger: Delivery-stage docs synchronization after Round-7 facts-only compactor schema code-review/API-E2E pass and latest `origin/personal` integration refresh on 2026-04-30.
- Bootstrap base reference: `origin/personal` at `c570c57d7d503ad2c37f5916d2dd536b17ebe859` (`v1.2.85`).
- Integrated base reference used for docs sync: latest fetched/merged `origin/personal` at `9068aa22` (`v1.2.87`) on 2026-04-30; integrated via merge commit `bad77b69` after local Round-7 checkpoint commit `608f0670`.
- Post-integration verification reference: `git diff --check` passed; targeted facts-only core/server/web tests passed; macOS ARM64 Electron build passed for `1.2.87`.

## Why Docs Were Updated

- Summary: Long-lived docs now describe the final reviewed/validated agent-based compaction behavior, including the seeded editable `autobyteus-memory-compactor`, visible normal compactor runs, prompt-ownership split, and facts-only semantic output contract. Automated compaction tasks own the exact `[OUTPUT_CONTRACT]`; semantic arrays contain `{ "fact": "..." }` objects only, and the compactor model is not asked to generate optional `reference` strings or free-form `tags`.
- Why this should live in long-lived project docs: Operators and future maintainers need the durable runtime/configuration/bootstrap/schema contract in canonical memory, server deployment, web settings, and default compactor template documentation rather than only in ticket artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/agent_memory_design.md` | Canonical memory architecture, compaction behavior, prompt ownership, and facts-only semantic schema. | `Updated` | Documents agent-driven compaction, default compactor bootstrap, facts-only semantic entries, and no model-generated `reference`/`tags`; reviewed after merge and still accurate. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/agent_memory_design_nodejs.md` | NodeJS mirror of memory architecture and compaction behavior. | `Updated` | Mirrors canonical memory doc updates; reviewed after merge and still accurate. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-web/docs/settings.md` | User/operator settings surface for compaction. | `Updated` | Documents compactor-agent selector, seeded default, normal-agent launch configuration, prompt ownership, facts-only semantic entries, and no active-model fallback. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-server-ts/docker/README.md` | Deployment/runtime environment variables. | `Updated` | Documents the compactor-agent env setting, seeded default, normal editor configuration, and runtime effect. No facts-only-specific change was needed here. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/llm_module_design.md` | LLM/provider behavior affected by large compaction requests. | `Updated` | Existing note about selected visible compactor agents/local model hardening remains accurate after latest provider/RPA upstream merges. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent.md` | Runtime-facing default compactor agent instructions/template. | `Updated` | Template owns stable behavior/manual-test guidance and shows facts-only category shape without `reference`/`tags` contract fields. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-server-ts/README.md` | Server package overview. | `No change` | No existing compaction runtime settings section; deployment/operator details live in `autobyteus-server-ts/docker/README.md`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/README.md` | Root project overview. | `No change` | No root-level compaction setup contract lives here; canonical detail is in package docs above. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/agent_memory_design.md` | Architecture/runtime/schema documentation | Documents agent-driven compaction, visible runs, seeded/default compactor, selected-agent `defaultLaunchConfig`, prompt ownership split, facts-only semantic entries, and no direct-model fallback. | Preserve the final implementation boundary and prevent future maintainers from reintroducing direct-model compaction, hidden runs, or model-generated semantic metadata. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/agent_memory_design_nodejs.md` | Architecture/runtime/schema documentation | Mirrored canonical memory design updates for NodeJS readers. | Keep both memory design documents synchronized. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-web/docs/settings.md` | Settings documentation | Documents the compaction config card, default compactor behavior, normal agent editor runtime/model ownership, and facts-only automated contract. | Operators need UI-level configuration guidance. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-server-ts/docker/README.md` | Deployment/runtime documentation | Documents `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, startup-seeded default shared compactor agent, selected/default launch config ownership, and no active-model fallback. | Container operators need environment-variable/setup guidance. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/llm_module_design.md` | Provider/runtime note | Notes local provider hardening remains relevant when a visible compactor agent sends a large request. | Connect LLM runtime behavior to the compactor-agent flow. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent.md` | Default agent template/instructions | Adds stable category/manual-test guidance and facts-only JSON shape for normal visible manual compactor runs. | Keep the seeded editable default useful while automated tasks still inject the exact machine contract. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Facts-only compactor output schema | Compactor-facing semantic category arrays contain `{ "fact": "..." }` only; parser/normalizer accepts facts and sets internal metadata deterministically instead of carrying model-generated `reference` or `tags`. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-minimal-compactor-schema.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/api-e2e-validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md` |
| Prompt ownership split | Editable `agent.md` owns stable behavior/manual-test guidance, while every automated task includes the exact current `[OUTPUT_CONTRACT]` and `[SETTLED_BLOCKS]` envelope owned by memory compaction/parser code. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-compactor-prompt-ownership.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/implementation-handoff.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, default compactor `agent.md` |
| Default shared compactor bootstrap | Server startup seeds `autobyteus-memory-compactor` as a normal shared editable agent only when missing, preserves user edits, refreshes definition cache, and selects it only when the compactor setting is blank and the default resolves. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-default-compactor-agent-and-e2e.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docker/README.md` |
| Visible compactor-agent runs | Compaction launches a normal visible agent run, posts one compaction task, collects final JSON output, terminates the run, and leaves history correlatable through parent status metadata including `compaction_run_id`. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-visible-compactor-runs.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/api-e2e-validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| No direct-model fallback | Missing selected/default runtime/model fails clearly; the system does not fall back to the parent model or old compaction model setting. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/requirements.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/api-e2e-validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docker/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Model-generated semantic `reference` strings and free-form `tags` in compactor output | Facts-only category entries; internal references/tags remain deterministic system metadata and are not requested from the model. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, default compactor `agent.md` |
| Editable agent prompt as sole parser contract owner | Automated task prompt injects exact `[OUTPUT_CONTRACT]`; editable agent prompt owns stable behavior/manual testing. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md` |
| `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` / active-model fallback | `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`; blank settings auto-select the seeded default when resolvable, and missing selected/default launch config fails clearly. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docker/README.md` |
| `LLMCompactionSummarizer` direct model call | `AgentCompactionSummarizer` plus injected `CompactionAgentRunner`. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Hidden/internal compactor run design | Normal visible compactor-agent run through the existing run service/manager path. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync remains valid after latest `origin/personal` merge (`9068aa22`), post-merge targeted checks, and local Electron build verification. Repository finalization remains on hold pending explicit user approval, per delivery workflow.
