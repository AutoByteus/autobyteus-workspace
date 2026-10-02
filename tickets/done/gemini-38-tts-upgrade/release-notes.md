## What's New
- Gemini speech generation now offers `gemini-3.8-flash-tts` and a separate `gemini-3.8-flash-lite-tts` option. 3.8 Flash is the default when no speech model is selected.

## Improvements
- Gemini speech requests keep the words to be spoken separate from style and speaker directions, and return a validated WAV audio file or a clear error.
- Existing saved selections of the retired built-in Gemini speech models are moved to 3.8 Flash at startup without changing unrelated settings.

## Fixes
- Removed the retired 3.1 Flash preview, 2.5 Flash and 2.5 Pro Gemini speech choices. Other speech providers remain available.

## Upgrade notes
- If `DEFAULT_SPEECH_GENERATION_MODEL` is supplied by an external process environment with a retired Gemini speech ID, update that external setting to a current model before starting the server. The automatic transition applies to saved server-data `.env` selections, not inherited environment values.
- Gemini model availability still depends on the selected mode, account, region and quota. A successful earlier Vertex Express validation does not guarantee access on every setup.
