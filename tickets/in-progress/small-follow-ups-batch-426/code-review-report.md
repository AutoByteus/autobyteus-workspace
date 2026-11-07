# Code Review Report — small-follow-ups-batch-426 (autobyteus-426), round 1

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006, round-1 rows)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections E-02, E-07, E-08, E-14, E-17, E-18)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-006, D-01…D-19)
- Supplemental Task Artifacts Reviewed As Context: Product spec `phone-setup-remote-node-wording/ui-ux-spec.md` (via IMP-13 and the catalog spec); `follow-ups.md`
- Relevant Solution Revision IDs: SR-004, SR-005, SR-006
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002/003/004 sections)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff IR-001 (head `af76ab7ff5`, base `6225a734a3`, 427 merged at `ed29eb6522`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The diff stays inside existing owners (≈60 source files across web, Android, server, most of them one-line locale arguments). High is still right: D-07 relaxes the WebView navigation rule, and D-02 changes when the phone drops its credential. Manifest diff is empty; no persistence or API change beyond the additive `public` kind and `WORKSPACE_PATH_REFUSED`. None of the design's escalation triggers fired. R-01 was measured in IMP-05.

## Review Scope

- Changed implementation and behavior reviewed: D-01, D-02 (SR-005 shape), D-03, D-05, D-06, D-07, D-08 (server, web, the RR-03 server-internal forms), D-10, D-11, D-12, D-13, D-14, D-16, D-17, D-18, D-19; baseline fix `709617b6eb`.
- Files / areas reviewed: `git diff 6225a734a3..af76ab7ff5` for all non-ticket files. Read in full: Android `TrustedNavigationPolicy`, `AutoByteusWebView`, `OpenPageRestore`, `MainActivity` (save/restore, `configChanges`), `NodeConnectionFlow`; web `remoteAccessReadRefusal`, `mobileNodeSessionStore`, `MobilePairedShell`, `MobileRunList`, the run-history store/load/selection/inspection actions, `useRunHistorySectionLoad`, `app.vue`, `useVncSession`, `MobileNodeDesktop`, `MobileNodeDesktopClipboard`, `workspacePathRefusal`, `runWorkspaceChoice`, `useMobileLaunchWorkspaces`, `stores/workspace.ts createWorkspace`, `plugins/30.apollo.client.ts` (default `errorPolicy`), `phoneSetupTextKey`, `PhoneWayTab`, `PhonesPanel`, `AgentEventMonitor`, `guard-localization-boundary.mjs`, a sample of the D-17 sites, `useLocalization`; server `workspace-folder-check`, `workspace-manager.createWorkspace`, the workspace resolver, `node-desktop-viewers`, `ip-address-ranges`, `server-address-candidate-service`; the six RR-03 `ensureWorkspaceByRootPath` call sites; changed E2E tests and probes; `docs/design-cases.md`.
- Explicit exclusions: 427's merged changes (reviewed in 427). I reran none of the recorded checks; the handoff's IMP-01…IMP-13 cover the current code. Probes, emulator checks and the fresh-start build are left to API/E2E, as the handoff says.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes` (round-1 REQ/AC rows, DEC-001…DEC-011).
- Design-spec behavior map verified against the implementation: `Yes`, per row below.
- Design review report and round confirmed: ARCH-REV-002 (SR-004), ARCH-REV-003 (SR-005, D-02 revised), ARCH-REV-004 (SR-006, D-19); all Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none. The two D-05 feedback choices (the sheet closes after a send; the button reads "Copied") sit inside REQ-005 and add no behavior.
- Remaining material ambiguity: none blocking. D-13's Case 17 "fix" wording is for the Solution Designer to confirm (residual).

| Behavior ID | Status | Implementation Path And Lifecycle Evidence | Notes |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `app.vue` `definitionFeedEnabled = isAppReady && (!isMobileRemoteAccessRuntime() \|\| isPaired)` → existing feed retain/release | — |
| BEH-002 | Confirmed (see F-001) | `fetchRunHistoryTree` sets `historyReadFailure` with `error` at :156-157 and :191-192 and clears it with `error` at :110-111, :136-137, :422-423, :444 (failure from another source), selection :72, inspection :84 → `readHistory` cause → `remoteAccessReadRefusal` (Apollo `networkError.statusCode/result.code`, axios) → `MobilePairedShell` switch → `rejectLocalSessionForAuthFailure` / `recordCheckOutcome` → `connection` → `MobileRunList` | Default `errorPolicy` for `mutate`/`query` is `none` (`30.apollo.client.ts`), so Apollo throws `ApolloError` with the `networkError` the rule reads |
| BEH-003 | Confirmed | `onSaveInstanceState` saves only `Screen.Web` and `isPageSaved()`; `onCreate`: shared → `OpenPageRestore.read` (policy main-frame + `/mobile` path) → `flow.open(entry, url)` → last used → start. Rotation does not recreate (`configChanges` in the manifest) | RR-02 preserved (shared text first) |
| BEH-005 | Confirmed | `useVncSession` `clipboard` listener (current session only), cleared on disconnect/stop; `sendClipboardText` only in Control + connected; the sheet is shown only in Control + connected; copy runs only on tap | Known noVNC secure-origin risk recorded by implementation |
| BEH-006 | Confirmed | `admit(viewer, stream, mode)` → `refuse()` logs reason, limit, mode, viewer kind, open, max; no device ID, credential or address | Matches the module's existing `console.*` convention |
| BEH-007 | Confirmed | `classify(url, entry, isMainFrame)`: `blob` → inner URL must be http(s) same-origin and `!isMainFrame`; else Block. `loadTrusted` passes `true`; client passes `request.isForMainFrame`; deprecated overload removed | `isSameOrigin` shared by both rules; emulator AC-007 still required (RR-01) |
| BEH-008 | Confirmed | `createWorkspace`: neither active nor registered → `assertWorkspaceFolder(raw input)` → `WorkspacePathRefusedError` → resolver `GraphQLError WORKSPACE_PATH_REFUSED {reason}` → `readWorkspacePathRefusal` (phone field, desktop launch error) / `null` (restore through `ensureRunHistoryWorkspaceByRootPath`). Server-internal forms go through `ensureWorkspaceByRootPath` → `createWorkspace` (canonical absolute path) | Registered IDs skip the check (DEC-004). Project metadata's own `WORKSPACE_PATH_INVALID` is a separate reference check ("never inspect a folder"), not a duplicate |
| BEH-010/011/014 | Confirmed | B04 counts "Customized" rows; `waitForDevServerReady` after `alpha.start()`; AR-14 waits on `checkedAt` moving, label built after the wait fails | — |
| BEH-012 | Confirmed | docs name `CollaborationMessageReferenceViewer` | — |
| BEH-013 | Confirmed (see F-003) | Case 5 has the 277 bullet; Case 17 added | The design's third Case 5 text (426 SR-005/IMP-02) is missing |
| BEH-016 | Confirmed | `phoneSetupTextKey(kind, path)` explicit list → `remote.<path>`; both components pass `{ name }` | — |
| BEH-017 | Confirmed | sites pass `resolvedLocale`; utilities read `useLocalization()` at use (it is a module-level runtime, safe outside setup); guard's new rule covers dirs + `utils/`, tests excepted | — |
| BEH-018 | Confirmed | `classifyInterfaceAddress` uses `ip-address-ranges`; public appended after the loop; link-local skipped | — |
| BEH-019 | Confirmed | status block on `filePreviewStatus` outside `!readOnly`; composer slots and notice stay inside | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002 | BEH-002 | User | desktop user revokes a phone | cut a lost phone off | Phone Setup revoke → phone check | Normal | node 403 `REMOTE_ACCESS_DEVICE_REVOKED` → Apollo `networkError.result.code` → `session_rejected` | pairing screen | REQ-002, IMP-02 | Supported Normal | Use |
| SCN-003 | BEH-002 | User | desktop user turns Phone Access off | pause phones | switch → phone check | Normal | 403 `PHONE_ACCESS_DISABLED` → `phone_access_off` | bar/banner, session kept | REQ-002 | Supported Normal | Use |
| SCN-004 | BEH-003 | System | Android | memory pressure | process death → recents | Normal | DS-003 | same page | REQ-003 | Supported Normal | Use |
| SCN-005 | BEH-005 | User | phone user | move text | Clipboard tap | Normal | DS-004 | text moved | REQ-005 | Supported Normal | Use |
| SCN-007 | BEH-007 | User | phone user | HTML preview | preview open | Normal | DS-006 | sandboxed preview | REQ-007 | Supported Normal | Use |
| SCN-008 | BEH-008 | User/Contract | phone/desktop user; server-internal launches | open a folder by path | path field, New chat, run launch | Normal | DS-007 | refused with reason or registered | REQ-008, RR-03 | Supported Normal | Use |
| SCN-012/013/011/014 | BEH-017/018/016/019 | User | per requirements | per requirements | per requirements | Normal | per design | per AC | requirements | Supported Normal | Use |
| DOC-013 | BEH-013 | Contract | Solution Designer (design-case owner) | record design lessons | `docs/design-cases.md` | Normal | D-13 text | the texts the design gives | design-spec D-13, SR-005 | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `remoteAccessReadRefusal` also classifies the two new codes by message text (`message.includes('PHONE_ACCESS_DISABLED')`; `REMOTE_ACCESS_DEVICE_REVOKED` added to the 401 regex) | SR-005 / ARCH-REV-003 contract: the new codes come only from `networkError.result.code` / `response.data.code`; the message fallback is kept "for the 401 and auth codes"; option C (code in message text) rejected | SCN-002 / SCN-003 check | No supported path yields such a message: Apollo's is "Response not successful: Received status code 403", axios's "Request failed with status code 403" (IMP-02), and `historyReadFailure` always carries the object. The branches are unreachable for the supported shapes, untested, and they would end a session (credential drop, the High-risk item) on message text, which is the classification ARCH-REV-003's pass relied on not existing | `remoteAccessReadRefusal.ts:41-45`; `design-review-report.md:248-250`; design-spec D-02 | Promote | This ticket | F-001: remove both message-text additions; keep today's 401/auth-code fallback |
| C-02 | `resolveRunWorkspaceChoice` keeps `workspaceId: string \| null`, `workspaceId ? … : null` and `!workspaceId` after `findOrRegisterWorkspaceByRootPath` became `Promise<string>` (throws instead of null) | Principle 7 (dead code in touched files) | desktop folder launch | the null branch can no longer be taken; reads as if null were still a result | `runWorkspaceChoice.ts:114-125`; `runHistoryLoadActions.ts:467-499` | Promote | This ticket | F-002 |
| C-03 | Stray blank line added inside the catalog-guard loop | engineering hygiene | — | no behavior; noise in a build-input diff | `guard-localization-boundary.mjs:71` | Promote (folded into F-002) | This ticket | drop it |
| C-04 | D-13 Case 5 lacks the design's third text (426 SR-005/IMP-02: trace an error through the real client library and every store that keeps it) | DOC-013; design-spec D-13 ("Case 5 also gets, from this ticket: …"); SR-005 "Design case" line | doc read | the lesson of this ticket's own Design Impact is not recorded | `grep -n "autobyteus-426" docs/design-cases.md` → only the Case 17 mention | Promote | This ticket | F-003 |
| C-05 | After Phone Access off, a later quiet poll success does not clear "Phone access off" until the next check | REQ-002 keeps the quiet poll unchanged | — | same as today's `authorizedApiReachable` | REQ-002 Preserved | Reject | — | preserved behavior |
| C-06 | Folder launch with an empty root path now reaches the node and is refused `not_absolute` instead of the old early `null` | — | no UI produces a folder choice with an empty path | — | `runWorkspaceChoice` callers | Reject | — | not reachable |
| C-07 | Activity recreated by a non-rotation config change (e.g. dark mode) now restores the open page | REQ-003 intent | system config change | reopens the same page | manifest `configChanges` | Reject | — | consistent with the intent, not a defect |
| C-08 | `WORKSPACE_PATH_REFUSED` also reaches the Apollo error link's `uiErrorStore` | — | path refusal | shown only in the debug panel (`showDebugErrorPanel`) | `app.vue:11` | Reject | — | no user-visible effect |
| C-09 | IPv4-mapped IPv6 interface address would classify as `public` | — | `os.networkInterfaces` does not report mapped addresses | — | Node API | Reject | — | not reachable |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | handoff § Task Design Health; bounded refactors (range owner, find-or-register split) done as designed | — |
| Matches behavior-defining supplements | Pass | `REMOTE_WORDED_PATHS` = the spec's line set; catalog spec + IMP-13 | — |
| Data-flow spine preservation | Pass | DS-001…DS-009 traced as above | — |
| Ownership boundary preservation | Pass | policy stays the one navigation owner; `WorkspaceManager` owns the invariant; the resolver only maps the error | — |
| Off-spine concern clarity | Pass | `OpenPageRestore`, `workspace-folder-check`, `workspacePathRefusal`, `phoneSetupTextKey` each serve one owner | — |
| Existing capability reuse | Pass | `MobileBottomSheet`, `ip-address-ranges`, `useLocalization`, the existing guard | — |
| Reusable owned structures | Pass | one range owner; one refusal reader for two web surfaces | — |
| Shared-structure tightness | Pass | `NodeDesktopAdmission` refused variant, `MobileCheckOutcome`, `MobileRunListConnection`, `WorkspacePathRefusalReason` | — |
| Repeated coordination ownership | Pass | `recordCheckOutcome` sets both facts in one place | — |
| Empty indirection | Pass | `ensureRunHistoryWorkspaceByRootPath` is the designed `catch → null` facade | — |
| SoC / file responsibility | Pass | clipboard sheet in its own component; remote catalog in its own file | — |
| Dependency direction | Pass | `server-addressing → remote-access/services/ip-address-ranges`; `OpenPageRestore → policy` | — |
| Authoritative Boundary Rule | Pass | the sheet uses `useVncSession` only; no caller reaches past `WorkspaceManager` or the policy | — |
| File placement | Pass | new files next to their owners | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | `classify(url, entry, isMainFrame)` explicit frame; `findOrRegister…` throws vs. facade returns null | — |
| Naming / one vocabulary | Pass | `public`, `WORKSPACE_PATH_REFUSED`, `phone_access_off` used the same everywhere | — |
| No unjustified duplication | Pass | duplicate IP checks removed | — |
| Patch-on-patch control | Pass | the SR-005 revision is implemented cleanly, not layered | — |
| Dead code removed in touched files | Fail | F-002 (null branch in `runWorkspaceChoice`); F-001's message branches are unreachable too | F-001, F-002 |
| Test scenarios and assertions clear | Pass | specs use Apollo's real 403 shape; refusal spec, store spec, run-list states, policy +2 cases, restore 5 cases | — |
| Test fixtures/helpers reusable and coherent | Pass | `dev-server-ready.mjs` shared helper; delegation fixture now creates its folder | — |
| No stale/duplicated tests | Pass | B04 constant assertion replaced; old auth-failure spec renamed | — |
| API/E2E readiness | Pass | handoff lists the probe, emulator and fresh-build work with concrete steps | — |

## Source File Size And Structure Audit

Effective lines = non-blank, non-comment lines.

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryStore.ts` | 486 | 487 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | 459 | 469 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-android/.../MainActivity.kt` | <348 | <360 (physical) | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue` | <220 | <242 (physical) | Pass | Pass | Pass (sheet split out) | Pass | — | — |
| all other changed source files | — | each <250 physical | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | — |
| No legacy old-behavior retention | Pass | `isRemoteAccessAuthFailure`, `recordAuthorizedApiReachability`, `connected` prop, `isLanIp`/`isTailnetLikeIp`, the deprecated WebView overload all removed |
| Dead code removed in touched files | Fail | F-002 (and F-001's unreachable branches) |
| Persisted-data decision followed | Pass | `Not Affected`; registry only read; Bundle transient; `historyReadFailure` in memory |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| `remoteAccessReadRefusal.ts:43` `message.includes(PHONE_ACCESS_OFF_CODE)` and `REMOTE_ACCESS_DEVICE_REVOKED` in the regex at :44 | DormantPath | no supported failure shape carries the code in its message (IMP-02); untested | contradicts SR-005/ARCH-REV-003 | F-001 |
| `runWorkspaceChoice.ts:114-125` `string \| null` typing, `workspaceId ? … : null`, `!workspaceId` | DeadCode | `findOrRegisterWorkspaceByRootPath(): Promise<string>` | null no longer a result | F-002 |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: D-12 and D-13 are doc items; D-13 is incomplete (F-003).
- Files or areas likely affected: `docs/design-cases.md` (Case 5). Delivery syncs other docs as usual.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Status | Note |
| --- | --- | --- |
| R-01 (AR-14 re-check never ends) | No Longer Relevant | IMP-05: ends ~108 ms after the update |
| WebView reports `isForMainFrame=false` for the preview frame (escalation b) | Confirmed in code; runtime proof pending | emulator AC-007 (API/E2E) |
| RR-01…RR-03 | Confirmed | RR-03's six forms reach `createWorkspace`; one form covered by the new E2E |

New or reclassified premises: `None`.

## Review Scorecard (Mandatory)

- Overall score: `9.3/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | every DS traced end to end in code as designed | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | single owners kept (policy, manager, refusal rule, session store) | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | explicit frame argument; throwing finder vs null facade | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | sheet, restore, folder check, text key each in their own file | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | tight unions; `historyReadFailure` set/cleared only with `error` | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | consistent vocabulary | leftover `string \| null` in `runWorkspaceChoice` reads as a live null result | F-002 |
| 7 | API/E2E Readiness | 9.3 | clear list of probes, emulator checks and the fresh build | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.0 | behavior correct for all supported shapes | the High-risk refusal rule adds message-text classification for the new codes, which the reviewed design excluded (F-001); D-13 text incomplete (F-003) | F-001, F-003 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | all designed removals done | — | — |
| 10 | Cleanup Completeness | 9.0 | most dead code removed | F-001 unreachable branches; F-002 null branch and stray blank line | F-001, F-002 |

## Findings

### F-001 — The read-refusal rule classifies the two new codes by message text (Local Fix, implementation)

- Where: `autobyteus-web/utils/remoteAccess/remoteAccessReadRefusal.ts:41-45`.
- What: after the status/code checks, the fallback adds `if (message.includes(PHONE_ACCESS_OFF_CODE)) return 'phone_access_off'` and puts `REMOTE_ACCESS_DEVICE_REVOKED` in the 401/auth-code regex.
- Basis: design-spec D-02 (SR-005): "keeps today's message fallback for the 401 and auth codes"; option C ("behavior by message text") rejected. ARCH-REV-003 passed the revision with "no classification by message text for the new codes" (`design-review-report.md:250`). REQ-002 / AC-002 (revoked → session rejected) is the credential drop this ticket rates High.
- Consequence: no supported failure carries these codes in its message (IMP-02: Apollo "Response not successful: Received status code 403"; axios "Request failed with status code 403"), so the branches are unreachable and untested. They leave a credential-ending decision keyed on text, and they contradict the condition the High-risk review passed on.
- Required action: remove the `PHONE_ACCESS_DISABLED` message check and drop `REMOTE_ACCESS_DEVICE_REVOKED` from the regex, so the fallback is exactly today's 401 / `REMOTE_ACCESS_AUTH_REQUIRED` / `REMOTE_ACCESS_AUTH_INVALID` rule. Optionally add a spec line showing that a bare message naming either new code returns `null`. The existing spec stays green.

### F-002 — Leftover null handling and a stray line in touched files (Local Fix, implementation)

- Where: `autobyteus-web/services/workspace/runWorkspaceChoice.ts:114-125`; `autobyteus-web/scripts/guard-localization-boundary.mjs:71`.
- What: `findOrRegisterWorkspaceByRootPath` now returns `Promise<string>` and throws on failure, but the caller still declares `workspaceId: string | null` and tests `workspaceId ? … : null` / `!workspaceId`. The guard diff adds an empty line inside the unchanged catalog loop.
- Basis: Principle 7 (dead code in touched files).
- Required action: type `workspaceId` as `string` (or assign it in the `try` and use it directly), resolve metadata unconditionally, and keep only the `!workspaceMetadata` check. Remove the blank line.

### F-003 — D-13: Case 5 lacks this ticket's own lesson (Local Fix, implementation)

- Where: `docs/design-cases.md` Case 5.
- What: design-spec D-13 gives three texts. The 277 Case 5 bullet and Case 17 are present. The third text is missing ("Case 5 also gets, from this ticket: autobyteus-426 (SR-005, IMP-02): the phone's refusal rule was designed on the error shape its own unit spec used … trace an error from the server to the code that reads it through the real client library and every store that keeps it, not through the shape a test builds."). SR-005's "Design case" line records the same intent.
- Required action: add it as an "Again in autobyteus-426 (SR-005, IMP-02)" bullet in the file's form. Add `autobyteus-426, SR-005` to the Case 5 heading list, as was done for 277.

## Follow-ups

- Follow-ups this review added: None. FU-001 and FU-002 stand as recorded.

## Classification

- `Local Fix` (implementation-owned): F-001, F-002 and F-003 are bounded corrections; none needs a requirement or design update.

## Recommended Recipient

- `/software_engineering_team/implementation_engineer` (implementation-owned Local Fix). The fix then returns through code review and API/E2E.

## Residual Risks

- D-07: the runtime frame flag (`isForMainFrame=false` for the preview iframe) and AC-007's `window.AutoByteusShell === undefined` are proven only on the emulator (RR-01). API/E2E must keep that check.
- D-05: noVNC on a secure origin writes the clipboard itself, and Copy stays disabled there (the implementation's known risk). U-01 (`execCommand('copy')` on `http://`) needs the emulator.
- D-08: server-internal launches into a removed, unregistered folder now fail earlier with the folder reason (RR-03, accepted). The full server E2E suite has not been run since D-08. API/E2E should run it, because several suites register workspaces.
- D-13: the Case 17 "fix" line comes from E-09. The Solution Designer may want to confirm it.
- The fresh-start desktop build is still owed, because `guard-localization-boundary.mjs` changed.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3 average; Runtime Correctness 9.0 and Cleanup Completeness 9.0 are below the 9.2 target (F-001, F-002, F-003); every other category is 9.3–9.5.
- Failure Origin: N/A (implementation review)
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes: three small, bounded fixes. The design, ownership and High-risk paths are otherwise implemented as reviewed. After the fix, a Targeted Delta Review is expected.
