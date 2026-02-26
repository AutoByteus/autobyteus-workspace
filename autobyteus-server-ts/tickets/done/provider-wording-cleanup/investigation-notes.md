# Investigation Notes

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-server-ts/src/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.ts`
- `/Users/normy/autobyteus_org/autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts`
- `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/unit/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.test.js`
- `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.js`
- `rg -n -i "\\brpa\\b" src tests`

## Key Findings
- Current source logic is provider-based and checks `LLMProvider.AUTOBYTEUS`.
- Remaining deprecated acronym usage was in unit tests only.
- One JS test file still used stale model/env assumptions and outdated wording.

## Constraints
- Keep behavior aligned with provider-based logic in source code.
- Remove deprecated wording from server code (including tests) without behavior regression.

## Open Questions
- None blocking for this cleanup scope.

## Implications
- Update all deprecated language and identifiers in affected tests to `AUTOBYTEUS`/provider wording.
- For stale JS tests, align test context setup to provider-based checks to match source behavior.
