# Investigation Notes

## Investigation Meta

- Package identifier: `collaboration-model-contract`
- Request / ticket: Project Task `project_task_259ddae7-36ec-4c26-81f4-40c08ee1b601` "Make collaboration follow one simple model (delegate outside, message inside)", from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-15
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract`
- Repository mode: `Git`
- Task worktree / branch: same path / `codex/collaboration-model-contract`
- Resolved base remote / branch / revision: `origin` / `personal` / `35eacddb2591387d044b7d17e245b73acf60c4ed` (fetched 2026-10-15); fast-forwarded to `8878625d94` on 2026-10-15 after Task ee74d72b (`task-tool-split`) landed (same llm-contract file; see `related-task-tool-split-receipt.md`)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: fetch + `git worktree add -b codex/collaboration-model-contract … origin/personal` succeeded.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-003`
- Authorities read: `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, templates (all 2026-10-15, this conversation).
- Investigation status: requirements-phase investigation complete; architecture investigation pending.

## Initial Request And Clarifications

- Original request: see `requirements-doc.md` Problem; Task text attached by the PM (`new-task-proposal.md` in this folder).
- Clarifications from the user (2026-10-15, Solution Designer conversation, before and after the Task was created):
  - Inside your run you message; outside you `delegate_task` first, then message the copy by run ID. You cannot delegate to a teammate: "you already have one instance … why do you delegate to your teammates?"
  - An Org is a container of independent units; a Project Task Manager in an Org delegates to the Org's teams ("that's why earlier I designed like an agent organization").
  - Collaborators make the model too complicated; "why not always delegate … then send message to". Fix the collaborator thing first, before the memory refactor.
  - Temp Tasks are removed in a separate Task (`project_task_ee74d72b-3733-4383-9e5d-20372867e06a`); not in this ticket.
  - Write one global collaboration model document and consolidate docs in this ticket.

## Product And Domain Understanding

- Product area: agent collaboration contract (tools `send_message_to`, `delegate_task`), collaboration roots (Agent/Team/Org), Project Task ownership of copies, documentation.
- Terms: see `collaboration_model.draft.md` §1 (run, unit, standing instance, collaborator, delegated run, coordinating run).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-15 | Code | `autobyteus-server-ts/src/agent-collaboration/collaborators/catalog-delegation.ts#resolveDelegationPlacement` | Shared delegation resolution (all 3 roots) | Order: (1) teammate inside the sender's own catalog Team copy from its snapshot, (2) in-run placement (configured, then collaborator), (3) catalog. No teammate refusal | Central place for CM-1 refusal |
| 2026-10-15 | Code | `src/agent-team-execution/domain/root-team-run.ts:325-336`; `src/agent-org-execution/services/agent-org-run-message-delivery.ts:107`; `src/standalone-agent-run-root/services/standalone-root-message-delivery.ts:143` | Existing refusals | Only self (own logical placement) refused: `COLLABORATION_SELF_TARGET_REJECTED` | Extend to teammates/own team |
| 2026-10-15 | Code | `src/agent-collaboration/execution/task/task-copy-host.ts#resolveTaskCopyHost` | Copy hosting | A copy whose address's parent is one of the delegator's containing Team instances is hosted inside that instance ("teammate copy"); else at the root | After CM-1, new copies never host inside a Team instance |
| 2026-10-15 | Code | `src/agent-collaboration/collaborators/message-recipient-resolution.ts#resolveMessageRecipient` | `send_message_to(address)` | (1) own Team instances (no fall-through), (2) Task-owned sender's open helper at the address, (3) run-wide placement (configured, collaborator, collaborator-Team member), (4) Task-owned sender: new helper copy (`broughtIn`); unowned sender: catalog bring-in → collaborator | Steps 2 and 4 removed |
| 2026-10-15 | Code | `src/agent-collaboration/collaborators/task-scoped-message-recipient.ts`; `root-task-execution-lifecycle.ts:245-265` (`ensureTaskHelper`, `helperPlacement`) | Helper copies | Helper copy = Task-owned copy started by a message, recorded `role: "broughtIn"` | Remove |
| 2026-10-15 | Code | `src/agent-collaboration/collaborators/` (17 files, 2120 lines) | Collaborator subsystem | Mixed: catalog address map, candidate policy, launch resolver, source projector also serve catalog delegation, `@` and `list_available_agents`; admission/entry builder/queue/root port bring-in serve collaborator instances only | Split keep/remove in design |
| 2026-10-15 | Code | `rg -l collaborator` | Surface size | 127 server files, 132 web files mention "collaborator" (includes catalog/candidate naming) | Large removal surface |
| 2026-10-15 | Code | `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:25,43,117`; `src/agent-execution/prompt/standalone-collaboration-instruction.ts`; `src/agent-tools/task-delegation/task-delegation-tool-contract.ts` | Agent-facing text | Text says a teammate address reaches the teammate; nothing forbids delegating to teammates; `send_message_to` says an available agent "is brought in on first use" | Rewrite texts |
| 2026-10-15 | Doc | `docs/modules/agent_communication.md` §Communication Versus Task Execution, §Collaborators; `agent_team_execution.md` §Server-Owned Task Delegation, §Collaborators In A Team Root; `agent_orgs.md` §Delegated Children; `standalone_agent_run_root.md`; `projects.md` | Current documented model | Model spread across 5 docs; teammate copies and collaborators documented as normal | Consolidate around one canonical doc |
| 2026-10-15 | Data | **Corrected SR-003** (review ARCH-F-001): the first scan read only a top-level `collaborators` key and missed Team trees' `rootTeam.collaborators`. Rescan (`python3` over `rootTeam`/`rootOrg`/top level; `grep -c '"addedViaAgentRunId"'`): **9 collaborators in 7 trees** — Agent roots 2 (below); Team roots 7: `software_engineering_team_095d04b9…` Agent `/product_prototyper`; `…38869492…` Team `/product_team` (never started, no memory folder); `…6ea9613b…` Team `/product_team`; `…a853e0d4…` Team `/product_team` + Agent `/agent_package_creator`; `…eeb082dd…` Agents `/agent_package_creator`, `/tutorial_video_producer`; all added 2026-10-02..06, none with task executions; memory folders at `agent_teams/<root>/<runId>` (= root-level copy location). Org roots 0. No stored copy without `source` sits at a collaborator address. Original row: | Existing data | Collaborators: 2, both Team collaborators in Agent roots: `agents/agent_package_creator_9e64…` → `/software_engineering_team` (`software_engineering_team_a0e61fb7…`, added 2026-10-06, 2.9 MB, 0 task executions), `agents/project_task_manager_a5f6…` → `/product_team` (`product_team_d02863a9…`, added 2026-10-13, 0.8 MB, 0 task executions); both host runs unarchived | DEC-005 |
| 2026-10-15 | Data | same scan | Teammate copies | 4: Team roots `evidence_driven_delivery_team_b5370996…` → `/investigator` (2026-08-26) and `article_writing_team_f87bc1d1…` → `/article_reviewer` (2026-09-26), both recorded at the root (Team-root members have no containing instance); Org roots `autobyteus_org_3aba3ef7…` (archived) → `/product_team/prototype_bootstrapper` and `northstar_operating_company_37001403…` (test Org, 2026-06-21) → `/revenue_org/vp_sales`, both hosted inside a mounted Team instance | DEC-006 |
| 2026-10-15 | Data | `projects/**/agent_run_resources.json` role counts | Helper copies | roles: assigned 76, delegated 5, broughtIn 2 (both in Task `project_task_b2b0538a…`, both closed 2026-10-09 / 2026-10-11) | DEC-007 |
| 2026-10-15 | Git | `git show a2a7b37bc1` | Temp Tasks origin | Ticket `mention-delegation-dismissal` (2026-10-06) made `@` steer to `delegate_task` and created temp Tasks; collaborators are no longer added on `@` since then | Temp Task removal is Task ee74d72b |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path / Lifecycle | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | `delegate_task` to own address | root delegation entry | refused `COLLABORATION_SELF_TARGET_REJECTED` | root-team-run.ts:330 | High |
| BEH-002 | System | `delegate_task` to a teammate address | `resolveDelegationPlacement` → configured/teammate → `resolveTaskCopyHost` | extra copy of the teammate (root-level in Team roots; inside the instance in Team copies, collaborator Teams, Org mounted Teams) | data: 4 teammate copies | High |
| BEH-003 | System | `delegate_task` to own Team instance address (member of a Team copy or Org mounted Team) | in-run or catalog placement | copy of the own Team | code reading | Medium |
| BEH-004 | System | `delegate_task` to an independent unit (catalog, Org sibling, in-run placement outside own Team) | same | copy started at the root | real data (75 copies) | High |
| BEH-005 | System | `send_message_to(address)` of a standing instance | `resolveMessageRecipient` steps 1, 3 | delivered | docs | High |
| BEH-006 | System | `send_message_to(catalog address)` from an unowned sender | step 4 bring-in | collaborator added to the run (tree `collaborators[]`, `collaborator_added` event, hosted standing instance) | 2 in data | High |
| BEH-007 | System | `send_message_to(catalog address)` from a Task-owned sender | steps 2/4 | Task helper copy (`broughtIn`), reused for later messages to the address | 2 in data | High |
| BEH-008 | System | `delegate_task` to a collaborator address | in-run placement | extra copy of the collaborator | docs | High |
| BEH-009 | User | `@X` | mention resolution, note steers to `delegate_task` | nothing added; note marks entries "already in this run" (incl. collaborators) | agent_communication.md | High |
| BEH-010 | User | stored run with collaborators | restore re-hosts collaborators; UI shows collaborator rows; Settings launch selection for collaborator Teams | collaborator reachable by address and run ID | docs | High |
| BEH-011 | Agent | prompts/tool descriptions | shared renderer | no teammate-delegation prohibition; "brought in on first use" | llm contract | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `catalog-delegation.ts` | shared delegation resolution | one place for CM-1 | how each root reports the sender's own Team (Team root: root-level members are one Team) |
| `message-recipient-resolution.ts` | shared message resolution | remove steps 2, 4 | not-found guidance text |
| collaborator admission/entry/queue/root port, registries (`team-root-collaborator-agent-registry.ts`, `collaborator-team-execution-registry.ts`, `RootAgentExecutionRegistry.prepareConfigured` collaborator use, `RootTeamExecutionDirectory.prepareConfigured` collaborator use), `*-collaborators.ts` per root, tree `collaborators[]`, indexes' collaborator visitors, `collaborator_added` events, web collaborator rows | collaborator instances | remove | what remains of catalog/candidate code (used by delegation, `@`, `list_available_agents`) |
| `projects` `broughtIn` role | helper copies | stop creating; keep records readable | normalize role or keep as history value |
| trees with `collaborators[]` | stored runs | data decision | conversion vs. history |

## Structural And Payload Surface Inventory

- Payload: canonical doc (new), module docs, `DESIGN.md`, agent-facing texts.
- Structural: delegation resolution (3 roots), message resolution, collaborator runtime hosting (3 roots), tree schemas (`collaborators` field), stream events, GraphQL collaboration snapshots, web stores/components, Task resource roles, migration of trees with collaborators.
- Potential impacts: API/stream contract (collaborator events/fields removed), persistence (tree field removal + conversion), ownership (no in-run outside instances).

## Persisted Data And State Facts

- Trees with `collaborators`: 7 local holding 9 entries (see corrected Source Log row); none has task executions under it. Their members' memory lives at `agents/<host>/collaboration/<collaboratorTeamRunId>/<member>/` — the same physical place a root-level Team copy uses today.
- Teammate copies: 4 local (2 root-level, 2 hosted inside Org mounted Teams).
- Task resources with `broughtIn`: 2 local, both closed.
- Must preserve: every conversation, file, message and Task record; stored runs reopen.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution / Owner | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | Overlap with Task ee74d72b (temp Task removal) and 17bfe0fe in the same files | rebase order; PM coordinates | Open |
| RSK-002 | Risk | Agents mid-conversation that used a collaborator by address get "not found" after upgrade | guidance text names `delegate_task` and the run ID route | Open (design) |
| UNK-001 | Unknown | Exact keep/remove split of the collaborator folder | architecture | Open |

## Architecture Investigation Findings

| Source | Path | Finding | Design Implication |
| --- | --- | --- | --- |
| Code | `team-execution-index.ts:149` (`teamInstancesOf` filters address `/`), `agent-org-execution-index.ts:117`, `standalone-root-execution-index.ts:127` | own-Team instances available per index; the Team root's root Team is excluded | add `isOwnTeamAddress` per index; Team index treats configured root-Team placements as teammates for configured root members |
| Code | `team-recipient-resolver.ts#resolveInRunDelegationPlacement`; org/standalone recipient resolvers | in-run delegation placement = configured, then collaborator | remove collaborator branch |
| Code | `standalone-root-collaborators.ts`, `team-run-collaborators.ts`, `agent-org-run-collaborators.ts` | API: `resolveMentions`, `bringInAt`, `listAvailable`, `catalogTaskSource`, `port`, `restore` | keep read-only/catalog parts; remove `bringInAt`, `restore`, entry writing |
| Code | `run-execution-tree-shared-records.ts` (collaborator entry vs task execution types) | every collaborator field has a task-execution counterpart (`addedViaAgentRunId`→`delegatorAgentRunId`, `addedAt`→`startedAt`, snapshot→`source`, user launch selections same names) | lossless conversion |
| Code | tree schemas: Agent root top-level `collaborators`, `rootTeam.collaborators` (`team-run-execution-tree-schema.ts:64`), `rootOrg.collaborators` (`agent-org-run-execution-tree-schema.ts:63`) | three locations | migration handles three families |
| Code | `autobyteus-collaboration-stream-contracts/src/agent-run-collaboration-dtos.ts:33,62`, `agent-org-execution-dtos.ts:266,302`, `root-execution-view-dtos.ts:90-112` | DTO `collaborators` fields and `collaborator_added` events | remove |
| Code | `rg -l -i collaborator autobyteus-web` (production files) | ≈60 files; many are `@` candidate UI (kept) | remove instance handling only |
| Code | `server-runtime.ts:178` | migrations before server build | `STARTUP_ONLY` safe |

## Notes For Architecture Design

- One shared refusal in `resolveDelegationPlacement` vs per-root checks.
- Team-root rule: a root-level configured member's own Team is the root Team.
- Conversion of collaborator entries to task-execution records (if DEC-005 (a)) is tree-only (memory already at the root-level copy location).
- Keep-or-remove of team-hosted copy hosting after CM-1 (existing 2 Org teammate copies).
