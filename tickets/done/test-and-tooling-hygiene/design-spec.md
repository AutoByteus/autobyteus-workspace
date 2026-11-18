# Design Spec — test-and-tooling-hygiene (autobyteus-253)

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (SR-001 plus the watcher self-check below)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-001`; approved by the Solution Designer within the Task's direction, user informed in the `autobyteus-253` conversation, 2026-10-24
- Behavior-defining supplements and their approval references: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene/tickets/in-progress/test-and-tooling-hygiene/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md` (all core principles, practical guide, triggers, health assessment, size and risk; 2026-10-24); project `/DESIGN.md` (read in full); `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`; `TESTING.md`. `references/design-examples.md` not needed.
- Project design-principle conflicts with the general principles, or discrepancies: none. DESIGN.md rule 1/5 (start with supported behavior; remove work before adding machinery) shaped DEC-003 (no polling, no new owner).

## Current-State Read

The watcher (`AgentPackageFolderWatcher`) is a chokidar wrapper that reports "this definition folder changed" to the reloader, which is the single writer of the definition store and owns the settle timing (watcher L11-L14 sink; reloader L98-L141). Everything is event-driven. `composeAgentPackageDefinitionFeed` arms the watch before the first read, and `runFullReload` → `registrationListener` → `syncPackageFolders` arms new package folders after a full reload. Nothing ever re-reads a folder whose event the OS did not deliver. Measured: events are lost right after arming (the macOS watch is live up to ~60 ms after chokidar's `ready`) and while chokidar adds a watch for a newly found folder (OBS-W1…W6). So a Team folder written within milliseconds of an agent folder can stay unseen. The rest of the items are independent test or tooling defects, each with its cause in the investigation notes (OBS-G1, OBS-T1…T10). Only the watcher item changes production behavior.

## SR-002 Addendum — Watcher Self-Check (Design Impact from implementation IR-001)

Found by the implementation's 40-run loops under load (evidence IMP-02a/IMP-02b): the SR-001 catch-up repairs the store but not the watcher's own blindness. (1) When the OS never reports a new folder (e.g. `agents/scout`), chokidar never adds a watch on it, so later edits inside it produce no events; the folder stays unwatched until a later sibling event makes chokidar re-read its parent. (2) The presence watch can lose the event of a package folder renamed right after arming, so `FOLDER_MISSING` is never reported. Both are in the same event-loss class (OBS-W1…W6).

Decision (approved, design-only; requirements unchanged): when the catch-up timer fires, the watcher first checks its own health, then sends `reconcilePackageFolder`:
- Presence: `checkPackageFolder(entry, null, 'presence')` (existing identity check); coverage runs only while the state is `WATCHING`.
- Coverage: list the directory names under each kind dir that pass the layout allow-list (`isWatchedPackagePath(…, true)`, nested team/org agent folders included; no file content is read) and compare with the chokidar watch set (`PackageFolderWatch.getWatched()`, new on the type and its fakes). If a directory on disk is not watched, repair by closing the watcher and calling `arm()` again, with no `markPackageFolderChanged` (so no `agent_packages` frame); the new `ready` schedules the next catch-up, which reconciles quietly.
- Bound: one coverage repair per arm or per structural event; if the same directories stay unwatched (e.g. unreadable), log a warning and stop; the guard resets on the next `addDir`/`unlinkDir` event or a real arm. No loop is possible.
- Rule change: "the watcher never reads definitions" becomes "never reads definition files"; it may list directory names to compare with its own watch set (the watcher's own health, not definition content). The reloader is unchanged.
- Residual (accepted, RISK-001-like): a write inside the lag window of a watch added after the last catch-up; each repair needs a lost event first.
- Classification unchanged: `Medium` / `Low` (one more bounded method in the same owner; no new owner or contract).

## Task Size And Architectural Risk (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Size rationale and supporting evidence: about 35 files touched plus 36 deleted dead test files: 4 production source files (watcher, reloader, Grok probe option, `FileExplorerStreamingService.disconnect`), ~16 test files, 1 harness script, 1 doc fix and 1 doc rewrite, 1 lockfile entry; every change sits inside an existing owner
- Architectural risk (`Low`/`High`): `Low`
- Risk rationale and supporting evidence: no contract, persistence, security, deployment or ownership change; the only runtime addition is one debounce timer per watched package and one quiet pending set in the reloader's existing single-writer queue; the library change replaces rc.3 with rc.4 inside the declared range and is proven by the GraphQL suites; blast radius is bounded by the clean-clone suite run
- Escalation trigger if implementation or validation discovers new impact: the catch-up produces change frames or extra reloads for unchanged packages (AC-003 fails), the 40-run loops still show misses, or rc.4 changes any generated schema (schema suites fail) → return `Design Impact`

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Probe, 80-200 runs | `evidence/probes/SD-watcher-probe.test.ts`, `evidence/SD-reproduction-results.txt` | Events lost right after ready and under watch churn | Catch-up after arming and after folder add/remove | libuv mechanism inferred |
| Raw `fs.watch` experiments | `evidence/probes/SD-fswatch-*.mjs` | Lag ≤ 60 ms; handle add loses events (4/480 vs 0/120) | Catch-up delay 300 ms, trigger on `addDir`/`unlinkDir` | none |
| Read | `agent-package-definition-reloader.ts` L267-L303 | `reloadBatch` expands a package into all known and listed folders; publishes whenever a package folder was marked | A separate quiet set that expands the same way but publishes only real changes | none |
| Read | `agent-package-folder-watcher.ts` L11-L14, L196-L207, L309-L319 | Sink type; `handleEvent`; `closeWatcher` | Where the timer lives and is cleared | none |
| Read | `src/agent-memory/services/agent-memory-explorer-service.ts` L47-L54; `src/run-history/services/agent-run-history-catalog-service.ts` L140 | Same injectable-port pattern already allowed | DEC-001 | none |
| Read + diff | `type-graphql` rc.3 vs rc.4 tarball | `clearMapCaches()` in `initCache`, cloned storage per build | DEC-004 | prerelease |
| Run | `LLMFactory` probe | `reloadModels(LMSTUDIO)` discovers models | DEC-006 | none |

## Intended Change

Close the measured event-loss window with one quiet re-read request, and give each of the other twelve items its established fix (below). No new owner, no polling.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003 (REQ-001…REQ-014). Areas: the package folder watcher and reloader (BEH-001), the server GraphQL test harness and lockfile, server and web tests named in the Task, the `autobyteus-ts` LM Studio suite, the Electron harness build step and its docs, the dead prompt-engineering tests.
- Derived consumers, when a stored or shared structure changes: `PackageFolderChangeSink` (type) → implemented by `AgentPackageDefinitionReloader`; the fake sink of `agent-package-folder-watcher.test.ts` and any helper in `tests/helpers/agent-package-definitions-test-support.ts` must gain the new method (decision: add it; no optional method).
- Deliberately left alone: the settle window values (1 s / 3 s), chokidar and its options, the web `agent_packages` change-frame semantics, `FOLDER_MISSING`/`UNAVAILABLE` handling, periodic rescans, `autobyteus-220`'s test, the other ~885 web type errors, the delegated-launch E2E, release.
- Follow-ups: FU-001, FU-002 (see `follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-002, REQ-003; AC-002, AC-003, AC-004 | Files written in a registered package folder | Investigation notes BEH-001 row | Add the quiet re-read; keep everything else | DS-001, DS-002 |
| BEH-002 | Contract | REQ-004; AC-005 | A second schema build in one process | OBS-G1 | Library rc.4; remove the harness workaround | N/A (dependency + test) |
| BEH-003 | Operational | REQ-001, REQ-005…REQ-015; AC-001, AC-006…AC-016 | Running the suites | OBS-T1…T10 | Per item table below | N/A (test and tooling files) |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (watcher, a real product race) plus `Cleanup` (tests, docs, dead tests, dependency patch)
- Current design issue found: `Yes` for the watcher (the design trusts the OS to deliver every event); `No` for the other items (local defects)
- Structural triggers that fire, each with evidence; if none fire, name the triggers this change could plausibly hit and the evidence ruling each out: "Capability-area reuse" fires: the settle window and `reloadBatch` expansion already exist, so the design reuses them (no new helper). "Repeated coordination" could fire if the catch-up copied `reloadBatch`'s expansion: it must share one expansion helper for `packageFolders` and `reconcileRoots`. "Empty indirection" ruled out: the sink method is a real second operation (quiet vs announcing). "Behavior by absence" ruled out: the catch-up is an explicit rule, not "no event ⇒ ...". "Legacy cleanup" fires for the dead tests (Principle 7/8): deleted outright.
- Root cause classification: `Missing Invariant` (the owner of "definitions match disk" has no repair for lost events) for BEH-001; `Local Implementation Defect` for each test item
- Refactor needed now: `No`
- Evidence: OBS-W1…W6; the existing owner and boundary (watcher reports, reloader writes) are healthy
- Design response: the watcher asks, the reloader re-reads; publish only real changes
- Refactor rationale: n/a
- Intentional deferrals and residual risk, if any: RISK-001 (loss by another component's watch churn with no definition event of its own); recovery stays manual Reload

## Terminology

- **Catch-up**: the watcher's request to the reloader to re-read one package folder's definition folders once it is quiet, announced only if something changed. In code: `reconcilePackageFolder`.

## Section Fill Order

Followed the Practical Application Guide: current-state, behavior map, health, spines, boundaries, files, sequence.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the 36 dead prompt-engineering test files and the 3 exclusions in `vitest.config.ts`; the memoizing `vi.mock` of `buildGraphqlSchema` in `update-notifications-live.e2e.test.ts` once rc.4 is in; the fixed `sleep(300)` / `sleep(1000)` watch-start waits in the integration and E2E tests; `shouldSkipOnConnectionError` returns in the LM Studio suite; stale doc commands.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

`Not Affected`: nothing persisted is read or written differently (definition files are only read; the store is in memory).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | A file is written in a registered package folder | A change frame and the definitions in the store | `AgentPackageDefinitionReloader` (writer) with `AgentPackageFolderWatcher` (detector) | The path the missed folder should take |
| DS-002 | Return-Event (bounded local to the watcher) | BEH-001 | Watch armed, or `addDir`/`unlinkDir` event | `sink.reconcilePackageFolder(root)` | `AgentPackageFolderWatcher` | The catch-up trigger and its debounce |

## Primary Execution Spine(s)

DS-001: `Package folder write -> chokidar event -> AgentPackageFolderWatcher.handleEvent -> reloader.markFolderChanged | reconcilePackageFolder -> settle timer (1 s quiet) -> reloader.reloadBatch -> store.apply -> change hub frame (only if changed)`

DS-002: `arm() ready | handleEvent(addDir|unlinkDir) -> scheduleCatchUp (debounce 300 ms) -> sink.reconcilePackageFolder(root)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A file event marks its definition folder; after the quiet window the reloader re-reads the marked folders and announces what changed. The new `reconcilePackageFolder` request marks a whole package for the same quiet window, expanded exactly like `markPackageFolderChanged` (known + listed folders), but it announces nothing unless a folder really changed | watcher, reloader, store | Reloader (timing, reading, announcing) | change hub |
| DS-002 | When a package watch is armed (after chokidar `ready`) and whenever a definition folder is added or removed, the watcher restarts one 300 ms timer for that package; when it fires (the package is still watched, same generation) it calls the sink once. 300 ms is 5× the measured ≤ 60 ms lag of a new watch, and "after the last folder add/remove" puts the request behind the moments the OS drops events | watcher | Watcher (detects, never reads) | none |

## Spine Actors / Main-Line Nodes

`AgentPackageFolderWatcher` (detector and watch lifecycle), `AgentPackageDefinitionReloader` (single writer and publisher), `AgentPackageDefinitionStore`.

## Ownership Map

- Watcher owns: watch lifecycle, package state, and now one catch-up timer per entry (cleared with the entry's watcher, on missing/unavailable, on re-arm, on close).
- Reloader owns: pending sets (folders, packages, reconcile roots), the settle timers, the serialized reload queue, publishing.
- It remains true that the watcher never reads definitions.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `tests/unit/prompt-engineering/**`, `tests/unit/agent-tools/prompt-engineering/**`, `tests/integration/prompt-engineering/**` (36 files) | Dead: import `src/prompt-engineering/**` and `src/agent-tools/prompt-engineering/**`, deleted in `fd063bdc00` (`ls src/agent-tools` has no such folder); `.js` copies are not collected | n/a | Evidence: `find` + import resolution check (no import of those files resolves except two shared modules that exist for other reasons) |
| `vitest.config.ts` L20-L22 exclusions | Dead: exclude the deleted tests | n/a | `exclude` key goes if empty |
| `docs/modules/prompt_engineering.md` lines naming deleted `src/prompt-engineering`, `src/api/graphql/types/prompt.ts` and `src/agent-tools/prompt-engineering` | Dead: documents deleted code | The doc keeps its Carpenter composition part | Referenced from other docs; keep the file |
| memoizing `vi.mock` in `update-notifications-live.e2e.test.ts` L45-L49 | Workaround for the rc.3 defect | rc.4 | Check `vi` import still used |
| `sleep(300)` after `whenReady()` (integration `start()`, AC-011, AC-012 ×2) and `sleep(1000)` + its comment in `importLocal` (E2E) | They hid the lost-event window | catch-up | keep sleeps that wait for "not detected" cases |
| `shouldSkipOnConnectionError` and silent `return`s in `lmstudio-llm.test.ts` | They make a skip look like a pass | preflight + `ctx.skip(reason)` | — |

## Return Or Event Spine(s) (If Applicable)

DS-002 is the return/event spine (watcher → sink).

## Bounded Local / Internal Spines (If Applicable)

Parent owner: watcher. `Event (addDir|unlinkDir|ready) -> clear timer -> set timer -> fire (guard: closed? same generation? state WATCHING?) -> sink.reconcilePackageFolder`. It matters because the guards decide when no request may be sent.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Catch-up debounce timer | DS-002 | Watcher | Delay and coalesce the request | A burst of 25 new folders should cause one re-read | A per-event reload storm |
| Quiet reconcile set | DS-001 | Reloader | Expand a package like a package change, publish only real changes | An unchanged package must not announce `agent_packages` | Spurious frames (breaks the burst and skill tests) |

## Ownership Boundaries

The watcher/reloader boundary is the sink type. It gains exactly one method; the reloader stays the only reader and publisher. No other caller changes.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `PackageFolderChangeSink` | Reloader's pending sets and timers | The watcher | The watcher reading definition folders or the store itself | Add a sink method (as here) |

## Dependency Rules

The watcher depends only on the sink; the sink's implementer is the reloader; tests may fake the sink. Production code must not call `reconcilePackageFolder` from anywhere except the watcher's catch-up.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `PackageFolderChangeSink.reconcilePackageFolder(rootPath)` | One registered package folder | Ask for a quiet re-read of its definition folders (no announcement unless changed) | `rootPath` as in `markPackageFolderChanged` | Same identity as the existing package-level method |
| `AgentPackageFolderWatcher` option `catchUpDelayMs?: number` | Watcher timing | Default 300; tests may shorten | milliseconds | Exported default constant `PACKAGE_CATCH_UP_DELAY_MS` |
| `probeGrokBuildCli(options?: { timeoutMs?: number })`, `assertGrokBuildCliSupported(options?)` | Grok capability probe | Per-command bound (default 3 000 ms unchanged) | milliseconds | Production callers pass nothing |
| `hostElectronBuildScript(platform)` in `electronE2ELaunchPreparation.mjs` | Harness build step | `darwin`→`build:electron:mac`, `linux`→`build:electron:linux`, `win32`→`build:electron:windows`; other → error naming the platform | `process.platform` string | Exported for the node test |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `reconcilePackageFolder` | Yes | Yes | Low | none |
| `catchUpDelayMs` | Yes | Yes | Low | none |
| Grok `timeoutMs` | Yes | Yes | Low | none |
| `hostElectronBuildScript` | Yes | Yes | Low | none |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Quiet re-read request | `reconcilePackageFolder` / `pendingReconcile` | Yes (it reconciles the store with the folder; unlike `markPackageFolderChanged` it asserts no change) | Low | none |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Timing and coalescing of reads | Reloader settle window | Reuse | The sink call just arms the existing timer | n/a |
| Expansion of a package into folders | `reloadBatch` | Extend (one helper shared by both package-level sets) | Avoid a second copy (Repeated coordination trigger) | n/a |
| Debounce | `setTimeout` in the watcher (same pattern as the reloader's timers) | Reuse pattern | No timer utility exists to reuse | n/a |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-package-definitions/monitor` | Catch-up trigger | DS-002 | Watcher | Extend | |
| `agent-package-definitions/services` | Quiet reconcile | DS-001 | Reloader | Extend | |

## Draft File Responsibility Mapping / Final File Responsibility Mapping

Unchanged by extraction: no new file is added in production code. See the mapping below.

## Reusable Owned Structures Check / Shared Structure / Data Model Tightness Check

N/A — no shared structure is added; `reconcilePackageFolder` takes the same `rootPath` string as its sibling.

## Applied Patterns (If Any)

Debounce timer guarded by a generation counter (the watcher's existing pattern for stale callbacks).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-package-definitions/monitor/agent-package-folder-watcher.ts` | File (modify) | Watcher | Sink type + `reconcilePackageFolder`; entry `catchUpTimer`; `scheduleCatchUp`; clear in `closeWatcher`; called from the `ready` handler of `arm()` and from `handleEvent` for `addDir`/`unlinkDir` | Detection owner | Any read of definitions |
| `autobyteus-server-ts/src/agent-package-definitions/services/agent-package-definition-reloader.ts` | File (modify) | Reloader | `reconcilePackageFolder`, `pendingReconcile` (in `applyPendingChanges`, the timer callback, `flushPending`, `runFullReload` clears, failure restore), shared package expansion helper | Single writer | Publishing for an unchanged package |
| `autobyteus-server-ts/tests/unit/agent-package-definitions/agent-package-folder-watcher.test.ts` | File (modify) | Test | Fake sink gains the method; new cases: ready → one request after the delay; `addDir`/`unlinkDir` debounce; none for file events, after close, in `FOLDER_MISSING`/`UNAVAILABLE`, after re-arm | AC-002 | — |
| `autobyteus-server-ts/tests/unit/agent-package-definitions/agent-package-definition-reloader.test.ts` | File (modify) | Test | Cases for AC-003 | — | — |
| `autobyteus-server-ts/tests/helpers/agent-package-definitions-test-support.ts` | File (modify if it implements the sink) | Test | Keep in step | — | — |
| `autobyteus-server-ts/tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts` | File (modify) | Test | Remove the watch-start sleeps | AC-004 | — |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` | File (modify) | Test | Remove the post-import sleep and comment | AC-004 | — |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | File (modify) | Test | Add `agent-memory-explorer-service.ts` to the exact list at L2998 with a comment naming why (injectable port default) | AC-001 | — |
| `autobyteus-server-ts/package.json`, `pnpm-lock.yaml` | File (modify) | Dependency | `type-graphql` `^2.0.0-rc.4`, lock rc.4 (`pnpm add type-graphql@2.0.0-rc.4 --filter autobyteus-server-ts`, then fix the range text) | DEC-004 | Other lock changes (review the diff: only `type-graphql` lines) |
| `autobyteus-server-ts/tests/unit/api/graphql/update-notifications-schema.test.ts` | File (modify) | Test | Case: second `buildGraphqlSchema()`; `clearUpdateNotification(kind, sourceId)` receives both arguments in order (spy on `UpdateNotificationService`) | AC-005 | — |
| `autobyteus-server-ts/tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` | File (modify) | Test | Remove L45-L49 mock | AC-005 | — |
| `autobyteus-web/components/notifications/__tests__/NotificationCenter.spec.ts` | File (modify) | Test | Fixed `foundAt` default (`2026-10-22T10:00:00.000Z`); first case gives the agent-package row a later and the skill row an earlier fixed value; the `new Date().toISOString()` at L199 becomes a fixed value too | AC-006 | — |
| `autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts` | File (modify) | Test | `beforeAll` preflight (reachability of `/api/v1/models`, `LLMFactory.reloadModels(LLMProvider.LMSTUDIO)`, models count); each case takes the vitest context and `ctx.skip(reason)`s when its precondition fails (no host, no model, no vision model, no reasoning-capable loaded model, image URL unreachable, missing image file); model order honors `LMSTUDIO_TARGET_TEXT_MODEL`; delete `shouldSkipOnConnectionError` | AC-007 | A `return` that passes |
| `autobyteus-web/scripts/electron-e2e/electronE2ELaunchPreparation.mjs` | File (modify) | Harness | `hostElectronBuildScript(platform)`; build step runs it | AC-008 | — |
| `autobyteus-web/scripts/electron-e2e/__tests__/electronE2ELaunchPreparation.node-test.mjs` | File (add) | Test | The mapping for darwin/linux/win32 and the unsupported platform error; the build is invoked with the mapped script when `build` is not false (inject `packageManager` fake) | AC-008 | — |
| `README.md` ("Packaged Electron API/E2E testing") | File (modify only if the text is wrong after the fix) | Docs | Keep "builds the current host package" true | — | — |
| `autobyteus-web/docs/electron_packaging.md` L493-L512 | File (modify) | Docs | Real commands: `pnpm -C autobyteus-web build:electron:mac|linux|windows|linux:x64|linux:arm64`, bare `build:electron` = all platforms, Linux host only; no `ts-node` | AC-009 | — |
| `autobyteus-server-ts/src/runtime-management/grok/grok-build-capability.ts` | File (modify) | Probe | `timeoutMs` option threaded to `runProbe` | AC-010 | Any change to the default |
| `autobyteus-server-ts/tests/unit/runtime-management/grok/grok-build-capability.test.ts` | File (modify) | Test | Capability cases pass `timeoutMs: 30_000`; a new case passes a tiny `timeoutMs` against a fake command that sleeps and expects `GROK_CLI_UNSUPPORTED` (proves the bound still works) | AC-010 | — |
| `autobyteus-web/electron/extensions/__tests__/managedExtensionService.spec.ts` | File (modify) | Test | `vi.setConfig({ testTimeout: 30_000 })` at the top of the file, with a comment naming the real process spawns | AC-011 | — |
| `autobyteus-server-ts/tests/**/prompt-engineering/**` (36 files), `autobyteus-server-ts/vitest.config.ts` L20-L22, `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Files (delete / modify) | Test and docs | Per the removal plan | AC-012 | — |
| The five named web spec files | Files (modify) | Tests | Type-only fixes: `as` narrowing or a mutable fixture type at the exact lines (OBS-T8); no assertion changes | AC-013 | `// @ts-ignore`, `any` that hides the fixture shape |
| `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` and `__tests__/FileExplorerStreamingService.spec.ts` | Files (modify) | Service + test | `disconnect()` detaches `onopen`/`onmessage`/`onerror`/`onclose` before `close(1000, …)`, then drops the socket; new cases for AC-014 | AC-014 | Logging an error for the app's own close |
| `autobyteus-server-ts/tests/unit/agent-execution/native-compaction-terminal-drain.test.ts` | File (modify) | Test | After the first attempt: `await eventually(() => state === 'awaiting_user' && phases.includes('failed'))`, then `phases.length = 0` | AC-015 | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-package-definitions/monitor`, `…/services` | Main-Line Domain-Control | Yes | Low | No new files |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Catch-up request | Watcher: `handleEvent(addDir …) → scheduleCatchUp(entry)`; fire → `sink.reconcilePackageFolder(root)`. Reloader: `reconcilePackageFolder(root) { if closed return; pendingReconcile.add(root); armTimer() }`; `reloadBatch(folders, pkgs, reconcile)` builds `targets` for both package sets with one helper and publishes `if (changedKinds.size > 0 || packageFolders.size > 0)` (unchanged expression: reconcile does not force a publish) | The watcher listing folders itself, or calling `markPackageFolderChanged` (always announces `agent_packages`, breaking AC-006/AC-007 of the auto-refresh tests); a periodic `setInterval` rescan | One quiet request through the existing writer |
| Test waiting | `waitFor(listAvailable, names => names.includes("agent_team:Squad"))` with the 5 s bound | `await sleep(300)` after `whenReady()` | The bound is the contract; a sleep guesses OS timing |
| LM Studio skip | `it('…', async (ctx) => { if (!lm.ok) return ctx.skip(lm.reason) … })` | `if (!llm) return;` | A skip must be visible |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep rc.3 and the memoizing mock | Avoids a lockfile change | Rejected | Take rc.4 and delete the mock |
| Keep `.js` copies of the dead tests | None needed | Rejected | Delete with the `.ts` ones |
| Optional sink method for old fakes | Fewer test edits | Rejected | Add the method to the type and every fake |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Baseline commits that need no other change (each its own commit, TESTING.md Rule 9 "baseline fix"): W-01 architecture allow-list; W-10 dead tests + exclusions + doc; W-04; W-13; W-09; W-11; W-12; W-08; W-05; W-06 + W-07.
2. W-03: add rc.4, lockfile diff reviewed, new unit case, remove the mock; run the GraphQL unit, integration and the update-notification E2E.
3. W-02: first make the red visible (remove the sleeps in a scratch run: the integration case fails about half the time), then add the sink method and reloader reconcile with unit tests, then the watcher catch-up with unit tests; then the 40-run loops under load (integration and E2E file) and the probe.
4. Clean-clone proof of the merged result (AC-016).

## Key Tradeoffs

- Event-triggered catch-up closes the measured gap at the cost of one extra package re-read after a burst; polling would cover more but costs standing I/O for a ~1-3% race (DEC-003).
- Generous explicit timeouts (30 s) instead of faking real process spawns: the spawns are what those tests prove (DEC-008).
- A library prerelease bump instead of a harness shim: fixes the cause for every test that builds twice.

## Risks

- RISK-001 (see Task Design Health Assessment); RISK-002 rc.4 is a prerelease; loops under load take minutes; `ctx.skip(reason)` depends on vitest ≥ 3 in `autobyteus-ts` (`^4.1.12` locked: fine).
- The web `vue-tsc` fix must not alter assertions (reviewer checks the diff is type-only).

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: `evidence/probes/SD-watcher-probe.test.ts` (copy to `autobyteus-server-ts/tests/tmp-probe/watch-probe.test.ts`, run `PROBE_N=80 PROBE_DELAY=0 pnpm -C autobyteus-server-ts exec vitest run tests/tmp-probe/watch-probe.test.ts --no-watch --reporter=verbose`; ≈ 50% `MISS`). After the fix, change its detection rule to "a `markFolderChanged(agent_team, squad)` or a `reconcilePackageFolder(root)` arrived at or after the last write" (the sink in the probe needs the new method) and expect 0 `MISS` at DELAY=0 and under load. The probe is a temporary diagnostic: never commit it. The committed regression is the unit tests plus the sleep-free integration and E2E cases.
- Load recipe: `NC=$(sysctl -n hw.ncpu); for i in $(seq 1 $((NC*2))); do (yes >/dev/null &); done; …; pkill yes`.
- LM Studio (AC-007): one local model at a time (TESTING.md), prefer `qwen/qwen3.6-35b-a3b` via `LMSTUDIO_TARGET_TEXT_MODEL`; unload any model the run loaded; run the unreachable case with `LMSTUDIO_HOSTS=http://127.0.0.1:9`. Clean environment for `autobyteus-ts` integration tests (TESTING.md).
- Electron (AC-008): a real macOS `pnpm -C autobyteus-web test:e2e:electron --adapter direct` takes a full package build; if it cannot finish, record the exact blocker and the node-test result, do not claim it.
- Commit rules: stage paths explicitly (never `git add -A`); one commit per work item; name the test and cause in each commit message (Rule 9); no build output.
