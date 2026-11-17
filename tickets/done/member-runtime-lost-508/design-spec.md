# Design Spec — autobyteus-508

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the founder in the Solution Designer's conversation, 2026-11-17 (fix the migration itself for not-yet-upgraded installations; same ID, no new migration; he repairs his already-converted data himself).
- Behavior-defining supplements: None.
- User approval of the design: `Obtained` — the founder confirmed the same-ID correction of the existing migration, 2026-11-17 ("we just fixed the wrong migration … no need to create a new migration").
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/investigation-notes.md`
- Authorities read (2026-11-17): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repo root; rules 7–11 and "Persisted data and migrations"), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (§1–§7, "Sealed migration area").
- Conflicts or discrepancies: None.

## Current-State Read

`20261111_delegated_runs_own_runs_v1` converts each pre-461 delegated run file once at startup. For an edited run it applies the released `userLaunchSelection` through two spots in `src/app-data-migrations/migrations/delegated-runs-own-runs-v1/run-file-conversion.ts`:

- `convertAgentRunFile` (lines 52-59): `selection ? { llmModelIdentifier, llmConfig } : { launchSource }` — the selection's `runtimeKind` is not applied; the source is dropped.
- `withSelection` (lines 64-65), used by `convertTeamRunFile` for a member's own edit or the team edit of a follower (lines 96-102): replaces `llmModelIdentifier` and `llmConfig` on `launchConfiguration` only; the member's `launchSource` is dropped.

The released meaning (beta.6 `run-execution-tree-shared-records.ts:242-260`): effective launch = `{ ...started, runtimeKind: selection.runtimeKind ?? started.runtimeKind, llmModelIdentifier: selection.llmModelIdentifier, llmConfig: selection.llmConfig }`. The `20261114_*` follow-ups subclass the migration (`delegated-runs-preserved-items-v1.ts:62`) and call the same functions. Current readers accept `launchSource.origin = "settings"` (`run-history/store/launch-configuration-source-schema.ts:24` with `LAUNCH_CONFIGURATION_ORIGINS`, which includes `settings`), and a live Settings save records `{origin: "settings", fallbacks: []}` (`runtime-selection-rule.ts:147`, `team-run-selection-mutator.ts:102`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one source file (`run-file-conversion.ts`, ~10 changed lines) plus test fixtures and test cases in the existing 461 migration test folder; no new owner, API, field or migration.
- Architectural risk: `Low`
- Risk rationale: a same-ID correction of a released conversion's value mapping (data_migration_guideline §7); no registry, disposition, schema or reader change; the target shape (runtime field, `settings` source) is already the current schema. It touches persisted-data conversion, but only its value mapping for edited records, and installations that already ran it are skipped. The only real exposure is the conversion output itself, covered by released-shape fixtures.
- Escalation trigger: any need to change dispositions, the registry, the current schema/readers, or to touch already-converted data → return `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `run-file-conversion.ts:52-59, 64-65, 96-102` | Runtime and source of an edit dropped | Fix both spots | None |
| Code (released) | beta.6 `run-execution-tree-shared-records.ts:16-21, 242-260` | `runtimeKind?` on the edit; `?? started` rule | Apply `runtimeKind` only when present | None |
| Code | `delegated-runs-preserved-items-v1.ts:62` | Follow-ups reuse the functions | No separate follow-up change | None |
| Code | `launch-configuration-source-schema.ts:24`; `launch-configuration-source.ts:57,67` | `settings` is a current origin | Write `{origin: "settings", fallbacks: []}` | None |
| Probe | `probes/probe-508-runtime-selection.test.ts` | 3/3 fail today with the founder's pair | Regression tests | None |
| Doc | data_migration_guideline §7, "Sealed migration area" | Same-ID correction; migrations import no application code | Literal source constant inside the migration folder | None |

## Intended Change

Make the conversion apply a released edit whole — runtime (when named), model, model settings — and record the edited run with the Settings-edit source, in the two spots of `run-file-conversion.ts`; prove it with released-shape fixtures in the existing 461 tests.

## Change Scope (Mandatory)

- In scope: UC-001. `run-file-conversion.ts` (conversion value mapping); the 461 migration tests and their released-shape fixtures.
- Derived consumers: the converted files are read by `AgentRunMetadataStore` and `validateTeamRunExecutionTreePayload` (current readers; both accept the produced shape, asserted in tests); Settings views show the stored source (`settings` renders as the run's own edit, as for a live save) — no code change.
- Deliberately left alone: registry and IDs; dispositions and aggregate status; team `defaultLaunchConfiguration` (461 keeps the started default); already-converted installations; activation/start path and Settings UI (FU-001).
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / ACs | Approved Trigger | Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract (upgrade) | REQ-001…REQ-003; AC-001…AC-006 | App start running `20261111_…` / `20261114_*` | Runtime and source of an edit dropped (Current-State Read) | Edit applied whole; Settings source recorded; everything else unchanged | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `probes/probe-508-runtime-selection.test.ts` | Reproduction | REQ-001, AC-001…AC-003 | Starting point; becomes green; the real tests replace it | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No` (the owner and boundary are right; one mapping is incomplete)
- Structural triggers: `Persisted-data transition` fires (a released conversion's output changes) → decided below (same-ID correction). Plausible others ruled out: `Repeated coordination` — the edit-apply rule exists in two spots of one file; the design gives it one local function (`withEdit`) used by both, so the rule lives once in the migration. `Vocabulary drift` — none (no new names). `Hidden dependency` — none.
- Deliberate deviations: None.
- Root cause classification: `Local Implementation Defect` (the conversion's shape inventory lacked the autobyteus-348 runtime-switch edit, so tests never covered it).
- Refactor needed now: `No`
- Evidence: Current-State Read.
- Design response: one local function in `run-file-conversion.ts` applies an edit to a launch-shaped record; both conversion paths use it.
- Refactor rationale: N/A.
- Intentional deferrals and residual risk: FU-001 (mismatch warning/start refusal) — only the founder's converted data can hold a mismatch; he repairs it.

## Terminology

- *Settings edit*: the released `userLaunchSelection` (user's choice for a stopped delegated copy: model, settings and optional runtime). No project glossary change.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: None (released shapes stay inside the migration, as required).
- Compatibility wrappers, dual paths, or legacy fallbacks kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: pre-461 delegated runs' `run_metadata.json` (with `taskAgent`) and `team_run_execution_tree.json` (with `taskAgent`), on installations that have not run `20261111_…`.
- Change: the conversion's output for edited records (runtime and source).
- Reader/writer evidence: current readers accept the target (Current-State Read).
- Decision: `Migration Required` — correction of the existing released migration under the same ID (guideline §7), not a new migration.
- Rationale: the conversion is the only owner that can read the released edit; for not-yet-converted installations the corrected mapping is the whole fix. For converted installations (only the founder's), the value is gone from the data; a new migration would have to guess (guideline §2: "Stop and revise if an answer requires guessing"), so none is added; he repairs in Settings.
- ACs supported: AC-001…AC-006.

### Migration Plan

- Current canonical schema: unchanged.
- Older shapes: the released `taskAgent.userLaunchSelection` (agent run, team-level) and `rootTeam.members[].userLaunchSelection` with optional `runtimeKind`.
- Why direct use / rebuild are insufficient: the released edit lives only in the pre-461 file the conversion rewrites.
- Trigger: `Startup` (existing).
- Owner and location: `src/app-data-migrations/migrations/delegated-runs-own-runs-v1/run-file-conversion.ts` (existing).
- Normal runtime path stays current-schema-only: yes; no runtime change.
- Historical-shape knowledge confined to migration code: yes.
- Completion marker: the existing ledger record per ID; terminal records stay skipped.
- Restart safety: unchanged (per-file atomic write; a converted file is recognized as current).
- Validation: existing (converted files load through current readers, asserted in tests).
- Backup / rollback: none added (guideline §7: proportionate; existing behavior).
- Old/new access risk: none new.
- Retention: the migration stays registered as is.

| Migration Step | Source Shape | Target Shape | Owner | Validation | Failure / Recovery |
| --- | --- | --- | --- | --- | --- |
| Apply an agent run's edit (step 4) | `run_metadata.json` with `taskAgent.userLaunchSelection {runtimeKind?, llmModelIdentifier, llmConfig, selectedAt}` | top-level `runtimeKind` (edit's, else unchanged), `llmModelIdentifier`, `llmConfig`; `launchSource: {origin: "settings", fallbacks: []}` | `convertAgentRunFile` | `AgentRunMetadataStore.readMetadataState` = present (test) | Unchanged dispositions |
| Apply a member's own edit or the team edit to a follower (step 4) | `rootTeam.members[]` with `launchConfiguration`, `followsTeam`, `userLaunchSelection?`, `launchSource?`; `taskAgent.userLaunchSelection?` | member `launchConfiguration` with the edit's `runtimeKind` (when named), model, settings; `launchSource: {origin: "settings", fallbacks: []}`; unedited members keep their recorded `launchSource` | `convertTeamRunFile` | `validateTeamRunExecutionTreePayload` (test) | Unchanged dispositions |

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | App start (migration runner) | Converted delegated run file read by current stores at restore | `DelegatedRunsOwnRunsV1AppDataMigration` (and its `PreservedItemsFollowUp` subclass) | Where the edit is lost today |

## Primary Execution Spine(s)

`App startup -> AppDataMigrationRunner -> DelegatedRunsOwnRunsV1AppDataMigration.convertRunFiles -> convertAgentRunFile / convertTeamRunFile -> withEdit -> atomic write -> AgentRunMetadataStore / team tree reader at restore -> activation on the stored runtime`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | On upgrade, the migration reads each pre-461 delegated run file; for an edited run, `withEdit` applies the released edit to the launch as one unit (runtime when named, model, settings) and the converted record carries the Settings source; the file is written atomically and later restored on the user's chosen runtime. | delegated run file, Settings edit, launch | the migration | dispositions/log (unchanged) |

## Spine Actors / Main-Line Nodes

Migration runner; the 461 migration; the two conversion functions; the current readers.

## Ownership Map

- The 461 migration owns the conversion of released delegated run files (sequencing, dispositions; unchanged).
- `run-file-conversion.ts` owns the value mapping of one file; `withEdit` (renamed from `withSelection`, see Naming) owns "apply a released edit to a launch".

## Thin Entry Facades / Public Wrappers

N/A — none added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| The inline `selection ? { llmModelIdentifier, llmConfig } : …` mapping in `convertAgentRunFile` | Duplicates the edit rule incompletely | `withEdit` | — |
| `withSelection` (name and body) | Incomplete rule | `withEdit` | Renamed: it applies the user's Settings edit |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Migration log and dispositions | DS-001 | the migration | unchanged | — | — |

## Ownership Boundaries

Migration code stays sealed: `run-file-conversion.ts` writes the Settings source as a literal constant in its own folder; it does not import `SETTINGS_LAUNCH_SOURCE` from application code (guideline "Sealed migration area").

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin |
| --- | --- | --- | --- | --- |
| `DelegatedRunsOwnRunsV1AppDataMigration` | `convertAgentRunFile`, `convertTeamRunFile`, `withEdit` | runner; `PreservedItemsFollowUp` (subclass) | application code importing the migration | N/A |

## Dependency Rules

- `run-file-conversion.ts` imports only its own folder (`released-delegation-scan.ts`) as today. No application-code import.
- Collaborators: unchanged. Process-wide bindings added or used: None.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `withEdit(launch: RawRecord, edit: RawRecord): RawRecord` (module-local) | a launch-shaped raw record | apply `runtimeKind` (if the edit names one), `llmModelIdentifier`, `llmConfig ?? null` | raw record | Used for team `launchConfiguration` and for the agent run's own top-level fields |
| `convertAgentRunFile`, `convertTeamRunFile` | one released file | signatures unchanged | run ID + raw file | — |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `withEdit` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Same Meaning Everywhere? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| apply edit | `withEdit` | Yes | Yes (comments already say "Settings edit") | Low | — |
| source constant | `SETTINGS_EDIT_SOURCE` (module-local) | Yes | Yes (= current `settings` origin) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability | Decision | Why | If New, Why |
| --- | --- | --- | --- | --- |
| Settings source value | `SETTINGS_LAUNCH_SOURCE` (application) | Create local literal | Sealed migration area forbids importing application code | — |
| Edit rule | `withSelection` | Extend (as `withEdit`) | Same owner | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owners Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `app-data-migrations/migrations/delegated-runs-own-runs-v1` | conversion | DS-001 | the migration | Extend | — |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `run-file-conversion.ts` | migration folder | conversion | one file's value mapping | existing | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Edit rule (2 spots) | `run-file-conversion.ts` (`withEdit`) | migration folder | one rule | Yes | Yes | A shared helper outside the migration |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| N/A (no shared structure) | — | — | — | — |

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/delegated-runs-own-runs-v1/run-file-conversion.ts` | migration | conversion | apply edits whole; Settings source | existing | No |
| `autobyteus-server-ts/tests/fixtures/app-data-migrations/released-delegation-shape-fixtures.ts` | tests | fixtures | add released edits that name a runtime (member own edit; team-level edit; agent run edit; pending switch) | existing | — |
| `autobyteus-server-ts/tests/app-data-migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.test.ts` | tests | 461 migration tests | AC-001…AC-005 cases; existing expectations updated for the Settings source | existing | — |
| `autobyteus-server-ts/tests/app-data-migrations/delegated-runs-own-runs-v1/delegated-runs-preserved-items-v1.test.ts` | tests | follow-up tests | AC-006: one late item with a runtime-naming edit | existing | — |

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; no new folder or file.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `migrations/delegated-runs-own-runs-v1/` | Off-spine (migration) | Yes | Low | existing |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Edit rule | `const withEdit = (launch, edit) => ({ ...launch, ...(text(edit.runtimeKind) ? { runtimeKind: edit.runtimeKind } : {}), llmModelIdentifier: edit.llmModelIdentifier, llmConfig: edit.llmConfig ?? null });` | copying only model and settings (today) | the founder's exact failure |
| Agent run | `...(selection ? { ...withEdit(own, selection) top-level fields, launchSource: SETTINGS_EDIT_SOURCE } : isRecord(taskAgent.launchSource) ? { launchSource: taskAgent.launchSource } : {})` — apply to the run's own top-level `runtimeKind`/`llmModelIdentifier`/`llmConfig` | importing `SETTINGS_LAUNCH_SOURCE` from `agent-collaboration/domain` | sealed migration area |
| Team member | `own ? { ...at, launchConfiguration: withEdit(member.launchConfiguration, own), launchSource: SETTINGS_EDIT_SOURCE } : { ...at, ...(launchSource !== undefined ? { launchSource } : {}) }` (keep `withEdit`'s `isRecord(launch)` guard as today) | — | — |
| Pending switch | kept as written (member `...member` spread; agent top-level move as today) | dropping or rewriting the pending switch | AC-005 |

Where `SETTINGS_EDIT_SOURCE = Object.freeze({ origin: "settings", fallbacks: [] })` is local to `run-file-conversion.ts` (a fresh plain object per write is fine; the atomic writer serializes it).

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| A runtime-side fallback that "corrects" a stored mismatched pair at restore | Repair converted data | Rejected | No old-shape logic in runtime; the founder repairs his data in Settings; FU-001 for a warning |
| A new migration inferring lost runtimes from traces/model names | Repair converted data | Rejected | Would guess (guideline §2) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Add the released-shape fixtures (edits naming a runtime; the pending-switch shape) and the tests for AC-001…AC-006; run them red (the probe in `probes/` shows the expected failures).
2. Change `run-file-conversion.ts`: `withEdit` + `SETTINGS_EDIT_SOURCE`; use it in both conversions.
3. Update the existing expectations that asserted "no source" for edited members (`delegated-runs-own-runs-v1-app-data-migration.test.ts:119-127`: `/solution_designer` and `/code_reviewer` now carry `{origin: "settings", fallbacks: []}`) — this is the approved behavior change (REQ-002), not a test bent to pass.
4. Run the 461 folder tests, the registry order test, the server typecheck.
5. Update the 461 migration's doc comments (lines 32-36, 74-79) to say the edit's runtime is applied and the Settings source recorded.

## Key Tradeoffs

- Same-ID correction helps every not-yet-converted installation and changes nothing for converted ones; the founder's records are repaired by hand (his choice).

## Risks

- R-1: 461 reaching stable before this fix → REQ-004 release gate (delivery; release on the founder's word).
- R-2: a converted file failing the current reader because of the new source → asserted by reading converted files through the current stores in the tests.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/member-runtime-lost-508/probes/probe-508-runtime-selection.test.ts` — copy it into `autobyteus-server-ts/tests/app-data-migrations/delegated-runs-own-runs-v1/` and run `cd autobyteus-server-ts && npx vitest run tests/app-data-migrations/delegated-runs-own-runs-v1/probe-508-runtime-selection.test.ts`; 3/3 fail today, all must pass after the fix. The probe is a scratch reproduction: the committed regression tests are the released-shape fixture cases in the existing 461 test files (TESTING.md: hand-built released shapes, never real data). Do not commit the probe into `tests/`.
- Private data: no test, fixture or report may contain or be derived from the founder's records beyond the shape (field names and runtime/model identifiers are shape).
