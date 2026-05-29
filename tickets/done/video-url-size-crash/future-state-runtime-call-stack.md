# Future-State Runtime Call Stack

Status: Complete

## Send Message With Large Media

1. `AutobyteusClient.sendMessage`
2. `AutobyteusClient.normalizeConversationPayload(payload, signal)`
3. `AutobyteusClient.normalizeMediaSources(message.video_urls, "video", signal)`
4. `AutobyteusClient.normalizeMediaSource(source, "video", signal)`
5. `AutobyteusClient.getMediaSourceSizeBytes`
6. `AutobyteusClient.stageMediaSource`
7. `fs.createReadStream` for local files, `axios.get(... responseType: "stream")` for remote URLs, or `Readable.from` for string payloads
8. `POST /media/stage`
9. payload includes returned `media://videos/...`
10. final `POST /send-message`

## Stream Message

Same normalization path as send message, then final `POST /stream-message` with `responseType: "stream"`.

## Generate Image

1. `AutobyteusClient.generateImage`
2. `normalizeMediaSources(inputImageUrls, "image", null)`
3. `normalizeSingleMediaSource(maskUrl, "image", null)`
4. final `POST /generate-image`

## Error Branches

- `media://...` is returned unchanged.
- Empty media strings are skipped.
- Local stat failures fall back to existing inline normalization, preserving legacy error behavior.
- Remote URLs with unknown size stage for safety instead of using the old arraybuffer/base64 path.
- Staging endpoint failures surface through existing Axios error handling.
