# Provider-native tool history rendering

- Native tool-call mode now replays prior tool calls and tool results through each provider's native history format for Gemini, Ollama, Anthropic, Mistral, and OpenAI Responses.
- Tool-result continuations no longer duplicate completed tool results as legacy aggregate user text in native provider requests.
- Parallel tool results are replayed in the original assistant tool-call order, while XML/JSON/sentinel parser modes keep their legacy text-history behavior isolated.
- Added durable request-payload and local integration validation for provider-native continuations.
