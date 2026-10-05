# Solution revision record — ios-release-ui-test-flakiness
## SR-000 — intake
- Trigger: I01 user request relayed by /delivery_engineer; evidence I02. Status Draft. No investigation, approval or design yet.

## SR-001 — investigation; option analysis
- Evidence I03–I07 and U01 (app not in use). Options presented: stop the iOS release on tags (recommended at first), fix the flakiness, or both.

## SR-002 — fix approved; root cause proven; design complete
- U02: the user chose to fix rather than stop. Evidence I08–I13, including the deterministic local reproduction.
- Requirements Draft → Approved (fix scope). Production connection behavior unchanged (default 5 s); the fix targets the UI-test environment and test robustness.
- Design: design-spec.md; task_size Small, architectural_risk Low.
- Next: handoff per rules.
