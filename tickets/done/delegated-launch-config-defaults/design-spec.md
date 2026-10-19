# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (reopened: SR-005 switcher seeding fix; SR-006 collapsible collaborators/copies in Settings; see the Revision Notes at the end). SR-004 was revised for architecture review `ARCH-REV-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-002`, approved by the user on 2026-10-12 in the Solution Designer conversation ("I trust your reasoning…"). The user re-confirmed DEC-009 after a worked example: "Thanks, you made a very, very good judgment. Thanks a lot. Please continue."
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults/tickets/in-progress/delegated-launch-config-defaults/investigation-notes.md`
- Authorities read (design reading gate; 2026-10-12): `references/architecture-design.md`, `references/design-principles.md`; project `DESIGN.md` (repository root); `autobyteus-server-ts/docs/design/data_migration_guideline.md` (persisted-data checklist); `TESTING.md`; `autobyteus-server-ts/AGENTS.md`. `references/design-examples.md` was not used.
- Project design-principle conflicts with the general principles, or discrepancies: None. The migration guideline's "tolerant reader, optional field with truthful absence" rule and Core Principle 5 agree here.

## Current-State Read

Every way a definition enters a run without a user launch choice goes through **one owner**, `CollaboratorAdmission` (`agent-collaboration/collaborators/collaborator-admission.ts`):

- **Collaborator bring-in** (`send_message_to` to an available address, including after `@`): `resolveMessageRecipient` → root `bringInAt` → `admission.ensure`.
- **Catalog copy** (`delegate_task` to an available address): `resolveDelegationPlacement` → root `catalogTaskSource` → `admission.catalogTaskSource`.
- **Task-owned sender bringing in a helper** (e.g. a member of a delegated SE team copy messaging an available agent): `taskScopedMessageRecipient.bringIn` → `resolveDelegationPlacement` → the same `catalogTaskSource`.

Inside `CollaboratorAdmission`:
- `CollaboratorEntryBuilder.build` snapshots the definition and copies `port.rootLaunchConfiguration()` into the plan, as `launchConfiguration` for an agent or a single `defaultLaunchConfiguration` for a team.
- `CollaboratorRunnabilityValidator` then checks every placement against that one value.

Recorded team shapes (`CollaboratorTeamMember`, `TaskTeamExecutionSource.members`) have no per-member launch. Six projection sites spread `...team.defaultLaunchConfiguration` into every member:
- `collaborator-source-projector.ts`: `projectCollaboratorTeamNode`, `resolveCollaboratorCopySource`, `projectTaskExecutionSource`, `projectTaskSourceMember`, `collaboratorExecutionSource`, `catalogCopyExecutionSource`;
- plus `collaborator-identity-allocator.ts`.

The runtime layer (`TeamRunAgentNode`) already carries per-node runtime/model, so mixed-runtime copies need no runtime-engine change.

User launches: the web seeds the root from the team/Org default (`buildTeamRunTemplate`, `chatDraftStore`, `agentOrgLaunchDraftStore`). Member overrides start empty. The usability rule for start defaults lives in `utils/runSettings/startModelDefaults.ts`.

Visibility: the Settings view (`runMemberTree.ts`, `ExistingRunSettings`) lists the root and configured members only.

**The web keeps the same team-level rule** (ARCH-REV-001 AR-001). Four selectors in `autobyteus-web/services/collaborators/agentSourceSelectors.ts` return the team-level launch for every member of a collaborator team or a catalog team copy:
- `teamCollaboratorAgentSourceAt` (`:46`) and `teamCatalogAgentSourceAt` (`:61`), snake_case DTOs;
- `collaboratorAgentSourceAt` (`:114`) and `catalogSourceAt` (`:143`), camelCase DTOs.

They feed the member's conversation context (`teamExecutionContextFactory`, `teamRunContextHydrationService`, `teamMemberProjectionHydrationService`, `agentOrgExecutionContext`, `agentOrgExecutionViewIndex`, `agentRunCollaborationIndex`). A sweep of `autobyteus-web` for `default_launch_configuration` / `defaultLaunchConfiguration` found no other derivation of a copy's or collaborator's member launch; all other matches read configured teams' own values.

**Draft override normalization** (AR-003). `utils/runSettings/memberOverrides.ts` `normalizeMemberOverride` keeps only fields that differ from the parent. Every New-chat and Org-launch drawer edit and reset goes through it (`chatDraftStore.changeTeamMember`/`resetTeamMember`, `agentOrgLaunchDraftStore.changeMember`/`resetMember`).

The mobile team path (`teamRunConfigStore` + `teamRunLaunchConfigEdit.ts`) keeps overrides as set and does not normalize them against the parent. `teamRunConfigStore.setTemplate` is synchronous.

Evidence: investigation-notes Source Log, Architecture Investigation Findings.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - The change spans server collaboration admission, persisted run-history records and readers, two stream-contract packages, the `delegate_task` and `send_message_to` result surfaces, and three web launch surfaces.
  - It adds a web Settings read-only section.
  - Roughly 25–35 files across `autobyteus-server-ts`, `autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts` and `autobyteus-web`.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - Material persisted-shape change: new optional fields on recorded collaborator and copy snapshots.
  - Shared contract changes: view DTOs in two packages, and the strict `DelegateTaskResultSchema` gains an optional field.
  - Admission behavior changes from "validate one value" to "resolve per agent with fallback".
  - Known residual uncertainty about authentication detection (UNK-001).
- Escalation trigger if implementation or validation discovers new impact: any need for a migration, a change of the inherited source, a change to application launch baselines, a runtime-engine change for mixed-runtime copies, or a user-visible behavior not in REQ-001..REQ-011 → return `Design Impact` / `Requirement Gap` to Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code trace | `collaborator-admission.ts` `ensure`, `catalogTaskSource`, `buildPlan` | All non-user entry paths share one plan → validate → (allocate) sequence | Resolution lives in admission, in one place (DS-001) | — |
| Code trace | `message-recipient-resolution.ts`, `task-scoped-message-recipient.ts`, `catalog-delegation.ts` | The task-owned helper path also uses `catalogTaskSource` | No separate path to change | — |
| Code | `collaborator-runnability-validator.ts` | One `validateMany` per batch with shared catalog evidence | Resolver reuses `validateMany` in one batch (QR-001) and replaces this file | — |
| Code | `model-catalog-service.ts:215-228`; `runtime-availability-service.ts` | Claude's catalog is static (no executable check); Codex lists through its app server; availability providers check command presence and probes | Configured layers also need `RuntimeAvailabilityService` for their runtime; the inherited layer keeps today's check only (REQ-004 "as today") | UNK-001: login state is not detected before start |
| Code | `run-execution-tree-shared-record-schemas.ts` `requireKeys`, parse projections | Readers require presence of known keys and project known fields; extra keys are ignored | Optional fields need no migration | — |
| Guideline | `docs/design/data_migration_guideline.md` §3 | "Adding an optional field, provided its absence has a truthful meaning" needs no migration | Persisted decision: Directly Usable | — |
| Code | `task-delegation-result-contract.ts` (strict zod), `send-message-to-tool-result-contract.ts` | `delegate_task` success has no free-text field; `send_message_to` has `message` | Add optional `launch_notes` to the delegate result; append the note text to the send `message` | — |
| Code | `agent-org-execution-dtos.ts` (`collaboratorEntryDtoSchema`, `taskTeamSource`), `team-execution-view-dtos.ts` | DTOs mirror the records with strict objects | Add the same optional fields to both packages | — |
| Code | `autobyteus-web/utils/teamDefinitionMembers.ts`, `agentDefinitionStore.ts:325` | The web derives member agent definition IDs (incl. team-local) and has those definitions | Web seeding can read member defaults locally | — |
| Code | `autobyteus-web/utils/runSettings/startModelDefaults.ts` | `resolveStartModel` usability rule | Extract its candidate check and reuse it for member seeding | — |

## Intended Change

1. **Server, one resolution owner.**
   - A new `CollaboratorLaunchResolver` turns a definition plan into per-agent launch values by the approved order: agent default → team default → inherited root. It records the source and any fallbacks.
   - It replaces `CollaboratorRunnabilityValidator`, and `CollaboratorEntryBuilder` stops copying the root launch.
2. **Recorded per-agent values.** Collaborator and catalog-copy records gain optional per-member `launchConfiguration` and optional `launchSource` / `defaultLaunchSource`. One domain function gives a member's effective launch; all projection sites use it.
3. **Visible notes.**
   - `delegate_task` success carries optional `launch_notes`.
   - A `send_message_to` that brought an agent or team in appends the notes to its `message`.
   - The DTOs carry the source and fallbacks so Settings can show them.
4. **Web launch seeding.** One pure function seeds member (and Org placed-team) overrides from their usable definition defaults on fresh New-chat team starts, fresh Org launches and mobile team starts. Unusable defaults produce a row note.
5. **Web Settings.** A read-only "Collaborators and delegated copies" section lists each collaborator/copy agent with runtime, model, source and notes.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..005, REQ-008; AC-001..003, AC-005, AC-006, AC-015 | `delegate_task` to a catalog address (incl. task-owned helper) | Root launch cloned for all | Per-agent resolution; notes in result | DS-001 → DS-003 |
| BEH-002 | System | REQ-001..005, REQ-008; AC-004..006 | `send_message_to` bring-in | Same | Same; notes in send result message | DS-001 → DS-004 |
| BEH-003 | System | REQ-005; AC-007 | Extra copy at a collaborator address / teammate in a copy | Team-level value for all | Effective member launch from record | DS-005 |
| BEH-005 | User | REQ-009, REQ-010; AC-011..013 | Fresh team/Org start (New chat, Org launch, mobile) | Root only seeded | Members/teams seeded; notes | DS-006 |
| BEH-007 | System | REQ-005, REQ-006; AC-008, AC-009 | Reopen | Snapshot restore | Snapshot restore with per-member values; old records unchanged | DS-005 |
| BEH-008 | User | REQ-007; AC-010 | Open Settings | Configured only | Read-only collaborator/copy rows | DS-007 |
| BEH-004, BEH-006, BEH-009 | User/System | REQ-011; AC-014 | Single-agent start; configured placement; application launch | — | Unchanged | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (feature-sized).
- Current design issue found: `Yes`
- Structural triggers that fire, with evidence:
  - **Repeated coordination:** the "a team member's launch is the team's" rule is spread in seven places (six projector functions plus the identity allocator). Per-member values would otherwise need seven edits of the same fallback.
  - **Shared-structure tightness:** recorded team members cannot express their own launch. The fix adds one optional field with a singular meaning ("this member's own launch, when different from the team's") rather than duplicating the team value onto every member.
  - **Repeated coordination, on the web:** the same rule lives in four `agentSourceSelectors.ts` functions across two DTO casings (AR-001). It needs one owner per DTO casing beside its schema.
  - **Not firing:**
    - Authoritative-boundary: callers already go through `CollaboratorAdmission`.
    - Empty indirection: the resolver owns real policy.
    - Legacy cleanup: no dual path is kept.
- Root cause classification: `Duplicated Policy Or Coordination` (effective member launch) plus `Missing Invariant`. Admission never consults definition defaults: the owner is right but the rule is absent.
- Refactor needed now: `Yes` (bounded)
- Evidence: Current-State Read; investigation Source Log rows for the projector, allocator, entry builder and runnability validator.
- Design response:
  - One domain function `effectiveMemberLaunchConfiguration` replaces the seven server spreads.
  - One DTO-level function per contract package, exported beside its DTO schema, replaces the four web spreads.
  - Resolution moves out of the entry builder into `CollaboratorLaunchResolver`, which also absorbs the runnability validator.
- Refactor rationale: without the single function, every new reader would re-implement the fallback and could drift. Without merging validation into resolution, validation would check different values from those resolved.
- Intentional deferrals and residual risk:
  - Application launch baselines keep the opposite order (DEC-006; follow-up candidate).
  - UNK-001: a runtime that is installed but not logged in is only seen at its first turn.

## Terminology

- **Launch layer:** one candidate source of runtime/model/settings for an agent: `agent_default`, `team_default`, `inherited` (the run root's launch configuration).
- **Launch source:** the recorded origin of an agent's (or team's) launch values plus the skipped layers (fallbacks) with reasons.
- **Definition plan:** a collaborator plan with structure and captured definition defaults, before launch resolution.
- **Entry plan:** a definition plan with resolved launch values (the current `CollaboratorEntryPlan` shape, extended).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope:
  - `CollaboratorRunnabilityValidator` (replaced by the resolver);
  - `cloneLaunch(input.rootLaunchConfiguration)` in the entry builder;
  - the `rootLaunchConfiguration` field of `CollaboratorEntryInput`;
  - the seven inline `...defaultLaunchConfiguration` member spreads (server);
  - the four inline team-level member launch reads in `agentSourceSelectors.ts` (web).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. The optional member field is a current-schema field with a truthful absence meaning, not an old-shape branch.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume:
  - `collaborators[]` and `taskExecutions[].source` inside team, Org and standalone run execution trees, under the server-data run-history store. Shapes are in `run-execution-tree-shared-records.ts`.
  - Volume: one record per collaborator/copy; tens per run.
- Relevant code-model, serialization, semantic, or physical-store change. Optional additions:
  - `CollaboratorAgentEntry.launchSource?`
  - `CollaboratorTeamEntry.defaultLaunchSource?`
  - `CollaboratorTeamMember.launchConfiguration?` and `.launchSource?`
  - `TaskAgentExecutionSource.launchSource?`
  - `TaskTeamExecutionSource.defaultLaunchSource?`
  - `TaskTeamExecutionSource.members[].launchConfiguration?` and `.launchSource?`
- Normal reader/writer behavior and representative evidence:
  - Readers project known fields and check required-key presence only (`requireKeys`), so extra keys are ignored and absent optional fields parse.
  - Writers emit the exact current shape; key-set tests are updated.
- Required semantics and invariants under direct use:
  - Absent member `launchConfiguration` means "this member runs on the team's `defaultLaunchConfiguration`". That is exactly what every older record did, so the absence is truthful.
  - Absent `launchSource` / `defaultLaunchSource` means "source not recorded". The display shows that.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: none; no rewrite.
- Decision: `Directly Usable — No Migration`
- Decision rationale:
  - Guideline §3: adding optional fields with truthful absence needs no migration.
  - No change of meaning: `defaultLaunchConfiguration` keeps its meaning, the team's own resolved launch.
  - No new fact that only old data could supply.
  - Rewriting history has no benefit.
- Migration-guideline checklist (§2):
  1. Need: none; a tolerant reader absorbs it.
  2. Availability: unaffected; no startup work.
  3. Source/target: current released shapes inspected in the schema files; new readers accept both with and without the fields.
  4. Disposition: all existing items stay as they are.
  5. Commit: the existing atomic tree writer.
  6. Current-only boundary: no old-shape decoder; one optional field.
  7. Cost: zero extra passes.
  8. References: none new.
  9. Evidence: AC-009 restore test with a current-shape fixture without the new fields.
  10. Lessons: guideline §3; no backup or journal machinery.
- Acceptance criteria supported: AC-008, AC-009.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Admission receives definition refs + root port | Entry plans with per-agent resolved launch + sources | `CollaboratorAdmission` | The single place where defaults are honored |
| DS-002 | Bounded Local | BEH-001, BEH-002 | Definition plans + root launch | Resolved launches / `CollaboratorAddError` | `CollaboratorLaunchResolver` | Layer order, usability, fallback, batching |
| DS-003 | Primary End-to-End | BEH-001 | Agent `delegate_task` | Tool result with optional `launch_notes` | `dispatchTaskCopy` (single attachment point) / tool serializer | Copy starts on resolved values; note visible only for fresh admission |
| DS-004 | Primary End-to-End | BEH-001, BEH-002 | Agent `send_message_to` to an available address: (a) root bring-in via `ensure`; (b) a task-owned sender's helper via `taskScope.bringIn` | Send result whose `message` carries notes | `resolveMessageRecipient` → root delivery (`appendLaunchNotes`) | Bring-in note visible on both branches |
| DS-005 | Primary End-to-End | BEH-003, BEH-007, BEH-008 | Extra copy / teammate delegation / restore; the user opens a copy member's conversation | Runtime node with the member's effective launch (server); member conversation context with the same runtime/model (web) | `effectiveMemberLaunchConfiguration` (server records) and the contract packages' DTO functions (web selectors) | Recorded per-member truth reused everywhere it is read |
| DS-006 | Primary End-to-End (User) | BEH-005 | Fresh team/Org start surface opens | Draft overrides seeded and pinned; row notes; later edits/resets keep or release the pin | Web launch drafts via `seedMemberLaunchDefaults` and `memberOverrides.ts` (`pinnedModel`) | User-start part of "however started"; DEC-009 holds across edits |
| DS-007 | Primary End-to-End (User) | BEH-008 | User opens Settings | Read-only collaborator/copy rows | Web Settings via `delegatedLaunchRows` | "The run shows which configuration was used" |

## Primary Execution Spine(s)

- DS-001 / DS-003: `Agent delegate_task → Root delivery (resolveDelegationPlacement) → CollaboratorAdmission.catalogTaskSource {name, source, launchNotes} → CollaboratorEntryBuilder (definition plan) → CollaboratorLaunchResolver (entry plan) → DelegationPlacement {source, launchNotes} (catalog branch only) → RootTaskExecutionLifecycle.delegateToNewCopy → dispatchTaskCopy (outcome.launchNotes ← placement.launchNotes) → copy runtime nodes → DelegateTaskResult(+launch_notes)`
- DS-004 (a), root bring-in: `Agent send_message_to → resolveMessageRecipient → root bringInAt → CollaboratorAdmission.ensure {admitted, collaborators, launchNotes} → Builder → Resolver → IdentityAllocator → root addEntries (persist + publish) → MessageRecipientResult {resolved, placement, launchNotes} → root delivery → appendLaunchNotes → SendMessageToResult(message + notes)`
- DS-004 (b), task-owned helper: `Copy member send_message_to → resolveMessageRecipient (owner set) → taskScope.bringIn → resolveDelegationPlacement → catalogTaskSource (launchNotes) → RootTaskExecutionLifecycle.ensureTaskHelper {target, launchNotes only when this call started the helper} → {placement, launchNotes} → MessageRecipientResult → root delivery → appendLaunchNotes → SendMessageToResult`
- DS-005 (server): `delegate_task / restore → resolveCollaboratorCopySource | projectTaskExecutionSource | projectTaskSourceMember → effectiveMemberLaunchConfiguration → TeamRunAgentNode`
- DS-005 (web): `run view DTO (collaborators, task sources) → agentSourceSelectors (teamCollaboratorAgentSourceAt | teamCatalogAgentSourceAt | collaboratorAgentSourceAt | catalogSourceAt) → contract package effective-member function → member conversation context (runtimeKind, llmModelIdentifier, llmConfig)`
- DS-006: `Start surface opens (New chat team / Org launch / mobile team) → root seeded (unchanged) → seedMemberLaunchDefaults(members, teams, definitions, StartModelCatalog) → draft agentOverrides/teamOverrides + pinned addresses + launchNotes → member rows (pinned rows count as customized) → drawer edit/reset via memberOverrides (pinnedModel) → Run`
- DS-006 (mobile): `mobile setup controller selects team → teamRunConfigStore.setTemplate (sync, unchanged) → controller awaits seedMemberLaunchDefaults → teamRunConfigStore.applySeededMemberDefaults (only if the same definition is still selected)`
- DS-007: `Settings opens → run tree DTO (collaborators, open task executions, sources) → delegatedLaunchRows → RunDelegatedLaunchList (read-only)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Admission plans each requested definition. The builder captures the agent's default, or the team's default and each member's agent default. The resolver turns all new plans of the batch into entry plans with resolved launches. A failure of the inherited layer for any agent is the existing all-or-nothing `CollaboratorAddError` | Definition plan, entry plan | `CollaboratorAdmission` | Runtime availability, model validation |
| DS-002 | For each placement, candidates are agent default, then team default (team members only), then inherited. Incomplete candidates are skipped. Configured candidates need an available runtime and a valid model/settings; inherited needs today's validation only. The first valid one wins. Skipped ones become fallbacks with reasons | Launch layer, launch source | `CollaboratorLaunchResolver` | `RuntimeAvailabilityService`, `RunModelSelectionValidator` |
| DS-003 | `catalogTaskSource` returns the source plus `launchNotes` rendered from **this admission's** fallbacks. Only the catalog branch of `resolveDelegationPlacement` puts `launchNotes` on the `DelegationPlacement`; teammate placements re-projected from a recorded snapshot (`projectTaskSourceMember`) and in-run placements never carry notes. `dispatchTaskCopy` is the single attachment point: on success it copies `placement.launchNotes` (when non-empty) into the outcome, and the serializer emits `launch_notes` | Task source, placement, outcome | `dispatchTaskCopy` | Note rendering |
| DS-004 | (a) `ensure` returns admitted collaborators plus `launchNotes` for entries added by this call. (b) `taskScope.bringIn` gets `launchNotes` from `ensureTaskHelper`, which returns them only when that call (or the pending attempt it joined) dispatched a new helper; a reused helper has none. `resolveMessageRecipient` carries the notes on its resolved result. Each root's `deliverToAddress` calls the shared `appendLaunchNotes` on the accepted result | Admission result, helper result, recipient result | `resolveMessageRecipient` + root delivery | Note rendering |
| DS-005 | Every consumer that needs a member's launch calls one function: `effectiveMemberLaunchConfiguration(team, member)` on server records, or the contract package's DTO function on the web (`teamMemberLaunchConfiguration` in `@autobyteus/team-stream-contracts`, `collaborationMemberLaunchConfiguration` in `@autobyteus/collaboration-stream-contracts`). Each returns the member's own launch, else the team's. The four web selectors use it, so a copy member's conversation shows the runtime/model it actually ran on | Collaborator/copy records and DTOs | Run-history domain function; contract package functions | — |
| DS-006 | When a fresh team/Org draft opens, after the root is seeded, the seeding function resolves for each agent (agent default) and Org placed team (team default) the first usable candidate. It uses the same rule as `resolveStartModel` without the "default runtime's first model" fallback. It writes overrides for usable ones and records their addresses as **pinned**; unusable ones get notes. A pinned row keeps its own runtime/model/settings through every drawer edit (`normalizeMemberOverride(…, { pinnedModel: true })`), even when they equal the parent's. The pin is released only by the row's model reset, the row reset (`all`) or Reset all; then the row follows its parent. Copied ("+") or carried starts keep their settings and have no pins (unchanged) | Draft overrides, pinned addresses | Draft stores; `memberOverrides.ts` | `StartModelCatalog` |
| DS-007 | The Settings container projects collaborators and open task executions into read-only rows with runtime, model, source label and notes | Rows | Settings container | Label/note formatting |

## Spine Actors / Main-Line Nodes

`CollaboratorAdmission`, `CollaboratorEntryBuilder`, `CollaboratorLaunchResolver`, `CollaboratorIdentityAllocator`, the root delivery services (team/Org/standalone), `RootTaskExecutionLifecycle`, the tool serializers, web draft stores and the Settings container.

## Ownership Map

- `CollaboratorAdmission`: sequencing (plan → resolve → allocate → commit) and all-or-nothing outcome. Unchanged authority.
- `CollaboratorEntryBuilder`: the structural snapshot (layout, handoffs, addresses) plus capture of definition defaults. It no longer decides launch values.
- `CollaboratorLaunchResolver`: the launch-layer order, the usability rule, fallback recording, batched evidence and failure when nothing is usable.
- `effectiveMemberLaunchConfiguration` (run-history domain): the single meaning of a recorded member's launch.
- `launch-configuration-notes`: renders a `LaunchConfigurationSource`'s fallbacks into human text, used by both tool results.
- Web `seedMemberLaunchDefaults`: fresh-start seeding policy; the draft stores remain owners of draft state, including the pinned-address set.
- Web `memberOverrides.ts`: the normalization rule, extended with the `pinnedModel` option (a pinned member keeps its own model fields).
- Contract packages: each owns the DTO-level effective-member-launch function beside its DTO schema; `agentSourceSelectors.ts` consumes it.
- `dispatchTaskCopy`: the single attachment point of `delegate_task` launch notes.
- `launch-configuration-notes.ts`: note rendering and `appendLaunchNotes` for send results.
- Web `delegatedLaunchRows`: projects run tree DTOs into read-only rows.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Root `catalogTaskSource` / `bringInAt` (team, Org, standalone collaborators services) | `CollaboratorAdmission` | Supply the root port | Any launch resolution |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `agent-collaboration/collaborators/collaborator-runnability-validator.ts` (+ its tests) | Validation of a single root value is subsumed by per-layer resolution | `collaborator-launch-resolver.ts` | In This Change | Update the composition that constructs `CollaboratorAdmission` |
| `cloneLaunch` and the `rootLaunchConfiguration` input of `CollaboratorEntryBuilder` | The builder no longer decides launch | Resolver | In This Change | — |
| Inline `...team.defaultLaunchConfiguration` / `launchConfiguration: source.defaultLaunchConfiguration` member spreads (7 sites) | Duplicated policy | `effectiveMemberLaunchConfiguration` | In This Change | — |
| Four web member reads of the team-level launch in `autobyteus-web/services/collaborators/agentSourceSelectors.ts` (`teamCollaboratorAgentSourceAt`, `teamCatalogAgentSourceAt`, `collaboratorAgentSourceAt`, `catalogSourceAt`) | Duplicated policy (AR-001) | Contract-package effective-member functions | In This Change | Web sweep found no other site |
| Dead code in touched files | Implementation checks with search + typecheck | — | In This Change | Record evidence in the implementation handoff |

## Return Or Event Spine(s) (If Applicable)

- DS-003/DS-004 return paths: resolver sources → recorded source → outcome `launchNotes` → tool result JSON shown in the delegating conversation's tool card.
- Publication: the existing `collaborator_added` / task-execution events carry the extended DTOs (no new event kinds).

## Bounded Local / Internal Spines (If Applicable)

- Parent owner `CollaboratorLaunchResolver`:
  `collect candidates per placement → check availability once per distinct configured runtime (concurrently) → one validateMany for all candidate selections (configured on available runtimes + inherited) → per placement pick first valid → build sources/fallbacks → throw CollaboratorAddError(plan name, today's message) if a placement has no valid layer`.
  It matters because batching keeps QR-001 and keeps unrelated runtimes off the critical path (DESIGN.md rule 5).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `RuntimeAvailabilityService` (reuse) | DS-002 | Resolver | Is a configured runtime usable here | Claude's catalog does not check the executable | Duplicated availability logic |
| `RunModelSelectionValidator.validateMany` (reuse) | DS-002 | Resolver | Model offered + settings valid, shared catalog | Existing check | — |
| `launch-configuration-notes.ts` (new) | DS-003, DS-004 | Delivery/serializers | Render fallback text | Two result surfaces share wording | Divergent wording |
| `startModelDefaults.ts` candidate check (extend) | DS-006 | Web drafts | Usability of a start candidate | Same rule for start surfaces | Divergent rules |

## Ownership Boundaries

- `CollaboratorAdmission` stays the only public entry for non-user entries; roots never call the builder or resolver directly.
- `CollaboratorLaunchResolver` is internal to admission (constructed with it).
- The run-history domain owns record shapes and `effectiveMemberLaunchConfiguration`; projectors depend on it, not the reverse.
- Web draft stores own draft state; `seedMemberLaunchDefaults` is a pure function they call.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CollaboratorAdmission` (`ensure`, `catalogTaskSource`) | Builder, resolver, allocator | Team/Org/standalone collaborators services | A root calling the resolver to "re-resolve" or reading definition defaults itself | Extend admission's result |
| `effectiveMemberLaunchConfiguration` | The absence rule (server records) | Projector, allocator, restore, DTO projection | Reading `team.defaultLaunchConfiguration` for a member directly | — |
| `teamMemberLaunchConfiguration` / `collaborationMemberLaunchConfiguration` (contract packages) | The absence rule (DTOs) | `agentSourceSelectors.ts`, `delegatedLaunchRows` | Reading `default_launch_configuration` / `defaultLaunchConfiguration` for a member directly | — |
| `memberOverrides.ts` | Normalization (incl. `pinnedModel`) | `chatDraftStore`, `agentOrgLaunchDraftStore` | A store dropping or re-normalizing a pinned row's model itself | Extend the options |

## Dependency Rules

- `agent-collaboration/collaborators/*` may depend on `runtime-management/runtime-availability-service` and `llm-management` validators (already depends on the latter).
- Run-history domain must not depend on collaborators or the resolver.
- Contract packages define DTO shapes only; the server projects records to DTOs at existing projection points.
- Web: draft stores → `seedMemberLaunchDefaults` → `startModelDefaults`. No server calls added for seeding (definitions and catalogs are already loaded for start surfaces).
- Forbidden: per-root copies of resolution logic; a web-side re-resolution of delegated copies (it shows recorded values only).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CollaboratorLaunchResolver.resolve(plans: CollaboratorDefinitionPlan[], inherited: AgentLaunchConfiguration): Promise<CollaboratorEntryPlan[]>` | Launch values of new collaborators/copies | Order, usability, fallback | Plans | Throws `CollaboratorAddError` |
| `CollaboratorEntryBuilder.build(definition, {address, addedAt, addedViaAgentRunId})` → `CollaboratorDefinitionPlan` | Structure + captured defaults | — | Definition | Agent: `agentDefault`; Team: `teamDefault`, members' `agentDefault` |
| `effectiveMemberLaunchConfiguration(team: {defaultLaunchConfiguration}, member: {launchConfiguration?})` | Member launch | Absence rule | Record pair | Plus `effectiveMemberLaunchSource(team, member)` → source or `null` |
| `launchNotesOf(sources: LaunchConfigurationSourceWithName[]): string[]` | Note text | Render fallbacks only (no notes when no fallback) | Named sources | — |
| `CollaboratorAdmissionResult` (admitted) `+ launchNotes: readonly string[]` | Bring-in result | Notes of entries added by this call | — | Empty when none or for `@` resolution |
| `CatalogTaskSource` `+ launchNotes: readonly string[]` (returned by `catalogTaskSource`) | Catalog copy snapshot | Notes of this admission | — | — |
| `DelegationPlacement` `+ launchNotes?: readonly string[]` | Placement | Set only by the catalog branch of `resolveDelegationPlacement` | — | Never on re-projected snapshots or in-run placements |
| `dispatchTaskCopy` success outcome `+ launchNotes?` (from `input.placement.launchNotes`; `TPlacement` constrained structurally to `{ readonly launchNotes?: readonly string[] }`) | Delegation outcome | Single attachment point | — | No import from collaborators into execution/task |
| `RootTaskExecutionLifecycle.ensureTaskHelper` → `{ target, launchNotes? }` | Helper bring-in | Notes only when this call dispatched or joined a new helper's attempt | — | Reused helper → none |
| `taskScope.bringIn` → `{ placement, launchNotes? } \| null` | Task-scoped resolution | Carry notes | — | — |
| `MessageRecipientResult` (resolved) `+ launchNotes?` | Recipient resolution | Carry notes to delivery (both branches) | — | — |
| `appendLaunchNotes(result: AgentOperationResult, notes)` | Send result | Append notes to an accepted `message` | — | Called by the three roots' `deliverToAddress` |
| `TaskDelegationOutcome` (delegated) `+ launchNotes?` → `DelegateTaskResult.launch_notes?: string[]` | Tool result | Visible note | — | Present only when non-empty |
| `teamMemberLaunchConfiguration(team, member)` (team-stream-contracts), `collaborationMemberLaunchConfiguration(team, member)` (collaboration-stream-contracts); plus matching `…LaunchSource` functions | DTO member launch | Absence rule on DTOs | DTO pair | Used by web selectors and Settings rows |
| `normalizeMemberOverride(override, parent, options?: { pinnedModel?: boolean })`, `editMemberOverride(…, options?)`, `resetMemberOverride(…)` | Draft override | Keep a pinned member's runtime/model/settings | — | Reset `model`/`all` lets the store release the pin |
| Web `seedMemberLaunchDefaults({ members, placedTeams, getAgentDefault, getTeamDefault, catalog })` → `{ agentOverrides, teamOverrides, notes }` | Fresh-start seeding | Pure | Addresses | No default-runtime fallback |
| Web `delegatedLaunchRows(tree DTO)` → rows | Settings projection | Pure | Tree | Open task executions only |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Resolver.resolve | Yes | Yes | Low | — |
| effectiveMemberLaunchConfiguration | Yes | Yes | Low | — |
| launchNotesOf | Yes | Yes | Low | — |
| seedMemberLaunchDefaults | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Resolver | `CollaboratorLaunchResolver` | Yes | Low | — |
| Source record | `LaunchConfigurationSource` (`origin`, `fallbacks`) | Yes | Low | — |
| Tool field | `launch_notes` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime usable? | `runtime-management/runtime-availability-service` | Reuse | Same checks as the app's start surfaces | — |
| Model/settings valid | `RunModelSelectionValidator.validateMany` | Reuse | Shared catalog evidence | — |
| Layer resolution | `collaborator-runnability-validator.ts` | Replace with new resolver file | Different responsibility (choose, not just check) | Validator only checks one value |
| Web usability rule | `startModelDefaults.ts` | Extend (extract candidate check) | One rule | — |
| Settings rows | `runMemberTree.ts` | Create a sibling projector | Configured tree is editable; copies are read-only with different inputs | Mixing would blur editable/read-only nodes |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/collaborators` | Plans, resolver, notes, projector | DS-001..005 | Admission | Extend | — |
| `agent-collaboration/domain` | `LaunchConfigurationSource` type | DS-001..007 | All | Extend | — |
| `run-history` domain/store | Record fields, readers, effective-member function | DS-005 | Run history | Extend | — |
| `agent-tools/task-delegation`, `agent-team-execution/task-delegation`, `agent-communication` | Result contracts | DS-003, DS-004 | Tool surfaces | Extend | — |
| Contract packages | DTO fields | DS-007 | Web | Extend | — |
| `autobyteus-web` drafts, run-settings | Seeding, rows | DS-006, DS-007 | User | Extend | — |

## Draft File Responsibility Mapping

Covered by the final mapping below (no extraction changed the draft).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Effective member launch | `run-history/domain/run-execution-tree-shared-records.ts` | Run history | 7 sites | Yes | Yes | A place for resolution policy |
| Launch source type + parser | `agent-collaboration/domain/launch-configuration-source.ts`; parser in `run-execution-tree-shared-record-schemas.ts` | Collaboration domain / run-history store | Records, DTO projection, notes | Yes | Yes | A free-form "notes" bag |
| Fallback text | `launch-configuration-notes.ts` | Collaborators | Two tool surfaces | — | — | UI formatting for the web |
| DTO launch-source schema and effective-member functions | each contract package's DTO schema file | Contracts | One per package (case convention differs); server projection, web selectors and Settings rows share it | Yes | Yes | A second web copy of the rule |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LaunchConfigurationSource { origin: "agent_default" \| "team_default" \| "inherited"; fallbacks: { layer: "agent_default" \| "team_default"; runtimeKind: string \| null; llmModelIdentifier: string \| null; reason: "incomplete" \| "runtime_unavailable" \| "model_unavailable" \| "model_settings_invalid"; detail: string }[] }` | Yes | Yes (no duplicated launch values) | Low | Rendered text is derived, never stored |
| Member `launchConfiguration?` | Yes ("own launch, when it differs from the team's") | Yes: written only when `origin = agent_default` | Low | — |
| Member `launchSource?` | Yes: written only when the member's agent definition has a default (used or skipped); otherwise the member's source is the team's | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/domain/launch-configuration-source.ts` (Add) | Collaboration domain | — | Source/fallback types | One subject | — |
| `.../collaborators/collaborator-launch-resolver.ts` (Add) | Collaborators | Resolver | DS-002 | One policy | Source type, validators |
| `.../collaborators/launch-configuration-notes.ts` (Add) | Collaborators | Notes | Render fallbacks | One concern | Source type |
| `.../collaborators/collaborator-entry-builder.ts` (Modify) | Collaborators | Builder | `CollaboratorDefinitionPlan` with captured defaults; `CollaboratorEntryPlan` gains launch sources and member launches | Existing | — |
| `.../collaborators/collaborator-admission.ts` (Modify) | Collaborators | Admission | Call resolver; `launchNotes` in admitted result; `toTaskExecutionSource` copies sources | Existing | — |
| `.../collaborators/collaborator-identity-allocator.ts` (Modify) | Collaborators | Allocator | Use effective member launch; keep member fields | Existing | Effective-member fn |
| `.../collaborators/collaborator-source-projector.ts` (Modify) | Collaborators | Projector | Use effective member launch at all 6 sites | Existing | Effective-member fn |
| `.../collaborators/collaborator-runnability-validator.ts` (Remove) | — | — | — | — | — |
| `.../collaborators/message-recipient-resolution.ts` (Modify) | Collaborators | Resolution | Carry `launchNotes` | Existing | — |
| `.../collaborators/catalog-delegation.ts` (Modify, if needed) | Collaborators | Placement | Source carries launch sources (no logic change expected) | Existing | — |
| Composition constructing `CollaboratorAdmission` (`getCollaboratorAdmission`) (Modify) | Collaborators | — | Wire resolver with availability + validator | Existing | — |
| `run-history/domain/run-execution-tree-shared-records.ts` (Modify) | Run history | Domain | Optional fields; `effectiveMemberLaunchConfiguration`, `effectiveMemberLaunchSource` | Existing | Source type |
| `run-history/store/run-execution-tree-shared-record-schemas.ts`, `task-execution-source-schema.ts` (Modify) | Run history | Readers | Parse optional fields; `parseLaunchConfigurationSource` | Existing | — |
| `agent-collaboration/execution/task/task-delegation-command.ts` (Modify) | Task delegation | Outcome | `launchNotes?` on the delegated outcome (attached only in `dispatchTaskCopy`; see below) | Existing | — |
| `agent-tools/task-delegation/task-delegation-tool-serialization.ts`, `agent-team-execution/task-delegation/task-delegation-result-contract.ts` (Modify) | Tool contract | Serializer | `launch_notes` optional array of non-blank strings | Existing | — |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` (Modify) | Tool contract text | — | Mention `launch_notes` in the `delegate_task` description | Existing | — |
| Server record → DTO projections for collaborators and task sources (Modify) | API projection | — | Emit new optional fields | Existing | — |
| `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`, `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` (Modify) | Contracts | — | Optional fields | Existing | — |
| `autobyteus-web/utils/runSettings/startModelDefaults.ts` (Modify) | Web run settings | — | Export `usableStartCandidate(candidate, catalog)` (the existing loop body) with reason | Existing | — |
| `autobyteus-web/utils/runSettings/memberLaunchDefaults.ts` (Add) | Web run settings | Seeding | `seedMemberLaunchDefaults` | One policy | startModelDefaults |
| `autobyteus-web/stores/chatDraftStore.ts`, `stores/agentOrgLaunchDraftStore.ts`, `stores/teamRunConfigStore.ts` (mobile `setTemplate` path) (Modify) | Web drafts | Draft owners | Call seeding on fresh starts only; hold `launchNotes` | Existing | Seeding fn |
| `autobyteus-web/utils/runSettings/runMemberTree.ts`, `components/run-settings/RunMemberRow.vue` (Modify) | Web run settings | — | Optional `launchNote` on member nodes and its display; `buildTeamMemberTree` / `buildOrgMemberTree` accept pinned addresses so a pinned row counts as customized (its model field shows Reset even when equal to the parent) | Existing | — |
| `autobyteus-web/utils/runSettings/memberOverrides.ts` (Modify) | Web run settings | Normalization | `pinnedModel` option | Existing | — |
| `autobyteus-web/stores/chatDraftStore.ts`, `stores/agentOrgLaunchDraftStore.ts` (Modify) | Web drafts | Draft owners | Hold `pinnedMemberAddresses`; pass `pinnedModel` to edits; release the pin on model reset / row reset / Reset all; never copy pins into "+"/switcher drafts | Existing | memberOverrides |
| `autobyteus-web/stores/teamRunConfigStore.ts` (Modify), `composables/mobile/useMobileRunSetupController.ts` and `useMobileRunLaunchCoordinator.ts` (Modify) | Web mobile | Mobile draft | `applySeededMemberDefaults(result)` action; the controller awaits seeding after the synchronous `setTemplate` and applies it only if the same definition is still selected. No pin (this path does not normalize against the parent) | Existing | Seeding fn |
| `autobyteus-web/services/collaborators/agentSourceSelectors.ts` (Modify) | Web collaborators | Selectors | Use the contract packages' effective-member functions in all four selectors | Existing | Contract functions |
| `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`, `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts` (Modify) | Contracts | — | Export the effective-member launch/source functions beside the DTO schemas (and from each package index) | Existing | — |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-dispatch.ts`, `root-task-execution-lifecycle.ts` (Modify) | Task delegation | Dispatch | Single note attachment point; `ensureTaskHelper` result with notes | Existing | — |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/task-scoped-message-recipient.ts`, `message-recipient-resolution.ts`, `catalog-delegation.ts` (Modify) | Collaborators | Resolution | Carry notes; the catalog branch alone sets `placement.launchNotes` | Existing | — |
| The three roots' `deliverToAddress` (`team-run-message-delivery.ts`, `agent-org-run-message-delivery.ts`, `standalone-root-message-delivery.ts`) (Modify) | Communication | Delivery | Call `appendLaunchNotes` | Existing | Notes |
| `autobyteus-web/utils/runSettings/delegatedLaunchRows.ts` (Add), `components/run-settings/RunDelegatedLaunchList.vue` (Add), `components/run-settings/ExistingRunSettings.vue` / `components/workspace/config/ExistingRunConfigEditor.vue` (Modify) | Web Settings | Settings container | Read-only section | New projector + component | DTO types |
| Localization files (Modify) | Web | — | Labels: "Agent default", "Team default", "Inherited from the run", "As configured in this run", "Source not recorded", section title | Existing | — |
| Tests (Add/Modify) | — | — | See Guidance | — | — |

## Applied Patterns (If Any)

- Strategy-free ordered candidate list (no pattern framework). A plain array of layers evaluated in order inside the resolver.

## Target Subsystem / Folder / File Mapping

All paths are listed in the Final File Responsibility Mapping. New files stay inside existing folders: `agent-collaboration/collaborators`, `agent-collaboration/domain`, `autobyteus-web/utils/runSettings`, `autobyteus-web/components/run-settings`. No new folders.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-collaboration/collaborators` | Main-line domain-control + its off-spine helpers | Yes | Low | Matches existing layout |
| `autobyteus-web/utils/runSettings` | Off-spine pure policy | Yes | Low | Siblings of `startModelDefaults`, `runMemberTree` |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| PM delegates SE team; IE has Codex/Sol 6.1; team no default; PM on Claude/Opus | Recorded `source.defaultLaunchConfiguration = Claude/Opus` (`defaultLaunchSource.origin = inherited`). Member `/implementation_engineer`: `launchConfiguration = Codex/Sol 6.1` + root workspace/auto-approve, `launchSource.origin = agent_default`. Other members: no member fields | Writing Claude/Opus onto every member, or recording a member `launchConfiguration` equal to the team's | Keeps one meaning per field |
| Codex unavailable | IE: no `launchConfiguration`; `launchSource = { origin: "inherited", fallbacks: [{ layer: "agent_default", runtimeKind: "codex_app_server", llmModelIdentifier: "sol-6.1", reason: "runtime_unavailable", detail: "Codex App Server command 'codex' is not available." }] }`. Result: `launch_notes: ["implementation_engineer: its agent default codex_app_server / sol-6.1 could not be used (Codex App Server command 'codex' is not available); it runs on claude_agent_sdk / opus (inherited from the run)."]` | Failing the whole delegation; silently running on Claude | AC-005 |
| Incomplete default `{ runtimeKind: "codex_app_server", llmModelIdentifier: null }` | Skipped with `reason: "incomplete"` and a note | Picking Codex's first model (that is routing) | DEC-004 |
| Web seeding | New chat for SE team: `teamAgentOverrides['/implementation_engineer'] = { runtimeKind, llmModelIdentifier, llmConfig }` even if equal to the root, and `/implementation_engineer` in `pinnedMemberAddresses` | Seeding only when it differs from the root (the row would then move with the root, breaking DEC-009) | DEC-009 |
| Pinned row edit (AC-013 variant) | Root = Codex/Sol 6.1 (last chat model); IE seeded Codex/Sol 6.1 (pinned). The user changes IE's thinking → override keeps runtime/model + new config. The user changes the root to Claude/Opus → IE stays Codex/Sol 6.1 | `normalizeMemberOverride` dropping IE's model because it equals the root, after which IE follows Claude/Opus with Codex settings | AR-003 |
| Pinned row set to the parent's model (sub-case) | The user picks Claude/Opus for pinned IE while the root is Claude/Opus → IE keeps Claude/Opus as its own value and stays pinned; a later root change does not move it. Only Reset (model/row/all) makes IE follow. Rows without their own default keep the earlier rule (matching the parent → follows it again) | Silently unpinning when equal | Decision below |
| Teammate delegation inside a copy | The SE copy's coordinator delegates to `/software_engineering_team/implementation_engineer`, re-projected from the recorded snapshot → no `launch_notes`, even though IE's recorded `launchSource` has a fallback | Repeating the old fallback note as if new | AR-002 |
| Web member context | The PM opens IE's conversation in the delegated SE copy → context runtime/model = Codex/Sol 6.1 (from the source member's `launchConfiguration`) | Showing the copy's team-level Claude/Opus | AR-001 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `CollaboratorRunnabilityValidator` beside the resolver | Minimize change | Rejected | Resolver validates exactly what it chooses |
| Migration writing member launches into old records | "Uniform" records | Rejected | Optional field with truthful absence (guideline §3) |
| Version field on records | Tell old/new apart | Rejected | Structure-based; no version fields |
| Keep root-copy path as a flag | Safety | Rejected | Single resolution path |

## Derived Layering (If Useful)

N/A. The spine and ownership map suffice.

## Change / Refactor Sequence

1. Domain: add `launch-configuration-source.ts`, the optional record fields and `effectiveMemberLaunchConfiguration` / `effectiveMemberLaunchSource`. Update readers and their tests, including an old-shape restore fixture (AC-009).
2. Replace the seven member spreads with the domain function (behavior-neutral; existing tests pass).
3. Builder → definition plan; add the resolver; remove the runnability validator; wire composition; admission uses the resolver. Server unit tests for AC-001..AC-008 and QR-001.
4. Notes: `launch-configuration-notes.ts`; `catalogTaskSource` notes → catalog-branch `placement.launchNotes` → `dispatchTaskCopy` outcome → `launch_notes`; `ensure` and `ensureTaskHelper` notes → `MessageRecipientResult` → `appendLaunchNotes` in the three deliveries; LLM contract text. Tests: catalog copy with a fallback (notes), task-owned helper bring-in with a fallback (notes), reused helper (none), teammate delegation inside a copy whose snapshot has a fallback (none).
5. DTO packages (fields + effective-member functions) and server projections; contract tests. Switch the four web selectors to the contract functions; selector tests with a mixed-runtime team copy and a collaborator team (AC-001, AC-007 web side).
6. Web: extract the usable-candidate check; `seedMemberLaunchDefaults`; `memberOverrides` `pinnedModel`; pinned addresses in the New-chat and Org drafts; mobile async apply in the setup controller; row notes. Tests for AC-011..AC-013, including the AR-003 variant (seeded value equal to the root, a thinking edit, then a root change: the row keeps its model), the sub-case (a pinned row set to the parent's model stays pinned), and pin release on model reset, row reset and Reset all.
7. Web Settings read-only section (AC-010); localization; guards.
8. Integration: a server integration/E2E delegation using the scripted AGY runtime or test fixtures to prove mixed-runtime copies start (AC-001, AC-005). Then user verification on an isolated instance (AC-015).

## Key Tradeoffs

- **Availability check only for configured layers:** this preserves today's inherited behavior (REQ-004). The cost: an inherited runtime whose executable disappeared still fails as it does today, not earlier.
- **Notes in `send_message_to`'s free-text `message`:** this avoids a second contract change. The tradeoff is less structured than a field. Only the delegating agent and user read it, so text is sufficient.
- **Settings lists open copies only:** closed copies are stopped and removed from the run, so listing them would grow without bound.

## Risks

- UNK-001: an unauthenticated Codex/Claude passes resolution and fails at the first turn. It is surfaced as a normal run error in the copy's conversation, not as a fallback. Within the approved scope (Out of Scope: auth checks beyond availability/catalog). Recorded for validation/user verification.
- Codex catalog listing starts the Codex app server when it is a configured layer. This adds first-use latency for that delegation only (needed anyway to run on Codex).
- Contract skew between server and web is limited because they ship together. DTO fields are optional.
- Mobile seeding is asynchronous after a synchronous template. The controller applies the result only if the same team definition is still selected, so a quick switch does not apply stale seeds.

## Guidance For Implementation

- Keep `CollaboratorAddError` messages for the inherited-layer failure identical to today (AC-006, AC-014).
- Configured candidates use the root's `workspaceRootPath` and `autoExecuteTools`. `llmConfig` is the layer's own (null when absent).
- Resolution batches:
  - one availability call per distinct configured runtime (concurrent);
  - one `validateMany` over all candidate selections of the batch.
  Assert this in a unit test (QR-001).
- Writers: member `launchConfiguration` only when `origin = agent_default`; member `launchSource` only when the member's agent definition had a default (used or skipped). Team/agent-level sources are always written for new records. Key-set tests assert this.
- Notes are rendered only from fallbacks. No notes when every configured layer was used or none was configured.
- Web seeding runs only for fresh starts (not "+"/switcher copies). It uses the already-loaded definitions and `StartModelCatalog`; it must not wait for unrelated runtimes' catalogs (load only the runtimes named by member defaults).
- Tests by layer (TESTING.md):
  - server unit (resolver, builder, admission, projector, readers/writers, serializers);
  - server integration (delegation and bring-in through a root);
  - contract package tests;
  - web unit/component (seeding, stores, rows, Settings section);
  - a browser probe or isolated desktop instance for the launch form and Settings;
  - user verification for AC-015.

## Revision Notes (SR-004, response to ARCH-REV-001)

| Finding | Resolution | Sections changed |
| --- | --- | --- |
| AR-001 (High): web member-launch rule unmapped | Verified the four selectors (`agentSourceSelectors.ts:46,61,114,143`). The web sweep found no other copy/collaborator member derivation. Added a DTO-level effective-member function per contract package, used by all four selectors and the Settings rows; DS-005 is stretched to the web member context | Current-State Read, Design Health, Legacy Removal, DS-005, Ownership, Removal Plan, Boundary Map, Interfaces, File Mapping, Reusable Structures, Examples, Change Sequence |
| AR-002 (Medium): notes on the task-owned bring-in; note source unspecified | Notes are a product of fresh admission only. `catalogTaskSource` returns them; only the catalog branch puts them on the placement; `dispatchTaskCopy` is the single `delegate_task` attachment point; `ensureTaskHelper` returns notes only for a newly dispatched helper; `taskScope.bringIn` → `MessageRecipientResult` → `appendLaunchNotes` in the three deliveries | DS-003, DS-004, Interfaces, File Mapping, Examples, Change Sequence |
| AR-003 (Medium): normalization undoes seeded rows | Draft-held pinned addresses plus `normalizeMemberOverride(…, { pinnedModel })`; pinned rows count as customized; the pin is released by model reset, row reset or Reset all; mobile needs no pin (its path does not normalize against the parent) and gets an async apply in the controller | Current-State Read, DS-006, Ownership, Boundary Map, Interfaces, File Mapping, Examples, Change Sequence, Risks |
| AR-003 sub-case | **Decision (Solution Designer, within DEC-009 / REQ-010):** a seeded row stays pinned even when the user sets it to the parent's model; only Reset makes it follow. Reasoning: REQ-010 names Reset as the way a seeded member follows its parent, and DEC-009 makes the member row the explicit per-member choice. Silently unpinning on equality would let a later root change move a member the user just set explicitly. Rows without their own default keep the earlier rule unchanged, so no approved behavior changes | Examples |
| Non-blocking: mobile `setTemplate` is synchronous | Async seeding lives in the mobile setup controller (`applySeededMemberDefaults`) | File Mapping, Risks |
| Non-blocking: requirements housekeeping | Requirements Document Status revision ID and the AC-002 wording corrected (editorial; no behavior change) | requirements-doc.md |

The classification is unchanged: `Large` / `High`.

## Revision Notes (SR-005, reopened: switcher starts must seed members)

**Defect.** DS-006 said "Copied ("+") or carried starts keep their settings and have no pins". The implementation followed it:
- `chatDraftStore.retarget` (New-chat heading switcher) and `startForDefinition` with `carried` never seed;
- `agentOrgLaunchDraftStore.prepare` skips `seedMembers` when the model was carried.

Carried settings describe only the root (workspace, approval, composer runtime/model/config); member overrides are reset by the switcher (REQ-019 of the earlier New-chat ticket). The new target's members therefore receive neither their own defaults nor any carried value. That contradicts REQ-009 / AC-011 and DEC-009 (the top selection applies only to members without their own default). Evidence: investigation-notes → Reopen Investigation.

**Corrected rule (DS-006).** Member seeding runs on every start that does not copy an existing run's member settings:

| Start | Root | Members |
| --- | --- | --- |
| Run on a definition (fresh) | Definition default → last chat model → default runtime (unchanged) | Seeded + pinned (unchanged) |
| Heading switcher in New chat → Team (`retarget`) | Kept (carried, unchanged) | **Seeded + pinned for the new team** (after the existing reset) |
| Org page switcher → Team (`startForDefinition` with `carried`) | Carried (unchanged) | **Seeded + pinned** |
| New-chat switcher → Org (`agentOrgLaunchDraftStore.start` with `carried`) | Carried (unchanged) | **Placed teams and agents seeded + pinned** |
| "+" on a Team run (`copied`, `teamAgentOverrides` from the run) | Copied | Copied as recorded; **no seeding** (unchanged) |
| "+" on an Org run (`sourceOrgRunId`) | Copied | Copied; **no seeding** (unchanged) |

**Changes (web only):**
- `autobyteus-web/stores/chatDraftStore.ts`:
  - `retarget`: after resetting overrides/pins/notes for a Team target, start the existing `seedTeamMembers(current)`. It already guards against a later retarget or discard via the team-ID and `drafts.includes` checks, and keeps edits made meanwhile.
  - `startForDefinition`: when `options.carried` applies (and `options.copied` does not), also run `seedTeamMembers(next)` alongside `loadCarriedStart`.
  - The team's member definitions must be loaded first: `seedTeamMembers` needs `agentTeamDefinitions` and `agentDefinitions`. Await `ensureTargetDefinitions(target)` before seeding (it is already loaded on these paths, but make it explicit).
- `autobyteus-web/stores/agentOrgLaunchDraftStore.ts` `prepare`: when `modelCarried && !copied`, run `seedMembers(target, selected, references)` together with `loadCarriedRuntimes(target)`. `copied` (an Org run "+") stays unseeded.
- No server, contract or persistence change. The existing pin semantics (`memberOverrides.ts` `pinnedModel`, release on model/row/all reset) apply unchanged.

**Tests (extend the existing specs):**
- `stores/__tests__/chatDraftStore.spec.ts`:
  - (1) Retarget from an Agent draft with typed text to a Team whose members have usable defaults → those members are seeded and pinned, the root and the text are kept, and the row reads as customized.
  - (2) Retarget Team A → Team B → B's seeds only, none of A's.
  - (3) Retarget to a team, then quickly to an agent → no late seeds applied.
  - (4) Carried `startForDefinition` for a Team → seeded.
  - (5) Copied `startForDefinition` with `teamAgentOverrides` → unchanged, no seeding.
- `stores/__tests__/agentOrgLaunchDraftStore.spec.ts`: a carried start seeds placed teams and agents; an Org "+" copy does not.
- Browser probe (`test:e2e` DLP suite): add a case. Plain New chat → type text → heading switcher → a team with member defaults → Member settings shows the seeded rows. This is the user's exact journey (screenshot 37).

**Classification of this revision:** `task_size=Small` (two web stores and their tests plus one probe case, within existing ownership), `architectural_risk=Low` (no contract, persistence, security, concurrency or ownership change; it reuses the existing seeding function and pin rules). Escalation trigger: any need to change seeding policy, pin semantics or server behavior → return to Solution Designer.

## Revision Notes (SR-006, reopened: collaborators and copies in Settings use the collapsible member rows)

**Problem.** DS-007 rendered collaborators and copies with a separate component, `RunDelegatedLaunchList.vue`: a flat, always-expanded list. The same Settings page shows the run's configured members with the collapsible `RunMemberRow` (since `d45fe62bc`), and the pre-run Member settings drawer uses the same rows. That makes the section long (six rows per SE team copy, several copies) and inconsistent. REQ-007/AC-010 are refined by the user's request (requirements SR-006).

**Target (DS-007 revised).** Render the section with the existing `RunMembersSection` / `RunMemberRow` in `read-only` mode, as a second section under "Members", titled "Collaborators and delegated copies" with its existing description.
- **One node per collaborator/copy, collapsed by default.** Expansion is local to the section (its own `expandedKeys`, empty on open) and identical for running and stopped runs. Nothing auto-expands.
- **Team copy/collaborator** = a `kind: 'team'` node.
  - Collapsed summary: its team-level runtime/model plus source label.
  - Badge: "Delegated copy" / "Collaborator", in the chip slot the Coordinator chip uses.
  - When any member has a fallback note, the collapsed summary shows a warning count ("N notes"), so a fallback stays visible without expanding.
  - Expanding shows its team-level note (if any) and its agents as child rows.
  - Each child row is itself collapsed, with summary `model · runtime · source`, and expands to the read-only settings card.
- **Agent copy/collaborator** = a `kind: 'agent'` node.
  - Summary: `model · runtime · source`; its notes are on the `launchNote` line.
  - Expanding shows the read-only settings card (model, thinking, fast mode, approval).
- Notes:
  - A team-level fallback note is shown once, on the team node, and is no longer repeated on each member (this resolves follow-up O-2 here).
  - A member's own notes stay on that member.
- Names: as in Members (`role || last address segment`). Follow-up O-3 is unchanged.
- **Same look as the team's own Members list (user confirmation, 2026-10-12).** The user compared the design to a stopped Team run's Team Configuration (Members: initials avatar, name, Coordinator chip, `model · runtime · approval`, chevron) and asked that copies look the same. Requirements:
  - A copy's member nodes carry `isCoordinator` from the copy's/collaborator's `coordinatorAddress`, so the copy's coordinator shows the Coordinator chip.
  - Member summaries use the same `model · runtime · approval` summary as configured members, followed by the source label.
  - An expanded team copy shows its read-only team settings card, then the "Members" sub-list (the existing `RunMemberRow` team layout).

**Changes (web only):**
- `autobyteus-web/utils/runSettings/delegatedLaunchRows.ts`: project into `RunMemberNode[]` (read-only), or a new adjacent projector `delegatedLaunchNodes` reusing `memberNode`/`values` from `runMemberTree.ts`. Carry `badge`, `sourceLabelKey` and notes. Keep the contract-package effective-member functions as the only member-launch rule.
- `autobyteus-web/utils/runSettings/runMemberTree.ts`: `RunMemberNode` gains optional `badge` (`'delegated_copy' | 'collaborator'`), optional `sourceKey` (`DelegatedLaunchSource`) and `launchNotes` (string list; keep the single-note `launchNote` behavior for launch rows by mapping it to a one-item list, without duplicating fields).
- `autobyteus-web/components/run-settings/RunMemberRow.vue`: render the badge, the source label after the summary, a child-note count on collapsed team rows, and multiple notes. Read-only rows have no reset button (unchanged).
- `autobyteus-web/components/run-settings/ExistingRunSettings.vue`: replace `<RunDelegatedLaunchList>` with a second read-only `<RunMembersSection>`.
- `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue`: pass the nodes.
- **Remove** `autobyteus-web/components/run-settings/RunDelegatedLaunchList.vue` and its tests. Update its probe assertions (DLP-003/004/006/007) to expand before reading member rows.
- Localization: the badge labels and source labels already exist (`runSettings.delegated.*`); add one key for the note count.
- No server, contract or persistence change.

**Tests:**
- Component tests: the collapsed by default and a chevron toggle; a team expanding to members and a member expanding to its settings card; the same rendering for an active and a stopped run; the note count on a collapsed team; a team note shown once.
- Browser probe: update the DLP cases that read Settings rows, plus one case asserting a collapsed-by-default list with a stopped and a running run.

**Classification (SR-005 + SR-006 together):** `task_size=Medium` (two launch stores, settings projection and row component, one removed component, tests and probe updates; within existing web ownership), `architectural_risk=Low` (presentation and draft logic only; no contract, persistence or server change). Direct route.
