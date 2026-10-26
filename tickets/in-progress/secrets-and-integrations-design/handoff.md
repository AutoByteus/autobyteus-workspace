# Handoff — autobyteus-244: MCP server secrets in the vault (round 2)

- From: Solution Designer (run `solution_designer_9a83b5676cdb4488a7e25094626f527c`)
- To: Architecture Reviewer
- Date: 2026-10-26
- Task: `autobyteus-244` (part of `autobyteus-195`), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design`
- Branch: `codex/secrets-and-integrations-design`
- Base: `origin/personal` @ `a2faf424d6dc69a1d5160cb55acefc2f5a4f6bd5`. The review found the drift to `d74f75a5` touches no designed file.
- Ticket folder: `tickets/in-progress/secrets-and-integrations-design/`

## What is asked

Please re-review `design-spec.md` at **SR-007**. It is the revision after ARCH-REV-001 and addresses AR-001…AR-010.
- Classification is unchanged: **Large / High**.
- Requirements are unchanged (approved at SR-005).
- Two points were decided within the approved MDEC-001/MDEC-002 direction, and the user is informed:
  - **AR-006:** always-secret fields never return a value, even while stored plain.
  - **AR-007:** header rows are added to the form.

## How each finding is resolved (details in `solution-revision-record.md` SR-007)

| Finding | Resolution | Where in the design |
| --- | --- | --- |
| AR-001 | `McpConfigService.moveSecretsToVault` drives the move under a service write lock. The steps: vault saves → `provider.replaceWithReferences` (backup, then an atomic rewrite under the file lock, then a cache update) → compensation if it fails → core `addConfig` + `registerServer`. Only the provider writes `mcps.json` and its backup | DS-004; Dependency Rules; Interface (provider); file mapping |
| AR-002 | `McpServerSecretFields.statesOf` returns `McpSecretState` (`PLAIN/CONFIGURED/MISSING/VAULT_UNAVAILABLE`) and never throws. The converter maps a `McpServerView`, and `configureMcpServer` returns the same view. The card derives "needs secret" from the states | DS-003; output example |
| AR-003 | `McpServerDraft` (`plain/newSecret/keep`) is shared by configure, preview and import, with `McpConfigService` signatures. Secret fields work in store and preview modes. `field` = `env:<NAME>`/`header:<Name>`/`token`. `McpTokenInput` takes `{value}` or `{keep}`. Keep markers are written in the JSON tab. The old input builders are removed | Interfaces; DS-001; DS-006; Terminology; Removal plan; input example |
| AR-004 | `readLiveTestSecret` reads `test.github.token` from the test vault, read-only. The suite stores it through `configureMcpServer` in its own application vault. `test.github.token` is a test-only known ID: no consumer is authorized for it, and only `test-vault setup` accepts its alias | DS-005; Interfaces |
| AR-005 | `useSecretResolver` is called in `server-runtime.ts` after vault initialization (L175), before listen (L214) | Interfaces |
| AR-006 | Always-secret fields (`token`, `Authorization`) never return a value, even while stored plain. Other plain values are settings, shown with a "Looks like a secret" hint. Candidates always include plain always-secret fields. `tokenState` is null when there is no token | "Decisions Made Within The Approved Direction"; output example |
| AR-007 | Header rows are added, sharing a rows component with env (`McpConfigRows.vue`), each with a lock toggle. No Product Design round | Decisions; Derived Consumers |
| AR-008 | Vault saves come before the file write; removals come after the commit; new entries are removed if the write fails | DS-001 narrative |
| AR-009 | A paragraph on how the record shape meets MREQ-004 | "How The Record Shape Meets MREQ-004" |
| AR-010 | Stale status lines refreshed in the requirements, the investigation notes and the SR index | — |

Also adopted from the review's residual risks:
- the backup is written with mode 0600, and the user is told its path and that it holds plain values;
- a shared test vector keeps the rule's server and web matching the same.

## Documents

| File | Role |
| --- | --- |
| `requirements-doc.md` | Approved requirements (SR-005; status lines refreshed at SR-007) |
| `investigation-notes.md` | Evidence: "Architecture Investigation" and "Architecture Investigation, round 2" |
| `design-spec.md` | The design under review (SR-007) |
| `solution-revision-record.md` | SR-001…SR-007 |
| `design-review-report.md`, `architecture-review-revision-record.md` | ARCH-REV-001 (yours) |
| `follow-ups.md` | FU-001…FU-004 |

## Constraints that stay in force

- Dummy values only in tests and evidence.
- The real GitHub test token is used only by the gated live check, through the test vault. It is stored in `/Users/normy/.autobyteus-test/secrets/github-mcp-test.env` (mode 600, expires 2026-11-25) and gives read-only access to the private repo `ryan-zheng-teki/autobyteus-mcp-test`. Never print it.
- Never touch the user's `~/.autobyteus` data or the running app.
- No change to the user's plain `mcps.json` values without his explicit approval and a backup.
- No release unless the user asks.
