# API/E2E Coverage Investigation — cross-scope-agent-mentions

## Investigation Meta

- Requirements Doc: `tickets/in-progress/cross-scope-agent-mentions/requirements-doc.md` (Approved, SR-004)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-007)
- Supplemental Task Artifacts: `architecture-design-handoff.md`, `product-design-request-handoff.md`; approved UI/UX spec, VIS-001–014 and `ui-behavior-test-matrix.md` in `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions/`
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-003)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-003, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002` (round 2; API-REV-001 Fail, 86%)
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code review pass CRR-003 → API/E2E
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file, round 1

All ticket paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of changed durable test code)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

- REQ-001–012 / AC-001–014 (SR-004), DEC-U1, OQ-1 (mention also works from a child composer), OQ-2 (root settings snapshotted at attach), OQ-3 (application-owned runs excluded).
- Design SR-007: collaborator entries in Team, Org and a new standalone Agent root (`agent` root kind, lazy `memory/agents/<host>/collaboration/` package); admission in the root gate; `delegate_task` resolves configured placements then collaborators; `send_message_to` stays configured-only with a `delegate_task` hint; always-on `send_message_to`/`delegate_task` for eligible runs, `get_handoff_rules` only when `teamScoped`; `launchPurpose:"server_helper"`; Agent-root stream `/ws/agent-collaboration/:runId`, GraphQL stored view that never restores; explicit Stop cascades, host crash keeps the root; history delete/archive end a lingering root first (IR-003, CR-001/CR-002).
- UI: VIS-001–014 normative (menu, chips, inline mention, task rows product-wide, Team tab under standalone runs, red add-failure notice).
- Persisted data: `Directly Usable — No Migration`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SC-001–SC-008; UXJ-001–005; code-review RS-001–RS-006.
- Real-use scenarios added from the implemented behavior:
  - RU-01 First-turn tool exposure per runtime: a standalone run on AutoByteus, Codex, Claude, AGY and Grok (ACP) calls `delegate_task` before any mention → no run ID and the "bring one in with @" reason (AC-014). Trigger: the user asks the agent to delegate before mentioning.
  - RU-02 Same-definition second mention after a failed add reuses the same entry/address (AR-004). Trigger: the user retries the mention after the red notice.
  - RU-03 `send_message_to` to a collaborator address (agent follows the note literally) → hint, nothing created (BEH-012).
  - RU-04 Host crash (runtime process exits) then history Delete/Archive, with and without collaborators (RS-003, CR-001/002).
  - RU-05 A collaborator task Team coordinator following its handoffs by address (C-02 observation).
  - RU-06 Reopen an existing Team/Org run whose tree has no `collaborators` (old data, AC-013).
- Recorded as `Technically Possible but Unsupported/Contrived` (not tested): C-05 (restart racing client status), C-06 (concurrent delegation during ack), C-07 (edit model during crash window), C-10 (child wake racing Delete).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 `@` in live composers, server candidates | Added | REQ-001, AC-001/011 | Web unit + live browser in all 3 run kinds |
| BEH-002 mentions payload, admission, note, inline chip | Added | REQ-002, AC-002 | Contract/unit + live API + browser |
| BEH-003 delegation to collaborators, per-run authorization | Added | REQ-003/004, AC-003/004 | Integration + live API per runtime |
| BEH-004 brief as task notice, later messages in tab | Preserved | REQ-005, AC-005 | Live browser/API |
| BEH-005 stop/reopen/wake, crash keeps root, history cleanup | Added | REQ-006, AC-006, CR-001/002 | Unit + live lifecycle |
| BEH-006 Agent root (package, stream, GraphQL, context files) | Added | REQ-007, AC-007 | Unit + live |
| BEH-007 add-failure notice | Added | REQ-008, AC-008 | Unit + live browser with real failure |
| BEH-008 product-wide task rows | Changed | REQ-009, AC-009 | Web unit + live render |
| BEH-009 combobox semantics | Added | REQ-010, AC-010 | Web unit + live DOM |
| BEH-010 collaborator-aware context creation | Changed | REQ-011, AC-012 | Web unit + live |
| BEH-011 always-on tools, helper exclusion | Changed | REQ-012, AC-014 | Unit + live per runtime |
| BEH-012 collaborator-address message hint | Added | design DS-003 | Integration + live API |
| BEH-013 New chat `@`, old data | Preserved | AC-013 | Unit + live |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | roots, admission, policy, resolvers, Agent root | Unit + integration (fake runtimes) | Real runtime sequencing | Live API |
| API / transport / contract | Yes | SEND_MESSAGE `mentions`, new WS, GraphQL, REST refs | Contract + handler unit tests | Real client/server wiring | Live API + browser |
| Frontend component / state | Yes | menu, chips, stores, notice, rows | Web unit tests | Real stream data | Browser |
| Browser integration / user journey | Yes | UXJ-001–005 | Implementation render check (standalone, Claude only) | Team/Org/failure journeys never rendered live | Browser (real stack) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | same renderer | — | covered by browser run | Browser |
| Desktop shell / Electron-specific integration | No | no shell code changed | — | — | None |
| Process / lifecycle | Yes | Agent-root lifetime, stop/crash/restore, history cleanup | Unit (fake hosts) | Real runtime process exit and restore | Live lifecycle |
| Persisted-data transition | Yes | optional `collaborators`, `launchPurpose`, `hasCollaboration`, new package | Reader unit tests | Real reopen of old-shape trees | Live reopen |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | runtime tool exposure (Codex MCP, Claude SDK, AGY, Grok ACP, AutoByteus) | Unit per runtime (config shape) | AGY/ACP never exercised live | Live API per runtime |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions` @ `5dcc5dc82`
- Project type: pnpm monorepo; Fastify/GraphQL/WS server (`autobyteus-server-ts`), Nuxt web (`autobyteus-web`), contract packages; Electron shell not affected.
- Testing guideline: `TESTING.md` (root). No closer `TESTING*.md`.
- Conflicts / discrepancies: `pnpm typecheck` in the server has a pre-existing rootDir problem; `npx tsc -p tsconfig.build.json --noEmit` is the working path (handoff). Server tests need `pnpm prepare:shared` + `prisma generate` first. macOS has no `timeout` binary.
- Required environment/secrets available: Yes for CLI-login runtimes (codex, claude, agy, grok binaries logged in on this machine) and LM Studio (local, `qwen/qwen3.8-27b`, `google/gemma-4-31b`) for AutoByteus. No secret values recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers and rules | server tests via vitest; browser dev-path probes in `autobyteus-web/tests/e2e/`; real stack `pnpm dev` (8000/3000); never touch the user's app/`~/.autobyteus`; stop what you start |
| `README.md#local-full-stack-development` | Dev stack | `pnpm dev`; state under `<worktree>/.autobyteus/development/server-data/` |
| `autobyteus-server-ts/package.json` | scripts | `prepare:shared`, vitest |
| `autobyteus-server-ts/tests/e2e/runtime/*live*`, `codex-standalone-send-message-global-routing.e2e.test.ts`, `mixed-task-delegation.e2e.test.ts` | live runtime E2E patterns | in-process studio server (`startStudioE2eRuntimeServer`), temp data dir, gated by `RUN_*_E2E=1` |
| `implementation-evidence/render-check.mjs` | prior render check | playwright-core + system Chrome against `pnpm dev` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Dev stack (backend+frontend) | worktree root | `pnpm dev` | ports 8000/3000 (free); user app on 29695 untouched | launcher readiness line; GraphQL responds | Ctrl-C / kill owned PIDs |
| In-process studio server (live E2E) | `autobyteus-server-ts` | vitest with `RUN_*_E2E=1` | temp data dir per run | `startStudioE2eRuntimeServer` | `afterAll` close + rm |
| Headless Chrome | `autobyteus-web` | playwright-core, `/Applications/Google Chrome.app` | own profile | page loads | browser.close |
| Base worktree for comparisons | `/tmp/csam-base` | `git worktree add --detach /tmp/csam-base origin/personal` | read-only comparisons | — | `git worktree remove` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Shared Agent/Team/Org definitions | GraphQL `createAgentDefinition` / `createAgentTeamDefinition` / Org creation | dev data dir of this worktree only; unique names | runs terminated/deleted; definitions left in worktree dev data (owned, git-ignored) |
| Team / Org / standalone runs | GraphQL create mutations or UI | dev data only | terminated after use |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- References: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup: a stopped Team run and Org run whose tree files carry no `collaborators` key (the only shape difference from pre-branch files), plus standalone runs with no `launchPurpose`/`hasCollaboration`.
- Evidence planned: repository reader tests (`collaborator-tree-records.test.ts`, migration fixture tests) and a live reopen/continue of runs whose tree files were rewritten without `collaborators`.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| server `tests/unit/agent-run-collaboration/agent-run-collaboration-root.test.ts` | Agent root lazy package, stop cascade, crash survival, host wake | AC-006/007, DS-004/009 | Still Valid | reviewed CRR-003 | run |
| server `tests/unit/agent-collaboration/collaborators/collaborator-mention-admission.test.ts` | all-or-nothing, reuse, AR-004 | AC-001/011, AR-004 | Still Valid | — | run |
| server `tests/unit/agent-org-execution/agent-org-collaborators.test.ts`, team collaborator tests | Org/Team collaborators, resolver split | AC-003/004 | Still Valid | — | run |
| server `tests/integration/agent-tools/.../task-delegation-tool-lifecycle.integration.test.ts` | delegate_task lifecycle incl. collaborators, hint, no allocation | AC-003/004, BEH-012 | Still Valid | — | run |
| server `runtime-agent-tool-exposure.test.ts`, `autobyteus-runtime-tool-exposure.test.ts`, `standalone-agent-run-lifecycle-service.test.ts`, prompt snapshot | always-on tools, teamScoped, helper exclusion | AC-014 | Still Valid | config-level only | run; add live |
| server `run-history/collaborator-tree-records.test.ts`, catalog/termination tests | optional read / exact write; delete/archive after crash | AC-013, CR-001/002 | Still Valid | — | run |
| server `context-file-agent-collaboration-owner.test.ts`, `agent-collaboration-stream-handler.test.ts` | AR-002 context files; stream connect/host rejection | AC-006/012 | Still Valid | — | run |
| server `tests/e2e/runtime/all-runtime-send-message-matrix`, `mixed-task-delegation`, `codex-standalone-send-message-global-routing` (live) | existing messaging/delegation on real runtimes | preserved B-004 | Still Valid | gated | out of scope to rerun fully; standalone Codex routing rerun as regression |
| server deterministic e2e `tests/e2e/agent`, `agent-team-runs`, `agent-org-runs`, `run-history` | existing API behavior | AC-013 | Still Valid | — | run |
| contracts tests (3 packages) | mention note, DTOs | AC-002 | Still Valid (collab-stream `root-execution-view-dtos` 7 failures pre-existing, identical on base) | base run | run |
| web `AgentUserInputTextArea.runMentions.spec.ts`, `collaboratorMentionText`, `agentSourceSelectors`, `collaboratorAddFailures`, `agentRunCollaborationContext/Store` specs, row specs | menu, chips, parse, selectors, notice, Agent-root store, REQ-009 rows | AC-001/002/008/009/010 | Still Valid | — | run |
| web `tests/e2e/*` probes (existing) | unrelated journeys (two touched for a fixture field) | — | Out Of Scope | — | none |
| server `tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` | Error runtime listed active, terminated, history retained | preserved standalone Stop | Needs Update | fails only on branch: harness injects `lifecycleService: {}` but `terminateAgentRun` now calls `lifecycleService.terminateCollaborationRoot` first (design DS-004) | stub `terminateCollaborationRoot → false` (no root for a manager-owned Error runtime) |
| server `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` + `tests/fixtures/grok-acp/fake-acp-agent.mjs` | recorded Grok ACP replay through the real server | preserved Grok runtime; REQ-012 | Needs Update | fails only on branch with `ACP_MCP_SERVER_NOT_READY`; recordings predate always-on Agent Tools MCP for standalone runs; one assertion expects `mcpServers: []` (obsolete under REQ-012). Live Grok wire proves the real CLI reports `_x.ai/mcp/server_status: ready` | opt-in `FAKE_ACP_REPORT_MCP_READY=1` in the fake agent (reports ready for configured servers as the real CLI does); assertion updated to the Agent Tools entry |
| server `tests/skill-improvement/skill-improvement-improver-session-service.test.ts` | improver session activation | REQ-012 helper exclusion (improver named explicitly) | Needs Update (gap) | no assertion that the improver launches as `server_helper` | add `launchPurpose: "server_helper"` assertion |
| server `tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts`, `llm-management/gemini-3-8-catalog-http.e2e.test.ts` | unrelated | — | Still Valid | failed only inside the branch's full e2e run; pass in isolation on branch and base; base full-suite comparison run recorded in the execution report | none |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| LE-01 | Standalone run on each real runtime: first-turn `delegate_task` before a mention returns the reason; SEND_MESSAGE with `mentions` admits and delegates; child report reaches host and is recorded; collaborator-address `send_message_to` hint; another run cannot use the mention | AC-003/004/005/014, BEH-011/012, DS-001/002/009 | `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` (live, gated per runtime) | Only config-shape tests exist; AGY/ACP exposure is the design's escalation trigger and needs a repeatable real-runtime check |
| BR-* | Browser journeys UXJ-001–005, VIS-007, stop/reopen/wake | AC-001/002/005–012 | `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` + `test:e2e:cross-scope-agent-mentions` script (dev-path probe against `pnpm dev`) | The repository has no browser coverage of the live `@` menu, Team/Org rows or the notice; the project keeps such journeys as dev-path probes |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| RC-05a | `autobyteus-server-ts/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` | lifecycle stub gains `terminateCollaborationRoot: async () => false` | design DS-004 (Stop ends the Agent root first) | test-harness staleness, not product |
| RC-05b | `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts`, `autobyteus-server-ts/tests/fixtures/grok-acp/fake-acp-agent.mjs` | opt-in MCP-ready reporting; `mcpServers` assertion = Agent Tools HTTP entry | REQ-012 / AC-014 (tools on every runtime) | real Grok behavior proven in LE-01e wire |
| HX-01 | `autobyteus-server-ts/tests/skill-improvement/skill-improvement-improver-session-service.test.ts` | assert `launchPurpose: "server_helper"` | REQ-012 helper exclusion | — |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm prepare:shared && npx prisma generate` | server | setup | Pass | `/tmp/csam-prepare.log` |
| 2 | `npx tsc -p tsconfig.build.json --noEmit` | server | typecheck | Pass | `/tmp/csam-tsc.log` |
| 3 | `pnpm test` in 3 contract packages | each package | mention note, DTOs | Pass (collab-stream 7 pre-existing failures, identical on base `/tmp/csam-base`) | console |
| 4 | `npx vitest run tests/unit` (+ failing files on base) | server | all unit | Pass (3930 pass / 78 fail; identical 78 on base) | `/tmp/csam-server-unit.json` |
| 5 | `npx vitest run tests/integration` (+ failing files on base) | server | integration | Pass (271 / 46 fail; identical 46 on base) | `/tmp/csam-server-int.json` |
| 6 | `npx vitest run tests/e2e` (+ failing files on base, isolated reruns) | server | API journeys | Pass after durable updates RC-05a/b (branch-only failures were stale harness/fixtures; token-usage/gemini are suite-order only) | `/tmp/csam-server-e2e.json` |
| 7 | `NUXT_TEST=true npx vitest run` (+ failing files on base) | web | web unit/component | Pass (3439 / 4 fail + 1 load error; identical on base) | `/tmp/csam-web.json` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — many independent live cases across 5 runtimes and long-running browser journeys with real models.
- Canonical ledger path: `api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | unit/integration cover admission, resolvers, Agent root, tools, rows, notice derivation | no real-runtime or rendered proof of AC-001–012/014 | live API per runtime + browser journeys |
| Changed-boundary execution directness | 70% | real server code in integration tests | runtimes are fakes; web tests mount components without the server | live |
| Cross-boundary integration realism and mock gap | 60% | stream handler tests | client↔server contracts (echo, acks) and runtime MCP exposure mocked | live browser + live API |
| Environment, configuration, identity, and fixture fidelity | 70% | real schemas/stores in tests | AGY/ACP exposure never exercised | live per runtime |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | crash/stop/delete/archive unit-tested with real manager+catalog | real process exit, restart, restore | lifecycle probe |
| User-surface, browser, and desktop-shell confidence | 60% | component tests; implementation render check (standalone only) | Team/Org/failure never rendered | browser |
| Durable regression coverage quality and relevance | 80% | broad new unit coverage | two stale e2e tests; no live coverage | durable live E2E + probe |

- Overall post-repository confidence: 71% (simple average). Critical criteria not directly proven; several categories below 90%.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (pre-decided from the boundary classification: real runtimes, live browser journeys, lifecycle).
- Selected execution mode: `Live API` (in-process studio server, real runtimes) + `Browser` (real `pnpm dev` stack, headless Chrome) + `Lifecycle` (process kill for host crash).
- Gap addressed: AGY/ACP exposure; Team/Org/failure journeys never rendered; stop/crash/restore on real runtimes; C-02 observation.
- Browser-specific rationale: the renderer changes are web-equivalent; no Electron shell code changed, so a browser dev-path run is the direct surface.

## Desktop Application Validation Decision

- Desktop framework: Electron (not changed).
- Web-equivalent behavior: all UI changes are renderer code.
- Shell-specific behavior: none changed.
- Chosen approach: browser dev-path against `pnpm dev` (TESTING.md: renderer UI → web unit + browser dev-path probe).
- Effect on the running desktop app: None (user app on port 29695 and `~/.autobyteus` untouched).

## Live Environment And Fixture Plan

- Startup: `pnpm dev` in the worktree (backend 8000, frontend 3000); live E2E uses its own in-process server and temp data dir.
- Seed: definitions via GraphQL (unique names), Team/Org definitions via GraphQL; runs created via GraphQL or the UI.
- Evidence: DOM/state assertions, GraphQL (`agentRunCollaboration`, tree files), WS frames, server logs, screenshots under `tickets/in-progress/cross-scope-agent-mentions/api-e2e-evidence/`.
- Cleanup: terminate runs, stop `pnpm dev`, remove `/tmp/csam-base`, remove untracked shared `dist/` output created by `prepare:shared`.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| LC-01 | kill the host runtime subprocess of a live standalone run with a child | crash keeps root; wake; history Delete/Archive end the root first | process-kill choreography is machine-specific; logic is unit-tested durably |
| PD-01 | rewrite a stopped Team/Org tree without `collaborators`, reopen | old data direct use | one-time transition check; reader unit tests are durable |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Application-owned runs in the live UI | needs an installed application package and app-owned run; server exclusions unit-tested (host context null, no root, policy `UNAVAILABLE_APPLICATION_ROOT`, admission rejects) | Low: the web `@` menu has no client-side application check, so a focused app-owned run would show the empty menu frame | none required; noted |
| Host crash on Claude/Codex/AutoByteus | run liveness is not process-bound there (Claude resumes a dead CLI lazily; Codex shares one app server; AutoByteus is in-process), so RS-003 is not reachable by a process crash | none for this ticket | validated on AGY (process-bound) |
| Grok combined-run rerun of the last step | provider quota `429 free-usage-exhausted` | Low | isolated Grok run passed every step |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| C-02: collaborator task Team members get teammate addresses from `get_handoff_rules`, but `send_message_to` by address resolves configured ingress only, and they know no teammate run IDs → a collaborator Team cannot follow its own handoffs | Design Impact (candidate) | live observation `api-e2e-evidence/c-02-observation.log` | Solution Designer (via code-review failure-origin) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed; see the execution coverage report)
- Repository-Resident Durable Coverage Will Be Added / Updated: `Yes` (added LE-01 live E2E and the browser probe; updated RC-05a/b and HX-01)
- Post-repository confidence: 71%
- Broader validation decision: `Required` — executed (live API on 5 runtimes, browser on Claude, lifecycle on AGY)
- Reroute Required Before Validation Execution: `No` (C-02 surfaced during execution and follows the failure-origin route)

---

## Round 2 (API-REV-002) — SR-008 requirements, SR-010 design, IR-004 @ `bcff48200`, CRR-005

### Basis delta

- A mention now adds **one hosted collaborator instance** at send, inside the root gate (validate → allocate → prepare → one tree write → publish Offline → `collaborator_added` → note). Any failure returns `COLLABORATOR_ADD_FAILED` with `collaborator_name`; nothing is written or posted; the web keeps the draft and shows the notice (D-R1).
- `send_message_to` resolves collaborator Agents, collaborator Teams (to the coordinator) and collaborator Team members (DI-001); the first message starts the collaborator. `delegate_task(<collaborator address>)` starts an extra copy (REQ-013/AC-015).
- RD-004 (REQ-014/AC-016): agent-to-agent deliveries record `sender_id` on user traces and render "From <Sender>:" live and on replay; old traces stay user-style.
- UI basis: SR-008 spec with VIS-001–015 (adds VIS-015 "Offline on send"; revised VIS-004/005/007/010/013).

### Existing durable coverage decisions (round 2)

| Path / Test | Decision | Reason | Action |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` (R1) | Replace (rewrite) | asserted SR-007 behavior: `delegate_task` to collaborators, collaborator as task execution, collaborator-address hint | rewritten for SR-010; adds the DI-001 case |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (R1) | Replace (rewrite) | asserted SR-007 UI: `delegate_task` cards, task notice in the collaborator, null-result notice, Team F-01–F-03 findings | rewritten for SR-010; adds A04 (old trace), A05 (viewing doesn't restore), F01 (real failure, three transports) |
| R1 updates (error-termination harness, Grok replay + fake ACP agent, improver `launchPurpose`) | Still Valid | unaffected by SR-010 | rerun |
| Implementation's new unit/integration tests (admission, Team root collaborators, Org collaborators, Agent root, replay, held submission, CR-003, formatter, F-04 view) | Still Valid | reviewed in CRR-005 | run in the suites |

### Real-use scenarios added in round 2

- RU-07: a run's model stops being available (the user changes the LM Studio host in Settings), then a mention send → refused on all transports (AC-008). Also observed naturally: a Codex run on a model no longer in the catalog refuses mentions.
- RU-08: reopening a stopped run with its collaborator selected must not restore the host (AR-001).
- RU-09: a delivery stored before RD-004 (no `sender_id`) is replayed user-style.

### Repository results (round 2)

| Command | Result |
| --- | --- |
| `pnpm prepare:shared`, `prisma generate`, `tsc -p tsconfig.build.json --noEmit`, `pnpm build` | Pass |
| server `tests/unit` + `tests/skill-improvement` | 3967 pass / 82 fail = 78 base set + 4 skill-improvement failing identically on base |
| server `tests/integration` | 267 / 46 fail, all in base set |
| server `tests/e2e` (full) | 197 / 41 fail, all in base set |
| web | 3455 / 4 fail + 1 load error, base set |
| contracts; autobyteus-ts message/memory/input-processor | unchanged / 56 files pass |

### Post-repository confidence (round 2)

Unchanged in shape from round 1 (no real runtime, no rendered SR-010 UI, no real failure): 72%. Broader validation `Required`: live API on every runtime, browser on all three run kinds, real failure, lifecycle, replay/old traces, admission latency.

### Ambiguities / reroute triggers (round 2)

None. Observations recorded in the execution report (R-1 cosmetic host label in VIS-013's Team tab; R-2 reconnect after server restart restores the root as Team streams do; R-3 live cross-root run-ID messaging kept by REQ-012).

### Investigation decision (round 2)

- Proceed: `Yes` (executed). Durable coverage rewritten (2 files); no removals. Broader validation executed; Grok live blocked by provider quota (residual).
