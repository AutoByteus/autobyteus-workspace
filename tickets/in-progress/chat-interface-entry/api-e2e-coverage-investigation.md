# API/E2E Coverage Investigation — chat-interface-entry

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/requirements-doc.md` (SR-003 intended behavior; SR-006 editorial)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-spec.md` (SR-007, D-01..D-13)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-ux-spec.md` (R2, normative), `…/visual-references/` (VIS-001–025, no VIS-020), `…/ui-behavior-test-matrix.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-revision-record.md` (IR-001)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md` (CRR-001 Pass 9.3)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-revision-record.md`
- Delivery Revision Record: N/A — not a delivery re-entry
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-revision-record.md` (created after the first completed result)
- Current API/E2E Revision ID: `API-REV-003` (round 3); prior `API-REV-002` (Pass), `API-REV-001` (Fail)
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-case-ledger.md`
- Current Investigation Round: 3 (round 2 below kept for history)
- Trigger: `code_reviewer` CRR-003 Pass (IR-002 `da1033860`, IR-003 `5f11d52f6`; SR-010 D-14, D-15)
- Prior Investigation Reviewed: round 1 (API-REV-001 Fail: F-01, F-02, F-03)
- Latest Authoritative Investigation: this file, round 2

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review), subject to `get_handoff_rules`
- Proportional test-code review decision: `Required` (durable test code is added/updated)

## Current Requirement And Design Basis

REQ-001–REQ-020 / AC-001–AC-017 (SR-003) with the R2 UI supplement. Design D-01..D-13: Chat nav and `/` landing; explicit `ComposerTarget`; unregistered New chat draft; launch order D-04; standalone runs in the chat view D-05; route sync across promotion D-13; team quick path D-06; tool shell D-07; footer mode by run identity D-08; content-carried skill instruction D-09; built-in Daily Assistant `seedIfMissing` D-10; `skillScope` / installed-record ALL_INSTALLED bindings D-11; last-used model D-12. Code review (CRR-001) passed with no blocking findings; CR-001 (stale `createDraftRun` mock) is Low. Downstream hints: ALL_INSTALLED per runtime incl. bundled/disabled/AGY capsule (RSK-003); Daily Assistant seed across restart incl. packaged build; D-13 URL; D-08 after reload; RSK-005; team quick path with attachment; skill round trip; voice; browser 1440×900 / 390×844.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Chat nav + `/`→`/chat` | Added/Changed | REQ-001, REQ-020, D-01 | Browser: nav order, pencil, landing |
| BEH-005 New chat → Daily Assistant run | Added | REQ-002/003/007, D-03/D-04 | Live browser + real runtime; URL/tree evidence |
| BEH-003 model menu/thinking/last-used | Added | REQ-005/006/019, D-12 | Browser against real catalogs; reload persistence |
| BEH-004 workspace default/folder | Added | REQ-004 | Browser: temp default, folder path validation, run bound to folder |
| BEH-007 `/` skill tags | Added | REQ-008, D-09 | Browser + server content (projection) + reload chips |
| BEH-008 `@` / tree `+` | Added | REQ-009 | Browser |
| BEH-009 team quick path | Added | REQ-010, D-06 | Browser + GraphQL team run config + attachment |
| BEH-010 footer lock/Offline edit | Changed | REQ-011, D-08 | Browser + server config after reload |
| BEH-011 chat view, strip collapsed | Changed | REQ-012, D-05/D-07 | Browser |
| BEH-012 same box; team/org unchanged | Changed | REQ-013, D-02 | Browser team view; voice extension |
| BEH-013 Auto-approve default | Added | REQ-014 | Browser + server run config |
| BEH-014 tree rows, missing id | Changed | REQ-015 | Browser |
| REQ-007 system: Daily Assistant seed; ALL_INSTALLED | Added | D-10/D-11 | Server lifecycle (restart), real catalog, each runtime |
| REQ-017 catalog forms unchanged; standalone → chat | Preserved/Changed | D-05 | Browser catalog Run |
| Removed: `AgentWorkspaceView`, `createDraftRun`, agent `/workspace` links | Removed | Removal plan | Stale test mock CR-001 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | SkillService installed records, ALL_INSTALLED bindings, built-in sync policy | Unit tests with real FS + services (`skill-service-all-installed-scope`, `built-in-agent-bootstrapper`), smoke script | Real, large installed catalog; real runtime consumption | Temporary probe against the real catalog; live runs |
| API / transport / contract | Yes | GraphQL `skillScope`; WS content composition | `agent-definitions-graphql.e2e` round trip | Live frontend↔backend | Live browser |
| Frontend component / state | Yes | chat stores/services/components, composer target, routing | 219+ targeted specs; full web suite | All mocked stores | Live browser |
| Browser integration / user journey | Yes | `/chat`, route sync, tree, menus | None live | Everything above | Browser (Playwright, real backend) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer | — | Same as browser | Browser |
| Desktop shell / Electron-specific | Yes (limited) | Packaged server built-in template assets; voice extension availability | Electron suite; bootstrap smoke on dist | Packaged asset inclusion + seeding in a real packaged app | Project Electron E2E harness (isolated data root/port) |
| Process / lifecycle | Yes | Server startup seeding, restart preservation, run terminate/resume | Unit | Real server restart | Live backend restart in owned data root |
| Persisted-data transition | Yes | `agent-config.json` `skillScope` (Directly Usable), Daily Assistant folder, localStorage last-model | Unit normalize | Existing-data read through a real server | Live: pre-existing agent config without `skillScope` read as CONFIGURED |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | Codex / Claude / AGY / AutoByteus runtimes | Unit only for Claude/AGY | Real runtime skill materialization | Live runs per available runtime |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry`
- Stack: pnpm monorepo; Nuxt 3 web (`autobyteus-web`), Node/TS server (`autobyteus-server-ts`, Prisma SQLite), Electron shell.
- Conflicting/unclear instructions: none. The user's packaged AutoByteus app is running (pid 99100, port 29695, `~/.autobyteus/server-data`) and must not be touched.
- Secrets: runtime CLIs (`codex`, `claude`, `agy`) are logged in on this machine; no secret values are read or recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md#testing` | Web testing | `pnpm test:nuxt run`, `pnpm test:electron run`; colocated tests |
| `autobyteus-server-ts/AGENTS.md` | Server testing | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `package.json` (root), `scripts/development/run-dev.mjs`, `development-runtime.mjs` | Dev env | `pnpm dev` fixed ports 8000/3000, data root `.autobyteus/development` |
| `autobyteus-web/tests/e2e/agy-process-restart-focus-continuation-probe.mjs` | Precedent for live probes | Owned temp data root, `prisma migrate deploy`, `node dist/app.js --port --data-dir`, `pnpm dev --port` with `BACKEND_NODE_BASE_URL`, Playwright + Chrome |
| `autobyteus-web/scripts/run-electron-e2e.mjs`, `scripts/electron-e2e/*` | Packaged Electron E2E | `pnpm build:electron`; isolated data root (protected paths include `~/.autobyteus`), non-29695 port, `--data-root`, `--hold-ms` |
| Implementation handoff "Environment Or Dependency Notes" | Build prerequisites | `pnpm --filter autobyteus-server-ts build`, `npx prisma generate`, `npx nuxi prepare` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server (owned) | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <owned>` | owned temp data root, SQLite migrated with `prisma migrate deploy` | `GET /rest/health` | SIGTERM process group; remove temp root |
| Nuxt dev (owned) | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` | free port | HTTP 200 | SIGTERM process group |
| Chrome (Playwright) | — | `chromium.launch({ executablePath: Google Chrome })` | headless; 1440×900 and 390×844 | — | `browser.close()` |
| Packaged Electron | `autobyteus-web` | `pnpm build:electron` then `node scripts/run-electron-e2e.mjs --skip-build --data-root <owned> --hold-ms N` | isolated data root/port | harness ready event | harness cleanup; remove owned root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Installed skills incl. bundled + disabled | Files in owned data root: global `skills/<n>`, bundled `agents/<a>/skills/<n>`; disable via GraphQL | owned only | removed with temp root |
| Real large catalog (RSK-003) | `AUTOBYTEUS_SKILLS_PATHS` / `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` pointing at the user's skill repos, read-only | disabled state is written to the owned data root (`disabled_skills.json`), never to skill folders | nothing written to user repos |
| Agents / team definitions | GraphQL create mutations | owned data root | removed with temp root |
| Pre-existing agent config without `skillScope` | Write `agents/<id>/agent-config.json` before startup | owned | removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` for `agent-config.json`; new data: Daily Assistant folder, `autobyteus.chat.lastModel`.
- References: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing data: an agent folder whose `agent-config.json` has no `skillScope`, created before the server starts.
- Evidence planned: GraphQL returns `skillScope: CONFIGURED` for it; its configured skills are unchanged; Daily Assistant is seeded, edits preserved across restart, a deleted file restored.
- Migration-specific scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Req / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| server `tests/unit/skills/services/skill-service-all-installed-scope.test.ts` | Records, precedence, ALL_INSTALLED regular/detailed bindings, disabled exclusion, runtime paths | REQ-007, D-11 | Still Valid | read | Keep |
| server `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | seed, preserve edits, re-seed missing (real FS + services) | REQ-007, D-10 | Still Valid | read | Keep |
| server `tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts` | `skillScope` round trip | D-11 | Still Valid | pass | Keep |
| server `scripts/smoke-built-in-agents-bootstrap.mjs` | dist templates + seed/reseed | D-10 | Still Valid | pass in build | Keep |
| web `services/chat/__tests__/chatLaunchService.spec.ts` | D-04 order, failed send → temp, team quick path | D-04/D-06 | Still Valid | read | Keep |
| web `pages/__tests__/chat.spec.ts`, `composables/chat/__tests__/useChatRouteRunSync.spec.ts` | route owner, missing/temp ids, D-13 | D-05/D-13 | Still Valid | read | Keep |
| web `pages/__tests__/workspace-chat-redirect.spec.ts` | RSK-005 redirect rules | RSK-005 | Still Valid | read | Keep |
| web `components/chat/__tests__/chatRunModelControls.spec.ts` | D-08 by run id, lock, save, no retry loop | D-08 | Still Valid | read | Keep |
| web `stores/__tests__/chatDraftStore.spec.ts`, `ChatComposer.spec.ts`, codec/preference specs | draft defaults, rebuild, send enablement, codec | D-03/D-09/D-12 | Still Valid | read | Keep |
| web `tests/integration/workspace-history-draft-send.integration.test.ts` | tree `+` preset → first send | REQ-009 | Still Valid | pass | Keep |
| web `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` L208 `createDraftRun: vi.fn()` | Mocks removed API | Removal plan (CR-001) | Needs Update (stale line) | code review CR-001 | Remove the line; the 2 team tests still fail on base (baseline, out of scope) |
| web baseline failures: `WorkspaceAgentRunsTreePanel.regressions` (2 team tests), `org-definition-navigation`, `app-font-size-fixed-px-audit`, `StartupDelayLifecycle` | Unrelated pre-existing assertions | — | Out Of Scope | Reproduced identically on base `fcd3e83a4` in a temp worktree | None |
| server baseline failures: `codex-tool-log-correlation` (4), `agent-packages-graphql` (2), `json-file-persistence-contract` (1) | Unrelated (`refType` on TeamMember; team definition fetch; Codex team admission) | — | Out Of Scope | Failure causes read | None |
| web `tests/e2e/*-probe.mjs` (fixture probes) | Other features | — | Out Of Scope | — | None |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceAgentRunsTreePanel.regressions.spec.ts` L208 `createDraftRun: vi.fn()` | Mock of a removed store action | `runHistoryStore.createDraftRun` removed | Design Removal Plan; CR-001 | Tree `+` preset covered by `workspace-history-draft-send.integration.test.ts` and `WorkspaceAgentRunsTreePanel.spec.ts` | Only the mock line is removed |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Req / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| CE-LIVE (cases below) | Real browser ↔ real backend ↔ real runtime Chat journeys, ALL_INSTALLED live, Daily Assistant restart lifecycle | AC-001..AC-017 (except voice), D-04/D-08/D-13, RSK-005 | `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` + `package.json` script `test:e2e:chat-entry-live` | Every chat spec is mock-based; the repository already keeps live, owned-data-root browser probes (AGY restart probe) for exactly this boundary |

## Durable Coverage To Update

| Scenario ID | Existing Path | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| CR-001 | `WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Remove stale `createDraftRun` mock | CR-001 | Spec stays baseline-failing for 2 unrelated team tests |

## Durable Coverage To Remove

None beyond the single stale mock line above.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `npx vitest run tests/unit/skills tests/unit/agent-definition tests/unit/built-in-agents tests/unit/agent-execution/backends tests/e2e/agent-definitions --no-watch` | `autobyteus-server-ts` | skillScope, installed records, bootstrap, factories, GraphQL | Pass for scope: 758 passed; 7 failed, all baseline (cause-checked) | `api-e2e-evidence/server-targeted.log` |
| 2 | `pnpm --filter autobyteus-server-ts build` | root | tsc build + asset copy + built-in bootstrap smoke | Pass | `api-e2e-evidence/server-build.log` |
| 3 | `pnpm test:nuxt run` | `autobyteus-web` | Full web suite | Pass for scope: 3320 passed; 4 failed files = baseline | `api-e2e-evidence/web-full.log` |
| 4 | Same 4 failing web specs on base `fcd3e83a4` (temp worktree `/tmp/chat-entry-base-wt`) | base | Baseline confirmation | Same 4 failures on base | console (recorded in ledger) |
| 5 | `pnpm test:electron run` | `autobyteus-web` | Electron suite | Pass (177 passed, 1 skipped) | `api-e2e-evidence/web-electron.log` |
| 6 | Temporary real-catalog probe | `api-e2e-evidence/probes/real-catalog-all-installed-probe.mjs` | RSK-003: real catalog regular/detailed bindings + AGY capsule | Pass (78 skills, 64 bundled; capsule 3.1 MB) + collision finding | `api-e2e-evidence/real-catalog-all-installed.json` |

## Test-Case Ledger Plan

- Ledger required: `Yes`. The run spans many independent live journeys, several real runtimes, server restarts and a packaged Electron build, so interruption and context-compression risk is real.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-case-ledger.md`
- Case granularity: one independently meaningful journey or probe.

| Case ID | Case / Journey | Req / AC IDs | Boundary / Surface | Planned Entry Point | Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| CE-01 | Repository server targeted suites | REQ-007, D-10/D-11 | Unit/GraphQL | vitest | 1 | log |
| CE-02 | Repository web full suite + baseline confirmation | all | Unit/integration | vitest | 2 | logs |
| CE-03 | Electron suite | shell | vitest electron | `pnpm test:electron run` | 3 | log |
| CE-04 | Real-catalog ALL_INSTALLED + AGY capsule + collision | REQ-007, RSK-003 | built server modules | temp probe | 4 | JSON |
| CE-05 | Landing, nav, New chat defaults, fresh-root Daily Assistant seed, existing-config direct use | AC-001, AC-017, AC-002, REQ-007, persisted data | live browser + GraphQL | live probe | 5 | DOM/JSON/screens |
| CE-06 | Model menu (search, runtime rows, not installed), thinking, workspace folder validation | AC-003, AC-004, AC-005 | live browser | live probe | 6 | DOM |
| CE-07 | Send with 2 skill tags → run, D-13 URL, tree row, chips, sent-as, server content, ALL_INSTALLED materialized (bundled in, disabled out), reload chips, last-used model after reload | AC-002, AC-006, AC-016, D-13, REQ-007 | live browser + runtime + FS | live probe | 7 | DOM/GraphQL/FS |
| CE-08 | Terminate → Offline → footer Runtime fixed save → reload → D-08 permanent mode → save again → resume uses new model; lock while live | AC-009, D-08 | live browser + GraphQL | live probe | 8 | DOM/GraphQL |
| CE-09 | Failed first send → `/chat?id=temp-*` with error → resend → URL replaced with permanent id | D-04/D-13 | live browser (network fault injection) | live probe | 9 | URL/DOM |
| CE-10 | Ask first + folder workspace applied to run; header shows mode | AC-003, AC-012 | live browser + GraphQL | live probe | 10 | GraphQL |
| CE-11 | `@agent` + `/` scoped skills; `×`; tree `+` preset | AC-007 | live browser | live probe | 11 | DOM |
| CE-12 | Team quick path with attachment; uniform member config; coordinator; Team view; team box unchanged | AC-008, AC-011 | live browser + GraphQL | live probe | 12 | DOM/GraphQL |
| CE-13 | RSK-005: org route selection no redirect; stale selection no redirect on mount; tree click redirects | RSK-005, AC-010 | live browser | live probe | 13 | URL |
| CE-14 | Missing chat id; tool strip collapsed/open; catalog Run → chat; delete via tree | AC-010, AC-013, AC-014 | live browser | live probe | 14 | DOM |
| CE-15 | Responsive 390×844 + 1440×900 visual set vs VIS refs | AC-015, QR-003 | live browser | live probe + manual compare | 15 | screenshots |
| CE-16 | Daily Assistant restart lifecycle: edit preserved, deleted config restored | REQ-007, D-10 | live server restart | live probe | 16 | FS/GraphQL |
| CE-17 | ALL_INSTALLED live on Claude and AGY (and AutoByteus if a model is available) | REQ-007, RSK-003 | live runtimes | live probe per runtime | 17 | FS/stream |
| CE-18 | AGY ALL_INSTALLED in a workspace with a same-named local skill: observable outcome | RSK-003 | live runtime + browser | live probe | 18 | DOM/log |
| CE-19 | Packaged Electron: Daily Assistant seeded on fresh isolated data root; preserved across relaunch | REQ-007 | packaged app | Electron E2E harness | 19 | FS/GraphQL |
| CE-20 | Voice mic with Voice Input extension | AC-011 mic | extension | browser/electron | 20 | DOM |

## Post-Repository Confidence Scorecard

Scored after rows 1–6 (repository suites + real-catalog probe), before live browser/runtime validation.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | Unit/spec coverage exists for every AC; GraphQL `skillScope` e2e | No AC proven through the real UI + backend | Live browser journeys |
| Changed-boundary execution directness | 70% | Server skill/bootstrapper tests use real FS + services; real-catalog probe used built modules | Web chat boundary entirely mocked | Browser against a real backend |
| Cross-boundary integration realism and mock gap | 60% | — | Runtime consumption of ALL_INSTALLED on Claude/AGY/AutoByteus unit-only; WS send/route sync mocked | Live runtimes |
| Environment, configuration, identity, and fixture fidelity | 80% | Real 78-skill catalog resolved/materialized | Fresh-data-root seeding in a real server/packaged app | Owned server + packaged Electron |
| Failure, edge-case, lifecycle, and recovery evidence | 65% | Unit cover failed first send, missing ids | Restart lifecycle, failed-then-resent live | Lifecycle + fault injection |
| User-surface, browser, and desktop-shell confidence | 40% | — | No rendering evidence vs VIS-001..025 | Browser at 1440×900 / 390×844; Electron landing |
| Durable regression coverage quality and relevance | 80% | Broad colocated specs | No live Chat regression probe | Durable live probe |

- Overall post-repository confidence: 66% (simple average)
- Every critical acceptance criterion directly proven: No
- Categories below 90%: all
- 95% target met: No
- Material residual risks: all live/rendered Chat behavior; RSK-003 collision (see below)

## Broader Validation Decision

- Decision: `Required`
- Selected mode: `Browser` (Playwright/Chrome against an owned real backend with real runtimes), `Lifecycle` (owned server restart), `Project Desktop Validation` (packaged Electron harness, isolated data root) for shell-only seeding evidence.
- Gap addressed: every Chat spec is mocked; route sync, footer save, team quick path, skill round trip, and ALL_INSTALLED consumption by real runtimes are unproven live.
- Browser rationale: the Chat UI is web-equivalent renderer behavior; Electron is needed only for packaged template assets.

## Desktop Application Validation Decision

- Shell: Electron (`autobyteus-web/electron`), packaged server at `Resources/server/dist`.
- Web-equivalent: all Chat UI; validated in Chrome.
- Shell-specific: packaged inclusion of `built-in-agents/templates/daily-assistant` and seeding on a fresh app data root; Voice Input extension availability.
- Approach: project harness `run-electron-e2e.mjs` with an owned `--data-root` and random port; never the user's running app or `~/.autobyteus`.
- Effect on the running desktop app: None (different port, data root, user-data dir).

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| (Resolved in round 2) F-01: a live persisted chat opened fresh (reload, or opened from the tree when that runtime's catalog is not loaded) shows no locked thinking control, although the model exposes thinking and the run has an `llmConfig` | `Local Fix` (implementation: `chatRunModelControls.thinkingSchema` falls back to the on-demand `useChatModelCatalog`, which nothing loads for a live persisted run) | Durable probe C05; `step-live-thinking.mjs`; ui-ux-spec L381–383, UIS-004, VIS-015 | `/software_engineering_team/code_reviewer` (failure-origin review) |
| (Resolved in round 2) F-02: resend on a `/chat?id=temp-*` chat after a failed first send intermittently fails: `Timed out waiting for agent stream connection for run '<P>'`, the prepared run is cancelled, and the chat disappears ("This chat no longer exists"); 2 of 14 live attempts | `Unclear` (client closes the new stream session right after connect at promotion; not isolated whether D-13 route sync or the pre-existing first-send path causes it) | Ledger Seq 21; `owned-env-A-backend.log` (runs `bc7dc948…`, `7a252072…`) | `/software_engineering_team/code_reviewer` |
| (Resolved in round 2) F-03: AGY + ALL_INSTALLED fails run start with `AGY_SKILL_NAME_COLLISION` whenever the chosen workspace has `.agents/skills/<name>` equal to any installed skill; the user sees only "Failed to prepare agent run '<id>'." Pre-existing AGY policy, widened from configured names to every installed skill | `Design Impact` (design RSK-003 / escalation trigger: runtime cannot consume the expanded skill set within existing materializer limits) | `real-catalog-all-installed.json` collision run; ledger Seq 26 | `/software_engineering_team/code_reviewer` → Solution Designer |

## Round 2 Delta (API-REV-002)

- New behavior to prove: D-14 activation-pending marker (F-02 fix), D-15 skill request strength Rules 1 and 2 (F-03 fix), and the CR-002 live footer thinking catalog request (F-01 fix).
- Prior failures are rechecked first: F-01 → probe C05; F-02 → probe C07 ×14 plus independent reruns of the implementer's deterministic `d14-reconcile-probe.mjs --scenario stale|stale-resume`; F-03 → new probe C14 (Rule 1 / V-D) and C15 (Rule 2 V-B, V-A, V-E) on Codex, Claude and Grok, C14 on AGY, plus an independent rerun of `d15-skill-strength-probe.mjs` (includes V-C) and the real-catalog probe with request strength.
- Durable coverage update, same file: `chat-entry-live-probe.mjs` gains `--repeat`, C14, C15, a `probe-shadow-owner` fixture (a private `probe-alpha` shadowing the global one), runtime skill-dir maps (`.grok`; AGY `.agents` for Rule 1), and a disposition-log matcher for both log formats.
- Kept rather than duplicated: the implementer's `d14`/`d15` probes stay implementation evidence. Their deterministic stale injection and bootstrap-only V-C matrix complement the durable UI probe; I reran them independently.
- Regression: all of C01–C13 again. Packaged Electron is not re-run: `git diff 797d49d6a..HEAD` shows no change to built-in agents, `electron/`, `pages/`, `layouts/` or `build/`, so the round-1 packaged evidence still applies.
- Results: see the ledger (Seq 34–45) and the execution report. Every repository and live check passed.

## Round 3 Delta (API-REV-003)

- Trigger: `code_reviewer` CRR-005 Pass. IR-004 `9d65adf6e` (D-16, REQ-021 / AC-018 / DEC-015 from UVF-001), on delivery's merge of `origin/personal` (`7aa53519b`) and the C-12 fix (`4b440e719`).
- Changed boundary: web only. Chat model labels (rows, search, footer trigger, persisted fixed list) now come from the shared launch-form policy; `existingRunChoiceLabelInput` moves to `utils/modelSelectionLabel.ts` (gear editor); `compareRecommendedFirstBy` is shared.
- No prior failures open (API-REV-002 Pass). Scope: prove AC-018 (V-L1..V-L5), re-run the whole probe on the merged HEAD (the merge was never validated live by API/E2E), and rerun the repository suites.
- Durable coverage decisions:
  - Update: `chat-entry-live-probe.mjs` needs an exact option-row selector, because `[data-test^="chat-model-option-"]` now also matches the new `chat-model-option-label|secondary|recommended` children. C04 now compares the trigger with the chosen row's policy label instead of the identifier.
  - Add: C16 — AC-018 with an independent oracle that recomputes label/secondary/recommended from the GraphQL runtime catalog (the launch-form policy), plus launch-form order/badge parity, search, the Offline persisted fixed list, the fresh New chat trigger and 390×844.
  - Reuse: repository fixture probe `existing-run-model-config-probe.mjs` for the gear editor (V-L5), plus `RuntimeModelConfigFields.spec.ts` in the web suite for the moved label mapping.
- Packaged Electron not re-run: no shell, seeding or packaging code changed.
- Results: ledger Seq 46–54; execution report round 3.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Durable coverage added / updated: `Yes` — `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` + `package.json` script `test:e2e:chat-entry-live`; CR-001 stale mock line removed
- Post-repository confidence: round 1 66%; round 2 post-repository 80% → final 95% (see execution report)
- Broader validation decision: `Required` — executed (browser, lifecycle, packaged Electron)
- Reroute Required Before Validation Execution: `No`; round 1 findings F-01, F-02 and F-03 are resolved in round 2
- Recommended recipient: `/software_engineering_team/code_reviewer` for proportional test-code review
