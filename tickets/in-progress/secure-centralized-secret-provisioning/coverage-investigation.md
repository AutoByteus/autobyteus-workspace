# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Supplemental Task Artifacts: `use-case-spine-validation.md`, `secret-storage-architecture.md`, `secret-storage-backend-contract.md`, `credential-consumer-mapping.md`, `live-test-secret-provisioning.md`, `threat-model-and-option-analysis.md`, and `repository-prisma-1.0.8-assessment.md` in this ticket directory.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/code-review-report.md`
- Current Investigation Round: 11
- Trigger: Round-26 source-review Pass at `ad629bc55ed5c653db957ce46bdbc5092c7738ac`; independently recheck exact Gemini Vertex Express construction, the distinct Gemini metadata contract, real Codex continuity, restart, Docker, and every applicable configured capability.
- Prior Investigation Reviewed: Rounds 1–10, including the Round 10 importer/restart/Docker passes and the real Vertex Express mode-propagation failure corrected by CR-020.
- Latest Authoritative Investigation: Round 11 (the Round 11 authoritative update at the end of this file governs where it differs from earlier rounds).

## Current Requirement And Design Basis

The validation basis is BEH-001–BEH-015, REQ-001–REQ-021, AC-001–AC-021, and the current reviewed solution package. Critical proof includes: server-owned write-only lifecycle/status; explicit catalog-bound JIT authentication; the five-state health model; Local Store pair authentication, read-only use, fault handling, restart, reset, and contention; byte-identical legacy-source non-authority with no automatic update; the explicit operator importer; exact `repository_prisma@1.0.8`; `LOCAL_HARDENED` launch/file-root behavior; exact Claude `cli` and `managed-secret` modes; preserved AutoByteus Settings/discovery/invocation; and a tracked read-only real-E2E Store workflow.

`EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency, not legal clearance or permission to change authentication modes. The four official Anthropic sources recorded upstream must be rechecked by delivery before release.

The current approved contract supports operator-invoked hidden-input provisioning and the reviewed explicit-source importer. API/E2E never reads the user's assignment source, `.env.test`, a default Store, Store values, or credential files: importer coverage uses synthetic private temporary sources/Stores, while real execution uses only status projection and read-only JIT resolution from the independently provisioned dedicated E2E Store.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/005/011 | Changed | Requirements, management/backend contract, implementation trace | Exercise save/replace/remove/status, writable versus externally-managed capability, five health states, no value readback, and degraded Settings reachability. |
| BEH-002/006/007 | Changed/Preserved | Requirements and architecture | Exercise empty-base launchers, file-root denial, first-delivery assurance wording, direct/Electron bootstrap, and unchanged single-node Docker persistence; do not claim multi-node or strong isolation. |
| BEH-003/009 | Changed | Consumer mapping and construction design | Exercise exact LLM/metadata/search/media consumers, secret-free construction targets/configs, and actual JIT SDK/client creation. |
| BEH-004/010 | Changed | Live-test provisioning supplement | Replace ambient live gates with one tracked manifest and narrow read-only E2E harness; prove no default-Store or environment fallback. |
| BEH-008 | Changed | Current no-automatic-update design and handoff | Exercise byte-identical legacy sources, sensitive-assignment exclusion, non-secret projection, custom-provider value-free rejection, and no runtime fallback. |
| BEH-012 | Changed | Requirements AC-018 and Claude design | Exercise CLI zero-lookup, managed child-only key delivery/policy, failure mapping, and a real bounded request only when target capability is configured. |
| BEH-013 | Preserved through changed authentication | Approved CR-001 revision | Exercise AutoByteus Settings, replacement/removal/host generations, scoped synchronization, LKG behavior, native coexistence, full/provider refresh, and real capability-aware LLM/audio/image discovery/invocation. |
| BEH-014 | Added | Approved explicit importer design | Exercise strict source trust/grammar/mapping, value-free planning, target isolation, confirmation, non-mutation, atomicity/rollback, and source immutability with synthetic private fixtures only. |
| BEH-015 | Added | Approved package replacement | Exercise frozen selection of exact `repository_prisma@1.0.8`, no legacy patch/resolution, import safety, default-off logging, unchanged production ownership, build, and restart. |

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
| Persisted-data transition | Yes | no-automatic-update legacy non-authority plus explicit operator import | non-authority/importer units | startup byte identity and importer transaction recovery | disposable sources/Stores and process restart |
| Worker / queue / distributed coordination | Bounded | application-worker/MCP/process launch policy | unit tests | single-Pod/PVC only; multi-node excluded | lifecycle probes; no cluster claim |
| External integration | Yes | provider SDKs, Claude SDK/CLI, AutoByteus gateway | mocks and narrow live tests (currently stale) | real endpoint/account/capability availability | read-only real-E2E Store harness |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- Project type and runtime stack: pnpm workspace; Node 22/TypeScript; Vitest; Fastify/type-graphql/SQLite; Nuxt/Vue/Pinia; Electron; Docker Compose.
- Conflicting, missing, or unclear project instructions: the authoritative root now provides the hidden-input setup, explicit importer, canonical `test:e2e:real` runner/harness, and tracked AutoByteus scenarios. Any older README reference to ambient `.env.test` is non-authoritative. No Kubernetes production manifest exists, so single-Pod/PVC proof remains limited to the reviewed data-directory/PVC contract rather than repository deployment execution.
- Required external capabilities: the value-free Round 7 preflight reports the dedicated backend `READY`; only `provider.openai.api-key` is `CONFIGURED`. Ambient credentials are not consulted.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | closest test instruction | use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; narrow before broad. |
| `autobyteus-server-ts/README.md` | build/start/API/Docker instruction | build with `pnpm -C autobyteus-server-ts build`; start `node .../dist/app.js --data-dir ... --host ... --port ...`; endpoints include `/graphql`; Docker has node-local persistent data. |
| `autobyteus-web/package.json`, `nuxt.config.ts` | web-equivalent desktop path | `pnpm -C autobyteus-web dev` proxies GraphQL/REST to `BACKEND_NODE_BASE_URL`; use actual browser for renderer-equivalent Settings. |
| `autobyteus-server-ts/docker/README.md`, `docker-start.sh`, `docker-compose.yml` | collision-safe local Docker | project-named `docker-start.sh` lifecycle with generated runtime ports; only clean up the project and volumes created for this run. |
| `test-config/live-e2e.json` | tracked non-secret manifest | canonical E2E DB/key filenames, read-only mode, scenario declarations; must remain secret-free. |
| `live-test-secret-provisioning.md` | approved real-secret safety contract | hidden-input or explicit operator-selected source import targets one Store; API/E2E never reads the source/default Store and no key copy, runtime fallback, or secret output is allowed. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| repository suites | worktree/root or package | package-specific `pnpm ... exec vitest run` | existing node_modules present | exit status and Vitest summary | no persistent service |
| disposable backend API | `autobyteus-server-ts` | executable schema or server against temp `--data-dir` | synthetic keys only; isolated SQLite/temp files | GraphQL query/health | close Fastify/backend; remove temp dir |
| Nuxt browser path | `autobyteus-web` | `BACKEND_NODE_BASE_URL=<owned local server> pnpm dev --host ... --port <owned port>` | actual browser; no Electron process | HTTP readiness plus DOM | terminate owned PID/session |
| dedicated real-E2E Store | root | value-free harness preflight; operator setup via hidden input or reviewed explicit importer | canonical host target; read-only during tests | health plus logical status only | close backend handle |
| Docker validation | root | `./scripts/personal-docker.sh up --project <unique> ...` if feasible | unchanged topology/volumes; no host E2E mount | project `ps`, service health, persisted Store behavior | project-scoped down; retain/remove only owned volume as scenario requires |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Store lifecycle/faults | temporary Local Store pairs | synthetic canaries only; no canonical Store | close DB and recursively delete owned temp dirs |
| GraphQL/Settings lifecycle | InMemory or temporary writable Local backend | never return raw value; value-free assertions | reset singleton/backend and remove temp state |
| real provider credentials | hidden-input setup or operator-run explicit importer into the dedicated target | API/E2E never reads the source, `.env.test`, default Store, credential file, or raw Store artifact | E2E Store is durable user-owned machine state, not cleaned by test |
| browser state | owned browser tab/profile against test service | synthetic input only for save/replace/remove | close tab; stop services; remove temp data |

## Persisted Data Transition Coverage Basis

- Approved decision: no automatic migration or source update. Approved non-secret application settings are `Directly Usable — No Migration`; legacy credential authority and custom-provider-v1 runtime records are `Discard or Rebuild`; the explicit operator importer is a separate user-invoked transition.
- Design-spec and implementation-handoff references: requirements Persisted Data Outcome; design §§153–188 and migration guidance; implementation BEH-008/Legacy checks.
- Representative existing-data setup and required behavior: disposable `.env`/custom-provider-v1 data with synthetic aliases and non-secret settings. Leave both sources byte-identical, project only approved non-secret settings, reject custom-provider-v1 value-free, and retain no credential authority or runtime fallback.
- Evidence planned: focused legacy-source non-authority/AppConfig tests, explicit importer tests against synthetic private sources/Stores, two-process byte-identity restart, and source scans for runtime aliases.
- Transition-specific completion/recovery scenarios: unchanged-source startup, malformed importer source fail-closed, dry-run/cancellation non-mutation, transaction rollback, repeated import/idempotency, and no current-runtime fallback.
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

---

## Round 3 Authoritative Re-investigation

### Trigger And Recheck Scope

- Implementation HEAD: `62417e80831a52e627d1b4365e9bfcdc9817ae81`.
- Reviewed base: `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`.
- Round-9 implementation-source review: Pass, 93.4/100, CR-001–CR-011 resolved.
- Mandatory first scenario: `SCSP-E2E-DOCKER-001`, without an injected `DATABASE_URL` or another clean-build workaround.
- Required Docker spine: documented local source build -> image import -> container creation/start -> migrations/listen -> synthetic provider save/status -> same named data volume through container restart -> value-free `CONFIGURED` reopen -> removal -> `MISSING` -> complete project cleanup.
- Applicable repository matrix: AppConfig/Prisma/import lifecycle/app-data/token-usage; Local Store/GraphQL/restart; value-free external capability preflight.
- Round 1 actual-browser Settings evidence remains valid because the later rework is limited to Prisma initialization/resource ownership and build smoke. No renderer, Settings, GraphQL credential contract, Docker launcher, or Compose source changed.

### Round 3 Existing-Coverage Decisions

| Path / Scenario | Decision | Round 3 Reason / Action |
| --- | --- | --- |
| `SCSP-E2E-DOCKER-001` temporary project-source probe | Recheck first | The prior clean build failed before container creation; only an independent clean image build and same-volume runtime lifecycle can resolve it. |
| `tests/unit/config/prisma-import-lifecycle.test.ts` | Still Valid | Directly proves import/constructor configuration freedom, shared lazy default client ownership, caller ownership, and migration disconnect behavior. Run with the focused Prisma/token matrix. |
| AppConfig, migration-child, app-data, token-usage repository/store integration tests | Still Valid | CR-010/CR-011 changed their interaction and lifetime. Run sequentially in one Vitest process to avoid the Round 2 shared-test-database contention. |
| `server-restart-secret-lifecycle.e2e.test.ts` | Still Valid | Recheck that CR-009 remains resolved while CR-010/CR-011 change acquisition timing/ownership. |
| Local Store + assembled provider GraphQL lifecycle | Still Valid | Recheck real managed storage/API save/replace/remove/status behavior around the Prisma changes. |
| canonical real-E2E preflight | Still Valid capability gate | Reconfirm exact capability availability without credential inspection. External invocation remains unclaimed when the dedicated Store reports unavailable. |
| Round 1 browser journey and focused UI/Electron evidence | Carry Forward | No affected UI/shell source; repeated browser or actual desktop execution would not improve confidence in the changed database/build boundary. |

No API/E2E durable test code was edited in Round 3. All earlier durable coverage additions, updates, and stale removals remain preserved for proportional review after the successful run.

### Round 3 Execution Plan And Results

| Order | Command / Mode | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `./autobyteus-server-ts/docker/docker-start.sh up -p scsp-round3 --build-local` | clean project-source image build and container start; no DB URL workaround | **Pass** | `34-round3-docker-build-up.log` |
| 2 | Docker GraphQL readiness and initial provider status | container migrations/listen and writable Local Store | Pass: `READY / MISSING / WRITABLE` | `35-round3-docker-runtime.log` |
| 3 | synthetic AutoByteus save/status inside the started container | write-only Store/GraphQL boundary | Pass: value-free `CONFIGURED` | `36-round3-docker-graphql.log` |
| 4 | project Compose `restart autobyteus-server`; readiness and identity/mount inspection | same container and same named data volume across restart | Pass | `37-round3-docker-restart.log` |
| 5 | post-restart status/remove/final status and structural runtime scan | persisted Store reopen/removal plus migration/listen/error evidence | Pass: value-free `CONFIGURED`, remove acknowledged, final `MISSING`; 2 migrations, 2 listens, zero P1012/missing-URL/canary hits | `36-round3-docker-graphql.log`, `37-round3-docker-restart.log` |
| 6 | 9-file AppConfig/Prisma/import/app-data/token focused Vitest | changed lazy ownership and explicit configuration | Pass, 54/54 | `38-round3-focused-prisma-token.log` |
| 7 | restart + Local Store + assembled GraphQL focused Vitest | restart/fault/lifecycle regression | Pass, 14/14 | `39-round3-store-restart.log` |
| 8 | `pnpm test:e2e:real:preflight` | tracked external capability inventory | Harness Pass, 11/11; all capabilities exactly unavailable | `40-round3-real-preflight.log` |
| 9 | `docker-start.sh down -p scsp-round3 --volumes --delete-state` plus resource queries | cleanup | Pass; container, volumes, network, and saved runtime state absent | `41-round3-cleanup.log` |
| 10 | structural evidence aggregation, Docker/base diff, secret-canary scan, `git diff --check` | evidence integrity | Pass | `42-round3-summary-scan.log` |

One temporary evidence-collection formatting issue occurred after the container was already ready: a Docker Go-template expression used to print the data mount was incorrectly escaped, producing an empty first `data_volume` field in `35-round3-docker-runtime.log`. A Python `docker inspect` parse immediately corrected the evidence in the same file. Product execution was unaffected; the corrected initial and post-restart records both show `scsp-round3_autobyteus-server-data` mounted at `/home/autobyteus/data` on container `7bec5da74c3e`.

### Prior Failure Resolution

| Scenario ID | Prior Round Result | Required Round 3 Recheck | Round 3 Result | Evidence |
| --- | --- | --- | --- | --- |
| `SCSP-E2E-DOCKER-001` / BEH-006 / AC-002 / AC-016 | Fail before image/container creation | clean local-source build with no injected DB URL; container migrations/listen; same named volume through save/restart/value-free reopen/remove | **Resolved / Pass** | `34`–`37`, `41`, `42` round3 evidence |

The exact earlier failure no longer reproduces: the Docker build output contains `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.`, completes the Linux/arm64 image, creates and starts the container, and reaches the lifecycle. No Docker/Compose/launcher source changed from the reviewed base; the production import/lazy-ownership corrections restore the existing packaging path.

### Round 3 Confidence Gate

Post-repository confidence before the required Docker rerun was **93.3%**. The focused ownership/restart evidence was strong, but the historically failing clean image boundary remained unresolved and therefore required broader execution.

Final confidence after Docker and cleanup is **96.9%** (simple average):

| Confidence Category | Final | Direct Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 95% | cumulative requirements matrix, browser, Store/GraphQL, migrations, exact consumers, restart, and clean Docker lifecycle | external capability-selected calls remain unavailable, explicitly reported rather than passed |
| Changed-boundary execution directness | 98% | clean source image, real container, real SQLite/Store, direct GraphQL, focused ownership integration | no production external provider target |
| Cross-boundary integration realism and mock gap | 98% | image build -> supervisor -> server -> migrations -> GraphQL -> Store -> named volume -> restart | multi-node/Kubernetes remains outside first-delivery scope |
| Environment/configuration/identity/fixture fidelity | 98% | documented helper, clean Linux/arm64 builder/runtime, no DB URL workaround, owned ports/project/volume | other OS/container architectures not executed |
| Failure/edge/lifecycle/recovery evidence | 98% | cumulative fault/contention/reset plus local and container restart/reopen/removal | none material for the reviewed local single-node scope |
| User-surface/browser/desktop-shell confidence | 95% | Round 1 actual browser plus focused web/Electron evidence remains applicable | actual packaged desktop intentionally unnecessary |
| Durable regression coverage quality/relevance | 96% | Store/GraphQL/harness/restart/import-lifecycle coverage and stale suite removal | Docker lifecycle remains temporary evidence, not a default durable suite |

- Default 95% clean target met: Yes.
- Applicable category below 90%: No.
- Historically failing critical scenario unresolved: No.
- External real-provider scenarios: `Unavailable`, not claimed as passed. The capability gate itself was directly exercised and returned the exact accepted unavailability status for all 11 declarations.
- Broader-validation decision: `Required` and completed successfully.
- Round 3 investigation result: **Pass**.

### Round 3 Safety, Scope, And Dependency Record

- No `.env.test`, default Store, credential file, Store value, or secret-bearing artifact was read, copied, imported, inspected, or logged.
- Only an owned disposable Docker Local Store and a synthetic canary were used. Raw-canary hit count across Round 3 evidence is zero.
- The dedicated real-E2E Store remains unavailable. No real OpenAI, Gemini, Serper, Anthropic, or AutoByteus execution is claimed.
- Safe future live execution requires human hidden-input target provisioning with `pnpm secrets:local:e2e:setup -- --definition <logical-id>`; no ambient fallback is authorized.
- Claims remain `LOCAL_HARDENED`; `STRONG_AGENT_ISOLATION` remains deferred.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency only. Delivery must recheck the four official Anthropic sources recorded in the package. It is not legal clearance or an authentication-mode redesign, and no Claude authentication mode changed.

### Round 3 Investigation Decision

- Proceeded to API/E2E and broader execution: Yes.
- Prior failure rechecked first: Yes; `SCSP-E2E-DOCKER-001` passed.
- Repository-resident durable coverage changed in Round 3: No; cumulative earlier durable changes remain reviewable.
- Reroute required: No.
- Recommended recipient: `code_reviewer` for the separate proportional durable-test review, with the cumulative package and all still-relevant evidence.

---

## Round 4 Authoritative Re-investigation

### Trigger And Scope

- Implementation HEAD remains `62417e80831a52e627d1b4365e9bfcdc9817ae81`; implementation source review and Round 3 executable result remain `Pass`.
- Proportional durable-test review identified only `TCR-001` and `TCR-002`; both are bounded API/E2E-owned harness/runner defects. No production source, Docker/Compose/launcher, UI, GraphQL contract, Store implementation, migration, or Claude authentication mode changed in this round.
- The dedicated read-only real-E2E Store remains unavailable. The approved target-only provisioning workflow remains the only safe resume path; `.env.test`, a default Store, credential files, Store values, and secret-bearing artifacts remain prohibited.

### Finding-To-Coverage Decisions

| Finding | Durable Decision | Direct Proof Planned / Added | Why This Is Sufficient |
| --- | --- | --- | --- |
| `TCR-001` | Update manifest, harness, tracked declaration, executor, and deterministic harness tests | fixed ID-to-mode registry; reject unknown/mismatched ID/mode before backend health/status or provisioning; direct-secret methods reject gateway execution; declared `openai.agent-flow` requires model plus `agent-turn`; normal `AutoByteusAgentRunBackendFactory -> LLMProvisioningService -> Store-backed management -> provider -> assistant event` flow returns only an opaque value-free summary | Removes the fail-only branch while preserving the approved `REAL_GATEWAY` intent and normal product agent spine. Fake-backend execution coverage proves dispatch/completion/cleanup deterministically; capability-available real execution remains correctly conditional on the dedicated Store. |
| `TCR-002` | Update the canonical root runner and shared scanner boundary; add deterministic process and artifact controls | runner uses pipe capture instead of inherited stdio; stdout/stderr are scanned before release; an owned evidence directory is recursively scanned; structured provider/SDK results and events are scanned in-test; exact/encoded canary and structural failures expose only stable codes; clean, stdout-leak, and artifact-leak controls use the same capture function as the canonical runner | Makes future `pnpm test:e2e:real` fail closed on captured evidence without echoing a raw hit and without inspecting any real credential value. |

### Durable Coverage Changes In Round 4

| Path | Round 4 Decision / Change |
| --- | --- |
| `test-support/live-e2e/live-e2e-manifest.ts` | Updated: authoritative scenario-mode registry, deterministic mismatch/unknown rejection, and declared gateway capability requirements. |
| `test-support/live-e2e/live-e2e-harness.ts` | Updated: mode enforcement at preflight/execution/direct-secret boundaries and a normal product AutoByteus agent-flow gateway with owned workspace/memory and value-free result. |
| `test-support/live-e2e/live-e2e-evidence-scanner.ts` | Updated: typed TypeScript entry reuses the canonical runtime scanner. |
| `test-support/live-e2e/live-e2e-evidence-scanner.mjs` | Added: canonical scanner plus captured-process stdout/stderr/artifact enforcement. |
| `test-support/live-e2e/live-e2e-evidence-scanner.d.mts` | Added: strict TypeScript contract for the shared runtime module. |
| `test-support/live-e2e/run-live-e2e.mjs` | Updated: allowlisted non-credential child environment, captured output, owned evidence directory, scan-before-release, stable failure codes, cleanup. |
| `test-config/live-e2e.json` | Updated: `openai.agent-flow` remains `REAL_GATEWAY` and now declares `gpt-4o-mini` plus `agent-turn`; no secret value is present. |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Updated: mode-first dispatch, executable gateway branch, and structured result/event scanning for LLM/search/audio/image/Claude/AutoByteus paths. |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` | Updated: deterministic mismatch, missing capability, gateway execution/cleanup, capture clean control, stdout leak, and artifact leak coverage. |

All other cumulative durable additions/updates and the eight valid stale multimedia removals remain unchanged and preserved.

### Round 4 Execution Results

| Command / Mode | Result | Evidence |
| --- | --- | --- |
| focused harness + Local Store + assembled GraphQL + restart + default-skipped real-provider file | Pass: 4 files passed, 1 skipped; 24/24 tests | `execution-evidence/43-round4-tcr-focused-rerun.log` |
| `pnpm test:e2e:real:preflight` through the new capture/artifact runner | Pass: 11/11; every tracked scenario exactly `UNAVAILABLE / SECRET_BACKEND_UNAVAILABLE` | `execution-evidence/44-round4-captured-real-preflight.log` |
| scanner/runner `node --check`, `git diff --check`, source invariants, evidence scan, temp-directory cleanup check | Pass: no inherited stdio, no old fail-only branch, 15 structured scan call sites, zero synthetic-canary/secret-assignment/provider-operation-failure hits, 11 unavailable rows, zero owned evidence directories left | `execution-evidence/45-round4-tcr-summary-scan.log` |

The 24-test focused result includes: 10 harness/runner tests, 11 Local Store lifecycle/fault tests, 2 assembled GraphQL lifecycle tests, and the 1 built two-process restart regression. The real-provider file is intentionally skipped in the ordinary focused command and then executed separately in preflight mode through the canonical root runner.

### Broader-Validation And Confidence Decision

- Round 4 broader-validation decision: `Not Required` for another Docker or browser run. The round changes only durable test support/coverage; no implementation, UI, shell, GraphQL, Store, Docker, or lifecycle production boundary changed. Round 3 clean Docker persistence and Round 1 actual-browser Settings evidence remain directly applicable.
- Targeted real-E2E runner validation: required and completed through the canonical captured preflight plus deterministic clean/leak controls. Full external invocation remains unavailable because the dedicated Store reports `SECRET_BACKEND_UNAVAILABLE`; it is not claimed as passed.
- Final cumulative confidence: **97.1%** (simple average).

| Confidence Category | Final | Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 95% | cumulative requirement matrix, browser, Store/GraphQL, migration, restart, Docker, and corrected real-E2E contract | real external calls remain capability-unavailable and unclaimed |
| Changed-boundary execution directness | 98% | real Store/GraphQL/process/container boundaries plus direct harness/runner enforcement | no configured production external target |
| Cross-boundary integration realism and mock gap | 98% | cumulative browser/process/Docker chain and canonical real-E2E runner | external endpoint invocation conditional on Store capability |
| Environment/configuration/identity/fixture fidelity | 98% | clean Docker/runtime evidence and allowlisted real-E2E child environment with fixed read-only target | other OS/container architectures not executed |
| Failure/edge/lifecycle/recovery evidence | 98% | Store fault/contention/reset, restart/removal, mode mismatch, capture and artifact negative controls | none material for local single-node scope |
| User-surface/browser/desktop-shell confidence | 95% | retained actual-browser Settings and focused Electron evidence | packaged desktop remains unnecessary |
| Durable regression coverage quality/relevance | 98% | TCR-001/TCR-002 controls now enforce the declared gateway and evidence boundary; cumulative stale removals remain valid | Docker lifecycle remains temporary executable evidence |

### Round 4 Safety, Scope, And Routing

- No `.env.test`, default Store, credential file, Store value, real credential, or secret-bearing artifact was read, copied, imported, inspected, or logged.
- The canonical child environment copies only an operational allowlist and does not forward ambient provider credential variables or `DATABASE_URL`.
- Owned process-evidence directories are deleted in the runner `finally`; the final residue count is zero. No service, browser, container, volume, or external account was created in Round 4.
- Claims remain `LOCAL_HARDENED`; `STRONG_AGENT_ISOLATION` remains deferred.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency only. Delivery must recheck the four official Anthropic sources recorded in the package. This is not legal clearance or an authentication-mode redesign; no Claude mode changed.
- Round 4 result: **Pass**. `TCR-001` and `TCR-002` are corrected and require another proportional durable-test review by `code_reviewer` before delivery.

---

## Round 5 Vertex Express Capability Alignment — Initial Investigation

- Trigger: the user/operator confirmed that established Gemini real-E2E testing uses a Vertex Express API key, not an AI Studio API key.
- Existing validity decision: the two tracked Gemini declarations in `test-config/live-e2e.json` are `Needs Update`. They currently select `AI_STUDIO` and require `provider.gemini.ai-studio-api-key`, so provisioning the operator's Vertex Express credential under its correct logical definition would not make those scenarios runnable.
- Approved behavior basis: `credential-consumer-mapping.md` and the secret catalog already define `VERTEX_EXPRESS`, environment alias `VERTEX_AI_API_KEY`, and logical definition `provider.google.vertex-express-api-key`. This is an API/E2E capability-alignment correction, not a new product requirement or authentication-mode redesign.
- Planned durable change: for `gemini.audio` and `gemini.image`, retain the existing scenario IDs/models/capability intent while changing only `googleSetupMode` to `VERTEX_EXPRESS` and `requiredSecrets` to `provider.google.vertex-express-api-key`.
- Planned evidence: manifest/harness deterministic tests, canonical value-free preflight, source/diff/evidence scan, and exact operator provisioning instruction. No provider invocation will run until the operator confirms provisioning; no credential value will be read or exposed.
- Initial execution finding: after the operator created the dedicated Store and provisioned OpenAI, the first canonical preflight reached `READY` definition projection but failed all 11 cases with `LIVE_E2E_EVIDENCE_SECRET_FIELD_DETECTED`. The scanner's raw-string regex treated approved logical IDs such as `provider.openai.api-key` inside `configured`/`missing` arrays as though they were secret-bearing field names. This is an API/E2E-owned false positive, not a product or Store failure; no value was emitted. `live-e2e-evidence-scanner.mjs` and its unit coverage are therefore `Needs Update` before preflight is rerun. Evidence: `execution-evidence/47-round5-vertex-express-preflight.log`.
- Real execution finding: after the scanner correction and passing READY preflight, the selected OpenAI real run passed audio and image but failed `openai.llm` and `openai.agent-flow` before provider invocation. Focused code review classified `FR-001` as an API/E2E-owned stale fixture: both scenarios declare `gpt-4o-mini`, which is absent from the current product registry, while exact identifier rejection is correct production behavior. Required local fix: align both declarations and deterministic gateway fixtures to the current registered low-cost OpenAI identifier `gpt-5.4-mini`, add a no-secret consistency test across every model-backed native declaration and its actual product factory, then rerun all four OpenAI scenarios through the canonical scanner. Evidence: `execution-evidence/49-round5-real-openai.log` and `code-review-report.md` Round 10.

### Round 5 Coverage Decisions And FR-001 Resolution

| Path / Scenario | Decision | Round 5 Action And Basis |
| --- | --- | --- |
| `test-config/live-e2e.json` Gemini audio/image declarations | Needs Update -> Updated | Both scenarios now select the already-supported `VERTEX_EXPRESS` mode and `provider.google.vertex-express-api-key`, matching the operator's established real-E2E setup and the reviewed credential mapping. Models and capability intent are unchanged. |
| `LiveE2eEvidenceScanner.assertStructurallyValueFree` | Needs Update -> Updated | The prior regex conflated approved logical IDs ending in `api-key` with secret-bearing field assignments. The corrected matcher remains strict for assigned `apiKey`, `api-key`, `authorization`, `credentialValue`, and `secretValue` fields/headers while accepting logical IDs in `configured`/`missing` arrays. Seeded negative and clean controls cover the same boundary. |
| `openai.llm` and `openai.agent-flow` model declarations | Stale Fixture -> Updated | `gpt-4o-mini` was not a registered product identifier. Both native real-E2E declarations and their deterministic gateway fixtures now use registered `gpt-5.4-mini`; no production alias or fallback was added. |
| Native real-E2E model registry consistency | Add Durable Coverage -> Added | The tracked manifest test now loads the canonical file and validates every model-backed native LLM/audio/image declaration through its actual product factory without opening a Store or resolving a secret. This deterministically prevents stale manifest models from reaching a live run. |
| `openai.llm`, `openai.agent-flow`, `openai.audio`, `openai.image` | Re-execute Real Boundary -> Passed | The operator-provisioned dedicated Store reported `READY` and `CONFIGURED` for the approved OpenAI definition. The canonical captured/scanned runner executed all four real product boundaries; 8/8 preflight+execution tests passed. |
| Gemini Vertex Express, Serper, Anthropic, AutoByteus real calls | Capability-Conditional / Not Executed | Canonical preflight reported the Store backend `READY` but the exact tracked definitions `MISSING`. No invocation is claimed. |
| Renewed `.env`/`.env.test` importer request | Separate Design Impact | Not combined with FR-001 or API/E2E durable changes. It remains with `solution_designer` for revised requirements/design and architecture approval before any importer/parser/source-file-access implementation. |

### Round 5 Commands And Evidence

| Order | Exact Command / Mode | Result | Evidence |
| --- | --- | --- | --- |
| 1 | focused live-E2E harness unit plus default-skipped real-provider suite | Pass: 10/10 focused tests; default real-provider file skipped | `execution-evidence/46-round5-vertex-express-focused.log` |
| 2 | `pnpm test:e2e:real:preflight` before scanner correction | Expected local failure: 11 structural false positives on approved logical IDs; no value emitted | `execution-evidence/47-round5-vertex-express-preflight.log` |
| 3 | `pnpm test:e2e:real:preflight` after scanner correction | Pass: 11/11; backend `READY`; OpenAI configured; exact other definitions missing | `execution-evidence/48-round5-vertex-express-preflight-rerun.log` |
| 4 | `pnpm test:e2e:real -- --scenarios=openai.llm,openai.agent-flow,openai.audio,openai.image` with stale model declarations | Fail: audio/image passed; LLM/agent failed before provider construction, classified `FR-001` by focused code review | `execution-evidence/49-round5-real-openai.log`, `code-review-report.md` |
| 5 | focused canonical-manifest registry and scanner controls after FR-001 correction | Pass: 11/11 | `execution-evidence/50-round5-fr001-registry-fix.log` |
| 6 | `pnpm test:e2e:real -- --scenarios=openai.llm,openai.agent-flow,openai.audio,openai.image` | Pass: 8/8; real LLM 1.118s, gateway agent flow 1.495s, audio 2.020s, image 17.642s | `execution-evidence/51-round5-real-openai-rerun.log` |
| 7 | source/result/residue aggregation plus `git diff --check` | Pass: stale LLM refs 0; four real scenario success refs; evidence failure/leak codes 0; owned temp/evidence dirs 0 | `execution-evidence/52-round5-summary-scan.log` |

The focused registry test initializes the product LLM registry, so it made the unchanged local Ollama/LM Studio discovery probes. Ollama was unavailable and LM Studio discovery completed; the product factory still resolved both tracked OpenAI declarations exactly, and the test passed. This is not a credential or external-provider failure.

### Round 5 Confidence And Broader-Validation Decision

Final cumulative confidence is **98.0%** (simple average):

| Category | Final | Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 97% | cumulative Store/API/browser/process/Docker evidence plus real OpenAI LLM/agent/audio/image execution | unconfigured Gemini Vertex, Serper, Anthropic, and AutoByteus targets remain uninvoked |
| Changed-boundary execution directness | 99% | canonical read-only Store target and actual product factories/providers/gateway | no real request for missing capabilities |
| Cross-boundary integration realism and mock gap | 99% | real Store status -> JIT secret resolution -> provider SDK/product gateway -> scanned result | multi-node/Kubernetes remains excluded |
| Environment/configuration/identity/fixture fidelity | 99% | dedicated user-provisioned Store, exact definition IDs, canonical runner/env allowlist, current registered model | other OS/architectures not repeated |
| Failure/edge/lifecycle/recovery evidence | 98% | cumulative fault/restart/removal evidence plus scanner false-positive and stale-fixture failure/recovery | none material for configured OpenAI path |
| User-surface/browser/desktop-shell confidence | 95% | retained actual browser Settings journey and focused Electron evidence | packaged desktop remains unnecessary for test-support/model fixture corrections |
| Durable regression coverage quality/relevance | 99% | mode, capture, scanner, Store, GraphQL, restart, and canonical manifest/product-registry consistency | external service availability can still change independently |

- Default 95% clean target met: Yes.
- Applicable category below 90%: No.
- Critical executable failure present: No; `FR-001` is resolved.
- Broader-validation decision: `Required` targeted real-provider validation was completed successfully for every currently configured capability. Repeated Docker/browser/desktop execution was not required because Round 5 changed only API/E2E declarations, scanner logic, and deterministic test fixtures; the earlier production/browser/container evidence remains applicable.
- Final investigation result: **Pass**.

### Round 5 Safety, Cleanup, Scope, And Routing

- The engineering workflow did not read, copy, import, inspect, or log `.env.test`, a default Store, a credential file, a Store value, or a secret-bearing artifact.
- The operator provisioned the dedicated E2E Store independently through the reviewed hidden-input target-only command. API/E2E used status-only preflight and read-only JIT execution; no credential value appeared in released evidence.
- The canonical runner captured and scanned stdout, stderr, structured results, and owned artifacts before release. Round 5 final evidence contains zero provider-operation-failure, leak-detected, or secret-field-detected codes.
- Owned live-E2E workspace/evidence directories were cleaned; zero residue remained. The user-owned dedicated Store was neither modified nor removed by the test run.
- The separate importer request remains a pending Design Impact and was not implemented in this Local Fix.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency only, not legal clearance or an authentication-mode redesign. Delivery must recheck the four official sources; no Claude mode changed.
- Claims remain `LOCAL_HARDENED`; `STRONG_AGENT_ISOLATION` remains deferred.
- Required next recipient: `code_reviewer` for proportional review of the Round 5 durable API/E2E changes.

---

## Round 6 Importer / Byte-Identical Restart / Dependency Re-investigation

### Trigger And Reviewed Basis

- Implementation HEAD: `5b3c1b58c8e5d98247c0986ec5d63815ebd376fc`.
- Round-14 full implementation-source review: Pass, 93.8/100; `CR-012` and `CR-015` resolved.
- Newly approved/implemented boundaries: explicit operator-only assignment-file importer (`BEH-014`, `REQ-020`, `AC-020`), byte-identical application `.env` startup/non-authority (`BEH-008`, `REQ-014`, `AC-009`), and exact clean `repository_prisma@1.0.8` dependency replacement (`BEH-015`, `REQ-021`, `AC-021`).
- Required retained boundaries: `SCSP-E2E-RESTART-001`, `SCSP-E2E-DOCKER-001`, Local Store/GraphQL lifecycle, canonical captured/scanned real-provider execution, and all prior Round 5 durable changes.
- The explicit importer is operator-invoked only. API/E2E will not read the user's `.env.test`, default Store values, E2E Store values, or another credential artifact. Importer execution coverage uses synthetic private temporary sources/Stores; real-provider execution uses only status and JIT resolution through the reviewed read-only harness.

### Changed Surface And Boundary Classification

| Surface | Classification | Required Evidence |
| --- | --- | --- |
| assignment-file source reader | local security/trust/parser boundary | strict grammar, allowlist, ownership/mode, race, encoding/size, release, source immutability |
| import planner/executor | local state transition and transactional boundary | value-free plan, target isolation, absent-pair initialization only after confirmation, no-overwrite, overwrite, exact health, cancellation/non-TTY non-mutation, precondition race, rollback |
| application `.env` projection | startup/configuration and legacy non-authority | mapped complete assignments excluded before generic parse; bytes unchanged; approved non-secret settings retained |
| restart regression | process lifecycle/persisted-data boundary | both sanitized processes derive the same SQLite path in runtime without parent/persisted `DATABASE_URL`; `.env` remains byte-identical; Store reopen/remove succeeds |
| `repository_prisma` | installed dependency/import/logging boundary | canonical frozen install, exact 1.0.8, no old resolution/patch/nested lock, empty-cwd/empty-base ESM/CJS behavior, no production adoption |
| Docker | clean build/container/volume lifecycle | no injected database URL; migrations/listen/save/restart/reopen/remove on one named volume |
| real providers | external integration | run every currently configured scenario via canonical captured/scanned Store-backed runner; report exact missing definitions without pass claims |

### Existing Coverage Validity Decisions

| Path / Scenario | Decision | Round 6 Rationale / Action |
| --- | --- | --- |
| `tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts` | Needs Update | Its `DATABASE_URL` persistence assertion contradicts approved byte-identical startup. Replace only that assertion with byte equality across both starts and direct existence of the deterministic data-root SQLite file; keep sanitized environment, migrations/listen, CONFIGURED reopen, removal, and failure scans. |
| `tests/unit/secret-management/local-environment-source-reader.test.ts` | Still Valid | Direct synthetic coverage of arbitrary filename, full alias map, trust/encoding/size/symlink/race rejection, Windows ACL fail-closed, and buffer release. |
| `tests/unit/secret-management/local-legacy-environment-import-service.test.ts` | Still Valid | Direct temporary-Store coverage of value-free planning, target isolation, source bytes, skip/overwrite, target-specific confirmation, non-TTY/cancel byte identity, exact health, concurrency precondition, and atomic rollback. |
| `tests/unit/secret-management/import-local-environment-secrets-cli.test.ts` | Still Valid | Closed argument grammar, canonical target mapping, and value-free formatter coverage; actual canonical target mutation is intentionally not used as an automated fixture. |
| `tests/unit/secret-management/legacy-source-non-authority.test.ts` | Still Valid | Direct complete-assignment masking, AppConfig retained-state, source-byte preservation, and custom-provider non-authority. |
| `tests/unit/config/app-config.test.ts` | Still Valid | Runtime-derived and explicitly configured SQLite URLs remain private AppConfig state and are not parent-environment injection. |
| `tests/unit/logging/prisma-query-log-policy.test.ts` | Still Valid | Exact installed package, import acquisition, dotenv absence, and default/explicit logging behavior without real DB access. |
| clean `pnpm install --frozen-lockfile` in disposable archive/workspace | Use Temporary Executable Probe | Required independent canonical-lock proof without mutating or relying on the working installation. |
| `SCSP-E2E-RESTART-001` | Update And Re-execute | Directly prove byte-identical `.env` plus two-process reopen under no parent `DATABASE_URL`. |
| `SCSP-E2E-DOCKER-001` | Re-execute | Required clean local-source build and same named-volume persistence after the new AppConfig/importer/package work. |
| canonical real-provider preflight/full run | Re-execute Available Capabilities | Run only capabilities that status projects as configured; unavailable definitions remain exact, value-free non-pass outcomes. |
| Round 1 browser Settings journey | Carry Forward | Importer is local CLI only and no Settings/renderer/GraphQL provider code changed in the new implementation commits. Repeating browser/desktop execution would not close the importer/restart/package confidence gap. |

### Planned Execution Order

1. Update only the stale downstream-owned restart assertion and run the focused restart test first after the production build.
2. Run importer source-reader/service/CLI, AppConfig/non-authority, Local Store, and evidence-scanner focused coverage from narrowest scope.
3. Independently verify canonical frozen installation and exact installed `repository_prisma@1.0.8` package/lock policy without accessing any operational database.
4. Run the built two-process restart lifecycle with no parent `DATABASE_URL`.
5. Run the documented clean-source Docker project lifecycle using a unique project name and owned volumes; save only a synthetic canary, restart the same container/volume, reopen value-free, remove, and clean all owned resources.
6. Run the canonical value-free real-provider preflight, then every scenario whose required definitions are configured. Do not provision from or inspect a credential file in this stage.
7. Capture commands/results in new Round 6 evidence, scan released logs/artifacts with value-free structural/canary checks, verify cleanup, calculate confidence, and route Pass/Fail by prescribed workflow.

### Initial Broader-Validation Decision

`Required`. Process restart, clean Docker construction, same-volume persistence, and configured external-provider execution cross boundaries that focused unit tests cannot prove. Actual browser/desktop execution is `Not Required` for this round because the changed surfaces are a local CLI, server configuration projection, and dependency/package behavior; prior browser evidence remains applicable and no user-facing renderer/source changed.

### Round 6 Repository Results And Critical Failure

| Order | Command / Mode | Result | Evidence |
| --- | --- | --- | --- |
| 1 | focused importer/AppConfig/non-authority/Local Store/package-policy/evidence-scanner Vitest group | Pass: 8 files / 126 tests | `execution-evidence/53-round6-importer-appconfig-policy.log` |
| 2 | clean `git archive HEAD` workspace; empty-base operational environment; `pnpm install --frozen-lockfile`; installed artifact hash/policy and residue scan; disposable workspace removal | Pass: exact unpatched 1.0.8; reviewed hashes match; no dotenv dependency, nested lock, patch, or 1.0.6/1.0.7 tracked package/lock residue | `execution-evidence/54-round6-clean-frozen-install.log` |
| 3 | `pnpm --filter autobyteus-server-ts build` | Pass: production server/shared builds, Prisma generation, built-in bootstrap smoke, sanitized no-`DATABASE_URL` smoke | `execution-evidence/55-round6-server-build.log` |
| 4 | `pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts --no-watch` | **Fail: 0/1** at first-start application `.env` byte-equality assertion | `execution-evidence/56-round6-server-restart.log` |
| 5 | focused source/history/residue classification and `git diff --check` | Pass as evidence collection; identifies automatic built-in-agent setting persistence path; owned temp residue zero | `execution-evidence/57-round6-restart-failure-origin.log` |

The importer matrix directly passed value-free planning, exact target health, absent-pair dry-run without initialization, selected-target-only creation, source immutability, no-overwrite skip, explicit overwrite, target-specific confirmation, non-TTY and cancellation non-mutation including byte/journal/sidecar equality, precondition race handling, and whole-batch rollback. Source-reader tests passed strict allowlist/grammar, arbitrary filename, trust/mode/owner, symlink/race, size/encoding/NUL, Windows ACL fail-closed, and buffer release. AppConfig/non-authority tests passed complete assignment masking and byte-preserving projection. The installed-package suite passed empty-cwd/empty-base ESM/CJS acquisition/log policy.

`SCSP-E2E-RESTART-001` then exposed a distinct full-start behavior that the narrower projection tests do not exercise. The sanitized first process successfully derived/used its SQLite URL, ran migrations, listened, saved a synthetic managed definition, and returned value-free `CONFIGURED`. On clean stop, however, the application `.env` had gained `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`. The failing evidence contains no synthetic secret canary, P1012, or missing-`DATABASE_URL` failure.

Focused source tracing shows the full startup built-in-agent bootstrap calls `settings.updateSetting(settingDefault.key, definition.id)` when the default is absent; `ServerSettingsService.updateSetting` delegates to persistent `AppConfig.set`, which calls `updateEnvFile`. The bootstrapper/registry have zero Round-10-to-current diff, so the new approved byte-identical-startup requirement exposed a pre-existing automatic non-secret write that was not reconciled by the implementation. Adding the setting to the test fixture would mask, not prove, the approved behavior. The API/E2E test therefore remains aligned to the clear requirement.

### Round 6 Failure Classification And Gate

| Failure | Affected Requirement / Criterion | Expected | Observed | Preliminary Classification | Required Recipient |
| --- | --- | --- | --- | --- | --- |
| `SCSP-E2E-RESTART-001` | BEH-008; REQ-014; AC-009; DS-UC015 | full server startup leaves application `.env` byte-identical while deriving database state only in AppConfig runtime state | first start appends a built-in-agent default setting through persistent server settings | likely implementation-owned source defect crossing the approved startup/configuration boundary; focused origin review required | `code_reviewer` |

Docker and real-provider execution were not continued after this critical requirement failure. Their prior evidence remains historical only; no Round 6 Docker or external-provider Pass is claimed.

Post-repository/failure confidence is **85.9%** (simple average):

| Category | Score | Evidence / Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 75% | importer/package behavior is strong, but critical byte-identical full-start behavior fails |
| Changed-boundary execution directness | 98% | temporary files/Stores, actual package install, production build, and built server process directly exercised |
| Cross-boundary integration realism and mock gap | 90% | full server exposed the failure; Docker/real matrix intentionally stopped afterward |
| Environment/configuration/identity/fixture fidelity | 98% | private synthetic sources/Stores, clean archive install, sanitized process with no parent DB URL |
| Failure/edge/lifecycle/recovery evidence | 50% | the required restart lifecycle cannot pass the first-start persistence invariant |
| User-surface/browser/desktop-shell confidence | 95% | prior browser evidence remains valid; no current UI source changed |
| Durable regression coverage quality/relevance | 95% | the corrected restart assertion caught the full-start defect; importer/package tests are direct and maintained |

- Clean 95% target met: No.
- Applicable category below 90%: Yes, requirement proof and lifecycle/recovery.
- Critical failure present: Yes, `SCSP-E2E-RESTART-001`.
- Broader-validation decision: `Required`, started, and stopped on a reproducible implementation-behavior failure. This is `Fail`, not `Blocked`.
- Cleanup: focused tests removed temporary sources/Stores; clean-install archive was removed; restart test removed its data directory and server process. Residue checks returned zero.
- Safety: no real credential source, `.env.test`, default/E2E Store value, credential file, operational database query, or secret-bearing artifact was read or logged. Only synthetic temporary sources/Stores and value-free status were used.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck only; both Claude modes remain unchanged. Claims remain `LOCAL_HARDENED`; `STRONG_AGENT_ISOLATION` remains deferred.

---

## Round 7 CR-016 Rework Re-investigation

### Trigger And Required Recheck

- Implementation HEAD: `977948fe68695374afbcd5e9516693d64533230e`.
- Round-16 implementation-source review: Pass, 94.2/100; `CR-016` resolved through a narrow process-local `initializeRuntimeDefault` boundary owned by `ServerSettingsService`.
- Mandatory first recheck: `SCSP-E2E-RESTART-001` using the already reconciled byte-identical application `.env` fixture, with new direct GraphQL proof that the retrospective-skill-improver runtime default is effective on both sanitized processes.
- If restart passes: rerun clean-source Docker same-volume save/restart/reopen/remove, the focused importer/AppConfig/package matrix, canonical preflight, and every configured real-provider scenario.

### Existing Coverage Decisions

| Path / Scenario | Decision | Round 7 Action |
| --- | --- | --- |
| `server-restart-secret-lifecycle.e2e.test.ts` | Needs Bounded Update | Preserve the Round 6 byte-equality and deterministic SQLite assertions; add `getServerSettings` queries after each process starts and require the built-in runtime default key/value. This proves runtime availability without adding the setting to the fixture or reading process state. |
| CR-016 focused unit/GraphQL tests | Still Valid | Rerun adjacent built-in bootstrap, ServerSettings, GraphQL, AppConfig, and non-authority coverage within the importer matrix. |
| importer/source-reader/package-policy tests | Still Valid | Rerun after restart passes; no current validity change. |
| `SCSP-E2E-DOCKER-001` | Recheck After Restart | Clean local-source image; no injected DB URL; same named volume through synthetic save/restart/value-free reopen/remove. |
| canonical real-E2E harness | Recheck Available Capabilities | Run status-only preflight, then full execution for every scenario whose definitions are configured. Missing capabilities remain exact non-pass outcomes. |
| prior browser Settings evidence | Carry Forward | CR-016 changes server runtime-default ownership, not renderer or credential Settings behavior. GraphQL observation in the restart run closes the changed user-visible settings-read boundary. |

### Round 7 Broader-Validation Decision

`Required`. Two-process, Docker-volume, and configured external-provider execution remain necessary. Actual browser/desktop execution is not required unless GraphQL/user-state evidence exposes a browser-specific gap; no renderer or Electron source changed.


### Round 7 Execution Results And Coverage Update

| Order | Exact Command / Mode | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm --filter autobyteus-server-ts build` | Pass: shared/core builds, Prisma generation, production server TypeScript, built-in-agent bootstrap smoke, and sanitized built-module/bootstrap smoke without `DATABASE_URL` | `execution-evidence/58-round7-server-build.log` |
| 2 | `pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts --no-watch` | Pass, 1/1: two sanitized processes, byte-identical application `.env`, deterministic SQLite, migrations/listen, runtime default visible on both processes, Store `CONFIGURED` reopen, removal | `execution-evidence/59-round7-server-restart.log` |
| 3 | focused CR-016/importer/AppConfig/source-reader/Store/package-policy/harness/GraphQL matrix | Pass, 13 files / 192 tests | `execution-evidence/60-round7-focused-importer-runtime-package.log` |
| 4 | documented `docker-start.sh ... --build-local` under a credential/DB-URL-sanitized parent | Docker Hub frontend resolution stalled; bounded pull retry timed out. A transparent recovery used the Docker built-in frontend with a temporary Dockerfile whose body hash exactly matched the tracked body after omitting only `# syntax=docker/dockerfile:1`; clean source build completed and produced `autobyteus-server:latest` | `execution-evidence/61-round7-docker-build-up.log` |
| 5 | `pnpm test:e2e:real:preflight` | Pass, 11/11; backend `READY`; four OpenAI scenarios configured; exact other definitions missing | `execution-evidence/62-round7-real-preflight.log` |
| 6 | `pnpm test:e2e:real -- --scenarios=openai.llm,openai.agent-flow,openai.audio,openai.image` | Pass, 8/8: real LLM, normal product gateway agent flow, audio, and image | `execution-evidence/63-round7-real-openai.log` |
| 7 | sanitized `docker-start.sh up -p scsp-round7 --no-build` using the clean local image | Compose resources created and the container launched, but the service entered a restart loop before server startup | `execution-evidence/64-round7-docker-runtime.log`, `65-round7-docker-runtime-failure.log` |
| 8 | project-scoped Docker teardown with volumes/state deletion | Pass; zero owned containers, networks, volumes, runtime state, or temporary scripts remain | `execution-evidence/66-round7-cleanup.log` |
| 9 | `pnpm install --frozen-lockfile --offline`, selected installed-package check, `git diff --check`, canonical evidence scan, and residue scan | Pass; lock current, selected `repository_prisma` 1.0.8, package/lock unchanged from Round 14, nine evidence files clean, zero owned Docker residue | `execution-evidence/67-round7-summary-scan.log` |

The Round 7 restart test is now `Still Valid` and directly closes `CR-016`: application `.env` remains byte-identical across both full starts, while the runtime-only retrospective-skill-improver default is visible through ordinary GraphQL Settings reads on both processes. The same test independently proves migrations/listen, value-free Store reopen, and removal without a parent or persisted `DATABASE_URL`.

The importer/AppConfig/package group remains `Still Valid`: 13 files / 192 tests cover source trust and grammar, value-free planning, default/E2E target isolation, dry-run/non-TTY/cancellation non-mutation, source immutability, atomic rollback, Local Store lifecycle, legacy-source non-authority, CR-016 runtime Settings/GraphQL behavior, exact installed-package policy, and canonical live-E2E harness consistency. A current offline frozen install selected `repository_prisma` 1.0.8; package/lock files have no Round-14-to-current diff.

### New Critical Finding: SCSP-E2E-DOCKER-001

- Requirement / criterion: `BEH-006`, `BEH-007`, `REQ-012`, `REQ-013`, `AC-002`.
- Expected: a clean local-source image starts through the unchanged Compose topology, runs migrations, listens, persists its Local Store on the named data volume, restarts, reopens `CONFIGURED`, and removes the synthetic definition without an injected database URL.
- Observed: the clean image built, Compose created the expected project/volumes, and the entrypoint handed off to `/usr/bin/supervisord`. The container then crash-looped before migrations or listen. Python 3.13.14 loaded `supervisor==4.2.1`/`pkg_resources`, which referenced removed `pkgutil.ImpImporter` and terminated with exit 1.
- Direct origin probe: the current `autobyteus/chrome-vnc:latest@sha256:a8c171...` base image fails the standalone command `python3 --version; /usr/bin/supervisord --version` with the same traceback. Round 3 had passed against the earlier base digest `sha256:f5a12a...`. There is no Docker/Compose source delta from reviewed base `534210b9...` to current HEAD.
- Negative evidence: zero migration, listen, `P1012`, missing-`DATABASE_URL`, or synthetic-canary records. The backend never listened, so no GraphQL credential mutation ran.
- Validity decision: the required Docker lifecycle is `Fail`, not `Blocked` and not passed by older evidence. The current documented clean-build/start contract is broken by a floating runtime-base dependency; focused failure-origin review must decide the owner and whether packaging should pin/repair the base or the external base must be corrected.

### Round 7 Capability Truth Table

| Capability | Preflight | Round 7 Invocation | Claim |
| --- | --- | --- | --- |
| OpenAI LLM | `READY / CONFIGURED` | Pass, 2.356s | real registered-model LLM passed |
| OpenAI gateway agent flow | `READY / CONFIGURED` | Pass, 1.123s | normal product agent turn and cleanup passed |
| OpenAI audio | `READY / CONFIGURED` | Pass, 1.883s | real audio passed |
| OpenAI image | `READY / CONFIGURED` | Pass, 16.953s | real image passed |
| Serper search | `READY / MISSING search.serper.api-key` | Not run | unavailable, not passed |
| Gemini Vertex Express audio/image | `READY / MISSING provider.google.vertex-express-api-key` | Not run | unavailable, not passed |
| Anthropic managed-secret Claude SDK | `READY / MISSING provider.anthropic.api-key` | Not run | unavailable, not passed |
| AutoByteus remote LLM/audio/image | `READY / MISSING provider.autobyteus.api-key` | Not run | unavailable, not passed |

### Round 7 Confidence And Routing

| Category | Score | Evidence / Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 78% | restart/importer/package/configured-provider criteria pass; critical `AC-002` Docker lifecycle fails |
| Changed-boundary execution directness | 99% | built process, actual files/Stores, clean image, real provider boundaries, and direct failing base probe |
| Cross-boundary integration realism and mock gap | 75% | container/entrypoint/base boundary is direct, but server/GraphQL/Store-volume stages never become reachable |
| Environment/configuration/identity/fixture fidelity | 97% | sanitized parent, no injected DB URL, current runtime-base digest, isolated project, exact Store statuses; frontend recovery was transparently bounded |
| Failure/edge/lifecycle/recovery evidence | 70% | host restart/reopen/removal passes; Docker restart/persistence/removal cannot run because first start crash-loops |
| User-surface/browser/desktop-shell confidence | 95% | prior actual-browser Settings journey remains applicable; no renderer/Electron change in CR-016 |
| Durable regression coverage quality/relevance | 98% | runtime-default/restart and cumulative importer/harness tests are direct and current; Docker remains executable temporary coverage |

Overall confidence: **87.4%** (simple average). The clean 95% target is not met; one critical deployment acceptance path fails.

Broader-validation decision: `Required`, executed. Host restart, importer/package, and all configured real-provider paths passed. Docker execution found a reproducible current-runtime failure, so the overall result is **Fail** and requires focused origin review by `code_reviewer`.

Safety and cleanup:
- No real `.env.test`, assignment source, default Store, Store value, credential file, or secret-bearing artifact was read, copied, imported, inspected, or logged.
- The user-owned real-E2E Store was opened only through the reviewed read-only harness and intentionally retained.
- The canonical scanner passed all nine Round 7 evidence files. No synthetic canary appeared in released evidence.
- The owned `scsp-round7` container, network, four volumes, runtime state, and temporary script/Dockerfile were removed. The shared local image alias was retained because it pre-existed and was not exclusively owned by this run.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck dependency only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged. Claims remain `LOCAL_HARDENED`; `STRONG_AGENT_ISOLATION` remains deferred.

## Latest Authoritative Result (Round 7)

- Result: **Fail**.
- Failing scenario: `SCSP-E2E-DOCKER-001` before migrations/listen.
- Passing critical recheck: `SCSP-E2E-RESTART-001`, including byte-identical `.env` and runtime default on both processes.
- Importer/AppConfig/Store/package/harness/GraphQL result: Pass, 13 files / 192 tests; frozen offline install selected exact 1.0.8.
- Configured real-provider result: OpenAI LLM, gateway agent flow, audio, and image passed 8/8 through the canonical captured/scanned runner.
- Unavailable provider result: exact missing definitions recorded; no pass claimed.
- Final confidence: **87.4%**.
- Required next recipient: `code_reviewer` for focused failure-origin analysis and owner classification; proportional durable-test review does not resume on this Fail.


---

## Round 8 Stale Mutable-Tag Environment Local Fix Re-investigation

### Trigger And Validity Decision

- Implementation HEAD remains `977948fe68695374afbcd5e9516693d64533230e`; no implementation-source rereview is required.
- Focused review withdrew `CR-017` as a package-source finding. Round 7 had selected a stale local `autobyteus/chrome-vnc:latest` digest (`a8c171...`) even though the refreshed registry/current local identity resolves to the known-good `f5a12a...` digest.
- `SCSP-E2E-DOCKER-001` remains a valid required scenario. Its Round 7 failure is classified as API/E2E-owned environment/setup state and must be rerun through the exact tracked path rather than concealed by source or package changes.
- Dockerfile, Compose, launcher, entrypoint, build, and release-workflow files are `Still Valid / Must Remain Unchanged`. No temporary Dockerfile, alternate frontend path, database URL, Supervisor repair, dependency override, alternate entrypoint, or older-base pin may be used.

### Round 8 Planned Evidence

1. Record current local and refreshed registry identities for `autobyteus/chrome-vnc:latest` and `latest-zh`, plus direct disposable Python/Supervisor compatibility probes.
2. Record the pre-build derived `autobyteus-server:latest` identity, then run exactly `./autobyteus-server-ts/docker/docker-start.sh up -p scsp-round8 --build-local` under a parent with `DATABASE_URL` and known credential aliases unset.
3. Require the post-build derived image identity to differ from the stale Round 7 image and confirm its runtime base identity through build evidence.
4. Through the normal GraphQL surface, prove readiness and initial value-free `MISSING`, save a synthetic AutoByteus definition to `CONFIGURED`, restart the same container on the same named data volume, reopen value-free `CONFIGURED`, remove to `MISSING`, and require migrations/listen without `P1012`, missing `DATABASE_URL`, or canary output.
5. Scan all Round 8 evidence through the canonical evidence scanner and remove only the owned `scsp-round8` container, network, volumes, runtime state, and temporary probe resources.

### Broader-Validation Decision

`Required`. Older Round 3 and failed Round 7 Docker evidence cannot replace the current exact-path rerun. The already-passed Round 7 host restart, importer/AppConfig/package matrix, and configured OpenAI execution remain applicable because the Local Fix changes only Docker engine mutable-tag/cache state, not repository source, host dependencies, or the dedicated E2E Store.

### Round 8 Docker Local-Fix Result

`SCSP-E2E-DOCKER-001` passed through the exact unchanged tracked path at implementation HEAD `977948fe68695374afbcd5e9516693d64533230e`:

- refreshed `autobyteus/chrome-vnc:latest` resolved to `f5a12a4fc553d40158b6d6c5f87e3ea0a2bcfbc71e3cb8153f7a3aa310241029`, and disposable compatibility probes reported Python 3.13.14, Supervisor 4.3.0, and `BASE_RUNTIME_COMPATIBILITY_OK`;
- `./autobyteus-server-ts/docker/docker-start.sh up -p scsp-round8 --build-local` completed without a Dockerfile, Compose, launcher, entrypoint, dependency, or database-URL workaround;
- the server ran migrations and listened, reported initial value-free `MISSING`, saved a synthetic managed definition to `CONFIGURED`, restarted the same container against the same named data volume, reopened value-free `CONFIGURED`, and removed the definition back to `MISSING`;
- the application `.env` hash remained stable, `DATABASE_URL` was absent from it, and evidence contained no `P1012`, missing-database-URL, Supervisor, or synthetic-canary output;
- canonical evidence scanning passed and cleanup left zero owned containers, networks, volumes, runtime state, or temporary scripts.

Evidence: `execution-evidence/68-round8-base-refresh-compatibility.log` through `execution-evidence/72-round8-summary-scan.log`.

### Operator-Selected Current Application `.env` Import Re-investigation

The user explicitly clarified that the supported importer goal includes selecting the current Electron/server application file at `/Users/normy/.autobyteus/server-data/.env` directly, and explicitly authorized inspection of assignment names only while prohibiting inspection or disclosure of their values.

A name-only audit used the importer's exact assignment-name and secret-like-name rules. It emitted no right-hand-side content. The file is now owner-only mode `0600`. The audit found:

- approved mapped aliases present: `AUTOBYTEUS_API_KEY`, `OPENAI_API_KEY`, `KIMI_API_KEY`, `DEEPSEEK_API_KEY`, `GROK_API_KEY`, `SERPAPI_API_KEY`, `VERTEX_AI_API_KEY`, `GEMINI_API_KEY`, `GLM_API_KEY`, and `ANTHROPIC_API_KEY`;
- unsupported secret-like aliases present: `DATABASE_URL`, `QWEN_API_KEY`, `ZHIPU_API_KEY`, `GOOGLE_CSE_API_KEY`, and `OLLAMA_API_KEY`;
- 52 unique assignment names, zero malformed assignment lines, and zero emitted values.

The documented package invocation `pnpm secrets:local:import -- --source <path> --target e2e --dry-run` fails with `IMPORT_OPTIONS_INVALID` because the literal separator reaches the Node CLI. The direct-option form `pnpm secrets:local:import --source <path> --target e2e --dry-run` reaches the source reader but fails value-free with `IMPORT_SOURCE_UNSUPPORTED_SECRET_ALIAS`. Both attempts were non-mutating; the latter was dry-run and fails before any commit.

Evidence:

- `execution-evidence/73-round8-importer-current-env-key-audit.log`
- `execution-evidence/74-round8-importer-current-env-dry-run.log`

### Design-Impact Decision

The existing reviewed importer intentionally rejects the entire source when any unsupported secret-like assignment is present. The user's clarified intended source is a normal current application `.env` that legitimately combines approved provider credentials with database/configuration and other provider-like names. Therefore the current importer cannot satisfy the clarified direct-source user journey even though importable aliases are present. Silently ignoring, newly mapping, or disclosing an unsupported name would alter the reviewed fail-closed contract; this is not an API/E2E-owned local test fix.

Classification: **Design Impact / Requirement Gap**. Route to `solution_designer` to decide the safe policy for mixed application environment files and to reconcile the documented pnpm invocation. Preserve strict allowlisting, target isolation, value-free output, source immutability, atomicity, and the absence of ambient fallback. Round 8 Docker Pass evidence remains valid and separate while importer execution and expanded real-provider reruns pause for the revised reviewed contract.

---

## Round 9 Recognize-First Importer / Full Matrix Re-investigation

### Trigger And Reviewed Basis

- Reviewed implementation HEAD: `4c9f01776347d18bac78805800363f8a92a096af`.
- Round-20 implementation-source review: Pass, 92.9/100, no open source findings.
- Approved importer contract now performs whole-file trust/identity/size/UTF-8/NUL checks, recognizes only the exact positive registry, and validates only selected assignments. Unrelated content has no retained or reported metadata.
- `DASHSCOPE_API_KEY` is the sole Qwen mapping. `QWEN_API_KEY` and legacy `ZHIPU_API_KEY` remain unmapped and non-blocking.
- The root PNPM adapter must accept zero or one leading `--` separator.
- Prior Round 8 Docker Pass remains relevant but the current reviewed HEAD requires an independent applicable lifecycle rerun before final sign-off.

### Changed Surfaces And Boundaries

| Surface | Classification | Required Evidence |
| --- | --- | --- |
| local operator CLI argument adapter | command/API boundary | zero/one separator, closed options, exact target, dry-run and confirmation behavior |
| mixed assignment source reader | file/trust/parser boundary | arbitrary filename; recognize-first; unrelated malformed/bare-CR non-blocking; selected malformed/bare-CR rejected; source immutable; value-free failures |
| positive alias registry | configuration mapping boundary | exact current aliases; sole Qwen mapping; unsupported/legacy names absent and non-blocking |
| import service / Local Store provisioning | persistence/lifecycle boundary | plan, no-overwrite, explicit overwrite, TTY challenge, target isolation, atomic rollback and precondition fencing |
| host restart | process/configuration/persistence boundary | two sanitized starts, byte-identical application `.env`, runtime default, migrations/listen, Store reopen/removal |
| unchanged Docker path | image/process/volume boundary | clean source build, migrations/listen, same-volume save/restart/reopen/remove, cleanup |
| real-provider harness | external integration boundary | preflight, every configured manifest capability, captured/scanned evidence, exact unavailable capabilities |

### Existing Durable Coverage Decisions

| Coverage | Decision | Round 9 Action |
| --- | --- | --- |
| source-reader/import-service/CLI/AppConfig/legacy-source focused suites | Still Valid | Rerun; they directly cover the revised mixed-file contract, zero/one separator, positive registry, mutation and rollback behavior. |
| `server-restart-secret-lifecycle.e2e.test.ts` | Still Valid | Rerun unchanged at the reviewed HEAD. |
| `live-e2e-harness.test.ts` and `real-e2e-provider-capabilities.e2e.test.ts` | Still Valid | Rerun preflight and every capability reported configured after the authorized E2E Store import. |
| Round 8 Docker executable scenario | Recheck Required | Repeat exact unchanged tracked path at current HEAD; no Docker source change or workaround. |
| prior actual-browser Settings journey | Carry Forward | No renderer/Electron source changed; the current change is operator CLI/source selection. Browser rerun would not close a changed-boundary gap. |

No new durable test is planned initially because the production-owned focused suites already express every newly reviewed importer case. Any observed coverage gap will be recorded before a bounded durable change.

### Round 9 Execution Plan And Broader-Validation Decision

1. Run the focused importer/AppConfig/Local Store/package/harness matrix and verify exact installed `repository_prisma@1.0.8`, lock state, and `git diff --check`.
2. Run documented zero- and one-separator dry-runs against the explicitly user-selected owner-private current application `.env`, capturing only value-free plan/result output and comparing source bytes without emitting content.
3. With the user's explicit authorization, run the no-overwrite E2E-target import through a direct TTY and exact `IMPORT REAL-E2E STORE` challenge. Never print, inspect, or copy right-hand-side values.
4. Rerun `SCSP-E2E-RESTART-001` and the exact unchanged clean-source `SCSP-E2E-DOCKER-001` lifecycle.
5. Run canonical real-provider preflight, then every scenario whose required definitions are configured. Capture and scan stdout, stderr, structured results, and owned artifacts; report unavailable definitions exactly.
6. Clean only owned resources, update both canonical reports and confidence, and route Pass/Fail through the prescribed path.

Broader validation: **Required**. The current application-file CLI, real Local Store transition, two-process restart, container-volume lifecycle, and live provider boundaries cannot be replaced by unit tests. Actual browser/desktop execution is **Not Required** because no renderer, preload, IPC, Electron lifecycle, or web-equivalent Settings source changed in this revision; prior actual-browser evidence remains applicable.

### Round 9 Repository And Operator-Source Results

| Order | Command / Mode | Result | Evidence |
| --- | --- | --- | --- |
| 1 | 14-file focused importer/AppConfig/Local Store/runtime-settings/harness/GraphQL/media matrix | Pass: 14 files / 201 tests | `execution-evidence/75-round9-focused-importer-package.log` |
| 2 | current mutable-worktree frozen offline install and package probe | Install passed; the first probe used a stale hardcoded `.pnpm` directory name and failed with `MODULE_NOT_FOUND`. This is a probe-path error, not a package/product failure. | `execution-evidence/75-round9-focused-importer-package.log` |
| 3 | clean `git archive HEAD`; sanitized offline `pnpm install --frozen-lockfile`; selected package/lock/residue policy; owned temp cleanup | Pass: only unpatched `repository_prisma@1.0.8`, no dotenv dependency, no 1.0.6/1.0.7 lock/store entry, no package-local lock | `execution-evidence/76-round9-clean-frozen-install.log` |
| 4 | documented zero-separator current-application `.env` dry-run | **Fail:** `IMPORT_SOURCE_EMPTY_CREDENTIAL` | `execution-evidence/77-round9-current-env-dry-runs.log` |
| 5 | documented one-leading-PNPM-separator current-application `.env` dry-run | **Fail:** `IMPORT_SOURCE_EMPTY_CREDENTIAL`; separator normalization itself succeeded | `execution-evidence/77-round9-current-env-dry-runs.log` |
| 6 | authorized selected-name plus EMPTY/SET state audit, with no right-hand-side output | Pass as diagnosis: ten selected aliases; only `GEMINI_API_KEY` is empty | `execution-evidence/78-round9-selected-alias-presence-audit.log` |
| 7 | canonical scanner over released Round 9 evidence | Pass, four files; no canary or structural secret field | `execution-evidence/79-round9-failure-evidence-scan.log` |

The focused coverage independently confirms the approved recognize-first correction: unrelated assignments/text/malformed lines/bare CR are non-blocking; selected malformed/bare-CR/dynamic/duplicate/empty assignments fail value-free; `DASHSCOPE_API_KEY` is the sole Qwen mapping; `QWEN_API_KEY` and `ZHIPU_API_KEY` remain absent/non-blocking; no ignored metadata exists; and dry-run/no-overwrite/overwrite/TTY/target-isolation/precondition/rollback/source-immutability behavior remains direct and durable.

Both actual operator command forms now reach selected-assignment validation, proving the PNPM separator defect is resolved and unrelated current-file content no longer blocks. The real source nevertheless contains an exact current alias, `GEMINI_API_KEY`, as an empty assignment. The reviewed design requires every selected empty assignment to fail, so no plan is returned and none of the other nine populated selected credentials can be imported. The source remained byte-identical and owner-only `0600`; dry-run caused no Store mutation; no value was inspected or emitted.

### New Requirement Gap: SCSP-E2E-IMPORT-001

- User journey: select the ordinary current application `.env` directly and import the currently usable supported credentials while unrelated/legacy/non-credential content remains outside importer responsibility.
- Approved current rule: exact positive aliases are selected, then every selected empty assignment is fatal.
- Observed real source: one supported alias is present as an empty placeholder while nine other selected aliases are populated.
- Consequence: the complete ordinary-file import journey remains unusable without the operator editing/removing that placeholder first, despite the recognize-first correction.
- Safety: treating an empty selected assignment as absent would be a behavior change; API/E2E cannot silently weaken the reviewed selected-value validation rule.

Classification: **Requirement Gap / Unclear**. `solution_designer` must obtain/record the user decision whether an empty recognized assignment is ignored as absent or remains a whole-import error requiring operator cleanup. Host restart, Docker, Store mutation, and real-provider reruns stop at this critical gate; older passing evidence is retained but is not represented as a Round 9 rerun.

Round 9 confidence before design resolution is **90.1%** (simple average), but the critical direct-import journey prevents Pass:

| Category | Score | Evidence / Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 75% | recognize-first behavior passes, but the explicit current-file journey still cannot produce a plan |
| Changed-boundary execution directness | 98% | real owner-private current source and both documented command shapes reached production parser logic |
| Cross-boundary integration realism and mock gap | 75% | execution stops before TTY confirmation, Store batch, and expanded provider invocation |
| Environment/configuration/identity/fixture fidelity | 100% | exact user-selected current application file, mode `0600`, source byte comparison, canonical E2E target |
| Failure/edge/lifecycle/recovery evidence | 90% | 201 durable cases and direct value-free failure; remaining lifecycle reruns intentionally stopped |
| User-surface/browser/desktop-shell confidence | 95% | prior browser Settings evidence remains applicable; no UI/shell change |
| Durable regression coverage quality/relevance | 98% | direct revised importer matrix is comprehensive and current |

The clean 95% target is not met; more importantly, the score cannot override the unresolved critical operator journey.

---

## Round 10 Empty-As-Absent Re-investigation

### Trigger And Reviewed Basis

- Reviewed implementation HEAD: `9e9315d58dbd164dc080b1270ef8b7fc9de4ba1c`.
- Architecture round 16 confirms MP-005: every recognized assignment is syntactically parsed and normalized; normalized-empty occurrences are absent and create no credential, duplicate state, buffer, plan/output metadata, count, warning, or error.
- Round-21 implementation-source review: Pass, 93.4/100, no open finding.
- Empty before/after one populated occurrence selects only the populated occurrence; two populated occurrences remain a duplicate error; populated malformed/dynamic values remain rejected; all-empty recognized input returns `IMPORT_NO_MAPPED_CREDENTIALS` before target access.
- This is not Gemini-to-Vertex fallback. `GEMINI_API_KEY` and `VERTEX_AI_API_KEY` map independently when populated.

### Validity And Execution Decisions

| Coverage / Scenario | Decision | Round 10 Action |
| --- | --- | --- |
| `SCSP-E2E-IMPORT-001` current application `.env` | Recheck First | Run value-free dry-run through documented zero/one separators, prove empty Gemini absent from the plan while populated Vertex/OpenAI/other mappings remain, then run no-overwrite E2E-target import through exact TTY confirmation. |
| source-reader/import-service/CLI tests | Still Valid / Expanded | Rerun all empty forms, repeated empties, empty-before/after-populated, all-empty-before-target, populated duplicate/dynamic/malformed, Qwen, target/TTY/rollback/source/evidence cases. |
| `SCSP-E2E-RESTART-001` | Still Valid / Required Rerun | Run after importer success at current HEAD. |
| unchanged `SCSP-E2E-DOCKER-001` | Still Valid / Required Rerun | Exact tracked clean-source path; no DB URL or runtime/package workaround. |
| real-provider manifest/harness | Still Valid / Capability-Dependent | Preflight after import, then run every configured scenario. Report missing capabilities exactly. |
| browser Settings evidence | Carry Forward | No renderer/Electron/web Settings source changed; browser rerun would not improve evidence for this CLI/parser-only revision. |

Broader validation remains **Required**. No durable API/E2E edit is planned unless execution exposes a real coverage gap; production-owned focused tests already encode MP-005.

### Round 10 Execution Results And Coverage Decision

| Scenario / boundary | Result | Direct evidence |
| --- | --- | --- |
| `SCSP-E2E-IMPORT-001` current application source | **Pass** | Zero- and one-leading-separator dry-runs selected nine populated definitions while the normalized-empty `GEMINI_API_KEY` was absent from plan/output. Exact TTY confirmation imported eight definitions and preserved the already-configured OpenAI definition. Source remained byte-identical and `0600`; no value, empty/ignored metadata, fallback, or default-Store access occurred. `80-round10-current-env-dry-runs.log`, `81-round10-current-env-confirmed-import.log`. |
| synthetic importer/AppConfig/Store/runtime/API boundary matrix | **Pass: 14 files / 205 tests** | Empty forms/repeats/ordering, populated duplicates/dynamics/malformed selected syntax, all-empty before target access, zero/one separator, Qwen mapping, target isolation, TTY, dry-run/no-overwrite/overwrite, source immutability, fencing/rollback, Local Store, Settings, harness, GraphQL, and media. `82-round10-focused-boundary-matrix.log`. |
| `SCSP-E2E-RESTART-001` | **Pass: 1/1** | Two sanitized processes without parent `DATABASE_URL`; migrations/listen, byte-identical application `.env`, runtime default, `CONFIGURED` reopen, and removal. `83-round10-server-restart.log`. |
| `SCSP-E2E-DOCKER-001` | **Pass** | Exact tracked clean-source build/start, initial `MISSING`, synthetic save to `CONFIGURED`, same-container/same-volume restart, `CONFIGURED` reopen, removal to `MISSING`, two migration/listen records, unchanged Docker source, and complete owned cleanup. `84`–`86` Round 10 logs. |
| canonical real-provider preflight | **Pass: 11/11 status probes** | Ten scenarios were `READY/CONFIGURED`; `serper.search` was exactly `READY/MISSING search.serper.api-key`. `87-round10-real-preflight.log`. |
| OpenAI LLM / product gateway agent / audio / image | **Pass: 4/4 operations** | Captured and scanned real product requests. `88-round10-real-configured-capabilities.log`. |
| Anthropic managed-secret Claude Agent SDK | **Pass: 1/1 operation** | Captured/scanned managed-secret child boundary; no authentication-mode change. `88-round10-real-configured-capabilities.log`. |
| Gemini Vertex Express audio / image | **Fail: 2/2 product operations** | The product resolves the populated Vertex Express definition but collapses `VERTEX_EXPRESS` to generic `{kind:'apiKey'}` and initializes `GoogleGenAI({apiKey})` without `vertexai:true`. A value-safe read-only-Store diagnostic using the same JIT secret and exact two manifest models with `GoogleGenAI({vertexai:true, apiKey})` passed both audio and image, matching Google's official Vertex Express Node initialization contract. `88` and `89` Round 10 logs. |
| AutoByteus remote LLM / audio / image | **Unavailable: 3/3 operations not passed** | The configured product flows failed discovery. Independent credential-free probes could not resolve `api.autobyteus.com` for any of `/models/llm`, `/models/audio`, or `/models/image` (curl status `000` / host resolution failure). This is exact external endpoint/DNS unavailability, not a pass. `88` and `89` Round 10 logs. |
| canonical evidence scan / owned cleanup | **Pass** | Eleven Round 10 logs passed the durable scanner; no credential value was read or emitted. Owned Docker and temporary diagnostic resources are absent. `90-round10-summary-scan.log`. |

No additional durable test edit was made in Round 10. The existing durable real-provider scenario correctly exposed the Vertex Express implementation defect, while the configured AutoByteus scenarios truthfully exposed the unavailable endpoint. Prior cumulative durable API/E2E edits remain pending proportional review only after an execution Pass.

### Round 10 Failure Classification And Next Evidence

1. **`SCSP-E2E-REAL-GEMINI-VERTEX-001` — preliminary implementation defect.** Expected: Store-backed `VERTEX_EXPRESS` mode reaches the Google Gen AI Vertex Express API for the declared audio/image models. Observed: both normal product operations fail in under 200 ms. The production provisioning boundary selects the correct Store slot but discards the selected Google setup mode before the core helper, whose generic API-key branch omits `vertexai:true`. The bounded corrected-mode JIT probe passed both exact operations without exposing a credential value. Focused failure-origin review should assign the required production authentication-mode propagation correction; API/E2E must not patch production locally.
2. **`SCSP-E2E-REAL-AUTOBYTEUS-001` — external capability unavailable / origin review requested.** Expected: configured gateway credential plus declared host permits remote LLM/audio/image discovery and invocation. Observed: all three product discoveries fail, and credential-free host probes show the manifest host is not DNS-resolvable from the execution environment. These capabilities remain unclaimed. Review should determine whether the manifest endpoint/configuration is stale or the external service is unavailable; no ambient fallback or alternate host was invented.
3. **`serper.search` — exact missing capability.** `search.serper.api-key` is `MISSING`; it was neither invoked nor claimed.

Round 10 broader validation was **Required and executed**. Actual browser/desktop rerun remained **Not Required** because no renderer, preload, IPC, Electron, or Settings UI source changed; the retained actual-browser Settings journey continues to cover the web-equivalent desktop surface. The final coverage confidence is **93.4%** (75, 100, 88, 100, 98, 95, 98; simple average): evidence directness and environment fidelity are high, but the critical Vertex Express behavior fails and AutoByteus external capabilities are unavailable. The score cannot override the failing acceptance behavior, so the Round 10 outcome is **Fail** and must return to `code_reviewer` for focused failure-origin review.

`EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck dependency only. Both Claude modes remain unchanged. Claims remain `LOCAL_HARDENED`; `STRONG_AGENT_ISOLATION` remains deferred. Exact unpatched `repository_prisma@1.0.8`, no automatic update, unchanged Docker topology, target isolation, source immutability, and the authoritative Qwen mapping remain preserved.

---

## Round 11 Exact Gemini Modes, Metadata Contract, And Codex Continuity Re-investigation

### Trigger And Reviewed Basis

- Reviewed implementation HEAD: `ad629bc55ed5c653db957ce46bdbc5092c7738ac`.
- Round-26 full implementation-source review: Pass, 94.4/100, no open source finding.
- `CR-020` correction preserves exact LLM/media variants: `geminiAiStudio`, `geminiVertexExpress`, and `geminiVertexProject`, producing the Google SDK option shapes `{apiKey}`, `{vertexai:true,apiKey}`, and `{vertexai:true,project,location}`.
- Metadata deliberately retains a separate contract: AI Studio or Vertex Express selects exactly one matching Store consumer and uses the established Generative Language request/mapping; Vertex Project creates no live metadata provider and performs zero Gemini metadata secret lookup; live metadata merges over curated values.
- Codex deliberately retains the original external account/configuration boundary and the real parent environment when no explicit environment is supplied. It has no Store/auth-mode owner and is explicitly excluded from the child-environment portion of `LOCAL_HARDENED`.

### Changed Boundaries And Existing-Coverage Decisions

| Boundary / coverage | Decision | Round 11 action |
| --- | --- | --- |
| core/server exact Gemini construction tests | Still Valid / Required Rerun | Run the reviewed 9-core-file / 3-server-file matrix plus metadata resolver/provisioning coverage. |
| canonical real-provider manifest | **Needs Update** | Add a native `gemini.llm` `REAL_DIRECT_SECRET` scenario using the already configured Vertex Express definition and a currently registered model. Mode must remain authoritative. |
| canonical real-provider executor | **Needs Update** | Execute `gemini.llm` through the same normal `LLMProvisioningService -> LLMFactory -> GeminiLLM` boundary as OpenAI, without a direct SDK shortcut. |
| server metadata provisioning tests | **Add Durable Coverage** | Prove both exact key consumers independently, established request/mapping, live-over-curated merge, and Vertex Project zero Gemini lookup/curated-only behavior. No metadata SDK-mode DTO, endpoint change, alternate-definition retry, or fallback is permitted. |
| real Vertex Express metadata | Use Temporary Executable Probe | Bootstrap the normal `ModelMetadataProvisioningService` against the reviewed read-only dedicated E2E Store, select `VERTEX_EXPRESS`, observe only endpoint/header presence (never the value), and prove the real Generative Language request plus catalog merge. The AI Studio definition is currently absent and must be reported unavailable rather than inferred. |
| existing Codex live transport/thread tests | Still Valid / Targeted Live Rerun | Run account-status/model-catalog/thread/turn continuity with the existing node-local Codex account and default inherited environment. Do not synthesize a HOME, use Store lookup, or broaden the assurance claim. |
| `SCSP-E2E-RESTART-001` and unchanged Docker lifecycle | Still Valid / Applicable Rerun | Recheck after affected runtime/provider coverage; no database or Docker workaround. |
| Round 10 importer and Settings browser journeys | Carry Forward | Importer/UI sources are unchanged. The dedicated E2E Store remains configured; rerunning the operator import or browser UI would not improve affected-boundary confidence. Preflight must independently revalidate current Store status. |
| unaffected OpenAI/Anthropic real operations | Carry Forward unless initialization evidence changes | Round 10 real passes remain applicable; rerun canonical preflight and affected Gemini/Codex/metadata paths first. |
| AutoByteus gateway | Capability-dependent recheck | Recheck the declared host without credential output. If DNS/endpoint remains unavailable, report exact unavailability and do not claim pass or invent an alternate host. |

### Round 11 Execution Plan

1. Implement the two narrow durable coverage changes: native `gemini.llm` manifest/executor support and the metadata selection/merge/no-lookup matrix.
2. Run the exact focused core/server Gemini, metadata, manifest/harness, Codex environment, package-policy, and `git diff --check` checks.
3. Run canonical preflight. Execute real Vertex Express LLM/audio/image through normal product boundaries and a separate real metadata request/catalog merge through the established server-owned service.
4. Run the existing real Codex transport/model/thread/turn path with current node-local account state and verify cleanup; record exact `Unavailable` if the external account or binary is not available.
5. Rerun host restart and unchanged clean-source Docker persistence, then scan all released evidence and remove only owned resources.
6. Refresh confidence and route `Pass` to proportional durable-test review or any `Fail` to focused failure-origin review.

Broader validation is **Required** because the previous failure existed only across the real Store -> provisioning -> SDK -> Vertex Express boundary, metadata has a distinct real HTTP/catalog contract, and Codex authentication continuity depends on actual external account state. Browser/desktop execution is **Not Required**: no renderer, preload, IPC, Electron, or web-equivalent Settings source changed.

### Round 11 Execution Results And Coverage Decisions

| Boundary / scenario | Result | Direct evidence and validity decision |
| --- | --- | --- |
| exact Gemini modes, metadata, Codex, harness, and package policy | **Pass: 104 focused tests** | Core: 10 files / 62 tests; server: 5 files / 31 tests; exact `repository_prisma@1.0.8`: 1 file / 11 tests. The new native Gemini LLM manifest path is registry-consistent; exact metadata consumer selection/merge and Vertex Project zero-lookup behavior are durable. `91-round11-focused-gemini-metadata-codex.log`. |
| canonical value-free preflight | **Pass: 12/12** | Gemini Vertex Express LLM/audio/image, OpenAI, Anthropic, and AutoByteus scenarios report `READY/CONFIGURED`; Serper is exact `MISSING`. No ambient alias or default Store is used. `92-round11-real-preflight.log`. |
| `SCSP-E2E-REAL-GEMINI-VERTEX-001` | **Pass: 3/3 real operations** | Normal Store-backed product paths executed a registered Gemini LLM, audio generation, and image generation with the exact Vertex Express definition. This independently resolves the Round 10 failure. `93-round11-real-vertex-express.log`. |
| Gemini metadata contract | **Pass with exact external limitation** | Vertex Express selected only `provider.google.vertex-express-api-key`, made one request to the established Generative Language endpoint, received HTTP 403, and returned the approved curated catalog. The separate AI Studio definition is `MISSING`; no AI Studio request is claimed. Vertex Project performed zero Gemini secret lookups and zero requests, returning curated metadata. `95-round11-real-gemini-metadata-contract.log`. |
| initial metadata probe | **Stale temporary expectation, replaced** | The first temporary probe required a live HTTP 2xx even though the approved contract explicitly allows curated fallback. It observed the same exact endpoint/403 and passed Vertex Project zero-lookup, but its 2xx assertion failed. The probe was corrected rather than reclassifying approved product behavior; both temporary scripts were removed. `94` is retained as transparent superseded evidence; `95` is authoritative. |
| real Codex continuity | **Pass: 1/1 live thread/turn** | Installed `codex-cli 0.145.0`, existing ChatGPT login, real model catalog, real thread, selected `gpt-5.4-mini`, live turn completion, and owned workspace cleanup passed through the unchanged external-account boundary. `96-round11-real-codex-continuity.log`. |
| `SCSP-E2E-RESTART-001` | **Pass: 1/1** | Two sanitized processes with no parent `DATABASE_URL`, migrations/listen, byte-identical application `.env`, runtime default, value-free `CONFIGURED` reopen, and removal. `97-round11-server-restart.log`. |
| `SCSP-E2E-DOCKER-001` | **Pass** | Exact tracked clean local-source build/start under sanitized parent state; initial `MISSING`, synthetic save to `CONFIGURED`, same named volume restart, value-free `CONFIGURED` reopen, removal to `MISSING`, stable application `.env` hash, migrations, evidence scan, and complete owned cleanup. `98`–`100` Round 11 logs. |
| unaffected configured OpenAI and managed Anthropic | **Pass: 3/3 real operations** | Real OpenAI LLM, normal product agent turn, and managed-secret Claude Agent SDK reran through the canonical captured/scanned runner. `101-round11-real-openai-anthropic.log`. |
| AutoByteus gateway | **Unavailable, not passed** | Credential-free probes for the declared LLM/audio/image endpoints cannot resolve `api.autobyteus.com`; HTTP status remains `000`. No alternate host or ambient credential path was invented. `102-round11-autobyteus-capability.log`. |
| evidence and cleanup | **Pass** | The final package check rescanned all 13 prior Round 11 evidence files for raw/base64 canaries and structural secret fields, confirmed the reviewed HEAD and `git diff --check`, and found no owned Docker or temporary provider/Codex workspace. `103-round11-evidence-cleanup-scan.log`, `104-round11-final-package-check.log`. |

The `gemini.llm` manifest/executor addition and exact Gemini metadata tests are `Add Durable Coverage` decisions because they close the reviewed real LLM and separate metadata obligations without direct-SDK shortcuts. The existing restart and Docker scenarios remain `Still Valid`; both passed at the current reviewed HEAD. Round 10 importer evidence remains `Carry Forward`: importer production/test surfaces did not change, the independently provisioned dedicated E2E Store preflight revalidated current status, and rerunning the operator source import would add risk without improving affected-boundary evidence.

### Round 11 Confidence, Residual Risk, And Routing

| Category | Score | Evidence / residual risk |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 95% | Critical changed paths pass directly; AI Studio metadata, Serper, and AutoByteus external execution remain exactly unavailable rather than falsely passed. |
| Changed-boundary execution directness | 100% | Real Store consumers, normal LLM/media provisioning, real external SDKs, metadata service, Codex account/thread, two host processes, and clean container were exercised. |
| Cross-boundary integration realism and mock gap | 98% | Real Vertex/OpenAI/Anthropic/Codex paths and actual metadata HTTP fallback are direct; live metadata enrichment could not complete because the endpoint returned 403. |
| Environment/configuration/identity/fixture fidelity | 100% | Reviewed HEAD, user-owned read-only E2E Store, exact setup modes/models, external Codex account, sanitized restart/container environments, and same named Docker volume. |
| Failure/edge/lifecycle/recovery evidence | 100% | Prior Vertex failure rechecked, curated metadata fallback, missing exact definitions, host restart, container persistence/removal, and cleanup all have direct evidence. |
| User-surface/browser/desktop-shell confidence | 95% | Retained actual-browser Settings journey remains applicable; no renderer/Electron/UI source changed. Codex shell behavior was exercised through the real transport integration. |
| Durable regression coverage quality/relevance | 98% | Narrow native Gemini and metadata coverage complements the cumulative harness, scanner, Store, GraphQL, restart, and importer tests. |

Overall validation confidence: **98.0%** (simple average). No applicable category is below 90%, all critical currently executable acceptance behavior passes, and unavailable external capabilities are explicitly bounded.

Broader validation decision: **Required and completed**. Result: **Pass**. Send the cumulative package and all durable API/E2E changes to `code_reviewer` for separate proportional test-code review.

Safety and preserved decisions:

- No credential value, assignment right-hand side, Store value, default Store, or secret-bearing artifact was read, displayed, copied, or logged. Real paths used the reviewed importer-created dedicated Store only through value-free status and JIT consumers.
- The dedicated E2E Store is user-owned and retained. All API/E2E-owned Docker, temporary metadata/Codex/provider workspaces, runtime state, and scripts were removed.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged.
- Claims remain `LOCAL_HARDENED` with the explicit Codex child-environment exclusion; `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8`, no automatic update, unchanged Docker topology, target isolation, source immutability, and `DASHSCOPE_API_KEY` as the sole Qwen mapping remain authoritative.
