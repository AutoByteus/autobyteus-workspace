# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-005
- Package identifier: `phone-web-followups-609`
- Request / ticket: autobyteus-609 (absorbs autobyteus-575), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-22
- Approved by and reference: Solution Designer within the direction (user informed in conversation, 2026-11-22). No `Needs user` decision.
- Exact approved requirements baseline / solution revision: this document at SR-002. SR-002 corrects ASM-1 (false at the read DS-I used, ARCH-REV-001 AR-001), DEC-007, QR-1 and REQ-I's runtime scope; the intended outcome is unchanged. Approved by the Solution Designer within the direction, user informed 2026-11-22.
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: ten small defects left by autobyteus-590 and autobyteus-572 (items A–J in `investigation-notes.md`). They include:
  - stale or duplicated rules on the node (A, E);
  - a stale tracked build output (B) and a build leftover (C);
  - a status shown as "Unknown" (D);
  - three stale or flaky phone test cases (F, G, I);
  - relative file links in chat that do nothing (H);
  - a run's folder that answers 404 right after a node restart (J).
- Affected actors or systems: the founder on the phone and the desktop; the node; developers and the release build; the phone probe.
- Desired outcome: each item behaves as the Requirements say, with no change to anything else.
- Observable definition of success: every AC passes. The whole phone probe has no failure caused by F, G or I.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current (evidence) | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-A | Contract | SCN-A | The node writes `contextText` (path, else command, else tool name) on every stored tool activity, from two copies of the rule. Its one reader counts it in a richness score where it never decides anything. | The node no longer computes or sends it | Which duplicate entry the dedupe keeps; every other activity field | Notes A |
| BEH-B | Operational | SCN-B | Building the contract packages changes 2 tracked files of `autobyteus-team-stream-contracts/dist/`, which was not rebuilt after `d005fa2a5b` | The tracked `dist/` of every contract package equals a fresh build, and a documented check catches a mismatch | The contract packages' source and public types | Notes B (Reproduced) |
| BEH-C | Operational | SCN-C | A Windows server preparation leaves `autobyteus-web/.server-packaging-stage/`, untracked and not ignored | No staging folder is left after a preparation, successful or failed, and git ignores it | The prepared server bundle (`resources/server`) | Notes C |
| BEH-D | User | SCN-D | An interrupted tool call reads "Unknown" with a wrench icon in the desktop Activity panel and on the phone | It reads "Stopped" with a stop icon, the same on desktop and phone | Every other status word and icon | Notes D |
| BEH-E | User | SCN-E | A conversation tool card loaded from the node (an earlier trace page) shows less summary than a live card for the same call: no recipient, no Task, and no Antigravity file or command | The same summary as the live card | The live cards; the summary rules themselves | Notes E |
| BEH-F | Operational | SCN-F | MSP-44/45 assert that relative Markdown links do nothing, which is wrong since autobyteus-576, so they fail | They assert autobyteus-576's behavior | What MSP-44/45 check otherwise | Notes F |
| BEH-G | Operational | SCN-G | MSP-55's deliberate link cut may log `ERR_SOCKET_NOT_CONNECTED`, which the probe counts as an unknown browser error | Accepted as the same deliberate cut | Every other unknown error still fails | Notes G |
| BEH-H | User | SCN-H1, SCN-H2 | Tapping a Markdown link with a relative path in a run's chat (`[clip](media/clip.mp4)`) does nothing, on desktop and phone | It opens that file of the run's own folder, as an absolute path inside the folder opens today | Absolute paths; external links; `#heading` links; prose and code text | Notes H |
| BEH-I | User | SCN-I | Once (autobyteus-572 round 1, machine load 60–70), the phone's open Activity kept a background task "running" for 30 s after the run was stopped. The cause was not established. | When the run stops, the phone's list shows the task Stopped ("Stopped: the run ended"), even when a live update was missed | Live updates while the run runs | Notes I, Runtime findings |
| BEH-J | User/System | SCN-J | Right after a node restart, reading a file of a known run's folder answers 404 until the folder is registered again (2.5 s in 572's run) | The read succeeds as soon as the node serves | Unknown folder IDs still answer 404; the path rules and access checks are unchanged | Notes J |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| The founder (desktop, phone) | See what a call did and open the files agents name | D, E, H, I, J as above | No new traffic while a run runs; after a stop, at most a few task-list reads (QR-1) |
| Developers and the release build | Builds that match the repository | B, C | A fresh clone's build is unchanged |
| Validation (phone probe) | Reliable verdicts | F, G, I | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-A | The node's stored-run projection without `contextText` | SCN-A |
| UC-B | Contract packages' tracked `dist/` kept equal to their source | SCN-B |
| UC-C | The Windows server preparation leaves no staging folder | SCN-C |
| UC-D | An interrupted call's status word and icon | SCN-D |
| UC-E | An earlier-trace tool card's summary | SCN-E |
| UC-F | MSP-44/45 updated to autobyteus-576 | SCN-F |
| UC-G | MSP-55 accepts its own deliberate cut's two codes | SCN-G |
| UC-H | A relative Markdown link in chat opens the run's file | SCN-H1, SCN-H2 |
| UC-I | A background task's end reaches the open list when the run stops | SCN-I |
| UC-J | A run's folder readable right after a node restart | SCN-J |

### Out Of Scope

- Making relative paths in plain prose or inline code into file links (DEC-002).
- The background task list of a Codex run (snapshot runtime) after its run stops (DEC-007).
- Changing the summary rules themselves (which keys, their order, the `cd` rule).
- Changing the node access model, the path rules or the workspace registry's format.
- The other status words; making the status words localized.
- The phone's media streaming (572 FU-001, its own Task).
- Other stale probe cases not named here.

### Non-Goals

- Finding which hop lost the MSP-59 update under load. The requirement is that the list ends correct (DEC-007); see the Unknowns in the notes.

### Preserved Behavior Boundary

- Each BEH row's Preserved column.
- Every autobyteus-590 AC, except AC-002's interrupted word, which D changes.
- autobyteus-576's relative-link behavior in workspace documents.
- autobyteus-572's REQ-002…005 (absolute media paths, security unchanged).

### Prerequisites

None.

### Review Authority

As the template states. A finding must cite a REQ, AC or BEH ID.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-A | The node no longer computes, stores in its projection types, or sends `contextText` for tool activities; the dedupe's choice of entry is unchanged | BEH-A | Should | No reader; the rule duplicates the web's summary; DEC-001 | N/A | 590 FU-001 |
| REQ-B1 | The tracked `dist/` of each contract package (`autobyteus-agent-presentation-contracts`, `-collaboration-stream-contracts`, `-team-stream-contracts`) equals what a build of the current source produces | BEH-B | Must | A stale `dist/` gives consumers wrong types; it changes on every build | Reproduced: rebuild gives the 2-file diff | 590 FU-002 |
| REQ-B2 | One documented command checks REQ-B1. It builds the contract packages in dependency order and fails, naming the files, when a tracked `dist/` differs. TESTING.md requires it whenever a change touches a contract package. | BEH-B | Must | The rule today names only the changed package; a dependent package's `dist/` drifted unnoticed; DEC-003 | N/A | 590 FU-002 ("consider a check") |
| REQ-C | A Windows server preparation (`prepare-server.mjs`) leaves no `autobyteus-web/.server-packaging-stage/` after it ends, successfully or not, and git ignores that folder | BEH-C | Should | DEC-004 | N/A | 590 FU-003 |
| REQ-D | An interrupted tool call reads "Stopped" with a stop icon wherever its status is shown: the desktop Activity panel and the phone's row and detail screen. The conversation tool card and the earlier-trace card show the same status. | BEH-D | Should | DEC-005 | N/A | 590 FU-004 |
| REQ-E | A tool card built from the node's earlier trace page shows the same one-line summary as a live card for the same call, for every argument key the shared summary reads | BEH-E | Should | DEC-006 | N/A | 590 FU-005 |
| REQ-F | MSP-44/45 expect autobyteus-576's behavior: a relative link to a file inside the folder opens that file; a missing heading, a root-absolute link and a link out of the root open nothing. Both pass. On the phone's file viewer 576's relative link opens nothing visible (DEC-009, FU-004): MSP-44 records the phone's results without asserting them, citing FU-004. | BEH-F | Must | A stale test makes the whole probe fail | N/A | 590 FU-006 |
| REQ-G | MSP-55 accepts `net::ERR_SOCKET_NOT_CONNECTED` as well as `net::ERR_CONNECTION_RESET` from its own deliberate link cut, and no other new error | BEH-G | Must | The same cut can log either code (`mobile-live-reconnect-cases.mjs:197-200`) | N/A | 590 FU-007 |
| REQ-H1 | In a run's conversation, on desktop and phone, tapping a Markdown link whose destination is a relative path opens that path in the run's own folder (for a team member or a delegated run, that run's own folder). It opens as an absolute path inside the folder opens today. | BEH-H | Must | DEC-002 | N/A | 572 FU-003 |
| REQ-H2 | A relative link that leaves the run's folder, or a run with no folder, opens nothing and shows the existing "could not open" message. A run on another node shows the existing "on node X" message. A missing file opens the viewer's existing not-found state. | BEH-H | Must | No tap is silent or unsafe; DEC-002 | N/A | 572 FU-003 |
| REQ-I | When a run whose runtime streams its background tasks (native AutoByteus, Claude, Antigravity) stops while its tasks are listed (the phone's Activity or the desktop Background Tasks section), the list shows each task's end ("Stopped: the run ended") within 10 s of the run's stop, even when a live task update was not received. A stopped run's list is not re-read every 2 s. | BEH-I | Must | Notes I: one live update is the only path today; DEC-007 | Robust by construction, proven by dropping the live update in the probe | 572 FU-004 |
| REQ-J | Right after a node restart, a read of a file in a registered folder (`GET /workspaces/<id>/content` and `/static/*`) succeeds as soon as the node serves requests. An unknown ID still answers 404, and every path and access rule is unchanged. | BEH-J | Must | DEC-008 | N/A | 572 FU-005 |

## Acceptance Criteria

| AC ID | REQ | Behavior / Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-A | REQ-A | BEH-A, SCN-A | A stored run's activities are read (agent, team, Codex) | No tool activity has `contextText`; the node's source has no `contextText`; the existing dedupe tests pass unchanged | — | Server unit tests (projection, dedupe, Codex provider); `rg contextText autobyteus-server-ts/src` is empty |
| AC-B | REQ-B1, REQ-B2 | BEH-B, SCN-B | Run the check on the branch | It passes and `git status` stays clean. On the base (`f2c0d2a902`) it fails naming `team-stream-server-message.d.ts`. TESTING.md names it. | — | Run the check on base and branch; read TESTING.md |
| AC-C | REQ-C | BEH-C, SCN-C | Run `prepare-server.mjs` to the end, and once failing after staging | No `.server-packaging-stage/` remains; `git check-ignore` lists it; `resources/server` is the prepared bundle | — | macOS run of `pnpm -C autobyteus-web prepare-server:windows`, plus a forced failure; the build-only release run's Windows job passes |
| AC-D | REQ-D | BEH-D, SCN-D | A tool call is interrupted (the run is stopped mid-call), live and after the run is read back from the node (a phone opened after the stop, a desktop reload, an earlier-trace page) | The desktop panel, the phone row and the phone detail read "Stopped" with the stop icon. The conversation card and earlier-trace card show the same status. No "Unknown" or "Failed" remains for this status, for every runtime (the node reads every run's history through its own traces, DEC-010). | Other statuses unchanged | Web unit tests; phone probe (590's MSP-96 running → stopped) |
| AC-E | REQ-E | BEH-E, SCN-E | Open an earlier trace page with `send_message_to`, `get_project_task`, an Antigravity `run_command` (`CommandLine`) and `view_file` (`AbsolutePath`) | Each page card shows the same summary text as the live card for that call | A call with none of the keys has no summary, as today | Server unit test of the page projection; web unit test comparing page and live cards; GraphQL schema has the keys |
| AC-F | REQ-F | BEH-F, SCN-F | `--cases=MSP-44,MSP-45` | Both pass with 576's expectations | — | Phone probe |
| AC-G | REQ-G | BEH-G, SCN-G | MSP-55, with either code | The code is `known`; MSP-55 passes; any other unknown browser error still fails the case | — | Read the allowlist; MSP-55 run |
| AC-H1 | REQ-H1 | BEH-H, SCN-H1 | A run (and a team member run) writes `[clip](media/clip.mp4)` and `[notes](docs/a.md#x)`; the user taps each, on desktop and phone | Each opens that file of the run's own folder in the same viewer as an absolute path inside the folder | — | Web unit tests of the resolver and the open; phone probe and desktop probe case |
| AC-H2 | REQ-H2 | BEH-H, SCN-H2 | Tap `[x](../outside.md)`; a run with no folder; a run on another node; a missing file | The existing "could not open" message for the first two; "on node X" for the third; the viewer's not-found state for the fourth. Nothing outside the folder is read. | — | Web unit tests; phone probe for outside and missing |
| AC-I | REQ-I | BEH-I, SCN-I | The phone's Activity lists a running task, the probe drops every live task update, and the run is stopped | Within 10 s the row reads Stopped and "Stopped: the run ended". MSP-59 also passes without dropping. | — | Phone probe case MSP-99 with the dropped update (fails on base, passes on branch); MSP-59; unit test of the re-read rule |
| AC-J | REQ-J | BEH-J, SCN-J | Restart a node with a registered run folder, then read a file in it immediately | The first read answers 200 with the file. An unregistered ID answers 404. A path outside the folder is refused as today. | — | Server integration test with a restarted manager; MSP-91's `readsAfterRestart` |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A | Contract | Web client | Read a stored run | Open a finished run | Stored traces | The node projects activities | No `contextText` | — | Supported Normal | Notes A | REQ-A / AC-A |
| SCN-B | Operational | Developer | Change a contract package | A source edit and build | Clean tree | Build all contract packages; run the check | Clean tree, check passes | A stale `dist/` fails the check | Supported Normal | Notes B | REQ-B1/B2 / AC-B |
| SCN-C | Operational | Windows release build | Prepare the server | `pnpm build:electron:windows` | — | Stage, publish, rebuild native modules | No stage folder left | A failure also leaves none | Supported Normal | Notes C | REQ-C / AC-C |
| SCN-D | User | Founder | See what happened to a call | Stop a run while a call runs | Activity open | The call is interrupted | "Stopped" | — | Supported Normal | Notes D; 590 MSP-96 | REQ-D / AC-D |
| SCN-E | User | Founder | Read an earlier part of a conversation | Scroll up or load earlier | Long run | Page cards load from the node | Same summaries as live | — | Supported Normal | Notes E | REQ-E / AC-E |
| SCN-F | Operational | Validation | Run the phone probe | `test:e2e:mobile-shell` | — | MSP-44/45 run | Pass | — | Supported Normal | Notes F | REQ-F / AC-F |
| SCN-G | Operational | Validation | Same | Same | — | MSP-55 cuts the link | Pass | — | Supported Normal | Notes G | REQ-G / AC-G |
| SCN-H1 | User | Founder | Open a file an agent linked | Tap a relative link in chat | A run with a folder | Resolve against the run's folder; open | The file opens | — | Supported Normal | Notes H; 572 FU-003 | REQ-H1 / AC-H1 |
| SCN-H2 | User | Founder | Same | Tap an escaping link, or in a run with no folder | — | — | Message, nothing read | Other node → "on node X" | Supported Explicit Edge (confinement is the existing path rule) | 576's rule | REQ-H2 / AC-H2 |
| SCN-I | User | Founder | See a task end when the run ends | Stop the run | Phone Activity open with a running task | The node stops the task | Row reads Stopped | A live update is lost | Supported Normal | Notes I | REQ-I / AC-I |
| SCN-J | User/System | Founder | Retry a video after the computer's node restarted | Tap Retry | Node just restarted | Read the run's folder file | 200 | Unknown folder → 404 | Supported Normal | Notes J; 572 MSP-91 | REQ-J / AC-J |

## UI, Interaction, And Experience Requirements

- Applicable: Yes (D, H, I). There is no Product design package; Product UI/UX fields are N/A.
- D: the word "Stopped" and a stop icon. The tone is neutral grey, distinct from Denied's crossed circle. The phone shows icon and word, as for every status other than success (590 D-5).
- H: links look as they do today. A relative link becomes a working link; no new control.
- I: no visible change except the correct end.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-1 | REQ-I | Performance | No new read for REQ-I. A stopped run's open list stops the existing 2 s re-read (it only ever answered "inactive"); it reads again when the run is live again | Probe network log; unit test |
| QR-2 | REQ-H2, REQ-J | Security | No read outside the run's folder by a relative link; unknown IDs and path rules unchanged | Unit and integration tests |

## Data Continuity And Acceptable Loss

- Persisted data affected: No. `contextText` is computed at read time, never stored. The workspace registry is read, not changed.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| GraphQL `EventMonitorToolSummaryArgs` | Gains fields; web codegen updated | Notes E | Same-version deploy (DESIGN.md rule 9) |
| Projection `activities` (JSON) | Loses `contextText` | Notes A | No reader |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-1 | Every runtime that streams its tasks ends each still-running task with `stopped`/`run_ended` when its run stops, so a stopped run has no running task | REQ-I applies that end on the web when it sees the run stop | Read: Claude `claude-background-task-registry.ts:249`; native `autobyteus-background-task-reporter.ts:21` (run ending → `run_ended`), stopped through `BackgroundProcessManager.stopAllForRunEnd`; Antigravity `agy-background-task-monitor.ts:82-88` `stopAll`, called from every stop path of `agy-agent-run-backend.ts` (`:119,139,186,230,244`). The web already applies the same fact to the count: an Offline status sets `backgroundTasksRunning = 0` (`agentRuntimeStatusState.ts:66,74`). SR-001's ASM-1 ("the node's task view lists ended tasks after a stop") was false at the GraphQL read: it answers `unavailable/inactive` for a run that is not active (`agent-background-task-view.ts:94-101`, AR-001). | Validated (Read) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Remove or rename `contextText`? | The FU offered both | It is not a dedupe key: it adds 1 to every entry's score and never decides | Remove it. A rename would keep a field that does nothing. | Solution Designer | Decided |
| DEC-002 | Which relative paths become links in chat, and resolved against what? | Which text is tappable is visible behavior | (a) Markdown links only; (b) also inline code like `src/a.ts`; (c) also prose. Agents mark a link explicitly. Inline code holds many non-paths (`v2.0`, `foo.bar`, `index`), so (b) needs a guess or a check per word (extra requests). | (a): the agent's explicit link, resolved against the run's own folder (a member's or delegated run's own), confined to it. (b) can follow if links prove too few. | Solution Designer (within the direction "tappable relative file paths in chat") | Decided; user informed |
| DEC-003 | What checks contract `dist/`? | The drift came from a dependent package | No PR CI exists (release workflows only) | One root command, required by TESTING.md for any change touching a contract package. RELEASE.md:95's "never commit `*/dist/`" names the exception, aligned with TESTING.md:344. | Solution Designer | Decided |
| DEC-004 | Remove the stage or ignore it? | — | The stage is rebuilt from scratch every run (its node_modules are removed first) | Both: remove it at the end, also on failure, and ignore it in case a run is killed | Solution Designer | Decided |
| DEC-005 | Word and icon for interrupted | A visible word | "Interrupted", "Stopped", "Cancelled". The product says "Stopped" for a run's stop (`runSettings.status.stopped`, "Stopped: the run ended"). | "Stopped" with a stop icon, neutral grey, on every surface that shows a tool call's status | Solution Designer (the Task asks for "its own word and icon") | Decided; user informed |
| DEC-006 | How the page card gets the same summary | A second hand-kept key list drifted | Add keys by hand again, or one shared key list | One list of summary argument keys that both the web's summary and the node's page projection read, so they cannot drift (design decides where) | Solution Designer | Decided |
| DEC-007 | MSP-59: fix a cause or make the list correct by construction? | The cause was not established | 3/3 runs passed at load ~30; native-runtime delays are irrelevant (the probe uses Antigravity); the server's stop order and the gap between the list's first read and the live stream are candidates (notes). Loading the shared machine to 60–70 would harm other agents' work. A re-read cannot work: the node answers `inactive` for a stopped run (AR-001). Keeping a stopped run's final list on the node would add node state for a fact the web already knows (ASM-1). | SR-002: when the web sees the run go from live to stopped (Offline), every task still shown running ends as `stopped`/`run_ended` in the run's task list. No read. A stopped run's list no longer re-reads every 2 s. That meets the user-visible outcome whatever hop lost the update; the probe proves it by dropping the live update. Codex (snapshot runtime) is out of scope: the reported failure is an event-stream runtime, and Codex's run-end task behavior is not established. | Solution Designer (within FU-004's "make it arrive") | Decided; user informed |
| DEC-010 | A stopped call read back from the node reads "Failed" (CRR-002, API-REV-001 F-1) | The node's replay maps every stored error to `error`; the web's conversation hydration derives the card status from `toolError` itself | Read-side rule from stored facts, or write a new stored status | Read-side, one shared node rule from what each writer already stores (the result trace's source event, and the interruption texts). Old traces read the same way, so persisted data stays Not Affected. The conversation entry carries the node's status so the web stops re-deriving it. SR-005 correction (ARCH-REV-003 N-3): every runtime's history, Codex included, is read through the node's local replay (`agent-run-view-projection-service.ts:42-54,84`, only `LocalMemoryRunViewProjectionProvider`), and Codex emits `TOOL_EXECUTION_INTERRUPTED` and `TURN_INTERRUPTED` (`codex-thread-event-converter.ts:63`, `codex-turn-event-converter.ts:83`), which the sequencer stores. So Codex is covered; the SR-004 exclusion and FU-008 are withdrawn. | Solution Designer (within REQ-D) | Decided; user informed |
| DEC-009 | The phone's file viewer does not open 576's relative links (implementation, 2026-11-22: `MarkdownPreviewer.openRelativeLink` → `fileExplorerStore.openFilePreview`, while `MobileFiles` shows the file its route names; MSP-44 phone `opened:false` ×3) | REQ-F assumed 576 works on the phone | (a) fix it here through the phone's navigation; (b) follow-up | (b). The ticket's items work without it; the gap predates this ticket (576), and fixing it changes a surface the reviewed design leaves alone. A follow-up keeps the reviewed scope. MSP-44 records the phone results unasserted until FU-004. | Solution Designer | Decided; user informed |
| DEC-008 | Which lookup the content routes use | — | `getOrCreateWorkspace` already restores from the registry | Use the restoring lookup, without creating anything for an unknown ID | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-A | UC-A | BEH-A | AC-A | SCN-A |
| REQ-B1, REQ-B2 | UC-B | BEH-B | AC-B | SCN-B |
| REQ-C | UC-C | BEH-C | AC-C | SCN-C |
| REQ-D | UC-D | BEH-D | AC-D | SCN-D |
| REQ-E | UC-E | BEH-E | AC-E | SCN-E |
| REQ-F | UC-F | BEH-F | AC-F | SCN-F |
| REQ-G | UC-G | BEH-G | AC-G | SCN-G |
| REQ-H1, REQ-H2 | UC-H | BEH-H | AC-H1, AC-H2 | SCN-H1, SCN-H2 |
| REQ-I | UC-I | BEH-I | AC-I | SCN-I |
| REQ-J | UC-J | BEH-J | AC-J | SCN-J |

## Architecture Phase Input

- Verify: the web's tool-card status path for `interrupted`; where a shared summary key list can live (a contract package both web and node import); the phone's and desktop's trigger for "the run stopped"; `getOrCreateWorkspace` side effects for skill and semantic IDs from a URL; that Playwright `routeWebSocket` can drop frames in the probe.
- Build inputs touched (B, C, possibly E): fresh-start build and build-only release run (DESIGN.md rule 12).

## Readiness Check

### Content Ready For Approval

- All items: Yes. Content ready for approval: Yes.

### Approved Basis Ready For Design

- Approval recorded: Yes (Solution Designer within the direction, user informed 2026-11-22).
- Approved requirements package ready for architecture design: Yes.
