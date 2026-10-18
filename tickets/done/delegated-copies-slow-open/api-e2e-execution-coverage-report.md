# API/E2E Execution Coverage Report — delegated-copies-slow-open

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, the delivery request DR-001 for integrated-state evidence, forwarded with CRR-003 (re-review of the merge of `origin/personal` @ `2763e7c678`) by `/software_engineering_team/code_reviewer`. Round 1 (API-REV-001) was the first pass.
- Prior round reviewed: round 1. All of its cases passed; no prior failures to recheck.
- Round 2 summary:
  - Probe fix (blocker from CRR-003): the probe read the hub log as `collaboration/communication_messages.json`. On the merged state that log is append-only: `communication_messages_<6 digits>.jsonl` (sealed) plus `communication_messages_active.jsonl`. The probe now reads it as the server's `MessageLog` does (sealed files in order, then the active file, complete lines, each id once).
  - Rebuilt the merged worktree (`pnpm install --frozen-lockfile`, server build, `nuxt prepare`). Built a fresh base worktree at `2763e7c678`.
  - Reran the server E2E (R2-API-02).
  - Reseeded the large hub with the merged server (R2-API-04).
  - Ran the S cases on the new base (R2-API-05) and on the merged build, with row comparison (R2-API-06).
  - Ran all live cases L-001..L-011 on the merged build (R2-API-07). Delivery asked for L-001, L-002 and L-004.
  - The desktop instance was not rerun (R2 cases table).
  - IMP-10..IMP-18 are reused: they ran on `2cb21ab41e`, and only `tickets/` changed since.
- Deviations from the investigation's plan, and why:
  - API-07..API-10 ran as one probe run on the large hub (cases L-001..L-008), not as separate runs. API-08 = L-007, API-09 = L-004, API-10 = L-005 + L-006.
  - Cases added during execution:
    - L-008 (copy status): to settle a status question raised by my own first L-004 attempt. Enter in the composer while a copy runs is the Interrupt action, so that attempt had interrupted the held turn itself.
    - L-009 (opening a busy copy, CAND-003).
    - API-12: regression of the changed fixture CLI on an existing suite.
    - API-13: web guards.
    - API-14 / L-010: a copy with a multi-MB conversation (QR-002 for big copies).
    - API-15 / L-011: AC-004's failure path on the real stack.
  - L-004 sends the queued message through the hub stream as a second client. The app's own composer shows Interrupt, not Send, while the copy runs (`agentPrimaryAction.ts`), so queued input reaches a copy from another client, not from that composer.
  - The probe file kept changing during the round:
    - API-05/06/07 and API-11 ran on a probe revision that already had today's S-case and L-001..L-008 logic.
    - Later edits added L-009..L-011, switched the marker check from `innerText` to `textContent`, and updated the header.
    - API-07b ran L-009 on the revision that added it. API-15 ran on the committed revision.
  - The desktop run used the stopped hub only. The embedded server receives no scripted-AGY variables, so live cases are not possible there.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/evidence/` (`API-*`, `OBS-*`; `IMP-*` are the implementation engineer's)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | worktree HEAD `f30b469079` (code = `54e5356ae6`; later commits are tickets-only) + this round's uncommitted test files | macOS 26.5.2, 10 CPUs, shared machine (load average 5–190 during the round, logged per run) | node 22.23.1, in-process Studio server (vitest), scripted AGY `agy-failure-cli.mjs` (`linked_skills`) | temp data dir and private HOME per suite (harness), clean env (`env -i`) |
| ENV-2 | fix build: same commit; `autobyteus-server-ts/dist` + Nuxt dev from the worktree | same | probe-owned backend `dist/app.js` + Nuxt dev + headless Google Chrome 155 (playwright-core), viewport 1440×1100, en-US | copy of the test-owned seed per run, free ports, private HOME, scripted AGY |
| ENV-3 | base build `5ceb43039a` (git worktree under `/tmp`, `pnpm install`, server prebuild + build, `nuxt prepare`) | same | same as ENV-2 with base `dist/app.js` and base Nuxt dev; probe file from the fix worktree | same seed copy as ENV-2 |
| ENV-5 | merged build: worktree `05ab1c4790` (code = `2cb21ab41e`, merge of `origin/personal` @ `2763e7c678`), rebuilt `dist` + Nuxt dev | macOS 26.5.2 (load average 7–66 during round 2) | as ENV-2 | as ENV-2; round-2 seed |
| ENV-6 | new base build `2763e7c678` (git worktree under `/tmp`, install + prebuild + build + `nuxt prepare`) | same | as ENV-3 | round-2 seed copy |
| ENV-4 | fix build packaged: `pnpm --silent isolated-app start --build --data-root <copy of seed>` | same | AutoByteus.app `electron-dist/mac-arm64` (worktree build), Electron renderer Chrome 148 over CDP | instance `iso-49384-a072`, own ports 49384/49385, data root `/private/tmp/dcso-api-e2e/desktop-root` (seed copy, removed after) |

Seed (API-04): 50 Team copies × 6 members (300 child agents), one Project Task each, 250 copy→hub report messages of 10 KB (hub message log 2.63 MB, hub view 2.73 MB), 2 marker member conversations, a second hub with 2 copies, and 300 stopped unrelated team runs in another workspace. Memory 12.6 MB, 352 team folders. Everything was created through public GraphQL/WebSocket APIs on ENV-2's server (`evidence/API-04-seed/seed-manifest.json`). A small seed (8 Teams, 3 unrelated runs) and two 10-Team seeds were made the same way for the AC-002 size comparison and for L-010/L-011.

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-009, REQ-004, D-3 | server unit (scoped read), server suite, typecheck | Reused: IMP-01, IMP-02, IMP-03 | — | Pass | see handoff | see handoff | `git diff --name-only 54e5356ae6 f30b469079` lists only `tickets/` files |
| API-R2 | AC-001, AC-002, AC-004..AC-007 | web specs (incl. `agentRunCollaborationLazyChildren.spec.ts` 5 vs 50 Teams), full web suite, guards | Reused: IMP-04, IMP-05c, IMP-06 | — | Pass | see handoff | see handoff | same commit argument |
| API-R3 | AC-006 (held/queued) | native producer → server view → web hydration | Reused: IMP-07 | — | Pass | see handoff | see handoff | same |
| API-R4 | AR-001, D-2, D-4, D-5, REQ-006 | mutation checks | Reused: IMP-08 | — | Pass | see handoff | see handoff | same |
| API-R5 | AC-001, AC-004, AC-005, AC-007 (7 Teams) | real-stack browser | Reused: IMP-09 | — | Pass | see handoff | see handoff | My fixture change adds a directive the collapse probe never sends |
| API-02 | AC-009, REQ-004, R-B, D-3 | GraphQL `agentRunCollaborationMemberFileChanges` over the real in-process server; hubs, copies and the artifact made by real Agent roots | `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-02-member-file-changes-e2e.log` | `Tests  3 passed (3)`, `# ---- exit code: 0` | 3 cases: running hub (live artifact = generic list; Team members `[]`); rejections (foreign child, wrong address, member address with another child, unknown hub, blank hub id); stopped hub (same artifact from the copy's stored `file_changes.json`). Attempt 1 failed on my own expectation (`type: file` for a `.png`; the server types it `image`). Fixed in the test |
| API-03 | preserved generic run-id path (refactored collaboration branch) | server integration | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/run-file-changes-api.integration.test.ts --no-watch` | ENV-1 | Pass | `API-03-run-file-changes-integration.log` | `Tests  6 passed (6)` | — |
| API-04 | AC-008 fixture | real server, public APIs | `pnpm -C autobyteus-web test:e2e:delegated-copies-large-hub --seed-to /tmp/dcso-api-e2e/seed --teams 50 --unrelated 300` (script added this round; run as `node tests/e2e/delegated-copies-large-hub-probe.mjs …`) | ENV-2 | Pass | `API-04-seed/{evidence.json,seed-manifest.json,probe-output.txt}` | `"teams": 50, "childAgents": 300, "unrelatedTeamRuns": 300, "hubMessageLogBytes": 2630925` | 82 s to seed |
| API-05 | AC-008 baseline, QR-001/QR-002 baseline, AC-009 baseline | base build, browser + HTTP | `node tests/e2e/delegated-copies-large-hub-probe.mjs --from-seed /tmp/dcso-api-e2e/seed --stack-root /tmp/dcso-api-e2e/base --label base --samples 2 --output-dir …` | ENV-3 | Pass (baseline observed) | `API-05-base/{evidence.json,base-*.png,backend.log}`, `API-05-07-timing-summary.txt` | `S-001: T1 7303 ms ops {'GetAgentRunCollaboration': 2, 'GetAgentRunCollaborationMemberProjection': 312, 'GetRunFileChanges': 312}` | Hub click re-fans out 300 + 301 requests; generic artifact lookup median 37.8 ms |
| API-06 | AC-001, AC-002, AC-003 (stopped), AC-004, AC-005, AC-008, AC-009, QR-001, QR-002 | fix build, browser + HTTP | `node tests/e2e/delegated-copies-large-hub-probe.mjs --from-seed /tmp/dcso-api-e2e/seed --label fix --samples 3 --cases S --compare-with <API-05 evidence.json> --output-dir …`, plus the 8-Team small seed run for both builds | ENV-2 (+ENV-3 small seed) | Pass | `API-06-fix/*`, `API-06-small-seed/{base,fix}-evidence.json`, `API-05-07-timing-summary.txt` | `S-001: T1 56 ms ops {'GetAgentRunCollaboration': 2} \| T2 390 ms … \| T3 61 ms {'GetAgentRunCollaborationMemberProjection': 1, 'GetAgentRunCollaborationMemberFileChanges': 1} \| reopen 12 ms {}`; `comparison {'collapsedEqual': True, 'expandedEqual': True …}`; `copyArtifactsScoped': (5.6, …)` | The 2 view requests in T-1 are one per hub (hub and second hub; request log in `OBS-2-…txt`) |
| API-07 | AC-003 (running), AC-006, AC-007 | fix build, running large hub, real stream and real delegation | `node tests/e2e/delegated-copies-large-hub-probe.mjs --from-seed /tmp/dcso-api-e2e/seed --label fix-live --live --cases L --output-dir …` (L-001 running T-1/T-2; L-002 new delegation with one opened copy; L-003 composer send to the opened copy) | ENV-2 | Pass | `API-07-fix-live/{evidence.json,live-new-delegation.png,…}` | L-001 `"hubRowToCopyRowsMs": 44.7`, memberOps `{}`; L-002 `"teamsBefore": 50, "teamsAfter": 51, "minMessagesDuringRepublication": 1, "memberOps": {…Projection: 1, …FileChanges: 1}, "allMemberOps"` equal to memberOps; L-003 row/store/server status `idle`, answer stored | — |
| API-08 | AC-006, REQ-006 | fix build, stopped hub, composer | L-007 in the API-07 run: hub terminated, cold page, open a copy, send via the composer | ENV-2 | Pass | `API-07-fix-live/{evidence.json,stopped-hub-send.png}` | L-007 `Pass`; text `Stopped hub send …` in the center pane, then the copy's stored projection holds the text followed by `OK` | Sending wakes the copy (phase becomes `live`) |
| API-09 | AC-006 (pending input), SCN-A1, Assumption 2 | fix build, running hub, second client, page reload | L-004 in the API-07 run: a copy runs `HOLD_TURN` and a second client sends a message (queued on the server); then reload, open the hub and the copy | ENV-2 | Pass | `API-07-fix-live/{evidence.json,live-queued-after-reload.png}` | `serverInputStates` entry `"state": "queued"`; after opening: `{'text': 'Queued while busy …', 'state': 'queued'}`, `hydrated: True`, ops 1 + 1 | — |
| API-10 | MP-001 / R-004, FU-4 | fix build | L-005 (copy row of the second hub while the first is selected) and L-006 (Projects Task-root click) in the API-07 run | ENV-2 | Pass | `API-07-fix-live/{evidence.json,live-task-locate.png}` | L-005 `ops {…Projection: 2, …FileChanges: 2}, hydrated: true`; L-006 `"clickToWorkerSelectedMs": 541` | R-004 is the accepted two loads. FU-4: the worker is found well inside the 5 s wait |
| API-L008 | REQ-005, REQ-006 (row/header status) | fix build, running hub | L-008 in the API-07 run: open a never-started copy, send `HOLD_TURN` via the composer, sample status 16× | ENV-2 | Pass | `API-07-fix-live/{evidence.json,fix-live-held-turn-status.png}` | timeline `server: initializing` → `running` at 1 s, with `store`, `target`, `row` all `running` and `sameObject: true` | Resolves the "Offline" in my first L-004 attempt: that attempt's Enter press was the Interrupt action |
| API-L009 | CAND-003 residual | fix build, running hub | `… --label fix-busy --live --cases L-001,L-009`: 8 turns sent to a copy 300 ms apart, opened after the 2nd | ENV-2 | Pass (observation) | `API-07b-fix-busy/evidence.json` | `"firstOps": {…Projection: 1, …FileChanges: 1}, "loadWarnings": [], "reselected": false, "messagesShown": 8` | Scripted turns are short, so continuous streaming during the fetch was not produced; no retry exhaustion observed |
| API-11 | AC-001, AC-003 (stopped), AC-004, AC-005, QR-001, QR-002 in the desktop shell | isolated desktop instance of the fix build (production bundle), seeded large hub | `pnpm --silent isolated-app start --build --data-root /private/tmp/dcso-api-e2e/desktop-root`; `node tests/e2e/delegated-copies-large-hub-probe.mjs --from-seed /tmp/dcso-api-e2e/seed --desktop-instance <start result JSON> --label desktop-fix --samples 3 --cases S --compare-with <API-05 evidence.json> …`; `pnpm --silent isolated-app stop iso-49384-a072` | ENV-4 | Pass | `API-11-desktop/{evidence.json,desktop-fix-*.png,isolated-app-start.json,isolated-app-stop.json}` | `S-001: T1 45 ms … \| T2 225 ms … \| T3 55 ms {…Projection: 1, …FileChanges: 1}`; rows `collapsedEqual: True, expandedEqual: True`; stop `"controlPortReleased": true, "serverPortReleased": true` | S-002/S-003 start with the workspace already expanded and the hub selected after the renderer reload, so S-001 is the cold sample |
| API-12 | regression of the fixture change | existing scripted-AGY suite + API-02 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-12-fixture-regression-e2e.log` | `Tests  5 passed (5)` | — |
| API-13 | web rules | web guards | `pnpm -C autobyteus-web guard:web-boundary && … guard:localization-boundary && … audit:localization-literals` | ENV-1 | Pass | `API-13-web-guards.log` | `[audit:localization-literals] Passed with zero unresolved findings.` | after adding the probe and its script |
| API-14 | QR-002 / AC-004 for a copy with a multi-MB conversation | fix build, running hub (10-Team seed) | L-010: 20 messages of 60 KB sent to a copy (`ECHO_INPUT`), cold page, open it; `--large-shape words` (prose) and the earlier unbroken-token run; base comparison | ENV-2, ENV-3 | Pass (prose); unbroken-token shape → OBS-3 | `API-14-fix-words/evidence.json`, `API-14-large-copy/evidence.json`, `API-14-base-large-copy/evidence.json`, `OBS-3-unbroken-token-conversation.txt` | prose: `"clickToStoreLoadedMs": 261.7 … "projectionBytes": 2369240`; unbroken: `"clickToStoreLoadedMs": 86679 … "projectionServerMs": 19.5`; base: click `Timeout 30000ms exceeded` | The unbroken-token cost predates this ticket and is the same client processing the base did while staging every copy (OBS-3) |
| API-15 | AC-004 alternate (failure) | fix build, real browser, one network failure injected on one copy's projection request (`page.route` abort) | `… --label fix-failure --live --cases L-011,L-001,L-010` on a fresh 10-Team seed | ENV-2 | Pass | `API-15-fix-failure/evidence.json` | `"logged": ["[agentRunCollaboration] Could not load 'api_e2e_engineer_…' of 'large_hub_manager_probe_…'. ApolloError: Failed to fetch…"]`, `"afterFailure": {"hydrated": false, "error": null …}`, `"otherCopyOpened": true`, `"retried": {"hydrated": true, "ops": {…Projection: 1, …FileChanges: 1}}`; L-010 rerun `257.6` ms | The first attempt waited forever on my own readiness check (a never-started copy has an empty conversation). I fixed the check to wait for "loaded" |

### Round 2 cases (merged state, DR-001)

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-API-R | merged regression | server/web suites, guards, native input, mutations, collapse probe | Reused: IMP-10..IMP-18 (implementation handoff, IR-002) | — | Pass | see handoff | see handoff | ran on `2cb21ab41e`; `git diff --name-only 2cb21ab41e 05ab1c4790` lists only `tickets/` files |
| R2-API-02 | AC-009, REQ-004, R-B (+ fixture regression) | server GraphQL E2E on the merged build | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts --no-watch` | ENV-5 | Pass | `API-02-12-merged-e2e.log` | `Tests  5 passed (5)` | — |
| R2-API-04 | AC-008 fixture | merged server, public APIs; probe reads the append-only log | `node tests/e2e/delegated-copies-large-hub-probe.mjs --seed-to /tmp/dcso-api-e2e/r2-seed --teams 50 --unrelated 300 …` | ENV-5 | Pass | `R2-API-04-seed/{evidence.json,seed-manifest.json,probe-output.txt}` | `"storedReports":250,"storedFiles":["communication_messages_active.jsonl"]`, `'hubMessageLogBytes': 2614147` | Exercises the probe change (setup completes on the new layout). OBS-1 is still present: live view 14 of 252 |
| R2-API-05 | AC-008 baseline on the new base | base `2763e7c678`, browser + HTTP | `… --from-seed … --stack-root /tmp/dcso-api-e2e/base2 --label base2 --samples 2 --cases S` | ENV-6 | Pass (baseline observed) | `R2-API-05-base/*`, `R2-timing-summary.txt` | `S-001: T1 8385 ms ops {… 'GetAgentRunCollaborationMemberProjection': 312, 'GetRunFileChanges': 312}` | — |
| R2-API-06 | AC-001..AC-005, AC-008, AC-009, QR-001, QR-002 on the merged build | browser + HTTP | `… --from-seed … --label merged --samples 3 --cases S --compare-with <R2-API-05 evidence.json>` | ENV-5 | Pass | `R2-API-06-merged/*`, `R2-timing-summary.txt` | `S-001: T1 69 ms ops {'GetAgentRunCollaboration': 2} \| T2 407 ms … \| T3 65 ms {…Projection: 1, …FileChanges: 1} \| reopen 13 ms {}`; `comparison {'collapsedEqual': True, 'expandedEqual': True …}`; scoped artifact median 6.2 ms | — |
| R2-API-07 | AC-003 (running), AC-004 (failure), AC-006, AC-007, R-004, FU-4, CAND-003 on the merged build with batched content | running large hub | `… --from-seed … --label merged-live --live --cases L` (L-001..L-011) | ENV-5 | Pass | `R2-API-07-live/*` | L-001 T1 62 ms, memberOps `{}`; L-002 `teamsAfter: 51`, memberOps = allMemberOps = 1 + 1, events include `agent_presentation_batch`; L-004 `'state': 'queued'`, hydrated; L-010 318.9 ms; L-011 failure logged and retried 1 + 1; L-006 613 ms | L-001, L-002 and L-004 were the cases delivery asked for |
| R2-API-11 | desktop shell | — | not rerun | — | Not Tested | — | — | The merge changed renderer and server code only (no shell code). The renderer is proven in the browser. A packaged rebuild would add shell timing, not new behavior |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 rows from one view request, no per-copy request, within QR-001 | Yes | API-06, API-11, API-07 (L-001), API-R2, API-R5 | Proven | — |
| AC-002 same request count at 5 vs 50 copies | Yes | API-R2 (5 vs 50 unit), API-06 large vs small seed (8 Teams: `T1 18 ms ops {GetAgentRunCollaboration: 2}`; 50 Teams: same ops) | Proven | — |
| AC-003 hub conversation within QR-002, no per-copy loads (stopped and running) | Yes | API-06 (350–390 ms), API-11 (225 ms), API-07 L-001 (416 ms, memberOps `{}`) | Proven | — |
| AC-004 copy details on open, only that copy, no refetch on reopen; failure logged and retried | Yes | API-06/API-11 (T-3 1+1, reopen `{}`), API-14 (2.37 MB copy 262 ms), API-15 (failure path), API-R2 | Proven | — |
| AC-005 same rows, statuses, colors, delegated-by, Task summaries | Yes | API-06 and API-11 `S-ROWS` equal to base (50 collapsed, 350 expanded rows), API-R2 | Proven | — |
| AC-006 live status, complete conversation incl. output before opening, sending wakes, pending input | Yes | API-07 (L-002, L-003), API-08 (L-007), API-09 (L-004), API-L008, API-L009, API-R3 | Proven | Tool approvals were not exercised live (scripted AGY auto-executes); covered by the unit reconciliation cases in API-R2/R4 |
| AC-007 new delegation: new row, no request for unopened copies, opened copy keeps its state | Yes | API-07 L-002 | Proven | — |
| AC-008 baseline vs fixed timings and the regression check command | Yes | API-04, API-05, API-06, API-11; summary below | Proven | — |
| Round 2 (merged state) | — | R2-API-02, R2-API-06, R2-API-07, R2-API-R | All AC-001..AC-009 re-proven on the merged build (AC-008: table below, merged column) | — |
| AC-009 one copy's artifact lookup independent of other stored runs | Yes | API-02 (scoped read over GraphQL), API-06 S-API (scoped 3.2 ms with 3 unrelated runs → 5.6 ms with 300; generic 3.9 → 41.8 ms), API-R1 | Proven | — |

### AC-008: baseline vs fixed

Same seed for every build (50 Teams × 6 = 300 child agents, 300 unrelated team runs, 2.63 MB hub log). Times are page-clock ms; the regression check is the request counts.

| Measure | Base `5ceb43039a` (browser) | Fix (browser, 3 samples) | Fix (desktop, cold sample) | Round 2: base `2763e7c678` | Round 2: merged (browser) | QR |
| --- | --- | --- | --- | --- | --- | --- |
| Hub row → copy rows (T-1) | 7303 / 7288 ms after 312 projection + 312 artifact requests | 56 / 47 / 49 ms; 1 view request per hub, 0 member requests | 45 ms | 8385 / 9073 ms after 312 + 312 | 69 / 56 / 54 ms, 0 member requests (running: 62 ms) | QR-001 ≤ 2 s: met |
| Hub click → hub conversation (T-2) | 388 / 360 ms, then 300 + 301 member requests (re-staging) | 390 / 381 / 350 ms; 0 member requests (running hub: 416 ms) | 225 ms | 409 / 389 ms, then 300 + 301 | 407 / 370 / 364 ms (running: 394 ms) | QR-002 ≤ 2 s: met |
| Copy click → copy conversation (T-3) | 54 / 50 ms (already preloaded) | 61 / 56 / 56 ms; exactly 1 projection + 1 artifact request; reopen 11–12 ms, 0 requests | 55 ms | 58 / 55 ms (preloaded) | 65 / 64 / 64 ms, 1 + 1; reopen 13–42 ms, 0 requests | QR-002 ≤ 2 s: met |
| Copy with a 2.37 MB conversation | (base pays this inside staging, before the rows) | 262 / 258 ms | — | — | 319 ms | met |
| Server: a copy's artifact lookup | generic 37.8 ms (scoped query absent) | scoped 5.6 ms (generic 41.8 ms) | scoped 4.7 ms | generic 44.0 ms | scoped 6.2 ms (generic 44.4 ms) | QR-002 ≤ 100 ms: met |
| Server: hub view / hub conversation | 21.6 ms (2.73 MB) / 12.3 ms | 23.8 ms / 12.7 ms | 23.5 ms / 7.9 ms | 26.3 ms / 13.7 ms | 25.3 ms / 13.3 ms | — |

- Regression check commands:
  - repository: `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/agentRunCollaborationLazyChildren.spec.ts` (5 vs 50 Teams: one view request, zero member requests);
  - real stack: `pnpm -C autobyteus-web test:e2e:delegated-copies-large-hub --seed-to <dir> --teams 50 --unrelated 300`, then `… --from-seed <dir> --output-dir <fresh> --cases S`. Look for `opsUntilRows` without `GetAgentRunCollaborationMemberProjection` / `GetRunFileChanges`, and T-3 with exactly 1 + 1.
- The baseline on this synthesized hub is 7.3 s, not the minutes the user sees. The fixture's copies have small traces (only coordinators ran; 12.6 MB of memory against the user's 388 MB). Its unrelated team trees are also cheaper to scan: the generic lookup takes 38 ms here against 1.95–2.38 s on the user's data copy (`probes/probe-run1.txt`). The scaling is the same, two requests per child agent before any row. Measuring the user's own data is not allowed (TESTING.md Rule 2).
- ASM-001: confirmed in shape. The base delay is the per-copy fan-out: T-1 tracks 624 requests and drops to ~50 ms when they are removed. What remains on hub open is the hub's own path, unchanged.
- R-002 (hub message payload): not material at 2.63 MB. The view request takes ~24 ms, and rows show ~50 ms after the hub row. DEC-006 / FU-2 stand.
- R-004: observed as accepted, 2 loads (L-005).
- R-E: by design, not measured.
- FU-4: Task locate selects the worker in 541 ms (L-006).
- CAND-003: no retry exhaustion observed (L-009). Continuous streaming during a fetch was not produced.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | Every AC is proven directly: API-02, API-06, API-07, API-08, API-09, API-10, API-11, API-14, API-15 | Baseline absolute time on the synthesized hub (7.3 s) understates the user's minutes; live tool approvals are covered at unit level only | A trace-heavy fixture closer to the user's 388 MB |
| Changed-boundary execution directness | 85% | 97% | Real GraphQL/HTTP (API-02, S-API), real browser and Electron renderer, real WebSocket stream and real delegation (L-002) | none material | — |
| Cross-boundary integration realism and mock gap | 75% | 93% | Real server, stream, stores and Electron. Scripted AGY drives real tools and events (no inference). Data made through public APIs | Synthesized data: small per-copy traces, cheaper unrelated trees, short scripted turns | Real-provider runs (cost) or richer synthesized traces |
| Environment, configuration, identity, and fixture fidelity | 80% | 93% | Isolated stacks, seed copies, base and fix on the same seed in the same session, desktop production bundle (API-11) | Shared machine load varied (5–60 during the timed runs); browser runs use Nuxt dev | Repeat timings on an idle machine |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 96% | Failure → log → retry on the real stack (API-15); republication during an open copy (L-002); stopped-hub wake (L-007); queued input across a reload (L-004); busy copy (L-009); foreign/wrong-address rejection (API-02); mutations (API-R4) | Conflict-retry exhaustion under continuous streaming is not reproduced | A streaming emulator that emits events throughout a fetch |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | Browser journeys and screenshots; Electron instance with rows, copy open and row equivalence (API-11) | Live cases not in the shell (embedded server gets no scripted AGY) | — |
| Durable regression coverage quality and relevance | 85% | 95% | Server E2E for the new query (API-02); large-hub probe with package script, runnable against any build; the 5-vs-50 unit spec (API-R2) | The probe is a manual layer (not in CI), like the other browser probes | — |

- Overall post-repository confidence: 80% (API-R*, API-02, API-03)
- Overall final confidence: 95.0% ((96 + 97 + 93 + 93 + 96 + 95 + 95) / 7). Round 2 reproduces every round-1 result on the merged build. The scores are unchanged: the desktop shell was not rerun on the merged build, but the category stays at 95% because the merge changed no shell code.
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: synthesized fixture realism (baseline magnitude); CAND-003 under continuous streaming; OBS-2 (one extra 2.7 MB view request per hub click).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (probe-owned real stack, base and fix), `Project Desktop Validation` (isolated instance), `Live API` (server E2E)
- Confidence gap or residual risk it addresses, and the expected gain: post-repository the new query had unit coverage only; there were no large-hub timings and no real-stream evidence of republication, pending input or failure. All are now executed.
- Browser validation needed: yes. Renderer state, request fan-out and live stream ordering are the changed behavior.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: an isolated instance of the packaged worktree build on a copy of the seeded large hub. The probe attached over CDP and ran the stopped-hub samples and the row comparison; instance stopped and its ports released.
- Cases proving web-equivalent behavior: API-06, API-07..API-10, API-14, API-15 (browser). Shell: API-11. No shell code changed.
- Effect on any already-running desktop application: `None`. Other agents' instances (`iso-54255-*`, `iso-65187-14ae`) were not touched.
- Behavior not directly proven: live cases inside the shell. The same renderer code is proven live in the browser.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts` | Added | API-02, API-12 | — |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`GENERATE_IMAGE:<path>` directive in `linked_skills`) | Updated | API-02, API-12 | — |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Added | API-04..API-11, API-14, API-15 | — |
| `autobyteus-web/package.json` (`test:e2e:delegated-copies-large-hub`) | Updated | API-13 | — |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` (round 2: append-only hub-log reader for seeding, `messageLogObservation` and `hubMessageLogBytes`) | Updated | R2-API-04..R2-API-07 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI / model inference | scripted `agy-failure-cli.mjs` (`linked_skills`; `CALL_TOOL(S)`, `HOLD_TURN`, `ECHO_INPUT`, new `GENERATE_IMAGE`) | No provider spend is needed; the change is not in inference. TESTING.md names this fixture for real delegation and streams | Turn timing and content shapes are synthetic |
| Network failure | `page.route(...).abort('failed')` on one projection request (L-011) | Deterministic failure | One failure kind (network) |
| A second client | Node WebSocket on the hub stream (L-004, L-009, seed) | Queued input needs a sender other than the busy copy's composer | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Base git worktree `/tmp/dcso-api-e2e/base` (created twice) | Yes | `git worktree remove --force`, `git worktree prune` | removed; `git worktree list` shows none |
| Seeds `/tmp/dcso-api-e2e/{seed,seed10,dbg-seed}` + manifests | Yes | `rm -rf` after the measurements | removed (manifests copied to evidence) |
| Probe stacks (backend, Nuxt, Chrome, run-root copies, private HOMEs) | Yes | probe `finally` per run; three private HOMEs left by debug runs I killed were removed by hand | evidence `cleanup` blocks show `runRootRemoved: true`, ports closed; no probe processes left |
| Isolated instance `iso-49384-a072` and its data root | Yes | `isolated-app stop`, `rm -rf /private/tmp/dcso-api-e2e/desktop-root` | stopped, ports released, data root removed |
| `autobyteus-web/electron-dist/`, rebuilt `autobyteus-server-ts/dist/` | Yes (build outputs) | left in place (untracked build outputs, same source) | — |
| Round 2: base worktree `/tmp/dcso-api-e2e/base2`, seed `/tmp/dcso-api-e2e/r2-seed` | Yes | `git worktree remove --force` + prune; `rm -rf` | removed; probe stacks closed (`runRootRemoved: true`, ports closed) |
| `/tmp/dcso-api-e2e/` probe outputs and logs | Yes | kept outside the repository; the evidence used is copied into the ticket | — |

## Out-Of-Scope Observations (follow-ups)

| ID | Observation | Evidence | Pre-existing? | Scope / Owner |
| --- | --- | --- | --- | --- |
| OBS-1 | A running hub's live view lists only part of its stored message log. Live: 11 of 252, 4 of 42, 3 of 22; on the merged state (append-only logs): 14 of 252 (`R2-API-04-seed/probe-output.txt`). After the hub stops, the stored view lists all of them. This follows copies sending the hub several messages in one parallel batch | `OBS-1-live-view-message-gap.txt` | Yes, same on base `5ceb43039a` | Outside the Change Scope (message area; FU-2/autobyteus-114 neighbourhood). Follow-up for the Project Task manager |
| OBS-2 | A hub click issues `GetAgentRunCollaboration` twice for the hub (base: once). Likely cause from reading the code: `useAgentRunCollaborationSync`'s watch key includes `bindingRevision`, and the store dedupes only an in-flight inspection. The base's slow staging used to absorb the second trigger | `OBS-2-hub-click-double-view-request.txt` | The double trigger is pre-existing; the extra request is now visible because inspection is fast | Non-blocking: one extra 2.7 MB view per hub click, T-2 still 350–390 ms. Not an AC violation. Follow-up |
| OBS-3 | A copy whose conversation consists of 60 KB single-token messages (2.46 MB) takes ~86.7 s of client processing (server 19.5 ms). The same size in prose takes 262 ms | `OBS-3-unbroken-token-conversation.txt` | Yes; base freezes on the same content while staging every copy | Outside the Change Scope (conversation building/rendering). Follow-up |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see the handoff message (code reviewer for proportional test-code review)
- Notes: round 2 (merged state): Pass. The probe change needs the code reviewer's proportional review. The classification stays Medium / High. OBS-1..OBS-3 go as follow-ups. None blocks this ticket's acceptance criteria.
