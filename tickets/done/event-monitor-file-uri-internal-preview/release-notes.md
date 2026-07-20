# AutoByteus 1.4.21

## Event Monitor file URI previews

- Support scoped Event Monitor Markdown `file:` URI candidates for supported
  text, image, audio, video, PDF, CSV, and spreadsheet previews.
- Reject authorities, query/fragment decorations, malformed or incomplete path
  components, relative/empty paths, and unsupported file types without generic
  browser navigation or unintended workspace/filesystem access.
- Keep raw URI provenance transient and route Electron binary previews through
  the canonical trusted `local-file://local/...` protocol.
- Preserve browser, remote, and paired-mobile workspace mapping behavior,
  including localized unavailable results for valid host-only paths.

## Verification and delivery notes

- API/E2E Round 2 passed at 95% final confidence; no durable API/E2E test files
  changed, so proportional test-code review was Not Applicable/accepted.
- Final runtime acceptance was explicitly user-attested. The repository record
  retains that no reproducible scenario/device/package log was supplied and
  that packaged Electron, Windows, paired-mobile, and authenticated Event
  Monitor browser execution were not independently logged.
