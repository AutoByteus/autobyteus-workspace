# Handoff Summary — autobyteus-480

## Summary Meta

- Ticket: `markdown-heading-links-480` (Project Task autobyteus-480). A `#heading` link in rendered Markdown opened a 404.
- Date: `2026-11-12`
- Current status: `Complete`. Verified from the evidence and finalized into `origin/personal` (DR-001; the merge and push are in `release-deployment-report.md`). No release.
- Routing: `task_size` `Small`, `architectural_risk` `Low`, route `Direct` (no architecture, code or test-code review, by the team's rules). IR-001; API-REV-001 Pass at 95.9%.
- Archived ticket folder: `tickets/done/markdown-heading-links-480/`

## Delivery Summary

- **Fix (`45e456b8b0`):**
  - `useMarkdownSegments` gives each heading `id="user-content-<GitHub slug>"`, with duplicates numbered (`utils/markdownHeadingAnchors.ts`).
  - `MarkdownRenderer.handleLinkClick` scrolls a `#anchor` to its heading within its own renderer, without a URL change.
  - A missing anchor or a link with no scheme does nothing.
  - These rules run before the external-link rule.
- **Durable tests:** unit tests (`markdownHeadingAnchors.spec.ts`, `MarkdownRenderer.headingLinks.spec.ts`, with a fixture copy of `design-principles.md`) and phone probe cases MSP-44…46 (`mobile-heading-links-cases.mjs`, `524e4f9be7`).
- **Docs:** `autobyteus-web/docs/content_rendering.md` § Heading Links. See `docs-sync-report.md`.

## Verification

- Verified from the evidence; no user check needed. Final confidence 95.9%, no category below 94%.

| AC | Proven by | Result |
| --- | --- | --- |
| AC-001 | API-01; MSP-44/45 | Every one of the 25 anchors matches exactly one rendered heading |
| AC-002 | MSP-44 (desktop Files panel and phone viewer), MSP-45 (Skills page) | 25 of 25 headings reached at offset 0; URL unchanged; 0 new tabs. With the old renderer, MSP-45 fails: 0 of 25, 25 new tabs (API-04) |
| AC-003 | MSP-46 (desktop and phone) | Two messages with the same headings: each link reaches its own message's heading, the other message's stays out of view; Enter works |
| AC-004 | MSP-44/45/46 | Broken anchor, `other.md`, `other.md#x`, `/x.md`, `./x.md`: URL unchanged, no tab, no 404, no scroll |
| AC-005 | MSP-46, API-03 | External link: exactly 1 new tab at its address. `mailto:`: not prevented. File-action cases (MSP-16/17, 28–31, 39–42) pass in the full run of 46 of 46, with 0 unknown browser errors |

## Integration

- The branch already contained `origin/personal` `931a1feeb6`, the base the evidence was tested on. There was nothing to integrate and no rerun needed.

## Accepted Residual Risks

- FU-001: links to other files now do nothing; opening them is a follow-up (DEC-001).
- Not tested: Windows and Linux, and the packaged app, whose external-link handler is unchanged.

## Follow-ups

FU-001 is in `follow-ups.md`, for the Solution Designer to send now that the ticket leaves the team.

## Release

None. Release only on the user's word (handoff), and `RELEASE.md` defaults to none. `release-notes.md` is ready for the next release.
