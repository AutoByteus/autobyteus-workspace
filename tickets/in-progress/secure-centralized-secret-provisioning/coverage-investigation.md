# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Supplemental Task Artifacts: `use-case-spine-validation.md`, `secret-storage-architecture.md`, `secret-storage-backend-contract.md`, `credential-consumer-mapping.md`, `live-test-secret-provisioning.md`, and `threat-model-and-option-analysis.md` in this ticket directory.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/code-review-report.md`
- Current Investigation Round: 2
- Trigger: round-6 implementation-source review passed at `3068d0fad00a6adba302199c857b01d2ede7ebc5`; independently recheck `SCSP-E2E-RESTART-001` and execute the now-applicable broader matrix, including project-source Docker persistence when feasible.
- Prior Investigation Reviewed: Round 1 at reviewed implementation `69d5442c0f8eb7c293097d939f79c272d0c56fad` (historical failure retained below).
- Latest Authoritative Investigation: Round 2 (the Round 2 authoritative update at the end of this file governs where it differs from Round 1).

## Current Requirement And Design Basis

The validation basis is BEH-001–BEH-013, REQ-001–REQ-019, AC-001–AC-019, and the reviewed 28-spine solution package. Critical proof includes: server-owned write-only lifecycle/status; explicit catalog-bound JIT authentication; the five-state health model; Local Store pair authentication, read-only use, fault handling, restart, reset, and contention; migration that scrubs plaintext aliases without runtime fallback; `LOCAL_HARDENED` launch/file-root behavior; exact Claude `cli` and `managed-secret` modes; preserved AutoByteus Settings, discovery, scoped catalog lifecycle, and LLM/audio/image invocation; and a tracked, target-only, read-only real-E2E Store workflow.

`EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency, not legal clearance or permission to change authentication modes. The four official Anthropic sources recorded upstream must be rechecked by delivery before release.

The approved live-test contract forbids reading, copying, importing, or migrating credentials from a repository `.env.test`, a default Store, or another checkout. The user's suggestion to move existing `.env.test` credentials is therefore interpreted only as a request to perform the one-time provisioning outcome. This stage will not inspect that file or its values. The supported route is hidden transient input to `pnpm secrets:local:e2e:setup`, targeting the dedicated E2E Store directly. If the target Store is not already provisioned, real-provider execution is unavailable until a human performs that safe setup.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/005/011 | Changed | Requirements, management/backend contract, implementation trace | Exercise save/replace/remove/status, writable versus externally-managed capability, five health states, no value readback, and degraded Settings reachability. |
| BEH-002/006/007 | Changed/Preserved | Requirements and architecture | Exercise empty-base launchers, file-root denial, first-delivery assurance wording, direct/Electron bootstrap, and unchanged single-node Docker persistence; do not claim multi-node or strong isolation. |
| BEH-003/009 | Changed | Consumer mapping and construction design | Exercise exact LLM/metadata/search/media consumers, secret-free construction targets/configs, and actual JIT SDK/client creation. |
| BEH-004/010 | Changed | Live-test provisioning supplement | Replace ambient live gates with one tracked manifest and narrow read-only E2E harness; prove no default-Store or environment fallback. |
| BEH-008 | Changed | Migration plan and handoff | Exercise representative legacy alias/custom-provider cutover, including `AUTOBYTEUS_API_KEY` scrub and host preservation. |
| BEH-012 | Changed | Requirements AC-018 and Claude design | Exercise CLI zero-lookup, managed child-only key delivery/policy, failure mapping, and a real bounded request only when target capability is configured. |
| BEH-013 | Preserved through changed authentication | Approved CR-001 revision | Exercise AutoByteus Settings, replacement/removal/host generations, scoped synchronization, LKG behavior, native coexistence, full/provider refresh, and real capability-aware LLM/audio/image discovery/invocation. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | catalog, management, crypto/SQLite backend, migration, provisioning | changed unit suites | realistic restart/contention/partial-pair/format/ACL behavior | lifecycle probes and executable integration |
| API / transport / contract | Yes | GraphQL provider and secret-storage projections | resolver/unit tests | assembled schema and live service/storage behavior | GraphQL executable E2E |
| Frontend component / state | Yes | Settings store/editor/status/removal/pending states | Vue/Pinia tests | real GraphQL/backend state and degraded modes | browser with local test backend |
| Browser integration / user journey | Yes | provider save/replace/remove/status | mounted component tests | end-to-end DOM/state over live GraphQL | actual browser |
| Authentication / session / permissions | Yes | semantic secret consumer authorization; no new user model | catalog/provisioning tests | real provider and exact child delivery | live direct-secret and CLI probes |
| Desktop renderer / web-equivalent UI | Yes | Settings renderer | Nuxt tests/build | live web-equivalent journey | browser-preferred Nuxt dev path |
| Desktop shell / Electron-specific integration | Yes, bounded | embedded server data-dir/bootstrap and sanitized launch | Electron manager tests/transpile | packaged cross-platform ACL/startup | focused repository checks; actual desktop only if irreplaceable |
| Process / lifecycle | Yes | bootstrap, child environments, Store reopen/reset/contention, discovery generations | focused units | multi-process/restart/fault realism | lifecycle/CLI/process probes |
| Persisted-data transition | Yes | plaintext alias/custom-provider cleanup and reprovision ledger | migration units | startup-integrated repeat/recovery behavior | disposable migration fixtures |
| Worker / queue / distributed coordination | Bounded | application-worker/MCP/process launch policy | unit tests | single-Pod/PVC only; multi-node excluded | lifecycle probes; no cluster claim |
| External integration | Yes | provider SDKs, Claude SDK/CLI, AutoByteus gateway | mocks and narrow live tests (currently stale) | real endpoint/account/capability availability | read-only real-E2E Store harness |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- Project type and runtime stack: pnpm workspace; Node 22/TypeScript; Vitest; Fastify/type-graphql/SQLite; Nuxt/Vue/Pinia; Electron; Docker Compose.
- Conflicting, missing, or unclear project instructions: `autobyteus-server-ts/README.md` still says tests use `.env.test`, which conflicts with AC-012 and the reviewed tracked-manifest contract. The root has `secrets:local:e2e:setup` but no planned `test:e2e:real` script, no `test-support/live-e2e` harness, and the manifest omits the approved AutoByteus scenarios. These are test/operational coverage gaps owned here. No Kubernetes production manifest exists, so single-Pod/PVC proof is limited to the shared `dataDir` configuration contract rather than a repository deployment.
- Required environment variables or secrets available: unknown pending value-free target-E2E preflight. Ambient credentials will not be consulted.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | closest test instruction | use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; narrow before broad. |
| `autobyteus-server-ts/README.md` | build/start/API/Docker instruction | build with `pnpm -C autobyteus-server-ts build`; start `node .../dist/app.js --data-dir ... --host ... --port ...`; endpoints include `/graphql`; Docker has node-local persistent data. |
| `autobyteus-web/package.json`, `nuxt.config.ts` | web-equivalent desktop path | `pnpm -C autobyteus-web dev` proxies GraphQL/REST to `BACKEND_NODE_BASE_URL`; use actual browser for renderer-equivalent Settings. |
| `docker/README.md`, `docker/compose.personal-test.yml` | collision-safe local Docker | project-named `scripts/personal-docker.sh` lifecycle; only clean up the project created for this run. |
| `test-config/live-e2e.json` | tracked non-secret manifest | canonical E2E DB/key filenames, read-only mode, scenario declarations; must remain secret-free. |
| `live-test-secret-provisioning.md` | approved real-secret safety contract | direct target-only hidden-input setup; no `.env.test`, default Store, key copy, environment fallback, or secret output. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| repository suites | worktree/root or package | package-specific `pnpm ... exec vitest run` | existing node_modules present | exit status and Vitest summary | no persistent service |
| disposable backend API | `autobyteus-server-ts` | executable schema or server against temp `--data-dir` | synthetic keys only; isolated SQLite/temp files | GraphQL query/health | close Fastify/backend; remove temp dir |
| Nuxt browser path | `autobyteus-web` | `BACKEND_NODE_BASE_URL=<owned local server> pnpm dev --host ... --port <owned port>` | actual browser; no Electron process | HTTP readiness plus DOM | terminate owned PID/session |
| dedicated real-E2E Store | root | value-free harness preflight; setup only by human hidden input | canonical host target; read-only during tests | health plus logical status only | close backend handle |
| Docker validation | root | `./scripts/personal-docker.sh up --project <unique> ...` if feasible | unchanged topology/volumes; no host E2E mount | project `ps`, service health, persisted Store behavior | project-scoped down; retain/remove only owned volume as scenario requires |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Store lifecycle/faults | temporary Local Store pairs | synthetic canaries only; no canonical Store | close DB and recursively delete owned temp dirs |
| GraphQL/Settings lifecycle | InMemory or temporary writable Local backend | never return raw value; value-free assertions | reset singleton/backend and remove temp state |
| real provider credentials | `secrets:local:e2e:setup` hidden input into dedicated target | never read `.env.test`, default Store, credential file, or raw Store artifact | E2E Store is durable machine state, not cleaned by test |
| browser state | owned browser tab/profile against test service | synthetic input only for save/replace/remove | close tab; stop services; remove temp data |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` for application/custom/test configuration; legacy credential values are `Discard or Rebuild` through reprovision rather than imported into the Store.
- Design-spec and implementation-handoff references: requirements Persisted Data Outcome; design §§153–188 and migration guidance; implementation BEH-008/Legacy checks.
- Representative existing-data setup and required behavior: disposable `.env`/custom-provider v1 data with synthetic aliases and non-secret hosts/metadata. Remove credential values, preserve non-secret data, write current metadata-only schema/reprovision IDs, and never create a secret backup or runtime dual read.
- Evidence planned: focused migration tests plus an executable startup/disposable-directory probe and source scan for runtime aliases.
- Migration-specific completion/recovery scenarios: clean cutover, malformed-source fail-closed behavior, repeated run/idempotency, and no current-runtime fallback.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/secret-management/local-secret-storage-backend.test.ts` | pair create/reopen, swapped empty key, missing read-only Store | AC-014–016 | Needs Update | only 3 scenarios; lacks partial pair, tamper, incompatible, replace/remove/restart/contention/reset | extend or add executable lifecycle suite |
| `.../legacy-secret-cutover-migration.test.ts` | scrub/preserve/fail closed | AC-009/019 | Still Valid, needs broader execution | includes AutoByteus alias and host preservation | run; add only missing repeat/startup evidence if needed |
| server GraphQL/provider/service tests | rich status, save/remove/reload, AutoByteus generations | AC-001/007/008/017/019 | Still Valid | reviewed current behavior | run focused then broader; add assembled GraphQL lifecycle coverage |
| `autobyteus-remote-model-discovery-service.test.ts` | no-host, exact consumers, LKG, remove/host/credential generation fencing | AC-019 | Still Valid | direct lifecycle assertions | run and retain |
| provisioning/catalog/core factory/media gateway tests | exact consumer/credential owner/construction | AC-005/010/019 | Still Valid | reviewed typed boundary | run and retain |
| Claude auth/client tests | CLI/managed mode, child policy, errors | AC-003/018 | Still Valid, incomplete | synthetic capture exists; real Store-backed request absent | run and add real harness scenario/preflight |
| file/workspace/terminal/MCP/application/Electron tests | root and child hardening | AC-003/013 | Still Valid, incomplete | several direct launchers covered; combined canary matrix absent | run plus focused structural/source probes |
| web Provider editor/runtime/store tests | save/remove/pending/status state | AC-001/007/017/019 | Still Valid | current state model | run; add actual browser/live GraphQL journey |
| eight files under `autobyteus-ts/tests/integration/multimedia/{audio,image}` | live OpenAI/Gemini/AutoByteus media and AutoByteus discovery negatives | AC-006/019 | Replace | all are environment-gated or construct clients without explicit auth; four AutoByteus files call removed unauthenticated discovery; deterministic provider negatives are duplicated by current unit/server tests | replace with manifest/harness scenarios; remove obsolete ambient/no-arg assertions |
| `autobyteus-ts/tests/integration/llm/api/autobyteus-llm.test.ts` and other older live LLM suites | ambient live LLM invocation | AC-006/019 | Needs Update / staged scope | still reads provider env aliases | do not count as valid proof; representative current harness scenario must supersede relevant AutoByteus LLM path |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | real GraphQL/tool boundary with mocked clients | AC-005/019 | Still Valid | exercises server ownership but not real provider | run as synthetic cross-boundary evidence |
| unchanged Docker Compose/launcher | node-local data volume | AC-002/016 | Still Valid configuration | no ticket diff | inspect diff and execute restart/persistence if local Docker is feasible |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| eight multimedia integration files | provider keys exist in `process.env`; factories/discovery may construct with no explicit authentication | ambient credential reads and unauthenticated constructors were intentionally removed | BEH-003/004/013, AC-005/006/012/019 | tracked scenario manifest + read-only Store-backed product harness; existing deterministic unit/server lifecycle tests | N/A |
| AutoByteus provider integration empty/failure checks in the old files | no-argument discovery plus global spy is the current coordination boundary | discovery policy now belongs to `AutobyteusRemoteModelDiscoveryService` | design ownership map; reviewed server tests | `autobyteus-remote-model-discovery-service.test.ts` | direct core duplicate should not be retained |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| SCSP-E2E-001 | parse manifest, derive canonical E2E target, read-only value-free preflight, no fallback | AC-006/015/016 | `test-support/live-e2e/*` plus root script | planned owner is absent and old suites cannot run safely |
| SCSP-E2E-002 | Local Store full lifecycle/fault/restart/contention/reset matrix | AC-007/014/015/016 | server API/E2E or unit lifecycle suite | current 3 tests do not cover critical fault/recovery matrix |
| SCSP-E2E-003 | assembled GraphQL provider/secret lifecycle and health | AC-001/007/008/017/019 | server E2E suite | resolver mocks do not prove the cross-boundary contract |
| SCSP-E2E-004 | actual browser Settings configured/missing/degraded/pending/remove states | AC-001/007/017/019 | retained browser evidence and/or durable browser probe where maintainable | critical user surface otherwise remains indirect |
| SCSP-E2E-005 | AutoByteus real LLM/audio/image discovery and representative invocation by advertised capability | AC-006/019 | real harness scenarios | preserves real defect detection without ambient keys |
| SCSP-E2E-006 | Claude managed-secret real bounded request and CLI zero-lookup preflight | AC-018 | real harness scenario + synthetic exact policy coverage | exact real Store-to-child path is critical when capability exists |
| SCSP-E2E-007 | negative leak scanner with seeded detection control | AC-004/018/019 | `test-support/live-e2e` | evidence must prove scanner effectiveness without real value inspection |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| SCSP-E2E-008 | `test-config/live-e2e.json` | add approved AutoByteus LLM/audio/image declarations and any current direct media declarations without secrets | live-test supplement, AC-019 | tracked values remain non-secret |
| SCSP-E2E-009 | root `package.json` | add canonical real-E2E execution/preflight command | design file map and live-test workflow | explicit path; no parent search |
| SCSP-E2E-010 | eight old multimedia integration files | remove env gates/no-arg calls and route/replace through harness | AC-005/006/012/019 | likely replacement/removal rather than duplicative wrappers |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| ambient/no-argument live scenarios in the eight multimedia integration files | obsolete and non-compiling; would protect forbidden behavior | BEH-003/004/013; AC-005/006/012/019 | replace with SCSP-E2E-001/005 and current deterministic server/core tests |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | focused Vitest files for Local Store, management/GraphQL, AutoByteus lifecycle, exact construction, Claude, migration, and hardening | package directories | narrow changed boundaries | Pass after two stale-test fixture corrections | `execution-evidence/04-local-store-lifecycle.log`, `05-graphql-secret-lifecycle.log`, `06-server-focused-matrix.log`, `07-server-media-e2e-rerun.log`, `09-core-metadata-rerun.log`, `10-server-metadata-provisioning.log` |
| 2 | live harness unit/default-skip/import and tracked preflight | worktree root/server package | manifest/path/parser/leak scanner; opt-in safety; capability inventory | Harness Pass; real target Blocked | `01-live-harness-unit.log`, `02-live-suite-default-skip.log`, `03-real-e2e-preflight.log` |
| 3 | `pnpm -C autobyteus-server-ts build` | worktree root | core/server production build and built-in-agent bootstrap | Pass | `15-server-build.log` |
| 4 | focused web Settings and Electron server lifecycle Vitest | web package | renderer state and shell-owned data-dir lifecycle | Pass, 44/44 web and 14/14 Electron | `13-web-settings-focused.log`, `14-electron-lifecycle-focused.log` |
| 5 | core/server test-tree TypeScript checks | package directories | broader test-tree consistency | Known non-green baselines: core 341 errors (down from upstream 365); server 539 rootDir/test-inclusion errors | `11-core-test-tree-typecheck.log`, `12-server-typecheck.log` |
| 6 | full core/server Vitest without the projects' live-environment gates/setup | package directories | broad regression signal | Non-green and not used as ticket verdict: core 91/2,039 failed; server 92/2,606 failed, dominated by old construction signatures, missing external tools/services, stale unrelated fixtures, and broad suite isolation drift. Ticket-focused changed paths are green. | `16-core-full-suite.log`, `17-server-full-suite.log` |
| 7 | `pnpm test:e2e:real:preflight` | root; canonical read-only Store target only | direct real external path availability | Blocked: all 11 scenarios report `UNAVAILABLE` / `SECRET_BACKEND_UNAVAILABLE`; no value/path was read | `03-real-e2e-preflight.log` |
| 8 | actual browser over owned sanitized backend/Nuxt services | owned ports/temp Local Store, synthetic canaries | Settings save/replace/status/remove and restart/reopen | Save/replace/remove Pass; clean documented restart Fail with Prisma P1012 (`DATABASE_URL` absent from Prisma child) | `18-browser-backend-runtime.log`, `20-browser-settings-journey.md`, screenshots |
| 9 | Docker/source/Claude CLI structural probe | root; no container started after implementation failure | unchanged Compose/topology, no direct production ambient provider reads, CLI binary availability | Pass as structural evidence; Docker persistence execution stopped after earlier implementation failure | `21-structural-docker-cli.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 78% | focused changed-boundary suites, Local Store matrix, assembled GraphQL, migration, exact consumers, and safe preflight | critical real provider/Claude/AutoByteus scenarios unavailable | provision dedicated E2E Store safely and rerun after implementation fix |
| Changed-boundary execution directness | 90% | real Local Store, assembled GraphQL, exact construction, and server-owned provisioning execute directly | external SDK/gateway calls unavailable | target Store provisioning and selected live scenarios |
| Cross-boundary integration realism and mock gap | 75% | server E2E and real Local Store cross package boundaries | browser had not yet run at this score point; external providers blocked | actual browser and capability-selected live tests |
| Environment, configuration, identity, and fixture fidelity | 72% | dedicated read-only manifest and sanitized temporary writable fixtures | canonical target Store reports unavailable | hidden-input target provisioning only |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 11-scenario Local Store pair/tamper/format/lock/concurrency/reset matrix and lifecycle races | process-level clean restart not yet run | owned backend restart and Docker restart |
| User-surface, browser, and desktop-shell confidence | 75% | 44 web and 14 Electron tests pass | no browser at the post-repository gate | actual browser against live backend |
| Durable regression coverage quality and relevance | 94% | safe root harness, assembled GraphQL, expanded Store tests, exact metadata test; eight stale suites removed | live provider path cannot execute until provisioned | rerun real scenarios after safe setup |

- Overall post-repository confidence: 82.3%.
- Calculation method: simple average of seven applicable categories.
- Every critical acceptance criterion directly proven: No.
- Any applicable category below 90%: Yes — requirement proof, cross-boundary realism, environment fidelity, and user-surface confidence.
- Default clean-confidence target of 95% met: No.
- Material residual risks: unavailable real target capability, actual process restart, browser Settings states, Docker persistence, and exact managed Claude/AutoByteus external execution. The actual browser run subsequently closed the Settings gap but exposed a clean-restart implementation failure.

## Broader Validation Decision (Mandatory)

- Decision: `Required` and executed until a ticket-owned implementation failure was reproduced.
- Selected execution mode: repository API/lifecycle + actual `Browser` + `Live API`/CLI + project-scoped Docker where feasible.
- Specific confidence gap or residual risk addressed: mocked boundaries, stale live coverage, user Settings journey, Local Store real filesystem/process lifecycle, external provider capability, and unchanged container persistence.
- Why the selected mode can materially improve confidence: each mode directly exercises a boundary the reviewed unit tests bypass.
- Expected confidence after the selected validation: at least 95% only if all critical scenarios run and every category reaches 90%; otherwise Fail or Blocked, never an inflated pass.
- Browser-specific decision and rationale: required because Settings is a material web-equivalent Electron renderer journey and upstream only mounted components.
- If Not Required: N/A.
- If Blocked: value-free preflight identified the dedicated E2E Store itself as `UNAVAILABLE` with `SECRET_BACKEND_UNAVAILABLE` for all 11 tracked scenarios. No repository `.env.test`, default Store, credential file, Store value, or Store artifact was inspected.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer and embedded Node server.
- Relevant README or development instructions: server README plus `autobyteus-web` scripts and Electron server tests.
- Web-equivalent behavior: provider Settings save/replace/remove/status/degraded/pending rendering; validate in browser.
- Shell-specific or lifecycle behavior: embedded data-dir/bootstrap and child launch environment; prefer Electron unit/transpile/build evidence.
- Chosen validation approach and why it fits the project: actual browser for renderer behavior; focused Electron tests/transpilation for shell-owned code. Actual desktop launch only if a shell-specific critical gap remains and it can be isolated.
- Server/frontend setup when browser validation is used: owned temp backend and owned Nuxt port, with synthetic Store values only.
- Effect on any already-running desktop application: None; do not launch or modify the user's application/profile.
- Behavior not directly proven and confidence consequence: packaged cross-platform ACL semantics may remain a bounded residual risk unless available local execution closes it.

## Live Environment And Fixture Plan

- Startup order and commands: finish durable test changes; execute value-free preflight; start isolated test backend/Nuxt for browser; run selected real scenarios only if preflight says the logical capability is configured; run project-scoped Docker separately.
- Environment choices that materially affect the run: no credential aliases in parent/test environments; E2E Store read-only; all CRUD/fault/browser saves use temporary writable Store or InMemory backend; unique ports/project IDs.
- Health / readiness checks: backend health/GraphQL, Nuxt HTTP, Docker project health, E2E health/definition status only.
- Seed data / fixtures: synthetic canaries and temporary pairs; no existing repository credential file or default Store.
- Test identities, authentication, permissions, or session state: existing unauthenticated Settings behavior; exact semantic secret consumers; external provider identity only inside reviewed product boundary.
- Requirement-linked journeys or scenarios: SCSP-E2E-001–010.
- DOM, screenshot, log, API, process, or other evidence to capture: value-free GraphQL/DOM states, sanitized command summaries, process lifecycle, capability identifiers, and screenshots without entered values.
- Owned processes and temporary state to clean up: all PIDs, tabs, temp dirs, SQLite pairs, browser state, and project-scoped Docker resources created by this run.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| SCSP-PROBE-001 | disposable filesystem ACL/owner and multi-process Store open probe | platform-specific Local Store posture/contention | platform orchestration is evidence-heavy and durable unit semantics live in backend tests |
| SCSP-PROBE-002 | source/diff/child-environment structural scan | no ambient aliases, Docker diff, forbidden inherited descriptors | exact repository snapshot audit supplements behavioral tests |
| SCSP-PROBE-003 | project-scoped Docker restart | unchanged persistent default Store location/topology | local Docker availability and cost make this broader validation rather than a default suite |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| multi-replica centralized custody | explicitly out of scope; no adapter | no claim possible | future enterprise adapter delivery |
| `STRONG_AGENT_ISOLATION` | explicitly deferred | same-user/all-in-one reach remains | preserve `LOCAL_HARDENED` wording |
| production Kubernetes cluster | no repository manifest/assigned cluster | single-Pod/PVC config only indirect | delivery/deployment-specific verification when a target exists |
| real external scenario with missing target definition/host/account capability | cannot fabricate or inspect a credential source | critical scenario remains unproven | user performs reviewed hidden-input target setup or supplies non-secret host config; rerun same scenario ID |
| unchanged Docker restart/persistence execution | stopped after the owned local-process restart already exposed a ticket implementation failure | container persistence remains unproven this round | rerun after the implementation restart fix; Compose/topology diff is unchanged and Docker is available |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `SCSP-E2E-RESTART-001`: second documented start against the same generated `.env`/data dir fails with Prisma P1012 because parsed `DATABASE_URL` is not placed in the Prisma child environment | Preliminary `Local Fix`, implementation-owned source | `execution-evidence/18-browser-backend-runtime.log`; direct base-to-head diff changes `.env` loading from `dotenv.config` to non-process-wide parsing while `initSqlitePath()` returns early for an already-configured URL | `code_reviewer` for focused failure-origin review |

## Investigation Decision

- Proceed To API/E2E Execution: Yes.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: Yes.
- Post-repository confidence: 82.3%.
- Broader validation decision: Required; actual browser/local-process execution ran and found `SCSP-E2E-RESTART-001`.
- Reroute Required Before Validation Execution: No; reroute became required during broader execution.
- Recommended Recipient If Reroute Required: `code_reviewer` for focused failure-origin review, preliminary implementation-owned Local Fix.
- Notes: final execution result is `Fail`, not `Blocked`, because the implementation restart defect is reproducible even though the dedicated real-provider Store is separately unavailable. No `.env.test`, default Store, credential file, raw credential, or secret-bearing artifact was read. Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` in every later handoff.

---

## Round 2 Authoritative Re-investigation

### Trigger, Scope, And Prior-Failure Recheck

- Reviewed implementation HEAD: `3068d0fad00a6adba302199c857b01d2ede7ebc5`.
- Reviewed base: `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`.
- Round-6 source-review decision: Pass; CR-001–CR-009 resolved in the canonical `code-review-report.md`.
- Required first action: independently recheck `SCSP-E2E-RESTART-001` with a sanitized second process, the same owned `--data-dir`, and no forwarded parent `DATABASE_URL`.
- Broader action: revalidate the focused AppConfig/Prisma/app-data and Store/GraphQL boundaries, recheck the real-E2E capability inventory without reading credentials, and execute the documented source Docker path because Docker 29.0.1 was available.
- Existing Round 1 validity decisions remain current. No stale ambient-key suite was restored, and no new durable API/E2E test edit was made in Round 2. The rework-added restart regression is relevant durable coverage, but its passing result cannot substitute for independent API/E2E execution.

### Round 2 Coverage Decisions

| Path / Scenario | Decision | Reason | Round 2 Action |
| --- | --- | --- | --- |
| `tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts` | Still Valid, insufficient alone | Directly targets CR-009, but is implementation-local and shares repository test setup. | Run 1/1, then independently repeat as two real server processes and direct GraphQL. |
| AppConfig, Prisma child, app-data migration and token-usage tests | Still Valid | Directly exercise the changed database URL/configuration boundary. | Run sequentially after recording and correcting test-runner database contention. |
| Local Store lifecycle and assembled GraphQL lifecycle | Still Valid | Confirms the managed Store/API behavior reopened by the process test. | Rerun 13/13. |
| Round 1 actual-browser Settings journey | Still Valid | Rework is backend DB URL delivery only; renderer/GraphQL contract did not change. | Carry forward value-free browser evidence; do not rerun a redundant browser journey. |
| Canonical real-E2E preflight | Still Valid capability gate | AC-006/AC-019 require exact unavailable capability reporting rather than fabricated execution. | Rerun read-only preflight; all 11 declared capabilities remain `UNAVAILABLE` / `SECRET_BACKEND_UNAVAILABLE`. |
| `docker/docker-start.sh` + `Dockerfile.monorepo` + Compose | Execute temporary broader probe | Round 1 topology was only inspected. A clean project-source build can expose configuration assumptions hidden by a host checkout. | Attempt `up --build-local`; build fails at the server bootstrap smoke before container creation. |

### Round 2 Repository And Runtime Results

| Order | Command / Mode | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts build` | host production build, shared packages, Prisma generation, server bootstrap smoke | Pass | `execution-evidence/24-round2-server-build.log` |
| 2 | three focused Vitest groups initially launched concurrently | API/E2E setup isolation | Two setup failures: shared `tests/.tmp/autobyteus-server-test.db` was locked; not a product failure | `25-round2-focused-prisma-appdata.log`, `26-round2-durable-restart.log` |
| 3 | same AppConfig/Prisma/app-data group rerun sequentially | database URL parsing, migration child environment, app-data/token paths | Pass, 6 files / 38 tests | `25-round2-focused-prisma-appdata-rerun.log` |
| 4 | restart lifecycle test rerun sequentially | durable two-process restart regression | Pass, 1/1 | `26-round2-durable-restart-rerun.log` |
| 5 | Local Store + assembled GraphQL lifecycle | Store pair/lifecycle/status/save/remove | Pass, 2 files / 13 tests | `27-round2-store-graphql.log` |
| 6 | two real built-server processes, same owned data dir/port, each launched through `env -i` operational allowlist without `DATABASE_URL`; direct GraphQL save/status/reopen/remove | `SCSP-E2E-RESTART-001` | **Pass**: two migration completions, two listens, value-free `CONFIGURED` reopen, removal to `MISSING`, zero P1012/missing-URL/canary log hits | `28-round2-manual-restart-runtime.log`, `29-round2-manual-graphql.log` |
| 7 | `pnpm test:e2e:real:preflight` | tracked external capability inventory | Harness Pass 11/11; all declared external scenarios unavailable with exact `SECRET_BACKEND_UNAVAILABLE` | `30-round2-real-preflight.log` |
| 8 | `./autobyteus-server-ts/docker/docker-start.sh up -p scsp-round2 --build-local` | documented clean source image build before Docker persistence/restart | **Fail: SCSP-E2E-DOCKER-001** | `31-round2-docker-build-up.log`, `33-round2-docker-failure-source.log` |
| 9 | project-scoped Docker cleanup plus owned temp/port verification | cleanup | Pass; no container/volume/runtime state or manual temp process/data remained | `32-round2-cleanup.log` |

The initial Vitest lock was an API/E2E-owned execution setup issue caused by concurrent global setup against one test database. Sequential reruns closed it. The Docker failure is distinct: Docker reached `RUN pnpm -C autobyteus-server-ts build`; `smoke-built-in-agents-bootstrap.mjs` imported a module graph that constructs the token-usage Prisma client, and the new configured Prisma factory synchronously called `getOperationalDatabaseUrl()` before a clean image-build context had initialized `DATABASE_URL`. The resulting `AppConfigError: DATABASE_URL is not configured.` stopped the source image build. Docker/Compose source itself is unchanged from the reviewed base, but the reviewed production-source interaction makes that unchanged packaging path unusable.

### Prior Failure Resolution

| Prior Scenario | Prior Result | Required Recheck | Round 2 Result | Evidence |
| --- | --- | --- | --- | --- |
| `SCSP-E2E-RESTART-001` / AC-007, AC-014, AC-016 | Fail: second process hit Prisma P1012 | same binary, same owned data dir, sanitized second process, no parent `DATABASE_URL`, migrations/listen/value-free reopen/remove | **Resolved / Pass** | durable 1/1 plus independent `28`/`29` evidence |

### New Reroute Trigger

| Issue | Affected Criteria | Expected | Observed | Preliminary Classification | Evidence | Recipient |
| --- | --- | --- | --- | --- | --- | --- |
| `SCSP-E2E-DOCKER-001` | BEH-006; AC-002, AC-016 | documented local-source Docker path builds the reviewed source, creates the server container, then permits same-volume restart/persistence validation | build stops before image/container creation because the bootstrap smoke imports a production Prisma singleton whose configured factory requires an initialized operational DB URL | `Local Fix`, likely implementation-owned source/packaging interaction; focused reviewer classification required | `31-round2-docker-build-up.log`, `33-round2-docker-failure-source.log` | `code_reviewer` |

This is not classified as an API/E2E environment failure: the documented build command ran on a healthy Docker 29.0.1 daemon, downloaded/built its dependencies, and failed deterministically in the repository's own server build step. Injecting a synthetic `DATABASE_URL` into the build would mask the clean-build contract and was therefore not used as a workaround.

### Round 2 Confidence Gate

Post-repository confidence before broader manual/Docker execution was **91.1%**: the focused rework suite was green, but independent process and container proof were still required. Final confidence after broader execution is **90.1%** (simple average):

| Confidence Category | Final | Evidence | Remaining Uncertainty / Failure |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 86% | restart, Store, GraphQL, browser carry-forward and migration/config tests | Docker source-build/persistence critical path fails; external capability-selected invocations unavailable |
| Changed-boundary execution directness | 96% | independent built processes and direct GraphQL plus focused production tests | real provider endpoints unavailable |
| Cross-boundary integration realism and mock gap | 86% | actual browser retained; real processes and Docker build attempted | image never reaches container runtime |
| Environment/configuration/identity/fixture fidelity | 84% | sanitized `env -i`, same data dir, clean source Docker builder | clean container build exposes unresolved DB initialization assumption |
| Failure/edge/lifecycle/recovery evidence | 92% | Round 1 fault matrix plus passing restart and deterministic clean-build failure | container same-volume restart cannot run |
| User-surface/browser/desktop-shell confidence | 92% | Round 1 actual browser plus Electron-focused evidence remains valid | packaged desktop intentionally not launched |
| Durable regression coverage quality/relevance | 95% | current Store/GraphQL/restart/harness tests are focused and green | Docker clean-build regression is not yet covered |

- Default 95% clean target met: No.
- Applicable categories below 90%: requirement proof, cross-boundary realism, environment fidelity.
- Critical failure present: Yes, `SCSP-E2E-DOCKER-001`.
- Broader-validation decision: `Required` and executed. It resolved the prior restart failure and discovered a new implementation/packaging failure.
- Final investigation result: **Fail**, not `Blocked`. The external real-E2E target remains an exactly reported unavailable sub-capability, while the Docker build failure is reproducible without any external secret.

### Round 2 Safety And Dependency Record

- No `.env.test`, default Store, credential file, Store value, or secret-bearing artifact was read, copied, imported, logged, or inspected.
- Only synthetic managed-Store values were used, and evidence contains structural status/booleans rather than the synthetic value.
- The user-requested real credential outcome remains safely available only through human hidden-input target provisioning with `pnpm secrets:local:e2e:setup -- --definition <logical-id>`; no ambient fallback is authorized.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency only. Delivery must recheck the four official Anthropic sources recorded in the package. It is not legal clearance or an authentication-mode redesign, and no Claude mode changed.
- Claims remain `LOCAL_HARDENED`; `STRONG_AGENT_ISOLATION` remains deferred.

### Round 2 Investigation Decision

- Proceeded to execution: Yes.
- Prior unresolved failure rechecked first: Yes; `SCSP-E2E-RESTART-001` passed.
- Durable coverage changed by API/E2E in this round: No; Round 1 durable changes remain preserved.
- Reroute required: Yes, because `SCSP-E2E-DOCKER-001` blocks a clean result.
- Recommended recipient: `code_reviewer` for focused failure-origin review and owner classification, not proportional successful-test review.
