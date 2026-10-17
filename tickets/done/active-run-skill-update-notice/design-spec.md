# Design Spec — `active-run-skill-update-notice`

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (ARCH-REV-002 AR-004: native history recording of a combined dispatch). Earlier: `SR-003` (ARCH-REV-001), `SR-002`.
- Approved requirements baseline, who approved, and reference: `requirements-doc.md` at **SR-003**. Approved by the Solution Designer within the direction (user informed). The SR-003 changes: REQ-004 (agent-message semantics per runtime capability, following the user's "same as agent messages" wording), REQ-005 (combined at dispatch), REQ-008/009 (name-keyed), REQ-010 (explicit ignore list), AC-001/002/005, QR-003, DEC-009–011. The user was informed on 2026-10-13 after ARCH-REV-001.
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/investigation-notes.md`
- Authorities read: `references/architecture-design.md` (2026-10-13), `references/design-principles.md` (2026-10-10, unchanged), root `DESIGN.md` (unchanged in this base), `TESTING.md` (rewritten version, 2026-10-13). `design-examples.md` not used.
- Project design-principle conflicts: None.

## Current-State Read

- **Skill files are always current for every runtime.**
  - Native AutoByteus advertises absolute `SKILL.md` paths and reads them on demand.
  - Codex, Claude and Grok symlink whole skill folders into the run workspace.
  - Each runtime resolves the run's configured skills once, at activation (`resolveConfiguredSkillBindingsForAgent`).
- **What goes stale** is only the skill text an agent already read into its conversation. Nothing tells it to re-read. (Notes BEH-001/002.)
- **One activation point.** Every `AgentRun` is constructed and published through `AgentRunManager.beginActivation` (kinds `new`, `restore`, `platform_restore`). That covers standalone runs, team and org members (through the configured-agent activation planner) and delegated copies.
- **Two admission methods.** Every input to a run ends in `AgentRun.postUserMessage` or `reserveUserMessage`. A busy run appends to its active turn (`append_to_active_turn`); an idle run starts a turn.
- **Existing system-notice pipeline:**
  - SYSTEM-sender input with `suppress_system_task_notification`;
  - an `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` run event, which every root's presentation adapter maps to `{sender: system}`;
  - a `system_task_notification` raw trace, used by history replay but recorded only for the Claude background-notice sender;
  - the web `SystemTaskNotificationSegment`.
- **Watching precedent.** `src/agent-package-definitions/` uses an in-process chokidar watch with a 1000/3000 ms settle window.
- **Ignore precedent.** `file-explorer/traversal-ignore-strategy/` holds the code-workspace ignore rules.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - **New server subsystem:** skill folder watcher, run skill tracker, seen-versions store, folder snapshotter, notice service and notice builder.
  - **A new input-preface port** in the core run boundary (`AgentRun`), wired at the single activation point.
  - **Memory recorder change** for history replay.
  - **Web:** a label and localization for the existing segment.
  - **Tests** across six runtimes.
- Architectural risk: `High`
- Risk rationale:
  - The change touches `AgentRun` input admission, which every input of every runtime crosses (blast radius, concurrency and ordering).
  - Adds new persisted per-run state (additive).
  - Adds a new watcher lifecycle.
  - Mid-turn delivery depends on each runtime's existing append behavior.
- Escalation triggers (return `Design Impact`):
  - a runtime whose append path cannot accept a SYSTEM input mid-turn;
  - any input path that bypasses `postUserMessage` / `reserveUserMessage`;
  - a need to change run metadata or execution-tree schemas;
  - watch cost beyond QR-002.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `agent-run-manager.ts:122–160, 368–371` | Single activation point; new vs. restore explicit | Tracker hooks here; preface port injected in `constructRun` | — |
| Code | `agent-run.ts:166–200` | Two admission methods; append when busy | Preface admitted immediately before the next input, in the same dispatch step | Exact `reserveUserMessage` ordering (verify in implementation) |
| Code | input producers (notes table) | Many callers | The preface lives in `AgentRun`, never in callers | — |
| Code | `collaboration-agent-presentation-adapter.ts:360–366`; `agent-input-pipeline.ts:94–101` | System event mapping; native auto-emit unless suppressed | Publish the run event ourselves and set the suppression flag | — |
| Code | `runtime-memory-event-accumulator.ts:237–252` | Records only the Claude background-notice sender | Add the skill-notice sender | — |
| Code/Data | `root-run-package-current-validator.ts:240–250`; real memory dir | Extra files tolerated | `<memoryDir>/seen_skill_versions.json` | — |
| Code | `traversal-ignore-strategy/*` | Code-workspace ignore rules | Reuse for skill folders | — |
| Data | `skillScope` grep | 1 `ALL_INSTALLED` agent | Watch all installed skills only while such a run is active; measure | Watch count on Linux |

## Intended Change

Add a **skill update notice** capability in four parts:
1. A **run skill tracker** records, for every active or restored run, which skills it uses and the file versions it has seen (persisted next to the run's memory).
2. A **skill folder watcher** watches only the folders of skills used by active runs and reports settled changes.
3. A **skill update notice service** compares current skill files (by skill **name**, re-resolved) with what each affected run has seen. For a **busy** run, it posts one SYSTEM notice now through `AgentRun.postUserMessage`, which gives agent-message semantics: inside the current turn on Codex/Claude, and as the next turn on AutoByteus/Antigravity/ACP/Grok. For an **idle or restored** run, it keeps the notice pending, and `AgentRun` **combines it into the provider message of the run's next external input at dispatch** (one turn) through a new input-preface port.
4. Notices appear in the web through the existing system-notice event and in reopened history through the existing `system_task_notification` trace.

## Change Scope (Mandatory)

- **In scope:** UC-001…UC-005. The areas modified:
  - new `src/skill-update-notices/`;
  - `AgentRun` (preface port);
  - `AgentRunManager` (wiring);
  - the memory event accumulator (one sender added);
  - studio and standalone compositions;
  - web localization for the notice label.
- **Deliberately left alone** (SR-004 note: `autobyteus-ts` gains only a generic input-preface metadata convention; no skill knowledge enters the core):
  - skill resolution and exposure per runtime (bootstrappers, materializers);
  - the inter-agent message router (same `postUserMessage` semantics are used directly);
  - run metadata and execution-tree schemas;
  - the Skills page;
  - agent package definition refresh.
- **Follow-ups:**
  - FT-1…FT-3 (`follow-up-tasks.md`, user-requested 2026-10-13): mid-turn input for AutoByteus, Antigravity and Grok/ACP. No change is needed here when they land;
  - notices for agent/team/org definition changes (out of scope);
  - possibly a per-skill "read by this run" signal to narrow `ALL_INSTALLED` targeting.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Evidence | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001–003, REQ-008–010, REQ-012; AC-001, AC-004–006, AC-008 | Skill folder file change | Not observed | Watched (used skills only), settled, diffed per run | DS-001, DS-002 |
| BEH-002 | Contract | REQ-004, REQ-011, REQ-013; AC-001, AC-007, AC-009 | Busy run affected | Agent-message path: append on Codex/Claude, next turn elsewhere | Notice posted now via `postUserMessage` (SYSTEM), with the same per-runtime semantics, plus the system event | DS-002 |
| BEH-003 | Contract | REQ-005, REQ-006; AC-002, AC-003 | Idle or restored run receives its next input | Messages start turns; restore re-reads skills but the conversation keeps old text | Notice combined into the next external input's provider message at dispatch (one turn); no turn or restore caused by notices | DS-003 |
| BEH-004 | Contract | REQ-007; AC-001 | Any notice | System task notification pipeline | Same event and trace kind; sender `system.skill_update_notifier` | DS-004 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`.
- Current design issue found: `No` structural defect. The run boundary lacks one capability: a platform-owned input placed before the next input.
- Structural triggers considered:
  - **Repeated coordination:** prefacing in each input caller would duplicate logic across about 8 callers. Avoided: the preface is one port in `AgentRun`.
  - **Authoritative boundary:** the notice service uses `AgentRun` public methods only.
  - **Capability reuse:** the system-notice event, the trace kind, ignore rules and the watch pattern are all reused.
  - **Shared-structure looseness:** the notice metadata is a small dedicated marker, not a widening of the task-delegation marker.
- Root cause classification: `No Design Issue Found` (feature on healthy owners).
- Refactor needed now: `No`.
- Evidence: single activation point; two admission methods; existing presentation mapping.
- Design response: add one port to `AgentRun`, plus a new subsystem that uses public run APIs.
- Deferrals: None.

## Terminology

- **Used skill**: a skill in the run's configured skill set, resolved the same way activation resolves it (`SkillService.resolveConfiguredSkillsForAgent` on the run's agent definition), including `ALL_INSTALLED`.
- **Skill folder snapshot**: for one skill, `{ skillName, skillDir, skillMdPath, files: { relativePath → sha256 } }` over non-ignored files.
- **Seen skill versions**: per run, the last snapshot of each used skill the run was given (at a fresh start, or in its last notice).
- **Skill update notice**: a SYSTEM input to a run listing updated and removed skills.

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope: none. This is a pure addition.
- Compatibility wrappers or dual paths kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- **Stored subject:** a new file, `<run memoryDir>/seen_skill_versions.json`:
  ```json
  { "skills": { "<skillName>": { "skillDir": "...", "skillMdPath": "...", "files": { "SKILL.md": "<sha256>", "references/a.md": "<sha256>" } } } }
  ```
  About 1–5 KB per run.
- **Code-model/serialization change:** additive file. Existing run metadata, traces and execution trees are untouched.
- **Readers/writers:** only the new store. Root-package validators tolerate extra files (validated by checking required/retired names only).
- **Invariants:** a missing or unreadable file means "no seen versions". On the next activation or input it is re-recorded from current files, with no retroactive notice (approved acceptable loss).
- **Disposal:** deleted with the run's memory dir when the run is deleted. Helper runs with a null `memoryDir` keep the record in memory only.
- **Decision:** `Not Affected` for existing data. The new file is additive and disposable; no migration.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | Run activation (new / restore) or run end | Run's used skills and seen versions known; watch set updated | `RunSkillTracker` | Knowing who uses what |
| DS-002 | Primary | BEH-001, BEH-002 | OS file event in a used skill folder | Busy runs got one notice via the agent-message path; idle runs marked for preface | `SkillUpdateNoticeService` | Prompt notice for working agents |
| DS-003 | Primary | BEH-003 | The next external input of an idle or restored run is dispatched to the provider | One provider input = delimited notice + the input (one turn) | `AgentRun` dispatch (via the preface port) → `SkillUpdateNoticeService` | Next-work notice without extra turns |
| DS-004 | Return-Event | BEH-004 | Notice forwarded (busy post or combined dispatch) | Web system notice; history trace with the dispatch turn ID | `AgentRun.publishEvent` → presentation adapters; memory accumulator | Visible and durable |

## Primary Execution Spine(s)

- **DS-001:** `AgentRunManager.beginActivation(kind) → published AgentRun → RunSkillTracker.trackRun(run, kind) → resolve used skill **names** → (new: snapshot current → store) | (restore / platform_restore: load store; missing → snapshot current) → SkillFolderWatcher.syncWatchedFolders(current resolved dirs of all tracked names)`. Run end → `RunSkillTracker.untrackRun(runId)` → watch set re-synced.
- **DS-002:** `chokidar event → SkillFolderWatcher (skill-folder ignore list + .gitignore; map path → watched dir) → settle 1000/3000 ms → SkillUpdateNoticeService.onSkillFoldersChanged(dirs) → names watched at those dirs → re-resolve each name via SkillService → (resolves: snapshot current folder | not found: removed) → per run using the name: diff against seen (relative-path digests) → busy (lifecycle shows an active turn): AgentRun.postUserMessage(notice) and, once forwarded, publishEvent(SYSTEM_TASK_NOTIFICATION, turn_id) and record seen; idle: mark the run → re-sync the watch set (a new generation dir is watched, the deleted one dropped)`. `postUserMessage` gives agent-message semantics: appended into the current turn on Codex/Claude (`activeTurnAppend: supported`), and queued as the next turn on AutoByteus/Antigravity/ACP/Grok.
- **DS-003:** `external input admitted unchanged (postUserMessage | reserveUserMessage; FIFO order, sender and memory untouched) → … → claimNext → AgentRun.executeInputDispatch: normalized = normalizeForProvider(dispatch); if the claimed message is an external input and preface = await port.takePreface(run): dispatch message content = noticeBlock + "\n\n" + original content (metadata += skill_update_notice_preface marker) → backend.dispatchUserInput → forwarded: port.prefaceDelivered(run, preface, turnId) → publishEvent(SYSTEM_TASK_NOTIFICATION, turn_id) + record seen | not forwarded / undeliveredRetryAsStart / failure / uncertain delivery: port.prefaceReturned(run, preface) (stays pending; the next dispatch re-takes it)`.
- **DS-004:** `AgentRun.publishEvent(SYSTEM_TASK_NOTIFICATION, {sender_id: "system.skill_update_notifier", content: notice text, turn_id}) → root presentation adapter → web SystemTaskNotificationSegment` (all runtimes). History differs by runtime family:
  - **External runtimes (Codex, Claude, AGY, ACP, Grok):** the server recorder already captures the admitted original as the user trace (`onUserMessageForwarded`), and records the notice as a `system_task_notification` raw trace (sender allow-listed, explicit `turn_id`).
  - **Native AutoByteus (SR-004):** the server recorder does not record native runs; the core memory does. The combined dispatch message carries a generic tag, metadata `platform_input_preface: { content, sender_id, original_content }`, set by `AgentRun` whenever it combines and containing no skill knowledge. `MemoryIngestInputProcessor` (autobyteus-ts) sees the tag and calls a new `MemoryManager.ingestSystemTaskNotification(content, turnId, senderId)`, which writes a `system_task_notification` raw trace; raw trace types are plain strings, and the server replay already maps this type. It then ingests the **user trace with `original_content`** (attachments unchanged). The model's working context keeps the **combined** content (what the model saw). `LlmRequestAssembler` passes explicit `rawTraceIds` (the notice trace plus the user trace) instead of matching by content, because the content-based lookup (`findRecentRawTraceIds`) would no longer match. A message without the tag is handled exactly as today.

## Spine Narratives (Mandatory)

| Spine | Narrative | Governing Owner | Off-Spine Concerns |
| --- | --- | --- | --- |
| DS-001 | When a run is published, the tracker resolves its used skill **names** (and their current folders) from its current agent definition. A **new** run has just been given current skills, so its snapshots are recorded as seen. A **restored** run keeps the record from its memory folder, because its conversation still holds what it saw then; a missing record is re-created from current files. The tracker keeps an in-memory `run → used skill names` index. The watcher watches the folders those names resolve to now. | Tracker | Seen-versions store; snapshotter |
| DS-002 | The watcher reports settled changes of watched folders. The service maps each folder back to skill names and **re-resolves each name**. A name that still resolves is snapshotted where it lives now, so a GitHub generation swap is just "updated" with a new path. A name that no longer resolves is "no longer available". For each run using the name, the service diffs relative-path digests against seen; identical digests produce no notice. A **busy** run gets one notice now through `postUserMessage`, the call agent messages use, so delivery follows that runtime's agent-message semantics. An **idle** run is only marked. The watch set is then re-synced. | Notice service | Notice builder |
| DS-003 | Inputs are admitted exactly as today. When `AgentRun` dispatches an **external** input to the provider (start or append), it asks the port for a pending preface. If one exists, the provider message is the delimited notice block followed by the input's content, with the input's own sender, context files and metadata plus a preface marker. This is one dispatch, so one turn on every runtime. Only after the backend reports `forwarded` does the notice count as delivered (event, trace, seen). Any non-forwarded outcome hands it back as pending. Skill notices, compaction-recovery inputs and tool continuations never take a preface. | AgentRun (dispatch) / notice service (content, pending state) | — |
| DS-004 | Presentation and history reuse the system task notification path. The input carries the suppression flag, so native runs don't emit a second notice. | AgentRun / adapters | Memory accumulator sender allow-list |

## Spine Actors / Main-Line Nodes

`AgentRunManager`, `AgentRun`, `RunSkillTracker`, `SkillFolderWatcher`, `SkillUpdateNoticeService`, presentation adapters, web segment.

## Ownership Map

| Node | Owns |
| --- | --- |
| `RunSkillTracker` | The active-run → used-skills index; recording seen versions at activation; untracking at run end; the watched skill dir set |
| `SeenSkillVersionsStore` | Read/write of `seen_skill_versions.json` (atomic write; tolerant read: missing or invalid means empty) and the in-memory fallback |
| `SkillFolderSnapshotter` | Listing a skill folder's files minus the **skill-folder ignore list** (REQ-010) and the folder's `.gitignore` (reusing `GitIgnoreStrategy` only), with SHA-256 digests by relative path (re-hashing only files whose size or mtime changed) |
| `SkillFolderWatcher` | chokidar watches per used skill dir with ignore rules; settle window; emits changed dirs; releases handles when a dir is no longer used |
| `SkillUpdateNoticeService` | Diffing, the busy-vs-idle decision, immediate delivery, preface supply, recording delivered versions, failure retry (REQ-013) |
| `SkillUpdateNoticeBuilder` | Notice text (REQ-008; max 10 files per skill then "and N more"), the SYSTEM `AgentInputUserMessage` with metadata `{ skill_update_notice: true, sender_id: "system.skill_update_notifier", suppress_system_task_notification: true }`, and the presentation event payload |
| `AgentRun` | The input-preface port: at dispatch of an external input, take a pending preface, combine it into the provider message, and report delivered (with the turn ID) or returned. Publishing the notice's system event on delivery. |

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| None | Pure addition | — | — | — |

## Return Or Event Spine(s) (If Applicable)

DS-004. Notice text shape (the content the agent and the web see):

```
[Platform notice — skill updated]
The following skills you use changed on disk since you last read them:
- code-review (/…/skills/code-review/SKILL.md): SKILL.md, references/checklist.md
- deep-research: no longer available
Re-read the updated SKILL.md (and any files it points to) before continuing work that relies on these skills.
```

## Bounded Local / Internal Spines (If Applicable)

- **`SkillFolderWatcher`:** `syncWatchedFolders(dirs) → add or remove chokidar paths → events (ignored paths dropped) → map to owning skill dir → pending set → settle timer (1000 ms quiet, 3000 ms cap) → emit dirs`. A whole-folder deletion is reported as its dir.
- **`AgentRun` dispatch with preface:** `executeInputDispatch(claim) → normalized dispatch → isExternal(claim message)? → preface = await port.takePreface(run) → combined message → backend.dispatchUserInput → (forwarded → prefaceDelivered(turnId) → publishEvent) | (else → prefaceReturned)`. `takePreface` atomically moves the run's pending notice to "in flight", so a concurrent busy post cannot duplicate it. The busy-post path skips runs with a preface in flight. A preface failure never fails the input (REQ-013).

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility | Risk If On The Main Line |
| --- | --- | --- | --- |
| Skill-folder ignore list (`skill-folder-ignore.ts`: `.git`, `node_modules`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `dist`, `build`, `.DS_Store`, `*.swp`, `*~`, `.#*`) plus the folder's `.gitignore` via the existing `GitIgnoreStrategy` | Watcher, snapshotter | Exclude noise per REQ-010 without dropping legitimate folders like `lib/` or `env/` (ARCH-REV-001 R-3) | Noise notices; heavy watches |
| Digest cache (size+mtime → digest per file) | Snapshotter | Avoid re-hashing unchanged files | CPU on every input |
| Path → skill-dir index | Watcher | Map an event path to its skill | — |

## Ownership Boundaries

- `AgentRun` owns admission order and dispatch. It knows nothing about skills, only a generic preface port: `AgentRunInputPreface { takePreface(run): Promise<AgentRunPreface | null>; prefaceDelivered(run, preface, turnId): void; prefaceReturned(run, preface): void }`, where `AgentRunPreface = { id, text, presentation: { senderId, content } }`. The admission state (`agent-run-input-admission-state.ts`) and the backend dispatch contract are **unchanged**: combining happens on the already-claimed dispatch message.
- The skill subsystem uses only `AgentRun` public methods (`postUserMessage`, `publishEvent`, `getStatusSnapshot`, `config`) and `AgentRunManager` lookups.
- The tracker is the only writer of seen versions; the service updates them through the tracker.

## Boundary Encapsulation Map

| Boundary | Internal Mechanisms | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `AgentRun` input admission | Dispatch queue, admission state | All input producers; the notice service | Producers adding skill notices themselves | Extend the port |
| `SkillUpdateNoticeService` | Tracker, watcher, snapshotter, builder | `AgentRun` (via port), composition | Others reading or writing seen versions | Add a service method |

## Dependency Rules

- **Allowed:**
  - `AgentRunManager → AgentRunInputPreface` (an interface in `agent-execution`);
  - `skill-update-notices → agent-execution` public types, `skills` (SkillService), the agent-definition service (to read the run's definition), and `file-explorer/traversal-ignore-strategy`;
  - composition wires the service as the port.
- **Forbidden:** `agent-execution` importing `skill-update-notices`; the notice subsystem calling backends or runtimes directly; changing the inter-agent router.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| `AgentRunInputPreface.takePreface(run)` → `{ id, text, payload } \| null`; `prefaceDelivered(run, preface, turnId)`; `prefaceReturned(run, preface)` | Run dispatch | A pending platform notice combined into the next external dispatch | `AgentRun` |
| `RunSkillTracker.trackRun(run, activationKind)` / `untrackRun(runId)` | Run skills | Index and seen versions | runId |
| `SkillFolderWatcher.syncWatchedFolders(dirs)` / `onSettledChange(cb)` / `close()` | Watch set | — | absolute skill dirs |
| `SkillUpdateNoticeService.onSkillFoldersChanged(dirs)` | Notices | Busy delivery or marking | skill dirs |
| `SeenSkillVersionsStore.read(run) / write(run, versions)` | Persistence | — | run (memoryDir or runId) |

## Interface Boundary Check

All interfaces are singular, with explicit identity and low ambiguity.

## Main Domain Subject Naming Check

| Name | Says What It Is? |
| --- | --- |
| `SkillUpdateNoticeService`, `SkillUpdateNoticeBuilder` | Yes |
| `RunSkillTracker` | Yes: tracks which skills each run uses and has seen |
| `SeenSkillVersionsStore`, `seen_skill_versions.json` | Yes |
| `SkillFolderWatcher`, `SkillFolderSnapshotter` | Yes |
| `AgentRunInputPreface` | Yes: an input placed before the run's next input |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Delivery to a busy run | `AgentRun.postUserMessage` (the same call the agent-message router uses) | Reuse | User direction |
| Presentation | `SYSTEM_TASK_NOTIFICATION` run event and web segment | Reuse | One system-notice family |
| History | `system_task_notification` trace | Extend the sender allow-list | — |
| Watching | chokidar plus the settle pattern from `agent-package-definitions` | Reuse the pattern (separate watcher: different folders and ignore policy) | — |
| Ignore rules | `traversal-ignore-strategy` | Reuse `GitIgnoreStrategy` only; a dedicated skill-folder list replaces `DefaultIgnoreStrategy` | The default list drops `lib/`, `env/`, `var/`, `target/`, which skills may legitimately contain |
| Skill resolution | `SkillService.resolveConfiguredSkillsForAgent` | Reuse | Same resolution as activation |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Decision |
| --- | --- | --- |
| `src/skill-update-notices/` | Tracker, store, snapshotter, watcher, service, builder | Create New |
| `agent-execution` | `AgentRunInputPreface` port; `AgentRun` preface handling; manager wiring and tracker hooks | Extend |
| `agent-memory` | Accumulator sender allow-list | Extend |
| `compositions` | Create, start and close the subsystem (studio and standalone hosts) | Extend |
| Web | Notice label/localization in the system notice segment (content is already rendered) | Extend (minimal) |

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `src/skill-update-notices/domain/skill-update-notice-types.ts` | `SkillFolderSnapshot`, `SeenSkillVersions`, `SkillChange` (updated files / removed) types |
| `src/skill-update-notices/services/run-skill-tracker.ts` | Index (run → used skill names), track/untrack, seen versions, the name → current dir map for the watch set |
| `src/skill-update-notices/services/skill-update-notice-service.ts` | Governing owner (DS-002/003), implements `AgentRunInputPreface` |
| `src/skill-update-notices/services/skill-update-notice-builder.ts` | Text, message and event payload |
| `src/skill-update-notices/providers/seen-skill-versions-store.ts` | File persistence plus the in-memory fallback |
| `src/skill-update-notices/providers/skill-folder-snapshotter.ts` | File listing (ignore rules) plus digests and cache |
| `src/skill-update-notices/monitor/skill-folder-watcher.ts` | Watches plus settle |
| `src/agent-execution/domain/agent-run-input-preface.ts` | Port interface |
| `src/agent-execution/domain/agent-run.ts` | In `executeInputDispatch`: take the preface for external inputs, combine it into the normalized dispatch message, report delivered or returned, publish the event on delivery. `postUserMessage` / `reserveUserMessage` are unchanged. |
| `src/agent-execution/input/agent-run-input-admission-state.ts`, backend dispatch contract (`agent-run-input-contract.ts`) | **Unchanged** (named because the combination deliberately avoids touching them) |
| `src/skill-update-notices/providers/skill-folder-ignore.ts` | The REQ-010 ignore list plus `.gitignore` composition |
| `src/agent-execution/services/agent-run-manager.ts` | Inject the port in `constructRun`; call `tracker.trackRun` on publish (with the activation kind) and `untrackRun` on removal |
| `src/agent-memory/services/runtime-memory-event-accumulator.ts` | Record `system_task_notification` for sender `system.skill_update_notifier` |
| `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` | (SR-004) On `platform_input_preface`: a separate system notice trace plus the user trace with the original content |
| `autobyteus-ts/src/memory/memory-manager.ts` | (SR-004) `ingestSystemTaskNotification(content, turnId, senderId)`; ingest methods return the trace ID for explicit linkage |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | (SR-004) Explicit `rawTraceIds` for a tagged (combined) input |
| `autobyteus-ts/src/agent/message/platform-input-preface-metadata.ts` (new) | (SR-004) Tag key and reader (generic: content, sender_id, original_content) |
| `src/compositions/build-studio-server.ts`, `src/standalone-application-host/start-standalone-application-host.ts` | Create, start and close |
| Web `components/conversation/segments/SystemTaskNotificationSegment.vue` + localization | Show "Skill updated" when the content starts with the notice header (or a metadata kind, if the presentation payload carries one) |

## Applied Patterns (If Any)

- **Port/adapter:** `AgentRunInputPreface`.
- **Debounced worker:** the watcher's settle window.
- **Store:** the seen-versions store.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Responsibility | Must Not Contain |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/skill-update-notices/domain/` | Folder | Types | I/O |
| `autobyteus-server-ts/src/skill-update-notices/services/` | Folder | Tracker, service, builder | chokidar |
| `autobyteus-server-ts/src/skill-update-notices/providers/` | Folder | Store, snapshotter | Notice policy |
| `autobyteus-server-ts/src/skill-update-notices/monitor/` | Folder | Watcher | Run logic |

## Folder Boundary Check

The layout mirrors `agent-package-definitions` (domain / services / providers / monitor). Low risk.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Busy run, Codex/Claude | PTM (Codex) mid-turn; `code-review/SKILL.md` saved twice and `references/x.md` added within 2 s → one notice listing both files, appended into the current turn | One notice per file |
| Busy run, AutoByteus/AGY/ACP/Grok | A team member on AutoByteus is mid-turn → the notice is queued by `postUserMessage` and becomes its next turn right after the current one, exactly like an agent message would | Claiming mid-turn delivery the runtime does not support |
| Idle run | Delegated copy idle → change → nothing happens → PTM sends a task → the task is admitted as usual; at dispatch the provider receives `[Platform notice — skill updated] … ` + `\n\n` + task text in **one** turn; the web shows the system notice and then the task as usual | Admitting the notice as its own queued entry, which starts a turn of its own |
| GitHub skill-source update | Update publishes `…/generations/g2/code-review/` and deletes `g1` → the watcher sees `g1` removed → re-resolve `code-review` → resolves to `g2` → diff by relative paths → "updated: SKILL.md, references/a.md (path …/g2/code-review/SKILL.md)" → watch set now `g2` | "code-review is no longer available" |
| Restored after app restart | Run stopped; the app closes; the skill changes; the app reopens; the user continues the run → first input of the restored run is preceded by the notice (diff from `seen_skill_versions.json`) | Resetting seen versions at restore, which loses the change |
| Content-identical save | Editor re-saves the same bytes → digests unchanged → no notice | mtime-based detection |
| Preface placement | The port is invoked inside `AgentRun` admission | Each producer (router, coordinator, team handle…) adding the notice itself |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Widen the task-delegation system-notice metadata for skill notices | Reuse | Rejected | A dedicated `skill_update_notice` marker on the same presentation event |
| Store seen versions in run metadata or execution trees | Central | Rejected | A separate file in the run's memory dir (no schema change) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Domain types, snapshotter (with ignore rules), store, builder.** Unit tests: digests, ignore, diff (changed/added/removed/skill removed), text cap.
2. **Tracker plus the `AgentRunInputPreface` port in `AgentRun` dispatch, and manager wiring.** Unit tests for both capability classes:
   - an idle external input yields **one** `start_turn` dispatch carrying the combined message;
   - a reserved input carries it too;
   - no preface for notices, compaction recovery or continuations;
   - not forwarded / requeue / uncertain → returned and pending;
   - forwarded → delivered with the turn ID;
   - the admission state and backend contract are untouched.
   - **(SR-004)** Native: a combined dispatch on AutoByteus gives a reopened history with the input unchanged plus **one** system notice in the same turn; the working context holds the combined content linked to both traces; an untagged message is unchanged (`autobyteus-ts` unit tests plus a server native history-replay integration test).
3. **Watcher plus the service** (busy delivery, idle marking, restore check). Integration tests with real temp skill folders and fake runtimes.
4. **Memory accumulator sender; presentation check; web label and localization.**
5. **E2E:**
   - gated real runs on AutoByteus, Codex and Claude: a busy notice mid-turn and the re-read observed;
   - a scripted AGY run for delivery;
   - AC-002/003 with restore and an app restart.
6. **Desktop verification journey (AC-010):** PR merge → PTM notice.

## Key Tradeoffs

- **"Uses" means configured skills, not observed reads.** It is simple and runtime-agnostic, at the cost of occasional notices about a configured skill the agent never read (worded "if you rely on it").
- **Idle runs are prefaced, not woken.** No extra turns; the agent learns exactly when it next works.
- **Source `SKILL.md` path in the notice, uniformly.** Codex/Claude links point to the same folder (or an older generation for managed GitHub sources, where the source path is the new content). All runtimes can read absolute paths. To be verified per runtime in E2E.
- **A separate watcher from the definitions watcher.** Different folders, ignore policy and consumers. They share only the pattern.

## Risks

- **Runtime append differences (U-001), resolved statically:** Codex/Claude append; the other four receive the notice as their next turn (REQ-004). E2E covers one runtime of each class.
- **Re-read path (R-1):** the notice gives the current source `SKILL.md`. Codex/Claude read absolute paths outside the workspace in their default sandboxes; verify in E2E. A managed-source link in a running Codex/Claude workspace can point at a deleted generation; the notice's path is the readable one.
- **Compaction-recovery identification:** if no reliable marker distinguishes recovery inputs from external inputs at dispatch, return a Design Impact.
- **`ALL_INSTALLED` runs watch every installed skill:** rare (1 agent). Measure the watch count. Ignore rules keep venvs out.
- **Uncertain dispatch later reconciled as forwarded (ARCH-REV-002 residual):** `AgentRun` reconciliation of an uncertain dispatch that proves forwarded also calls `prefaceDelivered`, so the notice is not repeated.
- **Race (R-4):** a run turns idle between the busy check and the post, so the notice starts a turn. Acceptable and bounded (at most one turn).
- **Agent compliance with the re-read instruction:** observed in E2E, not guaranteed (non-goal).

## Guidance For Implementation

- The preface must never apply to the notice itself, tool continuations or internal compaction inputs. Apply it only to external inputs: user, agent, system task and application.
- Make the settle constants injectable for tests.
- Write `seen_skill_versions.json` atomically. Treat a read error as empty and log it.
- Close order: watcher → service → run manager shutdown is unaffected.
- Follow `TESTING.md`: server unit, integration and typecheck; gated runtime suites for real runs (never the user's CLI configs; use a throwaway `CODEX_HOME`); an isolated desktop instance for AC-010.
