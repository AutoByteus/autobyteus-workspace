# Implementation Revision Record

Current code and implementation-handoff.md are authoritative.

## Revision Index
| Revision | Trigger / round | Findings | Classification | Related revisions | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / ARCH-REV-002 round 2 | N/A — initial implementation; closed AR-001 drives DS-008 | Initial Baseline | SR-006/SR-008; ARCH-REV-002; CRR/API-REV/DR N/A | Implementation Complete — Ready for Code Review |

## IR-001 — Managed GitHub skill sources and current-generation runtime acquisition
- Trigger: architecture_reviewer implementation-ready Pass message; current
  design-review-report.md and architecture-review-revision-record.md round 2.
- Prior authoritative implementation result: **N/A**. No prior result inferred.
- Current result: **Implementation Complete — Ready for independent Code Review**.
- Requirements Approved SR-006 / USER-APPROVAL-006; design SR-008; ARCH-REV-002.
  Code review, API/E2E and delivery revision IDs: **N/A**.
- Triggering implementation finding IDs: **N/A** (initial baseline).
- Why recorded: establishes the first implemented cumulative package, distinct from
  the architecture-only correction/pass.
- Affected: BEH-001–004, REQ-001–008, AC-001–008; DS-001–008.
- Implementation commits: `c6c4afbf4`, `40a01fa18`; review diff starts at `242f7bdac`.
- Delta: source lifecycle separated from catalog; new current-only managed registry,
  private generation preparation and atomic publication; shared neutral GitHub
  transport; strict archive/link boundary; bounded repository discovery; trusted
  managed provenance; current-catalog runtime transfer with carried occurrence holders
  and effective return shape at Codex/Claude/ACP; source UI/API and transient file-view
  refresh, localized confirmations, focused unit tests and module documentation.
- Paths: implementation-handoff.md Key Files lists concrete production files;
  tests/unit/skills/github/ carries new lifecycle/archive/runtime/metadata fixtures.
  Old source methods/URL location/type exports and array-return callers were removed.
- Validation: server production build/typecheck, focused server unit suites,
  specific skill-workspace rebind, 28 web tests, web production build, guards,
  literal audit and direct desktop/narrow renderer fixture interactions. Exact
  commands/results and existing unrelated failing checks are in evidence/local-checks.md.
- Classification: **Large / High confirmed**, no behavior change or migration added.
- Routing: independent source review required; exact rule receipt in canonical handoff.
- Remaining limitations: no downstream API/E2E or full header ＋/Send proof, live public
  import, native Windows/Linux execution, packaged restart or user verification.
  Local checks do not waive the architecture report's validation gates.
