# Design Review Report — small-follow-ups-batch-426 (round 1 passed; round 2 passed — review round 9)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/requirements-doc.md`
- Upstream Investigation Notes: `…/small-follow-ups-batch-426/investigation-notes.md`
- Upstream Solution Revision Record: `…/small-follow-ups-batch-426/solution-revision-record.md` (SR-001…SR-014)
- Reviewed Design Spec: `…/small-follow-ups-batch-426/design-spec.md` (SR-014; round 1 D-01…D-19, round 2 D-09, D-20…D-23)
- Supplemental Task Artifacts Reviewed: `product-design-request.md`; Product spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` (design commit `0341b3af`); `follow-ups.md` (FU-001); `handoff-architecture-design-complete.md`; `handoff-round-2-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-001…SR-014 (round 2: SR-009…SR-014)
- Architecture Review Revision Record: `…/small-follow-ups-batch-426/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-009`
- Current Review Round: 9
- Trigger: D-21 re-check after an implementation Design Impact (SR-014, E-21b)
- Prior Review Round Reviewed: 8 (ARCH-REV-008, Pass)
- Latest Authoritative Round: 9
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`, branch `codex/small-follow-ups-batch-426`, round 1 base `6225a734a3` (read 2026-11-07); round 2 base `origin/personal` `d785ded109` (round 1, 412 and 416 merged; read 2026-11-08).

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

## Round 2 Review (SR-011, ARCH-REV-006)

### Routing classification (round 2)

`Medium` / `High` confirmed. A new GraphQL read contract is called on the 5 s history poll of three surfaces, including the phone, and the collaboration store gains a new update path: states applied outside a view publication. Independent review is required. The user's approval is not needed for the design; DEC-013 is the user's own decision.

### Behavior basis (round 2)

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-009 | User | Pass | Pass (E-09b, read and confirmed below) | Pass, with precision gaps | Needs Correction | AR-005 |
| BEH-020 | User | Pass | Fail for the window's own check (E-20 is Read only; the browser path was not traced) | Fail | Needs Correction | AR-004 |
| BEH-021 | Operational | Pass | Pass (E-21) | Pass (clock source checked first, as the design says) | Confirmed | — |
| BEH-022 | Operational | Pass | Pass (E-22) | Pass | Confirmed | — |
| BEH-023 | Code | Pass | Pass (`node-browser-access.ts:35-42` and `remote-access-request-origin.ts:19-26` are identical, checked with `diff`) | Pass | Confirmed | — |

### D-09: statements checked against the code

- `standalone-agent-run-root.ts:275-286`: `getAgentStatusSnapshots()` returns live children and every child of the server index without a live execution as `offline`. It reads no tree or log, and the remote endpoints (`remoteLinks`) are not part of it. **True.**
- `standalone-agent-run-root-manager.ts:137-140, 289-307`: `getActive` returns a root only while its lifecycle is `active`. `getInspection` answers `isActive: true` with a package-snapshot connection for an active root; otherwise it reads the stored tree with `isActive: false` and `statuses: []`. **True.** The GraphQL view (`agent-run-collaboration.ts:47-52`) takes `isActive` from `getInspection`, so it uses the same lifecycle fact as the new read's `isActive`. Comparing the two is sound for hosts without a stream. A context last published by the stream carries `isHostLive()` instead (`agent-collaboration-stream-handler.ts:89`). At most that costs one re-read after the stream detaches, which then lines the two facts up.
- Client `agentRunCollaborationContext.ts`:
  - The index keeps local `agents` apart from `remoteAgents` (`:76`).
  - The status validation (`:87-93`) and the apply loop (`:101-105`) are as cited.
  - `isActive` is the view's `is_active` (`:112`).
  - Task rows and the task-Team status are computed from the contexts' reactive state through `taskRows`. `AgentRunTaskRows.vue:66` is a `computed`, so states applied in place re-render the rows.
  - So "a **local** child of the index missing from the answer" is well-defined (`index.agents`), and remote children cannot cause re-reads. **True.**
- `agentRunCollaborationStore.ts`: inspections are single-flight per host (`:51, 155-175`). Every publication checks `isCurrent`: the binding revision, no stream service and no termination (`:159-160`). Termination and stream state live in `terminations` / `services`. The design's host-selection terms map onto these.
- Run-history `isActive` comes from the host run's status projection (`agent-run-history-service.ts:174-184`), not from the collaboration root. The host-selection rule's "listed as active, or its context is live" covers both directions.

### D-20: statements checked against the code

- Server path: `peer-client.ts:255-267` (`fetchNodeId`) turns every `!response.ok` into `PEER_NOT_AUTOBYTEUS`. A node-to-node fetch can read the 403 body. **True.** The server half of D-20 is sound.
- Window path: `autobyteus-web/utils/nodeIdentityProbe.ts:50-70` uses the browser's `fetch` to reach another node's `/rest/remote-access/status`. That is a cross-origin request from the window. The Host gate is registered first, before CORS (`build-studio-server.ts:460-464`, the comment at `remote-access-host-gate.ts:22-25`). It replies through `refuseRemoteAccessRequest` (`remote-access-refusal.ts:21-33`), which sets no CORS headers. The Electron shell window keeps the default web security (`electron/shell/workspace-shell-window.ts`: `contextIsolation`, `sandbox`, no `webSecurity: false`). So the window cannot read a host-refused answer: `fetch` rejects, and the probe returns `unreachable` (or `refused` on loopback) through `windowFailureReason`. It never reaches the `!response.ok` branch that D-20 changes. E-20's statement that the window probe "does the same (`!response.ok` → `not_autobyteus`)" was read from the code, not traced through the browser. The 416 API-04 P1 text ("isn't an AutoByteus node") is consistent with the server's add path producing it.

### Material premise (round 2)

#### P-03 — The window's own identity probe can read a Host-gate refusal

- Related: REQ-020, AC-020 ("the Nodes page checks it from the window")
- Initiating basis kind: `User`. On the desktop Nodes page, the user adds a peer or changes its address to a name the peer's Host gate refuses (`lvh.me`). The window probe runs on add (`nodeListStore.ts:213`) and on each row check (`:141`).
- Forward path: window `fetch(http://lvh.me:<port>/rest/remote-access/status)` → the peer's Host gate replies 403 without CORS headers → the browser rejects the fetch → `catch` → `windowFailureReason` → `unreachable`.
- Reachability of the claimed state (the window reads `code: REMOTE_ACCESS_HOST_REFUSED`): `Not Reachable` on the current code path, by the reading above. Implementation or API/E2E can confirm it with one real-window run.
- Consequence: D-20's `nodeIdentityProbe` change would never take effect, and the window part of AC-020 could not pass as designed. → AR-004.

### Findings (round 2)

#### AR-004 — D-20's window-side change targets an answer the window cannot read (Design Impact; may need a Requirement Gap; Medium)

- Protects: REQ-020 and AC-020 (the Nodes page's own address check reports the distinct cause). It also protects BEH-020's Preserved column ("every other peer error and its text").
- Scope status: Within Approved Scope. The correction may need a requirement decision; see the options below.
- Evidence: § D-20 above (Host gate before CORS, refusal without CORS headers, default web security, `windowFailureReason`) and P-03.
- Required update:
  1. Trace the window form through the browser (Principle 1, several entry forms) and measure it once in a real window (a peer at `lvh.me`).
  2. Then make AC-020's window part follow from an explicit rule. Either:
     - the Nodes page gets the cause from the server's check, which can read the 403 (for example through the same peer-address resolution the add path uses, at the point the page already asks the server); or
     - the window part of AC-020 is narrowed: the window keeps showing "can't be reached" from its own probe, and the distinct text comes from add and change-address. That changes approved behavior and is the Solution Designer's call within the direction.
     - Adding CORS headers to Host-gate refusals would change the DNS-rebinding defence's response posture. It would be a `Requirement Gap` needing the user's approval, and is not recommended here.
  3. Remove the `nodeIdentityProbe` 403-body branch unless the trace shows the window can reach it.
- Proportionate because: without this, one of AC-020's three forms cannot pass, and the probe would get a branch nothing reaches.
- Recipient: Solution Designer.

#### AR-005 — D-09's apply rules leave three cases implicit (Design Impact; Low)

- Protects: REQ-009 and AC-009a ("no `agentRunCollaboration` view read on a poll without a change"), and DEC-016 (a view re-read only when a child appears or the active state changes).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: D-09's client rules (`design-spec.md` § D-09) compared with the store's own currency pattern (`agentRunCollaborationStore.ts:51, 155-175`, `isCurrent` at `:159-160`).
  1. **An inactive answer for an inactive context.** The design checks for an active-state mismatch first, then for "a local child of the index missing from the answer". An inactive answer has `statuses: []` by the server's contract. If the host was selected because the history lists it as active while its root is not (yet) active, for example while the root is `activating`, every local child is "missing", so a view re-read happens on each such poll. The rule set should say: inactive answer and inactive context → nothing to apply, no re-read.
  2. **Currency.** "Context gone or a stream attached meanwhile → skip" does not cover a context replaced while the request was in flight, or a binding change. The store's existing rule for publications is `isCurrent`: the same binding revision, no stream service, no termination. Apply an answer only to the same context object the request was built for, under the same binding revision. Otherwise drop it; the next poll asks again.
  3. **One refresh in flight.** The poll is a 5 s `setInterval` (`useRunHistorySectionLoad.ts:50`). On a slow phone network a status request can outlast a tick. Name the rule: while a refresh is pending, a tick skips it, as the store already does for inspections.
- Required update: add these three rules to D-09's client section, with the owner (`agentRunCollaborationStore.refreshListedStatuses`) and the order: select hosts → one request → for each answer, check currency, then active state, then the child set, then apply.
- Proportionate because: three short rules in the owner the design already names. Without them, AC-009a's "no view read without a change" depends on timing.
- Recipient: Solution Designer.

### Other round-2 notes (non-blocking)

- D-09 wire shape: the new typed object uses `agentRunId`, `memberAddress`, `status` and `recoverableBlock`, while the view's JSON uses `agent_run_id` and `member_address`. `applyStatuses` should take one client shape, with the store mapping the new read into it, so the context does not accept two representations. The implementer can settle this.
- D-21: the design rightly makes the clock source the first check. If the app reads "This month" from the server's clock, a browser-only `page.clock` will not fix it. In that case the implementer returns a Design Impact, as the design's escalation says.
- D-22 and D-23 are sound as written.

## Round 2 Re-Review (SR-012, ARCH-REV-007)

### AR-005 — Resolved

D-09's client section now gives one owner (`refreshListedStatuses`) and one order: select hosts → one request → per answer:
1. Currency: the same context object, the same binding revision, no stream and no inspection started meanwhile; otherwise drop.
2. Inactive answer and inactive context → nothing to apply.
3. Active state changed → one re-read.
4. Child set changed (both active) → one re-read.
5. Otherwise `applyStatuses`.

It also names one refresh in flight (a tick that finds one running skips its own) and one client shape, `CollaborationChildStatus`, which the view's snake_case statuses are mapped into. This matches the store's existing `isCurrent` and single-flight patterns (`agentRunCollaborationStore.ts:51, 155-175`). AC-009a's "no view read without a change" no longer depends on timing.

### AR-004 — Resolved

`nodeIdentityProbe` is unchanged, so there is no unreachable branch, and there is no CORS change. The window's own check keeps "can't reach" for a refused name (DEC-017, FU-004, with evidence). The narrowing is the Solution Designer's decision within the direction, and it is recorded.

### New: AR-006 — the Nodes page's "add a peer" form never reaches the server for a refused name (Design Impact; Low)

- Protects: REQ-020 and AC-020 (trigger "Add a peer at a name its Host gate refuses … the distinct text with the host on the Nodes page"; verification "Nodes page probe step").
- Scope status: Within Approved Scope. Changes approved behavior: No. The fix states precisely which forms show the text.
- Evidence. I traced the Nodes page forms on `d785ded109` (Principle 1, several entry forms):
  - **Typed add** (`stores/nodeListStore.ts:205-228`): the window probe runs first (`:212-215`). For a refused name it fails, as AR-004 established. The node is then saved only as a desktop entry (`addRemoteNode`, `:221`), and no server call is made: `confirm` is only true when the probe succeeded. Connecting that row later needs the target's node ID: `registerHere` / `resolveHere` use `requireId(plan.target.nodeId, …)` (`services/nodeCollaboration/nodeCollaborationConnector.ts:71-74, 150-151, 168-170`). Without it the result is `PEER_UNREACHABLE` "has not been reached yet". So on the Nodes page, a typed add at a refused name shows "can't reach", never `PEER_HOST_REFUSED`. 416's FU-002 was measured as a direct `addPeerNode` GraphQL call (416 `api-e2e-execution-coverage-report.md` API-04 P1). Its sentence "The Nodes page shows that text" was not observed in a window.
  - **Change address** (`nodeListStore.ts:292-297` → `runWithoutConfirmation` → connector plan → this node's server): the server checks the new address, so `PEER_HOST_REFUSED` reaches the row's failure. **Reachable.** ✓
  - **Connect, where a node resolves an address it then registers** (`resolveHere` / `resolveThere` → `resolvePeerAddress` → `peer-address-resolver.ts`, `:150-155`): a refused candidate gives the new attempt result `host_refused`, shown by the attempt-result texts. This is reachable when the address being resolved has a name the far side's Host gate refuses, for example the far node registering this node by a name this node does not accept. ✓
- Required update:
  - State AC-020's forms as the code reaches them: change address (Nodes page text) and the connect flow's address resolution (attempt text) on the Nodes page; `addPeerNode` at the server level (server E2E).
  - Put the typed add at a refused name with DEC-017 / FU-004: it is a window-probe form, and it keeps "can't reach".
  - The Nodes page probe step should cover change address, plus one connect case where resolution meets a refused name, if the probe can set one up.
- Proportionate because: a wording correction to AC-020 and its verification. Without it, the AC's add step fails at API/E2E for a reason the design already accepts.
- Recipient: Solution Designer.

## AC-020 Re-Check (SR-013, ARCH-REV-008)

- AR-006 — Resolved. REQ-020 and AC-020 (`requirements-doc.md:308, 319`) now name the forms that reach this node's server check:
  1. `addPeerNode`, verified at server E2E;
  2. change address on the Nodes page;
  3. the connect flow's address resolution on the Nodes page.
  The typed add at a refused name, which probes from the window first and saves only a desktop entry (`nodeListStore.ts:212-221`), is with the window case in DEC-017 and FU-004 (`follow-ups.md`, with evidence). Each named form matches the paths traced in ARCH-REV-007.
- D-09, D-20's code shape and D-21…D-23 are unchanged and keep their ARCH-REV-006/007 verdicts.

## D-21 Re-Check (SR-014, ARCH-REV-009)

- E-21b confirmed. `TokenUsageAnalyticsRangePolicy.plan(input, now = new Date())` (`autobyteus-server-ts/src/token-usage/services/token-usage-analytics-range-policy.ts:27-34`) recomputes each preset from the server's clock and throws `TOKEN_USAGE_ANALYTICS_PRESET_RANGE_MISMATCH` on a difference (`:84-86`). A browser-only clock cannot fix the day: the premise of ARCH-REV-008's check holds, and the escalation was the right step.
- The revised shape works on the current code:
  - The probe spawns its own server: `startService(process.execPath, [dist/app.js, …])`, `token-statistics-ui-probe.mjs:318`. So a Node `--import` preload applies only to that test process, with no product code (DESIGN.md rule 11).
  - The server's token-usage code reads the time only through `Date`. A search of `src/token-usage` finds no SQL `now()` or `CURRENT_TIMESTAMP` and no `performance.now` or `hrtime`. So shifting `Date` / `Date.now` is enough there.
  - The seed writes coverage before the server starts (`token-statistics-seed.mjs:204`; probe `:316` before `:318`). The server only creates coverage when none exists (`token-usage-analytics-repository.ts:37-39`, upsert), so the shifted server clock does not overwrite the fixture.
  - Keeping the clock running, not frozen, preserves elapsed-time behavior (timeouts, deadlines).
  - The browser gets the same instant (`page.clock.setSystemTime`) and the seed the same `now`, so all three agree.
- Implementation notes (no design change):
  1. Choose an instant away from UTC midnight (for example 12:00 UTC on the chosen day) so the run cannot cross a day boundary.
  2. The preload shifts only `Date.now()` and `new Date()` called with no arguments. `new Date(value)`, `Date.UTC`, `Date.parse` and `instanceof Date` stay unchanged.
  3. Set the browser clock before the app loads.
  4. Without `--day`, nothing is preloaded.
- AC-021 is unchanged: runs on the 1st, 7th and 20th of one month.

## Round 1 Review Decision (ARCH-REV-002…ARCH-REV-005)

`Pass`. The behavior basis is confirmed; AR-001…AR-003 are resolved in SR-004 (verified in the canonical artifacts, see ARCH-REV-002); no in-scope machinery depends on an unsupported premise.

## Round 1 Findings

None open. Resolved this round (details in `architecture-review-revision-record.md`, ARCH-REV-002):

- AR-001 (Design Impact) — Resolved: D-02 `checkStatus` records one outcome per check through `recordCheckOutcome`, which sets `phoneAccessOff` and `authorizedApiReachable` together; session end clears `phoneAccessOff`; AC-003's alternate covers off → unreachable and off → reachable. P-01 now ends in "Can’t reach".
- AR-002 (Design Impact) — Resolved: D-16 selects by the explicit `REMOTE_WORDED_PATHS` list; a catalog spec requires en and zh-CN keys for every listed path.
- AR-003 (Requirement Gap, documentation) — Resolved: status, approval, baseline, DEC-002, Supplemental Artifacts and Readiness Check lines at SR-004; investigation notes at SR-004.

## Round 1 Classification

N/A (Pass).

## Round 1 Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`).

## Residual Risks

- RR-01 (item 7): the blob rule admits any same-origin `blob:` subframe. Isolation of what such a frame holds rests on the iframe's own `sandbox`. Today only `HtmlPreviewer` creates one, and it has `allow-scripts` only (opaque origin, so no bridge object). If a future component adds an unsandboxed same-origin blob iframe, `addWebMessageListener` would inject `AutoByteusShell` into it. Its messages would still be ignored (`!isMainFrame`), but the object would be present. Keep AC-007's `window.AutoByteusShell === undefined` check in the emulator run. autobyteus-416 owns the broader preview posture (R-02).
- RR-02 (item 3): after process death, Android recreates the activity with its original launch intent. If the app was opened by a share, `onCreate`'s "shared text first" order re-runs that share instead of restoring the page. This is preserved behavior per REQ-003 ("shared pairing links still win") and needs no change. The implementation may note it in its handoff.
- RR-03 (item 8): besides the web callers, the check also applies to server-internal registrations through `ensureWorkspaceByRootPath`: `agent-run-provisioning-service.ts:249`, `standalone-agent-run-lifecycle-service.ts:444`, `team-run-service.ts:126`, `agent-org-run-manager.ts:275`, `agent-org-run-service.ts:255`, `configured-agent-execution-handle.ts:451`. For an unregistered missing folder, these now fail at registration with `WorkspacePathRefusedError` instead of later with `ENOENT` (E-08). The outcome is the same, but the error is earlier and clearer. `model-router-agent.ts:133` creates its folder first, so it is unaffected. Implementation should cover one server-internal form in the server E2E and list the forms in its handoff.
- R-01 (AR-14 cause, not reproduced) and U-01 (programmatic copy) remain as the design states, with defined escalation and fallback.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-009: revised D-21; ARCH-REV-008's round-2 Pass stands for D-09, D-20, D-22 and D-23). Round 1 (ARCH-REV-005) stays `Pass`, and round 1 is merged.
- Material-Premise Gate: `Pass`
- Implementation notes:
  - D-21: see § D-21 Re-Check (instant away from midnight; shift only no-argument `Date`; browser clock set before the app loads).
  - D-09: record the status read's measured size (AC-009a); map the view's statuses into `CollaborationChildStatus`.
