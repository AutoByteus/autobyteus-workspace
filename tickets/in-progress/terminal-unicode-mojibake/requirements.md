# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Investigate and fix the AutoByteus frontend Terminal tab rendering mojibake / strange symbols when terminal applications such as `codex` or `claude` emit Unicode box-drawing or other non-ASCII output. The terminal UI should render UTF-8 CLI output correctly instead of displaying replacement mojibake sequences such as `â...`.

## Investigation Findings

Initial user screenshot and correct browser reproduction show classic UTF-8 decoded as Latin-1 / binary-string mojibake around Codex CLI Unicode output. Code inspection isolates the frontend boundary: `useTerminalSession.ts` decodes base64 WebSocket output with `atob(...)` and forwards the returned binary string directly to xterm. Runtime reproduction through the correct frontend and Electron-started backend confirmed Codex output displays `â...` sequences. A deterministic ASCII-only `printf` command that emitted UTF-8 bytes for `┌─┐` also rendered as `â...`, removing Codex as a variable.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: User screenshot; code inspection of terminal WebSocket/base64 path; correct wide-viewport browser reproduction through frontend `localhost:3000` and Electron-started backend `127.0.0.1:29695`.
- Requirement or scope impact: Terminal byte/string encoding path is verified; implementation should stay focused on frontend UTF-8/base64 conversion and validation.

## Recommendations

Fix the frontend terminal base64 codec so outbound input strings are UTF-8 encoded before base64 transport and inbound base64 output bytes are decoded with a streaming UTF-8 decoder before writing to xterm. Keep backend terminal output as base64 bytes.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: User opens the AutoByteus frontend Terminal tab, runs `codex`, and sees Codex CLI Unicode UI elements rendered correctly.
- UC-002: User runs other CLIs that emit Unicode, ANSI escape sequences, and non-ASCII text in the Terminal tab and sees correct rendering.
- UC-003: Terminal input/output continues to support normal shell interaction, ANSI color/control sequences, and resizing.

## Out of Scope

- Changing Codex or Claude CLI behavior.
- Replacing the terminal UI stack unless investigation proves the existing stack cannot support correct UTF-8 rendering.
- Broad terminal feature additions unrelated to Unicode correctness.

## Functional Requirements

- REQ-001: The Terminal tab must preserve UTF-8 terminal output end-to-end from the child process/pty to the frontend terminal renderer.
- REQ-002: Unicode box-drawing characters emitted by interactive CLIs must render as the intended characters, not mojibake sequences.
- REQ-003: The fix must preserve ANSI escape/control sequence handling, prompt rendering, command input, and terminal resize behavior.
- REQ-004: The fix must be validated with a deterministic Unicode/ANSI reproduction in addition to any manual `codex`/`claude` smoke check.
- REQ-005: Terminal input must preserve non-ASCII user input by UTF-8 encoding strings before base64 transport.

## Acceptance Criteria

- AC-001: Running a deterministic command that prints box-drawing characters, for example `printf '┌─┐\n│✓│\n└─┘\n'`, in the AutoByteus Terminal tab displays the exact Unicode glyphs without `â`, replacement glyphs, or visible byte-fragment artifacts.
- AC-002: Running `codex` from the Terminal tab no longer displays mojibake around the Codex banner, border, model line, directory line, warning text, or prompt area.
- AC-003: ANSI colors/control sequences from the same terminal session still render correctly after the fix.
- AC-004: Terminal resize and input echo behavior still work after the fix.
- AC-005: Automated or scripted validation covers the terminal transport/decoder behavior enough to catch a regression where UTF-8 bytes are decoded as Latin-1 or split incorrectly across chunks.
- AC-006: Terminal input supports user-entered non-ASCII text without `btoa` throwing `InvalidCharacterError` or sending corrupted bytes.

## Constraints / Dependencies

- The application is an Electron/frontend/server system in the AutoByteus workspace.
- The user expects reproduction via the frontend and server path that Electron starts.
- The solution must fit the existing terminal ownership path after investigation identifies it.

## Assumptions

- The visible `â...` output is caused by an encoding mismatch or byte-to-string conversion boundary, not by the Codex CLI intentionally emitting those characters.
- The underlying terminal emulator can render UTF-8 correctly if it receives a correct JavaScript string or correctly decoded stream.

## Risks / Open Questions

- A byte stream split across WebSocket output messages requires streaming `TextDecoder` semantics rather than independent per-message decoding.
- Browser globals (`TextEncoder`, `TextDecoder`, `atob`, `btoa`) must be used in a testable way in the Nuxt/Vitest environment.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-002 |
| REQ-003 | UC-003 |
| REQ-004 | UC-001, UC-002, UC-003 |
| REQ-005 | UC-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Deterministic direct Unicode reproduction |
| AC-002 | User-reported Codex CLI reproduction |
| AC-003 | ANSI behavior regression guard |
| AC-004 | Terminal interaction regression guard |
| AC-005 | Durable validation against the root encoding class |
| AC-006 | Non-ASCII terminal input regression guard |

## Approval Status

Approved for design by user instruction on 2026-06-06: “since it's clear now ... kick off a ticket to fix.”
