# API/E2E Coverage Investigation — followup-cleanups-568 (autobyteus-568): five follow-up cleanups

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (Medium / Low; D-1…D-5)
- Supplemental Task Artifacts: none
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: the implementation engineer's handoff (direct route), HEAD `52e75f2357` (code `eb7e4bf2af`; `52e75f2357` adds documents only)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Five cleanups from earlier tickets' follow-ups:
- **D-1 (REQ-001, AC-001):** the web's three dead GraphQL documents (`RestoreAgentRun`, `ApproveToolInvocation`, `GetAgentRunCollaborationMemberProjection`) are removed, with their generated types and their three demo "unused" entries. The server's `approveToolInvocation` mutation goes too, with its input/result types, its unit case and the logger methods only it used. Tool approval over the WebSocket is unchanged.
- **D-2 (REQ-002, AC-002):** the port-inspector deadline test's fake `lsof` is a `/bin/sh` child that writes its pid and then runs `exec /bin/sleep 5`.
- **D-3 (REQ-003, AC-003):** `SavedNodeEntryKeysMigrationTests` resolves symlinks on both sides of the path comparison.
- **D-4 (REQ-004, AC-004):** the Basics panel spec stubs and asserts `ShowInternalAgentsCard` and `UpdateChecksCard`.
- **D-5 (REQ-005, AC-005):** `autobyteus-ios/scripts/select-ios-simulator.py` chooses the simulator for the workflow and the smoke script: the exact name on the newest runtime not above the simulator SDK, else the first iPhone with a notice, else a failure. The contract check guards the wiring and runs the chooser against fixtures.

Out of scope: the server's `restoreAgentRun` and `agentRunCollaborationMemberProjection` fields (FU-001), the two web probes that still count the projection document (FU-002), and the screenshot-capture timing test (FU-003).

## Supported Scenarios And Real Usage

- Designer scenarios covered:
  - SCN-001: the suites are green for product reasons only.
  - SCN-002: the named simulator on the newest runtime, in the release run and the local smoke.
  - SCN-003: a client calling the GraphQL API; WebSocket approval unchanged.
- Real-use scenarios added:
  - SCN-A1: the release jobs build from a fresh clone. `autobyteus-web/generated/**`, `.github/workflows/**` and `*/scripts/**` are build inputs, so the Docker builder stage, the desktop build (`pnpm typecheck` over the regenerated types) and the iOS job are each built from a fresh clone.
  - SCN-A2: a developer runs the smoke on a Mac with several simulators: it must pick the named device exactly, never a longer name that contains it.
  - SCN-A3: an older client still sends the removed mutation; the built server answers with a GraphQL validation error and serves the rest of the schema.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 dead GraphQL (web documents, server mutation) | Removed | REQ-001, D-1 | codegen check, typechecks, demo check (reused); the built server's schema (live); WebSocket approval through a real server (E2E) |
| BEH-002 deadline test child | Changed (test) | REQ-002, D-2 | repeated runs under load |
| BEH-003 migration-boundary test paths | Changed (test) | REQ-003, D-3 | the core tests from a `/tmp` checkout |
| BEH-004 Basics spec | Changed (test) | REQ-004, D-4 | the spec |
| BEH-005 simulator choice | Changed | REQ-005, D-5 | the contract check's fixtures (reused); the chooser on this Mac's real `simctl`; the local smoke; the GitHub run |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes | the server's GraphQL schema (one mutation removed); the web's generated types | IMP-01…04 | the built server's schema; WebSocket approval through a real server | a built server; `autobyteus-native-tool-search.e2e` |
| Frontend component / state | No (test only) | — | IMP-06 | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No (a test only) | the deadline test | IMP-07 | — | repeated runs |
| Process / lifecycle | Yes | the CI job's simulator choice; the smoke script | IMP-05, IMP-10 | a real `simctl` with many devices and runtimes | the chooser and smoke on this Mac |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | GitHub's `xcode-27` image | IMP-10 | — | read the run |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/followup-cleanups-568`, branch `codex/followup-cleanups-568` (pushed by the implementation engineer)
- Project type and runtime stack: pnpm monorepo (Node 22 server, Nuxt web, Electron), iOS wrapper (Swift, XcodeGen), GitHub Actions
- Project testing guideline path(s): `TESTING.md` (root: the layers table, Fresh-start build, Environments, Test vault); `autobyteus-ios/README.md`; `RELEASE.md` (build-only run); `DESIGN.md` rule 12
- Conflicting, missing, or unclear project instructions: none
- Changed build-input paths: `.github/workflows/release-ios.yml`, `autobyteus-ios/scripts/**`, `autobyteus-web/generated/graphql.ts` → FS-DOCKER, FS-DESKTOP (local fresh clones) and the iOS job's fresh start on its runner (GH-01; locally only Xcode 26.1.1, which the release job's gate refuses)
- Required environment variables or secrets available: `N/A`. The E2E uses its own synthetic vault (no real key); no provider key is used.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` layers | commands | `pnpm -C autobyteus-web test:electron`; one server file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; E2E in a clean environment (`env -i`) |
| `TESTING.md` Fresh-start build | build inputs | `git clone --no-local`; `pnpm install --frozen-lockfile`; the Docker builder stage; desktop `build:electron:mac -- --arm64` with its variables and the two verify steps |
| `TESTING.md` One heavy run at a time | machine load (load average often above 100 on this Mac) | builds, suites and probes run one after another |
| `autobyteus-ios/README.md` | the smoke script | `autobyteus-ios/scripts/ios-simulator-smoke.sh <evidence dir>`; `IOS_SIMULATOR_NAME` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fresh clones | `~/.cache/abtest568/{fs-docker,fs-desktop}`, `/tmp/abtest568/ios` (a symlinked path, on purpose for AC-003) | `git clone --no-local`, checkout `52e75f2357` | — | — | removed |
| A built server | the FS-DOCKER clone | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>` with a temp HOME and its own launch credential | loopback only | `/graphql` answers | killed; temp root removed |
| My simulator | — | `xcrun simctl create apie2e568-iphone` (iPhone 17 Pro Max, iOS 26.1), English | the smoke picks it by exact name (`IOS_SIMULATOR_NAME`) | — | `simctl delete` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| A server data dir | a temp folder, `APP_ENV=test` | never `~/.autobyteus` or the user's node | removed |
| The E2E's synthetic vault and scripted model | the test's own setup | no real key | the test removes it |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/api/graphql/types/agent-run.test.ts` | the resolver's remaining mutations; the approval case removed with the mutation | REQ-001 | `Still Valid` (as changed) | IMP-04 | reused |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts` | a real server: a run with tools not auto-executed; `APPROVE_TOOL` over the WebSocket; a scripted model | AC-001 ("approval over the WebSocket still works") | `Still Valid` | — | run (E2E-01) |
| `autobyteus-web/electron/server/__tests__/PortOwnerInspectorFaults.spec.ts` deadline case | elapsed ≥ 900 and < 3000 ms; the owned child reaped (ESRCH) | REQ-002 | `Still Valid` (as changed) | IMP-06, IMP-07 | repeat (DL-01) |
| `SavedNodeEntryKeysMigrationTests` | only the start-up call site references the migration | REQ-003 | `Still Valid` (as changed) | IMP-09 | rerun from `/tmp` (IOS-01) |
| `ServerSettingsBasicsPanel.spec.ts` | the Basics cards; no GitHub | REQ-004 | `Still Valid` (as changed) | IMP-06 | run (WEB-01) |
| `ios-release-contract-check.py` `check_simulator_wiring` / `check_simulator_chooser` | both callers use the chooser; four fixture cases | REQ-005 | `Still Valid` (added) | IMP-05 | reused; it also runs inside FS clones' builds |
| `delegated-copies-large-hub-probe.mjs`, `delegated-team-default-collapse-probe.mjs` | count `GetAgentRunCollaborationMemberProjection` requests | — | `Out Of Scope` (FU-002; stale since autobyteus-461, not by this change) | `investigation-notes.md` S-02 | none |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R-IMP | AC-001…004 | codegen, typechecks, server agent-run tests, contract check, web suite, Electron suite, deadline ×20, demo check, iOS core tests | `Reused` | IMP-01…IMP-09 | ran on `eb7e4bf2af`; `52e75f2357` changes documents only |
| WEB-01 | AC-004 | the Basics spec | `Existing Test` | `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts` | a direct own run, cheap |
| CH-01 | AC-005; SCN-A2 | the chooser on this Mac's real `simctl` (Xcode 26.1.1) | `Journey` | `select-ios-simulator.py` with the default name, with my simulator's unique name, with a missing name (it boots nothing) | the fixtures do not show a real device list |
| GH-01 | AC-005; SCN-A1 | the iOS job on the runner | `Journey` (read-only check of IMP-10) | `gh run view 44747687988 --json`/`--log` | my own reading |
| FS-DOCKER | AC-001; SCN-A1 | the server image's builder stage | fresh start | `fs-other.sh docker` steps (install, three contract builds, prisma generate, server build, `build:mobile-web`) | build inputs changed |
| API-01 | AC-001; SCN-A3 | the built server's GraphQL | `Journey` | the FS-DOCKER clone's `dist/app.js` on loopback: the removed mutation → a validation error; introspection: no `approveToolInvocation` or its types; `restoreAgentRun` and the projection field still there (out of scope) | the real schema, not the generated file |
| E2E-01 | AC-001 | WebSocket approval through a real server | `Existing Test` | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts --no-watch` | "approval over the WebSocket still works" end to end |
| DL-01 | AC-002 | the deadline case | `Existing Test`, repeated | the case alone ×10 (`test:electron` config, `-t 'enforces the real 1000ms'`), with the load average logged | my own repeat beside IMP-07 |
| IOS-01 | AC-003, AC-005 | the core tests from a `/tmp` checkout; the smoke with the chooser | `Existing Test` | clone into `/tmp/abtest568/ios`; install; `prepare-demo-web.sh --build`; `generate-project.sh`; core tests; `IOS_SIMULATOR_NAME=apie2e568-iphone ios-simulator-smoke.sh` | the path that failed in 279 (FU-005); the local smoke |
| FS-DESKTOP | AC-001; SCN-A1 | the desktop release build | fresh start | `build:electron:mac -- --arm64` with TESTING.md's variables, then the two verify steps | the web's typecheck over the regenerated types, from scratch |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None by API/E2E. The implementation removed the server unit case "routes tool approval through the live AgentRun subject" with the mutation it tested (REQ-001); WebSocket approval stays covered by the stream-handler unit tests and E2E-01.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The iOS release job locally | this Mac has Xcode 26.1.1; the job's gate (571) refuses it | none: the runner run covers it | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: heavy runs one at a time; GitHub read only.
