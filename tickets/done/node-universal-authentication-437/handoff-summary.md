# Handoff Summary — node-universal-authentication-437 (autobyteus-437), slice 1 "no key, no access"

## What Ships

Every AutoByteus node refuses any request without a key. The desktop app, phones, linked nodes, Memory Sync and MCP gateway clients each hold their own key. Connections from networks the node does not accept are refused before anything else. The Nodes page connects a node with a one-time setup code and disconnects a desktop. Pairing two nodes is one step. Revocation closes open sockets at once.

## Classification

- `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review; code review CRR-001…006; API/E2E API-REV-001…003).

## Integrated State

- Ticket branch `codex/node-universal-authentication-437`; base `b690a5dfdb` → merged `origin/personal` `31aa11b241` (43 commits: autobyteus-426 r2, 432, 433, 434) as `3e85115f6e`, method merge, one import conflict resolved (both imports kept).
- Post-integration checks: server build, phone bundle build, 43 overlapping web spec files (396 tests), the base's new server test, phone probe MSP-01…20 (DR1-01…05): Pass. MSP-21…23 failed on credential-less probe sockets (DR-001), fixed in test code (`43e6d41eb0`) and passed (API-REV-003, CRR-006).
- Docs sync: `docs-sync-report.md` (two updates).

## Verification

- Judged from the evidence: AC-001…007 and AC-009 proven; AC-005 also on the merged state. See `release-deployment-report.md` § Verification.
- AC-008 (network admission): proven on this computer's real LAN and Tailscale addresses. **A second physical device is the user's check.**

## What Users Must Do

`release-notes.md` § "What you need to do": setup codes for Docker and self-started nodes, **Pair again** for linked nodes, `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS` for VPN phones, the MCP gateway token.

## Residual Risks

- Windows launcher not run on Windows.
- No in-place node update executed (status read only; it needs a newer signed package).
- 7 live probes migrated but not run (paid inference or a signed-in CLI).
- `build-studio-server.ts` is exactly 500 lines.
- Follow-ups FU-001…FU-004 (`follow-ups.md`), for the Solution Designer to send.

## Release

- Decision: Beta (user). Smoke-check runtimes Codex and Grok waived on quota refusal only.
- Rollback: revert the merge on `personal` and cut a new beta. The new credential files are additive (`Directly Usable — No Migration`), and an older build ignores them.
