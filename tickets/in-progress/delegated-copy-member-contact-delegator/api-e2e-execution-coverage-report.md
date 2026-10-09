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
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: code review pass CRR-001
- Prior Round Reviewed: none
- Latest Authoritative Round: 1

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

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | +1 | AC-001/002/003 also proven in the rendered web journey | Explicit desktop user verification of AC-003 (delivery-owned) |
| Changed-boundary execution directness | 95% | 96% | +1 | Real composer → stream → admission → note → MCP → host | — |
| Cross-boundary integration realism and mock gap | 92% | 95% | +3 | Real browser → real built backend; only the external CLI scripted | Real-model adherence to the note (prompt adherence; recorded design risk) |
| Environment, configuration, identity, and fixture fidelity | 93% | 94% | +1 | Built dist + Nuxt dev + disposable data | AGY runtime only; the port logic is runtime-agnostic. Not packaged Electron |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 95% | +3 | DCM-007 stopped root, restore on send; refusals; mutation control | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | +5 | Rendered menu per composer, send, Team tab, note hidden in bubble | No desktop-shell change; packaged app is user verification |
| Durable regression coverage quality and relevance | 96% | 96% | 0 | New E2E (7 cases) mutation-proven, stable over 5 runs, owned cleanup | Browser journey is temporary (rationale in investigation) |

- Overall post-repository confidence: 93.3%
- Overall final confidence: 95.3%
- Calculation method: simple average of the seven categories
- Confidence change from broader validation: +2.0 points (user surface, integration, lifecycle)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: real-model note adherence; AGY-only runtime; desktop packaged app not exercised (no shell change).

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

- Approach: web-equivalent renderer (Nuxt dev) against the real built backend, per TESTING.md "Renderer UI … client–server behavior that also runs in a browser".
- Shell-specific behavior: none changed (no Electron main/preload/IPC/packaging change).
- Effect on any running desktop application: `None` (own ports, data root, HOME; installed app and `~/.autobyteus` untouched).
- Not directly proven: packaged desktop app journey; it is the requirements' explicit user verification of AC-003 (delivery-owned).

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

- Result: `Pass`
- Final validation confidence: 95.3%
- Default `95%` target met: `Yes`
- Any final applicable category below `90%`: `No`
- Broader validation decision: `Required` → executed, Pass
- Critical acceptance criteria lacking direct proof: none (AC-003 explicit desktop user verification remains a delivery gate by requirement)
- Next recipient from `get_handoff_rules`: Code Reviewer (proportional test-code review)
- Notes: residual risks — MP-001 catalog-address divergence after host rename (not-found only, by design); `list_available_agents` is opt-in; 42 server unit/integration files fail identically on base (`…/implementation-evidence/ir-001/server-baseline-failures.txt`, reported by implementation per TESTING.md rule 9; not caused by this change); menu header/footer copy still reads as delegation for the host entry (separate-ticket candidate); the new E2E file and ticket artifacts are uncommitted.
