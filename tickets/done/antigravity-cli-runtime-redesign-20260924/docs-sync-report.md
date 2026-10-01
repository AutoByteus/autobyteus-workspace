# Docs Sync Report — AGY CLI Runtime

> **DR-008 acceptance/finalization check:** The user's explicit verification
> and request for a new release do not change the implemented runtime or
> long-lived architecture. The latest fetched `origin/personal` remains the
> same integrated base; the DR-006 SR-024 docs sync and DR-007 no-impact
> decision remain valid. Curated user-facing `release-notes.md` was finalized
> for the requested release; repository/release state belongs in the
> delivery and release reports, not the module guides.

> **Current result — DR-007 no new long-lived docs impact, pending user
> verification.** The user's generated-artifact cleanup and direct worktree
> Electron rebuild made no source, runtime, design, persisted-format or UI
> contract change. The DR-006 SR-024 docs sync below remains current. Only
> delivery-local build/handoff/revision/release-gate records changed for the
> new worktree-root DMG path and fresh checksum. No acceptance, release or
> final ticket-worktree cleanup is implied.

> **Historical DR-006 result — Pass, pending user verification.** SR-024 / IR-009
> and API-REV-009 / CRR-018 corrected the configured-skill file-link boundary
> after the user's first-prompt failure in the earlier 1.4.80 package. The
> latest tracked base remains `origin/personal@af51ffa485e1f0d6a6f312cc9dfe9cdbc2f55d48`
> already merged as `15149d03e3265bb4d8473f6a84f1447c4332d27c`;
> no newer base commit required re-integration. Delivery's affected
> AGY/Codex/Claude skill/capsule unit check passed **40/40**
> (`/tmp/agy-delivery-r6-skill-regression.log`). The SR-024 current-state
> addendum is at the end of this report. DR-001–005 text remains historical;
> no user acceptance or release is implied.

> **Historical DR-005 context:** The DR-004
> collection blocker was fixed in test code and independently reviewed
> (API-REV-008 Pass / 96%, CRR-015 Pass). Delivery merged the newer
> documentation-only `origin/personal@af51ffa485e1f0d6a6f312cc9dfe9cdbc2f55d48`
> as `15149d03e3265bb4d8473f6a84f1447c4332d27c` after checkpoint
> `642eb4f87`, then passed `prepare:shared` and the real AGY Team/Org E2E
> **2/2** (`/tmp/agy-delivery-r5-team-org.log`). The prior DR-001–004
> narrative below is historical; the SR-023 current-state addendum is at the
> end of this report. No user acceptance or release is implied.

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

## DR-005 — SR-023 large-Org correction on current integrated base

- **Result:** Pass. The latest base commit changed only another completed
  ticket's delivery records, not AGY source or tests. This branch was merged
  without conflict, and Delivery reran the exact real AGY Team/Org E2E 2/2
  after shared-SDK preparation. API-REV-008/CRR-015 separately establish the
  current-source full-size browser and backend A→B continuation bounds.
- **Long-lived docs updated now:**
  `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` describes
  one bounded async capability/model probe, safe diagnostic propagation,
  request-local complete-placement validation, lazy member conversations,
  and the browser/equivalent-backend evidence boundary;
  `autobyteus-server-ts/docs/modules/agent_orgs.md` describes the ordered
  Org validation and address-specific failure contract; and
  `autobyteus-web/docs/agent_execution_architecture.md` describes the safe
  alert/loading behavior and real-browser 18-placement check.
- **Docs reviewed with no change:** Generic server Agent execution,
  AgentTeam, MCP, run-history, and LLM management docs remain accurate; the
  new AGY-specific preflight contract is linked from the existing entrypoints
  and does not alter their generic owner or persisted format. Remote-access
  defaults and non-AGY behavior are unchanged. Root/web READMEs already
  document the macOS build and isolated packaged smoke; the one-off local
  package details belong in `electron-test-build-report.md`.
- **Replaced understanding:** The earlier serial `spawnSync` discovery on
  every equivalent Org placement is obsolete. The current implementation
  validates all placements via one request-local `validateMany` and uses an
  awaited bounded child process; it does not add a global catalog cache,
  skip validation, eagerly start all members, or promise an instantaneous
  launch. A failed catalog probe is not mislabeled as a missing model.
- **Release-note draft:** `release-notes.md` now includes the large-Org
  improvement. It remains unpublished pending explicit user verification and
  any separate release instruction. No migration is required.

## DR-006 — SR-024 configured-skill link snapshot on current base

- **Result:** Pass on the unchanged latest integrated base. `git fetch origin
  personal` found no advance beyond `af51ffa485e1f0d6a6f312cc9dfe9cdbc2f55d48`;
  no new merge or base-triggered rerun was needed. Delivery nonetheless reran
  the five relevant AGY/shared/Codex/Claude skill/capsule suites **40/40** on
  IR-009 source. API-REV-009 / CRR-018 provide the real full-Org first-turn
  and B-side continuation evidence; no report-only live rerun is inferred.
- **Long-lived docs updated:** `autobyteus-server-ts/docs/modules/agent_execution.md`
  now describes winning-source binding provenance used by AGY; the AGY runtime
  guide describes owner-specific trust roots, checked in-bound file-link
  snapshots as ordinary capsule files, fail-closed unsafe links/collisions,
  `NONE`, immutable restore, and the exact actual Solution Designer Org
  first-prompt/browser result with the backend-A shutdown anomaly preserved.
  `release-notes.md` includes the improvement but is not published.
- **Docs reviewed with no SR-024 change:** AgentTeam/AgentOrg topology guides,
  generic LLM/catalog/run-history docs, web execution guide and README build
  instructions remain accurate. SR-024 changed server-side skill binding and
  capsule materialization, not Org topology, model selection, frontend UI,
  package command, persisted format or non-AGY materializer policy.
- **Replaced understanding:** The earlier AGY blanket symlink rejection is
  obsolete. It is not replaced with unchecked recursive dereferencing: only
  regular file links resolving inside the winning source's trusted root are
  copied; other link types and escaping sources fail closed. A team-local
  private skill may use its owning Team `shared/` directory, whereas a global
  fallback never borrows Team authority. No source/workspace overwrite or
  persisted-data migration is required.

## DR-007 — direct-worktree rebuild docs decision

**No long-lived docs change required.** The current server AGY/Agent execution
guides and web/Org guides still describe the same IR-009 source behavior on
the unchanged integrated base. The user requested only removal of generated
local Electron outputs and a fresh package in the worktree's ordinary
`electron-dist/` directory. Root/web README build instructions already name
that output location and the isolated packaged E2E path; no general procedure
changed. The current DMG path, SHA-256, official-app isolation and removed old
artifact status belong in `electron-test-build-report.md` and
`handoff-summary.md`, not permanent architecture documentation. The release
note draft remains unpublished and unchanged in this round.
