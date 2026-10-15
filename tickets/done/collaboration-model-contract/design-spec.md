# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` at `SR-003` (SR-001 approved by the user on 2026-10-15 — DEC-005 (a), DEC-006 (a); SR-003 corrections approved by the Solution Designer within the direction, user informed).
- Behavior-defining supplements: the published model document `autobyteus-server-ts/docs/design/collaboration_model.md` (written in this worktree as part of the design; it realizes REQ-007 and states the rules REQ-001..REQ-004 enforce).
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (2026-10-15).
- Conflicts or discrepancies: None.
- Base: `origin/personal` `8878625d94` (includes Task ee74d72b, tool split).

## Current-State Read

- **Delegation** (all three roots) resolves through the shared `resolveDelegationPlacement` (`agent-collaboration/collaborators/catalog-delegation.ts`): (1) a teammate inside the sender's own catalog Team copy from its snapshot, (2) the root's in-run placement (configured, then collaborator), (3) catalog. Only self-delegation is refused, separately in each root (`root-team-run.ts:330`, `agent-org-run-message-delivery.ts:107`, `standalone-root-message-delivery.ts:143`). A teammate target is hosted inside the delegator's Team instance by `resolveTaskCopyHost` (`task-copy-host.ts`).
- **Messaging** resolves through the shared `resolveMessageRecipient` (`message-recipient-resolution.ts`): (1) own Team instances, no fall-through; (2) Task-owned sender's helper; (3) run-wide placement (configured, collaborator, collaborator-Team member); (4) Task-owned sender: new helper copy (`broughtIn`, via `task-scoped-message-recipient.ts` → `RootTaskExecutionLifecycle.ensureTaskHelper`), otherwise catalog bring-in → collaborator (`*Collaborators.bringInAt` → `CollaboratorAdmission.ensure`).
- **Collaborator instances** are recorded in each tree's `collaborators[]` (Agent root top level, `rootTeam.collaborators`, `rootOrg.collaborators`), indexed by each execution index (`collaborator`, `collaborator_team_member` kinds), hosted by `TeamRootCollaboratorAgentRegistry`, `CollaboratorTeamExecutionRegistry`, `RootAgentExecutionRegistry.prepareConfigured`, `RootTeamExecutionDirectory.prepareConfigured`, `collaborator-handle-preparation.ts`, `team-root-collaborator-hosting.ts`; restored by each root's `*Collaborators.restore`; published with `collaborator_added` events and snapshot fields (`autobyteus-collaboration-stream-contracts`); shown and configured by the web (collaborator rows, Settings launch selection).
- **Shared catalog machinery** also serves delegation, `@` and `list_available_agents` and stays: `CatalogAddressMap`, `CollaboratorCandidatePolicy` (eligibility), `collaborator-launch-resolver.ts`, `collaborator-source-projector.ts`, `collaborator-definition-catalog.ts`, `CollaboratorAdmission.resolveMentions` (read-only), `*Collaborators.catalogTaskSource`/`listAvailable`.
- **Data**: 9 collaborators in 7 trees (2 Team collaborators in Agent roots; 4 Agent and 3 Team collaborators at the root of 5 Team roots; 0 in Org roots); 4 teammate copies (2 root-level in Team roots, 2 Team-hosted in Org roots); 2 closed `broughtIn` Task records. Released code also records copies **without** `source` at a collaborator's address (their source is read from the collaborator: `task-execution-source-schema.ts:20-23`, `standalone-root-task-source-resolver.ts`, `standalone-root-location-service.ts:177`, Team/Org `instanceCoordinatorAddress`); none locally.
- **Texts**: `agent-team-collaboration-llm-contract.ts` (`send_message_to` "brought in on first use", `delegate_task` "a collaborator"), standalone instruction, `@` note presence wording ("a configured member or a collaborator").

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large` — removes a runtime concept across the server's three roots, shared resolution, hosting registries, tree schemas, stream contracts, GraphQL and the web (≈110 server and ≈60 web production files mention collaborators, many of which only keep catalog naming), plus a startup migration and the canonical documentation.
- Architectural risk: `High` — shared contract changes (tree schemas, stream DTOs, tool behavior), a persisted-data migration, removal of hosting paths, and multi-root resolution changes.
- Escalation trigger: conversion cannot keep a collaborator's memory location (would require moving files), or any surface needs collaborator-specific behavior after conversion.

## Architecture Investigation Evidence

See investigation notes Source Log and Architecture Investigation Findings. Key decisions supported:

| Evidence | Decision |
| --- | --- |
| `resolveDelegationPlacement` and `resolveMessageRecipient` are shared by all roots | one refusal rule and one not-found rule, each in its shared owner |
| `teamInstancesOf` excludes the root Team (`team-execution-index.ts:149`) | a Team root needs an explicit "configured root member" teammate rule |
| collaborator memory = root-level copy memory location in every family (physical scope `(root, [])` for Agents, `(root, [teamRunId])` for Teams) | conversion is tree-only |
| collaborator entries carry every field a catalog copy record needs (`run-execution-tree-shared-records.ts`) | lossless field mapping |
| migration runner runs before server build; non-terminal migrations retry next start | startup migration, `STARTUP_ONLY` |

## Intended Change

Enforce the two-relationship model: refuse delegation inside your own Team; make `send_message_to` resolve only standing instances; remove collaborator instances and Task helper copies from the runtime, contracts and UI; convert stored collaborators into delegated runs with a startup migration; publish the canonical model document and point the docs to it.

## Change Scope (Mandatory)

- In scope: UC-001..UC-006. Areas: shared delegation and message resolution; per-root delegation/message delivery; collaborator admission, hosting, restore and indexing; tree schemas and mutators; stream DTO contracts and GraphQL; web collaborator instance handling; agent texts; Task helper path; startup migration; docs.
- Deliberately left alone: catalog delegation machinery and its "collaborator" naming (Non-goal); `@` mention resolution (read-only, steers to `delegate_task`); `list_available_agents`; temp Tasks and task tools; storage location of delegated runs and messages (Task 8641c0ac); restore of existing teammate copies hosted inside Team instances (DEC-006 (a)).
- Follow-ups: FU-1 rename the remaining catalog-only "collaborator" names (candidate policy, launch resolver, `AvailableCollaborator`, mention-note symbols) to catalog/candidate names, purely cosmetic; FU-2 Task 8641c0ac resumes on this base.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001..BEH-003 | System | REQ-001; AC-001..AC-003 | `delegate_task(address)` | refuse self, teammate, own Team (shared rule) | DS-001 |
| BEH-004 | System | REQ-002; AC-004 | `delegate_task(address)` | unchanged for independent units; always root-hosted | DS-001 |
| BEH-005..BEH-007 | System | REQ-003; AC-005, AC-006 | `send_message_to(address)` | standing instances only; not found + guidance | DS-002 |
| BEH-009 | User | AC-010 | `@X` | no collaborator presence | DS-002 |
| BEH-010 | Operational | REQ-004, REQ-005; AC-007 | startup | collaborators converted to delegated runs | DS-003 |
| BEH-011 | Agent | REQ-006; AC-008 | prompt/tool build | texts state the model | DS-004 |
| BEH-012 | Contract | REQ-007; AC-009 | docs | canonical document published | — |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship | Status |
| --- | --- | --- |
| `autobyteus-server-ts/docs/design/collaboration_model.md` (worktree) | the published contract (REQ-007) | Final; ships with this change |
| `collaboration_model.draft.md`, `doc-consolidation.draft.patch` | superseded drafts | Superseded |
| `related-task-tool-split-receipt.md` | base update evidence | Final |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` + `Refactor` (removal).
- Current design issue found: `Yes`.
- Structural triggers: *duplicated policy* — self-delegation refusal repeated in three roots; *empty/accidental capability* — `send_message_to` both delivers and creates runs (two subjects behind one operation); *legacy pressure* — collaborator instances overlap delegated runs (two representations of "an outside unit in this run").
- Root cause: `Boundary Or Ownership Issue` (messaging owns run creation) plus `Duplicated Policy`.
- Refactor needed now: `Yes`.
- Design response: one own-Team refusal in `resolveDelegationPlacement`; `resolveMessageRecipient` reduced to resolution only; collaborator instance concept removed end to end; stored collaborators converted.
- Deferrals: FU-1 naming cleanup (cosmetic).

## Terminology

- Own Team of a sender: every address inside a Team instance containing it (`teamInstancesOf`), at any depth, including the instance's own address — exactly what `send_message_to` resolves within that instance; plus, in a Team root, every configured placement of the root Team (any depth) when the sender is a configured member of it (DEC-008).
- Standing instance: see the model document §1.

## Legacy Removal Policy (Mandatory)

- Obsolete: collaborator instances (tree field, index kinds, hosting registries, restore, admission `ensure`, bring-in, events, DTO fields, UI rows and Settings entries, memory-explorer kind mapping); Task helper copies (`ensureTaskHelper`, `helperPlacement`, `task-scoped-message-recipient.ts`, resolution steps 2 and 4); delegation step 1 (teammate from own catalog Team copy snapshot); per-root self-delegation checks (moved to the shared rule); creation of copies hosted inside a Team instance (`resolveTaskCopyHost` team branch) — new copies are always root-hosted.
- Compatibility kept: `None` as runtime compatibility. Retained on purpose by user decision (DEC-006 (a)): restore of existing teammate copies hosted inside a Team instance, which reads their recorded host (current data, not an old-shape reader).

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Subject: execution trees with a non-empty `collaborators` array — Agent root `collaboration_tree.json` (top level), Team root `team_run_execution_tree.json` (`rootTeam.collaborators`), Org root `agent_org_run_execution_tree.json` (`rootOrg.collaborators`). Locally 2 (Agent roots).
- Change: the current schema no longer has `collaborators`; a collaborator becomes a root-level task execution (DEC-005 (a)).
- Readers/writers: trees are read tolerantly and written exactly; after this change an unconverted tree's `collaborators` would be ignored, making those instances invisible (not deleted).
- Decision: `Migration Required` — the conversion is a change of meaning that only the old data can supply (the user chose to keep collaborators as delegated runs); a tolerant reader would hide them.
- Teammate copies: `Directly Usable — No Migration` (current task-execution records).
- `broughtIn` Task records: `Directly Usable — No Migration`: the Task resource schema keeps accepting the stored role value as a closed historical role; no runtime path creates or looks up `broughtIn` any more (DEC-007). Both local records are closed.
- Communication messages, context-file owners, token records: unchanged — run IDs and physical locations are unchanged by the conversion.

### Migration Plan

- Target: no `collaborators` field; each former entry is a task execution in the root-level `taskExecutions` list of the same tree.
- Source: the released current tree shapes containing `collaborators` (Agent root tree, Team tree V3, Org tree V2).
- Owner: `src/app-data-migrations/migrations/collaborators-to-delegated-runs-v1/` — `CollaboratorsToDelegatedRunsV1AppDataMigration` (id `20261015_collaborators_to_delegated_runs_v1`), registered last, `requiredOnStartup: true`, `executionPolicy: "STARTUP_ONLY"`.
- Frozen source knowledge: `released-collaborator-entry-v1.ts` (+ schema) — a migration-owned strict copy of today's `CollaboratorAgentEntry` / `CollaboratorTeamEntry` / `CollaboratorTeamMember` shapes and their validator, taken from `run-execution-tree-shared-records.ts` and `run-execution-tree-shared-record-schemas.ts` before they are removed. The migration edits the tree JSON structurally: it validates only the `collaborators` array with the frozen schema and treats the rest of the document as opaque.
- Sourceless copies at collaborator addresses (ARCH-F-002): before removing `collaborators`, every task execution in the tree (any depth, including those under a collaborator Team entry) that has no `source` and whose address equals a collaborator's address, or a member address of a collaborator Team, gets `source` stamped from that collaborator's snapshot (the frozen projection of today's `collaborator-source-projector.ts` rules: Agent entry → `{kind: "agent", agentDefinitionId, launchConfiguration, launchSource?}`; Team entry → the Team source below; Team member → `{kind: "agent", agentDefinitionId, launchConfiguration: member's own or the Team default, launchSource?}`). After this change an absent `source` means "configured placement only"; the runtime source resolvers lose their collaborator fallback.
- Mapping (lossless):
  - Agent entry → `{address, agentRunId, platformAgentRunId, delegatorAgentRunId: addedViaAgentRunId, startedAt: addedAt, source: {kind: "agent", agentDefinitionId, launchConfiguration, launchSource?}, userLaunchSelection?}`.
  - Team entry → `{address, teamRunId, members: members.map(m => ({address, agentRunId, platformAgentRunId, userLaunchSelection?})), taskExecutions, delegatorAgentRunId: addedViaAgentRunId, startedAt: addedAt, source: {kind: "agent_team", teamDefinitionId, coordinatorAddress, members: members.map(m => ({address, agentDefinitionId, launchConfiguration?, launchSource?})), handoffs, defaultLaunchConfiguration, defaultLaunchSource?}, userTeamLaunchSelection?}`.
  - Converted entries are appended to the root-level `taskExecutions` in `addedAt` order; the `collaborators` key is removed.
- Ownership: converted runs belong to no Task (unowned delegated runs, an existing supported state; the model document's CM-6 status notes this exception); no Task record is created.
- Physical storage: none moves (collaborator memory already sits where a root-level copy's memory sits in each family).
- Commit: atomic replacement of the one tree file through the existing run-package atomic writer, then a re-read with the **current** tree reader, which must validate (every run ID in the tree and in the messages file still resolves).
- Retry/idempotency: a tree without `collaborators` (or with an empty array) is already current; conversion is a pure function of the file; re-running after an interrupted write sees either the old file or the new one.
- Dispositions: `MIGRATED`; `SKIPPED_ALREADY_CURRENT`; `PRESERVED_TREE_UNREADABLE_WARNING` (missing or unparseable tree; untouched; warning success); `FAILED_INVALID_COLLABORATOR` (entry fails the frozen schema; tree untouched); `FAILED_CONVERTED_TREE_INVALID` (current reader rejects the result; original kept); `FAILED_OPERATION` (IO). Any failure → `FAILED` (startup continues; retried next start); warnings only → `SUCCEEDED_WITH_WARNINGS`.
- Availability: no lockout of the application or of other runs. A tree whose conversion failed keeps its file unchanged; that one run may be unavailable until a later successful attempt (state-package validation requires every message endpoint to be in the tree, `team-run-state-package-validator.ts:23-25`). Not a supported-scenario path under the guideline's operating assumptions; no extra machinery.
- Cost: one read/parse/write per tree that has collaborators (7 locally); trees without the key are read once and skipped.
- Imported Memory Sync corpora are not touched (read-only).

| Step | Source | Target | Owner | Validation | Failure |
| --- | --- | --- | --- | --- | --- |
| Enumerate | three family roots | candidate tree files | migration | — | unreadable → warning |
| Convert | tree JSON with `collaborators` | tree JSON without it, entries appended to root `taskExecutions` | migration (frozen entry schema) | frozen schema; current reader on the result | failed dispositions, file untouched |
| Write | — | tree file | atomic writer | re-read with current reader | `FAILED_OPERATION` |

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001..004 | `delegate_task(address)` tool | copy started or refusal | root delivery → `resolveDelegationPlacement` | one refusal rule |
| DS-002 | Primary | BEH-005..009 | `send_message_to(address)` | delivery or not found | root delivery → `resolveMessageRecipient` | messaging never creates |
| DS-003 | Primary | BEH-010 | startup | converted trees | migration | data continuity |
| DS-004 | Primary | BEH-011 | prompt/tool build | agent texts | llm contract | agents follow texts |

## Primary Execution Spine(s)

- DS-001: `delegate_task tool -> root.delegateToNewCopy (gate) -> root delivery.resolveDelegationPlacement -> shared resolveDelegationPlacement: [own-Team check via index port] -> in-run placement (configured) -> catalog source -> RootTaskExecutionLifecycle -> adapter (root-hosted copy)`
- DS-002: `send_message_to tool -> root delivery.deliverToAddress -> shared resolveMessageRecipient: own Team instances -> run-wide standing placement -> else COLLABORATION_TARGET_NOT_FOUND with delegate guidance -> RootCommunicationEngine.deliver`
- DS-003: `server-runtime -> AppDataMigrationRunner.runPending -> CollaboratorsToDelegatedRunsV1 -> per tree convert/validate/write -> RootRunPackageReadinessIndex.rebuild`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The shared function first asks the index whether the target is in the sender's own Team (`isOwnTeamAddress`); if so it throws `COLLABORATION_SELF_TARGET_REJECTED` with the `send_message_to` guidance. Otherwise configured placement, then catalog. The copy is always hosted at the root (the team-host branch is unreachable after the check and is removed). | `catalog-delegation.ts` |
| DS-002 | Resolution keeps own-instance-first with no fall-through, then run-wide standing placements (configured placements; the host for Agent roots), then not found. No helper, no bring-in, no catalog lookup. | `message-recipient-resolution.ts` |
| DS-003 | See Migration Plan. | migration |
| DS-004 | Texts say: message inside your run; delegate outside and then message by run ID; never delegate to yourself, a teammate or your own Team; messaging never brings anyone in. | llm contract |

## Spine Actors / Main-Line Nodes

Root delivery services (`team-run-message-delivery.ts`, `agent-org-run-message-delivery.ts`, `standalone-root-message-delivery.ts`, recipient resolvers), shared resolution functions, execution indexes, `RootTaskExecutionLifecycle` + adapters, migration.

## Ownership Map

- `resolveDelegationPlacement`: the only owner of delegation-target rules, including CM-1 (self moves here from the three roots).
- Execution index port `isOwnTeamAddress(senderAgentRunId, address)`: true when the address is the sender's own address; or equals, or has as prefix `<instance>/`, the address of any instance in `teamInstancesOf(sender)` (any depth, the same `isWithin` test message resolution uses); or — Team index only — the sender is a configured member of the root Team and the address is a configured placement of the root Team (any depth). Examples (DEC-008): Team T with /a and sub-team /s containing /s/x: /a → /s/x refused, /s/x → /a refused, /s/x → /s refused; Org with mounted /team_a and /team_b: /team_a/m → /team_b/n allowed, /team_a/m → /team_a/k refused, Org direct /pm → /team_a allowed.
- `resolveMessageRecipient`: resolution only.
- Migration: all knowledge of the `collaborators` shape after removal.

## Thin Entry Facades / Public Wrappers (If Applicable)

Root delivery services remain thin over the shared functions.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope |
| --- | --- | --- | --- |
| `resolveMessageRecipient` steps 2 and 4; `CatalogBringInPort`; `taskScope` input; `task-scoped-message-recipient.ts` | messaging never creates (REQ-003) | not found + guidance | In This Change |
| `RootTaskExecutionLifecycle.ensureTaskHelper`, `helperPlacement` and the `broughtIn` join path; `TaskExecutionRole` creation of `broughtIn` | no helper copies | — (stored role value still read, DEC-007) | In This Change |
| `*Collaborators.bringInAt`, `CollaboratorAdmission.ensure`, `collaborator-admission-queue.ts`, `collaborator-entry-builder.ts`, `collaborator-identity-allocator.ts` (if only used for entries), `CollaboratorRootPort` write methods | no bring-in | — | In This Change (keep `resolveMentions`, `listAvailable`, `catalogTaskSource`) |
| tree `collaborators` field in schemas, domain types, mutators, `collaborator-entry-tree-mapping.ts`, `listCollaboratorAgentRunIds`, `collaboratorTaskOwners`; index `collaborator`/`collaborator_team_member` kinds and visitors; `getCollaborator`/`getMessagePlacement` collaborator branches | concept removed | migration converts data | In This Change |
| hosting: `team-root-collaborator-agent-registry.ts`, `collaborator-team-execution-registry.ts`, `team-root-collaborator-hosting.ts`, `collaborator-handle-preparation.ts`, collaborator use of `prepareConfigured` in `RootAgentExecutionRegistry`/`RootTeamExecutionDirectory`, `*Collaborators.restore`, member-scope rule branch for collaborator Teams | concept removed | — | In This Change |
| delegation step 1 (teammate inside own catalog Team copy); `resolveInRunDelegationPlacement` collaborator branches; per-root self checks | CM-1 refuses those targets; self check centralized | shared rule | In This Change |
| `resolveTaskCopyHost` team branch and the creation paths that host a new copy inside a Team instance (only reachable for teammates) | unreachable after CM-1 | root host | In This Change; restore of recorded Team-hosted copies stays (DEC-006) |
| stream contracts: `collaborators` snapshot fields, `collaborator_added` event, `collaboratorEntryDtoSchema`; root execution view validation of collaborators; GraphQL collaborator fields and collaborator delegated-launch selection | concept removed | — | In This Change |
| web: collaborator rows, `collaborator_added` handling, collaborator member contexts/hydration, Settings collaborator launch rows, collaborator branches in run tree summary, Token Meter scope and Event Monitor | concept removed | delegated runs (already supported) | In This Change |
| memory explorer `collaborator` kind mappings (`collaboration-member-memory-targets.ts`) | kinds removed | — | In This Change |
| `@` note presence wording "or a collaborator"; mention presence from collaborator entries | no entries | — | In This Change |
| texts: "brought in on first use", "a collaborator" as delegation target | REQ-006 | model wording | In This Change |
| Dead code found in touched files | Principle 7 | — | In This Change (implementer lists with evidence) |

## Return Or Event Spine(s) (If Applicable)

`collaborator_added` event removed; other events unchanged.

## Bounded Local / Internal Spines (If Applicable)

Migration per tree: `read -> detect collaborators -> validate entries (frozen) -> map -> append -> drop key -> validate with current reader -> atomic write -> re-read`.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Refusal/not-found message wording | DS-001, DS-002 | one constant each in `collaborator-errors.ts` (or renamed module) |
| Index own-Team query | DS-001 | per-index implementation of `isOwnTeamAddress` |

## Ownership Boundaries

Roots call only the shared resolution functions for delegation and message targets; no root re-implements CM-1 or messaging fallbacks.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `resolveDelegationPlacement` | CM-1, placement order | three roots | root-local self/teammate checks |
| `resolveMessageRecipient` | resolution order | three roots | root-local catalog fallback |

## Dependency Rules

Unchanged directions; the migration imports only the atomic writer and current tree readers (for output validation), never removed types.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape |
| --- | --- | --- | --- |
| `MessageRecipientIndexPort.isOwnTeamAddress(senderAgentRunId, address)` | sender's own Team | CM-1 membership test | run ID + canonical address |
| `resolveDelegationPlacement({port, senderAgentRunId, address, resolveInRun, catalogSource})` | delegation target | refusal + placement | unchanged |
| `resolveMessageRecipient({port, senderAgentRunId, address, notFoundMessage})` | message target | resolution only | unchanged minus `catalog`/`taskScope` |

## Interface Boundary Check

| Interface | Singular | Explicit | Risk |
| --- | --- | --- | --- |
| all above | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| own-Team test | `isOwnTeamAddress` | natural |
| remaining catalog modules named "collaborator" | unchanged | FU-1 |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| own Team instances | `teamInstancesOf` | Reuse inside `isOwnTeamAddress` |
| unowned delegated runs | existing task-execution model | Reuse for converted collaborators |
| tree atomic write | run-package atomic writer | Reuse |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| `agent-collaboration/collaborators` | shared resolution; catalog machinery | Extend/Remove |
| `agent-collaboration/execution` | hosting, task lifecycle | Remove collaborator/helper parts |
| `agent-team-execution`, `agent-org-execution`, `standalone-agent-run-root` | indexes, delivery, registries, trees | Remove collaborator parts; add `isOwnTeamAddress` |
| `run-history` | schemas, delegated launch selection | Remove collaborator parts |
| `autobyteus-collaboration-stream-contracts`, `autobyteus-agent-presentation-contracts` | DTOs, note wording | Remove/Modify |
| `autobyteus-web` | UI/state | Remove collaborator instance handling |
| `app-data-migrations` | conversion | Create New |
| docs | model + consolidation | Create/Modify |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Why |
| --- | --- | --- |
| self/teammate refusal (3 roots) | `catalog-delegation.ts` | one rule |

## Shared Structure / Data Model Tightness Check

| Structure | Tight | Action |
| --- | --- | --- |
| tree root types without `collaborators` | Yes | remove field |
| `LocatedExecutionKind` without collaborator kinds | Yes | remove values |

## Final File Responsibility Mapping

| File / Area | Change |
| --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/catalog-delegation.ts` | CM-1 refusal first; remove step 1 |
| `…/message-recipient-resolution.ts` | remove steps 2/4, `CatalogBringInPort`, `taskScope`; add `isOwnTeamAddress` to the port type |
| `…/task-scoped-message-recipient.ts`, `collaborator-admission-queue.ts`, `collaborator-entry-builder.ts` | Remove |
| `…/collaborator-admission.ts`, `collaborator-root-port.ts`, `collaborator-errors.ts` | keep read-only parts (`resolveMentions`, eligibility); refusal and not-found wording |
| `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts`, `task-copy-host.ts`, `root-task-dispatch.ts`, `task-execution-resource-port.ts` | remove helper creation; root-only host for new copies |
| `src/agent-collaboration/execution/backends/collaborator-handle-preparation.ts`, root registries | remove collaborator hosting |
| `src/agent-team-execution/**` (`team-execution-index.ts` + `isOwnTeamAddress`, `team-run-collaborators.ts`, `team-root-collaborator-hosting.ts`, `local/registries/team-root-collaborator-agent-registry.ts`, `collaborator-team-execution-registry.ts`, `team-recipient-resolver.ts`, `team-run-message-delivery.ts`, `root-team-run.ts`, `team-root-materializer.ts`, mutators, tree domain/schema) | remove collaborator parts; centralize self check |
| `src/agent-org-execution/**` (index + `isOwnTeamAddress`, `agent-org-run-collaborators.ts`, recipient resolver, delivery, run, scope builder, tree domain/schema, mutator, events) | same |
| `src/standalone-agent-run-root/**` (index + `isOwnTeamAddress`, `standalone-root-collaborators.ts`, recipient resolver, delivery, builder, tree domain/schema/mutator, events, location service, manager) | same |
| `src/run-history/**` (shared records/schemas, `collaborator-entry-tree-mapping.ts`, delegated-launch selection, member view projections) | remove collaborator parts |
| `src/services/agent-streaming/**`, `src/api/graphql/types/agent-run-collaboration.ts`, `delegated-launch-selection.ts`, `collaborator-root-port-resolver.ts` | remove collaborator fields/events |
| `src/agent-memory/services/collaboration-member-memory-targets.ts` | remove collaborator kinds |
| `src/token-usage/**` | remove collaborator branches (copies already counted) |
| `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`, `src/agent-execution/prompt/standalone-collaboration-instruction.ts`, `src/agent-tools/agent-discovery/list-available-agents-contract.ts` | model wording |
| `autobyteus-collaboration-stream-contracts/src/*` | remove collaborator DTOs/events |
| `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` | presence wording; parser keeps saved notes |
| `autobyteus-web/**` | remove collaborator instance handling (see Removal plan); keep `@` candidates |
| `src/app-data-migrations/migrations/collaborators-to-delegated-runs-v1/*` + registry | Add |
| `src/projects/stores/task-execution-resource-schema.ts` | keep reading `broughtIn`; no new writes |
| task source resolvers (`standalone-root-task-source-resolver.ts`, `team-task-source-resolver.ts`, `agent-org-task-source-resolver.ts`), `task-execution-source-schema.ts`, location services' launch fallback | absent `source` = configured placement only; remove collaborator fallback |
| Docs: `docs/design/collaboration_model.md` (Add, done), `DESIGN.md`, `docs/design/README.md`, module pointers (done); module mechanics (`agent_communication.md` §Collaborators and resolution order, `agent_team_execution.md` §Collaborators In A Team Root and teammate-copy text, `agent_orgs.md`, `standalone_agent_run_root.md`, `projects.md` broughtIn/helper text, `agent_memory.md` kinds, web docs) | Modify to match code |

## Applied Patterns (If Any)

Port method on the index (existing pattern); migration per runner contract.

## Target Subsystem / Folder / File Mapping

As above; one new migration folder.

## Folder Boundary Check

New folder follows existing per-migration folders.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| refusal | `delegate_task /software_engineering_team/code_reviewer` from a member of that Team → refused like self-delegation today (`COLLABORATION_SELF_TARGET_REJECTED`, raised before any preparation), message: "/software_engineering_team/code_reviewer is in your own team. Use send_message_to with recipient_address /software_engineering_team/code_reviewer." | a second copy of the reviewer |
| not found | `send_message_to /product_team` (not in run) → `COLLABORATION_TARGET_NOT_FOUND`: "/product_team is not in this run. To give work to an outside Agent or Team, use delegate_task, then send_message_to its run ID." | bringing in a collaborator |
| Org | `delegate_task /software_engineering_team` from the Org's direct `/project_task_manager` → copy started | refusal |
| Team root | member `/architecture_reviewer` delegating `/code_reviewer` (configured root member) → refused | allowed because `teamInstancesOf` excludes `/` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| keep collaborators readable as history | Rejected (user chose conversion) | migration |
| keep `send_message_to` bring-in behind a flag | Rejected | not found + guidance |
| keep reading `collaborators` at runtime | Rejected | migration-owned frozen schema |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Shared rules: `isOwnTeamAddress` in three indexes; CM-1 in `resolveDelegationPlacement`; remove step 1 and per-root self checks; root-only host for new copies.
2. Messaging: strip steps 2/4, helper path, bring-in; not-found guidance.
3. Migration with frozen collaborator schema + fixtures from the user's two released trees (and Team/Org shapes); register.
4. Remove collaborator concept from schemas/types/indexes/hosting/restore/events/DTOs/GraphQL.
5. Web removal; contracts packages (rebuild tracked `dist` as the repo does).
6. Texts (llm contract, standalone instruction, `@` note presence wording).
7. Module docs mechanics; model doc status table check.
8. Tests: refusal per root (AC-001..AC-004), messaging not found (AC-005/006), migration (AC-007: convert, idempotent, invalid entry, unreadable tree; startup with all families; a converted collaborator reopens and wakes by run ID; messages and context files still resolve), texts snapshots (AC-008), `@` (AC-010).

## Key Tradeoffs

- Converted collaborators lose address reachability (by design) but keep everything else.
- Keeping restore of recorded Team-hosted copies avoids migrating the 2 Org teammate copies.

## Risks

- Large removal surface (server + web + contracts): mitigated by grep-complete criteria (no remaining collaborator-instance handling; the only remaining "collaborator" names are catalog-candidate ones, FU-1).
- Live agents that messaged a collaborator by address get not found after upgrade (guidance names `delegate_task` and run IDs).
- Overlap with paused Task 8641c0ac (it must be redesigned on this base; its collaborator decision DEC-002 becomes moot).

## Guidance For Implementation

- The refusal must happen before any placement, preparation or Task link (no side effects; AC-001..003).
- Prove AC-007 on a stopped-writer copy of the user's data with all 7 trees (9 collaborators, both families): after startup each appears as a delegated run of its run, conversations open, and messaging by run ID wakes them. Migration tests assert, per family, that the memory folder resolved for each converted run equals the collaborator's folder before conversion. AC-011 fixture: a sourceless copy at a collaborator address and one at a collaborator-Team member address.
- Do not touch delegated-run storage locations or message storage (Task 8641c0ac).
