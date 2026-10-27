# Docs Sync Report — secrets-and-integrations-design (autobyteus-244, MCP server secrets in the vault)

## Scope

- Ticket: `secrets-and-integrations-design` (Project Task `autobyteus-244`); `task_size=Large`, `architectural_risk=High`, reviewed route (architecture review ARCH-REV-003 Pass; code review CRR-002 Pass; test-code review CRR-003 Not Applicable)
- Trigger: code reviewer's delivery handoff after CRR-003; API/E2E Pass `API-REV-001` (95.4%)
- Bootstrap base: `origin/personal` @ `a2faf424d6`; integrated base: `origin/personal` @ `67994daba0` (76 commits), merged as `2c67d4b4c2`
- Post-integration verification: `evidence/DR-01` … `DR-05`

## Why Docs Were Updated

- The implementation updated the long-lived docs, and the code reviewer checked them against the code in round 2:
  - `GLOSSARY.md` ("MCP Secrets")
  - `TESTING.md` (the test-vault alias)
  - `docs/design-cases.md` (a Case 5 entry)
  - `autobyteus-server-ts/docs/modules/mcp_server_management.md` ("Secret Values", credentials)
  - `autobyteus-server-ts/docs/modules/secret_management.md`
  - `autobyteus-web/docs/tools_and_mcp.md`
- Delivery's doc work was the merge. `GLOSSARY.md` and `docs/design-cases.md` were also changed on the base and conflicted.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `GLOSSARY.md` | Merge conflict resolved | This ticket's "MCP Secrets" section is kept, followed by the base's new "Project Tasks", "Agent Runtimes" and "Agent Definitions" sections (autobyteus-260, -303, -308). Nothing was rewritten |
| `docs/design-cases.md` | Merge conflict resolved | This ticket's "Again in autobyteus-244" bullet and the base's two "Again in autobyteus-303" bullets are both kept under Case 5. The "Notice it by" line keeps this ticket's version, which is the base's line plus "A product behavior stated from a function, without a caller." |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | No change | "Remote … Credentials" and "Secret Values" match the merged code. The base did not touch this file |
| `autobyteus-web/docs/tools_and_mcp.md` | No change | Its plain-text mentions describe the `PLAIN` state and the move banner, which is accurate. The base did not touch it |
| `autobyteus-server-ts/docs/modules/secret_management.md`, `TESTING.md` | No change | The base did not touch them |
| `RELEASE.md` | No change | Its new Secret Gate section was applied in this delivery |

## Docs Updated (by delivery)

| Doc Path | What Changed | Why |
| --- | --- | --- |
| `GLOSSARY.md`, `docs/design-cases.md` | Conflict resolution keeping both sides (above) | A clean merge of additive sections |
| `.gitleaks.toml` (not a doc; recorded here because it is repository config changed in delivery) | Two narrow allowlist entries: the `mcp.<uuid>` vault secret ID shape, under the existing generic-rule UUID allowlist; and `curl-auth-header` for the one probe file whose bearer value is deliberately forged | The Secret Gate (`RELEASE.md`) flagged 14 false positives. See `release-deployment-report.md`, Secret Gate |

## Follow-ups Recorded By Delivery

- FU-008: stale Agent fixture in `definitionMutationCache.spec.ts`, from autobyteus-308.
- FU-009: stale `AgentDefinitionService` mock in `archive-run-history-graphql.e2e.test.ts`, from autobyteus-308.

Both are in `follow-ups.md`.

## Delivery Continuation

- Result: `Pass`
