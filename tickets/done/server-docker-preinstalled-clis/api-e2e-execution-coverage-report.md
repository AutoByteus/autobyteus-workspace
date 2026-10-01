# API/E2E Execution Coverage Report

## Latest Authoritative Result
**Pass — API-REV-001; final confidence 95.0%.** Round 1, completed 2026-09-28. All critical AC-001–006 have direct scope-appropriate proof. No applicable confidence category below 90%. Broader validation **Required — completed** through full production Docker builds, offline CLI execution, live server/browser process and recreation checks. No credentials, inference, push, release or deployment performed.

Classification carried unchanged: **Small / Low; Direct Low-Risk**. Successful-output route Delivery; proportional test-code review **Not Required — direct low-risk route**. get_handoff_rules selected the direct Pass + Small/Low rule; exact recipient `/delivery_engineer`. This is a packaging-validation pass, not a claim that all application features, provider login or Electron were tested.

## Execution Round Meta and Authority
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis`; branch `codex/server-docker-preinstalled-clis`.
- Validated implementation `d312fb1cb`, input HEAD `58289e97ebb0ea2b6b57bfd4fb53fb3beaf3e02f`; no production source changed during this stage.
- Trigger: Implementation Engineer, `implementation-handoff.md`, IR-001, approved SR-004.
- Prior API result/confidence: **N/A**, not inferred from absence. Current revision API-REV-001.
- Canonical ticket directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis`. Requirements: `requirements-doc.md`; investigation: `investigation-notes.md`; design: `design-spec.md`; solution history: `solution-revision-record.md`; current solution handoff: `solution-handoff.md`; historical supplement: `investigation-result.md`.
- Implementation authorities: `implementation-handoff.md`, `implementation-revision-record.md`; upstream evidence `implementation-local-checks.log` was read but not substituted for independent execution.
- Coverage authority: `api-e2e-coverage-investigation.md`; checkpoint authority: `api-e2e-test-case-ledger.md`; history: `api-e2e-revision-record.md`.
- Architecture review/source review and their revision records, Product artifacts, triggering test-review/delivery report and DR revisions: **N/A — not applicable**. No independent review pass claimed.

## Investigation and Execution Basis
The complete cumulative package, local instructions and existing coverage were read before execution. Investigation and ledger were initialized before edits/tests. Existing latest-default, browser-bridge and build-context tests remain valid. No obsolete test was removed. Added durable offline image regression and hermetic fail-closed tests after documenting the coverage gaps.

One local setup issue was corrected: builder `default` rejected the current Docker context; execution used existing `desktop-linux` builder without switching the shared default. Two user interruptions stopped incomplete builds (default-arm64, zh-amd64). Their logs are retained, cases were resumed with identical production source/arguments, and both completed successfully. Interruptions are not prior validation rounds or product failures.

## Boundary and Acceptance Evidence
| Requirement / AC | Evidence | Result |
| --- | --- | --- |
| 001 official preinstalled commands / no startup acquisition | Four full image builds; ELF/global path checks; meaningful versions offline in default and login shells; hermetic missing/empty artifact and failed-download rejection | Pass |
| 002 existing state preserved / packaged commands authoritative | Synthetic old home commands exit97 if selected; normal home/data/Chromium named volumes; marker and config hashes retained through independent containers and two normal startups on every matrix target | Pass |
| 003 runtime-owned authentication | No credentials supplied; all five images checked for default root identity/HOME, no GROK_HOME/provider key values/known token paths; docs distinguish root/vncuser and provider login; source isolates build homes | Pass within approved scope; live login/keyring intentionally not tested |
| 004 architecture/variant and existing behavior | All four full production builds, offline Codex/Claude/AGY/Grok checks, root-supervisor server health, actual Chromium/bridge, recreation | Pass; amd64 executed under Docker Desktop emulation |
| 005 installation versus runtime integration | Source diff leaves runtime selectors/adapters untouched; README explicitly distinguishes installed/authenticated/integrated states | Pass |
| 006 latest-at-build/cache fail-closed | Original a versus changed b cache-buster full builds; fresh Grok npm acquisition and AGY latest query/download/checksum, not CACHED; final versions logged; existing script/CI cache contracts and failure-shell tests pass | Pass |

## Test-Case Ledger Reconciliation
Ledger initialized before execution: Yes. Completed cases recorded before proceeding: Yes. Long-running checkpoints recorded: Yes. All 16 meaningful cases reconciled below; no running, interrupted-unresolved, blocked or unstarted in-scope case remains. CASE-REPO final rerun and CASE-AUTH-SCOPE matrix recheck are updates to the same IDs, not extra cases.

| Case | Final result | Evidence under api-e2e-evidence/ |
| --- | --- | --- |
| CASE-REPO | Pass: 19 focused tests, syntax/help/diff checks | repository.log, repository-final.log |
| CASE-FAIL-CLOSED | Pass: 3 of those 19 tests execute the actual RUN with failure doubles | fail-closed.log |
| CASE-AUTH-SCOPE | Pass: source scope and all five image identity/auth-path checks | auth-scope.log, image-inventory.log |
| CASE-BUILD-default-arm64 | Pass: unmodified full production Dockerfile | build-default-arm64.log |
| CASE-CLI-default-arm64 | Pass: durable offline clean/reused-home shells | cli-default-arm64.log |
| CASE-LIVE-default-arm64 | Pass: server/browser and two normal-entrypoint recreations | live-default-arm64.log |
| CASE-BUILD-default-amd64 | Pass: unmodified full production Dockerfile | build-default-amd64.log |
| CASE-CLI-default-amd64 | Pass: durable offline clean/reused-home shells | cli-default-amd64.log |
| CASE-LIVE-default-amd64 | Pass: server/browser and two normal-entrypoint recreations | live-default-amd64.log |
| CASE-BUILD-zh-arm64 | Pass: unmodified full production Dockerfile | build-zh-arm64.log |
| CASE-CLI-zh-arm64 | Pass: durable offline clean/reused-home shells | cli-zh-arm64.log |
| CASE-LIVE-zh-arm64 | Pass: server/browser and two normal-entrypoint recreations | live-zh-arm64.log |
| CASE-BUILD-zh-amd64 | Pass: unmodified full production Dockerfile | build-zh-amd64.log |
| CASE-CLI-zh-amd64 | Pass: durable offline clean/reused-home shells | cli-zh-amd64.log |
| CASE-LIVE-zh-amd64 | Pass: server/browser and two normal-entrypoint recreations | live-zh-amd64.log |
| CASE-CACHE | Pass: changed buster rebuild + refreshed-image offline harness | cache-refresh.log, cache-refresh-cli.log |

## Reproduction / Commands
Working directory is the worktree root. Exact commands and return codes are in ledger/logs.

```bash
python3 -m unittest discover -s scripts/tests -p 'test_server_docker*.py' -v
python3 -m unittest discover -s scripts/tests -p test_docker_build_context_sources.py -v
python3 -m py_compile scripts/tests/server_docker_cli_smoke.py
git diff --check
# Repeat with arch=arm64/amd64 and base=latest/zh; use unique local tags.
docker buildx build --builder desktop-linux --progress plain --platform linux/<arch> --load   --build-arg CLI_INSTALL_CACHE_BUSTER=api001-a --build-arg BASE_IMAGE_TAG=<base>   -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-cli-api001:<variant>-<arch> .
python3 scripts/tests/server_docker_cli_smoke.py --image <local-image> --platform linux/<arch>
python3 tickets/in-progress/server-docker-preinstalled-clis/api-e2e-evidence/live_probe.py <local-image>
```
The cache check changed only cache-buster to `api001-b` and used `default-arm64-refresh`. Direct buildx invocation mirrors the documented scripts but avoids build.sh overwriting shared `autobyteus-server:latest`. No `--push` used. All five validation image tags and the assigned implementation-only image tag were removed after evidence capture; rebuild to rerun.

## Environment / Fixtures / Live Execution
Docker client/server 29.0.1, desktop-linux context, arm64 engine, existing docker-driver BuildKit v0.25.2. Native arm64 plus amd64 emulation, not native x86 hardware. Runtime on every target: Ubuntu 24.04.5 noble, Node v22.23.3; no tag/Node-major/base changes. Exact built image IDs and sizes: image-inventory.log.

Base manifest digests:
- latest: `sha256:b2fde77f3bd7c73d412ea59d42e3b65290bae9f39d1ce85b5aaaac5d869596f4`
- zh: `sha256:19d4c0164e5c7006e38a81c0260611cbf26f871f2d3e749d574016676f4f9a67`

Resolved on every target: **AGY 1.2.12; Grok 1.0.41 (4220f3b224a6); Codex 0.157.1; Claude Code 2.1.283**. Chromium reports Chrome/153.0.8010.52. These are observations, not new version pins.

Builds used public network acquisition without credentials. All CLI and live startup/recreate probes used `--network none`, no published ports, no user volume mounts. Normal image entrypoint/supervisor used documented SYS_ADMIN/seccomp flags and `AUTOBYTEUS_SKIP_SYNC=1`. Synthetic volumes at /root, /home/autobyteus/data, /home/vncuser/.config/chromium; only browser fixture ownership changed to vncuser. Older fake tool copies were deliberately placed in ~/.local/bin and ~/.grok/bin. JSON/TOML markers contain no credentials. CLI baseline versions matched with these reused volumes; hashes and marker contents survived.

Live readiness: `/rest/health` returned status ok before and after recreation; server stdout/stderr captured. Actual root browser opener launched a distinct local health URL into Chromium, confirmed through `/json/list`; `/json/version` responded. Port6080 returned a websockify directory listing. That proves a listener, **not the full noVNC client UI**; no browser UI or Electron rendering pass is claimed. Full noVNC rendering was not needed to prove the changed packaging boundary; actual Chromium/bridge regression was exercised.

## Confidence Scorecard
Simple mean of seven applicable categories. Post-repository scores are the initial assessment before broader validation (16 original tests); later durable additions are included in final evidence.

| Category | Post-repository | Final | Evidence gain / residual limit |
| --- | --- | --- | --- |
| Requirement / AC proof | 50% | 95% | All six ACs mapped to real image/lifecycle evidence or preserved source/doc boundary; excluded live auth is not a missing critical criterion |
| Changed-boundary directness | 50% | 95% | Official installs, ELF targets and actual binaries in full production images; mutable future upstream not predicted |
| Integration realism / mock gap | 50% | 95% | Normal entrypoint/root supervisor, live health and real Chromium across recreation; inference outside scope |
| Environment / identity / fixture fidelity | 50% | 95% | Full matrix, default root env, realistic synthetic persisted home/app/browser; amd64 emulated, no private credentials |
| Failure / edge / lifecycle / recovery | 50% | 95% | Missing artifact, empty version, download error reject; old home tools, cache reexecution and recreation pass; not exhaustive future vendor faults |
| User-surface / browser / desktop | 50% | 95% | Actual CLI/default/login shells and browser bridge; no changed UI or Electron shell, full noVNC UI not asserted |
| Durable regression quality / relevance | 75% | 95% | 19 passing focused tests plus reusable opt-in real image harness across matrix; mutable multi-GB builds intentionally not default unit tests |

Overall **53.6% → 95.0%**, gain 41.4 percentage points. Target >=95 achieved; all categories >=90; every critical acceptance criterion directly proven. No material broader-validation gap remains for this approved packaging scope. Scores are scoped engineering confidence, not a statistical failure probability.

## Durable Coverage Changes
Added only:
1. `scripts/tests/server_docker_cli_smoke.py` — opt-in, consumes a local full image without pulling; frozen image ID, offline four-shell fixture checks, native links/ELF, dynamic version equality, UUID resource ownership and cleanup. No fixed expected vendor versions.
2. `scripts/tests/test_server_docker_cli_install_failures.py` — 3 hermetic unittest cases against exact Dockerfile RUN; isolated HOME/TMPDIR, fake acquisition/publication; expected failure codes and no publication assertions.

No durable test removed or existing durable test changed in this stage. Production code untouched. Lightweight test self-check complete. Both new paths accompany the handoff; independent proportional review Not Required — direct low-risk route.

## Temporary Evidence / Emulation / Cleanup
- `api-e2e-evidence/run_matrix.py`: temporary sequential matrix orchestration, per-case logs/checkpoints, resumable selection after interruption; retained as evidence, not a new product subsystem.
- `live_probe.py`: temporary normal-entrypoint lifecycle/browser probe, synthetic resources, exact URL checks, correlated service logs; retained for reproducibility.
- `final_inventory.py`: read-only image identity/known credential-path check; no token values emitted.
- Network/public installers were real in builds. Only failure injection doubles and existing bridge-unit dispatch mocks are mocked. Actual browser dispatch was separately live. amd64 is emulated on ARM64; no native x86 hardware evidence claimed.
- Docker smoke/live fixtures removed by their harnesses. Cleanup independently verified **27 recorded volumes and 37 named containers absent**. Read-only inventory runs used auto-remove unnamed containers. All six task-only local image tags were successfully removed, as recorded in cleanup.log, including the explicitly assigned implementation-only image `autobyteus-cli-ir001-local:arm64`.
- Shared base images, builders, build cache, unrelated containers/volumes and host/private data untouched. Build cache deliberately not pruned. Logs/scripts retained under canonical api-e2e-evidence directory; no service left for user interaction.

## Compatibility / State / Exclusions
No legacy compatibility fallback/wrapper observed; no coverage exists solely to preserve one. Design's persisted-data decision Not Affected is respected: no migration/schema/reader change or volume reset. Synthetic representative state preserved rather than inventing a migration.

Out of scope/not tested: paid inference, account login/keyring durability, arbitrary customized user PATH, provider self-update behavior, native x86 hardware, full noVNC UI, Electron, personal-stack images, ZCode/DSH, publication/deployment. Latest release drift remains intentionally allowed; future acquisition incompatibility must fail/report, not silently pin/fallback. These exclusions do not weaken the specific proven acceptance criteria.

## Result / Routing
All 16 in-scope cases Pass; zero Fail/Blocked/Not Tested. No preliminary failure-origin finding or unresolved owner classification. Setup context error and interruptions were resolved locally, not implementation defects. Selected recipient: `/delivery_engineer`, matching the direct Pass + Small/Low rule returned by get_handoff_rules. Dispatch confirmation is the send_message_to tool result; no additional recipient is required. API-REV-001 records the initial baseline with prior result/confidence N/A.

Evidence hygiene: staged diff identified trailing whitespace in generated terminal logs only. Spaces/tabs at line ends were trimmed transparently; commands/results/timings were not changed. Final staged diff check passes.
