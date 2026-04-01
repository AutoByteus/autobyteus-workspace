# Requirements

## Document Status

- Status: `Design-ready`
- Ticket: `ollama-model-reload-discovery`
- Scope Classification: `Small`
- Last Updated: `2026-04-01`

## Goal / Problem Statement

The Electron app shows the Ollama provider as configured and pointed at `http://127.0.0.1:11434`, but the API key management screen reports `No Models Found` after `Reload Models`. In the same installation, LM Studio discovery works. The fix must identify the real failing boundary and restore reliable Ollama model discovery without regressing LM Studio or other provider reload flows.

## In-Scope Use Cases

- `UC-001`: Reload Ollama models from the API key management screen when a reachable Ollama server already has installed models.
- `UC-002`: Reflect discovered Ollama models in the provider list/count shown by the Electron app after reload.
- `UC-003`: Preserve existing LM Studio reload behavior while fixing Ollama-specific discovery.

## Refined Requirements

| Requirement ID | Requirement | Priority |
| --- | --- | --- |
| `R-001` | The system shall keep Ollama-discovered local runtime models in the `OLLAMA` provider bucket used by targeted reload and provider-card grouping, even when the model name matches a vendor-family keyword such as `qwen` or `deepseek`. | Must |
| `R-002` | The system shall return Ollama-discovered models from the Electron app reload flow so the `OLLAMA` card and details panel show the discovered local models after reload. | Must |
| `R-003` | The system shall preserve existing LM Studio local-runtime model grouping and shall not regress other provider reload paths touched by the fix. | Must |
| `R-004` | The system shall keep enough executable coverage around local-runtime provider reload/grouping to catch a future mismatch between reload count and grouped-provider visibility. | Should |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Criterion |
| --- | --- | --- |
| `AC-001` | `R-001` | With a reachable Ollama host and a model name containing a vendor-family keyword such as `qwen`, `OllamaModelProvider.getModels()` and the reload path produce `LLMModel` entries whose grouped provider remains `OLLAMA`. |
| `AC-002` | `R-002` | After `reloadModelsForProvider('OLLAMA')`, `LLMFactory.listModelsByProvider(LLMProvider.OLLAMA)` returns the discovered Ollama local model identifiers and the `OLLAMA` provider group is non-empty. |
| `AC-003` | `R-003` | LM Studio discovery and reload continue to keep local models under `LMSTUDIO`, and no touched provider reload tests regress. |
| `AC-004` | `R-004` | Automated regression coverage fails if a provider reload reports a positive count but the requested provider bucket remains empty afterward. |

## Constraints / Dependencies

- The bug spans the shared TypeScript LLM runtime layer plus the existing server/UI grouping path, but current investigation does not justify a broad architecture change.
- The investigation should prefer live local verification against the installed Ollama instance at `127.0.0.1:11434`.
- Work must stay isolated in the dedicated ticket worktree/branch.

## Assumptions

- A reachable local Ollama service exists on the machine and already has one or more models installed.
- The Electron app and the backend use the repository code in this superrepo, not a separate unpublished binary-only path.
- The configured endpoint in the screenshot reflects the active settings used by the reload flow.
- Vendor-family classification based on model name is not required for the `OLLAMA` provider card in the API key management screen.

## Open Questions / Risks

- A narrow fix in `OllamaModelProvider` may affect any downstream feature that intentionally relied on vendor-family `provider` values for Ollama-hosted models.
- The repo already contains older root-level investigation notes for a similar symptom; they are superseded by the ticket-local live repro evidence.
- Validation may require both shared-runtime tests and a server-facing grouped-provider assertion.

## Requirement-To-Use-Case Coverage

| Requirement ID | Use Case(s) | Planned Validation Intent |
| --- | --- | --- |
| `R-001` | `UC-001` | Shared-runtime discovery/reload keeps Ollama models in the `OLLAMA` bucket |
| `R-002` | `UC-001`, `UC-002` | Provider reload plus grouped-provider response returns non-empty `OLLAMA` results |
| `R-003` | `UC-003` | LM Studio regression checks remain green |
| `R-004` | `UC-001`, `UC-002` | Automated regression test proves reload count and grouped-provider visibility stay aligned |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Unit or integration test for Ollama discovery using a vendor-keyword model name |
| `AC-002` | Reload-path test proving `OLLAMA` provider bucket is populated after reload |
| `AC-003` | Regression test or unaffected existing coverage for `LMSTUDIO` reload behavior |
| `AC-004` | Test that would fail on the current bug where reload count is positive but grouped provider visibility is zero |

## Confirmed Scope Classification

- Classification: `Small`
- Reasoning: The fix is localized to provider grouping semantics for Ollama-discovered models plus targeted regression coverage. The current architecture and UI flow do not need restructuring.
