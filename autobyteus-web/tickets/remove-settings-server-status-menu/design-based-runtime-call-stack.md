# Design-Based Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags: `[ENTRY]`, `[ASYNC]`, `[STATE]`, `[FALLBACK]`, `[ERROR]`

## Design Basis

- Scope Classification: `Small`
- Source Artifact:
  - `tickets/remove-settings-server-status-menu/implementation-plan.md`
- Referenced Sections:
  - `Solution Sketch`
  - `Decommission / Rename Execution Tasks`

## Use Case Index

- Use Case 1: Embedded settings navigation uses a single server settings entry point.
- Use Case 2: Mount-time section resolution routes non-running embedded server to consolidated section.
- Use Case 3: Remote window sanitization rejects embedded-only sections.

## Use Case 1: Embedded Settings Navigation Uses A Single Server Settings Entry Point

### Goal

Remove duplicate top-level `Server Status` settings entry while preserving server diagnostics access through the Server Settings advanced panel.

### Preconditions

- Window context is embedded (`isEmbeddedWindow = true`).
- Settings page is rendered.

### Expected Outcome

- Sidebar includes `Server Settings` only (no standalone `Server Status` entry).
- User can still reach diagnostics/logs by opening `Server Settings -> Advanced / Developer -> Server Status & Logs`.

### Primary Runtime Call Stack

```text
[ENTRY] pages/settings.vue:<template render>()
├── pages/settings.vue:isEmbeddedWindow(computed) [STATE] # reads window node context store
├── pages/settings.vue:activeSection(ref) [STATE]
├── pages/settings.vue:<button @click "server-settings"> [STATE] # sets activeSection = 'server-settings'
└── pages/settings.vue:<ServerSettingsManager v-if="activeSection==='server-settings'"> 
    └── components/settings/ServerSettingsManager.vue:<button @click "Advanced / Developer"> [STATE]
        └── components/settings/ServerSettingsManager.vue:advancedPanel(ref='server-status') [STATE]
            └── components/settings/ServerSettingsManager.vue:<ServerMonitor />
```

### Branching / Fallback Paths

```text
[FALLBACK] if activeSection is not selected yet
pages/settings.vue:<template render>()
└── pages/settings.vue:<empty state block> # unchanged generic placeholder path
```

### State And Data Transformations

- User click intent -> `activeSection` state mutation.
- `activeSection` -> conditional component tree render.

### Observability And Debug Points

- No dedicated logging in this path.
- UI-level validation through `settings.spec.ts` text/render assertions.

### Design Smells / Gaps

- Unnecessary legacy compatibility branch detected? `No`

### Open Questions

- None.

## Use Case 2: Mount-Time Section Resolution Routes Non-Running Embedded Server To Consolidated Section

### Goal

Ensure startup routing no longer targets removed page-level `server-status` section.

### Preconditions

- Settings page mounts.
- Embedded window with server status not `running`, or route query includes section parameter.

### Expected Outcome

- Final active section is always a valid page-level section.
- Non-running embedded server defaults to `server-settings`.

### Primary Runtime Call Stack

```text
[ENTRY] pages/settings.vue:onMounted()
├── pages/settings.vue:useRoute().query.section [STATE]
├── pages/settings.vue:normalizeSection(sectionParam?) [STATE] # maps unsupported/legacy section values
├── pages/settings.vue:activeSection.value = normalizedSection [STATE]
└── pages/settings.vue:if isEmbeddedWindow && serverStore.status !== 'running' [STATE]
    └── pages/settings.vue:activeSection.value = 'server-settings' [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if route query uses removed section value `server-status`
pages/settings.vue:normalizeSection('server-status')
└── pages/settings.vue:return 'server-settings'
```

```text
[ERROR] no runtime exception path expected
pages/settings.vue:onMounted()
└── Implicitly safe due string section normalization and constrained assignments
```

### State And Data Transformations

- Raw query string -> normalized supported section key.
- Server health state (`running` vs non-running) -> final default section selection.

### Observability And Debug Points

- Test assertions inspect setup-state `activeSection` after mount.

### Design Smells / Gaps

- Unnecessary legacy compatibility branch detected? `No` (normalization is single-path consolidation, not duplicate UI retention).

### Open Questions

- None.

## Use Case 3: Remote Window Sanitization Rejects Embedded-Only Sections

### Goal

Prevent remote windows from landing in embedded-only server configuration flows.

### Preconditions

- Window context is remote (`isEmbeddedWindow = false`).
- Section query may request `server-settings` or legacy `server-status`.

### Expected Outcome

- Active section resolves to `api-keys` in remote windows.

### Primary Runtime Call Stack

```text
[ENTRY] pages/settings.vue:onMounted()
├── pages/settings.vue:activeSection.value initialized from route query [STATE]
├── pages/settings.vue:if !isEmbeddedWindow [STATE]
│   └── pages/settings.vue:if section in {'server-settings','server-status'}
│       └── pages/settings.vue:activeSection.value = 'api-keys' [STATE]
└── pages/settings.vue:<template render>()
    └── server-specific menu blocks gated by `v-if="isEmbeddedWindow"`
```

### Branching / Fallback Paths

```text
[FALLBACK] if remote window has no server section query
pages/settings.vue:onMounted()
└── keep requested/default non-server section
```

### State And Data Transformations

- Section query -> remote-safe section.

### Observability And Debug Points

- Existing test checks remote window fallback and hidden embedded-only menu entries.

### Design Smells / Gaps

- Unnecessary legacy compatibility branch detected? `No`

### Open Questions

- None.
