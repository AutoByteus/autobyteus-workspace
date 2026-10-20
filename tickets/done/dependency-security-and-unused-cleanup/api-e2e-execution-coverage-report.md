# API/E2E Execution Coverage Report — dependency-security-and-unused-cleanup

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-001 (reviewed route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-20: the packaged harness scripts' default build step cannot run on macOS (FU-013), so they ran with `--skip-build` against the `build:electron:mac` output. That is the same app, built by the documented macOS command.
  - API-12: only the reasoning-stream case of the LM Studio file really calls the model; the other cases pass without calling it, on base too (FU-012). The packaged native run (API-21) adds a second real `undici` call.
  - API-B: the fresh base worktree needed its devkit build after the server build, plus a reinstall for the `autobyteus-app` bin link (harness order; see the matrix evidence).
  - API-21: the run was opened from the sidebar; setting the deep-link hash directly did not open it (Notes).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/evidence/` (`API-*`; the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (reviewed `High` route). No durable test code was added, updated or removed in this round, so there is no durable diff to review. The temporary probe sources are in the evidence files.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-A | `10126a016a` (source = `7da874ed2b`) | macOS 26 arm64, Node 22.23.1, pnpm 10.28.2 | Branch worktree: frozen install; every build; suites in-process | `env -i PATH HOME=<resolved temp> TMPDIR` for `autobyteus-ts` and server e2e; load average 30-150 (other agents plus both matrices) |
| ENV-B | `3b2c86ca9e` (base) | same | Test-owned base worktree `dependency-security-and-unused-cleanup-base`; the same sequence | same |
| ENV-P | `10126a016a` | macOS arm64 | Packaged `build:electron:mac` (unsigned): Electron 42.11.16, Chrome 148.0.7778.280, Node 24.19.0; isolated instance `iso-62256-32b4` | own data root; LM Studio `qwen/qwen3.6-35b-a3b` loaded just in time, unloaded after |
| ENV-D | `10126a016a` | Docker 29.0.1 linux/arm64, Node 22.23.3 | Image `autobyteus-server:dep229` from `Dockerfile.monorepo` (`build.sh` flags); container on 127.0.0.1, no user volumes | removed after |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-004 | removals; import providers | Reused IMP-05, IMP-11 | — | Pass | (implementation handoff) | — | Manifests and lockfile unchanged since `7da874ed2b` (`git diff --name-only 7da874ed2b 10126a016a` touches only `tickets/`) |
| API-01 | AC-003, AC-005 | install; dedupe | `pnpm install --frozen-lockfile`; `pnpm dedupe --check` | ENV-A, ENV-B | Pass | `API-03-11-suite-matrix-branch-and-base.txt` | branch `install exit=0 … Lockfile is up to date`, `dedupe-check exit=0`; base `dedupe-check exit=1 … ERR_PNPM_DEDUPE_CHECK_ISSUES` (the "before") | — |
| API-02 | AC-001, AC-002 | fresh audit vs the explained set | `pnpm audit --json`; `pnpm audit --prod --json`; `audit-compare.py` | ENV-A | Pass | `API-02-audit-fresh.txt` | `ALL totals {… 'high': 46, 'critical': 6}`, `same set: True` (27 packages); `PROD totals {… 'high': 13, 'critical': 0}`, `same set: True` (6 packages); no `NEW` line | Newest advisory among them created 2026-10-06; nothing published since IMP-11 changes the set |
| API-03 | AC-005, AC-006 | 7 contract/SDK/devkit packages: build + test | `pnpm -C <pkg> build && pnpm -C <pkg> test` | ENV-A, ENV-B | Pass (same) | `API-03-11-suite-matrix-branch-and-base.txt` | branch: `# tests 6`, `19`, `18`, `34`, `12`, `Tests 10 passed (10)`, devkit `# tests 22`, all `# fail 0`; base the same (devkit after the reorder) | — |
| API-04 | AC-005, AC-006, DEC-007 | `autobyteus-ts` build + test | `pnpm -C autobyteus-ts build`; `env -i … pnpm -C autobyteus-ts test --run` | ENV-A, ENV-B | Pass | same | branch `[verify:runtime-deps] OK`; `Tests 2370 passed \| 78 skipped (2448)`; base `Tests 2368 passed \| 78 skipped (2446)` | +2 = the DEC-007 cases |
| API-05 | AC-005 | server prebuild, build, typecheck | the package scripts | ENV-A, ENV-B | Pass | same | `server-build exit=0`, `server-typecheck exit=0` on both | — |
| API-06 | AC-006 | server `test:unit` | `pnpm -C autobyteus-server-ts test:unit` | ENV-A, ENV-B | Pass (1 diagnosed failure, same behavior on base) | same; `API-06-server-unit-timing-diagnosis.txt` | branch `Tests 1 failed \| 6309 passed \| 7 skipped (6317)`; base `Tests 6310 passed \| 7 skipped (6317)`; diagnosis: 6/6 `×` on both sides under contention, then `Tests 8 passed (8)` 3/3 on both | Cause (Reproduced on both sides): the test's 40 ms debounce window vs write latency under CPU contention. FU-011 |
| API-07 | AC-006 | server `test:integration` | `test:integration:prepare` + `test:integration` | ENV-A, ENV-B | Pass (same) | `API-03-11-suite-matrix-branch-and-base.txt` | `Tests 421 passed \| 69 skipped (490)` on both | FU-008 did not recur |
| API-08 | AC-006 | server e2e (built server; includes the MCP/HTTP e2e) | `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` | ENV-A, ENV-B | Pass (same) | same | `Test Files 97 passed \| 91 skipped (188); Tests 414 passed \| 411 skipped (825)` on both | Skips are gated suites; a skip is not a pass |
| API-09 | AC-005, AC-006 | web guards, `nuxt build`, `test:nuxt`, `test:electron` | package scripts | ENV-A, ENV-B | Pass | same; `API-09-base-web-timeout-rerun.txt` | branch `web-guards exit=0`, `web-build exit=0`, `Tests 4630 passed \| 5 skipped (4635)`, `Tests 215 passed \| 1 skipped (216)`; base `Tests 1 failed \| 4629 passed` (`Test timed out in 5000ms`, `CollaborationMessagesOrgRoot.integration.spec.ts`, load ~130-150), rerun alone `Tests 3 passed (3)` ×2 on each side | FU-010 (NotificationCenter) did not recur. The base failure is a load timeout, and the spec passes on both sides alone |
| API-10 | AC-005 | applications `typecheck:backend` + `build` | `pnpm -C applications/<app> …` | ENV-A, ENV-B | Pass | `API-03-11-suite-matrix-branch-and-base.txt` | branch `app-brief-studio exit=0`, `app-socratic-math-teacher exit=0`; base `-rerun2 exit=0` | Base first runs failed on harness order (bin link), not the product |
| API-11 | AC-006 | voice-input `tar` extraction | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run tests/integration/voice-input-extension.integration.test.ts` | ENV-A, ENV-B | Pass (same) | same | `Tests 2 passed (2)` on both | branch `tar` 7.5.22 |
| API-12 | AC-006 (`undici`) | `LMStudioLLM` → `undici` local long-running fetch, live LM Studio | `lms load qwen/qwen3.6-35b-a3b`; `env -i … LMSTUDIO_HOSTS=http://localhost:1234 LMSTUDIO_TARGET_TEXT_MODEL=… vitest run tests/integration/llm/api/lmstudio-llm.test.ts -t '^(?!.*multimodal).*'` | ENV-A | Pass | `API-12-lmstudio-undici.log` | `undici 7.30.1`; `✓ … should stream reasoning from a reasoning-capable text model 57474ms` (and `62918ms` in the first run); `Tests 5 passed \| 2 skipped (7)` | The other cases return early without calling the model, on base too (FU-012). The multimodal cases were excluded because one targets `http://192.168.2.124:29695`, the user's app port (Rule 2) |
| API-13 | DEC-007, AC-006 | `DownloadMediaTool` over real HTTP on axios 1.20.0 (the changed `String(contentType).split(';')` line) | local server answering `content-type: image/png; charset=binary`; `env -i … AUTOBYTEUS_MEDIA_LOCAL_BASE_URL=http://127.0.0.1:47620 pnpm -C autobyteus-ts exec vitest run tests/integration/tools/multimedia/download-media-tool.test.ts` | ENV-A | Pass | `API-13-dec007-axios-download.log` | `axios 1.20.0`; `✓ … downloads local media file: test-image`; `✓ … downloads a public PDF`; `Tests  2 passed (2)`; server log `REQ GET /rest/files/images/nice_image.png` | Added to close the confidence gap on the axios path: the test asserts the `.png` extension derived from the parameterized header |
| API-20 | AC-007, REQ-002 | packaged app: Electron version, server start, packaged harness | `build:electron:mac`; `verify-packaged-server-startup.mjs`; `test:e2e:electron --skip-build --adapter direct` and `--adapter playwright`; `test:e2e:electron:isolation --skip-build`; `test:e2e:isolated-app` | ENV-P | Pass | `API-20-packaged-app.txt` | `42.11.16`; `process.versions.electron=42.11.16 chrome=148.0.7778.280`; `Packaged server startup validation passed`; `electron-e2e-ready` ×2 and `exit=0`; `[electron-launch-profile-probe] passed`; `[isolated-app-lifecycle-probe] passed` | Without `--skip-build` both harness scripts fail before testing: their `pnpm build:electron` (ALL) needs a Linux host (FU-013; unchanged scripts) |
| API-21 | AC-007, DEC-008, `undici` | isolated packaged instance: native LM Studio agent replies with headings, inline and display KaTeX, a Python block, a mermaid diagram and `<img src=x onerror=…>`; the run is opened from the sidebar; DOM read over the control port | `isolated-app start --from-worktree`; `node markdown-run.mjs`; sidebar Workspaces → ws → agent → run row; `run-script --script-file render-check.js`; screenshot; `isolated-app stop`; `lms unload --all` | ENV-P | Pass | `API-21-conversation-journey.txt`, `API-21-conversation-rendered.png` | `"userAgentElectron": "Electron/42.11.16"`; `"h1": "Parity Heading One"`, `"h2": ["Parity Heading Two"]`; `"katexCount": 2`, `"katexDisplayCount": 1`; `"codeBlock": {… "classes": "language-python", "prismTokens": 7 …}`; `"mermaidSvg": {"nodes": 2, "hasStart": true, "hasEnd": true}`; `"imgWithOnerror": 0`, `"imgCount": 1`, `"xssFlag": "undefined"`; screenshot shows the rendered headings, math, code and diagram | Libraries: `dompurify 3.4.7`, `markdown-it 14.3.3`, `mermaid 11.17.2`, `katex 0.16.47`. The reply came from LM Studio through the packaged server (`undici`). The model left out the last marker line. Setting `#/chat?id=<runId>` directly left the app on `#/chat`; clicking the run row sets the same hash and opens it. Route code is not changed by this ticket; not investigated further. Stop: `forced: False`, data root removed |
| API-30 | AC-008 | Docker image: build, start, health, GraphQL query, GraphiQL page | `docker buildx build … -t autobyteus-server:dep229`; `docker run -p 127.0.0.1:48210:8000`; `curl /rest/health`, `POST /graphql`, `GET /graphiql` + its assets; cleanup | ENV-D | Pass | `API-30-docker-image.txt` | `build exit=0`; `{"status":"ok","message":"Server is running"}`; `{"data":{"__schema":{"queryType":{"name":"Query"}},"mcpServers":[]}}`; `status=200 content-type=text/html`, `<title>GraphiQL</title>`; `./graphiql/config.js -> … 200`, `./graphiql/main.js -> … 200`; server logs `0 error-level lines`; image has `axios@1.20.0`, `ws@8.22.0`, `undici@7.30.1`, `protobufjs@7.6.6` | First asset lines used a wrong base URL (superseded in the file). The remaining container error lines come from the chrome-vnc desktop base image |

## Before / After Counts (AC-006)

| Suite | Base `3b2c86ca9e` | Branch `10126a016a` | Same? |
| --- | --- | --- | --- |
| Contracts / SDKs / devkit | 6, 19, 18, 34, 12, 10, 22 pass | same | Same |
| `autobyteus-ts` test | 2368 passed, 78 skipped | 2370 passed, 78 skipped | +2 DEC-007 cases |
| server `test:unit` | 6310 passed, 7 skipped | 6309 passed, 1 failed, 7 skipped | Timing test (FU-011): fails on both sides under contention, passes on both otherwise |
| server `test:integration` | 421 passed, 69 skipped | 421 passed, 69 skipped | Same |
| `pnpm test:e2e` | 414 passed, 411 skipped | 414 passed, 411 skipped | Same |
| web `test:nuxt` | 4629 passed, 1 failed (load timeout), 5 skipped | 4630 passed, 5 skipped | Base timeout passes alone on both sides |
| web `test:electron` | 215 passed, 1 skipped | 215 passed, 1 skipped | Same |
| voice-input `tar` test | 2 passed | 2 passed | Same |
| web guards, `nuxt build`, applications | pass | pass | Same |
| `pnpm dedupe --check` | exit 1 | exit 0 | Intended change (AC-003) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 prod audit only the explained set | Yes | API-02 | Proven | — |
| AC-002 full audit only the explained set | Yes | API-02 | Proven | — |
| AC-003 `dedupe --check` exit 0 | Yes | API-01 | Proven | — |
| AC-004 removals and providers | Yes | API-R01 (IMP-05, IMP-11) | Proven | — |
| AC-005 install and every build | Yes | API-01, API-03, API-04, API-05, API-09, API-10, API-20, API-30 | Proven | — |
| AC-006 every suite, same as base or diagnosed | Yes | API-03, API-04, API-06 (diagnosed), API-07, API-08, API-09, API-11, API-12, API-13 | Proven | — |
| AC-007 packaged app: startup, harness, isolated instance on Electron 42.11.x with a working conversation view | Yes | API-20, API-21 | Proven | — |
| AC-008 Docker build and start (health + GraphQL) | Yes | API-30 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 96% | All ACs proven; fresh audit | — | — |
| Changed-boundary execution directness | 85% | 96% | Updated libraries ran in every suite, the packaged app (Electron, renderer, server, `undici`), the image (server deps), and the DEC-007 line over real HTTP (API-13) | Paths no suite covers (e.g. `xlsx` viewer, uploads via `@fastify/busboy`) are covered only as far as existing tests reach | — |
| Cross-boundary integration realism and mock gap | 85% | 96% | Real Electron 42.11.16, real LM Studio, real image, real axios 1.20 downloads (API-13) | No paid provider call (the provider SDK path is covered by existing tests) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 94% | Base and branch side by side; packaged mac; Linux image | Packaged Linux/Windows desktop not built here; heavy machine load | CI at release |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 94% | Every failure diagnosed with its cause (FU-011, base load timeout, harness order); instance stop graceful; sanitizer edge (`onerror`) proven | FU-008 and FU-010 intermittents did not recur in this run (not re-diagnosed) | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | Packaged harness (direct, playwright, launch profile), isolated-app lifecycle, conversation view DOM + screenshot | Only one conversation surface checked | — |
| Durable regression coverage quality and relevance | 90% | 94% | The full existing suites are the guard; DEC-007 has its 2 tests | FU-012: the LM Studio live file mostly returns early | — |

- Overall post-repository confidence: 84.7% (88, 85, 85, 85, 85, 75, 90)
- Overall final confidence: 95.0% (96, 96, 96, 94, 94, 95, 94; simple average)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`, after API-13. A first scoring gave 94.7%. The gap was the run-time axios path, closed by API-13; the remaining 94% categories are environmental (no packaged Linux/Windows host) and pre-existing test quality (FU-011, FU-012, FU-013)
- Confidence-limiting residual risks: none that point at a regression from this change.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (packaged app, harness, isolated instance), `Live API` (LM Studio), `Other` (Docker image; base-vs-branch suite matrix)
- Confidence gap addressed: the dependency changes reach every runtime. Repository suites alone could not prove the packaged Electron 42.11 shell, the real-Chromium rendering with the held DOMPurify, the live `undici` fetch, or the image. All are proven now.
- Browser validation needed: done inside the Electron renderer (API-21); no separate browser run is needed.

## Desktop Application Validation

- Approach executed: `build:electron:mac`; packaged harness scripts with `--skip-build` (FU-013); `test:e2e:isolated-app`; one isolated instance driven over its control port (sidebar click, DOM read, screenshot).
- Cases proving web-equivalent behavior: API-09 (`test:nuxt`), API-21 (renderer DOM). Shell-specific: API-20, API-21 (Electron version, packaged server, launch profile, lifecycle).
- Effect on any already-running desktop application: `None`. The user's app and other agents' instances were untouched.
- Behavior not directly proven: packaged Linux/Windows builds (no host).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (no overrides; checked in CRR-001; lockfile unchanged since)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Temporary probes: `run-suites.sh`, `audit-compare.py` (in `API-03-11-…` / `API-02-…`), `markdown-run.mjs`, `render-check.js` (in `API-21-conversation-journey.txt`).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Paid LLM providers | Not called; covered by existing unit/integration tests | Cost; axios 1.20 itself is exercised over real HTTP by API-13 | No live paid-provider call |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Base worktree `dependency-security-and-unused-cleanup-base` | Yes | `git worktree remove --force` | see the revision record |
| Isolated instance `iso-62256-32b4`; harness-launched instances | Yes | `isolated-app stop`; the harness cleans its own | stopped, not forced; data roots removed |
| LM Studio model | Yes | `lms unload --all` | unloaded |
| Docker container `dep229` and image | Yes | `docker rm -f -v`, `docker rmi` | removed; the user's containers untouched |
| `/tmp/dep229v` (logs, scripts) | Yes | removed after the evidence was written | see the revision record |
| Packaged app and `test-results/` in the branch worktree | Yes | left as untracked build outputs | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: Code Reviewer (`/software_engineering_team/code_reviewer`): pass with `architectural_risk=High` → proportional test-code review
- Notes:
  - Escalation triggers checked, none fired: no suite, build, packaged app or image fails because of an update; no override; no new source change.
  - Every failure seen has a proven cause unrelated to this change: FU-011 (Reproduced on both sides); the base-only load timeout (passes alone on both); the harness-order effects in the fresh base worktree; FU-013 (unchanged scripts).
  - New follow-ups: FU-011, FU-012, FU-013.
  - Final confidence 95.0% (94.7% before API-13).
