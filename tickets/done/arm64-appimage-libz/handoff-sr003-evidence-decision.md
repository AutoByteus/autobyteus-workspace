# Handoff — arm64-appimage-libz, SR-003: Evidence Decision DEC-006 (AE-11)

- Package: `arm64-appimage-libz`; Project Task `autobyteus-28`, requested by `/project_task_manager`. URGENT.
- Result: `Evidence Decision`, DEC-006, on API/E2E round 1 finding AE-11 (`Design Impact`). Requirements, acceptance criteria and design (SR-002) unchanged. Medium / High.
- Worktree: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz`, branch `codex/arm64-appimage-libz`.
- Ticket folder: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/`

## Decision

- **DEC-006, criterion:** the no-FUSE fallback named in the Non-Goals (`--appimage-extract-and-run`), related to AC-002 (which passed through extract-and-run).
- **Decision:** accept the risk. The arm64 static runtime leaves `$TMPDIR/appimage_extracted_<md5>` behind after extract-and-run. The fallback stays, and no runtime or code change is made.
- **Why low and bounded:**
  - The pinned release and the newest upstream build (`continuous`, `fedfad5`) both behave this way, so no runtime choice avoids it, and patching the binary is excluded by QR-002.
  - The path is opt-in only: the flag or `APPIMAGE_EXTRACT_AND_RUN`. A failed mount does not fall back to it on its own.
  - The leftover is one copy per app version (a second start reuses the folder). No data is lost.
  - Stock desktops mount with FUSE 3 and never take this path.
  - Today arm64 cannot start at all on a stock system.
  - Evidence: `evidence/api-e2e/AE-11-extract-and-run-cleanup.log` and `evidence/sd-extract-and-run-cleanup-upstream.log` (OBS-010).
- **Documentation:** `autobyteus-web/docs/electron_packaging.md`, wherever it mentions extract-and-run, says two things. With the arm64 AppImage, extract-and-run leaves `$TMPDIR/appimage_extracted_*` behind. And `--appimage-extract` then `squashfs-root/AppRun` is the cleaner choice on a host without FUSE. This is a one-sentence docs item; delivery's docs sync checks it, and no code change is required.
- **Not taken:** switching the runtime (no release fixes it); dropping the fallback (would narrow the approved Non-Goal for no gain).
- **Untested scope accepted:** none beyond DEC-005 (the FUSE 3 mount on a real arm64 desktop).
- **Follow-up:** FU-004 (report upstream; adopt a fixed runtime release).
- **Decided by:** the Solution Designer, 2026-11-22, as an evidence decision within the direction (risk low and bounded). The user is informed in the Solution Designer's conversation.

## Expected next step

API/E2E finalizes round 1 with AE-11 recorded as accepted risk DEC-006 / RSK-004, then the configured route (test-code review).

## Routing record

- 2026-11-22: `get_handoff_rules` → rule "Evidence Decision" → `/api_e2e_engineer`.
