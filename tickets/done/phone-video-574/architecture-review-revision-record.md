# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-11-24) | SR-001 | N/A | Fail (Design Impact) | AR-001 |
| ARCH-REV-002 | Round 2 / Design revised SR-002 (2026-11-24) | SR-002 | Fail | Pass | AR-001 (resolved) |

## Revision Entries

### ARCH-REV-001 — Baseline review: the file reply needs an explicit freshness rule

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574/tickets/in-progress/phone-video-574/design-review-report.md`
- Review round and trigger: round 1; `handoff-architecture-design-complete.md` (branch at `d807dc6756`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-001; N/A.
- Relevant solution revision IDs: SR-001.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result or what baseline was established: baseline.
  - The architecture passes:
    - native players and the per-playback credential over the origin- and main-frame-bound bridges (verified, no body logging);
    - the data contract with measured prototypes;
    - `sendUserFile` as the one Range owner;
    - ETag-keyed bounded caches with per-node deletion;
    - Android WebView fullscreen;
    - the classification (Large / High).
  - AR-001: D-1 adds `ETag` and `Last-Modified` with no `Cache-Control` to every `kind: 'file'` reply. Chromium then treats a reply as fresh for a while, and the desktop loads these URLs directly in elements, so a file an agent rewrote can show stale (MP-001; AC-006).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001.
- Material classification changes: None.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: N-1 (refuse redirects off the node's origin), N-2 (multi-range → 200), N-3 (iOS range cache not prototyped), N-4 (hash cache file names); rule 12.

### ARCH-REV-002 — Explicit freshness on file replies: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574/tickets/in-progress/phone-video-574/design-review-report.md`
- Review round and trigger: round 2; SR-002 (committed at `c262064727`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` and `requirements-doc.md` at SR-002; AR-001.
- Relevant solution revision IDs: SR-002.
- Prior authoritative decision: Fail (ARCH-REV-001).
- Current authoritative decision: Pass.
- What changed in the review result:
  - AR-001 resolved:
    - `Cache-Control: no-cache` on `kind: 'file'` replies (`no-store` routes keep theirs);
    - `Last-Modified` dropped (no reader);
    - the desktop, browser and WebView HTTP caches listed with their walk (rewrite → 200 new bytes; unchanged → 304);
    - REQ-005 and AC-005 assert the header and a never-stale reopen.
  - N-1 (redirects refused off the node's origin on both players, with unit cases), N-2 (multi-range → 200), N-3 (iOS range cache tests named) and N-4 (hashed cache file names) are adopted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-002 design-spec Data Contract (`Cache-Control` row, derived consumers walk), REQ-005, AC-005 | Read at `c262064727` |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: the iOS range cache (own code, not prototyped; tests named); iOS forced landscape (`requestGeometryUpdate`); rule 12 for Gradle and `project.yml`.
