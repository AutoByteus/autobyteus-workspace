# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/agent-semantic-memory/requirements-doc.md` (Approved, SR-004)
- Investigation Notes: `investigation-notes.md` (AF-01..AF-26)
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec (required on every route): `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts: `semantic-memory-prompt-contract.md` (behavior-defining, SR-004); `follow-ups.md`
- Design Review Report: `design-review-report.md` (Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (from `/software_engineering_team/code_reviewer`)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

All ticket documents live in `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/`. Code: worktree `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory`, branch `codex/agent-semantic-memory`, source commits `785ff7c95`, `0fa12575c`, `7e5f90d7f` on base `origin/personal` `f78b60ddd`.

## Current Requirement And Design Basis

An agent definition may set `semanticMemoryEnabled` (off by default; `agent-config.json` for a user's own agent and for a package declaring it, a personal setting `SEMANTIC_MEMORY` when the app changes it for a package or built-in agent). For an enabled agent the server owns `<memory dir>/semantic/<encodeURIComponent(definition id)>`, creates it when a run is prepared, and the composed instructions of every run (standalone, team member, delegated copy, any Project, any runtime) end their shared part with the exact §2 section of the prompt contract. Codex `workspace-write` gets the folder as `sandbox_workspace_write.writable_roots` (one object with `network_access` when the run has integration variables); Claude gets it as `additionalDirectories`; Grok, AGY and native AutoByteus need no change; the DeepSeek harness asks a sandbox escalation (FU-007). Agents without the setting are unchanged byte for byte (no section, no folder, no Codex key). Turning it off keeps the folder and documents; on again gives the same folder. GraphQL exposes `semanticMemoryEnabled` and `semanticMemoryPath`. Memory page, memory search and memory sync ignore `memory/semantic`.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001, SCN-002, SCN-003, SCN-004, SCN-005. SCN-006 (concurrent writes) is an accepted risk with no mechanism (DEC-006): nothing to test.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-002a Codex with auto-execute off (`workspace-write` + `on-request`): the agent writes its memory without an approval; a write elsewhere outside the workspace still needs one (proves the sandbox is real and only the agent's own folder was added, QR-002). Trigger: a chat message to a Codex run created with `autoExecuteTools: false`.
  - SCN-002b Codex with auto-execute off and integration variables (the agent has an imported integration's skill): the shell reaches the loopback credential proxy and writes the memory in the same run (both flags in one `sandbox_workspace_write`). Trigger: as SCN-002a, agent with the `github-integration` skill.
  - SCN-002c Claude with auto-execute off: reading and writing the semantic folder asks the same approvals as the same operations in the workspace, no more (REQ-006 "same approval policy").
  - SCN-003a A team-local agent with the same local name as an enabled shared agent, enabled in its team's file `agent-config.json` (package-declared setting reads as on, AC-006/AC-007 alternate).
  - SCN-004a The renderer's own GraphQL documents drive the switch (the app's save and reset path).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 instructions section | Added (on) / Preserved (off) | REQ-004/005/008/009, contract §1–§5 | Capture the instructions each real runtime receives; byte-exact paragraph; absent for off |
| BEH-002 setting + personal setting + GraphQL + web | Added | REQ-001/002, DEC-012, AC-007 | GraphQL journeys with the renderer's documents; file and personal-settings assertions |
| BEH-003 folder creation, never deleted | Added | REQ-003/007, AC-008 | Folder exists after run prep; survives off/on; none for disabled |
| BEH-004 identity by definition | Added | REQ-004, AC-004, AC-006 | Team member, delegated copy, team-local distinct folder |
| BEH-005 runtime write access | Changed (Codex, Claude) / Preserved (others) | REQ-006, QR-002 | Real-runtime writes per runtime; Codex thread config captured on the wire |
| Codex integration builder no longer emits `sandbox_workspace_write` | Removed (moved) | design Removal plan | Real run with integration variables keeps network access |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | owner, layout, config read/write, personal settings, composer | IMP-02 unit tests | none material | — |
| API / transport / contract | Yes | GraphQL fields/inputs/enum | converter unit test, IMP-07 codegen, IMP-08 probe | real HTTP GraphQL with the renderer's documents, files on disk | Server E2E (in-process studio server) |
| Frontend component / state | Yes | switch, detail | IMP-04, IMP-08 | — (reused) | — |
| Browser integration / user journey | Yes (small) | form/detail | IMP-08 browser probe | none beyond IMP-08 | reuse IMP-08 |
| Authentication / session / permissions | Yes | runtime sandbox/permissions (Codex writable roots, Claude dirs) | unit tests on config shapes; IMP-09 CLI sandbox | app-server honoring `writable_roots`; Claude approval behavior | Live runtime E2E |
| Desktop renderer / web-equivalent UI | Yes (small) | as browser | IMP-08 | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | run create/restore preparation per backend | backend unit tests | real start paths of team member and delegated copy | Server E2E with scripted AGY + live runs |
| Persisted-data transition | Yes | optional field in two JSON files | unit tests | real files after GraphQL saves | Server E2E |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Codex app-server, Claude SDK/CLI, Grok ACP, AGY CLI, Anthropic (native) | unit tests with fakes | everything real | Live runtime E2E |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory`
- Project type and runtime stack: pnpm monorepo; Node 22 server (`autobyteus-server-ts`, Fastify + type-graphql), Nuxt/Electron web; runtimes Codex app-server, Claude Agent SDK, Grok Build (ACP), Antigravity CLI, native AutoByteus.
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md`.
- Conflicting, missing, or unclear project instructions: TESTING.md pins live Codex to `gpt-6.1-terra`; the model is chosen from the runtime catalog with that pin first. `pnpm` exists only through `corepack` here (shim `pnpm` → `corepack pnpm` on `PATH`, as the implementation did).
- Changed build-input paths: `autobyteus-web/generated/graphql.ts` (codegen output; matched `autobyteus-web/generated/**`). Fresh-start build case planned (API-FS).
- Required environment variables or secrets available: Test vault READY with `provider.anthropic.api-key` only; `test.github.token`, DeepSeek key missing. Signed-in `codex` (0.167.0), `claude` (2.1.322), `grok` (1.0.77), `agy` (1.5.4, `antigravity-oauth-token` present). `dsh` not installed. LM Studio reachable at `host.docker.internal:1234`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | layers; clean env `env -i PATH HOME TMPDIR`; real HOME/USER/LOGNAME for signed-in CLIs; throwaway `CODEX_HOME` with `auth.json` link; AGY scripted CLI `tests/fixtures/agy-failure-cli.mjs` + `RUN_AGY_FAILURE_E2E=1`; vault via `AUTOBYTEUS_TEST_VAULT`; one heavy run at a time; fresh-start build rules |
| `AGENTS.md` | Repo instructions | vault path; never read keys from env |
| investigation notes AF-03 | Codex `workspace-write` always allows `/tmp` | live data dir must be outside `/tmp` |
| `tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` | Pattern for multi-runtime live suites | gates `RUN_CLAUDE_E2E`, `RUN_CODEX_E2E`, `RUN_GROK_E2E`; model choice via `chooseLiveModel` |
| `tests/e2e/helpers/collaboration-root-harness.ts` | Scripted AGY roots | `promptOf(runId)` = the composed prompt in the AGY capsule; `calls()` drives real tools (`delegate_task`) |
| `tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | Integration import fixture | grants depend on imported integration + skill, not on a token (`integration-access-rule.ts`) |
| `src/runtime-management/codex/client/codex-app-server-launch-config.ts` | `CODEX_APP_SERVER_COMMAND` | a test-owned wrapper can record the JSON-RPC the server sends to the real app-server |
| `src/runtime-management/claude/client/claude-sdk-executable-path.ts` | `CLAUDE_CODE_EXECUTABLE_PATH` | a test-owned wrapper can record the argv/stdin the SDK sends to the real `claude` |
| `test-support/test-vault/live-server-vault.ts` | Live vault for in-process servers | `initializeLiveServerVault()` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process studio server | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside the suites | own data dir, free port | GraphQL answers | `app.close()`; data dir removed |
| Scripted AGY CLI | — | `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`, `AGY_FAKE_CASE=linked_skills` | no inference | capsule written | process ends with run |
| Codex app-server (real) via recorder wrapper | — | `CODEX_APP_SERVER_COMMAND=<suite-written wrapper>` under throwaway `CODEX_HOME` | paid inference, cheap model | thread started | runs terminated; temp home removed |
| Claude CLI (real) via recorder wrapper | — | `CLAUDE_CODE_EXECUTABLE_PATH=<wrapper>` | host login (real HOME) | session started | runs terminated |
| Grok Build, AGY live, native AutoByteus (Anthropic via vault) | — | gates | paid inference | — | runs terminated |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Enabled/disabled user agents | `createAgentDefinition` (renderer document) | test-owned data dir | removed with the data dir |
| Package agent | local package folder + `importAgentPackage(LOCAL_PATH)` | package folder owned by the test | removed |
| Team (shared member), team-local agent | `createAgentTeamDefinition`; file team in `<data>/agent-teams/` | — | removed |
| Projects A/B | `createProject` | — | removed |
| Integration (no token) | `importIntegrations` of a local `github` folder | no token connected; proxy answers without GitHub | removed |
| Live data root | `$HOME/.autobyteus-e2e/semantic-memory-live-*` (outside `/tmp`, AF-03) | test-owned folder; never `~/.autobyteus` | removed in `afterAll` |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec § Persisted Data / State Transition Decision; handoff § Persisted Data Transition Check
- Representative existing-data setup and required behavior: a package `agent-config.json` without the field reads as off; one with `true` reads as on; a user agent's `agent-config.json` written by base-shaped saves gains the key only when on and loses it when off, keeping other fields; `personal-settings.json` gains the field only when it differs from the package.
- Evidence planned: API-07, API-08 (files read back after real GraphQL saves).
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| Server unit tests added/extended in IR-001 (`agent-semantic-memory.test.ts`, `semantic-memory-prompt-section.test.ts`, `codex-sandbox-workspace-write-config.test.ts`, backend tests, personal-settings tests, converter test, config test) | owner, contract text, config shapes, write forms | AC-005..AC-008 unit level, QR-001..003 | Still Valid | IMP-02 on `0fa12575c`; no source change since | Reuse (API-R1) |
| Web specs `AgentDefinitionForm.semanticMemory.spec.ts`, `AgentDefinitionDetailSections.semanticMemory.spec.ts` | switch and detail | AC-007 component | Still Valid | IMP-04 | Reuse (API-R2) |
| Ticket probe `probes/semantic-memory-ui-probe.mjs` | browser journey of form/detail | AC-007 | Still Valid (ticket-owned temporary probe) | IMP-08 | Reuse (API-R3) |
| `tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` | composed prompt of real roots equals approved views (agents without the setting) | AC-005 (preserved instructions) | Still Valid | composer callers pass `semanticMemoryPath: null` for disabled agents | Run (API-05b) |
| `tests/e2e/personal-settings/package-personal-settings.e2e.test.ts` | personal settings of package definitions at the server boundary | REQ-002 (existing four settings, update capture now with the field) | Still Valid | personal-settings service changed | Run (regression, API-09) |
| `tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | Codex `workspace-write` network access via the integration builder | the moved `network_access` | Still Valid, but its cells need `test.github.token`, missing in the vault | — | Replaced for this ticket by API-14 (no token needed) |
| `tests/e2e/memory/memory-explorer-graphql.e2e.test.ts`, `memory-search-graphql.e2e.test.ts`, `memory-sync/memory-sync-api.e2e.test.ts` | run tooling over run folders | AC-001 (not listed) | Still Valid, Out Of Scope for change | scanners unchanged | Covered by the new suite's API-10 against a real data dir |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-005..AC-008 unit, QR-001..003 | server units | Reused | IMP-02 | no `src`/test change since `0fa12575c` (only ticket docs) |
| API-R2 | AC-007 component | web specs | Reused | IMP-04 | as above |
| API-R3 | AC-007 browser | form/detail in Chromium | Reused | IMP-08 | as above |
| API-R4 | REQ-006 Codex sandbox mechanism | Codex CLI sandbox | Reused | IMP-09 | as above |
| API-01 | AC-007, REQ-001/002 | GraphQL (renderer documents) + user agent file | Durable | new `tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` (ungated part): create off → read (`false`, path null) → update on → `agent-config.json` has `"semanticMemoryEnabled": true` + other fields kept → path → off → key removed | real HTTP + files |
| API-02 | AC-007, DEC-012 | GraphQL + package files + `personal-settings.json` | Durable | same file: import local package; on → personal record, package files byte-identical, `personalSettings` lists it; `resetAgentPersonalSetting(SEMANTIC_MEMORY)` → off; package `agent-config.json` with `true` reads on | real HTTP + files |
| API-03 | AC-005, REQ-008, QR-003 | scripted AGY run, composed prompt | Durable | same file (`RUN_AGY_FAILURE_E2E`): disabled agent run under Project A: prompt has no `Semantic Memory`, ends with the Project section; no `memory/semantic` folder | real run start path |
| API-04 | AC-001 | scripted AGY run | Durable | enabled agent under Project A: prompt ends with Project section + `\n\n` + exact §2 section with `<data>/memory/semantic/<id>`; folder exists; not inside workspace; equals GraphQL `semanticMemoryPath` | real run start path |
| API-05 | AC-003, AC-004 | scripted AGY: Project B run, shared team member, delegated copy | Durable | same path in each run's prompt; member section is the last; delegated copy via real `delegate_task` | real member/delegation start paths |
| API-05b | AC-005 | existing collaboration prompt suite | Existing Test | `RUN_AGY_FAILURE_E2E=1 … collaboration-prompt-wording.e2e.test.ts` | approved complete views unchanged |
| API-06 | AC-006, AC-007 alt | scripted AGY: file team with team-local agent of the same local name, `agent-config.json` `semanticMemoryEnabled: true` | Durable | member prompt path `…/team-local-agent%3A<team>%3A<name>`, differs from the shared one | real team-local start path |
| API-07 | AC-008, REQ-007/009 | scripted AGY + GraphQL | Durable | doc in the folder; off → new run: no section; folder + doc unchanged; on → new run: same path; doc unchanged | real runs |
| API-08 | REQ-007 | GraphQL delete | Durable | delete the enabled user agent → folder and doc remain | real delete path |
| API-10 | AC-001 (not listed) | Memory page GraphQL, memory search discovery, memory sync scanner | Durable | with semantic folders present: `listAgentsWithMemory`/`listAgentRunsWithMemory` show only runs; `MemoryRunDiscovery.findRuns()` has no run under `semantic/`; `LocalMemoryExportScanner.scan()` has no file under `semantic/` | real components over a real data dir |
| API-09 | REQ-002 regression | existing package personal settings suite | Existing Test | `package-personal-settings.e2e.test.ts` | personal settings service changed |
| API-11 | AC-002 (Codex), AC-001, AC-003 | real Codex app-server, auto-execute off | Durable (gated) | new `tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts`, `RUN_CODEX_E2E=1`: Project A run writes a document (path only from instructions); wire `thread/start` has the §2 paragraph and `sandbox_workspace_write.writable_roots=[folder]`, sandbox `workspace-write`, no approval request; a write elsewhere outside the workspace asks an approval (denied, file absent); Project B run reads it back | the risk named by design and review |
| API-12 | AC-005 (Codex) | real Codex app-server | Durable (gated) | disabled agent: wire `thread/start` `config` keys exactly `["mcp_servers"]`, no section; no `memory/semantic` | real thread config |
| API-13 | AC-004 (Codex) | real Codex team member | Durable (gated) | shared member of a team reads the document; wire has same path | real member path |
| API-14 | AC-002 (Codex + integration) | real Codex app-server, integration variables | Durable (gated) | agent with semantic memory + imported `github` integration's skill (no token): one turn writes memory and curls `$AUTOBYTEUS_GITHUB_API_URL` (HTTP code from the proxy, not `000`); wire `sandbox_workspace_write` = `{network_access: true, writable_roots: [folder]}`; no approval request | key-merge risk |
| API-15 | AC-002, AC-003 (Claude) | real Claude SDK/CLI, auto-execute on | Durable (gated) | `RUN_CLAUDE_E2E=1`: write, read back under Project B; CLI argv has `--add-dir <folder>` and the §2 paragraph | real Claude |
| API-16 | AC-002 (Claude auto-execute off) | real Claude, approvals | Durable (gated) | auto-execute off: approval requests for read+write in the semantic folder equal those for the same operations in the workspace; approving them writes the file | REQ-006 same policy |
| API-17 | AC-002, AC-003 (native AutoByteus) | real native runtime, Anthropic via vault | Durable (gated) | `RUN_AUTOBYTEUS_SEMANTIC_MEMORY_E2E=1` + vault: provider request system prompt has §5.1 order (Project → Semantic Memory → Working Environment); write and read back | real native |
| API-18 | AC-002, AC-003 (Grok) | real Grok Build | Durable (gated) | `RUN_GROK_E2E=1`: write and read back | as far as installed |
| API-19 | AC-002, AC-003 (Antigravity live) | real `agy` | Durable (gated) | `RUN_AGY_E2E=1` (throwaway HOME with copied token): write and read back; capsule prompt has the section | as far as installed |
| API-20 | AC-002 alternate (DeepSeek harness) | dsh | Not Tested (evidence) | `command -v dsh`; vault status (DeepSeek key missing); docs line | dsh not installed |
| API-FS | build input `autobyteus-web/generated/graphql.ts` | fresh clone | Temporary Probe | fresh clone, `pnpm install --frozen-lockfile`, web `typecheck` + `codegen:check`-equivalent read; desktop packaging needs macOS runner | release-runner parity for the changed build input |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01..API-08, API-10 | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` | GraphQL journeys and the real run start paths (standalone, Project, team member, delegated copy, team-local) with the composed prompt, without inference; regression net for the composer wiring of every start path |
| API-11..API-19 | `autobyteus-server-ts/tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts` | Only real runtimes prove the sandbox/permission behavior (REQ-006); gated per runtime |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: each suite starts its own in-process studio server on a test-owned data dir. Live suite root under `$HOME/.autobyteus-e2e/` (AF-03), workspaces as siblings of the data dir (never containing it).
- Environment choices that materially affect the run: `env -i PATH HOME USER LOGNAME TMPDIR`; throwaway `CODEX_HOME` with an `auth.json` link; recorder wrappers for Codex and Claude written by the suite into its root; `AUTOBYTEUS_TEST_VAULT` only for the native case.
- Health / readiness checks: `runtimeAvailability`, model catalog.
- Seed data / fixtures: definitions, Projects, team, integration folder created through GraphQL; file team written before server start.
- Test identities: launch owner credential via the studio helper.
- Journeys: as Planned Cases.
- Evidence to capture: wire captures (instructions and thread config excerpts), files on disk, reply texts, approval events; suite logs with headers.
- Owned processes and temporary state to clean up: runs terminated, servers closed, data roots removed, throwaway homes removed.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| DeepSeek harness write with auto-execute off (AC-002 alternate) | `dsh` not installed; no DeepSeek key in the test vault | write needs an escalation approval (documented, FU-007) | No (needs dsh + key on a machine) | FU-007 stands |
| Windows path form (§5.3) | Linux machine | covered by unit test §5.3 | No | — |
| Desktop shell | not affected | — | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (two new suites)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: live runs use the cheapest models (Codex pin `gpt-6.1-terra` low effort, Claude haiku, Grok cheapest, AGY flash-low, native Anthropic haiku).
