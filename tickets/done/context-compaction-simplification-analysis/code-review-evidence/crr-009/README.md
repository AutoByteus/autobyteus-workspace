# CRR-009 — API-F007 failure-origin review

Current authority: ../../code-review-report.md and ../../code-review-revision-record.md. **Fail / Local Fix — implementation-owned.** Supported numeric Settings save is rejected by unanchored TOKEN guard; independent positive regression fails and true-credential negative passes. Prior sourcePass9.40 historical; affected readiness rationale corrected only. API005Fail78.6 remains, no successful ten-path test review or Delivery.

## Exact reviewer commands
From worktree `autobyteus-server-ts`:
```sh
pnpm exec vitest run tests/e2e/server-settings/server-settings-graphql.e2e.test.ts -t 'numeric compaction context ceiling|credential-like settings' --no-watch
```
Exit1;1Pass/1Fail/11filtered; see settings-regression.log/.exit. Normal Prisma/Vitest setup, fresh test config, no providers. Positive expectation is approved nonsecret control; no weakening/correction to test or implementation made.

From worktree root:
```sh
python3 tickets/in-progress/context-compaction-simplification-analysis/code-review-evidence/crr-009/origin-audit.py
```
Reads actual source and three pinned Git refs; Node evaluates the original exact regex. All match TOKEN; identical guard at refreshed base, IR005base, currentHEAD and worktree. No historical runtime rerun/waiver. source-evidence.json has exact line excerpts/hash for forward UI→store→GraphQL→guard→intended config/runtime path.

entry-audit.json pins171IR005 hashes, source/branch, prior canonical inputs and all1149 protected pending paths. owner-preservation.json checks entry owners unchanged after review. review-entry reports are prior-input evidence only, not competing current authorities. The complete API799 references are carried forward and deduplicated with reviewer evidence and scoped source paths in reference-index.json; reference-check.json reports presence. No current evidence stripped from the cumulative chain.

API screenshot visually inspected from retained local evidence, not a new desktop run. API HTTP/UI/reopen and broader result evidence reused with attribution. No live provider, private data, production/durable-test edit, broad suite/typecheck/desktop rerun, commit/finalization or unrelated cleanup. Normal test setup may regenerate ignored Prisma outputs; left intact.

Confirmed **accepted=true / DELIVERED** to sole **/implementation_engineer**, exact AgentRun **implementation_engineer_d565b3adf8074d59878dc089de6d3df1**,816 cumulative/current references attached. Receipt `code-review-evidence/crr-009/handoff-receipt.json`. No additional outcome recipient, source fix or Delivery advancement. Review stops after this confirmed handoff.
