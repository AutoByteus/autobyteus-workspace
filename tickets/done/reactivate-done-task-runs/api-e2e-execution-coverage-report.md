# API/E2E Execution Coverage Report — `reactivate-done-task-runs`

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/requirements-doc.md` (SR-002)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: CRR-001 Pass (`/code_reviewer`), commit `3394e7078`
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Large`; Architectural risk: `High`
- Input route: `Reviewed`; Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with additions:
  - USER-JOURNEY, added at the user's request;
  - an attach-only CDP helper instead of the missing browser-automation launcher;
  - the `CODEX_E2E_TOOL_MODEL` override for the live mixed suite.
- Coverage decisions revised during execution:
  - The race assertions now classify outcomes by result message. That allows four orderings, all within the design (P-001), and the invariants are unchanged.
  - Two of my own regex/lookup assertions were corrected after I checked the actual behavior against `docs/modules/projects.md`. These were test defects, not product defects (ledger events 6, 7, 20).
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`; each completed case was recorded immediately: `Yes`; checkpoints were recorded: `Yes`; reconciled: `Yes`
- Last durable event: 22. Nothing is running or unstarted.
- Interruption note: the user interrupted twice, to request real-user testing (added as USER-JOURNEY) and to ask for status. No case was left unresolved.

| Case ID | Final Result | Last Event | Evidence | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| REPO-UNIT | Pass | 1 | `api-e2e-evidence/unit-focused.log` | — |
| REPO-INT | Pass | 2 | `api-e2e-evidence/integration.log` | — |
| REPO-CONTRACT | Pass | 3 | `api-e2e-evidence/*contracts.log` | 7 collab failures are pre-existing on base (`cfeda548`), same set |
| REPO-WEB | Pass | 4 | `api-e2e-evidence/web*.log` | — |
| REPO-E2E-BASE / FINAL | Pass | 5 / 22 | `api-e2e-evidence/e2e-projects-{baseline,final}.log` | — |
| E2E-RA-AGENT / TEAM / ORG | Pass | 18 | `api-e2e-evidence/server-e2e/` | — |
| E2E-RA-RACE | Pass | 21, 22 | `api-e2e-evidence/server-e2e*/` | — |
| E2E-RA-LIVE-CLAUDE | Pass | 18 | `api-e2e-evidence/server-e2e/task-reactivation-root-visibility.json` | — |
| BR-008..BR-011 | Pass | 11, 19 | `api-e2e-evidence/browser-reactivation/`, `browser-full/` | — |
| BR-ALL (BR-001..011) | Pass | 19 | `api-e2e-evidence/browser-full/evidence.json` | — |
| USER-JOURNEY | Pass | 14 | `api-e2e-evidence/user-journey/` | — |
| LIVE-MIXED | Pass | 17 | `api-e2e-evidence/live-mixed-task-delegation.log` | — |

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`. Legacy retention observed: `No`.
- Persisted-data transition followed (`Directly Usable — No Migration`): `Yes`.
  - Real DONE-written entries are reopened through the normal reader/writer.
  - Only `closedAt → null` on the one entry.
  - `task.json` is byte-identical across a reactivation.
  - Works after real restarts.
- Compatibility-only durable coverage: `No`

## Changed Boundary And Evidence Matrix

| Case ID | Requirement / AC | Changed Boundary | Execution Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-RA-* | AC-001 (incl. same run, earlier conversation, provider-conversation binding on the worker's tree node, result note), AC-002, AC-003 (ad hoc → TODO), AC-005, AC-006/QR-002 (Task-copy sender; Team/Org configured teammates), AC-007, AC-008 (`TASK_NOT_FOUND`), AC-010 (DONE → TODO → again), AC-012, AC-014 (status-only reopen; open/second message unchanged), AC-015 (refusal + byte-identical files) | Router → 3 root facades → lifecycle DS-L1 → port/Task side → adapters/backends → events/projectors → WS/GraphQL | Real Studio HTTP/WS/scoped MCP, scripted AGY actor | Durable | Pass | `server-e2e/` |
| E2E-RA-RACE | QR-001 | Cross-root DONE vs reactivation | same | Durable | Pass | Observed orderings: reactivated-then-done; done-after-commit (restore stopped); done-after-commit (fence). Invariants: Task DONE, entry closed, closed in snapshot, no live worker process (lsof cwd), later input refused with the DONE hint |
| E2E-RA-LIVE-CLAUDE | AC-001 (knowledge), REQ-002 | Real Claude runtime restore | same + real model worker | Durable (gated), Live | Pass | Worker answered the codeword after reactivation |
| BR-008..010 | AC-004 live/reload, AC-002, AC-005, AC-014/015 in the tree | Stream → web closure state → tree rows | Built backend + Nuxt + Chrome | Durable, Browser | Pass | `browser-full/` screenshots |
| BR-011 | AC-004 restart, AC-010, AC-011 | Persisted entries → restart → snapshot; restart-path restore (no in-memory authority) | Real backend restarts ×2 | Durable, Browser | Pass | `browser-full/evidence.json` |
| USER-JOURNEY | AC-001, AC-002, AC-003 (ad hoc), AC-004, AC-010, AC-011, AC-013 (agent learned reopen-then-message from tool texts), REQ-003 | Whole product, desktop shell, real models | Isolated desktop instance (worktree build), UI only, Claude `claude-opus-5-5` | Desktop, Live | Pass | `user-journey/journey-receipt.md` |
| LIVE-MIXED | AC-012, AC-014 (live idle shutdown/wake unchanged) | Live AutoByteus/Codex/Claude children | LM Studio + Codex + Claude | Durable (gated), Live | Pass | `live-mixed-task-delegation.log` |
| REPO-* | All, logic level; AC-009, AC-013 contract | Unit/integration/contract/web | Vitest/node:test | Durable | Pass | logs |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 7 | `RUN_AGY_FAILURE_E2E=1 RUN_CLAUDE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fake> TASK_REACTIVATION_E2E_EVIDENCE_DIR=… vitest run tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` (`env -u AUTOBYTEUS_*`) | `autobyteus-server-ts` | E2E-RA-* | Pass 5/5 | `server-e2e/run.log` |
| 7b | same, `-t QR-001` ×3 after the classifier fix | same | Race | Pass 3/3 | `/tmp/rdtr-api/race-*.log` |
| 8 | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir …/browser-full` | root | BR-001..011 | Pass 11/11 | `browser-full/evidence.json` |
| 9 | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.6-luna vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | `autobyteus-server-ts` (test DB `.env.test`) | Live runtimes | Pass 4/4 | `live-mixed-task-delegation.log` |
| 10 | gated `vitest run tests/e2e/projects` | `autobyteus-server-ts` | All Projects E2E | Pass: 31 + 1 skipped (gated live case) | `e2e-projects-final.log` |
| 11 | `pnpm -C autobyteus-web build:electron:mac` + `pnpm isolated-app start --from-worktree` | root | Desktop build | Pass | `user-journey/iso-*.json` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 60% | 96% | +36 | AC-001..008 and AC-010..015 proven directly through real roots. AC-009 is proven on the Task side and in the lifecycle (unit) | AC-009 has no end-to-end case (needs a forced start failure) |
| Changed-boundary execution directness | 55% | 97% | +42 | Router, all 3 facades, DS-L1, real backends, projectors, web state, tree | — |
| Integration realism / mock gap | 55% | 96% | +41 | Real HTTP/WS/MCP; real restarts; real Claude/Codex/LM Studio; real desktop app | The scripted AGY actor in the matrix layers (mitigated by the live layers) |
| Environment / fixture fidelity | 75% | 95% | +20 | Worktree desktop build; package imported through the UI; private data | Browser-automation launcher substituted by an equivalent CDP attach |
| Failure / edge / lifecycle / recovery | 60% | 95% | +35 | Refusals ×6 kinds, race with 3 observed orderings, DONE cycle, two restart paths | Stop-pending and missing-conversation refusals unit-only |
| User surface / browser / desktop shell | 50% | 96% | +46 | 11 browser cases; real desktop journey with live rows and restarts | Org and Team **roots** were not driven in the desktop journey (they were in the browser probe) |
| Durable regression coverage | 65% | 95% | +30 | New 5-case server E2E (gated like siblings), BR-008..011, TESTING.md | — |

- Overall post-repository confidence: 60%. Overall final confidence: **96%** (simple average 95.7).
- Every critical acceptance criterion directly proven: `Yes` (AC-009 is non-critical refusal plumbing, unit-proven on the real service).
- Any final category below 90%: `No`. 95% target met: `Yes`.
- Confidence-limiting residual risks: see Result Summary notes.

## Broader Validation Decision And Execution

- Decision: `Required`, executed as Live API (server E2E), Browser + Lifecycle (probe with real restarts), real-product desktop journey, and live mixed runtimes.
- Deviations: the browser-automation launcher was missing, so I used an attach-only CDP helper; the live suite needed the Codex model override.
- Environment: every layer used private temp data and free ports. The user's running AutoByteus (`/Applications/AutoByteus.app`, `~/.autobyteus`) was not touched.

| Scenario / Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Agent delegates, user accepts, agent sets DONE | Rows leave | Writer row left after the agent's own DONE | `user-journey/shots/02,03` | Pass |
| User asks for another round with the same worker | Agent reopens the Task, then messages the run ID; worker returns live with context | `create_or_update_task` IN_PROGRESS → `send_message_to`; "reactivated"; row back in ~5 s; worker used facts from round 1 | shots 04, 05 | Pass |
| Same for the Team copy | Coordinator ID; same team and members | Same `docs_reviewer_1f61…` / `docs_editor_6c45…`; no new nodes | shots 06 | Pass |
| DONE again; app restart; another round | Closed stays hidden; restart-path reactivation | Hidden after restart; row back in ~10 s; the writer rebuilt the accepted draft from its restored conversation | shots 07–10 | Pass |
| Second app restart | Reactivated row persists; closed Team hidden | As expected | shots 11 | Pass |

## Desktop Application Validation

- Approach: an isolated instance (`iso-52015-541c`) of this worktree's packaged build, controlled through its loopback CDP control port.
- Web-equivalent behavior: also proven by the browser probe. Shell lifecycle: the app was restarted twice with `isolated-app restart`.
- Effect on the running desktop app: `None`.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node 22.23.1; pnpm 10.28.2; Electron 42.4.1 (packaged); headless Chrome (playwright-core).
- Claude CLI 2.1.283; Codex CLI 0.160.1; LM Studio `qwen/qwen3.8-27b`.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Decision `Directly Usable — No Migration`: Pass.
  - Entries closed by real DONE are reopened by the normal current reader/writer.
  - Real backend and desktop restarts read the reopened entry (row listed) and the closed entries (hidden).
- Version-specific branch or fallback: `No`.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` | Added | AC-001..003, 005..008, 010, 012, 014, 015, QR-001/002; gated live Claude case | 5/5 Pass; folder run 31 + 1 skipped |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Updated (BR-008..BR-011, `restoreRoot`, header) | AC-002, 004, 005, 010, 011, 014, 015 in the browser | 11/11 Pass |
| `TESTING.md` | Updated (reactivation layers and commands) | Docs for the durable coverage | — |

- Added/updated paths attached for proportional test-code review: `Yes`
- Removed paths: none

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/user-journey/test-agent-package/` | Test agent package used by the journey | Retained (evidence) | Not product content |
| `api-e2e-evidence/user-journey/{journey-receipt.md, manager-conversation.txt, shots/, final-state/, iso-*.json, ui-cdp-helper.mjs}` | Real-user journey evidence | Retained | — |
| `api-e2e-evidence/server-e2e*/`, `browser-*`, logs | Execution evidence | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result | Cleanup |
| --- | --- | --- | --- |
| `ui-cdp-helper.mjs` (kept as evidence; it ran from `/tmp/rdtr-api`) | Drive the desktop instance (browser-automation launcher absent) | Journey Pass | Never closed the app; instance stopped by `isolated-app stop` |
| Temporary `DIAG` logging in the race test | Diagnose the restore-failed ordering | Diagnosis recorded | Removed before the final runs |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model/CLI for the matrix layers | Repository scripted AGY CLI (`agy-failure-cli.mjs`, `linked_skills`) | Deterministic tool calls for the matrix | Covered by the real-model layers (live Claude case, desktop journey, live mixed) |

## Result Summary

| Result | Case IDs | Summary |
| --- | --- | --- |
| Pass | All | See matrix |
| Not Tested (end-to-end) | AC-009; `TASK_EXECUTION_CONTEXT_UNAVAILABLE`, `TASK_REACTIVATION_STOP_PENDING` | These need forced internal failures; they are unit-covered on real services/registries |

Non-blocking observation **O-1** (for the Solution Designer, informational; no requirement violated):
- **Trigger:** a DONE that commits right after a reactivation (race, another root).
- **What happens:** the assigner's result reads "…X was reactivated (its Task work is open again) but did not receive this message; message it again." The fence variant prefixes "…is closed (Task DONE)."
- **Why it is only an observation:**
  - The parenthetical is stale at the moment it is returned.
  - The text is the design's accepted P-001 wording.
  - Messaging again yields the correct "This Task is DONE…" hint.
  - The QR-001 invariants hold.
- **Possible future wording:** "…was reactivated but did not receive this message."

Other residual notes:
- Org and Team **roots** were not driven in the real-model desktop journey; they are proven in the browser probe and server E2E.
- The live mixed suite's hard-coded Codex model names are stale on this machine (it needs `CODEX_E2E_TOOL_MODEL`). This is pre-existing and outside scope.
- `teamExecutionViewState.ts` size pressure (CRR-001) is carried forward.

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| In-process Studio servers / temp data | Test-owned | Test `afterAll` | `dataRemoved: true`, `serverClosed: true`, `remainingRoots: 0` |
| Probe backend/Nuxt/Chrome/data root | Probe-owned | Probe `finally` | browser closed, groups terminated, `dataRootRemoved: true` |
| Isolated instance `iso-52015-541c` | Mine | `isolated-app stop` | not forced; data root removed; both ports released; `list` empty |
| Live mixed suite runs | Test-owned | Suite cleanup | exit 0 |
| `/tmp/rdtr-api` scratch logs | Mine | Kept for reference; copies of relevant logs are in the ticket | — |

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96%
- Default 95% target met: `Yes`; any final category below 90%: `No`
- Broader validation: `Required`, executed
- Critical acceptance criteria lacking direct proof: None
- Next recipient: per `get_handoff_rules` (proportional test-code review requested)
- Notes:
  - The durable test changes are uncommitted in the worktree:
    - `TESTING.md`;
    - `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`;
    - the new server E2E file;
    - the ticket artifacts.
  - Implementation commit `3394e7078` is unchanged.
