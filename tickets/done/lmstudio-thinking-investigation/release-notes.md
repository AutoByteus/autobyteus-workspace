## Improvements
- LM Studio reasoning-capable models now stream their reasoning into Autobyteus, so the UI can show the model's thinking while the response is being generated.
- LM Studio reasoning support now has durable live integration coverage against a real LM Studio server, reducing the chance of future regressions.

## Fixes
- Fixed the OpenAI-compatible LM Studio adapter dropping streamed `reasoning_content` / `reasoning` fields before they reached the frontend reasoning pipeline.
