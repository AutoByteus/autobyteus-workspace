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
