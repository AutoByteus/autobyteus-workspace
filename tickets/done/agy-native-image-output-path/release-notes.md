# AGY native image output path

## Improvements
- **Antigravity CLI image generation shows where the image was saved.** When an Antigravity CLI agent generates an image with its built-in `generate_image` tool, the tool card shows Antigravity's result text and the full path of the saved image.
- **Generated images appear in the Artifacts tab.** The image is listed once in Artifacts and can be previewed there, including after you reopen the run.
- **Image generation parameters are visible.** The `generate_image` tool card now shows the parameters, including the prompt.

## Known limitations
- The saved-image location is read from files Antigravity keeps on your machine. This was checked with Antigravity CLI 1.2.12. If a different version stores them differently, the tool still shows as successful but without a path or Artifacts entry. Images from conversations created before this layout existed also show no path.
