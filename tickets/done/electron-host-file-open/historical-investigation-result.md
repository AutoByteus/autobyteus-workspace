# Historical Regression Investigation — electron-host-file-open

## Result And Context
- Classification: Evidence-only clarification, SR-002. Original requirements baseline R1 remains Ready for Approval; no approval inferred from this follow-up.
- User follow-up: “In the past, I don't have this problem. Can you investigate when this bug was introduced?”
- Original objective remains native desktop linked-file preview correction with read-only and remote access guarantees preserved.
- No target design or production implementation authored; no runtime changes to user app/data.
- Package/workspace: electron-host-file-open; /Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open; codex/electron-host-file-open; base origin/personal 30c3f40d5721124c466d464004b004053173280c; finalization target origin/personal.

## Confirmed Timeline
| Boundary | Revision / date | Evidence |
| --- | --- | --- |
| Source change introducing the reproduced false refusal | `3d59992a404766a9636cd809e0ace7af0801e5e0`, Sept 1 2026 14:10:47 UTC / 16:10:47 Europe/Berlin; `feat: restore agent org workspace presentation` | Exact diff and blame for launcher lines 92–96. Parent source opens the same controlled file; this source rejects it. |
| Integration into personal line | `92b5d8c4b`, Sept 21 2026 10:23:43 Europe/Berlin; merge of origin/requirements/flat-agent-organization-model | Binary search of first-parent ancestry to v1.4.70 using git merge-base --is-ancestor. Source commit date is earlier than integration date. |
| Last adjacent unaffected tagged source | `v1.4.69`, commit `17d4f2327`, Sept 11 2026 | Does not contain introducing commit. Same controlled inputs open. |
| Earliest release tag containing source change | `v1.4.70`, commit `d68fc0f7b`, tag dated Sept 21 2026 11:54:11 Europe/Berlin | Tags ordered by creator date, ancestry checks, tagged-source controlled probe. Exact client installation/update or published artifact not independently checked. |
| Recent production path exposing missing metadata more readily | `bcff482007b3bc639490b68c36e26dfd8de9f321`, Oct 1 2026 07:51:05 Europe/Berlin; hosted collaborators | Introduced live addContextsForNewChildren: publish a child context with null metadata then resolve asynchronously. First containing tag by creator date is v1.4.92-beta.5, Oct 1 2026 11:55:54 Europe/Berlin. This is a plausible recent trigger, not proof of user's particular runtime state. |
| Current task base | `30c3f40d5`, v1.4.95-beta.8 | Launcher has no source differences from 3d59992a4. Controlled metadata-absent failure still present. |

## What Changed
Before 3d59992a4, preview used workspaceStore.activeWorkspaceMetadata / activeWorkspace, which could resolve cached/config identity or a Team workspace fallback. The change prioritizes activeWorkspaceTarget.context.config.workspaceMetadata whenever a selected target exists and explicitly drops the workspace fallback. It does not use config.workspaceId. If selected metadata is absent, derived workspaceId becomes empty and the launcher returns the host-only warning before checking trusted native capability.

The fallback removal was introduced for selected Org context correctness, so blindly reverting it is not automatically a safe fix for Org/task members. This result dates the regression; it does not select target architecture.

## Before/After Reproduction
`node tickets/in-progress/electron-host-file-open/evidence/historical-owner-probe.cjs`

Same controlled native runtime/store/action inputs were run against real historical launcher source via git show. Twenty asserted cases, all passed:

| Source | Missing selected metadata, workspace getter resolves | Complete selected metadata | Remote outside-workspace control |
| --- | --- | --- | --- |
| 3d59992a4 parent (2ae61a11f) | opened | opened | unavailable |
| 3d59992a4 | unavailable | opened | unavailable |
| v1.4.69 | opened | opened | unavailable |
| v1.4.70 | unavailable | opened | unavailable |
| current HEAD | unavailable | opened | unavailable |

Missing-metadata variants cover both known config.workspaceId and null selected config ID. Post-change refusal makes zero native capability checks and zero preview calls. This is a controlled owner-level historical regression proof, not a packaged Electron or exact user-app reproduction. No filesystem bytes, provider calls or user app/data were used.

## Evidence And Authority Paths
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/approval-hold-result.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/evidence/baseline-owner-probe.cjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/evidence/baseline-owner-probe.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/evidence/historical-owner-probe.cjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/evidence/historical-owner-probe.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/evidence/introducing-commit.diff`

## Risks, Approval And Next Action
Exact screenshot node/bridge/config and installed app version remain unknown. Confirmed source-regression date must not be represented as the date the user installed it. The Oct 1 collaborator change is an evidence-grounded possible exposure explanation only.
Requirements intended behavior and scope are unchanged; approval remains pending. Next action is to return chronology to user. Architecture design/implementation/review/validation/delivery artifacts: N/A — not yet applicable. No implementation-ready or fixed-build claim.

## Routing
get_handoff_rules succeeded on 2026-10-06. Returned routes require either an approved completed architecture package (Large/High → independent architecture review; Small/Medium+Low → implementation) or a delivery receipt evidence gap. None applies: this is an evidence-only result with R1 approval pending, no design, no delivery receipt. Return to user; no send_message_to required and no specialist forwarding performed.
