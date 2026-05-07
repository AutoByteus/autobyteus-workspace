# Investigation Notes

## Investigation Status

- Bootstrap Status: Existing dedicated ticket worktree reused.
- Current Status: Requirements/design revised after user clarified Daily Assistant should be private/user-managed, not server built-in/default-featured.
- Investigation Goal: Support Agents page origin grouping and determine correct ownership for platform built-in agents versus user/private agents.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: Frontend grouping is localized, but server built-in provisioning and private-agent placement are also in scope.
- Scope Summary: Keep featured agents first; group no-search non-featured agents by origin; keep search flat; centralize true built-in agent provisioning for Memory Compactor only; remove Daily Assistant from server built-ins and place it in private agents.
- Primary Questions To Resolve: Whether backend ownership metadata is sufficient for grouping; whether Daily Assistant should be server-built-in or private; where Memory Compactor provisioning belongs; how private package roots make Daily Assistant available.

## Request Context

The user first requested work on ticket `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/tickets/done/agent-catalog-origin-grouping` to improve Agents page grouping. During continuation they requested renaming `AutoByteus Super Assistant` to `Daily Assistant`, then clarified the folder/id should be renamed too. Subsequent investigation found `Memory Compactor` is another built-in/provisioned agent. The user then questioned why built-in agents are scattered and why bootstrapping exists. Latest user direction supersedes the earlier Daily Assistant built-in plan: `Daily Assistant` should be private/user-managed under `/Users/normy/autobyteus_org/autobyteus-private-agents`, while the current grouping and Memory Compactor built-in centralization changes should remain.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping/tickets/done/agent-catalog-origin-grouping`.
- Current Branch: `codex/agent-catalog-origin-grouping`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-catalog-origin-grouping`.
- Bootstrap Base Branch: `origin/personal` from original ticket bootstrap.
- Remote Refresh Result: Previously completed for this ticket.
- Task Branch: `codex/agent-catalog-origin-grouping`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): personal/integration branch per normal team delivery.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Treat `daily-assistant-private-agent-rework.md` and this revised requirements/design package as current. Older Daily Assistant built-in/default-featured statements are superseded.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-07 | Code | `autobyteus-web/components/agents/AgentList.vue` | Locate Agents page composition owner | Existing page owns featured split, search state, reload/detail/run/sync orchestration, and regular grid rendering. | Extend to consume grouped sections, not own raw grouping policy. |
| 2026-05-07 | Code | `autobyteus-web/stores/agentDefinitionStore.ts`; GraphQL agent definition query usage | Verify ownership data | Existing data includes ownership scope, team owner fields, application owner fields, and package context. | Use existing metadata; no backend schema change. |
| 2026-05-07 | Code | `autobyteus-web/components/agents/AgentCard.vue` | Check card reusability | Card already displays ownership badges/labels and emits actions. | Reuse in featured, grouped, and search views. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/agent-definition/default-agents/*` | Historical Daily/Super Assistant source | Earlier work had default assistant one-off seed/bootstrap; latest direction removes this from active server product code. | Do not keep active Daily Assistant bootstrap/template. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent*` | Historical Memory Compactor source | Memory Compactor was provisioned from compaction execution area, causing file placement drift. | Move provisioning to `src/built-in-agents`. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Inspect current WIP built-in registry | WIP registry includes both `daily-assistant` and `autobyteus-memory-compactor`. | Remove Daily Assistant row/constants/featured setting default; keep Memory Compactor. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | Inspect current WIP bootstrapper | Generic bootstrapper seeds registry entries, handles legacy directory migration, featured catalog defaults, and server setting defaults. | Simplify to no Daily Assistant featured/migration path unless unused generic types are deliberately retained for future built-ins. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/built-in-agents/templates/*` | Inspect current WIP templates | WIP templates include `daily-assistant` and `memory-compactor`. | Delete server Daily Assistant template; keep Memory Compactor template. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/agent-definition/file-agent-definition-provider.ts` and config path usage | Confirm package root loading | Normal loader reads `<appDataDir>/agents` plus `agents/` under roots configured by `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`. | Private agents repo can host Daily Assistant without server bootstrap. |
| 2026-05-07 | Code | `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/super-ai-assistant/` | Find current private assistant candidate | Existing private candidate has old-ish name `AutoByteus-Super Assistant` and general assistant content/config. | Rename/copy to `agents/daily-assistant/` and update formal name. |
| 2026-05-07 | User Feedback | Latest message: `remove daily assistant from the built in ... move it to still autobyteus-private-agents ... all the current changes we keep` | Resolve product direction | Keep grouping and built-in subsystem work; Daily Assistant becomes private/user-managed only. | Handoff to implementation engineer. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `/agents` page render in `AgentList.vue` and server startup in `server-runtime.ts`.
- Current execution flow: Frontend fetches agent definitions, splits configured featured items, then renders featured plus regular list/search. Server startup WIP calls `bootstrapBuiltInAgents()` to seed registry-defined templates into runtime agent storage and initialize settings.
- Ownership or boundary observations: Backend agent ownership classification is already authoritative. Frontend should own presentation grouping only. Built-in agent provisioning deserves a central server owner, but that owner should only handle platform infrastructure agents. Daily Assistant availability belongs to package-root/user configuration.
- Current behavior summary: Grouping work is aligned; WIP server built-ins need correction so only Memory Compactor is built-in.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + behavior change + refactor/cleanup.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Presentation gap; file-placement/responsibility drift; legacy/default-agent compatibility pressure.
- Refactor posture evidence summary: Needed now to prevent `AgentList.vue` grouping policy bloat and to remove scattered one-off built-in provisioning.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AgentList.vue` | Would otherwise own sorting/grouping/fallback labels inline. | Extract reusable grouping helper. | Implementation/tests. |
| `definitionOwnership.ts` / store normalization | Ownership normalization already exists. | Reuse/tighten instead of duplicating grouping labels. | Implementation/tests. |
| One-off Memory Compactor bootstrap path | Platform agent provisioning lived inside compaction runtime folder. | File placement drift; centralize built-in provisioning. | Keep built-in subsystem. |
| WIP built-in registry | Includes Daily Assistant as built-in/default featured. | Conflicts with latest user-managed featured-agent direction. | Remove Daily Assistant from registry/templates/tests/docs. |
| Private agents repo | Has existing general assistant candidate. | Correct home for Daily Assistant. | Add/rename `agents/daily-assistant`. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/agents/AgentList.vue` | Agents page composition | Owns page state and rendering | Consume grouped section model, keep handlers central. |
| `autobyteus-web/utils/catalog/agentDefinitionOriginGroups.ts` | Proposed/implemented grouping utility | Pure transformation point | Correct owner for section construction and deterministic ordering. |
| `autobyteus-web/utils/definitionOwnership.ts` | Ownership normalization/labels | Reusable ownership semantics | Shared utility should serve store, card, and grouping. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | WIP built-in registry | Currently lists Daily + Memory | Target should list Memory only in this ticket. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | WIP built-in provisioning owner | Good central owner, but contains Daily-specific featured/migration behavior through registry | Remove Daily behavior and keep Memory Compactor setting default. |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/` | WIP Memory Compactor template | Correct target home | Keep. |
| `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/` | WIP Daily Assistant template | Conflicts with latest direction | Remove from server. |
| `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/super-ai-assistant/` | Existing private general assistant | Candidate content for Daily Assistant | Rename/copy to `agents/daily-assistant/`. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-07 | Command | `git status --short` | Worktree has WIP frontend grouping, built-in subsystem, deleted old bootstrappers/templates, new tests/scripts/docs. | Implementation handoff should be delta on top of current WIP, not restart. |
| 2026-05-07 | Command | `sed -n ... built-in-agent-registry.ts` | Registry includes Daily Assistant row with featured setting default and legacy id migration. | Remove Daily from built-ins. |
| 2026-05-07 | Command | `find autobyteus-server-ts/src/built-in-agents/templates ...` | Templates include daily-assistant and memory-compactor. | Delete daily-assistant template; keep memory-compactor. |
| 2026-05-07 | Command | `sed -n ... /Users/normy/.../autobyteus-private-agents/agents/super-ai-assistant/agent.md` | Private candidate exists with old name. | Create/update private `agents/daily-assistant`. |

## External / Public Source Findings

No external/public sources were needed. This is an internal repository and product-direction change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Unit tests/smoke scripts are sufficient for design handoff; API/E2E validation owned downstream.
- Required config, feature flags, env vars, or accounts: `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-private-agents` is needed to load the private Daily Assistant package root.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: None beyond local inspection.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Backend ownership data is already sufficient for UI grouping.
- Featured catalog remains the right user-controlled authority for `Featured agents`.
- Built-in agent provisioning should be central, but its registry should represent platform infrastructure only.
- Memory Compactor is platform infrastructure; Daily Assistant is not.
- Private agent package roots are the correct mechanism for sharing user/private agent definitions outside server app-data seeding.

## Constraints / Dependencies / Compatibility Facts

- Runtime-loaded agent folders remain normal file-backed definitions under `<appDataDir>/agents` or configured package roots.
- Do not introduce frontend id/name hard-coding to force Daily Assistant into featured/grouped sections.
- Do not auto-migrate legacy Daily/Super Assistant settings in server bootstrapping now that Daily Assistant is not built-in.
- Delete active one-off bootstrappers/templates rather than preserving legacy compatibility wrappers.

## Open Unknowns / Risks

- Exact private Daily Assistant content should be selected by implementation from the current private candidate or another current private source if discovered.
- Existing deployments with old featured settings may need manual Settings cleanup; this is accepted because featured selection is user-managed.

## Notes For Architect Reviewer

This revision intentionally resolves the previous design-impact failure by making the canonical design body match the latest product direction. `Daily Assistant` is no longer a server built-in in the canonical design; `BuiltInAgentBootstrapper` remains only for platform infrastructure built-ins, currently `Memory Compactor`.
