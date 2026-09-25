# Docs Sync Report — AGY CLI Runtime

## Scope

- Ticket: `antigravity-cli-runtime-redesign-20260924`.
- Trigger: Initial CRR-010/API-REV-004 delivery baseline, then DR-002 re-entry after CRR-012 proportional test-code Pass and API-REV-006 Pass / 96% for the user's explicit cross-process browser continuation journey; CRR-009 source Pass remains authoritative. Reviewed **Large / High** route.
- Bootstrap base reference: `origin/personal@40b1783f40c072b577ad9d0c5d8fe4f5418c6c38` (`design-spec.md`). Finalization target: `origin/personal`.
- Integrated base reference used for docs sync: fetched `origin/personal@fdbd07124f0eaaa1310379c1ca8e2449f97b0dcf`, merged into ticket as `c9c8373e1dc02ca44c285cd96286dacf7708208c` after reviewed-package checkpoint `9216b64263afaf81ae1bc12121856d14efe3a89b`.
- Post-integration verification: Initial DR-001 `pnpm -C autobyteus-server-ts prepare:shared` passed; `RUN_AGY_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts --no-watch` passed **2/2** against merged state, `/tmp/agy-delivery-postmerge-e2e.log`. Initial no-test-collection from absent generated shared SDK `dist` was a corrected local precondition, not a product pass. At DR-002 re-entry, `git fetch origin personal` still resolved to `fdbd07124f0eaaa1310379c1ca8e2449f97b0dcf`; no new base commit was integrated, so no base-triggered rerun was needed. `node --check` of the new durable browser probe and `git diff --check` passed. API-REV-006's final real A→B Chrome/Nuxt run against the same integrated production source passed; `/tmp/agy-r6-probe-final.log` and `api-e2e-round5-process-restart-browser/evidence.json` are the direct journey evidence.

## Why Docs Were Updated

The integrated implementation adds a fourth Agent runtime and its run-owned capsule, exact AGY provider binding, headless permission semantics, canonical tool outcome convention, Team/Org participation, and mobile/desktop launch-policy exception. Existing long-lived docs described only AutoByteus/Codex/Claude and a universally off mobile auto-approval default, so no-impact would be false. The integrated Team/Org run-history base and real AGY transport test passed at DR-001. DR-002 adds exact clean backend A→B browser history-focus and old/new visible-reply coverage for Team, direct Org and nested Org, without claiming crash/Electron or unrelated provider coverage.

## Long-Lived Docs Reviewed

| Doc path | Result | Reason / change |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Updated | Link the fourth provider's lifecycle contract from the canonical Agent execution overview. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Updated | Add AGY to supported per-member backend selection and exact Team identity notes. |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Updated | Describe direct/nested AGY member support without changing Org topology. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Updated | Record AGY capsule materialization of the run-scoped MCP descriptor. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Updated | Record server-side AGY conversion, renderer/launch-policy semantics, and the bounded fresh-browser A→B continuation result. |
| `autobyteus-web/docs/remote_access.md` | Updated | Correct the formerly universal off-default statement: AGY new selections default on; explicit off persists. |
| `autobyteus-server-ts/docs/modules/run_history.md` | No change | Existing generic trace and external-binding descriptions remain correct after the integrated base's separate run-history update; AGY-specific caveats belong in the new runtime doc. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | No change | Provider catalog ownership remains described generically; the new AGY runtime doc covers the provider-specific catalog branch. |

## Docs Updated

| Doc path | Type of update | Why |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | New canonical module guide, revised DR-002 | Durable capsule/workspace, binding/restore, scoped MCP, permissions, event mapping, persistence and now the clean A→B browser continuation bound. |
| The six existing docs marked Updated above | Targeted cross-links/contract corrections | Keep existing module and frontend entrypoints navigable and prevent obsolete default/provider claims. |

## Durable Design / Runtime Knowledge Promoted

| Topic | Source authority | Target |
| --- | --- | --- |
| Run-owned AGY main-agent capsule versus real task workspace; exact provider conversation restore | Approved `design-spec.md`, `implementation-handoff.md`, CRR-009, API-REV-004 | `antigravity_cli_runtime.md` |
| AGY `DONE` means approved provider-step success, not verified shell exit-zero; explicit error/denial stays non-green | SR-021, ARCH-REV-003, CRR-009, API-REV-004 | `antigravity_cli_runtime.md`, frontend execution guide |
| AGY Team/Org exact member identity, scoped MCP and public projection; bounded Org stop/browser residual | API-REV-004, CRR-010 | `antigravity_cli_runtime.md`, Team/Org guides |
| AGY-only new-selection auto-execute default and explicit-off preservation | `design-spec.md`, IR-003, API-REV-001/004 | AGY runtime guide, frontend execution and remote-access guides |
| Fresh-browser same-member history focus and continuation after clean backend A→B restart | API-REV-006 final evidence, CRR-012 | AGY runtime guide, frontend execution guide |

## Removed / Replaced Components Recorded

| Old concept | New truth | Where |
| --- | --- | --- |
| Three-provider-only wording in Team execution docs | AGY is a fourth per-member provider through the existing manager/factory | Team execution and AGY runtime guides |
| Universal mobile auto-approval off default | Non-AGY remains off; new AGY selection defaults on with explicit off retained | Remote-access guide |
| IR-001 development-only neutral `completed_unverified`/`TOOL_EXECUTION_COMPLETED` AGY path | Canonical success/denial/error events; no second trace format or schema cache | AGY runtime guide; source/history remain primary truth |

## Delivery Continuation

- Result: **Pass — docs synchronized on the same integrated production base and latest API-REV-006 / CRR-012 evidence.**
- DR-003 local Electron packaging addendum: **No new long-lived docs impact.** The build changes no source/runtime contract; root/web READMEs already document the macOS build command, integrated server, output location and isolated packaged launcher. The ticket-local handoff and `electron-test-build-report.md` record this one-off unsigned test artifact instead of adding a misleading general release claim to project docs.
- Next: present `handoff-summary.md` for explicit user testing/verification. Do not archive, push, merge, tag, release, deploy, or clean ticket worktree before that signal.
- No docs-sync blocker. Residual validation limits remain visible in the handoff and delivery report.
