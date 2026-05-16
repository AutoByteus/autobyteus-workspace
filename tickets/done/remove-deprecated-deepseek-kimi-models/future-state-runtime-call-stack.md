# Future-State Runtime Call Stack: Removed DeepSeek Chat/Reasoner and Kimi 2.5

Status: Complete

## UC-001: Consumer lists DeepSeek models through `LLMFactory`

```text
[ENTRY] LLMFactory.listModelsByProvider(LLMProvider.DEEPSEEK)
  -> ensureInitialized()
    -> initializeRegistry()
      -> buildSupportedModels()
        -> supportedModelDefinitions iteration
          -> retained DeepSeek definitions only:
             - deepseek-v4-flash
             - deepseek-v4-pro
          -> ModelMetadataResolver.resolve(...) for retained definitions
          -> no lookup or registration exists for deepseek-chat/deepseek-reasoner
      -> registerModel(LLMModel) for retained definitions
  -> filter modelsByIdentifier by provider === DEEPSEEK
[EXIT] ModelInfo[] contains retained V4 models and omits removed identifiers
```

## UC-002: Consumer lists Kimi models through `LLMFactory`

```text
[ENTRY] LLMFactory.listModelsByProvider(LLMProvider.KIMI)
  -> ensureInitialized()
    -> initializeRegistry()
      -> buildSupportedModels()
        -> supportedModelDefinitions iteration
          -> retained Kimi definitions only:
             - kimi-k2.6
             - kimi-k2-thinking
          -> ModelMetadataResolver.resolve(...) for retained definitions
          -> live metadata may include kimi-k2.5 but no supported definition asks for it
      -> registerModel(LLMModel) for retained definitions
[EXIT] ModelInfo[] contains retained Kimi models and omits kimi-k2.5
```

## UC-003: Consumer constructs provider LLM class without a model argument

```text
[ENTRY] new DeepSeekLLM()
  -> constructor receives model undefined
  -> creates default LLMModel(deepseek-v4-flash)
  -> OpenAICompatibleLLM uses model.value deepseek-v4-flash in requests
[EXIT] no implicit deepseek-chat path

[ENTRY] new KimiLLM()
  -> constructor receives model undefined
  -> creates default LLMModel(kimi-k2.6)
  -> normalizeKimiKwargs applies retained k2.6 temperature/thinking safeguards
[EXIT] no implicit kimi-k2.5 path
```

## UC-004: Maintainer reads docs for current supported model catalog

```text
[ENTRY] docs/provider_model_catalogs.md and LLM design docs
  -> list retained DeepSeek/Kimi identifiers
  -> describe Kimi normalization for kimi-k2.6 only
  -> avoid examples using removed identifiers
[EXIT] durable docs align with source catalog
```

## Boundary and Error Behavior

- `LLMFactory.createLLM('deepseek-chat')`, `createLLM('deepseek-reasoner')`, and `createLLM('kimi-k2.5')` now follow the existing not-found path: `Model with identifier '<id>' not found.`
- No compatibility alias remaps removed identifiers to retained models.
- `DeepSeekChatRenderer` remains provider-transport behavior, not a model catalog entry.
