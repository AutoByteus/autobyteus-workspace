# Design Correction: Remove Generated XML-Backtick Continuation Guidance

## Status

Required design/requirements correction from user feedback on 2026-07-05.

## Reason

The prior reviewed/implemented scope added generated XML tool-call markdown guidance to post-tool-result continuation text. The user clarified this is incorrect: by the time a tool-continuation user message is sent, the XML tool call has already been emitted and parsed. XML-format guidance after that point is too late and redundant. If the user wants XML tool calls enclosed in markdown backticks, that instruction belongs in the user's original prompt before the model emits the tool call.

## Corrected Scope

Keep only the simple continuation wording fix:

```text
The <tool_name> tool call completed successfully.
```

For the reported case:

```text
The read_media_file tool call completed successfully.
```

Also keep the requirement that RPA/browser-visible current input must not omit completed tool results when RPA would otherwise send only the current user text/media.

## Removed From Scope

Implementation must remove all generated XML-format continuation logic, including:

- `XML_TOOL_CALL_MARKDOWN_INSTRUCTION`
- `includeXmlToolCallInstruction`
- XML-mode appending in `ToolResultContinuationBuilder` or display-text helpers
- XML instruction assertions in unit/integration tests
- API/E2E expectations that continuation text includes XML guidance

## Artifact Updates

Updated upstream artifacts:

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/done/rpa-xml-read-media-duplication/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/done/rpa-xml-read-media-duplication/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/done/rpa-xml-read-media-duplication/design-spec.md`

Downstream artifacts created before this correction, especially implementation handoff, code review report, and API/E2E coverage investigation, may still mention XML guidance. Those references are superseded by this correction until implementation is reworked and re-reviewed.

## Required Routing

Route corrected package back to `implementation_engineer` before API/E2E resumes. The implementation should then return through code review.
