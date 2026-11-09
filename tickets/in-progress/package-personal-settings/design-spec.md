# Design Spec — Personal Settings For Package And Built-In Definitions, Stage 1 (autobyteus-95)

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (revised after ARCH-REV-001: AR-001..AR-005).
- Approved requirements: `requirements-doc.md` at SR-006 (SR-004 content approved by the user; SR-006 adds the built-in wording of REQ-004's reset label, a wording change made within the approved direction and reported to the user):
  - the personal settings file (2026-11-06);
  - the contract and Q1–Q4 (2026-11-09);
  - built-in agents, Q5 (2026-11-09).
- Behavior-defining supplement: `personal-settings-file-contract.md` (approved, Q1–Q5), validated by `evidence/validate-personal-settings-file.mjs` (runs in `evidence/`).
- Design status: `Ready`. Scope: stage 1 (UC-001..UC-005). Stage 2 (UC-006, clean writes) gets its own design after stage 1 ships.
- Canonical investigation notes: `investigation-notes.md` (F-01..F-10, AF-01..AF-11).
- Authorities read (2026-11-09):
  - `references/architecture-design.md`, `references/design-principles.md` (including Principle 15, One Vocabulary), `references/design-examples.md` (Cases From Our Own Reviews), `references/ticket-scope.md`, `references/project-documents.md`, `references/finding-the-cause.md`;
  - the project's `DESIGN.md`, `GLOSSARY.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–3.
- Conflicts or discrepancies: none.
- Revision history of this spec: SR-005 (first design) → ARCH-REV-001 `Fail` → SR-006 (this revision). What changed is listed in "Revision SR-006" at the end.

## Current-State Read

- Definitions from agent packages are read only through three services (AF-02): `AgentDefinitionService`, `AgentTeamDefinitionService` and `AgentOrgDefinitionService`. They read the package definitions store. Every agent read passes one projection (`stripMandatoryProcessors`, AF-01).
- Store entries carry their source class: `server_data` (the app's own folder, with the user's agents and the built-ins) or `registered_package` (AF-04).
- Updates write all fields to the files (AF-06). The agent update starts from the stored value (`readStoredDefinition`, `agent-definition-service.ts:228-232, 304`). The Team and Org updates start from their public read (`agent-team-definition-service.ts:286`, `agent-org-definition-service.ts:125`), and keep `avatarUrl` and `defaultLaunchConfig` from it when the input leaves them out (`:121-124`; Org `:135-136`).
- What the editors send differs in shape from the stored value: agents send processor lists already stripped of mandatory processors (`AgentDefinitionForm.vue:456-472`); the Org editor always sends name, description, members and handoffs, also for an avatar-only change (`AgentOrgExperience.vue:470-475, 490-493`).
- The file stores render with their own serializers: agent `serializeAgentMd` + `buildAgentConfigRecord` (`file-agent-definition-provider.ts:361-376`); Team `content()` (`file-agent-team-definition-provider.ts:90`); Org `files()` (`file-agent-org-definition-provider.ts:57-65`).
- Where the services are built: agent and Team in `application-platform/definitions/create-bundle-backed-definition-services.ts:28-42`; Org in `compositions/host-definition-services.ts:46-51`. Both the studio server and the standalone application host use them. The announce function exists only after the feed composition runs (`build-studio-server.ts:258-262`). `AgentPackageService` is a lazy process singleton whose defaults come from other process instances (`agent-package-service.ts:49-104`).
- A reload is announced once, to the web lists and to running agents, through the publisher the feed composition sets (AF-07).
- A GitHub package update replaces the whole folder (F-04). The built-in agents' files are copied over at every server start (AF-05).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`.
  - A new server capability area (personal settings).
  - The read boundary of all three definition services.
  - Their update paths.
  - The GitHub update pipeline (capture and backup).
  - GraphQL, three web editors, localization and docs.
  - About 25 files.
- Architectural risk: `High`.
  - New persisted user data.
  - Every definition read (and so every run start, delegated copy and running agent's tools) passes the new projection.
  - The update pipeline gains a download and a write of user data.
  - New GraphQL contract fields and mutations.
- Escalation triggers (return a `Design Impact`):
  - a definition reader is found outside the three services;
  - capture cannot read a revision with the existing folder readers;
  - a touched file would pass 500 lines without a split named here.

## Architecture Investigation Evidence

| Evidence | Reference | Supports |
| --- | --- | --- |
| Three-service read boundary | AF-01, AF-02, AF-03 | One apply step per service |
| Source class per entry | AF-04 | The scope rule |
| Built-in sync at every start | AF-05 | Built-ins in scope |
| Update writes all fields | AF-06 | Split update; no file write for personal-only saves |
| One announce function | AF-07 | Reuse it for personal changes |
| Folder readers take roots | AF-08 | Capture reads the installed revision with the same ID rules |
| Update pipeline and installer helpers | AF-09 | Capture and backup before staging |
| Contract validation on real data | `evidence/personal-settings-file-validation-run-rebased.log` | Rules of contract §4–§7 |

## Intended Change

A new owner, `PersonalSettingsService`, keeps the personal settings file (contract §2–§4) and applies records to definitions as the three services read them.
- **Saves:** a save of a package or built-in definition starts from the base value (never the effective one). It sends the four settings to `PersonalSettingsService` as differences from the base, and writes the files only when the files rendered from the other fields would differ from those rendered from the base value.
- **GitHub updates:** before replacing the folder, the update backs up changed files and then captures edits of the four settings from the package files into personal settings. Only a failed download or a failed backup stops the update; a definition that cannot be read is backed up and not captured.
- **The editors:** they mark personal settings and offer a reset.

## Change Scope (Mandatory)

- In scope:
  - UC-001..UC-005.
  - Server: `src/personal-settings/` (new); the three definition services (read and update); `agent-packages` (capture and backup before an update; the installer's revision download); GraphQL types of the three definitions; the definition feed composition (shared announce).
  - Web: the agent, Team and Org editors; the definition stores; the agent-package texts of the automatic update (210).
  - `GLOSSARY.md`; docs.
- Deliberately left alone:
  - application-owned agents;
  - the user's own agents in `<app-data>/agents`;
  - skill sources;
  - the built-in sync itself (it keeps copying templates);
  - clean writes of other fields (stage 2);
  - folder watching.
- Follow-ups: none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirements / ACs | Trigger | Target path | Spines |
| --- | --- | --- | --- | --- |
| BEH-002..004 (reads) | REQ-001, 002; AC-001, 002, 006, 007 | Any definition read (lists, details, run start, members, delegated copies) | Service read → store entry → strip (agents) → `PersonalSettingsService.apply` | DS-001 |
| BEH-002..004 (saves) | REQ-003, 004; AC-001, 005 | Editor Save / Reset | GraphQL update → service splits → `PersonalSettingsService.setEdited` / `reset` → announce | DS-002 |
| BEH-001 | REQ-005, 006; AC-002..004 | GitHub package update (click or automatic) | `GitHubAgentPackageUpdates.updatePackage` → `PackageEditCapture` → stage → commit | DS-003 |
| BEH-001 texts | REQ-007, 009; AC-008 | Automatic-update switch and confirmation | Localization | — |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `personal-settings-file-contract.md` | Normative storage, shape and rules; this design implements it exactly |
| `evidence/validate-personal-settings-file.mjs` | Its rules become unit tests (the same cases) |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`.
- Current design issue found: `No` for the owners extended. The read boundary is already single per kind (AF-02).
- Structural triggers:
  - **Several kinds and forms** (Principle 1):
    - agents, Teams and Orgs;
    - package, built-in and the user's own sources;
    - read forms (by ID, lists, team-local lists) and write forms (update, reset, capture).
    - Each is traced in "Write Forms Per Kind" and the spines below. Every write form starts from the base value, read without `apply`; only reads for callers apply.
  - **One owner per sequence** (Principle 13): the announce function is created once in the feed composition and passed to the reloader and to `PersonalSettingsService`; nobody else broadcasts.
  - **Derived consumers** (Principle 11): see Derived Consumers.
  - **One Vocabulary** (Principle 15): "personal setting" enters `GLOSSARY.md`.
  - **File size:** the three services grow by one apply call per read and one split in update. `agent-definition-service.ts` (401 lines) stays under 500; the split logic lives in the personal settings service.
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: `No`, beyond sharing the announce function (a 5-line move in the composition).

## Terminology

- **Personal setting** (new; added to `GLOSSARY.md`): the user's own value of one of four settings (tools, skills, avatar, runtime/model) for a definition from an agent package or a built-in agent. It is kept in the node's `personal-settings.json` and applied on top of the definition when read; it is never written into the definition's files.
- **Base value:** the value in the definition's files: a package's files, or a built-in agent's template copied at start. It replaces "package value", which does not fit built-in agents (AR-005, Principle 15). The contract uses the same word.
- **Effective value:** the base value with the personal setting applied (contract §5).
- In the UI the base is named by its source: "the package's setting" for packages, "the built-in setting" for built-in agents.
- Existing glossary words used unchanged: node, built-in agent, internal agent.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- New: `<app-data>/agent-packages/personal-settings.json` (contract §2–§3) and `<app-data>/agent-packages/backups/<install key>/<UTC time>/…` (contract §7.3).
- Existing data: `Not Affected`. No existing file changes shape. Package files are changed only by the update itself, as today, after backup.
- Data Migration Guideline §2:
  1. No migration needed.
  2. Never a startup prerequisite: a missing or unreadable file means base values.
  3. No released source shapes.
  4. Invalid parts are skipped, never deleted.
  5. Atomic write.
  6. One current shape, no version field.
  7. One small file.
  8. References: definition IDs; a record without its definition is unused.
  9. Store and capture tests.
  10. Architecture review.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | A read of an agent, Team or Org | The effective definition | The kind's definition service (calls `PersonalSettingsService.apply`) |
| DS-002 | Primary | Editor Save or Reset | File(s) and/or personal settings written; announced | The kind's definition service (split) → `PersonalSettingsService` |
| DS-003 | Primary | GitHub package update | Captured edits, backups, replaced folder | `GitHubAgentPackageUpdates` (calls `PackageEditCapture`) |
| DS-004 | Return-event | A personal settings change | Web lists reloaded; running agents take their tools | The announce function (feed composition) |
| DS-005 | Bounded local | Store write | Atomic file write | `PersonalSettingsStore` |

## Primary Execution Spine(s)

- **DS-001:** `GraphQL / run start / member resolution / delegated copy → AgentDefinitionService.getAgentDefinitionById (or list) → reloader.applyPendingChanges → store.getEntry("agent", id) → stripMandatoryProcessors → PersonalSettingsService.apply("agent", definition, entry.location.sourceClass) → effective definition`. Teams and Orgs: the same, without the strip step.
- **DS-002 (save; agents, Teams and Orgs):** drawn per kind in "Write Forms Per Kind". In call order:
  1. Read the base value: the store entry without `apply` (agent `readStoredDefinition`, Team and Org a new private `readBaseDefinition`). Not found → error, as today.
  2. Team and Org: the revision check against the base value (personal settings never change `revision`).
  3. If `PersonalSettingsService.appliesTo(kind, id, entry.location.sourceClass)` is false (the user's own definitions, application-owned): the update runs exactly as today. Stop here.
  4. Build the candidate as today, through the service's own normalizers, from the base value plus the input, but with the personal fields (agents: `toolNames`, `skillNames`, `avatarUrl`, `defaultLaunchConfig`; Teams and Orgs: `avatarUrl`, `defaultLaunchConfig`) kept at the base value.
  5. Compare: `fileStore.rendersDifferently(baseValue, candidate)` renders both with the store's own serializers and compares the strings (agents: both through `stripMandatoryProcessors` first, because the editor sends stripped lists). If they differ: validate as today, then `fileStore.update(candidate)`, then reload the owning folder.
  6. `PersonalSettingsService.setEdited(kind, id, baseValues, editedValues)` with the four settings from the input (normalized as today; an absent input field leaves that personal field unchanged). It writes and announces only if the record changed.
  7. Return the effective definition (a fresh read through the public getter).
  - Order: files first, because validation may refuse them; the personal settings are written only after the files succeed. A failure of step 6 after step 5 leaves the files changed and the personal settings unchanged, and the error is returned to the editor.
- **DS-002 (reset):** `Editor "Reset to the package's setting" / "Reset to the built-in setting" → resetAgentPersonalSetting(definitionId, setting) (Team, Org likewise) → the service checks the definition exists and appliesTo → PersonalSettingsService.reset(kind, id, setting) → announce → return the effective definition`.
- **DS-003:** `GitHubAgentPackageUpdates.updatePackage (inside the package's serialize, agent-package-service.ts:252; both the click path and the automatic pass, update-pass.ts:153) → fetch the head (210) → if newer: PackageEditCapture.captureAndBackUp(record)`:
  1. `installer.downloadRevision(source, installedRevision, tempDir)`.
  2. Read the installed revision and the current install with the folder readers (temporary roots; the same ID rules as the app).
  3. List the files that differ (a byte compare of every file in either tree) and, per definition readable on both sides, the changes of the four settings.
  4. Copy every differing file on disk to `backups/<install key>/<UTC time>/<path>`, then remove backups beyond the latest 5.
  5. `PersonalSettingsService.captureFromPackageEdits(changes)`: one write, one announce.
  6. Remove the temporary download.
  - Then `stagePackageReplacement → commit`, unchanged.
  - Failure rules per step are in "Capture Failure Rules".

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Every read already goes through the service. After the existing projection, the service hands the definition and its source class to `PersonalSettingsService.apply`. It returns the definition unchanged when personal settings do not apply (application-owned, or the user's own `server_data` agent), or when there is no record; otherwise it returns the effective values of contract §5. Lists apply per definition. |
| DS-002 | The form keeps sending full values. The service always starts from the base value, never the effective one, so a personal value can never be written into a file (MP-001). For a package or built-in definition, the four settings become a record of differences: `setEdited` stores additions and removals for lists, and a value only when it differs from the base (the same value removes the field). The files are written only when what the store would write from the candidate differs from what it would write from the base value. Comparing rendered files, not inputs, makes representation differences (stripped processor lists, `toMutationMembers`, missing `refType`) disappear, so a personal-only save leaves the checkout untouched (AC-001). For the user's own definitions nothing changes: everything is written to the files as today. |
| DS-003 | Before the folder is replaced, the update downloads the installed revision and compares definition by definition, with the same readers and ID rules as the app. Every file that differs is first copied to the backups. Then differences of the four settings become personal settings: a list is merged into the existing record, a value is set only if the record has none (contract §7.2). A definition that cannot be read on either side is not captured, but its files are backed up, and the update goes on to replace it, as today. Only a failed download or a failed backup stops the update. |
| DS-004 | One announce function, created by the feed composition, broadcasts `agent_package_definitions_changed` with the affected lists and notifies `AgentDefinitionChangeSignal`. The reloader and `PersonalSettingsService` both call it. |

## Spine Actors / Main-Line Nodes

The three definition services, `PersonalSettingsService`, `PersonalSettingsStore`, `GitHubAgentPackageUpdates`, `PackageEditCapture`, `GitHubAgentPackageInstaller`.

## Ownership Map

| Node | Owns |
| --- | --- |
| `PersonalSettingsService` (new, `src/personal-settings/services/personal-settings-service.ts`) | The scope rule (`appliesTo(kind, id, sourceClass)`: `registered_package`, or a built-in agent ID in `server_data`) and the base kind (`PACKAGE` or `BUILT_IN`); applying records (contract §5); turning edited values into a record (contract §6); reset per setting; capture merge (contract §7.2); announcing changes through the publisher set on it (`setPublisher`, like the reloader's); listing which settings are personal for a definition |
| `PersonalSettingsStore` (new, `stores/personal-settings-store.ts`) | The file: tolerant read (contract §4), exact atomic write, one write at a time, the copy of an unreadable file before its first rewrite |
| `personal-setting-record.ts` (new, `domain/`) | Types, the key (build/parse at the first `:`), field names per kind, the record validator |
| Definition services (changed) | Calling `apply` on every store-backed read; a private base-value read (agent: the existing `readStoredDefinition`; Team and Org: new `readBaseDefinition`) used by every write form; splitting updates; resets; returning effective definitions |
| File stores (changed: `FileAgentDefinitionProvider`, `FileAgentTeamDefinitionProvider`, `FileAgentOrgDefinitionProvider`) | `rendersDifferently(a, b)`: renders both with the store's own serializers (the same ones `update` writes with) and compares the strings |
| `PackageEditCapture` (new, `src/agent-packages/services/package-edit-capture.ts`) | Download the installed revision through the installer, read both trees with the folder readers, list differing files, compute changes, back up differing files and keep 5 backups, then call `captureFromPackageEdits`, clean up; the failure rules |
| `GitHubAgentPackageUpdates` (changed) | Calls capture before staging; on a stopping failure marks the update failed |
| `GitHubAgentPackageInstaller` (changed) | Public `downloadRevision(source, revision, targetDir)` built from its existing private download/extract helpers |
| Feed composition (changed) | Creates the one announce function and sets it on the reloader and on `PersonalSettingsService`; clears both on close |
| `create-bundle-backed-definition-services.ts` (changed) | Constructs the one `PersonalSettingsService` (with its store at `<app-data>/agent-packages/personal-settings.json`) and gives it to the agent and Team services; returns it |
| `host-definition-services.ts` (changed) | Gives it to the Org service; binds it as the process instance (`PersonalSettingsService.bindProcessInstance`, released on close, like the three services); exposes it on `HostDefinitionServices` |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner | Must not own |
| --- | --- | --- |
| GraphQL fields and reset mutations | `PersonalSettingsService` via the services | Delta rules |

## Removal / Decommission Plan (Mandatory)

None. No code becomes unnecessary.

## Return Or Event Spine(s) (If Applicable)

DS-004 as above.

## Bounded Local / Internal Spines (If Applicable)

DS-005: `change → read the current file → apply the change → write <file>.tmp → rename`, queued one at a time.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| `PersonalSettingsStore` | `PersonalSettingsService` | File I/O |
| Backup pruning | `PackageEditCapture` | Keep 5 per package |
| Folder readers (existing) | `PackageEditCapture` | Same IDs as the app |

## Write Forms Per Kind

Every write form starts from the base value. `apply` runs only in the public reads.

| Kind | Write form | Base read | Personal fields split off | Files written when | Tests (each on a package fixture) |
| --- | --- | --- | --- | --- | --- |
| Agent (shared, team-local, Org-owned) | `updateAgentDefinition` | `readStoredDefinition` (`agent-definition-service.ts:228`) | `toolNames`, `skillNames`, `avatarUrl`, `defaultLaunchConfig` | `rendersDifferently(strip(base), candidate)` (agent.md and agent-config.json via `serializeAgentMd`, `buildAgentConfigRecord`) | Personal-only save → no file write; description change with a personal tool → file keeps the base tools |
| Team | `updateDefinition` | new private `readBaseDefinition` (store entry, no `apply`) replaces `getDefinitionById` at `:286` | `avatarUrl`, `defaultLaunchConfig` | `rendersDifferently(base, candidate)` (`content()`) | Avatar-only save → no file write; personal avatar + description change → `team-config.json` keeps the base avatar |
| Org | `updateDefinition` | the same, replacing `getDefinitionById` at `:125` | `avatarUrl`, `defaultLaunchConfig` | `rendersDifferently(base, candidate)` (`files()`) | Avatar-only save from the real editor payload (name, description, members via `toMutationMembers`, handoffs) → no file write; personal avatar + member change → `org-config.json` keeps the base avatar |
| All | Reset | the existence check uses the base read | one field | never | Reset → field gone; effective = base |
| All | Capture | the two trees on disk | the four settings | the update replaces them (after backup) | See Capture Failure Rules |

Notes:
- An Org-owned agent or Team can be changed in files only through its parent Org save (`file-agent-definition-provider.ts:346`); a personal-only save of one writes no file, so it now succeeds. That is intended (its personal tools are the user's).
- `rendersDifferently` compares the strings the store would write from each value. It does not try to reproduce today's merge with unknown keys (`mergeAgentConfigRecord`); when it says "differs", `update` writes exactly as today (stage 2 makes those writes clean).

## Capture Failure Rules

Writes happen in this order: backup → personal settings → (the existing) staging and commit. Each step has one result:

| Step | Failure | Result |
| --- | --- | --- |
| 1. Download or extract the installed revision | Network, 404, bad archive; or `installedRevision` unknown | The update stops: `markUpdateFailed`, throw. Nothing written (REQ-006, AC-004). The automatic pass reports the failure as today |
| 2. Read a definition, installed revision or disk | A load issue on either side (`KindDefinitionReadResult` issue; e.g. a JSON typo from a hand edit) | No capture for that definition; a warning naming the file. Its differing files are backed up in step 4. The update continues and replaces the file, as today (MP-003) |
| 3. Compare files | — (pure) | — |
| 4. Write the backup | Disk error | The update stops; the partial backup folder is removed. Nothing else written ("nothing lost silently") |
| 5. `captureFromPackageEdits` | The personal settings file cannot be written | The update stops. The backup from step 4 stays (harmless; counted in the 5). The package files are unchanged |
| 6. Remove the temporary download | Error | Logged only |
| After capture: staging, the skill-name check, commit | Any existing failure | As today: the update fails and the old folder stays. The captured record and the backup stay. The effective values are unchanged, because the captured edits are still in the files: e.g. disk `[a, c]`, installed `[a, b]` → record `+c −b` → effective `([a, c] − b) + c = [a, c]`. The next update captures the same changes again with the same result (the merge is idempotent) |

Tests: a malformed `agent-config.json` on disk → update succeeds, the file is in the backup, a warning is logged; download failure → nothing changed; backup write failure → nothing changed; staging failure after capture → effective values unchanged, and the next update succeeds.

## Ownership Boundaries

- Only `PersonalSettingsService` reads or writes the personal settings file. The services, GraphQL and capture call it.
- Only the three services read definitions for callers (unchanged).
- Only the feed composition creates the announce function.
- Only the services' private base reads feed write forms; no write form starts from an effective definition.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden |
| --- | --- | --- |
| `PersonalSettingsService` | store, delta and apply rules | A service or resolver reading `personal-settings.json` |
| Definition services | store reads, apply, split | Callers reading the package definitions store; a write form starting from the public (effective) read |
| `PackageEditCapture` | download, compare, backup | `GitHubAgentPackageUpdates` comparing files itself |

## Dependency Rules

- `personal-settings` → `built-in-agents/built-in-agent-registry` (IDs only), `agent-package-definitions` domain types.
- The definition services and `agent-packages` → `personal-settings`, never the reverse. The announce function is injected.

## Interface Boundary Mapping

| Interface | Subject | Shape |
| --- | --- | --- |
| `PersonalSettingsService.apply(kind, definition, sourceClass)` | One definition | Returns the effective definition (a new object) |
| `appliesTo(kind, id, sourceClass)` | Scope | boolean |
| `setEdited(kind, id, baseValues, editedValues)` | One record | Writes and announces when the record changed |
| `reset(kind, id, setting)` | One field | `setting ∈ TOOLS, SKILLS, AVATAR, DEFAULT_LAUNCH_CONFIG` (`TOOLS` and `SKILLS` on agents only) |
| `personalSettingsOf(kind, id)` | Marks | The personal settings present |
| `captureFromPackageEdits(changes[])` | Many records | Contract §7.2 merge; one write; one announce |
| GraphQL `AgentDefinition.personalSettings`, `AgentTeamDefinition.personalSettings`, `AgentOrgDefinition.personalSettings` | Marks | `[PersonalSetting!]!`; empty when none or not applicable |
| GraphQL `…Definition.personalSettingsBase` | Scope and wording | `PersonalSettingsBase` enum (`PACKAGE`, `BUILT_IN`), null when personal settings do not apply |
| `FileXDefinitionProvider.rendersDifferently(a, b)` | Two values of one definition | boolean |
| `PersonalSettingsService.setPublisher(fn \| null)` | Announce | Like `reloader.setPublisher`; without a publisher (the standalone host, tests) nothing is announced |
| GraphQL `resetAgentPersonalSetting(definitionId, setting)`, `resetAgentTeamPersonalSetting(definitionId, setting)`, `resetAgentOrgPersonalSetting(definitionId, setting)` | One field | Return the effective definition |
| `GitHubAgentPackageInstaller.downloadRevision(source, revision, targetDir)` | Archive | Returns the extracted root |

## Interface Boundary Check

All interfaces are singular. Identity is explicit: kind + definition ID, or one subject per mutation. Ambiguous selector risk: low.

## Main Domain Subject Naming Check

| Name | OK | Note |
| --- | --- | --- |
| `PersonalSettingsService`, `personal-settings.json`, `PersonalSetting` enum | Yes | One word everywhere: "personal setting" |
| `PackageEditCapture` | Yes | Captures edits made in package files |
| `readBaseDefinition`, `PersonalSettingsBase` | Yes | "Base value" (Terminology) |

## Existing Capability / Subsystem Reuse Check

| Need | Decision |
| --- | --- |
| Reading revisions | Reuse the folder readers (same IDs) |
| Download by revision | Reuse the installer's helpers (made public as one method) |
| Announce | Reuse the feed's publish (shared function) |
| JSON atomic write | Reuse `writeAtomicJsonSync` (`persistence/file/atomic-json-sync.ts`, used by the 210 gate) |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| `src/personal-settings` | Record, store, service | Create New |
| `src/agent-definition`, `src/agent-team-definition`, `src/agent-org-definition` | Apply and split | Extend |
| `src/agent-packages` | Capture and backup; download | Extend |
| `src/api/graphql/types/agent-*-definition.ts` | Fields and resets | Extend |
| `src/compositions` | Shared announce | Extend |

## Draft File Responsibility Mapping

See the Final mapping.

## Reusable Owned Structures Check

- The record type and key rules live in one domain file, used by the store, the service and capture.

## Shared Structure / Data Model Tightness Check

- The record has only the contract's fields (contract §3.4 lists what was removed).

## Derived Consumers (Principle 11)

| Changed | Consumer | Decision |
| --- | --- | --- |
| Effective definitions (reads) | Web lists, details, pickers; run start; Team and Org member resolution; delegated copies; `tool-list-updates` (running agents); the web launch defaults (`composables/useDefinitionLaunchDefaults.ts:125-144`, `stores/agentOrgLaunchDraftStore.ts:232-253`) | All read through the services and get effective values. The web reads `defaultLaunchConfig` from GraphQL, so a personal runtime/model becomes the launch default with no web change. `tool-list-updates` is notified by the shared announce |
| | Collaboration admission (`listAdmissionEntries`) | Not affected: it does not use the four settings |
| GraphQL definition types (+2 fields: `personalSettings`, `personalSettingsBase`) | Web stores and forms | Read them for marks and reset |
| Update input (unchanged shape, new meaning for package definitions) | Web forms | No change; the server splits |
| Automatic-update texts (210) | `updateNotifications.ts` en/zh keys `settings.notifications.auto.confirm.replace.agent_package`, `…explain.agent_package`, `…explainOn.agent_package` | New text (REQ-007); the skill-source keys stay |

## Final File Responsibility Mapping

Server (`autobyteus-server-ts/src`):

| File | Kind | Concern |
| --- | --- | --- |
| `personal-settings/domain/personal-setting-record.ts` | Add | Types, key, fields, validator |
| `personal-settings/stores/personal-settings-store.ts` | Add | File I/O |
| `personal-settings/services/personal-settings-service.ts` | Add | Scope, apply, delta, reset, capture merge, marks, announce |
| `agent-definition/services/agent-definition-service.ts` | Modify | Apply on reads; split update; reset |
| `agent-team-definition/services/agent-team-definition-service.ts` | Modify | Same, for avatar and runtime/model |
| `agent-org-definition/services/agent-org-definition-service.ts` | Modify | Same |
| `agent-packages/services/package-edit-capture.ts` | Add | Capture and backup |
| `agent-packages/services/github-agent-package-updates.ts` | Modify | Call capture before staging |
| `agent-packages/installers/github-agent-package-installer.ts` | Modify | `downloadRevision` |
| `api/graphql/types/agent-definition.ts`, `agent-team-definition.ts`, `agent-org-definition.ts` | Modify | Fields and reset mutations |
| `agent-definition/providers/file-agent-definition-provider.ts`, `agent-team-definition/providers/file-agent-team-definition-provider.ts`, `agent-org-definition/providers/file-agent-org-definition-provider.ts` | Modify | `rendersDifferently` |
| `application-platform/definitions/create-bundle-backed-definition-services.ts` | Modify | Construct `PersonalSettingsService`; give it to the agent and Team services |
| `compositions/host-definition-services.ts` | Modify | Give it to the Org service; bind/release the process instance; expose it |
| `compositions/agent-package-definition-feed-composition.ts`, `compositions/build-studio-server.ts` | Modify | One announce function, set on the reloader and on `PersonalSettingsService` (input `personalSettings` from `HostDefinitionServices`) |
| `agent-packages/services/agent-package-service.ts` | Modify | Pass `PersonalSettingsService.getProcessInstance()` (dependency with that default, as the reload default does) to `GitHubAgentPackageUpdates` |

Web (`autobyteus-web`):

| File | Kind | Concern |
| --- | --- | --- |
| `components/agents/AgentDefinitionForm.vue` | Modify | Marks and reset for tools, skills, avatar; note line |
| `components/launch-config/DefinitionLaunchPreferencesSection.vue` | Modify | Mark and reset for runtime/model (used by the agent and Team forms) |
| `components/agentTeams/AgentTeamDefinitionForm.vue` | Modify | Avatar mark and reset; note line |
| `components/agentOrgs/AgentOrgExperience.vue` (edit view, next to `AgentOrgAvatarEditor`) | Modify | Avatar mark and reset; note line. The Org editor has no runtime/model editor today: of the four settings it sends only the avatar (it also sends name, description, members and handoffs, `:470-475, 490-493`); this design adds none. A personal Org runtime/model (from capture) shows as a "Personal" mark with reset in the note area |
| `stores/agentDefinitionStore.ts`, Team and Org stores, `graphql/*` | Modify | Fields; reset calls |
| `localization/messages/{en,zh-CN}/*` | Modify | Marks, note and reset; REQ-007 texts |

Docs:
- `GLOSSARY.md` ("personal setting");
- `autobyteus-server-ts/docs/modules/personal_settings.md` (new), `agent_packages.md` (capture and backups), `agent_definition.md`;
- web agents docs.

## Applied Patterns (If Any)

Repository (store); a decorator-like projection (apply on read).

## Target Subsystem / Folder / File Mapping

As above; `src/personal-settings/{domain,stores,services}` mirrors existing capability areas.

## Folder Boundary Check

Clear; risk low.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| A personal-only save | Package `toolNames [a, b]`, form sends `[a, b, mcp_x]` and the same name → record `{ toolsAdded: ["mcp_x"] }`; no file write; `git status` clean | Writing `agent-config.json` with `[a, b, mcp_x]` |
| Team with a personal avatar, description changed | Base read → candidate keeps the base avatar → `team-config.json` written with the base avatar and the new description; the personal avatar stays in personal settings | Starting from `getDefinitionById` (effective) and writing the personal avatar into the file |
| Org avatar-only save | The editor sends name, description, members, handoffs and the new avatar → rendered `org.md` and `org-config.json` equal the base's → no file write; `avatarUrl` in personal settings | Comparing the GraphQL input with the stored value and rewriting `org-config.json` (FT-5/O-2 noise) |
| Capture with a broken file | `agent-config.json` on disk has a JSON error → no capture for that agent, warning, the file in the backup, update succeeds | Blocking every future update of the package |
| Built-in agent | `autobyteus-daily-assistant` in `server_data` → applies; the user's own `my-agent` in `server_data` → does not apply (files as today) | Treating all `server_data` agents as personal |
| Same value as the base | Form sends the base avatar → the personal `avatarUrl` is removed | Storing a duplicate of the base value |
| Capture | Installed `[a, b]`, file on disk `[a, c]` → `toolsAdded [c]`, `toolsRemoved [b]` merged into the record | Overwriting an existing personal avatar with a stale file value |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Also writing personal values into package files "for visibility" | Rejected (dual storage) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `personal-settings` domain, store and service, with unit tests from the validation script's cases (identity, reader, apply, delta, capture).
2. Construction and wiring (`create-bundle-backed-definition-services.ts`, `host-definition-services.ts`), the process instance, and the shared announce function in the feed composition.
3. File stores' `rendersDifferently`; agent, Team and Org services: base reads, apply and split; reset; GraphQL fields and mutations; the tests of "Write Forms Per Kind".
4. Installer `downloadRevision`; `PackageEditCapture`; the update calls it. Tests with fixture archives: capture, backup, prune, and every row of "Capture Failure Rules".
5. Web editors, stores, localization (en/zh-CN); the REQ-007 texts.
6. Docs and glossary.
7. Validation: isolated instance with a real GitHub package update (AC-002..004), a local package checkout (AC-001), and built-in agents across a restart.

## Key Tradeoffs

- Applying on read instead of rewriting files keeps checkouts clean and updates trivially safe. The cost is one in-memory step per read; the file is small and read once per change.
- A capture download per update: one archive from codeload, outside the API quota.

## Risks

- A package installed before revision tracking (`installedRevision` unknown) cannot be captured, so its update stops (REQ-006). Rare. The remedy is to remove and re-import the package; personal settings survive it, because definition IDs come from folder names. The docs say so.
- Org runtime/model (R-1): the app has no editor for it. An Org's personal runtime/model can come only from capture of a GitHub package's file edit. For an Org in a local package it cannot be personal: a file edit there is the package's value. This was reported to the user with SR-006.
- A user who removes a tool a built-in agent needs breaks that agent until Reset.

## Guidance For Implementation

- Follow the contract exactly. Its validation cases become unit tests.
- The form keeps sending full values; never send deltas from the web.
- No file write when only personal settings change (AC-001's `git status`), for all three kinds.
- No write form may start from the public (effective) read.
- Keep `agent-definition-service.ts` under 500 lines: the split and apply rules live in `PersonalSettingsService`.

### UI (stage 1)

- In the agent, Team and Org editors, for a definition whose `personalSettingsBase` is not null: one note line under the title.
  - `PACKAGE`: "Tools, skills, avatar and runtime/model are your personal settings on this computer. Package updates keep them." Teams and Orgs: "Avatar and runtime/model are your personal settings on this computer. Package updates keep them."
  - `BUILT_IN` (agents only): "Tools, skills, avatar and runtime/model are your personal settings on this computer. Restarts and AutoByteus updates keep them." 
- Orgs: the app edits only the avatar of an Org (`AgentOrgExperience.vue:482-492`). Org runtime/model stays editable only in the files. In a package, file edits are captured at the next GitHub update, and the effective value applies at launch. No Org runtime/model editor is added (not requested).
- Next to each setting that is in `personalSettings`: a small "Personal" label and a reset link: "Reset to the package's setting" (`PACKAGE`) or "Reset to the built-in setting" (`BUILT_IN`).
- zh-CN translations follow the localization guide.

## Revision SR-006 (after ARCH-REV-001)

| Finding | Change |
| --- | --- |
| AR-001 | Every write form starts from a base read without `apply`; Team and Org get `readBaseDefinition` in place of `getDefinitionById` in `updateDefinition`; DS-002 drawn per kind in call order ("Write Forms Per Kind"); tests per kind |
| AR-002 | The "changed" rule: the file store renders the candidate and the base value with its own serializers and compares the strings (`rendersDifferently`); agents compare stripped values; personal-only-save tests per kind, the Org one with the real editor payload |
| AR-003 | "Capture Failure Rules": stop only on download or backup (or personal settings write) failure; an unreadable definition is backed up and not captured; order backup → capture → staging; what remains after a later staging failure and why it is harmless |
| AR-004 | Construction in `create-bundle-backed-definition-services.ts` and `host-definition-services.ts`; process instance; `setPublisher` set and cleared by the feed composition; the standalone host applies personal settings on read and announces nothing; `AgentPackageService` gets it through the process instance |
| AR-005 | "Base value" replaces "package value" (here and in the contract's wording); `personalSettingsBase` (`PACKAGE`, `BUILT_IN`) chooses the UI wording; REQ-004 adds "Reset to the built-in setting" for built-in agents |
| Notes | The Org editor sentence corrected; requirements baseline references corrected; investigation notes gain a supplement inventory |
