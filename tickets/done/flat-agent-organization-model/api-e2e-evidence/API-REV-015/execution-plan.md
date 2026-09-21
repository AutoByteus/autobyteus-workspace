# API-REV-015 Execution Plan — IR-032 Task-Team Status Traversal And Held Cumulative Renewal

## Authority And Gate

- Ticket: `AORG-FLAT-TEAM-001`
- Requirements: `RER-026`, cumulative `REQ-001–034`, especially `REQ-015 / AC-010` and `REQ-034 / AC-029`
- Architecture: cumulative `AD-REV-018 / DS-028`; `ARCH-REV-016 / Pass`
- Implementation: `IR-032`; source `8f9f9ce3f7f4ab9312813de8faf5b651578a7310`
- Reviewed artifact/HEAD: `43ef19f2de69b2c16133577dac40471f75ebd913`; `CRR-044 / Pass`
- Classification: `Large / High / reviewed`
- Prior result: `API-REV-014 / Fail / 87.0%`; `API-FIND-020` source-resolved by IR-032/CRR-044.

## Evidence Rules

1. Record every completed case or material checkpoint immediately in `api-e2e-test-case-ledger.md`.
2. Use an exact built server, isolated copied data, production renderer and an actual persistent AutoByteus `open_tab`; attach CDP only to that tab.
3. Use the normal UI package import and real Codex App Server / `gpt-5.6-sol` for task/message actor paths.
4. Correlate task/message UI with exact provider traces, WebSocket frames and durable sidecars/tree packages.
5. Prove unique status IDs from actual current snapshots; do not accept client-side deduplication or infer from source tests.
6. Fail fast on a critical contradiction, preserve exact evidence, clean owned resources and route the completed package.

## Planned Cases

| Case | Scope | Expected proof |
| --- | --- | --- |
| `REPO-001` | exact authority/source/instructions/package/resource preflight | exact IR-032 artifact, 18/18 fixture hashes, no owned-resource collision, other-owner state preserved |
| `REPO-002` | exact IR-032 status/stream/recursive/shutdown coverage and server build | 4/19 current tests plus production build/bootstrap pass |
| `REPO-003` | cumulative affected server plus IR-031 communication/retained web, guards/build | 16/71 server and current/retained web/build coverage pass |
| `LIVE-001` | exact mounted configured Agent -> task Team -> current snapshot -> exact-root reselect | one durable visible task Team; complete unique statuses; no recovery notice or stale/offline projection |
| `LIVE-002` | root-hosted and recursively nested task Teams plus settlement/removal | every active descendant status exactly once; settled task Team disappears without corrupting remaining root snapshot |
| `LIVE-003` | strict-negative preservation and whole-Org frozen shutdown | genuine malformed duplicate fails strict validation; live root remains strict; Stop/SIGTERM cleanly owns all active scopes |
| `LIVE-004` | IR-031 configured communication reconnect/restore/no-duplication | current-artifact messages/references and receiver events survive reselect, Stop/restart/Restore exactly once |
| `LIVE-005` | desktop/narrow Messages/reference/a11y plus unified focus | right-side Org Messages and center inputs remain usable at desktop and `390x844`, including strip/drawer exact focus |
| `LIVE-006` | standalone Team, task settlement, strict identity, recovery/history controls | preserved cumulative Team/Org behavior on the current artifact |
| `MIG-001` | current migration idempotence and communication/task sidecar direct use | startup remains current/idempotent; Team/Org history and current sidecars remain readable |
| `CLEAN-001` | owned tab/process/port/secret/build-output cleanup and integrity | no retained owned resource/secret; fixture/source/diff integrity passes |

## Environment Plan

- Server: `127.0.0.1:8596`; internal Agent Tools MCP: `127.0.0.1:37877`
- Production renderer: `127.0.0.1:3596`
- Migration/focused auxiliary port: `8702`
- Data/workspace root: `api-e2e-evidence/API-REV-015/runtime/` only
- Package: `api-e2e-fixtures/aorg-api-rev-002-agent-package`
- Browser viewports: desktop `1502x844`; narrow `390x844`
- Provider/model: Codex App Server / `gpt-5.6-sol`

## Result Gate

`Pass` requires direct resolution of API-FIND-020 plus root/mounted/recursive/settled/shutdown task-Team coverage, current-artifact communication reconnect/restore/narrow proof, held cumulative cases, migration and cleanup. Overall confidence must be at least 95%, no applicable category below 90%, and no critical criterion may remain failing or unproven.
