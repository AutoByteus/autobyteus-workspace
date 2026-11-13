# Design Spec — running agents take skills added to their configuration (autobyteus-460)

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (SR-003 revised for ARCH-REV-001: AR-001 … AR-004; SR-004 for implementation DI-001)
- Approved requirements baseline: `requirements-doc.md` at SR-002, approved by the user on 2026-11-13 in the Solution Designer's conversation (references in the requirements doc's Document Status).
- Behavior-defining supplements: none.
- User approval of the design, when the direction requires it: the Task says "the user approves the direction before the build". The user approved the direction (DEC-001: message plus setup on add; DEC-004; DEC-005; DEC-007) and said "start your work". The user was told the design would go to the build without another approval unless it went beyond the described direction. It does not. `Obtained` (direction, 2026-11-13).
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/running-agent-config-reload-460/investigation-notes.md`
- Authorities read (2026-11-13): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md` (repository root). No closer `DESIGN*.md` under `autobyteus-server-ts`. `references/design-examples.md` not used.
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

- A run takes its agent definition at **activation** (new run or resume). Skills are set up then:
  - links into the workspace skill folder (Claude `.claude/skills`, Codex `.codex/skills`, Grok `.grok/skills`, DeepSeek `.dsh/skills`) through the process-wide `WorkspaceSkillMaterializer` per runtime (`backends/shared/workspace-skill-materializer.ts`);
  - Antigravity: links into its per-run capsule (`antigravity/capsule/agy-run-capsule.ts:33-76`);
  - native: a catalog in the system prompt (`autobyteus-ts/src/agent/system-prompt/append-configured-skills-catalog.ts`).
- Each backend keeps the links it holds in one list, and its cleanup releases that list when the run ends:
  - Claude: `runtimeContext.materializedConfiguredSkills`, released by `claude-session-cleanup.ts:31`;
  - Codex: `runtimeContext.materializedConfiguredSkills`, released by `codex-thread-manager.ts:133`;
  - ACP: `owner.skills`, released in `acp-agent-run-backend-factory.ts:96`.
- The skill notice subsystem (`skill-update-notices/`) tracks every published run (`runPublished`/`runReleased`) and its seen record. It binds each run to the definition read once at tracking (`skill-update-notices.ts:43-52`) and notices only content changes. A restored run silently records skills it never saw as seen (`run-skill-tracker.ts:182`).
- The tool list subsystem (`tool-list-updates/`, autobyteus-324) already does the live pattern this ticket needs:
  - it subscribes to `AgentDefinitionChangeSignal` (`agent-definition-change-signal.ts`);
  - one coalesced pass re-reads each tracked run's definition by ID (`tool-list-update-service.ts:150-215`);
  - it calls `AgentRun.applyDefinitionTools`, which each backend implements, and notifies from the seen-record diff.
- Integration grants and shell variables are set when a runtime session is prepared (`integration-run-access.ts:27-43`, callers listed in investigation notes); withdrawal is per call (`integration-access-rule.ts:57-67`).
- No structural problem in these owners. The gap is a missing behavior: skill names are frozen per run.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: three subsystems change.
  - The skill notice subsystem: a definition-change pass, the tracker re-bound to the current definition, an "added" notice kind, and the resume rule.
  - Five runtime backends plus `AgentRun` and the backend interface: a new `applyDefinitionSkills`, one shared per-run skill owner, the Codex planner extracted from its bootstrapper, and Antigravity capsule links and manifest.
  - The credential proxy (one read method) and the host composition.
  - About 20 production files and their tests.
- Architectural risk: `High`
- Risk rationale:
  - A new lifecycle path acquires shared workspace links **while a run is active**, racing with its release. The process-wide materializer registry, cleanup ownership and rollback are involved.
  - It adds a method to the backend contract that every runtime implements.
  - It changes the restored-run notice rule (persisted seen-record semantics).
  - It reads integration grant state for user-visible text, which is security-adjacent though nothing is granted.
- Escalation trigger: a release path of a run's workspace links that cannot call `RunWorkspaceSkills.release()` first; a materializer change beyond calling `materializeConfiguredWorkspaceSkills`; any need to grant integration access mid-run. Each returns to the Solution Designer as `Design Impact` (the last as `Requirement Gap`).

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `tool-list-updates/services/tool-list-update-service.ts:150-215`; `docs/modules/tool_list_updates.md` | Signal → coalesced pass → re-read definition by ID → `AgentRun.applyDefinitionTools` → seen diff → notice | Same shape for skills, owned by the skill notice service | — |
| Code | `skill-update-notices/skill-update-notices.ts:43-52`; `run-skill-tracker.ts:8-14, 132-145, 171-190` | Definition read once; names re-resolved through that definition only; restored run seeds unseen names as seen | Tracker holds the run's current definition; resume rule changes (DEC-002) | — |
| Code | `skill-update-notices/services/skill-version-diff.ts:10-16` | No seen version + current snapshot yields "updated" with every file "added" | New `added` change kind | — |
| Code | `backends/shared/workspace-skill-materializer.ts` `materializeConfiguredWorkspaceSkills` (`onAcquired`, `assertAccepting`, rollback of receipts; `releaseMaterializedSkill` idempotent via `releasedHolders`) | The bootstrap guard pattern works for any caller | Mid-run additions reuse it unchanged, guarded by `RunWorkspaceSkills.closed` (DS-003; not `isActive()`, AR-001) | — |
| Code | Claude `claude-session-bootstrapper.ts:80-95` (expose-resolved for every binding); ACP `acp-agent-run-backend-factory.ts:151-160` (same); Codex `codex-thread-bootstrapper.ts:383-437` (plans with `skills/list` so a copy Codex discovers itself is not linked again) | Request planning differs only for Codex | One shared per-run owner with Codex's planner passed in | — |
| Code | `antigravity/capsule/agy-run-capsule.ts:33-118`, `agy-configured-skill-linker.ts` | Capsule links + manifest; restore validates manifest skills | Antigravity adds links with its linker and rewrites the manifest atomically | — |
| Code | `credential-proxy/run-pass-registry.ts`, `integration-access-rule.ts:44-55`, `integration-catalog.ts:152-155` | Grants per run in the registry; rule-based grants per definition; catalog names integrations | A read method for "access starts at restart" | — |
| Probe | `evidence/claude-skill-hot-reload-probe*` | Claude lists a folder linked mid-session at the next turn, **when `.claude/skills` existed at process start** (the probe's starting state) | REQ-008 value for Claude | Others: U-001 |
| Live (implementation, DI-001) | `evidence/live/IMP-07…09-*.json` (Claude CLI 2.1.323) | No `.claude/skills` at process start → an added skill is never listed (`Unknown skill`); one skill at start, or an empty folder at start → listed (`Launching skill`). The notice path works in all three (AC-002) | Claude preparation ensures `<workspace>/.claude/skills` exists (SR-004) | — |
| Code | `compositions/platform-notice-sources.ts:19-33`; `build-studio-server.ts:311, 331` | Notice sources built after the credential proxy host; standalone host has none | Pass `integrationRunAccess` (nullable) into skill notices | — |

## Intended Change

When an agent definition changes:
- the skill notice subsystem re-reads every tracked run's definition;
- for added skill names, it asks the run's backend to set the skill up for its runtime (links; native nothing);
- it tells the agent once: "now available" (description, `SKILL.md` path, and, for an integration it cannot use yet, that access starts at restart) or "no longer available".

A resumed run hears additions and removals since its seen record.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Areas:
  - `skill-update-notices/` (service, tracker, diff, builder, types, composition);
  - `agent-execution/domain/agent-run.ts` and `backends/agent-run-backend.ts` (new method);
  - the five backends: Claude, Codex, ACP for Grok and DeepSeek, Antigravity, and native (a no-op);
  - `backends/shared/` (new per-run skill owner, the single holder of a run's workspace links), with the preparation and release paths of Claude, Codex and ACP moved onto it, and `ProviderPreparationGuard.ownSkill` removed;
  - Codex planner extraction;
  - `credential-proxy/` (one read);
  - `compositions/platform-notice-sources.ts` and the two hosts' calls;
  - module docs.
- Derived consumers: `seen_skill_versions.json` — same shape and readers; the meaning of "seen" for resumed runs changes (DEC-002; see the persisted-data decision). The web notice card is driven by the text header and sender, both unchanged.
- Deliberately left alone:
  - tool list updates (BEH-003);
  - the skill folder watcher and content diff;
  - `WorkspaceSkillMaterializer` internals;
  - native system prompt (FU-006);
  - unlinking on removal (FU-007);
  - Antigravity restore re-linking (FU-002);
  - shared workspace folders (FU-001);
  - catalog-only triggers (FU-004);
  - instructions and semantic memory (FU-005);
  - the GitHub skill's wording (FU-003);
  - live integration access (DEC-004).
- Follow-ups: FU-001 … FU-007.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 002, 004, 008; AC-001, 002, 005, 009, 011, 012 | Skill added to a definition (agents page or package folder) | Frozen per run (investigation BEH-001) | Setup on the runtime, then one "now available" notice | DS-001, DS-003 |
| BEH-002 | User | REQ-001, 003; AC-003 | Skill removed | Frozen per run | One "no longer available" notice; nothing unlinked | DS-001 |
| BEH-005 | User | REQ-005; AC-006 | Integration skill added | No access, nobody told | Notice says access starts at restart; no grant | DS-001 (DS-004 read) |
| BEH-008 | User | REQ-006; AC-008 | Message to a stopped run after skill changes | Unseen skills silently recorded as seen | Notice with the first input | DS-002 |
| BEH-003/004/006 | — | REQ-007; AC-004, 007, 010 | — | Live tools; content notices; per-call withdrawal | Preserved | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `evidence/claude-skill-hot-reload-probe.mjs` + output | Claude CLI picks up a linked folder mid-session | REQ-008, AC-011 | Justifies linking before the notice; API/E2E can reuse it | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Structural triggers that fire:
  - **Repeated coordination** (Principle 13): Claude, Codex, Grok and DeepSeek would each "resolve bindings, keep new names, guard against release, acquire, push into the held list, log failures". Response: one owner, `RunWorkspaceSkills` (shared), with Codex's request planning passed in as a planner (a question the owner asks, not a step of another sequence).
  - **Capability-area reuse** (Principle 4): the definition-change pass reuses `AgentDefinitionChangeSignal` and the tools pattern; the notice reuses the skill notice owner, seen record, delivery paths and card.
  - **Several kinds** (Principle 1): runs are standalone, team members or delegated copies (all published through `AgentRunManager`, tracked alike), on six runtimes (each row in the file mapping). Activation kinds are new and restored.
  - **Backward dependency** (Principle 9): the notice service calls into `AgentRun` (execution). This is the same direction the tool list service already uses; `agent-execution` still never imports `skill-update-notices`.
  - **Empty indirection** (Principle 13): `AgentRun.applyDefinitionSkills` forwards to the backend, as `applyDefinitionTools` does. It is the run's public boundary (active check), not an empty layer. `RunWorkspaceSkills` owns state (applied names) and policy, so it is not empty either.
  - **Behavior by absence** (Principle 13): "removed" is decided by an explicit comparison of the definition's names against the seen record, not by a failed lookup. The integration sentence comes from an explicit rule (granted by definition, not held by the run).
  - Ruled out: persisted-data transition (shape unchanged); shared structure looseness (one new change kind).
- Deliberate deviations:
  - Principle 15 (name fits content): the subsystem is called "skill update notices", yet it now also asks backends to set up added skills. Renaming the folder and its docs would be churn across two subsystems for no behavioral gain. Its module doc states the wider scope, and the tool list subsystem already does both (apply and notify) under an "updates" name. Recorded; not renamed.
- Root cause classification: `No Design Issue Found` (the behavior did not exist; the owners absorb it).
- Refactor needed now: `Yes`.
  - Extract Codex's skill request planning from `codex-thread-bootstrapper.ts` (437 lines) into its own file, so bootstrap and mid-run use one planner.
  - (SR-003, AR-001) Make `RunWorkspaceSkills` the single holder of a run's workspace links from preparation to release, replacing the preparation lists (`guard.ownSkill`, factory `skills` arrays, ACP `owner.skills`) and the run-context lists (`materializedConfiguredSkills`). Without one holder, a mid-run add cannot be ordered against release (design case 22).
- Evidence: `codex-thread-bootstrapper.ts:89-120, 383-437`.
- Design response: see the file mapping.
- Intentional deferrals: FU-001, FU-002, FU-004, FU-005, FU-006, FU-007.

## Terminology

- **Activation**: a run is prepared from its definition: new, or resumed (restore). (GLOSSARY uses "activation" for run passes at line 282, the same meaning.)
- **Seen record**: the skill versions a run was last told about (`seen_skill_versions.json`), existing term.
- **Set up a skill** (for a runtime): what activation does today, called "materialize" in code (`WorkspaceSkillMaterializer`). Code keeps the existing word.
- No new domain words. GLOSSARY.md needs no entry.

## Legacy Removal Policy (Mandatory)

- Obsolete paths:
  - the "bound once to its activation definition" rule (`skill-update-notices.ts:43-52`, `RunSkillSource` doc in `run-skill-tracker.ts:8-14`);
  - the restored-run seeding of unseen names (`run-skill-tracker.ts:182`).
  Both are replaced, not kept beside the new rule.
- Compatibility wrappers, dual paths or fallbacks kept: `None`.

## Persisted Data / State Transition Decision

- Stored subject: `<memoryDir>/seen_skill_versions.json` per run, `{ skills: { name: { skillDir, skillMdPath, files } } }`, about 1–5 KB.
- Change: no shape change. A name is written when the run was told about it, as now. New: a resumed run whose record lacks a skill it now has is told about it ("added") instead of silently recording it.
- Readers and writers: `SeenSkillVersionsStore` read/write, `RunSkillTracker` only writer (unchanged).
- Semantics under direct use: records written before this change hold exactly the skills those runs were given at activation, or were told about. The PM's record (project-task-management, github-integration) is an example. Reading them under the new rule announces only skills added since. A missing record still means "has seen its current skills".
- Decision: `Directly Usable — No Migration`.
- Rationale: same shape; the new reading is the intended meaning (DEC-002).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 005 | Definition saved | Agent told, runtime set up | `SkillUpdateNoticeService` | The live path |
| DS-002 | Primary End-to-End | BEH-008 | Restored run published | First input carries the notice | `SkillUpdateNoticeService` + `RunSkillTracker` (load) | Resume rule |
| DS-003 | Bounded Local | BEH-001 | `AgentRun.applyDefinitionSkills` | Links held by the run | Each backend; `RunWorkspaceSkills` for four of them | Mid-run setup and its lifecycle |
| DS-004 | Bounded Local | BEH-005 | Notice built for added names | Integration sentence | `IntegrationRunAccess` | Honest integration text |

## Primary Execution Spine(s)

- DS-001:
  `Agents page / package reload → AgentDefinitionChangeSignal → SkillUpdateNoticeService (coalesced pass) → AgentDefinitionService.getAgentDefinitionById(run's id) → RunSkillTracker.applyDefinition (names diff) → AgentRun.applyDefinitionSkills → backend (DS-003) → SkillUpdateNoticeService.deliverIfBusy / takePreface → computeNotice (+ IntegrationRunAccess, DS-004) → AgentRun.postUserMessage or next input → runtime → SYSTEM_TASK_NOTIFICATION → web "Skill updated" card`
- DS-002:
  `AgentRunManager (restore) → runPublished → RunSkillTracker.loadRun (stored record, no seeding) → dirty names → takePreface on the first input → computeNotice → combined input`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Every definition save fires the signal. The service runs one pass (a signal during a pass asks for exactly one more) over tracked runs. Runs still being tracked are waited for first, as tools do. For each run it reads that run's definition by ID; a missing definition leaves the run unchanged. The tracker replaces the run's definition and re-resolves its skills. In its own terms: **added** = a name that resolves now and was not a tracked name with a folder before this pass (absent from `skillDirs`, or mapped to null); **removed** = a tracked name with a folder before this pass that no longer resolves (its `skillDirs` entry becomes null). Whether the agent hears anything is decided later, at delivery, by the existing diff against `seen` (an added name with no seen version → `added`; a null folder with a seen version → `removed`; anything else → nothing). Setup state is not the tracker's: the backend's add is idempotent by its own applied names. If names were added and the run is active, the service awaits `run.applyDefinitionSkills(definition)`; a rejection is logged and the pass goes on. It marks added and removed names dirty, syncs the watch set and delivers as for content changes: busy now, idle with the next input. | definition, run, skill names, notice | `SkillUpdateNoticeService` | tracker, snapshotter, watcher, integration access, builder |
| DS-002 | A restored run's stored record is the authority. Current skills not in it are dirty (announced as added), seen skills no longer resolved are removed, and changed files are updated, all in one notice with the first input. No record: current skills recorded as seen, no notice (unchanged). | run, seen record | `RunSkillTracker` (load), service (delivery) | store |
| DS-003 | For Claude, Codex, Grok and DeepSeek, `RunWorkspaceSkills` is the run's **single holder of its workspace skill links, from preparation to release**. It is created when preparation starts; preparation acquires through it (`acquire`), mid-run additions go through it (`addFrom`), and every release path (failed preparation and run end) calls its `release()`. `addFrom(definition)`: resolves bindings, keeps resolved names not in its applied set, plans requests (default `expose-resolved`; Codex: its planner), then acquires **one name at a time**. Each call to the materializer has `onAcquired` adding to the held list and `assertAccepting` throwing when `closed` is set. A name that fails is logged and left out of the applied set, so the next save retries it; the others go on (AR-002). Adds run one after another (one in-flight add at a time). `release()` sets `closed` synchronously, awaits the in-flight add (which stops at its next `assertAccepting`, and the materializer rolls back that receipt), then releases every held link; it is idempotent. The guard reads `closed`, never the backend's `isActive()` (AR-001: on Claude and Codex that stays true until cleanup ends). On Claude, the folder `.claude/skills` exists from preparation on (SR-004), so the CLI watches it even for a run that started with no skills. Antigravity links into its own capsule, one name at a time, adds serialized. It needs no release ordering: the capsule is per run, never shared, and kept for resume (`agy-run-capsule.ts:24-31, 91-118`), so a link written while the run stops is the run's own and matches its definition at the next resume. Its `active` flag also turns false on an interrupt (`agy-agent-run-backend.ts:121`), so it is not used as a guard; `AgentRun` rejects an inactive run before the backend is called. The manifest is rewritten with the names that succeeded. Native does nothing. Failures never fail the run. | definition, skill links | `RunWorkspaceSkills` (four runtimes); AGY backend | materializer, planner, capsule linker |
| DS-004 | For added names, the builder asks `IntegrationRunAccess.integrationsStartingOnRestart(run, names)`. That compares the integrations the definition grants (the autobyteus-337 rule) with those the run's pass holds, and returns the names of granted integrations whose skill was added and that the run lacks (e.g. "GitHub"). | run, grants | `DefaultIntegrationRunAccess` | catalog, pass registry, access rule |

## Spine Actors / Main-Line Nodes

`AgentDefinitionChangeSignal`, `SkillUpdateNoticeService`, `RunSkillTracker`, `AgentRun`, the run's backend, `AgentRunPlatformNotices` / `AgentRun.postUserMessage`.

## Ownership Map

- `SkillUpdateNoticeService`: the whole skill sequence for a run: when to apply, the order (setup before notice), what to tell, delivery, the coalesced pass and its closing.
- `RunSkillTracker`: each run's current definition, its resolved skills (name → folder and description, or null), its seen record, the watch set. Still the only writer of seen versions.
- `AgentRun.applyDefinitionSkills`: the public boundary; rejects an inactive run.
- Backend: what "set up" means for its runtime and which links the run holds.
- `RunWorkspaceSkills`: for one run, every workspace skill link it holds (from preparation to release), its applied names, the add-only policy, its `closed` fact and its single in-flight add. It decides the order "close, wait for the add, release"; no runtime release path reads a held list itself any more.
- `IntegrationRunAccess`: which integrations the run may use and holds (unchanged role; one read added).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRun.applyDefinitionSkills` | backend | Run boundary (inactive check), as `applyDefinitionTools` | Diffing, notices |

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `RunUsedSkillsResolver` / `RunSkillSource` (definition read once, `run-skill-tracker.ts:8-17`; `skill-update-notices.ts:43-52`) | The run's definition changes | Tracker stores the definition; resolution takes it as an argument (`resolveSkills(definition)`) | Doc comments updated |
| Seeding unseen names on restore (`run-skill-tracker.ts:182`) | DEC-002 | Dirty names announced as added | Only when a record exists |
| `ProviderPreparationGuard.ownSkill`; Claude and Codex factory `skills` arrays; ACP `owner.skills`; `materializedConfiguredSkills` in the Claude and Codex run contexts | One holder per run (AR-001) | `RunWorkspaceSkills` | Each release path calls `release()` |
| Codex planning helpers inside `codex-thread-bootstrapper.ts` (`canonicalSkillDirectory`, `collectDiscoverableSkillPaths`, `planWorkspaceSkillRequests`) | Moved, not duplicated | `codex/codex-workspace-skill-request-planner.ts` | Bootstrapper calls it |

## Return Or Event Spine(s) (If Applicable)

Delivery: forwarded → `SYSTEM_TASK_NOTIFICATION` published → seen recorded (unchanged mechanics, `skill-update-notice-service.ts` `deliverIfBusy` / `prefaceDelivered`).

## Bounded Local / Internal Spines (If Applicable)

- The pass loop in `SkillUpdateNoticeService` (parent: service). The `passRunning` / `passRequested` loop is exactly as in `tool-list-update-service.ts:150-166`.
  Chain: `signal → pass → for each tracked run (await tracking in progress) → read definition → tracker.applyDefinition → apply skills if added → mark dirty → deliverIfBusy`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillsForAgent` | DS-001/002 | tracker | Effective skills (configured, `ALL_INSTALLED`, bundles, disabled excluded) | One resolution rule | Re-implementing scope rules |
| `SkillFolderSnapshotter` | DS-001/002 | service | Snapshot of added skill (becomes its seen version) | Content notices later diff from it | — |
| `skill-update-notice-builder.ts` | DS-001 | service | Text for added/removed/updated | Single text owner | — |
| `WorkspaceSkillMaterializer` (unchanged) | DS-003 | `RunWorkspaceSkills` | Shared links, holders, rollback | Shared-folder safety | Duplicating link logic |
| Codex skill request planner | DS-003 | Codex bootstrap and `RunWorkspaceSkills` | Discoverable vs expose | D-19 duplicate avoidance | Divergent rules at start vs mid-run |
| `linkAgyConfiguredSkills` + manifest write | DS-003 | AGY backend | Capsule links | Per-run capsule | — |
| `IntegrationRunAccess.integrationsStartingOnRestart` | DS-004 | service (builder input) | Integration names granted by rule but not held | Honest text | Granting by accident |

## Ownership Boundaries

- `skill-update-notices` uses `AgentRun` public methods only (`applyDefinitionSkills`, `postUserMessage`, `publishEvent`, `getStatusSnapshot`, `config`, `isActive`). It never reaches a backend or materializer.
- Backends own setup; they never diff or notify (same rule as tools).
- `IntegrationRunAccess` stays the single entry point for integrations. The notice subsystem never reads the pass registry or catalog directly.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `AgentRun` | backend, `RunWorkspaceSkills`, materializers | skill notice service | Service calling a materializer or backend | Add to `AgentRun` |
| `IntegrationRunAccess` | access rule, pass registry, catalog | skill notice service | Service reading `RunPassRegistry` | Add a read to the interface |
| `RunSkillTracker` | store, resolution | service | Service writing the store | — |

## Dependency Rules

- `skill-update-notices → agent-execution (AgentRun), agent-definition (service, signal), skills, credential-proxy (IntegrationRunAccess type)`. Forbidden: `agent-execution → skill-update-notices`; backends → notice code.
- Collaborators are passed in:
  - `createSkillUpdateNotices({ agentDefinitionService, definitionChanges, integrationRunAccess: IntegrationRunAccess | null, … })`, called from `createPlatformNoticeSources`, which gains `integrationRunAccess` from each host: studio `credentialProxyHost.runAccess` (`build-studio-server.ts:311` is before `:331`), standalone `null` (no proxy: no integrations, so no sentence; explicit null, not a lookup).
  - Backends get their `RunWorkspaceSkills` (or AGY capsule data) from their factory at construction.
- Existing process-wide lookups used, not added: `getClaudeWorkspaceSkillMaterializer()` and its peers, and `SkillService.getInstance()` (already used by factories and bootstrappers; the factory passes the instances into `RunWorkspaceSkills`). No new binding.

## Interface Boundary Mapping

| Interface / Method | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunBackend.applyDefinitionSkills(definition: AgentDefinition): Promise<void>` | one run's runtime | Set up skills of this definition not yet set up; never removes | the backend's run | Native: resolves immediately (doc: catalog by path, no prompt change, FU-006) |
| `AgentRun.applyDefinitionSkills(definition)` | run | Reject when inactive, then backend | run | Mirrors `applyDefinitionTools` (`agent-run.ts:159-166`) |
| `RunWorkspaceSkills.acquire(requests, assertPreparing): Promise<WorkspaceSkillMaterializationResult>` | one run's workspace links | Preparation acquisition (the preparation's guard and `closed`) | constructed per run | Replaces `guard.ownSkill`, factory `skills` arrays and `owner.skills` |
| `RunWorkspaceSkills.addFrom(definition): Promise<void>` | same | Mid-run add, one name at a time, guarded by `closed` | same | Serialized |
| `RunWorkspaceSkills.release(): Promise<void>` | same | Close, await the in-flight add, release all held links; idempotent | same | The only release of a run's workspace links |
| `RunWorkspaceSkills.hasSkills(): boolean` | same | Whether any link is held (Claude `allowedTools`) | same | Read per process generation |
| `RunSkillTracker.applyDefinition(runId, definition): { added: string[]; removed: string[] }` | tracked run | Replace definition, re-resolve, report name changes in `skillDirs` terms (DS-001 narrative) | runId | Notice content still decided by the `seen` diff at delivery |
| `IntegrationRunAccess.integrationsStartingOnRestart(run: IntegrationRunIdentity, skillNames: readonly string[]): Promise<readonly string[]>` | run's integrations | Integration display names granted by the definition for these skills but not held by the run's pass | `{ runId, agentDefinitionId }` | Needs `RunPassRegistry.grantedIntegrationIds(runId)` and the catalog's `describe` |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `applyDefinitionSkills` | Yes | Yes | Low | — |
| `RunSkillTracker.applyDefinition` | Yes | Yes | Low | — |
| `integrationsStartingOnRestart` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural | Consistent | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| Backend method | `applyDefinitionSkills` | Yes | Yes (pairs with `applyDefinitionTools`) | Low | — |
| Per-run owner | `RunWorkspaceSkills` | Yes | Yes (workspace skill links of one run) | Low | — |
| Change kind | `added` (with `updated`, `removed`) | Yes | Yes | Low | — |
| Integration read | `integrationsStartingOnRestart` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Definition change trigger | `AgentDefinitionChangeSignal` | Reuse | One signal for every change source |
| Run tracking, seen record, delivery, card | skill notice subsystem | Extend | Same owner, same record |
| Link acquisition, rollback, holders | `WorkspaceSkillMaterializer` | Reuse | Unchanged |
| Codex planning | bootstrapper's planner | Extract and reuse | One rule at start and mid-run |
| Integration state | `IntegrationRunAccess` | Extend (one read) | Single integration entry point |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `skill-update-notices` | pass, names diff, notice text, delivery | DS-001, 002, 004 (caller) | Extend |
| `agent-execution` (`AgentRun`, backends, `backends/shared`) | setup per runtime | DS-003 | Extend |
| `credential-proxy` | integration read | DS-004 | Extend |
| `compositions` + hosts | wiring | — | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping. The draft had Claude, Codex and ACP each implement the add policy; that is the repeated coordination resolved by `RunWorkspaceSkills`.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Must Not Become |
| --- | --- | --- | --- | --- |
| Add-only workspace skill setup per run (4 runtimes) | `backends/shared/run-workspace-skills.ts` | `agent-execution` backends | Same policy, must change together | A second materializer or registry |
| Codex request planning | `backends/codex/codex-workspace-skill-request-planner.ts` | Codex backend | Start and mid-run | Generic for other runtimes |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `SkillChange` `added` variant: `{ kind: "added"; skillName; skillDir; skillMdPath; description; integrationNames }` | Yes | Yes | Low | `integrationNames` filled by the service from DS-004; empty when none |
| `ResolvedSkill`: `{ name; rootPath; description }` | Yes | Yes | Low | `description` added for the notice |

## Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `skill-update-notices/skill-update-notices.ts` | composition | Takes `definitionChanges`, `integrationRunAccess`; subscribes the service; unsubscribes on close; resolver takes a definition |
| `skill-update-notices/services/skill-update-notice-service.ts` | service | Coalesced definition pass; apply-then-dirty; integration names for added skills in `computeNotice` |
| `skill-update-notices/services/run-skill-tracker.ts` | tracker | Holds definition; `applyDefinition`; resolved skills with description; resume rule |
| `skill-update-notices/services/skill-version-diff.ts` | diff | `added` when unseen and current |
| `skill-update-notices/services/skill-update-notice-builder.ts` | text | Added and removed blocks (see Examples) |
| `skill-update-notices/domain/skill-update-notice-types.ts` | types | `added` change; `ResolvedSkill.description` |
| `agent-execution/backends/agent-run-backend.ts` | contract | `applyDefinitionSkills` |
| `agent-execution/domain/agent-run.ts` | run boundary | `applyDefinitionSkills` |
| `agent-execution/backends/shared/run-workspace-skills.ts` (new) | per-run owner | Held links from preparation to release; applied names; `acquire`, `addFrom` (per name, serialized), `release` (close → await → release); `closed` guard; planner; logging |
| `agent-execution/backends/provider-preparation-guard.ts` | preparation | `ownSkill` removed (its two users acquire through `RunWorkspaceSkills`) |
| `claude/backend/claude-agent-run-backend.ts`, `claude-agent-run-backend-factory.ts`, `claude-session-bootstrapper.ts` (also, SR-004: ensures `<workspace>/.claude/skills` exists on every preparation, new and restore, before the session starts: recursive mkdir with the Claude profile's segments, never removed; a failed mkdir is logged with the run ID and never fails preparation (REQ-008) — the same folder the materializer already creates and leaves today), `claude-agent-run-context.ts`, `session/claude-session-cleanup.ts`, `session/claude-session-query-options.ts` | Claude | Factory creates `RunWorkspaceSkills` and releases it on failed preparation; bootstrapper acquires through it; run context holds it instead of `materializedConfiguredSkills`; cleanup's `skills` stage calls `release()`; query options read `hasSkills()`; backend implements the method |
| `codex/backend/codex-agent-run-backend.ts`, factory, `codex-agent-run-context.ts`, `codex-thread-cleanup.ts`, `thread/codex-thread-manager.ts`; `codex/codex-workspace-skill-request-planner.ts` (new); `codex/backend/codex-thread-bootstrapper.ts` | Codex | Same ownership change (`releasePreparation` calls `release()`), with the planner; bootstrapper uses the planner |
| `acp/backend/acp-agent-run-backend.ts`, `acp-agent-run-backend-factory.ts`, `acp/session/acp-session-launcher.ts` (owner type) | Grok, DeepSeek | `owner.skills` replaced by the run's `RunWorkspaceSkills`; `releaseResources` calls `release()` |
| `antigravity/backend/agy-agent-run-backend.ts` + factory; `antigravity/capsule/agy-run-capsule.ts` | AGY | Capsule add, one binding per linker call with its error caught per name, serialized (no release ordering: per-run capsule kept for resume); atomic manifest rewrite with the names that succeeded |
| `autobyteus/autobyteus-agent-run-backend.ts` | native | No-op with reason |
| `credential-proxy/integration-run-access.ts`, `run-pass-registry.ts` | integrations | `integrationsStartingOnRestart`; `grantedIntegrationIds(runId)`; catalog dependency |
| `compositions/platform-notice-sources.ts`, `build-studio-server.ts`, `start-standalone-application-host.ts` | composition | Pass `definitionChanges`, `integrationRunAccess` |
| `docs/modules/skill_update_notices.md`, `tool_list_updates.md` (cross-ref), runtime module docs (one line each) | docs | Behavior |

## Applied Patterns (If Any)

Strategy (Codex planner passed to `RunWorkspaceSkills`: a question the owner asks, "which request for these bindings"). Coalesced pass loop (copied rule from tools).

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. New files: `backends/shared/run-workspace-skills.ts` (beside `workspace-skill-materializer.ts`, its only collaborator) and `backends/codex/codex-workspace-skill-request-planner.ts` (beside `codex-workspace-skill-materializer.ts`).

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `backends/shared/run-workspace-skills.ts` | Off-Spine Concern | Yes | Low | Used by four runtimes: truly shared within backends; owns their run-held links |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Notice text (one notice, blocks in name order):

```text
[Platform notice — skill updated]

Your skill package `github-integration` is now available: Work with GitHub issues, pull requests and Projects boards through the user's AutoByteus GitHub connection. …
Read its instructions before work it governs: `/…/github/SKILL.md`. Resolve relative paths in it from its folder.
Its GitHub access starts when this run is restarted (stop the run, then send a message).

Your skill package `old-skill` is no longer available.

Do not rely on a skill that is no longer available.
```

The header stays as it is: the web labels the card by it.

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Sequence owner | Service: `await run.applyDefinitionSkills(def)` then mark dirty and deliver | Backend posting its own notice, or the tool list service calling skill setup | One owner per sequence; backends never notify |
| Mid-run acquisition | In `RunWorkspaceSkills`: `for (const request of planned) { await materializer.materializeConfiguredWorkspaceSkills({ requests: [request], onAcquired: d => this.held.push(d), assertAccepting: () => { if (this.closed) throw new Error("run released") } }) }` (per-name try/catch); `release() { this.closed = true; await this.inFlight; await materializer.cleanupMaterializedWorkspaceSkills(this.held) }` | Guard on `backend.isActive()`; one call for all added names; a release path that reads the list without closing first | AR-001: "active" stays true during Claude/Codex cleanup; AR-002: one collision must not roll back the others |
| Removal | Notice only | Releasing a holder mid-run | FU-007, user decision |
| Native | No prompt change | `processedSystemPrompt = …` | Cache (FU-006) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the "definition read once" binding beside the new one (e.g. for content notices) | Fewer changes | Rejected | One current definition per tracked run |
| Flag to keep the old restored-run seeding | Avoid notices for older records | Rejected | Records are directly usable (persisted-data decision) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Extract the Codex planner; the bootstrapper uses it (no behavior change; existing tests green).
2. Add `RunWorkspaceSkills` and move Claude, Codex and ACP preparation and release onto it (no behavior change; existing tests green). Then add `applyDefinitionSkills` to the backend contract and `AgentRun`, implemented in Claude, Codex, ACP (through `RunWorkspaceSkills.addFrom`), AGY (capsule add + manifest) and native (no-op). Unit tests per backend:
   - link added and held, and released at run end;
   - inactive run rejected;
   - release during an in-flight add leaves no holder and no link (Claude parallel stages; Codex `skills/list` window);
   - per-name failure (AR-002).
3. Credential proxy read (`grantedIntegrationIds`, `integrationsStartingOnRestart`) with tests.
4. Skill notices:
   - types and diff (`added`), then the builder;
   - tracker (definition held, `applyDefinition`, resume rule);
   - service (pass, apply, integration names);
   - composition and hosts.
   Tests for AC-001…010.
5. Docs.
6. Live checks per TESTING.md: native and Claude at least (AC-002, AC-011); others as the API/E2E engineer decides (U-001).

## Key Tradeoffs

- The message gives the path on every runtime, so the runtime setup is best-effort and never blocks the notice. This is simpler than making setup a gate, and the agent is never left without the skill.
- Removal is not unlinked (user decision). The run may still see a removed skill in its own list until it ends; it has been told.

## Risks

- R-001 (approval prompt when reading outside the workspace on runs without auto-execute): accepted.
- DI-001 (SR-004): the Claude CLI watches `<cwd>/.claude/skills` only if it exists when its process starts (IMP-07…09). Claude preparation therefore always ensures the folder exists. User-visible effect: an empty `.claude/skills` folder in a workspace where no Claude run with skills has run yet. Every Claude run with a skill already leaves this folder today (`workspace-skill-links.ts:104` creates it; nothing removes it).
- AR-003: a Claude run that started with **no** skills has no `Skill` in `allowedTools` for its current CLI process generation (`claude-session-query-options.ts:23-26`, `claude-session-tooling-options.ts:148-149`). With auto-execute the call is approved anyway (`claude-session-tool-use-coordinator.ts:248-251`). Without it, the first use of the Skill tool asks for approval until the next process generation, which reads `hasSkills()` again. Reading `SKILL.md` by path works either way (REQ-002). Accepted, like R-001. For the live check: a Claude run started with zero skills, then add one; observe the Skill tool listing and the approval.
- Shared workspace links (FU-001): a link added for one run is visible to other runs in that workspace. That happens today at activation too.
- A busy run's notice may arrive while a native compaction drops it later (FU-006).
- Runtimes other than Claude may not list the new link until the next activation (U-001); the notice covers it.

## Guidance For Implementation

- Reproduction to start from: none in code. Start from a tracker/service unit test in which a definition change adds a skill and no notice is produced today; it should turn green.
- Follow `tool-list-update-service.ts` for the pass, tracking waits and close semantics. Close order is unchanged: the skill notices' `close()` also unsubscribes from the signal first.
- `RunWorkspaceSkills` takes its applied names from the run's preparation (its effective requests, including Codex `reconcile-discoverable` names), so the first pass after start does nothing.
- Tests required per runtime (Claude, Codex, ACP): release while an add is in flight leaves no holder and no link. This includes the Claude case where cleanup's `skills` stage runs in parallel with `process` and `listeners`, and the Codex case where release starts during the `skills/list` planning request. Also: one colliding name does not stop the others (AR-002); AGY with one unusable name links the rest and its manifest lists only those.
- AC-004 walk-through (AR-004):
  - Seen {A}. A save adds X: X resolves and is not in `skillDirs` → added; `skillDirs` X→dir; X dirty; backend links X. Before the next input, a save removes X: X had a folder and no longer resolves → removed; `skillDirs` X→null; X stays dirty. At delivery, `diffSkillVersion(X, seen=undefined, current=null)` → null, so no notice and nothing recorded. The link from the first save stays until the run ends (DEC-007).
  - Reverse order (seen {A}, remove A then add A back before the next input): at delivery the diff of A against the same files is null, so no notice.
- Antigravity: rewrite `manifest.json` atomically (temp file + rename); the creation-time `wx` flag stays for creation.
- Never make a failure of setup or of the integration read stop the notice; log with the run ID.
