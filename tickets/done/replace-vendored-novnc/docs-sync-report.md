# Docs Sync Report

## Scope

- Ticket: `replace-vendored-novnc`
- Trigger: Delivery resumed after the MPL-2.0 notice packaging correction passed implementation source review, authoritative API/E2E revalidation, and proportional durable-test review.
- Bootstrap base reference: `origin/personal` at `dbc83fdb51c1e158b5707c219dd8574dc49fa493`
- Integrated base reference used for docs sync: `origin/personal` at `dbc83fdb51c1e158b5707c219dd8574dc49fa493`; refreshed on 2026-07-18 and unchanged, so the ticket branch required no merge/rebase.
- Post-integration verification reference: Reviewed ticket HEAD `ba703f842d79dfab03f4c15add73396acdc247a9`; delivery contract log `probes/delivery/novnc-package-contract.log`; actual macOS package build log `probes/delivery/build-electron-mac.log`; packaged-notice proof `probes/delivery/packaged-notice-verification.log`.

## Why Docs Were Updated

- Summary: Documented the official package-root noVNC provider, the deliberate exact development-build pin, canonical third-party notice ownership, mode-specific Nuxt output paths, Electron preflight/resource mapping, and the atomic upgrade checklist.
- Why this should live in long-lived project docs: These are persistent frontend/desktop packaging invariants. Future dependency or Electron-build work must not silently downgrade clipboard behavior, reintroduce a vendored/deep provider path, leave the ambient declaration stale, or omit/update only one of the three distributable notice projections.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Canonical desktop build/resource lifecycle and upgrade guidance | Updated | Added the noVNC runtime/notice packaging contract and atomic provider-upgrade checklist; updated the configuration example with the canonical extra resource. |
| `autobyteus-web/AGENTS.md` | Frontend developer/release/testing guide and documentation catalog | No change | It already links the Electron packaging guide and accurately describes the build/release paths; duplicating the detailed noVNC invariant here would create drift. |
| `autobyteus-web/README.md` | General setup, web/Electron build commands, and testing guide | No change | Existing commands remain accurate. Exact provider/license lifecycle belongs in the specialized Electron packaging guide. |
| `autobyteus-web/ARCHITECTURE.md` | High-level concern map and testing strategy | No change | The application VNC/session architecture and user-facing ownership did not change; provider/notice mechanics are below this document's abstraction level. |
| `autobyteus-web/public/THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt` | Canonical long-lived distributable legal/provenance record | No change | The reviewed implementation correction already contains exact package/commit/source provenance, upstream notice, MPL-2.0 text, and embedded pako license. Delivery verified its bytes in final package artifacts. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Durable developer/build documentation | Added official package-root dependency/pin rationale, canonical notice paths, web/Electron/desktop projections, build preflight/resource ownership, and an atomic upgrade checklist. | Prevents future provider, type, behavior, and license packaging drift. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| noVNC provider ownership | AutoByteus imports the official `@novnc/novnc` package root and does not own a copied provider tree, deep import, patch, or fallback. | `requirements.md`, `proposed-design.md`, `implementation-handoff.md` | `autobyteus-web/docs/electron_packaging.md` |
| Exact version and clipboard behavior | `1.7.0-g7c36fab` is deliberately exact because stable `1.7.0` lacks the selected automatic asynchronous clipboard path. A newer/stable upgrade requires behavior proof or explicit redesign. | `upstream-novnc-evaluation.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-web/docs/electron_packaging.md` |
| License/notice distribution | One canonical versioned notice must be copied to generic web, Electron renderer, and packaged application outputs; Electron preflight and extra-resource mapping have separate owned responsibilities. | `delivery-reroute-report.md`, `implementation-handoff.md`, `code-review-report.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-web/docs/electron_packaging.md` |
| Atomic upgrade rule | Manifest/lock, runtime behavior, ambient types, versioned notice/provenance, all output mappings, contract tests, and build/package validation move together. | `proposed-design.md`, `api-e2e-test-review-report.md` | `autobyteus-web/docs/electron_packaging.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-web/lib/novnc/**` copied upstream source tree | Exact official `@novnc/novnc@1.7.0-g7c36fab` package-root provider plus a narrow application-owned ambient type declaration | `autobyteus-web/docs/electron_packaging.md`; `autobyteus-web/package.json`; `autobyteus-web/types/novnc.d.ts` |
| Implicit/missing distributable provider attribution | Versioned canonical third-party notice with explicit generic web, Electron renderer, and packaged application projections | `autobyteus-web/docs/electron_packaging.md`; `autobyteus-web/public/THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs now match the current integrated, reviewed, API/E2E-passed, and actually packaged candidate. Delivery may prepare the user-verification hold; archival, commit/push, target merge, and any release remain prohibited until explicit user verification.
