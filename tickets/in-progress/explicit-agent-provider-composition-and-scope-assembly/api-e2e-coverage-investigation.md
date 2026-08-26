# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/tickets/in-progress/explicit-agent-provider-composition-and-scope-assembly/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/tickets/in-progress/explicit-agent-provider-composition-and-scope-assembly/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/tickets/in-progress/explicit-agent-provider-composition-and-scope-assembly/design-spec.md`
- Supplemental Task Artifacts: `provider-composition-and-agent-tools-authority-contract.md`, `provider-composition-transition-inventory.md`, `latest-personal-run-configuration-integration-analysis.md`, `latest-base-integration-conflict-report.md`, and DR-001 evidence
- Solution Revision Record: `solution-revision-record.md` (`SR-001`–`SR-008`)
- Design Review Report: `design-review-report.md` (`ARCH-REV-008` Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (`IR-004` current)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (`CRR-006` Pass / 94.3)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: `delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001`
- API/E2E Revision Record: `api-e2e-revision-record.md` (`API-REV-002` Pass / 96% pre-merge baseline)
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: 3
- Trigger: `/code_reviewer` handoff after latest-Personal semantic integration source review (`IR-004`, `CRR-006` Pass)
- Prior Investigation Reviewed: yes — `API-REV-001` Fail / 63% and `API-REV-002` Pass / 96%; API-REV-002 is retained pre-merge characterization only and does not certify IR-004
- Latest Authoritative Investigation: this document


## API-REV-003 Reinvestigation Delta

- Current reviewed HEAD: `2625f2b7d053e1b8e8009d21f5583b32fc55ba34` (`IR-004`, `CRR-006` Pass / 94.3).
- Integration basis: latest-Personal semantic merge `f6d3e52d0330732cd7d1783b84a7253952210842`, governed by `SR-007`–`SR-008` and `ARCH-REV-007`–`ARCH-REV-008` after delivery `DR-001`.
- New material boundary: stopped general Agent/Team model-config reads and Save mutations, Save-versus-restore serialization, exact host-selected validation, application-owned live/unreadable fail-closed zero-write behavior, terminal ownership release, and current existing-run editor reconciliation.
- Preserved material boundary: exact provider/Agent Tools construction, distinct general/application execution families, seven-capability application scope, private recursive Team/task execution, context-file ownership, publication/handoff, restart/reentry, watcher/remount, shutdown, routes and package bytes.
- Prior API-REV-002 evidence is **Still Valid only as pre-merge characterization**. Every current critical repository and realistic-system scenario must execute again on IR-004.
- Existing IR-004 durable server coverage (21 reviewed files / 163 tests), current web coverage (11 reviewed files / 124 tests), the durable stopped-run GraphQL E2E, application-owned integration, terminal-transition unit coverage, and the browser existing-run probe are classified **Still Valid / Run Current**.
- No API/E2E-owned durable edit is planned before execution. A failing assertion will be validated against SR-008 before any test edit/removal.
- Broader validation is **Required**: direct current UI Save/reload and restore ordering, application ownership guard through public APIs, and credentialed dual-host/private-Team/provider/recovery behavior cannot be certified from API-REV-002 or source review.

### API-REV-003 Coverage Decisions Before Execution

| Scenario / Coverage | Current Decision | Required Evidence |
| --- | --- | --- |
| exact CRR-006 server 21-file and web 11-file selections | Still Valid | rerun first on HEAD; retain exact counts/logs |
| `stopped-run-model-config-graphql.e2e.test.ts` | Still Valid, high-priority durable E2E | active rejection, stopped Save, canonical reread, restart and restore ordering for Agent/Team |
| application-owned Studio config integration | Still Valid, high-priority integration | live/unreadable ownership reasons, zero general-owner writes, terminal release ordering |
| current existing-run browser probe | Still Valid | saved Agent/Team, nested fields, validation/warning, narrow layout, active lock/reconciliation |
| API-REV-002 live dual-host/provider/private-Team/context/publication matrix | Replace with current-head execution evidence | rerun proportionately; do not reuse prior Pass |
| broad unisolated repository characterization | Unclear / separate debt | do not rerun unless current affected evidence establishes a connection; prior 70-file failure characterization is neither Pass nor IR-004 attribution |

## API-REV-002 Reinvestigation Delta

- Current reviewed HEAD: `8704f2653b664c6ae7b5ecb24f2dd3885a79aad9`.
- Prior critical failure: `APIE2E-F001`, eight governed direct fixtures failing through incomplete/ambient execution-family construction.
- Upstream resolution: `SR-006`, `ARCH-REV-006`, `IR-003`, and `CRR-004` replace the ambient paths with exact root-owned task identities, provider-input normalization, context-path authorities, and required seven-field Agent manager construction. Source review independently passed the exact eight files (`64 Pass / 8 environment-gated Skip`) and structural selection (`121 Pass`).
- Current validity decision: the eight scenarios are **Still Valid after IR-003 update** and are the mandatory first API/E2E gate. API/E2E will not initialize unrelated global managers to make them pass.
- Durable-coverage decision before execution: no API/E2E-owned edit is planned. IR-003 updated the governed tests under implementation ownership; current execution will determine whether any additional durable change is needed.
- Broader validation remains **Required** because credentialed providers, distinct dual-host families, private recursive Team/task execution, real publication/named handoff, context-file behavior, restart/reentry, active shutdown, browser surfaces, and package parity are critical `AC-012` evidence not supplied by source review.

## Current Requirement And Design Basis

The change must be behavior-neutral while replacing provider and Agent Tools construction with one process-owned `AgentToolsMcpHost`, distinct general/application scoped authorities, one shared immutable `AgentProviderFactoryBuilder`, and fresh execution-local provider factories/sessions per root. Codex and Claude may receive only the narrow issuer and reviewed provider inputs. Post-issuance create/restore failure must revoke the exact claimed session before claim cleanup, aggregate cleanup failures, and quarantine uncertain candidates. The private K0–K8 application kernel transaction must produce one complete immutable execution family or unwind every acquired owner in reverse order. IR-002 additionally requires `MixedTeamRunBackendFactory` to receive the exact scoped releaser and typed Team-manager construction capability so configured Agent, task Agent, configured child Team, and task Team recursion remain in the root's exact general or application family without process fallback.

Critical executable obligations are `AC-001`–`AC-012`: one shared route host with distinct scoped families; isolation and close behavior; fresh exact provider construction; architecture exclusions; Codex/Claude issuance and cleanup semantics; kernel cut-point unwind; quiesce/Team-before-Agent/session cleanup; and realistic Studio/standalone provider, Team/task, streaming, publication, recovery, reentry, and shutdown behavior. Persisted data is explicitly `Not Affected`; no migration, dual path, compatibility branch, wire/schema, package, or multiplicity change is permitted.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001`, `AC-001`–`AC-003` process Host and scoped Authorities | Changed structurally; behavior preserved | requirements, authority contract, `CRR-002` | Directly run Host/Authority/session tests, authenticated internal MCP routes, dual-host lifecycle, and old-session revocation after close/restart |
| `BEH-002`, `REQ-003`–`REQ-004`, `AC-004` shared provider builder and fresh roots | Changed | design spec and transition inventory | Run exact construction tests plus real provider execution in general, Studio application, and standalone application families |
| `BEH-003`–`BEH-004`, `REQ-005`–`REQ-006`, `AC-006`–`AC-009` provider issuance/failure cleanup | Changed | provider contract and IR-001/IR-002 handoff | Run Codex/Claude durable lifecycle/failure suites and real Codex descriptors/tools; treat credential-gated Claude live execution proportionately |
| `BEH-005`, `REQ-007`, `AC-010`–`AC-011` private K0–K8 kernel and ordered unwind | Changed | design spec, kernel contract, source review | Run construction cut-point, runtime isolation, lifecycle, active shutdown/restart, and leak checks |
| `SR-005`, `CR-001`, `AR-004` complete Mixed Team family | Changed by IR-002 | handoff and `CRR-002` | Run exact 15-file reviewer selection, recursive factory/manager coverage, and real private Nested Classroom Team including nested member/task execution |
| Public APIs, package bytes, routes, persisted bindings/history/projection | Preserved | `BEH-006`, `REQ-008`, handoff checks | Real Brief/Socratic dual-host journeys, publication/named handoff, same-data restart/reentry, watcher/remount, and byte parity |
| Logical application Agent addressing/schema simplification | Intentionally deferred | requirements non-goals | Do not expand coverage or defects into this separate scope |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | provider factory construction, candidate/session cleanup, Team recursion | focused unit/integration and architecture tests | real provider process and recursive live Team | Live API/provider |
| API / transport / contract | Preserved but material | existing Agent Tools routes dispatch through new Host/Authority ownership | MCP route and standalone integrations | authenticated real descriptors, publish/handoff | Live API/browser |
| Frontend component / state | Yes | current existing-run Agent/Team editor, draft reconciliation, active lock and warning states | focused web tests and committed browser probe | actual stopped-run Save/reload against current server | Browser + live GraphQL |
| Browser integration / user journey | Yes for confidence | Studio/standalone application journeys cross changed runtime | no single durable browser suite covers the whole composition | real provider stream, remount and restart | Browser |
| Authentication / session / permissions | Yes | scoped MCP issue/revoke ownership | authority/session/route tests | live descriptor authentication and invalidation | Live API |
| Desktop renderer / web-equivalent UI | Yes for confidence | unchanged web surface uses changed backend composition | browser path available | real Electron shell | Browser; shell deferred |
| Desktop shell / Electron-specific integration | No | no preload/IPC/window/package change | delivery-owned Electron gate | shell packaging only | Deferred to delivery |
| Process / lifecycle | Yes | Host/Authority/general/application construction and close order | kernel/supervisor/lifecycle tests | active provider/team runs across process restart | Lifecycle |
| Persisted-data transition | No schema transformation; current-value mutation/preservation required | stopped-run `llmConfig` narrow writes plus ownership metadata/readers | stopped-run GraphQL E2E and recovery/history tests | real Save/reload/restore and application zero-write guard | Lifecycle/API/browser |
| Worker / queue / distributed coordination | Yes | application worker publication/relay and Team task recursion use exact family | integration/E2E suites | real worker + provider publication and nested task | Worker/process |
| External integration | Yes | Codex/Claude/AutoByteus backend construction | durable mocked and environment-gated tests | real credentials/provider availability | Provider-backed live run |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly`
- Project type and runtime stack: pnpm workspace; Node 22; TypeScript/Vitest; Fastify/GraphQL/WebSocket/SQLite; Nuxt/Vue; application devkit; Playwright Core with installed Chrome; Codex/Claude/AutoByteus provider backends.
- Conflicting, missing, or unclear project instructions: none. Server `AGENTS.md` requires `vitest run --no-watch`; the devkit README defines `dev` as standalone and `dev:studio` as the Studio import/reload path. Actual Electron packaging is downstream delivery-owned.
- Required environment variables or secrets available: `Yes`, through the user-authorized owner-private local environment source; values will not be logged or retained.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | server tests | use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` |
| root `package.json`, root/server READMEs | builds and deterministic/live E2E | frozen install; `pnpm test:e2e`; isolated live-provider harness and server builds |
| `autobyteus-application-devkit/README.md` and app manifests | maintained app commands | build devkit prerequisite; `pnpm dev` is standalone; `dev:studio` uses public Studio import/reload; `start` runs an existing package |
| implementation handoff and transition inventory | governed affected matrix | run exact provider/Host/Authority/kernel/Mixed Team tests; no ambient fallback or generated output retention |
| preceding scope-boundary API/E2E artifacts | safe current-base harness precedent only | unique ports/isolated roots, supported secret importer, installed Chrome, public APIs, private package read-only, package hashes, owned cleanup |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| repository suites | workspace/server | frozen install, prerequisite builds, `vitest run --no-watch` | test-owned SQLite/runtime | Vitest summary | automatic plus exact generated-output cleanup |
| Studio backend | server/root | built server with explicit isolated data root and unique port | never uses shared user DB | `/graphql` and logs | SIGINT; verify listener/process; remove owned root |
| Nuxt frontend | `autobyteus-web` | development host pointing to isolated backend | installed Chrome, web-equivalent Electron renderer | applications page and iframe readiness | SIGINT and browser close |
| maintained Studio packages | application directories | `pnpm dev:studio` with explicit Studio URL | real public import/reload, no auto-open | devkit ready/reload + Studio catalog | SIGINT; exact app dev scratch cleanup |
| maintained standalone package | application directory | `pnpm start`/`pnpm dev` with isolated root/port | selected package only | HTTP/UI and application readiness | SIGINT; verify listener; remove root |
| provider and nested Team | isolated hosts | public GraphQL/REST/WS + real Codex and shared/private definition roots | external roots read-only | streams, descriptors, messages, tasks, artifacts | public termination then host close |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| credentials | supported `pnpm secrets:import` into explicit isolated data roots | dry-run/summary only; never print secret values | remove exact isolated roots and scan evidence |
| shared/private definitions | public package-root configuration/import for `/Users/normy/autobyteus_org/autobyteus-agents` and `/Users/normy/autobyteus_org/autobyteus-private-agents` | read-only external roots | terminate runs; no source edits |
| Nested Classroom Team | private package `agent-teams/nested-classroom-test` | real nested recursive Team/task evidence, no repository fixture dependency | remove only isolated run data |
| Brief/Socratic packages | canonical build/validate and real host commands | generated output only | compare hashes and remove only output absent at baseline |
| restart/reentry state | normal APIs and graceful host restart using same isolated root | no direct SQLite/file mutation as behavioral proof | exact-root removal after evidence |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: design Persisted Data / State Transition Decision; implementation handoff `Persisted Data Transition Check`; `BEH-006`, `REQ-008`, `AC-012`.
- Representative existing-data setup and required behavior: current application bindings, publication projections, provider/team history and MCP descriptors created through supported APIs in isolated roots remain directly readable after watch reload/remount and same-data restart.
- Evidence planned for the approved direct-use outcome: current recovery/history suites, real Brief/Socratic state, nested Team history, public post-restart queries, and pre/post package/source digests.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/architecture/agent-provider-composition-boundaries.test.ts` | exact constructor sets, one Host, narrow ports, no provider/default/ambient bypass | AC-001/004/005; SR-005 | Still Valid | CRR-002 and source inventory | run first |
| `tests/architecture/application-framework-boundaries.test.ts` | supported root ownership and task construction boundaries | AC-005/010/012 | Still Valid | CRR-002 | run first |
| `tests/unit/agent-tools/mcp/{agent-tools-mcp-host,scoped-agent-tool-mcp-session-authority,agent-tool-mcp-session-service}.test.ts` | one host, distinct scopes, issue/revoke/close behavior | AC-001–003 | Still Valid | reviewed current contracts | run focused and retained |
| `tests/unit/agent-execution/agent-provider-factory-builder.test.ts` and Codex/Claude constructor/session suites | exact fresh factories, narrow inputs, timing and cleanup | AC-004/006–009 | Still Valid | IR-001/CRR-002 | run affected and broader provider selection |
| `tests/unit/agent-execution/agent-run-manager.test.ts` | post-issue create/restore cleanup, aggregation, quarantine, termination | AC-008–009 | Still Valid | CRR-002 | run first |
| `tests/unit/application-platform/application-execution-scope-kernel-builder.test.ts` | K0–K8 reverse unwind, transfer, exact family identities | AC-010–011 | Still Valid | CRR-002 | run first |
| General supervisor, Team factory/manager, recursive sub-Team/task suites from reviewer selection | complete non-identical execution family and exact releaser/callback recursion | SR-005; AC-004/011/012 | Still Valid | CRR-002 15 files / 100 tests | rerun exact selection |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | authenticated route, tools, scoped revocation/dispatch | AC-001–003/012 | Still Valid | retained API owner | run retained matrix |
| standalone/application backend and task delegation integrations | selected-host routes, application worker, Team/task/publication | AC-012 | Still Valid | transition inventory | run retained matrix |
| nested/hierarchical Team and restart/history E2E | recursive team/task identities and persisted recovery | AC-012 | Still Valid | no behavior/schema change | run deterministic selection |
| devkit and maintained application commands | package build/watch/start behavior and immutable package bytes | BEH-006/AC-012 | Still Valid | public developer contract unchanged | run proportionately and hash |
| preceding scope-boundary `API-REV-001` browser/live evidence | harness characterization on immediately preceding current-base state | all realistic criteria | Out Of Scope as current verdict | different HEAD | rerun critical journeys on this HEAD |
| historical `APIE2E-REPO-005` broad stale-fixture area | unrelated older repository characterization | none | Out Of Scope | upstream records explicitly separate it | do not use as Pass evidence or broaden without new attribution |

## Stale Or Obsolete Coverage Decisions

No relevant durable scenario protects the removed broad MCP runtime, ambient releaser getter, cached zero-argument Mixed Team factory, manager fallback, or process fallback. Reviewed architecture tests explicitly reject them. No API/E2E-owned removal is planned.

## Durable Coverage To Add

None planned. Reviewed production tests already durably cover the exact Host/Authority/provider/session/kernel and recursive Team construction boundaries. Real private-package/provider/browser execution is environment-specific and should remain temporary system evidence rather than create a private external fixture dependency.

## Durable Coverage To Update

`API-REV-001` classified the following eight paths as `Unclear` because they failed through incomplete/ambient execution-family construction. `CRR-003` attributed the problem to Design Impact, and `IR-003` updated the production and governed fixture boundaries under the approved `SR-006` contract. `CRR-004` independently passed these exact files (`64 Pass / 8 environment-gated Skip`). For `API-REV-002` they are **Still Valid after upstream update** and must be rerun first without unrelated global initialization:

- `tests/integration/agent-execution/agent-run-manager.integration.test.ts`
- `tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts`
- `tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts`
- `tests/integration/agent-execution/claude-session-manager.integration.test.ts`
- `tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts`
- `tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts`
- `tests/unit/agent-execution/backends/claude/session/claude-session.test.ts`
- `tests/unit/application-orchestration/application-team-input-root-dispatch.test.ts`

No API/E2E-owned durable edit is planned before this rerun.

## Durable Coverage To Remove

None planned.

## Repository Coverage Execution Plan And Results

| Order | Command / Selection | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | frozen install; shared/devkit/server builds; build-config TypeScript | executable reviewed tree | Pass | `api-rev-002-environment-build.log` |
| 2 | exact prior `APIE2E-F001` eight-file rerun | IR-003 correction without unrelated globals | Pass — 8 files; 64 Pass / 8 gated Skip | `api-rev-002-f001-exact-rerun.log` |
| 3 | 15-file structural selection | architecture, Host/Authority/provider, kernel, Mixed Team, context ownership | Pass — 121/121 | `api-rev-002-structural-focused.log` |
| 4 | expanded 28-file affected selection | provider/session/manager/application/lifecycle integration | Pass — 25 files / 171 tests; 3 files / 29 gated Skip | `api-rev-002-affected-server.log` |
| 5 | 11-file retained selection | recursive Team/task, nested history restart, MCP routes, Brief and standalone composition | Pass — 48/48 | `api-rev-002-retained-server.log` |
| 6 | devkit full suite; Brief/Socratic build, validate and backend typecheck | maintained command/package behavior | Pass — devkit 21/21 and both apps | `api-rev-002-app-build-commands-corrected.log` |
| 7 | unisolated full server characterization | broader repository debt signal only | 539 files Pass / 70 Fail / 31 Skip; not attributed and not Pass evidence | `api-rev-002-all-durable-server-characterization.log` |

## Post-Repository And Final Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | exact corrected and affected matrices; every critical live scenario completed | no live Claude invocation |
| Changed-boundary execution directness | 96% | 98% | direct Host/Authority/provider/kernel tests plus actual scoped tool/provider execution | negligible |
| Cross-boundary integration realism and mock gap | 90% | 98% | real dual hosts, providers, private recursive Team/task, publication, transport, browser | Electron shell not in this stage |
| Environment, configuration, identity, and fixture fidelity | 93% | 95% | isolated SQLite roots, supported credential import, shared/private packages, exact requested models | one initial Studio startup inherited the parent DB URL; it performed only startup/no-pending-migration work and was immediately replaced by the isolated URL before product actions |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 96% | cleanup/quarantine tests, active shutdown, same-data restart, offline histories, remount | wrapper SIGINT exits are signal-style rather than zero exit |
| User-surface, browser, and desktop-shell confidence | 90% | 97% | installed Chrome against standalone and Studio iframes, remount/recovery screenshots | Electron shell remains delivery-owned |
| Durable regression coverage quality and relevance | 94% | 94% | 64+121+171+48 passing current tests and maintained app suite | full unisolated repository characterization retains unrelated/global-fixture-sensitive debt |

- Overall post-repository confidence: **93%**.
- Overall final confidence: **96%** (rounded average of final categories).
- Every critical acceptance criterion directly proven: **Yes** for this API/E2E scope.
- Any applicable category below 90%: **No**.
- Default clean-confidence target met: **Yes**.
- Additional validation that could improve confidence: live Claude provider execution and delivery-owned Electron packaging only; neither is a missing critical criterion for this reviewed ticket.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: Browser + Live API + Lifecycle + real provider process
- Specific confidence gap or residual risk addressed: current-HEAD real Codex execution, authenticated Agent Tools dispatch, application/general scoped-family isolation, recursive Team/task behavior, active close/restart and unchanged user surfaces.
- Why the selected mode can materially improve confidence: it crosses the real provider process, MCP HTTP/session boundary, worker/application graph, WebSocket/browser renderer, SQLite/restart, and recursive Team runtime that unit mocks cannot collectively prove.
- Expected confidence after the selected validation: at least 95% if every critical scenario passes and cleanup is complete.
- Browser-specific decision and rationale: required for web-equivalent Studio/standalone iframe, stream, setup/remount and reentry proof; actual Electron shell is unchanged and delivery-owned.
- Execution status: completed in `API-REV-002`; exact deterministic reruns and realistic broader validation passed. Historical broad-suite characterization remains separate and is not current ticket Pass evidence.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapper over Nuxt/Fastify web surfaces.
- Relevant README or development instructions: root/server/web/devkit READMEs and application manifests.
- Web-equivalent behavior: Studio catalog/gates, embedded app iframe, streams, application state, run views.
- Shell-specific or lifecycle behavior: preload/IPC/window/package behavior is unchanged.
- Chosen validation approach and why it fits the project: installed Chrome against real isolated backend/Nuxt/standalone hosts, supplemented by process lifecycle checks.
- Effect on any already-running desktop application: `None`; use unique ports and isolated roots.
- Behavior not directly proven and confidence consequence: Electron-specific packaging/IPC stays downstream delivery-owned.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: build prerequisites; start isolated standalone maintained app; start isolated Studio backend and Nuxt; start maintained `dev:studio` sessions; import authorized credentials and definition roots through supported interfaces; run journeys; graceful stop/restart; cleanup.
- Environment choices that materially affect the run: unique ports, `/private/tmp` roots, installed Chrome, real Codex `gpt-5.6-luna` where supported, external definition packages read-only.
- Health / readiness checks: HTTP/GraphQL, devkit ready logs, semantic DOM, run events/history, port/process checks.
- Seed data / fixtures: maintained Brief/Socratic packages; shared/private Agent definitions; real private `nested-classroom-test` Team.
- Test identities, authentication, permissions, or session state: isolated vault import, actual run descriptors and authenticated Agent Tools sessions; no values logged.
- Requirement-linked journeys or scenarios: `APIE2E-DUALHOST-001`, `APIE2E-PROVIDER-001`, `APIE2E-PUBLICATION-001`, `APIE2E-NESTED-001`, `APIE2E-REENTRY-001`, `APIE2E-SHUTDOWN-001`, `APIE2E-PARITY-001`.
- Evidence to capture: sanitized API JSON, browser logs/screenshots, host/provider/devkit logs, public post-restart history, pre/post hashes, listener/process cleanup, secret-value scan.
- Owned processes and temporary state to clean up: exact ports/process IDs, browser, application dev scratch, isolated data roots, generated outputs absent at baseline.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `APIE2E-DUALHOST-001` | installed Chrome + isolated Studio/Nuxt and standalone maintained app | both supported roots and unchanged UI/API | live credentials/processes/ports are environment-specific |
| `APIE2E-PROVIDER-001` | actual provider run descriptors and authenticated MCP `tools/list`/dispatch | narrow issuer results in usable real sessions | real-provider nondeterminism and credentials |
| `APIE2E-PUBLICATION-001` | real Brief publication and recipient-name handoff | worker/MCP/session/Team routing/projection | existing durable API owners cover the stable contract |
| `APIE2E-NESTED-001` | private Nested Classroom Team through public launch/message/task paths | recursive exact execution family | private package must not become a public fixture dependency |
| `APIE2E-REENTRY-001` / `APIE2E-SHUTDOWN-001` | active close, same-data restart, public history/session queries | order, invalidation, direct-use state and leak cleanup | orchestration spans ephemeral processes |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Electron-shell-only preload/IPC/window/packaging | no shell source changed; explicitly delivery-owned | low | delivery Electron gate |
| deferred application Agent logical-addressing/schema redesign | explicit non-goal | none for this ticket | separate solution work only |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `APIE2E-F001` — eight transition-governed changed files failed through incomplete/ambient execution-family construction | `Resolved — Design Impact corrected by SR-006 / IR-003 and confirmed by API-REV-002` | `CRR-003`, `IR-003`, `CRR-004`, `api-rev-002-f001-exact-rerun.log` | No further reroute |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — `CRR-004` passed the IR-003 correction and the current coverage plan is reconciled before execution.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` planned by API/E2E; upstream IR-003 test changes will be executed and recorded.
- Prior result/confidence: **Fail / 63%** (`API-REV-001`).
- Current pre-execution confidence: **75%**. Final post-execution confidence is **96%** after the evidence summarized below.
- Broader validation decision: `Required / Completed`.
- Reroute Required Before Validation Execution: `No`; final Pass returns to `/code_reviewer` for proportional test review (`Not Applicable` expected because API/E2E changed no durable test).
- Mandatory order: rerun the exact eight `APIE2E-F001` paths first; then the affected/retained repository matrix; then the credentialed dual-host, private recursive Team/task, publication/handoff, context-file, recovery/restart, active-shutdown, browser, and package-parity matrix.
- Notes: historical unrelated repository debt is not current Pass evidence and will not be attributed without supported origin evidence.


## API-REV-002 Final Execution Reconciliation

### Repository Evidence And Coverage Validity

| Scenario / Coverage Set | Result | Current Validity / Decision | Evidence |
| --- | --- | --- | --- |
| Exact prior `APIE2E-F001` eight files | **Pass** — 8 files; 64 Pass / 8 environment-gated Skip | Still Valid; prior failure resolved by IR-003 without unrelated global initialization | `api-rev-002-f001-exact-rerun.log` |
| Structural provider/Host/Authority/kernel/context selection | **Pass** — 15 files / 121 tests | Still Valid | `api-rev-002-structural-focused.log` |
| Expanded affected server matrix | **Pass** — 25 files / 171 tests; 3 provider files / 29 tests environment-gated Skip | Still Valid | `api-rev-002-affected-server.log` |
| Retained application/MCP/Team/history matrix | **Pass** — 11 files / 48 tests | Still Valid | `api-rev-002-retained-server.log` |
| Devkit and maintained packages | **Pass** — devkit 21/21; Brief/Socratic build, validate, backend typecheck | Still Valid | `api-rev-002-app-build-commands-corrected.log` |
| Full unisolated server characterization | 539 files Pass, 70 Fail, 31 Skip; 3129 tests Pass, 208 Fail, 127 Skip | `Unclear / separate repository debt`; failures span unchanged environment/global-fixture-sensitive areas and are neither attributed to this ticket nor used as Pass evidence | `api-rev-002-all-durable-server-characterization.log` |

The prepackage application selection and first app-command attempt are setup characterizations only: package and frontend-SDK prerequisites were initially absent, then built through the canonical commands and the exact affected/app matrices passed. No assertion was disabled or weakened.

### Realistic Boundary Evidence

- **Standalone Socratic / Codex:** direct maintained standalone host, real `gpt-5.6-luna`, two-message solution `7x - 5 = 44 -> x = 7`, backend notification, same-data restart recovery.
- **Studio Brief / Codex:** real Researcher and Writer run, two projected outputs, authenticated `publish_artifacts`, named `send_message_to` handoff with `research.md`, final application projection.
- **Studio Socratic / Codex:** real mounted iframe, `9x + 4 = 58 -> x = 6`, persisted two-message conversation, same-data restart recovery.
- **Private Nested Classroom / mixed providers:** Teacher on Codex `gpt-5.6-luna`; nested Student One/Two on AutoByteus `deepseek-v4-flash`; exact `/StudentStudyGroup` and `/StudentStudyGroup/student_one` delivery/ACK, delegation, submission and accepted review.
- **Context files:** browser upload normalized to the run-owned context path and real Codex returned `CONTEXT_PROVIDER_COMPOSITION_8F3D2A`.
- **Lifecycle/reentry:** active mixed/native runs and application teams stopped with owned worker/provider processes gone; same data restarted; four retained histories were inactive/offline; both application UIs recovered; public V2 nested resume config retained exact mixed runtime/model identities.
- **Route separation:** internal Agent Tools missing-session requests returned `401` in both hosts; Studio external `/mcp/gateway` initialized with `200`; standalone returned `404`.
- **Watcher/remount/parity:** both maintained `dev:studio` watchers repacked/reloaded after byte-identical source touches; browser remount retained Brief/Socratic state; 140/140 package/authoring files remained byte-identical.
- **Cleanup/security:** owned listeners/processes and isolated roots were removed; baseline generated-output state was restored; exact sensitive-value scan of the complete task artifact package passed.

### Final Coverage Decision

- Repository-resident durable coverage added, updated, or removed by API/E2E: **None**.
- Temporary probes only: credentialed provider/browser/process orchestration, private-package Nested Classroom, route separation, public history/recovery and byte-parity checks; these remain environment-specific and should not become public durable fixtures.
- Prior `APIE2E-F001`: **Resolved and directly confirmed**.
- Broader validation: **Completed / Required**.
- Final result: **Pass**.
- Final confidence: **96%**, with no applicable category below 90%.
- Negligible/bounded residuals: live Claude provider was not invoked (current exact Claude durable coverage passed with backend integration environment-gated); Electron shell packaging remains downstream delivery-owned; the unisolated broad repository characterization retains unrelated `Unclear` debt and is not ticket evidence.


## API-REV-003 Pre-execution Decision

- Investigation completed before API-REV-003 execution: **Yes**.
- Current pre-execution confidence: **75%**. Source review and direct current durable coverage are strong, but no current-head repository or real-system result has yet been produced by API/E2E.
- Proceed: **Yes**.
- Durable API/E2E coverage changes planned: **None**.
- Mandatory order: exact CRR-006 server/web selections; stopped-run/application-owned/terminal durable scenarios and browser probe; current dual-host/provider/private Nested Classroom/context/publication journey; Save-versus-restore, recovery/remount, route/parity/shutdown; cleanup and final scoring.
- Baseline note: backend SDK and SDK-contract `dist` directories and Nuxt `.nuxt` were already present at API-REV-003 entry and are preserved as upstream/reviewer-owned state; application/devkit/frontend SDK outputs and Nuxt `.output` were absent.
- Latest authoritative current-head result: **Pending execution**. API-REV-002 remains historical baseline only.


## API-REV-003 Final Execution Reconciliation

### Current-Head Repository Evidence And Coverage Validity

| Scenario / Coverage Set | Result | Current Validity / Decision | Evidence |
| --- | --- | --- | --- |
| Exact CRR-006 server selection | **Pass — 21 files / 163 tests** | Still Valid; directly exercises current IR-004 validator propagation, execution-family separation, ownership and lifecycle boundaries | `api-rev-003-crr006-server.log` |
| Exact CRR-006 web selection | **Pass — 11 files / 124 tests** | Still Valid; current controlled editor and rendered-state coverage | `api-rev-003-crr006-web.log` |
| Stopped-run/application ownership/recovery selection | **Pass — 7 files / 33 tests** | Still Valid; direct Save-versus-restore, zero-write guard and terminal transition evidence | `api-rev-003-stopped-run-recovery.log` |
| Retained application/MCP/recursive-Team/history selection | **Pass — 11 files / 48 tests** | Still Valid after canonical application package build | `api-rev-003-retained-server-postpackage.log` |
| Current context frontend selection | **Pass — 2 files / 8 tests** | Still Valid | `api-rev-003-context-web.log` |
| SDK/devkit/maintained application commands | **Pass — frontend SDK 12/12; devkit 21/21; Brief and Socratic build/validate/typecheck** | Still Valid | `api-rev-003-app-commands.log` |
| Existing-run browser probe | **Pass** | Still Valid; saved Agent/Team, nested, warning, narrow and active-lock states rendered correctly | `api-rev-003-existing-run-browser.log` |
| Nuxt production/static build | **Pass** | Still Valid | `api-rev-003-web-build.log` |

The initial retained selection failure in `api-rev-003-retained-server.log` was a missing generated-package prerequisite, not an assertion or product failure. Canonical application commands generated the required packages and the unchanged selection then passed. The full unisolated repository characterization was not repeated because API-REV-002 already isolated its unrelated/global-fixture-sensitive failures as historical `Unclear` debt; no current evidence connects that debt to IR-004.

### Realistic Current-Head Evidence

- **Private Nested Classroom:** the private recursive Team launched with Teacher on Codex `gpt-5.6-luna` and `/StudentStudyGroup` on AutoByteus `deepseek-v4-flash`; Team and direct-member acknowledgements, delegated-task submission/acceptance, public termination, stopped config Save, network-fresh reopen and real-provider restore all passed.
- **Standalone Socratic:** the maintained package ran through its actual standalone host and WebSocket surface; Codex `gpt-5.6-luna` solved `13x - 8 = 57` as `x = 5`, published the lesson artifact and retained the two-message transcript.
- **Studio Socratic:** the mounted iframe and real provider produced the approved guided `9x=72` step; active update returned `RUN_ACTIVE` with zero canonical write, remount recovered state, and Close lesson released editability.
- **Studio Brief:** real Researcher/Writer Codex runs published `research.md` and `final-brief.md`; recipient-name `send_message_to` returned `DELIVERED`; application projection and browser remount retained both artifacts.
- **Route separation:** internal Agent Tools missing-session requests returned `401` on both hosts; Studio external gateway initialized with `200`; standalone external gateway remained `404`.
- **Shutdown/restart:** owned host, provider and worker processes drained; both hosts restarted against the same isolated roots; standalone lesson, Studio Brief/Socratic projections and nested stopped config recovered through normal readers.
- **Package integrity:** all **99/99** tracked Brief/Socratic files retained exact SHA-256 bytes.
- **Cleanup/security:** all owned ports/processes and isolated data were removed, baseline output state was restored, `git diff --check` passed, and 12 secret-like values were checked across ticket/evidence files with zero exact matches.

### Harness Characterization

Five temporary harness assumptions were corrected without product or durable-test changes: the confined standalone readiness path, hidden/inherited nested selectors, a WebSocket URL substring assumption, an over-specific Socratic full-answer expectation, and a restart prompt literal. Corrected verifiers exercised the same public behaviors and passed. Nuxt development emitted transient `#app-manifest` warmup warnings, then served `200`, completed the browser journeys, and passed the independent production build.

### Final Confidence And Decision

| Confidence Category | Post-Repository | Final | Supporting Evidence / Residual |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 96% | 98% | exact current repository plus every critical current live scenario |
| Changed-boundary execution directness | 97% | 98% | public stopped-run APIs, exact validator tests, real restore and application ownership |
| Cross-boundary integration realism and mock gap | 91% | 98% | both hosts, providers, worker, MCP, WebSocket, iframe, SQLite and recursive private Team |
| Environment, configuration, identity and fixture fidelity | 94% | 97% | isolated roots, supported secret import, exact packages/providers/models |
| Failure, edge-case, lifecycle and recovery evidence | 94% | 97% | active/unreadable guards, terminal release, close/restart, integrity and leak checks |
| User-surface, browser and desktop-shell confidence | 92% | 97% | current Chrome journeys; unchanged Electron shell remains delivery-owned |
| Durable regression coverage quality and relevance | 95% | 95% | 163 + 124 + 33 + 48 + 8 current tests; historical broad debt remains separate |

- Overall post-repository confidence: **94%**.
- Overall final confidence: **97%**.
- Critical acceptance criteria directly proven: **Yes**, within API/E2E scope.
- Broader validation: **Required / Completed**.
- Durable API/E2E coverage added, updated, or removed: **None**.
- Current result: **Pass**.
- Residuals: live Claude was not invoked; Electron preload/IPC/window packaging is unchanged and delivery-owned; historical broad-suite debt remains separate `Unclear` characterization.
- Required next recipient: `/code_reviewer` for proportional durable-test review; `Not Applicable` is expected for the API/E2E-owned durable-test delta.
