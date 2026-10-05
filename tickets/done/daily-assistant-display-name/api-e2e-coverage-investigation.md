# API/E2E Coverage Investigation — daily-assistant-display-name

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/requirements-doc.md` (Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/solution-revision-record.md` (SR-003)
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/design-spec.md`
- Supplemental Task Artifacts: solution handoff `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/handoff.md`. Predecessor package `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/done/general-agent-identity/` is read-only; it supplies the v1 prompt base `general-agent-prompt.md`.
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (initial), direct API/E2E route
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (confirm with `get_handoff_rules`)
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The built-in default Chat agent `autobyteus-daily-assistant` must be displayed as **Daily Assistant** (REQ-001/AC-001). Its prompt self-introduction (line 7) must name Daily Assistant, and the template must be byte-identical to approved v1 apart from front-matter `name` and line 7. The resulting SHA-256 must be `49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7` (REQ-002/AC-002). There is no migration, reset or duplicate definition: existing app-data picks up the name through the startup refresh, existing runs stay usable, and historical snapshots are not rewritten (REQ-003/AC-003). Docs, comments and tests are aligned, and the role `General Agent` is kept (REQ-004/AC-004, D-3). The design's persisted-data decision is `Directly Usable — No Migration`. The spine is unchanged: template → `BuiltInAgentBootstrapper` → app-data `agent.md` → AgentDefinition/GraphQL → web, plus the runtime prompt.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001. The user updates or restarts the app, opens Agents or New Chat, and sees and talks to Daily Assistant. Existing runs and history are kept and are not relabeled.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 fresh install (trigger: first server start on an empty data root). Covered by chat-entry-live C01/C02.
  - SCN-A2 the user edits the built-in prompt or deletes its config, then restarts (trigger: server restart). Covered by chat-entry-live C13.
  - SCN-A3 upgrade from a beta.3–beta.5 install that holds real "General Agent" chat history (trigger: the new server starting on the same data root and DB). The user reopens and continues an old chat and starts a new chat. Covered by temporary upgrade probe U-01..U-05.
  - SCN-A4 the user asks the agent who it is (trigger: a chat message). This proves line 7 reaches the runtime prompt. Covered by U-05.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 display name (template `name`, registry `displayName`, GraphQL, web) | Changed | REQ-001, design DS-001 | Prove through GraphQL on a live built server and through the rendered Agents page/Chat. Durable unit + GraphQL e2e already updated |
| BEH-002 prompt line 7 / hash | Changed | REQ-002 | Hash/diff check, durable hash assertions, live C01 against `dist`, and a live runtime self-identification check |
| BEH-003 role/description/tools/skill scope/collaborator exclusion | Preserved | REQ-004, D-3 | Durable config-equality assertions, C01 tool/skillScope assertions, adjacent collaboration tests |
| Persisted app-data `agent.md` + run history `agentName` | Preserved (direct use) | REQ-003, design "Persisted Data" | Durable refresh test, plus a live upgrade from a real old-build data root |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes (content) | template + registry string consumed by bootstrapper | bootstrapper unit test | built `dist` template copy (build step copies templates) | Live API (built server) |
| API / transport / contract | Yes (value) | GraphQL `agentDefinition(s).name`, `instructions` | GraphQL e2e (in-process schema) | real HTTP server from `dist/app.js` | Live API |
| Frontend component / state | No code change (comments only) | name flows from definition data | component specs with fixture names | mocked definitions | Browser |
| Browser integration / user journey | Yes (rendered label) | Agents page, Chat, workspace tree | none live | whole rendered path | Browser (real Nuxt + real backend) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same as browser) | same renderer | — | — | Browser dev path |
| Desktop shell / Electron-specific integration | No | no shell code touched; the embedded server runs the same `dist` | — | — | None |
| Process / lifecycle | Yes | startup refresh on restart | bootstrapper + e2e refresh tests | real process restart | Live (C13, upgrade restart) |
| Persisted-data transition | Yes (direct use) | old app-data `agent.md`, history `agentName` | synthetic old-state fixtures | data produced by a real old build plus a real run | Live upgrade probe |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Indirect | runtime prompt to model (Codex) | none | prompt delivery to runtime | Live chat (U-05) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name` (branch `codex/daily-assistant-display-name`, HEAD `edeb5db9a`, base `6d4f16ef2`)
- Project type and runtime stack: pnpm monorepo; Node/TypeScript server (`autobyteus-server-ts`, Vitest, GraphQL, Prisma/SQLite); Nuxt web (`autobyteus-web`, Vitest, Playwright-core probes); Electron shell.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md` (identical in the worktree). No closer `TESTING*.md` exists under the changed packages.
- Conflicting, missing, or unclear project instructions: TESTING.md's "Server E2E (deterministic)" row names `pnpm test:e2e`. The focused per-file vitest form it documents is used instead, because only the built-in identity suites are affected.
- Required environment variables or secrets available: `Yes`. The Codex CLI is logged in (`codex login status` → ChatGPT); the chat-entry probe passes HOME through by design. No secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing guideline | Server tests: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`. Renderer: web unit + browser dev-path probe. Never use the user's app/data. Stop what you start. Assertions before screenshots |
| `AGENTS.md` (root) | repo instructions | follow DESIGN.md/TESTING.md |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` header | probe prerequisites | needs `pnpm -C autobyteus-server-ts build` and Chrome. It owns a temp data root, free ports, a sanitized env and cleanup. `--cases` adds prerequisite producers |
| `autobyteus-web/package.json` | scripts | `test:e2e:chat-entry-live` |
| implementation handoff "Environment" | setup | `pnpm install` done; `prepare:shared`, `prisma generate`, `nuxt prepare` done |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `pnpm prebuild && pnpm build` | copies templates into `dist/` | build exit 0 + bootstrap smoke | n/a |
| Backend | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <owned>` | SQLite in the owned root, `prisma migrate deploy` | `GET /rest/health` | SIGTERM to the owned process group |
| Frontend | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` | Nuxt dev | `GET /chat` 200 | SIGTERM to the owned process group |
| Browser | — | Chrome headless via playwright-core | 1440×900, en-US | page loads | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Fresh data root | chat-entry probe's own `mkdtemp` root | never `~/.autobyteus` | the probe removes it |
| Old-build ("General Agent") data root with a real chat | Upgrade probe: the backend runs the worktree `dist` with the two base-commit production files (`templates/daily-assistant/agent.md`, compiled registry) temporarily restored from `6d4f16ef2`, then sends one real Chat message through the UI | The base→HEAD production diff is exactly those files plus one comment (verified with `git diff --stat`). The originals are backed up and their hashes are re-verified after restoration | the temp root is removed; the dist files are restored and verified |
| Model | Codex `codex_app_server` (logged-in CLI) | real model calls (≈3 short messages) | none |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: a data root created by the old ("General Agent") build, with app-data `agent.md` named General Agent and one real run whose history row has `agentName: "General Agent"`. After the new server starts: the definition reads Daily Assistant, `agent.md` equals the new template, there is one definition at the same id, and the old row keeps `General Agent`. The old run reopens with its conversation and accepts a follow-up.
- Evidence planned: the durable bootstrapper/e2e refresh tests (synthetic old state) plus live upgrade probe U-01..U-04 (real old state).
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related REQ/AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` ("Daily Assistant (platform-owned)") | Creates the default at the stable id with `displayName` Daily Assistant and template hash `49ed6e90…`. Refreshes old "General Agent" app-data and keeps history byte-identical | AC-001, AC-002, AC-003 | Still Valid (updated by the implementation) | The old-state fixture now models the real previous state (General Agent → Daily Assistant), so the refresh assertion is meaningful | Run |
| `autobyteus-server-ts/tests/e2e/agent-definitions/general-agent-identity.e2e.test.ts` | Bootstrap → GraphQL name Daily Assistant, single definition, `APPROVED_SHA256` new hash, config equality, old-state refresh with a warmed reader | AC-001, AC-002, AC-003 | Still Valid (updated). The filename is kept per design | design-spec "Deferrals" | Run |
| `autobyteus-server-ts/tests/unit/agent-tools/agent-discovery/list-available-agents-tool.test.ts` | Discovery exposure; the fixture name is cosmetic | BEH-003 | Still Valid | — | Run |
| `autobyteus-server-ts/tests/unit/agent-collaboration/**` | Collaborator exclusion of built-ins by id | BEH-003 | Still Valid (id-keyed, unchanged) | the comment-only change in `collaborator-candidate-policy.ts` | Run as adjacent regression |
| web: `chatLaunchService.spec.ts`, `chatDraftStore.spec.ts`, `AgentWorkspaceView.spec.ts` (`New - Daily Assistant`), `ExistingRunConfigEditor.workspace.spec.ts`, `AgentDefinitionForm.spec.ts`, `AgentList.spec.ts` | Fixture name/title alignment | AC-001, AC-004 | Still Valid (updated) | names come from definition data | Run |
| `autobyteus-web/components/chat/**` specs | Chat composer/new-chat surface | AC-001 adjacent | Still Valid | untouched | Run as adjacent regression |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` C01/C02/C13 | Live fresh seed name/hash/tools/skillScope, landing defaults, restart lifecycle | AC-001, AC-002, AC-003 | Still Valid (C01 updated to new name/hash) | — | Run live |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Comment/message wording only | AC-004 | Still Valid (wording only) | `node --check` passes | Not run (behavior unrelated to the name) |
| `EventMonitorBrowseAssistantRow.spec.ts:52` "From General Agent:" | Derived from the unrelated sender address `/general_agent` | — | Out Of Scope | the fixture `senderAddress: '/general_agent'` | None |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Managed GitHub agent packages | — | Out Of Scope | unchanged vs base, no built-in name reference | Ran incidentally (same folder); see results |

## Durable Coverage To Add

None. The durable unit and GraphQL e2e suites already assert the name, hash, single definition, config equality and synthetic old-state refresh. The real old-build upgrade journey needs a model, two server builds and real chat state. That does not fit a deterministic repository test, so it runs as a temporary probe.

## Durable Coverage To Update

None beyond the implementation's updates, which were validated as `Still Valid` above.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-01 | `shasum -a 256 …/templates/daily-assistant/agent.md`; `diff tickets/done/general-agent-identity/general-agent-prompt.md <template>`; `git diff 6d4f16ef2 HEAD --stat` (production paths); `agent-config.json` diff | worktree root | AC-002 exact bytes; production diff scope | Pass: hash `49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7`; the diff is exactly lines 2 and 7; production diff = template, registry, 2 comment files; config unchanged | console (recorded in the execution report) |
| R-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/built-in-agents tests/unit/agent-tools/agent-discovery tests/e2e/agent-definitions tests/unit/agent-collaboration --no-watch` | worktree root | AC-001/002/003 durable server paths + adjacent regressions | Pass for scope: 22/23 files passed. The 1 failing file is out of scope (R-02b) | `api-e2e-evidence/server-focused-vitest.log` |
| R-02b | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts --no-watch` (isolated rerun after the build) | worktree root | incidental, out of scope | Fail 3/8, reproducible: the managed GitHub check/update cases get `GitHub repository not found or not public` (404). The file and `src/agent-packages` are unchanged vs base and have no built-in name reference. Classified as a pre-existing environmental failure unrelated to this change | `api-e2e-evidence/server-agent-packages-rerun.log` |
| R-03 | `NUXT_TEST=true pnpm exec vitest run <6 changed specs> components/chat` | `autobyteus-web` | AC-001 rendered title in a component, store defaults, list/form | Pass: 14 files / 83 tests | `api-e2e-evidence/web-focused-vitest.log` |
| R-04 | `git grep -n "General Agent" -- ':!tickets'` | worktree root | AC-004 | Pass: only the role value, documented history notes, old-state fixtures, and the unrelated `/general_agent` sender spec | console (recorded in the report) |
| R-05 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | worktree root | the build copies the new template into `dist`; bootstrap smoke | Pass (exit 0; "Built-in agents bootstrap smoke check passed") | `api-e2e-evidence/server-build.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are several independent live cases, including a multi-phase upgrade with real model calls and two backend lifecycles, so interruption risk is credible.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | AC-002 fully proven (bytes/hash). AC-001 is proven through the bootstrapper and in-process GraphQL. AC-003 is proven with synthetic old state. AC-004 grep is clean | AC-001 rendered label and AC-003 "existing runs remain usable" are not proven on a live stack | live C01/C13 + real upgrade journey |
| Changed-boundary execution directness | 85% | the real bootstrapper and GraphQL schema run against the src template | the built `dist` template and real HTTP server are not exercised | chat-entry C01 against `dist/app.js` |
| Cross-boundary integration realism and mock gap | 75% | GraphQL in-process is real | web specs use fixture definitions; no web↔server or runtime-prompt proof | browser + live chat |
| Environment, configuration, identity, and fixture fidelity | 80% | test-owned temp roots | the old state is synthetic, not produced by an old build | real old-build data root |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | refresh-on-start with a warmed reader; history byte-identical | real process restart not run | C13 + upgrade restart |
| User-surface, browser, and desktop-shell confidence | 70% | component title spec only | no rendered check | browser: Agents page, Chat, workspace tree |
| Durable regression coverage quality and relevance | 95% | the hash, name, single definition and meaningful old→new refresh are asserted at unit and GraphQL levels | — | — |

- Overall post-repository confidence: 83% (simple average of 85, 85, 75, 80, 90, 70, 95)
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `No`. AC-001 rendered and AC-003 existing-run usability are not yet proven live.
- Any applicable category below `90%`: `Yes`. Requirement proof, directness, integration, fixture fidelity and user surface are below 90%.
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: the rendered label on a live stack; upgrade of real old data and run usability; the runtime prompt carrying the new self-introduction.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` + `Browser` + `Lifecycle` (real built backend + Nuxt dev + headless Chrome; owned temp roots)
- Specific confidence gap or residual risk addressed: AC-001 rendered/live, AC-003 real upgrade and existing-run usability, BEH-002 prompt reaching the runtime.
- Why the selected mode can materially improve confidence: it runs the actual built `dist` template, HTTP GraphQL, the renderer, a real process restart and a real runtime on data produced by the old build.
- Expected confidence after the selected validation: ≥95%
- Browser-specific decision and rationale: required. The user-visible change is a rendered label, and no renderer code changed. One browser pass over the Agents page, Chat and workspace tree proves the data reaches the rendered surface.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the same Nuxt renderer and an embedded server built from the same `dist`.
- Testing guideline used: `TESTING.md` "Choosing the path"
- Web-equivalent behavior: everything in scope (server content + renderer display).
- Shell-specific or lifecycle behavior: none changed (no main/preload/IPC/packaging edits).
- Chosen validation approach and why: browser dev path against a real built backend. The shell adds nothing that reads the name.
- Server/frontend setup when browser validation is used: backend from `dist/app.js` on a free port with an owned data dir; Nuxt dev on a free port with `BACKEND_NODE_BASE_URL`.
- Effect on any already-running desktop application: `None` (free ports, owned temp roots, sanitized env; no isolated app or user data used).
- Behavior not directly proven and confidence consequence: packaged-shell rendering is not run. There is no shell code on the path, so this has no material confidence consequence.

## Live Environment And Fixture Plan

- Startup order and commands: (1) the server build (R-05). (2) `pnpm -C autobyteus-web test:e2e:chat-entry-live --cases C01,C02,C13 --output-dir <ticket>/api-e2e-evidence/chat-entry-live`. (3) Temporary upgrade probe `node <ticket>/api-e2e-evidence/upgrade-probe/upgrade-probe.mjs`. It backs up the two dist production files, writes the base-commit versions, runs the old phase, then restores the files and verifies the hashes before the new phase.
- Environment choices that materially affect the run: runtime `codex_app_server`, model `gpt-5.5` (falls back to the first listed model). SQLite via `prisma migrate deploy`. Sanitized env (HOME/PATH/USER/LANG/TMPDIR/SHELL/TERM).
- Health / readiness checks: `/rest/health`, Nuxt `/chat` 200, `chat-new` selector.
- Seed data / fixtures: chat-entry: its own skills/agents fixtures. Upgrade: no seeding. The old state is produced by the old build plus one real chat.
- Test identities, authentication, permissions, or session state: the Codex CLI ChatGPT login (read via HOME).
- Requirement-linked journeys: C01 (AC-001/002), C02 (Chat landing), C13 (AC-003 lifecycle), U-01..U-05 (AC-001/002/003, SCN-001).
- Evidence to capture: probe evidence JSON, GraphQL payloads, `agent.md` hashes, history index rows, DOM text/attributes, screenshots, backend logs.
- Owned processes and temporary state to clean up: backends, Nuxt dev, Chrome, temp data roots, the restored dist files.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| U-01 | old-build backend (base production files in `dist`) + Nuxt + Chrome; one real Chat send | real "General Agent" state: definition name, `agent.md`, history `agentName` | needs a real model and a doctored build; one-off upgrade from a specific old release |
| U-02 | restore the HEAD dist and restart the backend on the same root/DB | AC-001/002/003: name Daily Assistant, `agent.md` == new template (hash), single definition, old history row unchanged | same |
| U-03 | browser `/agents` | AC-001 rendered Agents page label | durable component specs already cover rendering from data |
| U-04 | browser: workspace tree + `/chat?id=<old run>`; follow-up message | AC-003: the old run keeps its captured label, opens with its conversation and is usable | needs a real model |
| U-05 | browser New Chat → send "what is your name" | AC-001 (new run captures Daily Assistant) + BEH-002 (the runtime prompt self-introduction) | needs a real model |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Packaged Electron shell rendering | no shell code on the path; the renderer and server are identical | negligible | none |
| `cross-scope-agent-mentions-live-probe.mjs` execution | only comment/message wording changed; behavior unrelated to the name | none | none |
| `agent-packages-graphql.e2e.test.ts` GitHub cases (3 failing) | out of scope; unchanged vs base; GitHub 404 | none for this change | note for delivery as pre-existing |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: 83%
- Broader validation decision: `Required` (Live API + Browser + Lifecycle)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: final results are in the execution coverage report. Outcome after broader validation: C01/C02/C13 and U-01..U-05 Pass; final confidence 96% (all categories ≥95%); result `Pass`. The plan was followed. The only deviation is that the Chat runtime resolved to `claude_agent_sdk`/`opus` rather than Codex, which is runtime-independent for this behavior.
