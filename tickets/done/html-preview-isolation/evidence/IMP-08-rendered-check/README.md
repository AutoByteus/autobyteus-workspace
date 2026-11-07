# IMP-08 — Rendered check of the isolated preview (implementation self-check)

Implementation engineer, 2026-11-07, commit `cdba18ba35`. Implementation-scoped evidence only; it is not
API/E2E sign-off (AC-002…AC-006 still need validation on a worktree build).

What it does:

- `harness-entry.ts`: bundles the **real** `registerWorkspaceRoutes` from
  `autobyteus-server-ts/src/api/rest/workspaces.ts` (worktree source) with esbuild, replacing only
  the workspace manager by `stub-workspace-manager.mjs` (one synthetic workspace `ws-1`). Serves it
  at `http://127.0.0.1:47931/rest`, plus a stand-in "other site" (CDN) on port 47932. Logs the
  `Origin` of every request and the `Content-Security-Policy` of every reply. It has no Origin gate:
  the node's refusal of `Origin: null` (AC-003) is not exercised here.
- `main.cjs`: an Electron app window with the app's webPreferences (preload exposing
  `electronAPI`, `contextIsolation`, `sandbox`, page from `file://`). The page renders the two
  preview sources as `HtmlPreviewer.vue` does at this commit: an iframe with
  `sandbox="allow-scripts"` pointing at the static URL (workspace preview), and one pointing at a
  Blob of the content only (blob preview). It also opens the static URL top-level (AC-005).
- `workspace/report.html`: a synthetic page (QR-002). It reports its origin, inline, relative
  classic and module scripts, an other-site script, relative CSS, a **real** relative image
  (`pixel.png`, 3×3; closes the probe gap R-1 at this layer), `fetch` of a relative file,
  `localStorage`, `parent.document`, `parent.electronAPI` and a call through it.

Run (the scripts expect the harness at `/tmp/hpi-scripts/rendered`; copy this folder there, or edit
`R=` in `run.sh` and the paths in `build-harness.mjs`):

```bash
node /tmp/hpi-scripts/rendered/build-harness.mjs
/tmp/hpi-scripts/rendered/run.sh <out-dir>                       # Electron 42.4.1 (main checkout)
HPI_ELECTRON=<worktree>/autobyteus-web/node_modules/.bin/electron \
  /tmp/hpi-scripts/rendered/run.sh <out-dir>                     # Electron 42.11.16 (pinned)
```

Outputs: `IMP-08-electron-v42.4.1-output.txt`, `IMP-08-electron-v42.11.16-output.txt` (identical
PROBE results), `IMP-08-app-window-electron-v42.11.16.png` (left: workspace preview with red heading
from the relative CSS and the red 3×3 image; right: blob preview, unstyled because a Blob has no base
URL).
