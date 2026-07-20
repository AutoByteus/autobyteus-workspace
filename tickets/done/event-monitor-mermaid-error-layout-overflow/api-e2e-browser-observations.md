# API/E2E Browser Observations

## Run Metadata

- Ticket: `event-monitor-mermaid-error-layout-overflow`
- Commit: `752937fb149196ac98f73776db5545e3a1267256`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow`
- Browser: Google Chrome `150.0.7871.127` at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Node: `v22.23.1`
- Renderer: Nuxt 3.21.1 dev server, task-owned ports 3330/3331
- Viewport for the invalid-render probe: 390x640
- Installed Mermaid: 11.12.3

## Temporary Invalid-Render Browser Journey

The temporary Nuxt page mounted three real `MermaidDiagram` components, including one deliberately long invalid parser input, controls for invalid rerender, unmount/remount, and valid-to-invalid replacement. The Playwright Core probe recorded semantic DOM state, bounding rectangles, document/body dimensions, URLs, requests, console events, screenshots, and cleanup.

Evidence: `api-e2e-r1-invalid-browser/evidence.json` and `api-e2e-r1-invalid-browser/*.png`.

| Scenario | Result | Direct observations |
| --- | --- | --- |
| `MER-E2E-INVALID-001` initial invalid render | Pass | Three local error cards, zero viewer controls, zero SVGs, zero Mermaid-generated IDs outside `#__nuxt`; long parser text was wrapped. Body had 5 children and document/body client/scroll width remained 390/390. Error/message widths stayed within their containing cards. |
| `MER-E2E-INVALID-002` repeated invalid rerender | Pass | Body children, generated-ID inventory, error count, dimensions, URL, and relevant request count remained unchanged after rerender. |
| `MER-E2E-INVALID-003` unmount/remount | Pass | Unmount reduced local errors to zero without changing body children or dimensions; remount restored three local errors with no body leak. |
| `MER-E2E-VALID-001` valid renderer regression | Pass | Three inline SVGs and three existing expand/viewer controls rendered; zero local error cards and no outside-body Mermaid IDs. |
| `MER-E2E-SAFETY-001` valid-to-invalid update | Pass | Invalid state remained local; URL was unchanged, body children stayed at 5, no relevant Mermaid-triggered request was observed. |

Measured invalid initial and final document state was `clientWidth=390`, `scrollWidth=390`, `clientHeight=640`, `scrollHeight=640`, with matching body scroll dimensions. Local error cards had `scrollWidth` no greater than `clientWidth`; the long message reported `overflow-wrap:anywhere` and `word-break:break-word`.

The page emitted expected local `console.error` messages for Mermaid's rejected render promises. It also emitted unrelated application health requests/errors to the intentionally unavailable backend endpoint (`/rest/health`); the probe filtered those background calls and asserted no relevant request caused by Mermaid state changes. The URL remained the temporary local route throughout.

## Valid Viewer Browser Journey

The project-owned `diagram-zoom-viewer-probe.mjs` ran independently on port 3331 and produced 8 passing scenarios (`DZV-BR-001` through `DZV-BR-008). It directly exercised valid inline SVG rendering, viewer opening, focus/dismissal and restoration, HTTP/non-HTTP link forwarding, zoom/pan/fit, source replacement/context return, malformed/missing viewBox fallback, dark contrast, and coarse/hybrid responsive behavior. Evidence is retained in `api-e2e-r1-valid-viewer/evidence.json` and its screenshots.

## Real Vendor Suppression Probe

The installed Mermaid 11.12.3 JSDOM probe compared the vendor default and the current `suppressErrorRendering: true` configuration. The unsuppressed control appended four body children and leaked Mermaid IDs after three rejected renders. The suppressed run caught the rejection while body children stayed at one (`app`) and no generated IDs were leaked. Full output: `api-e2e-r1-real-mermaid-probe.log`.

## Cleanup / Limitations

- The temporary Nuxt page and task-owned dev server were removed/stopped; Playwright browser and contexts were closed.
- No backend, authentication state, database, persistence, or user data was created or modified.
- This proves the shared web renderer in real Chrome, not a packaged Electron launch or Windows browser runtime. Electron repository suites (27 files/119 tests, one existing skip), Electron TypeScript, Nuxt production build, and guards passed separately.
- The exact malformed Mermaid payload from a production report was unavailable; equivalent invalid inputs, including long parser text, were used.
