# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec (required on every route): `.../design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts: `.../probes/agy-symlink-skill-probe.py`, `.../probes/agy-skill-scan.mjs`, `.../probes/app-log-excerpt-2026-10-01.txt`, `.../probes/agy-linked-skills-implementation-probe.mjs`, `.../implementation-evidence/` (probe-evidence.json, L01–L04 screenshots, logs, agy-production-live)
- Design Review Report: `.../design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-001 Pass, 9.4/10)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: `code_reviewer` pass handoff CRR-001 (Medium / High)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: Round 1

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed` (architecture review ARCH-REV-001 + code review CRR-001)
- Successful-output route: `Code Review` (proportional test-code review of the changed durable test code)
- Proportional test-code review decision: `Required` (durable E2E test and fixture code is added/updated)

## Current Requirement And Design Basis

AGY links each resolved skill into its private capsule (`<memoryDir>/agy-project/.agents/skills/<name>` → real skill folder). It no longer walks, copies or fingerprints skill folders (REQ-001/002). Request strength comes from skill scope. Under ALL_INSTALLED an unusable skill is skipped with a warning. Under CONFIGURED it fails the run with `AgentCreationError("Antigravity could not use skill '<name>': <reason>.")`. Unresolved names keep warn-skip (REQ-003, REQ-006, AR-001). Every AGY run, whether new, resumed, standalone, team or org member, or delegated, launches with `--dangerously-skip-permissions`, and the factory requires `permission_mode: always-proceed`. The stored `autoExecuteTools` value is ignored (REQ-004 server side). Every web launch/config surface shows auto-approve on, locked and explained for AGY (REQ-004 UI, AC-007). Restore unlinks and warns for a skill whose source is gone. Pre-change copied capsules restore through the same reader (REQ-005, `Directly Usable — No Migration`).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005, SCN-006.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 (from CRR-001 focus 2 and the ARCH-REV-001 escalation trigger): a team member with a CONFIGURED skill fails on AGY when a user sends to the member through the team WebSocket. The member readiness-failure path (`ConfiguredAgentExecutionHandle` `readiness_failure`) must keep the skill and reason.
  - SCN-A2 (AC-006 non-UI entry): an AGY coordinator calls `delegate_task` through the real AutoByteus agent-tools MCP server, as a real AGY agent does via the capsule `mcp_config.json`. The delegated AGY member is configured with `autoExecuteTools:false`.
  - SCN-A3 (CRR-001 SCN-R1 / CF-03): a run launched with stored `autoExecuteTools:false`, as from a form seeded by a pre-change run. The server must still launch with skip-permissions.
  - SCN-A4 (AC-001 real data): Chat on AGY with the user's real `browser-automation` skill folder, the incident skill with its real `.venv`. It is read through an isolated backend's `AUTOBYTEUS_SKILLS_PATHS`. The user's app and `~/.autobyteus` data are not used.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None recorded upstream. CF-04 (an imported skill with an unsafe declared name) has no evidenced supported trigger, so it is not tested live. The unit coverage of `unsafe_name` remains.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 skill exposure = directory link | Changed | REQ-001/002, DS-001 | Prove through the real server and a CLI process whose cwd is the capsule (fake CLI reads through the link) and through the real `agy` (live) |
| BEH-002 named unusable skill → `AgentCreationError` | Changed | REQ-003/006, AR-001 | Prove the chat/WS error text for a standalone run and a team member |
| BEH-003 ALL_INSTALLED skip | Changed | REQ-003, AC-004 | Prove the run starts, the skipped skill is absent, the other skill is linked, and a warning is logged |
| BEH-004 AGY always skip-permissions; locked UI | Changed | REQ-004, AC-006/007 | Prove CLI argv for standalone, team, org and delegated runs with stored `false`, plus resume; render team/org/member/mobile UI |
| BEH-005 restore tolerance | Changed | REQ-005, AC-008/009 | Resume through the real server after deleting the source; resume a copied-capsule run |
| BEH-006 error surfacing | Changed | REQ-006 | Assert the WS error text names the skill and reason, and does not contain the generic text |
| Detailed resolver / fingerprint / copier / provenance | Removed | Removal Plan | `git grep` absence (checked by code review); suites still compile and pass |
| Non-AGY runtimes' auto-approve and skill exposure | Preserved | QR-002 | Existing Codex/Claude bootstrapper unit tests; web "switch runtime → editable" checks |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | linker, capsule create/restore, factory, stream argv | Unit tests (linker, capsule, factory, stream process) | Mocked factory collaborators; no real server path | Fake-CLI server E2E (durable) |
| API / transport / contract | Yes | GraphQL create run + WS `SEND_MESSAGE` → `ACTIVATION_FAILED` text; team/org WS readiness failure | None for the new behavior (impl live probe L03 standalone only) | Team-member error wrapping (ARCH-REV-001 trigger) | Fake-CLI server E2E (durable) |
| Frontend component / state | Yes | lock helper + 7 surfaces | Component specs (183 tests) | Real rendering of team/org/member/mobile | Browser dev-path (real backend) |
| Browser integration / user journey | Yes | Chat composer, launch forms | Impl live probe L01/L02/L04 (chat + existing-run editor) | New-run team/org/member/mobile not rendered | Browser dev-path |
| Authentication / session / permissions | Yes (CLI permission mode) | `--dangerously-skip-permissions` always | Stream-process unit argv test | Real CLI permission behavior with linked folders | Live `agy` (RUN_AGY_*, AGY_LIVE, live Chat) |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer | As above | — | Browser dev-path (web-equivalent) |
| Desktop shell / Electron-specific integration | No | — | — | — | None |
| Process / lifecycle | Yes | Restore of linked/copied capsules; argv on `--conversation` | Capsule unit tests | Real server restore path (terminate → send) | Fake-CLI server E2E + live restore suite |
| Persisted-data transition | Yes | Capsule symlinks vs copied dirs; stored `autoExecuteTools:false` | Capsule unit legacy test | Real server restore of a copied capsule | Fake-CLI server E2E (legacy-shaped capsule) |
| Worker / queue / distributed coordination | Partly | Team/org member activation, delegated child activation | None for AGY + stored `false` | Delegation entry | Fake-CLI server E2E using the real MCP server |
| External integration | Yes | `agy` CLI 1.2.14 symlink discovery (ASM-001) | Impl live L02, AGY_LIVE test | User's real skill set | Live Chat (browser + real agy) + RUN_AGY_* suites |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve` (branch `codex/agy-linked-skills-always-auto-approve` @ `e5edfafdf`)
- Project type and runtime stack: pnpm monorepo; Fastify/TypeGraphQL server (`autobyteus-server-ts`, Vitest); Nuxt 3 renderer + Electron (`autobyteus-web`, Vitest + playwright-core probes); AGY runtime = installed `agy` CLI 1.2.14 at `~/.local/bin/agy`.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/TESTING.md` (root; no closer `TESTING*.md` exists).
- Conflicting, missing, or unclear project instructions: `pnpm -C autobyteus-server-ts typecheck` fails on a pre-existing `rootDir` issue. `npx tsc -p tsconfig.build.json --noEmit` is used instead, as in the implementation handoff.
- Required environment variables or secrets available: `Yes` for AGY (logged-in `agy` CLI; no AutoByteus vault secrets needed).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Root testing guideline | Server: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; AGY fake CLI: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; AGY live: `RUN_AGY_E2E` / `RUN_AGY_CAPABILITY_E2E` / `RUN_AGY_BACKGROUND_E2E` / `RUN_AGY_RECOVERY_E2E`; renderer: web unit + browser dev-path probe; never the user's app/data; stop what you start |
| `autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts` | In-process real server for E2E | `startStudioE2eRuntimeServer()` with `appConfigProvider.config.setCustomAppDataDir(<tmp>)` |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY CLI | Case selected by `AGY_FAKE_CASE`; inherits server env |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs`, ticket `probes/agy-linked-skills-implementation-probe.mjs` | Real backend `dist/app.js` + Nuxt dev + headless Chrome pattern | Owned temp data root, free ports, sanitized env, process-group stop |
| `autobyteus-server-ts/src/skills/services/skill-service.ts:493` | Skill roots | `<appData>/skills` plus `AUTOBYTEUS_SKILLS_PATHS` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process server (E2E) | `autobyteus-server-ts` | Vitest file | Temp app-data dir, port 0 | `startStudioE2eRuntimeServer` resolves | `fastify.close()`; `rm` temp dir |
| Fake AGY CLI | — | `ANTIGRAVITY_CLI_COMMAND=<abs fixture>` | Spawned by server per run | `init` event | Server stops the process on terminate |
| Real backend `dist/app.js` (broader) | `autobyteus-server-ts` | `node dist/app.js --data-dir <owned>` on a free port | Owned temp data root | HTTP 200 on `/graphql` | SIGTERM process group; `rm` owned root |
| Nuxt dev (broader) | `autobyteus-web` | `nuxi dev` on a free port with the backend URL env | — | HTTP 200 | SIGTERM process group |
| Headless Chrome | — | playwright-core with `/Applications/Google Chrome.app` | — | — | `browser.close()` |
| `agy` CLI (live) | — | installed | Real model calls (`gemini-3.8-flash-low`) | `agy models` | Run termination |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Skills with `.venv` outside link, dangling link, 40 MiB sparse file, sibling marker | Create the skill via GraphQL `createSkill`, then add the env files on disk the way a skill launcher would | Temp app-data only | Removed with the temp dir |
| Workspace-owned skill (`<ws>/.agents/skills/<name>`) | On-disk folder in a temp workspace | Temp | Removed |
| Agents (ALL_INSTALLED / CONFIGURED), team, org definitions | GraphQL `createAgentDefinition` / `createAgentTeamDefinition` / `createAgentOrgDefinition` | Temp | Deleted / temp dir removed |
| Legacy copied capsule | Replace the new run's capsule link with a real copied folder (the pre-change byte layout; same manifest) | Temp | Removed |
| User's real skill set (SCN-A4) | Read-only `AUTOBYTEUS_SKILLS_PATHS=/Users/normy/autobyteus_org/autobyteus-skills` for an owned backend | Not app data. The prompt only reads `SKILL.md`. The source is checked unchanged after the run (`git status`) | Nothing created in the source |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: (a) a pre-change capsule whose `.agents/skills/<name>` is a copied real folder with the unchanged manifest shape and stored `autoExecuteTools:false` must resume through the normal reader. (b) A post-change linked capsule whose source was deleted must resume, and its link must be removed with a warning.
- Evidence planned: E07 and E08 through the real server (terminate → WS send → restore → CLI started with `--conversation` and skip-permissions); the existing capsule unit tests.
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `server/tests/unit/agent-execution/backends/antigravity/agy-configured-skill-linker.test.ts` | Link only; `.venv`/dangling/40 MiB; shared-folder relative link; ALL_INSTALLED skip; CONFIGURED messages per reason | AC-001..005 | Still Valid | Code review read + rerun | Keep |
| `.../agy-run-capsule.test.ts` | Create with links; cleanup keeps source; restore missing source; copied capsule restore | AC-002, AC-008, AC-009 | Still Valid | — | Keep |
| `.../agy-agent-run-backend-factory.test.ts` | Stored `false` create/restore → `always-proceed` required | AC-006 | Still Valid | — | Keep |
| `.../agy-stream-process.test.ts` | argv always has skip-permissions (new/resumed) | AC-006 | Still Valid | — | Keep |
| `.../agy-production-live.test.ts` (AGY_LIVE) | Real agy reads a linked capsule skill | AC-002, ASM-001 | Still Valid | — | Run live |
| `server/tests/unit/skills/**` | Regular bindings; provenance removed | Removal Plan | Still Valid | — | Run |
| `server/tests/fixtures/agy-failure-cli.mjs` | Scripted CLI; **always** reports `permission_mode: always-proceed` regardless of argv | AC-006 | Needs Update | It cannot detect a missing skip-permissions flag, so every fake-CLI suite would pass even if the flag regressed | Make `permission_mode` follow argv (the real CLI reports `always-proceed` only with the flag). Add a `linked_skills` case and an argv log |
| `server/tests/e2e/runtime/agy-*-transport.e2e.test.ts`, `agy-native-image-*` (fake CLI) | AGY stream conversion through the real server | Regression | Still Valid | — | Run with the updated fixture |
| `server/tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts` | Updated by implementation for link semantics | AC-002 | Still Valid | — | Run |
| `RUN_AGY_*` live suites (`agy-team-inter-agent-roundtrip`, `agy-runtime-stop-recovery-live`, `agy-background-task-*-live`, `agy-native-image-app-chat`, `agy-restore-live`, `agy-mcp-team-live`) | Live AGY regression | Regression, ASM-001 | Still Valid | — | Run |
| Web specs: `agentRunRuntimeDraftPolicy.spec.ts`, `ChatApprovalToggle.spec.ts`, `MobileLaunchRunOptionsCard.spec.ts`, `AgentRunConfigForm.spec.ts`, `TeamScopeConfigEditor.spec.ts`, `MemberOverrideItem.spec.ts`, `AgentOrgRunConfigPanel.spec.ts`, `chatLaunchService.spec.ts` | Locked display/submit per surface | AC-007 | Still Valid | — | Run |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E01 | Chat-shaped ALL_INSTALLED AGY run, stored `false`, skill with `.venv` outside link + dangling link + 40 MiB sparse file; CLI reads `SKILL.md` + sibling through the capsule link; argv has skip-permissions; capsule entry is a dir link to the realpath; nothing written to workspace; source survives terminate | AC-001, AC-002, AC-006, QR-001 | `autobyteus-server-ts/tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` | The real-server path (GraphQL → WS → manager → factory → capsule → CLI) has no deterministic coverage. The unit tests mock the factory collaborators |
| E02 | ALL_INSTALLED with one workspace-owned skill → run starts, skipped skill not linked, other linked, warning | AC-004, BEH-003 | same file | Same |
| E03 | CONFIGURED standalone naming an unusable skill → WS error names skill + reason, no generic text | AC-005, REQ-006, SCN-006 | same file | Same |
| E04 | Team member CONFIGURED failure → team WS surfaces skill + reason | REQ-006, ARCH-REV-001 trigger (SCN-A1) | same file | Escalation trigger had no coverage |
| E05 | Team + org members with `autoExecuteTools:false` → skip-permissions, accepted init | AC-006 | same file | Non-standalone entries uncovered |
| E06 | Delegated AGY child (via real MCP `delegate_task`) with `autoExecuteTools:false` → skip-permissions | AC-006 (SCN-A2) | same file | Agent-initiated entry uncovered |
| E07 | Resume linked run after deleting skill source → resumes; link removed; warning; `--conversation` + skip-permissions | AC-008, AC-006 resume | same file | Real restore path uncovered |
| E08 | Resume pre-change copied capsule with stored `false` → resumes; copied folder untouched | AC-009 | same file | Real restore path uncovered |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| F01 | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | `permission_mode` follows `--dangerously-skip-permissions`. Add an optional argv log (`AGY_FAKE_ARGV_LOG`). Use the `--conversation` id when given (`linked_skills` case). Add a `linked_skills` case: READ_SKILLS report, real MCP `delegate_task` call, default `OK` | AC-006; realism | Existing cases keep their behavior because the server now always passes the flag |
| F02 | `TESTING.md` AGY fake-CLI row | Mention the new suite only if needed. The command pattern already covers `tests/e2e/runtime/<file>` | — | Likely no change |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R1 | `npx tsc -p tsconfig.build.json --noEmit` | server | Source compiles | Pass | console |
| R2 | `pnpm exec vitest run tests/unit/agent-execution/backends/antigravity tests/unit/skills --no-watch` | server | Unit layer | Pass (21 files / 277 tests) | console |
| R3 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture> pnpm exec vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts --no-watch` | server | E01–E08 | Pass (8/8; flag-removal mutation detected 7/8) | `api-e2e-evidence/R3-R4-fake-cli-suites.log` |
| R4 | Same env: `agy-failure-transport`, `agy-background-task-transport`, `agy-mcp-tool-call-transport`, `agy-native-image-step-output` | server | Fake-CLI regression with updated fixture | Pass (5 files / 17 tests incl. R3) | same |
| R5 | Web specs (policy, chat, mobile, workspace config, chatLaunchService) | web | AC-007 component layer | Pass (33 files / 290 tests) | `api-e2e-evidence/R5-web-specs.log` |
| R6 | `AGY_LIVE=1` unit live files; `RUN_AGY_CAPABILITY_E2E`, `RUN_AGY_E2E`, `RUN_AGY_BACKGROUND_E2E`, `RUN_AGY_RECOVERY_E2E` suites | server | Live AGY regression, ASM-001 | Pass. The `agy-mcp-team-live` pre-existing evidence-path `ENOENT` passed 2/2 on rerun with the folder created temporarily | `api-e2e-evidence/R6-*.log`, `R6-summary.txt` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are multiple independent server E2E cases, long-running live AGY suites and browser journeys, so there is a real risk of interruption.
- Canonical ledger path: `.../api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | E01–E08 prove AC-001/002/004/005/006/008/009 through the real server. Live production-live proves the linked skill on real `agy` | AC-001 not on the user's real skill set; AC-007 team/org/member/mobile only in component specs | B01 live Chat with real skills; B02–B04 rendered |
| Changed-boundary execution directness | 94% | Real GraphQL/WS/manager/factory/capsule; CLI process with the capsule as cwd | — | — |
| Cross-boundary integration realism and mock gap | 90% | Live suites pass with real `agy`; fake CLI argv-faithful and mutation-checked | AGY's own discovery of the user's real skill folders | B01 |
| Environment, configuration, identity, and fixture fidelity | 88% | Fixture mirrors the incident `.venv` shape | Real skill set; legacy capsule is shape-equivalent | B01 (real skills) |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | E03/E04/E07/E08; live restore/recovery | — | — |
| User-surface, browser, and desktop-shell confidence | 82% | Component specs; impl L01/L04 (chat + existing-run editor) | New-run team/org/member/mobile not rendered | B02–B04 |
| Durable regression coverage quality and relevance | 90% | New suite + fixture; mutation-proven | — | — |

- Overall post-repository confidence: 90% (simple average 89.9%)
- Every critical acceptance criterion directly proven: `Yes` for REQ-001/002 through E01 + live production-live, though not yet on real data
- Any applicable category below `90%`: `Yes` (fixture fidelity 88%, user surface 82%) → broader validation required
- Default clean-confidence target of `95%` met: `No` (before broader validation)
- Material residual risks: real-data AC-001; rendered AC-007 surfaces.

Final scores after broader validation are in `api-e2e-execution-coverage-report.md` (95.3%, no category below 90%).

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` (real backend `dist/app.js` + Nuxt dev + headless Chrome) with `Live API` (installed `agy`)
- Specific confidence gap or residual risk addressed: (1) AC-001 on the user's real skill set (ASM-001, real `.venv`); (2) AC-007 rendered new-run team, org, member-override and mobile surfaces, which so far have only component specs; (3) CF-02, the chat footer explanation affordance.
- Why the selected mode can materially improve confidence: It exercises the real renderer and the real CLI permission and symlink behavior that fake-CLI and component tests cannot.
- Expected confidence after the selected validation: ≥ 95%.
- Browser-specific decision and rationale: Required. AC-007 is a rendered-UI criterion and the gap is specifically "not rendered".
- If `Not Required`: N/A.
- If `Blocked`: N/A.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer and an embedded server.
- Testing guideline used: `TESTING.md` "Choosing the path".
- Web-equivalent behavior: all changed UI (launch forms, chat composer) and all server behavior.
- Shell-specific or lifecycle behavior: none changed (no main/preload/IPC/packaging changes in the diff).
- Chosen validation approach and why it fits the project: browser dev-path against a real backend build, because the change is renderer- and server-only. An isolated desktop instance would add an app build without exercising any changed shell boundary.
- Server/frontend setup when browser validation is used: owned temp data root, free ports, sanitized environment, the same pattern as `chat-entry-live-probe.mjs`.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: packaged-app skill-path defaults, which are unchanged by this diff. No consequence.

## Live Environment And Fixture Plan

- Startup order and commands: `pnpm -C autobyteus-server-ts build` (if `dist` is stale) → `node dist/app.js` (owned data dir, free port) → `nuxi dev` (free port, backend URL) → headless Chrome.
- Environment choices that materially affect the run: `AUTOBYTEUS_SKILLS_PATHS` points at an owned skills folder for the fixture cases and at `/Users/normy/autobyteus_org/autobyteus-skills` (read-only) for SCN-A4; `ANTIGRAVITY_CLI_COMMAND` is unset (real `agy`).
- Health / readiness checks: GraphQL `runtimeAvailabilities` / model catalog for `antigravity_cli`; Nuxt HTTP 200.
- Seed data / fixtures: agent/team/org definitions via GraphQL; workspace temp folder.
- Test identities, authentication, permissions, or session state: logged-in `agy` CLI (user's CLI auth; not AutoByteus data).
- Requirement-linked journeys or scenarios: B01 live Chat with the real skill set (AC-001, ASM-001); B02 team new-run form + member override with AGY (AC-007); B03 org new-run panel with AGY (AC-007); B04 mobile launch card with AGY at a phone viewport (AC-007); B05 switching runtime restores the editable control on those surfaces.
- Evidence to capture: DOM/ARIA state (aria-checked, disabled, help text), backend log lines, run metadata, capsule `readlink`, screenshots (supporting only).
- Owned processes and temporary state to clean up: backend and Nuxt process groups, Chrome, the owned temp root.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| B01–B05 | Ticket probe `probes/agy-api-e2e-browser-probe.mjs` (real backend + Nuxt + Chrome + real `agy`) | AC-001 live on real data; AC-007 rendered surfaces | Depends on a logged-in `agy`, real model calls, the user's local skills checkout and Chrome. The repository already holds the durable equivalents (component specs + fake-CLI E2E). It is kept as a ticket probe for reproduction |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Other `agy` CLI versions (ASM-001) | Only 1.2.14 is installed | Future CLI changes | Live suites catch it on upgrade (accepted RSK) |
| CF-04 unsafe declared names under CONFIGURED | No supported trigger is evidenced | Low | None (unit-covered) |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (add E01–E08 suite; update fake CLI fixture)
- Post-repository confidence: 90% (two categories below 90%)
- Broader validation decision: `Required` → executed → final 95.3%, Pass
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: Execution-time revisions are recorded in the execution report's "Investigation And Execution Basis" section: the desktop `prepareAgentRun` entry, E05 as the Org case, and B04 pairing through a mapped private host name.
