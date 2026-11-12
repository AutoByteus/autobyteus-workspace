# Docs Sync Report — autobyteus-480

## Scope

- Ticket: autobyteus-480. A `#heading` link in rendered Markdown opened a 404; it now scrolls to its heading.
- Trigger: delivery DR-001, after API/E2E's Pass (API-REV-001). Direct route (Small / Low).
- Bootstrap base reference: `origin/personal` `931a1feeb6`.
- Integrated base reference used for docs sync: the same. The branch was current; nothing to integrate.
- Post-integration verification reference: `release-deployment-report.md`.

## Why Docs Were Updated

- Summary: rendered headings now carry GitHub-style ids. The click owner has two new rules: a same-document anchor scrolls within its own renderer, and a link with no scheme does nothing. `content_rendering.md` described Markdown rendering and link handling without them.
- Why this should live in long-lived project docs:
  - The id prefix, the per-renderer lookup and "no URL change" are constraints any later link work must keep.
  - The rule order (before the external-link rule) is what fixes the bug.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/content_rendering.md` | Owns Markdown rendering and link handling | Updated | New "Heading Links" section and a Features line |
| `autobyteus-web/docs/remote_access.md` | Phone viewer | No change | It defers rendering to the shared renderer |
| `DESIGN.md` | Project design rules | No change | No new rule |
| `TESTING.md` | Testing guideline | No change | The phone-probe rule applied |
| `RELEASE.md` | Release guide | No change | Its steps matched |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/content_rendering.md` | Addition | Heading ids (`user-content-` + GitHub slug, numbered duplicates). Click rules: per-renderer lookup, no URL change, missing anchor does nothing, schemeless links do nothing (FU-001), order before external links, `mailto:` and file actions unchanged | New behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Heading anchors | GitHub's slug rule as an own function; ids prefixed; anchors resolved within one renderer; the hash router forbids URL fragments | `design-spec.md` DS-001, DS-002; `requirements-doc.md` DEC-002, DEC-003 | `content_rendering.md` |

## Removed / Replaced Components Recorded

None.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then finalization.
