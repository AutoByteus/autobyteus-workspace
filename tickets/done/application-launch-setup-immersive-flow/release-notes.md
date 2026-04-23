## What's New
- Applications now open through a setup-first route and enter the app in an immersive view with a light top-right control trigger instead of keeping the app inside the old stacked host page.

## Improvements
- The immersive control panel now docks on the right, can expand `Details` and `Configure` inline, and can be resized while keeping the embedded setup controls usable even at narrow width.
- Brief Studio’s homepage now stays business-first in the live bundle route, focusing on the create/list/review workflow instead of homepage-level metadata clutter.
- `Reload application` now acts as the explicit fresh-launch action, while saved setup edits inside the panel stay local until the user chooses to reload.

## Fixes
- Exiting the application or leaving with browser back now invalidates stale launch work so the standard shell is restored cleanly and re-entry uses a fresh launch instance.
- Brief Studio now recovers cleanly if an already-ready runtime must recreate an emptied app database before reuse, so the embedded homepage no longer falls into the earlier `no such table: briefs` failure path.
