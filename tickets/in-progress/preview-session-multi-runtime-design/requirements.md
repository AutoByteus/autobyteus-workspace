# Requirements — Preview Session Multi-Runtime Design

- **Status**: `Refined`
- **Ticket**: `preview-session-multi-runtime-design`
- **Branch**: `codex/preview-session-multi-runtime-design`
- **Date**: `2026-03-31`
- **Scope Classification**: `Large`

---

## Goal / Problem Statement

The application already allows agents to run backend processes, including long-running background servers. That is sufficient for backend verification, but not for frontend verification, where the agent also needs a browser-like preview surface for loading the application, observing runtime behavior, capturing screenshots, and optionally inspecting console output or related diagnostics.

The user wants a design that:

- makes frontend preview/testing convenient for end users of the Electron application,
- works cleanly with the existing backend support for multiple runtime kinds,
- avoids a messy frontend event model and avoids runtime-specific duplication,
- uses session-oriented tool contracts so follow-up actions operate on a stable `preview_session_id`,
- evaluates whether the capability should be exposed through MCP, dynamic tools, or a reusable shell-level bridge,
- stops at design review before implementation.

---

## In-Scope Use Cases

### UC-001 — Agent opens a preview session for a frontend target

An agent invokes a preview-opening capability with a target URL or equivalent target descriptor. The system creates or focuses a preview session and returns a stable `preview_session_id`.

### UC-002 — Agent performs follow-up actions against an existing preview session

After the preview session is created, later tools such as navigation, screenshot capture, console-log retrieval, DOM inspection, or close/focus operations use the same `preview_session_id`.

### UC-003 — Preview capability is reusable across supported runtime kinds

The design supports the backend's currently supported runtime kinds:

- `autobyteus`
- `claude_agent_sdk`
- `codex_app_server`

through one shared preview-session abstraction rather than per-runtime bespoke frontend logic.

### UC-004 — Renderer exposes preview state without excessive event proliferation

The Electron renderer can surface preview-session state to users without introducing many unrelated event types, duplicated stores, or runtime-specific UI code paths.

### UC-005 — MCP and shell integration paths are clarified

The design explains whether the preview capability should live as an internal shell service, as an MCP server/tool surface, or as a layered combination of both, and it names the ownership boundaries clearly.

### UC-006 — Preview session cleanup and invalidation are explicit

When the user or the system closes a preview surface, the associated `preview_session_id` becomes invalid and follow-up tool calls receive a predictable not-found or closed-session result.

### UC-007 — Design-only review checkpoint

The workflow produces design artifacts only, including design review, and stops before implementation so the user can inspect the design.

---

## Requirements

### R-001 — Session-Oriented Preview Contract

The preview capability MUST be modeled as a first-class session abstraction with a stable `preview_session_id` returned from the initial open/create operation and reused by subsequent operations.

### R-002 — Shared Multi-Runtime Abstraction

The design MUST define one reusable preview-session management model that can be exposed consistently across:

- `autobyteus`
- `claude_agent_sdk`
- `codex_app_server`

instead of introducing runtime-specific preview semantics or renderer state models.

### R-003 — Clear Ownership Boundary

The design MUST identify which layer owns:

- preview session lifecycle,
- Electron surface creation/focus/close,
- renderer state projection,
- tool invocation contract,
- MCP adapter responsibilities, if MCP is used.

### R-004 — Minimal Event Surface

The design MUST minimize new event proliferation. It should prefer a small number of generic state/snapshot/update channels over many specialized event types.

### R-005 — UI Complexity Control

The design MUST explicitly evaluate how to avoid making the Electron shell messy, including whether preview should appear as:

- a dedicated BrowserWindow,
- a right-panel Preview tab with internal sessions,
- another shell-level surface.

The decision and rationale must be documented.

### R-006 — Tool Exposure Strategy

The design MUST specify whether preview tools are best exposed as:

- internal dynamic tools,
- MCP tools,
- or a layered approach where one internal service is wrapped by one or both tool surfaces.

It MUST also explain how each currently supported runtime kind consumes that exposure strategy.

### R-007 — Session Cleanup Semantics

The design MUST define how preview sessions are invalidated, how session lookup failures are reported, and which layer is authoritative for session state.

### R-008 — Scope Discipline

The initial design SHOULD define a narrow MVP tool set sufficient for frontend preview validation without prematurely committing to a full browser-automation surface.

### R-009 — Session Contract Parity Across Adapters

If multiple tool exposure paths are used, they MUST preserve the same session-oriented contract shape and semantics so that `preview_session_id` means the same thing regardless of runtime kind or adapter.

---

## Acceptance Criteria

### AC-001 — Design identifies the governing owner

The design names the authoritative owner for preview session state and explains why that owner is correct for Electron lifecycle, runtime reuse, and UI projection.

### AC-002 — Design defines the stable session contract

The design includes a concrete session-based contract showing the create/open response shape and the follow-up tool inputs that consume `preview_session_id`.

### AC-003 — Design explains multi-runtime reuse

The design explains how the preview capability can be reused across `autobyteus`, `claude_agent_sdk`, and `codex_app_server` without duplicating the preview-session core.

### AC-004 — Design contains an event-minimizing renderer strategy

The design explains how the renderer learns about preview sessions while keeping the frontend state/event model small and coherent.

### AC-005 — Design evaluates MCP fit

The design explicitly evaluates whether MCP is appropriate, where the MCP boundary would sit, and what additional complexity MCP introduces or avoids.

### AC-006 — Design includes a narrow MVP recommendation

The design recommends a bounded initial tool set and names what is intentionally out of scope for v1.

### AC-007 — Design review reaches `Go Confirmed`

The future-state runtime call stack review reaches a design-complete decision with no unresolved blockers before work stops for user review.

### AC-008 — Design defines adapter parity

The design includes a runtime adapter matrix or equivalent explanation showing how each runtime kind reaches the same preview-session contract.

---

## Constraints / Dependencies

- The design must respect the existing Electron `main` / `preload` / renderer separation.
- The design must respect the existing agent tool lifecycle and runtime abstractions already present in the codebase.
- The design must not assume a single runtime kind or a single frontend integration path.
- The design should avoid unnecessary frontend sprawl in tabs, stores, or events.
- The design should treat Electron main-process ownership and runtime/tool exposure as separate architectural concerns.
- The workflow for this ticket stops after design and runtime-call-stack review; no implementation is in scope.

---

## Assumptions

- The backend currently supports three runtime kinds: `autobyteus`, `claude_agent_sdk`, and `codex_app_server`.
- End-user value is high enough to justify a reusable preview capability if the architecture remains clean.
- Session-oriented preview tools are preferred over one-shot preview commands.
- Electron main is the most likely owner of authoritative preview lifecycle, pending design confirmation.

---

## Open Questions / Risks

- Which exact runtime layers currently need access to the preview capability?
- Should the first user-visible surface be a dedicated preview window or a right-panel preview tab?
- Does MCP reduce integration complexity here, or does it mostly add another protocol boundary?
- How should remote-node or non-local preview targets be handled in the initial design?

---

## Requirement To Use-Case Coverage

| Requirement ID | Covered By Use Case IDs |
| --- | --- |
| R-001 | UC-001, UC-002 |
| R-002 | UC-003 |
| R-003 | UC-003, UC-005 |
| R-004 | UC-004 |
| R-005 | UC-004, UC-005 |
| R-006 | UC-005 |
| R-007 | UC-006 |
| R-008 | UC-001, UC-002, UC-007 |
| R-009 | UC-002, UC-003, UC-005 |

## Acceptance-Criteria To Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | The proposed owner for preview sessions is explicit and defensible. |
| AC-002 | The session ID contract is concrete enough to drive tool and UI design. |
| AC-003 | The design does not duplicate preview logic per runtime kind. |
| AC-004 | The renderer path is coherent and event-light. |
| AC-005 | MCP fit is evaluated with clear tradeoffs. |
| AC-006 | The initial tool surface is intentionally small. |
| AC-007 | The design artifacts are reviewed to a go/no-go decision before implementation. |
| AC-008 | Runtime-specific adapters preserve one shared session contract. |
