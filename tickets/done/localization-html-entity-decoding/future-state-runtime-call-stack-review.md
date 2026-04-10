Status: Go Confirmed

# Round 1

Result: Candidate Go

Checks:
- Confirmed the regression sits at the localization runtime boundary, not in component styling.
- Confirmed a runtime decode fixes both reported arrows and other entity-backed labels.
- Confirmed the output remains plain text and does not require HTML rendering.

Missing use case sweep:
- Arrow entities in CTA labels: covered.
- Arrow entities in back links: covered.
- Ampersand, angle-bracket placeholder text, multiplication sign: covered.
- Numeric entities: added to implementation scope for forward coverage.

Artifact updates:
- `requirements.md`
- `investigation-notes.md`
- `implementation.md`
- `future-state-runtime-call-stack.md`

# Round 2

Result: Go Confirmed

Checks:
- No remaining design blockers.
- No additional requirements needed for the small-scope runtime fix.
- Global runtime decode remains the lowest-risk owner for this failure class.

Resolved findings:
- Repaired ownership choice: runtime boundary owns entity decoding.
- Repaired scope choice: one runtime fix instead of patching isolated labels.
