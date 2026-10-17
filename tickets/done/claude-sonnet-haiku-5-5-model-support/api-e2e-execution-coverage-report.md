# API/E2E Execution Coverage Report

## Execution Round Meta

- Current round: `API-REV-003`. Its section "Round API-REV-003" below holds the current authoritative result; the sections up to "Latest Authoritative Result" record the API-REV-001 baseline.
- Package: `claude-sonnet-haiku-5-5-model-support`; baseline round `API-REV-001`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support`, `codex/claude-5-5-model-support`
- Implementation validated: `22c3c89fa` (IR-001). Durable test commit added by API/E2E: `30541612c`.
- Credentials: `ANTHROPIC_API_KEY` from `/Users/normy/.autobyteus/server-data/.env`, as the user directed. Server E2E got it as an env var of a clean `env -i` command; the browser probe's owned DB got it through the documented importer. The key was never logged, and a grep of all evidence for the key value found nothing.
- Evidence root: `.../tickets/in-progress/claude-sonnet-haiku-5-5-model-support/api-e2e-evidence/`

## Routing Classification

- task_size `Medium`, architectural_risk `Low` → direct low-risk route. Test-review decision: `Not Required — direct low-risk route`.

## Investigation And Execution Basis

- Investigation: `api-e2e-coverage-investigation.md`; ledger: `api-e2e-test-case-ledger.md`; guideline `TESTING.md` (root).

## Test-Case Ledger Reconciliation

| Case | Result |
| --- | --- |
| C55-E2E-001..006 | Pass (6/6) |
| APC-SON (prompt caching, Sonnet 5.5) | Pass (7/7) |
| APC-HAI (prompt caching, Haiku 5.5) | Pass (7/7) |
| APC-OPUS (prompt caching, Opus 5.5 regression) | Pass (7/7) |
| C55-BR-001 Sonnet / Haiku | Pass. The first attempt's assertion was wrong about the menu design and was corrected; the product was not at fault. |
| C55-BR-002 | Pass |

Nothing is unstarted, blocked or unresolved.

## Compatibility / Legacy Scope Check

- The implementation handoff reports no compatibility mechanism, no retained legacy path and Persisted Data `Not Affected`. The implementation matches this: prefix matching and the Opus special cases are gone, and the Opus 5.5 live run still passes.
- No durable coverage protects invalid compatibility behavior.

## Changed Boundary And Evidence Matrix

| AC / REQ | Boundary | Evidence | Result |
| --- | --- | --- | --- |
| AC-001 / REQ-001,002 | server GraphQL catalog | C55-E2E-001: one row each; 1M/1M/128000; schema keys `thinking_enabled`/`thinking_display`, defaults false + summarized (Sonnet) / omitted (Haiku); unit catalog test | Pass |
| AC-002 / REQ-003 | Token Meter | APC-SON APC-E2E-007: meter total = raw usage × Sonnet 5.5 catalog prices | Pass |
| AC-003 / REQ-004 | Token Meter tier | C55-E2E-006: a 7,952-gross call was priced at `prompt_le_100k` and a 242,111-gross call at `prompt_gt_100k`. The meter showed $0.2362539, exactly the expected total; pricing everything at ≤100K would have given $0.0486. APC-HAI APC-E2E-007 (≤100K calls) also passed; server unit cases too | Pass |
| AC-004 / REQ-006 | live request | C55-E2E-002: every call (6) sent exactly `{type:'between_tools'}`, no sampling; all 200 | Pass |
| AC-005 / REQ-007 | live request | C55-E2E-004: `{type:'disabled'}` on all 4 calls, 200 | Pass |
| AC-006 / REQ-008 | live request + UI | C55-E2E-003 `{adaptive, summarized}`; C55-E2E-005 `{adaptive}`; APC-SON/HAI `{adaptive, summarized}` when chosen; browser display switch updates the draft llmConfig | Pass |
| AC-007 / REQ-009 | live request | no `temperature`/`top_p`/`top_k` on any captured call; manual budget never sent (unit) | Pass |
| AC-008 / REQ-010 | adapter | unit tests + implementation live smoke (no supported real-server trigger; recorded as not testable through the server) | Pass (unit) |
| AC-009 / REQ-011 | live tool continuation | signed thinking blocks replayed byte-identically (thinking + signature): Sonnet Off 2 (between_tools progress notes), Sonnet On 3, Haiku On 4 (omitted display: empty text, signed). Prompt-caching suite on both models under Anthropic's strict preserved-thinking check: append-only, Stop/restore strip, Settings change strip, interrupt note, and the APC-E2E-008 control proving the check is enforced | Pass |
| AC-010 / REQ-012 | regression | ts LLM unit 528/528; server token-usage 111/111; APC-OPUS live 7/7 on the refactored policy | Pass |
| AC-011 | live API | all of the above (real server, real provider) | Pass |
| AC-012 / REQ-013 | docs | reviewed `provider_model_catalogs.md` diff in the commit (rows, policy, pricing listed) | Pass |
| Output limit (AF-012) | live request | `max_tokens: 128000` on every streamed call in C55-E2E-002..006 | Pass |
| SCN-001 UI | browser (owned built backend + Nuxt dev + Chrome) | C55-BR-001: each row listed once under the AutoByteus runtime. The fresh draft is `{thinking_enabled:false, thinking_display:<default>}` with trigger `Off`. The menu shows `Off · On` plus `Omitted · Summarized`; dependent selections are hidden while Off, as designed. Picking On checks the default display: Summarized for Sonnet, Omitted for Haiku. Switching display updates the draft. C55-BR-002: a real browser send with Haiku On stores the run llmConfig `{thinking_enabled:true, thinking_display:'omitted'}`, the reply renders, and there were no provider errors | Pass |

## Additional Repository Coverage Execution

| Command (from worktree root) | Result |
| --- | --- |
| `pnpm -C autobyteus-ts exec vitest run tests/unit/llm` | 74 files / 528 pass |
| `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage --no-watch` | 17 / 111 pass |
| `pnpm -C autobyteus-web exec nuxt prepare` then `pnpm -C autobyteus-web test:nuxt utils/__tests__/llmThinkingConfigAdapter.spec.ts components/chat/__tests__/chatThinkingMenu.spec.ts components/chat/__tests__/ChatThinkingControl.spec.ts utils/__tests__/llmConfigSchema.spec.ts --run` | 4 / 40 pass |
| Both live suites without gate | 2 files / 13 tests skipped cleanly |
| `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` (for the browser probe) | Pass |

## Validation Confidence Scorecard (Mandatory)

| Category | Score | Rationale |
| --- | --- | --- |
| Requirement/AC proof | 95% | Every Must AC was proven directly on the live system. AC-008 (Should) has unit and adapter-smoke proof only, because no supported real-server trigger exists. |
| Changed-boundary directness | 95% | Exact wire bodies were captured as production built them, and the real provider accepted each one. |
| Integration realism / mock gap | 95% | Real server, vault, agent runtime, tools, memory, Token Meter and provider. The browser check used real Nuxt and a real backend. |
| Environment/fixture fidelity | 95% | Test-owned DB, vault and data root, clean env. Runs used the llmConfig the app writes, and the browser confirmed that config. |
| Failure/edge/lifecycle | 95% | Strict preserved-thinking check, Stop/restore, interrupt, Settings change, and the enforcement control, on both models. Tier boundary was exercised on both sides. |
| User surface | 95% | Rendered menu and picker plus a real browser send. Web-equivalent only; packaged Electron is unchanged and not exercised. |
| Durable regression quality | 95% | New gated live suite, the prompt-caching suite now parameterized for the 5.5 family, and TESTING.md rows. |
| **Overall** | **95%** | No category below 95%. |

## Broader Validation Decision And Execution

`Required` → executed. It removed the uncertainties around live acceptance per model and thinking mode, live signed-thinking replay, Token Meter tiers and the rendered menu. Remaining uncertainty is bounded: the docs-sourced price values match the approved REQ values, but I did not reconcile them against an Anthropic invoice.

## Desktop Application Validation

Not required. No shell change; the renderer behavior is web-equivalent.

## Platform / Runtime Targets

macOS host, Node from PATH, Chrome headless, AutoByteus native runtime, Anthropic Messages API (SDK 0.132.1).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

Stop/restore of a run holding thinking passed on both new models (APC-E2E-005). Persisted data is `Not Affected`.

## Durable Coverage Changed In The Codebase

| Path | Change |
| --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts` | Added (C55-E2E-001..006, gate `RUN_CLAUDE_5_5_E2E`) |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts` | Updated. Thinking-On llmConfig now follows the model's schema; before this, non-Opus models were sent no thinking at all. Per-model catalog price table with Haiku tiers. |
| `TESTING.md` | Prompt-caching row model option; new live suite row |

Commit `30541612c`. Nothing removed.

## Other Execution Artifacts

`api-e2e-evidence/{c55-live,apc-sonnet,apc-haiku,apc-opus,browser}/` with JSON receipts, logs and screenshots, plus the repository-check logs.

## Temporary Execution Methods / Scaffolding

`api-e2e-evidence/browser/c55-thinking-menu-probe.mjs` and `pty-answer.py`. The PTY wrapper answers the importer's `IMPORT` prompt; the documented `script -q /dev/null` failed here with `tcgetattr: Operation not supported on socket`. The probe stays temporary: the frontend did not change, and the web unit specs already pin the menu logic.

## Dependencies Mocked Or Emulated

None in the live cases. The harness only records requests and adds no rewrites. The strict preserved-thinking header is a test-only validation injection, as the suite documents.

## Result Summary

`Pass`. 6 + 21 live server cases and 3 browser cases passed, and all repository checks passed.

## Cleanup Performed

- The harness and the prompt-caching suite removed their temp app-data, workspaces and ledger rows.
- The browser probe stopped its owned backend and Nuxt (SIGTERM) and removed its data root.
- No owned processes or temp roots remain. The user's app and data were not touched; their `.env` was only read as the key source.

## Preliminary Classification

N/A (Pass).

## Residual Risks

- Explicit unknown `thinking` values are dropped on adaptive models, and the `adaptive_required` messages still name Opus 5.5. Both are design-accepted, and no supported caller reaches them.
- Prices are verified against the approved requirements, not against billing.
- Packaged Electron was not exercised (unchanged).
- TESTING.md discrepancy: `script -q /dev/null` cannot provide a TTY from a non-terminal agent shell on this host. A PTY wrapper was used instead.

## Latest Authoritative Result

`Pass` — overall confidence 95%; broader validation `Required` and executed; test-review `Not Required — direct low-risk route`.

## Round API-REV-003 — SR-007 rework (IR-002) and rebase (current authority)

- Implementation validated: `bc1777e02`, `68269cfae`, `b38d0a909` on `origin/personal` @ `228cd9b5e`. API/E2E header commit: `31132efcf`.
- Origin is still at `228cd9b5e` (fetched 2026-10-11); `git merge-tree --write-tree HEAD origin/personal` is clean.
- Classification `Small` / `Low`, direct route. Test review: `Not Required — direct low-risk route`.
- Basis: `api-e2e-coverage-investigation.md` § "Round API-REV-003"; ledger § "Round API-REV-003".

### Prior failures rechecked

None open: API-REV-001/002 were `Pass`. CRR-001's API/E2E-owned items are resolved:
- CR-006: the header size and cost are corrected.
- CR-001: the command move is done; the `TESTING.md` part was resolved by the rebase, which took origin's version.

### Repository execution (from the worktree root unless noted)

| Command | Result |
| --- | --- |
| `pnpm -C autobyteus-ts exec vitest run tests/unit/llm` | 74 files / 524 pass |
| `pnpm -C autobyteus-ts exec vitest run tests/unit` (run after the handoff, as a self-check) | 305 files / 1974 pass |
| `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` | clean (the union narrows without casts) |
| `autobyteus-server-ts`: `./node_modules/.bin/vitest run tests/unit/token-usage --no-watch` | 17 / 111 pass (includes the Haiku tier cases) |
| `autobyteus-server-ts`: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts --no-watch` (gates unset) | 2 files / 13 skipped. The edited headers load; a skip is not counted as a pass for live behavior. |
| `git diff ff227eb72 HEAD --name-only -- autobyteus-ts/tests` | only `anthropic-llm-claude-5-5.test.ts`, `anthropic-model-request-policy.test.ts`, `supported-model-definitions.test.ts`; the five existing Anthropic files are unchanged (AC-010 / REQ-012) |

Logs: `api-e2e-evidence/rev3/`.

### Changed boundary and evidence (delta only)

| Item | Evidence | Result |
| --- | --- | --- |
| D-SR7-1 discriminated policy type | `tsc` clean; the catalog-pinning test equals the union-typed expectations for every row; payload tests unchanged and passing | Pass |
| D-SR7-2 model-named `adaptive_required` errors | New unit case asserts both full texts for `claude-opus-5-5` and no SDK call; existing substring checks in `anthropic-llm.test.ts` pass unchanged | Pass |
| D-SR7-3 explicit `claude-sonnet-4-6` row; unsupported-ID tests and docs removed | The catalog-pinning test covers Sonnet 4.6. The removed cases tested SCN-X2 (unsupported), so removing them is correct. `provider_model_catalogs.md` / `llm_module_design_nodejs.md` diff reviewed: no dated-ID claim, explicit Sonnet 4.6 row | Pass |
| D-SR7-4 rebase / `TESTING.md` | origin's `TESTING.md` unchanged (`git diff 228cd9b5e HEAD -- TESTING.md` empty); merge clean | Pass |
| D-SR7-5 live-test headers | Done in `31132efcf`. The Claude 5.5 header carries the exact command and "about 22 calls … one ~240K gross … about $0.24". The prompt-caching header carries the exact command and the `ANTHROPIC_CACHE_E2E_MODEL` option. | Pass |

### Live re-run decision

`Not Required`. The full rationale is in the investigation. In short:
- No request payload changed for any model.
- The only runtime-visible delta is local error text raised before the SDK call, and it is asserted exactly.
- No origin commit since the validated base touches DS-001..DS-003.

So the API-REV-001/002 live, browser and desktop evidence still applies to the same shapes and paths.

### Validation confidence scorecard (API-REV-003)

| Category | Score | Rationale |
| --- | --- | --- |
| Requirement/AC proof | 95% | All ACs keep their prior direct live proof. The SR-007 delta is proven at its own boundary (type check, local throw, policy lookup). |
| Changed-boundary directness | 95% | The delta's boundary is the local validation and the lookup, both exercised directly. The provider boundary is unchanged and was proven live. |
| Integration realism / mock gap | 95% | Prior real server/provider/UI runs still apply; the new code adds no new integration surface. |
| Environment/fixture fidelity | 95% | Clean-env commands per `TESTING.md`; test-owned fixtures. |
| Failure/edge/lifecycle | 95% | The new error texts are asserted exactly; prior lifecycle evidence still applies. |
| User surface | 95% | No ticket UI change. Origin's web changes since the validated base are unrelated to the picker or Thinking menu. Prior browser and desktop proof is on the pre-rebase build, so I score 95 rather than 100. |
| Durable regression quality | 95% | The unsupported-scenario cases are gone, the exact error-text case was added, and the live suites are now self-documenting with exact commands. |
| **Overall** | **95%** | No category below 95%. |

### Durable coverage changed this round

| Path | Change |
| --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts` | Header: exact run command; corrected call count and cost (`31132efcf`) |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts` | Header: exact run command and model option (`31132efcf`) |
| `autobyteus-ts/tests/unit/llm/api/anthropic-model-request-policy.test.ts`, `anthropic-llm-claude-5-5.test.ts` | Changed by IR-002 (`b38d0a909`), reviewed and accepted here |
| `TESTING.md` | Suite rows removed via the rebase (origin's version) |

### Residual risks

- Same as before:
  - compaction on the 5.5 models is not proven live (unit only);
  - prices are verified against the approved requirements, not billing;
  - changing Thinking on an active run is not covered;
  - C-10 (Opus 5.5 rejects `thinking_enabled:false`) predates this ticket.
- Docs formatting: in `autobyteus-ts/docs/provider_model_catalogs.md`, one reworded sentence ("…a unit test pins each row's policy. Each row records…") is a single unwrapped line, unlike the surrounding wrapped prose. The content is correct; Delivery may reflow it during docs sync.
- Left for Delivery (D-SR7-6), as intended: the uncommitted `token_usage.md` edit and the `tcgetattr` note.

### Latest authoritative result

`Pass`, overall confidence 95%. Live re-run `Not Required` (rationale above). Test review `Not Required — direct low-risk route`.

## Addendum (API-REV-002): Real-User Desktop Validation On An Isolated Instance

At the user's request, after API-REV-001.

- Instance:
  - Started with `pnpm --silent isolated-app start --build`: a packaged worktree build containing `22c3c89fa` and `30541612c`, instance `iso-56653-178f`, its own temp data root and ports.
  - Keys were imported into the instance vault from `/Users/normy/.autobyteus/server-data/.env` with the unchanged importer CLI under a PTY wrapper; `script` fails from this shell. A dry-run then reported `provider.anthropic.api-key CONFIGURED`.
  - The instance was restarted afterwards.
- Driven with the browser-automation skill (`__abDemo` visible cursor and typing) in attach-only mode on the instance control port.
- Every step was asserted on DOM text, GraphQL readback or files on disk. Screenshots and two MP4 recordings are supporting evidence in `api-e2e-evidence/desktop/`.

| Case | User journey | Observed | Result |
| --- | --- | --- | --- |
| C55-DT-001 | Chat → model menu → AutoByteus runtime lists `claude-haiku-5-5` and `claude-sonnet-5-5` → pick Sonnet 5.5 → Thinking `Off` (menu Off/On + Omitted/Summarized) → ask to write and read a file | write_file + read_file rendered; answer quotes the file; file on disk = `Sonnet 5.5 thinking off works` | Pass |
| C55-DT-002 | New chat, Sonnet 5.5 → Thinking On (Summarized preselected) → three files + prime reasoning → follow-up turn in the same run (send button in run view) | A "Thinking" segment rendered; expanded, it shows the summarized thinking text. The answer is correct (87). The follow-up wrote and read sum.txt (`87` on disk) and answered | Pass |
| C55-DT-003 | New chat → Haiku 5.5 → Thinking On (Omitted preselected) → tool task | tool calls + correct answer (12, pears); no thinking text shown, as expected for omitted | Pass |
| C55-DT-004 | New chat, Haiku 5.5, Thinking Off → tool task | tool calls + correct quote | Pass |
| C55-DT-005 | Settings → Token Statistics | Rows `Autobyteus · Anthropic:claude-sonnet-5-5` $0.169 and `…:claude-haiku-5-5` $0.0071, both "Complete estimate". These equal the per-run `getAgentRunTokenUsageSummary` sums: 0.0722 + 0.0968 and 0.00353 + 0.00356 | Pass |
| C55-DT-006 | Restart the app → workspace tree → reopen the Sonnet thinking run → send a follow-up | History reloaded including the Thinking segment; the restored run answered after a tool call | Pass |

- Stored run configs (GraphQL), all `runtimeKind: autobyteus`, each exactly as chosen in the menu:
  - Sonnet Off: `{thinking_enabled:false, thinking_display:'summarized'}`
  - Sonnet On: `{true,'summarized'}`
  - Haiku On: `{true,'omitted'}`
  - Haiku Off: `{false,'omitted'}`
- Instance log: 0 matches for `invalid_request_error` / HTTP 400 / `does not support`; the key value does not appear. The only ERROR-level lines are unrelated: process termination at restart, a Prisma update notice, and a duplicate `search_web` tool definition.
- Not covered: changing Thinking on an active run (the running run's model settings are not edited from the run view in this journey). Native OS dialogs were not needed.
- Cleanup: `isolated-app stop iso-56653-178f` reported `wasRunning:true`, `forced:false`, `dataRootRemoved:true`, both ports released. Another instance listed (`iso-63369-6c20`, from a different worktree) is not ours and was left untouched. The instance log was removed by the stop; the relevant checks above were taken before stopping.
- Effect on confidence: user-surface proof now includes the packaged desktop shell (previously web-equivalent only). The result stays `Pass`, and confidence rises to 96%: user surface goes to 100%, other categories unchanged.
