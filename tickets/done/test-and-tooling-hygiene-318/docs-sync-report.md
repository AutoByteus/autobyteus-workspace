# Docs Sync Report — test-and-tooling-hygiene-318 (autobyteus-318)

## Scope

- Ticket `test-and-tooling-hygiene-318` (Task `autobyteus-318`). `Large` / `Low`, reviewed route.
- Trigger: the Code Reviewer's message after CRR-004 (the FU-004 Local Fix passed: CRR-003, API-REV-002 at 96.5%).
- Integrated base: `origin/personal` `3b9dc912a1`, already contained (merged at `32b8f5a763`). No non-ticket change after API-08's fresh clone at `1e9bab6d4b`.

## Long-Lived Docs Reviewed

| Doc Path | Why | Result | Notes |
| --- | --- | --- | --- |
| `TESTING.md` | web and server type gates; fresh `--output-dir`; Electron binary install | No change (updated by the implementation) | the Server typecheck row now covers `tests/` and `../test-support/`; the Web typecheck row covers the cross-package tests |
| `autobyteus-web/README.md`, `autobyteus-web/docs/electron_packaging.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` | transcription URL removed; build and test notes; stale lines (REQ-007) | No change (updated by the implementation) | `git grep` finds no `transcriptionWsEndpoint`, `TRANSCRIPTION_WS` or `@nuxtjs/apollo` outside tickets and the lockfile |
| `autobyteus-web/README.md` § Diagram Zoom Viewer, `autobyteus-web/docs/content_rendering.md` | the diagram probe now refuses a non-empty `--output-dir` (REQ-014) | **Updated** | both showed the fixed `test-results/diagram-zoom-viewer`, which a second run now refuses |
| other probe examples with `--output-dir` | the six refusing probes: agent-runtimes-settings, diagram-zoom-viewer, embedding-settings, integrations-page, internal-agents, model-routing-settings | No change | only the diagram probe had a fixed-folder example |
| `autobyteus-server-ts/README.md`, `AGENTS.md` | the server `typecheck` command | No change | they point to TESTING.md for its scope |

## Docs Updated

| Doc Path | What Changed | Why |
| --- | --- | --- |
| `autobyteus-web/README.md`, `autobyteus-web/docs/content_rendering.md` | the diagram probe example uses `--output-dir test-results/diagram-zoom-viewer-$(date +%Y%m%dT%H%M%S)`, with one sentence: the directory must be new or empty, because the probe refuses a non-empty one and exits without writing | REQ-014 / AC-014 (`tests/e2e/fixtures/probe-output-dir.mjs`); TESTING.md already says to pass a fresh `--output-dir` |

## Delivery Continuation

- Result: `Pass`. Next: finalization into `origin/personal`. No release.
