# Design Spec — Remove The Team-Inside-A-Team Leftover

## Solution And Approval Basis

- Current solution revision ID: `SR-006`
- Approved requirements baseline: SR-003 (+ REQ-005), approved by the user 2026-10-17 (requirements-doc Document
  Status). SR-004 refines REQ-002's wording (DEC-006); SR-005 adds REQ-006 / AC-006 (DEC-007) after ARCH-REV-001 —
  both within the direction (Solution Designer, user informed).
- Review: ARCH-REV-001 (`design-review-report.md`) — Fail with ARCH-F-001 (Design Impact), ARCH-F-002 (Requirement
  Gap); both addressed in SR-005 (see Review Response).
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/remove-nested-task-team/investigation-notes.md`
- Authorities read (2026-10-17): `references/architecture-design.md`, `references/design-principles.md`, project
  `DESIGN.md` (root; rule 7 added by this ticket), Data Migration Guideline
  (`autobyteus-server-ts/docs/design/data_migration_guideline.md`, read in 8641c0ac the same day), TESTING.md.
- Project design-principle conflicts: None.

## Current-State Read

Teams are flat since v1.4.70: every producer of a runtime team node builds agent children
(`agent-org-runtime-config-projector.ts:25-33`, `flat-team-topology-planner.ts:176-198`) and the flat factory refuses
any other child at runtime (`flat-team-execution-factory.ts:45,58`). A team run's configured members are agents only
(`team-run-execution-tree.ts`, `RootConfiguredTeamExecutionNode`). But four representations of a team inside a team
remain in current code, none of them reachable from a supported action:

1. **Nested task-team member** — `TaskTeamNestedTeamExecution` in the record type, parser, the three run indexes,
   the three tree mutators, restore, delegated launch selection / stop set, task-tree projection, the view projectors
   (server ~17 files), the two stream contracts and 6 web files. Only records written by v1.4.53–v1.4.69 can hold one.
2. **Runtime team node children** — `TeamRunAgentTeamNode.children: TeamRunNode[]` admits teams; the guarantee is a
   runtime check.
3. **Configured sub-team in team views** — `ConfiguredTeamExecutionDto` (`kind: "configured_team"`) in the team
   stream contract; the server never emits it (no producer); web consumers render it (history member rows, team
   execution context, selectors, view models).
4. **Team-definition member tree team node** — `TeamDefinitionAgentTeamNode` in `utils/teamDefinitionMembers.ts`;
   `buildTeamMemberTreeFromDefinition` produces agent nodes only. Plus 8 nested-team / sub-team UI strings with no
   non-test use.

Containment today: team / org runs whose package fails validation are excluded at startup
(`root-run-package-current-validator.ts`). Standalone runs are admitted on metadata alone, and
`StandaloneRootLocationService.findAgent/findAgentSync/listAgents` without a root id read every standalone tree and
throw on the first unreadable one; callers include `collaboration-execution-location-service.ts:46,68`,
`team-member-run-view-projection-service.ts:79`, `run-file-change-projection-service.ts:108`.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: removal across three subsystems — server (≈20 files: records, parser, 3 indexes, 3 mutators,
  restore, projectors, launch selection, runtime node type and its users, standalone location service), two shared
  contract packages, web (≈20 files + tests/fixtures + localization). Each edit is small; the breadth is wide.
- Architectural risk: `High`
- Risk rationale: narrows two shared wire contracts and the persisted-tree parser (a retired released shape stops
  loading), and adds a containment rule to a cross-run lookup boundary.
- Escalation trigger: a site classified here as "team inside a team" turns out to serve organizations or delegation
  (current behavior) → stop and return a Design Impact; launch-configuration team scopes are deliberately out (follow-up).

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `flat-team-execution-factory.ts:45,58`; producers above | No team child is ever built | Tighten node type (rep. 2) | — |
| git | `37d05c7f71` (v1.4.70), `3f3aafa7cf` (v1.4.53) | Retired-shape window v1.4.53–v1.4.69 | Release-note declaration | — |
| Code | `team-stream-contracts/src/team-execution-view-dtos.ts:150-266`; no `configured_team` producer in server | Dead DTO variants | Remove variants (reps. 1, 3) | — |
| Code | `utils/teamDefinitionMembers.ts:28-46` | Builder emits agents only | Remove team node variant (rep. 4) | — |
| Code | `root-run-package-current-validator.ts:100-175` | Team / org exclusion exists | Reuse; no change | — |
| Code | `standalone-root-location-service.ts:57-111` | Global scan throws on one bad tree | Skip-and-warn at this boundary | — |
| Code | `collaborators-to-delegated-runs-v1` imports current schemas / stores | Released migration reads current parser | No repoint: supported data unchanged; retired data → its existing FAILED disposition (contained) | — |
| Code | `application-platform/launch-configuration/*`, `agent-org-run-service.ts:39`, web `TeamRunConfig.ts` `teamOverrides` | Team-scope launch settings serve organizations' teams; team-run use unclear | Out of scope → follow-up | Classification |

## Review Response (ARCH-REV-001)

| Finding | Verification | Resolution |
| --- | --- | --- |
| ARCH-F-001 a released migration turns one retired Org into a failure for every Org | Confirmed: `agent-org-history-first-message-summary-v1-app-data-migration.ts:84-88` records every diagnostic as `FAILED_CURRENT_VALIDATION` and returns before processing any Org; reachable because `20260901_agent_org_flat_team_families_v1` copies team `taskExecutions` into converted Orgs (`agent-org-runtime-tree-target.ts:11`) and runs before it on an upgrade from v1.4.53–v1.4.69 | Mechanism confirmed, scenario not real: the user, 2026-10-17, "Nobody has ever used the nested team … in our agent package we already completely removed the nested agent team". No install holds the retired shape, so the premise is Technically Possible but Unsupported; released migrations stay unchanged (SR-006, DEC-008). The table below records the per-run vs global behavior for reference |
| ARCH-F-002 stale requirement lines | Confirmed | Problem, Stakeholders, External Contracts, Data Continuity, Architecture Phase Input and baseline reconciled (SR-005) |

## Intended Change

Remove every current representation of a team inside a team (reps. 1–4), keep organizations' teams and delegation
untouched, retire the old shape without a migration, and make cross-run standalone lookups skip an unreadable tree
with a warning (DESIGN.md rule 7).

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Server records / parser / indexes / mutators / restore / projectors / delegated launch
  selection and stop set / runtime team node type; `StandaloneRootLocationService` cross-run scans; the two stream
  contracts; web consumers of reps. 1, 3, 4; dead strings; tests and fixtures of removed shapes; `DESIGN.md` rule 7;
  release-note line (delivery).
- Deliberately left alone: organizations' teams (`AgentOrgMemberType.AGENT_TEAM`, org DTOs' team nodes);
  task agent teams delegated by members and shown under them (delegation rows); launch-configuration team scopes
  (`TeamScopeLaunchSettings`, application launch `teamScopes`, org `teamOverrides`, web `TeamRunConfig.teamOverrides`
  / `StoredTeamRunMemberNode` team kind) — they serve organizations and need a separate careful classification;
  the memory refactor 8641c0ac; released migrations (unchanged).
- Follow-ups: (1) classify and remove any team-run-only sub-team launch scopes in launch configuration (web
  `TeamRunConfig.teamOverrides`, `StoredTeamRunMemberNode` `agent_team`, `teamRunLaunchHierarchy.ts`; server
  `TeamScopeLaunchSettings` users) while keeping organizations' team scopes; (2) data health notice — already recorded
  as `project_task_5d0b1bc2`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-004; AC-001, AC-003 | `delegate_task` to a team | flat task team; runtime check | same; type guarantee | DS-001 |
| BEH-002 | System | REQ-003; AC-002 | open / restore / startup / cross-run lookup | nested records parse | retired: team/org excluded at startup; standalone run fails to open; cross-run lookups skip with warning | DS-001, DS-002, DS-004 |
| BEH-003 | User | REQ-002, REQ-004; AC-001, AC-003, AC-004 | views, history | nested / configured sub-team rendering paths | removed; org teams and delegation rows preserved | DS-003 |
| BEH-004 | Contract | REQ-002; AC-001 | stream DTOs | nested and configured-team variants | agent members only | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| Task brief (investigation notes, Meta) | direction | all | origin of scope | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (refactor)
- Current design issue found: `Yes`
- Structural triggers that fire: Legacy-cleanup trigger (four retained representations of a removed capability);
  Shared-structure tightness trigger (member unions and DTO unions carry a variant no producer creates).
- Root cause classification: `Legacy Or Compatibility Pressure` (the v1.4.70 flat change removed creation but kept
  representation) with `Shared Structure Looseness`.
- Refactor needed now: `Yes`
- Evidence: Current-State Read; investigation Source Log.
- Design response: clean-cut removal of reps. 1–4; type tightening; no compatibility reader; containment at the
  cross-run lookup boundary.
- Refactor rationale: the leftover misled review and design (8641c0ac ARCH-F-002); Core Principle 7 (no dead code).
- Intentional deferrals: launch-configuration team scopes (follow-up 1), because they are entangled with organizations'
  legitimate team scopes and persisted launch defaults; the in-scope behavior stays coherent without them.

## Terminology

- Team inside a team: a team that is a *member* of a team (reps. 1–4). Not: an organization's team; a task agent team
  delegated by a member (delegation).
- Retired shape: a task agent team record with a nested team member (v1.4.53–v1.4.69).
- Cross-run scan: a standalone lookup without a root id that reads every standalone run's tree.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths: reps. 1–4, the flat factory's runtime non-agent check (replaced by the type), dead strings.
- Compatibility wrappers, dual paths, or legacy fallbacks kept: `None`. The skip-and-warn rule is generic containment
  for any unreadable tree, not an old-shape reader.

## Persisted Data / State Transition Decision

- Stored subject: coordinating trees (`agents/<id>/collaboration/collaboration_tree.json`,
  `agent_teams/<id>/team_run_execution_tree.json`, `agent_orgs/<id>/agent_org_run_execution_tree.json`).
- Change: the parser no longer accepts a nested team member in a task agent team.
- Normal reader/writer behavior: every current record has agent members only (no producer since v1.4.70); the user's
  633 trees contain none (8641c0ac inventory).
- Decision: `Directly Usable — No Migration` for all supported data; the retired shape is explicitly retired (DEC-001 e):
  not transformed, not deleted, contained.
- Rationale: a migration would protect only the rest of an affected run, for a shape used almost never in two weeks of
  releases; the user chose retirement. Containment: team / org runs excluded by the existing startup check; standalone
  runs stay listed and fail to open with the parser's error; cross-run scans skip and warn (DS-002).
- Released migrations: unchanged. On supported data every released migration behaves identically (only the retired
  variant is removed). No install holds retired data (the user, DEC-008); for reference:

  | Released migration | Reads through current code | Behavior on one retired run | Action |
  | --- | --- | --- | --- |
  | `20260905_agent_org_history_first_message_summary_v1` | `AgentOrgRunPackageCatalog.rebuild()` (current validator), current org tree / message stores | global: any Org diagnostic fails every item | None (no install holds the retired shape — DEC-008); a general per-Org containment for this migration could be a future rule-7 improvement, not this ticket |
  | `20260926_team_context_file_execution_locators_v1` | `RootRunPackageCurrentValidator.scan()` | per package: `PRESERVED_INVALID_PACKAGE` warning | None |
  | `20261015_collaborators_to_delegated_runs_v1` | current tree schemas / stores, only after conversion | per tree: trees without collaborators are `SKIPPED_ALREADY_CURRENT` before validation; a tree with collaborators *and* the retired shape is `FAILED_CONVERTED_TREE_INVALID` (that tree only; aggregate FAILED, retried) | None in this ticket (rare; residual noted; 8641c0ac's gate must tolerate it — its ARCH-F-006) |
  | `20260731_*` snapshot migrations | `RuntimeMemoryLocationClassifier` → location services | team / org scans admitted roots only; standalone scans skip unreadable trees (DS-002) | None (covered by DS-002) |
  | `20260521_team_run_history_index_v2` | team history catalog | catalog returns admitted rows only (`collaboration-run-history-catalog-core.ts:65-68`) | None |
  | other released migrations | frozen shapes in `legacy/released-run-package-shapes/` or no tree reads | unaffected | None |

  The implementer re-verifies this table against the registry at the implementation base (grep of migration imports of
  current parsers, stores, catalogs and validators) and records the evidence.
- Supports: REQ-003, AC-002, QR-001.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, BEH-002 | open / restore a run | indexed tree, restored task teams | tree stores + shared record parser | parser narrowing and restore simplification |
| DS-002 | Primary | BEH-002 | member view / file-change view / location lookup | located agent or none | `StandaloneRootLocationService` | containment of one unreadable tree |
| DS-003 | Primary | BEH-003, BEH-004 | run state change | rendered team / history rows | server view projectors → contracts → web selectors | DTO and UI narrowing |
| DS-004 | Primary | BEH-002 | startup | admitted team / org roots | `RootRunPackageCurrentValidator` | unchanged exclusion |

## Primary Execution Spine(s)

- DS-001: `open run → TreeStore.read → shared record parser (agent members only) → run index → restoreTaskTeamNode (agent children) → TeamRun`
- DS-002: `projection service → CollaborationExecutionLocationService → StandaloneRootLocationService.findAgent (no root id) → per host: read tree → unreadable? warn + skip : search → located agent`
- DS-003: `run state → team-execution-view-projector / collaboration DTO projection → stream contracts (agent members) → web selectors / history rows`
- DS-004: `startup → RootRunPackageCurrentValidator → team / org package validation → admitted or excluded (unchanged)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | A task agent team's members are agents; the parser rejects a nested member as invalid, so an affected team / org package fails admission and an affected standalone tree fails to load when that run is opened. Indexes, mutators and restore handle agents only. | parser, indexes, restore | tree stores | — |
| DS-002 | A cross-run scan reads each standalone tree; a tree that cannot be read (any reason) is logged once per scan with host id and error and skipped; the scan continues. A lookup with an explicit root id keeps throwing, so opening that run reports its error. | location service | `StandaloneRootLocationService` | logger |
| DS-003 | Projectors emit agent members only; contracts no longer define nested / configured-team variants; web code renders agents, organizations' teams and delegation rows. | projectors, contracts, web selectors | projectors / contracts | — |
| DS-004 | Unchanged. | validator | validator | — |

## Spine Actors / Main-Line Nodes

Shared record parser; tree stores; run indexes; restore; `StandaloneRootLocationService`; view projectors; stream
contracts; web selectors / history row builders.

## Ownership Map

- Shared record types / parser own the task-team member shape (agents only).
- `TeamRunAgentTeamNode` type owns "a team's children are agents".
- `StandaloneRootLocationService` owns cross-run containment for standalone trees.
- Stream contracts own the wire shapes; web selectors own rendering.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade changes.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `TaskTeamNestedTeamExecution`, `TaskTeamMemberExecution` union, `isTaskTeamNestedTeamExecution` (`run-execution-tree-shared-records.ts`) and re-exports (`team-run-execution-tree.ts`) | Dead: no producer since v1.4.70 | `members: readonly TaskTeamAgentExecution[]` | In This Change | — |
| nested branch of `parseTaskTeamMember` (`run-execution-tree-shared-record-schemas.ts:162-176`) | retired shape | agent member parse | In This Change | retired data now invalid (contained) |
| nested visits in `team-execution-index.ts`, `agent-org-execution-index.ts`, `standalone-root-execution-index.ts` | Dead | agent members | In This Change | — |
| nested mapping in `team-run-execution-tree-mutator.ts`, `agent-org-run-execution-tree-mutator.ts`, `standalone-root-tree-mutator.ts` | Dead | — | In This Change | — |
| recursion in `task-team-node-restoration.ts` | Dead | agent children only | In This Change | — |
| nested branches in `delegated-launch-selection.ts`, `delegated-stop-set.ts`, `task-execution-tree-projection.ts`, `collaboration-execution-tree-dto-projection.ts`, `team-execution-view-projector.ts` (`projectNestedTaskTeam`) | Dead | — | In This Change | — |
| `TeamRunAgentTeamNode.children: TeamRunNode[]` | admits a team child no producer builds | `readonly TeamRunAgentNode[]` | In This Change | ripple fixes in its users |
| flat factory non-agent checks (`flat-team-execution-factory.ts:45,58`) | Dead after type tightening | type | In This Change | — |
| `TaskTeamNestedTeamExecutionDto`, nested zod schema, member union (team stream contracts); `TaskTeamNestedExecutionDto` (collaboration stream contracts) | Dead | `TaskTeamAgentExecutionDto` | In This Change | rebuild `dist` |
| `ConfiguredTeamExecutionDto` (`configured_team`) and `ConfiguredMemberExecutionDto` union (team stream contracts) | Dead: no server producer | `ConfiguredAgentExecutionDto` | In This Change | — |
| web nested-member handling: `agentSourceSelectors.ts`, `delegatedCopyLiveness.ts`, `teamExecutionTreeMutations.ts`, `teamExecutionTreeSelectors.ts`, `delegatedLaunchRows.ts`, `currentTeamTestFixtures.ts`; comments in `agentOrgHistoryRows.ts`, `agentRunCollaborationIndex.ts` | Dead | agent members | In This Change | — |
| web `configured_team` handling: `runHistoryTeamRows.ts` (`projectConfiguredRows` team branch), `teamExecutionContextFactory.ts`, `teamExecutionViewModels.ts`, `runHistoryTeamExecutionRows.ts`, `runHistoryNavigationProjection.ts`, sub-team expansion in `useWorkspaceHistoryTreeState.ts` | Dead | agent member rows | In This Change | keep delegation rows (task teams under members) |
| `TeamDefinitionAgentTeamNode`, depth display, unused options (`utils/teamDefinitionMembers.ts`) | Dead | agent nodes | In This Change | — |
| localization keys `AgentTeamDetail.nestedTeamsPill`, `compositionSummaryValue`, `form…selfReferenceForbidden`, `AgentTeamCard.nested_teams`, `TeamCommunicationPanel.represents_subteam`, `AgentTeamEventMonitor.focused_subteam`, `TeamWorkspaceView.send_subteam_placeholder`, `send_to_subteam` (en, zh-CN, generated) and test references | Dead: no non-test use | — | In This Change | — |
| tests / e2e fixtures of removed shapes (`nested-team-hierarchy.page.vue`, `nested-team-aggregate-status.page.vue`, specs listed in investigation) | test removed shapes | delegation-row equivalents where they also cover current behavior | In This Change | implementer keeps coverage of current behavior |
| launch-configuration team scopes for team runs | unclear: organizations use team scopes | — | Follow-up | Change Scope follow-up 1 |

## Return Or Event Spine(s) (If Applicable)

N/A — stream events carry the narrowed DTOs (DS-003); no new event.

## Bounded Local / Internal Spines (If Applicable)

- Parent: `StandaloneRootLocationService`. `for host in listHostRunIds(): try readTree(host) catch → logger.warn(host, error); continue`. Applies to
  `findAgent`, `findAgentSync`, `listAgents` when no root id is given. Matters because one bad file must not break
  other runs (REQ-003).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| warning log | DS-002 | location service | record skipped host and reason | rule 7 visibility | — |

## Ownership Boundaries

Cross-run containment belongs to the location service (the boundary that iterates many runs), not to callers and not
to the store: the store keeps throwing for a single explicit read, so opening an affected run reports its error.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix |
| --- | --- | --- | --- | --- |
| `StandaloneRootLocationService` | per-host tree reads in scans | `CollaborationExecutionLocationService`, projection services | callers catching errors themselves | strengthen the service |

## Dependency Rules

Unchanged. Web depends on the contracts packages; contracts have no server dependency.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `TaskTeamExecution.members` | task agent team | agent members | `agentRunId` | narrowed |
| `TeamRunAgentTeamNode.children` | runtime team | agent children | `agentRunId` | narrowed |
| `StandaloneRootLocationService.findAgent/findAgentSync/listAgents` | located agent | search; skip unreadable trees in scans | `rootRunId?`, `agentRunId?`, `memberAddress?` | behavior refined |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| all three | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| member DTO alias | `TaskTeamMemberExecutionDto` | No once it equals the agent DTO | Medium | replace uses with `TaskTeamAgentExecutionDto`, remove alias |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| exclude invalid team / org runs | `RootRunPackageCurrentValidator` | Reuse | already contains |
| logging | server logger used by the service area | Reuse | — |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spine | Decision |
| --- | --- | --- | --- |
| run-history (records, parser) | member shape | DS-001 | Extend (narrow) |
| agent-team / agent-org / standalone execution | indexes, mutators, restore, node type | DS-001 | Extend (narrow) |
| standalone location | containment | DS-002 | Extend |
| agent-streaming, contracts, web | views | DS-003 | Extend (narrow) |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

None needed; the change removes variants.

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| task team member type / DTO | Yes after change | Yes | Low | remove union and alias |
| configured member DTO | Yes after change | Yes | Low | remove union |

## Final File Responsibility Mapping

The Removal plan lists every file and its change. Additionally: `standalone-root-location-service.ts` gains the
skip-and-warn scan (DS-002); `DESIGN.md` rule 7 (done in the worktree).

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

No new files or folders; all changes are modifications or deletions listed in the Removal plan.

## Folder Boundary Check

N/A — no placement change.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| cross-run scan | `catch (error) { logger.warn("Skipping standalone run '<id>': its collaboration tree cannot be read: <msg>"); continue; }` inside the scan loop | a tolerant parser that drops nested members (old-shape reader); callers catching and hiding errors | containment at one boundary, no old-shape code |
| task team member | `members: readonly TaskTeamAgentExecution[]` | `TaskTeamAgentExecution \| TaskTeamNestedTeamExecution` | type states the product |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| parser that ignores nested members | keep affected runs loadable | Rejected | retirement + containment |
| startup migration lifting nested records | keep affected runs loadable | Rejected (user, DEC-001 e) | retirement + containment |
| keep DTO variants "for safety" | no | Rejected | removal |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

0. Test impact inventory: list tests / fixtures touching reps. 1–4 with their disposition (remove, rewrite to agent /
   delegation shape, unchanged).
1. Contracts: narrow both packages; rebuild `dist`.
2. Server: records + parser; indexes, mutators, restore, projectors, launch selection / stop set; node type and its
   users; remove flat factory checks; standalone location skip-and-warn with tests.
3. Web: consumers of reps. 1, 3, 4; dead strings; tests / fixtures.
4. Typecheck and full suites (server, web, contracts); search evidence (AC-001).
5. Real-app check on an isolated instance with the hand-built retired-shape data (AC-002) and normal runs (AC-003).

## Key Tradeoffs

- Retirement without migration: an affected standalone run stays listed but does not open (accepted by the user).
- Launch-configuration team scopes deferred to keep this ticket bounded and avoid touching organizations' scopes.

## Risks

- R-1: a web "sub-team" path actually renders delegation rows (current). Mitigation: classify each before removal;
  keep delegation-row tests; escalation trigger.
- R-2: type tightening ripples into organization code that builds team nodes. Mitigation: producers already build
  agent children; compile errors guide; organizations' team nodes keep their agent children.
- R-3: warnings repeat on every scan for an affected install. Accepted (rare; follow-up 5d0b1bc2 surfaces it).

## Guidance For Implementation

- Classification rule for every candidate site: membership of a team inside a team → remove; organization → team or
  delegation → keep. Record each classification with evidence in the implementation handoff.
- No tolerant parsing of the retired shape anywhere in current code.
- Tests: cross-run scan test with one unreadable standalone tree and normal trees (hand-built, TESTING.md); existing
  organization and delegation suites green. No retired-shape fixtures (no install holds that shape — DEC-008).
- Release-note line (delivery): "Task agent team records with a nested sub-team, created by v1.4.53–v1.4.69, are no
  longer supported. A run containing one is no longer shown (team / organization runs) or cannot be opened
  (standalone runs); its files are kept."
