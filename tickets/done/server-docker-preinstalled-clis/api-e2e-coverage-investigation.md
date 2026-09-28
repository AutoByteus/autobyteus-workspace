# API/E2E Coverage Investigation

## Meta and authority
Round 1, initial validation of IR-001 / SR-004; prior result/confidence N/A. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis`, branch `codex/server-docker-preinstalled-clis`, input HEAD `58289e97e`, implementation `d312fb1cb`. All paths below relative to that worktree unless absolute.

Read complete cumulative package in `tickets/in-progress/server-docker-preinstalled-clis/`: requirements-doc.md (Approved), investigation-notes.md, design-spec.md (Ready), solution-revision-record.md, solution-handoff.md, historical investigation-result.md, implementation-handoff.md and implementation-revision-record.md. No Product supplements. Architecture review, code review, triggering findings and delivery revision: N/A — not applicable. API revision baseline will be created after completed result; no prior API record exists. Canonical ledger: api-e2e-test-case-ledger.md; report: api-e2e-execution-coverage-report.md in the same ticket.

Classification: Small / Low, Direct Low-Risk. Successful route Delivery; proportional test review Not Required — direct low-risk route.

## Behavior and changed boundaries
- BEH-001 / AC-001,005: added official latest agy/grok packaging; CLI native payload, PATH and unauthenticated offline launch must work. Runtime selectors preserved.
- BEH-002 / AC-002: preserved home/app/browser state and image command authority on recreation.
- BEH-003 / AC-003: preserved runtime-owned authentication/root identity; no credentials or login during build. Inspect clean image and documentation; live login excluded.
- BEH-004 / AC-004,006: preserved amd64/arm64 × default/zh production builds, startup, existing Codex/Claude/browser/server. Added tools share existing cache-buster; verify actual reexecution.

Changed external distribution + image packaging/process boundary: Yes. Authentication, persistence and browser integration: preserved but regression-sensitive. Domain logic, API contract, frontend state, Electron renderer/shell, workers and distributed coordination: no changes. Static source tests bypass official downloads, ELF/native execution, OS dependencies, real home mounts and app startup; live Docker CLI/lifecycle validation required. Browser smoke means container Chromium/debug/bridge, not desktop Electron. No host desktop interaction needed.

## Execution discovery
- `autobyteus-server-ts/AGENTS.md`: Vitest non-watch for server logic; none changed so broad server unit suite not selected.
- `autobyteus-server-ts/docker/README.md`: documented low-level docker run uses SYS_ADMIN, seccomp=unconfined and home/data/browser mounts; auth root not vncuser; no real credentials needed for packaging checks.
- `docker/{Dockerfile.monorepo,build.sh,build-multi-arch.sh,docker-compose.yml,entrypoint.sh,bootstrap.sh,supervisor-autobyteus-server.conf}` under server: repository root context; Node22 builder, existing base latest/zh, root bash -lc supervisor, bootstrap sync disabled by default. Production Dockerfile builds server and mobile assets. Runtime ports 8000/6080/9223. Use explicit buildx command equivalent to scripts with unique local tags, not build.sh (which also rewrites shared latest tag). Never push. Existing default builder supports amd64 emulation and native arm64; choose `--builder default` without altering shared builder settings.
- `.github/workflows/release-server-docker.yml`: same Dockerfile and both architectures, separate zh base, run-id cache-buster. Do not execute publishing or prune steps.
- `.dockerignore`, package.json, scripts/tests/test_docker_build_context_sources.py: sources copied from repository root, generated host modules/dist excluded. No host dependency install required.
- Docker engine available linux/aarch64. Host free space 259GiB. No secrets needed or permitted. Build network uses public distributions. Offline launch will use `--network none`.

Resource plan: local tags `autobyteus-cli-api001:<variant>-<arch>`, disposable containers/volumes prefixed `cli-api001-`, bind ports only 127.0.0.1 with ephemeral selection. Server readiness HTTP /rest/health if available (verify route before probe), browser debug JSON/noVNC response, supervisor logs. Seed synthetic config/markers and older fake home executables; never real user state. Remove only our containers/volumes/local image tags; no shared cache pruning. Implementation image retained only if needed then remove as explicitly assigned.

## Persisted data and compatibility
Design decision Not Affected; no migration, reader/schema/volume changes or compatibility wrappers. Implementation handoff legacy/state checks are clean and match diff. Use synthetic pre-existing home + app/browser markers with normal volumes; no auth compatibility promise. No backward-compatibility-only tests.

## Coverage validity and action inventory
| Existing coverage | Decision | Requirement and boundary | Action |
| --- | --- | --- | --- |
| scripts/tests/test_server_docker_cli_latest_defaults.py (8 tests) | Still Valid | AC-001,003,005,006; source contracts for official installers/latest, isolation, probes, cache policy | Reexecute unchanged |
| scripts/tests/test_server_docker_browser_bridge.py (6 tests) | Still Valid | AC-003,004; executed shell dispatch with fake id/runuser/opener and source wiring | Reexecute; actual container bridge smoke still needed |
| scripts/tests/test_docker_build_context_sources.py (2 tests) | Still Valid | AC-004; source existence and copied dependency contract | Reexecute; real image build still needed |
| Runtime/provider unit/E2E suites | Out Of Scope | no adapter/API behavior changed, credentials/inference not authorized | No modifications |

No stale, removed or updated coverage. Add Durable Coverage: opt-in production-image CLI/persistence smoke harness, consuming a built image with no account/network, tests system native resolution, versions, defaults/login shells and synthetic old-home collisions. This real changed-boundary regression is absent from source tests. Keep it separate from network-free unittest discovery and document invocation in script. Temporary probes only: full live build matrix, cache reexecution and integrated server/browser startup because mutable public releases and multi-GB images are environment-dependent, not default repository unit tests. No durable auth/inference tests.

## Planned execution
1. CASE-REPO: three focused unittest suites and diff/shell checks.
2. CASE-BUILD-default-arm64 / default-amd64 / zh-arm64 / zh-amd64: unmodified full production Dockerfile, fresh cache-buster, unique local image tags; record versions/digests/logs.
3. CASE-CLI-<variant>-<arch>: durable opt-in offline CLI/root old-home fixture probe on each full image.
4. CASE-LIVE-<variant>-<arch>: production entrypoint, server/browser/Codex/Claude, markers across recreate.
5. CASE-CACHE: changed cache-buster must reacquire AGY/Grok rather than CACHED.
Initialize ledger before execution. Record each meaningful case/checkpoint immediately. A build failure is not a successful CLI or startup case.

## Confidence and broader validation gate
Post-repository scores pending execution. Broader validation Required: real Docker build + offline CLI + lifecycle; static tests cannot prove critical AC-001/002/004/006. Target >=95 overall, no category <90, every critical AC proven. Direct browser UI interaction not initially required because no renderer changed; use live Chromium debug bridge evidence, optionally browser if actual gap remains. No actual Electron shell validation. Auth/keyring/inference explicitly not tested by scope. Provider/platform failures must be reported, not pinned, skipped or worked around with runtime fallback/base changes.

Proceed Yes; no pre-execution reroute. Durable smoke harness planned before executing it.

## Post-repository confidence (completed)
CASE-REPO: all 16 focused tests passed; api-e2e-evidence/repository.log, repository root commands recorded there. No production image boundary proven yet.
| Category | Score | Evidence / remaining gap |
| --- | --- | --- |
| Requirement / AC proof | 50% | Source assertions match intent; critical full matrix/state proof missing |
| Changed-boundary directness | 50% | Static packaging checks; upstream implementation arm64 partial image evidence not independent full-image proof |
| Integration realism / mock gap | 50% | Browser dispatch mocked; real app/browser integration absent |
| Environment / identity / fixtures | 50% | Docker is available; full image and reused fixtures not yet run |
| Failure / edge / lifecycle / recovery | 50% | fail-fast source assertions; recreation/acquisition execution missing |
| User surface / browser / desktop | 50% | CLI/browser process surfaces unproven; Electron N/A |
| Durable regression quality | 75% | Relevant focused contracts, but no executable image regression yet |
Overall 53.6% (375/7), critical ACs not all proven, six categories below 90; target not met. Broader validation Required, Docker CLI/lifecycle selected to close these gaps. No browser UI change; actual desktop N/A.

Durable addition authored: `scripts/tests/server_docker_cli_smoke.py`, opt-in built-image test outside unittest discovery. Performs four offline clean/reused-home default/login-shell probes, ELF native check, agy/grok/Codex/Claude version equality, fixture hashes and markers, own UUID volumes/containers cleanup. Checks production app entry presence; cannot be mistaken for extracted packaging-image proof. Syntax/help/diff checks pass; execution pending image export. Temporary live_probe.py retained under api-e2e-evidence, normal entrypoint, offline networking, synthetic same volume shape, server health/Chromium/noVNC/bridge, two recreations, log correlation. This tests preserved browser process boundary without host desktop or UI changes.

Coverage refinement before additional edit: add `scripts/tests/test_server_docker_cli_install_failures.py` for AC-001/006 fail-closed behavior. Existing tests check strings only; execute the actual RUN shell with hermetic npm/curl/timeout/publication doubles to simulate download error and AGY installer exit0 with absent/empty-version payload. No real installer runs and no global writes. Real success paths remain the image matrix's responsibility. CASE-FAIL-CLOSED added to ledger; this is durable coverage, not a replacement of existing source tests.

## Live progress / decisions
Native default and zh full production builds plus durable offline/reused-home probes and normal-entrypoint server/browser/recreate probes passed. Default clean image known auth files/env are absent; no credentials supplied. CASE-CACHE passed full rebuild plus offline smoke after cache-buster change; actual acquisitions repeated (not inferred from version equality). Both variants use Ubuntu noble runtime rather than historical source-only older OS observation. AMD64 real Linux binary execution under Docker Desktop emulation is underway, not assumed from arm64 success. No change to validity decisions or approved scope.

Port6080 responds with a websockify directory listing; this is only listener evidence, not full noVNC client/UI proof. Actual Chromium debug and root browser bridge open the exact local health URL before and after recreation. Full noVNC UI rendering and provider login are not claimed; neither was changed by this packaging addition. No Electron/host desktop touched.

## Final Investigation Decision — API-REV-001
All four production image matrix entries now built and passed durable offline CLI plus real server/browser/state recreation checks. Changed cache-buster rebuild and failure injections pass. Final focused suite 19 tests; two durable additions listed above, no removals/updates to existing tests or production source. All five built images pass clean root/env/known credential-path inspection. Exact case reconciliation, confidence rationale, image inventory and cleanup are authoritative in api-e2e-execution-coverage-report.md and ledger.

Broader validation Required — completed. Final confidence 95.0% (all seven categories 95%, simple mean), compared with initial post-repository 53.6%. All critical AC-001–006 proven within approved scope; no category <90; clean gate met. amd64 executed under Docker Desktop emulation, not physical x86; authentication/inference and full noVNC UI not claimed. Native/default/root-shell old-home and real browser bridge uncertainties closed. No unresolved failure, requirement/design ambiguity, legacy wrapper or state transition issue. Result Pass; Small/Low carried; Not Required — direct low-risk route for test review; recommend Delivery subject to returned handoff rule. Source setup errors/interruption logs retained, not misreported as validation failures.
