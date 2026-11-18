# Docs Sync Report — autobyteus-355 (release-guide-notes-and-grok-smoke)

## Scope

- Ticket: autobyteus-355, RELEASE.md beta user-action notes and the per-runtime live model check with a Grok fallback.
- Trigger: API/E2E Pass (API-REV-001, 95%), direct route (`Small` / `Low`); test-code review `Not Required`.
- Bootstrap base reference: `origin/personal` @ `efd28d5c4a`
- Integrated base reference used for docs sync: `origin/personal` @ `efd28d5c4a` (not advanced; already current)
- Post-integration verification reference: `evidence/DEL-01-delivery-checks.log`

## Why Docs Were Updated

- The ticket's subject is RELEASE.md itself. Implementation added the beta user-action rule, the subsection "Beta notes with a user action" and the template's optional `## What you need to do`. Delivery tightened one command, fixed a link label, and documented the smoke check's new model behavior, which RELEASE.md did not describe.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `RELEASE.md` Release Decision (Beta) | New sentence pointing to the subsection | No change | — |
| `RELEASE.md` "Beta notes with a user action" | New subsection | Updated | Step 2 now uses `git log --merges --first-parent <previous-tag>..HEAD`. The plain form also lists the tickets' base-refresh merges: for `v1.5.11-beta.8..v1.5.11-beta.9`, 3 merges versus 2 ticket merges (API/E2E's note, rechecked) |
| `RELEASE.md` Workflow Reference (release notes) | Pre-release sentence added by implementation | Updated | Link label read "Cutting The Release" but pointed to the new subsection; now "Beta notes with a user action" |
| `RELEASE.md` "Release smoke check" | The live suite's model behavior changed | Updated | New **Models** bullet: per-runtime model check; Grok falls back to the first offered model when `grok-4.7` is not offered, and the summary says so; an override requires exactly that model |
| `.github/release-notes/template.md` | Optional `## What you need to do` | No change | — |
| `scripts/release_smoke.py` docstring | Runner contract | No change | Already states the per-runtime failure scope (implementation) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `RELEASE.md` | Command | Step 2 lists ticket merges with `--merges --first-parent` | Accuracy (base-refresh merges are not tickets) |
| `RELEASE.md` | Link label | "Beta notes with a user action" | The label named another section |
| `RELEASE.md` | Release smoke check | **Models** bullet | Durable runtime knowledge: the check no longer stops all live runtimes for one model miss, and Grok's model can differ from the pin |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source | Target |
| --- | --- | --- | --- |
| Beta user actions | When a beta carries `## What you need to do`, and the exact `gh release edit` steps after the four workflows | requirements REQ-001/002, DEC-001 | `RELEASE.md` (implementation, tightened by delivery) |
| Live model choice | Per-runtime check; Grok fallback; strict overrides | REQ-003..005, DEC-002/003 | `RELEASE.md` Release smoke check (delivery) |

## Removed / Replaced Components Recorded

| Old | Replaced By | Documented In |
| --- | --- | --- |
| One setup check of all live runtimes' pins (one miss stops all) | One `beforeAll` per runtime group with `chooseLiveModel` | `RELEASE.md` Release smoke check; the test's header comment |
| Betas' user actions added by hand as a recorded deviation | The guide's "Beta notes with a user action" steps | `RELEASE.md` |

## Delivery Continuation

- Result: `Pass`. Next: finalize into `personal` (no release; out of scope by the requirements).
