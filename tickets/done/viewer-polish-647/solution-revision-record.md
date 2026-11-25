# Solution Revision Record

## SR-001 (2026-11-25)

- Trigger: autobyteus-647 from `/project_task_manager` (the founder's line-number screenshot; 644; 475).
- Status: requirements Approved; design Ready.
- Findings: all six items are still present in the current code (investigation notes).
- Decisions:
  - DEC-001: present iOS's own player screen instead of the app bar;
  - DEC-002: the essential pdf.js build with one shared worker;
  - DEC-003: folding off.
  - All by the Solution Designer within the direction, user informed.
- Classification: `Medium` / `Low`. Routing: direct implementation.

## SR-002 (2026-11-25)

- Trigger: implementation Design Impact DI-001 on D-5 (IMP-003). The escalation trigger "a shared workerPort cannot be reused after a document is destroyed" held.
- Premise corrected: the essential build bundles its own pdf.js; it does not use `pdfjs-dist`.
- Changes:
  - D-5: one long-lived `PDFWorker` wrapper, owned by `sharedPdfWorker.ts` and passed to every document as `worker`;
  - `GlobalWorkerOptions` stays unset;
  - `pdfjs-dist` supplies only the worker script.
- Requirements: unchanged (REQ-005 and AC-005 stand), so no renewed approval is needed.
- Classification: still `Medium` / `Low`, routed to direct implementation.
- Design cases:
  - Case 21 gains this ticket (premise read from a `package.json` rather than the bundle);
  - new Case 31 (a shared resource passed through a library's default path is owned by each consumer's lifecycle).

## SR-003 (2026-11-25)

- Trigger: code reviewer's failure-origin review CRR-001 of API-REV-001 (API-011).
- F-1, Design Impact: D-2 read `Content-Range`. The desktop renderer calls the node cross-origin, and the node exposes no headers, so the header reads `null` and the desktop still showed the 416 error.
  - Confirmed in `node-access-plugin.ts:44` (origin and methods only) and `user-file-reply.ts:53,80-83` (416 to `0-0` only when the size is 0).
  - D-2 now decides on the status of the `bytes=0-0` probe alone; no server change.
  - The web spec models a 416 whose header is unreadable.
- F-2, Requirement Gap: AC-002's "the player shows" cannot hold for a zero-byte file; the players report "could not be played".
  - REQ-002 and AC-002 are restated: no fetch error; the media viewer is reached and reports that the file cannot be played; "not found" is unchanged.
  - The Task's ask ("treat 416 on an empty file as a valid empty file") is kept. Approved by the Solution Designer within the direction, user informed.
- Classification: still `Medium` / `Low`, routed to direct implementation.
- Design case: Case 21 gains this ticket (a premise checked on the same-origin surfaces and a fetch double).
