# Docs Sync

## Scope

- Ticket: `upgrade-electron-latest-stable`
- Trigger Stage: `9`
- Workflow state source: `tickets/in-progress/upgrade-electron-latest-stable/workflow-state.md`

## Why Docs Were Updated

- Summary: Promoted the Electron 42.4.1 runtime baseline, canonical workspace lockfile expectation, direct native-module rebuild dependency, and desktop package validation expectations into long-lived project docs.
- Why this change matters to long-lived project understanding: Electron 38 -> 42 is a major runtime upgrade that changes Chromium, Node.js, native-module ABI, packaging, and updater behavior together; future desktop release work needs durable guidance instead of relying on ticket-local notes.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Canonical desktop packaging/server-management document that already describes Electron packaging, native module rebuilds, macOS signing, packaged terminal runtime validation, and updater recovery expectations. | `Updated` | Added Electron runtime baseline, root-lockfile guidance, package metadata/app bundle validation expectations, and direct `@electron/rebuild`/no-`pnpm dlx` rebuild policy. |
| `README.md` | Root release workflow summary used as the quick checklist for desktop release readiness. | `Updated` | Added high-level Electron runtime baseline validation requirement alongside version/tag sync, artifact hygiene, terminal runtime validation, and macOS signing validation. |
| `.github/workflows/release-desktop.yml` | Desktop release workflow that executes packaging and release validation. | `No change` | Existing build/test/signing workflow remains accurate; this ticket changed dependency/runtime inputs and docs, not CI workflow steps. |
| `autobyteus-web/docs/terminal.md` | Terminal/runtime doc mentions packaged macOS `node-pty` helper behavior. | `No change` | Existing terminal runtime behavior remains accurate; native rebuild dependency details belong in `electron_packaging.md`. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Runtime baseline and packaging-operation guidance | Documented exact `electron@42.4.1` baseline, root `pnpm-lock.yaml` canonical lockfile, removal of package-local lockfile, metadata/app-bundle validation, native-module rebuild expectations, and direct `@electron/rebuild` CLI policy with no `pnpm dlx` fallback. | Future Electron upgrades must be treated as reviewed runtime upgrades, not only minimum fixed-version bumps. |
| `README.md` | Release workflow checklist | Added mandatory desktop Electron runtime baseline validation summary. | Keeps top-level release guidance aligned with the Electron major-upgrade validation requirements. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Electron runtime baseline | Desktop Electron is pinned exactly to the reviewed stable version; future baseline changes must update manifest and root lock together and validate installed/package metadata. | `requirements.md`, `proposed-design.md`, `implementation.md`, `api-e2e-testing.md` | `autobyteus-web/docs/electron_packaging.md`, `README.md` |
| Native module rebuild ownership | `prepare-server` scripts rely on the workspace-provided `@electron/rebuild` dependency via the `electron-rebuild` CLI and should fail if that CLI is missing instead of installing an ad-hoc fallback. | `proposed-design.md`, `future-state-runtime-call-stack.md`, `implementation.md`, `code-review.md` | `autobyteus-web/docs/electron_packaging.md` |
| Workspace lockfile source of truth | Root `pnpm-lock.yaml` is canonical for this workspace; stale `autobyteus-web/pnpm-lock.yaml` should not be regenerated. | `requirements.md`, `implementation.md`, `api-e2e-testing.md` | `autobyteus-web/docs/electron_packaging.md`, `README.md` |
| Desktop package validation | Electron major upgrades require native rebuild evidence, focused Electron tests, and at least one desktop package smoke build before release-readiness claims. | `api-e2e-testing.md`, `code-review.md`, logs under `tickets/in-progress/upgrade-electron-latest-stable/logs/` | `autobyteus-web/docs/electron_packaging.md`, `README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Direct `electron-rebuild@3.2.9` dependency | Direct `@electron/rebuild@4.0.4`, still invoked through the `electron-rebuild` CLI | `autobyteus-web/docs/electron_packaging.md` |
| `pnpm dlx electron-rebuild` fallback in server-preparation scripts | Fail-fast use of the workspace-provided `electron-rebuild` CLI | `autobyteus-web/docs/electron_packaging.md` |
| Package-local `autobyteus-web/pnpm-lock.yaml` as a possible stale lockfile source | Root workspace `pnpm-lock.yaml` as canonical lockfile | `autobyteus-web/docs/electron_packaging.md`, `README.md` |
| Minimum-fixed-version framing for the ShipIt-related Electron issue | Latest reviewed stable Electron runtime baseline with major-upgrade validation | `autobyteus-web/docs/electron_packaging.md`, `README.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale: Docs were updated.
- Why existing long-lived docs already remain accurate: `N/A`

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed: Keep release-time signed macOS signing verification in `.github/workflows/release-desktop.yml`; unsigned local package smoke evidence does not replace the signed release verifier.
