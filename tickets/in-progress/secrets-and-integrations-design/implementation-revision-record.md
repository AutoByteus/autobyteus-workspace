# Implementation Revision Record — MCP server secrets in the vault (autobyteus-244)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 pass (design SR-007) | AR-011…AR-014 (non-blocking clarifications, applied) | `Initial Baseline` | SR-005 (requirements), SR-007 (design), ARCH-REV-002 | Implemented; to Code Review (Large/High) |

## Revision Entries

### IR-001 — MCP server secrets stored as vault references, resolved at connect

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/secrets-and-integrations-design/design-review-report.md`, ARCH-REV-002 (pass).
- Triggering finding IDs: N/A (baseline). The pass carried AR-011…AR-014 as non-blocking clarifications; all applied (see handoff).
- Classification: Initial Baseline.
- Prior authoritative result: N/A.
- Current authoritative result: the design's change sequence steps 1–7 implemented and checked; branch `codex/secrets-and-integrations-design`, commits `5ec97f1aba`…`bd1ed1a232` plus the ticket-artifact commit named in the handoff.
- Related solution revision IDs: SR-005, SR-007.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: MREQ-001…MREQ-008, MDEC-001…MDEC-005; BEH-001 (store/use), BEH-005, UC-006 (move), import, delete, preview, live check (DS-001…DS-007).
- Implementation delta:
  - core: `McpConfigValue`/`McpSecretReference`/`McpSecretField`, the `McpSecretResolver` and `resolveMcpValues`, resolution in the managed servers' connect, the instance manager holding the resolver; dead workspace code removed;
  - server vault: `mcpServer` consumer kind (catalog accepts only `mcp.<uuid>`), test-only `test.github.token` with its test-vault-only alias, `SecretManagementMcpSecretResolver`, `installRuntimeMcpSecretResolver` at startup;
  - server MCP: server draft, `McpServerSecretFields`, `McpSecretSuggestionRule` (+ shared vectors), provider references/backup/`replaceWithReferences`, `McpConfigService` write lock and operations (configure, preview, import with `storedSecrets`, delete, list views, move candidates, move), AR-014 warning;
  - GraphQL: entries with states, token state, entry/token inputs, input mapper, converter, rule query, candidates, move;
  - web: shared rows with lock toggles, token states, keep markers, review step, banner and dialog, card "needs secret", import result, en/zh-CN, generated types (MCP hunks only);
  - tests, e2e, gated GitHub live check, docs and glossary.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: see the handoff's Checks Run (all Pass).
- Next recipient or routing: Code Reviewer (Large/High, via `get_handoff_rules`).
- Remaining limitations or risks: see the handoff's Known Risks.
