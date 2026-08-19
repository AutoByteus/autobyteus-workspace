# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/design-spec.md`
- Supplemental Task Artifacts: `ui-ux-spec.md`, `runtime-reproduction-evidence.md`, and `design-use-case-validation.md` in the ticket directory
- Solution / Architecture / Implementation / Code Review revisions: `SR-003 / ARCH-REV-003 / IR-002 / CRR-002`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/api-e2e-revision-record.md`
- Current API/E2E Revision ID / round: `API-REV-001 / 1`
- Trigger: `CRR-002` implementation-source Pass
- Prior Round Reviewed: N/A; no prior completed API/E2E result
- Latest Authoritative Round: `API-REV-001`

## Investigation And Execution Basis

- Investigation completed before durable edits and final execution: `Yes`.
- Investigation plan followed: `Yes`, except the exposed `open_tab` surface had no device emulation and `window.resizeTo` did not change its viewport. Focused DOM tests plus the visible-by-default below-`md` source branch provide bounded responsive evidence.
- Existing-coverage decisions revised during execution: `DUR-001` was brought to current launch/root/GraphQL/socket/event/address/platform contracts and made deterministic after live execution exposed stale assumptions. `DUR-002` retained the planned current manager and canonical V1 timestamp updates.
- Reroute required: `No`.
- SR-002 evidence was not counted; only the restarted SR-003 round is authoritative.

## Compatibility / Legacy Scope Check

- Invalid compatibility scope or implementation behavior observed: `No`.
- Approved persisted-data decision: `Directly Usable — No Migration`.
- Approved transition followed without migration, dual read/write, or version fallback: `Yes`.
- Compatibility-only durable coverage retained: `No`.

## Changed Boundary And Evidence Matrix

| Scenario | Behavior / AC | Boundary and surface | Evidence | Result |
| --- | --- | --- | --- | --- |
| REP-UI-001 | strict state/actions, exact ID, cancel/failure; `AC-001`–`AC-014`, `AC-018` | Nuxt components/stores; focused and broader Vitest | `web-strict-focused.log`, `web-history-store.log` | Pass |
| REP-SRV-001 | manager ownership, catalog compensation, gate/scope/retry; `AC-006`, `AC-010`, `AC-011`, `AC-015`–`AC-019` | direct server Vitest with isolated SQLite | `server-focused.log` | Pass |
| DUR-001 | current nested mixed-runtime communication, Stop, unregister, restore; `AC-016`, `AC-019` | live-gated GraphQL/WebSocket/provider E2E | `nested-live-e2e-final-4.log` | Pass |
| DUR-002 | history/archive projection, managed-root rejection, V1 authority; `AC-003`, `AC-005`, `AC-006`, `AC-011`, `AC-018` | GraphQL/catalog E2E | `durable-e2e-final.log` | Pass |
| LIVE-001 | pending active Stop only; no modal/copy; tool absent; `AC-001`, `AC-002`, `AC-013`, `AC-015` | isolated browser/provider path | `live-browser-summary.json`, screenshot 02 | Pass |
| LIVE-002 | Stop interrupts approval and retains exact history; `AC-004`, `AC-015`, `AC-017` | browser + backend log/storage | `live-backend-focused.log`, retained lifecycle evidence | Pass |
| LIVE-003 | retained V1 continuation and second Stop; `AC-012`, `AC-018` | browser/current persisted reader | summary JSON, screenshot 04 | Pass |
| LIVE-004 | inactive Delete cancel/confirm and exact cleanup; `AC-003`, `AC-005`, `AC-007`, `AC-009`, `AC-018` | browser/GraphQL/catalog/client state | cancel/delete files, screenshots 05–06 | Pass |
| LIVE-005 | same-summary exact-root isolation; `AC-007`–`AC-009` | browser/catalog identity | `same-summary-exact-delete.txt` | Pass |

All evidence is under `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/evidence/api-e2e-sr003-round-1`.

## Repository And Broader Execution

The coverage investigation contains the full command matrix. Results:

- focused strict UI: **2 files / 63 tests passed**;
- broader UI/store: **4 files / 116 tests passed**;
- focused lifecycle/catalog server: **9 files / 61 tests passed**;
- server build: **passed**;
- archive GraphQL E2E: **2/2 passed**; optional nested live E2E collected/skipped when gates were unset;
- live-gated current nested E2E: **1/1 passed in 36.64s** across AutoByteus, nested Codex, and nested Claude;
- final `git diff --check` and precise current-contract/forbidden-flow scans: **passed**.

Final command evidence: `durable-e2e-final.log`, `nested-live-e2e-final-4.log`, `build-static.log`, and `static-final-corrected.log`.

## Validation Confidence Scorecard

| Category | Post-repository | Final | Final support / residual |
| --- | ---: | ---: | --- |
| Requirement and AC proof | 93% | 98% | all `AC-001`–`AC-019` have direct repository/live evidence; compound infrastructure corruption excluded |
| Changed-boundary directness | 94% | 98% | real Nuxt/GraphQL/WebSocket/provider/storage plus direct owners; shell unchanged |
| Cross-boundary realism | 84% | 97% | real approval interruption, restore/delete, three-runtime E2E; optional second LLM tool hop replaced by deterministic exact-ID execution |
| Environment/identity/fixture fidelity | 86% | 97% | current worktree, isolated data, exact requested package and health/log correlation; user-authorized secrets |
| Failure/lifecycle/recovery | 94% | 98% | live interrupt plus deterministic catalog/gate/scope/retry failure tests; power loss excluded |
| User/browser/desktop confidence | 78% | 96% | real semantic DOM/focus and screenshots; no live narrow emulation or affected shell |
| Durable coverage quality | 94% | 96% | current UI/store/server/archive/nested suites; proportional test review pending |

- Overall post-repository confidence: **89.0%**.
- Overall final confidence: **97.1%** (simple mean).
- Every critical AC directly proven: `Yes`.
- Final category below 90%: `No`.
- Default 95% target met: `Yes`.

## Broader Validation Decision And Execution

- Decision: `Required — completed successfully` using `open_tab`, an isolated live server/frontend, log/API/storage correlation, and the gated mixed-runtime E2E.
- Startup: current server build; API-owned backend `127.0.0.1:18080`; Nuxt `127.0.0.1:13000`; health returned exact `{"status":"ok","message":"Server is running"}`.
- Fixture: exact package `/Users/normy/autobyteus_org/autobyteus-agents`, Classroom Simulation Team, worktree-local `.autobyteus/development/server-data`, unique worktree marker, exact TeamRun IDs in `live-browser-summary.json`.
- LIVE-001: real `run_bash` approval; active row exposed focusable Stop only, no Delete/Archive/dialog/combined copy, marker absent.
- LIVE-002: Stop opened no dialog and completed without Approve/Deny; logs show approval/tool/turn interruption and stream close; exact V1 package/index remained with `terminatedAt` and only then became inactive.
- LIVE-003: normal continuation returned exact `RESTORED-SR003`, reactivated the same V1 root with Stop only, and supported a second non-destructive Stop.
- LIVE-004: inactive Delete opened exact permanent-deletion copy; Cancel preserved state; Confirm removed the exact row/package/index/context/selection without activation.
- LIVE-005: deleting one same-summary run preserved the other exact run.
- LIVE-NESTED-001: real parent-to-nested communication, exact-ID leaf execution, three runtime types, stable recursive Stop, manager removal, restore, binding retention, and final Stop passed.

## Desktop / Platform

- Browser path is authoritative for the changed web-equivalent Electron renderer behavior. No shell/preload/IPC/window/package lifecycle source changed; actual Electron execution was unnecessary.
- The user's existing Electron listener on 29695 and unrelated 3000/8000 listeners were untouched.
- Platform: macOS 26.5.2 Build 25F84; Node v22.23.1; pnpm 10.28.2; Nuxt Vitest 3.2.4; server Vitest 4.0.18.
- Browser engine version was not exposed. Live viewport was 1023x738, timezone Europe/Berlin, and semantic Stop/Delete buttons had `tabIndex=0`.

## Lifecycle / Persisted Data

- Decision: `Directly Usable — No Migration`.
- A stopped canonical V1 TeamRun was continued through the normal UI, returned `RESTORED-SR003`, reactivated the same root, stopped again, and was deleted only later through independent confirmation.
- No migration, version branch, dual read/write, or compatibility fallback was observed.
- Native provider conversation restoration remains an explicit separate exclusion.

## Durable Coverage Changes

| Path | Change | Result |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | current manager/root/projection/socket/event/address/platform contracts and deterministic exact-ID leaf execution | Pass live 1/1 |
| `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | current managed-root API and canonical V1 `createdAt` | Pass 2/2 |

- Tests removed: none.
- Production source changed by API/E2E: no.
- Final diff: 212 insertions / 229 deletions across two durable E2E files; `git diff --check` passed.
- Both updated paths must receive proportional test-code review.

## Cleanup And Safety

- All three browser-created TeamRun directories and index rows are absent; see `cleanup-runs.txt`.
- API-owned `open_tab` tab `fe5151` was closed and API-owned 13000/18080 processes stopped.
- User listeners on 3000, 8000, and Electron 29695 remained unchanged.
- Production `~/.autobyteus` profile/data were never copied, launched, or mutated.

## Residual / Not Tested

- Native conversation restoration: explicit separate defect/exclusion.
- Power loss, media corruption, compound compensation failure: bounded exclusions.
- Live narrow/touch emulation: unavailable in the exposed browser tool; focused source/DOM proof passed.
- Electron shell: no relevant source change; browser supplied the correct boundary.
- `pnpm exec prettier --check` was unavailable because Prettier is not installed in this package context. Both updated tests compiled/executed under Vitest, the server build passed, and final diff checks passed.

## Latest Authoritative Result

- Result: `Pass`.
- Final confidence: **97.1%**.
- 95% target met: `Yes`; no category below 90%.
- Critical ACs lacking direct proof: none.
- Required next recipient: `/code_reviewer` for proportional durable-test review; `CRR-002` source Pass is not reopened.
- Delivery documentation remains open for active/managed terminology, removed `TeamRunService.resolveTeamRun` references, and strict Stop-retain -> later separate Delete in `agent_team_execution.md`, `agent_streaming.md`, and `agent_websocket_streaming_protocol.md`.
