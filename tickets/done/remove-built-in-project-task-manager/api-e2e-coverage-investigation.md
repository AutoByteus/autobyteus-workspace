# API/E2E Coverage Investigation

## Investigation Meta

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/`.

- Requirements Doc: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec (required on every route): `design-spec.md` (SR-002)
- Supplemental Task Artifacts: None
- Design Review Report: `design-review-report.md` (Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 Pass handoff from `/software_engineering_team/code_reviewer` (commit `62af418df`)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (reviewed Medium/High route)

## Current Requirement And Design Basis

These are the behaviors to prove:

- The built-in `autobyteus-project-task-manager` is no longer shipped or installed (REQ-001).
- Upgraded installs lose `<appData>/agents/autobyteus-project-task-manager/` exactly once through the required, STARTUP_ONLY migration `20261006_remove_built_in_project_task_manager` (REQ-002). The migration never blocks startup; on failure it shows `FAILED` + `RESTART_TO_RETRY` + `canRetry=false` and retries on the next start (REQ-003, REC-001 option 1).
- Nothing else is touched (REQ-004).
- Old built-in runs stay listed and readable. Continuing one fails like any deleted agent, and other runs keep working (REQ-006, DEC-002; UNK-001 to be closed here).
- Projects tools are unchanged (REQ-005).
- The remaining built-ins keep their sync and their `@` exclusion; the web mirror equals the server list (REQ-007).

The handoff and CRR-001 hand two things to API/E2E: entry-point proof and AC-008. The design's escalation trigger applies if AC-008 is worse than the existing "not found" failure.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005, SCN-006.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - **RU-001.** During a SCN-003 failure window, the user sees the duplicate as an ordinary shared agent and chats with it. The next start then removes it and the conversation becomes a SCN-004 old run.
    - Trigger: the user picks "Project Task Manager" (ID `autobyteus-project-task-manager`) in a session whose start had a FAILED cleanup.
    - This is the realistic way current-format history that references the retired ID comes into being on the new build. The only other source is a beta build, which is covered by TMP-001.
  - **RU-002.** The standalone application host is the first entrypoint to start after the update, and Studio starts on the same data later.
    - Trigger: a user launches a standalone application before opening Studio.
    - Both entrypoints share one migration record.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): SCN-007 (downgrade, then re-upgrade) and PREM-001 (a user-named "AutoByteus Project Task Manager" agent on a never-beta install).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 built-in sync | Removed (PTM) / Preserved (two others) | REQ-001/007; registry diff | Prove on built dist: fresh start creates no folder, remaining built-ins installed |
| BEH-002 catalog | Changed | REQ-001; AC-002 | Prove via GraphQL `agentDefinitions` on Studio, and the in-process catalog on the standalone host |
| BEH-003 one-time removal | Added (migration) | REQ-002/003/004; AC-002..006 | Prove through both built entrypoints over the real SQLite record store, including failure → restart retry |
| BEH-004 old runs | Preserved (no code change) | REQ-006; AC-008; UNK-001 | Prove history list, projection, continue failure and other-run continuity over real HTTP/WS |
| BEH-005 Projects tools | Preserved | REQ-005; AC-007 | Rerun `tests/e2e/projects` and the TESTING.md Project unit suites |
| BEH-006 `@` exclusion / web mirror | Changed (mirror) / Preserved (policy) | REQ-007; AC-009 | GraphQL `collaboratorMentionCandidates` on a live run, plus the web contract spec |
| BEH-007 docs | Changed | REQ-008; AC-010 | Delivery owns AC-010; grep sanity only |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Built-in registry, new migration | Unit plus runner/bootstrap integration (23 tests) | Not run through the real built entrypoints | Built-process E2E (durable) |
| API / transport / contract | Yes (indirect) | GraphQL catalog, migration status, history, WS continue | None for this change | Outward API results for AC-002..AC-005 and AC-008 | Built-process E2E (durable) |
| Frontend component / state | Yes (mirror only) | `builtInAgentDefinitionIds.ts` | Web contract spec + draft-mention spec | — | None |
| Browser integration / user journey | Indirect | History panel / continue error rendering for a deleted-agent run (unchanged code) | None | UNK-001 says the UI presentation is unconfirmed | Decided after the repository scorecard |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Indirect | Same as browser | — | Same | Same |
| Desktop shell / Electron-specific integration | No | Embedded server startup uses the same `dist/app.js` entry | — | None specific to this change | None |
| Process / lifecycle | Yes | Startup order, restart, failure → restart retry | Integration test (in-process runner) | Real process start/stop on both entrypoints | Built-process E2E |
| Persisted-data transition | Yes | Deletion of one app-data folder; migration record | Unit + integration | Real record store via real startup; byte preservation of neighbours | Built-process E2E |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | LLM provider is emulated only to create run history | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager` (branch `codex/remove-built-in-project-task-manager`, HEAD `62af418df`)
- Project type and runtime stack: pnpm workspace. The server is Node/TypeScript (Fastify, Mercurius GraphQL, Prisma SQLite) and the web is Nuxt/Electron.
- Project testing guideline path(s): `TESTING.md` (repository root). No closer `TESTING*.md` exists.
- Conflicting, missing, or unclear project instructions: None.
- Required environment variables or secrets available: `N/A`. The emulated LM Studio provider needs no secrets.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Testing guideline | Use the smallest direct layer first. Server E2E needs a current `dist`, built by `pnpm -C autobyteus-server-ts build`. "Projects Migration Regressions" runs startup migrations through both built entrypoints. "Project Mutation Regressions" uses the `tests/e2e/projects` command. Never use the user's app/data. Stage paths explicitly. |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md` | Repo rules | `vitest run <path> --no-watch` |
| `autobyteus-server-ts/package.json` | Scripts | `build` = `build:full`, which also runs the sanitized built-in smoke |
| `tests/e2e/projects/projects-startup-migration.e2e.test.ts` | Pattern | Spawns built Studio and the standalone host on an owned temp root, reads `getAppDataMigrations` |
| `tests/e2e/helpers/context-file-process-fixture.ts` | Pattern | Built Studio with an emulated LM Studio (`/api/v1/models`, `/v1/chat/completions`) for real runs over WS |
| `implementation-handoff.md` Environment Notes | Setup | Needs `pnpm install`, `prebuild`, `nuxt prepare`. TS6059 typecheck noise exists on base. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server dist | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build` | Rebuilt from `62af418df` at the start of this round | Build exit 0 + "Built-in agents bootstrap smoke check passed" | N/A |
| Studio child | `autobyteus-server-ts` | `node dist/app.js --data-dir <owned> --host 127.0.0.1 --port 0` | `DATABASE_URL=file:<owned>/db/production.db`, `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=<owned package root>`, `LMSTUDIO_HOSTS=<owned fake>` | "Server listening on 127.0.0.1:0" + `/rest/health` 200 | SIGTERM, SIGKILL after 8 s; owned root removed |
| Standalone host | owned entry `.mjs` | `startStandaloneApplicationHost` from `dist/index.js` | Same env | `/_autobyteus/health` 200 | `host.close()` + process exit |
| Emulated LM Studio | in-test `http.Server` | `listen(0)` | Deterministic streamed reply | `/api/v1/models` | `close()` + `closeAllConnections()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Installed beta copy | Frozen copy of base `1aa918298` template bytes; beta wrote it with `fs.copyFile`, so it is byte-identical | Fixture with provenance README under `tests/fixtures/app-data-migrations/` | Copied into each owned root |
| Repository `project-task-manager` | Test-owned package root (`agents/project-task-manager/` with `agent.md`, `agent-config.json`, skill) | Never the real `autobyteus-agents` checkout | Inside the owned root |
| Old built-in run history | RU-001: a real run over GraphQL/WS during the FAILED window | Real current history writer | Inside the owned root |
| User agent, Project, other run | Public GraphQL `createAgentDefinition`, `createProject`, `createAgentRun` | — | Inside the owned root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (an approved feature-removal deletion)
- Design-spec and implementation-handoff references: design-spec → Persisted Data / State Transition Decision, Migration Plan; implementation-handoff → Persisted Data Transition Check.
- Representative existing-data setup and required behavior: the installed copy with beta bytes, plus the repository PTM, user agent, Project/Task, run history and the remaining built-ins. The copy is removed once; everything else stays byte-identical.
- Evidence planned for the approved migration outcome: built-entrypoint E2E on both entrypoints, covering status, attempts, attempt-log disposition, folder absence, catalog and byte snapshots.
- Migration-specific completion/recovery scenarios: present ⇒ MIGRATED/SUCCEEDED; absent ⇒ SKIPPED/SUCCEEDED; remove failure ⇒ FAILED + RESTART_TO_RETRY, `canRetry=false`, manual run rejected, startup continues ⇒ next start SUCCEEDED (attempts 2); terminal success never reruns.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/app-data-migrations/remove-built-in-project-task-manager-migration.test.ts` | Every disposition, symlink, retry | REQ-002/003; AC-004/005 | Still Valid | CRR-001; rerun | Keep |
| `tests/integration/app-data-migrations/remove-built-in-project-task-manager-startup.integration.test.ts` | Runner + bootstrap + catalog in-process | AC-002..006 | Still Valid | Rerun | Keep (the process layer is added by the new E2E) |
| `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts`, `built-in-agent-templates.test.ts` | Two built-ins; retirement; stale copy not rewritten | REQ-001/007 | Still Valid | Rerun | Keep |
| `scripts/smoke-built-in-agents-bootstrap.mjs` (in `build:full`) | Dist template absent; bootstrap creates no folder | AC-001 | Still Valid | Build log | Keep |
| `tests/e2e/projects/*` (21 tests) | Projects/Tasks/tools; node-locality E-008 without manager lookup | REQ-005; AC-007 | Still Valid | Rerun | Keep |
| `tests/unit/agent-collaboration/**` | `@` candidate policy derived from the registry | REQ-007; AC-009 | Still Valid | Rerun | Keep |
| `autobyteus-web/utils/agents/__tests__/builtInAgentDefinitionIds.contract.spec.ts`, `utils/collaborators/__tests__/draftMentionEligibility.spec.ts` | Mirror equals server; drafts exclude built-ins | REQ-007; AC-009 | Still Valid | Rerun | Keep |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` (+ historical fixture with the retired ID) | History store reads a history that references the retired ID | REQ-006 | Still Valid | Rerun | Keep (fixture unchanged, AF-007) |
| `tests/e2e/projects/projects-startup-migration.e2e.test.ts` | Other STARTUP_ONLY migration | — | Out Of Scope (pattern only) | — | None |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E-001 | Studio upgrade: removed once, one PTM, byte preservation, restart no-op | AC-002, AC-003, AC-006; SCN-002 | `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | No test drives the real built Studio entry over the real record store and GraphQL |
| E-002 | Studio FAILED window → restart retry; old run listed, readable, continue fails; other run works; `@` candidates | AC-004, AC-008, AC-009; SCN-003, SCN-004, RU-001 | same file | AC-008 is otherwise untested. AC-004 has only in-process mock-rm proof today. |
| E-003 | Fresh install: no folder, SKIPPED, remaining built-ins installed, restart | AC-001, AC-005; SCN-001, SCN-006 | same file | Built-entry proof of AC-001/AC-005 |
| E-004 | Standalone host first: failure never blocks, then removal; catalog in host; Studio sees the shared record | AC-002, AC-004, QR-001; RU-002 | same file | QR-001 requires both entrypoints |
| FX-001 | Frozen beta installed copy | design §2 item 3 (source shape) | `tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/` | Representative source bytes with provenance |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts build` | worktree root | Dist from `62af418df`; AC-001 built-in smoke | Pass | `api-e2e-evidence/r-001-build.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/built-in-agents tests/unit/app-data-migrations tests/unit/agent-collaboration tests/integration/app-data-migrations/remove-built-in-project-task-manager-startup.integration.test.ts --no-watch` | worktree root | Unit + integration | Pass (70 files, 581 tests) | `r-002-server-focused.log` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts --no-watch` | worktree root, current dist | E-001..E-004 | Pass (4/4); negative control (migration unregistered in dist) 4/4 fail as expected | `e-001-004-final.log`, `negative-control-unregistered.log` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects --no-watch` | worktree root, current dist | AC-007 | Pass (4 files, 21 tests) | `r-003-projects-e2e.log` |
| 5 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools/project-tasks tests/unit/agent-tools/task-delegation --no-watch` | worktree root | AC-007 | Pass (11 files, 170 tests) | `r-004-projects-unit.log` |
| 6 | `pnpm -C autobyteus-web test:nuxt utils/agents utils/collaborators stores/__tests__/runHistoryStore.spec.ts --run` | worktree root | AC-009 mirror; history fixture | Pass (4 files, 57 tests) | `r-005-web.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are four multi-restart process cases, plus temporary probes. The process cases are long-running and could be interrupted.
- Canonical ledger path: `api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | AC-001..AC-009 proven through both built entrypoints. AC-008 at API level: history list, projection, WS continue → `RUN_NOT_FOUND` "AgentDefinition with ID autobyteus-project-task-manager not found.", other run continues. | AC-010 belongs to Delivery | — |
| Changed-boundary execution directness | 95% | Real process start/stop, real SQLite record store, GraphQL/WS | — | — |
| Cross-boundary integration realism and mock gap | 88% | Only inference is emulated | The old history and installed copy were produced by the new build in the FAILED window and from a frozen fixture, not by a real beta build | TMP-001 cross-version upgrade |
| Environment, configuration, identity, and fixture fidelity | 92% | Owned HOME/DB/package root; fixture from base blobs with sha256; real EACCES failure | Fixture-to-real-install equality is not proven | TMP-001 byte comparison |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | FAILED → RESTART_TO_RETRY, `canRetry=false`, manual run rejected, startup continues, retry → attempts 2, on both entrypoints; restart no-op | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | Web mirror, mention and history-store unit specs | UNK-001: the rendered history panel and continue failure for a run whose definition is gone are unseen; escalation trigger "breaking the history list or crashing the app" not proven at the UI | TMP-002 browser journey |
| Durable regression coverage quality and relevance | 95% | New 4-case E2E; negative control proves discrimination | — | — |

- Overall post-repository confidence: 91.4%
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `Yes` at API level. AC-008's user-facing presentation (UNK-001) is not yet proven.
- Any applicable category below `90%`: `Yes`. Category 3 is at 88% and category 6 at 80%.
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real beta-written data and the UI presentation of AC-008.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Lifecycle` (cross-version upgrade, TMP-001) + `Browser` (web-equivalent renderer, TMP-002)
- Specific confidence gap or residual risk addressed: category 3 (seeded vs real beta data) and category 6 (UNK-001 presentation; the design escalation trigger)
- Why the selected mode can materially improve confidence: TMP-001 makes the real old version write the folder and history. TMP-002 renders exactly what the user sees when reopening and continuing the old conversation.
- Expected confidence after the selected validation: ≥ 95%
- Browser-specific decision and rationale: Required. The web code is unchanged, but UNK-001 is explicitly a UI question, and the escalation trigger names the history list and app stability.
- Result: both Pass. Final confidence 95.7%. See `api-e2e-execution-coverage-report.md`.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron (`autobyteus-web`)
- Testing guideline, README, or development instructions used: `TESTING.md` "Choosing the path"; `autobyteus-web/tests/e2e/github-skill-sources-probe.mjs` pattern (free-port Nuxt + built backend + Chrome)
- Web-equivalent behavior: history panel, conversation view, composer, error rendering
- Shell-specific or lifecycle behavior: none changed. The embedded server uses the same `dist/app.js` startup, which is proven directly.
- Chosen validation approach and why it fits the project: a web-equivalent browser against an owned built backend. An isolated desktop instance adds no proof for unchanged shell code.
- Server/frontend setup when browser validation is used: owned built backend (free port) + `nuxt dev` (free port, `BACKEND_NODE_BASE_URL`) + headless Chrome
- Effect on any already-running desktop application: `None`. The user's AutoByteus processes were left untouched.
- Behavior not directly proven and confidence consequence: the packaged shell restart. Its effect on confidence is negligible because no shell code changed.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-001 | Base-commit worktree build plus new dist on one owned data dir; emulated LM Studio | SCN-002/SCN-004 with real beta-written folder and history | A durable test cannot depend on a second historical build |
| TMP-002 | Nuxt dev frontend against an owned backend from TMP-001; headless browser | UNK-001 UI presentation | Unchanged web code; a one-time confirmation of existing behavior |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| SCN-007, PREM-001 | Unsupported/Contrived | None | None |
| AC-010 docs | Delivery owns it at docs sync | Low | Delivery |
| Packaged Electron upgrade from a released installer | Startup uses the same server entry; no shell change | Low | None |

## Ambiguities Or Reroute Triggers

None at investigation time. The design escalation trigger (AC-008 worse than "not found") is watched in E-002 and TMP-001/TMP-002.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one E2E file and one fixture folder added)
- Post-repository confidence: 91.4% (final 95.7% after broader validation)
- Broader validation decision: `Required`, executed (TMP-001 + TMP-002 Pass)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: No user app/data is used. All roots are `mkdtemp` under the OS temp directory and are removed by the test.
