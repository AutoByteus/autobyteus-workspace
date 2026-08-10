# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements / acceptance basis: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`; current `SR-017`, `BEH-008`, `REQ-016`, `AC-020`, and `AC-021`, retaining `SR-010`–`SR-012` and `SR-016` for unchanged behavior.
- Design basis: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`; `ARCH-REV-011`.
- Implementation / source review: `IR-013`; `CRR-019 Pass / 9.44`.
- Current source subject: `331ff94da3c2c9a2a07e11efff68f5307a4cfabb` plus reviewed uncommitted IR-013 changes in the shared web label owner and three focused durable web tests.
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-coverage-investigation.md`.
- Current API/E2E revision: `API-REV-010`.
- Execution date: `2026-08-10`.
- Prior result: API-REV-009 targeted Pass reproduced the former visible-prefix behavior. It is superseded only for visible presentation; its live backend identity/wire explanation remains historical context. API-REV-008 remains applicable to unchanged setup, durability, recovery, exact metadata, and SR-016 behavior.
- Current authoritative result: `Pass / 97.3%`.

## Investigation And Coverage Decisions

- Mandatory current investigation completed before execution: `Yes`.
- Changed boundary: `autobyteus-web/utils/modelSelectionLabel.ts` and its existing Settings/runtime/binding/application/member/media consumers.
- Unchanged boundaries: GraphQL triples, Qwen catalog definitions, selector persistence, model factory lookup, Qwen endpoint/key durability, and OpenAI-compatible request construction.
- API/E2E-owned durable coverage change: `None`.
- Implementation-owned durable coverage executed:
  - `autobyteus-web/utils/__tests__/modelSelectionLabel.spec.ts`
  - `autobyteus-web/components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts`
  - `autobyteus-web/composables/messaging-binding-flow/__tests__/launch-preset-model-selection.spec.ts`
- Retained missing-selector regression executed:
  - `autobyteus-web/components/applications/setup/__tests__/ApplicationAgentLaunchProfileEditor.spec.ts`
- Stale expectation replaced: API-REV-009's visible `qwen:` Settings expectation. Current SR-017 instead requires friendly names while preserving exact internal selectors.
- Durable browser suite decision: no established repository full-browser owner exists for this Settings/binding composition. Two read-only temporary browser probes supplied direct current evidence and were removed after execution.

## Requirement And Boundary Evidence Matrix

| Scenario ID | Requirement / Expected Behavior | Direct Execution | Result | Evidence |
| --- | --- | --- | --- | --- |
| `QW-LABEL-010-01` | Three live Qwen-served duplicate rows show trimmed friendly names; native Qwen names remain unchanged | Focused helper + Settings component tests | Pass — included in 4 files / 12 tests | `web-friendly-qwen-api-rev-010.log` |
| `QW-LABEL-010-02` | Actual Settings connected to the live Electron backend shows friendly names and no three prefixed selectors | Real Chrome -> current Nuxt -> actual running DR-009 embedded backend | Pass | `qwen-friendly-settings-browser-evidence-api-rev-010.json`; Settings screenshot |
| `QW-SELECT-010-01` | Shared binding option and selected text are friendly while selected value remains exact `qwen:glm-5.2` | Production binding composable + select component + live backend catalog in temporary browser probe | Pass | `qwen-friendly-binding-browser-evidence-api-rev-010.json`; binding screenshot |
| `QW-SELECT-010-02` | Durable binding update stores exact selector and clears model config | Focused composable regression | Pass | `web-friendly-qwen-api-rev-010.log` |
| `QW-RAW-010-01` | Blank live Qwen name and unavailable stored selector retain raw identifier | Helper and application setup regressions | Pass | `web-friendly-qwen-api-rev-010.log` |
| `QW-ID-010-01` | Backend retains distinct `modelIdentifier`, friendly `name`, and exact unprefixed `value`; direct DeepSeek/GLM rows remain separate | Read-only real GraphQL query to embedded backend | Pass | `qwen-friendly-electron-backend-api-rev-010.json` |
| `QW-WIRE-010-01` | Restart-backed Qwen configuration and fresh request process route exact unprefixed values with correct auth/path | Built-server GraphQL lifecycle E2E + loopback provider | Pass — 1 file / 1 test | `qwen-lifecycle-api-rev-010.log` |
| `QW-BUILD-010-01` | Shared helper compiles through active production consumers | Web guards/audit and Nuxt production build | Pass — all guards; 15 routes prerendered | `web-guards-api-rev-010.log`; `web-build-api-rev-010.log` |
| `QW-CLEAN-010-01` | No API/E2E-owned route/process/script, unmerged path, secret-shaped evidence, or whitespace defect remains | Integrity and cleanup checks | Pass | `qwen-friendly-integrity-api-rev-010.log` |

## Repository Execution

| Order | Command | Working Directory | Result |
| --- | --- | --- | --- |
| 1 | `pnpm test:nuxt utils/__tests__/modelSelectionLabel.spec.ts components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts composables/messaging-binding-flow/__tests__/launch-preset-model-selection.spec.ts components/applications/setup/__tests__/ApplicationAgentLaunchProfileEditor.spec.ts --run` | `autobyteus-web` | Pass — 4 files / 12 tests |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts --no-watch` | Worktree root | Pass — 1 file / 1 test; 5.80s test body |
| 3 | `pnpm guard:web-boundary`; `pnpm guard:localization-boundary`; `pnpm audit:localization-literals` | `autobyteus-web` | Pass |
| 4 | `pnpm build` | `autobyteus-web` | Pass — production client/server compile and 15 prerendered routes |
| 5 | `git diff --check`, unmerged/temp/port/source/secret scans | Worktree root | Pass |

The initial attempt to invoke Vitest with an obsolete `--poolOptions` CLI spelling was rejected before collection. The authoritative rerun used the documented command without that unsupported option and passed. The rejected invocation did not exercise product code and is not a behavioral failure.

## Real Browser And Live Integration Execution

### Settings Journey

- Backend: the user's already-running DR-009 Electron embedded server at `http://127.0.0.1:29695`; only read-only GraphQL operations were issued.
- Frontend: current IR-013 Nuxt source on API/E2E-owned port `3138` with `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695`.
- Browser: installed Google Chrome, headless through Playwright Core `1.58.2`, viewport `1600x1100`.
- Observed Qwen Settings labels:
  - `DeepSeek V4 Flash 0731 (Qwen)`
  - `DeepSeek V4 Pro (Qwen)`
  - `GLM-5.2 (Qwen)`
  - `qwen3-max`
  - `qwen3.7-max`
  - `qwen3.8-max`
- Exact visible occurrences of `qwen:deepseek-v4-flash-0731`, `qwen:deepseek-v4-pro`, and `qwen:glm-5.2`: `0`.
- GraphQL operations: `GetProviderSettings`, `GetGeminiSetupConfig`, and `GetQwenSetupStatus`, all HTTP 200.
- Browser console errors: `0`.
- Visual inspection: Pass. The Qwen model cards use friendly names, remain readable without clipping/overlap, and the configuration card is unchanged.

### Shared Binding Selection Journey

A temporary Nuxt page imported the production `useLLMProviderConfigStore`, `useBindingLaunchPresetModelSelection`, and `SearchableGroupedSelect`; it was not a reimplementation of the label/selection logic.

1. The real backend catalog loaded through `GetAvailableLLMProvidersWithModels` (HTTP 200).
2. Initial visible selection was `Qwen / DeepSeek V4 Pro (Qwen)` while the bound selector was `qwen:deepseek-v4-pro` and catalog wire value was `deepseek-v4-pro`.
3. Chrome selected visible option `GLM-5.2 (Qwen)`.
4. Final visible selection was `Qwen / GLM-5.2 (Qwen)`.
5. The production binding state became exact `qwen:glm-5.2`; the same live catalog row resolved exact provider value `glm-5.2`.
6. No backend mutation occurred; browser console errors were `0`.

The temporary page and both temporary Playwright scripts were removed. The owned Nuxt process was stopped and port `3138` is free. The user's Electron app/backend remained running and unchanged.

## Exact Selector And Outbound Value Proof

The live embedded backend returned the approved distinct triples, including:

| Friendly name | Stored / selected `modelIdentifier` | Provider `value` |
| --- | --- | --- |
| `DeepSeek V4 Flash 0731 (Qwen)` | `qwen:deepseek-v4-flash-0731` | `deepseek-v4-flash-0731` |
| `DeepSeek V4 Pro (Qwen)` | `qwen:deepseek-v4-pro` | `deepseek-v4-pro` |
| `GLM-5.2 (Qwen)` | `qwen:glm-5.2` | `glm-5.2` |

The Qwen lifecycle E2E independently passed against a physical runtime root, SQLite/vault state, saved `.env`, server restart, and fresh request process. Its loopback provider observed authenticated `/compatible-mode/v1/chat/completions` requests with exact models `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2`; no prefixed duplicate selector was sent on the wire. It also retains direct failure compensation, sanitized error, configured/default status, exact-catalog, direct-provider collision, and preview-absence assertions.

## Compatibility, Persisted Data, And Historical Strings

- Endpoint profiles, URL profiles, region/plan inference, aliases, and fuzzy matching: not restored.
- `qwen3.8-max-preview`: historical/custom opaque string only; not a native Qwen offering or alias.
- Qwen catalog/persistence: exact prefixed selector remains necessary for provider ownership and factory routing.
- Custom-provider readable identity and SR-016 reset/recreation: unchanged; API-REV-008/CRR-014 evidence remains applicable.
- Missing catalog selector: retained as raw identifier for repair; no friendly historical map or compatibility fallback was introduced.

## Confidence Scorecard

| Category | Final | Evidence / Residual |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | AC-020 and AC-021 have direct Settings, shared-selection, persistence, live triples, and wire evidence. |
| Changed-boundary execution directness | 98% | Current helper runs in focused tests, production build, actual Settings, and the production binding composable. |
| Cross-boundary integration realism and mock gap | 97% | Current Nuxt, real Chrome, actual embedded GraphQL catalog, binding state, built server, vault/files, and loopback provider correlate. Alibaba itself is emulated. |
| Environment, configuration, identity, and fixture fidelity | 97% | Actual user-running backend is read-only for browser proof; server E2E uses isolated physical state and exact public identities. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Blank/missing labels, failure compensation, restart, sanitized failures, default/configured state, and collisions remain directly covered. Literal vendor failures remain external. |
| User-surface, browser, and desktop-shell confidence | 98% | The exact reported Settings surface and an interactive shared selector pass in real Chrome. Electron shell is unchanged and therefore not a material gap. |
| Durable regression coverage quality and relevance | 97% | CRR-019-approved focused tests pass and protect label, Settings, exact binding selector, generic/custom, and raw fallback behavior. |

- Overall confidence: `97.3%` (simple average, rounded to one decimal).
- Every critical current acceptance criterion directly proven: `Yes`.
- Applicable category below 90%: `No`.
- Broader validation: `Required and completed — Pass`.

## Durable Coverage Changes

- Added by API/E2E in API-REV-010: `None`.
- Updated by API/E2E in API-REV-010: `None`.
- Removed by API/E2E in API-REV-010: `None`.
- The three modified durable web test files are implementation-owned IR-013 changes already included in CRR-019; API/E2E executed them without further edit.
- Proportional review routing: send the cumulative package to `code_reviewer`; expected determination is `Not Applicable` for API/E2E-owned durable changes, while the reviewer may reference its completed CRR-019 source/test review.

## Evidence Artifacts

All evidence is below `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/`.

| Artifact | Purpose |
| --- | --- |
| `web-friendly-qwen-api-rev-010.log` | Focused 4-file / 12-test web pass |
| `qwen-lifecycle-api-rev-010.log` | Current Qwen GraphQL/restart/fresh-process/wire E2E pass |
| `web-guards-api-rev-010.log` | Web boundary/localization/literal guard pass |
| `web-build-api-rev-010.log` | Nuxt production build and 15-route prerender pass |
| `qwen-friendly-electron-backend-api-rev-010.json` | Real backend provider/model identifier/name/value triples |
| `qwen-friendly-settings-browser-evidence-api-rev-010.json` | Real Settings DOM and successful read-only GraphQL operations |
| `qwen-friendly-settings-live-electron-backend-api-rev-010.png` | Visually inspected current Settings result |
| `qwen-friendly-binding-browser-evidence-api-rev-010.json` | Live-catalog friendly selection -> exact selector/value evidence |
| `qwen-friendly-binding-live-catalog-api-rev-010.png` | Visually inspected selected-label/selector/value probe |
| `qwen-friendly-nuxt-api-rev-010.log` | Owned current-source Nuxt runtime log |
| `qwen-friendly-integrity-api-rev-010.log` | Diff, source-owner, secret, temp-resource, port, and backend-preservation checks |

## Residual Risks

- Real Alibaba availability, credentials, quota, regional policy, TLS behavior, and undocumented payload variation were not exercised.
- The DR-009 packaged frontend still predates IR-013; this round proves current source against its real backend. Delivery must produce and verify a new package before asking the user to retest the Electron UI.
- Literal 15-minute migration delay, arbitrary interruption timing, POSIX-vs-Windows permission semantics, and approved SR-016 cleanup/stale-selector residuals are unchanged from API-REV-008.
- Delivery must refresh against the latest tracked base before final handoff.

## Result And Routing

- Result: `Pass`.
- Confidence: `97.3%`.
- New product, test, or environment failure IDs: `None`.
- Reroute required: `No`.
- Recommended next recipient: `code_reviewer` for the required separate proportional determination, then `delivery_engineer` for a fresh tracked-base refresh and new Electron build.
