# IMP-06 — premises proven before relying on them (design "Guidance For Implementation", AR reviewer request)
# Commit: probes ran on the step-2/step-3 working trees (bdac653cb6 / before 7250e64c05); the temporary probe tests were removed and never committed
# Environment: macOS Darwin 25.5.0, Node v22.23.1, vitest (server package)
# Date: 2026-10-26

| Premise | How | Observed |
| --- | --- | --- |
| `SecretManagementService` on an absent ID | Temporary probe test against a real one-database vault: `resolveForUse`, `removeForConsumer` twice, `getStatusForConsumer` for an `mcpServer` ID with no entry | resolve throws `SecretVaultError code=NOT_FOUND instructionCode=SECRET_NOT_FOUND`; remove is idempotent (no error twice); status `MISSING`. Now covered permanently by `mcp-secrets-in-vault.integration.test.ts` ("reports MISSING for an absent entry…") and `mcp-secret-resolver.test.ts`. |
| The `updateJsonFile` updater runs inside the file lock (`store-utils.ts` L212-226) | Temporary probe: two concurrent `updateJsonFile` calls on one file, the first updater awaiting a delay | Order `a-start | a-end | b-start saw [1]`, final file `[1,2]`: the second updater ran only after the first committed. The provider's backup and `replaceWithReferences` rely on this. |
| Web codegen handles the new GraphQL types | `pnpm -C autobyteus-web codegen` against a temporary built server (`startBuiltTestServer`, BACKEND_GRAPHQL_BASE_URL) | `[SUCCESS] Generate to ./generated/graphql.ts`; see IMP-13 for the committed hunks. |
