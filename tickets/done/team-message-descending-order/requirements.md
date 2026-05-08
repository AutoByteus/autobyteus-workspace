# Team Message Descending Order Requirements

Status: Design-ready

## User Intent

In the Team tab, the per-agent Messages list should feel like an email inbox. A focused agent's messages should be displayed in descending chronological order so the newest communication is easiest to find first.

## Requirements

- Show one combined message list for the focused member, sorted newest first by message creation time.
- Preserve direction cues through the existing sent/received icons and inline counterpart metadata.
- Do not reintroduce visual `Sent` or `Received` section headers.
- Default the detail pane to the newest available message.
- Keep reference-file rows attached to their parent message and preserve the existing reference viewer behavior.

## Acceptance Criteria

- Given mixed sent and received messages, the left message list orders rows by descending `createdAt`, regardless of direction.
- Given a message list with at least one message, the detail pane opens the newest message by default.
- Existing sent/received icons, counterpart labels, timestamps, and file reference rows still render.
- Focused component tests cover the newest-first display behavior and reference selection behavior.
