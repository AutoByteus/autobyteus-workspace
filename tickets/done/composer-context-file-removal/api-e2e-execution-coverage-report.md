# API/E2E Execution Coverage Report — composer-context-file-removal

## Execution Round Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-003)
- Supplemental Task Artifacts: none behavior-defining (19.png / 20.png evidence only)
- Design Review Report: `design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger (when used): `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: code review Pass (CRR-001)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

All relative paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/tickets/in-progress/composer-context-file-removal/` unless stated otherwise. Reviewed source: commit `dbd2e9a91` (branch `codex/composer-context-file-removal`; HEAD `42380226b` adds only ticket docs).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with three recorded revisions. (1) A standalone sub-team member was replaced by a nested Org team member, because standalone Teams are flat in the current product. (2) CF-009 produces the owner-less state through a real Org tree change during the pending window. (3) CF-010 was dropped because sends finalize drafts before any runtime sees them; the rationale is in the investigation.
- Existing coverage decisions revised during execution, with evidence: none; every existing test stays `Still Valid`.
- Reroute required before or during execution: `No`
- Notes: the first final run (`api-e2e-evidence/run-1`) failed CF-008 and CF-005 because of two probe defects:
  - The error-line read waited on an element that was being removed.
  - The journey disk check counted a draft that the failed CF-008 had left behind.

  Both were fixed in the probe. `run-2` is the authoritative run, and a stability rerun through the package script (`/tmp/ccfr-api-e2e/stability-1`) also passed 9/9.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`. The probe appends each case's result to the ledger the moment the case finishes, using `--ledger`.
- Long-running case checkpoints recorded when needed: `N/A` (the full run takes about one minute)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: run-2 CF-005 Pass
- Cases still running, interrupted, or not started: none
- Interruption, context-compression, or rerun note: run-1 → run-2 (probe-defect fixes, above)

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| CF-001 | Pass | run-2 | `api-e2e-evidence/run-2/evidence.json` → `cases.CF-001` | — |
| CF-002 | Pass | run-2 | `run-2/agent-copy-*.png`, evidence | — |
| CF-003 | Pass | run-2 | `run-2/team-copy-member-*.png`, evidence | — |
| CF-006 | Pass | run-2 | `run-2/{manager,new-chat,team-member,team-worker,org-member,org-team-member,org-task-agent}-*.png` | — |
| CF-007 | Pass | run-2 | evidence `cases.CF-007` | — |
| CF-008 | Pass | run-2 (run-1 probe defect) | `run-2/failure-remove-error.png`, `failure-upload-error.png` | probe fixed |
| CF-009 | Pass | run-2 | `run-2/pending-no-upload-owner.png`, `pending-after-send.png` | OBS-002 (out of scope) |
| CF-004 | Pass | run-2 | `run-2/outage-remove-error.png` | — |
| CF-005 | Pass | run-2 (run-1 cascade from CF-008) | `run-2/offline-*.png`, `backend-1..3.log` | probe fixed |
| CF-010 | N/A | — | — | Dropped (investigation rationale) |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The diff and the live run agree: one wildcard route pair, no per-kind draft routes, and every client delete goes to the attachment's own locator (the observed DELETE paths equal the upload locators).
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` (`Not Affected`; locators unchanged)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| CF-001 | AC-005, QR-001, REQ-001, RU-2, RU-3 | `GET`/`DELETE /rest/drafts/*`, codec, error mapping, remote-access policy | Live API, raw `http.request` against built `dist/app.js` | Durable + Live | Pass | evidence `cases.CF-001` |
| CF-002 | AC-001, AC-002, BEH-001 | Composer → store → `authorizedFetch` DELETE at locator → server (delegated Agent copy) | Browser (real stack) | Durable + Browser | Pass | `agent-copy-*.png` |
| CF-003 | AC-001, AC-002, BEH-001 (19.png kind) | Same, delegated Team-copy member | Browser | Durable + Browser | Pass | `team-copy-member-*.png` |
| CF-006 | AC-004, BEH-002, BEH-003 | Same path for every other run kind | Browser | Durable + Browser | Pass | 7 journeys, screenshots |
| CF-007 | AC-006, REQ-003 | Own-draft rule, clone path (`resolveContextAttachmentUrl`) | Browser | Durable + Browser | Pass | evidence `cases.CF-007` |
| CF-008 | AC-008, REQ-005, BEH-005, BEH-006 | Composer error state + rendering | Browser + one injected 5xx per step | Durable + Browser | Pass | `failure-*.png` |
| CF-009 | AC-007, REQ-004, BEH-004 | Upload gate, disabled `+` reason, path still accepted | Browser + finalize held + real Org tree change | Durable + Browser | Pass | `pending-*.png` |
| CF-004 | AC-008, RU-1 | Delete failure with the server unreachable; retry | Browser + real backend stop/start | Durable + Browser | Pass | `outage-remove-error.png` |
| CF-005 | AC-003 | Delegated children after the root is offline, a backend restart and a reload | Browser + process lifecycle | Durable + Browser | Pass | `offline-*.png` |

## Additional Repository Coverage Execution

None beyond the investigation's table: server typecheck, targeted (96 tests) and unit suites (5194 tests); web targeted (245 tests) and full suites (4026 tests). All pass.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | +20 | AC-001..AC-008 each directly exercised in a real browser on a real stack (CF-001..CF-009); disk and wire checked for every removal | The user's own desktop verification of 19.png is still pending (delivery gate); "app restart" is proven as a backend restart plus a reload, not a packaged-app restart |
| Changed-boundary execution directness | 75% | 97% | +22 | Real router, `/rest` prefix, remote-access hook, raw-HTTP traversal, real client `authorizedFetch` DELETE at the node URL | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | +25 | Client and server together; owners from real `delegate_task`; only the model is scripted (AGY fake CLI) | CF-008 injects one 5xx per step (CF-004 covers a real outage) |
| Environment, configuration, identity, and fixture fidelity | 75% | 95% | +20 | Built dist, private data root, real pairing for the bearer case, real Team/Org/delegated runs | Web-equivalent renderer, not the packaged Electron shell |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | +20 | Real outage + retry, injected failures, backend restarts, offline root, traversal sentinels, forged bearer | OBS-001 (pre-existing) |
| User-surface, browser, and desktop-shell confidence | 60% | 92% | +32 | Real clipboard paste (Cmd/Ctrl+V), real file chooser, rendered error line (`role="alert"`), disabled `+` title, zh-CN strings unit-tested | Electron native file drop not exercised (unchanged branch, component spec); user desktop verification pending |
| Durable regression coverage quality and relevance | 85% | 96% | +11 | New durable probe with package script and TESTING.md entry; passed twice | — |

- Overall post-repository confidence: 74%
- Overall final confidence: 95% (665 / 7 = 95.0)
- Calculation method: simple average of the seven categories
- Confidence change produced by broader validation: +21 points
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the user's own desktop verification of the 19.png case is still pending (it is the delivery gate); packaged Electron shell behavior is not directly exercised.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — Live API + Browser (web-equivalent renderer on a real stack).
- Material deviation from the planned mode or rationale: none.
- Confidence gap or residual risk actually addressed: real HTTP routing/normalization, real client delete on the node URL, real delegated owners, real paste and file chooser, lifecycle, outage, and the gate.
- Startup order, commands, and readiness results:
  - Order: `pnpm -C autobyteus-server-ts prebuild && build` (pass), then `pnpm -C autobyteus-web test:e2e:composer-context-file-removal --output-dir <ticket>/api-e2e-evidence/run-2 --ledger <ticket>/api-e2e-test-case-ledger.md`.
  - The probe starts the backend (ready on log `listening` + GraphQL), then Nuxt dev (ready on HTTP 200), then Chrome 154.0.8037.98, headless.
- Environment choices that materially affected the run:
  - `ANTIGRAVITY_CLI_COMMAND=autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, `AGY_FAKE_CASE=linked_skills`.
  - Inherited `AUTOBYTEUS_*` variables are removed.
  - Free loopback ports; private `os.tmpdir()` data root.
  - Clipboard permissions are granted to the frontend origin.
- Seed data, fixtures, identities:
  - Definitions and runs are created via public GraphQL.
  - The delegated Agent copy and Team copy come from the Manager's real `delegate_task` over `/ws/agent/<run>`; the Org task agent from the Org Manager's `delegate_task` over `/ws/agent-org/<run>`.
  - Phone access is enabled, and a credential is paired via `/rest/remote-access/pairing-sessions` + `pairing-exchanges`.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| CF-001 per kind (`agent_draft`, `team_member_draft` `/squad/reviewer`, `org_member_draft`, `agent_collaboration_member_draft`) | upload 200 → file on disk → GET 200 bytes → DELETE 204 → file gone → GET 404 → DELETE 204 | Exactly that for all four kinds | `perKind` | Pass |
| CF-001 status mapping, raw HTTP, GET and DELETE (14 paths × 2 methods) | invalid owner/file → 400 `{detail}`; absent Org/collab owner, non-draft path, literal `..` segments → 404 | All 28 match (400s carry `detail`, e.g. `storedFilename is invalid.`, `agentRunId must be a safe non-empty identity.`) | `mapping` | Pass |
| CF-001 traversal containment | No file outside the draft root touched | App-data-level sentinel intact; see OBS-001 for in-root behavior | `sentinelState` | Pass |
| CF-001 bearer (RU-3) | forged mobile bearer → 401 and file kept; paired bearer → 204 and file gone | 401 / kept / 204 / gone | `bearer` | Pass |
| CF-002 delegated Agent copy | paste image + `+` 2 files + pasted path = 4; × image, × spec-a; paste image; Clear All → 0; 4 DELETE 204 at `/rest/drafts/agent-collaborations/<host>/agent-runs/<child>/context-files/…`; drafts gone; no error line | As expected | screenshots, `removals` | Pass |
| CF-003 delegated Team-copy member (reviewer of `docs_review_team` copy) | same | same; folder `agent-collaborations/<host>/agent-runs/<member>/` emptied | screenshots | Pass |
| CF-006 Manager / New chat / Team `/manager` / Team `/worker` / Org `/manager` / Org `/squad/reviewer` / Org task agent | same journey, DELETE 204 at the respective owner path | All 7 pass; New chat owner `agent-runs/temp-chat-…` | screenshots | Pass |
| CF-007 paste the Manager's draft URL in the Team-copy member | cloned under the member's own owner; × and Clear All delete only the clone; source stays readable | Clone GET 200; both DELETEs at the member's locator; source file present, GET 200 | evidence | Pass |
| CF-008 injected DELETE 5xx (×), DELETE 5xx (Clear All), upload 5xx | Error names the file with detail; item and file kept; retry removes and clears the error; failed upload leaves no item | "Couldn't remove spec-a.txt. Simulated server failure." / "Couldn't remove spec-b.txt. Disk busy." / "Couldn't attach spec-c.txt. Upload rejected by the server."; each retry clears it | `failure-*.png` | Pass |
| CF-009 Org task agent, message pending (finalize held) + Manager delegates another task | `+` disabled, title = reason; pasted image → message, 0 uploads; pasted path attaches; after release: finalize 200, message delivered | As expected; reselecting restores `+` ("Upload files") with no stale error | `pending-*.png` | Pass |
| CF-004 backend stopped, × | "Couldn't remove spec-b.txt. Failed to fetch", item kept (`ERR_CONNECTION_REFUSED`); backend back → retry DELETE 204, file gone, error cleared | As expected | `outage-remove-error.png` | Pass |
| CF-005 root offline (stopped by CF-004's restart; the terminate call reports "Agent run not found"), backend restart #3, fresh page | Full journey on the delegated Agent copy and Team-copy member | Both pass | `offline-*.png`, `backend-3.log` | Pass |

## Desktop Application Validation

- Validation approach executed: browser dev-path probe on the shared renderer (as planned).
- Web-equivalent behavior, surface used, and evidence: everything changed (composer, store, HTTP, server), on Nuxt dev + built backend + Chrome.
- Shell-specific or lifecycle behavior and evidence: the Electron native drop branch is unchanged and sits before the gate (component spec). Backend restart lifecycle proven (CF-004/CF-005).
- Effect on any already-running desktop application: `None`. The user's `/Applications/AutoByteus.app` (PID 75083, port 29695, `~/.autobyteus`) was running throughout and was not touched.
- Behavior not directly proven and confidence consequence: a packaged-shell restart and native drop (−3 in the user-surface category); the user's own 19.png desktop verification remains the delivery gate.

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2 (arm64)
- Runtime and relevant framework versions: Node v22.23.1, Nuxt 3.21.1, Fastify 4.29.1
- Browser / engine and version: Chrome 154.0.8037.98 (headless, `playwright-core`)
- Device, viewport, locale: 1440×1000 CSS px, `en-US`

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: drafts written by the current server under every owner kind, deleted at the locators the uploads returned, including across backend restarts (CF-004/CF-005).
- Direct-use result: Pass.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material (locator strings are pinned by the codec test).

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Added | CF-001..CF-009 → AC-001..AC-008, QR-001 | Pass (run-2 and stability rerun) |
| `autobyteus-web/package.json` (`test:e2e:composer-context-file-removal`) | Updated | Script entry for the probe | Pass (stability run used it) |
| `TESTING.md` ("Composer Context-File Removal Regression") | Updated | How to run the probe and what it proves | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)
- These changes are uncommitted in the worktree (no commit was requested).

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/run-2/` | Authoritative evidence (`evidence.json`, 37 screenshots, backend/frontend logs) | Retained | 3.9 MB |
| `api-e2e-evidence/run-1/` | First final run (probe defects) | Retained | 3.5 MB; history for the ledger |
| `/tmp/ccfr-api-e2e/*.log` | Repository suite logs, server build log | Temporary | — |
| `/tmp/ccfr-api-e2e/stability-1/` | Stability rerun | Temporary | 9/9 Pass |

## Temporary Execution Methods / Scaffolding

None. Development runs (`/tmp/ccfr-api-e2e/dev-*`, `diag/*`) used the same probe while it was being written. One diagnostic run hung on a probe route-release deadlock. I stopped only its own process groups (backend, Nuxt, probe) and removed its data root.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| LLM / AGY CLI | Repository scripted CLI (`agy-failure-cli.mjs`) | No provider inference needed; it drives the real `delegate_task` tool | None for this change |
| Server failure (CF-008) | `page.route` fulfils exactly one DELETE/upload with 500 `{detail}` | A real 5xx cannot be produced on demand | Covered additionally by a real outage (CF-004) |
| Slow finalize (CF-009) | `page.route` holds `/rest/context-files/finalize`, then continues it to the real server | Widens the real pending window so it can be observed | Timing only; the server and the request are real |

## Out-Of-Scope Observations (non-blocking, separate-ticket candidates)

- **OBS-001: `agent_draft` run IDs are trim-only validated. This is pre-existing and already listed in the implementation handoff's Known Risks.**
  - Over raw HTTP, `/rest/drafts/agent-runs/..%2Fagent-runs%2Fvictim/context-files/<f>` reads (200) and deletes (204) another agent draft.
  - `/rest/drafts/agent-runs/%2E%2E/context-files/<f>` reaches `draft_context_files/context_files/<f>`.
  - `..%2F..%2Fx` returns 500 without `detail`. The layout's containment guard throws, and the unified mapping rethrows. The removed per-kind agent DELETE used to answer 400 here.
  - Nothing outside the draft root can be reached: the app-data-level sentinel survived. Every draft can already be addressed directly at its own locator, so there is no privilege gain.
  - The old per-kind route decoded `%2F` in the same way, so this is not a regression in reach.
  - Suggested hardening: validate `draftRunId` (and `teamDraftId`) with `safeIdentity`, so these become 400 `{detail}`.
- **OBS-002: an Org task agent's composer is hidden after a pending send completes.** This happens when the Org tree changed during the pending window.
  - Cause: `agentOrgContextsStore.accessFor` reads the non-reactive `submissions` Map. The target therefore recomputes to read-only during the pending window and is not recomputed when the submission ends.
  - Selecting another member and coming back restores the composer.
  - The code involved (`agentOrgContextsStore`, workspace surfaces, `useComposerTarget`) is untouched by this ticket, and composer visibility is explicitly out of scope.
  - Without such a recompute, the target keeps its upload owner during pending, and uploads keep working.

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | CF-001, CF-002, CF-003, CF-004, CF-005, CF-006, CF-007, CF-008, CF-009 | All acceptance criteria directly proven on a real stack |
| Not Tested | CF-010 | Dropped; draft locators are not on a runtime send path (investigation rationale) |
| Out Of Scope | OBS-001, OBS-002 | Pre-existing; separate-ticket candidates |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Backend process groups (3 starts per run) | Probe-owned | SIGTERM group | `terminated`, exit 0 |
| Nuxt dev process group | Probe-owned | SIGTERM group | `terminated` |
| Chrome | Probe-owned | `browser.close()` | `closed` |
| Private data roots (`$TMPDIR/composer-context-file-removal-*`) | Probe-owned | `fs.rm` | `dataRootRemoved: true`; none left (`ls` verified) |
| Hung diagnostic run (diag/run4) | Mine | SIGTERM to its probe, backend and Nuxt groups; data root removed | No leftovers (`ps`/`lsof` verified) |
| User's AutoByteus app and `~/.autobyteus` | User | None (not touched) | Still running, PID 75083 |

## Preliminary Classification

N/A — Pass.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (Live API + Browser), Pass
- Critical acceptance criteria lacking direct proof: none (the user's desktop verification of 19.png remains the explicit delivery gate)
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff message
- Notes: OBS-001 and OBS-002 are reported as separate items and do not block this ticket.
