# API/E2E Execution Coverage Report

The run record and the result of the latest round. The plan is `api-e2e-coverage-investigation.md`; the history (round 1: F-1, F-2) is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2. Code review CRR-003 passed IR-002 (`d005fa2a5b`, `64a4b6100c`), the rework after round 1's F-1 (CR-001) and F-2 (CR-002, design SR-010). Reviewed at `2bd8a470bf`.
- Prior round reviewed: round 1 (API-REV-001, Fail: F-1, F-2). Its unresolved failures were rechecked first (TF-02, TF-03, TFU-03).
- Rerun plan (by impact): the round's diff `443f1c2c0f..64a4b6100c` changes the planner, committer, membership, execution manager, run-ID router, run-tree records/view, the tree schema, a contracts package (`dist` included) and the web rows. Every case that exercises them was rerun: all TF, TFL, TFU and API-PEER cases, the regression suites, typecheck and the fresh-start build. New cases: TF-11, TF-12, TFU-04, TFU-05, TFU-06.
- Deviations from the plan, and why:
  - TFU-03 and TFU-04 record the failed row-open, finish the member through the server's own path (the team stream) and assert at the end, so every later case still runs.
  - A server-level check of F-3 was added to TF-03 (the leaving member's own reads), so the fix gets a durable regression test.
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/evidence/`. Round 2 is in the `*-r2` folders; round 1's folders stay as history.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`; on `Fail`, failure-origin review by the code reviewer
- Proportional test-code review decision: `Not Applicable` this round (result `Fail`)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | source `2bd8a470bf` (= IR-002 `64a4b6100c` + review docs); tests as committed in `8789b97a41` | Linux 6.12 aarch64 container, root, Node v22.23.3, pnpm 10.28.2 | built server `dist/app.js` rebuilt from this source; scripted AGY CLI (`linked_skills`) | temp data root, HOME, DB per suite; local package imported and edited on disk |
| ENV-2 | as ENV-1 | as ENV-1 | built server; real Codex (`gpt-6.1-terra`, low) and native AutoByteus (`claude-haiku-5-5`, test vault) | data root `/root/.autobyteus-e2e/team-follows-live-*`, throwaway `CODEX_HOME`; removed |
| ENV-3 | as ENV-1; probe as committed with this report | as ENV-1 | built server + `nuxt dev` + headless Chromium 1512×952; scripted AGY; real Codex for TFU-04 | probe root `/root/.autobyteus-e2e/team-follows-ui-probe-*` (outside `/tmp` for Codex), throwaway `CODEX_HOME`; removed |
| ENV-4 | as ENV-1 | as ENV-1 | two-server suite (built servers, scripted AGY) | Brief Studio importable package present |
| ENV-5 | `8789b97a41` fresh clone | as ENV-1 | every step of release job `build-linux-arm64` | see API-FS |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | all (unit/integration) | server units, integration | Reused IR-002 checks (implementation handoff, IMP-10..IMP-17) | — | Pass | — | — | no source change after `64a4b6100c` |
| TF-01 | AC-001, AC-006 | built server, package file edit | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<wt>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs TEAM_FOLLOWS_E2E_EVIDENCE_DIR=<evidence>/API-TF-r2 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts --no-watch --reporter=verbose` (run 3) | ENV-1 | Pass | `API-TF-r2/API-TF-r2-run.log`, `API-TF-r2/TF-01.json` | `✓ TF-01`; exact notice lines as in round 1 | |
| TF-02 | AC-002, AC-010, AC-006 | built server | same run | ENV-1 | Pass | `API-TF-r2/TF-02.json` | `byRunId`: `"code": "COLLABORATION_TARGET_NOT_FOUND"`, `"writer (/writer) is no longer a member of your team: …"` | **F-1 resolved** |
| TF-03 | AC-003, DEC-002, AC-010, SR-010 | built server | same run | ENV-1 | **Fail** | `API-TF-r2/TF-03.json` | refusals by address and run ID exact (`COLLABORATION_TARGET_NOT_FOUND`); `markerWhileLeaving` = the reviewer; `rowsWhileLeaving` = its `team_member` row tagged; send delivered; `markerAfterRelease: []`; **`openedProjection`/`openedFileChanges`: "AgentRun '…' has no configured launch placement or recorded source."** (F-3) | every other assertion of the case passed (run 2: `12 passed (12)` before the F-3 check existed) |
| TF-04 | DEC-007, AC-003 | built server | same run | ENV-1 | Pass | `API-TF-r2/TF-04.json` | rejoin keeps run and conversation; leaving member's interrupt `accepted` and released | |
| TF-05 | DEC-006 | built server | same run | ENV-1 | Pass | `API-TF-r2/TF-05.json` | new run at `/scout`; the old one's send delivered | |
| TF-06 | AC-008 | built server | same run | ENV-1 | Pass | `API-TF-r2/TF-06.json` | coordinator `/scout` stored and in the snapshot | |
| TF-07 | AC-007, REQ-007 | built server | same run | ENV-1 | Pass | `API-TF-r2/TF-07.json` | for unparsable file, unparsable again after a valid edit, unknown agent and definition gone, each exactly one `TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '<id>' keeps its members: <reason>`; run unchanged | **O-1, O-2 resolved**; a later announcement while still broken adds no second line |
| TF-08 | AC-004, REQ-005 | built server, reopen, restart | same run | ENV-1 | Pass | `API-TF-r2/TF-08.json` | `Joined: editor at /editor.` after reopen; `Left: editor …` after restart | |
| TF-09 | AC-005 | delegated copy | same run | ENV-1 | Pass | `API-TF-r2/TF-09.json` | `copiedFrom: "team_definition"`; copy follows | |
| TF-10 | AC-001 (app editor) | GraphQL save | same run | ENV-1 | Pass | `API-TF-r2/TF-10.json` | `/extra` joined; notice; rule | |
| TF-11 | AC-003, SR-010 | Stop while leaving | same run | ENV-1 | Pass | `API-TF-r2/TF-11.json` | `rowsLeaving` tagged; after the Stop `rowsAfterStop: []` (marker still on disk, `markerAfterStop`: the member, no write); after reopening `markerAfterReopen: []` | new |
| TF-12 | AC-003, AC-004, SR-010 | server restart while leaving | same run | ENV-1 | Pass | `API-TF-r2/TF-12.json`, `API-TF-r2/server-output.log` | after the restart `rowsAfterRestart: []`; after reopening `markerAfterReopen: []` | new |
| TFL-01 | AC-001, AC-006, DEC-005 (real) | Codex lead, native AutoByteus new member | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CODEX_E2E=1 RUN_AUTOBYTEUS_TEAM_FOLLOWS_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault TEAM_FOLLOWS_LIVE_E2E_EVIDENCE_DIR=<evidence>/API-TFL-r2 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | Pass | `API-TFL-r2/API-TFL-r2-run.log`, `API-TFL-r2/TFL-01.json` | `Tests  2 passed (2)`; reviewer on `autobyteus`/`claude-haiku-5-5`; lead answered the code | |
| TFL-02 | AC-003, AC-010 (real) | Codex writer, auto-execute off | same run | ENV-2 | Pass | `API-TFL-r2/TFL-02.json`, `API-TFL-r2/TFL-02-diagnostics.json` | two approvals answered while leaving (`approvedWhileLeaving`); `delivered: true`; `released: true`; the real lead read the exact refusal | approvals answered through the team stream (the server path) |
| TFU-01 | AC-009 | rendered app | `node tickets/in-progress/team-run-follows-definition/probes/team-follows-ui-probe.mjs --output-dir <evidence>/API-TFU-r2` (attempt 3) | ENV-3 | Pass | `API-TFU-r2/team-follows-ui-evidence.json`, `TFU-01-*.png` | reviewer row appears without a reload, writer row goes, reviewer answers, the Team tab keeps `WRITER-NOTE-…` | |
| TFU-02 | AC-008 | rendered app | same run | ENV-3 | Pass | `TFU-02-*.png` | the new coordinator is focused after a fresh load and answers | |
| TFU-03 | AC-003, SR-010 | rendered app: team's own rows (`WorkspaceStableExecutionRow`) | same run | ENV-3 | **Fail** | `TFU-03-a-leaving-tag.png`, `TFU-03-b-leaving-member-opened.png`, evidence JSON `cases["TFU-03-observed"]` | the row shows `Leaving` (title "Removed from the team; finishing its current turn"); **opening it: the chat stays on the lead; the row reads `R reviewer Leaving Couldn't load activity. Retry`** (F-3); released and gone afterwards | **F-2's tag resolved; F-3** |
| TFU-04 | AC-003, DEC-002 (real Codex) | rendered app, pending approval while leaving | same run | ENV-3 | **Fail** | `TFU-04-a-approval-pending.png`, `TFU-04-b-coder-leaving.png`, `TFU-04-c-leaving-coder-opened.png`, `TFU-04-d-coder-released.png`, `cases["TFU-04-observed"]` | the coder's approval is pending; removed while the user is on the lead: row `C coder Leaving`; **opening it: `Couldn't load activity. Retry`, no Approve** (`approvalShown: false`); approved through the team stream instead: the command ran (`outside-….txt` = `leaving`), the coder was released, its row went | F-3: the user cannot answer the leaving member's approval in the app |
| TFU-05 | AC-005, SR-010 | rendered app: delegated copy rows (`WorkspaceDelegatedRunRow`) | same run | ENV-3 | Pass | `TFU-05-a-copy-member-leaving.png`, `TFU-05-b-copy-member-released.png` | under the host run, the copy's `scout` row is tagged Leaving (server row `leaving: true`, rendered tag); after the interrupt it goes; `copiedFrom: "team_definition"` | new |
| TFU-06 | SR-010 | rendered app: Stop while leaving | same run | ENV-3 | Pass | `TFU-06-a-leaving.png`, `TFU-06-b-stopped.png` | tagged, then after the Stop no leaving row; the marker is cleared when the user's message reopens the team | new |
| API-PEER | AC-005 (peer copy), regression | two built servers | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> REMOTE_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch --reporter=verbose` | ENV-4 | Pass | `API-PEER-r2/API-PEER-r2-run.log`, `API-PEER-r2/API-PEER-r2-RC-51.json` | `Tests  51 passed (51)`; RC-51 as in round 1 | |
| API-REG | preserved behavior | three existing E2E suites | as round 1 | ENV-1 | Pass | `API-REG-r2/*.log` | `14 passed (14)`; `2 passed \| 1 skipped (3)` (its Claude-gated case); `8 passed (8)` | |
| API-TC | test code | `pnpm -C autobyteus-server-ts typecheck` | — | ENV-1 | Pass | `API-TC-r2/API-TC-r2-server-typecheck.log` | `1005 in 314 files (baseline 1005 in 314 files)`, `[typecheck] PASS` | |
| API-FS | changed build inputs (contracts package and its `dist`) | fresh clone, every step of `build-linux-arm64` | fresh `git clone --no-local`, checkout `8789b97a41`; every `run:` step of the job parsed from the workflow, in order (runner pieces emulated as in round 1 attempt 4) | ENV-5 | Pass | `API-FS-r2/API-FS-r2-fresh-start-build.log` | `[typecheck] PASS`; `building target=AppImage arch=arm64`; `Verified signed desktop release 1.5.14-beta.3 arm64`; `Validated … latest-linux-arm64.yml`; `Packaged server startup validation passed` | units step root-limited (`node --test` 47 pass / 27 fail "Trusted login home required", uid 0 refused; `go test` pass); `libz.so` provided for the AppImage verify (FU-004); macOS and x64 jobs need the runner: Not Tested |
| API-NF | D-SCOPE (configured-placement copy, application run not followed) | — | — | — | Not Tested | — | — | as round 1: unit-covered (planner) |

## Findings

### F-1 (round 1): resolved

TF-02 and TF-03 get the exact refusal with `COLLABORATION_TARGET_NOT_FOUND` by run ID, for former and leaving members alike.

### F-2 (round 1): the tag is resolved; opening the row is still broken (F-3)

The app now shows a leaving member's row with the "Leaving" tag:
- the team's own rows (TFU-03);
- a delegated copy's rows under its delegating run (TFU-05).

After a Stop or a restart there is no leaving row, and reopening clears the marker (TF-11, TF-12, TFU-06).

### F-3: a "Leaving" row does not open the member, so its pending approval cannot be answered in the app (AC-003, DEC-002, design SR-010 "still opens")

- Expected (SR-010, CRR-003): the row with the "Leaving" tag still opens the member, so the user can answer its pending approval and let it finish its turn.
- Observed:
  - TFU-03 and TFU-04: clicking the row leaves the chat on the previously focused member, and the row shows "Couldn't load activity. Retry". The real Codex coder's pending approval was not shown, so the user had no way to approve it in the app. It finished only because the probe approved it through the team stream.
  - TF-03, at the server: the reads the app makes when a member is opened refuse a leaving member: `getTeamMemberRunProjection` and `getTeamMemberFileChanges` return "AgentRun '…' has no configured launch placement or recorded source." (`CollaborationMemberNotFoundError`). The backend log of TFU shows the same 8 times.
- Cause (read, not changed): `TeamMemberRunViewProjectionService.requireLocation` (`src/run-history/services/team-member-run-view-projection-service.ts:128-141`) finds the agent but requires `locatedExecutionSource(location)`. A member stored under `formerMembers` (where SR-010 keeps a leaving member, with `leaving: true`) is neither a configured placement in `members` nor a delegated copy with a recorded source. So the member's projection, active-trace page, file changes and file-change entry are all refused.
- Preliminary classification: `Local Fix` (implementation). The design says the row opens; the read path does not accept a leaving member. Owner: implementation engineer.
- Durable check: TF-03's `openedProjection` and `openedFileChanges` assertions fail until it is fixed. TFU-03 and TFU-04 then prove it in the app.

## Observations

- O-1, O-2 (round 1): resolved by IR-002 (TF-07).
- O-3 (round 1, restart hang): not seen in round 2. The restarts in TF-08, TF-12 and the probe all started.
- O-4: the Team tab is filtered by the focused member (pre-existing).
- O-5 / FU-004 (outside this ticket): the Linux arm64 AppImage runtime needs `libz.so`.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only / accepted-risk part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | TF-01, TF-10, TFL-01, TFU-01 | Proven | — |
| AC-002 | Yes | TF-02, TFU-01 | Proven | — |
| AC-003 | Yes | TF-03, TF-04, TF-11, TF-12, TFL-02 (server); TFU-03, TFU-04, TFU-06 (app) | **Not Proven** (F-3: a leaving member cannot be opened in the app, so its approval cannot be answered there) | — |
| AC-004 | Yes | TF-08, TF-12 | Proven | — |
| AC-005 | Yes | TF-09, TFU-05, API-PEER RC-51 | Proven | — |
| AC-006 | Yes | TF-01, TF-02, TF-08, TF-10, TFL-01 | Proven | — |
| AC-007 | Yes | TF-07 | Proven | — |
| AC-008 | Yes | TF-06, TFU-02 | Proven | — |
| AC-009 | Yes | TFU-01 | Proven | — |
| AC-010 | Yes | TF-02, TF-03, TFL-02 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 90% | every AC at real boundaries | AC-003 (F-3) | the F-3 fix, then TF-03, TFU-03, TFU-04 |
| Changed-boundary execution directness | 85% | 97% | package edits, app save, real tools, stream, restart, real runtimes, rendered app, two nodes | — | — |
| Cross-boundary integration realism | 80% | 95% | real Codex and AutoByteus; real Codex approval in the app | — | — |
| Environment, configuration, identity, fixtures | 85% | 95% | built servers, own roots, launch credentials | root container | — |
| Failure, edge-case, lifecycle, recovery | 85% | 92% | leaving, Stop and restart while leaving, unusable definitions, rejoin, swap | F-3 | — |
| User-surface, browser, desktop-shell | 70% | 75% | TFU-01, 02, 05, 06 | F-3 (TFU-03, TFU-04) | the fix |
| Durable regression coverage | 85% | 95% | TF-11/12 and the F-3 check added; TFU probe extended | — | — |

- Overall post-repository confidence: 82%. Overall final confidence: 91% (simple average).
- Every critical acceptance criterion directly proven: `No` (AC-003).
- Final categories below 90%: user surface (75%). Target met: `No`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Modes: `Live API`, `Browser` (with a real Codex member), two nodes. It found F-3, which repository tests miss: the IR-002 web spec renders the tag, but no test opens a leaving member.

## Persisted-Data Transition Checks

- `Directly Usable — No Migration`. The new optional `formerMembers[i].leaving: true` is written while a member is leaving and cleared on release (TF-03) and on restore (TF-11, TF-12). No compatibility fallback was observed.

## Compatibility / Legacy Scope Check

- `No` compatibility-only behavior. `TeamMembersPanel.vue` (dead in the app) was removed in IR-002.

## Durable Coverage Changed In The Codebase

| Path | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` | Updated (round 2, commit `8789b97a41`) | TF-02, TF-03 (run-ID refusal, marker, rows, F-3 check), TF-07 (one warning per reason), TF-11, TF-12 (new) |
| `autobyteus-server-ts/tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts` | Unchanged since round 1 | TFL-01, TFL-02 |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (RC-51) | Unchanged since round 1 | API-PEER |
| Ticket probe `probes/team-follows-ui-probe.mjs` | Updated (TFU-03 rewritten for the tag; TFU-04..TFU-06 new) | TFU-01..TFU-06 |

## Dependencies Mocked Or Emulated

As round 1 (the scripted AGY CLI for deterministic cases). The probe's TFU-04 uses real Codex.

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Suite roots, servers, live root, probe roots (incl. throwaway `CODEX_HOME`s) | Yes | suites' `afterAll`, probe `finally` | removed (probe cleanup in its evidence JSON) |
| Two-server suite evidence dir `/tmp/tf2-peer-ev` | Yes | RC-51 entry extracted, folder removed | removed |
| Fresh clone `/root/.autobyteus-e2e/tf-fs-job`, `/tmp/tf-libz` | Yes | removed after API-FS | removed |
| The user's running app (port 8000, `/home/autobyteus/data`) | No | untouched | — |

## Preliminary Classification (On `Fail`)

- F-3: `Local Fix`, implementation engineer: let the member reads (projection, active trace page, file changes, file-change entry) locate a leaving member stored under `formerMembers`.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-003 (F-3)
- Evidence decisions requested: `None`
- Preliminary classification and owner: F-3 `Local Fix`, implementation engineer
- Next recipient from `get_handoff_rules`: the code reviewer, for failure-origin review
- Notes: next round, rerun TF-03 (its F-3 assertions), TFU-03 and TFU-04, plus anything the fix touches, by impact.
