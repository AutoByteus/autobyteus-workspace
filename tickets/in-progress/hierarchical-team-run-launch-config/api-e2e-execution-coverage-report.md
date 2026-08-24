# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/recovery-audit.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/remote-recovery-branch-comparison.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/done/remote-node-new-workspace-team-run-visibility/requirements.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/done/remote-node-new-workspace-team-run-visibility/design-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/done/remote-node-new-workspace-team-run-visibility/ui-ux-spec.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md` (`CRR-008` integrated source Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-revision-record.md`
- Delivery Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-005`
- Current Execution Round: 5
- Trigger: `CRR-008` integrated source Pass for DR-001 / IR-004 / IR-005, plus the user's explicit request for actual packaged Electron, `open_tab`, complete private-package import, root Codex Luna, nested AutoByteus DeepSeek, on-disk V2 proof, ordinary Team messaging, and formal Team delegation/acceptance.
- Prior Round Reviewed: `API-REV-004` — Pass / 99%, followed by `CRR-006` proportional Pass for the protected parent only.
- Latest Authoritative Round: This report, `API-REV-005` — `Fail` / `89%` for integrated HEAD `5dc5105b14d5c215a70254ce317ad725d130f16e`.

## Investigation And Execution Basis

- Investigation completed before durable edits and execution: `Yes`.
- Investigation plan followed: `Yes`, with one material evidence-driven extension. A real Existing-workspace provider retry was added after the initial owned local path was registered as metadata but did not exist as a process `cwd`; the retry created only the owned directories and supplied the absolute Codex command.
- Existing coverage decisions revised during execution: `RunConfigPanel.spec.ts` remained `Needs Update` and was expanded. The two server E2Es remained `Still Valid`, unchanged at their CRR-006 hashes, and passed. The real browser exposed a continuation defect not represented by the synchronous component-store mock.
- Reroute required: `Yes` — `API-E2E-F-002` to `/code_reviewer` for focused failure-origin review. This is not a successful proportional-review or delivery handoff.
- Notes: API-REV-004 and CRR-006 remain historical evidence; they do not certify this integrated state. The dated recovery branch remains unmerged and non-authoritative.

## Compatibility / Legacy Scope Check

- Invalid backward-compatibility scope observed: `No`.
- Compatibility-only runtime behavior observed: `No`.
- Approved persisted-data transition followed: `Yes` — fresh integrated production-upgrade execution passed 4/4 through the registered forward-only V1 -> V2 startup path.
- Durable coverage retained only for invalid compatibility behavior: `No`.
- Upstream recipient notified: pending the failure handoff at the end of this round.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance IDs | Boundary / Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| API-E2E-003 | R-021–R-027; AC-016–AC-020 | Built server GraphQL -> planner -> V2 filesystem -> restart/restore | Pass, 7/7 | `api-rev-005-hierarchical-graphql-lifecycle.txt`; unchanged hash `bc4fda79...` |
| API-E2E-004 | R-028–R-037; AC-021–AC-030 | Released V1 package -> startup migration -> final V2 -> GraphQL/restart/retry | Pass, 4/4 | `api-rev-005-v2-production-upgrade-full.txt`; unchanged hash `3413ed1f...` |
| API-E2E-014 | Current-base FR-001–FR-005, AC-001–AC-006; integrated root/nested workspace readiness | Current Nuxt through actual `open_tab` -> packaged GraphQL workspace registration -> TeamRun creation | **Fail** | First click registered/canonicalized root+nested paths but created no TeamRun; second click launched. `api-rev-005-team-registration-continuation-failure.md` |
| API-E2E-015 | Standalone Agent controlled workspace preservation | Current browser -> packaged backend -> real AutoByteus/DeepSeek Agent -> disk metadata | Pass | Exact `AGENT_RUN_OK`; `api-rev-005-agent-run-metadata.json`, `api-rev-005-open-tab-agent-deepseek-success.png` |
| API-E2E-016 | User-requested heterogeneous nested Team, exact on-disk V2, ordinary message, formal delegated task acceptance | Packaged Electron/backend -> current browser -> Codex/Luna root -> AutoByteus/DeepSeek nested Team -> message/task stores | Pass | Exact message `INTEGRATED_SUBTEAM_MESSAGE_OK`; accepted exact task `INTEGRATED_SUBTEAM_TASK_OK`; `api-rev-005-retry-*`, success screenshot |
| API-E2E-017 | Active New/empty, same-draft edit retention, inactive buffers, failure retention, identity reset | Durable Nuxt component/store/hierarchy cohort | Pass, 9 files / 134 tests | `api-rev-005-web-workspace-and-hierarchy.txt`; focused changed file 35/35 |

## Repository Coverage Execution

| Order | Command | Working Directory | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt components/workspace/config/__tests__/RunConfigPanel.spec.ts --run` | `autobyteus-web` | Pass, 1 file / 35 tests | `api-rev-005-run-config-panel-focused-final.txt` |
| 2 | `pnpm test:nuxt --run components/workspace/config/__tests__ stores/__tests__/agentRunConfigStore.spec.ts stores/__tests__/teamRunConfigStore.spec.ts utils/__tests__/teamRunLaunchHierarchy.spec.ts` | `autobyteus-web` | Pass, 9 files / 134 tests | `api-rev-005-web-workspace-and-hierarchy.txt` |
| 3 | `pnpm build` | `autobyteus-web` | Pass, 3,730 modules / 15 routes | `api-rev-005-web-build.txt` |
| 4 | `pnpm run build:full` | `autobyteus-server-ts` | Pass | `api-rev-005-server-build-full.txt` |
| 5 | `pnpm exec vitest run tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts` | Pass, 7/7 | `api-rev-005-hierarchical-graphql-lifecycle.txt` |
| 6 | `pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` | `autobyteus-server-ts` | Pass, 4/4 | `api-rev-005-v2-production-upgrade-full.txt` |
| 7 | hashes, `git diff --check`, listener/process/root/tab audit | worktree | Pass | `api-rev-005-static-and-cleanup-audit.txt` |

The two earlier focused executions failed only because the new identity-transition tests retained a stale keyed Vue wrapper after the expected key change. The tests were corrected to refetch the keyed child wrapper; no product source changed. Historical logs are retained as authoring evidence (`api-rev-005-run-config-panel-focused.txt`, `...-rerun.txt`), while the final 35/35 log is authoritative.

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Change / Final Evidence | Residual Uncertainty |
| --- | ---: | ---: | --- | --- |
| Requirement and acceptance proof | 95% | 82% | Browser directly disproved the single-activation contract | Critical Team New-workspace continuation fails |
| Changed-boundary directness | 93% | 95% | Current renderer, API, package, disk, providers, lifecycle | None material beyond failure |
| Cross-boundary realism / mock gap | 88% | 96% | Real browser/package exposed mock-hidden issue | Public durable browser automation absent |
| Environment/config/identity fidelity | 91% | 91% | Exact private Team and requested provider identities | Owned local cwd required explicit creation |
| Failure/edge/lifecycle/recovery | 91% | 94% | Empty, inactive, failure, identity, restart, migration, terminate, cleanup | No multi-node remote server was used |
| User surface/browser/desktop shell | 88% | 82% | Actual `open_tab` and packaged shell used | Critical one-click journey fails |
| Durable regression quality | 95% | 83% | 35 coherent cases, but synchronous readiness mock masks the real defect | Needs a durable regression at the real scheduling boundary |

- Overall post-repository confidence: `92%` (rounded simple average).
- Overall final confidence: `89%` (rounded simple average).
- Confidence change: broader validation changed the result from apparently clean repository evidence to a directly observed product failure.
- Every critical acceptance criterion directly proven: `No`.
- Categories below 90%: requirement proof, user-surface confidence, durable regression quality.
- Default clean target met: `No`.

## Broader Validation Decision And Execution

- Decision: `Required`.
- Mode: actual current macOS Electron package for isolated backend/shell readiness; current Nuxt renderer for web-equivalent UI; AutoByteus `open_tab`; complete private nested Team; real Codex Luna and DeepSeek providers; disk/API/log correlation.
- Generic packaged command: `pnpm test:e2e:electron --adapter playwright --hold-ms 1800000` prepared current resources but failed when the generic builder selected unsupported Linux packaging on Darwin. This is a documented host-target mismatch, not a product result.
- Host package: `node build/dist/build.js --mac` passed and created current `electron-dist/mac-arm64/AutoByteus.app`.
- Initial isolated launcher: official `--skip-build --adapter playwright`, backend 58449, owned root `autobyteus-e2e-v3VrZH`; `/rest/health` passed.
- Secrets: documented dry-run and confirmed `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` into only the owned DB; 9 configured, no values logged.
- Private package: already auto-registered from configured local roots; explicit import correctly returned `Agent package already exists`; package query showed the exact source root and `nested-classroom-test` definition.
- Renderer: Nuxt 3.21.1 on 58524 proxying the packaged backend; actual AutoByteus `open_tab` tab `c8d4e0`.
- Provider retry: copied the terminated isolated state into an explicit owned retry root, restarted with `CODEX_APP_SERVER_COMMAND=/Users/normy/.local/bin/codex`, created only the owned registered local workspace directories, and reran the real provider lifecycle. This separated the environment prerequisite from the product failure.

| Journey Step | Expected | Actual | Result / Evidence |
| --- | --- | --- | --- |
| Root active New/empty | Disabled; exact Team workspace message; prior Temp canonical config retained | Exact behavior | Pass |
| Root New/non-empty then root auto-approve edit | Path retained; enabled | Exact behavior | Pass |
| Nested active New/empty | Root path retained; disabled; exact same message at nested scope | Exact behavior | Pass |
| Nested New/non-empty then runtime/model edit | Nested path retained; root stays Codex/Luna; nested shows AutoByteus/DeepSeek | Exact behavior | Pass; `api-rev-005-open-tab-root-nested-config.png` |
| First Run Team activation | Register both paths, then create/open one TeamRun | Registered both and canonicalized UI, but no TeamRun; config stayed open | **Fail**, API-E2E-F-002 |
| Second Run Team activation | Not required | Reused registrations and launched one TeamRun | Confirms continuation-only defect |
| Exact eventual V2 tree | Root/Teacher Codex Luna; nested Team/both Agents AutoByteus DeepSeek | Exact values persisted | Pass; `api-rev-005-launched-disk-v2.json` |
| Standalone Agent New path + same-draft toggle | One activation progresses; first message uses exact config | Real DeepSeek returned `AGENT_RUN_OK`; exact metadata persisted | Pass |
| Nested ordinary message | Exact reply from `/StudentStudyGroup` | Exact `INTEGRATED_SUBTEAM_MESSAGE_OK` persisted | Pass |
| Formal delegated task | Exact submission followed by accepted review | Task store status `accepted`, exact submit/review records | Pass |
| Termination/cleanup | Runs terminated; only owned resources removed | Complete | Pass |

## Desktop Application Validation

- Actual package: current macOS arm64 `AutoByteus.app`; packaged backend readiness and isolation were exercised.
- Browser-tested behavior: configuration, controlled state, readiness, launch, Agent chat, Team messaging, task delegation, approval, persistence, termination.
- Shell-specific evidence: official packaged launcher emitted readiness; updater-disabled E2E profile used; process tree stopped cleanly.
- User application impact: `None`. A separate user-owned Electron instance/profile was neither signaled nor modified.
- Native IPC/window behavior: unchanged and not a source boundary; no independent claim beyond package startup/isolation.

## Platform / Runtime Targets

- Host: macOS Darwin arm64, Europe/Berlin.
- Node: 22.23.1; pnpm 10.28.x.
- Nuxt 3.21.1 / Vue 3.5.28 / Vite 7.3.1; Electron 42.4.1.
- Browser: AutoByteus browser tool against current Nuxt renderer; desktop viewport screenshot evidence.
- Providers: `codex_app_server` / `gpt-5.6-luna`; `autobyteus` / `deepseek-v4-flash`.

## Lifecycle / Upgrade / Persisted Data

- Approved decision: migration required for released Team execution-tree V1; forward-only V2 readers afterward.
- Result: built-server production-upgrade 4/4 passed, including exact binding, distinct direct coordinators, nullable/non-null config, complete Agents, task/handoff, warning isolation, retry, and idempotence.
- Current new-run disk result: schema V2 stored exact root/nested Team defaults and complete Agent snapshots.
- Runtime compatibility fallback observed: `No`.
- Residual risk: none material for migration; the active failure is frontend launch continuation.

## Tests Implemented Or Updated

| Path | Change | Boundary | Result | Notes |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` | Updated | Standalone/root/nested controlled workspace lifecycle and same-draft configuration edits | Pass, 35/35 | One coherent existing suite; no implementation source changed |

## Tests Removed

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed: `Yes`.
- Updated path: `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts`.
- Added/removed paths: none.
- Current SHA-256: `cb2e7a6c04139d052575df4adcdf8de650f2b70d56cbbd023f665fc89e53c24a`.
- Attached for review: `Yes`.
- Routing note: because execution failed, request focused failure-origin review first; do not treat this as successful proportional-review closure.

## Other Execution Artifacts

| Artifact | Purpose |
| --- | --- |
| `api-rev-005-team-registration-continuation-failure.md` | Authoritative expected/observed failure package and source correlation |
| `api-rev-005-team-first-and-second-click-server-excerpt.txt` | Ordered first registration and later Team launch evidence |
| `api-rev-005-open-tab-root-nested-config.png` | Rendered distinct root/nested configuration before launch |
| `api-rev-005-launched-disk-v2.json` | Eventual exact V2 hierarchy after second click |
| `api-rev-005-agent-run-metadata.json` and `api-rev-005-agent-deepseek-raw-trace.jsonl` | Exact standalone Agent configuration and real provider result |
| `api-rev-005-open-tab-agent-deepseek-success.png` | Standalone real-provider browser evidence |
| `api-rev-005-retry-team-execution-tree-v2.json` | Successful real heterogeneous Team V2 tree |
| `api-rev-005-retry-team-communication-messages.json` | Exact ordinary message and reply |
| `api-rev-005-retry-task-delegation-records.json` | Exact accepted formal task lifecycle |
| `api-rev-005-open-tab-team-message-task-success.png` | Browser acceptance evidence |
| `api-rev-005-static-and-cleanup-audit.txt` | Hash, diff, listener/process/root/tab cleanup |

## Temporary Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| Isolated packaged Electron launcher and current Nuxt proxy | Real system and web-equivalent desktop behavior | Exposed API-E2E-F-002; provider paths otherwise passed | Stopped |
| Complete private local package | User-selected nested Team fixture | Already auto-registered; exact Team loaded | Source untouched |
| Isolated secret import | Real DeepSeek/provider execution | 9 configured in owned DB; no values logged | Owned roots removed |
| Explicit retry root and owned local workspace directories | Correct invalid local process cwd without touching user state | Codex/message/task lifecycle passed | Removed |
| AutoByteus `open_tab` | Required real browser interaction | Used for all semantic UI journeys | Zero tabs after cleanup |

## Dependencies Mocked Or Emulated

None in the broader journey. Repository component tests mock stores/transport and are explicitly not treated as real-boundary proof.

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | API-E2E-003, 004, 015, 016, 017 | Builds, durable suites, migration/lifecycle, standalone Agent, exact heterogeneous provider/message/task flows |
| **Fail** | API-E2E-014 / API-E2E-F-002 | Successful root+nested New-workspace registration does not create a TeamRun until a second click |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| Team runs and Agent run | API-REV-005 isolated data | UI termination | Pass |
| Browser tabs | API-REV-005 | `close_tab`; `list_tabs` | 0 sessions |
| Nuxt 58524 | API-REV-005 | stopped owned exec session | Port free |
| Packaged backend 58449 / Electron trees | API-REV-005 | stopped owned launch sessions | Port free; no matching process |
| Owned roots `autobyteus-e2e-v3VrZH`, `autobyteus-api-rev-005-retry-1787599` | API-REV-005 | removed only after no listeners/open files/processes | Absent |
| User-owned app/profile and source `.env` | Not owned | untouched | Unchanged |

## Preliminary Classification

- `API-E2E-F-002`: `Local Fix`, preliminarily implementation-owned frontend sequencing/reactivity in `RunConfigPanel.handleRun` after successful Team workspace registration.
- Expected: one accepted activation registers the active New scopes and continues to one TeamRun.
- Observed: registrations succeed and canonical state appears, but immediate readiness causes return; a second activation launches.
- Final failure origin and owner must be confirmed by `/code_reviewer`.

## Recommended Recipient

`/code_reviewer` for focused failure-origin review. Do not route to delivery.

## Latest Authoritative Result

- Result: `Fail`.
- Final validation confidence: `89%`.
- Default 95% target met: `No`.
- Categories below 90%: requirement proof, user-surface confidence, durable regression quality.
- Broader validation: `Required` and completed.
- Critical criterion lacking successful proof: current-base FR-003 / FR-005 / AC-001 single-activation New-workspace Team launch.
- Required next recipient: `/code_reviewer` focused failure-origin review.
