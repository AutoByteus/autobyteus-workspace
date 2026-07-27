# Round 13 Actual-Browser Settings Journey

- Surface: Chrome/Playwright against the real Nuxt development server and the built Node server.
- Backend: `http://127.0.0.1:18180`, isolated synthetic application database `autobyteus-server-ts/db/round13-browser.db`.
- Frontend: `http://127.0.0.1:13100/settings`, development proxy bound to the isolated backend.
- Persistent real-provider database: not used or mutated by this browser journey.
- Browser console/page errors after the corrected development-mode launch: none.

## Gemini explicit-option journey

1. Initial state: AI Studio, Vertex Express, and Vertex Project were all `Not Configured`; active mode was `Not selected`.
2. AI Studio `Save and Use Mode`: operation succeeded, the input cleared, status became `Configured`, and active mode became `AI Studio`.
3. Vertex Express `Save Option`: operation succeeded and the input cleared while active mode remained `AI Studio`.
4. Vertex Project `Save Option`: operation succeeded while active mode remained `AI Studio`.
5. Explicit activation advanced first to `Vertex Project`, then to `Vertex Express`; all three independent option configurations remained `Configured`.
6. The built backend was stopped and reopened on the same application database. After browser refresh, all three configurations remained `Configured` and active mode remained `Vertex Express`.
7. Removing inactive AI Studio left Vertex Express active and left Vertex Project configured.
8. Removing active Vertex Express required confirmation, cleared active mode to `Not selected`, and left Vertex Project configured.
9. Removing Vertex Project returned all three options to `Not Configured` and active mode to `Not selected`.

Screenshots:
- `146-round13-browser-gemini-configured.png`
- `148-round13-browser-gemini-removed.png`

## Standard provider journey

1. OpenAI initially displayed `Not Configured`.
2. Save succeeded; the password input cleared and `Remove Key` became available.
3. Replacement save succeeded; the password input cleared and configured state remained.
4. Remove succeeded; `Remove Key` disappeared and OpenAI displayed `Not Configured`.

No entered value was copied to this evidence, exposed in the page after an operation, or present in the screenshots.
