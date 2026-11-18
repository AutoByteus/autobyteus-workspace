# Docs Sync Report

## Scope

- Ticket: `docker-node-publish-needed-ports` (Project Task autobyteus-402, slice S0 of autobyteus-394)
- Trigger: API/E2E Pass (API-REV-001, direct low-risk route)
- Bootstrap base reference: `origin/personal` `6324fb056d`
- Integrated base reference used for docs sync: `origin/personal` `9d8077fd2a`, merged into the ticket branch as `65ebba8291`
- Post-integration verification reference: the launcher suites on `65ebba8291` (`Ran 46 tests` / `OK (skipped=2)`), see the release/deployment report

## Why Docs Were Updated

- Summary: Docker nodes now publish two host ports instead of four: the Backend port on every interface and the VNC Viewer port on `127.0.0.1` only. Container ports 5900 (VNC) and 9223 (Chrome DevTools) are no longer published. Existing nodes are recreated once at `upgrade --all` / `workspace apply`. The implementation commit `2575d870e8` already updated the long-lived docs that describe this. Delivery checked them against the final integrated state and changed nothing more.
- Why this should live in long-lived project docs: users set up Docker nodes from these docs, the launcher help and the in-app Docker Guide. A doc that still listed the VNC or DevTools ports would point users at ports that no longer answer.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `README.md` | Docker node quick start, ports, URLs | No change (updated by implementation) | Two ports, friendly `8001`/`6080`, VNC Viewer "this computer only", 5900/9223 not published, the recreate at `upgrade --all` / `workspace apply` |
| `autobyteus-server-ts/README.md` | Docker section, URLs | No change (updated by implementation) | Same wording as the root README |
| `autobyteus-server-ts/docker/README.md` | The launcher and compose reference | No change (updated by implementation) | Lines 50–60 (ports, recreate), the manual `docker run` example (`-p 127.0.0.1:6080:6080`), the compose endpoints (lines 690–692) |
| `autobyteus-server-ts/docker/.env.example`, `docker-compose.yml`, `docker-start.sh` | Compose ports and output | No change (updated by implementation) | Only `AUTOBYTEUS_BACKEND_PORT` and `AUTOBYTEUS_WEB_VNC_PORT`; `127.0.0.1:` on 6080 |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | In-app Docker Guide copy | No change (updated by implementation) | Rendered in the real app (API-11) |
| `autobyteus-web/docs/settings.md` | Mentions the "AutoByteus VNC Hosts" card | No change | The VNC host setting is out of scope here; slice S1 removes it |
| `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md`, `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Docker nodes and network exposure | No change | They use the Backend URL only. Android access already says not to expose raw Docker ports broadly; this change agrees with it |
| `DESIGN.md` | Project design rules | No change | No new rule. Its design rules and the launcher's config-hash recreate mechanism are unchanged |
| `TESTING.md` | Testing rules | No change | The Docker server node rules and the Fresh-start build rule were followed as written (API-10). No command changed. The missing gated real-Docker launcher suite is a known gap, recorded as an API/E2E residual risk, not a TESTING.md error |
| `RELEASE.md` | Release guide | No change | Its Deployment section names `autobyteus-docker upgrade --all`, which is still correct |
| `GLOSSARY.md` | Terms | No change | No port or VNC term changed |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| None by delivery | — | — | The implementation commit `2575d870e8` updated every affected doc. Delivery found them accurate on the integrated state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Docker node port publishing | Backend on every interface; the VNC Viewer port on `127.0.0.1` only; 5900/9223 not published; a node created by an earlier launcher is recreated once, keeping its ports and volumes | `requirements-doc.md`, `design-spec.md` | `autobyteus-server-ts/docker/README.md`, `README.md`, `autobyteus-server-ts/README.md` (already there) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Published host ports for VNC 5900 and Chrome DevTools 9223; state keys `VNC_PORT`/`DEBUG_PORT` (bash) and `vncPort`/`debugPort` (PowerShell) | Not published; the state keeps only the Backend and VNC Viewer ports | `autobyteus-server-ts/docker/README.md` |
| "noVNC" / "VNC" / "Chrome debug" URLs in launcher output and help | "VNC Viewer: localhost:N (this computer only)" | Launcher help; `autobyteus-server-ts/docker/README.md` |

## No-Impact Decision

Not used. The docs were updated, by the implementation.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, archive, finalization on `personal`
- Notes: wording issue in the ticket's own documents, not in long-lived docs: REQ-003, REQ-006, AC-003 and the design name `autobyteus-docker start`, which the launcher does not have. The long-lived docs and the in-app Guide name `upgrade --all` / `workspace apply`, which are correct; the web specs assert that `autobyteus-docker start` does not appear. Reported to the Solution Designer.
