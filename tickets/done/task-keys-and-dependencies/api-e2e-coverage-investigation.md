# API/E2E Coverage Investigation — task-keys-and-dependencies

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md` (SR-001–SR-003)
- Design Spec: `…/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md` + VIS-001–015
- Design Review Report: `…/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-003)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-002 Pass, 9.4/10)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `…/api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- Current Investigation Round: 2 (integrated state `c95e0138e8`; rerun-by-impact plan in the ledger and the execution report)
- Trigger: CRR-002 Pass handoff from `/software_engineering_team/code_reviewer`, 2026-10-17
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the changed durable test code)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

Every Project Task has an immutable key `<prefix>-<number>` (per-Project numbers in creation order, never reused; prefix fixed at first keying, unique among current and retired prefixes). Released data is keyed by the startup migration `20261017_project_task_keys_v1` (no lockout; second start no-op). Tasks store `dependsOnTaskIds` (same Project; self / unknown / other-Project / loop rejected with `TASK_DEPENDENCY_INVALID`, nothing written; duplicates collapsed; omitted keeps, `[]` clears; delete drops the Task from dependents). GraphQL, `/ws/projects` and `taskWorkerTasks` carry the new fields. For agents the key is the Task ID: tool results show it, `task_id` / `depends_on` accept key (any letter case) or long ID, agent-facing texts name keys or "a deleted Task". Dependencies never block work. The web shows key lines, badges, key chip with copy, Dependencies card, the "Depends on" picker, the tree summary with key, and key URLs (long-ID URLs replaced).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 to SCN-013.
- Real-use scenarios added from the implemented behavior:
  - SCN-A1 (upgrade from the installed release): a user of the released 1.5.5-beta.1 desktop app (whose Projects code equals the base `c600028072`, `git diff v1.5.5-beta.1 c600028072 -- autobyteus-server-ts/src/projects` is empty) creates Projects/Tasks, then starts the new build on the same data. Trigger: real first start of the worktree desktop build on data the released build wrote.
  - SCN-A2 (deleted Task while its copy works): the user deletes a Task an agent copy is still working on; the Manager then tries to give that copy another Task → refusal names "a deleted Task" (AC-023 alternate). Trigger: UI/GraphQL delete, then `delegate_task target_agent_run_id`.
  - SCN-A3 (external agent write while the board is open): an agent's `update_task depends_on` / status change, made while the user's board is open, updates badges live (AC-011, AC-012 "disappears live").
- Designer scenarios recorded as Unsupported/Contrived: none; CAND-003/004 (code review) rejected as artificial timing / outside operating assumptions — not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 key allocation | Added | REQ-001, AC-001/002 | Unit + GraphQL E2E (API-010) + tool E2E + browser + desktop |
| BEH-002 backfill migration | Added | REQ-004, AC-006 | Unit + startup E2E + desktop upgrade on release-written data |
| BEH-003 prefix reservation (+ retired) | Added | REQ-002/003, AC-003/004/025 | Unit + new tool E2E (AC-025) |
| BEH-004 dependsOn storage/validation | Added | REQ-006/007/020, AC-008–010/024 | Unit + GraphQL E2E + new tool E2E + browser |
| BEH-005/006 board/Task page UI | Added | REQ-009/010/013/015 | Web unit + new browser case + desktop |
| BEH-007 tree summary key | Changed | REQ-012, AC-016 | Web unit + updated PMU browser case + desktop (if a delegated copy can be produced) |
| BEH-008 delete drops dependents | Added | REQ-014, AC-018 | Unit + API-010 + browser |
| BEH-009 feed fields | Changed | REQ-008, AC-011 | Unit + gated feed suite + browser live update |
| BEH-010 agent-facing key, references, depends_on, texts | Changed | REQ-017–021, AC-020/022/023/024/027 | Unit + updated gated suites + new tool E2E + new scripted-runtime case |
| BEH-011 key URLs | Added | REQ-022, AC-026 | Web unit + updated browser probes + desktop |
| Preserved: board search, lanes, Temp tasks, delete flow, context files | Preserved | Preserved Behavior Boundary | Existing probes PT-E2E-001..016, PMU cases rerun |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | key/prefix rules, dependency rules, allocation lock, retired prefixes | Server unit (6 new files, many updated) | — | — |
| API / transport / contract | Yes | GraphQL fields/inputs, strict feed, tool MCP contract (`taskId`=key, `depends_on`, `dependsOn`) | `projects-graphql` API-010, gated suites (keys in results) | `depends_on`, case-insensitive refs, retired-prefix not-found, Temp-task rules not exercised through real MCP HTTP | Server E2E (MCP HTTP) — durable |
| Frontend component / state | Yes | 5 new components, store/draft/page composable | Web unit specs | Real rendering against a real backend | Browser probe |
| Browser integration / user journey | Yes | board ↔ Task page ↔ editor ↔ URLs, live feed | Implementation's manual browser check only | No durable browser journey; 3 existing probes still assert long-ID URLs / old tree tooltip | Browser probe (durable) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | same renderer in packaged app | none | packaged bundle + embedded server combination | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No (no shell source changed) | — | — | Embedded-server startup runs the new migration (lifecycle) | Isolated desktop instance |
| Process / lifecycle | Yes | startup migration on real start; restart no-op | `projects-startup-migration` e2e (synthesized data) | Data written by a real released build; packaged app startup | Isolated desktop instance (released app writes data, worktree build upgrades) |
| Persisted-data transition | Yes | `taskKey`, `taskKeys` migration; `dependsOnTaskIds` direct use; retired-prefix file | Migration unit + startup e2e | Release-written files | Desktop upgrade |
| Worker / queue / distributed coordination | Yes (agent runs) | delegate_task resolution, existing-copy assignment texts | Gated scripted-AGY suites (updated) | delegate by mixed-case key, target_* + key, blocked Task, deleted current Task text | Gated scripted-AGY E2E (durable) |
| External integration | No | Real providers not involved in changed behavior | — | Tool description wording vs. real model behavior | Not run (real-provider; see Not Tested) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies` (branch `codex/task-keys-and-dependencies`, base `c600028072`, uncommitted)
- Project type: pnpm monorepo; Fastify/GraphQL TS server, Nuxt 3 web, Electron desktop
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/TESTING.md` (same content as the superrepo root `TESTING.md`); no closer `TESTING*.md`
- Conflicting / missing instructions:
  - `docs/isolated-app-instances.md` names the `autobyteus-mcps` browser-automation CLI `scripts/browser`; it is not present on this machine (`/Users/normy/autobyteus_org/autobyteus_mcps/browser-automation` has only `src`/`tests`). Used instead: `playwright-core` `chromium.connectOverCDP(controlEndpoint)`, as the repository's own desktop adapter does (`autobyteus-web/tests/e2e/fixtures/settings-refresh-desktop.mjs`). Same control endpoint, attach-only.
  - `dist/` was older than three changed source files (`project-task-tool-contract.ts`, `task-dependency-writes.ts`, `task-references.ts`); rebuilt before every dist-based run (TESTING: never use an older build).
- Required secrets: `N/A` (no real-provider run planned)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing guideline | Layers and commands; clean env for E2E; scripted AGY (`ANTIGRAVITY_CLI_COMMAND`, `RUN_AGY_FAILURE_E2E=1`); migrations on synthesized or release-written test data only; never real data; isolated instance rules 1–9 |
| `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md` | Desktop instance lifecycle | `pnpm --silent isolated-app start --app/--from-worktree --data-root <owned>`; keep instanceId/controlPort; stop own instance only |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | Repo rules | Design/testing/release docs |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` header | Projects browser probe | `--output-dir` fresh, `--ledger-file`, `--skip-server-build`; owns 2 nodes + Nuxt + Chrome |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` header | PM UX browser probe | `--cases`, scripted AGY `AGY_FAKE_CASE=linked_skills` |
| `autobyteus-server-ts/tests/e2e/projects/*.e2e.test.ts` headers | Server E2E / gated suites | Gate `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND`; clean env |
| `autobyteus-web/electron/server/services/AppDataService.ts` | Desktop data root | `<dataRoot>/server-data/.env` generated on first run only, then kept |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts prebuild && build` | serialized | exit 0 | — |
| Server E2E | worktree | `env -i PATH HOME=<tmp> TMPDIR … pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch` | test-owned temp roots | vitest result | suites remove their roots |
| Browser probes | worktree | `pnpm -C autobyteus-web test:e2e:projects --output-dir=<fresh>` etc. | own ports/Nuxt/Chrome | probe readiness | probe cleanup receipt |
| Released desktop app | — | `pnpm --silent isolated-app start --app /Applications/AutoByteus.app --data-root <owned>` (1.5.5-beta.1, isolated-launch marker present) | separate ports/process group; never the user's running app | `start` JSON | `isolated-app stop <id>` (root kept: own `--data-root`) |
| Worktree desktop build | worktree | `pnpm -C autobyteus-web build:electron:mac`, then `isolated-app start --from-worktree --data-root <same owned root>` | build serialized with other builds | `start` JSON, `/rest/health` | `isolated-app stop <id>`; remove owned root after evidence |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Released-shape Projects/Tasks for the upgrade | Created by the installed released app through its public GraphQL on an owned data root | Never `~/.autobyteus` or OS app-data; root under `/tmp`-style owned dir | Copy of pre-upgrade files kept as evidence (small JSON); root removed after |
| Server E2E data | Suites create their own temp roots via public APIs | clean env | suite cleanup |
| Browser probe data | Probe-owned nodes, GraphQL/UI/tool writer | — | probe cleanup |
| Scripted agent runtime | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | no provider calls | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (`taskKey`, `taskKeys`); `Directly Usable — No Migration` (`dependsOnTaskIds`; `retired-task-key-prefixes.json` missing = none).
- References: design "Persisted Data / State Transition Decision" + "Migration Plan"; handoff "Persisted Data Transition Check".
- Representative existing data: (a) the repository's synthesized released-shape fixtures (migration unit test, `projects-startup-migration` key case); (b) new: data written by the installed released build 1.5.5-beta.1 (Projects code identical to base) — several Projects incl. colliding prefix names ("AutoByteus", "AutoByteus!", "autobyteus"), Tasks of mixed statuses with context files, created in a known order, plus a deleted Project's residue.
- Evidence planned: first start of the worktree build keys every Project in creation order and Tasks in creation order; every other byte of each file kept (pre/post JSON diff = only added `taskKey` / `taskKeys`); migration ledger `SUCCEEDED`; second start: no file changes (byte hashes equal), ledger unchanged; next create continues numbering.
- Migration recovery (I/O failure → FAILED, restart retries): covered by `projects-startup-migration` key case (conflicting key) — rerun; not reproduced on the desktop (needs an injected I/O fault, outside operating assumptions MP-001).
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| server `tests/unit/projects/*`, `tests/unit/agent-tools/project-tasks/*`, `tests/unit/app-data-migrations/project-task-keys-v1-*`, `tests/unit/agent-collaboration/*`, `tests/unit/api/graphql/project-tasks-schema.test.ts` (new + updated) | Rules, store, service, tools, migration, texts | AC-001–027 | Still Valid | code review CRR-002 | Rerun |
| `tests/e2e/projects/projects-graphql.e2e.test.ts` API-010 (new), API-009 (updated) | GraphQL keys/deps; released v1.4.86 data | AC-001–004, 008–010, 018 | Still Valid | — | Rerun |
| `tests/e2e/projects/projects-startup-migration.e2e.test.ts` key case (new) | Startup keying, no lockout, retry, no-op | AC-006 | Still Valid | — | Rerun |
| `tests/e2e/projects/project-task-boundaries.e2e.test.ts` (updated) | MCP HTTP tools results with key, `dependsOn: []` | AC-020 | Still Valid; lacks `depends_on`, references, AC-025 | — | Add TKD-API-001 |
| gated `project-change-feed`, `project-task-context-files-delegation`, `task-existing-copy-assignment`, `task-reactivation-root-visibility` (updated) | Feed fields; delegate by key (recipient_address); texts by key; delegate by long ID | AC-011, 020, 022 (partly), 023 | Still Valid | — | Rerun; add TKD-AGY-001 for the uncovered parts |
| `autobyteus-web` specs (new + updated) | Components, derivations, picker, URLs, tree summary | AC-007, 012–017, 026 | Still Valid | — | Rerun |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` PT-E2E-006 line 203 | After edit save, expects `/projects/<id>/tasks/<long taskId>` | REQ-022 now: key URL | Needs Update | REQ-022, AC-026 | Expect `/tasks/<taskKey>` |
| `projects-feature-probe.mjs` PT-E2E-001..005, 007..016 | Projects journeys, preserved behavior | Preserved Behavior Boundary | Still Valid | — | Rerun |
| `project-manager-ux-probe.mjs` (lines 780, 951, 1012) | Task page by long-ID URL; panel "Open in Projects" href with long ID | REQ-022 | Needs Update (1012 href → key URL; 780/951 long-ID navigation still valid behavior but the page will `replace` to key URL — check any following pathname asserts) | AC-026 | Update the href assertion; check others when run |
| `project-manager-ux-task-locator-cases.mjs:207` | Tree summary title `Show Task in Projects: <summary>` | REQ-012 / AC-016: `Show Task in Projects: <key> <summary>` | Needs Update | ui-ux-spec, AC-016 | Expect the key in title / aria-label and the summary text |
| `projects-voice-cases.mjs:124` (only with `--voice-input`) | Opens edit by long-ID URL | REQ-022 (long-ID URL still opens) | Still Valid | — | Not run (voice option needs mic fixtures; unrelated) |
| `task-closure-tree-probe.mjs` | Tree rows across closure/reactivation | REQ-012 indirectly | Unclear → check when run? | no title/URL asserts found by grep | Out Of Scope for rerun unless time allows |
| server `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Ledger row count | — | Pre-existing failure (also on base) | handoff | Investigate cause (TESTING Rule 9), report |
| web `components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` | file explorer content | — | Pre-existing failure (also on base) | handoff | Investigate cause, report |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| TKD-API-001 | Agent tool contract through real MCP HTTP (scoped session) | AC-020, AC-022 (update_task), AC-024, AC-025, AC-027 (update_task), REQ-019 Temp-task id, REQ-020 Temp-task `depends_on` | `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` new `it` | Unit tests call the manifest directly; the MCP HTTP boundary (schema, parser, error envelope, nothing-written) for `depends_on` and references is not exercised |
| TKD-AGY-001 | `delegate_task` resolution and texts through scripted AGY runtime | AC-022 (delegate both modes, mixed case), AC-023 incl. "a deleted Task", AC-027 (delegate blocked Task), AC-019 | `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` new `it` (reuses its Agent-root harness) | Existing gated cases use lower-case key with recipient_address only, or long IDs |
| PT-E2E-017 | Browser journey: keys, badges, Task page chip/copy, Dependencies card, picker, live badge clear, delete drops dependent, long-ID URL → key URL | AC-011–015, 017, 018, 026 | `autobyteus-web/tests/e2e/projects-feature-probe.mjs` new `runCase` | No durable browser journey for the new UI against a real backend |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC | Notes |
| --- | --- | --- | --- | --- |
| PT-E2E-006 | `projects-feature-probe.mjs` | Edit-save route expects the key URL | REQ-022 / AC-026 | — |
| PMU (panel) | `project-manager-ux-probe.mjs:1012` | "Open in Projects" href = key URL | REQ-022 / AC-026 | — |
| PMU-020/021 (summary) | `project-manager-ux-task-locator-cases.mjs:207` | title/aria-label `Show Task in Projects: <key> <summary>` | REQ-012 / AC-016 | key read from GraphQL |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

(Results filled in during execution; see the execution report for the final table.)

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R1 | `pnpm -C autobyteus-server-ts prebuild && build` | worktree | current dist | Planned | `evidence/logs/server-build.log` |
| R2 | server `typecheck` | worktree | production src types | Planned | `evidence/logs/server-typecheck.log` |
| R3 | server `test:unit` (full) | worktree | backend logic, no regression | Planned | `evidence/logs/server-unit.log` |
| R4 | server e2e `projects-graphql`, `projects-startup-migration`, `project-task-boundaries` (incl. TKD-API-001) | clean env | GraphQL / startup / MCP HTTP | Planned | `evidence/logs/server-e2e-*.log` |
| R5 | gated scripted-AGY `project-change-feed`, `project-task-context-files-delegation`, `task-existing-copy-assignment` (incl. TKD-AGY-001), `task-reactivation-root-visibility` | clean env, `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs` | runtime delegation, feed | Planned | `evidence/logs/server-agy-*.log` |
| R6 | web `test:nuxt --run` (full) | worktree | web units | Planned | `evidence/logs/web-unit.log` |
| R7 | web guards | worktree | boundaries / localization | Planned | `evidence/logs/web-guards.log` |
| R8 | `test:e2e:projects` (PT-E2E-001..017) | probe-owned | browser journeys | Planned | `evidence/browser/projects-feature/` |
| R9 | `project-manager-ux-probe.mjs --cases <affected>` | probe-owned, scripted AGY | panel link, tree summary | Planned | `evidence/browser/project-manager-ux/` |
| R10 | Pre-existing failures root cause (TESTING Rule 9) | worktree | — | Planned | report |

## Test-Case Ledger Decision

- Ledger required: `Yes` — many independent cases across server E2E, gated runtime, browser probes and a long, interruption-prone desktop session.
- Canonical ledger path: `…/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Repository layers only (unit, typecheck, server E2E incl. TKD-API-001, gated scripted suites incl. TKD-AGY-001), before browser, desktop and live runs.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Server-side ACs proven at unit + E2E | UI ACs only in web unit tests with mounted stores; AC-021 open | Browser probe + isolated desktop |
| Changed-boundary execution directness | 85% | MCP HTTP, GraphQL, runtime delegation exercised for real | Renderer against a real backend not exercised | Browser probe |
| Cross-boundary integration realism and mock gap | 80% | No mocks in server E2E | Web specs mock GraphQL/feed; inference scripted | Probe on a built backend; a real-model run |
| Environment, configuration, identity, and fixture fidelity | 80% | Synthesized released shapes | Data written by a released build not used; packaged app not run | Release-written data + packaged worktree app |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | Invalid inputs write nothing; retired prefixes; startup retry | Restart on the packaged app | Desktop restart |
| User-surface, browser, and desktop-shell confidence | 70% | Web unit tests only | Rendering, routing (key URLs), right panel, tree | Browser probe + desktop |
| Durable regression coverage quality and relevance | 85% | New TKD cases | Several probes still asserted long IDs / old summaries | Update and run the probes |

- Overall post-repository confidence: 82% (simple average)
- Every critical AC directly proven: `No` (UI and AC-021 pending)
- Any applicable category below 90%: `Yes` — all seven
- Default target met: `No` → broader validation `Required` (executed; final 95.6% in the execution report)

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Browser` (durable probes) + `Project Desktop Validation` (isolated desktop instance, AC-021)
- Specific gap: real rendering and journeys against a real backend; packaged app startup running the migration on data a released build wrote; second start no-op; key URLs inside the packaged renderer.
- Why: repository tests mock the renderer's backend and use synthesized data; the desktop app is the product users run; AC-021 explicitly requires it.
- Browser-specific decision: browser probes give durable DOM assertions; the desktop run proves the packaged combination and the upgrade.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron, embedded server.
- Instructions used: `TESTING.md`, `docs/isolated-app-instances.md`, isolated-app skill.
- Web-equivalent behavior: all UI changes (renderer only).
- Shell-specific or lifecycle behavior: embedded server startup running the new migration; restart. No Electron main/preload code changed.
- Approach: (1) installed release 1.5.5-beta.1 in an isolated instance on an owned `--data-root` writes released data through its GraphQL; stop. (2) worktree build (`build:electron:mac`) started `--from-worktree` on the same root: first start keys data; journeys at 1440×900 and 760×900 (VIS-001–015 checks by DOM + screenshots), right-panel tab, key URLs; restart → no change. (3) Tree summary with a delegated copy: attempt with the scripted AGY CLI configured in the owned root's `server-data/.env` (`ANTIGRAVITY_CLI_COMMAND`); if the embedded server cannot run it, the tree summary is proven by the PMU browser case against a real backend with real delegated copies.
- Effect on the user's running app: `None` (separate ports, data root, process group; no stop/restart of anything not started here).
- Behavior not directly proven: see Not Tested.

## Live Environment And Fixture Plan

- Startup order: server build → (electron build) → released isolated instance (seed) → stop → worktree isolated instance on the same root → journeys → restart → checks → stop.
- Environment choices: owned data root under `$TMPDIR`; `env -i`-style clean env for server suites; viewport 1440×900 and 760×900 for desktop screenshots.
- Health / readiness: `isolated-app start` JSON (`/rest/health` + window listed).
- Seed data: Projects "AutoByteus" (oldest), "Customer Onboarding Experience Redesign", "AutoByteus!", "Café Ops", created in that order with Tasks of TODO/IN_PROGRESS/DONE/CANCELLED; one Task with a context file; one deleted Project.
- Requirement-linked journeys: VIS-001..015 / UXJ-001..005 (board, Task page, picker, tree, long keys), key URLs, right-panel tab.
- Evidence: pre/post JSON copies and hashes, ledger rows, DOM assertions JSON, screenshots, instance logs.
- Cleanup: stop own instances, remove owned data roots after copying evidence; confirm `isolated-app list` shows no running instance of mine.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| DSK-001..DSK-006 | Ticket-owned `evidence/scripts/desktop-*.mjs` (playwright-core over the instance CDP endpoint) | AC-021, AC-006 on release-written data | Depends on an installed released app build and a packaged worktree build; the repository's desktop harness has no Projects-specific suite and adding one would be outside the ticket's scope (TESTING: "Temporary ticket-owned automation does not require a new global package command") |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Gated real-provider suites (`RUN_CLAUDE_E2E`) | Changed behavior is server tool contract and texts, proven with the scripted runtime; real inference spends credits and proves only model behavior on the new wording | A real model may handle the reworded tool descriptions differently | No (could be run by delivery/user with credits) | Recorded as residual risk |
| Migration I/O failure on the desktop | Needs an injected I/O fault; outside operating assumptions (MP-001); FAILED/retry covered by startup e2e | Low | No | — |
| zh-CN rendering of new strings in the desktop | Strings unit-tested; PT-E2E-016 covers zh-CN Projects pages | Low | No | — |

## Decisions Revised During Execution

| Item | Revised Decision | Evidence |
| --- | --- | --- |
| `projects-feature-probe` PT-E2E-007 / 009 | Needs Update: used the tool-returned `taskId` (now the key) as the board row id | run 1 failures; REQ-018 |
| `ad-hoc-task-delegation` (update ack contains long ID) | Needs Update | gated run 1; REQ-018 |
| `collaboration-prompt-wording` CPW-R3 M-34..38 (fake `task_id`) | Needs Update: the Task is resolved first (design SR-003 REC-005), so a real Task key is needed to reach the run-ID refusals | gated run 1 |
| `project-manager-ux-task-locator-cases` PMU-020 team host | Needs Update (missed in the first pass) | PMU run 1 |
| `project-manager-ux-probe` PMU-008 | Out Of Scope: stale since `938933d8e2` (fixture team has no `/worker`) | PMU rerun; probe source |
| `task-closure-root-visibility`, `task-copy-idle-lifetime`, `delegated-team-lazy-member-activation` | Still Valid: failures were load-related (host load average 150–245); equal Pass on base and ticket when run alone | `evidence/logs/compare-*.log` |
| Real-provider gap | At the user's direction ("use claude agent sdk haiku 5 5 for testing"): LIVE-001 on Claude Agent SDK + Haiku 5.5; no Codex | `evidence/live/` |

## Ambiguities Or Reroute Triggers

None. Out-of-scope follow-ups FU-API-001..003 are listed in the execution report.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added TKD-API-001, TKD-AGY-001, PT-E2E-017; updated PT-E2E-006, PMU panel href, PMU tree summary title)
- Post-repository confidence: 82%; final after broader validation 95.6% (execution report)
- Broader validation decision: `Required` (browser + isolated desktop)
- Reroute Required Before Validation Execution: `No`

## Round 2 Note (API-REV-002)

- Re-read the updated `TESTING.md` at HEAD. Its new parts:
  - Rule 9: every failure needs its cause;
  - "Rerun by impact".
- Shared foundations changed since `d3686fd072`, so every case was rerun (plan in the ledger).
- Existing-coverage decisions:
  - `team-run-v1-production-upgrade.e2e.test.ts`: `Needs Update`, by its owner (cause: the flat-team-families migration). The ledger part was updated by `fa49138794`, which is `Still Valid`.
  - `projects-feature-probe.mjs` layout wait (`361eea070d`): `Still Valid`.
  - `task-copy-idle-lifetime.e2e.test.ts`: `Still Valid` but intermittent under load (FU-API-005).
