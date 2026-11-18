# Handoff — autobyteus-305: build step 4 (desktop: version and "Update to <version>" on the Nodes page)

- Package: `docker-node-in-place-server-update`; Task `autobyteus-305` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); requested by `/project_task_manager`.
- Result: `Architecture Design Complete`. The design is SR-005 + SR-009, unchanged, last reviewed in ARCH-REV-004 Pass. Classification: Large / High.
- State:
  - steps 1–3 are finalized into `personal`;
  - beta v1.5.11-beta.6 is released (23/23 assets);
  - the receipt is verified in `delivery-receipt-verification-step3.md` (SR-011).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update` @ `1bed6deeaf` (= `origin/personal`), target `personal`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`

## Step 4 scope (design-spec.md, "Change / Refactor Sequence", step 4, and "Concrete Examples": row states)

- C1 `POST /rest/node-update`, with route class `TRUSTED_NETWORK_OWNER` and `requestedFrom` = the client address.
- `nodeServerUpdateStore`:
  - target = `appUpdateStore.currentVersion`;
  - poll every 2 s while an update runs;
  - "Restarting…" for up to 5 minutes, then "Not reachable" while it keeps polling every 10 s.
- `NodeServerUpdate.vue` in `NodeRow.vue`, for remote entries only:
  - button "Update to <version>" with the line "Same version as this app" (DEC-018);
  - "Newer than this app. Update this app.";
  - the `updateBlocker` message (`NO_PACKAGES_VOLUME`, `NEEDS_NEW_IMAGE`) instead of the button;
  - the step texts and the result texts;
  - `message` shown for unknown codes.
- Texts in English and zh-CN.
- Proof: AC-001, AC-009, AC-010.

## Carried from step 3

- CR3-N1: make the self-check failure message precise.
- The stale `previous` in `state.json` after a recreate: optional cleanup at selection.

## Constraints

As in `handoff-architecture-design-complete.md`. Never touch `autobyteus-server-0/1/2`. No release unless the user asks.

## Documents

- `handoff-step-4.md`
- `requirements-doc.md`
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-spec.md`
- `delivery-receipt-verification-step3.md`
- `implementation-handoff.md`
- `follow-ups.md`

## Route record

- `get_handoff_rules` (2026-10-30): the Large/High rule → `/software_engineering_team/architecture_reviewer`.
- 2026-10-30: ARCH-REV-005 Pass; the reviewer routed step 4 to `/software_engineering_team/implementation_engineer` (note N-4).
