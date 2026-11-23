# Follow-ups — agy-capsule-tools-and-spill-shapes

None. The 561 follow-up FU-3 stays armed (requirements DEC-4): a recurrence is reported with the `RUNTIME_PROBE_TIMED_OUT` line and becomes a new Task.

| ID | Found by | What is wrong, where | Evidence | Why outside this ticket | Urgent | Suggested Task | Sent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-1 | API/E2E engineer, round 1 | The scripted fixture `tests/fixtures/agy-tps-cli.mjs` still emits `init.tools: []`, so a test that starts a run with it logs `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY` listing all eight names (noise only, nothing fails). `agy-failure-cli.mjs` now emits the eight registry names by default | `autobyteus-server-ts/tests/fixtures/agy-tps-cli.mjs` line 18 | Cosmetic log noise in the token-usage tests; one line in a fixture of another suite | No | "Give agy-tps-cli.mjs the eight registry names as its init.tools" | Not sent |
