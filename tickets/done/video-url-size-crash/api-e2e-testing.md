# API/E2E Testing

Status: Pass

## Commands

- `pnpm --filter autobyteus-ts exec vitest run tests/unit/clients/autobyteus-client.test.ts --reporter verbose`
  - Initial result: Passed, 15 tests.
- `pnpm --filter autobyteus-ts exec vitest run tests/integration/clients/autobyteus-client-media-staging.test.ts tests/unit/clients/autobyteus-client.test.ts --reporter verbose`
  - Re-entry result after stronger E2E coverage: Passed, 16 tests across 2 files.
- `pnpm --filter autobyteus-ts exec tsc -p tsconfig.build.json --noEmit`
  - Result: Passed.
- `pnpm --filter autobyteus-ts exec tsc --noEmit --target ESNext --module NodeNext --moduleResolution NodeNext --strict --esModuleInterop --skipLibCheck --types node,vitest/globals src/clients/autobyteus-client.ts tests/unit/clients/autobyteus-client.test.ts tests/integration/clients/autobyteus-client-media-staging.test.ts`
  - Result: Passed.
- `pnpm --filter autobyteus-ts exec tsc -p tsconfig.json --noEmit`
  - Result: Failed on pre-existing unrelated test typing errors across other test suites; not used as ticket gate.
- Final live validation after local RPA Docker update:
  - `set -a; source .env.test; set +a; pnpm exec vitest --run tests/integration/llm/api/autobyteus-llm.test.ts --reporter verbose`
    - Result: Passed, 5 tests against `https://localhost:51739`.
    - Covered real Autobyteus basic completion, streaming, and `thinking_level` config using `gemini-3.5-flash-app-rpa:autobyteus@localhost:51739`.
  - Executed a compiled `dist` probe that sent an empty-content `LLMUserMessage` with only `video_urls` containing `/home/ryan-ai/SSD/autobyteus_org_workspace/media-test-assets/synthetic_1h_640x360_180k.mp4`.
    - Input video: 3,600 seconds, 77,175,122 bytes.
    - Runtime: local Docker `llm-server-0` on `autobyteus/llm-server:v1.0.12`.
    - Result: Passed; completed in 84.22 seconds and Gemini described the video content.
    - Server evidence: staged file found in container media storage at 77,175,122 bytes, proving the large video was staged and referenced through `media://...` instead of sent as base64.

## Acceptance Coverage

- Small media still follows existing data URI normalization.
- Above-threshold local video is staged before `/send-message`.
- Empty-content media-only user messages remain valid through payload normalization.
- Integration coverage verifies a real local HTTP server receives raw `/media/stage` bytes before the final `/send-message` JSON.
- Integration coverage verifies the final JSON contains `media://videos/...` and not a data URI for the staged video.
- Existing `media://...` values pass through unchanged.
- Remote media with unknown size is staged instead of falling back to the old arraybuffer/base64 path.
- Abort signals are still forwarded to final send and stream requests; staging receives the same signal.
- Real local RPA validation confirms an empty-content, video-only, 1-hour message works end to end through the Autobyteus LLM client and Gemini App RPA.
