# Future-State Runtime Call Stack

## Version

`v2`

## Use Case Coverage

| use_case_id | source_type (`Requirement`/`Design-Risk`) | source_ref | primary | fallback | error |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001 | Yes | N/A | Yes |
| UC-002 | Requirement | R-001,R-002,R-004 | Yes | N/A | Yes |
| UC-003 | Requirement | R-003 | Yes | N/A | N/A |
| UC-004 | Requirement | R-005 | Yes | N/A | N/A |
| UC-005 | Requirement | R-006 | Yes | N/A | Yes |

## UC-001: Codex send with uploaded image URL

`autobyteus-web/components/agentInput/ContextFilePathInputArea.vue:onPaste`  
-> `autobyteus-web/stores/fileUploadStore.ts:uploadFile`  
-> `autobyteus-web/stores/agentRunStore.ts:sendUserInputAndSubscribe` (contextFiles include uploaded URL)  
-> `autobyteus-server-ts/src/api/graphql/converters/user-input-converter.ts:toAgentInputUserMessage`  
-> `autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts:sendTurn`  
-> `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts:sendTurn`  
-> `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:sendTurn`  
-> `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts:toCodexUserInput`  
Decision gate: URI resolves to local server media (`/rest/files/*`) -> emit `{"type":"localImage","path":"<abs media path>"}`  
-> codex app-server `turn/start` receives local image + text.

Error branch:
- If URI contains traversal path -> skip local conversion, preserve safe fallback mapping path.

## UC-002: Mixed remote + local image context

Same stack as UC-001.

Decision gates in mapper:
- `data:image/...` -> `image` URL item.
- external `https://...` -> `image` URL item.
- absolute filesystem path -> `localImage` path item.

## UC-003: Text-only codex turn

Same stack as UC-001 without image context files.

Decision gate:
- no image files -> mapper emits only text item.

## UC-004: Autopilot runtime unaffected

`runtime-command-ingress-service.ts:sendTurn`  
-> `autobyteus-runtime-adapter.ts:sendTurn`  
(No dependency on codex mapper)

## UC-005: Live Codex E2E image-input assertion

`tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`  
-> create real PNG fixture in local media storage path  
-> GraphQL `continueRun` with `runtimeKind=codex_app_server` and `userInput.contextFiles=[{path:<rest-files-url>,type:IMAGE}]`  
-> `user-input-converter.ts` -> `runtime-command-ingress-service.ts` -> `codex-app-server-runtime-adapter.ts` -> `codex-app-server-runtime-service.ts` -> `codex-user-input-mapper.ts`  
Decision gate: rest-files URL resolves to local media path -> emit `localImage` input  
-> Codex app-server executes turn  
-> test reads thread via `codex-thread-history-reader.ts:readThread`  
Decision gate: thread payload contains image-bearing user input entry (`localImage`/`image` content item present for the target turn) -> pass.

Error branch:
- No image-bearing user input in thread payload within timeout -> fail test with payload diagnostics.
