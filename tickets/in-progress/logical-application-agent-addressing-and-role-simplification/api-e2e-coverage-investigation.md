# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification/design-spec.md`
- Supplemental Task Artifacts: `logical-application-agent-addressing-contract.md`, `logical-application-agent-addressing-transition-inventory.md`, `current-personal-refresh-analysis.md`, `application-worker-operation-completion-contract.md`
- Solution Revision Record: `solution-revision-record.md` (`SR-001`–`SR-003`)
- Design Review Report: `design-review-report.md` (`ARCH-REV-003` Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (`IR-001`–`IR-003`)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (`CRR-004` Pass / 97)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: to be created as `api-e2e-revision-record.md` after the first completed result
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: `/code_reviewer` handoff after `IR-003` / `CRR-004` source-review Pass resolving `CR-002` / `APIE2E-F001` in source
- Prior Investigation Reviewed: `API-REV-001` Fail / 93%; exact cold Studio, cold Brief standalone, and Socratic standalone reentry witnesses retained for first rerun
- Latest Authoritative Investigation: this document

## Current Requirement And Design Basis

### API-REV-002 correction basis

`SR-003`, `ARCH-REV-003`, `IR-003`, and `CRR-004` add one bounded completion contract for application work. Live `ApplicationEngineClient` and nested `ApplicationWorkerHostBridgeClient` requests retain exact correlation until the remote result/error, an exact write failure, or actual bridge/process close. The remaining 30-second deadline is limited to control work (`loadApplicationDefinition` and `stopApplication`) and closes/stops the worker before settling a fired timeout. No public protocol, schema, provider, persistence, retry, cancellation, idempotency, or fallback behavior changes.

The API-REV-002 execution order is therefore: (1) rerun the exact three `APIE2E-F001` live witnesses first; (2) rerun the new six-file/38-test completion-coupling selection and retained logical stream/context coverage; (3) proportionately recheck dual-host provider execution, logical root/member events, publication/named handoff, same-data recovery, package parity, and cleanup. Existing durable coverage remains `Still Valid`; no API/E2E-owned durable edit is planned.

The approved clean-cut contract replaces the public physical selector with exactly `{ bindingId, memberAddress }`, where `null` selects the bound root and a canonical rooted non-root Team path selects one configured member. Authorization is the sole logical-to-physical translator and returns one immutable descriptor. Host input consumes only the descriptor's resolved runtime IDs, scope streaming accepts only `descriptor.runtime`, and post-authorization stream-event evidence comes from the descriptor's cloned logical address. URL, READY, input and event equality use only the new root/member schema. Application-role `runtimeKind` is removed from binding members and producers while provider/launch `runtimeKind` is preserved.

Existing binding, event-journal and run-metadata JSON with redundant `runtimeKind` fields must remain directly usable through strict current-schema projection without rewrite or a compatibility branch. The SQLite schema and derived physical member role constant remain unchanged. Maintained Brief/Socratic packages, Studio/standalone execution, publication, streaming, recovery and cleanup must retain their functional outcomes.

`CRR-002` resolved the only source-review finding: stream-event evidence now clones `descriptor.address` rather than raw caller input, and durable coverage proves divergent/mutated caller input cannot replace descriptor-owned evidence.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Public root/member logical address and canonical URL | Changed | BEH-001–BEH-002, BEH-004; REQ-001–REQ-002, REQ-005; AC-001–AC-005, AC-008–AC-010 | Run contract, backend/frontend SDK and real WebSocket root/member paths; reject old/noncanonical shapes. |
| Authorization descriptor and exact runtime dispatch | Changed | BEH-003; REQ-003–REQ-004; AC-003, AC-006–AC-007; CRR-002 | Prove one binding read/translation, exact Agent/Team/member dispatch/filtering and descriptor-owned event address. |
| Role-free binding members and producers | Removed | BEH-005; REQ-006; AC-011–AC-013 | Prove exact output shapes and retired-name guards while provider runtime kinds remain. |
| Existing persisted JSON supersets | Preserved | BEH-006; REQ-007; AC-014–AC-016 | Prove direct read, dispatch/restore, no rewrite, current writes and unchanged physical constant. |
| Maintained apps, SDK copies and package behavior | Changed / Preserved | BEH-007; REQ-008; AC-017–AC-018 | Build/validate packages, byte-integrity check, and real Socratic/Brief Studio/standalone journeys. |
| Provider composition, seven-capability scope, lifecycle and task delegation | Preserved | Scope guardrail; DS-010; current-Personal intersection | Retained application/provider/nested-Team/task/restart/shutdown coverage. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | address builder, Socratic tutor selection, projectors | backend SDK and application backend unit tests | actual package worker uses logical target | live application |
| API / transport / contract | Yes | URL, READY/input/event address and role-free producer | contracts/frontend SDK, websocket integration | real browser socket/reconnect and mounted host | browser + live API |
| Frontend component / state | Indirect | frontend SDK parser/equality; no layout change | frontend SDK executable tests | iframe uses generated/vendored copy | browser |
| Browser integration / user journey | Yes | Socratic target URL/READY/event path | repository websocket integration | real Studio/standalone UI stream | browser |
| Authentication / session / permissions | Preserved | authorization lease and application binding status | authorization/session tests | real scoped provider/session boundary | live API |
| Desktop renderer / web-equivalent UI | Yes | application iframe and WebSocket behavior | no current browser result | mounted application and remount | Chrome |
| Desktop shell / Electron-specific integration | No | no preload/IPC/window/package delta | downstream delivery owns packaging | shell-only packaging not proven here | deferred |
| Process / lifecycle | Preserved but material | worker, terminal binding, restart/recovery | lifecycle/recovery tests | real active close and same-data restart | lifecycle |
| Persisted-data transition | Yes | current-schema projection of old supersets | SQLite/journal/metadata durable tests | cross-host same-data reentry | repository + lifecycle |
| Worker / distributed coordination | Yes | worker SDK protocol and stream target | application context and websocket integrations | real application worker/provider | live process |
| External integration | Yes | real Codex/AutoByteus providers unchanged but crossed | environment-gated provider tests | credentials/models/private Team | live provider |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification`
- Project stack: pnpm workspace; TypeScript/Fastify/Prisma/SQLite server; Nuxt/Vue renderer; Electron shell; SDK contracts; application devkit; Brief and Socratic packages.
- Conflicting instructions: none. Shared packages must be built before server/app selections; missing `dist` is a prerequisite state, not a product fallback.
- Required secrets available: Yes, through the user-authorized owner-private assignment file and the supported value-free `secrets:import` command. Values must never be logged.

| Instruction / Configuration | Authority / Constraint |
| --- | --- |
| `autobyteus-server-ts/AGENTS.md` | use `vitest run ... --no-watch`; single/integration selection commands |
| `autobyteus-server-ts/README.md` | build/start commands, isolated `--data-dir`, SQLite/vault ownership, supported secret importer |
| `autobyteus-application-devkit/README.md` | canonical pack/validate/dev/start paths; real standalone/Studio hosts; atomic output |
| package manifests | exact build, test, validate and dev scripts |
| implementation handoff | shared-build ordering; normal Brief package prerequisite; remove generated outputs absent at entry |

| Component | Setup / Start | Runtime / Readiness | Cleanup |
| --- | --- | --- | --- |
| shared contracts/SDK/devkit | workspace build/test scripts | command exit 0 | remove only outputs absent at entry |
| Studio server + Nuxt | built server on unique port; Nuxt dev on unique port; isolated data root | GraphQL/HTTP 200 and semantic DOM | graceful stop, ports/process scan, remove isolated root |
| maintained standalone app | devkit build then Socratic/Brief `dev` or `start` on unique port | root/iframe API and WebSocket | graceful stop and output-state restoration |
| real providers/definitions | supported secret import into isolated DB; read-only shared/private definition roots | provider readiness and actual run events | delete isolated DB/key/root only |

| Data / Fixture Need | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Brief/Socratic packages | canonical app build/validate | worktree-local output only | compare tracked hashes; remove generated output absent at entry |
| logical root/member targets | public bindings and package-owned `/tutor`; private nested Team | no direct physical-ID publication | public terminate/close |
| old JSON supersets | durable synthetic SQLite/file fixtures | never touch user DB | test temp cleanup |
| credentials | `pnpm secrets:import -- --source ... --database-url ...` | isolated DB; value-free logs | isolated DB/key removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- References: REQ-007 / AC-014–AC-016; DS-006 / DS-009; implementation-handoff persisted-data check.
- Representative existing data: old binding summary member, pending event binding/producer, and Agent run metadata execution context containing redundant `runtimeKind` extras.
- Required evidence: exact current projection, dispatch/ack or restore, byte-stable reads, current writes without role fields, physical `AGENT_TEAM_MEMBER` constant retained, and same-data restart through normal readers.
- Migration-specific checks: N/A; no migration is allowed or needed.
- Ambiguity/reroute: none.

## Existing Durable Coverage Inventory

| Coverage Family / Representative Paths | Intent | Related Criteria | Validity | Action |
| --- | --- | --- | --- | --- |
| contracts/backend/frontend SDK tests | exact root/member URL, builders, READY/event validation and old-shape rejection | AC-001–AC-005, AC-008–AC-010, AC-017 | Still Valid | run all package suites |
| `application-agent-addressing-boundaries.test.ts` | one translator, descriptor construction, retired shapes, owned projectors | AC-004, AC-006–AC-007, AC-011–AC-013, AC-017 | Still Valid | run directly and in affected matrix |
| authorization/host/team-dispatch unit tests | one binding read, exact Agent/Team/member IDs, no legacy selector | AC-003, AC-006–AC-007 | Still Valid | run affected selection |
| stream runtime/subscription/session tests | exact member filtering, descriptor-owned event address, READY/queue/failure semantics | AC-007, AC-009–AC-010; CR-001 | Still Valid | rerun IR-002 exact five-file selection first |
| binding/journal/metadata tests | direct-use old supersets, no rewrite, current writes and recovery | AC-014–AC-016 | Still Valid | run focused persistence/recovery selection |
| application websocket/context/Brief/Studio integrations | real SDK-worker/WebSocket and app-owned lifecycle behavior | AC-010, AC-018 | Still Valid | run integrations after prerequisites |
| Socratic/Brief backend tests | logical `/tutor`, publication/reconciliation and lifecycle | AC-005, AC-017–AC-018 | Still Valid | run affected selection and real apps |
| devkit/app build/validate | generated/vendored package coherence | AC-017–AC-018 | Still Valid | build/test/validate and hash |
| historical broad repository suites | unrelated global/environment-sensitive breadth | not a direct ticket criterion | Out Of Scope as sole Pass evidence | only run proportionate affected/broader integration; classify independent failures separately |

No relevant existing assertion is stale under the approved clean-cut contract. Old shapes remain only as explicit rejection or direct-use-superset fixtures, which are current behavior rather than compatibility-only runtime coverage.

## Stale Or Obsolete Coverage Decisions

None. No existing durable test will be deleted or disabled.

## Durable Coverage To Add

None planned by API/E2E. IR-001 through IR-003 already add direct architecture, descriptor-authority, persistence, and completion-coupling regressions at the stable owners. Real provider/browser orchestration is environment-specific and remains temporary executable evidence.

## Durable Coverage To Update

None planned by API/E2E. The implementation-owned test updates will be validated as current coverage.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command / Selection | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | frozen workspace install; shared prerequisite builds | reproducible executable tree | **Pass** | `evidence/api-e2e/api-rev-001-environment-build.log` |
| 2 | exact CRR-002 five-file selection | descriptor-owned address, runtime-only streaming, READY/WebSocket | **Pass — 5 files / 22 tests** | `api-rev-001-ir002-exact.log` |
| 3 | contracts/backend/frontend SDK suites | public contract, helpers, parser/equality | **Pass — 6 + 10 + 12 tests** | `api-rev-001-sdk.log` |
| 4 | changed affected server unit/architecture selection | authorization, dispatch, projection, app behavior | **Pass — 25 files / 138 tests** | `api-rev-001-affected-server.log` |
| 5 | persistence/recovery selection | direct-use/no-rewrite/journal/metadata | **Pass — 4 files / 15 tests** | `api-rev-001-persistence-recovery.log` |
| 6 | changed/broader application integrations | worker/WebSocket/Brief/Studio/standalone | **Pass — 5 files / 11 tests** | `api-rev-001-application-integration.log` |
| 7 | server build-config TypeScript and production build | production compile/bootstrap | **Pass** | `api-rev-001-server-build.log` |
| 8 | devkit plus Brief/Socratic build/validate/typecheck | maintained commands/packages | **Pass — devkit 21/21; both apps** | `api-rev-001-app-commands.log` |
| 9 | targeted package/old-symbol integrity audit | exact clean cut and tracked byte baseline | **Pass — 99 tracked files baselined** | `api-rev-001-integrity.log` |

## Post-Repository Confidence Scorecard

| Category | Score | Support | Uncertainty | Improvement |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | exact SDK, affected, integration, persistence and package mapping passed | live user journey remains | dual-host live journey |
| Changed-boundary execution directness | 98% | exact IR-002 22/22 plus authorization/stream/transport selections | mounted live event evidence remains | browser/WebSocket |
| Cross-boundary integration realism | 91% | real SQLite, worker/host, SDK/WebSocket and imported-package integrations | provider/browser still mocked or local | real provider/browser |
| Environment/configuration/identity fidelity | 90% | frozen install, canonical builds, real package assembly | isolated credentialed provider state not started | real credentials/models/definitions |
| Failure/lifecycle/recovery | 94% | malformed/old rejection, no-rewrite supersets, journal/reentry and ownership release | no live same-root restart | lifecycle run |
| Browser/desktop confidence | 88% | frontend SDK connection suite and application integrations | no current browser | installed Chrome |
| Durable regression quality | 97% | 22 + 28 SDK + 138 affected + 15 persistence + 11 integration tests | environment-specific journeys remain temporary | no durable edit needed |

- Overall post-repository confidence: **94%**.
- Calculation: rounded average.
- Every critical criterion directly proven by repository execution: No; real mounted logical `/tutor` and provider/browser/restart remain.
- Category below 90%: Yes — browser/desktop confidence at 88%.
- Default 95% target met: No.
- Material residual: the reviewed HEAD has not yet crossed a real provider, mounted browser application and same-data host restart under the new schema.

## Broader Validation Decision

- Decision: `Required`.
- Selected modes: Browser + Live API + Lifecycle + real provider process.
- Gap: real root/member wire identity, descriptor-owned event evidence in a mounted app, publication, provider/session behavior, restart/reentry and package integrity cannot be established by mocks alone.
- Expected confidence: at least 95% if repository and realistic critical scenarios pass and cleanup is complete.
- Browser rationale: Studio and standalone are web-equivalent Electron renderer surfaces and the changed URL/READY/event schema crosses the browser WebSocket client. Actual Electron shell behavior is unchanged and remains delivery-owned.

## Desktop Application Validation Decision

- Desktop shell: Electron over Nuxt/Fastify.
- Web-equivalent behavior: Studio application setup/mount, Socratic live tutor, Brief publication, WebSocket streams, remount/reentry.
- Shell-specific behavior: preload/IPC/window/packaging unchanged.
- Approach: installed Chrome against real isolated Studio/Nuxt and standalone hosts, plus process/lifecycle checks.
- Effect on running desktop application: None; unique ports and isolated data roots only.
- Unproven shell-only behavior: delivery-owned Electron gate; low ticket-local risk.

## Live Environment And Fixture Plan

- Startup: build prerequisites/packages; create isolated data roots/ports; import authorized secrets through the supported importer; start standalone and Studio/Nuxt; run public API/browser journeys; gracefully stop/restart; cleanup.
- Environment: macOS arm64, Node 22/pnpm, unique `/private/tmp` roots, installed Chrome; read-only shared/private definition roots.
- Readiness: HTTP/GraphQL 200, mounted iframe DOM, WebSocket READY/events, provider run and application notification/artifact evidence.
- Fixtures: maintained Socratic/Brief packages, package-owned `/tutor`, shared/private nested Classroom Team where compatible with application-independent coverage.
- Models: Codex `gpt-5.6-luna` and AutoByteus `deepseek-v4-flash` where supported.
- Journeys: logical `/tutor` end-to-end; Brief named handoff/publication; nested Team/member messaging/task; root/member event address equality/filtering; stop/restart/recovery/remount; route separation; package parity and cleanup.
- Evidence: sanitized JSON/logs, semantic browser assertions/screenshots, host/provider logs, pre/post tracked hashes, port/process/secret scans.
- Cleanup: only owned PIDs/ports, isolated roots, temporary scripts/screenshots and outputs absent at entry.

## Temporary Executable Validation Plan

| Scenario ID | Setup | Behavior | Why Temporary |
| --- | --- | --- | --- |
| `APIE2E-LOGICAL-ROOT-MEMBER-001` | public WebSocket/SDK against real app binding | root/member URL, READY and event logical address | credentials/process orchestration and private live state |
| `APIE2E-SOCRATIC-001` | maintained standalone + Studio Socratic browser | `/tutor` without physical target selection, live stream/publication | real provider nondeterminism |
| `APIE2E-BRIEF-001` | Studio Brief with real Agent Tools | publication/named handoff/projection | credentialed multi-run journey |
| `APIE2E-NESTED-001` | private nested Classroom Team | recursive Team/member/task and provider preservation | private package cannot become public fixture |
| `APIE2E-RECOVERY-001` | active stop and same-root restart | normal current readers, no rewrite/fallback, remount | multi-process environment-specific harness |
| `APIE2E-PARITY-001` | tracked pre/post SHA-256 | package/source integrity | execution evidence, not a product test owner |

## Not Tested / Deferred

| Boundary | Reason | Risk | Follow-up |
| --- | --- | --- | --- |
| Electron preload/IPC/window/package | no shell delta; delivery-owned | low | downstream Electron gate |
| dynamic task-agent public addressing | explicitly out of scope and not publicly reachable | none | separate requirements only |

## Ambiguities Or Reroute Triggers

None at investigation time. Any old shape accepted on the live current wire, physical ID exposed publicly, descriptor/caller mismatch, persisted-data rewrite, or current provider/application regression will be recorded and routed through `/code_reviewer`.

## API-REV-002 Investigation Decision

- Proceed to execution: Yes.
- Repository-resident durable coverage to add/update/remove by API/E2E: No planned.
- Prior unresolved failure to run first: `APIE2E-F001` through all three retained live witnesses.
- Broader validation: Required because the correction changes a cross-process completion boundary previously exposed only by real cold provider latency.
- Reroute before execution: No; IR-003 / CRR-004 supplied an approved, source-reviewed correction.

## API-REV-002 Repository And Broader Validation Results

`APIE2E-F001` was rechecked first through all three exact prior witnesses, then the retained logical-addressing, dual-host, provider, publication/handoff, recovery, package-parity and cleanup matrix was executed proportionately. Existing coverage decisions remain unchanged: all relevant durable tests are `Still Valid`, none is stale, and API/E2E added, updated, removed, or disabled no repository-resident coverage.

### Repository Evidence

| Order | Selection | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | current shared/server/devkit/frontend-SDK/app builds, both app validation/typecheck | executable current source/packages | **Pass after explicit normal frontend-SDK prerequisite** | `api-rev-002-environment-build.log`, `api-rev-002-app-build-corrected.log` |
| 2 | IR-003 completion tests plus retained logical/worker/context/Brief/standalone coverage | exact timeout ownership and application boundaries | **14 files / 67 tests Pass** | `api-rev-002-focused-retained-server.log` |
| 3 | contracts/backend/frontend SDK plus server build-config TypeScript | logical public wire and production typing | **6 + 10 + 12 tests Pass; TypeScript Pass** | `api-rev-002-sdk-typecheck.log` |
| 4 | devkit full suite, package validation/defaults, authoring diff/hash | maintained development/package behavior | **21/21 Pass; both packages valid; 99 tracked files unchanged** | `api-rev-002-package-parity.log`, `api-rev-002-current-app-hashes.txt` |

The first manual app pack attempt omitted the frontend SDK build and failed resolution. Executing the normal frontend SDK build and repeating the exact application build/validate/typecheck sequence passed. This is a transparent execution-order prerequisite miss, not a fallback or product failure.

### Exact Prior-Failure Resolution

| Scenario | Previous Result | Current Evidence | Current Result |
| --- | --- | --- | --- |
| cold Brief standalone launch | HTTP 500 at ~30 s, later artifacts | GraphQL returned **HTTP 200 after 64,394 ms**, and real researcher publication, recipient-name writer handoff, final projection, note and remount all completed | **Pass** |
| Socratic standalone same-data reentry | HTTP 500 at ~30 s, later hint | 2 messages recovered; RequestHint returned **HTTP 200 after 20,291 ms**; transcript reached 4 messages | **Pass** |
| Studio cold same-data RequestHint | HTTP 500 after 30,070 ms, later hint | same lesson recovered; RequestHint returned **HTTP 200**; transcript reached 4 messages | **Pass** |

`APIE2E-F001` is resolved. The 64,394-ms Brief response is direct real-system proof that live application work remains correlated beyond the former 30-second boundary and settles once at actual completion.

### Retained Realistic Matrix

| Scenario | Result | Direct Evidence |
| --- | --- | --- |
| logical member and root streams | **Pass** | member URL ends `/targets/member/%2Ftutor`; root URL ends `/targets/root`; root READY/EVENT carry `memberAddress:null` and observe tutor (`api-rev-002-root-member-browser.json`) |
| real Socratic in standalone and Studio | **Pass** | package-owned Codex/Luna runs, `/tutor` READY/EVENT, durable 2→4→6 message progression, restart and remount evidence |
| real Brief publication/handoff in standalone and Studio | **Pass** | real researcher and writer runs, publication, named handoff, two artifacts/final, notes and remount (`api-rev-002-brief-standalone.json`, `api-rev-002-studio-brief.json`) |
| direct-use same-data recovery | **Pass** | both hosts recovered current lesson/binding/address state through normal readers; no rewrite/migration/fallback |
| package parity | **Pass** | devkit 21/21, both packages valid, five exact `codex_app_server` / `gpt-5.6-luna` defaults, 99 tracked files unchanged |
| cleanup | **Pass** | owned ports/processes/root cleared; outputs absent at entry restored; secret-pattern scan clean |

The private Nested Classroom characterization remains outside the critical path of this addressing/timeout correction. The maintained bundled Socratic Team directly proves real root/member Team streaming, while durable nested-path coverage proves canonical nested parsing/authorization. No acceptance criterion requires a private external Team for this ticket.

## Final Confidence Scorecard

| Category | Score | Support | Residual |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 98% | exact failure resolution plus retained criteria | none material |
| Changed-boundary execution directness | 99% | real 64.394-second mutation returned 200 at completion | negligible |
| Cross-boundary integration realism | 98% | real Chrome, workers, SQLite, Codex, Agent Tools, both hosts | Electron shell downstream |
| Environment/configuration/identity fidelity | 98% | supported credential import, isolated roots, package-owned defaults | hidden setup row supplemented by exact package/provider evidence |
| Failure/lifecycle/recovery | 97% | all three witnesses, both-host restart and cleanup | provider latency remains variable |
| Browser/desktop confidence | 97% | both web-equivalent hosts, iframe/remount/WebSockets | shell packaging unchanged/downstream |
| Durable regression quality | 98% | 67 focused server, 28 SDK, 21 devkit tests | live orchestration remains temporary by design |

- Overall final confidence: **98%** (rounded simple average).
- Every critical criterion directly proven: `Yes`.
- Applicable category below 90%: `No`.
- Default 95% target met: `Yes`.

## Final Investigation Decision

- Final result: **Pass**.
- Prior `APIE2E-F001`: **Resolved** in the real affected system.
- Critical criteria lacking direct proof: none.
- Durable repository coverage changed by API/E2E: **No**.
- Broader validation: **Executed — Browser + Live API + Lifecycle + real Codex provider**.
- Residual: Electron-specific preload/IPC/window/packaging is unchanged and delivery-owned; it is not claimed by this browser/API result.
- Required next recipient: `/code_reviewer` for the separate proportional durable-test review (`Not Applicable` for API/E2E-owned test changes).
