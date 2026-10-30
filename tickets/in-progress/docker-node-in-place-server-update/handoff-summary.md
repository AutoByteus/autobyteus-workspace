# Handoff Summary — autobyteus-305, build step 4 (desktop: node version and "Update to <version>")

This summary holds the latest delivery (DR-004, step 4). Earlier summaries are in git: step 1 at `77fb8bf2d1`, step 2 at `6b34f900b6`, step 3 and beta v1.5.11-beta.6 at `1bed6deeaf`.

## What This Delivery Contains

Build step 4 of 5. Step 5 (mid-turn runs come back) waits for autobyteus-285 and -287.

- **Nodes → Manage Nodes:** under each remote row the window reaches, a server line (`NodeServerUpdate.vue`, `nodeServerUpdateStore.ts`):
  - the node's version;
  - **Update to `<version>`** with "Same version as this app" when the node is older (DEC-018), or "Newer than this app. Update this app.";
  - the steps and the result, the node's reason on a refusal or failure, and a Copy command button for `NEEDS_NEW_IMAGE`;
  - "Server version unknown" without a starter, and the node's `updateBlocker` reason.
- **Polling (DS-005):** asked on open and when the app's version is known; idle rows are not polled. 2 s while an update runs; "Restarting…" for up to 5 minutes without an answer, then "Not reachable. Last known: …" asking every 10 s.
- **C1 `POST /rest/node-update`** (route class `TRUSTED_NETWORK_OWNER`; phones get 403). It is logged with the client address as `requestedFrom`.
- **Docker Guide:** a new `autobyteus-docker update --all` command card.
- **CR3-N1 from step 3 is fixed:** a self-check failure now says "it exited with code N before answering its health check", and the candidate's last output goes to the node log.

## Classification And Route

- `Large` / `High`, route `Reviewed`: SR-005 + SR-009 → ARCH-REV-005 (Pass, note N-4) → IR-004 → CRR-007 Pass (9.5/10) → API-REV-004 Pass (94.7%) → CRR-008 Not Applicable → delivery DR-004.

## Integration

- `origin/personal` was still `1bed6deeaf`, so the branch was already current; nothing was merged. API/E2E tested code `deead7bf05`; everything after it is ticket documents.
- DEL-11 (confirmation on the delivered state):
  - 48 web tests (nodes components, update store, launcher commands);
  - web boundary and localization guards passed;
  - 71 server tests (node-update, remote-access);
  - 49/49 starter tests;
  - licensing, hygiene and Secret Gate.

## Verification

Verified from the evidence (`release-deployment-report.md`). AC-001, AC-009 (desktop request and its logged client address), AC-010 and REQ-011 on the desktop are directly proven in the real packaged app against real starters (API-41, run 2 with 0 failures). AC-004 and AC-005 are shown correctly on the desktop. Confidence 94.7%: the gap is that the desktop journeys are not durable automation (packaged app plus Docker in CI); the row's logic is unit-tested with fake timers.

## Notes For The Solution Designer (product choices; none blocks)

- **N-4 visibility, which affects the user's own nodes.** A node whose server has no C1 shows "Not reachable." under a reachable (green) row. That covers any image before v1.5.11-beta.6, as the design decided (ARCH-REV-005 N-4, rule 9).
  - Read-only check: `autobyteus-server-0/1/2` all run `autobyteus/autobyteus-server:beta` @ `sha256:9657209ba499…` (1.5.11-beta.5, before step 1) and have no server-packages volume.
  - So once a desktop with step 4 ships, all three show "Not reachable." until the user reinstalls the launcher and runs `upgrade --all`.
  - This is in `release-notes.md` and `autobyteus-web/docs/settings.md`. If the wording should read differently for old nodes (e.g. "This node's image is too old to update in place"), that is a product change for you and the user.
- **CR4-N1:** no confirmation before "Update to `<version>`", following SCN-001. An update restarts the node and stops its mid-turn runs until step 5. The doc says so explicitly.
- **zh-CN:** the node's reasons appear in English inside Chinese chrome, as designed (C2 `message`).

## Release

None requested for step 4. RELEASE.md's default is no release, and the user's earlier beta request was for step 3. A release would ship the desktop line; `release-notes.md` is ready for it (including the "Not reachable." explanation and the launcher reinstall).

## Where Things Are

- Worktree and branch kept for step 5; ticket folder in `tickets/in-progress/`.
- The untracked `autobyteus-web/electron-dist` from API/E2E's isolated build is ignored by git and was not committed.
- The user's nodes were only read (`docker ps`/`inspect`), never changed.
