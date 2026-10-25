# Follow-ups: clean-checkout-build-fix (autobyteus-282)

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, investigation-notes C-06 | Dead tests for deleted code: `autobyteus-server-ts/tests/unit/prompt-engineering/**`, `tests/unit/agent-tools/prompt-engineering/**` and `tests/integration/prompt-engineering/**` import `src/prompt-engineering/**` and `src/agent-tools/prompt-engineering/**`, deleted on 2026-03-06 (`fd063bdc00`). `vitest.config.ts:20-22` excludes them | git log; the import scan | The build works without it; the tests are already excluded | No | "Delete the dead prompt-engineering tests and their exclusions in `vitest.config.ts`" | — |
