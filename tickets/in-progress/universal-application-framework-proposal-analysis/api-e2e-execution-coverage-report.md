# API/E2E Execution Coverage Report — Universal Application Dual-Host Foundation

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts: canonical `proposal-critical-analysis.md`, `design-self-validation.md`, and `sources/autobyteus-vertical-application-developer-experience-proposal.md` in the ticket directory.
- Solution / Architecture Revisions: `SR-011`; `ARCH-REV-009`.
- Implementation / Source Review: `IR-016`; `CRR-029` (`Pass / 97%`).
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID / Round: `API-REV-011` / `11`.
- Trigger: `CRR-029` source-review Pass for the behavior-neutral framework-vocabulary correction in `IR-016`.
- Reviewed branch / HEAD: `codex/universal-application-framework-proposal-analysis` / `d29ac0397a318e92e08ee882a3c20415ff3d8fee`.
- Prior Round: `API-REV-010` (`Pass / 98.3%`) and proportional test review `CRR-027`.
- Latest Authoritative Round: `Yes`.

## Investigation And Execution Basis

- Investigation completed before final execution: `Yes`.
- Investigation plan followed: `Yes`. The renamed durable boundaries ran first, followed by real isolated standalone, real Studio, route separation, actual business publication/handoff, restart/recovery, exact 73-path parity, and cleanup.
- Existing coverage decisions revised during execution: `No`. The IR-016 rename/update set remained valid and passed without weakened assertions.
- Reroute required: `No`.
- API/E2E-owned durable edit in round 11: `None`. IR-016 itself changes eleven durable server test paths, including five clean file-role renames/replacements and the strengthened zero-run-on-runtime-build assertion. That complete delta requires proportional review.

## Compatibility / Legacy Scope Check

- Compatibility or legacy behavior approved in scope: `No`.
- Compatibility-only behavior observed: `No`.
- Retired source/test names present outside historical ticket records: `No`, per CRR-029 source audit and the built root-export smoke.
- Persisted-data migration required by the vocabulary-only rename: `No`.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Criteria | Surface / Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| `APIE2E-RENAME-001` | renamed runtime, service, shutdown, Agent Tools, lifecycle, recovery, route and standalone boundaries retain behavior; runtime construction launches zero runs | TypeScript/full build plus exact 11-file repository selection | **Pass — 11 files / 34 tests** | `api-rev-011-focused-renamed-boundaries.log` |
| `APIE2E-EXPORT-001` | current public builders are callable; retired Studio builder export is absent | built root-export smoke | **Pass** | `api-rev-011-focused-renamed-boundaries.log` |
| `APIE2E-ROUTE-011` | internal Agent Tools keeps established auth/session behavior; external gateway remains Studio-only | live HTTP plus authenticated route integration | **Pass** | standalone/Studio route-separation logs and focused suite |
| `APIE2E-STANDALONE-011` | clean real Brief standalone starts, runs exact Codex/Luna team, publishes researcher/final artifacts, hands off to recipient `writer`, projects to app state | Chrome + real standalone on isolated port/data | **Pass** | standalone business JSON/PNG, actual-tools JSON, app-projection log |
| `APIE2E-STANDALONE-RESTART-011` | host stop/start restores prior graph state and a new real business run completes with fresh member runs | real stop/restart + Chrome | **Pass** | standalone restart log and post-restart business JSON/PNG |
| `APIE2E-STUDIO-011` | exact package team/setup/iframe, real business publication/handoff/projection | root Studio + `dev:studio` + Chrome | **Pass** | Studio business JSON/PNG, actual-tools JSON, app-projection log |
| `APIE2E-STUDIO-REMOUNT-011` | explicit Reload application replaces launch ID while retaining one iframe | targeted semantic browser probe | **Pass** | Studio remount JSON/PNG |
| `APIE2E-STUDIO-RECOVERY-011` | Studio stop/start restores the real team and persisted Brief projection | root/command restart + Chrome | **Pass** | Studio restart logs and recovery JSON/PNG |
| `APIE2E-PARITY-011` | all package/authoring bytes remain immutable through both hosts, business runs, remount and restart | exact 73-path SHA-256 comparisons | **Pass — 73/73** | baseline, after-standalone, after-Studio, and final parity logs |
| `APIE2E-CLEANUP-011` | owned listeners, processes, data and temporary probes do not leak | final process/port/path audit | **Pass** | `api-rev-011-final-cleanup-integrity.log` |

Historical `APIE2E-REPO-005` remains a separate `Unclear` whole-suite diagnostic. It was not rerun, reclassified, or used as current pass evidence because no supported connection to IR-016 was found.

## Repository Coverage Execution

| Order | Command / Selection | Boundary | Result |
| --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | current renamed compile graph | Pass |
| 2 | `pnpm -C autobyteus-server-ts build:full` | built runtime and root exports | Pass |
| 3 | focused Vitest selection: `agent-tools-mcp-runtime`, `application-platform-runtime-isolation`, `application-run-shutdown-coordinator`, `application-run-services`, lifecycle, standalone server, launch binding, orchestration recovery, Agent Tools routes, application capabilities, imported Brief | exact renamed and adjacent execution spine | **11 files / 34 tests Pass** |
| 4 | built package root-export probe | `buildStudioServer`, `startStandaloneApplicationHost`, retired export absence | Pass |
| 5 | `pnpm -C autobyteus-application-devkit build`; `pnpm -C applications/brief-studio build`; `pnpm -C applications/brief-studio validate` | maintained CLI/package baseline | Pass |
| 6 | `git diff --check` | artifact/source whitespace integrity | Pass |

The strengthened runtime-isolation test directly asserts two application runtime builds call neither `createAgentRun` nor `createTeamRun`. Launch remains demand-driven and is separately proven by the real business journeys.

## Broader Validation Decision And Execution

- Decision: **Required — completed**.
- Reason: IR-016 is behavior-neutral by design but renames the owners on the real dual-host execution, Agent Tools, scoped-session, publication and shutdown spine. Repository tests alone could not prove launch descriptors, route registration, real provider runs, recipient routing, projection, restart or package immutability.
- Environment: Node `v22.23.1`; pnpm `10.28.2`; macOS `26.5.2` arm64; system Google Chrome `150.0.7871.187`; real Codex App Server with package-owned `gpt-5.6-luna` launch defaults.
- Isolation: standalone used port `43125` and `/tmp/api-rev011-standalone-data`; Studio used project-owned `.autobyteus/development` and ports `8000`/`3000`.

### Standalone Journey

1. Built/validated Brief and captured exactly 73 baseline package/authoring hashes.
2. Started `pnpm -C applications/brief-studio start -- --port 43125 --data-dir /tmp/api-rev011-standalone-data`.
3. Proved internal no-bearer `401 unauthorized`, invalid session `404 session_unavailable`, and standalone external `/mcp/gateway` absence (`404`).
4. In Chrome, created `API REV 011 standalone rename parity 1785436638`, launched the exact package team, and reached `in_review`, two draft outputs, and one final artifact.
5. Actual traces show researcher `publish_artifacts` success, `send_message_to` with `recipient_name: writer` success, and writer `publish_artifacts` success. SQLite projection contains the binding and both artifact revisions.
6. Stopped the host, confirmed port clearance, restarted with the same isolated data, observed mixed-team restoration, and completed a second real Brief `API REV 011 standalone post restart 1785436820` to the same terminal business state with fresh runs and the same actual publication/handoff sequence.
7. The second model run had one intermediate `run_bash` failure and recovered autonomously; the required publication, handoff and final projection all succeeded. This is retained as non-gating runtime evidence rather than hidden.

### Studio Journey

1. Started supported root `pnpm dev` and Brief `pnpm -C applications/brief-studio dev:studio`; observed all readiness signals and exact package registration.
2. Proved internal no-bearer `401`, invalid session `404`, and successful Studio-only `/mcp/gateway` initialization (`autobyteus_mcp_gateway`).
3. In Chrome, required exact Brief Studio Team, `gpt-5.6-luna`, enabled `Enter application`, and exactly one iframe.
4. Created `API REV 011 studio rename parity 1785437064`; the real run reached `in_review`, two outputs and one final. Actual traces show researcher publication, named writer handoff, writer publication; the app database contains both revisions and an attached binding.
5. The first combined browser probe finished the business assertion but used an incorrect hidden-control locator for Reload and timed out. The evidence records that harness error. A corrected targeted semantic probe opened the immersive controls, clicked `application-immersive-reload`, changed `iframe-launch-1` to `iframe-launch-2`, and retained exactly one iframe.
6. Stopped both Studio processes, confirmed listener clearance, restarted them against the same data, observed mixed-team restoration, and proved the prior persisted Brief still rendered as `in_review` with two outputs and one final.

### Package Integrity

- Baseline: 73 exact package/authoring files.
- After standalone real run: 73/73 identical.
- After Studio real run and explicit remount: 73/73 identical.
- After both restart/recovery cycles: 73/73 identical.
- No tracked authoring or package byte required restoration.

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Evidence / residual |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 96% | 99% | both hosts, real team, publication, handoff, restart, route separation and parity directly pass |
| Changed-boundary execution directness | 98% | 99% | exact renamed tests plus both production host builders and real lifecycle |
| Cross-boundary integration realism / mock gap | 95% | 99% | real Chrome, Codex/Luna, Agent Tools dispatch, relay and application projection |
| Environment, configuration, identity and fixture fidelity | 98% | 99% | maintained Brief package, supported commands, exact current worktree and isolated data |
| Failure, edge-case, lifecycle and recovery | 96% | 98% | auth/session negatives, explicit remount, two host restarts, recovered model tool error, leak-free stop |
| User-surface / browser confidence | 96% | 99% | standalone and Studio business UI, exact setup gate/iframe, remount and recovery |
| Durable regression quality and relevance | 98% | 99% | 11 IR-016 durable paths cover current roles; strengthened zero-run assertion; real validation closes mock gap |

- Overall post-repository confidence: `97%` (`96.7%`).
- Overall final confidence: **99%** (`98.9%`), simple mean across seven categories.
- Applicable category below `90%`: `No`.
- Critical changed-boundary criterion lacking direct proof: `None`.
- Default clean target met: `Yes`.

## Durable Tests Implemented / Updated / Renamed

Round 11 adds no API/E2E-authored test code. The reviewed IR-016 durable delta must receive proportional test-code review:

| Path / change | Decision / result |
| --- | --- |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` updated | Still valid; Pass in focused selection |
| `standalone-application-composition.integration.test.ts` -> `standalone-application-server.integration.test.ts` | valid role rename; Pass |
| `mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts` updated | valid terminology update; prior and focused ownership evidence retained |
| `agent-tools-mcp-process-authority.test.ts` -> `agent-tools-mcp-runtime.test.ts` | valid role rename; Pass |
| `definition-catalog-refresh.test.ts` updated | valid terminology update; Pass |
| `application-launch-configuration-service.test.ts` updated | valid terminology update; relevant launch path Pass |
| `application-platform-lifecycle.test.ts` updated | valid terminology update; Pass |
| `application-platform-runtime-graph-isolation.test.ts` removed and `application-platform-runtime-isolation.test.ts` added | clean replacement with stronger zero-run-on-build assertion; Pass |
| `application-run-authorities.test.ts` -> `application-run-services.test.ts` | valid role rename; Pass |
| `application-run-shutdown-authority.test.ts` -> `application-run-shutdown-coordinator.test.ts` | valid role rename; Pass |

No stale current-behavior test was retained and no assertion was weakened.

## Temporary Execution Methods

Temporary Playwright scripts under `autobyteus-application-devkit/.tmp-api-rev011` drove semantic browser state and were removed after evidence capture. Temporary hash files, isolated data roots and repository test scratch were also removed. These probes are not durable test changes.

## Cleanup Performed

| Resource | Ownership | Result |
| --- | --- | --- |
| standalone port/data (`43125`, `/tmp/api-rev011-standalone-data`) | API-REV-011 | stopped/removed |
| Studio ports/data (`8000`, `3000`, `.autobyteus/development`) | API-REV-011 | stopped/removed |
| inspector port `9229` | API-REV-011 | clear |
| temporary Playwright and server-test scratch | API-REV-011 | removed |
| API-owned matching processes | API-REV-011 | zero |
| pre-existing user port `43124` | user-owned and explicitly excluded | user process ended independently before final audit; API/E2E never stopped or deleted its data |
| generated devkit `dist` | pre-existing/user-used | deliberately preserved |
| diff integrity | repository | `git diff --check` Pass |

## Evidence Inventory

All evidence is under:
`/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/`

Key round-11 files:
- `api-rev-011-focused-renamed-boundaries.log`
- `api-rev-011-prelive-baseline.log`
- `api-rev-011-standalone-host.log`, `api-rev-011-standalone-restart.log`
- `api-rev-011-standalone-business.json`, `api-rev-011-standalone-post-restart-business.json`
- `api-rev-011-standalone-actual-tools.json`, `api-rev-011-standalone-app-projection.log`
- `api-rev-011-standalone-route-separation.log`
- `api-rev-011-studio-root.log`, `api-rev-011-brief-dev-studio.log`, and restart counterparts
- `api-rev-011-studio-business.json`, `api-rev-011-studio-remount.json`, `api-rev-011-studio-recovery.json`
- `api-rev-011-studio-actual-tools.json`, `api-rev-011-studio-app-projection.log`
- `api-rev-011-studio-route-separation.log`
- `api-rev-011-final-parity.log`
- `api-rev-011-final-cleanup-integrity.log`

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| **Pass** | `APIE2E-RENAME-001`, `APIE2E-EXPORT-001`, `APIE2E-ROUTE-011`, `APIE2E-STANDALONE-011`, `APIE2E-STANDALONE-RESTART-011`, `APIE2E-STUDIO-011`, `APIE2E-STUDIO-REMOUNT-011`, `APIE2E-STUDIO-RECOVERY-011`, `APIE2E-PARITY-011`, `APIE2E-CLEANUP-011` | IR-016 preserves the complete tested dual-host behavior under the corrected role vocabulary. |

## Preliminary Classification

`N/A — Pass`. No requirement-linked source, test, fixture or environment failure remains. Historical `APIE2E-REPO-005` remains independently `Unclear` and outside this rename result.

## Recommended Recipient

`code_reviewer` for the required separate proportional review of the IR-016 durable test rename/update delta. Do not route directly to delivery.

## Latest Authoritative Result

- Result: **Pass**.
- Final validation confidence: **99%** (`98.9%`).
- Broader validation: **Required — completed**.
- Applicable category below 90%: `No`.
- Critical acceptance criteria lacking direct proof: `None` for the changed boundary.
- Next stage: `code_reviewer` proportional durable-test review.
