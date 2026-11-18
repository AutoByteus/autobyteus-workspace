# Handoff Summary — runtime-switch-members (autobyteus-348: the agent runtime switch for Team members, Org members and delegated copies)

## Ticket

- Package: `runtime-switch-members`; Project Task `autobyteus-348`
- Route: reviewed. Architecture review ARCH-REV-001; source review CRR-001…003 and delta review CRR-004 Pass; API/E2E API-REV-001 (found the Org and copy row defects), reworked (IR-002, IR-003), API-REV-002 Pass (92%); test-code review CRR-005 Pass (no findings).
- Archived ticket folder: `tickets/done/runtime-switch-members/` on `personal`

## What Changed

- The one runtime-selection rule (`applyRuntimeSelection`) now serves standalone runs, Team members, Org members (direct and in mounted Teams) and delegated copies: a model-only edit, a switch (`pendingRuntimeSwitch` on the member, session dropped) or an undo.
- A member with a pending switch is switched at its next activation (`ConfiguredAgentExecutionHandle.initializeReady`): `begin → prepare → record → commit → publish`; a member with no conversation starts plainly; a failure before the marker leaves the previous file unchanged and the retry completes.
- A Team default's runtime edit gives every linked member its own pending switch; the Team's and Org's own default launch is not switched. The pending switch is server state and never on the wire.
- GraphQL clean cut: `updateStoppedTeamRunSelections`, `UpdateStoppedTeamRunSelections*`, `selectionPatches` on the Team and Org mutations, `runtimeKind` required on every Team, Org and delegated setting; the old `…ModelConfig` / `modelPatches` names are gone.
- Web: runtime menus unlocked for Team, Org and copy rows, saved rows show the choice at once, hint and undo behavior, copy model-only saves show the new model.
- Docs: ten docs updated in the ticket, verified by delivery.

## Integration

- Merged `origin/personal` @ `f7c71405e9` (autobyteus-97) into the branch, no conflicts, and reran: server typecheck and build; built-server cases 34 tests (switch cases plus autobyteus-97's copy-folder E2E); full unit suite 924 files, 7879 tests pass with one flaky unrelated failure (agent-package folder watcher; FU-C3), the first full pass on the same code being green at 7865 tests (`evidence/DEL-01-post-integration-checks.md`); web typecheck, guards, `codegen:check`, 4152 web specs; old names gone; tracked `dist/` of the two stream-contract packages equals a fresh build.

## Verification

- Judged from the evidence; no user check needed. Every critical AC is proven: built-server cases for Org, copy (with a restart), Team copies in opposite wake orders and a Team default; live Claude ↔ Codex for a Team member, Org members and a delegated copy; a real browser on the real backend for Team, Org direct, Org nested, copy, undo and model-only rows. Confidence 92% (post-repository 88%) against the 95% default; the gap is that native, Grok and Antigravity are scripted. AC-009 (old names gone, generated types current) I verified myself by grep and `codegen:check`.

## Release

- `No release`: not requested; `RELEASE.md` makes none the default. `release-notes.md` is ready. Notice points: the GraphQL clean cut breaks old clients; each member switches at its own first message; a partly switched Team is normal; no migration.

## For The Solution Designer

- Follow-ups, none sent: FU-C3 (flaky watcher test), FU-C1 (the copy launch rule exists three times, a parity test guards it), FU-C2 (the stale `existing-run-model-config` browser probe fails 4 checks, same as at the base). Also still open from earlier tickets: autobyteus-316's FU-003/FU-004/FU-008 are items of this Task and need their status judged.
- Residual risks: native, Grok and Antigravity scripted; a delegated copy's undo is unit-tested only; journal and memory-search reads of a switched member were not shown beyond the chat; the Electron shell was not run. The live runs used the real HOME and the signed-in Claude and Codex CLIs and added sessions to their histories (TESTING.md).
