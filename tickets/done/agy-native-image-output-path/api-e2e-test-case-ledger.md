# API/E2E Test-Case Ledger — agy-native-image-output-path

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path`
- Coverage investigation: `…/api-e2e-coverage-investigation.md`
- Execution coverage report: `…/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `…/api-e2e-revision-record.md`
- Ledger scope: API-REV-001. Multiple independent cases, and the live AGY runs are long-running.
- Last updated: 2026-09-28

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path`

## Planned Cases

| Case ID | Case / Journey | Req / AC | Surface | Command / Entry | Order |
| --- | --- | --- | --- | --- | --- |
| API-E2E-001 | Focused unit suites (reader, converter, lifecycle, FCP) | REQ-001..005, AC-002/003/005 | Unit, real temp filesystem | `vitest run tests/unit/agent-execution/backends/antigravity tests/unit/agent-execution/events/file-change-event-processor.test.ts` | 1 |
| API-E2E-004 | Fake-AGY transport: denial redaction, terminal error, and **new** DONE-unresolved fallback | BEH-002, REQ-005, AC-002, SCN-002 | Full in-process server over GraphQL/WS, fake CLI | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/runtime/agy-failure-transport.e2e.test.ts` | 2 |
| API-E2E-002 | Live codex-skill native image (real agy 1.2.12) | AC-001, AC-005, REQ-002 | Real AGY and real reader | `RUN_AGY_CAPABILITY_E2E=1 vitest run tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts -t "native AGY image"` | 3 |
| API-E2E-003 | Live app chat: path, FILE_CHANGE, preview, and **new** history/reopen | AC-001, AC-004, AC-005, SCN-001 | Full server, real AGY, WS, REST, GraphQL history | `RUN_AGY_CAPABILITY_E2E=1 vitest run tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts -t "native generate_image"` | 4 |
| API-E2E-005 | Broader unit regression, plus `tsc` build check | Regression | Unit | `vitest run tests/unit/agent-execution tests/unit/run-history tests/unit/services/agent-streaming`; `tsc -p tsconfig.build.json --noEmit` | 5 |
| API-E2E-006 | Browser: live Activity card and Artifacts preview; reopen after terminate | AC-001, AC-004, AC-005, SCN-001 (UI) | Documented `pnpm dev` stack (backend 8000, Nuxt 3000), real agy 1.2.12, browser tab | `pnpm dev` from the worktree root; UI Run → Antigravity CLI / Gemini 3.8 Flash (Low) → send message | 6 |
| API-E2E-007 | Server-level step-output cases with a fake AGY transport and a test-owned temporary HOME: resolved, missing, outside the conversation, symlinked image | AC-001..AC-005 wiring, REQ-002, REQ-003, SCN-002 | Full in-process server over GraphQL/WS/REST; production reader with its default brain root under the overridden HOME | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts tests/e2e/runtime/agy-failure-transport.e2e.test.ts` | 7 |

## Execution Events

| Seq | Case ID | Timestamp | Event | Command / Config | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-E2E-001 | 15:37 | Completed | Focused unit suites (see plan) | All pass | 9 files passed, 3 live-gated skipped; 106 passed, 5 skipped | Pass | `…/api-e2e-evidence/api-e2e-001.log` | — |
| 2 | API-E2E-004 | 15:38 | Completed | Fake-AGY e2e with `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<wt>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`; new `image_done_unresolved` case | Denial and terminal redaction hold; unresolved DONE gives SUCCESS with `{provider_state:"DONE", output:null}`, public arguments, no FILE_CHANGE, no ERROR, turn completes, one content-free warning, history replays `output:null`, `getRunFileChanges` empty | 3/3 pass. Observed warning `AGY_NATIVE_IMAGE_PATH_UNRESOLVED run=agy_failure_… step=1 reason=OUTPUT_MISSING` (no path or content) | Pass | `…/api-e2e-evidence/api-e2e-004.log` | — |
| 3 | API-E2E-002 | 15:40 | Completed | Live, real agy 1.2.12, `RUN_AGY_CAPABILITY_E2E=1`, `-t "native AGY image"` | `file_path` inside realpath(brain/<conv>); output contains it; arguments `ImageName`/`Prompt` | 1 passed (25.4 s) | Pass | `…/api-e2e-evidence/api-e2e-002.log`, `…/api-e2e-evidence/real-native-image.json` | — |
| 4 | API-E2E-003 | 15:41 | Completed | Live full server, real agy 1.2.12, `-t "native generate_image"`, with the new history/reopen assertions | Path, output text, one `generated_output` FILE_CHANGE, `image/*` preview bytes equal; history conversation and activities replay the identical result and arguments; `getRunFileChanges` has exactly one entry; preview works before and after terminate | 1 passed (18.8 s). run `agy_native_image_c8bf03b0_…`, `file_path=/Users/normy/.gemini/antigravity-cli/brain/855022f6-ae9f-42e9-8cb0-07b2ca60e76a/simple_blue_dog_1790602801561.jpg`. The assistant reply did not mention a path (AGY's tool output tells the model not to output it) | Pass | `…/api-e2e-evidence/api-e2e-003.log`, `…/api-e2e-evidence/app-native-image-chat.json` | — |
| 5 | API-E2E-005 | 15:44 | Completed | `vitest run tests/unit/agent-execution tests/unit/run-history tests/unit/services/agent-streaming`; `tsc -p tsconfig.build.json --noEmit`; base-source recheck of the 4 failing files | No new failures; tsc clean | 1184 passed, 10 failed (4 files: team-run-history-catalog, codex-tool-log-correlation, agent-run-provisioning, published-artifact-projection). The same 10 fail with the 3 changed source files reverted to `fcd3e83a4`, so they are pre-existing and unrelated. tsc exit 0 | Pass (no regression) | `…/api-e2e-evidence/api-e2e-005-unit.log`, `…/api-e2e-evidence/api-e2e-005-baseline.log`, `…/api-e2e-evidence/api-e2e-005-tsc.log` | — |

| 6 | API-E2E-006 | 15:45–15:48 | Completed | `pnpm dev` (worktree root, state in ignored `.autobyteus/development/`); agent `agy-image-api-e2e` created via GraphQL; UI run with Antigravity CLI / Gemini 3.8 Flash (Low), auto-approve on; message "…golden retriever dog illustration…" | Activity card shows SUCCESS, `ImageName`/`Prompt` arguments, and a result with `output` text plus absolute `file_path`; Artifacts lists one entry that previews; after terminate and page reload, the reopened run shows the same | Live: card SUCCESS; arguments `{ImageName:"golden_retriever", Prompt:…}`; result `file_path=/Users/normy/.gemini/antigravity-cli/brain/d52aa893-e5bf-4a96-9b3c-101dfefb6d37/golden_retriever_1790603161894.jpg` (on disk: JPEG 1024×1024); `output` contains the same path. Artifacts: exactly 1 entry `golden_retriever_1790603161894.jpg` with that path; `<img>` loaded 1024×1024. Reopened (Offline) after `terminateAgentRun`: identical card JSON and the same single Artifacts entry previewing 1024×1024 | Pass | `…/api-e2e-evidence/browser-live-activity-card.png`, `browser-live-artifacts-preview.png`, `browser-reopened-activity-card.png`, `browser-reopened-artifacts-preview.png`, `dev-stack.log` | Stack stopped (SIGINT), ports freed, `.autobyteus/development/` removed |
| 7 | API-E2E-007 | 15:52 | Completed | New durable suite; fake AGY with `AGY_FAKE_CASE=image_done` and a test-planted `AGY_FAKE_CONVERSATION_ID`; worker HOME set to a temp dir via gated `vi.hoisted` | Resolved: result `{DONE, output:<text>, file_path:<realpath>}`, one FILE_CHANGE, `getRunFileChanges` one entry, preview bytes equal, history replay equal, no warning. Missing, outside and symlink cases: `{DONE, output:null}`, exactly one warning with reason `OUTPUT_MISSING` / `PATH_OUTSIDE_CONVERSATION` / `IMAGE_MISSING`, no FILE_CHANGE, empty file changes, history `output:null` | 4/4 pass plus failure-transport 2/2 (6/6). Gated-off run: 4 skipped, no temp dir created. Temp HOME removed after the run. Real `~/.gemini` not modified. The interim fallback case added to `agy-failure-transport.e2e.test.ts` in seq 2 was moved into this suite; that file is back at HEAD | Pass | `…/api-e2e-evidence/api-e2e-007.log` | — |

## Re-entry And Reconciliation

- Last durably recorded event: seq 7
- Cases still running or not started: none
- Note: `api-e2e-004.log` (seq 2) reflects the interim location of the fallback case. It is superseded by seq 7 and kept for history.
- Reconciled into execution coverage report: Yes — `api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation
