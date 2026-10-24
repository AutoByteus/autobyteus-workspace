# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results go in `api-e2e-execution-coverage-report.md`.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder/tickets/in-progress/imported-app-codex-runtime-folder/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001, Ready; `Small` + `Low`)
- Supplemental Task Artifacts: `evidence/repro-imported-app-codex-launch.e2e.test.ts`, `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-runtime-folder-prepared.log`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: IR-002 after SR-002 (code review CRR-001 C-01, API-REV-001 API-06): no code change; AC-003 narrowed to the folder step on reload (DEC-004); AC-005 clarified (import, then launch with the real `codex`, no reload or repair)
- Prior Investigation Reviewed: round 1 (this file before the Round 2 section)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001: on a catalog change while the server runs (import, reload), each current application's runtime folder is prepared before launch readiness, as at startup.
- AC-001 / REQ-002: import Brief Studio by GraphQL on a running server, Codex signed in (scripted) → ACTIVE, launch settings 200 `RUNNABLE`, drafting team `ATTACHED`, Codex thread starts.
- AC-002 / REQ-003: Codex signed out → `HOST_REQUIREMENT_MISSING` with "Codex authentication is unavailable: no logged-in account." (not a spawn ENOENT).
- AC-003: reload keeps the folder and the application usable (unit order test).
- AC-004: existing transition/lifecycle units and `agent-runtimes-running-agents.e2e` pass.
- AC-005: real app, an imported Codex-default application starts without a restart (API/E2E judgement; user check optional).
- Implementation (code `1d49973440`, validated head `8ab3a2129a`, ticket files only after the code commit): `ApplicationCatalogTransitionService.commitAndRecover` awaits `storageLifecycleService.ensureRuntimeDirectoryPrepared` for each current application after the commits and before snapshot/reconcile/readiness; wired in `build-application-platform-runtime.ts`.
- Legacy / Compatibility Removal Check: clean. Persisted Data Transition Check: `Not Affected` (an empty folder at the path startup creates). Both match the diff.
- Implementation's AC-002 reading (Known Risks): signed out *at import* gives the generic quarantine detail (FU-002, out of scope), so IC-02 signs out after the import. Accepted: REQ-003 is "readiness outcomes other than the missing-folder failure stay unchanged", which IC-02 proves on the readiness surface. The signed-out-at-import journey is covered by the added IR-01 below (state only, not the detail text).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (import → launch), SCN-002 (startup, preserved), SCN-003 (reload).
- Real-use scenarios added:
  - SCN-001b: the user imports while Codex is signed out (a common first-run state), then signs in and repairs the quarantined application (documented: "App-scoped reload/reentry can repair one quarantined application and return it to service without restarting", `autobyteus-server-ts/docs/modules/applications.md:111`; `POST /rest/applications/:id/backend/reload` → `reloadAndReenter`). On base the repair spawns Codex in the still-missing folder again (ENOENT), so the application stays quarantined until a restart.
  - SCN-003 real caller: package reload is sent by the application devkit's studio client (`autobyteus-application-devkit/src/development/studio-application-client.ts`, GraphQL `reloadApplicationPackage`); there is no Settings button for it (`ApplicationPackagesManager.vue` has details and remove only).
- `Technically Possible but Unsupported/Contrived`: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 import → folder before readiness | Changed | handoff trace | IC-01 (reused), AC-005 real app |
| BEH-001 signed-out readiness text | Preserved | IC-02 | IC-02 (reused) |
| BEH-003 reload / repair → same step | Changed | unit order tests | IMP-02 (reused) + IR-01 (new E2E: repair and package reload on the real server) |
| BEH-002 startup order | Preserved | lifecycle untouched | IMP-02, IMP-03 (reused) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | catalog transition sequence | IMP-02, IC-01 | — | — |
| API / transport / contract | No (consumed) | GraphQL import/reload, REST launch settings/repair | IC-01/02, IR-01 | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Indirect | Settings → Applications import, app open | none | the real import UI and app open on a worktree build | Isolated desktop instance |
| Authentication / session / permissions | Indirect | Codex sign-in read in the runtime folder | scripted CLI | the real `codex` binary's `account/read` in the folder | Isolated desktop instance with a throwaway `CODEX_HOME` |
| Desktop renderer / web-equivalent UI | No change | — | — | — | — |
| Desktop shell / Electron-specific integration | Indirect | embedded server data root (`<data>/applications/<app>/runtime`) | E2E with a temp data dir | packaged data-root layout | Isolated desktop instance |
| Process / lifecycle | Yes | no restart between import and use | IC-01 | — | — |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Codex CLI spawn with `cwd` | scripted CLI | real CLI | as above |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder`, branch `fix/imported-app-codex-runtime-folder` @ `8ab3a2129a`
- Stack: pnpm monorepo; Node/TS server; Electron desktop; Brief Studio sample application
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder/TESTING.md` (no closer `TESTING*.md`)
- Conflicts / gaps: none
- Secrets: none needed. AC-005 uses the user's Codex sign-in only through a throwaway `CODEX_HOME` with a symlink to `~/.codex/auth.json` (TESTING.md "Test-only runtime CLI settings"); no inference is sent (below).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global strategy | Server E2E with `env -i PATH HOME=<resolved temp> TMPDIR`; one heavy run at a time; a full product journey on an isolated worktree build (`pnpm --silent isolated-app start --build`); only `CODEX_HOME` passes into an isolated instance; stop what you start |
| `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md` | Isolated instance lifecycle | `start --build` → `instanceId`, `controlPort`, `backendUrl`, `dataRoot`; drive the window over CDP on `controlPort`; `stop <instanceId>` removes the auto-created data root |
| `autobyteus-server-ts/docs/modules/applications.md:111` | Repair contract | App-scoped reload/reentry repairs a quarantined application without restart |
| `applications/brief-studio/backend-src/services/brief-run-launch-service.ts` | Draft launch | `launchDraftRun` sends a launch text to the Codex team, i.e. real inference on a real Codex |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server E2E | worktree root | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch` | Test-owned server, data dir, scripted CLIs | vitest | Test teardown |
| Isolated desktop instance | worktree root | `CODEX_HOME=<temp> pnpm --silent isolated-app start --build` | Several-minute build; own ports and data root; user's AutoByteus untouched | `start` JSON `ok: true` | `pnpm --silent isolated-app stop <instanceId>`; `list` shows none of mine |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Brief Studio importable package | `applications/brief-studio/dist/importable-package` (built by `test:integration:prepare`) | Read-only source | Untracked build output |
| Codex sign-in for AC-005 | Throwaway `CODEX_HOME` (`config.toml` empty, `auth.json` symlink) | The user's `~/.codex/config.toml` (which defines MCP servers) is not used; nothing written to `~/.codex` | Remove the temp folder |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` IC-01 | import → RUNNABLE → ATTACHED → thread start | AC-001, REQ-002 | Still Valid | IMP-00 fails on base, IMP-01 passes | Keep |
| same, IC-02 | signed out after import → `HOST_REQUIREMENT_MISSING` with today's text; signed in → RUNNABLE | AC-002, REQ-003 | Still Valid (reading accepted above) | IMP-01 | Keep |
| `tests/unit/application-orchestration/application-catalog-transition-service.test.ts` (2 new order tests) | folder step after commits, before readiness; reload | AC-003 | Still Valid | IMP-02 | Keep |
| `…/application-execution-event-journal-recovery.test.ts` | real storage service passed | AC-004 | Still Valid | IMP-02 | Keep |
| `tests/unit/application-platform/application-platform-lifecycle.test.ts`, `…-runtime-isolation.test.ts` | startup order, assembly | AC-004, BEH-002 | Still Valid | IMP-02 | Keep |
| `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | startup-imported Brief Studio runs | AC-004 | Still Valid | IMP-03 | Keep |
| `tests/architecture/application-framework-boundaries.test.ts` | source guards | AC-004 | Still Valid; 1 of 20 red on base for an unrelated file (FU-001) | IMP-05 | Keep; verify the cause (API-05) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, REQ-001…003 | real server import → readiness → launch | Reused | IMP-01 (and IMP-00 for discrimination) | Ran on `1d49973440`; only ticket files changed since; header and `Tests  2 passed (2)` present |
| API-02 | AC-003, AC-004 | transition order, lifecycle, assembly | Reused | IMP-02 | same; `Tests  20 passed (20)` |
| API-03 | AC-004 | startup-imported app runs | Reused | IMP-03 | same; `Tests  4 passed (4)` |
| API-04 | AC-004 | server typecheck | Reused | IMP-04 | same; `exit=0` |
| API-05 | AC-004 (guard) | architecture guard failure cause | Reused + check | IMP-05; confirm with `git log -S "AgentDefinitionService.getInstance" -- autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts` and that this ticket touches neither file | TESTING Rule 9: a failure needs its cause |
| API-06 | — (round 2: FU-003 evidence, not a case of this ticket) | real server: package reload and repair of an ACTIVE Brief Studio | Temporary Probe + reproduction (evidence) | as round 1; no rerun | SR-002: the reload/repair quarantine is pre-existing reentry defect C-01, follow-up FU-003; its evidence stays in `evidence/API-06-*` |
| API-07 | AC-005, REQ-001 | isolated desktop instance of this worktree, real `codex` | Journey | `CODEX_HOME=<throwaway> pnpm --silent isolated-app start --build`; in the window: Settings → Application packages → import `applications/brief-studio/dist/importable-package` by path; without a restart: Brief Studio listed, launch settings 200 `RUNNABLE` (real `codex` `account/read` in the runtime folder), runtime folder present under the instance data root, open the app (backend `ensure-ready`), launch a draft run from the app (its Codex drafting team) and confirm the Codex threads start in the runtime folder; then terminate the team run at once. No reload or repair (SR-002) | The real packaged server, real CLI, real import UI and the app's own launch |

- AC-005's draft launch on a real Codex (round 2, SR-002 clarification): run, and the team run is terminated as soon as its Codex threads have started, so it spends only the start of the coordinator's first turn. The runtime folder is also the working directory of the application's runs (DEC-001), so the launch proves it on the real CLI as well.
- Test progress log needed: `Yes`

## Durable Coverage To Add

None this round. The planned `application-import-signed-out-recovery.e2e.test.ts` (API-06) found that its recovery steps fail on base and on the fix for a reason outside the runtime folder (see "Execution findings" below). A test asserting that recovery cannot go into the suite red. It is kept as `evidence/API-06-draft-signed-out-recovery.e2e.test.ts`, with `evidence/API-06-repro-reload-reentry.e2e.test.ts` as the focused reproduction, until the failure-origin decision.

## Execution findings that changed the plan (round 1)

- Package reload (GraphQL `reloadApplicationPackage`) and the app-scoped repair (`POST /rest/applications/:id/backend/reload`) of an ACTIVE Brief Studio leave it QUARANTINED: "Application '<id>' is currently reentering. Please retry after repair/reload completes." Measured identically on base sources and on the fix, with Brief Studio loaded at startup (so its runtime folder exists either way). Cause, measured with a temporary stack diagnostic: during reentry `recoverParticipants` runs `engineLauncher.ensureReady`; the started worker calls the host's `listRunBindings` → `requireApplicationActive` refuses (REENTERING) → the error quarantines the application.
- Consequence for AC-003 (observable outcome "the application stays usable" after reload): not met end to end, for this pre-existing reason. The ticket's own step (folder before readiness on reload) is proven by the unit order test only.
- Consequence for SCN-001b (signed-out import, then sign in): the repair hits the same refusal; the package reload keeps the prior quarantine by policy (`recoverPreviouslyInactive` not set for package transitions). A restart is still needed in that case.
- API-07 (AC-005 desktop journey) deferred to the next round: a rework of the reentry path would change the import path's `recoverParticipants` too, and the journey includes a reload.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Shell: Electron with the embedded server
- Guideline: `TESTING.md` ("A full real-product journey a user would perform → an isolated desktop instance of a worktree build"), `docs/isolated-app-instances.md`
- Web-equivalent behavior: none changed
- Shell-specific: the packaged server's data-root layout and real CLI spawn
- Approach: `pnpm --silent isolated-app start --build` with `CODEX_HOME` set; drive the window over CDP (`controlPort`) with playwright-core `connectOverCDP`; read GraphQL/REST on the reported `backendUrl`
- Running app: the user's AutoByteus (`/Applications/AutoByteus.app`, port 29695, `~/.autobyteus`) is not touched; the instance has its own ports and data root

## Live Environment And Fixture Plan

- Order: API-06 (fix, then base) → API-07 (build, start, journey, stop)
- Evidence: test logs, instance start/stop JSON, DOM assertions and screenshots, GraphQL/REST responses, the runtime folder listing, the instance log excerpt
- Cleanup: `isolated-app stop`, `list`, remove the temp `CODEX_HOME`; base revert restored and `git diff` checked

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Draft launch on a real Codex in the real app | Real inference on the user's account; the launch path is proven with the scripted CLI | Low | Yes (optional, AC-005) | Delivery offers it to the user |
| A folder-creation failure during the transition (rollback) | Infrastructure failure; not a supported scenario to provoke; matches startup | Low | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| None | — | — | — |

## Round 2 (SR-002 / IR-002)

- No code change since `1d49973440` (`git diff --name-only 1d49973440 2ddfc07e51 -- autobyteus-server-ts autobyteus-web applications` is empty): API-01…05 stay valid.
- AC-003 (narrowed): proven by API-02 (the transition order unit tests: the reloaded application's runtime folder prepared after the commits and before readiness).
- API-06: kept as FU-003 evidence only.
- API-07: run this round.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `No` this round (see Execution findings)
- Reroute Required Before Validation Execution: `No`
- Notes: design escalation trigger: readiness still failing after the folder exists → `Design Impact`.
