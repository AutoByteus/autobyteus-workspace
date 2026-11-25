# IMP-008: the empty media reference after SR-003 (AC-002 restated; CRR-001 F-1, F-2)

- Commits: `9e33adbf10` (D-2: the probe's 416 alone decides), `9278fca6ff` (MSP-115 to the restated AC-002).
- Environment: macOS arm64, `env -i`.
- Date: 2026-11-25.
- Result: **Pass** on the desktop (dev, cross-origin), the desktop (packaged, `file://`) and the phone's page path.

## Spec, red then green

`npx vitest run components/workspace/collaboration/__tests__/CollaborationMessageReferenceViewer.spec.ts`

| Case | On `a28ca13f35` (header check) | On `9e33adbf10` |
|---|---|---|
| A zero-byte video: 416 to the probe, `Content-Range` unreadable (`headers.get` → null) | **fails** (F-1 reproduced) | passes |
| A 416 to a fetch that sent no Range (a text reference) | passes | passes (still an error) |

The old case "a 416 for a file with bytes is still an error" was removed: under SR-003 a 416 to the probe means an empty file. Collaboration specs: 42 passed. Whole web suite: 810 files, 6264 passed, 2 skipped. Typecheck: production 0, tests 86 (= baseline), PASS.

## Desktop (dev, cross-origin) and the phone's page: MSP-115

`pnpm -C autobyteus-web build:mobile-web`, then `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp>/probe-115 --cases=MSP-115`. The probe's own servers and data root; cleanup `rootRemoved: true`. `MSP-115-result.json` has the case's facts, sanitized.

- The node's answers: the probe `bytes=0-0` → 416 `bytes */0` (desktop, phone); the player's own `bytes=0-` → 416 (desktop); the deleted reference → 404.
- Desktop, the empty reference: no "Failed to fetch reference content"; the media viewer shows "This video could not be played." with Retry (`MSP-115-desktop-empty-647.mp4.png`). Before (API-011): "Error! Failed to fetch reference content (416)".
- Phone page: the same (`MSP-115-phone-empty-647.mp4.png`).
- The deleted reference: "Reference file unavailable" on both.
- Probe: **Pass**, 0 unknown browser errors.

MSP-115 changes, in API/E2E's file, for the restated AC-002:
- It asserts the media viewer's "could not be played" with Retry and no fetch error, instead of "a video player and no alert".
- The phone browser's `net::ERR_REQUEST_RANGE_NOT_SATISFIABLE` on the downloaded `blob:` is now a known line. That is the empty file reaching the page's player: Chrome's video element asks the empty blob for a range. API-REV-001's run had it as its one unknown error.
- Its waits end on the viewer's answer.

## Desktop (packaged, `file://`)

- Build: fresh `--no-local` clone at `9278fca6ff`, `pnpm install --frozen-lockfile`, the release job's `build:electron:mac -- --arm64`: exit 0.
- Instance: my own isolated instance from that app (removed afterwards).
- Steps: a workspace `<tmp>/emptyws` with a zero-byte `empty.mp4`, then `steps/s9-empty-probe.js`. That step runs the viewer's probe request from the window (`Range: bytes=0-0`, `no-store`; no credential header on the desktop) against the node, cross-origin, then opens `empty.mp4` from the Files tree.

```
page origin file://   probe: status 416, ok false
Content-Range readable from file://: "bytes */0" (all response headers readable there)
on the wire: bytes=0-0 → 416 bytes */0; the player's bytes=0- → 416 bytes */0
D-2 (status 416): true
the media viewer: "This video could not be played." with Retry; no "Failed to fetch"
```

Unlike the `nuxt dev` desktop, the packaged `file://` window can read the node's headers. So the header check of IR-001 would have passed there; F-1 is specific to the dev desktop's `http://` origin. The status-only rule of SR-003 holds on both.

## The apps

Not run again. In the apps' page (same-origin), `Content-Range` was readable and IR-001's check already matched (IMP-006 testF: no page error; the app's player screen says it could not be played, with Back). SR-003's condition (`streams && status === 416`) matches wherever the old one did, so the apps' outcome is unchanged.
