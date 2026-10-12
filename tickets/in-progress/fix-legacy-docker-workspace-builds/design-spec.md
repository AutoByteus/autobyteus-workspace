# Design Spec — Legacy Docker Workspace Build Repair

## Solution And Approval Basis
- Package: fix-legacy-docker-workspace-builds
- Current solution revision: SR-002; design baseline D1
- Design status: Blocked — user requested scope/relevance check before implementation handoff; D1 retained repair-option proposal only
- Approved requirements: R1 / SR-001; Solution Designer within the task direction, user informed in 2026-10-12 conversation notice beginning “I’ve approved the repair requirements within the requested scope”. REQ-001..004, AC-001..006 unchanged.
- Behavior-defining supplements: N/A — not applicable
- Canonical investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/tickets/in-progress/fix-legacy-docker-workspace-builds/investigation-notes.md
- Authorities read: solution-designer/SKILL.md; references/architecture-design.md; references/design-principles.md; templates/design-spec-template.md; /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/{AGENTS.md,DESIGN.md,TESTING.md}; autobyteus-server-ts/AGENTS.md; official pnpm 10.x filtering/recursive docs (2026-10-12). design-examples.md: N/A — no novel architecture needs an example reference.
- Principle conflicts/discrepancies: None. Refreshed task base is origin/personal @ 2756d7b298ca5b203ebd2310d172b37a5d381b5c; do not use the older shared personal checkout as the source authority.

## Current-State Read
E-001..006 and A-001..006 in investigation-notes.md cover the complete build-to-start path. Both legacy builders and runtime copy lists omit the agent-presentation/collaboration contract packages. Existing server/web package manifests already establish the required dependencies; this is missing materialization, not missing product capability. The released monorepo recipe has explicit copies/builds and demonstrates the correct package graph. It is not automatically resilient to future package additions.

Install success is only one boundary. Contract dist must be rebuilt because Docker excludes dist, package symlink targets must survive runtime staging, and allinone must start its Nuxt process through existing supervisor/codegen, not just boot the backend. Current license runtime directives already satisfy the intended static contract; retain and prove them in actual images.

## Architecture Investigation Evidence
| Evidence | Source | Decision supported | Remaining uncertainty |
| --- | --- | --- | --- |
| E-002/004/006, A-001 | Legacy/monorepo Dockerfiles, .dockerignore, manifests, validation-only copy | Add both missing packages at manifest/source/runtime boundaries; build dependency outputs from source | Real repaired image execution required |
| A-002 | Server prepare:shared/prebuild and core postinstall | Keep backend SDK as a build root and full sources before install; leave lifecycle hooks intact | No hook rewrite planned |
| A-003/005 | Per-package workspace dependency paths, runtime copy lists, startup wrappers and Compose | Preserve each image's current layout, base and process lifecycle | Inherited base services must be run, not assumed |
| A-004 | [pnpm 10 filtering](https://pnpm.io/10.x/filtering), [recursive execution](https://pnpm.io/10.x/cli/recursive) | Dependency-only filters plus recursive sorted build remove contract-order enumeration | Verify pinned pnpm behavior in Docker execution |
| E-004/005, A-006 | Existing Python test harness, health/mobile/settings HTTP contracts | Extend cheap graph-aware guard; add owned-resource real-image smoke | Static guard does not emulate Docker/pnpm fully |

## Intended Change
Repair the existing two-stage recipes, preserving Docker image identities and deployment contracts. Make dependency builds graph-driven and source/runtime copy drift detectable from manifests. Add opt-in real-image smoke in the existing scripts/tests area; document both check commands in docker/README.md. No new public release workflow or production packaging subsystem.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved intent / AC | Trigger / current evidence | Target path / preserved outcome / spine |
| --- | --- | --- | --- |
| BEH-001 | REQ-001,002 / AC-001,002,004 | Root-context build/run; E-001..004/A-001..003 | Complete builder inputs → pnpm links → topological dependency builds → server/mobile build → runtime sibling package copies → normal backend and allinone web readiness. DS-001/002 |
| BEH-002 | REQ-003 / AC-003 | Recipient receives built image; E-002 | Existing final-stage root license copies/OCI label retained, inspected by smoke; contract package licenses retained by full copies. DS-001/002/003 |
| BEH-003 | REQ-004 / AC-005 | Maintainer invokes checks; E-004/005 | Current manifest graph → existing Python source test → actionable missing-phase failure; opt-in real build/run smoke independently proves lifecycle. DS-003 |
| BEH-004 | REQ-002 / AC-006 | Existing owned data-mounted container restart; E-003/A-005/006 | Current entrypoints/readers/data volumes unchanged; API-written test state survives stop/start and readiness recovers. DS-001/002/003 |

## Relevant Supplemental Task Artifacts
Historical input only: attached API/E2E report BAS-001; current-base tickets/done/remove-autobyteus-remote-provider/api-e2e-evidence/docker/{Dockerfile.remote-server.validation,container.log}; tickets/done/agpl-dual-licensing-slice-2/{implementation-handoff.md,api-e2e-execution-coverage-report.md} UD-002. Absolute paths and ownership/status are indexed in investigation and solution-handoff.md. No Product/UI/UX supplement. Independent architecture review: N/A — classification/rules will determine applicability, not a fabricated review pass.

## Task Design Health Assessment (Mandatory)
- Change posture: Bug Fix plus bounded regression tooling.
- Current design issue: Yes — recipe payload lists violate existing dependency invariants; not an application boundary problem.
- Root cause: Local Implementation Defect; Missing Invariant in the team-stream-only static check.
- Structural triggers: duplicated package-name build coordination across recipes is reduced using pnpm's existing graph owner. No new subsystem, mixed-level API access, shared DTO looseness, persisted transition or compatibility trigger. Explicit runtime layouts still fit their differing image roles.
- Refactor needed now: No production architectural refactor. Replace narrow hardcoded team-only test policy with dependency-aware checking inside the same testing owner.
- Evidence/response: A-001..005; add payloads, use dependency build closure, extend existing test. Don't copy the whole repository or build unrelated applications to conceal missing inputs.
- Intentional deferral: COPY lists remain explicit; graph guard detects necessary edits but does not manufacture arbitrary new package layouts/build semantics. Monorepo production staging and provider CLI policy stay out of scope.

## Terminology
Build closure includes workspace dependencies/dev/optional (and applicable workspace peers) of server and web plus backend SDK build-hook root. Runtime closure is server production dependencies (plus their production closures); allinone additionally needs web development dependencies because its supported lifecycle runs codegen/Nuxt dev.

## Legacy Removal Policy / Removal Plan (Mandatory)
| Item | Why unnecessary / replacement | Scope |
| --- | --- | --- |
| Legacy recipes' single named team-stream build RUN | Dependency-closure build handles all contract dependencies and topological order | In this change |
| Static assertion policy that treats only team-stream package as sufficient | Manifest-derived closure/phase checks cover existing and newly required packages | In this change |
No dead production code found in touched recipe/script paths: both Dockerfiles are reached through documented Compose. Do not delete them as “legacy” or confuse server-node remote access with removed LLM provider. No wrapper, alternate package-fallback download, dual-build path or compatibility shim retained. The historical validation Dockerfile remains evidence, not an alternate product recipe.

## Persisted Data / State Transition Decision
Not Affected. No application source, serialization, database schema, config-reader semantics or data-root changes. Existing data and browser volumes stay under the same owners; no migration or startup admission redesign. Smoke owns disposable data only. AC-006 verifies ordinary reuse without resetting volumes. Migration plan/convention investigation: N/A — no transformation is designed.

## Data-Flow Spine Inventory / Primary Execution Spines
| Spine | Scope / behaviors | Start → end | Owner / purpose |
| --- | --- | --- | --- |
| DS-001 | Primary end-to-end UC-001 / BEH-001,002,004 | Developer root build → remote builder → runtime staging → ordinary remote entrypoint → backend/mobile readiness | remote-server Dockerfile owns image construction; existing entrypoint/server own startup |
| DS-002 | Primary end-to-end UC-002 / BEH-001,002,004 | Developer/Compose build → allinone builder → runtime staging → inherited base/supervisor → backend GraphQL → codegen/Nuxt + browser-service readiness | allinone recipe owns materialization; existing base/supervisor/wrappers own process sequencing |
| DS-003 | Primary end-to-end UC-003 / BEH-003 | Maintainer check → manifests/recipe inspection → static failure or clean source → real image build → normal run/restart assertions → diagnostic/cleanup receipt | scripts/tests owns only verification, not application startup policy |
| DS-004 | Bounded local DS-003 | Start owned container → bounded HTTP readiness retry → assertions/restart → retain logs → exact resource cleanup | Smoke runner; makes readiness/failure/ownership explicit |

## Spine Narratives / Actors / Ownership Map
DS-001 materializes every required package before pnpm install, builds workspace dependencies before consumers, and carries the same /app sibling paths to runtime so Node can follow pnpm links. The ordinary entrypoint starts the real backend on test-owned data; mobile bytes come from the server's existing mobile-web path.
DS-002 follows the same builder graph, retains full web sources/dependencies in runtime, and lets the existing inherited supervisor start the backend and then GraphQL-driven web codegen/Nuxt dev. Base browser services remain governed by Chrome/VNC base lifecycle.
DS-003 uses source-level graph checking for cheap feedback, then an opt-in script builds exactly the tracked recipes and runs their ordinary lifecycle. License and package assertions accompany HTTP/start/restart checks; cleanup never changes other stacks. DS-004 is only finite readiness/restart/cleanup within that runner, not a new production scheduler.
Main-line nodes: developer/Compose (requested configuration); Dockerfile (image inputs/order/layout); pnpm (workspace linking/topological builds); existing startup wrappers/base supervisor (process lifecycle); application server/web (HTTP readiness). Test runner owns resources/evidence, not server business invariants.

## Thin Facades / Return-Event Spines
N/A — no new facade or production event path. Script exits/JSON reports are verification outcomes; application APIs remain unchanged.

## Off-Spine Concerns Around The Spine
| Concern | Serves / spine | Responsibility / risk if confused |
| --- | --- | --- |
| License staging | Runtime image owner / DS-001,002 | Preserve files/label; declaration-only test is not built-image proof |
| Root .dockerignore | Build context owner / DS-001,002 | Excludes host outputs; requires real dependency builds, never use host dist as proof |
| Source guard | Maintainer / DS-003 | Detect missing staging/build wiring; must not become a production packager or claim startup certification |
| Evidence/cleanup | Smoke / DS-003,004 | Logs, immutable image IDs, exact resource inventory and cleanup; never global prune |

## Ownership Boundaries / Encapsulation / Dependency Rules
Existing Docker CLI/Compose build boundary → recipe → pnpm/package lifecycle; existing ordinary entrypoint → server HTTP boundary; base supervisor → established allinone wrappers. No application source rewrite, bypass to internal APIs, manually manufactured production state or replacement entrypoint to make validation pass.
Allowed: test reads manifests and Dockerfile instructions; test invokes Docker, runs package imports inside final image, and uses HTTP/GraphQL to seed/read disposable state. Forbidden: imports from web to core, whole-repo staging, custom dependency installer, skipped lifecycle hooks, host node_modules/dist injection, user-profile reads/writes, global Docker cleanup.
New shared representation is limited to test-local package-name → relative directory/manifest map and build/runtime closures; one meaning each, no competing manifest registry. Reuse logical_instructions/copy_tokens parser already in the context test; extend for relevant stage/order information rather than cloning it elsewhere.

## Interface Boundary Mapping / Check
| Interface | Single subject / explicit identity | Notes |
| --- | --- | --- |
| Existing root-context Docker build -f each named recipe | One image; exact file path | Preserved Node/base tags and build args |
| Python source test command | Repository recipe/manifest wiring | No Docker/provider credentials; source failures nonzero |
| Proposed legacy_docker_images_smoke.py --output-dir <fresh-path> [--platform linux/amd64|linux/arm64] | These two legacy images; unique owned names and recorded immutable image IDs | Default checks both; fresh output only; optional per-image convenience must not certify both |
Existing interface responsibility/identity remains clear and natural. No generic multi-owner API introduced.

## Existing Capability Reuse / Subsystem Allocation
Extend existing docker/ recipes and scripts/tests verification capability. No shared production builder/framework needed; pnpm already owns graph builds. docker/README.md owns maintainer entry commands. Flat script placement is clearer than a new module tree for a bounded verification script.

## Draft → Reusable Structures → Final File Responsibility Mapping
| Path / change | Owner / concrete responsibility | Must not contain |
| --- | --- | --- |
| docker/Dockerfile.remote-server — Modify | Existing remote image; add missing manifest/source/runtime package copies and dependency build closure | New server functionality, web dev runtime, provider removal policy |
| docker/Dockerfile.allinone — Modify | Existing main image; same graph correction, preserve web runtime/base lifecycle | New security/entrypoint/base policy |
| scripts/tests/test_docker_build_context_sources.py — Modify | Existing source check; derive build/runtime requirements from workspace graph and verify phases/order | Hardcoded “only these two packages”, whole Docker emulator or production assembly |
| scripts/tests/legacy_docker_images_smoke.py — Add | Opt-in stdlib Python real build/run/license/import/restart/check/cleanup runner | Registry publish, global prune, model calls, existing volume writes |
| scripts/tests/test_legacy_docker_images_smoke.py — Add if runner logic needs unit coverage | Fake-Docker/error/cleanup protocol assertions, no application mocks as final proof | Claim actual image readiness from doubles |
| docker/README.md — Modify | Document cheap source check and real-image check, prerequisites and limits | Claim automatic COPY graph staging or public release guarantees |
Root package.json optional script alias is not necessary. .github/release-server-docker.yml, monorepo Dockerfile, root TESTING.md, application sources and package dependency manifests: unchanged. No new folders/modules beyond existing script area.

## Concrete Implementation Shape
### Builder/runtime delta
For each missing package, add the manifest+tsconfigs COPY beside existing contracts, full source directory COPY before install, and full directory runtime COPY from builder preserving /app/<directory>. Both images must copy the same missing package outputs; remote already carries only mobile web, allinone carries full web.
Replace `RUN pnpm -C autobyteus-team-stream-contracts build` in these two files with:

```dockerfile
RUN pnpm -r --workspace-concurrency=1 \
  --filter 'autobyteus-server-ts^...' \
  --filter 'autobyteus^...' \
  run build
```

This selects dependencies only (not the server itself or web's ordinary build), includes web workspace dev dependencies, and builds dependency-first using pnpm's existing owner. Retain the explicit Prisma generate, server build (and its prebuild hooks), and web build:mobile-web. Keep existing pnpm install flags/filter roots; allinone's server/web ... selectors already admit new contracts, and backend SDK remains available for prepare:shared. Do not switch to --prod installs: codegen/build/runtime dev paths need their existing tools.

### Cheap dependency-aware source check
Extend existing logical-instruction parsing to track builder versus runtime stage and the first install/build boundaries. Enumerate actual workspace manifests from current pnpm-workspace.yaml patterns; use a bounded parser of the repository's simple packages-list shape or the existing pnpm workspace enumeration, with clear failure if unsupported syntax is introduced, never silently drop packages. Walk workspace:* edges recursively for build/install roots (server, web, backend SDK). Runtime roots are server production closure and allinone web+dev closure.
For every required package, check manifest availability by install, complete source availability by compilation, required built entrypoints (dist exports/main/types) through explicit or dependency-filter builds and existing prebuild shared commands, and runtime destination coverage for package.json, compiled outputs and required package node_modules. Existing whole-directory copies qualify; monorepo's split node_modules/dist/manifest copies also qualify. Check root node_modules staging. Recognize the proposed dependency-build RUN before server/mobile build; reject parallel/no-sort flags that undermine ordering. Keep monorepo's unchanged explicit builds admissible, including its existing prepare:shared hook for core/SDK outputs. This is focused wiring validation, not a generic shell/Docker parser.
Tests must catch original missing packages, an additional required-package fixture not in any hardcoded list, missing runtime copy, missing dependency build and invalid order/staging. Source existence check remains. Document limits: if a new package needs a novel packaging shape or build-hook syntax, extend the checker explicitly and validate real Docker.

### Real-image smoke command
Stdlib Python and Docker, no model calls/keys, repository-root context regardless caller directory. Build both tracked Dockerfiles with unique temporary tags; optional --platform selects an explicit supported local/emulated target and is recorded. Do not claim unexecuted architecture targets. Record build logs and resulting image ID/digest metadata; inspect/run by ID, clean only the owned tag (not shared image IDs/base layers).
Use unique named data volumes and exact named containers, optional owned browser profile volume for allinone, and dynamic loopback bindings for backend/web/noVNC/debug ports. Apply the documented allinone Compose environment and existing cap_add/security_opt only to owned allinone container; remote uses ordinary entrypoint. No entrypoint overrides for the actual readiness run. Avoid inherited provider/app environment; explicitly point model host settings at test-local unavailable addresses if needed, never invoke inference.
Assert /rest/health JSON status=ok and non-error GraphQL response for both; assert /mobile/ HTML and a real bundled referenced asset for remote; allinone web HTML, noVNC HTTP, Chrome debug JSON and process status (as available through inherited supervisor). Import required workspace contracts/core via the server package context in each final image; importing from an arbitrary /app context is not correct pnpm consumer validation.
Hash /app/{LICENSE,LICENSING.md,NOTICE} against source, inspect OCI label. Write a unique nonsecret setting through updateServerSetting, stop/start owned container on same data volume, recheck readiness and getServerSettings readback; allinone web readiness must recover too. Use bounded configurable readiness waits, retaining first-attempt logs/errors. Finally collect logs/status/HTTP/assertion results and exact cleanup inventory; remove only owned containers/volumes/tags even on failures. Cleanup failure makes result nonzero. No docker system prune, no installed app or user data.

## Applied Patterns / Shared Structure Tightness
Only existing pnpm dependency graph/topological build and existing Python unittest/logical-instruction parser. No DTO, runtime registry, migration, service layer or framework. Shared package index/closure in the test has explicit name/path/manifest fields; duplicates/unknown dependency targets fail, rather than inventing fallback resolution.

## Backward-Compatibility Rejection Log
N/A for product schemas. Reject registry fallback for missing workspace packages, temporary validation Dockerfile as shipped solution, skipping contracts/build scripts and loading host dist. Clean-cut correction is the two tracked recipes. Retaining both documented image roles is approved support, not dual-path compatibility.

## Derived Layering
N/A — existing image construction/startup/test ownership is sufficient.

## Change / Refactor Sequence
1. Patch both recipes' three staging boundaries and graph build RUN; no runtime source changes.
2. Replace the hardcoded team-only source policy with graph-aware phase/runtime checks; retain monorepo supported-source assertions; add fixture/mutation regression proof.
3. Add/test opt-in smoke and document commands; implementation self-checks use source checks and actual image smoke as feasible.
4. API/E2E independently exercises repaired tracked images, lifecycle, package/license and allinone service readiness; preserve failures and external limits.
5. Delivery syncs docs, presents explicit user verification, refreshes/integrates moving personal, finalizes/pushes per current RELEASE.md, and records receipt. Default no release unless user asks. No shared checkout finalization.

## Key Tradeoffs / Risks
Explicit COPY lists keep packaging narrow and familiar. Build order becomes graph-owned; copy drift becomes cheap-detectable but not automatically repaired. This is more proportionate than staging the whole repository or building a new deploy assembler. Existing package hook duplicate builds/Prisma generation remain deliberately untouched; optimization is not needed for correctness.
Static checks are bounded and may need explicit maintenance for novel syntax; real Docker is the proof of actual behavior. Base registry/downloads and inherited Chrome/VNC architecture availability remain environmental prerequisites. Allinone runtime compiles dev web on startup, so use realistic readiness waits and retain errors. A new application/security/base-lifecycle requirement must return for design/requirements recovery rather than silently expand scope.

## Guidance For Implementation
Own only implementation artifacts/checks; preserve approved R1 and canonical D1. Read applicable skill/AGENTS/DESIGN/TESTING gates. Work in the isolated task branch/worktree, do not edit historical evidence or the shared personal checkout. Stage paths explicitly, keep new script compatible with available Python 3.9. Focus actual Docker lifecycle proof; no full desktop build or paid provider proof is relevant. Return material requirement/design gaps rather than broadening the direct route.

## Task Size And Architectural Risk (Completed Last)
- task_size: Medium — two deployment recipes plus existing source check, bounded smoke runner/tests and Docker usage documentation, all within current ownership.
- architectural_risk: Low — deterministic package-payload/staging correction and existing pnpm graph use; no material new/changed deployment contract: same bases, roles, port/env/data paths, identities, entrypoint/supervisor, application APIs, persistence and security model. E/A evidence establishes the intended path; unknowns are ordinary execution/download risks, not unresolved architectural decisions.
- Payload inventory: missing package manifests/tsconfigs/sources/dist/node_modules/license payloads, generated mobile assets; notes volume does not inflate risk.
- Structural delta: only recipe staging/build instructions and non-production test tooling; no runtime owner/API/type/schema/concurrency changes. Existing structural paths consume the corrected payload under current contracts.
- Escalation trigger: need to change bases, runtime identity/security flags beyond existing Compose, startup process ownership, application code/data/schema, public release workflow or introduce a dynamic packager/new contract → Design Impact or Requirement Gap, reclassify before dependent implementation. New intended behavior requires renewed approval.

## SR-003 Forward-Work Hold
User requested first investigating what the images are used for and whether they are needed. usage-investigation.md distinguishes the developer test stack from current monorepo launcher nodes. D1 has not been forwarded. Retain it as the repair proposal, but do not implement until the user settles DEC-004. Retirement would require renewed intended-behavior approval and a replacement design; no deletion authorized.
