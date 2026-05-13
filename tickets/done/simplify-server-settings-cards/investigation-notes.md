# Investigation Notes

## Investigation Goals
- Locate the source of the texts for "Codex full access" and "Streaming parser" cards.
- Determine the scope of the change.

## Findings
- The texts are located in the English localization file: `autobyteus-web/localization/messages/en/settings.ts` (lines 187-202).
- The Chinese localization file `autobyteus-web/localization/messages/zh-CN/settings.ts` will also need updating to match the simplified English version.
- Current English texts for Codex Full Access:
  - Title: 'Codex full access'
  - Description: 'Choose whether future Codex sessions can run without filesystem sandboxing.'
  - ToggleLabel: 'Allow Codex to run with full filesystem access'
  - Warning: 'When enabled, Codex uses danger-full-access with no filesystem sandboxing. Use only when you trust the task and environment.'
  - FutureSessionNote: 'Applies to new Codex sessions.'
- Current English texts for Streaming Parser:
  - Title: 'Streaming parser'
  - Description: 'Choose whether future streamed tool calls force the XML parser override.'
  - ToggleLabel: 'Use XML streaming parser'
  - Warning: 'When enabled, AutoByteus saves AUTOBYTEUS_STREAM_PARSER=xml. Saving with this toggle off stores provider-native API tool calls.'
  - FutureSessionNote: 'Applies to new streamed agent responses. Active streams are unchanged.'

The user finds these overly dense, particularly the inclusion of `AUTOBYTEUS_STREAM_PARSER=xml` and `danger-full-access`.

## Scope Triage
- **Small**: The change only involves modifying the text strings in localization files. No structural changes are required.
