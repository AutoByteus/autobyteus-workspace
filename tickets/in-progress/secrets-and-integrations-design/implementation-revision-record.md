# Implementation Revision Record — MCP server secrets in the vault (autobyteus-244)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 pass (design SR-007) | AR-011…AR-014 (non-blocking clarifications, applied) | `Initial Baseline` | SR-005 (requirements), SR-007 (design), ARCH-REV-002 | Implemented; to Code Review (Large/High) |
| IR-002 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-003 pass (design SR-008, answering code review CRR-001); Solution Designer note adopting AR-016 | CR-001…CR-004 (CRR-001), AR-015, AR-016 | `Design Impact` (CR-001, CR-002), `Requirement Gap` (CR-003) resolved upstream; `Local Fix` (CR-004) | SR-008, ARCH-REV-003, CRR-001 | Implemented; to Code Review (Large/High) |

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

### IR-002 — SR-008: backups only from the move, a reviewed-once banner, import of references, dead twins removed

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` ARCH-REV-003 (pass of SR-008, which answers code review `code-review-report.md` CRR-001); Solution Designer message adopting AR-016 into MDEC-007.
- Triggering finding IDs: CR-001, CR-002, CR-003, CR-004 (CRR-001); AR-015 (ARCH-REV-003); AR-016 (adopted by the Solution Designer).
- Classification: CR-001 and CR-002 were Design Impact, CR-003 a Requirement Gap (all resolved by SR-008 / MDEC-006 / MDEC-007); CR-004 a Local Fix.
- Prior authoritative result: IR-001 (`90c21a7cdb`), CRR-001 Fail.
- Current authoritative result: SR-008 implemented; see the handoff (Checks Run IMP-16…IMP-22).
- Related solution revision IDs: SR-008.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: the rework round for CRR-001.
- Approved behavior or requirement IDs affected: MDEC-002 (move/backup), MDEC-006 (banner review), MDEC-007 (import of references), BEH-001 store path, Import.
- Implementation delta:
  - **CR-001:** `FileMcpServerConfigProvider.update` writes no backup (`replacesPlainValue` removed); only `replaceWithReferences` (the move) backs up. In the form, an unchanged saved plain row offers "Move to vault" in place of its lock toggle and is always sent plain (`offersMove`); a changed value gets its lock back (`newSecret`).
  - **CR-002 / MDEC-006 / AR-015:** `utils/mcp/mcpSecretReviewState.ts` (`read`, `markReviewed`), localStorage `autobyteus.mcp.secretReview.<entryId>`. The banner shows only unreviewed candidates and gains "Keep as they are"; the dialog marks unticked rows on confirm (with nothing ticked it keeps all and closes); the form marks rows the rule pre-locked that the user unlocked and saved (`unlockedSuggestions`).
  - **CR-003 / MDEC-007 / AR-016:** draft value `missingSecret` (store: a fresh `mcp.<uuid>` with no entry; preview: the same, unresolvable). Import maps a reference to `keep` when the server with that ID holds a reference at that field, else `missingSecret`; the result adds `needs_secret` / GraphQL `needsSecret`; the import view lists them and the success toast names them.
  - **CR-004:** deleted `tests/unit/mcp-server-management/services/mcp-config-service.test.js`, `tests/integration/mcp-server-management/mcp-config-service.integration.test.js`, `tests/unit/mcp-server-management/cached-provider.test.js`.
- Changed files or areas: server `providers/file-provider.ts`, `domain/mcp-server-draft.ts`, `services/{mcp-server-secret-fields,mcp-config-service}.ts`, GraphQL `types/{mcp-server-config,mcp-server}.ts`; web `utils/mcp/{mcpConfigRows,mcpSecretReviewState}.ts`, `components/tools/{McpConfigRows,McpSecretMoveBanner,McpServerFormModal,McpBulkImportView}.vue`, `graphql/mutations/mcpServerMutations.ts`, `generated/graphql.ts` (3 hunks), locales; tests; docs and glossary.
- Local validation and result: see the handoff's Checks Run (round-2 rows).
- Next recipient or routing: Code Reviewer (Large/High).
- Remaining limitations or risks: the import's keep decision reads the saved server before the service write lock (see the handoff's Known Risks).
