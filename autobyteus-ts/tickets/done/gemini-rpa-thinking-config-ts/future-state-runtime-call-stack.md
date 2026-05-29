# Future-State Runtime Call Stack

Status: Current

## Use Case 1: Non-Streaming RPA LLM Message With Thinking Config

1. Caller creates `AutobyteusLLM(model, new LLMConfig({ extraParams }))`.
2. Caller invokes `llm.sendMessages(messages, null, { logicalConversationId })`.
3. `BaseLLM.sendMessages` executes before hooks and calls `AutobyteusLLM._sendMessagesToLLM`.
4. `AutobyteusLLM._sendMessagesToLLM` resolves `logicalConversationId`, renders the transcript payload, and calls:
   - `client.sendMessage({ conversationId, modelName, payload, generationConfig: { ...this.config.extraParams } }, { signal })`
5. `AutobyteusClient.sendMessage` normalizes media URLs to data URIs.
6. `AutobyteusClient.sendMessage` posts `/send-message` with:
   - `conversation_id`
   - `model_name`
   - `messages`
   - `current_message_index`
   - `generation_config`
7. RPA server applies `generation_config` for the selected Gemini UI/App integrator.
8. `AutobyteusLLM` converts the server response to `CompleteResponse`.

## Use Case 2: Streaming RPA LLM Message With Thinking Config

1. Caller creates `AutobyteusLLM(model, new LLMConfig({ extraParams }))`.
2. Caller invokes `llm.streamMessages(messages, null, { logicalConversationId })`.
3. `BaseLLM.streamMessages` executes before hooks and calls `AutobyteusLLM._streamMessagesToLLM`.
4. `AutobyteusLLM._streamMessagesToLLM` resolves `logicalConversationId`, renders the transcript payload, and calls:
   - `client.streamMessage({ conversationId, modelName, payload, generationConfig: { ...this.config.extraParams } }, { signal })`
5. `AutobyteusClient.streamMessage` normalizes media URLs to data URIs.
6. `AutobyteusClient.streamMessage` posts `/stream-message` with:
   - `conversation_id`
   - `model_name`
   - `messages`
   - `current_message_index`
   - `generation_config`
7. RPA server streams chunks using the configured Gemini UI/App thinking mode.
8. `AutobyteusLLM` converts chunks to `ChunkResponse`.

## Use Case 3: RPA Model Discovery With Config Schema

1. `AutobyteusModelProvider.getModels()` reads `AUTOBYTEUS_LLM_SERVER_HOSTS`.
2. For each host, it calls `AutobyteusClient.getAvailableLlmModelsSync()`.
3. Server response includes model metadata with optional `config_schema`.
4. `AutobyteusModelProvider` validates required fields and parses model `config`.
5. `AutobyteusModelProvider` parses `config_schema`:
   - if schema is internal config form with `parameters`, use `ParameterSchema.fromConfig`;
   - if schema is JSON Schema with `properties`, convert properties to `ParameterDefinition`s.
6. `AutobyteusModelProvider` constructs `LLMModel` with `configSchema`.
7. Callers use `LLMModel.toModelInfo().config_schema` to retrieve the JSON Schema, including Gemini thinking options.

## Boundary / Error Branches

- Missing `generationConfig` from direct `AutobyteusClient` callers serializes as `{}`.
- Missing or invalid server `config_schema` does not reject an otherwise valid model; it results in no `configSchema`.
- Missing or invalid required server model fields still follows existing validation and skip behavior.
- Abort signal forwarding remains unchanged for send and stream calls.
