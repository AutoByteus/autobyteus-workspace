# API / E2E Testing

## Executed Scenarios

| Scenario ID | Scope | Result | Evidence |
| --- | --- | --- | --- |
| AV-001 | Imported agent update persists to external source root | Passed | `definition-sources-graphql.e2e.test.ts` |
| AV-002 | Imported team update persists to external source root | Passed | `definition-sources-graphql.e2e.test.ts` |
| AV-003 | Bundled skill on imported agent is exposed as `skillNames` during GraphQL update flow | Passed | `definition-sources-graphql.e2e.test.ts` |
| AV-004 | Imported agent delete removes external-source files and cache entry | Passed | `definition-sources-graphql.e2e.test.ts` |
| AV-005 | Imported team delete removes external-source files and cache entry | Passed | `definition-sources-graphql.e2e.test.ts` |
| AV-006 | Baseline agent-definition GraphQL create/update/duplicate/delete flow remains intact | Passed | `agent-definitions-graphql.e2e.test.ts` |
| AV-007 | Baseline agent-team GraphQL create/update/delete flow remains intact | Passed | `agent-team-definitions-graphql.e2e.test.ts` |

## Command

```bash
pnpm test tests/e2e/agent-definitions/definition-sources-graphql.e2e.test.ts
```

```bash
pnpm test tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts tests/e2e/agent-definitions/definition-sources-graphql.e2e.test.ts tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts
```

## Result

- Status: `Pass`
- Notes:
  - external agent and team definitions updated in place under the imported root
  - bundled skill fallback surfaced correctly for the imported agent
  - imported agent and team deletions remove external-root files and evict cached entries
  - baseline agent and team GraphQL definition flows still pass after the provider changes
