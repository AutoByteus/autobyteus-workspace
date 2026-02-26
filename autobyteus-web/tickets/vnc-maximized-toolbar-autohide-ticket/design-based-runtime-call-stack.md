# Design-Based Runtime Call Stacks (Debug-Trace Style)

Use this document as a design-derived runtime trace. Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
This artifact is required for all change sizes; for small changes keep it concise but still cover every in-scope use case.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.

## Design Basis

- Scope Classification: `Small`
- Source Artifact:
  - `tickets/vnc-maximized-toolbar-autohide-ticket/implementation-plan.md` (draft solution sketch as lightweight design basis)
- Referenced Sections:
  - `Solution Sketch`
  - `Step-By-Step Plan`

## Use Case Index

- Use Case 1: Enter maximize mode with toolbar hidden
- Use Case 2: Reveal toolbar from top edge and auto-hide after leave
- Use Case 3: Exit maximize mode via escape

---

## Use Case 1: Enter maximize mode with toolbar hidden

### Goal

Start maximize mode with maximal remote-screen vertical area.

### Preconditions

- Existing VNC tile is connected.
- User clicks maximize control.

### Expected Outcome

- Tile enters fixed fullscreen layout.
- Toolbar is hidden by default.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/tools/VncHostTile.vue:toggleMaximize()
├── components/workspace/tools/VncHostTile.vue:clearToolbarTimers() [STATE]
├── components/workspace/tools/VncHostTile.vue:isMaximized.value = true [STATE]
└── components/workspace/tools/VncHostTile.vue:toolbarVisible.value = false [STATE]
    # template switches to maximize classes and hidden-toolbar state
```

### Branching / Fallback Paths

```text
[FALLBACK] when toggling from maximize -> normal mode
components/workspace/tools/VncHostTile.vue:toggleMaximize()
├── components/workspace/tools/VncHostTile.vue:isMaximized.value = false [STATE]
└── components/workspace/tools/VncHostTile.vue:toolbarVisible.value = true [STATE]
```

### State And Data Transformations

- `isMaximized: false -> true`
- `toolbarVisible: true -> false`

### Observability And Debug Points

- Existing VNC connect/resize logging remains unchanged.

### Design Smells / Gaps

- None.

### Open Questions

- None for minimal version.

---

## Use Case 2: Reveal toolbar from top edge and auto-hide after leave

### Goal

Allow quick access to controls without permanently consuming vertical space.

### Preconditions

- Maximize mode active.
- Toolbar is hidden.

### Expected Outcome

- Cursor entering top-edge hotspot reveals toolbar.
- Leaving toolbar schedules delayed hide.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/tools/VncHostTile.vue:handleRevealZoneEnter()
├── components/workspace/tools/VncHostTile.vue:clearHideToolbarTimer() [STATE]
├── components/workspace/tools/VncHostTile.vue:scheduleRevealToolbar() [STATE]
│   └── [ASYNC] setTimeout(revealDelay)
│       └── components/workspace/tools/VncHostTile.vue:toolbarVisible.value = true [STATE]
└── components/workspace/tools/VncHostTile.vue:handleToolbarMouseLeave()
    └── [ASYNC] setTimeout(hideDelay)
        └── components/workspace/tools/VncHostTile.vue:toolbarVisible.value = false [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] user re-enters toolbar before hide delay ends
components/workspace/tools/VncHostTile.vue:handleToolbarMouseEnter()
└── components/workspace/tools/VncHostTile.vue:clearHideToolbarTimer() [STATE]
```

```text
[FALLBACK] not maximized
components/workspace/tools/VncHostTile.vue:handleRevealZoneEnter()
└── return early (no state mutation)
```

### State And Data Transformations

- `toolbarVisible: false -> true -> false` driven by reveal/hide timers.

### Observability And Debug Points

- UI state transitions are deterministic and timer-based.

### Design Smells / Gaps

- Potential flicker if overlapping timers are not cleared; handled by explicit timer cleanup.

### Open Questions

- None.

---

## Use Case 3: Exit maximize mode via escape

### Goal

Return to normal tile layout quickly using existing keyboard behavior.

### Preconditions

- Maximize mode active.
- User presses `Escape`.

### Expected Outcome

- Maximize mode exits.
- Toolbar returns to always-visible normal behavior.

### Primary Runtime Call Stack

```text
[ENTRY] components/workspace/tools/VncHostTile.vue:handleKeydown(event)
├── condition: event.key === 'Escape'
├── components/workspace/tools/VncHostTile.vue:clearToolbarTimers() [STATE]
├── components/workspace/tools/VncHostTile.vue:isMaximized.value = false [STATE]
└── components/workspace/tools/VncHostTile.vue:toolbarVisible.value = true [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] key is not Escape
components/workspace/tools/VncHostTile.vue:handleKeydown(event)
└── no-op
```

### State And Data Transformations

- `isMaximized: true -> false`
- `toolbarVisible: (any) -> true`

### Observability And Debug Points

- Existing keyboard listener lifecycle remains in `onMounted`/`onBeforeUnmount`.

### Design Smells / Gaps

- None.

### Open Questions

- None.
