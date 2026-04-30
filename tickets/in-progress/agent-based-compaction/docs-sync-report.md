# Docs Sync Report

## Scope

- Ticket: `agent-based-compaction`
- Trigger: Delivery-stage docs synchronization after Round-4 code-review pass and Round-2 API/E2E validation pass, then user-requested latest `origin/personal` merge and local Electron build verification on 2026-04-29.
- Bootstrap base reference: `origin/personal` at `c570c57d7d503ad2c37f5916d2dd536b17ebe859` (`v1.2.85`).
- Integrated base reference used for docs sync: latest fetched/merged `origin/personal` at `b7a4e146` on 2026-04-29; integrated via merge commit `5c92590a` after local checkpoint commit `480d8b3d`.
- Post-integration verification reference: `git diff --check` passed after merging latest `origin/personal`; stale direct-model compaction doc grep found no hits; local macOS ARM64 Electron build passed with `NO_TIMESTAMP=1 APPLE_TEAM_ID= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm build:electron:mac -- --arm64`.

## Why Docs Were Updated

- Summary: Long-lived docs now describe the final reviewed/validated agent-based compaction behavior: server startup seeds the normal shared editable `autobyteus-memory-compactor` when missing, selects it only when `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is blank and resolvable, leaves runtime/model on the selected agent's normal `defaultLaunchConfig`, and runs compaction through a visible normal compactor-agent run. Direct-model compaction and active-model fallback remain removed.
- Why this should live in long-lived project docs: Operators and future maintainers need the durable runtime/configuration/bootstrap contract in canonical memory, server deployment, and web settings documentation rather than only in ticket artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/agent_memory_design.md` | Canonical memory architecture, compaction behavior, and cross-package runtime owner map. | `Updated` | Delivery added explicit server startup/default-compactor bootstrap responsibilities and server runtime adapter file responsibilities, and confirmed no stale direct-model compaction wording remains in the reviewed sections. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/agent_memory_design_nodejs.md` | NodeJS mirror of memory architecture and compaction behavior. | `Updated` | Mirrored the canonical memory doc updates. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/llm_module_design.md` | LLM/provider behavior affected by large compaction requests. | `Updated` | Existing implementation diff correctly notes local-runtime hardening still matters when the selected visible compactor agent uses a local model. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-web/docs/settings.md` | User/operator settings surface for compaction. | `Updated` | Existing implementation diff documents the typed compactor-agent selector, seeded default compactor, normal-agent launch configuration, and no active-model fallback. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-server-ts/docker/README.md` | Deployment/runtime environment variables. | `Updated` | Existing implementation diff documents the new compactor-agent environment variable, seeded default, normal editor configuration, and runtime effect. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-server-ts/README.md` | Server package overview. | `No change` | No existing compaction runtime settings section; deployment/operator configuration is already covered in `autobyteus-server-ts/docker/README.md`, while code ownership is now captured in the memory architecture docs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/README.md` | Root project overview. | `No change` | No root-level compaction setup contract lives here; canonical detail is in package docs above. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/agent_memory_design.md` | Architecture/runtime documentation | Documents agent-driven compaction, `AgentCompactionSummarizer`, `CompactionAgentRunner`, visible compactor-agent runs, seeded/default `autobyteus-memory-compactor`, explicit compactor-agent setting, selected-agent `defaultLaunchConfig`, no direct-model fallback, and server adapter owners (`DefaultCompactorAgentBootstrapper`, settings resolver, runner, output collector, template). | Preserve the final implementation boundary and prevent future maintainers from reintroducing direct-model compaction, hidden compactor runs, or environment-specific model defaults. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/agent_memory_design_nodejs.md` | Architecture/runtime documentation | Mirrored the canonical memory design updates for NodeJS readers. | Keep both long-lived memory design documents synchronized. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-ts/docs/llm_module_design.md` | Provider/runtime note | Notes local provider hardening remains relevant when a visible compactor agent sends a large request. | Connect LLM runtime behavior to the new compactor-agent flow. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-web/docs/settings.md` | Settings documentation | Documents the compaction config card's compactor-agent selector, seeded default compactor, threshold, context override, and detailed logs. | Operators need UI-level configuration guidance. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/autobyteus-server-ts/docker/README.md` | Deployment/runtime documentation | Documents `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, the startup-seeded default shared compactor agent, the selected/default agent's normal launch config ownership, and no active-model fallback. | Container operators need environment-variable and setup guidance. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Default shared compactor bootstrap | Server startup seeds `autobyteus-memory-compactor` as a normal shared editable agent only when missing, preserves existing user edits, refreshes the definition cache, and selects it only when the compactor setting is blank and the default definition resolves. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-default-compactor-agent-and-e2e.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/api-e2e-validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docker/README.md` |
| Selected compactor launch config | `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` selects a normal agent definition; that agent's `defaultLaunchConfig` owns runtime/model/model config. The seeded default intentionally has `defaultLaunchConfig: null` until configured. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/requirements.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-spec.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/api-e2e-validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docker/README.md` |
| Visible compactor-agent runs | Compaction launches a normal visible agent run through server/runtime wiring, posts one compaction task, collects final JSON output, terminates the run, and leaves history inspectable/correlatable through parent status metadata including `compaction_run_id`. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-visible-compactor-runs.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/implementation-handoff.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/api-e2e-validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| No direct-model fallback | Missing selected/default runtime/model fails clearly when compaction is required; the system does not fall back to the active parent model or old compaction model setting. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/requirements.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/api-e2e-validation-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docker/README.md` |
| Backend non-invasion | Compaction should not add hidden/internal task branches to Codex/Claude/backend bootstrap/session/thread internals. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-visible-compactor-runs.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/review-report.md` | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` / active-model fallback | `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`; blank settings auto-select the seeded default when resolvable, and missing selected/default launch config fails clearly. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docker/README.md` |
| `LLMCompactionSummarizer` direct model call | `AgentCompactionSummarizer` plus injected `CompactionAgentRunner`. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| `compaction-prompt-builder.ts` internal prompt owner | `compaction-task-prompt-builder.ts` for the normal compactor-agent task. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Hidden/internal compactor run design | Normal visible compactor-agent run through the existing run service/manager path. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md` |
| Environment-specific default compactor model | File-backed editable default compactor template with `defaultLaunchConfig: null`; users/E2E configure runtime/model through normal agent-definition launch preferences. | `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docker/README.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync remains valid after latest `origin/personal` merge (`b7a4e146`) and local Electron build verification. Repository finalization remains on hold pending explicit user approval, per delivery workflow.
