# Design Review Report — small-follow-ups-batch-426, round 1 (review round 5)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/requirements-doc.md`
- Upstream Investigation Notes: `…/small-follow-ups-batch-426/investigation-notes.md`
- Upstream Solution Revision Record: `…/small-follow-ups-batch-426/solution-revision-record.md` (SR-001…SR-008)
- Reviewed Design Spec: `…/small-follow-ups-batch-426/design-spec.md` (SR-008, D-01…D-19)
- Supplemental Task Artifacts Reviewed: `product-design-request.md`; Product spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` (design commit `0341b3af`); `follow-ups.md` (FU-001); `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-001…SR-008
- Architecture Review Revision Record: `…/small-follow-ups-batch-426/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: 5
- Trigger: SR-008, answering the code reviewer's API/E2E failure-origin review CRR-003 (F-API-001 → D-02, F-API-002 → D-03); focused re-review of D-02 and D-03
- Prior Review Round Reviewed: 4 (ARCH-REV-004, Pass)
- Latest Authoritative Round: 5
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`, branch `codex/small-follow-ups-batch-426`, base `6225a734a3`. I read the cited code (paths below) on 2026-11-07.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: Yes. Item 7 relaxes `TrustedNavigationPolicy` (the WebView's only navigation rule), next to the `AutoByteusShell` bridge. That is a security-boundary change. Item 2 changes when the phone drops its credential. The other items are local deltas inside existing owners.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The design's user approval is `Not required`, not `Pending`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (AR-001 and AR-002 rows resolved in SR-004)
- Approved requirements / intended behavior understood: Yes. Round 1 is REQ-001…003, 005…008, 010…014, 016…018. REQ-004 (DEC-001) and REQ-015 (DEC-011) are dropped with evidence. REQ-009 is round 2.
- Relevant existing behavior and evidence confirmed: Yes. See the line checks below.
- Scope guardrail confirmed: Yes. In-scope UC-001…UC-018 (round 1); Out of Scope (iOS, 403/417/416 security rows, clipboard without a tap, seeding rule, cleanup of bad registered paths, non-web formatting); Preserved column BEH-001…018; Review Authority stated.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: Yes (AR-001 → REQ-002/AC-003; AR-002 → REQ-016/AC-016).
- Remaining material ambiguity: None that blocks. See the residual risks.
- Statements about existing code, checked at their cited lines:
  - `TrustedNavigationPolicy.kt:17-48`: blocks every non-http(s) scheme before the origin check. **True.** The policy has no frame parameter today. **True.**
  - `AutoByteusWebView.kt:100-131`: has two overrides, request and deprecated String. `build.gradle:45` has `minSdk = 26`. **True.** Removing the String overload as dead code is justified.
  - `ShellBridge.kt:35-46, 80-81`: the bridge is registered for `entry.origin`, and `ShellBridgeMessages.read` ignores messages where `!isMainFrame`. **True.**
  - `HtmlPreviewer.vue:4-10, 41-61`: `sandbox="allow-scripts"`, using a workspace static URL or a page-origin `blob:`. **True.** The web app has only two iframes: `HtmlPreviewer` (sandboxed, blob/static) and `ApplicationIframeHost` (no blob src). So in practice the new blob rule admits only the sandboxed preview.
  - `MainActivity.kt:59-89`: no `onSaveInstanceState`; `onCreate` handles shared text, then last used, then start. **True.** `NodeConnectionFlow.open(entry)` uses `entry.mobileUrl` (:71-73). **True.**
  - `app.vue:41-46`: the feed is retained on `isAppReady` only. **True.** `useAgentPackageDefinitionChangeFeed` has one caller. **True.** `mobileNodeSessionStore.isPaired` (:103) and `bindSession` (:106-110) bind the node synchronously before watchers flush. **True.**
  - `remoteAccessAuthFailure.ts`: 401 or two auth codes, plus a message regex. **True.** One production caller, `MobilePairedShell.vue:110`. **True.**
  - `mobileNodeSessionStore.fetchStatus` (:123-146): sets `authorizedApiReachable` directly. `recordAuthorizedApiReachability` (:195) is a setter. **True.** This matters for AR-001.
  - `node-desktop-viewers.ts:59-71`: refusals return without a log; the route has `mode` before admission (`node-desktop.ts:94`). **True.**
  - `workspace-manager.ts:54-103`: no existence check; `ensureWorkspaceByRootPath` goes through `createWorkspace`. **True.** The resolver wraps all errors with `new Error(String(error))` (`workspace.ts:116-122`). **True.**
  - Web callers `runHistoryLoadActions.ts:454-498`, `runWorkspaceChoice.ts:99-118`, `useMobileLaunchWorkspaces.ts:56-74`, `workspaceMetadataActions.ts:154`. **True.** The main Apollo client uses the default `errorPolicy` (no `defaultOptions` override for `createWorkspace`), so the thrown `ApolloError` keeps `graphQLErrors[].extensions`. D-08's "verify the cause is kept" will hold.
  - `server-address-candidate-service.ts:6-22, 104-121`: duplicate range checks, `? "lan" : "lan"`, 169.254 counted as LAN. **True.** Memory Sync stores the chosen `baseUrl`, not the candidate `id`/`kind` (`MemorySyncCard.vue:35`), so the `public-…` ID change is not persisted.
  - `PhoneWayTab.vue` / `PhonesPanel.vue:103-105` render every string the Product spec changes. `phoneAccessStore.kind` (:80) and `nodeName` (:102) exist. **True.**
  - `useLocalization()` is a module singleton over `localizationRuntime` (`composables/useLocalization.ts`), so utilities may call it outside setup. **True.** `guard:localization-boundary` runs in every `build:electron*` script (`package.json:45-50`). **True.**

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass (A-08: history state cannot carry one check's outcome) | Pass | Confirmed | SR-008 `checkCredential` verified (ARCH-REV-005) |
| BEH-003 | System | Pass | Pass (E-03 corrected by API-08) | Pass | Confirmed | SR-008 AC-004a this round; AC-004b round 2 (DEC-013) |
| BEH-005 | User | Pass | Pass (U-01 handled by the fallback) | Pass | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | User/Contract | Pass | Pass | Pass | Confirmed | Residual note RR-03 |
| BEH-010/011/014 | Operational | Pass | Pass (R-01 open, escalation defined) | Pass | Confirmed | — |
| BEH-012/013 | Doc | Pass | Pass | N/A | Confirmed | — |
| BEH-016 | User | Pass | Pass | Pass | Confirmed | AR-002 resolved (`REMOTE_WORDED_PATHS`) |
| BEH-017 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-018 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-019 | User | Pass | Pass (E-19 read on `origin/personal` `933163361c`) | Pass | Confirmed | — (ARCH-REV-004) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope Clear | Linked | Internally Complete | Consistent With Core | Status/Approval Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product spec `phone-setup-remote-node-wording/ui-ux-spec.md` (+VIS-001…009) | Pass | Pass | Pass | Pass (D-16 covers status, notes, no-address, allowed note, How it works; Docker and Company lines left unchanged) | Pass | — |
| `product-design-request.md` | Pass | Pass | Pass | Pass (row now `Done`; the spec row `Approved`, user's "approved") | Pass | AR-003 resolved |
| Core artifacts' revision/status lines | Pass | Pass | Pass | Pass (requirements doc and investigation notes at SR-004; DEC-002, Readiness Check updated) | Pass | AR-003 resolved |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Design spec § Task Design Health Assessment | — |
| Root cause explicit and evidence-backed | Pass | Missing Invariant (1, 2, 7, 8), Duplicated Policy (18), Local (3, 5, 6, 17); checked against the cited code | — |
| Refactor decision explicit | Pass | Yes, bounded: the item-18 range owner and the D-08 find-or-register split | — |
| Decision reflected in the design | Pass | D-08 and D-18; removal plan | — |

## Spine Inventory Verdict

| Spine | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner, Call Order | Off-Spine Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | feed | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | read refusal | Pass | Pass | N/A | Pass | Pass (shell drives: classify → store record → render) | Pass | Pass (state rule: AR-001) |
| DS-003 | open-page restore | Pass | Pass | N/A | Pass | Pass (`MainActivity` drives `read` → `flow.open`; `OpenPageRestore` uses the policy) | Pass | Pass |
| DS-004 | clipboard | Pass | Pass | N/A | Pass | Pass (return spine given) | Pass | Pass |
| DS-005 | refusal log | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | blob subframe | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | workspace path | Pass | Pass | Pass (resolver = transport; `ensureRunHistoryWorkspaceByRootPath` = null wrapper) | Pass | Pass | Pass | Pass |
| DS-008 | locale (local) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-009 | addresses | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| BEH-016 path | wording | Pass | Pass | N/A | Pass | Pass | Pass | Pass (selection rule: AR-002) |

## Boundary Encapsulation Verdict

| Boundary | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TrustedNavigationPolicy.classify` | Pass | Pass | Pass | Pass | The blob rule lives in the policy, not in `AutoByteusWebView` |
| `WorkspaceManager.createWorkspace` | Pass | Pass | Pass | Pass | All registration forms go through it, including `ensureWorkspaceByRootPath` |
| `remoteAccessReadRefusal` | Pass | Pass | Pass | Pass | — |
| `useVncSession` | Pass | Pass | Pass | Pass | The sheet does not touch `rfb` |
| `ip-address-ranges.ts` | Pass | Pass | Pass | Pass | `network-interface-classifier.ts` keeps its Phone Access policy and shares the range facts |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server-addressing → remote-access ranges | Pass | Pass | Pass | Pass | Same direction as the existing `url-normalization` import |
| `OpenPageRestore` → policy, `SavedNodeEntry` | Pass | Pass | Pass | Pass | — |
| web `workspacePathRefusal.ts` | Pass | Pass | Pass | Pass | Does not call the store |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `remoteAccessReadRefusal(cause)` | Pass | Pass | Pass | Low | Pass |
| `recordCheckOutcome('reachable' \| 'unreachable' \| 'phone_access_off')` | Pass | Pass | Pass | Low | Pass (sets both facts every check; session end clears off) |
| `classify(url, entry, isMainFrame)` | Pass | Pass | Pass | Low | Pass |
| `OpenPageRestore.save/read` | Pass | Pass | Pass | Low | Pass |
| `useVncSession` clipboard | Pass | Pass | Pass | Low | Pass |
| `NodeDesktopAdmission` refused | Pass | Pass | Pass | Low | Pass |
| `assertWorkspaceFolder` / `WORKSPACE_PATH_REFUSED {reason}` | Pass | Pass | Pass | Low | Pass |
| `findOrRegisterWorkspaceByRootPath` | Pass | Pass | Pass | Low | Pass |
| `classifyInterfaceAddress` | Pass | Pass | Pass | Low | Pass |
| `phoneSetupTextKey(kind, path)` + `REMOTE_WORDED_PATHS` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Sheet UI | Pass | Pass | N/A | Pass | `MobileBottomSheet` |
| Off text | Pass | Pass | N/A | Pass | Existing sentence |
| IP ranges | Pass | Pass | N/A | Pass | Extend `ip-address-ranges.ts` |
| Locale and guard | Pass | Pass | N/A | Pass | `resolvedLocale`, existing guard |
| Restore owner | Pass | Pass | Pass | Pass | `OpenPageRestore` keeps the decision unit-testable |
| Folder check | Pass | Pass | Pass | Pass | `workspace-folder-check.ts` |

## Subsystem / Capability-Area Allocation Verdict

| Area | Clear | Sound | Right Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All (web phone shell, Android shell, server node-desktop, workspaces, addressing, localization, tests/docs) | Pass | Pass | Pass | Pass | All `Extend` |

## Reusable Owned Structures Verdict

| Structure | Evaluated | Shared File | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| IP range predicates | Pass | Pass | Pass | Pass | — |
| Workspace refusal reason | Pass | Pass | Pass | Pass | One enum, server to web |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | No Redundancy | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ServerAddressCandidateKind` + `public` | Pass | Pass | Pass | N/A | Pass | — |
| `MobileRunList.connection` (three states) | Pass | Pass | Pass | N/A | Pass | Replaces the boolean |

Derived consumers listed with a decision for each: `Pass` (Memory Sync mapper and web store, Remote Collaboration base-URL order, the policy's callers, the admission's caller).

One vocabulary: `Pass`. "Read refusal", "open page" and "public address" each keep one meaning.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All files in the design's mapping | Pass | Pass | N/A | Pass | `MobileNodeDesktopClipboard.vue` split out, so `MobileNodeDesktop.vue` does not grow |

## Subsystem / Folder / File Placement Verdict

| Path | Clear | Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New files (`OpenPageRestore.kt`, `workspace-folder-check.ts`, `workspacePathRefusal.ts`, `remoteAccessReadRefusal.ts`, `phoneSetupTextKey.ts`, the sheet) | Pass | Pass | Low | Pass | Next to their owners |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `isTailnetLikeIp`, `isLanIp` | Pass | Pass | Pass | Pass | — |
| `isRemoteAccessAuthFailure` | Pass | Pass | Pass | Pass | One caller (verified) |
| Deprecated `shouldOverrideUrlLoading(view, url)` | Pass | Pass | Pass | Pass | Dead on minSdk 26 |
| `connected` prop | Pass | Pass | Pass | Pass | — |
| `recordAuthorizedApiReachability` | Pass | Pass | Pass | Pass | One production caller (`MobilePairedShell.vue:114`, verified); `MobileRemoteAccessShell.spec.ts:124,132` must move to `recordCheckOutcome` |
| `diagnosticFromWebSocketClose` | Pass | N/A | Pass | Pass | Outside touched files → FU-001 |

## Legacy / Backward-Compatibility Verdict

| Area | Exists | Clean Cut | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Refusal rule, ranges, WebView override | No | Pass | Pass | — |
| Registered-path acceptance (DEC-004) | No | Pass | Pass | Approved product rule, not a compatibility branch |

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace registry, saved nodes, credentials, run history | Not Affected | Pass | Pass | N/A | Pass | Read only |
| Candidate `id` (`lan-x` → `public-x`) | Not Affected | Pass | Pass | N/A | Pass | Not stored; only `baseUrl` is |
| Android saved-instance Bundle | Not Affected | Pass | Pass | N/A | Pass | System-transient |

## Change / Refactor Safety Verdict

| Area | Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Server → Web → Android → Probes | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Item 2 switch | Yes | Pass | Pass | Pass | — |
| Item 7 blob decisions | Yes | Pass | Pass | Pass | — |
| Item 8 registered vs unregistered | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### P-01 — Phone Access is off, then the phone loses the network before a check

- Related requirement: REQ-002; AC-003 (Alternate: "Network down still shows 'Can’t reach `<node>`.'")
- Relevant behavior: BEH-002
- Initiating basis kind: `User`
- Trigger: the desktop user turns Phone Access off (Phone Setup switch, SCN-003). The phone shows the off banner. The phone user then leaves the Wi-Fi or the node goes offline, and taps Check or Retry, or reopens the page while the shell stays mounted.
- Support evidence: Phone Setup switch (SCN-003); the run list's Check/Retry; the phone moving between networks is ordinary use.
- Forward path: `MobilePairedShell.checkStatus` → `fetchStatus` fails (`mobileNodeSessionStore.ts:139-141` sets `authorizedApiReachable=false`) → the history read fails with a network error → `remoteAccessReadRefusal` → `null` → `recordAuthorizedApiReachability(false)`. Under D-02's interface, `phoneAccessOff` is cleared only by `recordAuthorizedApiReachability(true)` or by session end, so it stays `true`. `connection` is then computed as `phone_access_off` first.
- Consequence: the bar says "Phone access off" and the banner says "`<node>` is reachable, but Phone access is off." while the node is unreachable. That contradicts AC-003's alternate.
- Reachability: `Reachable`
- Review consequence: AR-001.

### P-02 — An unsandboxed same-origin `blob:` iframe would receive `AutoByteusShell`

- Related: REQ-007, AC-007, QR-004
- Initiating basis kind: `User` (opening content in the phone page)
- Trigger: none in the current product. The only iframes are `HtmlPreviewer` (sandboxed, `allow-scripts` only) and `ApplicationIframeHost` (no blob src).
- Reachability: `Not Reachable` today. This is recorded as residual risk RR-01 and does not drive a finding.

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond the findings.

## SR-005 D-02 Re-Review (ARCH-REV-003)

- Premise correction verified against base code: `runHistoryLoadActions.ts:150-152` (workspace branch keeps only `error.message`; `store.error` only when not quiet), `:183-186` (outer catch, message only), `:106-109` (a non-quiet read clears `store.error` first), `useRunHistorySectionLoad.ts:33-40` (`readHistory` returns `runHistoryStore.error` string as `cause`). IMP-02 shows Apollo 3.14 exposes the 403 body as `networkError.result.code` and `networkError.statusCode`. So under the SR-004 design, `checkStatus` could not tell revoked from off: the premise was wrong, and the revision is needed.
- Revised shape: `historyReadFailure` (the thrown error) is kept beside `error`, and `readHistory` returns `historyReadFailure ?? error`. `remoteAccessReadRefusal` reads the Apollo shape and the axios shape, plus today's message fallback. This is acceptable:
  - One owner (the history load) records the read's failure. One owner (the refusal rule) classifies it.
  - No extra request, and no classification by message text for the new codes.
  - Every phone check runs a non-quiet `fetchTree`, which clears both fields at its start (`:108-109`). So the cause `checkStatus` classifies always comes from that same read.
- Several entry forms: the 401 path keeps working through the message fallback and now also through `networkError.statusCode`. Revoked and off are told apart only by `result.code` (both are 403). The Org-history branch never set `store.error` and still does not, so that is unchanged.
- Implementation precision (no design change): `historyReadFailure` is set only where a history read writes its failure into `error` (`:152` when not quiet, `:185`). It is cleared at every other write of `error`: `:109`, `:134`, `:415`, `:435`, `runHistorySelectionActions.ts:70` and `runHistoryTeamMemberInspectionActions.ts:82`. That way it never outlives the message it explains.
- Documentation note (non-blocking): the DS-002 spine line (`design-spec.md:132`) still names `sessionStore.recordPhoneAccessOff()`. D-02 and the Interface Boundary Mapping (`recordCheckOutcome`) are authoritative. The Solution Designer should correct the spine text at its next revision.
- E-14/R-01 correction (`checkedAt` exists; the re-check ends after about 108 ms) and the D-13 addition: consistent, and no structural impact.

## SR-006 D-19 Review (ARCH-REV-004)

- Current state verified on `origin/personal` `933163361c`, `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`:
  - `:23-39`: the status `<p data-testid="event-monitor-file-preview-status">` sits inside `<div v-if="!readOnly" class="shrink-0">`, together with the `composerContext` slot, `CollaboratorAddFailureNotice` and the `composer` slot.
  - `:18`: the feed emits `file-path-action` for every conversation (`:enable-event-monitor-file-actions="true"`).
  - `:97-108`: `handleFilePathAction` sets `filePreviewStatus` for the remote-run case and for the preview result, whatever `readOnly` is.
  - So a read-only conversation computes the status but never shows it. E-19 is confirmed.
- D-19's shape fits: the status gets its own `shrink-0` block gated on `filePreviewStatus`. The composer parts stay behind `!readOnly`. The status still belongs to its existing owner (`AgentEventMonitor`), with no new state, prop or event. Both forms (desktop read-only run, phone read-only run screen) use this one component, and AC-019 covers both with a component spec (`readOnly` true/false) and a phone probe step.
- Sequencing checked: `6225a734a3..origin/personal` (10 commits, autobyteus-427) changes `AgentEventMonitor.vue`, `useEventMonitorFilePreview.ts`, `useMobileNavigation.ts`, their specs and probes, `docs/content_rendering.md` and `docs/design-cases.md`. Two files overlap with this branch's work so far: `docs/content_rendering.md` (D-12) and `docs/design-cases.md` (D-13). 427 changes only Case 2's heading and adds no Case 17, so D-13's new Case 17 number does not collide. The ordering is sound: take in `origin/personal` first, then build D-19 on 427's version.
- Implementation guidance (no design change): commit or otherwise secure the uncommitted work before taking in `origin/personal`, following RELEASE.md's branch rules. Resolve the two docs files by keeping both sides. Re-run the 427 specs touched by the merge (`AgentEventMonitor.spec.ts`, `AgentEventMonitor.mobileFileOpen.spec.ts`) with D-19.

## SR-008 D-02 / D-03 Re-Review (ARCH-REV-005)

### D-02 — the phone check reads its own request (F-API-001)

- Premise correction accepted. A-08 (reproduced by API/E2E, verified by the code reviewer) shows:
  - `readHistory` answers `ok` while runs are listed (`useRunHistorySectionLoad.ts:38`).
  - A quiet poll during the check's read moves `workspaceRequestGeneration` forward (`runHistoryLoadActions.ts:107`), and the check's failure is then dropped (`:189`).
  - History-store state is shared display state, so it cannot carry the outcome of one call. ARCH-REV-003 accepted SR-005's premise that every check's read is the one classified ("a non-quiet `fetchTree` clears both first"). It did not account for a concurrent quiet poll superseding the read, or for the `ok` gate. That review miss is recorded here.
- Revised shape fits:
  - `checkCredential()` is one bounded read (`POST /graphql { __typename }`, about 100 bytes), sent only on open, Retry and Check. The poll and live streams are untouched, as REQ-002 requires.
  - It is the single source of the check's outcome. `remoteAccessReadRefusal({ status, code })` classifies with no client-library shapes and no message text.
  - The SR-005 store change is removed as a clean cut, and the desktop history goes back to its pre-ticket behavior.
  - This extra request replaces the option ARCH-REV-003 accepted only because no extra read was then needed. It is proportionate: one small request per user-started check.
- Server facts verified:
  - A phone bearer credential on a default-class HTTP route goes to `authService.authorizeMobileCredential` (`api/security/remote-access-route-policy.ts:203-205`).
  - The refusal body is `{ error, code, message }` with the rejection's status (`api/security/remote-access-policy-plugin.ts:35-48`).
  - Revocation is checked before Phone Access off (`remote-access/services/remote-access-auth-service.ts:55,60`), so a revoked phone on a node with Phone Access off is still rejected.
- Note N-1 (non-blocking): the Interface Boundary Mapping row `remoteAccessReadRefusal(cause) … keep the message-text fallback` (`design-spec.md:227`) still has the SR-004 wording. D-02 (`:273`, `({ status, code })`, no message text) is authoritative. The Solution Designer corrects the row.
- Note N-2 (implementation guidance): `authorizedFetch` resolves the credential through `useMobileNodeSessionStore()` (`utils/remoteAccess/authorizedTransport.ts:39-41`). Inside the store, `checkCredential` should call `fetchWithRemoteAccessCredential(url, init, session.credential)` with the store's own session credential. That way the store does not reach back into itself through the transport.

### D-03 — a re-delivered share is not run again (F-API-002)

- Evidence: in API-08 Run A, the share-started task re-handles its `ACTION_SEND` (expired-code screen). In Run B, the native restore reloads the exact URL. In Run C, a removed node gives the ordinary start.
- The new rule is explicit, not inferred from absence: in Android's lifecycle, a non-null `savedInstanceState` means recreation, and its starting intent was already handled. Without a `launchMode` in `AndroidManifest.xml`, each new `SEND` creates a fresh activity instance with no saved state, so a new share still wins, and `onNewIntent` is unchanged.
- RR-02 is superseded: the re-delivered share was a defect, not preserved behavior. REQ-003 now says this.
- Unit-test the re-delivery rule, as AC-004a asks.
- REQ-003 and AC-004 are narrowed for round 1 (AC-004a). Run screens (AC-004b) move to round 2 behind the user's DEC-013. This is a round split within the Task's "rounds allowed", recorded in SR-008. Round 1 does not depend on DEC-013's answer, so nothing blocks here.
- E-03 correction and D-13 rewrite: consistent, no structural impact.

## Review Decision

`Pass`. The behavior basis is confirmed; AR-001…AR-003 are resolved in SR-004 (verified in the canonical artifacts, see ARCH-REV-002); no in-scope machinery depends on an unsupported premise.

## Findings

None open. Resolved this round (details in `architecture-review-revision-record.md`, ARCH-REV-002):

- AR-001 (Design Impact) — Resolved: D-02 `checkStatus` records one outcome per check through `recordCheckOutcome`, which sets `phoneAccessOff` and `authorizedApiReachable` together; session end clears `phoneAccessOff`; AC-003's alternate covers off → unreachable and off → reachable. P-01 now ends in "Can’t reach".
- AR-002 (Design Impact) — Resolved: D-16 selects by the explicit `REMOTE_WORDED_PATHS` list; a catalog spec requires en and zh-CN keys for every listed path.
- AR-003 (Requirement Gap, documentation) — Resolved: status, approval, baseline, DEC-002, Supplemental Artifacts and Readiness Check lines at SR-004; investigation notes at SR-004.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`).

## Residual Risks

- RR-01 (item 7): the blob rule admits any same-origin `blob:` subframe. Isolation of what such a frame holds rests on the iframe's own `sandbox`. Today only `HtmlPreviewer` creates one, and it has `allow-scripts` only (opaque origin, so no bridge object). If a future component adds an unsandboxed same-origin blob iframe, `addWebMessageListener` would inject `AutoByteusShell` into it. Its messages would still be ignored (`!isMainFrame`), but the object would be present. Keep AC-007's `window.AutoByteusShell === undefined` check in the emulator run. autobyteus-416 owns the broader preview posture (R-02).
- RR-02 (item 3): after process death, Android recreates the activity with its original launch intent. If the app was opened by a share, `onCreate`'s "shared text first" order re-runs that share instead of restoring the page. This is preserved behavior per REQ-003 ("shared pairing links still win") and needs no change. The implementation may note it in its handoff.
- RR-03 (item 8): besides the web callers, the check also applies to server-internal registrations through `ensureWorkspaceByRootPath`: `agent-run-provisioning-service.ts:249`, `standalone-agent-run-lifecycle-service.ts:444`, `team-run-service.ts:126`, `agent-org-run-manager.ts:275`, `agent-org-run-service.ts:255`, `configured-agent-execution-handle.ts:451`. For an unregistered missing folder, these now fail at registration with `WorkspacePathRefusedError` instead of later with `ENOENT` (E-08). The outcome is the same, but the error is earlier and clearer. `model-router-agent.ts:133` creates its folder first, so it is unaffected. Implementation should cover one server-internal form in the server E2E and list the forms in its handoff.
- R-01 (AR-14 cause, not reproduced) and U-01 (programmatic copy) remain as the design states, with defined escalation and fallback.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-005: revised D-02 and D-03; earlier rounds' results stand)
- Material-Premise Gate: `Pass`
- Notes: N-1 (stale interface row, for the Solution Designer) and N-2 (credential source inside the store, for implementation) are non-blocking. RR-01 and RR-03 still apply; RR-02 is superseded by D-03's re-delivery rule.
