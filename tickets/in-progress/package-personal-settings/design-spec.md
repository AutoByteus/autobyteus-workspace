# Design Spec — Personal Settings For Package And Built-In Definitions, Stage 1 (autobyteus-95)

## Solution And Approval Basis

- Current solution revision ID: `SR-005`.
- Approved requirements: `requirements-doc.md` at SR-004, approved by the user:
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

## Current-State Read

- Definitions from agent packages are read only through three services (AF-02): `AgentDefinitionService`, `AgentTeamDefinitionService` and `AgentOrgDefinitionService`. They read the package definitions store. Every agent read passes one projection (`stripMandatoryProcessors`, AF-01).
- Store entries carry their source class: `server_data` (the app's own folder, with the user's agents and the built-ins) or `registered_package` (AF-04).
- Updates patch the stored definition and write all its fields to the files (AF-06).
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
- **Saves:** a save of a package or built-in definition sends the four settings to it (as differences from the package) and writes the files only when another field changed.
- **GitHub updates:** before replacing the folder, the update captures edits of the four settings from the package files into personal settings and backs up changed files.
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
    - Each is traced in the tables below.
  - **One owner per sequence** (Principle 13): the announce function is created once in the feed composition and passed to the reloader and to `PersonalSettingsService`; nobody else broadcasts.
  - **Derived consumers** (Principle 11): see Derived Consumers.
  - **One Vocabulary** (Principle 15): "personal setting" enters `GLOSSARY.md`.
  - **File size:** the three services grow by one apply call per read and one split in update. `agent-definition-service.ts` (401 lines) stays under 500; the split logic lives in the personal settings service.
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: `No`, beyond sharing the announce function (a 5-line move in the composition).

## Terminology

- **Personal setting** (new; added to `GLOSSARY.md`): the user's own value of one of four settings (tools, skills, avatar, runtime/model) for a definition from an agent package or a built-in agent. It is kept in the node's `personal-settings.json` and applied on top of the definition when read; it is never written into the definition's files.
- **Package value:** the value in the definition's files (author, GitHub, or built-in template).
- **Effective value:** the package value with the personal setting applied (contract §5).
- Existing glossary words used unchanged: node, built-in agent, internal agent.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- New: `<app-data>/agent-packages/personal-settings.json` (contract §2–§3) and `<app-data>/agent-packages/backups/<install key>/<UTC time>/…` (contract §7.3).
- Existing data: `Not Affected`. No existing file changes shape. Package files are changed only by the update itself, as today, after backup.
- Data Migration Guideline §2:
  1. No migration needed.
  2. Never a startup prerequisite: a missing or unreadable file means package values.
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
- **DS-002 (agent):** `AgentDefinitionForm Save → updateAgentDefinition(input) → AgentDefinitionService.updateAgentDefinition → readStoredDefinition (the package value) → if PersonalSettingsService.appliesTo(kind, id, sourceClass): personal part = the four settings in the input → PersonalSettingsService.setEdited(kind, id, packageValues, editedValues); file part = the other fields whose normalized value differs → fileStore.update only if the file part is not empty → reloadOwningFolder (only when the files were written) → return the effective definition`. Teams and Orgs: avatar and runtime/model only.
- **DS-002 (reset):** `Editor "Reset to the package's setting" → resetAgentPersonalSetting(definitionId, setting) → PersonalSettingsService.reset → announce → return the effective definition`.
- **DS-003:** `GitHubAgentPackageUpdates.updatePackage (inside the package's serialize, 210) → fetch the head (210) → if newer: PackageEditCapture.captureAndBackUp(record) → installer.downloadRevision(installedRevision) → read the installed revision and the current install with the folder readers (temporary roots) → per definition, compare the four settings → PersonalSettingsService.captureFromPackageEdits(changes) → copy every differing file to backups/<install key>/<time>/ and keep the latest 5 → remove the temporary download → stagePackageReplacement → commit` (unchanged after). A capture failure → `markUpdateFailed` and throw: nothing changed (REQ-006, AC-004).

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Every read already goes through the service. After the existing projection, the service hands the definition and its source class to `PersonalSettingsService.apply`. It returns the definition unchanged when personal settings do not apply (application-owned, or the user's own `server_data` agent), or when there is no record; otherwise it returns the effective values of contract §5. Lists apply per definition. |
| DS-002 | The form keeps sending full values. The service compares them with the package value. For a package or built-in definition, the four settings become a record of differences: `setEdited` stores additions and removals for lists, and a value only when it differs from the package's (the same value removes the field). Other fields are written to the files only if one really changed, so a personal-only save leaves the checkout untouched (AC-001). For the user's own definitions nothing changes: everything is written to the files as today. |
| DS-003 | Before the folder is replaced, the update downloads the installed revision and compares definition by definition, with the same readers and ID rules as the app. Differences of the four settings become personal settings: a list is merged into the existing record, a value is set only if the record has none (contract §7.2). Any file that differs is copied to the backups. If anything fails, the update stops with nothing changed. |
| DS-004 | One announce function, created by the feed composition, broadcasts `agent_package_definitions_changed` with the affected lists and notifies `AgentDefinitionChangeSignal`. The reloader and `PersonalSettingsService` both call it. |

## Spine Actors / Main-Line Nodes

The three definition services, `PersonalSettingsService`, `PersonalSettingsStore`, `GitHubAgentPackageUpdates`, `PackageEditCapture`, `GitHubAgentPackageInstaller`.

## Ownership Map

| Node | Owns |
| --- | --- |
| `PersonalSettingsService` (new, `src/personal-settings/services/personal-settings-service.ts`) | The scope rule (`appliesTo(kind, id, sourceClass)`: `registered_package`, or a built-in agent ID in `server_data`); applying records (contract §5); turning edited values into a record (contract §6); reset per setting; capture merge (contract §7.2); announcing changes; listing which settings are personal for a definition |
| `PersonalSettingsStore` (new, `stores/personal-settings-store.ts`) | The file: tolerant read (contract §4), exact atomic write, one write at a time, the copy of an unreadable file before its first rewrite |
| `personal-setting-record.ts` (new, `domain/`) | Types, the key (build/parse at the first `:`), field names per kind, the record validator |
| Definition services (changed) | Calling `apply` on every store-backed read; splitting updates; returning effective definitions |
| `PackageEditCapture` (new, `src/agent-packages/services/package-edit-capture.ts`) | Download the installed revision through the installer, read both trees with the folder readers, compute changes, call `captureFromPackageEdits`, back up differing files, keep 5 backups, clean up |
| `GitHubAgentPackageUpdates` (changed) | Calls capture before staging; on failure marks the update failed |
| `GitHubAgentPackageInstaller` (changed) | Public `downloadRevision(source, revision, targetDir)` built from its existing private download/extract helpers |
| Feed composition (changed) | Creates the one announce function |

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

## Ownership Boundaries

- Only `PersonalSettingsService` reads or writes the personal settings file. The services, GraphQL and capture call it.
- Only the three services read definitions for callers (unchanged).
- Only the feed composition creates the announce function.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden |
| --- | --- | --- |
| `PersonalSettingsService` | store, delta and apply rules | A service or resolver reading `personal-settings.json` |
| Definition services | store reads, apply, split | Callers reading the package definitions store |
| `PackageEditCapture` | download, compare, backup | `GitHubAgentPackageUpdates` comparing files itself |

## Dependency Rules

- `personal-settings` → `built-in-agents/built-in-agent-registry` (IDs only), `agent-package-definitions` domain types.
- The definition services and `agent-packages` → `personal-settings`, never the reverse. The announce function is injected.

## Interface Boundary Mapping

| Interface | Subject | Shape |
| --- | --- | --- |
| `PersonalSettingsService.apply(kind, definition, sourceClass)` | One definition | Returns the effective definition (a new object) |
| `appliesTo(kind, id, sourceClass)` | Scope | boolean |
| `setEdited(kind, id, packageValues, editedValues)` | One record | Writes and announces |
| `reset(kind, id, setting)` | One field | `setting ∈ TOOLS, SKILLS, AVATAR, DEFAULT_LAUNCH_CONFIG` (`TOOLS` and `SKILLS` on agents only) |
| `personalSettingsOf(kind, id)` | Marks | The personal settings present |
| `captureFromPackageEdits(changes[])` | Many records | Contract §7.2 merge; one write; one announce |
| GraphQL `AgentDefinition.personalSettings`, `AgentTeamDefinition.personalSettings`, `AgentOrgDefinition.personalSettings` | Marks | `[PersonalSetting!]!`; empty when none or not applicable |
| GraphQL `…Definition.usesPersonalSettings` | Scope | `Boolean!` |
| GraphQL `resetAgentPersonalSetting(definitionId, setting)`, `resetAgentTeamPersonalSetting(definitionId, setting)`, `resetAgentOrgPersonalSetting(definitionId, setting)` | One field | Return the effective definition |
| `GitHubAgentPackageInstaller.downloadRevision(source, revision, targetDir)` | Archive | Returns the extracted root |

## Interface Boundary Check

All interfaces are singular. Identity is explicit: kind + definition ID, or one subject per mutation. Ambiguous selector risk: low.

## Main Domain Subject Naming Check

| Name | OK | Note |
| --- | --- | --- |
| `PersonalSettingsService`, `personal-settings.json`, `PersonalSetting` enum | Yes | One word everywhere: "personal setting" |
| `PackageEditCapture` | Yes | Captures edits made in package files |

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
| GraphQL definition types (+2 fields) | Web stores and forms | Read them for marks and reset |
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
| `compositions/agent-package-definition-feed-composition.ts` and the server build composition | Modify | One announce function, given to the reloader and `PersonalSettingsService` |

Web (`autobyteus-web`):

| File | Kind | Concern |
| --- | --- | --- |
| `components/agents/AgentDefinitionForm.vue` | Modify | Marks and reset for tools, skills, avatar; note line |
| `components/launch-config/DefinitionLaunchPreferencesSection.vue` | Modify | Mark and reset for runtime/model (used by the agent and Team forms) |
| `components/agentTeams/AgentTeamDefinitionForm.vue` | Modify | Avatar mark and reset; note line |
| `components/agentOrgs/AgentOrgExperience.vue` (edit view, next to `AgentOrgAvatarEditor`) | Modify | Avatar mark and reset; note line. The Org editor has no runtime/model editor today (`AgentOrgExperience.vue:482-492` sends only the avatar); this design adds none. A personal Org runtime/model (from capture) shows as a "Personal" mark with reset in the note area |
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
| Built-in agent | `autobyteus-daily-assistant` in `server_data` → applies; the user's own `my-agent` in `server_data` → does not apply (files as today) | Treating all `server_data` agents as personal |
| Same value as the package | Form sends the package's avatar → the personal `avatarUrl` is removed | Storing a duplicate of the package value |
| Capture | Installed `[a, b]`, file on disk `[a, c]` → `toolsAdded [c]`, `toolsRemoved [b]` merged into the record | Overwriting an existing personal avatar with a stale file value |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Also writing personal values into package files "for visibility" | Rejected (dual storage) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `personal-settings` domain, store and service, with unit tests from the validation script's cases (identity, reader, apply, delta, capture).
2. Shared announce function in the composition.
3. Agent, Team and Org services: apply and split; reset; GraphQL fields and mutations; tests for each read form and write form.
4. Installer `downloadRevision`; `PackageEditCapture`; the update calls it. Tests with fixture archives: capture, backup, prune, failure stops the update.
5. Web editors, stores, localization (en/zh-CN); the REQ-007 texts.
6. Docs and glossary.
7. Validation: isolated instance with a real GitHub package update (AC-002..004), a local package checkout (AC-001), and built-in agents across a restart.

## Key Tradeoffs

- Applying on read instead of rewriting files keeps checkouts clean and updates trivially safe. The cost is one in-memory step per read; the file is small and read once per change.
- A capture download per update: one archive from codeload, outside the API quota.

## Risks

- A package installed before revision tracking (`installedRevision` unknown) cannot be captured, so its update stops (REQ-006). Rare. The remedy is to remove and re-import the package.
- A user who removes a tool a built-in agent needs breaks that agent until Reset.

## Guidance For Implementation

- Follow the contract exactly. Its validation cases become unit tests.
- The form keeps sending full values; never send deltas from the web.
- No file write when only personal settings change (AC-001's `git status`).
- Keep `agent-definition-service.ts` under 500 lines: the split and apply rules live in `PersonalSettingsService`.

### UI (stage 1)

- In the agent, Team and Org editors, for a definition with `usesPersonalSettings`: one note line under the title, "Tools, skills, avatar and runtime/model are your personal settings on this computer. Package updates keep them." Teams and Orgs show "Avatar and runtime/model …".
- Orgs: the app edits only the avatar of an Org (`AgentOrgExperience.vue:482-492`). Org runtime/model stays editable only in the files. In a package, file edits are captured at the next GitHub update, and the effective value applies at launch. No Org runtime/model editor is added (not requested).
- Next to each setting that is in `personalSettings`: a small "Personal" label and a "Reset to the package's setting" link.
- zh-CN translations follow the localization guide.
