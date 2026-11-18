# Requirements Document — test-and-tooling-hygiene (autobyteus-253)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `test-and-tooling-hygiene`
- Request / ticket: Project Task `autobyteus-253` ("Test and tooling hygiene found by autobyteus-229, 191 and 209"), with the comments added from 278, 280, 282, 210 and 259
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-24
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user in the `autobyteus-253` conversation, 2026-10-24 ("Requirements approved within the Task's direction"), which lists the decisions DEC-001…DEC-010 below
- Exact approved requirements baseline / solution revision: this file at `SR-001`
- Behavior-defining supplements and their approved versions: none (all reproduction evidence is in `investigation-notes.md` and `evidence/`)

## Problem And Desired Outcome

- Problem: Finished tickets left 13 test and tooling defects. Some are test defects (timing, early `return`, dead tests, type errors, an out-of-date allow-list), some are tooling defects (a build step that fails on macOS, stale docs, a library that corrupts GraphQL arguments when the schema is built twice), and one is a real product race (the agent package folder watcher can miss a new Team folder). TESTING.md Rule 9 applies: each item is fixed after its cause is found, or shown not to be a defect with the reason; none is closed as "flaky".
- Affected actors or systems: the server's agent package folder watcher and its definition reloader (the only product code change), the server and web test suites, `autobyteus-ts` LM Studio live suite, the packaged Electron harness scripts, `autobyteus-web` docs, the `type-graphql` dependency.
- Desired outcome: every item is fixed or explained; the server unit, integration and typecheck suites, the web suites and the Electron suite pass on a clean clone of `origin/personal` with this ticket merged; no item is waved off as pre-existing.
- Observable definition of success: the acceptance criteria below pass, shown from a clean clone (not a worktree) of the finalized `personal` (lesson of autobyteus-282).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | A new definition folder written under a registered package folder can go unnoticed: macOS directory watches start up to ~60 ms after chokidar reports ready, and adding a watch for a new folder rebuilds libuv's process-wide FSEvents stream, which drops events in that gap (reproduced, 4 of 480 raw, 6 of 200 through chokidar under load; ~50% right after ready). The reloader is never told, so the agent is listed and the Team is not until another change arrives | After a package folder is armed, and after any definition folder is added or removed in it, the watcher asks the reloader to re-read that package once things are quiet. A folder missed by the OS events is then listed within the existing 5 s bound, with no Reload and no extra "package changed" notification when nothing changed | Event-driven reload and the 1 s settle window; change frames only for real changes; `FOLDER_MISSING` / `UNAVAILABLE` handling; skills and non-definition files stay unwatched (AC-007 of the auto-refresh ticket); no startup wait for watcher readiness | `investigation-notes.md` OBS-W1…W6; `evidence/SD-reproduction-results.txt` |
| BEH-002 | Contract | SCN-002 | Two `buildSchema()` calls in one process shift multi-argument resolver arguments (`type-graphql` 2.0.0-rc.3 `initCache` appends params each build) | Building the schema twice gives each resolver its own arguments | Production builds once per process | `investigation-notes.md` OBS-G1 |
| BEH-003 | Operational | SCN-003 | Test cases and harness steps that cannot give a trustworthy result (early `return`, timing, 5 s default timeouts, fixed sleeps, wrong build flag, stale doc commands, dead tests, allow-list drift, type errors, an error log on an intentional close) | Each gives a deterministic, visible result: pass for the right reason, a visible skip with a reason, or a failure that names the cause | What each test asserts (no weakened assertion); the product behavior the tests guard | `investigation-notes.md` OBS-T1…T11 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Engineers and agents running the suites | Trust a red or green result | No flaky or silently passing case among the 13 items | TESTING.md Rule 9: cause first |
| A user or tool that writes agent package folders | Definitions appear without Reload | A missed folder is picked up within 5 s | No change to what the user sees when nothing is missed |
| Release / delivery | Build and test the host package | The packaged harness builds the host package; docs name real commands | None |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A new or removed definition folder in a registered package folder is detected without Reload, even when the OS drops the event | SCN-001 |
| UC-002 | A test process builds the GraphQL schema more than once | SCN-002 |
| UC-003 | Tests and harness steps of items W-01, W-04…W-13 give deterministic results | SCN-003 |

### Out Of Scope

- `autobyteus-220` (project-task-index timing test, FU-011 of 229): done there; not duplicated.
- A periodic or on-demand full rescan of package folders; any other watcher feature.
- Loss of OS file events caused by other components of the process adding watches at the same instant as a definition write (the manual Reload remains the recovery; see DEC-003).
- Fixing the other ~885 `vue-tsc` errors of `autobyteus-web` (128 spec files and source files) and adding a web type-check gate: follow-up FU-001.
- The gated E2E `delegated-launch-config-defaults.e2e.test.ts` (FU-003 of task-comments / 259): not named in this Task; follow-up FU-002.
- Re-running paid or live suites beyond the one LM Studio suite named in W-05; any release.

### Non-Goals

- Making the OS event stream lossless. The design accepts that events can be lost and makes the loss harmless.
- Changing production behavior other than the watcher catch-up (and the `type-graphql` patch update, which changes no behavior of a single build).

### Preserved Behavior Boundary

BEH-001 preserved column; the auto-refresh ticket's acceptance criteria stay as tested by `package-auto-refresh.integration.test.ts` and `agent-package-definitions-live-refresh.e2e.test.ts`. Assertions of every touched test keep their meaning.

### Prerequisites

None. (Checked: none of the 13 items blocks another; W-03's library fix exists upstream in range.)

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | W-01. `tests/architecture/application-framework-boundaries.test.ts` case "guards the exact SR-011 host definition and public/general run authority" passes on `personal`, and still fails if a file outside the decided list calls `AgentDefinitionService.getInstance()` / `AgentTeamDefinitionService.getInstance()` | BEH-003 | High (red on `personal`) | Cause: `3e3a7b08cc` added a caller (`agent-memory-explorer-service.ts`) without the guard's list | DEC-001 |
| REQ-002 | W-02. A definition folder (agent, Team or Org) added to or removed from a registered package folder, or written right after a watch is armed, is listed by the next read within 5 s without Reload, also when the OS drops its event; nothing is announced when the re-read changes nothing | BEH-001 | High (real product race) | Reproduced loss of OS events | DEC-002, DEC-003 |
| REQ-003 | W-02. The auto-refresh integration and live-refresh E2E tests wait on the product's own behavior (the 5 s bound on the listing), not on fixed sleeps that "let the watch start" | BEH-001 | High | The sleeps hid the race | DEC-002 |
| REQ-004 | W-03. Building the GraphQL schema twice in one process does not change any resolver's arguments, and the test workaround that builds it once is removed | BEH-002 | Medium | rc.4 fixes `initCache`; no pin needed | DEC-004 |
| REQ-005 | W-04. `NotificationCenter.spec.ts` does not depend on the clock: the notifications carry fixed, distinct `foundAt` values that state the intended order | BEH-003 | Medium | Cause: `Date.now()` per call | DEC-005 |
| REQ-006 | W-05. Every LM Studio case that cannot run (no LM Studio, no model) is a visible skip with its reason; the cases that can run call LM Studio; a failure after the preflight passed fails the case (no `return` on a connection error) | BEH-003 | Medium | Cause: `LLMFactory.reinitialize()` no longer discovers local models; `reloadModels(LMSTUDIO)` does | DEC-006 |
| REQ-007 | W-06. `pnpm -C autobyteus-web test:e2e:electron` and `test:e2e:electron:isolation` build the package of the host platform by default (`build:electron:mac`, `:linux`, `:windows`), as README says | BEH-003 | Medium | Cause: bare `build:electron` means all platforms and needs Linux | DEC-007 |
| REQ-008 | W-07. `autobyteus-web/docs/electron_packaging.md` "Build Commands" lists the real `pnpm build:electron*` scripts and the macOS note | BEH-003 | Low | Stale `npx ts-node` | DEC-007 |
| REQ-009 | W-08. The Grok Build capability case AC-001 (and its siblings) does not depend on machine load | BEH-003 | Medium | Cause: fixed 3 s probe timeout around real process spawns | DEC-008 |
| REQ-010 | W-09. `managedExtensionService.spec.ts` does not time out under full-suite load | BEH-003 | Medium | Cause: three real process spawns against the 5 s default | DEC-008 |
| REQ-011 | W-10. The dead `prompt-engineering` tests (36 files, 19 `.ts` and 17 stale `.js`) and the three `vitest.config.ts` exclusions are deleted, and the module doc no longer describes deleted code | BEH-003 | Low | Principle 7 (tests for code that no longer exists) | DEC-009 |
| REQ-012 | W-11. The five named web spec files (7 `vue-tsc` errors) type-check without changing what they assert | BEH-003 | Low | Typing drift | DEC-010 |
| REQ-013 | W-12. `FileExplorerStreamingService.disconnect()` of a still-connecting socket logs no WebSocket error and cannot let the old socket's late events change the new connection's state | BEH-003 | Medium | Cause: handlers stay attached after the app's own close | DEC-010 |
| REQ-014 | W-13. `native-compaction-terminal-drain.test.ts` waits for the first attempt's `failed` event before clearing, and holds under load | BEH-003 | Medium | Cause: waits for state, not for the event | DEC-008 |
| REQ-015 | W-14. FU-011 of 229 is not worked here; the Task states where it is done (`autobyteus-220`) | BEH-003 | Low | Task direction | Task text |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-003 / SCN-003 | Run the architecture test on the merged tree | The case passes; a fixture or temporary extra `getInstance()` caller in a file not on the list makes it fail | — | `vitest run tests/architecture/application-framework-boundaries.test.ts` |
| AC-002 | REQ-002 | BEH-001 / SCN-001 | Watcher with a fake watch factory: ready, or an `addDir`/`unlinkDir` event | Exactly one `reconcilePackageFolder(root)` per quiet period, ≥ the catch-up delay after the last event; none after `close()`, `FOLDER_MISSING`, `UNAVAILABLE` or a re-arm; file events cause none | A kind-folder event keeps its existing `markPackageFolderChanged` | New watcher unit tests with a fake clock |
| AC-003 | REQ-002 | BEH-001 / SCN-001 | Reloader: a definition folder exists on disk, the store does not know it, nothing marked it; `reconcilePackageFolder(root)` is called | After the settle window the folder is loaded; lists are announced only when something changed; an unchanged package announces nothing; a missing package keeps last-loaded definitions | — | New reloader unit tests |
| AC-004 | REQ-002, REQ-003 | BEH-001 / SCN-001 | `package-auto-refresh.integration.test.ts` AC-001/AC-015(a) with the post-ready `sleep(300)` removed; live-refresh E2E DCF-E2E-002 with the post-import `sleep(1000)` removed | Both pass; each passes 40 of 40 consecutive runs under load (2 x ncpu busy loops); before the fix the integration case fails in about half of runs (reproduction) | A real failure still fails with the 5 s bound message | Loop run with load; the loop command goes in the validation report |
| AC-005 | REQ-004 | BEH-002 / SCN-002 | A test builds the studio server twice in one process and calls `clearUpdateNotification(kind, sourceId)` on the second | The resolver receives `kind` and `sourceId` correctly; the memoizing mock of `buildGraphqlSchema` in `update-notifications-live.e2e.test.ts` is gone and that file passes | — | New or adapted unit test of two builds; the E2E file |
| AC-006 | REQ-005 | BEH-003 / SCN-003 | `NotificationCenter.spec.ts` | Passes 20 of 20 runs; no `Date.now()` / `new Date()` clock reads remain in its notification fixtures for ordering; the first case states the order through two distinct fixed `foundAt` values | — | Run 20 times; read |
| AC-007 | REQ-006 | BEH-003 / SCN-003 | LM Studio suite with LM Studio reachable and a model; and with `LMSTUDIO_HOSTS` pointing at a closed port | Reachable: every case calls LM Studio (durations of seconds, not 1–50 ms), using `LMSTUDIO_TARGET_TEXT_MODEL` when set. Unreachable: every case is reported as skipped with the reason, none as passed | A connection error after a successful preflight fails the case | Run once live (one local model at a time, TESTING.md), once against a closed port |
| AC-008 | REQ-007 | BEH-003 / SCN-003 | `prepareElectronE2ELaunch` default build | Runs `build:electron:<host platform>`; unit-tested for darwin, linux, win32; `--skip-build` unchanged; on macOS `pnpm -C autobyteus-web test:e2e:electron --adapter direct` builds and runs (or the exact blocker is recorded) | — | Node test of the pure mapping; one real run on macOS |
| AC-009 | REQ-008 | BEH-003 / SCN-003 | Read `electron_packaging.md` | Every command in "Build Commands" exists in `autobyteus-web/package.json`; no `ts-node` command remains in the doc | — | grep of each command against `package.json` |
| AC-010 | REQ-009 | BEH-003 / SCN-003 | Grok capability test file | Passes alone and 20 of 20 under load; a hanging CLI still ends in the existing diagnostic | — | New test passes a short timeout to prove the diagnostic; the cases pass a long one |
| AC-011 | REQ-010 | BEH-003 / SCN-003 | `managedExtensionService.spec.ts` under load (3 x ncpu busy loops) and in the full `test:electron` run | Passes every time | — | 5 loop runs under load; full run |
| AC-012 | REQ-011 | BEH-003 / SCN-003 | Search | No file under `tests/**/prompt-engineering/**`; no `prompt-engineering` entry in `vitest.config.ts`; `docs/modules/prompt_engineering.md` names only code that exists; full unit run count drops only by the deleted files | — | `find`, `grep`, unit run |
| AC-013 | REQ-012 | BEH-003 / SCN-003 | `npx vue-tsc --noEmit` in `autobyteus-web` | No error in the five named files; the same five files' tests pass with the same number of assertions | — | vue-tsc filter; web tests of those files |
| AC-014 | REQ-013 | BEH-003 / SCN-003 | Unit test with a fake socket that is still CONNECTING when `disconnect()` runs | No `console.error`; after `disconnect()` then `connect(other)` the old socket's late `close` leaves the new connection's state alone | — | New unit cases in `FileExplorerStreamingService.spec.ts` |
| AC-015 | REQ-014 | BEH-003 / SCN-003 | The drain test alone, and 10 times alongside a heavy suite | Passes every time | — | Loop run |
| AC-016 | REQ-001…REQ-014 | all | Clean clone of the finalized `origin/personal` (not a worktree): install, prepare, then run | Server typecheck, `test:unit`, `test:integration`, the web `test:nuxt`, `test:electron` and the guards pass; every item's own check above passes there | Any failure is root-caused (Rule 9) | The validation report lists commands and results |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | A user or the Agent Package Creator's file tools writing agent package folders; the studio server | New or removed definition folders show up without Reload (auto-refresh ticket REQ-009/AC-001) | Files written under `agents/`, `agent-teams/`, `agent-orgs/` of a registered package folder, in quick succession; an import followed at once by writes | Package folder registered and watched | Agent folder written; Team folder written within milliseconds; (or) a package imported and written at once | Both listed within 5 s; the feed announces them | OS drops an event: the quiet-period re-read lists them; watcher `UNAVAILABLE`: manual Reload (unchanged) | Supported Normal Scenario | The Creator writes agent then Team folders in a row; the live-refresh E2E imports a package and writes at once; reproduced (SD results) | REQ-002, REQ-003, AC-002…AC-004 |
| SCN-002 | Contract | A test starting the studio server twice in one process | Each build serves correct resolvers | `buildStudioServer()` / `buildGraphqlSchema()` called again | Schema built once already | Second build; mutation `clearUpdateNotification(kind, sourceId)` | Arguments arrive in order | — | Supported Explicit Edge Scenario (test harness only; production builds once) | The Task text; reproduction in OBS-G1 | REQ-004, AC-005 |
| SCN-003 | Operational | Engineers and agents running suites and harness scripts | A red or green result means what it says | `pnpm` test and harness commands in TESTING.md | A clean checkout of `personal` | Run each command | Deterministic pass, fail with cause, or visible skip | — | Supported Normal Scenario | TESTING.md Rule 9 | REQ-001, REQ-005…REQ-015 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: none (no visible UI change; the NotificationCenter change is test-only)
- Product decisions that need the user: none

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, AC-004 | Reliability | A missed folder is listed within 5 s of the write (catch-up delay ≤ 300 ms + the 1 s settle window + one read) | macOS, load of 2 x ncpu busy loops | 40-run loop |
| QR-002 | REQ-002, AC-003 | Operability | No change frame and no extra reload work for an unchanged package; one re-read per quiet period | Bursts such as 25 new agent folders | Existing AC-006 burst test (≤ 3 frames) stays green |
| QR-003 | REQ-004 | Compatibility | `type-graphql` stays inside its `^2.0.0-rc.x` range; production behavior of one build unchanged | Server GraphQL suites | `pnpm install --frozen-lockfile`; GraphQL unit and E2E suites |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: n/a
- Loss, reset, rebuild, or regeneration that is acceptable: n/a
- Retention, privacy, compliance, volume, downtime, or operational constraints: probes and tests use test-owned temp folders; the LM Studio run uses the local LM Studio read-only and unloads any model it loaded
- Unknowns requiring downstream investigation: none

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Node `fs.watch` on macOS (libuv FSEvents) via chokidar 4.0.3 | Delivers directory events, not losslessly while watches are added or just after they start | OBS-W1…W6 (measured; the libuv stream rebuild is inferred from the control experiment and libuv's design, not read in its source) | The exact libuv mechanism is inferred; the measured behavior is what the design relies on |
| `type-graphql` 2.0.0-rc.4 | `initCache` clears its map caches before rebuilding | Package tarball read and diffed against rc.3 | A prerelease; changes between rc.3 and rc.4 are limited to `metadata-storage` and `schema-generator` (diff) |
| LM Studio (local, v0.4.26) | `/api/v1/models`, `/v1/models` | Probe | Needs LM Studio running; skip otherwise |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/SD-reproduction-results.txt` | Measured results | all | Final | Evidence; no approval needed |
| `evidence/probes/*` | Reproductions to start from (see investigation notes) | REQ-002, REQ-006 | Final | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The developer machine's behavior (macOS arm64) represents the macOS CI/users; Linux inotify has no such gap and the catch-up is harmless there | The race is macOS-specific | Implementation runs the loops on macOS; the unit tests are platform-neutral | Open |
| ASM-002 | `type-graphql` rc.4 is a drop-in for rc.3 for our schema | Needed for DEC-004 | Server GraphQL suites + schema tests | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Fix the architecture test or the code it guards (`agent-memory-explorer-service.ts`)? | Test red on `personal` | (a) add the file to the allow-list with a reason; (b) make the service read through the file provider | The service already takes an injectable port (`agentDefinitions`) and only its default factory calls the cached `AgentDefinitionService`, like `agent-run-history-catalog-service.ts` (already allowed). The guard forbids ambient reads in migrations and the cache preloader, not here. The Memory page needs the cached service's current name view. (a) is the smallest change that keeps the guard exact | Solution Designer | Decided: (a) |
| DEC-002 | Fix the watcher, or only the tests? | The race is real | Test-only (wait longer) hides a product loss; a watcher fix removes it | The Task allows both; the evidence shows a product loss (events never delivered), so the watcher gets a catch-up and the tests lose their sleeps | Solution Designer | Decided |
| DEC-003 | Which catch-up: periodic rescan, or event-triggered re-read? | Cost vs coverage | Periodic polling adds standing I/O for a ~1% race; event-triggered re-read after "arm" and after a folder is added/removed targets exactly the moments when watches change (the proven loss window) | Start simple (DESIGN.md, Principle 1): event-triggered, one re-read per quiet period (300 ms), through the existing reloader. Loss by another component's watch churn alone is accepted; Reload remains | Solution Designer | Decided |
| DEC-004 | Library fix, pin, or harness workaround for the double schema build? | Test isolation | rc.4 fixes it upstream (`initCache` → `clearMapCaches()`), in the existing `^2.0.0-rc.2` range; a harness-only memoizer works only per test file and hides the defect | Update the lockfile to rc.4 and tighten the range to `^2.0.0-rc.4`; remove the memoizing mock. No pin needed. Server suites rerun in full anyway | Solution Designer | Decided |
| DEC-005 | How to make NotificationCenter deterministic? | Flake | Fake timers vs fixed fixture timestamps | The order is data (`foundAt` strings), not time passing: fixed distinct values state the intent | Solution Designer | Decided |
| DEC-006 | LM Studio: run or skip? | False confidence | Cause is a stale discovery call (`reinitialize()`); fix it so cases run when LM Studio exists, and skip visibly when not | Preflight in `beforeAll`; `reloadModels(LMSTUDIO)` for discovery; `ctx.skip(reason)`; remove `return` on connection error. Model per TESTING.md (`LMSTUDIO_TARGET_TEXT_MODEL`) | Solution Designer | Decided |
| DEC-007 | Electron harness build: which script? | macOS failure | Pass a platform flag vs call the platform script | Call `build:electron:mac|linux|windows` by `process.platform` (the documented scripts, including the guards and `prepare-server`); the doc lists the same | Solution Designer | Decided |
| DEC-008 | Load-dependent cases: fake the timing or give an explicit bound? | Determinism | Real spawns are the point of these cases; faking them removes their value | Explicit, generous bounds (30 s) where real process spawns are the subject (Grok probe parameter, extension spec); wait for the event, not the state, in the drain test | Solution Designer | Decided |
| DEC-009 | Delete the dead tests and also fix the stale module doc? | Principle 7 | Tests only vs tests + doc | Delete the 36 files and 3 exclusions; fix `prompt_engineering.md` lines that name deleted source (touched-file dead-code rule: the doc describes deleted code) | Solution Designer | Decided |
| DEC-010 | Scope of the `vue-tsc` and streaming fixes | Boundary | Whole web type-check vs the named files | Only the five named files (7 errors); the other 885 errors become FU-001. For the file-explorer socket, detach the socket's handlers before closing (the task's own suggestion) | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-003 | BEH-003 | AC-001, AC-016 | SCN-003 | OBS-T1 |
| REQ-002 | UC-001 | BEH-001 | AC-002, AC-003, AC-004, AC-016 | SCN-001 | OBS-W1…W6, evidence/probes |
| REQ-003 | UC-001 | BEH-001 | AC-004 | SCN-001 | OBS-W1 |
| REQ-004 | UC-002 | BEH-002 | AC-005 | SCN-002 | OBS-G1 |
| REQ-005 | UC-003 | BEH-003 | AC-006 | SCN-003 | OBS-T2 |
| REQ-006 | UC-003 | BEH-003 | AC-007 | SCN-003 | OBS-T3, evidence/probes |
| REQ-007 | UC-003 | BEH-003 | AC-008 | SCN-003 | OBS-T4 |
| REQ-008 | UC-003 | BEH-003 | AC-009 | SCN-003 | OBS-T4 |
| REQ-009 | UC-003 | BEH-003 | AC-010 | SCN-003 | OBS-T5 |
| REQ-010 | UC-003 | BEH-003 | AC-011 | SCN-003 | OBS-T6 |
| REQ-011 | UC-003 | BEH-003 | AC-012 | SCN-003 | OBS-T7 |
| REQ-012 | UC-003 | BEH-003 | AC-013 | SCN-003 | OBS-T8 |
| REQ-013 | UC-003 | BEH-003 | AC-014 | SCN-003 | OBS-T9 |
| REQ-014 | UC-003 | BEH-003 | AC-015 | SCN-003 | OBS-T10 |
| REQ-015 | UC-003 | BEH-003 | — | SCN-003 | Task text |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001 (watcher), SCN-002, SCN-003.
- Product and system constraints architecture must preserve: BEH-001 preserved column.
- Decisions intentionally deferred to architecture design: the exact seam for the catch-up delay and the reloader's quiet re-read.
- Technical facts architecture should verify: the reloader's publish rule for `markPackageFolderChanged`; the sink's other implementers; rc.4's `schema-generator` change.
- Known feasibility or integration risks: the loops under load take minutes; the libuv mechanism is inferred.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes` (Solution Designer within the direction, user informed in the conversation, 2026-10-24)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
