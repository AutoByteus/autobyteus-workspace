# Implementation handoff — reopened NFS guide link removal

## Current authority / identity
- Task **autobyteus-254**, `project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3`; package `nfs-guide-install-commands`.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2`; branch `codex/nfs-guide-install-commands-r2`; input `1103c5f9f7c6986a77ef34620b02d790e2297621`, creation base origin/personal `8b34e8ae108a281b0c93c679c60883df28a30773`. Finalization later to personal; **no release**.
- Canonical ticket `/Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2/tickets/in-progress/nfs-guide-install-commands`.
- Approved basis: [requirements-doc.md](requirements-doc.md) **R2/SR-003 Approved**, [design-spec.md](design-spec.md) **SR-004 Ready**; [investigation-notes.md](investigation-notes.md), [solution-revision-record.md](solution-revision-record.md), [solution-design-handoff.md](solution-design-handoff.md), supplied screenshots indexed there. No separate Product supplement or pending decision.
- Architecture/source review **N/A — direct Small/Low route**. Original IR-001/API-REV-001/DR-001 passes remain historical exact-input results, not current revision acceptance.

## Implementation summary / round
**Rework / IR-002**, appended in [implementation-revision-record.md](implementation-revision-record.md). Trigger: explicit Oct24 removal preference, not a product failure. Related SR-003/SR-004; current ARCH/CRR/API/DR **N/A**. Source/tests/scoped documentation commit **3d95a5c4a16759060983489735e77820661cff53**.

Deleted exactly the two standalone install-section anchors and their two locale labels. Replaced local URL-valued presentation computed with `hasAvailableInstaller`, using **any** valid command so partial data still shows version. Review prose now points to the URL already in the displayed command. Corrected the guide's obsolete link-state sentence. Advanced README link, all nine commands/Copy cards and unchanged helper `downloadUrl` validation remain. No replacement link/control, hidden legacy anchor or empty link container.

## Classification / self-review
**Small / Low — Confirmed** against design's Completed classification. Lightweight self-review completed; **Direct API/E2E** applicable under fresh rules. Five bounded paths, same presentation/localization owners, no API/persistence/execution/security/installer behavior change. No design impact or new follow-up.

| Behavior / criteria | Production path and outcome |
| --- | --- |
| BEH-005 / AC-006 | NodeManager's unchanged prop → NfsGuideCard template: two anchors removed; en/zh-CN labels removed and review wording clarified. Exactly the advanced README remains; no reserved link area. |
| BEH-001 / AC-001/004 | Unchanged helper validation → existing Mac/Linux command projections → explicit `some(Boolean(command))` for version. Valid/partial version retained; null/invalid hidden. |
| BEH-002/003 / AC-002/003 | Same public command rows and clipboard owner, byte-identical from `const commandGroups` through handler/unmount. Nine displayed strings and copy behavior retained. |
| BEH-004 / AC-005 | All other guidance and adjacent Docker production unchanged; only targeted NFS prose changed. Field testing still deferred, not a prerequisite. |

Changes stayed within Scope Guardrail: **Yes**. Old detached task worktree, canonical dirty checkout/PM data, NFS repo/installer/runtime/releases and shared/workspace/agent skills untouched.

## Design health, removal, placement and data
- User-requested presentation revision; **No Design Issue Found / No Refactor Needed**, confirmed. Existing owners absorb deletion without new layer/state/module.
- Removed `.download`/`.installerReview` locale keys only after confirming their two template consumers; surviving descriptor `downloadUrl` validator remains live and untouched. No backward compatibility aliases, dual paths, obsolete markup or dead imports introduced. No unrelated cleanup/follow-up.
- Effective nonempty changed source: component95; both catalogs443. All decrease, below500; deltas below220. Existing file placement and local structures remain appropriate.
- Persistence **Not Affected**; no reader/writer/schema/migration or data cleanup. No deviation from design.
- Current shared design principles (including kind/consumer tracing), root DESIGN.md/TESTING.md and web AGENTS.md/ARCHITECTURE.md applied. Normal, partial, null/invalid and both locales explicitly checked; no gate inferred solely from happy path.

## Impact plan and checks
Before validation, [evidence/IMP-08-impact-plan.md](evidence/IMP-08-impact-plan.md) compares prior source2c6b414 against current input: 2010 changed paths including contracts/core. Re-run the scoped recorded implementation checks with current foundation; do **not** call old totals a current pass. No unrelated server/NFS campaign. Current units execute once; only the browser case is repeated for diagnosed fixture corrections, without repeating passed repository suites.

Environment: macOS arm64 / Node22.23.1; filtered frozen pnpm install, private HOME/TMPDIR, fresh Nuxt prepare, serialized tests/dev server, fresh Chrome context. No credential read, installer/CLI/live-host execution or user application data.

| ID | Command / exercised code / input | Result and evidence |
| --- | --- | --- |
| IMP-08 | Filtered `pnpm --filter autobyteus... install --frozen-lockfile`; `pnpm -C autobyteus-web exec nuxt prepare`; input1103c5f9 | Setup complete, logs `IMP-08-install.log` / `IMP-08-prepare.log`; environment and impact plan saved. |
| IMP-09 | New component tests only: `pnpm -C autobyteus-web test:nuxt components/settings/__tests__/NfsGuideCard.spec.ts -t 'retains only the advanced README link' --run --maxWorkers=1`, original1103c5f9 component plus new assertions | **Expected Fail**: 2 failed/11 unselected; actual3anchors vs desired1 in both locales. `IMP-09-before.log`. No original bug claim: requirements changed. |
| IMP-10 | `python3 tickets/in-progress/nfs-guide-install-commands/evidence/IMP-10-checks.py`; exact five-file Nuxt command, focused helper tsc and three guards listed in JSON; source3d95a5c4 | **Pass: 54 tests/5 files** (component13/helper24/NodeManager10/Docker7), focused typecheck exit0, web/localization guards exit0/zero unresolved literals. `IMP-10-checks.json` and per-check logs. Includes six inert shell controls; no real installer. |
| IMP-11 | Ticket-owned temporary Nuxt component fixture, en/zh ×1280/390, current product source3d95a5c4; exact driver/command/result in evidence | **Pass**: `IMP-11-verified/result.json`, four en/zh ×1280/390 states, nine cards/one link each, eight actual clipboard samples, keyboard/timer/denial/null/partial controls, zero browser events. `IMP-11-visual-review.md` and final screenshots. Not full Nodes composition, Electron or API sign-off. |
| IMP-12 | Diff/read self-review vs1103c5f9 | **Pass**: five approved paths only; helper/parent/Docker byte identity, unchanged usage+clipboard suffix, precisely two deleted labels + reminder per locale; `IMP-12-self-review.json`. |
| IMP-13 | Inspect owned preview ports/PIDs/page and remove exact private setup; source3d95a5c4 | **Pass**: three preview ports closed, PIDs absent, temporary page gone; owned HOME/TMP removed. `IMP-13-cleanup.json`. |

Current count54 differs from old53: current integrated NodeManager suite has10 (historical11), and this round adds2 localized cases. Not a dropped test by this change. Nuxt duplicate-getter / package-type and HappyDOM KaTeX warnings are retained; no unit error or failed assertion on current source. Whole-app Vue/desktop/backend typecheck/build not claimed: Nuxt compiles and renders the changed component; focused helper tsc is separately scoped.

## Rendered-result feedback loop and limits
Reviewed approved removal screenshots and existing cards. Own Nuxt fixture renders the actual component, localization and styles, supplying only unrelated app-start read/notification/feed boundaries. Checks preserve nine cards, exact remaining link and review reminder; valid/partial/null version, two locales/two widths, local scrolling/no document overflow, sampled actual clipboard, keyboard success/reset and controlled denial. Install section bottom has only its existing17px border/padding, no reserved link gap. No production styling/lifecycle change was needed.

First attempt `IMP-11-current/result.json` is **Fail**, retained: integrated NotificationCenter additionally requested `GetUpdateAutomationSettings`; historical fixture lacked that response and Apollo logged a missing-field error. Driver/model corrected from current query and schema; no product edit or error suppression. Passed repository checks were not repeated. Second attempt passed assertions but was superseded after schema inspection corrected its fixture-only nested typename. Final `IMP-11-verified/result.json` is Pass with the exact current-schema fixture and zero browser events. Attempts remain in `IMP-11-attempt-note.json`; directly inspected final English1280/Chinese390 screenshots and recorded visual findings in `IMP-11-visual-review.md`.

API/E2E still owns current actual **Nodes → NFS Guide** composition and acceptance judgement. These are implementation component checks, not a user check or packaged Electron/real backend/NFS proof. No need to requalify installers, storage, independent clients or field tests. Existing autobyteus-nfs-4 custody unchanged.

## Remaining handoff / cleanup
- No requirement/design gap, new blocker, follow-up, merge/push/tag/release/deploy or completion claim.
- Owned browser/dev server/temp page/home cleanup is recorded with current renderer evidence and `IMP-13-cleanup.json`; ignored worktree dependencies/Nuxt outputs may remain for downstream use. No unrelated resources touched.
- API: validate R2 AC-001–006 by impact, especially removed anchors in both locales, retained advanced link/nine Copy cards, partial-version behavior and no visual gap. Reuse current scoped proof where unchanged. Never execute installer for guard checks; stubs only.
- Delivery later refreshes personal, syncs only scoped docs and finalizes per release guide without release. Preserve old receipt checkout and other-owner/history artifacts. Direct low-risk route, no Code Reviewer dispatch.
