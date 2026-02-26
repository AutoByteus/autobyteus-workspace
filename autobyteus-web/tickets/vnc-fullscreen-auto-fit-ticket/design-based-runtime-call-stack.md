# Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/vnc-fullscreen-auto-fit-ticket/implementation-plan.md`

## Use Case Index

- Use Case 1: Enter maximize and enable fullscreen-fit mode
- Use Case 2: Resize while maximized with remote-resize primary and fit fallback
- Use Case 3: Exit maximize and restore baseline session behavior

---

## Use Case 1: Enter maximize and enable fullscreen-fit mode

### Goal

When maximize is enabled, attempt remote desktop resize to container size while preserving safe fallback rendering.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue:toggleMaximize()
├── /Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue:isMaximized.value = true [STATE]
├── /Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue:toolbarVisible.value = false [STATE]
└── /Users/normy/autobyteus_org/autobyteus-web/composables/useVncSession.ts:enterFullscreenFitMode()
    ├── /Users/normy/autobyteus_org/autobyteus-web/composables/useVncSession.ts:fullscreenFitEnabled.value = true [STATE]
    ├── /Users/normy/autobyteus_org/autobyteus-web/composables/useVncSession.ts:applyViewportStrategy() [STATE]
    │   ├── rfb.scaleViewport = true
    │   ├── rfb.resizeSession = true
    │   └── rfb.viewOnly = false (temporary maximize-mode override)
    └── /Users/normy/autobyteus_org/autobyteus-web/composables/useVncSession.ts:refreshViewport()
```

### Fallback / Error Branch

```text
[FALLBACK] if server does not support SetDesktopSize
/Users/normy/autobyteus_org/autobyteus-web/lib/novnc/core/rfb.js:_requestRemoteResize()
└── return early when _supportsSetDesktopSize is false
    # autoscale remains active via scaleViewport=true
```

---

## Use Case 2: Resize while maximized with remote-resize primary and fit fallback

### Goal

During viewport changes in maximize mode, keep requesting best-fit rendering while preserving compatibility.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue:ResizeObserver callback
├── condition: isConnected.value
└── /Users/normy/autobyteus_org/autobyteus-web/composables/useVncSession.ts:refreshViewport()
    ├── rfb.scaleViewport = true
    └── [ASYNC] window.dispatchEvent('resize')
        └── /Users/normy/autobyteus_org/autobyteus-web/lib/novnc/core/rfb.js:_handleResize()
            ├── _updateScale() -> autoscale
            └── _requestRemoteResize() when resizeSession=true and server supports it
```

### Fallback / Error Branch

```text
[FALLBACK] fixed-resolution host (x11vnc/Xvfb)
noVNC skips remote resize request
└── client keeps autoscale contain mode (letterbox fallback)
```

---

## Use Case 3: Exit maximize and restore baseline session behavior

### Goal

On maximize exit (toggle or Esc), disable fullscreen-fit mode and restore user-selected interaction mode.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue:handleKeydown(event) or toggleMaximize()
├── /Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue:isMaximized.value = false [STATE]
├── /Users/normy/autobyteus_org/autobyteus-web/components/workspace/tools/VncHostTile.vue:toolbarVisible.value = true [STATE]
└── /Users/normy/autobyteus_org/autobyteus-web/composables/useVncSession.ts:exitFullscreenFitMode()
    ├── fullscreenFitEnabled.value = false [STATE]
    ├── applyViewportStrategy() [STATE]
    │   ├── rfb.resizeSession = false
    │   └── rfb.viewOnly = user-controlled viewOnly state
    └── refreshViewport()
```

### Fallback / Error Branch

```text
[FALLBACK] if disconnected before exit
exitFullscreenFitMode() updates internal flags only; no-op on missing rfb
```
