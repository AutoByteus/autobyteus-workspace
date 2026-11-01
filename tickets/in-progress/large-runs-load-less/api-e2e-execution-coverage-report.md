# API/E2E Execution Coverage Report

The run record and the result: what ran, what it proves, how confident you are, and the outcome. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review CRR-002 Pass (reviewed route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-07 (AC-007) ran inside the hub probe's L-010, with new display checks, instead of a separate run. L-010 already opens the 20 × 60 KB unbroken-token copy, the scenario AC-007 names.
  - SCN-006b (a long token in a tool result) was settled from the code, not measured. The conversation's tool card shows only the tool name and a one-line, CSS-truncated summary built from the arguments (`ToolCallIndicator.vue`, `utils/toolCardPresentation.ts`). A tool result is never laid out in the conversation; it appears only in the Activity panel, on demand. The scripted AGY runtime emits no tool rows to measure in any case.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (after the failure-origin review)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `f4e7b1d13b` (code `438ea7fb65`) plus this round's probe files | macOS (Darwin 25.5.0), Node v22.23.1 | `delegated-launch-defaults-probe.mjs` stack: headless Chrome (playwright-core) → Nuxt dev → `autobyteus-server-ts/dist/app.js` (current: no server source newer than the build), scripted AGY (`agy-failure-cli.mjs`, `linked_skills`) | Clean env (`env -i PATH HOME USER LOGNAME TMPDIR`); probe-owned temp data root, HOME, SQLite and ports, removed after each run; desktop 1512×952 `en-US`; phone 390×844 (Phone Access paired through a private-network URL routed to the probe backend) |
| ENV-2 | same | same | `delegated-copies-large-hub-probe.mjs`: seed `--seed-to /tmp/ab358e2e/seed --teams 12 --unrelated 50` (34 s), then `--from-seed … --live --large-shape unbroken --samples 1` (own Nuxt dev + backend on a copy of the seed) | Test-owned seed: hub with 12 six-member Team copies, 60 × 10 KB copy→hub reports (hub log 627,887 bytes), 50 unrelated team runs; load 6.9–29.5 |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-008, all (repository layer) | every suite | Reused: IMP-12 (clean clone at `b58a3106c3`), IMP-13 (`438ea7fb65`, mobile), the code reviewer's 62/62 on the head | — | Pass | (implementation rows) | (implementation rows) | `git diff --name-only b58a3106c3 HEAD -- . ':!tickets'` lists only mobile files and the shared stub, which IMP-13 covers. Server integration's 6 failures are FU-001 (also on base) |
| API-02 | AC-001, AC-004, AC-005, AC-007; QR-001…QR-004 | seed probes | Reused: IMP-10 (`e66b453d5b`), IMP-11 (`b58a3106c3`) | — | Pass | (implementation rows) | (implementation rows) | Since `e66b453d5b` only the renderers (DS-007) and the mobile screens changed: no effect on the view, its requests or the scan. QR-002 was measured on a **stopped** hub only (see API-08) |
| API-03 | AC-003, QR-005, REQ-001 (Team) | browser, real stack | `pnpm -C autobyteus-web test:e2e:large-runs-load-less --output-dir <fresh>`, case LRL-001: a six-member Team run started from the Agent Teams page; the lead messages each member; stopped; a fresh page opens it from the Workspaces tree; then the designer; back to the lead; the Team tab | ENV-1 | Pass | `API-03-06-lrl-browser-probe.json` (LRL-001), `API-03-LRL-001-team-open.png` | `openOps`: one `GetTeamMemberRunProjection` and one `GetTeamMemberFileChanges`, for the lead; `otherOps`: one pair for the designer only; `backOps: {}`; `memberRowsShown: 6`; participant requests one per shown participant | Final run r3. Round r1 failed on the probe's own participant-count window (fixed) |
| API-04 | AC-003, QR-005 (Org) | same | Case LRL-002: an Org (manager, writer, analyst, placed Team `pair`) launched from the Org page; the manager messages the writer, the analyst and the pair; stopped; a fresh page opens it from the Workspaces tree; then the writer | ENV-1 | Pass | same (LRL-002), `API-04-LRL-002-org-opened.png`, `API-04-LRL-002-writer-opened.png` | `openOps: {}` (no member loads at open; `centerAtOpen` "Stopped Agent Org Select a member from the historical run in the sidebar…"); `writerOps`: one `GetAgentOrgMemberRunProjection` and one `GetAgentOrgMemberFileChanges` for the writer | With no selection nothing is staged (D-IMP-5) |
| API-05 | AC-002 live; SCN-002b, SCN-002c | browser, real Team stream | Case LRL-003: a live Team run; the worker's Team tab is shown while its participant response is fetched at once but delivered only after the lead's message M2 is stored; then the probe drops the Team stream and refuses reconnects while M3 is sent, then lets it reconnect | ENV-1 | Pass | same (LRL-003), `API-05-LRL-003-after-reconnect.png` | `heldResponseHasM2: false` (M2 came only from the live stream), `loadingShownWhileHeld: true`; `afterLoad` M2, M1; `afterReconnect` M3, M2, M1, each once; equal to the stored list | The stream drop is network emulation (`routeWebSocket`) |
| API-06 | AC-006; SCN-007, SCN-007b | browser (desktop and phone), real server | Case LRL-004: a stopped Team run with 3 stored messages; with the backend down, line 2 of `team_communication_messages_active.jsonl` is overwritten; restart; open the run; the Team tab; a message (resume); the phone's Activity → Details | ENV-1 | Pass | same (LRL-004), `API-06-LRL-004-team-tab-unavailable.png`, `API-06-LRL-004-resume-refused.png`, `API-06-LRL-004-phone-unavailable.png` | `memberRowsShown: 2`; `teamTabText` and `phoneText` "These messages can't be shown team_communication_messages_active.jsonl:line 2 is not valid JSON."; no partial rows; `restoreResponses` "success":false,"message":"Error: …line 2 is not valid JSON."; `activeAfterResume: false` | The resume is refused with the reason at the server, but the app shows nothing: the composer keeps the text and the reason goes only to the console (`resumeConsoleErrors`). That is the existing composer path for every failed send (FU-004) |
| API-07 | AC-007, QR-004 | browser, long-token copy | Large-hub probe L-010 with `--large-shape unbroken` (20 × 60 KB single-token messages to a copy, opened cold), with this round's display checks | ENV-2 | Pass | `API-07-08-hub-probe-live.json` (`cases.L-010`), `API-07-L-010-unbroken-copy-open.png` | `clickToStoreLoadedMs: 178.8`; `display`: `longClassBlocks: 40`, `leavesWithoutClass: 0`, `overflowing: 0`, `paneOverflow: false`, `selectedHasWholeToken: true`, `copyCommand: true`, `found: true`, `distanceFromBottom: 0` | Wrapping, copy (selection), find-in-page and the scroll position hold |
| API-08 | AC-001, AC-002, AC-004; REQ-002, REQ-003; hub regression | large-hub probe, live | `pnpm -C autobyteus-web test:e2e:delegated-copies-large-hub --from-seed /tmp/ab358e2e/seed --output-dir <fresh> --live --large-shape unbroken --samples 1` | ENV-2 | **Fail** | `API-07-08-hub-probe-live.json`, `API-08-hub-participant-reloads.log` | Every probe case passes (S-API, S-001, S-ROWS, L-001…L-011). The log shows L-001 (a **running** hub clicked): two hub `CollaborationParticipantMessages` 51 ms apart (lines 84, 86); L-004: the same (124, 126); L-002 (one new delegation, `snapshotsReceived: 1`): the hub's and the open copy's lists re-requested at the same ms (94, 95). S-001 (stopped hub): one (19) | See Failure Detail. The first attempt stopped at L-004 on the probe's call of the removed `isChildHydrated` (probe drift; fixed to read `MemberLoader`) |

### Failure Detail (API-08)

- **Observed.** On a running hub, the hub's participant list (its message log; 627,887 bytes in this seed, and the PM's hub log is 6.7 MB on disk, E-09) is requested again on every rebuild of the hub context:
  - **Opening (clicking) a running hub** requests it twice. The selection's inspection publishes a context and starts the Team tab's load. The live attach publishes another context 51 ms later, and `reloadRoot` abandons the in-flight load and requests the list again (L-001 lines 84/86; L-004 lines 124/126). A stopped hub requests it once (S-001 line 19).
  - **Each new delegation on a running hub** delivers one snapshot, and the republished context re-requests **every loaded list**: the hub's whole list and the open copy's (L-002 lines 94/95). The same happens on every later new copy, so the hub's log is transferred again per new row while the Team tab has it loaded.
- **Expected.** The problem the ticket fixes is the log moving with every view and snapshot ("a hub's view carries its whole message log … and one hub click reads it twice"). The desired outcome is "each screen asks for what it shows … one click reads once". The design cites `DESIGN.md` rule 3 ("a new-row update must not trigger avoidable repeated full-history transfer"). The view and snapshots no longer carry the log (AC-001, QR-001 met), but on a running hub the client now fetches the same log at the same moments: twice per open, and again per new delegation.
- **Where.** The design (DS-002) makes every publish of a new context instance a `reloadRoot` call site: "`agentRunCollaborationStore` `publish` of a new context instance (inspect, attach, gap `requireReopen` then reopen)". The reload's purpose is events lost in a stream gap. An inspect followed by an attach, and a snapshot republication on an intact stream, lose no events, yet they reload too.
- **Not affected.** Correctness: lists are complete and in order (API-05). Stopped hubs, Team runs and Org runs opened from history: one participant request per shown participant (S-001, API-03).
- **Scope.** It is a design problem in the code this change adds (the participant-list owner and its reload policy), so it belongs to this ticket (`ticket-scope.md`: "the change introduced it, including a design problem in the code the change adds"). Item 162's cost, the hub's log read twice per click, remains for a running hub, now through the participant query. It is not a regression against base, where the running hub's view and attach snapshot carried the log too.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (no message log in the view, stopped and running; QR-001) | Yes | API-02 (176,226 B), API-08 (S-API hub view 43,022 B in the 12-copy seed), API-01 | Proven | — |
| AC-002 (Team tab equals the stored log; a live message appears once, in order) | Yes | API-05 (during a load, across a dropped stream), API-03 (Team tab equals stored), API-01 | Proven | — |
| AC-003 (focused member only at open; next on open; QR-005) | Yes | API-03 (Team), API-04 (Org), API-08 (hub copies: one pair per copy open) | Proven | — |
| AC-004 (one view read per hub selection; QR-002) | Yes | API-02, API-08 (S-001 and L-001: no `GetAgentRunCollaboration` on the click) | Proven for the view. The hub's **message list** is read twice per running-hub click (API-08 failure) | — |
| AC-005 (scan independent of log size; no rescan on create; QR-003) | Yes | API-02 (85 vs 89 ms), API-01 | Proven | — |
| AC-006 (damaged log: Team tab unavailable with the reason; resume refused with the reason) | Yes | API-06 (desktop and phone; restore refused with the reason), API-01 | Proven. The app does not show the resume refusal's reason (FU-004, existing composer path) | — |
| AC-007 (unbroken-token copy within QR-004; wrapping, copy, search; scrolled to latest) | Yes | API-07 (178.8 ms, display checks), API-02 | Proven | — |
| AC-008 (full suites from a clean clone) | Yes | API-01 | Proven (FU-001 excepted, on base too) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 75% | API-01…API-08 | Every AC is proven, but a running hub re-reads its message list per open and per new delegation, against the ticket's outcome | Rework, then rerun API-08 |
| Changed-boundary execution directness | 75% | 95% | real server, real streams, real browser, phone | — | — |
| Cross-boundary integration realism and mock gap | 70% | 90% | scripted AGY over real tools and streams | No provider model | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | probe-owned stacks; test-owned seed; Phone Access pairing | Seed at 12 copies (QR numbers reused from the 50-copy seed) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 90% | API-05 (load race, dropped stream), API-06 (damaged log) | Sequence-gap reopen not produced (same `reloadRoot` path) | — |
| User-surface, browser, and desktop-shell confidence | 60% | 85% | API-03…API-07 | Resume refusal invisible (FU-004) | — |
| Durable regression coverage quality and relevance | 85% | 90% | new LRL-001…004; L-010 display checks; probe drift fixed | — | Test-code review |

- Overall post-repository confidence: 77%
- Overall final confidence: 88%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `Yes`: requirement proof (75%, the API-08 finding), user surface (85%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: the API-08 finding; FU-004

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Browser` (desktop and phone) on probe-owned real stacks
- Confidence gap or residual risk it addresses, and the expected gain: real request counts on Team/Org open (M-151), the live merge and reconnect, the damaged log through the UI, long-token display, and the hub's live journeys
- Browser validation needed, and why or why not: yes; the changed boundary is client loading over real transports
- If `Blocked`: N/A

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: runs written by the current code; a damaged current log (API-06)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-06 (a damaged package is listed, opens, and reports the reason where read)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs` | Added (LRL-001…LRL-004) | API-03…API-06 | — |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated: registers LRL-001…LRL-004 (header, import, registration with `backendUrl`, `dataRoot` and `restartBackend`) | API-03…API-06 | — |
| `autobyteus-web/package.json` | Updated: `test:e2e:large-runs-load-less` | API-03…API-06 | — |
| `autobyteus-web/tests/e2e/delegated-copies-large-hub-probe.mjs` | Updated: L-010's display checks with `--large-shape unbroken` (AC-007); baseline fix: the four reads of the removed `isChildHydrated` now ask `MemberLoader` (separate commit) | API-07, API-08 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model providers | scripted AGY CLI (real tool calls, real streams) | No provider proof needed; costs nothing | The model's own choices are typed by the probe |
| Network (API-05) | Playwright `route` holds one response; `routeWebSocket` drops the Team stream and refuses reconnects | Forces the load race and the stream gap on demand | The real network's timing |
| Phone (API-06) | Phone Access paired through a private-network URL routed to the probe backend | The server refuses loopback pairing URLs | No physical phone |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (LRL r1–r3, hub r1–r2) | Yes | backends, Nuxt and Chrome stopped; owned roots removed (cleanup receipts in the evidence JSON) | Done |
| Test-owned seed `/tmp/ab358e2e/seed` | Yes | kept for the rerun after rework, then removed | Kept (test-owned) |
| `/tmp/ab358e2e/` scratch logs | Yes | evidence copied into the ticket | Kept (scratch) |

## Preliminary Classification (On `Fail`)

- `Design Impact`. DS-002 makes every publish of a new context instance reload every loaded participant list, including an inspect followed at once by an attach, and a snapshot republication on an intact stream. The fix is a reload policy choice: reload only after a real gap, reconnect or reopen, and buffer across the attach of a freshly inspected context. That is the designer's call. A bounded `Local Fix` is possible if the reviewer finds the call sites can be narrowed within DS-002 as written.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: none. Every AC is proven; the failure is the running hub's repeated message-list transfer (API-08) against the ticket's outcome and `DESIGN.md` rule 3
- Preliminary classification and recommended owner: `Design Impact`, Solution Designer, via the code reviewer's failure-origin review
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes: FU-004 added (the app does not show a refused resume's reason).
