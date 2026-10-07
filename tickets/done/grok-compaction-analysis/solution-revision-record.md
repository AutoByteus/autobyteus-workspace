# Solution revision record — grok-compaction-analysis

## SR-001 — experiments complete; Draft baseline
- Phase: Requirements investigation. Trigger U01. Prior N/A → Draft.
- Evidence G01–G14: source (ACP/Grok path), Grok docs, binary notification names, live ACP probes (tiny /compact, real manual compaction, cancel during manual, automatic with temporary GROK_HOME threshold, cancel during automatic).
- Findings: `/compact` works natively over ACP; manual → completed only; auto → started + completed without a shared id; cancel during auto leaves started open; cancel during manual emits nothing; AutoByteus drops all compaction notifications.
- Proposed REQ-G1–G4, DEC-G1–G3; no approval yet. Design N/A.

## SR-002 — approved; design complete
- Trigger U02 (go-ahead). Requirements Draft → Approved (REQ-G1–G4; DEC-G1 scope; DEC-G2 no version gate; DEC-G3 replay + low-threshold live E2E).
- Architecture evidence G15–G18. Design: design-spec.md; task_size Medium, architectural_risk Low.
- Next: handoff per rules.
