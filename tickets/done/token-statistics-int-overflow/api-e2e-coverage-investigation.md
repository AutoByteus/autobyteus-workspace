# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/graphql-token-count-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/solution-revision-record.md` (`SR-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/implementation-revision-record.md` (`IR-001`, `IR-002`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/code-review-revision-record.md` (`CRR-002`, `CRR-003`, `CRR-004`)
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/api-e2e-revision-record.md` (`API-REV-001`, current `API-REV-002`)
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `3`
- Trigger: implementation-source review round 4 passed the bounded `IR-002` Docker packaging correction after `DR-004` recorded the `v1.4.27` Server Docker Release failure.
- Prior Investigation Reviewed: `Yes` — `API-REV-001` remains the passed 96%-confidence product/API/browser baseline. This round validates only the delivery-triggered Docker packaging boundary.
- Latest Authoritative Investigation: this document, updated after durable test, real Docker/BuildKit execution, dependency inspection, cleanup, and final scoring.

## Current Requirement And Design Basis

The original token-statistics requirements, exact SafeInt transport/render behavior, and `API-REV-001` passage are preserved. No GraphQL, client, renderer, persistence, runtime entrypoint, or product behavior changed in `IR-002`.

The current validation basis is the independently supported operational contract confirmed by `DR-004` and `CRR-004`: explicit release authorization → annotated tag push → `Server Docker Release` → repository checkout → `docker/build-push-action@v6` using context `.` and `autobyteus-server-ts/docker/Dockerfile.monorepo` → BuildKit context resolution and image construction. Workflow run `30425051361` failed before install because `COPY patches ./patches` referred to a directory retired by `3fdaf0c629419257f9a7bdf2ac081f9ba78d4680`.

`IR-002` removes only that stale instruction from the release-server, all-in-one, and remote-server Dockerfiles. Current source requests `repository_prisma` `^1.0.9`; the checked-in lock resolves unpatched `1.0.9` with registry integrity and no patch hash. All three Dockerfiles intentionally retain `pnpm install --no-frozen-lockfile`. Validation must execute those real instructions rather than substitute a frozen-lockfile-only harness, and it must not recreate a root patch directory.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` token-statistics product behavior | Preserved | `API-REV-001`, `CRR-002`, `CRR-003`; no product source in `IR-002` | Retain prior product passage; no redundant browser/API rerun. |
| `DR-004` release-server repository-root build context | Changed | Failed workflow log, `IR-002`, `CRR-004` | Execute the real monorepo builder beyond the former missing-copy step and inspect installed dependency state. |
| All-in-one repository-root build context | Changed | Same stale instruction removed by `IR-002` | Complete its real builder stage proportionately. |
| Remote-server repository-root build context | Changed | Same stale instruction removed by `IR-002` | Complete its real builder stage proportionately. |
| Published `v1.4.27` and release state | Preserved | Delivery constraints and `DR-004` | Prove tag invariant and perform no workflow, registry, or recovery action. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | Prior `API-REV-001`; builder compile is supporting evidence | None from this delta | None |
| API / transport / contract | No | None | Prior live API/schema/browser passage | None from this delta | None |
| Frontend component / state | No | None | Prior component/browser passage; builder produces mobile web | None from this delta | None |
| Browser integration / user journey | No | None | Prior `API-REV-001` | None from Docker input cleanup | None |
| Authentication / session / permissions | No | None | N/A | N/A | None |
| Desktop renderer / web-equivalent UI | No | None | Prior `API-REV-001` and delivery Electron build | N/A | None |
| Desktop shell / Electron-specific integration | No | None | N/A for the current delta | N/A | None |
| Process / lifecycle | Yes | BuildKit builder creation/build/inspection/cleanup | Static BuildKit checks and durable source inventory | Real install/build completion and cleanup | Isolated Docker/BuildKit execution |
| Persisted-data transition | No | `Not Affected` | No schema/data source changed | None | None |
| Worker / queue / distributed coordination | No | None | N/A | N/A | None |
| External integration | Yes, bounded | Docker daemon, BuildKit, registry pulls | Daemon/version preflight | Real base/dependency pulls and builder execution | Isolated Docker/BuildKit execution; no push |
| Release workflow / registry publication | Explicitly excluded | None may be changed or invoked here | Workflow definition and failure log | Actual publication remains delivery-owned | Prohibited in API/E2E |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27`
- Project type and runtime stack: Git monorepo; pnpm/Node; Python unittest packaging contracts; Docker Desktop/Buildx/BuildKit; multi-stage Dockerfiles.
- Branch/validation revision: `release/token-statistics-int-overflow-v1.4.27` at `390307afb496eecdba43143c085cfde7a73fd3e2` plus source-review-passed uncommitted `IR-002` and API/E2E-owned test/report changes.
- Conflicting, missing, or unclear project instructions: `None`. The server `AGENTS.md` covers Vitest but not Docker; the checked-in workflow and Dockerfiles are authoritative for this packaging path.
- Required environment variables or secrets available: `N/A`; registry credentials and release credentials were neither needed nor used.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `.github/workflows/release-server-docker.yml` | Release-server build contract | Context `.`, `Dockerfile.monorepo`, multi-platform BuildKit, push only in delivery workflow. |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Release-server image owner | Named `builder`; manifest-only copy before `pnpm install --no-frozen-lockfile`; full server/mobile-web build. |
| `docker/Dockerfile.allinone` | All-in-one image owner | Named `builder`; filtered no-frozen install plus server, mobile-web, and gateway builds. |
| `docker/Dockerfile.remote-server` | Remote-server image owner | Named `builder`; no-frozen install plus server/mobile-web builds. |
| `package.json`, `pnpm-lock.yaml`, `autobyteus-server-ts/package.json` | Package manager and dependency contract | pnpm `10.28.2`; unpatched `repository_prisma@1.0.9`; no `patchedDependencies`. |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use one-shot tests; no Docker-specific override. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Docker daemon | Worktree root | Pre-existing Docker Desktop daemon; no restart required | Engine `29.0.1`, Linux arm64 VM | `docker version`, `docker info` | Do not stop shared daemon |
| Owned BuildKit builder | Worktree root | `docker buildx create --name api-e2e-dr004-20260729-0750 --driver docker-container desktop-linux`; bootstrap | BuildKit `v0.31.2`; arm64/amd64-capable | `docker buildx inspect --bootstrap` | `docker buildx rm api-e2e-dr004-20260729-0750` |
| Monorepo builder image | Worktree root | `docker buildx build ... --platform linux/arm64 --target builder --load` | API/E2E-owned tag only; no push | `docker image inspect`; ephemeral `docker run --rm` inspection | `docker image rm` owned tag |
| Sibling builders | Worktree root | Real `--target builder --output=type=cacheonly` builds | No retained image output | Build command completion | Removed with owned builder |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Repository-root build context | The assigned worktree itself | No synthetic context and no temporary `patches/` directory | Retained source; no context mutation |
| Installed package inspection | Ephemeral container from the real monorepo builder image | Reads only `/app` build output | Container uses `--rm`; image deleted |
| Git/tag identity | Read-only `git rev-parse` and status | No fetch, ref write, workflow action, or tag mutation by this stage | Recorded as evidence |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: original persisted-data decision plus `IR-002` packaging-only transition check.
- Representative existing-data setup and required behavior: `N/A`; no data/schema/volume behavior changed.
- Evidence: all changes are Dockerfile direct-source deletions plus a packaging test; builder execution required no application database.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: `No`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_server_docker_cli_latest_defaults.py` | Release-server CLI defaults and cache-buster wiring | Preserved Docker release behavior | Still Valid | 3/3 passed in combined focused run | Retain and rerun |
| `scripts/tests/test_server_docker_browser_bridge.py` | Server image browser bridge/runtime wiring | Preserved runtime-stage behavior | Still Valid | 6/6 passed in combined focused run | Retain and rerun |
| Historical ticket Docker build logs | Record earlier image builds and former patch copy | Historical evidence only | Out Of Scope as durable current coverage | Not executed by the repository test runner | Retain as evidence, do not treat as current pass |
| Direct repository-root `COPY` completeness | No durable scenario existed | `DR-004` failure origin | Needs Update via new coverage | One-off source-review inventory was not durable | Add generic source-contract test |

## Stale Or Obsolete Coverage Decisions

`None.` No test asserts that the retired patch copy must remain, and no existing test was removed or disabled.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `PKG-001` | Direct non-stage `COPY` declarations in all three supported Dockerfiles resolve from repository-root context | `DR-004`, `IR-002`, `CRR-004` | `scripts/tests/test_docker_build_context_sources.py` | The original missing-source regression escaped product tests; a generic source-existence invariant catches the class without freezing patch policy or a dependency version. |

## Durable Coverage To Update

`None.`

## Durable Coverage To Remove

`None.`

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `python3 -m unittest scripts.tests.test_docker_build_context_sources -v` | Worktree root | `PKG-001` direct-source contract | Pass — 1/1 | `api-e2e-evidence/docker-packaging-dr004/pkg-001-durable-source-contract.log` |
| 2 | `docker buildx build --builder <owned> --check --progress=plain -f <file> .` for all three | Real root context; owned builder | Dockerfile parsing/context metadata | Pass — 3/3, no warnings | `pkg-002-buildx-checks.log` |
| 3 | Combined new and established Python Docker contracts | Worktree root | New source contract plus preserved CLI/bridge contracts | Pass — 10/10 | `focused-durable-docker-contracts.log` |
| 4 | Manifest/lock/history/context inventory and `git diff --check` | Worktree root | Current unpatched dependency and clean direct sources | Pass | `pkg-005-contract-audit.log` |

## Post-Repository Confidence Scorecard

This scorecard reflects durable/static repository evidence before the real builder-stage executions selected as broader validation.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Failure log, reviewed three-line fix, generic direct-source test, and dependency audit align with `DR-004`. | No successful corrected builder execution yet. | Execute the real builders. |
| Changed-boundary execution directness | 75% | BuildKit checks and direct-source tests inspect the actual Dockerfiles/context. | `--check` does not execute `RUN pnpm install` or builds. | Complete real `builder` targets. |
| Cross-boundary integration realism and mock gap | 75% | No mocks in BuildKit check, but only metadata/static validation. | Context → install → compile chain unproven. | Real Docker/BuildKit build. |
| Environment, configuration, identity, and fixture fidelity | 85% | Real worktree root and real daemon; exact workflow Dockerfile identified. | Isolated builder execution pending. | Use owned Docker-container builder. |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | Original failure is exact; static corrected condition is proven. | Success and owned-resource cleanup unproven. | Build, inspect, and clean up. |
| User-surface, browser, and desktop-shell confidence | 75% | Release path definition and prior product/browser passage are known. | Corrected packaging has not produced builder output; workflow is prohibited. | Local release-equivalent builder execution. |
| Durable regression coverage quality and relevance | 95% | New test is generic, daemon-free, narrow, and covers all three affected files. | Proportional test-code review remains pending. | Reviewer assessment. |

- Overall post-repository confidence: `81%` (570 / 7 = 81.4%, rounded down).
- Every critical current-round criterion directly proven: `No` — real builder/install completion remained missing at this gate.
- Any applicable category below `90%`: `Yes` — changed-boundary, integration, environment, lifecycle, and release-surface categories.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: an absent direct source no longer exists, but real no-frozen installation and later builder layers could still fail.

## Broader Validation Decision

- Decision: `Required` and completed.
- Selected execution mode: `Other — isolated Docker/BuildKit packaging execution`.
- Specific confidence gap addressed: static checks could not prove the formerly failing root context proceeds through real no-frozen installation, dependency resolution, Prisma generation, server/mobile-web/gateway builds, inspection, and cleanup.
- Why the selected mode materially improved confidence: it used the actual Dockerfiles, root context, install commands, build layers, daemon, and base/dependency registry pulls without invoking delivery-owned publication.
- Expected/final confidence: target `>=95%`; achieved `97%` in the execution report.
- Browser-specific decision: `Not Required`. No web/browser/UI source or runtime boundary changed, and `API-REV-001` remains authoritative.
- Release workflow decision: `Prohibited` in this stage; no push, rerun, dispatch, tag mutation, or recovery action.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron exists in the product, but no shell source or packaging path changed here.
- Relevant prior evidence: delivery's passed local Electron build and `API-REV-001` browser evidence.
- Web-equivalent behavior: unchanged.
- Shell-specific or lifecycle behavior: unchanged.
- Chosen validation approach: no desktop launch; real Docker builders directly exercise the current changed boundary.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: Docker runtime image launch, bounded below as residual and not material to the deleted pre-install input.

## Live Environment And Fixture Plan / Result

- Startup order: Docker daemon preflight → unique owned Buildx builder → BuildKit checks → real monorepo builder/image → ephemeral inspection → sibling cache-only builders → cleanup.
- Environment choices: Docker Desktop engine `29.0.1`, Buildx `0.29.1-desktop.1`, owned BuildKit `v0.31.2`, native `linux/arm64`, worktree-root context.
- Health/readiness: `docker version`, `docker info`, and builder bootstrap passed.
- Seed data/fixtures/identities: none; repository context and package artifacts only.
- Evidence: retained under `api-e2e-evidence/docker-packaging-dr004/`.
- Owned state cleanup: builder, builder container/cache, loaded image, and ephemeral containers all removed; shared Docker state was not pruned.

## Temporary Executable Validation Plan / Result

| Scenario ID | Probe / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `PKG-003` | Real monorepo `builder` target loaded to an owned local image, then `docker run --rm` inspection | Crossed former copy failure; no-frozen install, server/mobile build, installed unpatched `repository_prisma@1.0.9`, and output presence | Full Docker builds require daemon/network/time and are better retained as API/E2E execution evidence. |
| `PKG-004` | Real all-in-one and remote-server builder targets with cache-only output | Both sibling contexts/install/build chains complete | Same reason; durable test protects the deterministic direct-source invariant. |
| `PKG-007` | Multi-platform BuildKit check for monorepo builder | Builder definition/context remains valid for the release platform set | Actual multi-platform publication is delivery-owned. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full runtime-stage image construction and launch | Runtime stages did not change; current defect/fix is before builder install | Low | None unless delivery integration changes runtime sources. |
| Full emulated `linux/amd64` builder compile | Native arm64 real build plus platform-independent context resolution and multi-platform check are proportionate | Low | Delivery workflow remains the final multi-arch publication owner. |
| Registry push and tag-triggered workflow | Explicitly prohibited in API/E2E; partially published release state is delivery-owned | Expected, not a validation defect | `delivery_engineer` selects truthful recovery after test review and integration refresh. |
| Integrated latest-base build | `origin/personal` advanced by 14 commits during execution; delivery owns refresh/integration | Bounded: Dockerfiles, lockfile, workspace, server manifest, and `.dockerignore` are unchanged; root `package.json` changed scripts only | Delivery must perform the required tracked-base refresh/integrated-state check and rerun if integration changes the validated boundary. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Monorepo builder lock snapshot differs from checked-in lock after install | No defect; observed production install behavior | `--no-frozen-lockfile` runs after only a subset of workspace manifests is copied; it rewrites the container-local lock importer set while retaining unpatched `repository_prisma@1.0.9`. Host lock SHA stayed unchanged. | None; record in execution report |
| First inspection evidence command used an invalid shell formatter | API/E2E-owned execution-reporting correction | Builder had already passed and package version printed; corrected inspection rerun passed completely. | None |
| First cleanup evidence command used unsupported `buildx inspect --format` | API/E2E-owned execution-reporting correction | No cleanup action had executed; corrected command removed and verified all owned resources. | None |
| `origin/personal` advanced during execution | Expected delivery integration responsibility | Exact Dockerfiles/lock/server manifest/.dockerignore unchanged; root package script-only change recorded | `delivery_engineer` after proportional test review |

## Investigation Decision

- Proceed To API/E2E Execution: `Complete`.
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes` — added `scripts/tests/test_docker_build_context_sources.py`; none updated or removed.
- Post-repository confidence: `81%`; broader Docker execution was required.
- Broader validation decision: `Required` and completed; final confidence `97%`.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient: `code_reviewer` for proportional review of the one added durable test.
- Notes: all current-round critical scenarios passed, cleanup passed, no forbidden release action occurred, and delivery integration remains downstream.
