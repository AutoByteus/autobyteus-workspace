# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-002; D-1…D-7)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001…FU-005), `handoff-architecture-design-complete.md`, `handoff-design-revised-sr-002.md`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IMP-01…IMP-06)
- Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: `/implementation_engineer`, IR-001 ready for API/E2E (direct route, Medium / Low), branch `codex/phone-activity-details` at `f411294735` (base `origin/personal` `0da6bfbfc1`); two implementation decisions to check (Antigravity PascalCase argument keys; a background task's title unfolds)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- The phone Activity tool row shows the tool name and the shared summary of the call (`getToolDisplaySummary` on the activity's current arguments: command without a leading `cd <folder> &&`, file, text argument, "→ <recipient>", Task key), never the name twice, nothing when there is nothing to summarize (REQ-001, AC-001, DEC-006, DEC-007).
- Status never by color alone: success is a check icon named "Success", every other status icon + word; desktop words and tones (REQ-002, AC-002, DEC-008).
- A tool row opens a full-screen detail (Arguments, Logs, Result, Error, live; Back keeps scroll) (REQ-003, AC-003). Compaction rows open their rows; errors in full (REQ-004/006, AC-004). Background tasks expand to their full command and summary (REQ-005, AC-005). The desktop Activity reads the same builders and shows the same content; no `contextText` in the web app (REQ-007, AC-006). 586: the Nuxt type project excludes `dist-mobile-demo/` (and the Windows staging folder); typecheck passes at baseline with the demo build present; TESTING.md's workaround sentence is gone (REQ-008, AC-007).
- DEC-005: no physical phone; the production phone bundle in `test:e2e:mobile-shell` is the phone evidence.
- Implementation decision 1 (handoff): Antigravity's tools pass PascalCase arguments through; `CommandLine` is a command key, `Path` and `AbsolutePath` file keys — stated as "the only AGY argument names the node's code and recordings show".
- Implementation decision 2: an AGY/native background task's title is its command, so expanding unfolds the title too.

## Supported Scenarios And Real Usage

- Designer scenarios covered: UC-001 phone Activity rows; UC-002 their details; UC-003 one shared model for desktop and phone; UC-004 (586) typecheck with build outputs.
- Real-use scenarios added from investigating the implemented behavior:
  - An Antigravity agent edits files with its own tools `write_to_file` and `replace_file_content` (argument `TargetFile`, `agy-native-arguments-turn.mjs`, `antigravity-translation.ts`) and searches/lists with `grep_search` (`Query`, `SearchPath`), `find_by_name` (`Pattern`, `SearchDirectory`), `list_dir` (`DirectoryPath`). Real trigger: any AGY coding run, the founder's runtime (the founder's screenshot showed `run_command` rows).
  - A native-runtime (AutoByteus) agent's `run_bash` call runs for several seconds while the user has its details open: its Logs receive `[TOOL_CALL]` at start and `[TOOL_RESULT]` at the end (`autobyteus-ts/src/agent/loop/tool-phase.ts`). This is a real runtime that streams TOOL_LOG to the phone, which the implementation's "logs grow: unit only" did not use.
- Designer scenarios recorded as unsupported/contrived: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 tool row summary + status | Changed | REQ-001/002, D-2, D-5 | Phone probe on real runtimes (scripted AGY tool steps, AGY native tools) + unit |
| BEH-002 tool detail screen | Added | REQ-003, D-6, D-7 | Phone probe: open/Back/scroll, failed and JSON details, live status change, live Logs growth (real native runtime) |
| BEH-003 compaction details | Added | REQ-004, D-4 | Phone probe MSP-95 |
| BEH-005 background task expand | Changed | REQ-005, D-5 | Phone probe MSP-96 |
| BEH-006 errors in full | Changed | REQ-006 | MSP-94 failed details |
| Shared summary (desktop conversation tool cards, event monitor cards) | Changed | D-2a, DEC-006/007 | Unit (card specs); conversation card shares `getToolDisplaySummary` |
| Desktop Activity panel | Preserved | REQ-007, D-3 | Reuse IMP-02 parity, unit suite |
| BEH-007 typecheck excludes | Changed | REQ-008 | Local run with `dist-mobile-demo/` present |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Server fixture label only (`agy-failure-cli.mjs`) | IMP-03 fixture routing test | None | None |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes | Summary util, presentation builders, phone row/detail/background views, navigation | Web unit suite (IMP-03) | Real runtime argument shapes (AGY PascalCase) and real TOOL_LOG timing | Browser (phone probe) |
| Browser integration / user journey | Yes | Production phone bundle paired via Phone Access | MSP-94…96 (IMP-04) | AGY native file tools; live logs | Browser |
| Authentication / session / permissions | No | Phone pairing unchanged | Existing MSP cases | — | — |
| Desktop renderer / web-equivalent UI | Yes | Desktop Activity items read the builders; conversation tool cards' summary | IMP-02, unit | — | None beyond unit (same components) |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | Stored-run hydration drops `contextText` in the web only | Unit `runProjectionActivityHydration.spec` | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (read) | Real model (native runtime) emits TOOL_LOG | None in repository before this round | Timing of TOOL_LOG vs. open details | Live API via test vault (gated) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-activity-details`
- Project type and runtime stack: pnpm monorepo; Node 22.23.1; Nuxt web (phone bundle `/mobile`), Fastify node (`autobyteus-server-ts/dist`), scripted AGY CLI fixture; Chrome via Playwright.
- Project testing guideline path(s): `TESTING.md` (root)
- Conflicting, missing, or unclear project instructions: TESTING.md says a change to it is committed on its own as `docs(testing): <reason>`; `767cb3b61a` commits the TESTING.md sentence removal together with `nuxt.config.ts` (recorded as finding F-2).
- Changed build-input paths: `autobyteus-web/nuxt.config.ts` (TESTING.md build inputs) → a fresh-start build case (FS-1) applies.
- Required environment variables or secrets available: `Yes` — test vault `READY` with `provider.openai.api-key` (values never read or printed).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Project testing guideline | Clean env (`env -i PATH HOME TMPDIR`), own data roots and ports, phone behavior in `test:e2e:mobile-shell`, test vault for real providers (`AUTOBYTEUS_TEST_VAULT`, gated), one heavy run at a time, fresh-start build on build-input change |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | Phone probe | `--output-dir`, `--cases=`; built server dist and phone bundle of this worktree |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY | `AGY_FAKE_CASE` (`mcp_calls`, `auto_compaction`, `linked_skills`, `native_arguments` needs `AGY_FAKE_ARGUMENT_HOME` = the CLI's HOME and `AGY_FAKE_ARGUMENT_WORKSPACE`) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server dist | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build` | — | bootstrap smoke passes | — |
| Phone bundle | `autobyteus-web` | `pnpm -C autobyteus-web build:mobile-web` | — | "The /mobile build holds no demo code." | — |
| Demo bundle | `autobyteus-web` | `pnpm -C autobyteus-web build:mobile-web --demo` | 13 MB `dist-mobile-demo/` | "Demo web assets written" | left in place for AC-007 |
| Phone probe nodes (alpha, beta, iota, theta, kappa, lambda) | probe | started by the probe on free ports, data under `<TMPDIR>/mobile-shell-probe-*` | lambda only reads the test vault | `/rest/health` | probe stops them |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Paired phone | Phone Access pairing on private origin | probe-owned nodes only; never `~/.autobyteus` | probe stops nodes |
| AGY native tool turn | `AGY_FAKE_CASE=native_arguments` | HOME = node's own HOME under the probe root | probe root under `/tmp/api590/tmp` |
| Real model for TOOL_LOG | test vault, `gpt-5.4-mini` on the native runtime | `RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1`; key never printed; uses a few cents | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-activity-details-cases.mjs` MSP-94/95/96 | Rows, details, Back, compaction, background unfold, live status | AC-001…AC-005 | Still Valid | IMP-04 | Rerun |
| `autobyteus-web/utils/__tests__/toolDisplaySummary.spec.ts` | Summary keys incl. AGY `CommandLine`/`Path`/`AbsolutePath`, recipient, Task, `cd` | AC-001 | Needs Update (no `TargetFile` case) | code read | Owner adds with the fix |
| `components/mobile/views/__tests__/MobileActivityDetail.spec.ts` | Logs grow, result arrives while open; Back | AC-003 | Still Valid | IMP-03 | Reuse |
| Other MSP cases (whole `test:e2e:mobile-shell`) | Phone journeys | Regression | Still Valid | — | Whole run |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| CR-1 | AC-001 (decision 1) | Summary keys vs. the node's AGY argument names | Journey (code read) | Read `toolDisplaySummary.ts`, `antigravity-translation.ts`, `agy-stream-event-converter.ts:199-208`, `agy-native-arguments-turn.mjs` | Checks the decision's claim |
| CR-2 | AC-006 | No `contextText` in the web app | Journey (code search) | `grep -rn contextText` over web source (no build outputs) | AC-006 names a code search |
| B-1 | AC-001…AC-005 | Server dist + phone bundle of this tree | Existing Test | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | Probe prerequisites |
| MSP-94/95/96 | AC-001…AC-005 | Production phone bundle, scripted AGY | Existing Test | `test:e2e:mobile-shell --cases=MSP-94,MSP-95,MSP-96,MSP-97,MSP-98` | Ticket's phone cases |
| MSP-97 | AC-001 (decision 1) | Phone row for AGY native tools (`native_arguments`) | Durable | same run | Real AGY argument shapes for file/search tools |
| MSP-98 | AC-003 (logs grow while open) | Phone detail of a running native `run_bash` with a real model | Durable (gated live) | same run with `AUTOBYTEUS_TEST_VAULT`, `RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1` | The only runtime path that streams TOOL_LOG to the phone here |
| MSP-96 (decision 2) | AC-005 | AGY background task title unfolds | Existing Test | same run | Checks decision 2 |
| TC-1 | AC-007 | Nuxt type project with `dist-mobile-demo/` present | Existing Test | `pnpm -C autobyteus-web build:mobile-web --demo`; `pnpm -C autobyteus-web typecheck` | AC-007 |
| TD-1 | AC-007 | TESTING.md sentence gone | Journey | `git diff 0da6bfbfc1..HEAD -- TESTING.md` | AC-007 |
| U-1 | AC-001…AC-006 unit | Whole web unit suite, guards | Reused | IMP-03 | Tree unchanged since IMP-03 except my e2e files |
| DP-1 | AC-006 | Desktop Activity parity | Reused | IMP-02 | Components unchanged since |
| WS-1 | Regression | Whole `test:e2e:mobile-shell` | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell` | Phone row markup changed for every case |
| WS-2 | Regression cause | MSP-44/MSP-45 alone, code read | Existing Test | `--cases=MSP-44,MSP-45` | Added during execution: find why they failed in WS-1 (rule 9) |
| FS-1 | Build input `nuxt.config.ts` | Fresh-start build | Existing Test | fresh `git clone --no-local`, `pnpm install --frozen-lockfile`, release job's mac build | TESTING.md fresh-start rule |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| MSP-97 | `autobyteus-web/tests/e2e/mobile-activity-details-cases.mjs` | AGY's own tools' argument shapes on the phone row; the implementation's cases use only `view_file`, `run_command` and MCP calls |
| MSP-98 | same file (gated live) | A running tool's Logs growing while the details are open, on a real runtime |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| MSP-97, MSP-98 | `mobile-activity-details-cases.mjs` `withNodeAndPhones` | Optional launch, tools, instructions; `say` | AGY default unchanged |
| MSP-97 | `mobile-shell-probe.mjs` | Pass the probe `root` to the cases (a node's HOME) | — |

## Durable Coverage To Remove

None

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Physical phone WebView | No device (DEC-005, accepted) | Low | No | None (DEC-005) |
| Event monitor trace cards' agent-tool keys | Node contract (FU-005) | Low | No | FU-005 |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-1 AGY `write_to_file`/`replace_file_content` (`TargetFile`) rows show no file; `grep_search`/`find_by_name`/`list_dir` rows show nothing; decision 1's claim that `CommandLine`/`Path`/`AbsolutePath` are the only AGY argument names is not what the node's code shows | Local Fix | CR-1, MSP-97 | Implementation engineer |
| F-2 TESTING.md change committed together with `nuxt.config.ts` | Local Fix | `git show --stat 767cb3b61a` | Implementation engineer |
| MSP-44/MSP-45 assert pre-576 "a link with no scheme does nothing" | Outside this ticket (follow-up) | WS-2, `8c3810df95` | Solution Designer (follow-up) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (MSP-97, MSP-98)
- Reroute Required Before Validation Execution: `No` (F-1 found during execution; the round ends `Fail`)
- Recommended Owner If Reroute Required: implementation engineer (through the failure-origin review)
- Notes: FS-1 and WS-1 after the fix are `Next Round` if this round fails, since the fix changes the shared summary every phone and desktop row reads.
