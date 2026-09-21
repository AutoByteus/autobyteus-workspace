# API-REV-014 Execution Plan — AgentOrg Communication Observability

## Authority And Gate

- Ticket: `AORG-FLAT-TEAM-001`
- Requirements: `RER-026`, especially `REQ-034 / AC-029 / SCN-018 / QR-012 / DEC-021`
- Architecture: cumulative `AD-REV-018 / DS-028`; `ARCH-REV-016 / Pass`
- Implementation: `IR-031`; source `f519a2093c98f265df9ea958bb5be15d6a5b2494`
- Reviewed artifact/HEAD: `3656220d2f7a1551aa54d8e7e9d3eb8d767b96f6`; `CRR-042 / Pass`
- Classification: `Large / High / reviewed`
- Prior result: `API-REV-013 / Pass / 98.4%` for its executed IR-030 scope, reopened after the user's `API-FIND-019` evidence.

## Evidence Rules

1. Record every completed case or material long-running checkpoint immediately in `api-e2e-test-case-ledger.md` before advancing.
2. Exercise web-equivalent desktop behavior through an actual persistent AutoByteus `open_tab`; CDP/Playwright may attach to that exact tab for semantic checks.
3. Use a real built Fastify server, production-built renderer, isolated copied data, the imported test package, SQLite/files, GraphQL/WebSocket, Agent Tools MCP, and real Codex App Server with `gpt-5.6-sol`.
4. For each accepted communication, correlate provider/tool result, durable `agent_org_communication_messages.json`, receiver center, sender/receiver Messages perspectives, exact addresses, content, timestamp, parent identity, and reference path/content.
5. Never infer a result from API-REV-013. Preserve relevant prior evidence only as historical context and rerun a proportionate cumulative critical set.
6. Fail fast on a critical contradiction, retain the exact evidence, clean owned resources, and route the complete failure package for origin review.

## Planned Cases

| Case | Scope | Expected proof |
| --- | --- | --- |
| `REPO-001` | exact authority, ancestry, instructions, package, owned-resource and dirty-state preflight | exact artifact/source, 18/18 package hashes, four Agents/two Teams/two Orgs, no resource collision, unrelated owner files untouched |
| `REPO-002` | IR-031 server/web communication coverage plus production builds/guards | both-endpoint configured/task matrix, post-durable order, complete-root perspectives, live facets, shared desktop/narrow UI, Team regression all pass |
| `REPO-003` | retained cumulative high-signal Team/Org/task/history/recovery/migration coverage | current reviewed artifact preserves prior critical behavior |
| `LIVE-001` | normal UI package import and fresh direct Org; direct configured -> direct configured | one durable record/root event, exactly one receiver `MEMBER_INPUT_MESSAGE`, one sent/received row, exact reference, unrelated focus excluded, live without refocus |
| `LIVE-002` | fresh mixed Org direct -> mounted, mounted -> direct, mounted Team A -> mounted Team B | all placement directions preserve exact complete-Org counterparts, perspectives, reference context and receiver exact-once event |
| `LIVE-003` | task-involved exact-ID directions | configured->task, task->configured, task->task, and `task_team_member` delivery remain real/durable but create no configured-member center presentation or Messages row |
| `LIVE-004` | presentation, responsive and accessibility | owning `Agent Org`/visible `Org` facet, Team-like Messages UI, reference viewer, keyboard/name-role-state, desktop and 390x844, mounted Team Tasks remains separate |
| `LIVE-005` | no-refocus, reconnect/checkpoint, Stop, SIGTERM/restart, Restore/history | durable rows/events reproduce with exact identity/order and no omission/duplication; terminal Stop and post-restart continuation remain correct |
| `LIVE-006` | standalone Team and retained cumulative critical controls | Team sent/received Messages remains intact; formal mounted-Team task settlement, strict identity, automatic recovery and scoped history remain correct proportionately |
| `MIG-001` | current startup/idempotence and direct-use communication sidecar | migration remains successful/idempotent, Team/Org histories preserved, existing communication sidecar directly rehydrates without a new migration |
| `CLEAN-001` | owned process/tab/data/build cleanup and source/fixture integrity | ports/tabs/processes absent; copied secrets removed; fixture/source hashes and diff checks intact |

## Environment Plan

- Server port: `8594`
- Renderer port: `3594`
- Focused auxiliary/migration port: `8700`
- Data root: `api-e2e-evidence/API-REV-014/runtime/` (isolated copy only)
- Workspace: API-REV-014-owned Temp Workspace beneath the isolated data root
- Package: `api-e2e-fixtures/aorg-api-rev-002-agent-package`
- Browser viewport targets: desktop `1502x844`; narrow `390x844`
- Provider/model: Codex App Server / `gpt-5.6-sol`

## Result Gate

`Pass` requires every critical REQ-034 configured placement direction, exact receiver-center event, sender/receiver perspective, reference, live/restore/no-duplication assertion and every task exclusion to pass, plus no material regression, complete cleanup, overall confidence >=95%, and no category below 90%. Otherwise record `Fail`, `Blocked`, or `Not Tested` truthfully.
