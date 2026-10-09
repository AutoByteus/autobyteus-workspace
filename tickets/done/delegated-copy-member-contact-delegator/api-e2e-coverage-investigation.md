# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/requirements-doc.md` (Approved, SR-005)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec (required on every route): `…/design-spec.md` (SR-006)
- Supplemental Task Artifacts: none
- Design Review Report: `…/design-review-report.md` (Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (Pass, 9.4/10)
- Code Review Revision Record: `…/code-review-revision-record.md` (CRR-001)
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Code review pass CRR-001 (Medium / High, reviewed route)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

All `…/` paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/`.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (per `get_handoff_rules`)
- Proportional test-code review decision: `Required` (High risk reviewed route; new durable E2E file)

## Current Requirement And Design Basis

Standalone Agent runs only. The Agent-root collaborator port is built per viewer (focused composer agent or tool-calling sender):

- REQ-001 / AC-001: a non-host agent's `@` candidates include the host definition; the host's own list does not.
- REQ-002 / REQ-004 / AC-002: a mention of the host from a non-host resolves to the host address with presence `run_agent`; the note reads `- <Host> (Agent) at <addr>, the run's own agent` and `Use send_message_to with recipient_address <addr> to message <Host>; delegate_task cannot target it.`; no `Delegate the work` sentence when the host is the only entry; nothing is added to the run.
- REQ-006 / AC-003: a copy member's `send_message_to(<host address>)` reaches the existing host run.
- REQ-003 / AC-006: a copy member's `list_available_agents` lists the host at its address; the host's own list omits itself.
- AC-009: `delegate_task(<host address>)` from a copy member is refused; no second host instance.
- GraphQL `collaboratorMentionCandidates` requires `focusedAgentRunId` for `agent` roots ("focusedAgentRunId is required for an Agent run root.").
- Preserved: AC-007 (Team/Org results), AC-008 (prompts, work packet), saved notes parse, host self-mention rejected.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (user `@`s the host from a Team-copy member composer; member messages the host), SCN-002 (member asked in plain words discovers the host via `list_available_agents`, then messages it), SCN-004 (Team/Org roots unchanged, via the existing ad-hoc suite).
- Real-use scenarios added from investigation:
  - SCN-001 from a **non-coordinator** Team-copy member that has not started yet (lazy activation): the user's post is its first input. Real trigger: the web task-child composer posts through `/ws/agent-collaboration/<host>` with `target_agent_run_id` = member.
  - SCN-001/002 from an **Agent copy** (single-agent delegated copy), the other copy shape.
  - Host composer `@host` (self-mention) still rejected through the real host stream.
  - An ineligible mention from a copy member is still rejected (requirements SCN-001 alternate).
- Not tested (out of scope / contrived per requirements): SCN-003 (nested delegators), SCN-005 (Team/Org self-exclusion), New chat draft list.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 candidates per focused agent | Changed | REQ-001, D-1/D-2/D-4 | Real GraphQL query for host vs copy member vs Agent copy; missing focused ID error |
| BEH-002 mention of host from non-host | Changed | REQ-002/004, D-3 | Real stream SEND_MESSAGE to a copy member; stored note text; no new run tree node |
| BEH-003 send_message_to host address | Preserved | REQ-006 | Real scoped MCP tool from copy member reaching the existing host run |
| BEH-005 list_available_agents | Changed | REQ-003 | Real scoped MCP tool from copy member and from the host |
| delegate_task to host | Preserved | AC-009 | Real scoped MCP refusal; no new copy |
| Team/Org candidates/notes | Preserved | AC-007 | Existing ad-hoc E2E (all three roots) |
| Mention note contract / saved notes | Changed (contract) / Preserved (saved) | D-3, data continuity | Contract package tests |
| Web scope/cache/query | Changed | D-4 | Web unit tests; renderer probe (doubles) from implementation |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Agent-root port per viewer, admission presence | Unit tests (port, root, admission) | Real tree/catalog/address derivation with a live delegated copy | Server E2E (real HTTP/WS/MCP) |
| API / transport / contract | Yes | GraphQL arg; WS SEND_MESSAGE mention resolution for child target; MCP tools | E2E only host-view query | Non-host query, child-target send, tool calls | Server E2E |
| Frontend component / state | Yes | Scope/cache/query pass focused run ID | Web unit + probe with candidate double | Real server answer to the web query shape | Server E2E uses the same GraphQL document shape; web unit |
| Browser integration / user journey | Yes (contents only) | Same menu, different contents | Probe B01–B04 (doubles) | Rendered menu against live server | Desktop user verification (AC-003) per requirements |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (contents only) | as above | as above | as above | as above |
| Desktop shell / Electron-specific | No | — | — | — | — |
| Process / lifecycle | Yes (indirect) | Lazy member activation on first post; host receives while live | Existing lazy-activation E2E | Activation by the mention-carrying post | Server E2E |
| Persisted-data transition | Yes (note text) | Saved notes parse | Contract tests | — | None |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No (AGY CLI scripted) | — | — | Real model adherence to the note | Out of scope (prompt adherence risk, recorded) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator` (branch `codex/delegated-copy-member-contact-delegator`, HEAD `24baaf7c5`)
- Project type: pnpm monorepo; Node/TypeScript Fastify + GraphQL + WS server, Nuxt/Electron web, contracts packages.
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/TESTING.md` (identical to superrepo root). No closer `TESTING*.md` in changed packages.
- Conflicts/discrepancies: `pnpm -C autobyteus-server-ts typecheck` fails on base (TS6059); use `tsc -p tsconfig.build.json --noEmit` (recorded by implementation).
- Required secrets: N/A (zero-credit fake AGY CLI).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` → "@ delegation and ad-hoc Tasks" | Server E2E for `@`/delegation with scripted AGY actor | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`; prefix `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` |
| `TESTING.md` Rules 2, 5, 9 | Safety / cleanup / baseline | Never use user app/data; tests own disposable data dir; baseline failures explained |
| `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | Scripted actor | `CALL_TOOL:{name,arguments}` → real scoped MCP tool call; reply `CALLED:<result>` |
| `tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` | Pattern: disposable HOME via `vi.hoisted` | Keeps fake AGY files out of the real HOME |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside the test | Free port, disposable app-data dir | `CONNECTED` / snapshot frames | `app.close()`, terminate roots, rm data dir |
| Fake AGY CLI processes | spawned per AgentRun | via runtime | one process per activation | tool results in conversation | terminated with roots; leftover-process check |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team definitions (host, copy Team lead/reviewer, Agent copy) | GraphQL `createAgentDefinition` / `createAgentTeamDefinition` | Disposable data dir; unique suffix | Data dir removed |
| Agent run with delegated copies | Host `delegate_task` via scripted actor | — | Root terminated |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Evidence: contract tests parse previous-release notes and saved guidances (`autobyteus-agent-presentation-contracts/tests/collaborator-mention-note.test.mjs`); rerun here.
- Reroute required: No

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related REQ / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | Host-view candidates exclude host (focused = host); in-run mentions; Team/Org unchanged | AC-001 (host half), AC-007, AC-009 | Still Valid (updated by implementation for the argument) | Code read lines 395–417 | Rerun |
| `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | Real-provider host mentions | AC-009 | Still Valid (focused = host) | Line 230 | Real-provider gated; not run (no credits planned) |
| `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | Real-provider `list_available_agents` from host | AC-006 host half | Still Valid | Implementation diff | Real-provider gated; not run |
| `tests/e2e/.../remove-built-in-project-task-manager-startup.e2e.test.ts` | Candidates query caller | — | Still Valid | AR-002 | Check gating; run if zero-credit |
| `tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` | Team copy members start lazily | lifecycle | Out Of Scope (regression rerun) | — | Rerun as regression for copy-member posts |
| Server unit: `standalone-root-collaborator-port.test.ts`, `standalone-agent-run-root.test.ts`, admission, Team/Org collaborator tests, stream handler | Port per viewer, presence, refusals | AC-001..009 | Still Valid | Code review | Rerun |
| Contract `tests/collaborator-mention-note.test.mjs` | Note wording, saved notes | AC-002, data continuity | Still Valid | — | Rerun |
| Web `collaboratorCandidatesService.spec.ts`, `runMentionScope.spec.ts`, store specs | Focused ID in scope/cache/query | AC-001, QR-001 | Still Valid | — | Rerun |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | REQ / AC | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DCM-001 | Candidates per focused agent (host / Team-copy member / Agent copy) and missing-focused error via real GraphQL | REQ-001, AC-001 | `autobyteus-server-ts/tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts` | Only the host view is covered at the real server |
| DCM-002 | User `@host` to a not-yet-started Team-copy member through `/ws/agent-collaboration`: accepted, stored `run_agent` note, no delegate sentence, nothing added | REQ-002, REQ-004, AC-002 | same | Real stream + admission + note composition for a child target is unproven |
| DCM-003 | That member's `send_message_to(<host address>)` (as instructed by the note) reaches the existing host run | REQ-006, AC-003 | same | Contact path end-to-end |
| DCM-004 | Copy member `list_available_agents` lists host at its address; host's own list omits itself; Agent copy also lists host; plain-words `send_message_to` reaches host | REQ-003, AC-006 | same | Real MCP tool per sender |
| DCM-005 | Copy member `delegate_task(<host address>)` refused; no new copy | AC-009 | same | Guard against a second host instance |
| DCM-006 | Host self-mention rejected; ineligible mention from a copy member rejected | AC-009, preserved | same | Preserved negative paths at the real wire |
| DCM-007 | After Stop: stored-root candidates per focused agent; the user's `@host` post to the reviewer restores the root and reaches the same host run | REQ-001, REQ-002, REQ-006 | same | Added during execution: closes the lifecycle gap (stored GraphQL path + restore on send), a real reopen-later journey |

## Durable Coverage To Update

None (implementation already updated callers for the new argument).

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

Evidence folder: `…/api-e2e-evidence/api-rev-001/`. `E2E-ENV` = `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-agent-presentation-contracts test` | worktree root | Note contract, saved notes | Pass 16/16 | `contracts-test.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration tests/unit/standalone-agent-run-root tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/services/agent-streaming tests/unit/api/graphql tests/unit/agent-tools --no-watch` | worktree root | Server unit for changed owners, prompts/work packet (AC-008) | Pass 158 files / 1120 tests | `server-unit-targeted.log` |
| 3 | `E2E-ENV pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts --no-watch` | `DELEGATED_COPY_CONTACT_E2E_EVIDENCE_DIR=<evidence>` | DCM-001..007 | Pass (5 runs: 3 before DCM-007, 2 after) | `dcm-e2e-run1..5.log`, `delegated-copy-member-contact-host.json` |
| 3b | Mutation control: `ownDefinition = hostDefinition` temporarily, same command | source restored (clean diff) | Test detects the original defect | Fail as expected | `dcm-e2e-mutation-own-definition.log` |
| 4 | `E2E-ENV … tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | | AC-007 Team/Org + host view | Pass 3/3 | `ad-hoc-e2e.log`, `ad-hoc-task-delegation.json` |
| 5 | `E2E-ENV … tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` | | Copy lifecycle regression | Pass 8 (2 skipped: opt-in `RUN_CLAUDE_E2E`) | `lazy-and-reactivation-e2e.log` |
| 6 | `pnpm -C autobyteus-web test:nuxt services/collaborators composables/agentInput composables/runSettings stores/__tests__/agentRunCollaborationStore.spec.ts utils --run`; `… components/agentInput --run` | | Web scope/cache/query, store target, note text | Pass 78/470; 7/44 | `web-unit-targeted.log`, `web-unit-agentInput-components.log` |
| 7 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`; `tsc -p tsconfig.json` filtered for the new file | | Types | Pass (only baseline TS6059 for the new file, as for all tests) | `server-tsc-build.log` |
| 8 | `pnpm -C autobyteus-server-ts prebuild && build`; `E2E-ENV`-less `vitest run tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | built dist | Updated query caller (AR-002) | Pass 4/4 | `server-build.log`, `pm-startup-e2e.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — six cases inside one long-running E2E plus several suites; interruption risk.
- Canonical ledger path: `…/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard

Scored after orders 1–8 (before DCM-007 and the browser journey).

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | AC-001/002/003/006/009 direct at the real server; AC-007 three roots; AC-008 unit | Rendered menu against a live server unseen | Browser journey |
| Changed-boundary execution directness | 95% | Real GraphQL/WS/scoped MCP/admission/note | — | — |
| Cross-boundary integration realism and mock gap | 92% | Only the external CLI is scripted | Web → server seam proven by unit tests only | Browser journey on real backend |
| Environment, configuration, identity, and fixture fidelity | 93% | Disposable in-process server, real catalog | AGY runtime only (port logic is runtime-agnostic) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | Lazy first activation, refusals, ineligible mention, mutation control | Stopped root (stored GraphQL path, restore on send) | DCM-007 |
| User-surface, browser, and desktop-shell confidence | 90% | Web unit + earlier probe with doubles | Rendered task-child menu, send, Team tab against real data | Browser journey |
| Durable regression coverage quality and relevance | 96% | New E2E, mutation-proven, stable | — | — |

- Overall post-repository confidence: 93.3% (simple average)
- Every critical acceptance criterion directly proven: `Yes` (server boundary)
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `No` → targeted validation selected

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Browser` (web-equivalent renderer on a probe-owned built backend + Nuxt dev + headless Chrome, scripted AGY CLI) plus `Lifecycle` (DCM-007 in the durable E2E)
- Gap addressed: rendered `@` menu per focused composer, real web → server `focusedAgentRunId`, send through the real task-child composer, Team tab; stopped-root path
- Why: these are the only material paths not exercised at the real boundary; both run with zero credits and owned resources
- Expected confidence after: ≥95%
- Round 2 (API-REV-002, user-directed): `Project Desktop Validation` added — isolated packaged instance from this worktree, public agent package imported from GitHub, Claude Agent SDK real model; the full SCN-001 journey (see execution report "Round 2"). Round 1 had wrongly deferred this to user verification although the requirement's success is defined in the desktop app and the change is High risk.
- Browser-specific rationale: the change alters only menu contents, but the focused ID is wired through the real store/tree projection; a rendered journey proves the integration. Desktop-shell behavior is unchanged (no Electron/preload/IPC change), so an isolated desktop instance adds no material evidence beyond the delivery-owned user verification.

## Live Environment And Fixture Plan

- Startup: `autobyteus-server-ts/dist/app.js` (after `prebuild && build`) on a free port with a disposable data root and HOME, `ANTIGRAVITY_CLI_COMMAND=<fake>`, `AGY_FAKE_CASE=linked_skills`, shell `AUTOBYTEUS_*` dropped; `pnpm exec nuxi dev` on a free port; headless Chrome (playwright-core). Same pattern as `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`.
- Readiness: backend `listening` + GraphQL `__typename`; Nuxt HTTP 200.
- Data: definitions (Project Manager host, Review Lead, Code Reviewer, Review Team) via GraphQL; one Agent run; the host delegates the Team via its input channel.
- Journeys: BJ-001 (menus per composer + request variables), BJ-002 (`@host` chosen in reviewer composer, send, host receives, Team tab, nothing added, note hidden in the rendered bubble).
- Evidence: `evidence.json`, screenshots, backend/frontend logs.
- Cleanup: Chrome closed; Nuxt and backend process groups terminated; data root and HOME removed.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| BJ-001, BJ-002 | `…/api-e2e-evidence/api-rev-001/browser-probe/dcm-browser-journey.mjs` | Rendered `@` per composer; real request variables; send; Team tab | Menu rendering is unchanged code; the server contract is durable in DCM-001..007 and the web wiring in web unit specs. A new full-stack probe script would duplicate the task-closure probe's stack for two content checks. |
| MUT-001 | Temporary one-line source edit, restored | New E2E detects the original defect | Control only |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real-model adherence to the note (agent picks `send_message_to`) | Needs paid inference; prompt adherence is a recorded design risk | Low (refusal is harmless; note is explicit) | Desktop user verification (AC-003) |
| Real-provider gated E2E files (`standalone-agent-collaborator-mention`, `agent-initiated-collaborators`) | Real-provider credits | Low: changed lines only add the host-view argument | Optional delivery/user run |
| Nested delegators (SCN-003), Team/Org self-exclusion (SCN-005) | Out of scope by user direction | None | — |

## Ambiguities Or Reroute Triggers

None. Non-blocking observation (not a finding against approved scope): the `@` menu header/footer copy ("Delegate to an agent or team", "reviewer gets your message and delegates the work") is unchanged and reads as delegation even for the host entry; the stored note itself is correct. Requirements keep the menu UI unchanged ("No new UI surface"), so this is a separate-ticket candidate for the Solution Designer.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (completed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one new E2E file)
- Post-repository confidence: 93.3%; final 95.3% (round 1) → 96.7% (round 2, desktop) (see execution report)
- Broader validation decision: `Required` → executed (browser journey + DCM-007), Pass
- Reroute Required Before Validation Execution: `No`
