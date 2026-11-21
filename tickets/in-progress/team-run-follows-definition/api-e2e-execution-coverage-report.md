# API/E2E Execution Coverage Report

The run record and the result of the latest round. The plan is `api-e2e-coverage-investigation.md`. The history is in `api-e2e-revision-record.md`: round 1 found F-1 and F-2, round 2 found F-3.

## Round

- Coverage investigation: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 3. Code review CRR-006 passed the final source `6c7af4a384`:
  - IR-003 `072bdb7217`: the CR-003 fix for my F-3;
  - IR-004 `6c7af4a384`: cleanup only.
  Reviewed at `51c10dd2c1`.
- Prior round reviewed: round 2 (API-REV-002, Fail: F-3). Rechecked first: TF-03 (its F-3 assertions), TFU-03 and TFU-04.
- Rerun plan (by impact): the round's diff `8789b97a41..6c7af4a384` changes `team-run-execution-tree-location-service.ts` and `team-member-run-view-projection-service.ts`. The location service locates every team agent, current and former. Its readers are member projections, file changes, run history, the Memory page and memory search. So I reran:
  - every case that reads them: all TF, TFU and TFL cases, the peer suite, the regression suites;
  - the `memory` and `run-history` E2E folders;
  - typecheck.

  No build input changed since round 2's fresh-start build of `8789b97a41` (`git diff --name-only 8789b97a41..HEAD` against the build-input list: none), so API-FS round 2 still holds.
- Deviations from the plan: none. TF-02 gained two assertions for this round's change: a stopped former member opens by run ID, and the Memory page attributes it.
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/evidence/`. Round 3 is in `*-r3`; round 2's API-FS is in `API-FS-r2`; earlier rounds' folders stay as history.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | source `6c7af4a384` (HEAD `51c10dd2c1` adds review docs only); tests as committed in `44fd8d073a` | Linux 6.12 aarch64 container, root, Node v22.23.3, pnpm 10.28.2 | built server rebuilt from this source; scripted AGY CLI | temp data root, HOME, DB per suite; local package imported and edited on disk |
| ENV-2 | as ENV-1 | as ENV-1 | real Codex (`gpt-6.1-terra`, low), native AutoByteus (`claude-haiku-5-5`, test vault) | data root outside `/tmp`, throwaway `CODEX_HOME`; removed |
| ENV-3 | as ENV-1; probe as committed with this report | as ENV-1 | built server + `nuxt dev` + headless Chromium 1512×952; scripted AGY; real Codex for TFU-04 | probe root `/root/.autobyteus-e2e/team-follows-ui-probe-*`; removed |
| ENV-4 | as ENV-1 | as ENV-1 | two-server suite | — |
| ENV-5 | `8789b97a41` fresh clone (round 2) | as ENV-1 | every step of `build-linux-arm64` | still valid: no build input changed since |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | all (unit/integration) | server units | Reused IR-003/IR-004 checks (implementation handoff IMP-18..IMP-22) | — | Pass | — | — | no source change after `6c7af4a384` |
| TF-01 | AC-001, AC-006 | built server, package file edit | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<wt>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs TEAM_FOLLOWS_E2E_EVIDENCE_DIR=<evidence>/API-TF-r3 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `API-TF-r3/API-TF-r3-run.log`, `API-TF-r3/TF-01.json` | `Tests  12 passed (12)`; `leadInput` has `Your team changed: its definition was updated.\nJoined: reviewer at /reviewer.\nYour handoff rules changed; call get_handoff_rules to read them.` | |
| TF-02 | AC-002, AC-010, AC-006, REQ-002 | built server | same run | ENV-1 | Pass | `API-TF-r3/TF-02.json`, `API-TF-r3/TF-02-memory-page.json` | `byAddress`, `byRunId`: `COLLABORATION_TARGET_NOT_FOUND` + `writer (/writer) is no longer a member of your team: …`; `projection.ok: true` with the writer's `Reply OK.`; Memory page `writerTarget` `{"memberAddress": "/writer", …, "agentDefinitionId": "tf-writer-…"}` | the former member opens by run ID (new this round) |
| TF-03 | AC-003, DEC-002, AC-010, SR-010 | built server | same run | ENV-1 | Pass | `API-TF-r3/TF-03.json` | `openedProjection: "ok"`, `openedFileChanges: "ok"`; `refusedByRunId.code: COLLABORATION_TARGET_NOT_FOUND`; `markerWhileLeaving` = the reviewer; tagged row; `markerAfterRelease: []`; the delayed send delivered | **F-3 resolved** |
| TF-04 | DEC-007, AC-003 | built server | same run | ENV-1 | Pass | `API-TF-r3/TF-04.json` | rejoin keeps run and conversation; the leaving member's interrupt `accepted`, released | |
| TF-05 | DEC-006 | built server | same run | ENV-1 | Pass | `API-TF-r3/TF-05.json` | new run at `/scout`; the old run's send delivered | |
| TF-06 | AC-008 | built server | same run | ENV-1 | Pass | `API-TF-r3/TF-06.json` | coordinator `/scout` in the tree and the snapshot | |
| TF-07 | AC-007, REQ-007 | built server | same run | ENV-1 | Pass | `API-TF-r3/TF-07.json`, `API-TF-r3/server-output.log` | one `TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '<id>' keeps its members: <reason>` each for unparsable, unparsable again, unknown agent, definition gone; run unchanged | |
| TF-08 | AC-004, REQ-005 | reopen and server restart | same run | ENV-1 | Pass | `API-TF-r3/TF-08.json` | `Joined: editor at /editor.` after reopen; `Left: editor (/editor); …` after restart | |
| TF-09 | AC-005 | delegated copy | same run | ENV-1 | Pass | `API-TF-r3/TF-09.json` | `copiedFrom: "team_definition"`; the copy follows add/remove | |
| TF-10 | AC-001 (app editor) | GraphQL save | same run | ENV-1 | Pass | `API-TF-r3/TF-10.json` | `/extra` joined, notice, rule | |
| TF-11 | AC-003, SR-010 | Stop while leaving | same run | ENV-1 | Pass | `API-TF-r3/TF-11.json` | `rowsAfterStop: []`; `markerAfterReopen: []` | |
| TF-12 | AC-003, AC-004, SR-010 | restart while leaving | same run | ENV-1 | Pass | `API-TF-r3/TF-12.json` | `rowsAfterRestart: []`; `markerAfterReopen: []` | |
| TFL-01 | AC-001, AC-006, DEC-005 (real) | Codex lead, native AutoByteus new member | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CODEX_E2E=1 RUN_AUTOBYTEUS_TEAM_FOLLOWS_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault TEAM_FOLLOWS_LIVE_E2E_EVIDENCE_DIR=<evidence>/API-TFL-r3 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | Pass | `API-TFL-r3/API-TFL-r3-run.log`, `API-TFL-r3/TFL-01.json` | `Tests  2 passed (2)`; reviewer launched `autobyteus`/`claude-haiku-5-5`; the lead answered the code | |
| TFL-02 | AC-003, AC-010 (real) | Codex writer, auto-execute off | same run | ENV-2 | Pass | `API-TFL-r3/TFL-02.json`, `API-TFL-r3/TFL-02-diagnostics.json` | two approvals answered while leaving; `delivered: true`; `released: true`; the real lead read the exact refusal | |
| TFU-01 | AC-009 | rendered app | `node tickets/in-progress/team-run-follows-definition/probes/team-follows-ui-probe.mjs --output-dir <evidence>/API-TFU-r3` | ENV-3 | Pass | `API-TFU-r3/team-follows-ui-evidence.json`, `TFU-01-*.png` | reviewer row appears without a reload, writer row goes, reviewer answers; the Team tab keeps `WRITER-NOTE-…` | |
| TFU-02 | AC-008 | rendered app | same run | ENV-3 | Pass | `TFU-02-*.png` | the new coordinator is focused after a fresh load and answers | |
| TFU-03 | AC-003, SR-010 | rendered app: team's own rows | same run | ENV-3 | Pass | `TFU-03-a-leaving-tag.png`, `TFU-03-b-leaving-member-opened.png`, `TFU-03-c-released.png`, `cases["TFU-03-observed"]` | row `R reviewer Leaving now` (tag "Leaving", title "Removed from the team; finishing its current turn"); opening it: header `R reviewer Running`, `opened: true`, `stopVisible: true`; after the Stop the row goes | **F-3 resolved in the app** |
| TFU-04 | AC-003, DEC-002 (real Codex) | rendered app: approval while leaving | same run | ENV-3 | Pass | `TFU-04-a-approval-pending.png`, `TFU-04-b-coder-leaving.png`, `TFU-04-c-leaving-coder-opened.png`, `TFU-04-d-coder-released.png`, `cases["TFU-04-observed"]` | after the removal the user opens the `C coder Leaving` row: `run_bash` with **Deny / Approve** shown (`approvalShown: true`); the user approves in the app (`approvals: ["run_bash", "another"]`, `approvedByStream: []`); `outside-….txt` = `leaving`; the row goes | the stream fallback was not used |
| TFU-05 | AC-005, SR-010 | rendered app: delegated copy rows | same run | ENV-3 | Pass | `TFU-05-a-copy-member-leaving.png`, `TFU-05-b-copy-member-released.png` | the copy member's row under the host run is tagged Leaving; it goes after the interrupt | |
| TFU-06 | SR-010 | rendered app: Stop while leaving | same run | ENV-3 | Pass | `TFU-06-a-leaving.png`, `TFU-06-b-stopped.png` | no leaving row after the Stop; the marker is cleared on reopening | |
| API-PEER | AC-005 (peer copy), regression | two built servers | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> REMOTE_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch --reporter=verbose` | ENV-4 | Pass | `API-PEER-r3/API-PEER-r3-run.log`, `API-PEER-r3/API-PEER-r3-RC-51.json` | `Tests  51 passed (51)`; RC-51 `copiedFrom: "team_definition"`, former `/reviewer`, exact refusal | |
| API-REG | preserved behavior; readers of the changed location service | existing E2E suites and folders | `collaboration-prompt-wording`, `delegated-team-lazy-member-activation`, `unclean-shutdown-delegated-team-restore`, `memory-explorer-graphql`; folders `tests/e2e/memory`, `tests/e2e/run-history` (scripted AGY, clean env) | ENV-1 | Pass (one out-of-scope environment failure, see Notes) | `API-REG-r3/*.log` | `14 passed (14)`; `2 passed \| 1 skipped (3)`; `8 passed (8)`; `3 passed (3)`; run-history folder `Tests  28 passed \| 2 skipped (30)`; memory folder `Tests  1 failed \| 39 passed \| 3 skipped (43)` | The one failure is `episodic-catalog.e2e.test.ts` EC-04, "Timed out waiting for write failure logged". It makes `episodic/` read-only with `chmod 0o555`, which root ignores, so no write fails. This container runs as root. Not this ticket, which touches no episodic code. Follow-up FU-005 |
| API-TC | test code | `pnpm -C autobyteus-server-ts typecheck` | — | ENV-1 | Pass | `API-TC-r3/API-TC-r3-server-typecheck.log` | `1005 in 314 files (baseline 1005 in 314 files)`, `[typecheck] PASS` | |
| API-FS | changed build inputs (contracts package and its `dist`) | fresh clone, every step of `build-linux-arm64` | round 2, at `8789b97a41` | ENV-5 | Pass (round 2, still valid) | `API-FS-r2/API-FS-r2-fresh-start-build.log` | `Verified signed desktop release 1.5.14-beta.3 arm64`; `Packaged server startup validation passed` | The units step is root-limited: `node --test` 27 tests refuse uid 0. `libz.so` was provided for the AppImage verify (FU-004). macOS and x64 jobs need the runner: Not Tested |
| API-NF | design D-SCOPE (a configured-placement copy and an application run do not follow) | — | — | — | Not Tested | — | — | Not run end to end. Creating these needs an Org in-run placement delegation and an application launch. Covered by the planner unit cases (reused); the check is a run-kind check before any plan |

## Findings

- F-1 (round 1): resolved (TF-02, TF-03, TFL-02).
- F-2 (round 1): resolved with SR-010. The "Leaving" tag shows on the team's own rows and on a copy's rows (TFU-03, TFU-05). Stop and restart leave no leaving row (TF-11, TF-12, TFU-06).
- F-3 (round 2): resolved. A leaving member opens from its row; its pending approval is answered in the app; a stopped former member opens by run ID (TF-02, TF-03, TFU-03, TFU-04).
- No open finding.

## Observations

- O-1, O-2: resolved in round 2 (TF-07).
- O-4: the Team tab is filtered by the focused member (pre-existing).
- FU-004 (outside this ticket, urgent): the Linux arm64 AppImage runtime needs `libz.so`.
- FU-005 (new, outside this ticket): `episodic-catalog.e2e.test.ts` EC-04 cannot pass in a root container (it relies on `chmod 0o555`).
- Side effect confirmed (code review): the Memory page now attributes a former member to its own agent definition (TF-02 `writerTarget`).

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only / accepted-risk part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | TF-01, TF-10, TFL-01, TFU-01 | Proven | — |
| AC-002 | Yes | TF-02 (address refusal; former member's history by run ID and on the Memory page), TFU-01 | Proven | — |
| AC-003 | Yes | TF-03, TF-04, TF-11, TF-12, TFL-02, TFU-03, TFU-04, TFU-06 | Proven | — |
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
| Requirement and acceptance-criteria proof | 85% | 97% | every AC directly at real boundaries | D-SCOPE not-followed kinds unit-only (API-NF) | an Org placement / application run E2E |
| Changed-boundary execution directness | 85% | 97% | package edits, app save, real tools, stream, restart, real runtimes, rendered app, two nodes | — | — |
| Cross-boundary integration realism | 80% | 96% | real Codex and AutoByteus; real Codex approval answered in the app | — | — |
| Environment, configuration, identity, fixtures | 85% | 95% | built servers, own roots, launch credentials, test vault | root container (FU-005, release units) | a non-root host |
| Failure, edge-case, lifecycle, recovery | 85% | 95% | leaving, Stop and restart while leaving, unusable definitions, rejoin, swap, interrupt | follower-step throw after commit (declared) | — |
| User-surface, browser, desktop-shell | 75% | 93% | TFU-01..TFU-06 with a real Codex approval | Electron shell not run (no shell change); narrow viewports not inspected | — |
| Durable regression coverage | 85% | 95% | TF-01..TF-12, TFL-01/02, RC-51; ticket probe | the probe is ticket-owned, not a package script | — |

- Overall post-repository confidence: 83%. Overall final confidence: 95.4% (simple average).
- Every critical acceptance criterion directly proven: `Yes`.
- Final categories below 90%: none.
- Target met: `Yes`.
- Confidence-limiting residual risks:
  - D-SCOPE's not-followed kinds are unit-covered only;
  - a follower step that throws after a commit skips the rest of that change (declared);
  - FU-004 and FU-005 are outside this ticket.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed).
- Modes: `Live API` (built servers, real runtimes, two nodes) and `Browser` (rendered app, with a real Codex member).
- Gap addressed: the repository checks don't exercise the real triggers, the runtimes, restarts, peers or the rendered member list. This validation found F-1, F-2 and F-3, now all resolved.

## Persisted-Data Transition Checks

- `Directly Usable — No Migration`.
- Optional fields: `formerMembers` and `copiedFrom` (rounds 1–3), and `formerMembers[i].leaving: true`, written while a member is leaving and cleared on release and on restore (TF-03, TF-11, TF-12).
- The new location reads take a former member from its stored node (TF-02, TF-03).
- No compatibility fallback was observed.

## Compatibility / Legacy Scope Check

- `No` compatibility-only behavior. `TeamMembersPanel.vue` was removed in IR-002.

## Durable Coverage Changed In The Codebase

| Path | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` | Added (round 1, `443f1c2c0f`); updated (round 2, `8789b97a41`; round 3, `44fd8d073a`) | TF-01..TF-12 |
| `autobyteus-server-ts/tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts` | Added (round 1, `443f1c2c0f`) | TFL-01, TFL-02 |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated: RC-51 (round 1, `443f1c2c0f`) | API-PEER |
| Ticket probe `tickets/in-progress/team-run-follows-definition/probes/team-follows-ui-probe.mjs` | Ticket-owned (not a package script) | TFU-01..TFU-06 |

- Added or updated paths attached for proportional test-code review: `Yes`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| AGY CLI (TF, TFU, PEER, REG) | scripted fixture | deterministic tool calls and inputs | real runtimes covered by TFL and TFU-04 |
| Release runner (API-FS) | the job's steps run locally, runner pieces emulated | no runner here | root-limited signing units; macOS/x64 not run |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Suite roots, servers, live root, probe roots, throwaway `CODEX_HOME`s | Yes | suites' `afterAll`, probe `finally` | removed (`/root/.autobyteus-e2e` holds nothing of these runs) |
| Two-server evidence dir `/tmp/tf3-peer-ev` | Yes | RC-51 entry extracted | removed |
| The user's running app (port 8000, `/home/autobyteus/data`) | No | untouched | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, user-only or accepted as unverified risk: `None`
- Evidence decisions requested: `None`
- Next recipient from `get_handoff_rules`: the code reviewer (proportional test-code review)
- Notes: final confidence 95.4%; follow-ups FU-004 (urgent) and FU-005 are outside this ticket.
