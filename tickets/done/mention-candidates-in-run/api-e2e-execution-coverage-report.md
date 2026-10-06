# API/E2E Execution Coverage Report — mention-candidates-in-run

## Execution Round Meta

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run/tickets/in-progress/mention-candidates-in-run/`. Evidence is in `api-e2e-evidence/`.

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md` (plus `api-e2e-evidence/L-CLAUDE-ledger.md`)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: implementation handoff IR-001 at `e08c4a8c5` (base `f48dbfbf3`)
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- The investigation was completed before the coverage changes: `Yes`.
- The plan was followed: `Yes`.
- One evidence-driven adjustment: the shell exports `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`, so the in-process E2E read the user's agent packages (read-only). The authoritative run unsets that variable and its sibling variables.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger initialized before execution and every case recorded: `Yes`. Reconciled: `Yes`.

| Case ID | Final Result | Evidence |
| --- | --- | --- |
| R-00 typecheck | Pass | `logs/R-00-typecheck.log` |
| R-01 contracts (12/12) | Pass | `logs/R-01-contracts.log` |
| R-02 focused server (146/147 files) | Pass (the 1 failing file also fails identically on base `f48dbfbf3`) | `logs/R-02-server-focused.log` |
| R-03 web specs (137/138 files) | Pass (the 1 failing file also fails identically at base `f48dbfbf3`) | `logs/R-03-web.log` |
| R-04 prebuild + build | Pass | `logs/R-04-prebuild-build.log` |
| R-05 gated wire E2E (extended), 6/6 | Pass | `logs/R-05-gated.log`, `R-05/` |
| L-CLAUDE live probe, 19 Pass / 2 N/A (L01/L02 need AGY) | Pass | `L-CLAUDE/`, `L-CLAUDE-ledger.md` |
| H-DESKTOP human-style desktop journey | Pass | `H-desktop/` (screenshots, `journey.mp4` 1.5 MB) |

## Compatibility / Legacy Scope Check

- Compatibility mechanisms or retained legacy behavior observed: `No`. Saved notes are read tolerantly (REQ-004); this is display of stored history.
- Persisted data: `Directly Usable — No Migration`. Earlier note forms still render as chips (web/contract specs and the live A06 case).
- No coverage exists only for compatibility: `Yes`.

## Changed Boundary And Evidence Matrix

| Case | REQ / AC | Boundary | Surface | Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R-05 agent/team/org | AC-001, AC-002 | GraphQL `collaboratorMentionCandidates` | real server | Durable | Pass | agent: own definition absent, in-run collaborator listed; team: the Team absent, configured members listed; org: members listed, Org absent |
| R-05 | AC-003, REQ-002/003, AC-006 | WS `mentions` → note | real WS | Durable | Pass | `- AHT Assistant … at /aht_assistant_…, already in this run` (and `/worker` for Team/Org) + in-run guidance; collaborators unchanged |
| R-05 | AC-004 | not-in-run note | real WS | Durable | Pass | no suffix, no in-run guidance |
| R-01, R-03 | AC-004, AC-005, AC-007, AC-008 | contracts parse/compose; draft mirror; copy strings | unit | Durable | Pass | logs |
| L-CLAUDE S01 | the reported scenario; AC-001, AC-003, AC-006 | browser + real model | live | Durable (probe) | Pass | collaborator listed; stored note suffix and guidance; chip shown; the host **messaged the existing collaborator** with `send_message_to`; still one collaborator |
| L-CLAUDE T01/O01/P01/N03 | AC-002, AC-007 | menus | live | Durable (probe) | Pass | configured members / mounted Team offered; own Team and Orgs not |
| L-CLAUDE A01 | AC-008 (en) | copy | live | Durable (probe) | Pass | "Delegate to an agent or team", "… gets your message and delegates the work" |
| L-CLAUDE F01 | AC-008, REQ-002 alternate | failure notice | live | Durable (probe) | Pass | "Couldn't mention temp-helper" for a deleted definition; nothing sent or added |
| H-DESKTOP | AC-007, AC-008 | packaged app | desktop | Live | Pass | see below |

## Human-Style Desktop Journey (Isolated Electron Instance)

Setup and method:
- A freshly built packaged app of this worktree (`isolated-app start --build`, instance `iso-61627-e021`).
- Driven through its window with the browser-automation presentation helper, like a person.
- The agents and the team were created through the UI with plain instructions. Runtime: Claude `haiku`.

| Step (as a user) | Observed | AC | Result |
| --- | --- | --- | --- |
| Create Research Assistant, Code Reviewer, Note Taker (Agents page) and Review Team (coordinator Research Assistant + Note Taker) | created | — | Pass |
| New chat, target Review Team, type `@` | menu lists Note Taker, Code Reviewer, Research Assistant; the Team itself is not listed; header "Delegate to an agent or team"; footer "… gets your message and delegates the work" | AC-007, AC-008 | Pass |
| First send "@Note Taker please write down …" | accepted; stored note `- Note Taker (Agent) at /note_taker, already in this run` + in-run guidance; the coordinator called `send_message_to /note_taker`; no copy row | AC-003, AC-007 | Pass |
| Ask the coordinator to `send_message_to` the Code Reviewer at `/code_reviewer` | agent-initiated collaborator added (the reported state) | — | Pass |
| Type `@` | **Code Reviewer is listed** (before the fix it was hidden) | AC-001 (reported bug) | Pass |
| "@Code Reviewer what did you find …" | stored note `already in this run`; the agent messaged the same collaborator (`send_message_to /code_reviewer`); server: one collaborator, no task executions | AC-003, AC-006 | Pass |
| Settings → Language → Simplified Chinese; `@` in the Team run | "委派给智能体或团队", list aria "可提及的智能体和团队", footer "research assistant 会收到你的消息并委派这项工作" (fits), placeholder unchanged "随便问 · @ 选择智能体或团队"; menu within the window | AC-008 (zh-CN) | Pass |
| New chat hint in zh-CN | "…或输入 @ 将工作委派给智能体或团队。" | AC-008 | Pass |
| `isolated-app stop` | data root removed, both ports released | cleanup | Pass |

## Additional Repository Coverage Execution

None beyond the investigation's plan.

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Change | Evidence | Residual |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 88% | 96% | +8 | Every AC directly proven; en and zh-CN rendered | Org root not repeated in the desktop app (live probe covers it) |
| Changed-boundary directness | 92% | 96% | +4 | real GraphQL/WS/renderer/model | — |
| Integration realism | 85% | 95% | +10 | Real Claude used the in-run guidance correctly 3 times (probe S01, desktop ×2) | model choice is probabilistic |
| Environment / fixture fidelity | 90% | 95% | +5 | user package roots excluded from the authoritative wire run; owned roots; fresh builds | — |
| Failure / edge / lifecycle | 90% | 94% | +4 | ineligible mention, own definition excluded, no duplicate on mention; stored notes still chips | Mentioning the own definition via raw API is unit-tested only (the UI never offers it) |
| User surface / desktop | 75% | 96% | +21 | browser probe + packaged desktop in two languages | — |
| Durable regression quality | 92% | 95% | +3 | wire E2E extended (3 roots), probe corrected and extended, TESTING.md updated | the probe depends on a model and CLI login |

- Overall post-repository confidence: 87%
- Overall final confidence: 95.3% (simple average: 96, 96, 95, 95, 94, 96, 95)
- Every critical AC directly proven: `Yes`. No final category below 90%: `Yes`. 95% target met: `Yes`.

## Broader Validation Decision And Execution

- Decision: `Required`, executed: a live browser probe on the Claude runtime plus a human-style isolated desktop journey.
- Gap addressed: rendered copy in en/zh-CN and wrapping; the real model's use of the in-run guidance; the reported user journey end to end.

## Desktop Application Validation

- Approach: a fresh packaged worktree build in an isolated instance, driven like a user. The user's running app and data were untouched.
- Not directly proven in the desktop app: Org runs (covered by live probe O01–O03).

## Platform / Runtime Targets

- macOS 26.5.2 (arm64), Node 22, Chrome 154 (probe) and the packaged Electron app (desktop); Claude Code CLI 2.1.283, model `haiku`.

## Lifecycle / Persisted-Data Checks

- Decision `Directly Usable — No Migration`: earlier-form notes still parse into chips (contracts, web specs, live A06/A01 conversations). No runtime fallback was observed.

## Durable Coverage Changed In The Codebase

| Path | Change | Requirement / Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | Updated: step 6b for in-run candidates and in-run `@`, plus a no-in-run-marker check on the step 1 note | AC-001..004, AC-006 at the wire, 3 roots | Pass 3/3 |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Updated: obsolete exclusion assertions in T01/O01/P01/N03 replaced; copy checks in A01/F01; S01 extended with the reported scenario | REQ-001, REQ-005, REQ-006, AC-003, AC-006 | Pass (Claude, 19 + 2 N/A) |
| `TESTING.md` | Updated: what the two suites now cover; how to run without the user's package roots | — | — |

- Removed obsolete assertions: "configured members / mounted Teams / the Team's members are not offered" (REQ-001, REQ-005). They were replaced in the same cases by "are offered".

## Other Execution Artifacts

| Artifact | Purpose | Retained |
| --- | --- | --- |
| `api-e2e-evidence/logs/` | command logs | Retained |
| `api-e2e-evidence/R-05/` | wire E2E JSON receipts | Retained |
| `api-e2e-evidence/L-CLAUDE/` | live probe evidence, screenshots, logs | Retained |
| `api-e2e-evidence/H-desktop/` | desktop screenshots 00–08, `journey.mp4` (1.5 MB, compressed) | Retained; full-quality copy at `~/Downloads/mention-candidates-in-run-journey.mp4` |

## Temporary Execution Methods / Scaffolding

| Method | Why | Cleanup |
| --- | --- | --- |
| Temp base worktree `/tmp/mci-base-f48dbfbf3` | baseline for the server failing file | symlinks unlinked; worktree removed |
| Web baseline run in the main superrepo checkout (at `f48dbfbf3`, the exact base) | baseline for the web failing spec (the base worktree could not host the Nuxt test environment) | read-only test run; nothing modified |
| `/tmp/mci/*.js`, `/tmp/ab2*.{sh,py}` driver scripts | drive the desktop app | temporary |

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| AGY CLI in the wire E2E | repository scripted fake | no model choice there (covered live) |

## Result Summary

| Result | Cases |
| --- | --- |
| Pass | R-00..R-05, L-CLAUDE, H-DESKTOP |
| Not Tested | L01/L02 (AGY-only); AutoByteus runtime (no keys; change is runtime-agnostic) |

## Cleanup Performed

| Resource | Action | Result |
| --- | --- | --- |
| In-process servers / temp data (R-05) | `afterAll` | data removed, servers closed, 0 roots |
| Probe backend / Nuxt / Chrome / temp root (L-CLAUDE) | probe `finally` | SIGTERM; root removed; no browser errors |
| Isolated instance `iso-61627-e021` | `isolated-app stop` | data root removed; ports released |
| Temp base worktree | removed | clean |

## Preliminary Classification

N/A — Pass.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.3%; 95% target met: `Yes`; no category below 90%.
- Broader validation: `Required`, executed (live Claude probe + human-style packaged desktop journey in en and zh-CN).
- Critical ACs lacking direct proof: None.
- Next recipient: `/delivery_engineer` (direct route; test-review `Not Required — direct low-risk route`).
- Notes and residual risks:
  - The design's accepted residual: the per-run menu shows the focused member its own definition (seen in the Team menu, where Research Assistant is listed while it is focused). It is harmless.
  - The footer shows the member's run name (e.g. "research_assistant gets your message…"); this is pre-existing naming.
  - The agent's choice between messaging the existing instance and delegating a copy depends on the model and the user's wording. In all three live checks, Claude messaged the existing instance.
