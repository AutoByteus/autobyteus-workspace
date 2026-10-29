# Skill Update Notices

## Scope

Tells a running or resumable agent run when a skill it uses changes on disk.

Every runtime already reads skill files from disk:
- Native AutoByteus advertises absolute `SKILL.md` paths.
- Codex, Claude and Grok symlink the skill folders into the run workspace.

What goes stale is only the skill text an agent already read into its conversation. This subsystem sends each affected run **one platform notice** naming each changed skill package with its current folder and listing exactly the files that changed, and asks the agent to re-read them.

Out of scope:
- Skill catalog management (see [Skills](./skills.md)).
- Agent, team and org definition refresh (see [Agent Package Definitions](./agent_package_definitions.md)). That feed announces definition changes to web clients, not skill changes to runs.

## TS Source

- `src/skill-update-notices/skill-update-notices.ts` — `createSkillUpdateNotices(...)` → `{ service, watcher, tracker, close }`.
- `src/skill-update-notices/services/run-skill-tracker.ts` — `RunSkillTracker`. It owns:
  - the active run → used skills index;
  - the seen versions;
  - the watched folder set.
- `src/skill-update-notices/services/skill-update-notice-service.ts` — `SkillUpdateNoticeService`:
  - diffing and the busy/idle decision;
  - immediate delivery and the pending notice;
  - it implements both execution ports.
- `src/skill-update-notices/services/skill-version-diff.ts` — changed, added and removed files per skill.
- `src/skill-update-notices/services/skill-update-notice-builder.ts` — the notice text, the SYSTEM input and the presentation event.
- `src/skill-update-notices/monitor/skill-folder-watcher.ts` — `SkillFolderWatcher`.
- `src/skill-update-notices/providers/skill-folder-snapshotter.ts` — relative path → SHA-256 per skill folder, with a size+mtime cache.
- `src/skill-update-notices/providers/skill-folder-ignore.ts` — the ignore list.
- `src/skill-update-notices/providers/seen-skill-versions-store.ts` — `<memoryDir>/seen_skill_versions.json`.
- Generic execution ports, which have no skill knowledge (see [Agent Execution](./agent_execution.md#platform-input-preface-and-run-lifecycle-observer)):
  - `src/agent-execution/domain/agent-run-input-preface.ts`;
  - `agent-run-input-preface-dispatch.ts`;
  - `agent-run-lifecycle-observer.ts`.

## Which Runs And Skills Are Tracked

- **Tracking start.** `AgentRunManager` reports every published run (`runPublished(run, kind)`) from its single activation point: kinds `new`, `restore` and `platform_restore`. This covers:
  - standalone runs;
  - team and org members;
  - delegated copies.
- **Tracking end.** `AgentRunResourceManager` reports `runReleased(run)` when the run's resources are released.
- **Used skills.** A run's used skills are resolved exactly as activation resolves them: the run's agent definition → `SkillService.resolveConfiguredSkillsForAgent`, with `ALL_INSTALLED` and application bundles included.
  - Each run is bound to the definition read when it was tracked, resolved through the current skill catalog. Editing or deleting the definition later does not change what an active run uses.
- **Seen versions:**
  - A **new** run records its skills' current files as seen. Tracking runs in the background, so a new run's first input never waits for it.
  - A **restored** run (including after an app restart) keeps the record from its memory folder, because its conversation still holds what it read then. Its first input waits for that check, so it carries any change made while the run was stopped.
  - A missing or unreadable record is re-created from current files, with no retroactive notice.
- **Not tracked:** runs inside application execution scopes, which use a separate `AgentRunManager`. This is follow-up C-06.

## Change Detection

- **Watched folders.** `SkillFolderWatcher` runs **one chokidar instance per used skill folder**. A folder is watched only while at least one tracked run uses it. When the last such run ends, that folder's instance is closed, which releases exactly its OS handles and drops any pending change for it. Folders still in use keep their instance, so there is no watch gap.
- **Settle window.** Changes are reported after **1000 ms of quiet, capped at 3000 ms** from the first pending change. Both are injectable for tests. A deleted skill folder is reported as that folder.
- **Ignored noise:** `.git`, `node_modules`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `dist`, `build`, `.DS_Store`, `*.swp`, `*~`, `.#*`, and whatever the skill folder's own `.gitignore` excludes (through the existing `GitIgnoreStrategy`). Legitimate folders such as `lib/` or `env/` are not ignored.
- **No-op saves.** Files are compared by SHA-256, so a save with identical content produces no notice.
- **Re-resolution by name.** On a settled change, the service re-resolves each affected skill **by name**:
  - A name that still resolves is snapshotted where it lives now. A new GitHub source generation (moved folder) is therefore reported as "updated", and the watch set moves to the new folder.
  - A name that no longer resolves to an installed skill is reported as **no longer available**. This is the only removal case.

## Delivery

Each affected run gets one notice per settled burst. The text has this shape:

```
[Platform notice — skill updated]

Your skill package `code-review` has been updated (`/…/skills/code-review`).

Changed files:
- `SKILL.md` (changed)
- `references/new-checklist.md` (added)
- `scripts/old.sh` (removed)

Your skill package `deep-research` is no longer available.

Re-read the updated files before continuing work that relies on this skill.
Removed files are no longer available.
Do not rely on a skill that is no longer available.
```

- One block per skill, in skill-name order. An updated skill names its current folder once; its files are listed relative to that folder, one per line, each marked `(changed)`, `(added)` or `(removed)`.
- The folder and every file path are Markdown inline code (`inlineCode` in `skill-update-notice-builder.ts`), so the card shows them literally: `references/__init__.py` is not bold and `notes/*draft*.md` is not emphasis. The fence is one backtick longer than the longest backtick run in the path, so a path with a backtick also shows literally.
- `SKILL.md` appears only when it changed, and then first; the other files follow by path. At most 10 files are listed per skill, followed by "- …and N more files".
- The re-read line appears only when a skill was updated ("this skill", or "these skills" when several were).
- "Removed files are no longer available." appears only when a listed file was removed; the last line only when a skill was removed.
- The header line is fixed: the web labels the card "Skill updated" by it (or by the sender).

**Busy run** (status `running`):
- The notice is posted now through `AgentRun.postUserMessage` as a SYSTEM input (`sender_id: "system.skill_update_notifier"`, `suppress_system_task_notification: true`). It is the same `AgentRun` input admission agent-to-agent messages reach (teammate delivery holds the slot with `reserveUserMessage` and commits it once the message is saved), so delivery follows each runtime's agent-message semantics:
  - **inside the current turn** on Codex and Claude (`activeTurnAppend: supported`);
  - **as the next turn** on native AutoByteus, Antigravity, ACP and Grok. Follow-ups FT-1…FT-3 add mid-turn input there; no change here is needed when they land.
- Once forwarded, the notice is published as a `SYSTEM_TASK_NOTIFICATION` event and its versions are recorded as seen.
- A failed, cancelled or unaccepted post leaves the notice pending.

**Idle, stopped or restored run:**
- The run is never woken and no turn is started.
- The notice stays pending and is **combined with the run's next external input in one turn**: `AgentRun` asks the input-preface port at dispatch, and the provider message becomes the notice block, a blank line, then the input unchanged.
- The notice counts as delivered only when the dispatch is forwarded; any other outcome returns it to pending.
- Compaction-recovery dispatches, tool continuations and notices themselves never carry a notice.

**Delivery guarantee:** at least once. An uncertain dispatch can re-deliver a notice. A run that becomes busy just as a change settles may take the idle path instead (accepted race R-4).

## Web And History

- **Web.** The notice reaches the web as a system notice (`SYSTEM_TASK_NOTIFICATION` → `SystemTaskNotificationSegment`), labelled **Skill updated** (zh-CN 技能已更新). The user's own message is shown unchanged.
- **External runtimes** (Codex, Claude, Antigravity, ACP, Grok): the server memory recorder writes the notice as a `system_task_notification` raw trace (the skill sender is allow-listed, with an explicit `turn_id`), and the user's original message as the user trace.
- **Native AutoByteus:** the combined dispatch carries a generic `platform_input_preface { content, sender_id, original_content }` tag. Core memory writes a `system_task_notification` trace plus the user trace with the original content. The model's working context keeps the combined text it actually saw. See the core [agent memory design](../../../autobyteus-ts/docs/agent_memory_design.md).
- **Replay.** Reopened history shows one system notice plus the user's message as typed, on every runtime.

## Persisted State

- `<run memoryDir>/seen_skill_versions.json`: `{ "skills": { "<skillName>": { "skillDir", "skillMdPath", "files": { "<relativePath>": "<sha256>" } } } }`. About 1–5 KB per run.
- It is written atomically. A missing or invalid file reads as "nothing seen".
- It is written only into the run's existing memory folder, never creating it. If the runtime has not created the folder yet, the write is retried (1 s, 5 s, 15 s, then every 60 s) while the run is tracked.
- Once a run is released, nothing more is written for it: a write in progress stops before its next step, and a waiting retry is cancelled. A deleted run's memory folder is therefore never re-created.
- It is deleted with the run's memory folder. Runs with no memory folder keep the record in memory only.
- Accepted limitation: a run whose memory folder never appears while it is tracked has no stored record. If such a run is later restored, its record is re-created from the then-current files, with no retroactive notice.
- The file is additive; no migration. Run metadata and execution-tree schemas are unchanged.

## Lifecycle And Composition

- `build-studio-server.ts` and `start-standalone-application-host.ts` create the subsystem and pass it to `GeneralProcessRunSupervisor` as `platformInputNotices`. The supervisor wires it into `AgentRunManager` as `inputPreface` and `lifecycleObserver`.
- Shutdown closes the notices (watcher, then service, then the tracker, which waits for tracking and record writes in progress) before the run supervisor.

## Ownership Rules

- `agent-execution` never imports `skill-update-notices`. It knows only the generic preface port and the lifecycle observer.
- The notice subsystem uses only `AgentRun` public methods (`postUserMessage`, `publishEvent`, `getStatusSnapshot`, `config`) and `AgentRunManager` lookups. It never calls runtimes or backends directly and does not change the inter-agent router.
- `RunSkillTracker` is the only writer of seen versions.

## Operational Notes

- The watch cost is proportional to the skills used by active runs, not to the whole catalog. An `ALL_INSTALLED` run watches every installed skill folder while it is active.
- Linux behavior has been measured by container probe only (inotify watches fall back to 0 after the runs end).
