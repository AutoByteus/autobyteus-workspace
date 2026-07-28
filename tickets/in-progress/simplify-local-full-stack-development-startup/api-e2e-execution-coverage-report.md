# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/development-startup-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/solution-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/code-review-revision-record.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/in-progress/simplify-local-full-stack-development-startup/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: Implementation-source review passed at commit `6280e70721dcb11e50d9cc22cb43a20580ee5e66`.
- Prior Round Reviewed: None; this is the first completed API/E2E result.
- Latest Authoritative Round: Round 1; result `Fail` pending focused failure-origin review.

## Investigation And Execution Basis

- Coverage investigation artifact: completed before final execution at the canonical path above.
- Investigation completed before durable coverage changes or final execution: `Yes`.
- Investigation plan followed: `Yes`, with one material stop: root deterministic E2E exposed a command-wiring failure and was interrupted after proving the wrong suite scope; no further API/E2E execution was started before failure-origin routing.
- Existing coverage decisions revised during execution, with evidence: root `pnpm test:e2e` is not currently a deterministic E2E-only invocation. Its logged child command is `vitest -- --run tests/e2e`, and the output includes `tests/unit/**` and `tests/integration/**` before interruption. This is a changed-scope/package-script finding, not a stale-test validity finding.
- Reroute required before or during execution: `Yes` — focused failure-origin review by `code_reviewer`.
- Notes: The occupied-port failure was separately reproduced and is setup evidence, not treated as an implementation defect. The lifecycle/path harness passed. Exact fixed-port clean startup and the corrected root E2E command remain unproven.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` for the exercised materializer; the root E2E setup uses its existing test reset and no development/production data.
- Durable coverage added or retained only for compatibility-only behavior: `No`.
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`.
- Upstream recipient notified: Pending focused failure-origin handoff to `code_reviewer`.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `DEV-001` | `REQ-001`, `REQ-006`, `REQ-007`; `AC-001`, `AC-009` | Root launcher fixed-port preflight and full-stack start | CLI `pnpm dev` with exact existing listeners | Live / CLI | `Blocked` | `evidence/04-occupied-port.log`; exact result `DEV_PORT_OCCUPIED`, exit 1. |
| `DEV-002` | `REQ-003`–`REQ-005`; `AC-002`–`AC-004`, `AC-007` | Materialization and persisted development root | Temporary executable harness | Temporary | `Pass` | `evidence/05-lifecycle-harness.log`; canonical data root, template bytes, path confinement. Exact live restart remains not tested because fixed ports were unavailable. |
| `DEV-003` | `REQ-002`; `AC-005` | Module-relative root resolution | Temporary harness from `/tmp`; alternate-cwd CLI attempt | Temporary / CLI | `Pass` (module probe); `Blocked` (CLI exact start) | Harness records canonical root from alternate cwd; `evidence/04-alternate-cwd-occupied-port.log` records exact CLI fail-closed result. |
| `DEV-004` | `REQ-004`–`REQ-006`; `AC-004`, `AC-006`, `AC-011` | Environment/template/path/symlink isolation | Temporary executable harness and template hashes | Temporary / Live setup | `Pass` | `evidence/05-lifecycle-harness.log`; `evidence/04-listeners-before.txt` and `04-listeners-after.txt` show tracked template hashes unchanged and production-root metadata unchanged. |
| `DEV-005` | `REQ-007`, `REQ-008`; `AC-009` | Port and child-failure propagation | Exact occupied-port CLI plus fake-child lifecycle harness | Live / Temporary | `Pass` for failure behavior | `evidence/04-occupied-port.log` (`DEV_PORT_OCCUPIED`); `evidence/05-lifecycle-harness.log` (backend failure `DEV_BACKEND_START_FAILED`, frontend/child failure `DEV_CHILD_EXITED`, unexpected sibling cleanup). |
| `DEV-006` | `REQ-008`; `AC-010` | Signals, repeat stop, owned cleanup | Temporary real child process-group harness | Temporary / Lifecycle | `Pass` | `evidence/05-lifecycle-harness.log`; SIGINT/SIGTERM repeat emission, owned child PIDs gone, unrelated sentinel remained alive. |
| `DEV-007` | `REQ-009`, `REQ-010`; `AC-008` | Root deterministic E2E command ownership and test isolation | `pnpm test:e2e` | Live repository command | `Fail` | `evidence/03-root-test-e2e.log`; actual Vitest invocation was `vitest -- --run tests/e2e` and ran unit/integration files, so deterministic E2E-only behavior is not proven. Process was stopped with SIGINT after scope failure; shell exit 130. |
| `DEV-008` | `REQ-014`; `AC-007`, `AC-012` | Production/Electron/test isolation | Hash/metadata scan and source boundaries | Temporary / Structural | `Pass` for observed scope | `evidence/04-listeners-before.txt` and `04-listeners-after.txt`; no production file contents read, no unrelated process touched. |
| `DEV-009` | `REQ-012`, `REQ-013`; `AC-011`, `AC-013` | Credential-free templates/docs/command separation | Tracked source/template review | Structural | `Pass` | Reviewed artifact chain and unchanged tracked template hashes; no automatic import path exercised. |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `node --test scripts/development/run-dev.test.mjs` | repo root | Four focused launcher template/materialization/port tests. | `Pass` | `evidence/01-launcher-unit.log` — 4/4. |
| 2 | `pnpm --filter autobyteus-server-ts build` | repo root | Real server build and sanitized built-in-agent smoke. | `Pass` | `evidence/02-server-build.log` — status 0. |
| 3 | `pnpm test:e2e` | repo root | Root deterministic E2E command. | `Fail` | `evidence/03-root-test-e2e.log`; command expanded to `vitest -- --run tests/e2e` and included unit/integration tests. |
| 4 | `pnpm dev` with hostile launcher-owned env and exact occupied ports | repo root | Fixed-port fail closed without starting/cleaning unrelated stack. | `Pass` as expected setup outcome; root CLI nonzero | `evidence/04-occupied-port.log`, listener snapshots. |
| 5 | `pnpm --dir <repo> dev` from `/tmp` with hostile env and exact occupied ports | `/tmp` | Module-relative command path and alternate-cwd fixed-port behavior. | `Pass` as expected setup outcome; CLI nonzero | `evidence/04-alternate-cwd-occupied-port.log`. |
| 6 | Temporary Node lifecycle/path harness | repo root; source imported by absolute path | Symlink/env/template confinement, signals, repeat stop, child failure, unrelated cleanup. | `Pass` | `evidence/05-lifecycle-harness.log`. |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 70% | -5 | Launcher tests, build, path/lifecycle harness, and occupied-port fail-closed evidence prove many seams. | `AC-001`, exact restart, and `AC-008` root deterministic command remain unproven; root command currently fails scope contract. |
| Changed-boundary execution directness | 75% | 72% | -3 | Real CLI reaches build and launcher; temporary harness calls real supervisor with real child processes. | No clean exact fixed-port launcher start because ports are owned by unrelated PIDs. |
| Cross-boundary integration realism and mock gap | 70% | 60% | -10 | Built server smoke/build passed; real child process-group harness passed. | No real backend + Nuxt pair under this launcher; root E2E command did not isolate E2E scope. |
| Environment, configuration, identity, and fixture fidelity | 85% | 88% | +3 | Alternate-cwd module probe, hostile env, template/symlink, tracked hash, production metadata, and test reset evidence. | Full live server restart against the materialized development DB/key remains untested. |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 90% | +20 | Real child process failure, signals, repeated stop, bounded cleanup, and unrelated sentinel preservation passed; exact occupied-port path passed expected fail-closed. | Windows process-tree semantics and exact live frontend failure remain platform-limited. |
| User-surface, browser, and desktop-shell confidence | 80% | 65% | -15 | Frontend URL contract is source-reviewed and fixed-port readiness probe is covered by fake request; no UI code changed. | No live Nuxt HTTP/browser validation due fixed-port collision; no browser executable; Electron intentionally untouched. |
| Durable regression coverage quality and relevance | 90% | 90% | 0 | Four focused durable launcher tests and existing server E2E inventory remain relevant. | No durable fixed-port lifecycle test, intentionally avoided because it would bind shared developer ports. |

- Overall post-repository confidence: `77%` (initial estimate before execution).
- Overall final confidence: `76%` (simple average of final category scores: 70+72+60+88+90+65+90 = 535 / 7 = 76.4%, rounded).
- Calculation method: Simple average; weak critical evidence is not hidden by the average.
- Confidence change produced by broader validation: lifecycle/path evidence raised failure/lifecycle and environment confidence, but root command-scope failure and occupied fixed ports lowered overall direct integration confidence.
- Every critical acceptance criterion directly proven: `No`.
- Any final applicable category below `90%`: `Yes` — requirement proof, changed-boundary directness, cross-boundary realism, user-surface/browser/desktop-shell.
- Default final confidence target of `95%` met: `No`.
- Confidence-limiting residual risks: root `pnpm test:e2e` argument wiring; no clean fixed-port full-stack start/restart; no live Nuxt/browser execution; Windows semantics.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — `Lifecycle` + `Live API` + `CLI`.
- Material deviation from planned mode or rationale: Lifecycle/path/CLI probes ran. Exact live fixed-port full-stack and corrected deterministic E2E were not continued after the root E2E command-scope failure was discovered; focused failure-origin review is required first.
- Confidence gap or residual risk actually addressed: Environment/path confinement, child-process failure propagation, SIGINT/SIGTERM cleanup, repeat-stop, and no-unrelated-process cleanup were directly exercised. Fixed-port CLI fail-closed was directly exercised.
- If `Not Required`: N/A.
- If `Blocked`: Exact setup dependency for clean fixed-port stack is unrelated processes PID `10242` (backend) and PID `10276` (frontend) listening on this host; no process was stopped or reused. Browser executable is also unavailable.
- Startup order, commands, and readiness results: Build passed. `pnpm dev` materialized no state and returned `DEV_PORT_OCCUPIED` before children. Temporary harness observed readiness markers using fake requests and real child processes, not real backend/frontend HTTP. Root E2E setup reset its test DB, then invoked the wrong Vitest scope.
- Environment choices that materially affected the run: hostile launcher-owned env values, alternate cwd `/tmp`, exact loopback ports occupied, no secrets/external providers, no production content reads.
- Seed data, fixtures, identities, authentication, permissions, or session state: none for launcher probes; Vitest used existing deterministic Prisma test setup.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Root `pnpm dev` preflight | Nonzero stable `DEV_PORT_OCCUPIED`, no owned children | Exactly `DEV_PORT_OCCUPIED`, status 1; existing listeners unchanged | `evidence/04-occupied-port.log`, before/after listener snapshots | Pass (expected failure path) |
| Alternate-cwd root command | Same module-relative root and fixed-port semantics | CLI returned same `DEV_PORT_OCCUPIED`; pure module probe selected canonical root from `/tmp` | `evidence/04-alternate-cwd-occupied-port.log`, `05-lifecycle-harness.log` | Partial |
| Hostile env/template/path/symlink matrix | No redirect/escape; fail closed | Canonical paths preserved; symlinks rejected; template unchanged | `evidence/05-lifecycle-harness.log` | Pass |
| Child backend/frontend failure | Stable nonzero error and owned cleanup | Backend `DEV_BACKEND_START_FAILED`; frontend/child `DEV_CHILD_EXITED`; all owned PIDs gone | `evidence/05-lifecycle-harness.log` | Pass |
| SIGINT/SIGTERM/repeat stop | Both owned children stop, repeated signals idempotent, unrelated stays | Real detached fake children stopped; repeat signals safe; unrelated sentinel remained alive | `evidence/05-lifecycle-harness.log` | Pass |
| Root deterministic E2E | Only `tests/e2e` assertions, isolated test state | `vitest -- --run tests/e2e` ran `tests/unit` and `tests/integration`; stopped after scope failure | `evidence/03-root-test-e2e.log` | Fail |
| Real backend `/rest/health` + Nuxt HTTP | Both exact endpoints ready | Not run; fixed ports occupied before child spawn | Listener snapshot and `04-occupied-port.log` | Blocked |
| Stop/restart same live development DB/key | Same DB/key and persisted configuration | Not run; no live stack could start | None | Not Tested |
| Browser/desktop renderer | Browser validation only if material | No browser engine; no UI source changed; Electron untouched | Investigation decision | Not Tested / Out of Scope |

## Desktop Application Validation

- Validation approach executed and any deviation from the investigation: No Electron execution. The existing packaged Electron process and `~/.autobyteus/server-data` were not touched. Browser validation was not run because no browser executable is installed and no UI/renderer code changed.
- Browser-tested web-equivalent behavior and evidence: None. Exact frontend HTTP readiness was planned but blocked by port ownership.
- Shell-specific or lifecycle behavior and evidence: Electron shell not exercised; source boundary and production-root metadata were preserved.
- Effect on any already-running desktop application: `None`; no process was stopped, reused, or signaled.
- Behavior not directly proven and confidence consequence: Live Nuxt/browser rendering and Electron shell remain unproven but are not changed product behavior; frontend/startup integration confidence remains below clean target.

## Platform / Runtime Targets

- Operating system / platform: macOS arm64.
- Runtime and relevant framework versions: Node.js `v22.23.1` for probes; pnpm `10.28.2`; Vitest `4.0.18`; Prisma `5.22.0`; Nuxt dependency present in workspace.
- Browser / engine and version: None available; `playwright-core` package exists but no Chrome/Chromium executable was installed.
- Device, viewport, locale, timezone, or accessibility settings: N/A.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`.
- Representative existing data exercised: No production data opened. Fresh ignored development materialization and test-owned Prisma reset only.
- Direct-use, discard/rebuild, or migration result and evidence: Materializer created no migration/copy path and kept paths confined; live DB/key restart was not possible due fixed-port setup.
- Migration completion/recovery evidence: N/A.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`.
- Residual untested persisted-data risk: same development DB/key across actual backend stop/restart and normal application settings persistence.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| None | None | Existing durable launcher/server coverage | Existing checks pass where run | Temporary harness only; no durable API/E2E test file changed. |

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| Deleted `test-support/live-e2e/run-test-dev.mjs`, `run-test-server.mjs`, `run-test-web.mjs` | Misleading manual `*:test` startup wrappers | `REQ-011`; implementation/review artifacts | Already removed by implementation; root `pnpm dev` plus `pnpm test:e2e` are intended replacement, but root E2E command wiring needs focused review. |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`.
- Paths added or updated: None.
- Paths removed: None by API/E2E; implementation removed obsolete wrappers upstream.
- Added or updated paths attached for proportional test-code review: `Not Applicable` pending failure-origin review; no durable test code changed.
- Diff or repository evidence supplied for removed paths: Upstream implementation diff and report.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `evidence/01-launcher-unit.log` | Focused durable launcher test output | Retained | 4/4 passed. |
| `evidence/02-server-build.log` | Real server build output | Retained | Status 0. |
| `evidence/03-root-test-e2e.log` | Root E2E scope failure output | Retained | Shows malformed Vitest args and unit/integration leakage; interrupted with SIGINT. |
| `evidence/04-listeners-before.txt`, `04-listeners-after.txt` | Port/process/template/production metadata snapshots | Retained | No production content read. |
| `evidence/04-occupied-port.log`, `04-alternate-cwd-occupied-port.log` | Exact CLI fail-closed evidence | Retained | PIDs 10242/10276 preserved. |
| `evidence/05-lifecycle-harness.log` | Temporary real-child lifecycle/path evidence | Retained | Harness source was disposable and removed from repository; evidence retained. |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `/tmp/api-e2e-dev-harness.mjs` | Exercise real child process groups and path/symlink seams without binding shared fixed ports. | Pass; evidence in `evidence/05-lifecycle-harness.log`. | Temporary script remains outside repository for review during this handoff; all spawned children and `.autobyteus/development/` state were removed. |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Fixed-port availability | `probe: async () => {}` in lifecycle harness | Exact 8000/3000 are occupied by unrelated processes; binding would be unsafe. | Harness does not prove real bind/readiness on fixed ports; occupied CLI path proves fail closed. |
| Backend/frontend HTTP request in lifecycle harness | `request: async () => ({ ok: true })` | Harness targets supervisor/child lifecycle while avoiding shared ports. | Does not prove real backend `/rest/health` or Nuxt HTTP; live path remains blocked. |
| Backend/frontend child commands in lifecycle harness | Real detached Node sleeper/failure children returned by injected `spawnProcess` | Need deterministic child failure/signal timing without launching product services. | Does not prove built backend/Nuxt internals; build and source review cover those owners. |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| `Pass` | `DEV-002`, `DEV-004`, `DEV-005`, `DEV-006`, `DEV-008`, `DEV-009` | Path/env/symlink confinement, failure propagation, signal/repeat-stop/owned cleanup, and production/template preservation passed. |
| `Blocked` | `DEV-001`, `DEV-003` exact CLI, live portion of `DEV-002`, live portion of `DEV-007` | Unrelated listeners own required fixed ports; no process was touched. |
| `Fail` | `DEV-007` | Root script invokes Vitest as `vitest -- --run tests/e2e`, causing unit/integration files to run instead of deterministic E2E-only scope. |
| `Not Tested` | Live backend/frontend readiness, live stop/restart persistence, browser, Electron | Blocked or intentionally out of scope. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temporary fake backend/frontend children | This validation run | Bounded SIGTERM/SIGKILL process-group cleanup | Pass; no owned PID remained. |
| Unrelated sentinel child | This validation run, explicitly created as unrelated | Verified alive after cleanup, then stopped by harness | Pass. |
| Development runtime `.autobyteus/development/` | This validation run | Removed recursively after harness | Pass; only parent `.autobyteus/` remains. |
| Vitest root command process | This validation run | SIGINT after scope failure | Pass; no worktree Vitest process remained; exit 130 recorded. |
| Existing listeners PID 10242/10276 | Unrelated worktree/process | No action | Preserved; still own 8000/3000. |
| Existing Electron / production data path | Unrelated | No action; metadata only | Preserved. |

## Classification

- Preliminary failure classification: `Local Fix` — root `package.json` test command passes an extra `--` and therefore does not select only `tests/e2e`; implementation-owned command packaging is the likely origin. This is sent to `code_reviewer` for focused failure-origin confirmation, not directly treated as a source defect without review.
- Port-related startup result classification: `Blocked` setup limitation, not implementation failure. The implementation returned the expected stable `DEV_PORT_OCCUPIED` and left unrelated listeners unchanged.

## Recommended Recipient

`code_reviewer` for focused failure-origin analysis of `DEV-007` / `REQ-009` / `AC-008`, with likely bounded implementation rework routed to `implementation_engineer` only if confirmed.

## Evidence / Notes

- Exact root command evidence begins with the package expansion and ends with `vitest -- --run tests/e2e`; multiple `tests/unit/**` and `tests/integration/**` files are visible in the same log. This is directly observable and not inferred from a missing result.
- The source-review report's claim that the root command maps to `tests/e2e` is contradicted by this executable invocation; preserve this report as the current runtime evidence.
- No source/test file was changed by API/E2E. Do not send this result through successful proportional test-code review.

## Latest Authoritative Result

- Result values: `Fail`.
- Result: `Fail` — root `pnpm test:e2e` does not currently execute the deterministic E2E-only command as required; exact clean stack/live HTTP and restart evidence are also blocked by unrelated fixed-port listeners.
- Final validation confidence: `76%`.
- Default `95%` confidence target met: `No`.
- Any final applicable confidence category below `90%`: `Yes` — requirement proof, direct changed-boundary execution, integration realism, user-surface/browser/desktop-shell.
- Broader validation decision: `Required`, partially executed; reroute before continuing.
- Critical acceptance criteria lacking direct proof: `AC-001`, `AC-003`, `AC-005` exact successful start/restart path, `AC-008` deterministic root command, and live portions of `AC-009`/`AC-010`.
- Required next recipient: `code_reviewer` for focused failure-origin review.
- Notes: Preserve the occupied-port evidence and exact PIDs. After confirmed correction, rerun root `pnpm test:e2e`, then return through implementation-source review if implementation-owned, and perform API/E2E again with a fresh revision record entry.
