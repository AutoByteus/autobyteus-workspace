# Investigation Notes — Universal Application Framework Proposal Analysis

## Investigation Status

- Bootstrap Status: Complete
- Current Status: SR-006 passed as `ARCH-REV-006`; the implementation has since progressed through IR-011. CRR-019 passed the graph-local Codex definition correction, and API-REV-007 proves route/auth/tool-list plus real `send_message_to` handoff. `CRR-020` now returns `Fail — Design Impact` as CR-015: `publish_artifacts` executes through a process-global publication service that cannot see the graph-local application runs. SR-010 revises the session/publication authority and lifecycle design; implementation is paused pending architecture review.
- Investigation Goal: Test the supplied universal application framework proposal against current production code and derive a reliable decision and sequence.
- Scope Classification: `Large`
- Scope Classification Rationale: The proposal spans application SDK contracts, frontend/backend SDKs, devkit, Studio host, server runtime/orchestration, packaging, persistence, isolation/security, standalone deployment, developer tooling, and a future marketplace.
- Scope Summary: Preserve the implemented dual-host, package-default, route/auth, graph-definition, messaging, gateway-separation, and runtime-internal boundaries. Correct only the now-proven application Agent Tools publication authority: composition-owned transport family, session-bound graph-local publication port, one fail-closed cycle break, scope revocation/close, and exact default-provider/application-graph proof. API/E2E tests, evidence, and other roles’ artifacts remain preserved for their owners.
- Primary Questions Resolved:
  1. Which proposal claims are already implemented, partial, absent, or inaccurate?
  2. What are the actual application lifecycle and communication spines today?
  3. Where do Studio/server internals leak through the purported SDK boundary?
  4. What isolation and permission enforcement exists beyond manifest declarations?
  5. What is the smallest credible dual-host portability proof?
  6. Do reachable Studio, standalone, build-once, failure, recovery, static-navigation, and shutdown cases preserve the proposed ownership boundaries?
  7. Can a developer use native application-folder commands for real standalone development, Studio development, package build/validation, and production standalone start without an extra project?
  8. Does a fresh standalone installation obtain a complete runtime/model selection from the immutable application package, and do build/start/Studio/launch use one runnable-configuration invariant?
  9. Does the exact graph-local team-definition authority reach member prompt composition for real package teams?
  10. Can Studio sparsely edit an alternate resource using a server-authoritative pre-overlay baseline, and can package validation distinguish exact portable token/pricing fields from actual secret-bearing fields recursively?
  11. Does standalone register the already-established Agent Tools session route without conflating eligible server adapters, configured MCP-origin tools, unrelated runtime internals, or the separate external MCP gateway?
  12. What does the general `/mcp/gateway` expose, does Studio MCP configuration become a standalone application dependency, and is application-owned MCP provisioning part of this ticket?
  13. How do application-created Agent Tools sessions and route dispatch select the exact graph-local publication authority without a process-global fallback, mismatched registry/catalog family, or construction cycle?

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
- Remote Refresh Result: Task branch was created from `origin/personal` at `d6983612c5a77fb94d9266df85a9d03fe2d1c68b` on 2026-07-26 and refreshed before implementation to `6caf809303294252c109420b238588f0c68aca6a`. Architecture passed SR-006; downstream implementation/review/API work now places task `HEAD` at `7dfc050f4` (`docs(ticket): record publication authority design impact`, CRR-020). `origin/personal` has independently advanced. API/E2E-owned uncommitted tests/evidence and other roles’ artifacts are preserved, so delivery—not solution design—owns final tracked-base refresh/integration.
- Task Branch: `codex/universal-application-framework-proposal-analysis`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Existing user/shared checkout changes: The original shared checkout contained untracked `.article-work/`; it was not modified.
- Notes For Downstream Agents: This is a large cross-project architecture analysis. The requirements/recommendation are approved/refined as recorded; treat examples in the retained source proposal itself as unapproved illustrative shapes unless the canonical package explicitly adopts them.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/sources/autobyteus-vertical-application-developer-experience-proposal.md` | Stable snapshot of user-supplied proposal | Proposed product, package, host, SDK, composition, security, and marketplace claims | All | REQ-001–REQ-008 / AC-001–AC-017 | Retained input | Source input; approval `N/A`; not accepted as implementation basis | Keep with cumulative package |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/proposal-critical-analysis.md` | Detailed claim/evidence/readiness matrix and critique | Executive verdict, current spines, risks, corrected language, MVP scope/exit criteria, staged roadmap, accept/revise/defer/reject decisions | Requirements; design spec | REQ-001–REQ-008 / AC-001–AC-017 | Complete | Approved/refined through 2026-07-30; SR-010 adds the graph-local publication authority correction without changing product intent | Keep aligned with dual-host design |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-self-validation.md` | Discussion-stage architecture validation | Reachable case matrix, spine sufficiency, principles audit, SV-001–SV-015 corrections, and residual risks | Requirements; investigation notes; design spec | REQ-001–REQ-008 / AC-001–AC-017 | Complete | Validation evidence; approval `N/A`; no new requirements authority | Keep aligned and include in cumulative handoff |

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
| 2026-07-29 | Architecture review round 3 and implementation state | `design-review-report.md` (`ARCH-REV-003`); implementation/code/API-E2E revision records | Establish the post-design baseline before responding to downstream findings | Architecture passed SR-003 and the dual-host macro architecture was implemented. Real Studio/package/dev/standalone paths and graph isolation received durable coverage. | Preserve passed macro decisions; revise only the exposed launch/readiness and prompt-authority gaps |
| 2026-07-29 | Fresh code review and live evidence | `code-review-report.md` (`CRR-010`, CR-006–CR-008); `api-e2e-execution-coverage-report.md` (`API-REV-004`); referenced live logs/JSON | Trace the real clean standalone and Studio team paths | Clean Brief standalone reaches the UI/action, returns resource `READY` with null launch profile, and fails `llmModelIdentifier is required`; the real Studio run succeeds with a saved override. A real package team prompt omits the package `team.md` instruction because member context uses a global definition service. Both premises are product-reachable. | Design package-default/effective-profile/readiness spine; carry CR-008 graph authority |
| 2026-07-29 | User product clarification | Current conversation as canonically captured in `code-review-report.md` / `CRR-010` | Decide the source of standalone model/runtime configuration | Every standalone-capable application owns complete runtime/model defaults. Studio is an optional override/experimentation surface; reset returns to package defaults. Credentials, endpoints, runtime installation, and model availability stay host-managed. No mandatory standalone setup UI or copied/preseeded default rows. | Applied to requirements and target design |
| 2026-07-29 | Architecture review round 4 | [design-review-report.md](design-review-report.md) (`ARCH-REV-004`); [architecture-review-revision-record.md](architecture-review-revision-record.md) | Verify SR-004 after downstream design-impact re-entry | DS-011, DS-012’s main baseline/override/capability path, and DS-013 pass. AR-007 finds one reachable branch: save shared-team override -> delete shared team, or change member topology -> valid package plus invalid saved host state. The SR-004 union required complete configurations for `HOST_REQUIREMENT_MISSING` and could not represent it without fallback or package blame. | Refine only DS-012 aggregate/per-slot state, issues, Reset, persistence semantics, and durable cases |
| 2026-07-29 | User exact maintained-model confirmation | Current conversation | Remove the remaining ambiguity between the provisional first-proof model and the intended maintained application defaults | Brief researcher, Brief writer, and the Socratic tutor all target `runtimeKind: codex_app_server` and `llmModelIdentifier: gpt-5.6-luna`. Current Brief definitions remain incomplete and current Socratic uses `gpt-5.6-sol`, so all three leaf definitions have an explicit implementation delta. A host without Luna reports `HOST_REQUIREMENT_MISSING`; it does not substitute Sol or another model. | Applied to requirements, DS-011, proof criteria, self-validation, and SR-005 |
| 2026-07-29 | Package-default source audit | Brief/Socratic `agent-config.json`; `default-launch-config.ts`; application-owned agent/team sources; `team-definition-traversal-service.ts` | Verify existing package-owned input and traversal seams | Current Brief researcher/writer have only `runtimeKind: autobyteus`; current Socratic has `codex_app_server` + `gpt-5.6-sol` + reasoning effort. Agent/team sources already parse `defaultLaunchConfig`; traversal finds effective leaf identities but does not return launch-default ancestry. | Reuse/extend graph-local parsing/traversal; do not add another package schema/parser |
| 2026-07-29 | Package validation and project-config audit | Devkit config/loader, `pack`, `validate`, `package-validator.ts`, `application-root-validator.ts`; current maintained configs | Locate the standalone capability declaration and validation owner | Project config currently has no standalone capability field. Package validation checks structure/UI/backend but not execution slots or leaf defaults. Devkit already depends on the server project for standalone start. | Add source-only `standalone.enabled`; export one pure server validation boundary and call it from pack/project validate/start |
| 2026-07-29 | Effective-profile/readiness audit | execution-resource contract/service/store/normalizer; `application-definition-runtime-readiness.ts`; runtime validator/availability; model catalog/provider services; Studio setup panel/utils/gate | Determine current precedence, persistence, and false-readiness cause | The store can remove rows and preserve saved profiles. Current view status is `READY\|NOT_CONFIGURED\|INVALID_SAVED_CONFIGURATION`; `READY` can contain null launch profile. Runtime validator returns early for null and validates runtime names but not exact model/provider/credential readiness. Studio Reset currently resets only the draft, not persisted override. | Refactor one authority; add run-readiness result and delete/reset command; keep platform health separate |
| 2026-07-29 | Business launch audit | Brief `brief-run-launch-service.ts`; backend SDK `launch-profile.ts` | Trace fallback that masks ownership | Brief hard-codes its bundle team fallback and lets request `llmModelIdentifier` rescue a missing configured profile; SDK builds a preset when the profile is null. This defers failure to business action and allows parallel authority. | Require complete effective profile; remove business fallback/rescue semantics |
| 2026-07-29 | Prompt-authority construction audit | `create-application-run-authorities.ts`; mixed backend factory/manager; persistent/task-agent registries; `mixed-agent-member-handle.ts`; `member-team-context-builder.ts` | Bound CR-008 without repository-wide DI | The graph-local team service reaches `TeamRunService` but not `MemberTeamContextBuilder`. Root/subteam manager construction, persistent handles, task-agent handles, and restored handles need the same builder. | Exact bounded injection and semantic prompt test in design |
| 2026-07-29 | Git/task-state check | `git status --short --branch`; `git log`; `git rev-parse origin/personal` | Preserve other owners' work and record current base relation | Task HEAD was `727ef4584` at SR-005; implementation/review now place HEAD at `29f9d454a`. The tracked base has advanced and API/E2E-owned modified/untracked tests, reports, and evidence remain preserved. | Do not refresh/merge during upstream rework; include cumulative artifacts and leave final integration to delivery |
| 2026-07-29 | Architecture review round 5 and implementation rounds IR-006/IR-007 | `design-review-report.md` (`ARCH-REV-005`); implementation/code-review revision records | Establish current post-SR-005 baseline | SR-005 passed. Complete launch defaults, three-state readiness, invalid saved-row preservation, Luna targets, and graph-local prompt authority are implemented. CR-010 and CR-011 are resolved in source. | Preserve those decisions; revise only CR-009/CR-012 boundaries |
| 2026-07-29 | Full source review round 12 | `code-review-report.md` (`CRR-012`); `code-review-revision-record.md` | Re-evaluate IR-007 against approved sparse override and portability contracts | `Fail — Design Impact`, 88/100. `ApplicationLaunchConfigurationService` computes an alternate `selectedBaseline` before overlay but `ApplicationLaunchSlotView` omits it. Studio’s supported selector/inherit flow therefore substitutes no baseline or an old post-overlay result. The validator also accepts nested password, bearer authorization, and access-token-value fields. | Strengthen the launch-service read/preview contract and recursive portable-config policy; return through architecture review |
| 2026-07-29 | Selected-resource edit-boundary source trace | SDK `execution-resources.ts`; launch service/baseline builder/REST routes; Studio setup panel, slot/agent/team/member editors, draft utilities, runtime-scoped model selection | Define the smallest authoritative correction for CR-012 | Available-resource summaries carry identity only. The service’s baseline builder is the only owner of definition traversal/precedence and already constructs the required pre-overlay value during GET/PUT. A stored alternate needs that value in its slot view; an unsaved selection needs a no-write service preview. `effectiveConfiguration` is not a baseline because it contains the override being edited. | Add a distinct selected-resource baseline stage and remove UI inference; keep PUT as final recomputation authority |
| 2026-07-29 | Portable-config policy trace and reviewer probe | `application-standalone-package-validator.ts`; AutoByteus `llm-config.ts`/override schemas; CRR-012 real-package probe | Bound CR-009 without a broad token substring or secret leak | Root runtime schemas and typed pricing fields are known. Exact token-count fields are portable, while password/authorization/access-token values are host secrets even under `extra_params`. Recursive key/path classification can preserve approved tuning/pricing fields and reject sensitive fields with exact paths. | Extract one schema-aware policy; add positive token/pricing and nested negative cases |


| 2026-07-29 | Architecture/implementation/source-review rounds | `ARCH-REV-006`; `IR-008`, `IR-009`; `CRR-014` | Establish the post-SR-006 baseline | Selected-resource preview/edit, recursive package policy, complete maintained defaults, graph-local prompt behavior, and source structure passed their owning gates. | Preserve; do not reopen while correcting transport |
| 2026-07-29 | API/E2E round 5 | `api-e2e-execution-coverage-report.md` (`API-REV-005`); `evidence/api-e2e/api-rev-005-*` | Recheck clean standalone and real Brief completion | Launch/profile failure is resolved. Real Codex/Luna run creates binding/team/session descriptor, but standalone returns generic 404 at the advertised Agent Tools path, exposes no configured tools, stalls with zero artifacts; direct route regression expects 401. | Trace exact route/session/composition authority |
| 2026-07-29 | Focused failure-origin review | `code-review-report.md` (`CRR-015`, CR-013); `code-review-revision-record.md` | Classify the missing standalone route | Historical result: `Fail — Design Impact`; it inferred a broad authority gap and over-broad gateway tool set. **Superseded by CRR-016; do not implement.** Secondary broad suite remains Unclear. | Withdrawn; see the 2026-07-30 correction |
| 2026-07-29 | Agent Tools MCP source trace | `build-{studio,standalone}-application-server-composition.ts`; `agent-tools/mcp/{agent-tools-mcp-routes,agent-tool-mcp-session-service,agent-tool-mcp-session-registry,agent-tool-mcp-catalog,agent-tools-mcp-method-dispatcher,agent-tool-mcp-tool-executor}.ts`; runtime factories/cleanup | Define the smallest exact composition correction | Studio registers the internal route and external gateway separately; standalone registers neither. The trace initially interpreted constructor defaults as a new aggregate-runtime requirement. **That inference is superseded by CRR-016; the source fact that only the registrar is missing remains valid.** | Reuse the existing registrar/subsystem; do not implement the historical runtime/port proposal |
| 2026-07-29 | Session security/lifecycle trace | Agent Tools route/session types; server runtime endpoint seeding; standalone host start/close | Define auth, base URL, revocation, and stop | Session IDs/tokens are random; only token hash is retained; missing bearer is 401 and unknown/wrong/revoked is 404; origin gate is loopback-aware. Existing base-URL and cleanup behavior already works in Studio. The historical conclusion that a new aggregate close/path phase was required is superseded. | Preserve established behavior unchanged; add only the standalone registrar call |
| 2026-07-30 | User correction and focused failure-origin review | `code-review-report.md` (`CRR-016`, CR-013); `code-review-revision-record.md`; reviewed HEAD `077ebfa760ed90a1cbc3e7cd2cd9b5fe96352e51` | Recheck the tool-exposure premise before SR-007 proceeds | Default server adapters include `publish_artifacts` and `send_message_to`; configured source resolution forwards only `ToolOrigin.MCP`. Package `toolNames` cannot define the session projection. The existing route/session/catalog/dispatcher works in Studio, runtime internals are unrelated, and only standalone route registration is missing. | Withdraw SR-007 broad redesign and route the bounded composition fix to implementation |
| 2026-07-30 | Worktree correction | Implementation engineer confirmation; `git diff --name-only -- autobyteus-server-ts/src` | Prevent the superseded design from contaminating source | All broad SR-007 production-source drafts and four untracked runtime/ports/deferred-publication files were removed; production source is restored to HEAD. Other owners' tests/artifacts/evidence remain untouched. | Use corrected cumulative package for Local Fix |
| 2026-07-30 | General/Agent Tools MCP source and documentation audit | `mcp-gateway/{mcp-gateway-routes,mcp-gateway-tool-catalog,mcp-gateway-tool-executor}.ts`; `agent-tools/mcp/{agent-tools-mcp-routes,agent-tool-mcp-catalog}.ts`; default adapter providers; `docs/modules/{mcp_gateway,agent_tools_mcp_server,mcp_server_management}.md` | Resolve the user’s question about gateway purpose and application ownership | MCP Server Management imports host-configured external servers. `/mcp/gateway` re-exports all current `ToolOrigin.MCP` registry tools to external clients and excludes AutoByteus run tools. `/mcp/agent-tools/:sessionId` exposes only a run snapshot of selected eligible server adapters and selected available MCP-origin tools. | Document the three owners/surfaces; do not make the general gateway or Studio MCP state an application dependency |
| 2026-07-30 | User final MCP/runtime scope clarification | Current discussion | Decide whether Studio MCP state or runtime-internal file tooling belongs to the standalone application design | Both hosts require the run-scoped Agent Tools route. Standalone must not expose `/mcp/gateway` or inherit Studio MCP configuration. Focused applications may later declare their own MCP resources for shared platform provisioning. Codex/Claude runtime-internal tools are unchanged from `origin/personal` and are not part of this ticket. | Clarify artifacts only; no CR-013 source-scope or architecture-gate change |
| 2026-07-30 | Bounded implementation state check | `git show --stat e8e06afdd`; `git diff --name-only -- autobyteus-server-ts/src` | Verify the clarification does not require implementation rework | Current HEAD contains the implementation-owned standalone registrar change. The solution clarification adds no production-source delta; other owners' modified/untracked tests and evidence remain preserved. | Continue normal implementation/source-review/API-E2E flow without runtime-internal work |
| 2026-07-30 | IR-010/IR-011 and source review | `implementation-revision-record.md` IR-010/IR-011; `code-review-revision-record.md` CRR-017–CRR-019; commits `e8e06afdd`, `237749607`, `83b24e882` | Establish the exact pre-failure implementation baseline | Standalone route registration and graph-local Codex definition injection pass source review. The runtime now creates non-null descriptors and reaches the internal route. | Preserve these corrections; do not conflate them with CR-015 |
| 2026-07-30 | API/E2E round 7 | `api-e2e-execution-coverage-report.md` API-REV-007; `api-rev-007-actual-tools-dispatch.json`; state/browser/source-correlation evidence | Validate actual maintained standalone publication/handoff consequence | Both real members authenticate to 3/3 MCP servers, list 86 combined tools, expose `publish_artifacts`/`send_message_to`, and complete two recipient-name handoffs. Three researcher and two writer publication calls all return `Run '<graph-local id>' is not active`; journal/application projection remain empty. | Trace the concrete service/manager instance selected by the default publication adapter |
| 2026-07-30 | Focused failure-origin review | `code-review-report.md` CRR-020 / CR-015; `code-review-revision-record.md`; HEAD `7dfc050f4` | Classify the publication failure | Reachable `Design Impact`: the graph owns the correct `PublishedArtifactPublicationService`, while the default MCP provider captures a cached process-global service. Session creation and route dispatch have no reviewed contract for the exact application publication authority or cycle break. | Revise solution package and return through architecture review |
| 2026-07-30 | Agent Tools/publication construction trace | `create-application-{orchestration,run}-authorities.ts`; runtime graph; session/registry/catalog/executor/dispatcher/route; publish provider/service; Codex/Claude session creation; run/member cleanup | Find the smallest coherent authority design | The catalog/provider is constructed before graph-local `AgentRunManager`; the correct publication service requires that manager; runtime factories needed by the manager create Agent Tools sessions. Current provider captures a global service. The session registry retains the in-memory session object through authenticated dispatch, so a session-bound narrow publication port can carry the exact graph authority without a second route/catalog or request-time lookup. | Use one deferred graph port, explicit scoped session authority, and composition-supplied registry/catalog/dispatcher family |
| 2026-07-30 | Maintained server-adapter reachability inventory | `applications/{brief-studio,socratic-math-teacher}/**/agent-config.json`; default MCP adapter providers; API-REV-007 | Bound CR-015 to supported tool paths | Brief researcher/writer and Socratic tutor configure `publish_artifacts`; Brief also configures `send_message_to`. Publication is graph-sensitive. Recipient-name messaging uses the session’s graph-local `memberTeamContext.deliverInterAgentMessage` and passed live. Browser/media/task-delegation/configured-MCP providers are not configured by these maintained applications; provider-native tools are outside this ticket. | Correct publication only; preserve successful messaging; do not invent unsupported adapter findings |


## Discussion-Stage Design Self-Validation

The authoritative evidence is [design-self-validation.md](design-self-validation.md). The prior passes validated the dual-host macro architecture, package-default/readiness/prompt authority, invalid saved overrides, selected-resource sparse editing, recursive portable policy, route parity, and MCP ownership. SV-015 uses API-REV-007/CRR-020 to correct the newly disproven publication-authority premise without reopening provider-native tools or the general gateway.

Unsupported marketplace, multi-node, public-internet, mandatory standalone setup UI, and hidden-state-seeding modes remain outside scope and do not drive machinery.

The current result is `Fail — Design Impact` for CR-015. Route/auth/tool exposure and messaging remain valid; DS-014 must now connect application-created sessions to the exact graph-local publication owner with explicit construction and stop semantics. SR-010 requires architecture review before implementation resumes.

## Relevant Existing Behavior And Production Paths

The IDs below are canonical and match [requirements.md](requirements.md) and [design-spec.md](design-spec.md).

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Operational | User enters/reloads/exits an app in Studio, or operator starts the selected standalone host | Studio route/iframe and standalone root both reach the implemented shared client/runtime graph after application readiness | Dual-host presentation and standalone pre-listen launch gating are implemented and preserved | Studio host sources; standalone composition/host; IR-006/CRR-012 |
| BEH-002 | Contract / Runtime | Frontend calls `startApplication`; backend handlers receive `ApplicationHandlerContext` | Provider-local iframe/same-origin bootstrap -> normalized runtime bootstrap -> shared HTTP/WS client; backend context capabilities -> orchestration | Host-neutral startup is implemented and preserved | SDK contracts/frontend sources and tests |
| BEH-003 | Package / Persistence | Pack/import/select/start a manifest-v4 package | Shared pack/parser -> canonical identity -> immutable bundle paths -> host data roots | Same current package shape is used by both hosts | Devkit, bundle parser, selection service, digest evidence |
| BEH-004 | Resource / Runtime | App resolves a required slot, starts a real team run, and its runtime receives eligible server/configured-MCP tools | Launch authority -> graph-local run -> scoped session descriptor -> authenticated route -> session-bound publication port or session-context message delivery -> event/journal/projection | Launch, descriptor, route, tool list, and recipient-name handoff pass. Publication reaches the adapter but calls the process-global service, rejects the exact graph-local member as inactive, and produces no projection. | API-REV-007 / CRR-020; run authorities, provider/service, session/route chain |
| BEH-005 | Server / Contract | Studio/standalone composition starts and application/runtime ingress is requested | Explicit composition -> one Agent Tools process authority -> application scoped session authority + lifecycle -> browser/internal route mounts | Both hosts now mount the route. Missing boundary: composition does not provide one coherent registry/catalog/dispatcher family and application session publication authority to graph plus route. | Composition/runtime-graph sources; API-REV-007 / CRR-020 |
| BEH-006 | Developer / Operational | Developer runs maintained `dev`/`dev:studio`/`build`/`validate`/`start` | Devkit mapping -> package validator -> real host -> eligible server-tool callback -> graph publication/journal/application projection | Commands/defaults/route/auth/messaging pass. Standalone `dev` still cannot complete because every actual publication call consults the wrong manager. | API-REV-007 / CRR-020; live Brief and source-correlation evidence |
| BEH-007 | Persistence / Runtime | Host prepares storage, saves/invalidates resource configuration, recovers, or resets | Per-app platform DB stores sparse overrides/bindings/events; reader preserves invalid rows; explicit Reset deletes the row; computed baselines are not stored | Existing valid/invalid rows and schema remain directly usable; CR-012 changes only read/preview projections | `ApplicationLaunchOverrideStore`, launch service, Studio setup, storage/orchestration docs |
| BEH-008 | Runtime / Prompt | Real package-team execution constructs member system prompts | Graph-local run authorities -> mixed manager/registries -> exact graph-local `MemberTeamContextBuilder` -> prompt composer | Source correction is implemented; final prompt-semantic API/E2E proof remains downstream. | IR-006/CRR-012; mixed-team sources |

### SEC-CONSTRAINT-001 — Trusted execution boundary (not a canonical behavior ID)

Trusted backend code currently runs in a Node child process with inherited environment and host privileges, and the Studio UI iframe has no `sandbox` attribute. The dual-host proof remains limited to trusted local packages; arbitrary third-party isolation, signing, publisher trust, and marketplace enforcement are out of scope. Evidence: `application-worker-supervisor.ts`, `ApplicationIframeHost.vue`, storage and engine docs/code.

## Design Health Assessment Evidence

- Change posture: `Larger approved requirement plus downstream authority correction`
- Root cause classification: `Authoritative Boundary / Construction-Cycle Gap`
- Refactor posture: `Required for CR-015`
- Design issue signal: `Yes`

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Standalone composition / Agent Tools route | Run provisioning advertises `/mcp/agent-tools/:sessionId`; Studio registers the established registrar; standalone returns a platform 404 before its authorization gate. | The approved real application run is missing one existing route registration. | Call `registerAgentToolsMcpRoutes(app)` in standalone before static fallback. |
| Agent configuration versus Agent Tools projection | Default Agent Tools MCP providers include `publish_artifacts` and `send_message_to`; configured source resolution forwards only `ToolOrigin.MCP`. | Treating package `toolNames` as descriptor `enabled_tools` creates a false defect and unnecessary architecture. | Inspect the actual descriptor/`tools/list`; make no unrelated runtime-tool change. |
| General gateway versus application MCP dependency | `/mcp/gateway` exposes process-registered MCP-origin tools to external clients; it neither provisions those servers nor scopes them to an application. | Copying Studio MCP state into standalone would create ambient, non-portable application dependencies. | Keep `/mcp/gateway` Studio-only; defer application-owned MCP declarations/provisioning/scoping to a separate capability. |
| External MCP gateway versus internal Agent Tools MCP | `/mcp/gateway` is an optional generic Studio route; `/mcp/agent-tools/:sessionId` is the existing per-run capability route for eligible server-owned/configured-MCP tools. | Treating both as one gateway could expose too much in standalone. | Add only the established per-run registrar; keep external gateway Studio-only. |
| API-REV-007 real publication path | Both maintained Brief members authenticate, list the actual gateway tools, and hand off successfully, but all five `publish_artifacts` calls report the graph-local run inactive. | Route parity is necessary but insufficient: authenticated dispatch selects a process-global publication service that cannot own application-graph runs. | Make the authenticated session carry the exact graph-local publication port and remove publication-service capture/global lookup from the adapter. |
| Application graph versus default Agent Tools provider family | The graph constructs the correct `PublishedArtifactPublicationService` from its own `AgentRunManager` and relay, while the default adapter catalog is built against the cached global service. | Session issuance and route dispatch lack one coherent authority-selection contract. | Let the composition own the process registry/catalog/dispatcher family; let each application session carry a graph-scoped publication port. |
| Run-manager/session construction cycle | Runtime factories needed to construct `AgentRunManager` issue Agent Tools sessions; the correct publication service cannot be built until that manager exists. | Direct constructor injection without a named cycle break either recreates globals or forces mutable replacement. | Create one graph-owned deferred publication port before runtime factories, bind it once after the correct service exists and before readiness, then fail closed before bind/after close. |
| Maintained adapter reachability | Brief and Socratic configure `publish_artifacts`; Brief also configures recipient-name `send_message_to`, which already succeeds through `memberTeamContext`. | The correction can remain bounded to one graph-sensitive adapter and the common session authority rather than redesign every provider. | Preserve messaging and unconfigured adapter behavior; add no provider-native tool or general-gateway scope. |
| `hosted-application-startup.ts` (initial baseline) | Authoritative startup originally owned iframe query hints and parent messaging. | Historical host acquisition leak, already corrected by the dual-host implementation. | Preserve the implemented provider/coordinator boundary. |
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
| Brief/Socratic package defaults | Application-owned agent/team sources parse `defaultLaunchConfig`; Socratic is complete while Brief omits every leaf model. | Portable model selection has an existing owner/input, but current package validation and effective resolution do not enforce it. | Make package defaults the baseline; validate every required leaf at pack/start. |
| Configuration service/readiness | `READY` can carry `launchProfile: null`; current `INVALID_SAVED_CONFIGURATION` separately preserves an unresolvable selection or stale member details. | One status has conflicting resource-selection and runnable meanings, while the invalid-saved branch proves aggregate readiness must allow a valid package with a null affected effective configuration. | Refactor one effective-profile/readiness authority with `INVALID_PACKAGE`, `HOST_REQUIREMENT_MISSING`, `RUNNABLE`; put configurations only in per-slot views and scope host issues as `HOST_OVERRIDE` or `HOST_CAPABILITY`. |
| Studio setup/reset | Saved profiles are host data; Reset currently resets draft only, while the store can remove the row. | Studio should be an optional override adapter, not the baseline owner. | Display package defaults/provenance; save override; reset via delete to package baseline. |
| Mixed-team prompt construction | `MemberTeamContextBuilder` defaults to a global team-definition service after graph-local run construction. | Authoritative boundary is bypassed and package semantics are lost. | Inject one graph-local builder through exact root/subteam/persistent/task/recovery construction. |
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

- `autobyteus-application-sdk-contracts/src/execution-resources.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-configuration-service.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-package-baseline-builder.ts` (current name; clean-cut target: `application-launch-resource-baseline-builder.ts`)
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-standalone-package-validator.ts`
- `autobyteus-server-ts/src/api/rest/application-execution-resources.ts`
- `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`
- `autobyteus-web/components/applications/setup/{ApplicationExecutionResourceSlotEditor,ApplicationAgentLaunchProfileEditor,ApplicationTeamLaunchProfileEditor,ApplicationTeamMemberOverrideItem}.vue`
- `autobyteus-web/composables/useRuntimeScopedModelSelection.ts`
- `autobyteus-web/utils/application/applicationLaunchProfile.ts`
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
- `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-launch-profile.ts`
- `autobyteus-server-ts/src/application-platform/runtime/application-definition-runtime-readiness.ts`
- `autobyteus-server-ts/src/application-platform/runtime/application-runtime-definition-validator.ts`
- `autobyteus-server-ts/src/runtime-management/runtime-availability-service.ts`
- `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`
- `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts`
- `autobyteus-server-ts/src/launch-preferences/default-launch-config.ts`
- `autobyteus-server-ts/src/agent-definition/providers/application-owned-agent-source.ts`
- `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-definition-traversal-service.ts`
- `autobyteus-server-ts/src/application-platform/runtime/create-application-run-authorities.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-persistent-member-registry.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-instance-registry.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
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

- `autobyteus-server-ts/src/compositions/build-studio-server-composition.ts`
- `autobyteus-server-ts/src/compositions/build-standalone-application-server-composition.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts`
- `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts`
- `autobyteus-server-ts/src/mcp-gateway/mcp-gateway-routes.ts`
- `autobyteus-server-ts/src/server-runtime-endpoints.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts`

### Representative apps

- `applications/brief-studio/`
- `applications/socratic-math-teacher/`
- `applications/brief-studio/frontend-src/brief-studio-runtime.js`
- `applications/brief-studio/backend-src/services/brief-run-launch-service.ts`
- `applications/brief-studio/agent-teams/brief-studio-team/team.md`
- `applications/brief-studio/agent-teams/brief-studio-team/agents/{researcher,writer}/agent-config.json`
- `applications/socratic-math-teacher/agent-teams/socratic-math-team/agents/socratic-math-tutor/agent-config.json`
- `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`
- `autobyteus-web/utils/application/{applicationLaunchProfile,applicationSetupGate}.ts`
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

### Initial proposal-baseline gaps and contradictions

This subsection records the repository state when the proposal was first assessed. The explicit dual-host/devkit foundation has since been implemented on the task branch; the remaining reachable gaps are listed separately below.

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

### Post-implementation reachable gaps

1. **The missing standalone route is resolved:** IR-010/CRR-017 mount the established internal route; direct and live calls now reach its authorization/session/dispatcher path.
2. **Graph-local Codex definition construction is resolved:** IR-011/CRR-019 gives both maintained Brief members non-null descriptors and correct package-scoped definitions.
3. **The real publication consequence still fails:** API-REV-007 proves five authenticated `publish_artifacts` calls reach the eligible adapter, but every call asks the process-global run manager about a graph-local member and receives “run is not active”; no journal or application projection exists.
4. **Publication authority is disconnected:** `createApplicationRunAuthorities()` creates the correct graph-local publication service, but the default provider captures the cached global publication service. The authenticated session currently has no exact publication authority.
5. **Construction has a real cycle:** the graph-local publication service requires `AgentRunManager`, while constructing that manager requires runtime factories that issue Agent Tools sessions. The target must break this cycle explicitly rather than mutate a singleton or discover the graph at request time.
6. **The correction remains bounded by reachable maintained adapters:** Brief/Socratic use `publish_artifacts`; Brief recipient-name `send_message_to` already works through session-local team context. Browser/media/task delegation/configured MCP providers are not pulled into this finding.
7. **Internal/external/native boundaries remain unchanged:** package `toolNames` are not the descriptor list, provider-native tools stay outside scope, `/mcp/gateway` remains Studio-only, and standalone does not inherit Studio MCP configuration.

### Inference discipline

- The initial “no standalone host” finding was based on repository-wide path/term/command searches plus inspection of every named application framework package. It describes the original proposal baseline, not the current task branch after implementation.
- “No sandbox” means no enforceable Node/OS/container/frontend sandbox was found in the inspected production path. It does not deny the existing IPC boundary, path validation, storage split, or process crash containment.
- “Semver not enforced” means search and parser/launch inspection found parsing only; no range comparison was found. A downstream implementation should recheck before changing compatibility behavior.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject and location: Per-app roots under `<app-data-dir>/applications/<application-key>/`, with app-owned `db/app.sqlite`, platform-owned `db/platform.sqlite`, logs, and runtime status; global orchestration lookup under `applications/_global/db/orchestration.sqlite`.
- Current semantic split: App business schema/data belongs in `app.sqlite`; binding, journal, migration metadata, and recovery state remain platform-owned.
- Current readers/writers: Application worker receives `ApplicationStorageContext` for app data; platform storage/orchestration services own reserved stores and migration ledger. `ApplicationLaunchOverrideStore` persists per-slot sparse host overrides in `platform.sqlite`; its explicit delete operation is the reset-to-package-default mechanism. Manifest/selected baselines and selection preview are computed and never stored.
- Current migration behavior: App SQL runs lexicographically, is checksummed, and is rejected for forbidden platform/SQLite control identifiers/patterns.
- Target design data outcome: `Directly Usable — No Migration`; definition baselines remain immutable/current computed inputs, saved rows remain sparse higher-precedence selection/field overrides, and reset deletes the row. The selected-baseline/preview projection adds no stored field, schema, or transformation.
- Future design implication: The first portability proof should reuse the same storage lifecycle with different host data roots. A future package version/update contract must separately define app migration rollout, backups, failure recovery, and rollback; current analysis does not select transformation mechanics.
- Required semantics preserved by direct use: Current per-app app/platform separation and migration ownership can be reused directly for a local single-node proof.

## Constraints / Dependencies / Compatibility Facts

- Initial evidence baseline was `origin/personal` at `d6983612c5a77fb94d9266df85a9d03fe2d1c68b`; the implementation/design-review baseline was refreshed to `origin/personal` at `6caf809303294252c109420b238588f0c68aca6a` on 2026-07-29. The current focused failure-origin baseline is task commit `7dfc050f4` (`CRR-020`).
- Existing Studio behavior must remain the first authoritative host path.
- The same-package/two-host structure is implemented. Final conformance must still prove one unchanged package completes the configured-tool, team-handoff, and artifact journey through both hosts after the internal transport correction.
- Current application contract versions are exact: manifest `4`, backend bundle `1`, backend definition `4`, frontend SDK `4`.
- Current package/parser owners reject unknown fields rather than retaining them.
- No backward-compatibility wrapper, copied server fork, mock-only portability path, duplicate Agent Tools route, runtime-internal tool change, or external-gateway exposure should be recommended.
- Arbitrary third-party package execution is outside a trusted portability MVP.

## Open Unknowns / Decisions Required

- Resolved: Brief Studio remains the representative proof.
- Resolved: The current broad server is not a standalone fallback; explicit compositions remain authoritative.
- Resolved: Native commands remain `dev`, `dev:studio`, `build`, `validate`, and `start`; no extra project is introduced.
- Resolved: `standalone.enabled: true` is source-only devkit project metadata and does not alter manifest v4.
- Resolved: A standalone-enabled package owns the baseline runtime/model for every required effective leaf. The user-confirmed target for Brief researcher, Brief writer, and the Socratic tutor is `codex_app_server` / `gpt-5.6-luna`; the current Socratic Sol value and incomplete Brief values are implementation inputs, not target defaults.
- Resolved: Studio persistence is an optional override overlay. Reset removes it and exposes package defaults; standalone normally has no row and no mandatory setup UI.
- Resolved: Effective field precedence is exact host member override > host slot/team override > innermost application-owned team default > outer team defaults nearest-first > leaf application-owned agent default; no process-global model/provider fallback.
- Resolved: Package completeness and host availability are distinct. Pack/validate yields `INVALID_PACKAGE`; runtime/model/credential absence yields `HOST_REQUIREMENT_MISSING`; only a complete validated result is `RUNNABLE`.
- Resolved: A valid package plus invalid/stale saved override also yields `HOST_REQUIREMENT_MISSING`, with `HOST_OVERRIDE` issue scope. The valid package baseline and raw saved row remain visible, the affected effective configuration is null, launch is blocked, and only explicit replacement or Reset/delete permits reevaluation.
- Resolved: Manifest package baseline, selected-resource pre-overlay baseline, sparse saved override, and post-overlay effective configuration are distinct meanings. GET exposes the current selected baseline; an unsaved selection uses a no-write, exact-identity preview through the same graph-local builder. Studio does not traverse definitions or reuse effective configuration as inheritance.
- Resolved: For mixed-runtime teams, blank bulk runtime/model means per-member inheritance. Team-wide model selection is disabled until an explicit common runtime is selected; member catalogs use their resolved runtimes.
- Resolved: One recursive schema-aware portable policy accepts exact token-count/pricing fields and rejects nested credential/password/authorization/token-value/endpoint/workspace semantics with paths and without values. No compatibility or application-specific exception exists.
- Resolved: CR-008 is a bounded graph-authority correction through mixed-team construction, not a catalog merge or repository-wide DI rewrite.
- Resolved by CRR-016/SR-008: standalone registers the existing `/mcp/agent-tools/:sessionId` route before static fallback; `/mcp/gateway` remains a separate optional Studio-only surface.
- Resolved by CRR-016/SR-008: Agent Tools MCP projects eligible server-owned adapters such as `publish_artifacts`/`send_message_to` and selected available `ToolOrigin.MCP` tools; it never derives `enabled_tools` by copying package `toolNames`.
- Superseded by API-REV-007/CRR-020: CRR-016 was correct that route registration was a bounded fix, but its claim that the unchanged default provider family was sufficient for graph-local publication is disproven. The withdrawn SR-007 aggregate runtime remains non-authoritative; SR-010 introduces only the newly evidenced process/session publication boundary and one narrow cycle-breaking port.
- Resolved by user clarification/SR-009: Studio MCP Server Management state and general `/mcp/gateway` exposure are not standalone application dependencies. The current ticket makes no Codex/Claude runtime-internal tool change.
- Resolved by SR-010 target design: one composition-owned Agent Tools process authority supplies the exact registry/catalog/executor/dispatcher family to route registration and application session issuance. Each application session carries its graph-scoped publication port; the publish adapter cannot capture or discover a process-global publication service.
- Resolved by SR-010 target design: one graph-owned deferred publication port is created before runtime factories, bound exactly once to the graph-local service before application readiness, fails closed before bind and after close, and is closed only after the scope’s sessions are revoked during lifecycle stop.
- Deferred: Application-owned MCP resource declaration/provisioning/scoping, optional standalone override CLI/config adapter, future `.abapp`, packaged/versioned skill/tool dependency policy, optimized host distribution, and broader deployment/security programs.
- Implementation detail requiring care, not product ambiguity: runtime-specific credential checks must use current provider/runtime capability owners behind a narrow host-validation port; do not infer secrets from package fields.

## Notes For Design-Impact Reroute

`CRR-020` / CR-015 returns this package through architecture review. Preserve every passed macro, launch, edit, prompt, route, capability-security, messaging, and MCP-surface decision; revise only the graph-sensitive application publication boundary:

- construct one `AgentToolsMcpProcessAuthority` at the composition root, owning the exact registry, catalog, executor, dispatcher, and route dependencies used in that process;
- create an application-scoped Agent Tools session authority over that process family and inject it into application Codex/Claude construction and run/member cleanup paths;
- create one `DeferredPublishedArtifactPublicationPort` before application runtime factories; bind it exactly once to the graph-local publication service after the graph `AgentRunManager` and relay exist and before readiness;
- store the narrow non-wire publication port on each application-created session. The default `publish_artifacts` provider resolves only the authenticated session port and fails before journal/projection mutation when missing, unbound, closed, or wrong-scope;
- register the route using dependencies from the same process authority. Do not construct independent default registries/catalogs/dispatchers, merge catalogs, replace a mutable singleton, branch by package ID, or look up an application graph during a request;
- on stop, block new scoped sessions, revoke all sessions created by that application scope, close the deferred port, then dispose graph run/publication/event owners. Restart constructs a fresh scope;
- retain current capability tokens, 401/404 behavior, URL derivation, tool eligibility, successful recipient-name messaging, provider-native tool boundary, and Studio-only external `/mcp/gateway`;
- durable proof must use deliberately distinct global and graph managers, exercise the default provider through the authenticated route, prove exact graph event/journal/projection, prove pre-bind/after-close failure and scope revocation, then rerun real standalone and Studio Brief publication/handoff;
- `APIE2E-REPO-005` remains preserved as Unclear and unrelated.
