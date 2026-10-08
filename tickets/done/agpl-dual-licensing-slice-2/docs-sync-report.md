# Docs Sync Report — agpl-dual-licensing, Slice 2

Not legal advice. A lawyer should review `CLA.md` and the licence wording (REQ-011).

## Scope

- Ticket: `agpl-dual-licensing-slice-2` (package `agpl-dual-licensing`, Slice 2). `task_size` Medium, `architectural_risk` Low, direct route.
- Trigger: API/E2E Pass API-REV-001 (validated `411bac9c9`).
- Bootstrap base reference: `origin/personal` @ `714c41324`
- Integrated base reference used for docs sync: `origin/personal` @ `714c41324` (branch already current, fetched 2026-10-08)
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh

## Why Docs Were Updated

- Summary: Slice 2 adds product licence files and a copyright string to the desktop app, licence files and an OCI label to the Docker images, and a licensing release gate to the four release workflows. The implementation already updated the user-facing docs (README, LICENSING.md, CONTRIBUTING.md, CLA.md, PR template). The packaging and Docker reference docs did not yet describe the new resources, copyright string, label or gate.
- Why this should live in long-lived project docs: future packaging or Docker changes must keep the licence files and the gate. Without docs, someone could drop them unknowingly.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `README.md` | Licence section, contribution pointer, release gates | No change (implementation already updated) | l.587 documents `check_licensing.py` as a mandatory release gate. Includes the CONTRIBUTING/CLA pointer |
| `LICENSING.md` | CLA pointer | No change (implementation already updated) | v1.4.97 cutoff unchanged (SR-006) |
| `CONTRIBUTING.md`, `CLA.md`, `.github/pull_request_template.md` | New contribution/CLA docs | No change (new, validated by C-07) | Manual acceptance per SR-004 |
| `autobyteus-web/docs/electron_packaging.md` | Canonical desktop packaging doc; documents `extraResources` | **Updated** | — |
| `autobyteus-server-ts/docker/README.md` | Canonical Docker/release-automation doc | **Updated** | — |
| `autobyteus-android/README.md`, `docs/ios_mobile_access.md` | Release workflows now run the gate | No change | These docs do not describe workflow steps. The root README is the single place for release gates |
| `autobyteus-message-gateway` docs | Runtime package now carries licence files | No change | The gateway is not shipped from the workspace on base (UD-001). Its code-level comment in `build-runtime-package.mjs` is sufficient |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Config example + new subsection | Added `copyright: PRODUCT_COPYRIGHT` and `...PRODUCT_LICENSE_EXTRA_RESOURCES` (and the existing `ISOLATED_LAUNCH_MARKER_EXTRA_RESOURCE`) to the electron-builder example. New "Product Licence Packaging" subsection covers the three resources, the About/LegalCopyright string, the preflight, the integration test and the release gate | The packaged app now has new required resources and a copyright contract |
| `autobyteus-server-ts/docker/README.md` | GitHub Release Automation bullets | Added the licensing gate step, and the `/app` licence files plus OCI label in the runtime image(s) | The release workflow and image contents changed |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Desktop licence packaging | Which files ship, where, which constant owns them, and that the About panel must not be overridden | design-spec.md (REQ-007) | `autobyteus-web/docs/electron_packaging.md` |
| Docker licence files + label | `/app/{LICENSE,LICENSING.md,NOTICE}` + `org.opencontainers.image.licenses=AGPL-3.0-only` | design-spec.md (REQ-007) | `autobyteus-server-ts/docker/README.md` |
| Licensing release gate | `scripts/check_licensing.py` runs before builds in all four release workflows | design-spec.md (REQ-010) | `README.md` (implementation), `autobyteus-server-ts/docker/README.md`, `electron_packaging.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| None removed | — | — |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary → user verification hold. No release (per solution handoff).
- Notes: UD-001 (gateway still listed in REQ-007 but not shipped from the workspace) and UD-002 (`Dockerfile.remote-server`/`Dockerfile.allinone` builder fails on base) pre-exist. They are recorded for the Solution Designer. The docs describe what the Dockerfiles declare, not that those two images currently build.
