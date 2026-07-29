# Investigation Notes — Universal Application Framework Proposal Analysis

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements/design refined; architecture review round 2 returned `Fail — Design Impact`; SR-003 corrects remaining AR-001 plus AR-005/AR-006, reruns self-validation as SV-008, and is ready for architecture re-review; implementation remains blocked pending a pass
- Investigation Goal: Test the supplied universal application framework proposal against current production code and derive a reliable decision and sequence.
- Scope Classification: `Large`
- Scope Classification Rationale: The proposal spans application SDK contracts, frontend/backend SDKs, devkit, Studio host, server runtime/orchestration, packaging, persistence, isolation/security, standalone deployment, developer tooling, and a future marketplace.
- Scope Summary: Analysis only; no production implementation or proposal-source modification.
- Primary Questions Resolved:
  1. Which proposal claims are already implemented, partial, absent, or inaccurate?
  2. What are the actual application lifecycle and communication spines today?
  3. Where do Studio/server internals leak through the purported SDK boundary?
  4. What isolation and permission enforcement exists beyond manifest declarations?
  5. What is the smallest credible dual-host portability proof?
  6. Do reachable Studio, standalone, build-once, failure, recovery, static-navigation, and shutdown cases preserve the proposed ownership boundaries?
  7. Can a developer use native application-folder commands for real standalone development, Studio development, package build/validation, and production standalone start without an extra project?

## Request Context

The user asked to analyse `/Users/normy/Downloads/autobyteus-vertical-application-developer-experience-proposal.md`. A stable source snapshot is retained at [sources/autobyteus-vertical-application-developer-experience-proposal.md](sources/autobyteus-vertical-application-developer-experience-proposal.md).

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Original Shared Checkout: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis`
- Current Branch: `codex/universal-application-framework-proposal-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Task branch was created from `origin/personal` at `d6983612c5a77fb94d9266df85a9d03fe2d1c68b` on 2026-07-26. At the user's request, successive `git fetch origin personal` and `git merge --ff-only origin/personal` checks succeeded on 2026-07-29; the task branch and tracked base now both resolve to `6caf809303294252c109420b238588f0c68aca6a`.
- Task Branch: `codex/universal-application-framework-proposal-analysis`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Existing user/shared checkout changes: The original shared checkout contained untracked `.article-work/`; it was not modified.
- Notes For Downstream Agents: This is a large cross-project architecture analysis. The requirements/recommendation are approved/refined as recorded; treat examples in the retained source proposal itself as unapproved illustrative shapes unless the canonical package explicitly adopts them.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/sources/autobyteus-vertical-application-developer-experience-proposal.md` | Stable snapshot of user-supplied proposal | Proposed product, package, host, SDK, composition, security, and marketplace claims | All | REQ-001–REQ-006 / AC-001–AC-013 | Retained input | Source input; approval `N/A`; not accepted as implementation basis | Keep with cumulative package |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/proposal-critical-analysis.md` | Detailed claim/evidence/readiness matrix and critique | Executive verdict, current spines, risks, corrected language, MVP scope/exit criteria, staged roadmap, accept/revise/defer/reject decisions | Requirements; design spec | REQ-001–REQ-006 / AC-001–AC-013 | Complete | Approved/refined through 2026-07-27 with user/account concerns excluded and native commands confirmed; SR-003 removes a contradiction without changing approved behavior | Keep aligned with dual-host design |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-self-validation.md` | Discussion-stage architecture validation | Reachable case matrix, spine sufficiency, principles audit, SV-001–SV-008 corrections, and residual risks | Requirements; investigation notes; design spec | REQ-001–REQ-006 / AC-001–AC-013 | Complete | Validation evidence; approval `N/A`; no new requirements authority | Keep aligned and include in review handoff |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-26 | User doc | `/Users/normy/Downloads/autobyteus-vertical-application-developer-experience-proposal.md` | Understand requested proposal | 23-section vision proposes one portable application, Studio and standalone hosts, host-neutral SDKs, scoped resources, modular composition, devkit, marketplace, and phased delivery. | Validate each material claim |
| 2026-07-26 | User clarification | Current conversation | Refine scope before design | AutoByteus intentionally has no user/account subsystem. Exclude that concern and proceed with the correct dual-host architecture/refactor design. | Applied to requirements, analysis, and design |
| 2026-07-26 | Workflow spec | `solution-designer/SKILL.md`, `design-principles.md`, artifact templates | Follow mandatory analysis/design workflow | Requires dedicated worktree, stable behaviors, real production-path evidence, design health, approval before design, and cumulative artifacts. | Applied |
| 2026-07-26 | Git | `git fetch origin personal`; `git worktree add -b codex/universal-application-framework-proposal-analysis ... origin/personal` | Establish isolated current baseline | Worktree created from current tracked remote commit `d6983612c...`. | None |
| 2026-07-26 | Repo inventory | Top-level `find`/`ls`; package `package.json` files | Verify named packages exist | Contracts, frontend SDK, backend SDK, devkit, server, runtime, web, and two sample applications exist. SDK/devkit versions are `0.1.0`. | Inspect implementations |
| 2026-07-26 | Proposal query | `rg -n '^#{1,4} ' ...proposal.md`; `rg -n 'one package\|ApplicationEnvironment\|ApplicationTransport\|PlatformModule\|.abapp\|permissions\|...' ...proposal.md` | Build proposal claim inventory | Located host, artifact, transport, composition, security, phase, rule, and success-criteria claims. | Compared to repo |
| 2026-07-26 | Runtime architecture | `autobyteus-server-ts/src/agent-execution/backends/`; searches for backend factories and manager selection | Verify proposal's current runtime model | Server owns multiple backend implementations; `autobyteus-ts` is a native runtime implementation/dependency, not the whole server platform. | None |
| 2026-07-26 | Studio docs/code | `autobyteus-web/docs/applications.md`; `stores/applicationHostStore.ts`; `components/applications/ApplicationSurface.vue`; `ApplicationIframeHost.vue` | Trace supported user journey | Current Studio path is setup-first, ensure-ready, iframe bootstrap, app-owned runtime start. Iframe message validation is strict, but iframe has no `sandbox` attribute. | Record trust implication |
| 2026-07-26 | Frontend contracts/SDK | `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts`; `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts`; `application-client-transport.ts`; `create-application-backend-mount-transport.ts` | Test host neutrality | Lower client transport is injectable; authoritative startup is iframe-specific and raw root entry is unsupported. Business calls use HTTP/WebSocket after bootstrap. | Recommend bootstrap-provider separation |
| 2026-07-26 | Backend SDK | `autobyteus-application-backend-sdk/README.md`; `src/index.ts`; shared contract capability types | Verify backend abstraction | Backend SDK is a thin typed definition/helper package. Runtime calls are host-injected `context.agentExecution`, `agentResources`, and `publishedArtifacts`, not a network client object matching proposal examples. | Correct examples in recommendation |
| 2026-07-26 | Engine | `autobyteus-server-ts/docs/modules/application_engine.md`; `src/application-engine/services/application-engine-host-service.ts`; `runtime/application-worker-supervisor.ts` | Trace backend lifecycle and isolation | One worker subprocess per app; storage/migrations prepared first; definition/exposures validated; worker inherits `process.env` and has no sandbox/permission flags. | Marketplace blocked on enforcement |
| 2026-07-26 | Storage | `autobyteus-server-ts/docs/modules/application_storage.md`; application storage services/stores | Verify app storage ownership | App-owned `app.sqlite` is separated from platform `platform.sqlite`; migrations are ordered/checksummed and target app DB only; global orchestration lookup is separate. | Reuse in MVP |
| 2026-07-26 | Orchestration | `autobyteus-server-ts/docs/modules/application_orchestration.md`; resolver/configuration/host services and stores | Verify agent/team/resource path | App backend starts runs through named capabilities; bindings and lifecycle journal are durable and app-scoped; bundled and all visible shared agents/teams are available. | Ambient dependencies need explicit model |
| 2026-07-26 | Package/manifest | `application-package-root-summary.ts`; `application-bundle-identity.ts`; `application-manifest.ts`; contracts `manifests.ts`; devkit validators | Compare current artifact to proposal | Package root can contain multiple apps; canonical ID encodes package/local IDs; manifest v4 rejects proposed fields; dot IDs invalid; strict folder/path rules differ. | Use v4 for first proof; design release vNext later |
| 2026-07-26 | Devkit | `autobyteus-application-devkit/README.md`; `src/commands/*`; dev server; template; package assembler/resource copier | Verify developer journey | Commands are create/pack/validate/dev. Dev is iframe host, defaults to mock backend without real URLs, has one plain TS template, no HMR/Vue/React/dual-host test command, and copies no skills/tools. | Do not overstate current DX |
| 2026-07-26 | Server composition | `autobyteus-server-ts/src/server-runtime.ts`; REST/GraphQL/WebSocket registries; search for `PlatformModule`, compositions, service container | Verify capability composition | One broad fixed root initializes/registers all server capabilities. No application-specific composition root or proposed module interface exists. | Composition extraction required |
| 2026-07-26 | Application package injection seam | `ApplicationPackageRegistryService`, `ApplicationBundleService`, `FileApplicationBundleProvider`, local import path | Determine how standalone should select one current bundle | Bundle discovery already accepts injected registry/provider dependencies, but normal local import persists path-based package settings and identity. Standalone needs an ephemeral configured catalog/provider that delegates to current parsing and derives one stable selected identity. | Reflected in design |
| 2026-07-26 | Application WebSocket ingress | `src/api/websocket/index.ts`, `application-backend-notifications.ts`, `application-backends.ts`, `application-agent-communication.ts` | Inventory selected-app live surfaces | The application notification, custom backend WebSocket, and direct agent communication routes are individually registerable but currently grouped with file explorer, terminal, and generic agent sockets. | Split Studio and standalone registrars |
| 2026-07-26 | Startup readiness | `src/startup/background-runner.ts`, `src/startup/agent-tool-loader.ts`, `server-runtime.ts` | Determine lifecycle extraction requirements | Tool/workspace/customization/MCP loading is scheduled as noncritical background work after listen; application recovery also starts after listen behind a gate. A standalone bootstrap needs an explicit lifecycle readiness owner so required application steps cannot race first use. | Reflected in design |
| 2026-07-26 | Representative application | `applications/brief-studio/application.json`, backend/frontend/resources/build scripts | Select a conformance app | Brief Studio has a required slot with a default bundled team and exercises backend state, real tools, lifecycle events, notifications, and published artifacts. | Use as cross-host proof |
| 2026-07-26 | Version/install | Backend manifest parser; global search for `targetRuntime.semver`; GitHub package installer/source normalizer | Verify compatibility/release claims | Node semver is parsed but no range enforcement was found. GitHub import downloads current default-branch archive, not immutable versioned release. | Future compatibility owner required |
| 2026-07-26 | Repository search | `rg -n -i 'dev:studio\|--host\|standalone\|same.origin\|abapp\|signature.json\|integrity.json' ...` excluding tickets/dist | Check for hidden alternate path | No standalone application host, `.abapp`, signing/integrity, or dual-host command found; “standalone” hits refer to other features/runs. | Classified absent |
| 2026-07-26 | Focused tests | `node --test autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs` | Validate current strict iframe contract build | 6 tests passed. | None |
| 2026-07-26 | Focused tests | Temporary root `node_modules/@autobyteus/application-sdk-contracts` symlink, then `node --test ...hosted-application-startup... ...application-connections...`; symlink removed | Validate current frontend SDK dist with workspace resolution | 12 tests passed, including unsupported raw entry, strict bootstrap, client capabilities, and WebSocket behavior. | None |
| 2026-07-26 | Architecture review | `design-review-report.md`, round 1 | Validate implementation readiness | Macro design passed, but named lifecycle allocation, complete frontend migration inventory, composition-critical dependency conversion, and behavior-ID stability were blocking. | AR-001–AR-004 revised in cumulative package |
| 2026-07-26 | Frontend migration audit | `rg -n 'iframeLaunchId\|requestContext\|HostedApplication\|hosted application\|startHostedApplication'` across frontend SDK, devkit, docs, and `applications/` including generated output | Enumerate clean-cut migration consumers | Besides app entries, Brief runtime logs iframe launch correlation; Socratic runtime/renderer displays iframe launch and request-context fields; default startup types/copy, READMEs, template copy, SDK `dist`, sample `ui/vendor`, and importable packages retain hosted-only names. | Exact source/generated removal map added to design |
| 2026-07-26 | Startup owner audit | `server-runtime.ts`; `startup/{background-runner,cache-preloader,agent-customization-loader,workspace-loader,agent-tool-loader,mcp-loader,memory-sync-worker-loader}.ts`; built-in bootstrap; app-data migrations; orchestration startup gate | Replace generic lifecycle tasks with named readiness | Current startup has an explicit pre-listen/post-listen sequence, but six loaders are fire-and-forget. Tool-group failures/missing exports are swallowed; app-data migration failures are represented as result statuses. | Named Studio/standalone allocation and failure policy added to design |
| 2026-07-26 | Dependency graph audit | Constructors/global-access searches across application bundles, storage, orchestration, engine, gateway, streaming/communication, notification/custom WS, definition providers, and application route registrars | Bound singleton conversion | Composition-critical services have injection seams but frequently fall back to cached/global accessors. `ApplicationGlobalPlatformStateStore` has no config injection; definition file providers capture the global bundle service; gateway/custom-WS listeners lack aggregate disposal. | Exact graph, cycle-break seams, Modify/Retain inventory, and stop order added to design |
| 2026-07-26 | User-requested design self-validation | Current conversation; requirements/design; canonical team `shared/design-principles.md`; current SDK/server/app code paths | Exercise the proposed spines against different supported cases before any further review | Macro design passed, but five implicit areas needed to become explicit: build-once package flow/read-only input, standalone relative-wire/browser-origin normalization, selected-ID-only recovery, local no-auth network defaults, and standalone static/navigation spine. | Corrections SV-001–SV-005 applied to design and summarized in `design-self-validation.md`; no review handoff |
| 2026-07-26 | User naming clarification | Current conversation; application-contract symbol search across contracts, SDK, devkit, Studio, tests, docs, and generated owners | Remove version markers from code naming | Current application contracts expose `V1`/`V4` and `_V1`/`_V4` suffixes across manifest, backend-bundle, backend-definition, frontend-SDK, and iframe symbols. Target naming must be unversioned while serialized version fields/values remain unchanged. | Exact clean-cut rename inventory added to design; no aliases; no review handoff |
| 2026-07-26 | Reachable use-case completeness clarification | Current conversation; requirements use cases; BEH-001–BEH-007; DS-001–DS-008; current Studio reload/exit documentation and code | Revalidate only product-reachable paths and verify every in-scope use case is listed | Seventeen reachable use cases were identified. The prior validation covered their substantive runtime paths but lacked an explicit Studio reload/exit spine and mixed two out-of-scope premises into the scenario table. | Added stable UC-001–UC-017 inventory/traceability, added DS-009 for Studio reload/exit, removed unsupported modes from scenario counting, and reran consistency checks; no review handoff |
| 2026-07-27 | User developer-workflow clarification and approval | Current conversation | Fix the expected application-folder commands and distinguish development from production | User confirmed `pnpm dev` means real standalone development; `pnpm dev:studio` means real Studio development; `pnpm build`/`pnpm validate` own the package; and `pnpm start` runs the already-built package standalone in production. The user then authorized further review. | Added UC-018, AC-013, DS-010, exact command semantics/ownership, and final review authorization |
| 2026-07-27 | Native command source audit | `autobyteus-application-devkit/{package.json,README.md,src/cli.ts,src/commands/dev.ts,src/config/*,templates/basic/{package.json,autobyteus-app.config.mjs,README.md}}`; `applications/{brief-studio,socratic-math-teacher}/package.json`; `autobyteus-server-ts/package.json` | Verify current command availability and choose the smallest truthful ownership change | Starter currently maps `pnpm dev` to the iframe-contract/mock-capable host and has no `start`/`dev:studio`; samples have neither dev nor start; devkit CLI has only create/pack/validate/dev; server has no standalone bin/API and is an existing private workspace project. Pack already validates and produces `dist/importable-package`. | Keep `autobyteus-app` as the application-folder facade, add a narrow public standalone start boundary in the existing server project, and do not create another top-level project |
| 2026-07-29 | User-requested base refresh | `git fetch origin personal`; `git merge --ff-only origin/personal`; `git merge-base --is-ancestor origin/personal HEAD`; `git rev-parse HEAD origin/personal` | Ensure the dedicated task worktree is based on the latest original branch before continuing | Fast-forwarded 126 commits from `d6983612c...` to `a5ad63bb9...`; task `HEAD` equals `origin/personal`, the ancestor check passes, and the untracked authoritative ticket package was preserved. | Re-audit changed design-critical paths before handoff |
| 2026-07-29 | Latest-base relevant-diff audit | `git diff --name-status d6983612c..a5ad63bb9 -- <application SDK/devkit/apps/server application paths>`; focused diff/read of `server-runtime.ts`, `app-config.ts`, `startup/migrations.ts`, secret-vault and search-tool sources | Determine whether upstream changes invalidate the design | Application SDK/contracts/devkit/apps and application engine/storage/orchestration sources are unchanged. The broad server root now explicitly derives `ApplicationDatabaseLocation`, protects operational DB/key paths from file tools, then initializes repository Prisma and the secret vault, registers the provisioned Search tool, and closes the default run-event pipeline, secret vault, and Prisma. These are required process/runtime readiness and stop dependencies for both hosts, not user authentication. | Add named P2A/P2B readiness, Search Tools to strict tool registration, process-resource stop order, and exact Modify/Retain rows |
| 2026-07-29 | Latest-base focused regression rerun | `node --test autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs`; temporary local contracts symlink; `node --test ...hosted-application-startup... ...application-connections...`; cleanup and `git status` | Confirm unchanged contract/startup evidence still executes after the base refresh | Contract suite: 6/6 passed. Frontend startup/connections: 12/12 passed. Existing iframe-only raw-entry behavior and strict correlation remain current; the temporary symlink/directories were removed and only the ticket artifact folder remains untracked. | Use as refreshed current-state evidence; target behavior still requires clean-cut replacement |
| 2026-07-29 | Final pre-review remote refresh | `git fetch origin personal`; `git diff --stat a5ad63bb9..origin/personal`; `git merge --ff-only origin/personal`; `git rev-parse HEAD origin/personal`; `git merge-base --is-ancestor origin/personal HEAD` | Reconfirm the branch immediately before review because the tracked original branch advanced again | Fast-forwarded one additional commit to `6caf80930...`; `HEAD` exactly equals `origin/personal` and the ancestor check passes. The delta changes only finalized-ticket delivery records/evidence for an unrelated task, so no application production path or design decision changed. | None |
| 2026-07-29 | Architecture review round 2 | [design-review-report.md](design-review-report.md); [architecture-review-revision-record.md](architecture-review-revision-record.md) | Verify SR-002 against the refreshed repository and approved command paths | `Fail — Design Impact`. AR-002–AR-004 resolved. AR-001 remains as two bounded order/count inconsistencies; AR-005 identifies the missing maintained-project devkit inputs; AR-006 identifies a contrary full-server fallback in the approved critical-analysis supplement. | Correct AR-001, AR-005, and AR-006 before implementation |
| 2026-07-29 | Maintained-project package-input audit | `application-devkit-config.ts`; `load-application-devkit-config.ts`; `application-project-paths.ts`; package/frontend/backend builders; resource copier; Brief/Socratic manifests, layouts, package files, custom builders, icons, migrations, teams, and imports | Choose one executable pack owner for UC-015/AC-011 | Both maintained apps share the same non-default layout and exposure contract: `frontend-src/app.js`, `frontend-src/index.html`, `backend-src/index.ts`, `backend-src/migrations`, root `agent-teams`, output `dist/importable-package`, exposures `{queries:false, commands:false, routes:false, graphql:true, notifications:true, eventHandlers:true, webSockets:false}`. The current icons exist only in generated `ui/`, and entries import a generated local vendor file. | Add identical checked-in config mappings, move each icon into `frontend-src`, import the SDK package, retire custom builders/source-root runtime mirrors, and let devkit pack own all generated package output |
| 2026-07-29 | Disposable AR-005 configuration probe | Temporary copies under `applications/.ar005-config-probe`; temporary devkit dependency symlink; exact proposed config; target package-SDK entry import; copied source icon; current devkit `pack` and `validate`; generated manifest/resource assertions; complete cleanup | Verify that the chosen mapping is supported by the existing pack owner rather than inventing a custom-builder adapter | Brief Studio and Socratic each packed and validated successfully. Generated output contained the icon, root team, migrations, and exact seven exposure booleans. Probe/dependency/build artifacts were removed; `git status` returned to only the ticket package. This proves the project mapping seam, not the not-yet-implemented dual-host commands. | Record exact config and clean-cut builder/output removal in the design |

## Discussion-Stage Design Self-Validation

The authoritative validation evidence is [design-self-validation.md](design-self-validation.md). The final pass contains eighteen stable reachable product use cases and twenty-four reachable validation cases. They cover package assembly, Studio setup/entry/post-entry setup save/reload/exit, standalone launch, non-loopback browser-visible origin, invalid/multi-app selection, bootstrap failures, readiness failure, missing standalone resource setup, shared backend/live operations, real agent/team events/artifacts, storage/migrations, refreshed-base Prisma/vault/Search readiness, restart, stale non-selected records, worker failure, shutdown, static/navigation safety, local no-auth network behavior, native developer modes, built-package production start, and host-neutral authoring.

Unsupported multi-process, marketplace, multi-node, and public-internet modes remain in requirements `Out of Scope`; they are not counted as use cases or validation cases and do not drive machinery.

The outcome is `Pass after bounded design corrections`. The earlier pass found one traceability gap rather than a macro-architecture gap: Studio reload/exit was preserved in prose but lacked its own spine. DS-009 covers that path. The final workflow pass found that production execution after build was only implied by standalone startup, so DS-010 now spans `pnpm build`/`validate`/`start` through the real standalone composition. No new top-level project, server fork, host-specific application build, data migration, compatibility wrapper, public mock command, or user/account subsystem was introduced.

## Relevant Existing Behavior And Production Paths

The IDs below are canonical and match [requirements.md](requirements.md) and [design-spec.md](design-spec.md).

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Operational | User selects an application, completes required setup, and clicks `Enter application` in Studio | Catalog/detail -> setup gate -> `applicationHostStore.startLaunch` -> `/backend/ensure-ready` -> storage/migrations -> worker -> route-visit iframe descriptor -> ready/bootstrap -> SDK business mount | Host launch does not create a runtime run. One fresh `iframeLaunchId` correlates Studio bootstrap only; app backend later owns run creation. No standalone host exists. | `autobyteus-web/docs/applications.md`; `stores/applicationHostStore.ts`; `ApplicationSurface.vue`; `ApplicationIframeHost.vue`; server engine docs/code |
| BEH-002 | Contract / Runtime | Frontend calls `startHostedApplication`; backend handlers receive `ApplicationHandlerContext` | Iframe hints + ready/postMessage bootstrap -> create client using HTTP/WebSocket bases; backend invocation -> API gateway -> worker; named context-capability IPC returns to orchestration host | Frontend startup and public types/copy are Studio/iframe-specific; lower client transport and backend context capabilities are reusable. Business callbacks currently receive raw iframe payload fields. | Contracts/SDK sources; both sample entries/runtimes; starter template; generated/vendor output |
| BEH-003 | Package / Persistence | Import/reload package root and launch an application bundle | Package registry -> package-root validation -> bundle discovery -> strict manifest/backend parser -> canonical `(packageId, localApplicationId)` ID -> storage root/migrations -> worker | Current package container can hold multiple apps; manifest v4 rejects unknown fields; app and platform DBs stay separate. | Package registry/root summary; bundle identity; manifest parser; storage docs |
| BEH-004 | Resource / Runtime | Host saves an execution-resource slot; app backend resolves and starts it | Manifest slot -> configuration store/view -> `agentResources.getConfigured` -> resolver lists bundle + shared -> `agentExecution.start*` -> server runtime factory | Bundled agents/teams have app-owned canonical identity; shared agents/teams remain ambient; skills/tools come from definition names/platform registries. Tool/customization/workspace registration is currently background work. | Application manifest; resolver/configuration; startup loaders; orchestration docs; sample configs |
| BEH-005 | Server / Contract | Server starts through `startConfiguredServer`/`buildApp`; app ingress calls generic routes | Fixed logging/migrations/bootstrap -> broad HTTP/WS/GraphQL/MCP/mobile/admin registration -> listen -> recovery plus background startup | There is one broad composition and no bounded standalone composition. Current application route adapters close over global gateway/hub/communication accessors. | `server-runtime.ts`; REST/GraphQL/WS registries; application route files |
| BEH-006 | Developer / Operational | Developer runs current app-project package scripts or the current devkit CLI | The starter maps `pnpm dev` to the iframe-contract page and selects mock backend routes when real server URLs are absent; it exposes `build`/`validate` but no `dev:studio` or `start`. Brief/Socratic expose only custom build/backend typecheck, use `frontend-src`/`backend-src` plus root `agent-teams`, import a generated local frontend vendor file, and have no `autobyteus-app.config.mjs`. Devkit CLI has no production start command, and the server has no standalone process entry. | Current application-folder commands do not prove real standalone runtime portability, their maintained sample layouts do not resolve through devkit defaults, and they cannot launch an already-built package as a production standalone product. | Devkit CLI/README/config/template/package/assembler sources; Brief/Socratic package/config-absence/layout/custom-builder files; disposable exact-config probe; server package file |
| BEH-007 | Persistence / Runtime | Application storage is prepared or server recovery resumes known applications | `ApplicationStorageLifecycleService` -> per-app app/platform DBs; global run lookup -> startup recovery -> availability reconciliation -> pending event dispatch | Schemas/readers/writers are reusable, but several stores resolve `appConfigProvider` or global service fallbacks rather than a composition-supplied data root. | Storage/orchestration docs and stores; `server-runtime.ts` recovery block |

### SEC-CONSTRAINT-001 — Trusted execution boundary (not a canonical behavior ID)

Trusted backend code currently runs in a Node child process with inherited environment and host privileges, and the Studio UI iframe has no `sandbox` attribute. The dual-host proof remains limited to trusted local packages; arbitrary third-party isolation, signing, publisher trust, and marketplace enforcement are out of scope. Evidence: `application-worker-supervisor.ts`, `ApplicationIframeHost.vue`, storage and engine docs/code.

## Design Health Assessment Evidence

- Change posture: `Larger Requirement`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor posture: `Required before implementation of the universal-host claim`
- Design issue signal: `Yes`

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `hosted-application-startup.ts` | Authoritative startup owns iframe query hints and parent messaging. | Host acquisition leaks into the application entrypoint. | Extract explicit bootstrap-provider owner before second host. |
| `application-client-transport.ts` / mount transport | Business communication already has a separable transport abstraction. | Reuse/extend current owned transport; do not invent host-specific business clients. | Preserve in target design. |
| `server-runtime.ts` and registries | Broad features are initialized/registered together. | Standalone cannot select capabilities safely without explicit composition work. Loopback binding does not make the current broad composition an acceptable standalone implementation. | Inventory graph and extract explicit application-platform registration/lifecycle. |
| Package registry/bundle constructors | Useful injection seams exist, while normal import persists path-derived package identity. | Standalone can reuse current parser/provider without writing a second package system, but selection must be composition-owned and stable across install-path moves. | Add configured selected-app catalog provider. |
| Background startup loader | Application-relevant tools can still load asynchronously after listen. | Standalone `ready` cannot mean only “port is bound.” | Make required application-platform steps part of lifecycle readiness. |
| `agent-tool-loader.ts` / `background-runner.ts` | Missing tool loader exports and individual tool group errors are logged and swallowed; the background aggregate is detached. | A real application-platform readiness signal cannot reuse the current best-effort contract. | Add a strict named tool-registry readiness owner; retain best-effort scheduling only for noncritical Studio extras. |
| App entry/runtime/default screen audit | Raw iframe payload fields and hosted-only state/copy survive outside the entry files and in checked-in outputs. | A clean bootstrap contraction must update sources and regenerate derived layers; otherwise iframe data leaks back into the universal shape. | Exact callback/types/replacement inventory required. |
| Application store/service constructor audit | Catalog, storage, recovery, gateway, WS, streaming, and communication instances can fall back to unrelated process globals. | Correct URL mounts alone do not guarantee the selected catalog/data root/runtime graph. | Make the construction-critical graph explicit and add lifecycle disposal. |
| Refreshed `server-runtime.ts` process prerequisites | Current root now performs exact database-location/core migration, DB/root-key/sidecar path denial, Prisma initialization, secret-vault initialization, Search registration, and event-pipeline/vault/Prisma close. | A standalone composition that omits or reorders these steps would not be the same real runtime and could expose operational DB/key files to tools or fail provider-backed runs. | Preserve the singular protected-path-before-Prisma P2A/P2B chain, seven named P6 tool groups, and explicit stop order in both hosts. |
| Maintained Brief/Socratic package ownership | Both projects use non-default source folders and custom scripts that create source-root `ui`/`backend` mirrors, local SDK vendor trees, and a packaging mirror. Current devkit config can map the real source folders/resources and the existing pack owner can bundle the SDK packages and backend. | Calling `autobyteus-app dev` without checked-in mappings fails on default `src/frontend`/`src/backend`; retaining the custom builders behind the command would create two pack owners and recursive/unequal development behavior. | Add identical exact devkit configs, make package imports/static inputs source-owned, switch `build` to devkit pack, and remove the custom builders and redundant generated mirrors. |
| Current `AppConfig.initialize()` and native standalone command | A new standalone data root has no `.env`, but current config requires that file and an `AUTOBYTEUS_SERVER_HOST` value. | A truthful zero-setup `pnpm start` needs a bounded host-config adaptation without writing into the application package or persisting credentials. | Materialize only a missing empty/non-secret data-root `.env`, never overwrite, and supply runtime values explicitly. |
| Manifest/package owners | Current contract and proposed release shape have different identities and cardinality. | Artifact semantics must be decided, not papered over by unknown fields or dual readers. | Keep v4 MVP; design clean release contract later. |
| Worker supervisor / iframe host | Process and UI isolation do not enforce third-party trust. | Marketplace is security architecture, not packaging polish. | Threat model before arbitrary package execution. |
| Resource resolver/devkit copier | Bundle agents/teams exist; shared definitions and global skills/tools remain. | “No hidden globals” is not currently true. | Add dependency/resource categories before portable ecosystem claims. |

## Relevant Files / Components

### Proposal and application contracts

- `tickets/in-progress/universal-application-framework-proposal-analysis/sources/autobyteus-vertical-application-developer-experience-proposal.md`
- `autobyteus-application-sdk-contracts/src/index.ts`
- `autobyteus-application-sdk-contracts/src/manifests.ts`
- `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts`

### Frontend/backend SDKs and devkit

- `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts`
- `autobyteus-application-frontend-sdk/src/default-startup-screen.ts`
- `autobyteus-application-frontend-sdk/src/index.ts`
- `autobyteus-application-frontend-sdk/src/application-client-transport.ts`
- `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts`
- `autobyteus-application-backend-sdk/src/index.ts`
- `autobyteus-application-backend-sdk/README.md`
- `autobyteus-application-devkit/package.json`
- `autobyteus-application-devkit/src/cli.ts`
- `autobyteus-application-devkit/src/commands/dev.ts`
- `autobyteus-application-devkit/src/config/application-devkit-config.ts`
- `autobyteus-application-devkit/src/config/load-application-devkit-config.ts`
- `autobyteus-application-devkit/src/dev-server/dev-bootstrap-server.ts`
- `autobyteus-application-devkit/src/dev-server/dev-host-page.ts`
- `autobyteus-application-devkit/src/package/package-assembler.ts`
- `autobyteus-application-devkit/src/package/resource-copier.ts`
- `autobyteus-application-devkit/src/validation/application-root-validator.ts`
- `autobyteus-application-devkit/src/validation/local-application-id.ts`
- `autobyteus-application-devkit/templates/basic/`
- `applications/brief-studio/package.json`
- `applications/socratic-math-teacher/package.json`
- `docs/custom-application-development.md`

### Studio host

- `autobyteus-web/docs/applications.md`
- `autobyteus-web/stores/applicationHostStore.ts`
- `autobyteus-web/components/applications/ApplicationShell.vue`
- `autobyteus-web/components/applications/ApplicationSurface.vue`
- `autobyteus-web/components/applications/ApplicationIframeHost.vue`

### Package, engine, storage, orchestration, and server composition

- `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts`
- `autobyteus-server-ts/src/application-packages/utils/application-package-root-summary.ts`
- `autobyteus-server-ts/src/application-packages/installers/github-application-package-installer.ts`
- `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts`
- `autobyteus-server-ts/src/application-bundles/utils/application-bundle-identity.ts`
- `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts`
- `autobyteus-server-ts/src/application-bundles/utils/application-backend-manifest.ts`
- `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts`
- `autobyteus-server-ts/src/application-engine/runtime/application-worker-supervisor.ts`
- `autobyteus-server-ts/src/application-storage/services/application-storage-lifecycle-service.ts`
- `autobyteus-server-ts/src/application-storage/stores/application-platform-state-store.ts`
- `autobyteus-server-ts/src/application-storage/stores/application-global-platform-state-store.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-availability-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-recovery-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-dispatch-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-ingress-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-run-observer-service.ts`
- `autobyteus-server-ts/src/application-orchestration/stores/application-run-lookup-store.ts`
- `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts`
- `autobyteus-server-ts/src/application-orchestration/stores/application-execution-event-journal-store.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-resolver.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-service.ts`
- `autobyteus-server-ts/src/application-backend-api-gateway/services/application-backend-api-gateway-service.ts`
- `autobyteus-server-ts/src/application-backend-api-gateway/notifications/application-backend-notification-hub.ts`
- `autobyteus-server-ts/src/application-backend-api-gateway/websockets/application-backend-websocket-session-service.ts`
- `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-streaming-service.ts`
- `autobyteus-server-ts/src/application-agent-communication/services/application-agent-communication-service.ts`
- `autobyteus-server-ts/src/api/rest/application-backends.ts`
- `autobyteus-server-ts/src/server-runtime.ts`
- `autobyteus-server-ts/src/api/rest/index.ts`
- `autobyteus-server-ts/src/api/graphql/schema.ts`
- `autobyteus-server-ts/src/api/websocket/index.ts`
- `autobyteus-server-ts/src/api/websocket/application-backend-notifications.ts`
- `autobyteus-server-ts/src/api/websocket/application-backends.ts`
- `autobyteus-server-ts/src/api/websocket/application-agent-communication.ts`
- `autobyteus-server-ts/package.json`
- `autobyteus-server-ts/src/startup/background-runner.ts`
- `autobyteus-server-ts/src/startup/agent-tool-loader.ts`
- `autobyteus-server-ts/src/startup/workspace-loader.ts`
- `autobyteus-server-ts/src/startup/agent-customization-loader.ts`
- `autobyteus-server-ts/src/startup/mcp-loader.ts`
- `autobyteus-server-ts/src/startup/memory-sync-worker-loader.ts`
- `autobyteus-server-ts/src/config/application-database-location.ts`
- `autobyteus-server-ts/src/config/prisma-client-factory.ts`
- `autobyteus-server-ts/src/startup/migrations.ts`
- `autobyteus-server-ts/src/secret-management/secret-vault-runtime.ts`
- `autobyteus-server-ts/src/agent-tools/search/register-search-tool.ts`
- `autobyteus-server-ts/src/agent-tools/search/search-provisioning-service.ts`
- `autobyteus-server-ts/src/agent-execution/events/default-agent-run-event-pipeline.ts`
- `autobyteus-server-ts/docs/modules/application_engine.md`
- `autobyteus-server-ts/docs/modules/application_storage.md`
- `autobyteus-server-ts/docs/modules/application_orchestration.md`

### Representative apps

- `applications/brief-studio/`
- `applications/socratic-math-teacher/`
- `applications/brief-studio/frontend-src/brief-studio-runtime.js`
- `applications/socratic-math-teacher/frontend-src/socratic-runtime.js`
- `applications/socratic-math-teacher/frontend-src/socratic-renderer.js`
- Both applications' checked-in `ui/` and `dist/importable-package/` derived outputs

## Runtime / Probe Findings

### Workspace package scripts without installed dependencies

Attempted command:

```bash
pnpm --filter @autobyteus/application-sdk-contracts test && \
  pnpm --filter @autobyteus/application-frontend-sdk test
```

Result: stopped because the isolated worktree has no installed workspace `node_modules` and `tsc` was unavailable. This is an environment/setup limitation, not a product failure.

An initial direct multi-package test attempt also failed frontend module resolution because the workspace package symlink was absent. This was a setup failure and was corrected with a temporary symlink.

### Contract probe

Command:

```bash
node --test autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs
```

Result: `6 passed, 0 failed`. Validated tight v4 hint/envelope parsing and target-path behavior in the existing built output.

### Frontend SDK probe

Setup and command:

```bash
mkdir -p node_modules/@autobyteus
ln -s ../../autobyteus-application-sdk-contracts node_modules/@autobyteus/application-sdk-contracts
node --test \
  autobyteus-application-frontend-sdk/tests/hosted-application-startup.test.mjs \
  autobyteus-application-frontend-sdk/tests/application-connections.test.mjs
unlink node_modules/@autobyteus/application-sdk-contracts
rmdir node_modules/@autobyteus node_modules
```

Result: `12 passed, 0 failed`. Evidence includes:

- raw entry without iframe hints becomes `unsupported_entry`;
- correct iframe bootstrap reaches `handoff_complete`;
- mismatched bootstrap is rejected;
- mount failures remain contained;
- current capability groups and WebSocket validation behave as expected.

Cleanup: temporary workspace-resolution symlink and empty directories were removed. Git status afterward showed only the task artifact folder as untracked.

## External / Public Source Findings

- N/A. No external source was necessary to verify the local architecture or proposal compatibility.
- No web browsing was used; all current-state claims are tied to the local repository baseline.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static analysis.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded: None. Only the user proposal was copied into the task folder.
- Material setup: dedicated git worktree; one temporary local package-resolution symlink for focused built-output tests; and a disposable maintained-project config probe with temporary devkit/application dependency symlinks because the task worktree has no installed `node_modules`.
- Cleanup: all temporary symlinks, probe directories, and generated devkit `dist` output were removed; no production source or persisted application data changed.

## Findings From Code / Docs / Data / Logs

### Confirmed foundations

1. **Runtime model is accurately corrected by the proposal.** Multiple server-owned backend factories exist.
2. **Studio application hosting is substantial and production-shaped.** It is not only a placeholder iframe.
3. **Backend execution has a real lifecycle owner.** Storage preparation, migration, process start, contract/exposure validation, invocation, status, and stop are centralized.
4. **Application storage separation is strong for trusted code paths.** App migrations cannot target the platform DB through the supported migration owner.
5. **Application-owned orchestration is mature.** Backends choose when to start work and receive durable bindings/events/artifact reads.
6. **Bundled agent/team identity is app-scoped.** Canonical IDs include package/application ownership.
7. **The lower frontend client transport is already replaceable.** The coupling is concentrated in bootstrap/startup rather than every business API.

### Material gaps and contradictions

1. No standalone product host or same-origin bootstrap path exists.
2. `startHostedApplication` is intentionally iframe-only and raw root entry is unsupported.
3. Proposal transport class names conflate bootstrap delivery with subsequent HTTP/WebSocket communication.
4. Current backend API example in the proposal does not match `context.agentExecution.startAgentTeam(...)` and current execution-resource setup requirements.
5. Current package-root cardinality, manifest v4 fields, ID grammar, folders, and definition filenames differ from the proposed example.
6. No `.abapp`, integrity/signature, immutable version, publisher, dependency lock, or revocation owner exists.
7. Devkit is a Milestone 1 iframe-contract tool, not standalone-first product development; mock backend is the no-URL default.
8. Skills/tools are not copied as app-owned resources, and agent definitions name platform registry tools/skills.
9. All shared visible agents/teams remain selectable, contradicting a strict “no ambient globals” statement.
10. Current server composition is broad and fixed; the proposed module contract does not exist.
11. Worker process separation is not a sandbox; it inherits environment and host privileges.
12. Application UI iframe is not sandboxed.
13. Backend runtime semver is recorded but no enforcement comparison was found.
14. GitHub import follows the current default branch, not an immutable release.
15. Standalone operations, scale, backups, secrets, TLS, readiness, rollback, and WebSocket deployment behavior are not specified.

### Inference discipline

- “No standalone host” is based on repository-wide path/term/command searches plus inspection of every named application framework package; absence under an unknown external repository remains theoretically possible but is not supported by this repository.
- “No sandbox” means no enforceable Node/OS/container/frontend sandbox was found in the inspected production path. It does not deny the existing IPC boundary, path validation, storage split, or process crash containment.
- “Semver not enforced” means search and parser/launch inspection found parsing only; no range comparison was found. A downstream implementation should recheck before changing compatibility behavior.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject and location: Per-app roots under `<app-data-dir>/applications/<application-key>/`, with app-owned `db/app.sqlite`, platform-owned `db/platform.sqlite`, logs, and runtime status; global orchestration lookup under `applications/_global/db/orchestration.sqlite`.
- Current semantic split: App business schema/data belongs in `app.sqlite`; binding, journal, migration metadata, and recovery state remain platform-owned.
- Current readers/writers: Application worker receives `ApplicationStorageContext` for app data; platform storage/orchestration services own reserved stores and migration ledger.
- Current migration behavior: App SQL runs lexicographically, is checksummed, and is rejected for forbidden platform/SQLite control identifiers/patterns.
- Target design data outcome: `Directly Usable — No Migration`; the solution changes construction/hosting only and makes no data or schema change.
- Future design implication: The first portability proof should reuse the same storage lifecycle with different host data roots. A future package version/update contract must separately define app migration rollout, backups, failure recovery, and rollback; current analysis does not select transformation mechanics.
- Required semantics preserved by direct use: Current per-app app/platform separation and migration ownership can be reused directly for a local single-node proof.

## Constraints / Dependencies / Compatibility Facts

- Initial evidence baseline was `origin/personal` at `d6983612c5a77fb94d9266df85a9d03fe2d1c68b`; the implementation/design-review baseline is refreshed to `origin/personal` at `6caf809303294252c109420b238588f0c68aca6a` on 2026-07-29.
- Existing Studio behavior must remain the first authoritative host path.
- The same-package/two-host invariant is proposed and recommended, not currently proven.
- Current application contract versions are exact: manifest `4`, backend bundle `1`, backend definition `4`, frontend SDK `4`.
- Current package/parser owners reject unknown fields rather than retaining them.
- No backward-compatibility wrapper, copied server fork, or mock-only portability path should be recommended.
- Arbitrary third-party package execution is outside a trusted portability MVP.

## Open Unknowns / Decisions Required

- Resolved: Brief Studio is the representative first proof.
- Resolved: A contained/full broad-server fallback is rejected; standalone receives an explicit selected-application composition.
- Resolved: The supported application-folder command contract is `dev`, `dev:studio`, `build`, `validate`, and `start`; `dev` is standalone and `start` consumes the existing build.
- Resolved: Brief Studio and Socratic map their shared non-default layout through checked-in `autobyteus-app.config.mjs` files and the existing devkit pack owner. Their custom builder scripts and source-root generated runtime mirrors are removed rather than adapted or invoked.
- Resolved: The initial command facade remains in the existing application devkit and delegates to a narrow standalone process API in the existing server project. No extra top-level project is introduced.
- Deferred: Final cardinality and internal format of a future `.abapp` release artifact.
- Deferred: Exact packaged/versioned skill and tool dependency policy after the current trusted built-in proof.
- Deferred: Optimized standalone binary/container extraction, broader deployment targets, and operational SLOs for any later commercial host. The local production command and process/data lifecycle are not deferred.

## Notes For Architecture Reviewer

Requirements and the recommendation supplement were approved/refined through 2026-07-27 with identity/account concerns excluded. Architecture review round 2 returned `Design Impact`; AR-002–AR-004 are resolved, and SR-003 corrects remaining AR-001 plus AR-005/AR-006. The user fixed the native `dev`/`dev:studio`/`build`/`validate`/`start` semantics and authorized review. Re-review [design-spec.md](design-spec.md) as a bounded dual-host architecture and verify:

- provider normalization leaves the current iframe v4 protocol provider-local;
- standalone selection delegates to the existing package/bundle parser instead of creating a second parser;
- the application-platform lifecycle has named pre-listen/readiness/recovery collaborators and an explicit Studio/standalone failure policy rather than a task bag;
- the exact composition graph supplies catalog/data/stores/gateway/communication instances without construction-critical fallback lookups, and shutdown releases timers/sockets/listeners;
- the frontend callback/types and every source/generated iframe-only consumer are accounted for;
- `pnpm dev` and `pnpm start` delegate to the same real standalone composition with different orchestration semantics, while `start` never builds/watches/mocks and no extra top-level project is introduced;
- Brief/Socratic's checked-in devkit mappings resolve their real `frontend-src`/`backend-src`/team/migration/exposure inputs through the same pack owner used by `build`, `dev`, and `dev:studio`, with no custom-builder fallback;
- the exact readiness chain registers protected operational paths before Prisma and P6 contains seven named tool groups including Search everywhere; and
- the approved critical analysis rejects the current broad `buildApp()` composition as any standalone fallback or stage;
- manifest v4 and persisted data remain unchanged; and
- marketplace, package vNext, and physical server-package extraction do not enter this implementation unit.
