# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance` @ `88bd41620`
- Coverage investigation: `api-e2e-coverage-investigation.md` (same folder)
- Execution coverage report: `api-e2e-execution-coverage-report.md` (same folder)
- API/E2E revision record: `api-e2e-revision-record.md` (same folder)
- Ledger scope and reason it is required: Round 1 (API-REV-001). Multiple independent cases, long builds, owned live services.
- Last updated: 2026-10-04

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Changed specs (Panel, Overview, projection) | AC-002/003/004/006/008 | Vitest/jsdom | `pnpm -C autobyteus-web test:nuxt components/workspace/collaboration services/agentOrgExecution/__tests__/agentOrgReferenceProjection.spec.ts --run` | 1 | — |
| DUR-001..003 | Org-root integration: hashing bound on mount/switch at 42k refs, live `applyEvent` arrival, open last reference | AC-003/004/007, REQ-005/006 | Vitest/jsdom, real context/projection/crypto-js | new spec | 2 | Durable |
| R-002 | Broader affected suites | Regression | Vitest | collaboration, agentOrgExecution, agentCollaboration, rootExecution, layout | 3 | — |
| R-003 | Localization audit + guard | REQ-003 copy | scripts | `audit:localization-literals`, `guard:localization-boundary` | 4 | — |
| E-001 | Org-tab member switch sequence, timing + DOM/ref-row counts | AC-001/002, QR-001/002 | Production build + isolated snapshot server, headless Chrome | `TF/probes/measure-spike.mjs <out> Org` | 5 | — |
| E-002 | Show all 3,136 timing | AC-005, QR-003 | same | same run | 5 | — |
| E-003 | Files-tab control | AC-006 | same | `TF/probes/measure.mjs <out> Files` | 6 | — |
| E-004 | First + last of 3,136 references open; content equals server REST content by server-computed hash; missing-file error | AC-004, REQ-004 | same + REST | `TF/probes/api-e2e-reference-open.mjs` | 7 | — |
| E-005 | Live arrival at real scale (preview and Show-all states, reference open) | AC-007, QR-001, SCN-A1/A2 | same, real `applyEvent` | `TF/probes/api-e2e-live-arrival.mjs` | 8 | — |
| E-006 | Team root large run: switch timing, bounded rows, open reference | AC-008 | same | `TF/probes/api-e2e-team-root.mjs` | 9 | — |
| E-007 | zh-CN rendering of count title and Show all | REQ-003 copy | same | part of E-006 or separate | 10 | — |
| E-008 | Electron renderer spot check (switch timing + Show all) | ASM-002/UNK-002, QR-001/003 | Isolated desktop instance (worktree build) | `isolated-app start --from-worktree --data-root …` + CDP | 11 | — |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | E-008 | 2026-10-04 09:33 | Checkpoint | `pnpm build:electron:mac` started in background (log `/tmp/omsp-api-e2e/electron-build.log`) | Packaged worktree app | Build running | — | — | Continue repository cases |
| 2 | R-001 | 09:33 | Completed | `pnpm -C autobyteus-web test:nuxt components/workspace/collaboration services/agentOrgExecution/__tests__/agentOrgReferenceProjection.spec.ts --run` | All pass | 4 files / 28 tests passed | Pass | console | — |
| 3 | DUR-001..003 | 09:35 | Completed | `pnpm -C autobyteus-web test:nuxt components/workspace/collaboration/__tests__/CollaborationMessagesOrgRoot.integration.spec.ts --run` | 3 pass on HEAD; must fail on regression | HEAD: 3/3 pass. Mutation, base source for 3 files: worker OOM (`/tmp/omsp-api-e2e/mutation-base.log`). Mutation, eager hash only: 2 fail, `expected 42000 to be +0` and `expected 42001 ≤ 20` (`/tmp/omsp-api-e2e/mutation-eager-hash.log`). Source restored (git status clean for tracked files) | Pass | spec file | — |
| 4 | R-002 | 09:38 | Completed | `pnpm -C autobyteus-web test:nuxt components/workspace/collaboration services/agentOrgExecution services/agentCollaboration services/rootExecution components/layout components/workspace/team utils/teamCommunication --run` | Pass except known pre-existing | 25 files: 211 pass, 2 fail (`RightSideTabs.workspaceTarget.spec.ts` "retains A while canonical B metadata fails…"). Re-run on base sources for all 8 changed files: same 2 fail with the same assertion (`/tmp/omsp-api-e2e/r002-base-rightsidetabs.log`). Pre-existing, unrelated | Pass (regression-free) | `/tmp/omsp-api-e2e/r002-broader.log` | — |
| 6 | E-008 | 09:42 | Checkpoint | Electron build EXIT 0; packaged `app.asar` (sealed 09:34:18, before any temporary source swap) contains `get referenceId(){return r??=…}` and `team-communication-show-all-references` | Worktree code in package | Verified | — | `/tmp/omsp-api-e2e/electron-build.log` | Run after browser cases |
| 7 | setup | 09:45 | Checkpoint | `nuxt build` (BACKEND_* → 29811) of `88bd41620`; isolated backend on owned copy `/tmp/omsp-api-e2e/data` (PID 88153; log shows `Datasource … file:/tmp/omsp-api-e2e/data/db/production.db`); static 29812 (PID 88154) | Ready | health ok / 200 | — | `/tmp/omsp-api-e2e/server.log` | — |
| 8 | E-001/E-002 | 09:47 | Completed | `node probes/measure-spike.mjs /tmp/omsp-api-e2e/e001 Org` | Every switch ≤ 200 ms; ≤ 50 ref rows; Show all ≤ 300 ms | Switches 20–69 ms (code reviewer 48–69; baseline 3,155–4,232); ref rows ≤ 20; DOM 828–1,916; Show all 3,136 = 260 ms | Pass | `evidence/api-e2e-E001-switch-Org-results.json` | — |
| 9 | E-003 | 09:48 | Completed | `node probes/measure.mjs /tmp/omsp-api-e2e/e003 Files` | ≤ 60 ms | 5–51 ms | Pass | `evidence/api-e2e-E003-switch-Files-results.json` | — |
| 10 | E-004 | 09:52 | Completed | `node probes/api-e2e-reference-open.mjs /tmp/omsp-api-e2e/e004` (2nd run; 1st run's probe assumed the newest row is selected, but the Org tab is the default tab and the preserved selection rule kept a shared message selected; the probe now selects the 3,136 message explicitly) | Count/copy; first + last open with server ID; served bytes = disk; Show all ≤ 300 ms ×5 | 13/13 checks pass. First (34,448,621 B tar.gz) and last (4,822 B .md) URLs carry `sha256(messageId\0path)`; served bytes SHA-256 equal to disk. Show all 208–266 ms ×5; only one reference list. The Playwright `response.body()` 4,842 B for the .md is a capture re-encoding artifact: in-page `fetch` received 4,822 B, SHA-256 `829ce138…` equal to disk (`/tmp/omsp-api-e2e/debug-bytes.mjs`) | Pass | `evidence/api-e2e-E004/` | Missing-file case → E-004b |
| 11 | E-005 | 09:58 | Completed | `node probes/api-e2e-live-arrival.mjs /tmp/omsp-api-e2e/e005`: real `AgentOrgExecutionContext.applyEvent` in the production page (context marked `live`); cumulative 3,186-ref events | New message shown; header +1; selection/Show all kept; existing ref-row DOM reused; ≤ 200 ms | L1 preview 28 ms (20/20 elements reused); L2 Show all 89 ms (3,136/3,136 reused); L3 last reference open 87 ms, viewer kept; L4 unrelated 78 ms, header unchanged; no page errors. First run's L3 asserted "no refetch" and failed; base comparison (`probes/api-e2e-base-live-arrival.mjs`) shows base also refetches the open reference twice and takes 2,276 ms with 45,151 rows. The refetch is pre-existing viewer behavior, so it is recorded as an observation | Pass | `evidence/api-e2e-E005/` | Observation OBS-001 |
| 12 | E-006/E-007 | 10:08 | Completed | `node probes/api-e2e-team-root.mjs /tmp/omsp-api-e2e/e006` on the snapshot Team run (241 messages / 9,798 refs for code_reviewer). The snapshot's team index had been emptied by migration `20260814_team_run_execution_tree_v1` at the implementer's 09:22 server start; restored from that migration's own backup in the owned copy only, then backend restarted (PID 71073, log `/tmp/omsp-api-e2e/server2.log`) | ≤ 50 ref rows per switch; Show all + last reference reachable; existing unavailable state for a missing file; zh-CN copy | Ref rows ≤ 20 every switch; all 241 messages with counts; Show all 183 in 35 ms; last reference → server 404 (file gone on disk) → "Reference file unavailable"; zh-CN `183 个引用文件` / `显示全部 183 个文件`; no page errors. Timing observation: Team tab code_reviewer 135–221 ms (Files control 16–22 ms; base 533–958 ms with 9,798 rows) | Pass | `evidence/api-e2e-E006-E007/` | Observation OBS-002 |
| 13 | E-008 | 10:20 | Completed | `pnpm --silent isolated-app start --from-worktree --data-root /tmp/omsp-api-e2e/electron-root` (iso-57804-dcbd, control 57804); `node probes/api-e2e-electron-spot-check.mjs 57804 /tmp/omsp-api-e2e/e008`. Earlier attaches failed on navigation: a substring text match hit the Team definition row, a run-row toggle collapsed the tree, and the 1200 px window uses the tool strip ("Agent Org"). Fixed in the probe; no product issue | Switch ≤ 200 ms, ≤ 50 rows; Show all ≤ 300 ms; live arrival ≤ 200 ms | Electron 42.4.1, 1200×768: switches 23–91 ms, ≤ 20 rows; Show all 275/245/246 ms; live arrival (Show all expanded) 145 ms, 3,136 rows kept; no page errors. Instance stopped | Pass | `evidence/api-e2e-E008/` | — |
| 14 | cleanup | 10:24 | Completed | isolated-app stop; kill backend 71073 / static 85171; removed owned data copies; `autobyteus-web/dist/public` restored to HEAD build | Nothing of mine running | Ports 29811/29812 free; isolated list shows only other worktrees' instances | — | — | — |
| 5 | R-003 | 09:39 | Completed | `audit:localization-literals`, `guard:localization-boundary` | Pass | Zero unresolved findings; guard passed | Pass | `/tmp/omsp-api-e2e/r003-localization.log` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 14 (row order in the table is not chronological; sequence numbers are)
- Last completed case and result: E-008 Pass
- Cases still running, interrupted, or not started: None
- Next case or recovery action: None
- Reconciled into execution coverage report: `Yes`, `api-e2e-execution-coverage-report.md` › Test-Case Ledger Reconciliation
