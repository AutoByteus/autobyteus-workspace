# Solution Revision Record: large-runs-load-less

| Revision | Date | Trigger | Requirements Change | Design Change | Approval |
| --- | --- | --- | --- | --- | --- |
| SR-001 | 2026-11-01 | Task autobyteus-358 (8 merged items) | Initial: 5 items kept (REQ-001…REQ-005), 3 dropped with evidence (161 fixed, 200 and 118 not worth it); DEC-001…DEC-003 | Initial design | Solution Designer within the direction; the user informed in the conversation |
| SR-002 | 2026-11-01 | ARCH-REV-001 (AR-001…AR-004) | None | AR-001: inspections tree-only; view snapshots without `messages`; per-root records owners validate tree plus log for the query, reference content and resume. AR-002: buffer before the request; merge by ID (`baseChangeSequence` removed); `reloadRoot` on every rebuild with named call sites. AR-003: `MemberLoader` per-root generations; every hydration form stages the focused member only. AR-004: no query for remote participants; non-participants rejected | No requirement change; SR-001 approval stands |
