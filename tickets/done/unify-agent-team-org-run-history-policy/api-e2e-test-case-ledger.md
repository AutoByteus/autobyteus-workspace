# API/E2E Test-Case Ledger

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy`.
- Investigation: `api-e2e-coverage-investigation.md`; execution report: `api-e2e-execution-coverage-report.md`; revision record: `api-e2e-revision-record.md` (same ticket folder).
- Scope: API-REV-001 baseline, API-REV-002 correction, API-REV-003 user-requested real browser round; multiple independently meaningful cases.
- Last updated: 2026-09-24, API-REV-003 reconciled after B-01–B-07; round-3 plan was initialized before execution.

## Planned Cases

### API-REV-003 planned browser cases (initialized before execution)

| ID | Case | Boundary | Expected evidence |
| --- | --- | --- | --- |
| B-01 | Start owned isolated dev stack and open actual browser tab | process/browser | 8000/3000 ready; rendered Settings |
| B-02 | Import both user-specified local agent packages via Settings | browser/GraphQL/catalog | two successful package rows; no source mutation |
| B-03 | Inspect classroom Team and nested classroom Org definitions | browser/catalog | both selectable; nested addresses/member structure visible |
| B-04 | Bounded live classroom Team run via Codex if available | browser/runtime/team | professor/student exchange and history, or exact blocker |
| B-05 | Bounded nested classroom Org delegation run | browser/runtime/org | task-team result/review and history, or exact blocker |
| B-06 | Reload and inspect persisted Team/Org history and Memory | browser/API/persistence | visible run states and no imported-source writes |
| B-07 | Stop only owned stack and reconcile evidence | lifecycle | owned processes stopped; isolation preserved |


| ID | Case | Requirement / AC | Boundary | Planned order |
| --- | --- | --- | --- | --- |
| R-01 | Family/core/index/repair policy units | AC-001, 002, 004 | repository | 1 |
| R-02 | Team manager and Org lifecycle integration | AC-002, PM-001 | repository | 2 |
| R-03 | Workspace/archive/Org GraphQL and memory | AC-003, 005 | repository | 3 |
| R-04 | Server typecheck | AC-005 | build | 4 |
| L-01 | Isolated current-index query/read-only and two-instance probe | AC-001, 003, 004 | real stores/files | 5 |
| L-02 | Built offline repair CLI dry-run/apply/safeguards | AC-004 | CLI/isolated profile | 6 |
| L-03 | Imported Team memory source byte-identical after list | AC-003 | isolated imported folder | 7 |
| G-01 | Imported Team GraphQL list + run-list with real source selector and hash/read assertions | AC-003 | schema/real stores | round 2 |
| H-01 | Built HTTP GraphQL imported Team list + run-list on copied real roots | AC-003 | isolated server/process/HTTP | round 2 |

## Execution Events

| Seq | Case | Time | Event | Command/config | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-01 | 2026-09-24 12:07:43 CEST | Started | focused policy Vitest | all pass | running | — | /tmp/api-e2e-unified-history/r01.log | — |
| 2 | R-01 | 2026-09-24 12:07:56 CEST | Completed | same as seq 1 | 28 pass | 6 files/28 tests passed | Pass | /tmp/api-e2e-unified-history/r01.log | R-02 |
| 3 | R-02 | 2026-09-24 12:07:56 CEST | Started | manager/lifecycle Vitest | all pass | running | — | /tmp/api-e2e-unified-history/r02.log | — |
| 4 | R-02 | 2026-09-24 12:08:12 CEST | Completed | same as seq 3 | 26 pass | 4 files/26 tests passed | Pass | /tmp/api-e2e-unified-history/r02.log | R-03 |
| 5 | R-03 | 2026-09-24 12:08:12 CEST | Started | GraphQL and memory Vitest | all pass | running | — | /tmp/api-e2e-unified-history/r03.log | — |
| 6 | R-03 | 2026-09-24 12:09:02 CEST | Completed | 6-file GraphQL/memory suite | 13 pass expected | 3 pass, 3 fail (8 tests): archive harness missing new manager lane; workspace resolver constructs unmocked AgentRunHistoryService; built Org server TEST_SERVER_START_FAILED. Memory tests pass. | Fail | /tmp/api-e2e-unified-history/r03.log | Investigate fixture/build causes before rerun |
| 7 | R-03 | 2026-09-24 12:10:33 CEST | Checkpoint | narrow rerun after harness/package fixture update | workspace/archive pass | 2 files/8 tests passed; built Org server pending | — | /tmp/api-e2e-unified-history/r03-rerun2.log | Build before real-process rerun |
| 8 | R-04 | 2026-09-24 12:10:33 CEST | Started | TypeScript build typecheck | no diagnostics | running | — | /tmp/api-e2e-unified-history/r04.log | — |
| 9 | R-04 | 2026-09-24 12:10:49 CEST | Completed | tsc --noEmit | no diagnostics | pass | Pass | /tmp/api-e2e-unified-history/r04.log | R-03 built-server remediation |
| 10 | R-03 | 2026-09-24 12:12:03 CEST | Completed (rerun) | built server + corrected workspace fixtures | all 13 tests pass | 6 files/13 tests pass; initial failures were setup/build, no product defect | Pass | /tmp/api-e2e-unified-history/r03-final.log | L-01 |
| 11 | L-01 | 2026-09-24 12:12:48 CEST | Started | isolated copied real index arrays + 3 roots/family | reads nonempty admitted rows with unchanged bytes | copying | — | /tmp/api-e2e-unified-history/l01.log | — |
| 12 | L-01 | 2026-09-24 12:13:52 CEST | Completed | real copied current indexes, 3 admitted roots/family, built modules | same rows/bytes, no tree reads or index writes | 3+3 rows; first/second/new instance identical; 0 reads/writes; SHA-256 unchanged | Pass | /tmp/api-e2e-unified-history/l01.log | L-02 |
| 13 | L-02 | 2026-09-24 12:13:52 CEST | Started | isolated copied profile with one omitted index row/family | dry-run, apply, backup and corrupt safeguard | running | — | /tmp/api-e2e-unified-history/l02-*.log | — |
| 14 | L-02 | 2026-09-24 12:13:52 CEST | Checkpoint | built CLI default dry-run | no writes; 1 missing ID per family | 317 Team/18 Org existing, 1 missing each; applied=false, backup=null | — | /tmp/api-e2e-unified-history/l02-dry.log | apply on owned copy |
| 15 | L-02 | 2026-09-24 12:14:22 CEST | Checkpoint | built CLI --apply + strict readback/backup verification | one row restored/family, old rows intact | 2 byte-identical pre-write backups, 318 Team/19 Org rows, all prior rows preserved | — | /tmp/api-e2e-unified-history/l02-apply.log; l02-before.sha256 | corrupt-index safeguard |
| 16 | L-02 | 2026-09-24 12:15:25 CEST | Completed | built CLI dry-run/apply/corrupt/missing-index ack on owned copies | explicit repair only; safe failures | dry-run no apply; apply backed up and restored 1/family preserving prior rows; corrupt refused with unchanged bytes; missing index refused without acknowledgement, then applied with warning | Pass | /tmp/api-e2e-unified-history/l02-*.log | L-03 |
| 17 | L-03 | 2026-09-24 12:15:25 CEST | Started | imported Team memory over copied real roots | nonempty results; byte-identical files; bounded tree reads | running | — | /tmp/api-e2e-unified-history/l03.log | — |
| 18 | L-03 | 2026-09-24 12:16:10 CEST | Completed | built TeamMemoryExplorerService on imported copied folder; readiness primed before read count | <=1 tree read/root and byte-identical files | 3 admitted roots/1 card; 12 tree reads (4/root), 80 files byte-identical. Failure is current Team source repeatedly scanning all roots in member lookup; source diff is only manager stub. | Fail | /tmp/api-e2e-unified-history/l03.log; l03-diagnostic.log | F-001 focused origin review; do not infer conditional Org coverage |
| 19 | L-03 | 2026-09-24 12:45:06 CEST | Started (API-REV-002) | prior F-001 first: rebuild and isolated copied real Team roots | <=1 read/admitted root/request and computed SHA maps unchanged for both list methods | running | — | /tmp/api-e2e-unified-history/l03-rerun.log | — |
| 20 | L-03 | 2026-09-24 12:45:33 CEST | Checkpoint | built server IR-002 | build + sanitized bootstrap pass | dist ready at 49ce0d173 | — | /tmp/api-e2e-unified-history/build-r2.log | clone selected real roots |
| 21 | L-03 | 2026-09-24 12:46:03 CEST | Completed (API-REV-002) | built direct Team service, current copied index + 3 roots, two fresh requests after readiness | one read/root/request; computed hashes equal | Team-list 3 reads and Team-run-list 3 reads for 3 admitted roots; 44 actual file SHA-256 maps equal before/after each; 1 card/3 runs. F-001 resolved at built direct boundary. | Pass | /tmp/api-e2e-unified-history/l03-rerun.log; l03-rerun-probe.mjs | G-01 GraphQL imported selector |
| 22 | G-01 | 2026-09-24 12:47:23 CEST | Started (API-REV-002) | new imported Team GraphQL source-selector E2E, actual SHA-256 maps and post-readiness counters | both queries pass | running | — | /tmp/api-e2e-unified-history/g01.log | — |
| 23 | G-01 | 2026-09-24 12:47:56 CEST | Completed | new imported GraphQL source-selector E2E | 1 test pass | GraphQL Team-list and Team-run-list each read two admitted roots once, actual SHA-256 maps equal after each request, member/run identities preserved | Pass | /tmp/api-e2e-unified-history/g01.log; tests/e2e/memory/imported-team-memory-graphql.e2e.test.ts | H-01 built HTTP request |
| 24 | H-01 | 2026-09-24 12:48:36 CEST | Started | built server HTTP GraphQL on isolated owned imported copy | list/run responses; read-only hashes | running | — | /tmp/api-e2e-unified-history/h01.log | — |
| 25 | H-01 | 2026-09-24 12:48:46 CEST | Completed | built server, isolated HTTP GraphQL imported Team list/run-list | successful responses and unchanged hashes | 1 card/3 runs; 45 files hashed, pre-start/start/card/run maps identical; source index SHA identical; server and DB removed by harness | Pass | /tmp/api-e2e-unified-history/h01.log; h01-http.mjs | R-01/R-02/R-03/R-04 regression |
| 26 | R-01 | 2026-09-24 12:48:55 CEST | Started (API-REV-002) | policy/index/repair + changed Team Memory/location units | all pass | running | — | /tmp/api-e2e-unified-history/r01-r2.log | — |
| 27 | R-01 | 2026-09-24 12:49:10 CEST | Completed | 8-file focused policy and changed Memory units | 35 pass | 8 files/35 tests passed | Pass | /tmp/api-e2e-unified-history/r01-r2.log | R-02 |
| 28 | R-02 | 2026-09-24 12:49:10 CEST | Started (API-REV-002) | Team manager/Org lifecycle/workspace units | all pass | running | — | /tmp/api-e2e-unified-history/r02-r2.log | — |
| 29 | R-02 | 2026-09-24 12:49:29 CEST | Completed | 4-file manager/lifecycle | 26 pass | 4 files/26 tests passed | Pass | /tmp/api-e2e-unified-history/r02-r2.log | R-03 |
| 30 | R-03 | 2026-09-24 12:49:29 CEST | Started (API-REV-002) | GraphQL/memory affected suite including new imported Team E2E | all pass | running | — | /tmp/api-e2e-unified-history/r03-r2.log | — |
| 31 | R-03 | 2026-09-24 12:49:58 CEST | Completed | 7-file GraphQL/memory suite | 15 pass | 7 files/15 tests passed | Pass | /tmp/api-e2e-unified-history/r03-r2.log | R-04 |
| 32 | R-04 | 2026-09-24 12:49:58 CEST | Started (API-REV-002) | server tsconfig typecheck including new E2E test | no diagnostics | running | — | /tmp/api-e2e-unified-history/r04-r2.log | — |
| 33 | R-04 | 2026-09-24 12:50:14 CEST | Checkpoint | tsc -p tsconfig.json --noEmit | no diagnostics | failed TS6059 across unrelated tests because rootDir=src while include=tests; project-wide config unsuitable for test check | — | /tmp/api-e2e-unified-history/r04-r2.log | run authoritative build config and isolated test config |
| 34 | R-04 | 2026-09-24 12:51:08 CEST | Completed | authoritative build-config tsc and isolated new-test tsc | no diagnostics | both pass; generic tsconfig.json check remains pre-existing TS6059 rootDir/include conflict, not a source/test diagnostic | Pass | /tmp/api-e2e-unified-history/r04-build-r2.log; r04-g01.log; build-r2.log; initial r04-r2.log | confidence assessment and cleanup |

| 35 | B-01 | 2026-09-24 13:11:41 CEST | Started API-REV-003 | `pnpm dev` in isolated worktree; `/tmp/api-e2e-unified-history/browser-dev.log` | both services ready and real browser render | startup running | — | browser-dev.log | B-02 |
| 36 | B-01 | 2026-09-24 13:12:48 CEST | Completed | `pnpm dev`, Chrome new tab at 127.0.0.1:3000/settings | live rendered Settings and both services | backend health OK, Nuxt 3.21.1 ready, Chrome AX and screenshot show Settings page | Pass | browser-dev.log; Chrome UI observation | B-02 |
| 37 | B-02 | 2026-09-24 13:14:37 CEST | Completed | Chrome Settings → Agent Packages → Import Package twice, with inherited AUTOBYTEUS_AGENT_PACKAGE_ROOTS removed for this owned dev process | both local paths newly linked | Success UI for each; public package 8 shared/44 local/12 Teams, private 40 shared/24 local/8 Teams; rows show requested absolute paths | Pass | Chrome AX import confirmations; isolated .env + registry | B-03 |
| 38 | B-03 | 2026-09-24 13:15:37 CEST | Completed | Chrome Agent Teams/Agent Orgs catalogs and nested detail | both imported definitions and nested members visible | Classroom Simulation Team card shows professor coordinator + student; Nested Classroom Test Org shows Teacher + StudentStudyGroup; nested Team detail shows student_one coordinator + student_two | Pass | Chrome AX routes `/agent-teams?view=team-list`, `/agent-orgs?view=org-detail&id=nested-classroom-test`, owned Team detail | B-04 |
| 39 | B-04 | 2026-09-24 13:16:43 CEST | Started/checkpoint | Chrome Team Run, Codex App Server / OpenAI GPT-6-Luna medium, Auto approve tools OFF, bounded arithmetic exchange | professor/student file-backed exchange | browser created active Team run; professor initializing after prompt | — | Chrome AX; browser-dev-no-roots.log | await runtime |
| 40 | B-04 | 2026-09-24 13:21:56 CEST | Checkpoint (not final) | live professor/student exchange | answer + professor review | professor created homework, sent `/student` with reference file; student wrote answer 24, returned `/professor` with reference file; two accepted messages visible; professor final review pending, trace last event get_handoff_rules result | — | Chrome AX; two on-disk Markdown files; raw traces and communication messages | B-05 while awaiting professor |
| 41 | B-05 | 2026-09-24 13:23:11 CEST | Started/checkpoint | Chrome Org run `nested_classroom_test_org_26659114668a4ceabcde8c72d1da1247`, Codex App Server GPT-6-Luna medium, auto-approve OFF | Teacher delegates to `/StudentStudyGroup`, exact token result, lifecycle acceptance | Org active and Teacher initializing after bounded prompt | — | Chrome AX active Org route | await delegation |
| 42 | B-05 | 2026-09-24 13:24:06 CEST | Completed | Chrome Teacher→`/StudentStudyGroup` `delegate_task`, nested student_one `submit_task_result`, Teacher `review_task_result` | exact token and Accepted lifecycle | task team spawned with nested student_one/student_two, result `NESTED_CLASSROOM_OK` submitted and accepted; UI Task panel says Accepted; Teacher final confirms match | Pass | Chrome AX task hierarchy, Task panel and Teacher final; org run `nested_classroom_test_org_26659114668a4ceabcde8c72d1da1247` | B-04 final + B-06 |
| 43 | B-04 | 2026-09-24 13:25:14 CEST | Completed with recovery caveat | live Team, Codex App Server GPT-6-Luna, auto-approve OFF | file-backed professor/student exchange and final review | homework + student answer 24, two accepted reference-file messages; professor appeared running without new trace after student reply for ~8 min, browser Stop generation released queued reply; professor read answer and returned `CLASSROOM_BROWSER_OK` with correct feedback. Autonomous no-intervention completion was not demonstrated. | Pass (caveat) | Chrome AX + owned files/raw traces; manual stop recorded | B-06 |
| 44 | B-06 | 2026-09-24 13:28:52 CEST | Completed | Safari separate browser after Chrome was externally used; reload/reopen Team+Org; Memory Team list/detail/inspector | persisted runs and read-only memory | after reload Team and Org groups/runs reappeared; Team professor transcript and two messages persisted; Org accepted task persisted; Memory card shows Classroom Simulation Team 1 run/2 members, inspector exposes 16 raw trace records and CLASSROOM_BROWSER_OK. Actual SHA-256 maps of four index/tree files and 16 definition files unchanged across Memory reads. Org Memory adapter conditional N/A on this branch. | Pass | Safari AX; browser-memory-before/after.sha256; browser-definitions-before/after.sha256 | B-07 cleanup |
| 45 | B-07 | 2026-09-24 13:32:24 CEST | Completed | Safari UI stopped owned Team/Org, archived both inactive histories; verified persisted index rows; SIGTERM owned run-dev PID 7589; closed Safari test tab | safe lifecycle/cleanup | Team and Org rows each have non-null terminatedAt then archivedAt; sidebar says history archived/no task history; physical Team/Org trees and classroom files remain intact; ports 8000/3000 released; `git diff --check` pass. Chrome dedicated local test tab remains open but now inert; no user Chrome API-key tab touched. | Pass | live index JSON, Safari AX, lsof/ps, browser-dev-no-roots.log | round reconciliation |

## Re-entry And Reconciliation

- Last durably recorded event: sequence 45, B-07 completed Pass in API-REV-003.
- Last completed case/result: B-07 Pass. API-REV-003 B-01–B-07 completed; B-04 includes a manual-intervention caveat. No selected case remains pending.
- Prior failure resolution: L-03/F-001 Fail at sequence 18 was rechecked first; sequence 21 measured three reads for three admitted roots **for each request**, with actual computed SHA-256 equality on 44 copied files. G-01 and H-01 then confirmed the imported GraphQL source-selector and built HTTP boundaries.
- Round 2 caveat: the generic `tsconfig.json` check has an existing rootDir/include conflict (TS6059 across unrelated tests). The authoritative build config and an isolated config including the new E2E test passed; sequence 33–34.
- Reconciled into execution report: Yes — `api-e2e-execution-coverage-report.md` API-REV-003 latest result and case matrix.

## API-REV-003 final reconciliation

- Events 35–45: B-01, B-02, B-03, B-05, B-06 and B-07 Pass; B-04 Pass with explicit manual-intervention caveat after a long-running professor turn. No case remains pending.
- Browser was real Chrome/Safari against owned `pnpm dev` backend/frontend. The B-04 caveat does not erase the two accepted Team handoffs or final professor answer; it does limit autonomous completion confidence.
- Both test histories were stopped/archived in the isolated profile and the owned server process was stopped. API-REV-003 current authoritative result is in `api-e2e-execution-coverage-report.md`; API-REV-001/002 history is preserved.
