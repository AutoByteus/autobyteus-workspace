# API/E2E Coverage Investigation — autobyteus-460

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence
scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-002 … SR-004)
- Design Spec (required on every route): `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts: `evidence/claude-skill-hot-reload-probe*`, `follow-ups.md`
- Design Review Report: `design-review-report.md` (round 3, ARCH-REV-003 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (baseline)
- Current Investigation Round: 1
- Trigger: code review pass (CRR-001) of `codex/running-agent-config-reload-460` at `c7685b20c6`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

A running agent (standalone, Team member, delegated copy; six runtimes) whose definition gains or loses a skill hears
it once ("now available" with description and absolute `SKILL.md` path / "no longer available"), busy now or idle with
its next input, and an added skill is usable at once (REQ-001…004, REQ-007). An added skill is also set up on the
runtime as at run start (REQ-008): links in `.claude/skills`, `.codex/skills`, `.grok/skills`, `.dsh/skills`, held by
the run's single holder `RunWorkspaceSkills` and released at run end; Antigravity links into its per-run capsule and
rewrites `manifest.json` (kept for resume); native has no prompt change. An added integration skill whose access the
run does not hold gets the sentence "access starts when this run is restarted"; nothing is granted mid-run (REQ-005,
QR-002). A resumed run hears what changed since its seen record (REQ-006, DEC-002). Removal is a message only
(DEC-007). Claude preparation always creates `<workspace>/.claude/skills` (SR-004) so the CLI lists a skill linked
mid-run.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (add, idle and with the agent following the skill), SCN-002 (remove), SCN-003
  (GitHub added to a run without access), SCN-004 (GitHub removed from a run with access), SCN-005 (resume after a
  change).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-01 Package-file entry surface: the user edits the agent package's `agent-config.json` on disk (SCN-001's second
    entry surface), not the agents page. Trigger: a file write in the agent's package folder → package feed reload →
    `AgentDefinitionChangeSignal`.
  - RU-02 Stop between the save and the message (SCN-005 variant the reviewer named): a save lands while the run is
    idle, the user stops the run before writing, then writes. Trigger: GraphQL save, `terminateAgentRun`, WebSocket
    message.
  - RU-03 Save while stopped on Antigravity: its restore does not re-link (FU-002), so the notice alone carries the
    path. Trigger: save after `terminateAgentRun`, then a message.
  - RU-04 GitHub skill removed and added back on a run that already holds the pass: the notice must not claim that
    access starts at restart (DS-004 negative). Trigger: two saves on the agents page.
  - RU-05 A Claude run without auto-execute that started with zero skills uses its `Skill` tool after a mid-run add
    (design Risk AR-003; approval answered by the user in the web).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): C-04 (a save within the
  seconds a run is prepared), C-05 (AGY stop and resume within one add) from the code review.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 added skill: setup then notice | Added | REQ-001/002/008, DS-001, DS-003 | Live per runtime: link in the runtime folder before the input, notice text, agent follows the skill |
| BEH-002 removed skill: notice only | Added | REQ-003, DEC-007 | Live: notice text; link kept until run end |
| BEH-005 integration added: access at restart | Added | REQ-005, DS-004 | Real proxy + real GitHub: sentence present, no variables in the running process, grant after restart |
| BEH-006 integration removed: per-call refusal + told | Preserved + Added notice | REQ-003, AC-007 | Real proxy: 403 `INTEGRATION_NOT_ALLOWED` and "no longer available" notice |
| BEH-008 resumed run hears changes since its record | Changed (seeding removed) | REQ-006, DEC-002 | Live: stop between save and message; scripted AGY: save while stopped |
| Run workspace links: one holder, release at run end | Changed (ownership moved) | DS-003, AR-001 | Live: link released at terminate per runtime; repository race tests (reused) |
| Claude `.claude/skills` created at preparation | Added (SR-004) | DI-001 | Live zero-skill Claude: `Skill` tool lists the added skill (IMP-13 reused; rerun with the extended file) |
| BEH-003 tools, BEH-004 content notices | Preserved | REQ-007 | Existing scripted E2E + repository suites |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Notice service pass, tracker, diff, builder | Unit + integration (IMP-05) | Real definition-change signal from the package feed | Server E2E (scripted runtime) |
| API / transport / contract | Yes | GraphQL save → notice on the agent WebSocket; backend `applyDefinitionSkills` | IMP-06/13 live (native, Claude) | Codex, Grok, DeepSeek, AGY backends never ran live | Gated live suite per runtime |
| Frontend component / state | No (card unchanged; label from header/sender) | — | `SystemTaskNotificationSegment.spec.ts` | Body text is new | Existing web spec |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | Yes | Integration pass read (no grant); Claude approval without auto-execute | Credential-proxy unit (IMP-05) | Real pass registry and proxy; real CLI approval | Real proxy + real GitHub (scripted AGY); live Claude |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Link held from preparation to release; stop/resume; AGY capsule kept | Holder race tests, IMP-11 mutation | Real runtime process ends, restores | Live suite + scripted AGY |
| Persisted-data transition | Yes (semantics only) | `seen_skill_versions.json` read on restore without seeding | Integration case (IMP-05) | Real restored run | Live stop/resume step |
| Worker / queue / distributed coordination | Yes | Team member, delegated copy tracked | Integration AC-009 | Real team and delegation runs | Scripted AGY through the real server |
| External integration | Yes | Runtime CLIs' skill folders; GitHub through the proxy | IMP-06/13 for Claude | Codex/Grok/dsh folder links on real CLIs; real GitHub | Live suite; real GitHub |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/running-agent-config-reload-460`
- Project type and runtime stack: pnpm monorepo; Node 22 (server), TypeScript, Fastify/GraphQL/WebSocket; runtime CLIs
  `claude` 2.1.323, `codex` 0.169.0, `grok` 1.0.77, `agy` 1.5.8 (host), `dsh` 0.2.2-rc.1 (temporary install, below).
- Project testing guideline path(s): `TESTING.md` (repository root); no closer `TESTING*.md` under `autobyteus-server-ts`.
- Conflicting, missing, or unclear project instructions: none. `dsh` needs Node 24.9+ and is not installed on the host:
  installed from npm into `/tmp/ab460-ext/dsh-npm` and run by `/tmp/ab460-dsh-bin/dsh` (`/opt/homebrew/bin/node`
  v25.2.1), as the DeepSeek ticket's API/E2E did.
- Changed build-input paths: `None` (`git diff --name-only 7b8bcf932f...HEAD` matches none of the guideline's
  build-input paths). No fresh-start build case.
- Required environment variables or secrets available: `Yes` — test vault READY with `provider.openai.api-key`,
  `provider.deepseek.api-key`, `test.github.token`; Claude, Codex and Grok host logins.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, gates, vault, CLI isolation, one heavy run at a time | Server unit/integration commands; gated `RUN_*` suites; temp `CODEX_HOME`/`GROK_HOME` with an auth symlink; `agy` without a token file only on the host login (adds to the user's history); Codex model `gpt-6.1-terra` |
| `AGENTS.md` | Vault use | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`; never `.env` keys |
| `tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` header | The implementation's live suite | `RUN_LIVE_SKILL_DEFINITION_E2E=1`, `LIVE_SKILL_DEFINITION_RUNTIMES` |
| `tests/e2e/runtime/skill-update-notice-live.e2e.test.ts` | Pattern for temp Codex/Grok homes and stop/continue | Same socket continues a stopped run |
| `tests/e2e/runtime/deepseek-harness-live.e2e.test.ts` | dsh live setup | `DEEPSEEK_HARNESS_COMMAND`, vault key through the relay, `deepseek-v4-flash` low |
| `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`), `agy-shell-env-probe-cli.mjs` | Scripted AGY | `READ_SKILLS`, `ECHO_INPUT`, `DELEGATE:`; shell probe of the AGY process env |
| `tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | GitHub integration import/connect pattern | `importIntegrations`, `connectIntegration` with `test.github.token` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server | `autobyteus-server-ts` | `startStudioE2eRuntimeServer` (inside each suite) | Temp app-data root per suite | GraphQL answers | `fastify.close()`, temp root removed by the suite |
| Runtime CLIs | — | Started by the server per run | Codex/Grok under temp homes | `--version` gate | `terminateAgentRun`; suite cleanup |
| dsh | `/tmp/ab460-ext` | npm install (done) | Node 25 via wrapper | `dsh --version` → `0.2.2-rc.1` | Remove `/tmp/ab460-ext`, `/tmp/ab460-dsh-bin` at the end |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Probe skills (`codeword-probe`, `anchor-skill`) | Written into the suite's temp app-data `skills/` | No user data | Temp root removed |
| GitHub integration | Temp integration folder imported by `importIntegrations`; connected with `test.github.token` | Token revealed only in the connect request; never printed | `disconnectIntegration`, temp root removed |
| Agents, Teams, runs | Public GraphQL | Test-owned data root | Removed with the root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (`seen_skill_versions.json`).
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff
  "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: a record written by a run before a stop (the same writer)
  is read on restore under the new rule: names added since are announced, names removed are announced.
- Evidence planned: the live stop/resume step (API-06) and the scripted AGY save-while-stopped step (API-05a) on records
  the product wrote itself; the integration case "a restored run hears…" (reused, IMP-05).
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/integration/skill-update-notices/skill-update-notice-service.integration.test.ts` | Notice pass, AC-001…AC-010 | All ACs | Still Valid | IMP-05, read | Reuse IMP-05; rerun in API-03 |
| `tests/unit/agent-execution/backends/shared/run-workspace-skills.test.ts`, `mid-run-workspace-skills.test.ts`, `agent-run-apply-definition-skills.test.ts` | Holder add/release ordering per runtime | AR-001, AR-002, AC-011/012 | Still Valid | IMP-03, IMP-11, IMP-12 | Reuse; rerun in API-02 |
| `tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` | Live native + Claude add/remove | AC-001/002/003/011 | Needs Update | IMP-06, IMP-13 | Extend: Codex, Grok, DeepSeek; stop between save and message; Claude without auto-execute |
| `tests/e2e/runtime/agy-skill-update-notice-transport.e2e.test.ts`, `agy-skill-update-notice-roots.e2e.test.ts` | Content notices on AGY, Team, Org, delegated copy, restore | BEH-004, REQ-007 (preserved) | Still Valid | Read: no assertion on the removed restore seeding | Run (API-04) |
| `tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` | AGY capsule links at run start, Team, delegation | DS-003 (AGY capsule) | Still Valid | Read | Run (API-04) |
| `tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | Package-private skills; edited by the implementation | REQ-008 (run-start links) | Still Valid | Changed in the diff | Run (API-04) |
| `tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts` (+ `github-skill-runtime-harness.ts`, edited) | GitHub skill sources at run start | DS-003 holder move | Still Valid | Changed in the diff | Run (API-04) |
| `tests/e2e/runtime/skill-update-notice-live.e2e.test.ts` | Live content notices | BEH-004 | Still Valid | Its paths are covered by the scripted AGY notice suites and integration | Not rerun live (cost); covered by API-04 + API-02/03 |
| `tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts` | Proxy shells; skill removed → 403, added again → 200 | BEH-006 | Still Valid | Read | Not rerun: the new AGY GitHub case (API-05c) drives the same proxy calls plus the notice |
| `autobyteus-web/components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` | Card label "Skill updated" from sender or header | AC-001 web card | Still Valid | Header and sender unchanged | Run (API-08) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-011, AR-001/002, QR-001/002 | Repository focused suites, typecheck | Reused | IMP-01, IMP-03, IMP-05, IMP-10, IMP-11, IMP-12 | IMP-12 ran on `c7685b20c6`; the others on `07d5d69b30`, and `git diff --name-only 07d5d69b30 c7685b20c6` touches only the Claude bootstrapper, its test and a doc, which those suites do not exercise (IMP-12 reran the Claude ones) |
| API-02 | all | Server unit suite, whole | Existing Test | `pnpm -C autobyteus-server-ts test:unit` at low load | IMP-02 never had a whole green run after its fixes |
| API-03 | all | Server integration suite, whole | Existing Test | `pnpm -C autobyteus-server-ts test:integration` at low load | IMP-04 had 8 load timeouts; only reruns passed |
| API-04 | BEH-003/004, DS-003 | Real server + scripted AGY; package and GitHub skill E2E | Existing Test | `vitest run` the five E2E files in the inventory (scripted AGY command) | Regression of preserved notices and run-start links after the holder move |
| API-05a | AC-012 (AGY), AC-001, AC-003, AC-008, RU-01, RU-03 | Real server, scripted AGY, real capsule | Durable | New `agy-skill-definition-changes-transport.e2e.test.ts`: add → capsule link + manifest, `ECHO_INPUT` notice, `READ_SKILLS`; package-file edit removes; stop; save while stopped; message → kept link/manifest, one notice | No AGY test of mid-run capsule adds through the server |
| API-05b | AC-009 | Real server, Team member + delegated copy (scripted AGY) | Durable | Same file: Team with coordinator and worker; coordinator `DELEGATE` to `/worker`; save worker's skills; both hear their own notice and get their own capsule link | Integration covers fakes only |
| API-05c | AC-006, AC-007, RU-04, QR-002 | Real credential proxy, real GitHub, scripted AGY shell probe | Durable | Same file, gated by `RUN_GITHUB_PROXY_E2E=1` + vault token: run without GitHub; add skill → sentence, no variables; stop + message → variables, issue 200; remove → 403 + notice; add back → 200, no sentence | AC-006 end to end was never run |
| API-06 | AC-001, 002, 003, 008, 011, 012 (Codex, Grok, DeepSeek), RU-02 | Real server, real runtimes and models | Durable (update) | Extended live suite, one run per runtime: claude_agent_sdk, autobyteus, codex_app_server, grok_build, deepseek_harness | Live AC-012 per runtime; stop between save and message |
| API-07 | AR-003, R-001 (RU-05) | Real Claude CLI without auto-execute | Durable (update) | Same file, Claude case with `autoExecuteTools: false`: observe approval requests, approve, Skill tool loads the skill | Design asks API/E2E to observe it |
| API-08 | AC-001 (web card) | Web component | Existing Test | `pnpm -C autobyteus-web exec vitest run components/conversation/segments/__tests__/SystemTaskNotificationSegment.spec.ts` | Card label path for the notice |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-05a/b/c | `autobyteus-server-ts/tests/e2e/runtime/agy-skill-definition-changes-transport.e2e.test.ts` | Mid-run capsule adds, Team/delegated tracking and the integration sentence through the real server, without model cost; reusable for every future change of this path |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-06, API-07 | `autobyteus-server-ts/tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` | Runtimes Codex, Grok, DeepSeek with their skill folders and isolated homes; a stop-between-save-and-message step with link release and re-link; a Claude case without auto-execute | Gate unchanged |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: each suite starts its own in-process Studio server on a temp app-data root. One live
  suite at a time; no live run during the unit or integration suite.
- Environment choices: temp `CODEX_HOME` and `GROK_HOME` with auth symlinks; real `HOME`, `USER`, `LOGNAME` for the
  signed-in CLIs; `DEEPSEEK_HARNESS_COMMAND=/tmp/ab460-dsh-bin/dsh`; vault for native and DeepSeek; scripted AGY via
  `ANTIGRAVITY_CLI_COMMAND`.
- Health / readiness checks: CLI `--version` gates; GraphQL answers; `CONNECTED` frame.
- Seed data / fixtures: probe skills and the GitHub integration folder in the temp root.
- Test identities: host CLI logins; GitHub test token from the vault.
- Requirement-linked journeys: API-05a/b/c, API-06, API-07.
- Evidence to capture: per-runtime JSON (steps, notices, tool calls, link checks), vitest output with headers.
- Owned processes and temporary state to clean up: runs terminated by the suites; temp roots; the dsh temp install.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A real Antigravity model following an added skill | No `antigravity-oauth-token` file: a live AGY run uses the user's host login and writes into their `agy` history (TESTING.md). AC-012 for AGY is a server-side capsule fact, proven with the scripted CLI that reads the capsule as AGY does; AC-002 requires native and Claude | Low: the notice text and path are the same on every runtime | No | None |
| Whether Codex, Grok, DeepSeek list a mid-run link in their own skill list (U-001) | Not required (Non-Goals); observed where the run's tool calls show it | None to acceptance | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one added, one updated)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: API-02 and API-03 run first, one at a time; the live cases after them.
