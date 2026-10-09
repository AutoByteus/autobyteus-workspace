# API/E2E Execution Coverage Report

## Execution Round Meta

`…/` = `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator/tickets/in-progress/delegated-copy-member-contact-delegator/`

- Requirements Doc: `…/requirements-doc.md` (SR-005)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md` (SR-006)
- Supplemental Task Artifacts: none
- Design Review Report: `…/design-review-report.md`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md`
- Code Review Revision Record: `…/code-review-revision-record.md` (CRR-001)
- Delivery Revision Record: N/A
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: round 1 = code review pass CRR-001; round 2 = user request (2026-10-09) to validate in an isolated desktop instance with the public agent package and a real model
- Prior Round Reviewed: round 1 (API-REV-001, Pass 95.3%)
- Latest Authoritative Round: 2 (round 1 results carried forward unchanged; round 2 adds DSK-001..DSK-004)

## Round 2 — Isolated Desktop Instance, Public Agent Package, Real Model (API-REV-002)

Evidence folder: `…/api-e2e-evidence/api-rev-002/` (MP4 `desktop-journey.mp4`, trimmed at delivery from the 348 s recording to 42 s at 1512 px: each near-frozen stretch kept 0.5 s from its start and 0.8 s from its end, all motion kept, screenshots `shots/00..08`, backend readback `desktop-journey-backend.json`, `pm-conversation.json`, `isolated-start.json`, `isolated-build.log`, read-only checker `verify.py`).

- Instance: `pnpm --silent isolated-app start --build` from this worktree (HEAD `24baaf7c5`; packaged `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, 1.4.99-beta.6), instance `iso-61062-6a74`, its own ports (control 61062, server 61063) and auto-created data root. Driven with the browser-automation skill in attach-only mode. Other recorded instances (not mine, not running) were untouched; the user's app/data were untouched.
- Content, as a user does: Settings → Agent Packages → import `https://github.com/AutoByteus/autobyteus-agents` (GitHub; 8 shared agents, 47 team-local agents, 14 teams).
- Model: Claude Agent SDK runtime (logged-in `claude` CLI, 2.1.295), `claude-haiku-5-5`; the delegated Team inherits it. No key import.

| Case ID | REQ / AC | Journey Step | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| DSK-001 | Setup (SCN-001 start) | New chat → Project Task Manager; ask it to delegate a tiny review to the Software Engineering Team | PM delegates; Team copy appears under the PM run | PM called `list_available_agents`, then `delegate_task(/software_engineering_team)` → `target_kind: team`, ad-hoc Task; tree shows the SE Team with 6 members; solution designer replied to the PM | Pass | `shots/05-pm-delegated.png`, `pm-conversation.json` |
| DSK-002 | REQ-001, AC-001 | Select the (Offline) code reviewer; type `@` | Project Task Manager offered | Menu lists Project Task Manager among the agents | Pass | `shots/06-code-reviewer-at-menu.png` |
| DSK-003 | REQ-002, REQ-004, REQ-006; AC-002, AC-003 | Choose `@Project Task Manager`, type "please create a follow-up ticket: fix the README typo …", Enter | Note with run-agent entry + send_message_to sentence; the code reviewer (real model) messages the PM's existing run; Team tab shows it; nothing added | Stored note: `- Project Task Manager (Agent) at /project_task_manager, the run's own agent` / `Use send_message_to with recipient_address /project_task_manager to message Project Task Manager; delegate_task cannot target it.` Code reviewer started and called `send_message_to({recipient_address:"/project_task_manager", message_type:"task_request", …})` → `DELIVERED`, `target_agent_run_id` = the one PM run `project_task_manager_49ba05d4…`. PM conversation shows "From Code Reviewer"; PM answered the code reviewer. Team tab: Task Request code reviewer → Project Task Manager. Backend: exactly one PM run, one task node (the SE Team), `collaborators: []` | Pass | `shots/07-code-reviewer-after-send.png`, `shots/08-pm-own-menu.png`, `desktop-journey-backend.json` |
| DSK-004 | REQ-001 (host half) | PM composer, type `@Pro` | PM not offered | Only Product Team and Software Product Promo Video Team | Pass | `shots/08-pm-own-menu.png` |

Observation (pre-existing, not caused by this change, separate-ticket candidate): when the PM replied, its first `send_message_to` used the code reviewer's address `/software_engineering_team/code_reviewer` (the code reviewer had written that address into its message) and was refused with `COLLABORATION_TARGET_NOT_FOUND … was not found in this Agent run.`; the PM retried by `target_agent_run_id` and it was delivered. Delegated-copy members are reachable from the host by run ID only; `resolveMessageRecipient` is unchanged by this ticket and requirements keep "run ID remains the exact identifier" out of scope.

Cleanup: recording stopped (`end_reason: stopped`); `isolated-app stop iso-61062-6a74` → `wasRunning: true, forced: false, dataRootRemoved: true`, both ports released; no leftover app processes. The packaged build in `autobyteus-web/electron-dist/` is untracked build output.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, plus two additions driven by the confidence gate: DCM-007 (stopped-root lifecycle) in the durable E2E and a temporary browser journey (BJ-001/BJ-002).
- Existing coverage decisions revised during execution: run 1 receipt showed the Team-tab lookup used the wrong path (`agentRunCollaboration.communication_messages`); corrected to `root_agent.communication_messages.messages` and made mandatory; delivery assertions tightened to the exact host run ID.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `…/api-e2e-test-case-ledger.md`; initialized before the regression suites, events recorded per case; reconciled: `Yes`.
- Cases still running or not started: none.

| Case ID | Final Result | Last Event | Evidence | Reconciled Result |
| --- | --- | --- | --- | --- |
| DCM-001..006 | Pass | Runs 1–5 | `dcm-e2e-run*.log`, `delegated-copy-member-contact-host.json` | Pass |
| DCM-007 | Pass | Runs 4–5 | same | Pass |
| MUT-001 | Pass (control failed as expected) | — | `dcm-e2e-mutation-own-definition.log` | Pass |
| BJ-001, BJ-002 | Pass | run-2 (run-1: BJ-002 probe-script error, fixed) | `browser-probe/run-2/evidence.json`, screenshots | Pass |
| REG-001..007 | Pass | — | logs in evidence folder | Pass |

## Compatibility / Legacy Scope Check

- Upstream introduces compatibility: `No`
- Compatibility-only or legacy-retention behavior observed: `No` (the saved-guidance recognition in the note parser is the approved data-continuity reader)
- Approved persisted-data transition followed: `Yes` (`Directly Usable — No Migration`; contract tests parse previous-release notes and saved guidances)
- Durable coverage added for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

Evidence folder: `…/api-e2e-evidence/api-rev-001/`.

| Case ID | REQ / AC | Changed Boundary | Execution Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| DCM-001 | REQ-001, AC-001 | GraphQL candidates per focused agent; missing-focused error | Real server GraphQL | Durable | Pass | host view excludes host; reviewer and Agent copy = host view + host; error "focusedAgentRunId is required for an Agent run root." |
| DCM-002 | REQ-002, REQ-004, AC-002 | `/ws/agent-collaboration` SEND_MESSAGE to a not-yet-started Team-copy member with `@host`; admission; note | Real WS + AGY backend | Durable | Pass | stored note: `- DCM Manager … (Agent) at /dcm_manager_…, the run's own agent` / `Use send_message_to with recipient_address /dcm_manager_… to message DCM Manager …; delegate_task cannot target it.`; no `Delegate the work`; no copy/collaborator added |
| DCM-003 | REQ-006, AC-003 | Member `send_message_to(<host address>)` | Real scoped MCP | Durable | Pass | `DELIVERED`, `target_agent_run_id` = host run ID; host conversation contains the request; exactly one reviewer → host Team-tab record |
| DCM-004 | REQ-003, AC-006 | `list_available_agents` per sender; plain-words send | Real scoped MCP | Durable | Pass | reviewer and Agent copy list the host at its address; = host list + host; host list omits itself; Agent copy's send `DELIVERED` to the host run |
| DCM-005 | AC-009 | `delegate_task(<host address>)` from a member | Real scoped MCP | Durable | Pass | `target_agent_run_id: null`, "'/dcm_manager_…' is not a mounted Agent or Agent Team, a collaborator or an available agent of this run."; no Task, copy or collaborator |
| DCM-006 | AC-009 (preserved) | Host self-mention; ineligible member mention | Real host stream / root stream | Durable | Pass | host ACK rejected "DCM Manager … is this run's own definition."; member ACK rejected "'dcm-org-…' is not a shared Agent Team that can be mentioned." |
| DCM-007 | REQ-001/002/006 after Stop | Stored-root GraphQL path; restore on send | Real server | Durable | Pass | stored reviewer view = stored host view + host; post restores the root; `DELIVERED` to the same host run; earlier conversation kept |
| MUT-001 | AC-001 | Control | Temporary source edit | Temporary | Pass | E2E fails with `expected [ 'dcm-lead-…', …(4) ] to include 'dcm-manager-…'`; source restored |
| BJ-001 | AC-001 | Rendered `@` menu per composer; web → server variables | Browser (built backend + Nuxt dev + headless Chrome) | Browser (temporary) | Pass | reviewer menu lists "Project Manager …", request `{rootSubjectKind:"agent", rootRunId:<host>, focusedAgentRunId:<reviewer>}`; host menu omits it, request focused = host; `bj-001-*.png` |
| BJ-002 | AC-002, AC-003 | Choose `@host` in the reviewer composer, send | Browser | Browser (temporary) | Pass | host conversation received the marker; stored note correct; rendered bubble hides the note block; Team tab shows reviewer → Project Manager; host conversation in UI shows it; no run added; 0 browser errors; `bj-002-*.png` |
| REG-001 | data continuity, AC-002 wording | Contract | Package tests | Durable | Pass | 16/16 |
| REG-002 | AC-001..009, AC-008 | Server owners | Vitest | Durable | Pass | 158 files / 1120 tests |
| REG-003 | AC-007, AC-009 | Agent/Team/Org `@` | Real server | Durable | Pass | 3/3 |
| REG-004 | lifecycle regression | Copy activation/reactivation | Real server | Durable | Pass | 8 pass, 2 opt-in skips |
| REG-005 | AC-001, QR-001 | Web scope/cache/store/note text | Vitest/Nuxt | Durable | Pass | 78 files/470 tests; 7/44 |
| REG-006 | — | Types | tsc | — | Pass | build config clean |
| REG-007 | AR-002 caller | Built-dist startup | Real built server | Durable | Pass | 4/4 |

## Additional Repository Coverage Execution

Recorded in the coverage investigation (orders 1–8). After the broader-validation decision: DCM-007 added to the durable E2E and run twice (runs 4, 5: Pass).

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Round 1 Final | Round 2 Final | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | 98% | AC-001/002/003 proven in the packaged desktop app with the real public package and a real model (DSK-002..004) | Explicit user acceptance remains delivery's gate |
| Changed-boundary execution directness | 95% | 96% | 97% | Real desktop composer → stream → admission → note → real model → MCP → existing host | — |
| Cross-boundary integration realism and mock gap | 92% | 95% | 97% | Nothing scripted in round 2: real Claude Agent SDK runtime followed the note and used `send_message_to` with the host address | One model (Haiku 5.5) and one run; other runtimes rely on the same server path |
| Environment, configuration, identity, and fixture fidelity | 93% | 94% | 96% | Packaged worktree app, isolated data, GitHub-imported public package (real PM / SE Team definitions and tool lists) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 95% | 95% | DCM-007; refusals; mutation control | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | 98% | Packaged Electron app: menu per composer, send, Team tab, host conversation | — |
| Durable regression coverage quality and relevance | 96% | 96% | 96% | New E2E (7 cases), mutation-proven | Browser and desktop journeys are not durable (rationale in investigation) |

- Overall post-repository confidence: 93.3%
- Overall final confidence: round 1 95.3% → round 2 96.7%
- Calculation method: simple average of the seven categories
- Confidence change: round 1 +2.0 (browser + lifecycle); round 2 +1.4 (packaged desktop, real package, real model)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: one real model/run; pre-existing host → copy-member address refusal (recovered by run ID).

## Broader Validation Decision And Execution

- Decision: `Required`; modes `Browser` + `Lifecycle`. No deviation.
- Gap addressed: rendered menu per focused composer and real web → server `focusedAgentRunId`; send through the task-child composer; Team tab; stopped-root path.
- Startup: `pnpm -C autobyteus-server-ts prebuild && build`; probe starts `dist/app.js` (free port, disposable data root and HOME, fake AGY, shell `AUTOBYTEUS_*` dropped) and `pnpm exec nuxi dev` (free port); readiness `listening` + GraphQL; Nuxt 200. Command: `node …/api-e2e-evidence/api-rev-001/browser-probe/dcm-browser-journey.mjs <worktree> <fresh output dir>`.
- Run 1: BJ-001 Pass; BJ-002 failed in the probe script (typed `@Project Man`; the `@` query is the space-free token before the caret). Probe fixed to `@Project`; run 2: both Pass. Not a product defect.

| Scenario / Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Select reviewer (Team copy member), type `@` | Host listed; request focused = reviewer | Listed first under Agents; variables as expected | `run-2/bj-001-reviewer-menu.png`, `evidence.json` | Pass |
| Select host run row, type `@` | Host not listed; request focused = host | Not listed; focused = host | `run-2/bj-001-host-menu.png` | Pass |
| Reviewer composer: scripted send + choose `@Project Manager …`, Enter | Accepted; reviewer calls `send_message_to(/project_manager_…)` | `DELIVERED` to the host run ID; reviewer Idle | `run-2/bj-002-reviewer-after-send.png` | Pass |
| Team tab | reviewer → Project Manager message | 1 message, "Please create the follow-up ticket BROWSER_TICKET_…" | `run-2/bj-002-team-tab.png` | Pass |
| Host conversation | contains the request | Shown in the center pane | `run-2/bj-002-host-conversation.png` | Pass |
| Tree | nothing added | Same single Team copy; no collaborators | `evidence.json` | Pass |

## Desktop Application Validation

- Round 1: web-equivalent renderer (Nuxt dev) against the real built backend.
- Round 2: isolated packaged desktop instance built from this worktree (`isolated-app start --build`), the full product journey with the GitHub-imported public agent package and a real model (DSK-001..004, see "Round 2" above). TESTING.md "A full real-product journey a user would perform → isolated desktop instance" is now satisfied.
- Shell-specific behavior: none changed (no Electron main/preload/IPC/packaging change); the packaged run confirms the renderer/server change behaves the same inside the shell.
- Effect on any running desktop application: `None` (own ports and data root; installed app, `~/.autobyteus` and other recorded instances untouched).
- Not directly proven: none material; explicit user acceptance remains a delivery gate.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0); Node via pnpm workspace; Vitest; AGY runtime with the scripted CLI (`agy version 1.2.11` fake); headless Google Chrome via playwright-core at 1440×1000, en-US.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data: previous-release notes (in-run / not-in-run) and saved guidances in the contract tests (REG-001 Pass).
- Stop/restore: DCM-007 (stored tree read, restore on send, same host conversation).
- Version-specific runtime branch observed: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added: `Yes` (uncommitted in the worktree)

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts` | Added | REQ-001..004, REQ-006; AC-001..003, AC-006, AC-009; DCM-001..007 | Pass ×5 (2 with DCM-007); mutation control fails as expected |

- Added paths attached for proportional test-code review: `Yes`
- Suggested TESTING.md follow-up (delivery docs sync): add this file to the "`@` delegation and ad-hoc Tasks" command block.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `…/api-e2e-evidence/api-rev-001/*.log`, `delegated-copy-member-contact-host.json`, `ad-hoc-task-delegation.json` | Logs and JSON receipts | Retained | — |
| `…/api-e2e-evidence/api-rev-001/browser-probe/run-1`, `run-2` | Browser evidence, screenshots, backend/frontend logs | Retained | run-1 = probe-script error |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `…/browser-probe/dcm-browser-journey.mjs` | Rendered journey on a real backend | BJ-001/002 Pass | Owned Chrome, Nuxt, backend groups terminated; data root and HOME removed (`evidence.json` cleanup) |
| MUT-001 source edit of `standalone-root-collaborators.ts` | Control | Failed as expected | Restored from backup; `git status` shows no tracked change |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI / model | `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) calling the real scoped MCP tools | Zero credits, deterministic | Real-model adherence to the note is not proven |

## Result Summary

| Result | Case IDs | Summary |
| --- | --- | --- |
| Pass | DCM-001..007, MUT-001, BJ-001, BJ-002, REG-001..007 | All approved in-scope behavior proven at the real server and rendered web boundary |
| Not Tested | Real-provider gated E2E (`standalone-agent-collaborator-mention`, `agent-initiated-collaborators`) | Paid inference; changed lines only pass the host as focused agent, and the same host-view assertion is proven by REG-003 and DCM-001 |
| Out Of Scope | SCN-003, SCN-005, New chat draft | By user direction |

## Cleanup Performed

| Resource | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process E2E servers, data dirs, HOMEs, AGY processes | Owned by tests | `afterAll` | Removed; no leftover AGY processes |
| Browser-probe backend, Nuxt, Chrome, data root, HOME | Owned by probe | `finally` | Terminated / removed |
| Server `dist/` rebuilt by `build` | Worktree build output | Kept (untracked build output; not committed) | — |
| `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/` | Untracked build outputs (pre-existing) | Left as is; do not commit | — |

## Preliminary Classification

N/A (Pass).

## Latest Authoritative Result

- Result: `Pass` (round 2)
- Final validation confidence: 96.7% (round 1: 95.3%)
- Default `95%` target met: `Yes`
- Any final applicable category below `90%`: `No`
- Broader validation decision: `Required` → executed, Pass
- Critical acceptance criteria lacking direct proof: none. AC-003 is now proven in an isolated packaged desktop instance with the real public package and a real model (DSK-003); explicit user acceptance remains delivery's gate.
- Next recipient from `get_handoff_rules`: Code Reviewer (proportional test-code review)
- Notes: residual risks — MP-001 catalog-address divergence after host rename (not-found only, by design); `list_available_agents` is opt-in; 42 server unit/integration files fail identically on base (`…/implementation-evidence/ir-001/server-baseline-failures.txt`, reported by implementation per TESTING.md rule 9; not caused by this change); menu header/footer copy still reads as delegation for the host entry (separate-ticket candidate); the new E2E file and ticket artifacts are uncommitted.
