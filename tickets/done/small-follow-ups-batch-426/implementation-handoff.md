# Implementation Handoff — small-follow-ups-batch-426, round 2

Round 1 was finalized into `personal` (`a42dbca699`, DR-001); its handoff is kept below, after this round's.

## Upstream Artifact Package

- Upstream review and handoff rule: architecture review ARCH-REV-008 Pass (SR-009…SR-013), then ARCH-REV-009 Pass (SR-014, the revised D-21 answering this implementation's Design Impact). Medium / High → `/software_engineering_team/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/requirements-doc.md` (§ Round 2: REQ-009, REQ-020…REQ-023; DEC-013…DEC-017)
- Investigation notes: `…/investigation-notes.md` (§ Round 2 Investigation)
- Solution revision record: `…/solution-revision-record.md` (SR-009…SR-014)
- Design spec: `…/design-spec.md` (§ Round 2 Design: D-09, D-20…D-23)
- Design review report / revision record: `…/design-review-report.md`, `…/architecture-review-revision-record.md`
- Supplemental artifacts: `…/follow-ups.md` (FU-004 from the design: the window's own row check cannot name a refused host, DEC-017)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`, `codex/small-follow-ups-batch-426`; base `origin/personal` `d785ded109` (round 1, 412 and 416 merged). Round-2 commits `06cc2aabad`…`736b51f87a`.

## Current Implementation Summary

- Implementation cycle: `Initial` (round 2)
- Implementation revision record: `…/implementation-revision-record.md`
- Current implementation revision ID: `IR-005`
- Related solution revision IDs: SR-009…SR-014
- Related architecture-review revision IDs: ARCH-REV-008, ARCH-REV-009
- Related code-review / API-E2E / delivery revision IDs: `N/A` for round 2
- Triggering finding IDs: `N/A`

All five round-2 items are built in their existing owners: D-09 (server read and the client's states-only refresh on the history poll), D-20 (host refused, server and Nodes page), D-21 (a day-independent token-statistics fixture and probe), D-22 (MRP-02 texts) and D-23 (one `parseWebOrigin`). D-21 raised one Design Impact (the server clock also decides the ranges). SR-014 answered it (a test-only shifted clock on the probe's own server, plus the browser clock), ARCH-REV-009 passed it, and it is built that way.

## Routing Classification (Mandatory)

- Task size: `Medium`; architecture risk: `High` (design § Task Size And Architectural Risk (round 2))
- Classification: `Confirmed`. The new read runs on the 5 s poll of three surfaces, the collaboration store gains a states-only update path, and one error code is added to an existing contract. No escalation trigger fired:
  - the read needs no snapshot connection (it uses `getActive(id)?.getAgentStatusSnapshots()`);
  - a context takes a states-only update (`applyStatuses`);
  - the answer is about 150 B per child (the exact size is for API/E2E to measure, AC-009a).
- Selected route: `Code Review`; lightweight self-review: `Not Applicable` (High)
- New design impact: `None` open (D-21's is resolved by SR-014 / ARCH-REV-009)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-009 (D-09) | Delegated rows of a listed active standalone run that is not open show the children's current states on each poll; a new child appears and a stopped run goes offline within one poll; only states unless the children or the active state changed; remote children and the open run unchanged | Server: `standalone-agent-run-root-manager.ts` `getAgentStatuses(ids)` (an active root's `getAgentStatusSnapshots()`, else inactive and none); `api/graphql/types/agent-run-collaboration.ts` `agentRunCollaborationStatuses(runIds)` (≤ 100, else `BAD_USER_INPUT`; typed `{ runId, isActive, statuses[{ agentRunId, memberAddress, status, recoverableBlock }] }`). Web: query `GetAgentRunCollaborationStatuses` + codegen (`generated/graphql.ts`, +65 lines, only this query); `agentRunCollaborationHydration.ts` `readAgentRunCollaborationStatuses` (maps into `CollaborationChildStatus`; `recoverableBlock` validated with `compactionRecoveryBlockSchema`); `agentRunCollaborationContext.ts` `applyStatuses` (the constructor's status loop moved; the view's snake_case statuses are mapped into the same shape); `agentRunCollaborationStore.ts` `refreshListedStatuses(activeIds)`; `runHistoryStore.ts` getter `activeListedAgentRunIds`; `useRunHistorySectionLoad.ts` `pollTick` (the quiet read, then the refresh; also on a resumed poll; not on the first load or a window change) | Done. The refresh follows ARCH-REV-008's order:<br>• hosts: published context, no stream, no inspection, no termination, and listed active or still live;<br>• one request;<br>• per answer: currency (same context object, same binding revision, no stream or inspection since) or drop; both inactive → nothing; active state differs → one `inspect`; local children (ID and address) differ → one `inspect`; else `applyStatuses`;<br>• one refresh at a time (a tick that finds one running joins it; Pinia wraps the promise, so the spec counts requests). A failed read warns and changes nothing. The phone inherits the poll rule (the list on screen, the page in front) |
| BEH-020 (D-20) | A peer address whose node refuses its host name reports a distinct cause in `addPeerNode`, change address and the connect flow's address resolution; the Nodes page says so with the host | Server: `remote-collaboration-settings-error.ts` (`PEER_HOST_REFUSED`, details `host`, attempt result `host_refused`); `channel/peer-client.ts` `fetchNodeId` (after the identity-pending check, a 403 whose JSON `code` is `REMOTE_ACCESS_HOST_REFUSED` → `PEER_HOST_REFUSED` "<address> refuses the name <host>; add it to AUTOBYTEUS_ALLOWED_HOSTS on that node."; any other 403 stays not an AutoByteus node); `settings/peer-address-resolver.ts` `resultOf` → `host_refused`. Web: `utils/nodeSettingsError.ts` (`host`, attempt result), `utils/nodeConnectionErrorText.ts` (`PEER_HOST_REFUSED` and `host_refused`), `localization/messages/{en,zh-CN}/nodesPage.ts` `cause.hostRefused` | Done. `nodeIdentityProbe.ts` is unchanged (DEC-017). The GraphQL mapping passes details through unchanged, so `host` reaches the page |
| BEH-021 (D-21, SR-014) | The token-statistics probe passes TS-E2E-001 and TS-E2E-002 on any day, proven on the 1st, 7th and 20th | `tests/e2e/token-statistics-seed.mjs`:<br>• `tokenStatisticsFixturePlan(now)`: three partial days always distinct inside [coverageStart, today]; coverage starts after the 1st when the month has room (This month partial, Last month before tracking), else four days back in the previous month (This month full, Last month partial);<br>• the seed returns those facts.<br>`tests/e2e/token-statistics-ui-probe.mjs`:<br>• `--day=YYYY-MM-DD` (12:00 UTC);<br>• the server is spawned with `--import fixtures/shifted-clock.mjs` and `AUTOBYTEUS_E2E_CLOCK_START`;<br>• `context.clock.setSystemTime` on every browser context; the seed gets the same `now`;<br>• the coverage texts, TS-E2E-002's range (the fixture's own range when coverage starts in the previous month) and the narrow tick count come from the fixture.<br>`tests/e2e/fixtures/shifted-clock.mjs` (new): only `Date.now` and `Date`/`new Date()` without arguments move, by a fixed offset, so the clock keeps running | Done. Reproduced first: the base rule put the three partial buckets on fewer than three days on 65 of 151 days checked (IMP-R2-02). The plan holds on all 151 days. The probe passes on 2026-12-01, 12-07 and 12-20 with both clocks fixed: the server's applied This month is December (IMP-R2-04). The first 12-01 run also found the narrow chart's constant three ticks (TS-E2E-005; on the 1st there is one bucket); it is now derived from the chart's own rule |
| BEH-022 (D-22) | MRP-02 asserts the current display names; the probe passes | `tests/e2e/model-routing-settings-probe.mjs` (texts built from `APP_RUNTIME_NAMES.antigravity_cli` / `.grok_build`, which the server uses through `agentRuntimeName`) | Done; MRP-01…07 pass (IMP-R2-03) |
| BEH-023 (D-23) | One `parseWebOrigin`; behavior unchanged | `src/api/security/web-origin.ts` (new); `node-browser-access.ts`, `remote-access-request-origin.ts` import it; their copies removed | Done; origin and allow-list unit tests unchanged and passing (182) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Important Assumptions

- The server answers every asked run ID, in order. The client matches answers by `runId` and ignores an answer it did not ask for, or a missing one.
- A live root's `getAgentStatusSnapshots()` reports every local child (live ones, and dormant ones as offline), as the view's `agent_statuses` does. If a child were missing, every poll would re-read that hub's view (correct, but costlier). AC-009a's "no view read on a poll without a change" is the check for this.

## Known Risks

- D-09: the status read adds one request per poll tick while any listed run qualifies; the phone polls only while its list is on screen and in front (unchanged rule). The measured payload is for API/E2E (AC-009a, ≤ 2 KB for ≤ 10 children).
- D-20 E2E depends on public DNS resolving `lvh.me` to loopback (the 416 case); without it, the case is skipped with that reason (a skip is not a pass).
- D-21: the shifted clock is test-only and loaded only by the probe's own spawned server with `--day`. Product code never imports it.

## Task Design Health Assessment Implementation Check

- Change posture / root cause / refactor: as design round 2 (Feature D-09; Local defects D-20 to D-22; Duplicated code D-23; refactor: the constructor's status loop moved into `applyStatuses`, one `parseWebOrigin`)
- Implementation matched the assessment: `Yes` (after SR-014 for D-21)
- Routed as `Design Impact`: `Yes`, D-21's clock (resolved SR-014 / ARCH-REV-009)

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms: `None`; legacy retained: `No`
- Dead code removed in touched files: `Yes`. Removed: the constructor's inline status loop (moved), and the two private `parseWebOrigin` copies.
- Dead code elsewhere: none new
- Shared structures tight: `Yes` (`CollaborationChildStatus` is the one status shape)
- Size guardrails: `Yes`. Largest files: `runHistoryStore.ts` 494 (+4), `standalone-agent-run-root-manager.ts` 476, `agentRunCollaborationStore.ts` 428 (+59); no changed-line delta over 220.

## Persisted Data Transition Check

- `Not Affected` (reads only). Followed: `Yes`.

## Environment Or Dependency Notes

- `autobyteus-web/generated/graphql.ts` changed (codegen from this worktree's server schema, `pnpm -C autobyteus-web codegen:local`). TESTING § Fresh-start build lists `autobyteus-web/generated/**` as a build input, so the fresh-start desktop build applies.
- Probes ran with `--browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` (the probes' default paths are Linux ones).

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-R2-01 | Focused server unit + E2E and web specs (commands in file) | `06cc2aabad`, `094c896407`, `23483d0cf8` (unchanged since) | macOS, Node 22 | D-09, D-20, D-23 code and specs | REQ-009, 020, 023; AC-009d, AC-020 (1), AC-023 | Pass | `IMP-R2-01-focused-checks.txt` | `peer-host-refused … Tests 2 passed (2)`; `Tests 182 passed (182)` |
| IMP-R2-02 | The base seed rule against the new `tokenStatisticsFixturePlan` for every day of five months | `736b51f87a` | Node | the seed's day plan | REQ-021 | Reproduced (base) / Pass (new) | `IMP-R2-02-seed-plan-days.txt` | `"daysWithCollidingPartialBuckets":65`; `{"checked":151,"failures":[]}` |
| IMP-R2-03 | Model-routing probe | `c4521d4402` | macOS, Chrome, built server | MRP-01…07 | REQ-022 / AC-022 | Pass | `IMP-R2-03-model-routing-probe.txt`, `IMP-R2-mrp/` | `Result: Pass`; `Limits unknown: Antigravity CLI usage limits could not be read` |
| IMP-R2-04 | Token-statistics probe `--day` 2026-12-01, 12-07, 12-20 | 12-01 rerun at `736b51f87a`; 12-07 and 12-20 on the same files before the tick-count change (it gives 3, the old constant, from the 5th on) | macOS, Chrome, built server with the shifted-clock preload | TS-E2E-001…005, both clocks | REQ-021 / AC-021 | Pass (after one fix: the first 12-01 run failed TS-E2E-005's constant tick count) | `IMP-R2-04-token-statistics-days.txt`, `IMP-R2-ts-2026-12-0{1,1-rerun,7}/`, `IMP-R2-ts-2026-12-20/` | `IMP-R2-ts-2026-12-01-rerun Pass … server applied THIS_MONTH 2026-12-01…2026-12-02` |
| IMP-R2-05 | `test:nuxt --run`, server `test:unit`, both typechecks | `736b51f87a` | macOS | whole web and server suites | all round-2 items | Pass | `IMP-R2-05-suites-typechecks.txt` | `Test Files  721 passed (721)`; `Test Files  952 passed \| 5 skipped (957)`; both `production errors: 0 … (baseline …)` |

- Not run, and why:
  - The D-09 browser and phone probes (AC-009a…c, payload measurement) and the Nodes page probe step for AC-020 (2), (3): API/E2E, on an isolated node with a delegating run.
  - The fresh-start desktop build: `generated/graphql.ts` changed (a build input); it is for API/E2E or delivery.
  - Server E2E beyond the new file: API/E2E (the full suite after round 2).

## Frontend Rendered-Result Check

- Affected surfaces: the task rows' states (Runs view, Workspaces tree, phone list) and the Nodes page cause text. Neither changes layout or adds controls: the rows show the existing status markers, and the text uses the existing cause line.
- Not rendered here: the rows' live states need a running delegating Agent run on a node (API/E2E's isolated-node probe). The Nodes page text is the existing cause line with a new string, covered by the specs; the probe step is API/E2E's.
- No visual or interaction change was made, so there is nothing to polish.

## Downstream Coverage Hints / Suggested Scenarios

- AC-009a/b/d (desktop): a listed run with two delegated children, not open; a child idle → running → idle; check the per-poll request (`GetAgentRunCollaborationStatuses`, measured bytes) and that no `GetAgentRunCollaboration` read happens on an unchanged poll. A third child: one view re-read. Stopping the run: rows go offline within one poll (one view re-read). The open run is never in the status read.
- AC-009c (phone): the same run on the phone list; nothing is polled while the list is hidden or the page is in the background.
- AC-020 (2), (3): the Nodes page "change address" to `http://lvh.me:<port>` of a peer, and connecting a node whose address resolution tries that name. The distinct text names the host.
- The token-statistics probe can be rerun on any day with `--day`.

## API / E2E / Executable Coverage Still Required

- The D-09 probes with payload measurement (AC-009a…c); the AC-020 Nodes page probe step; the full server E2E suite; the fresh-start desktop build (generated GraphQL).

---

# Implementation Handoff — small-follow-ups-batch-426, round 1

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High); ARCH-REV-002 Pass (SR-004), ARCH-REV-003 Pass (SR-005, revised D-02), ARCH-REV-004 Pass (SR-006, D-19). Handoff rule: Large or High → `/software_engineering_team/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/requirements-doc.md`
- Investigation notes: `…/small-follow-ups-batch-426/investigation-notes.md`
- Solution revision record: `…/small-follow-ups-batch-426/solution-revision-record.md` (SR-001…SR-006)
- Design spec: `…/small-follow-ups-batch-426/design-spec.md` (D-01…D-19)
- Supplemental task artifacts: Product spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` (VIS-001…009), `product-design-request.md`, `follow-ups.md` (FU-001, FU-002)
- Design review report: `…/small-follow-ups-batch-426/design-review-report.md`
- Architecture review revision record: `…/small-follow-ups-batch-426/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial round)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`, `codex/small-follow-ups-batch-426`; base `6225a734a3`, then `origin/personal` `933163361c` merged in `ed29eb6522` (before D-19, as ARCH-REV-004 asked). Head: see the handoff message.

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-004: CRR-004 local fixes F-004, F-005; IR-003: SR-008 revisions of D-02 and D-03 answering CRR-003 F-API-001/F-API-002; IR-002: CRR-001 local fixes; the rest as IR-001)
- Implementation revision record: `…/small-follow-ups-batch-426/implementation-revision-record.md`
- Current implementation revision ID: `IR-004`
- Related solution revision IDs: SR-004, SR-005, SR-006
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-004
- Related code-review revision IDs: CRR-001…CRR-004; API-E2E: API-REV-001; delivery: `N/A`
- Triggering finding IDs: F-004, F-005 (CRR-004); F-API-001, F-API-002 (CRR-003, via SR-008 / ARCH-REV-005); earlier F-001…F-003 (CRR-001)

All round-1 items are implemented in their existing owners: server D-18, D-08, D-06, D-14; web D-08 (client), D-01, D-02, D-05, D-16, D-17, D-12, D-13, D-19; Android D-07, D-03; probes D-10, D-11. One Design Impact was raised during the round (D-02: the refusal code never reached the check, evidence IMP-02). The Solution Designer revised it (SR-005, `historyReadFailure`), ARCH-REV-003 passed it, and it was implemented that way. API/E2E then found the history store's state unreliable as the check's source (CRR-003 F-API-001), and a share-started task re-running its link after process death (F-API-002). SR-008 / ARCH-REV-005 replaced D-02 with the phone's own credential check, removed `historyReadFailure`, and added D-03's re-delivery rule; both are implemented (IR-003).

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the deltas stayed inside their owners. The High rating still holds: D-07 relaxes the Android WebView navigation rule, and D-02 changes when the phone drops a credential. D-19 added one small template move. No new permission, stored-data change or new API: the manifest diff is empty; D-02's `historyReadFailure` is in-memory store state; and the contract delta is still only additive (`public` kind, `WORKSPACE_PATH_REFUSED`). None of the escalation triggers fired: R-01's re-check finishes (IMP-05); `isForMainFrame` is used as designed; the manifest is unchanged; 416's overlap is unchanged.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable` (High route)
- New design impact or escalation trigger: `None` open (the D-02 Design Impact is resolved by SR-005 / ARCH-REV-003)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (D-01) | Phone feed only while paired; desktop/browser unchanged | `autobyteus-web/app.vue`: `definitionFeedEnabled = isAppReady && (!isMobileRemoteAccessRuntime() \|\| mobileNodeSession.isPaired)` | Done; `__tests__/app.spec.ts` (phone: off → paired on → unpaired off; desktop on) |
| BEH-002 (D-02, SR-008) | Revoked → session rejected (pairing screen); Phone Access off → kept, "Phone access off" + banner; 401 rule unchanged; the outcome comes only from the phone's own credential check | `stores/mobileNodeSessionStore.ts` (`checkCredential()`: one `POST <node>/graphql { __typename }` through `fetchWithRemoteAccessCredential` with the session's own credential; 2xx → reachable, else `remoteAccessReadRefusal({ status, code })` from the refusal body, else unreachable; `phoneAccessOff`; `recordCheckOutcome` replaces `recordAuthorizedApiReachability`; session end clears off); `utils/remoteAccess/remoteAccessReadRefusal.ts` (status and code only; replaces `remoteAccessAuthFailure.ts`); `components/mobile/MobilePairedShell.vue` (credential check, public status and history read together; outcome from the credential check only); `components/mobile/runList/MobileRunList.vue` (`connection` prop, labels, off banner). SR-005's `historyReadFailure` and `readHistory`'s cause are removed: the run-history store, its actions and `useRunHistorySectionLoad` are back to their pre-ticket code (D-08's split stays) | Done; specs: rule (status/code), store `checkCredential` (request shape and credential; revoked 403, off 403, 401, other refusal, 502, network error), shell (rejected, off → unreachable → reachable, outcome taken from the check only while the history read answers otherwise, Retry), run list (3 states). Never sent on the poll |
| BEH-003 (D-03, SR-008) | Process death reopens the same node and `/mobile` URL; policy-refused URL or removed node → ordinary start; a recreated activity does not re-run the share that started it; a new share still wins | `autobyteus-android/.../shell/OpenPageRestore.kt` (`save`, `read`, `restore`, `sharedTextToHandle(sharedText, recreated)`), `MainActivity.kt` (`onSaveInstanceState`; `onCreate`: shared text only when `savedInstanceState == null` → restored → last used → start; `onNewIntent` unchanged), `shell/NodeConnectionFlow.kt` (`open(entry, pageUrl = entry.mobileUrl)`) | Done; `OpenPageRestoreTest` (6, incl. the re-delivery rule). RR-02 is superseded by SR-008: the re-delivered share no longer wins over the restore (it had shown "This code has expired"). Run screens come back as the list until round 2 (AC-004b, DEC-013); AC-004a on the emulator is API/E2E's (API-08 Runs A, B, C) |
| BEH-005 (D-05) | Control + connected: Paste to desktop, Copy from desktop (tap) with selectable fallback; nothing without a tap | `composables/useVncSession.ts` (`remoteClipboardText` from RFB `clipboard`, cleared on stream end/disconnect; `sendClipboardText` → `clipboardPasteFrom`, Control+connected only), `components/mobile/views/MobileNodeDesktopClipboard.vue` (new sheet in `MobileBottomSheet`), `MobileNodeDesktop.vue` (Clipboard bar button next to Keyboard), `types/novnc.d.ts`, catalogs `mobileNodeDesktop.ts` (en, zh-CN) | Done; specs for session and view (no read/write on open; send; async copy; selection copy; failure → "Long-press the text to copy it."). After a successful send the sheet closes (the user then pastes on the desktop), and a successful copy labels the button "Copied": two small feedback choices the design did not spell out. U-01 (copy in the WebView on `http://`) needs the emulator |
| BEH-006 (D-06) | One metadata-only line per 4429 refusal | `server-ts/src/node-desktop/node-desktop-viewers.ts` (`admit(viewer, stream, mode)`; refusal `{ refused, limit, openStreams }`; `[node-desktop] stream refused reason=NODE_DESKTOP_TOO_MANY_VIEWERS limit=<node\|phone> mode=… viewer=… open=… max=…`), `api/websocket/node-desktop.ts` (passes mode) | Done; unit spec + route E2E (5th node-wide, 3rd per phone; no device ID, credential or address) |
| BEH-007 (D-07) | `blob:` subframe of the open node's origin loads; main-frame blob:, foreign blob:, other schemes blocked; other origins external | `autobyteus-android/.../web/TrustedNavigationPolicy.kt` (`classify(url, entry, isMainFrame)`, `classifyBlob`, shared `isSameOrigin`), `web/AutoByteusWebView.kt` (passes `request.isForMainFrame`; `loadTrusted` main frame; deprecated String override removed) | Done; `TrustedNavigationPolicyTest` (+2 cases). RR-01: the emulator run must keep AC-007's `window.AutoByteusShell === undefined` check. No change to `ShellBridge` |
| BEH-008 (D-08) | Unregistered path must be an existing absolute folder; reason shown on phone and desktop; registered paths unchanged | Server: `src/workspaces/workspace-folder-check.ts` (new: `assertWorkspaceFolder`, `WorkspacePathRefusedError`), `workspace-manager.ts` (checks when neither active nor registered, raw input), `api/graphql/types/workspace.ts` (`WORKSPACE_PATH_REFUSED` + `reason`). Web: `utils/workspace/workspacePathRefusal.ts` (new), `services/workspace/runWorkspaceChoice.ts`, `stores/runHistoryLoadActions.ts` (`findOrRegisterWorkspaceByRootPath` split out), `composables/mobile/useMobileLaunchWorkspaces.ts`, catalogs `workspace.ts` | Done. RR-03, server-internal forms now refused at registration (instead of a later `ENOENT`): `agent-run-provisioning-service.ts:249`, `standalone-agent-run-lifecycle-service.ts:444`, `team-run-service.ts:126`, `agent-org-run-manager.ts:275`, `agent-org-run-service.ts:255`, `configured-agent-execution-handle.ts:451`; one form covered by the new E2E `workspace-path-refusal-run-launch.e2e.test.ts` (`createAgentRun` → provisioning). `stores/workspace.ts` needed no change (Apollo keeps `graphQLErrors`) |
| BEH-010 (D-10) | B04 asserts by the seeding rule | `tests/e2e/fresh-run-auto-approval-probe.mjs` (counts rows reading "Customized"; expects "`<n>` of `<total>` customized") | Changed; probe not run here |
| BEH-011 (D-11) | NVP-05 waits for the dev server after the restart | `tests/e2e/fixtures/dev-server-ready.mjs` (new: `/` and `/rest/health` 200, 60 s, 500 ms), `node-vocabulary-probe.mjs` | Changed; probe not run here. The other probe that restarts alpha under `nuxt dev` (mobile-shell MSP-09) does not navigate afterwards, so it needs no wait |
| BEH-012 (D-12) | Docs name `CollaborationMessageReferenceViewer` and describe it | `autobyteus-web/docs/agent_artifacts.md` (diagram, owner row, paragraph), `docs/content_rendering.md` | Done (descriptions re-read from the component) |
| BEH-013 (D-13) | Case 5 extended; new Case 17 | `docs/design-cases.md` | Written in the file's own form ("Again in" bullets for Case 5: 277 CRR-003 F-01 and 426 SR-005, SR-008 (CRR-004 F-005: D-13's SR-008 text); Case 17 with said / happened / fix / lesson / notice). Case 17's "fix" line states that the re-read was left out and rows of a run that is not open keep their first read. This is from E-09; the Solution Designer may want to confirm the wording. After the 427 merge, Case 17 keeps its number |
| BEH-014 (D-14) | Four E2E tests pass; AR-14 label prints last row; AR-14 waits for the re-check | `tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`, `workspace-run-history-graphql.e2e.test.ts`, `runtime/runtime-capability-graphql.e2e.test.ts`, `runtime/agent-runtimes-graphql.e2e.test.ts` | Done. R-01 reproduced and measured (IMP-05): the re-check ends about 0.1 s after the update, so this is no product bug. AR-14 waits on the row's `checkedAt` (the design said the row has no "finished" field; it does, `agent-runtimes.ts:67`), not on a repeated `checkAgentRuntimes`. The label is built after the wait fails |
| BEH-016 (D-16) | Remote node: spec strings; embedded/Docker unchanged | `utils/phoneAccess/phoneSetupTextKey.ts` (new: `REMOTE_WORDED_PATHS`, 21 paths), `components/settings/phone/PhoneWayTab.vue`, `PhonesPanel.vue`, catalogs `localization/messages/{en,zh-CN}/phoneSetupRemoteNode.ts` (new, registered in each `index.ts`) | Done; catalog spec (both locales define every listed key) + panel spec for a remote node (VIS-001…009 strings) + rendered check (IMP-13). The remote keys live in their own catalog, so `settings.ts` (500 lines) does not grow; key names are unchanged |
| BEH-017 (D-17) | App UI locale everywhere; guard | ~20 sites (`useMemoryIndexView.ts`, `applicationLaunchProfile.ts`, `UiErrorPanel.vue`, `MemorySyncCard.vue`, `AboutSettingsManager.vue`, `ServerMigrationsManager.vue`, `MemoryHome.vue`, `CollaborationMemoryDetail.vue`, `AgentMemoryDetail.vue`, `WorkJournalTab.vue`, `RawTracesTab.vue`, `MemorySearchResults.vue`, `BackgroundTaskPanel.vue`, `SystemInstructionActivityItem.vue`, `CollaborationMessagesPanel.vue`, `tokenUsageFormatting.ts`, `IntegrationDetail.vue`, `MobileMessages.vue`, `SkillSourceRow.vue`); `scripts/guard-localization-boundary.mjs` (new OS-locale rule over the guard's dirs plus `utils/`, test files excepted) | Done; guard integration test (5 planted calls fail, 3 good forms pass); `SystemInstructionActivityItem` spec with `zh-CN`. No CI test job exists (only release workflows), and the guard already runs in every `build:electron*`, so no workflow or gate input changed (DESIGN rule 12 not triggered) |
| BEH-018 (D-18) | Private → LAN, 100.64/10 → tailnet-like, public → `public` after them, link-local not listed; one range owner | `server-ts/src/remote-access/services/ip-address-ranges.ts` (+ IPv6 ULA / link-local; header), `server-addressing/server-address-candidate-service.ts` (`classifyInterfaceAddress`; own copies removed), `server-address-candidate-types.ts` (`public`) | Done; unit tests (stubbed interfaces); `network-interface-classifier` unchanged and passing |
| BEH-019 (D-19) | Read-only conversation shows the file status; composer hidden | `components/workspace/agent/AgentEventMonitor.vue` (status in its own `shrink-0` block on `filePreviewStatus`; composer slots and `CollaboratorAddFailureNotice` stay behind `!readOnly`) | Done on 427's version of the file; `AgentEventMonitor.spec.ts` (`readOnly` true/false: same text, classes, role, aria-live; composer only when writable) and `AgentEventMonitor.mobileFileOpen.spec.ts` re-run green. The phone-bundle probe step is left to API/E2E (see below) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

New: `server-ts/src/workspaces/workspace-folder-check.ts`; `server-ts/tests/unit/server-addressing/server-address-candidate-service.test.ts`, `tests/unit/remote-access/ip-address-ranges.test.ts`, `tests/e2e/workspaces/workspace-path-refusal-run-launch.e2e.test.ts`; web `utils/remoteAccess/remoteAccessReadRefusal.ts` (renamed), `utils/workspace/workspacePathRefusal.ts`, `utils/phoneAccess/phoneSetupTextKey.ts`, `components/mobile/views/MobileNodeDesktopClipboard.vue`, `localization/messages/{en,zh-CN}/phoneSetupRemoteNode.ts`, `tests/e2e/fixtures/dev-server-ready.mjs`, `tests/integration/localization-boundary-guard.integration.test.ts`; Android `shell/OpenPageRestore.kt` and its test.

## Important Assumptions

- Item 8's check is made on the raw trimmed input (before the server resolves a relative path against its cwd), and only for an ID that is neither active nor in the registry. History restore (`ensureRunHistoryWorkspaceByRootPath`) keeps returning `null` on any failure.
- The credential check is a phone GraphQL read that the node authorizes for any operation (`remote-access-route-policy.ts:203-205`); its refusal body is `{ error, code, message }` (`remote-access-policy-plugin.ts:43-45`).
- The web drops the `pairing` query after pairing (`MobileRemoteAccessShell.vue:57`), so a restored page URL never carries a used code.

## Known Risks

- D-05: noVNC writes the local clipboard itself where its async clipboard is available (secure origin with `navigator.permissions`). There, the `clipboard` event does not fire, Copy stays disabled, and noVNC may still read the phone clipboard on canvas focus. That is today's noVNC behavior. It does not apply in the Android WebView on `http://` (no `navigator.permissions`, 407 API-04), which is the target. It would matter only for a phone browser on an https node.
- D-02: the connection sheet (`MobileConnectionSheet`) still takes the boolean `connected`, as designed. With Phone Access off it says "Not reachable" while the list bar says "Phone access off".
- D-07 / RR-01: any future unsandboxed same-origin `blob:` iframe would receive the bridge object (messages still ignored). Keep the AC-007 check.
- D-08: a historical run whose workspace was removed and whose folder is gone now opens without a workspace (DEC-004); server-internal launches into such a folder fail earlier, with the folder reason (RR-03).
- The server unit run's architecture timeout was fixed as a baseline fix (own commit `709617b6eb`); it was CPU contention against the 5 s default, not the change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix with Cleanup
- Reviewed root-cause classification: Missing Invariant (1, 2, 7, 8, 19), Duplicated Policy (18), Local Implementation Defect (3, 5, 6, 17), stale tests/docs (10–14)
- Reviewed refactor decision: `Refactor Needed Now` (bounded: item 18's range owner, item 8's find-or-register split)
- Implementation matched the reviewed assessment: `Yes` (after SR-005 for D-02)
- If challenged, routed as `Design Impact`: `Yes` (D-02 premise, evidence IMP-02; resolved SR-005 / ARCH-REV-003)
- Evidence / notes: D-14's premise "the row exposes no check-finished field" was wrong (`checkedAt`); the test-only consequence (wait on it) fits REQ-014's wording exactly and needed no design change.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in touched files and modules removed: `Yes`. Removed: `isLanIp` and `isTailnetLikeIp`; `useRunHistorySectionLoad`'s read result (`RunHistoryReadResult`, `listsAnyRun`, `readHistory`'s ok/cause; load and initialLoad now settle void) once SR-008 left it no reader (CRR-004 F-004); `isRemoteAccessAuthFailure` (file renamed); `recordAuthorizedApiReachability`; the `connected` prop of `MobileRunList`; the deprecated `shouldOverrideUrlLoading(view, url)`; B04's constant assertion
- Dead code found elsewhere, added to `follow-ups.md`: FU-002 (`autobyteus-web/utils/dateUtils.ts`, no importer); FU-001 (Solution Designer) stands
- Shared structures remain tight: `Yes` (`NodeDesktopAdmission` refused variant, `MobileCheckOutcome`, `MobileRunListConnection`, `WorkspacePathRefusalReason`, each one meaning)
- Canonical shared design guidance reapplied: `Yes`
- Size guardrails: `Yes`. No changed source file is above 500 effective lines: largest `runHistoryStore.ts` 493 (+2), `runHistoryLoadActions.ts` 481. The two `settings.ts` catalogs would have reached 521, so the remote keys moved to their own catalog file. `MainActivity.kt` 320, `MobileNodeDesktop.vue` 242. No file has a changed-line delta over 220
- Notes: `tokenUsageStatisticsUi.ts`'s `getLocale` default (`() => undefined`) is never used (every caller passes the app locale), but the file is not touched; it is minor and not recorded as a follow-up because it is a default parameter, not unreachable code.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Implementation follows it: `Yes`. The workspace registry is only read for the check; nothing is rewritten. The Android saved-instance Bundle is system-transient. The credential check stores nothing.
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `prebuild`, `nuxt prepare` and `autobyteus-server-ts build` ran in the worktree. Android tests need `ANDROID_HOME=$HOME/Library/Android/sdk` (no `local.properties` in the worktree).
- `origin/personal` (`933163361c`, autobyteus-427) was merged before D-19 (`ed29eb6522`, no conflicts; Case 2's heading and Case 17 coexist). It brought a TESTING.md rule: renderer behavior the phone also offers is proven on the phone bundle by a `test:e2e:mobile-shell` case. That covers D-01, D-02, D-05 (needs a node desktop), D-08 (phone field) and D-19.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | The four item-14 E2E files before their fix (clean env, `vitest run …`) | base `6225a734a3` + early server work (unrelated to these four) | macOS, Node 22.23.1 | the four E2E files | REQ-014 (reproduction) | Fail (expected) | `IMP-01-item14-e2e-before.log` | `Tests  4 failed \| 31 passed (35)` |
| IMP-02 | Apollo 3.14 against a stub 403 refusal body | base (web path unchanged) | Node 22 | Apollo error shape; `runHistoryLoadActions.ts:150-152`, `useRunHistorySectionLoad.ts:38` | REQ-002 (D-02 premise) | Measured | `IMP-02-apollo-403-error-shape.txt` | `"message":"Response not successful: Received status code 403","statusCode":403,"result":{…"code":"REMOTE_ACCESS_DEVICE_REVOKED"…}` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | work tree = `85d26ed1e8` minus the delegation fixture fix | macOS | whole server unit + architecture suite | all server items | Fail → causes found and fixed | `IMP-03-server-unit.txt` | `11 failed \| 8066 passed`: 9 × team-remote-delegation (D-08: the fixture never created its temp workspace folder → fixed in `3ea7c39322`); 1 × composition scan timeout (CPU contention vs 5 s → baseline fix `709617b6eb`); 1 × tracked-imports (files not yet committed). All three rerun green in IMP-06 |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | server sources as in `85d26ed1e8` (unchanged since) | macOS | server src + tests | all server items | Pass | `IMP-04-server-typecheck.txt` | `production errors: 0; test-file errors: 1182 in 365 files (baseline 1182 in 365 files)` |
| IMP-05 | AR-14 alone, with a temporary timing log (removed) | work tree before `85d26ed1e8` | clean env | `agent-runtime-status-service.ts` re-check; AR-14 | REQ-014, R-01 | Pass; measured | `IMP-05-R01-ar14-recheck-measurement.txt` | `automatic re-check finished 108 ms after the update result was read` |
| IMP-06 | focused server unit + all `tests/architecture` (cmd in file) | `b1d92c7ced` (+ evidence) | macOS | D-18, D-08, D-06 units; delegation fixture; architecture incl. tracked-imports | REQ-006, 008, 018 | Pass | `IMP-06-server-focused-unit.txt` | `Tests  269 passed (269)` |
| IMP-07 | 7 server E2E files (cmd in file) | `b1d92c7ced` | clean env | item-14 files, D-08 GraphQL refusal, RR-03 run launch, D-06 route log, Memory Sync candidates (D-18) | REQ-006, 008, 014, 018; AC-006, 008, 014 | Pass | `IMP-07-server-e2e.txt` | `Test Files  7 passed (7)`, `Tests  48 passed (48)` |
| IMP-08 | `pnpm -C autobyteus-web test:nuxt --run` | `c17490a004` + D-17 work tree | macOS | whole web suite | all web items | Fail → fixed | `IMP-08-web-nuxt-full.txt` | `4 failed \| 713 passed (717)`: four specs mocked `useLocalization` without `resolvedLocale` (D-17 consequence) → mocks given a locale in `8aa5647d58`; rerun in IMP-09 |
| IMP-09 | every web spec touched since base (27 files; cmd in file) | `b1d92c7ced` | macOS | D-01, D-02, D-05, D-08, D-16, D-17, D-19 specs + the four fixed specs + 427's merged specs | REQ-001, 002, 005, 008, 016, 017, 019; AC-001…003, 005, 008, 016, 017, 019 | Pass | `IMP-09-web-touched-specs.txt` | `Test Files  27 passed (27)`, `Tests  285 passed (285)` |
| IMP-10 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | after D-19 (`4cfb3e4d19`) | macOS | guards incl. the new OS-locale rule | REQ-017 / AC-017 | Pass | `IMP-10-web-guards.txt` | `[guard:localization-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-11 | `pnpm -C autobyteus-web typecheck` | `b1d92c7ced` | macOS | Nuxt app, Electron main, build scripts, cross-package tests | all web items | Pass (after fixing `types/novnc.d.ts` and one spec object) | `IMP-11-web-typecheck.txt` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-12 | `ANDROID_HOME=… ./gradlew --no-daemon :app:testDebugUnitTest` | `ea8897ee53` (Android unchanged since) | JDK 21 | all Android unit tests incl. `TrustedNavigationPolicyTest`, `OpenPageRestoreTest` | REQ-003, 007; AC-004, 007 (unit part) | Pass | `IMP-12-android-unit.txt` | `TrustedNavigationPolicyTest" tests="5" … failures="0"`, `OpenPageRestoreTest" tests="5" … failures="0"`; manifest diff vs base: 0 lines (QR-001) |
| IMP-14 | CRR-001 fix checks: affected specs (rule, shell, chat launch, guard integration), the guard, web typecheck | `1d2cdd15ab` | macOS | `remoteAccessReadRefusal.ts`, `runWorkspaceChoice.ts`, guard script | REQ-002, 008, 017 | Pass | `IMP-14-crr001-fix-checks.txt` | `Tests  52 passed (52)`; `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-15 | SR-008 revision: affected web specs, web typecheck, localization guard, Android unit tests | `35263117c9` | macOS, JDK 21 | `checkCredential`, `remoteAccessReadRefusal`, `MobilePairedShell`, restored run-history files, `OpenPageRestore`, `MainActivity` | REQ-002, REQ-003; AC-002, AC-003, AC-004a (unit part) | Pass | `IMP-15-sr008-revision-checks.txt` | `Tests  196 passed (196)`; `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`; `OpenPageRestoreTest" tests="6" … failures="0"` |
| IMP-16 | CRR-004 fix checks: run-history load specs, shell spec, desktop history specs, web typecheck, guard | `c8b4b659cd` | macOS | `useRunHistorySectionLoad.ts`, `design-cases.md` | REQ-002, REQ-013 | Pass | `IMP-16-crr004-fix-checks.txt` | `Tests  279 passed (279)`; `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-13 | Rendered Phone Setup: test-owned server (worktree dist) + `nuxt dev` + headless Chrome; embedded window, then the window bound to a remote entry | `b1d92c7ced` sources | 1059×738 and 640×900 @2×; OS locale de-DE, app en | `PhoneWayTab.vue`, `PhonesPanel.vue`, `phoneSetupTextKey.ts`, catalogs | REQ-016 / AC-016 | Pass | `IMP-13-render-summary.txt`; `IMP-render-phone-setup/` and `IMP-render-phone-setup-remote/` (PNGs, result JSON, harness scripts as `.mjs.txt`, server/frontend logs) | remote `kind= remote`; `desktop vpn \| status: Office Mac isn’t reachable through a VPN from this computer. Connect both to your VPN, then Check again. \| lines: 2 \| overflow: False`; embedded: `No VPN found on this computer. Connect it, then Check again.`; `browserErrors= []` |

- Not run, and why:
  - Probes B04 (`test:e2e:fresh-run-auto-approval`), NVP-05 (`test:e2e:node-vocabulary`) and the phone-bundle probe (`test:e2e:mobile-shell`): API/E2E executes probes. The probe code changed here is D-10, D-11.
  - Emulator checks AC-004, AC-005 (U-01), AC-007: they need the emulator with an isolated node, which is API/E2E's environment.
  - Docker node-desktop render of the clipboard sheet: no node desktop on this machine (Docker-only), so only specs cover it.
  - Fresh-start build: not run here. One build input changed: `autobyteus-web/scripts/guard-localization-boundary.mjs` matches `*/scripts/**` in TESTING § Fresh-start build. API/E2E or delivery runs the fresh-start desktop build before merge. No `package.json`, `tsconfig`, workflow, Gradle file or contract package changed. The guard reads only the web app's own source files, so DESIGN rule 12's prepare-step concern does not apply.
  - Electron main tests (`test:electron`): no Electron main code changed.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - Phone Setup panel (D-16), rendered.
  - Phone run list bar/banner (D-02), phone VNC clipboard sheet (D-05), phone "Open a folder by path" field and desktop New-chat launch error (D-08), event-monitor status on read-only conversations (D-19), locale-formatted values (D-17): component specs on real DOM.
- Approved references: Product spec `phone-setup-remote-node-wording` (VIS-001…009); requirements UI section (REQ-002 reuses the existing banner; REQ-005 sheet layout; REQ-008 texts).
- Existing design system / components reviewed: `MobileBottomSheet` (reused for the sheet, same button styles as the connection sheet), `MobileRunList` banner markup (reused for the off banner), PhoneWayTab classes (unchanged).
- Surface used: `nuxt dev` against a server built from this worktree (TESTING § Browser probes). A browser window is always the embedded node, so for the remote kind the harness bound the window to a remote entry through its Pinia stores (same test-owned node) and gave the page an inert WebSocket. Without it, sockets to the unproxied dev origin reset `nuxt dev`, the E-11 effect.
- States, viewports and interactions inspected:
  - Every tab not ready, Check again for Tailscale and VPN, How it works open, remote and embedded; at 1059 and 640 px.
  - Remote strings equal the spec's. The VPN line takes two lines at 1059 px, as VIS-002 shows. Nothing overflows or clips at 640 px. No browser errors.
- Issues found and corrected: none in the rendered result.
- Remaining unverified states and limitations:
  - Remote *ready* states (VIS-005…008) and the no-address message (VIS-009) are proven by `PhonesPanel.spec.ts`, not rendered: the test node listens on 127.0.0.1, so no way becomes ready.
  - The phone screens were not rendered here. A phone page through `nuxt dev` is a loopback client of the node, so the node never refuses it; revoked and off states cannot appear there. The phone bundle on a LAN origin (`test:e2e:mobile-shell`) is the surface for them.

## Downstream Coverage Hints / Suggested Scenarios

- D-02 on the phone bundle: revoke the paired phone → Check / Retry → pairing screen. Phone Access off → bar "Phone access off" and banner "`<node>` is reachable, but Phone access is off." → on → Check loads the runs. Off → node stopped → "Can’t reach `<node>`.". No re-pairing.
- D-01: the phone page unpaired for 30 s makes no WebSocket attempt; after pairing, one feed socket to the paired node with `access_token`; after unpair it closes and is not retried. MSP's `KNOWN_BROWSER_LINES` entry for the old feed retry (`mobile-shell-probe.mjs:402-404`, "FU-002" of 277) should now be removable: check that the line no longer appears.
- D-08: phone "Open a folder by path" with `/definitely/not/a/folder`, `/etc/hosts`, `relative/dir`, then an existing folder. Desktop New chat with a typed folder in a browser / remote-node window shows the reason. History restore of a deleted, registered folder still loads.
- D-19 phone step (TESTING's phone-bundle rule): the MSP-16 neighbourhood. The phone's read-only conversations are targets whose `access` is `read_only` (`composables/workspace/useTargetConversation.ts:25-29`), for example a Task copy opened from the PTM's tree or a non-live Org/Team member. It needs a message in that run naming a file outside the workspace; tap it and expect "This file is available only on the host workspace." with no composer.
- D-05 on a Docker node in the Android app (AC-005, U-01): does `execCommand('copy')` work on `http://`? The selectable fallback shows either way.
- D-07 emulator (AC-007): the preview loads; `window.AutoByteusShell === undefined` inside the frame; the sandbox has no `allow-same-origin`; main-frame blob, foreign blob, `file:` and `javascript:` stay blocked.
- D-03 emulator (AC-004): Files screen → background → `adb shell am kill org.autobyteus.mobile` → reopen from recents → same URL. Remove the node meanwhile → ordinary start.
- D-17: app English with OS `de-DE` (and the reverse) on Memory, Work journal and token usage surfaces.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Probe runs: B04, NVP-05, and `test:e2e:mobile-shell` with new phone-bundle cases for D-01, D-02, D-08 (phone field) and D-19.
- Emulator checks AC-004, AC-005 (U-01), AC-007 with an isolated node.
- AC-006 is already covered by the route E2E. Live Docker node-desktop is optional.
- Fresh-start desktop build (or a clean-clone guard run), because `autobyteus-web/scripts/guard-localization-boundary.mjs` changed (TESTING § Fresh-start build).
