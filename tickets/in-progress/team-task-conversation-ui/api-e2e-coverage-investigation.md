# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/task-timeline-ui-prototype.html`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `/code_reviewer` pass `CRR-002`, followed by the user's explicit authorization to use a disposable import of `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test` and import API keys from `/Users/normy/.autobyteus/server-data/.env` into the test-owned database for real validation.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: this file. It was initialized before API/E2E-owned durable coverage edits, repository final execution, secret import, service launch, or browser launch.

## Current Requirement And Design Basis

The approved change is a frontend-only, Tasks-only presentation replacement over the existing strict `TaskDelegationRecordDto`. For the exact focused participant, each task must retain its description-first root and root references while displaying the authoritative ordered submission, review, resubmission, acceptance, and interruption lifecycle beneath it on the left. Selecting one item changes only the right detail; selecting an owner-scoped reference opens the unchanged real task-reference viewer/route and selecting the owner returns to its content. Full-record live replacement and restored history must project identically, preserve task/update order, retain stable selection, and avoid duplicates. Human participants, result ordinals, review linkage, lifecycle status, keyboard semantics, and English/Simplified Chinese labels must be readable. `Technical details`, internal IDs, routing metadata, and raw JSON must be absent. Messages production source and ordinary message behavior must remain unchanged.

The approved persisted-data decision is `Not Affected`: current task records are directly usable without migration or compatibility fallback. The implementation handoff confirms no backend, GraphQL, route, shared contract, persistence, or Messages production source changed. Code review `CRR-002` passes at 95.0/100 and leaves realistic live/restored UI, reference-route, and browser interaction evidence to this stage.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001`, `REQ-002`–`REQ-004`, `AC-001`–`AC-003` | Changed | Requirements/design DS-001/DS-004; implementation trace | Prove exact focus filtering, preserved source order/root interaction, human status/participants, and stable live replacement. |
| `BEH-002`, `REQ-005`–`REQ-007`, `AC-004`–`AC-006` | Changed | UI/UX exact click/result contract; DS-002/DS-005 | Prove persistent left timeline, exact item selection, detail-only right pane, labels/ordinals, and acceptance fallback. |
| `BEH-003`, `REQ-006`–`REQ-010`, `AC-005`–`AC-008` | Changed | Current DTO and DS-004/DS-006 | Exercise a complete revision cycle and interruption through deterministic repository coverage and a real nested-Team lifecycle. |
| `BEH-004`, `REQ-009`/`REQ-011`, `AC-007`/`AC-009` | Changed | Existing route/viewer preserved; owner-aware selection added | Prove root/submission/review reference ownership, exact content URL, raw/preview/maximize, reselection refresh, and owner return. |
| `BEH-005`, `REQ-012`, `AC-010` | Removed | Requirements and clean-cut removal plan | Assert no visible disclosure, technical labels, raw routing JSON, or IDs and no obsolete test protection. |
| `BEH-006`, `REQ-001`/`REQ-013`, `AC-011`/`AC-012` | Preserved | Explicit user-approved no-change boundary | Confirm no Messages production diff; execute ordinary Messages count/selection separately and prove messages never become task rows. |
| `REQ-014`/`REQ-015`, `AC-013`–`AC-015` | Changed/preserved | UI/UX accessibility/localization contract | Browser-check native keyboard activation, `aria-pressed`/complete names, text-bearing status, empty/terminal states, and both locales. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No production change | Existing task state machine supplies the record | Lifecycle integration and mixed-runtime E2E | External-provider timing only; semantics unchanged | Reuse real nested-Team lifecycle as upstream truth. |
| API / transport / contract | No production change, but materially consumed | Existing snapshot/event DTOs and task-reference REST route | State tests, GraphQL projection tests, route/service tests | Real browser hydration/event/route composition | Live API + browser. |
| Frontend component / state | Yes | Task projector, exact selection, navigator/detail renderers | Seven focused files / 31 tests from implementation; state tests | Real DOM, focus, CSS visibility, actual localization/runtime fetch | Durable browser probe + live browser. |
| Browser integration / user journey | Yes | Complete task timeline/detail/reference journey | No repository-resident task-lifecycle browser probe | Browser rendering, keyboard, viewer, locale, resize, live/restored integration | Browser required. |
| Authentication / session / permissions | No product change | Local external-server mode has no new identity boundary | Existing server/test harness | Provider credentials required only to produce real lifecycle | Import authorized source into disposable test vault only. |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer used by Electron | Nuxt component/build evidence | Real desktop-equivalent browser behavior | Browser preferred. |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package change | Existing shell separation and web architecture | None material | No actual Electron launch. |
| Process / lifecycle | Yes as validation input | Live event, termination/interruption, history reopen | Server lifecycle integration; current state reducer | Real provider nested Team, termination, and reopen/hydration | Owned built server/frontend lifecycle. |
| Persisted-data transition | No schema change | Direct use of current V1 task records | Strict validator, current fixture, GraphQL projector | Real reopened historical rendering | Terminate/reopen the owned live run; no migration. |
| Worker / queue / distributed coordination | Yes as existing upstream behavior | Nested Team task execution across multiple AgentRuns | Mixed task delegation E2E | Real provider behavior and event timing | Authorized nested classroom simulation. |
| External integration | Yes for broader evidence only | AutoByteus provider/API keys produce real task events | Live harness and provider preflight exist | External availability/model nondeterminism | Bounded deterministic prompt, explicit evidence, truthful failure classification. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design`
- Project type and runtime stack: pnpm 10 monorepo; Node 22; TypeScript server with Fastify/GraphQL/WebSocket/SQLite/Prisma/Vitest; Nuxt 3/Vue 3/Pinia frontend embedded in Electron; Playwright Core browser probes.
- Conflicting, missing, or unclear project instructions: The optional `pnpm exec nuxi typecheck` launcher has the upstream-recorded `vue-tsc`/TypeScript incompatibility. It is not treated as API/E2E proof. Port 3000 is already owned by another process and will not be reused or stopped; test-owned ports will be dynamically reserved.
- Required environment variables or secrets available: `Yes`, by explicit user authorization. Values will never be logged or copied into artifacts. Import targets only the disposable test database/vault.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/AGENTS.md` | Closest web instructions | Use `pnpm test:nuxt ... --run`; browser-preferred renderer validation; do not use watch mode; never `git add .`/`-A`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-server-ts/AGENTS.md` | Closest server instructions | Use `vitest run ... --no-watch` for focused server/integration/API coverage. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/README.md` | Web dev/browser authority | External web mode uses a separately running backend; Playwright Core probes are project-supported; browser executable may be explicit. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/README.md` | Full-stack and secret-import authority | Built backend plus Nuxt are canonical; import uses `pnpm secrets:import -- --source <absolute> --database-url <explicit disposable file URL>`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/package.json` | Root scripts | `pnpm test:e2e`, built test harness, development launcher, secret importer. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-web/package.json` | Web scripts | Nuxt tests/build/guards and existing self-starting browser-probe pattern. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/test-support/live-e2e/test-runtime-bootstrap.mjs` | Safe runtime boundary | Sanitizes environment, constrains runtime/SQLite paths, reserves loopback ports, starts/stops the built server, and supports explicit extra environment. |
| `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test` | User-authorized realistic fixture source | Nested `/StudentStudyGroup`; Teacher owns delegate/review, student coordinator owns submit. Use a disposable copied package so the source is not mutated. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repository dependencies | worktree root | Already installed; use lockfile state | Do not alter lockfile unless coverage requires a dependency (not expected) | `node_modules` present | None |
| Deterministic browser probe | `autobyteus-web` | Planned `pnpm test:e2e:team-task-conversation -- --output-dir ...` | Self-starting Nuxt on a free loopback port; Chrome 151 found | HTTP fixture route plus in-page control | Probe owns process/page install/removal |
| Built disposable backend | worktree root | Temporary harness using `startBuiltTestServer` | Runtime below `autobyteus-server-ts/tests/.tmp`; DB below `autobyteus-server-ts/db`; private package root passed explicitly | `/rest/health`, server readiness marker, exact DB/open-file audit | Harness `stop()` then remove only owned runtime/DB/vault |
| Disposable secret vault | worktree root | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url <owned file URL>` | No values in logs; exact disposable DB only | Value-free importer summary/provider capability | Delete owned DB, key, WAL/SHM/journal |
| Nuxt live frontend | `autobyteus-web` | `BACKEND_NODE_BASE_URL=<owned backend> pnpm dev --host 127.0.0.1 --port <free>` | Avoid occupied 3000 and any existing desktop app | Fixture-independent `/workspace` HTTP readiness | Signal owned process group only |
| Google Chrome | browser process | Playwright Core with `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | Version `151.0.7922.138`; desktop-equivalent viewport | Playwright launch/navigation | Close owned context/browser |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Complete revision lifecycle with root/submission/review references | Disposable copy of user-authorized nested-classroom package with deterministic task instructions; real GraphQL/WebSocket/tool flow | Copy, do not modify private source. Workspace/reference files stay under ticket evidence. | Retain value-free evidence and task files; delete copied package if marked temporary after run. |
| Interruption | Second live nested-Team task deliberately left active, then terminate the owned RootTeamRun via supported GraphQL | No unrelated run is touched. | Historical task record retained in evidence until validation completes; runtime then removed. |
| Restored/historical parity | Reopen the just-terminated owned TeamRun through public history/hydration in a fresh browser session | Current schema only; no file mutation or migration. | Remove owned runtime after evidence capture. |
| Focus perspectives | Teacher, nested Team coordinator/member, and unrelated perspective from current execution tree | Use exact current AgentRun identities, do not expose them in user assertions. | Run deleted with owned runtime. |
| Ordinary message baseline | One real ordinary nested-team communication plus deterministic browser probe message | Message remains outside task rows. | Run deleted with owned runtime. |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` → `Persisted Data / State Transition Decision`; `implementation-handoff.md` → `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: The owned live TeamRun's current V1 `task_delegation_records.json` after accept/interruption must be read through public history/hydration unchanged and render the same ordered rows/owned references.
- Evidence planned: public GraphQL/history read, fresh browser reopen, exact lifecycle/reference assertions, and absence of migration/version branches.
- Migration-specific completion/recovery scenarios: `N/A`
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/__tests__/teamDelegatedTaskEntries.spec.ts` | Order/filtering, full lifecycle/status/ordinals/team attribution | REQ-002–REQ-010; AC-001–AC-008 | Still Valid | Current reviewed tests assert approved projector semantics | Rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamDelegatedTaskNavigator.spec.ts` | Left-only root/update/reference rendering, locators, accessible names, no technical metadata | REQ-003–REQ-012; AC-001, AC-005–AC-010, AC-013 | Still Valid | Assertions match approved pane/identity contract | Rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamDelegatedTasksSection.spec.ts` | Initial/updated selection, owner reference return/reselect, live replacement, split/empty state | REQ-004–REQ-014; AC-003–AC-014 | Still Valid | Direct section/state coverage; viewer is stubbed | Rerun; browser closes viewer/mock gap. |
| `autobyteus-web/components/workspace/team/__tests__/TeamDelegatedTaskItemDetail.spec.ts` | Assignment/acceptance/interruption detail semantics | REQ-005–REQ-009/REQ-014; AC-004–AC-007/AC-014 | Still Valid | Current copy/fallback assertions align | Rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Messages-first empty, Tasks auto-open, section ownership, focus change | REQ-001/REQ-013; AC-011/AC-012 | Still Valid | Approved surrounding behavior | Rerun with broader Team tests. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Task selection cannot mutate exact send target | REQ-002/REQ-013; AC-012 | Still Valid | Current workflow boundary | Rerun. |
| `autobyteus-web/localization/messages/__tests__/teamTaskLifecycleCatalog.spec.ts` | Aligned EN/zh-CN keys and obsolete-key absence | REQ-012/REQ-015; AC-010/AC-015 | Still Valid | `IR-002`/`CRR-002` resolved stale fallback | Rerun plus guards. |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionViewState.spec.ts` and `services/agentStreaming` snapshot coverage | Snapshot/full-record replacement and sequence behavior | REQ-004/REQ-006; AC-003/AC-008 | Still Valid | Real state owner, but presentation not mounted | Run relevant state/stream selection. |
| `autobyteus-web/services/runHydration/**` task DTO projection tests | GraphQL restored records map to strict DTO | AC-008; persisted decision | Still Valid | Restored boundary below UI | Locate/run focused tests. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Deterministic delegate→submit→revise→resubmit→accept with durable ordered updates | REQ-006–REQ-010; AC-005–AC-008 | Still Valid | Direct real domain/service lifecycle | Rerun. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Real provider Agent/Team targets and revision event surface | Upstream lifecycle realism | Still Valid | Capability-gated and unchanged backend | Do not change; real nested-classroom run provides current task-specific evidence. |
| `autobyteus-server-ts/tests/unit/api/task-delegation-route.test.ts` and `tests/unit/agent-team-execution/task-delegation-reference-content-service.test.ts` | Active/persisted reference lookup and REST error mapping | REQ-009/REQ-011; AC-007/AC-009 | Still Valid | Direct route/service proof | Rerun. |
| Existing web probes under `autobyteus-web/tests/e2e` | Other renderer journeys | No direct task-lifecycle requirement | Out Of Scope | No task lifecycle fixture/probe exists | Do not run as task proof. |
| Implementation-only temporary rendered page (removed) | Visual inspection of current components with records | UI/UX contract | Replace | Strong one-time evidence but not reproducible durable coverage | Add task-specific self-starting durable browser probe. |

## Stale Or Obsolete Coverage Decisions

No additional stale durable coverage is identified. `IR-002`/`CRR-002` already removed the obsolete assignment-description mock/catalog entries; the negative catalog assertion remains valid clean-cut coverage and must not be removed.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-TASK-BROWSER-001` | Restored snapshot plus live full-record replacement in actual state/components; exact lifecycle selection, reference viewer request/return, focus filtering, Messages separation, EN/zh-CN, keyboard/accessibility, Technical-details absence, resize/terminal/empty states | BEH-001–BEH-006; REQ-001–REQ-015; AC-001–AC-015; DS-001–DS-006 | `autobyteus-web/tests/e2e/team-task-conversation-probe.mjs`; `autobyteus-web/tests/e2e/fixtures/team-task-conversation.page.vue`; discoverable package script | Current durable coverage stops at Happy DOM/stubbed viewer and does not preserve browser-level regression proof for the changed user surface. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-TASK-BROWSER-001` | `autobyteus-web/package.json` scripts | Add one task-specific probe entry | Project's existing browser-probe convention | No dependency addition or production source change. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --dir autobyteus-web test:nuxt <7 focused files> --run` | worktree root; Nuxt Vitest | Current changed projector/components/locales | Pass — 7 files / 31 tests | `tickets/in-progress/team-task-conversation-ui/api-e2e-evidence/api-rev-001/repository/focused-web-tests.log` |
| 2 | `pnpm --dir autobyteus-web test:nuxt components/workspace/team services/teamExecution/__tests__ services/runHydration/__tests__ services/agentStreaming/__tests__/TeamStreamingService.spec.ts --run` | worktree root; Nuxt Vitest | Broader Team/state/hydration/stream regression | Pass — 18 files / 95 tests | `.../repository/broader-web-tests.log` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run <lifecycle + route + reference service> --no-watch` | worktree root; documented server runner | Real lifecycle and reference API/service | Pass after the required server build regenerated Prisma — 3 files / 11 tests. The first two attempts collected zero tests because the pre-existing generated Prisma client exposed a Vitest ESM/CJS mismatch; `pnpm --dir autobyteus-server-ts build` regenerated the client, after which the unchanged documented command passed. | `.../repository/server-lifecycle-reference-tests.log`; `.../repository/server-lifecycle-reference-tests-workaround.log`; `.../repository/server-lifecycle-reference-tests-after-build.log`; `.../repository/server-build.log` |
| 4 | `pnpm --dir autobyteus-web guard:web-boundary && pnpm --dir autobyteus-web guard:localization-boundary && pnpm --dir autobyteus-web audit:localization-literals` | worktree root | Boundary and visible-copy regressions | Pass | `.../repository/web-guards.log` |
| 5 | `pnpm --dir autobyteus-web build` | worktree root; production Nuxt static build | Production bundling | Pass — 3,682 modules transformed / 15 routes prerendered | `.../repository/web-production-build.log` |
| 6 | `pnpm --dir autobyteus-web test:e2e:team-task-conversation -- --output-dir <ticket evidence>` | worktree root; Chrome 151; self-starting Nuxt | Durable browser journey | Pass — 6/6 scenarios; browser/Nuxt/fixture cleanup passed | `.../browser/durable-probe/result.json`; `.../browser/durable-probe/command.log`; screenshots and Nuxt log in the same directory |

Durable coverage now added exactly as planned: `autobyteus-web/tests/e2e/team-task-conversation-probe.mjs`, `autobyteus-web/tests/e2e/fixtures/team-task-conversation.page.vue`, and the discoverable `autobyteus-web/package.json` script. No durable coverage was removed. The probe directly mounted the production overview/task/reference components and current stores. It passed Messages-first/empty state, restored snapshot/focus filtering, keyboard selection/live full-record replacement/stable selection, exact owner-scoped reference routing/viewer/reselection/return, three focus perspectives/Messages no-change, English/Simplified-Chinese labels, accessibility names/status, Technical-details/internal-ID absence, right-pane non-duplication, and 248/168/360 split bounds.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | All ACs have focused unit/component proof and the six-scenario browser probe exercises every user-visible requirement. | The lifecycle records are deterministic fixtures rather than provider-created records. | Real nested-classroom lifecycle. |
| Changed-boundary execution directness | 95% | Actual production Vue components, Pinia state, reference viewer, localization runtime, browser DOM, and production build executed. | Live public stream/history composition remains. | Live API/browser execution. |
| Cross-boundary integration realism and mock gap | 82% | State/hydration/stream suites and real server domain/route tests pass, but the browser reference REST response and task events remain intercepted/injected in the durable probe. | Real GraphQL/WebSocket/REST composition and provider timing. | Owned built server + real browser + nested Team. |
| Environment, configuration, identity, and fixture fidelity | 82% | Chrome and production Nuxt run, server build/tests use current SQLite/Prisma state; deterministic nested-Team-shaped identities are represented. | Authorized secret import, actual Team catalog, provider, and execution-tree identities have not run. | Disposable live environment. |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Full revision/acceptance, interruption terminal, empty state, reference reselection, sequence handling, and lifecycle integration tests pass. | Process termination followed by public historical reopen remains unproven. | Live termination/reopen. |
| User-surface, browser, and desktop-shell confidence | 95% | Chrome proves web-equivalent renderer interactions, layout, a11y, localization, and screenshots; no shell boundary changed. | Live workspace navigation is not yet exercised. | Live workspace browser journey. |
| Durable regression coverage quality and relevance | 95% | No-secret self-starting probe is discoverable, asserts semantic behavior, emits structured evidence, and cleans its temporary page/process. | Proportional code-review of the new coverage is still required after API/E2E completion. | `/code_reviewer` test-code review. |

- Overall post-repository confidence: `90.6%` (634 / 7, rounded to one decimal)
- Calculation method: simple average of the seven applicable category scores.
- Every critical acceptance criterion directly proven: `Not yet — UI semantics are proven, but the explicitly required real live/restored cross-boundary lifecycle remains outstanding.`
- Any applicable category below `90%`: `Yes — cross-boundary integration realism and environment/fixture fidelity are both 82%.`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: provider-created task records may differ at stream/hydration boundaries; real reference routing may miscompose owner IDs; live termination/historical reopen and actual nested execution-tree focus remain unproven. Electron shell execution remains intentionally excluded because no shell source changed.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser + Live API + Lifecycle`
- Specific confidence gap or residual risk addressed: repository component tests mock the reference viewer and do not prove real provider task events, task-Team attribution, real stream timing, actual route content, termination/interruption, or public history hydration.
- Why the selected mode can materially improve confidence: the authorized nested classroom creates the actual backend records/events through `delegate_task`, `submit_task_result`, and `review_task_result`, while a real browser exercises the unchanged public GraphQL/WebSocket/REST boundaries and production renderer.
- Expected confidence after the selected validation: `>=95% overall`, with every category `>=90%`, if all critical journeys pass.
- Browser-specific decision and rationale: Required for the changed desktop/web renderer, selection/focus behavior, localization, accessibility semantics, and reference viewer.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A` at investigation time; authorized source paths and local browser are available.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/README.md`, `autobyteus-web/ARCHITECTURE.md`, `autobyteus-web/AGENTS.md`.
- Web-equivalent behavior: All changed task projection, DOM, selection, localization, REST/GraphQL/WebSocket use.
- Shell-specific or lifecycle behavior: None changed; no preload, IPC, window, packaging, or embedded-server seam is in the source diff.
- Chosen validation approach and why it fits the project: Chrome against Nuxt external-server mode, per project/skill browser preference.
- Server/frontend setup when browser validation is used: owned built server plus owned Nuxt port for live journey; self-starting Nuxt for deterministic probe.
- Effect on any already-running desktop application: `None`; operational data/ports/processes are not reused.
- Behavior not directly proven and confidence consequence: Electron-only packaging/window integration is not tested and has no material changed-scope consequence.

## Live Environment And Fixture Plan

- Startup order and commands: build server if needed; create owned runtime/DB; dry-run then import authorized secrets into exact owned DB; copy the nested-classroom package into ticket evidence and refine only the copy for a deterministic revise/resubmit/reference/interruption script; start built server with copied package root; start Nuxt on a free port; create run through GraphQL; open workspace browser; execute bounded turns through the real Team WebSocket; terminate/reopen; clean up.
- Environment choices that materially affect the run: loopback-only ports; owned `tests/.tmp` runtime; owned SQLite DB; `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` points to the disposable copy; `gpt-5.6-luna` unless public model discovery requires another configured current model; auto-execute tools enabled for the deterministic agents.
- Health / readiness checks: DB/path preflight, value-free importer result, built server readiness and `/rest/health`, GraphQL team catalog/model visibility, Nuxt HTTP readiness, WebSocket `CONNECTED` + snapshot.
- Seed data / fixtures: nested classroom copy, bounded shared workspace, assignment/result/review files, one ordinary message, one full revision task, one active task terminated for interruption.
- Test identities, authentication, permissions, or session state: local no-auth web session; provider secret imported only to the disposable vault; exact AgentRun identities discovered from public resume config.
- Requirement-linked journeys or scenarios: `API-TASK-LIVE-001` complete revise/resubmit/accept with real root/update refs; `API-TASK-INTERRUPT-002` terminal interruption; `API-TASK-RESTORE-003` fresh history hydration; `API-TASK-FOCUS-004` exact perspectives; `API-TASK-I18N-A11Y-005`; `API-TASK-MESSAGES-006`; `API-TASK-NO-TECH-007`.
- DOM, screenshot, log, API, process, or other evidence to capture: JSON assertions, screenshots, network URLs/statuses, WebSocket task-event summaries without secret values, GraphQL records, process readiness/cleanup, repository logs.
- Owned processes and temporary state to clean up: built server, Nuxt, Chrome, disposable runtime/DB/vault, disposable copied package if not retained as explanatory evidence, browser storage/context.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `API-TASK-LIVE-001`–`007` | Ticket-local live harness/scripts and copied private nested-classroom fixture | Real external-provider, server, WebSocket, GraphQL, REST, browser, terminate/reopen evidence | Credentials, external model timing, and private package access are unsuitable as default repository CI. The deterministic no-secret browser journey is the durable regression layer. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Electron shell-only launch/packaging | No shell source changed and browser can exercise all material renderer boundaries | Negligible | None unless browser exposes a shell-specific mismatch. |
| Very long unbounded revision history | Approved behavior relies on existing scrolling; no volume threshold in scope | Low bounded usability risk | Delivery/product may add a future volume-specific scenario if real data warrants it. |

## Ambiguities Or Reroute Triggers

None at investigation time. A failure will be classified from actual evidence before rerouting.

## Broader Validation Completion Update

- Execution status: `Completed — Pass`.
- Authoritative live result: `tickets/in-progress/team-task-conversation-ui/api-e2e-evidence/api-rev-001/live/combined-result.json`.
- Real runtime: built server on owned loopback port `60321`, Nuxt on owned loopback port `31321`, Chrome `151.0.7922.138`, a disposable copy of the authorized nested-classroom Team, disposable SQLite/secret vault, runtime `autobyteus`, and model `gpt-5.6-luna` with automatic tool execution.
- Real lifecycle evidence: the owned Team produced `active → awaiting_review → active → awaiting_review → accepted` and the exact ordered durable updates `submission → request_revision → submission → accept`, including real root/submission/review references. A second live task was observed active and then reached authoritative `interrupted` with a final interruption update through supported Team-run termination.
- Cross-boundary evidence: the browser observed the live task UI; exact task-reference content routes returned `200` for root, result, and review owners; Raw/Preview icon controls, maximize/Escape, reselection refresh, and owner return worked. A fresh browser context restored two tasks and five lifecycle rows from public history after the run became inactive.
- Preservation and UI evidence: the requested ordinary Team message matched API/UI count at the assertion boundary and stayed separate from task rows; restored Teacher focus showed two tasks while an unrelated nested student showed none; English and Simplified Chinese lifecycle labels rendered through the real Settings language control; `Technical details` and right-pane lifecycle navigation remained absent.
- Harness correction: the main live script's last restore step used the filesystem basename `temp_workspace` instead of the visible UI label `Temp Workspace`. The five preceding scenarios passed, the error was classified as a temporary locator defect, and a targeted fresh-context rerun with the visible label passed the full restore/focus/localization/no-technical journey. `combined-result.json` is the authoritative merged result; `result.json` is retained only as the honest pre-correction record.
- Operational cleanup: both owned ports closed, all owned processes stopped, the disposable secret-bearing DB/key/runtime were deleted, the operational private Team source hash was unchanged, and the temporary deterministic probe page was absent. Evidence: `.../live/environment/post-cleanup-audit.log`.
- Final confidence: `96.9%` overall; every applicable category is at least `96%`. The only bounded residuals are external-model timing nondeterminism and lack of a captured live task-Team-coordinator focus screenshot; deterministic durable browser coverage directly exercises that perspective and live Teacher/unrelated-member filtering confirms the production identity boundary.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — add the task-specific browser probe/fixture and package script; remove none.`
- Post-repository confidence: `90.6%`
- Broader validation decision: `Required — completed successfully through authorized real nested-classroom browser/API/lifecycle execution`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The private source package and the user's operational server data remained untouched. All real execution targeted an auditable disposable copy/runtime/database and owned loopback processes; secret-bearing state was deleted after evidence capture.
