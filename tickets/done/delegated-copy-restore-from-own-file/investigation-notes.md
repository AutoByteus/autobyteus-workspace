# Investigation Notes

## Investigation Meta

- Package identifier: `delegated-copy-restore-from-own-file` (Project Task `autobyteus-197`)
- Request / ticket: Delegated copies restore from their own run file; remove `taskAgent.origin` (data-model cleanup)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-restore-from-own-file`
- Repository mode: `Git`
- Task worktree / branch: the worktree above, branch `codex/delegated-copy-restore-from-own-file`
- Resolved base remote / branch / revision: `origin/personal` @ `f171032e88` (fetched 2026-10-19)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; ticket folder created
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate, 2026-10-19): `references/requirements-engineering.md`, `references/ticket-scope.md`; also `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `TESTING.md` (migrations rule, lines 170–177)
- Investigation status: requirements investigation complete; architecture investigation pending approval

## Initial Request And Clarifications

- Original request: Task autobyteus-197 from `/project_task_manager` (2026-10-19), raised by the user via the autobyteus-191 Solution Designer: "if [it's a] legacy problem we should fix this problem because the data model should be pure … We should have created a ticket to work on it, to clean it up immediately." Attached note: `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_811e39b2-e67c-41ab-a4f9-57ddc804215c/context/ctx_a1fa3e5a4578__follow-up-delegated-copy-restore-from-own-file.md`
- Clarifications received: none yet. The Task explicitly reserves confirmation of the behavior change for the user, and the real-data change needs his explicit approval and a backup.
- User-supplied facts and constraints: counts 24 `catalog` / 4 `configured_place` agent copies; migration must be registered (Data Migration Guideline); never run a migration on real user data in tests.
- Initial ambiguity: the Task names only agent copies; the same `origin` and merge exist for task agent **team** copies (found below).

## Product And Domain Understanding

- Product area: run history / delegation (task agents = "delegated copies") in Team, Org and Agent roots.
- Affected actors: the user (restores and edits stopped runs; reads copies' settings in the app); the server's restore/hosting path.
- Terminology: a **delegated copy** (task agent) is an agent or team started by `delegate_task`. A **configured place** (member slot) is a team member / org agent configured in the coordinating run; a copy delegated to that address is a "copy of a configured place". A **catalog copy** is delegated to a listed definition not configured in the run.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | Code | `autobyteus-server-ts/src/run-history/store/task-agent-own-records.ts` | Write/compose of own files | `taskAgentOwnMetadata` writes `origin: catalog` when `record.source`, else resolves the place and writes `configured_place` (launch only when first written; `existing` wins). `composeTaskAgentRecord` / `composeTaskTeamRecord` add `source` only for `catalog`. Same for team copies (`taskAgentTeamOwnTree`) | Design |
| 2026-10-19 | Code | `src/run-history/store/task-agent-own-file-schema.ts` | Reader | `origin` required and enum-checked; launch may be all-null unless `catalog` | Design |
| 2026-10-19 | Code | `src/run-history/store/agent-run-metadata-types.ts:37-55` | Types | `TaskAgentOrigin` doc: configured_place "follow later changes of that place" | Design |
| 2026-10-19 | Code | `src/run-history/store/task-execution-tree-split.ts` | Load/save | compose on load, split on save; a copy's own file written only when the candidate differs from the file on disk | Design |
| 2026-10-19 | Code | `src/run-history/domain/run-execution-tree-shared-records.ts:69-127` | In-memory model | `TaskAgentExecution.source?` / `TaskTeamExecution.source?`: "absent, the copy's source is the configured placement at its address" | Design |
| 2026-10-19 | Code | `agent-team-execution/task-delegation/team-task-source-resolver.ts`, `agent-org-execution/services/agent-org-task-source-resolver.ts`, `standalone-agent-run-root/services/standalone-root-task-source-resolver.ts` | Restore path | `resolve(address, recorded)`: recorded `source` first, else the configured node at the address (Team/Org); Agent root has no configured places | Design |
| 2026-10-19 | Code | `team-task-execution-adapter.ts:76-115, 216-230` | Activation and restore | activation resolves the slot node but records `source: null` for a configured place; restore calls `requireAgent(address, indexed.source.source)` → slot when absent | Design |
| 2026-10-19 | Code | `agent-collaboration/domain/delegated-launch-selection.ts:132-179` | Settings for copies | `current` launch of a copy computed from `readTaskSource(address, task.source)` → slot when absent | Design |
| 2026-10-19 | Code | `collaborator-source-projector.ts` (`memberFollowsTeam` rules), `run-execution-tree-shared-records.ts:160-176` | Team-level model selection reach | configured rule: member follows its team iff runtime+model+settings equal the team's; recorded rule: iff the member records no own launch | Requirement on preserving follower set |
| 2026-10-19 | Code | `run-history/services/team-run-execution-tree-location-service.ts:186`, `agent-org-execution-tree-location-service.ts:117`, `team-member-run-view-projection-service.ts:117-135`, `collaboration-execution-location-service.ts:50` | Run view / memory / skill-improvement targets | `configuredPlacement = index.getConfiguredPlacement(agent.address)` is also set for a **task copy** at a configured address; view metadata prefers it (even `platformAgentRunId` of the slot) | Design (display follows slot today) |
| 2026-10-19 | Code | `agent-collaboration/collaborators/mention-viewer.ts:57-75`, `agent-org-execution-index.ts:118-147` | Mentions / coordinator of team copies | source-less team copy yields no own-team definitions; coordinator falls back to configured slot | Design |
| 2026-10-19 | Code | `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts:22-36` | Display names | a copy "reads as display name" iff some task with `source` has the same first address segment — a source on a configured-place copy would rename the configured member too (the "change its display" of U-4) | Design (keep names) |
| 2026-10-19 | Code | `autobyteus-web/services/collaborators/agentSourceSelectors.ts:99-134`, `agentOrgExecution/agentOrgExecutionViewIndex.ts:136-155`, `utils/runSettings/delegatedLaunchRows.ts:220-236` | Displayed settings of copies | frontend picks the configured member at the address first, else a catalog task's source | Design (show own settings) |
| 2026-10-19 | Contract | `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts:138,159,218,231` | Stream DTO | `source` optional on task DTOs | Design |
| 2026-10-19 | Code | `app-data-migrations/migrations/task-agent-own-run-v1/coordinating-run-migration.ts:8,150-165` | Released migration | imports current `taskAgentOwnMetadata`, `taskAgentTeamOwnTree` → must be repointed to frozen copies before they change (guideline §4) | Design |
| 2026-10-19 | Doc | `tickets/done/delegated-copy-own-run-memory/design-spec.md:72` (U-4), `requirements-doc.md` DEC-015 / AC-024, `memory-layout-contract.md` §3.1, §6, S12 | Why legacy | U-4 kept "follow the place" under a no-behavior-change rule; withdrew the earlier §6 behavior change ("takes the place's values at upgrade") | Requirements |
| 2026-10-19 | Doc | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Migration policy | §3: removing an obsolete field needs no migration (ignored on read, dropped on next save); a change of meaning / new required fact only old data can supply justifies one; §9: synthesized fixtures only | Design |
| 2026-10-19 | Doc | `TESTING.md:170-177` | Test policy | never run a migration, startup or conversion on real user data **or a copy of it** | Requirement QR |
| 2026-10-19 | Data | `python3 -I /tmp/sd197/scan.py ~/.autobyteus/server-data/memory` (read-only) | Shape inventory | agent copies: 24 `catalog` (launch set), 4 `configured_place` (all launch fields null, none with a Settings edit); team copies: 80 `catalog`, **2 `configured_place`** | Requirements |
| 2026-10-19 | Data | `/tmp/sd197/slots.py` (read-only) | Places still exist? | all 6 configured places exist in their coordinating trees; the 4 agent slots carry a full `launchConfiguration` (plus an obsolete `skillAccessMode` key) | Migration source |
| 2026-10-19 | Data | `/tmp/sd197/teamcmp.py` (read-only) | Team copies vs slots | the 2 team copies' own trees already hold the team facts; default and member launches equal the slot's today; every member's launch equals the team default (so all members follow the team under the configured rule); own handoffs 2 (within the team) vs the org tree's 5 | Migration source |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Restore / wake of a delegated copy started from the catalog | Coordinating run loads → composes record with `source` from the copy's own file → restore uses `source` | Copy restores with the definition and launch it started with (+ its own Settings edit) | `task-agent-own-records.ts:104-123`; resolvers | High |
| BEH-002 | System | Restore / wake of a copy of a configured place (agent or team) | Compose yields record **without** `source` → resolver returns the configured slot node at the address | Copy restores with the slot's **current** definition and launch; own file's launch fields ignored | `task-agent-own-records.ts:113,238`; resolvers; adapter `:221,226` | High |
| BEH-003 | User | User edits a configured member's settings in a stopped Team/Org run | The slot changes in the coordinating tree | Copies already started from that slot change too on their next restore/display | BEH-002 path | High |
| BEH-004 | User | User opens a run; app shows a copy's settings (run view, Settings delegated rows, Org/Team context) | Server view and frontend pick the configured member at the copy's address first | Configured-place copies show the slot's current settings | location services, `agentSourceSelectors.ts`, `agentOrgExecutionViewIndex.ts`, `delegatedLaunchRows.ts` | High |
| BEH-005 | User | User delegates to a configured place | Activation resolves the slot's current settings; record written without `source`; own file gets `configured_place` + the started launch | New copy starts from slot's current settings | adapter `:76-115`; `taskAgentOwnMetadata` | High |
| BEH-006 | User | User changes a stopped copy's model in Settings | `userLaunchSelection` recorded beside the started launch; effective launch = selection over started | Works for both origins | `delegated-launch-selection.ts`; contract §3.1 | High |
| BEH-007 | User | Team-level model selection on a team copy | Reaches members that "follow the team" (configured rule for configured-place copies; recorded rule for catalog copies) | — | `memberFollowsTeam` | High |
| BEH-008 | User | Display names of copies and configured members | Catalog copies (and copies inside them) read as spaced display names; configured members and their copies read as address basenames | — | `teamExecutionTreeSelectors.ts:22-36` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `task-agent-own-records.ts` | Two-way merge: write branch on `record.source`, compose branch on `origin` | Remove both branches | Record must always carry `source` in memory? |
| `task-agent-own-file-schema.ts` | Requires `origin`; allows null launch for `configured_place` | Reader must ignore `origin`; launch required for every agent copy | Tolerant read per guideline §3 |
| Three task-source resolvers | Fallback to slot when `recorded` absent; also used on activation | Restore must never fall back; activation must still start from the slot | Split activation from restore? |
| Location / view services, mention viewer, org index | Treat a task copy at a configured address via the slot | Display must reflect the copy's own settings | Inventory of every "configured first, else source" site |
| Frontend selectors | Same "configured first" rule; display-name rule keyed on `source` presence | Settings shown = settings the copy runs with; names unchanged | New display-name criterion |
| Released migration `task-agent-own-run-v1` | Imports current own-record writers | Must keep released behavior | Frozen copies (guideline §4) |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `memory/agents/<id>/run_metadata.json` (agent copy own file, `taskAgent` section); `memory/agent_teams/<id>/team_run_execution_tree.json` (team copy own tree, `taskAgent` section); coordinating trees `team_run_execution_tree.json` / `agent_org_run_execution_tree.json` / standalone root tree (links + configured slots).
- Readers/writers: `task-agent-own-file-schema.ts`, `task-agent-team-tree-schema.ts`, `task-agent-own-files.ts`, `task-execution-tree-split.ts`; released migration `task-agent-own-run-v1`.
- Stream contract: `autobyteus-team-stream-contracts` task DTO `source?`.

### Structural Surfaces

- Restore/activation adapters for Team, Org, Agent roots; task-source resolvers; delegated-launch selection; location/view services; frontend context factories and selectors.

### Potential Structural Impacts To Investigate

- API or external-contract change: stream DTO `source` may become always present for copies (shape-compatible).
- Persistence schema change: `taskAgent.origin` removed; launch fields of agent copies required.
- Migration: one new registered migration for the 6 configured-place own files; released migration repointed.
- Security / concurrency: none found.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- |
| Read-only scan of the user's data (no writes) | Shape inventory | see Source Log rows "Data" | 6 files to convert (4 agent, 2 team); 104 already self-contained | `/tmp/sd197/*.py` (disposable probes, not promoted) |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via 191 SD, 2026-10-19) | "the data model should be pure"; clean legacy up now | Direct quote | Remove `origin`, the merge and the fallback | — |
| Task autobyteus-197 | Confirm the behavior change with the user; real data only with approval + backup | Task text | DEC-001, DEC-002 need the user | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Data Migration Guideline | `docs/design/data_migration_guideline.md` | tolerant read, exact write; migrate only for change of meaning / required fact; frozen copies; synthesized fixtures | read | none |
| TESTING.md | repo | no migration on real data or a copy | read | Task wording "a copy of realistic data" read as synthesized fixtures (DEC-009) |

## Persisted Data And State Facts

- Affected stored subject: own files of delegated copies (agent and team).
- Location and shape: see Payload surfaces.
- Volume (user's data, 2026-10-19): agent copies 28 (24 `catalog`, 4 `configured_place` with null launch); team copies 82 (80 `catalog`, 2 `configured_place` with full facts).
- Current readers and writers: see above; unknown fields ignored by these readers (tolerant).
- Must be preserved: every copy's identity, memory, link, delegator, Settings edit, and the settings it restores with today.
- Acceptable loss: the `origin` value itself (no remaining meaning).
- Constraints: user backup before upgrade; no migration on real data in tests.
- Remaining gap: none for requirements; the follower mapping for team members is an architecture detail (members' launch equal the default in all local data).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `.../context/ctx_a1fa3e5a4578__follow-up-delegated-copy-restore-from-own-file.md` | 191 Solution Designer | Original evidence note | Whole Task | all | Input (read-only) | N/A — input |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Some site reads "configured slot first" for a task copy and is missed | Copy would show slot settings while running with its own | Architecture inventory of every fallback site; tests per root | Open (design) |

## Architecture Investigation Findings

Authorities read for design (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (mandatory migration-conventions read), `autobyteus-server-ts/docs/design/collaboration_model.md`.

| Source / Command | Finding | Design use |
| --- | --- | --- |
| `agent-collaboration/collaborators/catalog-delegation.ts:16-77`; `team-recipient-resolver.ts:17-24`; `agent-org-recipient-resolver.ts:47-56` | in-run placements carry no `source` | D-1 |
| adapters: team `:76-115,216-230,273`; org `:104-113,261-293,346`; standalone `:111-117,267-278,338` | activation/restore through `sources.require*(address, recorded)` | D-2; resolvers removable |
| `delegated-launch-selection.ts:100-179` and 7 `readTaskSource` sites | same fallback for Settings | D-2 |
| `collaboration-execution-location-service.ts:50`; `team-run-execution-tree-location-service.ts:186`; `agent-org-execution-tree-location-service.ts:117`; `team-member-run-view-projection-service.ts:117-135` | `configuredPlacement` by address also for copies; view uses slot launch and slot `platformAgentRunId` | decide by `executionKind` |
| `agent-org-execution-index.ts:118-147`; `mention-viewer.ts:57-75` | task team copy coordinator/definitions fall back to slot / null | read `source` |
| `member-instance-scope.ts:40-95` | a team member's outgoing handoffs = host instance handoffs with `from` = member; agent copy at a root configured address gets root handoffs by address (rule 2) | D-4; rule 2 left alone |
| read-only: classroom org tree handoffs | 5 rules incl. `/StudentStudyGroup/student_one → /Teacher`; the team copy's own tree has 2 (inside only) | D-4; migration takes handoffs from the org tree |
| `task-execution-source-schema.ts:72-76` | team source rejects handoffs that leave the team | invariant → `from` ∈ members |
| read-only `/tmp/sd197/followers.py` | 331 configured team members in the user's orgs; all deep-equal to their team default | D-5 safe for all existing data |
| `collaborator-source-projector.ts:46-55`; grep | `memberFollowsTeam({kind:"configured"})` used only by the resolvers' fallback | removable |
| web `delegatedLaunchRows.ts:123-129,220-313`; `localization/messages/en/runSettings.ts:43` | "As configured in this run" shown when `source` absent | D-6 `launchSource.origin = "configured"` |
| web `teamExecutionTreeSelectors.ts:22-36` | display name keyed on `source` presence | D-7 configured-address rule |
| web grep (9 files) | configured-first sites: `agentSourceSelectors.ts`, `agentOrgExecutionViewIndex.ts`, `agentOrgExecutionContext.ts`, `agentRunCollaborationIndex.ts`, `teamExecutionContextFactory.ts`, `teamExecutionTreeSelectors.ts`, `agentOrgHistoryRows.ts`, `ExistingRunConfigEditor.vue`, `delegatedLaunchRows.ts` | removal list |
| `app-data-migrations/migrations/task-agent-own-run-v1/*` imports | current `taskAgentOwnMetadata`, `taskAgentTeamOwnTree`, `parseTaskAgentRunMetadata`, `validateTaskAgentTeamTreePayload`, `TaskAgentOwnFiles`; read-back via current stores tolerates unavailable copies | repoint to frozen copies |
| grep of all migrations for changed modules | only the above, plus type-only `LaunchConfigurationSource` in `collaborators-to-delegated-runs-v1/released-collaborator-entry-v1.ts` (superset; no behavior change) | repoint scope |
| `append-only-message-logs-v1-app-data-migration.ts:28-135` | predecessor gate pattern (convert now, non-terminal while a predecessor is pending) | migration gate |
| `app-data-migration-registry.ts`; latest id `20261019_remove_work_trace_exports` | registry order | register last |
| `skill-improvement-target-context-resolver.ts:70-95`; `collaboration-member-memory-targets.ts:64` | use the slot for a copy at a configured address; a slot's definition is fixed within a run | left alone; F-1 follow-up (launch) |
| definitions (registry `autobyteus-agents`, `autobyteus-private-agents`) | `prototype-bootstrapper` no longer exists; the others exist | migration does not need definitions |


## Requirement Implications

- Team copies carry the same `origin` and merge → included (DEC-003).
- All 6 configured places still exist; filling from them reproduces exactly what they restore with today, so the upgrade itself changes nothing visible; only later slot edits stop reaching existing copies.
- The display today also follows the slot (server views and frontend); "restores from its own file" is only coherent if the app also shows the copy's own settings.

## Notes For Architecture Design

- Map SCN-001..SCN-005 to: activation (record a snapshot), compose (always `source`), every resolver/view fallback site (server + web), released migration repoint, new migration.
- Verify: handoffs used by a configured-place team copy on restore (org-wide tree handoffs today vs the copy's own 2); team-member follower rule mapping; contract DTO change and contract `dist/` rebuild.

## Follow-up Evidence (2026-10-19, user conversation)

- The user doubted `/investigator` still exists. Read-only check of the registered agent packages (`~/.autobyteus/server-data/agent-packages/registry.json` → `autobyteus-agents`, `autobyteus-private-agents`): definitions exist for `article-reviewer`, `investigator` (evidence-driven-delivery-team), `vp-sales` (northstar revenue-org), and `student-study-group`; **`product-team/prototype-bootstrapper` no longer exists** (product-team now has `product-ui-ux-designer`, `ui-baseline-bootstrapper`).
- Implication: the migration does not need the definition. It completes the copy's own file from the slot recorded in the coordinating run's tree. A copy whose definition is gone keeps its history; whether it can start a runtime again is the same question as for any run whose definition was renamed or deleted (not this ticket).
- The user's direction on data: keep data and code clean; historic data that is not in the current shape is converted by one data migration (DEC-006 revised: remove `origin` from every own file).

## Review Evidence (ARCH-REV-001, 2026-10-19)

- AR-002: `/tmp/sd197/followers.py` compared exactly the 5 current launch keys (`runtimeKind`, `llmModelIdentifier`, `llmConfig`, `workspaceRootPath`, `autoExecuteTools`), never the raw objects. So "331 of 331 members equal to their team default" holds on the projection M4 now uses. The 2 configured-place team copies: their members and default are equal on the projection too (`teamcmp.py`; the raw slot objects additionally carry `skillAccessMode: "PRELOADED_ONLY"` on both sides).
- AR-001 confirmed: `autobyteus-web/utils/runSettings/memberOverrides.ts:45-66` lets a user give a configured team member its own auto-approve (or workspace) while keeping the team's model. Under today's configured rule such a member follows a team-level model selection; under D-5 (deep equality → omit) it would be recorded with its own launch and stop following.

## Implementation Evidence (DI-001, 2026-10-19)

- `implementation-design-impact-DI-001.md` (implementation engineer): four more released migrations pass pre-own-run trees into the current `TeamExecutionIndex`, `AgentOrgExecutionIndex`, `StandaloneRootExecutionIndex`, `validateTeamRunStatePackage`, `validateAgentOrgStatePackage` and `projectAgentOrgRunHistoryRow`: both `20260731` working-context snapshot migrations, `20260926_team_context_file_execution_locators_v1` and `20260905_agent_org_history_first_message_summary_v1`. With `source` required, 9 TS errors appear; runtime results are unchanged because the methods they call never read a copy's `source`.
- The earlier grep listed only imports of the record and own-file modules, not of modules whose parameter types depend on the record type. The legacy README already documents the current-index dependency as deliberate ("results unchanged by task-agent-own-run").
- Decision D-8 (design): a named legacy-owned bridge `asSourceIndependentIndexInput` instead of freezing about 914 lines.

## Shape Inventory Evidence (SR-006, 2026-10-19)

- Read-only `/tmp/sd197/shapes.py` over `~/.autobyteus/server-data/memory`. Counts per shape are in design-spec "Data Migration Guideline Checklist (§2) and Shape Inventory". 0 unreadable own files; every copy's coordinating run exists.
- Cost: 110 own files, 859,401 bytes in total, largest 14,793 bytes.
- `memory/imports/docker-node-1/` (Memory Sync mirror) holds 22 copies' own files (20 `catalog`, 2 `configured_place` agent copies with null launch). They are not converted by this node, as in the append-only-logs precedent: they are replaced when that node is updated and syncs again. Until then, the 2 mirrored configured-place copies are not shown.

## Mirror Evidence Correction (SR-007, ARCH-REV-005 AR-006, 2026-10-19)

- Read-only split of `memory/imports/docker-node-1/` copies' own files: agent `catalog` with launch 9; agent `configured_place` with null launch 2; team `catalog` in the released member shape 11 (no mirrored configured-place team copies). The mirror holds 76 agent and 99 team run folders in total.
- Imported sources are read with the same current readers (`memory-explorer.ts:39-119`, via the reviewer). After D-5, the 11 mirrored team copies fail the team-tree validator and the 2 null-launch agent copies fail the agent reader, so 13 are not shown until `docker-node-1` updates and syncs. The 9 catalog agent copies stay readable.
