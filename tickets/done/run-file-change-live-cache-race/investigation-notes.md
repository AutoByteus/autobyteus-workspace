# Investigation Notes: A First Read Can Hide A Running Agent's File

## Investigation Meta

- **Package identifier:** `run-file-change-live-cache-race`
- **Request / ticket:** Project Task autobyteus-180, "Running agents' file lists can permanently miss a file: a first read overwrites the live cache with a stale projection (race)". This is follow-up FU-C of autobyteus-153 (`run-file-change-owner-scoped-reads`). It was delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-10-19.
- **Workspace root:** `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race`
- **Repository mode:** `Git`
- **Task worktree / branch:** `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race`, branch `codex/run-file-change-live-cache-race`
- **Resolved base remote / branch / revision:** `origin` / `personal` / `87732d5504` (v1.5.6-beta.11 bump; fetched 2026-10-19). autobyteus-153 is merged on this base.
- **Finalization target:** `origin` / `personal` (RELEASE.md)
- **Bootstrap result:** worktree and branch created from freshly fetched `origin/personal`; `pnpm install --frozen-lockfile` and server `prebuild` done.
- **Bootstrap blocker:** none
- **Current solution revision ID:** `SR-002`
- **Authorities read:** I read all of these in full earlier in this conversation, on 2026-10-19, and applied them again here:
  - requirements gate `references/requirements-engineering.md`;
  - architecture gate `references/architecture-design.md` and `references/design-principles.md`;
  - `DESIGN.md` at the repository root;
  - `TESTING.md` (test layers, choosing the path, environments).
- **Investigation status:** complete

## Initial Request And Clarifications

- **Original request (Task text):** a first read of a running agent's file list or file content can still be reading the stored `file_changes.json` while the agent's first FILE_CHANGE event is handled. That read then overwrites the live cache with its stale projection. Every later live read misses the file until the run stops.
- **Direction:** do not overwrite a cache entry set while the stored read was in flight, or serialize loads through the per-run queue; the team decides. Keep the live list correct after the run stops. Add a regression test and check the other readers of the same cache.
- **Done when:** the regression test passes and the E2E loop no longer fails in repeated runs; merged; ships with the next release.
- **Clarifications:** none needed.
- **New fact found (more severe than the Task states):** the stored file does not stay correct. The agent's next file change persists the stale cache, so the first file is lost from the saved record permanently. See Runtime findings.

## Product And Domain Understanding

- **Product area:**
  - Server: `RunFileChangeService`, which owns the live file-change projection of attached (running) agent runs.
  - Client: the Artifacts tab (desktop and mobile), which lists and opens those files.
- **Terms:**
  - **attached run:** a running agent run whose FILE_CHANGE events this service consumes. This covers standalone runs and every collaboration member.
  - **live cache:** `projections`, the in-memory projection per attached run.
  - **stored record:** the run's `file_changes.json`.

## Source Log

| Date | Type | Source | Why | Finding | Follow-up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | Doc | Task attachments: API-08 probe (`ctx_d2a07083e8fc__…probe.test.ts.txt`), API-08 log, API-04b stability loops | Evidence | Deterministic reproduction: `{"stored":["/abs/out.png"],"readerSaw":[],"later":[]}`. 2 of 9 real-server E2E runs failed | — |
| 2026-10-19 | Code | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts` (base `87732d5504`) | Root cause | Two paths fill the cache. `load()` does it on a cache miss: `await readStored()` then `projections.set(runId, projection)`, with no check that the cache was filled while the read was in flight. `handle()` (per-run queue) does it through `load()`, then upserts the entry, sets the cache and writes `file_changes.json` | Root cause |
| 2026-10-19 | Code | Same file: `enqueue`, `handle` | Order of writes | Events are serialized per run. Reads are not queued. `handle` writes to disk the projection it got from `load` plus the new entry | Explains the loss on disk |
| 2026-10-19 | Command | Temporary probe `tests/unit/zz-tmp/race-disk-probe.test.ts` (copied to `probes/race-disk-probe.test.ts.txt`); `pnpm -C autobyteus-server-ts exec vitest run tests/unit/zz-tmp/race-disk-probe.test.ts --no-watch` | Does a later event persist the stale cache? | `{"storedAfterSecondEvent":["/abs/two.png"],"liveAfterSecondEvent":["/abs/two.png"]}`: the first file is gone from the stored record and the live list | Severity: permanent loss of the record entry |
| 2026-10-19 | Code | `grep -rn "projections"` in `services/run-file-changes/` | Other readers of the same cache | Only `load` (used by `getProjectionForRun`, `getProjectionForCollaborationMember` and `handle`), `handle` and `clear`. So one fix in `load` covers every reader | — |
| 2026-10-19 | Code | `grep -rn "const cached = this\.\w*\.get("` in `src`; `services/published-artifacts/published-artifact-projection-store.ts` | Same pattern elsewhere? | The other caches hold immutable or derived data: definition names (`agent-run-history-catalog-service.ts:518`), file digests (`skill-folder-snapshotter.ts:67`), gitignore matchers (`workspace-ignore-matcher.ts:85`). None has a concurrent mutator. The published-artifact store keeps no cache | No other instance |
| 2026-10-19 | Code | `tests/unit/services/run-file-changes/run-file-change-service.test.ts` | Existing coverage | It covers projection, canonicalization, failed status, an unattached fresh read, dropping the cache on detach, and "does not re-cache a run whose FILE_CHANGE handling finishes after detach". No case covers a concurrent first read | Add a regression test |
| 2026-10-19 | Code | `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts:83-111`; `stores/runFileChangesStore.ts` | Does the client have the same overwrite? | The client merges (`mergeHydratedRunFileChanges`) when a live, subscribed context exists, and replaces only before it subscribes. Member hydration always merges (`memberRunStateHydration.ts:55`) | Not part of this defect |
| 2026-10-19 | Code | `tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts:22-24, 68-74` | E2E workaround | Before its first live read, the E2E waits for each running member's stored `file_changes.json`, explicitly to avoid this race | The wait is removed with the fix so the E2E exercises the real trigger |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | The app loads a running agent's file list (opening a run, hydrating a team, org or copy member, reopening a member) while that agent records its first file change | The read misses the cache and starts a stored read. The event's `handle` misses too: it reads the stored record, caches it, adds the entry, caches again and writes the file. The read's slower stored read then finishes and **overwrites** the cache with its stale projection | The file is missing from every later live list; opening it gives 404 "File change not found" | Task probe; real-server E2E 2/9 | High |
| BEH-002 | System | The same agent records another file change after BEH-001 | `handle` loads the stale cache, adds the new entry and writes it to `file_changes.json` | The first file is lost from the saved record permanently; it stays missing after the run stops and after restart | Probe `race-disk-probe-run1.txt` | High |
| BEH-003 | User/System | Normal reads and events with no overlap | Cache hit, or a miss with no concurrent event | Correct | Existing unit tests | High |
| BEH-004 | System | A run detaches while its `handle` is in flight | The `attachedRunIds` guard stops re-caching | Correct (tested) | Existing unit test | High |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Implication |
| --- | --- | --- |
| `run-file-change-service.ts#load` | Fills the cache on a miss | It must not replace a cache entry that was set while its stored read was in flight |
| `run-file-change-service.ts#handle` | Applies an event to the cached projection and persists it | It is correct once `load` returns the current cache |
| `run-file-change-service.test.ts` | Unit tests | Gets the regression tests |
| `owner-scoped-member-file-changes.e2e.test.ts` | Gated real-server E2E | Its workaround wait is removed |

## Structural And Payload Surface Inventory

- **Payload:** none changed; same projection shape and same `file_changes.json`.
- **Structural:** one private method's behavior. No API, persistence, concurrency-primitive or ownership change.
- **Potential impacts:**
  - API: absent.
  - Persistence schema: absent.
  - Security: absent.
  - Concurrency: present but local; the cache-fill rule inside one owner.
  - Migration: absent.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| API-08 probe (autobyteus-153, attached) | First read overlaps the first event | `later: []` while `stored: ["/abs/out.png"]` | Live list misses the file | Task attachment |
| `race-disk-probe` (this Task, base `87732d5504`, unchanged `src`) | Same, followed by a second event | `storedAfterSecondEvent: ["/abs/two.png"]` | The saved record loses the first file permanently | `probes/race-disk-probe.test.ts.txt`, `probes/race-disk-probe-run1.txt` |
| API-04b loops (autobyteus-153) | Real server, polling the list while agents write | 2 of 9 runs failed before the workaround wait; 10 of 10 passed with the wait | Real trigger | Task attachment |

## Persisted Data And State Facts

- **Affected stored subject:** `file_changes.json` per agent run. The fix writes the same shape.
- **Already-lost entries in existing users' records:** they cannot be reconstructed. The lost entry's FILE_CHANGE event is gone, and the record holds no history. The written file itself still exists in the workspace.
- **Acceptable loss:** none going forward.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/race-disk-probe.test.ts.txt` | Solution Designer | Reproduce the loss on disk | investigation | BEH-002, AC-002 | Evidence; the temporary test file is removed from the source tree | N/A |
| `probes/race-disk-probe-run1.txt` | Solution Designer | Probe output | investigation | BEH-002 | Evidence | N/A |
| Task attachments (API-08 probe and log, API-04b loops) | autobyteus-153 API/E2E | Original reproduction | evidence | BEH-001 | Evidence | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| R-001 | Risk | A reader holding a stored read from before a detach and re-attach could fill the new attachment's cache with data older than a write still in flight from the old attachment | Technically possible but unsupported/contrived: it needs a detach and re-attach of the same run id inside one disk read, with a late write from the previous attachment. Not addressed | Accepted |
| R-002 | Risk | Users may already have lost entries | Not recoverable (see Persisted Data) | Accepted; noted in the release notes |

## Architecture Investigation Findings

- **Owner:** `RunFileChangeService` alone owns the live cache. Every reader and the event handler go through `load`.
- **Invariant needed:** while a run is attached, the cache is the newest truth. The stored record is written only after the cache is updated, so the cache is always at least as new as the stored record. Any stored read that finds the cache filled when it returns is therefore no newer than the cache, and must not replace it.
- **Root cause:** `Missing Invariant` in `load`: it fills the cache unconditionally after an `await`.

## Requirement Implications

- Fix the cache-fill rule: REQ-001.
- Protect the saved record: REQ-002.
- Add a regression test, and make the E2E exercise the trigger: REQ-003.

## Notes For Architecture Design

- Keep `handle`'s per-run serialization and the detach guard.
- There is no need to queue reads behind events; the fill rule alone restores the invariant.
