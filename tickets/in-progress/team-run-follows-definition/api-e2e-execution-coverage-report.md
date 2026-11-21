# API/E2E Execution Coverage Report

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-001
- Prior round reviewed: N/A
- Deviations from the plan, and why:
  - The rendered probe uses the app's real member list, the sidebar run tree (`workspace-team-member-<teamRunId>-<address>` rows). `TeamMembersPanel.vue` is mounted nowhere in the app (`grep` of `components`, `layouts`, `pages`: only its own file and the generated component registry), so the planned check of its "Leaving" tag became a check of what the app shows (finding F-2).
  - AC-007 was widened to three unusable-definition kinds (unparsable file, unknown agent, definition gone) after the first run showed that an unparsable file never reaches the run (observation O-1).
  - Peer-started copy (AC-005): a new case RC-51 in the existing two-server suite, which already starts a peer-started copy; the whole suite ran (also a regression of remote Teams).
  - Configured-placement copies and application-bound Team runs (not followed) were not run end to end (see Cases, API-NF).
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/evidence/` (`API-*` sub-folders)

## Routing Classification

- Task size: `Large`; Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (on `Fail`: failure-origin review by the code reviewer)
- Proportional test-code review decision: `Not Applicable` this round (result `Fail`; the added suites go with the failure package and are reviewed with the next passing round)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | source `4773d95936` (= implementation `6b46ec5bdd`; later commits are ticket docs); tests as committed in `443f1c2c0f` | Linux 6.12 aarch64 container, root, Node v22.23.3, pnpm 10.28.2 (corepack) | built server `dist/app.js` of this worktree in its own process; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | temp data root, HOME and DB per suite; local agent package imported with `importAgentPackage(LOCAL_PATH)` and edited on disk |
| ENV-2 | as ENV-1 | as ENV-1 | built server; real Codex app-server (codex-cli 0.167.0, `gpt-6.1-terra`, low) and native AutoByteus (`claude-haiku-5-5`, Anthropic key from the test vault, read-only) | data root `/root/.autobyteus-e2e/team-follows-live-*` (outside `/tmp`), throwaway `CODEX_HOME` linking the host `auth.json`; removed after the run |
| ENV-3 | as ENV-1 | as ENV-1 | built server + `nuxt dev` (desktop renderer) + headless Chromium 1512×952 (`/usr/bin/chromium`), scripted AGY | probe-owned stack and data, removed (`team-follows-ui-evidence.json` cleanup) |
| ENV-4 | as ENV-1 (+ RC-51 in `443f1c2c0f`) | as ENV-1 | two-server suite: built servers alpha/beta (+ delta, epsilon, gamma), scripted AGY | Brief Studio importable package from `test:integration:prepare` |
| ENV-5 | `443f1c2c0f` fresh clone | as ENV-1 | release job `build-linux-arm64` commands | see API-FS |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | all (unit) | server units | Reused IMP-02, IMP-03, IMP-05 | — | Pass | — | — | `git diff --name-only 6b46ec5bdd 4773d95936` touches only `tickets/` |
| API-R2 | AC-009 (component) | web specs | Reused IMP-08, IMP-09 | — | Pass | — | — | as API-R1; they test the view state and `TeamMembersPanel`, not what the app mounts (F-2) |
| API-R3 | AC-001/002/004/010 (faked backend) | integration | Reused IMP-04 | — | Pass | — | — | as API-R1; it calls `deliverToRunId` directly, so it does not reach the router path of F-1 |
| TF-01 | AC-001, AC-006 | built server: package file edit → listener → root; real tools; team stream | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<wt>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs TEAM_FOLLOWS_E2E_EVIDENCE_DIR=<evidence>/API-TF pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts --no-watch --reporter=verbose` (run 5) | ENV-1 | Pass | `API-TF/API-TF-run.log`, `API-TF/TF-01.json` | `✓ TF-01`; `leadInput` contains `Your team changed: its definition was updated.\nJoined: reviewer at /reviewer.\nYour handoff rules changed; call get_handoff_rules to read them.`; `writerInput` the same with `Your handoff rules are unchanged.`; `reviewerInput` has no notice; `secondLeadInput` none | in-band snapshot with `/reviewer` recorded in `snapshots` |
| TF-02 | AC-002, AC-010, AC-006, REQ-002 | built server | same run | ENV-1 | **Fail** | `API-TF/TF-02.json` | `byAddress`: exact refusal + `COLLABORATION_TARGET_NOT_FOUND` (pass); **`byRunId`: `"code": "TARGET_AGENT_RUN_NOT_ACTIVE"`, "No running agent has the run id '…', so the message was not sent. A stopped agent is not woken. …"** (F-1); `memory.ok: true` with the writer's earlier turn; `reviewerInput` has `Left: writer (/writer); messages to it are no longer delivered.` | Not delivered either way. All other assertions of the case pass (the run-ID ones are soft). A former member's live projection `getTeamMemberRunProjection` answers "has no configured launch placement or recorded source" (recorded in `projection`; its history is read through the Memory page's `getTeamMemberRunMemoryView`, as the handoff's deviation 1 says) |
| TF-03 | AC-003, DEC-002, AC-010 | built server | same run | ENV-1 | **Fail** | `API-TF/TF-03.json` | `stillLeavingWhenRefused: true`; `refused` = exact text (pass); `reviewerGotStop: false`, `reviewerGotByRunId: false` (receives nothing, pass); the delayed send `LATE-REVIEW-…` reached the lead; released from the view (pass); **`refusedByRunId`: `COLLABORATION_ROOT_NOT_ACTIVE`, "This work is stopping or has stopped, so the message or delegation was not sent."** (F-1) | |
| TF-04 | DEC-007, AC-003 | built server | same run | ENV-1 | Pass | `API-TF/TF-04.json` | same run ID back in `members`; conversation has two `Reply OK.`; `stillLeavingWhileHeld: true`; `interruptAck.state: "accepted"`; `released: true` | the leaving member's interrupt works |
| TF-05 | DEC-006 | built server | same run | ENV-1 | Pass | `API-TF/TF-05.json` | `newScout.agentDefinitionId` = `tf-alt-…`, new run ID; old run in `formerMembers`; the lead's `Reply OK.` reached only the new run; `LATE-SCOUT-…` delivered | |
| TF-06 | AC-008 | built server | same run | ENV-1 | Pass | `API-TF/TF-06.json` | `"coordinator": "/scout"`; the in-band snapshot's `coordinator_address` `/scout` | what the user's composer targets: TFU-02 |
| TF-07 | AC-007, REQ-007 | built server | same run | ENV-1 | Pass | `API-TF/TF-07.json`, `API-TF/server-output.log` | members and coordinator unchanged in all four states; `broken.definition.loadIssues`: `DEFINITION_CONTRACT_INVALID`, `usingLastGood: true`, `broken.serverLines: []`; `ghost.serverLines`: `TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '…' keeps its members (AgentDefinition 'tf-no-such-agent-…' cannot be loaded …)`; `gone.serverLines`: `… Team definition 'tf-team-…' was not found.` | O-1, O-2 |
| TF-08 | AC-004, REQ-005 | built server, stop/reopen and process restart | same run | ENV-1 | Pass | `API-TF/TF-08.json`, `API-TF/server-stops.json` | `whileStopped: false`; `reopened.first` starts `Your team changed: its definition was updated.\nJoined: editor at /editor.`; after the restart `restarted.first` has `Left: editor (/editor); …`; `/editor` in `formerMembers` | reopened by the user's message on the team stream (the app's path); stops exit 0 by SIGTERM within 0.5 s. O-3 |
| TF-09 | AC-005 | built server: delegated copy by `delegate_task` | same run | ENV-1 | Pass | `API-TF/TF-09.json` | `copiedFrom: "team_definition"`; the copy gains `…/checker` and keeps `…/scout` as former; refusal text; the copy's new member answers | the standalone run followed the same edit |
| TF-10 | AC-001 (app editor) | GraphQL `updateAgentTeamDefinition` of a user's own Team | same run | ENV-1 | Pass | `API-TF/TF-10.json` | `/extra` in the stored tree; the notice with `Joined: extra at /extra.`; rule `Ask the extra member.` | |
| TFL-01 | AC-001, AC-006, DEC-005 (real) | Codex lead, native AutoByteus new member | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CODEX_E2E=1 RUN_AUTOBYTEUS_TEAM_FOLLOWS_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault TEAM_FOLLOWS_LIVE_E2E_EVIDENCE_DIR=<evidence>/API-TFL pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts --no-watch --reporter=verbose` (run 4) | ENV-2 | Pass | `API-TFL/API-TFL-run.log`, `API-TFL/TFL-01.json` | `reviewerLaunch.runtimeKind: "autobyteus"`, `llmModelIdentifier: "claude-haiku-5-5"` (agent default, DEC-005); `leadConversation` ends with the review code; `leadNotice` `Joined: reviewer at /reviewer.` | the real lead handed off to a member added while it ran |
| TFL-02 | AC-003, AC-010 (real) | Codex writer with auto-execute off | same run | ENV-2 | Pass | `API-TFL/TFL-02.json`, `API-TFL/TFL-02-diagnostics.json` | `approvedWhileLeaving`: 2 invocations (`run_bash`, then `send_message_to`), each `TOOL_APPROVED`; the file `outside-….txt` holds `leaving`; `delivered: true`; `released: true`; `leadAfterRefusal` contains `writer (/writer) is no longer a member of your team: …` | run 3 (`TFL-02-diagnostics-run3.json`) showed the writer's `send_message_to` also waits for approval; the test then answered every request, as a user does |
| TFU-01 | AC-009 | rendered app (sidebar member rows, Team tab, composer) | `node tickets/in-progress/team-run-follows-definition/probes/team-follows-ui-probe.mjs --output-dir <evidence>/API-TFU` (run 4) | ENV-3 | Pass | `API-TFU/team-follows-ui-evidence.json`, `TFU-01-a-before.png`, `TFU-01-b-after-change.png`, `TFU-01-c-reviewer-answered.png`, `TFU-01-d-team-tab.png` | before: rows `/lead`, `/writer`; after the change (no reload): `/lead`, `/reviewer`; header `reviewer Offline` before its first message, then its `OK`; the Team tab (lead focused) still shows `WRITER-NOTE-…` "from writer" | the Team tab lists the focused member's messages (O-4) |
| TFU-02 | AC-008 | rendered app | same run | ENV-3 | Pass | `TFU-02-a-new-coordinator.png`, `TFU-02-b-coordinator-answered.png` | after a fresh load the focused member (chat header) is `reviewer`, the new coordinator; the composer message is answered by it | |
| TFU-03 | AC-003 visibility (design § Member States, AR-004), N-8 | rendered app | same run | ENV-3 | **Fail** | `TFU-03-b-while-leaving.png`, `team-follows-ui-evidence.json` (`cases["TFU-03-observed"]`) | while the server's snapshot has the reviewer `"leaving":true`: `rowsWhileLeaving` = only `/lead`; `marks`: `{"tags": 0, "membersPanels": 0, "word": false}`; header `reviewer Running`; `stopVisible: true`, released by the composer Stop | F-2 |
| API-PEER | AC-005 (peer-started copy), remote Team regression | two built servers | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> REMOTE_E2E_EVIDENCE_DIR=<evidence>/API-PEER pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch --reporter=verbose` | ENV-4 | Pass | `API-PEER/API-PEER-run.log`, `API-PEER/API-PEER-RC-51.json` | `Tests  51 passed (51)`; RC-51: `"copiedFrom": "team_definition"`, added `/reviewer` with the rule, then `"formerMembers": ["/reviewer"]` and the exact refusal | the full receipt and server logs were not kept (size, peer secrets); RC-51 entry extracted |
| API-REG | preserved behavior | existing E2E suites | `collaboration-prompt-wording`, `delegated-team-lazy-member-activation`, `unclean-shutdown-delegated-team-restore` (scripted AGY, clean env) | ENV-1 | Pass | `API-REG/API-REG-*.log` | `Tests  14 passed (14)`; `Tests  2 passed \| 1 skipped (3)` (the skip is its `RUN_CLAUDE_E2E` case); `Tests  8 passed (8)` | |
| API-TC | test code | server typecheck | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-TC/API-TC-server-typecheck.log` | `test-file errors: 1005 in 314 files (baseline 1005 in 314 files)`, `[typecheck] PASS` | after a type-only fix of the new suite's `stopServer` parameter |
| API-FS | changed build inputs (`autobyteus-team-stream-contracts/**`, `typecheck-baseline.json`) | fresh clone + every step of release job `build-linux-arm64` | fresh `git clone --no-local`, checkout `443f1c2c0f`; every `run:` step of `build-linux-arm64` parsed from `.github/workflows/release-desktop.yml`, in order, with `RUNNER_TEMP`/`GITHUB_ENV` emulated, `GITHUB_REPOSITORY` set, trust mode build-only, go1.27.4 first on `PATH` (setup-go) | ENV-5 | Pass | `API-FS/API-FS-fresh-start-build.log` (attempt 4); `API-FS-attempt1..3-superseded.log` | `[typecheck] PASS`; `building target=AppImage arch=arm64`; `Verified signed desktop release 1.5.14-beta.3 arm64`; `Validated … latest-linux-arm64.yml`; `Packaged server startup validation passed` | "Check native and signed-record units": `node --test` 47 pass / 27 fail with "Trusted login home required" (the signing-key generator refuses uid 0; this container runs as root), `go test` pass: root-limited, not this ticket. Verify AppImage passed only after `libz.so` was provided on `LD_LIBRARY_PATH` (the arm64 AppImage runtime needs the unversioned name: FU-004, outside this ticket). Attempt 1 skipped the trust step (my omission); attempt 2 stopped at the root-limited units step, and its continuation was cut by the app crash at 12:48 UTC; attempt 3 lacked Go 1.27.4 on `PATH`. macOS and x64 jobs need the runner: Not Tested |
| API-NF | design D-SCOPE (configured-placement copy and application-bound run not followed) | — | — | — | Not Tested | — | — | Creating a configured-placement copy needs an Org in-run placement delegation; an application-bound Team run needs an application launch. Covered by the planner unit cases (IMP-03: `copiedFrom: configured_placement` and an application run are not followed). Low risk: decided by a run-kind check before any plan |

## Findings

### F-1 — A message by run ID to a removed member is not refused with the former-member text (AC-010, design § Member States)

- Expected (design § Member States, `send_message_to` by run ID row; § Exact Texts): leaving and former members are refused with `<name> (<address>) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules for your current handoff rules.` and `COLLABORATION_TARGET_NOT_FOUND`.
- Observed: the message is not delivered, but:
  - a former member answers `TARGET_AGENT_RUN_NOT_ACTIVE`: "No running agent has the run id '…', so the message was not sent. A stopped agent is not woken. Use an exact run id you were given…" (TF-02);
  - a leaving member answers `COLLABORATION_ROOT_NOT_ACTIVE`: "This work is stopping or has stopped, so the message or delegation was not sent." (TF-03).
- Cause (read, not changed): `GlobalAgentRunMessageRouter.deliver` (`src/agent-communication/services/global-agent-run-message-router.ts`) sends a run-ID message through the sender's root only when `senderRoot.hasAgentExecution(targetAgentRunId)`. `RootTeamRun.hasAgentExecution` (`src/agent-team-execution/domain/root-team-run.ts:226-228`) answers through `index.getAgent`, which knows current members only. So leaving and former members fall through to cross-run delivery and never reach the root's `deliverToRunId`, where the former-member refusal is implemented. IMP-04 called `deliverToRunId` directly and missed this path.
- Preliminary classification: `Local Fix` (implementation). Owner: implementation engineer.

### F-2 — The rendered app shows no leaving member: its row goes at once, no "Leaving" tag (design § Member States "Visibility", AR-004, DS-007 a; N-8)

- Expected (design): "a leaving member stays in the open Team view, tagged 'Leaving', until it stops (its pending approval must be answerable there); then it disappears."
- Observed (TFU-03): while the server's view snapshot has the member with `leaving: true`, the app's member list (the sidebar run tree) no longer lists it, and nothing on the page says "Leaving" (`data-testid="team-member-leaving"` count 0; no members panel on the page). A user who already had it focused keeps its chat ("Running") and its Stop works. A user focused on another member has no row to open it from.
- Why: the "Leaving" tag was added to `components/workspace/team/TeamMembersPanel.vue`, which no page or component mounts (only its own file and the generated component registry reference it). The app's member list is `WorkspaceStableExecutionRow` in the sidebar run tree, fed by run-tree rows that drop a leaving member at once (N-8). The design's file mapping named the panel as the surface.
- Consequence in real use (DEC-002): a member removed while its tool waits for approval finishes only after the user answers that approval (TFL-02: Codex with auto-execute off waited for two approvals). If the user is not focused on that member, the app gives no way to reach it. The member then stays leaving (and the 1 s stop retry keeps running) until the team is stopped.
- Preliminary classification: `Design Impact` (the visibility rule is designed onto a surface the app does not render). Owner: Solution Designer, through the code reviewer's failure-origin review.

## Observations (not failures)

- O-1 (AC-007): an unparsable `team-config.json` never reaches the run. The package loader keeps the last good definition and reports `DEFINITION_CONTRACT_INVALID` with `usingLastGood: true` on the definition (GraphQL `loadIssues`); the server logs no line for it. The run is unchanged. When the planner cannot use a definition (unknown agent, definition gone) it logs `TEAM_RUN_DEFINITION_NOT_FOLLOWED` naming the run. I read REQ-007 ("the problem is logged") as met by the load issue for an unparsable file; the Solution Designer may want to confirm.
- O-2: a member whose agent does not exist aborts the whole follow ("keeps its members (AgentDefinition '…' cannot be loaded for agent run identity allocation.)"), not `TEAM_MEMBER_NOT_ADDED` for that member only as design N-3 describes for an unlaunchable member. Other changes in the same edit would also wait. In TF-07 the edit had no other change, so this is not asserted.
- O-3: in suite run 4, server #2 did not report ready within 120 s after a restart (its output stopped after "AgentFactory (Singleton) initialized."). It did not recur in runs 3 and 5, where stops were measured: SIGTERM, exit 0 within 0.5 s. Run 4's stop used an 8 s force-kill timer that did not record whether it fired. Cause not found; recorded, not attributed to this change.
- O-4: the Team tab lists the focused member's messages; the removed writer's message shows with the lead focused.
- O-5 (outside this ticket, follow-up FU-004, marked urgent): the Linux arm64 AppImage's runtime (electron-builder `appimage-12.0.1` `runtime-arm64`) needs the unversioned `libz.so`. On a machine without zlib's development package it cannot start. See API-FS.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | TF-01, TF-10, TFL-01, TFU-01 | Proven | — |
| AC-002 | Yes | TF-02 (address refusal, not current, history via Memory view), TFU-01 | Proven | — |
| AC-003 | Yes | TF-03, TF-04, TFL-02 (server behavior); TFU-03 (app) | **Not Proven** (F-2: the design's visibility of a leaving member is not in the app) | — |
| AC-004 | Yes | TF-08 | Proven | — |
| AC-005 | Yes | TF-09, API-PEER RC-51 | Proven | — |
| AC-006 | Yes | TF-01, TF-02, TF-08, TF-10, TFL-01 | Proven | — |
| AC-007 | Yes | TF-07 | Proven (with O-1) | — |
| AC-008 | Yes | TF-06, TFU-02 | Proven | — |
| AC-009 | Yes | TFU-01 | Proven (new member appears Offline, starts and answers; removed one disappears; its message stays in the Team tab) | — |
| AC-010 | Yes | TF-02, TF-03, TFL-02 (by address); by run ID F-1 | **Not Proven** for run-ID messages (F-1); proven by address | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 80% | all ACs exercised at real boundaries | F-1, F-2 fail | fixes, then rerun TF-02, TF-03, TFU-03 |
| Changed-boundary execution directness | 70% | 95% | package edits, app save, real tools, real stream, restart, real runtimes, rendered app | — | — |
| Cross-boundary integration realism and mock gap | 60% | 95% | real Codex and AutoByteus, two real nodes | — | — |
| Environment, configuration, identity, fixture fidelity | 80% | 95% | built server, own data roots, real launch credentials | runs as root in a container | — |
| Failure, edge-case, lifecycle, recovery | 70% | 85% | leaving/approval/interrupt/swap/rejoin/restart/unusable definitions | F-1; O-2, O-3 | — |
| User-surface, browser, desktop-shell | 60% | 70% | TFU-01, TFU-02 | F-2 | design decision on the app surface |
| Durable regression coverage | 70% | 95% | three new suites/cases | — | — |

- Overall post-repository confidence: 69%. Overall final confidence: 88% (simple average).
- Every critical acceptance criterion directly proven: `No` (AC-003 visibility, AC-010 by run ID).
- Final categories below 90%: requirement proof (80%), failure/edge (85%), user surface (70%).
- Target met: `No`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (built server, real runtimes, two nodes) and `Browser` (rendered probe)
- Gap addressed: the implementation's checks used a faked backend; real triggers, runtimes, restart, peers and the app were unproven. Broader validation found F-1 and F-2.

## Persisted-Data Transition Checks

- Decision: `Directly Usable — No Migration`. Real files after real changes: `formerMembers` written (TF-02..TF-05, TF-08), `copiedFrom: "team_definition"` on local and peer copies (TF-09, RC-51), read back after a restart (TF-08). Old shapes: IMP-03 reused. Compatibility fallback observed: `No`.

## Compatibility / Legacy Scope Check

- Compatibility-only behavior observed: `No`. Durable coverage for compatibility only: `No`.

## Durable Coverage Changed In The Codebase

| Path | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` | Added | TF-01..TF-10 |
| `autobyteus-server-ts/tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts` | Added | TFL-01, TFL-02 |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (RC-51) | API-PEER |

Commit `443f1c2c0f`. Ticket-owned probe (not a package script): `tickets/in-progress/team-run-follows-definition/probes/team-follows-ui-probe.mjs`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| AGY CLI (TF, TFU, PEER) | scripted fixture | deterministic tool calls and inputs | real runtimes covered by TFL |
| Model routing for new members | not used | DEC-005 path uses agent/run defaults | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Suite data roots, packages, HOMEs (`/tmp/tf-e2e-*`), servers | Yes | suite `afterAll`, SIGTERM | removed |
| Live root `/root/.autobyteus-e2e/team-follows-live-*`, throwaway `CODEX_HOME` | Yes | suite `afterAll` | removed |
| Probe stack (`/tmp/team-follows-ui-probe-*`, backend, nuxt, chromium) | Yes | probe `finally` | removed (`cleanup` in the evidence JSON) |
| Two-server suite roots | Yes | suite | removed |
| Fresh clones `/root/.autobyteus-e2e/tf-fs-clone`, `/root/.autobyteus-e2e/tf-fs-job`; `/tmp/tf-libz` | Yes | `rm -rf` after API-FS | removed |
| User data and CLI homes | No | untouched (host `auth.json` only linked) | — |

## Preliminary Classification (On `Fail`)

- F-1: `Local Fix` — implementation engineer (`RootTeamRun.hasAgentExecution` / router path for leaving and former members).
- F-2: `Design Impact` — Solution Designer (where a leaving member is shown in the app, so its pending approval stays answerable).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-003 (visibility of a leaving member in the app, F-2), AC-010 (by run ID, F-1)
- Preliminary classification and owner: F-1 `Local Fix` (implementation engineer); F-2 `Design Impact` (Solution Designer)
- Next recipient from `get_handoff_rules`: the code reviewer, for failure-origin review
- Notes: on the next round, rerun TF-02, TF-03 (and the run-ID part of TFL-02 if the router changes), TFU-03, and whatever the fixes touch, by impact.
