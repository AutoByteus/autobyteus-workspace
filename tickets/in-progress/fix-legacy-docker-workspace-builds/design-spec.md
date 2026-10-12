# Design Spec — Retire Legacy Personal Docker Stack

## Solution And Approval Basis
- Package: fix-legacy-docker-workspace-builds; design baseline D2; current solution revision SR-006.
- Design status: Ready — Architecture Design Complete.
- Requirements: R2 / SR-005, REQ-005..008 and AC-007..011. User approved 2026-10-12: “I also think so let's remove both because I think the current like a mono mono rapport was already enough right for all the purposes.” Accepted recommendation retires both old recipes/personal-test wiring, preserves monorepo release/source-helper/remote-node uses and existing data.
- Previous R1/D1 repair plan: Superseded. History git-pinned at a98df0fd3aa8baa3b9e407a4d051e35de2fa2f78; do not implement its package-copy fixes, graph checker or new legacy smoke script.
- Canonical investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/tickets/in-progress/fix-legacy-docker-workspace-builds/investigation-notes.md.
- Authorities read: solution-designer/SKILL.md; references/{requirements-engineering.md,architecture-design.md,design-principles.md}; templates/{requirements-doc-template.md,investigation-notes-template.md,solution-revision-record-template.md,design-spec-template.md}; task-root AGENTS.md, DESIGN.md, TESTING.md; autobyteus-server-ts/AGENTS.md (2026-10-12, current conversation). RELEASE.md relevant finalization/no-release sections consulted; Delivery must read full current release authority before finalizing.
- Applicable project design file: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/DESIGN.md. Closer docker/scripts design authorities: none. Principle conflict: None. design-examples.md: N/A — bounded retirement, no novel structure.
- Worktree/branch: /Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds / codex/fix-legacy-docker-workspace-builds; resolved base origin/personal @ 2756d7b298ca5b203ebd2310d172b37a5d381b5c; target origin/personal.

## Current-State Read / Architecture Investigation Evidence
The old root docker/ area is one dedicated developer harness: personal-docker.sh → compose.personal-test.yml → allinone/remote-server recipes → owned shell/supervisor startup; personal wrapper additionally owns the dedicated seed-personal-test-fixtures.py caller. Both recipes omit required contracts and fail pnpm install (BAS-001/UD-002). The user chose retirement, not repair.
Retained server Docker workflow is independent: docker-start.sh → build.sh → Dockerfile.monorepo, or published image pull; release workflow and build-multi-arch.sh also use monorepo; public launcher supports any number of backend nodes from that image. Seven current local launcher nodes demonstrate local use but are NOT new-source build evidence. Legacy allinone uniquely offered Nuxt development web on 3000; the user was informed and approved retiring that harness. Normal local frontend/desktop workflows remain.
Evidence in investigation: U-001..006 (roles/error/source-build sufficiency), R-001..004 (exact removal/reference/ignore/test closure), AR-001..004 (postapproval ownership, retained input independence, ignore continuity and classification). No unresolved material design fact; moving-base new consumers must be rechecked before finalization.

## Intended Change
Remove the legacy harness's tracked implementation/config/docs; update live docs and current source checks; protect any pre-existing saved legacy state via root .gitignore. Do not change production monorepo code, recipe, pipeline, source helpers, public launcher, package manifests, licenses or current resources. No replacement compatibility commands or two-path support.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | REQ / AC / scenario | Approved trigger / factual current path | Target path / preserved outcome / spine |
| --- | --- | --- | --- |
| BEH-005 | REQ-005 / AC-007 / SCN-005 | User-authorized removal of personal wrapper→Compose→two recipes and dedicated assets; R-001 | Explicit tracked deletions + reference cleanup; current readers use retained monorepo docs/paths; DS-007 |
| BEH-006 | REQ-006 / AC-008,011 / SCN-006 | Current pipeline/source helpers/public launcher, U-005/006/AR-001 | Same monorepo construction and runtime/library/license ownership; DS-005/006 |
| BEH-007 | REQ-007 / AC-009 / SCN-007 | Existing container/volume/profile/workspace and ignored state owners; U-002/R-003 | No operational code/resource changes; ignored legacy state still protected; DS-007 |
| BEH-008 | REQ-008 / AC-010,011 / SCN-008 | README and test supported-image list name old recipes; R-004/AR-003 | Current docs/test list describe only retained main server recipe; absence/entrypath/ignore guards; DS-007 |

## Relevant Supplements
usage-investigation.md: Solution Designer-owned factual role/error/usage decision brief, not a normative supplement; latest approved decision is R2. Historical API/E2E report BAS-001 and AGPL UD-002 reports plus retained validation-only Dockerfile/log support original defect attribution; do not edit/reclassify them as current product paths. Absolute inventory in solution-handoff.md and investigation-notes.md. Product artifacts: N/A. Independent architecture review artifacts: N/A — not applicable yet; no review occurred, downstream route determined after classification.

## Task Design Health Assessment (Mandatory)
- Posture: Cleanup / approved operational support-contract removal, prompted by baseline bug investigation.
- Design issue: Yes — obsolete supported packaging paths keep broken duplicate recipes and misleading documentation/testing policy.
- Root cause classification: Legacy Or Compatibility Pressure; obsolete ownership now explicitly retired, not papered over with a fallback.
- Refactor needed now: Yes, bounded clean-cut retirement of the owned harness/reference policy; no runtime architectural refactor.
- Structural triggers: legacy cleanup and dead assets; evidence R-001/AR-001 verifies sole ownership/callers. Test policy shrinking removes expectations for deleted subjects. No shared DTO/API, concurrency, persistence, mixed-authority boundary or new subsystem issue.
- Response: delete the whole dedicated source closure, not just two Dockerfiles. Preserve monorepo path; avoid stub scripts/aliases, stale docs and orphan seeding/startup files.
- Residual risk: other users may have old test-stack state or new consumers may appear on moving personal. Preserve data/ignore policy; the support loss is user-approved. Return material discovered new consumer to Solution Designer rather than silently broaden scope.

## Terminology
“Retired personal harness” means only repository-root docker/ tracked stack plus its dedicated personal/seed scripts. “Retained server Docker” means autobyteus-server-ts/docker/, public launcher and release-server-docker workflow. Package-local docker/README.md links must resolve by containing package; not every literal docker/ path is the retired root.

## Legacy Removal Policy / Removal-Decommission Plan (Mandatory)
| Remove | Evidence / replacement owner | Notes |
| --- | --- | --- |
| docker/Dockerfile.allinone; docker/Dockerfile.remote-server | Explicit user removal approval; monorepo serves required server roles | Not repairing missing package lists |
| docker/compose.personal-test.yml; scripts/personal-docker.sh | Sole callers/definition of retired recipes; current server Compose/launcher remains | No command alias/deprecation shim |
| docker/allinone-start-server.sh; docker/allinone-start-web.sh; docker/remote-server-entrypoint.sh; docker/supervisor-allinone.conf | Dead after approved recipe deletion; references only within retired recipe/supervisor closure | Existing monorepo entrypoint/bootstrap/supervisor untouched |
| scripts/seed-personal-test-fixtures.py | Dead dedicated helper: only active caller personal-docker.sh; no independent active docs/tests/users found | Recheck at integration; do not remove unrelated fixtures/seed capabilities |
| docker/README.md | Only current caller root README retired section; directs old commands | Retained server guide becomes sole main-product Docker guide |
| docker/.gitignore | Dedicated nested ignore source unnecessary after source retirement | Move effective docker/.runtime/ protection into root .gitignore BEFORE removal; no state deletion |
| Root README old personal-stack section; server Docker guide mentions of two old recipes; static check legacy-image branches/constants | Live support/test expectations invalid after approved retirement | Current monorepo/source/helper/license docs and coverage retained |
No dead code identified elsewhere in scope. Historical tickets/test-results are evidence, not active code; do not rewrite/remove them. No compatibility wrappers/dual-build fallbacks retained. Existing .dockerignore docker/.runtime data-safety exclusion remains purposeful, not a supported legacy command.

## Persisted Data / State Transition Decision
Not Affected. No schema, application reader/writer, container volume, namespace, credential, model, storage layout or semantic change. Source deletion is not container/image/volume destruction. Pre-existing ignored personal state must remain untouched and untracked; root ignore relocation preserves the previous exclusion without preserving an executable workflow. No migration, old-state import, automatic reset or startup gate. Migration authority/plan: N/A — no transformation.

## Data-Flow Spine Inventory / Primary Execution Spines
| Spine | Scope / related behavior | Start → end | Governing owner / why |
| --- | --- | --- | --- |
| DS-005 | Primary end-to-end retained local-source UC-005 / BEH-006 | Developer source helper → build.sh → monorepo root-context builder → runtime staging/entrypoint → backend/mobile/browser/CLI environment | Existing server Docker owners; preserved construction/runtime boundary |
| DS-006 | Primary end-to-end published UC-005 / BEH-006 | Release tag/manual dispatch → release metadata → monorepo build/push → published image → public launcher node creation → desktop remote backend use | Existing release workflow/public launcher; retained support role |
| DS-007 | Primary end-to-end cleanup UC-004/006 / BEH-005,007,008 | Approved source retirement → explicit owned tracked edits → current docs/reference/source tests → retained build entrypaths and protected external state | Source owner/verification; avoids broken command references and resource side effects |

## Spine Narratives / Actors / Ownership Map
DS-005/006 remain byte-identical through production recipe/scripts/application source. The local helper compiles the current checkout with monorepo; pipeline publishes the same recipe for default/zh platforms; launcher creates nodes from a published ref and owns their current data/workspace lifecycle. No retired root-harness asset appears on these retained spines.
DS-007 replaces the old support surface with actual source absence and documentation/test consistency. Tracked files are removed explicitly; root ignore inherits saved-state protection. The test owner checks known retirement paths and preserved recipe/helper/workflow links, without invoking user resource operations. Current docs route developers to local monorepo source build or public launcher; regular frontend development still uses existing pnpm dev/isolated app commands.
Actors: User owns removal direction; Solution Designer owns approved boundary/design; Implementation owns explicit source edits; API/E2E owns executable preservation checks; Delivery owns docs/user verification/integration/merge. Runtime owners are unchanged. No newly created state owner or packaging service.

## Thin Facades / Return-Event / Bounded Local Spines
N/A — no new runtime facade, event propagation, loop or scheduler. Existing wrappers are retained unchanged or deleted cleanly, not reshaped. Reference-audit/test command return values are verification results, not a new product spine.

## Off-Spine Concerns
| Concern | Serves / spine | Responsibility / misplacement risk |
| --- | --- | --- |
| Saved-state ignore rules | User files / DS-007 | Preserve untracked protection without keeping executable old workflow; not a cleanup trigger |
| Historical reports | Maintainers / DS-007 | Explain BAS-001/removal approval; must not advertise legacy files as current support |
| License payload and gate | Retained recipe / DS-005,006 | Existing LICENSE/LICENSING.md/NOTICE/OCI label, unchanged; no legal-policy work |
| Focused source/helper tests | Preserved ownership / DS-007 | Honest proof of deletion/reference/entrypath continuity; not certification of a newly built Docker image |

## Ownership Boundaries / Encapsulation / Dependency Rules
Delete only root harness and sole-owned helpers. Preserve autobyteus-server-ts/docker/* (except targeted guide wording), scripts/public/docker/*, .github/workflows/release-server-docker.yml, root manifests/lockfile, package source/contracts/licenses and ordinary frontend/desktop paths. Relative package docker/ links are not root legacy refs; don't perform blind global replacements.
Use exact tracked-file deletes, never `rm -rf docker` or broad cleanup. No `docker rm/rmi/volume rm/system prune`, launcher destroy/upgrade/stop or user-data mutation as part of retirement. Validation can own isolated fixtures/mocks; no testing against running user nodes. Moving-base discovered substantive shared consumer is recovery, not permission to erase it.

## Interface Mapping / Checks
Retired entrypoints: personal-docker.sh and root Compose/Dockerfiles, intentionally unavailable after approval. Retained entrypoints: server docker-start.sh --build-local/--pull-remote; build.sh/build-multi-arch.sh; server Compose; public autobyteus-docker launcher; release workflow. Each retains its explicit image/node subject and current identity semantics. No new API or ambiguous selector. Domain naming/folder depth remains natural; no facade or module extraction is justified.

## Existing Capability Reuse / File Responsibility / Folder Mapping
| Path / change | Owner / concrete responsibility | Must not contain |
| --- | --- | --- |
| Nine tracked root docker/ files — Remove | Retired harness closure (including moved nested ignore) | Untracked/ignored user-state deletion |
| scripts/personal-docker.sh and seed-personal-test-fixtures.py — Remove | Sole-owned retired startup/fixture orchestration | Public launcher/source helper changes |
| .gitignore — Modify | Add exact docker/.runtime/ exclusion to preserve existing saved legacy state after nested ignore disappears | Broad ignoring, hiding unrelated work, resource cleanup |
| README.md — Modify | Remove old personal startup section; clearly retain published and monorepo source-build instructions/guide | Claim monorepo runs the retired separate Nuxt dev server |
| autobyteus-server-ts/docker/README.md — Modify | Remove legacy-image names from current license/release prose; retain monorepo and unrelated gateway statement as appropriate | Unrelated gateway deletion/policy change |
| scripts/tests/test_docker_build_context_sources.py — Modify | Supported monorepo COPY/build/runtime invariants + retirement/retained-entrypath/ignore guards | Broad graph packaging framework, legacy image build smoke, empty deleted-subject tests |
Existing logical_instructions/direct_copy_sources/copy_tokens helpers remain their current owned structures. Reduce only obsolete image mappings/install assertion. Keep team-stream dependency materialization check for monorepo and inexpensive checks for the two other already-present required contracts if helpful; no new requirements for arbitrary graphs. No new folders/runtime modules/scripts needed. Flat existing verification file is clearer than a new subsystem.

## Concrete Source/Test Shape
- `SUPPORTED_DOCKERFILES = (PRIMARY_DOCKERFILE,)`; remove ALLINONE/REMOTE constants and runtime mappings, legacy allinone filtered-install assertion. Rename “all server images” test so it describes retained monorepo.
- Add small absence guard for the explicit approved retired asset list (those literals are intentional test expectations, not active supported paths).
- Assert current server Compose/build helpers/release steps still reference an existing monorepo Dockerfile and root context; existing docs link to retained guide and no obsolete startup instructions. Use bounded explicit current files, not a whole-repository generic scanner that flags historical tickets or package-relative Docker links.
- Guard root `.gitignore` docker/.runtime/ and existing .dockerignore exclusion. If exercising `git check-ignore`, use a test-owned path and verify project rule origin rather than accidentally succeeding through global ignore configuration. Never create/inspect/remove real saved state.
- Mutation/fixture proof should catch a reintroduced retired asset, a broken retained entrypath and loss of saved-state protection, with exact diagnostics. Use temporary fixtures/in-memory inputs/monkeypatched roots, not permanent edits to shared files or other runs.
- Update root source-helper documentation to show existing `cd autobyteus-server-ts/docker; ./docker-start.sh up --build-local` alongside preserved published-image usage. This is existing supported behavior, not a new command.

## Reusable Structure / Applied Patterns / Compatibility Rejection
Reuse current unittest/recipe instruction parser; no new shared schema, packager, migration, state machine or API. No DTO-tightness change. Reject legacy script aliases/stubs, pointing old Compose at monorepo under old service identities, and keeping seed/startup files with no consumer. Preserving data exclusion is not a backward-compatibility runtime mechanism. Derived layering: N/A.

## Change / Refactor Sequence
1. Move exact saved legacy state ignore protection to root .gitignore; explicitly delete the approved tracked closure (no filesystem sweep).
2. Edit root/server docs and source check supported-image policy; add bounded retirement/entrypath/ignore guards. Don't implement any superseded R1 additions.
3. Implementation self-checks and independent API/E2E run focused current checks, reference audit and mutation/fixture proof; verify retained production recipe/scripts/runtime dependencies unchanged vs base.
4. Delivery syncs docs, obtains explicit user verification for finalization, refreshes/integrates origin/personal and re-audits any new consumer, merges/pushes via isolated finalize branch per RELEASE.md. Default no release/tag unless user requests. Preserve current live resources and historic evidence.

## Verification Intent / Key Tradeoffs / Risks
Primary proof is exact source removal plus unchanged retained production inputs and executable source/helper/reference guards. Suggested focused commands (owners read TESTING.md first):
- `python3 -m unittest scripts/tests/test_docker_build_context_sources.py -v`
- `python3 -m unittest discover -s scripts/tests -p 'test_*docker*.py' -v` (fake-Docker/source checks, not real image proof; inspect each file's prerequisites)
- `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py`
- `git diff <resolved-base> -- autobyteus-server-ts/docker/Dockerfile.monorepo autobyteus-server-ts/docker/build.sh autobyteus-server-ts/docker/build-multi-arch.sh autobyteus-server-ts/docker/docker-start.sh autobyteus-server-ts/docker/docker-compose.yml .github/workflows/release-server-docker.yml scripts/public/docker` must be empty; inspect unchanged monorepo direct COPY sources and application/manifests inputs.
- Focused current-doc/reference search excludes historical tickets/test-results and intentional absence guards/data-exclusion rules; include relative-link resolution, not simple substring deletion.
No build/start proof is required for user-approved removed recipes. A fresh monorepo rebuild is not automatically necessary for this source-only deletion because recipe, production source inputs, build helpers and pipeline are unchanged and share no removed dependency. Running existing images is not changed-source proof. If retained construction/runtime inputs change or audit finds dependency on removed assets, return Design Impact and perform actual current monorepo build/start as the revised scope requires; do not claim prior image validation as a new pass.
Support consolidation deliberately loses old Nuxt-in-Docker/ephemeral-test-node/fixture convenience. User was informed and approved; no replacement framework is warranted. Other users' saved state may remain; no automated migration or wipe. Moving personal may add a new consumer; recheck before merge. Known unrelated gateway/build defects remain out of scope, truthfully reported if encountered.

## Guidance For Implementation
Read R2/D2 rather than R1 git history as current authority. Use existing isolated worktree; stage only exact files; do not write shared personal. Keep source deletions bounded and data guard purposeful. Owner-specific reports/revisions and downstream executable/delivery evidence remain their specialists' responsibilities. No frontend design, desktop packaging or paid provider calls needed for source-only retirement.

## Task Size And Architectural Risk (Completed Last)
- task_size: Medium — 11 source/config/helper/doc deletions plus bounded root-ignore, two guide and existing source-test updates within one deployment capability. Artifact volume is not implementation size.
- architectural_risk: High — explicitly removes formerly documented deployment/command/image support contracts. User-authorized and runtime-independent does not make that operational contract loss Low. No material app/API/schema/concurrency/security model change; preserve monorepo spine and saved state; independent review determined by rules.
- Payload versus structural evidence: Removed README/config/helper assets are bounded; structural delta is retiring two deployment recipes and their executable command/Compose/startup boundary. No new runtime owner/dependency graph/frame or persistence surface.
- Escalation: retained pipeline/helper/launcher/runtime input changes, new active consumer, resource deletion/migration, proposed compatibility alias or broader gateway/frontend retirement → recover requirement/design and reclassify before dependent work. No silent risk downgrade or scope expansion.
