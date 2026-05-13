# Requirements

## Status
Design-ready

## Goal / Problem Statement
Simplify the "Codex full access" and "Streaming parser" cards in the Server Setting Basics area on the frontend. The current text is too dense, especially for the "Streaming parser" card which exposes environment variable names (`AUTOBYTEUS_STREAM_PARSER=xml`) that the end-user likely doesn't care about. The goal is to make the interface cleaner, simpler, and more user-friendly.

## In-Scope Use Cases
- UC-001: User views the Server Setting Basics area and sees simplified "Codex full access" and "Streaming parser" cards.
- UC-002: User toggles the settings, understanding their effects without needing to read overly technical implementation details.

## Acceptance Criteria
- AC-001 (mapped to UC-001, UC-002): The "Codex full access" card text is reduced and simplified.
  - Title: "Codex full access"
  - Description: "Control whether Codex sessions run without filesystem sandboxing."
  - ToggleLabel: "Allow full filesystem access"
  - Warning: "Warning: Runs with danger-full-access. Use only when you trust the task."
  - FutureSessionNote: "Applies to new sessions."
- AC-002 (mapped to UC-001, UC-002): The "Streaming parser" card text is reduced, simplified, and removes internal implementation details.
  - Title: "Streaming parser"
  - Description: "Control whether streamed tool calls force the XML parser override."
  - ToggleLabel: "Use XML streaming parser"
  - Warning: "When enabled, forces the XML parser override. Otherwise, stores provider-native tool calls."
  - FutureSessionNote: "Applies to new streamed responses."
- AC-003 (mapped to UC-002): The core functionality (toggling the settings) remains clear and functional (no underlying logic change).

## Requirement Coverage Map
- REQ-001 (Simplify Codex card text) maps to UC-001, UC-002
- REQ-002 (Simplify Streaming Parser card text) maps to UC-001, UC-002

## Constraints / Dependencies
- Requires updates to English localization file (`autobyteus-web/localization/messages/en/settings.ts`).
- May require matching updates to Chinese localization file if needed.

## Assumptions
- The technical behavior of the settings is not changing, only the descriptive text.

## Open Questions / Risks
- None.
