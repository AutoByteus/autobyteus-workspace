# Proposed Design

## Version
- v1

## Summary
- Keep architecture unchanged:
  - Backend Codex run-projection provider adapts runtime payload to canonical projection entries.
  - Frontend run-open flow remains unchanged.
- Extend parser to support current Codex `thread/read` item schema while preserving legacy method-based parsing.

## Change Inventory
- C-001 Modify `codex-thread-run-projection-provider.ts`
  - Add extraction for `item.type=userMessage` from `content[]`.
  - Add extraction for `item.type=agentMessage` from `text`.
  - Add extraction for `item.type=reasoning` from `summary[]`/`content[]`.
  - Keep existing method-based parsing fallback.
- C-002 Modify provider unit tests
  - Add test covering current Codex payload shape.
  - Preserve existing legacy-shape test.
- C-003 Modify Codex live E2E runtime test
  - Add assertion that `getRunProjection` for created Codex run has non-empty conversation on real history path (`continueRun`).
- C-004 Add workspace cwd fallback in Codex history projection provider
  - If manifest workspace path does not exist, use `process.cwd()` for `thread/read` client launch.
  - Prevents projection regression when historical workspace directory was cleaned up or moved.

## Separation of Concerns
- Runtime-specific payload adaptation remains isolated in backend projection provider.
- GraphQL projection contract stays the same.
- Frontend continues to consume canonical projection conversation with no Codex-specific branches.

## Risks and Mitigations
- Risk: multiple item fields create duplicate messages.
  - Mitigation: deterministic per-item extraction and trim/empty filtering.
- Risk: reasoning formatting inconsistency.
  - Mitigation: keep single normalized `[reasoning]` section aggregation for assistant output.
