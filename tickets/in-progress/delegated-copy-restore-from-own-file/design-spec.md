# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-007`
- Approved requirements baseline: SR-001 `requirements-doc.md`, approved by the user in the 2026-10-19 conversation ("Yeah, exactly … if it cannot be converted, leave it there … But the application starts normally"). SR-002 adds a wording correction to REQ-002 / AC-006: a team copy keeps the handoff rules its members have today, including rules to the coordinating run. This preserves current behavior and is no new intent (see the revision record).
- Behavior-defining supplements: none
- Design status: `Ready` (SR-007: ARCH-REV-005 AR-006, the mirrored-copy rows split and corrected; SR-006: guideline §2 checklist and shape-to-fixture inventory added, no decision changed; SR-005: DI-001 resolved by D-8; SR-004: ARCH-REV-002 AR-003..AR-005 resolved in text and test plan; SR-003: ARCH-REV-001 AR-001 resolved by D-5 explicit member facts, the user's choice DEC-010; AR-002 resolved by the M4 5-key projection)
- Canonical investigation notes: `tickets/in-progress/delegated-copy-restore-from-own-file/investigation-notes.md`
- Authorities read (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repo root; rules 7, 8, 9 and the project-specific documents), `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-5, CM-7, CM-8), `TESTING.md` (migrations rule, contract `dist/` rule)
- Conflicts or discrepancies: none between the general principles and DESIGN.md. The Task's "a copy of realistic data" conflicts with TESTING.md; this design follows TESTING.md (requirements DEC-009).

## Current-State Read

A delegated copy (a task agent or task agent team) has its own file since 2026-10-17. On disk, the coordinating run's tree holds a link to it. In memory, the coordinating tree's stores compose a `TaskAgentExecution` / `TaskTeamExecution` record from the link and the own file (`task-execution-tree-split.ts`, `task-agent-own-records.ts`).

The record's `source` (the definition-and-launch snapshot) is optional. It is present only for `origin: "catalog"`. For `origin: "configured_place"`, `source` is absent, and every consumer then resolves the copy through the **configured placement at the copy's address**:

- **restore and activation:** three per-root task-source resolvers (`TeamTaskSourceResolver`, `AgentOrgTaskSourceResolver`, `StandaloneRootTaskSourceResolver`);
- **Settings for copies:** `delegated-launch-selection.ts`, through `readTaskSource`;
- **run view:** `team-run-execution-tree-location-service.ts` and `agent-org-execution-tree-location-service.ts` set `configuredPlacement` by address, also for a copy. `locatedExecutionSource` prefers it, so `team-member-run-view-projection-service.ts` shows the slot's launch and even the slot's `platformAgentRunId`;
- **frontend:** `agentSourceSelectors.ts`, `agentOrgExecutionViewIndex.ts`, `delegatedLaunchRows.ts`, `teamExecutionTreeSelectors.ts` and their peers check the configured member at the address first. The display-name rule keys on `task.source !== undefined`;
- **team copies:** the "configured" follower rule (`memberFollowsTeam({kind: "configured"})`) and the org tree's full handoff list, applied to a team copy.

The own-file writer has two branches (`record.source` present or not; `existing` wins for configured places). The reader requires `origin` and lets `configured_place` agent files have all launch fields `null` (4 files in the user's data). The released migration `20261017_task_agent_own_run_v1` imports the current writer and validators.

Evidence: investigation notes, Source Log and the Architecture Investigation Findings.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: three packages and many components change. **Server:** in-memory record type, own-file reader and writer, three root adapters and their source resolvers, delegation placement, delegated-launch selection, two location services, the run-view projection, the org index. **Contracts:** two stream-contract packages. **Web:** about 9 files. **Migrations:** a new startup migration plus repointing a released one.
- Architectural risk: `High`
- Risk rationale:
  - persisted shape change and a new data migration on real user data;
  - shared stream-contract change (`source` required; new launch-source origin value);
  - removal of a restore path used in Team and Org roots.

  No security or concurrency change.
- Escalation trigger: return a Design Impact to the Solution Designer if implementation finds any of these:
  - another consumer that resolves a copy through the configured placement and is not listed in the Removal Plan;
  - a released migration other than `20261017_task_agent_own_run_v1` and the four D-8 migrations that imports a changed module, or a D-8 migration that needs an index method that reads a copy's `source`;
  - a reachable product path that writes a copy record without `source`.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | `catalog-delegation.ts:16-77`; `team-recipient-resolver.ts:17-24`; `agent-org-recipient-resolver.ts:47-56` | An in-run placement carries no `source`; a catalog one does | D-1: every placement carries a snapshot | — |
| Code read | resolvers (3), adapters `team-task-execution-adapter.ts:76-115,216-230,273`; org adapter `:104-113,261-293,346`; standalone adapter `:111-117,267-278,338` | Activation and restore go through `sources.require*(address, recorded)` | D-2: adapters project the recorded source; resolvers removed | — |
| Code read | `member-instance-scope.ts:40-95` | A team member's outgoing handoffs = the host instance's handoffs with `from` = member | D-4: snapshot keeps the members' outgoing rules | — |
| Data, read-only | classroom org tree: 5 handoffs, incl. `/StudentStudyGroup/student_one → /Teacher` | Today the team copy gets this rule; its own tree (written 10-17) keeps only the 2 rules inside the team | D-4; migration takes handoffs from the org tree | — |
| Code read | `task-execution-source-schema.ts:72-76` | Team source rejects a handoff that "leaves the Team" | D-4: invariant becomes "every handoff starts at a member" | — |
| Data, read-only | `/tmp/sd197/followers.py`: 331 configured team members in the user's orgs | All have launch equal to their team default (5-key projection) | D-5 migration computes each member's `followsTeam` with today's configured rule | — (D-5 records the flag explicitly, so no divergent shape remains; ARCH-REV-001 AR-001) |
| Code read | `delegatedLaunchRows.ts:123-129, 220-246`; `runSettings.ts:43` | The "As configured in this run" label = no `source` | D-6: record `launchSource.origin = "configured"` | — |
| Code read | `launch-configuration-source.ts` | Origins: `agent_default`, `team_default`, `inherited` | D-6 adds `configured` | — |
| Code read | released migration `task-agent-own-run-v1/coordinating-run-migration.ts:4-9,148-175`; `…-app-data-migration.ts:115-125` | Imports current `taskAgentOwnMetadata`, `taskAgentTeamOwnTree`, `parseTaskAgentRunMetadata`, `validateTaskAgentTeamTreePayload`, `TaskAgentOwnFiles`; read-back through current stores tolerates unavailable copies (L5) | Repoint to frozen copies (guideline §4) | — |
| grep | migration imports of changed modules | Only that migration (plus a type-only `LaunchConfigurationSource` import in `released-collaborator-entry-v1.ts`; adding a value doesn't change its released behavior). **Corrected by DI-001 (SR-005):** the grep missed the current execution indexes and state-package validators, which take the record type this change tightens. Four more released migrations pass pre-own-run trees into them: both `20260731` working-context snapshot migrations (via `legacy/.../released-memory-locations-before-task-agent-own-run.ts`), `20260926_team_context_file_execution_locators_v1` and `20260905_agent_org_history_first_message_summary_v1` (via `legacy/.../released-root-packages-before-task-agent-own-run.ts`, and directly for 20260905) | Repoint scope; D-8 | They call only source-independent index methods (DI-001 evidence) |
| Code read | `append-only-message-logs-v1-app-data-migration.ts:28-135` | Predecessor gate: convert now, stay non-terminal (`FAILED`, "next start continues") while a predecessor is pending | Migration gate pattern | — |
| Code read | `skill-improvement-target-context-resolver.ts:70-95`; `collaboration-member-memory-targets.ts:64` | They use `configuredPlacement` (the slot) for a copy at a configured address; a slot's definition never changes within a run | Left alone (Change Scope; follow-up) | — |

## Intended Change

Every delegated copy's record always carries its `source`, written to and read from its own file. A copy of a configured placement gets that snapshot when it starts, just like a catalog copy. Every path that resolves a copy through the configured placement at its address is removed (server, contracts, web), along with `taskAgent.origin`. One startup migration converts existing own files: it completes the configured-place ones from their placement and removes `origin` from all of them.

## Change Scope (Mandatory)

- **In scope:** UC-001..UC-005, which cover:
  - copy activation in Team, Org and Agent roots;
  - composing and splitting copy records;
  - own-file reader and writer;
  - copy restore;
  - copy Settings (delegated launches);
  - run view of a copy;
  - Team and Org frontend contexts, names and delegated launch rows;
  - stream contracts (`source` required; `configured` launch origin);
  - a new startup migration;
  - the released 10-17 migration repointed to frozen copies;
  - docs (`run_history.md`, `agent_orgs.md`, `agent_communication.md`, `web/docs/settings.md`, `collaboration_model.md` CM-8 line).
- **Deliberately left alone:**
  - how catalog copies start (which definition, launch resolution and notes); only the recorded member shape of team copies changes (D-5, user decision DEC-010);
  - configured members' own restore and the slot editor;
  - the role and instruction scope of an agent copy at a root configured address (`member-instance-scope.ts` rule 2: address-based, run-definition level, not editable per slot);
  - skill improvement and memory targets, which use the slot's definition (identical to the copy's within a run);
  - the obsolete `skillAccessMode` key in slot launch objects;
  - message logs;
  - `imports/` (Memory Sync mirrors).
- **Follow-ups:**
  - (F-1) `skill-improvement-target-context-resolver.ts` takes runtime/model for a task copy at a configured address from the slot, not the copy. Evidence: lines 78-95. Not needed for this ticket's ACs.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior (evidence) | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001 / AC-001 | Restore a catalog copy | From own file | Preserved | DS-002 |
| BEH-002 | System | REQ-001, REQ-007 / AC-001, AC-006 | Restore a configured-place copy | From slot | From own file | DS-002 |
| BEH-003 | User | REQ-003 / AC-003 | Edit slot in stopped run | Copies follow | Only slot + later copies | DS-001, DS-002 |
| BEH-004 | User | REQ-004 / AC-004 | Open run view / Settings | Slot shown | Copy's own shown; names kept | DS-003 |
| BEH-005 | User | REQ-002 / AC-002 | `delegate_task` to a configured address | Starts from slot; no `source` | Starts from slot; full snapshot recorded | DS-001 |
| BEH-006 | User | REQ-007 | Settings edit of a stopped copy | `userLaunchSelection` beside started launch | Preserved | DS-002, DS-003 |
| BEH-007 | User | REQ-007 / AC-006 | Team-level model selection | Configured rule for configured-place team copies | Same follower set via recorded rule | DS-001, DS-004 |
| BEH-008 | Operational | REQ-005, REQ-006, REQ-008, REQ-009 / AC-005..AC-009 | First start of the new build | `origin` present; 4 files with null launch | Migrated once | DS-004 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` + `Cleanup`
- Current design issue found: `Yes`
- Structural triggers that fire:
  - **Legacy cleanup:** `origin` and the "absent `source` means configured placement" fallback exist only to keep pre-own-file behavior (U-4).
  - **Repeated coordination:** the same "source, else configured placement at the address" rule is implemented in three server resolvers, two location services, the org index, the mention viewer, and at least six web files.
  - **Shared-structure tightness:** `source?` has two meanings (snapshot, or "look elsewhere"); `TaskAgentRunMetadata` has nullable launch fields only for one origin.
  - **Empty indirection:** after the fallback is removed, each task-source resolver only forwards to `projectTaskExecutionSource`.
- Root cause classification: `Legacy Or Compatibility Pressure` (with `Shared Structure Looseness`)
- Refactor needed now: `Yes`
- Evidence: see Current-State Read and the investigation notes.
- Design response:
  - `source` becomes required and means "what this copy runs with";
  - one place creates it, the delegation placement (D-1);
  - every consumer projects it (D-2, D-3);
  - the fallback, `origin`, the configured follower rule and the resolvers are removed.
- Refactor rationale: keeping either path would keep two representations authoritative.
- Deferrals: F-1 only.

## Terminology

- **Copy snapshot (`source`)**: the definition and launch facts a delegated copy runs with: `TaskAgentExecutionSource` / `TaskTeamExecutionSource`. Before this change it was called a "catalog source"; now every copy has one.
- **Configured placement (slot)**: a configured member (Team) or a direct agent / mounted team or its member (Org) of the coordinating run.

## Legacy Removal Policy (Mandatory)

- Obsolete paths:
  - `taskAgent.origin`, `TaskAgentOrigin`;
  - the configured-place branches in `taskAgentOwnMetadata`, `taskAgentTeamOwnTree`, `composeTaskAgentRecord`, `composeTaskTeamRecord`;
  - `ConfiguredPlaceResolver`, `CoordinatingTreeShape.resolvePlace` and `.handoffs`;
  - the nullable launch of agent own files;
  - the resolvers' configured fallback, and then the resolvers themselves;
  - `configuredTeamFollowerAddresses` and `memberFollowsTeam({kind: "configured"})`;
  - every "configured placement first" lookup for a copy (server and web);
  - the web `configuredFollows` and `CONFIGURED` facts for copies.
- Compatibility wrappers, dual paths or legacy fallbacks kept: `None`. Old own-file shapes are read only inside migration-owned frozen code.

## Persisted Data / State Transition Decision (Mandatory)

- **Stored subject:** own files of delegated copies:
  - agent copies: `memory/agents/<id>/run_metadata.json` with a `taskAgent` section;
  - team copies: `memory/agent_teams/<id>/team_run_execution_tree.json` with a `taskAgent` section.

  User's data: 28 agent copies (24 `catalog`, 4 `configured_place` with null launch) and 82 team copies (80 `catalog`, 2 `configured_place`).
- **Code-model change:** `taskAgent.origin` removed. Agent own files must record the started launch (`runtimeKind`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools` required; `workspaceRootPath` nullable, U-2). Team handoffs may point from a member to a coordinating-run address. Every team-copy member records its complete launch and a `followsTeam` boolean (D-5). New launch-source origin `configured`.
- **Reader and writer:** tolerant reading (unknown fields ignored), exact writing. A configured-place agent file has no launch, so it cannot satisfy the new reader. A configured-place team file would parse, but its handoffs lack the members' outgoing rules (2 instead of 3 in the user's data), and it has no `configured` launch source.
- **Decision:** `Migration Required`.
- **Rationale:**
  - **New required fact that only old data can supply** (guideline §3): the launch of 4 agent copies and the outgoing handoffs of 2 team copies exist only in their coordinating trees.
  - **Removing `origin` everywhere:** the user directed it (DEC-006, "keep the data clean"); the cost is one small JSON rewrite per own file (110 locally, a few KB each).
- **Supported ACs:** AC-005..AC-009, AC-011. The members of all 82 team copies get their complete launch and `followsTeam` in the same pass that removes `origin` (one write per file).

### Migration Plan

- **Migration:** `20261019_delegated_copy_own_file_complete_v1`, class `DelegatedCopyOwnFileCompleteV1AppDataMigration`, `STARTUP_ONLY`, registered last. The id carries `v1` per the migration naming convention; current-code names carry no version (DESIGN rule 8).
- **Source shapes:** the own files written by:
  - the 10-17 migration (configured place: agent launch `null`; team handoffs inside the team only; `origin`);
  - runtime writers since 10-17 (agent configured place: launch recorded when first written; catalog: `origin: "catalog"`).
- **Why direct use is insufficient:** the missing facts (above).
- **Trigger and owner:** startup, owned by `src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/`.
- **Current runtime:** current-schema-only. It never reads `origin` or a coordinating tree's slot for a copy.
- **Historical decoders:** confined to the migration plus `legacy/released-run-package-shapes/released-task-agent-own-files-with-origin.ts`, which is shared with the repointed 10-17 migration.
- **Completion:** the runner ledger.
- **Idempotency:** per file. A file without `origin` that passes the current reader is already current (skipped, not counted as a warning). Each conversion is one atomic file write (`AtomicRunPackageFileCommitWriter`), followed by a read-back with the current reader.
- **Predecessor gate:** like `append-only-message-logs-v1`. The migration converts every file present, but the run stays non-terminal (`FAILED`, "Waiting for 20261017_task_agent_own_run_v1; the next start continues") while that predecessor is not `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS`. Copies that 10-17 writes on a later start are then converted.
- **Validation:** each written file passes the current reader (`parseTaskAgentRunMetadata` / `validateTaskAgentTeamTreePayload`).
- **Backup:** none by the migration (guideline §7). The user backs up before upgrading (REQ-011). No rollback design (guideline §4; the user's direction).
- **Concurrency:** none. The runner runs startup migrations before any run is active.
- **Retention:** the migration stays registered. Its frozen shapes live in its folder and in the shared legacy file.
- **Other released migrations (D-8, SR-005):** the two `20260731` snapshot migrations, `20260926` locators and `20260905` org-history summary keep using the current indexes and validators through `asSourceIndependentIndexInput`; their results are unchanged and their tests are unchanged.

| Step | Source Shape | Target Shape | Owner | Validation | Failure / Recovery |
| --- | --- | --- | --- | --- | --- |
| M0 discover | `memory/agents/*/run_metadata.json` and `memory/agent_teams/*/team_run_execution_tree.json` that have a `taskAgent` key (not `imports/`) | — | migration | — | Unreadable JSON → `PRESERVED_UNREADABLE` (warning), file untouched |
| M1 already current | no `origin`; passes the current reader | unchanged | migration | current reader | skipped (not a warning) |
| M2 catalog | `origin: "catalog"`, complete | Agent copy: same file without `origin`. Team copy: also D-5 member completion with the recorded rule: each member gets `launchConfiguration` = its own (projected) if recorded, else the team default (projected), and `followsTeam` = true iff it had no own launch. `launchSource` unchanged | migration | current reader / team-tree validator | Write fails → `FAILED` item; next start retries |
| M3 configured-place agent | `origin: "configured_place"` | `agentDefinitionId` and the 5 launch fields from the slot at `taskAgent.address` in the coordinating tree (only those 5 keys; extra keys such as `skillAccessMode` dropped); `taskAgent.launchSource = {origin: "configured", fallbacks: []}` unless one is recorded; `origin` removed; every other field kept | migration | current reader | Coordinating tree missing or unreadable, or no agent slot at the address → `PRESERVED_PLACEMENT_MISSING` (warning), file untouched (REQ-008) |
| M4 configured-place team | `origin: "configured_place"` | Every slot launch object (team default and each member) is first projected to the 5 current keys (`runtimeKind`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`, `workspaceRootPath`), the same projection `parseLaunchConfiguration` does. Obsolete keys such as `skillAccessMode` are never compared or written (AR-002). From the projected slot (configured team at `taskAgent.address`): `teamDefinitionId`, `coordinatorAddress`, `defaultLaunchConfiguration`; each own-tree member keeps its `address`, `agentRunId`, `platformAgentRunId`, `userLaunchSelection`, with `agentDefinitionId` and the projected `launchConfiguration` from the slot member (always written), and `followsTeam` from today's configured rule: runtime, model and model settings equal to the projected team default (D-5). `handoffs` = the coordinating tree's handoffs whose `from` is a member address (D-4). `taskAgent.launchSource = {origin: "configured", fallbacks: []}` unless recorded. `origin` removed | migration | current team-tree validator | Slot missing, or slot members do not match the own tree's member addresses → `PRESERVED_PLACEMENT_MISSING`, untouched |
| M5 gate | — | — | migration | ledger read | 10-17 pending → non-terminal; next start continues |

The coordinating tree is read raw, with a migration-owned locator over the current tree families (team: `rootTeam.members[]`; org: `rootOrg.members[]` and `rootOrg.members[].members[]`; agent root: no slots). Read each tree once per run id and cache it for the attempt (several copies can share one coordinating run).

**Status:**
- `SUCCEEDED`: everything converted or already current;
- `SUCCEEDED_WITH_WARNINGS`: some files preserved;
- `FAILED`: an item failed or the predecessor is pending.

None of these blocks startup (guideline §1; DESIGN rule 7).

**Admission after the migration:**
- **agent own file without a launch** (preserved): the current reader rejects it, so the store reports the copy as unavailable and leaves it out (existing L5);
- **preserved team own file** (slot missing, so not converted): the current team-tree validator requires `followsTeam` and a complete launch per member, so it rejects the file. The store reports the copy as unavailable and leaves it out (L5). The file stays untouched, as REQ-008 requires (ARCH-REV-002 AR-004);
- **every other run:** unaffected.

### Data Migration Guideline Checklist (§2) and Shape Inventory

The user's goal (2026-10-19): clean data and clean code. What can be converted is converted once. What cannot be converted is left untouched; the app does not read it and starts normally.

| # | Checklist item | Answer |
| --- | --- | --- |
| 1 | Need | Migration required: new required facts exist only in old data (launch of 4 agent copies and outgoing handoffs of 2 team copies, both only in their coordinating trees; each team member's complete launch and `followsTeam`, derivable only from the released member shape). Removing `origin` from every own file: the user's direction (DEC-006). |
| 2 | Availability | No startup or new-work dependency. Startup runs regardless of status. An unconvertible file is left untouched and the copy is left out (L5); every other run is unaffected. The `FAILED` (non-terminal) status only means "the next start continues". |
| 3 | Source and target | Source shapes: the released code at `f171032e88` (own-file writers and 10-17 output) plus the user's data, read-only (table below). Target owner: the current readers `parseTaskAgentRunMetadata` / `validateTaskAgentTeamTreePayload`. Predecessor dispositions: 10-17 `WAITING_FOR_PREDECESSOR` / `PRESERVED_UNSUPPORTED_TREE` leave records unmoved, so there are no own files to convert; those are converted once 10-17 moves them (gate M5). |
| 4 | Disposition | Converted: `MIGRATED`. Already current: skipped (not a warning). Slot or coordinating run missing: `PRESERVED_PLACEMENT_MISSING` (warning; untouched; the copy is not loaded). Unreadable JSON: `PRESERVED_UNREADABLE` (warning; untouched). Write failed: `FAILED` item (next start retries). Predecessor pending: non-terminal. Admission is always the current reader at load time, never the ledger. |
| 5 | Commit and retry | One atomic replacement per file (`AtomicRunPackageFileCommitWriter`) and a read-back with the current reader. Recognition by shape (no `origin` + passes the current reader). No backup, hash or journal: an interruption leaves each file either old (re-converted) or current (skipped). |
| 6 | Current-only boundary | Old shapes are read only in the migration and in `released-task-agent-own-files-with-origin.ts`. The 10-17 migration is repointed to it. The four D-8 migrations use the documented `asSourceIndependentIndexInput` bridge. Same-ID versus new migration: new migration (successful installs need the transformation). |
| 7 | Cost | User's data: 110 own files, 859 KB total, largest 14.8 KB. One read and parse per own file. Each configured-place copy (6) also reads its coordinating tree once (cached per run id). At most one write and one read-back per changed file. One ledger read. Terminal status means later starts skip it entirely. No startup audit. |
| 8 | References | Copy → coordinating run (`taskAgent.coordinatingRun`): read only to find the slot (M3/M4); not changed. Coordinating tree links → own files: unchanged (same run ids and folders). Team handoffs now may reference coordinating-run addresses (`from` ∈ members); they are validated by the team-source schema. Memory Sync mirrors (`memory/imports/<node>/`) are not converted: they are replace-only copies of another node's data, converted on that node and replaced on the next sync. Until that node is updated, 13 of the 22 mirrored copies in the user's data (`docker-node-1`: 2 configured-place agent copies with empty settings and 11 catalog team copies in the released member shape) are not shown; the 9 mirrored catalog agent copies stay readable. Its other mirrored runs (175 run folders) are unaffected. Nothing is lost: the next sync after that node updates replaces the mirror. This is covered by S26 ("shown after that node is updated and synced; before that … not shown, nothing lost") and by the user's rule (2026-10-19: "if they cannot be converted … the application just cannot read them"); see SR-007. |
| 9 | Evidence | Synthesized fixtures for every shape below (TESTING.md), a combined 10-17 → new-migration → current-store test, a startup e2e with both migrations, a second start writing nothing, an all-copies-preserved case where new work still runs, and the D-8 suites unchanged. Unverified until delivery: the user's own data (after his backup). |
| 10 | Lessons and review | Consulted: `append-only-message-logs-v1` (predecessor gate, dispositions), `task-agent-own-run-v1` (own-file shapes, input gate, L5 admission), the guideline's lessons table (no `.original` copies, no startup re-audit, no journals). Rejected: backups, a reader tolerating old shapes, version fields. Independent review: architecture reviewer (ARCH-REV-001..004). |

**Shape inventory** (user's data, read-only, 2026-10-19; `/tmp/sd197/shapes.py`, a disposable probe) and fixture mapping. Every shape the released code can write has a fixture, including shapes absent from the user's data.

| Shape | Count in user's data | Disposition | Fixture (synthesized) |
| --- | --- | --- | --- |
| Agent copy, `catalog`, launch set, with delegator | 24 (coordinating: 11 agent, 11 team, 2 org) | M2: drop `origin` | F-A1 (one per coordinating kind) |
| …with `taskAgent.launchSource` | 5 of the 24 | M2 | F-A1b |
| …with `userLaunchSelection` | 1 of the 24 | M2 (kept) | F-A1c |
| …without delegator (released writers allow it) | 0 | M2 | F-A1d |
| Agent copy, `configured_place`, all launch fields `null` (10-17 output) | 4 (2 team-coordinated, 2 org) | M3: fill from slot (5-key projection), `launchSource: configured` | F-A2 (team slot; org slot inside a mounted team; slot launch with `skillAccessMode`) |
| …without delegator | 3 of the 4 | M3 | F-A2b |
| Agent copy, `configured_place`, launch recorded (runtime writer since 10-17) | 0 | M3 (slot values replace them: today's restore uses the slot) | F-A3 |
| …with `userLaunchSelection` | 0 | M3 (kept) | F-A3b |
| Agent copy, `configured_place`, slot or coordinating run missing | 0 | `PRESERVED_PLACEMENT_MISSING`; not loaded | F-A4 (slot gone), F-A4b (coordinating run gone) |
| Team copy, `catalog`, no member has its own launch | 77 | M2: drop `origin`; members get team default + `followsTeam: true` | F-T1 |
| Team copy, `catalog`, some members with own launch and launch source | 3 | M2: own members `followsTeam: false`, others `true`; launch sources kept | F-T2 |
| …a member without own launch but with its own launch source (skipped default; AR-003) | 0 | M2: `followsTeam: true`, `launchSource` kept | F-T2b |
| …team `launchSource` present / absent | 36 / 44 | M2 (kept / absent) | F-T1 / F-T1b |
| …team or member `userLaunchSelection` | 4 teams / 6 members | M2 (kept) | F-T2c |
| …coordinated by a team run instead of an agent run | 7 of the 80 | M2 | F-T1c |
| Team copy, `configured_place`, members' launch all recorded and equal to the default | 2 (org-coordinated; handoffs `student_one → /Teacher` in the org tree) | M4: from slot (5-key projection); `followsTeam` by the configured rule; handoffs `from` ∈ members | F-T3 (with `skillAccessMode` on slot objects and an outgoing handoff) |
| …a member with its own auto-approve and the team's model (AR-001) | 0 | M4: complete launch, `followsTeam: true` | F-T3b |
| …a member with a different model | 0 | M4: `followsTeam: false` | F-T3c |
| …a member that differs only in `skillAccessMode` (AR-002) | 0 | M4: `followsTeam: true` | F-T3d |
| Team copy, `configured_place`, slot missing or member set differs | 0 | `PRESERVED_PLACEMENT_MISSING`; not loaded | F-T4 |
| Own file with unreadable JSON | 0 | `PRESERVED_UNREADABLE` | F-X1 |
| Own file already current (no `origin`, passes the reader) | 0 before the migration (every file after) | skipped | F-X2 (second start) |
| Mirrored catalog agent copies under `memory/imports/<node>/` (launch recorded, with `origin`) | 9 (`docker-node-1`) | not discovered; **readable**: the current reader ignores `origin` and they have a launch | F-X3 (byte-identical; still shown in the imported source) |
| Mirrored configured-place agent copies (launch `null`) | 2 (`docker-node-1`) | not discovered; **not shown** until that node updates and syncs (the reader requires a launch) | F-X3b (byte-identical; reported unavailable; the source lists its other runs) |
| Mirrored catalog team copies (released member shape: members without complete launch / `followsTeam`) | 11 (`docker-node-1`) | not discovered; **not shown** until that node updates and syncs (the team-tree validator requires complete members, D-5; ARCH-REV-005 AR-006) | F-X3c (byte-identical; reported unavailable; the imported source still lists its other runs, DESIGN rule 7) |

## Data-Flow Spine Inventory

| Spine ID | Scope | Related BEH | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-005, BEH-007 | `delegate_task` to an address | Copy running; own file holds its snapshot | Root delegation placement → root task adapter → task lifecycle → tree store | Where a configured-place snapshot is born |
| DS-002 | Primary End-to-End | BEH-001, 002, 003, 006 | Reopen or wake a stopped copy | Copy runtime rebuilt | Tree store (compose) → root task adapter (restore) | Restore from the own file only |
| DS-003 | Primary End-to-End | BEH-004 | User opens run view / Settings | Copy's own settings shown | Server view projections, delegated-launch selection → stream DTO → web contexts and rows | Shown = used |
| DS-004 | Primary (operational) | BEH-008 | App start | Own files current | `DelegatedCopyOwnFileCompleteV1AppDataMigration` | One-time cleanup |
| DS-005 | Bounded Local | BEH-005 | Composed record in memory | Own file + link on disk | `task-execution-tree-split.ts` (split) and `task-agent-own-records.ts` | One writer branch |

## Primary Execution Spine(s)

- DS-001: `delegate_task tool → Root recipient resolver (in-run placement + snapshot) → resolveDelegationPlacement → Root task adapter planActivation (projectTaskExecutionSource) → Task lifecycle commit (projectTaskAgentExecution / projectTaskTeamExecution with source) → Tree store split → own file + link`
- DS-002: `Tree store read → composeTaskExecutions → composeTask{Agent,Team}Record (source from own file) → Root task adapter restore (projectTaskExecutionSource + restoreTask*Node) → Agent/Team runtime`
- DS-003: `Tree store read → location service / run-view projection / delegated-launch selection (copy's source) → stream & GraphQL DTO (source required) → web view index / context factory / delegated launch rows`
- DS-004: `App startup → migration runner → DelegatedCopyOwnFileCompleteV1 (discover → classify → complete from slot / drop origin → atomic write → read back) → ledger`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The root's recipient resolver finds the configured placement and builds its snapshot (`configuredPlacementSource`). The placement therefore carries `source` like a catalog one. The adapter projects the snapshot into the runtime node, starts the copy, and records the execution with that `source`. The store writes it to the copy's own file. | placement, adapter, lifecycle, store | root task adapter | snapshot builder (`collaborator-source-projector.ts`) |
| DS-002 | The store composes each link with its own file into a record that always has `source`. Restore projects that `source`; it never looks at the slot. | store, adapter | root task adapter | `projectTaskExecutionSource`, `restoreTaskAgentNode` / `restoreTaskTeamNode` |
| DS-003 | Views take a copy's settings from its record's `source` plus its Settings edit (`effectiveCopyAgentLaunch`). They take a configured member's settings from the slot, deciding by execution kind, never by address. | location services, projections, DTO, web index | each view owner | display-name rule (configured address set) |
| DS-004 | See the Migration Plan. | migration | migration | frozen released shapes, slot locator |

## Spine Actors / Main-Line Nodes

Root recipient resolvers (Team, Org, Agent root) · `resolveDelegationPlacement` · root task adapters (3) · task lifecycle projection (`task-execution-tree-projection.ts`) · coordinating tree stores via `task-execution-tree-split.ts` · own-file records and schema · view projections and stream DTOs · web view indexes, context factories, delegated launch rows · the new migration.

## Ownership Map

- **Root recipient resolver:** owns in-run placement resolution. It now also returns the placement's snapshot, built by the shared builder.
- **`collaborator-source-projector.ts`:** owns the two conversions:
  - configured placement → copy snapshot (`configuredPlacementSource`, new);
  - copy snapshot → runtime node (`projectTaskExecutionSource`, existing).

  It also owns the recorded follower rule.
- **Root task adapter:** owns activation and restore of copies in its root. It reads a copy only through its `source`.
- **`task-agent-own-records.ts`:** owns record ⇄ own-file mapping, one branch each way.
- **`task-agent-own-file-schema.ts` / `task-agent-team-tree-schema.ts` / `task-execution-source-schema.ts`:** own the current shape invariants.
- **Location services:** own locating an execution. `configuredPlacement` keeps its meaning: the configured placement at the address. `locatedExecutionSource` decides by `executionKind`.
- **Web view indexes:** own each agent's displayed source, by execution kind.
- **Migration:** owns all historical-shape knowledge.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. No facades are added; the three task-source resolver classes are removed as empty indirection.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `TaskAgentOrigin`, `TaskAgentSection.origin` (`agent-run-metadata-types.ts`) | Dead after D-3: nothing branches on it | — | In This Change | Doc comments rewritten |
| `ORIGINS`, origin check, catalog-only launch check (`task-agent-own-file-schema.ts`) | Shape changes | Launch required for every agent copy | In This Change | |
| Configured-place branches of `taskAgentOwnMetadata`, `taskAgentTeamOwnTree`, and of `composeTaskAgentRecord` / `composeTaskTeamRecord`; `section({origin})`; `handoffsWithin`; `ConfiguredPlaceResolver` | Every record has `source` (D-1) | One branch from `record.source` / to `source` | In This Change | `existing` parameter removed (a copy's file is written from its record) |
| `CoordinatingTreeShape.resolvePlace`, `.handoffs` and their implementations in the three tree stores (team, org, standalone) | Dead: only fed the removed branches | — | In This Change | The implementer greps for the shape implementations |
| `TeamTaskSourceResolver`, `AgentOrgTaskSourceResolver`, `StandaloneRootTaskSourceResolver` (+ tests) | After D-2 each only forwards to `projectTaskExecutionSource` | `projectTaskExecutionSource(address, source)` in the adapters and launch plans | In This Change | The `require` helpers' "not configured" errors go away; a kind mismatch cannot happen (source kind = placement kind) |
| `DelegatedTaskSourceReader` / `readTaskSource` ports (delegated-launch-selection command, root ports, launch plans) | Same | `delegated-launch-selection.ts` projects `task.source` itself | In This Change | 7 sites |
| `configuredTeamFollowerAddresses`; `memberFollowsTeam({kind: "configured"})` | Dead: only the resolvers' fallback used them | `member.followsTeam` (D-5) | In This Change | `memberFollowsTeam` is removed with the presence rule (next row) |
| `effectiveMemberLaunchConfiguration` (member launch ?? team default), the presence-based `memberFollowsTeam({kind: "recorded"})`, `recordedFollowerAddresses`, `RecordedMemberLaunch` optional launch; contract helpers `teamMemberLaunchConfiguration` / `teamMemberFollowsTeam` and `collaborationMemberLaunchConfiguration` / `collaborationMemberFollowsTeam`; web `configuredFollows` | D-5: every member carries its complete launch and `followsTeam` | read `member.launchConfiguration`, `member.followsTeam` | In This Change | `effectiveMemberLaunchSource` stays unchanged as `member.launchSource ?? team.defaultLaunchSource`, independent of `followsTeam`. A member's `launchSource` keeps today's presence rule: recorded when its agent definition had a default, used or skipped (`collaborator-launch-resolver.ts:120-125`). So a follower whose own default was skipped keeps its own fallback note (ARCH-REV-002 AR-003) |
| `catalogCopyExecutionSource` name; `validateCatalogCopyLayouts` name | Meaning widened to every copy | Renamed `copyExecutionSource`, `validateCopyLayouts` | In This Change | |
| Configured-first for copies in `locatedExecutionSource` and in `team-member-run-view-projection-service.ts` `metadataFor` (slot `platformAgentRunId`) | Copies use their own source | By `executionKind` | In This Change | |
| Configured fallback for task team copies in `agent-org-execution-index.ts` `instanceCoordinatorAddress`, and the "no catalog source" null case in `mention-viewer.ts` `instanceDefinitionsFromSource` | Every task team record has `source` | Read `source` | In This Change | Mentions inside a configured-place team copy now resolve its own team as they do for catalog team copies |
| Web: configured-first in `agentSourceSelectors.ts` (`teamAgentSourceAt`, `catalog*SourceAt`, `collaborationInstanceSource`), `agentOrgExecutionViewIndex.ts` (`addAgent` / `addTeam`, `configuredTeamLaunchAt`), `agentOrgExecutionContext.ts`, `agentRunCollaborationIndex.ts`, `teamExecutionContextFactory.ts`, `agentOrgHistoryRows.ts`, `ExistingRunConfigEditor.vue` (where it resolves copies); `delegatedLaunchRows.ts` `configuredFollows`, `CONFIGURED`, `launchAt` / `coordinatorAt` inputs; `teamExecutionTreeSelectors.ts` `isCatalogCopyAddress` and `team.source?.coordinator_address ?? team.address` | Copies always have `source` | Decide by execution kind / task record; display name by configured address set (D-7) | In This Change | The implementer greps for all `source ?`/`source?.` reads on task DTOs |
| `localization` key `runSettings.delegated.source.configured` | Kept: now reached through `launchSource.origin = "configured"` | — | — | not removed |
| F-1 skill-improvement launch of a copy | out of scope | — | Follow-up | |

## Return Or Event Spine(s) (If Applicable)

N/A. Stream publication carries the composed records unchanged, apart from `source` being required.

## Bounded Local / Internal Spines (If Applicable)

- **Parent owner:** `task-execution-tree-split.ts`.
- **Spine:** `split: record → taskAgentOwnMetadata(record.source) → parse → compare with file on disk → write if changed → link`, and `compose: link + own file → compose*Record (source from file)`.
- **Why it matters:** the write must not need the coordinating tree any more (no `resolvePlace`).

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `configuredPlacementSource` (new, in `collaborator-source-projector.ts`) | DS-001 | Root recipient resolvers | Input: the configured execution node the root index returns (`ConfiguredAgentExecutionNode` / `ConfiguredTeamExecutionNode`, with its `launchConfiguration`) and the tree's handoffs. Configured agent node → `{kind: "agent", agentDefinitionId, launchConfiguration, launchSource: {origin: "configured", fallbacks: []}}`. Configured team node + tree handoffs → `{kind: "agent_team", teamDefinitionId, coordinatorAddress, members (each with its complete `launchConfiguration` and `followsTeam` by the configured rule, D-5), handoffs (D-4), defaultLaunchConfiguration, defaultLaunchSource: {origin: "configured", fallbacks: []}}` | One owner for the snapshot rule in Team and Org roots | Duplicated in each resolver |
| Display-name rule (web) | DS-003 | View indexes | A copy reads as a spaced display name iff its first address segment is not a configured member of the root team (Team) / not a configured placement (Org, as today) | Names must not change | Name flips for configured members |
| Slot locator (migration-owned) | DS-004 | Migration | Find the configured agent / team at an address in a raw tree | Historical reading stays in the migration | Leaks into current stores |

## Ownership Boundaries

- A copy's settings have one authority: its record's `source` (+ `userLaunchSelection`), persisted in its own file.
- A configured member's settings have one authority: the slot.
- No component decides between them by address. The deciding fact is the execution kind (configured, task, task team member), which every index already carries.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanism | Callers That Must Use It | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| Composed tree record (`TaskExecution.source`) | own-file read/compose | adapters, views, delegated-launch selection | reading the coordinating tree's slot for a copy | extend the record |
| `collaborator-source-projector.ts` | snapshot ⇄ node conversions, follower rule | resolvers, adapters, delegated-launch selection | inline snapshot building in a resolver | add a function there |
| Migration | released shapes, slot locator | — | current code importing `released-task-agent-own-files-with-origin.ts` | — |

## Dependency Rules

- Current runtime code never imports migration or legacy files.
- The repointed 10-17 migration imports only the frozen shared legacy file for own-file writing and validation. It keeps `TaskAgentOwnFiles` (layout paths only) and `taskExecutionLinkOf` (link shape unchanged), plus its current-store read-back (validation of output, allowed by §4).
- **D-8 (SR-005, DI-001): released migrations that read pre-own-run trees through the current indexes and validators** (the two `20260731` working-context snapshot migrations, `20260926_team_context_file_execution_locators_v1`, `20260905_agent_org_history_first_message_summary_v1`) keep that documented dependency (legacy README: "results unchanged by task-agent-own-run").
  - **The bridge:** at their four call sites (the two frozen legacy modules and `agent-org-history-first-message-summary-v1-app-data-migration.ts`), the released tree passes through one named function owned by the legacy folder, `asSourceIndependentIndexInput(tree)` in `released-trees-before-task-agent-own-run.ts`. Its doc comment states three things:
    1. the released tree may hold copies without `source`;
    2. only the methods listed may be called with the result: `listAgentExecutions`, `listTeamExecutions`, `getTeamRunPhysicalScope`, `getConfiguredPlacement`, `listAgents`, `listTeams`, `requireAgent`, `getPhysicalScopeForAgent`, `getPhysicalScopeForTeam`, the two state-package validators (which call only `requireAgent`) and `projectAgentOrgRunHistoryRow`, none of which reads a copy's `source`;
    3. anyone who makes one of those methods read `source` must first freeze it for these migrations.
  - **README:** the legacy README's note is extended: "results unchanged by task-agent-own-run and by delegated-copy-own-file-complete".
  - **Behavior proof:** the four migrations' existing test suites pass unchanged.
  - **Why not freeze (DI-001 option B):** about 914 lines of frozen index and validator code (plus the history-row projector), only to protect methods whose results do not depend on the changed field. Guideline §7/§9 cost proportionality and the earlier ticket's D-9 decision ("shown unaffected with the reason") favour the bridge. The bridge is the one place where migration code passes a released shape to a current type, and it is confined to the legacy folder.
- Web code reads a copy's settings only from the task DTO's `source`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `DelegationPlacement` (`catalog-delegation.ts`) | delegation target | `source` **required** on both kinds | address + kind | doc: "every placement carries the snapshot the copy starts from" |
| `configuredPlacementSource(node, treeHandoffs)` | configured placement | build snapshot | node | new |
| `projectTaskExecutionSource(address, source)` | copy snapshot | runtime node | address + snapshot | existing |
| `TaskAgentExecution.source`, `TaskTeamExecution.source` | copy record | required | — | |
| `taskAgentOwnMetadata({record, coordinatingRun, memoryDir})`, `taskAgentTeamOwnTree({record, coordinatingRun})` | own file | write | record | `resolvePlace`, `existing`, `treeHandoffs` removed |
| `LaunchConfigurationOrigin` | launch provenance | adds `"configured"` | — | server type + schema; both contract packages |
| `TaskTeamExecutionSourceMember`, `TaskAgentTeamMemberNode`, team/collaboration stream member DTOs | team-copy member | `launchConfiguration` required; `followsTeam: boolean` required (D-5) | member address | shared by catalog and configured-place team copies |
| Stream DTOs: `TaskAgentExecutionDto.source`, `TaskTeamExecutionDto.source` (team contracts); Org/Agent-root equivalents (collaboration contracts) | copy | required | — | clean cut (DESIGN rule 9) |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `locatedExecutionSource(location)` | Yes | Yes (`executionKind`) | Low after change (was High: by address) | decide by kind |
| web `teamAgentSourceAt(tree, address, agentRunId)` | Yes | Yes after change: resolve by `agentRunId` (configured member, task agent, or task team member) | was High | resolve by run id |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| copy snapshot | `source` | Yes | "catalog" wording in comments | rewrite comments to "copy snapshot" |
| `catalogCopyExecutionSource` | → `copyExecutionSource` | Yes | — | rename |
| `validateCatalogCopyLayouts` | → `validateCopyLayouts` | Yes | — | rename |
| new launch origin | `configured` | Yes; matches the existing web key `configured` and the label "As configured in this run" | — | — |
| migration | `delegated-copy-own-file-complete-v1` | Yes | — | — |
| frozen file | `released-task-agent-own-files-with-origin.ts` | Yes (named after the period's shape, DESIGN rule 8) | — | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| configured → snapshot | `collaborator-source-projector.ts` | Extend | already owns snapshot ⇄ node and follower rules |
| atomic file write + read-back | `AtomicRunPackageFileCommitWriter` | Reuse | guideline §7 |
| predecessor gate | `append-only-message-logs-v1` pattern | Reuse (pattern) | same situation |
| frozen released shapes | `legacy/released-run-package-shapes/` | Extend | canonical place for shared frozen shapes |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `agent-collaboration/collaborators` | placement snapshot, projections, delegated launches | DS-001, DS-003 | Extend |
| `agent-team-execution`, `agent-org-execution`, `standalone-agent-run-root` | recipient resolvers, task adapters, launch plans, indexes, location services | DS-001..003 | Modify |
| `run-history/{domain,store,services}` | record types, own-file schema and records, tree split, view projection | DS-002, DS-003, DS-005 | Modify |
| `app-data-migrations` | new migration; repoint; frozen shapes | DS-004 | Create New + Modify |
| `autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts` | DTOs, launch-source schema | DS-003 | Modify (+ rebuild `dist/`) |
| `autobyteus-web` services/utils/stores | view indexes, contexts, rows, names | DS-003 | Modify |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping. No intermediate re-split was needed beyond extracting `configuredPlacementSource`.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why Shared | Redundant Attrs Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| configured placement → snapshot (Team, Org resolvers; migration needs the same rule on raw JSON) | runtime: `collaborator-source-projector.ts`; migration: its own copy of the rule on raw JSON | collaboration / migration | one rule per runtime | Yes | Yes | a migration importing runtime code for its transformation (guideline §4) |
| released own-file shape (10-17 writer/validator; new migration's classifier) | `legacy/released-run-package-shapes/released-task-agent-own-files-with-origin.ts` | migrations | both migrations read/write this released shape | Yes | Yes | imported by current code |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `TaskAgentExecution.source` | Yes (required snapshot) | Yes | Low | required |
| `TaskAgentRunMetadata` | Yes | Yes (no origin; launch non-null except workspace) | Low | — |
| `TaskTeamExecutionSource.handoffs` | Yes: "the handoff rules of its members" (`from` ∈ members) | — | Low | invariant changed from "inside the team" |
| `TaskTeamExecutionSourceMember` / `TaskAgentTeamMemberNode` | Yes: `launchConfiguration` (required) = the member's complete started launch; `followsTeam` (required boolean) = whether a team-level model selection reaches it; `launchSource` keeps today's presence rule (recorded when the member's agent definition had a default, used or skipped; else the team's provenance applies via `effectiveMemberLaunchSource`), independent of `followsTeam` (AR-003). This is provenance for display only; it never decides launch or following | Yes (presence no longer carries meaning) | Low | D-5 (SR-003) |

## Final File Responsibility Mapping

| File | Change | Concrete Concern |
| --- | --- | --- |
| **Server: runtime** | | |
| `src/run-history/domain/run-execution-tree-shared-records.ts` | Modify | `source` required on `TaskAgentExecution` and `TaskTeamExecution`; doc comments; `memberFollowsTeam` recorded-only |
| `src/agent-team-execution/domain/task-agent-team-tree.ts`, `src/run-history/store/task-agent-team-tree-schema.ts` | Modify | own-tree member: `launchConfiguration` required, `followsTeam` required (D-5) |
| `src/agent-collaboration/collaborators/{collaborator-entry-builder,collaborator-admission,launch-configuration-notes}.ts` | Modify | catalog team snapshot: every member gets its complete launch (own default, else the team's) and `followsTeam` (= no own default); notes read the member's launch |
| `src/services/agent-streaming/{team-execution-view-projector,collaboration-execution-tree-dto-projection}.ts` | Modify | project `launch_configuration` / `follows_team` per member |
| `src/run-history/store/agent-run-metadata-types.ts` | Modify | remove `TaskAgentOrigin` and `origin`; launch fields non-null except `workspaceRootPath` |
| `src/run-history/store/task-agent-own-file-schema.ts` | Modify | no origin; started launch required (`workspaceRootPath` may be null); `taskAgentStartedLaunch` returns non-null (or is inlined) |
| `src/run-history/store/task-agent-own-records.ts` | Modify | single write and compose branches; remove `ConfiguredPlaceResolver`, `handoffsWithin`, `existing` |
| `src/run-history/store/task-agent-team-tree-schema.ts` | Modify | taskAgent section without origin (via the shared section parser) |
| `src/run-history/store/task-execution-tree-split.ts` | Modify | drop `resolvePlace` / `handoffs` from the shape and the write calls |
| `src/run-history/store/{team,agent-org}-run-execution-tree-store.ts`, standalone root package store | Modify | drop shape members `resolvePlace` / `handoffs` |
| `src/run-history/store/task-execution-source-schema.ts` | Modify | `source` required; team handoff invariant "`from` is a member" |
| `src/run-history/store/launch-configuration-source-schema.ts`, `src/agent-collaboration/domain/launch-configuration-source.ts` | Modify | add origin `configured` |
| `src/run-history/store/run-execution-tree-shared-record-schemas.ts` | Modify | `validateCopyLayouts` (rename; always checks) |
| `src/agent-collaboration/collaborators/collaborator-source-projector.ts` | Modify | add `configuredPlacementSource`; remove `configuredTeamFollowerAddresses`; rename `copyExecutionSource` |
| `src/agent-collaboration/collaborators/catalog-delegation.ts` | Modify | `DelegationPlacement.source` required; doc |
| `src/agent-team-execution/services/team-recipient-resolver.ts` (+ `resolved-team-recipient.ts` types) | Modify | placement with `configuredPlacementSource`; needs the run config's node for the address |
| `src/agent-org-execution/services/agent-org-recipient-resolver.ts` | Modify | same for agent and team placements (org handoffs from the tree) |
| `src/standalone-agent-run-root/services/standalone-root-recipient-resolver.ts` | Modify only if it builds in-run placements without source | Agent roots have no configured placements; verify |
| `src/agent-team-execution/task-delegation/team-task-execution-adapter.ts`, `src/agent-org-execution/services/agent-org-task-execution-adapter.ts`, `src/standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts` | Modify | use `projectTaskExecutionSource(address, placement.source / record.source)`; record `source` always |
| `src/agent-team-execution/task-delegation/team-task-source-resolver.ts`, `src/agent-org-execution/services/agent-org-task-source-resolver.ts`, `src/standalone-agent-run-root/services/standalone-root-task-source-resolver.ts` | Remove | empty indirection |
| `src/agent-collaboration/domain/delegated-launch-selection.ts`, `src/agent-collaboration/collaborators/{delegated-launch-selection-command,root-hosted-delegated-launches}.ts`, `src/agent-team-execution/services/team-run-delegated-{launch-plan,launches}.ts`, `src/agent-org-execution/services/{agent-org-run-manager,agent-org-run-delegated-launches}.ts`, `src/standalone-agent-run-root/services/{standalone-agent-run-root-manager,standalone-root-delegated-launches}.ts` | Modify | remove the `readTaskSource` port; project `task.source` |
| `src/agent-collaboration/execution/task/task-execution-tree-projection.ts` | Modify | `source` required input |
| `src/agent-collaboration/execution/services/collaboration-execution-location-service.ts` | Modify | `locatedExecutionSource` by `executionKind` |
| `src/run-history/services/team-member-run-view-projection-service.ts` | Modify | metadata from `locatedExecutionSource`; `platformAgentRunId` from the execution itself, by kind |
| `src/agent-org-execution/services/agent-org-execution-index.ts`, `src/agent-collaboration/collaborators/mention-viewer.ts` | Modify | task team copies: coordinator and definitions from `source` |
| `src/standalone-agent-run-root/services/standalone-root-location-service.ts` | Modify | rename call |
| **Server: migrations** | | |
| `src/app-data-migrations/legacy/released-run-package-shapes/released-task-agent-own-files-with-origin.ts` | Add | frozen 10-17-era own-file shapes: `taskAgent` section with origin, `parseTaskAgentRunMetadata`, `validateTaskAgentTeamTreePayload`, `taskAgentOwnMetadata` / `taskAgentTeamOwnTree` as released |
| `src/app-data-migrations/migrations/task-agent-own-run-v1/coordinating-run-migration.ts` | Modify | import the frozen file instead of current own-records / schemas |
| `src/app-data-migrations/legacy/released-run-package-shapes/released-trees-before-task-agent-own-run.ts`, `released-memory-locations-before-task-agent-own-run.ts`, `released-root-packages-before-task-agent-own-run.ts`, `README.md`; `src/app-data-migrations/migrations/agent-org-history-first-message-summary-v1/agent-org-history-first-message-summary-v1-app-data-migration.ts` | Modify | D-8: `asSourceIndependentIndexInput` and its 4 call sites; README note |
| `src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/delegated-copy-own-file-complete-v1-app-data-migration.ts` | Add | discovery, gate, dispositions, result |
| `src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/own-file-completion.ts` | Add | per-file classification and the M2–M4 transformation on raw JSON, including the slot locator |
| `src/app-data-migrations/app-data-migration-registry.ts` | Modify | register last |
| **Contracts** | | |
| `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` (+ `dist/`) | Modify | `source` required on task DTOs; launch origin `configured` |
| `autobyteus-collaboration-stream-contracts/src/{root-execution-view-dtos,agent-org-execution-dtos}.ts` (+ `dist/`) | Modify | same |
| **Web** | | |
| `autobyteus-web/services/collaborators/agentSourceSelectors.ts` | Modify | sources by run id and kind; no configured-first for copies |
| `autobyteus-web/services/agentOrgExecution/{agentOrgExecutionViewIndex,agentOrgExecutionContext}.ts`, `services/agentCollaboration/agentRunCollaborationIndex.ts`, `services/teamExecution/{teamExecutionContextFactory,teamExecutionTreeSelectors}.ts`, `utils/agentOrgHistoryRows.ts`, `components/workspace/config/ExistingRunConfigEditor.vue`, `utils/runSettings/delegatedLaunchRows.ts` | Modify | as in the Removal Plan; names unchanged (D-7) |
| **Docs** | | |
| `autobyteus-server-ts/docs/modules/{run_history,agent_orgs,agent_communication}.md`, `autobyteus-server-ts/docs/design/collaboration_model.md`, `autobyteus-web/docs/settings.md` | Modify | every copy records its source; "As configured in this run" = started from a configured placement; no origin |

## Applied Patterns (If Any)

None new. The migration follows the existing predecessor-gate and atomic-replace patterns.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. The only new folder is `src/app-data-migrations/migrations/delegated-copy-own-file-complete-v1/` (2 files), matching sibling migrations.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `migrations/delegated-copy-own-file-complete-v1/` | Persistence (migration) | Yes | Low | like `append-only-message-logs-v1/` |
| `legacy/released-run-package-shapes/` | Persistence (frozen) | Yes | Low | its README rule: no current-code imports |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Agent own file after the change | `{"agentDefinitionId":"team-local-agent:evidence-driven-delivery-team:investigator","runtimeKind":"codex_app_server","llmModelIdentifier":"gpt-5.6-luna","llmConfig":{"reasoning_effort":"xhigh"},"autoExecuteTools":true,"workspaceRootPath":"…","taskAgent":{"coordinatingRun":{…},"address":"/investigator","launchSource":{"origin":"configured","fallbacks":[]}}}` | `"runtimeKind": null, …, "origin": "configured_place"` | A complete file |
| Deciding a copy's displayed source | `kind === "configured" ? slot : task.source` | `configured.get(address) ?? task.source` | Address is shared by a slot and its copies |
| D-4 team copy handoffs (classroom) | `student_one→/Teacher`, `student_one→student_two`, `student_two→student_one` (`from` ∈ members) | only rules inside the team (drops `→/Teacher`), or all 5 org rules | Keeps exactly the rules its members have today |
| D-5 member launch | `{address, agentDefinitionId, launchConfiguration: {…complete…}, followsTeam: true}` | `launchConfiguration` absent = "follows the team" (presence carries meaning; cannot express "own auto-approve, team model") | Restore reads each member's own complete launch; the follower fact is explicit |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep reading `origin` / slot for old files | Avoids a migration | Rejected | Migration M2–M4 |
| Reader accepts null launch for old agent files | Same | Rejected | M3; unconvertible files left out (L5) |
| Optional `source` in DTOs for old clients | Version skew | Rejected (DESIGN rule 9) | clean cut |
| Keep the 10-17 migration on current writers | Less code | Rejected (guideline §4) | frozen copies |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Freeze first** (done: `3ed550595c`), then D-8: add `asSourceIndependentIndexInput` and the README note, and route the four call sites through it when step 2 tightens the types. Then add `released-task-agent-own-files-with-origin.ts` (copies of today's own-file section and file parsers, team-tree validator, and the two writers as released). Repoint `coordinating-run-migration.ts`. Adapt its tests explicitly (ARCH-REV-002 AR-005):
   1. assertions on the raw files it writes stay unchanged (the AC-009 proof that its released output is preserved);
   2. its record helpers (`hubRecords` and similar) move to the frozen released types;
   3. its read-back through the current stores (`task-agent-own-run-v1-app-data-migration.test.ts:115-124`) and its load-and-save through the current store (`:207-209`) move to a combined test in the new migration's suite: 10-17 output → new migration → current stores compose and restore. That test is also the AC-005 / AC-006 restore proof;
   4. `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` (and any other startup e2e that registers the full registry) expects both migrations to run in one start, with own files in the final current shape.
2. **Types and schemas:**
   - add the `configured` launch origin (server + both contracts);
   - remove `origin`;
   - require the launch;
   - require `source`;
   - change the team handoff invariant;
   - update the contracts (rebuild `dist/`).
3. **Snapshot at birth:** `configuredPlacementSource`; the Team and Org recipient resolvers return placements with `source`; the adapters record it.
4. **One path:**
   - adapters and launch plans project `source`;
   - remove the resolvers and the `readTaskSource` port;
   - own-records single branch;
   - tree-split shape trimmed.
5. **Views:** location services, run-view projection, org index, mention viewer; then the web files.
6. **Migration:** `delegated-copy-own-file-complete-v1` and its registration.
7. **Docs.**
8. **Dead-code sweep:** grep for `origin` in run-history and own files, `configured_place`, `resolvePlace`, `readTaskSource`, `TaskSourceResolver`, `catalogCopy`, `configuredFollows`, `source ?`, `source?.`.

## Key Tradeoffs

- **Snapshot vs follow:** chosen by the user (DEC-001).
- **New launch-source value `configured` vs deriving the label from address:** recorded provenance keeps the label data-driven and true after the change. It costs one enum value in 2 contracts.
- **Team handoffs `from` ∈ members vs inside-only:** preserves the rules members have today (`→ /Teacher`). The team source invariant becomes slightly wider.
- **D-5 explicit member facts (user decision DEC-010):** every team-copy member records its complete launch and `followsTeam`. This touches the shared member shape that catalog team copies also use (server, both contracts, web) and rewrites the members of all team copies once in the same migration pass. In return, both follower inference rules and the member → team launch fallback disappear.

## Risks

- **RSK-001:** a missed configured-first site. Mitigation: the grep list in sequence step 8; AC-004 tests per root (Team, Org) on server and web.
- **Released migration behavior drift while freezing:** its existing tests plus a fixture run before and after the repoint.
- **Contract `dist/` not rebuilt:** TESTING.md rule. The implementer rebuilds and commits both `dist/` folders.

## Guidance For Implementation

- **Decisions:**
  - D-1 every placement carries `source`;
  - D-2 projection only;
  - D-3 own-file single branch;
  - D-4 handoffs `from` ∈ members;
  - D-5 every team-copy member records its complete `launchConfiguration` and a `followsTeam` boolean. Set at creation: catalog = no own agent default; configured placement = today's configured rule (runtime, model, model settings equal to the team default). `effectiveCopyAgentLaunch` uses `followsTeam: member.followsTeam`;
  - D-6 `launchSource.origin = "configured"` for configured-place snapshots (agent: `launchSource`; team: `defaultLaunchSource`, members without own launch source);
  - D-7 display names: Team web rule "first segment not a configured root member"; Org unchanged.
- **Tests (TESTING.md; synthesized data only):**
  - **Server integration, Team and Org roots:**
    - delegate to a configured member, then check the own file's key set (AC-002);
    - give the slot different settings, then restore (AC-001, AC-003);
    - team copy follower set and handoffs (AC-006);
    - a configured team member with its own auto-approve but the team's model: its copy records `followsTeam: true` and a team-level model selection reaches it; a catalog team copy's members follow iff they had no own agent default (AC-011).
  - **View tests:** run view (incl. `platformAgentRunId`), delegated launches (AC-004).
  - **Web unit tests:** contexts, rows, labels, names (AC-004).
  - **Migration tests** with fixtures in the released shapes:
    - catalog agent and team with `origin` (team members with and without their own launch, with and without their own launch source);
    - configured-place agent with null launch (slot with `skillAccessMode`), with and without delegator and Settings edit;
    - configured-place team whose members are equal to the default, plus one member that differs, with org handoffs pointing out of the team; slot launch objects with and without `skillAccessMode`, including a member whose only difference from the default is that key (AR-002);
    - a missing slot;
    - a missing coordinating run;
    - an unreadable file;
    - 10-17 pending, then a second start (AC-005..AC-008).
  - **Startup test:** startup through the real entrypoint, with every copy preserved and new work still possible (AC-007).
  - **Released migration:** as in Change Sequence step 1 (raw-output assertions unchanged; helpers on frozen types; current-store read-back moved into the combined 10-17 → new-migration test; startup e2e expects both migrations in one start).
  - **D-8 released migrations:** the existing test suites of the two `20260731` snapshot migrations, `20260926` locators and `20260905` org-history summary pass unchanged.
  - **Member provenance (AR-003):** a catalog team copy whose member's own default was skipped: the member follows (`followsTeam: true`) and keeps its own `launchSource` with the skipped fallback; the delegated launch row shows that member's own note, as today.
  - **Preserved team copy (AR-004, AC-007):** a configured-place team copy whose slot is missing is left untouched by the migration and is not loaded by the current store (reported as unavailable).
- **Real-app check (AC-004, AC-010):** the delivery engineer runs it in a test-owned data root. The user's own check comes after his backup.
