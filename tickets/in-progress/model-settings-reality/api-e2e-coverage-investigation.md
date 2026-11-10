# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md).

## Investigation Meta

- Requirements Doc: [requirements-doc.md](requirements-doc.md) (SR-002, Approved)
- Investigation Notes: [investigation-notes.md](investigation-notes.md)
- Solution Revision Record: [solution-revision-record.md](solution-revision-record.md) (SR-001..SR-003)
- Design Spec (required on every route): [design-spec.md](design-spec.md) (SR-003, Ready)
- Supplemental Task Artifacts: [evidence/probe-results-2026-11-10.md](evidence/probe-results-2026-11-10.md), [probes/](probes/) (starting points: `prb-sdk-off.mts`, `prb-cli-update.mts`, `probes/rendered/model-list-refresh-probe.mjs`); no behavior-defining supplements
- Design Review Report: [design-review-report.md](design-review-report.md) (ARCH-REV-002 Pass, IG-1..IG-3)
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Implementation Handoff: [implementation-handoff.md](implementation-handoff.md) (IR-002; checks IMP-01..IMP-07)
- Implementation Revision Record: [implementation-revision-record.md](implementation-revision-record.md)
- Code Review Report: [code-review-report.md](code-review-report.md) (CRR-002 Pass, round 2)
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Delivery Revision Record (delivery re-entry only): N/A — not applicable
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): [api-e2e-revision-record.md](api-e2e-revision-record.md)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer handoff, implementation review passed (CRR-002), 2026-11-10; code commit `817bd9950`, documents and evidence `c491a79bb`
- Prior Investigation Reviewed: N/A (first round of this ticket)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Task autobyteus-9 (`Large` / `High`, confirmed by the implementation and the code review) makes every shown model setting real and its default the provider's (Part A), keeps undeclared stored settings away from providers and new runs (Part B), syncs the LLM docs (Part C) and lets every model picker re-read its runtime's list on open and on demand with actionable refusals (Part D). Acceptance criteria AC-001..AC-013 and QR-001..QR-003 are the proof target; the critical ones are the user-visible and provider-visible behaviors:

| Group | AC | What must be proven, and where it can fail |
| --- | --- | --- |
| Claude on the AutoByteus runtime | AC-001, AC-002, AC-003, AC-004 | the provider request (Opus 5 Off = `disabled`, no effort; Fable 5/5.1 effort only with a stored Off resuming; switch rows default On; Off never rejected) and what the menus show |
| Claude Agent SDK runtime | AC-005, AC-006 | no `thinking` reaches the CLI; effort only; an unchosen effort sends nothing; a stored Off + `xhigh` resumes with effort `xhigh` |
| Declared settings only | AC-007, AC-008, QR-003 | adapters send only declared keys; a new standalone agent/team run stores only declared keys with no runtime catalog read (≈2.3 s Claude spawn) |
| Docs | AC-009 | grep |
| Model-list refresh | AC-010, AC-011, AC-012, QR-001, QR-002 | a model the runtime starts offering while the app runs is listed on the next picker open and on Refresh, in the new-run picker and in a stopped Team member / delegated copy switched to the SDK runtime; a failed read keeps the last list; concurrent reads coalesce |
| Refusals | AC-013 | "not offered" and "list could not be read" texts, outcome `MODEL_LIST_UNAVAILABLE`, nothing saved |

Preserved behaviors (must still hold): BEH-004, BEH-011, all-or-nothing Save, anthropic effort levels/defaults, validated paths storing canonical selections, runs naming a removed model keep the unavailable-model state, every saved run and definition keeps launching and resuming (Persisted Data Transition: `Directly Usable — No Migration`).

Handoff signals read: Legacy / Compatibility Removal Check = no compatibility mechanism, no legacy retained; Persisted Data Transition Check = `Directly Usable — No Migration`, no deviation. Both consistent with the code diff (`git diff fd0eb664c..817bd9950`, 108 files). Known non-change failures the reviewer listed (not counted against this change, but each cause is re-checked here): web `projectRunsStore.spec.ts` (FU-005), five server unit files (chmod as uid 0, missing jsdom), two autobyteus-ts `run-bash` chmod tests.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001..SCN-008 (all `Supported Normal Scenario`).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - **SCN-009 (new):** a Claude Code update/swap while the app runs changes the model list for the Claude Agent SDK runtime; trigger: the user opens the model picker (or chooses Refresh models). Covered by API-11/API-12.
  - **SCN-010 (new):** the runtime's CLI breaks while the app runs (the Claude CLI exits non-zero); trigger: the user opens a picker, or presses Save in a stopped run's settings. The AC-013 alternate. Covered by API-11, API-12, API-07.
  - **SCN-011 (new):** switch a stopped Team member to the SDK runtime and back (A → B → A), TESTING.md Rule 10, because the model list used for the saved selection is the target runtime's. Covered by API-12.
  - **SCN-012 (new):** an untouched model setting at launch from the real catalog (Opus 5, Fable 5, an SDK model): what the user sees must equal what is sent. Covered by API-13 (UI on the real catalog) plus API-02 (provider side).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Opus 5 Off = `disabled`, no effort | Changed | PRB-A2; IMP-01/02 | Reuse IMP-01/IMP-02 (autobyteus-ts source unchanged since); no new case |
| BEH-002 Fable 5/5.1 effort-only, stored switch inert | Changed | PRB-A2/A3; IMP-02 | Reuse; the UI side (no Off in menu) on the real catalog: API-13 |
| BEH-003 switch rows default On | Changed | SRC-005; IMP-01 | Reuse IMP-01; UI default on real catalog API-13; gated live suite `autobyteus-claude-5-5-live` C55-E2E-001 updated, never run: API-06 |
| BEH-004 Off never fails on Sonnet/Haiku | Preserved | PRB-A2; IMP-02 | Reuse IMP-02 |
| BEH-005/006 SDK effort only, no `thinking`, no default | Changed | PRB-A1; unit tests only | Live SDK session through the real CLI: API-09 (AC-005, AC-006); UI "Default": API-13 |
| BEH-007 only declared keys reach providers | Changed | IMP-01 per-adapter request captures | Reuse IMP-01 |
| BEH-008 new runs store declared settings, no catalog read | Changed | unit tests (projection, provisioning, team) | Real launch with real GraphQL, stored file, CLI-spawn count and timing: API-10 (AC-008, QR-003) |
| BEH-009 docs synced | Changed | IMP-06 | Reuse IMP-06; re-run the grep at HEAD in API-01 |
| BEH-010 pickers re-read on open/on demand | Added | IMP-04 unit tests; IMP-05 fixture-page probe (probe-owned GraphQL) | Real server + real Claude CLI swap: API-11 (AC-010, AC-011), API-12 (AC-012), locked menu API-14 |
| BEH-011 fresh server reads | Preserved | PRB-D3 | Proven again by API-11 (server read follows the swap) |
| BEH-012 refusals actionable; unreadable list distinct | Changed | unit per site | GraphQL boundary per site type: API-07; in the app: API-12 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `projectRawLlmConfig`/`LLMFactory`, Anthropic policy/adapter, new-run projection, catalog empty-list rule, `RunModelSelectionService` result kinds + refusal owner | IMP-01 (autobyteus-ts unit), IMP-03 (server unit), IMP-02 live Anthropic | new-run launch measured only by unit tests (QR-003 timing, stored file) | Live API (API-10) |
| API / transport / contract | Yes | GraphQL outcome `MODEL_LIST_UNAVAILABLE` on stopped-run Save mutations; `providerModelCatalogSnapshots`/`runtimeCurrentModelDescriptors` now error on an empty external list | unit tests with fake validators; `stopped-run-model-config-graphql.e2e` covers only `MODEL_UNAVAILABLE` on the AutoByteus runtime | the new outcome through the real resolver and a real (or faked-at-CLI) runtime list | Durable server e2e (API-07) |
| Frontend component / state | Yes | store refresh/coalesce, pickers, locked-menu reload, thinking adapter | IMP-04 (5572 web tests), IMP-05 fixture page | real catalog payload; real Claude list change | Browser real stack (API-11/12/13/14) |
| Browser integration / user journey | Yes | new-run picker, chat menu, run-settings Team menu | IMP-05 against probe-owned GraphQL (no real server) | whole journey against a real node; locked menu never rendered | Browser real stack |
| Authentication / session / permissions | No | node credential path untouched | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | the same Vue components in the Electron renderer | as above | — | Real-stack browser journey (web-equivalent) |
| Desktop shell / Electron-specific integration | No | no Electron main/preload/IPC/window code changed (`git diff --name-only fd0eb664c..817bd9950` has no `autobyteus-web/electron/**`) | `test:electron` unaffected | embedded-server environment passes only a system baseline (see Not Tested) | None required; see Not Tested row |
| Process / lifecycle | Yes | Claude CLI spawn per list read; no read at run creation | unit (projection has no catalog dependency) | actual spawn count at launch | CLI-spawn log wrapper (API-10) |
| Persisted-data transition | Yes (direct use) | stored `llmConfig` of runs/definitions read through projection | IMP-02 resume of stored Fable 5 Off+max; `autobyteus-anthropic-stored-config-*.e2e` | stale SDK `thinking_enabled`/`medium` configs resuming on the SDK runtime | API-09 (stored `{thinking_enabled:false, reasoning_effort:'xhigh'}`) |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Anthropic API (AutoByteus runtime); Claude Code CLI via Claude Agent SDK | IMP-02 live | the Claude CLI's real list and options | Live (API-09/API-11) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality` (branch `codex/model-settings-reality`, code `817bd9950`, HEAD `c491a79bb` + uncommitted code-review documents)
- Project type and runtime stack: pnpm monorepo; `autobyteus-ts` (library), `autobyteus-server-ts` (Fastify/GraphQL server), `autobyteus-web` (Nuxt + Electron); Node 22.23.3, pnpm 10.28.2 via `corepack` (no `pnpm` on PATH; shim `/tmp/pnpm-shim/pnpm`), Linux arm64 container, uid 0
- Project testing guideline path(s): `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality/TESTING.md` (root; no closer `TESTING*.md`). It exists, so no new `TESTING.md` is created by this validation; it is not changed unless the run teaches a rule for every future task (decided at the end).
- Conflicting, missing, or unclear project instructions:
  1. TESTING.md "A full product journey still needs the actual isolated Electron worktree build" vs. this container: the worktree has no Electron build, the host has no Xvfb/xauth (`command -v Xvfb xvfb-run` finds nothing), the container runs uid 0 and an Xvnc display `:99` belongs to the host user's desktop session. The AC-010/AC-012 verification intent names "isolated Electron". The change touches no shell code, so the surface chosen is the project's own real-stack browser-probe pattern (`autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs`: real Chrome via playwright-core → real Nuxt dev → real `dist/app.js` → real Claude CLI catalog, owned data root, sanitized environment). Recorded as a deviation with its confidence consequence in the report.
  2. Project probes `delegated-launch-defaults-probe.mjs`, `settings-saved-model-refresh-cases.mjs` and others are written for "graphical macOS" isolated Electron; they are not runnable here (recorded in Not Tested).
- Changed build-input paths (guideline list vs `git diff --name-only fd0eb664c...HEAD`): `None` (no `package.json`, lockfile, `tsconfig*`, `scripts/**`, workflow, Prisma, contract-package or `autobyteus-web/generated|build|nuxt.config.ts` change; no new cross-package import in type-checked files). Fresh-start build case: not required.
- Required environment variables or secrets available: `Yes`: `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (`provider.anthropic.api-key` CONFIGURED; other provider keys missing, not needed). Live gates: `RUN_LIVE_PROVIDER_TESTS=1`, `AUTOBYTEUS_LIVE_STRICT=1`, `RUN_CLAUDE_E2E=1` per suite.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `AGENTS.md` (root) | Repository rules | Read `DESIGN.md`/`TESTING.md`/`RELEASE.md`; real keys only via the test vault (`AUTOBYTEUS_TEST_VAULT`), never from `.env`/environment |
| `TESTING.md` | Test layers, environments, rules | Rule 2: never test the user's running app (port 8000, pid 38809; not touched); Rule 4 vault; Rule 9 find causes; Rule 10 runtime switch there and back; server unit isolation sanitizes env; E2E folders and live suites need a clean env (`env -i PATH HOME TMPDIR`); a probe-owned backend needs `AUTOBYTEUS_ALLOWED_ORIGINS` + launch owner credential; web probes use `fixtures/probe-node-access.mjs`; mobile (`/mobile`) renderer behavior needs a `test:e2e:mobile-shell` case |
| `docs/isolated-app-instances.md` (Linux) | Isolated Electron on Linux | needs Xvfb + unprivileged UID + a current `build:electron:linux`; none present here (see above) |
| `autobyteus-server-ts` tests/e2e helpers (`startBuiltTestServer`, `studio-runtime-test-server`) | server E2E harness | in-process Studio server and built-server variants with owned runtime root/database |
| `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs` | probe credentials | `withNodeCredential(env)`, `attachToProbeProcess()`, `attachToBrowserContext(context)` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Builds of this worktree | worktree root | `PATH=/tmp/pnpm-shim:$PATH corepack pnpm -C autobyteus-ts build && corepack pnpm -C autobyteus-server-ts build` (done at HEAD code `817bd9950`, 13:36–13:37 UTC) | serial; before any probe that runs `dist/app.js` | `dist/app.js` timestamp newer than the commit | none (build outputs untracked; stage explicitly) |
| Owned backend | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free ≥18000> --data-dir <owned temp>/data` with `env -i`, throwaway `HOME`, `AUTOBYTEUS_TEST_VAULT`, `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL`, `AUTOBYTEUS_ALLOWED_ORIGINS`, `CLAUDE_CODE_EXECUTABLE_PATH=<owned symlink>`, `ANTIGRAVITY_CLI_COMMAND=<agy-failure-cli.mjs>` | never the user's `8000` node or `/home/autobyteus/data` | `GET /rest/health` | SIGTERM the process group; delete the owned temp root |
| Owned Nuxt dev frontend | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:<backend> nuxt dev --host 127.0.0.1 --port <free>` (probe starts it) | cold start re-optimizes dependencies | the page route answers | SIGTERM the group |
| Headless Chromium | — | `playwright-core` + `/usr/bin/chromium`, owned context | — | page loads `/chat` | close browser |
| Claude CLI swap fixture | owned temp | symlink `claude-under-test` → bundled CLI `…/@anthropic-ai/claude-agent-sdk-linux-arm64/claude` (2.1.280), later → `/usr/bin/claude` (2.1.322); `CLAUDE_CODE_EXECUTABLE_PATH` points at the symlink; a failing script variant for SCN-010; an argv/timestamp logging wrapper for API-09/API-10 | PRB-D3 technique; identifiers differ per CLI (`opus[1m]` → `opus`) | `<link> --version` | delete the owned temp root |
| Scripted AGY CLI | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | `ANTIGRAVITY_CLI_COMMAND=<absolute path>` | starts Team members and delegated copies without provider calls (TESTING.md "Runtimes without a model") | `--version` exit 0 | none |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team definitions and runs | GraphQL mutations and UI of the owned backend | data root `/tmp/api-e2e-msr-*/data`, never `~/.autobyteus` | delete root; evidence kept |
| Claude auth for the CLI | api-key mode: the server resolves `provider.anthropic.api-key` from the test vault; CLI config dir under the owned temp root | no login file of the user is read or written | delete root |
| Stored configs for resume/launch checks | submitted through public GraphQL, never by editing files | synthesized shapes `{thinking_enabled:false, reasoning_effort:'xhigh'}`, `{reasoning_effort:'low', thinking_display:'omitted'}` as in the requirements | delete root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (run/definition/application `llmConfig`); launch-source fallback reasons `Not Affected`.
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision" (DEC-D1); implementation-handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: stored Fable 5 `{thinking_enabled:false, reasoning_effort:'max'}` (resumes, live: IMP-02 reused); stored SDK `{thinking_enabled:false, reasoning_effort:'xhigh'}` (API-09: effort `xhigh`, no `thinking`, no failure); stored AutoByteus Opus 5 explicit Off keeps meaning Off (IMP-02); a definition default holding an undeclared `thinking_display` (API-10: stored without it, launch works).
- Evidence planned for the approved direct-use outcome: API-09, API-10, reused IMP-02; no migration case.
- Migration-specific completion/recovery scenarios: N/A (not `Migration Required`).
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/**` (new `llm-factory-declared-settings.test.ts`, updated anthropic/policy/factory/config-overrides/catalog tests) | request shapes, projection, defaults | AC-001..004, AC-007 | Still Valid (reused, IMP-01: `Tests 2 failed \| 2129 passed`, two uid-0 chmod failures) | autobyteus-ts source unchanged since `f31fa1821` | Reuse |
| `autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts` (live) | live: Opus 5 Off 0 thinking tokens; Fable 5/5.1 stored Off + max resume; Off per switch row | AC-001, AC-002, AC-004 | Still Valid (reused, IMP-02: 28/28) | source unchanged since `d741d4340` | Reuse |
| `autobyteus-server-ts/tests/unit/**` changed by the diff (projection, refusal, selection service, catalog service, availability, validator, team/agent creation, session config, normalizer, client) | per-unit behavior | AC-005..AC-008, AC-013 | Still Valid; re-run at HEAD | IMP-03/IMP-07 | API-03 reruns the server unit suite at HEAD |
| `autobyteus-server-ts/tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` | stopped agent/team Save through GraphQL on the AutoByteus runtime; `MODEL_UNAVAILABLE` for an unknown model | AC-013 (not-offered kind), preserved all-or-nothing Save | Still Valid (asserts `outcome`, not message text; unchanged semantics for AutoByteus). It has no case for `MODEL_LIST_UNAVAILABLE` or the SDK-runtime switch | read | Run in API-07a; add a sibling case in the new test |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` (DCM-001..009, AGY scripted) | delegated copy Save/refusal through real GraphQL/WS | AC-012, AC-013 | Still Valid; asserts outcome only; includes AGY→Grok switch (DCM-009) but no target runtime whose list changes | read | Run in API-07a; extended by the new test (API-07) |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts`, `...-edit-launch.e2e.test.ts` | stored AutoByteus Claude configs (incl. stale `thinking_display`) resume/edit/launch | preserved persisted-data behavior; REQ-007/008 | Assertions Still Valid; **Needs Update (setup)**: their own `fetch` carried no node credential (401 on every GraphQL call) | API-05 first run: 20 failed | Baseline fix (credential header) in this round; rerun passes 29/29 with the availability/agent-runtimes suites |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts` (gated live) | C55-E2E-001: catalog toggle default now `true`, schema keys, live replies | AC-003, AC-004 | Needs Update was done by implementation (`.default).toBe(true)`); its header still said "toggle default off" (fixed here); its harness `gql()` carried no node credential (baseline fix) | diff `fd0eb664c..817bd9950`; API-06 first attempt | Run live in API-06 (001–005): Pass after a provider-behavior rerun |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts` | live caching with `{thinking_enabled:true}` / `{}` for Opus 5.5 | preserved | Still Valid (explicit values; Opus 5.5 has no switch) | read L80 | Not rerun (no behavior it exercises changed; reads explicit config) — decision recorded in Cases as `Not Tested` unless cheap |
| `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` T01–T03 (real Nuxt + real `dist/app.js` + real Claude SDK catalog) | T01 filters Claude **SDK** models with `thinking_enabled` + `reasoning_effort`; asserts the merged Off/Low…Max thinking menu, a fresh draft records `thinking_enabled:false`, launch at High records `{thinking_enabled:true, reasoning_effort:'high'}`; T03 Off launch + Advanced effort edit | AC-005/AC-006 now say the SDK runtime has no on/off switch, no default effort | **Needs Update (confirmed by API-08a)**: `T01 Fail ... No Claude SDK model with thinking_enabled + reasoning_effort in the catalog` — the premise REQ-005 removed | API-08a log | Done: T01–T03, T06, T07 retargeted to the AutoByteus Claude switch row (default On, AC-003); T08 (SDK effort-only menu) and T09 (all seven AutoByteus Claude rows) added; API-08b/c/d pass |
| `autobyteus-web/tests/e2e/*` other probes that read `thinking_enabled`/model menus (`existing-run-model-config-probe`, `run-settings-live-probe`, `delegated-launch-defaults-probe`, `settings-saved-model-refresh-cases`) | stopped-run settings, saved refresh | AC-012 area | Unclear → Out Of Scope for execution here: written for graphical macOS isolated Electron (their headers); `rg "thinking_enabled\|Model options for\|unavailable; saved"` finds no stale assertion in them | rg 2026-11-10 | Not run (platform); recorded in Not Tested |
| `autobyteus-web/**/__tests__` (changed by the diff: store refresh, pickers, locked refresh, thinking adapter…) | unit/component | AC-010, AC-011, QR-001/002 | Still Valid (IMP-04/IMP-07: `Tests 1 failed \| 5564 passed`, the 1 is FU-005) | IMP-07 | Reused; rerun only a changed spec |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`test:e2e:mobile-shell`) | phone bundle journeys | TESTING.md: renderer behavior the phone also offers is proven on the phone bundle | Unclear for this change (is the new-run model sheet in it?) | inspect in API-15 | decided in API-15 |

## Planned Cases

Narrowest first. IDs are reused across rounds. `API-nn` are this validation's cases; reused implementation checks keep their `IMP-nn` name inside the row.

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Kind | Planned Command Or Steps (for `Reused`: the implementation check ID) | Why (Temporary Probe: why not durable; `Reused`: why it still holds) |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..004, AC-007, AC-009 | autobyteus-ts unit + docs grep | Reused | IMP-01 (`Tests 2 failed \| 2129 passed`, both uid-0 chmod; tsc 0), IMP-06 (grep exit 1); re-run the grep at HEAD | `git diff --name-only f31fa1821 817bd9950 -- autobyteus-ts` is empty; docs unchanged since |
| API-02 | AC-001, AC-002, AC-004 | live Anthropic API through `LLMFactory` (all Claude rows) | Reused | IMP-02 (`Tests 28 passed (28)`) | autobyteus-ts source/tests unchanged since `d741d4340`; the live result stands |
| API-03 | AC-005..AC-008, AC-013 | server unit/arch at HEAD | Existing Test | `env`-sanitized: `PATH=/tmp/pnpm-shim:$PATH corepack pnpm -C autobyteus-server-ts exec vitest run tests/unit tests/app-data-migrations tests/architecture tests/agent-work-journal --exclude "**/*.integration.test.ts" --no-watch` | IMP-03 ran at `40b9d79e1`; two later server source commits (`0129c7314`, `817bd9950`) touched files this suite exercises; one run at HEAD gives my own record and re-checks each "environmental" failure's cause |
| API-04 | QR-001, QR-002, AC-003, AC-010, AC-011, REQ-010..013 | web unit/component + typecheck + guards | Reused | IMP-07 (web `Tests 1 failed \| 5564 passed`; web and server typecheck PASS; guards) | IMP-07 ran on the working tree committed as `817bd9950`; `git diff --name-only 817bd9950 HEAD` is tickets only |
| API-05 | persisted data; REQ-007, REQ-008 | built-server e2e: stored Anthropic configs resume/edit/launch | Existing Test | `env -i PATH HOME TMPDIR`, `corepack pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts tests/e2e/runtime/autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts --no-watch` (+ `AUTOBYTEUS_TEST_VAULT` only where the suite names a live gate) | these assert the persisted-data and stopped-Save contracts the change must preserve, on server code the change touched |
| API-06 | AC-003, AC-004 | gated live server suite | Existing Test | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_…=1 … vitest run tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts --no-watch` (gate named in its header) | updated by the implementation (default `true`) and never run |
| API-07 | AC-012 (server side), AC-013, REQ-010, REQ-012, REQ-013, SCN-010 | built/in-process server GraphQL, deterministic Claude CLI whose model list is switchable | Durable (new) | new e2e (path chosen after reading the harness; see Durable Coverage To Add): stopped agent / Team member / delegated copy saved onto the Claude Agent SDK runtime: (a) model not offered → `MODEL_UNAVAILABLE` + "…is not offered by Claude Agent SDK now… Refresh the model list and choose again. Saved settings were not changed."; (b) the CLI starts offering it → Save succeeds, stored selection names it; (c) CLI failing → `MODEL_LIST_UNAVAILABLE` + "The model list of Claude Agent SDK could not be read: Claude Agent SDK returned no models. Try again. Saved settings were not changed."; metadata file unchanged after (a) and (c) | the GraphQL outcome and texts have only fake-validator unit tests; a switchable fake CLI is deterministic, credential-free and repeatable |
| API-08 | AC-005/006 UI premise; regression of the composer probe | web real-stack probe `chat-composer-polish-probe.mjs` | Existing Test → Needs Update | (a) `corepack pnpm -C autobyteus-web test:e2e:chat-composer-polish --cases T01 --output-dir <fresh>`; (b) retarget T01–T03 to a switch row, T04 to the SDK effort-only menu, rerun T01–T04 | see inventory: premise removed by REQ-005 |
| API-09 | AC-005, AC-006, persisted data | live Claude Agent SDK session, real CLI, test vault; argv/options of the CLI the SDK started | Durable (new, gated) or Temporary Probe (see why) | start from `probes/prb-sdk-off.mts`; run a real SDK-runtime agent run through the server's Claude backend with stored `{thinking_enabled:false, reasoning_effort:'xhigh'}`; capture what the CLI is started with (logging wrapper) and the result: effort `xhigh`, no thinking option, no failure; second run with no effort: no effort option | design says "live SDK session test"; durable if the harness `claude-live-agent-harness.ts` accepts a stored `llmConfig` and CLI path; otherwise a ticket probe with the reason recorded |
| API-10 | AC-008, QR-003, REQ-008 | real GraphQL launch on the built server (agent + Team) | Durable (new) or Journey | `createAgentRun` / `createAgentTeamRun` with `{reasoning_effort:'low', thinking_display:'omitted', thinking_enabled:false}` on the SDK runtime and on an AutoByteus Claude row; read the stored `llmConfig` via `getAgentRunResumeConfig` / `getTeamRunResumeConfig`: `{reasoning_effort:'low'}` (SDK) / canonical declared keys (AutoByteus); CLI-spawn log and mutation time: no `supportedModels` read added | QR-003 is a measurement, not a unit assertion |
| API-11 | AC-010, AC-011, QR-001, QR-002, REQ-010, REQ-011, REQ-014; SCN-007, SCN-009, SCN-010 | real stack browser: new-run launch picker and chat model menu, SDK runtime, real CLI swap | Journey | probe-owned stack; `CLAUDE_CODE_EXECUTABLE_PATH` → symlink; open the SDK runtime's list (bundled CLI 2.1.280), swap the link to `/usr/bin/claude` 2.1.322 **without restarting anything**; reopen the picker: the new model rows appear (`claude-sonnet-5-5`, `claude-haiku-5-5`…); the open list stays usable while reading; Refresh models re-reads; a broken CLI keeps the last list with the error and Retry; select the new model and launch | the AC's realistic check; web-equivalent renderer |
| API-12 | AC-012, AC-013; SCN-008, SCN-011 | real stack browser: stopped Team run, member and delegated copy switched to the SDK runtime | Journey | AGY-scripted Team run (+ delegated copy through the agent tool), stop; open the member's run settings, switch runtime to Claude Agent SDK, open the model picker (bundled CLI), swap CLI, reopen/Refresh, pick the new model, Save: "Saved…" and stored selection (`getTeamRunResumeConfig`) names it; Save of a model the CLI no longer offers and with the CLI failing: the two refusal texts appear, nothing stored; switch back to the AGY runtime (A→B→A) and Save | the user's journey (ASM-001) and Rule 10 |
| API-13 | AC-002, AC-003, AC-005, AC-006 (UI on the real catalog) | real stack browser: composer/launch menus from the real server catalog | Journey | AutoByteus runtime Opus 5 (menu has Off; default On), Fable 5 / 5.1 (no Off), Sonnet 5.5; SDK runtime model (effort-only menu, "Default", Thinking on and not switchable, nothing written until a level is chosen); the draft `llmConfig` from the store | IMP-05 used probe-owned GraphQL; the real catalog payload is the gap |
| API-14 | REQ-010, REQ-011, QR-001; the saved-run menu | real stack browser: saved-run (locked) Team-settings model menu | Journey | stopped Team run (from API-12): open Team settings → member model menu (runtime locked): refresh on open, "Refresh models" busy state, failed read keeps the options with the error, success | component specs only so far (handoff item 4) |
| API-15 | TESTING.md phone rule | `/mobile` bundle (`test:e2e:mobile-shell`) | Decide, then Journey or Not Tested | read `mobile-shell-probe.mjs`; if a new-run model sheet case exists or can be added cheaply, run it; otherwise record `Not Tested` with the reason | the diff changes `MobileChoiceSheet`/`MobileRuntimeModelRows` |
| API-16 | AC-013 text in application launch | server unit (validator) | Reused | IMP-03/IMP-07 (`application-launch-host-capability-validator.test.ts`) | no GraphQL application-launch e2e harness for the Claude list; the validator unit asserts both texts |
| API-17 | AC-009 | docs grep at HEAD | Existing Test | `rg -n "gemini-3.5-flash\|kimi-k2" autobyteus-ts/docs` | split out of API-01 so its result is its own |

- Sub-IDs added while running: API-03b (server typecheck gate after my test changes), API-05b (availability suite alone, before/after the baseline fix), API-08a..d (composer probe: before update, updated run, T01 rerun, T09).
- Test progress log needed (more than one case, or a case that runs long): `Yes` ([api-e2e-test-progress.md](api-e2e-test-progress.md))

## Durable Coverage To Add

Final paths (the plan's alternatives are decided):

| Case ID | Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-07 | `autobyteus-server-ts/tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` (MSR-001), `autobyteus-server-ts/tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` (DCM-010), `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` (`claude-models` state) | the new GraphQL outcome and the refusal texts had only fake-validator unit tests; a scripted `claude` whose list changes while the server runs is deterministic and credential-free |
| API-09, API-10 | `autobyteus-server-ts/tests/e2e/runtime/claude-agent-effort-only-live.e2e.test.ts` (gated `RUN_CLAUDE_E2E=1`) | AC-005/AC-006's live proof and RSK-001 re-measurement on SDK upgrades; reads the CLI arguments through a logging wrapper |
| API-10 | `stopped-run-model-config-graphql.e2e.test.ts` (MSR-002) | AC-008 for a new agent run and a new Team run through real GraphQL |
| API-14 (after the fix) | a durable web probe case with a scripted `claude` CLI (`agent-runtimes-fake-cli.mjs` + `claude-models`), in the rerun round | the locked-menu failure has only component specs; the real-CLI journey is not portable as a package script (needs two CLI versions) |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-08 | `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` T01–T04, T06, T07 | retarget the merged-thinking-menu cases to an AutoByteus-runtime Claude switch row with default On; add T08 (SDK effort-only) and T09 (all AutoByteus Claude rows); pass the test vault through to the owned backend when set | done; the removed assertions are listed in the report |
| API-05 | the four rotted e2e suites and two harnesses named in the report | attach the test launch credential to the suites' own GraphQL calls; scan regular files only | baseline fixes (TESTING.md Rule 9), their own commit |
| API-06 | `autobyteus-claude-5-5-live.e2e.test.ts` header | "toggle default on" | done |

## Durable Coverage To Remove

None planned. A removal is considered only for an assertion that the approved requirements made obsolete, and only after the replacement is recorded here.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron (the AutoByteus desktop app) over the same Nuxt renderer; the embedded server is the same `dist/app.js`.
- Testing guideline, README, or development instructions used: `TESTING.md` (Choosing the path; Environment-specific setup: headless Linux and containers; Browser probes; Rules 1–10), `docs/isolated-app-instances.md#linux`.
- Web-equivalent behavior: everything this change delivers: pickers, menus, stores, GraphQL results and texts (renderer + server).
- Shell-specific or lifecycle behavior: none changed (no Electron main/preload/IPC/window/updater file in the diff).
- Chosen validation approach and why it fits the project: the project's real-stack browser-probe pattern (real Chrome → real Nuxt dev → real `dist/app.js`), because the isolated Electron instance cannot be run safely here: Electron must not run as root and no unprivileged build, display or Xvfb exists in this container (installing system packages or borrowing the user's `:99` desktop session is not routine test setup). The surface proves the web boundary the change touches; it does not prove desktop-shell behavior, which this change does not alter.
- Server/frontend setup when browser validation is used: owned backend (`dist/app.js`, owned data root, free port, sanitized env, test vault, owner credential, allowed origin), owned Nuxt dev with `BACKEND_NODE_BASE_URL`, owned headless Chromium.
- How the run avoids disturbing an already-running desktop application: the user's app on port 8000 (pid 38809) and `/home/autobyteus/data` are never touched; every owned process uses free ports ≥ 18000, an owned temp root and a throwaway `HOME`; `pgrep`/`ss` before and after.
- Known difference from Electron: the embedded server of an isolated instance receives only a system-baseline environment (`CLAUDE_CODE_EXECUTABLE_PATH` does not pass through), so the CLI swap through an isolated Electron instance would need a PATH-discovered symlink, a technique that was not exercised here. Recorded as a residual (Not Tested).

## Live Environment And Fixture Plan

- Startup order and commands: build (done) → owned temp root → CLI fixtures → backend → Nuxt dev → Chromium; one heavy run at a time (TESTING.md).
- Environment choices that materially affect the run: `env -i` baseline; `AUTOBYTEUS_TEST_VAULT` for the Anthropic key; `CLAUDE_CODE_EXECUTABLE_PATH` → owned symlink; `CLAUDE_CONFIG_DIR` owned; `ANTIGRAVITY_CLI_COMMAND` → the scripted AGY CLI; `AUTOBYTEUS_ALLOWED_ORIGINS`; `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL`.
- Health / readiness checks: `/rest/health`; the Nuxt route; `claude-under-test --version`.
- Seed data / fixtures: definitions, Team definition, Team run and delegated copy created through GraphQL / the UI only.
- Test identities, authentication, permissions, or session state: owner credential in probe requests and the browser context; Anthropic key from the test vault only.
- Requirement-linked journeys or scenarios: API-11..API-14.
- DOM, screenshot, log, API, process, or other evidence to capture: DOM assertions (row ids, text, `data-test` states), stored metadata via GraphQL, backend log lines, CLI wrapper log (argv, timestamps), screenshots as support.
- Owned processes and temporary state to clean up: backend, Nuxt dev, Chromium, symlinks, wrapper scripts, owned temp root, any fixture page installed under `autobyteus-web/pages` (none planned).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Isolated Electron worktree build journey | no Electron build/Xvfb/unprivileged display in this root container; the change has no shell code | an Electron-only difference in the embedded server's environment (CLI discovery) is not exercised | No (an environment owner can run `isolated-app` on a host with a graphical session) | recorded for delivery; confidence consequence in the scorecard |
| Project probes written for graphical macOS Electron (`delegated-launch-defaults-probe` DCP/SSR cases etc.) | platform | the saved-run flows they cover are covered by API-12/API-14 on the real stack | No | none |
| Non-Anthropic live providers (Gemini/OpenAI/Mistral/Ollama) | keys not in the vault; AC-007 is per-adapter request capture, a unit proof | live provider acceptance of a projected request | No | none (not required by AC-007) |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| None at investigation time. A stale durable probe (`chat-composer-polish-probe.mjs`) was an API/E2E-owned coverage update (`Local Fix`, mine), done | Local Fix (API/E2E) | API-08a | api_e2e_engineer |
| **Found by API-14:** the saved-run (runtime-locked) model menu empties its options and shows no error/Retry when the runtime list cannot be read; the saved model shows as "No longer offered" (REQ-010, REQ-011, QR-001; AC-010 alternate outcome) | Local Fix (web) | execution report API-14; `probes/locked-menu-failed-refresh.repro.spec.ts` (fails today); `evidence/API-11-12-14-real-stack/` | implementation_engineer, after failure-origin review |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: API-07, API-09/API-10; updated: `chat-composer-polish-probe.mjs`; removed: none)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: plan revised in place after round 1; deviations (surface, added cases, API-15 not run, ticket-owned journey probe) are listed in the report. TESTING.md is unchanged by this validation: the findings (rotted e2e suites without a node credential; Claude Code's option cache changing identifiers between reads) are fixes and probe details, not rules every future task needs.
