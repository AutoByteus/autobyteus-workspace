# Docs Sync: Removed DeepSeek Chat/Reasoner and Kimi 2.5

Status: Updated

## Updated Durable Docs

| File | Update |
| --- | --- |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Removed obsolete DeepSeek Chat/Reasoner forced-tool note, removed Kimi 2.5 normalization references, clarified deprecation removal policy. |
| `autobyteus-ts/docs/llm_module_design.md` | Replaced removed custom-provider example model, updated Kimi normalization to retained `kimi-k2.6`, renamed DeepSeek native-history row to provider path rather than model name. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Same retained-model updates for Node.js architecture docs. |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Updated Kimi provider normalization description to `kimi-k2.6` only. |

## Verification

```bash
rg -n "deepseek-chat|deepseek-reasoner|kimi-k2\.5|k25" autobyteus-ts/docs
# Pass: no matches
```

## Rationale

Docs had current-behavior references that would continue advertising removed built-in model support. Historical ticket artifacts were intentionally left unchanged because they are archived evidence, not current durable documentation.
