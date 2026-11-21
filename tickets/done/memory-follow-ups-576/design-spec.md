# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (FU-008 decision revised after CRR-001 CR-001)
- Approved requirements: `requirements-doc.md` SR-001. The Solution Designer approved within the direction and informed the user. FU-004 waits for DEC-004.
- User approval of the design: `Not required`
- Design status: `Ready` (FU-004 per DEC-004 when answered)
- Investigation: `investigation-notes.md` (I-1…I-8)
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`

## Current-State Read

See I-1…I-8. Every item has one existing owner; none needs a new one.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`. There are six small changes in existing owners:
  - one server rule constant;
  - two server probes;
  - one web renderer and previewer path;
  - two web menus and one loader;
  - three E2E test files;
  - docs and the 554 release note.
- Architectural risk: `Low`:
  - no contract, persistence or ownership change;
  - FU-009 changes a naming threshold before any release, so no stored shortened name exists in the wild (DEC-001);
  - FU-002 opens files through the existing store action, confined to the workspace.
- Escalation trigger: FU-007 turns out to be a product defect in package watching or listing; or FU-004 is decided as (b). Either returns to the Solution Designer.

## Intended Change And Per-Item Design

1. **FU-009 (REQ-001)**
   - `agent-memory-layout.ts`: `MAX_FULL_DEFINITION_FOLDER_NAME_BYTES = 255`. The prefix (120 bytes) and the hash (16 hex characters) stay. The doc comment (`:57`) says 255.
   - Tests in `definition-folder-names.test.ts`:
     - 255 bytes: full name;
     - 256 bytes: shortened;
     - the existing `%XX` cut cases stay.
   - Docs: `agent_memory.md:151`, `agent_episodic_catalog.md:29`.
   - In the archived 554 release note (`tickets/done/semantic-memory-for-every-agent/release-notes.md:13`), the rare-id paragraph is replaced by "only an id over 255 encoded bytes, which could never have had a folder, gets a shortened name". The release has not happened, so this is a correction of the notes for the coming release.
   - The 554 DEC-016 text is corrected by a note in this ticket. The archived 554 documents stay as they are.
2. **FU-002 (REQ-002)**
   - `MarkdownRenderer.vue`: for a scheme-less, non-`#` link it emits `relative-link` (the raw href) as well as `preventDefault`. Without a listener nothing happens, as today.
   - `MarkdownPreviewer.vue` listens only when `relativeResourceContext?.kind === 'workspace'` and `path` is set. It then:
     - drops the `#fragment` and URL-decodes;
     - resolves the result against `dirname(path)` with POSIX rules (workspace paths are relative and POSIX);
     - refuses a result that leaves the root (starts with `..`) or is empty;
     - calls `fileExplorerStore.openFilePreview(resolved, workspaceId)`.
   - A missing file gives the store's existing error in the tab.
   - Read-only workspaces stay read-only: preview mode only.
   - Chat messages and node files get no listener (unchanged).
3. **FU-003 (REQ-003)**
   - `ChatWorkspaceMenu.vue` (`userWorkspaces`) and `useMobileLaunchWorkspaces.ts` (`workspaceItems`) filter on `kind === 'filesystem' || kind === 'temp'`, with the same predicate as the run-history sidebar (`runHistoryReadModel`). One shared helper, `isRunnableWorkspaceKind` in `utils/workspace`, is used by all three.
   - `SkillWorkspaceLoader.vue` keeps a `disposed` flag. When registration resolves after unmount, it unregisters the returned id at once.
4. **FU-004 (REQ-004)**
   - (a): no code. The Solution Designer records the decision. Optionally the founder updates the Docker node and lets it sync. Nothing is done to his data.
   - (b): it comes back as its own design.
5. **FU-005 (REQ-005)**: `afterAll` calls `vi.useRealTimers()` before `await app.close()`.
6. **FU-006 (REQ-006)**: SM-12 writes a regular file at `folderOf(id)` (where the folder would go) instead of `chmod` on `semantic/`. It asserts that the warning's reason names the failure (`EEXIST` or `ENOTDIR`, as Node reports it) and removes the file in `finally`. The `chmod` is gone.
7. **FU-007 (REQ-007)**: implementation first reproduces it alone on this host (`env -i … vitest run` of the file) and records the timings.
   - If the write's detection by the watcher comes after the 300 ms: the test waits for the monitor to see the write, through the TESTING.md helper, before asserting the lookup. That is REQ-018's real contract: "changes already detected". The settle-window assertion stays.
   - If detection is on time but the lookup misses it: it is a product defect. Stop and return it as a Design Impact (escalation trigger).
8. **FU-008 (REQ-008), revised in SR-002 after CRR-001 CR-001.** There is one owner, `runtime-management/probe-time-bound.ts` (`armProbeTimeBound`), used by both `antigravity-cli-capability.ts` and `grok/grok-build-capability.ts`.
   - **Why SR-001 was wrong.** It read `child.exitCode` / `child.signalCode` when the timer ran. Node sets those only when it processes the exit. After a main-thread block longer than the bound, the expired timer runs before the poll phase that delivers the exit: API-05b had the 3,000 ms timer at 7,720 ms with `exitCode` null, and the exit (code 0) at 7,730 ms. So an exited child was killed and reported as timed out. SR-001 called this "an explicit check of the child's state", but the fields are not the state until the exit is delivered.
   - **Target, combining options (c) and (a):**
     - The bound learns the exit from the child's `exit` event, a flag set by a listener, not from its fields. Its input type becomes `Pick<ChildProcess, "once">` plus the existing fields.
     - When the timer fires, it does not decide in that callback. It defers the decision with `setImmediate`. The check phase runs after the same loop iteration's poll phase, so an exit that happened during the block is delivered (and the flag set) first.
     - Then: if the child has exited, it waits up to 1 s for `close` with the real result. Otherwise it kills the child and reports the time-out, logging `RUNTIME_PROBE_TIMED_OUT { runtime, command, boundMs }`. For Grok the time-out code is used, not `GROK_CLI_UNSUPPORTED`.
     - Disarming also removes the listener.
     - The callers keep their interfaces.
   - **Tests (AC-008):**
     - In the real order: spawn `process.execPath -e ""`, arm a 200 ms bound, then block the main thread for 600 ms (for example `Atomics.wait` on a `SharedArrayBuffer`). The child exits during the block. The probe returns its real result. A deterministic regression for CR-001.
     - A child that never exits times out, with the log.
     - The SR-001 unit case for a late `close` stays.

## Change Scope (Mandatory)

- In scope: the files named per item, and their unit and E2E tests.
- Deliberately left alone: everything else in the memory and runtime areas.
- Follow-ups: none yet.

## Relevant Behavior And Production-Path Map (Mandatory)

Each REQ maps to the one owner named above. There are no new spines.

## Task Design Health Assessment (Mandatory)

- Posture: `Bug Fix` + `Cleanup`.
- Design issue: FU-003 had a repeated filter predicate in three places; it becomes one helper (Principle 11). The rest are local defects.
- Triggers:
  - **Repeated predicate:** answered by the shared helper.
  - **Behavior by absence:** FU-008, "timer fired" was read as "timed out"; it is now an explicit check of the child's state.
- Root cause: `Local Implementation Defect`.
- Refactor needed now: `No`.

## Legacy Removal Policy (Mandatory)

No compatibility path is kept.

## Persisted Data / State Transition Decision (Mandatory)

- FU-009: `Not Affected`. No released data has a shortened name for a 201–255 byte id. Dev machines that ran 554 builds might have one; there the old shortened folder is simply no longer used, and the full-name folder is used. No migration.
- FU-004: per DEC-004 (a): `Not Affected`.

## Removal / Decommission Plan (Mandatory)

| Item | Why |
| --- | --- |
| SM-12's `chmod` setup | replaced (FU-006) |
| The three inline workspace-kind predicates | the shared helper (FU-003) |

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Decision |
| --- | --- |
| Older-layout readers for imports (FU-004 b) | Recommended against; the user decides |

## Change / Refactor Sequence

FU-009 first (it blocks the release), then FU-008, FU-005, FU-006, FU-003, FU-002, FU-007; FU-004 per the answer.

## Guidance For Implementation

- Tests follow TESTING.md. FU-007 must be reproduced before it is changed.
- The other sections of the template are `N/A`: no new spines, interfaces, subsystems or files beyond the shared helper.
