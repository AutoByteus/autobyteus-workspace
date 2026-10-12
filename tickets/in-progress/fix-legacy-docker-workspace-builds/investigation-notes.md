# Investigation Notes

## Investigation Meta
- Package identifier: fix-legacy-docker-workspace-builds
- Request: Project Task b2b611bb-9a5d-49da-b1dc-fc1c8f80d42a; delegator /project_task_manager (project_task_manager_a5f6d9d306e54970bafdad895bdf731d)
- Workspace root/task worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds
- Repository mode: Git
- Branch: codex/fix-legacy-docker-workspace-builds
- Resolved base: origin/personal @ 2756d7b298ca5b203ebd2310d172b37a5d381b5c (fresh git fetch origin personal, 2026-10-12)
- Finalization target: origin/personal
- Bootstrap result: dedicated worktree created; shared personal checkout has unrelated changes and will not be used for authoring.
- Bootstrap blocker: None
- Current solution revision: N/A — initial draft
- Authorities read: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/SKILL.md; references/requirements-engineering.md; requirements-doc and investigation-notes templates; root AGENTS.md (2026-10-12).
- Investigation status: Begun

## Initial Request And Clarifications
Restore both legacy Docker builds and healthy startup from current origin/personal, retain AGPL files/labels, prefer workspace-graph resilience and inexpensive build regression coverage. User reserves removal decisions. Evidence attached: /Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_b2b611bb-9a5d-49da-b1dc-fc1c8f80d42a/context/ctx_a978bb610209__api-e2e-execution-coverage-report.md (read before acting).

## Source Log
| Date | Type | Exact source / command | Observation |
| --- | --- | --- | --- |
| 2026-10-12 | Runtime report | Attached API/E2E report, BAS-001 | Reports missing agent-presentation and collaboration-stream workspace copies/builds in both tracked Dockerfiles; validation-only remote-server image built and ran. Not fresh execution proof for this task. |
| 2026-10-12 | Command | git status --short; git branch --show-current; git remote -v | Shared checkout is personal with unrelated modified/untracked files; origin is git@github.com-ryan:AutoByteus/autobyteus-workspace.git. |
| 2026-10-12 | Command | git fetch origin personal; git rev-parse origin/personal; git worktree add -b codex/fix-legacy-docker-workspace-builds /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds origin/personal | Fresh base 2756d7b298ca5b203ebd2310d172b37a5d381b5c; isolated authoring workspace created. |

## Supplemental Artifact Inventory
| Path | Owner | Purpose | Scope | IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| Attached report path above | Prior API/E2E engineer | Baseline defect and validated fix-shape evidence | BAS-001 only | Pending IDs | Historical evidence | Evidence, not normative supplement |

## Product Design Context
Not stated; infrastructure repair, no new UI/UX request.

## Architecture Investigation Findings
Pending approved requirements and architecture reading gate.

## Requirements Investigation — Evidence E-001..E-006
- E-001: Attached API/E2E report BAS-001 and tickets/done/agpl-dual-licensing-slice-2/{implementation-handoff.md,api-e2e-execution-coverage-report.md} UD-002 agree on missing agent-presentation/collaboration-stream workspace packages. Historical reports, not newly executed image validation.
- E-002: `cat docker/Dockerfile.remote-server docker/Dockerfile.allinone autobyteus-server-ts/docker/Dockerfile.monorepo; cat autobyteus-server-ts/package.json autobyteus-web/package.json pnpm-workspace.yaml; python3 manifest inventory`. Both legacy files omit package manifest/source/build/runtime copies; both server production and web dev deps require the missing packages. Monorepo explicitly includes/builds all three contract packages; it is NOT automatic graph-driven packaging. All final stages already copy LICENSE/LICENSING.md/NOTICE and declare AGPL-3.0-only.
- E-003: `cat docker/{README.md,compose.personal-test.yml,remote-server-entrypoint.sh,allinone-start-server.sh,allinone-start-web.sh,supervisor-allinone.conf}; sed/rg scripts/personal-docker.sh`. Main image retains Nuxt development web startup with GraphQL codegen and inherited Chrome/VNC; remote-server is an ordinary server node for registration/remote access, not an LLM provider. Both remain documented. Startup creates .env only when absent; log and data paths differ intentionally; preserve them.
- E-004: `cat .dockerignore; cat scripts/tests/test_docker_build_context_sources.py`. Root context excludes all dist/build/node_modules. Even tracked contracts dist cannot be relied upon in a Docker build; build scripts must produce outputs. Existing no-dependency Python unittest checks source existence and hardcodes team-stream copy/build/install/runtime lines; it would miss the two reported omissions.
- E-005: `cat .github/workflows/release-server-docker.yml; ls .github/workflows`. Existing release workflow publishes monorepo only; no legacy image check. Existing scripts/tests Python harness is a cheap check extension point. Unrelated publishing should remain unchanged.
- E-006: Prior validation-only `tickets/done/remove-autobyteus-remote-provider/api-e2e-evidence/docker/Dockerfile.remote-server.validation` (read full) adds both manifests/source/runtime copies and builds agent → collaboration → team before server/mobile. `container.log` tail shows backend listening and cache startup completed. This is fix-shape corroboration, not final-image proof for this task.

## Supported Current Paths / Structural Inventory
BEH-001: Docker root context → legacy builder copy lists → pnpm install → contract/server/mobile build → distinct runtime copy lists → existing entrypoint or base supervisor. Current install stops on workspace package lookup.
BEH-002: Each runtime stage copies root license payload and label; no intended legal/content change.
BEH-003: Python static COPY/team-stream test; monorepo-only release CI.
BEH-004: Normal supported fresh/restart lifecycle uses /home/autobyteus/data and existing env files; no schema/data-writer change intended.
Payloads: manifests, tsconfig/source/dist, node_modules workspace symlinks, root license files, generated mobile page. Structural surfaces: only legacy deployment recipe/check wiring. Application APIs/persistence/security/concurrency: unchanged.

## Persisted Data And Product Design
No persisted data schema/semantics changes; no migration necessary. Existing test-owned data can be disposable, user volumes must not be reset. Product Design: N/A — infrastructure repair with preserved web service, not UX design.

## Supplement Inventory Addendum
Historical evidence at task-worktree `tickets/done/remove-autobyteus-remote-provider/api-e2e-evidence/docker/{Dockerfile.remote-server.validation,container.log}` and `tickets/done/agpl-dual-licensing-slice-2/{implementation-handoff.md,api-e2e-execution-coverage-report.md}`; owners prior implementation/API-E2E; purpose baseline/fix-shape evidence; scope BAS-001/UD-002; related REQ-001..003/AC-001..004; status historical; no normative approval applicability.

## Bootstrap/Authority Updates
Task base root AGENTS.md also requires RELEASE.md before finalization. DESIGN.md byte-identical to original shared checkout (cmp succeeds); base TESTING.md is a shorter 196-line global version, read in full and authoritative. No docker/scripts/.github scoped AGENTS/DESIGN/TESTING files found. autobyteus-server-ts/AGENTS.md read for comparison. Requirements-engineering gate and templates completed.
Docker server 29.0.1 responds; Node v22.23.1; Python 3.9.6; pnpm available. No image builds or source edits performed by Solution Designer.

## Assumptions, Unknowns And Risks
ASM-001: Actual registry/base downloads and inherited browser-service startup still need downstream execution. File wiring evidence is sufficient for design, not certification. Existing monorepo explicit lists retain maintenance cost; don't falsely claim automation. Scope decisions in requirements are within repair direction; no pending user choice.

## Architecture Investigation Findings — A-001..A-006 (After R1 Approval)
- Authorities read 2026-10-12: solution-designer references/architecture-design.md; references/design-principles.md (full, including practical guide/design health/classification); templates/design-spec-template.md; task-worktree DESIGN.md (matches initially read root); TESTING.md; root AGENTS.md. No scoped docker/scripts authorities. RELEASE.md finalization target/default no-release sections consulted; Delivery must read full current file before finalization. No principle conflict. Product supplements/migration policies: N/A because no product design or data transformation.
- A-001: Re-read contract manifests and server tsconfig.build.json after R1 approval. All three contracts export dist/index.js/types, collaboration and team depend on agent-presentation. Server production paths={} resolves installed package outputs, not source aliases. Root .dockerignore removes **/dist so rebuilding is necessary. Target builder dependency order must respect these declared edges.
- A-002: Server package prebuild → prepare:shared builds autobyteus-ts, application-sdk-contracts and application-backend-sdk, then Prisma. Backend SDK is a build-hook root even though not a server manifest dependency; don't remove its builder/install inclusion. Core package postinstall invokes scripts/fix-node-pty-permissions.mjs; full sources currently precede install in both legacy files and satisfy this hook. Monorepo additionally copies that script before its earlier install boundary.
- A-003: Runtime root node_modules contains pnpm store and per-package workspace symlinks target sibling package paths under /app. Full directory copies in legacy recipes preserve package node_modules, compiled dist, package.json and package-specific license files. Missing runtime contract directories would fail even after fixing installation. Remote runtime intentionally lacks a full web package and only receives generated mobile assets; allinone retains full web for codegen and Nuxt dev.
- A-004: Official pinned-major pnpm docs checked 2026-10-12: https://pnpm.io/10.x/filtering documents package^... for dependency-only closure, ordinary --filter includes dev dependencies unlike --filter-prod, and multiple filters select a union. https://pnpm.io/10.x/cli/recursive documents topological sorting by default and --workspace-concurrency=1. These support replacing contract-name build enumeration with existing pnpm graph selection, not introducing a staging framework. Current public latest docs have newer-version additions; the 10.x pages are the relevant authority for this repository's pnpm 10 pins.
- A-005: Re-read ordinary entrypoints, supervisor and Compose settings: remote directly execs dist/app.js; allinone inherits base-image startup with program autobyteus_server then autobyteus_web. Web wrapper waits for backend GraphQL, runs codegen against internal backend URL then Nuxt dev at WEB_PORT. Preserve Node/VNC bases, entrypoint inheritance, ports and allinone cap_add/security_opt supplied by existing Compose; no new security model. Docker metadata responded but no cached node:22/chrome-vnc images were listed by filtered `docker image ls`; registry pulls remain an external validation prerequisite.
- A-006: Read src/api/rest/health.ts, src/api/static/mobile-web.ts, src/api/security/remote-access-route-policy.ts, src/api/graphql/types/server-settings.ts and web codegen.ts. Health reports status=ok. /mobile[/...] is PUBLIC_STATIC and resolves first to server/mobile-web; missing assets cause explicit 404. Public GraphQL updateServerSetting/getServerSettings can seed/read back a disposable nonsecret key across restart without hidden-file mutation. GraphQL codegen needs a real backend schema. Startup verification must cover web as well as backend; no provider inference required.

## Architecture Implications / Remaining Limits
Existing deployment ownership absorbs bounded package-payload corrections. A generic workspace-contract guard belongs in existing scripts/tests rather than another production packager. Dependency-driven build selectors can remove the contract-order maintenance list, while explicit COPY lists still require maintenance; document that residual risk honestly. Real image smoke must pin the built image ID for running/inspection, use loopback dynamic port bindings and unique owned data/browser volumes, and delete only the created tag/container/volumes, never global prune or shared base images. Actual validation/implementation remains specialist-owned.

## Usage Investigation — U-001..U-003 (User Request After D1)
User interrupted to ask what personal Compose/allinone/remote are used for before any implementation handoff. Canonical brief: usage-investigation.md (Solution Designer-owned evidence supplement; purpose scope decision, all build use cases, historical and current sources).
U-001: Re-read personal Compose/wrapper/docs and released server Compose/launcher docs. Legacy stack is source-built web-in-Docker developer harness; remote service is lightweight temporary backend node, not the removed LLM provider. Public monorepo image provides server/mobile/browser/CLI environment, no separate Nuxt dev web service.
U-002: Read-only docker ps -a inventory: autobyteus-server-0..6 all use autobyteus/autobyteus-server:beta. Selected labels confirm com.autobyteus.launcher=server-docker for all seven. No personal stack/stopped containers or local legacy image tags; no shared-checkout docker/.runtime directory. Current local non-use only; no claim about other machines or historical use. No container/data modifications or app requests/model calls.
U-003: Original personal setup requirements and aggregated-validation.md 2026-02-26 mention gateway/sync. Current up action only Compose start and fixture seeding; sync decommission/messaging removal in git history. Non-ticket references to legacy recipes confined to wrapper, Compose, docs and tests; release uses monorepo.
Implication: recommend retiring entire developer harness only if user no longer needs it; user decides. Hold forward work/DEC-004 in this conversation. No removal approval or implementation handoff.

## SR-004 — Error Attribution / Consolidation Evidence U-004..006
U-004: Rechecked the baseline report's BAS-001 finding and AGPL UD-002 handoff; failing boundary pnpm install, error ERR_PNPM_WORKSPACE_PKG_NOT_FOUND, both legacy recipes omit two required workspace contracts. Current static compare: each omitted directory has 0 references in each legacy file and 13 in monorepo. No fresh image execution claimed.
U-005: Read server docker-start.sh/build.sh and Compose: local source helper invokes build.sh → Dockerfile.monorepo with repo-root context; default/--build-local selects local build, --pull-remote selects published image. Release workflow default and zh steps both name the same monorepo recipe. This removes the premise that keeping local source builds requires the broken legacy variants.
U-006: Published launcher docs support repeated new-container for multiple remote backend nodes. Current seven monorepo nodes corroborate actual use. The legacy lighter remote recipe is unnecessary for that supported role; it is only a distinct developer test-harness option without Chrome/web dev. Monorepo still lacks a separate Nuxt dev server; preserve normal pnpm dev/isolated desktop for frontend testing rather than claim exact replacement of every old harness capability.
Recommendation: retain monorepo pipeline/source helper/public launcher; retire old personal stack if user explicitly approves. Proposal and exact safe code/documentation scope recorded in usage-investigation.md. No product edits or implementation handoff.
