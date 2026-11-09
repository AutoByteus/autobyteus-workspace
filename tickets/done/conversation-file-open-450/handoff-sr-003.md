# Handoff — autobyteus-450, SR-003 (answer to DI-001)

- Package: `conversation-file-open-450`; classification unchanged `Medium` / `Low`; route `/software_engineering_team/implementation_engineer` (`get_handoff_rules`, 2026-11-09).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450`, branch `codex/conversation-file-open-450` (implementation commits up to `43a56817c8`). SR-003 changes only the ticket documents: `requirements-doc.md`, `design-spec.md`, `solution-revision-record.md`, and this file.

## Decision on DI-001: taken in (DEC-005)

The composer's draft attachments are in scope. They are the same capability on the same screen, and an old APK still shows the pairing screen there. Your proposal is accepted:
- the composer thumbnail uses `MessageAttachmentThumbnail`;
- the full-screen image modal uses the authorized object URL;
- on the phone, a tap goes to `useMobileAttachmentOpening` (`/rest/drafts/…` through `openContextFile`).

AC-001 keeps its network clause, now for both the composer chip and the sent message's chip. AC-002 includes draft attachments.

## Your other decisions

1. The `no-store` object-URL media reload: accepted.
2. The `contextFileName` query key: accepted.
3. A path attachment the phone cannot open (a run on another node): **revised**. Show the existing file-link notice "This file is available only on the host workspace." (`…MarkdownRenderer.file_available_on_host`) as a toast instead of opening nothing (DEC-006, AC-002), consistent with how file links behave.

## Next

Continue implementation (IR-002), then hand off as your skill and the rules say.
