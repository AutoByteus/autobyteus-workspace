# API/E2E Execution Coverage Report — Append-Only Message Logs

The run record and the result. The plan is [`api-e2e-coverage-investigation.md`](api-e2e-coverage-investigation.md); the history is [`api-e2e-revision-record.md`](api-e2e-revision-record.md).

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (it lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code review pass CRR-001 (`/software_engineering_team/code_reviewer`)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-02, API-03 and API-04 ran as one run of the whole `tests/e2e` folder with the scripted-runtime gate on (`RUN_AGY_FAILURE_E2E=1`). That run also covers every ungated suite, so API-03 needs no separate ungated run. The case rows below are split by suite group.
  - API-05 AOML-2 was redesigned during execution. The plan was to resume hand-built old runs, but those cannot be restored: they carry no persisted provider conversation id and no AGY project capsule (`agy-project/manifest.json`), which only a real run writes. The test now runs real runs on start 0 with this build, which writes the same files as the release for everything except message logs. It rewrites their logs into the released JSON shape (checked with the frozen released validators) and removes the conversion's ledger row before start 1.
  - API-06 drove the instance window through its CDP control port with a ticket probe (`probes/api-06-cdp.mjs`), because the documented browser-automation CLI is not installed on this machine. The surface is the same: the instance's own renderer over loopback CDP.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (four E2E test files changed: one added, three updated)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `78b42de3ae` (source = `201a4933c6`) + this round's test changes | macOS Darwin 25.5.0 arm64, node v22.23.1 | server `dist` built from the worktree 2026-10-18 (`pnpm -C autobyteus-server-ts build`, rebuilt again by the Electron build's prepare-server) | `env -i PATH HOME=<temp> TMPDIR USER`; test-owned temp roots and SQLite DBs; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` where stated |
| ENV-2 | same | same | packaged worktree app `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (1.5.6-beta.3 label: the branch is one release bump behind), isolated instance `iso-57762-932a` | owned data root `/private/tmp/aoml-api/desktop-root`; `server-data/.env` sets the scripted AGY CLI (`AGY_FAKE_CASE=linked_skills`); renderer driven over loopback CDP |
| ENV-3 | released `v1.5.6-beta.4` (installed `/Applications/AutoByteus.app`) | same | isolated instance `iso-57200-6bde` | same owned data root, used only to write the released data package before ENV-2 |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-010, all | typecheck, unit, integration | Reused: IMP-01, IMP-02 (+IMP-02b), IMP-03 (+IMP-03b) | — | Pass | handoff | handoff rows | Ran on `265ad100ce`. `git diff --name-only 265ad100ce 201a4933c6` shows only `team-communication-api.integration.test.ts`, which IMP-03b reran on `201a4933c6`. HEAD `78b42de3ae` adds ticket files only. |
| API-R2 | AC-001, AC-002, AC-003, AC-005 | `MessageLog` (fault injection), commit path, measurement | Reused: IMP-04, IMP-07, IMP-08, IMP-10 | — | Pass | handoff | `written 123099 bytes, read 1 byte(s)` (IMP-07) | Same commit argument. SCN-005 crash shapes are proven where they occur (injected fs operations). |
| API-R3 | AC-004, AC-006, AC-007 | migration + released migrations in runner order, in-process | Reused: IMP-05, IMP-06 | — | Pass | handoff | `(13 tests)`, `(5 tests)` | Same commit argument; the F-* fixture table, including F-PARTIAL interruptions |
| API-01 | AC-007, REQ-007 | built server, production registry, all startup-migration E2E | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" USER="$USER" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations --no-watch` | ENV-1 | Pass | `API-01-before-test-updates.log`, `API-01-startup-migrations.log` | before: `Tests  5 failed \| 9 passed (14)`; after: `Tests  14 passed (14)` | First run: 5 failures, all test-side (see Notes on test updates below). After updating the three test files: 5 files, 14 tests pass. |
| API-02 | R-6, REQ-008 | Memory Sync multiprocess, context-file startup recovery (and the other gated context-file suite) | Memory Sync: part of the API-04 run. Context-file suites are gated, so they ran separately: `env -i PATH HOME=/private/tmp/… TMPDIR USER RUN_CONTEXT_FILE_PROCESS_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/context-file-startup-recovery.e2e.test.ts tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-04-e2e-folder.log`, `API-02-context-file-suites.log` | `✓ tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts (1 test)`; `✓ tests/e2e/runtime/context-file-startup-recovery.e2e.test.ts (4 tests)` | Both changed-fixture suites pass. Out of scope: `context-file-storage-runtime` "converts a copied retained duplicate-address package…" fails the same way on the base `65cf41c6b4` (`expected '{"detail":"File not found."}' to be 'other execution image.png'`). Cause: the test writes a team task agent's context files in the pre-own-run in-team folder, but since own-run they resolve from `agents/<id>/` (`context-file-layout.ts:67`). This change did not cause it; reported as follow-up FU-API-1. Its other 5 tests pass. |
| API-03 | BEH-002/004 regression | every ungated server E2E suite | part of the API-04 run | ENV-1 | Pass | `API-04-e2e-folder.log` | per-file list: all `✓` except `terminal-websocket-lifecycle` in the whole run, which passes on rerun (`✓ tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts (4 tests)`) | The single failure was my environment: HOME under `/tmp`, a symlink to `/private/tmp` on macOS, and the PTY prints the real path. A rerun with HOME under `/private/tmp` passes 4/4. |
| API-04 | AC-002, AC-008 (new messages), BEH-001, BEH-007 | real HTTP/WS/scoped MCP with the scripted AGY CLI, all three families | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" USER="$USER" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e --no-watch` | ENV-1 | Pass | `API-04-e2e-folder.log` | `Tests  1 failed \| 483 passed \| 241 skipped (725)` (the one = API-03's environment artifact); `✓ tests/e2e/projects/collaboration-model-contract.e2e.test.ts (3 tests)`, `✓ tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts (1 test)`, `✓ tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` | 113 files passed, 47 skipped (other gates) | Live-provider gates (`RUN_CODEX_E2E`, `RUN_AGY_E2E`, …) stay off: no credit spend, and inference does not touch the commit path |
| API-05 | AC-004, AC-006, AC-007, AC-008, AC-009 (server part), REQ-009, AC-001..AC-003 at the system boundary, BEH-001..BEH-004, BEH-007 | built server, real runner + SQLite ledger + registry, REST/GraphQL/WS | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" USER="$USER" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-05-append-only-startup-e2e.log` | `✓ AOML-1 …`, `✓ AOML-2 …`, `Tests  2 passed (2)` | New durable test, described below |
| API-06 | AC-009, AC-004, AC-006, AC-008, BEH-001, BEH-004, BEH-007, RU-1, RU-2 | isolated desktop instance of the worktree build, renderer + embedded server | (a) released app ENV-3 writes runs via `probes/api-06-released-data.mjs`, then the synthesized shapes are added; (b) `isolated-app start --from-worktree --data-root <same>`; (c) UI journey over CDP; (d) `isolated-app restart`; (e) REST sweep `probes/api-06-references.mjs` | ENV-2, ENV-3 | Pass | `API-06-a-package-before.txt`, `API-06-b-desktop-conversion.txt`, `API-06-c-desktop-journey.txt`, `API-06-ids.json`, `API-06-*.png` | b: `"status":"SUCCEEDED_WITH_WARNINGS"`, `Scanned 10; migrated 8; skipped 2`, every `CONVERTED … equal=true`; c: `3 Messages` / `27 Messages` after restart, `LOGS_UNCHANGED_BY_RESTART`, `REFS_SAME_AFTER_RESTART`, 9 × `200 BODY_EQUALS_FILE`, `REAL_HOME_AGY_BRAIN_UNCHANGED`; screenshots `API-06-04` (reference opened), `API-06-09` (26 messages from the rotated log), `API-06-13` (27 after restart) | Described below |

### API-05 — what the new durable test proves

`autobyteus-server-ts/tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` runs through the built `dist/app.js`, the server the desktop embeds.

- **AOML-1** (RU-3: an upgrade from before own-run, so own-run and the conversion run in the same start). The released pre-own-run layout (`writeReleasedDataRoot`) gets a reference file on every message, plus an org log of 24 × 400 KB, an empty team run, a tree-less old-address team and an unreadable team log. Asserted:
  - own-run is `SUCCEEDED*`. The conversion is `SUCCEEDED_WITH_WARNINGS`, its attempt log names `PRESERVED_UNSUPPORTED` / `PRESERVED_UNREADABLE`, and the server output carries both warnings;
  - only those two logs stay JSON, byte for byte, and the backup file is untouched;
  - every JSONL line has exactly the seven keys and every file ends with `\n`;
  - the large log is `_000001`, `_000002` and `_active`, each sealed file ≥ the limit and every file ≤ limit + one message;
  - the empty run's active file is `""`;
  - the hub, team and both org views (GraphQL, as the renderer reads them) equal the released lists in `createdAt` order;
  - every reference of every message resolves over REST, and an unknown one is 404;
  - a task agent's context-file link opens;
  - a second start leaves every message-log file unchanged, with the conversion's attempts still 1.
- **AOML-2** (RU-1/RU-2: runs that really ran). Start 0 creates a hub with an agent task agent, a team run and an org run, and sends messages with references through real `CALL_TOOL` tool calls. Their logs are rewritten in the released JSON shape (frozen validators), the org's grows to 24 older messages of 400 KB, and the conversion's ledger row is removed. Asserted:
  - start 1: the conversion is `SUCCEEDED`; the views equal the released lists; references of old messages resolve;
  - each old run is restored and messaged through tool calls: hub → its task agent (both logs gain the same single line, and earlier lines are unchanged), team lead → mate (one line), org director → analyst on the rotated log (one line at the end of the active file, sealed files' sha256 unchanged); references of the new messages resolve;
  - a team delegated from the resumed hub has only `team_communication_messages_active.jsonl`, and the hub's message to its coordinator lands in both logs;
  - start 2: the views are unchanged and no message-log file changed.

### API-06 — the desktop journey (AC-009)

- **(a) Package.** The released v1.5.6-beta.4 app, in its own isolated instance on the owned root, ran real runs with the scripted AGY runtime: a hub with an agent task agent and a task agent team, a team run with teammate and task agent messages, an org run with analyst and task agent messages, an empty team run and a second team run. The probe then added synthesized shapes in released form: the org log grown to 26 messages (9.8 MB), a tree-less `old-address-team`, and the second team's log made unreadable (`{ not json`). The ledger showed every log-writing predecessor and own-run `SUCCEEDED`, with no row for the conversion.
- **(b) Conversion.** The worktree build started on the same root and the packaged embedded server ran the conversion: `SUCCEEDED_WITH_WARNINGS`, `Scanned 10; migrated 8; skipped 2; failed 0`. Every converted log reads back equal to its released copy. The org log is `_000001` (4,508,516 B), `_000002` (4,508,526 B) and `_active` (820,512 B), all within limit + one message. The empty team's log is an empty active file. The two unusable logs are byte-identical, and the instance log shows both warnings.
- **(c) UI journey.**
  - The sidebar lists the hub, 2 team runs and the org. The unreadable and old-address teams are not admitted (R-3).
  - In the hub's Team panel: "2 Messages", and clicking `hub-pair.md` shows "reference hub-pair".
  - The composer of each old run sent a `CALL_TOOL` message:
    - hub → helper: the hub log goes from 2 to 3 lines and the helper's from 1 to 2, with the same line and byte-identical prefixes;
    - team lead → mate: 2 → 3 lines, prefix unchanged;
    - org director → analyst: one line at the end of the active file, sealed files unchanged.
  - A team delegated from the hub composer got only an empty `team_communication_messages_active.jsonl`.
  - The org panel shows "26 Messages" before and "27 Messages" after, and the new message's reference opens.
- **(d) Restart.** No message-log file changed and the conversion's attempts stayed at 1. The UI shows hub 3, team 3 and org 27 messages with every old and new text.
- **(e) REST sweep.** 9 references, all `200 BODY_EQUALS_FILE`, identical before and after the restart.
- **Safety.** The listing of the real `~/.gemini/antigravity-cli/brain` was unchanged. The user's app and `~/.autobyteus` were never touched. Both instances are stopped and the owned root is deleted.

### Test updates made this round (TESTING.md rule 9: cause found, a test-side cause, fixed in the branch)

| File | Failure observed (API-01 first run) | Cause | Update |
| --- | --- | --- | --- |
| `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` (TAU-1, TAU-2) | `AgentOrg package is not admitted.` / `Team run is not an admitted current package.` | The "faithful upgrade root" deletes only own-run's ledger row. Its first start on an empty folder already recorded the new conversion as `SUCCEEDED`, so the released JSON logs are never converted. An upgrading install cannot be in that state: the conversion is newer than own-run, and it is only terminal once own-run has succeeded. | The root also removes the rows of migrations registered after own-run (the conversion). TAU-1 additionally asserts the conversion `SUCCEEDED` and that no JSON message log is left. |
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (warning scenario) | `expected true to be false` at the JSON-removed assertion | In this scenario flat-families fails, so own-run waits and, by design (gate, R-3), the conversion keeps this root's JSON and stays non-terminal. The implementer's edit assumed conversion. `assertV2TeamPackage` is used only by this scenario. | Asserts the released JSON log is unchanged and no append-only file exists. Adds the conversion's status (`FAILED`, `WAITING_FOR_PREDECESSOR` for this root) on both starts. Excludes its row from the "unchanged rows" ledger comparison, as is already done for the other retried migrations. Also moves a doc comment the implementer had separated from `assertAgentOrgPackage`. |
| `tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts` | `AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED` | The test runs flat-families in-process and then restores the org through the current runtime, without the conversion a real start runs after flat-families | Runs `convertMessageLogsAsOnStartup` (the implementer's helper for exactly this) before the restore |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R2 (IMP-07: 123,099 B written for a 123,099 B line on a 22.2 MiB log, 1 byte read); API-05 AOML-2 and API-06 (live appends on a converted rotated log add exactly one line; sealed files unchanged) | Proven | The time on the user's own 22 MB log is not measured on user data (TESTING.md). The synthesized profile is the agreed proof (DEC-001). |
| AC-002 | Yes | API-R2 (IMP-08: receiver first, fail-stop, conflict on a known id); API-05 AOML-2, API-06 (the same line in the receiver's and sender's logs); API-04 (scripted delegation/messaging suites) | Proven | — |
| AC-003 | Yes | API-R2 (IMP-04 rotation and size bounds); API-05 AOML-1 (≥ limit sealed, ≤ limit + one message); API-06 (rotated org log, sealed bytes unchanged by a later append) | Proven | — |
| AC-004 | Yes | API-R3 (IMP-05); API-05 AOML-1 and AOML-2 (views equal the released lists); API-06 (every converted log equal to its released copy; UI counts) | Proven | — |
| AC-005 | Yes | API-R2 (IMP-04 torn tail, then append; malformed non-final line strict) | Proven | — |
| AC-006 | Yes | API-R3 (IMP-05 incl. interruptions); API-05 AOML-1 (all log kinds, rotation, kept logs with warnings, second start); API-06 (desktop conversion) | Proven | — |
| AC-007 | Yes | API-R3 (IMP-06); API-01 (production registry and own-run startup E2E); API-05 AOML-1 (own-run + conversion in one start) | Proven | — |
| AC-008 | Yes | API-05 (every migrated and new message, hub, team and org); API-06 (REST sweep 9/9 and UI reference clicks; context-file link in AOML-1); API-04 (`controlled-org-publication-http`: a new org message's reference resolves) | Proven | — |
| AC-009 | Yes | API-06 (isolated desktop instance, released-runtime data package); API-05 (server part) | Proven | — |
| AC-010 | Yes | API-R1 (IMP-01 typecheck); code review CRR-001 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | 97% | API-R1..R3, API-01, API-04, API-05; final + API-06 | AC-001's timing on real user data is the user's own check (DEC-001) | — |
| Changed-boundary execution directness | 94% | 97% | API-05 runs the real built server, runner and ledger; API-06 runs the packaged embedded server and renderer | — | — |
| Cross-boundary integration realism and mock gap | 90% | 96% | API-04/05 have no mocks besides the scripted CLI; API-06 uses released-runtime data | The scripted CLI replaces inference (not on the persistence path) | — |
| Environment, configuration, identity, and fixture fidelity | 88% | 96% | API-05 uses hand-built and this-build-written data; API-06 uses data the released v1.5.6-beta.4 runtime wrote | Synthesized large-org content; not real user data (by rule) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 95% | IMP-04/05 fault injection and interruptions; API-01 waiting/preserved paths; AOML-1 kept logs; restarts and second starts | No system-level crash during an append (store-level injection only) | — |
| User-surface, browser, and desktop-shell confidence | N/A before API-06 (75%) | 95% | API-06 (renderer views, composer sends, reference clicks, restart in the packaged app) | Renderer driven over CDP, not by a person; UI text checks, not pixel review (no UI change in scope) | — |
| Durable regression coverage quality and relevance | 92% | 95% | API-05 added; three E2E tests corrected to approved behavior | — | — |

- Overall post-repository confidence: 91% (simple average of the six scored categories; the user-surface category was at 75% before API-06)
- Overall final confidence: 96% (simple average of the seven categories)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: R-2/R-3 (runs kept on JSON are not admitted, with a warning: observed and as designed); DEC-008 (a one-time rewrite of sealed files by locators-v1 where it is still pending; covered in-process by F-LOCATORS-AFTER-OURS, not reachable on an install where locators-v1 has succeeded, as in API-06)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated desktop instance, TESTING.md) plus built-server E2E
- Confidence gap or residual risk it addresses, and the expected gain: the conversion inside the packaged embedded server on released-runtime data; renderer views of converted history; sends from the UI on converted (and rotated) logs; restart. Expected gain: the user-surface and fixture-fidelity categories, from 75–88% to ≥ 95%.
- Browser validation needed: the renderer journey was needed for AC-009. It ran in the actual Electron instance, not a separate browser.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: as planned (an isolated worktree build on an owned data root, with the data package written by the released app in its own isolated instance); renderer driven over loopback CDP
- Cases proving web-equivalent behavior: API-06 (c), (e). Cases proving shell-specific or lifecycle behavior: API-06 (b) (the startup migration in the packaged embedded server), (d) (app restart)
- Effect on any already-running desktop application: `None`. The other instances on this machine (`iso-65187-14ae`, `iso-53150-351f`, not mine) were never touched; the user's app and data were not read or written.
- Behavior not directly proven and its confidence consequence: none material

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required`
- Representative existing data used: released-runtime output of v1.5.6-beta.4 (API-06); the hand-built released pre-own-run layout (API-05 AOML-1, API-01 TAU); this-build-run runs with released-shape logs (API-05 AOML-2); synthesized large, empty, old-address and unreadable shapes
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the migration outcome: completion API-01, API-05, API-06. Recovery: API-R3 (interruption at each step), API-01 (waiting, then retried on the next start), API-05/06 (second start, restart).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`. A JSON log left in a run folder is not read: the run is not admitted (API-06 sidebar; IMP-03b).
- Residual untested persisted-data risk: the user's own ≈113 MB of data is not converted in testing (by rule); delivery tells the user to check after the beta (DEC-001).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` | Added | API-05 | — |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` | Updated | API-01 | — |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Updated | API-01 | — |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts` | Updated | API-01 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY model runtime | scripted CLI `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`): a `CALL_TOOL:{…}` message makes the agent call the real MCP tool | no inference is needed to drive `send_message_to` / `delegate_task`; avoids credits | none on the persistence path |
| Real user data | released-app-written and synthesized data | TESTING.md forbids running migrations on user data or a copy | real-size performance on the user's install is the user's check (DEC-001) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-57200-6bde` (released app) | Yes | `isolated-app stop` | stopped (`wasRunning: true`) |
| Isolated instance `iso-57762-932a` (worktree build) | Yes | `isolated-app stop` | stopped (`forced: true`); `list` shows no instance with an `aoml-api` root |
| Data root `/private/tmp/aoml-api/desktop-root` | Yes | `rm -rf` after the evidence was captured | removed |
| E2E temp roots and servers | Yes | removed by each test's `afterEach` | removed |
| Probes `probes/api-06-*.mjs` | Yes | kept in the ticket as evidence of how API-06 ran | kept |
| `/tmp/aoml-api` (build logs, full test logs, screenshots, released-log copies) | Yes | kept until delivery; the evidence excerpts are in the ticket | kept |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: the timing and conversion on the user's own data (AC-001 timing, QR-003 on ≈113 MB) are the user's check after the beta (DEC-001); everything else is proven
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff
- Follow-up (out of scope, sent to the Project Task Manager): FU-API-1, the stale gated test above.
- Notes: three existing E2E tests were corrected to the approved behavior (test-side causes, TESTING.md rule 9). An observation outside scope: "Memory file missing: …/raw_traces_active.jsonl" errors for members that never ran are logged by the released app too (not this change). The conversion's PRESERVED warnings go to stderr, which the Electron log labels `[ERROR]`, the existing logging plumbing for `console.warn`.
