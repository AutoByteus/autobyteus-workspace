# Docs Sync Report — agpl-dual-licensing, Slice 1

Not legal advice. A lawyer should review the licence wording, the §7 permission and the commercial terms (REQ-011).

## Scope

- Ticket: `agpl-dual-licensing`, Slice 1 (licence text). `task_size` Small, `architectural_risk` Low, direct route.
- Trigger: API/E2E Pass API-REV-001; user verification 2026-10-08 ("yes finalize now no need to release a new beta").
- Bootstrap base reference: `origin/personal` @ `a0ded874b`
- Integrated base reference used for docs sync: `origin/personal` @ `c413909e5` (merge `e08be28fb`)
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh

## Why Docs Were Updated

- Summary: The long-lived licence docs are the deliverable of this ticket. Implementation already wrote them (`e1ee19dd3`), and delivery verified them against the integrated state. Delivery made no further doc edits.
- Why this should live in long-lived project docs: the licensing model, component map, release cutoff, commercial contact and §7 permission are public, long-lived statements.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `LICENSING.md` | New canonical licensing doc | No change (already updated by implementation) | Cutoff "up to and including v1.4.97" stays true: the `v1.4.98-beta.1` release was cancelled before anything was published (see release report) |
| `NOTICE` | Attribution/holder | No change (already updated) | Holder `Yu Zheng (AutoByteus)`, confirmed by user (SR-004) |
| `README.md` §License (l.677–693) | Public summary | No change (already updated) | Same cutoff statement, still true |
| `autobyteus-server-ts/docs/modules/secret_management.md:203` | `license` keyword hit | No change | Unrelated ("license to redesign authentication") |
| `autobyteus-web/docs/electron_packaging.md:469` | `license` keyword hit | No change | Refers to upstream third-party licence contents, not the AutoByteus licence. Bundling the licence into the desktop app is Slice 2 (REQ-007) |
| Package `README.md`s / `docs/` under each workspace | Apache/licence claims | No change | `git grep -i apache` outside tickets/third-party finds only README.md l.688–690 (the intended SDK + past-release statements) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (none by delivery) | — | — | The implementation commit `e1ee19dd3` holds the doc changes (LICENSING.md new, NOTICE, README §License) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Licensing model & component map | AGPL-3.0-only + commercial; SDK/devkit/contracts/samples Apache-2.0 | design-spec.md, requirements-doc.md DEC-001/002 | `LICENSING.md` (done by implementation) |
| Dependency compatibility (REQ-009) | One proprietary item, the Claude Agent SDK, handled via the §7 permission. Everything else is compatible | investigation-notes.md §Third-party dependency compatibility | Delivery report (REQ-009 asks for the delivery result). Kept in the archived ticket |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Apache-2.0 for the whole workspace; README "Commercial use and modification are allowed" | AGPL-3.0-only + commercial for product components | `LICENSING.md`, `README.md` §License, `NOTICE` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive ticket, finalize into `personal`, verify GitHub licence detection.
- Notes: Slice 2 (REQ-007 licence in binaries/Docker + About line, REQ-008 CONTRIBUTING/CLA, REQ-010 automated checker) is still open. It will update `electron_packaging.md`/Docker docs when implemented.
