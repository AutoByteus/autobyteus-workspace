# Release Notes

- Add Gemini 3.5 Flash (`gemini-3.5-flash`) as a selectable Gemini LLM model.
- Surface `gemini-3.5-flash` through the existing Autobyteus model catalog path, including server model catalog queries.
- Add curated Gemini 3.5 Flash token metadata: 1,048,576 input/context tokens and 65,536 output tokens.
- Preserve the exact `gemini-3.5-flash` provider ID for both Gemini API-key and Vertex runtime modes, with the existing Gemini thinking settings.
