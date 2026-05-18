## What's New
- Added a Browser mobile view mode that agents can enable with `set_device_emulation` and users can toggle from the Browser panel.

## Improvements
- Mobile Browser tabs now render as a centered finite phone viewport instead of stretching across the whole Browser host.
- Smaller Browser hosts fit-scale the visible phone presentation while preserving the selected mobile CSS/device metrics.
- Browser tabs keep mobile or desktop emulation as tab-local state, so switching tabs, resizing the Browser panel, or using screenshots does not silently reset the active device mode.

## Fixes
- Fixed the Electron shell path so it no longer overwrites Browser-managed mobile presentation bounds after device emulation is applied.
- Screenshots, full-page screenshots, page reads, DOM snapshots, JavaScript execution, and navigation now operate against the tab's current device-emulation state.
