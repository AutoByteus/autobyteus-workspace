# Docs Sync Report

## Scope

- Ticket: `fix-vnc-browser-bridge-recursion`
- Trigger: Delivery-stage docs sync after post-API/E2E coverage-code re-review passed.
- Bootstrap base reference: `origin/personal` at `4f3ddc4d5dcaa4cf98195143a8abe04906259124`
- Integrated base reference used for docs sync: `origin/personal` at `45442c8a771b4c90db323e52bf6a69d20fcb7291` after `git fetch origin personal` on 2026-07-09 and merge into `codex/fix-vnc-browser-bridge-recursion`.
- Post-integration verification reference: local checkpoint commit `bd276a250d54746c6bbf28f550b6889c4ced6d3c`; integration merge commit `e181f449d4bfd69ec7d14759194812ea37e7b2a5`; post-merge executable checks passed on 2026-07-09.

## Why Docs Were Updated

- Summary: The server Docker README now documents the root-to-VNC browser-opening bridge used by browser-opening CLI auth flows. It records that the image sets `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`, that the helper switches to `vncuser` only from root, skips `runuser` when already running as `vncuser`, clears inherited `BROWSER`, and dispatches to `/usr/bin/xdg-open` inside the VNC desktop session.
- Why this should live in long-lived project docs: The CLI auth model already documents how users log in to bundled CLIs inside the root-running Docker container. The browser bridge is durable runtime behavior users and future maintainers need to understand when CLI device-login flows open browser URLs through noVNC/Chromium and when rebuilt images are required to receive bridge script changes.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/README.md` | Canonical server Docker user/operator documentation, including CLI auth model, launcher/source-helper behavior, and release image refresh guidance. | Updated | Added the browser-opening auth bridge contract under CLI Auth Model. |
| `autobyteus-server-ts/README.md` | Top-level server Docker quick-start documentation that links to the Docker README. | No change | It already delegates detailed Docker behavior to `autobyteus-server-ts/docker/README.md`; duplicating bridge internals here would be too low-level. |
| `autobyteus-web/docs/browser_sessions.md` | Browser-session docs surfaced by grep for browser bridge terminology. | No change | This document covers Electron/browser tool sessions, not the server Docker root-to-VNC CLI opener bridge. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Agent tool/browser bridge documentation surfaced by grep. | No change | Existing text describes Electron Browser bridge environment resolution, not server Docker shell CLI URL opener behavior. |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Runtime packaging source for the bridge scripts and `BROWSER` env. | No change | Source already matched the final implementation and is covered by durable tests; it is source truth, not prose docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/README.md` | Docker runtime/auth documentation | Added a paragraph explaining the packaged VNC browser bridge for browser-opening auth commands, including uid-aware switching, `BROWSER` sanitization, `/usr/bin/xdg-open` dispatch, noVNC/Chromium routing, and recreate/upgrade requirement for rebuilt script changes. | Preserve the durable operational behavior behind CLI device-login browser opens and avoid future confusion about root shell auth commands, `runuser`, and inherited `BROWSER` recursion. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Root-to-VNC CLI browser bridge | Root-running CLI auth commands use the packaged `$BROWSER` helper to open URLs in the VNC Chromium session. | `requirements.md`, `investigation-notes.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docker/README.md` |
| Recursion prevention invariant | The opener must switch to `vncuser` only from root, skip `runuser` when already `vncuser`, clear inherited `BROWSER`, and call `/usr/bin/xdg-open` instead of the root bridge. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `code-review-report.md` | `autobyteus-server-ts/docker/README.md` |
| Image refresh implication | Existing containers need recreate/upgrade from a rebuilt image before they receive browser-bridge script changes. | `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docker/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Unconditional top-level `runuser -u vncuser -- env ... xdg-open` opener behavior | Uid-aware opener branch that switches only from root, runs directly as `vncuser` when already there, clears `BROWSER`, and dispatches to `/usr/bin/xdg-open`. | `autobyteus-server-ts/docker/README.md`; source truth in `autobyteus-server-ts/docker/open-vnc-browser-url.sh` |
| Inherited `$BROWSER` fallback that can re-enter `/usr/local/bin/open-vnc-browser-url.sh` | Sanitized child opener environment with `BROWSER=` before desktop opener dispatch. | `autobyteus-server-ts/docker/README.md`; durable coverage in `scripts/tests/test_server_docker_browser_bridge.py` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs updated`
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Delivery-stage refresh found `origin/personal` had advanced by three commits. A local checkpoint commit preserved the reviewed implementation before merging the latest base. Post-integration focused checks passed, and docs sync completed against the integrated branch state.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
