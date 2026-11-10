# Handoff — server-e2e-node-credential-447, SR-001: Architecture Design Complete

- Result: `Architecture Design Complete`
- Package identifier: `server-e2e-node-credential-447`
- Task: Project Task `autobyteus-447` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), urgent FU-004 of autobyteus-436
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Solution revision: `SR-001`
- Classification: `task_size=Medium`, `architectural_risk=Low` (test code only; design-spec "Task Size And Architectural Risk")
- Route applied: direct implementation → `/software_engineering_team/implementation_engineer` (handoff rule for Medium/Low)

## Original request (Task text, condensed)

15 server E2E files have failed on `personal` since the autobyteus-437 node gate (beta.9): their requests carry no node credential or MCP gateway token (401, `MCP_GATEWAY_TOKEN_REQUIRED`). Make them carry the credential (`tests/setup/test-launch-credential.ts`, `builtServerLaunchEnvironment`, `test-support/node-access`) and the gateway token; check that no other suite (web probes, release smoke) has the gap; consider a guard so a new test file that talks to a node without a credential fails early with a clear message. Constraints: no weakening of the node's gate (no test-only bypass in product code); isolated nodes and test keys; DESIGN.md and TESTING.md; release only on the user's word. Done when: the server E2E suite passes on `personal`, with the guard if worthwhile; finalized on the base branch.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447`
- Branch: `codex/server-e2e-node-credential-447`
- Base: `origin/personal` @ `310fc27452be3d3f44459c89f59c70d8ff40ea02`
- Finalization target: `origin/personal`
- Already done in the worktree: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `build`, `test:integration:prepare` (all exit 0). The ticket documents are uncommitted under `tickets/in-progress/server-e2e-node-credential-447/`; commit them with your first commit (stage paths explicitly).

## Approval basis

Requirements approved by the Solution Designer within the Task's direction (no decision needed the user); the user was informed in the Solution Designer's conversation on 2026-11-10. Decisions DEC-001…DEC-004 are in the requirements doc with reasoning. Design user approval not required by the direction.

## What to build (design-spec D1…D9, sequence in "Change / Refactor Sequence")

- D1 Install the owner-credential attachment from `tests/setup/test-launch-credential.ts` (export `installOwnerCredentialAttachment` from `test-support/node-access/owner-credential-attachment.mjs` + `.d.mts`). Root cause of 7 of the 15 files and 8 gated files: they keep `globalThis.fetch` before the lazily installed attachment exists.
- D2 `startStudioE2eRuntimeServer(host, { loggingConfig })`; `agent-runtimes-graphql` and `available-agent-runtimes-graphql` use it instead of composing the node themselves.
- D3 `fastify.inject` calls in `task-delegation-api-surface` and `workspace-content-rest` carry `authorization: Bearer ${ownerCredential}`.
- D4 New `tests/e2e/helpers/mcp-gateway-client.ts` `connectMcpGatewayClient(serverUrl, clientName)` (token from `GET /rest/mcp-gateway/token`, passed in `requestInit.headers`); used by the three `tool-management/mcp-*` files, `runtime/mcp-run-session-cleanup`, `mcp/mcp-github-remote-live`.
- D5 `project-mutation-node-locality`: the fixture children's `environment()` adds `...builtServerLaunchEnvironment()`.
- D6 Guard `tests/architecture/e2e-node-credential-paths.test.ts` (direct `buildStudioServer(` and gateway `StreamableHTTPClientTransport` outside the helpers; messages name file, cause and helper; one self-case per rule).
- D7/D8 TESTING.md: Node credentials paragraph; "Choosing the path" row for whole-suite runs after changes to the node gate, credentials, gateway token or shared harness (own `docs(testing)` commit).
- D9 `docs/design-cases.md` Case 2: "Again in autobyteus-437 (447)".

## Evidence and reproduction

- Reproduction to start from (must turn green): investigation notes PROBE-01 command over the 15 files, clean environment (`env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR"`); base output `evidence/REPRO-01-fifteen-files-base.log`.
- Full-suite baseline on base: investigation notes PROBE-02, `evidence/PROBE-02-full-e2e-base.log`.
- Root-cause prototype: PROBE-03, `evidence/PROBE-03-early-install-prototype.log` (prototype reverted; not committed).

## Verification expected (requirements AC-001…AC-008)

Server typecheck, `test:unit`, `test:integration` (shared harness changed); the 15 files; full `pnpm test:e2e` with 0 failed files; deterministic gated suites (scripted AGY: `mcp-run-session-cleanup`, `agent-package-definitions-live-refresh`, `agy-skill-update-notice-roots`; `mcp-github-remote-live` if the test vault holds `test.github.token`, no paid provider); refusal suites unchanged; no `src/` diff; no `own_…`/`mcpg_…` in evidence. Paid live-provider suites are not run (no real-provider proof needed).

## Open risks and assumptions

ASM-001 (credentialed tests pass on product grounds), ASM-002 (Agent Tools MCP host ignores an extra `Authorization`), RSK-001 (early install inert outside registered ports). Escalate to the Solution Designer if any product code change looks necessary.

## Follow-ups

`follow-ups.md` FU-001 (whether every ticket/release runs the full server E2E suite; the user's decision). Sent by the Solution Designer when the ticket leaves the team.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/follow-ups.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-node-credential-447/tickets/in-progress/server-e2e-node-credential-447/evidence/`

## Next expected action

Implementation Engineer implements D1…D9 and validates per the design; the team's configured route continues from there.

## Route record

- 2026-11-10: handoff rules applied; the Medium/Low rule matched. Sent with `send_message_to` to `/software_engineering_team/implementation_engineer` (delivered, run `implementation_engineer_aa208cf085c24498b6aa96b91a429a28`) with this file and the package documents attached. No other rule matched.
