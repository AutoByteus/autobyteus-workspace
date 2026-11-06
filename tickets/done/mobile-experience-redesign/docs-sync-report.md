# Docs Sync Report

## Scope

- Ticket: autobyteus-277 mobile-experience-redesign (`task_size` Large, `architectural_risk` High, independent review route).
- Trigger: the code reviewer's delivery handoff after CRR-009 (source review of the latest-base merge), API-REV-004 (round 4 on the merged tree, 95%) and CRR-010 (test-code review of MSP-15).
- Bootstrap base reference: `e00581d485` (the merge base before delivery).
- Integrated base reference used for docs sync: `origin/personal` `9e0681bf39`, merged into the ticket branch as `944c902b02` (clean; 7 new base commits, autobyteus-402 Docker node ports).
- Post-integration verification reference: `evidence/delivery/DEL-01-post-integration-checks.log` on `944c902b02`. Web `typecheck` PASS (production 0 errors; tests 96, the baseline); `guard:localization-boundary`, `audit:localization-literals` and `guard:web-boundary` pass; the public Docker launcher tests that the base changed pass (35 passed, 2 skipped).

## Why Docs Were Updated

- Summary: the ticket rebuilt the `/mobile` shell and removed the phone's Home, "Switch work", tabs, team launch and Attach, with their components (`MobileWorkShell`, `MobileHome`, `MobileTeamMessages`, `useMobileFocusedRunIdentity`, `useMobileFileContextCoordinator`, `mobileWorkStore` and others). Seven long-lived docs still described those screens or named the removed owners.
- Why this should live in long-lived project docs: they are the canonical module docs for artifacts, content rendering, the file explorer and the phone shells; readers would otherwise look for removed components and tabs.

## Long-Lived Docs Reviewed

| Doc | Result |
| --- | --- |
| `autobyteus-web/docs/remote_access.md` | Already current (changed in the branch) |
| `docs/android_mobile_access.md` | Updated by delivery: one stale line (the shell's screens) |
| `autobyteus-android/README.md` | Already current (changed in the branch) |
| `autobyteus-web/docs/workspace_layout.md` | Already current (changed in the branch) |
| `autobyteus-web/docs/agent_artifacts.md` | Updated |
| `autobyteus-web/docs/content_rendering.md` | Updated |
| `autobyteus-web/docs/file_explorer.md` | Updated |
| `autobyteus-ios/README.md`, `docs/ios_mobile_access.md` | Updated: the shell's screens and the WebView smoke step |
| `DESIGN.md` | No impact: it names no phone owner; the ticket follows its rules |
| `TESTING.md` | Changed in the branch at the user's request (`c5319f0bf4`, `dce25fdd50`, trims only); the design's phone rule is not added, at the user's direction. No other discrepancy |
| `RELEASE.md` | No impact: the ticket changes no release step (the APK is built and published by the same workflow) |
| `ui-prototypes/mobile-pwa-navigation/` | Not changed: a historical prototype, not a description of the product |

## Docs Updated

| Doc | Change |
| --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Mobile Team Communication paragraph: the Messages screen (⋮ → Messages), and a reference that is a history entry. Data-flow nodes renamed. Owner rows: `views/MobileArtifacts.vue` reads the run screen's `ActiveAgentWorkspaceTarget`; `useMobileFocusedRunIdentity` row removed; `views/MobileMessages.vue`; `views/MobileTeamReferenceViewer.vue` wraps `CollaborationMessageReferenceViewer` |
| `autobyteus-web/docs/content_rendering.md` | `views/MobileFileViewer.vue` on the Files screen, with no Attach; the reference wrapper's path and viewer; the Event Monitor's phone previews open on the Files screen as a history entry in the open agent's folder (replaces the "typed pending request … inline" text) |
| `autobyteus-web/docs/file_explorer.md` | Tree paths (`components/mobile/views/`); the path-locator row for `/mobile`; "Mobile Files" section: the folder is the open agent's, history-entry opening, no Attach (the `useMobileFileContextCoordinator` bullet removed) |
| `docs/android_mobile_access.md`, `docs/ios_mobile_access.md` | "Existing `/mobile` shell": the run list, run screen with ⋮ views, New run for agent runs, the connection sheet |
| `autobyteus-ios/README.md` | Intro and WebView smoke step 5 name the new screens |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Header comment: dropped "(TESTING.md, phone changes)", a section that does not exist (comment only, no rerun) |

## Durable Design / Runtime Knowledge Promoted

- The phone's views read the run screen's `ActiveAgentWorkspaceTarget`, the desktop's own target, rather than a phone-owned focused-run guard; a phone file or reference is a history entry (`useMobileNavigation`), so Back closes it first.

## Removed / Replaced Components Recorded

- `MobileTeamMessages.vue` → `views/MobileMessages.vue`; `MobileArtifacts.vue`, `MobileFiles.vue`, `MobileFileViewer.vue`, `MobileTeamReferenceViewer.vue` → `components/mobile/views/`; `useMobileFocusedRunIdentity.ts` and `useMobileFileContextCoordinator.ts` removed (docs rows removed); `MobileWorkContext` no longer the Files workspace source.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary; finalization after the user's decision on his checks (see the handoff summary).
- Notes: FU-008 records stale desktop references found during this sync (`TeamCommunicationReferenceViewer.vue`, absent on `personal` too).
