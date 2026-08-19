# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/done/electron-agent-input-controls-regression/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/done/electron-agent-input-controls-regression/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/done/electron-agent-input-controls-regression/design-spec.md`
- Supplemental Task Artifacts: `ui-ux-spec.md`; `design-use-case-validation.md`; delivery `DR-005`; `docker-build-blocker.md`; `release-deployment-report.md`
- Solution Revision Record: `solution-revision-record.md` (`SR-001`)
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (`IR-002`, preserving `IR-001`)
- Code Review Report: `code-review-report.md`
- Code Review Revision Record: `code-review-revision-record.md` (`CRR-003`, preserving `CRR-001/002`)
- Delivery Revision Record: `delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-005`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (prior completed product round; `API-REV-002` will record this packaging round)
- Current Investigation Round: `2`
- Trigger: `IR-002 / CRR-003 Pass after DR-005 Docker packaging Local Fix`
- Prior Investigation Reviewed: `Yes — API-REV-001 product/browser investigation and Pass / 97.4% result`
- Latest Authoritative Investigation: `This file — supersedes round 1 as the current coverage plan while API-REV-001 preserves its history`

All relative artifact names above resolve under `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/tickets/done/electron-agent-input-controls-regression/`.

## Current Requirement And Design Basis

The original composer implementation and `AC-001`–`AC-007` are unchanged and remain passed under `API-REV-001`; that browser evidence is historical product proof only and is not evidence for `IR-002`. The new reachable operational contract is `CODE-PREM-001` / `DR-005`: a supported current-source server Docker build must install, build, and materialize every server workspace dependency so the final image can resolve the existing pnpm link and import the package at runtime.

`autobyteus-server-ts/package.json` declares `@autobyteus/team-stream-contracts@workspace:*`. All three active current-source server Dockerfiles must admit the package manifest during install, copy its source, build it because root Docker context excludes source-tree `dist`, and materialize it in the runtime stage. The primary optimized image must preserve the exact server link `node_modules/@autobyteus/team-stream-contracts -> ../../../autobyteus-team-stream-contracts`, load the package export, parse a representative current Team message, and resolve transitive `zod` without network. Delivery retains ownership of the reserved persistent Compose start, `/rest/health`, and final Nodes URL handoff.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Original `BEH-001`–`BEH-005` composer behavior | Preserved | `IR-002`, `CRR-003` | Do not repeat prior browser/composer suite; no frontend/application path changed. |
| `DR-005` / `CODE-PREM-001` primary image build | Changed | Delivery blocker, `IR-002`, `CRR-003` | Independently build and load a uniquely tagged native current-source primary image. |
| Primary runtime workspace link/package export | Changed | Server manifest and `Dockerfile.monorepo` | Run a short-lived `--rm --network none` container from the API-owned image and record link target, export resolution, parse result, and transitive `zod`. |
| Related remote-server/all-in-one inventories | Changed | `IR-002` three-Dockerfile diff | Add a cheap durable structural guard across all three and rerun BuildKit checks; full related runtime images are unnecessary after accepted builder evidence. |
| Reserved persistent server lifecycle and Nodes URL | Deferred to delivery | Reviewer handoff and `DR-005` ownership | Do not start or mutate the reserved project; record zero-container/zero-volume baseline and leave health/URL to delivery. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | Prior server/product suites | None from IR-002 | None |
| API / transport / contract | No semantic change | Package import is required by existing Team-stream server modules | Contracts package tests and prior product evidence | Image resolution, not protocol semantics | No-network runtime import/parse |
| Frontend/browser/desktop renderer | No | None | `API-REV-001` | None | Do not rerun |
| Authentication/session/permissions | No | None | N/A | N/A | None |
| Docker build / workspace install | Yes | Three Dockerfile inventories | Implementation/reviewer builds and lightweight source tests | Independent current-worktree build not yet executed by API/E2E | Native primary image build/load |
| Docker runtime filesystem/module resolution | Yes | Primary optimized runtime package pieces and pnpm links | Prior implementation/reviewer probes | API-owned image/runtime sample absent | `docker run --rm --network none` |
| Process / lifecycle / health | Indirectly | Server process must eventually start from image | Delivery owns reserved start/health | `/rest/health` remains unproven after fix | Related-runtime sample now; persistent health later by delivery |
| Persisted-data transition | No | No volume/schema/profile change | `IR-002`, `CRR-003` | None | None |
| Worker/queue/distributed coordination | No | None | N/A | N/A | None |
| External integration | No | Base images/npm only during build | BuildKit/cache | Multi-arch publication not requested | Native arm64 only |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation`
- Stack: pnpm monorepo, TypeScript server/contracts, Docker Buildx, native Linux/arm64 Docker Desktop runtime.
- Conflicts or missing instructions: none. Docker Desktop is available. Many unrelated/user-owned Docker nodes and volumes are active and must not be changed.
- Required environment variables/secrets: none; no registry push, account, API key, or production data is needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server tests | Use one-shot Vitest; not material for Docker-only source. |
| `autobyteus-server-ts/docker/README.md` | Docker build/runtime authority | `./build.sh` builds without starting; source helper owns persistent Compose lifecycle. |
| `autobyteus-server-ts/docker/build.sh` | Primary image builder | `--variant latest --tag <unique>` loads native server architecture and avoids retagging `autobyteus-server:latest`. |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Primary optimized build/runtime | Runtime is rooted at `/app`; server workdir is `/app/autobyteus-server-ts`. |
| `docker/Dockerfile.remote-server`; `docker/Dockerfile.allinone` | Related active image definitions | Full package runtime copy shapes; all-in-one uses filtered install. |
| `scripts/tests/test_docker_build_context_sources.py` | Existing durable Docker inventory test | Direct COPY sources exist, but the test does not assert the missing package is admitted/built/materialized. |
| `scripts/tests/test_server_docker_cli_latest_defaults.py` | Existing durable CLI packaging test | Still valid but unrelated to the workspace omission. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Lightweight durable tests | repository root | `python3 -m unittest ...` | No services/data | Exit 0 | None |
| Three Dockerfile checks | repository root | `docker buildx build --check -f <Dockerfile> .` | Read-only validation/cache use | Exit 0, no warnings | None |
| Primary image | `autobyteus-server-ts/docker` | `CLI_INSTALL_CACHE_BUSTER=api-rev-002 ./build.sh --variant latest --tag electron-agent-input-controls-regression-api-rev-002` | Unique API-owned tag; no container/volume/port | Image inspect, native linux/arm64 | Remove only unique API tag after evidence |
| Runtime sample | repository root | `docker run --rm --network none --entrypoint node --workdir /app/autobyteus-server-ts <unique-tag> ...` | No mount, port, volume, or network | Structured JSON assertions; exit 0 | `--rm` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Representative Team message | Inline current client schema payload | No server/database/profile | Container exits/removes |
| Existing Docker resource baseline | Read-only `docker ps/volume ls` label queries | Reserved project must remain 0 containers/volumes; all unrelated resources untouched | Compare after run |
| Image identity | Unique tag plus inspected image ID/digests | Never overwrite `latest` or implementation tag | Remove unique tag only |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- References: `IR-002` and `CRR-003` persisted-data/legacy verdicts.
- Representative existing-data setup: none.
- Evidence planned: no volume/mount/data-dir is created; reserved/user resource identities/counts are unchanged.
- Migration scenarios: `N/A`
- Reroute required: `No`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Boundary | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_docker_build_context_sources.py` direct COPY source check | Every directly copied context source exists | All three Dockerfiles | Still Valid but insufficient | It passed before DR-005 because it cannot detect omitted dependencies | Update with one focused package inventory regression scenario. |
| `scripts/tests/test_server_docker_cli_latest_defaults.py` | Current CLI default/override/cache-buster contract | Primary Dockerfile/build scripts | Still Valid | Unchanged CLI lines | Rerun with inventory suite. |
| `autobyteus-team-stream-contracts/tests/*.test.mjs` | Package build and schema parse/serialize behavior | Package export | Still Valid | Package unchanged | Do not rerun separately; independent image build and runtime parse exercise the material packaged copy. |
| `API-REV-001` 11 files / 76 tests and browser scenarios | Composer product behavior | Unchanged frontend/product boundary | Out Of Scope for round 2 | `IR-002` changes only Dockerfiles | Preserve historical Pass; do not repeat. |
| Implementation/reviewer full primary build and runtime probes | Current Dockerfile can build/resolve | Same changed boundary | Still Valid upstream evidence, not independent API proof | `IR-002`/`CRR-003` logs | Run an API-owned unique image and probe. |
| Remote/all-in-one complete builder evidence | Related builders compile | Related Dockerfiles | Still Valid | Accepted by `CRR-003` | Structural guard plus BuildKit checks only; do not duplicate expensive builder runs. |

## Stale Or Obsolete Coverage Decisions

None.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `DPK-001` | All three active server Dockerfiles admit, copy, build, and runtime-materialize `autobyteus-team-stream-contracts`; all-in-one filter admits it | `DR-005`, `IR-002`, `CODE-PREM-001` | Update `scripts/tests/test_docker_build_context_sources.py` | The existing direct-source check passed before DR-005. This cheap deterministic guard catches the exact inventory regression early but does not replace full image/runtime execution. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| `DPK-001` | `scripts/tests/test_docker_build_context_sources.py` | Add one table-driven assertion for manifest admission, source copy, build command, runtime copy shape, and all-in-one filter | `IR-002` / three Dockerfile diff | No production source change. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `python3 -m unittest scripts.tests.test_docker_build_context_sources scripts.tests.test_server_docker_cli_latest_defaults -v` | repository root | `DPK-001` and preserved Docker source tests | Pass — 5/5 | `evidence/api-e2e-round-2/lightweight-docker-tests.log` |
| 2 | Three `docker buildx build --check -f <Dockerfile> .` commands | repository root | Dockerfile validity and warning-free inventory | Pass — all three, no warnings | `evidence/api-e2e-round-2/dockerfile-checks.log` |
| 3 | `CLI_INSTALL_CACHE_BUSTER=api-rev-002 ./build.sh --variant latest --tag electron-agent-input-controls-regression-api-rev-002` | `autobyteus-server-ts/docker` | Independent current-source primary build/load | Pass — linux/arm64 image loaded | `evidence/api-e2e-round-2/primary-image-build.log`; `primary-image-inspect.log` |
| 4 | `docker run --rm --network none ...` structured package/link/parse/`zod` probe | repository root | Final runtime workspace resolution | Pass — exact link/export/message parse/`zod` | `evidence/api-e2e-round-2/primary-runtime-resolution.log` |
| 5 | Resource baseline/final comparison, unique image removal, `git diff --check` | repository root | Safety and cleanup | Pass — no retained/missing resources; image removed | `evidence/api-e2e-round-2/resource-baseline.txt`; `cleanup-and-safety.log` |

## Post-Repository Confidence Scorecard

The five lightweight Docker tests and all three warning-free BuildKit checks passed. This closes the durable inventory gap but remains source/static evidence; it cannot prove that the final primary image contains a loadable package and transitive runtime dependencies.

| Confidence Category | Score | Support | Remaining Uncertainty | Improvement |
| --- | ---: | --- | --- | --- |
| Requirement/operational-contract proof | 91% | `DPK-001` directly asserts manifest admission, source copy, package build, final-stage materialization, and all-in-one filtered install | Assertions do not create a runnable filesystem | Build the primary image and execute its package |
| Changed-boundary execution directness | 84% | Checks read all three actual Dockerfiles | No API-owned final image execution yet | Native primary build and no-network runtime probe |
| Cross-boundary integration realism/mock gap | 84% | BuildKit parses/resolves every active Dockerfile and no test mock substitutes source text | Install/build/runtime copying has not executed in this round | Full Buildx build/load and real Node module loader |
| Environment/configuration/identity/fixture fidelity | 90% | Docker Engine is native linux/arm64; unique tag and resource baseline are established | Target image does not exist yet | Inspect the independently built image |
| Failure/edge/lifecycle/recovery evidence | 90% | Upstream DR-005 expected-red proves the prior omission; warning checks pass | API cleanup comparison and runtime exit are pending; persistent health remains delivery-owned | Execute `--rm --network none`, cleanup, and final resource audit |
| User surface/browser/desktop confidence | N/A | No UI/desktop surface changed in IR-002 | N/A | None |
| Durable regression coverage quality/relevance | 95% | Focused table-driven `DPK-001` passed with the three existing Docker CLI guards | Proportional test-code review remains after API completion | Return updated test to code reviewer |

- Overall post-repository confidence: `89.0%` (`(91 + 84 + 84 + 90 + 90 + 95) / 6`); UI is genuinely inapplicable to IR-002.
- Every critical contract directly proven: `No — the final runtime filesystem/module loader remains unexecuted by API/E2E.`
- Any category below 90%: `Yes — directness and integration realism are 84%.`
- Clean target met: `No.`
- Material residual risk: an inventory-correct Dockerfile could still produce an incomplete or unloadable final image; delivery-owned persistent startup and `/rest/health` also remain intentionally outside this round.

## Broader Validation Decision

- Decision: `Required and completed — Pass`
- Selected execution mode: `Other — Docker native image build plus short-lived no-network runtime sample`
- Gap addressed: source/static checks cannot prove the final runtime link/package/transitive dependency exists.
- Expected confidence: at least 95% if unique build/runtime/safety checks pass.
- Browser decision: `Not Required`; no frontend or web-equivalent renderer changed.
- Health decision: a persistent or port-bound health check is not required here because delivery explicitly owns the reserved project start, `/rest/health`, and URL handoff. The selected related-runtime sample directly proves the changed package-resolution boundary without creating state or competing with existing nodes.

## Desktop Application Validation Decision

- Framework: Electron exists in the product but is not part of IR-002.
- Chosen approach: no Electron/browser execution.
- Effect on running Electron: `None`; no process, port `29695`, profile, or data access.

## Live Environment And Fixture Plan

- Startup order: baseline resource inventory -> durable tests -> BuildKit checks -> unique primary build/load -> image inspect -> `docker run --rm --network none` -> cleanup -> final inventory.
- Environment: Docker Desktop 4.52.0 / Engine 29.0.1, linux/arm64; unique tag only.
- Readiness: build exit 0; image inspect platform; runtime JSON assertions.
- Seed data: inline schema-valid Team client message only.
- Identities/auth: none.
- Evidence: exact commands/logs, image ID, workspace link target, resolved package path, parse output, resolved `zod`, before/after container/volume labels.
- Cleanup: automatic container removal; remove API-owned image tag only; never stop/remove/prune any pre-existing resource or BuildKit builder.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Setup | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| `DPK-002` | Full unique native image build/load | Real current-source build completes | Full builds are too expensive for a lightweight source unit test; documented/release Docker pipelines remain authoritative. |
| `DPK-003` | One `--rm --network none` Node runtime sample | Exact pnpm link, package export/parse, and transitive `zod` resolve in final image | Runtime filesystem evidence is tied to the built image and retained as execution evidence. |
| `DPK-004` | Read-only baseline/final resource diff | Existing/reserved Docker resources unchanged | Environment-specific safety evidence. |

## Not Tested / Infeasible / Deferred

| Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Reserved Compose start, `/rest/health`, Nodes URL | Explicit delivery ownership | Bounded lifecycle evidence remains | Delivery resumes after API/reviewer gate |
| Remote/all-in-one final loaded runtimes | Full builders already accepted; primary owns user-requested image path | Low | Release/related deployment pipelines if later requested |
| linux/amd64 | Host is native arm64; no multi-arch publication requested | Low | CI/release multi-arch build |
| Prior composer browser journeys | No application/frontend diff | None for IR-002 | Preserve API-REV-001 |

## Ambiguities Or Reroute Triggers

None. A build/runtime failure will be recorded and returned to `/code_reviewer`; no failure is inferred now.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed — Pass`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — update one existing Python test file with DPK-001`
- Post-repository confidence: `89.0% before the required broader Docker execution`
- Broader validation: `Required and completed — unique primary Docker image plus no-network runtime sample passed`
- Reroute Required Before Execution: `No`
- Notes: The prior 97.4% composer result is not used as proof of this Docker boundary. Existing Docker nodes/volumes, reserved project, port `29695`, Electron, `~/.autobyteus`, and production data/profile were strictly untouched; the API-owned image was removed.


## Completed Execution Outcome

- Result: `Pass`
- Final confidence: `97.2%`; no applicable category is below `90%`.
- Changed boundary result: the independent native linux/arm64 primary image built and loaded, exposed the exact server workspace link, resolved the package export from `/app/autobyteus-team-stream-contracts/dist/index.js`, parsed a current `SEND_MESSAGE`, and loaded transitive `zod` with networking disabled.
- Durable result: `DPK-001` and the existing CLI/source scenarios passed `5/5`; proportional test-code review is required for the updated Python path.
- Safety result: no persistent container, volume, port, Electron, profile, or production-data resource was created or changed; every baseline container identity and volume name remained, the reserved project stayed at zero containers/volumes, and the unique API-owned image was removed.
- Deferred boundary: delivery still owns the reserved persistent Compose start, `/rest/health`, and final Nodes URL handoff.
