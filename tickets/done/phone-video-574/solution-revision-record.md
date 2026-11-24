# Solution Revision Record

## SR-001 (2026-11-24)

- Trigger: autobyteus-574 (absorbs autobyteus-636) from `/project_task_manager`, with the founder's screenshots (the re-download; a disabled fullscreen button).
- Prior status: N/A. Current status: requirements Approved.
- Findings (Measured with prototypes):
  - Service workers cannot serve iOS apps on user-chosen node addresses, and need `https`.
  - Android WebView interception fails on seek.
  - Native players stream, seek and cache with the credential only in a header (Android Media3; iOS AVPlayer with a resource loader).
- Approval: the user ("I trust your recommended solutions"): DEC-001 (b), the native player; DEC-002 (a), the per-playback credential handoff. DEC-003…005 are the Solution Designer's.
- Next: architecture design.

## SR-001 design (2026-11-24)

- Design: D-1…D-7, with the data contract first and validated.
- Classification: `Large` / `High`. Routing: architecture review.
- Follow-ups: FU-001, FU-002.

## SR-002 (2026-11-24)

- Trigger: ARCH-REV-001 Fail.
  - AR-001: no freshness rule, so a desktop or browser HTTP cache could show a rewritten file stale.
  - N-1…N-4.
- Design: file replies send `Cache-Control: no-cache` (routes with `no-store` keep it); `Last-Modified` is dropped (no reader); the HTTP caches are walked as derived consumers; redirects off the node's origin are refused by both players; a multi-range request gets 200; hashed cache file names; the iOS range cache's risk and tests are named.
- Requirements: REQ-005 and AC-005 made precise (revalidation, multi-range, never stale). The intent is unchanged (the existing behavior already shows new bytes), so this is editorial within the approval.
- Classification: unchanged, `Large` / `High`. Routing: architecture review.
- Design case: docs/design-cases.md Case 3 (an HTTP cache as a reader of a changed reply).

Review note: ARCH-REV-002 passed SR-002 (2026-11-24). The reviewer routed it to `/implementation_engineer`.

Evidence decision (2026-11-24): DEC-006, AC-001's media-message entry accepted as low-risk unverified (option a). API/E2E's request; the `/rest/files/` URL form was established by Read. Routed to `/api_e2e_engineer`.
