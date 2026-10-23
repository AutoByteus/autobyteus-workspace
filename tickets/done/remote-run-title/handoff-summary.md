# Handoff Summary — remote-run-title (autobyteus-269)

Status: **finalized into `personal` and released in stable `v1.5.8`** (DR-001), at the user's request. **AC-605, the user's check on his Docker node, is open:** the user chose to finalize and release without checking first.

## Ticket

- Package: `remote-run-title`, Project Task `autobyteus-269`, part of autobyteus-25. A run that a peer node starts by delegation (Agent or Agent Team) is titled in the receiving node's history with the delegated task description. The window's rule: a stored title always wins, and the live first message only fills an empty one.
- Classification: `task_size=Small`, `architectural_risk=Low`. Route: **direct**:
  - API-REV-001 found F-001: an active peer-started Agent row showed the work-packet wrapper;
  - the code reviewer's failure-origin review CRR-001 classified it as Design Impact;
  - SR-004 gave the window rule, and IR-002 implemented it;
  - API-REV-002 Pass, 95%;
  - test-code review: `Not Required — direct low-risk route`.
- Archived ticket folder: `tickets/done/remote-run-title/` on `personal`.

## What Changed

- **Server:** `RemoteMessageReceiver` records an accepted work packet's content through `RemoteRunTitles`, which is `AgentRunService`/`TeamRunService.recordRunTitle`, the same path as the window's first message. It is compacted to one line of at most 100 characters, the first non-empty title wins, and there is no migration.
- **Web:**
  - the live-status merge, the navigation patch and the standalone header use the stored title first;
  - `resolveStoredTitleSummary` drops the single-line skill instruction (`skillRequestInstruction.parseSingleLine`), so a stopped skill-tagged run reads as when it was active.
- **Tests:** the new durable browser probe `autobyteus-web/tests/e2e/remote-run-title-probe.mjs` (`pnpm -C autobyteus-web test:e2e:remote-run-title`, after a server build), RC-05/21/22/30 in the two-server E2E, and unit and spec tests.
- **Docs:** `remote_collaboration.md`, `run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md` and `agent_orgs.md`, by the implementation. Delivery verified them.

## Integration

- `origin/personal` advanced from `33171e1385` to `ca1f09e52a`: the copy-only NFS guide (web and `RELEASE.md` NFS text only).
- A checkpoint commit `89aeb8f5d8` added the reviewer's CRR-001 documents. The merge `a06213c4e5` was clean, and no file changed on both sides.
- Rerun on the merged state (`evidence/delivery/`):
  - **DEL-01:** web guards and the web suite, 653 files, 4686 passed;
  - **DEL-02:** server build and the browser probe, 6/6, with clean cleanup and no browser errors.
- The server is untouched by the base, so API-01 (30/30) and the server checks hold.

## Verification

- **Judged from the evidence: sufficient for AC-601 … AC-604.** Details are in `release-deployment-report.md`.
- **AC-605 (the user's check):** a new delegation from the desktop shows a real title on the user's Docker node.
  - On 2026-10-22 the user said the ticket "reaches your place now", then "finalize and release a stable version now".
  - Status: **open**, to be checked on `v1.5.8`.

## Release

- `Stable` `v1.5.8`, by the user's request. Curated notes are in `release-notes.md` and cover everything since `v1.5.7`.

## Residual Risks And Follow-ups

- FU-001 (recorded by delivery from the implementation's residual): the Team row could briefly show a member's first message before a refresh. It is pre-existing for user-started Teams and unconfirmed for peer-started ones.
