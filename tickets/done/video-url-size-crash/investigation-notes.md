# Investigation Notes

Status: Complete
Scope triage: Medium, cross-repo.

## Evidence

- `autobyteus-web` can attach context files as locators. In embedded/Electron mode, native file paths can bypass the Fastify multipart cap.
- `autobyteus-ts/src/agent/message/multimodal-message-builder.ts` maps context files into `LLMUserMessage.image_urls`, `audio_urls`, and `video_urls`.
- `AutobyteusClient.normalizeConversationPayload` currently calls `normalizeMediaSources` for the current message only.
- `normalizeMediaSources` currently calls `mediaSourceToDataUri` for every media item, regardless of type or size.
- `mediaSourceToDataUri` reads local files with `fs.readFile`, downloads URLs as `arraybuffer`, and base64-serializes the result. Large video can therefore inflate memory before the RPA request is sent.
- RPA server media materialization can consume local paths after staged media support is added there.

## Conclusion

The immediate crash risk is local serialization in the workspace client. The workspace client should keep small-media inlining but stage large media through the RPA server and pass `media://...` references.

## Risks

- Size detection must not itself load large sources.
- Staging must stream local files and remote URLs.
- Existing tests that mock media conversion should continue to prove small-media behavior.
