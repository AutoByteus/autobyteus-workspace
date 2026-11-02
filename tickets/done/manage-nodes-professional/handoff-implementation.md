# Handoff — Architecture Design Complete — manage-nodes-professional (autobyteus-363)

- Classification: `Architecture Design Complete`, `task_size` **Medium**, `architectural_risk` **Low**. Direct route to implementation (no independent architecture review by the rules).
- From: Solution Designer, 2026-11-02. SR-002.
- Task: autobyteus-363 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, from `/project_task_manager`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/manage-nodes-professional`, branch `codex/manage-nodes-professional`, base `origin/personal` `3b9dc912a1`. Finalization target: `personal`. The ticket documents are not committed. Release only on the user's word.

## Request

The user (2026-11-01): "the manage nodes page UI should definitely be improved. It looks very unprofessional if you look at it." The Product Team designed a new look, and the user approved it on 2026-11-02 ("i approve. looks good now.").

## What to build

Apply the approved look to the Manage Nodes tab, presentation only (`design-spec.md`):
- an aligned row (who · server · offer · collaboration capsule · actions) that reflows by the Nodes card width;
- the collaboration capsule;
- one notice shape with tone icons;
- the server version as a quiet column with an "Update to …" chip, and a server notice under the row;
- the offer summary as a toggle that opens one framed panel;
- calmer cards.

The approved reference code applies to our source as is: `git -C /Users/normy/autobyteus_org/autobyteus-web-design diff 8a71c842 88e0e322 -- components/`. Its base was byte-identical to our source (design E-1). The spec is the authority where the spec and the reference code differ.

## Constraints

- No change to stores, utils, localization, `NodeChangeDialog.vue`, server or Electron (AC-905).
- Keep the test IDs the spec names.
- Remove `RemoteCollaborationOfferDisclosure.vue` and its spec.
- Update the two browser probes' text expectations (no ✓ ⚠ ✗ ⓘ marks in row and detail lines; the dialog's marks stay).
- Update `docs/settings.md`.

## Acceptance

- AC-901 (matches VIS-001…037)
- AC-902 (every function as before)
- AC-903 (rare states)
- AC-904 (Docker window, browser, zh-CN, 390 px)
- AC-905 (presentation only)

## Product package

- `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/manage-nodes-professional/ui-ux-spec.md`
- Screenshots: `visual-references/` VIS-001…037
- Runnable reference: `corepack pnpm dev --port 4950` in `/Users/normy/autobyteus_org/autobyteus-web-design`, `/nodes?nodeTab=manage`; runbook § `manage-nodes-professional`.

## Follow-ups

FU-001 is in `follow-ups.md`. It is not this ticket: do not change it here.

## Files

- `handoff-implementation.md`
- `requirements-doc.md`
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-spec.md`
- the Product `ui-ux-spec.md`

## Route

`send_message_to` `/software_engineering_team/implementation_engineer` (run `implementation_engineer_31698f199dad4612834b9e8df260b317`), delivered 2026-11-02, by the rule "Medium and Low".
