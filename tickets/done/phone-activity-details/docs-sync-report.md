# Docs Sync Report — autobyteus-590 (phone-activity-details, absorbs autobyteus-586)

## Scope

- Ticket: `phone-activity-details` (Project Task `autobyteus-590`, which absorbs `autobyteus-586`): the phone's Activity shows each tool call's shared summary and status, opens a call's details, opens a compaction's rows and unfolds a background task's title; the desktop and the phone read one set of builders; the Nuxt type project excludes the iOS demo build and the Windows server staging folder, so the web typecheck passes with `dist-mobile-demo/` present.
- Trigger: API-REV-002 `Pass` (95.4 %) on the direct low-risk route (`task_size` `Medium`, `architectural_risk` `Low`). Architecture review, source review and test-code review are `Not Applicable` on this route. CRR-001 is the failure-origin review of API-REV-001's failure (`Local Fix`, fixed by `70f7040ee1`).
- Bootstrap base reference: `origin/personal` `0da6bfbfc1` (the `v1.5.14-beta.7` record).
- Integrated base reference used for docs sync: `origin/personal` `20b627960c` (18 commits, server Grok/ACP start-up work and two other tickets' records), merged as `e08e5c1939`.
- Post-integration verification reference: `evidence/delivery/` `DEL-01`…`DEL-03` on `e08e5c1939` (both typechecks, the ticket's web specs, server and phone-bundle rebuilds, phone cases MSP-94…97); the release/deployment report lists them.

## Why Docs Were Updated

- Summary: the ticket changed what the phone's Activity shows and does, and moved three derived facts (a call's one-line summary, its status words and details sections, a compaction's rows) to shared builders that the phone and the desktop read: the summary by the phone and the conversation's tool cards, the status words and sections by the phone and the Activity panel's tool item, the compaction rows by the phone and the panel's compaction item. The ticket edited `TESTING.md` (a workaround sentence went) and nothing else long-lived. The web docs still described the phone's Activity as a list of background tasks above plain tool rows, and the Activity components section named neither the shared owners nor the phone's row and detail components.
- Why this should live in long-lived project docs: a later change to a status word, a summary key or a details section is now a change to every surface at once, and that is invisible from any one component. A reader who finds the desktop's `ToolActivityItem.vue` and does not know the phone reads the same builders would fix one surface; a reader of the phone doc would otherwise not know a tap opens a detail screen that updates live.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; rule 12 (a release build starts from `pnpm install` alone) applies to a type-project change | No change | The ticket applies existing rules (one owner for each derived fact; rule 12, whose evidence is the fresh-start build and the build-only release run). No new rule |
| `TESTING.md` | The testing guideline; the ticket removed a workaround sentence | Updated in the ticket (kept, verified) | Commit `37ed9cdf00` (`docs(testing): …`, only `TESTING.md`) removes the sentence that told a developer to remove `dist-mobile-demo/` before the typecheck, which autobyteus-584's row added. Delivery checked it against the merged tree: `nuxt.config.ts` now excludes `../dist-mobile-demo/**` and `../.server-packaging-stage/**`, and the web typecheck passed with the 13 MB folder present (`DEL-01`). The sentence came from autobyteus-584's row, whose follow-up FU-001 (the same heap exhaustion and the same missing exclude) this change (autobyteus-586, absorbed here) fixes |
| `RELEASE.md` | Finalization and release rules | No change | Read from the merged tree. Its "Build-only release run" section names this kind of change (a build step or gate; DESIGN.md rule 12): API/E2E ran it (RR-1) and the fresh-start build (FS-1). The base's newer lines (clean-image checks, the iOS icon check) concern other changes |
| `AGENTS.md` | Pointers | No change | |
| `docs/design-cases.md` | Design cases | No change | The ticket found no design mistake that a later design must avoid; its one surprise (Antigravity's PascalCase argument names, F-1) is recorded as a code comment on the key lists and in CR-1's evidence |
| `autobyteus-web/docs/remote_access.md` ("Activity") | The phone's screens | Updated by delivery | See "Docs Updated" |
| `autobyteus-web/docs/agent_execution_architecture.md` ("Activity components") | Which component presents which activity | Updated by delivery | See "Docs Updated" |
| `autobyteus-web/docs/browser_sessions.md`, `agent_teams.md`, `memory.md` | Mention Activity rows or tool cards in passing | No change | They describe what an Activity row or tool card must not do (strip MCP prefixes, own approval authority) or which kinds appear, none of which changed |
| `autobyteus-server-ts/docs/**` | The node's contract for tool activities | No change | The node's stored `contextText` is untouched (DEC-004; FU-001 records it); no server code or contract changed. The base's own server doc changes (Grok, ACP) are other tickets' |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | Behavior | The Activity bullet: a background task unfolds in place on a tap; a tool call row shows its name and the shared summary (a command without a leading `cd <folder> &&`, a file, a query or pattern, "→ <recipient>", a Task key; at most two lines; nothing when there is nothing to summarize; Antigravity's own tools included; late arguments update the row); its status never by color alone (a success is a check icon, every other status an icon and the desktop's word; a failed call shows an error excerpt); a tap opens the details full screen (`screen=activity&activityItem=<id>`, Back returns at the same scroll place): status, full summary, Arguments, Logs, Result, Error, live while open; a compaction row opens its rows; the builders are shared with the desktop | The bullet described only the background tasks |
| `autobyteus-web/docs/agent_execution_architecture.md` | Architecture | In the Activity components list: the phone's `MobileRunActivityItem.vue` and `MobileActivityDetail.vue`, and the three shared builders (`utils/toolDisplaySummary.ts`, `utils/activity/toolActivityPresentation.ts`, `utils/compactionActivityPresentation.ts`) that the phone and the desktop components (`ToolCallIndicator.vue`, `ToolActivityItem.vue`, `CompactionActivityItem.vue`) read, one owner per derived fact; the activity row carries no precomputed `contextText` | The list named the desktop components only and described the status chip as `ToolActivityItem`'s own |
| `TESTING.md` | Testing rule (by the ticket, commit `37ed9cdf00`) | The workaround sentence in the GraphQL / demo row removed | The workaround is no longer true (REQ-008, AC-007) |

All statements were checked against the code at the merged state: the summary key lists and the `cd` handling in `utils/toolDisplaySummary.ts`, the status words and sections in `toolActivityPresentation.ts`, `MobileRunActivityItem.vue` (the check icon and the word for every other status, the two-line clamp, the error excerpt), `MobileActivityDetail.vue` (the sections, their open state, Back), `useMobileNavigation.ts` (`activityItem`), and `contextText` appears in no web source file (only in a hydration spec that asserts its absence).

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One owner for each derived fact of an Activity row | The summary, the status words and the details sections are computed once and read by the phone and by the desktop (the summary by the conversation's tool cards, the status words and sections by the Activity panel's tool item); a surface maps the tone to its own classes | `design-spec.md` D-2, D-3 (REQ-007) | `agent_execution_architecture.md` |
| What the phone's Activity row and details show | Summary, status without color alone, full-screen live details with Back at the same place, compaction rows, an unfolding background task | requirements REQ-001…REQ-006, DEC-001…DEC-003, DEC-006…DEC-008 | `remote_access.md` |
| Antigravity's argument names | Its tools name arguments in PascalCase (`TargetFile`, `DirectoryPath`, `Query`, `Pattern`, `CommandLine`, `Path`, `AbsolutePath`), which the node passes through; the summary reads them | `evidence/api-e2e/CR-1-agy-argument-names.md`, CRR-001 | the comment above the key lists in `toolDisplaySummary.ts` (the code is the record) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `contextText` on the web's tool activity (a weak "path, else command, else tool name" rule, duplicated in the web) | the shared summary computed from the activity's current arguments (`getToolDisplaySummary`); the node's own stored `contextText` stays for projection dedupe (FU-001) | `agent_execution_architecture.md`, `remote_access.md` |
| `ToolActivityItem.vue`'s and `CompactionActivityItem.vue`'s own status words and detail rows | `toolActivityPresentation.ts`, `compactionActivityPresentation.ts` | `agent_execution_architecture.md` |
| The type project's missing excludes (`dist-mobile-demo/`, the Windows server staging folder) | `nuxt.config.ts` excludes them | the comment in `nuxt.config.ts`; `TESTING.md` (the workaround sentence is gone) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization on `personal`.
- Notes: docs match the integrated code. Follow-ups found outside the ticket's scope are in `follow-ups.md`: FU-007 (MSP-55's browser-error allowlist) was added by delivery; FU-001…FU-006 came from earlier roles.
