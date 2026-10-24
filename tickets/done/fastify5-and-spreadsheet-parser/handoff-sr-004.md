# Handoff — SR-004, Architecture Design Complete (revision after ARCH-REV-001)

- Package: `fastify5-and-spreadsheet-parser` (autobyteus-248 + autobyteus-249)
- From: Solution Designer, 2026-10-24
- Result: `Architecture Design Complete` (revised). `task_size` Medium, `architectural_risk` High (unchanged)
- Route: handoff rule "architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`, for a narrow re-review of the viewer delta (DS-006). DS-001..DS-005 are unchanged since SR-003.
- Requested by: `/project_task_manager`
- Workspace:
  - worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser`
  - branch: `codex/fastify5-and-spreadsheet-parser`
  - base: `origin/personal` @ `ddd6fdcdf6`
  - finalization target: `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/in-progress/fastify5-and-spreadsheet-parser/` (not committed; no source changes)

## Resolution of ARCH-REV-001

### AR-001 (Requirement Gap): hyperlinked cells

The premise is reproduced (`evidence/SD-09`, `probes/sheetjs-hyperlink.cjs`), and it goes further than the review stated: both 0.18.5 and 0.20.3 emit `<a href="javascript:…">` for a crafted hyperlink target, so on base a click runs script in the app.

What links do on base (read):
- **Look:** they already look like the cell text, because Tailwind preflight makes `a` inherit colour and decoration.
- **Desktop click:** does nothing. `workspace-shell-window.ts` L52-59 prevents navigation and denies `window.open`.
- **Phone tap:** navigates the app's tab away.

**DEC-008 = (a):** a hyperlinked cell shows its text without a link. The Solution Designer decided this within the direction and informed the user. Nothing that works today stops working, and it removes a script-execution path. Opening links in the system browser would be new behavior, recorded as FU-005.

Changes:
- Requirements: BEH-007, REQ-010, REQ-011 and AC-013 are aligned. AC-013 now includes `https:` and `javascript:` hyperlink cells, and requires no `a`, `href`, `on*` or `data-*` from content.
- Design: the allowlist stays table structure only, plus `ALLOW_DATA_ATTR: false`, so SheetJS's `data-t`/`data-v` are also dropped (SD-09 shows `<td>text</td>`). The viewer example, spec plan and docs line are updated.

### AR-002 (Design Impact): CSV via URL

The spec case list now includes CSV via URL (bytes, `type: 'array'`) as well as CSV via content (`type: 'string'`). The DS-006 spine names both entry forms.

### Residual note: gateway README

The gateway README note now also reconciles L290-291 (`pnpm approve-builds`) with the allowlist in `pnpm-workspace.yaml`.

## Approval basis

- SR-002: the user's approval on 2026-10-24 (quoted in `requirements-doc.md` Document Status).
- SR-004 delta: approved by the Solution Designer within the direction, with the user informed. See SR-004 in `solution-revision-record.md`.

## Unchanged from SR-003

The server and gateway design, the classification, the sequence (viewer, then server, then gateway), the risks and FU-001..FU-004. The SR-003 handoff is `handoff-sr-003.md`.

## Expected output

Re-review of DS-006 and the requirements delta against ARCH-REV-001's AR-001 and AR-002.

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-spec.md`
- `follow-ups.md`
- `evidence/SD-09-hyperlink-cells.txt`
- the reviewer's own `design-review-report.md` and `architecture-review-revision-record.md` (in the ticket folder)

## Review outcome (recorded 2026-10-24)

- ARCH-REV-002 for SR-004: **Pass**. AR-001 and AR-002 are resolved; classification Medium / High is confirmed (`design-review-report.md`, `architecture-review-revision-record.md`).
- The architecture reviewer handed the package to `/software_engineering_team/implementation_engineer`. This notification is informational, so the Solution Designer sends no duplicate handoff.
