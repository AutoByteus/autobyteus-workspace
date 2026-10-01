# API/E2E Execution Coverage Report — cross-scope-agent-mentions

## Execution Round Meta

- Requirements Doc: `tickets/in-progress/cross-scope-agent-mentions/requirements-doc.md` (Approved, SR-008, incl. RD-004 as REQ-014/AC-016)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-010)
- Supplemental Task Artifacts: `architecture-design-handoff.md`, `product-design-request-handoff.md`, `product-design-revision-request-handoff.md`; approved SR-008 UI/UX spec with VIS-001–015 at `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/` (supersedes the 2026-09-30 spec)
- Design Review Report: `design-review-report.md` (ARCH-REV-004, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-004)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-005, round 5, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md` (round-2 section)
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md` (round-2 section)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003` (TR-001 test-review Local Fix on API-REV-002)
- Current Execution Round: 2
- Trigger: code review pass CRR-005 after the SR-010 redesign (IR-004)
- Prior Round Reviewed: round 1 (API-REV-001, Fail: F-01–F-04, U-01/DI-001)
- Latest Authoritative Round: 2

Ticket paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/`. Branch `codex/cross-scope-agent-mentions` @ `bcff48200`; this stage changed only test code and ticket artifacts.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation: `api-e2e-coverage-investigation.md`, round-2 section, written before rewriting coverage and before final execution.
- Plan followed: `Yes`. The two SR-007 live tests (live E2E and browser probe) asserted `delegate_task` to collaborators, task notices and the null-result notice, and were rewritten for SR-010.
- Decisions revised during execution: whether a coordinator follows its handoff is the model's choice, so the browser probe records it as an observation; DI-001 is asserted by the live E2E's dedicated case with explicit instructions. The live E2E waits for the model's first **accepted** tool call (a model may retry after a malformed call the server rightly rejects).
- Reroute required: `No`.

## Prior Failure Resolution (round 1 → round 2)

| Prior Failure | Round-2 Evidence | Result |
| --- | --- | --- |
| F-01 Team: next send after an `@` send failed | T01: the researcher's second send with `@Code Reviewer` is accepted, adds the collaborator Agent, which reports ("From Code Reviewer:") | Resolved |
| F-02 Team: collaborator Team collapsed | T01: opened with both members at first appearance (VIS-015) | Resolved |
| F-03 raw address names | rows "product team"/"product prototyper"; Team/Org tabs "to/from product prototyper", "to/from code reviewer" | Resolved |
| F-04 Agent-root collaborator view | header ⚙/＋ present; placeholder "Message code reviewer…" | Resolved |
| U-01 / DI-001 collaborator Team handoff by address | LE-02 Pass on Claude, Codex, AGY, AutoByteus: lead → mate → lead → host, mate's conversation starts with the lead's message | Resolved |

## Test-Case Ledger Reconciliation

- Ledger: `api-e2e-test-case-ledger.md` → "Round 2"; initialized before execution; every case recorded; reconciled here. Nothing running or unstarted.

| Case ID | Final Result | Evidence | Note |
| --- | --- | --- | --- |
| RC-01 typecheck/build | Pass | `/tmp/csam2-tsc.log` | — |
| RC-02 contracts, autobyteus-ts | Pass | console | collab-stream 7 failures pre-existing |
| RC-03 server unit (+ skill-improvement) | Pass | `/tmp/csam2-unit.json` | 82 = 78 base set + 4 skill-improvement failing identically on base |
| RC-04 server integration | Pass | `/tmp/csam2-int.json` | 46, all base set |
| RC-05 server e2e (full) | Pass | `/tmp/csam2-e2e.json` | 41, all base set |
| RC-06 web | Pass | `/tmp/csam2-web.json` | 4 + 1 load error, base set |
| LE-01/LE-02 Claude, Codex (final file) | Pass ×4 | `r2-le-claude-codex-final.log` (also `r2-le-claude.log`, `r2-le-codex.log`) | — |
| LE-01/LE-02 AGY | Pass ×2 | `r2-le-agy.log` | — |
| LE-01 AutoByteus (LM Studio qwen) | Pass | `r2-le-lmstudio.log` | 14 min (local model) |
| LE-02 AutoByteus | Pass | `r2-le-lmstudio-di001.log` | with `COLLABORATOR_E2E_STEP_TIMEOUT_MS=1500000` (slow local model; default budget timed out after the lead's handoff had already reached the mate) |
| LE-01/LE-02 Grok (ACP) | Blocked (provider quota) | `r2-le-grok.log` | `429 free-usage-exhausted`, only model `grok-4.7` |
| Browser A01–A05, T01, T02, O01, O02, F01, P01, N01 (Claude) | 12 Pass + 2 Not Applicable (L01/L02), 0 page errors | `r2-browser-final/` | L01/L02 need a process-bound runtime and did not run on Claude; they Pass on AGY (next row). The `r2-browser-final` evidence JSON predates TR-001 and labels them `Pass` with a `notApplicable` reason; the runner now records `Not Applicable` (`r2-browser-tr001/`) |
| L01, L02 (AGY) | Pass | `r2-browser-agy-lifecycle/` | — |
| LAT-01 admission latency | Measured | `r2-latency/` | see table |

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`
- Compatibility-only behavior observed: `No`
- Approved persisted-data transition followed: `Yes` (`Directly Usable — No Migration`)
- Durable coverage kept only for compatibility: `No`

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / AC | Changed Boundary | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| LE-01 (Claude, Codex, AGY, AutoByteus) | AC-014 pre-mention reason, no package; AC-003 one instance with its run ID and the run's settings, Offline, nothing delivered at the ack; briefing by `send_message_to` starts it; AC-005 briefing and report are communication messages; AC-016 the collaborator conversation starts with `inter_agent_message` from the host (no task notice) and the host conversation has `inter_agent_message` from the collaborator, user messages stay user; AC-011 no longer offered; AC-004 a second mention reuses the run ID; AC-015 `delegate_task(<address>)` extra copy with its own run ID and the system task notice, instance unchanged; AC-006 Stop keeps the run ID; another run's `send_message_to(<run ID>)` rejected `TARGET_AGENT_RUN_NOT_ACTIVE` and it sees no collaborator; AC-012 a message through `/ws/agent-collaboration` restores the host and wakes the same run, which answers | admission, hosting, messaging, replay, Agent-root stream, tool exposure and sender recording per runtime | in-process studio server, real runtimes | Durable (live-gated) | Pass ×4; Grok Blocked | `r2-le-*.log` |
| LE-02 (same four) | AC-003 / DI-001 | collaborator Team member placement | same | Durable (live-gated) | Pass ×4 | `r2-le-*.log` |
| A01 | UXJ-005; VIS-002/003/011/012/013/014/015; AC-001/002/007/010/011/012; F-04 | menu, chips, held send, Offline-at-send row, `send_message_to` card, "From" report, Team tab rows, collaborator view, collaborator Team opened once | browser (Claude haiku) | Durable probe | Pass | `r2-browser-final/A01-*.png` |
| A02 | AC-006, AC-016 replay | Stop → reload: rows Offline, viewing does not restore; collaborator view starts "From Research Assistant:"; a send wakes the same run ID | browser | Durable probe | Pass | same |
| A03 | AC-006, AC-016 replay | backend restart: stored rows; host replay "From Code Reviewer:"; a send restores with the same run ID | browser + restart | Durable probe | Pass | same |
| A04 | AC-016 old traces | traces without `sender_id` replay user-style; user messages unchanged | browser + trace rewrite | Durable probe | Pass | same |
| A05 | AR-001 | clicking, and reloading with, a stopped run's collaborator selected leaves the host inactive | browser | Durable probe | Pass | `r2-browser-final/`, `r2-browser-a05/` |
| T01 | UXJ-001; VIS-001/004/006/015; F-02/F-03; CR-003; AC-011 | Team transport with mentions, held send, rows, tab | browser | Durable probe | Pass | `r2-browser-final/T01-*.png` |
| T02 | UXJ-002, VIS-005 | collaborator Team coordinator view "From Researcher:", no notice; direct chat | browser | Durable probe | Pass | same |
| O01 | UXJ-004, VIS-008/009 | Org menu; two mentions; Offline at once; `send_message_to` ×2; "From" reports; Org tab rows with formatted names | browser | Durable probe | Pass | same |
| O02 | VIS-010 | Org collaborator Agent view "From Analyst:"; direct chat | browser | Durable probe | Pass | same |
| F01 | UXJ-003, VIS-007, AC-008/011 | real failure through standalone ack, Team ERROR and Org collaboration ack | browser + Settings (`LMSTUDIO_HOSTS`) | Durable probe | Pass | `r2-browser-final/F01-*.png` |
| L01/L02 | RS-003, CR-001/002 under SR-010 | AGY host crash keeps root + collaborator; collaborator answers; host restored; Delete ends root first (collaborator process stops, run dir removed); Archive ends a lingering root | browser + SIGKILL of the probe-owned host process | Durable probe (AGY) | Pass | `r2-browser-agy-lifecycle/` |
| P01/N01 | AC-013 | old-shape Team/Org trees reopen and continue; New chat `@` unchanged | browser | Durable probe | Pass | same |
| LAT-01 | CR item 7, C-12 | admission time inside the root gate and its effect on other sends | owned backend + Team WS | Temporary | Measured | `r2-latency/` |

## Additional Repository Coverage Execution

| Order | Command | Configuration | Proves | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `npx vitest run tests/skill-improvement/skill-improvement-graphql-resolver.test.ts tests/skill-improvement/skill-improvement-target-notification-service.test.ts` | base worktree `/tmp/csam-base` | the 4 failures are pre-existing | same 4 fail on base | console |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Change | Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 72% | 96% | +24 | AC-001–016 proven live through real entry points on four runtimes and three run kinds; all prior failures resolved | Grok live for SR-010 (quota); application-owned runs not live |
| Changed-boundary execution directness | 70% | 96% | +26 | admission, hosting, messaging, replay, three transports, Agent-root stream, history actions exercised for real | — |
| Cross-boundary integration realism and mock gap | 60% | 95% | +35 | real runtimes, server, browser, provider settings | Grok (no ACP-specific change in IR-004; shared paths proven on four runtimes) |
| Environment, configuration, identity, and fixture fidelity | 70% | 93% | +23 | owned data roots, real CLI logins, LM Studio | Grok quota; slow local model needs a longer step budget |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 97% | +17 | real add failure on all transports; Stop/reopen/restart; AGY crash → Delete/Archive; old traces; viewing doesn't restore; latency | — |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | +35 | every VIS-001–015 surface rendered and compared; 0 page errors | R-1 cosmetic host label casing in VIS-013's Team tab |
| Durable regression coverage quality and relevance | 80% | 93% | +13 | live-gated per-runtime E2E (two cases), full browser probe, corrected stale e2e tests | live tests depend on model compliance (mitigated as described) |

- Overall post-repository confidence: 71%
- Overall final confidence: **95%** (simple average 95.0)
- Every critical acceptance criterion directly proven: `Yes`
- Any final category below 90%: `No`
- Default 95% target met: `Yes`
- Confidence-limiting residual risks: Grok/ACP not run live for SR-010 (provider quota); application-owned runs not run live.

## Broader Validation Decision And Execution

- Decision: `Required`, executed: Live API (Claude, Codex, AGY, AutoByteus; Grok blocked by quota), Browser (real stack, Claude haiku), Lifecycle (AGY process crash), Persisted data (old traces, old trees), admission latency.
- Startup: the live E2E uses the in-process studio server with a temp data dir; the probe and the latency script each start their own backend (`dist/app.js`) and (probe) Nuxt dev on free ports with an owned temp data root and sanitized env. The user's app (port 29695) and `~/.autobyteus` were not touched; only runtime processes under the probe's own backend PID were signalled.
- Seed: shared definitions via GraphQL (Research Assistant, Code Reviewer, Researcher, Writer, Analyst, Product Prototyper, Prototype Bootstrapper, Product Team with an authored handoff, Review Team, Launch Org).

| Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Send with `@` (standalone) | collaborator row at once, Offline, before the briefing; composer cleared on acceptance | first seen Offline; composer cleared after acceptance | `A01-04` | Pass |
| Briefing | `send_message_to` card, no `delegate_task`; collaborator starts | as expected | `A01-05` | Pass |
| Report (VIS-012) | "From Code Reviewer:"; Team tab "to code reviewer" + "from code reviewer" | as expected | `A01-05` | Pass |
| Collaborator view (VIS-013, F-04) | name header, ⚙/＋, "Message code reviewer…", briefing first "From Research Assistant:", no task notice, run row not highlighted | as expected | `A01-06` | Pass (R-1 cosmetic) |
| Collaborator Team (standalone) | opened once, members Offline at first, spaced names | as expected | `A01-07` | Pass |
| Team run send (VIS-015) | Team row opened with members, Offline, immediately | as expected | `T01-02` | Pass |
| Team run briefed (VIS-004) | `send_message_to`, "From Product Prototyper:", tab "to/from product prototyper" | as expected | `T01-03` | Pass |
| CR-003 (VIS-006) | second `@` send from the same member adds a collaborator Agent | added; "From Code Reviewer:" | `T01-04` | Pass |
| Collaborator member view (VIS-005) | "From Researcher:" first, no notice; chat | as expected | `T02-01` | Pass |
| Org (VIS-008/009/010) | exclusions; two mentions; Offline at once; `send_message_to` ×2; "From" reports; tab rows; collaborator view "From Analyst:" | as expected | `O01-*`, `O02-01` | Pass |
| Real add failure (VIS-007), three transports | "Couldn't add Code Reviewer to this run … Nothing was added.", `role="alert"`, draft and chip kept, nothing sent, no row, still offered | as expected (reason "The model 'qwen/qwen3.8-27b:lmstudio@localhost:1234' is not available on autobyteus."); with the host restored, the kept draft sends and adds the collaborator | `F01-*` | Pass |
| Stop → reopen; restart | rows Offline; viewing does not restore; "From" on replay; a send wakes the same run ID | as expected | A02, A03, A05 | Pass |
| Old trace | user-style; user messages unchanged | as expected | A04 | Pass |
| AGY host crash | root + collaborator survive; collaborator answers; host restored by a send; Delete ends root first; Archive ends a lingering root | as expected | L01, L02 | Pass |

## Admission Latency (CR item 7, C-12)

Team run with two members; every mention names a new definition, so each sample validates, allocates, prepares, commits and publishes inside the root gate. Time from SEND_MESSAGE to the accepted echo:

| Runtime / model | Plain send | Mention admission | Plain send to another member during an admission |
| --- | --- | --- | --- |
| Claude `haiku` | 2–74 ms | 1013–1096 ms | 2–3 ms |
| Codex `gpt-5.5` | 2–277 ms | 554 ms first, then 23–36 ms | 2 ms |
| AutoByteus LM Studio `qwen3.8-27b` | 10–41 ms | 34–65 ms | 6–10 ms |

Admission holds the gate for at most about 1 s (Claude's model-selection catalog on each admission); ordinary sends to other members are not delayed. Commands that take the same gate (another mention, `delegate_task`) would wait up to that long — the approved design (C-12), and bounded. Side observation: a Codex run on a model that is not in this machine's Codex catalog (`gpt-5.4-mini`) refuses every mention with `COLLABORATOR_ADD_FAILED` "The model 'gpt-5.4-mini' is not available on codex_app_server." — correct per REQ-008.

## Desktop Application Validation

- Browser dev-path against the worktree's own backend build and Nuxt dev (TESTING.md: renderer UI → browser dev-path probe). No Electron shell code changed. Effect on the running desktop app: `None`.
- Real desktop journeys (API-REV-004, user-requested): an isolated Electron instance built from this worktree (`pnpm --silent isolated-app start --build`, own ports and temp data root), the public agent package (`https://github.com/AutoByteus/autobyteus-agents`) imported through Settings → Agent Packages, Claude `haiku`. Driven over the instance's control port by `api-e2e-evidence/r3-desktop/desktop-journeys.mjs`. The user's AutoByteus and its data were not touched.

| Case | Journey | Result |
| --- | --- | --- |
| D0 | import the public package | Pass |
| D1 | Daily Assistant (standalone) `@` Software Engineering Team: menu, added at once Offline, briefing, "From Daily Assistant:", direct chat | Pass |
| D2 | SE Team run, solution designer `@` Product Prototyper then `@` Product Team (second `@` accepted, CR-003), rows, Team tab | Pass |
| D3 | SE Team run, delivery engineer `@` Marketing Team: menu (already-added not offered), footer, rows, coordinator started | Pass (OBS-D3: driver check disturbed by a manual click) |
| BI-1…4 | each added collaborator opened (Idle), messaged directly, replies to its host with `send_message_to`; host shows "From <collaborator>:" with the token | Pass 4/4 |
| RESTORE | `isolated-app restart` (Electron + server, same data): same 14 collaborator rows, all Offline, all 7 conversations unchanged; RS-1…4: each collaborator wakes on a direct message and replies to its host, and each host's `send_message_to` reaches its collaborator ("From <host>:") | Pass (25 checks) |

- OBS-D1: unprompted report-backs depend on the agent (one re-briefing dropped "report back"); the explicit round trips prove both directions.
- OBS-D3: during D3 the focused view moved from delivery engineer to marketing content creator with no driver click (`D3-02` shows delivery engineer still focused right after the add). Explained: the user confirmed they clicked the UI manually during the run; not a product behaviour. Delivery is proven (receiving Team tab, BI-3, RS-3).

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node v22.21.1; system Google Chrome via playwright-core, headless, 1512×952 and 1024×640, `en-US`.
- Runtimes: Claude Agent SDK (`haiku`), Codex app server (catalog pick / `gpt-5.5`), AGY (`gemini-3.8-flash-low`), AutoByteus over LM Studio (`qwen/qwen3.8-27b`), Grok Build ACP (`grok-4.7`, quota-blocked).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`.
- Exercised: Team/Org trees without `collaborators` (P01); host traces without `sender_id` (A04); Stop/reopen/restart restore collaborators Offline with the same run IDs (A02/A03, LE-01).
- Full desktop app + server restart on the same data (API-REV-004 RESTORE): Agent-root and Team-root collaborator trees and conversations identical; sending continues in both directions.
- Version-specific branch or fallback observed: `No`.

## TR-001 Local Fix (CRR-006, API-REV-003)

- `cross-scope-agent-mentions-live-probe.mjs`: a case returning `{ notApplicable }` is recorded as `Not Applicable` with its reason, printed as such, excluded from the pass count and does not fail the exit code; a `Summary: N Pass, N Fail, N Not Applicable` line and `evidence.summary` were added; the redundant `void execFileSync` was removed (the import is used by the crash cases).
- Re-run: `node tests/e2e/cross-scope-agent-mentions-live-probe.mjs --cases N01,L01` (Claude) → `L01 Not Applicable — host-crash cases need a process-bound runtime…`, `N01 Pass`, `Summary: 1 Pass, 0 Fail, 1 Not Applicable`, exit 0 (`api-e2e-evidence/r2-browser-tr001/`).
- Environment note: the first attempt failed at backend start because round-2 cleanup had removed the `pnpm prepare:shared` output that `dist/app.js` imports; rebuilt with `pnpm prepare:shared` (the documented prerequisite) and removed again afterwards.
- No change to any other result or confidence.

## Durable Coverage Changed In The Codebase

All uncommitted, all owned by API/E2E, listed for the proportional test-code review:

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | Added in API-REV-001; **rewritten** in API-REV-002 for SR-010 | per runtime: AC-003/004/005/006/011/012/014/015/016; DI-001 case | Pass on Claude, Codex, AGY, AutoByteus; Grok blocked |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Added in API-REV-001; **rewritten** in API-REV-002 for SR-010 | UXJ-001–005, VIS-001–015, AC-006/008/013/016, AR-001, RS-003 | 12 Pass + 2 Not Applicable on Claude; L01/L02 Pass on AGY |
| `autobyteus-web/package.json` (`test:e2e:cross-scope-agent-mentions`) | Updated in API-REV-001 | probe script | — |
| `autobyteus-server-ts/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` | Updated in API-REV-001 | Stop ends the Agent root first | Pass |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` | Updated in API-REV-001 | Agent Tools MCP attached to standalone Grok runs | Pass 6/6 |
| `autobyteus-server-ts/tests/fixtures/grok-acp/fake-acp-agent.mjs` | Updated in API-REV-001 | opt-in `FAKE_ACP_REPORT_MCP_READY` | ACP/Grok unit pass |
| `autobyteus-server-ts/tests/skill-improvement/skill-improvement-improver-session-service.test.ts` | Updated in API-REV-001 | improver launches as `server_helper` | Pass |

- Removed durable tests: none.

## Other Execution Artifacts

| Artifact Path | Purpose | Retained |
| --- | --- | --- |
| `api-e2e-evidence/r2-le-*.log` | live E2E logs per runtime | Yes |
| `api-e2e-evidence/r2-browser-final/` (+ `r2-browser-1`, `-2`, `-a05`, `-agy-lifecycle`) | screenshots, evidence JSON, backend/frontend logs | Yes |
| `api-e2e-evidence/r2-latency/latency-probe.mjs` | admission latency script | Yes (temporary method) |
| round-1 evidence (`browser*`, `le-01-*`, `F-01-…`, `c-02-observation.log`) | history | Yes |

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| `/tmp/csam-base` git worktree (offline install) | base status of files first run in round 2 | 4 skill-improvement failures pre-existing | removed |
| `r2-latency/latency-probe.mjs` (owned backend) | measure admission in the gate | table above | the script stops its backend and removes its data root |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| "Collaborator cannot run with the run's settings" | the user changes the LM Studio host in Settings (`updateServerSetting LMSTUDIO_HOSTS`) and the catalog reloads, so the run's model is no longer available | a real product path that produces REQ-008's condition | exercised on AutoByteus; the same validator refused a Codex run on an unlisted model |

## Result Summary

| Result | Case IDs | Summary |
| --- | --- | --- |
| Pass | RC-01–06; LE-01/LE-02 on Claude, Codex, AGY, AutoByteus; A01–A05, T01, T02, O01, O02, F01, P01, N01 (Claude); L01/L02 (AGY); LAT-01 | see matrix |
| Pass (desktop, API-REV-004) | D0–D3, BI-1…4, RESTORE + RS-1…4 | real Electron instance, public package; see Desktop Application Validation |
| Not Applicable | L01/L02 on Claude | host-crash cases need a process-bound runtime; covered on AGY |
| Blocked (environment) | LE-01/LE-02 Grok | provider quota (`429 free-usage-exhausted`, only model `grok-4.7`); no ACP/Grok-specific code changed in IR-004; RD-004 recording for external runtimes goes through the shared accumulator proven on Claude, Codex and AGY |

### Residual notes (non-blocking)

- R-1 (cosmetic): in a standalone run's collaborator view, the Team-tab counterpart label for the host reads "research assistant" (shared formatter); VIS-013 shows "Research Assistant". Not in VIS-013's requirement-defining list; VIS-004/009/012 conventions match the build.
- R-2: an open page's stream reconnecting to a restarted server makes the Agent root command-ready and restores the host without a send (as Team streams do via `connect → resolveActiveTeamRun`, AR-001). Viewing after Stop or reload does not restore (A05).
- R-3: `send_message_to` by exact run ID from another root reaches a **live** collaborator (the existing live-only rule REQ-012 keeps); an Offline one is rejected (`TARGET_AGENT_RUN_NOT_ACTIVE`), as AC-006 requires after Stop/reopen.
- R-4: Grok/ACP SR-010 live run blocked by quota; rerun `RUN_GROK_E2E=1 npx vitest run tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` when it resets.
- R-5: application-owned runs not exercised live (server exclusions unit-tested; carried from round 1).
- Carried from round 1 (pre-existing): Grok card text for failed MCP calls (O-1); Claude/Codex run liveness not bound to the process (O-2); Claude auto-approves Agent Tools (O-6).
- Code-review notes acknowledged, not exercised: C-11 (Agent-root self-delegation), C-15 (inert leftover).

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| probe/latency backends, Nuxt dev, Chrome, temp data roots | owned | stopped / removed in `finally` | done (evidence `cleanup`) |
| in-process test servers, temp dirs | owned | `afterAll`/`afterEach` | done |
| AGY host processes killed in L01/L02 | owned (probe backend's children only) | SIGKILL by design | done |
| `/tmp/csam-base`, `/tmp/csam2` | owned | removed | done |
| untracked shared `dist/` from `pnpm prepare:shared` | created by this run | removed | done |
| isolated desktop instance `iso-65265-a875` and its temp data root | owned | `pnpm --silent isolated-app stop iso-65265-a875` | stopped; ports 65265/65267 free; no driver processes left |

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96% (API-REV-004 adds real desktop evidence; was 95%)
- Default 95% target met: `Yes`; any category below 90%: `No`
- Broader validation decision: `Required` — executed (Grok live blocked by provider quota, R-4)
- Critical acceptance criteria lacking direct proof: none
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review)
