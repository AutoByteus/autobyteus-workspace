# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (design-only revision for ARCH-REV-001 AR-001, AR-002, AR-003; requirements unchanged)
- Approved requirements baseline: `requirements-doc.md` at SR-001 (still current), approved by the Solution Designer within the Task's direction, user informed in the Solution Designer's conversation on 2026-11-07.
- Behavior-defining supplements: None.
- User approval of the design, when the direction requires it: `Not required` (the Task does not ask for it).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order/tickets/in-progress/node-update-failure-and-release-order/investigation-notes.md`
- Authorities read (2026-11-07): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root; rules 1, 5, 9, 11 and 12 apply); also `TESTING.md` (Fresh-start build, test layers) and `RELEASE.md`.
- Project design-principle conflicts or discrepancies: none. A note on rule 12 and TESTING.md's Fresh-start build is under Guidance For Implementation.

## Current-State Read

- **Node outcomes (FU-003).** `NodeAutoUpdater` (main process) is the one owner of the automatic node-update record, `NodeAutoUpdateRecord`, `userData/node-auto-updates.json`. It reads nodes only in passes and follows, only for nodes with the switch on (`nodeAutoUpdater.ts:111-169`), and changes an entry only while it is `PENDING` (`decideNodeAutoUpdate.ts:19`). The Nodes-page card (`NodeServerUpdate.vue` → `NodeAutoUpdate.vue`) shows any ended outcome. It also suppresses its own result notice for that version (`NodeServerUpdate.vue:83-84`). A window cannot have the main process re-read a node (`nodeAutoUpdateIpc.ts`: get-state and mark-read only). Result, reproduced on the user's nodes (RUN-01, RUN-02): `AUTO_FAILED` for beta.7 stays although both nodes run beta.7.
- **Release order (FU-004).** Desktop Release's `publish-release` job uploads binaries and the four `latest*.yml` updater files in one softprops step (`release-desktop.yml:668-706`). It does not depend on Server Docker Release, whose package job uploads the six package files 0–26 min later (MEAS-01). electron-updater offers a version once its channel file exists (SRC-08).
- Constraints: C1–C4 frozen (DESIGN rule 9), so the starter and C1 stay unchanged. Auto updates stay opt-in and off by default. The 23 assets are unchanged.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: two concerns, each inside one existing owner. (1) The desktop's automatic node updates: 9 web files (rule, record, updater, IPC, preload and two typings, store, card) plus tests. (2) One workflow job, one new Python step test, RELEASE.md and two web docs. No new subsystem, no moved owner.
- Architectural risk: `High`
- Risk rationale: the release workflow's publish order changes. That is a deployment behavior: a late or failed server package job now holds the desktop update back (RSK-001), and the effect is seen only on a real tag (RSK-002). There is also a new window→main IPC command (internal contract) and a new record removal (persistence, directly usable). The node-side part alone would be Low.
- Escalation trigger: anything that needs a change to C1/C2 or the starter; any need to hold back the binaries or change who creates the GitHub release; a failure of the softprops/`gh` split on the runner.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| SRC-03 | `electron/nodeAutoUpdate/decideNodeAutoUpdate.ts:12-52` | Record rules live here as pure functions | New rule `isSupersededFailure` lives here | None |
| SRC-11 | `autobyteus-server-ts/docker/starter/update-status.mjs:73-84` | `relation` for any target | "Runs V or newer" = `?target=V` gives `same`/`older`; no comparator in the desktop | None |
| SRC-12 | `nodeAutoUpdater.ts`, `nodeAutoUpdateIpc.ts`, `electronApplication.ts:447-456`, `preload.ts:93-95` | One owner; no recheck path | `NodeAutoUpdater.recheckFailure` + IPC `node-auto-update:recheck` | None |
| SRC-05 | `NodeServerUpdate.vue:67-90` | The cell asks the node and already watches the auto entry | The cell asks the main process to recheck when its answer changes and the outcome is `AUTO_FAILED` | None |
| SRC-06/07 | `release-desktop.yml:584-706`; `release-server-docker.yml:160-168,353-400` | Publish job; package upload; predates-packages test | Split publish: binaries → wait → updater files | Seen on a real tag only |
| SRC-08/09 | electron-updater `GitHubProvider.js:114`; `appUpdateErrorClassifier.ts` | Missing channel file → `release-preparing`, quiet in background | Holding only `latest*.yml` is enough, with no app change | None |
| SRC-13 | `scripts/tests/test_release_channel_workflow_steps.py` | Step extraction + fake `gh` | New step test in the same style | None |

## Intended Change

1. The main process clears an `AUTO_FAILED` entry for V when the node answers that it runs V or newer. It does so at its own checks and when a node card asks it to recheck after the card's answer from the node changes.
2. Desktop Release uploads the binaries first, then waits for the six server package files, then uploads the four updater files. RELEASE.md and the docs say so.

## Change Scope (Mandatory)

- In scope: UC-001 to UC-004.
  - Desktop automatic node updates (`autobyteus-web/electron/nodeAutoUpdate/`, its IPC in preload and typings, `stores/nodeAutoUpdateStore.ts`, `components/settings/nodes/NodeServerUpdate.vue`).
  - Desktop Release's `publish-release` job.
  - A new step test in `scripts/tests/`.
  - `RELEASE.md`; `autobyteus-web/docs/electron_packaging.md` (Automatic Node Updates), `autobyteus-web/docs/settings.md` (Update automatically).
  - `docs/design-cases.md` Case 10: autobyteus-412 AR-002 added by the Solution Designer in SR-002 (already written in the worktree).
- Derived consumers of the record: `NodeAutoUpdate.vue` (`outcome`, `shown`, `isNew`): an entry that is gone shows nothing, which is the intended DEC-004 result, so no change. `NodeServerUpdate.vue` (`autoEntry`, `autoReported`, the refresh watch): with no entry, the card's notice shows as it does with no outcome, so no change beyond the new watch. Sidebar/Notification Center: they do not read the record (search: no reader outside these files), so N/A.
- Deliberately left alone:
  - The starter, C1/C2/C3 (frozen; not needed).
  - The one-attempt rule and `decideNodeAutoUpdate`.
  - Retrying `NO_PACKAGE_FOR_VERSION` (DEC-002).
  - Release creation and notes, the Android/iOS workflows, the Server Docker Release (its 30-min wait for the release stays).
  - The build-only run.
- Follow-ups: FU-001 (desktop retry of `NO_PACKAGE_FOR_VERSION`, held for evidence).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-003; AC-001, AC-002, AC-004 | Pass/follow answer, or recheck | PENDING-only reconcile | Superseded `AUTO_FAILED` removed; others unchanged | DS-001, DS-002 |
| BEH-002 | User | REQ-002; AC-003 | Card's answer from the node changes | Stale line; success hidden | Line gone after the main process's recheck; notice as with no outcome | DS-002 |
| BEH-003 | Operational | REQ-004–006; AC-005–007 | Tag push / publish dispatch | One upload of all files | Binaries → wait → updater files | DS-003 |
| BEH-004 | System | REQ-004 | Desktop update check | Offered at the updater upload | Offered only after the packages | DS-003 (no app change) |
| BEH-005 | Operational | REQ-007; AC-008 | Operator | — | RELEASE.md text | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (two defects).
- Current design issue found: `Yes`, small and local in both.
- Structural triggers:
  - *Behavior by absence* (Principle 13) fires for FU-003. Today the failure stops only "because a newer version replaces it". The fix is an explicit rule with its own result (`isSupersededFailure` → remove).
  - *Several kinds or forms* (Principle 1): the node can be updated by the automatic path, the card's button, the host command, or a new image. All are covered because the rule reads the node's version, not the route.
  - *Two parallel paths* (passes vs the card's recheck): both reach the same owner method and rule.
  - Ruled out:
    - *Authoritative boundary*: the window asks the main process to recheck; it never writes the record or decides.
    - *Derived data*: the renderer does not evaluate the rule, so there is one owner of the fact (Principle 11).
    - *Responsibility overload*: `nodeAutoUpdater.ts` 170 → ~195 lines; one concern.
    - *Persisted-data transition*: no shape change.
- Root cause classification:
  - FU-003: `Missing Invariant`. The record owner does not drop a failure once the node has passed it.
  - FU-004: `Missing Invariant` in the release order. The desktop availability does not depend on the packages it requires.
- Refactor needed now: `No`.
- Evidence: SRC-03, SRC-06, SRC-12; RUN-01/02; MEAS-01.
- Design response: extend the existing owners: the record rules, `NodeAutoUpdater`, the publish job.
- Refactor rationale: both owners are correct and small; the rules are missing, not misplaced.
- Intentional deferrals and residual risk: a desktop installed by hand in the gap still records a failure (SCN-005); it is truthful and clears after "Update to V" (FU-001).

## Terminology

- **Superseded failure**: an `AUTO_FAILED` entry for V whose node answers `?target=V` with `relation` `same` or `older` and no update `running`.
- **Updater files**: `latest-mac.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`, `latest.yml` on the release.
- **Server package files**: `autobyteus-server-<version>-linux-<x64|arm64>.{tar.gz,json,json.sig}`.
- Existing words are used as in `electron_packaging.md` and RELEASE.md; no glossary entry is needed (no new domain concept for `GLOSSARY.md`).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths: none. The softprops `files` lists lose their `latest*.yml` lines, which move to the new step (no dual upload).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: `userData/node-auto-updates.json` (`{ entries: {…} }`; 1 entry per remote node; 2 on the user's desktop).
- Change: entries may be removed by the new rule; no field change.
- Reader/writer: `NodeAutoUpdateRecord` (tolerant read, atomic write; `retain` already removes entries).
- Decision: `Directly Usable — No Migration`.
- Rationale: the shape is unchanged. Existing stale entries (RUN-01) are cleared by the normal rule at the first check after the fixed build runs. Before that, the desktop will have moved to the next version and requests it anyway.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Pass/follow timer | Record without the superseded failure; broadcast | `NodeAutoUpdater` | Switch-on nodes clear at their next check |
| DS-002 | Primary End-to-End | BEH-001, BEH-002 | Card's answer from the node changes | Card without the failure line | `NodeAutoUpdater` (decision); `NodeServerUpdate` (trigger) | Card correct at once, switch on or off, any update route |
| DS-003 | Primary End-to-End | BEH-003, BEH-004 | Tag push | Desktops offered V | Desktop Release `publish-release` job | Packages exist before any desktop updates |

## Primary Execution Spine(s)

- DS-001: `Pass timer → NodeAutoUpdater.checkNode → NodeUpdateClient.getStatus(?target=appVersion) → NodeAutoUpdater.reconcile → isSupersededFailure → NodeAutoUpdateRecord.remove → onChange broadcast → window store → card`
- DS-002: `NodeServerUpdate (the card has a node answer and its entry is AUTO_FAILED; re-evaluated on every change of the combined key answer version|update state|entry version|entry outcome) → nodeAutoUpdateStore.recheck → preload recheckNodeAutoUpdate → IPC node-auto-update:recheck → NodeAutoUpdater.recheckFailure [holds checking for the entry ID] → NodeUpdateClient.getStatus(?target=entry.version) → re-read the entry → isSupersededFailure on the re-read entry, still the AUTO_FAILED entry for the version asked about → NodeAutoUpdateRecord.remove → broadcast → [release checking] → store → NodeAutoUpdate (no line), NodeServerUpdate (notice as with no outcome)`
- DS-003: `v* tag → five desktop builds → publish-release: merge/validate updater metadata → notes mode → softprops upload of binaries (creates or updates the release) → wait for six server package files → gh release upload of four updater files → electron-updater on desktops offers V`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A pass reads the node for the app version. When the record's failure is for that version and the node runs it or newer with no update running, the entry is removed and the windows are told. Otherwise the existing PENDING reconcile runs. A pass clears a failure only while the desktop still runs the failed version: it asks `?target=<app version>`, and the rule needs `target.version === entry.version`. After the desktop has moved to V+1, a pass neither clears a V failure nor needs to (AR-003): the next accepted request replaces the entry, and a node that already runs V+1 or newer gets its V failure cleared by the card's recheck, which asks `?target=V`. | node status, record entry | `NodeAutoUpdater` | rule (`decideNodeAutoUpdate.ts`), record persistence |
| DS-002 | The card asks the node as today. Whenever the card has an answer from the node and its automatic entry is `AUTO_FAILED`, it asks the main process to recheck. It asks again on every change of either side: the answer's version or update state, or the entry's version or outcome. So the order in which the two arrive does not matter. On a window's first Nodes-page view the cell renders, and the store loads the entries, only after the first answer (AR-001). The main process asks the node about the failed version itself and applies the same rule, under the same per-node guard that passes hold. The window decides nothing. | card status, record entry | `NodeAutoUpdater` | IPC adapter, store |
| DS-003 | The publish job uploads everything except the updater files (creating the release if Android has not). It then polls the release until all six package files are present, at most 60 minutes, and only then uploads the updater files. A ref without server packages skips the wait. A timeout fails the job and names the missing files. | release assets | `publish-release` job | `gh` CLI |

## Spine Actors / Main-Line Nodes

`NodeAutoUpdater`, `NodeAutoUpdateRecord`, `NodeServerUpdate.vue` (trigger only), Desktop Release `publish-release` job.

## Ownership Map

- `NodeAutoUpdater`: owns when the record changes (sequencing, the `checking` guard, the decision to remove). Gains `recheckFailure(entryId)`.
- `decideNodeAutoUpdate.ts`: owns the record rules as pure functions. Gains `isSupersededFailure(entry, status)`.
- `NodeAutoUpdateRecord`: owns persistence. Gains `remove(entryId): boolean`.
- `nodeAutoUpdateIpc.ts`: thin adapter. Gains the `recheck` handler (fire-and-forget, validates a string ID).
- `nodeAutoUpdateStore`: the window's view. Gains `recheck(entryId)`: only when supported and the entry is `AUTO_FAILED`.
- `NodeServerUpdate.vue`: owns asking the node for the card. Gains a watch that triggers the recheck.
- `publish-release` job: owns the publish order.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why | Must Not Secretly Own |
| --- | --- | --- | --- |
| IPC `node-auto-update:recheck` / preload `recheckNodeAutoUpdate` | `NodeAutoUpdater.recheckFailure` | Window→main nudge | Any rule; any update request; any status payload from the window |

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `latest*.yml` lines in both softprops `files` lists | Moved | "Publish the desktop updater files" step | No other removal. Dead-code check of the touched `nodeAutoUpdate` files and `shared/nodeAutoUpdateTypes.ts` at `6225a734a3` (`git grep -l <export>`): every export is used by its own module or its callers; `NodeAutoUpdateOutcome` is used in its own file by `NodeAutoUpdateEntry`. None found |

## Return Or Event Spine(s) (If Applicable)

The existing broadcast `node-auto-update:changed` carries the result back to every window; no new event.

## Bounded Local / Internal Spines (If Applicable)

- Parent: `publish-release` "Wait for the server packages" step: `check ref has system-level.json → loop up to 120 × 30 s: gh release view --json assets → all six present? exit 0 → else sleep → after loop: ::error:: with missing names, exit 1`. It matters because its bound is the release's failure mode.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `isSupersededFailure` | DS-001, DS-002 | `NodeAutoUpdater` | The rule | One definition for both paths | Two copies drift |
| `NodeAutoUpdateRecord.remove` | DS-001, DS-002 | `NodeAutoUpdater` | Atomic save without the entry | Persistence | — |
| `gh` asset polling | DS-003 | publish job | Read the asset list | — | — |

## Ownership Boundaries

The window may only ask for a recheck by entry ID. The main process fetches the node itself (through the entry's `baseUrl`, as passes do) and decides. The window never passes a status, never writes the record, and never causes an update request (356 REQ-006): `recheckFailure` calls no `requestUpdate`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `NodeAutoUpdater` | record, client, rules | IPC handler, timers | IPC handler calling `record.remove` or the client directly | Add a method on `NodeAutoUpdater` |

## Dependency Rules

- `nodeAutoUpdateIpc.ts` depends on a `recheck(entryId)` function from the application wiring (bound to `NodeAutoUpdater.recheckFailure`), not on the client or the rules.
- The renderer depends on the preload API only.
- The rule file stays pure (no I/O).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `isSupersededFailure(entry: NodeAutoUpdateEntry \| null, status: NodeServerStatus): boolean` | record entry vs node status | The rule | — | True only for `AUTO_FAILED`, `status.target?.version === entry.version`, `relation` `same`/`older`, `update?.state !== 'running'` |
| `NodeAutoUpdateRecord.remove(entryId): boolean` | record | Remove and save | desktop entry ID | False when absent |
| `NodeAutoUpdater.recheckFailure(entryId): Promise<void>` | one node's failure | The sequence it drives, in order: (1) return when stopped, or `checking` or `follows` has the entry ID; (2) read the entry, and return unless it is `AUTO_FAILED`; note its `version` as V; (3) find the node in the registry by entry ID (any remote entry, the switch is not read), return if absent; (4) add the entry ID to `checking`; (5) `getStatus(node.baseUrl, V)`; (6) after the await: return if stopped or there is no status; (7) re-read the entry, and remove it only if it is still `AUTO_FAILED` for V and `isSupersededFailure(reRead, status)` holds; then emit; (8) `finally`: delete the entry ID from `checking` | desktop entry ID | Holding `checking` makes a pass's `checkNode` for the same node a no-op while the recheck waits (`nodeAutoUpdater.ts:112`), as two passes already exclude each other. Step 7's re-read protects a `PENDING` or `AUTO_UPDATED` entry that another writer stored meanwhile. No update request, ever |
| IPC `node-auto-update:recheck` (constant `NODE_AUTO_UPDATE_IPC_RECHECK` in `shared/nodeAutoUpdateTypes.ts`) | — | Forward a string ID | entry ID | Returns nothing; the result comes by broadcast |
| `nodeAutoUpdateStore.recheck(entryId)` | — | Call the preload only for `AUTO_FAILED` | entry ID | — |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| all above | Yes | Yes (desktop entry ID) | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| rule | `isSupersededFailure` | Yes | Yes | Low | — |
| method | `recheckFailure` | Yes | Yes | Low | — |
| IPC | `node-auto-update:recheck` / `recheckNodeAutoUpdate` | Yes (matches existing `node-auto-update:*`, `…NodeAutoUpdate…`) | Yes | Low | — |
| steps | "Wait for the server packages", "Publish the desktop updater files" | Yes (RELEASE.md words) | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Node status read | `NodeUpdateClient.getStatus` | Reuse | Same C1 call |
| Window notification | `node-auto-update:changed` broadcast | Reuse | — |
| Workflow step tests | `test_release_channel_workflow_steps.py` helpers | Reuse | — |
| Predates-packages test | `system-level.json` presence (server workflow) | Reuse the same test | One meaning of "has server packages" |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `autobyteus-web/electron/nodeAutoUpdate/` | rule, record, updater, IPC | DS-001, DS-002 | Extend |
| `autobyteus-web` renderer (store, card) | trigger | DS-002 | Extend |
| `.github/workflows/release-desktop.yml` | publish order | DS-003 | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed the draft).

## Reusable Owned Structures Check

| Repeated Structure | Candidate | Decision |
| --- | --- | --- |
| The six package names | — | Built in the wait step from the version and the two architectures; the server job builds the same names from `NORMALIZED_TAG` and `ARCH`. A shared script for two shell lines is not worth it; the step test asserts the names against the `descriptionName` grammar (`release-source.mjs:13-15`) |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `NodeAutoUpdateEntry` | Yes (unchanged) | Yes | Low | — |

## Final File Responsibility Mapping

| File | Change | Concrete Concern |
| --- | --- | --- |
| `autobyteus-web/electron/nodeAutoUpdate/decideNodeAutoUpdate.ts` | Modify | + `isSupersededFailure` |
| `autobyteus-web/electron/nodeAutoUpdate/nodeAutoUpdateRecord.ts` | Modify | + `remove` |
| `autobyteus-web/electron/nodeAutoUpdate/nodeAutoUpdater.ts` | Modify | `reconcile` applies the superseded rule first (remove + emit, return); + `recheckFailure` |
| `autobyteus-web/electron/nodeAutoUpdate/nodeAutoUpdateIpc.ts` | Modify | + `recheck` handler; new parameter `recheck: (entryId: string) => void` |
| `autobyteus-web/electron/application/electronApplication.ts` | Modify | Create the updater before registering the IPC and pass `(id) => void updater.recheckFailure(id)` |
| `autobyteus-web/shared/nodeAutoUpdateTypes.ts` | Modify | + `NODE_AUTO_UPDATE_IPC_RECHECK` |
| `autobyteus-web/electron/preload.ts`, `electron/types.d.ts`, `types/electron.d.ts` | Modify | + `recheckNodeAutoUpdate(entryId): Promise<void>` |
| `autobyteus-web/stores/nodeAutoUpdateStore.ts` | Modify | + `recheck` |
| `autobyteus-web/components/settings/nodes/NodeServerUpdate.vue` | Modify | + one watch (cell part only) on the combined key `${status?.version}\|${status?.update?.state}\|${autoEntry?.version}\|${autoEntry?.outcome}`, with `immediate: true`. On each change it calls `autoUpdates.recheck(autoUpdateEntryId)` when a status is present and the entry's outcome is `AUTO_FAILED`. No recheck otherwise |
| Tests: `electron/nodeAutoUpdate/__tests__/{decideNodeAutoUpdate,nodeAutoUpdateRecord,nodeAutoUpdater}.spec.ts`, `components/settings/nodes/__tests__/NodeServerUpdate.spec.ts`, `stores` spec if present | Modify / Add | AC-001–004. Required cases: (a) the rule's cleared and not-cleared cases (examples table), including a pass at V+1 that leaves a V failure in place (AR-003); (b) `recheckFailure` for a switch-off node asks `?target=<entry.version>` and removes the entry; (c) a pass that starts while a recheck awaits the node does nothing for that node, and a `PENDING` entry stored during the await is not removed (AR-002); (d) the card: entries arrive after the first answer, switch off → exactly one recheck (AR-001); the answer changes later → one more; entry not `AUTO_FAILED` → none |
| `.github/workflows/release-desktop.yml` | Modify | `publish-release` split (DS-003) |
| `scripts/tests/test_desktop_release_server_package_wait.py` | Add | Runs the two new steps with fake `gh`/`sleep`; checks the softprops lists hold no `latest*.yml` and the step order |
| `RELEASE.md` | Modify | Watching The Rollout (the desktop run waits for the packages; the order), Recovery (missing packages), Workflow Reference. Recovery names the combined case: when the Android release fails and the desktop builds take longer than the server package job's 30-min wait for the release, the server job fails first, and the desktop publish job then fails after its own 60-min wait. Recovery: rerun the Server Docker Release's failed jobs (the release exists by then, created by the desktop's binary upload), then rerun the desktop publish job |
| `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/settings.md` | Modify | Superseded failure rule and recheck |

## Applied Patterns (If Any)

None beyond the existing ones.

## Target Subsystem / Folder / File Mapping

As above; no new folders.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `electron/nodeAutoUpdate/` | Main-line domain-control | Yes | Low | Unchanged layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Clearing | Main: `getStatus(baseUrl, entry.version)` → `{version:'1.5.12-beta.7', target:{version:'1.5.12-beta.7', relation:'same'}, update:{state:'succeeded'}}` → `isSupersededFailure` true → `record.remove` | Renderer hides the line with its own copy of the rule, or sends its status to main to write | One owner of the fact; the window cannot write the record |
| Not cleared | `{target:{relation:'newer'}}` (node still older); `{relation:'same', update:{state:'running'}}` (trial may roll back); an entry for V with `target.version` ≠ V (a pass of a desktop that now runs V+1: a pass never clears a V failure; the card's recheck, asking `?target=V`, does, AR-003) | Clearing on any `succeeded` update of another version | DEC-005 |
| Card trigger, first view (AR-001) | Window opens Settings → Nodes for the first time. The cell's first answer `V\|succeeded` arrives (entry still unknown: key `V\|succeeded\|undefined\|undefined`, no recheck). `NodeAutoUpdate` mounts and `initialize` loads `AUTO_FAILED V` (key `V\|succeeded\|V\|AUTO_FAILED`, one recheck). Main removes the entry; broadcast (key `…\|undefined\|undefined`, no recheck) | A watch on the answer alone, with the entry checked as a side condition: it fires before the entry is known and never again | The two inputs arrive in either order |
| Recheck vs pass (AR-002) | Recheck adds `e1` to `checking` → awaits `?target=V`. Meanwhile a pass's `checkNode(e1)` returns at once (`checking` has `e1`). Answer `same` → re-read: still `AUTO_FAILED V` → remove. Had another writer stored `PENDING V+1` meanwhile, the re-read sees it and nothing is removed | Read the entry and check the guard, then await, then remove unconditionally | A lost `PENDING` would stop its follow and lose the outcome |
| Publish | `softprops (no latest*.yml)` → `wait (six files)` → `gh release upload latest-mac.yml latest-linux.yml latest-linux-arm64.yml latest.yml --clobber` | Wait before softprops (no release yet if Android failed → both workflows wait for each other) | ASM-001 |

The four updater file paths in the job are explicit: `release-artifacts/latest-mac.yml`, `release-artifacts/linux-x64/latest-linux.yml`, `release-artifacts/linux-arm64/latest-linux-arm64.yml`, `release-artifacts/windows-x64/latest.yml`. The softprops globs today pick the same four. The per-arch `macos-*/latest-mac.yml` files were never uploaded: `release-artifacts/latest-mac.yml` is the merged one.

The wait step:
- Its condition is `test -f autobyteus-server-ts/docker/system-level.json`, in the checked-out release ref, otherwise a notice and exit 0.
- It polls 120 times at 30 s (60 min). The basis is MEAS-01: the package lag after the desktop is at most 26 min, and the tag-to-package time is 34–43 min.
- The error text names the tag and every missing file, and says: "rerun the Server Docker Release's failed jobs, then rerun this job".

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep uploading `latest*.yml` with softprops and also later | Safety | Rejected | Single later upload |
| Desktop-side version comparator for "newer than V" | Clearing | Rejected / N/A | C1 `relation` for `?target=V` |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. The rule and `remove`, with their unit tests (start from the RUN-02 reproduction test: `AUTO_FAILED` for V plus a status that runs V → expect removal).
2. `NodeAutoUpdater.reconcile` and `recheckFailure`, with tests: a pass clears; recheck for a switch-off node; recheck uses `entry.version`; no request; guards.
3. IPC, preload, typings, wiring; the store `recheck`; the card watch, with component tests.
4. Docs (`electron_packaging.md`, `settings.md`).
5. The workflow split and the step test.
6. RELEASE.md.

## Key Tradeoffs

- One owner with a nudge (one extra GET per card answer change while a failure shows) versus a renderer-side filter: one source of truth wins.
- Holding back only the updater files leaves installers public in the gap (SCN-005); holding everything would mean changing who creates the release.
- The 60-min bound: long enough for a normal release; a failed server job surfaces as a failed desktop publish job too.

## Risks

- RSK-001: a server package failure now also blocks the desktop update. This is intended; RELEASE.md describes the recovery.
- RSK-002: the real order is observable only on the next tag. The delivery engineer checks the asset `createdAt` order then (AC-005).
- The card's address and the entry's `baseUrl` may differ (a node reached through another route). The main process then cannot reach the node, and the failure stays until it can; passes have the same limitation today.

## Guidance For Implementation

- Reproduction to start from: the unit test in Change Sequence step 1, from RUN-02 (`investigation-notes.md`).
- Do not touch the starter, C1, `decideNodeAutoUpdate` or the one-attempt rule.
- `recheckFailure` must not call `requestUpdate` and must not depend on the switch.
- Workflow: keep the two softprops steps (curated/generated notes) and remove only their `latest*.yml` lines. The new steps run after both and need `GH_TOKEN: ${{ github.token }}` and `GH_REPO: ${{ github.repository }}` (job permission `contents: write` is already set at workflow level).
- Tests: no test-only knob in the workflow (DESIGN rule 11). The step test fakes `gh` and `sleep` on `PATH`, as the existing step tests do.
- DESIGN rule 12 / TESTING.md Fresh-start build:
  - The changed step reads no build output, and no gate or build step changes, so rule 12's conditions for a gate do not fire.
  - TESTING.md's path list matches `.github/workflows/**`. The build-only run skips `publish-release`, so it cannot exercise this change.
  - Recommendation for API/E2E and delivery: the step test is the proof for the workflow part. Whether the path rule still asks for a fresh-start desktop build is theirs to record, as in S1's report.
- Validation on isolated nodes (Task constraint): an isolated packaged desktop and an isolated Docker node. Never the user's nodes 8001/8003, which RUN-02 only read.
