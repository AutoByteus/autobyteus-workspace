# Handoff: autobyteus-522 → Implementation (direct route)

- Result: `Architecture Design Complete`, `task_size = Small`, `architectural_risk = Low` (design spec, Task Size And Architectural Risk)
- Route: `/implementation_engineer` (handoff rule: Small/Medium with Low risk → direct implementation). Implementation self-checks and API/E2E validation still apply.
- Package: `phone-settings-every-run-522`, SR-001
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-settings-every-run-522/tickets/in-progress/phone-settings-every-run-522/`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-settings-every-run-522`, `codex/phone-settings-every-run-522`; base `origin/personal` at `3722dbb1d8`; finalization target `origin/personal`. Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build output of the investigation's builds; do not commit them.

## Original request

autobyteus-522 from `/project_task_manager` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`). The founder: "for the members belonging to a task agent team … I don't have this Settings, but it only appears for the individual agents." His direction (Task comment): all kinds are runs, so Settings is the same for all; decide by what the run can do, not by its kind; a kind that truly cannot be changed says why in the phone's words instead of hiding the entry.

## What to build (design spec, Intended Change and Final File Responsibility Mapping)

1. `mobileRunSettingsScope(target)` maps `target.browse` (the run that holds the opened agent) to a scope and never returns `null`: `run` → agent; `teamMember` → that Team run at `memberAddress`; `agentOrgMember` → that Org run at `memberAddress`; `peerRun` → `remote`.
2. The ⋮ menu always offers Settings (remove `showSettings` and the `&& !remote` condition).
3. `MobileRunSettings.vue`: a `remote` scope shows the run line and "This run is on {node}. Its runtime and model can be changed only on that node." (`mobile.settings.remoteRun`, en and zh-CN), no rows, no Save, no stop.
4. Specs rewritten to the new rule; phone probe cases for AC-001…AC-006.

## Approval basis

Requirements approved by the Solution Designer within the founder's direction (DEC-001…004), founder informed in my conversation, 2026-11-17. No design approval required.

## Key evidence

- Founder's case reproduced (R1): a member of the PTM's delegated team has no Settings, running or stopped; screenshot `evidence/investigation/r1/MSP-R522-ptm-task-team-member-menu.png`.
- BEH-005 (R2): Settings on a task agent that a Team member delegated saves to the Team member: lead changed to `grok_build/grok-4.7`, the helper unchanged. The fix (deciding by `browse`) corrects it; AC-003 must fail before the change.
- Node side (R1): every delegated run reads `RUN_ACTIVE` while live, editable when stopped; saves `UPDATED` change only that run or member. No server change.
- Reproduction to start from: `evidence/investigation/mobile-settings-every-run-repro-cases.mjs` (command in the design spec, Guidance For Implementation).

## Constraints

- Isolated nodes and scripted runtimes only; no provider keys; no secrets in logs.
- The desktop, the node, `existingRunConfigStore` and `useRunStopAction` are not changed.
- Phone-key rule: no new node operation (NA-7; 458 REQ-010).
- Release only on the founder's word; the next beta carries it.

## Open for downstream

- U-002 (investigation notes): an Org's task team in the probe stack (AC-004).
- API/E2E: one Android emulator journey of the founder's case (AC-001).

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md` (this folder); evidence `evidence/investigation/`.

## Route

- 2026-11-17: sent to `/implementation_engineer` (run `implementation_engineer_2f676ee62a614a47b8814c2e96abbe6f`), delivered.
