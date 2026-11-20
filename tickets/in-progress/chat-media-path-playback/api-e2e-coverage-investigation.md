# API/E2E Coverage Investigation — autobyteus-572 (chat-media-path-playback)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-003, Approved by the user)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: `handoff-architecture-design-complete.md`, `follow-ups.md`
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route, Medium / Low)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1; Trigger: Implementation Engineer, IR-001 (code `02320583a5` server, `d165d3143a` web, `04034bc797`, `b856241b59`)
- Prior Investigation Reviewed: None. Latest Authoritative Investigation: this file.

## Current Requirement And Design Basis

On the phone a protected video or audio file is still downloaded whole (DEC-001 = A). While it loads, the viewer shows "Loading video… x of y MB" with rising progress, never "URL is not available." (REQ-001, D-1…D-4), on both phone routes. The workspace route (an absolute path inside the run's folder) goes through the player. The node-file route (outside the folder) goes through the phone viewer. Video and audio inside, outside, and in a delegated run's conversation play (REQ-002). The desktop is unchanged (REQ-003). Authentication and path rules are unchanged; the key travels in the header, never a URL (REQ-004). A failure is a plain message with Retry (REQ-005). The node sends `Content-Length` on user-file replies; the Org, Team and collaboration reference routes send none (D-5). Relative chat links are not file links (DEC-003, FU-003).

## Supported Scenarios And Real Usage

- Designer scenarios: UC-001 (phone: tap an absolute video/audio path in any conversation, inside or outside the folder, delegated runs included), UC-002 (desktop), UC-003 (loading and failure states).
- Added from the implemented behavior, each with its real trigger:
  - A download broken mid-way (the node stops, or the phone's connection drops), then Retry. Trigger: the node process killed during the download, then started again.
  - A phone in Chinese. Trigger: the phone's stored language preference `zh-CN`.
  - A video sent as a Team message's reference. Trigger: a Team member's `send_message_to` with `reference_files`; the phone's Messages.
- Contrived (not tested): relative links (out of scope, FU-003).

## Changed Surface And Boundary Classification

| Surface | Affected | Repository Evidence | Not Exercised By It | Broader Mode |
| --- | --- | --- | --- | --- |
| Backend (`Content-Length`) | Yes | IMP-05 unit | other routes' clients | Whole server suites |
| API / transport | Yes (a response header) | IMP-05, IMP-08 | — | Whole server suites |
| Frontend component / state | Yes | IMP-04/06 units | real downloads, failures | Phone bundle real stack |
| Browser journey | Yes | IMP-08/09 (MSP-89/90 and file-open cases) | broken downloads and Retry, zh-CN, reference routes, the rest of the phone probe | Whole `test:e2e:mobile-shell` + new cases |
| Authentication / permissions | Preserved | IMP-08 (key in the header) | refusal without a key on the media routes, path rules | Probe requests without a key / climbing path |
| Desktop renderer | Unchanged path | MSP-90, MSP-31/37 | — | Whole phone probe (its desktop windows) |
| Desktop shell, persisted data, external | No | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback`; Node 22.23.1; ffmpeg 8 (`/opt/homebrew/bin/ffmpeg`).
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback/TESTING.md` (no closer one). Conflicts: none.
- Changed build-input paths: `None` (`git diff --name-only bfd95f73a9...HEAD`: no manifest, lockfile, tsconfig, baseline, scripts, nuxt config, contracts, workflows).
- Setup: `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web` (`evidence/api-e2e/build-server.log`); probe-owned nodes, phones and Chrome, removed in `finally`.

## Existing Durable Coverage Inventory

| Path | Intent | Decision | Action |
| --- | --- | --- | --- |
| `mobile-file-open-cases.mjs` MSP-89, MSP-90 (this ticket) | phone media inside/outside/delegated, throttled progress, missing file, key in header; desktop | Still Valid | Run in the whole phone probe |
| `mobile-file-open-cases.mjs` MSP-28…31, MSP-37; `mobile-shell-probe.mjs` MSP-16 (its settle words updated) | existing file opening | Still Valid | Whole phone probe |
| Server unit/architecture tests of the file routes | `Content-Length`, permissions | Still Valid | Reused IMP-05 |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Command / Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-006 (unit), QR | Web unit, typechecks, guards | Reused | IMP-03, IMP-04, IMP-06 | Web source unchanged since `d165d3143a` (`04034bc797` renames a spec's cases) |
| API-02 | AC-005 (gate unchanged), D-5 | Server unit, typecheck | Reused | IMP-02, IMP-05 | Server code unchanged since `02320583a5` |
| API-03 | AC-001, AC-005, AC-006 | Phone: broken download + Retry, zh-CN, gate and path rules | Durable (MSP-91) | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-91` | Gaps in the handoff's "Not run" |
| API-04 | REQ-001 | Phone: a Team message's reference video | Durable (MSP-92) | `… --cases=MSP-92` | Reference routes send no length |
| API-05 | AC-001…AC-006, REQ-003 | Whole phone probe (MSP-89…92 and every other case, desktop windows) | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>` | The handoff's first downstream hint; file opening and shared viewers changed |
| API-06 | AC-005, D-5 | Server integration (whole) | Existing Test | `pnpm -C autobyteus-server-ts test:integration:prepare && … test:integration` | Responses gained a header |
| API-07 | D-5 | Server E2E (whole, scripted AGY gate) | Existing Test | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm test:e2e` | Same |

- Test progress log needed: `Yes`.

## Durable Coverage To Add / Update / Remove

| Case | Path | Change |
| --- | --- | --- |
| API-03, API-04 | `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` | Added MSP-91, MSP-92 (in the epsilon stack, after MSP-89); the phone's deliberate browser lines for them |

Nothing removed.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User Only | Follow-Up |
| --- | --- | --- | --- | --- |
| A real phone (Android/iOS app) | Optional in the handoff; the phone bundle runs in headless Chrome at 390×844 with touch; the apps load the same bundle | Low | No | None |
| Org and collaboration reference media | They share the reference viewer and its download with the Team reference (MSP-92) and send no length either | Low | No | None |

## Ambiguities Or Reroute Triggers

Found during execution: on the phone's node-file route (a path outside the run's folder), a broken download shows "The file preview could not be opened." with no Retry. REQ-005 and AC-006 ask for "a plain message with Retry"; the design's failure states (D-6, BEH-007) cover the players only. See the execution report.

## Investigation Decision

- Proceed To Execution: `Yes`. Durable coverage added: `Yes`. Reroute: see the execution report's result.
