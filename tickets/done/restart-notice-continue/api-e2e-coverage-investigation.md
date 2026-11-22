# API/E2E Coverage Investigation — autobyteus-585 (`restart-notice-continue`)

## Basis

- Requirements: `requirements-doc.md` (SR-001: REQ-001..005, AC-001..007, DEC-001 wording unchanged, DEC-002 own light row).
- Design: `design-spec.md`.
- Implementation: IR-001 (`75e085d889`; documents `e9ae5ad3c7`). Direct route, Small / Low. Web only.
- What must be proven at the real surfaces: each platform notice is its own labelled, light row on desktop and phone, live and after a reload, with the agent rows around it in order; usage shown once; nothing else in the conversation changes.

## Existing coverage that this change affects

- Builder, witness, usage and segment specs: updated by the implementer.
- Desktop probe `notice-row-presentation-probe.mjs`: new.
- Phone MSP-99: new.
- Phone MSP-75..77 (`mobile-restored-run-cases.mjs`, my cases from autobyteus-526): they found notice cards by text that included the bracketed header, which this change removes. They need rewriting in this ticket.

## Planned cases

| Case | Covers | Surface | Kind |
| --- | --- | --- | --- |
| V-01 | regression | web typecheck and guards | Existing |
| V-02 | AC-001..AC-004, AC-006, AC-007 | full web unit suite | Existing (updated) |
| V-03 | AC-005 desktop, AC-001, AC-007 | `test:e2e:notice-row-presentation` | New probe |
| V-04 | AC-005 phone, REQ-004, AC-003 (live and after a reload); a Team and an Org member | MSP-75, MSP-76, MSP-77, MSP-99 on the production phone bundle | Existing (rewritten) and new |
| V-05 | regression | the whole phone suite once | Existing |
| V-06 | regression | `test:e2e:background-contention` (fixture changed) | Existing |
| V-07 | REQ-002 zh-CN; dark mode | desktop probe variant in zh-CN and with a dark color scheme | Focused |
