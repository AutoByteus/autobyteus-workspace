# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale: The bug is isolated to local-runtime model classification and grouping across a narrow set of files (`autobyteus-ts` provider discovery plus the existing server/UI grouping path). No new subsystem or broad architecture change appears necessary.
- Investigation Goal: Explain why the Electron app shows the Ollama provider as configured but still displays `No Models Found` after reload, even though the local Ollama server is reachable and serving models.
- Primary Questions To Resolve:
  - Does the failure come from the Ollama server endpoint, server settings propagation, shared provider discovery, or UI grouping?
  - Does the targeted provider reload path actually discover models but place them in the wrong provider bucket?
  - Is LM Studio behavior materially different in the same path?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-01 | Command | `curl -sS http://127.0.0.1:11434/api/tags` | Verify the user's local Ollama server independently of app code | Returned model `qwen3.5:35b-a3b-coding-nvfp4`; local Ollama server is healthy | No |
| 2026-04-01 | Code | `autobyteus-ts/src/llm/ollama-provider.ts` | Inspect Ollama model discovery and registration behavior | Discovery uses `OllamaProviderResolver.resolve(modelName)` and does not keep discovered models in `LLMProvider.OLLAMA` when the model name matches a vendor keyword such as `qwen` | No |
| 2026-04-01 | Code | `autobyteus-ts/src/llm/ollama-provider-resolver.ts` | Confirm the classification logic used by Ollama discovery | `qwen` maps to `LLMProvider.QWEN`; fallback to `LLMProvider.OLLAMA` only happens for unmatched names | No |
| 2026-04-01 | Code | `autobyteus-ts/src/llm/lmstudio-provider.ts` | Compare LM Studio behavior against Ollama | LM Studio always registers discovered local models under `LLMProvider.LMSTUDIO` | No |
| 2026-04-01 | Code | `autobyteus-ts/src/llm/llm-factory.ts` | Inspect targeted provider reload behavior | `reloadModels(OLLAMA)` clears only the `OLLAMA` bucket, then re-registers whatever `OllamaModelProvider.getModels()` returns; if returned models are tagged `QWEN`, the `OLLAMA` bucket stays empty | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Verify how server responses are grouped for the settings UI | `availableLlmProvidersWithModels` groups strictly by `model.provider`, so an Ollama-hosted `QWEN` model is counted under `QWEN`, not `OLLAMA` | No |
| 2026-04-01 | Code | `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | Verify how the UI renders provider counts and provider detail panels | Sidebar counts and model panels use the server-returned `provider` groups directly; the `OLLAMA` card only shows models grouped as `OLLAMA` | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/config/app-config.ts` and `autobyteus-server-ts/src/services/server-settings-service.ts` | Rule out a stale server-settings propagation bug | `config.set()` updates both persisted config and `process.env`; settings propagation is not the primary failure path | No |
| 2026-04-01 | Command | `pnpm build` in `autobyteus-ts` | Build executable artifacts from the worktree for live repro | Build succeeded and allowed direct runtime verification of the current code | No |
| 2026-04-01 | Command | `node --input-type=module -e "... OllamaModelProvider.getModels() ..."` in `autobyteus-ts` | Confirm how live discovery classifies the user's installed Ollama model | Returned `provider: "QWEN"`, `runtime: "ollama"` for `qwen3.5:35b-a3b-coding-nvfp4` | No |
| 2026-04-01 | Command | `node --input-type=module -e "... LLMFactory.reloadModels(LLMProvider.OLLAMA) ..."` in `autobyteus-ts` | Reproduce the exact provider reload mismatch | `reloadModels(OLLAMA)` returned `1`, but `listModelsByProvider(OLLAMA)` remained `0`; the reloaded model landed in the `QWEN` bucket | No |
| 2026-04-01 | Command | `curl -s http://127.0.0.1:8000/graphql ... availableLlmProvidersWithModels(runtimeKind:\"autobyteus\")` | Compare the running backend result with the patched worktree expectation | Live GraphQL still returned Ollama-hosted models under `QWEN` and `OLLAMA` remained empty | No |
| 2026-04-01 | Command | `realpath autobyteus-server-ts/node_modules/autobyteus-ts` inside the ticket worktree | Prove which package the running worktree server actually imported | The borrowed worktree install resolved `autobyteus-server-ts/node_modules/autobyteus-ts` to `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts`, not the worktree package | No |
| 2026-04-01 | Setup | `rm worktree symlinked node_modules && pnpm install` in the ticket worktree root | Eliminate the contaminated dependency graph before further live validation | Recreated worktree-local `node_modules`; `realpath autobyteus-server-ts/node_modules/autobyteus-ts` now resolves to `/Users/normy/autobyteus_org/autobyteus-worktrees/ollama-model-reload-discovery/autobyteus-ts` | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` triggers provider reload from the Electron app settings UI.
  - `autobyteus-web/stores/llmProviderConfig.ts` calls GraphQL reload mutations and refresh queries.
  - `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` exposes reload mutations and available-provider queries.
  - `autobyteus-ts/src/llm/llm-factory.ts` and `autobyteus-ts/src/llm/ollama-provider.ts` perform the actual local-model discovery and registration.
- Execution boundaries:
  - UI/provider-card rendering boundary in `autobyteus-web`
  - GraphQL grouping/reload boundary in `autobyteus-server-ts`
  - Local-runtime discovery and registration boundary in `autobyteus-ts`
- Owning subsystems / capability areas:
  - Settings UI / provider catalog presentation
  - Runtime model catalog GraphQL service
  - Shared TypeScript LLM runtime discovery
- Optional modules involved:
  - `ollama-provider-resolver` only for Ollama name-based provider classification
- Folder / file placement observations:
  - The bug originates in the shared runtime discovery layer, but becomes visible in the server/UI grouping path because those layers interpret `provider` as the provider-card key.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/ollama-provider.ts` | `OllamaModelProvider.getModels()` | Discover live Ollama models and build `LLMModel` records | Uses `OllamaProviderResolver.resolve(modelName)` for `provider`, so vendor-family names override `OLLAMA` | Root-cause file for the wrong provider bucket |
| `autobyteus-ts/src/llm/ollama-provider-resolver.ts` | `OllamaProviderResolver.resolve()` | Map model names to vendor families | `qwen` names become `LLMProvider.QWEN` | Keep or bypass only where vendor-family grouping is desired |
| `autobyteus-ts/src/llm/lmstudio-provider.ts` | `LMStudioModelProvider.getModels()` | Discover LM Studio local models | Always tags models with `LLMProvider.LMSTUDIO` | Explains why LM Studio cards work as expected |
| `autobyteus-ts/src/llm/llm-factory.ts` | `reloadModels(provider)` | Clear and repopulate a provider bucket | Only clears `OLLAMA`, then registers models that may be tagged `QWEN`; registry becomes inconsistent relative to the reload target | Likely needs a fix aligned with local-runtime provider semantics |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | `availableLlmProvidersWithModels()` | Group models for the settings UI | Groups on `model.provider`, not runtime | UI behavior follows the wrong upstream classification |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | `allProvidersWithModels`, `selectedProviderLlmModels` | Render provider counts and selected provider models | The `OLLAMA` card cannot show a model unless that model's `provider` field is `OLLAMA` | UI is behaving consistently with current server data; not the root cause |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-01 | Probe | `curl -sS http://127.0.0.1:11434/api/tags` | Ollama returned the installed `qwen3.5:35b-a3b-coding-nvfp4` model | Server availability is not the blocker |
| 2026-04-01 | Script | `pnpm build` in `autobyteus-ts` | Worktree build passed | Live repro commands can use fresh worktree artifacts |
| 2026-04-01 | Script | `node --input-type=module -e "... OllamaModelProvider.getModels() ..."` | Returned one model with `provider: "QWEN"` and `runtime: "ollama"` | Discovery succeeds but classification is wrong for the provider card |
| 2026-04-01 | Script | `node --input-type=module -e "... LLMFactory.reloadModels(LLMProvider.OLLAMA) ..."` | `reloaded = 1`, `ollamaCount = 0`, and the reloaded model appeared in the `QWEN` provider bucket | Exact symptom behind the UI's `OLLAMA: 0` state is reproduced in code |
| 2026-04-01 | Trace | Live GraphQL query against `http://127.0.0.1:8000/graphql` before reinstalling worktree dependencies | Running backend still exposed Ollama runtime models under `QWEN`, matching the stale main-workspace package behavior | The earlier "live fix verified" conclusion was invalid because the launched runtime did not match the patched worktree |
| 2026-04-01 | Setup | `realpath autobyteus-server-ts/node_modules/autobyteus-ts` before and after reinstalling the worktree | Before reinstall, the worktree server resolved to the main workspace `autobyteus-ts`; after reinstall, it resolves to the worktree package | Subsequent live validation must be rerun from the clean worktree install before accepting or rejecting the code fix |

### External Code / Dependency Findings

- Upstream repo / package / sample examined: None required
- Version / tag / commit / release: N/A
- Files, endpoints, or examples examined: Local Ollama HTTP API only
- Relevant behavior, contract, or constraint learned: `/api/tags` returns the expected model immediately on the user's machine
- Confidence and freshness: High / 2026-04-01

### Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - Local Ollama server running on `127.0.0.1:11434`
  - Existing local LM Studio server on `127.0.0.1:1234` for regression comparison
- Required config, feature flags, or env vars:
  - None beyond existing local setup; default `http://localhost:11434` also resolves successfully in the worktree repro
- Required fixtures, seed data, or accounts:
  - Installed Ollama model `qwen3.5:35b-a3b-coding-nvfp4`
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - None
- Setup commands that materially affected the investigation:
  - Symlinked worktree `node_modules` to the already-installed workspace dependencies so the dedicated worktree could build and run without changing the user's main checkout
  - Removed the borrowed `node_modules` symlinks and ran `pnpm install` in the ticket worktree to restore a worktree-local dependency graph
- Cleanup notes for temporary investigation-only setup:
  - The borrowed `node_modules` symlinks were only an investigation shortcut; they caused the worktree server to import the main workspace `autobyteus-ts` package and invalidated the first live verification attempt

## Constraints

- Technical constraints:
  - `provider` is currently overloaded: it is used both for provider-card grouping and for vendor-family classification in some runtime paths.
- Environment constraints:
  - Local-runtime verification depends on reachable Ollama/LM Studio services on this machine.
- Third-party / API constraints:
  - None identified; local Ollama API contract behaved as expected.

## Unknowns / Open Questions

- Unknown: After rerunning the backend from the clean worktree install, will the live GraphQL response match the patched worktree behavior or reveal an additional stale build/cache path?
- Why it matters: If the clean worktree still returns `QWEN`, the code fix is incomplete and another runtime path still overrides the provider classification.
- Planned follow-up: Rebuild and restart the backend from the clean worktree, then compare live GraphQL output against the direct `autobyteus-ts` runtime probes.

## Implications

### Requirements Implications

- The requirement is not "make Ollama reachable"; it is "ensure Ollama-hosted models remain discoverable under the `OLLAMA` provider card and targeted reload path."
- Acceptance criteria must verify both reload count and post-reload provider grouping.

### Design Implications

- The smallest likely design is to preserve Ollama runtime identity for the provider-card/reload path, while keeping enough metadata for vendor-specific behavior elsewhere if needed.
- LM Studio already follows this pattern by preserving `LMSTUDIO` as the provider.

### Implementation / Placement Implications

- Primary code changes should remain in `autobyteus-ts/src/llm/ollama-provider.ts` and nearby tests, with possible small server/UI regression assertions if existing tests do not already cover the grouped provider result.
- No evidence currently points to a frontend-only or server-settings-only fix.
