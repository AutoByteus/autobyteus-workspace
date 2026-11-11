# Handoff Summary — autobyteus-452

## Summary Meta

- Ticket: `open-file-live-refresh-452` (Project Task autobyteus-452, 450's FU-001). An open workspace file refreshes by itself when it changes on disk.
- Date: `2026-11-11`
- Current status: `Complete`. Verified from the evidence and finalized into `origin/personal` (DR-001; the merge and push are in `release-deployment-report.md`). No release.
- Routing: `task_size` `Medium`, `architectural_risk` `Low`, route `Direct` (no architecture, code or test-code review, by the team's rules). API-REV-001 Pass at 95.1%.
- Archived ticket folder: `tickets/done/open-file-live-refresh-452/`

## Delivery Summary

- **Node (`watchdog-handler`):** `modify` with the workspace-relative path on every file change, and after a file add or move. An atomic rewrite arrives as a move. This holds whether or not the tree has the path.
- **Window (`fileExplorerTreeActions`):**
  - for each `modify`, the own-save mark is handled first, as before;
  - an open file is then reloaded through `_reloadOpenFile`, which keeps the draft for text and bumps `contentRevision` for other types;
  - other paths cause no reads.
- **Durable tests:** server unit tests (`file-system-changes`, `watchdog-handler`), a server e2e test, store and tab specs, and phone probe cases MSP-39…42 (`mobile-live-file-refresh-cases.mjs`).
- **Five baseline test fixes**, each in its own commit with its cause:
  - `0da603e62e`: duplicate MSP-32;
  - `e30dd1b15e`: a check in MSP-24/34/35 that went stale with 469;
  - `3db909124e`: a server scan test's timeout;
  - `899839dcae`: MSP-22 now counts every socket the page starts, which makes it stricter;
  - `0298663b07`: the pairing test's background write.
- **Docs:** `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` and `autobyteus-web/docs/remote_access.md`. See `docs-sync-report.md`.

## Verification

- Verified from the evidence; no user check needed. Final confidence 95.1%; no category below 90% (two at 93%).

| AC | Proven by | Result |
| --- | --- | --- |
| AC-001 | MSP-39 (folder never expanded) | In place, same-folder atomic and other-folder atomic rewrites shown on desktop and phone in 527–538 ms, 1 read each, 0 folder reads |
| AC-002 | MSP-40 | Image 40×20 → 80×30; PDF page ratio 2 → 4; root image → 60×20; all ≤ 633 ms on both |
| AC-003 | MSP-41 | Unsaved edit kept after an outside rewrite |
| AC-004 | MSP-41, MSP-42 | Own save: one write, one read-back (as before), no loop. 20 files not open: 0 reads. 200 changes: 1 frame, 10,053 bytes, 0 reads |
| AC-005 | API-08, API-09, API-10, API-11 | Web 752 files; server unit 7582 tests; 41 of 42 probe cases, with MSP-22 Pass after its test fix (API-11); 471's desktop probes Pass, apart from PSD-005 (below) |

## Integration

- autobyteus-471 changed `_reloadOpenFile` and was merged first. API/E2E merged `origin/personal` `ed481ae4ca` as `2da34f6644`, as the design asked.
  - The only conflict was the duplicate model-sheet ID, resolved as `personal`'s MSP-38.
  - It reran 471's cases on the merge.
- At delivery the branch was still current with `ed481ae4ca`, so no rerun was needed.

## Accepted Residual Risks

- **FU-002:** PSD-005 fails intermittently (1 of 4 runs; often with a delayed read). After an own save, the one re-read briefly leaves no committed content, and an editor update in that window leaves a draft equal to the saved text. It is the same code before 452, as the store-level check shows, but 452 makes the same re-read reachable for files in folders never expanded.
- **FU-001:** files opened by absolute path outside the workspace have no live feed.
- Not tested: Windows and Linux, and the packaged app (this change touches no shell or opening path).

## Follow-ups

FU-001…FU-003 are in `follow-ups.md`; FU-003 closes 471's FU-003 with its cause. The Solution Designer sends them now that the ticket leaves the team.

## Release

None. Release only on the user's word (handoff), and `RELEASE.md` defaults to none. `release-notes.md` is ready for the next release.
