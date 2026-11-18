# Investigation Notes — test-and-tooling-hygiene (autobyteus-253)

## Investigation Meta

- Package identifier: `test-and-tooling-hygiene`
- Request / ticket: Project Task `autobyteus-253`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene` / `codex/test-and-tooling-hygiene`
- Resolved base remote / branch / revision: `origin/personal` @ `8b34e8ae108a281b0c93c679c60883df28a30773` (fetched 2026-10-24 05:2x; the main checkout was 628 commits behind and dirty, so it was not used)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md; `finalize/test-and-tooling-hygiene` merged `--no-ff`)
- Bootstrap result: worktree created, `pnpm install --frozen-lockfile` and `nuxt prepare` run; `git status` clean apart from this folder
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md` (2026-10-24); project `AGENTS.md`, `TESTING.md`, `DESIGN.md`, `RELEASE.md` (RELEASE.md first 80 lines)
- Investigation status: complete for all items; implementation to start from the reproductions listed under Runtime Findings

## Initial Request And Clarifications

- Original request: Task `autobyteus-253` and its comments, plus the Project Task Manager's message listing the same items (7 groups).
- Clarifications received: none needed. The Project Task Manager asked for proof from a clean clone of `personal` (not a worktree), the Task key in reports, and no release.
- User-supplied facts and constraints: TESTING.md Rule 9 (cause first); FU-011 of 229 belongs to `autobyteus-220`.
- Initial ambiguity: whether the watcher item is a test or a product problem (resolved: product race, OBS-W1…W6); whether the architecture guard or the service is wrong (resolved: DEC-001).

## Product And Domain Understanding

- Product area: server agent package definitions (auto-refresh), GraphQL schema, test suites of server, web, Electron, `autobyteus-ts`.
- Affected actors or systems: see the requirements doc.
- Existing user or operational purpose: auto-refresh lets the Agent Package Creator and users add definition folders without Reload.
- Relevant terminology: catch-up = a quiet re-read of a package's definition folders requested by the watcher.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24 | Doc | Task description, comments, `ctx_72c0fb0f9651__autobyteus-229-follow-ups.md`, `delivery-receipts/seal-migrations-per-folder/follow-ups-280.md`, `tickets/done/task-comments/follow-ups.md`, `tickets/done/remote-runs-in-tree/follow-ups.md` | Item inventory | 13 items + FU-011 elsewhere | — |
| 2026-10-24 | Command | `git fetch origin`; `git worktree add -b codex/test-and-tooling-hygiene … origin/personal` | Isolation | Base `8b34e8ae10` | — |
| 2026-10-24 | Code | `autobyteus-server-ts/src/agent-package-definitions/monitor/agent-package-folder-watcher.ts`, `…/services/agent-package-definition-reloader.ts`, `src/compositions/agent-package-definition-feed-composition.ts` | Watcher item | Watcher never waits for readiness; reloader `markPackageFolderChanged` re-reads a package and always announces `agent_packages` | — |
| 2026-10-24 | Code | `node_modules/chokidar/esm/handler.js`, `index.js` (4.0.3) | Why events are lost | `ready` is emitted after `fs.watch` is installed for the initial dirs; each new folder gets its own `fs.watch`; readdir throttling re-reads once | — |
| 2026-10-24 | Command | probes under `evidence/probes/` | Reproduce | See Runtime Findings | — |
| 2026-10-24 | Command | `npm pack type-graphql@2.0.0-rc.4`, diff of `build/esm/metadata/metadata-storage.js` and `schema/schema-generator.js` | Library fix? | rc.4 fixes `initCache` (OBS-G1) | — |
| 2026-10-24 | Command | `curl localhost:1234/v1/models`; `LLMFactory` probe | LM Studio | LM Studio runs locally (5 models); factory lists 0 after `reinitialize()` | — |
| 2026-10-24 | Command | `pnpm exec vitest run … tests/architecture/application-framework-boundaries.test.ts -t SR-011` | Reproduce W-01 | Fails at line 2997 with the extra entry `agent-memory-explorer-service.ts` | — |
| 2026-10-24 | Command | `npx --yes vue-tsc --noEmit` (6.0.2) in `autobyteus-web` after `nuxt prepare` | Type errors | 892 errors; 7 in the five named files | FU-001 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Files written in a registered package folder (Agent Package Creator's file tools, a user, an import followed by writes) | chokidar (`ignoreInitial`, allow-list filter) watches `agents/`, `agent-teams/`, `agent-orgs/`; each event → `sink.markFolderChanged(kind, folderId)` → reloader settle window (1 s quiet, 3 s cap) → `reloadBatch` → store → change frame. A full reload (`runFullReload`) happens first, then `registrationListener` → `syncPackageFolders` arms the watch (`composeAgentPackageDefinitionFeed`, also before the first read) | Event-driven; nothing re-reads a folder whose event was never delivered | watcher L92-L111, L196-L245; reloader L129-L141, L210-L219, L267-L303 | High |
| BEH-002 | Contract | `buildStudioServer()` → `registerGraphql` → `buildGraphqlSchema()` → `buildSchema` | One build per process in production | A second build corrupts multi-`@Arg` resolvers | `src/api/graphql/schema.ts`, `src/index.ts`; OBS-G1 | High |
| BEH-003 | Operational | Running the test layers of TESTING.md | See OBS-T1…T10 | — | — | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `AgentPackageFolderWatcher.handleEvent` (watcher L196-L207) | maps an event to a definition folder and marks it | `addDir`/`unlinkDir` are the events after which chokidar adds/closes `fs.watch` handles | Where to request the catch-up |
| `PackageFolderChangeSink` (watcher L11-L14), implemented by `AgentPackageDefinitionReloader`; fake sink in `tests/unit/agent-package-definitions/agent-package-folder-watcher.test.ts:32` | Reports to the reloader | A new sink method must not break the fake | Add the method to the type and the fake |
| `reloadBatch` (reloader L267-L303) | Expands a changed package into all known + listed folders, reads each, publishes when something changed **or any package folder was marked** | `markPackageFolderChanged` always announces `agent_packages`; a catch-up must not | Separate quiet set `reconcile` that expands the same way but publishes only real changes |
| `tests/helpers/agent-package-definitions-test-support.ts` | Test support for the reloader | Check it for sink use | — |
| `src/agent-memory/services/agent-memory-explorer-service.ts:49-54` | Default lookup port calls `AgentDefinitionService.getInstance()` through a lazy import; the service takes the port by injection | The ambient getter is only the default factory | Same pattern as `agent-run-history-catalog-service.ts:140`, which the guard already allows |
| `autobyteus-ts/src/llm/llm-factory.ts` `initializeRegistry`, `reloadModels` | Registry is built from `buildSupportedModels()` (no local models); LM Studio/Ollama models arrive through `reloadModels(provider)` | The suite's discovery call is stale | Use `reloadModels(LMSTUDIO)` |
| `autobyteus-web/scripts/electron-e2e/electronE2ELaunchPreparation.mjs` L119-L121 | Runs `pnpm build:electron` (all platforms) when `build !== false`; the probe and `run-electron-e2e.mjs` share it | One fix point | Platform → script mapping |
| `autobyteus-server-ts/src/runtime-management/grok/grok-build-capability.ts` L8-L9, L56-L84 | `PROBE_TIMEOUT_MS = 3_000` per spawned command, timeout → `GROK_CLI_UNSUPPORTED` | The failing run got exactly that value | Parameterize the bound |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: 36 dead test files (`tests/unit/prompt-engineering` 4, `tests/unit/agent-tools/prompt-engineering` 28 incl. `formatters/` and `states/`, `tests/integration/prompt-engineering` 4 incl. `services/`; by `find`: 19 `.ts`, 17 stale `.js`)
- Existing readers, writers, or contracts that consume them: none (they import deleted `src/prompt-engineering/**`; `src/agent-tools/prompt-engineering` does not exist either — `ls src/agent-tools`)
- Evidence paths: `find tests -path "*prompt-engineering*" -type f`

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: the watcher and the reloader (timers); the `PackageFolderChangeSink` type; the `type-graphql` lockfile entry; the Electron harness build mapping
- Existing structural surfaces that can support the approved behavior: the reloader's settle window and `reloadBatch` expansion
- Evidence paths: sources listed above

### Potential Structural Impacts To Investigate

- API or external-contract change: none (GraphQL schema unchanged; rc.4 changes no schema output — to be shown by the schema suites)
- Persistence schema or invariant change: none
- Security or privacy boundary change: none
- Concurrency or lifecycle change: the watcher gains one debounce timer per package entry; the reloader gains a quiet pending set (same single-writer queue)
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: lockfile change for `type-graphql` only
- Confirmed absent, present, or unknown: as stated

## Runtime, Probe, Or Reproduction Findings

| ID | Method / Command | Scenario | Observation | Established (`Reproduced`/`Measured`/`Read`) | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- | --- |
| OBS-W1 | `PROBE_N=80 PROBE_DELAY=0 pnpm -C autobyteus-server-ts exec vitest run <probe> --no-watch --reporter=verbose` | Write agent + Team folder right after `whenReady()` | 40 of 80 runs never reported the Team folder (also 44 of 80 under load) | Reproduced | The watch is not live when chokidar says ready; both existing test sleeps (300 ms, 1 s) hide this | `evidence/probes/SD-watcher-probe.test.ts`, `SD-reproduction-results.txt` |
| OBS-W2 | `node SD-fswatch-lag.mjs` (raw `fs.watch`) | Watch start → first observed write | p50 6 ms, p90 54 ms, max 60 ms | Measured | Lag after arming ≤ ~60 ms (macOS); catch-up delay 300 ms is 5× that | `evidence/probes/SD-fswatch-lag.mjs` |
| OBS-W3 | `PROBE_DELAY=300`, load = 2 × ncpu `yes`, 200 runs | The reported symptom | 6 misses; in each, the agent folder's events arrived within 2–28 ms and no raw event for `agent-teams/squad` ever arrived; both Team folders appeared only when a later folder (3 s later) made the parent report | Reproduced | The event is lost, not late; the watch is live (it reports later events) | `SD-reproduction-results.txt` |
| OBS-W4 | Raw `fs.watch` on two dirs, write 300 ms later, load, 200 runs | Is it chokidar or the OS? | 0 misses | Measured | Plain two-dir watching does not lose it | `SD-fswatch-raw-two-dirs.mjs` |
| OBS-W5 | Raw `fs.watch`: the first folder's event handler adds a watch on that folder (what chokidar does for every new folder); 120 runs each | Is a handle added during activity the trigger? | With a handle added: 4 of 480 missed; control without: 0 of 120 | Measured | Adding a directory watch (a new libuv handle) can drop events of other directories; libuv rebuilds one process-wide FSEvents stream (inferred mechanism) | `SD-fswatch-handle-add-gap.mjs` |
| OBS-W6 | Read of `chokidar/esm/handler.js` | Where does chokidar add handles? | `_handleDir` calls `_watchWithNodeFs` for every new directory after `_handleRead`; `ready` is emitted after the initial directories' watches are installed (so "ready" ≠ stream live) | Read | `addDir`/`unlinkDir` mark the moments of handle churn; also arming | watcher/chokidar sources |
| OBS-G1 | Read `type-graphql@2.0.0-rc.3` `metadata-storage.js` `initCache` (appends each `@Arg` to `paramsCache`'s array on every `build()`; `Object.assign(new MetadataStorage(), getMetadataStorage())` shares the same Map) vs rc.4 tarball (`initCache` begins with `clearMapCaches()`; the generator clones the storage and resets its info maps) | Two builds | rc.4 fixes it; range `^2.0.0-rc.2` admits rc.4 (`npm view`: dist-tag `latest` is rc.3, `next` is rc.4) | Read (library) | Take rc.4; no pin | `/tmp/tg-rc4` diff (not kept); results file |
| OBS-T1 | Ran the SR-011 case | Architecture guard | Fails at `application-framework-boundaries.test.ts:2997`: received list has `autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts`; added by `3e3a7b08cc` (2026-10-17), guard last changed 2026-10-23 | Reproduced | DEC-001 | — |
| OBS-T2 | Read `NotificationCenter.spec.ts` L31-L36 and `stores/updateNotificationsStore.ts` L166-L172 | Ordering | `node()` stamps `Date.now() - 3.6e6` per call; sections sort by newest `foundAt`; a ms tick between two `node()` calls flips the first section | Read (229 reproduced it by editing `foundAt`) | DEC-005 | — |
| OBS-T3 | `evidence/probes/SD-lmstudio-registry-probe.test.ts` | LM Studio suite | After `reinitialize()` 0 LM Studio models; after `reloadModels(LMSTUDIO)` 5; the suite's cases `return` when null, and `shouldSkipOnConnectionError` returns on connection errors | Reproduced | DEC-006 | probe |
| OBS-T4 | Read `electronE2ELaunchPreparation.mjs`, `package.json` L40-L45, `docs/electron_packaging.md` L493-L512 | Harness and doc | Default build is bare `build:electron` (all platforms, Linux host required); doc shows `npx ts-node build/scripts/build.ts`; the real entry is `build/dist/build.js` after `tsc -p build/tsconfig.json` and the guards/`prepare-server`/`generate:electron`/`transpile-electron` steps of the `build:electron*` scripts; `ts-node` is not a dependency of `autobyteus-web` | Read | DEC-007 | — |
| OBS-T5 | Read + 4 loaded runs | Grok probe | 3 s timeout around two real spawns; the failing value equals the timeout result; not reproduced (4/4 passed under 8 × ncpu busy loops, 0.4–0.7 s) | Read; not reproduced | DEC-008; cause established by elimination (non-zero exit and output limit are not load dependent) | — |
| OBS-T6 | 1 run alone, 3 runs under 3 × ncpu busy loops | Extension spec | 1.5 s alone, 3.5 s loaded; three real process spawns; default timeout 5 s | Measured | DEC-008 | — |
| OBS-T7 | `find`, `ls src/agent-tools`, `grep` | Dead tests | 36 files, all importing deleted source,; `vitest.config.ts` L20-L22 excludes only the `.ts` ones; `.js` copies are not collected either | Read | DEC-009 | — |
| OBS-T8 | `npx vue-tsc --noEmit` | Type errors | `TeamStreamingService.spec.ts(199,52)` `segments` on `AIMessage | UserMessage`; `teamRunContextHydrationService.spec.ts(112,44)` `push` on `readonly TaskExecutionDto[]`; `teamExecutionViewState.spec.ts(252,29),(261,29),(275,29)` assigning a read-only `task_executions`; `agentOrgContextsStore.spec.ts(68,64)` tuple `[]` index 0; `agentRunCollaborationStoreClosure.spec.ts(53,46)` `address` on `ActiveAgentWorkspaceTarget` | Measured | DEC-010 | `evidence/SD-vue-tsc-named-spec-errors.txt` |
| OBS-T9 | Read `FileExplorerStreamingService.ts` L96-L121 and L300-L318; the 259 evidence's reproduction (`tickets/done/task-comments/evidence/API-07-pmu-probe/ws-close-while-connecting-repro.mjs`: `closedWhileConnecting: ["error","close 1006"]`) | Intentional close | `disconnect()` closes the socket but leaves `onerror`/`onclose` attached; `onerror` logs `console.error`; the late `onclose` runs `handleClose`, which sets `_state='disconnected'` and `this.ws = null` — it can clobber a newer socket created by `connect(other)` right after `disconnect()` | Read (+ 259's measurement) | DEC-010 | — |
| OBS-T10 | Read the test and 259's note | Drain test | Waits for `getCompactionRecovery()?.state === 'awaiting_user'`, then clears `phases`; the `failed` event may still be in flight (state is retained before `finish({phase:'failed'})` emits) | Read (+ 259's measurement under load) | DEC-008 | — |

- Temporary diagnostics: none left in the product tree. The probes ran from `tests/tmp-probe/` of this worktree, then moved to `evidence/probes/` and removed from the tree. Nothing was committed outside this folder.
- Reproduction for implementation to start from: `evidence/probes/SD-watcher-probe.test.ts` (copy it to `autobyteus-server-ts/tests/tmp-probe/`, then `PROBE_N=80 PROBE_DELAY=0 pnpm -C autobyteus-server-ts exec vitest run tests/tmp-probe/watch-probe.test.ts --no-watch --reporter=verbose`; after the fix its "found" rule must also count the new reconcile request, see design spec); the strong red is the integration test AC-001/AC-015(a) with `sleep(300)` removed (≈ half fail before the fix).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Project Task Manager message | Prove from a clean clone of `personal`; no release; ask the user only if a decision really needs him | Direct | AC-016 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| chokidar | 4.0.3 (lockfile) | Per-directory `fs.watch` on macOS | OBS-W6 | none |
| Node | v22.23.1 | `fs.watch` | OBS-W2 | none |
| `type-graphql` | 2.0.0-rc.3 locked, rc.4 target | OBS-G1 | tarball | prerelease |
| LM Studio | 0.4.26 | native + OpenAI-compatible API | probe | needs the app running |
| `vue-tsc` | 6.0.2 via `npx` | whole-project type check; not a repo script | — | FU-001 |

## Persisted Data And State Facts

- Affected stored or external subject: none (probes and tests use temp folders; the LM Studio run reads LM Studio)
- Location and representative shape: n/a
- Approximate volume: n/a
- Current readers and writers: n/a
- Current unknown/extra-field behavior: n/a
- Required semantics or data that must be preserved: n/a
- Acceptable loss, reset, rebuild, or regeneration: n/a
- Privacy, retention, compliance, downtime, or operational constraints: n/a
- Remaining evidence gap: none

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: n/a
- Requirement / behavior IDs involved: n/a
- Product decision, uncertainty, or experience to understand or evolve: n/a
- Critical journey and states: n/a
- Known constraints and non-goals: n/a
- Relevant existing-product or frontend context supplied or established: n/a
- Product Design request artifact / message reference: n/a
- Established separate design repository/root and ticket reference, when applicable: n/a

## Product Design Findings

N/A — no Product design involved.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/SD-reproduction-results.txt` | Solution Designer | Measured numbers | all | all | Final | Evidence |
| `evidence/probes/SD-watcher-probe.test.ts` | Solution Designer | Watcher reproduction | REQ-002 | AC-002…AC-004 | Final | Evidence |
| `evidence/probes/SD-fswatch-lag.mjs`, `SD-fswatch-raw-two-dirs.mjs`, `SD-fswatch-handle-add-gap.mjs` | Solution Designer | Raw `fs.watch` experiments | REQ-002 | AC-004 | Final | Evidence |
| `evidence/probes/SD-lmstudio-registry-probe.test.ts` | Solution Designer | LM Studio registry | REQ-006 | AC-007 | Final | Evidence |
| `evidence/SD-vue-tsc-named-spec-errors.txt`, `SD-vue-tsc-web-full.log.gz` | Solution Designer | Type errors | REQ-012 | AC-013 | Final | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RISK-001 | Risk | A write that coincides with watch churn caused by another watcher in the process (file explorer, workspace watchers) and has no preceding definition event of its own is not caught | Residual of the event-triggered catch-up | Manual Reload; record in the design; revisit only with evidence | Accepted (DEC-003) |
| UNK-001 | Unknown | The libuv rebuild mechanism is inferred, not read in libuv source | The fix does not depend on the mechanism, only on the measured gap | none | Accepted |
| RISK-002 | Risk | rc.4 is a prerelease (`next`) | A lockfile bump of a shared dependency | Full server GraphQL suites; the clean-clone run | Open |

## Architecture Investigation Findings

- Execution spine of BEH-001: `registered package folder write → chokidar event → AgentPackageFolderWatcher.handleEvent → sink.markFolderChanged → reloader settle timer → reloadBatch → store.apply → change hub frame`; arming: `reloadAllPackages → runFullReload → registrationListener → watcher.syncPackageFolders → arm`.
- Ownership: the watcher owns watch lifecycle and reports "something changed here"; the reloader is the single writer of the store and owns timing and announcements (class doc comments).
- Coupling: the sink is the watcher's only dependency on the reloader.
- Root cause (BEH-001): the product trusts that every OS event arrives; it does not (OBS-W1…W5). The loss windows are the moments watches are armed or added.
- Transition constraints: none (no persisted data).
- Existing unit coverage: `tests/unit/agent-package-definitions/agent-package-folder-watcher.test.ts`, `agent-package-definition-reloader.test.ts`, `unreadable-package-root.test.ts`; integration `package-auto-refresh.integration.test.ts`; E2E `agent-package-definitions-live-refresh.e2e.test.ts`.

## Requirement Implications

OBS-W1…W6 turned the Task's "maybe a test problem" into a product requirement (REQ-002). OBS-G1 answered the "library fix or pin" question (library fix exists). OBS-T1…T10 are test or tooling defects with established causes.

## Notes For Architecture Design

Approved scenarios SCN-001…SCN-003. Keep the single-writer reloader; add the least that closes the measured gap; do not add polling.
