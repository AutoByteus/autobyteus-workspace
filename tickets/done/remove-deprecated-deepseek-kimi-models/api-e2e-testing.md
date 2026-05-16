# API/E2E Executable Validation: Removed DeepSeek Chat/Reasoner and Kimi 2.5

Status: Pass

## Acceptance Criteria Matrix

| AC | Scenario | Evidence | Status |
| --- | --- | --- | --- |
| AC-001 | DeepSeek model listing keeps V4 and omits removed IDs | `tests/integration/llm/llm-factory-metadata-resolution.test.ts` absence assertions | Pass |
| AC-002 | Kimi model listing keeps retained models and omits `kimi-k2.5` | `tests/integration/llm/llm-factory-metadata-resolution.test.ts` absence assertions | Pass |
| AC-003 | Provider defaults use retained models | `tests/unit/llm/api/openai-compatible-llm.test.ts`; `tests/unit/llm/api/kimi-llm.test.ts` | Pass |
| AC-004 | Metadata no longer depends on removed identifiers | `tests/unit/llm/metadata/model-metadata-resolver.test.ts`; `tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Pass |
| AC-005 | Source/tests do not advertise removed support outside negative assertions | Exact quoted source/test grep | Pass |
| AC-006 | Targeted tests and build pass | Vitest 5 files / 29 tests; `pnpm --dir autobyteus-ts build` | Pass |

## Executed Commands

```bash
pnpm --dir autobyteus-ts exec vitest --run \
  tests/unit/llm/api/kimi-llm.test.ts \
  tests/unit/llm/api/openai-compatible-llm.test.ts \
  tests/unit/llm/metadata/model-metadata-resolver.test.ts \
  tests/integration/llm/llm-factory-metadata-resolution.test.ts \
  tests/integration/agent/streaming/kimi-tool-id-event-stream-boundary.test.ts
# Pass: 5 test files, 29 tests

pnpm --dir autobyteus-ts build
# Pass: TypeScript build + verify-runtime-dependencies OK

rg -n "['\"](?:deepseek-chat|deepseek-reasoner|kimi-k2\.5)['\"]|k25" autobyteus-ts/src
# Pass: no exact removed model identifiers in source

rg -n "['\"](?:deepseek-chat|deepseek-reasoner|kimi-k2\.5)['\"]|k25" autobyteus-ts/tests --glob '!**/llm-factory-metadata-resolution.test.ts'
# Pass: no exact removed model identifiers in tests outside negative catalog assertions
```

## Notes

- First validation attempt failed because the new dedicated worktree had no installed dependencies; `pnpm install --frozen-lockfile --ignore-scripts` was run to materialize local dependencies for validation. No tracked dependency file changes resulted from that setup.
- No live vendor API calls were required for this removal validation.
