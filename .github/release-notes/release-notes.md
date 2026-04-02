## What's New
- Preview now opens popup and new-window requests as additional in-app Preview tabs instead of blocking them outright.

## Improvements
- Popup-created Preview tabs stay attached to the same shell and continue to use the existing Preview session model.
- Preview popup handling now adopts Electron-provided guest webContents correctly, keeping the popup flow closer to normal browser behavior.

## Fixes
- Fixed a main-process crash when Google-login popups were opened from sites such as X and LinkedIn inside Preview.
- Fixed the packaged popup flow so the Google Accounts tab can open without the previous `Invalid webContents` error.
