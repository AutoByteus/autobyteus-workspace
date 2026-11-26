# Spine probes (autobyteus-516, 2026-11-24)

Small checks of spine steps that the earlier probes did not cover, against this
repository's real code and dependency versions. Not production code.

- `route-access.mjs` (SP-1): imports the real `routeAccessFor` from
  `autobyteus-server-ts/src/api/security/node-route-permissions.ts` (Node 22.23.1,
  `--experimental-strip-types`). Result: `POST /rest/extensions/voice-input/actions/transcribe`
  → `owner+phone`; `/graphql` → `owner+phone`; `/rest/remote-access/settings` → `owner`.
  A new extension route is open to phones unless it is added to the owner actions.
- `upload-body.mjs` (SP-2): the server's Fastify 5.12.7 (from the main checkout's
  `node_modules`), a 2,880,044-byte WAV (30 s mono 16-bit at 48 kHz, the recorder's
  format). Result: a plain route answers 415 `FST_ERR_CTP_INVALID_MEDIA_TYPE`; a route
  scope with `addContentTypeParser('audio/wav', { parseAs: 'buffer', bodyLimit })`
  answers 200 with all bytes.

Run:

```sh
node --experimental-strip-types route-access.mjs ../../../../../autobyteus-server-ts/src
node upload-body.mjs /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/node_modules/fastify/fastify.js
```
