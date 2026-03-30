# Docs Sync

## Scope

- Ticket: `run-bash-posix-spawn-failure`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/run-bash-posix-spawn-failure/workflow-state.md`

## Why Docs Were Updated

- Summary:
  - terminal docs now describe the shared Unix startup-recovery behavior and the install-time `node-pty` helper repair
  - parser docs now describe that XML leaf text is entity-decoded once before tool invocation arguments are built
- Why this change matters to long-lived project understanding:
  - without these updates, future maintainers could misdiagnose the macOS PTY failure as a missing dependency instead of a broken packaged helper permission, and parser behavior around XML-encoded shell text would remain implicit

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/terminal_tools.md` | public-facing terminal runtime behavior doc | Updated | added shared recovery and install-time repair notes |
| `autobyteus-ts/docs/terminal_android_direct_shell_backend_design.md` | backend policy design reference | Updated | clarified that non-Android still prefers PTY but may recover to direct shell on startup failure |
| `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` | parser/formatter alignment doc | Updated | documented single-pass XML entity decoding for tool arguments |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/terminal_tools.md` | behavior clarification | documented shared Unix startup recovery and macOS `spawn-helper` `postinstall` repair | reflects the actual runtime behavior after the fix |
| `autobyteus-ts/docs/terminal_android_direct_shell_backend_design.md` | design clarification | updated non-Android policy wording to describe PTY preference plus shared recovery | keeps backend policy docs aligned with current implementation |
| `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` | parser contract clarification | documented single-pass XML entity decoding before tool argument emission | makes the XML normalization contract explicit for future parser changes |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| `node-pty` macOS helper failure mode | `spawn-helper` can be packaged without execute permission, causing `posix_spawnp failed`; install-time and runtime repair are intentional | `investigation-notes.md`, `implementation.md` | `autobyteus-ts/docs/terminal_tools.md` |
| terminal backend policy | Unix still prefers PTY, but startup recovery is shared and may fall back to direct shell when PTY startup fails | `future-state-runtime-call-stack.md`, `implementation.md` | `autobyteus-ts/docs/terminal_tools.md`, `autobyteus-ts/docs/terminal_android_direct_shell_backend_design.md` |
| XML command normalization | XML leaf text is decoded exactly once before tool invocations are built | `requirements.md`, `implementation.md` | `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| implicit assumption that Unix `run_bash` only needs PTY startup | shared helper repair plus startup recovery policy | `autobyteus-ts/docs/terminal_tools.md` |
| implicit XML command normalization behavior | explicit single-pass XML entity decoding rule | `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` |

## Final Result

- Result: `Updated`
- Follow-up needed:
  - None for this ticket.
  - Reopened Stage 6 packaging-guard work required no additional long-lived doc changes because it only makes the published package manifest consistent with the already-documented install-time repair behavior.
