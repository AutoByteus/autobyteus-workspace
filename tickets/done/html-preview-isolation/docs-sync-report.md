# Docs Sync Report — html-preview-isolation (autobyteus-417)

## Scope

- Ticket: `html-preview-isolation`, Project Task `autobyteus-417`. Classification: `task_size=Small`, `architectural_risk=High`, reviewed route.
- Trigger: code reviewer handoff after API/E2E Pass (API-REV-001, 95.4%) and test-code review CRR-002 (`Not Applicable`, no repository test code changed).
- Bootstrap base reference: `origin/personal` @ `ff68bfb5fa`
- Integrated base reference used for docs sync: `origin/personal` @ `c35d9dea11`, merged into the ticket branch as `1d8ecc9a79`
- Post-integration verification reference: `1d8ecc9a79` (DEL-01, `evidence/delivery/DEL-01-merged-state-checks.log`)

## Why Docs Were Updated

- Summary: the source commit `cdba18ba35` already updated the web docs (`file_explorer.md` HTML Preview Resource Contract, `content_rendering.md` HTML Preview Source Selection): the preview's isolation and what previewed pages can and cannot do. API-16 matched them against the measured losses. Delivery added one thing, the server-side invariant: the workspace static route's `Content-Security-Policy: sandbox allow-scripts` header, documented where the server route lives.
- Why this should live in long-lived project docs: the header is a security boundary on a node route. A developer editing `src/api/rest/workspaces.ts` reads the server module docs, not the web File Explorer doc. Without the note, removing the header or adding `allow-same-origin` looks harmless. Removing it would let a workspace page opened top-level run at the node's origin with full rights.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/file_explorer.md` | Owner of the HTML Preview Resource Contract | No change (updated in `cdba18ba35`) | States `sandbox="allow-scripts"` only, opaque origin, the CSP header, and the approved losses; matches API-10/14/16 |
| `autobyteus-web/docs/content_rendering.md` | HTML preview source selection | No change (updated in `cdba18ba35`) | Matches the code; the removed `<base>` is reflected ("The Blob holds the content only and has no base URL") |
| `autobyteus-web/docs/agent_artifacts.md` | Mentions mobile disabling rich HTML preview | No change | Mobile reference behavior unchanged by this ticket |
| `autobyteus-server-ts/docs/modules/workspaces.md` | Lists `src/api/rest/workspaces.ts`, the changed route | Updated | New section "Workspace Static Route (HTML Preview)" |
| `autobyteus-server-ts/docs/features/remote_access.md` | The Origin rule that refuses the preview's `Origin: null` | No change | Already states `Origin: null` is refused (line 34); the rule is unchanged |
| `DESIGN.md` | Project design rules | No change | No new convention; design spec recorded no discrepancy |
| `TESTING.md` | Project testing guideline | No change | API/E2E and code review recorded no discrepancy; the test layers used already exist |
| `RELEASE.md` | Project release guide | No change | Followed as written; no deviation found (release/deployment report) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/workspaces.md` | New section | "Workspace Static Route (HTML Preview)": the route's only consumer is the preview; every served file carries `Content-Security-Policy: sandbox allow-scripts`, so the page has origin `null` wherever opened; the node refuses its requests; do not remove the header or add `allow-same-origin`; error replies and `/content` do not send it; links to the web contract | Record the server half of the boundary in the server's docs |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Preview isolation, client side | Preview iframe is `sandbox="allow-scripts"` only; Blob holds content only | `design-spec.md` DS-001/002; `cdba18ba35` | `autobyteus-web/docs/file_explorer.md`, `content_rendering.md` (source commit) |
| Preview isolation, server side | Static route CSP sandbox header and why it must stay | `design-spec.md`; API-14 | `autobyteus-server-ts/docs/modules/workspaces.md` (delivery) |
| Approved losses (DEC-001) | Relative module scripts, fetch/XHR of workspace files, workspace web fonts, Web Workers, browser storage and cookies are unavailable | `requirements-doc.md` DEC-001, AC-007; API-10, API-16 | `file_explorer.md` (source commit); `release-notes.md` (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `allow-same-origin` on the preview iframe | `sandbox="allow-scripts"` only | `file_explorer.md` HTML Preview Resource Contract |
| `<base href="<app origin>/">` prepended to Blob previews | Nothing; the Blob holds the content only | `file_explorer.md`, `content_rendering.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A (docs updated)
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, archive and finalize.
- Notes: The SR-004 rewording of BEH-005 / REQ-004 / AC-004 is a ticket-document matter. The long-lived docs make no claim about whether the workspace preview reloads, so the API-13 finding changes no long-lived doc. It goes to the Solution Designer in the terminal message.
