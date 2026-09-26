# Inline Image Probes (G, H, I) — 2026-09-25

SDK 0.3.280 streaming input, PATH CLI 2.1.281, real API, model `haiku`, `tools: []` (the model cannot use Read, so it must see the image inline). Images are sent as content blocks of an `SDKUserMessage`:

```js
{ type: "user", parent_tool_use_id: null, message: { role: "user", content: [
  { type: "text", text: "..." },
  { type: "image", source: { type: "base64", media_type: "image/png", data: "<base64>" } },
  // or: { type: "image", source: { type: "url", url: "https://..." } }
] } }
```

| Probe | Input | Result |
| --- | --- | --- |
| G (`img.mjs`) | 64x64 red PNG, base64 | "Red" |
| H1 (`imgH.mjs`) | Real AutoByteus context-file screenshot (`ctx_3ddeaff1ccca__image.png`, 3024x1896, 575 KB), base64 | "Autobyteus app UI. Activity tab is highlighted on right." |
| H2 | `source: {type: "url"}` (https PNG) | "Blue" (correct) |
| H3 | 6.0 MB random-noise PNG (above the API's 5 MB base64 limit) | Accepted; described correctly. The CLI downsizes/re-encodes images itself |
| H4 | Plain message after H3 | Session alive |
| H5 | New process with `resume`, asked about the H1 screenshot, no tools | "Activity": the image persists in the session transcript across resume |
| I1 (`imgI.mjs`) | JPEG bytes labelled `image/png` | "Red": the CLI detects the real format |
| I2 | TIFF, `image/tiff` | "Red": converted by the CLI |
| I3 | Non-image bytes labelled `image/png` | Normal assistant reply "I'm unable to process that image file…", result `success`, no crash |
| I4 | Plain message after I3 | Session alive |

Conclusion: inline images are simple with streaming input. We build one content block per image context file (base64 from local path / `file://` / data URL; `url` source for http(s)), and the CLI handles resizing, format detection and bad files gracefully.
