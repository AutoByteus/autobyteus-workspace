# Release Notes: RPA Visible Resume Prompt Cleanup

## Summary

RPA-backed text conversations now show cleaner browser-visible input during cache-miss resume. AutoByteus keeps system prompt content as a structured `system` message instead of prepending it into the first user message, and the RPA server owns the neutral browser-visible cache-miss shape.

## Behavior Change

- The server-ts `UserInputContextBuildingProcessor` no longer mutates the first AutoByteus/RPA user input by prepending the system prompt.
- Active cached RPA conversations still send only the selected current user message to the browser.
- Cache misses still reconstruct enough already-rendered transcript content for semantic continuity, but the visible browser input no longer contains resume/session/cache wrapper wording.
- First-call cache misses render as either `<system content>\n\n<current user content>` or exactly `<current user content>` without visible role headers.
- Multi-turn cache misses render an unlabeled system preface, then ordered `User:`, `Assistant:`, and `Tool:` blocks, ending with the current `User:` block.
- Tool XML and tool-result text remain TypeScript-rendered transcript content and are preserved unchanged by the RPA server.

## Removed Visible Wording

The RPA server no longer emits visible wrapper text such as `You are continuing...`, `remote browser-backed LLM session`, `Do not replay`, `Prior transcript:`, `Current user request:`, or a visible `System:` header.

## Validation

Latest authoritative API/E2E validation is `Pass`. Deterministic server-ts/RPA tests, server-ts build, RPA service and endpoint contract checks, py_compile, obsolete-string guards, and live browser-visible validation with `gemini-3-pro-app-rpa` all passed.

Known repository note: `pnpm run typecheck` in `autobyteus-server-ts` still fails with pre-existing TS6059 `rootDir`/`include` configuration errors for tests; this ticket did not change `tsconfig.json`, and targeted vitest plus build passed.
