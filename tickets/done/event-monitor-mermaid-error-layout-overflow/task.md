# Task: Prevent Mermaid Error DOM Overflow

## Status

Requirements and design approved by the user; awaiting architecture review. Implementation has not started.

## User-Reported Problem

After the finalized Event Monitor file-preview ticket was merged, the Electron application can show an unexpected scrollable area below the apparent application bottom. Scrolling there reveals repeated Mermaid 11.12.3 error output: “Syntax error in text” and “mermaid version 11.12.3”. The suspected trigger is one or more malformed Mermaid diagrams rendered in Markdown.

## Objective

Ensure malformed Mermaid diagrams fail inside the existing diagram component without appending Mermaid fallback error SVGs to the document body or extending the outer application layout.

## Scope

- Configure the existing Mermaid service to suppress vendor-owned fallback error rendering.
- Preserve the existing local MermaidDiagram error state.
- Add width/wrapping containment to the local error presentation.
- Add focused unit/browser regression coverage for body cleanup, repeated failures, local error UI, and valid diagram preservation.

## Non-Goals

- Correcting Mermaid source content.
- Changing Mermaid versions.
- Redesigning workspace scrolling.
- Modifying backend, router, Electron file access, or persisted data.

## Bootstrap Context

- Task worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow
- Task branch: codex/event-monitor-mermaid-error-layout-overflow
- Recorded base: origin/personal at d4841fcb7dc7710aa984a272eb9ad582b0a714e7 before subsequent remote advancement
- Finalization target if implementation is authorized: personal / origin/personal

## Evidence

The retained probe is:
 /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/done/event-monitor-mermaid-error-layout-overflow/mermaid-body-leak-probe.md

Core artifacts:
- requirements.md
- investigation-notes.md
- design-spec.md

## Approval Gate

User approval is recorded. Architecture review must pass before implementation begins.
