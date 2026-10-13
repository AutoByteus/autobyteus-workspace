# API/E2E Execution Coverage Report — delegated-copy-model-change

## Execution Round Meta

- Requirements Doc: `tickets/in-progress/delegated-copy-model-change/requirements-doc.md` (Approved, SR-007)
- Investigation Notes: `tickets/in-progress/delegated-copy-model-change/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/delegated-copy-model-change/solution-revision-record.md`
- Design Spec: `tickets/in-progress/delegated-copy-model-change/design-spec.md` (SR-007)
- Supplemental Task Artifacts: N/A — not applicable
- Design Review Report: `tickets/in-progress/delegated-copy-model-change/design-review-report.md` (ARCH-REV-003)
- Architecture Review Revision Record: `tickets/in-progress/delegated-copy-model-change/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/delegated-copy-model-change/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `tickets/in-progress/delegated-copy-model-change/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/delegated-copy-model-change/code-review-report.md` (CRR-002, `Pass`)
- Code Review Revision Record: `tickets/in-progress/delegated-copy-model-change/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `tickets/in-progress/delegated-copy-model-change/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `tickets/in-progress/delegated-copy-model-change/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `tickets/in-progress/delegated-copy-model-change/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`; round 1; trigger CRR-002 `Pass`; prior round: none.

## Routing Classification

- `Large` / `High`; input route `Reviewed`; successful-output route `Code Review`; test-code review `Required`.

## Investigation And Execution Basis

- Investigation written before durable changes: `Yes`; plan followed: `Yes`.
- Decisions revised during execution: none of the product expectations; two probe assumptions corrected (the sidebar Team-copy row is found by its label; the `COPY_RUNNING` refusal is shown in the Settings banner, the Save bar keeps "Unsaved changes").
- Reroute required: `No`.

## Test-Case Ledger Reconciliation

- Ledger initialized before execution, every case recorded, reconciled here: `Yes`. Cases not started: none.

| Case | Result | Evidence |
| --- | --- | --- |
| BASE-001 | Pass (baseline fix `aaf6f010f1`) | ledger event 1 |
| REPO-001..003 | Pass | `api-e2e-evidence/*.log` |
| DCM-001..007 | Pass (2 runs) | `api-e2e-evidence/server-e2e/dcm-run-1.log`, `dcm-run-2.log` |
| REG-001 | Pass | `api-e2e-evidence/server-e2e/*.log` |
| REG-002 | Pass (known baseline exception only) | `api-e2e-evidence/server-integration.log` |
| DCP-001..004 | Pass | `browser-probe-run-1/` (001, 003), `browser-probe-run-2/` (002, 004), `browser-probe-full-run-1/` (all) |
| DLP-001..010 | Pass | `browser-probe-full-run-1/` |
| ISO-001 | Pass | `api-e2e-evidence/isolated-instance/` |

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`. Legacy retention observed: `No`.
- Persisted transition `Directly Usable — No Migration` followed: `Yes` (optional fields; reopen and backend restart restore the choice; the earlier ticket's old-shape cases DLP-006 and DLC-008 still pass).
- Compatibility-only durable coverage: `No`.

## Changed Boundary And Evidence Matrix

| Case | AC / REQ | Boundary | Surface | Type | Result | Key evidence |
| --- | --- | --- | --- | --- | --- | --- |
| DCM-001..004 | AC-001, AC-002, AC-003 (follower), AC-006 (not offered), AC-009, AC-011 (running), AC-005 (reopen) | GraphQL stop/update/options; task lifecycle; restore | Server E2E, Team + Agent roots | Durable (existing) | Pass | AGY argv `--model` = choice at resume |
| DCM-005 | AC-001, AC-002, AC-007, DEC-001, IR-002 | Org root; collaborator; live event | Server E2E | Durable (added) | Pass | Org agent copy, Team copy and collaborator resume on ALT; view frame `delegated_launch_selections_changed`; a later copy of the same definition starts on MODEL |
| DCM-006 | AC-002, AC-003, AC-004, DEC-008, REQ-006, QR-001 | per-copy shutdown with a turn in progress; containment | Server E2E (fake Grok `cancel.jsonl`) | Durable (added) | Pass | `session/prompt` then, after Stop, `session/cancel`; crew lead and nested copy processes gone, other copy's process and the PM still running; ALREADY_STOPPED; Team choice: lead and never-started follower on ALT, never-started `own` member on its default ALT2; nested copy resumes on MODEL |
| DCM-007 | AC-011, AC-006, REQ-008, IR-002 | woken during edit; schema validation; Team stream; activation failure | Server E2E | Durable (added) | Pass | COPY_RUNNING with nothing recorded; VALIDATION_FAILED with field errors; `DELEGATED_LAUNCH_SELECTIONS_CHANGED` with the choice; retired model → `AGY_MODEL_UNAVAILABLE`, no launch, history kept; new choice → resume with the same `--conversation` |
| DCP-001 | AC-001, AC-002, AC-004 | Agent root UI | Browser probe | Durable (existing) | Pass | locked row + hint, sidebar Stop, Save, resume |
| DCP-002 | AC-002, AC-003, IR-002 | Team root UI; member context | Browser probe | Durable (added) | Pass | sidebar Stop of the Team copy row; root stays active; Team model saved (`user_team_launch_selection`); "+" from the copy lead prefills "Gemini test" without a reload; lead resumes on MODEL |
| DCP-003 | AC-001, AC-002 | Org root UI; Settings-row Stop | Browser probe | Durable (added) | Pass | Org sidebar stop icon disappears after the Settings Stop; Save; row shows the choice without origin; resume on MODEL |
| DCP-004 | AC-011, AC-005 | UI refusal; app (backend) restart | Browser probe | Durable (added) | Pass | banner "This copy is running. Stop it, then change its model."; nothing recorded; after Save and backend restart the row shows the choice and the copy resumes on it |
| ISO-001 | design step 6, AC-001, AC-006, REQ-004 | packaged app, real runtimes | Isolated desktop instance | Desktop / Live | Pass | Codex copy (`gpt-5.6-luna`) stopped in Settings (row locked with the hint while running; runtime locked to Codex App Server), switched to `gpt-6-luna`, saved; the user's message from the copy's conversation resumed it: same Codex thread `01a1351b-…`, both turns in the conversation, ledger `codex_app_server/gpt-6-luna` (2 reports); native copy (`deepseek-v4-flash`): 7 catalog models below its capacity refused with the capacity message, nothing recorded; the menu offers the 27 eligible replacements only |

## Additional Repository Coverage Execution

| Command | Result | Evidence |
| --- | --- | --- |
| `vitest run tests/architecture` (after the baseline fix) | 44/44 | console |
| `pnpm -C autobyteus-server-ts typecheck` | exit 0 | `server-typecheck.log` |
| `pnpm -C autobyteus-server-ts test:unit` | 686 files / 5424 tests | `server-unit.log` |
| contracts (team, collaboration) | 16/16, 27/27 | `contracts.log` |
| `pnpm -C autobyteus-web test:nuxt --run` + guards | 615 files / 4291 tests; guards 0/0/0 | `web-nuxt.log`, `web-guards.log` |
| `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` ×2 | 5/5 ×2 (~18 s) | `server-e2e/dcm-run-{1,2}.log` |
| same gate: `delegated-launch-config-defaults`, `delegated-team-lazy-member-activation`, `ad-hoc-task-delegation`, `delegated-copy-member-contact-host`, `task-existing-copy-assignment` | 3, 2+1 skip, 3, 1, 7+1 skip | `server-e2e/*.log` |
| `test:integration:prepare` + `test:integration` | 371 pass; 2 fail = TESTING.md known exception (`agent-status-websocket` content cadence) | `server-integration.log` |
| `pnpm -C autobyteus-server-ts build`; probe `--cases DCP-…` and full | 14/14 full run | `browser-probe-*/` |
| `pnpm --silent isolated-app start --build` → `iso-63395-445e`; key import into the instance DB; `iso-setup.mjs`; browser-automation attach-only; `isolated-app stop` | Pass | `isolated-instance/` |

## Validation Confidence Scorecard

| Category | Post-repository | Final | Evidence | Residual |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 80% | 96% | AC-001..AC-007, AC-009, AC-011, REQ-008, REQ-009 directly proven end to end and in the UI; real-runtime switch | AC-010 is user verification |
| Changed-boundary directness | 85% | 96% | real GraphQL/WS/MCP, task lifecycle with real processes, rendered Settings and sidebar | — |
| Integration realism / mock gap | 75% | 95% | real Codex thread resume on another model; real native capacity rule | Claude/AGY real runtimes not switched (Codex representative) |
| Environment / fixture fidelity | 90% | 95% | worktree desktop build; probe-owned stack with a backend restart | — |
| Failure, edge, lifecycle, recovery | 80% | 95% | mid-turn interrupt, nested containment, wake during edit, refusal at resume, reopen, restart | idle shutdown/wake proven through the shared restore path (reopen, restart) and the existing lazy-activation suite, not a dedicated idle case |
| User surface / browser / desktop | 70% | 95% | DCP-001..004 for all three roots; desktop journey | another client's open Settings needs a Refresh (residual by design) |
| Durable regression coverage | 85% | 96% | DCM-005..007, DCP-002..004 added | — |

- Overall post-repository confidence: 81%. Overall final confidence: 95% (simple average 95.4%).
- Every critical AC directly proven: `Yes` (AC-010 user verification by definition). No category below 90%. 95% target met.

## Broader Validation Decision And Execution

- `Required` — executed: server E2E, browser probe, isolated desktop instance with real runtimes (the user-named key file imported into the instance's own database for the native catalog; instance stopped and its data root, including the vault, removed).

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), Node v22.23.1; headless Chrome (playwright-core); packaged Electron build of this worktree; real Codex App Server, Claude Agent SDK, AutoByteus (deepseek-v4-flash).

## Lifecycle / Persisted-Data Checks

- `Directly Usable — No Migration`: choices recorded as optional fields; root reopen (DCM-003) and backend restart (DCP-004) restore them; no version branch observed.

## Durable Coverage Changed In The Codebase

| Path | Change | Purpose | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` | Updated (DCM-005..007 added; Org root support; fake Grok `cancel`; second AGY model; process liveness and conversation IDs) | AC-001..AC-007, AC-011, REQ-008, DEC-001, DEC-008 | 5/5 ×2 |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (DCP-002..004 added) | AC-001..AC-003, AC-005, AC-011, IR-002 through the UI | 14/14 full run |
| `autobyteus-web/package.json` | Updated (`test:e2e:delegated-copy-model-change` runs DCP-001..004) | — | — |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` | Updated — baseline fix, own commit `aaf6f010f1` | SR-011 guard stale since base `9777af682c` (TESTING.md Rule 9) | 44/44 |

- Added/updated paths attached for test-code review: `Yes`. Removed paths: none.

## Temporary Execution Methods / Scaffolding

| Path / Method | Why | Cleanup |
| --- | --- | --- |
| `api-e2e-evidence/isolated-instance/iso-setup.mjs`, `new-chat.js`, `stop-switch-save.js` | ISO-001 definitions and UI actions | ticket evidence only |
| Isolated instance `iso-63395-445e` + key import into its DB | ISO-001 | stopped; data root (incl. vault) removed; ports released |

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| AGY CLI | scripted `agy-failure-cli.mjs` | transport, not inference (real runtimes: ISO-001) |
| Grok Build | fake replaying `cancel.jsonl` | a turn held open until `session/cancel` |

## Result Summary

| Result | Cases | Note |
| --- | --- | --- |
| Pass | all listed | — |
| Not Tested | AC-010 | user verification |

Observations (non-blocking):

- O-1: after a `COPY_RUNNING` refusal, the now-running copy's locked row keeps showing the unsaved draft model while it runs on its started model; only the "Unsaved changes" bar tells them apart (DCP-004 screenshot).
- O-2: a stopped Codex copy messaged with "call delegate_task" answered that no delegation tool was available in that turn (observed by accident in ISO-001; outside this ticket's scope).
- O-3: the Save bar says "they apply when this run resumes" also for a copy of a running run (implementation-handoff note; DEC-010 reuse).

## Cleanup Performed

| Resource | Action | Result |
| --- | --- | --- |
| E2E data dirs, temp HOME, fake Grok dir, in-process servers | test teardown | removed, no leftover processes |
| Probe backends, Nuxt dev, Chrome, temp roots | probe teardown | receipts complete |
| Isolated instance `iso-63395-445e` | `isolated-app stop` | data root and vault removed, ports released |

## Latest Authoritative Result

- Result: `Pass`; final confidence 95%; no category below 90%; broader validation `Required` — executed.
- Critical AC lacking direct proof: none (AC-010 user verification).
- Next recipient per `get_handoff_rules`: Code Reviewer (proportional test-code review).
