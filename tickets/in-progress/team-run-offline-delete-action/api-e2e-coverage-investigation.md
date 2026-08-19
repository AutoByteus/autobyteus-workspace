# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/design-spec.md`
- Supplemental Task Artifacts: `ticket-description.md`, `ui-ux-spec.md`, `runtime-reproduction-evidence.md`, and `design-use-case-validation.md` in the same ticket directory
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: restarted round 1 under `SR-003` / `ARCH-REV-003` / `IR-002` / `CRR-002`
- Trigger: CRR-002 implementation-source Pass at 95.2/100 for commit `dc1838e4e35c7ce31d2eb1a871cfe5b035027b83`, after the user rejected the superseded combined active-delete workflow
- Prior Investigation Reviewed: Yes. The paused pre-reset investigation and evidence were reviewed as trigger/setup context only; they are not current execution proof and no `API-REV` exists.
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The authoritative workflow is deliberately two-step. An active or Stop-pending persisted Team root exposes **Stop only**; Stop calls only exact-root termination and retains the exact history package, context, and row. Delete and Archive remain absent until descendant shutdown and the root terminal callback make the same exact root authoritatively inactive. Only an inactive `READY` row exposes Delete. That later Delete opens the inactive-only permanent-history confirmation and invokes only inactive storage deletion. No active control may open a deletion modal; no combined stop/delete copy, client sequence, or server mutation is permitted.

The preserved backend work keeps the exact root manager-owned across shutdown and retry, synchronously closes admission, drains admitted materialization, captures one recursively frozen configured/delegated/prepared/nested scope, interrupts active turns (including pending tool approval) before quiescence, and publishes inactive/unregisters only after all descendants terminate. A pending tool must not execute and must not require Approve/Deny. Restore and inactive Delete remain exact-ID serialized. Low-level delete rejects every managed root. Candidate-index/package-removal failures preserve or compensate a valid retryable row/package. Current V1 retained history is directly usable without migration or a compatibility accessor. Native-conversation restoration and compound storage recovery remain excluded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| REQ-001..003; AC-001..004 | Changed | SR-003 requirements/UI spec, IR-002, CRR-002 | Prove active/offline and active/running rows expose Stop only; Stop opens no modal, invokes no Delete, and retains the exact row. |
| REQ-004..010; AC-003/005..012/018 | Preserved/Changed | design spec and IR-002 | Prove Delete appears only after terminal inactive `READY`, uses the inactive-only confirmation, supports cancel, and deletes exact ID without activation. |
| REQ-013..016; AC-015..019 | Preserved | IR-001 backend trace retained by IR-002/CRR-002 | Prove approval interruption, terminal-only inactive publication, recursive scope, retry, and retained history. |
| Superseded active Delete | Removed | user-approved SR-003 reset and CRR-002 forbidden-state scan | Scan and browser-check that active Delete, combined copy, and Stop-inside-Delete are unreachable. Do not retain tests for the rejected behavior. |
| Exact manager API and V1 authority | Preserved current-only contract | design spec, CRR-002 residual coverage note | Update two stale E2Es to explicit managed/active APIs and canonical tree `createdAt`; never restore compatibility names. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | exact manager ownership, termination scope/gate, retry, catalog compensation | focused unit/integration tests | real pending approval and provider timing | live browser/API runtime |
| API / transport / contract | Yes | separate terminate and inactive delete GraphQL paths; current manager API | resolver/store/E2E coverage | real WebSocket disconnect and history refresh | browser plus log/API correlation |
| Frontend component / state | Yes | mutually exclusive active Stop vs inactive Archive/Delete | 2 focused Nuxt files / 63 tests and broader stores | real transport/DOM transition | browser |
| Browser integration / user journey | Yes | strict two-decision flow, modal reachability, responsive actions | mocked component tests | live DOM, focus, narrow/touch, stream cleanup | `open_tab` |
| Authentication / session / permissions | No | no change | N/A | none | none |
| Desktop renderer / web-equivalent UI | Yes | shared Nuxt renderer | browser-equivalent source | no shell-specific boundary changed | browser, not Electron |
| Desktop shell / Electron-specific integration | No | no preload/IPC/window/lifecycle change | N/A | none material | none |
| Process / lifecycle | Yes | interruption, descendant shutdown, exact terminal publication | direct lifecycle tests | live provider approval state | live runtime |
| Persisted-data transition | Yes, no migration | stopped V1 package remains directly usable; inactive Delete removes exact package | V1/catalog/restore tests | real retained history selection/restore | browser/API |
| Worker / queue / distributed coordination | Yes, local async | admitted materialization drain and stable recursive scope | deterministic concurrency tests | scheduler/provider timing | live runtime plus repo evidence |
| External integration | Yes for realistic proof | requested Classroom Simulation Team and provider tool approval | live-gated provider E2Es | credential/runtime availability | isolated requested team in browser |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action`
- Project: pnpm TypeScript monorepo; Node/Fastify/GraphQL/WebSocket backend, Nuxt/Vue frontend, optional Electron wrapper.
- Instruction conflict: the user's phrase `pnpm import` corresponds to the documented root command `pnpm secrets:import`. The importer requires an explicit target database URL.
- Required secrets available: Yes. `/Users/normy/.autobyteus/server-data/.env` is used only as the assignment source; values are not logged. The target is the worktree-local development database, never production.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| root/component `AGENTS.md` | repository rules | one-shot tests only; web uses `pnpm test:nuxt ... --run`; no watch mode |
| root `README.md` and `package.json` | development runtime | `pnpm dev`; normal ports 3000/8000; state under `.autobyteus/development/server-data` |
| `autobyteus-server-ts/README.md` | server/tests/secrets | dry-run import first, explicit SQLite URL, then confirmed import; live E2E scripts |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | agent package setup | import/reload through the product catalog; local source is read-only |
| `/Users/normy/autobyteus_org/autobyteus-agents/README.md` | requested fixture | contains Classroom Simulation Team; do not modify package source |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| isolated secrets | worktree root | documented `pnpm secrets:import` with explicit worktree SQLite URL | previous safe import may be reused; no values emitted | vault/config catalog available | retain only worktree state |
| server | worktree root/server | build current source, then run built server on owned `127.0.0.1:18080` with explicit worktree data paths | normal 8000 is unrelated/occupied | `/rest/health` = `status: ok` | Ctrl-C only owned session |
| Nuxt | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port 13000` with backend env set to 18080 | normal 3000 is unrelated/occupied | HTTP 200 and rendered DOM | Ctrl-C only owned session |
| browser | AutoByteus browser tools | `open_tab(http://127.0.0.1:13000)` | API-owned tab only; do not control Electron | semantic DOM/state | close API-owned tab |
| agent package | product Settings/API | reload `/Users/normy/autobyteus_org/autobyteus-agents` | exact user-requested package; source read-only | Classroom Simulation Team present | isolated catalog state only |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| provider assignments | secrets importer into explicit worktree DB | never read/write `~/.autobyteus` runtime state except the user-authorized source file read | keep values only in isolated vault |
| team definition | normal Agent Packages reload | exact local package requested by user | no package-source mutation |
| team runs | normal browser Team launch with unique marker paths/prompts | worktree temp workspaces and memory only | stop/delete exact fixtures; prove marker absence |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- References: design spec Persisted Data decision; implementation handoff Persisted Data Transition Check.
- Representative setup: a current V1 Classroom Simulation Team run stopped from a real pending-approval state.
- Required behavior: Stop leaves the exact row/package selectable; restoring/continuing it uses the current reader; only a later separately confirmed inactive Delete removes it.
- Migration scenarios: N/A. No legacy accessor, dual read, or runtime migration is allowed.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirements / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-team-execution/root-team-run-termination.test.ts` | gate/drain/frozen scope/retry/terminal ordering | REQ-014..016; AC-016/019 | Still Valid | direct lifecycle objects | execute |
| `mixed-team-manager.test.ts`, `mixed-agent-member-handle-termination.test.ts`, `agent-run.test.ts` | recursive configured/delegated/prepared/nested interruption and same-object retry | REQ-013..016 | Still Valid | direct failure injection and object identity | execute |
| manager/service integration/lifecycle tests | exact managed root and transition lane | REQ-005/014; AC-006/010/016 | Still Valid | current explicit APIs | execute |
| `team-run-history-catalog-service.test.ts` | active/managed rejection and inactive compensation | REQ-004..010 | Still Valid | filesystem/catalog failure positions | execute |
| focused Workspace history component tests | active Stop-only, stop pending, inactive Delete/cancel/failure, exact IDs | AC-001..014/018 | Still Valid | SR-003 assertions committed in IR-002 | execute |
| Team/run-history store tests | Stop disconnect/retain, inactive cleanup/selection, restore | AC-004/009/012/017/018 | Still Valid | client state owners | execute |
| `agent-runtime-graphql.e2e.test.ts` pending approval | real provider interruption/termination/restore | AC-015/017 | Still Valid | live gated; browser requested team will provide equivalent user-surface proof | execute only if it adds material provider evidence beyond browser |
| `nested-mixed-team-runtime-graphql.e2e.test.ts` | real nested mixed-runtime lifecycle/restore | AC-019 | Needs Update | committed baseline calls removed broad manager accessors; live attempts then exposed removed launch/root/projection contracts, split text deltas, a nondeterministic optional second Codex tool hop, and finally the old expectation that local AutoByteus has an external platform ID. The exact-ID Claude variant reached all three configured runtimes in 40 seconds; the current backend intentionally stores `null` for AutoByteus and platform IDs only for external Codex/Claude runtimes | retain one real AutoByteus-to-nested-Codex communication hop, exact-ID nested Claude execution, external-only platform binding assertions, and recursive stop/restore proof; do not weaken lifecycle assertions or restore compatibility APIs |
| `archive-run-history-graphql.e2e.test.ts` | GraphQL history/archive projection and managed-root rejection | AC-003/005/006/011/018 | Needs Update | hoisted manager double exposes removed accessors; divergent index timestamp contradicts canonical V1 tree authority | retain paused fixture-only update and rerun |
| native conversation restoration | provider-native restoration defect | explicit exclusion | Out Of Scope | SR-003 and CRR-002 | do not claim or expand |

## Stale Or Obsolete Coverage Decisions

No durable scenario is removed. Superseded active-delete assertions were already removed in IR-002 production-focused tests and are not reintroduced.

## Durable Coverage To Add

None planned. Current durable tests cover the deterministic boundaries; requested browser execution is appropriate for the live cross-boundary workflow.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| DUR-001 | `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | current manager APIs, canonical launch/collaboration identities, current root/GraphQL/socket/event DTOs, ordered text-delta aggregation, one real parent-to-nested communication, direct exact-ID execution of all three configured runtimes, recursive metadata, stop, and restore | current-only manager/address/root/stream design; AC-016/019 | current DTO fixes are retained; replace only the redundant second LLM-obedience-dependent tool hop with exact-ID Claude execution because two clean runs showed provider text responses rather than a tool call, while the first inter-agent hop already proves communication routing |
| DUR-002 | `autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` | managed-root test double and canonical V1 tree `createdAt` | REQ-005/009; AC-006/011/018 | fixture-only; backend unchanged by IR-002 |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | focused 2-file Nuxt run | `autobyteus-web`, one-shot | SR-003 strict state/action/mutation contract | Pass — 2 files / 63 tests | `evidence/api-e2e-sr003-round-1/web-strict-focused.log` |
| 2 | broader 4-file Nuxt history/store run | `autobyteus-web`, one-shot | client retention/cleanup/selection regressions | Pass — 4 files / 116 tests | `evidence/api-e2e-sr003-round-1/web-history-store.log` |
| 3 | 9 focused server lifecycle/catalog files | `autobyteus-server-ts`, one-shot | manager/gate/scope/retry/catalog | Pass — 9 files / 61 tests | `evidence/api-e2e-sr003-round-1/server-focused.log` |
| 4 | updated archive + nested E2Es | `autobyteus-server-ts`; provider gates initially unset | current fixture APIs, V1 authority, E2E collection | Pass — archive 2 tests; nested collected and 1 live-gated test skipped | `evidence/api-e2e-sr003-round-1/durable-e2e.log` |
| 5 | `pnpm --filter autobyteus-server-ts build` | worktree | current server production build and bootstrap | Pass | `evidence/api-e2e-sr003-round-1/build-static.log` |
| 6 | `git diff --check` plus precise forbidden-flow/current-manager scan | worktree | no combined active-delete residue and no obsolete Team manager accessors in updated E2Es | Pass after correcting an API/E2E scan that initially overmatched the valid AgentRun `listActiveRuns` API | `evidence/api-e2e-sr003-round-1/static-corrected.log` |
| 7 | live-gated current nested mixed-runtime GraphQL E2E | `autobyteus-server-ts`; LM Studio + Codex + Claude gates enabled | current exact-ID stream, real parent-to-nested communication, all three configured runtimes, recursive metadata, Stop, restore, platform-binding retention | Pass — 1/1 in 36.64 seconds after the investigation-driven current-contract fixture update | `evidence/api-e2e-sr003-round-1/nested-live-e2e-final-4.log` |
| 8 | final updated durable E2E regression run | `autobyteus-server-ts`; provider gates unset | archive GraphQL and collection of optional live scenario | Pass — archive 2/2; nested 1 collected/skipped by gate | `evidence/api-e2e-sr003-round-1/durable-e2e-final.log` |
| 9 | final diff/current-contract scan | worktree | clean diff, no combined active-delete residue, no obsolete Team manager/socket/tool selectors | Pass after narrowing one API/E2E-authored scan that again overmatched valid `AgentRunManager.listActiveRuns` | `evidence/api-e2e-sr003-round-1/static-final-corrected.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | strict UI 63/63; broader UI/store 116/116; lifecycle/catalog 61/61; archive E2E 2/2 | live pending-approval Stop and retained-row transition remain indirect | requested-team browser journey |
| Changed-boundary execution directness | 94% | component/composable/store and backend lifecycle owners run directly | real client/server/provider path not yet exercised under SR-003 | browser plus log correlation |
| Cross-boundary integration realism and mock gap | 84% | archive GraphQL E2E crosses schema/catalog; current browser setup known | history UI tests mock transport and nested provider E2E remains gated | live browser/runtime |
| Environment, configuration, identity, and fixture fidelity | 86% | documented isolated DB/package/secrets approach and prior safe setup are known | current-source services/package not restarted yet | restart, health, exact package evidence |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | direct stop failure, delete failure, catalog compensation, gate/drain/retry/object identity tests pass | real approval interruption timing not yet rerun | live approval marker journey |
| User-surface, browser, and desktop-shell confidence | 78% | component DOM contract passes; desktop shell is inapplicable to changed code | strict live DOM, keyboard, narrow/touch and actual transition not yet observed | `open_tab` with responsive/focus probes |
| Durable regression coverage quality and relevance | 94% | current strict tests plus two focused E2E updates compile/pass/collect cleanly | updated durable code still needs proportional review; nested live branch gated | final code-review gate |

- Overall post-repository confidence: **89.0%** (simple average of seven applicable categories)
- Every critical acceptance criterion directly proven: `No` — AC-015/017/018 and browser portions of AC-001..004/013 remain to execute
- Any applicable category below 90%: `Yes` — cross-boundary realism, environment/fixture fidelity, and user-surface/browser confidence
- Default clean-confidence target met: `No`
- Material residual risks: real pending approval could still block Stop; UI might expose Delete/modal during active or pending transition; retained V1 row and later inactive Delete have not yet crossed the real browser/GraphQL/WebSocket/storage boundary.

## Broader Validation Decision

- Decision: `Required`
- Selected mode: `Browser` plus live server/log/API correlation.
- Gap: repository UI tests mock transport; the material defect involves real WebSocket/provider approval, Stop completion, retained current V1 history, and a later separately confirmed Delete.
- Browser rationale: the changed Electron renderer behavior is web-equivalent; `open_tab` exercises the real Nuxt/backend boundary without controlling the user's Electron process.
- Expected confidence after selected validation: at least 95% overall with no category below 90%, assuming all critical journeys pass.

## Desktop Application Validation Decision

- Desktop framework: Electron wrapping the same Nuxt UI.
- Web-equivalent behavior: history-row actions, confirmation, WebSocket lifecycle, responsive/keyboard behavior.
- Shell-specific behavior: none changed.
- Approach: isolated browser dev path; actual Electron is unnecessary and unsafe while the user's process/profile may be active.
- Effect on already-running desktop application: None. Ports 29695/3000/8000 and `~/.autobyteus` runtime data are not controlled or mutated.

## Live Environment And Fixture Plan

- Stop old API-owned 13000/18080 sessions, rebuild current server, restart both against the explicit worktree DB/data root.
- Confirm backend health `status: ok`, frontend HTTP 200, and reload the exact `/Users/normy/autobyteus_org/autobyteus-agents` package.
- Use `open_tab` and the Classroom Simulation Team requested by the user.
- Journey LIVE-001: create active run; prove Stop exists and Delete/Archive do not. Cause a real `run_bash` approval request with a unique worktree marker; prove marker absent. Activate Stop and prove no modal/combined copy and no Delete while pending.
- Journey LIVE-002: prove Stop completes without Approve/Deny, marker remains absent, same exact history remains, and only then Archive/Delete appear. Correlate `terminatedAt`, stream cleanup, row/package existence, and server interruption logs.
- Journey LIVE-003: select/restore the retained V1 run through normal UI, prove it becomes usable/active, then Stop it again and retain it.
- Journey LIVE-004: from inactive state activate Delete, verify exact inactive-only copy, cancel with no mutation, reopen and confirm; prove exact row/package/context/selection removal and no reactivation.
- Journey LIVE-005: at narrow/touch dimensions and keyboard focus, prove active Stop/inactive Delete are reachable and mutually exclusive. Use same-summary isolated rows if practical; otherwise rely on direct exact-ID durable coverage and state the bounded residual.
- Evidence: DOM snapshots/JSON, screenshots, marker checks, health, backend logs, exact package/catalog checks, and cleanup inventory.
- Cleanup: delete/stop only created Team fixtures, close only API-owned tab, stop only API-owned 13000/18080 sessions; confirm unrelated 29695/3000/8000 listeners remain untouched.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Runtime Setup | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| LIVE-001..005 | requested Classroom team in isolated live browser/runtime | real approval interruption and strict Stop-retain -> separate Delete journey | credential/provider/UI timing dependent; deterministic owners already have durable tests |
| LIVE-API-001 | exact catalog/package/log queries around the browser journey | cross-boundary retention/deletion and marker safety | run-specific IDs/paths |

## Broader Validation Execution Results

- Environment: built current server on owned `127.0.0.1:18080`, Nuxt on owned `127.0.0.1:13000`, and opened only AutoByteus browser tab `fe5151`. Health returned exact `status: ok`; the requested `/Users/normy/autobyteus_org/autobyteus-agents` package reloaded normally and exposed Classroom Simulation Team.
- LIVE-001 / AC-001/002/013/015: exact run `classroom_simulation_team_e6a6a2652a124749a95fd21ef2664c8b` reached a real pending `run_bash` approval. Active row exposed Stop only (`tabIndex=0`), no Delete/Archive/modal/combined copy. The unique marker stayed absent.
- LIVE-002 / AC-004/015/017: keyboard-focused Stop opened no modal and completed without Approve/Deny. Logs recorded approval request, interruption, interrupted tool/turn, and stream close. The same row became inactive only after completion, with `terminatedAt=2026-08-19T08:05:40.673Z`, Archive/Delete visible, exact V1 package/catalog retained, and marker still absent.
- LIVE-003 / AC-012/018: normal retained-history continuation returned exact `RESTORED-SR003`, reactivated the same V1 root, restored Stop-only presentation, and supported a second non-destructive Stop.
- LIVE-004 / AC-003/005/007/009/018: inactive Delete was keyboard focusable and opened exact copy `Delete this Team history permanently? This cannot be undone.` Cancel preserved row/package/index; later confirm removed only the exact row/package/index/context/selection without reactivation.
- LIVE-005 / AC-007/008: two independent Classroom runs received the same canonical summary. Stopping/deleting the target left the survivor row/package/index intact; the survivor was then cleaned separately.
- LIVE-NESTED-001 / AC-016/019: isolated live-gated GraphQL/WebSocket execution passed across AutoByteus, nested Codex, and nested Claude, including one real parent-to-nested communication, exact-ID leaf execution, current execution-tree/platform bindings, terminal manager removal, restore, and final Stop.
- Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/evidence/api-e2e-sr003-round-1`.
- Cleanup: all three browser-created Team directories/index rows are absent; the API-owned tab and 13000/18080 processes are closed. Unrelated user listeners on 3000, 8000, and Electron 29695 remain unchanged. Production profile/data were not copied, launched, or mutated.

## Final Confidence Scorecard

| Confidence Category | Score | Final Evidence | Bounded Residual |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 98% | direct repository owners plus LIVE-001..005 and LIVE-NESTED-001 cover AC-001..019 | compound infrastructure corruption remains explicitly excluded |
| Changed-boundary execution directness | 98% | real Nuxt/GraphQL/WebSocket/provider/storage path plus direct lifecycle/catalog tests | no Electron-shell code changed or executed |
| Cross-boundary integration realism and mock gap | 97% | real browser pending approval, stream interruption, retention/restore/delete and real three-runtime nested GraphQL E2E | second optional Codex-to-Claude LLM tool-adherence hop was replaced with exact-ID Claude execution; one real inter-agent hop remains |
| Environment, configuration, identity, and fixture fidelity | 97% | current worktree build, isolated worktree DB/data, exact requested package, provider runtimes, health/log/storage correlation | provider assignments came from the user-authorized isolated secret import rather than a disposable test account |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | live approval interruption plus deterministic stop/delete/catalog/gate/scope/retry/failure suites | power loss/media corruption remain out of scope |
| User-surface, browser, and desktop-shell confidence | 96% | real semantic DOM/focus flow and screenshots; renderer is web-equivalent | current `open_tab` tool exposed no narrow-device emulation; below-`md` visibility is proven by source and focused DOM tests, not a second live viewport |
| Durable regression coverage quality and relevance | 96% | 63 strict UI, 116 client/store, 61 server, archive GraphQL and updated current-contract nested E2E | two durable E2E edits await mandatory proportional code review |

- Overall final confidence: **97.1%** (simple average of seven applicable categories).
- Every critical acceptance criterion directly proven: `Yes`, using real browser/provider execution where the mock gap was material and deterministic lifecycle/failure tests for controlled concurrency/fault positions.
- Any applicable category below 90%: `No`.
- Default clean-confidence target met: `Yes`.
- Broader-validation decision: `Required — completed successfully`.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| native conversation restoration | explicit exclusion and separate defect | retained run may fail for a provider-native reason unrelated to current V1 storage | report separately, never misclassify Stop/Delete |
| power loss/media corruption/compound compensation failure | explicit bounded exclusion | low residual infrastructure risk | separate recovery design if requested |
| live narrow/touch viewport emulation | the currently exposed `open_tab` tool set had no device-emulation operation and `window.resizeTo` did not change the owned viewport | low: action buttons are visible by default below `md`; focused DOM tests and semantic focus proof pass | rerun on a browser tool exposing device emulation if live visual proof becomes mandatory |
| Electron shell | no shell code changed; user's live app must not be controlled | negligible for web-equivalent behavior | browser is authoritative for this scope |

## Ambiguities Or Reroute Triggers

None currently. Any observed active Delete/combined modal, Stop-caused history loss, pending tool execution, or nonterminal Delete exposure is a critical failure requiring code-review failure-origin routing.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — retain/update DUR-001 and DUR-002 only
- Final validation result: `Pass`
- Final confidence: `97.1%`
- Broader validation decision: `Required — completed successfully`
- Reroute Required Before Validation Execution: No
- Notes: This SR-003 restart supersedes the paused investigation basis. Earlier behavioral evidence was not counted; only safe environment discovery/import setup was reused. Both durable changes must now receive proportional test-code review before delivery.
